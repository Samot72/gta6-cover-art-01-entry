// samples.js — the studio's built-in sample photographs.
// No stock, no downloads: each sample is painted fresh by these functions
// the first time the studio opens — flat-illustration scenes with grain,
// made to be graded, inked and panelled exactly like a user's own photo.

import { createRng } from './rng.js';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function verticalGradient(ctx, width, height, stops) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  for (const [at, colour] of stops) grad.addColorStop(at, colour);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function glowDisc(ctx, x, y, radius, colour) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, colour);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function palmSilhouette(ctx, x, baseY, size, colour, flip = 1) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(flip * size, size);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 0.045;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(0.06, -0.5, 0.16, -0.92);
  ctx.stroke();
  ctx.translate(0.16, -0.92);
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (0.08 + i * 0.13);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(angle) * 0.3, -Math.sin(angle) * 0.3 - 0.08, Math.cos(angle) * 0.52, -Math.sin(angle) * 0.34 + 0.14);
    ctx.lineWidth = 0.03;
    ctx.stroke();
  }
  ctx.restore();
}

// A bust portrait in flat shapes: hair mass, face, shades, shirt, jewellery.
function bustPortrait(ctx, o) {
  const { cx, baseY, s, skin, hair, shirt } = o;
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(s, s);
  // Shirt / shoulders.
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(-0.62, 0.62);
  ctx.quadraticCurveTo(-0.58, 0.08, -0.3, -0.02);
  ctx.lineTo(0.3, -0.02);
  ctx.quadraticCurveTo(0.58, 0.08, 0.62, 0.62);
  ctx.closePath();
  ctx.fill();
  if (o.shirtPattern) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = o.shirtPattern;
    const rng = createRng(o.name || 'pattern');
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.arc(rng.range(-0.6, 0.6), rng.range(0.02, 0.6), rng.range(0.02, 0.045), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // Neck and face.
  ctx.fillStyle = skin;
  ctx.fillRect(-0.09, -0.34, 0.18, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, -0.52, 0.21, 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair.
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(0, -0.66, 0.235, 0.17, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  if (o.longHair) {
    ctx.fillRect(-0.24, -0.68, 0.1, 0.52);
    ctx.fillRect(0.14, -0.68, 0.1, 0.52);
  }
  if (o.hat) {
    ctx.fillStyle = o.hat;
    ctx.fillRect(-0.3, -0.72, 0.6, 0.07);
    ctx.beginPath();
    ctx.ellipse(0, -0.72, 0.19, 0.1, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  if (o.beard) {
    ctx.fillStyle = o.beard;
    ctx.beginPath();
    ctx.ellipse(0, -0.4, 0.17, 0.13, 0, 0, Math.PI);
    ctx.fill();
  }
  if (o.glasses) {
    ctx.fillStyle = '#101018';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(side * 0.105 - 0.085, -0.6, 0.17, 0.11, 0.04);
      ctx.fill();
    }
    ctx.fillRect(-0.03, -0.56, 0.06, 0.03);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-0.16, -0.585, 0.06, 0.025);
    ctx.fillRect(0.055, -0.585, 0.06, 0.025);
  }
  if (o.chain) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.arc(0, -0.06, 0.17, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0.1, 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.lips) {
    ctx.fillStyle = o.lips;
    ctx.beginPath();
    ctx.ellipse(0, -0.36, 0.055, 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function filmSpeckle(ctx, width, height, seed, count = 2600, alpha = 0.05) {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rng.chance(0.5) ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(rng.range(0, width), rng.range(0, height), rng.range(1, 2.4), rng.range(1, 2.4));
  }
  ctx.restore();
}

function paintBoulevardMuse() {
  const c = makeCanvas(880, 1100);
  const ctx = c.getContext('2d');
  verticalGradient(ctx, 880, 1100, [[0, '#3b1d63'], [0.55, '#c94f6d'], [0.8, '#ff9a5a'], [1, '#ffc65c']]);
  glowDisc(ctx, 660, 700, 330, 'rgba(255,170,80,0.75)');
  ctx.fillStyle = '#ffd9a0';
  ctx.beginPath();
  ctx.arc(660, 700, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#57294d';
  ctx.fillRect(0, 830, 880, 270);
  palmSilhouette(ctx, 90, 900, 300, '#2a1030');
  palmSilhouette(ctx, 800, 880, 240, '#2a1030', -1);
  bustPortrait(ctx, { cx: 440, baseY: 1085, s: 560, skin: '#b06a3b', hair: '#170d0d', shirt: '#f5efe2', longHair: true, glasses: true, chain: true, lips: '#a31621', name: 'muse' });
  filmSpeckle(ctx, 880, 1100, 'muse');
  return c;
}

function paintRooftopMarco() {
  const c = makeCanvas(880, 1100);
  const ctx = c.getContext('2d');
  verticalGradient(ctx, 880, 1100, [[0, '#1d1440'], [0.6, '#6e2a5e'], [1, '#c65b4e']]);
  const rng = createRng('rooftop');
  ctx.fillStyle = '#241539';
  for (let x = 0; x < 880; x += rng.int(60, 110)) {
    const h = rng.int(180, 420);
    ctx.fillRect(x, 760 - h, rng.int(50, 95), h);
  }
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 130; i++) ctx.fillRect(rng.range(0, 880), rng.range(380, 740), 5, 7);
  ctx.fillStyle = '#170d28';
  ctx.fillRect(0, 760, 880, 340);
  bustPortrait(ctx, { cx: 440, baseY: 1090, s: 580, skin: '#8a4f2a', hair: '#0f0a08', shirt: '#274156', shirtPattern: '#e0524d', beard: '#0f0a08', chain: true, name: 'marco' });
  filmSpeckle(ctx, 880, 1100, 'marco');
  return c;
}

function paintNeonDuo() {
  const c = makeCanvas(880, 1100);
  const ctx = c.getContext('2d');
  verticalGradient(ctx, 880, 1100, [[0, '#060218'], [0.7, '#1c0b3d'], [1, '#2c1150']]);
  const signs = [['#ff2e88', 120, 180], ['#22d3ee', 700, 300], ['#ffd166', 160, 470], ['#3dff9e', 730, 560]];
  for (const [colour, x, y] of signs) {
    glowDisc(ctx, x, y, 170, colour + 'aa');
    ctx.strokeStyle = colour;
    ctx.lineWidth = 6;
    ctx.strokeRect(x - 80, y - 46, 160, 92);
  }
  ctx.fillStyle = '#0a0618';
  ctx.fillRect(0, 830, 880, 270);
  ctx.fillStyle = 'rgba(255,46,136,0.25)';
  ctx.fillRect(60, 850, 200, 200);
  ctx.fillStyle = 'rgba(34,211,238,0.22)';
  ctx.fillRect(620, 850, 200, 200);
  bustPortrait(ctx, { cx: 300, baseY: 1090, s: 520, skin: '#c98a5a', hair: '#241016', shirt: '#101018', longHair: true, glasses: true, lips: '#d6336c', name: 'duo-a' });
  bustPortrait(ctx, { cx: 610, baseY: 1095, s: 500, skin: '#6e3f22', hair: '#050505', shirt: '#3d1160', chain: true, name: 'duo-b' });
  filmSpeckle(ctx, 880, 1100, 'duo');
  return c;
}

function paintPierAngler() {
  const c = makeCanvas(880, 1100);
  const ctx = c.getContext('2d');
  verticalGradient(ctx, 880, 1100, [[0, '#7dd3fc'], [0.45, '#38bdf8'], [0.62, '#0e7a9e'], [1, '#0a5d7d']]);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  const rng = createRng('pier');
  for (let i = 0; i < 60; i++) ctx.fillRect(rng.range(0, 880), rng.range(690, 1060), rng.range(14, 46), 4);
  ctx.fillStyle = '#5d4028';
  ctx.fillRect(0, 800, 880, 300);
  ctx.fillStyle = '#4a331f';
  for (let x = 20; x < 880; x += 90) ctx.fillRect(x, 800, 14, 300);
  ctx.strokeStyle = '#2a1a0c';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(560, 620);
  ctx.lineTo(880, 300);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(880, 300);
  ctx.lineTo(840, 640);
  ctx.stroke();
  bustPortrait(ctx, { cx: 400, baseY: 1085, s: 560, skin: '#a06844', hair: '#cfd4d6', shirt: '#e8e4da', hat: '#d9c9a3', beard: '#cfd4d6', name: 'angler' });
  filmSpeckle(ctx, 880, 1100, 'angler');
  return c;
}

function paintConvertible() {
  const c = makeCanvas(1100, 880);
  const ctx = c.getContext('2d');
  verticalGradient(ctx, 1100, 880, [[0, '#43205e'], [0.55, '#d6546a'], [1, '#ffb347']]);
  glowDisc(ctx, 250, 560, 300, 'rgba(255,160,80,0.8)');
  ctx.fillStyle = '#2c1230';
  ctx.fillRect(0, 640, 1100, 240);
  palmSilhouette(ctx, 120, 700, 260, '#1d0b24');
  palmSilhouette(ctx, 990, 690, 300, '#1d0b24', -1);
  // The car: long bonnet, open top, whitewalls.
  ctx.fillStyle = '#8f1d2c';
  ctx.beginPath();
  ctx.moveTo(90, 700);
  ctx.quadraticCurveTo(100, 630, 240, 622);
  ctx.lineTo(430, 612);
  ctx.quadraticCurveTo(470, 540, 560, 538);
  ctx.lineTo(700, 540);
  ctx.quadraticCurveTo(760, 545, 800, 610);
  ctx.lineTo(950, 622);
  ctx.quadraticCurveTo(1030, 630, 1032, 700);
  ctx.lineTo(960, 716);
  ctx.arc(830, 716, 66, 0, Math.PI, true);
  ctx.lineTo(360, 716);
  ctx.arc(240, 716, 66, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5d1120';
  ctx.fillRect(430, 560, 330, 56);
  for (const wx of [240, 830]) {
    ctx.fillStyle = '#14100e';
    ctx.beginPath();
    ctx.arc(wx, 716, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e4da';
    ctx.beginPath();
    ctx.arc(wx, 716, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8f1d2c';
    ctx.beginPath();
    ctx.arc(wx, 716, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  bustPortrait(ctx, { cx: 590, baseY: 560, s: 330, skin: '#7a4526', hair: '#0d0906', shirt: '#101820', glasses: true, name: 'driver' });
  filmSpeckle(ctx, 1100, 880, 'convertible');
  return c;
}

function paintBeachWatch() {
  const c = makeCanvas(880, 1100);
  const ctx = c.getContext('2d');
  verticalGradient(ctx, 880, 1100, [[0, '#8fd8f2'], [0.42, '#4fc3e8'], [0.58, '#19a7c4'], [0.72, '#f2dfae'], [1, '#e8cf92']]);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(200, 140, 120, 34, 0, 0, Math.PI * 2);
  ctx.ellipse(660, 100, 150, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lifeguard tower.
  ctx.fillStyle = '#c94f3d';
  ctx.fillRect(560, 560, 220, 130);
  ctx.fillStyle = '#f5efe2';
  ctx.fillRect(545, 530, 250, 34);
  ctx.strokeStyle = '#8a5a30';
  ctx.lineWidth = 16;
  for (const [x1, x2] of [[590, 540], [750, 800]]) {
    ctx.beginPath();
    ctx.moveTo(x1, 690);
    ctx.lineTo(x2, 1080);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(670, 585);
  ctx.lineTo(670, 655);
  ctx.moveTo(635, 620);
  ctx.lineTo(705, 620);
  ctx.stroke();
  palmSilhouette(ctx, 110, 1080, 330, '#7a4a21');
  bustPortrait(ctx, { cx: 330, baseY: 1095, s: 520, skin: '#5d3a1e', hair: '#0a0a0a', shirt: '#d63c2f', glasses: true, chain: true, name: 'watch' });
  filmSpeckle(ctx, 880, 1100, 'watch');
  return c;
}

const SAMPLE_DEFS = [
  { id: 'sample-muse', name: 'VIVI — Boulevard Muse', paint: paintBoulevardMuse, panY: -0.65 },
  { id: 'sample-marco', name: 'MARCO — Rooftop', paint: paintRooftopMarco, panY: -0.65 },
  { id: 'sample-duo', name: 'SOL & REYES — Neon Duo', paint: paintNeonDuo, panY: -0.6 },
  { id: 'sample-angler', name: 'OLD TIDE — Pier Angler', paint: paintPierAngler, panY: -0.7 },
  { id: 'sample-convertible', name: 'REDLINE — Convertible', paint: paintConvertible, panY: -0.05 },
  { id: 'sample-watch', name: 'PALM WATCH — Beach', paint: paintBeachWatch, panY: -0.7 },
];

let sampleCache = null;
export function generateSamples() {
  if (sampleCache) return sampleCache;
  sampleCache = SAMPLE_DEFS.map((def) => ({ id: def.id, name: def.name, source: def.paint(), panY: def.panY }));
  return sampleCache;
}
