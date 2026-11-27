/* Home page: restaurant story, OS on/off, layer cake, map, quiz */
(function () {
  'use strict';

  /* --- restaurant analogy --- */
  var R = SK.diagram('#restaurant', {
    title: 'Restaurant analogy of an operating system', w: 820, h: 380, fs: 17,
    nodes: [
      { id: 'you', x: 10, y: 150, w: 120, h: 92, icon: '🙋', label: 'You', sub: 'customer', c: 'pink', m: [140, 10, 140, 86] },
      { id: 'app', x: 175, y: 150, w: 140, h: 92, icon: '🎵', label: 'Music app', sub: 'the waiter', c: 'yellow', m: [130, 132, 160, 86] },
      { id: 'os', x: 365, y: 128, w: 170, h: 136, icon: '🐧', label: 'Operating\nSystem', sub: 'the manager', c: 'purple', iconSize: 34, m: [110, 262, 200, 120] },
      { id: 'cpu', x: 610, y: 8, w: 190, h: 76, icon: '🔥', label: 'CPU = stove', mLabel: 'CPU\n= stove', c: 'orange', m: [6, 440, 96, 100] },
      { id: 'ram', x: 610, y: 102, w: 190, h: 76, icon: '🍽️', label: 'RAM = counter', mLabel: 'RAM =\ncounter', c: 'green', m: [110, 440, 96, 100] },
      { id: 'disk', x: 610, y: 196, w: 190, h: 76, icon: '🗄️', label: 'Disk = pantry', mLabel: 'Disk =\npantry', c: 'blue', m: [214, 440, 96, 100] },
      { id: 'spk', x: 610, y: 290, w: 190, h: 76, icon: '🔊', label: 'Speaker', c: 'teal', m: [318, 440, 96, 100] }
    ],
    edges: [{ from: 'you', to: 'app' }, { from: 'app', to: 'os' }, { from: 'os', to: 'cpu' }, { from: 'os', to: 'ram' }, { from: 'os', to: 'disk' }, { from: 'os', to: 'spk' }],
    mobile: { w: 420, h: 550 }
  });
  SK.flow(R, [
    { on: ['you'], go: [['you', 'app', { label: 'play! ▶', c: 'pink' }]], say: 'You tap ▶ on a song. 🎵 You don\'t know — or care — how the computer works inside. Nice!' },
    { on: ['app', 'os'], go: [['app', 'os', { label: 'please…', c: 'yellow' }]], say: 'The music app can\'t touch the hardware itself. It politely asks the OS: <i>"Please read song.mp3 and play it."</i> That polite request is called a <b>system call</b>.' },
    { on: ['os', 'disk'], go: [['os', 'disk', { c: 'blue' }], ['disk', 'os', { label: 'song.mp3', c: 'blue' }]], say: 'The OS fetches the song from the <b>disk</b> (the pantry: big, permanent, a bit slow).' },
    { on: ['os', 'ram'], go: [['os', 'ram', { label: 'store', c: 'green' }]], say: 'It finds free space in <b>RAM</b> (the counter: small, super fast) to hold the song while it plays.' },
    { on: ['os', 'cpu'], go: [['os', 'cpu', { label: 'your turn', c: 'orange' }]], say: 'It gives the app <b>turns on the CPU</b> (the stove) to decode the music — sharing fairly with all your other apps.' },
    { on: ['os', 'spk'], go: [['os', 'spk', { label: '♪ ♫', c: 'teal' }]], say: 'It sends the sound to the speaker through a <b>driver</b> — a translator that knows exactly how to talk to <i>that</i> speaker.' },
    { on: ['os'], say: '🎉 The OS did all the hard work — <b>fairly, safely and super fast</b> — thousands of times per second. That\'s the job of an Operating System!' }
  ], { intro: 'Press <b>▶ Play</b> to watch what happens when you press play on a song.' });

  /* --- OS on / off --- */
  var apps = [
    { id: 'g', icon: '🎮', label: 'Game', c: 'pink' }, { id: 'm', icon: '🎵', label: 'Music', c: 'yellow' }, { id: 'b', icon: '🦊', label: 'Browser', c: 'orange' }
  ];
  var hw = [{ id: 'cpu', icon: '🧠', label: 'CPU', c: 'purple' }, { id: 'sp', icon: '🔊', label: 'Speaker', c: 'teal' }, { id: 'dk', icon: '💾', label: 'Disk', c: 'blue' }];
  function row(list, y, h, mobile) {
    return list.map(function (n, i) {
      var o = {}; for (var k in n) o[k] = n[k];
      o.x = 40 + i * 230; o.y = y; o.w = 160; o.h = h; o.m = [8 + i * 120, y, 104, h]; return o;
    });
  }
  var on = SK.diagram('#dOn', {
    title: 'With an OS: apps talk to the OS, the OS talks to hardware', w: 700, h: 330, fs: 18,
    nodes: row(apps, 10, 72).concat([{ id: 'os', x: 140, y: 128, w: 420, h: 70, icon: '🐧', label: 'Operating System', c: 'green', m: [20, 128, 320, 70] }]).concat(row(hw, 246, 72)),
    edges: [{ from: 'g', to: 'os' }, { from: 'm', to: 'os' }, { from: 'b', to: 'os' }, { from: 'os', to: 'cpu' }, { from: 'os', to: 'sp' }, { from: 'os', to: 'dk' }],
    mobile: { w: 360, h: 330 }
  });
  var off = SK.diagram('#dOff', {
    title: 'Without an OS: every app grabs the hardware directly', w: 700, h: 330, fs: 18,
    nodes: row(apps, 10, 72).concat(row(hw, 246, 72)),
    edges: [
      { from: 'g', to: 'cpu', c: 'red' }, { from: 'g', to: 'sp', c: 'red', curve: 20 }, { from: 'g', to: 'dk', c: 'red', curve: -30 },
      { from: 'm', to: 'sp', c: 'red' }, { from: 'm', to: 'cpu', c: 'red', curve: 18 }, { from: 'm', to: 'dk', c: 'red' },
      { from: 'b', to: 'cpu', c: 'red', curve: 30 }, { from: 'b', to: 'dk', c: 'red' }, { from: 'b', to: 'sp', c: 'red', curve: -20 }
    ],
    texts: [{ x: 350, y: 168, t: '💥 😵 💥', fs: 34, m: [180, 168] }, { x: 600, y: 160, t: 'MINE!', fs: 22, c: 'red', rot: -10, m: [300, 120] }, { x: 110, y: 170, t: 'no, MINE!', fs: 22, c: 'red', rot: 8, m: [60, 210] }],
    mobile: { w: 360, h: 330 }
  });
  var bOn = document.getElementById('osOn'), bOff = document.getElementById('osOff');
  function setOS(v) {
    document.getElementById('dOn').hidden = !v; document.getElementById('dOff').hidden = v;
    document.getElementById('onNote').hidden = !v; document.getElementById('offNote').hidden = v;
    bOn.classList.toggle('on', v); bOff.classList.toggle('on', !v);
    bOn.classList.toggle('green', v); bOff.classList.toggle('red', !v);
    if (!v) { off.svg.classList.add('shake'); setTimeout(function () { off.svg.classList.remove('shake'); }, 700); }
    else { on.newToken(); ['g', 'm', 'b'].forEach(function (a, i) { setTimeout(function () { on.packet(a, 'os', { c: 'yellow' }).then(function () { return on.packet('os', ['cpu', 'sp', 'dk'][i], { c: 'green' }); }); }, i * 300); }); }
  }
  bOn.addEventListener('click', function () { setOS(true); });
  bOff.addEventListener('click', function () { setOS(false); });

  /* --- layer cake (2D, clickable) --- */
  var INFO = {
    you: ['🙋 You', 'pink', 'The human! You click, tap and type. You never talk to the hardware directly.', 'Even typing a command in a terminal goes through several layers below you.'],
    apps: ['🧩 Apps & the shell', 'yellow', 'Programs you use: browsers, games, editors. The <b>shell</b> (like <code>bash</code>) is an app that runs your typed commands.', 'They run in <b>user space</b>: restricted, each in its own private memory.'],
    libs: ['📚 Libraries', 'teal', 'Ready-made toolboxes of code. Instead of every app writing its own "print text" code, they share one.', '<b>glibc</b> is Linux\'s main C library. Your <code>printf()</code> lives here and eventually calls the <code>write()</code> system call.'],
    sys: ['🚪 System calls', 'orange', 'The ONLY doors from user space into the kernel. An app says "please open this file" and waits.', 'Linux has around 450 of them: <code>read</code>, <code>write</code>, <code>openat</code>, <code>fork</code>/<code>clone</code>, <code>execve</code>, <code>mmap</code>… Try <code>strace ls</code> to watch them.'],
    kernel: ['⚙️ The Linux kernel', 'purple', 'The boss 👑. Always in memory, trusted, all-powerful. It manages the CPU, memory, files, network and devices.', 'Runs in <b>kernel space</b> (CPU ring 0). Linux is a <b>monolithic</b> kernel: all these teams live in one big program (with loadable modules).'],
    k1: ['⏱️ Scheduler', 'pink', 'Decides which program gets the CPU next, and for how long.', 'Linux uses <b>EEVDF</b> (since 6.6, replacing CFS) for normal tasks, plus real-time classes.'],
    k2: ['🧮 Memory manager', 'green', 'Gives each program its own private memory and keeps them apart.', 'Virtual memory, page tables, page cache, swap, the OOM killer.'],
    k3: ['📁 VFS & file systems', 'yellow', 'Turns a disk full of bytes into neat files and folders.', 'The VFS gives one interface for ext4, btrfs, XFS, NFS, /proc…'],
    k4: ['🌐 Network stack', 'blue', 'Packs and unpacks data for the internet.', 'TCP/IP, sockets, netfilter (firewall), routing — all inside the kernel.'],
    k5: ['🔌 Device drivers', 'orange', 'Translators that know how to talk to each specific piece of hardware.', 'Most of Linux\'s code is drivers! <code>lsmod</code> lists loaded driver modules.'],
    hw: ['🔩 Hardware', 'gray', 'The physical stuff: CPU, RAM, SSD, GPU, network card, keyboard…', 'Only the kernel is allowed to touch it directly.']
  };
  function info(id) {
    var d = INFO[id]; if (!d) return;
    document.getElementById('cakeInfo').innerHTML = '<h3>' + d[0] + '</h3><p>' + d[2] + '</p><div class="note linux"><div class="note-h">🐧 In Linux</div><p>' + d[3] + '</p></div>';
    cake.on([id].concat(id === 'kernel' ? ['k1', 'k2', 'k3', 'k4', 'k5'] : []));
  }
  var K = ['⏱️\nCPU', '🧮\nRAM', '📁\nFiles', '🌐\nNet', '🔌\nDrivers'], KC = ['pink', 'green', 'yellow', 'blue', 'orange'];
  var cakeNodes = [
    { id: 'you', x: 40, y: 12, w: 560, h: 54, label: '🙋 You', c: 'pink', m: [10, 12, 360, 54] },
    { id: 'apps', x: 40, y: 76, w: 560, h: 60, label: '🧩 Apps & Shell', sub: 'Firefox · bash · games · VS Code', c: 'yellow', m: [10, 76, 360, 60] },
    { id: 'libs', x: 40, y: 146, w: 560, h: 54, label: '📚 Libraries', sub: 'glibc · libssl · libpng …', c: 'teal', m: [10, 146, 360, 54] },
    { id: 'sys', x: 40, y: 214, w: 560, h: 44, label: '🚪 System Call Interface', c: 'orange', m: [10, 214, 360, 44] },
    { id: 'kernel', x: 40, y: 272, w: 560, h: 120, label: '⚙️ Linux Kernel', c: 'purple', top: 8, m: [10, 272, 360, 120] },
    { id: 'hw', x: 40, y: 404, w: 560, h: 64, label: '🔩 Hardware', sub: 'CPU · RAM · SSD · GPU · NIC', c: 'gray', hatch: true, m: [10, 404, 360, 64] }
  ];
  K.forEach(function (k, i) { cakeNodes.push({ id: 'k' + (i + 1), x: 52 + i * 108, y: 316, w: 100, h: 66, label: k, c: KC[i], fs: 15, m: [16 + i * 70, 316, 64, 66] }); });
  var cake = SK.diagram('#cakeD', {
    title: 'Layers of a Linux system', w: 760, h: 480, fs: 19, dim: true,
    groups: [{ x: 24, y: 4, w: 592, h: 204, label: 'user space', c: 'blue', lAnchor: 'end', m: [2, 4, 376, 204] }, { x: 24, y: 264, w: 592, h: 136, label: 'kernel space', c: 'purple', lAnchor: 'end', m: [2, 264, 376, 136] }],
    nodes: cakeNodes,
    texts: [{ x: 690, y: 100, t: 'safe\nplayground 🛝', fs: 18, mHide: true }, { x: 690, y: 230, t: 'the only\ndoors 🚪', fs: 18, mHide: true }, { x: 690, y: 320, t: 'the boss 👑', fs: 18, mHide: true }, { x: 690, y: 430, t: 'the real\nstuff 🔌', fs: 18, mHide: true }],
    onClick: function (id) { info(id); },
    mobile: { w: 380, h: 480 }
  });
  info('kernel');

  /* --- 3D --- */
  OSLab.mount(document.getElementById('lab'), { scenarios: ['tour', 'cake'] });

  /* --- map + quiz --- */
  Core.chapterMap('#chapMap');
  Core.quiz('#quizBox', [
    { q: 'What is the main job of an Operating System?', a: ['Make the computer look pretty', 'Manage the hardware and let programs share it safely', 'Browse the internet', 'Store photos'], c: 1, why: 'The OS is the manager between programs and hardware: it shares the CPU, memory, disks and devices fairly and safely.' },
    { q: 'In the restaurant story, the OS is the…', a: ['Customer', 'Stove', 'Manager', 'Menu'], c: 2, why: 'You are the customer, apps are waiters, hardware is the kitchen, and the OS is the manager running it all.' },
    { q: 'How does an app ask the kernel to do something (like read a file)?', a: ['A system call', 'An email', 'It touches the disk itself', 'A screenshot'], c: 0, why: 'System calls are the only doors from user space into the kernel — e.g. read(), write(), openat().' },
    { q: 'Which of these runs on the Linux kernel?', a: ['Android phones', 'Most web servers', 'All top-500 supercomputers', 'All of these!'], c: 3, why: 'Linux is everywhere — phones (Android), servers, the cloud, routers, TVs and supercomputers.' },
    { q: 'Where do normal apps like your browser run?', a: ['Kernel space', 'User space', 'Inside the CPU fan', 'In the BIOS'], c: 1, why: 'Apps run in restricted user space (ring 3). Only the kernel runs in privileged kernel space (ring 0).' }
  ]);
})();
