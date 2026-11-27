/* Chapter 4 — How the CPU runs code */
(function () {
  'use strict';
  var $ = Core.$;

  /* ---------- C → assembly → machine code ---------- */
  SK.diagram('#instrD', {
    title: 'From source code to machine code', w: 860, h: 230, fs: 17,
    nodes: [
      { id: 'c', x: 10, y: 34, w: 230, h: 150, label: '✍️ C (you write)', sub: 'x = x + 1;', mono: true, sfs: 24, c: 'yellow', top: 18, m: [80, 10, 260, 120] },
      { id: 'asm', x: 310, y: 34, w: 250, h: 150, label: '🧩 assembly', sub: 'mov eax, [x]\nadd eax, 1\nmov [x], eax', mono: true, sfs: 21, c: 'blue', top: 18, m: [80, 190, 260, 150] },
      { id: 'mc', x: 630, y: 34, w: 220, h: 150, label: '🔢 machine code', sub: '8b 05 0e 2f 00 00\n83 c0 01\n89 05 05 2f 00 00', mono: true, sfs: 19, c: 'pink', top: 18, m: [80, 400, 260, 150] }
    ],
    edges: [{ from: 'c', to: 'asm', label: 'compiler' }, { from: 'asm', to: 'mc', label: 'assembler' }],
    texts: [{ x: 740, y: 214, t: 'the CPU only reads these bytes ⤴', fs: 16, c: 'pink', m: [210, 575] }],
    mobile: { w: 420, h: 590 }
  });

  /* ---------- toy CPU ---------- */
  var PROGS = {
    count: { mem: [0x1C, 0x70, 0x3D, 0x61, 0x00, null, null, null, null, null, null, null, 3, 1, null, null], data: [12, 13], intro: 'Counts down: prints A, subtracts 1, and jumps back while A isn\'t 0.' },
    add: { mem: [0x1C, 0x2D, 0x4E, 0x70, 0x00, null, null, null, null, null, null, null, 2, 5, 0, null], data: [12, 13, 14], intro: 'Loads 2, adds 5, stores the answer in box E, prints it, exits.' },
    loop: { mem: [0x1C, 0x2D, 0x4C, 0x50, null, null, null, null, null, null, null, null, 0, 1, null, null], data: [12, 13], intro: 'Adds 1 forever and never asks the OS for anything. Can it hog the CPU? Watch the ⏰ timer!' }
  };
  var NAMES = { 1: 'LOAD', 2: 'ADD', 3: 'SUB', 4: 'STORE', 5: 'JMP', 6: 'JNZ' };
  function hx(n) { return n.toString(16).toUpperCase(); }
  function hx2(n) { return ('0' + n.toString(16).toUpperCase()).slice(-2); }
  function dis(b) {
    if (b === 0x70) return 'PRINT'; if (b === 0x00) return 'EXIT';
    var op = b >> 4; return NAMES[op] ? NAMES[op] + ' ' + hx(b & 15) : '???';
  }
  function explain(b) {
    var x = hx(b & 15);
    switch (b >> 4) {
      case 1: return '"LOAD ' + x + '" means: copy the number in memory box ' + x + ' into register A.';
      case 2: return '"ADD ' + x + '" means: add the number in box ' + x + ' to A.';
      case 3: return '"SUB ' + x + '" means: subtract the number in box ' + x + ' from A.';
      case 4: return '"STORE ' + x + '" means: write A into memory box ' + x + '.';
      case 5: return '"JMP ' + x + '" means: change the program counter to ' + x + ' (a jump!).';
      case 6: return '"JNZ ' + x + '" means: if A is not zero, jump to ' + x + '. (This is how loops and ifs work.)';
      case 7: return '"PRINT" is a <b>system call</b>: the program can\'t touch the screen, so it must ask the OS. 🙋';
      case 0: return '"EXIT" is a <b>system call</b> too: "OS, I\'m finished, please clean up."';
    }
    return 'Unknown bytes!';
  }
  var st, runT = null, prog = 'count';
  function reset() {
    stopRun(); var P = PROGS[prog];
    st = { mem: P.mem.slice(), data: P.data, pc: 0, ir: null, a: 0, phase: 'fetch', mode: 'user', cycles: 0, executed: 0, ticks: 0, out: '', halted: false, hl: {}, bus: '' };
    $('#tCU').innerHTML = '📜 ' + P.intro + ' Press <b>⏭ step</b>.';
    draw();
  }
  function draw(flash) {
    $('#rPC').textContent = hx(st.pc); $('#rIR').textContent = st.ir == null ? '—' : hx2(st.ir) + ' · ' + dis(st.ir);
    $('#rA').textContent = st.a; $('#rCyc').textContent = st.cycles;
    (flash || []).forEach(function (id) { var e = $('#' + id); e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); });
    var m = $('#tMode'); m.textContent = st.mode === 'kernel' ? '👑 kernel mode (the OS is running)' : '👤 user mode (your program is running)'; m.classList.toggle('kernel', st.mode === 'kernel');
    Core.$$('#toy .toy-phases span').forEach(function (s) { s.classList.toggle('on', s.dataset.ph === st.shown); s.classList.toggle('irq', false); });
    $('#busA').className = st.bus.indexOf('a') >= 0 ? 'on' : ''; $('#busD').className = st.bus.indexOf('d') >= 0 ? 'ond' : '';
    var rows = '<tr><th>box</th><th>bytes</th><th>meaning</th><th></th></tr>';
    for (var i = 0; i < 16; i++) {
      var v = st.mem[i], isData = st.data.indexOf(i) >= 0;
      var meaning = v == null ? '<span class="muted">—</span>' : isData ? 'data = <b>' + v + '</b>' : dis(v);
      rows += '<tr class="' + (st.hl[i] || (i === st.pc && !st.halted ? 'pc' : '')) + '"><td>' + hx(i) + '</td><td class="code">' + (v == null ? '··' : isData ? hx2(v) : hx2(v)) + '</td><td class="code">' + meaning + '</td><td class="ptr">' + (i === st.pc && !st.halted ? '◀ PC' : '') + '</td></tr>';
    }
    $('#tMem').innerHTML = rows;
    $('#tOut').textContent = st.out || ' ';
  }
  function step() {
    if (st.halted) { $('#tCU').innerHTML = '🏁 The process has exited. Press <b>↺ reset</b> to run it again.'; stopRun(); return; }
    st.hl = {}; st.bus = ''; var msg = '', flash = [];
    if (st.phase === 'fetch') {
      var back = st.mode === 'kernel' ? '↩️ The kernel returns to <b>user mode</b>. ' : '';
      st.mode = 'user';
      if (st.pc >= 16 || st.mem[st.pc] == null || st.data.indexOf(st.pc) >= 0) { st.ir = null; st.halted = true; st.mode = 'kernel'; st.shown = 'fetch'; draw(); $('#tCU').innerHTML = '💥 The PC points at something that isn\'t an instruction! The CPU raises an exception; Linux sends <b>SIGILL</b>/<b>SIGSEGV</b> and the program crashes.'; stopRun(); return; }
      st.ir = st.mem[st.pc]; st.hl[st.pc] = 'fetch'; st.bus = 'ad';
      msg = back + '🔎 <b>FETCH</b>: the CPU sends PC (' + hx(st.pc) + ') out on the <b>address bus</b>; memory sends back the bytes <b>' + hx2(st.ir) + '</b> on the <b>data bus</b> into IR. PC moves on to ' + hx((st.pc + 1) & 15) + '.';
      st.pc = (st.pc + 1) & 15; st.shown = 'fetch'; st.phase = 'decode'; flash = ['rIR', 'rPC'];
    } else if (st.phase === 'decode') {
      msg = '🧩 <b>DECODE</b>: the control unit reads ' + hx2(st.ir) + '. ' + explain(st.ir);
      st.shown = 'decode'; st.phase = 'execute';
    } else if (st.phase === 'execute') {
      var b = st.ir, op = b >> 4, x = b & 15; st.shown = 'execute'; st.executed++;
      if (b === 0x70) { st.mode = 'kernel'; st.out += st.a + ' '; msg = '🚪 <b>EXECUTE → system call!</b> The CPU jumps into the kernel (👑 kernel mode). Linux\'s <code>write()</code> puts <b>' + st.a + '</b> on the screen. Next step it returns to your program.'; }
      else if (b === 0x00) { st.mode = 'kernel'; st.halted = true; msg = '👋 <b>EXECUTE → exit() system call.</b> The kernel frees this program\'s memory and removes the process. The CPU goes off to run something else.'; }
      else if (op === 1) { st.a = st.mem[x]; st.hl[x] = 'data'; st.bus = 'ad'; flash = ['rA']; msg = '⚙️ <b>EXECUTE</b>: read box ' + hx(x) + ' (' + st.a + ') into A.'; }
      else if (op === 2) { st.a = (st.a + st.mem[x]) & 255; st.hl[x] = 'data'; st.bus = 'ad'; flash = ['rA']; msg = '⚙️ <b>EXECUTE</b>: the ALU adds box ' + hx(x) + ' (' + st.mem[x] + ') → A = ' + st.a + '.'; }
      else if (op === 3) { st.a = (st.a - st.mem[x] + 256) & 255; st.hl[x] = 'data'; st.bus = 'ad'; flash = ['rA']; msg = '⚙️ <b>EXECUTE</b>: the ALU subtracts box ' + hx(x) + ' (' + st.mem[x] + ') → A = ' + st.a + '.'; }
      else if (op === 4) { st.mem[x] = st.a; st.hl[x] = 'wrote'; st.bus = 'ad'; msg = '⚙️ <b>EXECUTE</b>: write A (' + st.a + ') into box ' + hx(x) + '.'; }
      else if (op === 5) { st.pc = x; flash = ['rPC']; msg = '⚙️ <b>EXECUTE</b>: jump! PC = ' + hx(x) + '. The next fetch comes from there.'; }
      else if (op === 6) { if (st.a !== 0) { st.pc = x; flash = ['rPC']; msg = '⚙️ <b>EXECUTE</b>: A is ' + st.a + ' (not zero) → jump back to ' + hx(x) + '. 🔁'; } else msg = '⚙️ <b>EXECUTE</b>: A is 0 → no jump, carry on to the next box.'; }
      st.cycles++;
      st.phase = (!st.halted && st.mode === 'user' && st.executed % 6 === 0) ? 'irq' : 'fetch';
      if (st.halted) stopRun();
    } else if (st.phase === 'irq') {
      st.mode = 'kernel'; st.ticks++; st.shown = 'irq';
      msg = st.ticks === 1 ? '⏰ <b>TIMER INTERRUPT!</b> A hardware timer rang, so the CPU stops your program mid-run and jumps into the kernel. Linux\'s scheduler asks: "Is anyone else waiting?" Your program never asked for this — and it can\'t refuse. That\'s why an endless loop can\'t freeze Linux!' :
        '⏰ <b>Timer interrupt #' + st.ticks + '</b>: the kernel takes over' + (st.ticks % 2 ? ', lets the music player run for a moment, then comes back here.' : ', checks nobody else is waiting, and goes back to your program.');
      st.phase = 'fetch';
    }
    st.cycles += 0;
    draw(flash);
    if (st.shown === 'irq') { var ph = Core.$$('#toy .toy-phases span'); ph.forEach(function (s) { s.classList.remove('on'); }); ph[0].classList.add('irq'); ph[0].textContent = '⏰ INTERRUPT'; } else { Core.$$('#toy .toy-phases span')[0].textContent = '🔎 FETCH'; }
    $('#tCU').innerHTML = msg;
  }
  function stopRun() { if (runT) { clearInterval(runT); runT = null; } $('#tRun').textContent = '▶ run'; }
  $('#tStep').addEventListener('click', function () { stopRun(); step(); });
  $('#tRun').addEventListener('click', function () {
    if (runT) return stopRun();
    if (st.halted) reset();
    runT = setInterval(step, 1350 - +$('#tSpeed').value); $('#tRun').textContent = '⏸ pause';
  });
  $('#tSpeed').addEventListener('input', function () { if (runT) { clearInterval(runT); runT = setInterval(step, 1350 - +$('#tSpeed').value); } });
  $('#tReset').addEventListener('click', reset);
  $('#tProg').addEventListener('change', function () { prog = this.value; reset(); });
  reset();

  /* ---------- from file to fetch ---------- */
  var trip = SK.chain([
    { id: 'elf', icon: '💾', label: 'ELF file', sub: '/usr/bin/ls on SSD', c: 'blue' },
    { id: 'exec', icon: '🧬', label: 'execve()', sub: 'map code (lazily!)', c: 'purple' },
    { id: 'rip', icon: '📍', label: 'RIP = entry', sub: 'back to user mode', c: 'pink' },
    { id: 'fetch', icon: '🔎', label: 'CPU fetches', sub: 'at RIP', c: 'yellow' },
    { id: 'tlb', icon: '⚡', label: 'TLB miss', sub: 'walk page table', c: 'orange' },
    { id: 'pf', icon: '💥', label: 'page fault!', sub: 'code not in RAM', c: 'red' },
    { id: 'load', icon: '📥', label: 'kernel loads', sub: '4 KB page from SSD', c: 'green' },
    { id: 'line', icon: '🗄️', label: '64-byte line', sub: 'RAM → L3 → L2 → L1i', c: 'teal' },
    { id: 'dec', icon: '🧩', label: 'decode', sub: 'bytes → micro-ops', c: 'blue' },
    { id: 'exe', icon: '⚙️', label: 'execute', sub: 'RIP moves on 🔁', c: 'pink' }
  ], { cols: 5, mcols: 2, nw: 150, nh: 100, gx: 44, gy: 56, mnw: 180, mgx: 30, fs: 17 });
  var TD = SK.diagram('#tripD', trip);
  SK.flow(TD, [
    { on: ['elf'], say: '💾 The program <code>ls</code> is an <b>ELF</b> file on the SSD: machine-code bytes plus a header that says "start at address 0x6ab0".', code: '$ readelf -h /usr/bin/ls | grep Entry\n  Entry point address:  0x6ab0' },
    { on: ['exec'], go: [['elf', 'exec', { c: 'blue' }]], say: '🧬 Your shell calls <b>execve("/usr/bin/ls")</b>. Surprise: Linux copies <b>no</b> code yet! It only writes notes in the page tables: "these addresses = that part of that file". Lazy = fast.' },
    { on: ['rip'], go: [['exec', 'rip', { c: 'purple' }]], say: '📍 The kernel puts the entry address into the CPU\'s instruction pointer (<b>RIP</b>), sets up the stack, and returns to <b>user mode</b>. From now on, the CPU drives itself.' },
    { on: ['fetch'], go: [['rip', 'fetch', { c: 'pink', label: 'RIP' }]], say: '🔎 The CPU tries to <b>fetch</b> the instruction at RIP. But RIP is a <i>virtual</i> address…' },
    { on: ['tlb'], go: [['fetch', 'tlb', { c: 'yellow' }]], say: '⚡ The MMU checks its <b>TLB</b> (translation cache): no entry. It walks the 4-level page table… and finds the page is <b>not present</b>.' },
    { on: ['pf'], go: [['tlb', 'pf', { c: 'red' }]], say: '💥 <b>Page fault!</b> The CPU stops and jumps into the kernel\'s page-fault handler (exception 14), remembering the bad address in a special register (CR2).' },
    { on: ['load'], go: [['pf', 'load', { c: 'green', label: '4 KB' }]], say: '📥 The kernel sees "that\'s ls\'s code" — it reads the 4 KB page from the SSD into the <b>page cache</b> (or finds it already there), maps it, and returns. The CPU <b>retries</b> the same fetch. ✅ (See all page-fault types in <a href="memory.html#pagefault">Chapter 5</a>.)' },
    { on: ['line'], go: [['load', 'line', { c: 'teal', label: '64 B' }]], say: '🗄️ This time it works: a 64-byte <b>cache line</b> comes from RAM through L3 and L2 into the <b>L1 instruction cache</b>. The next few instructions came along for free!' },
    { on: ['dec'], go: [['line', 'dec', { c: 'blue' }]], say: '🧩 The decoder turns bytes like <code>48 89 e5</code> into simple internal steps (<b>micro-ops</b>). The branch predictor already guesses what comes next.' },
    { on: ['exe'], go: [['dec', 'exe', { c: 'pink' }]], say: '⚙️ <b>Execute!</b> RIP moves to the next instruction and the loop repeats billions of times per second — no OS involved — until a timer, system call or fault hands control back to the kernel.' }
  ]);

  /* ---------- pipeline ---------- */
  var SC = { F: 'var(--yellow)', D: 'var(--blue)', E: 'var(--pink)', M: 'var(--green)', W: 'var(--purple)' }, pTok = 0;
  function pipe(on) {
    var N = 5, S = ['F', 'D', 'E', 'M', 'W'], cols = on ? N + 4 : N * 5, my = ++pTok;
    var h = '<table><tr><th></th>' + Array.from({ length: cols }, function (_, i) { return '<th>' + (i + 1) + '</th>'; }).join('') + '</tr>';
    for (var i = 0; i < N; i++) h += '<tr><th>I' + (i + 1) + '</th>' + Array.from({ length: cols }, function (_, c) { return '<td data-i="' + i + '" data-c="' + c + '"></td>'; }).join('') + '</tr>';
    $('#pipeGrid').innerHTML = h + '</table>'; $('#pCyc').textContent = 'cycles: …';
    var t = 0;
    (function tick() {
      if (my !== pTok || t >= cols) { if (my === pTok) $('#pCyc').textContent = 'cycles: ' + cols + (on ? ' 🏎️ (vs 25!)' : ' 🐢'); return; }
      for (var i2 = 0; i2 < N; i2++) {
        var s = on ? t - i2 : t - 5 * i2;
        if (s >= 0 && s < 5) { var td = $('#pipeGrid td[data-i="' + i2 + '"][data-c="' + t + '"]'); td.textContent = S[s]; td.style.background = SC[S[s]]; td.style.color = '#1d1830'; td.style.fontWeight = 700; }
      }
      t++; setTimeout(tick, on ? 260 : 120);
    })();
  }
  $('#pNo').addEventListener('click', function () { pipe(false); });
  $('#pYes').addEventListener('click', function () { pipe(true); });
  Core.whenVisible($('#pipeGrid'), function () { pipe(true); }, '-60px');

  /* ---------- caches ---------- */
  SK.diagram('#cacheD', {
    title: 'CPU caches', w: 860, h: 330, fs: 16,
    groups: [{ x: 4, y: 4, w: 560, h: 320, label: '🧠 inside the CPU chip', c: 'purple', m: [4, 4, 412, 380] }],
    nodes: [
      { id: 'c1', x: 24, y: 44, w: 250, h: 140, label: 'Core 1', sub: 'L1i 32 KB · L1d 48 KB\n~1 ns\nL2 1–2 MB · ~4 ns', c: 'pink', top: 14, m: [20, 44, 186, 150] },
      { id: 'c2', x: 294, y: 44, w: 250, h: 140, label: 'Core 2', sub: 'L1i 32 KB · L1d 48 KB\n~1 ns\nL2 1–2 MB · ~4 ns', c: 'pink', top: 14, m: [214, 44, 186, 150] },
      { id: 'l3', x: 24, y: 210, w: 520, h: 56, label: 'L3 cache (shared) · 16–64 MB · ~15 ns', c: 'orange', m: [20, 210, 380, 56] },
      { id: 'mc', x: 160, y: 276, w: 250, h: 40, label: 'memory controller', c: 'gray', fs: 15, m: [80, 278, 260, 40] },
      { id: 'ram', x: 640, y: 150, w: 200, h: 120, icon: '🧮', label: 'RAM', sub: '~100 ns', c: 'green', m: [110, 410, 200, 100] }
    ],
    edges: [{ from: 'c1', to: 'l3', both: true }, { from: 'c2', to: 'l3', both: true }, { from: 'mc', to: 'ram', both: true, label: '64-byte lines', mNoLabel: true }],
    mobile: { w: 420, h: 520 }
  });

  OSLab.mount(document.getElementById('labChip'), { scenarios: ['chip'] });
  OSLab.mount(document.getElementById('labPipe'), { scenarios: ['pipe'] });
  OSLab.mount(document.getElementById('lab'), { scenarios: ['fetch'] });

  Core.quiz('#quizBox', [
    { q: 'Who fetches each instruction from memory?', a: ['The Linux kernel, one by one', 'The CPU hardware, all by itself', 'The hard disk', 'The keyboard'], c: 1, why: 'The CPU fetches, decodes and executes on its own. The kernel only sets things up (page tables, RIP) and gets control back via interrupts, system calls and faults.' },
    { q: 'What does the program counter (RIP on x86-64) hold?', a: ['The number of programs', 'The address of the next instruction', 'The CPU temperature', 'The time'], c: 1, why: 'Fetch reads from the address in the program counter, then moves it to the next instruction (or a jump sets it).' },
    { q: 'The very first time a program\'s code is fetched, it usually…', a: ['Is already in L1', 'Triggers a page fault, and the kernel loads it from disk', 'Crashes', 'Is sent over the network'], c: 1, why: 'execve() maps code lazily. The first fetch faults; the kernel loads the page (demand paging) and the CPU retries.' },
    { q: 'A program is stuck in an endless loop and never makes a system call. How does Linux get the CPU back?', a: ['It can\'t — the computer freezes', 'A timer interrupt forces the CPU into the kernel', 'The user must unplug the computer', 'The GPU stops it'], c: 1, why: 'The hardware timer fires every few milliseconds; the scheduler then decides who runs next. That\'s preemptive multitasking.' },
    { q: 'Pipelining makes a CPU faster by…', a: ['Making each instruction shorter', 'Working on different stages of several instructions at the same time', 'Using more RAM', 'Skipping instructions'], c: 1, why: 'Like laundry: while one instruction executes, the next is decoded and the one after is fetched.' },
    { q: 'Where does the CPU look first for the next instruction?', a: ['The SSD', 'RAM', 'The L1 instruction cache', 'The internet'], c: 2, why: 'L1i is the closest, fastest storage. On a miss it asks L2, then L3, then RAM — and on a page fault, the kernel loads it from disk.' }
  ]);
})();
