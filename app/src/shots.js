// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows one exported cover alone, full frame.
// Query params pick the scene: layout, grade, size, caption, subtitle and
// which sample goes in each panel (photo1..photo4: boulevard or pier).
// window.__shotReady is set once the scene has painted.

import { fitPanels } from './state.js';

const SAMPLES = ['boulevard', 'pier', 'boulevard', 'pier'];

export async function runShot(shot, query, api) {
  const { loadImage, redraw, state } = api;
  state.layout = query.get('layout') ?? (shot === 'cover' ? 'hero' : 'hero');
  state.grade = query.get('grade') ?? 'sunset';
  state.size = query.get('size') ?? 'landscape';
  state.title = query.get('caption') ?? 'NEON COAST';
  state.subtitle = query.get('subtitle') ?? 'a vice city story';
  state.halftone = query.get('halftone') === '1';
  fitPanels(state);

  const photos = [1, 2, 3, 4].map((i) => query.get(`photo${i}`) ?? SAMPLES[i - 1]);
  for (let i = 0; i < state.panels.length; i += 1) {
    const img = await loadImage(`samples/${photos[i]}.jpg`);
    state.panels[i] = { img, zoom: 1, ox: 0, oy: 0 };
  }
  // A little crop and drift per panel, so the cover looks composed, not
  // pasted. The pier photo's face sits in its top third, so its panels are
  // shifted to show the top of the photo, not the shoulders.
  const frameFor = (name, i) => {
    if (i === 0) return { zoom: 1.08, ox: 0, oy: -0.5 };
    if (name === 'pier') return { zoom: 1.05, ox: 0.1, oy: -0.5 };
    return { zoom: 1.1, ox: 0, oy: -0.4 };
  };
  for (let i = 0; i < state.panels.length; i += 1) {
    Object.assign(state.panels[i], frameFor(photos[i], i));
  }

  const titleInput = document.getElementById('title');
  const subtitleInput = document.getElementById('subtitle');
  if (titleInput) titleInput.value = state.title;
  if (subtitleInput) subtitleInput.value = state.subtitle;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
}
