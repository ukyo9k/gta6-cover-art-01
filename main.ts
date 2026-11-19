// Neon Coast Cover Studio — the hand-in program (Node 22, standard library
// only). It copies this repository's app/ and screenshots/ into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library, so the sealed scorer can check the entry byte for byte.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copies one tree into another, directories first, entries in name order so the copy is deterministic. */
function copyTree(from: string, to: string): number {
  let copied = 0;
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from).sort()) {
    const src = join(from, name);
    const dst = join(to, name);
    if (statSync(src).isDirectory()) copied += copyTree(src, dst);
    else {
      writeFileSync(dst, readFileSync(src));
      copied += 1;
    }
  }
  return copied;
}

const appFiles = copyTree(join(here, 'app'), join(out, 'app'));

let shotFiles = 0;
if (existsSync(join(here, 'screenshots'))) {
  shotFiles = copyTree(join(here, 'screenshots'), join(out, 'screenshots'));
}
if (shotFiles < 3) {
  throw new Error(`Neon Coast Cover Studio needs at least 3 screenshots, found ${shotFiles}`);
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`handed in ${appFiles} app files and ${shotFiles} screenshots; dossier.json is ${dossier.length} bytes`);
