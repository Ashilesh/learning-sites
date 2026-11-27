/* Chapter 3 — Processes & scheduling */
(function () {
  'use strict';
  var PCOL = ['pink', 'blue', 'green', 'orange', 'purple', 'teal', 'yellow', 'red'];

  /* ---------- program vs process ---------- */
  var P = SK.diagram('#progD', {
    title: 'One program file, two running processes', w: 840, h: 280, fs: 17,
    groups: [{ x: 4, y: 4, w: 220, h: 270, label: 'on disk 💾', c: 'gray', m: [4, 4, 392, 150] }, { x: 300, y: 4, w: 536, h: 270, label: 'in RAM, running 🏃', c: 'green', m: [4, 176, 392, 290] }],
    nodes: [
      { id: 'prog', x: 30, y: 80, w: 170, h: 130, icon: '📜', label: 'firefox', sub: '/usr/bin/firefox\n(a program)', c: 'yellow', shape: 'note', m: [100, 40, 200, 100] },
      { id: 'p1', x: 330, y: 50, w: 230, h: 200, icon: '🦊', label: 'Process', sub: 'PID 2211\nits own memory\nits own open files\nstate: running', c: 'orange', m: [16, 212, 176, 236] },
      { id: 'p2', x: 590, y: 50, w: 230, h: 200, icon: '🦊', label: 'Process', sub: 'PID 3175\nits own memory\nits own open files\nstate: sleeping', c: 'pink', m: [208, 212, 176, 236] }
    ],
    edges: [{ from: 'prog', to: 'p1', label: 'run it', m: {} }, { from: 'prog', to: 'p2', label: 'run it again', curve: -60, m: { curve: 30 } }],
    mobile: { w: 400, h: 470 }
  });

  /* ---------- states ---------- */
  var S = SK.diagram('#statesD', {
    title: 'Linux process states', w: 840, h: 390, fs: 17,
    nodes: [
      { id: 'new', x: 10, y: 34, w: 140, h: 80, icon: '🐣', label: 'New', sub: 'just forked', c: 'yellow', m: [10, 10, 160, 80] },
      { id: 'ready', x: 200, y: 160, w: 160, h: 86, icon: '🙋', label: 'Ready  (R)', sub: 'in the run queue', c: 'blue', m: [10, 150, 180, 86] },
      { id: 'run', x: 480, y: 160, w: 160, h: 86, icon: '🏃', label: 'Running (R)', sub: 'on a CPU core', c: 'green', m: [214, 150, 180, 86] },
      { id: 'wait', x: 340, y: 296, w: 170, h: 84, icon: '😴', label: 'Sleeping (S/D)', sub: 'waiting for I/O', c: 'purple', m: [110, 300, 190, 84] },
      { id: 'stop', x: 340, y: 14, w: 160, h: 80, icon: '🧊', label: 'Stopped (T)', sub: 'Ctrl+Z / SIGSTOP', c: 'teal', m: [214, 10, 180, 80] },
      { id: 'zombie', x: 690, y: 160, w: 140, h: 86, icon: '🧟', label: 'Zombie (Z)', sub: 'exited, not reaped', c: 'orange', m: [214, 440, 180, 86] },
      { id: 'gone', x: 690, y: 300, w: 140, h: 80, icon: '👻', label: 'Gone', sub: 'parent called wait()', c: 'gray', m: [10, 440, 180, 86] }
    ],
    edges: [
      { from: 'new', to: 'ready', label: 'admitted', mNoLabel: true },
      { from: 'ready', to: 'run', label: 'scheduled', curve: -26 },
      { from: 'run', to: 'ready', label: 'preempted', curve: -26 },
      { from: 'run', to: 'wait', label: 'read()/sleep', mNoLabel: true },
      { from: 'wait', to: 'ready', label: 'data ready', mNoLabel: true },
      { from: 'run', to: 'stop', label: 'SIGSTOP', mNoLabel: true },
      { from: 'stop', to: 'ready', label: 'SIGCONT', mNoLabel: true },
      { from: 'run', to: 'zombie', label: 'exit()', m: {} },
      { from: 'zombie', to: 'gone', label: 'wait()' }
    ],
    mobile: { w: 404, h: 540 }
  });
  var tok = { label: '🍕 P', c: 'yellow' };
  SK.flow(S, [
    { on: ['new'], say: '🐣 <code>fork()</code> creates a new process. It gets a PID and a copy of its parent\'s memory (copy-on-write).' },
    { on: ['ready'], go: [['new', 'ready', tok]], say: '🙋 It joins the <b>run queue</b>: ready to run, waiting for a CPU turn. <code>ps</code> shows <b>R</b> (runnable).' },
    { on: ['run'], go: [['ready', 'run', tok]], edges: ['ready>run'], say: '🏃 The scheduler picks it — now it\'s <b>Running</b> on a CPU core. Also shown as <b>R</b>.' },
    { on: ['ready'], go: [['run', 'ready', tok]], edges: ['run>ready'], say: '⏰ Its time slice ran out (or a more urgent task woke up). It\'s <b>preempted</b> — sent back to Ready. Nobody hogs the CPU!' },
    { on: ['run'], go: [['ready', 'run', tok]], say: '🏃 Its turn again…' },
    { on: ['wait'], go: [['run', 'wait', tok]], say: '😴 It asks to read a file or waits for a key press. No point using the CPU while waiting, so it <b>sleeps</b> (<b>S</b>). <b>D</b> = an uninterruptible sleep, usually waiting for a disk.' },
    { on: ['ready'], go: [['wait', 'ready', tok]], say: '📬 The data arrived (an interrupt told the kernel!). The process is woken up → Ready again.' },
    { on: ['stop'], go: [['ready', 'run', tok], ['run', 'stop', tok]], say: '🧊 You press <kbd>Ctrl</kbd>+<kbd>Z</kbd> (SIGTSTP) or someone sends SIGSTOP → <b>Stopped</b> (<b>T</b>). Frozen in time.' },
    { on: ['ready'], go: [['stop', 'ready', tok]], say: '▶️ <code>fg</code>, <code>bg</code> or SIGCONT wakes it up → Ready.' },
    { on: ['zombie'], go: [['ready', 'run', tok], ['run', 'zombie', tok]], say: '🧟 It\'s finished and calls <code>exit()</code>. Memory is freed, but a tiny record with its <b>exit code</b> stays — a <b>zombie</b> (<b>Z</b>) — until the parent reads it.' },
    { on: ['gone'], go: [['zombie', 'gone', tok]], say: '👻 The parent calls <code>wait()</code> and gets the exit code. The record is deleted. (If the parent died first, <b>PID 1 adopts the orphan</b> and reaps it.)' }
  ]);

  /* ---------- fork lab ---------- */
  var procs, nextPid, sel;
  var NAMES = { systemd: '👑', bash: '🐚', ls: '📋', python3: '🐍', nginx: '🌐', vim: '📝', sleep: '😴' };
  var logEl = document.getElementById('forkLog'), treeEl = document.getElementById('ptree');
  function log(msg) { var d = document.createElement('div'); d.innerHTML = msg; logEl.insertBefore(d, logEl.firstChild); }
  function resetFork() {
    procs = { 1: { pid: 1, ppid: 0, name: 'systemd', st: 'run' }, 100: { pid: 100, ppid: 1, name: 'bash', st: 'run' } };
    nextPid = 101; sel = 100; logEl.innerHTML = ''; log('🐚 Your shell <b>bash (PID 100)</b> is running. Its parent is <b>systemd (PID 1)</b>.'); drawTree();
  }
  function kids(pid) { return Object.keys(procs).map(Number).filter(function (p) { return procs[p].ppid === pid; }).sort(function (a, b) { return a - b; }); }
  function drawTree() {
    var NW = 128, NH = 58, GX = 14, GY = 46;
    var pos = {}, col = 0, maxD = 0;
    (function lay(pid, d) {
      maxD = Math.max(maxD, d); var ks = kids(pid);
      if (!ks.length) { pos[pid] = [col * (NW + GX), d * (NH + GY)]; col++; return; }
      ks.forEach(function (k) { lay(k, d + 1); });
      var xs = ks.map(function (k) { return pos[k][0]; }); pos[pid] = [(Math.min.apply(0, xs) + Math.max.apply(0, xs)) / 2, d * (NH + GY)];
    })(1, 0);
    var W = Math.max(col * (NW + GX), 300) + 10, H = (maxD + 1) * (NH + GY) + 6;
    var svg = SK.S('svg', { viewBox: '-5 -5 ' + W + ' ' + H, width: Math.max(W, 280), style: 'max-width:100%;height:auto' });
    Object.keys(pos).forEach(function (p) {
      p = Number(p); var pr = procs[p]; if (!pr.ppid || !pos[pr.ppid]) return;
      var a = pos[pr.ppid], b = pos[p], r = SK.rng('e' + p);
      SK.S('path', { d: SK.rline(a[0] + NW / 2, a[1] + NH, b[0] + NW / 2, b[1], r), style: 'fill:none;stroke:var(--ink-soft);stroke-width:2' }, svg);
    });
    Object.keys(pos).forEach(function (p) {
      p = Number(p); var pr = procs[p], x = pos[p][0], y = pos[p][1], r = SK.rng('n' + p + pr.name);
      var g = SK.S('g', { class: 'pnode sk-node' + (p === sel ? ' sel' : '') + (pr.st === 'zombie' ? ' zombie' : ''), tabindex: 0, role: 'button', 'aria-label': pr.name + ' PID ' + p }, svg);
      var c = p === 1 ? 'yellow' : PCOL[p % PCOL.length];
      SK.S('path', { d: SK.rround(x + 2, y + 2, NW - 2, NH - 2, 9, r, .8, 1) + 'Z', class: 'sk-fill', style: 'fill:' + SK.tint(c) }, g);
      SK.S('path', { d: SK.rround(x, y, NW, NH, 9, r), class: 'sk-stroke' }, g);
      var t1 = SK.S('text', { x: x + NW / 2, y: y + 20, 'font-size': 17, style: 'font-weight:700' }, g); t1.textContent = (pr.st === 'zombie' ? '🧟 ' : (NAMES[pr.name] || '⚙️') + ' ') + pr.name;
      var t2 = SK.S('text', { x: x + NW / 2, y: y + 41, 'font-size': 14 }, g); t2.textContent = 'PID ' + p + (pr.st === 'zombie' ? ' · zombie' : '');
      var pick = function () { sel = p; drawTree(); };
      g.addEventListener('click', pick); g.addEventListener('keydown', function (e) { if (e.key === 'Enter') pick(); });
    });
    treeEl.innerHTML = ''; treeEl.appendChild(svg);
  }
  document.getElementById('forkLab').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return; var act = b.dataset.act, p = procs[sel];
    if (act === 'reset') return resetFork();
    if (!p) return;
    if (p.st === 'zombie' && act !== 'reset') { Core.toast('🧟 PID ' + sel + ' is a zombie — it can\'t do anything. Its parent must call <b>wait()</b>.'); return; }
    if (act === 'fork') {
      if (Object.keys(procs).length > 14) { Core.toast('🌋 Whoa, that\'s a lot of processes! (A real "fork bomb" can freeze a computer — Linux limits it with <code>ulimit -u</code> and the pids cgroup.)'); return; }
      var c = { pid: nextPid++, ppid: sel, name: p.name, st: 'run' }; procs[c.pid] = c;
      log('🧬 <b>' + p.name + ' (' + sel + ')</b> called fork() → child <b>PID ' + c.pid + '</b>, an exact copy. fork() returned ' + c.pid + ' to the parent and 0 to the child.');
      sel = c.pid;
    } else if (act === 'exec') {
      if (sel === 1) { Core.toast('👑 Let\'s not replace systemd — the whole system depends on PID 1!'); return; }
      var prog = document.getElementById('execProg').value, old = p.name; p.name = prog;
      log('🔄 PID ' + sel + ' called execve("/usr/bin/' + prog + '"): <b>same PID</b>, but ' + old + '\'s code is replaced by <b>' + prog + '</b>.');
    } else if (act === 'exit') {
      if (sel === 1) { Core.toast('💥 <b>Kernel panic!</b> "Attempted to kill init!" — PID 1 must never exit.'); log('💥 If PID 1 exits, the kernel panics. Try another process.'); return; }
      p.st = 'zombie';
      var orphans = kids(sel).filter(function (k) { return procs[k].st !== 'gone'; });
      orphans.forEach(function (k) { procs[k].ppid = 1; });
      log('👋 PID ' + sel + ' (' + p.name + ') called exit(0). It\'s now a <b>zombie 🧟</b> until its parent (' + p.ppid + ') calls wait().' + (orphans.length ? ' Its children ' + orphans.join(', ') + ' are <b>orphans</b> → adopted by systemd (PID 1).' : ''));
      if (p.ppid === 1) {
        var z = sel; setTimeout(function () { if (procs[z] && procs[z].st === 'zombie') { delete procs[z]; log('🧹 systemd (PID 1) automatically reaped orphan/child ' + z + '. PID 1 always cleans up!'); drawTree(); } }, 1400);
      }
      sel = p.ppid;
    } else if (act === 'wait') {
      var zs = kids(sel).filter(function (k) { return procs[k].st === 'zombie'; });
      if (!zs.length) { log('⏳ ' + p.name + ' (' + sel + ') called wait() but has no zombie children. In real life it would <b>block</b> (sleep) until a child exits.'); }
      zs.forEach(function (k) { delete procs[k]; log('📥 ' + p.name + ' (' + sel + ') called wait() → collected exit code 0 from PID ' + k + '. Zombie removed 👻.'); });
    }
    drawTree();
  });
  resetFork();

  /* ---------- threads ---------- */
  SK.diagram('#threadsD', {
    title: 'Processes vs threads', w: 860, h: 300, fs: 16,
    groups: [{ x: 4, y: 4, w: 400, h: 292, label: 'Two processes 🏠🏠', c: 'blue', m: [4, 4, 412, 292] }, { x: 440, y: 4, w: 416, h: 292, label: 'One process, three threads 🏠', c: 'pink', m: [4, 316, 412, 292] }],
    nodes: [
      { id: 'a', x: 20, y: 46, w: 180, h: 236, label: 'Process A', sub: 'code\nheap (data)\nopen files\n—\nstack\nregisters', c: 'blue', top: 12, m: [20, 46, 180, 236] },
      { id: 'b', x: 212, y: 46, w: 180, h: 236, label: 'Process B', sub: 'code\nheap (data)\nopen files\n—\nstack\nregisters', c: 'teal', top: 12, m: [220, 46, 180, 236] },
      { id: 'sh', x: 456, y: 46, w: 384, h: 92, label: '🤝 shared by all threads', sub: 'code · heap (data) · open files · signal handlers', c: 'yellow', m: [20, 358, 384, 92] },
      { id: 't1', x: 456, y: 158, w: 120, h: 124, icon: '🧵', label: 'Thread 1', sub: 'own stack\nown registers', c: 'pink', m: [20, 470, 120, 124] },
      { id: 't2', x: 588, y: 158, w: 120, h: 124, icon: '🧵', label: 'Thread 2', sub: 'own stack\nown registers', c: 'pink', m: [152, 470, 120, 124] },
      { id: 't3', x: 720, y: 158, w: 120, h: 124, icon: '🧵', label: 'Thread 3', sub: 'own stack\nown registers', c: 'pink', m: [284, 470, 120, 124] }
    ],
    edges: [{ from: 't1', to: 'sh', dash: true }, { from: 't2', to: 'sh', dash: true }, { from: 't3', to: 'sh', dash: true }],
    mobile: { w: 420, h: 612 }
  });

  /* ---------- context switch ---------- */
  var C = SK.diagram('#ctxD', {
    title: 'Context switch', w: 840, h: 300, fs: 17,
    nodes: [
      { id: 'pa', x: 10, y: 20, w: 190, h: 110, icon: '🦊', label: 'Process A', sub: 'task_struct\n(saved registers)', c: 'orange', m: [10, 10, 180, 110] },
      { id: 'cpu', x: 320, y: 90, w: 200, h: 120, icon: '🧠', label: 'CPU core', sub: 'registers · PC · SP', c: 'purple', m: [110, 180, 200, 110] },
      { id: 'pb', x: 640, y: 20, w: 190, h: 110, icon: '🎵', label: 'Process B', sub: 'task_struct\n(saved registers)', c: 'blue', m: [220, 10, 180, 110] },
      { id: 'tm', x: 10, y: 200, w: 170, h: 80, icon: '⏰', label: 'timer interrupt', c: 'yellow', m: [10, 340, 180, 80] },
      { id: 'sc', x: 660, y: 200, w: 170, h: 80, icon: '⚖️', label: 'scheduler', c: 'pink', m: [220, 340, 180, 80] }
    ],
    edges: [{ from: 'pa', to: 'cpu', both: true }, { from: 'pb', to: 'cpu', both: true }, { from: 'tm', to: 'cpu' }, { from: 'cpu', to: 'sc', both: true }],
    mobile: { w: 410, h: 430 }
  });
  SK.flow(C, [
    { on: ['cpu', 'pa'], go: [['pa', 'cpu', { label: 'A running', c: 'orange' }]], say: '🦊 Process A is running on the CPU. The CPU\'s registers hold A\'s current "bookmark": which instruction is next (program counter), the stack pointer, and working values.' },
    { on: ['tm', 'cpu'], go: [['tm', 'cpu', { label: 'tick!', c: 'yellow' }]], say: '⏰ A <b>timer interrupt</b> fires (or A blocks on I/O). The CPU jumps into the kernel.' },
    { on: ['pa', 'cpu'], go: [['cpu', 'pa', { label: 'save', c: 'orange' }]], say: '💾 The kernel <b>saves</b> A\'s registers into A\'s <code>task_struct</code> so A can continue later exactly where it stopped.' },
    { on: ['sc'], go: [['cpu', 'sc', { label: 'who next?', c: 'pink' }], ['sc', 'cpu', { label: 'B!', c: 'pink' }]], say: '⚖️ The <b>scheduler</b> picks the next task: B (it has had the least CPU time).' },
    { on: ['pb', 'cpu'], go: [['pb', 'cpu', { label: 'restore', c: 'blue' }]], say: '📂 The kernel <b>loads</b> B\'s saved registers (and switches to B\'s page tables). Return from the interrupt…' },
    { on: ['cpu', 'pb'], say: '🎵 …and B continues as if nothing happened. Do this hundreds of times a second and it <i>looks</i> like everything runs at once. ✨' }
  ]);

  /* ---------- scheduling simulator ---------- */
  var plist = [{ id: 'P1', at: 0, bt: 6, pr: 3 }, { id: 'P2', at: 1, bt: 3, pr: 1 }, { id: 'P3', at: 2, bt: 8, pr: 4 }, { id: 'P4', at: 3, bt: 2, pr: 2 }];
  var ptab = document.getElementById('ptab');
  function colOf(id) { return SK.solid(PCOL[(parseInt(id.slice(1), 10) - 1) % PCOL.length]); }
  function drawTable() {
    ptab.innerHTML = '<tr><th>Process</th><th>Arrives at</th><th>Needs (burst)</th><th>Priority</th><th></th></tr>' + plist.map(function (p, i) {
      return '<tr><td><span class="app-chip" style="background:' + colOf(p.id) + '">' + p.id + '</span></td>' +
        '<td><input type="number" min="0" max="20" value="' + p.at + '" data-i="' + i + '" data-k="at" aria-label="' + p.id + ' arrival"></td>' +
        '<td><input type="number" min="1" max="12" value="' + p.bt + '" data-i="' + i + '" data-k="bt" aria-label="' + p.id + ' burst"></td>' +
        '<td><input type="number" min="1" max="9" value="' + p.pr + '" data-i="' + i + '" data-k="pr" aria-label="' + p.id + ' priority"></td>' +
        '<td><button class="btn sm" data-del="' + i + '" type="button" aria-label="Remove ' + p.id + '">✕</button></td></tr>';
    }).join('');
  }
  ptab.addEventListener('input', function (e) { var t = e.target; if (t.dataset.k) { var v = parseInt(t.value, 10); if (!isNaN(v)) plist[t.dataset.i][t.dataset.k] = v; } });
  ptab.addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (b && plist.length > 1) { plist.splice(+b.dataset.del, 1); renumber(); drawTable(); } });
  function renumber() { plist.forEach(function (p, i) { p.id = 'P' + (i + 1); }); }
  document.getElementById('addSched').addEventListener('click', function () { if (plist.length >= 7) return Core.toast('7 is plenty for one CPU! 😅'); plist.push({ id: 'P' + (plist.length + 1), at: Math.floor(Math.random() * 8), bt: 1 + Math.floor(Math.random() * 7), pr: 1 + Math.floor(Math.random() * 5) }); drawTable(); });
  document.getElementById('randSched').addEventListener('click', function () {
    var n = 3 + Math.floor(Math.random() * 3); plist = [];
    for (var i = 0; i < n; i++) plist.push({ id: 'P' + (i + 1), at: i === 0 ? 0 : Math.floor(Math.random() * 8), bt: 1 + Math.floor(Math.random() * 8), pr: 1 + Math.floor(Math.random() * 5) });
    drawTable();
  });
  var NOTES = {
    fcfs: '🚶 <b>FCFS</b>: simple and fair in order, but one long job makes everyone behind it wait — the <b>convoy effect</b> (like getting stuck behind a full shopping cart).',
    sjf: '⚡ <b>SJF</b>: shortest jobs first gives the <b>lowest average waiting time</b>… but needs to know job lengths in advance, and long jobs can <b>starve</b>.',
    srtf: '✂️ <b>SRTF</b>: like SJF, but a newly arrived shorter job can <b>preempt</b> (interrupt) the running one. Great averages, even more starvation risk.',
    rr: '🔄 <b>Round Robin</b>: everyone gets a short turn (the <b>quantum</b>), then goes to the back of the line. Great for responsiveness. Too small a quantum = too many context switches; too big = becomes FCFS.',
    prio: '👑 <b>Priority</b>: most important first. Risk: low-priority jobs may <b>starve</b>. Fix: <b>aging</b> — slowly raise the priority of jobs that wait long.'
  };
  function simulate(ps, algo, q) {
    var t = 0, rem = {}, fin = {}, segs = [], snaps = [], queue = [], cur = null, slice = 0, done = 0, n = ps.length;
    ps.forEach(function (p) { rem[p.id] = p.bt; });
    var by = {}; ps.forEach(function (p) { by[p.id] = p; });
    while (done < n && t < 200) {
      ps.forEach(function (p) { if (p.at === t) queue.push(p.id); });
      var ready = ps.filter(function (p) { return p.at <= t && rem[p.id] > 0; }).map(function (p) { return p.id; });
      var pick = null;
      if (algo === 'rr') {
        if (cur && rem[cur] > 0 && slice > 0) pick = cur;
        else { if (cur && rem[cur] > 0) queue.push(cur); cur = queue.shift() || null; slice = q; pick = cur; }
      } else if (algo === 'srtf') {
        ready.sort(function (a, b) { return rem[a] - rem[b] || by[a].at - by[b].at; }); pick = ready[0] || null;
      } else {
        if (cur && rem[cur] > 0) pick = cur;
        else {
          var key = algo === 'sjf' ? function (a, b) { return by[a].bt - by[b].bt || by[a].at - by[b].at; } :
                    algo === 'prio' ? function (a, b) { return by[a].pr - by[b].pr || by[a].at - by[b].at; } :
                    function (a, b) { return by[a].at - by[b].at || (a < b ? -1 : 1); };
          ready.sort(key); pick = ready[0] || null; cur = pick;
        }
      }
      var waiting = (algo === 'rr' ? queue.slice() : ready.filter(function (x) { return x !== pick; }));
      snaps.push({ t: t, run: pick, ready: waiting });
      var last = segs[segs.length - 1];
      if (last && last.id === pick) last.e = t + 1; else segs.push({ id: pick, s: t, e: t + 1 });
      if (pick) { rem[pick]--; slice--; if (rem[pick] === 0) { fin[pick] = t + 1; done++; if (algo !== 'srtf') cur = null; if (algo === 'rr') cur = null; } }
      t++;
    }
    return { segs: segs, snaps: snaps, fin: fin, end: t };
  }
  var runTok = 0;
  function runSched() {
    var algo = document.getElementById('algo').value, q = Math.max(1, Math.min(6, parseInt(document.getElementById('quantum').value, 10) || 2));
    var ps = plist.map(function (p) { return { id: p.id, at: Math.max(0, p.at | 0), bt: Math.max(1, p.bt | 0), pr: p.pr | 0 }; });
    var res = simulate(ps, algo, q), my = ++runTok;
    var g = document.getElementById('gantt'), ax = document.getElementById('gaxis'), chip = document.getElementById('cpuChip'), rq = document.getElementById('rq'), tn = document.getElementById('tnow');
    g.innerHTML = ''; ax.innerHTML = ''; document.getElementById('schedStats').innerHTML = '';
    var total = res.end, i = 0;
    (function tick() {
      if (my !== runTok) return;
      if (i >= res.snaps.length) { finish(); return; }
      var s = res.snaps[i]; tn.textContent = s.t;
      chip.textContent = s.run || 'idle'; chip.style.background = s.run ? colOf(s.run) : ''; chip.style.color = s.run ? '#1d1b25' : '';
      rq.innerHTML = s.ready.map(function (id) { return '<span style="background:' + colOf(id) + '">' + id + '</span>'; }).join('') || '<span class="muted small" style="border:0">(empty)</span>';
      var last = g.lastElementChild;
      if (last && last.dataset.id === String(s.run) && last.dataset.e == s.t) { last.dataset.e = s.t + 1; last.style.flex = String(s.t + 1 - last.dataset.s); }
      else { var d = document.createElement('div'); d.dataset.id = String(s.run); d.dataset.s = s.t; d.dataset.e = s.t + 1; d.style.flex = '1'; d.style.background = s.run ? colOf(s.run) : 'var(--card-2)'; d.textContent = s.run || '·'; d.title = (s.run || 'idle'); g.appendChild(d); }
      i++; setTimeout(tick, 330);
    })();
    function finish() {
      chip.textContent = 'done'; chip.style.background = ''; chip.style.color = ''; rq.innerHTML = '';
      ax.innerHTML = ''; var spans = g.children, acc = 0;
      ax.innerHTML = '<span style="left:0">0</span>';
      Array.prototype.forEach.call(spans, function (d) { acc = +d.dataset.e; ax.innerHTML += '<span style="left:' + (acc / total * 100) + '%">' + acc + '</span>'; });
      var rows = ps.map(function (p) { var ta = res.fin[p.id] - p.at, w = ta - p.bt; return { id: p.id, f: res.fin[p.id], ta: ta, w: w }; });
      var avgW = rows.reduce(function (a, r) { return a + r.w; }, 0) / rows.length, avgT = rows.reduce(function (a, r) { return a + r.ta; }, 0) / rows.length;
      var switches = Math.max(0, res.segs.filter(function (s) { return s.id; }).length - 1);
      document.getElementById('schedStats').innerHTML = '<div class="tbl-wrap"><table class="sk"><tr><th>Process</th><th>Finished at</th><th>Turnaround</th><th>Waited</th></tr>' +
        rows.map(function (r) { return '<tr><td><span class="app-chip" style="background:' + colOf(r.id) + '">' + r.id + '</span></td><td>' + r.f + '</td><td>' + r.ta + '</td><td>' + r.w + '</td></tr>'; }).join('') +
        '<tr><td><b>Average</b></td><td></td><td><b>' + avgT.toFixed(2) + '</b></td><td><b>' + avgW.toFixed(2) + '</b></td></tr></table></div>' +
        '<p class="small">🔁 context switches between processes: <b>' + switches + '</b> · turnaround = finish − arrival · waited = turnaround − burst. Try another algorithm on the same processes and compare the averages!</p>';
    }
  }
  function syncAlgo() { var a = document.getElementById('algo').value; document.getElementById('qWrap').style.display = a === 'rr' ? '' : 'none'; document.getElementById('algoNote').innerHTML = NOTES[a]; }
  document.getElementById('algo').addEventListener('change', syncAlgo);
  document.getElementById('runSched').addEventListener('click', runSched);
  drawTable(); syncAlgo();

  /* ---------- fair-share race (CFS / EEVDF idea) ---------- */
  var TASKS = [{ n: '🦊 browser', nice: 0, c: 'orange' }, { n: '🎵 music', nice: 0, c: 'blue' }, { n: '🎮 game', nice: -5, c: 'pink' }, { n: '🧮 backup', nice: 10, c: 'green' }];
  var lanes = document.getElementById('raceLanes'), rt = null, st;
  function weight(n) { return 1024 / Math.pow(1.25, n); }
  function raceReset() {
    st = TASKS.map(function (t) { return { vr: 0, cpu: 0, nice: t.nice }; });
    lanes.innerHTML = TASKS.map(function (t, i) {
      return '<div class="lane" data-i="' + i + '"><div><div class="nm">' + t.n + '</div><div class="small muted">vr <span data-vr>0</span></div></div>' +
        '<div><div class="bar"><i style="width:0;background:' + SK.solid(t.c) + '"></i></div><input type="range" min="-20" max="19" value="' + t.nice + '" aria-label="nice value for ' + t.n + '"></div>' +
        '<div><b data-pct>0%</b><div class="small muted">nice <span data-nice>' + t.nice + '</span></div></div></div>';
    }).join('');
    Array.prototype.forEach.call(lanes.querySelectorAll('input[type=range]'), function (r, i) {
      r.addEventListener('input', function () { st[i].nice = +r.value; lanes.querySelectorAll('[data-nice]')[i].textContent = r.value; });
    });
  }
  function raceStep() {
    for (var k = 0; k < 3; k++) {
      var min = 0; st.forEach(function (s, i) { if (s.vr < st[min].vr) min = i; });
      st[min].cpu += 1; st[min].vr += 1024 / weight(st[min].nice);
    }
    var tot = st.reduce(function (a, s) { return a + s.cpu; }, 0) || 1, maxc = Math.max.apply(0, st.map(function (s) { return s.cpu; })) || 1;
    Array.prototype.forEach.call(lanes.children, function (L, i) {
      L.classList.toggle('run', i === min);
      L.querySelector('.bar i').style.width = (st[i].cpu / maxc * 100) + '%';
      L.querySelector('[data-pct]').textContent = Math.round(st[i].cpu / tot * 100) + '%';
      L.querySelector('[data-vr]').textContent = st[i].vr.toFixed(0);
    });
  }
  document.getElementById('raceGo').addEventListener('click', function () {
    var b = this; if (rt) { clearInterval(rt); rt = null; b.textContent = '▶ Start'; return; }
    rt = setInterval(raceStep, 120); b.textContent = '⏸ Pause';
  });
  document.getElementById('raceReset').addEventListener('click', function () { if (rt) { clearInterval(rt); rt = null; document.getElementById('raceGo').textContent = '▶ Start'; } raceReset(); });
  raceReset();

  OSLab.mount(document.getElementById('lab'), { scenarios: ['run'] });

  Core.quiz('#quizBox', [
    { q: 'What is the difference between a program and a process?', a: ['No difference', 'A program is a file on disk; a process is a running instance of it', 'A process is a file; a program is running', 'Programs only run on servers'], c: 1, why: 'A program (like /usr/bin/firefox) is a recipe on disk. A process is that recipe being executed, with its own PID, memory and state.' },
    { q: 'Which system call makes a copy of the current process?', a: ['exec()', 'wait()', 'fork()', 'exit()'], c: 2, why: 'fork() (clone() under the hood) creates a child process. exec() then replaces the program inside it.' },
    { q: 'A process has exited but its parent hasn\'t called wait() yet. It\'s a…', a: ['Ghost', 'Zombie', 'Daemon', 'Thread'], c: 1, why: 'A zombie (state Z) keeps only its exit code until the parent reaps it with wait(). Orphans get adopted and reaped by PID 1.' },
    { q: 'Which algorithm gives everyone a short turn in a circle?', a: ['FCFS', 'Round Robin', 'SJF', 'Priority'], c: 1, why: 'Round Robin gives each task a time slice (quantum) and then moves to the next one.' },
    { q: 'In Linux\'s fair scheduler, a task with a LOWER nice value (e.g. −5)…', a: ['Gets less CPU', 'Gets more CPU', 'Is killed', 'Runs only at night'], c: 1, why: 'Lower nice = higher weight = its vruntime grows more slowly, so it gets picked more often and receives a bigger CPU share.' },
    { q: 'What do threads of the same process share?', a: ['Nothing', 'Their stacks and registers', 'Memory (code + heap) and open files', 'Only the PID'], c: 2, why: 'Threads share the address space and open files; each has its own stack and registers. In Linux, they are tasks created with clone(CLONE_VM | CLONE_FILES | …).' }
  ]);
})();
