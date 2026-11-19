// ViceFrame Cover Studio — entry program for gta6-cover-art-01 (Node 22, standard
// library only). The deliverable is the offline web app under app/ (app/index.html and
// its modules, plain static files, no network request) plus the screenshots under
// screenshots/. This program hands them in: it copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there with
// buildDossier from the vendored make.fun library, byte for byte as the scorer's own
// copy writes it. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoDir = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// The gate's caps (the kit's reference/gate.json): the dossier text is capped at
// 160 KiB, screenshots at 4 files of 256 KiB, the app at 993 entries and 48 MiB with
// no path over 1,000 bytes. buildDossier refuses anything past them, so an entry this
// program writes out is one the scorer's first four rows accept.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoDir, "app"), join(outputDir, "app"), { recursive: true });
  mkdirSync(join(outputDir, "screenshots"), { recursive: true });
  const shotsDir = join(repoDir, "screenshots");
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(outputDir, "screenshots"), { recursive: true });
  }
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, "dossier.json"), dossier);
  verifyHandIn(dossier.length);
  console.log(`handed in: app/ + screenshots/ -> ${outputDir}, dossier.json ${dossier.length} bytes`);
}

// Read the output back before reporting success: the app tree must hold an
// index.html, the screenshots must number 3 or 4, and the dossier must sit under
// its 1.5 MiB cap. A mismatch throws, so a broken hand-in never exits quietly.
function verifyHandIn(dossierBytes: number) {
  const appIndex = join(outputDir, "app", "index.html");
  if (!existsSync(appIndex)) throw new Error("verify: app/index.html missing from the output");
  const shots = readdirSync(join(outputDir, "screenshots")).filter((name) => !name.startsWith("."));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`verify: expected 3 or 4 screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = statSync(join(outputDir, "screenshots", name)).size;
    if (size > DOSSIER_CAPS.screenshots.max_bytes) {
      throw new Error(`verify: screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
    }
  }
  if (dossierBytes > 1_572_864) throw new Error(`verify: dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
}

handIn();
