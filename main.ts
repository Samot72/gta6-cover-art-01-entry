// Vice Grade Studio — hand-in program (Node 22, standard library only).
//
// The studio itself is plain static files under app/: index.html, one
// stylesheet and a set of ES modules that paint covers from photographs
// entirely in the browser. This program's whole job is the hand-in: copy
// app/ and screenshots/ into the output directory, then write the dossier
// the judge reads, using the kit's vendored library so the bytes match the
// scorer's own rebuild exactly.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps from the competition's gate (reference/gate.json): the dossier
// text is capped at 160 KiB, screenshots at 4 files of 256 KiB, and app/ at
// 993 entries and 48 MiB with no path over 1,000 bytes.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
