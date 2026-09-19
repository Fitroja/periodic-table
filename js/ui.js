/**
 * ui.js — لایه رابط کاربری
 * جستجو، فیلترها، پنل جزئیات، تولتیپ، ریل چیدمان، نقشه داده،
 * مقایسه عناصر، حالت آزمون، تور خودکار و اشتراک‌گذاری لینک.
 */
import {
  ELEMENTS,
  ELEMENT_BY_NUMBER,
  CATEGORIES,
  CATEGORY_MAP,
  PHASE_FA,
  TOTAL_ELEMENTS,
  PROPERTIES,
  PROPERTY_MAP,
  HEAT_GRADIENT_CSS,
  formatTemperature,
  formatDensity,
  shellsFor,
  normalizeFa,
  normalizedValue,
  propertyExtent,
  heatColor,
  toFaDigits,
} from './periodic-data.js';
import { LAYOUTS, LAYOUT_KEYS } from './layouts.js';
import { Sfx } from './audio.js';

const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
const MAX_COMPARE = 3;
const QUIZ_SECONDS = 20;
const TOUR_INTERVAL = 3800;

/** ویژگی‌هایی که در پنل جزئیات نوار «جایگاه میان ۱۱۸ عنصر» می‌گیرند. */
const RANK_KEYS = ['radius', 'electronegativity', 'ionization', 'density', 'melt'];

/** آیکون هر چیدمان در ریل سمت راست. */
const LAYOUT_ICONS = {
  table:
    '<rect x="3" y="4" width="4" height="4" rx="1"/><rect x="17" y="4" width="4" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/>',
  wide:
    '<rect x="2.5" y="6" width="3" height="12" rx="1"/><rect x="7" y="6" width="10" height="12" rx="1"/><rect x="18.5" y="6" width="3" height="12" rx="1"/>',
  blocks:
    '<rect x="3" y="3.5" width="7" height="7" rx="1.6"/><rect x="14" y="3.5" width="7" height="7" rx="1.6"/><rect x="3" y="13.5" width="7" height="7" rx="1.6"/><rect x="14" y="13.5" width="7" height="7" rx="1.6"/>',
  spiral:
    '<path d="M12 12a2.4 2.4 0 1 1 2.4 2.4A5 5 0 0 1 9.4 9.4 7.6 7.6 0 0 1 17 1.8" transform="translate(0 3)"/>',
  helix:
    '<path d="M5 4c0 3 14 3 14 6s-14 3-14 6 14 3 14 4"/><path d="M5 4h14M5 20h14"/>',
  sphere:
    '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="8.5" ry="3.6"/><path d="M12 3.5v17"/>',
  relief:
    '<path d="M3 20V13M8 20V8M13 20v-9M18 20V5"/><path d="M2 20h20"/>',
};

function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** عدد را برای نمایش در رابط فارسی مرتب می‌کند. */
function niceNumber(v) {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 0.001 || abs >= 1e6)) return v.toExponential(1);
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toPrecision(4)));
}

export class UI {
  constructor(scene) {
    this.scene = scene;
    this.sfx = new Sfx();

    this.activeCats = new Set();
    this.query = '';
    this.current = null;
    this.bohrRunning = false;
    this.bohrTime = 0;
    this._focusTimer = null;
    this.sugList = [];
    this.sugIndex = -1;

    this.layoutKey = 'table';
    this.heatKey = null;
    this.compareMode = false;
    this.compareList = [];
    this.tourTimer = null;
    this.tourIndex = 0;
    this.quiz = { active: false, score: 0, streak: 0, target: null, left: 0, timer: null, asked: new Set() };
    this._toastTimer = null;
    this._badgeTimer = null;

    this._cacheDom();
    this._buildChips();
    this._buildLegend();
    this._buildLayoutRail();
    this._buildPropSelect();
    this._bindScene();
    this._bindDom();
    this._bindKeyboard();
    this.apply();
    this._applyInitialState();
  }

  _cacheDom() {
    const $ = (id) => document.getElementById(id);
    this.dom = {
      brandLogo: $('brand-logo'),
      filterToggle: $('filter-toggle'),
      filtersTray: $('filters-tray'),
      filtersReset: $('filters-reset'),
      searchWrap: document.querySelector('.search-wrap'),
      search: $('search-input'),
      searchClear: $('search-clear'),
      suggest: $('suggest'),
      count: $('result-count'),
      filters: $('filters'),

      legend: $('legend'),
      legendList: $('legend-list'),
      legendTabs: document.querySelectorAll('.ltab'),
      paneCat: $('pane-cat'),
      paneData: $('pane-data'),
      propSelect: $('prop-select'),
      heatBar: $('heat-bar'),
      heatMin: $('heat-min'),
      heatMax: $('heat-max'),
      heatNote: $('heat-note'),
      heatTop: $('heat-top'),

      layoutButtons: $('layout-buttons'),
      layoutRail: $('layout-rail'),

      compareTray: $('compare-tray'),
      cmpSlots: $('cmp-slots'),
      cmpOpen: $('cmp-open'),
      cmpClear: $('cmp-clear'),
      cmpModal: $('compare-modal'),
      cmpBody: $('cmp-body'),
      cmpClose: $('cmp-close'),

      quiz: $('quiz'),
      quizScore: $('quiz-score'),
      quizStreak: $('quiz-streak'),
      quizTime: $('quiz-time'),
      quizQuestion: $('quiz-question'),
      quizBarFill: $('quiz-bar-fill'),
      quizFeedback: $('quiz-feedback'),
      quizSkip: $('quiz-skip'),
      quizExit: $('quiz-exit'),

      tooltip: $('tooltip'),
      panel: $('panel'),
      panelClose: $('panel-close'),
      panelPrev: $('panel-prev'),
      panelNext: $('panel-next'),
      panelPrevLabel: $('panel-prev-label'),
      panelNextLabel: $('panel-next-label'),
      panelSymbol: $('panel-symbol'),
      panelNumber: $('panel-number'),
      panelNameFa: $('panel-name-fa'),
      panelNameEn: $('panel-name-en'),
      panelCategory: $('panel-category'),
      panelBlock: $('panel-block'),
      panelRadioactive: $('panel-radioactive'),
      panelFact: $('panel-fact'),
      panelRanks: $('panel-ranks'),
      panelProps: $('panel-props'),
      panelFocus: $('panel-focus'),
      panelCompare: $('panel-compare'),
      panelShare: $('panel-share'),
      panelWiki: $('panel-wiki'),

      thermo: $('thermo'),
      thermoZone: $('thermo-zone'),
      thermoMelt: $('thermo-melt'),
      thermoBoil: $('thermo-boil'),
      thermoRoom: $('thermo-room'),
      bohr: $('bohr'),
      bohrCaption: $('bohr-caption'),

      btnRotate: $('btn-rotate'),
      btnReset: $('btn-reset'),
      btnRandom: $('btn-random'),
      btnView: $('btn-view'),
      btnZoomIn: $('btn-zoom-in'),
      btnZoomOut: $('btn-zoom-out'),
      btnLayout: $('btn-layout'),
      btnTour: $('btn-tour'),
      btnCompare: $('btn-compare'),
      btnQuiz: $('btn-quiz'),
      btnLegend: $('btn-legend'),
      btnSound: $('btn-sound'),
      btnShot: $('btn-shot'),
      btnHelp: $('btn-help'),
      btnFullscreen: $('btn-fullscreen'),

      help: $('help'),
      helpClose: $('help-close'),
      toast: $('toast'),
      modeBadge: $('mode-badge'),
    };
    this.bohrCtx = this.dom.bohr.getContext('2d');
  }

