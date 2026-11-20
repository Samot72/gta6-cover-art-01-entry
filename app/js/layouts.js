// layouts.js — the ten cover compositions of Vice Grade Studio.
// A layout is not a filter: each one is its own piece of composition code —
// panel geometry, backdrop, frames and plates — that the renderer fills
// with treated photographs and the furniture module dresses.

function rect(x, y, w, h, extra = {}) {
  return { x, y, w, h, ...extra };
}

function columns(W, H, fractions, gap) {
  const panels = [];
  let x = 0;
  for (const f of fractions) {
    panels.push(rect(x + gap / 2, gap / 2, W * f - gap, H - gap));
    x += W * f;
  }
  return panels;
}

function rows(W, H, fractions, gap) {
  const panels = [];
  let y = 0;
  for (const f of fractions) {
    panels.push(rect(gap / 2, y + gap / 2, W - gap, H * f - gap));
    y += H * f;
  }
  return panels;
}

export const LAYOUT_ORDER = [
  'hero-grid-6',
  'hero',
  'cast-grid',
  'slash',
  'magazine',
  'split-duo',
  'strip-3',
  'triptych',
  'polaroid',
  'wanted',
];

export const LAYOUTS = {
  'hero-grid-6': {
    id: 'hero-grid-6',
    name: 'Hero Grid — 6 Panels',
    panels(W, H) {
      const g = W * 0.01;
      const bigW = W * 0.56;
      const smallW = (W - bigW) / 2;
      const panels = [rect(g / 2, g / 2, bigW - g, H - g)];
      panels.push(rect(bigW + g / 2, g / 2, W - bigW - g, H * 0.48 - g));
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          panels.push(rect(
            bigW + c * smallW + g / 2,
            H * 0.48 + r * H * 0.26 + g / 2,
            smallW - g,
            H * 0.26 - g,
          ));
        }
      }
      return panels;
    },
  },
  hero: {
    id: 'hero',
    name: 'Single Hero',
    panels(W, H) {
      const g = W * 0.01;
      return [rect(g / 2, g / 2, W - g, H - g)];
    },
  },
  'cast-grid': {
    id: 'cast-grid',
    name: 'Whole Cast — 4 Portraits',
    furniture: { billing: false },
    panels(W, H) {
      const g = W * 0.01;
      const pw = W / 2;
      const ph = H / 2;
      const panels = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          panels.push(rect(c * pw + g / 2, r * ph + g / 2, pw - g, ph - g, { plate: true }));
        }
      }
      return panels;
    },
    post(ctx, W, H, { photos, panelPhotos, grade }) {
      // Name plates: the cast is introduced, one plate per portrait.
      const panels = this.panels(W, H);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      panels.forEach((p, i) => {
        const photo = photos[(panelPhotos[i] || 0) % photos.length];
        const label = (photo ? photo.name.split('—')[0] : 'UNKNOWN').trim().toUpperCase();
        const plateH = p.h * 0.11;
        ctx.fillStyle = 'rgba(5,5,10,0.78)';
        ctx.fillRect(p.x, p.y + p.h - plateH, p.w, plateH);
        ctx.fillStyle = grade.paper;
        ctx.font = `800 ${plateH * 0.52}px "Arial Narrow", "Liberation Sans Narrow", sans-serif`;
        try { ctx.letterSpacing = `${plateH * 0.08}px`; } catch { /* older engines */ }
        ctx.fillText(label, p.x + p.w / 2, p.y + p.h - plateH / 2);
      });
      ctx.restore();
    },
  },
  slash: {
    id: 'slash',
    name: 'Slashed Comic Diagonal',
    panels(W, H) {
      const slant = W * 0.16;
      const third = W / 3;
      const poly = (x0, x1, first, last) => ({
        polygon: [
          [first ? 0 : x0 + slant, 0],
          [last ? W : x1 + slant, 0],
          [last ? W : x1, H],
          [first ? 0 : x0, H],
        ],
        x: x0, y: 0, w: x1 - x0, h: H,
      });
      return [poly(0, third, true, false), poly(third, third * 2, false, false), poly(third * 2, W, false, true)];
    },
  },
  magazine: {
    id: 'magazine',
    name: 'Magazine Masthead',
    panels(W, H) {
      return [rect(0, 0, W, H)];
    },
    pre(ctx, W, H) {
      const band = ctx.createLinearGradient(0, 0, 0, H * 0.3);
      band.addColorStop(0, 'rgba(5,5,12,0.55)');
      band.addColorStop(1, 'rgba(5,5,12,0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, W, H * 0.3);
    },
    post(ctx, W, H, { tagline, callout, grade }) {
      // Cover lines down the left edge, like a newsstand weekly.
      const lines = [callout, tagline, 'PLUS: THE CITY THAT NEVER SLEEPS'].filter(Boolean);
      ctx.save();
      ctx.fillStyle = grade.paper;
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = W * 0.006;
      ctx.textAlign = 'left';
      lines.forEach((line, i) => {
        ctx.font = `800 ${W * 0.026}px "Arial Narrow", "Liberation Sans Narrow", sans-serif`;
        ctx.fillText(line.toUpperCase().slice(0, 34), W * 0.045, H * (0.68 + i * 0.075));
      });
      ctx.restore();
    },
    furniture: { bubble: false, burst: false },
  },
  'split-duo': {
    id: 'split-duo',
    name: 'Split Duo',
    panels(W, H) {
      return columns(W, H, [0.5, 0.5], W * 0.01);
    },
  },
  'strip-3': {
    id: 'strip-3',
    name: 'Three-Panel Strip',
    panels(W, H) {
      return columns(W, H, [1 / 3, 1 / 3, 1 / 3], W * 0.01);
    },
  },
  triptych: {
    id: 'triptych',
    name: 'Triptych Bands',
    panels(W, H) {
      return rows(W, H, [1 / 3, 1 / 3, 1 / 3], W * 0.01);
    },
  },
  polaroid: {
    id: 'polaroid',
    name: 'Polaroid Stack',
    pre(ctx, W, H, { grade }) {
      const grad = ctx.createRadialGradient(W / 2, H * 0.42, W * 0.1, W / 2, H * 0.5, W * 0.85);
      grad.addColorStop(0, '#3a2417');
      grad.addColorStop(1, '#170d06');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = grade.accent;
      ctx.globalAlpha = 0.1;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    },
    panels(W, H) {
      const pw = W * 0.44;
      const ph = H * 0.62;
      return [
        { cx: W * 0.3, cy: H * 0.46, w: pw, h: ph, rotate: -0.1, frame: 'polaroid' },
        { cx: W * 0.56, cy: H * 0.4, w: pw, h: ph, rotate: 0.06, frame: 'polaroid' },
        { cx: W * 0.72, cy: H * 0.52, w: pw, h: ph, rotate: 0.16, frame: 'polaroid' },
      ];
    },
    furniture: { bubble: false },
  },
  wanted: {
    id: 'wanted',
    name: 'Wanted Poster',
    pre(ctx, W, H) {
      const grad = ctx.createRadialGradient(W / 2, H * 0.4, W * 0.1, W / 2, H * 0.5, W * 0.9);
      grad.addColorStop(0, '#e8d5ae');
      grad.addColorStop(1, '#c8a76a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#4a2f16';
      ctx.lineWidth = W * 0.006;
      ctx.strokeRect(W * 0.035, H * 0.035, W * 0.93, H * 0.93);
      ctx.lineWidth = W * 0.002;
      ctx.strokeRect(W * 0.055, H * 0.055, W * 0.89, H * 0.89);
    },
    panels(W, H) {
      return [rect(W * 0.24, H * 0.3, W * 0.52, H * 0.42)];
    },
    post(ctx, W, H, { title, callout }) {
      ctx.save();
      ctx.fillStyle = '#3a2410';
      ctx.textAlign = 'center';
      ctx.font = `900 ${W * 0.035}px "Arial Narrow", "Liberation Sans Narrow", sans-serif`;
      try { ctx.letterSpacing = `${W * 0.01}px`; } catch { /* older engines */ }
      ctx.fillText((title || 'THE UNKNOWN').toUpperCase(), W / 2, H * 0.79);
      ctx.font = `700 ${W * 0.024}px "Liberation Mono", monospace`;
      ctx.fillText((callout || 'REWARD $250,000').toUpperCase(), W / 2, H * 0.845);
      ctx.font = `600 ${W * 0.016}px "Liberation Mono", monospace`;
      ctx.fillText('DEAD OR ALIVE · LEONIDA TERRITORY · BY ORDER OF THE STUDIO', W / 2, H * 0.885);
      ctx.restore();
    },
    furniture: { mastheadText: 'WANTED', bubble: false, burst: false, seal: false, barcode: false, billing: false },
  },
};

export function layoutFor(id) {
  return LAYOUTS[id] || LAYOUTS['hero-grid-6'];
}
