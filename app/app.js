// app.js — the editor around the cover engine in cover.js.
//
// Holds the studio's state (which picture sits in which panel, how far each
// is zoomed and dragged, the grade, the lettering), draws the live preview
// on the stage canvas, and exports the finished cover as a PNG. Everything
// happens on the reader's own machine: photos are read as local files and
// never leave the browser.

import { EXPORT_SIZES, layoutPanels, renderCover, paintedPicture, imagePicture, paintScene } from "./cover.js";

// ------------------------------------------------------------------ state --

const settings = {
  layout: "hero",
  grade: "sunset",
  gradeAmount: 0.8,
  grain: true,
  vignette: true,
  title: "VICE FRAME",
  tagline: "neon coast stories",
  caption: "ONE CITY. NO BRAKES.",
  heat: 5,
  size: "portrait",
  active: 0,
  panels: [
    { pic: 0, zoom: 1.0, ox: 0, oy: 0 },
    { pic: 1, zoom: 1.25, ox: 0.02, oy: -0.02 },
    { pic: 2, zoom: 1.4, ox: -0.04, oy: 0.03 },
    { pic: 3, zoom: 1.3, ox: 0.05, oy: 0 },
  ],
};

// Pictures in a fixed starting order: the two framed sample scenes the
// studio ships, then the two scenes it paints live, then whatever photos
// the reader adds.
const pictures = [];
let markReady;
const ready = new Promise((resolve) => { markReady = resolve; });

function loadSamplePicture(path, paintedKind, label) {
  return new Promise((resolve) => {
    const img = new Image();
    img.addEventListener("load", () => {
      const pic = imagePicture(img, label);
      pic.img = img;
      resolve(pic);
    });
    // If the framed sample is missing, fall back to the same scene painted
    // live so the studio still opens with a full set of pictures.
    img.addEventListener("error", () => resolve(paintedPicture(paintedKind)));
    img.src = path;
  });
}

async function loadInitialPictures() {
  const boulevard = await loadSamplePicture("samples/boulevard.jpg", "boulevard", "Sample photo — boulevard");
  const neon = await loadSamplePicture("samples/neon-street.jpg", "neon", "Sample photo — neon street");
  pictures.push(boulevard, neon, paintedPicture("boulevard"), paintedPicture("neon"));
  markReady();
  refreshPhotoStrip();
  queueDraw();
}

// --------------------------------------------------------------- preview --

const stage = document.getElementById("stageCanvas");
const stageCtx = stage.getContext("2d");
let drawQueued = false;

function previewSize() {
  const { w, h } = EXPORT_SIZES[settings.size];
  const scale = Math.min(1, 960 / Math.max(w, h));
  return [Math.round(w * scale), Math.round(h * scale)];
}

function queueDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    const [w, h] = previewSize();
    if (stage.width !== w || stage.height !== h) {
      stage.width = w;
      stage.height = h;
    }
    renderCover(stageCtx, w, h, settings, pictures);
  });
}

// A full-size render with no selection outline — what Download hands over,
// and what the screenshot hook below reuses.
function exportCanvas(sizeName) {
  const { w, h } = EXPORT_SIZES[sizeName || settings.size];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  renderCover(c.getContext("2d"), w, h, { ...settings, active: -1 }, pictures);
  return c;
}

function downloadCover() {
  exportCanvas().toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    const { w, h } = EXPORT_SIZES[settings.size];
    link.href = URL.createObjectURL(blob);
    link.download = `viceframe-cover-${w}x${h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  }, "image/png");
}

// ---------------------------------------------------------------- photos --

const strip = document.getElementById("photoStrip");
const panelPhoto = document.getElementById("panelPhotoSelect");
const panelNote = document.getElementById("panelLabel");
const zoomSlider = document.getElementById("zoomRange");

function refreshPhotoStrip() {
  strip.replaceChildren();
  pictures.forEach((pic, i) => {
    let thumb;
    if (pic.img) {
      thumb = pic.img.cloneNode();
    } else {
      thumb = document.createElement("div");
      thumb.textContent = pic.label.replace("Painted scene — ", "Painted: ");
      thumb.classList.add("scene");
    }
    thumb.classList.add("photo-thumb");
    thumb.title = pic.label;
    if (settings.panels[settings.active].pic === i) thumb.classList.add("on");
    thumb.addEventListener("click", () => putInActivePanel(i));
    strip.append(thumb);
  });
  panelPhoto.replaceChildren();
  pictures.forEach((pic, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${pic.label}`;
    panelPhoto.append(opt);
  });
  syncPanelControls();
}

function syncPanelControls() {
  const panel = settings.panels[settings.active];
  const count = layoutPanels(settings.layout, 1, 1).length;
  panelNote.textContent = `Panel ${settings.active + 1} of ${count} — click a panel on the cover, then drag to position its photo.`;
  zoomSlider.value = String(Math.round((panel.zoom || 1) * 100));
  panelPhoto.value = String(panel.pic);
}

function putInActivePanel(i) {
  settings.panels[settings.active].pic = i;
  refreshPhotoStrip();
  queueDraw();
}

