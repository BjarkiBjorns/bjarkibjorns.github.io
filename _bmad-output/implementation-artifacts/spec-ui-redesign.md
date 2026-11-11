---
title: 'lissa UI Redesign'
type: 'feature'
created: '2026-06-02'
status: 'done'
context: ['_bmad-output/planning-artifacts/ux-design.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** lissa's UI is a dark left-side opaque panel that visually competes with the canvas — controls are foreground, not margin. Typography, motion, and material quality are absent.

**Approach:** Replace the entire UI chrome with the editorial glass design from the UX spec: frosted right-side floating panel with three states (hidden / collapsed / expanded), pill sliders, hero Random button, welcome screen overlay, and a persistent toggle button — all vanilla HTML/CSS/JS, no new JS dependencies beyond Google Fonts CDN.

## Boundaries & Constraints

**Always:**
- Preserve all existing element IDs — sketch.js binds to them directly (`tempoSlider`, `randomizeBtn`, `lineColor`, etc.)
- Vanilla HTML/CSS/JS only — no libraries, no build step
- All UI chrome in HTML/CSS above the canvas — nothing drawn on the p5.js canvas
- All spacing in multiples of 4px
- CSS custom properties for the full color system as specified in UX §2
- The UX design spec is the visual authority — follow it exactly for colors, sizes, type, and motion

**Ask First:**
- If LFO sub-rows need structural changes beyond restyling (e.g. moved to a modal)
- If any existing sketch.js event listener must be removed rather than adapted

**Never:**
- Add ES modules, `import`/`export`, or any bundler
- Remove existing slider, LFO, or section body element IDs
- Add `'use strict'` to sketch.js
- Draw UI elements on the p5.js canvas

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Page load | Fresh open | Welcome overlay appears over running canvas; after 3.5 s fades over 800 ms, then `display:none` | — |
| Toggle click — panel hidden | `#panel` has class `hidden` | Remove `hidden`, add `collapsed`; panel spring-slides in from right | — |
| Toggle click — panel visible | `#panel` lacks `hidden` | Add `hidden`, remove `collapsed`/`expanded`; panel slides out right | — |
| "more" click | Panel is `collapsed` | Remove `collapsed`, add `expanded`; scrollable content visible | — |
| "less" click | Panel is `expanded` | Remove `expanded`, add `collapsed`; scrollable content hidden | — |
| Slider drag | Any `.slider-pill` | `--pct` on pill container updates each `input` event; pill lifts on drag start, settles on release | — |
| Toggle button image | Developer has set `src` on `#panel-toggle-img` | Image displayed inside toggle button; if `src` missing or fails, ⊕ icon shown via `onerror` | Show ⊕ fallback |
| H key | Any panel state | Simulate toggle button click | — |
| No `backdrop-filter` | Older browser | Glass panels fall back to `background: rgba(244,244,244,0.92)` | — |

</frozen-after-approval>

## Code Map

- `index.html` — full UI skeleton; all control element IDs live here; full restructure required
- `style.css` — all UI chrome styles; full replacement
- `sketch.js` — panel toggle logic, welcome screen, `--pct` updates, Random button full randomization; H key; remove resize-handle wiring

## Tasks & Acceptance

**Execution:**
- [x] `index.html` -- Restructure DOM: (1) Add Google Fonts CDN link (`Roboto:wght@100;300;400`). (2) Add `#welcome-screen` div with `.welcome-content` child (title + subtitle text). (3) Add `#panel-toggle` div containing `#panel-toggle-img` (`<img src="toggle-icon.webp" onerror="...">` — developer sets this path; fallback to `#panel-toggle-icon` ⊕ span via onerror). No file input. (4) Replace `#controls` with `#panel` containing `#panel-fixed` (non-scrolling: Random button, Big Four sliders, `#panel-more` affordance) and `#panel-scroll` (scrollable: utility row with mode switcher + export/preset/settings actions, then sections Shape → Effects → Color → Image → Text → `#panel-less`). (5) Wrap every `<input type="range">` in a `.slider-pill` div that also contains `.slider-fill`, a `.slider-label` label, `.slider-value` span, and `.slider-thumb` span. (6) Wrap color pickers in `.color-pill` with `.color-swatch` span. (7) Replace glow enable checkbox with `.toggle-switch` markup. (8) Curve-type select replaced with `.chip-row` of buttons. (9) Remove `#resize-handle`. All existing IDs must survive the restructure.
- [x] `style.css` -- Full replacement: (a) CSS custom properties (all tokens from UX §2). (b) Glass material mixin applied to `#panel` and `#welcome-screen` — `backdrop-filter: blur(24px) saturate(180%)`, `::before` refraction gradient, box-shadow per UX §4; `@supports` fallback for non-backdrop-filter browsers. (c) `#welcome-screen`: `position:fixed; inset:0; z-index:20000`; typography per UX §5; `transition: opacity 0.8s cubic-bezier(0.4,0,0.2,1)`. (d) `#panel-toggle`: `position:fixed; bottom:24px; right:24px; width:56px; height:56px; border-radius:16px`; glass material; hover shows `.panel-toggle-change`; image fitted inside. (e) `#panel`: `position:fixed; right:16px; top:16px; bottom:16px; width:300px; border-radius:20px; z-index:10000`; glass material; `transform: translateX(calc(100% + 24px))` when `.hidden`; transition per UX §10. (f) `#panel-scroll`: `overflow-y:auto; max-height:calc(100vh - 32px)`; hidden when panel is `.collapsed`; thin scrollbar `3px rgba(17,17,17,0.15)`. (g) `.slider-pill`: height 44px; border-radius 22px; pill background; `overflow:hidden`; `position:relative`; lift transition on `.dragging`. `.slider-fill`: absolute left-fill using `width:var(--pct,0%)`; background rgba(17,17,17,0.07). `.slider-thumb`: absolute 2px×20px line at `left:calc(var(--pct,0%) - 1px)`; brightens on `.dragging`. `input[type="range"]` inside pill: absolute inset, opacity 0, z-index 3. (h) `#randomizeBtn`: pill shape 52px height; gradient `135deg` pink→blue→teal per UX §9.1; `@keyframes hue-rotate` 8 s infinite; glow box-shadow; hover scale 1.01; active scale 0.98. (i) Section headers: 10px, Roboto Thin, uppercase, 0.15em tracking, `rgba(17,17,17,0.4)`, preceded by 1px `rgba(17,17,17,0.08)` rule. (j) `#panel-more`, `#panel-less`: centered 11px Roboto Thin uppercase; no background; hover opacity. (k) `.toggle-switch`: 28×16px pill track; animated thumb. (l) `.chip-row`: inline pill chips; active chip filled. (m) `.color-pill`: 44px pill with `.color-swatch` 20px circle right. (n) LFO rows: retain `.lfo-row`/`.lfo-params`; restyle as indented sub-rows, opacity 0.55, Roboto Light 11px.
- [x] `sketch.js` -- (a) Replace H-key handler body with `document.getElementById('panel-toggle').click()`. (b) Add `#panel-toggle` click handler: if `#panel` has class `hidden`, remove `hidden` and add `collapsed`; else add `hidden` and remove `collapsed` and `expanded`. (c) Add `#panel-more` click: swap `collapsed` → `expanded` on `#panel`. Add `#panel-less` click: swap `expanded` → `collapsed`. (d) On DOMContentLoaded after all sliders are wired: for each `.slider-pill`, read its child `input[type="range"]`, compute `pct = (val−min)/(max−min)*100`, set `--pct` on the pill; bind `input` event to update `--pct` and add `.dragging` to pill; bind `mouseup`/`touchend` to remove `.dragging`. (e) Welcome screen: `setTimeout(() => { ws.style.opacity = '0'; setTimeout(() => ws.style.display='none', 820); }, 3500)` where `ws = document.getElementById('welcome-screen')`. (f) Update `#randomizeBtn` click handler to call both `randomizeParams()` and `randomizeColors()` (currently only calls `randomizeParams`). (g) Remove resize-handle `mousedown`/`mousemove`/`mouseup` listeners and the `handle.style.left` update. (h) Set `#panel` initial class to `hidden` (panel starts offscreen). No toggle image JS needed — image is static HTML, `onerror` handles fallback in markup.

**Acceptance Criteria:**
- Given a fresh page load, when the page opens, then the welcome screen overlays the canvas, the canvas is already running behind it, and it auto-dismisses after ~4 s with an 800 ms fade
- Given the panel is hidden, when toggle button is clicked, then the panel slides in from the right showing Random button, Big Four sliders, and "more"
- Given the panel is collapsed, when "more" is clicked, then the panel expands to full height and scrollable sections are accessible
- Given any `.slider-pill` slider is dragged, when the `input` event fires, then `--pct` on the pill updates so the fill sweep and thumb position match the value
- Given the panel is in any state, when H key is pressed, then the panel behavior is identical to clicking the toggle button
- Given the developer has set `src="toggle-icon.webp"` on `#panel-toggle-img`, when the page loads and the image resolves, then the image fills the toggle button; if the path is missing or broken, then the ⊕ icon shows instead
- Given a browser without `backdrop-filter` support, when the panel renders, then it has a fully opaque fallback background and remains usable
- Given all existing sliders and LFO checkboxes, when interacted with, then sketch.js behavior is unchanged (values update, canvas reacts)

## Design Notes

**Pill slider layering:** Native `<input type="range">` is `position:absolute; inset:0; opacity:0; z-index:3` so it captures pointer events while being invisible. `.slider-fill` and `.slider-thumb` render below it (z-index 1–2) and are positioned using `--pct`. Pill has `overflow:hidden`.

**Panel states:** `#panel` carries exactly one of three classes at a time: `hidden`, `collapsed`, `expanded`. CSS transitions on `transform`, `max-height`, and `opacity` handle all three state changes. `#panel-scroll` is `display:none` when panel is `collapsed` or `hidden`, `display:flex` when `expanded`.

**Sections not in UX spec:** Mode switcher and export/preset/settings actions go in a compact utility row at the top of `#panel-scroll` before the Shape section header — no prominent styling, just functional. `#panel-fixed` contains only: Random button, Big Four sliders, "more".

**LFO rows:** Keep all `.lfo-row` / `.lfo-params` markup; only restyle. No structural change.

## Verification

**Manual checks:**
- Open `index.html` in browser: canvas runs immediately, welcome screen overlays it, auto-dismisses after ~4 s
- Click toggle button: panel slides in/out; "more" / "less" expand/collapse
- Drag any slider: fill sweep and thumb follow pointer in real time; p5 canvas responds
- Press H: panel toggles
- Random button: triggers both color and param randomization (canvas changes both colorway and curve shape)
- Toggle button with `src` set: image fills button; with `src` missing: ⊕ shows
- All LFO toggles and sliders still control the canvas
- No resize handle visible; panel is fixed-width 300 px

## Suggested Review Order

Start here to verify the implementation concern-by-concern:

**1. Panel state machine & toggle**
- [sketch.js — panel-toggle click handler](sketch.js#L1)  *(search: `panel-toggle`)*
- [style.css — `#panel` base + `.hidden` / `.expanded` rules](style.css#L1)  *(search: `#panel.hidden`, `#panel.expanded`)*
- [index.html — `#panel` class="hidden" start state](index.html#L1)  *(search: `id="panel"`)*

**2. Pill slider: fill, thumb, `--pct` wiring**
- [index.html — slider pill markup (tempo example)](index.html#L1)  *(search: `slider-pill`)*
- [style.css — `.slider-pill`, `.slider-fill`, `.slider-thumb`](style.css#L1)  *(search: `.slider-pill`)*
- [sketch.js — `--pct` init + input wiring loop](sketch.js#L1)  *(search: `slider-pill`)*
- [sketch.js — `restoreState` `--pct` sync](sketch.js#L1)  *(search: `--pct`)*

**3. Random button — colors + params**
- [sketch.js — randomizeBtn handler](sketch.js#L1)  *(search: `randomizeBtn`)*

**4. Welcome screen dismiss**
- [sketch.js — welcome screen timer](sketch.js#L1)  *(search: `welcome-screen`)*
- [style.css — `#welcome-screen` transition](style.css#L1)  *(search: `#welcome-screen`)*

**5. Toggle button image / fallback**
- [index.html — `#panel-toggle-img` onerror](index.html#L1)  *(search: `panel-toggle-img`)*

**6. curveShape chip ↔ hidden select sync**
- [index.html — `.chip-row` + hidden `<select id="curveShape">`](index.html#L1)  *(search: `curveShapeChips`)*
- [sketch.js — chip click handlers](sketch.js#L1)  *(search: `chip`)*
- [sketch.js — restoreState chip sync](sketch.js#L1)  *(search: `curveShape`)*

**7. Color swatch sync**
- [index.html — `.color-swatch` spans](index.html#L1)  *(search: `color-swatch`)*
- [sketch.js — swatch input listeners + restoreState swatch sync](sketch.js#L1)  *(search: `Swatch`)*

**8. Glass material + `@supports` fallback**
- [style.css — `backdrop-filter` blocks + `@supports not` fallback](style.css#L1)  *(search: `@supports`)*
