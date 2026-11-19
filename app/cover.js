// cover.js — the drawing half of ViceFrame Cover Studio.
//
// Everything the finished cover is made of lives here: the panel layouts,
// the four colour grades, the lettering, and two scenes the studio paints
// for itself so it can make a cover before the reader adds a photo. Pure
// Canvas 2D, no image assets, no network.
//
// A "picture" in this file is a plain object { width, height, paint } where
// paint(ctx, x, y, w, h) draws the picture stretched into that rectangle.
// Photos and painted scenes both honour that shape, so the cover renderer
// never needs to know which it is holding.

export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  wide: { w: 1920, h: 1080 },
};

// ---------------------------------------------------------------- grades --
// Each grade is a top-to-bottom wash of translucent colour plus a soft-light
// tint. `counter` is the cooler variant dealt to every second panel, which
// is what makes a multi-panel cover feel printed rather than filtered.

export const GRADES = {
  sunset: {
    wash: [[0, "rgba(38,6,74,0.44)"], [0.4, "rgba(219,39,119,0.20)"], [0.72, "rgba(249,115,22,0.24)"], [1, "rgba(24,4,36,0.36)"]],
    counter: [[0, "rgba(6,32,74,0.42)"], [0.45, "rgba(14,116,144,0.18)"], [0.8, "rgba(249,115,22,0.15)"], [1, "rgba(20,2,40,0.36)"]],
    tint: "rgba(255,110,64,0.15)",
  },
  neon: {
    wash: [[0, "rgba(3,10,38,0.48)"], [0.5, "rgba(8,84,104,0.20)"], [0.82, "rgba(240,46,130,0.20)"], [1, "rgba(2,4,22,0.42)"]],
    counter: [[0, "rgba(28,3,52,0.46)"], [0.5, "rgba(140,28,132,0.18)"], [0.85, "rgba(16,190,178,0.16)"], [1, "rgba(2,4,22,0.42)"]],
    tint: "rgba(38,198,218,0.13)",
  },
  golden: {
    wash: [[0, "rgba(66,28,3,0.30)"], [0.52, "rgba(251,166,44,0.16)"], [1, "rgba(46,15,2,0.38)"]],
    counter: [[0, "rgba(48,34,3,0.32)"], [0.55, "rgba(253,186,76,0.14)"], [1, "rgba(38,18,2,0.38)"]],
    tint: "rgba(255,176,66,0.17)",
  },
  chrome: {
    wash: [[0, "rgba(9,18,46,0.27)"], [0.55, "rgba(110,168,250,0.10)"], [1, "rgba(7,7,18,0.31)"]],
    counter: [[0, "rgba(38,9,48,0.27)"], [0.55, "rgba(250,110,180,0.10)"], [1, "rgba(7,7,18,0.31)"]],
    tint: "rgba(150,196,255,0.11)",
  },
};

// --------------------------------------------------------------- layouts --
// Panel rectangles as fractions of the cover, so one layout works at the
// preview size and at every export size.

export function layoutPanels(layout, W, H) {
  const R = (fx, fy, fw, fh) => ({ x: fx * W, y: fy * H, w: fw * W, h: fh * H });
  if (layout === "grid") {
    return [R(0, 0, 0.5, 0.5), R(0.5, 0, 0.5, 0.5), R(0, 0.5, 0.5, 0.5), R(0.5, 0.5, 0.5, 0.5)];
  }
  if (layout === "triptych") {
    return [R(0, 0, 1 / 3, 1), R(1 / 3, 0, 1 / 3, 1), R(2 / 3, 0, 1 / 3, 1)];
  }
  if (layout === "full") {
    return [R(0, 0, 1, 1)];
  }
  // "hero": one tall panel on the left, a stack of three on the right.
  return [R(0, 0, 0.6, 1), R(0.6, 0, 0.4, 1 / 3), R(0.6, 1 / 3, 0.4, 1 / 3), R(0.6, 2 / 3, 0.4, 1 / 3)];
}

