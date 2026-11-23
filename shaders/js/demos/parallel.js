/* LEVEL 10 — warps & branch divergence + latency hiding */
(function () {
  'use strict';
  const { $, $$ } = SL;

  /* ===================== warp divergence ===================== */
  const CODE = `float x = uv.x;            // everyone
if (x < 0.5) {
    color = pathA();         // 4 cycles
} else {
    color = pathB();         // 4 cycles
}
fragColor = color;          // everyone`;
  const pre = $('#warp-code'); SL.renderCode(pre, CODE);
  const LINES = [...pre.querySelectorAll('.ln')];
  const LANES = 32;
  const LCOL = { 1: '#22e4ff', 2: '#ffd23f', 3: '#ff3d9a', 5: '#9b5cff', 7: '#7cff6b' };
  let mode = 'uniform', cond = [], sched = [], cyc = -1, running = false, acc = 0;
  const rnd = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function build() {
    cond = Array.from({ length: LANES }, (_, i) => (mode === 'uniform' ? true : mode === 'half' ? i < 16 : rnd() < 0.5));
    const all = cond.map(() => true), A = cond, B = cond.map((c) => !c);
    sched = [{ line: 1, mask: all }, { line: 2, mask: all }];
    if (A.some(Boolean)) for (let k = 0; k < 4; k++) sched.push({ line: 3, mask: A });
    if (B.some(Boolean)) for (let k = 0; k < 4; k++) sched.push({ line: 5, mask: B });
    sched.push({ line: 7, mask: all });
    cyc = -1; running = false; $('#warp-run').textContent = '▶ run warp'; LINES.forEach((l) => l.classList.remove('exec'));
    $('#warp-cycles').textContent = '0'; $('#warp-eff').textContent = '—';
  }
  SL.tabs('#warp-mode', (v) => { mode = v; build(); }, 'uniform');
  $('#warp-run').addEventListener('click', () => { if (cyc >= sched.length - 1) build(); running = true; acc = 0.3; $('#warp-run').textContent = '… executing'; });
  const wctx = SL.canvas2d($('#warp-canvas'));
  function drawWarp(t) {
    const W = wctx.W, H = wctx.H, lw = W / LANES, top = 70, rowH = Math.min(20, (H - top - 10) / 11);
    wctx.clearRect(0, 0, W, H); wctx.fillStyle = '#07040f'; wctx.fillRect(0, 0, W, H);
    // pixel strip: which pixels the lanes cover
    for (let i = 0; i < LANES; i++) { wctx.fillStyle = cond[i] ? '#ff3d9a' : '#9b5cff'; wctx.globalAlpha = 0.85; wctx.fillRect(i * lw + 1, 4, lw - 2, 10); }
    wctx.globalAlpha = 1; wctx.fillStyle = '#a99cc9'; wctx.font = '11px JetBrains Mono'; wctx.fillText('pixels in this warp:  pink → pathA   violet → pathB', 4, 28);
    const cur = sched[cyc];
    for (let i = 0; i < LANES; i++) {
      const x = i * lw + lw / 2, y = 48, active = cur ? cur.mask[i] : true, r = Math.min(lw * 0.36, 9);
      const bob = running && active ? Math.sin(t * 14 + i) * 2 : 0;
      wctx.fillStyle = active ? (cur ? LCOL[cur.line] : '#d5cdf0') : '#3a3350';
      wctx.beginPath(); wctx.arc(x, y + bob, r, 0, 7); wctx.fill();
      wctx.fillStyle = '#07040f';
      if (active) { wctx.beginPath(); wctx.arc(x - r * 0.35, y + bob - r * 0.15, r * 0.18, 0, 7); wctx.arc(x + r * 0.35, y + bob - r * 0.15, r * 0.18, 0, 7); wctx.fill(); }
      else { wctx.fillRect(x - r * 0.55, y - r * 0.15, r * 0.4, 1.5); wctx.fillRect(x + r * 0.15, y - r * 0.15, r * 0.4, 1.5); wctx.fillStyle = '#a99cc9'; wctx.font = '9px sans-serif'; wctx.fillText('z', x + r * 0.6, y - r - 2 + Math.sin(t * 3 + i) * 2); }
    }
    // timeline
    let busy = 0;
    for (let c = 0; c <= cyc && c < sched.length; c++) {
      const s = sched[c], y = top + c * rowH;
      for (let i = 0; i < LANES; i++) {
        if (s.mask[i]) { wctx.fillStyle = LCOL[s.line]; busy++; } else wctx.fillStyle = 'rgba(255,255,255,0.07)';
        wctx.fillRect(i * lw + 1, y + 1, lw - 2, rowH - 2);
      }
      wctx.fillStyle = 'rgba(255,255,255,0.4)'; wctx.font = '10px JetBrains Mono'; wctx.fillText(`c${c + 1}`, 2, y + rowH - 5);
    }
    if (cyc >= 0) {
      $('#warp-cycles').textContent = Math.min(cyc + 1, sched.length);
      $('#warp-eff').textContent = Math.round(busy / (LANES * (Math.min(cyc, sched.length - 1) + 1)) * 100) + '%';
    }
  }
  SL.animateWhileVisible($('#warp-canvas'), (t, dt) => {
    if (running) {
      acc += dt;
      if (acc > 0.32) {
        acc = 0; cyc++;
        LINES.forEach((l, k) => l.classList.toggle('exec', sched[cyc] && sched[cyc].line === k + 1));
        if (cyc >= sched.length - 1) { running = false; $('#warp-run').textContent = '↻ run again'; SL.xp.award('warp-' + mode, 10, mode === 'uniform' ? null : 'for witnessing divergence'); }
      }
    }
    drawWarp(t);
  });

  /* ===================== latency hiding ===================== */
  const lctx = SL.canvas2d($('#lat-canvas'));
  const WCOL = ['#ff3d9a', '#22e4ff', '#ffd23f', '#7cff6b', '#9b5cff', '#ff8a3d', '#4d7cff', '#ff4d5e'];
  const COMPUTE = 3, MEM = 14, WINDOW = 72;
  let nWarps = 1, warps = [], hist = [], acc2 = 0;
  function resetLat() {
    warps = Array.from({ length: nWarps }, (_, i) => ({ state: 'ready', left: COMPUTE, wait: 0, id: i }));
    hist = [];
  }
  SL.tabs('#lat-mode', (v) => { nWarps = +v; resetLat(); if (nWarps > 1) SL.xp.award('lat-' + v, 8, null); }, '1');
  function tick() {
    // memory waits count down
    for (const w of warps) if (w.state === 'wait') { w.wait--; if (w.wait <= 0) { w.state = 'ready'; w.left = COMPUTE; } }
    const run = warps.find((w) => w.state === 'ready');
    const row = warps.map((w) => (w.state === 'wait' ? 'w' : 'r'));
    if (run) { row[run.id] = 'x'; run.left--; if (run.left <= 0) { run.state = 'wait'; run.wait = MEM; } }
    hist.push({ row, alu: run ? run.id : -1 }); if (hist.length > WINDOW) hist.shift();
  }
  SL.animateWhileVisible($('#lat-canvas'), (t, dt) => {
    acc2 += dt; while (acc2 > 0.07) { acc2 -= 0.07; tick(); }
    const W = lctx.W, H = lctx.H, left = 80, rows = nWarps + 1, rh = Math.min(30, (H - 70) / rows), cw = (W - left - 10) / WINDOW;
    lctx.clearRect(0, 0, W, H); lctx.fillStyle = '#07040f'; lctx.fillRect(0, 0, W, H);
    lctx.font = '600 12px Space Grotesk'; lctx.textBaseline = 'middle';
    for (let r = 0; r < nWarps; r++) {
      const y = 16 + r * rh; lctx.fillStyle = WCOL[r]; lctx.fillText(`warp ${r + 1}`, 10, y + rh / 2);
      hist.forEach((h, c) => {
        const s = h.row[r], x = left + c * cw;
        lctx.fillStyle = s === 'x' ? WCOL[r] : s === 'w' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)';
        lctx.fillRect(x, y + 2, cw - 1, rh - 4);
        if (s === 'w' && c % 3 === 0) { lctx.fillStyle = 'rgba(255,255,255,0.15)'; lctx.fillRect(x, y + rh / 2, cw - 1, 1); }
      });
    }
    const ya = 16 + nWarps * rh + 14;
    lctx.fillStyle = '#fff'; lctx.fillText('ALU', 10, ya + rh / 2);
    let used = 0;
    hist.forEach((h, c) => { const x = left + c * cw; if (h.alu >= 0) used++; lctx.fillStyle = h.alu >= 0 ? WCOL[h.alu] : '#ff4d5e33'; lctx.fillRect(x, ya + 2, cw - 1, rh - 4); });
    const util = hist.length ? Math.round(used / hist.length * 100) : 0;
    lctx.font = '700 22px JetBrains Mono'; lctx.fillStyle = util > 80 ? '#7cff6b' : util > 40 ? '#ffd23f' : '#ff4d5e';
    lctx.textBaseline = 'alphabetic'; lctx.fillText(`${util}% busy`, left, H - 14);
    lctx.font = '13px Space Grotesk'; lctx.fillStyle = '#a99cc9';
    lctx.fillText(nWarps === 1 ? '— the core mostly sits idle waiting for memory 😴' : nWarps < 8 ? '— better: while one warp waits, another computes' : '— the core never waits. That’s how GPUs hide latency 🚀', left + 130, H - 16);
  });
})();
