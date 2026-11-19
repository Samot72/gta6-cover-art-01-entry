// ViceFrame cover engine: painted demo scenes, panel layouts, colour grades and the
// lettering that turns a photo into poster-style cover art. Pure canvas 2D, no assets,
// no network. A "source" here is { w, h, draw(g, x, y, w, h) }: something that can be
// painted stretched into a rectangle (a photo image, or one of the painted scenes).

export const EXPORT_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

// Colour grades: a vertical wash of translucent stops plus a soft-light tint. The alt
// stops give neighbouring panels a cooler counterpoint, the multi-panel poster feel.
export const GRADES = {
  sunset: {
    stops: [[0, 'rgba(46,4,84,0.42)'], [0.42, 'rgba(232,44,124,0.20)'], [0.75, 'rgba(255,110,48,0.22)'], [1, 'rgba(30,4,40,0.34)']],
    alt: [[0, 'rgba(4,40,84,0.40)'], [0.45, 'rgba(24,120,160,0.18)'], [0.8, 'rgba(255,110,48,0.16)'], [1, 'rgba(24,2,44,0.34)']],
    tint: 'rgba(255,120,60,0.16)',
  },
  neon: {
    stops: [[0, 'rgba(2,10,40,0.46)'], [0.5, 'rgba(10,90,110,0.20)'], [0.8, 'rgba(255,45,140,0.20)'], [1, 'rgba(2,4,24,0.4)']],
    alt: [[0, 'rgba(30,2,54,0.44)'], [0.5, 'rgba(150,30,140,0.18)'], [0.85, 'rgba(20,200,190,0.16)'], [1, 'rgba(2,4,24,0.4)']],
    tint: 'rgba(40,200,220,0.14)',
  },
  golden: {
    stops: [[0, 'rgba(70,30,4,0.30)'], [0.5, 'rgba(255,170,60,0.16)'], [1, 'rgba(50,16,2,0.36)']],
    alt: [[0, 'rgba(50,36,4,0.32)'], [0.55, 'rgba(255,190,80,0.14)'], [1, 'rgba(40,20,2,0.36)']],
    tint: 'rgba(255,180,70,0.18)',
  },
  chrome: {
    stops: [[0, 'rgba(10,20,50,0.26)'], [0.55, 'rgba(120,180,255,0.10)'], [1, 'rgba(8,8,20,0.30)']],
    alt: [[0, 'rgba(40,10,50,0.26)'], [0.55, 'rgba(255,120,190,0.10)'], [1, 'rgba(8,8,20,0.30)']],
    tint: 'rgba(160,200,255,0.12)',
  },
};

// Panel rectangles for each layout, as fractions resolved against the cover size.
export function panelRects(layout, W, H) {
  const F = (x, y, w, h) => ({ x: x * W, y: y * H, w: w * W, h: h * H });
  switch (layout) {
    case 'grid':
      return [F(0, 0, 0.5, 0.5), F(0.5, 0, 0.5, 0.5), F(0, 0.5, 0.5, 0.5), F(0.5, 0.5, 0.5, 0.5)];
    case 'triptych':
      return [F(0, 0, 1 / 3, 1), F(1 / 3, 0, 1 / 3, 1), F(2 / 3, 0, 1 / 3, 1)];
    case 'full':
      return [F(0, 0, 1, 1)];
    case 'hero':
    default:
      return [F(0, 0, 0.62, 1), F(0.62, 0, 0.38, 1 / 3), F(0.62, 1 / 3, 0.38, 1 / 3), F(0.62, 2 / 3, 0.38, 1 / 3)];
  }
}

// Small deterministic random source so the painted scenes render identically every time.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A standing figure in flat silhouette: head, jacket torso, a wide stance, one arm bent.
export function drawFigure(g, x, y, s, color) {
  g.save();
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y - 0.9 * s, 0.075 * s, 0, Math.PI * 2);
  g.fill();
  g.beginPath(); // torso: shoulders to hips
  g.moveTo(x - 0.11 * s, y - 0.82 * s);
  g.lineTo(x + 0.11 * s, y - 0.82 * s);
  g.lineTo(x + 0.085 * s, y - 0.46 * s);
  g.lineTo(x - 0.085 * s, y - 0.46 * s);
  g.closePath();
  g.fill();
  g.lineWidth = 0.085 * s; // legs, planted apart
  g.beginPath();
  g.moveTo(x - 0.04 * s, y - 0.47 * s); g.lineTo(x - 0.13 * s, y);
  g.moveTo(x + 0.04 * s, y - 0.47 * s); g.lineTo(x + 0.15 * s, y);
  g.stroke();
  g.lineWidth = 0.07 * s; // arms: one hanging, one bent at the waist
  g.beginPath();
  g.moveTo(x - 0.1 * s, y - 0.8 * s); g.lineTo(x - 0.17 * s, y - 0.44 * s);
  g.moveTo(x + 0.1 * s, y - 0.8 * s); g.lineTo(x + 0.19 * s, y - 0.62 * s); g.lineTo(x + 0.12 * s, y - 0.5 * s);
  g.stroke();
  g.restore();
}

