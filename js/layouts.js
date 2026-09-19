/**
 * layouts.js — چیدمان‌های سه‌بعدی جدول
 *
 * هر چیدمان برای هر عنصر یک «حالت هدف» برمی‌گرداند:
 *   { x, y, z, rx, ry, rz, scale }
 * صحنه میان حالت فعلی و حالت هدف میان‌یابی می‌کند تا تغییر چیدمان
 * به صورت یک مورفِ نرم دیده شود.
 */
import { ELEMENTS, GRID, getGridPosition, normalizedValue } from './periodic-data.js';

const TAU = Math.PI * 2;

/** فهرست چیدمان‌ها برای ساخت دکمه‌های رابط کاربری. */
export const LAYOUTS = Object.freeze([
  { key: 'table', fa: 'جدول کلاسیک', hint: 'چیدمان استاندارد ۱۸ ستونی' },
  { key: 'wide', fa: 'جدول بلند', hint: 'فرم ۳۲ ستونی با لانتانید و آکتینید در جای اصلی' },
  { key: 'blocks', fa: 'بلوک‌های s p d f', hint: 'چهار بلوک جدا شده در عمق' },
  { key: 'spiral', fa: 'مارپیچ', hint: 'مارپیچ پیوسته بر پایه عدد اتمی' },
  { key: 'helix', fa: 'مارپیچ استوانه‌ای', hint: 'هر دوره یک دور کامل — گردباد عناصر' },
  { key: 'sphere', fa: 'کره', hint: 'توزیع یکنواخت روی سطح کره' },
  { key: 'relief', fa: 'نقشه برجسته', hint: 'ارتفاع هر کارت برابر مقدار ویژگی انتخابی' },
]);

export const LAYOUT_KEYS = LAYOUTS.map((l) => l.key);

/* ------------------------------ کمکی‌ها ------------------------------ */

const flat = (x, y, z = 0, scale = 1) => ({ x, y, z, rx: 0, ry: 0, rz: 0, scale });

/** کارت را طوری می‌چرخاند که رویش به سمت بیرون از محور عمودی باشد. */
function facingOut(x, y, z, scale = 1) {
  return { x, y, z, rx: 0, ry: Math.atan2(x, z), rz: 0, scale };
}

/** کارت را رو به بیرون از مرکز کره می‌چرخاند. */
function facingOutRadial(x, y, z, scale = 1) {
  const len = Math.hypot(x, y, z) || 1;
  return {
    x,
    y,
    z,
    rx: Math.asin(Math.max(-1, Math.min(1, -y / len))),
    ry: Math.atan2(x, z),
    rz: 0,
    scale,
  };
}

/* ------------------------------ چیدمان‌ها ------------------------------ */

/** ۱) جدول استاندارد ۱۸ ستونی — همان چیدمانی که همه می‌شناسند. */
function layoutTable() {
  return ELEMENTS.map((el) => {
    const p = getGridPosition(el);
    return flat(p.x, p.y, 0);
  });
}

/**
 * ۲) فرم بلند ۳۲ ستونی: بلوک f میان بلوک s و d می‌نشیند.
 * ستون‌ها: ۱–۲ گروه‌های s · ۳–۱۶ بلوک f · ۱۷–۳۲ گروه‌های ۳ تا ۱۸
 */
function layoutWide() {
  const cols = 32;
  const originCol = (cols + 1) / 2;
  const colW = GRID.colW * 0.92;
  return ELEMENTS.map((el) => {
    const z = el.atomicNumber;
    let col;
    if (z >= 57 && z <= 71) col = 3 + (z - 57);
    else if (z >= 89 && z <= 103) col = 3 + (z - 89);
    else if (el.group <= 2) col = el.group;
    else col = el.group + 14;

    const row = el.period;
    return flat((col - originCol) * colW, (4 - row) * GRID.rowH, 0, 0.92);
  });
}

/**
 * ۳) چهار بلوک s / p / d / f جدا از هم و در عمق‌های متفاوت.
 * هر بلوک شبکه فشرده خودش را دارد تا ساختار آرایش الکترونی دیده شود.
 */
function layoutBlocks() {
  const spec = {
    s: { cols: 2, origin: { x: -20.5, y: 5, z: 5 } },
    p: { cols: 6, origin: { x: 15.5, y: 5, z: 5 } },
    d: { cols: 10, origin: { x: -2, y: -6, z: -5 } },
    f: { cols: 14, origin: { x: 0, y: 11, z: -16 } },
  };
  const seen = { s: 0, p: 0, d: 0, f: 0 };
  const cw = GRID.colW * 0.86;
  const rh = GRID.rowH * 0.86;

  return ELEMENTS.map((el) => {
    const b = el.block;
    const cfg = spec[b] || spec.p;
    const i = seen[b];
    seen[b] += 1;
    const col = i % cfg.cols;
    const row = Math.floor(i / cfg.cols);
    return flat(
      cfg.origin.x + (col - (cfg.cols - 1) / 2) * cw,
      cfg.origin.y - row * rh,
      cfg.origin.z,
      0.86
    );
  });
}

