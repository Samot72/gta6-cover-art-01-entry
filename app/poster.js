// Poster Lab — a one-module cover-art studio for fan-made GTA-style posters.
//
// Everything the app does lives in this single file, in five parts:
//
//   1. Small utilities: a seeded random generator, clamps and colour tools.
//   2. Two painted "stand-in photo" scenes (a sunset boulevard and a neon
//      street) drawn entirely with canvas paths — no image files, no network.
//   3. Five colour grades that wash a canvas in sunset / neon / noon light.
//   4. Five panel layouts plus the cover renderer: photos are cover-fitted
//      into panels, graded, framed, and lettered with a title, a subtitle,
//      a caption bar and a row of heat stars.
//   5. The editor: it wires the page controls to a small state object, keeps
//      an undo history, and exports the finished cover as a PNG.
//
// The module is loaded by index.html as a classic module script with no
// imports, so the page works from any static file server, fully offline.
// A tiny testing surface is published as window.PosterLab so the sample
// stills and the screenshots can be produced by driving this very code.

// ---------------------------------------------------------------------------
// Part 1 — utilities
// ---------------------------------------------------------------------------

// A linear congruential generator: good enough for scattering windows,
// palms and rain, and it makes every painted scene repeatable from its seed.
function makeSeededRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Clamp a number into a closed range.
function clampNumber(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

// Linear interpolation between two numbers.
function lerpValue(from, to, t) {
  return from + (to - from) * t;
}

// A random float in [low, high) drawn from the given generator.
function rangeFloat(rng, low, high) {
  return low + rng() * (high - low);
}

// A random integer in [low, high] drawn from the given generator.
function rangeInt(rng, low, high) {
  return Math.floor(rangeFloat(rng, low, high + 1));
}

// Pick one element of a list with the given generator.
function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

// Parse a '#rrggbb' colour into its channels.
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Format a '#rrggbb' colour plus an alpha as an rgba() string.
function rgbaString(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Build a vertical linear gradient from a list of [offset, colour] stops.
function verticalGradient(ctx, y0, y1, stops) {
  const grad = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [offset, colour] of stops) grad.addColorStop(offset, colour);
  return grad;
}

// Build a horizontal linear gradient from a list of [offset, colour] stops.
function horizontalGradient(ctx, x0, x1, stops) {
  const grad = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [offset, colour] of stops) grad.addColorStop(offset, colour);
  return grad;
}