function addPhoto(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const img = new Image();
  img.addEventListener("load", () => {
    const pic = imagePicture(img, `Your photo — ${file.name}`);
    pic.img = img;
    pictures.push(pic);
    putInActivePanel(pictures.length - 1);
  });
  img.src = URL.createObjectURL(file);
}

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", () => {
  for (const file of fileInput.files) addPhoto(file);
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
  for (const file of e.dataTransfer.files) addPhoto(file);
});

// ------------------------------------------------- panel drag, zoom, pick --

function stagePoint(e) {
  const box = stage.getBoundingClientRect();
  return [
    (e.clientX - box.left) * (stage.width / box.width),
    (e.clientY - box.top) * (stage.height / box.height),
  ];
}

function panelIndexAt(x, y) {
  const rects = layoutPanels(settings.layout, stage.width, stage.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

let dragState = null;
stage.addEventListener("pointerdown", (e) => {
  const [x, y] = stagePoint(e);
  const i = panelIndexAt(x, y);
  if (i < 0) return;
  settings.active = i;
  dragState = { x, y, ox: settings.panels[i].ox || 0, oy: settings.panels[i].oy || 0 };
  stage.setPointerCapture(e.pointerId);
  refreshPhotoStrip();
  queueDraw();
});
stage.addEventListener("pointermove", (e) => {
  if (!dragState) return;
  const [x, y] = stagePoint(e);
  const rect = layoutPanels(settings.layout, stage.width, stage.height)[settings.active];
  const panel = settings.panels[settings.active];
  const clamp = (v) => Math.max(-0.6, Math.min(0.6, v));
  panel.ox = clamp(dragState.ox + (x - dragState.x) / rect.w);
  panel.oy = clamp(dragState.oy + (y - dragState.y) / rect.h);
  queueDraw();
});
stage.addEventListener("pointerup", () => { dragState = null; });
stage.addEventListener("wheel", (e) => {
  e.preventDefault();
  const [x, y] = stagePoint(e);
  const i = panelIndexAt(x, y);
  if (i < 0) return;
  settings.active = i;
  const panel = settings.panels[i];
  panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) * (e.deltaY < 0 ? 1.09 : 0.92)));
  refreshPhotoStrip();
  queueDraw();
}, { passive: false });

zoomSlider.addEventListener("input", () => {
  settings.panels[settings.active].zoom = Number(zoomSlider.value) / 100;
  queueDraw();
});
panelPhoto.addEventListener("change", () => putInActivePanel(Number(panelPhoto.value)));
document.getElementById("fillAllBtn").addEventListener("click", () => {
  const pic = settings.panels[settings.active].pic;
  for (const panel of settings.panels) panel.pic = pic;
  queueDraw();
});
document.getElementById("shuffleBtn").addEventListener("click", () => {
  settings.panels.forEach((panel, i) => {
    panel.pic = (panel.pic + 1 + (i % 2)) % pictures.length;
    panel.zoom = 1.1 + ((i * 37) % 40) / 100;
  });
  refreshPhotoStrip();
  queueDraw();
});

// ------------------------------------------------------------- the controls --

function wireSegmented(id, apply) {
  const seg = document.getElementById(id);
  seg.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    for (const b of seg.querySelectorAll("button")) b.classList.toggle("on", b === btn);
    apply(btn.dataset);
    queueDraw();
  });
}
wireSegmented("layoutSeg", (d) => {
  settings.layout = d.layout;
  const count = layoutPanels(settings.layout, 1, 1).length;
  if (settings.active >= count) settings.active = 0;
  syncPanelControls();
});
wireSegmented("gradeSeg", (d) => { settings.grade = d.grade; });
wireSegmented("sizeSeg", (d) => { settings.size = d.size; });

document.getElementById("gradeRange").addEventListener("input", (e) => {
  settings.gradeAmount = Number(e.target.value) / 100;
  queueDraw();
});
document.getElementById("grainCheck").addEventListener("change", (e) => { settings.grain = e.target.checked; queueDraw(); });
document.getElementById("vignetteCheck").addEventListener("change", (e) => { settings.vignette = e.target.checked; queueDraw(); });
document.getElementById("starsRange").addEventListener("input", (e) => { settings.heat = Number(e.target.value); queueDraw(); });
document.getElementById("titleInput").addEventListener("input", (e) => { settings.title = e.target.value; queueDraw(); });
document.getElementById("subtitleInput").addEventListener("input", (e) => { settings.tagline = e.target.value; queueDraw(); });
document.getElementById("captionInput").addEventListener("input", (e) => { settings.caption = e.target.value; queueDraw(); });
document.getElementById("downloadBtn").addEventListener("click", downloadCover);

// Screenshot hook: a headless browser drives the real studio through this —
// it waits for `ready`, changes layout/grade/size exactly as the controls
// do, and reads exported covers back as data URLs.
window.viceFrameStudio = {
  settings,
  pictures,
  ready,
  paintScene,
  setLayout(layout) { settings.layout = layout; queueDraw(); },
  setGrade(grade) { settings.grade = grade; queueDraw(); },
  setSize(size) { settings.size = size; queueDraw(); },
  exportDataURL(sizeName) { return exportCanvas(sizeName).toDataURL("image/png"); },
};

loadInitialPictures();
queueDraw();
