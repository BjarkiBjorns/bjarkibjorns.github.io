---
title: 'lissa Vignette'
type: 'feature'
created: '2026-06-08'
status: 'draft'
context: ['_bmad-output/project-context.md']
build_order: 2
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** lissa's output is a hard rectangle. The sharp canvas edge reads as a screenshot boundary, not a composed image — there is no easy way to soften or fade the frame.

**Approach:** Add a **vignette overlay** that feathers the canvas edges, reusing the exact CSS-overlay pattern already proven by `#color-filter` — a fixed, pointer-events-none `<div>` over the canvas whose `background` is a radial gradient, updated by an `applyVignette()` helper. Two sliders control it (Amount, Softness); it is optionally LFO-able later. Nothing is drawn on the p5 canvas.

## Open Questions & Assumptions

> Resolve before freezing.

1. **Edge color.** "Remove sharp edges" has two readings: (a) **feather the frame into the background** (gradient fades to the current `bgColor`, so the rectangle dissolves), or (b) a **classic darkening vignette** (fades to black/chosen color). **Assumption:** default to a color picker that *defaults to black* but can be set to match `bgColor`; this covers both. Confirm.
2. **Transparent-BG interaction.** When `transparentBg` is on, fading to an opaque color would re-introduce a visible frame. **Assumption:** the gradient fades to the chosen color's RGBA using `amount` as edge alpha, so a transparent canvas can fade to transparent. Confirm.
3. **LFO on Amount?** The four image/LFO patterns make this trivial. **Assumption:** ship static sliders first; LFO is a fast follow, not in scope here. Confirm if you want it now.

## Boundaries & Constraints

**Always:**
- Reuse the `#color-filter` overlay pattern: a fixed `<div>`, `pointer-events:none`, updated via a helper (`applyVignette()`), styled in `style.css`.
- Call `applyVignette()` whenever vignette state changes — updating the variable alone is not enough (same rule as `applyColorFilter()`).
- Add vignette state to **both** `captureState()` and `restoreState()`, and to the settings save/load payload (mirror the `cf` shorthand used for `colorFilter`).
- Vanilla HTML/CSS/JS only; nothing drawn on the p5 canvas.

**Ask First:**
- Before introducing a non-elliptical mask shape (e.g. rectangular feather vs radial) — default is radial ellipse.
- Before stacking vignette *above* `#color-filter` in z-order (default: just below, `z-index: 9998`).

**Never:**
- Draw the vignette on the p5 canvas or in `drawingContext`.
- Reuse `#color-filter`'s div for vignette — it is a separate overlay.
- Add ES modules or `'use strict'`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Vignette disabled | `vignette.enabled = false` | `#vignette` div `display:none`; no visual change | — |
| Amount = 0 | enabled, `amount = 0` | Overlay present but fully transparent edges → no visible effect | — |
| Amount → 1 | enabled, high amount | Edges fade strongly toward the chosen color | — |
| Softness slider | `softness` 0→1 | Gradient inner stop moves; small = tight ring near edge, large = broad feather toward center | — |
| Transparent BG on | `transparentBg = true` | Gradient edge alpha = `amount`; canvas can dissolve to transparent (no opaque frame) | — |
| Window resize | `windowResized()` | Overlay is CSS `inset:0` → auto-fits; no JS resize needed | — |
| Settings save/load | round-trip | `vignette` restores exactly (enabled, amount, softness, color) | guard missing keys with defaults |
| Undo/redo | `pushHistory()` on change | vignette changes participate in history | — |

</frozen-after-approval>

## Code Map

- `index.html` — add `<div id="vignette"></div>` next to `<div id="color-filter"></div>` (search: `id="color-filter"`). Add Amount + Softness sliders (+ enable toggle, + color picker) to a sensible section (Effects or Color).
- `style.css` — add `#vignette` rule mirroring `#color-filter` (`display:none; position:fixed; inset:0; pointer-events:none;`) at `z-index: 9998`.
- `sketch.js` — add `vignette` state object; `applyVignette()` helper; bind the new controls (with `pushHistory()`); add to `captureState()`/`restoreState()`; add to settings save/load (`vg` shorthand alongside `cf`).

## Tasks & Acceptance

**Execution:**
- [ ] `sketch.js` — Add state: `let vignette = { enabled:false, amount:0.4, softness:0.5, color:{r:0,g:0,b:0} };` near `colorFilter` (search: `let colorFilter`).
- [ ] `sketch.js` — Add `applyVignette()` mirroring `applyColorFilter()`: if `!enabled` set `display='none'` and return; else set `div.style.background = 'radial-gradient(ellipse at center, rgba(r,g,b,0) ' + inner% + ', rgba(r,g,b,amount) 100%)'` where `inner% = (1 - softness) * 100` rounded, and `display=''`.
- [ ] `index.html` — Add `<div id="vignette"></div>` immediately after `#color-filter`. Add controls: enable toggle (`vignetteEnabled`), `vignetteAmountSlider` (0–1, step 0.01, value 0.4), `vignetteSoftnessSlider` (0–1, step 0.01, value 0.5), color picker (`vignetteColor`) — using existing `.slider-pill` / `.color-pill` markup.
- [ ] `style.css` — Add `#vignette { display:none; position:fixed; inset:0; z-index:9998; pointer-events:none; }`.
- [ ] `sketch.js` — Bind controls: each `input`/`change` updates `vignette.*` then calls `applyVignette()`; `change` events call `pushHistory()` (match the `colorFilter` binding block, search: `filterOpacity`).
- [ ] `sketch.js` — `captureState()`: add `vignette: { enabled, amount, softness, color: {...} }`. `restoreState()`: restore each field (guard missing → defaults), sync the slider/toggle/picker DOM (`_setEl`/`_setChk`/`_setTxt`), then `applyVignette()`.
- [ ] `sketch.js` — Settings save/load: add `vg` shorthand next to the `cf` blocks (search: `cf: colorFilter.enabled`), and rehydrate on load.

**Acceptance Criteria:**
- Given vignette enabled with Amount > 0, when rendered, then canvas edges fade smoothly toward the chosen color with no hard ring.
- Given Softness is dragged, then the feather radius changes live without touching the p5 draw loop.
- Given `transparentBg` is on, when vignette fades, then no opaque rectangular frame reappears (edge alpha respects Amount).
- Given a settings Save → reload → Load, then vignette state restores exactly.
- Given Cmd+Z after a vignette change, then the change is undone (participates in history).
- Given the window is resized, then the vignette re-fits with no JS resize handler.

## Design Notes

**Why CSS overlay, not p5:** identical rationale to `#color-filter`. The vignette is presentation, lives above the canvas, costs nothing per frame, and survives resize via `inset:0`. Drawing it on-canvas would force per-pixel work and complicate export.

**Gradient recipe:** `radial-gradient(ellipse at center, rgba(R,G,B,0) INNER%, rgba(R,G,B,AMOUNT) 100%)`. `Softness` maps to `INNER%` (high softness = low inner stop = broad fade). `Amount` is the outer-edge alpha.

**Z-order:** `#color-filter` is `z-index:9999`. Default vignette to `9998` (below the color wash) so the color filter tints the whole frame including the vignetted edge. Flip if the desired look is a vignette *over* the tint.

## Verification

**Manual checks:**
- Enable vignette: edges feather; toggle off: clean rectangle returns.
- Drag Amount and Softness: live feather change.
- Set color to match `bgColor`: rectangle dissolves into background. Set black: classic darkening.
- Turn on Transparent BG: confirm no opaque frame.
- Save settings → reload → Load: vignette restored. Cmd+Z undoes a change.
