/* Sketch — a tiny hand-drawn drawing kit for <canvas>.
   Wobbly double-stroked lines, marker fills, pencil hatching and a few
   reusable doodles (bee, honey jar, guard, castle…). Shared by the 2D
   doodles and the 3D engine. Also owns the single animation ticker. */
(function (global) {
  'use strict';

  const motionOK = !global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FONT_BODY = '"Shantell Sans", "Chalkboard SE", "Comic Sans MS", cursive';
  const FONT_DISPLAY = '"Caveat Brush", "Marker Felt", "Chalkboard SE", cursive';
  const FONT_CODE = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  const TAU = Math.PI * 2;

  /* ---------- seeded randomness (stable wobble per shape) ---------- */
  function rnd(seed) {
    let t = (seed + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* ---------- palette from CSS tokens ---------- */
  const TOKENS = {
    ink: '--ink', inkSoft: '--ink-soft', paper: '--paper', paper2: '--paper-2', grid: '--grid',
    onMarker: '--on-marker', yellow: '--yellow', pink: '--pink', blue: '--blue', green: '--green',
    orange: '--orange', purple: '--purple', red: '--red', muted: '--muted',
    greenInk: '--green-ink', redInk: '--red-ink'
  };
  const pal = {};
  const rgbCache = new Map();
  const toneCache = new Map();
  function refresh() {
    const cs = getComputedStyle(document.documentElement);
    for (const k in TOKENS) pal[k] = cs.getPropertyValue(TOKENS[k]).trim() || '#000000';
    rgbCache.clear();
    toneCache.clear();
  }
  function col(c) { if (!c) return pal.ink; return pal[c] || c; }
  function rgb(c) {
    c = col(c);
    let v = rgbCache.get(c);
    if (v) return v;
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map(x => x + x).join('');
      v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    } else {
      const m = c.match(/[\d.]+/g) || [0, 0, 0];
      v = [+m[0], +m[1], +m[2]];
    }
    rgbCache.set(c, v);
    return v;
  }
  /* k < 0 darkens toward black, k > 0 lightens toward white */
  function tone(c, k = 0, a = 1) {
    const key = c + '|' + k + '|' + a;
    let s = toneCache.get(key);
    if (s) return s;
    const [r, g, b] = rgb(c);
    const t = k < 0 ? 0 : 255, f = Math.min(1, Math.abs(k));
    const R = Math.round(r + (t - r) * f), G = Math.round(g + (t - g) * f), B = Math.round(b + (t - b) * f);
    s = a >= 1 ? `rgb(${R},${G},${B})` : `rgba(${R},${G},${B},${a})`;
    toneCache.set(key, s);
    return s;
  }

  const S = { motionOK, FONT_BODY, FONT_DISPLAY, FONT_CODE, TAU, rnd, pal, refresh, col, rgb, tone, boil: 0 };
  const bseed = o => (o.seed || 1) + (o.still ? 0 : S.boil * 977);

  /* ---------- primitives ---------- */
  function seg(ctx, x1, y1, x2, y2, seed, rough) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    const r = rough * Math.min(1.3, 0.3 + len / 70);
    const j = k => (rnd(seed * 31 + k) - 0.5) * 2 * r;
    const nx = -dy / len, ny = dx / len;
    const bow = (rnd(seed * 31 + 7) - 0.5) * rough * Math.min(5, len * 0.035);
    const t = 0.4 + rnd(seed * 31 + 8) * 0.2;
    ctx.moveTo(x1 + j(1), y1 + j(2));
    ctx.quadraticCurveTo(x1 + dx * t + nx * bow * 2, y1 + dy * t + ny * bow * 2, x2 + j(3), y2 + j(4));
  }
  function applyStroke(ctx, o) {
    ctx.strokeStyle = col(o.color || o.stroke || 'ink');
    ctx.lineWidth = o.width || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(o.dash || []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function line(ctx, x1, y1, x2, y2, o = {}) {
    const seed = bseed(o), r = o.rough ?? 1;
    ctx.beginPath();
    seg(ctx, x1, y1, x2, y2, seed, r);
    if (o.double !== false) seg(ctx, x1, y1, x2, y2, seed + 101, r);
    applyStroke(ctx, o);
  }
  function tracePoly(ctx, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }
  function hatch(ctx, pts, h) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    ctx.save();
    tracePoly(ctx, pts);
    ctx.clip();
    const ang = h.angle ?? -0.9, gap = h.gap || 6, ca = Math.cos(ang), sa = Math.sin(ang);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
    ctx.beginPath();
    for (let d = -R; d <= R; d += gap) {
      const px = cx - sa * d, py = cy + ca * d;
      ctx.moveTo(px - ca * R, py - sa * R);
      ctx.lineTo(px + ca * R, py + sa * R);
    }
    ctx.globalAlpha = h.alpha ?? 0.5;
    ctx.strokeStyle = col(h.color || 'ink');
    ctx.lineWidth = h.width || 1;
    ctx.stroke();
    ctx.restore();
  }
  function poly(ctx, pts, o = {}) {
    const seed = bseed(o), n = pts.length, rough = o.rough ?? 1;
    if (o.fill) {
      let fp = pts;
      if (o.grow) {
        let cx = 0, cy = 0;
        for (const p of pts) { cx += p[0]; cy += p[1]; }
        cx /= n; cy /= n;
        fp = pts.map(p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * o.grow, p[1] + dy / l * o.grow]; });
      }
      tracePoly(ctx, fp);
      ctx.fillStyle = col(o.fill);
      ctx.fill();
    }
    if (o.hatch) hatch(ctx, pts, o.hatch);
    if (o.stroke !== false && (o.stroke || !o.fill || o.stroke === undefined)) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (o.edges && !o.edges[i]) continue;
        const a = pts[i], b = pts[(i + 1) % n];
        seg(ctx, a[0], a[1], b[0], b[1], seed + i * 7, rough);
        if (o.double !== false) seg(ctx, a[0], a[1], b[0], b[1], seed + i * 7 + 3, rough);
      }
      applyStroke(ctx, { color: o.stroke || 'ink', width: o.width || 2 });
    }
  }
  function rect(ctx, x, y, w, h, o) { poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); }
  function ellipsePts(x, y, rx, ry, seed, rough, over) {
    const start = rnd(seed) * TAU, steps = 18, pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = start + (i / steps) * (TAU + over);
      const k = 1 + (rnd(seed + i + 3) - 0.5) * 0.07 * rough;
      pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
    }
    return pts;
  }
  function smoothPath(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const l = pts[pts.length - 1];
    ctx.lineTo(l[0], l[1]);
  }
  function ellipse(ctx, x, y, rx, ry, o = {}) {
    const seed = bseed(o), rough = o.rough ?? 1;
    if (o.fill) {
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
      ctx.fillStyle = col(o.fill);
      ctx.fill();
    }
    if (o.hatch) {
      const p = [];
      for (let i = 0; i < 20; i++) p.push([x + Math.cos(i / 20 * TAU) * rx, y + Math.sin(i / 20 * TAU) * ry]);
      hatch(ctx, p, o.hatch);
    }
    if (o.stroke !== false) {
      ctx.beginPath();
      smoothPath(ctx, ellipsePts(x, y, rx, ry, seed, rough, 0.3 + rnd(seed + 1) * 0.3));
      if (o.double !== false) smoothPath(ctx, ellipsePts(x, y, rx * 1.01, ry * 0.99, seed + 17, rough, 0.2));
      applyStroke(ctx, { color: o.stroke || 'ink', width: o.width || 2 });
    }
  }
  function circle(ctx, x, y, r, o) { ellipse(ctx, x, y, r, r, o); }
  function curvePts(p0, c, p1, n = 16) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
    }
    return out;
  }
  function polyline(ctx, pts, o = {}) {
    const seed = bseed(o), rough = o.rough ?? 0.6;
    ctx.beginPath();
    if (pts.length > 4) {
      const off = (rnd(seed) - 0.5) * rough * 2;
      smoothPath(ctx, pts.map((p, i) => [p[0] + off * Math.sin(i), p[1] + off * Math.cos(i)]));
    } else {
      for (let i = 0; i < pts.length - 1; i++) seg(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], seed + i * 5, rough);
    }
    applyStroke(ctx, o);
  }
  function arrow(ctx, pts, o = {}) {
    polyline(ctx, pts, o);
    const a = pts[Math.max(0, pts.length - 3)], b = pts[pts.length - 1];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = o.head || 10;
    ctx.beginPath();
    ctx.moveTo(b[0] - hl * Math.cos(ang - 0.5), b[1] - hl * Math.sin(ang - 0.5));
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(b[0] - hl * Math.cos(ang + 0.5), b[1] - hl * Math.sin(ang + 0.5));
    applyStroke(ctx, Object.assign({}, o, { dash: null }));
  }
  function font(size, weight, family) { return `${weight || 600} ${size}px ${family || FONT_BODY}`; }
  function text(ctx, str, x, y, o = {}) {
    ctx.save();
    ctx.font = font(o.size || 16, o.weight, o.font);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.translate(x, y);
    if (o.rotate) ctx.rotate(o.rotate);
    if (o.halo) {
      ctx.lineWidth = o.halo;
      ctx.strokeStyle = col(o.haloColor || 'paper2');
      ctx.lineJoin = 'round';
      ctx.strokeText(str, 0, 0);
    }
    ctx.fillStyle = col(o.color || 'ink');
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }
  /* a sticky-note label */
  function tag(ctx, str, x, y, o = {}) {
    const size = o.size || 14;
    ctx.font = font(size, o.weight || 700, o.font);
    const lines = String(str).split('\n');
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + size * 1.1;
    const h = lines.length * size * 1.2 + size * 0.55;
    ctx.save();
    ctx.translate(o.align === 'left' ? x + w / 2 : o.align === 'right' ? x - w / 2 : x, y);
    ctx.rotate(o.rotate ?? (rnd(o.seed || 3) - 0.5) * 0.09);
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    const themed = o.bg === 'paper2' || o.bg === 'paper' || o.bg === 'muted';
    if (o.shadow !== false) { tracePoly(ctx, pts.map(p => [p[0] + 2.5, p[1] + 2.5])); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill(); }
    poly(ctx, pts, { fill: o.bg || 'yellow', stroke: o.border || (themed ? 'ink' : 'onMarker'), width: o.lw || 1.5, seed: o.seed || 3, rough: 0.6 });
    ctx.fillStyle = col(o.color || (themed ? 'ink' : 'onMarker'));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.2 + 1));
    ctx.restore();
    return { w, h };
  }
  /* speech bubble whose tail points at (x, y) */
  function bubble(ctx, str, x, y, o = {}) {
    const size = o.size || 13;
    ctx.font = font(size, 700, o.font);
    const lines = String(str).split('\n');
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + size * 1.3;
    const h = lines.length * size * 1.2 + size * 0.8;
    const bx = x + (o.dx || 0), by = y - (o.dy ?? 22) - h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bx, by, w / 2 + 6, h / 2 + 4, 0, 0, TAU);
    ctx.fillStyle = col(o.bg || 'paper2');
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx - 8, by + h / 2);
    ctx.lineTo(x, y);
    ctx.lineTo(bx + 6, by + h / 2 + 1);
    ctx.fill();
    ellipse(ctx, bx, by, w / 2 + 6, h / 2 + 4, { width: 1.6, seed: o.seed || 5, stroke: o.border || 'ink' });
    line(ctx, bx - 8, by + h / 2 + 2, x, y, { width: 1.6, seed: 9, double: false, color: o.border || 'ink' });
    line(ctx, x, y, bx + 6, by + h / 2 + 2, { width: 1.6, seed: 10, double: false, color: o.border || 'ink' });
    ctx.fillStyle = col(o.color || 'ink');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, bx, by + (i - (lines.length - 1) / 2) * size * 1.2 + 1));
    ctx.restore();
  }
  function star(ctx, x, y, r, fill, o = {}) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    poly(ctx, pts, { fill, stroke: o.stroke || 'onMarker', width: o.width || 1.2, seed: o.seed || 2, rough: 0.4 });
  }
  function burst(ctx, x, y, r, o = {}) {
    const n = o.spikes || 12, pts = [], seed = bseed(o);
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU + (o.rot || 0);
      const rr = (i % 2 ? r * 0.58 : r) * (0.85 + rnd(seed + i) * 0.3);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    poly(ctx, pts, { fill: o.fill || 'yellow', stroke: o.stroke || 'ink', width: o.width || 2, seed: o.seed || 4 });
    if (o.text) text(ctx, o.text, x, y + 1, { size: o.size || r * 0.42, font: FONT_DISPLAY, weight: 400, color: o.color || 'onMarker', rotate: -0.08 });
  }
  function check(ctx, x, y, s, color, w) {
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y);
    ctx.lineTo(x - 2 * s, y + 6 * s);
    ctx.lineTo(x + 9 * s, y - 8 * s);
    applyStroke(ctx, { color: color || 'greenInk', width: w || 3.2 * s });
  }
  function cross(ctx, x, y, s, color, w) {
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y - 7 * s); ctx.lineTo(x + 7 * s, y + 7 * s);
    ctx.moveTo(x + 7 * s, y - 7 * s); ctx.lineTo(x - 7 * s, y + 7 * s);
    applyStroke(ctx, { color: color || 'redInk', width: w || 3.2 * s });
  }

  /* ---------- characters & props (each drawn around an origin, scaled by s) ---------- */
  function bee(ctx, x, y, s, t, o = {}) {
    const d = pal.onMarker;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.flip ? -s : s, s);
    if (o.tilt) ctx.rotate(o.tilt);
    const flap = motionOK ? Math.abs(Math.sin(t * 28 + (o.phase || 0))) : 0.6;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = d;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [wx, rot] of [[-3, -0.35], [3, 0.25]]) {
      ctx.save();
      ctx.translate(wx, -8);
      ctx.rotate(rot);
      ctx.scale(1, 0.45 + 0.55 * flap);
      ctx.beginPath();
      ctx.ellipse(0, -9, 6.5, 10, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ellipse(ctx, 0, 0, 16, 11, { fill: o.color || 'yellow', stroke: d, width: 2, seed: o.seed || 3 });
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 15.5, 10.5, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = d;
    ctx.fillRect(-8, -12, 4.5, 24);
    ctx.fillRect(-0.5, -12, 4.5, 24);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-15, -2); ctx.lineTo(-21, 0.5); ctx.lineTo(-15, 3); ctx.closePath();
    ctx.fillStyle = d; ctx.fill();
    ctx.beginPath(); ctx.arc(9.5, -3, 3.8, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(10.5, -2.6, 1.9, 0, TAU); ctx.fillStyle = d; ctx.fill();
    ctx.beginPath(); ctx.arc(9.5, 2.2, 3.2, 0.25, Math.PI - 0.7); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -9); ctx.quadraticCurveTo(9, -16, 14, -18);
    ctx.moveTo(4, -10); ctx.quadraticCurveTo(3, -17, 7, -20);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(14, -18, 1.7, 0, TAU); ctx.moveTo(8.7, -20); ctx.arc(7, -20, 1.7, 0, TAU); ctx.fill();
    if (o.sad) { cross(ctx, 0, -26, 0.8, 'redInk', 3); }
    ctx.restore();
  }
  function jar(ctx, x, y, s, level, label, o = {}) {
    const d = pal.onMarker;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const w = 24, h = 26;
    const body = [[-w / 2 + 4, -h], [w / 2 - 4, -h], [w / 2, -h + 6], [w / 2, -4], [w / 2 - 4, 0], [-w / 2 + 4, 0], [-w / 2, -4], [-w / 2, -h + 6]];
    tracePoly(ctx, body);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fill();
    if (level > 0) {
      ctx.save();
      tracePoly(ctx, body);
      ctx.clip();
      const top = -h * Math.min(1, level);
      ctx.fillStyle = '#f5a623';
      ctx.beginPath();
      ctx.moveTo(-w, 2);
      ctx.lineTo(-w, top);
      for (let i = 0; i <= 8; i++) ctx.lineTo(-w / 2 + i * w / 8, top + Math.sin(i * 1.3 + (o.t || 0) * 3) * 1.2);
      ctx.lineTo(w, top);
      ctx.lineTo(w, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    poly(ctx, body, { stroke: o.stroke || 'ink', width: 1.8, seed: o.seed || 9 });
    poly(ctx, [[-w / 2 + 2, -h - 6], [w / 2 - 2, -h - 6], [w / 2 - 2, -h + 1], [-w / 2 + 2, -h + 1]], { fill: 'red', stroke: o.stroke || 'ink', width: 1.6, seed: (o.seed || 9) + 4 });
    if (label) {
      tracePoly(ctx, [[-10, -18], [10, -18], [10, -9], [-10, -9]]);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = d; ctx.lineWidth = 0.8; ctx.stroke();
      text(ctx, label, 0, -13.3, { size: 6.5, color: d, weight: 700 });
    }
    ctx.restore();
  }
  function guard(ctx, x, y, s, t, o = {}) {
    const d = pal.onMarker;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.flip ? -s : s, s);
    const bob = motionOK ? Math.sin(t * 3) * 0.8 : 0;
    const scan = o.scan && motionOK ? Math.sin(t * 9) * 3 : 0;
    rect(ctx, -8, -15, 6, 15, { fill: d, stroke: false });
    rect(ctx, 2, -15, 6, 15, { fill: d, stroke: false });
    poly(ctx, [[-11, -37 + bob], [11, -37 + bob], [12.5, -13], [-12.5, -13]], { fill: 'blue', stroke: o.stroke || 'ink', width: 1.8, seed: 21 });
    star(ctx, -5, -29 + bob, 3.4, 'yellow', { seed: 5 });
    circle(ctx, 0, -46 + bob, 9.5, { fill: '#ffd8b5', stroke: o.stroke || 'ink', width: 1.8, seed: 22 });
    poly(ctx, [[-10.5, -51 + bob], [10.5, -51 + bob], [8, -60 + bob], [-8, -60 + bob]], { fill: 'blue', stroke: o.stroke || 'ink', width: 1.6, seed: 23 });
    ctx.beginPath(); ctx.moveTo(-11, -51 + bob); ctx.lineTo(14, -50 + bob); ctx.strokeStyle = d; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.fillStyle = d;
    ctx.beginPath(); ctx.arc(-3.5, -46 + bob, 1.4, 0, TAU); ctx.arc(3.8, -46 + bob, 1.4, 0, TAU); ctx.fill();
    ctx.beginPath();
    if (o.mood === 'no') ctx.arc(0, -38 + bob, 3.5, Math.PI + 0.5, -0.5);
    else if (o.mood === 'ok') ctx.arc(0, -43 + bob, 4, 0.3, Math.PI - 0.3);
    else { ctx.moveTo(-3, -40.5 + bob); ctx.lineTo(3, -40.5 + bob); }
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -30 + bob); ctx.lineTo(16 + scan * 0.5, -37 + bob); ctx.lineWidth = 3; ctx.stroke();
    circle(ctx, 20 + scan, -42 + bob, 6.5, { fill: 'rgba(190,230,255,0.65)', stroke: d, width: 2.2, seed: 24 });
    ctx.restore();
  }
  function castle(ctx, x, y, s, o = {}) {
    const st = o.stroke || 'ink', c = o.color || 'orange', roof = o.roof || 'red';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (o.tilt) ctx.rotate(o.tilt);
    for (const tx of [-58, 58]) {
      rect(ctx, tx - 13, -78, 26, 78, { fill: tone(c, -0.1), stroke: st, width: 2, seed: 30 + tx });
      poly(ctx, [[tx - 17, -78], [tx + 17, -78], [tx, -106]], { fill: roof, stroke: st, width: 2, seed: 31 + tx });
      line(ctx, tx, -106, tx, -122, { color: st, width: 1.6, double: false });
      poly(ctx, [[tx, -122], [tx + 13, -117.5], [tx, -113]], { fill: 'pink', stroke: st, width: 1.2, seed: 33 + tx });
      rect(ctx, tx - 4, -58, 8, 12, { fill: 'onMarker', stroke: false });
    }
    rect(ctx, -45, -60, 90, 60, { fill: c, stroke: st, width: 2.2, seed: 35 });
    for (let i = -45; i < 45; i += 15) rect(ctx, i, -68, 9, 8, { fill: c, stroke: st, width: 1.8, seed: 40 + i });
    poly(ctx, [[-12, 0], [-12, -22], [-8, -30], [0, -33], [8, -30], [12, -22], [12, 0]], { fill: 'onMarker', stroke: st, width: 1.8, seed: 36 });
    if (o.window) rect(ctx, 22, -44, 12, 12, { fill: 'yellow', stroke: st, width: 1.6, seed: 37 });
    if (o.label) text(ctx, o.label, 0, -46, { size: 14, font: FONT_DISPLAY, weight: 400, color: 'onMarker' });
    ctx.restore();
  }
  function house(ctx, x, y, s, color, roof, label) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    rect(ctx, -18, -28, 36, 28, { fill: color, width: 2, seed: 50 });
    poly(ctx, [[-23, -28], [23, -28], [0, -48]], { fill: roof, width: 2, seed: 51 });
    rect(ctx, -5, -14, 10, 14, { fill: 'onMarker', stroke: false });
    rect(ctx, 7, -22, 7, 7, { fill: '#fff', width: 1.2, seed: 52 });
    if (label) text(ctx, label, 0, 11, { size: 11, weight: 700 });
    ctx.restore();
  }
  function cloud(ctx, x, y, s, o = {}) {
    const C = [[-22, 2, 14], [-6, -9, 17], [14, -6, 15], [24, 4, 12], [0, 6, 14]];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    C.forEach((c, i) => circle(ctx, c[0], c[1], c[2], { fill: o.fill || 'paper2', width: 2, seed: 60 + i }));
    C.forEach(c => { ctx.beginPath(); ctx.arc(c[0], c[1], c[2] - 2, 0, TAU); ctx.fillStyle = col(o.fill || 'paper2'); ctx.fill(); });
    if (o.label) text(ctx, o.label, 0, 0, { size: 11, weight: 700 });
    ctx.restore();
  }
  function laptop(ctx, x, y, s, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    poly(ctx, [[-20, -30], [20, -30], [20, -4], [-20, -4]], { fill: 'purple', width: 2, seed: 70 });
    rect(ctx, -16, -26, 32, 18, { fill: '#fff', stroke: false });
    if (o.bars) {
      const n = o.bars.length, mx = Math.max(1, ...o.bars);
      o.bars.forEach((v, i) => {
        const bh = 14 * v / mx;
        rect(ctx, -13 + i * (26 / n), -10 - bh, 26 / n - 2, bh, { fill: ['blue', 'green', 'orange', 'pink'][i % 4], stroke: false });
      });
    } else {
      ['pink', 'blue', 'green', 'orange'].forEach((c, i) => { ctx.fillStyle = col(c); ctx.fillRect(-13 + (i % 2) * 4, -23 + i * 4, 14 + (i * 7) % 11, 2.2); });
    }
    poly(ctx, [[-25, -4], [25, -4], [28, 2], [-28, 2]], { fill: 'muted', width: 2, seed: 71 });
    if (o.label) text(ctx, o.label, 0, 14, { size: 11, weight: 700 });
    ctx.restore();
  }
  function paperSheet(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(-0.08);
    poly(ctx, [[-12, -16], [8, -16], [12, -12], [12, 16], [-12, 16]], { fill: '#fff', width: 1.8, seed: 80 });
    ['pink', 'blue', 'blue', 'green', 'orange'].forEach((c, i) => { ctx.fillStyle = col(c); ctx.fillRect(-8 + (i % 2) * 3, -10 + i * 5, 10 + (i * 5) % 8, 2); });
    ctx.restore();
  }
  function byteCube(ctx, x, y, s, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const c = o.color || 'purple';
    poly(ctx, [[-12, -6], [0, -12], [12, -6], [0, 0]], { fill: tone(c, 0.25), width: 1.8, seed: 90 });
    poly(ctx, [[-12, -6], [0, 0], [0, 14], [-12, 8]], { fill: c, width: 1.8, seed: 91 });
    poly(ctx, [[0, 0], [12, -6], [12, 8], [0, 14]], { fill: tone(c, -0.25), width: 1.8, seed: 92 });
    text(ctx, '01', -6, 4, { size: 6.5, color: 'onMarker', weight: 700, font: FONT_CODE });
    text(ctx, '10', 6, 4, { size: 6.5, color: '#fff', weight: 700, font: FONT_CODE });
    if (o.stamped) check(ctx, 10, -12, 0.75, 'greenInk', 3);
    ctx.restore();
  }
  function gear(ctx, x, y, r, t, color, o = {}) {
    const n = o.teeth || 8, pts = [];
    for (let i = 0; i < n * 4; i++) {
      const a = (i / (n * 4)) * TAU + t, k = i % 4;
      const rr = k === 1 || k === 2 ? r : r * 0.74;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    poly(ctx, pts, { fill: color || 'yellow', width: o.width || 1.6, seed: o.seed || 95, rough: 0.4 });
    circle(ctx, x, y, r * 0.28, { fill: 'paper2', width: 1.4, seed: 96 });
  }
  function flag(ctx, x, y, s, t, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    line(ctx, 0, 0, 0, -26, { width: 1.8, double: false, seed: 97 });
    const w = motionOK ? Math.sin(t * 5) * 2 : 0;
    poly(ctx, [[0, -26], [16, -22 + w], [0, -16]], { fill: color || 'pink', width: 1.4, seed: 98 });
    ctx.restore();
  }
  function bolt(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    poly(ctx, [[2, -16], [-8, 2], [-1, 2], [-4, 16], [8, -3], [1, -3], [5, -16]], { fill: color || 'yellow', width: 1.8, seed: 99 });
    ctx.restore();
  }
  function hookIcon(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(0, 4);
    ctx.arc(-5, 4, 5, 0, Math.PI, false);
    ctx.lineTo(-10, 0);
    applyStroke(ctx, { width: 2.6 });
    ctx.restore();
  }
  function miniChart(ctx, x, y, s, counts, labels) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    poly(ctx, [[-30, -20], [30, -20], [30, 20], [-30, 20]], { fill: '#fff', stroke: 'onMarker', width: 1.4, seed: 101, rough: 0.5 });
    const mx = Math.max(4, ...counts), cols = ['blue', 'green', 'purple', 'pink'];
    counts.forEach((v, i) => {
      const bh = 26 * v / mx;
      rect(ctx, -24 + i * 13, 12 - bh, 9, bh, { fill: cols[i % 4], stroke: 'onMarker', width: 1, seed: 102 + i, rough: 0.3 });
      if (labels) text(ctx, labels[i], -19.5 + i * 13, 16, { size: 4.6, color: 'onMarker', weight: 700 });
    });
    ctx.restore();
  }
  function snail(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const sq = motionOK ? Math.sin(t * 3) * 1.5 : 0;
    poly(ctx, [[-22, 0], [18 + sq, 0], [24 + sq, -8], [16 + sq, -12], [-16, -5]], { fill: 'green', width: 1.8, seed: 110 });
    line(ctx, 18 + sq, -10, 20 + sq, -22, { width: 1.5, double: false });
    line(ctx, 22 + sq, -9, 27 + sq, -20, { width: 1.5, double: false });
    circle(ctx, 20 + sq, -23, 2, { fill: 'onMarker', stroke: false });
    circle(ctx, 27 + sq, -21, 2, { fill: 'onMarker', stroke: false });
    circle(ctx, -4, -16, 14, { fill: 'orange', width: 2, seed: 111 });
    ctx.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.2) { const r = 1 + a * 1.75; const px = -4 + Math.cos(a) * r, py = -16 + Math.sin(a) * r; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    applyStroke(ctx, { width: 1.4, color: 'onMarker' });
    ctx.restore();
  }
  function car(ctx, x, y, s, t, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (o.tilt) ctx.rotate(o.tilt);
    poly(ctx, [[-26, -8], [-22, -18], [8, -18], [16, -10], [28, -8], [28, 2], [-26, 2]], { fill: 'purple', width: 2, seed: 120 });
    rect(ctx, -16, -16, 9, 6, { fill: '#fff', width: 1, seed: 121 });
    rect(ctx, -4, -16, 9, 6, { fill: '#fff', width: 1, seed: 122 });
    for (const wx of [-15, 17]) {
      circle(ctx, wx, 3, 6, { fill: 'onMarker', stroke: false });
      const a = t * 12;
      ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 4, 3 + Math.sin(a) * 4); ctx.lineTo(wx - Math.cos(a) * 4, 3 - Math.sin(a) * 4);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    if (o.label) text(ctx, o.label, 0, -4, { size: 8, color: 'onMarker', weight: 700 });
    ctx.restore();
  }
  function icon(ctx, kind, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (kind === 'screen') {
      rect(ctx, -17, -13, 34, 22, { fill: 'blue', width: 2, seed: 130 });
      rect(ctx, -13, -9, 26, 14, { fill: '#fff', stroke: false });
      line(ctx, 0, 9, 0, 15, { width: 2, double: false }); line(ctx, -8, 15, 8, 15, { width: 2, double: false });
    } else if (kind === 'globe') {
      circle(ctx, 0, 0, 14, { fill: 'green', width: 2, seed: 131 });
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 14, 0, 0, TAU); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); applyStroke(ctx, { width: 1.3, color: 'onMarker' });
    } else if (kind === 'folder') {
      poly(ctx, [[-16, -10], [-5, -10], [-2, -6], [16, -6], [16, 12], [-16, 12]], { fill: 'yellow', width: 2, seed: 132 });
    } else if (kind === 'chip') {
      for (let i = -1; i <= 1; i++) { line(ctx, i * 6, -16, i * 6, 16, { width: 2, double: false, seed: 133 + i }); line(ctx, -16, i * 6, 16, i * 6, { width: 2, double: false, seed: 136 + i }); }
      rect(ctx, -11, -11, 22, 22, { fill: 'pink', width: 2, seed: 139 });
      text(ctx, 'CPU', 0, 1, { size: 7, color: 'onMarker', weight: 700 });
    }
    ctx.restore();
  }

  /* ---------- one ticker for every canvas on the page ---------- */
  const Ticker = {
    items: new Set(),
    io: null,
    running: false,
    add(item, el) {
      this.items.add(item);
      item.visible = false;
      if (!this.io) {
        this.io = new IntersectionObserver(es => es.forEach(e => { const it = e.target.__tick; if (it) it.visible = e.isIntersecting; }), { rootMargin: '120px' });
      }
      el.__tick = item;
      this.io.observe(el);
      if (!this.running) this.start();
    },
    start() {
      this.running = true;
      let last = performance.now();
      const loop = now => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        S.boil = motionOK ? Math.floor(now / 150) % 4 : 0;
        for (const it of this.items) if (it.visible) { try { it.frame(now / 1000, dt); } catch (err) { console.error(err); } }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  };

  /* A 2D doodle canvas drawn in a fixed virtual coordinate box (vw × vh), scaled to fit. */
  class Doodle {
    constructor(canvas, draw, o = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.draw = draw;
      this.vw = o.vw || 300;
      this.vh = o.vh || 200;
      this.state = o.state || {};
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      Ticker.add(this, canvas);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(2, global.devicePixelRatio || 1);
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
    }
    frame(t, dt) {
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      const k = Math.min(this.w / this.vw, this.h / this.vh);
      this.k = k;
      this.ox = (this.w - this.vw * k) / 2;
      this.oy = (this.h - this.vh * k) / 2;
      ctx.translate(this.ox, this.oy);
      ctx.scale(k, k);
      this.draw(ctx, t, dt, this);
    }
  }

  Object.assign(S, {
    seg, line, poly, rect, tracePoly, hatch, ellipse, circle, curvePts, polyline, arrow, text, tag, bubble,
    star, burst, check, cross, bee, jar, guard, castle, house, cloud, laptop, paperSheet, byteCube, gear,
    flag, bolt, hookIcon, miniChart, snail, car, icon, font, Ticker, Doodle
  });
  global.Sketch = S;
})(window);