// A palm in flat silhouette: a curved trunk and six swept fronds.
export function drawPalm(g, x, y, s, color, lean = 0.2) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineCap = 'round';
  const topX = x + lean * s;
  const topY = y - s;
  g.lineWidth = 0.055 * s;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + lean * s * 0.3, y - s * 0.55, topX, topY);
  g.stroke();
  g.lineWidth = 0.045 * s;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.08 + i * 0.17);
    const ex = topX + Math.cos(a) * 0.52 * s * (i % 2 ? 1 : -1) * (i === 0 ? 0.4 : 1);
    const ey = topY - Math.sin(a) * 0.3 * s + 0.16 * s;
    g.beginPath();
    g.moveTo(topX, topY);
    g.quadraticCurveTo(topX + (ex - topX) * 0.5, topY - 0.22 * s, ex, ey);
    g.stroke();
  }
  g.beginPath();
  g.arc(topX, topY + 0.03 * s, 0.05 * s, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// A low convertible in flat silhouette with a neon rim light along its top edge.
export function drawConvertible(g, x, y, s, rim) {
  g.save();
  const w = s, h = s * 0.30;
  g.fillStyle = '#12081f';
  // Body: one smooth silhouette from nose to tail.
  g.beginPath();
  g.moveTo(x, y - h * 0.30);
  g.quadraticCurveTo(x + w * 0.02, y - h * 0.66, x + w * 0.22, y - h * 0.70);
  g.lineTo(x + w * 0.34, y - h * 0.70);
  g.lineTo(x + w * 0.41, y - h * 0.98);
  g.quadraticCurveTo(x + w * 0.43, y - h * 1.07, x + w * 0.51, y - h * 1.07);
  g.lineTo(x + w * 0.59, y - h * 1.07);
  g.lineTo(x + w * 0.67, y - h * 0.72);
  g.quadraticCurveTo(x + w * 0.97, y - h * 0.68, x + w, y - h * 0.34);
  g.quadraticCurveTo(x + w, y - h * 0.18, x + w * 0.94, y - h * 0.16);
  g.lineTo(x + w * 0.06, y - h * 0.16);
  g.quadraticCurveTo(x, y - h * 0.16, x, y - h * 0.30);
  g.closePath();
  g.fill();
  g.strokeStyle = rim; // rim light
  g.lineWidth = h * 0.045;
  g.beginPath();
  g.moveTo(x + w * 0.02, y - h * 0.62);
  g.quadraticCurveTo(x + w * 0.2, y - h * 0.72, x + w * 0.34, y - h * 0.72);
  g.stroke();
  g.fillStyle = '#0a0514'; // wheels
  for (const wx of [x + w * 0.22, x + w * 0.8]) {
    g.beginPath(); g.arc(wx, y - h * 0.14, h * 0.17, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,215,106,0.85)'; g.lineWidth = h * 0.03;
    g.beginPath(); g.arc(wx, y - h * 0.14, h * 0.09, 0, Math.PI * 2); g.stroke();
  }
  const glow = g.createRadialGradient(x + w * 0.99, y - h * 0.4, 0, x + w * 0.99, y - h * 0.4, h * 0.5);
  glow.addColorStop(0, 'rgba(255,240,190,0.8)');
  glow.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = glow;
  g.fillRect(x + w * 0.6, y - h * 0.95, w * 0.5, h * 1.1);
  g.restore();
}

// The built-in boulevard scene: sunset sky, striped sun, skyline, palms, a convertible
// and a figure on the kerb. Painted fresh at whatever size it is asked for.
export function paintBoulevard(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.86);
  sky.addColorStop(0, '#2a0a4a');
  sky.addColorStop(0.34, '#7b1e63');
  sky.addColorStop(0.55, '#e8447c');
  sky.addColorStop(0.72, '#ff7a3d');
  sky.addColorStop(1, '#ffb347');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h * 0.86);
  const sun = g.createLinearGradient(0, h * 0.34, 0, h * 0.78);
  sun.addColorStop(0, '#ffe29a');
  sun.addColorStop(1, '#ff5e3a');
  g.fillStyle = sun;
  g.beginPath();
  g.arc(w * 0.66, h * 0.62, w * 0.155, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(43,10,74,0.55)'; // sun stripes
  for (let i = 0; i < 4; i++) g.fillRect(w * 0.48, h * (0.63 + i * 0.045), w * 0.36, h * 0.016);
  const rnd = mulberry32(7);
  g.fillStyle = '#38145c'; // far skyline
  let bx = 0;
  while (bx < w) {
    const bw = w * (0.04 + rnd() * 0.06), bh = h * (0.1 + rnd() * 0.16);
    g.fillRect(bx, h * 0.72 - bh, bw, bh);
    bx += bw + w * 0.012;
  }
  g.fillStyle = '#1c0b30'; // near blocks
  g.fillRect(0, h * 0.60, w * 0.16, h * 0.26);
  g.fillRect(w * 0.86, h * 0.56, w * 0.14, h * 0.30);
  g.fillStyle = '#14091f'; // road
  g.fillRect(0, h * 0.86, w, h * 0.14);
  g.fillStyle = 'rgba(255,183,71,0.5)';
  g.fillRect(0, h * 0.858, w, h * 0.006);
  g.strokeStyle = 'rgba(255,215,106,0.75)'; // lane dashes in perspective
  g.lineWidth = h * 0.008;
  g.setLineDash([w * 0.05, w * 0.045]);
  g.beginPath(); g.moveTo(w * 0.06, h * 0.945); g.lineTo(w * 0.44, h * 0.872); g.stroke();
  g.setLineDash([]);
  drawPalm(g, w * 0.10, h * 0.88, h * 0.52, '#160a26', 0.25);
  drawPalm(g, w * 0.90, h * 0.87, h * 0.44, '#160a26', -0.3);
  drawPalm(g, w * 0.24, h * 0.87, h * 0.34, '#1d0d33', 0.15);
  drawConvertible(g, w * 0.30, h * 0.965, w * 0.52, '#ff4d8d');
  drawFigure(g, w * 0.185, h * 0.955, h * 0.34, '#0d0518');
}

