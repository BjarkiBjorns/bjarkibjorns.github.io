// =============================================================================
// STATE
// =============================================================================

let params = {
  freqX:        1,    freqY:        1,
  modFreqX:     1,    modFreqY:     1,
  phase:        0,    speed:        0.005,
  ampX:         0.4,  ampY:         0.4,
  stepSize:     0.01, strokeWeight: 1,
  trail:        20,
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
let meshPhase     = 0;

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

// Presentation window
let outputWindow    = null;
let outputChannel   = null;
let outputConnected = false;
let mirrorPending   = false;
let _heartbeatTimer = null;

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
  lineColor:    { enabled: false, rate: 0.5, depth: 0.5, phase: 0 }
};

let paramRanges;

const SLIDER_DEFAULTS = {
  freqXSlider: 1,     freqYSlider: 1,
  modFreqXSlider: 1,  modFreqYSlider: 1,
  phaseSlider: 0,     tempoSlider: 0.005,
  ampXSlider: 0.4,    ampYSlider: 0.4,
  stepSizeSlider: 0.01, strokeWeightSlider: 1,
  trailSlider: 20,
  pointCountSlider: 400, connectionRadiusSlider: 100, connectionRampSlider: 6,
  saturationSlider: 1, brightnessSlider: 1, contrastSlider: 1,
  glowSizeSlider: 20,  glowIntensitySlider: 0.8,
  filterOpacity: 0.3,
  imgScaleSlider: 1,  imgOffsetXSlider: 0, imgOffsetYSlider: 0,
  imgColsSlider: 80,  imageStrengthSlider: 1
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
              speed: 0.003, ampX: 0.42, ampY: 0.42, stepSize: 0.007, strokeWeight: 0.8, trail: 12 },
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

