// Neon Coast Cover Studio — wires the editor page.
//
// The editor keeps one state object: the layout, the post size, the colour
// grade, the caption, the finish toggles and one photo slot per panel (each
// with its own zoom and pan). Every change redraws the live preview through
// drawCover (./cover.js), the same function the export uses, so the preview
// is the PNG. Photos are read with FileReader on this machine and never
// uploaded. A `?shot=` query sets up a fixed scene for a screenshot instead
// (./shots.js).
import { drawCover, GRADES, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const sizeButtons = document.getElementById('sizes');
const layoutButtons = document.getElementById('layouts');
const gradeButtons = document.getElementById('grades');
const photoSlots = document.getElementById('photos');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panx');
const panYInput = document.getElementById('pany');
const selectedLabel = document.getElementById('selected-panel');

const state = {
  layout: 'hero',
  size: 'square',
  grade: 'sunset',
  title: 'Neon Coast',
  subtitle: 'a vice coast story',
  grain: true,
  vignette: true,
  halftone: false,
  panels: [blankSlot(), blankSlot(), blankSlot(), blankSlot()],
  selected: 0,
};

function blankSlot() {
  return { img: null, zoom: 1, ox: 0, oy: 0 };
}

// How many photo slots the current layout actually uses.
function panelCount() {
  const layout = LAYOUTS[state.layout];
  return layout.panels(1, 1).length;
}

// The preview canvas follows the chosen post size's aspect, drawn at a
// comfortable on-screen resolution.
function redraw() {
  const size = SIZES[state.size];
  const scale = Math.min(1, 900 / Math.max(size.w, size.h));
  const pw = Math.round(size.w * scale);
  const ph = Math.round(size.h * scale);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  drawCover(canvas, state);
  syncPanelControls();
}

// Renders the cover at full export resolution into an offscreen canvas and
// resolves with the PNG's byte length. Used by the real export and by the
// screenshot scenes to prove the export path works.
function exportPng(w, h) {
  return new Promise((resolve, reject) => {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off, state);
    off.toBlob((blob) => {
      if (!blob) reject(new Error('export produced no PNG'));
      else resolve(blob);
    }, 'image/png');
  });
}

function downloadExport() {
  const size = SIZES[state.size];
  exportPng(size.w, size.h)
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      status.textContent = `Saved neon-coast-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KiB)`;
    })
    .catch((err) => {
      status.textContent = `Export failed: ${err.message}`;
    });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result).then(resolve, reject);
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.readAsDataURL(file);
  });
}

// --- Choice rows (layout / size / grade) -----------------------------------

function buildChoiceRow(container, entries, current, onPick) {
  container.textContent = '';
  for (const [key, entry] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.textContent = entry.label;
    b.setAttribute('aria-pressed', key === current ? 'true' : 'false');
    b.addEventListener('click', () => {
      onPick(key);
      buildChoiceRow(container, entries, key, onPick);
    });
    container.appendChild(b);
  }
}

function refreshChoiceRows() {
  buildChoiceRow(layoutButtons, Object.entries(LAYOUTS), state.layout, (key) => {
    state.layout = key;
    if (state.selected >= panelCount()) state.selected = 0;
    buildPhotoSlots();
    redraw();
  });
  buildChoiceRow(sizeButtons, Object.entries(SIZES), state.size, (key) => {
    state.size = key;
    redraw();
  });
  buildChoiceRow(gradeButtons, Object.entries(GRADES), state.grade, (key) => {
    state.grade = key;
    redraw();
  });
}

// --- Photo slots -------------------------------------------------------------