// The built-in neon street scene: teal night, lit windows, glowing signs, wet street.
export function paintNeonStreet(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#04182b');
  sky.addColorStop(0.55, '#07304a');
  sky.addColorStop(1, '#0a4a5e');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(230,246,255,0.9)';
  g.beginPath(); g.arc(w * 0.84, h * 0.13, w * 0.028, 0, Math.PI * 2); g.fill();
  const rnd = mulberry32(23);
  const block = (x, bw, bh, base) => {
    g.fillStyle = base;
    g.fillRect(x, h * 0.78 - bh, bw, bh);
    const cols = Math.max(2, Math.floor(bw / (w * 0.028)));
    const rows = Math.max(3, Math.floor(bh / (h * 0.05)));
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      if (rnd() < 0.42) continue;
      g.fillStyle = rnd() < 0.6 ? 'rgba(255,215,106,0.85)' : 'rgba(125,252,232,0.8)';
      g.fillRect(x + (c + 0.5) * (bw / cols) - w * 0.006, h * 0.78 - bh + (r + 0.5) * (bh / rows) - h * 0.008, w * 0.012, h * 0.016);
    }
  };
  block(0, w * 0.24, h * 0.62, '#06121f');
  block(w * 0.27, w * 0.17, h * 0.44, '#081a2a');
  block(w * 0.60, w * 0.16, h * 0.52, '#071626');
  block(w * 0.79, w * 0.21, h * 0.68, '#050f1a');
  const sign = (x, y, sw, sh, color) => {
    g.save();
    g.shadowColor = color; g.shadowBlur = w * 0.02;
    g.strokeStyle = color; g.lineWidth = h * 0.006;
    g.beginPath(); g.roundRect(x, y, sw, sh, h * 0.012); g.stroke();
    g.fillStyle = color; g.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) g.fillRect(x + sw * 0.14, y + sh * (0.22 + i * 0.24), sw * (0.72 - i * 0.14), sh * 0.1);
    g.restore();
  };
  sign(w * 0.035, h * 0.24, w * 0.15, h * 0.15, '#ff4d8d');
  sign(w * 0.815, h * 0.18, w * 0.14, h * 0.19, '#2ee6c8');
  sign(w * 0.625, h * 0.33, w * 0.11, h * 0.11, '#ff9a3d');
  const street = g.createLinearGradient(0, h * 0.78, 0, h);
  street.addColorStop(0, '#06222e');
  street.addColorStop(1, '#020a12');
  g.fillStyle = street;
  g.fillRect(0, h * 0.78, w, h * 0.22);
  const smear = (x, color, len) => {
    const gr = g.createLinearGradient(0, h * 0.79, 0, h * 0.79 + len);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x, h * 0.79, w * 0.016, len);
  };
  smear(w * 0.09, 'rgba(255,77,141,0.5)', h * 0.17);
  smear(w * 0.87, 'rgba(46,230,200,0.45)', h * 0.19);
  smear(w * 0.66, 'rgba(255,154,61,0.4)', h * 0.13);
  smear(w * 0.45, 'rgba(255,215,106,0.28)', h * 0.2);
  drawPalm(g, w * 0.52, h * 0.86, h * 0.4, '#03101c', 0.3);
  drawFigure(g, w * 0.36, h * 0.97, h * 0.36, '#020910');
  drawConvertible(g, w * 0.56, h * 0.99, w * 0.4, '#2ee6c8');
}