// ------------------------------------------------------------- randomness --
// A tiny linear congruential generator. The painted scenes seed it with a
// fixed number so they come out identical on every machine and every run.

function lcg(seed) {
  let s = seed % 2147483648;
  if (s <= 0) s += 2147483647;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// ------------------------------------------------------------- silhouettes --
// Flat black shapes the painted scenes are built from. `u` is a unit: the
// figure is about 1.0u tall, the palm about 1.0u tall, the car 1.0u long.

export function silhouetteFigure(ctx, cx, groundY, u, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = "round";
  // head
  ctx.beginPath();
  ctx.arc(cx, groundY - 0.92 * u, 0.07 * u, 0, Math.PI * 2);
  ctx.fill();
  // jacket: a tapered block from shoulders to hips
  ctx.beginPath();
  ctx.moveTo(cx - 0.115 * u, groundY - 0.86 * u);
  ctx.lineTo(cx + 0.115 * u, groundY - 0.86 * u);
  ctx.lineTo(cx + 0.08 * u, groundY - 0.48 * u);
  ctx.lineTo(cx - 0.08 * u, groundY - 0.48 * u);
  ctx.closePath();
  ctx.fill();
  // legs in a wide stance
  ctx.lineWidth = 0.08 * u;
  ctx.beginPath();
  ctx.moveTo(cx - 0.035 * u, groundY - 0.5 * u);
  ctx.lineTo(cx - 0.14 * u, groundY);
  ctx.moveTo(cx + 0.035 * u, groundY - 0.5 * u);
  ctx.lineTo(cx + 0.16 * u, groundY);
  ctx.stroke();
  // arms: left hangs, right bends up at the elbow
  ctx.lineWidth = 0.065 * u;
  ctx.beginPath();
  ctx.moveTo(cx - 0.105 * u, groundY - 0.83 * u);
  ctx.lineTo(cx - 0.18 * u, groundY - 0.47 * u);
  ctx.moveTo(cx + 0.105 * u, groundY - 0.83 * u);
  ctx.lineTo(cx + 0.2 * u, groundY - 0.66 * u);
  ctx.lineTo(cx + 0.13 * u, groundY - 0.53 * u);
  ctx.stroke();
  ctx.restore();
}

export function silhouettePalm(ctx, baseX, baseY, u, colour, bend = 0.22) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = "round";
  const crownX = baseX + bend * u;
  const crownY = baseY - u;
  ctx.lineWidth = 0.05 * u;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + bend * u * 0.25, baseY - u * 0.5, crownX, crownY);
  ctx.stroke();
  // fronds: arcs drooping away from the crown in both directions
  ctx.lineWidth = 0.04 * u;
  for (let i = 0; i < 7; i++) {
    const t = i / 6; // 0..1 across the fan
    const dir = t < 0.5 ? -1 : 1;
    const reach = (0.24 + 0.3 * Math.sin(t * Math.PI)) * u;
    const lift = (0.2 - 0.34 * Math.abs(t - 0.5)) * u;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + dir * reach * 0.55, crownY - lift - 0.1 * u,
      crownX + dir * reach, crownY - lift + 0.14 * u,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(crownX, crownY + 0.035 * u, 0.045 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function silhouetteCar(ctx, leftX, groundY, length, rimColour) {
  const h = length * 0.29;
  const top = groundY - h;
  ctx.save();
  ctx.fillStyle = "#10071c";
  // one path for the whole body: nose, hood, windshield, roofline, tail
  ctx.beginPath();
  ctx.moveTo(leftX, groundY - h * 0.34);
  ctx.quadraticCurveTo(leftX + length * 0.03, groundY - h * 0.62, leftX + length * 0.24, groundY - h * 0.66);
  ctx.lineTo(leftX + length * 0.37, groundY - h * 0.66);
  ctx.lineTo(leftX + length * 0.44, top);
  ctx.quadraticCurveTo(leftX + length * 0.47, top - h * 0.09, leftX + length * 0.54, top - h * 0.09);
  ctx.lineTo(leftX + length * 0.6, top - h * 0.09);
  ctx.lineTo(leftX + length * 0.68, groundY - h * 0.68);
  ctx.quadraticCurveTo(leftX + length * 0.96, groundY - h * 0.64, leftX + length, groundY - h * 0.36);
  ctx.quadraticCurveTo(leftX + length, groundY - h * 0.2, leftX + length * 0.93, groundY - h * 0.18);
  ctx.lineTo(leftX + length * 0.07, groundY - h * 0.18);
  ctx.quadraticCurveTo(leftX, groundY - h * 0.18, leftX, groundY - h * 0.34);
  ctx.closePath();
  ctx.fill();
  // neon rim light tracing the shoulder line
  ctx.strokeStyle = rimColour;
  ctx.lineWidth = h * 0.05;
  ctx.beginPath();
  ctx.moveTo(leftX + length * 0.04, groundY - h * 0.58);
  ctx.quadraticCurveTo(leftX + length * 0.2, groundY - h * 0.7, leftX + length * 0.37, groundY - h * 0.69);
  ctx.stroke();
  // wheels with a gold ring
  for (const fx of [0.23, 0.79]) {
    const wx = leftX + length * fx;
    const wy = groundY - h * 0.16;
    ctx.fillStyle = "#08040f";
    ctx.beginPath();
    ctx.arc(wx, wy, h * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,215,106,0.9)";
    ctx.lineWidth = h * 0.032;
    ctx.beginPath();
    ctx.arc(wx, wy, h * 0.09, 0, Math.PI * 2);
    ctx.stroke();
  }
  // headlight glow at the tail end of the body path (the nose points left here,
  // so the glow sits at the right where the tail lamp burns)
  const glow = ctx.createRadialGradient(leftX + length * 0.985, groundY - h * 0.42, 0, leftX + length * 0.985, groundY - h * 0.42, h * 0.55);
  glow.addColorStop(0, "rgba(255,238,186,0.75)");
  glow.addColorStop(1, "rgba(255,238,186,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(leftX + length * 0.55, groundY - h * 1.0, length * 0.55, h * 1.15);
  ctx.restore();
}

// ----------------------------------------------------------------- scenes --
// Scene one: a boulevard at sunset — banded sun, two skyline layers, palms,
// a parked convertible and a figure waiting by it.

export function sceneBoulevard(ctx, W, H) {
  const horizon = H * 0.85;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#27083f");
  sky.addColorStop(0.35, "#751c5e");
  sky.addColorStop(0.56, "#e23a76");
  sky.addColorStop(0.74, "#ff7438");
  sky.addColorStop(1, "#ffae45");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);
  // the sun, clipped by darker bands as it sinks
  const sunGrad = ctx.createLinearGradient(0, H * 0.33, 0, H * 0.77);
  sunGrad.addColorStop(0, "#ffe79d");
  sunGrad.addColorStop(1, "#ff5a36");
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(W * 0.64, H * 0.6, W * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(40,9,70,0.5)";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(W * 0.46, H * (0.615 + i * 0.047), W * 0.36, H * 0.015);
  }
  // far skyline, seeded so it never changes
  const rand = lcg(1234);
  ctx.fillStyle = "#341155";
  let x = -W * 0.01;
  while (x < W) {
    const bw = W * (0.035 + rand() * 0.055);
    const bh = H * (0.09 + rand() * 0.17);
    ctx.fillRect(x, H * 0.71 - bh, bw, bh + H * 0.14);
    x += bw + W * 0.011;
  }
  // two near blocks framing the view
  ctx.fillStyle = "#1a0a2c";
  ctx.fillRect(0, H * 0.58, W * 0.15, H * 0.28);
  ctx.fillRect(W * 0.87, H * 0.54, W * 0.13, H * 0.32);
  // road with a kerb line and one perspective lane marking
  ctx.fillStyle = "#120820";
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.fillStyle = "rgba(255,183,71,0.55)";
  ctx.fillRect(0, horizon - H * 0.004, W, H * 0.007);
  ctx.strokeStyle = "rgba(255,215,106,0.8)";
  ctx.lineWidth = H * 0.008;
  ctx.setLineDash([W * 0.05, W * 0.04]);
  ctx.beginPath();
  ctx.moveTo(W * 0.05, H * 0.95);
  ctx.lineTo(W * 0.42, H * 0.868);
  ctx.stroke();
  ctx.setLineDash([]);
  silhouettePalm(ctx, W * 0.09, H * 0.875, H * 0.5, "#140826", 0.26);
  silhouettePalm(ctx, W * 0.91, H * 0.865, H * 0.42, "#140826", -0.3);
  silhouettePalm(ctx, W * 0.23, H * 0.868, H * 0.32, "#1c0c31", 0.14);
  silhouetteCar(ctx, W * 0.29, H * 0.962, W * 0.53, "#ff4d8d");
  silhouetteFigure(ctx, W * 0.175, H * 0.952, H * 0.335, "#0c0516");
}

// Scene two: a neon street after rain — towers with lit windows, glowing
// signs, and their colours smeared down the wet pavement.

export function sceneNeon(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#031525");
  sky.addColorStop(0.55, "#062c46");
  sky.addColorStop(1, "#094657");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(226,244,255,0.92)";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.12, W * 0.026, 0, Math.PI * 2);
  ctx.fill();
  const rand = lcg(777);
  const tower = (tx, tw, th, shade) => {
    const base = H * 0.77;
    ctx.fillStyle = shade;
    ctx.fillRect(tx, base - th, tw, th);
    const cols = Math.max(2, Math.floor(tw / (W * 0.03)));
    const rows = Math.max(3, Math.floor(th / (H * 0.052)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rand() < 0.45) continue;
        ctx.fillStyle = rand() < 0.62 ? "rgba(255,213,102,0.85)" : "rgba(120,250,230,0.8)";
        ctx.fillRect(
          tx + (c + 0.5) * (tw / cols) - W * 0.006,
          base - th + (r + 0.5) * (th / rows) - H * 0.008,
          W * 0.012, H * 0.016,
        );
      }
    }
  };
  tower(0, W * 0.23, H * 0.6, "#051019");
  tower(W * 0.26, W * 0.17, H * 0.42, "#071726");
  tower(W * 0.59, W * 0.16, H * 0.5, "#061423");
  tower(W * 0.78, W * 0.22, H * 0.66, "#040d17");
  const sign = (sx, sy, sw, sh, colour) => {
    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = W * 0.018;
    ctx.strokeStyle = colour;
    ctx.lineWidth = H * 0.006;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, H * 0.012);
    ctx.stroke();
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(sx + sw * 0.14, sy + sh * (0.22 + i * 0.24), sw * (0.7 - i * 0.13), sh * 0.1);
    }
    ctx.restore();
  };
  sign(W * 0.033, H * 0.23, W * 0.15, H * 0.15, "#ff4d8d");
  sign(W * 0.815, H * 0.17, W * 0.14, H * 0.19, "#2ee6c8");
  sign(W * 0.615, H * 0.32, W * 0.11, H * 0.11, "#ff9a3d");
  // wet street: a dark base and a fading smear under each light
  const street = ctx.createLinearGradient(0, H * 0.77, 0, H);
  street.addColorStop(0, "#052029");
  street.addColorStop(1, "#020910");
  ctx.fillStyle = street;
  ctx.fillRect(0, H * 0.77, W, H * 0.23);
  const smear = (sx, colour, len) => {
    const g = ctx.createLinearGradient(0, H * 0.785, 0, H * 0.785 + len);
    g.addColorStop(0, colour);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx, H * 0.785, W * 0.016, len);
  };
  smear(W * 0.085, "rgba(255,77,141,0.5)", H * 0.16);
  smear(W * 0.865, "rgba(46,230,200,0.45)", H * 0.18);
  smear(W * 0.655, "rgba(255,154,61,0.4)", H * 0.12);
  smear(W * 0.44, "rgba(255,215,106,0.26)", H * 0.19);
  silhouettePalm(ctx, W * 0.52, H * 0.855, H * 0.38, "#020d18", 0.3);
  silhouetteFigure(ctx, W * 0.35, H * 0.968, H * 0.35, "#02080f");
  silhouetteCar(ctx, W * 0.57, H * 0.988, W * 0.39, "#2ee6c8");
}

