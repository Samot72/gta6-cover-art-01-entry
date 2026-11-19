// main.ts — the hand-in program for the ViceFrame Cover Studio entry
// (make.fun bounty gta6-cover-art-01).
//
// The entry itself is a static browser app under app/ plus screenshots
// under screenshots/. This program performs the delivery: it mirrors both
// folders into the output directory, asks the vendored library in
// vendor/makefun-app.ts to write the dossier describing them, and then
// audits what it just wrote against the gate's published caps, so a bad
// tree fails here with a plain message instead of at grading time.
//
// Run it the way the grader does, with the output directory named by the
// environment (outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output):
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Node 22 runs the TypeScript directly; only the standard library and the
// vendored file are imported.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const target = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// The gate's caps, from the kit's reference file.
const CAPS = {
  textBytes: 160 * 1024, // dossier text section
  dossierBytes: 1536 * 1024, // dossier.json as a whole
  shotsMax: 4,
  shotsMin: 3,
  shotBytes: 256 * 1024,
  shotLong: 1280,
  shotShort: 480,
  appFiles: 993,
  appBytes: 48 * 1024 * 1024,
  appPathBytes: 1000,
} as const;

// Copy a folder across and report how many files landed.
function mirror(from: string, to: string): number {
  cpSync(from, to, { recursive: true });
  let n = 0;
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name));
      else n += 1;
    }
  };
  walk(to);
  return n;
}

// Read a PNG or JPEG's pixel size from its header bytes alone.
// PNG: width/height are big-endian uint32s inside IHDR, at offsets 16/20.
// JPEG: walk the marker segments until a start-of-frame marker turns up;
// its payload carries height then width.
function pixelSize(path: string): { w: number; h: number } | null {
  const b = readFileSync(path);
  const isPng = b.length > 24 && b.readUInt32BE(0) === 0x89504e47 && b.toString("latin1", 12, 16) === "IHDR";
  if (isPng) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let at = 2;
    while (at + 9 < b.length && b[at] === 0xff) {
      const marker = b[at + 1];
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { w: b.readUInt16BE(at + 7), h: b.readUInt16BE(at + 5) };
      at += 2 + b.readUInt16BE(at + 2);
    }
  }
  return null;
}

// Walk the delivered app tree once: entries counted (files and folders
// together, the gate's own count), file bytes summed, and every path's
// UTF-8 length measured. Returns the tallies for the audit to judge.
function surveyApp(appDir: string): { entries: number; bytes: number; longestPath: number } {
  let entries = 0;
  let bytes = 0;
  let longestPath = 0;
  const walk = (dir: string, rel: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      entries += 1;
      longestPath = Math.max(longestPath, Buffer.byteLength(childRel, "utf8"));
      if (e.isDirectory()) walk(join(dir, e.name), childRel);
      else bytes += statSync(join(dir, e.name)).size;
    }
  };
  walk(appDir, "");
  return { entries, bytes, longestPath };
}

// Post-delivery audit: the app's index page must be present, the app tree
// must fit its count/byte/path caps, the screenshot count and each
// screenshot's weight and sides must sit inside the caps, and the dossier
// must fit its own cap. Throws on the first violation.
function audit(dossierBytes: number): string {
  const appDir = join(target, "app");
  if (!existsSync(join(appDir, "index.html"))) {
    throw new Error("audit: app/index.html missing from the delivered tree");
  }
  const survey = surveyApp(appDir);
  if (survey.entries > CAPS.appFiles) {
    throw new Error(`audit: app/ holds ${survey.entries} entries, over the ${CAPS.appFiles} cap`);
  }
  if (survey.bytes > CAPS.appBytes) {
    throw new Error(`audit: app/ weighs ${survey.bytes} bytes, over the ${CAPS.appBytes}-byte cap`);
  }
  if (survey.longestPath > CAPS.appPathBytes) {
    throw new Error(`audit: longest app path is ${survey.longestPath} bytes, over the ${CAPS.appPathBytes}-byte cap`);
  }
  const shots = readdirSync(join(target, "screenshots")).filter((n) => !n.startsWith("."));
  if (shots.length < CAPS.shotsMin || shots.length > CAPS.shotsMax) {
    throw new Error(`audit: expected ${CAPS.shotsMin}-${CAPS.shotsMax} screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const path = join(target, "screenshots", name);
    const weight = statSync(path).size;
    if (weight > CAPS.shotBytes) {
      throw new Error(`audit: ${name} is ${weight} bytes, over the ${CAPS.shotBytes}-byte cap`);
    }
    const size = pixelSize(path);
    if (!size) throw new Error(`audit: ${name} is neither a readable PNG nor JPEG`);
    const long = Math.max(size.w, size.h);
    const short = Math.min(size.w, size.h);
    if (long > CAPS.shotLong || short < CAPS.shotShort) {
      throw new Error(`audit: ${name} measures ${size.w}x${size.h}, outside the side limits`);
    }
  }
  if (dossierBytes > CAPS.dossierBytes) {
    throw new Error(`audit: dossier.json is ${dossierBytes} bytes, over the ${CAPS.dossierBytes}-byte cap`);
  }
  return `${shots.length} screenshots inside their caps`;
}

function deliver(): void {
  mkdirSync(target, { recursive: true });
  const appCount = mirror(join(here, "app"), join(target, "app"));
  let shotCount = 0;
  const shotsFrom = join(here, "screenshots");
  if (existsSync(shotsFrom)) shotCount = mirror(shotsFrom, join(target, "screenshots"));
  const dossier = buildDossier(target, {
    text_max_bytes: CAPS.textBytes,
    screenshots: { max: CAPS.shotsMax, max_bytes: CAPS.shotBytes },
    app_max_files: CAPS.appFiles,
    app_max_bytes: CAPS.appBytes,
    app_path_max_bytes: CAPS.appPathBytes,
  });
  writeFileSync(join(target, "dossier.json"), dossier);
  const verdict = audit(dossier.length);
  console.log(
    `ViceFrame delivered: ${appCount} app files, ${shotCount} screenshots, ` +
      `dossier.json ${dossier.length} bytes -> ${target} (${verdict})`,
  );
}

deliver();
