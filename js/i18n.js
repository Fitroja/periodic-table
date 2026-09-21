/**
 * i18n.js — Internationalization system
 * Supports: Persian (default), English, Chinese (Simplified), Russian
 */

const STORAGE_KEY = 'pt3d:lang';

export const LANGUAGES = [
  { code: 'fa', name: 'فارسی', dir: 'rtl', font: 'Vazirmatn' },
  { code: 'en', name: 'English', dir: 'ltr', font: 'system-ui' },
  { code: 'zh', name: '中文', dir: 'ltr', font: 'system-ui' },
  { code: 'ru', name: 'Русский', dir: 'ltr', font: 'system-ui' },
];

export const TRANSLATIONS = {
  // Application title and meta
  appTitle: {
    fa: 'جدول تناوبی سه‌بعدی مندلیف',
    en: '3D Mendeleev Periodic Table',
    zh: '门捷列夫三维元素周期表',
    ru: 'Трёхмерная таблица Менделеева',
  },
  appSubtitle: {
    fa: '۱۱۸ عنصر · ۷ چیدمان سه‌بعدی · ۹ نقشه داده',
    en: '118 elements · 7 3D layouts · 9 data maps',
    zh: '118个元素 · 7种3D布局 · 9种数据图',
    ru: '118 элементов · 7 3D-макетов · 9 карт данных',
  },

  // Loader
  loaderReady: {
    fa: 'در حال آماده‌سازی صحنه…',
    en: 'Preparing scene…',
    zh: '准备场景中…',
    ru: 'Подготовка сцены…',
  },
  loaderBuilding: {
    fa: 'در حال ساخت ۱۱۸ کارت عنصر…',
    en: 'Building 118 element cards…',
    zh: '创建118个元素卡片…',
    ru: 'Создание 118 карточек элементов…',
  },

  // Search
  searchPlaceholder: {
    fa: 'جستجو: نام، نماد یا عدد اتمی…',
    en: 'Search: name, symbol or atomic number…',
    zh: '搜索：名称、符号或原子序数…',
    ru: 'Поиск: название, символ или атомный номер…',
  },
  searchClear: {
    fa: 'پاک کردن جستجو',
    en: 'Clear search',
    zh: '清除搜索',
    ru: 'Очистить поиск',
  },
  resultCount: {
    fa: '{count} / ۱۱۸ عنصر',
    en: '{count} / 118 elements',
    zh: '{count} / 118 个元素',
    ru: '{count} / 118 элементов',
  },

  // Filters
  filterCategory: {
    fa: 'فیلتر دسته‌بندی',
    en: 'Filter categories',
    zh: '筛选类别',
    ru: 'Фильтр категорий',
  },
  showAll: {
    fa: 'نمایش همه',
    en: 'Show all',
    zh: '显示全部',
    ru: 'Показать все',
  },
  allElements: {
    fa: 'همه عناصر',
    en: 'All elements',
    zh: '所有元素',
    ru: 'Все элементы',
  },

  // Categories
  categories: {
    fa: 'دسته‌ها',
    en: 'Categories',
    zh: '类别',
    ru: 'Категории',
  },
  dataMap: {
    fa: 'نقشه داده',
    en: 'Data map',
    zh: '数据图',
    ru: 'Карта данных',
  },

  // Layout rail
  layout: {
    fa: 'چیدمان',
    en: 'Layout',
    zh: '布局',
    ru: 'Макет',
  },

  // Element panel
  atomicNumber: {
    fa: 'عدد اتمی',
    en: 'Atomic number',
    zh: '原子序数',
    ru: 'Атомный номер',
  },
  radioactive: {
    fa: 'پرتوزا',
    en: 'Radioactive',
    zh: '放射性',
    ru: 'Радиоактивный',
  },
  electronShells: {
    fa: 'لایه‌های الکترونی',
    en: 'Electron shells',
    zh: '电子层',
    ru: 'Электронные оболочки',
  },
  meltingPoint: {
    fa: 'ذوب',
    en: 'Melting',
    zh: '熔点',
    ru: 'Плавление',
  },
  boilingPoint: {
    fa: 'جوش',
    en: 'Boiling',
    zh: '沸点',
    ru: 'Кипение',
  },
  roomTemp: {
    fa: 'دمای اتاق',
    en: 'Room temp',
    zh: '室温',
    ru: 'Комн. темп.',
  },
  rankAmong: {
    fa: 'جایگاه میان ۱۱۸ عنصر',
    en: 'Rank among 118 elements',
    zh: '在118个元素中的排名',
    ru: 'Место среди 118 элементов',
  },

  // Properties
  atomicMass: {
    fa: 'جرم اتمی',
    en: 'Atomic mass',
    zh: '原子质量',
    ru: 'Атомная масса',
  },
  category: {
    fa: 'دسته‌بندی',
    en: 'Category',
    zh: '类别',
    ru: 'Категория',
  },
  period: {
    fa: 'دوره',
    en: 'Period',
    zh: '周期',
    ru: 'Период',
  },
  group: {
    fa: 'گروه',
    en: 'Group',
    zh: '族',
    ru: 'Группа',
  },
  electronConfig: {
    fa: 'آرایش الکترونی',
    en: 'Electron configuration',
    zh: '电子构型',
    ru: 'Электронная конфигурация',
  },
  phaseAtRoom: {
    fa: 'فاز (دمای اتاق)',
    en: 'Phase (room temp)',
    zh: '相态（室温）',
    ru: 'Фаза (комн. темп.)',
  },
  electronegativity: {
    fa: 'الکترونگاتیوی',
    en: 'Electronegativity',
    zh: '电负性',
    ru: 'Электроотрицательность',
  },
  atomicRadius: {
    fa: 'شعاع اتمی',
    en: 'Atomic radius',
    zh: '原子半径',
    ru: 'Атомный радиус',
  },
  ionizationEnergy: {
    fa: 'انرژی یونش',
    en: 'Ionization energy',
    zh: '电离能',
    ru: 'Энергия ионизации',
  },
  density: {
    fa: 'چگالی',
    en: 'Density',
    zh: '密度',
    ru: 'Плотность',
  },
  abundance: {
    fa: 'فراوانی در پوسته زمین',
    en: 'Abundance in Earth's crust',
    zh: '地壳丰度',
    ru: 'Содержание в земной коре',
  },
  yearDiscovered: {
    fa: 'سال کشف',
    en: 'Year discovered',
    zh: '发现年份',
    ru: 'Год открытия',
  },
  discoverer: {
    fa: 'کاشف',
    en: 'Discoverer',
    zh: '发现者',
    ru: 'Первооткрыватель',
  },

  // Phases
  solid: {
    fa: 'جامد',
    en: 'Solid',
    zh: '固体',
    ru: 'Твёрдое',
  },
  liquid: {
    fa: 'مایع',
    en: 'Liquid',
    zh: '液体',
    ru: 'Жидкое',
  },
  gas: {
    fa: 'گاز',
    en: 'Gas',
    zh: '气体',
    ru: 'Газ',
  },
  unknown: {
    fa: 'نامشخص',
    en: 'Unknown',
    zh: '未知',
    ru: 'Неизвестно',
  },

  // Actions
  focusCamera: {
    fa: 'تمرکز دوربین',
    en: 'Focus camera',
    zh: '聚焦相机',
    ru: 'Сфокусировать камеру',
  },
  addToCompare: {
    fa: 'افزودن به مقایسه',
    en: 'Add to compare',
    zh: '添加至对比',
    ru: 'Добавить к сравнению',
  },
  removeFromCompare: {
    fa: 'حذف از مقایسه',
    en: 'Remove from compare',
    zh: '从对比中移除',
    ru: 'Удалить из сравнения',
  },
  shareLink: {
    fa: 'اشتراک‌گذاری لینک',
    en: 'Share link',
    zh: '分享链接',
    ru: 'Поделиться ссылкой',
  },
  wikipediaArticle: {
    fa: 'مقاله ویکی‌پدیا',
    en: 'Wikipedia article',
    zh: '维基百科文章',
    ru: 'Статья в Википедии',
  },
  previousElement: {
    fa: 'عنصر قبلی',
    en: 'Previous element',
    zh: '上一个元素',
    ru: 'Предыдущий элемент',
  },
  nextElement: {
    fa: 'عنصر بعدی',
    en: 'Next element',
    zh: '下一个元素',
    ru: 'Следующий элемент',
  },
  close: {
    fa: 'بستن',
    en: 'Close',
    zh: '关闭',
    ru: 'Закрыть',
  },

  // Controls
  autoRotate: {
    fa: 'چرخش خودکار',
    en: 'Auto-rotate',
    zh: '自动旋转',
    ru: 'Авто-вращение',
  },
  resetCamera: {
    fa: 'بازنشانی دوربین',
    en: 'Reset camera',
    zh: '重置相机',
    ru: 'Сбросить камеру',
  },
  randomElement: {
    fa: 'عنصر تصادفی',
    en: 'Random element',
    zh: '随机元素',
    ru: 'Случайный элемент',
  },
  cinemaView: {
    fa: 'نمای سینمایی',
    en: 'Cinema view',
    zh: '影院视图',
    ru: 'Кинематографический вид',
  },
  zoomIn: {
    fa: 'بزرگ‌نمایی',
    en: 'Zoom in',
    zh: '放大',
    ru: 'Увеличить',
  },
  zoomOut: {
    fa: 'کوچک‌نمایی',
    en: 'Zoom out',
    zh: '缩小',
    ru: 'Уменьшить',
  },
  nextLayout: {
    fa: 'چیدمان بعدی',
    en: 'Next layout',
    zh: '下一个布局',
    ru: 'Следующий макет',
  },
  autoTour: {
    fa: 'تور خودکار عناصر',
    en: 'Auto tour',
    zh: '自动导览',
    ru: 'Автотур',
  },
  compareMode: {
    fa: 'حالت مقایسه',
    en: 'Compare mode',
    zh: '对比模式',
    ru: 'Режим сравнения',
  },
  quizMode: {
    fa: 'حالت آزمون',
    en: 'Quiz mode',
    zh: '测验模式',
    ru: 'Режим викторины',
  },
  legend: {
    fa: 'راهنمای رنگ‌ها',
    en: 'Legend',
    zh: '图例',
    ru: 'Легенда',
  },
  sound: {
    fa: 'صدا',
    en: 'Sound',
    zh: '声音',
    ru: 'Звук',
  },
  screenshot: {
    fa: 'عکس از صحنه',
    en: 'Screenshot',
    zh: '截图',
    ru: 'Скриншот',
  },
  help: {
    fa: 'راهنمای استفاده',
    en: 'User guide',
    zh: '使用指南',
    ru: 'Руководство',
  },
  fullscreen: {
    fa: 'تمام‌صفحه',
    en: 'Fullscreen',
    zh: '全屏',
    ru: 'Полный экран',
  },

  // Compare modal
  compareElements: {
    fa: 'مقایسه عناصر',
    en: 'Compare elements',
    zh: '对比元素',
    ru: 'Сравнение элементов',
  },
  compare: {
    fa: 'مقایسه کن',
    en: 'Compare',
    zh: '对比',
    ru: 'Сравнить',
  },
  clear: {
    fa: 'پاک کردن',
    en: 'Clear',
    zh: '清除',
    ru: 'Очистить',
  },
  empty: {
    fa: 'خالی',
    en: 'Empty',
    zh: '空',
    ru: 'Пусто',
  },
  fact: {
    fa: 'دانستنی',
    en: 'Fact',
    zh: '趣闻',
    ru: 'Факт',
  },

  // Quiz
  quiz: {
    fa: 'آزمون',
    en: 'Quiz',
    zh: '测验',
    ru: 'Викторина',
  },
  score: {
    fa: 'امتیاز',
    en: 'Score',
    zh: '分数',
    ru: 'Счёт',
  },
  streak: {
    fa: 'پاسخ‌های پیاپی',
    en: 'Streak',
    zh: '连续',
    ru: 'Серия',
  },
  timeLeft: {
    fa: 'زمان باقی‌مانده',
    en: 'Time left',
    zh: '剩余时间',
    ru: 'Осталось времени',
  },
  skip: {
    fa: 'رد کردن',
    en: 'Skip',
    zh: '跳过',
    ru: 'Пропустить',
  },
  exit: {
    fa: 'پایان',
    en: 'Exit',
    zh: '退出',
    ru: 'Выход',
  },

  // Toast messages
  linkCopied: {
    fa: 'لینک این عنصر کپی شد',
    en: 'Element link copied',
    zh: '元素链接已复制',
    ru: 'Ссылка на элемент скопирована',
  },
  soundOn: {
    fa: 'صدا روشن شد',
    en: 'Sound enabled',
    zh: '声音已开启',
    ru: 'Звук включён',
  },
  soundOff: {
    fa: 'صدا خاموش شد',
    en: 'Sound disabled',
    zh: '声音已关闭',
    ru: 'Звук выключен',
  },
  screenshotSaved: {
    fa: 'تصویر ذخیره شد',
    en: 'Screenshot saved',
    zh: '截图已保存',
    ru: 'Скриншот сохранён',
  },

  // Help modal
  helpTitle: {
    fa: 'راهنمای استفاده',
    en: 'User Guide',
    zh: '使用指南',
    ru: 'Руководство пользователя',
  },
};

