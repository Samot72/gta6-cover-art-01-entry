// grades.js — the five named colour grades of Vice Grade Studio.
// Each grade is a three-stop gradient map (shadows, midtones, highlights)
// plus a tint wash. A photo keeps its own luminance; the grade replaces
// its colour story, per panel, so one cover can mix a Neon Vice hero with
// Rain Noir side panels and still read as one printed object.

export const GRADE_ORDER = ['neon-vice', 'sunset-haze', 'midnight-chrome', 'golden-palms', 'rain-noir'];

export const GRADES = {
  'neon-vice': {
    id: 'neon-vice',
    name: 'Neon Vice',
    stops: ['#150329', '#c22a7d', '#a5f3fc'],
    tint: '#ff2e88',
    tintAlpha: 0.16,
    backdrop: '#12041f',
    accent: '#22d3ee',
    paper: '#fdf6ec',
    ink: '#160a24',
  },
  'sunset-haze': {
    id: 'sunset-haze',
    name: 'Sunset Haze',
    stops: ['#2d1b4e', '#e0524d', '#ffd9a0'],
    tint: '#ff8b4a',
    tintAlpha: 0.18,
    backdrop: '#1d0f26',
    accent: '#ffc65c',
    paper: '#fff8ec',
    ink: '#2a1030',
  },
  'midnight-chrome': {
    id: 'midnight-chrome',
    name: 'Midnight Chrome',
    stops: ['#050a14', '#5b7a99', '#e8f1f8'],
    tint: '#7dd3fc',
    tintAlpha: 0.12,
    backdrop: '#05090f',
    accent: '#bae6fd',
    paper: '#eef4f8',
    ink: '#0a1420',
  },
  'golden-palms': {
    id: 'golden-palms',
    name: 'Golden Palms',
    stops: ['#33200a', '#d98a2b', '#fff3c4'],
    tint: '#f5b942',
    tintAlpha: 0.2,
    backdrop: '#170e04',
    accent: '#ffd166',
    paper: '#fffaf0',
    ink: '#241503',
  },
  'rain-noir': {
    id: 'rain-noir',
    name: 'Rain Noir',
    stops: ['#0a0f12', '#5f7377', '#e8ecec'],
    tint: '#9db8bd',
    tintAlpha: 0.1,
    backdrop: '#07090b',
    accent: '#cfe3e6',
    paper: '#eef1f1',
    ink: '#0b1114',
  },
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// A 256-entry look-up table per channel, built once per grade.
const lutCache = new Map();
export function gradientMapLut(grade) {
  if (lutCache.has(grade.id)) return lutCache.get(grade.id);
  const [shadow, mid, high] = grade.stops.map(hexToRgb);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const a = t < 0.5 ? shadow : mid;
    const b = t < 0.5 ? mid : high;
    const f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    lut[i * 3] = a[0] + (b[0] - a[0]) * f;
    lut[i * 3 + 1] = a[1] + (b[1] - a[1]) * f;
    lut[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
  }
  lutCache.set(grade.id, lut);
  return lut;
}

// Remaps a canvas in place: luminance drives the gradient map, then a
// whisper of the photo's own colour is folded back so skin and signage
// keep their identity, and the grade's tint washes over the top.
export function applyGradeToCanvas(canvas, grade, colourKeep = 0.22) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const lut = gradientMapLut(grade);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const li = lum * 3;
    data[i] = lut[li] + (data[i] - lut[li]) * colourKeep;
    data[i + 1] = lut[li + 1] + (data[i + 1] - lut[li + 1]) * colourKeep;
    data[i + 2] = lut[li + 2] + (data[i + 2] - lut[li + 2]) * colourKeep;
  }
  ctx.putImageData(image, 0, 0);
  ctx.save();
  ctx.globalAlpha = grade.tintAlpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function gradeFor(id) {
  return GRADES[id] || GRADES['neon-vice'];
}
