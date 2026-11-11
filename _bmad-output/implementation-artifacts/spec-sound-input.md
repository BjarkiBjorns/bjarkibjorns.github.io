---
title: 'lissa Sound Input Mode'
type: 'feature'
created: '2026-06-08'
status: 'draft'
context: ['_bmad-output/project-context.md']
build_order: 4
note: 'Build LAST — routes into params added by spec-image-mode (Scale/Offset/Opacity/Resolution).'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** lissa is silent. Every parameter is static or LFO-driven, but nothing reacts to the room. There is no way to make the visuals breathe with music or a voice.

**Approach:** Add a **mic-driven modulation source** that plugs into the *same per-parameter slot the LFO engine already uses*. A live audio value (overall amplitude, or a chosen FFT band) is read once per frame and normalized to `0..1`. Any LFO-capable parameter gains an **independent mic toggle** beside its existing LFO toggle; when on, an audio term is added **on top of** that param's sine LFO (and base) — the two modulators stack. A single shared **Audio In** panel arms the mic and sets gain / smoothing / source. No parallel modulation system is built — audio is "an LFO whose oscillator is the microphone."

## Open Questions & Assumptions

> These are real forks. Resolve before freezing — they change the build materially.

1. **Audio engine (PRIMARY).** p5.sound is **not currently loaded** (only `p5.min.js`). Two paths:
   - **(A) Add `p5.sound.min.js` (v1.9.4) CDN** → `p5.AudioIn`, `p5.Amplitude`, `p5.FFT` integrate cleanly with global mode. One new CDN script. *(default)*
   - **(B) Raw Web Audio API** (`getUserMedia` + `AnalyserNode`) → zero new dependency, ~30 extra lines, full control.
   - **RESOLVED 2026-06-08: (A)** — add `p5.sound.min.js` (v1.9.4) CDN.
2. **Per-param control model — RESOLVED 2026-06-08: (ii) additive.** Each LFO-capable param gets an **independent mic toggle** beside its LFO toggle. When on, the audio term is *added on top of* whatever the LFO/base produces (two stacked modulators). The audio term reuses the param's existing **Depth** as sensitivity, scaled by the global Audio In gain — so no new per-row slider is needed. (Option (i), a mutually-exclusive Off/LFO/Audio switch, was declined.)
3. **Global vs per-param source.** Does each param pick its own FFT band, or is there one global audio value all mic'd params share? **Assumption:** one global `audioLevel` (set by the Audio In panel: amplitude or a single band) shared by all mic'd params in v1; per-param band selection is a future extension. Confirm.
4. **Secure-context limitation (MUST acknowledge).** `getUserMedia` requires a secure context. On **GitHub Pages (https)** the mic works. Opening `index.html` from **`file://` locally may be blocked** by the browser. **Assumption:** ship it, detect failure, and show a clear message; document that local mic testing may need `localhost` over http or the deployed https site. Confirm acceptable.

## Boundaries & Constraints

**Always:**
- Reuse the LFO architecture: resolve the LFO/base value first (existing `applyLfo`/`applyTextLfo`/`applyImgLfo`), then **add** the audio term via `applyAudioMod(key, value, range)`. Audio normalizes to `0..1`; the audio term uses the param's existing **Depth** as sensitivity, scaled by the global Audio In gain. LFO and mic are independent toggles that stack.
- Arm the mic **only on an explicit user gesture** (an "Enable Mic" button) — never auto-start on load (privacy + browser autoplay/permission rules).
- Update one shared `audioLevel` per frame at the **top of `draw()`** (like `_fr` and `updateVideoPixels()`), so all mic'd params read a consistent value that frame.
- Add audio routing state (global Audio In settings + per-param `audio` flags) to **both** `captureState()` and `restoreState()`, and to settings save/load. The mic **stream/permission is NOT serializable** — only settings persist; the user re-arms the mic by gesture after load.
- LFO-capable param set must include the image params added by `spec-image-mode` (Scale/Offset/Opacity/Resolution) — build this spec after that one.

**Ask First:**
- Before adding `p5.sound` vs raw Web Audio (Open Q1).
- Before choosing control model (i) vs (ii) (Open Q2).
- Before adding FFT band-per-param (out of scope for v1).