/**
 * ۴) مارپیچ ارشمیدسی پیوسته بر پایه عدد اتمی.
 * گام زاویه‌ای با شعاع تنظیم می‌شود تا فاصله کارت‌ها ثابت بماند.
 */
function layoutSpiral() {
  const b = 1.55; // ضریب باز شدن مارپیچ
  const gap = GRID.colW * 1.02;
  let theta = 2.2;
  return ELEMENTS.map((el, i) => {
    const r = b * theta;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    theta += gap / Math.max(gap, r); // گام کوچک‌تر هرچه از مرکز دورتر می‌شویم
    // کمی عمق تا مارپیچ کاملاً تخت نباشد
    return { x, y, z: Math.sin(i * 0.28) * 1.2, rx: 0, ry: 0, rz: 0, scale: 0.9 };
  });
}

/**
 * ۵) مارپیچ استوانه‌ای: هر دوره یک دور کامل می‌چرخد و شعاع دور با
 * تعداد عناصر آن دوره تعیین می‌شود — نتیجه یک «گردباد» عناصر است.
 */
function layoutHelix() {
  const perPeriod = new Map();
  ELEMENTS.forEach((el) => {
    if (!perPeriod.has(el.period)) perPeriod.set(el.period, []);
    perPeriod.get(el.period).push(el.atomicNumber);
  });

  const index = new Map();
  perPeriod.forEach((list) => {
    list.sort((a, b) => a - b);
    list.forEach((z, i) => index.set(z, { i, n: list.length }));
  });

  const rowH = GRID.rowH * 1.35;
  return ELEMENTS.map((el) => {
    const { i, n } = index.get(el.atomicNumber);
    const radius = Math.max(6.5, (n * GRID.colW * 0.95) / TAU);
    const frac = i / n;
    const angle = frac * TAU - Math.PI / 2;
    const y = (4 - el.period) * rowH - frac * rowH;
    return facingOut(Math.cos(angle) * radius, y, Math.sin(angle) * radius, 0.88);
  });
}

/** ۶) توزیع فیبوناچی روی سطح کره — هیچ ناحیه‌ای شلوغ‌تر از بقیه نیست. */
function layoutSphere() {
  const n = ELEMENTS.length;
  const R = 17.5; // فشرده‌تر از این، کارت‌ها روی هم می‌افتند
  const golden = Math.PI * (3 - Math.sqrt(5));
  return ELEMENTS.map((el, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * golden;
    return facingOutRadial(Math.cos(phi) * r * R, y * R, Math.sin(phi) * r * R, 0.86);
  });
}

/**
 * ۷) نقشه برجسته: مختصات جدول کلاسیک، اما عمق هر کارت برابر مقدار
 * نرمال‌شده ویژگی انتخابی است. عناصر بدون داده کمی فرو می‌روند.
 */
function layoutRelief(propKey) {
  const DEPTH = 26;
  return ELEMENTS.map((el) => {
    const p = getGridPosition(el);
    const t = normalizedValue(el, propKey);
    const z = t === null ? -3.5 : t * DEPTH;
    return flat(p.x, p.y, z);
  });
}

const BUILDERS = {
  table: layoutTable,
  wide: layoutWide,
  blocks: layoutBlocks,
  spiral: layoutSpiral,
  helix: layoutHelix,
  sphere: layoutSphere,
  relief: layoutRelief,
};

/**
 * حالت هدف همه عناصر برای یک چیدمان.
 * @param {string} key کلید چیدمان
 * @param {string} propKey ویژگی مورد استفاده در چیدمان «نقشه برجسته»
 */
export function buildLayout(key, propKey = 'mass') {
  const fn = BUILDERS[key] || BUILDERS.table;
  return fn(propKey);
}

/**
 * شعاع کره در بر گیرنده چیدمان — برای فاصله دادن درست دوربین.
 */
export function layoutRadius(states) {
  let max = 1;
  for (let i = 0; i < states.length; i += 1) {
    const s = states[i];
    const d = Math.hypot(s.x, s.y, s.z);
    if (d > max) max = d;
  }
  return max;
}

/** آیا این چیدمان صفحه‌ای/تخت است؟ (برای تصمیم‌گیری درباره زاویه دوربین) */
export function isFlatLayout(key) {
  return key === 'table' || key === 'wide' || key === 'spiral';
}
