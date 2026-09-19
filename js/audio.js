/**
 * audio.js — افکت‌های صوتیِ ساخته‌شده در لحظه با Web Audio
 * هیچ فایل صوتی‌ای دانلود نمی‌شود؛ همه صداها با نوسان‌ساز تولید می‌شوند.
 * زمینه صوتی تا نخستین تعامل کاربر ساخته نمی‌شود (سیاست autoplay مرورگرها).
 */

const STORAGE_KEY = 'pt3d:sound';

export class Sfx {
  constructor() {
    this.enabled = localStorage.getItem(STORAGE_KEY) === '1';
    this.ctx = null;
    this.master = null;
    this._lastHover = 0;
  }

  setEnabled(on) {
    this.enabled = on;
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    if (on) this._ensure();
  }

  _ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.12;
      // فیلتر پایین‌گذر تا صداها تیز و آزاردهنده نباشند
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5200;
      this.master.connect(lp);
      lp.connect(this.ctx.destination);
    } catch (_) {
      this.ctx = null;
    }
    return this.ctx;
  }

  /**
   * یک نُت کوتاه با پوش نمایی.
   * @param {number} freq بسامد پایه (هرتز)
   * @param {number} dur طول نت (ثانیه)
   */
  _tone(freq, dur, { type = 'sine', gain = 1, detune = 0, delay = 0, sweep = 1 } = {}) {
    const ctx = this._ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweep !== 1) osc.frequency.exponentialRampToValueAtTime(freq * sweep, t0 + dur);
    osc.detune.value = detune;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env);
    env.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** صدای بسیار کوتاه هنگام عبور اشاره‌گر از روی کارت — با محدودکننده نرخ. */
  hover(atomicNumber = 1) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this._lastHover < 55) return;
    this._lastHover = now;
    // بسامد را به عدد اتمی گره می‌زنیم تا هر عنصر «نُت» خودش را داشته باشد
    const semitone = (atomicNumber % 24) - 12;
    this._tone(660 * Math.pow(2, semitone / 24), 0.07, { type: 'triangle', gain: 0.28 });
  }

  /** آکورد کوتاه هنگام انتخاب عنصر. */
  select(atomicNumber = 1) {
    if (!this.enabled) return;
    const base = 330 * Math.pow(2, ((atomicNumber % 12) - 6) / 12);
    this._tone(base, 0.26, { type: 'sine', gain: 0.5 });
    this._tone(base * 1.5, 0.22, { type: 'sine', gain: 0.3, delay: 0.03 });
    this._tone(base * 2, 0.18, { type: 'triangle', gain: 0.18, delay: 0.06 });
  }

  /** ویز کوتاه هنگام تغییر چیدمان. */
  morph() {
    if (!this.enabled) return;
    this._tone(180, 0.5, { type: 'sawtooth', gain: 0.22, sweep: 3.2 });
  }

  /** کلیک ملایم دکمه‌ها. */
  click() {
    if (!this.enabled) return;
    this._tone(880, 0.05, { type: 'square', gain: 0.14 });
  }

  /** پاسخ درست در حالت آزمون. */
  correct() {
    if (!this.enabled) return;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      this._tone(f, 0.22, { type: 'sine', gain: 0.42, delay: i * 0.07 });
    });
  }

  /** پاسخ نادرست در حالت آزمون. */
  wrong() {
    if (!this.enabled) return;
    this._tone(196, 0.3, { type: 'sawtooth', gain: 0.3, sweep: 0.6 });
  }
}