class I18n {
  constructor() {
    this.currentLang = localStorage.getItem(STORAGE_KEY) || 'fa';
    this.listeners = [];
  }

  setLanguage(code) {
    if (!LANGUAGES.find((l) => l.code === code)) return;
    this.currentLang = code;
    localStorage.setItem(STORAGE_KEY, code);
    this._updateDOM();
    this._notifyListeners();
  }

  t(key, vars = {}) {
    const translation = TRANSLATIONS[key];
    if (!translation) return key;
    let text = translation[this.currentLang] || translation.fa || key;

    // Replace variables like {count}
    Object.keys(vars).forEach((k) => {
      text = text.replace(`{${k}}`, vars[k]);
    });

    return text;
  }

  get lang() {
    return this.currentLang;
  }

  get langData() {
    return LANGUAGES.find((l) => l.code === this.currentLang) || LANGUAGES[0];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  _notifyListeners() {
    this.listeners.forEach((cb) => cb(this.currentLang));
  }

  _updateDOM() {
    const data = this.langData;
    document.documentElement.lang = data.code;
    document.documentElement.dir = data.dir;
    document.body.style.fontFamily = data.code === 'fa'
      ? 'Vazirmatn, "Segoe UI", system-ui, -apple-system, sans-serif'
      : 'system-ui, -apple-system, sans-serif';
  }
}

export const i18n = new I18n();