// Paint one of the built-in scenes by name.
export function paintScene(g, w, h, variant) {
  if (variant === 'neon') paintNeonStreet(g, w, h);
  else paintBoulevard(g, w, h);
}

// A source backed by a painted scene, rendered once onto an offscreen canvas.
export function makeSceneSource(variant, w = 1200, h = 900) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  paintScene(canvas.getContext('2d'), w, h, variant);
  return { w, h, name: variant === 'neon' ? 'Painted scene: neon street' : 'Painted scene: boulevard', draw(g, x, y, dw, dh) { g.drawImage(canvas, x, y, dw, dh); } };
}

// A source backed by an image element (a photo, or a framed sample scene).
export function makeImageSource(img, name) {
  return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, name, draw(g, x, y, dw, dh) { g.drawImage(img, x, y, dw, dh); } };
}

// The wash of one grade over one panel rectangle.
function applyGrade(g, r, gradeName, strength, alt) {
  const grade = GRADES[gradeName] ?? GRADES.sunset;
  const stops = alt && grade.alt ? grade.alt : grade.stops;
  g.save();
  g.globalAlpha = strength;
  const grad = g.createLinearGradient(0, r.y, 0, r.y + r.h);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fillRect(r.x, r.y, r.w, r.h);
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = grade.tint;
  g.fillRect(r.x, r.y, r.w, r.h);
  g.restore();
}

let grainPattern = null;
function getGrainPattern(g) {
  if (grainPattern) return grainPattern;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const cg = c.getContext('2d');
  const img = cg.createImageData(256, 256);
  const rnd = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  cg.putImageData(img, 0, 0);
  grainPattern = g.createPattern(c, 'repeat');
  return grainPattern;
}

