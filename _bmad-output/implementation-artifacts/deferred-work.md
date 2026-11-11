# Deferred Work

Items surfaced during review of `spec-ui-redesign` but not caused by it, or too low priority to block delivery.

---

## Double pushHistory on Random button
**Source:** ui-redesign review
`randomizeColors()` and `randomizeParams()` each call `pushHistory()` internally, so clicking Random creates two undo history entries. Cmd+Z undoes only the color change; a second Cmd+Z undoes the shape. Consider refactoring so a single Random gesture pushes one history entry.

## LFO Math.log10(0) guard
**Source:** ui-redesign review
`restoreState` calls `_setEl(key+"LfoRate", Math.log10(lfo.rate))`. If a saved-settings file contains `lfo.rate: 0` (corrupt or manually edited), this sets the slider to `-Infinity` and permanently breaks that LFO. Add a guard: `Math.log10(Math.max(lfo.rate, 0.001))`.

## Slider label `for` accessibility pre-empted by overlapping range
**Source:** ui-redesign review
Inside `.slider-pill`, the `<label for="sliderId">` click is always intercepted by the transparent `<input type="range">` sitting at `z-index:4` over the full pill. The `for` attribute works for screen-reader announcement but not for keyboard focus routing via label click. Low priority for a desktop-only creative tool.
