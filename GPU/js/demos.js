/* =========================================================
   demos.js — the 2D toys and doodles (no 3D needed)
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = n => n.toLocaleString('en-US');
  // run fn while element is visible
  function whenVisible(el, on, off) {
    if (!el) return;
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? on() : off && off())), { threshold: .1 }).observe(el);
  }

  /* ---------- Ch2: scheduler toy ---------- */
  (function () {
    const appsEl = $('#schedApps'), core = $('#schedCore'), txt = $('#schedTxt'), line = $('#schedLine');
    if (!appsEl) return;
    const apps = [
      { em: '🎮', name: 'Game', col: 'var(--purple)', on: true },
      { em: '🎵', name: 'Music', col: 'var(--pink)', on: true },
      { em: '🌐', name: 'Browser', col: 'var(--cyan)', on: false },
      { em: '💬', name: 'Chat', col: 'var(--green)', on: false }
    ];
    apps.forEach(a => {
      const b = document.createElement('button'); b.innerHTML = a.em + ' ' + a.name; b.classList.toggle('on', a.on);
      b.style.background = 'color-mix(in srgb, ' + a.col + ' 30%, var(--card))';
      b.onclick = () => { a.on = !a.on; b.classList.toggle('on', a.on); };
      appsEl.appendChild(b);
    });
    let idx = 0, turns = 0, timer = null;
    function tick() {
      const act = apps.filter(a => a.on);
      const max = Math.max(10, Math.floor(line.clientWidth / 12));
      const blk = document.createElement('i');
      if (!act.length) { core.firstChild.nodeValue = '😴'; core.style.background = ''; txt.textContent = 'No apps running — the CPU naps.'; blk.style.background = 'transparent'; }
      else {
        idx = (idx + 1) % act.length; const a = act[idx]; turns++;
        core.firstChild.nodeValue = a.em;
        core.style.background = 'color-mix(in srgb, ' + a.col + ' 45%, var(--card))';
        txt.innerHTML = 'Now running: <b>' + a.em + ' ' + a.name + '</b> · turn #' + turns;
        blk.style.background = a.col;
      }
      line.appendChild(blk);
      while (line.children.length > max) line.removeChild(line.firstChild);
    }
    whenVisible(appsEl.parentElement, () => { if (!timer) timer = setInterval(tick, 380); }, () => { clearInterval(timer); timer = null; });
  })();

  /* ---------- Ch3: sports car vs buses ---------- */
  (function () {
    const r = $('#rideN'); if (!r) return;
    r.min = 0; r.max = 100; r.value = 8;
    const fmtT = m => (m < 60 ? Math.round(m) + ' min' : (m / 60).toFixed(m < 600 ? 1 : 0) + ' h');
    function upd() {
      const n = Math.max(1, Math.round(Math.pow(5000, r.value / 100)));
      $('#rideNv').textContent = fmt(n);
      const tc = Math.ceil(n / 2) * 10, tb = Math.ceil(n / 2000) * 30;
      const best = Math.min(tc, tb);
      $('#carT').textContent = fmtT(tc); $('#busT').textContent = fmtT(tb);
      $('#carRun').style.left = 'calc(' + (best / tc * 88) + '% )';
      $('#busRun').style.left = 'calc(' + (best / tb * 88) + '% )';
      $('#rideWin').innerHTML = tc < tb ? '🏎️ The sports car wins! For a few riders, <b>low latency</b> matters most — like a CPU.'
        : tc > tb ? '🚌 The buses win! For lots of riders, <b>throughput</b> matters most — like a GPU.' : '🤝 It’s a tie!';
    }
    r.addEventListener('input', upd); upd();
  })();

  /* ---------- Ch6: warp doodle ---------- */
  (function () {
    const el = $('#warpDoodle'); if (!el) return;
    let dots = '';
    for (let i = 0; i < 32; i++) {
      const x = 180 + (i % 8) * 28, y = 50 + Math.floor(i / 8) * 34;
      dots += '<circle cx="' + x + '" cy="' + y + '" r="10" fill="var(--cyan)" stroke="var(--ink)" stroke-width="2"><animate attributeName="r" values="10;12.5;10" dur="1.1s" repeatCount="indefinite"/></circle><text x="' + (x - 4.5) + '" y="' + (y + 5) + '" font-size="14">+</text>';
    }
    el.innerHTML = '<svg class="sketch-svg" viewBox="0 0 420 200" role="img" aria-label="A warp scheduler shouts one instruction to 32 threads">' +
      '<text x="6" y="118" font-size="58" class="emoji">🧑‍✈️</text><text x="62" y="96" font-size="38" class="emoji">📣</text>' +
      '<g class="rough"><path d="M70 40 h80 a10 10 0 0 1 10 10 v22 a10 10 0 0 1 -10 10 h-58 l-14 14 v-14 h-8 a10 10 0 0 1 -10 -10 v-22 a10 10 0 0 1 10 -10z" fill="var(--yellow)" stroke="var(--ink)" stroke-width="2.5"/></g>' +
      '<text x="84" y="68" class="tt" font-size="24" style="fill:#24243a">ADD!</text>' + dots +
      '<text x="168" y="194" font-size="17">one warp = 32 threads, one instruction</text><text x="8" y="160" font-size="16">warp scheduler</text></svg>';
  })();

  /* ---------- Ch7: rasterizer toy ---------- */
  (function () {
    const cv = $('#rasterToy'); if (!cv) return;
    const W = 480, H = 320, S = 20, COLS = W / S, ROWS = H / S;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const P = [{ x: 90, y: 270 }, { x: 250, y: 40 }, { x: 410, y: 230 }];
    let drag = -1;
    const edge = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    function draw() {
      const ink = css('--ink'), fill = css('--yellow'), pink = css('--pink'), bg = css('--stage-bg');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      let n = 0; const area = edge(P[0], P[1], P[2]);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const p = { x: c * S + S / 2, y: r * S + S / 2 };
        let w0 = edge(P[1], P[2], p), w1 = edge(P[2], P[0], p), w2 = edge(P[0], P[1], p);
        if (area < 0) { w0 = -w0; w1 = -w1; w2 = -w2; }
        if (w0 >= 0 && w1 >= 0 && w2 >= 0 && area !== 0) {
          n++;
          const t = (w0 / Math.abs(area));
          g.fillStyle = t > .5 ? pink : fill; g.globalAlpha = .85; g.fillRect(c * S, r * S, S, S); g.globalAlpha = 1;
        }
      }
      g.strokeStyle = ink; g.globalAlpha = .18; g.lineWidth = 1;
      for (let x = 0; x <= W; x += S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y <= H; y += S) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.globalAlpha = .35; g.fillStyle = ink;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { g.beginPath(); g.arc(c * S + S / 2, r * S + S / 2, 1.3, 0, 7); g.fill(); }
      g.globalAlpha = 1; g.lineWidth = 3; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(P[0].x, P[0].y); g.lineTo(P[1].x, P[1].y); g.lineTo(P[2].x, P[2].y); g.closePath(); g.stroke();
      P.forEach((p, i) => {
        g.fillStyle = [css('--cyan'), css('--green'), css('--purple')][i];
        g.beginPath(); g.arc(p.x, p.y, 11, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.font = '15px "Patrick Hand", cursive'; g.textAlign = 'center'; g.fillText('v' + i, p.x, p.y + 5);
      });
      $('#rasterOut').innerHTML = '<b>' + n + '</b> of ' + (COLS * ROWS) + ' pixels covered. A GPU tests all pixel centers <b>at the same time</b>!';
    }
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    cv.addEventListener('pointerdown', e => {
      const p = pos(e); let best = 40 * 40;
      P.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < best) { best = d; drag = i; } });
      if (drag >= 0) { cv.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    cv.addEventListener('pointermove', e => {
      if (drag < 0) return; const p = pos(e);
      P[drag].x = Math.max(4, Math.min(W - 4, p.x)); P[drag].y = Math.max(4, Math.min(H - 4, p.y)); draw();
    });
    const up = () => { drag = -1; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    document.addEventListener('themechange', draw);
    if (document.fonts) document.fonts.ready.then(draw);
    draw();
  })();

  /* ---------- Ch7: frame budget ---------- */
  (function () {
    const seg = $('#resSeg'); if (!seg) return;
    const res = [['1080p', 1920, 1080], ['1440p', 2560, 1440], ['4K', 3840, 2160]];
    let ri = 0;
    res.forEach((r, i) => { const b = document.createElement('button'); b.className = 'btn-sk' + (i === 0 ? ' on' : ''); b.textContent = '🖥️ ' + r[0]; b.onclick = () => { ri = i; [...seg.children].forEach((c, j) => c.classList.toggle('on', j === i)); upd(); }; seg.appendChild(b); });
    const fr = $('#fpsR');
    function upd() {
      const fps = +fr.value; $('#fpsV').textContent = fps;
      const ms = 1000 / fps, px = res[ri][1] * res[ri][2], pps = px * fps, days = px / 86400;
      $('#budgetBar').innerHTML = '<div class="bar-row"><span>⏱️ time per frame</span><div class="bar-track"><div class="bar-fill" style="width:' + (ms / 33.4 * 100) + '%;--c:var(--orange)"></div><span class="bar-val">' + ms.toFixed(1) + ' ms</span></div></div>';
      $('#budgetOut').innerHTML = '🎨 <b>' + fmt(px) + '</b> pixels per frame · <b>' + (pps / 1e6).toFixed(0) + ' million</b> pixels per second.<br>🖍️ If YOU colored 1 pixel per second, ONE frame would take <b>' + days.toFixed(0) + ' days</b>!';
    }
    fr.addEventListener('input', upd); upd();
  })();

  /* ---------- Ch8: grid / block / thread doodle ---------- */
  (function () {
    const el = $('#gridDoodle'); if (!el) return;
    let s = '<svg class="sketch-svg" viewBox="0 0 470 200" role="img" aria-label="A grid contains blocks, blocks contain threads"><g class="rough">';
    s += '<rect x="6" y="22" width="458" height="150" rx="12" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="9 7"/>';
    const bc = ['var(--pink)', 'var(--cyan)', 'var(--yellow)', 'var(--green)'];
    for (let b = 0; b < 4; b++) {
      const x = 20 + b * 112;
      s += '<rect x="' + x + '" y="44" width="98" height="110" rx="9" fill="color-mix(in srgb, ' + bc[b] + ' 28%, var(--card))" stroke="var(--ink)" stroke-width="2.2"/>';
      for (let t = 0; t < 8; t++) s += '<circle cx="' + (x + 19 + (t % 4) * 20) + '" cy="' + (96 + Math.floor(t / 4) * 26) + '" r="7.5" fill="' + bc[b] + '" stroke="var(--ink)" stroke-width="1.8"/>';
    }
    s += '</g><text x="16" y="16" class="tt" font-size="21">GRID (the whole job)</text>';
    for (let b = 0; b < 4; b++) s += '<text x="' + (32 + b * 112) + '" y="70" font-size="17">block ' + b + '</text>';
    s += '<text x="20" y="192" font-size="16">● = one thread (8 per block here; usually 128–1024)</text></svg>';
    el.innerHTML = s;
  })();

  /* ---------- Ch8: thread index ---------- */
  (function () {
    const bi = $('#biR'), ti = $('#tiR'), grid = $('#tidGrid'); if (!bi) return;
    for (let i = 0; i < 32; i++) { const c = document.createElement('i'); c.className = 'b' + Math.floor(i / 8); c.textContent = i; grid.appendChild(c); }
    function upd() {
      const b = +bi.value, t = +ti.value, i = b * 8 + t;
      $('#biV').textContent = b; $('#tiV').textContent = t;
      [...grid.children].forEach((c, k) => c.classList.toggle('me', k === i));
      $('#tidOut').innerHTML = 'i = ' + b + ' × 8 + ' + t + ' = <b>' + i + '</b> → this thread handles <code>c[' + i + ']</code>';
    }
    bi.addEventListener('input', upd); ti.addEventListener('input', upd); upd();
  })();

  /* ---------- Ch9: bandwidth bars ---------- */
  (function () {
    const el = $('#bwBars'); if (!el) return;
    const d = [['PCIe 4.0 ×16', 32, 'var(--red)'], ['PCIe 5.0 ×16', 64, 'var(--red)'], ['PC DDR5 RAM', 90, 'var(--blue)'], ['Apple M4 Max', 546, 'var(--pink)'],
      ['RTX 4090 · GDDR6X', 1008, 'var(--green)'], ['RTX 5090 · GDDR7', 1792, 'var(--green)'], ['H100 · HBM3', 3350, 'var(--purple)'], ['B200 · HBM3e', 8000, 'var(--purple)']];
    el.innerHTML = d.map(r => '<div class="bar-row"><span>' + r[0] + '</span><div class="bar-track"><div class="bar-fill" data-w="' + (Math.sqrt(r[1] / 8000) * 100).toFixed(1) + '" style="width:0;--c:' + r[2] + '"></div><span class="bar-val">' + fmt(r[1]) + ' GB/s</span></div></div>').join('');
    whenVisible(el, () => el.querySelectorAll('.bar-fill').forEach(b => { b.style.width = b.dataset.w + '%'; }));
  })();

  /* ---------- Ch10: neural net doodle ---------- */
  (function () {
    const el = $('#netDoodle'); if (!el) return;
    const L = [[170, 4], [275, 5], [380, 4], [480, 2]], nodes = [];
    L.forEach(([x, n]) => { const col = []; for (let i = 0; i < n; i++) col.push([x, 115 + (i - (n - 1) / 2) * 38]); nodes.push(col); });
    let s = '<svg class="sketch-svg" viewBox="0 0 590 230" role="img" aria-label="A picture of a cat flows through layers of a neural network to the answer cat 92 percent">';
    s += '<g stroke="var(--ink)" stroke-width="1.4" opacity=".35">';
    for (let l = 0; l < nodes.length - 1; l++) nodes[l].forEach(a => nodes[l + 1].forEach(b => { s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; }));
    s += '</g><g stroke="var(--pink)" stroke-width="2.4" fill="none" class="flow-dash">';
    [[0, 1, 1, 2], [1, 2, 2, 1], [2, 1, 3, 0]].forEach(([l1, i1, l2, i2]) => { const a = nodes[l1][i1], b = nodes[l2][i2]; s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; });
    nodes[0].forEach(a => { s += '<line x1="112" y1="115" x2="' + a[0] + '" y2="' + a[1] + '"/>'; });
    s += '</g><g class="rough"><rect x="12" y="62" width="100" height="106" rx="10" fill="var(--card)" stroke="var(--ink)" stroke-width="2.5"/></g>';
    s += '<text x="26" y="138" font-size="62" class="emoji">🐱</text>';
    const fills = ['var(--cyan)', 'var(--yellow)', 'var(--purple)', 'var(--green)'];
    nodes.forEach((col, l) => col.forEach(p => { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="13" fill="' + fills[l] + '" stroke="var(--ink)" stroke-width="2.2"/>'; }));
    s += '<text x="498" y="101" font-size="20" class="tt">cat 92%</text><text x="498" y="139" font-size="18" opacity=".7">dog 8%</text>';
    s += '<text x="12" y="200" font-size="16">picture (numbers)</text><text x="165" y="222" font-size="16">layers: multiply by knobs, add up, repeat</text><text x="470" y="200" font-size="16">answer</text></svg>';
    el.innerHTML = s;
  })();

  /* ---------- Ch10: 3x3 matmul toy ---------- */
  (function () {
    const el = $('#mmToy'); if (!el) return;
    const A = [[1, 2, 0], [0, 1, 3], [2, 1, 1]], B = [[1, 0, 2], [3, 1, 0], [0, 2, 1]];
    let sel = null;
    const mul = () => A.map((r, i) => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
    function render() {
      const Cm = mul();
      const mat = (M, name) => '<div class="mat" aria-label="matrix ' + name + '">' + M.map((r, i) => r.map((v, j) => {
        let cls = '';
        if (sel) { if (name === 'A' && i === sel[0]) cls = 'hr'; if (name === 'B' && j === sel[1]) cls = 'hc'; if (name === 'C' && i === sel[0] && j === sel[1]) cls = 'ho'; }
        return '<button class="' + cls + '" data-m="' + name + '" data-i="' + i + '" data-j="' + j + '">' + v + '</button>';
      }).join('')).join('') + '</div>';
      el.innerHTML = '<div><div class="hand" style="font-size:22px;text-align:center">A</div>' + mat(A, 'A') + '</div><span>×</span><div><div class="hand" style="font-size:22px;text-align:center">B</div>' + mat(B, 'B') + '</div><span>=</span><div><div class="hand" style="font-size:22px;text-align:center">C</div>' + mat(Cm, 'C') + '</div>';
      if (sel) {
        const [i, j] = sel;
        $('#mmOut').innerHTML = 'C[' + i + '][' + j + '] = ' + A[i].map((a, k) => '<span style="color:var(--pink)">' + a + '</span>×<span style="color:var(--cyan)">' + B[k][j] + '</span>').join(' + ') + ' = <b>' + Cm[i][j] + '</b>';
      }
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const m = b.dataset.m, i = +b.dataset.i, j = +b.dataset.j;
      if (m === 'C') sel = [i, j];
      else { const M = m === 'A' ? A : B; M[i][j] = (M[i][j] + 1) % 10; if (!sel) sel = m === 'A' ? [i, 0] : [0, j]; }
      render();
    });
    render();
  })();

  /* ---------- Ch10: precision bits ---------- */
  (function () {
    const el = $('#bitsViz'); if (!el) return;
    const d = [['FP32', 1, 8, 23], ['FP16', 1, 5, 10], ['BF16', 1, 8, 7], ['FP8', 1, 4, 3], ['FP4', 1, 2, 1]];
    el.innerHTML = d.map(r => {
      const n = r[1] + r[2] + r[3];
      return '<div class="bitrow"><b>' + r[0] + '</b><div class="cells">' + '<i class="s"></i>'.repeat(r[1]) + '<i class="e"></i>'.repeat(r[2]) + '<i class="m"></i>'.repeat(r[3]) + '</div><span>' + n + ' bits</span></div>';
    }).join('');
  })();

  /* ---------- Ch12: roofline ---------- */
  (function () {
    const el = $('#roofline'), r = $('#aiR'); if (!el) return;
    const X0 = 60, X1 = 500, Y0 = 250, Y1 = 30, PEAK = 80, BW = 1;
    const lx = ai => X0 + (Math.log10(ai) + 1) / 4 * (X1 - X0);
    const ly = p => Y0 - (Math.log10(p) + 1) / 3 * (Y0 - Y1);
    const ridge = PEAK / BW;
    let s = '<svg class="sketch-svg" viewBox="0 0 520 300" role="img" aria-label="Roofline chart: performance is limited by memory bandwidth at low arithmetic intensity and by peak compute at high intensity">';
    s += '<rect x="' + X0 + '" y="' + Y1 + '" width="' + (lx(ridge) - X0) + '" height="' + (Y0 - Y1) + '" fill="var(--blue)" opacity=".08"/><rect x="' + lx(ridge) + '" y="' + Y1 + '" width="' + (X1 - lx(ridge)) + '" height="' + (Y0 - Y1) + '" fill="var(--pink)" opacity=".08"/>';
    s += '<g stroke="var(--ink)" stroke-width="2.2" fill="none" class="rough"><path d="M' + X0 + ' ' + Y1 + ' V' + Y0 + ' H' + X1 + '"/></g>';
    s += '<g stroke="var(--orange)" stroke-width="4" fill="none" stroke-linecap="round"><path d="M' + lx(.1) + ' ' + ly(.1) + ' L' + lx(ridge) + ' ' + ly(PEAK) + ' L' + X1 + ' ' + ly(PEAK) + '"/></g>';
    [.1, 1, 10, 100, 1000].forEach(v => { s += '<text x="' + (lx(v) - 10) + '" y="' + (Y0 + 20) + '" font-size="14">' + v + '</text>'; });
    [.1, 1, 10, 100].forEach(v => { s += '<text x="' + (X0 - 38) + '" y="' + (ly(v) + 5) + '" font-size="14">' + v + '</text>'; });
    s += '<text x="' + (X0 + 120) + '" y="' + (Y0 + 42) + '" font-size="16">FLOPs per byte (log scale) →</text>';
    s += '<text x="8" y="20" font-size="15">TFLOP/s ↑</text>';
    s += '<text x="' + (X0 + 20) + '" y="' + (Y1 + 22) + '" font-size="17" class="tt">memory-bound 🐌</text><text x="' + (lx(ridge) + 14) + '" y="' + (Y1 + 22) + '" font-size="17" class="tt">compute-bound 💪</text>';
    s += '<text x="' + (lx(1.2)) + '" y="' + (ly(1.6) + 34) + '" font-size="14" transform="rotate(-36 ' + lx(1.2) + ' ' + (ly(1.6) + 34) + ')">roof: memory speed</text>';
    s += '<text x="' + (lx(150)) + '" y="' + (ly(PEAK) - 8) + '" font-size="14">roof: math speed</text>';
    [['vector add', .12, 0], ['AI chat (writing)', 1.5, 0], ['big matrix multiply', 300, 1]].forEach(([n, v, end]) => { const p = Math.min(PEAK, v * BW); s += '<circle cx="' + lx(v) + '" cy="' + ly(p) + '" r="4" fill="var(--ink)"/><text x="' + (lx(v) + (end ? 4 : 6)) + '" y="' + (ly(p) + 18) + '" font-size="13" opacity=".8"' + (end ? ' text-anchor="end"' : '') + '>' + n + '</text>'; });
    s += '<circle id="roofDot" r="10" fill="var(--yellow)" stroke="var(--ink)" stroke-width="2.5"/></svg>';
    el.innerHTML = s;
    const dot = $('#roofDot');
    function upd() {
      const ai = Math.pow(10, -1 + (+r.value) / 100 * 4), p = Math.min(PEAK, ai * BW);
      $('#aiV').textContent = ai < 1 ? ai.toFixed(2) : ai < 10 ? ai.toFixed(1) : Math.round(ai);
      dot.setAttribute('cx', lx(ai)); dot.setAttribute('cy', ly(p));
      $('#roofOut').innerHTML = 'You get about <b>' + (p < 1 ? p.toFixed(2) : p < 10 ? p.toFixed(1) : Math.round(p)) + ' TFLOP/s</b> → ' + (ai < ridge
        ? '<b>memory-bound</b> 🐌 — the math units are waiting for data. Fix: reuse data (tiling), fuse kernels, use smaller number formats.'
        : '<b>compute-bound</b> 💪 — memory keeps up; the math units are the limit. Fix: tensor cores, lower precision, better algorithms.');
    }
    r.addEventListener('input', upd); upd();
    el.insertAdjacentHTML('afterend', '<p class="muted" style="margin:4px 0 0">Example GPU: ~80 TFLOP/s of FP32 math and ~1 TB/s of memory (roughly an RTX 4090). The corner (“ridge”) is at ~80 FLOPs per byte.</p>');
  })();

  /* ---------- Ch12: best-practice tabs ---------- */
  (function () {
    const tabs = $('#bpTabs'), panels = $('#bpPanels'); if (!tabs) return;
    const D = {
      '🙋 Everyone': [
        ['do', 'Match the GPU to the job', '1080p gaming, 4K gaming and AI work need very different cards. VRAM size matters for big textures and AI models.'],
        ['do', 'Keep it cool & powered', 'Good airflow, a quality power supply with headroom, and dust cleaning keep clocks high.'],
        ['do', 'Update drivers', 'New drivers bring speed-ups and fixes for new games and apps.'],
        ['do', 'Use upscaling', 'DLSS, FSR, XeSS and MetalFX give more FPS for very little quality loss.'],
        ['dont', 'Don’t ignore bottlenecks', 'A slow CPU can hold back a fast GPU. If GPU usage is low, the GPU is waiting on something else.'],
        ['dont', 'Don’t max every setting blindly', 'Some settings (like ultra shadows) cost a lot for a tiny visual gain.']],
      '🎮 Game devs': [
        ['do', 'Batch & instance', 'Draw 1,000 trees with one instanced draw call instead of 1,000 separate calls.'],
        ['do', 'Cull & use LODs', 'Don’t draw what’s off-screen or hidden; use simpler models far away.'],
        ['do', 'Compress textures + mipmaps', 'Less memory and bandwidth, and less shimmering in the distance.'],
        ['do', 'Profile every frame', 'Know your CPU and GPU milliseconds per frame (RenderDoc, PIX, Nsight, Xcode).'],
        ['dont', 'Avoid overdraw', 'Many transparent layers paint the same pixel again and again.'],
        ['dont', 'Avoid CPU ↔ GPU stalls', 'Reading GPU results back right away makes the CPU sit and wait.']],
      '⚡ CUDA coders': [
        ['do', 'Keep data on the GPU', 'Copy once, run many kernels, copy back once. PCIe is the slowest road.'],
        ['do', 'Coalesce memory access', 'Neighbor threads should read neighbor addresses (see the 3D robots!).'],
        ['do', 'Tile with shared memory', 'Load a tile once into shared memory and reuse it many times.'],
        ['do', 'Overlap with streams', 'Copy the next batch while computing this one; use pinned host memory.'],
        ['do', 'Use libraries first', 'cuBLAS, cuDNN, CUTLASS and Thrust are already tuned by experts.'],
        ['dont', 'Avoid warp divergence', 'Keep branches the same for all 32 threads of a warp when you can.'],
        ['dont', 'Don’t launch tiny kernels', 'Give the GPU thousands of threads per launch, and fuse small steps together.']],
      '🤖 AI builders': [
        ['do', 'Use mixed precision', 'BF16 / FP16 (or FP8) runs on tensor cores; keep sensitive parts in FP32.'],
        ['do', 'Feed the GPU', 'Fast data loading so the GPU never waits — watch utilization in nvidia-smi.'],
        ['do', 'Batch requests', 'Bigger batches use the GPU far better, up to the memory limit.'],
        ['do', 'Use fused kernels', 'FlashAttention, torch.compile and fused optimizers cut slow memory trips.'],
        ['do', 'Quantize for inference', '8-bit or 4-bit weights fit bigger models and run faster.'],
        ['dont', 'Don’t just run out of memory', 'Use gradient checkpointing, smaller batches, or sharding across GPUs (FSDP / ZeRO).']]
    };
    Object.keys(D).forEach((k, i) => {
      const b = document.createElement('button'); b.className = 'btn-sk' + (i ? '' : ' on'); b.textContent = k; tabs.appendChild(b);
      const p = document.createElement('div'); p.className = 'tab-panel' + (i ? '' : ' on');
      p.innerHTML = '<ul class="dolist">' + D[k].map(r => '<li class="' + r[0] + '"><b>' + r[1] + '</b> — ' + r[2] + '</li>').join('') + '</ul>';
      panels.appendChild(p);
      b.onclick = () => { [...tabs.children].forEach((c, j) => c.classList.toggle('on', j === i)); [...panels.children].forEach((c, j) => c.classList.toggle('on', j === i)); };
    });
  })();
})();
