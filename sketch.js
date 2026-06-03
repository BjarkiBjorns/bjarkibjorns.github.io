// =============================================================================
// STATE
// =============================================================================

let params = {
  freqX:        1,    freqY:        1,
  modFreqX:     1,    modFreqY:     1,
  phase:        0,    speed:        0.005,
  ampX:         0.4,  ampY:         0.4,
  stepSize:     0.001, strokeWeight: 0.5,
  trail:        100,
  pointCount:       400,
  connectionRadius: 100,
  connectionRamp:   6
};

let bgColor   = { r: 237, g: 237, b: 237 };
let lineColor = { r: 23,  g: 23,  b: 23  };



// Draw mode
let drawMode      = "line";
let curveShape    = "lissajous";
let showCurve     = true;
let meshDirty     = true;
let meshAnimating = false;
let meshAnimSpeed = 0.005;

// Text blend mode
let textMode = {
  text:   "LISSA",
  font:   "Arial Black",
  size:   200,
  bold:   true,
  italic: false,
  blend:  0
};
let _textMaskCanvas = null;
let _textMaskCtx    = null;

// Image / video data
let uploadedImg    = null;
let uploadedVideo  = null;
let videoCanvas    = null;
let videoCtx       = null;
let isVideoSource  = false;
let imgPixels      = null;
let imgW = 0, imgH = 0;
let showImage      = false;
let transparentBg  = false;

// Image transform (applied when sampling)
let imgScale   = 1.0;
let imgOffsetX = 0.0;
let imgOffsetY = 0.0;

// Image pixel grid
let imgDrawMode   = 9;    // 0=off, 1-9=style
let imgCols       = 80;   // grid columns
let imageStrength = 1.0;  // grid opacity 0-1

// Big Four
let saturation    = 1.0;
let brightness    = 1.0;
let contrastLevel = 1.0;

// Phase accumulator for smooth tempo changes
let phaseAccumulator = 0;
let _fr = 60; // frameRate cached once per draw() to avoid repeated calls

// Presentation window
let outputWindows   = [];   // all currently open output windows (max 3)
let outputChannel   = null;
let outputConnected = false;
let mirrorPending   = false; // kept for compatibility, unused after state-based mirror
let _heartbeatTimer = null;
let _secondScreen   = null;

// Glow
let glowEnabled   = false;
let glowSize      = 20;
let glowIntensity = 0.8;

// Color filter overlay
let colorFilter = {
  enabled:   false,
  color:     { r: 255, g: 0, b: 0 },
  opacity:   0.3,
  blendMode: "normal"
};

