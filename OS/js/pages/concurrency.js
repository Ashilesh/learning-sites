/* Chapter 8 — Concurrency & IPC */
(function () {
  'use strict';
  var $ = Core.$;

  /* ---------- race step-through ---------- */
  var CODE = ['load counter → reg', 'reg = reg + 1', 'store reg → counter'];
  var SCHED = {
    lucky: [['A', 0], ['A', 1], ['A', 2], ['B', 0], ['B', 1], ['B', 2]],
    bad: [['A', 0], ['B', 0], ['A', 1], ['B', 1], ['A', 2], ['B', 2]],
    lock: [['A', 'L'], ['B', 'W'], ['A', 0], ['A', 1], ['A', 2], ['A', 'U'], ['B', 'L'], ['B', 0], ['B', 1], ['B', 2], ['B', 'U']]
  };
  var rs;
  function raceReset() {
    rs = { i: 0, ctr: 0, reg: { A: null, B: null }, lock: null };
    var lock = $('#raceSched').value === 'lock';
    ['A', 'B'].forEach(function (t) {
      var ol = $('#th' + t + ' ol');
      ol.innerHTML = (lock ? '<li>🔒 lock(m)</li>' : '') + CODE.map(function (c) { return '<li>' + c + '</li>'; }).join('') + (lock ? '<li>🔓 unlock(m)</li>' : '');
      $('#th' + t + ' [data-r]').textContent = '–';
    });
    $('#ctr').textContent = '0'; $('#lockIc').textContent = lock ? '🔓' : ''; $('#raceMsg').innerHTML = 'Press <b>▶ step</b>.';
    $('#raceStep').disabled = false;
  }
  function raceStep() {
    var s = SCHED[$('#raceSched').value], lock = $('#raceSched').value === 'lock';
    if (rs.i >= s.length) return;
    var st = s[rs.i++], t = st[0], op = st[1], msg = '';
    Core.$$('.thread li').forEach(function (li) { li.classList.remove('now'); });
    var lis = $('#th' + t + ' ol').children, idx = lock ? (op === 'L' || op === 'W' ? 0 : op === 'U' ? 4 : op + 1) : op;
    if (lis[idx]) lis[idx].classList.add('now');
    if (op === 'L') { rs.lock = t; $('#lockIc').textContent = '🔒'; msg = '🔒 Thread ' + t + ' takes the lock. It\'s now alone in the critical section.'; }
    else if (op === 'W') { msg = '😴 Thread ' + t + ' tries to lock, but A holds it → ' + t + ' <b>sleeps</b> until it\'s released.'; }
    else if (op === 'U') { rs.lock = null; $('#lockIc').textContent = '🔓'; msg = '🔓 Thread ' + t + ' releases the lock' + (t === 'A' ? ' — B wakes up!' : '.'); }
    else if (op === 0) { rs.reg[t] = rs.ctr; msg = '📥 ' + t + ' reads counter (' + rs.ctr + ') into its register.'; }
    else if (op === 1) { rs.reg[t]++; msg = '➕ ' + t + ' adds 1 in its register → ' + rs.reg[t] + '. (The counter itself hasn\'t changed yet!)'; }
    else { rs.ctr = rs.reg[t]; msg = '📤 ' + t + ' writes ' + rs.reg[t] + ' back to the counter.'; }
    $('#th' + t + ' [data-r]').textContent = rs.reg[t] == null ? '–' : rs.reg[t];
    $('#ctr').textContent = rs.ctr; $('#ctr').classList.remove('pop'); void $('#ctr').offsetWidth; $('#ctr').classList.add('pop');
    if (rs.i >= s.length) {
      $('#raceStep').disabled = true;
      msg += rs.ctr === 2 ? ' <br>✅ Final answer: <b>2</b>. Correct!' : ' <br>❌ Final answer: <b>' + rs.ctr + '</b>! Both threads read 0 before either wrote. One update was <b>lost</b>. That\'s a <b>race condition</b>.';
    }
    $('#raceMsg').innerHTML = msg;
  }
  $('#raceStep').addEventListener('click', raceStep);
  $('#raceRst').addEventListener('click', raceReset);
  $('#raceSched').addEventListener('change', raceReset);
  raceReset();

  function bulk(withLock) {
    var N = 100000, ctr = 0, th = [{ left: N, pc: 0, reg: 0 }, { left: N, pc: 0, reg: 0 }], cur = 0, lock = -1, switches = 0, t0 = performance.now();
    while (th[0].left || th[1].left) {
      var T = th[cur];
      if (!T.left || Math.random() < .015) { var o = 1 - cur; if (th[o].left) { cur = o; switches++; continue; } }
      if (withLock && T.pc === 0) { if (lock !== -1 && lock !== cur) { cur = 1 - cur; continue; } lock = cur; }
      if (T.pc === 0) T.reg = ctr; else if (T.pc === 1) T.reg++; else { ctr = T.reg; T.left--; if (withLock) lock = -1; }
      T.pc = (T.pc + 1) % 3;
    }
    var ms = (performance.now() - t0).toFixed(0);
    $('#bulkOut').textContent = (withLock ? '🔒 with a mutex' : '🏃 without a lock') + '\nexpected:  200000\ngot:       ' + ctr + '\nlost:      ' + (200000 - ctr) + ' updates' + (withLock ? ' ✅' : ' ❌  (run again: a different number every time!)') + '\nthread switches simulated: ' + switches + ' (' + ms + ' ms)';
  }
  $('#bulkNo').addEventListener('click', function () { bulk(false); });
  $('#bulkYes').addEventListener('click', function () { bulk(true); });

  /* ---------- semaphore parking ---------- */
  var CARS = ['🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🛻'], spots, queue, ci;
  function semLog(m) { var d = document.createElement('div'); d.innerHTML = m; $('#semLog').insertBefore(d, $('#semLog').firstChild); }
  function semDraw() {
    var free = spots.filter(function (s) { return !s; }).length;
    $('#park').innerHTML = spots.map(function (s) { return '<div class="spot">' + (s || '') + '</div>'; }).join('');
    $('#carQ').innerHTML = queue.join(' ') || '<span class="small muted">nobody</span>';
    $('#semVal').textContent = 'sem = ' + free + (queue.length ? ' (' + queue.length + ' sleeping)' : '');
  }
  function semReset() { spots = [null, null, null]; queue = []; ci = 0; $('#semLog').innerHTML = ''; semDraw(); }
  $('#carIn').addEventListener('click', function () {
    var car = CARS[ci++ % CARS.length], i = spots.indexOf(null);
    if (i >= 0) { spots[i] = car; semLog(car + ' sem_wait(): counter > 0 → took a spot.'); }
    else { if (queue.length >= 6) return Core.toast('The waiting line is full of sleeping cars 😴'); queue.push(car); semLog(car + ' sem_wait(): counter is 0 → <b>sleeps</b> in the wait queue.'); }
    semDraw();
  });
  $('#carOut').addEventListener('click', function () {
    var full = spots.map(function (s, i) { return s ? i : -1; }).filter(function (i) { return i >= 0; });
    if (!full.length) return semLog('No cars to leave.');
    var i = full[Math.floor(Math.random() * full.length)], car = spots[i]; spots[i] = null;
    semLog(car + ' leaves: sem_post() → counter + 1.');
    if (queue.length) { var w = queue.shift(); spots[i] = w; semLog('⏰ The kernel <b>wakes</b> ' + w + ' — it takes the free spot.'); }
    semDraw();
  });
  $('#carRst').addEventListener('click', semReset);
  semReset();

  /* ---------- dining philosophers ---------- */
  var svg = $('#philo'), N = 5, ph, forks, timer = null, mode = null, meals;
  var CX = 200, CY = 200;
  function pos(i, r) { var a = -Math.PI / 2 + i / N * Math.PI * 2; return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; }
  function phReset(m) {
    mode = m; meals = 0; ph = []; forks = [];
    for (var i = 0; i < N; i++) { ph.push({ st: m === 'naive' ? 'hungry' : 'think', t: 1 + Math.floor(Math.random() * 3), hold: [] }); forks.push(-1); }
  }
  function firstSecond(i) { var l = i, r = (i + 1) % N; return mode === 'naive' ? [l, r] : [Math.min(l, r), Math.max(l, r)]; }
  function tick() {
    var order = []; for (var i = 0; i < N; i++) order.push(i);
    if (mode !== 'naive') order.sort(function () { return Math.random() - .5; });
    order.forEach(function (i) {
      var p = ph[i];
      if (p.st === 'think') { if (--p.t <= 0) p.st = 'hungry'; }
      else if (p.st === 'hungry') {
        var fs = firstSecond(i);
        if (!p.hold.length) { if (forks[fs[0]] === -1) { forks[fs[0]] = i; p.hold.push(fs[0]); } }
        else if (p.hold.length === 1) { if (forks[fs[1]] === -1) { forks[fs[1]] = i; p.hold.push(fs[1]); p.st = 'eat'; p.t = 2 + Math.floor(Math.random() * 2); } }
      } else if (p.st === 'eat') { if (--p.t <= 0) { p.hold.forEach(function (f) { forks[f] = -1; }); p.hold = []; p.st = 'think'; p.t = 1 + Math.floor(Math.random() * 3); meals++; } }
    });
    var dead = ph.every(function (p) { return p.st === 'hungry' && p.hold.length === 1; });
    draw(dead);
    if (dead) { clearInterval(timer); timer = null; $('#phMsg').innerHTML = '💀 <b>DEADLOCK!</b> Every philosopher holds their left fork and waits forever for the right one. Circular wait! Nobody will ever eat again.'; }
    else if (mode === 'fix') $('#phMsg').innerHTML = '😋 Meals eaten: <b>' + meals + '</b>. Philosopher 4 grabs fork 0 first (the lower number), which breaks the circle — no deadlock possible.';
  }
  function draw(dead) {
    var h = '<circle cx="200" cy="200" r="98" fill="var(--yellow-t)" stroke="var(--ink)" stroke-width="3"/><text x="200" y="208" text-anchor="middle" font-size="40">🍝</text>';
    for (var f = 0; f < N; f++) {
      var x, y, holder = forks[f];
      var mid = -Math.PI / 2 + f / N * Math.PI * 2 - Math.PI / N; // fork f sits between P(f-1) and P(f)
      if (holder >= 0) { var hp = pos(holder, 118); var fp = [CX + Math.cos(mid) * 82, CY + Math.sin(mid) * 82]; x = (hp[0] * 2 + fp[0]) / 3; y = (hp[1] * 2 + fp[1]) / 3; }
      else { x = CX + Math.cos(mid) * 76; y = CY + Math.sin(mid) * 76; }
      h += '<text x="' + x.toFixed(1) + '" y="' + (y + 8).toFixed(1) + '" text-anchor="middle" font-size="24">🍴</text><text x="' + x.toFixed(1) + '" y="' + (y + 24).toFixed(1) + '" text-anchor="middle" font-size="12" fill="var(--ink-soft)">' + f + '</text>';
    }
    ph.forEach(function (p, i) {
      var q = pos(i, 150), face = dead ? '😩' : p.st === 'eat' ? '😋' : p.st === 'hungry' ? '😟' : '🤔';
      var col = dead ? 'var(--red-t)' : p.st === 'eat' ? 'var(--green-t)' : p.st === 'hungry' ? 'var(--orange-t)' : 'var(--card)';
      h += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="34" fill="' + col + '" stroke="var(--ink)" stroke-width="2.5"/><text x="' + q[0] + '" y="' + (q[1] + 10) + '" text-anchor="middle" font-size="30">' + face + '</text>' +
        '<text x="' + q[0] + '" y="' + (q[1] + 50) + '" text-anchor="middle" font-size="14" fill="var(--ink)">P' + i + ' · ' + (p.st === 'think' ? 'thinking' : p.st === 'eat' ? 'eating' : 'hungry') + '</text>';
    });
    svg.innerHTML = h;
  }
  function startPh(m) {
    if (timer) clearInterval(timer); phReset(m); draw(false);
    $('#phMsg').innerHTML = m === 'naive' ? 'Everyone gets hungry at the same moment and grabs their <b>left</b> fork first…' : 'Rule: always pick up the <b>lower-numbered</b> fork first.';
    timer = setInterval(tick, 650);
  }
  $('#phNaive').addEventListener('click', function () { startPh('naive'); });
  $('#phFix').addEventListener('click', function () { startPh('fix'); });
  phReset('fix'); ph.forEach(function (p) { p.st = 'think'; }); draw(false);

  /* ---------- pipes ---------- */
  var PD = SK.diagram('#pipeD', {
    title: 'ls | grep txt | wc -l', w: 860, h: 230, fs: 17,
    nodes: [
      { id: 'ls', x: 10, y: 40, w: 130, h: 80, icon: '📋', label: 'ls', c: 'pink', m: [10, 10, 160, 70] },
      { id: 'p1', x: 180, y: 52, w: 140, h: 56, label: '🚰 pipe', sub: 'kernel buffer', c: 'teal', m: [230, 10, 160, 70] },
      { id: 'gr', x: 360, y: 40, w: 130, h: 80, icon: '🔎', label: 'grep txt', c: 'yellow', m: [230, 130, 160, 70] },
      { id: 'p2', x: 530, y: 52, w: 140, h: 56, label: '🚰 pipe', sub: 'kernel buffer', c: 'teal', m: [10, 130, 160, 70] },
      { id: 'wc', x: 710, y: 40, w: 140, h: 80, icon: '🔢', label: 'wc -l', c: 'green', m: [10, 250, 160, 70] },
      { id: 'tty', x: 710, y: 160, w: 140, h: 60, label: '🖥️ screen: 3', c: 'blue', m: [230, 250, 160, 70] }
    ],
    edges: [{ from: 'ls', to: 'p1', label: 'fd 1', mNoLabel: true }, { from: 'p1', to: 'gr', label: 'fd 0', mNoLabel: true }, { from: 'gr', to: 'p2' }, { from: 'p2', to: 'wc' }, { from: 'wc', to: 'tty' }],
    mobile: { w: 400, h: 330 }
  });
  SK.flow(PD, [
    { on: ['ls', 'gr', 'wc'], say: '🐚 The shell creates two <b>pipes</b> and three processes, all running <b>at the same time</b>. It connects ls\'s stdout to grep\'s stdin, and grep\'s stdout to wc\'s stdin.', code: '$ ls | grep txt | wc -l' },
    { on: ['ls', 'p1'], go: [['ls', 'p1', { label: 'a.txt', c: 'pink' }], ['ls', 'p1', { label: 'cat.png', c: 'pink' }]], say: '📋 <code>ls</code> writes names into the first pipe — a small buffer inside the kernel (64 KB by default). If it fills up, ls is put to sleep until there\'s room.' },
    { on: ['gr'], go: [['p1', 'gr', { label: 'a.txt', c: 'yellow' }], ['gr', 'p2', { label: 'a.txt ✔', c: 'yellow' }]], say: '🔎 <code>grep</code> reads lines as they arrive and passes on only the ones containing "txt". If the pipe is empty, grep sleeps until data comes.' },
    { on: ['wc', 'tty'], go: [['p2', 'wc', { c: 'green' }], ['wc', 'tty', { label: '3', c: 'blue' }]], say: '🔢 <code>wc -l</code> counts lines, and when the pipe closes (end of file) it prints the total. Three tiny tools, one powerful combo — that\'s the <b>Unix philosophy</b>: do one thing well, and connect with pipes. 🧩' }
  ]);

  /* ---------- signals ---------- */
  var sigSt = 'run';
  var SIG = {
    INT: ['😮', 'dead', 'Caught <b>SIGINT</b> (you pressed Ctrl+C). The app\'s handler saved its work and exited with code 130. Programs can catch or ignore this one.'],
    TERM: ['🙏', 'dead', 'Caught <b>SIGTERM</b> — the polite "please quit". It closed files, said goodbye, and exited. This is what <code>kill</code> and <code>systemctl stop</code> send first.'],
    KILL: ['💀', 'dead', '<b>SIGKILL</b> can\'t be caught, blocked or ignored. The kernel removed the process instantly — no cleanup! Use only as a last resort.'],
    STOP: ['🧊', 'stop', '<b>SIGSTOP</b>: frozen by the kernel (can\'t be caught). It uses no CPU. (Ctrl+Z sends the catchable cousin, SIGTSTP.)'],
    CONT: ['🙂', 'run', '<b>SIGCONT</b>: unfrozen — it continues exactly where it stopped.'],
    HUP: ['🔄', 'run', 'Caught <b>SIGHUP</b>. Many servers (nginx, sshd) use it to mean "reload your config file" without restarting.'],
    SEGV: ['💥', 'dead', '<b>SIGSEGV</b>: the app touched memory it doesn\'t own. The kernel sends this and, by default, the app dies with "Segmentation fault (core dumped)".']
  };
  $('#sigBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sig]'); if (!b) return; var s = b.dataset.sig, face = $('#sigFace');
    if (s === 'RESTART') { sigSt = 'run'; face.className = 'sigface pop'; face.textContent = '🙂'; $('#sigState').textContent = 'state: running'; $('#sigMsg').innerHTML = 'Fresh process started. Send it a signal 👇'; return; }
    if (sigSt === 'dead') { $('#sigMsg').innerHTML = '👻 There is no process 4242 any more: <code>kill: (4242) - No such process</code>. Press ↺ restart.'; return; }
    if (sigSt === 'stop' && s !== 'CONT' && s !== 'KILL') { $('#sigMsg').innerHTML = '🧊 It\'s stopped: the signal is <b>pending</b> and will be handled once it continues (SIGCONT). Only SIGKILL acts right away.'; return; }
    var d = SIG[s]; sigSt = d[1];
    face.textContent = d[0]; face.className = 'sigface' + (d[1] === 'dead' ? ' dead' : d[1] === 'stop' ? ' frozen' : '') + ' pop';
    $('#sigState').textContent = 'state: ' + (d[1] === 'dead' ? 'gone' : d[1] === 'stop' ? 'stopped (T)' : 'running');
    $('#sigMsg').innerHTML = d[2];
  });

  Core.quiz('#quizBox', [
    { q: 'Two threads both do counter++ without a lock. The final value can be…', a: ['Always exactly 2', 'Sometimes 1 — an update gets lost', 'Always 0', 'A random letter'], c: 1, why: 'counter++ is load, add, store. If both load before either stores, one increment is lost. That\'s a race condition.' },
    { q: 'What is a mutex?', a: ['A lock that lets only one thread into a critical section at a time', 'A type of CPU', 'A network cable', 'A file system'], c: 0, why: 'Mutex = MUTual EXclusion. Like a single bathroom key.' },
    { q: 'A semaphore set to 3 is like…', a: ['A bathroom with one key', 'A parking lot with 3 spots', 'A clock', 'A pipe'], c: 1, why: 'A counting semaphore allows up to N holders; the N+1th waits until someone posts.' },
    { q: 'The simplest common fix for deadlocks is…', a: ['Buy more RAM', 'Always take locks in the same global order', 'Use more threads', 'Reboot'], c: 1, why: 'Lock ordering breaks circular wait, one of the four required conditions.' },
    { q: 'Which signal can NEVER be caught or ignored?', a: ['SIGTERM', 'SIGINT', 'SIGKILL', 'SIGHUP'], c: 2, why: 'SIGKILL (9) and SIGSTOP (19) are handled by the kernel directly.' },
    { q: 'What does | do in "ls | grep txt"?', a: ['Deletes files', 'Connects ls\'s output to grep\'s input through a kernel pipe', 'Runs them one after another with no connection', 'Makes a folder'], c: 1, why: 'The shell creates a pipe: ls writes into one end (fd 1), grep reads from the other (fd 0) — both run at the same time.' }
  ]);
})();