function openOutputWindow() {
  if (outputWindow && !outputWindow.closed) {
    outputWindow.focus();
    return;
  }
  let features = [
    'width='  + screen.availWidth,
    'height=' + screen.availHeight,
    'toolbar=no', 'location=no', 'menubar=no',
    'scrollbars=no', 'resizable=yes'
  ].join(',');
  outputWindow = window.open('output.html', 'lissa-output', features);
  outputWindow.addEventListener('beforeunload', function() {
    outputWindow    = null;
    outputConnected = false;
    clearTimeout(_heartbeatTimer);
    let b = document.getElementById('outputWindowBtn');
    if (b) b.textContent = '▶ Present';
  });
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
  let shapes = ['lissajous', 'ellipse', 'rose', 'spirograph'];
  curveShape       = shapes[Math.floor(Math.random() * shapes.length)];
  params.freqX     = Math.round(Math.random() * 6 + 1);
  params.freqY     = Math.round(Math.random() * 6 + 1);
  params.modFreqX  = Math.round(Math.random() * 4 + 1);
  params.modFreqY  = Math.round(Math.random() * 4 + 1);
  params.phase     = Math.random() * Math.PI * 2;
  params.ampX      = 0.2 + Math.random() * 0.3;
  params.ampY      = 0.2 + Math.random() * 0.3;
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
    transparentBg
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
  setDrawMode(drawMode);

  // Colors
  _setEl("bgColor",   rgbToHex(bgColor.r,   bgColor.g,   bgColor.b));
  _setEl("lineColor", rgbToHex(lineColor.r, lineColor.g, lineColor.b));

  // Selects
  _setEl("curveShape",   curveShape);
  _setEl("imgDrawMode",  imgDrawMode);

  // LFOs
  ["freqX","freqY","modFreqX","modFreqY","phase","speed",
   "ampX","ampY","stepSize","strokeWeight","trail","bgColor","lineColor"].forEach(key => {
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
  let fr = frameRate() || 60;
  lfo.phase+=(TWO_PI*lfo.rate)/fr;
  return constrain(params[key]+sin(lfo.phase)*lfo.depth*(range.max-range.min)/2, range.min, range.max);
}

function applyColorLfo(key, baseColor) {
  let lfo=lfos[key];
  if(!lfo.enabled) return baseColor;
  let fr = frameRate() || 60;
  lfo.phase+=(TWO_PI*lfo.rate)/fr;
  let hsl=rgbToHsl(baseColor.r,baseColor.g,baseColor.b);
  return hslToRgb(hsl.h+sin(lfo.phase)*lfo.depth*180, max(hsl.s,0.8), max(hsl.l,0.5));
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

function rawBrightness(nx, ny) {
  if (!imgPixels) return 0.5;
  let px = floor(constrain(nx,0,0.9999)*(imgW));
  let py = floor(constrain(ny,0,0.9999)*(imgH));
  let idx = (py*imgW+px)*4;
  return luminance(imgPixels[idx], imgPixels[idx+1], imgPixels[idx+2]);
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
  let grey = round(imgPixels[idx] * 0.222 + imgPixels[idx+1] * 0.707 + imgPixels[idx+2] * 0.071);

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
    let g2   = round(imgPixels[idx2] * 0.222 + imgPixels[idx2+1] * 0.707 + imgPixels[idx2+2] * 0.071);
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

function calcPoints(freqX, freqY, modFreqX, modFreqY, phase, ampX, ampY, count) {
  let pts = [];
  let rx  = min(width,height)*ampX, ry = min(width,height)*ampY;

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

function drawMesh(pts, connRadius, connRamp, col, bg) {
  if (transparentBg) clear(); else background(bg.r,bg.g,bg.b);
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

  let url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  let a   = document.createElement('a');
  a.href = url; a.download = 'lissajous_' + makeTimestamp() + '.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function saveSettings() {
  let filename = 'lissajous_settings_' + makeTimestamp() + '.json';
  let url = URL.createObjectURL(new Blob([JSON.stringify(captureState(), null, 2)], { type: 'application/json' }));
  let a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
   "bgColor","lineColor"].forEach(bindLfo);

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
      let el = document.getElementById("controls");
      el.style.display = el.style.display === "none" ? "" : "none";
    }
  });

  // Section collapse
  document.querySelectorAll('.section-header').forEach(function(header) {
    header.addEventListener('click', function() {
      let body = document.getElementById(this.dataset.target);
      if (!body) return;
      let open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'flex';
      this.classList.toggle('collapsed', open);
      let chevron = this.querySelector('.chevron');
      if (chevron) chevron.innerHTML = open ? '&#9658;' : '&#9660;';
    });
  });

  // Double-click to reset slider to default
  document.querySelectorAll('#controls input[type="range"]').forEach(function(slider) {
    slider.addEventListener('dblclick', function() {
      let def = SLIDER_DEFAULTS[this.id];
      if (def === undefined) return;
      this.value = def;
      this.dispatchEvent(new Event('input', { bubbles: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Presets + randomize
  document.querySelectorAll('.preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { applyPreset(this.dataset.preset); });
  });
  document.getElementById('randomizeBtn').addEventListener('click', randomizeParams);
  document.getElementById('randomColorsBtn').addEventListener('click', randomizeColors);
  document.getElementById('outputWindowBtn').addEventListener('click', function() {
    if (outputConnected) {
      if (outputChannel) outputChannel.postMessage({ type: 'close' });
      outputConnected = false;
      clearTimeout(_heartbeatTimer);
      if (outputWindow && !outputWindow.closed) outputWindow.close();
      outputWindow = null;
      this.textContent = '▶ Present';
    } else {
      openOutputWindow();
    }
  });

  // Extend LFO rate sliders to the slow end
  document.querySelectorAll('[id$="LfoRate"]').forEach(function(s) {
    s.min = "-3"; s.max = "0.699"; s.step = "0.01";
  });

  // Shift+drag on any slider = 10× precision scrubbing
  document.querySelectorAll('#controls input[type="range"]').forEach(function(slider) {
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

  // Resizable panel
  (function() {
    var handle   = document.getElementById('resize-handle');
    var panel    = document.getElementById('controls');
    var minW = 220, maxW = 560;
    handle.style.left = panel.offsetWidth + 'px';
    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      handle.classList.add('dragging');
      function onMove(mv) {
        var w = Math.max(minW, Math.min(maxW, mv.clientX));
        panel.style.width = w + 'px';
        handle.style.left = w + 'px';
      }
      function onUp() {
        handle.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',  onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  })();

  // BroadcastChannel: receive heartbeats from output.html (survives main page refresh)
  try { outputChannel = new BroadcastChannel('lissa-output'); } catch(e) {}
  if (outputChannel) {
    outputChannel.addEventListener('message', function(e) {
      if (e.data.type !== 'ready') return;
      outputConnected = true;
      clearTimeout(_heartbeatTimer);
      // If output window closes, heartbeats stop — detect after 3 missed beats (6 s)
      _heartbeatTimer = setTimeout(function() {
        outputConnected = false;
        outputWindow    = null;
        let b = document.getElementById('outputWindowBtn');
        if (b) b.textContent = '▶ Present';
      }, 6000);
      let btn = document.getElementById('outputWindowBtn');
      if (btn) btn.textContent = '◼ Close output';
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

  pushHistory(); // capture initial state
}

// =============================================================================
// DRAW
// =============================================================================

function draw() {
  updateVideoPixels();

  if (showImage && (uploadedImg || isVideoSource)) {
    if (transparentBg) clear(); else background(bgColor.r, bgColor.g, bgColor.b);
    drawPhotoMode();
    mirrorToOutput();
    return;
  }

  if (drawMode === "mesh") {
    let aSpeed = applyLfo("speed");
    phaseAccumulator += aSpeed;
    let delta = params.phase + phaseAccumulator;
    let pts = calcPoints(params.freqX, params.freqY, params.modFreqX, params.modFreqY,
      delta, params.ampX, params.ampY, Math.round(params.pointCount));
    let mHsl = rgbToHsl(lineColor.r, lineColor.g, lineColor.b);
    let mCol = hslToRgb(mHsl.h, mHsl.s * saturation, mHsl.l);
    if (showCurve) drawMesh(pts, params.connectionRadius, params.connectionRamp, mCol, bgColor);
    else { if (transparentBg) clear(); else background(bgColor.r, bgColor.g, bgColor.b); }
    if (imgDrawMode > 0 && imgPixels) drawImageGrid(mCol, imageStrength * 255, phaseAccumulator);
    mirrorToOutput();
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
  if (showCurve) {
    if (glowEnabled) {
      drawingContext.shadowBlur  = glowSize;
      drawingContext.shadowColor = `rgba(${aLine.r},${aLine.g},${aLine.b},${glowIntensity})`;
    }
    stroke(aLine.r,aLine.g,aLine.b);
    strokeWeight(aSW); noFill();
    beginShape();
    for(let i=0;i<pts.length;i++) vertex(cx+pts[i].x, cy+pts[i].y);
    endShape(CLOSE);
    drawingContext.shadowBlur = 0;
  }

  if (imgDrawMode > 0 && imgPixels) {
    drawImageGrid(aLine, imageStrength * 255, phaseAccumulator);
  }

  mirrorToOutput();
}

function mirrorToOutput() {
  if (!outputConnected || !outputChannel || mirrorPending) return;
  let src = document.querySelector('#canvas-container canvas');
  if (!src) return;
  mirrorPending = true;
  createImageBitmap(src).then(function(bitmap) {
    mirrorPending = false;
    if (!outputConnected) { bitmap.close(); return; }
    try {
      outputChannel.postMessage(
        { type: 'frame', bitmap: bitmap, width: src.width, height: src.height },
        [bitmap]
      );
    } catch(e) { bitmap.close(); }
  }).catch(function() { mirrorPending = false; });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  meshDirty=true;
}