// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows the cover alone, drawn at the window's
// size. Query params pick the layout, grade, size and caption:
//   ?shot=cover&layout=hero&grade=neon&size=wide&photo=boulevard&photo2=pier&caption=NEON%20COAST
//   ?shot=editor&layout=grid&grade=sunset&photo=pier&caption=PIER%20PRESSURE
// window.__shotReady is set once the scene is painted, so a headless browser
// knows when to take the picture.
import { SIZES } from './cover.js';

export async function runShot(shot, query, api) {
  const layout = query.get('layout') || 'hero';
  const grade = query.get('grade') || 'sunset';
  const sizeKey = query.get('size') || 'square';
  const caption = query.get('caption') || 'Neon Coast';
  const subtitle = query.get('subtitle') || 'a vice coast story';
  const first = query.get('photo') || 'boulevard';
  const second = query.get('photo2') || 'pier';

  api.setLayout(layout);
  api.setGrade(grade);
  api.setSize(sizeKey);
  api.setCaption(caption, subtitle);

  // Fill the panels: the first sample in the hero / first panel, the second
  // sample in the rest, so every panel shows a photo. A `cropN=zoom,ox,oy`
  // query param frames panel N's photo (the samples are portraits, and a
  // wide panel's centre crop can cut a face off).
  const slots = api.panelCount();
  for (let i = 0; i < slots; i++) {
    const name = i === 0 ? first : second;
    const img = await api.loadSample(name);
    api.setPanelPhoto(i, img);
    const crop = query.get(`crop${i}`);
    if (crop) {
      const [zoom, ox, oy] = crop.split(',').map(Number);
      api.setPanelCrop(i, zoom || 1, ox || 0, oy || 0);
    }
  }
  api.refreshSlots();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    api.showCoverOnly();
    // Prove the real export path works at full resolution, and leave the
    // result in the page for the screenshot run to read.
    const size = SIZES[sizeKey] || SIZES.square;
    const bytes = await api.testExport(size.w, size.h);
    const info = document.getElementById('shotinfo');
    if (info) info.textContent = `export ${size.w}x${size.h} ok ${bytes} bytes`;
  } else {
    api.refresh();
  }

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
