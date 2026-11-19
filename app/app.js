// ViceFrame Cover Studio — editor wiring: photos, panels, lettering, live preview and
// PNG export, all on the reader's own machine. The painting itself lives in cover.js.
import { EXPORT_SIZES, drawCover, paintScene, makeSceneSource, makeImageSource, panelRects } from './cover.js';

const state = {
  layout: 'hero',
  grade: 'sunset',
  gradeStrength: 0.8,
  grain: true,
  vignette: true,
  title: 'VICE FRAME',
  subtitle: 'neon coast stories',
  caption: 'ONE CITY. NO BRAKES.',
  stars: 5,
  size: 'portrait',
  selected: 0,
  panels: [
    { source: 0, zoom: 1.0, dx: 0, dy: 0 },
    { source: 1, zoom: 1.25, dx: 0.02, dy: -0.02 },
    { source: 2, zoom: 1.4, dx: -0.04, dy: 0.03 },
    { source: 3, zoom: 1.3, dx: 0.05, dy: 0 },
  ],
};

// The source list is built in a fixed order: the two framed sample scenes (photos the
// studio ships), then the two painted scenes drawn live, then the reader's own photos.
const sources = [];
let sourcesReadyResolve;
const sourcesReady = new Promise((resolve) => { sourcesReadyResolve = resolve; });

function loadSample(path, variant, name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const source = makeImageSource(img, name);
      source.imgEl = img;
      resolve(source);
    };
    img.onerror = () => resolve(makeSceneSource(variant)); // painted fallback, same look
    img.src = path;
  });
}

async function buildSources() {
  const boulevard = await loadSample('samples/boulevard.jpg', 'boulevard', 'Sample photo: boulevard');
  const neon = await loadSample('samples/neon-street.jpg', 'neon', 'Sample photo: neon street');
  sources.push(boulevard, neon, makeSceneSource('boulevard'), makeSceneSource('neon'));
  sourcesReadyResolve();
  refreshPhotoUI();
  scheduleRender();
}

const canvas = document.getElementById('stageCanvas');
const ctx = canvas.getContext('2d');
let renderQueued = false;

function previewDims() {
  const [W, H] = EXPORT_SIZES[state.size];
  const scale = Math.min(1, 960 / Math.max(W, H));
  return [Math.round(W * scale), Math.round(H * scale)];
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const [w, h] = previewDims();
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    drawCover(ctx, w, h, state, sources);
  });
}

// Render the cover at full export size with no selection outline; used by Download
// and by the screenshot tooling hook below.
function renderExport(sizeName) {
  const [W, H] = EXPORT_SIZES[sizeName || state.size];
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  drawCover(out.getContext('2d'), W, H, { ...state, size: sizeName || state.size, selected: -1 }, sources);
  return out;
}

function downloadPNG() {
  renderExport().toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const [W, H] = EXPORT_SIZES[state.size];
    a.download = `viceframe-cover-${W}x${H}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// ---- Photos ---------------------------------------------------------------

const photoStrip = document.getElementById('photoStrip');
const panelPhotoSelect = document.getElementById('panelPhotoSelect');

function refreshPhotoUI() {
  photoStrip.replaceChildren();
  sources.forEach((source, i) => {
    let el;
    if (source.thumb) {
      el = source.thumb.cloneNode();
    } else if (source.imgEl) {
      el = source.imgEl.cloneNode();
    } else {
      el = document.createElement('div');
      el.textContent = source.name.replace('Painted scene: ', 'Painted: ');
      el.classList.add('scene');
    }
    el.classList.add('photo-thumb');
    el.title = source.name;
    if (state.panels[state.selected] && state.panels[state.selected].source === i) el.classList.add('on');
    el.addEventListener('click', () => assignSourceToSelected(i));
    photoStrip.append(el);
  });
  panelPhotoSelect.replaceChildren();
  sources.forEach((source, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${source.name}`;
    panelPhotoSelect.append(opt);
  });
  syncPanelControls();
}

function assignSourceToSelected(i) {
  state.panels[state.selected].source = i;
  refreshPhotoUI();
  scheduleRender();
}

function addPhotoFile(file) {
  if (!file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const source = makeImageSource(img, `Your photo: ${file.name}`);
    source.imgEl = img;
    sources.push(source);
    assignSourceToSelected(sources.length - 1);
  };
  img.src = url;
}

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', () => {
  for (const file of fileInput.files) addPhotoFile(file);
  fileInput.value = '';
});
window.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
window.addEventListener('dragleave', () => document.body.classList.remove('dragging'));
window.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragging');
  for (const file of e.dataTransfer.files) addPhotoFile(file);
});

