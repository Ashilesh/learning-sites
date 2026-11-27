/* =========================================================
   OSLab — a hand-drawn-looking 3D Linux PC (three.js r147)
   OSLab.mount(element, { scenarios:['tour','boot',…] })
   Worlds: pc · cake · tree · ram · ctr
   ========================================================= */
(function () {
  'use strict';
  var T = window.THREE;
  var HEX = { pink: 0xff3d8b, yellow: 0xffbe0b, blue: 0x3a86ff, green: 0x00d68f, orange: 0xff7a1a, purple: 0x8338ec, red: 0xff3b5c, teal: 0x00c2e6, white: 0xffffff, gray: 0x9a98a8 };

  /* ------------------------------------------------------------------
     SCENARIOS — each is a story told with steps.
     step: { on:[parts to glow], lbl:[labels], cam:'preset'|[[pos],[target]],
             screen:{lines,type,keep}|{off:true}, go:[[from,to,{label,c,via}]],
             say:'html', code:'text', do:function(L){} }
     ------------------------------------------------------------------ */
  var SCN = {};
  var PC_LBL = ['cpu', 'ram', 'ssd', 'gpu', 'mon', 'kbd', 'nic', 'psu', 'uefi'];

  SCN.tour = {
    title: 'Tour the PC', icon: '🔍', world: 'pc', cam: 'over', lbl: PC_LBL,
    screen: { lines: ['## 🐧 Linux', '', '  Welcome to the OS Sketchbook!', '', '$ uname -o', 'GNU/Linux'] },
    intro: 'A real computer, sketched in 3D. Press <b>▶ Play</b> for a guided tour of every part — and who the boss is.',
    steps: [
      { cam: 'over', lbl: PC_LBL, say: 'This is a computer! 🖥️ The <b>hardware</b> is its body. <b>Linux</b> — the Operating System — is the manager that tells every part what to do. (Drag to spin it!)' },
      { on: ['cpu'], cam: 'cpu', say: '🧠 <b>CPU</b> — the thinker. It does billions of tiny steps per second, but each core runs only <i>one</i> thing at a time. Linux\'s <b>scheduler</b> makes programs take turns — super fast.', code: '$ nproc\n8', screen: { lines: ['$ nproc', '8', '$ lscpu | head -2', 'Architecture: x86_64', 'CPU(s):       8'], type: true } },
      { on: ['ram'], cam: 'ram', say: '🧮 <b>RAM</b> — the desk. Super fast but it forgets everything when the power goes off. Programs must be on the desk to run. Linux hands out desk space in <b>4 KB pages</b>.', code: '$ free -h', screen: { lines: ['$ free -h', '       total   used   free', 'Mem:    16Gi  4.1Gi  9.2Gi', 'Swap:   2.0Gi    0B  2.0Gi'], type: true } },
      { on: ['ssd'], cam: 'ssd', say: '📚 <b>SSD</b> — the bookshelf. Big and permanent, but slower than RAM. Your files, apps and Linux itself are stored here. Linux sees it as the file <code>/dev/nvme0n1</code>.', screen: { lines: ['$ lsblk', 'NAME        SIZE TYPE MOUNTPOINT', 'nvme0n1     512G disk', '├─nvme0n1p1   1G part /boot/efi', '└─nvme0n1p2 511G part /'], type: true } },
      { on: ['gpu', 'mon'], cam: 'desk', say: '🎨 <b>GPU + monitor</b> — the artist and its canvas. The GPU paints millions of pixels; Linux\'s graphics driver (DRM) lets apps use it.', go: [['gpu', 'mon', { c: 'yellow', label: 'pixels' }]] },
      { on: ['kbd'], cam: 'kbd', keys: 8, say: '⌨️ <b>Keyboard</b> — the ears. Every key press rings a doorbell called an <b>interrupt</b>, so the CPU stops for a moment and listens.', go: [['kbd', 'cpu', { c: 'pink', label: 'IRQ!' }]] },
      { on: ['nic'], cam: 'net', lbl: PC_LBL.concat(['cloud']), say: '📮 <b>Network card</b> — the mail carrier. It sends and receives little packets of data to and from the internet.', go: [['nic', 'cloud', { c: 'blue', label: 'packet' }], ['cloud', 'nic', { c: 'green', label: 'reply' }]] },
      { on: ['psu', 'uefi'], cam: 'case', say: '⚡ <b>Power supply</b> feeds everything. 🧾 The <b>UEFI firmware</b> chip holds tiny built-in software that wakes the hardware up and finds Linux on the SSD.' },
      { on: ['cpu', 'ram', 'ssd', 'gpu', 'nic', 'kbd', 'mon'], cam: 'over', say: 'So where is Linux? 🐧 It isn\'t one part — it\'s <b>software</b> loaded from the SSD into RAM, running on the CPU, and managing <i>all</i> of these. That is an Operating System!' }
    ]
  };

  SCN.cake = {
    title: 'Linux Layer Cake', icon: '🎂', world: 'cake', cam: 'cake', lbl: ['l_hw', 'l_kern', 'l_sys', 'l_lib', 'l_apps', 'l_you'],
    intro: 'Linux is built in <b>layers</b>, like a cake 🎂. Each layer only talks to the one right next to it. Press <b>▶ Play</b>.',
    reset: function (L) { L.cake.explode(0); L.cake.plane(false); },
    steps: [
      { cam: 'cake', do: function (L) { L.cake.explode(0); L.cake.plane(false); }, say: 'Here is the whole Linux system as a cake. 🎂 Bottom = hardware. Top = you! Let\'s pull the layers apart.' },
      { cam: 'cakeX', do: function (L) { L.cake.explode(1); }, on: ['hw'], lbl: ['l_hw', 'c_cpu', 'c_ram', 'c_ssd', 'c_nic', 'c_gpu'], say: '🔩 <b>Hardware</b>: CPU, RAM, SSD, network card, GPU. Powerful — but it only understands electrical signals and very simple commands.' },
      { cam: 'cakeX', do: function (L) { L.cake.explode(1); }, on: ['kern', 'k_sched', 'k_mm', 'k_vfs', 'k_net', 'k_drv', 'k_ipc'], lbl: ['l_kern', 'k_sched', 'k_mm', 'k_vfs', 'k_net', 'k_drv', 'k_ipc'], say: '⚙️ <b>The Linux kernel</b> — the boss. Its teams: <b>scheduler</b> (CPU turns), <b>memory manager</b>, <b>VFS</b> (files), <b>network stack</b>, <b>drivers</b> (talk to hardware), <b>IPC & security</b>.' },
      { cam: 'cakeX', do: function (L) { L.cake.explode(1); L.cake.plane(true); }, on: ['sys'], lbl: ['l_sys', 'l_plane'], say: '🚪 <b>System call interface</b> — the only doors into the kernel (about 450 of them: <code>read</code>, <code>write</code>, <code>fork</code>, <code>mmap</code>…). The red glass is the wall between <b>kernel space</b> and <b>user space</b>.' },
      { cam: 'cakeX', do: function (L) { L.cake.explode(1); L.cake.plane(true); }, on: ['lib'], lbl: ['l_lib', 'l_plane'], say: '📚 <b>Libraries</b> like <b>glibc</b> wrap the raw doors into friendly functions: your <code>printf()</code> eventually knocks on the <code>write()</code> door.' },
      { cam: 'cakeX', do: function (L) { L.cake.explode(1); L.cake.plane(true); }, on: ['a_bash', 'a_ff', 'a_py', 'a_docker', 'a_vim'], lbl: ['a_bash', 'a_ff', 'a_py', 'a_docker', 'a_vim', 'l_plane'], say: '🧩 <b>User space</b>: the shell (bash), Firefox, Python, Docker, Vim… They can\'t touch hardware directly — they must ask the kernel.' },
      { cam: 'cakeX', do: function (L) { L.cake.explode(1); L.cake.plane(true); }, on: ['a_ff', 'lib', 'sys', 'k_net', 'k_drv', 'c_nic'], lbl: ['a_ff', 'l_lib', 'l_sys', 'k_net', 'k_drv', 'c_nic'], go: [['a_ff', 'lib', { c: 'orange', label: 'send()' }], ['lib', 'sys', { c: 'orange', label: 'syscall' }], ['sys', 'k_net', { c: 'orange', label: 'TCP/IP' }], ['k_net', 'k_drv', { c: 'orange' }], ['k_drv', 'c_nic', { c: 'orange', label: 'packet' }]], say: 'Watch a request travel 🦊 Firefox → glibc → system call door → kernel network stack → driver → network card. Every layer does one job.' },
      { cam: 'cake', do: function (L) { L.cake.explode(0); L.cake.plane(false); }, on: ['you'], lbl: ['l_hw', 'l_kern', 'l_sys', 'l_lib', 'l_apps', 'l_you'], say: 'Put back together: <b>you → apps → libraries → system calls → kernel → hardware</b>. That\'s the whole idea of an Operating System in one cake! 🍰' }
    ]
  };

  SCN.boot = {
    title: 'Boot Linux', icon: '⏰', world: 'pc', cam: 'over', lbl: ['power', 'psu', 'uefi', 'cpu', 'ram', 'ssd'],
    screen: { off: true },
    intro: 'The computer is OFF. What happens between pressing the power button and seeing the login screen? Press <b>▶ Play</b>.',
    steps: [
      { on: ['power', 'psu'], cam: 'case', screen: { off: true }, go: [['power', 'psu', { c: 'yellow', label: '⚡ ON' }]], say: '👆 You press the power button. The power supply wakes up and checks that its voltages are stable.' },
      { on: ['psu', 'cpu', 'uefi'], cam: 'case', go: [['psu', 'cpu', { c: 'yellow', label: 'power good' }], ['cpu', 'uefi', { c: 'pink', label: 'reset vector' }]], say: 'The CPU wakes up with an empty head 🥱. It always starts at the same address — the <b>reset vector</b> — which points into the <b>UEFI firmware</b> chip.' },
      { on: ['uefi', 'ram', 'gpu', 'kbd'], cam: 'over', par: true, go: [['cpu', 'ram', { c: 'green', label: 'test' }], ['cpu', 'gpu', { c: 'green', label: 'test' }], ['cpu', 'kbd', { c: 'green', label: 'test' }]], screen: { lines: ['## UEFI', '', 'POST: CPU ........ OK', 'POST: Memory 16 GB OK', 'POST: Keyboard ... OK', 'Press F2 for Setup'], type: true }, say: '🩺 Firmware runs <b>POST</b> (Power-On Self-Test): is RAM OK? Graphics? Keyboard? Then it looks for a boot disk.' },
      { on: ['ssd', 'ram'], cam: 'case', go: [['ssd', 'ram', { c: 'blue', label: 'grubx64.efi' }]], screen: { lines: ['        GNU GRUB  version 2.12', '', '* Ubuntu', '  Advanced options for Ubuntu', '  UEFI Firmware Settings'], type: false }, say: 'UEFI reads the <b>EFI System Partition</b> (<code>/boot/efi</code>) and starts the boot loader <b>GRUB</b>. GRUB shows a menu: which OS do you want?', code: '/boot/efi/EFI/ubuntu/grubx64.efi' },
      { on: ['ssd', 'ram'], cam: 'case', go: [['ssd', 'ram', { c: 'purple', label: 'vmlinuz' }], ['ssd', 'ram', { c: 'teal', label: 'initrd.img' }]], screen: { lines: ['Loading Linux 6.8.0-45-generic ...', 'Loading initial ramdisk ...'], type: true }, say: 'GRUB copies two files into RAM: the <b>kernel</b> (<code>/boot/vmlinuz</code>) and a tiny starter file system, the <b>initramfs</b> (<code>/boot/initrd.img</code>).' },
      { on: ['cpu', 'ram'], cam: 'cpu', screen: { lines: ['[    0.000000] Linux version 6.8.0-45-generic', '[    0.000000] Command line: root=UUID=3f2a… ro quiet', '[    0.012345] Memory: 16236544K available', '[    0.203112] smpboot: Allowing 8 CPUs', '[    0.904211] nvme nvme0: 8/0/0 default queues', '[    1.102000] Freeing unused kernel memory'], type: true }, say: '⚙️ The CPU jumps into the kernel. Linux unpacks itself, sets up memory and page tables, starts all CPU cores and detects hardware. (You can read this later with <code>dmesg</code>.)' },
      { on: ['ram', 'ssd'], cam: 'case', go: [['ram', 'ssd', { c: 'teal', label: 'find root /' }], ['ssd', 'ram', { c: 'teal', label: 'mount' }]], screen: { lines: ['Begin: Loading essential drivers ... done.', 'Begin: Mounting root file system ... done.', 'switch_root: moving to the real / '], type: true, keep: true }, say: 'The initramfs loads the drivers needed to reach the real disk, mounts the real root file system <code>/</code>, then hands over with <code>switch_root</code>.' },
      { on: ['cpu'], cam: 'desk', screen: { lines: ['Welcome to Ubuntu 24.04 LTS!', '[  OK  ] Reached target Local File Systems.', '[  OK  ] Started Journal Service.', '[  OK  ] Started udev Kernel Device Manager.'], type: true }, say: '👑 The kernel starts the very first program: <b>/sbin/init = systemd</b>, with <b>PID 1</b>. Every other program is its child or grandchild.', code: '$ ps -p 1 -o pid,comm\n  PID COMMAND\n    1 systemd' },
      { on: ['nic', 'gpu', 'cpu'], cam: 'over', par: true, go: [['cpu', 'nic', { c: 'blue', label: 'network' }], ['cpu', 'gpu', { c: 'pink', label: 'display' }]], screen: { lines: ['[  OK  ] Started Network Manager.', '[  OK  ] Started OpenSSH server.', '[  OK  ] Started GNOME Display Manager.', '[  OK  ] Reached target Graphical Interface.'], type: true, keep: true }, say: 'systemd starts services <b>in parallel</b> (that\'s why modern Linux boots fast): networking, logging, SSH, the login screen…' },
      { on: ['mon'], cam: 'mon', screen: { lines: ['Ubuntu 24.04 LTS sketchbook tty1', '', 'sketchbook login: _'], type: true }, say: '🎉 Login prompt! From power button to here usually takes a few seconds. Ask Linux exactly how long:', code: '$ systemd-analyze\nStartup finished in 3.1s (firmware) + 1.2s (loader) + 2.4s (kernel) + 5.8s (userspace)' }
    ]
  };

  SCN.run = {
    title: 'Run a Command', icon: '▶️', world: 'pc', cam: 'desk', lbl: ['cpu', 'ram', 'ssd', 'gpu', 'mon', 'kbd'],
    screen: { lines: ['kid@sketchbook:~$ _'] },
    intro: 'You type <code>ls</code> and press Enter. A dozen things happen in about 2 milliseconds! Press <b>▶ Play</b> to slow it down.',
    steps: [
      { on: ['kbd'], cam: 'kbd', keys: 2, go: [['kbd', 'cpu', { c: 'pink', label: 'IRQ 1' }]], screen: { lines: ['$ ls'], type: true }, say: 'You press <kbd>l</kbd> and <kbd>s</kbd>. Each press sends an <b>interrupt</b> to the CPU: "Hey! A key was pressed!"' },
      { on: ['cpu', 'ram'], cam: 'case', go: [['cpu', 'ram', { c: 'yellow', label: '"ls"' }]], say: 'The kernel\'s keyboard driver turns the signal into letters and gives them to the terminal. <b>bash</b> — the shell, a program waiting for your commands — reads them.' },
      { on: ['cpu', 'ram'], cam: 'ram', keys: 1, go: [['cpu', 'ram', { c: 'green', label: 'fork()' }]], say: 'You press <kbd>Enter</kbd>. bash calls <b>fork()</b>: the kernel makes a copy of bash — a new <b>child process</b> with its own PID. (Memory is shared copy-on-write, so it\'s cheap!)' },
      { on: ['ssd', 'ram'], cam: 'case', go: [['ssd', 'ram', { c: 'blue', label: '/usr/bin/ls' }]], say: 'The child calls <b>execve("/usr/bin/ls")</b>. The kernel throws away the bash copy and maps the <code>ls</code> program from the SSD into memory — only the pages it really needs (<b>demand paging</b>).' },
      { on: ['cpu'], cam: 'cpu', go: [['cpu', 'ram', { c: 'purple', label: 'getdents64()' }], ['ram', 'cpu', { c: 'purple', label: 'file names' }]], say: 'The <b>scheduler</b> gives <code>ls</code> a turn on a CPU core. <code>ls</code> asks the kernel for the folder\'s contents with the <b>getdents64()</b> system call (answered from the cache in RAM).' },
      { on: ['gpu', 'mon'], cam: 'desk', go: [['cpu', 'gpu', { c: 'orange', label: 'write(1, …)' }], ['gpu', 'mon', { c: 'orange', label: 'pixels' }]], screen: { lines: ['$ ls', 'Desktop  Documents  Music  games  notes.txt'], type: false }, say: '<code>ls</code> calls <b>write(1, …)</b> — "print to my standard output". The kernel passes the text to the terminal, the GPU paints it, and you see it! 👀' },
      { on: ['cpu', 'ram'], cam: 'desk', screen: { lines: ['$ ls', 'Desktop  Documents  Music  games  notes.txt', 'kid@sketchbook:~$ _'] }, say: '<code>ls</code> finishes with <b>exit(0)</b>. The kernel frees its memory; bash (the parent) collects the exit code with <b>wait()</b>. Prompt is back — total time ≈ 2 ms.', code: '$ strace -f -e trace=execve,write,exit_group ls' }
    ]
  };

  SCN.files = {
    title: 'Everything is a File', icon: '📄', world: 'pc', cam: 'over', lbl: ['f_kbd', 'f_ssd', 'f_cpu', 'f_ram', 'f_nic', 'f_gpu', 'f_mon', 'f_uefi', 'f_psu'],
    screen: { lines: ['$ ls /dev | head -5', 'autofs', 'block', 'bus', 'char', 'console'] },
    intro: 'In Linux, almost every part of the computer shows up as a <b>file</b> you can read or write. The green tags are the real file names! Press <b>▶ Play</b>.',
    steps: [
      { cam: 'over', say: '🏷️ Every green tag is a real Linux path. Hardware, live system info, even running programs — Linux shows them as files, so the same simple tools work on everything.' },
      { on: ['kbd', 'f_kbd'], cam: 'kbd', keys: 4, screen: { lines: ['$ sudo cat /dev/input/event3 | xxd | head -2', '00000000: 1a2b 6665 0000 0000 0400 0400 1e00 0700', '00000010: 1a2b 6665 0000 0000 0100 1e00 0100 0000'], type: true }, say: '⌨️ The keyboard is <code>/dev/input/event3</code>. Read it and you get raw key events, as bytes. (That\'s exactly how your desktop reads keys!)' },
      { on: ['ssd', 'f_ssd'], cam: 'ssd', screen: { lines: ['$ ls -l /dev/nvme0n1', 'brw-rw---- 1 root disk 259, 0 nvme0n1', '# "b" = block device: read/write in chunks'], type: true }, say: '💾 <code>/dev/nvme0n1</code> is the <b>whole SSD</b> as one giant file. The <code>b</code> means <i>block device</i>. Tools like <code>dd</code> can copy it byte by byte.' },
      { on: ['cpu', 'f_cpu'], cam: 'cpu', screen: { lines: ['$ grep -m1 "model name" /proc/cpuinfo', 'model name : AMD Ryzen 7 7840U', '$ cat /proc/loadavg', '0.42 0.35 0.30 1/823 48211'], type: true }, say: '🧠 <code>/proc/cpuinfo</code> isn\'t stored anywhere! <code>/proc</code> is a <b>pretend</b> file system — the kernel writes the answer the moment you read it.' },
      { on: ['ram', 'f_ram'], cam: 'ram', screen: { lines: ['$ head -3 /proc/meminfo', 'MemTotal:  16236544 kB', 'MemFree:    9653212 kB', 'MemAvailable: 12900120 kB'], type: true }, say: '🧮 <code>/proc/meminfo</code> = live memory numbers. Tools like <code>free</code> and <code>top</code> just read these files and format them nicely.' },
      { on: ['nic', 'f_nic'], cam: 'case', screen: { lines: ['$ cat /sys/class/net/eth0/address', '3c:7c:3f:1a:2b:9e', '$ cat /sys/class/net/eth0/speed', '1000'], type: true }, say: '📮 The network card lives in <code>/sys/class/net/eth0/</code> — a folder of tiny files (MAC address, speed, statistics…). <code>/sys</code> is the kernel\'s hardware control panel.' },
      { on: ['gpu', 'mon', 'f_gpu', 'f_mon'], cam: 'desk', screen: { lines: ['$ ls /dev/dri', 'card0  renderD128', '$ echo "hi!" > /dev/tty1', 'hi!'], type: true }, say: '🎨 The GPU is <code>/dev/dri/card0</code>. The text console is <code>/dev/tty1</code> — <i>writing</i> to that file puts letters on the screen!' },
      { on: ['psu', 'f_psu', 'uefi', 'f_uefi'], cam: 'case', screen: { lines: ['$ cat /sys/class/power_supply/BAT0/capacity', '87', '$ ls /sys/firmware/efi', 'efivars  esrt  runtime  systab'], type: true }, say: '🔋 Battery level? A file. Firmware settings? Files. Even special helpers: <code>/dev/null</code> (black hole 🕳️) and <code>/dev/urandom</code> (endless random bytes 🎲).' },
      { on: ['kbd', 'ssd', 'cpu', 'ram', 'nic', 'gpu', 'mon'], cam: 'over', say: 'One idea, everywhere: <b>open → read/write → close</b>. That\'s the Unix superpower. Small tools like <code>cat</code>, <code>echo</code>, <code>grep</code> work on <i>everything</i>. 🐧' }
    ]
  };

  SCN.tree = {
    title: 'Linux Folder Tree', icon: '🌳', world: 'tree', cam: 'tree', lbl: 'dirs',
    intro: 'Everything in Linux hangs from ONE root: <code>/</code>. No C: or D: drives — just one big tree 🌳. Press <b>▶ Play</b> to tour it.',
    steps: [
      { cam: 'tree', on: ['d_root'], lbl: 'dirs', say: '🌳 This is the Linux folder tree. It starts at <b>/</b> (called "root"). Every file, disk, USB stick and device hangs somewhere below it.' },
      { on: ['d_bin', 'd_usr', 'd_lib', 'd_opt'], lbl: ['d_root', 'd_bin', 'd_usr', 'd_lib', 'd_opt', 'g_usr_bin', 'g_usr_lib', 'g_usr_share'], say: '🧰 <b>Programs</b>: <code>/usr/bin</code> (and <code>/bin</code>) hold commands like <code>ls</code>; <code>/usr/lib</code> & <code>/lib</code> hold shared libraries; <code>/opt</code> is for extra add-on apps.' },
      { on: ['d_etc'], lbl: ['d_root', 'd_etc', 'g_passwd', 'g_hostname', 'g_fstab'], say: '⚙️ <b>/etc</b> = the settings drawer. Plain text config files: <code>/etc/hostname</code> (computer\'s name), <code>/etc/passwd</code> (users), <code>/etc/fstab</code> (which disks to mount).' },
      { on: ['d_home', 'd_root_home'], lbl: ['d_root', 'd_home', 'd_root_home', 'g_alice', 'g_bob'], say: '🛏️ <b>/home</b> = bedrooms. Each user gets one: <code>/home/alice</code>, <code>/home/bob</code>. The boss (root user) sleeps in <code>/root</code>.' },
      { on: ['d_dev', 'd_proc', 'd_sys'], lbl: ['d_root', 'd_dev', 'd_proc', 'd_sys', 'g_sda', 'g_null', 'g_tty', 'g_p1', 'g_cpuinfo', 'g_meminfo', 'g_class', 'g_block'], say: '✨ <b>Magic folders</b> — not on the disk at all! <code>/dev</code> = devices, <code>/proc</code> = running processes & kernel info, <code>/sys</code> = hardware settings. The kernel invents them live.' },
      { on: ['d_var', 'd_tmp', 'd_run'], lbl: ['d_root', 'd_var', 'd_tmp', 'd_run', 'g_log', 'g_cache'], say: '📓 <b>Changing stuff</b>: <code>/var/log</code> is the system\'s diary, <code>/var/cache</code> keeps downloads; <code>/tmp</code> is scrap paper (cleared on reboot); <code>/run</code> holds notes about what\'s running now.' },
      { on: ['d_boot'], lbl: ['d_root', 'd_boot', 'g_vmlinuz', 'g_grub'], say: '⏰ <b>/boot</b> = the alarm clock: the kernel (<code>vmlinuz</code>), initramfs and GRUB boot loader files.' },
      { on: ['d_mnt', 'd_media', 'd_srv'], lbl: ['d_root', 'd_mnt', 'd_media', 'd_srv'], say: '🔌 <b>/media</b> & <b>/mnt</b> = parking spots where USB sticks and extra disks get attached ("mounted"). <code>/srv</code> holds files a server shares (websites…).' },
      { cam: 'tree', lbl: 'dirs', say: 'Tip: this layout is a standard called the <b>FHS</b> (Filesystem Hierarchy Standard), so every Linux distro feels familiar. Try <code>ls /</code> in the Playground chapter! 🐧' }
    ]
  };

  SCN.ram = {
    title: 'RAM & Paging', icon: '🧮', world: 'ram', cam: 'ram', lbl: ['r_title', 'r_ssd', 'r_legend'],
    intro: 'RAM is chopped into equal boxes called <b>page frames</b> (4 KB each). Watch how Linux hands them out, shares them, and rescues itself when they run out. Press <b>▶ Play</b>.',
    reset: function (L) { L.ramSet(0, false); },
    steps: [
      { cam: 'ram', do: function (L) { L.ramSet(0); }, say: '🧮 Each little box is a <b>page frame</b> — 4 KB of RAM. The purple ones belong to the <b>kernel</b> itself (its code and data). The white ones are free.' },
      { do: function (L) { L.ramSet(1); }, lbl: ['r_title', 'r_A', 'r_ssd', 'r_legend'], say: '🦊 Process <b>A</b> starts. It thinks it has neat, continuous memory (its <b>virtual pages</b>, left). Really, Linux puts them in <i>scattered</i> frames. The <b>page table</b> (the lines) maps one to the other.' },
      { do: function (L) { L.ramSet(2); }, lbl: ['r_title', 'r_A', 'r_B', 'r_ssd', 'r_legend'], say: '🎵 Process <b>B</b> starts. It uses the <i>same</i> virtual addresses as A — but maps to <i>different</i> frames. So A can never peek into B\'s memory. That\'s <b>isolation</b>! 🔒' },
      { do: function (L) { L.ramSet(3); }, lbl: ['r_title', 'r_A', 'r_B', 'r_ssd', 'r_legend', 'r_shared'], say: '🤝 Both use the C library (libc). Linux loads it <b>once</b> and maps the same green frame into both processes. Shared pages save tons of RAM.' },
      { do: function (L) { L.ramSet(4); }, lbl: ['r_title', 'r_A', 'r_B', 'r_ssd', 'r_legend'], go: [['r_ssd', 'r_f10', { c: 'teal', label: 'file pages' }]], say: '📄 A reads a big file. Linux keeps copies of the file\'s pages in free RAM — the <b>page cache</b> (teal). Next read = instant. Free RAM is wasted RAM!' },
      { do: function (L) { L.ramSet(5); }, lbl: ['r_title', 'r_A', 'r_B', 'r_C', 'r_ssd', 'r_legend'], say: '🎮 A hungry game <b>C</b> starts and grabs lots of frames. Linux gives memory <i>lazily</i>: a frame is only handed out when C first touches a page (a <b>page fault</b>).' },
      { do: function (L) { L.ramSet(6); }, lbl: ['r_title', 'r_A', 'r_B', 'r_C', 'r_ssd', 'r_legend'], say: '😰 RAM is almost full! The kernel thread <b>kswapd</b> wakes up and first drops <b>page cache</b> — those pages are just copies of files, so they can be re-read later.' },
      { do: function (L) { L.ramSet(7); }, lbl: ['r_title', 'r_A', 'r_B', 'r_C', 'r_ssd', 'r_legend', 'r_swap'], go: [['r_f17', 'r_swap0', { c: 'pink', label: 'swap out' }], ['r_f30', 'r_swap1', { c: 'pink', label: 'swap out' }]], say: '💤 Still not enough. A\'s <b>cold</b> (unused) pages get written to <b>swap</b> on the SSD, and their frames go to C. If A touches them later → page fault → swapped back in (slow 🐢).' },
      { do: function (L) { L.ramSet(8); }, lbl: ['r_title', 'r_A', 'r_B', 'r_ssd', 'r_legend', 'r_oom'], say: '💥 C wants even more and swap is full. Last resort: the <b>OOM killer</b> (Out-Of-Memory) picks the process with the highest <code>oom_score</code> — the greedy game — and kills it. All its frames are free again.', code: '$ dmesg | grep -i oom\nOut of memory: Killed process 4242 (game) total-vm:9.1G' },
      { do: function (L) { L.ramSet(9); }, lbl: ['r_title', 'r_A', 'r_B', 'r_ssd', 'r_legend'], say: '✅ Balance restored. Summary: <b>virtual memory</b> gives each process its own private map; Linux shares, caches, swaps and — only if it must — kills.', code: '$ free -h\n       total  used  free  buff/cache  available\nMem:    16Gi  5.0Gi 6.1Gi    4.9Gi      10Gi\nSwap:  2.0Gi  210Mi 1.8Gi' }
    ]
  };

  SCN.save = {
    title: 'Save a File', icon: '💾', world: 'pc', cam: 'desk', lbl: ['cpu', 'ram', 'ssd', 'kbd'],
    screen: { lines: ['  notes.txt — nano', '', ' Remember: the kernel', ' is the boss 🐧', '', '^S Save   ^X Exit'] },
    intro: 'You press <kbd>Ctrl</kbd>+<kbd>S</kbd>. Does your file go straight to the disk? Surprise: not right away! Press <b>▶ Play</b>.',
    steps: [
      { on: ['kbd'], cam: 'kbd', keys: 2, go: [['kbd', 'cpu', { c: 'pink', label: 'Ctrl+S' }]], say: 'You press <kbd>Ctrl</kbd>+<kbd>S</kbd>. The editor calls the system call <b>write(fd, data)</b> — "please put these bytes into my open file".' },
      { on: ['cpu'], cam: 'cpu', say: 'The kernel\'s <b>VFS</b> (Virtual File System) checks: which file system owns this file? <b>ext4</b>. VFS is a universal adapter — the same <code>write()</code> works for ext4, btrfs, USB sticks, even network drives.' },
      { on: ['ram'], cam: 'ram', go: [['cpu', 'ram', { c: 'yellow', label: 'dirty page' }]], say: 'ext4 copies your words into the <b>page cache</b> in RAM and marks that page <b>dirty</b> (changed, not on disk yet). <code>write()</code> returns immediately — that\'s why saving feels instant! ⚡' },
      { on: ['ram', 'ssd'], cam: 'case', say: '⏲️ Kernel <b>flusher threads</b> wake up every ~5 s and write out pages that have been dirty for ~30 s (or sooner if lots of RAM is dirty).', code: '$ sysctl vm.dirty_expire_centisecs\nvm.dirty_expire_centisecs = 3000' },
      { on: ['ram', 'ssd'], cam: 'case', go: [['ram', 'ssd', { c: 'purple', label: 'journal' }]], say: '📒 ext4 first writes a note in its <b>journal</b> ("I\'m about to change these blocks"). If the power dies halfway, Linux replays the journal at boot — no broken file system.' },
      { on: ['ram', 'ssd'], cam: 'case', go: [['ram', 'ssd', { c: 'green', label: 'DMA' }]], say: 'The <b>NVMe driver</b> tells the SSD: "copy these pages from RAM yourself" — that\'s <b>DMA</b> (Direct Memory Access). The CPU is free to do other work meanwhile.' },
      { on: ['ssd'], cam: 'ssd', say: '🎉 Your file is safely on flash memory. Programs that can\'t risk losing data (databases, package managers) call <b>fsync()</b> to wait until it\'s really on disk.', code: '$ sync   # flush ALL dirty pages now' }
    ]
  };

  SCN.net = {
    title: 'Network Request', icon: '🌐', world: 'pc', cam: 'net', lbl: ['cpu', 'ram', 'nic', 'cloud'],
    screen: { lines: ['kid@sketchbook:~$ _'] },
    intro: 'You run <code>curl https://example.com</code>. How does a web page travel into your computer? Press <b>▶ Play</b>.',
    steps: [
      { on: ['cpu'], cam: 'desk', screen: { lines: ['$ curl https://example.com'], type: true }, say: 'curl asks the kernel for a <b>socket</b> — a network "phone line" that looks like a file descriptor (yes, a file again!).', code: 'socket(AF_INET, SOCK_STREAM, 0) = 3' },
      { on: ['nic', 'cloud'], cam: 'net', go: [['cpu', 'nic', { c: 'yellow', label: 'DNS?' }], ['nic', 'cloud', { c: 'yellow', label: 'example.com?' }], ['cloud', 'nic', { c: 'green', label: '93.184.215.14' }]], say: '📖 First, <b>DNS</b>: "What\'s the number (IP address) for example.com?" — like looking up a phone number.' },
      { on: ['nic', 'cloud'], cam: 'net', go: [['nic', 'cloud', { c: 'blue', label: 'SYN' }], ['cloud', 'nic', { c: 'blue', label: 'SYN-ACK' }], ['nic', 'cloud', { c: 'blue', label: 'ACK' }]], say: '🤝 The kernel\'s <b>TCP</b> code does a 3-way handshake: "Hi?" — "Hi, I hear you!" — "Great, let\'s talk." Now there\'s a reliable connection.' },
      { on: ['ram', 'nic'], cam: 'net', go: [['ram', 'nic', { c: 'orange', label: 'GET /' }], ['nic', 'cloud', { c: 'orange', label: '📦 frame' }]], say: '✉️ curl calls <b>send()</b>. The kernel wraps the request like envelopes in envelopes: <b>HTTP</b> inside <b>TCP</b> inside <b>IP</b> inside an <b>Ethernet frame</b>. The NIC grabs it from RAM by DMA.' },
      { on: ['nic', 'ram'], cam: 'case', go: [['cloud', 'nic', { c: 'green', label: '<html>' }], ['nic', 'ram', { c: 'green', label: 'DMA + IRQ' }]], say: '📬 The reply arrives. The NIC copies it into RAM and rings an interrupt. When traffic is heavy, Linux switches to polling (<b>NAPI</b>) so it isn\'t interrupted a million times a second.' },
      { on: ['cpu', 'gpu', 'mon'], cam: 'desk', go: [['ram', 'cpu', { c: 'green', label: 'recv()' }], ['cpu', 'gpu', { c: 'green' }], ['gpu', 'mon', { c: 'green' }]], screen: { lines: ['$ curl https://example.com', '<!doctype html>', '<html><head><title>Example Domain</title>', '...'], type: false }, say: 'The kernel unwraps the envelopes, puts the data in the socket\'s receive buffer, and wakes curl, whose <b>recv()</b> returns the page. 🎉', code: '$ ss -tnp   # list TCP connections and their programs' }
    ]
  };

  SCN.containers = {
    title: 'Containers', icon: '📦', world: 'ctr', cam: 'ctr', lbl: ['x_hw', 'x_kern', 'x_web', 'x_api', 'x_db'],
    intro: 'Three Docker containers on one Linux machine. Are they tiny computers? <b>No!</b> Press <b>▶ Play</b> to see what they really are.',
    reset: function (L) { L.ctr.set({}); },
    steps: [
      { cam: 'ctr', do: function (L) { L.ctr.set({}); }, lbl: ['x_hw', 'x_kern', 'x_web', 'x_api', 'x_db'], say: '📦 Three containers: <b>web</b> (nginx), <b>api</b> (python), <b>db</b> (postgres). They all sit on <b>ONE shared Linux kernel</b>. No extra operating systems inside!' },
      { cam: 'ctr', do: function (L) { L.ctr.set({ glass: .04, hostPids: true }); }, lbl: ['x_kern', 'p_w1', 'p_w2', 'p_w3', 'p_a1', 'p_a2', 'p_d1', 'p_d2', 'p_d3'], say: '👀 Take away the walls: from the host, containers are just <b>normal processes</b> with normal PIDs (<code>ps aux</code> shows them!). A container is a process wearing blindfolds and a leash.' },
      { cam: 'ctrWeb', do: function (L) { L.ctr.set({ ns: true }); }, on: ['c_web'], lbl: ['x_web', 'n_pid', 'n_net', 'n_mnt', 'n_uts', 'p_w1', 'p_w2', 'p_w3', 'xk_ns'], say: '🙈 The blindfolds are <b>namespaces</b>. Inside <i>web</i>: its own PID list (nginx thinks it is <b>PID 1</b>!), its own network card, its own <code>/</code> files, its own hostname. It can\'t see the others.' },
      { cam: 'ctr', do: function (L) { L.ctr.set({ cg: true }); L.ctr.oom(); }, lbl: ['x_web', 'x_api', 'x_db', 'm_web', 'm_api', 'm_db', 'xk_cg'], say: '🦮 The leash is <b>cgroups</b>: limits on CPU, memory, disk I/O and process count. Watch <b>db</b> go over its memory limit — the kernel\'s OOM killer stops it <i>inside that container only</i>. The others don\'t notice.', code: '$ docker run --memory=512m --cpus=0.5 postgres' },
      { cam: 'ctrLow', do: function (L) { L.ctr.set({ layers: true }); }, lbl: ['ly_base', 'ly_mid', 'ly_top', 'ly_rw', 'xk_ovl'], say: '🥞 Each container\'s files come from <b>image layers</b> — read-only sheets stacked with <b>OverlayFS</b>. The yellow top sheet is the container\'s own writable layer. Same base layer? Stored only once on disk!' },
      { cam: 'ctr', do: function (L) { L.ctr.set({ net: true }); }, lbl: ['x_web', 'x_api', 'x_db', 'x_bridge'], go: [['c_web', 'k_bridge', { c: 'blue', label: 'veth' }], ['k_bridge', 'c_api', { c: 'blue', label: 'GET /users' }], ['c_api', 'k_bridge', { c: 'teal' }], ['k_bridge', 'c_db', { c: 'teal', label: 'SQL' }]], say: '🔌 Each network namespace gets a virtual cable (<b>veth pair</b>) plugged into the <b>docker0 bridge</b> in the kernel. Containers talk through it; NAT rules let them reach the internet.' },
      { cam: 'ctrRun', do: function (L) { L.ctr.set({ hideApi: true }); }, lbl: ['x_cli', 'x_dockerd', 'x_containerd', 'x_runc', 'x_kern'], go: [['d_cli', 'd_dockerd', { c: 'yellow', label: 'docker run' }], ['d_dockerd', 'd_containerd', { c: 'yellow', label: 'gRPC' }], ['d_containerd', 'd_runc', { c: 'yellow', label: 'OCI spec' }], ['d_runc', 'xkern', { c: 'pink', label: 'clone()' }]], say: '🚀 <code>docker run</code>: CLI → <b>dockerd</b> → <b>containerd</b> → <b>runc</b>, which asks the kernel: <code>clone()</code> with new namespaces, put it in a cgroup, switch root to the overlay…' },
      { cam: 'ctr', do: function (L) { L.ctr.set({ growApi: true }); }, on: ['c_api'], lbl: ['x_api', 'x_kern', 'p_a1', 'p_a2'], say: '✨ …and <code>execve()</code> your app. The container exists! It started in milliseconds because there\'s <b>no OS to boot</b> — just a fenced-in process. 🐳' }
    ]
  };


  SCN.fetch = {
    title: 'Fetch an Instruction', icon: '🔁', world: 'pc', cam: 'case', lbl: ['cpu', 'ram', 'ssd', 'c_cache', 'c_pc'],
    screen: { lines: ['$ ls'] },
    intro: 'How does one machine-code instruction travel from the SSD into the CPU — and where is the OS in all this? Press <b>▶ Play</b>.',
    steps: [
      { on: ['ssd'], cam: 'ssd', screen: { lines: ['$ readelf -h /usr/bin/ls | grep Entry', '  Entry point address:  0x6ab0'], type: true }, say: '💾 The program <code>ls</code> is an <b>ELF file</b> on the SSD: machine-code bytes plus a header that says "start at 0x6ab0".' },
      { on: ['cpu', 'ram'], cam: 'case', lbl: ['cpu', 'ram', 'c_pc'], go: [['cpu', 'ram', { c: 'purple', label: 'execve()' }]], say: '🧬 <b>execve()</b>: Linux copies no code yet! It writes page-table notes ("these addresses = that file"), puts 0x6ab0 into the CPU\'s <b>program counter (RIP)</b> and switches to user mode.' },
      { on: ['cpu'], cam: 'cpu', lbl: ['cpu', 'c_pc'], say: '🔎 The CPU tries to <b>fetch</b> the instruction at RIP. TLB miss → page-table walk → <b>not present</b> → 💥 <b>page fault</b>! The CPU jumps into the kernel.' },
      { on: ['ssd', 'ram'], cam: 'case', go: [['ssd', 'ram', { c: 'blue', label: '4 KB code page' }]], say: '📥 The kernel\'s page-fault handler reads that 4 KB of code from the SSD into RAM (the page cache), maps it, and returns. The CPU <b>retries</b> the fetch.' },
      { on: ['ram', 'cpu'], cam: 'cpu', lbl: ['cpu', 'ram', 'c_cache'], go: [['ram', 'cpu', { c: 'teal', label: '64-byte line' }]], say: '⚡ Now it works: a <b>64-byte cache line</b> flows from RAM → L3 → L2 → <b>L1 instruction cache</b>. The next ~15 instructions came along for free.' },
      { on: ['cpu'], cam: 'cpu', lbl: ['cpu', 'c_dec'], say: '🧩 <b>Decode</b>: bytes like <code>f3 0f 1e fa</code> become micro-ops. ⚙️ <b>Execute</b>: the ALUs do the work and RIP moves on. Fetch → decode → execute, billions of times a second — the OS isn\'t involved at all!' },
      { on: ['cpu', 'uefi'], cam: 'case', lbl: ['cpu', 'c_timer'], go: [['uefi', 'cpu', { c: 'red', label: '⏰ timer IRQ' }]], say: '⏰ A few milliseconds later a <b>timer interrupt</b> yanks the CPU into the kernel, so the scheduler can decide who runs next. Timer, system calls, faults and device interrupts are the <b>only</b> ways the OS gets control back.' },
      { on: ['cpu', 'gpu', 'mon'], cam: 'desk', go: [['cpu', 'gpu', { c: 'orange', label: 'write()' }], ['gpu', 'mon', { c: 'orange' }]], screen: { lines: ['$ ls', 'Desktop  Documents  Music  games  notes.txt'] }, say: '🎉 <code>ls</code> finishes its job (with a <code>write()</code> system call to print). Every one of those steps started with a <b>fetch</b>.' }
    ]
  };

  SCN.vram = {
    title: 'RAM vs VRAM', icon: '🎨', world: 'pc', cam: 'case', lbl: ['ram', 'vram', 'gpu', 'ssd'],
    screen: { lines: ['$ glxinfo -B | grep -i "video memory"', '    Dedicated video memory: 8192 MB'] },
    intro: 'Your PC has two kinds of fast memory: <b>RAM</b> for the CPU and <b>VRAM</b> on the graphics card for the GPU. How do pictures get from one to the other? Press <b>▶ Play</b>.',
    steps: [
      { on: ['ram', 'vram'], cam: 'case', lbl: ['ram', 'vram', 'gpu'], say: '🧮 <b>RAM</b> (on the motherboard) is for the CPU. 🎨 <b>VRAM</b> (the chips on the graphics card) belongs to the GPU. VRAM is built for <b>bandwidth</b>: ~500+ GB/s vs ~80 GB/s for RAM.' },
      { on: ['ssd', 'ram'], go: [['ssd', 'ram', { c: 'blue', label: 'texture.png' }]], say: '💾 A game loads its pictures (<b>textures</b>) and 3D models from the SSD into normal RAM first.' },
      { on: ['cpu', 'ram'], go: [['cpu', 'ram', { c: 'pink', label: 'draw commands' }]], say: '🧠 The CPU (game + graphics driver) writes a list of drawing commands into RAM.' },
      { on: ['ram', 'vram'], lbl: ['ram', 'vram', 'v_pcie'], go: [['ram', 'vram', { c: 'orange', label: 'DMA over PCIe' }]], say: '🛣️ The GPU\'s DMA engine copies textures and commands across the <b>PCIe bus</b> into VRAM. The GPU driver (via Linux\'s <b>DRM</b>) decides where every buffer lives.' },
      { on: ['gpu', 'vram'], lbl: ['gpu', 'vram', 'v_fb'], go: [['vram', 'gpu', { c: 'purple', label: 'read textures' }], ['gpu', 'vram', { c: 'yellow', label: 'pixels' }]], say: '⚙️ Thousands of GPU cores read VRAM and paint the next frame into a <b>framebuffer</b> — a 1080p frame is ~8 MB, a 4K frame ~33 MB.' },
      { on: ['vram', 'mon'], cam: 'desk', go: [['vram', 'mon', { c: 'teal', label: 'scan-out 144×/s' }]], say: '📺 The display engine streams the finished framebuffer to the monitor 60–240 times per second.' },
      { on: ['ram', 'gpu'], cam: 'case', lbl: ['ram', 'gpu', 'vram'], say: '💻 Laptops with <b>integrated graphics</b> have no VRAM: the GPU shares normal RAM. Apple chips use one <b>unified memory</b> pool for both. When VRAM runs out, the driver moves buffers back to RAM — and games stutter.', code: '$ cat /sys/class/drm/card*/device/mem_info_vram_used   # amdgpu\n1210982400' }
    ]
  };


  SCN.chip = {
    title: 'Inside the CPU', icon: '🔬', world: 'chip', cam: 'chip', lbl: ['u_core0', 'u_cores', 'u_l3', 'u_mc', 'u_ram', 'u_apic', 'u_io', 'u_mode'],
    intro: 'We shrink down and zoom about 10,000× into a CPU chip. Press <b>▶ Play</b> to follow one instruction through a core.',
    reset: function (L) { L.chip.mode('user'); },
    steps: [
      { cam: 'chip', do: function (L) { L.chip.mode('user'); }, say: '🔬 Welcome inside a CPU chip! It has several <b>cores</b> (each a complete mini-CPU), a big shared <b>L3 cache</b>, a <b>memory controller</b> that talks to RAM, and a <b>timer + interrupt controller</b>.' },
      { on: ['u_ram', 'u_mc', 'u_l3', 'u_l2'], cam: 'chipMem', lbl: ['u_ram', 'u_mc', 'u_l3', 'u_l2', 'u_mode'], go: [['u_ram', 'u_mc', { c: 'teal', label: '64-byte line' }], ['u_mc', 'u_l3', { c: 'teal' }], ['u_l3', 'u_l2', { c: 'teal' }]], say: '🚚 An instruction\'s <b>cache line</b> (64 bytes) travels from RAM through the memory controller into the shared <b>L3</b>, then into core 0\'s own <b>L2</b>…' },
      { on: ['u_l1i', 'u_fetch', 'u_reg'], cam: 'chipCore', lbl: ['u_l1i', 'u_fetch', 'u_reg', 'u_mode'], go: [['u_l2', 'u_l1i', { c: 'teal' }], ['u_reg', 'u_fetch', { c: 'pink', label: 'RIP = 0x6ab0' }], ['u_l1i', 'u_fetch', { c: 'yellow', label: 'bytes' }]], say: '🔎 <b>FETCH</b>: …into the <b>L1 instruction cache</b>. The fetch unit reads the address in <b>RIP</b> (the pink register) and grabs those bytes from L1i.' },
      { on: ['u_bp'], cam: 'chipCore', lbl: ['u_bp', 'u_fetch', 'u_mode'], go: [['u_bp', 'u_fetch', { c: 'purple', label: 'guess: 0x6ab4 next' }]], say: '🔮 The <b>branch predictor</b> guesses the next address right away, so fetching never has to wait.' },
      { on: ['u_dec'], cam: 'chipCore', lbl: ['u_dec', 'u_fetch', 'u_mode'], go: [['u_fetch', 'u_dec', { c: 'blue', label: 'f3 0f 1e fa' }]], say: '🧩 <b>DECODE</b>: the decoder turns the raw bytes into simple internal steps called <b>micro-ops</b>.' },
      { on: ['u_alu'], cam: 'chipCore', lbl: ['u_alu', 'u_dec', 'u_mode'], go: [['u_dec', 'u_alu', { c: 'pink', label: 'µop: ADD' }]], say: '⚙️ <b>EXECUTE</b>: the <b>ALUs</b> (arithmetic-logic units) do the work — several at the same time on different micro-ops.' },
      { on: ['u_l1d'], cam: 'chipCore', lbl: ['u_l1d', 'u_alu', 'u_mode'], go: [['u_alu', 'u_l1d', { c: 'orange', label: 'load x' }], ['u_l1d', 'u_alu', { c: 'orange', label: '42' }]], say: '📦 Need a variable? The <b>L1 data cache</b> answers in about a nanosecond. (A miss asks L2, then L3, then RAM — and if the page isn\'t in RAM at all, that\'s a <b>page fault</b>.)' },
      { on: ['u_reg'], cam: 'chipCore', lbl: ['u_reg', 'u_alu', 'u_mode'], go: [['u_alu', 'u_reg', { c: 'green', label: 'result' }]], say: '✍️ <b>WRITE BACK</b>: the result lands in a register, and RIP moves on to the next instruction. Fetch → decode → execute… about 4 billion times every second.' },
      { on: ['u_apic', 'u_fetch'], cam: 'chipUnc', lbl: ['u_apic', 'u_fetch', 'u_mode'], do: function (L) { L.chip.mode('kernel'); }, go: [['u_apic', 'u_fetch', { c: 'red', label: '⏰ timer interrupt!' }]], say: '⏰ A few milliseconds later the <b>timer</b> rings. The core saves RIP and jumps into the <b>kernel</b> — 👑 kernel mode. The scheduler decides what runs next.' },
      { on: ['u_core1', 'u_core2', 'u_core3'], cam: 'chip', lbl: ['u_cores', 'u_core0', 'u_mode'], do: function (L) { L.chip.mode('user'); }, say: '🧠🧠🧠 Meanwhile, cores 1–3 run <b>other programs at the very same moment</b> — real parallelism. Linux\'s scheduler hands out the cores; the cores do all the fetching by themselves.' }
    ]
  };

  SCN.pipe = {
    title: 'Pipeline Factory', icon: '🏭', world: 'pipe', cam: 'pipe',
    lbl: ['st_F', 'st_D', 'st_E', 'st_M', 'st_W', 'p_l1i', 'p_done', 'p_count', 'ib0', 'ib1', 'ib2', 'ib3', 'ib4', 'ib5', 'ib6', 'ib7', 'ib8'],
    intro: 'A CPU core works like a factory line with 5 stations. A lit lamp = a busy station. Press <b>▶ Play</b> to compare the ways of running it.',
    reset: function (L) { L.pipe.set('pipe'); },
    steps: [
      { cam: 'pipe', do: function (L) { L.pipe.set('seq'); }, say: '🐢 <b>One at a time</b>: an instruction walks through fetch → decode → execute → memory → write back, and only then may the next one start. Look at the lamps — most stations sit idle! 5 instructions = <b>25 cycles</b>.' },
      { cam: 'pipe', do: function (L) { L.pipe.set('pipe'); }, say: '🏎️ <b>Pipelined</b>: a new instruction enters every cycle, like a laundry line. Once the line is full, <b>one instruction finishes every cycle</b> and every lamp glows. 5 instructions take just <b>9 cycles</b>.' },
      { cam: 'pipe', do: function (L) { L.pipe.set('flush'); }, say: '🔀 <b>A wrong guess</b>: I3 is a jump, and the branch predictor guessed wrong — the two instructions fetched after it (red) are the wrong ones. When I3 executes, they\'re <b>thrown away</b> (a pipeline flush) and the right ones start. Good guessing matters!' },
      { cam: 'pipeTop', do: function (L) { L.pipe.set('pipe'); }, say: '🏭 Real CPUs have pipelines of ~14–20 stations, run several side by side (<b>superscalar</b>), and even reorder instructions (<b>out-of-order</b>). The OS never sees any of this — it just sees a very fast CPU.' }
    ]
  };

  SCN.pfault = {
    title: 'Page Fault Journey', icon: '💥', world: 'pfault', cam: 'pf', lbl: ['pf_proc', 'pf_mmu', 'pf_tlb', 'pf_pt', 'pf_kern', 'pf_ram', 'pf_disk', 'pf_segv'],
    intro: 'Follow one memory read that goes wrong — and watch the kernel quietly fix it. Press <b>▶ Play</b>.',
    reset: function (L) { L.pf.set({}); },
    steps: [
      { cam: 'pf', do: function (L) { L.pf.set({}); }, say: '🗺️ Meet the cast: your <b>program</b>, the CPU\'s <b>MMU</b> with its <b>TLB</b>, the 4-level <b>page table</b>, the <b>kernel</b>, the <b>RAM frames</b> and the <b>SSD</b>.' },
      { on: ['pf_proc', 'pf_mmu'], do: function (L) { L.pf.set({}); }, go: [['pf_proc', 'pf_mmu', { c: 'pink', label: 'read 0x7f3a2000' }]], say: '🧑 The program runs an instruction that reads address <code>0x7f3a2000</code>. The CPU\'s <b>MMU</b> must turn this <i>virtual</i> address into a real place in RAM.' },
      { on: ['pf_tlb'], do: function (L) { L.pf.set({ tlbMiss: true }); }, go: [['pf_mmu', 'pf_tlb', { c: 'yellow', label: 'know it?' }], ['pf_tlb', 'pf_mmu', { c: 'red', label: 'miss ✗' }]], say: '⚡ First stop: the <b>TLB</b>, a tiny cache of recent translations. <b>Miss</b> — this page hasn\'t been used lately.' },
      { on: ['pf_pt', 'pf_l1', 'pf_l2', 'pf_l3', 'pf_l4'], cam: 'pfPt', lbl: ['pf_proc', 'pf_mmu', 'pf_tlb', 'pf_pt', 'pf_l1', 'pf_l2', 'pf_l3', 'pf_l4'], do: function (L) { L.pf.set({ tlbMiss: true, walk: 4 }); }, go: [['pf_mmu', 'pf_l1', { c: 'blue', label: 'walk' }], ['pf_l1', 'pf_l2', { c: 'blue' }], ['pf_l2', 'pf_l3', { c: 'blue' }], ['pf_l3', 'pf_l4', { c: 'blue' }]], say: '📒 The MMU <b>walks the page table</b>: level 1 → 2 → 3 → 4. The last entry says <b>"not present"</b> (red) — this page isn\'t in RAM right now!' },
      { on: ['pf_kern'], cam: 'pf', do: function (L) { L.pf.set({ walk: 4 }); }, go: [['pf_l4', 'pf_kern', { c: 'red', label: '💥 PAGE FAULT (#14)' }]], say: '💥 The CPU raises a <b>page fault</b> (exception 14) and jumps into the kernel\'s fault handler. The program is frozen mid-instruction.' },
      { on: ['pf_kern', 'pf_disk'], lbl: ['pf_proc', 'pf_kern', 'pf_disk', 'pf_zzz', 'pf_ram'], do: function (L) { L.pf.set({ walk: 4, sleep: true }); }, go: [['pf_kern', 'pf_disk', { c: 'purple', label: 'read 4 KB' }]], say: '👑 The kernel checks: is this address legal? Yes — but the page was <b>swapped out</b> to the SSD. It asks the SSD for those 4 KB and puts the program to <b>sleep</b> 😴 (others run meanwhile). This is a <b>major</b> fault.' },
      { on: ['pf_ram', 'pf_pt'], lbl: ['pf_proc', 'pf_kern', 'pf_disk', 'pf_ram', 'pf_pt', 'pf_zzz'], do: function (L) { L.pf.set({ walk: 4, pteOK: true, frame: true, sleep: true }); }, go: [['pf_disk', 'pf_frame', { c: 'green', label: '4 KB page' }], ['pf_kern', 'pf_l4', { c: 'green', label: 'fix entry ✓' }]], say: '📥 The data lands in a free <b>RAM frame</b> (green). The kernel writes that frame into the page-table entry, which is now <b>present</b> ✓.' },
      { on: ['pf_proc', 'pf_ram'], do: function (L) { L.pf.set({ pteOK: true, frame: true }); }, go: [['pf_kern', 'pf_mmu', { c: 'green', label: 'retry!' }], ['pf_frame', 'pf_proc', { c: 'green', label: 'data ✅' }]], say: '🔁 The kernel wakes the program and returns from the fault. The CPU <b>re-runs the very same instruction</b> — now the translation works and the data arrives. The program never knew!' },
      { on: ['pf_kern', 'pf_ram'], do: function (L) { L.pf.set({ frame: true }); }, go: [['pf_kern', 'pf_frame', { c: 'yellow', label: 'zero-filled page' }]], say: '🆕 A <b>minor fault</b> is even simpler: for brand-new memory (first touch after <code>malloc</code>) there\'s nothing to read, so the kernel grabs a free frame, fills it with zeros and maps it. No disk — under a microsecond.' },
      { on: ['pf_segv', 'pf_kern'], lbl: ['pf_proc', 'pf_mmu', 'pf_kern', 'pf_segv'], do: function (L) { L.pf.set({ segv: true, dieAfter: 3200 }); }, go: [['pf_proc', 'pf_mmu', { c: 'red', label: 'read 0x0 (NULL!)' }], ['pf_mmu', 'pf_kern', { c: 'red', label: '💥 fault' }], ['pf_kern', 'pf_segv', { c: 'red', label: 'no such region!' }]], say: '💀 But if the address is <b>illegal</b> — like a NULL pointer — the kernel finds no valid region. It sends <b>SIGSEGV</b>: <code>Segmentation fault</code>. Only this program dies; everyone else is safe.' }
    ]
  };

  SCN.dram = {
    title: 'Inside a RAM Chip', icon: '🪣', world: 'dram', cam: 'dram', lbl: ['d_dimm', 'd_dec', 'd_amp', 'd_col', 'd_mc', 'd_text'],
    intro: 'Zoom from a RAM stick into one memory chip, all the way down to the tiny buckets of electricity that store bits. Press <b>▶ Play</b>.',
    reset: function (L) { L.dram.set('reset'); },
    steps: [
      { cam: 'dram', on: ['d_dimm'], do: function (L) { L.dram.set('reset'); }, say: '💾 A RAM stick carries 8 memory chips. We zoom into one of them, down to a tiny 8 × 8 corner of its billions of cells.' },
      { cam: 'dramCells', lbl: ['d_cell', 'd_row', 'd_bit', 'd_text'], do: function (L) { L.dram.set('reset'); }, say: '🪣 Each glass <b>bucket</b> is a capacitor holding a little electric charge: full = <b>1</b>, empty = <b>0</b>. Each row holds 8 bits = one letter, so these 8 rows spell <b>"Hi Linux"</b>.' },
      { cam: 'dram', on: ['d_mc', 'd_dec', 'd_col'], lbl: ['d_mc', 'd_dec', 'd_col', 'd_row', 'd_text'], do: function (L) { L.dram.set('write', { row: 2, ch: '!' }); }, par: true, go: [['d_mc', 'd_dec', { c: 'pink', label: 'row 2' }], ['d_mc', 'd_col', { c: 'pink', label: 'data "!"' }]], say: '✏️ <b>WRITE</b>: the memory controller sends a row number to the <b>row decoder</b> and the data to the columns. Word line 2 (pink) opens row 2 and the bit lines fill or empty its buckets: now it says <b>"Hi!Linux"</b>.' },
      { cam: 'dram', on: ['d_amp', 'd_dec'], lbl: ['d_amp', 'd_dec', 'd_col', 'd_text'], do: function (L) { L.dram.set('read', { row: 5 }); }, go: [['d_mc', 'd_dec', { c: 'yellow', label: 'row 5' }], ['d_amp', 'd_col', { c: 'yellow', label: '"n"' }], ['d_col', 'd_mc', { c: 'yellow', label: '"n"' }]], say: '👀 <b>READ</b>: word line 5 (yellow) opens the whole row; each bucket shares its charge with a bit line, and the <b>sense amplifiers</b> decide: 1 or 0? Reading drains the buckets, so the amps write the row straight back.' },
      { cam: 'dramCells', lbl: ['d_text', 'd_cell'], do: function (L) { L.dram.set('leak'); }, say: '💧 Uh-oh: the buckets <b>leak</b>! Without help, 1s fade into 0s and the letters garble. Real chips leak within milliseconds (slowed way down here).' },
      { cam: 'dram', on: ['d_mc'], lbl: ['d_mc', 'd_text', 'd_row'], do: function (L) { L.dram.set('refresh'); }, say: '🔁 That\'s why the <b>memory controller refreshes</b> every row (green word line): read it, write it back — every row within <b>64 ms</b>, all day long. The data stays safe.' },
      { cam: 'dramCells', lbl: ['d_text'], do: function (L) { L.dram.set('off'); }, say: '🔌 Power off → no refresh → every bucket drains → RAM forgets everything. That\'s why your computer must load Linux from the SSD again at every boot.' }
    ]
  };

  SCN.gpu = {
    title: 'Inside a Graphics Card', icon: '🎮', world: 'gpu', cam: 'gpu', lbl: ['g_gpu', 'g_vram', 'g_pcie', 'g_fb', 'g_mon', 'g_sysram', 'g_cool'],
    intro: 'A graphics card with its cooler taken off: the GPU chip, its VRAM, and how a picture gets painted and shown. Press <b>▶ Play</b>.',
    reset: function (L) { L.gpu.set({}); },
    steps: [
      { cam: 'gpu', do: function (L) { L.gpu.set({}); }, say: '🎮 A graphics card is a mini-computer for pictures: the <b>GPU chip</b> (thousands of small cores) in the middle, its own memory — <b>VRAM</b> — all around it, and a <b>PCIe</b> connector to the motherboard.' },
      { on: ['g_sysram', 'g_pcie', 'g_vram'], lbl: ['g_sysram', 'g_pcie', 'g_vram'], do: function (L) { L.gpu.set({}); }, go: [['g_sysram', 'g_pcie', { c: 'orange', label: 'textures + commands' }], ['g_pcie', 'g_vram', { c: 'orange', label: 'DMA' }]], say: '🛣️ The game\'s pictures (<b>textures</b>) and drawing commands start in <b>system RAM</b>. The GPU\'s DMA engine copies them across <b>PCIe</b> into VRAM.' },
      { on: ['g_vram', 'g_gpu'], cam: 'gpuDie', lbl: ['g_vram', 'g_gpu'], do: function (L) { L.gpu.set({}); }, go: [['g_vram', 'g_gpu', { c: 'purple', label: '~500 GB/s' }]], say: '⚡ VRAM sits millimetres from the GPU on very wide wires, so the cores can read textures at hundreds of GB per second — roughly 10× faster than system RAM.' },
      { on: ['g_gpu', 'g_fb'], cam: 'gpu', lbl: ['g_gpu', 'g_fb'], do: function (L) { L.gpu.set({ paint: true }); }, go: [['g_gpu', 'g_fb', { c: 'pink', label: 'paint!' }]], say: '🎨 The magic: the cores all work <b>at the same time</b>, each colouring a few pixels of the next picture into the <b>framebuffer</b> in VRAM. Watch it fill in!' },
      { on: ['g_fb', 'g_mon'], cam: 'gpuMon', lbl: ['g_fb', 'g_mon'], do: function (L) { L.gpu.set({ painted: true, scan: true }); }, go: [['g_fb', 'g_mon', { c: 'teal', label: 'scan-out' }]], say: '📺 The <b>display engine</b> reads the finished framebuffer line by line and sends it to the monitor — 60 to 240 times per second. Meanwhile the GPU paints the <i>next</i> frame in a second buffer.' },
      { on: ['g_sysram', 'g_gpu'], cam: 'gpu', lbl: ['g_sysram', 'g_gpu', 'g_vram'], do: function (L) { L.gpu.set({ painted: true, shown: true, integ: true }); }, say: '💻 <b>Integrated graphics</b> (most laptops): no VRAM chips at all! The GPU borrows part of system RAM — cheaper and cooler, but it shares memory speed with the CPU. Apple chips use one big <b>unified memory</b> for both.' },
      { cam: 'gpu', do: function (L) { L.gpu.set({ painted: true, shown: true }); }, say: '🐧 In Linux, the GPU driver (amdgpu, i915/xe, nouveau or NVIDIA\'s) manages VRAM through <b>DRM</b>: it hands out buffers, gives the GPU its own page tables, and moves buffers to system RAM when VRAM is full.', code: '$ cat /sys/class/drm/card*/device/mem_info_vram_used\n1210982400' }
    ]
  };

  var SCN_ORDER = ['tour', 'cake', 'boot', 'run', 'chip', 'pipe', 'fetch', 'pfault', 'ram', 'dram', 'gpu', 'vram', 'files', 'tree', 'save', 'net', 'containers'];

  /* ------------------------------------------------------------------ */
  function mount(host, opts) {
    if (!host) return;
    opts = opts || {};
    var ids = (opts.scenarios || SCN_ORDER).filter(function (s) { return SCN[s]; });
    host.classList.add('lab');
    host.innerHTML =
      '<div class="lab-top">' + ids.map(function (id) { return '<button class="chip" type="button" data-s="' + id + '">' + SCN[id].icon + ' ' + SCN[id].title + '</button>'; }).join('') + '</div>' +
      '<div class="lab-stage"><div class="lab-loading">✏️ sketching in 3D…</div><div class="lab-labels"></div>' +
      '<div class="lab-tools"><button class="btn sm icon" type="button" data-t="view" title="Reset camera" aria-label="Reset camera">🎯</button><button class="btn sm icon" type="button" data-t="fs" title="Full screen" aria-label="Full screen">⛶</button></div>' +
      '<div class="lab-hint">🖱️ drag to spin · click, then scroll to zoom · pinch on phones</div></div>' +
      '<div class="lab-cap"></div>';
    if (!T) { host.querySelector('.lab-stage').innerHTML = '<div class="lab-fallback">😢 The 3D lab could not load three.js (vendor/three.min.js) or WebGL is unavailable.</div>'; return; }
    var go = function () { try { build(host, ids, opts); } catch (e) { console.error(e); host.querySelector('.lab-stage').innerHTML = '<div class="lab-fallback">😢 3D could not start on this device (WebGL unavailable).</div>'; } };
    if (window.Core && Core.whenVisible) Core.whenVisible(host, go, '300px'); else go();
  }

  function build(host, ids, opts) {
    var stage = host.querySelector('.lab-stage'), lblBox = host.querySelector('.lab-labels'), cap = host.querySelector('.lab-cap');
    var small = Math.min(window.innerWidth, window.innerHeight) < 700;
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    stage.insertBefore(renderer.domElement, lblBox);
    var ld = stage.querySelector('.lab-loading'); if (ld) ld.remove();
    var canvas = renderer.domElement; canvas.style.touchAction = 'pan-y';
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(42, 1.6, 0.1, 400);

    /* ---------- lights: warm key with soft shadows, cool rim, colourful sky ---------- */
    scene.add(new T.HemisphereLight(0xfff4e0, 0x6d5fc0, 0.72));
    var keyL = new T.DirectionalLight(0xffffff, 0.72); keyL.position.set(7, 15, 10); keyL.castShadow = true;
    keyL.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    var shc = keyL.shadow.camera; shc.left = -17; shc.right = 17; shc.top = 17; shc.bottom = -17; shc.near = 1; shc.far = 60;
    keyL.shadow.bias = -0.0006; keyL.shadow.normalBias = 0.03;
    scene.add(keyL); scene.add(keyL.target);
    var rimL = new T.DirectionalLight(0xb3e0ff, 0.34); rimL.position.set(-9, 6, -9); scene.add(rimL);

    var isDark = function () { return window.Core ? Core.theme() === 'dark' : false; };
    var grad = new T.DataTexture(new Uint8Array([78, 148, 205, 255]), 4, 1, renderer.capabilities.isWebGL2 ? T.RedFormat : T.LuminanceFormat);
    grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
    var lineMat = new T.LineBasicMaterial({ color: isDark() ? 0xe9e6ff : 0x2b2a33 });
    var hullMat = new T.MeshBasicMaterial({ color: 0x1b1530, side: T.BackSide });
    var hotHull = new T.MeshBasicMaterial({ color: 0xffc21a, side: T.BackSide });

    /* ---------- geometry helpers ---------- */
    var GEO = {};
    function cached(k, make) { return GEO[k] || (GEO[k] = make()); }
    // rounded box: a subdivided cube whose corner vertices are pushed onto spheres
    function rgeo(w, h, d, r, s) {
      return cached('r' + [w, h, d, r, s].join(','), function () {
        var seg = s * 2 + 1; r = Math.max(.001, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
        var g = new T.BoxGeometry(1, 1, 1, seg, seg, seg), pos = g.attributes.position, nor = g.attributes.normal;
        var half = .5 / seg, bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r, p = new T.Vector3(), n = new T.Vector3();
        for (var i = 0; i < pos.count; i++) {
          p.fromBufferAttribute(pos, i);
          n.set(p.x - Math.sign(p.x) * half, p.y - Math.sign(p.y) * half, p.z - Math.sign(p.z) * half).normalize();
          pos.setXYZ(i, bx * Math.sign(p.x) + n.x * r, by * Math.sign(p.y) + n.y * r, bz * Math.sign(p.z) + n.z * r);
          nor.setXYZ(i, n.x, n.y, n.z);
        }
        pos.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); return g;
      });
    }
    function bgeo(w, h, d) { return cached('b' + [w, h, d].join(','), function () { var g = new T.BoxGeometry(w, h, d); g.computeBoundingBox(); return g; }); }
    function M(c, o) { var m = new T.MeshToonMaterial({ color: c, gradientMap: grad }); if (o) for (var k in o) m[k] = o[k]; return m; }
    var rgbMats = [];
    function RGB(off, l) { var m = new T.MeshBasicMaterial({ color: 0xffffff }); rgbMats.push({ m: m, off: off || 0, l: l || .6 }); return m; }
    function GLOWM(c) { return new T.MeshBasicMaterial({ color: c }); }
    // cartoon outline: a slightly bigger back-face copy ("inverted hull")
    function hull(m, th) {
      var g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); var s = new T.Vector3(); g.boundingBox.getSize(s); th = th == null ? .028 : th;
      var h = new T.Mesh(g, hullMat); h.scale.set(1 + 2 * th / Math.max(s.x, .02), 1 + 2 * th / Math.max(s.y, .02), 1 + 2 * th / Math.max(s.z, .02));
      h.userData.hull = true; m.add(h); return h;
    }
    function mesh(geo, mat, x, y, z, parent, o) {
      o = o || {}; var m = new T.Mesh(geo, mat); m.position.set(x, y, z);
      if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
      if (o.sc) m.scale.set(o.sc[0], o.sc[1], o.sc[2]);
      if (o.hull !== false && !mat.transparent) hull(m, o.th);
      m.castShadow = o.cast !== false && !mat.transparent; m.receiveShadow = o.recv !== false;
      parent.add(m); return m;
    }
    function rbox(w, h, d, c, x, y, z, parent, o) { o = o || {}; var r = o.r != null ? o.r : Math.min(w, h, d) * .22; return mesh(r > .004 ? rgeo(w, h, d, r, o.s || 2) : bgeo(w, h, d), o.mat || M(c, o.mo), x, y, z, parent, o); }
    function cyl(rt, rb, h, c, x, y, z, parent, o) { o = o || {}; var sg = o.seg || 32; return mesh(cached('c' + [rt, rb, h, sg].join(','), function () { var g = new T.CylinderGeometry(rt, rb, h, sg); g.computeBoundingBox(); return g; }), o.mat || M(c, o.mo), x, y, z, parent, o); }
    function sph(r, c, x, y, z, parent, o) { o = o || {}; return mesh(cached('s' + r, function () { var g = new T.SphereGeometry(r, 28, 18); g.computeBoundingBox(); return g; }), o.mat || M(c, o.mo), x, y, z, parent, o); }
    function tor(r, t, c, x, y, z, parent, o) { o = o || {}; return mesh(cached('t' + r + ',' + t, function () { var g = new T.TorusGeometry(r, t, 12, 48); g.computeBoundingBox(); return g; }), o.mat || M(c, o.mo), x, y, z, parent, o); }
    function cone(r, h, c, x, y, z, parent, o) { o = o || {}; return mesh(cached('k' + r + ',' + h, function () { var g = new T.ConeGeometry(r, h, 24); g.computeBoundingBox(); return g; }), o.mat || M(c, o.mo), x, y, z, parent, o); }
    function V(x, y, z) { return new T.Vector3(x, y, z); }
    function tube(points, r, c, parent, o) {
      o = o || {}; var cv = new T.CatmullRomCurve3(points.map(function (p) { return p.isVector3 ? p : V(p[0], p[1], p[2]); }));
      var m = new T.Mesh(new T.TubeGeometry(cv, o.seg || 40, r, 8), o.mat || M(c)); m.castShadow = o.cast !== false; m.receiveShadow = true; parent.add(m); return m;
    }
    function edgesOf(m, mat) { var e = new T.LineSegments(new T.EdgesGeometry(m.geometry, 30), mat || lineMat); m.add(e); return e; }
    function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }

    var worlds = {}, parts = {}, labels = {}, anchors = {};
    function world(id) { var g = new T.Group(); g.visible = false; scene.add(g); worlds[id] = g; return g; }
    function part(id, obj, w) {
      var mats = [], hulls = [];
      obj.traverse(function (o) {
        if (!o.isMesh) return;
        if (o.userData.hull) hulls.push(o);
        else if (o.material && o.material.emissive) { if (!o.material.userData.baseE) o.material.userData.baseE = o.material.emissive.clone(); if (mats.indexOf(o.material) < 0) mats.push(o.material); }
      });
      parts[id] = { obj: obj, mats: mats, hulls: hulls, world: w }; return obj;
    }
    function label(id, html, w, at, o) {
      o = o || {}; var e = document.createElement('div'); e.className = 'lab-lbl' + (o.cls ? ' ' + o.cls : ''); e.innerHTML = html; lblBox.appendChild(e);
      labels[id] = { el: e, world: w, obj: at && at.isObject3D ? at : null, pos: at && at.isVector3 ? at.clone() : null, off: new T.Vector3().fromArray(o.off || [0, 0, 0]), vis: false };
      return labels[id];
    }

    var need = {}; ids.forEach(function (id) { need[SCN[id].world] = true; });
    var ROUTES = {}, bladeGroups = [], frames = [], swapSlots = [], ctrs = {}, ctrState = {}, cakeL = [], cakeE = { cur: 0, to: 0 },
      cloud = null, ship = null, treeSpin = null, sctx = null, stex = null, kcol = new T.Color(), updaters = [], keys, keyBase,
      cakeAPI = null, ctrAPI = null, ramSet = null, dirLabelIds = [];
    if (need.pc) {
    /* =====================================================================
       WORLD: PC — a cosy, colourful desk setup
       ===================================================================== */
    var W = world('pc');
    // round rug on the floor
    var rugTex = canvasTex(512, 512, function (g, w) {
      var cols = ['#ffd166', '#ff8fab', '#8ecae6', '#b8f2c9', '#cdb4ff', '#ffb38a', '#a0e7e5'];
      for (var i = 0; i < 7; i++) { g.beginPath(); g.arc(256, 256, 256 - i * 34, 0, Math.PI * 2); g.fillStyle = cols[i]; g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (var a = 0; a < 48; a++) { var ang = a / 48 * Math.PI * 2; g.beginPath(); g.arc(256 + Math.cos(ang) * 240, 256 + Math.sin(ang) * 240, 5, 0, Math.PI * 2); g.fill(); }
    });
    var rug = new T.Mesh(new T.CircleGeometry(13, 64), new T.MeshToonMaterial({ map: rugTex, gradientMap: grad }));
    rug.rotation.x = -Math.PI / 2; rug.position.y = -3.56; rug.receiveShadow = true; W.add(rug);
    // desk
    var wood = M(0xeaa760);
    rbox(15, .38, 7.5, 0, .6, -.19, 0, W, { mat: wood, r: .14 });
    rbox(14.6, .16, .2, 0xc9803c, .6, -.42, 3.6, W, { r: .06 });
    [[-6.6, -3.3], [7.8, -3.3], [-6.6, 3.3], [7.8, 3.3]].forEach(function (p) { rbox(.42, 3.2, .42, 0xc9803c, p[0], -1.95, p[1], W, { r: .14 }); });
    rbox(7.2, .05, 2.7, 0x7c5cff, -1.3, .03, 1.15, W, { r: .025, hull: false, cast: false });
    // monitor
    var mon = new T.Group(); W.add(mon);
    rbox(5.8, 3.6, .26, 0x262238, -2.6, 2.75, -1.9, mon, { r: .13 });
    rbox(3.0, 2.0, .34, 0x2f2a48, -2.6, 2.75, -2.14, mon, { r: .16 });
    var scv = document.createElement('canvas'); scv.width = 640; scv.height = 400;
    var sctx = scv.getContext('2d'); var stex = new T.CanvasTexture(scv);
    var screenMesh = new T.Mesh(new T.PlaneGeometry(5.42, 3.22), new T.MeshBasicMaterial({ map: stex }));
    screenMesh.position.set(-2.6, 2.75, -1.765); mon.add(screenMesh);
    rbox(.5, 1.6, .28, 0x3d3760, -2.6, .95, -2.25, mon, { r: .12 });
    cyl(1.05, 1.15, .12, 0x3d3760, -2.6, .07, -2.05, mon);
    rbox(4.8, .05, .05, 0, -2.6, .99, -1.77, mon, { mat: RGB(0), hull: false, r: 0 });
    sph(.045, 0, .05, 1.06, -1.76, mon, { mat: GLOWM(0x3df2a8), hull: false });
    rbox(.55, .55, .02, 0xffe066, -.15, 4.15, -1.76, mon, { r: .01, hull: false, rot: [0, 0, .12] });
    rbox(.5, .5, .02, 0xff8fab, -.65, 4.32, -1.755, mon, { r: .01, hull: false, rot: [0, 0, -.08] });
    part('mon', mon, 'pc'); label('mon', '📺 Monitor', 'pc', V(-2.6, 4.75, -1.9));
    // keyboard with rainbow keycaps
    var kb = new T.Group(); kb.position.y = .05; W.add(kb);
    rbox(4.9, .24, 1.72, 0x2d2846, -2.6, .12, .9, kb, { r: .1 });
    var keyMat = M(0xffffff);
    var keys = new T.InstancedMesh(rgeo(.29, .15, .27, .05, 1), keyMat, 52), km = new T.Matrix4(), keyBase = [], kcol = new T.Color();
    for (var r = 0; r < 4; r++) for (var c = 0; c < 13; c++) {
      var ki = r * 13 + c; km.makeTranslation(-2.6 - 2.1 + c * .35, .31, .9 - .5 + r * .33); keys.setMatrixAt(ki, km); keyBase.push(km.clone());
      keys.setColorAt(ki, kcol.setHSL((c / 13 + r * .04) % 1, .85, .64));
    }
    keys.instanceColor.needsUpdate = true; keys.castShadow = true; kb.add(keys);
    rbox(1.9, .15, .27, 0xffffff, -2.6, .31, 1.62, kb, { r: .05 });
    rbox(4.6, .14, .45, 0x9b87ff, -2.6, .07, 2.02, kb, { r: .07 });
    part('kbd', kb, 'pc');
    label('kbd', '⌨️ Keyboard', 'pc', V(-2.6, .4, 2.3));
    // mouse
    var mouse = new T.Group(); mouse.position.set(.9, .06, 1.25); W.add(mouse);
    sph(.32, 0xffffff, 0, .1, 0, mouse, { sc: [1, .45, 1.45] });
    cyl(.05, .05, .05, 0x2d2846, 0, .24, -.2, mouse, { rot: [0, 0, Math.PI / 2], hull: false });
    rbox(.05, .02, .42, 0, 0, .245, .08, mouse, { mat: RGB(.3), hull: false, r: 0 });
    // props: plant, mug, books, penguin buddy
    var plant = new T.Group(); plant.position.set(-6.2, 0, -2.4); W.add(plant);
    cyl(.45, .34, .8, 0xe07a5f, 0, .4, 0, plant); cyl(.5, .5, .14, 0xc8624a, 0, .82, 0, plant);
    [[0, 1.35, 0, .42, 0x3ccf7a], [.38, 1.18, .1, .32, 0x22b55f], [-.34, 1.22, -.06, .34, 0x2fbf6b], [.08, 1.7, -.1, .3, 0x5ce08f], [-.16, 1.58, .22, .27, 0x22b55f]].forEach(function (l) { sph(l[3], l[4], l[0], l[1], l[2], plant); });
    var mug = new T.Group(); mug.position.set(.3, 0, -.55); W.add(mug);
    cyl(.28, .25, .62, 0xff4f8b, 0, .31, 0, mug); tor(.16, .055, 0xff4f8b, .3, .33, 0, mug);
    cyl(.24, .24, .02, 0x6b3e26, 0, .6, 0, mug, { hull: false });
    var books = new T.Group(); books.position.set(-5.8, 0, -.5); W.add(books);
    rbox(1.4, .22, 1.0, 0x3a86ff, 0, .11, 0, books, { r: .05 }); rbox(1.3, .2, .95, 0xffbe0b, 0, .32, 0, books, { r: .05, rot: [0, .12, 0] }); rbox(1.35, .2, .9, 0x00c48c, .02, .52, 0, books, { r: .05, rot: [0, -.1, 0] });
    var tux = new T.Group(); tux.position.set(-6.0, 0, 1.6); tux.rotation.y = .45; W.add(tux);
    sph(.45, 0x1f1d2b, 0, .52, 0, tux, { sc: [1, 1.22, .92] }); sph(.34, 0xffffff, 0, .48, .2, tux, { sc: [1, 1.15, .6], hull: false });
    sph(.34, 0x1f1d2b, 0, 1.17, 0, tux); sph(.24, 0xffffff, 0, 1.15, .17, tux, { sc: [1.1, .9, .6], hull: false });
    [-.1, .1].forEach(function (x) { sph(.06, 0x111111, x, 1.22, .32, tux, { hull: false }); });
    cone(.09, .22, 0xffa62b, 0, 1.1, .38, tux, { rot: [Math.PI / 2, 0, 0], hull: false });
    [-.16, .16].forEach(function (x) { sph(.15, 0xffa62b, x, .06, .22, tux, { sc: [1, .4, 1.4] }); });
    [-.42, .42].forEach(function (x, i) { sph(.16, 0x1f1d2b, x, .6, 0, tux, { sc: [.5, 1.3, .8], rot: [0, 0, i ? -.35 : .35] }); });
    // ---- the PC case (side panel faces the camera) ----
    var cs = new T.Group(); cs.position.set(4.2, 0, -.6); W.add(cs);
    var caseMat = M(0xf4f2ff);
    rbox(4.6, 4.9, .12, 0, 0, 2.45, -1.2, cs, { mat: caseMat, r: .05 });
    rbox(4.6, .14, 2.4, 0, 0, 4.9, 0, cs, { mat: caseMat, r: .06 });
    rbox(4.6, .14, 2.4, 0, 0, .07, 0, cs, { mat: caseMat, r: .06 });
    rbox(.14, 4.9, 2.4, 0, -2.3, 2.45, 0, cs, { mat: caseMat, r: .06 });
    rbox(.14, 4.9, 2.4, 0, 2.3, 2.45, 0, cs, { mat: caseMat, r: .06 });
    rbox(3.6, .03, 1.8, 0x2d2846, 0, 4.98, 0, cs, { r: .01, hull: false });
    [[-1.9, -.9], [1.9, -.9], [-1.9, .9], [1.9, .9]].forEach(function (p) { cyl(.16, .2, .12, 0x2d2846, p[0], -.05, p[1], cs, { hull: false }); });
    var glass = new T.Mesh(bgeo(4.5, 4.8, .04), new T.MeshBasicMaterial({ color: 0xa5e8ff, transparent: true, opacity: .1, depthWrite: false }));
    glass.position.set(0, 2.45, 1.2); edgesOf(glass); cs.add(glass);
    var pwr = cyl(.16, .16, .08, 0x3df2a8, 1.8, 5.0, .4, cs, { mo: { emissive: new T.Color(0x0b5a3a) } });
    tor(.2, .025, 0, 1.8, 5.04, .4, cs, { mat: GLOWM(0x3df2a8), hull: false, rot: [Math.PI / 2, 0, 0] });
    part('power', pwr, 'pc'); label('power', '🔘 Power button', 'pc', pwr, { off: [0, .38, 0] });
    // RGB front fans (spinning)
    var bladeGroups = [];
    function fan(x, y, z, off) {
      var f = new T.Group(); f.position.set(x, y, z); f.rotation.y = -Math.PI / 2 + .55; cs.add(f);
      rbox(1.28, 1.28, .1, 0x2d2846, 0, 0, -.02, f, { r: .1 });
      tor(.56, .06, 0, 0, 0, .05, f, { mat: RGB(off), hull: false });
      cyl(.14, .14, .08, 0x3d3760, 0, 0, .05, f, { rot: [Math.PI / 2, 0, 0], hull: false });
      var bl = new T.Group(); bl.position.z = .05; f.add(bl); bladeGroups.push(bl);
      for (var b = 0; b < 5; b++) { var pv = new T.Group(); pv.rotation.z = b / 5 * Math.PI * 2; bl.add(pv); rbox(.42, .16, .02, 0xe6e1ff, .28, 0, 0, pv, { r: .008, hull: false, rot: [.35, 0, 0] }); }
    }
    fan(2.0, 3.85, .25, 0); fan(2.0, 2.45, .25, .33);
    rbox(4.3, .05, .05, 0, 0, 4.78, 1.08, cs, { mat: RGB(.1), hull: false, r: 0 }); rbox(4.0, .05, .05, 0, 0, 1.13, 1.02, cs, { mat: RGB(.6), hull: false, r: 0 });
    // motherboard + details
    rbox(4.0, 3.5, .08, 0x1f2b4d, 0, 3.0, -1.1, cs, { r: .03 });
    rbox(1.5, .32, .22, 0xff4f8b, .35, 4.62, -.97, cs, { r: .06 });
    rbox(.32, 1.1, .22, 0xff4f8b, -.46, 3.75, -.97, cs, { r: .06 });
    rbox(.78, .78, .14, 0x14d3e0, 1.25, 2.0, -1.0, cs, { r: .06 });
    rbox(3.0, .12, .1, 0x111827, -.3, 2.2, -1.02, cs, { r: .02, hull: false });
    for (var ds = 0; ds < 4; ds++) rbox(.14, 1.7, .08, 0x111827, 1.3 + ds * .18, 3.75, -1.04, cs, { r: .02, hull: false });
    rbox(.2, .9, .25, 0xf4f2ff, 1.97, 3.45, -.98, cs, { r: .05 });
    [[-.95, 4.55], [-.8, 4.55], [-.65, 4.55], [-.95, 3.1], [-.8, 3.1]].forEach(function (p) { cyl(.06, .06, .14, 0x3a3555, p[0], p[1], -1.0, cs, { rot: [Math.PI / 2, 0, 0], hull: false }); });
    var traceMat = new T.LineBasicMaterial({ color: 0xffd36b });
    [[[.4, 3.85], [1.55, 3.75]], [[.4, 3.85], [-.3, 2.45]], [[.4, 3.85], [.5, 1.65]], [[.4, 3.85], [-1.5, 4.3]], [[.4, 3.85], [-1.5, 2.0]]].forEach(function (s) {
      cs.add(new T.Line(new T.BufferGeometry().setFromPoints([V(s[0][0], s[0][1], -1.05), V(s[0][0], s[1][1], -1.05), V(s[1][0], s[1][1], -1.05)]), traceMat));
    });
    var cpu = new T.Group(); cs.add(cpu);
    rbox(1.18, 1.18, .06, 0x2d2846, .4, 3.85, -1.04, cpu, { r: .04 });
    rbox(.95, .95, .15, 0xdfe1ef, .4, 3.85, -.98, cpu, { r: .06 });
    [[-.2, .2], [.2, .2], [-.2, -.2], [.2, -.2]].forEach(function (o) { rbox(.3, .3, .05, 0x8b5cf6, .4 + o[0], 3.85 + o[1], -.89, cpu, { r: .04, hull: false, mo: { emissive: new T.Color(0x2a1066) } }); });
    tor(.6, .03, 0, .4, 3.85, -1.0, cpu, { mat: RGB(.55), hull: false });
    part('cpu', cpu, 'pc'); label('cpu', '🧠 CPU', 'pc', V(4.6, 4.6, -1.0));
    var ram = new T.Group(); cs.add(ram);
    for (var s = 0; s < 4; s++) {
      rbox(.1, 1.6, .45, 0x2b2f4f, 1.3 + s * .18, 3.75, -.85, ram, { r: .03 });
      rbox(.11, .12, .46, 0, 1.3 + s * .18, 4.6, -.85, ram, { mat: RGB(s * .12, .62), hull: false, r: .02 });
    }
    part('ram', ram, 'pc'); label('ram', '🧮 RAM', 'pc', V(5.8, 4.85, -1.0));
    var gpu = new T.Group(); cs.add(gpu);
    rbox(3.0, .42, 1.0, 0x5b3df5, -.3, 2.45, -.6, gpu, { r: .1 });
    rbox(2.7, .03, .1, 0, -.3, 2.67, -.13, gpu, { mat: RGB(.15), hull: false, r: 0 });
    rbox(.62, .18, .02, 0xffbe0b, .85, 2.45, -.095, gpu, { r: .01, hull: false });
    [-1.0, .4].forEach(function (x, i) { cyl(.38, .38, .04, 0x2d2846, x, 2.23, -.6, gpu, { hull: false }); tor(.36, .025, 0, x, 2.21, -.6, gpu, { mat: RGB(.4 + i * .2), hull: false, rot: [Math.PI / 2, 0, 0] }); });
    rbox(.06, .5, 1.0, 0xb8b8c8, -1.83, 2.45, -.6, gpu, { r: .02 });
    part('gpu', gpu, 'pc'); label('gpu', '🎨 GPU', 'pc', V(3.2, 2.95, -.3));
    var vram = new T.Group(); cs.add(vram);
    [-1.45, -1.0, -.55, .35, .8].forEach(function (x) { rbox(.34, .06, .34, 0x111827, x, 2.69, -.62, vram, { r: .02, mo: { emissive: new T.Color(0x1a1040) } }); });
    rbox(.6, .07, .55, 0xc9c9d6, -.1, 2.7, -.62, vram, { r: .03 });
    part('vram', vram, 'pc'); label('vram', '🎞️ VRAM chips', 'pc', V(3.0, 3.05, -1.25));
    label('v_pcie', '🛣️ PCIe bus', 'pc', V(3.5, 2.05, -.75), { cls: 'tiny' });
    label('v_fb', '🖼️ framebuffer (in VRAM)', 'pc', V(4.0, 3.3, -.35), { cls: 'tiny' });
    label('c_cache', '⚡ L1 · L2 · L3 caches (inside the CPU)', 'pc', V(4.6, 3.25, -.6), { cls: 'tiny' });
    label('c_pc', '📍 RIP = 0x6ab0 (next instruction)', 'pc', V(4.6, 4.95, -.4), { cls: 'tiny' });
    label('c_dec', '🔎 fetch → 🧩 decode → ⚙️ execute', 'pc', V(4.6, 3.25, -.6), { cls: 'tiny' });
    label('c_timer', '⏰ timer interrupt → kernel', 'pc', V(3.2, 2.4, -.2), { cls: 'tiny' });
    var ssd = new T.Group(); cs.add(ssd);
    rbox(1.6, .42, .06, 0x111827, .5, 1.65, -1.04, ssd, { r: .02 });
    rbox(1.3, .36, .1, 0x14d3e0, .45, 1.65, -.97, ssd, { r: .04 });
    part('ssd', ssd, 'pc'); label('ssd', '📚 SSD', 'pc', V(4.7, 1.25, -1.0));
    var uefi = rbox(.42, .42, .08, 0xffbe0b, -1.5, 2.0, -1.03, cs, { r: .03 });
    cyl(.18, .18, .05, 0xdadbe6, -1.0, 1.6, -1.03, cs, { rot: [Math.PI / 2, 0, 0] });
    part('uefi', uefi, 'pc'); label('uefi', '🧾 UEFI chip', 'pc', V(2.7, 1.6, -1.0));
    var nic = rbox(.45, .45, .08, 0x3a86ff, -1.5, 4.3, -1.03, cs, { r: .03 }); part('nic', nic, 'pc'); label('nic', '📮 Network card', 'pc', V(2.7, 4.8, -1.0));
    rbox(.14, .32, .36, 0xffbe0b, -2.37, 4.3, -.6, cs, { r: .03 }); sph(.035, 0, -2.45, 4.42, -.5, cs, { mat: GLOWM(0x3df2a8), hull: false });
    var psu = new T.Group(); cs.add(psu);
    rbox(4.2, 1.0, 2.0, 0x2d2846, 0, .6, 0, psu, { r: .08 });
    rbox(1.4, .14, .02, 0, .9, .6, 1.01, psu, { mat: RGB(.7), hull: false, r: 0 });
    part('psu', psu, 'pc'); label('psu', '⚡ Power supply', 'pc', V(4.2, .6, .6));
    // sleeved cables
    tube([[1.6, 1.1, .5], [1.9, 2.0, .2], [2.0, 3.0, -.5], [1.97, 3.2, -.9]].map(function (p) { return V(p[0] + 4.2, p[1], p[2] - .6); }), .07, 0xff4f8b, W);
    tube([[.6, 1.1, .3], [.9, 1.9, .2], [.8, 2.7, -.2]].map(function (p) { return V(p[0] + 4.2, p[1], p[2] - .6); }), .05, 0x14d3e0, W);
    tube([[1.9, 2.45, -1.2], [1.0, 1.0, -2.3], [-1.2, 1.6, -2.3], [-2.6, 2.2, -2.15]], .055, 0x2d2846, W);
    tube([[-2.6, .2, .05], [-1.0, .06, -.4], [1.0, .06, -.6], [1.9, 3.4, -.3]], .045, 0x9b87ff, W);
    // the internet: a bobbing cloud
    var cloud = new T.Group(); cloud.position.set(-1, 8.4, -6); W.add(cloud);
    [[0, 0, 0, 1.15], [1.15, -.25, 0, .85], [-1.15, -.3, 0, .8], [.45, .6, -.2, .82], [-.5, .45, .1, .7], [1.8, -.45, -.1, .55]].forEach(function (p) { sph(p[3], 0xf2f7ff, p[0], p[1], p[2], cloud, { th: .04 }); });
    part('cloud', cloud, 'pc'); label('cloud', '☁️ Internet', 'pc', V(-1, 10.1, -6));
    // device-file tags
    [['f_kbd', '/dev/input/event3', V(-2.6, .5, 2.2)], ['f_ssd', '/dev/nvme0n1', V(4.7, 1.0, -.6)], ['f_cpu', '/proc/cpuinfo', V(4.4, 4.45, -.3)],
     ['f_ram', '/proc/meminfo', V(6.1, 4.95, -.3)], ['f_nic', '/sys/class/net/eth0', V(2.6, 5.45, -.6)], ['f_gpu', '/dev/dri/card0', V(3.4, 3.0, .4)],
     ['f_mon', '/dev/tty1', V(-2.6, 4.95, -1.6)], ['f_uefi', '/sys/firmware/efi', V(2.6, 2.4, -.2)], ['f_psu', '/sys/class/power_supply', V(4.4, .2, .9)]].forEach(function (f) {
      label(f[0], '📄 ' + f[1], 'pc', f[2], { cls: 'file' });
    });
    anchors.pc = {
      cpu: V(4.6, 3.85, -1.3), ram: V(5.75, 3.75, -1.0), gpu: V(3.9, 2.45, -.55), ssd: V(4.7, 1.65, -1.4), uefi: V(2.7, 2.0, -1.4),
      nic: V(2.7, 4.3, -1.4), psu: V(4.2, .6, .5), power: V(6.0, 5.15, -.2), kbd: V(-2.6, .55, .9), mon: V(-2.6, 2.75, -1.5), cloud: V(-1, 8.2, -5.2),
      vram: V(3.6, 2.85, -1.1)
    };
    var ROUTES = {
      'kbd>cpu': [[-.6, .6, .5], [1.85, 3.3, -.2]], 'gpu>mon': [[1.8, 2.4, -1.0], [-.6, 2.5, -1.4]], 'cpu>mon': [[1.8, 2.4, -1.0], [-.6, 2.5, -1.4]],
      'nic>cloud': [[1.7, 4.3, -.9], [1.0, 6.6, -3.2]], 'vram>mon': [[1.8, 2.6, -1.0], [-.6, 2.5, -1.4]], 'ram>vram': [[5.3, 3.2, -.4], [4.4, 3.0, -.7]], 'power>psu': [[6.4, 3.5, .7], [5.6, 1.4, .8]], 'cpu>kbd': null
    };
    }

    if (need.cake) {
    /* =====================================================================
       WORLD: CAKE — Linux as a real layer cake (you are the cherry on top!)
       ===================================================================== */
    var WC = world('cake');
    cyl(6.3, 5.9, .26, 0xffffff, 0, -.14, 0, WC); tor(6.2, .09, 0x8ecae6, 0, -.02, 0, WC, { rot: [Math.PI / 2, 0, 0] });
    cyl(1.0, 1.4, 1.6, 0xffffff, 0, -1.1, 0, WC);
    var cakeL = []; for (var li = 0; li < 5; li++) { var gL = new T.Group(); WC.add(gL); cakeL.push(gL); }
    var hw = cyl(4.9, 4.9, 1.0, 0x7a4a2e, 0, .5, 0, cakeL[0], { seg: 48 }); tor(4.9, .14, 0xfff1e6, 0, 1.0, 0, cakeL[0], { rot: [Math.PI / 2, 0, 0], hull: false });
    part('hw', hw, 'cake'); label('l_hw', '🔩 Hardware', 'cake', hw, { off: [-5.6, 0, 2.2] });
    [['c_cpu', '🧠 CPU', 0xdfe1ef, -3.2], ['c_ram', '🧮 RAM', 0x00c48c, -1.5], ['c_ssd', '📚 SSD', 0x2d2846, .2], ['c_nic', '📮 NIC', 0x3a86ff, 1.9], ['c_gpu', '🎨 GPU', 0xff3d8b, 3.5]].forEach(function (cc) {
      var m = rbox(1.1, .32, 1.1, cc[2], cc[3], 1.18, .6, cakeL[0], { r: .12 }); part(cc[0], m, 'cake'); label(cc[0], cc[1], 'cake', m, { off: [0, .45, 0], cls: 'tiny' });
    });
    var kern = cyl(4.55, 4.55, 1.1, 0x8b5cf6, 0, 2.15, 0, cakeL[1], { seg: 48 }); tor(4.55, .15, 0xe2d4ff, 0, 2.7, 0, cakeL[1], { rot: [Math.PI / 2, 0, 0], hull: false });
    part('kern', kern, 'cake'); label('l_kern', '⚙️ Linux kernel', 'cake', kern, { off: [-5.3, 0, 2.2] });
    [['k_sched', '⏱️ Scheduler', 0xff3d8b, -3.3], ['k_mm', '🧮 Memory mgr', 0x00c48c, -2.0], ['k_vfs', '📁 VFS', 0xffbe0b, -.65], ['k_net', '🌐 Network', 0x3a86ff, .65], ['k_drv', '🔌 Drivers', 0xff7a1a, 2.0], ['k_ipc', '🔐 IPC/Security', 0x00b4d8, 3.3]].forEach(function (k) {
      var m = rbox(1.1, .5, 1.1, k[2], k[3], 2.97, .9, cakeL[1], { r: .2 }); part(k[0], m, 'cake'); label(k[0], k[1], 'cake', m, { off: [0, .5, 0], cls: 'tiny' });
    });
    var sys = cyl(4.55, 4.55, .24, 0xff9f43, 0, 3.7, 0, cakeL[2], { seg: 48 }); part('sys', sys, 'cake'); label('l_sys', '🚪 System calls', 'cake', sys, { off: [-5.4, 0, 2.2] });
    for (var dI = 0; dI < 7; dI++) { var ang = -1 + dI / 6 * 2; rbox(.42, .52, .1, 0xffffff, Math.sin(ang) * 4.45, 4.0, Math.cos(ang) * 4.45, cakeL[2], { r: .04, rot: [0, ang, 0] }); }
    var plane = new T.Mesh(new T.CircleGeometry(6.2, 48), new T.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: .18, side: T.DoubleSide, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2; plane.position.y = 3.42; plane.visible = false; cakeL[2].add(plane);
    label('l_plane', '🧱 kernel space ⬇ | ⬆ user space', 'cake', V(4.6, 3.42, 3.6));
    var lib = cyl(4.1, 4.1, .6, 0x14d3e0, 0, 4.25, 0, cakeL[3], { seg: 48 }); tor(4.1, .13, 0xc8f7fb, 0, 4.55, 0, cakeL[3], { rot: [Math.PI / 2, 0, 0], hull: false });
    part('lib', lib, 'cake'); label('l_lib', '📚 Libraries (glibc)', 'cake', lib, { off: [-5.0, 0, 2] });
    var spr = new T.InstancedMesh(rgeo(.07, .07, .26, .03, 1), M(0xffffff), 60), sm4 = new T.Matrix4(), sq = new T.Quaternion(), sv = new T.Vector3(1, 1, 1), sp4 = new T.Vector3(), se = new T.Euler();
    for (var si = 0; si < 60; si++) {
      var ra = Math.random() * Math.PI * 2, rr = 1.2 + Math.random() * 2.6; sp4.set(Math.cos(ra) * rr, 4.59, Math.sin(ra) * rr);
      if (sp4.z > -.2 && Math.abs(sp4.x) < 4.2 && sp4.z < 1.2) sp4.z -= 1.6;
      sq.setFromEuler(se.set(Math.PI / 2, 0, Math.random() * Math.PI)); sm4.compose(sp4, sq, sv); spr.setMatrixAt(si, sm4);
      spr.setColorAt(si, kcol.setHSL(Math.random(), .9, .62));
    }
    spr.instanceColor.needsUpdate = true; cakeL[3].add(spr);
    var apps = cakeL[4];
    var aB = rbox(1.2, .8, .9, 0x2d2846, -3, 4.95, .6, apps, { r: .12 }); rbox(.95, .5, .02, 0x14d3e0, -3, 5.0, 1.06, apps, { r: .02, hull: false });
    part('a_bash', aB, 'cake'); label('a_bash', '$ bash', 'cake', aB, { off: [0, .7, 0], cls: 'tiny' });
    var aF = sph(.5, 0xff7a1a, -1.2, 5.05, .6, apps); part('a_ff', aF, 'cake'); label('a_ff', '🦊 Firefox', 'cake', aF, { off: [0, .8, 0], cls: 'tiny' });
    var aP = cyl(.4, .4, .9, 0xffbe0b, .5, 5.0, .5, apps); part('a_py', aP, 'cake'); label('a_py', '🐍 Python', 'cake', aP, { off: [0, .75, 0], cls: 'tiny' });
    var aD = rbox(1.2, .7, .8, 0x3a86ff, 2.2, 4.9, .5, apps, { r: .12 }); part('a_docker', aD, 'cake'); label('a_docker', '🐳 Docker', 'cake', aD, { off: [0, .65, 0], cls: 'tiny' });
    var aV = rbox(.8, .8, .8, 0x00c48c, 3.4, 4.95, .4, apps, { r: .14 }); part('a_vim', aV, 'cake'); label('a_vim', '📝 Vim', 'cake', aV, { off: [0, .7, 0], cls: 'tiny' });
    var you = new T.Group(); apps.add(you);
    sph(.55, 0xef233c, 0, 5.15, -1.5, you, { sc: [1, .92, 1] }); sph(.12, 0xffffff, -.2, 5.35, -1.08, you, { hull: false, mat: GLOWM(0xffd6dc) });
    tube([[0, 5.6, -1.5], [.15, 6.1, -1.55], [.45, 6.45, -1.6]], .04, 0x2f8f3a, you); sph(.2, 0x3ccf7a, .62, 6.45, -1.6, you, { sc: [1.6, .5, .9] });
    part('you', you, 'cake'); label('l_you', '🍒 You — the cherry on top!', 'cake', V(0, 6.9, -1.5));
    label('l_apps', '🧩 Apps & shell', 'cake', V(-4.9, 5.0, 2.0));
    var cakeE = { cur: 0, to: 0 };
    var cakeAPI = { explode: function (v) { cakeE.to = v; }, plane: function (v) { plane.visible = v; } };
    }

    if (need.tree) {
    /* =====================================================================
       WORLD: TREE — the Linux folder tree as a real tree on an island
       ===================================================================== */
    var WT = world('tree');
    cyl(11.5, 10.8, .7, 0x5ccf6f, 0, -.35, 0, WT, { seg: 64 }); cyl(10.8, 7.5, 1.6, 0xa86f45, 0, -1.5, 0, WT, { seg: 64 });
    for (var fl = 0; fl < 16; fl++) { var fa = fl / 16 * Math.PI * 2 + .2, fr = 9.6 + (fl % 3) * .5; var fg = new T.Group(); fg.position.set(Math.cos(fa) * fr, 0, Math.sin(fa) * fr); WT.add(fg); cyl(.03, .03, .5, 0x2f8f3a, 0, .25, 0, fg, { hull: false }); sph(.16, [0xff3d8b, 0xffbe0b, 0x8338ec, 0xffffff][fl % 4], 0, .55, 0, fg); }
    var treeSpin = new T.Group(); WT.add(treeSpin);
    var bark = 0x9c6b43;
    cyl(.5, .85, 3.6, bark, 0, 1.8, 0, treeSpin); cyl(.9, 1.25, .45, bark, 0, .22, 0, treeSpin);
    var CAT = { prog: 0x3a86ff, conf: 0xff7a1a, user: 0xff3d8b, magic: 0x00c48c, vary: 0xffbe0b, boot: 0x8338ec, mount: 0x00b4d8 };
    function folder(col, parent, x, y, z) {
      var g = new T.Group(); g.position.set(x, y, z); parent.add(g);
      var c2 = new T.Color(col).lerp(new T.Color(0xffffff), .35).getHex();
      rbox(1.25, .88, .12, col, 0, 0, -.05, g, { r: .06 }); rbox(.5, .2, .12, col, -.37, .5, -.05, g, { r: .06 });
      rbox(1.25, .7, .08, c2, 0, -.09, .06, g, { r: .05, rot: [-.12, 0, 0] });
      return g;
    }
    function paper(parent, x, y, z) {
      var g = new T.Group(); g.position.set(x, y, z); parent.add(g);
      rbox(.56, .74, .05, 0xffffff, 0, 0, 0, g, { r: .02 });
      for (var l = 0; l < 3; l++) rbox(.34, .03, .01, 0xa8a3c2, 0, .16 - l * .14, .03, g, { r: 0, hull: false });
      return g;
    }
    var rootF = folder(0xffffff, treeSpin, 0, 1.15, 1.0); part('d_root', rootF, 'tree'); label('d_root', '/  (root) — it all starts here', 'tree', rootF, { off: [0, .8, 0] });
    var DIRS = [['bin', 'prog'], ['boot', 'boot'], ['dev', 'magic'], ['etc', 'conf'], ['home', 'user'], ['lib', 'prog'], ['media', 'mount'], ['mnt', 'mount'], ['opt', 'prog'], ['proc', 'magic'], ['root', 'user'], ['run', 'vary'], ['srv', 'mount'], ['sys', 'magic'], ['tmp', 'vary'], ['usr', 'prog'], ['var', 'vary']];
    var KIDS = { home: [['g_alice', 'alice/', 1], ['g_bob', 'bob/', 1]], etc: [['g_passwd', 'passwd'], ['g_hostname', 'hostname'], ['g_fstab', 'fstab']], dev: [['g_sda', 'sda'], ['g_null', 'null'], ['g_tty', 'tty1']],
      proc: [['g_p1', '1/', 1], ['g_cpuinfo', 'cpuinfo'], ['g_meminfo', 'meminfo']], var: [['g_log', 'log/', 1], ['g_cache', 'cache/', 1]], usr: [['g_usr_bin', 'bin/', 1], ['g_usr_lib', 'lib/', 1], ['g_usr_share', 'share/', 1]],
      boot: [['g_vmlinuz', 'vmlinuz'], ['g_grub', 'grub/', 1]], sys: [['g_class', 'class/', 1], ['g_block', 'block/', 1]] };
    var dirLabelIds = ['d_root'];
    DIRS.forEach(function (d, i) {
      var a = i / DIRS.length * Math.PI * 2, R = 6.2, y = 4.4 + (i % 3) * .5, x = Math.sin(a) * R, z = Math.cos(a) * R;
      var id = d[0] === 'root' ? 'd_root_home' : 'd_' + d[0];
      tube([V(0, 3.3, 0), V(x * .45, y - .3, z * .45), V(x * .92, y - .35, z * .92)], .11, bark, treeSpin, { seg: 20 });
      var f = folder(CAT[d[1]], treeSpin, x, y, z); f.rotation.y = a;
      part(id, f, 'tree'); label(id, '/' + d[0], 'tree', f, { off: [0, .78, 0] }); dirLabelIds.push(id);
      (KIDS[d[0]] || []).forEach(function (k, j, arr) {
        var aa = a + (j - (arr.length - 1) / 2) * .19, RR = 9.0, yy = y + 2.3 + (j % 2) * .45, xx = Math.sin(aa) * RR, zz = Math.cos(aa) * RR;
        tube([V(x, y + .3, z), V((x + xx) / 2, yy - .5, (z + zz) / 2), V(xx, yy - .45, zz)], .05, 0x7a8f3a, treeSpin, { seg: 16 });
        sph(.6, j % 2 ? 0x3ccf7a : 0x5ce08f, Math.sin(aa) * (RR + .55), yy + .1, Math.cos(aa) * (RR + .55), treeSpin, { th: .03 });
        var o = k[2] ? folder(CAT[d[1]], treeSpin, xx, yy, zz) : paper(treeSpin, xx, yy, zz); o.rotation.y = aa; if (k[2]) o.scale.setScalar(.7);
        part(k[0], o, 'tree'); label(k[0], k[1], 'tree', o, { off: [0, .62, 0], cls: 'tiny' });
      });
    });
    }

    if (need.ram) {
    /* =====================================================================
       WORLD: RAM — a giant memory stick full of page frames
       ===================================================================== */
    var WR = world('ram');
    var RCOL = { free: 0xfdfbf5, K: 0x8b5cf6, A: 0xff3d8b, B: 0x3a86ff, C: 0xff7a1a, S: 0x00c48c, $: 0x5fd3dc, X: 0xef4444 };
    rbox(8.6, 6.5, .2, 0x0f8a55, 0, 2.95, -.27, WR, { r: .1 });
    for (var gf = 0; gf < 34; gf++) rbox(.16, .34, .04, 0xffc83d, -3.96 + gf * .24, -.08, -.15, WR, { r: .02, hull: false });
    var frames = [], fCols = 8, fRows = 6;
    for (var fi = 0; fi < fCols * fRows; fi++) {
      var fx = -3.33 + (fi % fCols) * .95, fy = 5.4 - Math.floor(fi / fCols) * .95;
      var fm = rbox(.82, .82, .3, RCOL.free, fx, fy, 0, WR, { r: .1 });
      fm.userData.target = new T.Color(RCOL.free); frames.push(fm);
      anchors['r_f' + fi] = V(fx, fy, .3);
    }
    label('r_title', '🧮 Physical RAM — 48 page frames × 4 KB', 'ram', V(0, 6.5, 0));
    label('r_legend', '⬅ virtual pages of each process · 🟪 kernel · ⬜ free · 🟦 page cache · 🟩 shared', 'ram', V(-1.5, -.45, 0), { cls: 'tiny' });
    var vcols = { A: -9.4, B: -7.7, C: -6.0 }, vpages = {};
    Object.keys(vcols).forEach(function (p) {
      var g = new T.Group(); WR.add(g); vpages[p] = { g: g, pages: [] };
      rbox(1.4, .42, .3, RCOL[p], vcols[p], 5.75, 0, g, { r: .12 });
      for (var v = 0; v < 6; v++) { var pm = rbox(1.2, .55, .2, new T.Color(RCOL[p]).lerp(new T.Color(0xffffff), .15).getHex(), vcols[p], 5.05 - v * .76, 0, g, { r: .08 }); vpages[p].pages.push(pm); }
      label('r_' + p, { A: '🦊 A', B: '🎵 B', C: '🎮 C' }[p], 'ram', V(vcols[p], 6.05, 0), { cls: 'tiny' });
    });
    rbox(2.4, 3.6, 1.0, 0x1d2238, 7.9, 2.6, 0, WR, { r: .14 });
    rbox(2.0, .5, .12, 0x14d3e0, 7.9, 3.85, .52, WR, { r: .05 });
    label('r_ssd', '📚 SSD (files + swap)', 'ram', V(7.9, 4.95, 0));
    anchors.r_ssd = V(7.9, 3.8, .6);
    var swapSlots = [];
    for (var sI = 0; sI < 4; sI++) { var smm = rbox(.8, .45, .1, 0x55535f, 7.5 + (sI % 2) * .85, 2.0 - Math.floor(sI / 2) * .6, .55, WR, { r: .05 }); swapSlots.push(smm); smm.userData.target = new T.Color(0x55535f); anchors['r_swap' + sI] = V(7.5 + (sI % 2) * .85, 2.0 - Math.floor(sI / 2) * .6, .7); }
    label('r_swap', '💤 swap area', 'ram', V(7.9, .9, .6), { cls: 'tiny' });
    label('r_shared', '🟩 libc — shared by A & B', 'ram', V(.47, 5.4 - 2 * .95 + .55, .3), { cls: 'tiny' });
    label('r_oom', '💥 OOM killer: killed Game C', 'ram', V(0, 2.8, .8), { cls: 'tiny' });
    var mapLines = new T.Group(); WR.add(mapLines);
    function ramState(k) {
      var own = new Array(48).fill(null), maps = [], swap = [null, null, null, null], procs = [];
      for (var i = 0; i < 6; i++) own[i] = 'K';
      if (k >= 1) { procs.push('A'); [9, 17, 22, 30, 41].forEach(function (f, v) { own[f] = 'A'; maps.push(['A', v, f]); }); }
      if (k >= 2) { procs.push('B'); [12, 14, 27, 35, 44].forEach(function (f, v) { own[f] = 'B'; maps.push(['B', v, f]); }); }
      if (k >= 3) { own[20] = 'S'; maps.push(['A', 5, 20], ['B', 5, 20]); }
      var cache = [6, 7, 8, 10, 11, 13, 15, 16, 18, 19];
      if (k >= 4 && k < 6) cache.forEach(function (f) { own[f] = '$'; });
      if (k >= 5 && k < 8) { procs.push('C'); var cf = [23, 24, 25, 26, 28, 29, 31, 32, 33, 34, 36, 37, 38, 39, 40, 42, 43, 45, 46, 47]; cf.forEach(function (f, i2) { own[f] = 'C'; if (i2 < 6) maps.push(['C', i2, f]); }); }
      if (k >= 6 && k < 8) cache.forEach(function (f) { own[f] = 'C'; });
      if (k === 7) { own[17] = 'C'; own[30] = 'C'; maps = maps.filter(function (m) { return !(m[0] === 'A' && (m[1] === 1 || m[1] === 3)); }); swap[0] = 'A'; swap[1] = 'A'; maps.push(['A', 1, 's0'], ['A', 3, 's1']); }
      if (k >= 8) { maps = maps.filter(function (m) { return m[0] !== 'C' && !(m[0] === 'A' && (m[1] === 1 || m[1] === 3)); }); swap[0] = 'A'; swap[1] = 'A'; maps.push(['A', 1, 's0'], ['A', 3, 's1']); own[17] = null; own[30] = null; if (k === 8) { [23, 24, 25, 26, 28, 29].forEach(function (f) { own[f] = 'X'; }); } }
      if (k >= 9) { own[6] = '$'; own[7] = '$'; own[8] = '$'; }
      return { own: own, maps: maps, swap: swap, procs: procs };
    }
    var mapMats = {};
    ramSet = function (k) {
      var st = ramState(k);
      frames.forEach(function (f, i) { f.userData.target.setHex(RCOL[st.own[i] || 'free']); });
      swapSlots.forEach(function (s, i) { s.userData.target.setHex(st.swap[i] ? RCOL[st.swap[i]] : 0x55535f); });
      ['A', 'B', 'C'].forEach(function (p) { vpages[p].g.visible = st.procs.indexOf(p) >= 0; });
      while (mapLines.children.length) { var ch = mapLines.children.pop(); ch.geometry.dispose(); }
      st.maps.forEach(function (m) {
        var pg = vpages[m[0]].pages[m[1]]; var a = pg.position.clone(); a.x += .6; a.z += .05;
        var b = typeof m[2] === 'string' ? anchors['r_swap' + m[2].slice(1)].clone() : frames[m[2]].position.clone();
        b.x -= typeof m[2] === 'string' ? .4 : .41; b.z += .1;
        var mid = a.clone().lerp(b, .5); mid.z += .9;
        tube([a, mid, b], .028, 0, mapLines, { seg: 24, cast: false, mat: mapMats[m[0]] || (mapMats[m[0]] = GLOWM(RCOL[m[0]])) });
      });
    }
    }

    if (need.ctr) {
    /* =====================================================================
       WORLD: CONTAINERS — a container ship: one hull (kernel), many boxes
       ===================================================================== */
    var WX = world('ctr');
    var water = new T.Mesh(new T.CircleGeometry(22, 64), new T.MeshToonMaterial({ color: 0x2f8cff, gradientMap: grad })); water.rotation.x = -Math.PI / 2; water.position.y = -.25; water.receiveShadow = true; WX.add(water);
    var foam = new T.Mesh(new T.RingGeometry(8.2, 8.7, 64), new T.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: .6 })); foam.rotation.x = -Math.PI / 2; foam.position.y = -.24; foam.scale.set(1, .55, 1); WX.add(foam);
    var ship = new T.Group(); WX.add(ship);
    function hullGeo(h) {
      var sh = new T.Shape(); sh.moveTo(-6.6, -3.1); sh.lineTo(5.3, -3.1); sh.quadraticCurveTo(7.6, -1.6, 7.9, 0); sh.quadraticCurveTo(7.6, 1.6, 5.3, 3.1); sh.lineTo(-6.6, 3.1); sh.quadraticCurveTo(-7.1, 0, -6.6, -3.1);
      var g = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 16 });
      g.rotateX(-Math.PI / 2); g.center(); g.computeBoundingBox(); return g;
    }
    mesh(hullGeo(.3), M(0xef4444), 0, 0, 0, ship);
    var xhw = mesh(hullGeo(.5), M(0x1f3f80), 0, .42, 0, ship);
    label('x_hw', '🔩 Hardware (the ship\'s hull)', 'ctr', V(-5.6, .35, 3.3));
    var xk = rbox(12.4, .9, 5.6, 0x8b5cf6, 0, 1.2, 0, ship, { r: .12 }); part('xkern', xk, 'ctr'); label('x_kern', '⚙️ ONE shared Linux kernel (the deck)', 'ctr', V(0, 1.2, 3.2));
    for (var rp = 0; rp < 13; rp++) { cyl(.035, .035, .5, 0xffffff, -6 + rp, 1.9, 2.75, ship, { hull: false }); cyl(.035, .035, .5, 0xffffff, -6 + rp, 1.9, -2.75, ship, { hull: false }); }
    tube([[-6, 2.15, 2.75], [6, 2.15, 2.75]], .035, 0xffffff, ship, { seg: 4 }); tube([[-6, 2.15, -2.75], [6, 2.15, -2.75]], .035, 0xffffff, ship, { seg: 4 });
    [['k_ns', 'namespaces', 0xffbe0b, -4.5], ['k_cg', 'cgroups', 0x00c48c, -1.5], ['k_ovl', 'overlayfs', 0x00b4d8, 1.5], ['k_bridge', 'docker0 bridge', 0x3a86ff, 4.5]].forEach(function (t) {
      var m = rbox(1.9, .42, .14, t[2], t[3], 1.2, 2.86, ship, { r: .06 }); part(t[0], m, 'ctr');
      if (t[0] !== 'k_bridge') label('x' + t[0], t[1], 'ctr', V(t[3], 1.75, 3.2), { cls: 'tiny' });
    });
    label('x_bridge', '🔌 docker0 bridge', 'ctr', V(4.5, 1.75, 3.2), { cls: 'tiny' });
    var CT = [['web', 'nginx', 0xff3d8b, -4.2, 3, [4123, 4150, 4151]], ['api', 'python', 0xffbe0b, 0, 2, [5207, 5230]], ['db', 'postgres', 0x00c48c, 4.2, 3, [6011, 6044, 6045]]];
    var ctrs = {};
    var ribGeo = bgeo(.07, 2.1, .06), ribGeoS = bgeo(.06, 2.1, .07);
    CT.forEach(function (c) {
      var g = new T.Group(); g.position.set(c[3], 0, 0); ship.add(g);
      var layers = [];
      [[1.75, 0xb7bccb], [1.9, 0xa5b4fc], [2.05, 0x93c5fd]].forEach(function (l) { layers.push(rbox(2.8, .12, 2.8, l[1], 0, l[0], 0, g, { r: .04 })); });
      layers.push(rbox(2.8, .12, 2.8, 0xffdf6b, 0, 2.2, 0, g, { r: .04 }));
      // shipping-container shell: see-through walls with corrugated ribs, solid corner posts
      var gmat = new T.MeshToonMaterial({ color: c[2], gradientMap: grad, transparent: true, opacity: .22, depthWrite: false });
      var shell = new T.Mesh(bgeo(2.8, 2.3, 2.8), gmat); shell.position.set(0, 3.45, 0); g.add(shell);
      edgesOf(shell, new T.LineBasicMaterial({ color: new T.Color(c[2]).multiplyScalar(.6) }));
      for (var rb = 0; rb < 11; rb++) {
        var rx = -1.25 + rb * .25;
        [1.42, -1.42].forEach(function (z) { var m1 = new T.Mesh(ribGeo, gmat); m1.position.set(rx, 3.45, z); g.add(m1); });
        [1.42, -1.42].forEach(function (x) { var m2 = new T.Mesh(ribGeoS, gmat); m2.position.set(x, 3.45, rx); g.add(m2); });
      }
      var post = new T.Color(c[2]).multiplyScalar(.75).getHex();
      [[-1.38, -1.38], [1.38, -1.38], [-1.38, 1.38], [1.38, 1.38]].forEach(function (p) { rbox(.14, 2.4, .14, post, p[0], 3.45, p[1], g, { r: .03 }); });
      rbox(.05, 2.0, .05, 0xd9d9e3, 1.45, 3.45, .35, g, { r: 0, hull: false }); rbox(.05, 2.0, .05, 0xd9d9e3, 1.45, 3.45, -.35, g, { r: 0, hull: false });
      // processes are little blob characters
      var procs = [];
      for (var p = 0; p < c[4]; p++) {
        var bg = new T.Group(); bg.position.set(-.7 + p * .75, p ? 3.0 : 3.6, .3 - p * .3); g.add(bg);
        var rad = p ? .24 : .32; sph(rad, c[2], 0, 0, 0, bg);
        [-1, 1].forEach(function (sx) { sph(rad * .28, 0xffffff, sx * rad * .35, rad * .25, rad * .85, bg, { hull: false }); sph(rad * .14, 0x111111, sx * rad * .35, rad * .25, rad * 1.05, bg, { hull: false }); });
        procs.push(bg);
      }
      var mats = []; g.traverse(function (o) { if (o.isMesh && o.material && o.material.emissive && !o.userData.hull) { if (!o.material.userData.baseE) o.material.userData.baseE = o.material.emissive.clone(); if (mats.indexOf(o.material) < 0) mats.push(o.material); } });
      var hl = []; g.traverse(function (o) { if (o.userData.hull) hl.push(o); });
      parts['c_' + c[0]] = { obj: g, mats: mats, hulls: hl, world: 'ctr' };
      var mt = new T.Group(); mt.position.set(1.65, 2.35, 1.2); g.add(mt);
      var meters = [];
      [0, .3].forEach(function (dx, mi) {
        var bgm = new T.Mesh(rgeo(.2, 2.2, .2, .08, 2), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35 })); bgm.position.set(dx, 1.1, 0); mt.add(bgm);
        var fill = new T.Mesh(bgeo(.15, 1, .15), new T.MeshBasicMaterial({ color: mi ? 0x00c48c : 0x3a86ff })); fill.position.set(dx, 0, 0); mt.add(fill);
        meters.push({ m: fill, v: .1, to: .3 });
      });
      mt.visible = false;
      ctrs[c[0]] = { g: g, glass: gmat, procs: procs, layers: layers, meter: mt, meters: meters, pids: c[5], name: c[1] };
      label('x_' + c[0], '📦 ' + c[0] + ' <small>(' + c[1] + ')</small>', 'ctr', V(c[3], 5.1, 0));
      procs.forEach(function (pm, pi) { label('p_' + c[0][0] + (pi + 1), pi ? 'worker' : 'PID 1', 'ctr', pm, { off: [0, .5, 0], cls: 'tiny' }); });
      label('m_' + c[0], '🦮 CPU | MEM', 'ctr', mt, { off: [.15, 2.55, 0], cls: 'tiny' });
    });
    label('n_pid', '🙈 pid ns: own PID 1', 'ctr', V(-6.2, 4.4, 1.5), { cls: 'tiny' });
    label('n_net', '🌐 net ns: own eth0', 'ctr', V(-2.2, 4.4, 1.5), { cls: 'tiny' });
    label('n_mnt', '📁 mnt ns: own /', 'ctr', V(-6.2, 2.6, 1.5), { cls: 'tiny' });
    label('n_uts', '🏷️ uts ns: hostname web', 'ctr', V(-4.2, 5.7, 0), { cls: 'tiny' });
    label('ly_base', '📀 ubuntu base (read-only)', 'ctr', V(-6.4, 1.75, 1.4), { cls: 'tiny' });
    label('ly_mid', '🐍 + python layer', 'ctr', V(-.2, 1.9, 1.6), { cls: 'tiny' });
    label('ly_top', '📝 + app code layer', 'ctr', V(6.2, 2.05, 1.4), { cls: 'tiny' });
    label('ly_rw', '✏️ writable container layer', 'ctr', V(0, 2.6, 1.6), { cls: 'tiny' });
    // the docker control tower on a little pier
    var pier = new T.Group(); WX.add(pier);
    rbox(3.0, .3, 3.0, 0xc9803c, -9.4, .05, 0, pier, { r: .08 });
    [[-10.7, -1.3], [-8.1, -1.3], [-10.7, 1.3], [-8.1, 1.3]].forEach(function (p) { cyl(.14, .14, 1.0, 0x9c6b43, p[0], -.4, p[1], pier); });
    cyl(.12, .12, 4.6, 0xdadbe6, -9.4, 2.4, -.2, pier);
    var dchain = [['d_cli', '$ docker run', 0x2d2846, 5.0], ['d_dockerd', 'dockerd', 0x3a86ff, 3.95], ['d_containerd', 'containerd', 0x00b4d8, 2.9], ['d_runc', 'runc', 0xff7a1a, 1.85]];
    dchain.forEach(function (d) { var m = rbox(1.8, .62, .9, d[2], -9.4, d[3], 0, pier, { r: .14 }); part(d[0], m, 'ctr'); label('x_' + d[0].slice(2), d[1], 'ctr', m, { off: [0, 0, .7], cls: 'tiny' }); });
    var ctrState = {};
    var ctrAPI = {
      set: function (s) {
        ctrState = s; ctrAPI._t = (ctrAPI._t || 0) + 1;
        Object.keys(ctrs).forEach(function (k) {
          var c = ctrs[k]; c.glass.opacity = s.glass != null ? s.glass : (s.ns ? .45 : .22);
          c.meter.visible = !!s.cg; c.meters.forEach(function (m, i) { m.to = [.35, .5][i]; m.m.material.color.setHex(i ? 0x00c48c : 0x3a86ff); });
          c.procs.forEach(function (p) { p.scale.setScalar(1); p.visible = true; });
          c.g.scale.setScalar(1); c.g.visible = true;
          c.procs.forEach(function (p, pi) { labels['p_' + k[0] + (pi + 1)].el.innerHTML = s.hostPids ? ('PID ' + c.pids[pi]) : (pi ? 'worker' : 'PID 1'); });
        });
        if (s.hideApi) { ctrs.api.g.visible = false; }
        if (s.growApi) { ctrs.api.g.scale.setScalar(.01); ctrs.api.grow = 0; }
      },
      oom: function () {
        var t = ctrAPI._t, db = ctrs.db, mm = db.meters[1];
        setTimeout(function () { if (t !== ctrAPI._t) return; mm.to = .98; }, 900);
        setTimeout(function () { if (t !== ctrAPI._t) return; mm.m.material.color.setHex(0xef4444); }, 1900);
        setTimeout(function () { if (t !== ctrAPI._t) return; db.procs.forEach(function (p) { p.visible = false; }); mm.to = .05; }, 2700);
        setTimeout(function () { if (t !== ctrAPI._t) return; db.procs.forEach(function (p) { p.visible = true; p.scale.setScalar(.01); }); db.pop = 0; mm.m.material.color.setHex(0x00c48c); mm.to = .35; }, 3900);
      }
    };
    }

    function topAnchors(w, list, lift) {
      anchors[w] = anchors[w] || {};
      list.forEach(function (id) {
        var p = parts[id]; if (!p) return;
        var bx = new T.Box3().setFromObject(p.obj), c = bx.getCenter(V(0, 0, 0)); c.y = bx.max.y + (lift == null ? .3 : lift); anchors[w][id] = c;
      });
    }
    function segTube(a, b, r, mat, parent) {
      var m = new T.Mesh(new T.TubeGeometry(new T.LineCurve3(V(a[0], a[1], a[2]), V(b[0], b[1], b[2])), 1, r, 6), mat); parent.add(m); return m;
    }

    /* =====================================================================
       WORLD: CHIP — inside a CPU, zoomed ~10,000×
       ===================================================================== */
    var chipAPI = null;
    if (need.chip) {
      var WCH = world('chip');
      rbox(15, .4, 10, 0x1f7a4c, 0, -.2, .4, WCH, { r: .15 });
      for (var cp = 0; cp < 26; cp++) rbox(.14, .1, .3, 0xffc83d, -7 + cp * .56, -.36, 5.42, WCH, { r: .02, hull: false });
      rbox(12.8, .3, 8.0, 0x2a2350, 0, .15, .4, WCH, { r: .08 });
      var goldM = GLOWM(0xffd36b);
      var unit = function (id, w, h, d, col, x, z, base, parent, txt) {
        var m = rbox(w, h, d, col, x, base + h / 2, z, parent || WCH, { r: Math.min(.12, h / 2 - .01) });
        part(id, m, 'chip'); if (txt) label(id, txt, 'chip', V(x, base + h + .35, z), { cls: 'tiny' }); return m;
      };
      // core 0, zoomed in
      rbox(5.6, .12, 4.2, 0x3a2f6b, -3.2, .36, 1.9, WCH, { r: .06 });
      unit('u_l2', 2.0, .5, 1.2, 0x14d3e0, -1.6, .6, .42, null, '🗄️ L2 cache');
      unit('u_l1i', 1.1, .45, 1.0, 0xff7a1a, -3.3, .6, .42, null, '📥 L1i (instructions)');
      unit('u_fetch', 1.2, .55, 1.0, 0xffbe0b, -5.1, .6, .42, null, '🔎 fetch');
      unit('u_bp', 1.0, .4, .8, 0xb48cff, -3.4, 1.95, .42, null, '🔮 branch predictor');
      unit('u_dec', 1.2, .55, 1.0, 0x3a86ff, -5.1, 2.0, .42, null, '🧩 decoder');
      var alus = new T.Group(); WCH.add(alus);
      [-5.4, -4.65, -3.9].forEach(function (x) { rbox(.6, .6, .6, 0xff3d8b, x, .72, 3.4, alus, { r: .12 }); });
      part('u_alu', alus, 'chip'); label('u_alu', '⚙️ ALUs (do the math)', 'chip', V(-4.65, 1.4, 3.4), { cls: 'tiny' });
      var regs = new T.Group(); WCH.add(regs);
      rbox(2.0, .1, .6, 0x1f6f4a, -2.15, .47, 3.4, regs, { r: .04 });
      for (var rg = 0; rg < 8; rg++) rbox(.19, .32, .45, rg ? 0x3df2a8 : 0xff3d8b, -2.95 + rg * .23, .68, 3.4, regs, { r: .04, mo: rg ? null : { emissive: new T.Color(0x5a0a2a) } });
      part('u_reg', regs, 'chip'); label('u_reg', '📍 registers · pink = RIP (next instruction)', 'chip', V(-2.15, 1.25, 3.4), { cls: 'tiny' });
      unit('u_l1d', .9, .45, .9, 0xffb38a, -.85, 3.35, .42, null, '📦 L1d (data)');
      label('u_core0', '🧠 Core 0 (zoomed in)', 'chip', V(-3.2, .5, 4.35));
      // cores 1-3
      [1.15, 3.2, 5.25].forEach(function (cx, ci) {
        var g = new T.Group(); WCH.add(g);
        rbox(1.9, .12, 4.2, 0x3a2f6b, cx, .36, 1.9, g, { r: .06 });
        rbox(1.5, .45, 1.0, 0x14d3e0, cx, .65, .6, g, { r: .1 }); rbox(.7, .35, .6, 0xff7a1a, cx - .4, .6, 1.8, g, { r: .08 });
        rbox(.6, .4, .6, 0xffbe0b, cx + .45, .62, 1.8, g, { r: .08 }); rbox(.6, .35, .6, 0x3a86ff, cx + .45, .6, 2.6, g, { r: .08 });
        [-.5, 0, .5].forEach(function (dx) { rbox(.38, .38, .38, 0xff3d8b, cx + dx, .61, 3.4, g, { r: .08 }); });
        part('u_core' + (ci + 1), g, 'chip');
      });
      label('u_cores', '🧠🧠🧠 cores 1–3: other programs, at the same time', 'chip', V(3.2, 1.3, 4.35), { cls: 'tiny' });
      // shared parts of the chip
      unit('u_l3', 12.2, .4, 1.0, 0x00b4d8, 0, -.9, .3, null, '🗄️ L3 cache (shared by all cores)');
      unit('u_mc', 3.0, .45, .9, 0x9aa3b8, 4.0, -2.6, .3, null, '🚦 memory controller');
      unit('u_io', 2.4, .4, .9, 0x6d5fc0, 0, -2.6, .3, null, '🛣️ PCIe / I/O');
      unit('u_apic', 1.6, .45, .9, 0xff3b5c, -4.4, -2.6, .3, null, '⏰ timer + interrupt controller');
      cyl(.3, .3, .08, 0xffffff, -4.4, .8, -2.6, WCH, { hull: false });
      // RAM outside the chip
      var ramC = new T.Group(); WCH.add(ramC);
      [8.4, 8.95].forEach(function (x, i) { rbox(.26, 2.4, 3.6, 0x2b2f4f, x, 1.2, -1.5, ramC, { r: .05 }); rbox(.27, .12, 3.6, 0, x, 2.46, -1.5, ramC, { mat: RGB(i * .2), hull: false, r: .02 }); });
      part('u_ram', ramC, 'chip'); label('u_ram', '🧮 RAM: your program + the kernel live here', 'chip', V(8.7, 3.0, -1.5), { cls: 'tiny' });
      // golden wires
      [[[5.5, .58, -2.6], [8.2, .58, -2.0]], [[4, .62, -1.4], [4, .62, -2.15]], [[-1.6, .62, -.4], [-1.6, .62, 0]], [[-2.6, .62, .6], [-2.75, .62, .6]],
       [[-3.85, .62, .6], [-4.5, .62, .6]], [[-5.1, .62, 1.1], [-5.1, .62, 1.5]], [[-5.1, .62, 2.5], [-5.1, .62, 3.1]], [[-3.6, .62, 3.4], [-3.15, .62, 3.4]],
       [[-3.9, .62, 3.0], [-3.9, .62, 2.2]], [[-1.15, .62, 3.4], [-1.3, .62, 3.4]], [[-.85, .62, 2.9], [-1.0, .62, 1.2]],
       [[-4.4, .58, -2.1], [-5.7, .58, -.9]], [[-5.7, .58, -.9], [-5.6, .58, .1]]].forEach(function (s) { segTube(s[0], s[1], .035, goldM, WCH); });
      label('u_mode', '👤 user mode — your program is running', 'chip', V(-.5, 3.4, -3.6));
      topAnchors('chip', ['u_ram', 'u_mc', 'u_l3', 'u_io', 'u_apic', 'u_l2', 'u_l1i', 'u_fetch', 'u_bp', 'u_dec', 'u_alu', 'u_reg', 'u_l1d', 'u_core1', 'u_core2', 'u_core3']);
      chipAPI = {
        mode: function (m) {
          var L2 = labels.u_mode; L2.el.innerHTML = m === 'kernel' ? '👑 kernel mode — the OS is running' : '👤 user mode — your program is running';
          L2.el.classList.toggle('hot', m === 'kernel');
        }
      };
    }

    /* =====================================================================
       WORLD: PIPE — the pipeline factory
       ===================================================================== */
    var pipeAPI = null;
    if (need.pipe) {
      var WP = world('pipe');
      rbox(23, .3, 6.5, 0xe9e2ff, 0, -.15, 0, WP, { r: .12 });
      rbox(20.5, .36, 1.8, 0x2d2846, 0, .2, 0, WP, { r: .12 });
      for (var bs = 0; bs < 20; bs++) rbox(.5, .02, .1, 0xffbe0b, -9.5 + bs, .39, 0, WP, { r: 0, hull: false, cast: false });
      var ST = [['F', '🔎 fetch', 0xffbe0b], ['D', '🧩 decode', 0x3a86ff], ['E', '⚙️ execute', 0xff3d8b], ['M', '📦 memory', 0x00c48c], ['W', '✍️ write back', 0x8338ec]];
      var lamps = [];
      ST.forEach(function (s, i) {
        var x = -6 + i * 3, g = new T.Group(); WP.add(g);
        [[-.95, -1.25], [.95, -1.25], [-.95, 1.25], [.95, 1.25]].forEach(function (p) { rbox(.28, 2.6, .28, 0xf4f2ff, x + p[0], 1.3, p[1], g, { r: .08 }); });
        rbox(2.3, .4, 2.9, s[2], x, 2.75, 0, g, { r: .14 });
        var lm = new T.MeshBasicMaterial({ color: 0x555566 }); sph(.24, 0, x, 3.22, 0, g, { mat: lm, hull: false }); lamps.push({ m: lm, c: s[2] });
        part('st_' + s[0], g, 'pipe'); label('st_' + s[0], '<b>' + s[0] + '</b> ' + s[1], 'pipe', V(x, 3.75, 0));
      });
      var hop = rbox(1.8, 1.8, 2.2, 0xff7a1a, -9.7, .9, 0, WP, { r: .15 }); part('p_l1i', hop, 'pipe'); label('p_l1i', '📥 L1i: instructions arrive', 'pipe', V(-9.7, 2.2, 0), { cls: 'tiny' });
      var bin = new T.Group(); WP.add(bin);
      rbox(2.0, .2, 2.2, 0x00c48c, 9.8, .1, 0, bin, { r: .06 }); rbox(.15, .9, 2.2, 0x00c48c, 8.85, .5, 0, bin, { r: .05 }); rbox(.15, .9, 2.2, 0x00c48c, 10.75, .5, 0, bin, { r: .05 });
      rbox(2.0, .9, .15, 0x00c48c, 9.8, .5, -1.05, bin, { r: .05 });
      part('p_done', bin, 'pipe'); label('p_done', '✅ finished', 'pipe', V(9.8, 1.6, 0), { cls: 'tiny' });
      label('p_count', 'cycle 1', 'pipe', V(0, 4.7, 0));
      var IB = [], ICOL = [0xff3d8b, 0xffbe0b, 0x3a86ff, 0x00c48c, 0xff7a1a, 0x8338ec, 0x00b4d8, 0xffd166];
      for (var ib = 0; ib < 9; ib++) {
        var im = M(0xffffff), b = rbox(.85, .85, .85, 0, 0, .8, 0, WP, { mat: im, r: .14 }); b.visible = false;
        IB.push({ m: b, mat: im, lbl: label('ib' + ib, '', 'pipe', b, { off: [0, .75, 0], cls: 'tiny' }) });
      }
      var PROG = {
        seq: { tick: 650, name: '🐢 one at a time', list: [0, 1, 2, 3, 4].map(function (i) { return { n: 'I' + (i + 1), s: 5 * i, c: ICOL[i] }; }), end: 27 },
        pipe: { tick: 1000, name: '🏎️ pipelined', list: [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return { n: 'I' + (i + 1), s: i, c: ICOL[i] }; }), end: 15 },
        flush: { tick: 1150, name: '🔀 wrong guess → flush', list: [{ n: 'I1', s: 0, c: ICOL[0] }, { n: 'I2', s: 1, c: ICOL[1] }, { n: 'I3 jump?', s: 2, c: ICOL[2] }, { n: 'guess ✗', s: 3, c: 0xef4444, die: 5 }, { n: 'guess ✗', s: 4, c: 0xef4444, die: 5 }, { n: 'I4 ✓', s: 5, c: ICOL[3] }, { n: 'I5 ✓', s: 6, c: ICOL[4] }], end: 14 }
      };
      var ps = { mode: 'pipe', t0: performance.now() };
      pipeAPI = {
        set: function (m) {
          ps.mode = m; ps.t0 = performance.now(); var P = PROG[m];
          IB.forEach(function (bx, i) { var it = P.list[i]; bx.it = it; bx.m.visible = false; bx.m.scale.setScalar(1); if (it) { bx.mat.color.setHex(it.c); bx.lbl.el.innerHTML = it.n; } });
        }
      };
      var easeF = function (f) { f = Math.min(1, f / .4); return f * f * (3 - 2 * f); };
      updaters.push(function (now) {
        if (!WP.visible) return;
        var P = PROG[ps.mode], tf = (now - ps.t0) / P.tick;
        if (tf > P.end) { ps.t0 = now; tf = 0; }
        var busy = [0, 0, 0, 0, 0], done = 0;
        IB.forEach(function (bx) {
          var it = bx.it, pos = it ? tf - it.s : -1;
          if (!it || pos < 0 || (it.die && tf >= it.die + .35)) { bx.m.visible = false; bx.lbl.el.style.display = 'none'; return; }
          bx.m.visible = true; bx.lbl.el.style.display = '';
          var k = Math.floor(pos), f = pos - k, x, y = .8, z = 0;
          if (k <= 4) { x = -6 + 3 * (k - 1 + easeF(f)); if (f >= .4) busy[k] = 1; }
          else if (k === 5 && f < .4) { x = -6 + 3 * (4 + easeF(f)); }
          else { var d = done; x = 9.35 + (d % 3) * .45; z = -.45 + Math.floor(d / 3) * .45; y = .55 + .1; bx.m.scale.setScalar(.5); }
          if (k < 5 || (k === 5 && f < .4)) bx.m.scale.setScalar(1);
          if (it.die && tf >= it.die) bx.m.scale.setScalar(Math.max(.01, 1 - (tf - it.die) * 3));
          if (k >= 5 && !(k === 5 && f < .4) && !it.die) done++;
          bx.m.position.set(x, y, z);
        });
        lamps.forEach(function (l, i) { l.m.color.setHex(busy[i] ? l.c : 0x555566); });
        labels.p_count.el.innerHTML = P.name + ' · cycle <b>' + Math.max(1, Math.floor(tf) + 1) + '</b> · finished <b>' + done + '</b>';
      });
      topAnchors('pipe', ['p_l1i', 'p_done', 'st_F', 'st_D', 'st_E', 'st_M', 'st_W']);
    }

    /* =====================================================================
       WORLD: PFAULT — the journey of one memory access
       ===================================================================== */
    var pfAPI = null;
    if (need.pfault) {
      var WF = world('pfault');
      rbox(21, .3, 9.2, 0xe9e2ff, 0, -.15, 0, WF, { r: .15 });
      var procG = new T.Group(); procG.position.set(-8.6, 0, 1.2); WF.add(procG);
      var pBodyM = M(0xff3d8b); sph(.75, 0, 0, .8, 0, procG, { mat: pBodyM });
      [-1, 1].forEach(function (sx) { sph(.2, 0xffffff, sx * .27, 1.0, .62, procG, { hull: false }); sph(.1, 0x111111, sx * .27, 1.0, .8, procG, { hull: false }); });
      rbox(.9, .55, .06, 0xffffff, .3, .5, .85, procG, { r: .03, rot: [0, 0, -.2] });
      part('pf_proc', procG, 'pfault'); label('pf_proc', '🧑 your program', 'pfault', V(-8.6, 2.1, 1.2));
      label('pf_zzz', '😴 Zzz… waiting for the disk', 'pfault', V(-8.6, 2.75, 1.2), { cls: 'tiny' });
      var mmu = new T.Group(); WF.add(mmu);
      rbox(2.2, 1.8, 1.8, 0x8338ec, -5.2, .9, 0, mmu, { r: .16 }); rbox(1.2, .6, .05, 0xc8f1fa, -5.2, 1.2, .92, mmu, { r: .03, hull: false });
      part('pf_mmu', mmu, 'pfault'); label('pf_mmu', '🧠 CPU + MMU', 'pfault', V(-5.2, 2.3, 0));
      var tlbM = M(0xffbe0b), tlb = rbox(1.6, .7, 1.0, 0, -5.2, .35, 1.7, WF, { mat: tlbM, r: .1 });
      part('pf_tlb', tlb, 'pfault'); label('pf_tlb', '⚡ TLB (tiny address cache)', 'pfault', V(-5.2, .95, 2.5), { cls: 'tiny' });
      var ptg = new T.Group(), lvM = [], LVC = [0x7cc0ff, 0x3a86ff, 0x2f6fd6, 0x1f55b0]; WF.add(ptg);
      ['PGD', 'PUD', 'PMD', 'PTE'].forEach(function (n, i) {
        var m = M(LVC[i]); lvM.push(m);
        var sh = rbox(2.6, .5, 1.5, 0, -1.6, .45 + i * .85, -.4, ptg, { mat: m, r: .08 });
        for (var bk = 0; bk < 5; bk++) rbox(.25, .3, .9, [0xffbe0b, 0xff3d8b, 0x00c48c, 0xffffff, 0xff7a1a][(bk + i) % 5], -2.5 + bk * .45, .85 + i * .85, -.4, ptg, { r: .04, hull: false });
        part('pf_l' + (i + 1), sh, 'pfault'); label('pf_l' + (i + 1), 'level ' + (i + 1) + ' · ' + n, 'pfault', V(.05, .45 + i * .85, .45), { cls: 'tiny' });
      });
      part('pf_pt', ptg, 'pfault'); label('pf_pt', '📒 page table (4 levels)', 'pfault', V(-1.6, 4.0, -.4));
      var kernG = new T.Group(); kernG.position.set(2.6, 0, 1.0); WF.add(kernG);
      cyl(1.0, 1.1, 3.0, 0x8338ec, 0, 1.5, 0, kernG); cone(1.3, 1.2, 0xb48cff, 0, 3.6, 0, kernG);
      tor(.32, .07, 0xffc83d, 0, 4.3, 0, kernG, { rot: [Math.PI / 2, 0, 0] });
      for (var cr = 0; cr < 5; cr++) { var ca = cr / 5 * Math.PI * 2; sph(.09, 0xffc83d, Math.cos(ca) * .32, 4.45, Math.sin(ca) * .32, kernG, { hull: false }); }
      rbox(.6, .9, .1, 0x2d2846, 0, .45, 1.05, kernG, { r: .05 });
      part('pf_kern', kernG, 'pfault'); label('pf_kern', '👑 kernel: page-fault handler', 'pfault', V(2.6, 5.0, 1.0));
      var ramG = new T.Group(); WF.add(ramG); var frM = [];
      rbox(3.7, .2, 3.7, 0x0f8a55, 6.6, .1, .4, ramG, { r: .08 });
      for (var fq = 0; fq < 16; fq++) { var fmm = M(fq % 5 === 0 ? 0x8b5cf6 : (fq % 3 === 1 ? 0xff7a1a : 0xfdfbf5)); frM.push(fmm); rbox(.72, .25, .72, 0, 5.25 + (fq % 4) * .9, .33, -.95 + Math.floor(fq / 4) * .9, ramG, { mat: fmm, r: .06 }); }
      part('pf_ram', ramG, 'pfault'); label('pf_ram', '🧮 RAM page frames', 'pfault', V(6.6, 1.0, -1.7));
      var diskG = new T.Group(); WF.add(diskG);
      rbox(2.2, 1.5, 1.8, 0x1d2238, 8.4, .75, -3.0, diskG, { r: .14 }); rbox(1.8, .2, .05, 0x14d3e0, 8.4, 1.1, -2.08, diskG, { r: .02, hull: false });
      part('pf_disk', diskG, 'pfault'); label('pf_disk', '💤 SSD (swap & files)', 'pfault', V(8.4, 1.95, -3.0));
      var stopG = new T.Group(), stM = M(0xef4444); stopG.position.set(.2, 0, 3.4); WF.add(stopG);
      cyl(.06, .06, 2.0, 0xdadbe6, 0, 1.0, 0, stopG, { hull: false }); cyl(.55, .55, .1, 0, 0, 2.2, .05, stopG, { mat: stM, seg: 8, rot: [Math.PI / 2, 0, Math.PI / 8] });
      part('pf_segv', stopG, 'pfault'); label('pf_segv', '💀 SIGSEGV', 'pfault', V(.2, 2.95, 3.4), { cls: 'tiny' });
      anchors.pfault = {
        pf_proc: V(-8.6, 1.4, 1.95), pf_mmu: V(-5.2, 1.9, .95), pf_tlb: V(-5.2, .85, 2.25), pf_kern: V(2.6, 2.2, 2.2), pf_disk: V(8.4, 1.6, -2.0), pf_frame: V(6.15, .75, .85), pf_segv: V(.2, 2.2, 3.55),
        pf_l1: V(-1.6, .45, .45), pf_l2: V(-1.6, 1.3, .45), pf_l3: V(-1.6, 2.15, .45), pf_l4: V(-1.6, 3.0, .45)
      };
      var pfs = { dieAt: Infinity, sc: 1 };
      pfAPI = {
        set: function (s) {
          s = s || {};
          tlbM.color.setHex(s.tlbMiss ? 0xef4444 : 0xffbe0b);
          lvM.forEach(function (m, i) { var c = LVC[i]; if (i < (s.walk || 0)) c = (i === 3 && s.walk === 4) ? (s.pteOK ? 0x00c48c : 0xef4444) : 0x5ce1ff; m.color.setHex(c); });
          frM[9].color.setHex(s.frame ? 0x3df2a8 : 0xfdfbf5);
          pBodyM.color.setHex(s.sleep ? 0x9a98a8 : 0xff3d8b);
          stM.color.setHex(s.segv ? 0xff1f3d : 0xef4444);
          pfs.dieAt = s.dieAfter ? performance.now() + s.dieAfter : (s.dead ? 0 : Infinity);
        }
      };
      updaters.push(function (now, dt) {
        if (!WF.visible) return;
        pfs.sc += ((now >= pfs.dieAt ? 0 : 1) - pfs.sc) * Math.min(1, dt * 5); procG.scale.setScalar(Math.max(.01, pfs.sc));
        procG.position.y = Math.abs(Math.sin(now / 350)) * .08;
      });
    }

    /* =====================================================================
       WORLD: DRAM — inside a memory chip: buckets of charge
       ===================================================================== */
    var dramAPI = null;
    if (need.dram) {
      var WD = world('dram');
      rbox(11.5, .3, 10.6, 0x2a2350, 0, -.15, .3, WD, { r: .1 });
      var dimm = new T.Group(); WD.add(dimm);
      rbox(10.5, 2.4, .18, 0x0f8a55, 0, 1.4, -6.2, dimm, { r: .08 });
      for (var gq = 0; gq < 36; gq++) rbox(.16, .3, .05, 0xffc83d, -5.0 + gq * .285, .35, -6.08, dimm, { r: .02, hull: false });
      for (var chp = 0; chp < 8; chp++) rbox(1.0, 1.2, .14, chp === 3 ? 0x5b3df5 : 0x111827, -4.4 + chp * 1.26, 1.6, -6.05, dimm, { r: .05 });
      part('d_dimm', dimm, 'dram'); label('d_dimm', '💾 a DDR5 stick: 8 chips — we zoom into one', 'dram', V(0, 3.05, -6.2));
      var zoomM = GLOWM(0xff6bb0); [[-5.5, .02, -4.9], [5.5, .02, -4.9]].forEach(function (p) { segTube([-.62, 1.0, -5.95], p, .025, zoomM, WD); });
      var chargeGeo = new T.CylinderGeometry(.24, .24, 1, 20); chargeGeo.translate(0, .5, 0);
      var glassGeo = new T.CylinderGeometry(.3, .3, .92, 20);
      var glassM = new T.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: .22, depthWrite: false }), chargeM = M(0x3a86ff);
      var wordM = [], bitM = [], ampM = [], cellsD = [];
      for (var rw = 0; rw < 8; rw++) {
        var zr = -3.3 + rw * .9, wm = new T.MeshBasicMaterial({ color: 0x6d6590 }); wordM.push(wm);
        var wl = new T.Mesh(bgeo(7.6, .05, .07), wm); wl.position.set(-.05, .03, zr - .42); WD.add(wl);
        anchors['d_row' + rw] = V(-4.15, .5, zr);
        cellsD.push([]);
        for (var cl = 0; cl < 8; cl++) {
          var xc = -3.2 + cl * .9;
          var g2 = new T.Mesh(glassGeo, glassM); g2.position.set(xc, .46, zr); WD.add(g2);
          var q = new T.Mesh(chargeGeo, chargeM); q.position.set(xc, .02, zr); q.scale.y = .86; q.castShadow = true; WD.add(q);
          rbox(.16, .16, .16, 0x9aa3b8, xc + .33, .1, zr - .3, WD, { r: .03, hull: false });
          cellsD[rw].push({ m: q, q: 1, bit: 1, k: .004 + Math.random() * Math.random() * .03 });
        }
      }
      for (var bc = 0; bc < 8; bc++) { var bmm = new T.MeshBasicMaterial({ color: 0x6d6590 }); bitM.push(bmm); var bl3 = new T.Mesh(bgeo(.06, .05, 7.6), bmm); bl3.position.set(-3.2 + bc * .9 + .42, .03, -.15); WD.add(bl3); }
      var dec = rbox(.9, .6, 7.6, 0x8338ec, -4.65, .3, -.15, WD, { r: .1 }); part('d_dec', dec, 'dram'); label('d_dec', '🔢 row decoder', 'dram', V(-4.65, .95, -3.6), { cls: 'tiny' });
      var ampG = new T.Group(); WD.add(ampG);
      for (var am = 0; am < 8; am++) { rbox(.7, .4, .6, 0xffbe0b, -3.2 + am * .9, .2, 4.05, ampG, { r: .08 }); var amM = new T.MeshBasicMaterial({ color: 0x555566 }); ampM.push(amM); sph(.13, 0, -3.2 + am * .9, .55, 4.05, ampG, { mat: amM, hull: false }); }
      part('d_amp', ampG, 'dram'); label('d_amp', '📣 sense amplifiers = the row buffer', 'dram', V(0, 1.0, 4.4), { cls: 'tiny' });
      var colU = rbox(2.2, .5, .9, 0x00c48c, 2.0, .25, 5.1, WD, { r: .1 }); part('d_col', colU, 'dram'); label('d_col', '🔀 column select → data out', 'dram', V(2.0, .9, 5.3), { cls: 'tiny' });
      var mcG = new T.Group(); WD.add(mcG);
      rbox(2.0, 1.4, 1.6, 0x9aa3b8, 7.3, .7, 4.3, mcG, { r: .14 }); cyl(.45, .45, .06, 0xffffff, 7.3, 1.0, 5.12, mcG, { rot: [Math.PI / 2, 0, 0] });
      var hand = new T.Group(); hand.position.set(7.3, 1.0, 5.17); mcG.add(hand); rbox(.05, .36, .02, 0x111111, 0, .16, 0, hand, { r: 0, hull: false });
      part('d_mc', mcG, 'dram'); label('d_mc', '🧠 memory controller ⏱ refreshes every 64 ms', 'dram', V(7.3, 1.85, 4.3), { cls: 'tiny' });
      segTube([6.3, .35, 4.6], [3.1, .3, 5.1], .035, GLOWM(0xffd36b), WD); segTube([6.3, .35, 4.0], [-4.65, .35, -3.9], .03, GLOWM(0xffd36b), WD);
      label('d_row', '🧵 word line: opens one whole row', 'dram', V(-3.3, .2, -3.75), { cls: 'tiny' });
      label('d_bit', '🔌 bit lines carry charge to the amps', 'dram', V(3.6, .2, 3.3), { cls: 'tiny' });
      label('d_cell', '🪣 1 bit = 1 capacitor (bucket) + 1 transistor', 'dram', V(3.1, 1.15, -3.3), { cls: 'tiny' });
      label('d_text', '', 'dram', V(0, 2.7, -4.3));
      anchors.dram = { d_mc: V(7.3, 1.6, 5.2), d_col: V(2.0, .8, 5.6), d_dec: V(-4.65, .9, -.15), d_amp: V(0, .7, 4.5), d_dimm: V(-.6, 2.4, -5.9) };
      var DTXT = 'Hi Linux', ds = { mode: 'idle', t0: 0, row: -1 };
      var setRowChar = function (r, ch) { var v = ch.charCodeAt(0) & 255; for (var c = 0; c < 8; c++) cellsD[r][c].bit = (v >> (7 - c)) & 1; };
      var rowChar = function (r) { var v = 0; cellsD[r].forEach(function (c) { v = v * 2 + (c.q > .5 ? 1 : 0); }); return v >= 32 && v < 127 ? String.fromCharCode(v) : '·'; };
      dramAPI = {
        set: function (m, o) {
          o = o || {}; ds.mode = m; ds.t0 = performance.now(); ds.row = o.row != null ? o.row : -1;
          if (m === 'reset') { for (var r = 0; r < 8; r++) setRowChar(r, DTXT[r]); ds.mode = 'idle'; }
          if (m === 'write') setRowChar(o.row, o.ch);
          if (m !== 'leak' && m !== 'off' && m !== 'write') cellsD.forEach(function (row) { row.forEach(function (c) { c.q = c.bit; }); });
        }
      };
      dramAPI.set('reset');
      updaters.push(function (now, dt) {
        if (!WD.visible) return;
        var t = (now - ds.t0) / 1000, m = ds.mode;
        wordM.forEach(function (w) { w.color.setHex(0x6d6590); }); bitM.forEach(function (w) { w.color.setHex(0x6d6590); });
        if (m === 'leak' || m === 'refresh') cellsD.forEach(function (row) { row.forEach(function (c) { c.q = Math.max(0, c.q - c.k * (m === 'leak' ? 25 : 4) * dt); }); });
        if (m === 'refresh') { var sr = Math.floor(t / .3) % 8; wordM[sr].color.setHex(0x3df2a8); cellsD[sr].forEach(function (c) { c.q = c.q > .5 ? 1 : 0; }); }
        if (m === 'off') cellsD.forEach(function (row) { row.forEach(function (c) { c.q = Math.max(0, c.q - 1.4 * dt); }); });
        if (m === 'write' && ds.row >= 0) { wordM[ds.row].color.setHex(0xff6bb0); bitM.forEach(function (w) { w.color.setHex(0xff6bb0); }); cellsD[ds.row].forEach(function (c) { c.q += (c.bit - c.q) * Math.min(1, dt * 3); }); }
        if (m === 'read' && ds.row >= 0) {
          wordM[ds.row].color.setHex(0xffd84d); bitM.forEach(function (w) { w.color.setHex(0xffd84d); });
          cellsD[ds.row].forEach(function (c, i) {
            c.q += ((t < .9 ? (c.bit ? .62 : .38) : c.bit) - c.q) * Math.min(1, dt * 4);
            ampM[i].color.setHex(t > .6 ? (c.bit ? 0xffd84d : 0x2d2846) : 0x555566);
          });
        } else ampM.forEach(function (a) { a.color.setHex(0x555566); });
        cellsD.forEach(function (row) { row.forEach(function (c) { c.m.scale.y = Math.max(.001, c.q) * .86; }); });
        if (!ds.nt || now > ds.nt) { ds.nt = now + 200; var s4 = ''; for (var r = 0; r < 8; r++) s4 += rowChar(r); labels.d_text.el.innerHTML = '📖 this chip says: <b>"' + s4 + '"</b>'; }
        hand.rotation.z -= dt * (m === 'refresh' ? 7 : 1.2);
      });
    }

    /* =====================================================================
       WORLD: GPU — a graphics card with the cooler taken off
       ===================================================================== */
    var gpuAPI = null;
    if (need.gpu) {
      var WG = world('gpu'), tmpC = new T.Color();
      rbox(12, .25, 6.6, 0x1d2238, 0, .12, 0, WG, { r: .1 });
      var gpuG = new T.Group(); WG.add(gpuG);
      rbox(3.4, .2, 3.4, 0x3d3760, 0, .35, 0, gpuG, { r: .06 }); rbox(2.6, .18, 2.6, 0x2a2350, 0, .54, 0, gpuG, { r: .05 });
      var coreMat = new T.MeshBasicMaterial({ color: 0xffffff }), coresI = new T.InstancedMesh(rgeo(.22, .14, .22, .04, 1), coreMat, 64), cmx = new T.Matrix4();
      for (var gi = 0; gi < 64; gi++) { cmx.makeTranslation(-1.05 + (gi % 8) * .3, .7, -1.05 + Math.floor(gi / 8) * .3); coresI.setMatrixAt(gi, cmx); coresI.setColorAt(gi, tmpC.setHex(0x3d3570)); }
      coresI.instanceColor.needsUpdate = true; gpuG.add(coresI);
      part('g_gpu', gpuG, 'gpu'); label('g_gpu', '⚙️ GPU chip: thousands of tiny cores (64 shown)', 'gpu', V(0, 1.35, 0), { cls: 'tiny' });
      var vramG = new T.Group(), goldM2 = GLOWM(0xffd36b); WG.add(vramG);
      [[-2.7, -1.5], [-2.7, 0], [-2.7, 1.5], [2.7, -1.5], [2.7, 0], [2.7, 1.5], [0, -2.75], [0, 2.75]].forEach(function (p) {
        rbox(1.0, .22, 1.0, 0x111827, p[0], .36, p[1], vramG, { r: .05, mo: { emissive: new T.Color(0x140c30) } });
        segTube([p[0] * .6, .27, p[1] * .6], [p[0] * .82, .27, p[1] * .82], .03, goldM2, vramG);
      });
      part('g_vram', vramG, 'gpu'); label('g_vram', '🎞️ VRAM chips (GDDR6) — the GPU\'s own memory', 'gpu', V(-2.7, .95, 1.5), { cls: 'tiny' });
      var pcieG = new T.Group(); WG.add(pcieG);
      for (var pf = 0; pf < 29; pf++) rbox(.12, .05, .35, 0xffc83d, -4.6 + pf * .22, .12, 3.45, pcieG, { r: .02, hull: false });
      part('g_pcie', pcieG, 'gpu'); label('g_pcie', '🛣️ PCIe connector → motherboard', 'gpu', V(-1.5, .6, 4.0), { cls: 'tiny' });
      rbox(1.2, .5, .4, 0x111111, 4.5, .45, -3.0, WG, { r: .06 });
      for (var cpi = 0; cpi < 8; cpi++) cyl(.13, .13, .32, 0x2d2846, 4.0 + (cpi % 4) * .45, .4, -1.0 + Math.floor(cpi / 4) * 2.0, WG);
      rbox(.15, 1.6, 6.0, 0xc9c9d6, -6.1, .8, 0, WG, { r: .04 });
      [-1.5, 0, 1.5].forEach(function (z) { rbox(.06, .35, .7, 0x111111, -6.2, .8, z, WG, { r: .02, hull: false }); });
      label('g_cool', '🔧 cooler & fans removed so you can see inside', 'gpu', V(4.0, 1.2, -2.0), { cls: 'tiny' });
      // monitor
      var monG = new T.Group(); WG.add(monG);
      rbox(5.0, 3.0, .25, 0x262238, -10.8, 2.7, -.6, monG, { r: .12 }); rbox(.4, 1.4, .25, 0x3d3760, -10.8, .7, -.8, monG, { r: .1 }); cyl(1.0, 1.1, .1, 0x3d3760, -10.8, .05, -.7, monG);
      var mcv = document.createElement('canvas'); mcv.width = 320; mcv.height = 180; var mctx = mcv.getContext('2d'), mtex = new T.CanvasTexture(mcv);
      var mscr = new T.Mesh(new T.PlaneGeometry(4.6, 2.6), new T.MeshBasicMaterial({ map: mtex })); mscr.position.set(-10.8, 2.7, -.47); monG.add(mscr);
      part('g_mon', monG, 'gpu'); label('g_mon', '📺 monitor', 'gpu', V(-10.8, 4.6, -.6));
      tube([[-6.25, .8, 0], [-7.8, .25, .4], [-10.8, 1.3, -.95]], .06, 0x2d2846, WG);
      // system RAM on the motherboard side
      var sysG = new T.Group(); WG.add(sysG);
      rbox(.26, 2.2, 3.6, 0x0f8a55, 9.4, 1.1, 0, sysG, { r: .05 }); rbox(.27, .12, 3.6, 0, 9.4, 2.26, 0, sysG, { mat: RGB(.3), hull: false, r: .02 });
      for (var sc2 = 0; sc2 < 4; sc2++) rbox(.08, .6, .7, 0x111827, 9.55, 1.1, -1.2 + sc2 * .8, sysG, { r: .02, hull: false });
      part('g_sysram', sysG, 'gpu'); label('g_sysram', '🧮 system RAM (on the motherboard)', 'gpu', V(9.4, 2.8, 0), { cls: 'tiny' });
      tube([[9.2, .3, 1.6], [6.5, .1, 4.6], [1.0, .05, 3.9]], .05, 0, WG, { mat: GLOWM(0xffd36b), cast: false });
      // framebuffer: a floating grid of pixels
      var fbG = new T.Group(); WG.add(fbG);
      rbox(6.2, 3.6, .1, 0x2d2846, 0, 4.35, -2.15, fbG, { r: .06 });
      var pixMat = new T.MeshBasicMaterial({ color: 0xffffff }), pix = new T.InstancedMesh(bgeo(.32, .32, .06), pixMat, 144);
      var PIC = [], ORD = [];
      for (var iy = 0; iy < 9; iy++) for (var ix = 0; ix < 16; ix++) {
        var c3 = new T.Color(0x7cc6ff).lerp(new T.Color(0xffc2dc), iy / 8);
        if (Math.hypot(ix - 12.5, iy - 2) < 1.7) c3.setHex(0xffd84d);
        if (iy > 6.3 - Math.sin(ix * .7) * 1.1) c3.setHex((ix + iy) % 2 ? 0x3ccf7a : 0x2fb865);
        if ((ix === 3 || ix === 4) && iy >= 4 && iy <= 7) c3.setHex(0x1f1d2b);
        if (ix === 4 && (iy === 5 || iy === 6)) c3.setHex(0xffffff);
        if (ix === 5 && iy === 5) c3.setHex(0xffa62b);
        if ((ix === 3 || ix === 4) && iy === 8) c3.setHex(0xffa62b);
        PIC.push(c3); ORD.push((ix + iy * 1.6) / (15 + 8 * 1.6));
        cmx.makeTranslation(-2.7 + ix * .36, 4.35 + (4 - iy) * .36, -2.06); pix.setMatrixAt(iy * 16 + ix, cmx); pix.setColorAt(iy * 16 + ix, tmpC.setHex(0x2a2350));
      }
      pix.instanceColor.needsUpdate = true; fbG.add(pix);
      part('g_fb', fbG, 'gpu'); label('g_fb', '🖼️ framebuffer: the next picture, pixel by pixel (in VRAM)', 'gpu', V(0, 6.5, -2.1), { cls: 'tiny' });
      anchors.gpu = { g_sysram: V(9.4, 2.4, 0), g_pcie: V(-1.5, .4, 3.7), g_vram: V(-2.7, .75, 1.6), g_gpu: V(0, 1.0, .4), g_fb: V(0, 4.35, -1.9), g_mon: V(-10.8, 2.7, -.3) };
      var gs = { paint: -1, scan: -1, integ: false };
      var drawMon = function (p) {
        mctx.fillStyle = '#0b0817'; mctx.fillRect(0, 0, 320, 180);
        if (p <= 0) return void (mtex.needsUpdate = true);
        var rows = Math.min(9, Math.floor(p * 9.999));
        for (var y = 0; y < 9; y++) for (var x = 0; x < 16; x++) { if (y > rows) continue; mctx.fillStyle = '#' + PIC[y * 16 + x].getHexString(); mctx.fillRect(x * 20, y * 20, 20, 20); }
        if (p < 1) { mctx.fillStyle = 'rgba(255,255,255,.75)'; mctx.fillRect(0, Math.min(179, (rows + 1) * 20), 320, 3); }
        mtex.needsUpdate = true;
      };
      drawMon(0);
      gpuAPI = {
        set: function (s) {
          s = s || {}; var now = performance.now();
          gs.paint = s.paint ? now : (s.painted ? -2 : -1); gs.scan = s.scan ? now : -1; gs.integ = !!s.integ; gs.shown = !!s.shown;
          vramG.visible = !gs.integ; labels.g_vram.el.innerHTML = gs.integ ? '🚫 no VRAM chips: integrated GPUs borrow system RAM' : '🎞️ VRAM chips (GDDR6) — the GPU\'s own memory';
          if (!s.scan) drawMon(gs.shown ? 1 : 0);
        }
      };
      updaters.push(function (now) {
        if (!WG.visible) return;
        var p = gs.paint === -2 ? 1 : gs.paint < 0 ? 0 : Math.min(1, (now - gs.paint) / 2600), active = gs.paint >= 0 && p < 1;
        for (var i = 0; i < 64; i++) coresI.setColorAt(i, active ? tmpC.setHSL((i / 64 + now / 900) % 1, .85, .6) : tmpC.setHex(gs.paint === -1 ? 0x3d3570 : 0x5b4fa0));
        coresI.instanceColor.needsUpdate = true;
        for (var j = 0; j < 144; j++) pix.setColorAt(j, ORD[j] <= p ? PIC[j] : tmpC.setHex(0x2a2350));
        pix.instanceColor.needsUpdate = true;
        if (gs.scan >= 0) drawMon(Math.min(1, (now - gs.scan) / 1600));
      });
    }

    // shadows everywhere except the outline hulls
    scene.traverse(function (o) { if (o.isMesh && o.userData.hull) { o.castShadow = false; o.receiveShadow = false; } });

    /* ================= camera presets ================= */
    var CAM = {
      over: [[3.2, 7.2, 15.5], [1.4, 2.4, -.8]], desk: [[.6, 4.6, 11], [.8, 2.2, -1]], case: [[4.5, 3.3, 6.8], [4.2, 2.8, -1.1]],
      cpu: [[5.0, 4.4, 3.6], [4.6, 3.8, -1.2]], ssd: [[4.9, 2.4, 3.4], [4.6, 1.8, -1.2]],
      mon: [[-2.4, 3.2, 5.8], [-2.6, 2.6, -1.8]], kbd: [[-2.4, 3.8, 4.8], [-2.6, .3, .8]], net: [[2.2, 6.6, 15], [.6, 4.6, -2.6]],
      cake: [[8.5, 8.4, 12.8], [0, 3.2, 0]], cakeX: [[11.5, 8.4, 17.5], [0, 5.7, 0]],
      tree: [[0, 10.5, 23.5], [0, 4.6, 0]],
      ctr: [[0, 7.6, 16], [-1.2, 2.8, 0]], ctrWeb: [[-4.2, 5.2, 8.5], [-4.2, 3.4, 0]], ctrLow: [[1, 4.2, 12], [0, 2.1, 0]], ctrRun: [[-5.5, 5.5, 12.5], [-5.2, 2.8, 0]],
      chip: [[.5, 11, 12.5], [.5, .3, .6]], chipCore: [[-3.2, 6.2, 8.2], [-3.2, .6, 1.9]], chipMem: [[5.0, 6.5, 8.8], [4.5, .8, -1.3]], chipUnc: [[-4.4, 6.2, 6.8], [-4.6, .7, -1.0]],
      pipe: [[0, 7.5, 15.5], [0, 1.8, 0]], pipeTop: [[-3, 11, 9.5], [0, 1.2, 0]],
      pf: [[0, 9.5, 14.5], [-.5, 1.4, 0]], pfPt: [[-3, 5.2, 8.5], [-2.6, 1.9, 0]],
      dram: [[0, 9.5, 12.5], [0, .6, -.8]], dramCells: [[1.5, 6.5, 8], [-.2, .4, -.3]],
      gpu: [[1, 9, 14], [-2, 2.0, 0]], gpuDie: [[.5, 6, 6.8], [0, .8, .2]], gpuMon: [[-6.5, 4.4, 9.5], [-7.5, 2.6, -.6]]
    };
    var CAM_RAMWORLD = [[-.8, 4.2, 17], [-.8, 3.1, 0]], CAM_PCRAM = [[6.4, 4.2, 3.5], [5.7, 3.7, -1.1]];
    /* ================= camera & controls ================= */
    var tgt = V(0, 2, 0), sp = { r: 15, th: .2, ph: 1.1 }, tween = null, userTouch = 0;
    function applyCam() {
      camera.position.set(tgt.x + sp.r * Math.sin(sp.ph) * Math.sin(sp.th), tgt.y + sp.r * Math.cos(sp.ph), tgt.z + sp.r * Math.sin(sp.ph) * Math.cos(sp.th));
      camera.lookAt(tgt);
    }
    function distFactor() { var a = camera.aspect, wide = curScn && curScn.world !== 'pc' && curScn.world !== 'cake'; return a < 1.25 ? Math.min(wide ? 2.5 : 2.1, (wide ? 1.45 : 1.12) / a + .05) : 1; }
    var lastCam = null;
    function flyTo(name, dur) {
      var c = Array.isArray(name) ? name : (name === 'ram' ? (curScn && curScn.world === 'ram' ? CAM_RAMWORLD : CAM_PCRAM) : CAM[name]);
      if (!c) return; lastCam = c;
      var t = V(c[1][0], c[1][1], c[1][2]), off = V(c[0][0], c[0][1], c[0][2]).sub(t).multiplyScalar(distFactor());
      var r = off.length(), th = Math.atan2(off.x, off.z), ph = Math.acos(off.y / r);
      while (th - sp.th > Math.PI) th -= Math.PI * 2; while (th - sp.th < -Math.PI) th += Math.PI * 2;
      tween = { a: { r: sp.r, th: sp.th, ph: sp.ph, t: tgt.clone() }, b: { r: r, th: th, ph: ph, t: t }, t0: performance.now(), dur: dur == null ? 1200 : dur };
    }
    var ptrs = new Map(), pinch = 0;
    canvas.addEventListener('pointerdown', function (e) { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); tween = null; userTouch = performance.now(); stage.classList.add('active'); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
    canvas.addEventListener('pointermove', function (e) {
      if (!ptrs.has(e.pointerId)) return; var p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); userTouch = performance.now();
      if (ptrs.size === 1) { sp.th -= dx * .008; sp.ph = Math.max(.12, Math.min(1.62, sp.ph - dy * .006)); }
      else if (ptrs.size === 2) { var v = Array.from(ptrs.values()), d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); if (pinch) sp.r = Math.max(2.5, Math.min(80, sp.r * pinch / d)); pinch = d; }
    });
    function up(e) { ptrs.delete(e.pointerId); pinch = 0; }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    stage.addEventListener('pointerleave', function () { if (!host.classList.contains('fs')) stage.classList.remove('active'); });
    canvas.addEventListener('wheel', function (e) {
      if (!stage.classList.contains('active') && !host.classList.contains('fs')) return;
      e.preventDefault(); tween = null; sp.r = Math.max(2.5, Math.min(80, sp.r * (1 + Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 60) * .0018)));
    }, { passive: false });

    /* ================= screen (monitor) ================= */
    var scr = { lines: [], off: false, tok: 0 };
    function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function drawScreen() {
      if (!sctx) return;
      var g = sctx;
      if (scr.off) { g.fillStyle = '#050508'; g.fillRect(0, 0, 640, 400); stex.needsUpdate = true; return; }
      var bg = g.createLinearGradient(0, 0, 640, 400); bg.addColorStop(0, '#4b1d8f'); bg.addColorStop(.55, '#7a2c9e'); bg.addColorStop(1, '#1f5fb0');
      g.fillStyle = bg; g.fillRect(0, 0, 640, 400);
      [[70, 60, 70, 'rgba(255,79,139,.45)'], [585, 70, 80, 'rgba(20,211,224,.4)'], [560, 360, 95, 'rgba(255,191,31,.35)'], [90, 360, 60, 'rgba(124,92,255,.5)']].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, Math.PI * 2); g.fillStyle = c[3]; g.fill(); });
      rrect(g, 16, 14, 608, 372, 16); g.fillStyle = 'rgba(14,12,34,.92)'; g.fill();
      g.save(); rrect(g, 16, 14, 608, 372, 16); g.clip(); g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(16, 14, 608, 32); g.restore();
      [['#ff5f57', 38], ['#febc2e', 60], ['#28c840', 82]].forEach(function (d) { g.beginPath(); g.arc(d[1], 30, 7, 0, Math.PI * 2); g.fillStyle = d[0]; g.fill(); });
      g.font = '600 15px "JetBrains Mono", Menlo, monospace'; g.fillStyle = '#b9b2e6'; g.fillText('kid@sketchbook: ~', 260, 35);
      var y = 74, show = scr.lines.slice(-12);
      show.forEach(function (l) {
        g.font = '600 20px "JetBrains Mono", Menlo, monospace'; g.fillStyle = '#ece8ff'; var x = 30;
        if (l.indexOf('## ') === 0) { g.font = '700 42px "Caveat", "Patrick Hand", sans-serif'; g.fillStyle = '#ffd84d'; g.fillText(l.slice(3), 30, y + 10); y += 46; return; }
        if (l.indexOf('$ ') === 0) { g.fillStyle = '#5cf0a8'; g.fillText('kid@sketchbook:~$ ', x, y); x += g.measureText('kid@sketchbook:~$ ').width; g.fillStyle = '#ffffff'; g.fillText(l.slice(2), x, y); }
        else if (l.indexOf('[  OK  ]') === 0) { g.fillText('[', x, y); x += g.measureText('[').width; g.fillStyle = '#5cf0a8'; g.fillText('  OK  ', x, y); x += g.measureText('  OK  ').width; g.fillStyle = '#ece8ff'; g.fillText(']' + l.slice(8), x, y); }
        else if (l.indexOf('# ') === 0) { g.fillStyle = '#ffcf5c'; g.fillText(l, x, y); }
        else if (l.indexOf('* ') === 0) { g.fillStyle = '#ff6bb0'; g.fillRect(24, y - 20, 592, 28); g.fillStyle = '#ffffff'; g.fillText(l, x, y); }
        else if (l.indexOf('kid@sketchbook') === 0) { g.fillStyle = '#5cf0a8'; g.fillText(l, x, y); }
        else { g.fillStyle = '#cfc8f2'; g.fillText(l, x, y); }
        y += 26;
      });
      stex.needsUpdate = true;
    }
    function setScreen(s) {
      if (!s) return; scr.tok++; var my = scr.tok;
      if (s.off) { scr.off = true; scr.lines = []; drawScreen(); return; }
      scr.off = false; var base = s.keep ? scr.lines.filter(function (l) { return l.indexOf('_') !== l.length - 1; }) : [];
      if (!s.type) { scr.lines = base.concat(s.lines); drawScreen(); return; }
      var q = s.lines.slice(); scr.lines = base;
      (function next() {
        if (my !== scr.tok || !q.length) return; var l = q.shift();
        if (l.indexOf('$ ') === 0) { var j = 2; scr.lines.push('$ '); (function ty() { if (my !== scr.tok) return; scr.lines[scr.lines.length - 1] = l.slice(0, ++j); drawScreen(); if (j < l.length) setTimeout(ty, 60); else setTimeout(next, 280); })(); }
        else { scr.lines.push(l); drawScreen(); setTimeout(next, 120); }
      })();
    }
    function typeKeys(n) {
      var t = scr.tok;
      for (var i = 0; i < n; i++) (function (i) {
        setTimeout(function () {
          var k = Math.floor(Math.random() * 52), m2 = keyBase[k].clone(); m2.elements[13] -= .07; keys.setMatrixAt(k, m2); keys.instanceMatrix.needsUpdate = true;
          setTimeout(function () { keys.setMatrixAt(k, keyBase[k]); keys.instanceMatrix.needsUpdate = true; }, 140);
        }, i * 230);
      })(i);
    }

    /* ================= glow, labels, packets ================= */
    var glowing = [];
    function glow(ids) {
      Object.keys(parts).forEach(function (k) {
        var p = parts[k];
        p.mats.forEach(function (m) { if (m.userData.baseE) m.emissive.copy(m.userData.baseE); else m.emissive.setHex(0); m.emissiveIntensity = 1; });
        (p.hulls || []).forEach(function (h) { h.material = hullMat; });
      });
      glowing = (ids || []).map(function (id) { return parts[id]; }).filter(Boolean);
      glowing.forEach(function (p) { (p.hulls || []).forEach(function (h) { h.material = hotHull; }); });
      hot = ids || [];
      Object.keys(labels).forEach(function (k) { labels[k].el.classList.toggle('hot', hot.indexOf(k) >= 0); });
    }
    var hot = [];
    function showLabels(list) {
      var w = curScn.world;
      if (list === 'dirs') list = dirLabelIds;
      list = (list || []).concat(hot);
      Object.keys(labels).forEach(function (k) { var L = labels[k]; L.vis = L.world === w && list.indexOf(k) >= 0; L.el.classList.toggle('show', L.vis); });
    }
    var pkGeo = new T.SphereGeometry(.17, 18, 12), packets = [];
    var glowTex = canvasTex(64, 64, function (g) { var r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    function sprite(color, sc, op) { var s2 = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: color, transparent: true, opacity: op, depthWrite: false })); s2.scale.setScalar(sc); return s2; }
    var D = { host: cap, tok: 0, onrender: [] };
    D.newToken = function () { D.tok++; return D.tok; };
    D.on = function (ids) { glow(ids); };
    function anchor(id) {
      var w = curScn.world, a = anchors[w] && anchors[w][id];
      if (a) return a.clone(); if (anchors[id]) return anchors[id].clone();
      var p = parts[id]; if (!p) return null;
      var bx = new T.Box3().setFromObject(p.obj), c = bx.getCenter(V(0, 0, 0)); c.z = Math.max(c.z, bx.max.z - .1); return c;
    }
    D.packet = function (from, to, o) {
      o = o || {}; var my = D.tok;
      return new Promise(function (res) {
        var a = anchor(from), b = anchor(to); if (!a || !b) return res();
        var pts = [a], via = o.via || ROUTES[from + '>' + to] || (ROUTES[to + '>' + from] ? ROUTES[to + '>' + from].slice().reverse() : null);
        if (curScn.world !== 'pc') via = o.via || null;
        if (via) via.forEach(function (v) { pts.push(V(v[0], v[1], v[2])); });
        else { var mid = a.clone().lerp(b, .5); mid.y += Math.min(1.4, a.distanceTo(b) * .16); mid.z += .3; pts.push(mid); }
        pts.push(b);
        var col = HEX[o.c] || HEX.pink, curve = new T.CatmullRomCurve3(pts), mesh = new T.Mesh(pkGeo, new T.MeshBasicMaterial({ color: col }));
        scene.add(mesh); mesh.position.copy(a); mesh.add(sprite(col, 1.15, .75));
        var trail = []; for (var ti = 0; ti < 9; ti++) { var tsp = sprite(col, .5 - ti * .04, .5 - ti * .05); tsp.position.copy(a); scene.add(tsp); trail.push(tsp); }
        var lab = null; if (o.label) { lab = document.createElement('div'); lab.className = 'lab-lbl pk show'; lab.textContent = o.label; lblBox.appendChild(lab); }
        packets.push({ mesh: mesh, lab: lab, curve: curve, trail: trail, hist: [], t0: performance.now(), dur: o.dur || Math.max(900, Math.min(2300, curve.getLength() * 280)), res: res, tok: my });
      });
    };

    /* ================= scenario switching ================= */
    var curScn = null, player = null;
    var L = { cake: cakeAPI, ramSet: ramSet, ctr: ctrAPI, setScreen: setScreen, chip: chipAPI, pipe: pipeAPI, pf: pfAPI, dram: dramAPI, gpu: gpuAPI };
    function applyStep(k, s) {
      if (s.cam) flyTo(s.cam);
      showLabels(s.lbl || curScn.lbl);
      if (s.screen) setScreen(s.screen);
      if (s.keys) typeKeys(s.keys);
      if (s.do) s.do(L);
    }
    function resetScn() {
      glow([]); flyTo(curScn.cam, 900); showLabels(curScn.lbl);
      if (curScn.screen) setScreen(curScn.screen);
      if (curScn.reset) curScn.reset(L);
    }
    function setScenario(id) {
      curScn = SCN[id];
      var top = host.querySelector('.lab-top');
      Array.prototype.forEach.call(host.querySelectorAll('.lab-top .chip'), function (c) {
        var on = c.dataset.s === id; c.classList.toggle('active', on);
        if (on) top.scrollLeft = Math.max(0, c.offsetLeft - (top.clientWidth - c.offsetWidth) / 2);
      });
      Object.keys(worlds).forEach(function (k) { worlds[k].visible = k === curScn.world; });
      if (player) player.ui.remove();
      D.newToken(); D.onrender = [];
      player = SK.flow(D, curScn.steps, { mount: cap, intro: curScn.intro, onStep: applyStep, onReset: resetScn });
      // world-specific prep
      if (curScn.world === 'ram') ramSet(0);
      if (curScn.world === 'ctr') ctrAPI.set({});
      if (curScn.world === 'cake') { cakeAPI.explode(0); cakeAPI.plane(false); }
    }
    Array.prototype.forEach.call(host.querySelectorAll('.lab-top .chip'), function (c) { c.addEventListener('click', function () { setScenario(c.dataset.s); }); });
    host.querySelector('[data-t=view]').addEventListener('click', function () { if (lastCam) flyTo(lastCam); });
    host.querySelector('[data-t=fs]').addEventListener('click', function () {
      var on = !host.classList.contains('fs'); host.classList.toggle('fs', on); document.body.style.overflow = on ? 'hidden' : '';
      canvas.style.touchAction = on ? 'none' : 'pan-y'; setTimeout(resize, 50);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && host.classList.contains('fs')) host.querySelector('[data-t=fs]').click(); });

    /* ================= theme ================= */
    window.addEventListener('themechange', function () { lineMat.color.setHex(isDark() ? 0xe9e6ff : 0x2b2a33); });

    /* ================= resize & loop ================= */
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      if (lastCam && !tween) flyTo(lastCam, 300);
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
    var visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(stage);
    var vtmp = V(0, 0, 0), last = performance.now();
    function project(v, el) {
      v.project(camera);
      if (v.z > 1 || v.z < -1) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = '';
      var x = (v.x * .5 + .5) * stage.clientWidth, y = (-v.y * .5 + .5) * stage.clientHeight;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,' + (el.classList.contains('pk') ? '-170%' : '-115%') + ')';
    }
    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) { last = now; return; }
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (tween) {
        var k = Math.min(1, (now - tween.t0) / tween.dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        sp.r = tween.a.r + (tween.b.r - tween.a.r) * e; sp.th = tween.a.th + (tween.b.th - tween.a.th) * e; sp.ph = tween.a.ph + (tween.b.ph - tween.a.ph) * e;
        tgt.lerpVectors(tween.a.t, tween.b.t, e); if (k >= 1) tween = null;
      }
      applyCam();
      var g = .3 + .25 * Math.sin(now / 180);
      glowing.forEach(function (p) { p.mats.forEach(function (m) { m.emissive.setHex(0xffb020); m.emissiveIntensity = g; }); });
      hotHull.color.setHSL(.11 + .04 * Math.sin(now / 200), 1, .55);
      rgbMats.forEach(function (r) { r.m.color.setHSL((now / 5000 + r.off) % 1, .9, r.l); });
      bladeGroups.forEach(function (bg2) { bg2.rotation.z += dt * 9; });
      if (cloud) cloud.position.y = 8.4 + Math.sin(now / 900) * .15;
      if (ship) { ship.position.y = Math.sin(now / 1100) * .05; ship.rotation.z = Math.sin(now / 1500) * .006; }
      updaters.forEach(function (u) { u(now, dt); });
      if (treeSpin && worlds.tree.visible && now - userTouch > 2500) treeSpin.rotation.y += dt * .07;
      cakeE.cur += (cakeE.to - cakeE.cur) * Math.min(1, dt * 4);
      cakeL.forEach(function (gL, i) { gL.position.y = i * cakeE.cur * 1.45; });
      frames.forEach(function (f) { if (!f.material.color.equals(f.userData.target)) f.material.color.lerp(f.userData.target, Math.min(1, dt * 5)); });
      swapSlots.forEach(function (f) { f.material.color.lerp(f.userData.target, Math.min(1, dt * 5)); });
      Object.keys(ctrs).forEach(function (k) {
        var c = ctrs[k];
        c.meters.forEach(function (m, i) { var wob = ctrState.cg && !(k === 'db' && i === 1) ? Math.sin(now / 400 + i * 2 + k.length) * .08 : 0; m.v += (m.to + wob - m.v) * Math.min(1, dt * 3); var hh = Math.max(.02, m.v) * 2.1; m.m.scale.y = hh; m.m.position.y = hh / 2 + .05; });
        if (c.pop != null) { c.pop += dt * 2; c.procs.forEach(function (p) { p.scale.setScalar(Math.min(1, c.pop)); }); if (c.pop >= 1) c.pop = null; }
        if (c.grow != null) { c.grow += dt * .9; var s = Math.min(1, c.grow); c.g.scale.setScalar(s < 1 ? s * s * (3 - 2 * s) : 1); if (c.grow >= 1) c.grow = null; }
      });
      for (var i = packets.length - 1; i >= 0; i--) {
        var p = packets[i], kk = Math.min(1, (now - p.t0) / p.dur), ee = kk < .5 ? 2 * kk * kk : 1 - Math.pow(-2 * kk + 2, 2) / 2;
        if (p.tok !== D.tok) kk = 2;
        if (kk <= 1) {
          p.curve.getPointAt(ee, p.mesh.position); p.mesh.scale.setScalar(1 + .2 * Math.sin(now / 80));
          p.hist.unshift(p.mesh.position.clone()); if (p.hist.length > 30) p.hist.pop();
          p.trail.forEach(function (t, ti) { var h = p.hist[Math.min(p.hist.length - 1, (ti + 1) * 3)]; if (h) t.position.copy(h); });
          if (p.lab) { vtmp.copy(p.mesh.position); project(vtmp, p.lab); }
        }
        if (kk >= 1) { scene.remove(p.mesh); p.mesh.material.dispose(); p.trail.forEach(function (t) { scene.remove(t); t.material.dispose(); }); if (p.lab) p.lab.remove(); packets.splice(i, 1); p.res(); }
      }
      Object.keys(labels).forEach(function (k) {
        var L2 = labels[k]; if (!L2.vis) return;
        if (L2.obj) { L2.obj.getWorldPosition(vtmp); vtmp.add(L2.off); } else vtmp.copy(L2.pos).add(L2.off);
        project(vtmp, L2.el);
      });
      renderer.render(scene, camera);
    }
    resize();
    drawScreen();
    setScenario(opts.start && ids.indexOf(opts.start) >= 0 ? opts.start : ids[0]);
    flyTo(curScn.cam, 0);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawScreen);
    requestAnimationFrame(loop);
  }

  window.OSLab = { mount: mount, SCN: SCN, ORDER: SCN_ORDER };
})();
