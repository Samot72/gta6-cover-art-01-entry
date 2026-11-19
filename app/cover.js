// cover.js — ViceFrame's drawing engine.
//
// A poster is assembled from rectangular panels. Every panel holds one
// picture, and a picture here is any object shaped like
//   { width, height, label, draw(ctx, x, y, w, h) }
// where draw paints the picture stretched over the given box. Uploaded
// photos are wrapped into that shape, and so are the two scenes this file
// paints from scratch — the renderer treats them identically.
//
// On top of the panels the engine lays a colour grade (a vertical wash of
// translucent colour plus a soft-light tint), poster lettering, optional
// film grain and a vignette. Nothing is loaded from anywhere: this file is
// the whole art department.

export const POSTER_SIZES = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  wide: { w: 1920, h: 1080 },
};

// ------------------------------------------------------------------ grades
// `bands` are gradient stops for the wash; `alt` is the cooler recipe dealt
// to odd-numbered panels so a multi-panel sheet reads as printed artwork
// rather than one filtered photo. `glow` is the soft-light tint colour.

export const GRADE_BOOK = {
  sunset: {
    bands: [[0, "rgba(43,8,80,0.46)"], [0.38, "rgba(214,32,112,0.21)"], [0.7, "rgba(250,110,28,0.25)"], [1, "rgba(26,4,38,0.38)"]],
    alt: [[0, "rgba(7,34,78,0.44)"], [0.44, "rgba(12,110,140,0.19)"], [0.8, "rgba(250,110,28,0.14)"], [1, "rgba(22,2,42,0.38)"]],
    glow: "rgba(255,116,66,0.16)",
  },
  neon: {
    bands: [[0, "rgba(4,10,40,0.5)"], [0.5, "rgba(6,80,100,0.21)"], [0.84, "rgba(238,44,128,0.21)"], [1, "rgba(2,4,24,0.44)"]],
    alt: [[0, "rgba(30,4,54,0.48)"], [0.5, "rgba(136,26,130,0.19)"], [0.86, "rgba(14,186,174,0.17)"], [1, "rgba(2,4,24,0.44)"]],
    glow: "rgba(36,200,220,0.14)",
  },
  golden: {
    bands: [[0, "rgba(70,30,4,0.31)"], [0.52, "rgba(250,164,40,0.17)"], [1, "rgba(48,16,2,0.4)"]],
    alt: [[0, "rgba(50,36,4,0.33)"], [0.55, "rgba(252,184,72,0.15)"], [1, "rgba(40,19,2,0.4)"]],
    glow: "rgba(255,178,64,0.18)",
  },
  chrome: {
    bands: [[0, "rgba(10,20,48,0.28)"], [0.55, "rgba(108,166,248,0.11)"], [1, "rgba(8,8,20,0.32)"]],
    alt: [[0, "rgba(40,10,50,0.28)"], [0.55, "rgba(248,108,178,0.11)"], [1, "rgba(8,8,20,0.32)"]],
    glow: "rgba(148,194,255,0.12)",
  },
};

// ----------------------------------------------------------------- layouts
// Rectangles are fractions of the poster so a layout is resolution-free.

export function panelRects(layout, W, H) {
  const box = (fx, fy, fw, fh) => ({ x: fx * W, y: fy * H, w: fw * W, h: fh * H });
  switch (layout) {
    case "grid":
      return [box(0, 0, 0.5, 0.5), box(0.5, 0, 0.5, 0.5), box(0, 0.5, 0.5, 0.5), box(0.5, 0.5, 0.5, 0.5)];
    case "triptych":
      return [box(0, 0, 1 / 3, 1), box(1 / 3, 0, 1 / 3, 1), box(2 / 3, 0, 1 / 3, 1)];
    case "full":
      return [box(0, 0, 1, 1)];
    default: // "hero": wide lead panel, three stacked beside it
      return [box(0, 0, 0.58, 1), box(0.58, 0, 0.42, 1 / 3), box(0.58, 1 / 3, 0.42, 1 / 3), box(0.58, 2 / 3, 0.42, 1 / 3)];
  }
}

