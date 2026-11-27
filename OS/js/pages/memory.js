/* Chapter 5 — Memory */
(function () {
  'use strict';
  var $ = Core.$;

  /* ---------- hierarchy pyramid ---------- */
  var PYR = [
    ['🤲', 'CPU registers', '~0.3 ns', 'a blink (0.3 s)', 'a few hundred bytes', 'What you\'re holding in your hands right now.', 'purple', 22],
    ['🗄️', 'L1 cache', '~1 ns', '1 second', '32–64 KB per core', 'Your desk drawer — instant.', 'pink', 32],
    ['📦', 'L2 / L3 cache', '~4–15 ns', '4–15 seconds', '1 MB – 64 MB', 'The shelf right behind you.', 'orange', 44],
    ['🧮', 'RAM', '~100 ns', '~2 minutes', '8 – 64 GB', 'The bookshelf across your room. Managed by the OS!', 'green', 58],
    ['💾', 'NVMe SSD', '~50 µs', '~14 hours', '0.5 – 4 TB', 'The library across town. Permanent.', 'blue', 74],
    ['🪨', 'Hard disk (HDD)', '~5–10 ms', '2–4 months', '1 – 20 TB', 'A library in another country — a spinning platter must rotate under the head.', 'teal', 88],
    ['🌍', 'Network (other continent)', '~150 ms', '~5 years', '∞ (the cloud)', 'A letter sent around the world.', 'yellow', 100]
  ];
  var pyr = $('#pyr');
  pyr.innerHTML = PYR.map(function (p, i) { return '<div data-i="' + i + '" role="button" tabindex="0" style="width:' + p[7] + '%;background:' + SK.tint(p[6]) + '">' + p[0] + ' <b>' + p[1] + '</b><small>' + p[2] + '</small></div>'; }).join('');
  function pyrShow(i) {
    var p = PYR[i]; Core.$$('#pyr > div').forEach(function (d) { d.classList.toggle('sel', +d.dataset.i === i); });
    $('#pyrInfo').innerHTML = '<h3>' + p[0] + ' ' + p[1] + '</h3><p class="num-big c-pink">' + p[3] + '</p><p>Real time: <b>' + p[2] + '</b> · Typical size: <b>' + p[4] + '</b></p><p>🧸 ' + p[5] + '</p>';
  }
  pyr.addEventListener('click', function (e) { var d = e.target.closest('[data-i]'); if (d) pyrShow(+d.dataset.i); });
  pyr.addEventListener('keydown', function (e) { var d = e.target.closest('[data-i]'); if (d && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pyrShow(+d.dataset.i); } });
  pyrShow(3);

  /* ---------- virtual memory map ---------- */
  var MAP = { A0: 'F5', A1: 'F2', A2: 'F7', A3: 'sw', B0: 'F1', B1: 'F4', B2: 'F2', B3: 'F6' };
  var vmNodes = [], vmEdges = [];
  var LBL = ['code', 'libc', 'heap', 'stack'];
  ['A', 'B'].forEach(function (p, pi) {
    for (var i = 0; i < 4; i++) vmNodes.push({ id: p + i, x: pi ? 650 : 20, y: 36 + i * 72, w: 150, h: 54, label: (pi ? '🎵 B' : '🦊 A') + ' page ' + i, sub: LBL[i], c: pi ? 'blue' : 'orange', fs: 16, m: [pi ? 296 : 8, 36 + i * 72, 116, 54] });
  });
  for (var f = 0; f < 8; f++) vmNodes.push({ id: 'F' + f, x: 330, y: 8 + f * 44, w: 160, h: 36, label: 'frame ' + f + (f === 0 ? ' (kernel)' : f === 3 ? ' (free)' : ''), c: f === 0 ? 'purple' : (f === 3 ? 'gray' : 'green'), fs: 15, m: [146, 8 + f * 44, 128, 36] });
  vmNodes.push({ id: 'sw', x: 330, y: 372, w: 160, h: 70, icon: '💤', label: 'swap (disk)', c: 'gray', shape: 'cyl', fs: 15, m: [146, 372, 128, 70] });
  Object.keys(MAP).forEach(function (k) { vmEdges.push({ from: k, to: MAP[k], dash: MAP[k] === 'sw', single: true }); });
  var VM = SK.diagram('#vmD', {
    title: 'Two processes mapping virtual pages to physical frames', w: 820, h: 450, fs: 16,
    groups: [{ x: 4, y: 0, w: 182, h: 330, label: '', c: 'orange', m: [2, 0, 128, 330] }, { x: 634, y: 0, w: 182, h: 330, label: '', c: 'blue', m: [290, 0, 128, 330] }],
    nodes: vmNodes, edges: vmEdges,
    texts: [{ x: 95, y: 330 + 26, t: 'Process A thinks\nit owns all memory', fs: 15, m: [66, 356], mHide: false }, { x: 725, y: 356, t: 'So does B!', fs: 15, m: [352, 356] }],
    onClick: function (id) {
      var on = [id], edges = [];
      Object.keys(MAP).forEach(function (k) { if (k === id || MAP[k] === id) { on.push(k, MAP[k]); edges.push(k + '>' + MAP[k]); } });
      VM.on(on, edges);
      var msg = {
        A1: 'A\'s page 1 and B\'s page 2 both map to <b>frame 2</b>: that\'s the shared C library (libc) — loaded once, used by both. 🤝',
        B2: 'B\'s page 2 and A\'s page 1 share <b>frame 2</b> (libc). Read-only sharing is safe and saves RAM.',
        A3: 'A\'s page 3 isn\'t in RAM at all — it was <b>swapped out</b> to disk. Touching it causes a <b>page fault</b>; the kernel quietly loads it back.',
        F0: 'Frame 0 belongs to the <b>kernel</b>. No user page table points to it.',
        F3: 'Frame 3 is <b>free</b> — ready for the next page fault.'
      }[id] || ('Virtual ' + id + ' → physical ' + (MAP[id] || id) + '. Each process has its own private map — they can\'t even name each other\'s memory!');
      $('#vmMsg').innerHTML = '💡 ' + msg;
    },
    mobile: { w: 420, h: 450 }
  });
  var vmMsg = document.createElement('div'); vmMsg.className = 'note tip'; vmMsg.id = 'vmMsg'; vmMsg.innerHTML = '💡 Click <b>🦊 A page 1</b> or <b>🦊 A page 3</b> for a surprise.'; $('#vmD').appendChild(vmMsg);

  /* ---------- address space layout ---------- */
  SK.diagram('#layoutD', {
    title: 'Linux process address space', w: 460, h: 560, fs: 17,
    nodes: [
      { id: 'k', x: 150, y: 8, w: 290, h: 62, label: '👑 kernel space', sub: 'locked 🔒', c: 'purple', hatch: true },
      { id: 'st', x: 150, y: 110, w: 290, h: 70, label: '🥞 stack ↓', sub: 'grows down', c: 'pink' },
      { id: 'mm', x: 150, y: 220, w: 290, h: 70, label: '📚 mmap / libraries', sub: 'libc.so, mapped files', c: 'blue' },
      { id: 'hp', x: 150, y: 330, w: 290, h: 70, label: '⛰️ heap ↑', sub: 'malloc() grows up', c: 'green' },
      { id: 'dt', x: 150, y: 410, w: 290, h: 50, label: '📦 data + bss', c: 'yellow' },
      { id: 'tx', x: 150, y: 466, w: 290, h: 50, label: '📜 text (code)', c: 'orange' },
      { id: 'nl', x: 150, y: 522, w: 290, h: 30, label: '🚫 page 0 (NULL trap)', c: 'gray', fs: 14 }
    ],
    texts: [
      { x: 8, y: 30, t: '0xffff…', fs: 15, anchor: 'start', mono: true }, { x: 8, y: 140, t: '0x7ffc…', fs: 15, anchor: 'start', mono: true },
      { x: 8, y: 250, t: '0x7f2b…', fs: 15, anchor: 'start', mono: true }, { x: 8, y: 362, t: '0x55d4…', fs: 15, anchor: 'start', mono: true },
      { x: 8, y: 540, t: '0x0000', fs: 15, anchor: 'start', mono: true },
      { x: 295, y: 96, t: '· · · empty · · ·', fs: 14, c: 'gray' }, { x: 295, y: 206, t: '· · ·', fs: 14 }, { x: 295, y: 316, t: '· · ·', fs: 14 },
      { x: 70, y: 470, t: 'high\naddresses\n⬆', fs: 14, mHide: true }
    ]
  });

  /* ---------- MMU translation lab ---------- */
  var PT0 = { 0: 5, 1: 2, 3: 7, 4: 1, 8: 4, 2: 'd', 6: 'd', 7: 'd', 9: 'd' };
  var pt, frames, tlb, stats, fifo;
  function xReset() {
    pt = {}; for (var k in PT0) pt[k] = PT0[k];
    frames = []; for (var f = 0; f < 8; f++) frames[f] = null;
    Object.keys(pt).forEach(function (v) { if (typeof pt[v] === 'number') frames[pt[v]] = +v; });
    fifo = Object.keys(pt).filter(function (v) { return typeof pt[v] === 'number'; }).map(Number);
    tlb = []; stats = { h: 0, m: 0, pf: 0 }; $('#xLog').innerHTML = ''; xDraw();
  }
  function hex(n, d) { return '0x' + n.toString(16).toUpperCase().padStart(d || 4, '0'); }
  function xDraw(hlTlb, hlPt, hlF, cls) {
    $('#tlbT').innerHTML = '<tr><th>page</th><th>frame</th></tr>' + [0, 1, 2, 3].map(function (i) { var e = tlb[i]; return '<tr class="' + (e && hlTlb === e.v ? cls : '') + '"><td>' + (e ? e.v.toString(16).toUpperCase() : '–') + '</td><td>' + (e ? e.f : '–') + '</td></tr>'; }).join('');
    var rows = '<tr><th>page</th><th>present?</th><th>frame</th></tr>';
    for (var v = 0; v < 16; v++) { var e = pt[v]; rows += '<tr class="' + (hlPt === v ? cls : '') + '"><td>' + v.toString(16).toUpperCase() + '</td><td>' + (typeof e === 'number' ? '✅' : e === 'd' ? '💤 disk' : '🚫') + '</td><td>' + (typeof e === 'number' ? e : '–') + '</td></tr>'; }
    $('#ptT').innerHTML = rows;
    $('#frT').innerHTML = frames.map(function (v, i) { return '<div class="' + (v != null ? 'used' : '') + (hlF === i ? ' new' : '') + '">F' + i + '<br>' + (v != null ? 'page ' + v.toString(16).toUpperCase() : 'free') + '</div>'; }).join('');
    $('#xStats').textContent = 'TLB hits ' + stats.h + ' · misses ' + stats.m + ' · page faults ' + stats.pf;
  }
  function xlog(m) { var d = document.createElement('div'); d.innerHTML = m; $('#xLog').insertBefore(d, $('#xLog').firstChild); }
  var xTok = 0;
  function translate(str) {
    var va = parseInt(String(str).replace(/^0x/i, ''), 16);
    if (isNaN(va) || va < 0 || va > 0xFFFF) { Core.toast('Type a hex address from 0x0000 to 0xFFFF 🙂'); return; }
    var my = ++xTok, vpn = va >> 12, off = va & 0xFFF;
    $('#vaIn').value = hex(va);
    $('#vaBits').innerHTML = '<span class="vpn">page ' + vpn.toString(16).toUpperCase() + '</span><span class="off">offset ' + off.toString(16).toUpperCase().padStart(3, '0') + '</span>';
    $('#paOut').textContent = 'physical: …';
    var steps = [];
    var hit = tlb.filter(function (e) { return e.v === vpn; })[0];
    function done(f) { $('#paOut').textContent = 'physical: ' + hex(f * 0x1000 + off); }
    if (hit) {
      steps.push(function () { stats.h++; tlb = [hit].concat(tlb.filter(function (e) { return e !== hit; })); xDraw(vpn, null, hit.f, 'hit'); done(hit.f); xlog('⚡ <b>TLB hit!</b> page ' + vpn.toString(16).toUpperCase() + ' → frame ' + hit.f + '. Fastest case — no page table walk. Physical = ' + hex(hit.f * 0x1000 + off)); });
    } else {
      steps.push(function () { stats.m++; xDraw(null, null, null); xlog('🔍 TLB miss for page ' + vpn.toString(16).toUpperCase() + '. The MMU walks the page table…'); });
      var e = pt[vpn];
      if (typeof e === 'number') {
        steps.push(function () { xDraw(null, vpn, null, 'look'); });
        steps.push(function () { addTlb(vpn, e); xDraw(vpn, vpn, e, 'hit'); done(e); xlog('✅ Page table says page ' + vpn.toString(16).toUpperCase() + ' is in <b>frame ' + e + '</b>. Saved in the TLB for next time. Physical = ' + hex(e * 0x1000 + off)); });
      } else if (e === 'd') {
        steps.push(function () { xDraw(null, vpn, null, 'miss'); xlog('💤 <b>Page fault!</b> Page ' + vpn.toString(16).toUpperCase() + ' is on disk. The CPU traps into the kernel…'); });
        steps.push(function () {
          stats.pf++; var free = frames.indexOf(null), victim = null;
          if (free < 0) { victim = fifo.shift(); free = pt[victim]; pt[victim] = 'd'; tlb = tlb.filter(function (t) { return t.v !== victim; }); xlog('🔄 RAM is full → kernel evicts page ' + victim.toString(16).toUpperCase() + ' (oldest, FIFO) to disk, freeing frame ' + free + '.'); }
          frames[free] = vpn; pt[vpn] = free; fifo.push(vpn); addTlb(vpn, free); xDraw(vpn, vpn, free, 'hit'); done(free);
          xlog('📥 Kernel loaded page ' + vpn.toString(16).toUpperCase() + ' from disk into <b>frame ' + free + '</b>, fixed the page table, and re-ran the instruction. The program never noticed (it just waited ~0.1 ms).');
        });
      } else {
        steps.push(function () { xDraw(null, vpn, null, 'miss'); $('#paOut').textContent = 'physical: 💥'; xlog('🚫 Page ' + vpn.toString(16).toUpperCase() + ' isn\'t mapped at all. The kernel sends <b>SIGSEGV</b> → <code>Segmentation fault (core dumped)</code>. That\'s what happens with bad pointers!'); });
      }
    }
    var i = 0; (function run() { if (my !== xTok || i >= steps.length) return; steps[i++](); setTimeout(run, 700); })();
  }
  function addTlb(v, f) { tlb = [{ v: v, f: f }].concat(tlb.filter(function (e) { return e.v !== v; })).slice(0, 4); }
  $('#vaGo').addEventListener('click', function () { translate($('#vaIn').value); });
  $('#vaIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') translate($('#vaIn').value); });
  Core.$$('[data-va]').forEach(function (b) { b.addEventListener('click', function () { translate(b.dataset.va); }); });
  $('#vaRand').addEventListener('click', function () { var opts = [0, 1, 2, 3, 4, 6, 7, 8, 9, 12]; translate(hex(opts[Math.floor(Math.random() * opts.length)] * 0x1000 + Math.floor(Math.random() * 0x1000))); });
  $('#vaReset').addEventListener('click', xReset);
  xReset();

  /* ---------- page replacement ---------- */
  function replace(ref, n, alg) {
    var fr = [], hist = [], faults = 0, last = {}, arr = {};
    ref.forEach(function (p, t) {
      var hit = fr.indexOf(p) >= 0, victim = null;
      if (!hit) {
        faults++;
        if (fr.length < n) fr.push(p);
        else {
          var vi;
          if (alg === 'fifo') { vi = 0; fr.forEach(function (x, i) { if (arr[x] < arr[fr[vi]]) vi = i; }); }
          else if (alg === 'lru') { vi = 0; fr.forEach(function (x, i) { if (last[x] < last[fr[vi]]) vi = i; }); }
          else { var far = -1; vi = 0; fr.forEach(function (x, i) { var nx = ref.indexOf(x, t + 1); if (nx < 0) nx = 1e9; if (nx > far) { far = nx; vi = i; } }); }
          victim = fr[vi]; fr[vi] = p;
        }
        arr[p] = t;
      }
      last[p] = t;
      hist.push({ fr: fr.slice(), hit: hit, p: p, victim: victim });
    });
    return { hist: hist, faults: faults };
  }
  var rpTok = 0;
  function rpRun() {
    var ref = $('#rpRef').value.trim().split(/[\s,]+/).filter(Boolean).slice(0, 30), n = +$('#rpFr').value, alg = $('#rpAlg').value;
    if (!ref.length) return;
    var r = replace(ref, n, alg), my = ++rpTok, g = $('#rpGrid');
    var html = '<table><tr><th>ask</th>' + ref.map(function (p, i) { return '<th data-c="' + i + '" style="opacity:.25">' + p + '</th>'; }).join('') + '</tr>';
    for (var k = 0; k < n; k++) html += '<tr><th>F' + k + '</th>' + ref.map(function (p, i) { return '<td data-c="' + i + '"></td>'; }).join('') + '</tr>';
    html += '<tr class="res"><td></td>' + ref.map(function (p, i) { return '<td data-c="' + i + '"></td>'; }).join('') + '</tr></table>';
    g.innerHTML = html; $('#rpScore').textContent = 'faults: …';
    var i = 0, f = 0;
    (function step() {
      if (my !== rpTok || i >= ref.length) { if (my === rpTok) finish(); return; }
      var h = r.hist[i]; if (!h.hit) f++;
      var cells = g.querySelectorAll('[data-c="' + i + '"]');
      cells[0].style.opacity = 1;
      for (var k = 0; k < n; k++) { var c = cells[k + 1]; c.textContent = h.fr[k] != null ? h.fr[k] : ''; if (h.fr[k] === h.p) c.className = h.hit ? 'h' : 'f'; }
      cells[n + 1].textContent = h.hit ? '✔' : '✗'; cells[n + 1].style.color = h.hit ? 'var(--green)' : 'var(--red)';
      $('#rpScore').textContent = 'faults: ' + f + ' / ' + (i + 1);
      i++; setTimeout(step, 260);
    })();
    function finish() {
      var all = ['fifo', 'lru', 'opt'].map(function (a) { return [a, replace(ref, n, a).faults]; });
      $('#rpCompare').innerHTML = '<b>Same requests, ' + n + ' frames:</b> ' + all.map(function (x) { return '<span class="pill-tag">' + x[0].toUpperCase() + ': ' + x[1] + ' faults</span>'; }).join(' ') + ' — OPT is the best possible, but needs to know the future. LRU usually gets close.';
    }
  }
  $('#rpGo').addEventListener('click', rpRun);
  $('#rpBelady').addEventListener('click', function () {
    $('#rpRef').value = '1 2 3 4 1 2 5 1 2 3 4 5'; $('#rpAlg').value = 'fifo'; $('#rpFr').value = '3'; rpRun();
    var a = replace('1 2 3 4 1 2 5 1 2 3 4 5'.split(' '), 3, 'fifo').faults, b = replace('1 2 3 4 1 2 5 1 2 3 4 5'.split(' '), 4, 'fifo').faults;
    Core.toast('🧩 Belady\'s anomaly: FIFO with 3 frames = <b>' + a + '</b> faults, with 4 frames = <b>' + b + '</b> faults. More memory, MORE faults?! (LRU never does this.)', 6500);
  });
  rpRun();

  /* ---------- RAM pressure game ---------- */
  var TOTAL = 8, KERNEL = .6, SWAP = 2;
  var APPS = [['browser', '🦊', 'Browser', 1.8, 'orange'], ['game', '🎮', 'Big game', 3.2, 'pink'], ['editor', '📝', 'Editor', .4, 'green'], ['music', '🎵', 'Music', .3, 'blue'], ['db', '🐘', 'Database', 1.4, 'purple']];
  var running, cache, seq;
  function used() { return running.reduce(function (a, r) { return a + r.ram; }, 0); }
  function swapUsed() { return running.reduce(function (a, r) { return a + r.swap; }, 0); }
  function freeRam() { return Math.max(0, TOTAL - KERNEL - used() - cache); }
  function rlog(m) { var d = document.createElement('div'); d.innerHTML = m; $('#ramLog').insertBefore(d, $('#ramLog').firstChild); }
  function makeRoom(need, except) {
    var fr = freeRam();
    if (fr >= need) return true;
    if (cache > 0) { var take = Math.min(cache, need - fr); cache -= take; rlog('🧹 <b>kswapd</b> dropped ' + take.toFixed(1) + ' GB of page cache (just copies of files — free to drop).'); fr = freeRam(); if (fr >= need - 1e-9) return true; }
    var victims = running.filter(function (r) { return r !== except && r.ram > .1; }).sort(function (a, b) { return a.t - b.t; });
    for (var i = 0; i < victims.length && freeRam() < need - 1e-9; i++) {
      var v = victims[i], room = SWAP - swapUsed(); if (room <= .01) break;
      var amt = Math.min(v.ram * .7, room, need - freeRam()); if (amt <= .01) continue;
      v.ram -= amt; v.swap += amt; rlog('💤 Swapped out ' + amt.toFixed(1) + ' GB of <b>' + v.name + '</b> (least recently used) to the SSD. It\'s now slow 🐢.');
    }
    if (freeRam() >= need - 1e-9) return true;
    var big = running.filter(function (r) { return r !== except; }).sort(function (a, b) { return (b.ram + b.swap) - (a.ram + a.swap); })[0];
    if (!big) return false;
    running = running.filter(function (r) { return r !== big; });
    rlog('💥 <b>OOM killer</b>: out of RAM and swap! Killed <b>' + big.name + '</b> (highest oom_score, ' + (big.ram + big.swap).toFixed(1) + ' GB).');
    Core.toast('💥 Out of memory! Linux\'s OOM killer stopped <b>' + big.icon + ' ' + big.name + '</b> to save the system.', 4200);
    return makeRoom(need, except);
  }
  function launch(a) {
    var app = { id: a[0] + (++seq), icon: a[1], name: a[2], size: a[3], c: a[4], ram: 0, swap: 0, t: seq };
    if (!makeRoom(app.size, app)) { rlog('🚫 Could not start ' + app.name + '.'); render(); return; }
    app.ram = app.size; running.push(app); rlog('▶️ Started <b>' + app.icon + ' ' + app.name + '</b> (' + app.size + ' GB). Its pages are filled in as it touches them.'); render();
  }
  function wake(app) {
    if (!app.swap) return; app.t = ++seq;
    var need = app.swap;
    if (!makeRoom(need, app)) return render();
    if (running.indexOf(app) < 0) return render();
    app.ram += app.swap; rlog('📥 Swapped <b>' + app.name + '</b> back in (' + app.swap.toFixed(1) + ' GB from SSD — that\'s the lag you feel!).'); app.swap = 0; render();
  }
  function render() {
    var bar = '<span style="width:' + (KERNEL / TOTAL * 100) + '%;background:var(--purple)" title="kernel">kernel</span>';
    running.forEach(function (r) { if (r.ram > .01) bar += '<span style="width:' + (r.ram / TOTAL * 100) + '%;background:' + SK.solid(r.c) + '" title="' + r.name + '">' + r.icon + ' ' + r.ram.toFixed(1) + '</span>'; });
    if (cache > .01) bar += '<span class="hatch" style="width:' + (cache / TOTAL * 100) + '%;background-color:var(--teal-t);color:var(--ink)" title="page cache">cache</span>';
    $('#ramBar').innerHTML = bar;
    var sw = ''; running.forEach(function (r) { if (r.swap > .01) sw += '<span style="width:' + (r.swap / SWAP * 100) + '%;background:' + SK.solid(r.c) + ';opacity:.7">' + r.icon + '</span>'; });
    $('#swapBar').innerHTML = sw;
    $('#running').innerHTML = running.map(function (r) { return '<span class="app-chip' + (r.swap > .01 ? ' slow' : '') + '" style="background:' + SK.solid(r.c) + '"><button type="button" data-wake="' + r.id + '" title="use it">' + r.icon + ' ' + r.name + (r.swap > .01 ? ' 🐢' : '') + '</button><button type="button" data-kill="' + r.id + '" aria-label="Close ' + r.name + '">✕</button></span>'; }).join('') || '<span class="muted small">No apps running. Launch some! 👆</span>';
    var u = KERNEL + used(), f = freeRam(), avail = f + cache;
    $('#freeOut').textContent = '$ free -h\n' +
      '        total   used   free  buff/cache  available\n' +
      'Mem:   ' + pad(TOTAL) + pad(u) + pad(f) + pad(cache, 12) + pad(avail, 11) + '\n' +
      'Swap:  ' + pad(SWAP) + pad(swapUsed()) + pad(SWAP - swapUsed());
  }
  function pad(n, w) { var s = n.toFixed(1) + 'G'; while (s.length < (w || 7)) s = ' ' + s; return s; }
  $('#appBtns').innerHTML = APPS.map(function (a, i) { return '<button class="btn sm" type="button" data-app="' + i + '">' + a[1] + ' ' + a[2] + ' <span class="muted">(' + a[3] + 'G)</span></button>'; }).join('') +
    '<button class="btn sm blue" type="button" id="readFile">📄 read a 2 GB video file</button><button class="btn sm" type="button" id="ramReset">↺</button>';
  $('#ramGame').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.app) launch(APPS[+b.dataset.app]);
    else if (b.id === 'readFile') { var add = Math.min(2, freeRam()); cache += add; rlog('📄 Read a video file: Linux kept ' + add.toFixed(1) + ' GB of it in the <b>page cache</b>' + (add < 2 ? ' (all the free RAM it had)' : '') + '. Next read = instant ⚡'); render(); }
    else if (b.id === 'ramReset') resetGame();
    else if (b.dataset.kill) { running = running.filter(function (r) { return r.id !== b.dataset.kill; }); rlog('✕ Closed an app: its RAM and swap are free again.'); render(); }
    else if (b.dataset.wake) { var app = running.filter(function (r) { return r.id === b.dataset.wake; })[0]; if (app) { if (app.swap > .01) wake(app); else { app.t = ++seq; Core.toast(app.icon + ' ' + app.name + ' is fully in RAM — fast! ⚡', 1800); } } }
  });
  function resetGame() { running = []; cache = 1.0; seq = 0; $('#ramLog').innerHTML = ''; rlog('🐧 Booted. Linux is already using 1 GB of spare RAM as page cache.'); render(); }
  resetGame();

  /* ---------- copy on write ---------- */
  var CW = SK.diagram('#cowD', {
    title: 'Copy-on-write after fork', w: 820, h: 300, fs: 17,
    nodes: [
      { id: 'par', x: 20, y: 30, w: 180, h: 90, icon: '🐚', label: 'parent', sub: 'PID 100', c: 'blue', m: [10, 10, 170, 86] },
      { id: 'ch', x: 20, y: 180, w: 180, h: 90, icon: '🐣', label: 'child', sub: 'PID 101', c: 'pink', m: [220, 10, 170, 86] },
      { id: 'pa', x: 400, y: 20, w: 170, h: 70, label: '📄 page A', sub: 'read-only', c: 'green', m: [10, 190, 170, 70] },
      { id: 'pb', x: 400, y: 120, w: 170, h: 70, label: '📄 page B', sub: 'read-only', c: 'green', m: [220, 190, 170, 70] },
      { id: 'pc', x: 620, y: 200, w: 180, h: 74, label: '📄 copy of B', sub: 'child\'s own', c: 'yellow', dash: true, m: [220, 310, 170, 70] }
    ],
    edges: [{ from: 'par', to: 'pa' }, { from: 'par', to: 'pb' }, { from: 'ch', to: 'pa', dash: true }, { from: 'ch', to: 'pb', dash: true }, { from: 'ch', to: 'pc', c: 'pink' }],
    mobile: { w: 400, h: 390 }
  });
  SK.flow(CW, [
    { on: ['par', 'pa', 'pb'], edges: ['par>pa', 'par>pb'], say: '🐚 The parent process owns pages A and B.' },
    { on: ['ch', 'pa', 'pb'], edges: ['ch>pa', 'ch>pb'], go: [['par', 'ch', { label: 'fork()', c: 'pink' }]], say: '🧬 <code>fork()</code>! Instead of copying memory, Linux makes the child\'s page table point to the <b>same</b> pages — and marks them <b>read-only</b> for both. Instant!' },
    { on: ['ch', 'pb'], go: [['ch', 'pb', { label: 'write!', c: 'red' }]], say: '✏️ The child tries to <b>write</b> to page B. It\'s read-only → <b>page fault</b> → the kernel steps in.' },
    { on: ['pc', 'ch'], edges: ['ch>pc'], go: [['pb', 'pc', { label: 'copy', c: 'yellow' }]], say: '🐄 The kernel copies <b>just page B</b> into a new frame, points the child at the copy (now writable), and lets the write continue. Page A is still shared.' },
    { on: ['pa'], say: '✨ Only pages that change get copied. And since most children immediately call <code>exec()</code> anyway, almost nothing is ever copied. That\'s why fork() is so cheap!' }
  ]);

  /* ---------- buddy allocator ---------- */
  var blocks, bid;
  function bdReset() { blocks = [{ s: 0, o: 4, used: false }]; bid = 0; $('#bdLog').innerHTML = ''; bdDraw(); }
  function bdlog(m) { var d = document.createElement('div'); d.innerHTML = m; $('#bdLog').insertBefore(d, $('#bdLog').firstChild); }
  var BC = ['pink', 'blue', 'green', 'orange'];
  function bdDraw() {
    blocks.sort(function (a, b) { return a.s - b.s; });
    $('#buddy').innerHTML = blocks.map(function (b) { var n = 1 << b.o; return '<div class="' + (b.used ? '' : 'free') + '" style="flex:' + n + ';' + (b.used ? 'background:' + SK.solid(BC[b.o] || 'purple') : '') + '">' + (b.used ? '#' + b.id + ' · ' : '') + n + 'p</div>'; }).join('');
    var counts = [0, 0, 0, 0, 0]; blocks.forEach(function (b) { if (!b.used) counts[b.o]++; });
    $('#bdInfo').textContent = 'free blocks by order 0–4: ' + counts.join(' ');
  }
  function bdAlloc(o) {
    var cand = blocks.filter(function (b) { return !b.used && b.o >= o; }).sort(function (a, b) { return a.o - b.o || a.s - b.s; })[0];
    if (!cand) { bdlog('🚫 No free block of ' + (1 << o) + ' pages! (Memory is <b>fragmented</b> — free bits are too small or scattered.)'); return; }
    var splits = 0;
    while (cand.o > o) { cand.o--; blocks.push({ s: cand.s + (1 << cand.o), o: cand.o, used: false }); splits++; }
    cand.used = true; cand.id = ++bid;
    bdlog('✂️ Need ' + (1 << o) + ' page' + (o ? 's' : '') + ': ' + (splits ? 'split ' + splits + '× (halving each time), ' : '') + 'gave block #' + cand.id + ' at page ' + cand.s + '.');
    bdDraw();
  }
  function bdFree() {
    var used = blocks.filter(function (b) { return b.used; }); if (!used.length) return bdlog('Nothing to free 🙂');
    var b = used[Math.floor(Math.random() * used.length)]; b.used = false; var id = b.id, merges = 0;
    for (;;) {
      var size = 1 << b.o, bs = b.s ^ size;
      var buddy = blocks.filter(function (x) { return !x.used && x.o === b.o && x.s === bs; })[0];
      if (!buddy || b.o >= 4) break;
      blocks = blocks.filter(function (x) { return x !== buddy; }); b.s = Math.min(b.s, bs); b.o++; merges++;
    }
    bdlog('🧩 Freed #' + id + (merges ? '; it re-joined its free buddy ' + merges + '× into a ' + (1 << b.o) + '-page block.' : '; its buddy is busy, so no merge yet.'));
    bdDraw();
  }
  Core.$$('[data-bd]').forEach(function (b) { b.addEventListener('click', function () { bdAlloc(+b.dataset.bd); }); });
  $('#bdFree').addEventListener('click', bdFree); $('#bdReset').addEventListener('click', bdReset);
  bdReset();


  /* ---------- page faults, step by step ---------- */
  var PFD = SK.diagram('#pfD', {
    title: 'Page fault handling', w: 890, h: 400, fs: 16,
    nodes: [
      { id: 'cpu', x: 10, y: 20, w: 160, h: 80, icon: '🧠', label: 'CPU', sub: 'mov rax, [addr]', c: 'purple', m: [10, 10, 190, 76] },
      { id: 'tlb', x: 210, y: 20, w: 150, h: 80, icon: '⚡', label: 'TLB', sub: 'recent translations', c: 'yellow', m: [220, 10, 190, 76] },
      { id: 'pt', x: 400, y: 20, w: 160, h: 80, icon: '📒', label: 'page table', sub: 'present? allowed?', c: 'blue', m: [220, 126, 190, 76] },
      { id: 'trap', x: 600, y: 20, w: 280, h: 80, icon: '💥', label: 'PAGE FAULT', sub: 'exception 14 · CR2 = addr', c: 'red', m: [10, 126, 190, 76] },
      { id: 'vma', x: 600, y: 150, w: 280, h: 80, icon: '👑', label: 'kernel: is it legal?', sub: 'look up the VMA', c: 'orange', m: [100, 244, 220, 80] },
      { id: 'retry', x: 10, y: 150, w: 160, h: 80, icon: '🔁', label: 'retry', sub: 'same instruction', c: 'green', m: [220, 660, 190, 74] },
      { id: 'fix', x: 210, y: 150, w: 190, h: 80, icon: '✏️', label: 'map it', sub: 'update page table', c: 'teal', m: [10, 660, 190, 74] },
      { id: 'zero', x: 10, y: 300, w: 162, h: 84, icon: '🆕', label: 'fresh zero page', sub: 'minor', c: 'yellow', m: [10, 360, 190, 76] },
      { id: 'cache', x: 186, y: 300, w: 162, h: 84, icon: '📄', label: 'in page cache', sub: 'minor', c: 'green', m: [220, 360, 190, 76] },
      { id: 'disk', x: 362, y: 300, w: 162, h: 84, icon: '💤', label: 'read from disk', sub: 'MAJOR · sleeps', c: 'blue', m: [10, 456, 190, 76] },
      { id: 'cow', x: 538, y: 300, w: 162, h: 84, icon: '🐄', label: 'copy the page', sub: 'copy-on-write', c: 'pink', m: [220, 456, 190, 76] },
      { id: 'segv', x: 714, y: 300, w: 166, h: 84, icon: '💀', label: 'SIGSEGV', sub: 'program crashes', c: 'red', m: [115, 556, 190, 76] }
    ],
    edges: [
      { from: 'cpu', to: 'tlb' }, { from: 'tlb', to: 'pt', label: 'miss', mNoLabel: true }, { from: 'pt', to: 'trap', label: 'not OK', mNoLabel: true }, { from: 'trap', to: 'vma' },
      { from: 'tlb', to: 'cpu', curve: 40, label: 'hit ✅', m: { curve: 30 } },
      { from: 'vma', to: 'zero' }, { from: 'vma', to: 'cache' }, { from: 'vma', to: 'disk' }, { from: 'vma', to: 'cow' }, { from: 'vma', to: 'segv' },
      { from: 'zero', to: 'fix', dash: true }, { from: 'cache', to: 'fix', dash: true }, { from: 'disk', to: 'fix', dash: true }, { from: 'cow', to: 'fix', dash: true },
      { from: 'fix', to: 'retry' }, { from: 'retry', to: 'cpu' }
    ],
    mobile: { w: 420, h: 744 }
  });
  var pfCount = { min: 0, maj: 0, seg: 0 }, pfFlow = null;
  function counted(kind) { return function (D, anim) { if (anim && !this._done) { this._done = true; pfCount[kind]++; $('#pfMin').textContent = pfCount.min; $('#pfMaj').textContent = pfCount.maj; $('#pfSeg').textContent = pfCount.seg; } }; }
  var PK = { c: 'yellow', label: 'addr' };
  function common(first) {
    return [
      { on: ['cpu'], say: first },
      { on: ['tlb'], edges: ['cpu>tlb'], go: [['cpu', 'tlb', PK]], say: '⚡ The MMU asks the <b>TLB</b> for this address\'s translation… <b>miss</b>.' },
      { on: ['pt'], edges: ['tlb>pt'], go: [['tlb', 'pt', PK]], say: '📒 It walks the <b>page table</b>…' }
    ];
  }
  function tail(fixSay) {
    return [
      { on: ['fix'], go: [[fixSay[0], 'fix', { c: 'teal' }]], say: '✏️ The kernel writes the new page-table entry: virtual page → physical frame.' },
      { on: ['retry'], go: [['fix', 'retry', { c: 'green' }]], say: '🔁 It returns from the exception and the CPU <b>re-runs the very same instruction</b>…' },
      { on: ['cpu', 'retry'], go: [['retry', 'cpu', { c: 'green', label: '✅' }]], say: '✅ …and this time it works. The program never even noticed — it just took a little longer. ' + fixSay[1], fn: counted(fixSay[2]) }
    ];
  }
  var PF = {
    hit: [
      { on: ['cpu'], say: '🧠 The program reads a variable it has used before.' },
      { on: ['tlb'], go: [['cpu', 'tlb', PK]], say: '⚡ The <b>TLB</b> already knows this page\'s frame…' },
      { on: ['cpu'], edges: ['tlb>cpu'], go: [['tlb', 'cpu', { c: 'green', label: 'hit ✅' }]], say: '✅ <b>No fault at all</b>: the hardware translated the address in about a nanosecond. This is what happens for the vast majority of memory accesses — the kernel isn\'t involved.' }
    ],
    zero: common('🧠 <code>buf = malloc(1 MB)</code> returned addresses — but Linux gave <b>no real RAM</b> yet (lazy!). Now the program writes to it for the first time.').concat([
      { on: ['trap'], go: [['pt', 'trap', PK]], say: '💥 The entry says <b>not present</b> → the CPU raises <b>exception 14</b> and jumps into the kernel, saving the address in CR2.' },
      { on: ['vma'], go: [['trap', 'vma', { c: 'orange' }]], say: '👑 The kernel checks the process\'s memory regions (VMAs): this address is inside the <b>heap</b>. Legal!' },
      { on: ['zero'], go: [['vma', 'zero', { c: 'yellow' }]], say: '🆕 <b>Minor fault</b>: take a free frame and fill it with zeros (so you can never see another program\'s old data). No disk needed.' }
    ]).concat(tail(['zero', '(Counted as a <b>minor</b> fault.)', 'min'])),
    cache: common('🧠 The program calls a function in <code>libc.so</code> for the first time.').concat([
      { on: ['trap'], go: [['pt', 'trap', PK]], say: '💥 Not present in <i>this</i> process\'s page table → page fault.' },
      { on: ['vma'], go: [['trap', 'vma', { c: 'orange' }]], say: '👑 The VMA says: "this range is libc.so, read + execute". Legal!' },
      { on: ['cache'], go: [['vma', 'cache', { c: 'green' }]], say: '📄 libc is used by almost every program, so its pages are already in RAM in the <b>page cache</b>. Just point to that frame — <b>minor fault</b>, no disk!' }
    ]).concat(tail(['cache', 'Shared pages like this save tons of RAM.', 'min'])),
    disk: common('🧠 The program touches memory it hasn\'t used in a long while…').concat([
      { on: ['trap'], go: [['pt', 'trap', PK]], say: '💥 The entry is not present — but it remembers "this page is in <b>swap</b>, slot 4211".' },
      { on: ['vma'], go: [['trap', 'vma', { c: 'orange' }]], say: '👑 Legal address, the data just isn\'t in RAM.' },
      { on: ['disk'], go: [['vma', 'disk', { c: 'blue', label: 'read 4 KB' }]], say: '💤 <b>MAJOR fault</b>: the kernel starts a disk read and puts the process to <b>sleep</b>. Other programs use the CPU meanwhile. When the SSD answers (~50–100 µs; an HDD takes ~10 ms!) the process wakes up.' }
    ]).concat(tail(['disk', 'Lots of major faults = "my computer is slow and the disk light is busy" = buy RAM. 😅', 'maj'])),
    cow: [
      { on: ['cpu'], say: '🧠 After <code>fork()</code>, parent and child share the same pages, marked <b>read-only</b>. Now the child <b>writes</b> to one.' },
      { on: ['tlb'], go: [['cpu', 'tlb', PK]], say: '⚡ TLB miss (or a read-only hit)…' },
      { on: ['pt'], go: [['tlb', 'pt', PK]], say: '📒 The page is present, but marked <b>read-only</b>, and this is a write.' },
      { on: ['trap'], go: [['pt', 'trap', PK]], say: '💥 Protection fault → exception 14 (error code says: "write to a present page").' },
      { on: ['vma'], go: [['trap', 'vma', { c: 'orange' }]], say: '👑 The VMA says the region <i>is</i> writable — so this is <b>copy-on-write</b>, not a bug.' },
      { on: ['cow'], go: [['vma', 'cow', { c: 'pink', label: 'copy 4 KB' }]], say: '🐄 The kernel copies this one page into a new frame for the child.' }
    ].concat(tail(['cow', 'Only pages that are written ever get copied — that\'s why fork() is cheap.', 'min'])),
    segv: common('🧠 Buggy code: <code>int *p = NULL; *p = 42;</code> — writing to address 0!').concat([
      { on: ['trap'], go: [['pt', 'trap', PK]], say: '💥 Nothing is mapped at page 0 (on purpose!) → page fault.' },
      { on: ['vma'], go: [['trap', 'vma', { c: 'orange' }]], say: '👑 The kernel looks for a VMA containing address 0… <b>none</b>. Illegal!' },
      { on: ['segv'], go: [['vma', 'segv', { c: 'red', label: 'SIGSEGV' }]], say: '💀 The kernel sends <b>SIGSEGV</b>: <code>Segmentation fault (core dumped)</code>. Only this program dies — every other process is safe, thanks to separate address spaces.', fn: counted('seg') }
    ])
  };
  function pfStart(kind, autoplay) {
    if (pfFlow) pfFlow.ui.remove();
    PFD.onrender = []; var steps = PF[kind].map(function (s) { var c = {}; for (var k in s) c[k] = s[k]; return c; });
    Core.$$('#pfBtns [data-pf]').forEach(function (b) { b.classList.toggle('on', b.dataset.pf === kind); });
    pfFlow = SK.flow(PFD, steps, { intro: 'Press <b>▶ Play</b> to follow this memory access.' });
    if (autoplay) pfFlow.play();
  }
  Core.$$('#pfBtns [data-pf]').forEach(function (b) { b.addEventListener('click', function () { pfStart(b.dataset.pf, true); }); });
  pfStart('zero', false);

  /* ---------- DRAM: leaky buckets ---------- */
  var DR = 8, DCOL = 16, MSG = 'Hi kid! RAM rox!', cells, drTimer = null, drVisible = false, powered = true;
  function bitsOf(txt) { var b = []; for (var i = 0; i < 2; i++) { var c = (txt.charCodeAt(i) || 32) & 255; for (var k = 7; k >= 0; k--) b.push((c >> k) & 1); } return b; }
  function sensed(r) { return cells[r].map(function (c) { return c.q > .5 ? 1 : 0; }); }
  function txtOf(bits) { var s2 = ''; for (var i = 0; i < 2; i++) { var v = 0; for (var k = 0; k < 8; k++) v = v * 2 + bits[i * 8 + k]; s2 += v >= 32 && v < 127 ? String.fromCharCode(v) : '·'; } return s2; }
  function drInit() {
    cells = []; for (var r = 0; r < DR; r++) { var b = bitsOf(MSG.substr(r * 2, 2)); cells.push(b.map(function (x) { return { q: x, k: .004 + Math.random() * Math.random() * .05 }; })); }
    powered = true; $('#drPower').textContent = '🔌 power off';
    var g = ''; for (var r2 = 0; r2 < DR; r2++) { g += '<div class="rl">row ' + r2 + '</div>'; for (var c = 0; c < DCOL; c++) g += '<div class="cell" data-r="' + r2 + '" data-c="' + c + '"><i></i><b></b></div>'; g += '<div class="rt" data-t="' + r2 + '"></div>'; }
    $('#dram').innerHTML = g;
    $('#amp').innerHTML = '<span style="border:0;font-family:var(--font-hand);font-size:12px">sense amps</span>' + Array.from({ length: DCOL }, function () { return '<span>·</span>'; }).join('') + '<span style="border:0"></span>';
    $('#drRow').innerHTML = Array.from({ length: DR }, function (_, i) { return '<option value="' + i + '">' + i + '</option>'; }).join('');
    $('#drOut').textContent = 'Memory holds: "' + MSG + '" — 2 letters per row, 8 bits per letter.';
    drDraw();
  }
  function drDraw() {
    var rowsEls = Core.$$('#dram .cell');
    rowsEls.forEach(function (el) { var c = cells[+el.dataset.r][+el.dataset.c]; el.firstChild.style.height = Math.round(c.q * 100) + '%'; el.lastChild.textContent = c.q > .5 ? '1' : '0'; });
    for (var r = 0; r < DR; r++) $('#dram [data-t="' + r + '"]').textContent = '"' + txtOf(sensed(r)) + '"';
  }
  function refreshAll() {
    var r = 0;
    (function nx() {
      if (r >= DR || !powered) return;
      var rr = r;
      cells[rr].forEach(function (c) { c.q = c.q > .5 ? 1 : 0; });
      r++; setTimeout(nx, 40);
    })();
  }
  function drTick() {
    if (!drVisible || document.hidden) return;
    cells.forEach(function (row) { row.forEach(function (c) { if (c.q > 0) c.q = Math.max(0, c.q - (powered ? c.k : .2)); }); });
    drTick.n = (drTick.n || 0) + 1;
    if (powered && $('#drAuto').checked && drTick.n % 6 === 0) refreshAll();
    drDraw();
  }
  function rowFlash(r, cls) { var cs = Core.$$('#dram .cell[data-r="' + r + '"]'); cs.forEach(function (e) { e.style.outline = '3px solid ' + (cls === 'w' ? 'var(--pink)' : 'var(--yellow)'); }); setTimeout(function () { cs.forEach(function (e) { e.style.outline = ''; }); }, 700); }
  $('#drRead').addEventListener('click', function () {
    var r = +$('#drRow').value, b = sensed(r);
    var amps = Core.$$('#amp span'); b.forEach(function (x, i) { amps[i + 1].textContent = x; amps[i + 1].classList.add('on'); }); setTimeout(function () { amps.forEach(function (a) { a.classList.remove('on'); }); }, 900);
    cells[r].forEach(function (c, i) { c.q = b[i]; }); rowFlash(r);
    $('#drOut').textContent = 'READ row ' + r + ': the whole row is opened into the sense amplifiers → ' + b.slice(0, 8).join('') + ' ' + b.slice(8).join('') + ' → "' + txtOf(b) + '".\nReading drains the buckets, so the chip immediately writes the row back (that\'s also how refresh works).';
    drDraw();
  });
  $('#drWrite').addEventListener('click', function () {
    if (!powered) { $('#drOut').textContent = '🔌 The chip has no power — nothing can be stored!'; return; }
    var r = +$('#drRow').value, t = ($('#drText').value + '  ').slice(0, 2), b = bitsOf(t);
    cells[r].forEach(function (c, i) { c.q = b[i]; }); rowFlash(r, 'w');
    $('#drOut').textContent = 'WRITE row ' + r + ': "' + t + '" = ' + b.slice(0, 8).join('') + ' ' + b.slice(8).join('') + ' → buckets filled (1) or emptied (0).'; drDraw();
  });
  $('#drAll').addEventListener('click', function () {
    var all = ''; for (var r = 0; r < DR; r++) all += txtOf(sensed(r));
    $('#drOut').textContent = 'Whole chip says: "' + all + '"' + (all === MSG ? '  ✅ perfect' : '  ' + (all.replace(/[· ]/g, '') ? '⚠️ some bits flipped!' : '💀 everything is gone'));
  });
  $('#drAuto').addEventListener('change', function () { $('#drStatus').textContent = 'refresh: ' + (this.checked ? 'on' : 'OFF — buckets are leaking!'); });
  $('#drPower').addEventListener('click', function () {
    powered = !powered; this.textContent = powered ? '🔌 power off' : '🔌 power on';
    $('#drOut').textContent = powered ? 'Power is back… but the buckets are empty. RAM forgot everything — that\'s why unsaved work is lost in a power cut. (The kernel and your programs must be loaded again from the disk at boot.)' : '🔌 Power off: no more refresh, all buckets drain in a blink…';
  });
  $('#drReset').addEventListener('click', drInit);
  drInit();
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { drVisible = e[0].isIntersecting; }).observe($('#dramSim')); else drVisible = true;
  drTimer = setInterval(drTick, 200);

  /* ---------- RAM vs VRAM flow ---------- */
  var VD = SK.diagram('#vramD', {
    title: 'How data reaches VRAM and the screen', w: 900, h: 330, fs: 16,
    groups: [{ x: 4, y: 4, w: 400, h: 320, label: '🟩 motherboard', c: 'green', m: [4, 4, 412, 330] }, { x: 590, y: 4, w: 200, h: 320, label: '🎮 graphics card', c: 'purple', m: [4, 400, 412, 170] }],
    nodes: [
      { id: 'ssd', x: 20, y: 46, w: 150, h: 80, icon: '💾', label: 'SSD', sub: 'game files', c: 'blue', m: [20, 46, 170, 80] },
      { id: 'ram', x: 220, y: 46, w: 170, h: 90, icon: '🧮', label: 'RAM', sub: 'DDR5 · ~80 GB/s', c: 'green', m: [225, 46, 175, 90] },
      { id: 'cpu', x: 220, y: 210, w: 170, h: 90, icon: '🧠', label: 'CPU', sub: 'game + driver', c: 'pink', m: [225, 196, 175, 90] },
      { id: 'pcie', x: 440, y: 130, w: 120, h: 70, icon: '🛣️', label: 'PCIe bus', c: 'orange', m: [20, 196, 170, 90] },
      { id: 'vram', x: 605, y: 46, w: 170, h: 90, icon: '🎨', label: 'VRAM', sub: 'GDDR6 · ~500 GB/s', c: 'purple', m: [20, 440, 175, 90] },
      { id: 'gpu', x: 605, y: 210, w: 170, h: 90, icon: '⚙️', label: 'GPU cores', sub: 'thousands of them', c: 'yellow', m: [225, 440, 175, 90] },
      { id: 'mon', x: 815, y: 120, w: 80, h: 90, icon: '📺', label: 'screen', c: 'teal', m: [140, 610, 140, 80] }
    ],
    edges: [{ from: 'ssd', to: 'ram' }, { from: 'cpu', to: 'ram', label: 'commands', mNoLabel: true }, { from: 'ram', to: 'pcie' }, { from: 'pcie', to: 'vram', label: 'DMA', mNoLabel: true }, { from: 'vram', to: 'gpu', both: true }, { from: 'vram', to: 'mon', label: 'scan-out', mNoLabel: true }],
    mobile: { w: 420, h: 700 }
  });
  SK.flow(VD, [
    { on: ['ssd', 'ram'], go: [['ssd', 'ram', { c: 'blue', label: 'texture.png' }]], say: '💾 A game loads its pictures (<b>textures</b>) and 3D models from the SSD into normal <b>RAM</b> — through the page cache, like any file.' },
    { on: ['cpu', 'ram'], go: [['cpu', 'ram', { c: 'pink', label: 'draw list' }]], say: '🧠 The CPU (the game plus the graphics driver) writes a list of drawing <b>commands</b> into RAM: "draw this model, with that texture, here".' },
    { on: ['pcie', 'vram'], go: [['ram', 'pcie', { c: 'orange', label: 'DMA' }], ['pcie', 'vram', { c: 'orange' }]], say: '🛣️ The GPU\'s own <b>DMA engine</b> copies textures and commands across the <b>PCIe bus</b> into <b>VRAM</b>. (The CPU just says "go" — remember DMA from Chapter 7.)' },
    { on: ['vram', 'gpu'], go: [['vram', 'gpu', { c: 'purple' }], ['gpu', 'vram', { c: 'yellow', label: 'pixels' }]], say: '⚙️ Thousands of GPU cores read VRAM at ~500+ GB/s and paint the next picture into a <b>framebuffer</b> — a big grid of pixels in VRAM.' },
    { on: ['vram', 'mon'], go: [['vram', 'mon', { c: 'teal', label: '144×/s' }]], say: '📺 The display engine reads the finished framebuffer and streams it to the monitor, 60–240 times every second (<b>scan-out</b>). Linux\'s <b>KMS</b> tells it which buffer to show.' },
    { on: ['ram', 'gpu'], say: '💻 Laptop with <b>integrated graphics</b>? Then there\'s no separate VRAM: the GPU uses a slice of normal RAM. No PCIe copy, but the CPU and GPU share (and fight over) the same memory bandwidth.' }
  ]);

  /* ---------- framebuffer calculator ---------- */
  function fbCalc() {
    var r = $('#fbRes').value.split('x'), w = +r[0], h = +r[1], hz = +$('#fbHz').value, n = +$('#fbBuf').value;
    var frame = w * h * 4, mb = frame / 1048576, tot = mb * n, gbs = frame * hz / 1e9;
    $('#fbOut').innerHTML =
      '<div class="card c-y"><div class="small">one frame</div><div class="num-big">' + mb.toFixed(1) + '</div><div class="small">MB (' + (w * h / 1e6).toFixed(1) + ' million pixels)</div></div>' +
      '<div class="card c-p"><div class="small">' + n + ' buffers</div><div class="num-big">' + tot.toFixed(0) + '</div><div class="small">MB of VRAM</div></div>' +
      '<div class="card c-b"><div class="small">screen reads</div><div class="num-big">' + gbs.toFixed(1) + '</div><div class="small">GB every second</div></div>' +
      '<div class="card c-g"><div class="small">same as</div><div class="num-big">' + Math.round(mb / 1.44) + '</div><div class="small">floppy disks per frame 💾</div></div>';
  }
  ['fbRes', 'fbHz', 'fbBuf'].forEach(function (id) { $('#' + id).addEventListener('change', fbCalc); }); fbCalc();

  OSLab.mount(document.getElementById('labPf'), { scenarios: ['pfault'] });
  OSLab.mount(document.getElementById('labDram'), { scenarios: ['dram'] });
  OSLab.mount(document.getElementById('labGpu'), { scenarios: ['gpu'] });
  OSLab.mount(document.getElementById('lab'), { scenarios: ['ram', 'vram'] });

  Core.quiz('#quizBox', [
    { q: 'Which of these is a MAJOR page fault?', a: ['Touching freshly malloc\'d memory for the first time', 'Calling a libc function already in the page cache', 'Touching a page that was swapped out to disk', 'A TLB hit'], c: 2, why: 'Major faults need disk I/O (swap or an unread file page); the process sleeps until the data arrives. Minor faults are fixed from RAM alone.' },
    { q: 'What is VRAM?', a: ['A virus in RAM', 'The graphics card\'s own fast memory next to the GPU', 'Virtual memory on disk', 'The CPU\'s L1 cache'], c: 1, why: 'Dedicated GPUs have their own VRAM (GDDR6/HBM) built for huge bandwidth; integrated GPUs share normal RAM instead.' },
    { q: 'Why does DRAM need to be refreshed all the time?', a: ['To clean dust', 'Its tiny capacitors leak charge, so bits fade unless rewritten', 'To update Linux', 'It doesn\'t'], c: 1, why: 'Each DRAM bit is a capacitor that leaks; the memory controller re-writes every row within 64 ms. No power = no refresh = data gone.' },
    { q: 'Why does each process get its own virtual address space?', a: ['To use more electricity', 'Isolation: one program can\'t read or break another\'s memory', 'So programs run slower', 'Because RAM is round'], c: 1, why: 'Each process has its own page table, so it simply cannot name another process\'s frames. Isolation for free!' },
    { q: 'What is a page fault?', a: ['A broken RAM chip', 'The CPU touched a page that isn\'t currently mapped in RAM, so the kernel steps in', 'A typo in a file', 'When the screen flickers'], c: 1, why: 'Page faults are normal: lazy allocation, swap-in, copy-on-write all use them. Only faults on unmapped addresses become a segfault.' },
    { q: 'What is the TLB?', a: ['A tiny CPU cache of recent virtual→physical translations', 'A type of hard disk', 'The Linux boot loader', 'A file system'], c: 0, why: 'The Translation Lookaside Buffer avoids walking the 4-level page table on every memory access.' },
    { q: 'In "free -h", the buff/cache column is…', a: ['Wasted memory', 'Memory leaked by apps', 'File data cached in spare RAM, reclaimable when apps need it', 'Swap space'], c: 2, why: 'Linux uses free RAM as page cache. "available" tells you how much apps can still get.' },
    { q: 'When RAM and swap are both full, Linux…', a: ['Shuts down', 'Asks you to buy RAM', 'Runs the OOM killer to stop a process (usually the biggest)', 'Deletes files'], c: 2, why: 'The Out-Of-Memory killer picks a victim by oom_score to free memory and keep the system alive.' },
    { q: 'Why is fork() fast even for a huge process?', a: ['It copies memory very quickly', 'Copy-on-write: pages are shared until someone writes', 'It doesn\'t create a process', 'It uses the GPU'], c: 1, why: 'Parent and child share read-only pages; only pages that get written are copied.' }
  ]);
})();