function drawStars(g, cx, cy, count, size, color) {
  g.save();
  g.fillStyle = color;
  g.strokeStyle = 'rgba(10,4,20,0.8)';
  g.lineWidth = size * 0.08;
  for (let i = 0; i < count; i++) {
    const x = cx + i * size * 1.25, y = cy;
    g.beginPath();
    for (let p = 0; p < 10; p++) {
      const r = p % 2 === 0 ? size : size * 0.45;
      const a = -Math.PI / 2 + p * Math.PI / 5;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (p === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

// Fit a font size down until the text fits maxWidth; returns the size used.
function fitFont(g, text, weight, family, start, maxWidth) {
  let size = start;
  while (size > 10) {
    g.font = `${weight} ${size}px ${family}`;
    if (g.measureText(text).width <= maxWidth) break;
    size *= 0.94;
  }
  return size;
}

const TITLE_FONT = '"Arial Narrow", "Helvetica Neue Condensed", Impact, "Franklin Gothic Medium", sans-serif';
const SCRIPT_FONT = '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive';
const BODY_FONT = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';

// Draw the whole cover: panels with their photos and grades, then the lettering.
// state: { layout, grade, gradeStrength, grain, vignette, title, subtitle, caption,
//          stars, panels: [{ source, zoom, dx, dy }] } and sources: the source list.
export function drawCover(g, W, H, state, sources) {
  g.save();
  g.fillStyle = '#050208';
  g.fillRect(0, 0, W, H);
  const gap = Math.max(4, Math.round(W * 0.007));
  const rects = panelRects(state.layout, W, H);
  rects.forEach((raw, i) => {
    const panel = state.panels[i] ?? state.panels[0];
    const source = sources[panel.source] ?? sources[0];
    const r = { x: raw.x + gap / 2, y: raw.y + gap / 2, w: raw.w - gap, h: raw.h - gap };
    if (!source || r.w <= 0 || r.h <= 0) return;
    g.save();
    g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
    const scale = Math.max(r.w / source.w, r.h / source.h) * (panel.zoom || 1);
    const dw = source.w * scale, dh = source.h * scale;
    const dx = r.x + (r.w - dw) / 2 + (panel.dx || 0) * r.w;
    const dy = r.y + (r.h - dh) / 2 + (panel.dy || 0) * r.h;
    source.draw(g, dx, dy, dw, dh);
    applyGrade(g, r, state.grade, state.gradeStrength, i % 2 === 1);
    g.restore();
    g.strokeStyle = '#050208';
    g.lineWidth = gap;
    g.strokeRect(raw.x + gap / 2, raw.y + gap / 2, raw.w - gap, raw.h - gap);
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = Math.max(1, W * 0.0012);
    g.strokeRect(r.x, r.y, r.w, r.h);
    if (state.selected === i) {
      g.strokeStyle = '#2ee6c8';
      g.lineWidth = Math.max(2, W * 0.003);
      g.strokeRect(r.x + g.lineWidth, r.y + g.lineWidth, r.w - g.lineWidth * 2, r.h - g.lineWidth * 2);
    }
  });

  if (state.stars > 0) {
    const size = W * 0.021;
    drawStars(g, W - size * 1.25 * state.stars - W * 0.028, W * 0.035, state.stars, size, '#ffd76a');
  }

  // Title block: a condensed sunset-gradient wordmark, slightly sheared, with the
  // script subtitle tucked under its right end.
  const title = (state.title || '').trim();
  if (title) {
    const size = fitFont(g, title.toUpperCase(), 700, TITLE_FONT, W * 0.16, W * 0.92);
    g.save();
    g.translate(W / 2, H * 0.045 + size);
    g.transform(1, 0, -0.07, 1, 0, 0);
    g.font = `700 ${size}px ${TITLE_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const grad = g.createLinearGradient(0, -size, 0, size * 0.25);
    grad.addColorStop(0, '#fff7e0');
    grad.addColorStop(0.45, '#ffd76a');
    grad.addColorStop(0.8, '#ff5e3a');
    grad.addColorStop(1, '#ff4d8d');
    g.shadowColor = 'rgba(0,0,0,0.65)';
    g.shadowBlur = size * 0.12;
    g.shadowOffsetY = size * 0.05;
    g.lineWidth = size * 0.055;
    g.strokeStyle = '#1c0b26';
    g.strokeText(title.toUpperCase(), 0, 0);
    g.shadowColor = 'transparent';
    g.fillStyle = grad;
    g.fillText(title.toUpperCase(), 0, 0);
    g.restore();
    const sub = (state.subtitle || '').trim();
    if (sub) {
      const subSize = fitFont(g, sub, 400, SCRIPT_FONT, W * 0.055, W * 0.6);
      g.save();
      g.translate(W * 0.635, H * 0.045 + size * 1.32);
      g.rotate(-0.045);
      g.font = `${subSize}px ${SCRIPT_FONT}`;
      g.textAlign = 'center';
      g.shadowColor = '#ff4d8d';
      g.shadowBlur = subSize * 0.5;
      g.fillStyle = '#a8fff2';
      g.fillText(sub, 0, 0);
      g.fillText(sub, 0, 0);
      g.restore();
    }
  }

  // Caption bar along the bottom.
  const caption = (state.caption || '').trim();
  if (caption) {
    const barH = H * 0.052;
    g.fillStyle = 'rgba(6,3,14,0.74)';
    g.fillRect(0, H - barH - H * 0.018, W, barH);
    const size = fitFont(g, caption.toUpperCase(), 700, BODY_FONT, barH * 0.52, W * 0.9);
    g.font = `700 ${size}px ${BODY_FONT}`;
    try { g.letterSpacing = `${Math.round(size * 0.18)}px`; } catch { /* older engines */ }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fdf6ff';
    g.fillText(caption.toUpperCase(), W / 2, H - barH / 2 - H * 0.018);
    try { g.letterSpacing = '0px'; } catch { /* older engines */ }
  }

  if (state.vignette) {
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(8,0,18,0)');
    vg.addColorStop(1, 'rgba(8,0,18,0.42)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
  }
  if (state.grain) {
    g.save();
    g.globalAlpha = 0.055;
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = getGrainPattern(g);
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  g.restore();
}
