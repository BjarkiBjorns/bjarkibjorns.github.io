# lissa — UX Design Specification
**Version:** 1.0  
**Date:** 2026-06-02  
**Status:** Final for desktop implementation

---

## 1. Design Language

lissa's interface is a **living editorial poster**. The artwork is the content — the UI is the margin. Every design decision serves this principle: controls exist quietly at the edge, never competing with what the canvas is doing.

**Guiding words:** light · clean · editorial · sharp · breathing room · poster-like

**Reference aesthetic:** Contemporary graphic design posters — extreme white space, sparse typography placed at edges and corners, soft luminous organic forms with grain texture. The UI feels like the credits on a film, not the film itself.

---

## 2. Color System

All colors in the UI chrome use this palette. Never use pure black or pure white.

| Token | Value | Usage |
|---|---|---|
| `--black` | `#111111` | Text, borders, dark elements |
| `--white` | `#f4f4f4` | Backgrounds, light elements, base glass |
| `--glass-bg` | `rgba(244, 244, 244, 0.55)` | Frosted glass panel and welcome screen base |
| `--glass-border` | `rgba(255, 255, 255, 0.6)` | Glass edge highlight |
| `--glass-inner` | `rgba(255, 255, 255, 0.25)` | Inner refraction layer |
| `--text-primary` | `#111111` | Labels, section headers |
| `--text-muted` | `rgba(17, 17, 17, 0.45)` | Secondary labels, placeholders |
| `--fill-active` | `rgba(17, 17, 17, 0.08)` | Slider fill sweep |
| `--pill-bg` | `rgba(244, 244, 244, 0.7)` | Slider and button pill background |

---

## 3. Typography

**Primary font:** Roboto Thin (weight 100) — used for all labels, section headers, and descriptive text.  
**Secondary font:** Roboto Light (weight 300) — used for control values (numbers displayed alongside sliders).  
**Load via:** Google Fonts CDN (`Roboto:wght@100;300;400`).

**Type scale:**

| Role | Weight | Size | Tracking |
|---|---|---|---|
| Section header | 100 (Thin) | 10px | 0.15em uppercase |
| Slider label | 100 (Thin) | 13px | 0.02em |
| Slider value | 300 (Light) | 13px | 0.01em |
| Button label | 300 (Light) | 13px | 0.05em |
| Welcome text | 100 (Thin) | 22px | 0.08em |
| "more" / "less" | 100 (Thin) | 11px | 0.12em uppercase |

All text uses `#111111`. Muted text uses `rgba(17, 17, 17, 0.45)`.

---

## 4. Material System — Liquid Glass

The frosted glass material is used in two places: the **welcome screen overlay** and the **control panel**. They are the same material — one cohesive substance throughout the interface.

**Construction (CSS):**
```css
background: rgba(244, 244, 244, 0.55);
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.6);
border-radius: 20px;

/* Refraction layer — inner pseudo-element */
::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.35) 0%,
    rgba(255, 255, 255, 0.0) 50%,
    rgba(255, 255, 255, 0.15) 100%
  );
  pointer-events: none;
}
```

