/* widgets.js: every interactive toy on the site. Each widget is mounted
   lazily (by app.js) into a <div class="widget" data-widget="name">. All
   numbers come from the guide's own formulas and worked examples. */
(function () {
  'use strict';
  const Q = window.QSim;
  const W = {};
  const TAU = Math.PI * 2;
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
  const comma = (n) => Math.round(n).toLocaleString('en-US');

  function sci(x, d = 2) {
    if (x === 0) return '0';
    if (!isFinite(x)) return '∞';
    const e = Math.floor(Math.log10(Math.abs(x)));
    if (e >= -3 && e < 6) return Number(x.toPrecision(d + 1)).toLocaleString('en-US', { maximumFractionDigits: 6 });
    const m = x / Math.pow(10, e);
    return `${m.toFixed(d)} × 10${sup(e)}`;
  }
  function sciLog(log10, d = 2) { // format 10^log10 without overflow
    const e = Math.floor(log10), m = Math.pow(10, log10 - e);
    if (e < 6 && e > -4) return sci(Math.pow(10, log10), d);
    return `${m.toFixed(d)} × 10${sup(e)}`;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function mk(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function played(node) { // only real interaction counts, not the initial render
    const w = node.closest('.widget');
    if (w && w.dataset.ready) w.dispatchEvent(new CustomEvent('qsk:played', { bubbles: true }));
  }
  function css(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }
  function palette() {
    return { ink: css('--ink'), ink2: css('--ink-2'), ink3: css('--ink-3'), paper: css('--paper'), card: css('--card'), part: css('--part'),
      violet: css('--violet'), coral: css('--coral'), teal: css('--teal'), sky: css('--sky'), sun: css('--sun'), pink: css('--pink'), lime: css('--lime') };
  }
  function range(label, min, max, step, value, fmt = (v) => v) {
    const el = mk(`<label class="w-range"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output></output></label>`);
    const input = el.querySelector('input'), out = el.querySelector('output');
    const sync = () => { out.textContent = fmt(+input.value); };
    input.addEventListener('input', sync); sync();
    return { el, input, get: () => +input.value, set: (v) => { input.value = v; sync(); }, sync };
  }
  function hist(el, rows) { // rows: [{l, v: 0..1, t, alt}]
    el.innerHTML = rows.map((r) => `<div class="w-hrow"><span>${r.l}</span><span class="w-hbar${r.alt ? ' alt' : ''}"><i style="width:${(clamp(r.v, 0, 1) * 100).toFixed(2)}%"></i></span><span class="v">${r.t}</span></div>`).join('');
  }
  function setupCanvas(cv, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.height = h + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function whenVisible(el, onShow, onHide) {
    if (!('IntersectionObserver' in window)) { onShow(); return; }
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? onShow() : onHide())), { threshold: 0.05 }).observe(el);
  }
  const btn = (label, attrs = '') => `<button type="button" class="w-btn" ${attrs}>${label}</button>`;

  /* ================================================================ 1.2 exponential wall */
  W['exp-wall'] = (b) => {
    const r = range('Particles (or qubits) <b>n</b>', 1, 300, 1, 10, (v) => `n = ${v}`);
    b.append(r.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-stats"><div class="w-stat"><b data-o="nums"></b><span>numbers to track (2ⁿ)</span></div>
      <div class="w-stat"><b data-o="mem"></b><span>memory at 16 bytes each</span></div><div class="w-stat"><b data-o="cmp"></b><span>comparable to</span></div></div>
      <div class="w-hbar alt" style="height:26px" aria-hidden="true"><i data-o="bar"></i></div>
      <p class="w-note" data-o="note"></p>
      <div class="w-controls">${[10, 30, 40, 50, 80, 300].map((n) => btn(`n = ${n}`, `data-n="${n}"`)).join('')}</div>`);
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    function upd() {
      const n = r.get();
      o('nums').textContent = n <= 40 ? comma(Math.pow(2, n)) : `≈ ${sciLog(n * Math.log10(2), 1)}`;
      const ui = Math.floor(n / 10);
      o('mem').textContent = ui < units.length ? `${comma(16 * Math.pow(2, n % 10))} ${units[ui]}` : `≈ ${sciLog(Math.log10(16) + n * Math.log10(2), 1)} bytes`;
      const cmp = n < 10 ? 'a few kilobytes: trivial' : n < 20 ? 'a small text file' : n < 30 ? 'a few photos' : n < 36 ? 'a good laptop'
        : n < 46 ? 'a big computing cluster' : n < 56 ? 'the biggest supercomputers' : n < 80 ? 'more than any supercomputer'
          : n < 266 ? 'more than all storage on Earth' : 'more numbers than atoms in the observable universe (~10⁸⁰)';
      o('cmp').textContent = cmp;
      o('bar').style.width = `${(n / 300) * 100}%`;
      o('note').textContent = `Add one more particle and every number above doubles. ${n >= 266 ? '300 qubits naturally hold a state that would need ~10⁹⁰ numbers to write down.' : ''}`;
    }
    r.input.addEventListener('input', () => { upd(); played(b); });
    b.querySelectorAll('[data-n]').forEach((x) => x.addEventListener('click', () => { r.set(+x.dataset.n); upd(); played(b); }));
    upd();
  };

  /* ================================================================ 2.3 bit lab */
  W['bit-lab'] = (b) => {
    b.innerHTML = `<div class="w-split"><div class="w-panel"><h4>A 4-bit register</h4><div class="w-flex" data-bits></div>
      <p class="w-big" data-o="val"></p><p class="w-note">16 possible values (0000 to 1111), but it holds exactly one at a time.</p></div>
      <div class="w-panel"><h4>Logic gate tester</h4><div class="w-controls" data-gates>${['AND', 'OR', 'XOR', 'NAND', 'NOT'].map((g) => btn(g, `data-g="${g}"`)).join('')}</div>
      <div class="w-flex"><span class="w-label">A</span><button type="button" class="w-qubit small" data-in="0">0</button><span class="w-label" data-blabel>B</span><button type="button" class="w-qubit small" data-in="1">0</button>
      <span class="w-label">→ out</span><span class="w-qubit small" data-o="out" style="cursor:default">0</span></div>
      <p class="w-note" data-o="rev"></p></div></div>`;
    const bits = [1, 0, 1, 1];
    const bb = b.querySelector('[data-bits]');
    function drawBits() {
      bb.innerHTML = bits.map((x, i) => `<button type="button" class="w-qubit" data-i="${i}" aria-label="bit ${i}">${x}</button>`).join('');
      const v = bits[0] * 8 + bits[1] * 4 + bits[2] * 2 + bits[3];
      b.querySelector('[data-o="val"]').textContent = `${bits.join('')} = ${bits[0]}×8 + ${bits[1]}×4 + ${bits[2]}×2 + ${bits[3]}×1 = ${v}`;
    }
    bb.addEventListener('click', (e) => { const t = e.target.closest('[data-i]'); if (!t) return; bits[+t.dataset.i] ^= 1; drawBits(); played(b); });
    const F = { AND: (a, c) => a & c, OR: (a, c) => a | c, XOR: (a, c) => a ^ c, NAND: (a, c) => 1 - (a & c), NOT: (a) => 1 - a };
    let g = 'AND'; const inp = [0, 0];
    function drawGate() {
      b.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x.dataset.g === g));
      const one = g === 'NOT';
      b.querySelector('[data-in="1"]').style.visibility = one ? 'hidden' : 'visible';
      b.querySelector('[data-blabel]').style.visibility = one ? 'hidden' : 'visible';
      b.querySelectorAll('[data-in]').forEach((x) => { x.textContent = inp[+x.dataset.in]; });
      const out = F[g](inp[0], inp[1]);
      b.querySelector('[data-o="out"]').textContent = out;
      const pre = one ? [[0], [1]].filter(([a]) => F[g](a) === out).map((x) => x.join(''))
        : [[0, 0], [0, 1], [1, 0], [1, 1]].filter(([a, c]) => F[g](a, c) === out).map((x) => x.join(''));
      b.querySelector('[data-o="rev"]').textContent = pre.length > 1
        ? `Output ${out} could come from ${pre.join(', ')}. Information is lost, so ${g} is irreversible.`
        : `Output ${out} could only come from ${pre[0]}. ${one ? 'NOT is reversible.' : 'This output happens to be unambiguous, but other outputs are not.'}`;
    }
    b.querySelector('[data-gates]').addEventListener('click', (e) => { const t = e.target.closest('[data-g]'); if (t) { g = t.dataset.g; drawGate(); played(b); } });
    b.querySelectorAll('[data-in]').forEach((x) => x.addEventListener('click', () => { inp[+x.dataset.in] ^= 1; drawGate(); played(b); }));
    drawBits(); drawGate();
  };

  /* ================================================================ 3.4 double slit */
  W['double-slit'] = (b) => {
    b.innerHTML = `<canvas class="w-canvas" aria-label="Double-slit experiment simulation"></canvas>
      <div class="w-controls" data-modes>${btn('Both slits open', 'data-m="two"')}${btn('Cover one slit', 'data-m="one"')}${btn('👁 Watch which slit', 'data-m="watch"')}</div>
      <div class="w-controls">${btn('Fire 1 electron', 'data-f="1"')}${btn('Fire 100', 'data-f="100"')}${btn('▶ Auto-fire', 'data-auto class="w-btn primary"')}${btn('Clear', 'data-clear')}
      <span class="w-pill" data-o="count">0 electrons</span></div><p class="w-note" data-o="note"></p>`;
    const cv = b.querySelector('canvas');
    let Wd = 0, Hd = 260, ctx, mode = 'two', hits = [], bins = [], auto = false, raf = 0, visible = false, flying = [];
    const NB = 90;
    const notes = {
      two: 'Each electron lands as a single dot... but after a few hundred, stripes appear: the electron went through both slits and interfered with itself.',
      one: 'One slit, one path: nothing to interfere with, so the stripes vanish into a single smooth bump.',
      watch: "Watch which slit each electron uses and the 'which-path' information destroys the interference. Two bumps, no stripes."
    };
    function I(y) { // y in [-1, 1] across the screen
      const sinc = (x) => (Math.abs(x) < 1e-6 ? 1 : Math.sin(x) / x);
      if (mode === 'two') return Math.pow(Math.cos(y * 11), 2) * Math.pow(sinc(y * 3.2), 2);
      if (mode === 'one') return Math.pow(sinc((y + 0.12) * 3.2), 2);
      return 0.5 * (Math.pow(sinc((y + 0.12) * 3.2), 2) + Math.pow(sinc((y - 0.12) * 3.2), 2));
    }
    function sample() { for (;;) { const y = Math.random() * 2 - 1; if (Math.random() < I(y)) return y; } }
    function resize() { Wd = b.clientWidth - 4; ctx = setupCanvas(cv, Wd, Hd); draw(); }
    function clear() { hits = []; bins = new Array(NB).fill(0); flying = []; b.querySelector('[data-o="count"]').textContent = '0 electrons'; draw(); }
    function fire(n) {
      for (let i = 0; i < n; i++) {
        const y = sample();
        hits.push([y, Math.random()]);
        bins[clamp(Math.floor((y + 1) / 2 * NB), 0, NB - 1)]++;
        if (n <= 3) flying.push({ y, t: 0 });
      }
      if (hits.length > 6000) hits.splice(0, hits.length - 6000);
      b.querySelector('[data-o="count"]').textContent = `${comma(bins.reduce((a, c) => a + c, 0))} electrons`;
      played(b);
    }
    function draw() {
      if (!ctx) return;
      const P = palette();
      ctx.clearRect(0, 0, Wd, Hd);
      const bx = Wd * 0.3, sx = Wd * 0.66, sw = 12, hx = sx + sw + 10, cy = Hd / 2, span = Hd * 0.44;
      // source
      ctx.fillStyle = P.part; ctx.strokeStyle = P.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(10, cy - 18, 44, 36, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.ink; ctx.font = '700 13px Nunito, sans-serif'; ctx.fillText('e⁻ gun', 12, cy + 34);
      // barrier with slits
      const gap = 10, s1 = cy - 26, s2 = cy + 26;
      ctx.fillStyle = P.ink;
      ctx.fillRect(bx, 8, 8, s1 - gap - 8);
      ctx.fillRect(bx, s1 + gap, 8, s2 - gap - (s1 + gap));
      ctx.fillRect(bx, s2 + gap, 8, Hd - 8 - (s2 + gap));
      if (mode === 'one') { ctx.fillStyle = P.coral; ctx.fillRect(bx - 2, s2 - gap - 2, 12, gap * 2 + 4); }
      if (mode === 'watch') { ctx.font = '22px sans-serif'; ctx.fillText('👁', bx + 14, s1 + 6); ctx.fillText('👁', bx + 14, s2 + 6); }
      // screen
      ctx.fillStyle = P.card; ctx.strokeStyle = P.ink; ctx.fillRect(sx, 8, sw, Hd - 16); ctx.strokeRect(sx, 8, sw, Hd - 16);
      ctx.fillStyle = P.part; ctx.globalAlpha = 0.55;
      for (const [y, j] of hits) ctx.fillRect(sx + 1 + j * (sw - 3), cy + y * span, 2, 2);
      ctx.globalAlpha = 1;
      // histogram
      const mx = Math.max(1, ...bins), hw = Wd - hx - 8;
      ctx.fillStyle = P.sun; ctx.strokeStyle = P.ink; ctx.lineWidth = 1;
      bins.forEach((c, i) => {
        if (!c) return;
        const y0 = cy - span + (i / NB) * 2 * span, w = (c / mx) * hw;
        ctx.fillRect(hx, y0, w, (2 * span) / NB + 0.5);
      });
      ctx.fillStyle = P.ink2; ctx.font = '700 12px Nunito, sans-serif'; ctx.fillText('screen', sx - 10, Hd - 0);
      ctx.fillText('where they land', hx, 14);
      // flying electrons
      ctx.fillStyle = P.coral;
      flying.forEach((f) => {
        const t = f.t, x = 54 + t * (sx - 54);
        const yy = t < (bx - 54) / (sx - 54) ? cy : cy + f.y * span * ((x - bx) / (sx - bx));
        ctx.beginPath(); ctx.arc(x, yy, 4, 0, TAU); ctx.fill();
      });
    }
    function loop() {
      raf = 0;
      if (!visible) return;
      if (auto) fire(4);
      flying.forEach((f) => { f.t += 0.06; }); flying = flying.filter((f) => f.t < 1);
      draw();
      if (auto || flying.length) raf = requestAnimationFrame(loop);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    b.querySelector('[data-modes]').addEventListener('click', (e) => {
      const t = e.target.closest('[data-m]'); if (!t) return;
      mode = t.dataset.m; b.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === t));
      b.querySelector('[data-o="note"]').textContent = notes[mode]; clear(); fire(200); draw();
    });
    b.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('click', () => { fire(+x.dataset.f); kick(); draw(); }));
    const ab = b.querySelector('[data-auto]');
    ab.addEventListener('click', () => { auto = !auto; ab.textContent = auto ? '⏸ Pause' : '▶ Auto-fire'; kick(); played(b); });
    b.querySelector('[data-clear]').addEventListener('click', clear);
    b.querySelector('[data-m="two"]').classList.add('on');
    b.querySelector('[data-o="note"]').textContent = notes.two;
    clear(); resize();
    window.addEventListener('resize', resize);
    document.addEventListener('qsk:theme', draw);
    whenVisible(b, () => { visible = true; kick(); }, () => { visible = false; });
  };

  /* ================================================================ 3.5 entangled pair */
  W['bell-pair'] = (b) => {
    b.innerHTML = `<div class="w-controls" data-modes>${btn('🔗 Entangled Bell pair', 'data-m="bell"')}${btn('🪙🪙 Two separate coins', 'data-m="coins"')}</div>
      <div class="w-split"><div class="w-box"><div class="w-label">Alice (Earth)</div><div class="w-qubit" data-o="a" style="margin:8px auto">?</div></div>
      <div class="w-box"><div class="w-label">Bob (other side of the galaxy)</div><div class="w-qubit" data-o="b" style="margin:8px auto">?</div></div></div>
      <div class="w-controls">${btn('Measure both', 'data-go="1" class="w-btn primary"')}${btn('Measure 100 times', 'data-go="100"')}${btn('Reset', 'data-reset')}</div>
      <div class="w-chips" data-o="log"></div><div class="w-hist" data-o="h"></div><p class="w-note" data-o="note"></p>`;
    let mode = 'bell', agree = 0, total = 0, log = [];
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function shot() {
      const a = Math.random() < 0.5 ? 0 : 1, c = mode === 'bell' ? a : (Math.random() < 0.5 ? 0 : 1);
      total++; if (a === c) agree++; log.unshift(`${a}${c}`); log = log.slice(0, 16);
      o('a').textContent = a; o('b').textContent = c;
    }
    function draw() {
      o('log').innerHTML = log.map((x) => `<span class="w-chip ${x[0] === x[1] ? 'good' : 'bad'}">${x}</span>`).join('');
      hist(o('h'), [{ l: 'agree', v: total ? agree / total : 0, t: total ? pct(agree / total, 0) : '–' }, { l: 'differ', v: total ? 1 - agree / total : 0, t: total ? pct(1 - agree / total, 0) : '–', alt: 1 }]);
      o('note').textContent = mode === 'bell'
        ? 'Each side alone is a perfectly random 0 or 1, yet they always agree. That is the state (|00⟩ + |11⟩)/√2. (Agreement alone could be faked by pre-packed answers; Bell showed measuring in different directions rules that out. Try the CHSH game in Chapter 9.)'
        : 'Two independent coins agree only about half of the time.';
    }
    b.querySelector('[data-modes]').addEventListener('click', (e) => {
      const t = e.target.closest('[data-m]'); if (!t) return; mode = t.dataset.m;
      b.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === t)); agree = total = 0; log = []; draw();
    });
    b.querySelectorAll('[data-go]').forEach((x) => x.addEventListener('click', () => { for (let i = 0; i < +x.dataset.go; i++) shot(); draw(); played(b); }));
    b.querySelector('[data-reset]').addEventListener('click', () => { agree = total = 0; log = []; o('a').textContent = o('b').textContent = '?'; draw(); });
    b.querySelector('[data-m="bell"]').classList.add('on'); draw();
  };

  /* ================================================================ 4.4 / 6.9 Bloch sphere */
  function blochWidget(b, gatesMode) {
    b.innerHTML = `<div class="w-split"><div><canvas class="w-canvas" aria-label="Bloch sphere. Drag to rotate."></canvas>
      <p class="w-note" style="text-align:center">drag the sphere to rotate it</p></div>
      <div><div data-sliders></div>
      <div class="w-controls" data-presets>${['|0⟩', '|1⟩', '|+⟩', '|−⟩', '|+i⟩', '|−i⟩'].map((s, i) => btn(s, `data-p="${i}"`)).join('')}</div>
      <div class="w-controls" data-gates>${['X', 'Y', 'Z', 'H', 'S', 'T'].map((g) => `<button type="button" class="w-btn gate" data-g="${g}">${g}</button>`).join('')}</div>
      <div class="w-panel"><div class="w-mono" data-o="psi"></div><div class="w-hist" data-o="p"></div></div>
      <div class="w-controls">${btn('📏 Measure once', 'data-meas="1" class="w-btn primary"')}${btn('Measure 100 fresh copies', 'data-meas="100"')}</div>
      <p class="w-note" data-o="note"></p></div></div>`;
    const cv = b.querySelector('canvas');
    const th = range('θ (from north)', 0, 180, 1, gatesMode ? 0 : 60, (v) => `${v}°`);
    const ph = range('φ (around)', 0, 359, 1, 0, (v) => `${v}°`);
    b.querySelector('[data-sliders]').append(th.el, ph.el);
    let v = [0, 0, 1], yaw = -0.62, pitch = 0.32, size = 300, ctx, anim = null, hist0 = [], counts = null;
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function fromAngles() { const t = th.get() * Math.PI / 180, p = ph.get() * Math.PI / 180; v = [Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t)]; }
    function toAngles() {
      const t = Math.acos(clamp(v[2], -1, 1)); let p = Math.atan2(v[1], v[0]); if (p < 0) p += TAU;
      th.set(Math.round(t * 180 / Math.PI)); ph.set(Math.sin(t) < 1e-3 ? 0 : Math.round(p * 180 / Math.PI) % 360);
    }
    function proj([x, y, z]) {
      const x1 = x * Math.cos(yaw) - y * Math.sin(yaw), y1 = x * Math.sin(yaw) + y * Math.cos(yaw);
      const y2 = y1 * Math.cos(pitch) - z * Math.sin(pitch), z2 = y1 * Math.sin(pitch) + z * Math.cos(pitch);
      const R = size * 0.36;
      return [size / 2 + R * x1, size / 2 - R * z2, -y2];
    }
    function curve(f, P, dashedBack = true) {
      const pts = []; for (let i = 0; i <= 72; i++) pts.push(proj(f(i / 72 * TAU)));
      for (let i = 0; i < 72; i++) {
        const a = pts[i], c = pts[i + 1], back = (a[2] + c[2]) / 2 < 0;
        ctx.setLineDash(back && dashedBack ? [4, 5] : []); ctx.globalAlpha = back ? 0.45 : 1;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    function draw() {
      if (!ctx) return;
      const P = palette(), c = size / 2, R = size * 0.36;
      ctx.clearRect(0, 0, size, size);
      const g = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
      g.addColorStop(0, P.card); g.addColorStop(1, P.paper);
      ctx.fillStyle = g; ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink3;
      curve((t) => [Math.cos(t), Math.sin(t), 0], P);
      curve((t) => [Math.cos(t), 0, Math.sin(t)], P);
      curve((t) => [0, Math.cos(t), Math.sin(t)], P);
      const axes = [[[0, 0, 1.18], '|0⟩'], [[0, 0, -1.18], '|1⟩'], [[1.25, 0, 0], '|+⟩'], [[-1.25, 0, 0], '|−⟩'], [[0, 1.25, 0], '|+i⟩'], [[0, -1.25, 0], '|−i⟩']];
      ctx.font = '700 15px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      axes.forEach(([p, lab]) => {
        const a = proj([0, 0, 0]), e = proj(p);
        ctx.strokeStyle = P.ink3; ctx.globalAlpha = e[2] < 0 ? 0.5 : 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.setLineDash([]);
        const l = proj(p.map((x) => x * 1.12)); ctx.fillStyle = P.ink; ctx.fillText(lab, l[0], l[1]); ctx.globalAlpha = 1;
      });
      hist0.forEach((p, i) => { const q = proj(p); ctx.fillStyle = P.part; ctx.globalAlpha = 0.15 + 0.6 * (i / hist0.length); ctx.beginPath(); ctx.arc(q[0], q[1], 2.5, 0, TAU); ctx.fill(); });
      ctx.globalAlpha = 1;
      const o0 = proj([0, 0, 0]), tip = proj(v), foot = proj([v[0], v[1], 0]);
      ctx.strokeStyle = P.ink3; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(foot[0], foot[1]); ctx.lineTo(o0[0], o0[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = P.part; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(o0[0], o0[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      ctx.fillStyle = P.part; ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(tip[0], tip[1], 9, 0, TAU); ctx.fill(); ctx.stroke();
    }
    function readout() {
      const t = Math.acos(clamp(v[2], -1, 1)), p = Math.atan2(v[1], v[0]);
      const a = Math.cos(t / 2), s = Math.sin(t / 2), beta = Q.C(s * Math.cos(p), s * Math.sin(p));
      const p0 = a * a;
      o('psi').innerHTML = `|ψ⟩ = <b>${Q.fmtC(Q.C(a))}</b>|0⟩ + <b>${s < 1e-3 ? '0' : '(' + Q.fmtC(beta) + ')'}</b>|1⟩`;
      hist(o('p'), [{ l: 'P(0)', v: p0, t: pct(p0) }, { l: 'P(1)', v: 1 - p0, t: pct(1 - p0), alt: 1 }]);
      if (counts) {
        o('note').textContent = `100 fresh copies measured: ${counts[0]} × 0 and ${counts[1]} × 1 (expected about ${Math.round(p0 * 100)} / ${Math.round((1 - p0) * 100)}).`;
      }
    }
    function setV(nv) { v = nv; toAngles(); readout(); draw(); }
    const PRE = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
    const AX = { X: [[1, 0, 0], Math.PI], Y: [[0, 1, 0], Math.PI], Z: [[0, 0, 1], Math.PI], H: [[Math.SQRT1_2, 0, Math.SQRT1_2], Math.PI], S: [[0, 0, 1], Math.PI / 2], T: [[0, 0, 1], Math.PI / 4] };
    const rot = (u, k, a) => {
      const c = Math.cos(a), s = Math.sin(a), d = k[0] * u[0] + k[1] * u[1] + k[2] * u[2];
      const cr = [k[1] * u[2] - k[2] * u[1], k[2] * u[0] - k[0] * u[2], k[0] * u[1] - k[1] * u[0]];
      return [0, 1, 2].map((i) => u[i] * c + cr[i] * s + k[i] * d * (1 - c));
    };
    function gate(gn) {
      if (anim) return;
      const [k, ang] = AX[gn], start = v.slice(), t0 = performance.now(), dur = 650; hist0 = [];
      gatesLog.push(gn);
      const step = (now) => {
        const f = clamp((now - t0) / dur, 0, 1), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        v = rot(start, k, ang * e); hist0.push(v.slice()); if (hist0.length > 40) hist0.shift();
        draw();
        if (f < 1) anim = requestAnimationFrame(step); else { anim = null; setV(rot(start, k, ang)); hist0 = []; gateNote(gn); }
      };
      anim = requestAnimationFrame(step); played(b);
    }
    const gatesLog = [];
    const GN = { X: 'X: 180° about the x-axis (bit flip).', Y: 'Y: 180° about the y-axis (bit + phase flip).', Z: 'Z: 180° about the z-axis (phase flip). P(0) never changes!',
      H: 'H: 180° about the diagonal between x and z. Swaps |0⟩ ↔ |+⟩ and |1⟩ ↔ |−⟩.', S: 'S: a quarter turn (90°) about z.', T: 'T: an eighth turn (45°) about z.' };
    function gateNote(gn) { o('note').textContent = `${GN[gn]}  Gates so far: ${gatesLog.slice(-10).join(' → ')}`; }
    b.querySelector('[data-presets]').addEventListener('click', (e) => { const t = e.target.closest('[data-p]'); if (t) { counts = null; setV(PRE[+t.dataset.p]); played(b); } });
    b.querySelector('[data-gates]').addEventListener('click', (e) => { const t = e.target.closest('[data-g]'); if (t) { counts = null; gate(t.dataset.g); } });
    [th, ph].forEach((r) => r.input.addEventListener('input', () => { counts = null; fromAngles(); readout(); draw(); played(b); }));
    b.querySelectorAll('[data-meas]').forEach((x) => x.addEventListener('click', () => {
      const p0 = (1 + v[2]) / 2;
      if (x.dataset.meas === '1') {
        const r = Math.random() < p0 ? 0 : 1; counts = null;
        setV(r ? [0, 0, -1] : [0, 0, 1]);
        o('note').textContent = `You measured ${r}! (it had a ${pct(r ? 1 - p0 : p0)} chance). The superposition is gone: the arrow snapped to the ${r ? 'south' : 'north'} pole.`;
        b.querySelector('canvas').classList.add('w-flash'); setTimeout(() => b.querySelector('canvas').classList.remove('w-flash'), 600);
      } else {
        counts = [0, 0]; for (let i = 0; i < 100; i++) counts[Math.random() < p0 ? 0 : 1]++; readout();
      }
      played(b);
    }));
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY, yaw, pitch]; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; yaw = drag[2] + (e.clientX - drag[0]) * 0.012; pitch = clamp(drag[3] + (e.clientY - drag[1]) * 0.01, -1.2, 1.2); draw(); });
    cv.addEventListener('pointerup', () => { drag = null; });
    function resize() { size = Math.min(340, b.querySelector('.w-split > div').clientWidth || 300); cv.style.width = size + 'px'; cv.style.margin = '0 auto'; ctx = setupCanvas(cv, size, size); draw(); }
    fromAngles(); readout(); resize();
    if (gatesMode) o('note').textContent = 'Start at |0⟩. Try H then H again. Or H, then T eight times...';
    window.addEventListener('resize', resize); document.addEventListener('qsk:theme', draw);
  }
  W['bloch'] = (b) => blochWidget(b, false);
  W['bloch-gates'] = (b) => blochWidget(b, true);

  /* ================================================================ 6.5 coin vs qubit */
  W['coin-vs-qubit'] = (b) => {
    b.innerHTML = `<div class="w-split"><div class="w-panel"><h4>🪙 Classical coin, flipped twice</h4><div class="w-hist" data-o="c"></div></div>
      <div class="w-panel"><h4>⚛️ |0⟩ → H → H → measure</h4><div class="w-hist" data-o="q"></div>
      <label class="w-label" style="margin-top:6px"><input type="checkbox" data-peek> 👀 Peek (measure) between the two H gates</label></div></div>
      <div class="w-controls">${btn('Run both 200 times', 'data-run class="w-btn primary"')}${btn('Reset', 'data-reset')}</div><p class="w-note" data-o="note"></p>`;
    let c = [0, 0], q = [0, 0], timer = 0;
    const o = (k) => b.querySelector(`[data-o="${k}"]`), peek = b.querySelector('[data-peek]');
    function draw() {
      const tc = c[0] + c[1] || 1, tq = q[0] + q[1] || 1;
      hist(o('c'), [{ l: 'heads', v: c[0] / tc, t: c[0] }, { l: 'tails', v: c[1] / tc, t: c[1], alt: 1 }]);
      hist(o('q'), [{ l: '0', v: q[0] / tq, t: q[0] }, { l: '1', v: q[1] / tq, t: q[1], alt: 1 }]);
      o('note').textContent = peek.checked
        ? "Peeking collapses the state to |0⟩ or |1⟩ after the first H, so there is nothing left to interfere: 50/50 again. Measurement destroyed the interference."
        : 'Randomness piled on randomness stays random for the coin. For the qubit, the two paths to |1⟩ have amplitudes +½ and −½ and cancel. Interference!';
    }
    function one() {
      c[Math.random() < 0.5 ? 0 : 1]++;
      if (peek.checked) { const mid = Math.random() < 0.5 ? 0 : 1; q[Math.random() < 0.5 ? 0 : 1]++; void mid; } else q[0]++;
    }
    b.querySelector('[data-run]').addEventListener('click', () => {
      clearInterval(timer); let n = 0;
      timer = setInterval(() => { for (let i = 0; i < 10; i++) one(); n += 10; draw(); if (n >= 200) clearInterval(timer); }, 40); played(b);
    });
    b.querySelector('[data-reset]').addEventListener('click', () => { clearInterval(timer); c = [0, 0]; q = [0, 0]; draw(); });
    peek.addEventListener('change', () => { c = [0, 0]; q = [0, 0]; draw(); });
    draw();
  };

  /* ================================================================ 7.2 entanglement detector */
  W['entangle-test'] = (b) => {
    const r2 = Math.SQRT1_2, r3 = 1 / Math.sqrt(3);
    const states = [
      ['|0⟩⊗|1⟩ = |01⟩', [0, 1, 0, 0]], ['|+⟩⊗|0⟩', [r2, 0, r2, 0]], ['(|00⟩+|01⟩+|10⟩+|11⟩)/2', [0.5, 0.5, 0.5, 0.5]],
      ['Bell (|00⟩+|11⟩)/√2', [r2, 0, 0, r2]], ['(|01⟩+|10⟩)/√2', [0, r2, r2, 0]], ['(|00⟩+|01⟩−|10⟩−|11⟩)/2', [0.5, 0.5, -0.5, -0.5]],
      ['(|00⟩+|01⟩+|10⟩−|11⟩)/2', [0.5, 0.5, 0.5, -0.5]], ['(|00⟩+|01⟩+|10⟩)/√3', [r3, r3, r3, 0]],
    ];
    b.innerHTML = `<div class="w-controls" data-s>${states.map((s, i) => btn(s[0], `data-i="${i}"`)).join('')}</div>
      <div class="w-split"><div class="w-panel"><h4>Amplitudes</h4><table class="w-table" data-o="t"></table></div>
      <div class="w-panel"><h4>The a·d = b·c test</h4><div class="w-mono" data-o="calc"></div><p data-o="v" style="margin:10px 0 0"></p></div></div>`;
    const f = (x) => { const v = +x.toFixed(3); return v === 0 ? '0' : String(v); };
    function show(i) {
      const [name, [a, bb, c, d]] = states[i];
      b.querySelectorAll('[data-i]').forEach((x) => x.classList.toggle('on', +x.dataset.i === i));
      b.querySelector('[data-o="t"]').innerHTML = `<tr><th></th><th>|00⟩</th><th>|01⟩</th><th>|10⟩</th><th>|11⟩</th></tr><tr><th>amp</th><td>a = ${f(a)}</td><td>b = ${f(bb)}</td><td>c = ${f(c)}</td><td>d = ${f(d)}</td></tr>`;
      const ad = a * d, bc = bb * c, eq = Math.abs(ad - bc) < 1e-9;
      b.querySelector('[data-o="calc"]').innerHTML = `a·d = ${f(a)} × ${f(d)} = <b>${f(ad)}</b><br>b·c = ${f(bb)} × ${f(c)} = <b>${f(bc)}</b>`;
      b.querySelector('[data-o="v"]').innerHTML = eq ? `<span class="w-pill good">Equal → product state</span> ${esc(name)} is just two independent qubits.`
        : `<span class="w-pill bad">Not equal → entangled!</span> ${esc(name)} can't be split into one state per qubit.`;
    }
    b.querySelector('[data-s]').addEventListener('click', (e) => { const t = e.target.closest('[data-i]'); if (t) { show(+t.dataset.i); played(b); } });
    show(3);
  };

  /* ================================================================ 8.2 circuit builder */
  W['circuit-builder'] = (b) => {
    const NC = 8;
    b.innerHTML = `<div class="w-controls"><span class="w-label">Qubits:</span>${btn('2', 'data-nq="2"')}${btn('3', 'data-nq="3"')}
      <span class="w-label" style="margin-left:8px">Examples:</span><select class="w-input" data-preset style="width:auto">
      <option value="">choose…</option><option value="hh">Interference: H then H</option><option value="bell">Bell state</option><option value="ghz">GHZ state (3 qubits)</option>
      <option value="grover">Grover: find |11⟩</option><option value="kick">Phase kickback</option></select>${btn('🧽 Clear', 'data-clear')}</div>
      <div class="w-controls" data-tools>${['H', 'X', 'Y', 'Z', 'S', 'T'].map((g) => `<button type="button" class="w-btn gate" data-t="${g}">${g}</button>`).join('')}
      <button type="button" class="w-btn gate" data-t="cx">CNOT</button><button type="button" class="w-btn gate" data-t="cz">CZ</button><button type="button" class="w-btn gate" data-t="erase">Erase</button></div>
      <p class="w-note" data-o="hint" style="margin-top:0"></p>
      <div class="w-scroll"><div class="w-grid-c" data-o="grid"></div></div>
      <div class="w-split" style="margin-top:12px"><div class="w-panel"><h4>State vector</h4><div class="w-amps" data-o="amps"></div></div>
      <div class="w-panel"><h4>Measure it</h4><div class="w-controls">${btn('Run 1,000 shots', 'data-shots class="w-btn primary"')}</div><div class="w-hist" data-o="h"></div>
      <p class="w-note">q0 is the leftmost bit, like the guide (Qiskit prints it on the right).</p></div></div>`;
    let nq = 2, tool = 'H', pending = null;
    let cols = Array.from({ length: NC }, () => ({ s: {}, c: null }));
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    const hints = { cx: 'CNOT: click the control qubit, then the target in the same column.', cz: 'CZ: click one qubit, then another in the same column.', erase: 'Click a cell to clear it.' };
    function setTool(t) { tool = t; pending = null; b.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x.dataset.t === t)); o('hint').textContent = hints[t] || `Click a cell to drop a ${t} gate.`; drawGrid(); }
    function run() {
      const s = new Q.State(nq);
      cols.forEach((col) => {
        Object.entries(col.s).forEach(([q, g]) => { if (+q < nq) s.gate(Q.G[g], +q); });
        if (col.c && col.c.c < nq && col.c.t < nq) (col.c.type === 'cx' ? s.cnot(col.c.c, col.c.t) : s.cz(col.c.c, col.c.t));
      });
      return s;
    }
    function drawGrid() {
      const g = o('grid'); g.style.gridTemplateColumns = `64px repeat(${NC}, minmax(44px, 1fr))`; g.style.minWidth = '460px';
      let h = '';
      for (let q = 0; q < nq; q++) {
        h += `<div class="w-wire-label">q${q} |0⟩</div>`;
        for (let c = 0; c < NC; c++) {
          const col = cols[c]; let cls = 'w-cell', txt = '';
          if (col.s[q]) { cls += ` g g-${col.s[q]}`; txt = col.s[q]; }
          if (col.c) {
            const lo = Math.min(col.c.c, col.c.t), hi = Math.max(col.c.c, col.c.t);
            if (q === col.c.c) cls += col.c.type === 'cz' ? ' g g-cz' : ' g g-ctrl';
            else if (q === col.c.t) cls += col.c.type === 'cz' ? ' g g-cz' : ' g g-tgt';
            if (q > lo && q <= hi) cls += ' link';
          }
          if (pending && pending.col === c && pending.q === q) cls += ' g g-ctrl';
          h += `<div class="${cls}" data-q="${q}" data-c="${c}" role="button" tabindex="0" aria-label="qubit ${q}, step ${c + 1}"><span>${txt}</span></div>`;
        }
      }
      g.innerHTML = h; drawState();
    }
    function drawState(counts) {
      const s = run(), p = s.probs();
      o('amps').innerHTML = s.a.map((z, i) => {
        const pr = p[i], neg = Math.abs(z.im) < 1e-9 && z.re < -1e-9, cplx = Math.abs(z.im) > 1e-9;
        const col = cplx ? 'var(--teal)' : neg ? 'var(--coral)' : 'var(--part)';
        return `<div class="w-amp ${pr < 1e-9 ? 'w-dim' : ''}"><span>|${s.label(i)}⟩</span><span class="amp-c">${Q.fmtC(z)}</span><span class="w-hbar"><i style="width:${pr * 100}%;background:${col}"></i></span><span>${pct(pr, 1)}</span></div>`;
      }).join('') + '<p class="w-note">bar colour: violet = positive, coral = negative, teal = complex amplitude</p>';
      if (counts) hist(o('h'), counts.map((c, i) => ({ l: s.label(i), v: c / 1000, t: c })).filter((r, i) => r.t > 0 || p[i] > 1e-9));
      else o('h').innerHTML = '';
    }
    o('grid').addEventListener('click', (e) => {
      const cell = e.target.closest('[data-q]'); if (!cell) return;
      const q = +cell.dataset.q, c = +cell.dataset.c, col = cols[c];
      if (tool === 'erase') { delete col.s[q]; if (col.c && (col.c.c === q || col.c.t === q)) col.c = null; }
      else if (tool === 'cx' || tool === 'cz') {
        if (!pending || pending.col !== c) { pending = { col: c, q }; drawGrid(); return; }
        if (pending.q === q) { pending = null; drawGrid(); return; }
        delete col.s[pending.q]; delete col.s[q]; col.c = { type: tool, c: pending.q, t: q }; pending = null;
      } else {
        if (col.c && (col.c.c === q || col.c.t === q)) col.c = null;
        col.s[q] = tool;
      }
      drawGrid(); played(b);
    });
    b.querySelector('[data-tools]').addEventListener('click', (e) => { const t = e.target.closest('[data-t]'); if (t) setTool(t.dataset.t); });
    b.querySelectorAll('[data-nq]').forEach((x) => x.addEventListener('click', () => { nq = +x.dataset.nq; b.querySelectorAll('[data-nq]').forEach((y) => y.classList.toggle('on', y === x)); drawGrid(); }));
    b.querySelector('[data-clear]').addEventListener('click', () => { cols = Array.from({ length: NC }, () => ({ s: {}, c: null })); drawGrid(); });
    b.querySelector('[data-shots]').addEventListener('click', () => { drawState(run().sample(1000)); played(b); });
    const P = {
      hh: [2, [{ s: { 0: 'H' } }, { s: { 0: 'H' } }]],
      bell: [2, [{ s: { 0: 'H' } }, { c: { type: 'cx', c: 0, t: 1 } }]],
      ghz: [3, [{ s: { 0: 'H' } }, { c: { type: 'cx', c: 0, t: 1 } }, { c: { type: 'cx', c: 1, t: 2 } }]],
      grover: [2, [{ s: { 0: 'H', 1: 'H' } }, { c: { type: 'cz', c: 0, t: 1 } }, { s: { 0: 'H', 1: 'H' } }, { s: { 0: 'X', 1: 'X' } }, { c: { type: 'cz', c: 0, t: 1 } }, { s: { 0: 'X', 1: 'X' } }, { s: { 0: 'H', 1: 'H' } }]],
      kick: [2, [{ s: { 1: 'X' } }, { s: { 0: 'H', 1: 'H' } }, { c: { type: 'cx', c: 0, t: 1 } }, { s: { 0: 'H', 1: 'H' } }]],
    };
    const NOTES = { hh: 'H then H returns |0⟩ with certainty: interference.', bell: '(|00⟩ + |11⟩)/√2: only 00 or 11, never 01 or 10.', ghz: '(|000⟩ + |111⟩)/√2: all-or-nothing.',
      grover: 'One Grover iteration finds the marked item |11⟩ with 100% probability.', kick: 'CNOT|+⟩|−⟩ = |−⟩|−⟩: the CONTROL qubit flipped. Final H gates turn that into |11⟩.' };
    b.querySelector('[data-preset]').addEventListener('change', (e) => {
      const k = e.target.value; if (!k) return; const [n, cs] = P[k]; nq = n;
      b.querySelectorAll('[data-nq]').forEach((y) => y.classList.toggle('on', +y.dataset.nq === n));
      cols = Array.from({ length: NC }, (_, i) => ({ s: { ...(cs[i]?.s || {}) }, c: cs[i]?.c ? { ...cs[i].c } : null }));
      drawGrid(); o('hint').textContent = NOTES[k]; played(b);
    });
    b.querySelector('[data-nq="2"]').classList.add('on'); setTool('H');
    const ex = P.bell; cols = Array.from({ length: NC }, (_, i) => ({ s: { ...(ex[1][i]?.s || {}) }, c: ex[1][i]?.c ? { ...ex[1][i].c } : null }));
    drawGrid(); o('hint').textContent = 'Loaded: the Bell circuit. Pick a gate above and click the grid to change it.';
  };

  /* ================================================================ 8.3 shots */
  W['shots'] = (b) => {
    const SH = [10, 30, 100, 300, 1000, 3000, 10000, 30000, 100000];
    const rs = range('Shots', 0, SH.length - 1, 1, 4, (i) => comma(SH[i]));
    const rn = range('Hardware noise', 0, 10, 0.5, 0, (v) => `${v}%`);
    b.append(rs.el, rn.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-controls">${btn('Run the Bell circuit', 'data-run class="w-btn primary"')}</div><div class="w-hist" data-o="h"></div>
      <div class="w-stats"><div class="w-stat"><b data-o="est"></b><span>estimated P(00)</span></div><div class="w-stat"><b data-o="err"></b><span>shot noise √(p(1−p)/N)</span></div></div>
      <p class="w-note" data-o="note"></p>`);
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function runIt() {
      const N = SH[rs.get()], noise = rn.get() / 100, c = [0, 0, 0, 0];
      for (let i = 0; i < N; i++) {
        let r = Math.random() < 0.5 ? 0 : 3;
        if (Math.random() < noise) r ^= Math.random() < 0.5 ? 1 : 2;
        c[r]++;
      }
      hist(o('h'), ['00', '01', '10', '11'].map((l, i) => ({ l, v: c[i] / N, t: comma(c[i]), alt: i === 1 || i === 2 })));
      const p = c[0] / N, err = Math.sqrt(0.25 / N);
      o('est').textContent = `${pct(p)} ± ${pct(Math.sqrt(p * (1 - p) / N))}`;
      o('err').textContent = `±${pct(err, 2)}`;
      o('note').textContent = `Ideal answer: exactly 50% 00 and 50% 11. ${noise ? `With ${rn.get()}% noise you also see some 01 and 10, like on real hardware.` : ''} Ten times the precision costs a hundred times the shots.`;
      played(b);
    }
    b.querySelector('[data-run]').addEventListener('click', runIt);
    rs.input.addEventListener('change', runIt); rn.input.addEventListener('change', runIt);
    runIt();
  };

  /* ================================================================ 9.2 teleportation */
  W['teleport'] = (b) => {
    const rt = range('Secret θ', 0, 180, 1, 70, (v) => `${v}°`), rp = range('Secret φ', 0, 359, 1, 40, (v) => `${v}°`);
    b.append(rt.el, rp.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-panel"><div class="w-mono" data-o="psi"></div></div>
      <div class="w-controls">${btn('Next step ▶', 'data-next class="w-btn primary"')}${btn('Restart', 'data-reset')}${btn('🎲 Random secret', 'data-rand')}</div>
      <ol class="w-steps" data-o="steps"></ol>`);
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    let step = 0, s = null, m = null, ab = null;
    const secret = () => { const t = rt.get() * Math.PI / 180, p = rp.get() * Math.PI / 180; return [Q.C(Math.cos(t / 2)), Q.C(Math.sin(t / 2) * Math.cos(p), Math.sin(t / 2) * Math.sin(p))]; };
    const terms = (st) => st.a.map((z, i) => (Q.abs2(z) > 1e-9 ? `(${Q.fmtC(z)})|${st.label(i)}⟩` : null)).filter(Boolean).join(' + ');
    function bobState(st, m0, m1) {
      const i0 = (m0 << 2) | (m1 << 1), a = st.a[i0], c = st.a[i0 | 1], n = Math.sqrt(Q.abs2(a) + Q.abs2(c)) || 1;
      return [Q.scale(a, 1 / n), Q.scale(c, 1 / n)];
    }
    function draw() {
      ab = secret();
      o('psi').innerHTML = `Alice's secret |ψ⟩ = (<b>${Q.fmtC(ab[0])}</b>)|0⟩ + (<b>${Q.fmtC(ab[1])}</b>)|1⟩<br><small>Nobody, not even Alice, gets to read these numbers.</small>`;
      const L = [];
      s = Q.State.from([0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const q0 = i >> 2, q12 = i & 3; return Q.scale(ab[q0], q12 === 0 || q12 === 3 ? Math.SQRT1_2 : 0); }));
      L.push(['Start: |ψ⟩ ⊗ (|00⟩ + |11⟩)/√2, qubits in the order q0 q1 q2.', terms(s)]);
      if (step >= 1) { s.cnot(0, 1); L.push(['Step 1. Alice applies CNOT (q0 → q1).', terms(s)]); }
      if (step >= 2) {
        s.gate(Q.G.H, 0);
        const groups = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y]) => { const [a, c] = bobState(s, x, y); return `|${x}${y}⟩ ⊗ ((${Q.fmtC(a)})|0⟩ + (${Q.fmtC(c)})|1⟩)`; });
        L.push(['Step 2. Alice applies H to q0. Grouped by Alice\'s two qubits (each ½):', groups.join('<br>')]);
      }
      if (step >= 3) {
        if (!m) { const r = Math.floor(Math.random() * 4); m = [r >> 1, r & 1]; }
        const [a, c] = bobState(s, m[0], m[1]);
        L.push([`Step 3. Alice measures and gets <b>${m[0]}${m[1]}</b> (each outcome is 25%). She phones Bob two bits. Her original is destroyed.`,
          `Bob's qubit is now (${Q.fmtC(a)})|0⟩ + (${Q.fmtC(c)})|1⟩. Without the two bits it looks random to him.`]);
      }
      if (step >= 4) {
        let [a, c] = bobState(s, m[0], m[1]); const ops = [];
        if (m[1]) { [a, c] = [c, a]; ops.push('X'); }
        if (m[0]) { c = Q.scale(c, -1); ops.push('Z'); }
        const fid = Q.abs2(Q.add(Q.mul({ re: ab[0].re, im: -ab[0].im }, a), Q.mul({ re: ab[1].re, im: -ab[1].im }, c)));
        L.push([`Step 4. Bob applies ${ops.length ? ops.join(', then ') : 'nothing'}.`, `Bob now holds (${Q.fmtC(a)})|0⟩ + (${Q.fmtC(c)})|1⟩. Fidelity with the secret: <b>${pct(fid, 1)}</b> ✓ Teleported!`]);
        played(b);
      }
      o('steps').innerHTML = L.map(([t, d], i) => `<li class="${i === 4 ? 'ok' : ''}">${t}<div class="w-mono" style="margin-top:4px">${d}</div></li>`).join('');
      b.querySelector('[data-next]').disabled = step >= 4;
    }
    b.querySelector('[data-next]').addEventListener('click', () => { step = Math.min(4, step + 1); draw(); });
    b.querySelector('[data-reset]').addEventListener('click', () => { step = 0; m = null; draw(); });
    b.querySelector('[data-rand]').addEventListener('click', () => { rt.set(Math.floor(Math.random() * 181)); rp.set(Math.floor(Math.random() * 360)); step = 0; m = null; draw(); });
    [rt, rp].forEach((r) => r.input.addEventListener('input', () => { step = 0; m = null; draw(); }));
    draw();
  };

  /* ================================================================ 9.5 CHSH */
  W['chsh'] = (b) => {
    b.innerHTML = `<p style="margin-top:0">The referee sends random bits x (to Alice) and y (to Bob). They win if <b>a ⊕ b = x AND y</b>: match, unless both got 1.</p>
      <div class="w-controls">${btn('Play 1 round', 'data-one')}${btn('Play 1,000 rounds', 'data-k class="w-btn primary"')}${btn('Reset', 'data-reset')}</div>
      <div class="w-panel" data-o="round" style="margin:8px 0">Press play.</div>
      <div class="w-hist" data-o="h"></div><p class="w-note">Lines to beat: classical max 75%, quantum max cos²(π/8) ≈ 85.4% (the Tsirelson bound).</p>`;
    let cw = 0, qw = 0, n = 0;
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    const A = [0, Math.PI / 4], B = [Math.PI / 8, -Math.PI / 8];
    function round() {
      const x = Math.random() < 0.5 ? 0 : 1, y = Math.random() < 0.5 ? 0 : 1, goal = x & y;
      const cl = (0 ^ 0) === goal;
      const a = Math.random() < 0.5 ? 0 : 1, same = Math.random() < Math.pow(Math.cos(A[x] - B[y]), 2), bq = same ? a : 1 - a;
      const qu = (a ^ bq) === goal;
      n++; if (cl) cw++; if (qu) qw++;
      return { x, y, a, bq, cl, qu, goal };
    }
    function draw() {
      hist(o('h'), [{ l: 'classic', v: n ? cw / n : 0, t: n ? pct(cw / n) : '–' }, { l: 'quantum', v: n ? qw / n : 0, t: n ? pct(qw / n) : '–', alt: 1 }]);
    }
    b.querySelector('[data-one]').addEventListener('click', () => {
      const r = round();
      o('round').innerHTML = `x = ${r.x}, y = ${r.y} → they need a ⊕ b = ${r.goal}.<br>Classical plan "always answer 0": a = 0, b = 0 → ${r.cl ? '✅ win' : '❌ lose'}<br>Entangled pair measured at clever angles: a = ${r.a}, b = ${r.bq} → ${r.qu ? '✅ win' : '❌ lose'}`;
      draw(); played(b);
    });
    b.querySelector('[data-k]').addEventListener('click', () => { for (let i = 0; i < 1000; i++) round(); o('round').textContent = `${comma(n)} rounds played so far.`; draw(); played(b); });
    b.querySelector('[data-reset]').addEventListener('click', () => { cw = qw = n = 0; o('round').textContent = 'Press play.'; draw(); });
    draw();
  };

  /* ================================================================ 10.1 ripples */
  W['ripples'] = (b) => {
    b.innerHTML = `<canvas class="w-canvas" aria-label="Interference of ripples. Tap to add a pebble."></canvas>
      <div class="w-controls">${btn('Two pebbles', 'data-two')}${btn('Clear pond', 'data-clear')}<span class="w-pill" data-o="n"></span></div>
      <p class="w-note">Violet = crest, coral = trough. The calm lines between them are where waves cancel (destructive interference).</p>`;
    const cv = b.querySelector('canvas'), GW = 160, GH = 90, off = document.createElement('canvas');
    off.width = GW; off.height = GH;
    const octx = off.getContext('2d'), img = octx.createImageData(GW, GH);
    let src = [[0.38, 0.5], [0.62, 0.5]], t = 0, raf = 0, vis = false, Wd = 0, Hd = 0, ctx;
    const hex = (h) => { const m = h.replace('#', '').match(/.{2}/g); return m ? m.map((x) => parseInt(x, 16)) : [128, 128, 128]; };
    let cols = null;
    function readCols() { const P = palette(); cols = { a: hex(P.violet), b: hex(P.coral), z: hex(P.paper) }; }
    function frame() {
      raf = 0; if (!vis) return;
      t += 0.12;
      const d = img.data, k = 0.55;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        let v = 0;
        for (const [sx, sy] of src) { const r = Math.hypot(x - sx * GW, y - sy * GH); v += Math.sin(k * r - t) / (1 + r * 0.035); }
        v = clamp(v / Math.max(1, src.length * 0.7), -1, 1);
        const c = v > 0 ? cols.a : cols.b, w = Math.abs(v), i = (y * GW + x) * 4;
        d[i] = cols.z[0] + (c[0] - cols.z[0]) * w; d[i + 1] = cols.z[1] + (c[1] - cols.z[1]) * w; d[i + 2] = cols.z[2] + (c[2] - cols.z[2]) * w; d[i + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, Wd, Hd);
      const P = palette(); ctx.fillStyle = P.ink;
      src.forEach(([sx, sy]) => { ctx.beginPath(); ctx.arc(sx * Wd, sy * Hd, 5, 0, TAU); ctx.fill(); });
      raf = requestAnimationFrame(frame);
    }
    function resize() { Wd = b.clientWidth - 4; Hd = Math.round(Wd * GH / GW); ctx = setupCanvas(cv, Wd, Hd); }
    const cnt = () => { b.querySelector('[data-o="n"]').textContent = `${src.length} pebble${src.length === 1 ? '' : 's'} (max 5)`; };
    cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(); src.push([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]); if (src.length > 5) src.shift(); cnt(); played(b); });
    b.querySelector('[data-two]').addEventListener('click', () => { src = [[0.38, 0.5], [0.62, 0.5]]; cnt(); });
    b.querySelector('[data-clear]').addEventListener('click', () => { src = []; cnt(); });
    readCols(); resize(); cnt();
    window.addEventListener('resize', resize); document.addEventListener('qsk:theme', readCols);
    whenVisible(b, () => { vis = true; if (!raf) raf = requestAnimationFrame(frame); }, () => { vis = false; });
  };

  /* ================================================================ 11.3 Bernstein–Vazirani */
  W['bv'] = (b) => {
    b.innerHTML = `<div class="w-controls"><span class="w-label">Hidden string s (tap bits):</span><span class="w-flex" data-o="bits"></span>${btn('+ bit', 'data-add')}${btn('− bit', 'data-rem')}</div>
      <div class="w-split"><div class="w-panel"><h4>🐢 Classical: one bit per question</h4><div class="w-controls">${btn('Ask next question', 'data-cq')}</div><div class="w-mono" data-o="cl"></div></div>
      <div class="w-panel"><h4>⚡ Quantum: one query, total</h4><div class="w-controls">${btn('Run the circuit once', 'data-qq class="w-btn primary"')}</div><div data-o="qu"></div></div></div>`;
    let s = [1, 0, 1], asked = [];
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function drawBits() { o('bits').innerHTML = s.map((x, i) => `<button type="button" class="w-qubit small" data-i="${i}">${x}</button>`).join(''); asked = []; o('cl').innerHTML = ''; o('qu').innerHTML = ''; }
    o('bits').addEventListener('click', (e) => { const t = e.target.closest('[data-i]'); if (t) { s[+t.dataset.i] ^= 1; drawBits(); } });
    b.querySelector('[data-add]').addEventListener('click', () => { if (s.length < 6) { s.push(Math.random() < 0.5 ? 0 : 1); drawBits(); } });
    b.querySelector('[data-rem]').addEventListener('click', () => { if (s.length > 2) { s.pop(); drawBits(); } });
    b.querySelector('[data-cq]').addEventListener('click', () => {
      if (asked.length >= s.length) return;
      const i = asked.length, x = s.map((_, j) => (j === i ? 1 : 0)).join('');
      asked.push(`f(${x}) = ${s[i]}  → s${'₁₂₃₄₅₆'[i]} = ${s[i]}`);
      o('cl').innerHTML = asked.join('<br>') + `<br><b>${asked.length} of ${s.length} queries${asked.length === s.length ? ` → s = ${s.join('')}` : ''}</b>`; played(b);
    });
    b.querySelector('[data-qq]').addEventListener('click', () => {
      const n = s.length, st = new Q.State(n + 1);
      st.gate(Q.G.X, n).gate(Q.G.H, n); for (let q = 0; q < n; q++) st.gate(Q.G.H, q);
      const after = st.clone();
      s.forEach((bit, q) => { if (bit) st.cnot(q, n); });
      const signs = st.clone(); void after;
      for (let q = 0; q < n; q++) st.gate(Q.G.H, q);
      const p = st.probs(); let best = 0; p.forEach((v, i) => { if (v > p[best]) best = i; });
      const res = st.label(best).slice(0, n);
      let table = '';
      if (n <= 4) {
        const rows = [];
        for (let x = 0; x < (1 << n); x++) { const xs = x.toString(2).padStart(n, '0'); const dot = xs.split('').reduce((a, c, j) => a ^ (c === '1' ? s[j] : 0), 0); rows.push(`<tr><td>${xs}</td><td>${dot}</td><td>${dot ? '−' : '+'}</td></tr>`); }
        table = `<div class="w-scroll"><table class="w-table"><tr><th>x</th><th>s·x</th><th>sign</th></tr>${rows.join('')}</table></div>`;
      }
      void signs;
      o('qu').innerHTML = `${table}<p>After the final Hadamards, measuring the input qubits gives <span class="w-pill good">${res}</span> with ${pct(p.filter((v, i) => st.label(i).slice(0, n) === res).reduce((a, c) => a + c, 0), 0)} probability. <b>1 query.</b></p>`;
      played(b);
    });
    drawBits();
  };

  /* ================================================================ 12.2 QFT period finder */
  W['qft-period'] = (b) => {
    const N = 16, rr = range('Period r', 1, 8, 1, 4), ro = range('Offset', 0, 7, 1, 1);
    b.append(rr.el, ro.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-split"><div class="w-panel"><h4>Before: a periodic state (16 slots)</h4><svg class="w-svg" viewBox="0 0 320 130" data-o="a"></svg></div>
      <div class="w-panel"><h4>After the QFT: probabilities</h4><svg class="w-svg" viewBox="0 0 320 130" data-o="f"></svg></div></div><p class="w-note" data-o="note"></p>`);
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function bars(svg, vals, color) {
      const mx = Math.max(...vals, 1e-9);
      svg.innerHTML = vals.map((v, i) => { const h = (v / mx) * 100; return `<rect x="${i * 20 + 3}" y="${110 - h}" width="14" height="${h}" rx="2" fill="${color}" stroke="var(--ink)" stroke-width="1.5"/><text x="${i * 20 + 10}" y="125" font-size="9" text-anchor="middle">${i}</text>`; }).join('')
        + '<line x1="0" y1="110" x2="320" y2="110" stroke="var(--ink)" stroke-width="2"/>';
    }
    function upd() {
      const r = rr.get(); ro.input.max = r - 1; if (ro.get() > r - 1) ro.set(r - 1);
      const off = ro.get(), xs = []; for (let x = off; x < N; x += r) xs.push(x);
      const amp = 1 / Math.sqrt(xs.length), a = new Array(N).fill(0); xs.forEach((x) => { a[x] = amp; });
      const F = []; for (let k = 0; k < N; k++) { let re = 0, im = 0; xs.forEach((x) => { re += amp * Math.cos(TAU * x * k / N); im += amp * Math.sin(TAU * x * k / N); }); F.push((re * re + im * im) / N); }
      bars(o('a'), a.map((v) => v * v), 'var(--violet)'); bars(o('f'), F, 'var(--sun)');
      const peaks = F.map((v, k) => [v, k]).filter(([v]) => v > 0.02).map(([, k]) => k);
      o('note').textContent = N % r === 0
        ? `Peaks only at k = ${peaks.join(', ')}: multiples of N/r = 16/${r} = ${N / r}. Change the offset: the peaks don't move, only the hidden phases do. Read the spacing, get r.`
        : `r = ${r} doesn't divide 16, so the peaks sit near multiples of 16/${r} ≈ ${(N / r).toFixed(2)}. That's why Shor uses extra qubits and continued fractions to recover r.`;
      played(b);
    }
    [rr, ro].forEach((x) => x.input.addEventListener('input', upd)); upd();
  };

  /* ================================================================ 13.2 toy RSA */
  W['rsa-toy'] = (b) => {
    b.innerHTML = `<div class="w-controls"><label class="w-label">p <input class="w-input" data-v="p" value="5" inputmode="numeric"></label><label class="w-label">q <input class="w-input" data-v="q" value="11" inputmode="numeric"></label>
      <label class="w-label">e <input class="w-input" data-v="e" value="3" inputmode="numeric"></label><label class="w-label">message m <input class="w-input" data-v="m" value="7" inputmode="numeric"></label></div>
      <ol class="w-steps" data-o="s"></ol>`;
    const bi = (x) => BigInt(x);
    const modpow = (a, e, m) => { let r = 1n; a %= m; while (e > 0n) { if (e & 1n) r = (r * a) % m; a = (a * a) % m; e >>= 1n; } return r; };
    const gcd = (a, c) => { while (c) [a, c] = [c, a % c]; return a; };
    const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
    const inv = (a, m) => { let [r0, r1, s0, s1] = [bi(m), bi(a), 0n, 1n]; while (r1) { const qq = r0 / r1; [r0, r1] = [r1, r0 - qq * r1]; [s0, s1] = [s1, s0 - qq * s1]; } return r0 === 1n ? ((s0 % bi(m)) + bi(m)) % bi(m) : null; };
    function upd() {
      const v = {}; b.querySelectorAll('[data-v]').forEach((x) => { v[x.dataset.v] = parseInt(x.value, 10); });
      const L = [];
      if (![v.p, v.q, v.e, v.m].every((x) => Number.isInteger(x) && x > 0) || v.p > 50000 || v.q > 50000) { b.querySelector('[data-o="s"]').innerHTML = '<li class="no">Use positive whole numbers (primes below 50,000).</li>'; return; }
      if (!isPrime(v.p) || !isPrime(v.q) || v.p === v.q) { b.querySelector('[data-o="s"]').innerHTML = `<li class="no">p and q must be two different primes. ${isPrime(v.p) ? '' : v.p + ' is not prime. '}${isPrime(v.q) ? '' : v.q + ' is not prime.'}</li>`; return; }
      const N = v.p * v.q, phi = (v.p - 1) * (v.q - 1);
      L.push(['ok', `Public modulus N = ${v.p} × ${v.q} = <b>${N}</b>`]);
      L.push(['ok', `φ = (p − 1)(q − 1) = ${v.p - 1} × ${v.q - 1} = <b>${phi}</b>`]);
      if (gcd(v.e, phi) !== 1) { L.push(['no', `e = ${v.e} shares a factor with ${phi}. Pick another e (try 3, 5, 7, 17...).`]); }
      else {
        const d = inv(v.e, phi);
        L.push(['ok', `Private key d = ${d}, since ${v.e} × ${d} = ${bi(v.e) * d} = ${(bi(v.e) * d - 1n) / bi(phi)} × ${phi} + 1`]);
        if (v.m >= N) L.push(['no', `The message must be smaller than N = ${N}.`]);
        else {
          const c = modpow(bi(v.m), bi(v.e), bi(N));
          L.push(['ok', `Encrypt: c = ${v.m}^${v.e} mod ${N} = <b>${c}</b>`]);
          L.push(['ok', `Decrypt: ${c}^${d} mod ${N} = <b>${modpow(c, d, bi(N))}</b> ✓`]);
        }
      }
      L.push(['', `An attacker who can factor ${N} gets φ and d. For ${N} that's instant. A real key's N has 617 digits.`]);
      b.querySelector('[data-o="s"]').innerHTML = L.map(([c, t]) => `<li class="${c}">${t}</li>`).join('');
      played(b);
    }
    b.querySelectorAll('[data-v]').forEach((x) => x.addEventListener('input', upd)); upd();
  };

  /* ================================================================ 13.4 Shor (classical reduction) */
  W['shor'] = (b) => {
    b.innerHTML = `<div class="w-controls"><label class="w-label">N <input class="w-input" data-v="N" value="15" inputmode="numeric"></label><label class="w-label">a <input class="w-input" data-v="a" value="7" inputmode="numeric"></label>
      ${btn('🎲 random a', 'data-rand')}</div><div class="w-controls">${[[15, 7], [21, 2], [35, 2], [15, 14], [91, 3], [143, 5]].map(([n, a]) => btn(`N=${n}, a=${a}`, `data-pr="${n},${a}"`)).join('')}</div>
      <div class="w-chips" data-o="pw"></div><ol class="w-steps" data-o="s"></ol>`;
    const gcd = (x, y) => { while (y) [x, y] = [y, x % y]; return x; };
    const iN = b.querySelector('[data-v="N"]'), iA = b.querySelector('[data-v="a"]');
    function upd() {
      const N = parseInt(iN.value, 10), a = parseInt(iA.value, 10), L = [], o = (k) => b.querySelector(`[data-o="${k}"]`);
      o('pw').innerHTML = '';
      if (!(N > 3 && N < 1e6 && a > 1 && a < N)) { o('s').innerHTML = '<li class="no">Pick N between 4 and 999,999 and 1 &lt; a &lt; N.</li>'; return; }
      if (N % 2 === 0) { o('s').innerHTML = `<li class="ok">N is even, so 2 is a factor: ${N} = 2 × ${N / 2}. (Shor is for odd N.)</li>`; return; }
      let prime = true; for (let i = 3; i * i <= N; i += 2) if (N % i === 0) { prime = false; break; }
      if (prime) { o('s').innerHTML = `<li class="no">${N} is prime. Nothing to factor!</li>`; return; }
      const g = gcd(a, N);
      if (g !== 1) { o('s').innerHTML = `<li class="ok">Lucky! gcd(${a}, ${N}) = ${g}, already a factor: ${N} = ${g} × ${N / g}.</li>`; return; }
      L.push(['ok', `1. gcd(${a}, ${N}) = 1, so keep going.`]);
      const pw = [1]; let x = 1, r = 0;
      for (let k = 1; k <= 5000; k++) { x = (x * a) % N; pw.push(x); if (x === 1) { r = k; break; } }
      o('pw').innerHTML = pw.slice(0, 40).map((v, i) => `<span class="w-chip ${v === 1 ? 'hot' : ''}">${a}${sup(i)} ≡ ${v}</span>`).join('') + (pw.length > 40 ? '<span class="w-chip">…</span>' : '');
      L.push(['ok', `2. Powers of ${a} mod ${N} repeat after <b>r = ${r}</b>. (This is the step a quantum computer does with the QFT; here we just list powers.)`]);
      if (r % 2) { L.push(['no', `3. r = ${r} is odd. Pick another a and try again.`]); }
      else {
        let h = 1; for (let k = 0; k < r / 2; k++) h = (h * a) % N;
        if (h === N - 1) L.push(['no', `3. a^(r/2) mod N = ${h}, which is −1 (mod ${N}). Unlucky: pick another a.`]);
        else {
          L.push(['ok', `3. r is even and a^(r/2) mod N = ${h} ≠ ${N - 1} (that would be −1).`]);
          const f1 = gcd(h - 1 + N, N), f2 = gcd(h + 1, N);
          L.push(['ok', `4. gcd(${h} − 1, ${N}) = <b>${f1}</b> and gcd(${h} + 1, ${N}) = <b>${f2}</b>  →  <b>${N} = ${f1} × ${N / f1}</b> ✓`]);
        }
      }
      o('s').innerHTML = L.map(([c, t]) => `<li class="${c}">${t}</li>`).join(''); played(b);
    }
    [iN, iA].forEach((x) => x.addEventListener('input', upd));
    b.querySelectorAll('[data-pr]').forEach((x) => x.addEventListener('click', () => { const [n, a] = x.dataset.pr.split(','); iN.value = n; iA.value = a; upd(); }));
    b.querySelector('[data-rand]').addEventListener('click', () => { const N = parseInt(iN.value, 10) || 15; iA.value = 2 + Math.floor(Math.random() * Math.max(1, N - 3)); upd(); });
    upd();
  };

  /* ================================================================ 14 Grover */
  W['grover'] = (b) => {
    b.innerHTML = `<div class="w-controls"><span class="w-label">Items N:</span>${[4, 8, 16, 32, 64].map((n) => btn(n, `data-n="${n}"`)).join('')}</div>
      <svg class="w-svg" viewBox="0 0 640 230" data-o="svg" style="cursor:pointer" aria-label="Amplitude bars. Tap a bar to mark it."></svg>
      <div class="w-controls">${btn('1. Oracle: flip the sign', 'data-op="o"')}${btn('2. Diffusion: invert about the mean', 'data-op="d"')}${btn('Full iteration ⟳', 'data-op="it" class="w-btn primary"')}${btn('Measure', 'data-op="m"')}${btn('Reset', 'data-op="r"')}</div>
      <div class="w-split"><div class="w-stats" data-o="st"></div><svg class="w-svg" viewBox="0 0 200 140" data-o="geo" style="max-width:240px;justify-self:center"></svg></div>
      <p class="w-note" data-o="note"></p>`;
    let N = 8, mk = 5, amp = [], k = 0, phase = 'o';
    const o = (q) => b.querySelector(`[data-o="${q}"]`);
    const theta = () => Math.asin(1 / Math.sqrt(N)), kopt = () => Math.max(1, Math.round(Math.PI / (4 * theta()) - 0.5));
    function reset() { amp = new Array(N).fill(1 / Math.sqrt(N)); k = 0; phase = 'o'; draw('Equal superposition: every item has amplitude 1/√N. Tap a bar to choose the marked item.'); }
    function draw(note) {
      const w = 600 / N, mean = amp.reduce((a, c) => a + c, 0) / N, base = 120, sc = 100;
      let s = `<line x1="20" y1="${base}" x2="620" y2="${base}" stroke="var(--ink)" stroke-width="2"/>`;
      amp.forEach((a, i) => {
        const h = a * sc, y = h >= 0 ? base - h : base;
        s += `<rect data-i="${i}" x="${20 + i * w + w * 0.12}" y="${y}" width="${w * 0.76}" height="${Math.max(1, Math.abs(h))}" rx="${Math.min(4, w / 6)}" fill="${i === mk ? 'var(--coral)' : 'var(--violet)'}" stroke="var(--ink)" stroke-width="${N > 32 ? 0.8 : 1.6}"/>`;
        if (N <= 16) s += `<text x="${20 + i * w + w / 2}" y="${base + 108}" font-size="${N <= 8 ? 12 : 9}" text-anchor="middle">${i.toString(2).padStart(Math.log2(N), '0')}</text>`;
      });
      s += `<line x1="20" y1="${base - mean * sc}" x2="620" y2="${base - mean * sc}" stroke="var(--teal)" stroke-width="2.5" stroke-dasharray="7 6"/><text x="622" y="${base - mean * sc - 4}" font-size="12" text-anchor="end" fill="var(--teal-ink)">mean</text>`;
      o('svg').innerHTML = s;
      const p = amp[mk] * amp[mk];
      o('st').innerHTML = `<div class="w-stat"><b>${k}</b><span>iterations done</span></div><div class="w-stat"><b>${pct(p)}</b><span>P(marked item)</span></div>
        <div class="w-stat"><b>${kopt()}</b><span>best ≈ (π/4)√N</span></div><div class="w-stat"><b>${comma(N / 2)}</b><span>classical checks (average)</span></div>`;
      const ar = (1 - amp[mk] * amp[mk]) > 1e-12 ? amp[(mk + 1) % N] * Math.sqrt(N - 1) : 0, ang = Math.atan2(amp[mk], ar);
      const cx = 30, cy = 120, R = 95;
      o('geo').innerHTML = `<line x1="${cx}" y1="${cy}" x2="${cx + R + 10}" y2="${cy}" stroke="var(--ink)" stroke-width="2"/><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R - 10}" stroke="var(--ink)" stroke-width="2"/>
        <path d="M${cx + R} ${cy} A${R} ${R} 0 0 0 ${cx} ${cy - R}" fill="none" stroke="var(--ink-3)" stroke-dasharray="4 5"/>
        <line x1="${cx}" y1="${cy}" x2="${cx + R * Math.cos(ang)}" y2="${cy - R * Math.sin(ang)}" stroke="var(--coral)" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${cx + R * Math.cos(ang)}" cy="${cy - R * Math.sin(ang)}" r="6" fill="var(--coral)" stroke="var(--ink)" stroke-width="2"/>
        <text x="${cx + R + 6}" y="${cy + 16}" font-size="12" text-anchor="end">|rest⟩</text><text x="${cx + 6}" y="${cy - R - 2}" font-size="12">|w⟩</text>
        <text x="${cx + 40}" y="${cy - 8}" font-size="11">${(ang * 180 / Math.PI).toFixed(1)}°</text>`;
      if (note) o('note').textContent = note;
      b.querySelector('[data-op="o"]').disabled = phase !== 'o'; b.querySelector('[data-op="d"]').disabled = phase !== 'd';
    }
    function oracle() { amp[mk] = -amp[mk]; phase = 'd'; draw('Oracle: the marked item\'s sign flipped. It\'s now below the axis, which pulls the mean (dashed line) down a little.'); }
    function diffuse() {
      const mean = amp.reduce((a, c) => a + c, 0) / N; amp = amp.map((a) => 2 * mean - a); k++; phase = 'o';
      const p = amp[mk] * amp[mk];
      draw(k > kopt() ? `🙃 Overshoot! After ${k} iterations P = ${pct(p)}. The state rotated past the answer. Best was ${kopt()} iteration${kopt() > 1 ? 's' : ''}.`
        : `Diffusion: new = 2 × mean − old. The marked item jumps up to ${amp[mk].toFixed(3)} (P = ${pct(p)}).${k === kopt() ? ' 🎯 This is the sweet spot: measure now!' : ''}`);
    }
    b.addEventListener('click', (e) => {
      const op = e.target.closest('[data-op]')?.dataset.op; const nb = e.target.closest('[data-n]'); const bar = e.target.closest('rect[data-i]');
      if (nb) { N = +nb.dataset.n; mk = Math.floor(Math.random() * N); b.querySelectorAll('[data-n]').forEach((x) => x.classList.toggle('on', x === nb)); reset(); return; }
      if (bar) { mk = +bar.dataset.i; reset(); return; }
      if (!op) return;
      if (op === 'o' && phase === 'o') oracle();
      else if (op === 'd' && phase === 'd') diffuse();
      else if (op === 'it') { if (phase === 'o') oracle(); diffuse(); }
      else if (op === 'm') { const r = Math.random(); let acc = 0, got = N - 1; for (let i = 0; i < N; i++) { acc += amp[i] * amp[i]; if (r < acc) { got = i; break; } } draw(got === mk ? `📏 Measured item ${got}: found it! 🎉` : `📏 Measured item ${got}: not the marked one (${mk}). Try iterating more, or fewer!`); }
      else if (op === 'r') reset();
      played(b);
    });
    b.querySelector('[data-n="8"]').classList.add('on'); reset();
  };

  /* ================================================================ 16.2 VQE */
  W['vqe'] = (b) => {
    const rl = range('Step size η', 0.1, 1.2, 0.1, 0.4, (v) => v.toFixed(1)), r0 = range('Start θ', 0, 6.2, 0.1, 0.1, (v) => v.toFixed(1));
    b.append(rl.el, r0.el);
    b.insertAdjacentHTML('beforeend', `<svg class="w-svg" viewBox="0 0 640 220" data-o="plot"></svg>
      <div class="w-controls">${btn('Step', 'data-step')}${btn('Run 30 steps', 'data-run class="w-btn primary"')}${btn('Reset', 'data-reset')}</div>
      <div class="w-stats" data-o="st"></div><p class="w-note" data-o="note"></p>`);
    const E = Math.cos, o = (k) => b.querySelector(`[data-o="${k}"]`);
    let th = 0.1, n = 0, timer = 0, last = null;
    const X = (t) => 30 + (t / TAU) * 580, Y = (e) => 110 - e * 85;
    function draw() {
      let path = ''; for (let i = 0; i <= 200; i++) { const t = (i / 200) * TAU; path += `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(E(t)).toFixed(1)}`; }
      let s = `<line x1="30" y1="${Y(0)}" x2="610" y2="${Y(0)}" stroke="var(--ink-3)" stroke-dasharray="4 5"/><path d="${path}" fill="none" stroke="var(--ink)" stroke-width="3"/>
        <text x="32" y="${Y(1) - 6}" font-size="12">E = +1</text><text x="${X(Math.PI) - 20}" y="${Y(-1) + 18}" font-size="12">E = −1 at θ = π</text>`;
      if (last) [last.p, last.m].forEach(([t, e]) => { const tt = ((t % TAU) + TAU) % TAU; s += `<circle cx="${X(tt)}" cy="${Y(e)}" r="5" fill="var(--sun)" stroke="var(--ink)" stroke-width="1.5"/>`; });
      s += `<circle cx="${X(th)}" cy="${Y(E(th))}" r="10" fill="var(--coral)" stroke="var(--ink)" stroke-width="2.5"/>`;
      o('plot').innerHTML = s;
      o('st').innerHTML = `<div class="w-stat"><b>${n}</b><span>steps</span></div><div class="w-stat"><b>${th.toFixed(3)}</b><span>θ</span></div><div class="w-stat"><b>${E(th).toFixed(4)}</b><span>energy E(θ) = ⟨Z⟩</span></div>`;
    }
    function step() {
      const ep = E(th + Math.PI / 2), em = E(th - Math.PI / 2), g = (ep - em) / 2;
      last = { p: [th + Math.PI / 2, ep], m: [th - Math.PI / 2, em] };
      th = clamp(th - rl.get() * g, 0, TAU); n++;
      o('note').textContent = `Parameter shift: dE/dθ = [E(θ+π/2) − E(θ−π/2)] / 2 = [${ep.toFixed(3)} − (${em.toFixed(3)})] / 2 = ${g.toFixed(3)}. New θ = θ − η·gradient.`;
      draw(); played(b);
    }
    b.querySelector('[data-step]').addEventListener('click', step);
    b.querySelector('[data-run]').addEventListener('click', () => { clearInterval(timer); let c = 0; timer = setInterval(() => { step(); if (++c >= 30) clearInterval(timer); }, 120); });
    const reset = () => { clearInterval(timer); th = r0.get(); n = 0; last = null; o('note').textContent = 'The hill is E(θ) = cos θ. The ball is our current guess. Two shifted runs of the same circuit give the slope.'; draw(); };
    b.querySelector('[data-reset]').addEventListener('click', reset); r0.input.addEventListener('input', reset);
    reset();
  };

  /* ================================================================ 16.4 MaxCut */
  W['maxcut'] = (b) => {
    b.innerHTML = `<div class="w-split"><svg class="w-svg" viewBox="0 0 260 220" data-o="g" style="max-width:300px;justify-self:center"></svg>
      <div><p class="w-big" data-o="score"></p><div class="w-controls">${btn('Brute force all 16', 'data-bf')}${btn('Reset', 'data-r')}</div><div data-o="bf"></div></div></div>
      <p class="w-note">Tap a node to flip its colour. A cut edge connects two different colours.</p>`;
    const pos = [[60, 50], [200, 50], [200, 170], [60, 170]], E = [[0, 1], [1, 2], [2, 3], [3, 0]];
    let c = [0, 0, 0, 0];
    const cut = (cc) => E.filter(([a, d]) => cc[a] !== cc[d]).length;
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function draw() {
      let s = '';
      E.forEach(([a, d]) => { const isCut = c[a] !== c[d]; s += `<line x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[d][0]}" y2="${pos[d][1]}" stroke="${isCut ? 'var(--coral)' : 'var(--ink-3)'}" stroke-width="${isCut ? 7 : 3}" stroke-linecap="round" ${isCut ? '' : 'stroke-dasharray="6 6"'}/>`; });
      pos.forEach(([x, y], i) => { s += `<g data-i="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="26" fill="${c[i] ? '#26243A' : '#FFFDF8'}" stroke="var(--ink)" stroke-width="3"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="16" style="fill:${c[i] ? '#FFFDF8' : '#26243A'}">${i}</text></g>`; });
      o('g').innerHTML = s;
      const k = cut(c);
      o('score').innerHTML = `Colouring <b>${c.join('')}</b> cuts <b>${k}</b> of 4 edges ${k === 4 ? '🎉 maximum!' : ''}`;
    }
    o('g').addEventListener('click', (e) => { const g = e.target.closest('[data-i]'); if (g) { c[+g.dataset.i] ^= 1; draw(); played(b); } });
    b.querySelector('[data-bf]').addEventListener('click', () => {
      const rows = []; for (let m = 0; m < 16; m++) { const cc = m.toString(2).padStart(4, '0').split('').map(Number); rows.push([cc.join(''), cut(cc)]); }
      rows.sort((x, y) => y[1] - x[1]);
      o('bf').innerHTML = `<div class="w-chips">${rows.map(([s, k]) => `<span class="w-chip ${k === 4 ? 'hot' : ''}">${s}: ${k}</span>`).join('')}</div><p class="w-note">16 options is easy. With 300 nodes there are 2³⁰⁰. QAOA hunts for good ones using phases + mixing.</p>`; played(b);
    });
    b.querySelector('[data-r]').addEventListener('click', () => { c = [0, 0, 0, 0]; o('bf').innerHTML = ''; draw(); });
    draw();
  };

  /* ================================================================ 18.2 complexity map */
  W['complexity'] = (b) => {
    const info = {
      PSPACE: ['PSPACE', 'Problems solvable with polynomial memory (possibly exponential time). Everything below lives inside it.'],
      NP: ['NP', 'Problems whose solutions can be checked efficiently (e.g. sudoku, factoring).'],
      NPC: ['NP-complete', 'The hardest problems in NP. If one is easy, all of NP is (e.g. SAT, travelling salesman decision version, graph colouring). Believed NOT to be in BQP.'],
      BQP: ['BQP', 'Problems a quantum computer solves efficiently with high probability. Includes quantum simulation and sampling problems.'],
      P: ['P, BPP', 'P: problems a classical computer solves efficiently. BPP: the same, with randomness, with high probability. P ⊆ BPP ⊆ BQP is proven.'],
      FAC: ['Factoring & discrete log', 'In NP and in BQP (Shor), but not believed to be NP-complete. It has special structure, which is exactly what Shor exploits.'],
      SIM: ['Quantum simulation, sampling', 'Believed to be in BQP but outside NP: problems where quantum computers shine but answers can\'t necessarily be checked classically.'],
    };
    b.innerHTML = `<svg class="w-svg" viewBox="0 0 640 380" data-o="svg" role="img" aria-label="Nested complexity classes">
      <rect data-k="PSPACE" x="8" y="8" width="624" height="364" rx="40" fill="color-mix(in srgb, var(--slate) 14%, var(--card))" stroke="var(--ink)" stroke-width="3"/>
      <ellipse data-k="NP" cx="240" cy="200" rx="200" ry="148" fill="color-mix(in srgb, var(--coral) 22%, transparent)" stroke="var(--ink)" stroke-width="3"/>
      <ellipse data-k="BQP" cx="408" cy="206" rx="196" ry="136" fill="color-mix(in srgb, var(--violet) 22%, transparent)" stroke="var(--ink)" stroke-width="3"/>
      <ellipse data-k="NPC" cx="128" cy="200" rx="76" ry="96" fill="color-mix(in srgb, var(--coral) 45%, var(--card))" stroke="var(--ink)" stroke-width="2.5"/>
      <ellipse data-k="P" cx="318" cy="226" rx="66" ry="46" fill="color-mix(in srgb, var(--teal) 45%, var(--card))" stroke="var(--ink)" stroke-width="2.5"/>
      <g data-k="FAC"><circle cx="330" cy="130" r="13" fill="var(--sun)" stroke="var(--ink)" stroke-width="2.5"/><text x="350" y="122" font-size="14">factoring</text></g>
      <g data-k="SIM"><circle cx="520" cy="250" r="13" fill="var(--sky)" stroke="var(--ink)" stroke-width="2.5"/><text x="468" y="284" font-size="14">simulation</text></g>
      <text x="28" y="40" font-size="18" font-weight="700">PSPACE</text><text x="200" y="76" font-size="18" font-weight="700">NP</text>
      <text x="540" y="140" font-size="18" font-weight="700">BQP</text><text x="78" y="196" font-size="15" font-weight="700">NP-</text><text x="62" y="214" font-size="15" font-weight="700">complete</text>
      <text x="290" y="232" font-size="16" font-weight="700">P, BPP</text></svg>
      <div class="w-panel" data-o="info" aria-live="polite"><b>Tap a region.</b> (The believed picture: most of these separations are unproven.)</div>`;
    const svg = b.querySelector('svg');
    const show = (k) => { const [t, d] = info[k]; b.querySelector('[data-o="info"]').innerHTML = `<b>${t}</b>: ${d}`; svg.querySelectorAll('[data-k]').forEach((x) => { x.style.filter = x.dataset.k === k ? 'drop-shadow(0 0 6px var(--sun))' : ''; }); played(b); };
    svg.addEventListener('click', (e) => { const t = e.target.closest('[data-k]'); if (t) show(t.dataset.k); });
    svg.addEventListener('mousemove', (e) => { const t = e.target.closest('[data-k]'); if (t) svg.style.cursor = 'pointer'; });
  };

  /* ================================================================ 19.4 fidelity snowball */
  W['fidelity'] = (b) => {
    const re = range('Error per gate', -6, -1, 0.1, -3, (v) => `${sci(Math.pow(10, v) * 100, 1)}%`);
    const rg = range('Number of gates', 1, 12, 0.1, 3, (v) => comma(Math.pow(10, v)));
    b.append(re.el, rg.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-controls">${btn("Today's best (0.1%)", 'data-p="-3,3"')}${btn('10,000 gates', 'data-p="-3,4"')}${btn('Shor-scale (10⁹ gates)', 'data-p="-3,9"')}${btn('What Shor needs (10⁻¹²)', 'data-p="-12,9"')}</div>
      <div class="w-stats"><div class="w-stat"><b data-o="F"></b><span>gate fidelity F</span></div><div class="w-stat"><b data-o="S"></b><span>chance the whole circuit is error-free ≈ F^G</span></div></div>
      <div class="w-hbar" style="height:26px"><i data-o="bar"></i></div><p class="w-note" data-o="note"></p>`);
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function upd() {
      const e = Math.pow(10, re.get()), G = Math.pow(10, rg.get()), lnS = G * Math.log1p(-e), S = Math.exp(lnS);
      o('F').textContent = `${(100 - e * 100).toFixed(Math.max(1, Math.ceil(-re.get() - 1e-9) - 2))}%`;
      o('S').textContent = S > 1e-4 ? pct(S, S > 0.1 ? 1 : 3) : `≈ 10${sup(Math.round(lnS / Math.LN10))}`;
      o('bar').style.width = `${S * 100}%`;
      o('note').textContent = S < 0.01 ? 'Effectively zero. Useful algorithms need billions of operations, so they need error rates around 10⁻⁹ to 10⁻¹², far below any physical qubit. Enter error correction.' : S > 0.9 ? 'Comfortable. Now add more gates...' : 'Every extra gate multiplies in another chance of failure.';
      played(b);
    }
    re.input.addEventListener('input', upd); rg.input.addEventListener('input', upd);
    b.querySelectorAll('[data-p]').forEach((x) => x.addEventListener('click', () => { const [a, c] = x.dataset.p.split(',').map(Number); re.input.min = Math.min(-12, a); re.set(a); rg.set(c); upd(); }));
    re.input.min = -12; upd();
  };

  /* ================================================================ 20.2 repetition code */
  W['repetition'] = (b) => {
    const rp = range('Physical flip probability p', -3, Math.log10(0.5), 0.01, -2, (v) => pct(Math.pow(10, v), 2));
    b.append(rp.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-hist" data-o="h"></div><div class="w-stats" data-o="st"></div><p class="w-note" data-o="note"></p>`);
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    const C5 = [1, 5, 10, 10, 5, 1];
    function upd() {
      const p = Math.pow(10, rp.get()), f3 = 3 * p * p * (1 - p) + p * p * p;
      let f5 = 0; for (let k = 3; k <= 5; k++) f5 += C5[k] * Math.pow(p, k) * Math.pow(1 - p, 5 - k);
      const mx = p;
      hist(o('h'), [{ l: '1 bit', v: p / mx, t: pct(p, 3) }, { l: '3 bits', v: f3 / mx, t: pct(f3, 4), alt: 1 }, { l: '5 bits', v: f5 / mx, t: pct(f5, 5), alt: 1 }]);
      o('st').innerHTML = `<div class="w-stat"><b>${(p / f3).toFixed(1)}×</b><span>better with 3 bits</span></div><div class="w-stat"><b>${(p / f5).toFixed(1)}×</b><span>better with 5 bits</span></div>`;
      o('note').textContent = `P(fail, 3 bits) = 3p²(1−p) + p³. ${p > 0.3 ? 'Near 50% noise, majority voting barely helps: you need p to be small. That is the threshold idea.' : 'Below a threshold, more redundancy helps, and it helps more the smaller p is.'}`;
      played(b);
    }
    rp.input.addEventListener('input', upd); upd();
  };

  /* ================================================================ 20.3 bit-flip code */
  W['bitflip'] = (b) => {
    b.innerHTML = `<p style="margin-top:0">Encoded state: <span class="w-mono">α|000⟩ + β|111⟩</span>. Tap a qubit to hit it with a bit-flip (X) error.</p>
      <div class="w-flex" data-o="q" style="justify-content:center"></div>
      <div class="w-flex" style="justify-content:center;margin:12px 0"><span class="w-lamp" data-o="p12"><i></i>P₁₂</span><span class="w-lamp" data-o="p23"><i></i>P₂₃</span></div>
      <div class="w-panel"><div class="w-mono" data-o="state"></div><p data-o="diag" style="margin:6px 0 0"></p></div>
      <div class="w-controls">${btn('🎲 Random single error', 'data-rand')}${btn('🛠 Apply the fix', 'data-fix class="w-btn primary"')}${btn('Reset', 'data-reset')}</div><p class="w-note" data-o="note"></p>`;
    let e = [0, 0, 0], logical = 0;
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    const synd = () => [e[0] ^ e[1], e[1] ^ e[2]];
    const diag = () => { const [a, c] = synd(); return !a && !c ? -1 : a && !c ? 0 : a && c ? 1 : 2; };
    function draw(note = '') {
      o('q').innerHTML = e.map((x, i) => `<button type="button" class="w-qubit ${x ? 'err' : ''}" data-i="${i}" aria-label="qubit ${i + 1}">q${i + 1}${x ? '⚡' : ''}</button>`).join('');
      const b0 = e.map((x) => x ^ logical).join(''), b1 = e.map((x) => x ^ 1 ^ logical).join('');
      o('state').textContent = `α|${b0}⟩ + β|${b1}⟩`;
      const [a, c] = synd();
      o('p12').classList.toggle('on', !!a); o('p23').classList.toggle('on', !!c);
      o('p12').lastChild.textContent = `P₁₂: ${a ? 'differ' : 'agree'}`; o('p23').lastChild.textContent = `P₂₃: ${c ? 'differ' : 'agree'}`;
      const d = diag();
      o('diag').innerHTML = d < 0 ? (logical ? '<span class="w-pill bad">Syndrome says "no error"... but the logical qubit is flipped (α|111⟩ + β|000⟩)!</span>' : '<span class="w-pill good">No error</span>')
        : `<span class="w-pill meh">Syndrome (${a ? 'differ' : 'agree'}, ${c ? 'differ' : 'agree'}) → qubit ${d + 1} flipped → fix: X on qubit ${d + 1}</span>`;
      o('note').textContent = note || 'The parity checks give the same answer for both branches, so they reveal WHERE the error is without revealing anything about α or β.';
    }
    o('q').addEventListener('click', (ev) => { const t = ev.target.closest('[data-i]'); if (t) { e[+t.dataset.i] ^= 1; draw(); played(b); } });
    b.querySelector('[data-rand]').addEventListener('click', () => { e = [0, 0, 0]; logical = 0; e[Math.floor(Math.random() * 3)] = 1; draw(); played(b); });
    b.querySelector('[data-fix]').addEventListener('click', () => {
      const d = diag(); if (d < 0) { draw(); return; }
      e[d] ^= 1;
      if (e.every((x) => x === 1)) { e = [0, 0, 0]; logical ^= 1; }
      draw(logical ? '❌ Two flips fooled the majority vote: the "fix" completed a logical error. That is why codes need p small, and bigger codes for more protection.' : '✅ Recovered α|000⟩ + β|111⟩, and the superposition survived intact.');
      played(b);
    });
    b.querySelector('[data-reset]').addEventListener('click', () => { e = [0, 0, 0]; logical = 0; draw(); });
    draw();
  };

  /* ================================================================ 20.7 surface code patch */
  W['surface-grid'] = (b) => {
    const R = 5;
    b.innerHTML = `<div class="w-controls"><span class="w-label">Error type:</span>${btn('X (bit flip)', 'data-t="X"')}${btn('Z (phase flip)', 'data-t="Z"')}${btn('🎲 Random', 'data-rand')}${btn('Clear', 'data-clear')}</div>
      <svg class="w-svg" viewBox="0 0 320 320" data-o="svg" style="max-width:360px;margin:0 auto"></svg><p class="w-note" data-o="note"></p>`;
    let type = 'X', err = {};
    const kind = (r, c) => ((r + c) % 2 === 0 ? 'D' : r % 2 === 0 ? 'Z' : 'X');
    const nb = (r, c) => [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && x >= 0 && y < R && x < R);
    function draw() {
      const P = 32 + 0, step = 64; let s = '';
      for (let r = 0; r < R; r++) for (let c = 0; c < R; c++) {
        if (c < R - 1) s += `<line x1="${P + c * step}" y1="${P + r * step}" x2="${P + (c + 1) * step}" y2="${P + r * step}" stroke="var(--ink-3)" stroke-width="2"/>`;
        if (r < R - 1) s += `<line x1="${P + c * step}" y1="${P + r * step}" x2="${P + c * step}" y2="${P + (r + 1) * step}" stroke="var(--ink-3)" stroke-width="2"/>`;
      }
      let lit = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < R; c++) {
        const k = kind(r, c), x = P + c * step, y = P + r * step;
        if (k === 'D') {
          const e = err[`${r},${c}`];
          s += `<g data-rc="${r},${c}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="17" fill="${e ? 'var(--coral)' : 'var(--card)'}" stroke="var(--ink)" stroke-width="2.5"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="700">${e || 'D'}</text></g>`;
        } else {
          const detects = k === 'Z' ? 'X' : 'Z';
          let par = 0; nb(r, c).forEach(([y2, x2]) => { const e = err[`${y2},${x2}`]; if (e === detects || e === 'Y') par ^= 1; });
          if (par) lit++;
          s += `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" rx="6" fill="${par ? 'var(--sun)' : k === 'Z' ? 'color-mix(in srgb, var(--sky) 40%, var(--card))' : 'color-mix(in srgb, var(--violet) 35%, var(--card))'}" stroke="var(--ink)" stroke-width="${par ? 3.5 : 2}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="700">${k}</text>`;
        }
      }
      b.querySelector('[data-o="svg"]').innerHTML = s;
      const n = Object.keys(err).length;
      b.querySelector('[data-o="note"]').textContent = n === 0
        ? 'D = data qubit. Blue Z squares check Z-parity of their neighbours (catching X errors); violet X squares check X-parity (catching Z errors). Tap a data qubit.'
        : `${n} error${n > 1 ? 's' : ''} → ${lit} check${lit === 1 ? '' : 's'} lit up. The decoder only sees the yellow squares and must guess the most likely error. Two errors next to each other can cancel a check: that's why decoding is hard.`;
    }
    b.querySelector('[data-o="svg"]').addEventListener('click', (e) => {
      const g = e.target.closest('[data-rc]'); if (!g) return; const k = g.dataset.rc;
      if (err[k] === type) delete err[k]; else err[k] = type; draw(); played(b);
    });
    b.querySelectorAll('[data-t]').forEach((x) => x.addEventListener('click', () => { type = x.dataset.t; b.querySelectorAll('[data-t]').forEach((y) => y.classList.toggle('on', y === x)); }));
    b.querySelector('[data-rand]').addEventListener('click', () => { err = {}; const ds = []; for (let r = 0; r < R; r++) for (let c = 0; c < R; c++) if (kind(r, c) === 'D') ds.push(`${r},${c}`); err[ds[Math.floor(Math.random() * ds.length)]] = Math.random() < 0.5 ? 'X' : 'Z'; draw(); played(b); });
    b.querySelector('[data-clear]').addEventListener('click', () => { err = {}; draw(); });
    b.querySelector('[data-t="X"]').classList.add('on'); draw();
  };

  /* ================================================================ 20.7 surface code scaling */
  W['surface-scaling'] = (b) => {
    const rp = range('Physical error rate p', -2, Math.log10(2), 0.01, -1, (v) => pct(Math.pow(10, v) / 100, 3));
    b.append(rp.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-controls">${btn('p = 0.1% (guide example)', 'data-p="-1"')}${btn('Willow-like (each step ÷2.1)', `data-p="${Math.log10(100 / 2.1 / 100).toFixed(3)}"`)}${btn('p = 1.5% (above threshold)', `data-p="${Math.log10(1.5).toFixed(3)}"`)}</div>
      <div class="w-scroll"><table class="w-table" data-o="t"></table></div><p class="w-note" data-o="note"></p>`);
    const ds = [3, 5, 7, 9, 11, 15, 25];
    function upd() {
      const p = Math.pow(10, rp.get()) / 100, ratio = p / 0.01;
      const rows = ds.map((d) => { const lg = ((d + 1) / 2) * Math.log10(ratio); return `<tr><td>d = ${d}</td><td>~${comma(2 * d * d)}</td><td>${sciLog(lg, 1)}</td><td style="text-align:left"><span class="w-hbar" style="display:block;height:14px;width:${clamp(100 + lg * 6, 2, 100)}%"><i style="width:100%;background:${ratio < 1 ? 'var(--teal)' : 'var(--coral)'}"></i></span></td></tr>`; });
      b.querySelector('[data-o="t"]').innerHTML = `<tr><th>distance</th><th>physical qubits (~2d²)</th><th>logical error ∝ (p/p_th)^((d+1)/2)</th><th>size</th></tr>${rows.join('')}`;
      b.querySelector('[data-o="note"]').textContent = ratio < 1
        ? `p/p_th = ${ratio.toFixed(2)}. Below threshold, every step up in distance makes the logical qubit about ${(1 / ratio).toFixed(1)}× better. Trade hundreds to thousands of physical qubits for one excellent logical qubit.`
        : `p/p_th = ${ratio.toFixed(2)} ≥ 1: ABOVE threshold. Bigger codes make things worse. Physical qubits must get better first.`;
      played(b);
    }
    rp.input.addEventListener('input', upd);
    b.querySelectorAll('[data-p]').forEach((x) => x.addEventListener('click', () => { rp.set(+x.dataset.p); upd(); }));
    upd();
  };

  /* ================================================================ 22.1 stack */
  W['stack'] = (b) => {
    const L = [
      ['Application: chemistry, optimisation, cryptanalysis…', 'What you actually want to solve (Chapters 13, 15, 16 and 30).', 'var(--pink)'],
      ['Algorithms & libraries (VQE, QAOA, Shor, QPE…)', 'The reusable recipes from Part III.', 'var(--coral)'],
      ['SDKs: Qiskit, Cirq, PennyLane, Q#, CUDA-Q, Braket…', 'Where you write code (Chapter 24).', 'var(--amber)'],
      ['Compiler / transpiler: map to native gates & qubit layout, insert SWAPs, optimise, schedule', 'Decompose into native gates, map to the best physical qubits, route with SWAPs, cancel and merge gates, schedule in time (22.4).', 'var(--sun)'],
      ['Error correction & real-time decoding', 'Syndromes must be decoded in real time: about a microsecond per round for superconducting qubits (20.9).', 'var(--lime)'],
      ['Control system: pulse generation (microwaves, lasers), FPGAs, fast classical feedback', 'Every gate is a precisely shaped pulse. FPGAs decide the next operation within microseconds (22.3).', 'var(--teal)'],
      ['Environment: dilution refrigerator / vacuum / optics', 'About 10 millikelvin for superconducting qubits: roughly 270 times colder than outer space (22.2).', 'var(--sky)'],
      ['Qubits', 'Superconducting circuits, trapped ions, neutral atoms, photons, spins (Chapter 21).', 'var(--violet)'],
    ];
    b.innerHTML = L.map(([t, d, c], i) => `<button type="button" class="w-layer" data-i="${i}" style="background:color-mix(in srgb, ${c} 40%, var(--card))">${esc(t)}<span class="w-layer-desc">${esc(d)}</span></button>`).join('');
    b.addEventListener('click', (e) => { const t = e.target.closest('.w-layer'); if (t) { t.classList.toggle('open'); played(b); } });
  };

  /* ================================================================ 23.5 hype meter */
  W['hype-meter'] = (b) => {
    const qs = ['The task is useful (not just a benchmark designed to be hard)', 'It beats the best classical algorithm on the best hardware', 'It is peer-reviewed (not only a press release or preprint)',
      'It reports logical qubits and error rates, not just a qubit count', 'It scales (not a one-off trick)', "The claim doesn't come only from someone selling the hardware", 'Someone independent has reproduced or challenged it'];
    b.innerHTML = `<div class="w-split"><div>${qs.map((q, i) => `<label class="w-label" style="display:flex;margin:6px 0;font-weight:600"><input type="checkbox" data-i="${i}" style="width:20px;height:20px;accent-color:var(--part)"> ${q}</label>`).join('')}</div>
      <div style="text-align:center"><svg class="w-svg" viewBox="0 0 240 140" data-o="g" style="max-width:280px;margin:0 auto"></svg><p class="w-big" data-o="v"></p></div></div>`;
    function upd() {
      const n = b.querySelectorAll('input:checked').length, a = Math.PI * (1 - n / 7);
      const arc = (a0, a1, col) => `<path d="M${120 + 90 * Math.cos(a0)} ${125 - 90 * Math.sin(a0)} A90 90 0 0 1 ${120 + 90 * Math.cos(a1)} ${125 - 90 * Math.sin(a1)}" fill="none" stroke="${col}" stroke-width="20"/>`;
      b.querySelector('[data-o="g"]').innerHTML = arc(Math.PI, Math.PI * 0.75, 'var(--coral)') + arc(Math.PI * 0.75, Math.PI * 0.5, 'var(--amber)') + arc(Math.PI * 0.5, Math.PI * 0.25, 'var(--sun)') + arc(Math.PI * 0.25, 0, 'var(--lime)')
        + `<line x1="120" y1="125" x2="${120 + 78 * Math.cos(a)}" y2="${125 - 78 * Math.sin(a)}" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/><circle cx="120" cy="125" r="9" fill="var(--ink)"/>`;
      b.querySelector('[data-o="v"]').textContent = n <= 2 ? `🚨 ${n}/7: hype alert` : n <= 4 ? `🤔 ${n}/7: interesting, verify` : n <= 6 ? `👍 ${n}/7: promising` : '✅ 7/7: solid result';
    }
    b.addEventListener('change', () => { upd(); played(b); }); upd();
  };

  /* ================================================================ 25.3 Mosca */
  W['mosca'] = (b) => {
    const rx = range('x: years your data must stay secret', 0, 50, 1, 25, (v) => `${v} y`), ry = range('y: years to migrate', 0, 20, 1, 7, (v) => `${v} y`), rz = range('z: years until a CRQC', 1, 40, 1, 15, (v) => `${v} y`);
    b.append(rx.el, ry.el, rz.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-controls">${btn('🏥 Hospital (guide)', 'data-p="25,7,15"')}${btn('Exercise 14', 'data-p="10,5,12"')}${btn('Short-lived data', 'data-p="1,2,15"')}</div>
      <svg class="w-svg" viewBox="0 0 640 120" data-o="svg"></svg><p data-o="v" style="margin:6px 0 0"></p>`);
    function upd() {
      const x = rx.get(), y = ry.get(), z = rz.get(), sc = 600 / Math.max(x + y, z, 1) * 0.95;
      b.querySelector('[data-o="svg"]').innerHTML = `<text x="10" y="22" font-size="13">migration (y) + secrecy (x)</text>
        <rect x="10" y="30" width="${y * sc}" height="24" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/><rect x="${10 + y * sc}" y="30" width="${x * sc}" height="24" fill="var(--violet)" stroke="var(--ink)" stroke-width="2"/>
        <text x="10" y="80" font-size="13">a quantum computer arrives (z)</text><rect x="10" y="88" width="${z * sc}" height="24" fill="var(--coral)" stroke="var(--ink)" stroke-width="2"/>
        <line x1="${10 + z * sc}" y1="26" x2="${10 + z * sc}" y2="116" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="5 4"/>`;
      const gap = x + y - z;
      b.querySelector('[data-o="v"]').innerHTML = gap > 0 ? `<span class="w-pill bad">x + y = ${x + y} > z = ${z}: you're already late</span> Data encrypted today could be exposed for <b>${Math.min(gap, x)} years</b> of its required secrecy period.`
        : `<span class="w-pill good">x + y = ${x + y} ≤ z = ${z}</span> You have ${-gap} year${-gap === 1 ? '' : 's'} of slack. Don't waste it.`;
      played(b);
    }
    [rx, ry, rz].forEach((r) => r.input.addEventListener('input', upd));
    b.querySelectorAll('[data-p]').forEach((el) => el.addEventListener('click', () => { const [a, c, d] = el.dataset.p.split(',').map(Number); rx.set(a); ry.set(c); rz.set(d); upd(); }));
    upd();
  };

  /* ================================================================ 25.7 BB84 */
  W['bb84'] = (b) => {
    b.innerHTML = `<div class="w-controls"><span class="w-label">Photons:</span>${[8, 16, 32].map((n) => btn(n, `data-n="${n}"`)).join('')}
      <label class="w-label"><input type="checkbox" data-eve style="width:20px;height:20px;accent-color:var(--coral)"> 🕵️ Eve intercepts</label></div>
      <div class="w-controls">${btn('📡 Send photons', 'data-send class="w-btn primary"')}${btn("📖 The guide's example", 'data-guide')}${btn('Run 10,000 photons', 'data-big')}</div>
      <div class="w-scroll"><table class="w-table" data-o="t"></table></div><div data-o="res" style="margin-top:10px"></div>`;
    let N = 16;
    const sym = (basis, bit) => (basis === '+' ? (bit ? '↑' : '→') : (bit ? '↖' : '↗'));
    const rb = () => (Math.random() < 0.5 ? 0 : 1), rbs = () => (Math.random() < 0.5 ? '+' : '×');
    function simulate(n, eve, fixed) {
      const rows = [];
      for (let i = 0; i < n; i++) {
        const ab = fixed ? fixed.ab[i] : rb(), as = fixed ? fixed.as[i] : rbs();
        let pb = as, pbit = ab, es = null, er = null;
        if (eve) { es = rbs(); er = es === as ? ab : rb(); pb = es; pbit = er; }
        const bs = fixed ? fixed.bs[i] : rbs();
        const br = fixed ? fixed.br[i] : (bs === pb ? pbit : rb());
        rows.push({ ab, as, es, er, bs, br, keep: as === bs });
      }
      return rows;
    }
    function render(rows, eve) {
      const cell = (f) => rows.map(f).join('');
      b.querySelector('[data-o="t"]').innerHTML = `<tr><th>photon</th>${cell((_, i) => `<th>${i + 1}</th>`)}</tr>
        <tr><th>Alice's bit</th>${cell((r) => `<td>${r.ab}</td>`)}</tr><tr><th>Alice's basis</th>${cell((r) => `<td>${r.as}</td>`)}</tr>
        <tr><th>photon sent</th>${cell((r) => `<td style="font-size:1.1rem">${sym(r.as, r.ab)}</td>`)}</tr>
        ${eve ? `<tr><th>🕵️ Eve's basis</th>${cell((r) => `<td>${r.es}</td>`)}</tr>` : ''}
        <tr><th>Bob's basis</th>${cell((r) => `<td>${r.bs}</td>`)}</tr><tr><th>Bob's result</th>${cell((r) => `<td>${r.br}</td>`)}</tr>
        <tr><th>same basis?</th>${cell((r) => `<td>${r.keep ? '✅' : '❌'}</td>`)}</tr>
        <tr><th>kept key bit</th>${cell((r) => `<td style="${r.keep && r.ab !== r.br ? 'background:var(--coral);color:var(--on-accent)' : ''}"><b>${r.keep ? r.br : ''}</b></td>`)}</tr>`;
      stats(rows, eve, false);
    }
    function stats(rows, eve, big) {
      const kept = rows.filter((r) => r.keep), errs = kept.filter((r) => r.ab !== r.br).length, q = kept.length ? errs / kept.length : 0;
      const key = kept.map((r) => r.br).join('');
      b.querySelector('[data-o="res"]').innerHTML = `${big ? '' : `<p>Sifted key: <span class="w-mono"><b>${key || '—'}</b></span> (${kept.length} of ${rows.length} photons kept; bases compared publicly, bits never).</p>`}
        <p>Error rate in the sifted key: <b>${pct(q)}</b> ${q > 0.11 ? '<span class="w-pill bad">🚨 Above ~11%: eavesdropper detected. Abort!</span>' : '<span class="w-pill good">Low: proceed with error correction + privacy amplification</span>'}</p>
        ${eve ? '<p class="w-note">Eve guesses the wrong basis half the time, and then Bob gets the wrong bit half of those times: about 25% errors.</p>' : ''}`;
    }
    const eveBox = b.querySelector('[data-eve]');
    b.querySelector('[data-send]').addEventListener('click', () => { render(simulate(N, eveBox.checked), eveBox.checked); played(b); });
    b.querySelector('[data-big]').addEventListener('click', () => { b.querySelector('[data-o="t"]').innerHTML = ''; stats(simulate(10000, eveBox.checked), eveBox.checked, true); played(b); });
    b.querySelector('[data-guide]').addEventListener('click', () => {
      eveBox.checked = false;
      render(simulate(8, false, { ab: [0, 1, 1, 0, 1, 0, 1, 0], as: '+×+××++×'.split(''), bs: '++××××++'.split(''), br: [0, 1, 0, 0, 1, 1, 1, 0] }), false);
      played(b);
    });
    b.querySelectorAll('[data-n]').forEach((x) => x.addEventListener('click', () => { N = +x.dataset.n; b.querySelectorAll('[data-n]').forEach((y) => y.classList.toggle('on', y === x)); }));
    b.querySelector('[data-n="16"]').classList.add('on');
    render(simulate(N, false), false);
  };

  /* ================================================================ 26.2 fibre loss */
  W['fiber'] = (b) => {
    const rd = range('Distance', 0, 1200, 10, 100, (v) => `${comma(v)} km`);
    b.append(rd.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-controls">${[100, 500, 1000].map((d) => btn(`${d} km`, `data-d="${d}"`)).join('')}</div>
      <div class="w-stats"><div class="w-stat"><b data-o="db"></b><span>total loss (0.2 dB/km)</span></div><div class="w-stat"><b data-o="fr"></b><span>photons arriving</span></div><div class="w-stat"><b data-o="rate"></b><span>from a 10 GHz single-photon source</span></div></div>
      <p class="w-note" data-o="note"></p>`);
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function human(sec) {
      const Y = 3.156e7;
      if (sec < 60) return `${sec.toPrecision(2)} s`; if (sec < 3600) return `${(sec / 60).toPrecision(2)} min`; if (sec < 86400) return `${(sec / 3600).toPrecision(2)} hours`;
      if (sec < Y) return `${(sec / 86400).toPrecision(2)} days`; if (sec < 1e4 * Y) return `${comma(sec / Y)} years`; return `${sci(sec / Y, 1)} years`;
    }
    function upd() {
      const d = rd.get(), db = 0.2 * d, lg = -db / 10, rate = Math.pow(10, 10 + lg);
      o('db').textContent = `${comma(db)} dB`;
      o('fr').textContent = d === 0 ? 'all of them' : -lg < 6 ? `1 in ${comma(Math.pow(10, -lg))}` : `1 in ${sciLog(-lg, 1)}`;
      o('rate').textContent = rate >= 1 ? `${sci(rate, 1)} per second` : `1 every ${human(1 / rate)}`;
      o('note').textContent = 'Classical networks fix this with amplifiers that copy and boost the signal. Quantum signals can\'t be copied (no-cloning), so we need quantum repeaters.';
      played(b);
    }
    rd.input.addEventListener('input', upd);
    b.querySelectorAll('[data-d]').forEach((x) => x.addEventListener('click', () => { rd.set(+x.dataset.d); upd(); }));
    upd();
  };

  /* ================================================================ 26.3 repeater chain */
  W['repeater'] = (b) => {
    b.innerHTML = `<svg class="w-svg" viewBox="0 0 640 150" data-o="svg"></svg>
      <div class="w-controls">${btn('Next step ▶', 'data-next class="w-btn primary"')}${btn('Restart', 'data-reset')}</div><p class="w-big" data-o="note" style="font-size:1.3rem"></p>`;
    const X = [50, 185, 320, 455, 590], names = ['A', 'R1', 'R2', 'R3', 'B'];
    const stages = [
      [[], 'Five nodes along a long fibre: Alice, three repeaters, Bob.'],
      [[[0, 1], [1, 2], [2, 3], [3, 4]], '1. Create entanglement across each short segment (photon loss is manageable) and store it in quantum memories.'],
      [[[0, 2], [2, 4]], '2. Entanglement swapping at R1 and R3: a Bell measurement joins neighbouring links.'],
      [[[0, 4]], '3. Swap at R2: A and B are now entangled, though they never interacted!'],
      [[[0, 4]], '4. Teleport! Alice sends Bob a qubit using the shared pair plus two classical bits.'],
    ];
    let st = 0, t = 0, raf = 0;
    function draw() {
      const [links, note] = stages[st]; let s = '';
      links.forEach(([a, c]) => { const x1 = X[a], x2 = X[c], mid = (x1 + x2) / 2, hgt = 20 + (c - a) * 12; s += `<path d="M${x1} 80 Q${mid} ${80 - hgt * 2} ${x2} 80" fill="none" stroke="var(--pink)" stroke-width="5" stroke-dasharray="${c - a > 1 ? '0' : '10 6'}" stroke-linecap="round"/>`; });
      X.forEach((x, i) => { s += `<circle cx="${x}" cy="80" r="22" fill="${i === 0 || i === 4 ? 'var(--violet)' : 'var(--teal)'}" stroke="var(--ink)" stroke-width="3"/><text x="${x}" y="86" text-anchor="middle" font-size="15" style="fill:var(--on-accent)" font-weight="700">${names[i]}</text>`; });
      s += `<line x1="20" y1="122" x2="620" y2="122" stroke="var(--ink-3)" stroke-width="3" stroke-dasharray="2 6"/><text x="320" y="144" text-anchor="middle" font-size="12">optical fibre</text>`;
      if (st === 4) { const x = X[0] + (X[4] - X[0]) * t, y = 80 - Math.sin(t * Math.PI) * 76; s += `<circle cx="${x}" cy="${y}" r="10" fill="var(--sun)" stroke="var(--ink)" stroke-width="2.5"/>`; }
      b.querySelector('[data-o="svg"]').innerHTML = s; b.querySelector('[data-o="note"]').textContent = note;
      b.querySelector('[data-next]').disabled = st >= 4;
    }
    function anim() { t += 0.02; draw(); if (t < 1) raf = requestAnimationFrame(anim); else raf = 0; }
    b.querySelector('[data-next]').addEventListener('click', () => { st = Math.min(4, st + 1); if (st === 4) { t = 0; cancelAnimationFrame(raf); anim(); } else draw(); played(b); });
    b.querySelector('[data-reset]').addEventListener('click', () => { st = 0; t = 0; draw(); });
    draw();
  };

  /* ================================================================ 27.3 SQL vs Heisenberg */
  W['sql'] = (b) => {
    const rn = range('Number of atoms N', 0, 9, 0.1, 6, (v) => comma(Math.pow(10, v)));
    b.append(rn.el);
    b.insertAdjacentHTML('beforeend', `<div class="w-stats"><div class="w-stat"><b data-o="s"></b><span>independent atoms: ∝ 1/√N</span></div><div class="w-stat"><b data-o="h"></b><span>ideally entangled: ∝ 1/N</span></div><div class="w-stat"><b data-o="g"></b><span>improvement (√N)</span></div></div>
      <p class="w-note">In practice entangled states are fragile, so real gains are smaller, but squeezing is already used in clocks and LIGO.</p>`);
    const o = (k) => b.querySelector(`[data-o="${k}"]`);
    function upd() { const N = Math.pow(10, rn.get()); o('s').textContent = `1/${comma(Math.sqrt(N))}`; o('h').textContent = `1/${comma(N)}`; o('g').textContent = `${comma(Math.sqrt(N))}× better`; played(b); }
    rn.input.addEventListener('input', upd); upd();
  };

  /* ================================================================ 31.2 interpretation quiz */
  W['interp-quiz'] = (b) => {
    const I = {
      cop: ['Copenhagen', 'The wavefunction is a tool for predicting measurement results; don\'t ask what happens between measurements.', 'Yes, as an update on measurement'],
      mw: ['Many-worlds', 'The wavefunction is all there is; every possible outcome happens, in branching "worlds".', 'No; the universe branches'],
      pw: ['Pilot wave / de Broglie–Bohm', 'Particles always have definite positions, guided by a real wave; non-local hidden variables.', 'No; outcomes are determined but unknowable'],
      oc: ['Objective collapse', 'Collapse is a real physical process that happens spontaneously, especially for big objects.', 'Yes; physically real, and in principle testable'],
      qb: ['QBism', 'The wavefunction represents an agent\'s personal beliefs about future experiences.', 'It\'s just belief updating'],
      rel: ['Relational QM', 'States are relative to observers; there\'s no observer-independent state.', 'Relative to each observer'],
      ch: ['Consistent histories', 'Assign probabilities to coherent sequences of events.', 'No collapse needed'],
    };
    const QS = [
      ['You measure a qubit and see 0. What happened to the 1?', [['Nothing. The math was only ever a prediction tool.', ['cop', 'qb']], ['It happened too, in another branch of reality.', ['mw']], ['There never was a 1: the outcome was set all along.', ['pw']], ['Nature physically, randomly collapsed it.', ['oc']]]],
      ['Is the wavefunction real?', [['Yes, and it is all there is.', ['mw']], ['Yes, and it guides real particles.', ['pw']], ["It's real only relative to an observer.", ['rel']], ["It's my personal belief about what I'll see.", ['qb']], ['Stop asking. Calculate.', ['cop']]]],
      ['Bell tests say you must give something up. You give up...', [['Locality: faster-than-light influences are fine.', ['pw']], ['A single outcome: everything happens.', ['mw']], ['Observer-independent facts.', ['rel', 'qb']], ['Talking about anything except consistent histories.', ['ch']]]],
      ['Pick a motto.', [['"Shut up and calculate."', ['cop']], ['"Everything that can happen, does."', ['mw']], ['"Big things collapse on their own."', ['oc']], ['"Reality is in the relations."', ['rel']], ['"Only tell consistent stories."', ['ch']]]],
    ];
    let qi = 0; const score = {};
    function render() {
      if (qi >= QS.length) {
        const best = Object.entries(score).sort((a, c) => c[1] - a[1])[0][0], [n, idea, col] = I[best];
        b.innerHTML = `<div class="w-box"><div class="w-big-emoji">🐈</div><p class="w-label">You think like a fan of...</p><h4 class="w-big" style="margin:4px 0">${n}</h4><p>${idea}</p><p><b>Does collapse really happen?</b> ${col}</p>
          <p class="w-note">Every standard interpretation makes the same predictions for today's experiments, so your quantum computer works the same either way.</p>${btn('Take it again', 'data-again')}</div>`;
        b.querySelector('[data-again]').addEventListener('click', () => { qi = 0; Object.keys(score).forEach((k) => delete score[k]); render(); });
        played(b); return;
      }
      const [q, opts] = QS[qi];
      b.innerHTML = `<p class="w-label">Question ${qi + 1} of ${QS.length}</p><p class="w-big" style="margin:4px 0 10px">${q}</p><div class="q-opts">${opts.map(([t], i) => `<button type="button" class="q-opt" data-i="${i}">${t}</button>`).join('')}</div>`;
      b.querySelectorAll('[data-i]').forEach((x) => x.addEventListener('click', () => { opts[+x.dataset.i][1].forEach((k) => { score[k] = (score[k] || 0) + 1; }); qi++; render(); }));
    }
    render();
  };

  window.QSKWidgets = {
    mount(el) {
      const name = el.dataset.widget, fn = W[name], body = el.querySelector('.widget-body');
      if (!fn || el.dataset.mounted) return;
      el.dataset.mounted = '1'; body.innerHTML = '';
      try { fn(body, el); } catch (err) { body.innerHTML = '<p>Oops, this widget failed to load.</p>'; console.error(name, err); }
      setTimeout(() => { el.dataset.ready = '1'; }, 0);
    },
  };
})();
