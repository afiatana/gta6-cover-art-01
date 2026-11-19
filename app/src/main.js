// Wires the page: pick photos, choose a layout and grade, crop each panel, write the
// caption, and export the cover as a PNG in 1080x1080, 1080x1350 or 1920x1080.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCover, EXPORT_SIZES, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);

const SAMPLES = ['portrait', 'street', 'rider'];

// One entry per panel slot; grid uses all four, hero and triptych use three.
const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'Sunset Heist',
  tagline: 'VICE CITY · SUMMER 2026',
  photos: [null, null, null],
  useOnePhoto: false,
  panels: [
    { photo: 0, zoom: 1, panX: 0, panY: 0 },
    { photo: 1, zoom: 1, panX: 0, panY: 0 },
    { photo: 2, zoom: 1, panX: 0, panY: 0 },
    { photo: 0, zoom: 1.15, panX: 0, panY: 0 },
  ],
};

let activePanel = 0;

function currentSize() {
  const [w, h] = $('size').value.split('x').map(Number);
  return { w, h };
}

function redraw() {
  const { w, h } = currentSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state, w, h);
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Paints the sample photos in as the defaults, so the app opens ready to export. */
async function loadDefaultSamples() {
  for (let i = 0; i < SAMPLES.length; i++) {
    if (!state.photos[i]) {
      try { state.photos[i] = await loadImage(`samples/${SAMPLES[i]}.jpg`); } catch { /* offline sample missing: panel stays empty */ }
    }
  }
  redraw();
}

// --- photo inputs -----------------------------------------------------------
for (let i = 0; i < 3; i++) {
  $(`photo${i}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      state.photos[i] = await loadImage(URL.createObjectURL(file));
      status.textContent = `Photo ${i + 1} loaded — ${file.name}`;
    } catch {
      status.textContent = 'That file could not be read as a photo.';
    }
    redraw();
  });
}

// --- sample buttons ---------------------------------------------------------
$('sample-portrait').addEventListener('click', async () => {
  state.photos[0] = await loadImage('samples/portrait.jpg');
  state.useOnePhoto = false; $('one-photo').checked = false;
  redraw(); status.textContent = 'Sample portrait loaded into photo 1.';
});
$('sample-street').addEventListener('click', async () => {
  state.photos[1] = await loadImage('samples/street.jpg');
  redraw(); status.textContent = 'Sample street loaded into photo 2.';
});
$('sample-rider').addEventListener('click', async () => {
  state.photos[2] = await loadImage('samples/rider.jpg');
  redraw(); status.textContent = 'Sample rider loaded into photo 3.';
});

// --- layout, grade, size, caption -------------------------------------------
$('layout').addEventListener('change', (e) => { state.layout = e.target.value; syncPanelSelect(); redraw(); });
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
$('size').addEventListener('change', redraw);
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('one-photo').addEventListener('change', (e) => { state.useOnePhoto = e.target.checked; redraw(); });

// --- per-panel cropping -------------------------------------------------------
function syncPanelSelect() {
  const count = LAYOUTS[state.layout].panels;
  const select = $('panel-select');
  [...select.options].forEach((opt) => { opt.disabled = Number(opt.value) >= count; });
  if (activePanel >= count) { activePanel = 0; select.value = '0'; }
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[activePanel];
  $('panel-photo').value = String(panel.photo);
  $('zoom').value = String(panel.zoom);
  $('zoom-value').textContent = `${panel.zoom.toFixed(2)}×`;
  $('pan-x').value = String(panel.panX);
  $('pan-y').value = String(panel.panY);
}

$('panel-select').addEventListener('change', (e) => { activePanel = Number(e.target.value); syncPanelControls(); });
$('panel-photo').addEventListener('change', (e) => { state.panels[activePanel].photo = Number(e.target.value); redraw(); });
$('zoom').addEventListener('input', (e) => {
  state.panels[activePanel].zoom = Number(e.target.value);
  $('zoom-value').textContent = `${state.panels[activePanel].zoom.toFixed(2)}×`;
  redraw();
});
$('pan-x').addEventListener('input', (e) => { state.panels[activePanel].panX = Number(e.target.value); redraw(); });
$('pan-y').addEventListener('input', (e) => { state.panels[activePanel].panY = Number(e.target.value); redraw(); });

// Clicking a panel in the preview selects it for cropping.
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const bandH = canvas.height * 0.18;
  if (y >= canvas.height - bandH) return;
  const areaH = canvas.height - bandH;
  // Panel hit-test mirrors cover.js panelRects: hero splits the lower strip in two.
  let hit = 0;
  if (state.layout === 'triptych') hit = Math.min(2, Math.floor((x / canvas.width) * 3));
  else if (state.layout === 'grid') hit = (y > areaH / 2 ? 2 : 0) + (x > canvas.width / 2 ? 1 : 0);
  else hit = y < areaH * 0.62 ? 0 : (x > canvas.width / 2 ? 2 : 1);
  activePanel = hit;
  $('panel-select').value = String(hit);
  syncPanelControls();
});

// --- export -------------------------------------------------------------------
$('export').addEventListener('click', () => {
  const { w, h } = currentSize();
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, w, h);
  off.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved sunset-cover-${w}x${h}.png (${w} × ${h}).`;
  }, 'image/png');
});

// Exposed for the screenshot scenes: load one sample, set the caption, redraw.
window.__coverApp = {
  state,
  redraw,
  async loadSample(name, title, tagline, layout, grade, size) {
    // Every shot loads all three samples, with the named one in the first panel:
    // a cover shot must never show an empty panel.
    const order = ['portrait', 'street', 'rider'];
    const named = order.indexOf(name);
    if (named > 0) { order.splice(named, 1); order.unshift(name); }
    for (let i = 0; i < order.length; i++) {
      state.photos[i] = await loadImage(`samples/${order[i]}.jpg`);
    }
    // Panels take photos in order, so panel 1 always shows the named sample.
    state.panels[0].photo = 0;
    state.panels[1].photo = 1;
    state.panels[2].photo = 2;
    state.panels[3].photo = 0;
    state.title = title;
    state.tagline = tagline;
    state.layout = layout || state.layout;
    state.grade = grade || state.grade;
    if (size && [...$('size').options].some((o) => o.value === size)) $('size').value = size;
    $('title').value = title;
    $('tagline').value = tagline;
    $('layout').value = state.layout;
    $('grade').value = state.grade;
    syncPanelSelect();
    redraw();
  },
};

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (sample, text, tag, layout, grade, size) => {
    await window.__coverApp.loadSample(sample, text, tag, layout, grade, size);
  });
} else {
  document.fonts.ready.then(redraw);
  loadDefaultSamples();
}
syncPanelControls();
