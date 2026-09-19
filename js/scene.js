/**
 * scene.js — لایه سه‌بعدی جدول تناوبی
 * موتور: Three.js r128 (به‌صورت گلوبال از CDN) + OrbitControls
 * وابستگی: js/periodic-data.js
 */
import { ELEMENTS, CATEGORY_MAP, GRID, getGridPosition, normalizedValue, heatColor } from './periodic-data.js';
import { buildLayout, layoutRadius, isFlatLayout } from './layouts.js';

/* ------------------------- ابزارهای کمکی ترسیم ------------------------- */

function roundRectPath(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + h - rr);
  g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  g.lineTo(x + rr, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** اندازه فونت را کوچک می‌کند تا متن در عرض مجاز جا شود. */
function fitText(g, text, maxWidth, weight, startSize, family, minSize) {
  let size = startSize;
  g.font = `${weight} ${size}px ${family}`;
  while (g.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    g.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

const FONT_FA = 'Vazirmatn, "Segoe UI", sans-serif';
const FONT_MONO = 'Orbitron, Vazirmatn, sans-serif';
const EASE_IN_OUT = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const TAU = Math.PI * 2;

/** میان‌یابی زاویه از کوتاه‌ترین مسیر، تا کارت‌ها هنگام مورف دور خودشان نچرخند. */
function lerpAngle(a, b, t) {
  const d = (((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return a + d * t;
}
export class PeriodicScene {
  constructor(container) {
    this.container = container;
    this.isMobile = window.matchMedia('(max-width: 900px)').matches;

    this.cards = [];
    this.hitMeshes = [];
    this.byNumber = new Map();

    this.hoveredEl = null;
    this.selectedEl = null;
    this.visibleSet = null; // null یعنی همه عناصر
    this.highlightSet = null;
    this.compareSet = null; // عناصر انتخاب‌شده برای مقایسه

    this.layoutKey = 'table';
    this.autoFocus = true; // آیا انتخاب عنصر دوربین را هم حرکت دهد؟
    this.heatKey = null; // کلید ویژگی نقشه حرارتی، یا null برای رنگ دسته‌بندی
    this.reliefKey = 'mass';
    this.layoutSpan = Math.max(GRID.width, GRID.height) / 2;
    this.quality = 'high';
    this._captureCb = null;
    this._normal = new THREE.Vector3();
    this._euler = new THREE.Euler();
    this._tmpColor = new THREE.Color();
    this._heatCache = new THREE.Color();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.pointer = new THREE.Vector2(-10, -10);
    this.pointerClient = { x: 0, y: 0 };
    this.pointerInside = false;
    this.raycaster = new THREE.Raycaster();
    this.tween = null;
    this.time = 0;

    // callback ها که لایه UI مقدار می‌دهد
    this.onHover = () => {};
    this.onSelect = () => {};
    this.onBackgroundClick = () => {};
    this.onUserOrbit = () => {};

    this._initRenderer();
    this._initSceneGraph();
    this._initLights();
    this._initEnvironment();
    this._initParticles();
    this._buildCards();
    this._initComposer(); // پس از ساخت صحنه و دوربین
    this._bindEvents();
    this.resetCamera(0);
    this._refreshTargets();
  }

  /* ============================ راه‌اندازی ============================ */

  _aspect() {
    return this.container.clientWidth / Math.max(1, this.container.clientHeight);
  }
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.75 : 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x050508, 1);
    if ('outputEncoding' in this.renderer && THREE.sRGBEncoding !== undefined) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
    this.isWebGL2 = !!this.renderer.capabilities.isWebGL2;
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy
      ? Math.min(4, this.renderer.capabilities.getMaxAnisotropy())
      : 1;
    this.container.appendChild(this.renderer.domElement);
  }

  /** زنجیره پس‌پردازش: رندر → Bloom (درخشش نئونی) → FXAA (هموارسازی). */
  _initComposer() {
    const hasPost =
      THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.ShaderPass && THREE.FXAAShader;
    if (!hasPost) {
      this.composer = null;
      return;
    }
    try {
      const composer = new THREE.EffectComposer(this.renderer);
      composer.addPass(new THREE.RenderPass(this.scene, this.camera));

      this.bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
        0.58, // strength — درخشش ملایم اما محسوس
        0.55, // radius — پخش هاله
        0.74 // threshold — فقط بخش‌های واقعاً روشن می‌درخشند
      );
      composer.addPass(this.bloomPass);

      this.fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / (this.container.clientWidth * pr),
        1 / (this.container.clientHeight * pr)
      );
      composer.addPass(this.fxaaPass);

      this.composer = composer;
    } catch (_) {
      this.composer = null; // در صورت خطا رندر ساده ادامه می‌یابد
    }
  }

  _initSceneGraph() {
    this.scene = new THREE.Scene();
    // بازه مه به‌قدری باز است که چیدمان‌های بزرگ (کره، بلوک‌ها، نقشه برجسته)
    // که دوربین را دور می‌برند، رنگ‌باخته دیده نشوند.
    this.scene.fog = new THREE.Fog(0x050508, 150, 480);

    this.camera = new THREE.PerspectiveCamera(52, this._aspect(), 0.1, 500);
    this.camera.position.set(0, 2, 44);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.rotateSpeed = 0.5;
    this.controls.panSpeed = 0.7;
    this.controls.zoomSpeed = 0.85;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 260; // چیدمان کره و نقشه برجسته دوربین را دورتر می‌برند
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = Math.PI - 0.28;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('start', () => {
      this.tween = null; // تعامل کاربر، انیمیشن دوربین را لغو می‌کند
      this.onUserOrbit();
    });

    this.tableGroup = new THREE.Group();
    this.scene.add(this.tableGroup);
  }
  _initLights() {
    this.scene.add(new THREE.AmbientLight(0x2b3358, 1.15));

    const hemi = new THREE.HemisphereLight(0x223a5e, 0x05050a, 0.55);
    this.scene.add(hemi);

    // شدت و بردِ نورها عمداً محدود است تا بازتاب آن‌ها روی کف، در
    // چیدمان‌هایی که دوربین دورتر می‌ایستد، به لکه‌های سفید سوخته تبدیل نشود.
    this.movingLights = [
      { light: new THREE.PointLight(0x06b6d4, 1.5, 72, 1.8), radius: 26, speed: 0.32, phase: 0 },
      { light: new THREE.PointLight(0x8b5cf6, 1.4, 72, 1.8), radius: 30, speed: -0.25, phase: 2.1 },
      { light: new THREE.PointLight(0xec4899, 1.1, 66, 1.9), radius: 22, speed: 0.19, phase: 4.2 },
    ];
    this.movingLights.forEach((m) => this.scene.add(m.light));

    const key = new THREE.DirectionalLight(0x9ecbff, 0.5);
    key.position.set(-14, 20, 26);
    this.scene.add(key);
  }

  _initEnvironment() {
    const floorY = -GRID.height / 2 - 7.5;

    // کف نیمه‌بازتابنده که نورهای نئونی روی آن می‌افتند
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x05060d,
        roughness: 0.55,
        metalness: 0.7,
        transparent: true,
        opacity: 0.9,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(200, 60, 0x1c3352, 0x0d1626);
    grid.position.y = floorY + 0.02;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    this.scene.add(grid);

    // «زمین» فقط برای چیدمان‌های صفحه‌ای معنا دارد؛ در کره و مارپیچ استوانه‌ای
    // جدول در فضا شناور است و کف باید محو شود.
    this.groundObjects = [
      { mesh: floor, base: 0.95 },
      { mesh: grid, base: 0.35 },
    ];
    this.groundFade = 1;
    this.groundTarget = 1;

    this._addNebula('#06b6d4', -18, 6, -58, 90, 0.16);
    this._addNebula('#8b5cf6', 22, -4, -70, 110, 0.14);
    this._addNebula('#ec4899', 0, 18, -84, 130, 0.09);

    this._buildHudRings(floorY);
    this._initStars();
  }

  /** دو حلقه HUD چرخان با گرادیان نئونی دور جدول — حس سایبری/آینده‌نگر. */
  _buildHudRings(floorY) {
    const mkRing = (radius, color, y, speed, opacity, arcFrac, tube) => {
      const geo = new THREE.TorusGeometry(radius, tube, 2, 220, Math.PI * 2 * arcFrac);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      ring.userData.speed = speed;
      ring.userData.baseOpacity = opacity;
      this.scene.add(ring);
      this.hudRings = this.hudRings || [];
      this.hudRings.push(ring);
      return ring;
    };

    const R = Math.max(GRID.width, GRID.height) * 0.72;
    mkRing(R, '#06b6d4', floorY + 0.3, 0.055, 0.5, 0.78, 0.045);
    mkRing(R * 1.12, '#8b5cf6', floorY + 0.3, -0.038, 0.32, 0.6, 0.035);
    mkRing(R * 0.88, '#ec4899', floorY + 0.6, 0.07, 0.22, 0.42, 0.03);
  }

  /** ستاره‌های درشت چشمک‌زن در پس‌زمینه دور (جدای ذرات نزدیک). */
  _initStars() {
    const count = this.isMobile ? 140 : 260;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      // کره‌ای با شعاع ۱۲۰ تا ۲۰۰ دورتر از جدول
      const r = 120 + Math.random() * 80;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
      positions[i * 3 + 1] = r * Math.cos(ph) * 0.6;
      positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      phases[i] = Math.random() * Math.PI * 2;
    }
    this.starPhases = phases;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 2.6,
        map: this._radialTexture(64, 0.7),
        color: 0xbfe9ff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        fog: false,
      })
    );
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }
  _addNebula(color, x, y, z, size, opacity) {
    if (!this._nebulaTex) this._nebulaTex = this._radialTexture(256, 0.55);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: this._nebulaTex,
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    mesh.position.set(x, y, z);
    mesh.renderOrder = -10;
    this.scene.add(mesh);
    if (!this.nebulas) this.nebulas = [];
    this.nebulas.push({ mesh, base: opacity, phase: Math.random() * 6.28 });
  }

  /** بافت گرادیان شعاعی نرم (برای هاله کارت‌ها، ذرات و ابرهای نورانی). */
  _radialTexture(size, softness) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(softness * 0.5, 'rgba(255,255,255,0.42)');
    grd.addColorStop(softness, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  /** ذرات شناور پس‌زمینه (۵۰۰ تا ۹۰۰ ذره برای حفظ ۶۰ FPS). */
  _initParticles() {
    const count = this.isMobile ? 500 : 900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.particleSpeed = new Float32Array(count);

    const palette = [
      new THREE.Color('#a5f3fc'),
      new THREE.Color('#c4b5fd'),
      new THREE.Color('#fbcfe8'),
      new THREE.Color('#ffffff'),
    ];
    this.particleBounds = { x: 150, y: 62, z: 110 };

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * this.particleBounds.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * this.particleBounds.y * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.particleBounds.z - 18;
      const c = palette[(Math.random() * palette.length) | 0];
      const shade = 0.55 + Math.random() * 0.45;
      colors[i * 3] = c.r * shade;
      colors[i * 3 + 1] = c.g * shade;
      colors[i * 3 + 2] = c.b * shade;
      this.particleSpeed[i] = 0.35 + Math.random() * 1.15;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: this.isMobile ? 0.42 : 0.34,
        map: this._radialTexture(64, 0.7),
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        fog: false,
      })
    );
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }
  /** بافت کارت شیشه‌ای هر عنصر روی Canvas ترسیم می‌شود. */
  _cardTexture(el, color) {
    const W = 256;
    const H = 320;
    const pad = 8;
    const r = 30;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');

    // بدنه شیشه‌ای با سایه‌روشن مورب غنی‌تر
    roundRectPath(g, pad, pad, W - pad * 2, H - pad * 2, r);
    const body = g.createLinearGradient(0, pad, W, H);
    body.addColorStop(0, 'rgba(255,255,255,0.19)');
    body.addColorStop(0.4, 'rgba(255,255,255,0.06)');
    body.addColorStop(0.75, 'rgba(10,14,26,0.28)');
    body.addColorStop(1, 'rgba(255,255,255,0.03)');
    g.fillStyle = body;
    g.fill();

    // هاله نئونی دسته‌بندی + درخشش داخلی بالا و پایین
    g.save();
    roundRectPath(g, pad, pad, W - pad * 2, H - pad * 2, r);
    g.clip();
    const halo = g.createRadialGradient(W / 2, H + 24, 8, W / 2, H + 24, 240);
    halo.addColorStop(0, hexToRgba(color, 0.66));
    halo.addColorStop(0.55, hexToRgba(color, 0.18));
    halo.addColorStop(1, hexToRgba(color, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, W, H);
    // تپ نورانی بالای کارت هم‌رنگ دسته
    const topGlow = g.createRadialGradient(W / 2, -30, 4, W / 2, -30, 150);
    topGlow.addColorStop(0, hexToRgba(color, 0.4));
    topGlow.addColorStop(1, hexToRgba(color, 0));
    g.fillStyle = topGlow;
    g.fillRect(0, 0, W, H * 0.5);
    const sheen = g.createLinearGradient(0, pad, 0, H * 0.55);
    sheen.addColorStop(0, 'rgba(255,255,255,0.26)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sheen;
    g.fillRect(pad, pad, W - pad * 2, H * 0.45);
    // خط براق ظریف در یک‌سوم بالایی (لبه شیشه)
    const edge = g.createLinearGradient(0, H * 0.3, 0, H * 0.36);
    edge.addColorStop(0, 'rgba(255,255,255,0)');
    edge.addColorStop(0.5, 'rgba(255,255,255,0.09)');
    edge.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = edge;
    g.fillRect(pad, H * 0.3, W - pad * 2, H * 0.06);
    g.restore();

    // حاشیه نئونی بیرونی و خط ظریف داخلی
    roundRectPath(g, pad, pad, W - pad * 2, H - pad * 2, r);
    g.lineWidth = 3;
    g.strokeStyle = hexToRgba(color, 0.9);
    g.stroke();
    roundRectPath(g, pad + 3.5, pad + 3.5, W - pad * 2 - 7, H - pad * 2 - 7, r - 4);
    g.lineWidth = 1.2;
    g.strokeStyle = 'rgba(255,255,255,0.24)';
    g.stroke();
    // عدد اتمی و جرم اتمی
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = `600 25px ${FONT_MONO}`;
    g.fillStyle = 'rgba(255,255,255,0.78)';
    g.fillText(String(el.atomicNumber), 26, 46);

    g.textAlign = 'right';
    g.font = `500 17px ${FONT_FA}`;
    g.fillStyle = 'rgba(255,255,255,0.42)';
    g.fillText(el.mass < 100 ? el.mass.toFixed(2) : el.mass.toFixed(1), W - 26, 46);

    // نماد شیمیایی با درخشش نئونی دولایه (هاله پهن + هسته روشن)
    g.textAlign = 'center';
    g.shadowColor = color;
    g.shadowBlur = 44;
    g.fillStyle = hexToRgba(color, 0.55);
    g.font = `800 100px ${FONT_MONO}`;
    g.fillText(el.symbol, W / 2, 152);
    g.shadowBlur = 14;
    g.fillStyle = '#ffffff';
    g.fillText(el.symbol, W / 2, 152);
    g.shadowBlur = 0;

    // نام فارسی
    g.fillStyle = 'rgba(255,255,255,0.95)';
    fitText(g, el.nameFa, W - 46, 700, 27, FONT_FA, 15);
    g.fillText(el.nameFa, W / 2, 230);

    // نام لاتین
    g.fillStyle = hexToRgba(color, 0.95);
    const latin = el.name.toUpperCase();
    fitText(g, latin, W - 52, 500, 18, FONT_FA, 11);
    g.fillText(latin, W / 2, 262);

    // نوار کوچک رنگ دسته
    g.fillStyle = hexToRgba(color, 0.95);
    roundRectPath(g, W / 2 - 26, 288, 52, 4, 2);
    g.fill();

    const tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = this.maxAniso;
    if (this.isWebGL2) {
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
    } else {
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
    }
    tex.needsUpdate = true;
    return tex;
  }
  /** ساخت ۱۱۸ کارت + دو نشانگر ردیف f-block. */
  _buildCards() {
    const cardGeo = new THREE.PlaneGeometry(GRID.cardW, GRID.cardH);
    const glowGeo = new THREE.PlaneGeometry(GRID.cardW * 1.85, GRID.cardH * 1.6);
    const glowTex = this._radialTexture(128, 0.62);

    ELEMENTS.forEach((el, idx) => {
      const cat = CATEGORY_MAP[el.category];
      const color = cat ? cat.color : '#8b5cf6';
      const pos = getGridPosition(el);

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, 0);

      const glow = new THREE.Mesh(
        glowGeo,
        new THREE.MeshBasicMaterial({
          map: glowTex,
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        })
      );
      glow.position.z = -0.05;
      glow.renderOrder = 1;
      group.add(glow);

      const face = new THREE.Mesh(
        cardGeo,
        new THREE.MeshBasicMaterial({
          map: this._cardTexture(el, color),
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      face.renderOrder = 2;
      face.userData.element = el;
      group.add(face);
      const anchor = { x: pos.x, y: pos.y, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 };
      group.userData = {
        element: el,
        color,
        catColor: color,
        face,
        glow,
        // لنگر چیدمان: مقدار جاری (انیمیت‌شونده) و مبدأ/مقصد مورفِ چیدمان
        base: anchor,
        morphFrom: { ...anchor },
        morphTo: { ...anchor },
        morphT: 1,
        morphDur: 1,
        phase: idx * 0.37,
        dimmed: false,
        cz: 0,
        tz: 0,
        cs: 1,
        ts: 1,
        cg: 0.3,
        tg: 0.3,
        co: 1,
        to: 1,
        // نقشه حرارتی: مقدار نرمال‌شده، رنگ مقصد و میزان آمیختگی جاری
        heatMix: 0,
        heatTarget: 0,
        heatColor: new THREE.Color(color),
        heatFace: new THREE.Color(1, 1, 1),
        heatStrength: 1,
        // انیمیشن ورود پله‌ای (موج از کربن به طرفین)
        introDelay: Math.abs(pos.x) * 0.028 + Math.abs(GRID.height / 2 - pos.y) * 0.045 + 0.15,
        introTime: 0,
      };

      this.tableGroup.add(group);
      this.cards.push(group);
      this.hitMeshes.push(face);
      this.byNumber.set(el.atomicNumber, group);
    });

    this._buildFBlockMarkers();
    this._buildSelectionRing();
    this._buildCompareRings();
  }

  /** سه حلقه نشانه‌گذاری برای عناصر انتخاب‌شده در حالت مقایسه. */
  _buildCompareRings() {
    const tex = this._ringTexture();
    const R = GRID.cardW * 2.2;
    this.compareRings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(R, R),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        })
      );
      m.renderOrder = 4;
      m.visible = false;
      this.tableGroup.add(m);
      return m;
    });
  }

  /** حلقه نئونی چرخان دور کارت عنصر انتخاب‌شده. */
  _buildSelectionRing() {
    const R = GRID.cardW * 0.92;
    const tex = this._ringTexture();
    this.selectionRing = new THREE.Mesh(
      new THREE.PlaneGeometry(R * 2.4, R * 2.4),
      new THREE.MeshBasicMaterial({
        map: tex,
        color: new THREE.Color('#ffffff'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    this.selectionRing.renderOrder = 5;
    this.selectionRing.visible = false;
    this.tableGroup.add(this.selectionRing);
  }

  /** بافت حلقه گرادیانی چهارقسمتی برای نمایشگر انتخاب. */
  _ringTexture() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const g = c.getContext('2d');
    const cx = S / 2;
    const cy = S / 2;
    const R = S * 0.38;
    g.lineCap = 'round';
    const arcs = [
      { a0: 0, a1: Math.PI / 2.6, col: '#06b6d4' },
      { a0: Math.PI / 1.7, a1: Math.PI / 1.15, col: '#8b5cf6' },
      { a0: Math.PI / 0.86, a1: Math.PI / 0.62, col: '#ec4899' },
      { a0: Math.PI * 1.15, a1: Math.PI * 1.62, col: '#06b6d4' },
    ];
    arcs.forEach((arc) => {
      g.beginPath();
      g.arc(cx, cy, R, arc.a0, arc.a1);
      g.strokeStyle = arc.col;
      g.lineWidth = 7;
      g.shadowColor = arc.col;
      g.shadowBlur = 14;
      g.stroke();
    });
    // نقاط گوشه
    g.shadowBlur = 8;
    g.fillStyle = '#ffffff';
    ;[
      { a: 0, col: '#06b6d4' },
      { a: Math.PI / 2, col: '#8b5cf6' },
      { a: Math.PI, col: '#ec4899' },
      { a: Math.PI * 1.5, col: '#06b6d4' },
    ].forEach((p) => {
      g.beginPath();
      g.arc(cx + Math.cos(p.a) * R, cy + Math.sin(p.a) * R, 4.5, 0, Math.PI * 2);
      g.fillStyle = p.col;
      g.fill();
    });
    const tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /** پلاک‌های «۵۷–۷۱» و «۸۹–۱۰۳» در گروه ۳ ردیف‌های ۶ و ۷. */
  _buildFBlockMarkers() {
    const specs = [
      { row: 6, label: '57 – 71', sub: 'لانتانیدها', color: CATEGORY_MAP.lanthanide.color },
      { row: 7, label: '89 – 103', sub: 'آکتینیدها', color: CATEGORY_MAP.actinide.color },
    ];

    specs.forEach((spec) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 320;
      const g = c.getContext('2d');
      roundRectPath(g, 8, 8, 240, 304, 30);
      g.fillStyle = 'rgba(255,255,255,0.035)';
      g.fill();
      g.setLineDash([12, 9]);
      g.lineWidth = 2.4;
      g.strokeStyle = hexToRgba(spec.color, 0.65);
      g.stroke();
      g.setLineDash([]);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = hexToRgba(spec.color, 0.92);
      g.font = `700 40px ${FONT_MONO}`;
      g.fillText(spec.label, 128, 140);
      g.fillStyle = 'rgba(255,255,255,0.62)';
      g.font = `500 24px ${FONT_FA}`;
      g.fillText(spec.sub, 128, 194);

      const tex = new THREE.CanvasTexture(c);
      if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = this.maxAniso;
      tex.generateMipmaps = this.isWebGL2;
      tex.minFilter = this.isWebGL2 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(GRID.cardW, GRID.cardH),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false })
      );
      mesh.position.set((3 - GRID.originCol) * GRID.colW, (GRID.originRow - spec.row) * GRID.rowH, 0);
      mesh.renderOrder = 2;
      this.tableGroup.add(mesh);
      this.fMarkers = this.fMarkers || [];
      this.fMarkers.push(mesh);
    });
  }

  /* ======================= چیدمان و نقشه حرارتی ======================= */

  /**
   * تغییر چیدمان با مورفِ نرم و پله‌ای.
   * @param {string} key کلید چیدمان (table, wide, blocks, spiral, helix, sphere, relief)
   * @param {{ propKey?: string, duration?: number, refit?: boolean }} [opts]
   */
  setLayout(key, opts = {}) {
    const propKey = opts.propKey || this.reliefKey;
    this.layoutKey = key;
    this.reliefKey = propKey;

    const states = buildLayout(key, propKey);
    this.layoutSpan = layoutRadius(states);

    const dur = this.reducedMotion ? 0.25 : opts.duration ?? 1.25;
    for (let i = 0; i < this.cards.length; i += 1) {
      const u = this.cards[i].userData;
      const to = states[i];
      u.morphFrom = { ...u.base };
      u.morphTo = to;
      // تأخیر پله‌ای بر پایه فاصله از مرکز، تا مورف مثل یک موج پخش شود
      const delay = this.reducedMotion ? 0 : (Math.hypot(to.x, to.y) / Math.max(1, this.layoutSpan)) * 0.45;
      u.morphT = -delay;
      u.morphDur = dur;
    }

    // پلاک‌های لانتانید/آکتینید فقط در چیدمان کلاسیک معنا دارند
    if (this.fMarkers) {
      this.fMarkers.forEach((m) => {
        m.userData.targetOpacity = key === 'table' ? 0.75 : 0;
      });
    }

    this.groundTarget = isFlatLayout(key) ? 1 : 0;

    if (opts.refit !== false) this.resetCamera(this.reducedMotion ? 0.2 : 1.15);
  }

  /**
   * بازه مه را با فاصله قاب‌بندی دوربین هماهنگ می‌کند تا کارت‌ها در
   * چیدمان‌های بزرگ رنگ‌باخته نشوند و در چیدمان‌های نزدیک عمق حفظ شود.
   */
  _applyFog(dist) {
    if (!this.scene.fog) return;
    this.scene.fog.near = Math.max(48, dist * 0.92);
    this.scene.fog.far = Math.max(200, dist * 2.5);
  }

  /**
   * فعال/غیرفعال کردن رنگ‌آمیزی حرارتی بر پایه یک ویژگی عددی.
   * @param {string|null} propKey کلید ویژگی، یا null برای بازگشت به رنگ دسته‌بندی
   */
  setHeatmap(propKey) {
    this.heatKey = propKey || null;
    for (let i = 0; i < this.cards.length; i += 1) {
      const u = this.cards[i].userData;
      if (!this.heatKey) {
        u.heatTarget = 0;
        continue;
      }
      const t = normalizedValue(u.element, this.heatKey);
      if (t === null) {
        u.heatColor.set('#4b5165'); // داده‌ای در دست نیست
        u.heatStrength = 0.25;
      } else {
        u.heatColor.set(heatColor(t));
        u.heatStrength = 0.45 + t * 0.9;
      }
      // بافت کارت با این رنگ ضرب می‌شود؛ کمی روشن‌ترش می‌کنیم تا متن خوانا بماند
      const c = u.heatColor;
      u.heatFace.setRGB(c.r + (1 - c.r) * 0.42, c.g + (1 - c.g) * 0.42, c.b + (1 - c.b) * 0.42);
      u.heatTarget = 1;
    }
  }

  /** رنگ فعلی کارت یک عنصر (دسته‌بندی یا حرارتی) به صورت «#rrggbb». */
  colorFor(el) {
    const card = this.byNumber.get(el.atomicNumber);
    if (!card) return '#8b5cf6';
    const u = card.userData;
    if (this.heatKey && u.heatMix > 0.5) return `#${u.heatColor.getHexString()}`;
    return u.catColor;
  }

  /** حداکثر سه عنصر برای مقایسه؛ با null یا مجموعه خالی پاک می‌شود. */
  setCompareSet(set) {
    this.compareSet = set && set.size ? set : null;
    this._refreshTargets();
  }

  /* ============================ کیفیت و خروجی ============================ */

  /**
   * سطح کیفیت رندر. در دستگاه‌های کند «low» بلوم را خاموش و
   * چگالی پیکسل را کم می‌کند تا نرخ فریم حفظ شود.
   */
  setQuality(level) {
    if (this.quality === level) return;
    this.quality = level;
    const low = level === 'low';
    if (this.bloomPass) this.bloomPass.enabled = !low;
    if (this.fxaaPass) this.fxaaPass.enabled = !low;
    const cap = low ? 1 : this.isMobile ? 1.75 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    if (this.particles) this.particles.visible = !low;
    this.handleResize();
  }

  /**
   * یک تصویر PNG از فریم بعدی می‌گیرد.
   * @returns {Promise<string>} data URL تصویر
   */
  capture() {
    return new Promise((resolve) => {
      this._captureCb = resolve;
    });
  }

  /* ============================ رویدادها ============================ */

  _bindEvents() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointermove', (e) => {
      this._updatePointer(e);
      this.pointerInside = true;
    });

    dom.addEventListener('pointerleave', () => {
      this.pointerInside = false;
      this.pointer.set(-10, -10);
      this._setHover(null);
    });
    dom.addEventListener('pointerdown', (e) => {
      this._downAt = { x: e.clientX, y: e.clientY };
      this._updatePointer(e);
      this.pointerInside = true;
      this._raycast(); // برای لمس، hover باید بلافاصله محاسبه شود
    });

    dom.addEventListener('pointerup', (e) => {
      if (!this._downAt) return;
      const moved = Math.hypot(e.clientX - this._downAt.x, e.clientY - this._downAt.y);
      this._downAt = null;
      if (moved > 8) return; // درگ بوده، نه کلیک
      if (this.hoveredEl) {
        this.select(this.hoveredEl);
      } else {
        this.onBackgroundClick();
      }
      if (e.pointerType === 'touch') {
        this.pointerInside = false;
        this._setHover(null);
      }
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  _updatePointer(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerClient.x = e.clientX;
    this.pointerClient.y = e.clientY;
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _raycast() {
    if (!this.pointerInside) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    let found = null;
    for (let i = 0; i < hits.length; i += 1) {
      const el = hits[i].object.userData.element;
      const card = this.byNumber.get(el.atomicNumber);
      if (card && !card.userData.dimmed) {
        found = el;
        break;
      }
    }
    this._setHover(found);
  }
  _setHover(el) {
    if (this.hoveredEl === el) return;
    this.hoveredEl = el;
    this.renderer.domElement.style.cursor = el ? 'pointer' : 'grab';
    this._refreshTargets();
    this.onHover(el, this.pointerClient.x, this.pointerClient.y);
  }

  /* ======================= وضعیت کارت‌ها و فیلتر ======================= */

  /**
   * @param {Set<number>|null} visibleSet مجموعه عدد اتمی عناصر قابل‌نمایش
   * @param {Set<number>|null} highlightSet مجموعه عناصر برجسته‌شده (نتیجه جستجو)
   */
  applyFilter(visibleSet, highlightSet) {
    this.visibleSet = visibleSet && visibleSet.size !== ELEMENTS.length ? visibleSet : null;
    this.highlightSet = highlightSet && highlightSet.size ? highlightSet : null;
    if (this.hoveredEl && this.visibleSet && !this.visibleSet.has(this.hoveredEl.atomicNumber)) {
      this._setHover(null);
      return;
    }
    this._refreshTargets();
  }

  _refreshTargets() {
    for (let i = 0; i < this.cards.length; i += 1) {
      const u = this.cards[i].userData;
      const z = u.element.atomicNumber;
      const visible = !this.visibleSet || this.visibleSet.has(z);
      u.dimmed = !visible;

      if (!visible) {
        u.tz = -0.8;
        u.ts = 0.86;
        u.tg = 0.03;
        u.to = 0.1;
        continue;
      }

      let tz = 0;
      let ts = 1;
      let tg = 0.3;
      if (this.highlightSet && this.highlightSet.has(z)) {
        tz = 0.6;
        ts = 1.06;
        tg = 0.62;
      }
      if (this.compareSet && this.compareSet.has(z)) {
        tz = Math.max(tz, 1.1);
        ts = Math.max(ts, 1.12);
        tg = Math.max(tg, 0.9);
      }
      if (this.selectedEl === u.element) {
        tz = 1.5;
        ts = 1.18;
        tg = 1;
      }
      if (this.hoveredEl === u.element) {
        tz = Math.max(tz, 1.15);
        ts = Math.max(ts, 1.13);
        tg = Math.max(tg, 0.85);
      }
      u.tz = tz;
      u.ts = ts;
      u.tg = tg;
      u.to = 1;
    }
  }

  /**
   * انتخاب یک عنصر. در حالت آزمون، autoFocus خاموش می‌شود تا کلیک کاربر
   * دوربین را جابه‌جا نکند و جای عنصر لو نرود.
   */
  select(el) {
    this.selectedEl = el;
    this._refreshTargets();
    if (this.autoFocus !== false) this.focusElement(el);
    this.onSelect(el);
  }

  clearSelection() {
    if (!this.selectedEl) return;
    this.selectedEl = null;
    this._refreshTargets();
  }

  /* ============================ دوربین ============================ */

  /**
   * فاصله لازم دوربین برای جا شدن کامل چیدمان فعلی در قاب.
   * از کادر واقعی چیدمان استفاده می‌شود؛ عمق کادر هم به فاصله افزوده
   * می‌شود تا کارت‌های نزدیک‌تر به دوربین از قاب بیرون نیفتند.
   */
  _fitDistance() {
    const vFov = (this.camera.fov * Math.PI) / 180;
    const b = this._layoutBounds();
    const h = b.maxY - b.minY + GRID.cardH + 3;
    const w = b.maxX - b.minX + GRID.cardW + 3;
    const dH = h / 2 / Math.tan(vFov / 2);
    const dW = w / 2 / Math.tan(vFov / 2) / this._aspect();
    return Math.min(Math.max(dH, dW) + Math.max(0, b.maxZ), 230);
  }

  /** کادر در بر گیرنده لنگرهای چیدمان فعلی. */
  _layoutBounds() {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < this.cards.length; i += 1) {
      const b = this.cards[i].userData.morphTo;
      if (b.x < minX) minX = b.x;
      if (b.x > maxX) maxX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.y > maxY) maxY = b.y;
      if (b.z > maxZ) maxZ = b.z;
    }
    if (!Number.isFinite(minX)) {
      return {
        minX: -GRID.width / 2,
        maxX: GRID.width / 2,
        minY: -GRID.height / 2,
        maxY: GRID.height / 2,
        maxZ: 0,
      };
    }
    return { minX, maxX, minY, maxY, maxZ };
  }

  _startTween(toPos, toTarget, duration) {
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos: toPos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: toTarget.clone(),
      t: 0,
      dur: Math.max(0.0001, duration),
    };
  }
  resetCamera(duration = 0.9) {
    const dist = this._fitDistance();
    this._applyFog(dist);
    let to;
    let target;
    if (this.layoutKey === 'relief') {
      // نمای زاویه‌دار تا ارتفاع ستون‌ها دیده شود
      to = new THREE.Vector3(dist * 0.34, dist * 0.44, dist * 0.7);
      target = new THREE.Vector3(0, -1, 7);
    } else {
      to = new THREE.Vector3(0, 1.5, dist);
      target = new THREE.Vector3(0, 0, 0);
    }
    if (duration <= 0) {
      this.camera.position.copy(to);
      this.controls.target.copy(target);
      this.controls.update();
      this.tween = null;
      return;
    }
    this._startTween(to, target, duration);
  }

  /** نمای سینمایی زاویه‌دار سه‌بعدی؛ با enabled=false بازگشت به نمای روبه‌رو. */
  setViewIso(enabled, duration = 1.15) {
    if (enabled) {
      const d = this._fitDistance();
      const to = new THREE.Vector3(d * 0.42, d * 0.55, d * 0.72);
      this._startTween(to, new THREE.Vector3(0, -0.6, 0), duration);
    } else {
      this.resetCamera(duration);
    }
  }

  /**
   * حرکت نرم دوربین به سمت یک عنصر. دوربین همیشه روبه‌روی صفحه کارت
   * می‌ایستد، حتی وقتی کارت روی کره یا مارپیچ چرخیده باشد.
   */
  focusElement(el, distance = 8.5) {
    const card = this.byNumber.get(el.atomicNumber);
    if (!card) return;
    const b = card.userData.base;
    const target = new THREE.Vector3(b.x, b.y, b.z);
    const n = this._cardNormal(b);
    const to = target.clone().addScaledVector(n, distance).add(new THREE.Vector3(0, 1.1, 0));
    this._startTween(to, target, 0.85);
  }

  /** بردار عمود بر صفحه کارت، بر پایه چرخش لنگر چیدمان. */
  _cardNormal(anchor) {
    this._euler.set(anchor.rx, anchor.ry, anchor.rz);
    return this._normal.set(0, 0, 1).applyEuler(this._euler);
  }

  zoomBy(factor) {
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    const dist = THREE.MathUtils.clamp(dir.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    const to = this.controls.target.clone().add(dir.setLength(dist));
    this._startTween(to, this.controls.target, 0.35);
  }

  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled;
  }

  handleResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = this._aspect();
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setSize(w, h);
      const pr = this.renderer.getPixelRatio();
      if (this.bloomPass) this.bloomPass.setSize(w, h);
      if (this.fxaaPass) {
        this.fxaaPass.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
      }
    }
  }
  /* ============================ حلقه انیمیشن ============================ */

  update(dt) {
    this.time += dt;

    // ۱) انیمیشن دوربین
    if (this.tween) {
      this.tween.t += dt / this.tween.dur;
      const e = EASE_IN_OUT(Math.min(1, this.tween.t));
      this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, e);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, e);
      if (this.tween.t >= 1) this.tween = null;
    }
    this.controls.update();

    // ۲) ذرات شناور + سوسوی ملایم
    const pos = this.particles.geometry.attributes.position;
    const arr = pos.array;
    const limit = this.particleBounds.y;
    for (let i = 0; i < this.particleSpeed.length; i += 1) {
      const yi = i * 3 + 1;
      arr[yi] += this.particleSpeed[i] * dt;
      if (arr[yi] > limit) arr[yi] = -limit;
    }
    pos.needsUpdate = true;
    this.particles.rotation.y += dt * 0.012;
    this.particles.material.opacity = 0.72 + Math.sin(this.time * 1.6) * 0.14;

    // ۲‌ب) چشمک ستاره‌های دوردست
    if (this.stars) {
      this.stars.material.opacity = 0.62 + Math.sin(this.time * 0.9) * 0.24;
      this.stars.rotation.y += dt * 0.004;
    }

    // ۳) نورهای متحرک نئونی
    for (let i = 0; i < this.movingLights.length; i += 1) {
      const m = this.movingLights[i];
      const a = this.time * m.speed + m.phase;
      m.light.position.set(Math.cos(a) * m.radius, Math.sin(a * 0.7) * 9 - 2, 12 + Math.sin(a) * 10);
    }

    // ۴) ابرهای نورانی پس‌زمینه
    if (this.nebulas) {
      for (let i = 0; i < this.nebulas.length; i += 1) {
        const n = this.nebulas[i];
        n.mesh.material.opacity = n.base * (0.75 + 0.25 * Math.sin(this.time * 0.25 + n.phase));
        n.mesh.rotation.z += dt * 0.008;
      }
    }

    // ۴‌ب) محو یا بازگشت «زمین» بسته به چیدمان
    if (this.groundObjects) {
      this.groundFade += (this.groundTarget - this.groundFade) * Math.min(1, dt * 3);
      const visible = this.groundFade > 0.02;
      for (let i = 0; i < this.groundObjects.length; i += 1) {
        const go = this.groundObjects[i];
        go.mesh.material.opacity = go.base * this.groundFade;
        go.mesh.visible = visible;
      }
    }

    // ۴‌ج) چرخش حلقه‌های HUD + پالس ملایم
    if (this.hudRings) {
      const gf = this.groundFade === undefined ? 1 : this.groundFade;
      for (let i = 0; i < this.hudRings.length; i += 1) {
        const ring = this.hudRings[i];
        ring.rotation.z += dt * ring.userData.speed;
        ring.material.opacity =
          ring.userData.baseOpacity * (0.8 + 0.2 * Math.sin(this.time * 0.8 + i * 2.1)) * gf;
        ring.visible = gf > 0.02;
      }
    }

    // ۴‌د) محو شدن پلاک‌های لانتانید/آکتینید در چیدمان‌های غیرکلاسیک
    if (this.fMarkers) {
      for (let i = 0; i < this.fMarkers.length; i += 1) {
        const m = this.fMarkers[i];
        const target = m.userData.targetOpacity === undefined ? 0.75 : m.userData.targetOpacity;
        m.material.opacity += (target - m.material.opacity) * Math.min(1, dt * 5);
        m.visible = m.material.opacity > 0.015;
      }
    }

    // ۵) مورف چیدمان + میان‌یابی وضعیت کارت‌ها + انیمیشن ورود + شناوری ملایم
    const k = Math.min(1, dt * 8);
    const hk = Math.min(1, dt * 3.5);
    for (let i = 0; i < this.cards.length; i += 1) {
      const card = this.cards[i];
      const u = card.userData;
      const b = u.base;

      // مورف نرم میان چیدمان قبلی و چیدمان جدید
      if (u.morphT < 1) {
        u.morphT += dt / u.morphDur;
        const p = EASE_IN_OUT(Math.min(1, Math.max(0, u.morphT)));
        const f = u.morphFrom;
        const to = u.morphTo;
        b.x = f.x + (to.x - f.x) * p;
        b.y = f.y + (to.y - f.y) * p;
        b.z = f.z + (to.z - f.z) * p;
        b.rx = lerpAngle(f.rx, to.rx, p);
        b.ry = lerpAngle(f.ry, to.ry, p);
        b.rz = lerpAngle(f.rz, to.rz, p);
        b.scale = f.scale + (to.scale - f.scale) * p;
      }

      // رنگ نقشه حرارتی به‌آرامی جای رنگ دسته‌بندی را می‌گیرد
      if (Math.abs(u.heatTarget - u.heatMix) > 0.001) {
        u.heatMix += (u.heatTarget - u.heatMix) * hk;
        u.face.material.color.setRGB(1, 1, 1).lerp(u.heatFace, u.heatMix);
        this._tmpColor.set(u.catColor).lerp(u.heatColor, u.heatMix);
        u.glow.material.color.copy(this._tmpColor);
      }
      const heatGain = 1 + (u.heatStrength - 1) * u.heatMix;

      // موج ورود: کارت از عمق و شفافیت کامل به جای خود می‌رسد
      if (u.introTime < 1) {
        u.introTime = Math.min(1, u.introTime + dt / 1.1);
        const it = u.introTime;
        const p = Math.min(1, Math.max(0, (it - u.introDelay / 1.1) / 0.72));
        const e = EASE_IN_OUT(p);
        u.co = e;
        card.position.set(b.x, b.y, b.z + (1 - e) * -26);
        card.scale.setScalar((0.55 + e * 0.45) * b.scale);
        u.face.material.opacity = e;
        u.glow.material.opacity = u.cg * e;
        if (it >= 1) {
          u.introTime = 1;
          u.co = 1;
        }
        continue; // تا پایان ورود، منطق عادی اعمال نمی‌شود
      }

      u.cz += (u.tz - u.cz) * k;
      u.cs += (u.ts - u.cs) * k;
      u.cg += (u.tg - u.cg) * k;
      u.co += (u.to - u.co) * k;

      // بیرون‌آمدن کارت در راستای عمود بر صفحه‌اش، نه همیشه در راستای Z
      const t = this.time + u.phase;
      const n = this._cardNormal(b);
      const pop = u.cz + Math.sin(t * 0.7) * 0.13;
      card.position.set(
        b.x + n.x * pop,
        b.y + n.y * pop + Math.cos(t * 0.55) * 0.05,
        b.z + n.z * pop
      );
      card.rotation.set(b.rx, b.ry + Math.sin(t * 0.32) * 0.028, b.rz);
      card.scale.setScalar(u.cs * b.scale);
      u.face.material.opacity = u.co;
      u.glow.material.opacity = u.cg * heatGain;
    }

    // ۵‌ب) حلقه انتخاب: دنبال‌کردن کارت فعال با چرخش مستمر
    if (this.selectionRing) {
      if (this.selectedEl) {
        const card = this.byNumber.get(this.selectedEl.atomicNumber);
        if (card) {
          const n = this._cardNormal(card.userData.base);
          this.selectionRing.visible = true;
          this.selectionRing.position.copy(card.position).addScaledVector(n, 0.28);
          this.selectionRing.rotation.set(card.rotation.x, card.rotation.y, this.selectionRing.rotation.z + dt * 0.9);
          this.selectionRing.scale.setScalar(card.scale.x);
          this.selectionRing.material.opacity += (0.95 - this.selectionRing.material.opacity) * k;
          this.selectionRing.material.color.set(this.colorFor(this.selectedEl));
        }
      } else {
        this.selectionRing.material.opacity += (0 - this.selectionRing.material.opacity) * k;
        if (this.selectionRing.material.opacity < 0.02) this.selectionRing.visible = false;
      }
    }

    // ۵‌ج) حلقه‌های مقایسه روی حداکثر سه عنصر انتخاب‌شده
    if (this.compareRings) {
      const list = this.compareSet ? Array.from(this.compareSet) : [];
      for (let i = 0; i < this.compareRings.length; i += 1) {
        const ring = this.compareRings[i];
        const card = list[i] !== undefined ? this.byNumber.get(list[i]) : null;
        if (card) {
          const n = this._cardNormal(card.userData.base);
          ring.visible = true;
          ring.position.copy(card.position).addScaledVector(n, 0.2);
          ring.rotation.set(card.rotation.x, card.rotation.y, -this.time * 0.55 + i * 1.1);
          ring.scale.setScalar(card.scale.x * 0.86);
          ring.material.opacity += (0.8 - ring.material.opacity) * k;
          ring.material.color.set(this.colorFor(card.userData.element));
        } else {
          ring.material.opacity += (0 - ring.material.opacity) * k;
          if (ring.material.opacity < 0.02) ring.visible = false;
        }
      }
    }

    // ۶) تشخیص Hover (یک بار در هر فریم)
    if (this.pointerInside && !this.tween) this._raycast();

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // ۷) گرفتن تصویر باید بلافاصله پس از رندر انجام شود، پیش از پاک شدن بافر
    if (this._captureCb) {
      const cb = this._captureCb;
      this._captureCb = null;
      let url = '';
      try {
        url = this.renderer.domElement.toDataURL('image/png');
      } catch (_) {
        url = '';
      }
      cb(url);
    }
  }
}

