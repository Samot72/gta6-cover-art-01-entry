// renderer.js — composes a finished Vice Grade cover.
// Backdrop, layout, treated photo panels, layout plates, then the printed
// furniture and a final breath of film grain. Pure with respect to state:
// the same state always paints the same cover, at any size, which is what
// makes the three export sizes honest copies of the preview.

import { createRng } from './rng.js';
import { gradeFor, applyGradeToCanvas } from './grades.js';
import { renderWithEngine } from './engines.js';
import { layoutFor } from './layouts.js';
import {
  drawMasthead,
  drawIssueLine,
  drawCalloutBubble,
  drawStarburst,
  drawRatingSeal,
  drawBillingBlock,
  drawBarcode,
} from './furniture.js';

function drawPhotoCover(ctx, photo, width, height) {
  const source = photo.source;
  const sw = source.width || source.naturalWidth;
  const sh = source.height || source.naturalHeight;
  const scale = Math.max(width / sw, height / sh) * (photo.zoom || 1);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (width - dw) / 2 + (photo.panX || 0) * Math.max(0, (dw - width) / 2);
  const dy = (height - dh) / 2 + (photo.panY || 0) * Math.max(0, (dh - height) / 2);
  ctx.drawImage(source, dx, dy, dw, dh);
}

function treatPanel(photo, width, height, engineId, grade) {
  const tmp = document.createElement('canvas');
  tmp.width = Math.max(2, Math.round(width));
  tmp.height = Math.max(2, Math.round(height));
  const tctx = tmp.getContext('2d');
  if (photo) {
    drawPhotoCover(tctx, photo, tmp.width, tmp.height);
  } else {
    const grad = tctx.createLinearGradient(0, 0, tmp.width, tmp.height);
    grad.addColorStop(0, '#2a2a3a');
    grad.addColorStop(1, '#101018');
    tctx.fillStyle = grad;
    tctx.fillRect(0, 0, tmp.width, tmp.height);
  }
  renderWithEngine(tmp, engineId, grade);
  if (engineId === 'ink') {
    // Ink already prints in the grade's paper and ink; just wash its tint.
    tctx.save();
    tctx.globalAlpha = grade.tintAlpha;
    tctx.globalCompositeOperation = 'overlay';
    tctx.fillStyle = grade.tint;
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.restore();
  } else {
    // Keep a generous share of the photograph's own colour: the grade
    // directs the palette, it does not paint over the picture.
    applyGradeToCanvas(tmp, grade, 0.38);
  }
  return tmp;
}

function panelPath(ctx, panel) {
  ctx.beginPath();
  if (panel.polygon) {
    panel.polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
  } else {
    ctx.rect(panel.x, panel.y, panel.w, panel.h);
  }
}