  /* ============================ فیلترها ============================ */

  _buildChips() {
    const frag = document.createDocumentFragment();

    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'chip all active';
    all.dataset.cat = '';
    all.innerHTML = '<span class="dot"></span><span>همه عناصر</span>';
    frag.appendChild(all);

    CATEGORIES.forEach((cat) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.cat = cat.key;
      b.style.setProperty('--chip-color', cat.color);
      b.innerHTML = `<span class="dot"></span><span>${cat.fa}</span>`;
      frag.appendChild(b);
    });

    this.dom.filters.appendChild(frag);
    this.chips = Array.from(this.dom.filters.querySelectorAll('.chip'));

    this.dom.filters.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      this.sfx.click();
      this.toggleCategory(chip.dataset.cat);
    });
  }

  _buildLegend() {
    const counts = {};
    ELEMENTS.forEach((el) => {
      counts[el.category] = (counts[el.category] || 0) + 1;
    });

    this.dom.legendList.innerHTML = CATEGORIES.map(
      (c) => `<li data-cat="${c.key}">
          <span class="swatch" style="background:${c.color};color:${c.color}"></span>
          <span>${c.fa}</span>
          <span class="lg-count">${toFaDigits(counts[c.key] || 0)}</span>
        </li>`
    ).join('');

    this.dom.legendList.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li) this.toggleCategory(li.dataset.cat);
    });

    this.dom.legendTabs.forEach((tab) => {
      tab.addEventListener('click', () => this._switchLegendTab(tab.dataset.tab));
    });
  }

  _switchLegendTab(tab) {
    this.dom.legendTabs.forEach((t) => {
      const on = t.dataset.tab === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    this.dom.paneCat.classList.toggle('is-hidden', tab !== 'cat');
    this.dom.paneData.classList.toggle('is-hidden', tab !== 'data');
  }

  toggleCategory(key) {
    if (!key) {
      this.activeCats.clear();
    } else if (this.activeCats.has(key)) {
      this.activeCats.delete(key);
    } else {
      this.activeCats.add(key);
    }
    this._syncChips();
    this.apply();
  }

  _syncChips() {
    this.chips.forEach((chip) => {
      const key = chip.dataset.cat;
      const on = key ? this.activeCats.has(key) : this.activeCats.size === 0;
      chip.classList.toggle('active', on);
    });
  }

  /* ======================== ریل چیدمان ======================== */

  _buildLayoutRail() {
    this.dom.layoutButtons.innerHTML = LAYOUTS.map(
      (l) => `<button type="button" class="rail-btn" data-layout="${l.key}" title="${l.fa} — ${l.hint}" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true">${LAYOUT_ICONS[l.key] || ''}</svg>
          <span>${l.fa}</span>
        </button>`
    ).join('');

    this.dom.layoutButtons.addEventListener('click', (e) => {
      const btn = e.target.closest('.rail-btn');
      if (!btn) return;
      this.setLayout(btn.dataset.layout);
    });
  }

  /**
   * تغییر چیدمان سه‌بعدی جدول.
   * @param {string} key یکی از کلیدهای LAYOUTS
   */
  setLayout(key, opts = {}) {
    if (!LAYOUT_KEYS.includes(key)) return;
    this.layoutKey = key;

    // چیدمان «نقشه برجسته» بدون ویژگی معنا ندارد؛ اگر نقشه‌ای فعال نیست
    // پیش‌فرض جرم اتمی را می‌گذاریم تا برجستگی دیده شود.
    if (key === 'relief' && !this.heatKey) this.setHeat('mass', { silent: true });

    this.scene.setLayout(key, { propKey: this.heatKey || 'mass' });
    if (!opts.silent) this.sfx.morph();

    this.dom.layoutButtons.querySelectorAll('.rail-btn').forEach((b) => {
      const on = b.dataset.layout === key;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (this.dom.btnView) this.dom.btnView.setAttribute('aria-pressed', 'false');

    const meta = LAYOUTS.find((l) => l.key === key);
    if (meta && !opts.silent) this._showBadge(meta.fa, meta.hint);
    this._syncUrl();
  }

  nextLayout() {
    const i = LAYOUT_KEYS.indexOf(this.layoutKey);
    this.setLayout(LAYOUT_KEYS[(i + 1) % LAYOUT_KEYS.length]);
  }

  /* ======================== نقشه داده (حرارتی) ======================== */

  _buildPropSelect() {
    const sel = this.dom.propSelect;
    PROPERTIES.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.key;
      opt.textContent = p.unit ? `${p.fa} (${p.unit})` : p.fa;
      sel.appendChild(opt);
    });
    this.dom.heatBar.style.background = HEAT_GRADIENT_CSS;

    sel.addEventListener('change', () => this.setHeat(sel.value || null));
  }

  /**
   * رنگ‌آمیزی کارت‌ها بر پایه یک ویژگی عددی.
   * @param {string|null} key کلید ویژگی، یا null برای رنگ دسته‌بندی
   */
  setHeat(key, opts = {}) {
    const prop = key ? PROPERTY_MAP[key] : null;
    this.heatKey = prop ? key : null;
    this.scene.setHeatmap(this.heatKey);

    if (this.dom.propSelect.value !== (this.heatKey || '')) {
      this.dom.propSelect.value = this.heatKey || '';
    }

    // در چیدمان برجسته، ارتفاع کارت‌ها هم باید با ویژگی تازه به‌روز شود
    if (this.layoutKey === 'relief') {
      this.scene.setLayout('relief', { propKey: this.heatKey || 'mass', refit: false });
    }

    this._renderHeatPanel(prop);
    if (!opts.silent) {
      this._switchLegendTab('data');
      this._showBadge(prop ? `نقشه داده: ${prop.fa}` : 'رنگ دسته‌بندی', prop ? prop.unit : '');
    }
    this._syncUrl();
  }

  _renderHeatPanel(prop) {
    const d = this.dom;
    if (!prop) {
      d.heatBar.classList.add('is-off');
      d.heatMin.textContent = '—';
      d.heatMax.textContent = '—';
      d.heatNote.textContent = 'یک ویژگی را انتخاب کنید تا هر ۱۱۸ کارت بر پایه مقدار آن رنگ بگیرند.';
      d.heatTop.innerHTML = '';
      return;
    }

    d.heatBar.classList.remove('is-off');
    const { min, max } = propertyExtent(prop.key);
    d.heatMin.textContent = niceNumber(min);
    d.heatMax.textContent = niceNumber(max);

    const withData = ELEMENTS.filter((el) => prop.get(el) !== null && prop.get(el) !== undefined);
    const missing = TOTAL_ELEMENTS - withData.length;
    d.heatNote.textContent = missing
      ? `${toFaDigits(missing)} عنصر داده معتبری برای این ویژگی ندارند و خاکستری می‌مانند.`
      : `همه ${toFaDigits(TOTAL_ELEMENTS)} عنصر داده دارند.`;

    const sorted = withData.slice().sort((a, b) => prop.get(b) - prop.get(a));
    const rows = [
      { label: 'بیشترین', items: sorted.slice(0, 3) },
      { label: 'کمترین', items: sorted.slice(-3).reverse() },
    ];
    d.heatTop.innerHTML = rows
      .map(
        (r) => `<li><span class="ht-label">${r.label}</span><span class="ht-items">${r.items
          .map((el) => {
            const c = heatColor(normalizedValue(el, prop.key) ?? 0.5);
            return `<button type="button" class="ht-chip" data-z="${el.atomicNumber}" style="--c:${c}" title="${el.nameFa} · ${prop.format(prop.get(el))}">${el.symbol}</button>`;
          })
          .join('')}</span></li>`
      )
      .join('');

    d.heatTop.onclick = (e) => {
      const chip = e.target.closest('.ht-chip');
      if (!chip) return;
      const el = ELEMENT_BY_NUMBER.get(Number(chip.dataset.z));
      if (el) this._selectElement(el);
    };
  }

  /* ============================ جستجو ============================ */

  _matches(el, raw) {
    if (!raw) return true;
    const q = normalizeFa(raw);
    if (!q) return true;
    if (String(el.atomicNumber) === q) return true;
    if (el.symbol.toLowerCase() === q) return true;
    if (el.symbol.toLowerCase().startsWith(q)) return true;
    if (el.name.toLowerCase().includes(q)) return true;
    if (normalizeFa(el.nameFa).includes(q)) return true;
    return false;
  }

  /** محاسبه مجموعه‌های visible/highlight و اعمال آن روی صحنه. */
  apply() {
    const visible = new Set();
    const highlight = new Set();
    const hasQuery = this.query.trim().length > 0;

    ELEMENTS.forEach((el) => {
      const catOk = this.activeCats.size === 0 || this.activeCats.has(el.category);
      const qOk = this._matches(el, this.query);
      if (catOk && qOk) {
        visible.add(el.atomicNumber);
        if (hasQuery) highlight.add(el.atomicNumber);
      }
    });

    this.scene.applyFilter(visible, highlight);
    this.dom.count.textContent = `${toFaDigits(visible.size)} / ${toFaDigits(TOTAL_ELEMENTS)} عنصر`;
    this.dom.count.style.opacity = visible.size ? '1' : '0.55';
    this._bumpCount();

    // پس از توقف تایپ، دوربین روی نخستین نتیجه تمرکز می‌کند
    clearTimeout(this._focusTimer);
    if (hasQuery && visible.size) {
      this._focusTimer = setTimeout(() => {
        const first = ELEMENTS.find((el) => visible.has(el.atomicNumber));
        if (first) this.scene.focusElement(first, visible.size === 1 ? 7 : 14);
      }, 300);
    }
  }

  /** پالس کوتاه شمارنده هنگام تغییر تعداد نتایج. */
  _bumpCount() {
    const badge = this.dom.count;
    badge.classList.remove('bump');
    void badge.offsetWidth; // شروع دوباره انیمیشن
    badge.classList.add('bump');
  }

  /* ======================== اتصال به صحنه ======================== */

  _bindScene() {
    this.scene.onHover = (el, x, y) => {
      if (el) {
        this._showTooltip(el, x, y);
        this.sfx.hover(el.atomicNumber);
      } else {
        this._hideTooltip();
      }
    };

    this.scene.onSelect = (el) => {
      if (this.quiz.active) {
        this._answerQuiz(el);
        return;
      }
      if (this.compareMode) {
        this.toggleCompare(el);
        return;
      }
      this.sfx.select(el.atomicNumber);
      this.openPanel(el);
      this._syncUrl();
    };

    this.scene.onBackgroundClick = () => {
      if (this.quiz.active || this.compareMode) return;
      this.closePanel();
      this.scene.clearSelection();
    };

    // با شروع درگ/زوم کاربر، حالت نمای سینمایی از حالت فعال خارج می‌شود
    this.scene.onUserOrbit = () => {
      if (this.dom.btnView && this.dom.btnView.getAttribute('aria-pressed') === 'true') {
        this.dom.btnView.setAttribute('aria-pressed', 'false');
      }
    };
  }

  _showTooltip(el, x, y) {
    const color = this.scene.colorFor(el);
    const cat = CATEGORY_MAP[el.category];
    const tip = this.dom.tooltip;

    let extra = '';
    if (this.heatKey) {
      const p = PROPERTY_MAP[this.heatKey];
      extra = `<div class="tt-meta tt-heat">${p.fa}: <b>${p.format(p.get(el))}</b></div>`;
    }
    const cmpHint = this.compareMode
      ? '<div class="tt-meta tt-act">برای افزودن به مقایسه کلیک کنید</div>'
      : '';

    tip.style.setProperty('--tt-color', color);
    tip.innerHTML = `<span class="tt-sym">${el.symbol}</span><b>${el.nameFa}</b>
      <div class="tt-meta">عدد اتمی ${toFaDigits(el.atomicNumber)} · ${cat.fa} · ${PHASE_FA[el.phase] || ''}</div>
      <div class="tt-meta">جرم اتمی ${el.mass} u</div>${extra}${cmpHint}`;
    tip.classList.add('show');
    tip.setAttribute('aria-hidden', 'false');

    const r = tip.getBoundingClientRect();
    const pad = 14;
    let left = x + pad;
    let top = y + pad;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
    tip.style.transform = `translate3d(${left}px, ${top}px, 0) scale(1)`;
    tip.style.right = 'auto';
    tip.style.left = '0';
    tip.style.top = '0';
  }

  _hideTooltip() {
    this.dom.tooltip.classList.remove('show');
    this.dom.tooltip.setAttribute('aria-hidden', 'true');
  }

  /* ======================== پنل جزئیات ======================== */

  openPanel(el) {
    const cat = CATEGORY_MAP[el.category];
    this.current = el;
    const d = this.dom;
    const accent = this.scene.colorFor(el);

    d.panel.style.setProperty('--accent', accent);
    d.panelSymbol.textContent = el.symbol;
    d.panelNumber.textContent = toFaDigits(el.atomicNumber);
    d.panelNameFa.textContent = el.nameFa;
    d.panelNameEn.textContent = el.name;
    d.panelCategory.textContent = cat.fa;
    d.panelBlock.textContent = `بلوک ${el.block}`;
    d.panelRadioactive.classList.toggle('is-hidden', !el.radioactive);
    d.panelFact.textContent = el.fact || '';
    d.panelFact.classList.toggle('is-hidden', !el.fact);

    if (d.panelWiki) {
      d.panelWiki.href = `https://fa.wikipedia.org/wiki/${encodeURIComponent(el.nameFa)}`;
    }
    this._syncCompareButton();

    const shells = shellsFor(el);
    this.shells = shells;
    this.shellColor = accent;
    d.bohrCaption.textContent = `لایه‌های الکترونی · مجموع ${toFaDigits(shells.reduce((a, b) => a + b, 0))} الکترون`;

    this._renderThermo(el);
    this._renderRanks(el);

    const rows = [
      ['جرم اتمی', `${el.mass} u`, false],
      ['دسته‌بندی', cat.fa, true],
      ['دوره', toFaDigits(el.period), false],
      ['گروه', el.group ? toFaDigits(el.group) : 'بلوک f (بدون گروه)', true],
      ['آرایش الکترونی', el.config, false],
      ['فاز (دمای اتاق)', PHASE_FA[el.phase] || PHASE_FA.unknown, true],
      ['الکترونگاتیوی', el.electronegativity === null ? '—' : String(el.electronegativity), false],
      ['شعاع اتمی', el.radius ? `${el.radius} pm` : '—', false],
      ['انرژی یونش', el.ionization ? `${el.ionization} kJ/mol` : '—', false],
      ['نقطه ذوب', formatTemperature(el.melt), false],
      ['نقطه جوش', formatTemperature(el.boil), false],
      ['چگالی', formatDensity(el), false],
      ['فراوانی در پوسته زمین', PROPERTY_MAP.abundance.format(el.abundance), false],
      ['لایه‌های الکترونی', shells.join(' · '), false],
      ['سال کشف', el.year ? String(el.year) : 'پیش از تاریخ', false],
      ['کاشف', el.discoverer, true],
    ];

    d.panelProps.innerHTML = rows
      .map(
        ([k, v, isFa]) =>
          `<div class="prop-row"><dt>${k}</dt><dd class="${isFa ? 'fa' : ''}">${v}</dd></div>`
      )
      .join('');

    if (d.panelPrev && d.panelNext) {
      const prevNum = el.atomicNumber - 1;
      const nextNum = el.atomicNumber + 1;
      if (prevNum >= 1) {
        const prevEl = ELEMENT_BY_NUMBER.get(prevNum);
        d.panelPrev.disabled = false;
        d.panelPrevLabel.textContent = `${prevEl.symbol} · ${prevEl.nameFa}`;
      } else {
        d.panelPrev.disabled = true;
        d.panelPrevLabel.textContent = '—';
      }
      if (nextNum <= TOTAL_ELEMENTS) {
        const nextEl = ELEMENT_BY_NUMBER.get(nextNum);
        d.panelNext.disabled = false;
        d.panelNextLabel.textContent = `${nextEl.symbol} · ${nextEl.nameFa}`;
      } else {
        d.panelNext.disabled = true;
        d.panelNextLabel.textContent = '—';
      }
    }

    d.panel.classList.add('open');
    d.panel.setAttribute('aria-hidden', 'false');
    this._startBohr();
  }

  /** نوارهای کوچکی که نشان می‌دهند عنصر روی بازه هر ویژگی کجا ایستاده است. */
  _renderRanks(el) {
    this.dom.panelRanks.innerHTML = RANK_KEYS.map((key) => {
      const p = PROPERTY_MAP[key];
      const t = normalizedValue(el, key);
      const value = p.format(p.get(el));
      if (t === null) {
        return `<div class="rank-row is-empty"><span class="rk-name">${p.fa}</span>
            <span class="rk-track"></span><span class="rk-val">—</span></div>`;
      }
      const pct = (t * 100).toFixed(1);
      return `<div class="rank-row"><span class="rk-name">${p.fa}</span>
          <span class="rk-track"><i style="inset-inline-start:${pct}%;background:${heatColor(t)};box-shadow:0 0 10px ${heatColor(t)}"></i></span>
          <span class="rk-val" dir="ltr">${value}</span></div>`;
    }).join('');
  }

  closePanel() {
    this.dom.panel.classList.remove('open');
    this.dom.panel.setAttribute('aria-hidden', 'true');
    this.current = null;
    this.bohrRunning = false;
  }

  /* ==================== دماسنج ذوب و جوش ==================== */

  /** نوار دمایی لگاریتمی (۱ تا ۶۰۰۰ کلوین) با نشانگرهای ذوب، جوش و دمای اتاق. */
  _renderThermo(el) {
    const t = this.dom;
    if (!t.thermo) return;
    if (el.melt === null || el.melt === undefined || el.boil === null || el.boil === undefined) {
      t.thermo.hidden = true;
      return;
    }
    t.thermo.hidden = false;

    const MAX_K = 6000;
    const pos = (k) => {
      const v = Math.min(MAX_K, Math.max(1, k));
      return (Math.log10(v) / Math.log10(MAX_K)) * 100;
    };

    const a = pos(Math.min(el.melt, el.boil));
    const b = pos(Math.max(el.melt, el.boil));
    t.thermoZone.style.left = `${a}%`;
    t.thermoZone.style.width = `${Math.max(0.8, b - a)}%`;
    t.thermoMelt.style.left = `${pos(el.melt)}%`;
    t.thermoBoil.style.left = `${pos(el.boil)}%`;
    t.thermoRoom.style.left = `${pos(293)}%`;

    t.thermoMelt.title = `نقطه ذوب: ${formatTemperature(el.melt)}`;
    t.thermoBoil.title = `نقطه جوش: ${formatTemperature(el.boil)}`;
    t.thermoRoom.title = 'دمای اتاق: حدود ۲۹۳ کلوین (۲۰ °C)';
  }

  /* ==================== پیشنهادهای زنده جستجو ==================== */

  _escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  _suggestOpen() {
    return this.dom.suggest && this.dom.suggest.classList.contains('open');
  }

  _closeSuggestions() {
    if (!this.dom.suggest) return;
    this.dom.suggest.classList.remove('open');
    this.dom.suggest.setAttribute('aria-hidden', 'true');
    this.sugList = [];
    this.sugIndex = -1;
  }

  _updateSuggestions() {
    const box = this.dom.suggest;
    if (!box) return;
    const q = this.query.trim();
    if (!q) {
      this._closeSuggestions();
      return;
    }

    const list = ELEMENTS.filter((el) => this._matches(el, q)).slice(0, 7);
    this.sugList = list;
    this.sugIndex = -1;

    if (!list.length) {
      box.innerHTML = `<div class="sug-empty">عنصری با عبارت «${this._escapeHtml(q)}» یافت نشد</div>`;
    } else {
      box.innerHTML = list
        .map((el) => {
          const color = CATEGORY_MAP[el.category].color;
          return `<button type="button" class="sug-item" role="option" aria-selected="false" data-z="${el.atomicNumber}" style="--c:${color}">
              <span class="sug-sym">${el.symbol}</span>
              <span class="sug-name">${el.nameFa}<i>${el.name}</i></span>
              <span class="sug-num">${el.atomicNumber}</span>
            </button>`;
        })
        .join('');
    }
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
  }

  _moveSuggestion(delta) {
    if (!this.sugList.length) return;
    const n = this.sugList.length;
    this.sugIndex = ((this.sugIndex + delta) % n + n) % n;
    this.dom.suggest.querySelectorAll('.sug-item').forEach((item, i) => {
      const active = i === this.sugIndex;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
  }

  /** انتخاب یک عنصر از هر مسیری (پیشنهاد، Enter یا تصادفی) با لغو فوکوس خودکار جستجو. */
  _selectElement(el) {
    clearTimeout(this._focusTimer);
    this._closeSuggestions();
    if (this.dom.search) this.dom.search.blur();
    this.scene.select(el);
  }

  _randomElement() {
    const el = ELEMENTS[(Math.random() * ELEMENTS.length) | 0];
    this._selectElement(el);
  }

  /* ======================== مقایسه عناصر ======================== */

  toggleCompareMode(force) {
    const on = force === undefined ? !this.compareMode : force;
    this.compareMode = on;
    this.dom.btnCompare.setAttribute('aria-pressed', String(on));
    this.dom.compareTray.classList.toggle('is-hidden', !on);
    if (on) {
      this.stopTour();
      this.endQuiz(true);
      this.closePanel();
      this.scene.clearSelection();
      this._showBadge('حالت مقایسه', 'تا سه عنصر را روی صحنه انتخاب کنید');
    } else {
      this.clearCompare();
    }
    this._renderCompareTray();
  }

  /** افزودن یا برداشتن یک عنصر از فهرست مقایسه. */
  toggleCompare(el) {
    const i = this.compareList.findIndex((e) => e.atomicNumber === el.atomicNumber);
    if (i >= 0) {
      this.compareList.splice(i, 1);
      this.sfx.click();
    } else {
      if (this.compareList.length >= MAX_COMPARE) {
        this.toast(`حداکثر ${toFaDigits(MAX_COMPARE)} عنصر را می‌توان مقایسه کرد`);
        this.sfx.wrong();
        return;
      }
      this.compareList.push(el);
      this.sfx.select(el.atomicNumber);
    }
    this.scene.setCompareSet(new Set(this.compareList.map((e) => e.atomicNumber)));
    this._renderCompareTray();
    this._syncCompareButton();
  }

  clearCompare() {
    this.compareList = [];
    this.scene.setCompareSet(null);
    this._renderCompareTray();
    this._syncCompareButton();
  }

  _syncCompareButton() {
    if (!this.dom.panelCompare) return;
    const el = this.current;
    if (!el) return;
    const inList = this.compareList.some((e) => e.atomicNumber === el.atomicNumber);
    this.dom.panelCompare.textContent = inList ? 'حذف از مقایسه' : 'افزودن به مقایسه';
  }

  _renderCompareTray() {
    const slots = [];
    for (let i = 0; i < MAX_COMPARE; i += 1) {
      const el = this.compareList[i];
      if (el) {
        const c = this.scene.colorFor(el);
        slots.push(`<button type="button" class="cmp-slot filled" data-z="${el.atomicNumber}" style="--c:${c}" title="برداشتن ${el.nameFa}">
            <b>${el.symbol}</b><span>${el.nameFa}</span></button>`);
      } else {
        slots.push('<span class="cmp-slot empty">خالی</span>');
      }
    }
    this.dom.cmpSlots.innerHTML = slots.join('');
    this.dom.cmpOpen.disabled = this.compareList.length < 2;
  }

  openCompareModal() {
    if (this.compareList.length < 2) return;
    const list = this.compareList;
    const keys = ['mass', 'radius', 'electronegativity', 'ionization', 'melt', 'boil', 'density', 'abundance', 'year'];

    const head = `<div class="cmp-col cmp-head-col"></div>${list
      .map((el) => {
        const c = this.scene.colorFor(el);
        return `<div class="cmp-col"><div class="cmp-card" style="--c:${c}">
            <b>${el.symbol}</b><span>${el.nameFa}</span><i>${toFaDigits(el.atomicNumber)}</i></div></div>`;
      })
      .join('')}`;

    const rows = keys
      .map((key) => {
        const p = PROPERTY_MAP[key];
        const cells = list
          .map((el) => {
            const t = normalizedValue(el, key);
            const raw = p.get(el);
            const top = raw !== null && raw !== undefined && raw === Math.max(...list.map((e) => (p.get(e) === null || p.get(e) === undefined ? -Infinity : p.get(e))));
            const bar = t === null ? '' : `<i style="width:${(t * 100).toFixed(1)}%;background:${heatColor(t)}"></i>`;
            return `<div class="cmp-col"><div class="cmp-cell${top ? ' is-top' : ''}"${top ? ' title="بیشترین مقدار میان این عناصر"' : ''}>
                <span class="cmp-val" dir="ltr">${p.format(raw)}</span>
                <span class="cmp-bar">${bar}</span></div></div>`;
          })
          .join('');
        return `<div class="cmp-row"><div class="cmp-col cmp-head-col">${p.fa}</div>${cells}</div>`;
      })
      .join('');

    const facts = list
      .map((el) => `<div class="cmp-col"><p class="cmp-fact">${el.fact || '—'}</p></div>`)
      .join('');

    this.dom.cmpBody.innerHTML =
      `<div class="cmp-row cmp-head">${head}</div>${rows}` +
      `<div class="cmp-row cmp-facts"><div class="cmp-col cmp-head-col">دانستنی</div>${facts}</div>`;

    this.dom.cmpModal.classList.add('open');
    this.dom.cmpModal.setAttribute('aria-hidden', 'false');
  }

  closeCompareModal() {
    this.dom.cmpModal.classList.remove('open');
    this.dom.cmpModal.setAttribute('aria-hidden', 'true');
  }

  /* ======================== تور خودکار ======================== */

  toggleTour(force) {
    const on = force === undefined ? !this.tourTimer : force;
    if (on) this.startTour();
    else this.stopTour();
  }

  startTour() {
    if (this.tourTimer) return;
    this.endQuiz(true);
    this.toggleCompareMode(false);
    this.dom.btnTour.setAttribute('aria-pressed', 'true');
    this._showBadge('تور خودکار', 'هر چند ثانیه یک عنصر معرفی می‌شود');

    this.tourIndex = this.current ? this.current.atomicNumber : 0;
    const step = () => {
      this.tourIndex = (this.tourIndex % TOTAL_ELEMENTS) + 1;
      const el = ELEMENT_BY_NUMBER.get(this.tourIndex);
      if (el) this.scene.select(el);
    };
    step();
    this.tourTimer = setInterval(step, TOUR_INTERVAL);
  }

  stopTour() {
    if (!this.tourTimer) return;
    clearInterval(this.tourTimer);
    this.tourTimer = null;
    this.dom.btnTour.setAttribute('aria-pressed', 'false');
  }

  /* ======================== حالت آزمون ======================== */

  startQuiz() {
    this.stopTour();
    this.toggleCompareMode(false);
    this.closePanel();
    this.scene.clearSelection();

    this.quiz.active = true;
    this.quiz.score = 0;
    this.quiz.streak = 0;
    this.quiz.asked = new Set();
    this.dom.quiz.classList.remove('is-hidden');
    this.dom.btnQuiz.setAttribute('aria-pressed', 'true');
    this.scene.autoFocus = false;
    this._showBadge('حالت آزمون', 'عنصر خواسته‌شده را روی صحنه پیدا کن');
    this._nextQuestion();
  }

  endQuiz(silent) {
    if (!this.quiz.active) return;
    clearInterval(this.quiz.timer);
    this.quiz.timer = null;
    this.quiz.active = false;
    this.quiz.target = null;
    this.dom.quiz.classList.add('is-hidden');
    this.dom.btnQuiz.setAttribute('aria-pressed', 'false');
    this.scene.autoFocus = true;
    this.scene.clearSelection();
    if (!silent) this.toast(`آزمون تمام شد — امتیاز شما: ${toFaDigits(this.quiz.score)}`);
  }

  /** ساخت پرسش تازه از میان شش الگوی مختلف. */
  _nextQuestion() {
    clearInterval(this.quiz.timer);

    // عناصری که هنوز پرسیده نشده‌اند؛ با پر شدن فهرست دوباره از صفر
    let pool = ELEMENTS.filter((el) => !this.quiz.asked.has(el.atomicNumber));
    if (!pool.length) {
      this.quiz.asked.clear();
      pool = ELEMENTS;
    }
    const el = pool[(Math.random() * pool.length) | 0];
    this.quiz.asked.add(el.atomicNumber);
    this.quiz.target = el;

    const forms = [
      () => `کدام عنصر نماد شیمیایی <b>${el.symbol}</b> را دارد؟`,
      () => `عنصر با عدد اتمی <b>${toFaDigits(el.atomicNumber)}</b> کدام است؟`,
      () => `«<b>${el.nameFa}</b>» را روی جدول پیدا کن.`,
      () => (el.group ? `کدام عنصر در دوره <b>${toFaDigits(el.period)}</b> و گروه <b>${toFaDigits(el.group)}</b> است؟` : null),
      () => (el.discoverer && !el.discoverer.startsWith('ناشناخته') ? `این عنصر را <b>${el.discoverer}</b> کشف کرد. کدام است؟` : null),
      () => (el.fact ? `کدام عنصر؟ «${el.fact}»` : null),
    ];
    const usable = forms.map((f) => f()).filter(Boolean);
    this.dom.quizQuestion.innerHTML = usable[(Math.random() * usable.length) | 0];

    this.dom.quizFeedback.textContent = 'کارت درست را روی صحنه پیدا کن و کلیک کن';
    this.dom.quizFeedback.className = 'quiz-hint';
    this.quiz.left = QUIZ_SECONDS;
    this._paintQuizTime();

    this.quiz.timer = setInterval(() => {
      this.quiz.left -= 1;
      this._paintQuizTime();
      if (this.quiz.left === 8) {
        const cat = CATEGORY_MAP[this.quiz.target.category];
        this.dom.quizFeedback.textContent = `راهنمایی: این عنصر از دسته «${cat.fa}» است.`;
      }
      if (this.quiz.left <= 0) this._quizTimeout();
    }, 1000);
  }

  _paintQuizTime() {
    this.dom.quizTime.textContent = toFaDigits(Math.max(0, this.quiz.left));
    this.dom.quizScore.textContent = toFaDigits(this.quiz.score);
    this.dom.quizStreak.textContent = toFaDigits(this.quiz.streak);
    const pct = Math.max(0, (this.quiz.left / QUIZ_SECONDS) * 100);
    this.dom.quizBarFill.style.width = `${pct}%`;
    this.dom.quizBarFill.style.background =
      pct > 50 ? 'var(--neon)' : pct > 22 ? '#f0ba30' : '#f43f5e';
  }

  _quizTimeout() {
    clearInterval(this.quiz.timer);
    this.quiz.streak = 0;
    this.sfx.wrong();
    const t = this.quiz.target;
    this.dom.quizFeedback.textContent = `زمان تمام شد — پاسخ درست: ${t.symbol} (${t.nameFa})`;
    this.dom.quizFeedback.className = 'quiz-hint is-wrong';
    this.scene.focusElement(t, 9);
    setTimeout(() => this.quiz.active && this._nextQuestion(), 2200);
  }

  _answerQuiz(el) {
    const t = this.quiz.target;
    if (!t) return;
    if (el.atomicNumber === t.atomicNumber) {
      clearInterval(this.quiz.timer);
      this.quiz.streak += 1;
      const gained = 100 + this.quiz.left * 5 + (this.quiz.streak - 1) * 25;
      this.quiz.score += gained;
      this.sfx.correct();
      this.dom.quizFeedback.textContent = `درست! +${toFaDigits(gained)} امتیاز${this.quiz.streak > 1 ? ` · ${toFaDigits(this.quiz.streak)} پاسخ پیاپی` : ''}`;
      this.dom.quizFeedback.className = 'quiz-hint is-right';
      this._paintQuizTime();
      setTimeout(() => this.quiz.active && this._nextQuestion(), 1200);
    } else {
      this.quiz.streak = 0;
      this.quiz.score = Math.max(0, this.quiz.score - 25);
      this.sfx.wrong();
      this.dom.quizFeedback.textContent = `${el.symbol} درست نیست — دوباره تلاش کن`;
      this.dom.quizFeedback.className = 'quiz-hint is-wrong';
      this._paintQuizTime();
    }
  }

  /* ==================== نمودار بور (لایه‌های الکترونی) ==================== */

  _startBohr() {
    if (this.bohrRunning) return;
    this.bohrRunning = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.bohrRunning) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.bohrTime += dt;
      this._drawBohr();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /**
   * نمودار اتم با مدارهای بیضویِ کج — حس سه‌بعدی می‌دهد بدون هزینه WebGL.
   * الکترون‌های پشت هسته کم‌رنگ‌تر و کوچک‌تر رسم می‌شوند.
   */
  _drawBohr() {
    const g = this.bohrCtx;
    const c = this.dom.bohr;
    const W = c.width;
    const H = c.height;
    const cx = W / 2;
    const cy = H / 2;
    const shells = this.shells || [];
    const color = this.shellColor || '#06b6d4';

    g.clearRect(0, 0, W, H);

    const maxR = Math.min(W, H) / 2 - 26;
    const coreR = 34 + Math.sin(this.bohrTime * 2.2) * 1.8;
    const step = shells.length ? (maxR - coreR - 6) / shells.length : maxR;

    // مدارها: هر لایه با کجی و شیب کمی متفاوت تا صحنه تخت به نظر نرسد
    const orbits = shells.map((count, i) => {
      const r = coreR + 8 + step * (i + 1);
      return {
        count,
        rx: r,
        ry: r * (0.34 + i * 0.055),
        tilt: -0.28 + i * 0.12,
        speed: 0.85 / (i * 0.5 + 1),
        phase: i * 0.7,
      };
    });

    orbits.forEach((o) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(o.tilt);
      g.beginPath();
      g.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI * 2);
      g.strokeStyle = rgba(color, 0.22);
      g.lineWidth = 1.1;
      g.stroke();
      g.restore();
    });

    // الکترون‌ها — ابتدا آن‌هایی که پشت هسته‌اند تا ترتیب عمق درست باشد
    const dots = [];
    orbits.forEach((o, i) => {
      for (let e = 0; e < o.count; e += 1) {
        const a = this.bohrTime * o.speed + (e / o.count) * Math.PI * 2 + o.phase;
        const lx = Math.cos(a) * o.rx;
        const ly = Math.sin(a) * o.ry;
        const x = cx + lx * Math.cos(o.tilt) - ly * Math.sin(o.tilt);
        const y = cy + lx * Math.sin(o.tilt) + ly * Math.cos(o.tilt);
        // sin(a) مثبت یعنی الکترون در نیمه نزدیک مدار است
        dots.push({ x, y, depth: Math.sin(a), shell: i });
      }
    });
    dots.sort((a, b) => a.depth - b.depth);

    dots.forEach((d) => {
      const near = (d.depth + 1) / 2; // ۰ = دورترین، ۱ = نزدیک‌ترین
      const r = 2.4 + near * 2.2;
      g.beginPath();
      g.arc(d.x, d.y, r, 0, Math.PI * 2);
      g.fillStyle = `rgba(224, 242, 254, ${0.42 + near * 0.58})`;
      g.shadowColor = color;
      g.shadowBlur = 6 + near * 12;
      g.fill();
      g.shadowBlur = 0;
    });

    // برچسب لایه‌ها به صورت ستونی در گوشه، تا روی مدارهای کج همپوشانی نکنند
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.font = '600 12px Orbitron, Vazirmatn, sans-serif';
    orbits.forEach((o, i) => {
      const y = 22 + i * 17;
      g.fillStyle = rgba(color, 0.85);
      g.fillRect(16, y - 4, 8, 8);
      g.fillStyle = 'rgba(255,255,255,0.62)';
      g.fillText(`${SHELL_NAMES[i] || i + 1} = ${o.count}`, 30, y);
    });

    // هسته با نبض ملایم
    const grd = g.createRadialGradient(cx - 7, cy - 7, 2, cx, cy, coreR);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.45, color);
    grd.addColorStop(1, rgba(color, 0));
    g.beginPath();
    g.arc(cx, cy, coreR, 0, Math.PI * 2);
    g.fillStyle = grd;
    g.fill();

    // حلقه نقطه‌چین چرخان دور هسته
    g.save();
    g.beginPath();
    g.arc(cx, cy, coreR + 11, 0, Math.PI * 2);
    g.setLineDash([6, 9]);
    g.lineDashOffset = -this.bohrTime * 26;
    g.lineWidth = 1.4;
    g.strokeStyle = rgba(color, 0.55);
    g.stroke();
    g.restore();

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#050508';
    g.font = '700 22px Orbitron, Vazirmatn, sans-serif';
    g.fillText(this.current ? this.current.symbol : '', cx, cy + 1);
  }

  /* ==================== پیام‌ها و نشان حالت ==================== */

  toast(message) {
    const t = this.dom.toast;
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  _showBadge(title, sub) {
    const b = this.dom.modeBadge;
    b.innerHTML = `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`;
    b.classList.add('show');
    clearTimeout(this._badgeTimer);
    this._badgeTimer = setTimeout(() => b.classList.remove('show'), 2400);
  }

  /* ==================== لینک مستقیم و خروجی تصویر ==================== */

  /** وضعیت جاری (عنصر، چیدمان، نقشه داده) را در نوار نشانی می‌نویسد. */
  _syncUrl() {
    if (this._booting) return; // هنگام راه‌اندازی، پارامترهای لینک نباید پاک شوند
    const params = new URLSearchParams();
    if (this.current) params.set('el', this.current.symbol);
    if (this.layoutKey !== 'table') params.set('layout', this.layoutKey);
    if (this.heatKey) params.set('map', this.heatKey);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  /** خواندن وضعیت از نوار نشانی هنگام بارگذاری. */
  _applyInitialState() {
    this._booting = true;
    const params = new URLSearchParams(location.search);
    const layout = params.get('layout');
    if (layout && LAYOUT_KEYS.includes(layout)) this.setLayout(layout, { silent: true });
    else this.setLayout('table', { silent: true });

    const map = params.get('map');
    if (map && PROPERTY_MAP[map]) this.setHeat(map, { silent: true });

    const raw = params.get('el') || decodeURIComponent(location.hash.replace('#', ''));
    if (raw) {
      const el =
        ELEMENTS.find((e) => e.symbol.toLowerCase() === raw.toLowerCase()) ||
        ELEMENT_BY_NUMBER.get(Number(raw)) ||
        ELEMENTS.find((e) => normalizeFa(e.nameFa) === normalizeFa(raw));
      if (el) setTimeout(() => this.scene.select(el), 900);
    }

    this.dom.btnSound.setAttribute('aria-pressed', String(this.sfx.enabled));

    // روی صفحه‌های کوچک، پنل بینش صحنه را می‌پوشاند؛ بسته شروع می‌شود
    if (window.matchMedia('(max-width: 900px)').matches) {
      this.dom.legend.classList.add('hidden');
      this.dom.btnLegend.setAttribute('aria-pressed', 'false');
    }

    this._booting = false;
  }

  async shareCurrent() {
    if (!this.current) return;
    this._syncUrl();
    const url = location.href;
    const title = `${this.current.nameFa} (${this.current.symbol}) — جدول تناوبی سه‌بعدی`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.toast('لینک این عنصر کپی شد');
    } catch (_) {
      this.toast('کپی لینک ممکن نشد — نشانی صفحه را دستی بردارید');
    }
  }

  async captureShot() {
    this.toast('در حال گرفتن تصویر…');
    const url = await this.scene.capture();
    if (!url) {
      this.toast('گرفتن تصویر ممکن نشد');
      return;
    }
    const a = document.createElement('a');
    const name = this.current ? this.current.symbol : 'periodic-table';
    a.href = url;
    a.download = `${name}-3d-${Date.now()}.png`;
    a.click();
    this.toast('تصویر ذخیره شد');
  }

  /* ======================== رویدادهای DOM ======================== */

  _bindDom() {
    const d = this.dom;

    d.search.addEventListener('input', () => {
      this.query = d.search.value;
      d.searchWrap.classList.toggle('has-value', this.query.length > 0);
      this._updateSuggestions();
      this.apply();
    });

    d.search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        d.search.value = '';
        this.query = '';
        d.searchWrap.classList.remove('has-value');
        this._closeSuggestions();
        this.apply();
        d.search.blur();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (this._suggestOpen()) {
          e.preventDefault();
          this._moveSuggestion(e.key === 'ArrowDown' ? 1 : -1);
        }
        return;
      }
      if (e.key === 'Enter') {
        const picked =
          this._suggestOpen() && this.sugIndex >= 0 && this.sugList[this.sugIndex]
            ? this.sugList[this.sugIndex]
            : ELEMENTS.find((el) => this._matches(el, this.query));
        if (picked) this._selectElement(picked);
      }
    });

    // انتخاب با کلیک/تپ روی هر پیشنهاد — pointerdown تا پیش از blur پنجره بسته نشود
    if (d.suggest) {
      d.suggest.addEventListener('pointerdown', (e) => {
        const item = e.target.closest('.sug-item');
        if (!item) return;
        e.preventDefault();
        const el = ELEMENT_BY_NUMBER.get(Number(item.dataset.z));
        if (el) this._selectElement(el);
      });
    }

    d.searchClear.addEventListener('click', () => {
      d.search.value = '';
      this.query = '';
      d.searchWrap.classList.remove('has-value');
      this._closeSuggestions();
      this.apply();
      d.search.focus();
    });

    d.panelClose.addEventListener('click', () => {
      this.closePanel();
      this.scene.clearSelection();
      this._syncUrl();
    });

    d.panelFocus.addEventListener('click', () => {
      if (this.current) this.scene.focusElement(this.current, 6.5);
    });

    d.panelCompare.addEventListener('click', () => {
      if (!this.current) return;
      if (!this.compareMode) this.toggleCompareMode(true);
      this.toggleCompare(this.current);
      this._syncCompareButton();
    });

    d.panelShare.addEventListener('click', () => this.shareCurrent());

    if (d.brandLogo) {
      d.brandLogo.addEventListener('click', () => this._toggleHelp(true));
    }

    if (d.filterToggle) {
      d.filterToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFiltersTray();
      });
    }

    if (d.filtersReset) {
      d.filtersReset.addEventListener('click', () => this.toggleCategory(''));
    }

    d.panelPrev.addEventListener('click', () => this._step(-1));
    d.panelNext.addEventListener('click', () => this._step(1));

    // مقایسه
    d.cmpSlots.addEventListener('click', (e) => {
      const slot = e.target.closest('.cmp-slot.filled');
      if (!slot) return;
      const el = ELEMENT_BY_NUMBER.get(Number(slot.dataset.z));
      if (el) this.toggleCompare(el);
    });
    d.cmpOpen.addEventListener('click', () => this.openCompareModal());
    d.cmpClear.addEventListener('click', () => this.clearCompare());
    d.cmpClose.addEventListener('click', () => this.closeCompareModal());
    d.cmpModal.addEventListener('click', (e) => {
      if (e.target === d.cmpModal) this.closeCompareModal();
    });

    // آزمون
    d.quizSkip.addEventListener('click', () => {
      this.quiz.streak = 0;
      this._nextQuestion();
    });
    d.quizExit.addEventListener('click', () => this.endQuiz());

    window.addEventListener('click', (e) => {
      if (d.filtersTray && !d.filtersTray.classList.contains('collapsed')) {
        if (!d.filtersTray.contains(e.target) && !d.filterToggle.contains(e.target)) {
          this.toggleFiltersTray(false);
        }
      }
      if (this._suggestOpen() && !e.target.closest('.cmd-core')) {
        this._closeSuggestions();
      }
    });

    d.btnRotate.addEventListener('click', () => this.toggleAutoRotate());
    d.btnReset.addEventListener('click', () => {
      if (d.btnView) d.btnView.setAttribute('aria-pressed', 'false');
      this.scene.resetCamera(0.9);
    });
    d.btnRandom.addEventListener('click', () => this._randomElement());

    d.btnView.addEventListener('click', () => {
      const on = d.btnView.getAttribute('aria-pressed') !== 'true';
      d.btnView.setAttribute('aria-pressed', String(on));
      this.scene.setViewIso(on);
    });

    d.btnZoomIn.addEventListener('click', () => this.scene.zoomBy(0.72));
    d.btnZoomOut.addEventListener('click', () => this.scene.zoomBy(1.38));
    d.btnLayout.addEventListener('click', () => this.nextLayout());
    d.btnTour.addEventListener('click', () => this.toggleTour());
    d.btnCompare.addEventListener('click', () => this.toggleCompareMode());
    d.btnQuiz.addEventListener('click', () => {
      if (this.quiz.active) this.endQuiz();
      else this.startQuiz();
    });

    d.btnLegend.addEventListener('click', () => {
      const hidden = d.legend.classList.toggle('hidden');
      d.btnLegend.setAttribute('aria-pressed', String(!hidden));
    });

    d.btnSound.addEventListener('click', () => {
      const on = d.btnSound.getAttribute('aria-pressed') !== 'true';
      d.btnSound.setAttribute('aria-pressed', String(on));
      this.sfx.setEnabled(on);
      if (on) this.sfx.select(6);
      this.toast(on ? 'صدا روشن شد' : 'صدا خاموش شد');
    });

    d.btnShot.addEventListener('click', () => this.captureShot());
    d.btnHelp.addEventListener('click', () => this._toggleHelp(true));
    d.helpClose.addEventListener('click', () => this._toggleHelp(false));
    d.help.addEventListener('click', (e) => {
      if (e.target === d.help) this._toggleHelp(false);
    });

    d.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => {
      d.btnFullscreen.setAttribute('aria-pressed', String(!!document.fullscreenElement));
    });
  }

  /** رفتن به عنصر قبلی/بعدی بر پایه عدد اتمی. */
  _step(delta) {
    if (!this.current) return;
    const z = this.current.atomicNumber + delta;
    if (z < 1 || z > TOTAL_ELEMENTS) return;
    const el = ELEMENT_BY_NUMBER.get(z);
    if (el) this.scene.select(el);
  }

  toggleAutoRotate() {
    const on = this.dom.btnRotate.getAttribute('aria-pressed') !== 'true';
    this.dom.btnRotate.setAttribute('aria-pressed', String(on));
    this.scene.setAutoRotate(on);
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  _toggleHelp(open) {
    this.dom.help.classList.toggle('open', open);
    this.dom.help.setAttribute('aria-hidden', String(!open));
  }

  toggleFiltersTray(forceOpen) {
    if (!this.dom.filtersTray || !this.dom.filterToggle) return;
    const isClosed = this.dom.filtersTray.classList.contains('collapsed');
    const nextState = forceOpen !== undefined ? forceOpen : isClosed;
    this.dom.filtersTray.classList.toggle('collapsed', !nextState);
    this.dom.filterToggle.setAttribute('aria-pressed', String(nextState));
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;

      if (e.key === '/' && !typing) {
        e.preventDefault();
        this.dom.search.focus();
        this.dom.search.select();
        return;
      }

      if (e.key === 'Escape') {
        if (this.dom.cmpModal.classList.contains('open')) this.closeCompareModal();
        else if (this.dom.filtersTray && !this.dom.filtersTray.classList.contains('collapsed')) {
          this.toggleFiltersTray(false);
        } else if (this.dom.help.classList.contains('open')) {
          this._toggleHelp(false);
        } else if (this.quiz.active) {
          this.endQuiz();
        } else if (this.compareMode) {
          this.toggleCompareMode(false);
        } else if (this.dom.panel.classList.contains('open')) {
          this.closePanel();
          this.scene.clearSelection();
          this._syncUrl();
        }
        return;
      }

      if (typing) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        this.nextLayout();
        return;
      }

      // عنصر تصادفی با Space (بدون کلید ترکیبی)
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this._randomElement();
        return;
      }

      if (this.dom.panel.classList.contains('open') && this.current) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          this._step(-1);
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          this._step(1);
          return;
        }
      }

      // انتخاب مستقیم چیدمان با کلیدهای ۱ تا ۷
      const digit = Number(e.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= LAYOUT_KEYS.length) {
        this.setLayout(LAYOUT_KEYS[digit - 1]);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'r') this.toggleAutoRotate();
      else if (key === '0') this.scene.resetCamera(0.9);
      else if (key === 'f') this.toggleFullscreen();
      else if (key === 't') this.toggleFiltersTray();
      else if (key === 'c') this.toggleCompareMode();
      else if (key === 'q') (this.quiz.active ? this.endQuiz() : this.startQuiz());
      else if (key === 'p') this.toggleTour();
      else if (key === 's') this.captureShot();
      else if (key === 'm') this.dom.btnSound.click();
      else if (key === '+' || key === '=') this.scene.zoomBy(0.75);
      else if (key === '-') this.scene.zoomBy(1.35);
      else if (key === 'l') this.dom.btnLegend.click();
      else if (key === '?') this._toggleHelp(true);
    });
  }
}
