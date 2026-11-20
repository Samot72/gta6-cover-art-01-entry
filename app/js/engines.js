// engines.js — the two render engines that turn a photograph into cover art.
// PAINTERLY flattens a photo into bold posterised shapes with glowing edges,
// like airbrushed poster paint. INK rebuilds it from halftone dots and hard
// contour lines, like a screen-printed comic cover. Both run per panel,
// before the panel's colour grade is mapped over the result.

function imageDataOf(canvas) {
  const ctx = canvas.getContext('2d');
  return { ctx, image: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

// A small grayscale copy for edge work: edges do not need full resolution,
// and the softness reads as print texture once scaled back up.
function grayscaleProbe(canvas, maxDim = 420) {
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  const probe = document.createElement('canvas');
  probe.width = Math.max(2, Math.round(canvas.width * scale));
  probe.height = Math.max(2, Math.round(canvas.height * scale));
  const pctx = probe.getContext('2d');
  pctx.drawImage(canvas, 0, 0, probe.width, probe.height);
  const { data } = pctx.getImageData(0, 0, probe.width, probe.height);
  const lum = new Float32Array(probe.width * probe.height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  return { lum, width: probe.width, height: probe.height };
}

function sobelEdges({ lum, width, height }) {
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -lum[i - width - 1] - 2 * lum[i - 1] - lum[i + width - 1] +
        lum[i - width + 1] + 2 * lum[i + 1] + lum[i + width + 1];
      const gy =
        -lum[i - width - 1] - 2 * lum[i - width] - lum[i - width + 1] +
        lum[i + width - 1] + 2 * lum[i + width] + lum[i + width + 1];
      out[i] = Math.min(255, Math.hypot(gx, gy) / 4);
    }
  }
  return { edges: out, width, height };
}

function edgeCanvas(edgeField, { colour, threshold, soft }) {
  const { edges, width, height } = edgeField;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  const [r, g, b] = colour;
  for (let p = 0; p < edges.length; p++) {
    const strength = Math.max(0, (edges[p] - threshold) / soft);
    const a = Math.min(1, strength) * 255;
    image.data[p * 4] = r;
    image.data[p * 4 + 1] = g;
    image.data[p * 4 + 2] = b;
    image.data[p * 4 + 3] = a;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

// PAINTERLY: smooth, posterise, push the saturation, then lay a screen of
// glowing edges over the shapes so silhouettes pop like neon through paint.
export function renderPainterly(canvas, { levels = 7, edgeTint = [255, 240, 220] } = {}) {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  // A breath of blur first: brush strokes, not pixels.
  const soft = document.createElement('canvas');
  soft.width = Math.max(2, width >> 1);
  soft.height = Math.max(2, height >> 1);
  soft.getContext('2d').drawImage(canvas, 0, 0, soft.width, soft.height);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(soft, 0, 0, width, height);

  const { image } = imageDataOf(canvas);
  const data = image.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    r = lum + (r - lum) * 1.15;
    g = lum + (g - lum) * 1.15;
    b = lum + (b - lum) * 1.15;
    data[i] = Math.round(r / step) * step;
    data[i + 1] = Math.round(g / step) * step;
    data[i + 2] = Math.round(b / step) * step;
  }
  ctx.putImageData(image, 0, 0);

  const glow = edgeCanvas(sobelEdges(grayscaleProbe(canvas)), {
    colour: edgeTint,
    threshold: 26,
    soft: 90,
  });
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.55;
  ctx.drawImage(glow, 0, 0, width, height);
  ctx.restore();
  return canvas;
}

// INK: contrast first, then the photo is re-printed as halftone dots on the
// grade's paper colour, with hard contour lines inked over the top.
export function renderInk(canvas, grade, { dotPitch = 8 } = {}) {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  const { image } = imageDataOf(canvas);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    // Lifted, gentle contrast: halftone needs bright faces to read at all.
    const pushed = Math.max(0, Math.min(255, (lum - 128) * 1.12 + 142));
    data[i] = data[i + 1] = data[i + 2] = pushed;
  }
  ctx.putImageData(image, 0, 0);

  const probe = grayscaleProbe(canvas, 900);
  const cols = Math.max(2, Math.round(width / dotPitch));
  const rows = Math.max(2, Math.round(height / dotPitch));
  const cells = document.createElement('canvas');
  cells.width = cols;
  cells.height = rows;
  const cctx = cells.getContext('2d');
  cctx.drawImage(canvas, 0, 0, cols, rows);
  const cellData = cctx.getImageData(0, 0, cols, rows).data;

  ctx.save();
  ctx.fillStyle = grade.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = grade.ink;
  const cellW = width / cols;
  const cellH = height / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lum = cellData[(y * cols + x) * 4] / 255;
      const radius = (1 - lum) * Math.min(cellW, cellH) * 0.6;
      if (radius < 0.35) continue;
      ctx.beginPath();
      ctx.arc((x + 0.5) * cellW, (y + 0.5) * cellH, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  const lines = edgeCanvas(sobelEdges(probe), { colour: hexToRgbArray(grade.ink), threshold: 60, soft: 70 });
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.drawImage(lines, 0, 0, width, height);
  ctx.restore();
  return canvas;
}

function hexToRgbArray(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const ENGINES = {
  painterly: { id: 'painterly', name: 'Painterly', blurb: 'Posterised paint, glowing edges' },
  ink: { id: 'ink', name: 'Ink', blurb: 'Halftone dots, hard contours' },
};

export function renderWithEngine(canvas, engineId, grade) {
  return engineId === 'ink' ? renderInk(canvas, grade) : renderPainterly(canvas);
}
