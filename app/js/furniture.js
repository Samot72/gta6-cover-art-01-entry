// furniture.js — the printed furniture of a Vice Grade cover.
// Masthead, callout bubbles, starbursts, the rating-style seal, the billing
// block, the barcode and the issue line: every mark is drawn here in code,
// in the cover's own grade colours. Nothing is an image; everything is type
// and geometry, so it stays razor sharp at every export size.

import { hashSeedText } from './rng.js';

function condensed(ctx, weight, size) {
  ctx.font = `${weight} ${size}px "Arial Narrow", "Liberation Sans Narrow", "Helvetica Neue Condensed", sans-serif`;
}

// The masthead: the title set huge and tight, gradient-filled, hard outline,
// with the tagline riding underneath in spaced capitals.
export function drawMasthead(ctx, width, { title, tagline, grade, y = 0, scale = 1 }) {
  const size = width * 0.115 * scale;
  ctx.save();
  ctx.translate(width / 2, y);
  ctx.scale(0.84, 1);
  condensed(ctx, 900, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const grad = ctx.createLinearGradient(0, 0, 0, size * 1.05);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, grade.paper);
  grad.addColorStop(1, grade.accent);
  ctx.lineWidth = size * 0.075;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = grade.ink;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(title, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  if (tagline) {
    ctx.save();
    ctx.translate(width / 2, y + size * 1.12);
    condensed(ctx, 700, size * 0.21);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    try { ctx.letterSpacing = `${size * 0.06}px`; } catch { /* older engines */ }
    ctx.fillStyle = grade.paper;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.05;
    ctx.fillText(tagline.toUpperCase(), 0, 0);
    ctx.restore();
  }
  return size * 1.42;
}

// The issue line: city, season and issue number, ruled off with hairlines.
export function drawIssueLine(ctx, width, { issue, grade, y }) {
  ctx.save();
  ctx.fillStyle = grade.paper;
  ctx.strokeStyle = grade.paper;
  ctx.globalAlpha = 0.92;
  condensed(ctx, 700, width * 0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${width * 0.004}px`; } catch { /* older engines */ }
  ctx.fillText(issue.toUpperCase(), width / 2, y);
  const textWidth = ctx.measureText(issue.toUpperCase()).width * 1.15;
  ctx.lineWidth = Math.max(1.5, width * 0.0016);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(width / 2 + side * (textWidth / 2 + width * 0.02), y);
    ctx.lineTo(width / 2 + side * (width * 0.47), y);
    ctx.stroke();
  }
  ctx.restore();
}

// A speech-bubble callout with a tail, the classic cover shout.
export function drawCalloutBubble(ctx, { x, y, width, text, grade, rotate = -0.06 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  condensed(ctx, 800, width * 0.16);
  const lines = wrapText(ctx, text.toUpperCase(), width * 0.84);
  const height = lines.length * width * 0.19 + width * 0.14;
  ctx.fillStyle = grade.paper;
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = width * 0.022;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, width * 0.1);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-width * 0.1, height / 2 - 2);
  ctx.lineTo(-width * 0.02, height / 2 + width * 0.16);
  ctx.lineTo(width * 0.12, height / 2 - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = grade.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * width * 0.19);
  });
  ctx.restore();
}

// A starburst badge for the loudest line on the cover.
export function drawStarburst(ctx, { x, y, radius, text, grade, rotate = 0.18 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.beginPath();
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = grade.accent;
  ctx.fill();
  ctx.lineWidth = radius * 0.045;
  ctx.strokeStyle = grade.ink;
  ctx.stroke();
  condensed(ctx, 900, radius * 0.34);
  ctx.fillStyle = grade.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(ctx, text.toUpperCase(), radius * 1.15);
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * radius * 0.36);
  });
  ctx.restore();
}

// The rating-style seal: our own badge, drawn fresh — a bold age numeral in
// a double ring with the studio's name around the rim.
export function drawRatingSeal(ctx, { x, y, radius, grade }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = grade.paper;
  ctx.fill();
  ctx.lineWidth = radius * 0.07;
  ctx.strokeStyle = grade.ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
  ctx.lineWidth = radius * 0.03;
  ctx.stroke();
  ctx.fillStyle = grade.ink;
  condensed(ctx, 900, radius * 0.95);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('18', 0, radius * 0.05);
  condensed(ctx, 700, radius * 0.17);
  ctx.fillText('VICE GRADE', 0, -radius * 0.58);
  ctx.fillText('ORIGINAL', 0, radius * 0.62);
  ctx.restore();
}

// The billing block: two lines of micro-credits along the bottom edge.
export function drawBillingBlock(ctx, width, height, { title, grade }) {
  ctx.save();
  ctx.fillStyle = grade.paper;
  ctx.globalAlpha = 0.88;
  ctx.textAlign = 'center';
  condensed(ctx, 600, width * 0.0135);
  ctx.fillText(
    `VICE GRADE STUDIO PRESENTS “${title.toUpperCase()}” · A COVER PAINTED IN YOUR BROWSER · PHOTOGRAPHS NEVER LEAVE THIS MACHINE`,
    width / 2,
    height - width * 0.032,
  );
  condensed(ctx, 500, width * 0.011);
  ctx.globalAlpha = 0.66;
  ctx.fillText(
    'ENGINES PAINTERLY AND INK · GRADES NEON VICE · SUNSET HAZE · MIDNIGHT CHROME · GOLDEN PALMS · RAIN NOIR · NO UPLOAD · NO WATERMARK',
    width / 2,
    height - width * 0.014,
  );
  ctx.restore();
}

// A barcode whose bars are hashed from the cover's title: the same cover
// always scans the same, and no two titles share a code.
export function drawBarcode(ctx, { x, y, width, height, seedText, grade }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#111111';
  let hash = hashSeedText(seedText);
  let cx = width * 0.06;
  while (cx < width * 0.9) {
    hash = (Math.imul(hash, 1103515245) + 12345) | 0;
    const barW = ((hash >>> 8) % 3 + 1) * (width * 0.008);
    if ((hash >>> 4) % 2 === 0) ctx.fillRect(cx, height * 0.08, barW, height * 0.68);
    cx += barW + width * 0.008;
  }
  ctx.font = `600 ${height * 0.16}px "Liberation Mono", monospace`;
  ctx.textAlign = 'center';
  const digits = String(hashSeedText(seedText + ':isbn')).padStart(12, '0').slice(0, 12);
  ctx.fillText(`9 78${digits.slice(0, 9)} ${digits.slice(9)}`, width / 2, height * 0.93);
  ctx.restore();
}

export function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}