The refraction layer simulates the light-bending quality of liquid glass (as seen in Apple's visionOS material). It catches light from one corner and faintly echoes it at the opposite edge.

**Box shadow:**
```css
box-shadow:
  0 8px 32px rgba(17, 17, 17, 0.08),
  0 2px 8px rgba(17, 17, 17, 0.04),
  inset 0 1px 0 rgba(255, 255, 255, 0.8);
```

---

## 5. Welcome Screen

**Purpose:** Introduce lissa gracefully. Give the user a moment to absorb the living artwork before the controls appear.

**Behavior:**
- Renders on top of the full canvas immediately on page load
- The p5.js canvas is already running a randomized, colorful configuration behind it
- Displays for **3–5 seconds**, then fades out over **800ms** with `opacity: 0` transition
- Once faded, is removed from the DOM (`display: none` or `visibility: hidden`)
- Does not reappear on subsequent visits within the same session

**Visual spec:**
- Covers the full viewport (`position: fixed; inset: 0`)
- Uses the liquid glass material (see §4) but applied as a full-screen overlay with slightly lower opacity: `rgba(244, 244, 244, 0.45)`
- Center-aligned content, vertically and horizontally
- Text: `welcome to lissa.` — Roboto Thin, 22px, `#111111`, letter-spacing 0.08em
- Below the text, a subtle muted line: `a generative art tool.` — Roboto Thin, 13px, `rgba(17, 17, 17, 0.4)`, letter-spacing 0.05em
- No logo, no other elements

**Transition out:**
```css
transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 6. Canvas

- Fills `100vw × 100vh` at all times
- p5.js canvas is the only child of `#canvas-container`
- No persistent branding, watermarks, or UI elements drawn on the canvas itself
- All UI is HTML/CSS layered above the canvas via `position: fixed`

---

## 7. Toggle Button

**Purpose:** Completely show or hide the control panel. This is the outermost visibility toggle.

**Position:** Fixed, bottom-right corner. `bottom: 24px; right: 24px`

**Visual spec:**
- A pill or rounded-square shape, approximately 56px × 56px
- Background: liquid glass material (see §4), lighter opacity
- Contains a user-uploadable image (WebP) displayed inside it, cropped/fitted to fill the button shape
- If no custom image has been uploaded, shows a minimal `⊕` icon in `#111111` Roboto Thin
- Subtle drop shadow consistent with the panel

**Behavior:**
- Toggles the control panel between **hidden** and **collapsed** states
- When panel is hidden → click → panel slides in (collapsed view)
- When panel is visible → click → panel slides out (fully hidden)
- The button itself is always visible regardless of panel state

**Motion:** Panel slides in/out with spring physics (see §10).

**Custom image upload:**
- A hidden `<input type="file" accept="image/webp,image/*">` is triggered by clicking a small, discreet "change icon" affordance that appears on hover over the toggle button (e.g., a tiny pencil icon, `rgba(17,17,17,0.5)`)
- The uploaded image is stored in `localStorage` as a base64 data URL and restored on page load

---

## 8. Control Panel

### 8.1 Structure and Position

- `position: fixed; right: 16px; top: 16px; bottom: 16px`
- Width: **300px** on desktop
- The panel never touches the screen edges — 16px breathing room on all sides
- Rounded corners: `border-radius: 20px`
- Uses the liquid glass material (see §4)
- Content inside the panel has padding: `20px`
- The panel sits above the canvas via `z-index`

### 8.2 States

The panel has three states:

**Hidden**
- `transform: translateX(calc(100% + 24px))` — offscreen to the right
- Only the toggle button is visible

**Collapsed**
- Panel is visible and onscreen
- Contains (top to bottom):
  1. Random button (full width)
  2. Big Four sliders: Tempo, Saturation, Brightness, Contrast
  3. "more" affordance at the bottom
- Height: auto, fits content with internal padding

**Expanded**
- Same panel, grows to fill available vertical space
- `max-height: calc(100vh - 32px)` — respects the 16px breathing room top and bottom
- Content below the Big Four scrolls within the panel
- A thin, barely-visible custom scrollbar (`width: 3px`, color `rgba(17,17,17,0.15)`)
- Sections revealed: Shape → Effects → Color → Image → Text
- "less" affordance at the bottom of the scrollable content

### 8.3 Panel Interior Layout

**Top section (always visible, never scrolls):**
```
[ Random button — full width, colorful glow ]

[ Tempo slider                         ]
[ Saturation slider                    ]
[ Brightness slider                    ]
[ Contrast slider                      ]

[ — more — ]
```

**Expanded scrollable content (below the fold):**
```
— SHAPE —
[ Frequencies slider ]
[ Modulation slider  ]
[ Amplitude slider   ]
[ Curve Type picker  ]
[ Step Size slider   ]
[ Stroke Weight slider ]

— EFFECTS —
[ Trail slider ]
[ Glow toggle + intensity slider ]

— COLOR —
[ Line Color picker ]
[ Background Color picker ]
[ Color Filter picker ]

— IMAGE —
[ Upload image button ]
[ image pipeline controls... ]

— TEXT —
[ text pipeline controls... ]

[ — less — ]
```

**Section headers:** 10px, Roboto Thin, uppercase, letter-spacing 0.15em, `rgba(17,17,17,0.4)`. Preceded by a 1px horizontal rule in `rgba(17,17,17,0.08)`. 16px spacing above each section header, 10px below.

**"more" / "less" affordance:**
- Centered, 11px, Roboto Thin, uppercase, `rgba(17,17,17,0.4)`, letter-spacing 0.12em
- No button border or background — pure text, cursor: pointer
- On hover: `rgba(17,17,17,0.7)`, transition 200ms

---

## 9. Components

### 9.1 Random Button

The hero element of the panel. Full-width, prominent, unmistakable.

**Size:** Full panel content width × 52px height  
**Shape:** Pill — `border-radius: 26px`  
**Label:** "Random" — Roboto Light, 13px, letter-spacing 0.05em, `#f4f4f4`

**Colorful glow effect:**
```css
background: linear-gradient(
  135deg,
  rgba(255, 120, 180, 0.85),
  rgba(120, 160, 255, 0.85),
  rgba(100, 220, 200, 0.85)
);
box-shadow:
  0 0 20px rgba(180, 130, 255, 0.5),
  0 0 40px rgba(120, 180, 255, 0.3),
  0 4px 12px rgba(17, 17, 17, 0.15);
```

The gradient shifts subtly — use a CSS `@keyframes` animation rotating the hue slowly (`filter: hue-rotate`) so the button feels alive, not static. Period: ~8 seconds, infinite.

**On hover:** glow intensity increases slightly, scale `1.01`, transition 200ms  
**On press:** scale `0.98`, spring back on release

### 9.2 Sliders

Reference: image 1 (macOS-style full-width pill).

**Anatomy:**
```
[ Label                     Value ]
[====|·····················      ]
```
The entire row is a pill-shaped container. The label is left-aligned, the value right-aligned, both inside the pill. The fill sweeps from the left edge of the pill to the thumb position.

**Pill container:**
- Height: 44px
- Border-radius: 22px
- Background: `rgba(244, 244, 244, 0.7)`
- Border: `1px solid rgba(255, 255, 255, 0.6)`
- Full width of panel content area

**Fill:**
- Absolutely positioned inside the pill, from left to thumb position
- Background: `rgba(17, 17, 17, 0.07)`
- Border-radius: inherited
- Updated via CSS custom property `--pct` (0–100): `width: var(--pct, 0%)`

**Thumb:**
- A thin vertical line: `2px wide × 20px tall`
- Color: `rgba(17, 17, 17, 0.5)`
- No round knob — editorial, precise
- On drag: line brightens to `rgba(17, 17, 17, 0.9)`, soft glow: `box-shadow: 0 0 6px rgba(17,17,17,0.2)`

**Label:** Roboto Thin, 13px, `#111111`, left-aligned with 14px left padding  
**Value:** Roboto Light, 13px, `#111111`, right-aligned with 14px right padding

**Implementation:** Native `<input type="range">` styled via CSS, with a JS `input` event listener that sets `--pct` on the pill container.

**On drag start:** Pill lifts — `transform: scale(1.01)`, `box-shadow` deepens, spring-eased  
**On drag end:** Pill settles back — spring to resting state

### 9.3 Non-Slider Controls (Color Pickers, Toggles, Selectors, Upload)

Same pill language as sliders, but used as buttons or interactive containers. No colorful glow.

**Pill container:**
- Height: 44px (same as sliders for visual rhythm)
- Border-radius: 22px
- Background: `rgba(244, 244, 244, 0.7)`
- Border: `1px solid rgba(255, 255, 255, 0.6)`
- Full width

**Color pickers:**
- Pill with label left, a small color swatch circle (20px diameter) right
- Clicking opens the native `<input type="color">` or a custom picker
- The swatch reflects the current color

**Toggles (e.g. Glow on/off):**
- Pill with label left, a small pill-shaped toggle switch right (28px × 16px)
- Off state: `rgba(17,17,17,0.15)` track, white thumb
- On state: `rgba(17,17,17,0.6)` track, `#f4f4f4` thumb
- Toggle animates with spring

**Selectors (e.g. Curve Type):**
- A row of small pill chips, one per option, inside the full-width container
- Active chip: `background: rgba(17,17,17,0.1)`, slight border darkening
- Inactive chips: transparent background

**Upload button (Image / Text):**
- Pill with a small upload icon (↑) left and label right: "Upload image"
- On hover: background darkens slightly to `rgba(17,17,17,0.05)`
- Triggers `<input type="file">` on click

**On press (all non-slider pills):** `scale(0.98)`, spring back on release

---

## 10. Motion Principles

All motion in lissa's UI uses **spring physics**, not simple CSS easing curves. The goal is motion that feels like it has weight — it overshoots slightly and settles, not a robotic linear ease.

**Spring configuration (CSS approximation):**
```css
transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
            opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```
The `cubic-bezier(0.34, 1.56, 0.64, 1)` produces a gentle overshoot — the spring feel.

For JS-driven animations (panel expand/collapse), use a spring integrator loop or `Animation` API with the same character.

**Motion inventory:**

| Interaction | Motion | Duration |
|---|---|---|
| Panel show (hidden → collapsed) | `translateX` from offscreen, spring | 400ms |
| Panel hide (collapsed → hidden) | `translateX` to offscreen, ease-in | 300ms |
| Panel expand (collapsed → expanded) | Height grows, content fades in section by section | 350ms |
| Panel collapse (expanded → collapsed) | Height shrinks, content fades out | 280ms |
| Section reveal (staggered) | Each section fades up: `translateY(8px) → 0`, `opacity 0 → 1` | 200ms per section, 40ms stagger |
| Slider drag start | Pill `scale(1.01)`, shadow deepens | 150ms spring |
| Slider drag end | Pill settles to rest | 250ms spring |
| Button press | `scale(0.98)` | 80ms |
| Button release | `scale(1.0)` spring back | 200ms spring |
| Welcome screen fade out | `opacity 1 → 0` | 800ms ease |
| Toggle hover | Glow intensity increases | 200ms ease |

**Rule:** Sliders themselves do not animate — the thumb moves 1:1 with the pointer. Only the pill *container* has motion (lift on drag start/end).

---

## 11. Responsive / Mobile

**Phase 1 (current):** Desktop only. The control panel is designed for mouse/trackpad interaction. Minimum supported viewport: 1024px wide.

**Phase 2 (future):** Mobile adaptation. The right-side floating panel will shift to a **bottom sheet** on viewports narrower than 768px — slides up from the bottom, same liquid glass material, same state machine (hidden → collapsed → expanded). Touch-friendly slider hit areas (minimum 44px tall — already met by current spec).

---

## 12. Non-Functional Design Requirements

- All UI chrome renders in HTML/CSS — nothing is drawn on the p5.js canvas
- No external UI libraries — vanilla HTML, CSS, JS only (consistent with lissa's zero-dependency stack)
- The frosted glass `backdrop-filter` degrades gracefully: if unsupported, fall back to `background: rgba(244, 244, 244, 0.92)`
- The control panel does not interfere with p5.js canvas events — pointer events pass through to the canvas wherever the panel is not present
- Custom image for toggle button stored in `localStorage` — no server, no upload endpoint
- All spacing uses multiples of 4px (4, 8, 12, 16, 20, 24...)

---

*Produced in collaboration between Bjarki Bjornsson and Sally (BMad UX Designer agent), June 2026.*
