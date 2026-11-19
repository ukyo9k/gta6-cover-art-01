// Neon Coast Cover Studio — the cover engine.
//
// Everything on a cover is drawn here, on a plain 2D canvas, from the editor's
// state: the layout (which panels, where), the grade (the sunset / neon colour
// treatment), the photos (one per panel, each with its own crop) and the
// lettering. The same function draws the live preview and the exported PNG, so
// what the editor shows is exactly what the file holds. No photo ever leaves
// the machine: images are drawn from memory, never uploaded.

export const SIZES = {
  square: { label: 'Square · 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 x 1080', w: 1920, h: 1080 },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#ffd166', '#ff7b54', '#e63e8c', '#5b2a86'],
    sea: ['#ff9e5e', '#7a2d8f'],
    tintTop: 'rgba(255, 122, 60, 0.10)',
    tintBottom: 'rgba(190, 40, 130, 0.30)',
    filter: 'saturate(1.3) contrast(1.06)',
    band: ['#ff8a3d', '#e63e8c', '#6d28a8'],
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#0ff0ff', '#2b6cff', '#b537f2', '#ff2e88'],
    sea: ['#19c3ff', '#8b2ff7'],
    tintTop: 'rgba(0, 229, 255, 0.14)',
    tintBottom: 'rgba(255, 0, 136, 0.32)',
    filter: 'saturate(1.45) contrast(1.08)',
    band: ['#00e5ff', '#b537f2', '#ff2e88'],
  },
  vice: {
    label: 'Vice Pink',
    sky: ['#ffe259', '#ff7eb3', '#ff4e9a', '#7b2ff7'],
    sea: ['#ff8fc7', '#9336f5'],
    tintTop: 'rgba(255, 80, 180, 0.16)',
    tintBottom: 'rgba(120, 0, 180, 0.30)',
    filter: 'saturate(1.35) contrast(1.05)',
    band: ['#ff5ea8', '#ff2e88', '#7b2ff7'],
  },
  golden: {
    label: 'Golden Hour',
    sky: ['#fff3b0', '#ffc46b', '#ff8c42', '#b85c38'],
    sea: ['#ffb347', '#c96f2e'],
    tintTop: 'rgba(255, 190, 80, 0.18)',
    tintBottom: 'rgba(255, 110, 0, 0.22)',
    filter: 'saturate(1.25) contrast(1.04)',
    band: ['#ffc46b', '#ff8c42', '#8a4b2d'],
  },
  noir: {
    label: 'Noir',
    sky: ['#e8e8e8', '#9a9a9a', '#4a4a4a', '#141414'],
    sea: ['#8a8a8a', '#222222'],
    tintTop: 'rgba(255, 255, 255, 0.06)',
    tintBottom: 'rgba(0, 0, 0, 0.35)',
    filter: 'grayscale(0.75) contrast(1.18)',
    band: ['#3a3a3a', '#111111', '#000000'],
  },
};

// Four poster layouts. Each returns the panel rectangles (as fractions of the
// cover) in the order the editor's photo slots fill them, plus the title band.
export const LAYOUTS = {
  hero: {
    label: 'Hero + 3',
    panels(w, h) {
      const heroW = 0.62;
      return [
        { x: 0, y: 0, w: heroW, h: 1 },
        { x: heroW, y: 0, w: 1 - heroW, h: 1 / 3 },
        { x: heroW, y: 1 / 3, w: 1 - heroW, h: 1 / 3 },
        { x: heroW, y: 2 / 3, w: 1 - heroW, h: 1 / 3 },
      ];
    },
  },
  grid: {
    label: 'Four panels',
    panels() {
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ];
    },
  },
  bleed: {
    label: 'Full bleed',
    panels() {
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    },
  },
  strips: {
    label: 'Triple strip',
    panels() {
      return [
        { x: 0, y: 0, w: 1 / 3, h: 1 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
      ];
    },
  },
};

