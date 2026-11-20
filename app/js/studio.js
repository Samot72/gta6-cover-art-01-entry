// studio.js — the Vice Grade Studio workbench.
// Wires the bench: photographs on the left, the cover on the stage, layouts,
// engines and grades on the right. Every control mutates one state object
// and repaints through the renderer, so what you see is byte-identical in
// kind to what Export PNG writes at full post size.

import { generateSamples } from './samples.js';
import { GRADES, GRADE_ORDER } from './grades.js';
import { ENGINES } from './engines.js';
import { LAYOUTS, LAYOUT_ORDER, layoutFor } from './layouts.js';
import { composeCover, panelRectsFor } from './renderer.js';
import { createRng } from './rng.js';

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const state = {
  sizeKey: '1080x1350',
  layoutId: 'hero-grid-6',
  engineId: 'painterly',
  gradeId: 'neon-vice',
  varyGrades: false,
  title: 'VICE GRADE',
  tagline: 'Six panels. One city. No brakes.',
  callout: 'The night belongs to us!',
  burst: '100% Pure Leonida',
  issue: 'Leonida City · Launch Week · Issue Nº 06',
  showSeal: true,
  showBarcode: true,
  showBilling: true,
  photos: [],
  panelPhotos: [0, 1, 2, 3, 4, 5, 0, 1, 2, 3],
  panelGrades: Array(12).fill('neon-vice'),
  activePanel: 0,
};

const $ = (id) => document.getElementById(id);
const stageCanvas = $('stage-canvas');
let remixCount = 0;

function photoForPanel(index) {
  if (!state.photos.length) return null;
  return state.photos[(state.panelPhotos[index] || 0) % state.photos.length];
}

// ---------- rendering ----------

function render() {
  const [fullW, fullH] = SIZES[state.sizeKey];
  const scale = 1080 / Math.max(fullW, fullH);
  stageCanvas.width = Math.round(fullW * scale * 0.8);
  stageCanvas.height = Math.round(fullH * scale * 0.8);
  composeCover(stageCanvas, state);
  drawEditorOverlay();
  updateCaption();
  markAssignedThumbs();
}

function drawEditorOverlay() {
  const ctx = stageCanvas.getContext('2d');
  const panels = panelRectsFor(state, stageCanvas.width, stageCanvas.height);
  ctx.save();
  panels.forEach((panel, i) => {
    const active = i === state.activePanel;
    if (active) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(panel.x + 2, panel.y + 2, panel.w - 4, panel.h - 4);
    }
    const chipW = 30;
    ctx.fillStyle = active ? '#22d3ee' : 'rgba(8,8,14,0.82)';
    ctx.beginPath();
    ctx.roundRect(panel.x + 8, panel.y + 8, chipW, 22, 6);
    ctx.fill();
    ctx.fillStyle = active ? '#06222b' : '#f5efe2';
    ctx.font = '800 13px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), panel.x + 8 + chipW / 2, panel.y + 19.5);
  });
  ctx.restore();
}

function updateCaption() {
  const layout = layoutFor(state.layoutId);
  const photo = photoForPanel(state.activePanel);
  $('stage-caption').textContent =
    `${layout.name} · ${ENGINES[state.engineId].name} engine · ${GRADES[state.gradeId].name}` +
    `${state.varyGrades ? ' (varied per panel)' : ''} · Panel ${state.activePanel + 1}: ${photo ? photo.name : 'empty'}` +
    ` · Export ${SIZES[state.sizeKey].join(' × ')} PNG`;
}

// ---------- photographs ----------

function thumbUrlFor(source) {
  const thumb = document.createElement('canvas');
  const ratio = (source.height || source.naturalHeight) / (source.width || source.naturalWidth);
  thumb.width = 200;
  thumb.height = Math.round(200 * ratio);
  thumb.getContext('2d').drawImage(source, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.72);
}

function addPhoto(photo) {
  photo.panX = photo.panX ?? 0;
  photo.panY = photo.panY ?? 0;
  photo.zoom = photo.zoom ?? 1;
  photo.thumb = thumbUrlFor(photo.source);
  state.photos.push(photo);
  renderTray();
}

