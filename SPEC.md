English | [日本語](SPEC.ja.md) | [中文](SPEC.zh.md)

# HIIT Timer Specification

> The Japanese version ([SPEC.ja.md](SPEC.ja.md)) is the source of truth; the English and Chinese versions are translations of it. Keep all three in sync whenever the specification changes.

## 1. Overview

App name: **追い込みくん (Oikomi-kun)**

A timer application for strength training (HIIT: High-Intensity Interval Training).
It runs in the browser, and once the page has been opened it works entirely without a network connection.

## 2. Requirements

### 2.1 Functional requirements

| ID | Requirement |
|----|-------------|
| F-01 | Automatically transitions through the Prepare → Work → Rest phases |
| F-02 | Repeats Work + Rest for the configured number of sets (the rest of the final set is skipped) |
| F-03 | The user can freely configure the duration of each phase and the set count |
| F-04 | Presets (Tabata 20s/10s×8, etc.) can be applied with a single tap |
| F-05 | Start / pause / resume / reset |
| F-06 | Displays the remaining time, current phase, current set, and overall progress |
| F-07 | Plays sounds on phase transitions and for the countdown from 3 seconds remaining |
| F-08 | Saves the settings to localStorage and restores them on the next launch |
| F-09 | Keeps the screen from sleeping while the timer runs (Wake Lock API, supported browsers only) |
| F-10 | Sound can be toggled on/off |
| F-11 | The UI language can be switched between 日本語 / English / 中文. On first visit it is auto-detected from the browser language (unsupported languages fall back to English), and the choice is saved and restored |
| F-12 | The "My Set" preset can be overwritten with the current input values. The saved values are kept in localStorage and restored on the next launch. Invalid input is not saved and shows an error |
| F-13 | Can switch to fullscreen (Fullscreen API, supported browsers only). It can be entered and exited from both the settings screen and the timer screen |

### 2.2 Non-functional requirements

| ID | Requirement |
|----|-------------|
| N-01 | **Fully offline**: holds no reference to any external resource (CDN, fonts, images). Works simply by opening `index.html` as a file |
| N-02 | Responsive UI that works on modern browsers (latest Chrome / Safari / Firefox / Edge) on smartphones, tablets, and PCs |
| N-03 | A remaining-time display large enough to read from across the gym, plus a background color that changes per phase |
| N-04 | Time-based calculation keeps the remaining time accurate even when the tab is throttled in the background (it does not rely on counting `setInterval` ticks) |
| N-05 | Sounds are synthesized with the Web Audio API instead of using external files |

### 2.3 Input constraints (validation)

| Item | Range | Default |
|------|-------|---------|
| Prepare time | 0–300 sec | 6 sec |
| Work time | 1–3600 sec | 20 sec |
| Rest time | 0–3600 sec | 10 sec |
| Sets | 1–99 | 8 |

Out-of-range or non-numeric input blocks the start and shows an error message.

## 3. Screen specification

A single-page structure with two states.

Both screens show a fixed fullscreen toggle button in the top-right corner (hidden on browsers that do not support the Fullscreen API). To avoid hurting visibility in the gym it is an icon-only button of modest size, and it does not scale with the window size.

The layout differs by device:

- **Smartphones (and portrait orientation)**: a single-column layout (the base structure of §3.1 / §3.2)
- **PC and landscape tablets (width 768px or more and landscape)**: a dedicated layout
  - Settings screen: presets and numeric inputs are laid out in a single row of 4 columns
  - Timer screen: the remaining time is shown at maximum size on the left, with the phase name, set progress, and control buttons stacked in a right column. The progress bar spans the full width at the bottom
    - Visibility of the remaining time takes top priority, so the right column (i.e. the width of the pause and reset buttons) is kept modest

### 3.1 Settings screen (initial view)

