// Neon Coast Cover Studio — the cover engine.
//
// One function, drawCover, draws the whole poster on any 2D context at any
// size, so the on-screen preview and the exported PNG are the same picture.
// Everything is drawn by hand with canvas paths: no images, fonts or logos
// from any game, only system fonts and shapes this file invents.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const LAYOUTS = ['hero', 'four', 'full', 'triple'];

export const GRADES = {
  sunset: { name: 'Sunset', sky: ['#ff9a3d', '#ff5e7a', '#7b2f8e'], sea: '#17324e', wash: '#ff7a2f' },
  neon: { name: 'Neon Nights', sky: ['#2de2ff', '#ff2fb3', '#5b2ee5'], sea: '#0b1030', wash: '#ff2fb3' },
  vice: { name: 'Vice Pink', sky: ['#ffb3d9', '#ff5fa2', '#b13bff'], sea: '#241a4d', wash: '#ff5fa2' },
  golden: { name: 'Golden Hour', sky: ['#ffd76a', '#ff9e2c', '#c65a1e'], sea: '#274b3f', wash: '#ffb52e' },
  noir: { name: 'Noir', sky: ['#d8d8d8', '#8a8a8a', '#2b2b2b'], sea: '#101010', wash: '#888888' },
};

/** Deterministic random numbers, so grain and halftone look identical in the preview and in the export. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starPath(ctx, cx, cy, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A hand-drawn palm silhouette: a leaning trunk and seven drooping fronds. */
export function drawPalm(ctx, x, y, s, lean, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, curving gently to the left as it rises.
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -52, -8, -96);
  ctx.stroke();
  // Fronds fanning out from the crown.
  ctx.lineWidth = 5;
  for (let i = 0; i < 7; i += 1) {
    const a = (-Math.PI / 2) + (i - 3) * 0.42;
    const tipX = Math.cos(a) * 52;
    const tipY = -96 + Math.sin(a) * 52 + 26;
    const midX = Math.cos(a) * 30;
    const midY = -96 + Math.sin(a) * 30 - 6;
    ctx.beginPath();
    ctx.moveTo(-8, -96);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }
  // A couple of coconuts at the crown.
  ctx.beginPath(); ctx.arc(-14, -90, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-4, -86, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The empty-panel scene: gradient sky, a low sun, a striped sea and palms. */
export function drawEmptyPanel(ctx, rect, grade, seed) {
  const { x, y, w, h } = rect;
  const g = GRADES[grade];
  const sky = ctx.createLinearGradient(x, y, x, y + h * 0.62);
  sky.addColorStop(0, g.sky[0]);
  sky.addColorStop(0.55, g.sky[1]);
  sky.addColorStop(1, g.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h * 0.62);
  // Low sun with a soft glow.
  const sunR = Math.min(w, h) * 0.16;
  const sunX = x + w * 0.5;
  const sunY = y + h * 0.52;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, 'rgba(255, 244, 200, 0.85)');
  glow.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h * 0.62);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
  // Sea: horizontal bands getting darker toward the bottom.
  const seaTop = y + h * 0.62;
  const bands = 5;
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = shade(g.sea, i * 14);
    ctx.fillRect(x, seaTop + (h * 0.38 * i) / bands, w, (h * 0.38) / bands + 1);
  }
  // Sun glitter on the water.
  const rnd = mulberry32(seed);
  ctx.fillStyle = 'rgba(255, 240, 190, 0.5)';
  for (let i = 0; i < 26; i += 1) {
    const gw = w * (0.02 + rnd() * 0.09);
    ctx.fillRect(sunX - gw / 2 + (rnd() - 0.5) * w * 0.16, seaTop + rnd() * h * 0.34, gw, 2.5);
  }
  // A few birds.
  ctx.strokeStyle = 'rgba(30, 16, 40, 0.75)';
  ctx.lineWidth = Math.max(1.5, w * 0.004);
  for (let i = 0; i < 3; i += 1) {
    const bx = x + w * (0.2 + i * 0.22);
    const by = y + h * (0.14 + i * 0.05);
    const bs = w * 0.03;
    ctx.beginPath();
    ctx.moveTo(bx - bs, by); ctx.quadraticCurveTo(bx - bs / 2, by - bs * 0.7, bx, by);
    ctx.quadraticCurveTo(bx + bs / 2, by - bs * 0.7, bx + bs, by);
    ctx.stroke();
  }
  // Palms framing the scene.
  drawPalm(ctx, x + w * 0.1, y + h * 0.98, Math.min(w, h) * 0.0032, 0.12, '#1c0f2e');
  drawPalm(ctx, x + w * 0.92, y + h * 0.98, Math.min(w, h) * 0.0026, -0.18, '#1c0f2e');
}

