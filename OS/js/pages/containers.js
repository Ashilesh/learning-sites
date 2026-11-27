/* Chapter 10 — Containers & Docker */
(function () {
  'use strict';
  var $ = Core.$, esc = Core.esc;

  /* recipe */
  SK.diagram('#recipeD', {
    title: 'A container is a process plus gadgets', w: 860, h: 300, fs: 17,
    nodes: [
      { id: 'p', x: 10, y: 110, w: 170, h: 84, icon: '🏃', label: 'a normal\nprocess', c: 'pink', m: [125, 10, 170, 84] },
      { id: 'ns', x: 250, y: 10, w: 180, h: 76, icon: '🙈', label: 'namespaces', sub: 'what it can SEE', c: 'yellow', m: [10, 130, 185, 76] },
      { id: 'cg', x: 250, y: 110, w: 180, h: 76, icon: '🦮', label: 'cgroups', sub: 'what it can USE', c: 'green', m: [225, 130, 185, 76] },
      { id: 'ov', x: 250, y: 210, w: 180, h: 76, icon: '🥞', label: 'overlay root /', sub: 'what files it HAS', c: 'blue', m: [10, 226, 185, 76] },
      { id: 'sc', x: 470, y: 210, w: 180, h: 76, icon: '🧱', label: 'seccomp + caps', sub: 'what it may DO', c: 'orange', m: [225, 226, 185, 76] },
      { id: 'c', x: 680, y: 90, w: 170, h: 120, icon: '📦', label: 'a "container"', c: 'purple', iconSize: 36, m: [120, 340, 180, 100] }
    ],
    edges: [{ from: 'p', to: 'ns' }, { from: 'p', to: 'cg' }, { from: 'p', to: 'ov' }, { from: 'ns', to: 'c' }, { from: 'cg', to: 'c' }, { from: 'ov', to: 'c' }, { from: 'sc', to: 'c' }],
    texts: [{ x: 560, y: 40, t: '+ all of it is\nplain Linux! 🐧', fs: 18, c: 'pink', rot: -4, mHide: true }],
    mobile: { w: 420, h: 450 }
  });

  /* ---------- namespace toggler ---------- */
  var NS = [['pid', '🔢 PID'], ['net', '🌐 NET'], ['mnt', '📁 MNT'], ['uts', '🏷️ UTS'], ['ipc', '📨 IPC'], ['user', '👑 USER']];
  var on = { pid: true, net: true, mnt: true, uts: true, ipc: true, user: true };
  $('#nsT').innerHTML = NS.map(function (n) { return '<button type="button" data-ns="' + n[0] + '" aria-pressed="true">' + n[1] + '</button>'; }).join('') + '<button type="button" data-ns="all">🔁 all on/off</button>';
  var HOST = '$ hostname\nsketchbook\n$ ps -e | wc -l\n312\n$ ip -br addr\nlo       127.0.0.1/8\neth0     192.168.1.42/24\ndocker0  172.17.0.1/16\n$ ls /\nbin boot dev etc home lib proc root run sys tmp usr var\n$ id\nuid=1000(kid) gid=1000(kid)';
  function nsDraw() {
    Core.$$('#nsT [data-ns]').forEach(function (b) { if (b.dataset.ns !== 'all') { b.classList.toggle('on', on[b.dataset.ns]); b.setAttribute('aria-pressed', on[b.dataset.ns]); } });
    var s = '$ hostname\n' + (on.uts ? 'web-7f3a' : 'sketchbook   ← the host\'s name!') + '\n' +
      '$ ps -e\n' + (on.pid ? '  PID CMD\n    1 nginx: master\n    7 nginx: worker\n   12 ps' : '  PID CMD\n    1 systemd\n  812 NetworkManager\n 2211 firefox\n 4123 nginx: master   ← that\'s me\n  … 308 more (the WHOLE host!)') + '\n' +
      '$ ip -br addr\n' + (on.net ? 'lo    127.0.0.1/8\neth0  172.17.0.2/16' : 'lo       127.0.0.1/8\neth0     192.168.1.42/24\ndocker0  172.17.0.1/16') + '\n' +
      '$ ls /\n' + (on.mnt ? 'app bin etc lib usr var   (from the image)' : 'bin boot dev etc home lib … (the HOST\'s files!)') + '\n' +
      '$ ipcs -m | wc -l\n' + (on.ipc ? '3  (empty)' : '17  (host shared memory!)') + '\n' +
      '$ id\n' + (on.user ? 'uid=0(root)   ← root inside, but uid 100000 (nobody) outside' : 'uid=0(root)   ← REAL root on the host 😱');
    $('#nsHost').textContent = HOST; $('#nsIn').textContent = s;
    var n = Object.keys(on).filter(function (k) { return on[k]; }).length;
    $('#nsMsg').innerHTML = n === 6 ? '📦 All namespaces on: the process lives in its own little world. This is roughly what Docker does (user namespaces are optional in Docker, standard in Podman rootless).' :
      n === 0 ? '🏃 All off: it\'s just an ordinary process sharing <b>everything</b> with the host. No container at all!' :
      '🔍 Mixed: Linux lets you pick namespaces one by one. E.g. <code>docker run --net=host</code> skips the NET namespace (faster networking, less isolation); Kubernetes pods share NET and IPC between their containers.';
  }
  $('#nsT').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ns]'); if (!b) return;
    if (b.dataset.ns === 'all') { var any = Object.keys(on).some(function (k) { return on[k]; }); Object.keys(on).forEach(function (k) { on[k] = !any; }); }
    else on[b.dataset.ns] = !on[b.dataset.ns];
    nsDraw();
  });
  nsDraw();

  /* ---------- cgroups sim ---------- */
  var CG = [{ n: 'web', i: '🌐', c: 'pink', cpuL: 1, memL: 512 }, { n: 'api', i: '🐍', c: 'yellow', cpuL: .5, memL: 256 }, { n: 'db', i: '🐘', c: 'green', cpuL: 1.5, memL: 1024 }];
  CG.forEach(function (c) { c.cpu = .05; c.mem = 60; c.cpuD = .1; c.eat = false; c.thr = 0; c.oom = 0; });
  function cgLog(m) { var d = document.createElement('div'); d.innerHTML = m; $('#cgLog').insertBefore(d, $('#cgLog').firstChild); while ($('#cgLog').children.length > 30) $('#cgLog').lastChild.remove(); }
  $('#cgBoxes').innerHTML = CG.map(function (c, k) {
    return '<div class="cg-box" data-k="' + k + '"><h5>' + c.i + ' ' + c.n + ' <span class="badge" data-oom>OOM ×0</span></h5>' +
      '<div class="small">CPU <b data-cpu></b></div><div class="meter"><span data-cb style="background:' + SK.solid(c.c) + '"></span><i class="lim" data-cl></i></div>' +
      '<div class="small" style="margin-top:8px">Memory <b data-mem></b></div><div class="meter"><span data-mb style="background:' + SK.solid(c.c) + '"></span><i class="lim" data-ml></i></div>' +
      '<label class="small">cpu.max: <b data-clv></b><input type="range" min="0.1" max="2" step="0.1" value="' + c.cpuL + '" data-s="cpu" aria-label="CPU limit for ' + c.n + '"></label>' +
      '<label class="small">memory.max: <b data-mlv></b><input type="range" min="128" max="2048" step="64" value="' + c.memL + '" data-s="mem" aria-label="Memory limit for ' + c.n + '"></label>' +
      '<div class="row"><button class="btn sm" type="button" data-a="idle">😴 idle</button><button class="btn sm orange" type="button" data-a="cpu">🔥 busy CPU</button><button class="btn sm pink" type="button" data-a="mem">🐘 eat RAM</button></div></div>';
  }).join('');
  $('#cgBoxes').addEventListener('input', function (e) { var r = e.target; if (!r.dataset.s) return; var c = CG[+r.closest('[data-k]').dataset.k]; if (r.dataset.s === 'cpu') c.cpuL = +r.value; else c.memL = +r.value; cgDraw(); });
  $('#cgBoxes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return; var c = CG[+b.closest('[data-k]').dataset.k];
    if (b.dataset.a === 'idle') { c.cpuD = .1; c.eat = false; cgLog(c.i + ' ' + c.n + ' is idle now.'); }
    if (b.dataset.a === 'cpu') { c.cpuD = 3; cgLog('🔥 ' + c.n + ' wants 3 CPUs! The kernel lets it use at most <b>' + c.cpuL + '</b> (cpu.max) — the rest of the time it is <b>throttled</b>.'); }
    if (b.dataset.a === 'mem') { c.eat = true; cgLog('🐘 ' + c.n + ' starts allocating memory… its limit is ' + c.memL + ' MB.'); }
  });
  function cgDraw() {
    Core.$$('#cgBoxes .cg-box').forEach(function (box, k) {
      var c = CG[k];
      box.querySelector('[data-cb]').style.width = (Math.min(c.cpu, 2) / 2 * 100) + '%'; box.querySelector('[data-cl]').style.left = (c.cpuL / 2 * 100) + '%';
      box.querySelector('[data-mb]').style.width = (Math.min(c.mem, 2048) / 2048 * 100) + '%'; box.querySelector('[data-ml]').style.left = (c.memL / 2048 * 100) + '%';
      box.querySelector('[data-cpu]').textContent = c.cpu.toFixed(2) + ' CPU' + (c.cpuD > c.cpuL ? ' 🐢 throttled' : '');
      box.querySelector('[data-mem]').textContent = Math.round(c.mem) + ' MB';
      box.querySelector('[data-clv]').textContent = c.cpuL.toFixed(1) + ' CPU (' + Math.round(c.cpuL * 100000) + ' 100000)';
      box.querySelector('[data-mlv]').textContent = c.memL + ' MB';
      box.querySelector('[data-oom]').textContent = 'OOM ×' + c.oom;
    });
    $('#cgStats').textContent = '$ docker stats --no-stream\nNAME  CPU %    MEM USAGE / LIMIT   PIDS\n' + CG.map(function (c) {
      var name = (c.n + '    ').slice(0, 5), cpu = ((c.cpu * 100).toFixed(1) + '%      ').slice(0, 8), mem = (Math.round(c.mem) + 'MiB / ' + c.memL + 'MiB          ').slice(0, 19);
      return name + ' ' + cpu + ' ' + mem + ' ' + (c.n === 'web' ? 5 : c.n === 'api' ? 3 : 9);
    }).join('\n');
  }
  var cgVisible = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { cgVisible = e[0].isIntersecting; }).observe($('#cgSim')); else cgVisible = true;
  setInterval(function () {
    if (!cgVisible || document.hidden) return;
    CG.forEach(function (c) {
      var target = Math.min(c.cpuD, c.cpuL) * (.85 + Math.random() * .15); c.cpu += (target - c.cpu) * .5;
      if (c.eat) {
        c.mem += 40 + Math.random() * 40;
        if (c.mem > c.memL) { c.oom++; c.eat = false; c.mem = 50; cgLog('💥 <b>' + c.n + '</b> hit memory.max (' + c.memL + ' MB) → the kernel\'s OOM killer ended it <i>inside its cgroup only</i>. Docker restarts it (<code>--restart=always</code>). The other containers didn\'t notice!'); }
      } else if (c.mem > 60) c.mem -= 4;
    });
    cgDraw();
  }, 400);
  cgDraw();

  /* ---------- overlay lab ---------- */
  var BASE = [
    { n: 'base', title: '📀 layer 1: ubuntu base', c: 'gray', files: ['/bin/bash', '/etc/os-release', '/etc/hosts'] },
    { n: 'py', title: '🐍 layer 2: + python3', c: 'blue', files: ['/usr/bin/python3', '/etc/hosts'] },
    { n: 'app', title: '📝 layer 3: + app code', c: 'purple', files: ['/app/app.py', '/app/config.yml'] }
  ];
  var upper, whiteouts, mods;
  function ovReset(keepLog) { upper = []; whiteouts = []; mods = {}; if (!keepLog) $('#ovLog').innerHTML = ''; ovDraw(); }
  function ovLog(m) { var d = document.createElement('div'); d.innerHTML = m; $('#ovLog').insertBefore(d, $('#ovLog').firstChild); }
  function merged() {
    var map = {};
    BASE.forEach(function (L) { L.files.forEach(function (f) { map[f] = L.n; }); });
    upper.forEach(function (f) { map[f] = 'upper'; });
    whiteouts.forEach(function (f) { delete map[f]; });
    return map;
  }
  function ovDraw() {
    var m = merged(), html = '';
    var top = '<div class="layer merged"><b>👀 merged view (what the container sees)</b>' + Object.keys(m).sort().map(function (f) { return '<span class="file" role="button" tabindex="0" data-f="' + esc(f) + '">' + esc(f) + (m[f] === 'upper' ? ' ✏️' : '') + '</span>'; }).join('') + '</div>';
    var up = '<div class="layer" style="background:var(--yellow-t)"><b>✏️ container layer (writable)</b>' + (upper.map(function (f) { return '<span class="file">' + esc(f) + (mods[f] ? ' (' + mods[f] + ')' : '') + '</span>'; }).join('') + whiteouts.map(function (f) { return '<span class="file wh" title="whiteout">' + esc(f) + ' (whiteout)</span>'; }).join('') || '<span class="small muted">(empty)</span>') + '</div>';
    html = top + up;
    for (var i = BASE.length - 1; i >= 0; i--) {
      var L = BASE[i];
      html += '<div class="layer" style="background:' + SK.tint(L.c) + '"><b>' + L.title + ' 🔒</b>' + L.files.map(function (f) {
        var hidden = m[f] !== L.n; return '<span class="file' + (hidden ? ' dim' : '') + '" title="' + (hidden ? 'hidden by a higher layer' : 'visible') + '">' + esc(f) + '</span>';
      }).join('') + '</div>';
    }
    $('#ovl').innerHTML = html;
  }
  function ovClick(f) {
    var m = merged(), src = m[f];
    var menu = document.createElement('div'); menu.className = 'btn-row';
    menu.innerHTML = '<b>' + esc(f) + '</b>: <button class="btn sm" type="button" data-o="read">👀 read</button><button class="btn sm blue" type="button" data-o="edit">✏️ edit</button><button class="btn sm red" type="button" data-o="del">🗑️ delete</button>';
    var old = $('#ovMenu'); if (old) old.remove(); menu.id = 'ovMenu'; $('#ovl').parentNode.insertBefore(menu, $('#ovLog'));
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-o]'); if (!b) return; var o = b.dataset.o; m = merged(); src = m[f];
      if (!(f in m)) { ovLog('That file is gone.'); menu.remove(); return; }
      if (o === 'read') ovLog('👀 Reading <code>' + esc(f) + '</code>: OverlayFS looks from the top down and finds it in <b>' + (src === 'upper' ? 'the container layer' : BASE.filter(function (L) { return L.n === src; })[0].title) + '</b>. Reads cost nothing extra.');
      if (o === 'edit') {
        if (src !== 'upper') { upper.push(f); mods[f] = 'edited'; ovLog('✏️ <b>Copy-up!</b> <code>' + esc(f) + '</code> lived in a read-only layer, so OverlayFS first <b>copied it</b> into the container layer, then changed the copy. The image layer is untouched — other containers still see the original.'); }
        else ovLog('✏️ <code>' + esc(f) + '</code> is already in the container layer — edited in place.');
      }
      if (o === 'del') {
        var inLower = BASE.some(function (L) { return L.files.indexOf(f) >= 0; });
        upper = upper.filter(function (x) { return x !== f; }); delete mods[f];
        if (inLower) { whiteouts.push(f); ovLog('🗑️ You can\'t erase a read-only layer! OverlayFS puts a <b>whiteout</b> marker in the container layer that <i>hides</i> <code>' + esc(f) + '</code>. (Fun fact: that\'s why deleting files in a later Dockerfile step never makes the image smaller.)'); }
        else ovLog('🗑️ <code>' + esc(f) + '</code> only existed in the container layer, so it\'s simply removed.');
      }
      menu.remove(); ovDraw();
    });
  }
  $('#ovl').addEventListener('click', function (e) { var s = e.target.closest('[data-f]'); if (s) ovClick(s.dataset.f); });
  $('#ovl').addEventListener('keydown', function (e) { var s = e.target.closest('[data-f]'); if (s && e.key === 'Enter') ovClick(s.dataset.f); });
  $('#ovNew').addEventListener('click', function () { if (upper.indexOf('/app/log.txt') < 0) { upper.push('/app/log.txt'); mods['/app/log.txt'] = 'new'; } ovLog('➕ New files go straight into the container layer.'); ovDraw(); });
  $('#ovRecreate').addEventListener('click', function () { var had = upper.length + whiteouts.length; ovReset(true); var m = $('#ovMenu'); if (m) m.remove(); ovLog('🔁 Removed the container and started a new one from the same image: a <b>fresh, empty</b> writable layer. ' + (had ? 'All ' + had + ' change(s) are <b>gone</b>! Use volumes for data you want to keep.' : '')); });
  $('#ovReset').addEventListener('click', function () { ovReset(); var m = $('#ovMenu'); if (m) m.remove(); });
  ovReset();

  /* ---------- docker run flow ---------- */
  var run = SK.chain([
    { id: 'you', icon: '🙋', label: 'docker run', sub: '-m 512m nginx', c: 'pink' },
    { id: 'cli', icon: '💻', label: 'docker CLI', sub: 'REST over\n/run/docker.sock', c: 'yellow' },
    { id: 'dd', icon: '🐳', label: 'dockerd', sub: 'Docker engine', c: 'blue' },
    { id: 'ctd', icon: '📦', label: 'containerd', sub: 'pull + unpack layers', c: 'teal' },
    { id: 'runc', icon: '⚙️', label: 'runc', sub: 'reads OCI config.json', c: 'orange' },
    { id: 'clone', icon: '🧬', label: 'clone()', sub: 'NEWPID|NEWNS|NEWNET\nNEWUTS|NEWIPC', c: 'purple' },
    { id: 'cg', icon: '🦮', label: 'cgroup', sub: 'write limits,\nadd the PID', c: 'green' },
    { id: 'root', icon: '🥞', label: 'pivot_root', sub: 'into the overlay', c: 'blue' },
    { id: 'lock', icon: '🧱', label: 'lock down', sub: 'drop caps, seccomp', c: 'red' },
    { id: 'exec', icon: '🚀', label: 'execve(nginx)', sub: 'PID 1 inside!', c: 'yellow' }
  ], { cols: 5, mcols: 2, nw: 150, nh: 104, gx: 44, gy: 56, mnw: 180, mgx: 30, fs: 17 });
  var RD = SK.diagram('#runD', run);
  SK.flow(RD, [
    { on: ['you'], say: '🙋 You type <code>docker run -m 512m nginx</code>.' },
    { on: ['cli'], go: [['you', 'cli', { c: 'pink' }]], say: '💻 The <code>docker</code> command is just a client. It sends an HTTP request to the Docker daemon through a <b>Unix socket</b> file: <code>/run/docker.sock</code>. (Everything is a file!)' },
    { on: ['dd'], go: [['cli', 'dd', { c: 'yellow', label: 'POST /containers/create' }]], say: '🐳 <b>dockerd</b> handles the API: networks, volumes, image names. It delegates the real container work.' },
    { on: ['ctd'], go: [['dd', 'ctd', { c: 'blue', label: 'gRPC' }]], say: '📦 <b>containerd</b> pulls the image layers if needed (content-addressed by sha256), unpacks them and prepares an OverlayFS snapshot. Then it starts a small <b>shim</b> process to babysit the container.' },
    { on: ['runc'], go: [['ctd', 'runc', { c: 'teal' }]], say: '⚙️ <b>runc</b> (the OCI runtime) reads a <code>config.json</code> describing the namespaces, cgroups, mounts and security settings. Then it talks directly to the kernel:' },
    { on: ['clone'], go: [['runc', 'clone', { c: 'orange' }]], say: '🧬 <b>clone()</b> with namespace flags creates a new process that is born inside fresh PID, mount, network, UTS and IPC namespaces.' },
    { on: ['cg'], go: [['clone', 'cg', { c: 'purple' }]], say: '🦮 It creates a cgroup folder, writes <code>memory.max = 536870912</code>, and moves the new PID into <code>cgroup.procs</code>.' },
    { on: ['root'], go: [['cg', 'root', { c: 'green' }]], say: '🥞 It mounts the overlay (image layers + new writable layer), plus <code>/proc</code>, <code>/dev</code>, <code>/sys</code>, and calls <b>pivot_root</b> so that overlay becomes <code>/</code>.' },
    { on: ['lock'], go: [['root', 'lock', { c: 'blue' }]], say: '🧱 It drops capabilities, applies the <b>seccomp</b> filter and AppArmor/SELinux profile, sets <code>no_new_privs</code>.' },
    { on: ['exec'], go: [['lock', 'exec', { c: 'red' }]], say: '🚀 Finally: <b>execve("nginx")</b>. nginx starts as PID 1 in its own little world. No OS booted — that\'s why it took ~100 ms. 🎉' }
  ]);

  /* ---------- networking ---------- */
  SK.diagram('#netD', {
    title: 'Docker bridge networking', w: 860, h: 330, fs: 16,
    groups: [{ x: 4, y: 4, w: 852, h: 230, label: '🐧 one Linux host', c: 'purple', m: [4, 4, 412, 420] }],
    nodes: [
      { id: 'w', x: 30, y: 40, w: 190, h: 76, icon: '🌐', label: 'web', sub: 'eth0 172.17.0.2', c: 'pink', m: [20, 40, 180, 76] },
      { id: 'a', x: 30, y: 140, w: 190, h: 76, icon: '🐍', label: 'api', sub: 'eth0 172.17.0.3', c: 'yellow', m: [220, 40, 180, 76] },
      { id: 'br', x: 330, y: 80, w: 200, h: 86, icon: '🔌', label: 'docker0 bridge', sub: '172.17.0.1 (a virtual switch)', c: 'blue', m: [110, 170, 200, 86] },
      { id: 'nat', x: 620, y: 80, w: 200, h: 86, icon: '🧱', label: 'netfilter NAT', sub: 'MASQUERADE / DNAT', c: 'red', m: [110, 300, 200, 80] },
      { id: 'net', x: 620, y: 252, w: 200, h: 70, icon: '☁️', label: 'internet', c: 'teal', m: [110, 440, 200, 70] }
    ],
    edges: [{ from: 'w', to: 'br', both: true, label: 'veth pair', mNoLabel: true }, { from: 'a', to: 'br', both: true, label: 'veth pair', mNoLabel: true }, { from: 'br', to: 'nat', both: true }, { from: 'nat', to: 'net', both: true, label: 'host eth0' }],
    mobile: { w: 420, h: 520 }
  });

  OSLab.mount(document.getElementById('lab'), { scenarios: ['containers'] });

  Core.quiz('#quizBox', [
    { q: 'What is a container, really?', a: ['A small virtual machine with its own kernel', 'A normal Linux process isolated with namespaces and limited with cgroups', 'A ZIP file', 'A special CPU'], c: 1, why: 'Containers share the host kernel. Namespaces control what they see; cgroups control what they use.' },
    { q: 'Which namespace makes a container\'s main process think it is PID 1?', a: ['net', 'uts', 'pid', 'ipc'], c: 2, why: 'The PID namespace gives the container its own process-number space.' },
    { q: 'Which Linux feature limits a container to 512 MB of RAM?', a: ['Namespaces', 'cgroups (memory.max)', 'OverlayFS', 'GRUB'], c: 1, why: 'cgroups v2 memory.max sets the limit; exceeding it triggers the OOM killer inside that cgroup.' },
    { q: 'A container edits a file that came from the image. OverlayFS…', a: ['Edits the image layer directly', 'Copies the file up into the container\'s writable layer and edits the copy', 'Refuses', 'Deletes the image'], c: 1, why: 'Copy-on-write ("copy-up"): image layers stay read-only and shareable.' },
    { q: 'Why does a container start so much faster than a VM?', a: ['It uses a faster CPU', 'There\'s no operating system to boot — it\'s just a process start', 'It skips the network', 'It\'s smaller on screen'], c: 1, why: 'Starting a container = clone() + mount + execve on the already-running host kernel.' },
    { q: 'Which program actually calls clone() to create the container (under Docker)?', a: ['the docker CLI', 'runc', 'GRUB', 'bash'], c: 1, why: 'docker CLI → dockerd → containerd → shim → runc, which talks to the kernel.' }
  ]);
})();
