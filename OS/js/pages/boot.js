/* Chapter 2 — Boot */
(function () {
  'use strict';
  var items = [
    { id: 'pw', icon: '⚡', label: 'Power on', c: 'yellow' },
    { id: 'fw', icon: '🧾', label: 'UEFI firmware', sub: 'POST check', c: 'orange' },
    { id: 'esp', icon: '💽', label: 'EFI partition', sub: '/boot/efi', c: 'teal' },
    { id: 'grub', icon: '🥾', label: 'GRUB', sub: 'boot menu', c: 'pink' },
    { id: 'kern', icon: '⚙️', label: 'Linux kernel', sub: 'vmlinuz', c: 'purple' },
    { id: 'initrd', icon: '🎒', label: 'initramfs', sub: 'tiny starter /', c: 'blue' },
    { id: 'root', icon: '🌳', label: 'Real root /', sub: 'switch_root', c: 'green' },
    { id: 'init', icon: '👑', label: 'systemd', sub: 'PID 1', c: 'yellow' },
    { id: 'svc', icon: '🧩', label: 'Services', sub: 'in parallel', c: 'orange' },
    { id: 'login', icon: '🙋', label: 'Login!', c: 'pink' }
  ];
  var spec = SK.chain(items, { cols: 5, mcols: 2, nw: 150, nh: 96, gx: 46, gy: 60, mnw: 170, mgx: 40, fs: 18 });
  var D = SK.diagram('#bootChain', spec);
  SK.flow(D, [
    { on: ['pw'], say: '👆 You press the power button. The power supply stabilizes and sends a "power good" signal. The CPU resets and starts running code at a fixed address in the firmware chip.' },
    { on: ['fw'], go: [['pw', 'fw', { c: 'yellow' }]], say: '🧾 <b>UEFI firmware</b> runs <b>POST</b> (Power-On Self-Test): checks RAM, CPU, and finds devices. Then it reads its list of boot entries (<code>efibootmgr</code> shows them).' },
    { on: ['esp'], go: [['fw', 'esp', { c: 'orange' }]], say: '💽 It opens the <b>EFI System Partition</b> — a small FAT32 partition — and runs the boot loader file stored there.', code: '/boot/efi/EFI/ubuntu/shimx64.efi → grubx64.efi' },
    { on: ['grub'], go: [['esp', 'grub', { c: 'teal' }]], say: '🥾 <b>GRUB</b> reads <code>/boot/grub/grub.cfg</code>, shows a menu (pick an OS or an older kernel), and loads the kernel + initramfs into RAM.' },
    { on: ['kern'], go: [['grub', 'kern', { c: 'pink', label: 'vmlinuz' }]], say: '⚙️ The <b>kernel</b> decompresses itself, sets up memory, interrupts, the scheduler, and wakes up all CPU cores. It detects hardware and prints messages you can later read with <code>dmesg</code>.' },
    { on: ['initrd'], go: [['kern', 'initrd', { c: 'purple' }]], say: '🎒 It runs <code>/init</code> from the <b>initramfs</b> — a tiny file system in RAM with the drivers needed to reach the real disk (NVMe, RAID, LVM, encryption…).' },
    { on: ['root'], go: [['initrd', 'root', { c: 'blue', label: 'mount' }]], say: '🌳 The real root file system is mounted and <b>switch_root</b> makes it the new <code>/</code>. The backpack is thrown away to free RAM.' },
    { on: ['init'], go: [['root', 'init', { c: 'green' }]], say: '👑 The kernel starts <b>/sbin/init → systemd</b> as <b>PID 1</b>. If PID 1 ever dies, the kernel panics — it\'s that important!' },
    { on: ['svc'], go: [['init', 'svc', { c: 'yellow' }]], say: '🧩 systemd reads its <b>unit files</b> and starts services <b>in parallel</b>, respecting dependencies: journald (logs), udev (devices), networking, SSH, the display manager…' },
    { on: ['login'], go: [['svc', 'login', { c: 'orange' }]], say: '🙋 The <b>login</b> screen (gdm) or text prompt (getty) appears. Total: usually 5–20 seconds.', code: '$ systemd-analyze\nStartup finished in 3.1s (firmware) + 1.2s (loader) + 2.4s (kernel) + 5.8s (userspace) = 12.5s' }
  ]);

  /* boot log */
  var LOG = [
    '[    0.000000] Linux version 6.8.0-45-generic (buildd@lcy02) (gcc 13.2.0)',
    '[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-6.8.0-45-generic root=UUID=3f2a ro',
    '[    0.000000] BIOS-provided physical RAM map:',
    '[    0.004211] efi: EFI v2.8 by American Megatrends',
    '[    0.012345] Memory: 16236544K/16683180K available',
    '[    0.051002] Kernel/User page tables isolation: enabled',
    '[    0.120440] smp: Bringing up secondary CPUs ...',
    '[    0.203112] smp: Brought up 1 node, 8 CPUs',
    '[    0.411009] PCI: Using configuration type 1 for base access',
    '[    0.904211] nvme nvme0: 8/0/0 default/read/poll queues',
    '[    0.912744]  nvme0n1: p1 p2',
    '[    1.102000] Freeing unused kernel image (initmem) memory: 4752K',
    '[    1.102310] Run /init as init process',
    '[    1.802211] EXT4-fs (nvme0n1p2): mounted filesystem with ordered data mode',
    '# --- switch_root: the real / is mounted. Hello systemd! ---',
    '[    2.390111] systemd[1]: systemd 255 running in system mode',
    '[    2.401023] systemd[1]: Hostname set to <sketchbook>.',
    '[  OK  ] Started Journal Service.',
    '[  OK  ] Started Rule-based Manager for Device Events (udev).',
    '[  OK  ] Mounted /boot/efi.',
    '[  OK  ] Reached target Local File Systems.',
    '[  OK  ] Started Network Manager.',
    '[  OK  ] Started OpenSSH server daemon.',
    '[  OK  ] Started GNOME Display Manager.',
    '[  OK  ] Reached target Graphical Interface.',
    '',
    'Ubuntu 24.04 LTS sketchbook tty1',
    'sketchbook login: _'
  ];
  var pre = document.getElementById('bootLog'), stop = null;
  function runLog() {
    if (stop) stop();
    stop = Core.typeTerm(pre, LOG, { lineDelay: 150 });
    // color the OK markers
    var iv = setInterval(function () {
      Array.prototype.forEach.call(pre.querySelectorAll('span.o'), function (s) {
        if (s.dataset.k) return; if (s.textContent.indexOf('[  OK  ]') === 0) { s.dataset.k = 1; s.innerHTML = '[<b style="color:#5cf0a8">  OK  </b>]' + Core.esc(s.textContent.slice(8)); }
      });
      if (pre.textContent.indexOf('login:') > -1) clearInterval(iv);
    }, 120);
  }
  document.getElementById('replayLog').addEventListener('click', runLog);
  Core.whenVisible(pre, runLog, '-80px');

  /* initramfs diagram */
  SK.diagram('#initD', {
    title: 'initramfs solves the key-locked-in-house problem', w: 420, h: 300, fs: 17,
    nodes: [
      { id: 'k', x: 20, y: 20, w: 150, h: 70, icon: '⚙️', label: 'kernel', c: 'purple' },
      { id: 'b', x: 250, y: 20, w: 150, h: 70, icon: '🎒', label: 'initramfs', sub: 'in RAM', c: 'blue' },
      { id: 'd', x: 20, y: 200, w: 150, h: 80, icon: '🔒', label: 'real disk', sub: 'needs nvme.ko', c: 'gray', shape: 'cyl' },
      { id: 'r', x: 250, y: 200, w: 150, h: 80, icon: '🌳', label: 'real root /', c: 'green' }
    ],
    edges: [{ from: 'k', to: 'd', label: 'can\'t read! 😢', dash: true, c: 'red' }, { from: 'k', to: 'b', label: 'run /init' }, { from: 'b', to: 'r', label: 'load driver, mount' }]
  });

  /* systemd units diagram */
  SK.diagram('#unitsD', {
    title: 'systemd dependency graph', w: 460, h: 420, fs: 15,
    nodes: [
      { id: 'g', x: 130, y: 10, w: 200, h: 50, label: 'graphical.target', c: 'yellow' },
      { id: 'gdm', x: 300, y: 92, w: 150, h: 46, label: 'gdm.service', c: 'pink' },
      { id: 'm', x: 110, y: 92, w: 170, h: 50, label: 'multi-user.target', c: 'yellow' },
      { id: 'ssh', x: 4, y: 180, w: 130, h: 46, label: 'ssh.service', c: 'blue' },
      { id: 'nm', x: 150, y: 180, w: 190, h: 46, label: 'NetworkManager', c: 'blue' },
      { id: 'cron', x: 350, y: 180, w: 104, h: 46, label: 'cron', c: 'blue' },
      { id: 'b', x: 130, y: 268, w: 190, h: 50, label: 'basic.target', c: 'yellow' },
      { id: 's', x: 30, y: 356, w: 180, h: 50, label: 'sysinit.target', c: 'yellow' },
      { id: 'j', x: 240, y: 356, w: 210, h: 50, label: 'journald + udev', c: 'green' }
    ],
    edges: [{ from: 'g', to: 'm' }, { from: 'g', to: 'gdm' }, { from: 'm', to: 'ssh' }, { from: 'm', to: 'nm' }, { from: 'm', to: 'cron' }, { from: 'm', to: 'b' }, { from: 'b', to: 's' }, { from: 's', to: 'j' }],
    texts: [{ x: 26, y: 330, t: 'arrows = "wants"', fs: 15, anchor: 'start', c: 'pink' }]
  });

  /* process family tree */
  SK.diagram('#pstreeD', {
    title: 'Linux process family tree', w: 860, h: 300, fs: 16, minw: true,
    nodes: [
      { id: 'k', x: 20, y: 120, w: 120, h: 60, icon: '⚙️', label: 'kernel', c: 'purple' },
      { id: 'p1', x: 190, y: 40, w: 130, h: 60, label: 'systemd', sub: 'PID 1', c: 'yellow' },
      { id: 'p2', x: 190, y: 200, w: 130, h: 60, label: 'kthreadd', sub: 'PID 2', c: 'purple' },
      { id: 'j', x: 380, y: 0, w: 130, h: 50, label: 'journald', c: 'green' },
      { id: 'nm', x: 380, y: 62, w: 130, h: 50, label: 'NetworkMgr', c: 'blue' },
      { id: 'gdm', x: 380, y: 124, w: 130, h: 50, label: 'gdm', c: 'pink' },
      { id: 'kw', x: 380, y: 210, w: 130, h: 50, label: 'kworker/0', sub: 'kernel thread', c: 'purple' },
      { id: 'sh', x: 560, y: 124, w: 120, h: 50, label: 'gnome-shell', c: 'pink' },
      { id: 'bash', x: 560, y: 200, w: 120, h: 50, label: 'bash', c: 'orange' },
      { id: 'ff', x: 720, y: 124, w: 120, h: 50, label: 'firefox', c: 'orange' },
      { id: 'ls', x: 720, y: 200, w: 120, h: 50, label: 'ls', c: 'orange' }
    ],
    edges: [{ from: 'k', to: 'p1' }, { from: 'k', to: 'p2' }, { from: 'p1', to: 'j' }, { from: 'p1', to: 'nm' }, { from: 'p1', to: 'gdm' }, { from: 'p2', to: 'kw' }, { from: 'gdm', to: 'sh' }, { from: 'sh', to: 'bash', curve: 0 }, { from: 'sh', to: 'ff' }, { from: 'bash', to: 'ls' }],
    texts: [{ x: 640, y: 290, t: 'every arrow = "is parent of"', fs: 16, c: 'pink' }]
  });

  OSLab.mount(document.getElementById('lab'), { scenarios: ['boot'] });

  Core.quiz('#quizBox', [
    { q: 'What runs FIRST when you press the power button?', a: ['systemd', 'The firmware (UEFI/BIOS)', 'GRUB', 'bash'], c: 1, why: 'The CPU starts executing the firmware stored in a chip on the motherboard. It tests hardware (POST) and finds a boot loader.' },
    { q: 'What does GRUB load into RAM?', a: ['Only your photos', 'The kernel (vmlinuz) and the initramfs', 'systemd services', 'The GPU driver only'], c: 1, why: 'GRUB loads /boot/vmlinuz-* (the kernel) and /boot/initrd.img-* (the initramfs) and passes the kernel command line.' },
    { q: 'Why does Linux need an initramfs?', a: ['To play a boot sound', 'It holds the drivers needed to reach the real root disk', 'It stores your passwords', 'It replaces the kernel'], c: 1, why: 'Chicken-and-egg: the disk driver lives on the disk. The initramfs is a tiny RAM file system with the tools to mount the real root.' },
    { q: 'What is PID 1 on most modern Linux systems?', a: ['systemd', 'Firefox', 'GRUB', 'kthreadd'], c: 0, why: 'The kernel starts /sbin/init (systemd) as PID 1 — the ancestor of every user process. (PID 2, kthreadd, parents kernel threads.)' },
    { q: 'A systemd "target" is…', a: ['A shooting game', 'A group of units describing a goal state, like graphical.target', 'A kernel module', 'A disk partition'], c: 1, why: 'Targets replace old runlevels: multi-user.target ≈ runlevel 3, graphical.target ≈ runlevel 5.' }
  ]);
})();
