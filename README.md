# 3D Periodic Table | Interactive WebGL Chemistry Visualization

[![Three.js](https://img.shields.io/badge/Three.js-r128-06b6d4)](https://threejs.org/) [![JavaScript](https://img.shields.io/badge/JavaScript-ES2020-8b5cf6)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) [![No Build](https://img.shields.io/badge/Build-None-ec4899)](https://github.com/Fitroja/periodic-table) [![Elements](https://img.shields.io/badge/Elements-118-eab308)](https://iupac.org/) [![Languages](https://img.shields.io/badge/Languages-4-10b981)](https://github.com/Fitroja/periodic-table)

An interactive 3D periodic table featuring all **118 chemical elements** with complete scientific data, built with **vanilla JavaScript + Three.js**. No frameworks, no build tools, no backend — 100% static and deployable anywhere.

**Live Demo:** https://jdwl-mndlyf.vercel.app/

![Periodic Table 3D Screenshot](https://img.shields.io/badge/WebGL-Powered-blue?style=for-the-badge&logo=webgl)

---

## ✨ Features

### 🎮 Interactive 3D Scene
- **7 Spatial Layouts**: Classic table, wide form, block separation, Archimedean spiral, cylindrical helix, Fibonacci sphere, and relief map
- **Full Camera Control**: Rotate, zoom, pan with mouse/touch using OrbitControls
- **900 Floating Particles** in background (500 on mobile) with radial gradient texture
- **3 Moving Neon Point Lights** (cyan, purple, pink) reflecting on semi-reflective floor
- **Smooth Animations**: Independent floating motion for each card with unique phase
- **Post-Processing**: Unreal Bloom Pass for authentic neon glow + FXAA anti-aliasing

### 💎 Liquid Glass Design
- Deep black background `#050508` with CSS vignette and radial color halos
- Glass cards with Canvas-rendered textures: gradient body, top sheen, neon category halo, outer neon border
- All UI panels with `backdrop-filter: blur(26px) saturate(165%)` and gradient borders
- Neon color palette by category (10 unique colors for element groups)

### 🔍 Rich Interactions
- **Hover**: Card scales and moves forward in Z-axis with intensified glow + smart tooltip
- **Click**: Sliding glass panel with complete element data + **animated Bohr model** on Canvas showing electrons orbiting in K…Q shells
- **Real-time Search**: Instant filtering by name (English/Persian/Chinese/Russian), symbol, or atomic number
- **Category Filters**: Multi-select with smooth opacity and scale transitions
- **Data Heatmaps**: Color all 118 cards by any numeric property (atomic mass, radius, electronegativity, ionization energy, melting/boiling point, density, abundance, discovery year)
- **Comparison Mode**: Select up to 3 elements and view side-by-side property comparison with bars
- **Quiz Mode**: Timed chemistry quiz with 6 question types, score tracking, and streak counter
- **Auto Tour**: Automatic element showcase cycling through all 118 elements

### 🌍 Multilingual Support
- **4 Languages**: Persian (default), English, Chinese (Simplified), Russian
- **RTL/LTR Support**: Automatic direction switching with proper typography
- **Complete Translation**: All UI elements, element names, properties, and help text
- **Language Switcher**: Elegant dropdown in top-right corner

### ⚡ Performance
- Single `requestAnimationFrame` loop with delta clamped to 50ms (no jumps after inactive tab)
- **One raycast per frame** — not per pointermove event
- Shared `PlaneGeometry` across all cards and shared halo texture (drastically reduces geometry count)
- Capped `pixelRatio` (2× on desktop, 1.75× on mobile) and antialiasing disabled on mobile
- Rendering stops completely when tab is hidden
- Live FPS counter in corner

### ♿ Accessibility & Robustness
- Complete RTL structure with `lang` and `dir` attributes, `aria-*` labels on all controls
- Keyboard shortcuts: `/` search · `Esc` close · `R` rotate · `0` reset · `+/-` zoom · `Tab` next layout · `Space` random · `Q` quiz · `C` compare · `F` fullscreen
- Respects `prefers-reduced-motion` and provides fallback for browsers without `backdrop-filter`
- WebGL detection with Persian error message on loader screen, `<noscript>` for disabled JavaScript
- Service Worker for offline functionality (PWA-ready)

---

## 📊 Complete Data for All 118 Elements

Each element includes:
- Atomic number, symbol, English/Persian/Chinese/Russian names
- Atomic mass (IUPAC standard values)
- Category, period, group, electron configuration
- Phase at room temperature (solid/liquid/gas)
- Melting point, boiling point (in Kelvin with Celsius conversion)
- Density, atomic radius, electronegativity, ionization energy
- Abundance in Earth's crust
- Discovery year and discoverer
- Fascinating fact about the element
- Calculated electron shells (K, L, M, N, O, P, Q)

Data sources: IUPAC (2021 atomic masses), NIST, CRC Handbook of Chemistry and Physics

---

## 🏗️ Architecture

### Project Structure
```
.
├── index.html              # HTML skeleton, UI, and CDN loading
├── css/
│   └── style.css           # Dark theme, Liquid Glass, responsive design
├── js/
│   ├── periodic-data.js    # Complete data for 118 elements + palette + grid mapping
│   ├── scene.js            # Three.js: cards, camera, lights, particles, raycast
│   ├── ui.js               # Search, filters, detail panel, Bohr diagram, controls
│   ├── layouts.js          # 7 3D spatial layout algorithms
│   ├── audio.js            # Web Audio synthesized sound effects
│   ├── i18n.js             # Internationalization system (4 languages)
│   └── main.js             # Bootstrap, dependency check, render loop
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service Worker for offline support
└── package.json            # Metadata and keywords
```

### Separation of Concerns

| File | Responsibility |
|---|---|
| `periodic-data.js` | Single source of truth for data. Compressed `RAW` array (15 fields per row) mapped to readable `ELEMENTS`. Helper functions: `getGridPosition`, `shellsFor`, `formatTemperature`, `normalizeFa`. |
| `scene.js` | `PeriodicScene` class. Scene, camera, lights, particles, 118 cards, raycast, camera animation, and `update(dt)` loop. Three external callbacks: `onHover`, `onSelect`, `onBackgroundClick`. |
| `ui.js` | `UI` class. All DOM interactions. Calls scene only through public API (`applyFilter`, `focusElement`, `select`, `zoomBy`, etc.). |
| `layouts.js` | Pure functions returning target states for each element: `{ x, y, z, rx, ry, rz, scale }`. Scene interpolates smoothly. |
| `i18n.js` | Translation dictionary and language switching logic. Automatically updates `<html lang>` and `dir`. |
| `main.js` | Glue code. Checks WebGL and CDN availability, waits for fonts, instantiates scene and UI, runs `requestAnimationFrame` loop with FPS counter. |

**Architectural note:** `scene.js` has zero references to application DOM and `ui.js` has zero references to `THREE`. Communication happens only through callbacks and public methods.

---

## 🚀 Local Development

The project has **no build step**, but since it uses **ES Modules**, it must be served over HTTP (direct `file://` opening causes CORS errors).

Any of these commands work:

```bash
npx serve .
```

```bash
python -m http.server 4173
```

```bash
php -S localhost:4173
```

Then open `http://localhost:4173` in your browser.

> VS Code **Live Server** extension also works without any configuration.

---

## 🌐 CDN Dependencies

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
```

Three.js version is locked to **r128**. `OrbitControls` in this version is a classic script that sets `THREE.OrbitControls` on the global object, so the order of these two tags matters.

Fonts: **Vazirmatn** (Persian text) and **Orbitron** (numbers and symbols) from Google Fonts.

### Fully Offline Operation (Optional)

To run without internet:

1. Download `three.min.js` and `OrbitControls.js` and place in `vendor/` folder
2. Change `src` of both script tags in `index.html` to `vendor/three.min.js` and `vendor/OrbitControls.js`
3. Either localize fonts or remove Google Fonts `<link>` tag (system fallback fonts will be used)

---

## ▲ Deploy to Vercel

The project is 100% static with no build step required.

### Via Vercel Dashboard

1. Push this repository to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Set **Framework Preset** to `Other`
5. Leave **Build Command** empty
6. Set **Output Directory** to `.`
7. Deploy

### Via Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. Vercel will auto-detect it's a static site.

The `vercel.json` file includes proper caching headers and security headers.

---

## 🎯 Use Cases

### Education
- **Chemistry Students**: Interactive exploration of element properties and periodic trends
- **Teachers**: Classroom demonstrations with projector-friendly fullscreen mode
- **Self-Study**: Quiz mode for memorizing elements, categories, and properties

### Research & Reference
- Quick lookup of element properties with data heatmap visualization
- Comparison tool for analyzing differences between elements
- Pattern recognition through 7 different spatial arrangements

### Web Development Learning
- **WebGL/Three.js**: Study 3D scene management, camera controls, raycasting, post-processing
- **Vanilla JavaScript**: See how to build complex apps without frameworks
- **Canvas API**: Learn texture generation and Bohr diagram animation
- **Progressive Enhancement**: Understand service workers, offline support, and PWA patterns
- **Internationalization**: Implement multi-language support with RTL handling

---

## 🎨 Customization

### Change Color Palette
Edit the category colors in `css/style.css`:
```css
:root {
  --c-alkali: #ff3366;
  --c-transition: #3399ff;
  /* ... etc */
}
```

### Add New Layout
1. Create a layout function in `js/layouts.js` that returns an array of `{ x, y, z, rx, ry, rz, scale }` objects
2. Add entry to `LAYOUTS` array with `key`, `fa` (Persian name), `en` (English name), `hint`
3. Add corresponding icon in `LAYOUT_ICONS` object in `js/ui.js`

### Add More Languages
1. Add language to `LANGUAGES` array in `js/i18n.js`
2. Add translations to `TRANSLATIONS` object
3. Add element names to `RAW` array in `js/periodic-data.js`

---

## 🎮 Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Focus search input |
| `Esc` | Close panel / exit mode |
| `Space` | Random element |
| `Tab` | Next layout |
| `1-7` | Jump to specific layout |
| `R` | Toggle auto-rotate |
| `0` | Reset camera |
| `+` / `-` | Zoom in / out |
| `C` | Compare mode |
| `Q` | Quiz mode |
| `P` | Auto tour |
| `L` | Toggle legend |
| `F` | Fullscreen |
| `?` | Help modal |
| `S` | Screenshot |
| `←` `→` | Previous/next element (when panel open) |

---

## 🌍 Browser Support

| Browser | Minimum Version | Status |
|---|---|---|
| Chrome / Edge | 88+ | Full support |
| Firefox | 103+ | Full support |
| Safari (macOS/iOS) | 15.4+ | Full support |
| Chrome Android | 88+ | Full support (500 particles) |

Technical requirements: WebGL, ES Modules, `backdrop-filter`, and `color-mix()`. Fallback provided for missing `backdrop-filter`.

---

## 🤝 Contributing

Contributions welcome! Areas where help is needed:

- **Data accuracy**: Verify element properties against authoritative sources
- **Translations**: Improve existing translations or add new languages
- **Accessibility**: Test with screen readers and keyboard-only navigation
- **Performance**: Optimize for lower-end devices
- **Documentation**: Expand inline code comments and architectural guides

---

## 📄 License

MIT License - Free to use for educational and commercial purposes.

### Data Sources
- Atomic masses: IUPAC (2021 standard atomic weights)
- Properties: NIST Atomic Spectra Database
- General data: CRC Handbook of Chemistry and Physics (103rd Edition)

---

## 🙏 Acknowledgments

- Built with [Three.js](https://threejs.org/) r128
- Fonts: [Vazirmatn](https://github.com/rastikerdar/vazirmatn) by Saber Rastikerdar, [Orbitron](https://fonts.google.com/specimen/Orbitron) by Matt McInerney
- Inspired by the elegance of Dmitri Mendeleev's original periodic table

---

## 📬 Contact

**Author**: Amir Abbas  
**Email**: amirabbas91a@gmail.com  
**GitHub**: [Fitroja/periodic-table](https://github.com/Fitroja/periodic-table)

For bug reports and feature requests, please [open an issue](https://github.com/Fitroja/periodic-table/issues).

---

<p align="center">Made with ❤️ for chemistry education worldwide</p>