- Language switch buttons (日本語 / English / 中文, always shown in each language's own script)
- The app name "追い込みくん" in a rounded, playful typeface and accent color (no subtitle; the typeface uses OS-standard fonts only. The app name is a brand designation shared by all languages and is not translated)
- Numeric inputs for prepare / work / rest / sets
- Preset buttons: My Set (240/180×6), Tabata (20/10×8), Standard HIIT (30/15×10), Norwegian HIIT (240/180×4)
  - The prepare time is 6 seconds for every preset
  - My Set is shown first because it is the most frequently used preset
  - The user can overwrite the My Set values, and the button label follows the saved values (the 240/180×6 listed above is the default)
- A "Save current settings to My Set" button (a modest text button directly below the presets)
- A preview of the total duration
- A sound on/off toggle
- A "Start" button

### 3.2 Timer screen

- The remaining time (minutes:seconds) at maximum size in the center of the screen
  - On tablets and PCs (width 768px or more), text, buttons, and inputs scale with the window size (the smaller of width and height), and the remaining time is displayed especially large. No vertical scrolling occurs. Smartphones keep the existing sizes
- The current phase name (Prepare / Work / Rest / Done)
- Set progress (e.g. `Set 3 / 8`)
- An overall progress bar
- Background color per phase: Prepare = blue, Work = red, Rest = green, Done = navy
- Pause/resume button and a reset (back to settings) button

## 4. Technical specification

### 4.1 Structure

Vanilla JS with no build tool, framework, or external dependency.
Because ES Modules are blocked by CORS when opened via `file://`, scripts are loaded with plain `<script>` tags,
and the logic is exported in UMD format so it can also be tested from Node.js.

```
/
├── SPEC.md              # This specification (English)
├── SPEC.ja.md           # Specification (Japanese, source of truth)
├── SPEC.zh.md           # Specification (Chinese)
├── README.md            # Overview for users and developers (English)
├── README.ja.md         # Same (Japanese)
├── README.zh.md         # Same (Chinese)
├── index.html           # Entry point
├── manifest.webmanifest # PWA manifest
├── sw.js                # Service worker (offline support for the published page)
├── css/style.css        # Styles
├── image/favicon.svg    # Favicon (SVG)
├── image/apple-touch-icon.png  # Icon for adding to the home screen (180×180)
├── image/icon-192.png   # PWA icon
├── image/icon-512.png   # PWA icon
├── js/timer.js          # Timer logic (pure functions only, DOM-free, language-agnostic)
├── js/i18n.js           # UI message dictionaries (ja/en/zh) and formatting helpers
├── js/app.js            # UI control, audio, Wake Lock, localStorage, SW registration, language switching
├── test/timer.test.js   # Unit tests for the logic (node --test)
├── test/i18n.test.js    # Consistency tests for the dictionaries (matching key structures across languages, etc.)
└── e2e/*.spec.mjs       # E2E tests for the UI (Playwright)
```

### 4.2 Timer logic (js/timer.js)

Everything is a pure function and immutable. State changes always return a new object.

- `validateConfig(config)` — validates the settings and returns `{ isValid, errors }`. `errors` is language-agnostic structured data `[{ field, min, max }]`; converting it into message text is the job of the presentation layer (app.js + i18n.js)
- `buildSchedule(config)` — generates the phase array from the settings
  - e.g. `[{type:'prepare', durationMs}, {type:'work', set:1, ...}, {type:'rest', set:1, ...}, ... {type:'work', set:N, ...}]`
  - When the prepare time is 0, the prepare phase is not included. No rest is appended after the final set
- `createInitialState(schedule)` — returns the initial state `{ phaseIndex, phaseRemainingMs, isFinished }`
- `advance(schedule, state, deltaMs)` — returns a new state with the elapsed time applied. Surplus time that crosses a phase boundary is carried over into the next phase
- `totalDurationMs(schedule)` / `elapsedMs(schedule, state)` — for the progress bar
- `PRESETS` — preset definitions (id and config only; display names are resolved from the id on the i18n side)

### 4.2.1 Localization (js/i18n.js)

- Supported languages: Japanese (ja) / English (en) / Chinese (zh, simplified)
- All UI text lives in the `MESSAGES` dictionary in `js/i18n.js` and is never hard-coded in app.js
- Placeholders use the `{name}` form and are substituted by `format()`
- The language choice is included in the settings saved to localStorage. On first visit it is determined from `navigator.language` (ja→ja, zh→zh, anything else→en)
- Switching also updates the `lang` attribute of `html` and `document.title`
- The app name "追い込みくん" is not translated (brand designation)

### 4.3 Time management (js/app.js)

The elapsed time is computed from the difference of `performance.now()`, and the display is updated by `setInterval` (100ms). Because the remaining time is derived from real time rather than a tick count, the timer catches up to the correct remaining time when it returns from being throttled in the background (N-04).

### 4.4 Audio

Beeps are synthesized with the Web Audio API's `OscillatorNode`.

| Event | Sound |
|-------|-------|
| 3 / 2 / 1 seconds remaining | A short, lower beep (880Hz, 100ms) |
| Start of a work phase | A high, longer beep (1320Hz, 1000ms) |
| Start of a rest/prepare phase | A mid, longer beep (660Hz, 1000ms) |
| Whole menu complete | Three consecutive beeps |

The `AudioContext` is created from a user gesture (the start button) to work around autoplay restrictions.

### 4.5 Fullscreen

The Fullscreen API (`documentElement.requestFullscreen()` / `document.exitFullscreen()`) puts the `html` element into fullscreen. Browsers that only offer vendor-prefixed versions (`webkitRequestFullscreen`, etc.) are supported as well.

- Toggling is triggered by a user gesture (a browser restriction)
- When the API is unsupported (Safari on iPhone, etc.) the button itself is hidden. Launching the PWA from the home screen gives a standalone display, so an alternative to the feature is still available
- `fullscreenchange` is observed so that the button's icon and label follow along even when fullscreen is exited via Esc or the browser UI
- Failures to toggle are swallowed and the app keeps running in the normal view (the timer functionality is unaffected)
- The fullscreen state is not saved (the next launch starts in the normal view)

## 5. Testing

- Unit tests: every pure function in `js/timer.js` (run with `node --test`)
- E2E tests: screen transitions, phase transitions, input validation, settings restoration, and so on (Playwright, run with `npm run test:e2e`)
- Both run automatically in GitHub Actions on push
- Sound, Wake Lock, and the display on real smartphones are verified manually in a browser

## 6. Distribution

Published on GitHub Pages.

- Because there is no build step, the repository root of the `main` branch is served as-is
- N-01 (fully offline) is maintained after publishing. Both opening it via `file://` and using it through GitHub Pages are supported
- A project site is served under `https://<username>.github.io/<repository>/`, so asset references use relative paths
- Provided as a PWA: the manifest allows installing it to the home screen with a standalone display, and the service worker (network first, cache fallback) makes it start fully offline from the second visit onward even via the published page