export function paintScene(ctx, W, H, which) {
  if (which === "neon") sceneNeon(ctx, W, H);
  else sceneBoulevard(ctx, W, H);
}

// ---------------------------------------------------------------- pictures --

export function paintedPicture(which, w = 1280, h = 960) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paintScene(c.getContext("2d"), w, h, which);
  return {
    width: w,
    height: h,
    label: which === "neon" ? "Painted scene — neon street" : "Painted scene — boulevard",
    paint(ctx, x, y, dw, dh) { ctx.drawImage(c, x, y, dw, dh); },
  };
}

export function imagePicture(img, label) {
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    label,
    paint(ctx, x, y, dw, dh) { ctx.drawImage(img, x, y, dw, dh); },
  };
}

// ------------------------------------------------------------ grade & fx --

function washPanel(ctx, rect, gradeName, amount, counter) {
  const grade = GRADES[gradeName] || GRADES.sunset;
  const stops = counter && grade.counter ? grade.counter : grade.wash;
  ctx.save();
  ctx.globalAlpha = amount;
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  for (const [at, colour] of stops) grad.addColorStop(at, colour);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

let noiseTile = null;
function grainFill(ctx) {
  if (!noiseTile) {
    noiseTile = document.createElement("canvas");
    noiseTile.width = 256;
    noiseTile.height = 256;
    const nctx = noiseTile.getContext("2d");
    const data = nctx.createImageData(256, 256);
    const rand = lcg(4242);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.floor(rand() * 256);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    nctx.putImageData(data, 0, 0);
  }
  return ctx.createPattern(noiseTile, "repeat");
}

function star(ctx, cx, cy, r, colour) {
  ctx.beginPath();
  for (let p = 0; p < 10; p++) {
    const rad = p % 2 === 0 ? r : r * 0.46;
    const a = -Math.PI / 2 + (p * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (p === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.strokeStyle = "rgba(12,4,22,0.85)";
  ctx.lineWidth = r * 0.09;
  ctx.stroke();
}

// Shrink a font size until `text` fits `maxW`; returns the size that fits.
function shrinkToFit(ctx, text, weight, family, startSize, maxW) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 9 && ctx.measureText(text).width > maxW) {
    size *= 0.93;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

const FONT_TITLE = '"Arial Narrow","Helvetica Neue Condensed",Impact,"Franklin Gothic Medium",sans-serif';
const FONT_SCRIPT = '"Brush Script MT","Segoe Script","Snell Roundhand",cursive';
const FONT_BODY = '"Arial Narrow","Helvetica Neue",Arial,sans-serif';

// ------------------------------------------------------------ the render --
// opts: { layout, grade, gradeAmount, grain, vignette, title, tagline,
//         caption, heat, active, panels: [{ pic, zoom, ox, oy }] }
// pics: the picture list the panel indexes point into.

export function renderCover(ctx, W, H, opts, pics) {
  ctx.save();
  ctx.fillStyle = "#04020a";
  ctx.fillRect(0, 0, W, H);
  const gutter = Math.max(4, Math.round(W * 0.007));
  const rects = layoutPanels(opts.layout, W, H);

  rects.forEach((raw, i) => {
    const panel = opts.panels[i] || opts.panels[0];
    const pic = pics[panel.pic] || pics[0];
    const r = { x: raw.x + gutter / 2, y: raw.y + gutter / 2, w: raw.w - gutter, h: raw.h - gutter };
    if (!pic || r.w <= 0 || r.h <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    // cover-fit: scale so the picture covers the panel, then let zoom and
    // the reader's offsets push it around inside the clip.
    const coverScale = Math.max(r.w / pic.width, r.h / pic.height) * (panel.zoom || 1);
    const dw = pic.width * coverScale;
    const dh = pic.height * coverScale;
    const dx = r.x + (r.w - dw) / 2 + (panel.ox || 0) * r.w;
    const dy = r.y + (r.h - dh) / 2 + (panel.oy || 0) * r.h;
    pic.paint(ctx, dx, dy, dw, dh);
    washPanel(ctx, r, opts.grade, opts.gradeAmount, i % 2 === 1);
    ctx.restore();
    // frame: a dark seam and a hairline of light inside it
    ctx.strokeStyle = "#04020a";
    ctx.lineWidth = gutter;
    ctx.strokeRect(raw.x + gutter / 2, raw.y + gutter / 2, raw.w - gutter, raw.h - gutter);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = Math.max(1, W * 0.0012);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (opts.active === i) {
      ctx.strokeStyle = "#2ee6c8";
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.strokeRect(r.x + ctx.lineWidth, r.y + ctx.lineWidth, r.w - ctx.lineWidth * 2, r.h - ctx.lineWidth * 2);
    }
  });

  // heat stars, top right
  if (opts.heat > 0) {
    const r = W * 0.02;
    const firstX = W - W * 0.03 - r - (opts.heat - 1) * r * 2.5;
    ctx.save();
    for (let i = 0; i < opts.heat; i++) {
      star(ctx, firstX + i * r * 2.5, H * 0.038, r, "#ffd76a");
    }
    ctx.restore();
  }

  // the title: a sheared, sunset-filled condensed wordmark across the top,
  // with the script tagline rotated under its right shoulder.
  const title = (opts.title || "").trim().toUpperCase();
  if (title) {
    const size = shrinkToFit(ctx, title, 700, FONT_TITLE, W * 0.155, W * 0.92);
    ctx.save();
    ctx.translate(W / 2, H * 0.048 + size);
    ctx.transform(1, 0, -0.06, 1, 0, 0);
    ctx.font = `700 ${size}px ${FONT_TITLE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const fill = ctx.createLinearGradient(0, -size, 0, size * 0.22);
    fill.addColorStop(0, "#fff6dc");
    fill.addColorStop(0.45, "#ffd76a");
    fill.addColorStop(0.8, "#ff5e3a");
    fill.addColorStop(1, "#ff4d8d");
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = size * 0.055;
    ctx.strokeStyle = "#1a0a24";
    ctx.strokeText(title, 0, 0);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = fill;
    ctx.fillText(title, 0, 0);
    ctx.restore();

    const tagline = (opts.tagline || "").trim();
    if (tagline) {
      const sub = shrinkToFit(ctx, tagline, 400, FONT_SCRIPT, W * 0.052, W * 0.58);
      ctx.save();
      ctx.translate(W * 0.64, H * 0.048 + size * 1.34);
      ctx.rotate(-0.04);
      ctx.font = `${sub}px ${FONT_SCRIPT}`;
      ctx.textAlign = "center";
      ctx.shadowColor = "#ff4d8d";
      ctx.shadowBlur = sub * 0.5;
      ctx.fillStyle = "#a9fff3";
      ctx.fillText(tagline, 0, 0);
      ctx.fillText(tagline, 0, 0);
      ctx.restore();
    }
  }

  // caption strip along the bottom edge
  const caption = (opts.caption || "").trim().toUpperCase();
  if (caption) {
    const barH = H * 0.05;
    const barY = H - barH - H * 0.018;
    ctx.fillStyle = "rgba(5,2,12,0.75)";
    ctx.fillRect(0, barY, W, barH);
    const size = shrinkToFit(ctx, caption, 700, FONT_BODY, barH * 0.52, W * 0.9);
    ctx.font = `700 ${size}px ${FONT_BODY}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${Math.round(size * 0.16)}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fdf6ff";
    ctx.fillText(caption, W / 2, barY + barH / 2);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  if (opts.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, "rgba(6,0,16,0)");
    vg.addColorStop(1, "rgba(6,0,16,0.42)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (opts.grain) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = grainFill(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  ctx.restore();
}
