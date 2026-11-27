/* Chapter 6 — Everything is a file */
(function () {
  'use strict';
  var $ = Core.$, esc = Core.esc;

  /* ---------- everything is a file board ---------- */
  var EIAF = [
    ['⌨️', 'Keyboard', '/dev/input/event3', 'c', 'Every key press and release becomes a few bytes you can read from this file.', '$ sudo evtest /dev/input/event3\nEvent: type 1 (EV_KEY), code 30 (KEY_A), value 1'],
    ['💾', 'Whole disk', '/dev/nvme0n1', 'b', 'The entire SSD as one giant file of bytes. Partitions are files too: /dev/nvme0n1p1, p2…', '$ sudo head -c 512 /dev/nvme0n1 | xxd | tail -1\n000001f0: 0000 0000 0000 0000 0000 0000 0000 55aa'],
    ['🕳️', 'Black hole', '/dev/null', 'c', 'Anything written here disappears forever. Reading it gives nothing. Perfect for hiding output you don\'t care about.', '$ ls /does-not-exist 2> /dev/null\n$ echo $?\n2'],
    ['🎲', 'Random bytes', '/dev/urandom', 'c', 'An endless river of random numbers, from the kernel\'s entropy pool. Used for passwords and keys.', '$ head -c 8 /dev/urandom | xxd\n00000000: 4fa2 19c7 e03b 7d11  O....;}.'],
    ['0️⃣', 'Zeros', '/dev/zero', 'c', 'Endless zero bytes. Handy for making blank files.', '$ dd if=/dev/zero of=blank.img bs=1M count=10\n10485760 bytes (10 MB) copied'],
    ['🖥️', 'Your terminal', '/dev/pts/0', 'c', 'The terminal window you type into. Write into ANOTHER terminal\'s file and the text appears there! 👻', '$ tty\n/dev/pts/0\n$ echo "boo!" > /dev/pts/1'],
    ['🧠', 'CPU info', '/proc/cpuinfo', '-', '/proc isn\'t on any disk: the kernel writes the answer the instant you read it.', '$ grep -c processor /proc/cpuinfo\n8'],
    ['🧮', 'Memory info', '/proc/meminfo', '-', 'Live RAM numbers. free and top just read this file and make it pretty.', '$ grep MemAvailable /proc/meminfo\nMemAvailable:   12900120 kB'],
    ['🏃', 'A running process', '/proc/2211/', 'd', 'Every process is a folder named by its PID: its command line, memory map, open files, status…', '$ cat /proc/2211/comm\nfirefox\n$ ls /proc/2211/fd | wc -l\n214'],
    ['🔋', 'Battery', '/sys/class/power_supply/BAT0/capacity', '-', '/sys is the kernel\'s control panel for devices. Battery percent is just a number in a file.', '$ cat /sys/class/power_supply/BAT0/capacity\n87'],
    ['💡', 'Screen brightness', '/sys/class/backlight/intel_backlight/brightness', '-', 'WRITE a number to this file and your screen gets brighter. Yes, really!', '$ echo 900 | sudo tee /sys/class/backlight/intel_backlight/brightness\n900'],
    ['🌐', 'Network card', '/sys/class/net/eth0/', 'd', 'A folder of tiny files: MAC address, speed, packet counters.', '$ cat /sys/class/net/eth0/statistics/rx_bytes\n9812734221'],
    ['🎛️', 'Kernel settings', '/proc/sys/net/ipv4/ip_forward', '-', 'Hundreds of kernel knobs live under /proc/sys. sysctl is a friendly wrapper.', '$ cat /proc/sys/net/ipv4/ip_forward\n0\n$ sudo sysctl -w net.ipv4.ip_forward=1'],
    ['🚰', 'Named pipe', 'mypipe', 'p', 'A pipe with a name: one program writes, another reads, through the kernel.', '$ mkfifo mypipe\n$ echo hello > mypipe &   # in one terminal\n$ cat mypipe              # in another\nhello'],
    ['📞', 'Docker\'s socket', '/run/docker.sock', 's', 'The docker command talks to the Docker daemon through this socket "file".', '$ ls -l /run/docker.sock\nsrw-rw---- 1 root docker 0 Nov 27 09:12 /run/docker.sock']
  ];
  var TYPE = { '-': 'regular file', d: 'directory', c: 'character device', b: 'block device', p: 'named pipe (FIFO)', s: 'socket', l: 'symlink' };
  $('#eiaf').innerHTML = EIAF.map(function (e, i) { return '<button type="button" data-i="' + i + '"><b>' + e[0] + '</b>' + e[1] + '</button>'; }).join('');
  function showEiaf(i) {
    var e = EIAF[i]; Core.$$('#eiaf button').forEach(function (b) { b.classList.toggle('sel', +b.dataset.i === i); });
    $('#eiafOut').innerHTML = '<h3>' + e[0] + ' ' + e[1] + '</h3><p><code style="font-size:.95em">' + esc(e[2]) + '</code> <span class="badge">' + e[3] + ' = ' + TYPE[e[3]] + '</span></p><p>' + e[4] + '</p><div class="term"><pre>' + esc(e[5]) + '</pre></div>';
    Core.initTerms($('#eiafOut'));
  }
  $('#eiaf').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) showEiaf(+b.dataset.i); });
  showEiaf(0);

  /* ---------- ls -l decoder ---------- */
  var LSL = [
    ['-', 'File type: <b>-</b> = regular file (d = folder, l = link, c/b = device…)'],
    ['rwx', '<b>Owner</b> (alice) can <b>r</b>ead, <b>w</b>rite and e<b>x</b>ecute (run) it.'],
    ['r-x', '<b>Group</b> (devs) can read and run it, but not change it.'],
    ['---', '<b>Others</b> (everyone else) can do nothing at all. → <a href="security.html#perm">permissions, Chapter 9</a>'],
    ['1', 'Number of <b>hard links</b> (names) pointing to this inode.'],
    ['alice', 'The <b>owner</b> (user).'],
    ['devs', 'The <b>group</b>.'],
    ['4096', 'Size in <b>bytes</b> (use <code>ls -lh</code> for "4.0K").'],
    ['Mar 3 10:15', 'Last <b>modified</b> time (mtime).'],
    ['deploy.sh', 'The <b>name</b> — stored in the directory, not in the inode!']
  ];
  $('#lsl').innerHTML = LSL.map(function (p, i) { return '<span tabindex="0" data-i="' + i + '">' + esc(p[0]) + '</span>'; }).join('');
  function lslShow(i) { Core.$$('#lsl span').forEach(function (s) { s.classList.toggle('sel', +s.dataset.i === i); }); $('#lslInfo').innerHTML = '💡 ' + LSL[i][1]; }
  ['mouseover', 'click', 'focusin'].forEach(function (ev) { $('#lsl').addEventListener(ev, function (e) { var s = e.target.closest('[data-i]'); if (s) lslShow(+s.dataset.i); }); });

  /* ---------- FHS explorer ---------- */
  var FHS = [
    ['/', '🌳', 'yellow', 'The trunk of the tree', 'The root of everything. Every file, disk and device hangs below it.', ['bin', 'etc', 'home', 'usr', 'var', '…'], 'ls /'],
    ['/bin', '🧰', 'blue', 'The toolbox', 'Essential commands everyone uses: ls, cp, cat, bash. (Today a shortcut to /usr/bin.)', ['ls', 'cat', 'cp', 'bash'], 'ls /bin | head'],
    ['/sbin', '🔧', 'blue', 'The admin\'s toolbox', 'System tools for the administrator: ip, fdisk, reboot. (→ /usr/sbin)', ['ip', 'fdisk', 'reboot', 'mkfs.ext4'], 'ls /sbin | head'],
    ['/boot', '⏰', 'purple', 'The alarm clock', 'Everything needed to start Linux: the kernel, the initramfs and GRUB.', ['vmlinuz-6.8.0', 'initrd.img-6.8.0', 'grub/', 'efi/'], 'ls /boot'],
    ['/dev', '🔌', 'green', 'Hardware doorbells', 'Device files for every piece of hardware, created live by the kernel (devtmpfs) and udev.', ['nvme0n1', 'null', 'tty1', 'input/', 'random'], 'ls /dev | head'],
    ['/etc', '⚙️', 'orange', 'The settings drawer', 'System-wide configuration as plain text files. Back this up!', ['hostname', 'passwd', 'fstab', 'hosts', 'ssh/', 'systemd/'], 'cat /etc/hostname'],
    ['/home', '🛏️', 'pink', 'The bedrooms', 'One private folder per user for documents, downloads, settings (dotfiles like ~/.bashrc).', ['kid/', 'alice/', 'bob/'], 'echo $HOME'],
    ['/root', '👑', 'pink', 'The boss\'s bedroom', 'The home folder of the root (admin) user. Kept separate so it works even if /home is broken.', ['.bashrc', '.ssh/'], 'sudo ls /root'],
    ['/lib', '🧩', 'blue', 'Spare parts', 'Shared libraries programs need, and kernel modules (/lib/modules). (→ /usr/lib)', ['libc.so.6', 'modules/', 'firmware/'], 'ls /lib/modules'],
    ['/media', '💿', 'teal', 'Auto parking spot', 'USB sticks and SD cards get mounted here automatically.', ['kid/USB_STICK/'], 'ls /media/$USER'],
    ['/mnt', '🅿️', 'teal', 'Manual parking spot', 'An empty spot for temporary mounts you do yourself.', ['(usually empty)'], 'sudo mount /dev/sdb1 /mnt'],
    ['/opt', '🎁', 'blue', 'The guest room', 'Optional, self-contained add-on software from vendors.', ['google/chrome/', 'zoom/'], 'ls /opt'],
    ['/proc', '🔍', 'green', 'Live x-ray (not on disk!)', 'A virtual file system: one folder per process, plus kernel info. Invented on the fly.', ['1/', '2211/', 'cpuinfo', 'meminfo', 'sys/'], 'cat /proc/uptime'],
    ['/run', '📌', 'yellow', 'Sticky notes for right now', 'Info about the running system since boot: PID files, sockets. Lives in RAM (tmpfs).', ['docker.sock', 'user/1000/', 'systemd/'], 'ls /run'],
    ['/srv', '🍽️', 'teal', 'The serving counter', 'Files this machine serves to others: websites, FTP.', ['www/', 'git/'], 'ls /srv'],
    ['/sys', '🎛️', 'green', 'The control panel (not on disk!)', 'sysfs: devices, drivers, and kernel objects as files you can read and sometimes write.', ['class/', 'block/', 'devices/', 'fs/cgroup/'], 'ls /sys/class'],
    ['/tmp', '🗒️', 'yellow', 'Scrap paper', 'Temporary files for anyone. Cleaned at reboot. The sticky bit (t) stops people deleting each other\'s files.', ['(random temp files)'], 'ls -ld /tmp\ndrwxrwxrwt 18 root root 640 /tmp'],
    ['/usr', '🏛️', 'blue', 'The big library of programs', '"Unix System Resources": almost all installed programs, libraries and docs. /usr/local = stuff YOU installed by hand.', ['bin/', 'lib/', 'share/', 'local/'], 'ls /usr/bin | wc -l\n2143'],
    ['/var', '📓', 'yellow', 'Things that change: the diary', 'Logs, caches, databases, mail, and Docker\'s storage (/var/lib/docker).', ['log/', 'cache/', 'lib/', 'spool/'], 'sudo tail -n 2 /var/log/syslog']
  ];
  $('#fhsTree').innerHTML = FHS.map(function (d, i) { return '<button type="button" role="option" class="' + (i === 0 ? 'root' : '') + '" data-i="' + i + '"><span class="dot" style="background:' + SK.solid(d[2]) + '"></span>' + d[1] + ' ' + d[0] + '</button>'; }).join('');
  function fhsShow(i) {
    var d = FHS[i]; Core.$$('#fhsTree button').forEach(function (b) { var on = +b.dataset.i === i; b.classList.toggle('sel', on); b.setAttribute('aria-selected', on); });
    $('#fhsInfo').innerHTML = '<h3>' + d[1] + ' <code style="font-size:.8em">' + d[0] + '</code></h3><p class="anno">' + d[3] + '</p><p>' + d[4] + '</p>' +
      '<p><b>Inside:</b> ' + d[5].map(function (x) { return '<span class="pill-tag">' + esc(x) + '</span>'; }).join(' ') + '</p>' +
      '<div class="term"><pre>' + esc(d[6].split('\n').map(function (l, k) { return k === 0 ? '$ ' + l : l; }).join('\n')) + '</pre></div>';
    Core.initTerms($('#fhsInfo'));
  }
  $('#fhsTree').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) fhsShow(+b.dataset.i); });
  fhsShow(5);

  /* ---------- fd diagram ---------- */
  SK.diagram('#fdD', {
    title: 'File descriptor table', w: 860, h: 330, fs: 16, minw: true,
    groups: [{ x: 4, y: 4, w: 210, h: 322, label: 'process: fd table', c: 'pink' }, { x: 300, y: 4, w: 250, h: 322, label: 'kernel: open files', c: 'purple' }],
    nodes: [
      { id: 'f0', x: 20, y: 44, w: 180, h: 46, label: '0 · stdin', c: 'yellow' },
      { id: 'f1', x: 20, y: 100, w: 180, h: 46, label: '1 · stdout', c: 'yellow' },
      { id: 'f2', x: 20, y: 156, w: 180, h: 46, label: '2 · stderr', c: 'yellow' },
      { id: 'f3', x: 20, y: 212, w: 180, h: 46, label: '3 · notes.txt', c: 'green' },
      { id: 'f4', x: 20, y: 268, w: 180, h: 46, label: '4 · socket', c: 'blue' },
      { id: 'o1', x: 316, y: 70, w: 220, h: 60, label: 'terminal (read+write)', sub: 'offset –', c: 'purple' },
      { id: 'o2', x: 316, y: 196, w: 220, h: 56, label: 'notes.txt (read)', sub: 'offset 120', c: 'purple' },
      { id: 'o3', x: 316, y: 262, w: 220, h: 56, label: 'TCP connection', sub: 'to example.com:443', c: 'purple' },
      { id: 't1', x: 640, y: 60, w: 200, h: 76, icon: '🖥️', label: '/dev/pts/0', c: 'teal' },
      { id: 't2', x: 640, y: 166, w: 200, h: 70, icon: '🧾', label: 'inode 1311', c: 'green' },
      { id: 't3', x: 640, y: 254, w: 200, h: 70, icon: '🌐', label: 'network stack', c: 'blue' }
    ],
    edges: [{ from: 'f0', to: 'o1' }, { from: 'f1', to: 'o1' }, { from: 'f2', to: 'o1' }, { from: 'f3', to: 'o2' }, { from: 'f4', to: 'o3' }, { from: 'o1', to: 't1' }, { from: 'o2', to: 't2' }, { from: 'o3', to: 't3' }]
  });

  /* ---------- inode diagram ---------- */
  SK.diagram('#inodeD', {
    title: 'Directory entries point to inodes which point to data blocks', w: 860, h: 270, fs: 16,
    nodes: [
      { id: 'dir', x: 10, y: 40, w: 230, h: 190, label: '📁 /home/kid', sub: 'notes.txt → 1311\nbackup.txt → 1311\ngames/ → 1400\nphoto.png → 1522', c: 'yellow', top: 14, sfs: 15, mono: true, m: [10, 10, 390, 130] },
      { id: 'ino', x: 320, y: 20, w: 260, h: 230, label: '🧾 inode 1311', sub: 'type: regular file\nowner: kid (1000)\nperms: rw-r--r--\nsize: 13 bytes\nlinks: 2\ntimes: a/m/c\nblocks → 8812, 8813', c: 'green', top: 14, sfs: 15, m: [10, 170, 240, 220] },
      { id: 'b1', x: 670, y: 50, w: 170, h: 70, label: 'block 8812', sub: '"Hello "', c: 'blue', mono: true, m: [270, 190, 130, 80] },
      { id: 'b2', x: 670, y: 150, w: 170, h: 70, label: 'block 8813', sub: '"inode!"', c: 'blue', mono: true, m: [270, 300, 130, 80] }
    ],
    edges: [{ from: 'dir', to: 'ino', label: 'name → number', mNoLabel: true }, { from: 'ino', to: 'b1' }, { from: 'ino', to: 'b2' }],
    mobile: { w: 410, h: 400 }
  });

  /* ---------- inode lab ---------- */
  var dir, inodes, disk, nextIno, ilog;
  function ilReset() { dir = []; inodes = {}; disk = new Array(32).fill(null); [0, 1, 2, 5, 9].forEach(function (b) { disk[b] = 'sys'; }); nextIno = 1311; $('#ilLog').innerHTML = ''; L('Empty folder. Start by creating <b>notes.txt</b>.'); ilDraw(); }
  function L(m) { var d = document.createElement('div'); d.innerHTML = m; $('#ilLog').insertBefore(d, $('#ilLog').firstChild); }
  function find(n) { return dir.filter(function (e) { return e.name === n; })[0]; }
  function allocBlocks(n) { var out = []; for (var i = 0; i < disk.length && out.length < n; i++) if (!disk[i]) out.push(i); return out; }
  function ilDraw() {
    $('#ilDir').innerHTML = '<tr><th>name</th><th>→ inode</th></tr>' + (dir.map(function (e) { return '<tr><td>' + e.name + '</td><td>' + e.ino + '</td></tr>'; }).join('') || '<tr><td colspan="2">(empty)</td></tr>');
    $('#ilIno').innerHTML = '<tr><th>#</th><th>type</th><th>links</th><th>data</th></tr>' + (Object.keys(inodes).map(function (k) { var n = inodes[k]; return '<tr><td>' + k + '</td><td>' + (n.type === 'link' ? '↪️ link' : '📄 file') + '</td><td>' + n.links + '</td><td>' + (n.type === 'link' ? '"' + n.target + '"' : n.blocks.length + ' blk') + '</td></tr>'; }).join('') || '<tr><td colspan="4">(none)</td></tr>');
    $('#ilBlk').innerHTML = disk.map(function (b, i) { return '<div class="' + (b === 'sys' ? 's' : b ? 'u' : '') + '" title="block ' + i + '">' + (b && b !== 'sys' ? b : '') + '</div>'; }).join('');
  }
  $('#inodeLab').addEventListener('click', function (e) {
    var b = e.target.closest('[data-il]'); if (!b) return; var a = b.dataset.il;
    if (a === 'reset') return ilReset();
    if (a === 'create') {
      if (find('notes.txt')) return L('notes.txt already exists.');
      var ino = nextIno++, blks = allocBlocks(2); blks.forEach(function (x) { disk[x] = ino; });
      inodes[ino] = { type: 'file', links: 1, blocks: blks, data: 'Hello inode!' }; dir.push({ name: 'notes.txt', ino: ino });
      L('📝 Created <b>notes.txt</b>: new inode <b>' + ino + '</b>, 2 data blocks (' + blks.join(', ') + '). The folder just stores "notes.txt → ' + ino + '".');
    } else if (a === 'hard') {
      var t = find('notes.txt'); if (!t) return L('🤔 Create notes.txt first (a hard link needs an existing inode).');
      if (find('backup.txt')) return L('backup.txt already exists.');
      dir.push({ name: 'backup.txt', ino: t.ino }); inodes[t.ino].links++;
      L('🔗 Hard link: <b>backup.txt → ' + t.ino + '</b>, the SAME inode. No data copied! Link count is now ' + inodes[t.ino].links + '.');
    } else if (a === 'soft') {
      if (find('shortcut.txt')) return L('shortcut.txt already exists.');
      var si = nextIno++; inodes[si] = { type: 'link', links: 1, blocks: [], target: 'notes.txt' }; dir.push({ name: 'shortcut.txt', ino: si });
      L('↪️ Symlink: <b>shortcut.txt</b> gets its own inode <b>' + si + '</b> that just stores the text "notes.txt". (ext4 keeps short paths inside the inode itself — no data block needed!)');
    } else if (a === 'append') {
      var bk = find('backup.txt'); if (!bk) return L('Make the hard link backup.txt first.');
      inodes[bk.ino].data += ' 🖍️ edited'; L('✏️ Edited <b>backup.txt</b>. Since it\'s the same inode, notes.txt changed too! Try 👀 cat all.');
    } else if (a === 'rm') {
      var n = find('notes.txt'); if (!n) return L('No notes.txt to delete.');
      dir = dir.filter(function (e) { return e !== n; }); var nd = inodes[n.ino]; nd.links--;
      if (nd.links === 0) { nd.blocks.forEach(function (x) { disk[x] = null; }); delete inodes[n.ino]; L('🗑️ Removed the name notes.txt. Link count hit <b>0</b> → inode ' + n.ino + ' and its blocks are freed.'); }
      else L('🗑️ Removed the <i>name</i> notes.txt. Inode ' + n.ino + ' still has ' + nd.links + ' link (backup.txt), so the data stays! That\'s why <code>rm</code> is really called <b>unlink()</b>.');
    } else if (a === 'cat') {
      if (!dir.length) return L('Nothing to cat.');
      dir.forEach(function (e) {
        var nd = inodes[e.ino];
        if (nd.type === 'link') { var tg = find(nd.target); L('$ cat shortcut.txt → ' + (tg ? '"' + esc(inodes[tg.ino].data) + '" (followed the path to notes.txt)' : '❌ <b>No such file or directory</b> — the symlink is <b>dangling</b>: it points to a name that no longer exists.')); }
        else L('$ cat ' + e.name + ' → "' + esc(nd.data) + '"');
      });
    }
    ilDraw();
  });
  ilReset();

  /* ---------- VFS ---------- */
  SK.diagram('#vfsD', {
    title: 'Virtual File System layers', w: 860, h: 380, fs: 16,
    nodes: [
      { id: 'a1', x: 120, y: 8, w: 130, h: 50, label: '🐱 cat', c: 'pink', m: [10, 8, 120, 50] },
      { id: 'a2', x: 365, y: 8, w: 130, h: 50, label: '📝 vim', c: 'pink', m: [145, 8, 120, 50] },
      { id: 'a3', x: 610, y: 8, w: 130, h: 50, label: '🐳 docker', c: 'pink', m: [280, 8, 120, 50] },
      { id: 'sc', x: 60, y: 92, w: 740, h: 46, label: '🚪 open() read() write() close() stat()', c: 'orange', m: [10, 92, 390, 46] },
      { id: 'vfs', x: 60, y: 168, w: 740, h: 56, label: '🔌 VFS — one interface: inodes, dentries, files, superblocks', c: 'purple', m: [10, 168, 390, 70] },
      { id: 'e4', x: 10, y: 262, w: 130, h: 50, label: 'ext4', c: 'green', m: [10, 270, 120, 46] },
      { id: 'bt', x: 152, y: 262, w: 130, h: 50, label: 'btrfs', c: 'green', m: [145, 270, 120, 46] },
      { id: 'nf', x: 294, y: 262, w: 130, h: 50, label: 'NFS', c: 'blue', m: [280, 270, 120, 46] },
      { id: 'pr', x: 436, y: 262, w: 130, h: 50, label: 'procfs', c: 'yellow', m: [10, 326, 120, 46] },
      { id: 'tm', x: 578, y: 262, w: 130, h: 50, label: 'tmpfs', c: 'teal', m: [145, 326, 120, 46] },
      { id: 'ov', x: 720, y: 262, w: 130, h: 50, label: 'overlayfs', c: 'pink', m: [280, 326, 120, 46] }
    ],
    edges: [{ from: 'a1', to: 'sc' }, { from: 'a2', to: 'sc' }, { from: 'a3', to: 'sc' }, { from: 'sc', to: 'vfs' }, { from: 'vfs', to: 'e4' }, { from: 'vfs', to: 'bt' }, { from: 'vfs', to: 'nf' }, { from: 'vfs', to: 'pr' }, { from: 'vfs', to: 'tm' }, { from: 'vfs', to: 'ov' }],
    texts: [{ x: 75, y: 344, t: '💾 SSD', fs: 15, mHide: true }, { x: 217, y: 344, t: '💾 SSD', fs: 15, mHide: true }, { x: 359, y: 344, t: '🌐 server', fs: 15, mHide: true }, { x: 501, y: 344, t: '⚙️ kernel', fs: 15, mHide: true }, { x: 643, y: 344, t: '🧮 RAM', fs: 15, mHide: true }, { x: 785, y: 344, t: '🥞 layers', fs: 15, mHide: true }],
    mobile: { w: 410, h: 384 }
  });

  /* ---------- mount ---------- */
  var MD = SK.diagram('#mountD', {
    title: 'Mounting a USB stick', w: 860, h: 300, fs: 16,
    nodes: [
      { id: 'r', x: 230, y: 10, w: 100, h: 50, label: '/', c: 'yellow', m: [150, 10, 100, 50] },
      { id: 'h', x: 60, y: 110, w: 120, h: 50, label: 'home', c: 'pink', m: [10, 100, 110, 50] },
      { id: 'e', x: 220, y: 110, w: 120, h: 50, label: 'etc', c: 'orange', m: [145, 100, 110, 50] },
      { id: 'm', x: 380, y: 110, w: 120, h: 50, label: 'mnt', c: 'teal', m: [280, 100, 110, 50] },
      { id: 'u', x: 380, y: 210, w: 120, h: 56, label: 'usb', sub: '(empty)', c: 'teal', dash: true, m: [280, 190, 110, 56] },
      { id: 'dev', x: 640, y: 20, w: 200, h: 80, icon: '🔌', label: '/dev/sdb1', sub: 'USB stick (FAT32)', c: 'blue', m: [10, 300, 180, 80] },
      { id: 'p', x: 600, y: 200, w: 110, h: 50, label: '📷 photos', c: 'blue', m: [210, 300, 90, 50] },
      { id: 's', x: 730, y: 200, w: 110, h: 50, label: '🎵 songs', c: 'blue', m: [310, 300, 90, 50] }
    ],
    edges: [{ from: 'r', to: 'h' }, { from: 'r', to: 'e' }, { from: 'r', to: 'm' }, { from: 'm', to: 'u' }, { from: 'dev', to: 'p' }, { from: 'dev', to: 's' }, { from: 'u', to: 'dev', dash: true, c: 'pink', label: 'mount', curve: -30, m: { curve: 0 } }],
    mobile: { w: 410, h: 390 }
  });
  SK.flow(MD, [
    { on: ['r', 'h', 'e', 'm', 'u'], say: '🌳 The Linux tree. <code>/mnt/usb</code> is just an empty folder — a parking spot.' },
    { on: ['dev', 'p', 's'], say: '🔌 You plug in a USB stick. The kernel\'s USB + storage drivers detect it, and udev creates the device file <code>/dev/sdb1</code>. But its files aren\'t in the tree yet!' },
    { on: ['u', 'dev'], edges: ['u>dev'], go: [['dev', 'u', { label: 'mount', c: 'pink' }]], say: '🧷 <code>sudo mount /dev/sdb1 /mnt/usb</code> — the stick\'s whole tree is <b>grafted</b> onto the empty folder. (Desktops do this automatically under <code>/media</code>.)', code: '$ sudo mount /dev/sdb1 /mnt/usb' },
    { on: ['u', 'p', 's'], edges: ['u>dev'], say: '📷 Now <code>/mnt/usb/photos</code> works like any folder. The VFS sends reads to the FAT driver instead of ext4 — apps can\'t tell the difference.', code: '$ ls /mnt/usb\nphotos  songs' },
    { on: ['u'], say: '⏏️ <code>sudo umount /mnt/usb</code> flushes any cached writes and detaches it. Always unmount before pulling the stick out, or recent writes may be lost!', code: '$ sudo umount /mnt/usb' }
  ]);

  /* ---------- journal ---------- */
  var JD = SK.diagram('#journalD', {
    title: 'Journaling', w: 860, h: 260, fs: 17,
    nodes: [
      { id: 'app', x: 10, y: 90, w: 150, h: 80, icon: '📝', label: 'save file', c: 'pink', m: [10, 10, 180, 76] },
      { id: 'j', x: 260, y: 20, w: 220, h: 100, icon: '📒', label: 'journal', sub: 'small log area on disk', c: 'yellow', m: [220, 10, 180, 100] },
      { id: 'd', x: 600, y: 90, w: 220, h: 100, icon: '💾', label: 'real location', sub: 'inode + data blocks', c: 'blue', shape: 'cyl', m: [220, 170, 180, 100] },
      { id: 'boom', x: 260, y: 170, w: 220, h: 76, icon: '⚡', label: 'power cut!', c: 'red', m: [10, 180, 180, 76] }
    ],
    edges: [{ from: 'app', to: 'j', label: '1 write intent', mNoLabel: true }, { from: 'j', to: 'd', label: '2 checkpoint', mNoLabel: true }, { from: 'boom', to: 'j', dash: true, label: 'replay at boot', mNoLabel: true }],
    mobile: { w: 410, h: 280 }
  });
  SK.flow(JD, [
    { on: ['app'], say: '📝 You save a file. Several things must change together: the data blocks, the inode (size, time) and the free-space map. If only half happens, the file system is broken.' },
    { on: ['j'], go: [['app', 'j', { label: 'plan', c: 'yellow' }]], say: '📒 Step 1: write the <b>plan</b> into the journal first: "change inode 1311, blocks 8812–8813, bitmap…". Then a <b>commit</b> record = "this plan is complete".' },
    { on: ['d'], go: [['j', 'd', { label: 'do it', c: 'blue' }]], say: '💾 Step 2 (<b>checkpoint</b>): write the changes to their real places. Then the journal entry can be erased.' },
    { on: ['boom', 'j'], say: '⚡ Power cut <b>before</b> the commit record? At boot, Linux sees an incomplete plan and ignores it → the old version is intact. ✅' },
    { on: ['boom', 'j', 'd'], go: [['j', 'd', { label: 'replay', c: 'green' }]], say: '⚡ Power cut <b>after</b> the commit but before the checkpoint? At boot, Linux <b>replays</b> the journal and finishes the job → new version, consistent. ✅ No more hour-long <code>fsck</code> checks!' }
  ]);

  OSLab.mount(document.getElementById('lab'), { scenarios: ['files', 'tree', 'save'] });

  Core.quiz('#quizBox', [
    { q: 'What does "everything is a file" mean in Linux?', a: ['Linux only has documents', 'Devices, processes and settings can be used through the same open/read/write/close interface', 'You must save everything', 'Folders don\'t exist'], c: 1, why: 'Keyboards (/dev/input), disks (/dev/nvme0n1), processes (/proc/PID) and kernel knobs (/proc/sys, /sys) are all accessed like files.' },
    { q: 'Where are system configuration files kept?', a: ['/home', '/etc', '/tmp', '/dev'], c: 1, why: '/etc is the "settings drawer": hostname, passwd, fstab, ssh config, systemd units…' },
    { q: 'Which folder is NOT stored on the disk but generated live by the kernel?', a: ['/usr', '/var', '/proc', '/home'], c: 2, why: '/proc (and /sys) are virtual file systems. Their contents are created the moment you read them.' },
    { q: 'File descriptor 2 is normally…', a: ['stdin (keyboard)', 'stdout (screen)', 'stderr (error messages)', 'a socket'], c: 2, why: '0 = stdin, 1 = stdout, 2 = stderr. "2> file" redirects only the errors.' },
    { q: 'You delete a file that has a hard link. What happens to the data?', a: ['Gone forever', 'It stays — the other name still points to the same inode', 'It moves to /tmp', 'The hard link becomes a symlink'], c: 1, why: 'rm only removes a name (unlink). Data is freed only when the inode\'s link count drops to 0 (and no process has it open).' },
    { q: 'What does a journal protect against?', a: ['Viruses', 'A crash or power cut leaving the file system half-updated', 'Slow internet', 'Typos'], c: 1, why: 'By writing the plan first and committing, the file system can replay or discard changes after a crash, staying consistent.' }
  ]);
})();
