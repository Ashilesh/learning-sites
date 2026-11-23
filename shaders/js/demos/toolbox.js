/* LEVEL 07 — GLSL toolbox: function curves → pixel strips, swizzle machine */
(function () {
  'use strict';
  const { $, $$, clamp } = SL;
  const fract = (x) => x - Math.floor(x), smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const COLS = ['#ff3d9a', '#22e4ff', '#ffd23f', '#7cff6b', '#9b5cff', '#ff8a3d'];
  const FNS = [
    { sig: 'sin(x * f + time)', desc: 'endless smooth waves', use: 'ripples, pulsing, stripes', yr: [-1.2, 1.2], P: [['f', 1, 30, 12, 0.5]], f: (x, p, t) => Math.sin(x * p.f + t * 2), g: (y) => 0.5 + 0.5 * y },
    { sig: 'fract(x * n)', desc: 'keeps only the part after the dot', use: 'repeat / tile anything', yr: [-0.2, 1.2], P: [['n', 1, 10, 4, 1]], f: (x, p) => fract(x * p.n) },
    { sig: 'step(edge, x)', desc: '0 before the edge, 1 after', use: 'hard cut-offs, masks', yr: [-0.2, 1.2], P: [['edge', 0, 1, 0.5, 0.01]], f: (x, p) => (x >= p.edge ? 1 : 0) },
    { sig: 'smoothstep(e0, e1, x)', desc: 'a smooth S-curve from 0 to 1', use: 'soft edges, fades, anti-aliasing', yr: [-0.2, 1.2], P: [['e0', 0, 1, 0.3, 0.01], ['e1', 0, 1, 0.7, 0.01]], f: (x, p) => smooth(p.e0, p.e1, x) },
    { sig: 'mix(a, b, x)', desc: 'blend from a to b', use: 'colour gradients, lerping', yr: [-0.2, 1.2], P: [['a', 0, 1, 0.1, 0.01], ['b', 0, 1, 0.9, 0.01]], f: (x, p) => p.a + (p.b - p.a) * x, mixStrip: true },
    { sig: 'abs(x * 2.0 - 1.0)', desc: 'folds negatives up', use: 'mirror, V-shapes, symmetry', yr: [-1.2, 1.2], P: [], f: (x) => Math.abs(x * 2 - 1), raw: (x) => x * 2 - 1 },
    { sig: 'clamp(x, lo, hi)', desc: 'locks x between two walls', use: 'keep colours in range', yr: [-0.2, 1.2], P: [['lo', 0, 1, 0.25, 0.01], ['hi', 0, 1, 0.75, 0.01]], f: (x, p) => clamp(x, p.lo, p.hi) },
    { sig: 'pow(x, k)', desc: 'bends a 0→1 ramp', use: 'contrast, falloff, highlights', yr: [-0.2, 1.2], P: [['k', 0.1, 6, 2.5, 0.1]], f: (x, p) => Math.pow(x, p.k) },
    { sig: 'floor(x * n) / n', desc: 'chops into stairs', use: 'posterise, pixelate, tile ids', yr: [-0.2, 1.2], P: [['n', 2, 12, 5, 1]], f: (x, p) => Math.floor(x * p.n) / p.n },
    { sig: 'mod(x * 3.0, m)', desc: 'repeats every m', use: 'like fract but any period', yr: [-0.2, 3.2], P: [['m', 0.2, 3, 1, 0.05]], f: (x, p) => ((x * 3) % p.m + p.m) % p.m, g: (y, p) => y / p.m },
    { sig: 'length(uv - 0.5)', desc: 'distance to a point (2D)', use: 'circles, rings, glows', P: [['rings', 0, 20, 0, 1]], two: (u, v, p) => { const d = Math.hypot(u - 0.5, v - 0.5); return p.rings > 0 ? 0.5 + 0.5 * Math.sin(d * p.rings * 6.283) : d * 1.4; } },
    { sig: 'dot(normalize(uv-0.5), L)', desc: 'how much two directions agree (2D)', use: 'lighting! (see level 8)', P: [['angle', 0, 6.28, 0.8, 0.01]], two: (u, v, p) => { const x = u - 0.5, y = v - 0.5, l = Math.hypot(x, y) || 1; return Math.max(0, (x / l) * Math.cos(p.angle) + (y / l) * Math.sin(p.angle)); } },
  ];
  const grid = $('#fn-grid');
  grid.innerHTML = FNS.map((F, i) => `<div class="fn-card" style="--c:${COLS[i % COLS.length]}">
    <div class="fn-head"><code>${F.sig}</code><p>${F.desc}</p></div>
    <canvas class="plot"></canvas>${F.two ? '' : '<canvas class="strip"></canvas>'}
    <div class="fn-ctrls">${F.P.map(([k, a, b, v, s]) => `<label class="ctl">${k} <input type="range" min="${a}" max="${b}" step="${s}" value="${v}" data-k="${k}"><output></output></label>`).join('')}<span class="use">↳ ${F.use}</span></div></div>`).join('');

  $$('.fn-card', grid).forEach((card, i) => {
    const F = FNS[i], col = COLS[i % COLS.length], rgb = SL.hexToRgb(col).map((v) => v * 255);
    const p = {};
    let dirty = true;
    const plot = SL.canvas2d($('canvas.plot', card), () => { dirty = true; }), strip = F.two ? null : SL.canvas2d($('canvas.strip', card), () => { dirty = true; });
    $$('input', card).forEach((inp) => SL.slider(inp, (v) => { p[inp.dataset.k] = v; dirty = true; }, (v) => (Number.isInteger(+inp.step) ? v : v.toFixed(2))));
    card.addEventListener('pointerenter', () => SL.xp.award('fn-' + i, 4, null), { once: true });
    let img = null;
    SL.animateWhileVisible(card, (t) => {
      if (!dirty && !F.sig.includes('time')) return; dirty = false;
      const W = plot.W, H = plot.H;
      plot.clearRect(0, 0, W, H); plot.fillStyle = '#0b0717'; plot.fillRect(0, 0, W, H);
      if (F.two) {
        // 2D heat-map
        const n = 90; if (!img) img = plot.createImageData(n, n);
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const v = clamp(F.two((x + 0.5) / n, 1 - (y + 0.5) / n, p), 0, 1), k = (y * n + x) * 4;
          img.data[k] = rgb[0] * v + 10 * (1 - v); img.data[k + 1] = rgb[1] * v + 6 * (1 - v); img.data[k + 2] = rgb[2] * v + 20 * (1 - v); img.data[k + 3] = 255;
        }
        const tmp = card.__tmp || (card.__tmp = document.createElement('canvas')); tmp.width = n; tmp.height = n; tmp.getContext('2d').putImageData(img, 0, 0);
        plot.imageSmoothingEnabled = true; const s = Math.min(W, H) - 16; plot.drawImage(tmp, (W - s) / 2, 8, s, s);
        if (F.sig.startsWith('dot')) { const cx = W / 2, cy = 8 + s / 2; plot.strokeStyle = '#fff'; plot.lineWidth = 2; plot.beginPath(); plot.moveTo(cx, cy); plot.lineTo(cx + Math.cos(p.angle) * s * 0.4, cy - Math.sin(p.angle) * s * 0.4); plot.stroke(); plot.fillStyle = '#fff'; plot.font = '600 12px Space Grotesk'; plot.fillText('L', cx + Math.cos(p.angle) * s * 0.46 - 3, cy - Math.sin(p.angle) * s * 0.46 + 4); }
        return;
      }
      const [y0, y1] = F.yr, pad = 10, X = (x) => pad + x * (W - 2 * pad), Y = (y) => H - pad - (y - y0) / (y1 - y0) * (H - 2 * pad);
      // grid & axes
      plot.strokeStyle = 'rgba(255,255,255,0.07)'; plot.lineWidth = 1;
      for (let k = 0; k <= 4; k++) { plot.beginPath(); plot.moveTo(X(k / 4), pad); plot.lineTo(X(k / 4), H - pad); plot.stroke(); }
      plot.strokeStyle = 'rgba(255,255,255,0.25)';
      [0, 1].forEach((yy) => { if (yy >= y0 && yy <= y1) { plot.beginPath(); plot.moveTo(pad, Y(yy)); plot.lineTo(W - pad, Y(yy)); plot.stroke(); } });
      plot.fillStyle = 'rgba(255,255,255,0.4)'; plot.font = '10px JetBrains Mono'; plot.fillText('1', 2, Y(1) + 3); plot.fillText('0', 2, Y(0) + 3); plot.fillText('x →', W - 30, H - 1);
      if (F.raw) { plot.setLineDash([4, 4]); plot.strokeStyle = 'rgba(255,255,255,0.3)'; plot.beginPath(); for (let k = 0; k <= 100; k++) { const x = k / 100; k ? plot.lineTo(X(x), Y(F.raw(x))) : plot.moveTo(X(x), Y(F.raw(x))); } plot.stroke(); plot.setLineDash([]); }
      // curve (sampled densely; vertical jumps drawn as-is)
      plot.strokeStyle = col; plot.lineWidth = 2.5; plot.shadowColor = col; plot.shadowBlur = 10; plot.beginPath();
      const N = 300; for (let k = 0; k <= N; k++) { const x = k / N, y = F.f(x, p, t); k ? plot.lineTo(X(x), Y(y)) : plot.moveTo(X(x), Y(y)); }
      plot.stroke(); plot.shadowBlur = 0;
      // pixel strip
      const SW = strip.W, SH = strip.H, cols = 64;
      for (let k = 0; k < cols; k++) {
        const x = (k + 0.5) / cols, y = F.f(x, p, t), v = clamp(F.g ? F.g(y, p) : y, 0, 1);
        if (F.mixStrip) { const a = [255, 61, 154], b = [34, 228, 255], c = a.map((q, j) => Math.round(q + (b[j] - q) * v)); strip.fillStyle = `rgb(${c})`; }
        else strip.fillStyle = `rgb(${Math.round(rgb[0] * v)},${Math.round(rgb[1] * v)},${Math.round(rgb[2] * v)})`;
        strip.fillRect(k * SW / cols, 0, SW / cols + 0.6, SH);
      }
    });
  });

  /* ---------------- swizzle machine ---------------- */
  const SRC = [0.95, 0.25, 0.55, 1.0], NAMES = ['r', 'g', 'b', 'a'], ALT = ['x', 'y', 'z', 'w'];
  const CELL = ['#ff4d6e', '#4dff8a', '#4d8aff', '#bbbbcc'];
  const cell = (k, delay = 0) => `<div class="swz-cell" style="background:${CELL[k]};color:${CELL[k]};animation-delay:${delay}s"><b style="color:#0a0614">.${NAMES[k]}</b><span style="color:#0a0614">${SRC[k].toFixed(2)}</span></div>`;
  $('#swz-src').innerHTML = [0, 1, 2, 3].map((k) => cell(k)).join('');
  const PRE = ['rgb', 'bgr', 'rrr', 'gbr', 'xy', 'zw', 'bgra', 'xxyy', 'g', 'rbga'];
  $('#swz-btns').innerHTML = PRE.map((s) => `<button data-s="${s}">.${s}</button>`).join('');
  const input = $('#swz-input');
  function run() {
    const s = input.value.trim().toLowerCase();
    const set = /^[rgba]{1,4}$/.test(s) ? NAMES : /^[xyzw]{1,4}$/.test(s) ? ALT : null;
    input.style.borderColor = set ? '' : '#ff4d5e';
    if (!set) { $('#swz-type').textContent = 'invalid: use only rgba OR only xyzw (max 4)'; return; }
    const idx = [...s].map((c) => set.indexOf(c));
    $('#swz-type').textContent = `${idx.length === 1 ? 'float' : 'vec' + idx.length} result = color.${s}`;
    $('#swz-dst').innerHTML = idx.map((k, i) => cell(k, i * 0.07)).join('');
    const v = idx.map((k) => SRC[k]);
    const rgb = idx.length === 1 ? [v[0], v[0], v[0]] : [v[0], v[1], v[2] ?? 0];
    $('#swz-swatch').style.background = `rgb(${rgb.map((c) => Math.round(c * 255))})`;
    SL.xp.award('swz-' + s, 3, null);
  }
  input.addEventListener('input', run);
  $$('#swz-btns button').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.s; run(); }));
  run();
})();
