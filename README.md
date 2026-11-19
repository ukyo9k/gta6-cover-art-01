[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/ukyo9k/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/ukyo9k/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Coast Cover Studio

An offline web app that turns your own photos and a caption into GTA 6-style
poster cover art, exported as a PNG to share. Built for the
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on
[make.fun](https://make.fun).

## What it does

- **Multi-panel poster covers.** Four layouts: Hero + 3 (one big hero panel
  beside three stacked panels), Four panels (a 2×2 grid), Full bleed (one
  photo edge to edge) and Triple strip (three tall frames). A cream poster
  frame, thin dark panel outlines and a sunset title band tie them together.
- **Any photo, cropped your way.** Drop a photo into any panel from your
  machine — photos are read locally with FileReader and never uploaded. Each
  panel has its own zoom and pan (sliders, or drag the preview), and one
  button fills every panel with the selected photo. Empty panels show a
  hand-drawn sunset scene (gradient sky, low sun, sea, palm silhouettes) so
  the cover always looks finished.
- **Bold poster lettering.** The title is set in heavy capitals with a
  sunset-gradient fill, a dark outline and a soft shadow, slightly tilted;
  the subtitle sits beneath it in italic, with a five-star row. No Rockstar
  logo, artwork or font is used anywhere — every letter, palm and sun is
  drawn by this app.
- **Vice City colour grades.** Five grades — Sunset, Neon Nights, Vice Pink,
  Golden Hour and Noir — each re-tints the photos, the placeholder scenes and
  the title band.
- **Finish.** Optional film grain, vignette and halftone dots on the title
  band, for the printed-poster feel.
- **Fast to a PNG.** Pick a layout, add a photo, type the caption, export.
  Three post sizes in one step: 1080×1080, 1080×1350 and 1920×1080.

## Try it

Serve `app/` with any static server — no build step, no network request:

```sh
node serve.ts
# open http://localhost:8080
```

Everything the app loads is a file under `app/` (or a `data:` URI); the only
fonts are plain system font stacks, so there is nothing to install and
nothing to download.

## How it is built

- `app/index.html` — the editor page: layout, photos, crop, caption, grade,
  finish and size controls beside a live preview canvas.
- `app/style.css` — the editor chrome.
- `app/src/cover.js` — the cover engine: layouts, grades, the placeholder
  sunset scene, palm silhouettes, grain, vignette, halftone and the title
  band. One function, `drawCover`, draws both the preview and the export.
- `app/src/main.js` — the editor wiring: state, photo loading, drag-to-pan,
  and the full-resolution PNG export.
- `app/src/shots.js` — fixed `?shot=` scenes for screenshots.
- `app/samples/` — two sample photos made with an image model for make.fun,
  free to use.
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to
  `/output` and writes `/output/dossier.json` with the vendored make.fun
  library.
- `screenshots/` — the cover and the editor, taken with headless Chromium
  against the app served locally.

## Screenshots

`1-cover.jpg` is a wide exported cover (1920×1080, Neon Nights grade),
`2-editor.jpg` shows the editor with photos loaded, `3-cover.jpg` a square
cover (Vice Pink grade) and `4-cover.jpg` a portrait cover (Golden Hour
grade).

## License

MIT — see [LICENSE](LICENSE).
