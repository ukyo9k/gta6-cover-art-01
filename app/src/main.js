// Wires the editor: photo loading, layout and grade buttons, per-panel
// zoom and pan (sliders, drag on the preview, mouse wheel), caption edits,
// and PNG export in the three post sizes. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).

import { SIZES, GRADES, LAYOUTS, drawCover, panelRects, panelCountFor } from './cover.js';
import { defaultState, fitPanels, fillAllPanels } from './state.js';
import { runShot } from './shots.js';

const state = defaultState();
const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const zoomEl = document.getElementById('zoom');
const panXEl = document.getElementById('panx');
const panYEl = document.getElementById('pany');
const panelLabel = document.getElementById('panel-label');

function setStatus(text) {
  statusEl.textContent = text;
}

/** Redraws the preview at the chosen export size; the export uses the same call. */
function redraw() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(ctx, size.w, size.h, state);
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  zoomEl.value = String(panel.zoom);
  panXEl.value = String(panel.ox);
  panYEl.value = String(panel.oy);
  panelLabel.textContent = `Panel ${state.selected + 1} of ${panelCountFor(state.layout)}${panel.img ? '' : ' — empty'}`;
  document.querySelectorAll('#panel-picker button').forEach((b, i) => {
    b.classList.toggle('active', i === state.selected);
    b.disabled = i >= panelCountFor(state.layout);
  });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function loadPhotoIntoPanel(file, index) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    state.panels[index] = { img, zoom: 1, ox: 0, oy: 0 };
    state.selected = index;
    redraw();
    setStatus(`Photo loaded into panel ${index + 1}. Drag it to position, zoom with the slider or wheel.`);
  } catch {
    setStatus('That file could not be read as a photo.');
  }
}

function loadSample(name, index) {
  loadImage(`samples/${name}.jpg`).then((img) => {
    state.panels[index] = { img, zoom: 1, ox: 0, oy: 0 };
    redraw();
  }).catch(() => setStatus(`Sample ${name} failed to load.`));
}

// --- Controls ---------------------------------------------------------------

function bindChoiceButtons(containerId, values, current, apply) {
  const container = document.getElementById(containerId);
  values.forEach((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.value = value;
    button.textContent = value === 'hero' ? 'Hero + 3' : value === 'four' ? 'Four panels' : value === 'full' ? 'Full bleed' : value === 'triple' ? 'Triple strip' : GRADES[value]?.name ?? value;
    if (value === current()) button.classList.add('active');
    button.addEventListener('click', () => {
      apply(value);
      container.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === button));
      redraw();
    });
    container.appendChild(button);
  });
}

bindChoiceButtons('layout-picker', LAYOUTS, () => state.layout, (v) => { state.layout = v; fitPanels(state); setStatus('Layout changed.'); });
bindChoiceButtons('grade-picker', Object.keys(GRADES), () => state.grade, (v) => { state.grade = v; setStatus(`Grade: ${GRADES[v].name}.`); });
bindChoiceButtons('size-picker', Object.keys(SIZES), () => state.size, (v) => { state.size = v; setStatus(`Cover size ${SIZES[v].label}.`); });

document.getElementById('panel-picker').addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  state.selected = Number(button.dataset.index);
  redraw();
});

document.getElementById('photo-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadPhotoIntoPanel(file, state.selected);
  e.target.value = '';
});
document.getElementById('fill-all').addEventListener('click', () => {
  if (fillAllPanels(state)) { redraw(); setStatus('One photo now fills every panel.'); }
  else setStatus('Load a photo into the selected panel first.');
});
document.getElementById('sample-boulevard').addEventListener('click', () => { loadSample('boulevard', state.selected); setStatus('Sample photo loaded.'); });
document.getElementById('sample-pier').addEventListener('click', () => { loadSample('pier', state.selected); setStatus('Sample photo loaded.'); });

document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
document.getElementById('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });
document.getElementById('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; redraw(); });
zoomEl.addEventListener('input', () => { state.panels[state.selected].zoom = Number(zoomEl.value); redraw(); });
panXEl.addEventListener('input', () => { state.panels[state.selected].ox = Number(panXEl.value); redraw(); });
panYEl.addEventListener('input', () => { state.panels[state.selected].oy = Number(panYEl.value); redraw(); });

// --- Drag to pan, click to select, wheel to zoom -----------------------------

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function panelAt(point) {
  const size = SIZES[state.size];
  const frame = size.w * 0.016;
  const gap = size.w * 0.011;
  const bandH = size.h * (state.size === 'landscape' ? 0.235 : state.size === 'portrait' ? 0.185 : 0.20);
  const area = { x: frame, y: frame + bandH + gap, w: size.w - frame * 2, h: size.h - frame * 2 - bandH - gap };
  const rects = panelRects(state.layout, area, gap);
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return { index: i, rect: r };
  }
  return null;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(canvasPoint(e));
  if (!hit) return;
  state.selected = hit.index;
  canvas.setPointerCapture(e.pointerId);
  drag = { start: canvasPoint(e), panel: state.panels[hit.index], rect: hit.rect, ox: state.panels[hit.index].ox, oy: state.panels[hit.index].oy };
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || !drag.panel.img) return;
  const p = canvasPoint(e);
  const dx = p.x - drag.start.x;
  const dy = p.y - drag.start.y;
  const img = drag.panel.img;
  const zoom = drag.panel.zoom;
  const base = Math.max(drag.rect.w / img.naturalWidth, drag.rect.h / img.naturalHeight) * zoom;
  const maxOX = Math.max(0, (img.naturalWidth * base - drag.rect.w) / 2);
  const maxOY = Math.max(0, (img.naturalHeight * base - drag.rect.h) / 2);
  // Dragging moves the photo the same way the pointer moves, clamped to the panel.
  drag.panel.ox = maxOX > 0 ? Math.max(-1, Math.min(1, drag.ox - (dx / maxOX))) : 0;
  drag.panel.oy = maxOY > 0 ? Math.max(-1, Math.min(1, drag.oy - (dy / maxOY))) : 0;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  const hit = panelAt(canvasPoint(e));
  if (!hit || !state.panels[hit.index].img) return;
  e.preventDefault();
  const panel = state.panels[hit.index];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  state.selected = hit.index;
  redraw();
}, { passive: false });

// --- Export -----------------------------------------------------------------

async function exportPng(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
      a.click();
      setStatus(`Exported ${a.download} — ${size.label} PNG.`);
      resolve(blob);
    }, 'image/png');
  });
}

document.querySelectorAll('[data-export]').forEach((button) => {
  button.addEventListener('click', () => exportPng(button.dataset.export));
});

// Test hook for the screenshot driver: the same export, as a data URL.
window.__studio = { state, drawCover, exportPng };

// --- Screenshot scenes -------------------------------------------------------

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { loadImage, redraw, state }).then(() => {
    setStatus('Sample photos loaded — drag a panel photo to position it, then export a PNG.');
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  });
} else {
  redraw();
  setStatus('Load a photo, pick a layout and grade, then export your cover.');
}
