// app.js — the studio floor around the poster engine in cover.js.
//
// This file owns the state (which picture each panel shows, how each is
// zoomed and nudged, the grade and the lettering), paints the live preview
// onto the stage canvas, and exports finished posters as PNG files. Photos
// are read from the reader's own disk and drawn locally; nothing is sent
// anywhere.

import { POSTER_SIZES, panelRects, renderPoster, scenePicture, photoPicture, paintScene } from "./cover.js";

// ------------------------------------------------------------------- state

const state = {
  layout: "hero",
  grade: "sunset",
  gradeMix: 0.8,
  grain: true,
  vignette: true,
  title: "VICE FRAME",
  script: "neon coast stories",
  caption: "ONE CITY. NO BRAKES.",
  stars: 5,
  size: "portrait",
  selected: 0,
  panels: [
    { pic: 0, zoom: 1.0, ox: 0, oy: 0 },
    { pic: 1, zoom: 1.22, ox: 0.02, oy: -0.02 },
    { pic: 2, zoom: 1.38, ox: -0.03, oy: 0.03 },
    { pic: 3, zoom: 1.28, ox: 0.04, oy: 0 },
  ],
};

// The picture shelf, in a fixed opening order: the two framed stills the
// studio ships, then the same two scenes painted live, then any photos the
// reader adds.
const shelf = [];
let settleReady;
const ready = new Promise((resolve) => { settleReady = resolve; });

function loadStill(path, kind, label) {
  return new Promise((resolve) => {
    const img = new Image();
    img.addEventListener("load", () => {
      const pic = photoPicture(img, label);
      pic.img = img;
      resolve(pic);
    });
    // A missing still must not stall the studio: paint the scene instead.
    img.addEventListener("error", () => resolve(scenePicture(kind)));
    img.src = path;
  });
}

async function openStudio() {
  const boulevard = await loadStill("samples/boulevard.jpg", "boulevard", "Still — sunset boulevard");
  const neon = await loadStill("samples/neon-street.jpg", "neon", "Still — neon street");
  shelf.push(boulevard, neon, scenePicture("boulevard"), scenePicture("neon"));
  settleReady();
  refreshShelf();
  requestDraw();
}

// ----------------------------------------------------------------- preview

const stage = document.getElementById("stageCanvas");
const pen = stage.getContext("2d");
let drawPending = false;

function previewDims() {
  const { w, h } = POSTER_SIZES[state.size];
  const k = Math.min(1, 960 / Math.max(w, h));
  return [Math.round(w * k), Math.round(h * k)];
}

function requestDraw() {
  if (drawPending) return;
  drawPending = true;
  requestAnimationFrame(() => {
    drawPending = false;
    const [w, h] = previewDims();
    if (stage.width !== w || stage.height !== h) {
      stage.width = w;
      stage.height = h;
    }
    renderPoster(pen, w, h, { ...state, selected: state.selected }, shelf);
  });
}

// A clean full-size render (no selection outline) — the export, and the
// surface the screenshot driver at the bottom of this file reuses.
function renderExport(sizeName) {
  const { w, h } = POSTER_SIZES[sizeName || state.size];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  renderPoster(c.getContext("2d"), w, h, { ...state, selected: -1 }, shelf);
  return c;
}

function downloadPoster() {
  renderExport().toBlob((blob) => {
    if (!blob) return;
    const { w, h } = POSTER_SIZES[state.size];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `viceframe-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, "image/png");
}

// ------------------------------------------------------------------ photos

const stripEl = document.getElementById("photoStrip");
const panelSelect = document.getElementById("panelPhotoSelect");
const panelNote = document.getElementById("panelLabel");
const zoomEl = document.getElementById("zoomRange");

function refreshShelf() {
  stripEl.replaceChildren();
  shelf.forEach((pic, i) => {
    let thumb;
    if (pic.img) {
      thumb = pic.img.cloneNode();
    } else {
      thumb = document.createElement("div");
      thumb.textContent = pic.label.replace("Studio scene — ", "Scene: ");
      thumb.classList.add("scene");
    }
    thumb.classList.add("photo-thumb");
    thumb.title = pic.label;
    if (state.panels[state.selected].pic === i) thumb.classList.add("on");
    thumb.addEventListener("click", () => assignToSelected(i));
    stripEl.append(thumb);
  });
  panelSelect.replaceChildren();
  shelf.forEach((pic, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${pic.label}`;
    panelSelect.append(opt);
  });
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  const count = panelRects(state.layout, 1, 1).length;
  panelNote.textContent = `Panel ${state.selected + 1} of ${count} — click a panel on the poster, then drag to position its photo.`;
  zoomEl.value = String(Math.round((panel.zoom || 1) * 100));
  panelSelect.value = String(panel.pic);
}

function assignToSelected(i) {
  state.panels[state.selected].pic = i;
  refreshShelf();
  requestDraw();
}

function addPhotoFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const img = new Image();
  img.addEventListener("load", () => {
    const pic = photoPicture(img, `Your photo — ${file.name}`);
    pic.img = img;
    shelf.push(pic);
    assignToSelected(shelf.length - 1);
  });
  img.src = URL.createObjectURL(file);
}

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", () => {
  for (const f of fileInput.files) addPhotoFile(f);
  fileInput.value = "";
});
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  document.body.classList.add("dragging");
});
window.addEventListener("dragleave", () => document.body.classList.remove("dragging"));
window.addEventListener("drop", (e) => {
  e.preventDefault();
  document.body.classList.remove("dragging");
  for (const f of e.dataTransfer.files) addPhotoFile(f);
});

// ------------------------------------------- panel picking, drag and zoom

function stageCoords(e) {
  const box = stage.getBoundingClientRect();
  return [
    (e.clientX - box.left) * (stage.width / box.width),
    (e.clientY - box.top) * (stage.height / box.height),
  ];
}

function panelAt(x, y) {
  const rects = panelRects(state.layout, stage.width, stage.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
stage.addEventListener("pointerdown", (e) => {
  const [x, y] = stageCoords(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  state.selected = i;
  drag = { x, y, ox: state.panels[i].ox || 0, oy: state.panels[i].oy || 0 };
  stage.setPointerCapture(e.pointerId);
  refreshShelf();
  requestDraw();
});
stage.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const [x, y] = stageCoords(e);
  const rect = panelRects(state.layout, stage.width, stage.height)[state.selected];
  const panel = state.panels[state.selected];
  const clamp = (v) => Math.max(-0.6, Math.min(0.6, v));
  panel.ox = clamp(drag.ox + (x - drag.x) / rect.w);
  panel.oy = clamp(drag.oy + (y - drag.y) / rect.h);
  requestDraw();
});
stage.addEventListener("pointerup", () => { drag = null; });
stage.addEventListener("wheel", (e) => {
  e.preventDefault();
  const [x, y] = stageCoords(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  state.selected = i;
  const panel = state.panels[i];
  panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) * (e.deltaY < 0 ? 1.09 : 0.92)));
  refreshShelf();
  requestDraw();
}, { passive: false });

zoomEl.addEventListener("input", () => {
  state.panels[state.selected].zoom = Number(zoomEl.value) / 100;
  requestDraw();
});
panelSelect.addEventListener("change", () => assignToSelected(Number(panelSelect.value)));
document.getElementById("fillAllBtn").addEventListener("click", () => {
  const pic = state.panels[state.selected].pic;
  for (const p of state.panels) p.pic = pic;
  requestDraw();
});
document.getElementById("shuffleBtn").addEventListener("click", () => {
  state.panels.forEach((p, i) => {
    p.pic = (p.pic + 1 + (i % 2)) % shelf.length;
    p.zoom = 1.08 + ((i * 41) % 42) / 100;
  });
  refreshShelf();
  requestDraw();
});

// ------------------------------------------------------------ control cards

function wireSeg(id, apply) {
  const seg = document.getElementById(id);
  seg.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    for (const b of seg.querySelectorAll("button")) b.classList.toggle("on", b === btn);
    apply(btn.dataset);
    requestDraw();
  });
}
wireSeg("layoutSeg", (d) => {
  state.layout = d.layout;
  const count = panelRects(state.layout, 1, 1).length;
  if (state.selected >= count) state.selected = 0;
  syncPanelControls();
});
wireSeg("gradeSeg", (d) => { state.grade = d.grade; });
wireSeg("sizeSeg", (d) => { state.size = d.size; });

document.getElementById("gradeRange").addEventListener("input", (e) => {
  state.gradeMix = Number(e.target.value) / 100;
  requestDraw();
});
document.getElementById("grainCheck").addEventListener("change", (e) => { state.grain = e.target.checked; requestDraw(); });
document.getElementById("vignetteCheck").addEventListener("change", (e) => { state.vignette = e.target.checked; requestDraw(); });
document.getElementById("starsRange").addEventListener("input", (e) => { state.stars = Number(e.target.value); requestDraw(); });
document.getElementById("titleInput").addEventListener("input", (e) => { state.title = e.target.value; requestDraw(); });
document.getElementById("subtitleInput").addEventListener("input", (e) => { state.script = e.target.value; requestDraw(); });
document.getElementById("captionInput").addEventListener("input", (e) => { state.caption = e.target.value; requestDraw(); });
document.getElementById("downloadBtn").addEventListener("click", downloadPoster);

// ------------------------------------------------------- screenshot driver
// A headless browser steers the real studio through this handle when the
// entry's screenshots are taken: it waits for `ready`, changes layout,
// grade and size exactly as the control cards do, paints scenes, and reads
// exported posters back as data URLs.
window.ViceFrame = {
  state,
  shelf,
  ready,
  paintScene,
  setLayout(v) { state.layout = v; requestDraw(); },
  setGrade(v) { state.grade = v; requestDraw(); },
  setSize(v) { state.size = v; requestDraw(); },
  exportDataURL(sizeName) { return renderExport(sizeName).toDataURL("image/png"); },
};

openStudio();
requestDraw();