// ---- Panel selection, drag and zoom ----------------------------------------

const panelLabel = document.getElementById('panelLabel');
const zoomRange = document.getElementById('zoomRange');

function syncPanelControls() {
  const panel = state.panels[state.selected];
  const count = panelRects(state.layout, 1, 1).length;
  panelLabel.textContent = `Panel ${state.selected + 1} of ${count} — click a panel on the cover, drag it to position its photo.`;
  zoomRange.value = String(Math.round((panel.zoom || 1) * 100));
  panelPhotoSelect.value = String(panel.source);
}

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return [
    (e.clientX - rect.left) * (canvas.width / rect.width),
    (e.clientY - rect.top) * (canvas.height / rect.height),
  ];
}

function panelAt(x, y) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const [x, y] = canvasPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  state.selected = i;
  drag = { x, y, dx: state.panels[i].dx || 0, dy: state.panels[i].dy || 0 };
  canvas.setPointerCapture(e.pointerId);
  refreshPhotoUI();
  scheduleRender();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [x, y] = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const r = rects[state.selected];
  const panel = state.panels[state.selected];
  panel.dx = Math.max(-0.6, Math.min(0.6, drag.dx + (x - drag.x) / r.w));
  panel.dy = Math.max(-0.6, Math.min(0.6, drag.dy + (y - drag.y) / r.h));
  scheduleRender();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [x, y] = canvasPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  state.selected = i;
  const panel = state.panels[i];
  panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) * (e.deltaY < 0 ? 1.09 : 0.92)));
  refreshPhotoUI();
  scheduleRender();
}, { passive: false });

zoomRange.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomRange.value) / 100;
  scheduleRender();
});
panelPhotoSelect.addEventListener('change', () => assignSourceToSelected(Number(panelPhotoSelect.value)));
document.getElementById('fillAllBtn').addEventListener('click', () => {
  const source = state.panels[state.selected].source;
  for (const panel of state.panels) panel.source = source;
  scheduleRender();
});
document.getElementById('shuffleBtn').addEventListener('click', () => {
  state.panels.forEach((panel, i) => {
    panel.source = (panel.source + 1 + (i % 2)) % sources.length;
    panel.zoom = 1.1 + ((i * 37) % 40) / 100;
  });
  refreshPhotoUI();
  scheduleRender();
});

// ---- Segmented controls and text fields -------------------------------------

function wireSeg(id, apply) {
  const seg = document.getElementById(id);
  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    for (const b of seg.querySelectorAll('button')) b.classList.toggle('on', b === btn);
    apply(btn.dataset);
    scheduleRender();
  });
}
wireSeg('layoutSeg', (d) => {
  state.layout = d.layout;
  const count = panelRects(state.layout, 1, 1).length;
  if (state.selected >= count) state.selected = 0;
  syncPanelControls();
});
wireSeg('gradeSeg', (d) => { state.grade = d.grade; });
wireSeg('sizeSeg', (d) => { state.size = d.size; });

document.getElementById('gradeRange').addEventListener('input', (e) => {
  state.gradeStrength = Number(e.target.value) / 100;
  scheduleRender();
});
document.getElementById('grainCheck').addEventListener('change', (e) => { state.grain = e.target.checked; scheduleRender(); });
document.getElementById('vignetteCheck').addEventListener('change', (e) => { state.vignette = e.target.checked; scheduleRender(); });
document.getElementById('starsRange').addEventListener('input', (e) => { state.stars = Number(e.target.value); scheduleRender(); });
document.getElementById('titleInput').addEventListener('input', (e) => { state.title = e.target.value; scheduleRender(); });
document.getElementById('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; scheduleRender(); });
document.getElementById('captionInput').addEventListener('input', (e) => { state.caption = e.target.value; scheduleRender(); });
document.getElementById('downloadBtn').addEventListener('click', downloadPNG);

// Tooling hook: lets a headless browser drive the real app for its screenshots —
// paint a built-in scene, export a cover exactly as Download does, read the state.
window.__viceframe = {
  state,
  sources,
  ready: sourcesReady,
  paintScene,
  setLayout(layout) { state.layout = layout; scheduleRender(); },
  setGrade(grade) { state.grade = grade; scheduleRender(); },
  setSize(size) { state.size = size; scheduleRender(); },
  exportDataURL(sizeName) { return renderExport(sizeName).toDataURL('image/png'); },
};

buildSources();
scheduleRender();