function renderTray() {
  const tray = $('photo-tray');
  tray.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo-thumb';
    btn.dataset.index = String(index);
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.textContent = photo.name;
    btn.append(img, label);
    btn.addEventListener('click', () => {
      state.panelPhotos[state.activePanel] = index;
      render();
    });
    tray.appendChild(btn);
  });
  markAssignedThumbs();
}

function markAssignedThumbs() {
  document.querySelectorAll('.photo-thumb').forEach((el) => {
    const index = Number(el.dataset.index);
    el.classList.toggle('assigned', state.panelPhotos[state.activePanel] === index);
  });
}

async function loadFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const bitmap = await createImageBitmap(file);
    addPhoto({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      source: bitmap,
    });
  }
  render();
}

// ---------- stage interaction ----------

function panelAt(clientX, clientY) {
  const rect = stageCanvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * stageCanvas.width;
  const y = ((clientY - rect.top) / rect.height) * stageCanvas.height;
  const panels = panelRectsFor(state, stageCanvas.width, stageCanvas.height);
  const index = panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  return { index, x, y };
}

let drag = null;
stageCanvas.addEventListener('pointerdown', (event) => {
  const { index } = panelAt(event.clientX, event.clientY);
  if (index < 0) return;
  state.activePanel = index;
  const photo = photoForPanel(index);
  drag = { startX: event.clientX, startY: event.clientY, panX: photo.panX, panY: photo.panY, photo };
  stageCanvas.setPointerCapture(event.pointerId);
  render();
});
stageCanvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const rect = stageCanvas.getBoundingClientRect();
  drag.photo.panX = Math.max(-1, Math.min(1, drag.panX + ((event.clientX - drag.startX) / rect.width) * 2.2));
  drag.photo.panY = Math.max(-1, Math.min(1, drag.panY + ((event.clientY - drag.startY) / rect.height) * 2.2));
  render();
});
stageCanvas.addEventListener('pointerup', () => { drag = null; });

// ---------- controls ----------

function buildLayoutGallery() {
  const gallery = $('layout-gallery');
  for (const id of LAYOUT_ORDER) {
    const layout = LAYOUTS[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn' + (id === state.layoutId ? ' active' : '');
    btn.dataset.layout = id;
    const count = layout.panels(600, 750).length;
    btn.innerHTML = `<strong>${layout.name}</strong><small>${count} panel${count > 1 ? 's' : ''}</small>`;
    btn.addEventListener('click', () => {
      state.layoutId = id;
      state.activePanel = 0;
      document.querySelectorAll('.layout-btn').forEach((el) => el.classList.toggle('active', el.dataset.layout === id));
      render();
    });
    gallery.appendChild(btn);
  }
}

function buildEngineSwitch() {
  const wrap = $('engine-switch');
  for (const engine of Object.values(ENGINES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'engine-btn' + (engine.id === state.engineId ? ' active' : '');
    btn.dataset.engine = engine.id;
    btn.innerHTML = `<strong>${engine.name}</strong><small>${engine.blurb}</small>`;
    btn.addEventListener('click', () => {
      state.engineId = engine.id;
      document.querySelectorAll('.engine-btn').forEach((el) => el.classList.toggle('active', el.dataset.engine === engine.id));
      render();
    });
    wrap.appendChild(btn);
  }
}

function buildGradeList() {
  const list = $('grade-list');
  for (const id of GRADE_ORDER) {
    const grade = GRADES[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn' + (id === state.gradeId ? ' active' : '');
    btn.dataset.grade = id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `linear-gradient(90deg, ${grade.stops[0]}, ${grade.stops[1]}, ${grade.stops[2]})`;
    const label = document.createElement('strong');
    label.textContent = grade.name;
    btn.append(swatch, label);
    btn.addEventListener('click', () => {
      state.gradeId = id;
      if (!state.varyGrades) state.panelGrades = state.panelGrades.map(() => id);
      document.querySelectorAll('.grade-btn').forEach((el) => el.classList.toggle('active', el.dataset.grade === id));
      render();
    });
    list.appendChild(btn);
  }
}

function bindControls() {
  $('size-select').addEventListener('change', (e) => { state.sizeKey = e.target.value; render(); });
  $('title-input').value = state.title;
  $('tagline-input').value = state.tagline;
  $('callout-input').value = state.callout;
  $('burst-input').value = state.burst;
  $('issue-input').value = state.issue;
  $('title-input').addEventListener('input', (e) => { state.title = e.target.value || 'VICE GRADE'; render(); });
  $('tagline-input').addEventListener('input', (e) => { state.tagline = e.target.value; render(); });
  $('callout-input').addEventListener('input', (e) => { state.callout = e.target.value; render(); });
  $('burst-input').addEventListener('input', (e) => { state.burst = e.target.value; render(); });
  $('issue-input').addEventListener('input', (e) => { state.issue = e.target.value; render(); });
  $('seal-check').addEventListener('change', (e) => { state.showSeal = e.target.checked; render(); });
  $('barcode-check').addEventListener('change', (e) => { state.showBarcode = e.target.checked; render(); });
  $('billing-check').addEventListener('change', (e) => { state.showBilling = e.target.checked; render(); });
  $('vary-check').addEventListener('change', (e) => { state.varyGrades = e.target.checked; render(); });
  $('zoom-range').addEventListener('input', (e) => {
    const photo = photoForPanel(state.activePanel);
    if (photo) photo.zoom = Number(e.target.value);
    render();
  });
  $('remix-btn').addEventListener('click', () => {
    remixCount += 1;
    const rng = createRng(`remix-${remixCount}-${state.title}`);
    const order = [...GRADE_ORDER];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    state.panelGrades = state.panelGrades.map((_, i) => order[i % order.length]);
    state.varyGrades = true;
    $('vary-check').checked = true;
    render();
  });
  $('upload-btn').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (e) => loadFiles([...e.target.files]));
  const zone = $('drop-zone');
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragging');
    loadFiles([...e.dataTransfer.files]);
  });
  $('export-btn').addEventListener('click', exportPng);
  $('present-btn').addEventListener('click', () => showPresent());
  $('present').addEventListener('click', hidePresent);
  $('wall-btn').addEventListener('click', showWall);
  $('wall-close').addEventListener('click', () => { $('wall').hidden = true; });
}