**Never:**
- Auto-request the mic on page load.
- Build a second modulation pipeline parallel to LFOs.
- Block the render loop waiting on audio (handle async arm gracefully; `audioLevel` defaults to 0 until armed).
- Add ES modules or `'use strict'`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Page load | mic not armed | `audioLevel = 0`; mic toggles visible but inert; no permission prompt | — |
| Click "Enable Mic" | user gesture | `getUserMedia` requested; on grant, level meter goes live | on deny/error: show message, leave `audioLevel=0`, un-arm |
| `file://` blocks mic | secure-context fail | Catch rejection; message: "Mic needs https — use the deployed site or localhost" | graceful, app keeps running |
| Param mic toggle on | `{key}AudioToggle` checked | Audio term `audioLevel*depth*range` ADDED on top of the base/LFO value | clamp via `constrain` |
| Param with LFO + mic both on | both checked | Sine wobble AND audio swing combine (constrained to range) | clamp |
| Silence | armed, no sound | `audioLevel ≈ 0` → param sits at base value | — |
| Loud transient | armed | `audioLevel → ~1` → param swings up to `base + depth*range` | clamp via `constrain` |
| Gain / Smoothing sliders | Audio In panel | Gain scales raw level; Smoothing lerps frame-to-frame (no jitter) | — |
| Source = Amplitude vs FFT band | Audio In panel | `audioLevel` derives from overall volume or the selected band's energy | — |
| Settings save/load | round-trip | Audio In settings + per-param flags restore; mic stays un-armed until gesture | guard missing keys |
| Undo/redo | toggle/slider change | participates in `pushHistory()` | — |
| Multiple params mic'd | several Audio | all read the same shared `audioLevel` that frame | — |

</frozen-after-approval>

## Code Map

- `index.html`
  - Add p5.sound CDN script **before** `sketch.js` (if Option A): `<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/addons/p5.sound.min.js"></script>` (search: `p5.min.js`).
  - New **Audio In** section (`nav-pill[data-section="audioBody"]`): Enable-Mic button, live level meter, Source select (Amplitude / FFT band), Band picker, Gain slider, Smoothing slider.
  - Add an **independent mic toggle** (`{key}AudioToggle`) into each LFO-capable `.lfo-row`, beside the existing LFO toggle.
- `sketch.js`
  - Audio core: `audioIn` state object, `audioLevel` live value, `armMic()` (async, gesture-triggered), `updateAudioLevel()` called at top of `draw()`.
  - Modulation: `applyAudioMod(key, base, range)` mirroring `applyLfo`; integrate into the value-resolution path so a param uses audio when its source is Audio.
  - State: extend `captureState()`/`restoreState()`/settings save/load.
- `style.css` — level meter + Audio In controls; reuse pill/section tokens; minimal new CSS for the meter bar.

## Tasks & Acceptance