// -------------------------------------------------------------- randomness
// mulberry32: small seeded PRNG. Scenes draw from it so a painted scene is
// the same on every machine, and nudging the seed restyles the scene.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------------------------------------------------------------- silhouettes
// Flat shapes, drawn in a single ink colour. `u` scales each figure: a
// person stands about 1u tall, a palm rises about 1u, a car spans 1u.

export function drawFigure(ctx, cx, ground, u, ink) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  // head and shoulders
  ctx.beginPath();
  ctx.ellipse(cx, ground - 0.9 * u, 0.068 * u, 0.078 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 0.13 * u, ground - 0.6 * u);
  ctx.quadraticCurveTo(cx, ground - 0.86 * u, cx + 0.13 * u, ground - 0.6 * u);
  ctx.lineTo(cx + 0.095 * u, ground - 0.44 * u);
  ctx.lineTo(cx - 0.095 * u, ground - 0.44 * u);
  ctx.closePath();
  ctx.fill();
  // legs, planted apart
  ctx.lineWidth = 0.075 * u;
  ctx.beginPath();
  ctx.moveTo(cx - 0.04 * u, ground - 0.46 * u);
  ctx.lineTo(cx - 0.15 * u, ground - 0.01 * u);
  ctx.moveTo(cx + 0.045 * u, ground - 0.46 * u);
  ctx.lineTo(cx + 0.13 * u, ground - 0.01 * u);
  ctx.stroke();
  // one arm down, one raised to the shoulder
  ctx.lineWidth = 0.06 * u;
  ctx.beginPath();
  ctx.moveTo(cx - 0.115 * u, ground - 0.78 * u);
  ctx.lineTo(cx - 0.19 * u, ground - 0.44 * u);
  ctx.moveTo(cx + 0.115 * u, ground - 0.78 * u);
  ctx.lineTo(cx + 0.21 * u, ground - 0.62 * u);
  ctx.lineTo(cx + 0.15 * u, ground - 0.5 * u);
  ctx.stroke();
  ctx.restore();
}

