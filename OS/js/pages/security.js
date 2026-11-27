/* Chapter 9 — Users & security */
(function () {
  'use strict';
  var $ = Core.$;

  /* passwd decoder */
  var PW = [['kid', 'Username (login name).'], [':x', '"x" = the password hash lives in <code>/etc/shadow</code> (readable only by root).'], [':1000', 'UID — the user\'s number. The kernel only cares about this number, not the name!'],
    [':1000', 'Primary GID — the user\'s main group.'], [':Kid Coder', 'GECOS: a comment, usually the full name.'], [':/home/kid', 'Home directory.'], [':/bin/bash', 'Login shell — the program started when they log in. <code>/usr/sbin/nologin</code> = no logins allowed.']];
  $('#pwd').innerHTML = PW.map(function (p, i) { return '<span tabindex="0" data-i="' + i + '">' + p[0] + '</span>'; }).join('');
  ['mouseover', 'click', 'focusin'].forEach(function (ev) { $('#pwd').addEventListener(ev, function (e) { var s = e.target.closest('[data-i]'); if (!s) return; Core.$$('#pwd span').forEach(function (x) { x.classList.toggle('sel', x === s); }); $('#pwdInfo').innerHTML = '💡 ' + PW[+s.dataset.i][1]; }); });

  /* permission calculator */
  var WHO = ['owner', 'group', 'others'], WHAT = ['r', 'w', 'x'], NAMES = { r: 'read', w: 'write', x: 'run/enter' };
  var g = '<div></div>' + WHAT.map(function (w) { return '<div class="h">' + w + '</div>'; }).join('');
  WHO.forEach(function (who, i) { g += '<div class="h" style="text-align:left">' + ['🧑 owner', '👥 group', '🌍 others'][i] + '</div>' + WHAT.map(function (w, j) { return '<label><input type="checkbox" data-b="' + i + j + '" aria-label="' + who + ' ' + NAMES[w] + '"></label>'; }).join(''); });
  $('#pgrid').innerHTML = g;
  function getMode() {
    var m = 0;
    Core.$$('#pgrid input').forEach(function (c) { if (c.checked) { var i = +c.dataset.b[0], j = +c.dataset.b[1]; m |= (4 >> j) << ((2 - i) * 3); } });
    var sp = ($('#sSuid').checked ? 4 : 0) | ($('#sSgid').checked ? 2 : 0) | ($('#sSticky').checked ? 1 : 0);
    return { m: m, sp: sp };
  }
  function setMode(oct) {
    var v = parseInt(oct, 8); if (isNaN(v)) return; var m = v & 511, sp = (v >> 9) & 7;
    Core.$$('#pgrid input').forEach(function (c) { var i = +c.dataset.b[0], j = +c.dataset.b[1]; c.checked = !!(m & ((4 >> j) << ((2 - i) * 3))); });
    $('#sSuid').checked = !!(sp & 4); $('#sSgid').checked = !!(sp & 2); $('#sSticky').checked = !!(sp & 1);
    update(true);
  }
  function update(fromSet) {
    var o = getMode(), m = o.m, sp = o.sp;
    var oct = (sp ? String(sp) : '0') + ((m >> 6) & 7) + ((m >> 3) & 7) + (m & 7);
    var sym = '-';
    for (var i = 0; i < 3; i++) {
      var bits = (m >> ((2 - i) * 3)) & 7, r = bits & 4 ? 'r' : '-', w = bits & 2 ? 'w' : '-', x = bits & 1 ? 'x' : '-';
      if (i === 0 && sp & 4) x = x === 'x' ? 's' : 'S';
      if (i === 1 && sp & 2) x = x === 'x' ? 's' : 'S';
      if (i === 2 && sp & 1) x = x === 'x' ? 't' : 'T';
      sym += r + w + x;
    }
    $('#pOct').textContent = oct; $('#pSym').textContent = sym;
    if (!fromSet || document.activeElement !== $('#octIn')) $('#octIn').value = oct;
    $('#pCmd').textContent = '$ chmod ' + oct + ' deploy.sh\n$ ls -l deploy.sh\n' + sym + ' 1 alice devs 4096 Mar 3 10:15 deploy.sh';
    var eng = WHO.map(function (who, i) {
      var bits = (m >> ((2 - i) * 3)) & 7, can = [];
      if (bits & 4) can.push('read'); if (bits & 2) can.push('change'); if (bits & 1) can.push('run');
      return '<li><b>' + ['alice (owner)', 'the devs group', 'everyone else'][i] + '</b> can ' + (can.length ? can.join(', ') : '<b>do nothing</b>') + '.</li>';
    });
    if (sp & 4) eng.push('<li>🦸 setuid: it runs with alice\'s powers, whoever starts it.</li>');
    if (sp & 2) eng.push('<li>👨‍👩‍👧 setgid: runs with the devs group (on folders: new files join the group).</li>');
    if (sp & 1) eng.push('<li>📌 sticky: in a folder, people can delete only their own files.</li>');
    if ((m & 2) && !(sp & 1)) eng.push('<li>😱 <b>Danger:</b> anyone can modify this! Avoid write for "others".</li>');
    $('#pEng').innerHTML = eng.join('');
  }
  $('#pgrid').addEventListener('change', function () { update(); });
  ['sSuid', 'sSgid', 'sSticky'].forEach(function (id) { $('#' + id).addEventListener('change', function () { update(); }); });
  $('#octIn').addEventListener('input', function () { if (/^[0-7]{3,4}$/.test(this.value)) setMode(this.value); });
  Core.$$('[data-p]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.p); }); });
  setMode('644');

  /* sudo flow */
  var sudo = SK.chain([
    { id: 'you', icon: '🙋', label: 'you (UID 1000)', sub: 'sudo apt install', c: 'pink' },
    { id: 'sudo', icon: '🦸', label: 'sudo', sub: 'setuid-root program', c: 'yellow' },
    { id: 'rules', icon: '📜', label: '/etc/sudoers', sub: 'are you allowed?', c: 'orange' },
    { id: 'pam', icon: '🔑', label: 'password (PAM)', sub: 'is it really you?', c: 'blue' },
    { id: 'log', icon: '📓', label: 'log it', sub: 'journal / auth.log', c: 'teal' },
    { id: 'root', icon: '👑', label: 'run as root', sub: 'UID 0', c: 'purple' }
  ], { cols: 6, mcols: 2, nw: 130, nh: 100, gx: 30, gy: 50, mnw: 180, mgx: 30, fs: 16 });
  var SU = SK.diagram('#sudoD', sudo);
  SK.flow(SU, [
    { on: ['you'], say: '🙋 You run <code>sudo apt install cowsay</code>. Installing software changes system folders, which only root may do.' },
    { on: ['sudo'], go: [['you', 'sudo', { c: 'pink' }]], say: '🦸 <code>sudo</code> is a <b>setuid-root</b> program: it starts with root\'s powers — but it\'s very careful about what it does with them.' },
    { on: ['rules'], go: [['sudo', 'rules', { c: 'yellow' }]], say: '📜 It checks <code>/etc/sudoers</code>: is this user (or their group, like <code>sudo</code> or <code>wheel</code>) allowed to run this command?' },
    { on: ['pam'], go: [['rules', 'pam', { c: 'orange' }]], say: '🔑 It asks for <b>your</b> password (not root\'s!) through PAM, to prove it\'s really you at the keyboard. It remembers for ~15 minutes.' },
    { on: ['log'], go: [['pam', 'log', { c: 'blue' }]], say: '📓 It writes a log entry: who ran what, when. Accountability!' },
    { on: ['root'], go: [['log', 'root', { c: 'teal' }]], say: '👑 It runs the command as root, then drops back. Only that one command got the crown. That\'s the <b>principle of least privilege</b>.' }
  ]);

  /* onion */
  var ONION = {
    o1: ['🔑 DAC: users & rwx', 'pink', 'Discretionary Access Control: the owner decides who can read/write/run their files. The classic Unix permissions you just played with.'],
    o2: ['🎫 Capabilities', 'orange', 'Root\'s powers split into ~40 pieces. Give a program only what it needs.'],
    o3: ['🏛️ MAC: SELinux / AppArmor', 'yellow', 'Mandatory Access Control: system-wide rules that even root and file owners can\'t override. "nginx may only read /var/www, whatever the file permissions say." Ubuntu uses AppArmor; Fedora/RHEL use SELinux.'],
    o4: ['🧱 seccomp', 'green', 'A filter on <b>system calls</b>: "this program may only use these 60 syscalls." Docker\'s default profile blocks dozens of dangerous ones.'],
    o5: ['📦 namespaces & cgroups', 'blue', 'Make a process see only its own little world, and limit how much it can use. The building blocks of containers → Chapter 10.'],
    o6: ['⚙️ the kernel', 'purple', 'The core that enforces all the layers. Keeping it updated is security rule #1!']
  };
  var OD = SK.diagram('#onionD', {
    title: 'Security layers onion', w: 440, h: 440, fs: 15, dim: true,
    nodes: [
      { id: 'o1', x: 5, y: 5, w: 430, h: 430, shape: 'ellipse', label: ONION.o1[0], c: 'pink', top: 18 },
      { id: 'o2', x: 40, y: 45, w: 360, h: 360, shape: 'ellipse', label: ONION.o2[0], c: 'orange', top: 14 },
      { id: 'o3', x: 75, y: 85, w: 290, h: 290, shape: 'ellipse', label: ONION.o3[0], c: 'yellow', top: 14 },
      { id: 'o4', x: 110, y: 125, w: 220, h: 220, shape: 'ellipse', label: ONION.o4[0], c: 'green', top: 14 },
      { id: 'o5', x: 145, y: 165, w: 150, h: 150, shape: 'ellipse', label: '📦 namespaces\n& cgroups', c: 'blue', top: 14, fs: 14 },
      { id: 'o6', x: 180, y: 222, w: 80, h: 76, shape: 'ellipse', label: '⚙️\nkernel', c: 'purple', fs: 14 }
    ],
    onClick: function (id) {
      var d = ONION[id]; OD.on([id]);
      $('#onionInfo').innerHTML = '<h3>' + d[0] + '</h3><p>' + d[2] + '</p>';
    }
  });
  OD.on(['o3']); $('#onionInfo').innerHTML = '<h3>' + ONION.o3[0] + '</h3><p>' + ONION.o3[2] + '</p>';

  /* ASLR */
  function hex(n) { return '0x' + n.toString(16); }
  function aslr() {
    var on = $('#aslrOn').checked, rnd = function (base, bits) { return on ? base + Math.floor(Math.random() * Math.pow(2, bits)) * 4096 : base; };
    var code = rnd(0x555555554000, 28), heap = code + 0x21000 + (on ? Math.floor(Math.random() * 8192) * 4096 : 0), libc = rnd(0x7ffff7d80000 - 0x100000000, 28), stack = rnd(0x7ffffffde000 - 0x1000000, 22);
    $('#aslrOut').textContent = '$ ./my_program\ncode   (text) : ' + hex(code) + '\nheap          : ' + hex(heap) + '\nlibc.so       : ' + hex(libc) + '\nstack         : ' + hex(stack) + '\n' + (on ? '# 🎰 different every run — an attacker can\'t guess them' : '# 😬 ASLR off: the same addresses every time (attacker-friendly)');
  }
  $('#aslrRun').addEventListener('click', aslr); $('#aslrOn').addEventListener('change', aslr); aslr();

  /* best-practice checklist (remembered per browser) */
  var PRAC = [
    ['Don\'t browse or code as root. Use <code>sudo</code> only for the one command that needs it.', 'least privilege'],
    ['Keep the system updated: <code>sudo apt update && sudo apt upgrade</code>. Most attacks use old, already-fixed bugs.', 'patching'],
    ['Use SSH keys instead of passwords, and disable root login over SSH.', 'authentication'],
    ['Turn on a firewall and open only the ports you need (<code>ufw allow 22</code>).', 'attack surface'],
    ['Never <code>chmod 777</code>. Give the smallest permissions that work (644 files, 755 programs, 600 secrets).', 'permissions'],
    ['Run services as their own unprivileged user, with systemd sandboxing (<code>ProtectSystem=strict</code>, <code>NoNewPrivileges=yes</code>).', 'isolation'],
    ['Keep AppArmor / SELinux enabled — don\'t switch them off to "make it work".', 'MAC'],
    ['Never pipe random internet scripts into a shell (<code>curl … | sudo bash</code>) without reading them.', 'supply chain'],
    ['Watch the logs: <code>journalctl -p warning -b</code>, <code>last</code>, <code>/var/log/auth.log</code>.', 'monitoring'],
    ['Back up important data, and test that restoring works.', 'recovery']
  ];
  var done = Core.store.get('sec-checks', {});
  function drawPrac() {
    $('#secList').innerHTML = PRAC.map(function (p, i) { return '<label class="mission' + (done[i] ? ' done' : '') + '"><input type="checkbox" data-i="' + i + '"' + (done[i] ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--green)"><span class="t">' + p[0] + ' <span class="pill-tag">' + p[1] + '</span></span></label>'; }).join('');
  }
  $('#secList').addEventListener('change', function (e) { var c = e.target; if (c.dataset.i == null) return; done[c.dataset.i] = c.checked; Core.store.set('sec-checks', done); drawPrac(); if (PRAC.every(function (p, i) { return done[i]; })) Core.toast('🛡️ All ten! You think like a sysadmin now.'); });
  drawPrac();

  Core.quiz('#quizBox', [
    { q: 'What does chmod 640 mean?', a: ['Owner rw, group r, others nothing', 'Everyone can do everything', 'Owner r, group w, others x', 'Only root can read'], c: 0, why: '6 = 4+2 = rw, 4 = r, 0 = nothing.' },
    { q: 'Which user has UID 0?', a: ['nobody', 'root', 'kid', 'www-data'], c: 1, why: 'UID 0 is root, which bypasses normal permission checks.' },
    { q: 'Why is the sticky bit set on /tmp?', a: ['To make it faster', 'So users can only delete their own files in a shared folder', 'To hide files', 'To make files executable'], c: 1, why: 'drwxrwxrwt: everyone can write, but the t (sticky) bit prevents deleting other people\'s files.' },
    { q: 'What are Linux capabilities?', a: ['CPU speeds', 'Root\'s powers split into small pieces you can grant separately', 'Disk quotas', 'Network cables'], c: 1, why: 'E.g. CAP_NET_BIND_SERVICE lets a program use port 80 without being fully root.' },
    { q: 'What does seccomp filter?', a: ['Emails', 'Which system calls a process may use', 'Spam', 'Keyboard input'], c: 1, why: 'seccomp-bpf restricts a process to an allowed list of syscalls — used by Docker, Chrome, systemd and more.' },
    { q: 'ASLR protects you by…', a: ['Encrypting the disk', 'Placing program memory at random addresses each run', 'Blocking websites', 'Adding more RAM'], c: 1, why: 'Attackers can\'t rely on fixed addresses when they change every time a program starts.' }
  ]);
})();
