// Neon Coast Cover Studio — the hand-in program for gta6-cover-art-01.
//
// Node 22, standard library only. It takes the two folders that make the
// entry — app/ (the offline cover maker) and screenshots/ (its pictures) —
// copies them into the output directory, and writes /output/dossier.json
// with the vendored make.fun library, so the sealed scorer can check the
// entry and the judge can read it. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The entry itself is app/ plus screenshots/; everything else in this
// repository (serve.ts, shots.json, this file) is scaffolding around it.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, from the kit's RULES.txt: the dossier text cap shapes the
// bytes; the rest refuse an entry the scorer would refuse anyway.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      const sub = countFiles(path);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += info.size;
    }
  }
  return { files, bytes };
}

// A quick pre-flight of my own, before the library builds the dossier: the
// app must be there, and the screenshots must be 3 or 4 pictures, since the
// gate refuses anything else.
const appStats = countFiles(join(repoRoot, 'app'));
const shotsDir = join(repoRoot, 'screenshots');
const shotNames = existsSync(shotsDir) ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')) : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_OPTIONS));

console.log(
  `handed in Neon Coast Cover Studio: app/ ${appStats.files} files, ${appStats.bytes} bytes; ` +
  `screenshots/ ${shotNames.join(', ')}`,
);