// Fill a rectangle with a colour, saving and restoring the context.
function fillRectColour(ctx, x, y, w, h, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Trace a rounded rectangle path (not filled or stroked — caller's choice).
function traceRoundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Part 2 — painted scenes (stand-in photographs, drawn from a seed)
// ---------------------------------------------------------------------------

// A band of building silhouettes along a baseline. Buildings are contiguous
// rectangles of random width and height; with a window colour set, a sparse
// scatter of lit windows is punched into them.
function paintSkylineBand(ctx, w, baseY, minH, maxH, colour, rng, windowColour, windowChance) {
  ctx.save();
  ctx.fillStyle = colour;
  let x = -rangeFloat(rng, 0, 30);
  const tops = [];
  while (x < w) {
    const bw = rangeFloat(rng, w * 0.04, w * 0.11);
    const bh = rangeFloat(rng, minH, maxH);
    ctx.fillRect(x, baseY - bh, bw, bh);
    tops.push({ x, w: bw, top: baseY - bh, h: bh });
    // The odd rooftop gets a water tower or an antenna, poster-style.
    if (rng() < 0.3) {
      const cx = x + bw / 2;
      ctx.fillRect(cx - 1.5, baseY - bh - rangeFloat(rng, 8, 22), 3, rangeFloat(rng, 8, 22));
    }
    x += bw + rangeFloat(rng, 1, 6);
  }
  if (windowColour) {
    ctx.fillStyle = windowColour;
    for (const b of tops) {
      const cols = Math.max(1, Math.floor(b.w / 14));
      const rows = Math.max(1, Math.floor(b.h / 18));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rng() < windowChance) {
            ctx.globalAlpha = rangeFloat(rng, 0.35, 0.95);
            ctx.fillRect(b.x + 4 + c * 14, b.top + 6 + r * 18, 5, 7);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// A palm tree silhouette: a curved trunk of stacked segments and a crown of
// drooping fronds. `lean` bends the crown sideways, in pixels at the top.
function paintPalmSilhouette(ctx, x, baseY, height, lean, colour, rng) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  const segments = 7;
  let px = x;
  let py = baseY;
  ctx.lineWidth = Math.max(3, height * 0.03);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px, py);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const nx = x + lean * t * t;
    const ny = baseY - height * t;
    ctx.lineTo(nx, ny);
    px = nx;
    py = ny;
  }
  ctx.stroke();
  // Fronds: arcs sweeping out and down from the crown point.
  const fronds = rangeInt(rng, 6, 8);
  for (let i = 0; i < fronds; i++) {
    const angle = Math.PI * (0.08 + (i / fronds) * 0.95);
    const len = height * rangeFloat(rng, 0.3, 0.48);
    const ex = px + Math.cos(angle) * len;
    const ey = py - Math.sin(angle) * len * 0.45 + len * 0.22;
    ctx.lineWidth = Math.max(2, height * 0.016);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + Math.cos(angle) * len * 0.55, py - Math.sin(angle) * len * 0.6, ex, ey);
    ctx.stroke();
  }
  // A small cluster of coconuts under the crown.
  ctx.beginPath();
  ctx.arc(px - 3, py + 4, height * 0.02 + 2, 0, Math.PI * 2);
  ctx.arc(px + 4, py + 5, height * 0.017 + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The retro striped sun: a disc whose lower half is sliced by sky-coloured
// slits that grow taller toward the bottom.
function paintStripedSun(ctx, cx, cy, radius, skyColourAt) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  grad.addColorStop(0, '#ffd319');
  grad.addColorStop(0.55, '#ff2975');
  grad.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skyColourAt;
  let slitY = cy + radius * 0.08;
  let slitH = radius * 0.03;
  while (slitY < cy + radius) {
    ctx.fillRect(cx - radius, slitY, radius * 2, slitH);
    slitY += slitH + radius * 0.09;
    slitH *= 1.45;
  }
  ctx.restore();
}

// A soft radial glow, used for lamps, the moon and neon halos.
function paintGlowOrb(ctx, cx, cy, radius, colour, alpha) {
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, rgbaString(colour, alpha));
  grad.addColorStop(1, rgbaString(colour, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

// A low convertible silhouette in profile: body, cabin, wheels and a driver.
// Drawn facing left, centred on (cx, groundY), `length` pixels long.
function paintConvertibleSilhouette(ctx, cx, groundY, length, colour) {
  const h = length * 0.16;
  const x0 = cx - length / 2;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x0, groundY - h * 0.35);
  ctx.lineTo(x0 + length * 0.06, groundY - h * 0.62);   // rear deck
  ctx.lineTo(x0 + length * 0.3, groundY - h * 0.7);     // seat back
  ctx.lineTo(x0 + length * 0.38, groundY - h * 1.5);    // windshield up
  ctx.lineTo(x0 + length * 0.44, groundY - h * 0.72);   // windshield down to hood
  ctx.lineTo(x0 + length * 0.86, groundY - h * 0.66);   // long hood
  ctx.lineTo(x0 + length, groundY - h * 0.4);           // nose
  ctx.lineTo(x0 + length, groundY - h * 0.18);
  ctx.lineTo(x0, groundY - h * 0.18);
  ctx.closePath();
  ctx.fill();
  // The driver's head and shoulders above the seat line.
  ctx.beginPath();
  ctx.arc(x0 + length * 0.33, groundY - h * 1.02, h * 0.21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x0 + length * 0.27, groundY - h * 1.0, h * 0.55, h * 0.35);
  // Wheels as dark wells with a pale hub.
  for (const fx of [0.18, 0.8]) {
    ctx.beginPath();
    ctx.arc(x0 + length * fx, groundY - h * 0.16, h * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 230, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x0 + length * fx, groundY - h * 0.16, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colour;
  }
  ctx.restore();
}

// Scene one: a sunset boulevard. Sky, striped sun, two skyline bands, a
// palm-lined road running to a vanishing point, lamps, birds, one car.
function paintBoulevardScene(ctx, w, h, seed) {
  const rng = makeSeededRandom(seed);
  const horizon = h * 0.62;

  // Sky: violet up top melting through magenta and coral to amber.
  ctx.fillStyle = verticalGradient(ctx, 0, horizon, [
    [0, '#2b1055'],
    [0.38, '#7b2d8b'],
    [0.68, '#e5488c'],
    [0.88, '#ff7e47'],
    [1, '#ffb35c'],
  ]);
  ctx.fillRect(0, 0, w, horizon + 1);

  // The sun sits a little left of centre, low over the water tower line.
  paintStripedSun(ctx, w * 0.38, horizon - h * 0.16, h * 0.17, '#e5488c');
  paintGlowOrb(ctx, w * 0.38, horizon - h * 0.16, h * 0.34, '#ff9a5c', 0.35);

  // Far skyline (pale, hazed) then a nearer, darker band with lit windows.
  ctx.globalAlpha = 0.55;
  paintSkylineBand(ctx, w, horizon, h * 0.1, h * 0.3, '#5b2a86', rng, null, 0);
  ctx.globalAlpha = 1;
  paintSkylineBand(ctx, w, horizon, h * 0.06, h * 0.2, '#2a0f45', rng, '#ffd9a0', 0.16);

  // The boulevard: a road trapezoid widening toward the viewer.
  const vanishX = w * 0.46;
  ctx.fillStyle = verticalGradient(ctx, horizon, h, [
    [0, '#3d1458'],
    [0.25, '#2a0f45'],
    [1, '#160a2e'],
  ]);
  ctx.beginPath();
  ctx.moveTo(vanishX - w * 0.05, horizon);
  ctx.lineTo(vanishX + w * 0.05, horizon);
  ctx.lineTo(w * 1.02, h);
  ctx.lineTo(-w * 0.02, h);
  ctx.closePath();
  ctx.fill();
  // Sidewalks as lighter shoulders either side of the asphalt.
  ctx.fillStyle = 'rgba(255, 150, 120, 0.14)';
  ctx.beginPath();
  ctx.moveTo(vanishX - w * 0.16, horizon);
  ctx.lineTo(vanishX - w * 0.05, horizon);
  ctx.lineTo(-w * 0.02, h);
  ctx.lineTo(-w * 0.22, h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(vanishX + w * 0.05, horizon);
  ctx.lineTo(vanishX + w * 0.16, horizon);
  ctx.lineTo(w * 1.22, h);
  ctx.lineTo(w * 1.02, h);
  ctx.closePath();
  ctx.fill();
  // Centre dashes rushing toward the viewer, warm from the sunset.
  ctx.fillStyle = 'rgba(255, 190, 90, 0.75)';
  let dashT = 0.04;
  while (dashT < 1) {
    const dy = horizon + (h - horizon) * dashT * dashT;
    const dashW = lerpValue(2, w * 0.02, dashT);
    const dashH = lerpValue(2, h * 0.035, dashT);
    ctx.fillRect(vanishX - dashW / 2, dy, dashW, dashH);
    dashT += 0.055 + dashT * 0.11;
  }

  // Palms flank the road, big in front and small at the vanishing point.
  const palmRows = [
    { x: w * 0.06, y: h * 0.99, s: h * 0.52, lean: 26 },
    { x: w * 0.16, y: h * 0.8, s: h * 0.36, lean: 18 },
    { x: w * 0.27, y: h * 0.68, s: h * 0.24, lean: 12 },
    { x: w * 0.94, y: h * 0.99, s: h * 0.55, lean: -30 },
    { x: w * 0.85, y: h * 0.79, s: h * 0.34, lean: -18 },
    { x: w * 0.74, y: h * 0.67, s: h * 0.22, lean: -10 },
  ];
  for (const p of palmRows) {
    paintPalmSilhouette(ctx, p.x, p.y, p.s, p.lean, '#1c0836', rng);
  }

  // Street lamps: thin poles with a glowing orb and a halo.
  for (const lx of [0.3, 0.62]) {
    const lampX = w * lx;
    const lampTop = horizon - h * 0.1;
    ctx.strokeStyle = '#1c0836';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lampX, horizon + h * 0.05);
    ctx.lineTo(lampX, lampTop);
    ctx.stroke();
    paintGlowOrb(ctx, lampX, lampTop, h * 0.07, '#ffc46b', 0.8);
    fillRectColour(ctx, lampX - 3, lampTop - 3, 6, 6, '#ffe9b0');
  }

  // The hero car, parked across the lower third.
  paintConvertibleSilhouette(ctx, w * 0.52, h * 0.94, w * 0.52, '#12041f');

  // A few birds as paired arcs in the upper sky.
  ctx.strokeStyle = 'rgba(30, 5, 50, 0.8)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 6; i++) {
    const bx = rangeFloat(rng, w * 0.08, w * 0.9);
    const by = rangeFloat(rng, h * 0.06, h * 0.3);
    const bs = rangeFloat(rng, 5, 11);
    ctx.beginPath();
    ctx.arc(bx - bs, by, bs, Math.PI * 1.15, Math.PI * 1.85);
    ctx.arc(bx + bs, by, bs, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

// A neon sign: a glowing rounded board with a bright rim and a few short
// bars inside standing in for lettering.
function paintNeonSign(ctx, x, y, w, h, colour, rng) {
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = 22;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  traceRoundedRect(ctx, x, y, w, h, 8);
  ctx.stroke();
  ctx.shadowBlur = 10;
  traceRoundedRect(ctx, x + 5, y + 5, w - 10, h - 10, 5);
  ctx.stroke();
  // Letter-ish bars: two or three verticals and a crossbar, poster shorthand.
  ctx.shadowBlur = 12;
  ctx.lineWidth = 4;
  const bars = rangeInt(rng, 2, 4);
  for (let i = 0; i < bars; i++) {
    const bx = x + 14 + i * ((w - 28) / Math.max(1, bars));
    ctx.beginPath();
    ctx.moveTo(bx, y + h * 0.3);
    ctx.lineTo(bx, y + h * 0.7);
    ctx.stroke();
    if (rng() < 0.6) {
      ctx.beginPath();
      ctx.moveTo(bx, y + h * 0.5);
      ctx.lineTo(bx + (w - 28) / Math.max(1, bars) * 0.55, y + h * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
  paintGlowOrb(ctx, x + w / 2, y + h / 2, w * 0.75, colour, 0.16);
}

// Scene two: a neon street at night. Storefronts with glowing signs, a wet
// street mirroring them, one figure under an umbrella, fine rain.
function paintNeonStreetScene(ctx, w, h, seed) {
  const rng = makeSeededRandom(seed);
  const streetTop = h * 0.66;

  // Night sky, almost black blue.
  ctx.fillStyle = verticalGradient(ctx, 0, streetTop, [
    [0, '#04060f'],
    [0.7, '#0a1430'],
    [1, '#122046'],
  ]);
  ctx.fillRect(0, 0, w, streetTop + 1);

  // A small moon and its halo, top right.
  paintGlowOrb(ctx, w * 0.84, h * 0.12, h * 0.13, '#bcd6ff', 0.5);
  ctx.fillStyle = '#e8f1ff';
  ctx.beginPath();
  ctx.arc(w * 0.84, h * 0.12, h * 0.032, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 190, 240, 0.35)';
  ctx.beginPath();
  ctx.arc(w * 0.828, h * 0.112, h * 0.026, 0, Math.PI * 2);
  ctx.fill();

  // Back buildings with sparse cool windows.
  paintSkylineBand(ctx, w, streetTop, h * 0.2, h * 0.52, '#070d1f', rng, '#9fd8ff', 0.1);

  // The storefront row: dark fronts, bright awnings, neon signs above.
  const neonPalette = ['#ff2e88', '#22d3ee', '#a3e635', '#fbbf24', '#f472b6', '#38bdf8'];
  const shops = 4;
  const shopW = w / shops;
  for (let i = 0; i < shops; i++) {
    const sx = i * shopW;
    const frontTop = streetTop - h * rangeFloat(rng, 0.3, 0.38);
    fillRectColour(ctx, sx + 3, frontTop, shopW - 6, streetTop - frontTop, '#0a1122');
    // Shop window: a warm or cool lit pane with mullion bars.
    const paneColour = rng() < 0.5 ? 'rgba(255, 196, 110, 0.85)' : 'rgba(150, 220, 255, 0.8)';
    fillRectColour(ctx, sx + shopW * 0.14, frontTop + h * 0.13, shopW * 0.72, h * 0.15, paneColour);
    ctx.fillStyle = 'rgba(5, 8, 18, 0.85)';
    for (let m = 1; m < 3; m++) {
      ctx.fillRect(sx + shopW * 0.14 + (shopW * 0.72 * m) / 3, frontTop + h * 0.13, 3, h * 0.15);
    }
    // Awning stripe under the sign.
    fillRectColour(ctx, sx + shopW * 0.08, frontTop + h * 0.1, shopW * 0.84, h * 0.022, pickFrom(rng, neonPalette));
    // The sign itself.
    paintNeonSign(ctx, sx + shopW * 0.12, frontTop + h * 0.02, shopW * 0.76, h * 0.07, pickFrom(rng, neonPalette), rng);
  }

  // The wet street: a dark gradient that swallows the bottom third.
  ctx.fillStyle = verticalGradient(ctx, streetTop, h, [
    [0, '#0a1226'],
    [0.3, '#0d1834'],
    [1, '#04060f'],
  ]);
  ctx.fillRect(0, streetTop, w, h - streetTop);

  // Reflections: each sign smears a soft vertical streak into the street.
  for (let i = 0; i < shops; i++) {
    const sx = i * shopW + shopW / 2;
    const colour = neonPalette[i % neonPalette.length];
    const grad = ctx.createLinearGradient(0, streetTop, 0, h);
    grad.addColorStop(0, rgbaString(colour, 0.4));
    grad.addColorStop(1, rgbaString(colour, 0));
    ctx.fillStyle = grad;
    const streakW = shopW * rangeFloat(rng, 0.2, 0.34);
    ctx.fillRect(sx - streakW / 2, streetTop, streakW, (h - streetTop) * 0.92);
  }
  // Ripple lines breaking the reflections up.
  ctx.strokeStyle = 'rgba(190, 220, 255, 0.13)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 26; i++) {
    const ry = rangeFloat(rng, streetTop + 4, h - 4);
    const rx = rangeFloat(rng, 0, w);
    const rl = rangeFloat(rng, 14, 70);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + rl, ry);
    ctx.stroke();
  }

  // A lone figure with an umbrella, centre frame, reflected faintly.
  const figX = w * 0.5;
  const figBase = h * 0.9;
  const figH = h * 0.21;
  ctx.fillStyle = '#02040a';
  ctx.beginPath(); // umbrella canopy
  ctx.arc(figX, figBase - figH, figH * 0.52, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(figX - figH * 0.3, figBase - figH * 0.86, figH * 0.6, figH * 0.14); // shoulders
  ctx.fillRect(figX - figH * 0.09, figBase - figH * 0.74, figH * 0.18, figH * 0.6); // coat
  ctx.fillRect(figX - figH * 0.16, figBase - figH * 0.14, figH * 0.11, figH * 0.14); // left leg
  ctx.fillRect(figX + figH * 0.05, figBase - figH * 0.14, figH * 0.11, figH * 0.14); // right leg
  paintGlowOrb(ctx, figX, figBase + 4, figH * 0.5, '#7dd3fc', 0.14);

  // Fine rain, slanted by a light wind.
  ctx.strokeStyle = 'rgba(190, 220, 255, 0.28)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 0; i < 130; i++) {
    const rx = rangeFloat(rng, 0, w);
    const ry = rangeFloat(rng, 0, h);
    const rl = rangeFloat(rng, 8, 18);
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - rl * 0.22, ry + rl);
  }
  ctx.stroke();
}

// The two scenes by key, with the labels the editor shows.
const PAINTED_SCENES = {
  boulevard: { label: 'Sunset Boulevard (painted)', paint: paintBoulevardScene },
  neon: { label: 'Neon Street (painted)', paint: paintNeonStreetScene },
};

// Paint a named scene into a fresh canvas of the given size and return it.
function paintSceneCanvas(kind, w, h, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  PAINTED_SCENES[kind].paint(ctx, w, h, seed);
  return canvas;
}

// ---------------------------------------------------------------------------
// Part 3 — colour grades
//
// A grade is layered light, not a filter: each one lays a warm or cool wash
// over the picture with a blending mode, deepens one end of the frame with
// a multiply gradient and lifts the other with a screen gradient. Strength
// (0..1) scales every layer's alpha, so the editor's slider cross-fades
// between the raw photo and the full grade.
// ---------------------------------------------------------------------------

// Lay one blended gradient over a region of the canvas.
function layBlendGradient(ctx, x, y, w, h, mode, stops) {
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = verticalGradient(ctx, y, y + h, stops);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Vice Sunset: magenta shadows, amber highlights, a hot band at the horizon.
function gradeViceSunset(ctx, x, y, w, h, s) {
  layBlendGradient(ctx, x, y, w, h, 'overlay', [
    [0, `rgba(64, 12, 96, ${0.5 * s})`],
    [0.5, `rgba(255, 41, 117, ${0.22 * s})`],
    [1, `rgba(255, 126, 71, ${0.42 * s})`],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'multiply', [
    [0, 'rgba(255, 255, 255, 0)'],
    [1, `rgba(58, 10, 66, ${0.45 * s})`],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'screen', [
    [0, `rgba(255, 179, 92, ${0.3 * s})`],
    [0.45, 'rgba(255, 179, 92, 0)'],
    [1, 'rgba(255, 179, 92, 0)'],
  ]);
}

// Neon Nights: teal depths and pink light from above, like a wet street.
function gradeNeonNights(ctx, x, y, w, h, s) {
  layBlendGradient(ctx, x, y, w, h, 'overlay', [
    [0, `rgba(255, 46, 136, ${0.34 * s})`],
    [0.45, `rgba(20, 20, 60, ${0.18 * s})`],
    [1, `rgba(14, 116, 144, ${0.5 * s})`],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'multiply', [
    [0, `rgba(8, 20, 44, ${0.4 * s})`],
    [0.6, 'rgba(8, 20, 44, 0)'],
    [1, 'rgba(8, 20, 44, 0)'],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'screen', [
    [0, 'rgba(125, 211, 252, 0)'],
    [1, `rgba(125, 211, 252, ${0.28 * s})`],
  ]);
}

// Golden Hour: everything dipped in amber, shadows kept warm and shallow.
function gradeGoldenHour(ctx, x, y, w, h, s) {
  layBlendGradient(ctx, x, y, w, h, 'soft-light', [
    [0, `rgba(255, 170, 60, ${0.65 * s})`],
    [1, `rgba(190, 90, 30, ${0.5 * s})`],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'screen', [
    [0, `rgba(255, 214, 130, ${0.34 * s})`],
    [1, 'rgba(255, 214, 130, 0)'],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'multiply', [
    [0, 'rgba(120, 60, 10, 0)'],
    [1, `rgba(120, 60, 10, ${0.3 * s})`],
  ]);
}

// Chrome Noon: cool silver light, bleached sky, hard midday contrast.
function gradeChromeNoon(ctx, x, y, w, h, s) {
  layBlendGradient(ctx, x, y, w, h, 'overlay', [
    [0, `rgba(210, 228, 245, ${0.42 * s})`],
    [0.55, `rgba(140, 165, 195, ${0.2 * s})`],
    [1, `rgba(40, 58, 86, ${0.42 * s})`],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'screen', [
    [0, `rgba(235, 244, 255, ${0.3 * s})`],
    [0.4, 'rgba(235, 244, 255, 0)'],
    [1, 'rgba(235, 244, 255, 0)'],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'multiply', [
    [0, 'rgba(30, 44, 70, 0)'],
    [1, `rgba(30, 44, 70, ${0.34 * s})`],
  ]);
}

// Midnight Teal: deep teal shadows, cyan rim light, the city after closing.
function gradeMidnightTeal(ctx, x, y, w, h, s) {
  layBlendGradient(ctx, x, y, w, h, 'overlay', [
    [0, `rgba(6, 40, 48, ${0.55 * s})`],
    [0.6, `rgba(10, 90, 100, ${0.3 * s})`],
    [1, `rgba(4, 24, 34, ${0.55 * s})`],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'screen', [
    [0, 'rgba(103, 232, 249, 0)'],
    [0.85, 'rgba(103, 232, 249, 0)'],
    [1, `rgba(103, 232, 249, ${0.22 * s})`],
  ]);
  layBlendGradient(ctx, x, y, w, h, 'multiply', [
    [0, `rgba(3, 18, 26, ${0.38 * s})`],
    [0.5, 'rgba(3, 18, 26, 0)'],
    [1, 'rgba(3, 18, 26, 0)'],
  ]);
}

// The grade book: key, display label and painter for each of the five.
const GRADE_BOOK = {
  vice: { label: 'Vice Sunset', apply: gradeViceSunset },
  neon: { label: 'Neon Nights', apply: gradeNeonNights },
  golden: { label: 'Golden Hour', apply: gradeGoldenHour },
  chrome: { label: 'Chrome Noon', apply: gradeChromeNoon },
  teal: { label: 'Midnight Teal', apply: gradeMidnightTeal },
};

// Apply a named grade over a region at the given strength.
function applyGrade(ctx, x, y, w, h, gradeKey, strength) {
  const s = clampNumber(strength, 0, 1);
  if (s <= 0.001) return;
  const grade = GRADE_BOOK[gradeKey] || GRADE_BOOK.vice;
  grade.apply(ctx, x, y, w, h, s);
}

// A reusable film-grain pattern, built once from a fixed seed so every
// render of the same cover carries the same grain.
let grainPatternCache = null;
function grainPattern(ctx) {
  if (grainPatternCache) return grainPatternCache;
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(256, 256);
  const rng = makeSeededRandom(77003);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rng() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainPatternCache = ctx.createPattern(tile, 'repeat');
  return grainPatternCache;
}

// Finishing pass for a whole cover: a whisper of grain and a vignette that
// pulls the eye to the middle of the frame.
function finishCover(ctx, w, h, grainAmount) {
  if (grainAmount > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grainAmount;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.78);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 0, 10, 0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// Part 4 — panel layouts and the cover renderer
//
// A layout divides the canvas into panel rectangles. The renderer cover-
// fits each panel's photo into its rectangle (honouring that panel's zoom
// and focus point), grades the panel, frames it, and finally letters the
// whole cover: a scrim and title at the top, heat stars under the title,
// and a caption bar along the bottom.
// ---------------------------------------------------------------------------

// Compute the source rectangle that cover-fits an image into a box, given a
// zoom (>= 1) and a focus point (0..1 across the overflow on each axis).
function coverSourceRect(imgW, imgH, boxW, boxH, zoom, fx, fy) {
  const scale = Math.max(boxW / imgW, boxH / imgH) * Math.max(1, zoom);
  const sw = boxW / scale;
  const sh = boxH / scale;
  return {
    sx: clampNumber((imgW - sw) * fx, 0, Math.max(0, imgW - sw)),
    sy: clampNumber((imgH - sh) * fy, 0, Math.max(0, imgH - sh)),
    sw,
    sh,
  };
}

// Spotlight: one tall hero panel on the left, a column of three on the right.
function layoutSpotlight(W, H, g) {
  const innerW = W - g * 2;
  const innerH = H - g * 2;
  const heroW = Math.round(innerW * 0.575);
  const colX = g + heroW + g;
  const colW = W - g - colX;
  const step = Math.floor((innerH - g * 2) / 3);
  return [
    { x: g, y: g, w: heroW, h: innerH },
    { x: colX, y: g, w: colW, h: step },
    { x: colX, y: g + step + g, w: colW, h: step },
    { x: colX, y: g + (step + g) * 2, w: colW, h: innerH - (step + g) * 2 },
  ];
}

// Quad: a clean two-by-two grid.
function layoutQuad(W, H, g) {
  const cellW = Math.floor((W - g * 3) / 2);
  const cellH = Math.floor((H - g * 3) / 2);
  return [
    { x: g, y: g, w: cellW, h: cellH },
    { x: g * 2 + cellW, y: g, w: W - g - (g * 2 + cellW), h: cellH },
    { x: g, y: g * 2 + cellH, w: cellW, h: H - g - (g * 2 + cellH) },
    { x: g * 2 + cellW, y: g * 2 + cellH, w: W - g - (g * 2 + cellW), h: H - g - (g * 2 + cellH) },
  ];
}

// Triptych: three columns, the middle one a touch wider.
function layoutTriptych(W, H, g) {
  const innerH = H - g * 2;
  const midW = Math.round((W - g * 4) * 0.38);
  const sideW = Math.floor((W - g * 4 - midW) / 2);
  const x1 = g;
  const x2 = x1 + sideW + g;
  const x3 = x2 + midW + g;
  return [
    { x: x1, y: g, w: sideW, h: innerH },
    { x: x2, y: g, w: midW, h: innerH },
    { x: x3, y: g, w: W - g - x3, h: innerH },
  ];
}

// Billboard: one wide panel up top, a pair beneath it.
function layoutBillboard(W, H, g) {
  const topH = Math.round((H - g * 3) * 0.58);
  const botY = g * 2 + topH;
  const botH = H - g - botY;
  const halfW = Math.floor((W - g * 3) / 2);
  return [
    { x: g, y: g, w: W - g * 2, h: topH },
    { x: g, y: botY, w: halfW, h: botH },
    { x: g * 2 + halfW, y: botY, w: W - g - (g * 2 + halfW), h: botH },
  ];
}

// Full bleed: a single frame edge to edge — the photo is the poster.
function layoutFullBleed(W, H, g) {
  return [{ x: g, y: g, w: W - g * 2, h: H - g * 2 }];
}

// The layout book: key, display label and rectangle maker for each of five.
const LAYOUT_BOOK = {
  spotlight: { label: 'Spotlight (hero + trio)', rects: layoutSpotlight },
  quad: { label: 'Quad grid', rects: layoutQuad },
  triptych: { label: 'Triptych columns', rects: layoutTriptych },
  billboard: { label: 'Billboard + pair', rects: layoutBillboard },
  fullbleed: { label: 'Full bleed frame', rects: layoutFullBleed },
};

// Panel rectangles for a layout at a canvas size, gutter in pixels.
function panelRectsFor(layoutKey, W, H, gutter) {
  const layout = LAYOUT_BOOK[layoutKey] || LAYOUT_BOOK.spotlight;
  return layout.rects(W, H, gutter);
}

// Draw one panel: clip to its rectangle, cover-fit its photo (or a painted
// scene when the panel has no photo), grade it, then frame it.
function drawPanel(ctx, rect, panel, photos, st, panelIndex) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const photo = photos[panel.photo];
  if (photo && photo.img) {
    const src = coverSourceRect(photo.img.naturalWidth, photo.img.naturalHeight, rect.w, rect.h, panel.zoom, panel.fx, panel.fy);
    ctx.drawImage(photo.img, src.sx, src.sy, src.sw, src.sh, rect.x, rect.y, rect.w, rect.h);
  } else {
    // No photo yet: stand in with a painted scene, alternating by panel.
    const kind = panelIndex % 2 === 0 ? 'boulevard' : 'neon';
    const scene = paintSceneCanvas(kind, Math.max(2, Math.round(rect.w)), Math.max(2, Math.round(rect.h)), st.seed + panelIndex * 131);
    ctx.drawImage(scene, rect.x, rect.y);
  }
  applyGrade(ctx, rect.x, rect.y, rect.w, rect.h, st.grade, st.gradeStrength);
  // A soft inner shadow along the panel's top edge gives it depth.
  const shade = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h * 0.16);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h * 0.16);
  ctx.restore();
  // The frame: a dark outer line and a pale inner hairline.
  ctx.strokeStyle = 'rgba(4, 2, 12, 0.9)';
  ctx.lineWidth = 3;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.strokeStyle = 'rgba(255, 240, 220, 0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 3.5, rect.y + 3.5, rect.w - 7, rect.h - 7);
}

// Trace a five-pointed star path centred on (cx, cy).
function traceStar(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Letter the cover: top scrim, gradient title, subtitle, heat stars, and a
// caption bar along the bottom edge.
function drawCoverLettering(ctx, W, H, st) {
  const title = (st.title || '').trim();
  const subtitle = (st.subtitle || '').trim();
  const caption = (st.caption || '').trim();

  // Top scrim so the lettering sits on the art without fighting it.
  const scrimH = H * 0.3;
  const scrim = ctx.createLinearGradient(0, 0, 0, scrimH);
  scrim.addColorStop(0, 'rgba(5, 2, 14, 0.78)');
  scrim.addColorStop(1, 'rgba(5, 2, 14, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, scrimH);

  let cursorY = H * 0.045;
  if (title) {
    // Shrink the title until it fits the measure, poster-fashion.
    let fontPx = Math.round(H * 0.115);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const setTitleFont = () => {
      ctx.font = `900 ${fontPx}px "Arial Narrow", "Liberation Sans Narrow", Impact, sans-serif`;
    };
    setTitleFont();
    while (ctx.measureText(title.toUpperCase()).width > W * 0.92 && fontPx > 18) {
      fontPx -= 4;
      setTitleFont();
    }
    const grad = ctx.createLinearGradient(0, cursorY, 0, cursorY + fontPx * 1.15);
    grad.addColorStop(0, '#ffe259');
    grad.addColorStop(0.55, '#ffa751');
    grad.addColorStop(1, '#ff2975');
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = fontPx * 0.16;
    ctx.shadowOffsetY = fontPx * 0.05;
    ctx.lineWidth = Math.max(2, fontPx / 16);
    ctx.strokeStyle = 'rgba(24, 2, 26, 0.92)';
    ctx.strokeText(title.toUpperCase(), W / 2, cursorY);
    ctx.fillStyle = grad;
    ctx.fillText(title.toUpperCase(), W / 2, cursorY);
    ctx.restore();
    cursorY += fontPx * 1.18;
  }
  if (subtitle) {
    ctx.save();
    ctx.font = `italic 600 ${Math.round(H * 0.032)}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#7dd3fc';
    ctx.shadowColor = 'rgba(34, 211, 238, 0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(subtitle, W / 2, cursorY);
    ctx.restore();
    cursorY += H * 0.045;
  }
  // Heat stars under the title block, centred, lit ones gold.
  const starCount = clampNumber(Math.round(st.stars || 0), 0, 5);
  if (starCount > 0 || st.stars > 0) {
    const r = H * 0.016;
    const gap = r * 2.7;
    const startX = W / 2 - gap * 2;
    for (let i = 0; i < 5; i++) {
      traceStar(ctx, startX + i * gap, cursorY + r, r);
      if (i < starCount) {
        ctx.fillStyle = '#ffd319';
        ctx.shadowColor = 'rgba(255, 211, 25, 0.8)';
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // Caption bar: a translucent band with the caption letterspaced across it.
  if (caption) {
    const barH = Math.round(H * 0.075);
    ctx.fillStyle = 'rgba(4, 2, 12, 0.74)';
    ctx.fillRect(0, H - barH, W, barH);
    ctx.fillStyle = '#ff2975';
    ctx.fillRect(0, H - barH, W, Math.max(2, H * 0.004));
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fdf6ec';
    // Letterspacing widens the caption past its raw measure, so shrink the
    // font (and the spacing with it) until the whole line fits the bar —
    // a tall canvas makes a tall bar and a big font that would overflow.
    let capPx = Math.round(barH * 0.42);
    const setCaptionFont = () => {
      ctx.font = `700 ${capPx}px "Arial Narrow", "Liberation Sans Narrow", Impact, sans-serif`;
      try {
        ctx.letterSpacing = `${Math.max(1, Math.round(capPx * 0.33))}px`;
      } catch (err) {
        // Older engines have no letterSpacing; the caption still reads fine.
      }
    };
    setCaptionFont();
    while (ctx.measureText(caption.toUpperCase()).width > W * 0.94 && capPx > 10) {
      capPx -= 2;
      setCaptionFont();
    }
    ctx.fillText(caption.toUpperCase(), W / 2, H - barH / 2 + 1);
    ctx.restore();
  }

  // A tiny maker's mark in the bottom-right corner of the title scrim area.
  ctx.save();
  ctx.font = `600 ${Math.round(H * 0.016)}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('FAN-MADE POSTER', W - W * 0.015, H * 0.012);
  ctx.restore();
}

// Render a full cover for state `st` onto a context sized W x H.
// `photos` is the editor's photo list: [{ img, label }].
function renderCover(ctx, W, H, st, photos) {
  ctx.save();
  ctx.fillStyle = '#0a0616';
  ctx.fillRect(0, 0, W, H);
  const gutter = Math.max(6, Math.round(W * 0.008));
  const rects = panelRectsFor(st.layout, W, H, gutter);
  rects.forEach((rect, i) => {
    const panel = st.panels[i] || { photo: 0, zoom: 1, fx: 0.5, fy: 0.5 };
    drawPanel(ctx, rect, panel, photos, st, i);
  });
  drawCoverLettering(ctx, W, H, st);
  finishCover(ctx, W, H, 0.1);
  ctx.restore();
}

// Render a cover onto a fresh canvas and return the canvas.
function renderCoverCanvas(st, photos, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  renderCover(canvas.getContext('2d'), W, H, st, photos);
  return canvas;
}

// ---------------------------------------------------------------------------
// Part 5 — the editor
//
// A small state object describes the cover; the photo rack beside it holds
// the loaded images (which cannot be snapshotted). Every control on the
// page writes into the state and redraws the stage canvas. Undo snapshots
// the state before each change, sixty deep.
// ---------------------------------------------------------------------------

// The export sizes the studio offers, as [width, height] pairs.
const EXPORT_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

// A fresh cover state with the house defaults.
function makeDefaultState() {
  return {
    layout: 'spotlight',
    grade: 'vice',
    gradeStrength: 0.85,
    title: 'NEON HARBOR',
    subtitle: 'every tide brings trouble',
    caption: 'One last ride along the shore',
    stars: 5,
    seed: 20261120,
    panels: [
      { photo: 0, zoom: 1.05, fx: 0.5, fy: 0.45 },
      { photo: 1, zoom: 1.2, fx: 0.5, fy: 0.5 },
      { photo: 1, zoom: 1.45, fx: 0.4, fy: 0.4 },
      { photo: 0, zoom: 1.3, fx: 0.6, fy: 0.55 },
      { photo: 1, zoom: 1.1, fx: 0.5, fy: 0.5 },
    ],
    selectedPanel: 0,
  };
}

// Create the editor around the page's elements. Returns the studio object
// the page (and PosterLab) drives.
function createStudio() {
  const state = makeDefaultState();
  const photoRack = [];
  const history = [];
  const el = (id) => document.getElementById(id);
  const canvas = el('stageCanvas');
  const ctx = canvas.getContext('2d');

  // --- history -------------------------------------------------------------
  function snapshotState() {
    return JSON.stringify({ ...state, panels: state.panels.map((p) => ({ ...p })) });
  }
  function pushHistory() {
    history.push(snapshotState());
    if (history.length > 60) history.shift();
    refreshUndoButton();
  }
  function undoLast() {
    const prev = history.pop();
    if (!prev) return;
    const restored = JSON.parse(prev);
    Object.assign(state, restored);
    syncControlsFromState();
    drawStage();
    refreshUndoButton();
    setStatus('Undone.');
  }
  function refreshUndoButton() {
    const btn = el('undoBtn');
    if (btn) btn.disabled = history.length === 0;
  }

  // --- status line -----------------------------------------------------------
  function setStatus(message) {
    const line = el('statusLine');
    if (line) line.textContent = message;
  }

  // --- drawing ---------------------------------------------------------------
  function drawStage() {
    renderCover(ctx, canvas.width, canvas.height, state, photoRack);
    // Outline the selected panel so it is clear which one the sliders drive.
    const gutter = Math.max(6, Math.round(canvas.width * 0.008));
    const rects = panelRectsFor(state.layout, canvas.width, canvas.height, gutter);
    const rect = rects[state.selectedPanel];
    if (rect) {
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = Math.max(2, canvas.width * 0.003);
      ctx.setLineDash([14, 9]);
      ctx.strokeRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10);
      ctx.restore();
    }
  }

  // --- photos ------------------------------------------------------------------
  function addPhoto(img, label) {
    photoRack.push({ img, label });
    refreshPanelPhotoOptions();
    drawStage();
  }
  function loadPhotoFromFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      addPhoto(img, file.name);
      setStatus(`Photo added: ${file.name}. Pick it in any panel.`);
    };
    img.onerror = () => setStatus(`Could not read ${file.name} as an image.`);
    img.src = url;
  }
  function loadSamplePhoto(kind) {
    const img = new Image();
    img.onload = () => addPhoto(img, PAINTED_SCENES[kind].label);
    img.onerror = () => setStatus(`Sample ${kind} failed to load.`);
    img.src = `samples/${kind}.jpg`;
    return img;
  }

  // --- control synchronisation -------------------------------------------------
  function refreshPanelPhotoOptions() {
    const select = el('panelPhoto');
    if (!select) return;
    select.innerHTML = '';
    photoRack.forEach((photo, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${i + 1}. ${photo.label}`;
      select.appendChild(opt);
    });
    const panel = state.panels[state.selectedPanel];
    if (panel) select.value = String(clampNumber(panel.photo, 0, Math.max(0, photoRack.length - 1)));
  }
  function syncPanelControls() {
    const panel = state.panels[state.selectedPanel];
    const label = el('panelLabel');
    if (label) label.textContent = `Panel ${state.selectedPanel + 1}`;
    if (!panel) return;
    const zoom = el('panelZoom');
    if (zoom) zoom.value = String(Math.round(panel.zoom * 100));
    refreshPanelPhotoOptions();
  }
  function syncControlsFromState() {
    const set = (id, value) => {
      const node = el(id);
      if (node) node.value = value;
    };
    set('titleText', state.title);
    set('subtitleText', state.subtitle);
    set('captionText', state.caption);
    set('gradeSelect', state.grade);
    set('gradeStrength', String(Math.round(state.gradeStrength * 100)));
    set('starsRange', String(state.stars));
    document.querySelectorAll('.layout-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.layout === state.layout);
    });
    syncPanelControls();
  }

  // --- pointer interaction on the stage -----------------------------------------
  function stagePoint(evt) {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((evt.clientX - box.left) / box.width) * canvas.width,
      y: ((evt.clientY - box.top) / box.height) * canvas.height,
    };
  }
  function panelIndexAt(px, py) {
    const gutter = Math.max(6, Math.round(canvas.width * 0.008));
    const rects = panelRectsFor(state.layout, canvas.width, canvas.height, gutter);
    const found = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
    return { index: Math.max(0, found), rect: rects[Math.max(0, found)] };
  }
  let dragSession = null;
  canvas.addEventListener('pointerdown', (evt) => {
    const pt = stagePoint(evt);
    const { index, rect } = panelIndexAt(pt.x, pt.y);
    state.selectedPanel = index;
    syncPanelControls();
    const panel = state.panels[index];
    dragSession = { x: pt.x, y: pt.y, fx: panel.fx, fy: panel.fy, rect };
    pushHistory();
    canvas.setPointerCapture(evt.pointerId);
    drawStage();
  });
  canvas.addEventListener('pointermove', (evt) => {
    if (!dragSession) return;
    const pt = stagePoint(evt);
    const panel = state.panels[state.selectedPanel];
    // Dragging pulls the photo with the pointer: the focus point walks the
    // other way across the overflow the cover-fit leaves.
    panel.fx = clampNumber(dragSession.fx - (pt.x - dragSession.x) / dragSession.rect.w, 0, 1);
    panel.fy = clampNumber(dragSession.fy - (pt.y - dragSession.y) / dragSession.rect.h, 0, 1);
    drawStage();
  });
  canvas.addEventListener('pointerup', () => {
    dragSession = null;
  });
  canvas.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    const panel = state.panels[state.selectedPanel];
    pushHistory();
    panel.zoom = clampNumber(panel.zoom * (evt.deltaY < 0 ? 1.07 : 0.93), 1, 3);
    syncPanelControls();
    drawStage();
  }, { passive: false });

  // --- wiring the controls -------------------------------------------------------
  function bindControls() {
    const fileInput = el('photoFile');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        for (const file of fileInput.files) loadPhotoFromFile(file);
        fileInput.value = '';
      });
    }
    const stageWrap = el('stageWrap');
    if (stageWrap) {
      stageWrap.addEventListener('dragover', (evt) => {
        evt.preventDefault();
        stageWrap.classList.add('is-dragging');
      });
      stageWrap.addEventListener('dragleave', () => stageWrap.classList.remove('is-dragging'));
      stageWrap.addEventListener('drop', (evt) => {
        evt.preventDefault();
        stageWrap.classList.remove('is-dragging');
        for (const file of evt.dataTransfer.files) loadPhotoFromFile(file);
      });
    }
    document.querySelectorAll('.sample-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.sample;
        const existing = photoRack.findIndex((p) => p.label === PAINTED_SCENES[kind].label);
        if (existing >= 0) {
          state.panels[state.selectedPanel].photo = existing;
          syncPanelControls();
          drawStage();
          setStatus(`${PAINTED_SCENES[kind].label} placed in panel ${state.selectedPanel + 1}.`);
        }
      });
    });
    document.querySelectorAll('.layout-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.layout === btn.dataset.layout) return;
        pushHistory();
        state.layout = btn.dataset.layout;
        state.selectedPanel = 0;
        syncControlsFromState();
        drawStage();
      });
    });
    const gradeSelect = el('gradeSelect');
    if (gradeSelect) {
      gradeSelect.addEventListener('change', () => {
        pushHistory();
        state.grade = gradeSelect.value;
        drawStage();
      });
    }
    const gradeStrength = el('gradeStrength');
    if (gradeStrength) {
      gradeStrength.addEventListener('input', () => {
        state.gradeStrength = Number(gradeStrength.value) / 100;
        drawStage();
      });
      gradeStrength.addEventListener('change', () => pushHistory());
    }
    const bindText = (id, key) => {
      const node = el(id);
      if (!node) return;
      node.addEventListener('input', () => {
        state[key] = node.value;
        drawStage();
      });
      node.addEventListener('change', () => pushHistory());
    };
    bindText('titleText', 'title');
    bindText('subtitleText', 'subtitle');
    bindText('captionText', 'caption');
    const starsRange = el('starsRange');
    if (starsRange) {
      starsRange.addEventListener('input', () => {
        state.stars = Number(starsRange.value);
        const out = el('starsValue');
        if (out) out.textContent = String(state.stars);
        drawStage();
      });
      starsRange.addEventListener('change', () => pushHistory());
    }
    const panelPhoto = el('panelPhoto');
    if (panelPhoto) {
      panelPhoto.addEventListener('change', () => {
        pushHistory();
        state.panels[state.selectedPanel].photo = Number(panelPhoto.value);
        drawStage();
      });
    }
    const panelZoom = el('panelZoom');
    if (panelZoom) {
      panelZoom.addEventListener('input', () => {
        state.panels[state.selectedPanel].zoom = Number(panelZoom.value) / 100;
        drawStage();
      });
      panelZoom.addEventListener('change', () => pushHistory());
    }
    const randomBtn = el('randomBtn');
    if (randomBtn) randomBtn.addEventListener('click', randomizeCover);
    const undoBtn = el('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoLast);
    const exportBtn = el('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportPNG);
    document.querySelectorAll('input[name="exportSize"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const [w, h] = EXPORT_SIZES[radio.value] || EXPORT_SIZES.square;
        canvas.width = w;
        canvas.height = h;
        drawStage();
      });
    });
  }

  // Shuffle layout, grade and panel framings into a fresh mix.
  function randomizeCover() {
    pushHistory();
    const rng = makeSeededRandom((Date.now() % 1000003) + 17);
    state.layout = pickFrom(rng, Object.keys(LAYOUT_BOOK));
    state.grade = pickFrom(rng, Object.keys(GRADE_BOOK));
    state.gradeStrength = rangeFloat(rng, 0.55, 1);
    for (const panel of state.panels) {
      panel.photo = photoRack.length ? rangeInt(rng, 0, photoRack.length - 1) : 0;
      panel.zoom = rangeFloat(rng, 1, 1.7);
      panel.fx = rangeFloat(rng, 0.2, 0.8);
      panel.fy = rangeFloat(rng, 0.2, 0.8);
    }
    state.selectedPanel = 0;
    syncControlsFromState();
    drawStage();
    setStatus('Random mix applied. Undo brings the previous cover back.');
  }

  // Export the current cover at the chosen size as a PNG download.
  function exportPNG() {
    const checked = document.querySelector('input[name="exportSize"]:checked');
    const [w, h] = EXPORT_SIZES[checked ? checked.value : 'square'] || EXPORT_SIZES.square;
    const out = renderCoverCanvas(state, photoRack, w, h);
    out.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `poster-lab-cover-${w}x${h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      setStatus(`Exported a ${w}×${h} PNG cover.`);
    }, 'image/png');
  }

  // The studio's public face, for the page and for PosterLab.
  const studio = {
    state,
    photoRack,
    draw: drawStage,
    setStatus,
    addPhoto,
    selectPanel(index) {
      state.selectedPanel = clampNumber(index, 0, state.panels.length - 1);
      syncPanelControls();
      drawStage();
    },
    setLayout(key) {
      state.layout = key;
      state.selectedPanel = 0;
      syncControlsFromState();
      drawStage();
    },
    setGrade(key, strength) {
      state.grade = key;
      if (typeof strength === 'number') state.gradeStrength = strength;
      syncControlsFromState();
      drawStage();
    },
    setTexts(texts) {
      Object.assign(state, texts);
      syncControlsFromState();
      drawStage();
    },
    setCanvasSize(w, h) {
      canvas.width = w;
      canvas.height = h;
      drawStage();
    },
    coverCanvas(w, h) {
      return renderCoverCanvas(state, photoRack, w, h);
    },
  };

  bindControls();
  syncControlsFromState();
  refreshUndoButton();
  drawStage();
  return studio;
}

// ---------------------------------------------------------------------------
// PosterLab: the small public surface. Sample stills and screenshots are
// produced by driving this same code in a headless browser.
// ---------------------------------------------------------------------------

const posterLabReady = new Promise((resolve) => {
  const publish = (studio) => resolve(studio);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootPosterLab(publish), { once: true });
  } else {
    bootPosterLab(publish);
  }
});

function bootPosterLab(publish) {
  let studio = null;
  if (document.getElementById('stageCanvas')) {
    studio = createStudio();
    // The two painted samples ship as files beside the app; load them as
    // the starter photos so the studio opens with a finished cover.
    const pending = ['boulevard', 'neon'].map(
      (kind) =>
        new Promise((done) => {
          const img = new Image();
          img.onload = () => {
            studio.addPhoto(img, PAINTED_SCENES[kind].label);
            done();
          };
          img.onerror = () => done();
          img.src = `samples/${kind}.jpg`;
        }),
    );
    Promise.all(pending).then(() => {
      studio.draw();
      studio.setStatus('Ready — two painted samples are loaded. Add your own photos, or make the cover yours from here.');
      publish(studio);
    });
  } else {
    publish(null);
  }
}

window.PosterLab = {
  ready: posterLabReady,
  studio: null,
  paintSceneInto(canvas, kind, seed) {
    const ctx = canvas.getContext('2d');
    PAINTED_SCENES[kind].paint(ctx, canvas.width, canvas.height, seed);
    return canvas;
  },
  paintSceneCanvas,
  renderCoverCanvas,
  renderCover,
  makeDefaultState,
  coverSourceRect,
  panelRectsFor,
  applyGrade,
  GRADE_BOOK,
  LAYOUT_BOOK,
  PAINTED_SCENES,
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },
};

// Once the studio is up and its starter photos are in, mirror it here too.
posterLabReady.then((studio) => {
  if (studio) window.PosterLab.studio = studio;
});