// A panel's photo: { img, zoom, ox, oy } — zoom 1 fills the panel, ox/oy pan
// it by a fraction of the panel. An empty slot draws a sunset placeholder.
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function drawPhotoInto(ctx, rect, slot, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (slot && slot.img) {
    const img = slot.img;
    const zoom = slot.zoom || 1;
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    // Pan, but never far enough to show the paper behind the photo: the
    // cover-fit image always covers the panel, so clamp its centre to the
    // range that keeps every edge covered.
    const cx = clamp(
      x + w / 2 + (slot.ox || 0) * w,
      x + w - pw / 2,
      x + pw / 2,
    );
    const cy = clamp(
      y + h / 2 + (slot.oy || 0) * h,
      y + h - ph / 2,
      y + ph / 2,
    );
    ctx.filter = grade.filter;
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.filter = 'none';
  } else {
    drawPlaceholderScene(ctx, rect, grade);
  }
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, grade.tintTop);
  wash.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// The placeholder scene: a gradient sky, a low sun, a dark sea band and two
// palm silhouettes, drawn with plain canvas paths — no borrowed artwork.
function drawPlaceholderScene(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const sky = ctx.createLinearGradient(x, y, x, y + h * 0.72);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h * 0.72);
  // Sun with a soft halo.
  const sunR = Math.min(w, h) * 0.16;
  const sunX = x + w * 0.5;
  const sunY = y + h * 0.42;
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  halo.addColorStop(0, 'rgba(255, 240, 180, 0.85)');
  halo.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, w, h * 0.72);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Sea.
  const sea = ctx.createLinearGradient(x, y + h * 0.72, x, y + h);
  sea.addColorStop(0, grade.sea[0]);
  sea.addColorStop(1, grade.sea[1]);
  ctx.fillStyle = sea;
  ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 5; i++) {
    const ry = y + h * (0.76 + i * 0.045);
    const rw = w * (0.10 + 0.05 * ((i * 7) % 3));
    ctx.fillRect(x + w * (0.18 + 0.13 * i), ry, rw, Math.max(2, h * 0.006));
  }
  drawPalm(ctx, x + w * 0.12, y + h * 0.74, Math.min(w, h) * 0.34, '#1d0b2e');
  drawPalm(ctx, x + w * 0.88, y + h * 0.70, Math.min(w, h) * 0.28, '#1d0b2e');
}

// A palm silhouette: one curved trunk, seven fronds. `s` is its height.
export function drawPalm(ctx, baseX, baseY, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning slightly.
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + s * 0.06, baseY - s * 0.55, baseX + s * 0.16, baseY - s * 0.92);
  ctx.stroke();
  const topX = baseX + s * 0.16;
  const topY = baseY - s * 0.92;
  // Fronds fan out from the crown.
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 26) * (Math.PI / 180);
    const len = s * (0.42 + 0.1 * Math.sin(i * 2.1));
    const tipX = topX + Math.cos(a) * len;
    const tipY = topY + Math.sin(a) * len * 0.55 + len * 0.28;
    ctx.lineWidth = s * 0.035;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.5,
      topY + Math.sin(a) * len * 0.3 - len * 0.12,
      tipX,
      tipY,
    );
    ctx.stroke();
  }
  // A couple of coconuts at the crown.
  ctx.beginPath();
  ctx.arc(topX - s * 0.02, topY + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.04, topY + s * 0.04, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A sheet of film grain, built once and tiled over the cover.
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 128;
  t.height = 128;
  const g = t.getContext('2d');
  const data = g.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainTile = t;
  return t;
}

