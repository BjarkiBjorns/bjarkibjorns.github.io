---
title: 'lissa Image Mode Overhaul'
type: 'feature'
created: '2026-06-08'
status: 'draft'
context: ['_bmad-output/project-context.md']
build_order: 3
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Image mode is the only part of lissa still driven by the mouse — `drawPhotoMode()` reads `mouseX`/`mouseY` to derive its two modulation factors, which is non-deterministic, can't be automated, and can't be exported/presented consistently. Image mode also can't blend into the underlying lissajous/mesh layer, and its scale/offset/opacity/resolution can't animate.

**Approach:** Three changes, all reusing patterns lissa already has:
1. **De-mouse:** replace the `mouseX`/`mouseY` reads in `drawPhotoMode()` with two new user-controlled sliders, each LFO-able via the existing LFO engine.
2. **Blend modes:** add a p5 `blendMode()` control so the image grid composites into the layer beneath it (Multiply/Screen/Overlay/…), mirroring the existing `filterBlendMode` select.
3. **Animate:** add LFOs to Scale, Offset X/Y, Opacity, and Resolution by extending the `applyTextLfo` pattern (these vars live outside `params`/`paramRanges`).

## Open Questions & Assumptions

> Resolve before freezing.

1. **Naming of the two ex-mouse factors.** They map ~`0.05→1.0` and modulate per-cell rendering in `_pixelGridCell`. **Assumption:** label them **"Factor X" / "Factor Y"** with keys `imgFactorX` / `imgFactorY`. Rename freely.
2. **Default Factor values.** Mouse defaulted to wherever the cursor sat. **Assumption:** default both to `0.5` (mid-range) so first paint matches a centered cursor. Confirm.
3. **Blend-mode interaction with `transparentBg`.** Transparent-BG mode uses `globalCompositeOperation='destination-out'` for the trail fade. A non-default `blendMode()` may fight it. **Assumption:** always reset `blendMode(BLEND)` immediately after the image grid draws, and flag the transparent-BG combo as "use with care." Confirm whether to hard-disable image blend while transparent-BG is on.
4. **Resolution LFO feel.** `imgCols` is an integer (`Math.round`), so LFO produces visible stepping. **Assumption:** that's the desired pulsing look; round the modulated value. Confirm.

## Boundaries & Constraints

**Always:**
- All pixel sampling stays routed through `applyImgTransform(nx, ny)` (project-context Image Transform Rules). Never sample raw normalized coords.
- LFO phase advances use `(TWO_PI * rate) / _fr` (use cached `_fr`, never inline `frameRate()`).
- New LFO sub-rows reuse the existing `.lfo-row` / `.lfo-params` markup and the `bindLfo()` / `updateLfoUi()` wiring. LFO key need not match the slider ID prefix (precedent: key `speed` ↔ slider `tempoSlider`).
- After any non-default `blendMode()`, reset with `blendMode(BLEND)` before other drawing — same discipline as resetting `drawingContext.shadowBlur = 0` after glow.
- Add every new piece of state (two factors, `imgBlendMode`, new `lfos` entries) to **both** `captureState()` and `restoreState()`, and to settings save/load.

**Ask First:**
- Before changing `applyImgTransform`'s signature (default plan: it reads new frame-effective globals, see Design Notes — no signature change).
- Before disabling image blend during transparent-BG mode (Open Question 3).

**Never:**
- Reintroduce any `mouseX`/`mouseY`/`mouseIsPressed` read anywhere in image mode.
- Compute an LFO value per-pixel (compute once per frame — see Design Notes).
- Increase `pointCount` cap (unrelated, but the O(n²) caution still stands).
- Add ES modules or `'use strict'`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| No image loaded | `imgPixels` null | `drawPhotoMode()`/`drawImageGrid()` early-return (existing guard) | unchanged |
| Move mouse over canvas | any | **No effect on image** (de-moused) | — |
| Factor X / Y slider | `imgFactorX/Y` 0.05–1.0 | Per-cell modulation changes deterministically (replaces old mouse mapping) | — |
| Factor LFO enabled | `lfos.imgFactorX.enabled` | Factor oscillates `sin`-driven, frame-rate-normalized | — |
| Blend mode = Multiply/Screen/… | `imgBlendMode` | Image grid composites into the layer beneath; reset to BLEND after | — |
| Blend mode + transparent BG | both active | Grid composites; trail fade still works because BLEND is restored each frame | flag per Open Q3 |
| Scale/Offset/Opacity LFO | `lfos.imgScale` etc. | Values oscillate within slider range; sampling via `applyImgTransform` uses frame-effective values | — |
| Resolution LFO | `lfos.imgCols` | `imgCols` pulses in integer steps within 20–200 | round modulated value |
| Settings save/load | round-trip | All new state restores; missing keys fall back to defaults | guard `!= null` like existing img fields |
| Undo/redo | `pushHistory()` | All new controls participate in history | — |