// LFOs
let lfos = {
  freqX:        { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  freqY:        { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  modFreqX:     { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  modFreqY:     { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  phase:        { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  speed:        { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  ampX:         { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  ampY:         { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  stepSize:     { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  strokeWeight: { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  trail:        { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  bgColor:      { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  lineColor:    { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  textSize:         { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  textBlend:        { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  connectionRadius: { enabled: false, rate: 0.5, depth: 0.5, phase: 0 },
  connectionRamp:   { enabled: false, rate: 0.5, depth: 0.5, phase: 0 }
};

let paramRanges;

const SLIDER_DEFAULTS = {
  freqXSlider: 1,     freqYSlider: 1,
  modFreqXSlider: 1,  modFreqYSlider: 1,
  phaseSlider: 0,     tempoSlider: 0.005,
  ampXSlider: 0.4,    ampYSlider: 0.4,
  stepSizeSlider: 0.001, strokeWeightSlider: 0.5,
  trailSlider: 100,
  pointCountSlider: 400, connectionRadiusSlider: 100, connectionRampSlider: 6,
  saturationSlider: 1, brightnessSlider: 1, contrastSlider: 1,
  glowSizeSlider: 20,  glowIntensitySlider: 0.8,
  filterOpacity: 0.3,
  imgScaleSlider: 1,  imgOffsetXSlider: 0, imgOffsetYSlider: 0,
  imgColsSlider: 80,  imageStrengthSlider: 1,
  textSizeSlider: 200, textBlendSlider: 0
};

const PRESETS = {
  classic: {
    params: { freqX: 3, freqY: 2, modFreqX: 1, modFreqY: 1, phase: 0.78,
              speed: 0.005, ampX: 0.4, ampY: 0.4, stepSize: 0.01, strokeWeight: 1, trail: 20 },
    curveShape: 'lissajous',
    lineColor: { r: 23,  g: 23,  b: 23  },
    bgColor:   { r: 237, g: 237, b: 237 }
  },
  spiro: {
    params: { freqX: 5, freqY: 4, modFreqX: 3, modFreqY: 2, phase: 0,
              speed: 0.003, ampX: 0.42, ampY: 0.42, stepSize: 0.007, strokeWeight: 0.8, trail: 25 },
    curveShape: 'spirograph',
    lineColor: { r: 30,  g: 30,  b: 120 },
    bgColor:   { r: 235, g: 235, b: 255 }
  },
  rose: {
    params: { freqX: 5, freqY: 1, modFreqX: 1, modFreqY: 1, phase: 0,
              speed: 0.004, ampX: 0.45, ampY: 0.45, stepSize: 0.008, strokeWeight: 1.2, trail: 25 },
    curveShape: 'rose',
    lineColor: { r: 180, g: 20,  b: 80  },
    bgColor:   { r: 15,  g: 10,  b: 20  }
  }
};

// History
let undoHistory  = [];
let historyIndex = -1;
const MAX_HISTORY = 60;

// =============================================================================
// GENERAL HELPERS
// =============================================================================

function setDrawMode(mode) {
  drawMode = mode;
  document.querySelectorAll('.mode-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.getElementById('lineControls').style.display = mode === 'line' ? 'flex' : 'none';
  document.getElementById('meshControls').style.display = mode === 'mesh' ? 'flex' : 'none';
  meshDirty = true;
}

function updateLfoUi(key) {
  let lfo = lfos[key];
  let toggle = document.getElementById(key + 'LfoToggle');
  if (!toggle) return;
  let row = toggle.closest('.lfo-row');
  if (row) {
    let paramsDiv = row.querySelector('.lfo-params');
    if (paramsDiv) paramsDiv.style.display = lfo.enabled ? 'flex' : 'none';
  }
  let label = document.getElementById('label-' + key);
  if (label) label.classList.toggle('lfo-active', lfo.enabled);
}

function applyPreset(name) {
  let p = PRESETS[name];
  if (!p) return;
  Object.assign(params, p.params);
  if (p.lineColor) Object.assign(lineColor, p.lineColor);
  if (p.bgColor)   Object.assign(bgColor,   p.bgColor);
  if (p.curveShape) curveShape = p.curveShape;
  restoreState(captureState());
  pushHistory();
}

async function openOutputWindow() {
  // Drop any closed windows from the list, then enforce the 3-window cap
  outputWindows = outputWindows.filter(function(w) { return !w.closed; });
  if (outputWindows.length >= 3) return;

  // window.open() MUST be called synchronously while the browser's user gesture
  // (transient activation from the button click) is still alive. Calling it after
  // any `await` causes the activation to expire and the browser silently ignores
  // the left/top positioning hints, always opening on the primary screen.
  // Strategy: open immediately with whatever screen info is already cached, then
  // call moveTo() afterwards (moveTo doesn't need a gesture).
  let scr = _secondScreen;
  let feats = [
    'width='  + (scr ? scr.availWidth  : screen.availWidth),
    'height=' + (scr ? scr.availHeight : screen.availHeight),
    'toolbar=no', 'location=no', 'menubar=no', 'scrollbars=no', 'resizable=yes'
  ];
  if (scr) feats.push('left=' + scr.availLeft, 'top=' + scr.availTop);

  // Each window gets a unique name so window.open never reuses an existing one
  let win = window.open('output.html', 'lissa-output-' + Date.now(), feats.join(','));
  if (!win) return;
  outputWindows.push(win);

  // Now it's safe to await — screen detection may show a one-time permission dialog
  if (!_secondScreen && 'getScreenDetails' in window) {
    try {
      let sd = await window.getScreenDetails();
      _secondScreen = sd.screens.find(function(s) { return !s.isPrimary; }) || null;
      sd.addEventListener('screenschange', function() {
        _secondScreen = sd.screens.find(function(s) { return !s.isPrimary; }) || null;
      });
    } catch(e) {}
  }

  // Move the already-open window to the second screen (moveTo needs no gesture)
  if (_secondScreen && !win.closed) {
    win.moveTo(_secondScreen.availLeft, _secondScreen.availTop);
    win.resizeTo(_secondScreen.availWidth, _secondScreen.availHeight);
  }
}

function randomizeColors() {
  let lineH = Math.random() * 360;
  let lineS = 0.5 + Math.random() * 0.5;
  let lineL = 0.35 + Math.random() * 0.3;
  Object.assign(lineColor, hslToRgb(lineH, lineS, lineL));

  let dark  = Math.random() < 0.5;
  let bgH   = Math.random() * 360;
  let bgS   = Math.random() * 0.2;
  let bgL   = dark ? 0.04 + Math.random() * 0.12 : 0.84 + Math.random() * 0.13;
  Object.assign(bgColor, hslToRgb(bgH, bgS, bgL));

  _setEl('lineColor', rgbToHex(lineColor.r, lineColor.g, lineColor.b));
  _setEl('bgColor',   rgbToHex(bgColor.r,   bgColor.g,   bgColor.b));
  meshDirty = true;
  pushHistory();
}

function randomizeParams() {
  let shapes = ['lissajous', 'rose', 'spirograph'];
  curveShape       = shapes[Math.floor(Math.random() * shapes.length)];
  params.freqX     = Math.round(Math.random() * 6 + 1);
  params.freqY     = Math.round(Math.random() * 6 + 1);
  params.modFreqX  = Math.round(Math.random() * 4 + 1);
  params.modFreqY  = Math.round(Math.random() * 4 + 1);
  params.phase     = Math.random() * Math.PI * 2;
  params.ampX      = 0.2 + Math.random() * 0.3;
  params.ampY      = 0.2 + Math.random() * 0.3;
  // X freq and X mod LFOs always on after randomize
  lfos.freqX.enabled  = true;
  lfos.freqX.rate     = 0.030;
  lfos.freqX.depth    = 0.25;
  lfos.modFreqX.enabled = true;
  lfos.modFreqX.rate    = 0.030;
  lfos.modFreqX.depth   = 0.25;
  restoreState(captureState());
  pushHistory();
}

function hexToRgb(hex) {
  let r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}

function luminance(r, g, b) {
  return (0.299*r + 0.587*g + 0.114*b) / 255;
}


function hslToRgb(h, s, l) {
  h = h%360;
  let c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2, r,g,b;
  if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}
  else if(h<180){r=0;g=c;b=x;}else if(h<240){r=0;g=x;b=c;}
  else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;}
  return{r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)};
}

function rgbToHsl(r,g,b) {
  r/=255;g/=255;b/=255;
  let max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,s=0,h=0;
  if(max!==min){let d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}
  return{h:h*360,s,l};
}

// =============================================================================
// UNDO / REDO
// =============================================================================

function captureState() {
  return {
    params:          Object.assign({}, params),
    bgColor:         Object.assign({}, bgColor),
    lineColor:       Object.assign({}, lineColor),
    drawMode,
    curveShape,
    showCurve,
    meshAnimating,
    meshAnimSpeed,
    imgDrawMode,
    imgCols,
    imageStrength,
    lfos:            JSON.parse(JSON.stringify(lfos)),
    colorFilter:     { color: Object.assign({}, colorFilter.color),
                       enabled: colorFilter.enabled,
                       opacity: colorFilter.opacity,
                       blendMode: colorFilter.blendMode },
    glowEnabled,
    glowSize,
    glowIntensity,
    imgScale,
    imgOffsetX,
    imgOffsetY,
    saturation,
    brightness,
    contrastLevel,
    showImage,
    transparentBg,
    textMode: Object.assign({}, textMode)
  };
}

function applyCanvasFilter() {
  document.getElementById("canvas-container").style.filter =
    `brightness(${brightness.toFixed(3)}) contrast(${contrastLevel.toFixed(3)})`;
}

function applyColorFilter() {
  let div = document.getElementById("color-filter");
  if (!colorFilter.enabled) { div.style.display = "none"; return; }
  let { r, g, b } = colorFilter.color;
  div.style.display    = "block";
  div.style.background = `rgba(${r},${g},${b},${colorFilter.opacity})`;
  div.style.mixBlendMode = colorFilter.blendMode;
}

function pushHistory() {
  undoHistory = undoHistory.slice(0, historyIndex + 1);
  undoHistory.push(captureState());
  if (undoHistory.length > MAX_HISTORY) undoHistory.shift();
  historyIndex = undoHistory.length - 1;
}

function _setEl(id, v)    { let e=document.getElementById(id); if(e) e.value=v; }
function _setChk(id, v)   { let e=document.getElementById(id); if(e) e.checked=v; }
function _setTxt(id, v)   { let e=document.getElementById(id); if(e) e.textContent=v; }

function restoreState(snap) {
  Object.assign(params,      snap.params);
  Object.assign(bgColor,     snap.bgColor);
  Object.assign(lineColor,   snap.lineColor);
  drawMode         = snap.drawMode;
  curveShape       = snap.curveShape || "lissajous";
  meshAnimating    = snap.meshAnimating;
  meshAnimSpeed    = snap.meshAnimSpeed;
  imgDrawMode      = snap.imgDrawMode      != null ? snap.imgDrawMode      : 0;
  imgCols          = snap.imgCols          != null ? snap.imgCols          : 80;
  imageStrength    = snap.imageStrength    != null ? snap.imageStrength    : 1.0;
  saturation       = snap.saturation    != null ? snap.saturation    : 1.0;
  brightness       = snap.brightness    != null ? snap.brightness    : 1.0;
  contrastLevel    = snap.contrastLevel != null ? snap.contrastLevel : 1.0;
  for (let k in snap.lfos) Object.assign(lfos[k], snap.lfos[k]);

  // Params sliders
  [["freqXSlider","freqXValue","freqX",2],["freqYSlider","freqYValue","freqY",2],
   ["modFreqXSlider","modFreqXValue","modFreqX",2],["modFreqYSlider","modFreqYValue","modFreqY",2],
   ["phaseSlider","phaseValue","phase",2],["tempoSlider","tempoValue","speed",3],
   ["ampXSlider","ampXValue","ampX",2],["ampYSlider","ampYValue","ampY",2],
   ["stepSizeSlider","stepSizeValue","stepSize",3],
   ["strokeWeightSlider","strokeWeightValue","strokeWeight",1],
   ["trailSlider","trailValue","trail",0],
   ["pointCountSlider","pointCountValue","pointCount",0],
   ["connectionRadiusSlider","connectionRadiusValue","connectionRadius",0],
   ["connectionRampSlider","connectionRampValue","connectionRamp",1]
  ].forEach(([sid,lid,key,dec]) => {
    _setEl(sid, params[key]); _setTxt(lid, Number(params[key]).toFixed(dec));
  });

  // Other sliders
  _setEl("imgColsSlider",       imgCols);       _setTxt("imgColsValue",       imgCols);
  _setEl("imageStrengthSlider", imageStrength); _setTxt("imageStrengthValue", imageStrength.toFixed(2));
  _setEl("saturationSlider",    saturation);       _setTxt("saturationValue",    saturation.toFixed(2));
  _setEl("brightnessSlider",    brightness);       _setTxt("brightnessValue",    brightness.toFixed(2));
  _setEl("contrastSlider",      contrastLevel);    _setTxt("contrastValue",      contrastLevel.toFixed(2));
  applyCanvasFilter();

  // Checkboxes + mode visibility
  showCurve = snap.showCurve ?? true;
  _setChk("showCurve", !showCurve);
  setDrawMode(drawMode);

  // Colors
  _setEl("bgColor",   rgbToHex(bgColor.r,   bgColor.g,   bgColor.b));
  _setEl("lineColor", rgbToHex(lineColor.r, lineColor.g, lineColor.b));

  // Selects
  _setEl("curveShape",   curveShape);
  _setEl("imgDrawMode",  imgDrawMode);

  // LFOs
  ["freqX","freqY","modFreqX","modFreqY","phase","speed",
   "ampX","ampY","stepSize","strokeWeight","trail","bgColor","lineColor",
   "textSize","textBlend","connectionRadius","connectionRamp"].forEach(key => {
    let lfo = lfos[key];
    _setChk(key+"LfoToggle", lfo.enabled);
    _setEl(key+"LfoRate",  Math.log10(lfo.rate));  _setTxt(key+"LfoRateValue",  lfo.rate.toFixed(3));
    _setEl(key+"LfoDepth", lfo.depth); _setTxt(key+"LfoDepthValue", lfo.depth.toFixed(2));
    updateLfoUi(key);
  });

  // Image transform
  imgScale   = snap.imgScale;
  imgOffsetX = snap.imgOffsetX;
  imgOffsetY = snap.imgOffsetY;
  _setEl("imgScaleSlider",   imgScale);   _setTxt("imgScaleValue",   imgScale.toFixed(2));
  _setEl("imgOffsetXSlider", imgOffsetX); _setTxt("imgOffsetXValue", imgOffsetX.toFixed(2));
  _setEl("imgOffsetYSlider", imgOffsetY); _setTxt("imgOffsetYValue", imgOffsetY.toFixed(2));
  showImage = snap.showImage;
  let _hBtn = document.getElementById("hidePhotoBtn");
  if (_hBtn) _hBtn.textContent = showImage ? "Hide photo" : "Show photo";
  transparentBg = snap.transparentBg; _setChk("transparentBg", transparentBg);

  // Glow
  glowEnabled   = snap.glowEnabled;
  glowSize      = snap.glowSize;
  glowIntensity = snap.glowIntensity;
  _setChk("glowEnabled",        glowEnabled);
  _setEl("glowSizeSlider",      glowSize);      _setTxt("glowSizeValue",      glowSize);
  _setEl("glowIntensitySlider", glowIntensity); _setTxt("glowIntensityValue", glowIntensity.toFixed(2));

  // Color filter
  colorFilter.enabled   = snap.colorFilter.enabled;
  colorFilter.opacity   = snap.colorFilter.opacity;
  colorFilter.blendMode = snap.colorFilter.blendMode;
  Object.assign(colorFilter.color, snap.colorFilter.color);
  _setChk("filterEnabled",   colorFilter.enabled);
  _setEl("filterColor",      rgbToHex(colorFilter.color.r, colorFilter.color.g, colorFilter.color.b));
  _setEl("filterOpacity",    colorFilter.opacity);
  _setTxt("filterOpacityValue", colorFilter.opacity.toFixed(2));
  _setEl("filterBlendMode",  colorFilter.blendMode);
  applyColorFilter();

  // Text blend
  if (snap.textMode) {
    Object.assign(textMode, snap.textMode);
    _setEl('textInput',        textMode.text);
    _setEl('textFont',         textMode.font);
    _setChk('textBold',        textMode.bold);
    _setChk('textItalic',      textMode.italic);
    _setEl('textSizeSlider',  textMode.size);  _setTxt('textSizeValue',  textMode.size);
    _setEl('textBlendSlider', textMode.blend); _setTxt('textBlendValue', textMode.blend.toFixed(2));
  }

  // Sync color swatches and curve chips that don't auto-update via _setEl
  [['lineColor','lineColorSwatch'],['bgColor','bgColorSwatch'],['filterColor','filterColorSwatch']].forEach(function(pair) {
    var inp = document.getElementById(pair[0]);
    var sw  = document.getElementById(pair[1]);
    if (inp && sw) sw.style.background = inp.value;
  });
  document.querySelectorAll('#curveShapeChips .chip').forEach(function(chip) {
    chip.classList.toggle('active', chip.dataset.value === curveShape);
  });
  // Sync pill --pct fill positions after any programmatic slider value change
  document.querySelectorAll('.slider-pill').forEach(function(pill) {
    var s = pill.querySelector('input[type="range"]');
    if (!s) return;
    var pct = (Number(s.value) - Number(s.min)) / (Number(s.max) - Number(s.min)) * 100;
    pill.style.setProperty('--pct', pct.toFixed(2) + '%');
  });

  meshDirty = true;
}

function performUndo() {
  if (historyIndex > 0) { historyIndex--; restoreState(undoHistory[historyIndex]); }
}

function performRedo() {
  if (historyIndex < undoHistory.length - 1) { historyIndex++; restoreState(undoHistory[historyIndex]); }
}

// =============================================================================
// BIND HELPERS
// =============================================================================

function bindSlider(sliderId, labelId, key, decimals, obj) {
  let target = obj || params;
  let slider = document.getElementById(sliderId);
  let label  = document.getElementById(labelId);
  if (!slider) return;
  slider.addEventListener("input", function () {
    target[key] = Number(this.value);
    label.textContent = Number(this.value).toFixed(decimals);
    meshDirty = true;
  });
  slider.addEventListener("change", pushHistory);
}

function bindCheckbox(id, obj, key) {
  let el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("change", function () { obj[key] = this.checked; meshDirty = true; pushHistory(); });
}

function bindLfo(key) {
  let lfo = lfos[key];
  document.getElementById(key+"LfoToggle").addEventListener("change", function(){
    lfo.enabled = this.checked; lfo.phase = 0;
    updateLfoUi(key);
    pushHistory();
  });
  document.getElementById(key+"LfoRate").addEventListener("input", function(){
    lfo.rate=Math.pow(10, Number(this.value));
    document.getElementById(key+"LfoRateValue").textContent=lfo.rate.toFixed(3);
  });
  document.getElementById(key+"LfoRate").addEventListener("change", pushHistory);
  document.getElementById(key+"LfoDepth").addEventListener("input", function(){
    lfo.depth=Number(this.value);
    document.getElementById(key+"LfoDepthValue").textContent=Number(this.value).toFixed(2);
  });
  document.getElementById(key+"LfoDepth").addEventListener("change", pushHistory);
}

function applyLfo(key) {
  let lfo=lfos[key], range=paramRanges[key];
  if(!lfo.enabled) return params[key];
  lfo.phase+=(TWO_PI*lfo.rate)/_fr;
  return constrain(params[key]+sin(lfo.phase)*lfo.depth*(range.max-range.min)/2, range.min, range.max);
}

function applyColorLfo(key, baseColor) {
  let lfo=lfos[key];
  if(!lfo.enabled) return baseColor;
  lfo.phase+=(TWO_PI*lfo.rate)/_fr;
  let hsl=rgbToHsl(baseColor.r,baseColor.g,baseColor.b);
  return hslToRgb(hsl.h+sin(lfo.phase)*lfo.depth*180, max(hsl.s,0.8), max(hsl.l,0.5));
}

const _textLfoRanges = { textSize: { min:20, max:600 }, textBlend: { min:0, max:1 } };

function applyTextLfo(key) {
  let lfo   = lfos[key];
  let range = _textLfoRanges[key];
  let base  = key === 'textSize' ? textMode.size : textMode.blend;
  if (!lfo || !lfo.enabled) return base;
  lfo.phase += (TWO_PI * lfo.rate) / _fr;
  return constrain(base + sin(lfo.phase) * lfo.depth * (range.max - range.min) / 2, range.min, range.max);
}

// =============================================================================
// IMAGE HELPERS
// =============================================================================

// Map canvas-normalised coords through scale + offset before hitting the image
function applyImgTransform(nx, ny) {
  return [
    (nx - 0.5) / imgScale + 0.5 + imgOffsetX,
    (ny - 0.5) / imgScale + 0.5 + imgOffsetY
  ];
}

function _pixelGrey(i) {
  return round(imgPixels[i]*0.299 + imgPixels[i+1]*0.587 + imgPixels[i+2]*0.114);
}


// =============================================================================
// IMAGE PIXEL GRID (Generative Gestaltung style)
// =============================================================================

function _pixelGridCell(gx, gy, cols, rows, tileW, tileH, col, alpha, factor1, factor2) {
  let posX = tileW * gx;
  let posY = tileH * gy;
  let cx   = posX + tileW * 0.5;
  let cy   = posY + tileH * 0.5;

  let [tnx, tny] = applyImgTransform(gx / cols, gy / rows);
  let px  = floor(constrain(tnx, 0, 0.9999) * imgW);
  let py  = floor(constrain(tny, 0, 0.9999) * imgH);
  let idx = (py * imgW + px) * 4;
  let grey = _pixelGrey(idx);

  stroke(col.r, col.g, col.b, alpha);
  noFill();

  if (imgDrawMode === 1) {
    let w = map(grey, 0, 255, tileW * 2.0, 0.1);
    strokeWeight(w * factor1);
    line(posX, posY, posX + tileW, posY + tileH);

  } else if (imgDrawMode === 2) {
    let r = 1.1284 * sqrt(tileW * tileW * (1 - grey / 255)) * factor1 * 3;
    noStroke(); fill(col.r, col.g, col.b, alpha);
    ellipse(cx, cy, r, r);

  } else if (imgDrawMode === 3) {
    let len = map(grey, 0, 255, tileW * 3, 0.1) * factor1;
    strokeWeight(tileH * factor2 * 0.8);
    line(posX, posY, posX + len, posY + len);

  } else if (imgDrawMode === 4) {
    let w = map(grey, 0, 255, tileW, 0) * factor1;
    let l = map(grey, 0, 255, tileW * 2.5, 0) * factor2;
    strokeWeight(w + 0.1);
    push(); translate(cx, cy); rotate(grey / 255 * PI);
    line(0, 0, l, l);
    pop();

  } else if (imgDrawMode === 5) {
    let r = 1.1284 * sqrt(tileW * tileW * (1 - grey / 255)) * factor1 * 3;
    noStroke(); fill(imgPixels[idx], imgPixels[idx+1], imgPixels[idx+2], alpha);
    ellipse(cx, cy, r, r);

  } else if (imgDrawMode === 6) {
    let [tnx2, tny2] = applyImgTransform(min((gx + 1) / cols, 1), gy / rows);
    let px2  = floor(constrain(tnx2, 0, 0.9999) * imgW);
    let py2  = floor(constrain(tny2, 0, 0.9999) * imgH);
    let idx2 = (py2 * imgW + px2) * 4;
    let g2   = _pixelGrey(idx2);
    stroke(imgPixels[idx2], imgPixels[idx2+1], imgPixels[idx2+2], alpha);
    strokeWeight(map(grey, 0, 255, tileH * factor2, 0.2) + 0.1);
    let h = tileH * 2 * factor1;
    line(posX - map(grey, 0, 255, h, 0), posY + map(grey, 0, 255, h, 0),
         posX + tileW - map(g2, 0, 255, h, 0), posY + map(g2, 0, 255, h, 0));

  } else if (imgDrawMode === 7) {
    stroke(imgPixels[idx], imgPixels[idx+1], imgPixels[idx+2], alpha);
    let w7 = map(grey, 0, 255, tileW, 0.1);
    strokeWeight(w7);
    fill(255, 255 * factor1);
    push(); translate(cx, cy); rotate(grey / 255 * PI * factor2);
    rect(-tileW * 0.5, -tileH * 0.5, tileW, tileH);
    pop();

  } else if (imgDrawMode === 8) {
    noStroke();
    fill(grey, grey * factor1, 255 * factor2, alpha);
    let qs = tileW * 0.45;
    rect(posX, posY, qs, qs);
    rect(posX + tileW * 0.5, posY, qs, qs);
    rect(posX, posY + tileH * 0.5, qs, qs);
    rect(posX + tileW * 0.5, posY + tileH * 0.5, qs, qs);

  } else if (imgDrawMode === 9) {
    stroke(255, grey, 0, alpha);
    noFill();
    push(); translate(cx, cy); rotate(grey / 255 * PI);
    strokeWeight(1);
    rect(-tileW * factor1 * 0.5, -tileH * factor2 * 0.5, tileW * factor1, tileH * factor2);
    let w9 = map(grey, 0, 255, tileW, 0.1);
    strokeWeight(w9);
    stroke(col.r, col.g, col.b, alpha * 0.7);
    ellipse(0, 0, tileW * 0.8, tileH * 0.5);
    pop();
  }
}

// Photo mode: full-canvas pixel mapping, mouse X/Y drive the two modulation factors.
function drawPhotoMode() {
  if (!imgPixels || imgDrawMode === 0) return;

  let cols  = imgCols;
  let rows  = Math.round(cols * height / width);
  let tileW = width  / cols;
  let tileH = height / rows;

  let factor1 = map(mouseX, 0, width,  0.05, 1.0);
  let factor2 = map(mouseY, 0, height, 0.05, 1.0);
  let col   = lineColor;
  let alpha = imageStrength * 255;

  push();
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      _pixelGridCell(gx, gy, cols, rows, tileW, tileH, col, alpha, factor1, factor2);
    }
  }
  pop();
}

// Overlay grid drawn on top of lissajous/mesh, animated by phaseAcc.
function drawImageGrid(col, alpha, phaseAcc) {
  if (!imgPixels || imgDrawMode === 0) return;

  let cols  = imgCols;
  let rows  = Math.round(cols * height / width);
  let tileW = width  / cols;
  let tileH = height / rows;

  let factor1 = map(sin(phaseAcc),        -1, 1, 0.6, 1.0);
  let factor2 = map(cos(phaseAcc * 0.71), -1, 1, 0.6, 1.0);

  push();
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      _pixelGridCell(gx, gy, cols, rows, tileW, tileH, col, alpha, factor1, factor2);
    }
  }
  pop();
}

// =============================================================================
// TEXT COMPOSITING
// =============================================================================

// Render textMode text into a 2D context, centered on the main canvas.
function _textToCtx(ctx2d, fillColor, sizeOverride) {
  let txt = (textMode.text || '').trim();
  if (!txt) return false;
  let sz = sizeOverride !== undefined ? sizeOverride : textMode.size;
  let parts = [];
  if (textMode.italic) parts.push('italic');
  if (textMode.bold)   parts.push('bold');
  parts.push(Math.max(1, Math.round(sz)) + 'px');
  parts.push('"' + textMode.font + '"');
  ctx2d.font         = parts.join(' ');
  ctx2d.fillStyle    = fillColor;
  ctx2d.textAlign    = 'center';
  ctx2d.textBaseline = 'middle';
  ctx2d.fillText(txt, width / 2, height / 2);
  return true;
}

// Ensure the off-screen mask canvas matches current canvas size.
function _ensureTextCanvas() {
  if (!_textMaskCanvas || _textMaskCanvas.width !== width || _textMaskCanvas.height !== height) {
    _textMaskCanvas = document.createElement('canvas');
    _textMaskCanvas.width  = width;
    _textMaskCanvas.height = height;
    _textMaskCtx = _textMaskCanvas.getContext('2d');
  }
}

// Draw the curve path to a native 2D ctx (used before masking).
function _curvePath2D(ctx2d, pts, cx, cy, col, sw) {
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.save();
  ctx2d.strokeStyle = `rgb(${col.r},${col.g},${col.b})`;
  ctx2d.lineWidth   = sw;
  ctx2d.lineCap     = 'round';
  ctx2d.lineJoin    = 'round';
  ctx2d.beginPath();
  for (let i = 0; i < pts.length; i++) {
    let x = cx + pts[i].x, y = cy + pts[i].y;
    if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
  }
  if (pts.length > 0) ctx2d.closePath();
  ctx2d.stroke();
  ctx2d.restore();
}

// Draw mesh lines to a native 2D ctx.
function _meshPath2D(ctx2d, pts, cx, cy, col, connRadius, connRamp) {
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.save();
  ctx2d.lineWidth = 0.5;
  for (let i = 0; i < pts.length; i++) {
    for (let j = 0; j < i; j++) {
      let dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      let d  = Math.sqrt(dx*dx + dy*dy);
      if (d <= connRadius) {
        let a = Math.pow(1 / (d / connRadius + 1), connRamp);
        ctx2d.strokeStyle = `rgba(${col.r},${col.g},${col.b},${a})`;
        ctx2d.beginPath();
        ctx2d.moveTo(cx + pts[i].x, cy + pts[i].y);
        ctx2d.lineTo(cx + pts[j].x, cy + pts[j].y);
        ctx2d.stroke();
      }
    }
  }
  ctx2d.restore();
}

// Clip whatever is on _textMaskCanvas to the text shape, then composite
// the result onto the main canvas at the given opacity.
function _compositeTextMasked(opacity, sizeOverride) {
  let ctx2d = _textMaskCtx;
  ctx2d.save();
  ctx2d.globalCompositeOperation = 'destination-in';
  _textToCtx(ctx2d, '#fff', sizeOverride);
  ctx2d.restore();
  drawingContext.save();
  drawingContext.globalAlpha = opacity;
  drawingContext.drawImage(_textMaskCanvas, 0, 0);
  drawingContext.restore();
}

// =============================================================================

function calcPoints(freqX, freqY, modFreqX, modFreqY, phase, ampX, ampY, count) {
  let pts = [];
  let minDim = min(width,height);
  let rx  = minDim*ampX, ry = minDim*ampY;

  if (curveShape === "rose") {
    // freqX = n (petal frequency); odd n → n petals, even n → 2n petals
    for (let i = 0; i <= count; i++) {
      let t = map(i, 0, count, 0, TWO_PI * 2);
      let r = cos(freqX * t) * rx;
      pts.push(createVector(r * cos(t + phase), r * sin(t + phase)));
    }
    return pts;
  }

  if (curveShape === "spirograph") {
    // Hypotrochoid: freqX = gear ratio k (outer/inner), modFreqX = arm length,
    // freqY = number of revolutions before closing
    let k  = max(freqX, 1.5);
    let R  = rx;
    let r  = R / k;
    let d  = (modFreqX / 8) * R;
    let tEnd = TWO_PI * ceil(freqY);
    for (let i = 0; i <= count; i++) {
      let t = map(i, 0, count, 0, tEnd);
      let x = (R - r) * cos(t + phase) + d * cos(((R - r) / r) * t + phase);
      let y = (R - r) * sin(t + phase) - d * sin(((R - r) / r) * t + phase);
      pts.push(createVector(x, y));
    }
    return pts;
  }

  // Lissajous (default)
  for (let i=0; i<=count; i++) {
    let t=map(i,0,count,0,TWO_PI);
    let baseX=sin(freqX*t+phase)*cos(modFreqX*t)*rx;
    let baseY=sin(freqY*t)*cos(modFreqY*t)*ry;
    pts.push(createVector(baseX,baseY));
  }
  return pts;
}

// =============================================================================
// MESH
// =============================================================================

function drawMesh(pts, connRadius, connRamp, col, bg, trail) {
  if (transparentBg) {
    drawingContext.globalCompositeOperation = 'destination-out';
    drawingContext.fillStyle = `rgba(0,0,0,${trail/255})`;
    drawingContext.fillRect(0, 0, width, height);
    drawingContext.globalCompositeOperation = 'source-over';
  } else {
    background(bg.r, bg.g, bg.b, trail);
  }
  push(); translate(width/2,height/2);
  strokeWeight(0.5); noFill();
  for(let i=0;i<pts.length;i++){
    for(let j=0;j<i;j++){
      let d=pts[i].dist(pts[j]);
      if(d<=connRadius){
        let a=pow(1/(d/connRadius+1),connRamp);
        stroke(col.r,col.g,col.b,a*255);
        line(pts[i].x,pts[i].y,pts[j].x,pts[j].y);
      }
    }
  }
  pop();
}

function _downloadBlob(blob, filename) {
  let url = URL.createObjectURL(blob);
  let a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function makeTimestamp() {
  return `${year()}${nf(month(),2)}${nf(day(),2)}_${nf(hour(),2)}${nf(minute(),2)}${nf(second(),2)}`;
}

function savePNG() {
  saveCanvas('lissajous_' + makeTimestamp(), 'png');
}

function saveSVG() {
  let w = width, h = height;

  // Glow filter
  let defs = '';
  if (glowEnabled) {
    defs = `  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${(glowSize * 0.4).toFixed(1)}" result="blur"/>
      <feComponentTransfer in="blur" result="g">
        <feFuncA type="linear" slope="${glowIntensity}"/>
      </feComponentTransfer>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
  }

  let filterAttr = glowEnabled ? ' filter="url(#glow)"' : '';
  let col        = `rgb(${lineColor.r},${lineColor.g},${lineColor.b})`;
  let els        = [];

  // Background
  if (!transparentBg) {
    els.push(`  <rect width="${w}" height="${h}" fill="rgb(${bgColor.r},${bgColor.g},${bgColor.b})"/>`);
  }

  if (drawMode === 'mesh') {
    let pts = calcPoints(params.freqX, params.freqY, params.modFreqX, params.modFreqY,
      params.phase, params.ampX, params.ampY, Math.round(params.pointCount));
    let cx = w / 2, cy = h / 2;
    for (let i = 0; i < pts.length; i++) {
      for (let j = 0; j < i; j++) {
        let d = pts[i].dist(pts[j]);
        if (d <= params.connectionRadius) {
          let a = Math.pow(1 / (d / params.connectionRadius + 1), params.connectionRamp);
          els.push(`  <line x1="${(cx+pts[i].x).toFixed(2)}" y1="${(cy+pts[i].y).toFixed(2)}" x2="${(cx+pts[j].x).toFixed(2)}" y2="${(cy+pts[j].y).toFixed(2)}" stroke="${col}" stroke-opacity="${a.toFixed(3)}" stroke-width="0.5"${filterAttr}/>`);
        }
      }
    }
  } else {
    let count = Math.round(TWO_PI / params.stepSize);
    let pts   = calcPoints(params.freqX, params.freqY, params.modFreqX, params.modFreqY,
      params.phase, params.ampX, params.ampY, count);
    let cx = w / 2, cy = h / 2;
    let d  = pts.map((p, i) => `${i===0?'M':'L'}${(cx+p.x).toFixed(2)},${(cy+p.y).toFixed(2)}`).join(' ') + ' Z';
    els.push(`  <path d="${d}" stroke="${col}" stroke-width="${params.strokeWeight}" fill="none"${filterAttr}/>`);
  }

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
${defs}
${els.join('\n')}
</svg>`;

  _downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'lissajous_' + makeTimestamp() + '.svg');
}

function saveSettings() {
  _downloadBlob(
    new Blob([JSON.stringify(captureState(), null, 2)], { type: 'application/json' }),
    'lissajous_settings_' + makeTimestamp() + '.json'
  );
}

function loadSettings() {
  let input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function(e) {
    let file = e.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(ev) {
      try {
        let snap = JSON.parse(ev.target.result);
        restoreState(snap);
        pushHistory();
      } catch(err) {
        console.error('Failed to load settings:', err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function disconnectMedia() {
  if (uploadedVideo) { uploadedVideo.pause(); uploadedVideo.src = ""; uploadedVideo = null; }
  uploadedImg = null; isVideoSource = false;
  imgPixels = null; imgW = 0; imgH = 0;
  videoCanvas = null; videoCtx = null;
  showImage = false;
  let preview = document.getElementById("imgPreview");
  preview.src = ""; preview.style.display = "none";
  document.getElementById("imageUpload").value = "";
  let hideBtn = document.getElementById("hidePhotoBtn");
  hideBtn.textContent = "Hide photo"; hideBtn.disabled = true;
  document.getElementById("disconnectBtn").disabled = true;
  meshDirty = true; pushHistory();
}

function _enableMediaButtons() {
  showImage = true;
  let hideBtn = document.getElementById("hidePhotoBtn");
  hideBtn.textContent = "Hide photo"; hideBtn.disabled = false;
  document.getElementById("disconnectBtn").disabled = false;
}

function updateVideoPixels() {
  if (!isVideoSource || !uploadedVideo || uploadedVideo.readyState < 2) return;
  videoCtx.drawImage(uploadedVideo, 0, 0, imgW, imgH);
  imgPixels = videoCtx.getImageData(0, 0, imgW, imgH).data;
}

// =============================================================================
// SETUP
// =============================================================================

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("canvas-container");
  background(0);

  paramRanges = {
    freqX:{min:1,max:8}, freqY:{min:1,max:8},
    modFreqX:{min:1,max:8}, modFreqY:{min:1,max:8},
    phase:{min:0,max:TWO_PI}, speed:{min:0,max:0.05},
    ampX:{min:0.05,max:0.9}, ampY:{min:0.05,max:0.9},
    stepSize:{min:0.001,max:0.2}, strokeWeight:{min:0.5,max:10},
    trail:{min:1,max:255},
    pointCount:{min:100,max:2000},
    connectionRadius:{min:10,max:300},
    connectionRamp:{min:1,max:12}
  };

  // Lissajous sliders
  bindSlider("freqXSlider",        "freqXValue",        "freqX",        2);
  bindSlider("freqYSlider",        "freqYValue",        "freqY",        2);
  bindSlider("modFreqXSlider",     "modFreqXValue",     "modFreqX",     2);
  bindSlider("modFreqYSlider",     "modFreqYValue",     "modFreqY",     2);
  bindSlider("phaseSlider",    "phaseValue",    "phase",        2);
  bindSlider("tempoSlider",        "tempoValue",        "speed",        3);
  bindSlider("ampXSlider",         "ampXValue",         "ampX",         2);
  bindSlider("ampYSlider",         "ampYValue",         "ampY",         2);
  bindSlider("stepSizeSlider",     "stepSizeValue",     "stepSize",     3);
  bindSlider("strokeWeightSlider", "strokeWeightValue", "strokeWeight", 1);
  bindSlider("trailSlider",        "trailValue",        "trail",        0);
  bindSlider("pointCountSlider",       "pointCountValue",       "pointCount",       0);
  bindSlider("connectionRadiusSlider", "connectionRadiusValue", "connectionRadius", 0);
  bindSlider("connectionRampSlider",   "connectionRampValue",   "connectionRamp",   1);

  // Draw mode
  document.querySelectorAll('.mode-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setDrawMode(this.dataset.mode);
      pushHistory();
    });
  });

  document.getElementById("showCurve").addEventListener("change", function(){
    showCurve = !this.checked; meshDirty = true; pushHistory();
  });

  document.getElementById("curveShape").addEventListener("change", function(){
    curveShape = this.value; meshDirty = true; pushHistory();
  });

  // Colors
  document.getElementById("bgColor").addEventListener("input", function(){
    bgColor=hexToRgb(this.value); meshDirty=true;
  });
  document.getElementById("bgColor").addEventListener("change", pushHistory);
  document.getElementById("lineColor").addEventListener("input", function(){
    lineColor=hexToRgb(this.value); meshDirty=true;
  });
  document.getElementById("lineColor").addEventListener("change", pushHistory);

  // Image upload
  document.getElementById("imageUpload").addEventListener("change", function(e){
    let file=e.target.files[0]; if(!file) return;
    let url=URL.createObjectURL(file);
    let preview=document.getElementById("imgPreview");

    if (file.type.startsWith("video/")) {
      isVideoSource=true; uploadedImg=null;
      if (uploadedVideo) uploadedVideo.src="";
      uploadedVideo=document.createElement("video");
      uploadedVideo.src=url; uploadedVideo.loop=true;
      uploadedVideo.muted=true; uploadedVideo.playsInline=true;
      uploadedVideo.addEventListener("loadedmetadata", function(){
        imgW=uploadedVideo.videoWidth; imgH=uploadedVideo.videoHeight;
        videoCanvas=document.createElement("canvas");
        videoCanvas.width=imgW; videoCanvas.height=imgH;
        videoCtx=videoCanvas.getContext("2d", {willReadFrequently:true});
        imgPixels=new Uint8ClampedArray(imgW*imgH*4);
        _enableMediaButtons();
        meshDirty=true;
      });
      uploadedVideo.play();
      preview.style.display="none";
    } else {
      isVideoSource=false;
      if (uploadedVideo) { uploadedVideo.src=""; uploadedVideo=null; }
      loadImage(url, function(img){
        uploadedImg=img;
        let pg=createGraphics(img.width, img.height);
        pg.pixelDensity(1);
        pg.image(img,0,0); pg.loadPixels();
        imgPixels=pg.pixels.slice();
        imgW=img.width; imgH=img.height;
        pg.remove();
        preview.src=url; preview.style.display="block";
        _enableMediaButtons();
        meshDirty=true;
      });
    }
  });

  // Photo mode buttons
  document.getElementById("hidePhotoBtn").addEventListener("click", function(){
    showImage = !showImage;
    this.textContent = showImage ? "Hide photo" : "Show photo";
    meshDirty = true; pushHistory();
  });
  document.getElementById("disconnectBtn").addEventListener("click", disconnectMedia);

  // Transparent background
  document.getElementById("transparentBg").addEventListener("change", function(){
    transparentBg = this.checked; meshDirty = true; pushHistory();
  });

  // Save / load
  document.getElementById("savePngBtn").addEventListener("click", savePNG);
  document.getElementById("saveSvgBtn").addEventListener("click", saveSVG);
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
  document.getElementById("loadSettingsBtn").addEventListener("click", loadSettings);

  // Image transform
  document.getElementById("imgScaleSlider").addEventListener("input", function(){
    imgScale = Number(this.value);
    document.getElementById("imgScaleValue").textContent = Number(this.value).toFixed(2);
    meshDirty = true;
  });
  document.getElementById("imgScaleSlider").addEventListener("change", pushHistory);
  document.getElementById("imgOffsetXSlider").addEventListener("input", function(){
    imgOffsetX = Number(this.value);
    document.getElementById("imgOffsetXValue").textContent = Number(this.value).toFixed(2);
    meshDirty = true;
  });
  document.getElementById("imgOffsetXSlider").addEventListener("change", pushHistory);
  document.getElementById("imgOffsetYSlider").addEventListener("input", function(){
    imgOffsetY = Number(this.value);
    document.getElementById("imgOffsetYValue").textContent = Number(this.value).toFixed(2);
    meshDirty = true;
  });
  document.getElementById("imgOffsetYSlider").addEventListener("change", pushHistory);

  // Image pixel grid
  document.getElementById("imgDrawMode").addEventListener("change", function(){
    imgDrawMode=Number(this.value); meshDirty=true; pushHistory();
  });
  document.getElementById("imgColsSlider").addEventListener("input", function(){
    imgCols=Number(this.value);
    document.getElementById("imgColsValue").textContent=this.value;
    meshDirty=true;
  });
  document.getElementById("imgColsSlider").addEventListener("change", pushHistory);
  document.getElementById("imageStrengthSlider").addEventListener("input", function(){
    imageStrength=Number(this.value);
    document.getElementById("imageStrengthValue").textContent=Number(this.value).toFixed(2);
    meshDirty=true;
  });
  document.getElementById("imageStrengthSlider").addEventListener("change", pushHistory);

  document.getElementById("saturationSlider").addEventListener("input", function(){
    saturation=Number(this.value);
    document.getElementById("saturationValue").textContent=Number(this.value).toFixed(2);
    meshDirty=true;
  });
  document.getElementById("saturationSlider").addEventListener("change", pushHistory);

  document.getElementById("brightnessSlider").addEventListener("input", function(){
    brightness=Number(this.value);
    document.getElementById("brightnessValue").textContent=Number(this.value).toFixed(2);
    applyCanvasFilter();
  });
  document.getElementById("brightnessSlider").addEventListener("change", pushHistory);

  document.getElementById("contrastSlider").addEventListener("input", function(){
    contrastLevel=Number(this.value);
    document.getElementById("contrastValue").textContent=Number(this.value).toFixed(2);
    applyCanvasFilter();
  });
  document.getElementById("contrastSlider").addEventListener("change", pushHistory);

  applyCanvasFilter();
  // LFOs
  ["freqX","freqY","modFreqX","modFreqY","phase","speed",
   "ampX","ampY","stepSize","strokeWeight","trail",
   "bgColor","lineColor","textSize","textBlend",
   "connectionRadius","connectionRamp"].forEach(bindLfo);

  // Glow
  document.getElementById("glowEnabled").addEventListener("change", function(){
    glowEnabled = this.checked; meshDirty = true; pushHistory();
  });
  document.getElementById("glowSizeSlider").addEventListener("input", function(){
    glowSize = Number(this.value);
    document.getElementById("glowSizeValue").textContent = this.value;
    meshDirty = true;
  });
  document.getElementById("glowSizeSlider").addEventListener("change", pushHistory);
  document.getElementById("glowIntensitySlider").addEventListener("input", function(){
    glowIntensity = Number(this.value);
    document.getElementById("glowIntensityValue").textContent = Number(this.value).toFixed(2);
    meshDirty = true;
  });
  document.getElementById("glowIntensitySlider").addEventListener("change", pushHistory);

  // Color filter
  document.getElementById("filterEnabled").addEventListener("change", function(){
    colorFilter.enabled = this.checked; applyColorFilter(); pushHistory();
  });
  document.getElementById("filterColor").addEventListener("input", function(){
    colorFilter.color = hexToRgb(this.value); applyColorFilter();
  });
  document.getElementById("filterColor").addEventListener("change", pushHistory);
  document.getElementById("filterOpacity").addEventListener("input", function(){
    colorFilter.opacity = Number(this.value);
    document.getElementById("filterOpacityValue").textContent = Number(this.value).toFixed(2);
    applyColorFilter();
  });
  document.getElementById("filterOpacity").addEventListener("change", pushHistory);
  document.getElementById("filterBlendMode").addEventListener("change", function(){
    colorFilter.blendMode = this.value; applyColorFilter(); pushHistory();
  });

  // Undo / redo keyboard shortcut
  document.addEventListener("keydown", function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) performRedo(); else performUndo();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      savePNG();
    }
    if (e.key === "h" || e.key === "H") {
      document.getElementById("panel-toggle").click();
    }
  });

  // Section collapse
  document.querySelectorAll('.section-header[data-target]').forEach(function(header) {
    header.addEventListener('click', function() {
      var body = document.getElementById(this.dataset.target);
      if (!body) return;
      var closing = !body.classList.contains('collapsed');
      body.classList.toggle('collapsed', closing);
      this.classList.toggle('collapsed', closing);
      var chevron = this.querySelector('.chevron');
      if (chevron) chevron.innerHTML = closing ? '&#9658;' : '&#9660;';
    });
  });

  // Double-click to reset slider to default
  document.querySelectorAll('#panel input[type="range"]').forEach(function(slider) {
    slider.addEventListener('dblclick', function() {
      let def = SLIDER_DEFAULTS[this.id];
      if (def === undefined) return;
      this.value = def;
      this.dispatchEvent(new Event('input', { bubbles: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Randomize
  document.getElementById('randomizeBtn').addEventListener('click', function() {
    randomizeColors();
    randomizeParams();
  });
  document.getElementById('outputWindowBtn').addEventListener('click', openOutputWindow);

  // Extend LFO rate sliders to the slow end
  document.querySelectorAll('[id$="LfoRate"]').forEach(function(s) {
    s.min = "-3"; s.max = "0.699"; s.step = "0.01";
  });

  // Shift+drag on any slider = 10× precision scrubbing
  document.querySelectorAll('#panel input[type="range"]').forEach(function(slider) {
    slider.addEventListener("mousedown", function(e) {
      if (!e.shiftKey) return;
      e.preventDefault();
      let rect   = slider.getBoundingClientRect();
      let startX = e.clientX;
      let startV = Number(slider.value);
      let range  = Number(slider.max) - Number(slider.min);
      function onMove(mv) {
        let delta = ((mv.clientX - startX) / rect.width) * range * 0.1;
        slider.value = Math.max(Number(slider.min), Math.min(Number(slider.max), startV + delta));
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        slider.dispatchEvent(new Event("change", { bubbles: true }));
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });


  // BroadcastChannel: receive heartbeats from output windows (survives main page refresh)
  try { outputChannel = new BroadcastChannel('lissa-output'); } catch(e) {}
  if (outputChannel) {
    outputChannel.addEventListener('message', function(e) {
      if (e.data.type !== 'ready') return;
      outputConnected = true;
      clearTimeout(_heartbeatTimer);
      // When all output windows close, heartbeats stop — detect after 3 missed beats (6 s)
      _heartbeatTimer = setTimeout(function() {
        outputConnected = false;
        outputWindows   = [];
      }, 6000);
    });
  }

  // Keep animation running when the page is hidden (e.g. switching Mac spaces).
  // A Web Worker is not subject to background-tab throttling, so it acts as a
  // reliable timer that drives draw() when requestAnimationFrame is paused.
  (function() {
    try {
      let w = new Worker(URL.createObjectURL(new Blob([
        'let t;onmessage=function(e){' +
        'if(e.data==="start"){clearInterval(t);t=setInterval(function(){postMessage(0);},16);}' +
        'else if(e.data==="stop")clearInterval(t);};'
      ], {type:'application/javascript'})));
      let active = false;
      w.onmessage = function() { if (active) draw(); };
      document.addEventListener('visibilitychange', function() {
        active = document.hidden;
        w.postMessage(document.hidden ? 'start' : 'stop');
        if (!document.hidden) loop();
      });
    } catch(e) {
      // Fallback: just restart p5's loop when the tab becomes visible again
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) loop();
      });
    }
  })();

  // Text blend controls
  document.getElementById("textInput").addEventListener("input", function() {
    textMode.text = this.value;
  });
  document.getElementById("textInput").addEventListener("change", pushHistory);

  document.getElementById("textFont").addEventListener("change", function() {
    textMode.font = this.value; pushHistory();
  });
  document.getElementById("textBold").addEventListener("change", function() {
    textMode.bold = this.checked; pushHistory();
  });
  document.getElementById("textItalic").addEventListener("change", function() {
    textMode.italic = this.checked; pushHistory();
  });
  document.getElementById("textSizeSlider").addEventListener("input", function() {
    textMode.size = Number(this.value);
    document.getElementById("textSizeValue").textContent = this.value;
  });
  document.getElementById("textSizeSlider").addEventListener("change", pushHistory);
  document.getElementById("textBlendSlider").addEventListener("input", function() {
    textMode.blend = Number(this.value);
    document.getElementById("textBlendValue").textContent = Number(this.value).toFixed(2);
  });
  document.getElementById("textBlendSlider").addEventListener("change", pushHistory);

  // Pre-cache second screen on load — if permission was already granted on a
  // prior visit this resolves instantly, so _secondScreen is ready before the
  // user even clicks Present (no flash, no permission dialog on click).
  if ('getScreenDetails' in window) {
    window.getScreenDetails().then(function(sd) {
      _secondScreen = sd.screens.find(function(s) { return !s.isPrimary; }) || null;
      sd.addEventListener('screenschange', function() {
        _secondScreen = sd.screens.find(function(s) { return !s.isPrimary; }) || null;
      });
    }).catch(function() {});
  }

  // ── NEW UI: panel toggle (top-right Random+Big4) ─────────
  var _panel       = document.getElementById('panel');
  var _panelToggle = document.getElementById('panel-toggle');

  _panelToggle.addEventListener('click', function() {
    _panel.classList.toggle('hidden');
  });

  // ── NEW UI: bottom nav — section drawer ───────────────────
  var _drawer      = document.getElementById('section-drawer');
  var _activeNav   = null;

  document.querySelectorAll('.nav-pill').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var targetId = this.dataset.section;

      if (_activeNav === targetId && !_drawer.classList.contains('hidden')) {
        // Same pill: close drawer
        _drawer.classList.add('hidden');
        document.querySelectorAll('.nav-pill').forEach(function(b) { b.classList.remove('active'); });
        _activeNav = null;
        return;
      }

      // Position drawer above this pill (centered horizontally, clamped to viewport)
      var rect      = this.getBoundingClientRect();
      var drawerW   = 300;
      var margin    = 16;
      var left      = rect.left + rect.width / 2 - drawerW / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - drawerW - margin));
      _drawer.style.left = left + 'px';

      // Show only the target section
      document.querySelectorAll('.drawer-section').forEach(function(s) { s.style.display = 'none'; });
      var target = document.getElementById(targetId);
      if (target) target.style.display = 'flex';

      // Update active pill
      document.querySelectorAll('.nav-pill').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');

      _drawer.classList.remove('hidden');
      _activeNav = targetId;
    });
  });

  // ── NEW UI: pill slider --pct ─────────────────────────────
  document.querySelectorAll('.slider-pill').forEach(function(pill) {
    var slider = pill.querySelector('input[type="range"]');
    if (!slider) return;
    function updatePct() {
      var pct = (Number(slider.value) - Number(slider.min)) /
                (Number(slider.max) - Number(slider.min)) * 100;
      pill.style.setProperty('--pct', pct.toFixed(2) + '%');
    }
    updatePct();
    slider.addEventListener('input', function() {
      updatePct();
      pill.classList.add('dragging');
    });
    slider.addEventListener('mouseup',  function() { pill.classList.remove('dragging'); });
    slider.addEventListener('touchend', function() { pill.classList.remove('dragging'); });
  });

  // ── NEW UI: curve shape chips ─────────────────────────────
  document.querySelectorAll('#curveShapeChips .chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var val = this.dataset.value;
      var sel = document.getElementById('curveShape');
      sel.value = val;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelectorAll('#curveShapeChips .chip').forEach(function(c) {
        c.classList.toggle('active', c.dataset.value === val);
      });
    });
  });

  // ── NEW UI: color swatch live sync ───────────────────────
  [['lineColor','lineColorSwatch'],['bgColor','bgColorSwatch'],['filterColor','filterColorSwatch']].forEach(function(pair) {
    var inp = document.getElementById(pair[0]);
    var sw  = document.getElementById(pair[1]);
    if (!inp || !sw) return;
    inp.addEventListener('input', function() { sw.style.background = this.value; });
  });

  // ── NEW UI: welcome screen ────────────────────────────────
  (function() {
    var ws = document.getElementById('welcome-screen');
    if (!ws) return;
    // Force white background for the entire welcome animation
    bgColor = { r: 237, g: 237, b: 237 };
    _setEl('bgColor', '#ededed');
    var _bgSwatch = document.getElementById('bgColorSwatch');
    if (_bgSwatch) _bgSwatch.style.background = '#ededed';

    // 10 shape randomizations: fast start, slow end (quadratic ease-out spacing)
    // Colors stay white throughout; only shape/params change
    var count = 10;
    var duration = 3200; // ms; last shape settles 300ms before fade begins
    for (var i = 0; i < count; i++) {
      (function(idx) {
        var t = duration * Math.pow(idx / (count - 1), 2);
        setTimeout(function() {
          randomizeParams();
        }, t);
      })(i);
    }
    var wt = document.getElementById('welcome-text');
    setTimeout(function() {
      ws.style.opacity = '0';
      if (wt) wt.style.opacity = '0';
      setTimeout(function() {
        ws.style.display = 'none';
        if (wt) wt.style.display = 'none';
      }, 820);
    }, 3500);
  })();

  // ── NEW UI: toggle button image fallback ──────────────────
  (function() {
    var img  = document.getElementById('panel-toggle-img');
    var icon = document.getElementById('panel-toggle-icon');
    if (img && img.complete && img.naturalWidth === 0) {
      img.style.display = 'none';
      if (icon) icon.style.display = 'block';
    }
  })();

  randomizeColors();
  randomizeParams();
  pushHistory(); // capture initial randomized state
}

// =============================================================================
// DRAW
// =============================================================================

function draw() {
  _fr = frameRate() || 60;
  updateVideoPixels();

  if (showImage && (uploadedImg || isVideoSource)) {
    if (transparentBg) clear(); else background(bgColor.r, bgColor.g, bgColor.b);
    drawPhotoMode();
    // photo mode not replicated in output window — leave output at last rendered state
    return;
  }

  if (drawMode === "mesh") {
    let aFreqX = applyLfo("freqX"), aFreqY = applyLfo("freqY");
    let aModFX = applyLfo("modFreqX"), aModFY = applyLfo("modFreqY");
    let aPhase = applyLfo("phase");
    let aSpeed = applyLfo("speed");
    let aAmpX  = applyLfo("ampX"),  aAmpY  = applyLfo("ampY");
    let aBg    = applyColorLfo("bgColor",   bgColor);
    let aLine  = applyColorLfo("lineColor", lineColor);
    phaseAccumulator += aSpeed;
    let delta = aPhase + phaseAccumulator;
    let pts = calcPoints(aFreqX, aFreqY, aModFX, aModFY,
      delta, aAmpX, aAmpY, Math.round(params.pointCount));
    let mHsl = rgbToHsl(aLine.r, aLine.g, aLine.b);
    let mCol = hslToRgb(mHsl.h, mHsl.s * saturation, mHsl.l);
    let aTrail      = applyLfo("trail");
    let aConnRadius = applyLfo("connectionRadius");
    let aConnRamp   = applyLfo("connectionRamp");
    let aTextBlend  = applyTextLfo('textBlend');
    let aTextSize   = applyTextLfo('textSize');
    if (showCurve) {
      if (aTextBlend <= 0) {
        drawMesh(pts, aConnRadius, aConnRamp, mCol, aBg, aTrail);
      } else {
        if (transparentBg) {
          drawingContext.globalCompositeOperation = 'destination-out';
          drawingContext.fillStyle = `rgba(0,0,0,${aTrail/255})`;
          drawingContext.fillRect(0, 0, width, height);
          drawingContext.globalCompositeOperation = 'source-over';
        } else {
          background(aBg.r, aBg.g, aBg.b, aTrail);
        }
        if (aTextBlend < 1) {
          push(); drawingContext.globalAlpha = 1 - aTextBlend;
          push(); translate(width/2,height/2); strokeWeight(0.5); noFill();
          for(let i=0;i<pts.length;i++){for(let j=0;j<i;j++){let d=pts[i].dist(pts[j]);if(d<=aConnRadius){let a=pow(1/(d/aConnRadius+1),aConnRamp);stroke(mCol.r,mCol.g,mCol.b,a*255);line(pts[i].x,pts[i].y,pts[j].x,pts[j].y);}}}
          pop(); pop();
        }
        _ensureTextCanvas();
        _meshPath2D(_textMaskCtx, pts, width/2, height/2, mCol, aConnRadius, aConnRamp);
        _compositeTextMasked(aTextBlend, aTextSize);
      }
    } else {
      if (transparentBg) {
        drawingContext.globalCompositeOperation = 'destination-out';
        drawingContext.fillStyle = `rgba(0,0,0,${aTrail/255})`;
        drawingContext.fillRect(0, 0, width, height);
        drawingContext.globalCompositeOperation = 'source-over';
      } else {
        background(aBg.r, aBg.g, aBg.b, aTrail);
      }
    }
    if (imgDrawMode > 0 && imgPixels) drawImageGrid(mCol, imageStrength * 255, phaseAccumulator);
    mirrorToOutput({
      type:'state', mode:'mesh', curveShape, showCurve,
      freqX:aFreqX, freqY:aFreqY, modFreqX:aModFX, modFreqY:aModFY,
      phase:delta, speed:aSpeed, ampX:aAmpX, ampY:aAmpY,
      pointCount:Math.round(params.pointCount),
      connRadius:aConnRadius, connRamp:aConnRamp,
      bgColor:aBg, lineColor:mCol, transparentBg,
      brightness, contrastLevel,
      cf: colorFilter.enabled ? { r:colorFilter.color.r, g:colorFilter.color.g,
            b:colorFilter.color.b, o:colorFilter.opacity, m:colorFilter.blendMode } : null
    });
    return;
  }

  // Line mode
  let aFreqX=applyLfo("freqX"), aFreqY=applyLfo("freqY");
  let aModFX=applyLfo("modFreqX"), aModFY=applyLfo("modFreqY");
  let aPhase=applyLfo("phase"), aSpeed=applyLfo("speed");
  let aAmpX=applyLfo("ampX"), aAmpY=applyLfo("ampY");
  let aStep=applyLfo("stepSize"), aSW=applyLfo("strokeWeight");
  let aTrail=applyLfo("trail");
  let aBg=applyColorLfo("bgColor",bgColor);
  let aLine=applyColorLfo("lineColor",lineColor);
  let lHsl=rgbToHsl(aLine.r,aLine.g,aLine.b);
  aLine=hslToRgb(lHsl.h,lHsl.s*saturation,lHsl.l);

  if (transparentBg) {
    drawingContext.globalCompositeOperation = 'destination-out';
    drawingContext.fillStyle = `rgba(0,0,0,${aTrail/255})`;
    drawingContext.fillRect(0, 0, width, height);
    drawingContext.globalCompositeOperation = 'source-over';
  } else {
    background(aBg.r,aBg.g,aBg.b, aTrail);
  }

  phaseAccumulator += aSpeed;
  let delta = aPhase + phaseAccumulator;

  let cx=width/2, cy=height/2;
  let pts=calcPoints(aFreqX,aFreqY,aModFX,aModFY,delta,aAmpX,aAmpY,Math.round(TWO_PI/aStep));
  let aTextBlend = applyTextLfo('textBlend');
  let aTextSize  = applyTextLfo('textSize');
  if (showCurve) {
    if (glowEnabled) {
      drawingContext.shadowBlur  = glowSize;
      drawingContext.shadowColor = `rgba(${aLine.r},${aLine.g},${aLine.b},${glowIntensity})`;
    }
    if (aTextBlend <= 0) {
      stroke(aLine.r,aLine.g,aLine.b);
      strokeWeight(aSW); noFill();
      beginShape();
      for(let i=0;i<pts.length;i++) vertex(cx+pts[i].x, cy+pts[i].y);
      endShape(CLOSE);
    } else {
      if (aTextBlend < 1) {
        push(); drawingContext.globalAlpha = 1 - aTextBlend;
        stroke(aLine.r,aLine.g,aLine.b); strokeWeight(aSW); noFill();
        beginShape(); for(let i=0;i<pts.length;i++) vertex(cx+pts[i].x,cy+pts[i].y); endShape(CLOSE);
        pop();
      }
      drawingContext.shadowBlur = 0;
      _ensureTextCanvas();
      _curvePath2D(_textMaskCtx, pts, cx, cy, aLine, aSW);
      _compositeTextMasked(aTextBlend, aTextSize);
    }
    drawingContext.shadowBlur = 0;
  }

  if (imgDrawMode > 0 && imgPixels) {
    drawImageGrid(aLine, imageStrength * 255, phaseAccumulator);
  }

  mirrorToOutput({
    type:'state', mode:'line', curveShape, showCurve,
    freqX:aFreqX, freqY:aFreqY, modFreqX:aModFX, modFreqY:aModFY,
    phase:delta, speed:aSpeed, ampX:aAmpX, ampY:aAmpY,
    stepCount:Math.round(TWO_PI/aStep), strokeWeight:aSW, trail:aTrail,
    bgColor:aBg, lineColor:aLine,
    glowEnabled, glowSize, glowIntensity, transparentBg,
    brightness, contrastLevel,
    cf: colorFilter.enabled ? { r:colorFilter.color.r, g:colorFilter.color.g,
          b:colorFilter.color.b, o:colorFilter.opacity, m:colorFilter.blendMode } : null
  });
}

function mirrorToOutput(state) {
  if (!outputConnected) return;
  var wins = outputWindows.filter(function(w) { return !w.closed; });
  if (!wins.length) return;

  // Push CSS filter + color overlay state via BroadcastChannel (cheap JSON)
  if (outputChannel) {
    try {
      outputChannel.postMessage({
        type: 'meta',
        filter: document.getElementById('canvas-container').style.filter || '',
        cf: colorFilter.enabled
          ? { r: colorFilter.color.r, g: colorFilter.color.g,
              b: colorFilter.color.b, o: colorFilter.opacity, m: colorFilter.blendMode }
          : null
      });
    } catch(e) {}
  }

  // Push pixel-perfect frame via postMessage + ImageBitmap transfer.
  // postMessage('*') works across null origins (file://) unlike window.opener DOM access.
  var src = document.querySelector('#defaultCanvas0');
  if (!src) return;
  createImageBitmap(src).then(function(firstBmp) {
    if (wins.length === 1) {
      if (!wins[0].closed) wins[0].postMessage({ type: 'frame', bmp: firstBmp }, '*', [firstBmp]);
      else firstBmp.close();
      return;
    }
    // Multiple windows: clone bitmap for each extra window before transferring any
    var clonePromises = wins.slice(1).map(function() { return createImageBitmap(firstBmp); });
    Promise.all(clonePromises).then(function(clones) {
      if (!wins[0].closed) wins[0].postMessage({ type: 'frame', bmp: firstBmp }, '*', [firstBmp]);
      else firstBmp.close();
      clones.forEach(function(bmp, i) {
        var w = wins[i + 1];
        if (!w.closed) w.postMessage({ type: 'frame', bmp: bmp }, '*', [bmp]);
        else bmp.close();
      });
    }).catch(function() { firstBmp.close(); });
  }).catch(function() {});
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  meshDirty = true;
  _textMaskCanvas = null; // force resize of mask canvas on next draw
}