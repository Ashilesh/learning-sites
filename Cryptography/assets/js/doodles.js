/* Hand-drawn doodles (Rough.js). Strokes use currentColor so they follow the theme. */
(() => {
  'use strict';
  const { h } = window.CS;
  const C = { sun: '#ffd166', coral: '#ef476f', mint: '#06d6a0', ocean: '#118ab2', grape: '#8338ec', orange: '#fb8500', sky: '#a2d2ff', pink: '#ffafcc', skin: '#ffd9b8', skin2: '#e0a878', skin3: '#9a6643', hair: '#5a3825', dark: '#2b2d42', paper: '#fffdf7' };

  function pen(svg, seed = 1) {
    const rc = rough.svg(svg);
    const base = { stroke: 'currentColor', strokeWidth: 2.2, roughness: 1.3, seed, hachureGap: 5, fillWeight: 1.4 };
    const o = (x) => Object.assign({}, base, x || {});
    const add = (n) => (svg.appendChild(n), n);
    return {
      svg,
      rect: (x, y, w, hh, p) => add(rc.rectangle(x, y, w, hh, o(p))),
      circ: (x, y, d, p) => add(rc.circle(x, y, d, o(p))),
      ell: (x, y, w, hh, p) => add(rc.ellipse(x, y, w, hh, o(p))),
      line: (x1, y1, x2, y2, p) => add(rc.line(x1, y1, x2, y2, o(p))),
      arc: (x, y, w, hh, a, b, closed, p) => add(rc.arc(x, y, w, hh, a, b, closed, o(p))),
      path: (d, p) => add(rc.path(d, o(p))),
      poly: (pts, p) => add(rc.polygon(pts, o(p))),
      curve: (pts, p) => add(rc.curve(pts, o(p))),
      text: (x, y, s, size = 18, fill = 'currentColor', anchor = 'middle', weight = 700) => add(h('text', { x, y, 'font-family': 'Caveat, cursive', 'font-size': size, 'font-weight': weight, fill, 'text-anchor': anchor }, s)),
    };
  }

  // ---------------------------------------------------------------- reusable bits
  function lock(d, x, y, s = 1, color = C.sun, open = false) {
    d.arc(x + 30 * s, y + (open ? -6 : 4) * s, 40 * s, 52 * s, Math.PI, Math.PI * 2, false, { strokeWidth: 4 * s });
    if (open) d.line(x + 50 * s, y - 6 * s, x + 50 * s, y + 10 * s, { strokeWidth: 4 * s });
    d.rect(x, y + 4 * s, 60 * s, 46 * s, { fill: color, fillStyle: 'hachure' });
    d.circ(x + 30 * s, y + 22 * s, 10 * s, { fill: 'currentColor', fillStyle: 'solid' });
    d.line(x + 30 * s, y + 24 * s, x + 30 * s, y + 38 * s, { strokeWidth: 3.5 * s });
  }
  function key(d, x, y, s = 1, color = C.sun, rot = 0) {
    const g = h('g', { transform: `rotate(${rot} ${x} ${y})` });
    const dd = pen(g, 7);
    dd.circ(x, y, 34 * s, { fill: color, fillStyle: 'solid' });
    dd.circ(x, y, 10 * s, { fill: C.paper, fillStyle: 'solid' });
    dd.line(x + 17 * s, y, x + 70 * s, y, { strokeWidth: 4 * s });
    dd.line(x + 56 * s, y, x + 56 * s, y + 12 * s, { strokeWidth: 3.5 * s });
    dd.line(x + 66 * s, y, x + 66 * s, y + 9 * s, { strokeWidth: 3.5 * s });
    d.svg.appendChild(g);
  }
  function envelope(d, x, y, w, hh, color = C.paper) {
    d.rect(x, y, w, hh, { fill: color, fillStyle: 'solid' });
    d.line(x, y, x + w / 2, y + hh * .55); d.line(x + w, y, x + w / 2, y + hh * .55);
  }
  function sparkle(d, x, y, s = 1, color = C.sun) {
    d.path(`M${x} ${y - 10 * s} L${x + 3 * s} ${y - 3 * s} L${x + 10 * s} ${y} L${x + 3 * s} ${y + 3 * s} L${x} ${y + 10 * s} L${x - 3 * s} ${y + 3 * s} L${x - 10 * s} ${y} L${x - 3 * s} ${y - 3 * s} Z`, { fill: color, fillStyle: 'solid', strokeWidth: 1.5 });
  }
  function person(d, kind, cx, cy, s = 1) {
    const P = {
      alice: { shirt: C.coral, skin: C.skin, hair: C.hair },
      bob: { shirt: C.ocean, skin: C.skin2, hair: C.dark },
      eve: { shirt: C.grape, skin: C.skin, hair: C.orange },
      mallory: { shirt: '#9d0208', skin: C.skin3, hair: C.dark },
      trent: { shirt: C.mint, skin: C.skin2, hair: '#9aa0b5' },
    }[kind] || { shirt: C.sun, skin: C.skin, hair: C.hair };
    d.path(`M${cx - 34 * s} ${cy + 92 * s} Q ${cx - 34 * s} ${cy + 36 * s} ${cx} ${cy + 34 * s} Q ${cx + 34 * s} ${cy + 36 * s} ${cx + 34 * s} ${cy + 92 * s} Z`, { fill: P.shirt, fillStyle: 'hachure', hachureAngle: -30 });
    if (kind === 'alice') d.path(`M${cx - 30 * s} ${cy + 6 * s} Q ${cx - 36 * s} ${cy + 46 * s} ${cx - 18 * s} ${cy + 44 * s} L ${cx + 18 * s} ${cy + 44 * s} Q ${cx + 36 * s} ${cy + 46 * s} ${cx + 30 * s} ${cy + 6 * s} Z`, { fill: P.hair, fillStyle: 'solid' });
    d.circ(cx, cy, 58 * s, { fill: P.skin, fillStyle: 'solid' });
    if (kind === 'alice' || kind === 'eve') d.path(`M${cx - 29 * s} ${cy - 2 * s} Q ${cx - 26 * s} ${cy - 34 * s} ${cx} ${cy - 30 * s} Q ${cx + 28 * s} ${cy - 32 * s} ${cx + 29 * s} ${cy - 2 * s} Q ${cx + 12 * s} ${cy - 18 * s} ${cx - 29 * s} ${cy - 2 * s} Z`, { fill: P.hair, fillStyle: 'solid' });
    if (kind === 'bob') { d.path(`M${cx - 30 * s} ${cy - 8 * s} Q ${cx} ${cy - 46 * s} ${cx + 30 * s} ${cy - 8 * s} Z`, { fill: C.sun, fillStyle: 'solid' }); d.line(cx + 26 * s, cy - 9 * s, cx + 46 * s, cy - 6 * s, { strokeWidth: 4 * s }); }
    if (kind === 'trent') { d.path(`M${cx - 28 * s} ${cy - 6 * s} Q ${cx} ${cy - 40 * s} ${cx + 28 * s} ${cy - 6 * s}`, { strokeWidth: 3 }); d.circ(cx - 11 * s, cy - 1 * s, 15 * s); d.circ(cx + 11 * s, cy - 1 * s, 15 * s); sparkle(d, cx + 14 * s, cy + 56 * s, s * .9, C.sun); }
    if (kind === 'eve') { d.arc(cx, cy - 4 * s, 70 * s, 64 * s, Math.PI, Math.PI * 2, false, { strokeWidth: 4 * s }); d.rect(cx - 40 * s, cy - 8 * s, 12 * s, 20 * s, { fill: C.dark, fillStyle: 'solid' }); d.rect(cx + 28 * s, cy - 8 * s, 12 * s, 20 * s, { fill: C.dark, fillStyle: 'solid' }); }
    if (kind === 'mallory') { d.path(`M${cx - 22 * s} ${cy - 22 * s} L ${cx - 28 * s} ${cy - 44 * s} L ${cx - 10 * s} ${cy - 28 * s} Z`, { fill: C.coral, fillStyle: 'solid' }); d.path(`M${cx + 22 * s} ${cy - 22 * s} L ${cx + 28 * s} ${cy - 44 * s} L ${cx + 10 * s} ${cy - 28 * s} Z`, { fill: C.coral, fillStyle: 'solid' }); d.rect(cx - 26 * s, cy - 8 * s, 52 * s, 13 * s, { fill: C.dark, fillStyle: 'solid' }); }
    const eyeY = kind === 'mallory' ? cy - 2 * s : cy - 1 * s;
    const eyeFill = kind === 'mallory' ? '#fff' : 'currentColor';
    d.circ(cx - 11 * s, eyeY, 6 * s, { fill: eyeFill, fillStyle: 'solid', strokeWidth: 1 });
    d.circ(cx + 11 * s, eyeY, 6 * s, { fill: eyeFill, fillStyle: 'solid', strokeWidth: 1 });
    if (kind === 'mallory') d.path(`M${cx - 10 * s} ${cy + 16 * s} L ${cx - 3 * s} ${cy + 12 * s} L ${cx + 3 * s} ${cy + 16 * s} L ${cx + 10 * s} ${cy + 12 * s}`, { strokeWidth: 2 });
    else if (kind === 'eve') d.circ(cx, cy + 14 * s, 8 * s, { strokeWidth: 2 });
    else d.arc(cx, cy + 8 * s, 22 * s, 16 * s, 0.2, Math.PI - 0.2, false, { strokeWidth: 2.2 });
  }

  // ---------------------------------------------------------------- chapter doodles (220 × 180)
  const DOODLES = {
    hero(d) {
      person(d, 'alice', 70, 120, 1.15); person(d, 'bob', 370, 120, 1.15);
      d.text(70, 250, 'Alice', 30); d.text(370, 250, 'Bob', 30);
      d.path('M120 150 Q 220 90 320 150', { strokeWidth: 2.5, strokeLineDash: [8, 8] });
      envelope(d, 185, 100, 74, 50, C.paper); lock(d, 206, 128, .45, C.sun);
      d.text(222, 88, 'x7#q!@9…', 22, C.grape);
      person(d, 'eve', 222, 250, .8); d.text(222, 345, 'Eve sees only gibberish 👀', 24, C.grape);
      sparkle(d, 150, 60, 1, C.sun); sparkle(d, 300, 50, .8, C.coral); sparkle(d, 420, 30, .7, C.mint);
    },
    0(d) { d.rect(30, 30, 160, 120, { fill: C.sun, fillStyle: 'hachure', hachureGap: 8 }); d.path('M50 130 Q 80 60 110 110 T 170 50', { strokeLineDash: [6, 6], strokeWidth: 3 }); d.text(170, 58, '✗', 34, C.coral); d.circ(50, 130, 14, { fill: C.coral, fillStyle: 'solid' }); sparkle(d, 190, 25, 1, C.mint); },
    1(d) { envelope(d, 28, 70, 110, 76, C.paper); lock(d, 120, 52, 1.05, C.sun); sparkle(d, 40, 40, 1, C.coral); sparkle(d, 200, 30, .8, C.mint); d.text(80, 172, 'hidden writing', 22, C.grape); },
    2(d) { d.circ(110, 90, 150, { fill: C.orange, fillStyle: 'hachure', hachureGap: 7 }); d.circ(110, 90, 96, { fill: C.paper, fillStyle: 'solid' }); 'ABCDEFGH'.split('').forEach((ch, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; d.text(110 + Math.cos(a) * 62, 96 + Math.sin(a) * 62, ch, 20); d.text(110 + Math.cos(a) * 32, 96 + Math.sin(a) * 32, 'DEFGHIJK'[i], 15, C.coral); }); d.text(110, 176, 'shift = 3', 20, C.grape); },
    3(d) { d.circ(100, 90, 140, { fill: C.sky, fillStyle: 'hachure' }); for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; d.text(100 + Math.cos(a) * 54, 96 + Math.sin(a) * 54, String(i), 16); } d.line(100, 90, 100, 52, { strokeWidth: 4 }); d.line(100, 90, 130, 104, { strokeWidth: 4, stroke: C.coral }); d.text(190, 40, '9+5≡2', 22, C.grape); d.text(192, 160, 'mod 12', 22, C.coral); },
    4(d) { d.rect(24, 60, 70, 70, { fill: C.coral, fillStyle: 'solid' }); [[44, 80], [74, 110], [59, 95]].forEach(([x, y]) => d.circ(x, y, 11, { fill: C.paper, fillStyle: 'solid' })); d.rect(110, 40, 70, 70, { fill: C.ocean, fillStyle: 'solid' }); [[128, 58], [162, 58], [128, 92], [162, 92]].forEach(([x, y]) => d.circ(x, y, 11, { fill: C.paper, fillStyle: 'solid' })); d.text(150, 160, 'unpredictable!', 22, C.grape); sparkle(d, 200, 30, .9, C.sun); },
    5(d) { d.rect(20, 70, 110, 80, { fill: C.coral, fillStyle: 'cross-hatch', hachureGap: 9 }); d.rect(60, 96, 30, 26, { fill: C.dark, fillStyle: 'solid' }); key(d, 150, 60, 1, C.sun, 20); key(d, 150, 130, .8, C.sun, -10); d.text(110, 172, 'one shared key', 20, C.grape); },
    6(d) { for (let i = 0; i < 7; i++) d.ell(110, 92, 30 + i * 22, 40 + i * 24, { strokeWidth: 2.4, stroke: [C.coral, C.orange, C.sun, C.mint, C.ocean, C.grape, C.coral][i] }); d.text(110, 176, '2cf24dba…', 22, C.grape); },
    7(d) { envelope(d, 20, 50, 140, 96, C.paper); d.circ(150, 120, 60, { fill: C.coral, fillStyle: 'solid' }); sparkle(d, 150, 120, 1.2, C.sun); d.text(150, 176, 'HMAC seal', 22, C.grape); },
    8(d) { d.rect(14, 60, 150, 40, { fill: C.paper, fillStyle: 'solid' }); d.text(86, 88, '••••••••', 28, 'currentColor'); d.path('M178 40 L 206 40 L 212 130 L 172 130 Z', { fill: C.sky, fillStyle: 'hachure' }); d.rect(178, 26, 28, 16, { fill: C.dark, fillStyle: 'solid' }); [186, 196].forEach((x) => d.circ(x, 34, 3, { fill: C.paper, fillStyle: 'solid' })); d.text(90, 150, '+ salt 🧂', 24, C.grape); },
    9(d) { lock(d, 20, 50, 1.2, C.mint, true); key(d, 130, 70, .9, C.coral, 0); key(d, 130, 130, .9, C.ocean, 0); d.text(185, 50, 'private', 18, C.coral); d.text(190, 160, 'public', 18, C.ocean); },
    10(d) { d.ell(50, 120, 70, 30, { fill: C.coral, fillStyle: 'solid' }); d.ell(170, 120, 70, 30, { fill: C.ocean, fillStyle: 'solid' }); d.ell(110, 60, 70, 30, { fill: C.sun, fillStyle: 'solid' }); d.path('M60 100 Q 110 30 160 100', { strokeLineDash: [5, 6] }); d.ell(110, 150, 50, 22, { fill: '#8b5a2b', fillStyle: 'solid' }); d.text(110, 30, 'mix!', 22, C.grape); },
    11(d) { d.rect(20, 30, 130, 130, { fill: C.paper, fillStyle: 'solid' }); [55, 75, 95].forEach((y) => d.line(36, y, 134, y, { strokeWidth: 1.5 })); d.path('M36 130 C 50 100, 60 150, 75 120 S 100 110, 115 128 S 135 120, 140 115', { strokeWidth: 3, stroke: C.grape }); d.path('M160 20 L 200 60 L 170 140 L 150 150 L 152 128 Z', { fill: C.coral, fillStyle: 'solid' }); },
    12(d) { d.circ(110, 92, 120, { fill: C.sky, fillStyle: 'hachure' }); d.path('M60 70 Q 110 40 160 70 M52 105 Q 110 135 168 105 M110 32 Q 70 92 110 152 Q 150 92 110 32'); [[20, 40], [180, 30], [185, 140]].forEach(([x, y]) => envelope(d, x, y, 34, 22, C.sun)); },
    13(d) { d.rect(16, 40, 170, 110, { fill: C.paper, fillStyle: 'solid' }); d.rect(30, 58, 52, 64, { fill: C.sky, fillStyle: 'hachure' }); d.circ(56, 80, 22, { fill: C.skin, fillStyle: 'solid' }); [70, 90, 110].forEach((y, i) => d.line(96, y, 170 - i * 14, y)); d.circ(165, 135, 40, { fill: C.mint, fillStyle: 'solid' }); sparkle(d, 165, 135, .9, C.sun); d.text(100, 30, 'example.com', 20, C.grape); },
    14(d) { d.rect(10, 40, 90, 70, { fill: C.paper, fillStyle: 'solid' }); d.line(10, 56, 100, 56); lock(d, 38, 66, .5, C.mint); d.rect(130, 34, 70, 100, { fill: C.ocean, fillStyle: 'hachure' }); [60, 85, 110].forEach((y) => d.line(140, y, 190, y)); d.path('M100 70 L 130 70', { strokeWidth: 3 }); d.path('M130 95 L 100 95', { strokeWidth: 3, stroke: C.coral }); d.text(110, 160, '1 round trip', 22, C.grape); },
    15(d) { d.path('M20 160 L 20 90 Q 110 0 200 90 L 200 160', { fill: C.mint, fillStyle: 'hachure', strokeWidth: 3 }); d.path('M60 160 L 60 105 Q 110 50 160 105 L 160 160', { fill: C.dark, fillStyle: 'solid' }); d.path('M70 140 L 150 140', { stroke: C.sun, strokeWidth: 4 }); d.path('M138 130 L 152 140 L 138 150', { stroke: C.sun, strokeWidth: 4 }); [24, 40, 56].forEach((r) => d.arc(190, 40, r, r, Math.PI * 1.15, Math.PI * 1.85, false, { stroke: C.ocean, strokeWidth: 3 })); },
    16(d) { d.rect(60, 16, 90, 150, { fill: C.paper, fillStyle: 'solid' }); d.rect(72, 40, 66, 22, { fill: C.sky, fillStyle: 'solid' }); d.rect(80, 72, 54, 22, { fill: C.sun, fillStyle: 'solid' }); d.rect(72, 104, 50, 22, { fill: C.sky, fillStyle: 'solid' }); d.path('M170 60 L 200 70 L 196 110 Q 185 135 170 140 Q 155 135 146 110 L 142 70 Z', { fill: C.mint, fillStyle: 'solid' }); d.text(170, 108, '✓', 30, C.dark); },
    17(d) { d.circ(110, 90, 26, { fill: C.coral, fillStyle: 'solid' }); [0, 60, 120].forEach((a) => { const g = h('g', { transform: `rotate(${a} 110 90)` }); pen(g, a + 3).ell(110, 90, 190, 60, { strokeWidth: 2.4, stroke: [C.ocean, C.grape, C.mint][a / 60] }); d.svg.appendChild(g); }); [[200, 90], [62, 40], [62, 140]].forEach(([x, y]) => d.circ(x, y, 14, { fill: C.sun, fillStyle: 'solid' })); },
    18(d) { d.circ(90, 106, 110, { fill: C.dark, fillStyle: 'solid' }); d.rect(108, 40, 30, 24, { fill: '#666', fillStyle: 'solid' }); d.path('M138 44 Q 160 20 170 30', { strokeWidth: 3 }); sparkle(d, 178, 26, 1.4, C.orange); sparkle(d, 196, 50, .8, C.sun); d.text(90, 116, 'BUG', 28, C.sun); },
    19(d) { d.rect(20, 24, 170, 140, { fill: '#9aa0b5', fillStyle: 'hachure', hachureGap: 6 }); d.circ(105, 94, 80, { fill: C.paper, fillStyle: 'solid' }); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; d.line(105 + Math.cos(a) * 30, 94 + Math.sin(a) * 30, 105 + Math.cos(a) * 38, 94 + Math.sin(a) * 38); } d.circ(105, 94, 22, { fill: C.sun, fillStyle: 'solid' }); d.line(105, 94, 120, 80, { strokeWidth: 4 }); d.rect(176, 70, 16, 46, { fill: C.dark, fillStyle: 'solid' }); },
    20(d) { [[58, C.grape], [42, C.coral], [27, C.orange], [13, C.sun]].forEach(([r, c]) => d.ell(90, 84, r * 2, r * 2.2, { fill: c, fillStyle: 'hachure', hachureGap: 6, strokeWidth: 2 })); d.circ(90, 84, 150, { strokeWidth: 5 }); d.line(143, 137, 200, 176, { strokeWidth: 10 }); d.text(176, 36, 'layer', 18, C.grape); d.text(176, 56, 'by layer', 18, C.grape); sparkle(d, 30, 26, .9, C.mint); },
    21(d) { d.rect(36, 30, 130, 146, { fill: C.paper, fillStyle: 'solid' }); d.rect(76, 20, 50, 20, { fill: '#9aa0b5', fillStyle: 'solid' }); [62, 92, 122, 152].forEach((y, i) => { d.rect(50, y - 10, 16, 16, { fill: i < 3 ? C.mint : C.paper, fillStyle: 'solid' }); d.line(76, y - 2, 150, y - 2); }); d.text(196, 60, 'USE', 18, C.mint); d.text(196, 140, 'AVOID', 18, C.coral); },
    22(d) { d.path('M110 40 Q 60 24 14 40 L 14 156 Q 60 140 110 156 Z', { fill: C.paper, fillStyle: 'solid' }); d.path('M110 40 Q 160 24 206 40 L 206 156 Q 160 140 110 156 Z', { fill: C.paper, fillStyle: 'solid' }); d.text(60, 100, 'A–Z', 34, C.coral); [80, 100, 120].forEach((y) => d.line(130, y, 190, y - 4)); sparkle(d, 200, 22, .9, C.sun); },
    appendix(d) { [[30, 120, C.coral], [40, 92, C.ocean], [24, 64, C.mint]].forEach(([x, y, c]) => d.rect(x, y, 150, 26, { fill: c, fillStyle: 'hachure' })); d.text(110, 46, 'keep learning!', 24, C.grape); sparkle(d, 196, 60, 1, C.sun); },
  };

  function drawDoodle(el) {
    const keyName = el.dataset.doodle;
    const fn = DOODLES[keyName]; if (!fn || !window.rough) return;
    const big = keyName === 'hero';
    const svg = h('svg', { viewBox: big ? '0 0 440 360' : '0 0 220 180', preserveAspectRatio: 'xMidYMid meet', style: 'color: var(--ink)' });
    fn(pen(svg, String(keyName).length + 3));
    el.innerHTML = ''; el.append(svg);
  }

  window.Doodle = { pen, person, lock, key, envelope, sparkle, C, draw: drawDoodle };
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-doodle]').forEach(drawDoodle));
})();