export function drawPalm(ctx, baseX, baseY, u, ink, lean = 0.2) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = "round";
  const topX = baseX + lean * u;
  const topY = baseY - 0.98 * u;
  // trunk as a gentle curve
  ctx.lineWidth = 0.048 * u;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * u * 0.3, baseY - 0.55 * u, topX, topY);
  ctx.stroke();
  // fronds fan out from the crown, tips drooping
  ctx.lineWidth = 0.036 * u;
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const t = i / (fronds - 1);
    const ang = Math.PI * (0.08 + 0.84 * t); // sweep from right-up to left-up
    const len = (0.3 + 0.16 * Math.sin(t * Math.PI)) * u;
    const ex = topX + Math.cos(ang) * len;
    const ey = topY - Math.sin(ang) * len * 0.55 + len * 0.22;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(ang) * len * 0.55, topY - Math.sin(ang) * len * 0.6, ex, ey);
    ctx.stroke();
  }
  // a pair of coconuts under the crown
  ctx.beginPath();
  ctx.arc(topX - 0.03 * u, topY + 0.05 * u, 0.038 * u, 0, Math.PI * 2);
  ctx.arc(topX + 0.045 * u, topY + 0.04 * u, 0.032 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawConvertible(ctx, leftX, ground, len, rim) {
  const h = len * 0.27;
  const roofY = ground - h;
  ctx.save();
  // body: one closed path, nose at the left, tail at the right
  ctx.fillStyle = "#0d0618";
  ctx.beginPath();
  ctx.moveTo(leftX + len * 0.01, ground - h * 0.3);
  ctx.quadraticCurveTo(leftX + len * 0.02, ground - h * 0.6, leftX + len * 0.2, ground - h * 0.63);
  ctx.lineTo(leftX + len * 0.33, ground - h * 0.63);
  ctx.lineTo(leftX + len * 0.42, roofY + h * 0.02);
  ctx.lineTo(leftX + len * 0.62, roofY + h * 0.02);
  ctx.lineTo(leftX + len * 0.7, ground - h * 0.65);
  ctx.quadraticCurveTo(leftX + len * 0.95, ground - h * 0.62, leftX + len * 0.99, ground - h * 0.34);
  ctx.lineTo(leftX + len * 0.97, ground - h * 0.16);
  ctx.lineTo(leftX + len * 0.04, ground - h * 0.16);
  ctx.closePath();
  ctx.fill();
  // a rim-light stroke along the shoulder
  ctx.strokeStyle = rim;
  ctx.lineWidth = h * 0.045;
  ctx.beginPath();
  ctx.moveTo(leftX + len * 0.05, ground - h * 0.55);
  ctx.quadraticCurveTo(leftX + len * 0.18, ground - h * 0.67, leftX + len * 0.33, ground - h * 0.66);
  ctx.stroke();
  // wheels: black tyre, bright ring
  for (const fx of [0.24, 0.78]) {
    const wx = leftX + len * fx;
    const wy = ground - h * 0.15;
    ctx.fillStyle = "#05030c";
    ctx.beginPath();
    ctx.arc(wx, wy, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,213,102,0.92)";
    ctx.lineWidth = h * 0.03;
    ctx.beginPath();
    ctx.arc(wx, wy, h * 0.085, 0, Math.PI * 2);
    ctx.stroke();
  }
  // lamp bloom at the tail
  const bloom = ctx.createRadialGradient(leftX + len * 0.97, ground - h * 0.4, 0, leftX + len * 0.97, ground - h * 0.4, h * 0.6);
  bloom.addColorStop(0, "rgba(255,240,196,0.7)");
  bloom.addColorStop(1, "rgba(255,240,196,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(leftX + len * 0.5, ground - h * 1.05, len * 0.55, h * 1.2);
  ctx.restore();
}

// ------------------------------------------------------------------- scenes
// Two painted scenes ship with the studio. Both take a seed: the studio
// paints them with its house seeds, and the sample stills are rendered
// from a neighbouring seed so the shipped JPEGs are fresh captures of the
// same scenes, not copies of an older render.

export const SCENE_SEEDS = { boulevard: 20261120, neon: 112233 };

export function paintBoulevard(ctx, W, H, seed = SCENE_SEEDS.boulevard) {
  const rnd = mulberry32(seed);
  const horizon = H * 0.84;
  // dusk sky
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#2a0845");
  sky.addColorStop(0.34, "#7d1d60");
  sky.addColorStop(0.57, "#e83c78");
  sky.addColorStop(0.75, "#ff7839");
  sky.addColorStop(1, "#ffb347");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);
  // low sun with slatted shading across its lower half
  const sun = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.78);
  sun.addColorStop(0, "#ffec9e");
  sun.addColorStop(1, "#ff5c36");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(W * 0.63, H * 0.6, W * 0.148, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(42,8,66,0.5)";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(W * 0.45, H * (0.62 + i * 0.046), W * 0.36, H * 0.014);
  }
  // distant towers, heights from the seed
  ctx.fillStyle = "#36135c";
  let x = -W * 0.012;
  while (x < W) {
    const bw = W * (0.034 + rnd() * 0.052);
    const bh = H * (0.08 + rnd() * 0.18);
    ctx.fillRect(x, H * 0.7 - bh, bw, bh + H * 0.15);
    x += bw + W * 0.012;
  }
  // two close blocks at the frame edges
  ctx.fillStyle = "#1b0a2e";
  ctx.fillRect(0, H * 0.57, W * 0.145, H * 0.29);
  ctx.fillRect(W * 0.875, H * 0.53, W * 0.125, H * 0.33);
  // street, kerb and a dashed centre line running to a vanishing point
  ctx.fillStyle = "#130824";
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.fillStyle = "rgba(255,184,72,0.5)";
  ctx.fillRect(0, horizon - 2, W, 4);
  ctx.strokeStyle = "rgba(255,214,102,0.85)";
  ctx.lineWidth = Math.max(2, H * 0.007);
  ctx.setLineDash([W * 0.048, W * 0.038]);
  ctx.beginPath();
  ctx.moveTo(W * 0.04, H * 0.955);
  ctx.lineTo(W * 0.43, H * 0.862);
  ctx.stroke();
  ctx.setLineDash([]);
  drawPalm(ctx, W * 0.095, H * 0.872, H * 0.52, "#150826", 0.27);
  drawPalm(ctx, W * 0.905, H * 0.862, H * 0.44, "#150826", -0.31);
  drawPalm(ctx, W * 0.235, H * 0.866, H * 0.33, "#1d0c33", 0.15);
  drawConvertible(ctx, W * 0.3, H * 0.965, W * 0.52, "#ff4d8d");
  drawFigure(ctx, W * 0.18, H * 0.955, H * 0.34, "#0b0414");
}

