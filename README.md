English | [日本語](README.ja.md) | [中文](README.zh.md)

# Oikomi-kun (追い込みくん)

A HIIT (High-Intensity Interval Training) timer app that runs entirely in the browser. Open it once and it works fully offline, with no network connection required.

**👉 Use it: https://shuniku.github.io/oikomikun/**

## Features

- Automatically cycles through **Prepare → Work → Rest** phases for a configured number of sets
- One-tap presets (My Set, Tabata 20/10×8, Standard HIIT 30/15×10, Sprint 45/15×6)
- "My Set" is a personal preset you can overwrite at any time with your current settings
- Freely configurable duration and set count for each phase, auto-saved and restored on next launch
- Synthesized beep sounds (via Web Audio API, toggleable) on phase transitions and during the final 3-second countdown
- Keeps the screen awake while the timer is running (on browsers that support the Wake Lock API)
- Large remaining-time display visible from across the gym, with a background color per phase (Prepare = blue / Work = red / Rest = green)
- Time-based calculation so the remaining time stays accurate even if the tab is throttled in the background
- Single-column layout on smartphones, dedicated layouts for PC and landscape tablets
- Switchable UI language — Japanese / English / Chinese (auto-detected from the browser on first visit)
- PWA support — add it to your home screen to launch it like a native app, even offline

## Usage

Just open the URL above. On a smartphone, add it to your home screen to use it like a native app.

To use it offline, clone the repository and open `index.html` directly in a browser — it works the same way, with no build step and no external resources.

```bash
git clone https://github.com/shuniku/oikomikun.git
open oikomikun/index.html
```

## Development

Vanilla JS with no framework, build tool, or external dependencies. See [SPEC.md](SPEC.md) for the full specification (in Japanese).

```
├── index.html              # Entry point
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker
├── css/style.css           # Styles
├── js/timer.js             # Timer logic (pure functions only, DOM-free, language-agnostic)
├── js/i18n.js              # Localization (ja / en / zh message dictionaries)
├── js/app.js               # UI control, audio, Wake Lock, localStorage, language switching
├── test/timer.test.js      # Unit tests for timer logic
├── test/i18n.test.js       # Unit tests for the localization dictionaries
└── e2e/                    # Playwright E2E tests
```

### Testing

Unit tests run on Node.js's built-in test runner.

```bash
node --test
```

UI E2E tests run with Playwright (one-time setup required).

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Both run automatically in GitHub Actions on every push.

### Deployment

Pushing to the `main` branch automatically deploys to GitHub Pages (served from the repository root).

## License

[MIT License](LICENSE)
