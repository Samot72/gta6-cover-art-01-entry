// Entry program for the ViceFrame Cover Studio entry (gta6-cover-art-01).
//
// The actual deliverable is a browser app that lives in app/ as plain static
// files, plus a small set of screenshots in screenshots/. This program's only
// job is the hand-in: copy both folders into the output directory and ask the
// vendored make.fun library to describe them in a dossier.json. The grader
// sets the output directory itself; when running by hand, point
// MAKEFUN_OUTPUT_DIR at a scratch folder instead:
//
//   MAKEFUN_OUTPUT_DIR=/tmp/viceframe-out node main.ts
//
// Node 22 runs this TypeScript file directly, and nothing here needs a
// package beyond the standard library and vendor/makefun-app.ts.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Limits from the kit's gate reference. buildDossier already enforces them
// while it writes, but the hand-in re-checks the cheap ones afterwards so a
// bad tree fails loudly here rather than silently at grading time.
const GATE = {
  dossierTextBytes: 160 * 1024,
  dossierFileBytes: 1536 * 1024,
  shotCount: [3, 4] as const,
  shotBytes: 256 * 1024,
  shotLongSide: 1280,
  shotShortSide: 480,
  appEntries: 993,
  appBytes: 48 * 1024 * 1024,
  appPathBytes: 1000,
};

function copyTree(from: string, to: string): number {
  cpSync(from, to, { recursive: true });
  let files = 0;
  for (const entry of readdirSync(to, { withFileTypes: true })) {
    if (entry.isDirectory()) files += copyTreeCount(join(to, entry.name));
    else files += 1;
  }
  return files;
}

function copyTreeCount(dir: string): number {
  let files = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    files += entry.isDirectory() ? copyTreeCount(join(dir, entry.name)) : 1;
  }
  return files;
}

// Pixel dimensions of a PNG or JPEG without decoding it: PNG carries them in
// the IHDR chunk right after the signature; JPEG in a start-of-frame segment
// found by walking the marker chain. Returns null for anything else.
function imageSize(path: string): { w: number; h: number } | null {
  const buf = readFileSync(path);
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString("ascii", 12, 16) === "IHDR") {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let at = 2;
    while (at + 9 < buf.length) {
      if (buf[at] !== 0xff) return null;
      const marker = buf[at + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(at + 5), w: buf.readUInt16BE(at + 7) };
      }
      at += 2 + buf.readUInt16BE(at + 2);
    }
  }
  return null;
}

function checkHandedIn(dossierSize: number): string[] {
  const notes: string[] = [];
  const appDir = join(outDir, "app");
  if (!existsSync(join(appDir, "index.html"))) {
    throw new Error("hand-in check: app/index.html is missing from the output");
  }
  const shots = readdirSync(join(outDir, "screenshots")).filter((n) => !n.startsWith("."));
  const [minShots, maxShots] = GATE.shotCount;
  if (shots.length < minShots || shots.length > maxShots) {
    throw new Error(`hand-in check: need ${minShots}-${maxShots} screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const path = join(outDir, "screenshots", name);
    const { size } = statSync(path);
    if (size > GATE.shotBytes) {
      throw new Error(`hand-in check: ${name} weighs ${size} bytes, past the 256 KiB cap`);
    }
    const dims = imageSize(path);
    if (!dims) throw new Error(`hand-in check: ${name} is not a readable PNG or JPEG`);
    const long = Math.max(dims.w, dims.h);
    const short = Math.min(dims.w, dims.h);
    if (long > GATE.shotLongSide || short < GATE.shotShortSide) {
      throw new Error(
        `hand-in check: ${name} is ${dims.w}x${dims.h}, outside the ${GATE.shotLongSide}/${GATE.shotShortSide} side limits`,
      );
    }
  }
  if (dossierSize > GATE.dossierFileBytes) {
    throw new Error(`hand-in check: dossier.json weighs ${dossierSize} bytes, past the 1.5 MiB cap`);
  }
  notes.push(`${shots.length} screenshots within their caps`);
  return notes;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const appFiles = copyTree(join(root, "app"), join(outDir, "app"));
  let shotFiles = 0;
  const shotsFrom = join(root, "screenshots");
  if (existsSync(shotsFrom)) {
    shotFiles = copyTree(shotsFrom, join(outDir, "screenshots"));
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: GATE.dossierTextBytes,
    screenshots: { max: GATE.shotCount[1], max_bytes: GATE.shotBytes },
    app_max_files: GATE.appEntries,
    app_max_bytes: GATE.appBytes,
    app_path_max_bytes: GATE.appPathBytes,
  });
  writeFileSync(join(outDir, "dossier.json"), dossier);
  const notes = checkHandedIn(dossier.length);
  console.log(
    `ViceFrame handed in: ${appFiles} app files, ${shotFiles} screenshots, ` +
      `dossier.json ${dossier.length} bytes -> ${outDir} (${notes.join("; ")})`,
  );
}

main();
