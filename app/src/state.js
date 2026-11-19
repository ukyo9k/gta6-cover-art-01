// The editor's state: one object the preview, the controls and the export
// all read from, so what you see is what the PNG holds.

import { panelCountFor } from './cover.js';

export function blankPanel() {
  return { img: null, zoom: 1, ox: 0, oy: 0 };
}

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    size: 'landscape',
    title: 'NEON COAST',
    subtitle: 'a vice city story',
    grain: true,
    vignette: true,
    halftone: false,
    selected: 0,
    panels: [blankPanel(), blankPanel(), blankPanel(), blankPanel()],
  };
}

/** Grows or shrinks the panel list to match the layout, keeping photos. */
export function fitPanels(state) {
  const want = panelCountFor(state.layout);
  while (state.panels.length < want) state.panels.push(blankPanel());
  state.panels.length = want;
  if (state.selected >= want) state.selected = 0;
}

/** Copies the selected panel's photo into every panel of the layout. */
export function fillAllPanels(state) {
  const src = state.panels[state.selected] || state.panels.find((p) => p.img);
  if (!src || !src.img) return false;
  for (const panel of state.panels) {
    panel.img = src.img;
    panel.zoom = src.zoom;
    panel.ox = src.ox;
    panel.oy = src.oy;
  }
  return true;
}
