# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ukyo9k/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ukyo9k/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Built for the [make.fun](https://make.fun) bounty [“Make GTA 6 Cover Art”](https://make.fun/bounty/gta6-cover-art-01) ($250 in USDC).

An offline web app that turns your own photos and a caption into multi-panel GTA-style cover art — the poster look with a sunset title band, palm silhouettes, bold gradient lettering and a Vice City colour grade — exported as a PNG to share. It runs entirely in the browser: photos are read on your machine and never uploaded, and the app makes no network request at all.

## How it works

1. **Load a photo** — from your machine into any panel, or try a bundled sample. **Fill all panels** puts one photo across the whole cover.
2. **Pick a layout** — Hero + 3 small panels, a Four-panel 2×2 grid, Full bleed single photo, or a Triple strip of three vertical panels.
3. **Crop and position each photo** — click a panel to select it, then drag it, scroll to zoom, or use the zoom and pan sliders. Panning is clamped so a photo can never slide out of its panel. Empty panels show a hand-drawn sunset scene (gradient sky, low sun, striped sea, palm silhouettes) instead of a blank box.
4. **Write the caption** — a heavy gradient-filled title with a dark outline and drop shadow, an italic subtitle line, and a five-star row under it.
5. **Choose a grade and finish** — five colour grades (Sunset, Neon Nights, Vice Pink, Golden Hour, Noir) plus grain, vignette and halftone toggles.
6. **Export** — one click per size: 1080 × 1080, 1080 × 1350 or 1920 × 1080 PNG. The preview and the export are drawn by the same function (`drawCover` in `app/src/cover.js`), so the PNG is exactly what you see.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies: `app/` is plain static files (system fonts only, no web fonts, no libraries).

## Files

- `app/index.html` — the editor page
- `app/style.css` — the editor chrome
- `app/src/cover.js` — the cover engine: panels, sunset scenes, palms, lettering, grades, grain, vignette, halftone
- `app/src/state.js` — the editor state (layout, grade, caption, one entry per panel)
- `app/src/main.js` — the editor wiring: photo loading, drag/zoom, export
- `app/src/shots.js` — fixed `?shot=` scenes for the screenshots
- `app/samples/` — two sample photos made with an image model for make.fun, free to use
- `main.ts` — hands the entry in: copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library
- `screenshots/` — the cover the app exported and the editor with a photo loaded

## Originality

Everything in this entry is original work made for the bounty: the sunset scenes, palm silhouettes, lettering and colour grades are drawn by hand in code. No Rockstar Games logo, wordmark, official artwork, character or font is used anywhere. The two sample photos were made with an image model for make.fun and are free to use.