</frozen-after-approval>

## Code Map

- `sketch.js`
  - `drawPhotoMode()` (search: `function drawPhotoMode`) — replace the two `map(mouseX…)` / `map(mouseY…)` lines (currently L692–693) with frame-effective factor values; compute LFO'd image values once at top.
  - `applyImgTransform()` (search: `function applyImgTransform`) — read frame-effective `_imgScaleEff` / `_imgOffsetXEff` / `_imgOffsetYEff` instead of raw globals (no signature change).
  - LFO engine — add `applyImgLfo(key)` mirroring `applyTextLfo` with an `_imgLfoRanges` table; extend `lfos` object; call `bindLfo()` for new keys; extend the `restoreState` LFO loop list.
  - Image grid blend — wrap `drawImageGrid()` / `drawPhotoMode()` call sites with `blendMode(_p5BlendOf(imgBlendMode))` … `blendMode(BLEND)`.
  - State — extend `captureState()` / `restoreState()` / settings save/load.
- `index.html` — image section (`imageBody`, search: `imgColsSlider`): add Factor X / Factor Y sliders, LFO sub-rows for Scale/OffsetX/OffsetY/Opacity/Resolution/FactorX/FactorY, and an `imgBlendMode` `<select>` mirroring `filterBlendMode` (search: `id="filterBlendMode"`).
- `style.css` — no new patterns; reuse `.slider-pill` / `.lfo-row` styling.

## Tasks & Acceptance

**Execution:**
- [ ] `sketch.js` — Add state vars near the image block (search: `let imgScale`): `let imgFactorX = 0.5;`, `let imgFactorY = 0.5;`, `let imgBlendMode = "normal";`. Add SLIDER_DEFAULTS entries `imgFactorXSlider: 0.5, imgFactorYSlider: 0.5`.
- [ ] `sketch.js` — Extend `lfos` with `imgScale, imgOffsetX, imgOffsetY, imageStrength, imgCols, imgFactorX, imgFactorY` (each `{enabled:false, rate:0.5, depth:0.5, phase:0}`).
- [ ] `sketch.js` — Add `_imgLfoRanges = { imgScale:{min:0.1,max:8}, imgOffsetX:{min:-0.5,max:0.5}, imgOffsetY:{min:-0.5,max:0.5}, imageStrength:{min:0,max:1}, imgCols:{min:20,max:200}, imgFactorX:{min:0.05,max:1}, imgFactorY:{min:0.05,max:1} };` and `applyImgLfo(key, base)` mirroring `applyTextLfo` (phase advance `(TWO_PI*rate)/_fr`, `constrain(base + sin(phase)*depth*(max-min)/2, min, max)`; returns `base` when disabled).
- [ ] `sketch.js` — At the top of `drawPhotoMode()` (and `drawImageGrid()` where relevant), compute once per frame: `_imgScaleEff = applyImgLfo('imgScale', imgScale)`, `_imgOffsetXEff = applyImgLfo('imgOffsetX', imgOffsetX)`, `_imgOffsetYEff = applyImgLfo('imgOffsetY', imgOffsetY)`; `let strength = applyImgLfo('imageStrength', imageStrength); let alpha = strength*255;`; `let cols = Math.round(applyImgLfo('imgCols', imgCols));`; `let fx = applyImgLfo('imgFactorX', imgFactorX); let fy = applyImgLfo('imgFactorY', imgFactorY);`. Replace L692–693 `factor1/factor2` with `fx/fy`. Update the function's lead comment (no longer mouse-driven).
- [ ] `sketch.js` — Change `applyImgTransform` to read `_imgScaleEff/_imgOffsetXEff/_imgOffsetYEff` (declare these as module-level `let`s, initialized to the base values). This keeps per-pixel cost at one variable read.
- [ ] `sketch.js` — Add `_p5BlendOf(name)` mapping strings → p5 constants (`normal→BLEND, multiply→MULTIPLY, screen→SCREEN, overlay→OVERLAY, darkest→DARKEST, lightest→LIGHTEST, difference→DIFFERENCE, exclusion→EXCLUSION, add→ADD, burn→BURN, dodge→DODGE`). Wrap image grid draw: `blendMode(_p5BlendOf(imgBlendMode)); …draw…; blendMode(BLEND);`.
- [ ] `index.html` — In `imageBody`: add Factor X (`imgFactorXSlider`, 0.05–1, step 0.01, 0.5) and Factor Y (`imgFactorYSlider`) pills with LFO sub-rows; add LFO sub-rows under existing Scale/OffsetX/OffsetY/Opacity/Resolution pills; add `<select id="imgBlendMode">` (options matching `_p5BlendOf` keys) mirroring the `filterBlendMode` markup.
- [ ] `sketch.js` — `bindLfo('imgScale')`, `bindLfo('imgOffsetX')`, … for all seven new keys, alongside existing `bindLfo` calls; bind the two Factor sliders and the `imgBlendMode` select (`change` → `imgBlendMode=this.value; pushHistory()`).
- [ ] `sketch.js` — Extend `captureState()` with `imgFactorX, imgFactorY, imgBlendMode` (the `lfos` deep-copy already captures the new LFO entries). Extend `restoreState()`: restore the three vars + sync DOM; the existing LFO restore loop must include the seven new keys (search the `forEach` list at restoreState — currently ends `connectionRadius","connectionRamp"`).
- [ ] `sketch.js` — Settings save/load: persist `imgFactorX, imgFactorY, imgBlendMode` and the new LFO entries (mirror how `imgScale`/`imgCols` are already saved).