function panelBounds(panel) {
  if (panel.polygon) {
    const xs = panel.polygon.map((p) => p[0]);
    const ys = panel.polygon.map((p) => p[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }
  if (panel.cx !== undefined) return { x: panel.cx - panel.w / 2, y: panel.cy - panel.h / 2, w: panel.w, h: panel.h };
  return panel;
}

function drawPanel(ctx, panel, photo, engineId, grade, coverWidth) {
  const bounds = panelBounds(panel);
  const treated = treatPanel(photo, bounds.w, bounds.h, engineId, grade);
  ctx.save();
  if (panel.rotate) {
    ctx.translate(panel.cx, panel.cy);
    ctx.rotate(panel.rotate);
    if (panel.frame === 'polaroid') {
      const fw = panel.w * 0.055;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = coverWidth * 0.02;
      ctx.fillStyle = '#f7f3ea';
      ctx.fillRect(-panel.w / 2 - fw, -panel.h / 2 - fw, panel.w + fw * 2, panel.h + fw * 2 + panel.h * 0.16);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.rect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
    ctx.clip();
    ctx.drawImage(treated, -panel.w / 2, -panel.h / 2, panel.w, panel.h);
    ctx.restore();
    return;
  }
  panelPath(ctx, panel);
  ctx.save();
  ctx.clip();
  ctx.drawImage(treated, bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();
  ctx.save();
  panelPath(ctx, panel);
  ctx.lineWidth = Math.max(2, coverWidth * 0.004);
  ctx.strokeStyle = 'rgba(6,6,12,0.92)';
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

let grainPattern = null;
function filmGrain(ctx, width, height, seedText) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 180;
    tile.height = 180;
    const tctx = tile.getContext('2d');
    const rng = createRng('vice-grade-grain');
    const image = tctx.createImageData(180, 180);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.round(rng.range(0, 255));
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    tctx.putImageData(image, 0, 0);
    grainPattern = tile;
  }
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(grainPattern, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function composeCover(canvas, state) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = gradeFor(state.gradeId);
  const layout = layoutFor(state.layoutId);
  const furniture = layout.furniture || {};
  const view = {
    photos: state.photos,
    panelPhotos: state.panelPhotos,
    grade,
    title: state.title,
    tagline: state.tagline,
    callout: state.callout,
  };

  // Backdrop: the grade's dark, warmed by a soft diagonal light.
  const backdrop = ctx.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, grade.backdrop);
  backdrop.addColorStop(1, '#05050a');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  layout.pre?.(ctx, width, height, view);

  const panels = layout.panels(width, height);
  panels.forEach((panel, i) => {
    const photo = state.photos.length
      ? state.photos[(state.panelPhotos[i] || 0) % state.photos.length]
      : null;
    const panelGrade = state.varyGrades && state.panelGrades[i]
      ? gradeFor(state.panelGrades[i])
      : grade;
    drawPanel(ctx, panel, photo, state.engineId, panelGrade, width);
    if (state.showPanelNumbers) {
      // Editor-only affordance, never on exports: the renderer is told.
    }
  });

  layout.post?.(ctx, width, height, view);

  // Furniture, in print order: issue line, masthead, shouts, seal, codes.
  if (furniture.issue !== false && layout.id !== 'wanted') {
    drawIssueLine(ctx, width, { issue: state.issue, grade, y: height * 0.028 });
  }
  if (furniture.masthead !== false) {
    const isWanted = layout.id === 'wanted';
    const mastGrade = isWanted
      ? { ...grade, paper: '#4a2f16', accent: '#4a2f16', ink: '#4a2f16' }
      : grade;
    drawMasthead(ctx, width, {
      title: furniture.mastheadText || state.title,
      tagline: isWanted ? '' : state.tagline,
      grade: mastGrade,
      y: isWanted ? height * 0.09 : height * 0.045,
      scale: layout.id === 'magazine' ? 1.12 : isWanted ? 1.3 : 1,
    });
  }
  if (furniture.burst !== false && state.burst) {
    drawStarburst(ctx, {
      x: width * 0.115,
      y: height * 0.235,
      radius: width * 0.082,
      text: state.burst,
      grade,
    });
  }
  if (furniture.bubble !== false && state.callout && layout.id !== 'wanted') {
    drawCalloutBubble(ctx, {
      x: width * 0.815,
      y: height * 0.35,
      width: width * 0.27,
      text: state.callout,
      grade,
    });
  }
  if (furniture.seal !== false && state.showSeal) {
    drawRatingSeal(ctx, { x: width * 0.068, y: height * 0.9, radius: width * 0.05, grade });
  }
  if (furniture.barcode !== false && state.showBarcode) {
    const bw = width * 0.125;
    const bh = bw * 0.52;
    drawBarcode(ctx, {
      x: width - bw - width * 0.028,
      y: height - bh - width * 0.028,
      width: bw,
      height: bh,
      seedText: state.title + state.layoutId,
      grade,
    });
  }
  if (furniture.billing !== false && state.showBilling) {
    drawBillingBlock(ctx, width, height, { title: state.title, grade });
  }

  filmGrain(ctx, width, height, state.title);
  return canvas;
}

export function panelRectsFor(state, width, height) {
  return layoutFor(state.layoutId).panels(width, height).map(panelBounds);
}