// ---------- export, present, wall ----------

function exportPng() {
  const [w, h] = SIZES[state.sizeKey];
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  composeCover(out, state);
  out.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vice-grade-${state.layoutId}-${state.engineId}-${w}x${h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }, 'image/png');
}

let presentBackup = null;
function showPresent(overrides = {}) {
  presentBackup = {};
  for (const key of Object.keys(overrides)) {
    presentBackup[key] = state[key];
    state[key] = overrides[key];
  }
  const canvas = $('present-canvas');
  const [w, h] = SIZES[state.sizeKey];
  const fit = Math.min(window.innerWidth / w, window.innerHeight / h);
  canvas.width = Math.round(w * fit);
  canvas.height = Math.round(h * fit);
  composeCover(canvas, state);
  $('present').hidden = false;
}

function hidePresent() {
  $('present').hidden = true;
  if (presentBackup) {
    Object.assign(state, presentBackup);
    presentBackup = null;
    render();
  }
}

const WALL_VARIANTS = [
  { layoutId: 'hero-grid-6', engineId: 'painterly', gradeId: 'neon-vice', caption: 'Hero Grid · Painterly · Neon Vice' },
  { layoutId: 'cast-grid', engineId: 'ink', gradeId: 'sunset-haze', caption: 'Whole Cast · Ink · Sunset Haze' },
  { layoutId: 'magazine', engineId: 'painterly', gradeId: 'golden-palms', caption: 'Magazine · Painterly · Golden Palms' },
];

function showWall() {
  WALL_VARIANTS.forEach((variant, i) => {
    const canvas = $(`wall-canvas-${i + 1}`);
    const variantState = {
      ...state,
      layoutId: variant.layoutId,
      engineId: variant.engineId,
      gradeId: variant.gradeId,
      varyGrades: false,
    };
    composeCover(canvas, variantState);
    $(`wall-cap-${i + 1}`).textContent = variant.caption;
  });
  $('wall').hidden = false;
}

// ---------- boot ----------

for (const sample of generateSamples()) addPhoto(sample);
buildLayoutGallery();
buildEngineSwitch();
buildGradeList();
bindControls();
render();

// Hooks for screenshot tooling and curious users in the console.
window.viceGradeStudio = {
  state,
  render,
  showPresent,
  showWall,
  setLayout(id) { state.layoutId = id; render(); },
  setSize(key) { state.sizeKey = key; $('size-select').value = key; render(); },
};
