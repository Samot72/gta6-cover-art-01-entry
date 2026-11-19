// Poster Lab — entry program for the gta6-cover-art-01 bounty.
//
// What it does, in order:
//   1. Finds the repository root (the folder this file lives in).
//   2. Chooses the output folder: MAKEFUN_OUTPUT_DIR when set, else /output.
//   3. Copies app/ and screenshots/ from the repository into the output
//      folder, replacing whatever a previous run left there.
//   4. Writes dossier.json into the output folder with buildDossier from
//      vendor/makefun-app.ts, using the gate's own caps, so the dossier is
//      byte for byte the one the scorer rebuilds from the same files.
//
// Node 22 standard library only; no network, no installs.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The gate's caps, as the scorer passes them to buildDossier: only
// text_max_bytes shapes the dossier's bytes; the rest only refuse early,
// here instead of at grading time.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

// Copy one directory tree over another, clearing the destination first so
// stale files from an earlier run can never leak into the hand-in.
function copyTreeFresh(sourceDir: string, targetDir: string): void {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

// Re-check the finished hand-in the way the gate will see it: the dossier
// within its byte cap, the app's index page present, and 3 or 4 screenshots
// beside it. Throws on the first problem, so a bad hand-in fails here with
// a readable reason instead of at grading time.
function verifyHandIn(outputDir: string, dossierBytes: number): void {
  const DOSSIER_MAX = 1572864; // 1.5 MiB
  if (dossierBytes > DOSSIER_MAX) {
    throw new Error(`main.ts: dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
  }
  if (!existsSync(join(outputDir, 'app', 'index.html'))) {
    throw new Error('main.ts: the hand-in is missing app/index.html');
  }
  const shots = readdirSync(join(outputDir, 'screenshots')).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`main.ts: the hand-in needs 3 or 4 screenshots, found ${shots.length}`);
  }
}

function main(): void {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const appSource = join(repoRoot, 'app');
  const shotsSource = join(repoRoot, 'screenshots');
  if (!existsSync(appSource)) throw new Error(`main.ts: no app/ directory beside ${import.meta.url}`);
  if (!existsSync(shotsSource)) throw new Error('main.ts: no screenshots/ directory in the repository');

  mkdirSync(outputDir, { recursive: true });
  copyTreeFresh(appSource, join(outputDir, 'app'));
  copyTreeFresh(shotsSource, join(outputDir, 'screenshots'));

  const dossier = buildDossier(outputDir, GATE_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  verifyHandIn(outputDir, dossier.byteLength);

  console.log(`poster-lab: handed in app/ + screenshots/ to ${outputDir}`);
  console.log(`poster-lab: dossier.json is ${dossier.byteLength} bytes`);
}

main();