export function paintNeonStreet(ctx, W, H, seed = SCENE_SEEDS.neon) {
  const rnd = mulberry32(seed);
  // night sky with a small moon
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#02141f");
  sky.addColorStop(0.55, "#062a44");
  sky.addColorStop(1, "#084454");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(228,245,255,0.92)";
  ctx.beginPath();
  ctx.arc(W * 0.845, H * 0.115, W * 0.025, 0, Math.PI * 2);
  ctx.fill();
  // towers whose windows light up from the seed
  const tower = (tx, tw, th, shade) => {
    const base = H * 0.76;
    ctx.fillStyle = shade;
    ctx.fillRect(tx, base - th, tw, th);
    const cols = Math.max(2, Math.floor(tw / (W * 0.028)));
    const rows = Math.max(3, Math.floor(th / (H * 0.05)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < 0.46) continue;
        ctx.fillStyle = rnd() < 0.6 ? "rgba(255,212,100,0.85)" : "rgba(118,248,228,0.8)";
        ctx.fillRect(
          tx + (c + 0.5) * (tw / cols) - W * 0.0055,
          base - th + (r + 0.5) * (th / rows) - H * 0.0075,
          W * 0.011, H * 0.015,
        );
      }
    }
  };
  tower(0, W * 0.22, H * 0.58, "#040f1a");
  tower(W * 0.25, W * 0.18, H * 0.4, "#061726");
  tower(W * 0.58, W * 0.17, H * 0.48, "#051322");
  tower(W * 0.78, W * 0.22, H * 0.64, "#030c16");
  // glowing sign boards: an outline and three bars of "lettering"
  const sign = (sx, sy, sw, sh, colour) => {
    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = W * 0.016;
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, H * 0.011);
    ctx.stroke();
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(sx + sw * 0.15, sy + sh * (0.24 + i * 0.23), sw * (0.68 - i * 0.12), sh * 0.09);
    }
    ctx.restore();
  };
  sign(W * 0.035, H * 0.22, W * 0.145, H * 0.145, "#ff4d8d");
  sign(W * 0.815, H * 0.16, W * 0.135, H * 0.185, "#2fe8c6");
  sign(W * 0.61, H * 0.31, W * 0.105, H * 0.105, "#ff9c3d");
  // wet pavement and the lights smeared across it
  const street = ctx.createLinearGradient(0, H * 0.76, 0, H);
  street.addColorStop(0, "#05202a");
  street.addColorStop(1, "#020a10");
  ctx.fillStyle = street;
  ctx.fillRect(0, H * 0.76, W, H * 0.24);
  const smear = (sx, colour, len) => {
    const g = ctx.createLinearGradient(0, H * 0.775, 0, H * 0.775 + len);
    g.addColorStop(0, colour);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx, H * 0.775, W * 0.015, len);
  };
  smear(W * 0.09, "rgba(255,77,141,0.5)", H * 0.15);
  smear(W * 0.862, "rgba(47,232,198,0.45)", H * 0.17);
  smear(W * 0.652, "rgba(255,156,61,0.4)", H * 0.11);
  smear(W * 0.44, "rgba(255,214,102,0.25)", H * 0.18);
  drawPalm(ctx, W * 0.52, H * 0.85, H * 0.39, "#02101c", 0.31);
  drawFigure(ctx, W * 0.35, H * 0.965, H * 0.355, "#020810");
  drawConvertible(ctx, W * 0.57, H * 0.985, W * 0.38, "#2fe8c6");
}

