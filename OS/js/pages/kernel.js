/* Chapter 7 — Kernel, syscalls, interrupts, drivers, network */
(function () {
  'use strict';
  var $ = Core.$;

  /* rings */
  SK.diagram('#ringsD', {
    title: 'CPU privilege rings', w: 420, h: 400, fs: 16, dim: false,
    nodes: [
      { id: 'r3', x: 10, y: 10, w: 400, h: 380, shape: 'ellipse', label: 'Ring 3 — user mode', sub: '🦊 🐍 🎮 apps live here', c: 'pink', top: 26 },
      { id: 'r2', x: 70, y: 90, w: 280, h: 260, shape: 'ellipse', label: 'ring 2', sub: '(unused by Linux)', c: 'gray', top: 18, fs: 14 },
      { id: 'r1', x: 120, y: 150, w: 180, h: 165, shape: 'ellipse', label: 'ring 1', c: 'gray', top: 12, fs: 14 },
      { id: 'r0', x: 155, y: 198, w: 110, h: 100, shape: 'ellipse', icon: '👑', label: 'Ring 0', sub: 'kernel', c: 'purple' }
    ]
  });

  /* syscall chain */
  var sys = SK.chain([
    { id: 'app', icon: '🐍', label: 'print("hi")', sub: 'your program', c: 'pink' },
    { id: 'libc', icon: '📚', label: 'glibc', sub: 'write(1, "hi\\n", 3)', c: 'teal' },
    { id: 'reg', icon: '📝', label: 'set registers', sub: 'rax = 1 (write)\nrdi=1 rsi=buf rdx=3', c: 'yellow' },
    { id: 'trap', icon: '🚪', label: 'syscall', sub: 'CPU → ring 0', c: 'orange' },
    { id: 'entry', icon: '⚙️', label: 'entry_SYSCALL_64', sub: 'save user state', c: 'purple' },
    { id: 'tab', icon: '📒', label: 'sys_call_table[1]', sub: '→ ksys_write()', c: 'purple' },
    { id: 'vfs', icon: '🔌', label: 'VFS → tty driver', c: 'blue' },
    { id: 'scr', icon: '🖥️', label: 'terminal', sub: 'shows "hi"', c: 'green' },
    { id: 'ret', icon: '↩️', label: 'return 3', sub: 'sysret → ring 3', c: 'pink' }
  ], { cols: 5, mcols: 2, nw: 160, nh: 104, gx: 40, gy: 60, mnw: 180, mgx: 30, fs: 17 });
  sys.groups = [];
  var SD = SK.diagram('#sysD', sys);
  SK.flow(SD, [
    { on: ['app'], say: '🐍 Your Python program runs <code>print("hi")</code>. Python is a user-space program, so it can\'t touch the screen itself.' },
    { on: ['libc'], go: [['app', 'libc', { c: 'pink' }]], say: '📚 Deep inside, it calls the C library function <b>write(1, "hi\\n", 3)</b>: "write 3 bytes to file descriptor 1 (stdout)".' },
    { on: ['reg'], go: [['libc', 'reg', { c: 'teal' }]], say: '📝 glibc puts the <b>system call number</b> in register <code>rax</code> (1 = write on x86-64) and the arguments in <code>rdi</code>, <code>rsi</code>, <code>rdx</code>.' },
    { on: ['trap'], go: [['reg', 'trap', { c: 'yellow', label: 'syscall' }]], say: '🚪 It executes the special <b>syscall</b> instruction. The CPU switches to <b>ring 0</b> and jumps to an address the kernel chose at boot. The app can\'t pick where to land — that\'s the safety!' },
    { on: ['entry'], go: [['trap', 'entry', { c: 'orange' }]], say: '⚙️ The kernel\'s entry code (<code>entry_SYSCALL_64</code>) saves the app\'s registers and switches to the kernel stack.' },
    { on: ['tab'], go: [['entry', 'tab', { c: 'purple' }]], say: '📒 It looks up number 1 in the <b>system call table</b> → <code>ksys_write()</code>. It also <b>checks everything</b>: is fd 1 open? Is the buffer really the app\'s memory?' },
    { on: ['vfs'], go: [['tab', 'vfs', { c: 'purple' }]], say: '🔌 The VFS sees fd 1 is a terminal and hands the bytes to the <b>tty driver</b>.' },
    { on: ['scr'], go: [['vfs', 'scr', { c: 'blue', label: 'hi' }]], say: '🖥️ The terminal draws "hi". 🎉' },
    { on: ['ret', 'app'], go: [['scr', 'ret', { c: 'green' }]], say: '↩️ The kernel puts the result (3 bytes written) in <code>rax</code>, restores registers and returns to ring 3 with <code>sysret</code>. Total: well under a microsecond for the round trip.' }
  ]);

  /* interrupt chain */
  var irq = SK.chain([
    { id: 'key', icon: '⌨️', label: 'key pressed', c: 'pink' },
    { id: 'ctl', icon: '🔔', label: 'controller', sub: 'raises IRQ 1', c: 'yellow' },
    { id: 'apic', icon: '📡', label: 'APIC', sub: 'picks a CPU core', c: 'orange' },
    { id: 'cpu', icon: '🧠', label: 'CPU pauses', sub: 'saves current task', c: 'purple' },
    { id: 'idt', icon: '📒', label: 'IDT lookup', sub: '→ handler', c: 'purple' },
    { id: 'top', icon: '⚡', label: 'top half', sub: 'read scancode, ack', c: 'red' },
    { id: 'bot', icon: '🐢', label: 'bottom half', sub: 'input subsystem', c: 'blue' },
    { id: 'ev', icon: '📄', label: '/dev/input/…', sub: 'app wakes up', c: 'green' },
    { id: 'res', icon: '↩️', label: 'resume', sub: 'old task continues', c: 'teal' }
  ], { cols: 5, mcols: 2, nw: 150, nh: 96, gx: 46, gy: 56, mnw: 180, mgx: 30, fs: 17 });
  var ID = SK.diagram('#irqD', irq);
  SK.flow(ID, [
    { on: ['key'], say: '⌨️ You press <kbd>A</kbd>. The keyboard sends a code over USB (or the old PS/2 port).' },
    { on: ['ctl'], go: [['key', 'ctl', { c: 'pink' }]], say: '🔔 The controller raises an <b>interrupt request</b> (IRQ) — the electronic doorbell.' },
    { on: ['apic'], go: [['ctl', 'apic', { c: 'yellow', label: 'IRQ' }]], say: '📡 The interrupt controller (<b>APIC</b>) decides which CPU core should answer.' },
    { on: ['cpu'], go: [['apic', 'cpu', { c: 'orange' }]], say: '🧠 That core <b>stops</b> whatever it was running (mid-instruction-stream!), saves where it was, and switches to kernel mode.' },
    { on: ['idt'], go: [['cpu', 'idt', { c: 'purple' }]], say: '📒 It looks up the interrupt number in the <b>Interrupt Descriptor Table</b> to find the right handler.' },
    { on: ['top'], go: [['idt', 'top', { c: 'purple' }]], say: '⚡ The <b>top half</b> runs: grab the key code, tell the device "got it". Must be done in microseconds.' },
    { on: ['bot'], go: [['top', 'bot', { c: 'red' }]], say: '🐢 The <b>bottom half</b> (scheduled for "soon, with interrupts on") turns it into a key event in the input subsystem.' },
    { on: ['ev'], go: [['bot', 'ev', { c: 'blue', label: 'KEY_A' }]], say: '📄 The event appears on <code>/dev/input/event3</code>. Your desktop/terminal was sleeping on a read() — it\'s woken up and gets "A".' },
    { on: ['res'], go: [['ev', 'res', { c: 'green' }]], say: '↩️ The interrupted task resumes exactly where it was, never knowing anything happened. Your timer, disk and network card do this thousands of times per second!' }
  ]);

  /* kernel designs */
  function arch(sel, nodes, groups, edges) { SK.diagram(sel, { title: 'kernel design', w: 300, h: 300, fs: 14, dim: false, groups: groups, nodes: nodes, edges: edges || [] }); }
  arch('#monoD', [
    { id: 'a', x: 20, y: 30, w: 80, h: 44, label: 'app', c: 'pink' }, { id: 'b', x: 110, y: 30, w: 80, h: 44, label: 'app', c: 'pink' }, { id: 'c', x: 200, y: 30, w: 80, h: 44, label: 'app', c: 'pink' },
    { id: 'k', x: 16, y: 120, w: 268, h: 170, label: '⚙️ one big kernel', sub: 'scheduler · memory\nfile systems · network\ndrivers · IPC · security', c: 'purple' }
  ], [{ x: 4, y: 104, w: 292, h: 192, label: '', c: 'purple' }], [{ from: 'a', to: 'k' }, { from: 'b', to: 'k' }, { from: 'c', to: 'k' }]);
  arch('#microD', [
    { id: 'a', x: 10, y: 10, w: 80, h: 40, label: 'app', c: 'pink' }, { id: 'fs', x: 110, y: 10, w: 80, h: 40, label: 'files', c: 'yellow' }, { id: 'nt', x: 210, y: 10, w: 80, h: 40, label: 'net', c: 'yellow' },
    { id: 'd1', x: 10, y: 80, w: 80, h: 40, label: 'driver', c: 'orange' }, { id: 'd2', x: 110, y: 80, w: 80, h: 40, label: 'driver', c: 'orange' }, { id: 'b', x: 210, y: 80, w: 80, h: 40, label: 'app', c: 'pink' },
    { id: 'k', x: 70, y: 210, w: 160, h: 76, label: '⚙️ tiny kernel', sub: 'IPC · threads · memory', c: 'purple' }
  ], [{ x: 4, y: 196, w: 292, h: 100, label: '', c: 'purple' }], [{ from: 'a', to: 'k', dash: true }, { from: 'fs', to: 'k', dash: true }, { from: 'd2', to: 'k', dash: true }, { from: 'nt', to: 'k', dash: true }, { from: 'd1', to: 'k', dash: true }]);
  arch('#hybridD', [
    { id: 'a', x: 20, y: 20, w: 80, h: 44, label: 'app', c: 'pink' }, { id: 'b', x: 110, y: 20, w: 80, h: 44, label: 'app', c: 'pink' }, { id: 's', x: 200, y: 20, w: 80, h: 44, label: 'service', c: 'yellow' },
    { id: 'k1', x: 16, y: 130, w: 130, h: 70, label: 'file sys\n+ drivers', c: 'orange' }, { id: 'k2', x: 156, y: 130, w: 128, h: 70, label: 'graphics\n+ net', c: 'orange' },
    { id: 'k', x: 60, y: 220, w: 180, h: 64, label: '⚙️ micro-ish core', c: 'purple' }
  ], [{ x: 4, y: 110, w: 292, h: 186, label: '', c: 'purple' }], [{ from: 'a', to: 'k1' }, { from: 'b', to: 'k2' }, { from: 's', to: 'k2' }, { from: 'k1', to: 'k' }, { from: 'k2', to: 'k' }]);

  /* encapsulation */
  var LAYERS = [
    { n: 'Ethernet frame', c: 'blue', h: ['dst MAC 3c:7c:…', 'src MAC a4:83:…', 'type IPv4'], why: 'Link layer: which device on THIS local network gets it next (your router).' },
    { n: 'IP packet', c: 'green', h: ['from 192.168.1.42', 'to 93.184.215.14', 'TTL 64'], why: 'Network layer: the global address. Routers forward it hop by hop across the internet.' },
    { n: 'TCP segment', c: 'orange', h: ['port 51234 → 443', 'seq 1001', 'ACK, window'], why: 'Transport layer: which program (port), plus numbering so lost pieces are re-sent and arrive in order.' },
    { n: 'HTTP data', c: 'pink', h: [], why: 'Application layer: the actual message your program wanted to send.' }
  ];
  var depth = 1;
  function drawEnc() {
    var html = '<div class="data">GET /index.html HTTP/1.1<br>Host: example.com</div>';
    for (var i = LAYERS.length - 2; i >= 0; i--) {
      var L = LAYERS[i], on = i >= LAYERS.length - depth;
      html = '<div class="lay' + (on ? '' : ' off') + '" style="background:' + SK.tint(L.c) + '"><div class="hd"><b>' + L.n + '</b>' + L.h.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' + html + '</div>';
    }
    $('#enc').innerHTML = html;
    var cur = LAYERS[LAYERS.length - depth];
    $('#encInfo').innerHTML = '<b>' + cur.n + '</b>: ' + cur.why;
    $('#wrapB').disabled = depth >= LAYERS.length; $('#unwrapB').disabled = depth <= 1;
  }
  $('#wrapB').addEventListener('click', function () { if (depth < LAYERS.length) { depth++; drawEnc(); } });
  $('#unwrapB').addEventListener('click', function () { if (depth > 1) { depth--; drawEnc(); } });
  drawEnc();

  /* network stack path */
  var ND = SK.diagram('#netD', {
    title: 'Linux network stack', w: 860, h: 300, fs: 16,
    groups: [{ x: 4, y: 4, w: 852, h: 70, label: '', c: 'pink', m: [4, 4, 402, 70] }, { x: 4, y: 84, w: 852, h: 210, label: '', c: 'purple', m: [4, 84, 402, 356] }],
    nodes: [
      { id: 'app', x: 330, y: 14, w: 200, h: 52, label: '🦊 app: send()', c: 'pink', m: [100, 14, 200, 52] },
      { id: 'sock', x: 20, y: 110, w: 140, h: 70, label: '📞 socket', sub: 'buffer', c: 'yellow', m: [20, 100, 170, 64] },
      { id: 'tcp', x: 185, y: 110, w: 140, h: 70, label: '🔢 TCP', sub: 'ports, seq', c: 'orange', m: [220, 100, 170, 64] },
      { id: 'ip', x: 350, y: 110, w: 140, h: 70, label: '🗺️ IP', sub: 'routing', c: 'green', m: [220, 186, 170, 64] },
      { id: 'nf', x: 515, y: 110, w: 150, h: 70, label: '🧱 netfilter', sub: 'firewall / NAT', c: 'red', m: [20, 186, 170, 64] },
      { id: 'qd', x: 690, y: 110, w: 150, h: 70, label: '🚦 qdisc', sub: 'queue, shaping', c: 'teal', m: [20, 272, 170, 64] },
      { id: 'drv', x: 520, y: 210, w: 150, h: 70, label: '🔌 driver', sub: 'skb → ring', c: 'blue', m: [220, 272, 170, 64] },
      { id: 'nic', x: 690, y: 210, w: 150, h: 70, label: '📮 NIC', sub: 'DMA → wire', c: 'blue', m: [220, 358, 170, 64] }
    ],
    edges: [{ from: 'app', to: 'sock' }, { from: 'sock', to: 'tcp' }, { from: 'tcp', to: 'ip' }, { from: 'ip', to: 'nf' }, { from: 'nf', to: 'qd' }, { from: 'qd', to: 'drv' }, { from: 'drv', to: 'nic' }],
    texts: [{ x: 120, y: 250, t: 'inside the\nLinux kernel ⚙️', fs: 18, c: 'purple', m: [100, 380] }],
    mobile: { w: 410, h: 444 }
  });
  SK.flow(ND, [
    { on: ['app', 'sock'], go: [['app', 'sock', { label: 'data', c: 'pink' }]], say: '🦊 The app calls <code>send()</code> on its socket. The bytes are copied into the socket\'s send buffer (a kernel <b>sk_buff</b>, or "skb").' },
    { on: ['tcp'], go: [['sock', 'tcp', { c: 'yellow' }]], say: '🔢 TCP chops data into segments, numbers them, adds ports, and keeps copies until the other side says "got it" (ACK).' },
    { on: ['ip'], go: [['tcp', 'ip', { c: 'orange' }]], say: '🗺️ IP adds source/destination addresses and asks the <b>routing table</b>: which way? (<code>ip route</code>)' },
    { on: ['nf'], go: [['ip', 'nf', { c: 'green' }]], say: '🧱 <b>netfilter</b> hooks run your firewall (nftables/iptables) and NAT rules — Docker uses these to give containers internet!' },
    { on: ['qd'], go: [['nf', 'qd', { c: 'red' }]], say: '🚦 The <b>queueing discipline</b> lines packets up fairly and can shape traffic (<code>tc</code>).' },
    { on: ['drv', 'nic'], go: [['qd', 'drv', { c: 'teal' }], ['drv', 'nic', { c: 'blue', label: 'DMA' }]], say: '📮 The driver places the packet on the card\'s ring buffer; the NIC fetches it by DMA and sends it down the wire. Receiving is the same path, upside-down!' }
  ]);

  OSLab.mount(document.getElementById('lab'), { scenarios: ['cake', 'net'] });

  Core.quiz('#quizBox', [
    { q: 'What instruction does a program use on x86-64 to enter the kernel?', a: ['jump', 'syscall', 'return', 'print'], c: 1, why: 'The syscall instruction switches the CPU to ring 0 and jumps to the kernel\'s fixed entry point. The syscall number goes in rax.' },
    { q: 'How does a keyboard get the CPU\'s attention?', a: ['By polling the user', 'By raising an interrupt (IRQ)', 'By writing to /tmp', 'It can\'t'], c: 1, why: 'Devices raise interrupts; the CPU pauses, runs the kernel\'s handler, then resumes the interrupted work.' },
    { q: 'What is DMA?', a: ['A device copying data to/from RAM by itself, without the CPU moving every byte', 'A type of virus', 'A Linux distribution', 'A shell command'], c: 0, why: 'Direct Memory Access frees the CPU: the device moves the data and only interrupts when done.' },
    { q: 'Linux is which kind of kernel?', a: ['Microkernel', 'Monolithic (with loadable modules)', 'Exokernel', 'No kernel'], c: 1, why: 'Linux is monolithic: all core subsystems run in kernel space. Modules can be loaded/unloaded at runtime.' },
    { q: 'Which tool shows the system calls a program makes?', a: ['strace', 'chmod', 'grep', 'mount'], c: 0, why: 'strace uses ptrace to print every system call and its result. Try strace -c to get a summary.' },
    { q: 'When sending data, which header is added LAST (outermost)?', a: ['HTTP', 'TCP', 'IP', 'Ethernet'], c: 3, why: 'Data is wrapped as it goes down: HTTP → TCP → IP → Ethernet. The receiver unwraps in reverse.' }
  ]);
})();