/** Lighten (positive) or darken (negative) a #rrggbb colour by a few steps. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r}, ${gg}, ${b})`;
}

/** Panel rectangles inside the panel area, for each of the four layouts. */
export function panelRects(layout, area, gap) {
  const { x, y, w, h } = area;
  if (layout === 'full') return [{ x, y, w, h }];
  if (layout === 'four') {
    const pw = (w - gap) / 2;
    const ph = (h - gap) / 2;
    return [
      { x, y, w: pw, h: ph },
      { x: x + pw + gap, y, w: pw, h: ph },
      { x, y: y + ph + gap, w: pw, h: ph },
      { x: x + pw + gap, y: y + ph + gap, w: pw, h: ph },
    ];
  }
  if (layout === 'triple') {
    const pw = (w - gap * 2) / 3;
    return [0, 1, 2].map((i) => ({ x: x + i * (pw + gap), y, w: pw, h }));
  }
  // hero: one big panel on the left, three stacked on the right.
  const heroW = w * 0.62;
  const sideX = x + heroW + gap;
  const sideW = w - heroW - gap;
  const sh = (h - gap * 2) / 3;
  return [
    { x, y, w: heroW, h },
    { x: sideX, y, w: sideW, h: sh },
    { x: sideX, y: y + sh + gap, w: sideW, h: sh },
    { x: sideX, y: y + 2 * (sh + gap), w: sideW, h: sh },
  ];
}

export function panelCountFor(layout) {
  return layout === 'full' ? 1 : layout === 'triple' ? 3 : 4;
}

/** Draws one photo into its panel, cover-fit, with the panel's zoom and pan. Pan is clamped so the photo can never slide out of its panel. */
export function drawPhotoInPanel(ctx, rect, panel, grade) {
  const img = panel.img;
  const { x, y, w, h } = rect;
  const zoom = panel.zoom ?? 1;
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const maxOX = Math.max(0, (dw - w) / 2);
  const maxOY = Math.max(0, (dh - h) / 2);
  const ox = (panel.ox ?? 0) * maxOX;
  const oy = (panel.oy ?? 0) * maxOY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.12) brightness(0.94)';
  ctx.drawImage(img, x + (w - dw) / 2 - ox, y + (h - dh) / 2 - oy, dw, dh);
  ctx.filter = 'none';
  // Colour grade wash over the photo.
  const g = GRADES[grade];
  if (grade === 'noir') {
    ctx.fillStyle = 'rgba(40, 40, 60, 0.12)';
    ctx.fillRect(x, y, w, h);
  } else {
    const wash = ctx.createLinearGradient(x, y, x + w, y + h);
    wash.addColorStop(0, hexA(g.wash, 0.16));
    wash.addColorStop(1, hexA(g.sky[2], 0.22));
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Heavy gradient-filled capitals with a dark outline and a drop shadow. */
export function drawTitleText(ctx, text, cx, cy, maxWidth, px, grade) {
  const g = GRADES[grade];
  const family = '"Arial Black", Arial, Helvetica, sans-serif';
  let size = px;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // measureText does not count letterSpacing, so add it by hand.
  const textWidth = () => ctx.measureText(text).width + Math.max(1, size * 0.03) * (text.length - 1);
  ctx.font = `900 ${size}px ${family}`;
  while (size > 20 && textWidth() > maxWidth) {
    size *= 0.96;
    ctx.font = `900 ${size}px ${family}`;
  }
  try { ctx.letterSpacing = `${Math.max(1, size * 0.03)}px`; } catch { /* older canvas: no letter spacing */ }
  const grad = ctx.createLinearGradient(cx, cy - size * 0.55, cx, cy + size * 0.55);
  grad.addColorStop(0, '#fffbe8');
  grad.addColorStop(0.45, g.sky[0]);
  grad.addColorStop(1, g.sky[1]);
  const outline = Math.max(2, size * 0.055);
  // Drop shadow: the same words, offset down-right in dark ink.
  ctx.fillStyle = 'rgba(24, 10, 34, 0.85)';
  ctx.fillText(text, cx + size * 0.045, cy + size * 0.07);
  ctx.lineJoin = 'round';
  ctx.lineWidth = outline;
  ctx.strokeStyle = '#22102e';
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, cy);
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  return size;
}