export function paintScene(ctx, W, H, kind, seed) {
  if (kind === "neon") paintNeonStreet(ctx, W, H, seed);
  else paintBoulevard(ctx, W, H, seed);
}

// ----------------------------------------------------------------- pictures

export function scenePicture(kind, seed, w = 1280, h = 960) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paintScene(c.getContext("2d"), w, h, kind, seed);
  return {
    width: w,
    height: h,
    label: kind === "neon" ? "Studio scene — neon street" : "Studio scene — boulevard",
    draw(ctx, x, y, dw, dh) { ctx.drawImage(c, x, y, dw, dh); },
  };
}

export function photoPicture(img, label) {
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    label,
    draw(ctx, x, y, dw, dh) { ctx.drawImage(img, x, y, dw, dh); },
  };
}

// --------------------------------------------------------------- grade & fx

function gradePanel(ctx, r, gradeName, mix, useAlt) {
  const g = GRADE_BOOK[gradeName] || GRADE_BOOK.sunset;
  const stops = useAlt ? g.alt : g.bands;
  ctx.save();
  ctx.globalAlpha = mix;
  const grad = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  for (const [at, colour] of stops) grad.addColorStop(at, colour);
  ctx.fillStyle = grad;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = g.glow;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

let cachedNoise = null;
function noisePattern(ctx) {
  if (!cachedNoise) {
    cachedNoise = document.createElement("canvas");
    cachedNoise.width = 256;
    cachedNoise.height = 256;
    const nctx = cachedNoise.getContext("2d");
    const img = nctx.createImageData(256, 256);
    const rnd = mulberry32(987654);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (rnd() * 256) | 0;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  return ctx.createPattern(cachedNoise, "repeat");
}

function drawStar(ctx, cx, cy, r, colour) {
  ctx.beginPath();
  for (let p = 0; p < 10; p++) {
    const rad = p % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (p * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (p === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.strokeStyle = "rgba(14,4,24,0.85)";
  ctx.lineWidth = r * 0.08;
  ctx.stroke();
}

// Reduce a font size until the text fits; returns the fitting size.
function fitFont(ctx, text, weight, family, start, maxW) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 9 && ctx.measureText(text).width > maxW) {
    size *= 0.93;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

const TITLE_STACK = '"Arial Narrow","HelveticaNeue-CondensedBold",Impact,"Franklin Gothic Medium",sans-serif';
const SCRIPT_STACK = '"Brush Script MT","Segoe Script","Snell Roundhand",cursive';
const BODY_STACK = '"Arial Narrow","Helvetica Neue",Arial,sans-serif';

// --------------------------------------------------------------- the poster
// opts: { layout, grade, gradeMix, grain, vignette, title, script, caption,
//         stars, selected, panels: [{ pic, zoom, ox, oy }] }
// pics: array of pictures; panel.pic indexes into it. `selected` is the
// panel index to outline, or -1 for none (exports pass -1).

export function renderPoster(ctx, W, H, opts, pics) {
  ctx.save();
  ctx.fillStyle = "#05020b";
  ctx.fillRect(0, 0, W, H);
  const seam = Math.max(4, Math.round(W * 0.0065));
  const rects = panelRects(opts.layout, W, H);

  rects.forEach((raw, i) => {
    const panel = opts.panels[i] || opts.panels[0];
    const pic = pics[panel.pic] || pics[0];
    const r = { x: raw.x + seam / 2, y: raw.y + seam / 2, w: raw.w - seam, h: raw.h - seam };
    if (!pic || r.w <= 0 || r.h <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    // cover-fit the picture into the panel, then apply zoom and offsets
    const scale = Math.max(r.w / pic.width, r.h / pic.height) * (panel.zoom || 1);
    const dw = pic.width * scale;
    const dh = pic.height * scale;
    const dx = r.x + (r.w - dw) / 2 + (panel.ox || 0) * r.w;
    const dy = r.y + (r.h - dh) / 2 + (panel.oy || 0) * r.h;
    pic.draw(ctx, dx, dy, dw, dh);
    gradePanel(ctx, r, opts.grade, opts.gradeMix, i % 2 === 1);
    ctx.restore();
    // the seam between panels, and a hairline of light just inside it
    ctx.strokeStyle = "#05020b";
    ctx.lineWidth = seam;
    ctx.strokeRect(raw.x + seam / 2, raw.y + seam / 2, raw.w - seam, raw.h - seam);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = Math.max(1, W * 0.0011);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (opts.selected === i) {
      ctx.strokeStyle = "#2fe8c6";
      ctx.lineWidth = Math.max(2, W * 0.0028);
      ctx.strokeRect(r.x + ctx.lineWidth, r.y + ctx.lineWidth, r.w - ctx.lineWidth * 2, r.h - ctx.lineWidth * 2);
    }
  });

  // heat stars across the top-right corner
  if (opts.stars > 0) {
    const r = W * 0.019;
    const firstX = W - W * 0.03 - r - (opts.stars - 1) * r * 2.5;
    for (let i = 0; i < opts.stars; i++) {
      drawStar(ctx, firstX + i * r * 2.5, H * 0.037, r, "#ffd76a");
    }
  }

  // title block: a slightly sheared gradient wordmark, with the script line
  // rotated beneath its right end
  const title = (opts.title || "").trim().toUpperCase();
  if (title) {
    const size = fitFont(ctx, title, 700, TITLE_STACK, W * 0.15, W * 0.92);
    ctx.save();
    ctx.translate(W / 2, H * 0.046 + size);
    ctx.transform(1, 0, -0.055, 1, 0, 0);
    ctx.font = `700 ${size}px ${TITLE_STACK}`;
    ctx.textAlign = "center";
    const fill = ctx.createLinearGradient(0, -size, 0, size * 0.24);
    fill.addColorStop(0, "#fff7dd");
    fill.addColorStop(0.45, "#ffd76a");
    fill.addColorStop(0.8, "#ff5f3a");
    fill.addColorStop(1, "#ff4d8d");
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = size * 0.11;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = size * 0.05;
    ctx.strokeStyle = "#1c0a26";
    ctx.strokeText(title, 0, 0);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = fill;
    ctx.fillText(title, 0, 0);
    ctx.restore();

    const script = (opts.script || "").trim();
    if (script) {
      const sub = fitFont(ctx, script, 400, SCRIPT_STACK, W * 0.05, W * 0.56);
      ctx.save();
      ctx.translate(W * 0.635, H * 0.046 + size * 1.36);
      ctx.rotate(-0.045);
      ctx.font = `${sub}px ${SCRIPT_STACK}`;
      ctx.textAlign = "center";
      ctx.shadowColor = "#ff4d8d";
      ctx.shadowBlur = sub * 0.5;
      ctx.fillStyle = "#a8fff2";
      ctx.fillText(script, 0, 0);
      ctx.fillText(script, 0, 0);
      ctx.restore();
    }
  }

  // caption ribbon along the bottom
  const caption = (opts.caption || "").trim().toUpperCase();
  if (caption) {
    const barH = H * 0.049;
    const barY = H - barH - H * 0.017;
    ctx.fillStyle = "rgba(6,2,13,0.76)";
    ctx.fillRect(0, barY, W, barH);
    const size = fitFont(ctx, caption, 700, BODY_STACK, barH * 0.5, W * 0.9);
    ctx.font = `700 ${size}px ${BODY_STACK}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${Math.round(size * 0.15)}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fdf6ff";
    ctx.fillText(caption, W / 2, barY + barH / 2);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  if (opts.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.76);
    vg.addColorStop(0, "rgba(6,0,16,0)");
    vg.addColorStop(1, "rgba(6,0,16,0.4)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (opts.grain) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = noisePattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  ctx.restore();
}