function buildPhotoSlots() {
  photoSlots.textContent = '';
  const count = panelCount();
  for (let i = 0; i < count; i++) {
    const slot = state.panels[i];
    const box = document.createElement('div');
    box.className = 'slot' + (i === state.selected ? ' selected' : '');
    box.addEventListener('click', () => {
      state.selected = i;
      buildPhotoSlots();
      redraw();
    });

    const name = document.createElement('span');
    name.className = 'slot-name';
    name.textContent = `Panel ${i + 1}${slot.img ? ' · photo set' : ' · empty'}`;
    box.appendChild(name);

    const pick = document.createElement('label');
    pick.className = 'slot-pick';
    pick.textContent = slot.img ? 'Change photo' : 'Add a photo';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        slot.img = await readFileAsImage(f);
        slot.zoom = 1;
        slot.ox = 0;
        slot.oy = 0;
        state.selected = i;
        status.textContent = `Panel ${i + 1}: ${f.name}`;
      } catch (err) {
        status.textContent = err.message;
      }
      buildPhotoSlots();
      redraw();
    });
    file.addEventListener('click', (e) => e.stopPropagation());
    pick.appendChild(file);
    box.appendChild(pick);

    const sample = document.createElement('button');
    sample.type = 'button';
    sample.className = 'mini';
    sample.textContent = 'Try a sample';
    sample.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        slot.img = await loadImage(`samples/${i % 2 === 0 ? 'boulevard' : 'pier'}.jpg`);
        state.selected = i;
        status.textContent = `Panel ${i + 1}: sample photo`;
      } catch (err) {
        status.textContent = err.message;
      }
      buildPhotoSlots();
      redraw();
    });
    box.appendChild(sample);
    photoSlots.appendChild(box);
  }
}

// --- Per-panel crop controls -------------------------------------------------

function syncPanelControls() {
  const slot = state.panels[state.selected];
  if (!slot) return;
  selectedLabel.textContent = `Panel ${state.selected + 1} crop`;
  zoomInput.value = String(slot.zoom);
  panXInput.value = String(slot.ox);
  panYInput.value = String(slot.oy);
}

zoomInput.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomInput.value);
  redraw();
});
panXInput.addEventListener('input', () => {
  state.panels[state.selected].ox = Number(panXInput.value);
  redraw();
});
panYInput.addEventListener('input', () => {
  state.panels[state.selected].oy = Number(panYInput.value);
  redraw();
});

// Drag on the preview to pan the selected panel's photo.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  drag = { x: e.clientX, y: e.clientY, ox: state.panels[state.selected].ox, oy: state.panels[state.selected].oy, w: rect.width, h: rect.height };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const slot = state.panels[state.selected];
  slot.ox = clamp(drag.ox + (e.clientX - drag.x) / drag.w, -0.5, 0.5);
  slot.oy = clamp(drag.oy + (e.clientY - drag.y) / drag.h, -0.5, 0.5);
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// --- Caption, finish, export -------------------------------------------------

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
for (const id of ['grain', 'vignette', 'halftone']) {
  document.getElementById(id).addEventListener('change', (e) => {
    state[id] = e.target.checked;
    redraw();
  });
}
document.getElementById('fill-all').addEventListener('click', () => {
  const src = state.panels[state.selected];
  if (!src.img) {
    status.textContent = 'Pick a photo for a panel first, then fill all with it.';
    return;
  }
  for (let i = 0; i < panelCount(); i++) {
    state.panels[i].img = src.img;
    state.panels[i].zoom = src.zoom;
    state.panels[i].ox = src.ox;
    state.panels[i].oy = src.oy;
  }
  status.textContent = 'One photo now fills every panel.';
  buildPhotoSlots();
  redraw();
});
document.getElementById('export').addEventListener('click', downloadExport);

// --- The API the screenshot scenes use --------------------------------------

const shotApi = {
  setLayout(key) { state.layout = key; refreshChoiceRows(); buildPhotoSlots(); },
  setGrade(key) { state.grade = key; refreshChoiceRows(); },
  setSize(key) { state.size = key; refreshChoiceRows(); },
  setCaption(title, subtitle) {
    state.title = title;
    state.subtitle = subtitle;
    titleInput.value = title;
    subtitleInput.value = subtitle;
  },
  panelCount,
  loadSample(name) { return loadImage(`samples/${name}.jpg`); },
  setPanelPhoto(i, img) {
    state.panels[i].img = img;
    state.panels[i].zoom = 1;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
  },
  setPanelCrop(i, zoom, ox, oy) {
    state.panels[i].zoom = zoom;
    state.panels[i].ox = ox;
    state.panels[i].oy = oy;
  },
  refreshSlots() { buildPhotoSlots(); redraw(); },
  showCoverOnly() {
    // In cover-only mode the canvas is the whole window; draw at its size.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawCover(canvas, state);
  },
  refresh() { redraw(); },
  async testExport(w, h) {
    const blob = await exportPng(w, h);
    return blob.size;
  },
};

refreshChoiceRows();
buildPhotoSlots();
redraw();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, shotApi).catch((err) => {
    status.textContent = `Shot failed: ${err.message}`;
  });
}
