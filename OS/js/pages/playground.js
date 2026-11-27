/* Chapter 11 — a pretend Linux shell with a tiny virtual file system */
(function () {
  'use strict';
  var $ = Core.$, esc = Core.esc;
  var T0 = Date.now();
  var USER = 'kid', HOME = '/home/kid', HOST = 'sketchbook';

  /* ---------- virtual file system ---------- */
  function D(c, m, o) { return { t: 'd', c: c || {}, m: m || '755', o: o || 'root' }; }
  function F(d, m, o) { return { t: 'f', d: d, m: m || '644', o: o || 'root' }; }
  function L(to) { return { t: 'l', to: to, m: '777', o: 'root' }; }
  function DEV(t) { return { t: t, d: '', m: t === 'b' ? '660' : '666', o: 'root' }; }
  var BIN = 'ELF 64-bit executable (a compiled program — not readable text!)';
  var progs = ['bash', 'ls', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'grep', 'ps', 'top', 'free', 'df', 'echo', 'python3', 'vim', 'nano', 'curl', 'ssh', 'git', 'docker', 'sudo', 'wc', 'head', 'tail', 'sort', 'tree', 'uname', 'whoami', 'id', 'chmod', 'stat', 'which', 'neofetch', 'cowsay'];
  var usrbin = {}; progs.forEach(function (p) { usrbin[p] = F(BIN, '755'); });
  usrbin.sudo.m = '4755';
  function uptimeS() { return 182 + Math.floor((Date.now() - T0) / 1000); }
  var root = D({
    bin: L('usr/bin'), sbin: L('usr/sbin'), lib: L('usr/lib'),
    boot: D({ 'vmlinuz-6.8.0-sketch': F('(compressed Linux kernel — binary)'), 'initrd.img-6.8.0-sketch': F('(initramfs archive — binary)'), grub: D({ 'grub.cfg': F('menuentry "SketchLinux" {\n  linux /boot/vmlinuz-6.8.0-sketch root=UUID=3f2a ro quiet\n  initrd /boot/initrd.img-6.8.0-sketch\n}') }) }),
    dev: D({ null: DEV('c'), zero: DEV('c'), random: DEV('c'), urandom: DEV('c'), tty: DEV('c'), tty1: DEV('c'), nvme0n1: DEV('b'), nvme0n1p1: DEV('b'), nvme0n1p2: DEV('b'), pts: D({ '0': DEV('c') }), input: D({ event3: DEV('c') }), shm: D({}, '1777') }),
    etc: D({
      hostname: F(HOST), hosts: F('127.0.0.1  localhost\n127.0.1.1  sketchbook'),
      passwd: F('root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nkid:x:1000:1000:Kid Coder,,,:/home/kid:/bin/bash'),
      group: F('root:x:0:\nsudo:x:27:kid\ndocker:x:998:kid\nkid:x:1000:'), shadow: F('root:$y$j9T$…:19700:0:99999:7:::', '640'),
      fstab: F('UUID=3f2a…  /          ext4  defaults    0 1\nUUID=9C1B…  /boot/efi  vfat  umask=0077  0 1'),
      'os-release': F('NAME="SketchLinux"\nVERSION="1.0 (Crayon)"\nID=sketch\nPRETTY_NAME="SketchLinux 1.0"'),
      motd: F('Welcome to SketchLinux! 🐧 Have fun exploring.'), shells: F('/bin/sh\n/bin/bash'),
      ssh: D({ sshd_config: F('Port 22\nPermitRootLogin no\nPasswordAuthentication no') }), systemd: D({ system: D({}) })
    }),
    home: D({ kid: D({
      'notes.txt': F('Things I learned:\n- the kernel is the boss\n- everything is a file\n- PID 1 is systemd\n- free RAM becomes page cache', '644', 'kid'),
      'hello.sh': F('#!/bin/bash\necho "Hello from a script!"', '755', 'kid'),
      'todo.txt': F('banana\napple\ncherry\nlearn linux\napple pie', '644', 'kid'),
      Documents: D({ 'homework.txt': F('Explain what an OS does in 3 words: manage, share, protect.', '644', 'kid') }, '755', 'kid'),
      Music: D({ 'song.mp3': F('(binary audio data 🎵)', '644', 'kid') }, '755', 'kid'),
      '.bashrc': F('# ~/.bashrc\nalias ll="ls -l"\nexport PS1="\\u@\\h:\\w$ "', '644', 'kid'),
      '.treasure.txt': F('🏴‍☠️ You found the hidden file! Files starting with "." are hidden — use ls -a to see them.', '644', 'kid')
    }, '755', 'kid') }),
    media: D({ kid: D({}) }), mnt: D({}), opt: D({}), srv: D({}),
    proc: D({
      cpuinfo: F(function () { var s = ''; for (var i = 0; i < 4; i++) s += 'processor\t: ' + i + '\nmodel name\t: Sketchy Crayon CPU @ 3.20GHz\ncpu cores\t: 4\n\n'; return s.trim(); }),
      meminfo: F(function () { return 'MemTotal:       16236544 kB\nMemFree:         6412032 kB\nMemAvailable:   11900120 kB\nCached:          5536000 kB\nSwapTotal:       2097148 kB\nSwapFree:        2097148 kB'; }),
      uptime: F(function () { return uptimeS() + '.42 ' + (uptimeS() * 7) + '.10'; }),
      version: F('Linux version 6.8.0-sketch (crayon@sketchbook) (gcc 13.2.0) #1 SMP PREEMPT_DYNAMIC'),
      loadavg: F('0.42 0.35 0.30 1/823 4243'),
      '1': D({ comm: F('systemd'), cmdline: F('/sbin/init splash'), status: F('Name:\tsystemd\nState:\tS (sleeping)\nPid:\t1\nPPid:\t0\nUid:\t0\t0\t0\t0\nThreads:\t1') }),
      self: D({ comm: F('cat'), status: F('Name:\tcat\nState:\tR (running)\nPid:\t4243\nPPid:\t4242\nUid:\t1000\t1000\t1000\t1000') }),
      sys: D({ kernel: D({ hostname: F(HOST), randomize_va_space: F('2') }), vm: D({ swappiness: F('60') }) })
    }, '555'),
    root: D({ '.bashrc': F('# root'), 'secret_plans.txt': F('Step 1: keep the system updated. Step 2: there is no step 2. 👑') }, '700'),
    run: D({ 'docker.sock': { t: 's', m: '660', o: 'root' }, systemd: D({}) }),
    sys: D({ class: D({ power_supply: D({ BAT0: D({ capacity: F('87'), status: F('Discharging') }) }), net: D({ eth0: D({ address: F('3c:7c:3f:1a:2b:9e'), speed: F('1000'), operstate: F('up') }) }), backlight: D({ intel_backlight: D({ brightness: F('900'), max_brightness: F('1500') }) }) }), firmware: D({ efi: D({}) }), fs: D({ cgroup: D({ 'cgroup.controllers': F('cpuset cpu io memory hugetlb pids rdma misc') }) }) }, '555'),
    tmp: D({}, '1777'),
    usr: D({ bin: D(usrbin), sbin: D({ ip: F(BIN, '755'), fdisk: F(BIN, '755'), reboot: F(BIN, '755') }), lib: D({ 'libc.so.6': F('(shared library — binary)') }), share: D({ doc: D({}) }), local: D({ bin: D({}) }) }),
    var: D({ log: D({ syslog: F('Nov 27 09:12:04 sketchbook systemd[1]: Started Network Manager.\nNov 27 09:12:05 sketchbook kernel: eth0: link up, 1000 Mbps\nNov 27 09:13:44 sketchbook sshd[1042]: Server listening on port 22.'), 'auth.log': F('Nov 27 09:20:01 sketchbook sudo: kid : COMMAND=/usr/bin/apt update', '640') }), cache: D({}), lib: D({ docker: D({}, '710') }), tmp: D({}, '1777') })
  });

  /* ---------- paths ---------- */
  var cwd = HOME, sudoMode = false;
  function norm(path) {
    if (!path || path === '~') path = HOME;
    if (path.indexOf('~/') === 0) path = HOME + path.slice(1);
    var parts = (path[0] === '/' ? path : cwd + '/' + path).split('/'), out = [];
    parts.forEach(function (p) { if (!p || p === '.') return; if (p === '..') out.pop(); else out.push(p); });
    return '/' + out.join('/');
  }
  function lookup(path, noFollowLast) {
    var parts = norm(path).split('/').filter(Boolean), node = root, real = [];
    for (var i = 0; i < parts.length; i++) {
      if (node.t !== 'd') return { err: 'Not a directory' };
      if (!canEnter(node)) return { err: 'Permission denied' };
      var nx = node.c[parts[i]]; if (!nx) return { err: 'No such file or directory' };
      if (nx.t === 'l' && !(noFollowLast && i === parts.length - 1)) {
        var tgt = lookup('/' + real.join('/') + '/' + nx.to); if (tgt.err) return tgt;
        node = tgt.node; real = tgt.path.split('/').filter(Boolean);
      } else { node = nx; real.push(parts[i]); }
    }
    return { node: node, path: '/' + real.join('/') };
  }
  function parentOf(path) { var p = norm(path), i = p.lastIndexOf('/'); return { dir: p.slice(0, i) || '/', name: p.slice(i + 1) }; }
  function isRoot() { return sudoMode; }
  function canEnter(n) { if (isRoot()) return true; var m = n.m.slice(-3); return n.o === USER ? (m[0] & 1) : (m[2] & 1); }
  function canRead(n) { if (isRoot()) return true; var m = n.m.slice(-3); return n.o === USER ? (m[0] & 4) : (m[2] & 4); }
  function canWrite(n) { if (isRoot()) return true; var m = n.m.slice(-3); return n.o === USER ? (m[0] & 2) : (m[2] & 2); }
  function content(n) { return typeof n.d === 'function' ? n.d() : (n.d || ''); }
  function permStr(n) {
    var t = { d: 'd', f: '-', l: 'l', c: 'c', b: 'b', s: 's', p: 'p' }[n.t], m = n.m.slice(-3), sp = n.m.length > 3 ? +n.m[0] : 0, s = t;
    for (var i = 0; i < 3; i++) { var b = +m[i], x = b & 1 ? 'x' : '-'; if (i === 0 && sp & 4) x = b & 1 ? 's' : 'S'; if (i === 2 && sp & 1) x = b & 1 ? 't' : 'T'; s += (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + x; }
    return s;
  }
  function size(n) { return n.t === 'd' ? 4096 : n.t === 'l' ? n.to.length : (n.t === 'f' ? String(content(n)).length : 0); }
  function colorName(name, n) {
    var cls = n.t === 'd' ? 'b' : n.t === 'l' ? 'm' : (n.t === 'c' || n.t === 'b') ? 'y' : n.t === 's' ? 'm' : (n.m.slice(-3)[0] & 1) ? 'g' : '';
    return cls ? '<span class="' + cls + '">' + esc(name) + '</span>' : esc(name);
  }

  /* ---------- commands ---------- */
  var history = [], out = $('#pgOut'), inp = $('#pgIn');
  function R(text, html) { return { text: text == null ? '' : String(text), html: html }; }
  function E(text) { return { text: String(text), err: true }; }
  var MAN = {
    ls: 'list directory contents. -l long format, -a show hidden files', cd: 'change directory', pwd: 'print working directory', cat: 'print files', echo: 'print text (use > to write a file)',
    touch: 'create an empty file', mkdir: 'make a directory', rm: 'remove files (-r for folders) — no recycle bin!', rmdir: 'remove an empty directory', mv: 'move / rename',
    whoami: 'print your user name', id: 'print your user and group IDs', hostname: 'print the computer\'s name', uname: 'print kernel info (-a all, -r release)', date: 'print the date',
    uptime: 'how long the system has been running', ps: 'list processes (aux = all users)', top: 'live view of processes', kill: 'send a signal to a process', free: 'show memory (-h = human sizes)',
    df: 'show disk space', lsblk: 'list block devices', history: 'commands you typed', clear: 'clear the screen', man: 'show the manual for a command', tree: 'draw the folder tree',
    chmod: 'change permissions, e.g. chmod 755 file', stat: 'show inode details', which: 'where is a command?', grep: 'print lines matching a word', wc: 'count lines/words/bytes (-l lines)',
    head: 'first lines (-n N)', tail: 'last lines (-n N)', sort: 'sort lines', sudo: 'run a command as root', neofetch: 'show system info with a logo', cowsay: 'a penguin says something', help: 'list commands'
  };
  var PROCS = [[1, 'root', 'systemd'], [2, 'root', '[kthreadd]'], [301, 'root', 'systemd-journald'], [812, 'root', 'NetworkManager'], [1042, 'root', 'sshd'], [1410, 'kid', 'gnome-shell'], [2211, 'kid', 'firefox'], [4123, 'root', 'nginx: master'], [4242, 'kid', 'bash'], [4243, 'kid', 'ps']];
  var killed = {};
  var CMD = {
    help: function () { return R('Commands you can try:\n  ' + Object.keys(MAN).sort().join('  ') + '\nTips: Tab completes · ↑ history · pipes work: ls /dev | grep tty\nType  man <command>  to learn what one does.'); },
    pwd: function () { return R(cwd); },
    whoami: function () { return R(isRoot() ? 'root' : USER); },
    id: function () { return R(isRoot() ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1000(kid) gid=1000(kid) groups=1000(kid),27(sudo),998(docker)'); },
    hostname: function () { return R(HOST); },
    uname: function (a) { var all = a.indexOf('-a') >= 0; return R(a.indexOf('-r') >= 0 ? '6.8.0-sketch' : all ? 'Linux sketchbook 6.8.0-sketch #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux' : 'Linux'); },
    date: function () { return R(new Date().toString()); },
    uptime: function () { var m = Math.floor(uptimeS() / 60); return R(' ' + new Date().toTimeString().slice(0, 8) + ' up ' + m + ' min,  1 user,  load average: 0.42, 0.35, 0.30'); },
    clear: function () { out.innerHTML = ''; return R(''); },
    history: function () { return R(history.map(function (h, i) { return ('    ' + (i + 1)).slice(-5) + '  ' + h; }).join('\n')); },
    echo: function (a) { return R(a.join(' ')); },
    man: function (a) { if (!a[0]) return E('What manual page do you want?'); return MAN[a[0]] ? R(a[0].toUpperCase() + '(1)\n\nNAME\n    ' + a[0] + ' — ' + MAN[a[0]]) : E('No manual entry for ' + a[0]); },
    which: function (a) { return a[0] && (usrbin[a[0]] || MAN[a[0]]) ? R('/usr/bin/' + a[0]) : E(a[0] ? a[0] + ' not found' : 'which: missing argument'); },
    cd: function (a) {
      var r = lookup(a[0] || HOME); if (r.err) return E('cd: ' + (a[0] || '') + ': ' + r.err);
      if (r.node.t !== 'd') return E('cd: ' + a[0] + ': Not a directory');
      if (!canEnter(r.node)) return E('cd: ' + a[0] + ': Permission denied (try sudo… just kidding, root\'s room is private!)');
      cwd = r.path; return R('');
    },
    ls: function (a) {
      var flags = a.filter(function (x) { return x[0] === '-'; }).join(''), long = flags.indexOf('l') >= 0, all = flags.indexOf('a') >= 0;
      var targets = a.filter(function (x) { return x[0] !== '-'; }); if (!targets.length) targets = ['.'];
      var texts = [], htmls = [], errs = 0;
      targets.forEach(function (t) {
        var r = lookup(t, long); if (r.err) { errs++; texts.push('ls: cannot access \'' + t + '\': ' + r.err); htmls.push('<span class="e">' + esc(texts[texts.length - 1]) + '</span>'); return; }
        var n = r.node, entries;
        if (n.t !== 'd') entries = [[parentOf(t).name, n]];
        else { if (!canRead(n)) { errs++; texts.push('ls: cannot open directory \'' + t + '\': Permission denied'); htmls.push('<span class="e">' + esc(texts[texts.length - 1]) + '</span>'); return; } entries = Object.keys(n.c).sort().filter(function (k) { return all || k[0] !== '.'; }).map(function (k) { return [k, n.c[k]]; }); if (all) entries = [['.', n], ['..', n]].concat(entries); }
        if (targets.length > 1) { texts.push(t + ':'); htmls.push(esc(t) + ':'); }
        if (long) entries.forEach(function (e) {
          var nm = e[0], x = e[1], o = x.o, line = permStr(x) + ' 1 ' + (o + '     ').slice(0, 5) + ' ' + (o + '     ').slice(0, 5) + ' ' + ('      ' + size(x)).slice(-6) + ' Nov 27 09:12 ';
          texts.push(line + nm + (x.t === 'l' ? ' -> ' + x.to : '')); htmls.push(esc(line) + colorName(nm, x) + (x.t === 'l' ? ' -> ' + esc(x.to) : ''));
        });
        else { texts.push(entries.map(function (e) { return e[0]; }).join('\n')); htmls.push(entries.map(function (e) { return colorName(e[0], e[1]); }).join('  ')); }
      });
      if (errs && errs === targets.length) return E(texts.join('\n'));
      return R(texts.join('\n'), htmls.join('\n'));
    },
    cat: function (a, stdin) {
      if (!a.length) return R(stdin || '');
      var res = [], err = false;
      a.forEach(function (f) {
        var r = lookup(f); if (r.err) { res.push('cat: ' + f + ': ' + r.err); err = true; return; }
        var n = r.node;
        if (n.t === 'd') { res.push('cat: ' + f + ': Is a directory'); err = true; return; }
        if (!canRead(n)) { res.push('cat: ' + f + ': Permission denied 🔒'); err = true; return; }
        if (r.path === '/dev/urandom' || r.path === '/dev/random') { var s = ''; for (var i = 0; i < 48; i++) s += String.fromCharCode(33 + Math.floor(Math.random() * 90)); res.push(s + '   ← endless random bytes (stopped for you 😉)'); return; }
        if (r.path === '/dev/zero') { res.push('(endless zero bytes — invisible! use: head -c 8 /dev/zero | xxd)'); return; }
        if (n.t === 'c' || n.t === 'b') { res.push(r.path === '/dev/null' ? '' : '(raw device data — on a real machine this needs sudo)'); return; }
        if (n.t === 's') { res.push('cat: ' + f + ': No such device or address (it\'s a socket — programs connect() to it)'); err = true; return; }
        res.push(content(n));
      });
      return err ? { text: res.join('\n'), err: true } : R(res.join('\n'));
    },
    touch: function (a) { return each(a, function (f) { var p = parentOf(f), d = lookup(p.dir); if (d.err) return 'touch: ' + f + ': ' + d.err; if (!canWrite(d.node)) return 'touch: cannot touch \'' + f + '\': Permission denied'; if (!d.node.c[p.name]) d.node.c[p.name] = F('', '644', isRoot() ? 'root' : USER); }); },
    mkdir: function (a) { return each(a.filter(function (x) { return x[0] !== '-'; }), function (f) { var p = parentOf(f), d = lookup(p.dir); if (d.err) return 'mkdir: ' + f + ': ' + d.err; if (!canWrite(d.node)) return 'mkdir: cannot create directory \'' + f + '\': Permission denied'; if (d.node.c[p.name]) return 'mkdir: cannot create directory \'' + f + '\': File exists'; d.node.c[p.name] = D({}, '755', isRoot() ? 'root' : USER); }); },
    rmdir: function (a) { return each(a, function (f) { var p = parentOf(f), d = lookup(p.dir), n = d.node && d.node.c[p.name]; if (!n) return 'rmdir: ' + f + ': No such file or directory'; if (n.t !== 'd') return 'rmdir: ' + f + ': Not a directory'; if (Object.keys(n.c).length) return 'rmdir: ' + f + ': Directory not empty'; if (!canWrite(d.node)) return 'rmdir: ' + f + ': Permission denied'; delete d.node.c[p.name]; }); },
    rm: function (a) {
      var rec = a.some(function (x) { return /^-.*r/.test(x); }), files = a.filter(function (x) { return x[0] !== '-'; });
      if (rec && files.some(function (f) { return norm(f) === '/'; })) return E('🛑 Whoa! "rm -rf /" would delete EVERYTHING on a real computer.\nModern rm refuses without --no-preserve-root. Never run it! (This pretend shell said no. 😅)');
      return each(files, function (f) {
        var p = parentOf(f), d = lookup(p.dir), n = d.node && d.node.c[p.name];
        if (!n) return 'rm: cannot remove \'' + f + '\': No such file or directory';
        if (n.t === 'd' && !rec) return 'rm: cannot remove \'' + f + '\': Is a directory (use rm -r)';
        if (!canWrite(d.node)) return 'rm: cannot remove \'' + f + '\': Permission denied';
        delete d.node.c[p.name];
      });
    },
    mv: function (a) { if (a.length < 2) return E('mv: missing file operand'); var s = parentOf(a[0]), sd = lookup(s.dir), n = sd.node && sd.node.c[s.name]; if (!n) return E('mv: cannot stat \'' + a[0] + '\': No such file or directory'); var t = lookup(a[1]), dest = t.node && t.node.t === 'd' ? { dir: t.path, name: s.name } : parentOf(a[1]); var dd = lookup(dest.dir); if (dd.err) return E('mv: ' + dd.err); if (!canWrite(sd.node) || !canWrite(dd.node)) return E('mv: Permission denied'); dd.node.c[dest.name] = n; delete sd.node.c[s.name]; return R(''); },
    chmod: function (a) { if (a.length < 2 || !/^[0-7]{3,4}$/.test(a[0])) return E('chmod: use a number like: chmod 755 file'); var r = lookup(a[1]); if (r.err) return E('chmod: ' + a[1] + ': ' + r.err); if (r.node.o !== USER && !isRoot()) return E('chmod: changing permissions of \'' + a[1] + '\': Operation not permitted'); r.node.m = a[0]; return R(''); },
    stat: function (a) { if (!a[0]) return E('stat: missing operand'); var r = lookup(a[0], true); if (r.err) return E('stat: ' + a[0] + ': ' + r.err); var n = r.node, ino = 1000 + (r.path.length * 37 % 900); return R('  File: ' + a[0] + '\n  Size: ' + size(n) + '\tType: ' + { d: 'directory', f: 'regular file', l: 'symbolic link', c: 'character device', b: 'block device', s: 'socket' }[n.t] + '\nInode: ' + ino + '\tLinks: 1\nAccess: (' + n.m + '/' + permStr(n) + ')  Uid: (' + (n.o === 'root' ? '0/root' : '1000/kid') + ')'); },
    tree: function (a) {
      var r = lookup(a[0] || '.'); if (r.err) return E('tree: ' + r.err); var lines = [a[0] || '.'], dirs = 0, files = 0;
      (function walk(n, pre, depth) {
        if (depth > 2 || n.t !== 'd' || !canRead(n)) return; var ks = Object.keys(n.c).filter(function (k) { return k[0] !== '.'; }).sort();
        ks.forEach(function (k, i) { var last = i === ks.length - 1, c = n.c[k]; lines.push(pre + (last ? '└── ' : '├── ') + k + (c.t === 'l' ? ' -> ' + c.to : '')); if (c.t === 'd') { dirs++; walk(c, pre + (last ? '    ' : '│   '), depth + 1); } else files++; });
      })(r.node, '', 0);
      return R(lines.join('\n') + '\n\n' + dirs + ' directories, ' + files + ' files' + (lines.length > 30 ? '' : ''));
    },
    ps: function (a) { var all = a.join('').indexOf('a') >= 0, list = PROCS.filter(function (p) { return !killed[p[0]] && (all || p[1] === 'kid' && (p[2] === 'bash' || p[2] === 'ps')); }); return R('  PID USER   COMMAND\n' + list.map(function (p) { return ('     ' + p[0]).slice(-5) + ' ' + (p[1] + '    ').slice(0, 6) + ' ' + p[2]; }).join('\n')); },
    top: function () { return R('top - up ' + Math.floor(uptimeS() / 60) + ' min, load average: 0.42, 0.35, 0.30\nTasks: 312 total, 1 running, 311 sleeping\n%Cpu(s):  6.1 us,  2.0 sy, 91.6 id\nMiB Mem:  15855.9 total, 6262.1 free, 4210.2 used, 5383.6 buff/cache\n\n  PID USER   %CPU %MEM COMMAND\n 2211 kid    12.1  6.3 firefox\n 1410 kid     4.0  2.1 gnome-shell\n  812 root    0.3  0.2 NetworkManager\n    1 root    0.0  0.1 systemd\n(a real top keeps updating — press q to quit it)'); },
    kill: function (a) { var pid = +a.filter(function (x) { return x[0] !== '-'; })[0]; var p = PROCS.filter(function (x) { return x[0] === pid; })[0]; if (!p || killed[pid]) return E('kill: (' + (pid || '?') + ') - No such process'); if (pid === 1) return E('kill: (1) - Operation not permitted. (PID 1 is special — killing it would panic the kernel!)'); if (p[1] === 'root' && !isRoot()) return E('kill: (' + pid + ') - Operation not permitted (it belongs to root)'); if (p[2] === 'bash') return E('That\'s your own shell! Let\'s not. 😅'); killed[pid] = 1; return R('Sent SIGTERM to ' + pid + ' (' + p[2] + '). It\'s gone from ps now.'); },
    free: function (a) { var h = a.indexOf('-h') >= 0; return R(h ? '               total   used   free  shared  buff/cache  available\nMem:            15Gi  4.1Gi  6.1Gi   312Mi       5.3Gi       11Gi\nSwap:          2.0Gi     0B  2.0Gi' : '               total     used     free   shared  buff/cache  available\nMem:        16236544  4311244  6412032   319488     5513268   11900120\nSwap:        2097148        0  2097148'); },
    df: function () { return R('Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p2  502G  121G  356G  26% /\n/dev/nvme0n1p1  1.0G   12M  1.0G   2% /boot/efi\ntmpfs           1.6G  2.1M  1.6G   1% /run'); },
    lsblk: function () { return R('NAME        SIZE TYPE MOUNTPOINTS\nnvme0n1     512G disk\n├─nvme0n1p1   1G part /boot/efi\n└─nvme0n1p2 511G part /'); },
    grep: function (a, stdin) {
      var flags = a.filter(function (x) { return x[0] === '-'; }).join(''), args = a.filter(function (x) { return x[0] !== '-'; }), pat = args[0];
      if (pat == null) return E('usage: grep WORD [FILE]'); var text;
      if (args[1]) { var c = CMD.cat([args[1]]); if (c.err) return c; text = c.text; } else text = stdin || '';
      var ic = flags.indexOf('i') >= 0, inv = flags.indexOf('v') >= 0, cnt = flags.indexOf('c') >= 0;
      var lines = text.split('\n').filter(function (l) { var m = ic ? l.toLowerCase().indexOf(pat.toLowerCase()) >= 0 : l.indexOf(pat) >= 0; return inv ? !m : m; });
      if (cnt) return R(String(lines.length));
      return R(lines.join('\n'), lines.map(function (l) { return esc(l).split(esc(pat)).join('<span class="e">' + esc(pat) + '</span>'); }).join('\n'));
    },
    wc: function (a, stdin) { var args = a.filter(function (x) { return x[0] !== '-'; }), text = stdin || ''; if (args[0]) { var c = CMD.cat([args[0]]); if (c.err) return c; text = c.text; } var l = text ? text.split('\n').length : 0, w = text.split(/\s+/).filter(Boolean).length; return R(a.indexOf('-l') >= 0 ? String(l) : l + ' ' + w + ' ' + text.length + (args[0] ? ' ' + args[0] : '')); },
    head: function (a, stdin) { return headTail(a, stdin, true); },
    tail: function (a, stdin) { return headTail(a, stdin, false); },
    sort: function (a, stdin) { var args = a.filter(function (x) { return x[0] !== '-'; }), text = stdin || ''; if (args[0]) { var c = CMD.cat([args[0]]); if (c.err) return c; text = c.text; } var l = text.split('\n').sort(); if (a.indexOf('-r') >= 0) l.reverse(); return R(l.join('\n')); },
    sudo: function (a, stdin) {
      if (!a.length) return E('usage: sudo COMMAND');
      if (a[0] === 'su' || (a[0] === '-i')) return E('Nice try! 😄 Becoming root for a whole session is risky. Run one command at a time with sudo.');
      sudoMode = true; var r; try { r = run1(a, stdin); } finally { sudoMode = false; }
      return { text: '[sudo] password for kid: ✱✱✱✱✱ (pretend)\n' + r.text, html: r.html ? '<span class="d">[sudo] password for kid: ✱✱✱✱✱ (pretend)</span>\n' + r.html : null, err: r.err };
    },
    neofetch: function () {
      var logo = ['    .--.     ', '   |o_o |    ', '   |:_/ |    ', '  //   \\ \\   ', ' (|     | )  ', "/'\\_   _/`\\  ", '\\___)=(___/  '];
      var info = ['kid@sketchbook', '--------------', 'OS: SketchLinux 1.0 x86_64', 'Kernel: 6.8.0-sketch', 'Uptime: ' + Math.floor(uptimeS() / 60) + ' mins', 'Shell: bash 5.2', 'Memory: 4.1GiB / 15.5GiB'];
      return R(logo.map(function (l, i) { return l + info[i]; }).join('\n'), logo.map(function (l, i) { return '<span class="y">' + esc(l) + '</span>' + (i < 2 ? '<span class="g">' + esc(info[i]) + '</span>' : esc(info[i])); }).join('\n'));
    },
    cowsay: function (a) { var t = a.join(' ') || 'Linux is fun!', line = ' ' + new Array(t.length + 3).join('_'); return R(line + '\n< ' + t + ' >\n ' + new Array(t.length + 3).join('-') + '\n    \\\n     \\   (o_\n         //\\\n         V_/_'); },
    fortune: function () { var f = ['Everything is a file. Even this fortune.', 'There is no place like 127.0.0.1', 'To understand recursion, see: recursion.', 'The kernel is the boss. Be nice to the kernel.', 'Free RAM is wasted RAM.']; return R(f[Math.floor(Math.random() * f.length)]); },
    exit: function () { return R('logout… (just kidding, this tab is your computer 🙂)'); }
  };
  function headTail(a, stdin, head) {
    var n = 10, args = [];
    for (var i = 0; i < a.length; i++) { if (a[i] === '-n') { n = +a[++i] || 10; } else if (/^-\d+$/.test(a[i])) n = +a[i].slice(1); else args.push(a[i]); }
    var text = stdin || ''; if (args[0]) { var c = CMD.cat([args[0]]); if (c.err) return c; text = c.text; }
    var l = text.split('\n'); return R((head ? l.slice(0, n) : l.slice(-n)).join('\n'));
  }
  function each(list, fn) { if (!list.length) return E('missing operand'); var errs = []; list.forEach(function (f) { var e = fn(f); if (e) errs.push(e); }); return errs.length ? E(errs.join('\n')) : R(''); }

  /* ---------- parsing & running ---------- */
  function tokenize(s) {
    var out = [], cur = '', q = null, had = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (q) { if (ch === q) q = null; else cur += ch; continue; }
      if (ch === '"' || ch === "'") { q = ch; had = true; continue; }
      if (ch === ' ') { if (cur || had) out.push(cur); cur = ''; had = false; continue; }
      cur += ch;
    }
    if (cur || had) out.push(cur);
    return out;
  }
  function expand(t) { return t.replace(/\$(HOME|USER|SHELL|PWD|HOSTNAME|\$|\?)/g, function (m, v) { return { HOME: HOME, USER: USER, SHELL: '/bin/bash', PWD: cwd, HOSTNAME: HOST, $: '4242', '?': '0' }[v]; }); }
  function run1(words, stdin) {
    var name = words[0], args = words.slice(1);
    if (/^(\.\/|\/)?.*\.sh$/.test(name)) { var r = lookup(name); if (r.err) return E('bash: ' + name + ': ' + r.err); if (!(r.node.m.slice(-3)[0] & 1)) return E('bash: ' + name + ': Permission denied (not executable — try chmod 755 ' + name + ')'); var m = content(r.node).match(/echo "([^"]*)"/); return R(m ? m[1] : ''); }
    if (name === 'll') { name = 'ls'; args = ['-l'].concat(args); }
    var fn = CMD[name];
    if (!fn) return E(name + ': command not found 🤔  (type help)');
    return fn(args, stdin);
  }
  function runLine(line) {
    var redir = null, m = line.match(/^(.*?)(>>?)\s*([^>|]+)$/);
    if (m) {
      var errOnly = /\s2$/.test(m[1]);
      line = errOnly ? m[1].slice(0, -1) : m[1]; redir = { app: m[2] === '>>', file: m[3].trim(), err: errOnly };
    }
    var segs = line.split('|').map(function (s) { return s.trim(); }).filter(Boolean), stdin = null, res = R('');
    for (var i = 0; i < segs.length; i++) {
      var words = tokenize(expand(segs[i])); if (!words.length) continue;
      res = run1(words, stdin); if (res.err) break; stdin = res.text;
    }
    if (redir && redir.err) {
      if (!res.err) return res;                      // only errors are redirected with 2>
      if (norm(redir.file) === '/dev/null') return R('');
      res = { text: res.text };                       // write the error text into the file below
    }
    if (redir && !res.err) {
      var p = parentOf(redir.file), d = lookup(p.dir);
      if (d.err || d.node.t !== 'd') return E('bash: ' + redir.file + ': No such file or directory');
      var ex = d.node.c[p.name];
      if (ex && ex.t === 'c') return R(''); // /dev/null and friends swallow output
      if (!canWrite(d.node) && !ex) return E('bash: ' + redir.file + ': Permission denied');
      if (ex && !canWrite(ex)) return E('bash: ' + redir.file + ': Permission denied');
      if (!ex) d.node.c[p.name] = ex = F('', '644', USER);
      var prev = redir.app ? content(ex) : '';
      ex.d = (prev ? prev + '\n' : '') + res.text;
      return R('');
    }
    return res;
  }
  function prompt() { var p = cwd === HOME ? '~' : (cwd.indexOf(HOME + '/') === 0 ? '~' + cwd.slice(HOME.length) : cwd); return USER + '@' + HOST + ':' + p + '$'; }
  function print(html) { var d = document.createElement('div'); d.innerHTML = html; out.appendChild(d); out.scrollTop = out.scrollHeight; }
  function submit(line) {
    print('<span class="g">' + esc(prompt()) + '</span> ' + esc(line));
    if (line.trim()) history.push(line);
    var res = runLine(line.trim());
    if (res.text || res.html) print(res.err ? '<span class="e">' + esc(res.text) + '</span>' : (res.html != null ? res.html : esc(res.text)));
    $('#pgPs').textContent = prompt();
    checkMissions(line.trim(), res);
  }

  /* ---------- input ---------- */
  var hi = 0;
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { submit(inp.value); inp.value = ''; hi = history.length; }
    else if (e.key === 'ArrowUp') { if (hi > 0) { hi--; inp.value = history[hi] || ''; } e.preventDefault(); }
    else if (e.key === 'ArrowDown') { if (hi < history.length) { hi++; inp.value = history[hi] || ''; } e.preventDefault(); }
    else if (e.key === 'Tab') { e.preventDefault(); complete(); }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });
  function complete() {
    var v = inp.value, parts = v.split(' '), last = parts[parts.length - 1], opts;
    if (parts.length === 1) opts = Object.keys(CMD).filter(function (c) { return c.indexOf(last) === 0; }).map(function (c) { return c + ' '; });
    else {
      var slash = last.lastIndexOf('/'), dir = slash >= 0 ? last.slice(0, slash + 1) : '', pre = last.slice(slash + 1), r = lookup(dir || '.');
      if (r.err || r.node.t !== 'd') return;
      opts = Object.keys(r.node.c).filter(function (k) { return k.indexOf(pre) === 0 && (pre[0] === '.' || k[0] !== '.'); }).map(function (k) { var n = r.node.c[k]; return dir + k + (n.t === 'd' || n.t === 'l' ? '/' : ' '); });
    }
    if (opts.length === 1) { parts[parts.length - 1] = opts[0]; inp.value = parts.join(' '); }
    else if (opts.length > 1) print('<span class="d">' + esc(opts.join('  ')) + '</span>');
  }
  $('#pg').addEventListener('click', function (e) { if (!window.getSelection().toString()) inp.focus({ preventScroll: true }); });
  var QUICK = ['help', 'ls', 'ls -l /', 'cd /etc', 'cat hostname', 'cd ~', 'cat notes.txt', 'free -h', 'ps aux', 'ls /dev | grep tty', 'neofetch', 'tree /home'];
  $('#quick').innerHTML = QUICK.map(function (q) { return '<button class="btn sm green" type="button">' + esc(q) + '</button>'; }).join('');
  $('#quick').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { submit(b.textContent); } });

  /* ---------- missions ---------- */
  var MISSIONS = [
    ['Find out who you are', 'whoami', function (l) { return /^whoami\b/.test(l); }],
    ['Find out where you are', 'pwd', function (l) { return /^pwd\b/.test(l); }],
    ['Go to the root of the tree', 'cd /', function () { return cwd === '/'; }],
    ['Look inside the settings drawer', 'ls /etc', function (l) { return /^ls\b.*\betc\b/.test(l) || (/^ls\b/.test(l) && cwd === '/etc'); }],
    ['Read the computer\'s name from a file', 'cat /etc/hostname', function (l) { return /^cat\b.*hostname/.test(l); }],
    ['Peek at the CPU through a "file"', 'cat /proc/cpuinfo', function (l) { return /cpuinfo/.test(l); }],
    ['Check how much memory is free', 'free -h', function (l) { return /^free\b/.test(l); }],
    ['List the running processes', 'ps aux', function (l) { return /^ps\b/.test(l); }],
    ['Find the hidden file in your home', 'ls -a ~', function (l) { return /^ls\b.*-\w*a/.test(l); }],
    ['Make a folder called games in your home', 'mkdir ~/games', function () { var r = lookup(HOME + '/games'); return !r.err && r.node.t === 'd'; }],
    ['Write a secret into a file', 'echo "hi" > secret.txt', function () { var r = lookup(HOME + '/secret.txt'); return !r.err && content(r.node).length > 0; }],
    ['Use a pipe to combine two commands', 'ls /dev | grep tty', function (l, res) { return l.indexOf('|') > 0 && !res.err; }]
  ];
  var mdone = Core.store.get('pg-missions', {});
  function drawMissions() {
    var n = MISSIONS.filter(function (m, i) { return mdone[i]; }).length;
    $('#mCount').textContent = n + '/' + MISSIONS.length;
    $('#missions').innerHTML = MISSIONS.map(function (m, i) { return '<div class="mission' + (mdone[i] ? ' done' : '') + '"><span class="ck">' + (mdone[i] ? '✅' : '⬜') + '</span><span class="t">' + m[0] + '<br><code title="click to type it" data-cmd="' + esc(m[1]) + '">' + esc(m[1]) + '</code></span></div>'; }).join('') +
      '<button class="btn sm" type="button" id="mReset">↺ reset missions</button>';
  }
  function checkMissions(line, res) {
    var newly = false;
    MISSIONS.forEach(function (m, i) { if (!mdone[i] && m[2](line, res)) { mdone[i] = true; newly = true; Core.toast('🎯 Mission done: <b>' + m[0] + '</b>!', 2200); } });
    if (newly) {
      Core.store.set('pg-missions', mdone); drawMissions();
      var n = MISSIONS.filter(function (m, i) { return mdone[i]; }).length;
      if (n === MISSIONS.length) { Core.markDone('playground'); Core.confetti(); Core.toast('⭐ All missions complete — sticker earned! You\'re a real terminal explorer.', 4500); }
    }
  }
  $('#missions').addEventListener('click', function (e) {
    var c = e.target.closest('[data-cmd]'); if (c) { inp.value = c.dataset.cmd; inp.focus(); return; }
    if (e.target.id === 'mReset') { mdone = {}; Core.store.set('pg-missions', mdone); drawMissions(); }
  });
  drawMissions();

  print('<span class="y">Welcome to SketchLinux 1.0 (pretend) 🐧</span>\nType <span class="g">help</span> to see commands, or try a mission on the right →');
  $('#pgPs').textContent = prompt();
})();