/** The sunset title band across the top: gradient sky, palm silhouettes, title, italic subtitle and five stars. */
export function drawTitleBand(ctx, W, band, state) {
  const g = GRADES[state.grade];
  const { x, y, w, h } = band;
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, g.sky[0]);
  sky.addColorStop(0.55, g.sky[1]);
  sky.addColorStop(1, g.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // Sun disc peeking behind the title.
  const sunR = h * 0.28;
  const sunX = x + w * 0.5;
  const sunY = y + h * 0.45;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.2);
  glow.addColorStop(0, 'rgba(255, 246, 205, 0.9)');
  glow.addColorStop(1, 'rgba(255, 246, 205, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
  // Palm silhouettes tucked into the band's corners, kept clear of the title.
  const ps = h * 0.0055;
  drawPalm(ctx, x + w * 0.04, y + h * 1.0, ps, 0.22, 'rgba(28, 15, 46, 0.9)');
  drawPalm(ctx, x + w * 0.96, y + h * 1.0, ps * 0.85, -0.24, 'rgba(28, 15, 46, 0.9)');
  // Title, subtitle, stars — stacked in the middle of the band.
  const title = (state.title || 'NEON COAST').toUpperCase();
  // The title is kept clear of the palm silhouettes at the band's ends.
  const titleSize = drawTitleText(ctx, title, x + w / 2, y + h * 0.34, w * 0.72, h * 0.42, state.grade);
  const subSize = Math.max(12, h * 0.115);
  ctx.font = `italic 600 ${subSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff8e6';
  ctx.shadowColor = 'rgba(24, 10, 34, 0.9)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = subSize * 0.08;
  ctx.fillText(state.subtitle || '', x + w / 2, y + h * 0.34 + titleSize * 0.62 + subSize * 0.5);
  ctx.shadowOffsetY = 0;
  // Five-star row under the subtitle.
  const starR = Math.max(6, h * 0.055);
  const starGap = starR * 2.6;
  const starsY = y + h * 0.34 + titleSize * 0.62 + subSize * 1.35 + starR;
  for (let i = 0; i < 5; i += 1) {
    const sx = x + w / 2 + (i - 2) * starGap;
    starPath(ctx, sx, starsY, starR, starR * 0.45);
    ctx.fillStyle = '#ffd76a';
    ctx.strokeStyle = '#22102e';
    ctx.lineWidth = Math.max(1.5, starR * 0.14);
    ctx.fill();
    ctx.stroke();
  }
  // Ink rule under the band.
  ctx.fillStyle = '#22102e';
  ctx.fillRect(x, y + h - Math.max(2, h * 0.02), w, Math.max(2, h * 0.02));
}

/** Halftone dots over a rectangle, radius swelling in waves down the rows. */
function drawHalftone(ctx, rect, seed) {
  const rnd = mulberry32(seed);
  const step = Math.max(10, rect.w * 0.014);
  ctx.fillStyle = 'rgba(24, 10, 34, 0.16)';
  for (let yy = rect.y + step / 2; yy < rect.y + rect.h; yy += step) {
    for (let xx = rect.x + step / 2; xx < rect.x + rect.w; xx += step) {
      const wave = 0.5 + 0.5 * Math.sin((yy - rect.y) / step * 0.9 + (xx - rect.x) / step * 0.4);
      const r = step * (0.08 + wave * 0.22) * (0.85 + rnd() * 0.3);
      ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawGrain(ctx, W, H) {
  const rnd = mulberry32(20261119);
  const count = Math.floor((W * H) / 850);
  for (let i = 0; i < count; i += 1) {
    const light = rnd() > 0.5;
    ctx.fillStyle = light ? `rgba(255, 250, 235, ${0.05 + rnd() * 0.09})` : `rgba(20, 8, 28, ${0.05 + rnd() * 0.09})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }
}

function drawVignette(ctx, W, H) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  grad.addColorStop(0, 'rgba(20, 8, 28, 0)');
  grad.addColorStop(1, 'rgba(20, 8, 28, 0.30)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draws the whole cover. `state` carries layout, grade, title, subtitle,
 * finish toggles and one panel entry per panel (img, zoom, ox, oy).
 * The preview canvas and the export canvas both call this, so they match.
 */
export function drawCover(ctx, W, H, state) {
  const u = Math.min(W, H) / 1000; // one unit, so the design scales with size
  const ink = '#22102e';
  const cream = '#f6e8c8';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, W, H);

  const frame = W * 0.016;
  const gap = W * 0.011;
  const bandH = H * (state.size === 'landscape' ? 0.235 : state.size === 'portrait' ? 0.185 : 0.20);
  const band = { x: frame, y: frame, w: W - frame * 2, h: bandH };
  const area = { x: frame, y: frame + bandH + gap, w: W - frame * 2, h: H - frame * 2 - bandH - gap };

  drawTitleBand(ctx, W, band, state);

  const rects = panelRects(state.layout, area, gap);
  const count = panelCountFor(state.layout);
  for (let i = 0; i < count; i += 1) {
    const rect = rects[i];
    const panel = state.panels[i] || {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.img) drawPhotoInPanel(ctx, rect, panel, state.grade);
    else drawEmptyPanel(ctx, rect, state.grade, 400 + i * 97);
    ctx.restore();
    // Dark panel outline with a thin cream keyline inside it.
    ctx.lineWidth = Math.max(3, 5 * u);
    ctx.strokeStyle = ink;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = Math.max(1, 1.5 * u);
    ctx.strokeStyle = 'rgba(246, 232, 200, 0.55)';
    ctx.strokeRect(rect.x + 4 * u, rect.y + 4 * u, rect.w - 8 * u, rect.h - 8 * u);
  }

  if (state.halftone) drawHalftone(ctx, band, 77);
  if (state.vignette) drawVignette(ctx, W, H);
  if (state.grain) drawGrain(ctx, W, H);

  // Cream frame with a double ink rule around the whole poster.
  ctx.lineWidth = Math.max(3, 6 * u);
  ctx.strokeStyle = ink;
  ctx.strokeRect(frame / 2, frame / 2, W - frame, H - frame);
  ctx.lineWidth = Math.max(1, 1.5 * u);
  ctx.strokeRect(frame * 1.9, frame * 1.9, W - frame * 3.8, H - frame * 3.8);
}
