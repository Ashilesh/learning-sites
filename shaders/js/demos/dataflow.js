/* LEVEL 05 — animated data-flow diagram: attributes, uniforms, varyings, textures */
(function () {
  'use strict';
  const { $ } = SL;
  const NS = 'http://www.w3.org/2000/svg';
  const host = $('#flow-svg');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1100 560');
  host.appendChild(svg);
  const el = (tag, attrs, parent = svg, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; parent.appendChild(e); return e; };
  const COL = { attr: '#22e4ff', uni: '#ffd23f', vary: '#ff3d9a', tex: '#9b5cff', vs: '#7cff6b', fs: '#ff3d9a' };
  const VCOL = ['#ff3d6e', '#3dff8a', '#3d8aff'];

  const defs = el('defs', {});
  const glow = el('filter', { id: 'fglow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  el('feGaussianBlur', { stdDeviation: '3', result: 'b' }, glow);
  const fm = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, fm); el('feMergeNode', { in: 'SourceGraphic' }, fm);
  const pat = el('pattern', { id: 'checker', width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, defs);
  el('rect', { width: 16, height: 16, fill: '#9b5cff' }, pat); el('rect', { width: 8, height: 8, fill: '#ffd23f' }, pat); el('rect', { x: 8, y: 8, width: 8, height: 8, fill: '#ff3d9a' }, pat);

  const groups = { base: el('g', {}), attr: el('g', {}), uni: el('g', {}), vary: el('g', {}), tex: el('g', {}), packets: el('g', {}) };
  const T = (x, y, s, attrs = {}, parent = groups.base) => el('text', { x, y, fill: '#f1ecff', 'font-size': 14, 'font-weight': 600, ...attrs }, parent, s);

  // ---- panels ----
  el('rect', { x: 14, y: 24, width: 232, height: 512, rx: 20, fill: '#160e2c', stroke: '#22e4ff', 'stroke-opacity': 0.4 }, groups.base);
  T(30, 56, '💻\u00a0\u00a0CPU · your JavaScript', { 'font-size': 16 });
  el('rect', { x: 262, y: 24, width: 824, height: 512, rx: 20, fill: '#120a24', stroke: '#ff3d9a', 'stroke-opacity': 0.35 }, groups.base);
  T(282, 56, '🎮\u00a0\u00a0GPU', { 'font-size': 16 });

  // vertex buffer (attributes)
  const ag = groups.attr;
  el('rect', { x: 32, y: 76, width: 196, height: 150, rx: 12, fill: '#0b0717', stroke: COL.attr }, ag);
  T(46, 100, '📦\u00a0\u00a0vertex buffer', { fill: COL.attr }, ag);
  const rowsY = [128, 160, 192];
  rowsY.forEach((y, i) => { el('circle', { cx: 54, cy: y - 5, r: 8, fill: VCOL[i] }, ag); T(70, y, `v${i}: pos, normal, uv`, { 'font-size': 12.5, 'font-weight': 400, fill: '#d5cdf0', 'font-family': 'JetBrains Mono, monospace' }, ag); });
  // uniforms
  const ug = groups.uni;
  el('rect', { x: 32, y: 246, width: 196, height: 128, rx: 12, fill: '#0b0717', stroke: COL.uni }, ug);
  T(46, 270, '📢\u00a0\u00a0uniforms', { fill: COL.uni }, ug);
  const uTime = T(46, 296, 'u_time  = 0.00', { 'font-size': 12.5, 'font-weight': 400, fill: '#d5cdf0', 'font-family': 'JetBrains Mono, monospace' }, ug);
  T(46, 320, 'u_model = mat4(…)', { 'font-size': 12.5, 'font-weight': 400, fill: '#d5cdf0', 'font-family': 'JetBrains Mono, monospace' }, ug);
  T(46, 344, 'u_light = vec3(…)', { 'font-size': 12.5, 'font-weight': 400, fill: '#d5cdf0', 'font-family': 'JetBrains Mono, monospace' }, ug);
  // texture
  const tg = groups.tex;
  el('rect', { x: 32, y: 394, width: 196, height: 124, rx: 12, fill: '#0b0717', stroke: COL.tex }, tg);
  T(46, 418, '🖼\u00a0\u00a0texture', { fill: COL.tex }, tg);
  el('rect', { x: 50, y: 430, width: 74, height: 74, rx: 6, fill: 'url(#checker)' }, tg);
  T(134, 462, 'an image', { 'font-size': 12, 'font-weight': 400, fill: '#a99cc9' }, tg); T(134, 480, 'in VRAM', { 'font-size': 12, 'font-weight': 400, fill: '#a99cc9' }, tg);

  // vertex shaders
  const vsY = [86, 186, 286];
  vsY.forEach((y, i) => {
    el('rect', { x: 326, y, width: 146, height: 64, rx: 12, fill: '#0f1f12', stroke: COL.vs, 'stroke-width': 1.5 }, groups.base);
    T(340, y + 26, 'vertex shader', { fill: COL.vs, 'font-size': 13.5 });
    T(340, y + 46, `run #${i} · v${i}`, { fill: '#a99cc9', 'font-size': 12, 'font-weight': 400 });
  });
  // rasterizer triangle (barycentric gradient rendered to an image)
  const A = [548, 96], B = [508, 336], Cc = [706, 268];
  const cv = document.createElement('canvas'); cv.width = 220; cv.height = 260;
  const cx = cv.getContext('2d'), img = cx.createImageData(220, 260);
  const ox = 500, oy = 90, rgb = VCOL.map((h) => SL.hexToRgb(h).map((v) => v * 255));
  const edge = (a, b, p) => (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
  const area = edge(A, B, Cc);
  for (let y = 0; y < 260; y++) for (let x = 0; x < 220; x++) {
    const p = [x + ox, y + oy], w0 = edge(B, Cc, p) / area, w1 = edge(Cc, A, p) / area, w2 = edge(A, B, p) / area;
    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
    const i = (y * 220 + x) * 4;
    for (let k = 0; k < 3; k++) img.data[i + k] = w0 * rgb[0][k] + w1 * rgb[1][k] + w2 * rgb[2][k];
    img.data[i + 3] = 235;
  }
  cx.putImageData(img, 0, 0);
  el('image', { href: cv.toDataURL(), x: ox, y: oy, width: 220, height: 260 }, groups.vary);
  el('path', { d: `M${A} L${B} L${Cc} Z`, fill: 'none', stroke: '#fff', 'stroke-width': 1.5 }, groups.vary);
  T(520, 372, 'rasterizer', { fill: '#fff' }); T(520, 390, 'blends (interpolates) varyings', { fill: '#a99cc9', 'font-size': 12, 'font-weight': 400 });
  // fragment shaders
  const fsY = [72, 134, 196, 258, 320, 382];
  fsY.forEach((y, j) => {
    el('rect', { x: 782, y, width: 122, height: 46, rx: 10, fill: '#24091a', stroke: COL.fs, 'stroke-width': 1.5 }, groups.base);
    T(794, y + 20, 'fragment shader', { fill: COL.fs, 'font-size': 12.5 });
    T(794, y + 37, `pixel #${j * 1311 % 9973}`, { fill: '#a99cc9', 'font-size': 11.5, 'font-weight': 400 });
  });
  // framebuffer
  const fbX = 940, fbY = 150, cs = 15, fbCells = [];
  T(940, 138, '🖥\u00a0\u00a0framebuffer', { fill: '#fff' });
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) fbCells.push(el('rect', { x: fbX + i * cs, y: fbY + j * cs, width: cs - 2, height: cs - 2, rx: 2, fill: '#1d1338' }, groups.base));

  // ---- paths ----
  const paths = [];
  const P = (d, cat, color, opts = {}) => {
    const p = el('path', { d, fill: 'none', stroke: color, 'stroke-width': opts.w || 1.6, 'stroke-opacity': 0.5, 'stroke-dasharray': opts.dash || '' }, groups[cat]);
    const o = { p, cat, color, len: p.getTotalLength(), speed: opts.speed || 1, count: opts.count || 3, onArrive: opts.onArrive, colorFn: opts.colorFn };
    paths.push(o); return o;
  };
  rowsY.forEach((y, i) => P(`M228 ${y - 5} C 280 ${y - 5}, 280 ${vsY[i] + 20}, 326 ${vsY[i] + 20}`, 'attr', VCOL[i], { w: 2.2, count: 2 }));
  vsY.forEach((y, i) => P(`M472 ${y + 32} C 500 ${y + 32}, ${[A, B, Cc][i][0] - 30} ${[A, B, Cc][i][1]}, ${[A, B, Cc][i][0]} ${[A, B, Cc][i][1]}`, 'vary', VCOL[i], { w: 2.2, count: 2 }));
  const centroid = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3];
  const randBary = () => { let a = Math.random(), b = Math.random(); if (a + b > 1) { a = 1 - a; b = 1 - b; } const c = 1 - a - b; return [0, 1, 2].map((k) => Math.round(a * rgb[0][k] + b * rgb[1][k] + c * rgb[2][k])); };
  fsY.forEach((y) => P(`M${centroid[0]} ${centroid[1]} C 700 ${centroid[1]}, 720 ${y + 14}, 782 ${y + 14}`, 'vary', '#ff3d9a', { count: 2, colorFn: randBary }));
  fsY.forEach((y, j) => P(`M904 ${y + 23} C 925 ${y + 23}, 920 ${fbY + 60}, ${fbX + 4} ${fbY + 8 + j * 18}`, 'base', '#ffffff', { count: 1, speed: 0.8, colorFn: randBary, onArrive: (c) => { const cell = fbCells[(Math.random() * 64) | 0]; cell.setAttribute('fill', `rgb(${c})`); } }));
  // uniform bus: broadcast to all shaders
  vsY.forEach((y) => P(`M228 300 L298 300 L298 ${y + 52} L326 ${y + 52}`, 'uni', COL.uni, { dash: '5 4', count: 1, speed: 0.9 }));
  P('M298 300 L298 470 L760 470', 'uni', COL.uni, { dash: '5 4', count: 2 });
  fsY.forEach((y) => P(`M298 470 L760 470 L760 ${y + 36} L782 ${y + 36}`, 'uni', COL.uni, { dash: '5 4', count: 1, speed: 0.7 }));
  T(312, 462, 'uniforms → broadcast to every shader run', { fill: COL.uni, 'font-size': 12, 'font-weight': 500 }, groups.uni);
  // textures: sampled by fragment shaders
  fsY.forEach((y) => P(`M228 470 L250 470 L250 505 L745 505 L745 ${y + 28} L782 ${y + 28}`, 'tex', COL.tex, { dash: '2 4', count: 1, speed: 0.6 }));
  T(312, 498, 'texture() lookups', { fill: COL.tex, 'font-size': 12, 'font-weight': 500 }, groups.tex);
  T(236, 72, 'attributes', { fill: COL.attr, 'font-size': 12, 'font-weight': 500 }, groups.attr);
  T(478, 78, 'varyings', { fill: COL.vary, 'font-size': 12, 'font-weight': 500 }, groups.vary);

  // ---- packets ----
  const packets = [];
  paths.forEach((pa) => { for (let k = 0; k < pa.count; k++) { const c = el('circle', { r: pa.cat === 'attr' || pa.cat === 'vary' ? 5 : 4, fill: pa.color, filter: 'url(#fglow)' }, groups.packets); packets.push({ pa, c, u: k / pa.count, col: pa.colorFn ? pa.colorFn() : null }); } });

  let filter = 'all';
  SL.tabs('#flow-filter', (v) => {
    filter = v;
    ['attr', 'uni', 'vary', 'tex'].forEach((k) => groups[k].classList.toggle('dim', v !== 'all' && v !== k));
    if (v !== 'all') SL.xp.award('flow-' + v, 5, null);
  }, 'all');

  SL.animateWhileVisible(host, (t, dt) => {
    uTime.textContent = `u_time  = ${t.toFixed(2)}`;
    for (const k of packets) {
      const pa = k.pa;
      k.u += dt * pa.speed * 120 / pa.len;
      if (k.u >= 1) { k.u -= 1; if (pa.onArrive) pa.onArrive(k.col || [255, 255, 255]); if (pa.colorFn) k.col = pa.colorFn(); }
      const pt = pa.p.getPointAtLength(k.u * pa.len);
      k.c.setAttribute('cx', pt.x.toFixed(1)); k.c.setAttribute('cy', pt.y.toFixed(1));
      if (k.col) k.c.setAttribute('fill', `rgb(${k.col})`);
      const vis = filter === 'all' || filter === pa.cat || (pa.cat === 'base' && filter === 'vary');
      k.c.setAttribute('opacity', vis ? 1 : 0.08);
    }
  });
})();
