---
title: 'lissa Utility Panel'
type: 'feature'
created: '2026-06-08'
status: 'draft'
context: ['_bmad-output/project-context.md']
build_order: 1
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The utility actions (PNG / SVG / Present / Transparent BG / Save / Load, plus the Line/Mesh mode switch) live in `#drawer-utility` — a cramped two-row strip wedged at the top of `#section-drawer`, only visible once the drawer is open. They read as leftovers, not as a first-class control surface like the always-visible `#panel-fixed` "big four."

**Approach:** Promote the utility actions into a **second always-visible floating panel** — a true peer of `#panel-fixed`, sharing its glass/pill visual language — with a collapse toggle so it never becomes permanent clutter. Group the actions by purpose (Export / Session / Canvas) instead of by row-of-the-moment. Every existing element ID survives so `sketch.js` listeners keep working untouched.

## Open Questions & Assumptions

> Resolve these before treating the intent as frozen.

1. **Presentation form — RESOLVED 2026-06-08: Option (B), always-visible floating panel** (peer of `#panel-fixed`, with a collapse toggle). This is the literal reading of "its own panel similar to the big four." Options (A) nav-pill section and (C) icon toolbar were considered and declined; the ASCII sketch for (B) is in Design Notes.
   - **Implication:** adds persistent screen chrome → ship with a collapse/expand affordance so the user can tuck it away.
2. **Does the Line/Mesh `mode-switcher` move with the utilities?** It is arguably a *primary* control, not a utility. **Assumption:** the mode-switcher stays where it is (or moves to `#panel-fixed`), and only the export/session/canvas actions move. Confirm.
3. **Is the hidden `#randomColorsBtn` still needed?** It is `display:none`, kept for backward-compat. **Assumption:** leave it untouched in place.

## Boundaries & Constraints

**Always:**
- Preserve every existing element ID verbatim — `sketch.js` binds to them: `savePngBtn`, `saveSvgBtn`, `outputWindowBtn`, `transparentBg`, `saveSettingsBtn`, `loadSettingsBtn`, `randomColorsBtn`, and the `mode-btn[data-mode]` buttons.
- Match the existing pill / glass visual language of `#panel-fixed` and the section bodies (spacing in multiples of 4px, same type ramp).
- Vanilla HTML/CSS/JS only — no libraries, no build step.
- All UI chrome in HTML/CSS above the canvas — nothing drawn on the p5.js canvas.

**Ask First:**
- Before moving the `mode-switcher` out of the utility group (see Open Question 2).
- Before changing any button's text/label (only its container moves).

**Never:**
- Remove or rename any utility element ID.
- Add ES modules, `import`/`export`, or a bundler.
- Add `'use strict'` to `sketch.js`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| App loads | default | `#utility-panel` visible (collapsible), all six actions + Transparent BG grouped by purpose | — |
| Collapse toggle | click `#utility-collapse` | Panel shrinks to header/handle; click again to restore | — |
| Click PNG / SVG / Present | `#savePngBtn` / `#saveSvgBtn` / `#outputWindowBtn` | Identical behavior to today — listeners unchanged | unchanged |
| Toggle Transparent BG | `#transparentBg` checkbox | Identical behavior to today | unchanged |
| Save / Load settings | `#saveSettingsBtn` / `#loadSettingsBtn` | Identical behavior to today (JSON export/import) | unchanged |
| Line/Mesh switch | `mode-btn[data-mode]` | Identical behavior to today | unchanged |
| Narrow viewport | Panel near screen edge | Group wraps gracefully; no horizontal scroll | — |

</frozen-after-approval>

## Code Map

- `index.html` — add a new `#utility-panel` fixed-position container (peer of `#panel-fixed`); move the `#drawer-utility` actions into it, grouped Export/Session/Canvas; add a collapse toggle (`#utility-collapse`). Keep all IDs.
- `style.css` — `#utility-panel` styled with the same glass/pill tokens as `#panel-fixed`; collapsed/expanded states (mirror the panel transition approach already used for `#panel`/`#section-drawer`).
- `sketch.js` — add a collapse/expand click handler for `#utility-collapse` (toggle a class on `#utility-panel`). All existing action listeners are untouched because their IDs move intact.

## Tasks & Acceptance

**Execution (Option B — always-visible panel, RESOLVED):**
- [ ] `index.html` — Add `<div id="utility-panel">` as a sibling of `#panel-fixed`. Inside it, a collapse toggle (`#utility-collapse`) and three labeled groups reusing the relocated controls: **Export** (`savePngBtn`, `saveSvgBtn`, `outputWindowBtn`), **Session** (`saveSettingsBtn`, `loadSettingsBtn`), **Canvas** (`transparentBg`). Remove the now-empty `#drawer-utility` rows but keep the hidden `#randomColorsBtn` in the DOM. Confirm mode-switcher placement per Open Question 2.
- [ ] `style.css` — `#utility-panel`: fixed position (e.g. top-left, opposite `#panel-fixed` top-right), glass material + pill tokens identical to `#panel-fixed`; spacing in 4px multiples. Add `#utility-panel.collapsed` state that hides the groups and shrinks to a header/handle; transition mirrors the existing `#panel` slide. Group sub-labels use the section-header type (10px, uppercase, tracking, `rgba(17,17,17,0.4)`).
- [ ] `sketch.js` — Add `#utility-collapse` click handler: toggle `collapsed` on `#utility-panel`. (Optionally persist collapsed state in settings.) No changes to any existing action listener — IDs moved intact.

**Acceptance Criteria:**
- Given the app loads, then `#utility-panel` is visible by default (and collapsible), with all six actions and Transparent BG grouped by purpose.
- Given each relocated control is clicked/toggled, then its behavior is byte-for-byte identical to before (same `sketch.js` listeners fire).
- Given a settings Save then Load round-trip, then state restores exactly as before this change.
- Given the viewport is narrow, then the utility group wraps without horizontal scrolling.

## Design Notes

**Option A — "Output" nav-pill section (default):**
```
[Shape][Effects][Color][Image][Text][Output]   ← nav pills
┌───────────────────────── Output ─────────────────────────┐
│ EXPORT     [ PNG ] [ SVG ] [ ▶ Present ]                  │
│ SESSION    [ Save ] [ Load ]                              │
│ CANVAS     [x] Transparent BG                             │
└───────────────────────────────────────────────────────────┘
```

**Option B — dedicated always-visible panel (peer of `#panel-fixed`):**
```
#panel-fixed (top-right)        #utility-panel (e.g. top-left)
┌── Random ───────────┐         ┌── Output ───────────┐
│ Tempo  ▭▭▭▭         │         │ [PNG][SVG][Present] │
│ Saturation ▭▭▭      │         │ [Save][Load]        │
│ Brightness ▭▭▭      │         │ [x] Transparent BG  │
│ Contrast ▭▭▭        │         └─────────────────────┘
```

Option B matches "similar to the big four" most literally but consumes permanent screen space; recommend a toggle/collapse if chosen.

## Verification

**Manual checks:**
- Open `index.html`: utility actions are grouped and discoverable in their new home.
- Click PNG/SVG/Present, Save/Load, toggle Transparent BG, switch Line/Mesh — all behave exactly as before.
- Settings Save → reload page → Load: full round-trip works.
- Resize window narrow: layout wraps cleanly.