function drawGrain(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(10, 0, 20, 0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

// Halftone dots across a band, for the printed-poster feel.
function drawHalftone(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(10, w * 0.014);
  for (let py = y + step / 2; py < y + h; py += step) {
    for (let px = x + step / 2; px < x + w; px += step) {
      const fade = (py - y) / h;
      const r = step * 0.16 * (0.4 + fade);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const TITLE_FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const SUB_FONT = '"Georgia", "Times New Roman", serif';

function fitFont(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

// The title band along the foot: a sunset gradient, the big caption in
// gradient-filled capitals with a dark outline, the subtitle in italic, and a
// row of stars. The band reserves the bottom of the cover; panels sit above.
function drawTitleBand(ctx, w, h, state, grade) {
  const bandH = h * 0.22;
  const y = h - bandH;
  const band = ctx.createLinearGradient(0, y, w, h);
  grade.band.forEach((c, i) => band.addColorStop(i / (grade.band.length - 1), c));
  ctx.fillStyle = band;
  ctx.fillRect(0, y, w, bandH);
  // A thin bright rule where the band meets the panels.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(0, y, w, Math.max(3, h * 0.004));
  if (state.halftone) drawHalftone(ctx, 0, y, w, bandH, 'rgba(0,0,0,0.16)');
  // Palm silhouettes at the band's edges.
  drawPalm(ctx, w * 0.045, y + bandH * 0.98, bandH * 0.95, 'rgba(20, 5, 35, 0.85)');
  drawPalm(ctx, w * 0.955, y + bandH * 0.98, bandH * 0.8, 'rgba(20, 5, 35, 0.85)');

  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const cx = w / 2;
  const titleY = y + bandH * 0.52;
  if (title) {
    const size = fitFont(ctx, title, w * 0.82, bandH * 0.52, TITLE_FONT, 900);
    ctx.save();
    ctx.translate(cx, titleY);
    ctx.rotate(-0.02);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(1, size * 0.02)}px`;
    const fill = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.55, '#ffe9a8');
    fill.addColorStop(1, '#ffb347');
    ctx.font = `900 ${size}px ${TITLE_FONT}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2a0a3d';
    ctx.lineWidth = size * 0.09;
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = fill;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.04;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }
  if (sub) {
    const size = fitFont(ctx, sub, w * 0.7, bandH * 0.16, SUB_FONT, 'bold');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic bold ${size}px ${SUB_FONT}`;
    ctx.fillStyle = '#ffe9f4';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = size * 0.25;
    ctx.fillText(sub, cx, y + bandH * 0.82);
    ctx.restore();
  }
  // Five small stars under the subtitle line, like a rating.
  const starY = y + bandH * 0.885;
  const starR = Math.max(3, bandH * 0.035);
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 5; i++) {
    const sx = cx + (i - 2) * starR * 3.4;
    drawStar(ctx, sx, starY, starR);
  }
}

function drawStar(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Draws the whole cover for `state` onto `canvas` (any size): the panels with
// their photos, the grade, the frame, the title band and the finish effects.
// `state`: { layout, grade, title, subtitle, grain, vignette, halftone,
//            panels: [{ img, zoom, ox, oy }, ...] }
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;

  // Cream poster paper.
  ctx.fillStyle = '#fff6ea';
  ctx.fillRect(0, 0, w, h);

  const gutter = Math.max(4, Math.round(w * 0.012));
  const bandH = h * 0.22;
  const panelArea = { x: gutter, y: gutter, w: w - gutter * 2, h: h - bandH - gutter * 2 };
  const rects = layout.panels(panelArea.w, panelArea.h);
  rects.forEach((r, i) => {
    const rect = {
      x: panelArea.x + r.x * panelArea.w + (r.x > 0 ? gutter / 2 : 0),
      y: panelArea.y + r.y * panelArea.h + (r.y > 0 ? gutter / 2 : 0),
      w: r.w * panelArea.w - (r.x > 0 ? gutter / 2 : 0) - (r.x + r.w < 1 ? gutter / 2 : 0),
      h: r.h * panelArea.h - (r.y > 0 ? gutter / 2 : 0) - (r.y + r.h < 1 ? gutter / 2 : 0),
    };
    drawPhotoInto(ctx, rect, state.panels[i], grade);
    ctx.strokeStyle = '#1d0b2e';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  drawTitleBand(ctx, w, h, state, grade);
  if (state.grain) drawGrain(ctx, w, h);
  if (state.vignette) drawVignette(ctx, w, h);

  // Outer poster frame.
  ctx.strokeStyle = '#1d0b2e';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeRect(gutter / 2, gutter / 2, w - gutter, h - gutter);
}
