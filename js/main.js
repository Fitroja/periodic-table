/**
 * main.js — نقطه ورود برنامه
 * ترتیب کار: بررسی وابستگی‌های CDN → ساخت صحنه → ساخت UI → حلقه رندر
 * افزون بر آن: تنظیم خودکار کیفیت بر پایه نرخ فریم و ثبت Service Worker.
 */
import { PeriodicScene } from './scene.js';
import { UI } from './ui.js';
import { i18n, LANGUAGES } from './i18n.js';

const loader = document.getElementById('loader');
const loaderStatus = document.getElementById('loader-status');
const fpsBadge = document.getElementById('fps');

function setStatus(text) {
  if (loaderStatus) loaderStatus.textContent = text;
}

function fail(message) {
  setStatus(message);
  if (loader) loader.classList.add('error');
  console.error('[PeriodicTable3D]', message);
}

/** انتظار برای بارگذاری three.min.js و OrbitControls از CDN. */
function waitForDeps(timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const check = () => {
      if (window.THREE && window.THREE.OrbitControls) {
        resolve();
        return;
      }
      if (performance.now() - started > timeoutMs) {
        reject(new Error('کتابخانه Three.js یا OrbitControls از CDN بارگذاری نشد.'));
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

async function boot() {
  const container = document.getElementById('scene-container');
  if (!container) {
    fail('عنصر #scene-container در صفحه یافت نشد.');
    return;
  }

  // بررسی پشتیبانی WebGL پیش از ساخت صحنه
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl');
    if (!gl) {
      fail('مرورگر شما از WebGL پشتیبانی نمی‌کند. لطفاً از نسخه به‌روز Chrome، Edge، Firefox یا Safari استفاده کنید.');
      return;
    }
  } catch (err) {
    fail('دسترسی به WebGL امکان‌پذیر نیست: ' + err.message);
    return;
  }

  setStatus('در حال بارگذاری موتور سه‌بعدی…');
  try {
    await waitForDeps();
  } catch (err) {
    fail(err.message + ' اتصال اینترنت خود را بررسی کنید.');
    return;
  }

  // اطمینان از آماده بودن فونت‌ها، چون بافت کارت‌ها با Canvas ترسیم می‌شود
  setStatus('در حال آماده‌سازی فونت‌ها…');
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
    } catch (_) {
      /* در صورت خطا، با فونت جانشین ادامه می‌دهیم */
    }
  }

  setStatus('در حال ساخت ۱۱۸ کارت عنصر…');
  let scene;
  let ui;
  try {
    scene = new PeriodicScene(container);
    ui = new UI(scene);
  } catch (err) {
    fail('خطا در راه‌اندازی صحنه: ' + err.message);
    console.error(err);
    return;
  }

  // Initialize language switcher
  initLanguageSwitcher(ui);

  // ---------------------- حلقه رندر ----------------------
  let last = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let running = true;

  // اگر چند ثانیه پیاپی نرخ فریم پایین بماند، کیفیت یک پله کم می‌شود
  let slowSamples = 0;
  let qualityLocked = false;

  function frame(now) {
    if (!running) return;
    // حداکثر گام زمانی ۵۰ms تا بازگشت از تب غیرفعال باعث پرش انیمیشن نشود
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    try {
      scene.update(dt);
    } catch (err) {
      running = false;
      fail('خطا در حلقه رندر: ' + err.message);
      console.error(err);
      return;
    }

    fpsAccum += dt;
    fpsFrames += 1;
    if (fpsAccum >= 0.5) {
      const fps = Math.round(fpsFrames / fpsAccum);
      if (fpsBadge) fpsBadge.textContent = `${fps} FPS`;
      fpsAccum = 0;
      fpsFrames = 0;

      if (!qualityLocked) {
        slowSamples = fps < 32 ? slowSamples + 1 : 0;
        if (slowSamples >= 6) {
          qualityLocked = true;
          scene.setQuality('low');
          ui.toast('برای روان ماندن صحنه، جلوه‌های سنگین کم شد');
        }
      }
    }

    requestAnimationFrame(frame);
  }

  // رندر یک فریم پیش از محو شدن لودر تا صحنه خالی دیده نشود
  scene.update(0);
  requestAnimationFrame(frame);

  setStatus('آماده است');
  setTimeout(() => loader && loader.classList.add('done'), 260);

  // بازنشانی زمان پس از تغییر وضعیت تب تا پرش انیمیشن رخ ندهد
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
  });

  // برای دیباگ در کنسول مرورگر
  window.PeriodicTable3D = { scene, ui };
}

/** ثبت Service Worker تا برنامه پس از نخستین بازدید آفلاین هم کار کند. */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* نبود Service Worker مانع کار برنامه نیست */
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
registerServiceWorker();

/* =====================================================================
   Language Switcher Initialization
   ===================================================================== */
function initLanguageSwitcher(ui) {
  const langBtn = document.getElementById('lang-btn');
  const langMenu = document.getElementById('lang-menu');
  const currentLangName = document.getElementById('current-lang-name');
  const langOptions = document.querySelectorAll('.lang-option');

  if (!langBtn || !langMenu) return;

  // Update current language display
  function updateLangDisplay() {
    const langData = i18n.langData;
    if (currentLangName) {
      currentLangName.textContent = langData.name;
    }

    // Update active state
    langOptions.forEach(opt => {
      const isActive = opt.dataset.lang === i18n.lang;
      opt.classList.toggle('active', isActive);
    });
  }

  // Toggle menu
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = langBtn.getAttribute('aria-expanded') === 'true';
    langBtn.setAttribute('aria-expanded', !isExpanded);
    langMenu.setAttribute('aria-hidden', isExpanded);
  });

  // Close menu when clicking outside
  document.addEventListener('click', () => {
    langBtn.setAttribute('aria-expanded', 'false');
    langMenu.setAttribute('aria-hidden', 'true');
  });

  // Language selection
  langOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = opt.dataset.lang;
      if (lang && lang !== i18n.lang) {
        i18n.setLanguage(lang);
        updateLangDisplay();
        
        // Reload UI with new language
        if (ui && ui.refreshTranslations) {
          ui.refreshTranslations();
        }
      }
      
      // Close menu
      langBtn.setAttribute('aria-expanded', 'false');
      langMenu.setAttribute('aria-hidden', 'true');
    });
  });

  // Initial display
  updateLangDisplay();
}