**Execution (default = Option A engine + control model i):**
- [ ] `index.html` — Add the p5.sound CDN `<script>` before `sketch.js`.
- [ ] `sketch.js` — State: `let audioIn = { source:'amplitude', band:0, gain:1.0, smoothing:0.6 }; let audioLevel = 0; let _mic=null, _amp=null, _fft=null, _micArmed=false;`
- [ ] `sketch.js` — `armMic()` (async): create `_mic = new p5.AudioIn(); _mic.start(...)`; `_amp = new p5.Amplitude(); _amp.setInput(_mic);` `_fft = new p5.FFT(); _fft.setInput(_mic);` set `_micArmed=true`. Wrap in try/catch → on failure show message, `_micArmed=false`. Bind to the Enable-Mic button (user gesture).
- [ ] `sketch.js` — `updateAudioLevel()` at top of `draw()` (near `_fr`): if `!_micArmed` → `audioLevel=0; return;`. Else read raw (`_amp.getLevel()` for amplitude, or `_fft.analyze()` → band energy `/255` for FFT), apply `gain`, then smooth: `audioLevel = lerp(audioLevel, constrain(raw*gain,0,1), 1 - smoothing)`.
- [ ] `sketch.js` — `applyAudioMod(key, value, range)` — takes the value already produced by the LFO/base path and ADDS the audio term: `return constrain(value + audioLevel * lfos[key].depth * (range.max-range.min), range.min, range.max);` (reuses the param's LFO `depth` as sensitivity; `audioLevel` already includes global gain).
- [ ] `sketch.js` — Per-param value resolution (additive): where each value is read via `applyLfo`/`applyTextLfo`/`applyImgLfo`, keep that call, then wrap it — `if (lfos[key].audio) value = applyAudioMod(key, value, range);`. Store a per-param boolean `lfos[key].audio` (default `false`), independent of `lfos[key].enabled`. LFO and mic stack.
- [ ] `index.html` — Build the **Audio In** section: Enable-Mic button (`enableMicBtn`), `<canvas>` or `<div>` level meter (`audioMeter`), `audioSource` select, `audioBand` slider, `audioGainSlider` (0–4, step 0.01, 1), `audioSmoothingSlider` (0–0.95, step 0.01, 0.6). Add an independent mic toggle `{key}AudioToggle` (checkbox, labeled "Mic") to each `.lfo-row`, beside the existing LFO checkbox.
- [ ] `sketch.js` — Bind Audio In controls (update `audioIn.*`, `pushHistory()` on `change`); bind per-param mic toggles (`{key}AudioToggle` `change` → `lfos[key].audio = this.checked`, `updateLfoUi`, `pushHistory()`). Drive the level meter from `audioLevel` each frame.
- [ ] `sketch.js` — `captureState()`/`restoreState()`: persist `audioIn` and each param's `audio` boolean (the `lfos` deep-copy already carries it once added). Settings save/load: same. On load, leave `_micArmed=false` (require gesture re-arm); reflect that in the Enable-Mic button state.

**Acceptance Criteria:**
- Given a fresh load, when the page opens, then no mic permission is requested and `audioLevel` is 0.
- Given the user clicks Enable Mic and grants permission, then the level meter responds live to sound.
- Given the user denies permission or runs on a blocked `file://` context, then a clear message appears and the app keeps running.
- Given a param's mic toggle is on, when sound plays, then the audio term adds on top of its current base/LFO value (up to `+depth*range`) and contributes nothing in silence.
- Given a param has BOTH its LFO and mic toggles on, then its sine wobble and the audio-driven swing combine (constrained to range).
- Given several params are set to Audio, then all react together off one shared `audioLevel`.
- Given Gain and Smoothing sliders, then raw level scales and jitter smooths as expected.
- Given settings Save → reload → Load, then Audio In settings and per-param sources restore, and the mic is un-armed until the user re-enables it.
- Given Cmd+Z after a change, then it is undone.

## Design Notes

**Audio = a second modulator on the same slot.** The LFO produces `base + sin(phase)*depth*range/2`; the mic then *adds* `audioLevel*depth*range` on top, constrained to range. The same Depth control feeds both. This is why no new pipeline is needed — the only additions are (1) a shared `audioLevel` updated once per frame and (2) a per-param `audio` toggle that stacks the audio term on the LFO/base value.

**Why once-per-frame, shared level:** mirrors `_fr` and `updateVideoPixels()` — compute the expensive read at the top of `draw()` so every consumer that frame sees one consistent number. Per-param FFT bands would mean N analyses per frame; defer that.

**Secure context reality:** `getUserMedia` resolves on https (GitHub Pages — the deploy target) and on `http://localhost`, but browsers commonly block it on `file://`. This is the one place lissa's "just open index.html" workflow has a gap. The build must fail soft (try/catch, message) so the rest of the app is unaffected, and the limitation should be noted in any README/demo instructions.

**Persistence boundary:** settings capture *intent* (which params listen, gain, smoothing, source) but never the live stream or permission. After loading a settings file the visuals won't move until the user re-arms the mic — by design.

## Verification

**Manual checks (use the https deploy or localhost for the mic):**
- Load page: no permission prompt; meter flat.
- Click Enable Mic, allow: meter tracks sound; speak/play music.
- Turn on Tempo's (or any param's) mic toggle: it pulses with sound on top of its current value; silence → rests at base/LFO. Turn on its LFO too: both stack.
- Turn on the mic toggle for an image param (Scale/Opacity): confirms cross-feature routing (depends on spec-image-mode).
- Adjust Gain/Smoothing: sensitivity and smoothness change as expected.
- Deny permission (or open via file:// where blocked): message shown, app still runs.
- Save settings → reload → Load: settings restored, mic requires re-arm. Cmd+Z undoes a change.