**Acceptance Criteria:**
- Given image mode is active, when the mouse moves anywhere, then the image output does not change.
- Given Factor X/Y sliders, when dragged, then per-cell modulation changes exactly as the old mouse mapping did (continuity of look).
- Given a Factor/Scale/Offset/Opacity/Resolution LFO is enabled, then that value oscillates smoothly and frame-rate-independently.
- Given `imgBlendMode` = Multiply (or others), then the image grid visibly composites into the lissajous/mesh beneath it, and normal drawing resumes next frame (BLEND restored).
- Given Resolution LFO is on, then `imgCols` pulses in integer steps within 20–200.
- Given settings Save → reload → Load, then all new state and LFOs restore exactly.
- Given Cmd+Z after any new control change, then it is undone.

## Design Notes

**Why frame-effective globals (`_imgScaleEff` etc.):** `applyImgTransform(nx,ny)` is called once per pixel-grid cell. Calling `applyImgLfo` inside it would advance the LFO phase thousands of times per frame and tank performance. Instead, compute the modulated value **once per frame** at the top of the draw function, store in `_imgScaleEff`/`_imgOffsetXEff`/`_imgOffsetYEff`, and let `applyImgTransform` read those. Base slider values stay intact in `imgScale`/`imgOffsetX`/`imgOffsetY` (so undo/save still reflect the user's setting, not a mid-oscillation snapshot).

**Why mirror `applyTextLfo`, not `applyLfo`:** `imgScale`, `imgCols`, etc. are standalone `let`s, not entries in `params`/`paramRanges`. `applyLfo(key)` indexes `paramRanges[key]` and `params[key]`; it would throw for image keys. `applyTextLfo` already solved this exact problem for `textSize`/`textBlend` via a private `_textLfoRanges` table — `applyImgLfo` + `_imgLfoRanges` is the same shape.

**Blend reset discipline:** p5 `blendMode()` is stateful for all subsequent draws. The trail fade in line mode and the transparent-BG `destination-out` both assume the default. Always restore `blendMode(BLEND)` right after the image grid, exactly like `shadowBlur = 0` after glow.

**LFO log-rate guard:** the restore loop sets the rate slider via `Math.log10(lfo.rate)`. Per `deferred-work.md`, guard with `Math.log10(Math.max(lfo.rate, 0.001))` when adding the new keys to avoid `-Infinity` from a corrupt `rate:0`.

## Verification

**Manual checks:**
- Load an image, enter image mode, wave the mouse: output is unchanged.
- Drag Factor X/Y: modulation responds; matches the old mouse feel at equivalent values.
- Enable LFO on Scale, Offset, Opacity, Resolution, Factor X/Y one at a time: each animates correctly, tempo stable across frame-rate dips.
- Cycle `imgBlendMode` through Multiply/Screen/Overlay: image visibly blends with the curve/mesh; switch back to Normal: clean.
- With Transparent BG on, enable a blend mode: trail fade still behaves.
- Save settings → reload → Load: every new control and LFO restored. Cmd+Z works.
