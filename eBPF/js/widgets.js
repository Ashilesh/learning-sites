/* Widgets — everything interactive on the page that isn't a 3D scene builder. */
(function () {
  'use strict';
  const S = window.Sketch, Sc = window.Scenes;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* storage may be blocked */ } }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.innerHTML = html; return e; };

  /* ================= theme + nerd mode ================= */
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : mq.matches);
  const savedTheme = store.get('ebpf-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') root.dataset.theme = savedTheme;
  S.refresh();
  $('#themeBtn').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('ebpf-theme', next);
    S.refresh();
  });
  if (mq.addEventListener) mq.addEventListener('change', () => S.refresh());
  new MutationObserver(() => S.refresh()).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  function setNerd(on) {
    root.dataset.nerd = on ? 'on' : 'off';
    $('#nerdBtn').setAttribute('aria-pressed', String(on));
    store.set('ebpf-nerd', on ? '1' : '0');
  }
  setNerd(store.get('ebpf-nerd') === '1');
  $('#nerdBtn').addEventListener('click', () => setNerd(root.dataset.nerd !== 'on'));
  $$('[data-nerd-on]').forEach(b => b.addEventListener('click', () => setNerd(true)));

  /* ================= syntax highlighting ================= */
  const RE_C = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b0x[\da-fA-F]+\b|\b\d+\b)|(\b(?:int|void|char|struct|return|if|else|for|while|const|static|unsigned|long|sizeof|break|continue|u32|u64)\b)|(\b[A-Za-z_]\w*(?=\())|(#\s*include|\bSEC\b|@\w*|\b(?:tracepoint|kprobe|kretprobe|uprobe|uretprobe|usdt|profile|comm|pid|args|retval|kstack)\b)/g;
  const RE_PY = /(#[^\n]*)|(r?"""[\s\S]*?"""|r?"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+\b)|(\b(?:from|import|def|return|if|else|for|in|True|False|None|as)\b)|(\b[A-Za-z_]\w*(?=\())|(\bBPF\b)/g;
  const RE_SH = /(#[^\n]*)|("(?:\\.|[^"\\\n])*"|'[^'\n]*')|(\b\d+\b)|(^\$|\bsudo\b)|(\b(?:clang|bpftool|bpftrace|ip|ping|cat|llvm-objdump|python3|rm)\b)|(--?[\w-]+)/gm;
  function highlight(src, lang) {
    // note markers ⟨n⟩ become private-use characters so the tokenizer can't split them
    src = src.replace(/\s*⟨(\d)⟩/g, (_, d) => String.fromCharCode(0xE000 + +d));
    const re = lang === 'py' ? RE_PY : lang === 'sh' ? RE_SH : lang === 'txt' ? null : RE_C;
    let out = '';
    if (!re) out = esc(src);
    else {
      re.lastIndex = 0;
      let last = 0, m;
      while ((m = re.exec(src))) {
        if (m[0] === '') { re.lastIndex++; continue; }
        out += esc(src.slice(last, m.index));
        const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : m[4] ? 'k' : m[5] ? 'f' : 'p';
        out += `<span class="tk-${cls}">${esc(m[0])}</span>`;
        last = re.lastIndex;
      }
      out += esc(src.slice(last));
    }
    return out.replace(/[-]/g, c => `<i class="note-pin">${c.charCodeAt(0) - 0xE000}</i>`);
  }
  const plain = src => src.replace(/\s*⟨\d⟩/g, '');

  /* ================= nav: highlight the chapter in view ================= */
  const links = $$('#navlinks a');
  const navIO = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => {
        const on = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('on', on);
        if (on) { const nav = $('#navlinks'); nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 3, behavior: S.motionOK ? 'smooth' : 'auto' }); }
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  links.forEach(a => { const s = $(a.getAttribute('href')); if (s) navIO.observe(s); });

  /* ================= hero ================= */
  Sc.hero($('#hero3d'));

  /* ================= chapter 1: comic ================= */
  const quad = (a, c, b, k) => { const u = 1 - k; return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]]; };
  const COMIC = {
    1(ctx, t) {
      [[44, 46, 'screen', 'screen'], [256, 46, 'globe', 'internet'], [44, 146, 'folder', 'files'], [256, 146, 'chip', 'processor']].forEach(([x, y, k, n], i) => {
        ctx.lineDashOffset = -t * 18;
        S.line(ctx, 150, 120, x, y, { dash: [5, 6], width: 1.6, double: false, seed: 10 + i, color: 'inkSoft' });
        ctx.lineDashOffset = 0;
        S.icon(ctx, k, x, y, 1);
        S.text(ctx, n, x, y + 27, { size: 11, weight: 700 });
      });
      S.castle(ctx, 150, 192, 0.78, { label: 'KERNEL' });
      S.text(ctx, 'the boss', 150, 24, { size: 17, font: S.FONT_DISPLAY, weight: 400, rotate: -0.04 });
    },
    2(ctx, t) {
      S.house(ctx, 40, 186, 0.9, 'yellow', 'red', 'browser');
      S.house(ctx, 98, 186, 0.9, 'green', 'purple', 'game');
      S.castle(ctx, 222, 190, 0.68, { label: 'KERNEL', window: true });
      const a = [110, 146], c = [172, 70], b = [238, 158];
      S.polyline(ctx, S.curvePts(a, c, b, 20), { dash: [4, 5], width: 1.4, color: 'inkSoft', seed: 3 });
      S.text(ctx, 'a system call', 160, 40, { size: 16, font: S.FONT_DISPLAY, weight: 400, rotate: -0.04 });
      const p = (t * 0.4) % 1, out = p < 0.5, k = out ? p * 2 : (1 - p) * 2;
      const pos = quad(a, c, b, k);
      S.circle(ctx, pos[0], pos[1], 6, { fill: out ? 'blue' : 'green', width: 1.5, seed: 4 });
      if (out) S.bubble(ctx, 'may I open a file?', 98, 134, { size: 10, dy: 14, seed: 6 });
      else S.bubble(ctx, 'here you go!', 222, 106, { size: 10, dy: 10, seed: 7 });
    },
    3(ctx, t) {
      const sx = 34 + ((t * 5) % 50);
      S.tag(ctx, 'new feature:\nready in 3 years', 70, 92, { size: 10, bg: 'paper2', seed: 7, color: 'ink', border: 'ink' });
      S.line(ctx, 70, 106, sx + 6, 166, { width: 1.4, double: false, seed: 8 });
      S.snail(ctx, sx, 190, 0.9, t);
      const shake = S.motionOK ? Math.sin(t * 26) * 1.2 : 0;
      S.castle(ctx, 208 + shake, 192, 0.6, { tilt: -0.07, label: 'KERNEL' });
      S.polyline(ctx, [[196, 132], [204, 146], [195, 158], [205, 176]], { width: 2.2, color: 'onMarker', seed: 9 });
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.7 + i / 4) % 1;
        ctx.save();
        ctx.translate(250 + i * 9, 130 + ph * 64);
        ctx.rotate(ph * 4 + i);
        S.rect(ctx, -4, -3, 8, 6, { fill: 'orange', width: 1.2, seed: 20 + i });
        ctx.restore();
      }
      S.burst(ctx, 246, 54, 30, { fill: 'red', text: 'CRASH!', size: 13, seed: 11 + (S.motionOK ? Math.floor(t * 4) % 3 : 0) });
      S.text(ctx, 'one buggy module', 248, 100, { size: 10, weight: 700, halo: 3 });
    },
    4(ctx, t) {
      S.laptop(ctx, 50, 176, 1.3, { label: 'you' });
      S.castle(ctx, 236, 192, 0.64, { label: 'KERNEL' });
      const a = [76, 128], c = [150, 10], b = [232, 170];
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.2 + i / 3) % 1;
        const pos = quad(a, c, b, p);
        ctx.globalAlpha = p > 0.88 ? (1 - p) / 0.12 : 1;
        S.bee(ctx, pos[0], pos[1] + Math.sin(t * 4 + i) * 4, 0.72, t, { phase: i });
        ctx.globalAlpha = 1;
      }
      S.text(ctx, 'no restart needed!', 150, 26, { size: 16, font: S.FONT_DISPLAY, weight: 400, rotate: -0.04 });
    },
    5(ctx, t) {
      S.rect(ctx, 10, 30, 114, 120, { fill: 'paper2', width: 1.8, seed: 30 });
      S.text(ctx, 'checklist', 67, 44, { size: 12, font: S.FONT_DISPLAY, weight: 400 });
      [['finishes', true], ['safe memory', true], ['approved tools', true], ['loops forever', false]].forEach(([n, ok], i) => {
        const y = 66 + i * 22;
        if (ok) S.check(ctx, 26, y, 0.6); else S.cross(ctx, 26, y, 0.55);
        S.text(ctx, n, 38, y, { size: 10.5, weight: 600, align: 'left' });
      });
      S.guard(ctx, 160, 194, 1.5, t, { scan: true });
      S.bee(ctx, 212, 118 + Math.sin(t * 3) * 3, 0.85, t, { flip: true });
      const p = (t * 0.32) % 1;
      ctx.globalAlpha = 1 - p;
      S.bee(ctx, 236 + p * 60, 52 - p * 30, 0.55, t, { sad: true });
      ctx.globalAlpha = 1;
      S.text(ctx, 'not you!', 262, 76, { size: 11, weight: 700, color: 'redInk', halo: 3 });
    },
    6(ctx, t) {
      const cols = ['green', 'blue', 'pink', 'green'];
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.45 + i / 4) % 1;
        S.circle(ctx, -6 + p * 98, 184, 4.5, { fill: cols[i], width: 1.2, seed: 40 + i });
      }
      S.castle(ctx, 104, 196, 0.8, { label: 'KERNEL' });
      S.bee(ctx, 104, 146 + Math.sin(t * 3) * 3, 0.75, t, {});
      S.tag(ctx, 'visitors: ' + (1000 + Math.floor(t * 2.2) % 9000), 104, 108, { size: 10, bg: 'yellow', seed: 41 });
      S.polyline(ctx, S.curvePts([130, 150], [180, 110], [200, 160], 14), { dash: [4, 4], width: 1.5, color: 'inkSoft', seed: 42 });
      S.jar(ctx, 210, 192, 1.35, 0.25 + ((t * 0.08) % 0.6), 'map', { t, seed: 43 });
      S.arrow(ctx, [[232, 166], [244, 166]], { width: 2, seed: 44, head: 6 });
      const v = Math.floor(t * 1.5);
      S.laptop(ctx, 272, 180, 0.95, { bars: [3 + v % 4, 5, 2 + (v >> 1) % 5, 4] });
      S.text(ctx, 'your app reads it', 252, 30, { size: 12, font: S.FONT_DISPLAY, weight: 400 });
    }
  };
  $$('canvas[data-comic]').forEach(c => new S.Doodle(c, COMIC[c.dataset.comic], { vw: 300, vh: 200 }));

  /* ================= chapter 2: the race ================= */
  const race = { phase: 'ready', t: 0 };
  const raceBtn = $('#raceBtn');
  new S.Doodle($('#race'), (ctx, t, dt) => {
    if (race.phase === 'run') {
      race.t += dt;
      if (race.t > 7.5) { race.phase = 'done'; raceBtn.textContent = 'Race again'; raceBtn.disabled = false; }
    }
    const rt = race.phase === 'ready' ? 0 : race.t;
    const lanes = [62, 158, 254], X0 = 150, X1 = 850;
    lanes.forEach((y, i) => S.line(ctx, X0 - 6, y + 36, X1 + 34, y + 36, { width: 1.5, dash: [8, 8], double: false, color: 'inkSoft', seed: 200 + i }));
    S.line(ctx, X0, 12, X0, 292, { width: 2.5, seed: 210 });
    for (let r = 0; r < 14; r++) for (let c = 0; c < 2; c++) {
      ctx.fillStyle = S.col((r + c) % 2 ? 'ink' : 'paper2');
      ctx.fillRect(X1 + 8 + c * 9, 14 + r * 19.5, 9, 19.5);
    }
    S.text(ctx, 'FINISH', X1 + 17, 6, { size: 11, weight: 800 });
    [['Change the\nkernel', 'paper2'], ['Kernel\nmodule', 'purple'], ['eBPF', 'yellow']].forEach(([n, bg], i) => S.tag(ctx, n, 70, lanes[i] + 8, { size: 15, bg, seed: 220 + i }));

    // lane 1: the snail that is changing the kernel itself
    const sx = X0 + 36 + Math.min(1, rt / 7.5) * 0.1 * (X1 - X0);
    S.snail(ctx, sx, lanes[0] + 30, 1.25, t);
    if (rt > 0) {
      const msgs = ['writing a patch…', 'waiting for review…', 'waiting for a release…', 'waiting for your distro…', 'still waiting…'];
      S.bubble(ctx, msgs[Math.min(4, Math.floor(rt / 1.5))], sx + 30, lanes[0] + 4, { size: 13, dx: 90, dy: 4, seed: 230 });
      S.tag(ctx, 'year ' + (2026 + Math.floor(rt * 0.4)), X1 - 70, lanes[0] + 6, { size: 14, bg: 'paper2', seed: 231, color: 'ink', border: 'ink' });
    }
    // lane 2: the kernel module car that crashes
    const crashAt = 2.2, cp = Math.min(1, rt / crashAt);
    const cx = X0 + 46 + cp * 0.52 * (X1 - X0);
    if (rt < crashAt) S.car(ctx, cx, lanes[1] + 24, 1.35, rt > 0 ? t : 0, { label: 'module' });
    else {
      S.car(ctx, cx + 22, lanes[1] + 4, 1.35, 0, { tilt: 2.7, label: 'module' });
      S.burst(ctx, cx, lanes[1] + 8, 44, { fill: 'red', text: 'BOOM', size: 17, seed: 240 + (S.motionOK ? Math.floor(t * 5) % 3 : 0) });
      S.tag(ctx, 'kernel panic: the whole\ncomputer crashed', Math.min(X1 - 110, cx + 170), lanes[1] + 8, { bg: 'pink', size: 13, seed: 241 });
    }
    // lane 3: the eBPF bee, checked by the guard
    const gx = X0 + 0.24 * (X1 - X0);
    const checking = rt > 0.8 && rt < 1.8;
    S.guard(ctx, gx + 10, lanes[2] + 34, 0.8, t, { scan: checking, mood: rt >= 1.8 ? 'ok' : null });
    let bx;
    if (rt < 0.8) bx = X0 + 40 + (rt / 0.8) * (gx - 40 - X0 - 20);
    else if (rt < 1.8) bx = gx - 20;
    else bx = gx - 20 + Math.min(1, (rt - 1.8) / 1.4) * (X1 - 10 - gx);
    S.bee(ctx, bx, lanes[2] + 8 + Math.sin(t * 5) * 3, 1.15, t, {});
    if (checking) S.bubble(ctx, 'checking…', gx + 14, lanes[2] - 18, { size: 12, dy: 6, seed: 250 });
    if (rt >= 1.8 && rt < 3.2) S.check(ctx, gx + 34, lanes[2] - 10, 1, 'greenInk');
    if (rt >= 3.2) S.tag(ctx, 'loaded in seconds,\nno reboot ✓', X1 - 120, lanes[2] - 8, { bg: 'green', size: 13, seed: 251 });
    if (race.phase === 'ready') S.text(ctx, 'Press "Start the race" below', 520, 150, { size: 22, font: S.FONT_DISPLAY, weight: 400, halo: 6, rotate: -0.03 });
  }, { vw: 900, vh: 300 });
  raceBtn.addEventListener('click', () => { race.phase = 'run'; race.t = 0; raceBtn.textContent = 'Racing…'; raceBtn.disabled = true; });

  /* ================= chapter 3: the journey ================= */
  const STEPS = [
    { t: 'The big picture', s: 'On the left is user space, where you and your apps live. On the right is the kernel. There is only one door between them. Our program makes eight stops on its way to work.', tech: 'User space and kernel space are separated by the CPU’s privilege levels. The only way in is a system call, and for eBPF that is <code>bpf()</code>.', code: '', lang: 'c' },
    { t: 'Write a tiny program', s: 'You write a small program, usually in C (Rust and Go work too). It says: “when this happens, do that”. Here: when any program starts, say hello.', tech: 'An eBPF program is a C function placed in a named ELF section. <code>SEC()</code> tells the loader which hook it wants.', lang: 'c',
      code: 'SEC("tracepoint/syscalls/sys_enter_execve")\nint hello(void *ctx)\n{\n    bpf_printk("A program just started!");\n    return 0;\n}' },
    { t: 'Compile it to bytecode', s: 'A compiler called clang turns your C into eBPF bytecode: simple instructions that mean the same thing on every computer, whatever processor it has.', tech: 'LLVM has a BPF back end (<code>-target bpf</code>). The output is an ELF object holding bytecode, map definitions and BTF type information.', lang: 'sh',
      code: '$ clang -O2 -g -target bpf -c hello.bpf.c -o hello.bpf.o\n$ llvm-objdump -d hello.bpf.o\n   0: 18 01 00 00 00 00 00 00  r1 = 0 ll\n   2: b7 02 00 00 18 00 00 00  r2 = 24\n   3: 85 00 00 00 06 00 00 00  call 6\n   4: b7 00 00 00 00 00 00 00  r0 = 0\n   5: 95 00 00 00 00 00 00 00  exit' },
    { t: 'Knock on the kernel’s door', s: 'A loader program hands the bytecode to the kernel. It uses the one door between your world and the kernel: the bpf() system call.', tech: 'libbpf (or bpftool, BCC, cilium/ebpf, Aya) creates the maps, applies CO-RE relocations, then calls <code>bpf(BPF_PROG_LOAD, …)</code>, which returns a file descriptor for the program.', lang: 'sh',
      code: '$ sudo bpftool prog load hello.bpf.o /sys/fs/bpf/hello\n\n# under the hood, the loader does:\n# fd = bpf(BPF_PROG_LOAD, &attr, sizeof(attr));' },
    { t: 'The guard checks it', s: 'The verifier walks through every possible path. Does the program always finish? Does it only touch memory it’s allowed to? If anything is unsafe, the door stays shut.', tech: 'The verifier simulates each instruction, tracks register types and value ranges, and prunes states it has already proven safe. Its log comes back to the loader.', lang: 'txt',
      code: 'processed 5 insns (limit 1000000) max_states_per_insn 0\ntotal_states 0 peak_states 0 mark_read 0' },
    { t: 'Translate to CPU language (JIT)', s: 'Bytecode is easy to check but slow to run. The JIT compiler translates it into your processor’s own instructions, so it runs as fast as the rest of the kernel. Our package turns into a bee!', tech: 'x86-64, arm64, riscv64, s390x, powerpc and others have BPF JITs. Many kernels are built with <code>CONFIG_BPF_JIT_ALWAYS_ON</code>, so the interpreter is never used.', lang: 'sh',
      code: '$ sudo bpftool prog dump jited name hello\n   0: nopl   0x0(%rax,%rax,1)\n   5: xchg   %ax,%ax\n   7: push   %rbp\n   8: mov    %rsp,%rbp\n   ...' },
    { t: 'Attach to a hook', s: 'The program is hooked onto an event, like a bee sitting on a doorbell. Here the event is “a new program starts”.', tech: 'Attaching creates a BPF link. Links can be pinned under <code>/sys/fs/bpf</code> so the program stays attached after the loader exits.', lang: 'c',
      code: 'struct bpf_link *link =\n    bpf_program__attach(skel->progs.hello);' },
    { t: 'It runs on every event', s: 'Every time any program starts, the kernel wakes our bee for a moment. It does its job in a few microseconds, then goes back to sleep.', tech: 'The program runs on whichever CPU the event fired, inside the event’s context. Most program types can’t sleep, so they must be short and non-blocking.', lang: 'sh',
      code: '$ sudo cat /sys/kernel/tracing/trace_pipe\n  bash-4123  [002] .....  A program just started!\n  bash-4130  [005] .....  A program just started!' },
    { t: 'Share results through maps', s: 'To report what it saw, the bee drops notes into a map, our honey jar. Your app outside the kernel reads the jar whenever it likes and draws charts.', tech: 'Programs call helpers such as <code>bpf_map_update_elem()</code>. User space reads the same map through its file descriptor, or with <code>mmap()</code> for arrays and ring buffers.', lang: 'sh',
      code: '$ sudo bpftool map dump name exec_count\n[{\n        "key": 4139,\n        "value": 7\n    }\n]' }
  ];
  const J = Sc.journey($('#journey3d'));
  let jStep = 0, jTimer = null;
  const jSteps = $('#jSteps');
  const jBtns = STEPS.map((st, i) => {
    const b = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', 'aria-label': i ? `Step ${i}: ${st.t}` : 'Overview' }, i ? String(i) : '★');
    b.addEventListener('click', () => { stopPlay(); showStep(i); });
    jSteps.appendChild(b);
    return b;
  });
  function showStep(i) {
    jStep = i;
    const st = STEPS[i];
    jBtns.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    $('#jTitle').textContent = (i ? i + ' · ' : '') + st.t;
    $('#jText').textContent = st.s;
    $('#jTech').innerHTML = st.tech;
    $('#jCode').innerHTML = st.code ? highlight(st.code, st.lang) : '';
    J.go(i);
  }
  function stopPlay() { clearInterval(jTimer); jTimer = null; $('#jPlay').textContent = 'Play'; }
  $('#jPrev').addEventListener('click', () => { stopPlay(); showStep((jStep + STEPS.length - 1) % STEPS.length); });
  $('#jNext').addEventListener('click', () => { stopPlay(); showStep((jStep + 1) % STEPS.length); });
  $('#jPlay').addEventListener('click', () => {
    if (jTimer) return stopPlay();
    $('#jPlay').textContent = 'Pause';
    showStep((jStep + 1) % STEPS.length);
    jTimer = setInterval(() => showStep((jStep + 1) % STEPS.length), 5200);
  });
  showStep(0);

  /* ================= chapter 4: be the verifier ================= */
  const CTX = { R1: 'ctx (packet info)', R10: 'top of stack' };
  const PROGS = [
    { name: 'Count packets', ok: true, intro: 'This XDP program counts every packet in a map.',
      blocks: [{ id: 'A', x: 260, y: 70, code: ['u32 key = 0;', 'u64 *val = map_lookup(&counter, &key);', 'if (val == NULL)'] }, { id: 'B', x: 120, y: 250, code: ['return XDP_PASS;'] }, { id: 'C', x: 385, y: 250, code: ['*val += 1;', 'return XDP_PASS;'] }],
      edges: [['A', 'B', 'NULL'], ['A', 'C', 'not NULL']],
      steps: [
        { b: 'A', regs: CTX, say: 'Start. R1 holds the context: information about this packet.' },
        { b: 'A', regs: { R2: 'stack-8 (key = 0)', R0: 'map value OR NULL' }, say: 'map_lookup may find the value, or may return NULL. I remember both.' },
        { b: 'A', say: 'A fork in the road! I have to check BOTH paths.' },
        { b: 'B', via: 'A>B', regs: { R0: '2 (XDP_PASS)' }, say: 'Path 1: val is NULL, so we just return. Safe.', ok: true },
        { b: 'C', via: 'A>C', regs: { R0: 'map value, 8 bytes' }, say: 'Path 2: here val is definitely real. Adding 1 to its 8 bytes stays inside. Safe.', ok: true },
        { b: 'C', regs: { R0: '2 (XDP_PASS)' }, say: 'It returns a plain number. Safe.', ok: true }
      ],
      msg: 'processed 11 insns (limit 1000000) max_states_per_insn 0 total_states 1',
      kid: 'Every path was checked and every path is safe, so the bee may fly in.' },
    { name: 'Forgot the NULL check', ok: false, intro: 'The same counter, but the author forgot something.',
      blocks: [{ id: 'A', x: 260, y: 90, code: ['u32 key = 0;', 'u64 *val = map_lookup(&counter, &key);'] }, { id: 'B', x: 260, y: 260, code: ['*val += 1;        // no check!', 'return XDP_PASS;'] }],
      edges: [['A', 'B', '']],
      steps: [
        { b: 'A', regs: CTX, say: 'Start. R1 holds the packet context.' },
        { b: 'A', regs: { R0: 'map value OR NULL' }, say: 'map_lookup returns a value, or NULL if the key is missing.' },
        { b: 'B', via: 'A>B', say: 'Now it reads *val. But R0 could still be NULL!', fail: true }
      ],
      msg: "R0 invalid mem access 'map_value_or_null'",
      kid: 'You tried to dip into a honey jar that might not exist. Always check first!' },
    { name: 'Loop forever', ok: false, intro: 'A program with a loop that has no way out.',
      blocks: [{ id: 'A', x: 260, y: 60, code: ['int i = 0;'] }, { id: 'B', x: 260, y: 185, code: ['while (1) {', '    i++;', '}'] }, { id: 'C', x: 260, y: 330, code: ['return 0;    // never reached'], dead: true }],
      edges: [['A', 'B', ''], ['B', 'B', 'again'], ['B', 'C', 'never', 'dead']],
      steps: [
        { b: 'A', regs: CTX, say: 'Start.' },
        { b: 'A', regs: { R6: 'i = 0' }, say: 'i starts at 0.' },
        { b: 'B', via: 'A>B', regs: { R6: 'i = 1' }, say: 'Lap 1: i becomes 1. Back to the top…', dur: 0.8 },
        { b: 'B', via: 'B>B', regs: { R6: 'i = 2' }, say: 'Lap 2: i = 2. Back to the top again…', dur: 0.8 },
        { b: 'B', via: 'B>B', regs: { R6: 'i = 3' }, say: 'Lap 3… there is no way out of this loop!', dur: 0.8 },
        { b: 'B', via: 'B>B', say: 'This would spin forever and freeze the kernel.', fail: true }
      ],
      msg: 'infinite loop detected at insn 1',
      kid: 'Every bee has to come home. A bee that never stops flying is not allowed in.' },
    { name: 'A loop that stops', ok: true, intro: 'A loop that adds up 0 + 1 + 2 + 3.',
      blocks: [{ id: 'A', x: 260, y: 50, code: ['int total = 0;', 'int i = 0;'] }, { id: 'B', x: 260, y: 160, code: ['if (i < 4)'] }, { id: 'C', x: 395, y: 270, code: ['total += i;', 'i++;'] }, { id: 'D', x: 115, y: 270, code: ['return total;'] }],
      edges: [['A', 'B', ''], ['B', 'C', 'yes'], ['C', 'B', 'loop'], ['B', 'D', 'no']],
      steps: [
        { b: 'A', regs: CTX, say: 'Start.' },
        { b: 'A', regs: { R6: 'total = 0', R7: 'i = 0' }, say: 'total = 0 and i = 0.' },
        { b: 'B', via: 'A>B', say: 'Is i (0) less than 4? Yes.', dur: 0.7 },
        { b: 'C', via: 'B>C', regs: { R6: 'total = 0', R7: 'i = 1' }, say: 'Lap 1 done, i = 1.', dur: 0.7 },
        { b: 'B', via: 'C>B', say: '1 < 4, keep going.', dur: 0.55 },
        { b: 'C', via: 'B>C', regs: { R6: 'total = 1', R7: 'i = 2' }, say: 'Lap 2 done, i = 2.', dur: 0.55 },
        { b: 'B', via: 'C>B', say: '2 < 4.', dur: 0.55 },
        { b: 'C', via: 'B>C', regs: { R6: 'total = 3', R7: 'i = 3' }, say: 'Lap 3 done, i = 3.', dur: 0.55 },
        { b: 'B', via: 'C>B', say: '3 < 4.', dur: 0.55 },
        { b: 'C', via: 'B>C', regs: { R6: 'total = 6', R7: 'i = 4' }, say: 'Lap 4 done, i = 4.', dur: 0.55, ok: true },
        { b: 'B', via: 'C>B', say: 'Is 4 < 4? No! The loop ends.', ok: true },
        { b: 'D', via: 'B>D', regs: { R0: '6' }, say: 'Return 6. The loop always ends after 4 laps. Safe.', ok: true }
      ],
      msg: 'processed 41 insns (limit 1000000) max_states_per_insn 1 total_states 5',
      kid: 'The guard walked every lap and saw the loop always ends. Bounded loops are fine (since Linux 5.3).' },
    { name: 'Peek past the packet', ok: false, intro: 'An XDP program that looks at the packet type.',
      blocks: [{ id: 'A', x: 260, y: 80, code: ['void *data = (void *)ctx->data;', 'struct ethhdr *eth = data;', 'if (eth->h_proto == htons(ETH_P_IP))'] }, { id: 'B', x: 130, y: 260, code: ['return XDP_DROP;'] }, { id: 'C', x: 390, y: 260, code: ['return XDP_PASS;'] }],
      edges: [['A', 'B', 'IPv4'], ['A', 'C', 'other']],
      steps: [
        { b: 'A', regs: CTX, say: 'Start.' },
        { b: 'A', regs: { R2: 'packet start, 0 bytes proven' }, say: 'R2 points at the packet. Nobody has checked how long it is, so 0 bytes are proven safe.' },
        { b: 'A', say: 'It reads bytes 12–13 of the packet. The packet might be shorter than that!', fail: true }
      ],
      msg: 'invalid access to packet, off=12 size=2, R2(id=0,off=12,r=0)',
      kid: 'You tried to read page 12 of a book without checking the book has 12 pages.' },
    { name: 'Peek safely', ok: true, intro: 'The same program, with one extra line.',
      blocks: [{ id: 'A', x: 260, y: 55, code: ['void *data = (void *)ctx->data;', 'void *end  = (void *)ctx->data_end;', 'if (data + 14 > end)'] }, { id: 'B', x: 100, y: 175, code: ['return XDP_PASS;'] }, { id: 'C', x: 350, y: 175, code: ['if (eth->h_proto == htons(ETH_P_IP))'] }, { id: 'D', x: 245, y: 310, code: ['return XDP_DROP;'] }, { id: 'E', x: 435, y: 310, code: ['return XDP_PASS;'] }],
      edges: [['A', 'B', 'too short'], ['A', 'C', '14+ bytes'], ['C', 'D', 'IPv4'], ['C', 'E', 'other']],
      steps: [
        { b: 'A', regs: CTX, say: 'Start.' },
        { b: 'A', regs: { R2: 'packet start', R3: 'packet end' }, say: 'R2 = start of the packet, R3 = its end.' },
        { b: 'A', say: 'Fork: is the packet at least 14 bytes long? I check both answers.' },
        { b: 'B', via: 'A>B', regs: { R0: '2 (XDP_PASS)' }, say: 'Too short: leave it alone. Safe.', ok: true },
        { b: 'C', via: 'A>C', regs: { R2: 'packet start, 14 bytes proven' }, say: 'Here I KNOW 14 bytes exist. Reading bytes 12–13 is inside. Safe.', ok: true },
        { b: 'D', via: 'C>D', regs: { R0: '1 (XDP_DROP)' }, say: 'Drop it. Safe.', ok: true },
        { b: 'E', via: 'C>E', regs: { R0: '2 (XDP_PASS)' }, say: 'Pass it. Safe.', ok: true }
      ],
      msg: 'processed 13 insns (limit 1000000) max_states_per_insn 0 total_states 1',
      kid: 'The check “is the packet long enough?” proves every read is inside the packet.' },
    { name: 'Empty drawer', ok: false, intro: 'A program that prints a number it never set.',
      blocks: [{ id: 'A', x: 260, y: 180, code: ['u64 secret;         // never filled in', 'u64 copy = secret;', 'bpf_printk("%llu", copy);', 'return 0;'] }],
      edges: [],
      steps: [
        { b: 'A', regs: CTX, say: 'Start.' },
        { b: 'A', say: '“secret” lives in the backpack (stack slot −8), but nothing was ever written there.' },
        { b: 'A', say: 'Reading it could leak leftover kernel secrets!', fail: true }
      ],
      msg: 'invalid read from stack off -8+0 size 8',
      kid: 'You can’t read a drawer you never filled. It might hold someone else’s old secrets.' },
    { name: 'Too big to check', ok: false, intro: 'Two loops, one inside the other.',
      blocks: [{ id: 'A', x: 250, y: 100, code: ['for (int i = 0; i < 100000; i++)', '  for (int j = 0; j < 100000; j++)', '    work(i, j);'] }, { id: 'B', x: 250, y: 290, code: ['return 0;'] }],
      edges: [['A', 'A', 'loop'], ['A', 'B', 'done']],
      steps: [
        { b: 'A', regs: CTX, say: 'Start.' },
        { b: 'A', regs: { R6: 'i', R7: 'j' }, say: '100,000 × 100,000 laps. Let me start counting…' },
        { b: 'A', via: 'A>A', count: true, dur: 3, say: 'Still checking… and checking…' },
        { b: 'A', say: 'Ten billion laps is way past my limit of 1,000,000 steps.', fail: true }
      ],
      msg: 'BPF program is too large. Processed 1000001 insn',
      kid: 'The guard only has time to check a million steps. Programs too big to check aren’t allowed in.' }
  ];
  const lab = { p: null, idx: 0, i: -1, stepT: 0, running: false, regs: {}, changed: [], seen: new Set(), okB: new Set(), failB: null, cur: null, via: null, guard: null, count: null, done: false, results: {} };
  const picker = $('#labPicker');
  $('#labTotal').textContent = PROGS.length;
  const pickBtns = PROGS.map((p, i) => {
    const b = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false' }, `${esc(p.name)} <span class="res"></span>`);
    b.addEventListener('click', () => loadProg(i));
    picker.appendChild(b);
    return b;
  });
  function renderRegs() {
    const keys = Object.keys(lab.regs).sort((a, b) => +a.slice(1) - +b.slice(1));
    $('#labRegs').innerHTML = keys.map(k => `<span class="${lab.changed.includes(k) ? 'changed' : ''}">${k} <b>=</b> ${esc(lab.regs[k])}</span>`).join('');
  }
  function loadProg(i) {
    const p = PROGS[i];
    Object.assign(lab, { p, idx: i, i: -1, stepT: 0, running: false, regs: {}, changed: [], seen: new Set(), okB: new Set(), failB: null, cur: null, via: null, count: null, done: false });
    lab.guard = null;
    pickBtns.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    $('#labAsk').textContent = p.intro + ' Will the verifier let it in?';
    $('#labGuess').hidden = false;
    $$('#labGuess button').forEach(b => { b.disabled = false; });
    $('#labLog').innerHTML = '';
    $('#labResult').innerHTML = '';
    $('#labReplay').hidden = true;
    $('#stamp').className = 'stamp';
    renderRegs();
  }
  function run() {
    Object.assign(lab, { i: -1, stepT: 999, running: true, regs: {}, changed: [], seen: new Set(), okB: new Set(), failB: null, cur: null, via: null, count: null, done: false });
    $('#labLog').innerHTML = '';
    $('#labResult').innerHTML = '';
    $('#labReplay').hidden = true;
    $('#stamp').className = 'stamp';
    renderRegs();
  }
  function applyStep(st) {
    lab.changed = st.regs ? Object.keys(st.regs) : [];
    if (st.regs) Object.assign(lab.regs, st.regs);
    renderRegs();
    lab.cur = st.b;
    lab.via = st.via || null;
    lab.seen.add(st.b);
    if (st.ok) lab.okB.add(st.b);
    if (st.fail) lab.failB = st.b;
    if (st.count) lab.count = { t: 0, dur: st.dur || 3 };
    const li = el('li', { class: st.fail ? 'fail' : st.ok ? 'pass' : '' }, esc(st.say));
    $('#labLog').appendChild(li);
    li.scrollIntoView({ block: 'nearest' });
  }
  function finish() {
    lab.running = false;
    lab.done = true;
    const p = lab.p, res = lab.results[lab.idx];
    const stamp = $('#stamp');
    stamp.textContent = p.ok ? 'ACCEPTED' : 'REJECTED';
    stamp.className = 'stamp show ' + (p.ok ? 'ok' : 'no');
    const right = res && res.guess === (p.ok ? 'safe' : 'unsafe');
    $('#labAsk').textContent = res ? `You said: ${res.guess}.` : '';
    $('#labResult').innerHTML =
      `<p class="verdict">${p.ok ? 'The verifier says YES.' : 'The verifier says NO.'} ${res ? (right ? 'You called it! 🎉' : 'Not this time, but now you know why.') : ''}</p>` +
      `<span class="kmsg">${esc(p.msg)}</span><p>${esc(p.kid)}</p>`;
    $('#labReplay').hidden = false;
    const r = pickBtns[lab.idx].querySelector('.res');
    r.textContent = p.ok ? '✓' : '✗';
    r.className = 'res ' + (p.ok ? 'ok' : 'no');
    if (right && !res.celebrated) { res.celebrated = true; confetti(window.innerWidth / 2, window.innerHeight / 2, 60); }
  }
  $$('#labGuess button').forEach(b => b.addEventListener('click', () => {
    if (!lab.results[lab.idx]) {
      lab.results[lab.idx] = { guess: b.dataset.guess };
      const correct = Object.keys(lab.results).filter(k => lab.results[k].guess === (PROGS[k].ok ? 'safe' : 'unsafe')).length;
      $('#labScore').textContent = correct;
    }
    $$('#labGuess button').forEach(x => { x.disabled = true; });
    $('#labGuess').hidden = true;
    $('#labAsk').textContent = `You said: ${b.dataset.guess}. Watch the guard…`;
    run();
  }));
  $('#labReplay').addEventListener('click', run);

  function blockGeo(ctx, b) {
    ctx.font = `600 12px ${S.FONT_CODE}`;
    b.w = Math.max(...b.code.map(l => ctx.measureText(l).width)) + 26;
    b.h = b.code.length * 17 + 14;
  }
  function drawEdge(ctx, P, e) {
    const [f, to, label, kind] = e;
    const a = P.blocks.find(b => b.id === f), b = P.blocks.find(x => x.id === to);
    const active = lab.via === f + '>' + to;
    let pts, mid;
    if (f === to) {
      const x = a.x + a.w / 2;
      pts = S.curvePts([x, a.y + a.h / 4], [x + 95, a.y], [x, a.y - a.h / 4], 16);
      mid = [x + 46, a.y];
    } else if (b.y < a.y) {
      const x0 = a.x + a.w / 2, x1 = b.x + b.w / 2;
      pts = S.curvePts([x0, a.y], [Math.max(x0, x1) + 70, (a.y + b.y) / 2], [x1, b.y], 18);
      mid = [Math.max(x0, x1) + 32, (a.y + b.y) / 2];
    } else {
      const sx = a.x + Math.max(-a.w / 2 + 18, Math.min(a.w / 2 - 18, (b.x - a.x) * 0.6));
      const p0 = [sx, a.y + a.h / 2], p1 = [b.x, b.y - b.h / 2];
      pts = S.curvePts(p0, [sx, (p0[1] + p1[1]) / 2 + 12], p1, 16);
      mid = pts[8];
    }
    S.arrow(ctx, pts, { color: active ? 'pink' : 'ink', width: active ? 3.4 : 2, dash: kind === 'dead' ? [6, 6] : null, seed: 300 + f.charCodeAt(0) * 7 + to.charCodeAt(0), rough: 0.35 });
    if (label) S.tag(ctx, label, mid[0], mid[1], { size: 11, bg: active ? 'yellow' : 'paper2', shadow: false, seed: 310 + to.charCodeAt(0), color: active ? 'onMarker' : 'ink', border: active ? 'onMarker' : 'ink' });
  }
  function drawBlock(ctx, b) {
    let fill = 'paper2', txt = 'ink';
    if (lab.failB === b.id) { fill = 'red'; txt = 'onMarker'; }
    else if (lab.cur === b.id && lab.running) { fill = 'yellow'; txt = 'onMarker'; }
    else if (lab.okB.has(b.id)) { fill = S.tone('green', 0.4); txt = 'onMarker'; }
    else if (lab.seen.has(b.id)) { fill = S.tone('yellow', 0.55); txt = 'onMarker'; }
    const x = b.x - b.w / 2, y = b.y - b.h / 2;
    S.rect(ctx, x, y, b.w, b.h, { fill, width: 2.2, seed: 400 + b.id.charCodeAt(0), rough: 0.7 });
    if (b.dead) S.rect(ctx, x - 4, y - 4, b.w + 8, b.h + 8, { stroke: 'inkSoft', width: 1.2, double: false, seed: 401 });
    ctx.font = `600 12px ${S.FONT_CODE}`;
    ctx.fillStyle = S.col(txt);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    b.code.forEach((l, i) => ctx.fillText(l, x + 13, y + 15 + i * 17));
    if (lab.okB.has(b.id) && lab.failB !== b.id) S.check(ctx, x + b.w - 4, y + 2, 0.8, 'greenInk');
    if (lab.failB === b.id) S.cross(ctx, x + b.w - 4, y + 2, 0.8, 'onMarker');
  }
  new S.Doodle($('#cfg'), (ctx, t, dt) => {
    const P = lab.p;
    if (!P) return;
    P.blocks.forEach(b => blockGeo(ctx, b));
    if (lab.running) {
      lab.stepT += dt;
      const st = P.steps[lab.i];
      const dur = st ? (st.dur || 1.25) : 0;
      if (!st || lab.stepT >= dur) {
        lab.i++;
        lab.stepT = 0;
        if (lab.i >= P.steps.length) finish();
        else applyStep(P.steps[lab.i]);
      }
    }
    P.edges.forEach(e => drawEdge(ctx, P, e));
    P.blocks.forEach(b => drawBlock(ctx, b));
    // the guard walks to the block being checked
    const cb = P.blocks.find(b => b.id === (lab.cur || P.blocks[0].id));
    const target = [Math.max(16, cb.x - cb.w / 2 - 22), cb.y + cb.h / 2 + 10];
    if (!lab.guard) lab.guard = target.slice();
    const k = Math.min(1, dt * 5);
    lab.guard[0] += (target[0] - lab.guard[0]) * k;
    lab.guard[1] += (target[1] - lab.guard[1]) * k;
    S.guard(ctx, lab.guard[0], lab.guard[1], 0.8, t, { scan: lab.running, mood: lab.done ? (P.ok ? 'ok' : 'no') : null });
    if (lab.count) {
      lab.count.t += dt;
      const f = Math.min(1, lab.count.t / lab.count.dur);
      const n = Math.floor(f * f * 1000001);
      S.tag(ctx, 'steps checked: ' + n.toLocaleString('en-US'), 400, 210, { size: 14, bg: f >= 1 ? 'red' : 'yellow', seed: 450 });
    }
    if (!lab.running && !lab.done) S.text(ctx, 'make your guess →', 260, 385, { size: 15, font: S.FONT_DISPLAY, weight: 400, color: 'inkSoft' });
  }, { vw: 520, vh: 400 });
  loadProg(0);

  /* ================= chapter 5: the eBPF machine ================= */
  const INSNS = [
    { asm: 'r1 = 7', hex: ['b7', '01', '00 00', '07 00 00 00'], say: 'Put the number 7 into hand R1. (R1 was holding the context pointer; we just replaced it.)', run: r => { r.r1 = 7; return ['r1']; } },
    { asm: 'r2 = 5', hex: ['b7', '02', '00 00', '05 00 00 00'], say: 'Put 5 into hand R2.', run: r => { r.r2 = 5; return ['r2']; } },
    { asm: 'r1 += r2', hex: ['0f', '21', '00 00', '00 00 00 00'], say: 'Add R2 to R1: 7 + 5 = 12.', run: r => { r.r1 += r.r2; return ['r1']; } },
    { asm: 'r1 *= 2', hex: ['27', '01', '00 00', '02 00 00 00'], say: 'Double R1: 12 × 2 = 24.', run: r => { r.r1 *= 2; return ['r1']; } },
    { asm: '*(u64 *)(r10 - 8) = r1', hex: ['7b', '1a', 'f8 ff', '00 00 00 00'], say: 'Save R1 in the backpack, 8 bytes below the top (R10 − 8). The offset −8 is stored as f8 ff.', run: (r, m) => { m.stack = r.r1; return []; } },
    { asm: 'if r1 > 20 goto +2', hex: ['25', '01', '02 00', '14 00 00 00'], say: 'Is R1 (24) bigger than 20 (0x14)? Yes, so jump forward 2 instructions, to line 8.', run: (r, m) => { if (r.r1 > 20) m.jump = 8; return []; } },
    { asm: 'r0 = 0', hex: ['b7', '00', '00 00', '00 00 00 00'], say: 'Put 0 into R0.', run: r => { r.r0 = 0; return ['r0']; } },
    { asm: 'exit', hex: ['95', '00', '00 00', '00 00 00 00'], say: 'Stop and return R0.', run: (r, m) => { m.exit = true; return []; } },
    { asm: 'r0 = r1', hex: ['bf', '10', '00 00', '00 00 00 00'], say: 'Copy R1 into R0. R0 is the hand that holds the answer.', run: r => { r.r0 = r.r1; return ['r0']; } },
    { asm: 'exit', hex: ['95', '00', '00 00', '00 00 00 00'], say: 'Done! The program returns 24, the number in R0.', run: (r, m) => { m.exit = true; return []; } }
  ];
  const ROLES = ['return value', 'arg 1 · ctx', 'arg 2', 'arg 3', 'arg 4', 'arg 5', 'saved', 'saved', 'saved', 'saved', 'stack top (read-only)'];
  const insEl = $('#insns'), regEl = $('#regs'), stackEl = $('#stack');
  insEl.innerHTML = INSNS.map((x, i) => `<li data-i="${i}"><span class="pc">${i}</span><span class="asm">${esc(x.asm)}</span><span class="hex"><i class="op">${x.hex[0]}</i><i class="rg">${x.hex[1]}</i><i class="of">${x.hex[2]}</i><i class="im">${x.hex[3]}</i></span></li>`).join('');
  regEl.innerHTML = ROLES.map((r, i) => `<div class="reg r${i}" data-r="r${i}"><b>R${i}</b><span>–</span><small>${r}</small></div>`).join('');
  stackEl.innerHTML = Array.from({ length: 64 }, (_, i) => `<i class="${i === 63 ? 'top' : ''}"></i>`).join('');
  const M = { pc: 0, regs: {}, stack: null, done: false, timer: null };
  function mRender(changed = []) {
    $$('li', insEl).forEach((li, i) => { li.classList.toggle('cur', i === M.pc && !M.done); });
    $$('.reg', regEl).forEach(d => {
      const k = d.dataset.r, v = M.regs[k];
      d.querySelector('span').textContent = v === undefined ? '–' : String(v);
      d.classList.remove('flash');
      if (changed.includes(k)) { void d.offsetWidth; d.classList.add('flash'); }
    });
    stackEl.lastElementChild.classList.toggle('used', M.stack != null);
    stackEl.lastElementChild.title = M.stack != null ? 'r10 - 8 = ' + M.stack : 'empty';
    $('#mStep').disabled = M.done;
  }
  function mReset() {
    clearInterval(M.timer);
    M.timer = null;
    Object.assign(M, { pc: 0, regs: { r1: 'ctx*', r10: 'fp' }, stack: null, done: false });
    $$('li', insEl).forEach(li => li.classList.remove('done', 'skip'));
    $('#mNarr').textContent = 'Ready. R1 points at the context and R10 at the top of the backpack. Press Step.';
    $('#mRun').textContent = 'Run all';
    mRender();
  }
  function mStep() {
    if (M.done) return;
    const ins = INSNS[M.pc], meta = {};
    const changed = ins.run(M.regs, meta);
    if (meta.stack !== undefined) M.stack = meta.stack;
    $(`li[data-i="${M.pc}"]`, insEl).classList.add('done');
    $('#mNarr').textContent = `Line ${M.pc}: ${ins.say}`;
    if (meta.exit) { M.done = true; clearInterval(M.timer); M.timer = null; $('#mRun').textContent = 'Run all'; }
    else if (meta.jump !== undefined) {
      for (let k = M.pc + 1; k < meta.jump; k++) $(`li[data-i="${k}"]`, insEl).classList.add('skip');
      M.pc = meta.jump;
    } else M.pc++;
    mRender(changed);
  }
  $('#mStep').addEventListener('click', () => { clearInterval(M.timer); M.timer = null; $('#mRun').textContent = 'Run all'; mStep(); });
  $('#mReset').addEventListener('click', mReset);
  $('#mRun').addEventListener('click', () => {
    if (M.timer) { clearInterval(M.timer); M.timer = null; $('#mRun').textContent = 'Run all'; return; }
    if (M.done) mReset();
    $('#mRun').textContent = 'Pause';
    mStep();
    M.timer = setInterval(() => { mStep(); if (M.done) { clearInterval(M.timer); M.timer = null; } }, 1100);
  });
  mReset();

  /* ================= chapter 6: hooks ================= */
  const CATC = { tracing: 'blue', networking: 'green', security: 'red', scheduling: 'purple' };
  window.HOOKS = [
    { id: 'uprobe', name: 'uprobe', cat: 'tracing', at: [-5.5, 21.4, 0], base: 20.6, where: 'On any function inside a normal app, like bash or your own program.', like: 'A sticky note on a page of an app’s diary. When the app reaches that page, your bee peeks.', use: 'See every command typed into bash, or time slow functions in your app without changing it.', lang: 'c', code: 'uretprobe:/bin/bash:readline {\n    printf("typed: %s\\n", str(retval));\n}', tech: 'The kernel patches a breakpoint into the target binary’s memory. uretprobes fire on function return.' },
    { id: 'usdt', name: 'USDT', cat: 'tracing', at: [-1.5, 21.4, -1.5], base: 20.6, where: 'At signposts that app authors leave in their code on purpose.', like: 'Official “you are here” signs an app puts up for visitors.', use: 'Watch what Python, Node.js, Java or databases are doing inside, at stable named points.', lang: 'c', code: 'usdt:/usr/bin/python3:python:function__entry {\n    printf("%s\\n", str(arg1));\n}', tech: 'User Statically-Defined Tracing probes are compiled-in nops, turned into uprobes on demand. They only exist if the app was built with them.' },
    { id: 'syscall', name: 'syscall tracepoints', cat: 'tracing', at: [-4.2, 16.6, 0.9], base: 15.6, where: 'At the front desk where apps ask the kernel for things.', like: 'A visitors’ book at the castle window: every request gets written down.', use: 'See which files are opened, which programs start, which connections are made.', lang: 'c', code: 'tracepoint:syscalls:sys_enter_openat {\n    printf("%s opened %s\\n", comm, str(args->filename));\n}', tech: 'Every system call has sys_enter_* and sys_exit_* tracepoints with typed arguments.' },
    { id: 'kprobe', name: 'kprobe / fentry', cat: 'tracing', at: [-6, 11.3, -1], base: 10, where: 'On almost any function inside the kernel.', like: 'A sticky note you can put on nearly any page in the castle’s rule book.', use: 'Debugging and deep tracing: when does the kernel delete a file, retransmit a packet, or run out of memory?', lang: 'c', code: 'kprobe:do_unlinkat {\n    printf("%s is deleting a file\\n", comm);\n}', tech: 'kprobes work on most kernel functions but are not a stable API: function names change between versions. fentry/fexit (BPF trampolines) are faster and get typed arguments through BTF.' },
    { id: 'tracepoint', name: 'tracepoints', cat: 'tracing', at: [-2.9, 11.4, 1.9], base: 10.2, where: 'At spots the kernel developers marked on purpose.', like: 'Doorbells the castle builders installed. They stay in the same place in every version.', use: 'Stable tracing of the scheduler, networking, block I/O and more.', lang: 'c', code: 'tracepoint:sched:sched_process_exec {\n    printf("new program: %s\\n", str(args->filename));\n}', tech: 'List them with <code>sudo bpftrace -l \'tracepoint:*\'</code>. Their format is in /sys/kernel/tracing/events/*/*/format.' },
    { id: 'schedext', name: 'sched_ext', cat: 'scheduling', at: [-1.1, 12.7, 0.8], base: 10.2, where: 'Inside the part of the kernel that decides which program runs next.', like: 'Writing your own rules for whose turn it is on the playground swing.', use: 'Custom CPU schedulers, for example to keep games smooth or servers fast.', lang: 'c', code: 'SEC(".struct_ops.link")\nstruct sched_ext_ops simple_ops = {\n    .enqueue  = (void *)simple_enqueue,\n    .dispatch = (void *)simple_dispatch,\n    .name     = "simple",\n};', tech: 'sched_ext (Linux 6.12) uses struct_ops: a set of BPF programs implements a kernel interface. If the scheduler misbehaves, the kernel falls back to its default.' },
    { id: 'lsm', name: 'LSM', cat: 'security', at: [2.2, 11.3, -1.4], base: 10, where: 'At the kernel’s security checkpoints.', like: 'A guard post. Your bee can say NO: “this program may not open that file!”', use: 'Enforce your own security rules, like blocking risky actions inside containers.', lang: 'c', code: 'SEC("lsm/file_open")\nint BPF_PROG(guard, struct file *file)\n{\n    /* return -EPERM to refuse */\n    return 0;\n}', tech: 'BPF LSM (Linux 5.7) attaches to Linux Security Module hooks. A non-zero return denies the operation. Needs <code>lsm=…,bpf</code> in the boot settings on many distros.' },
    { id: 'cgroup', name: 'cgroup hooks', cat: 'networking', at: [5.6, 11.8, 0.9], base: 10.6, where: 'Around a group of programs, such as one container.', like: 'A fence around a group of kids: you decide who they may talk to.', use: 'Per-container firewalls, and rules like “this service may only connect to the database”.', lang: 'c', code: 'SEC("cgroup/connect4")\nint no_smtp(struct bpf_sock_addr *ctx)\n{\n    return ctx->user_port == bpf_htons(25) ? 0 : 1;\n}', tech: 'cgroup programs can filter packets (cgroup_skb), socket creation, connect/bind calls and more for everything in a cgroup. Return 1 to allow, 0 to reject.' },
    { id: 'socket', name: 'socket filter', cat: 'networking', at: [7.4, 13.1, 0.2], base: 10.6, where: 'On one network socket.', like: 'A sieve on one pipe: only the packets you want come through.', use: 'The original BPF! tcpdump uses it to pick which packets to show you.', lang: 'sh', code: '$ sudo tcpdump -d \'tcp port 80\'\n(000) ldh      [12]\n(001) jeq      #0x86dd   jt 2  jf 8\n...', tech: 'tcpdump compiles filter expressions to classic BPF; the kernel translates classic BPF to eBPF internally. <code>-d</code> prints the program.' },
    { id: 'tc', name: 'TC', cat: 'networking', at: [9, 10.4, 2.4], base: 9.2, where: 'In traffic control, where packets enter and leave the network stack.', like: 'A sorting desk for parcels coming in and going out.', use: 'Container networking (Cilium), traffic shaping, rewriting and redirecting packets.', lang: 'c', code: 'SEC("tc")\nint tag_packets(struct __sk_buff *skb)\n{\n    return TC_ACT_OK;   /* let it through */\n}', tech: 'TC programs see a full sk_buff, work on ingress and egress, and can modify, redirect or drop packets. Newer kernels attach them with tcx links.' },
    { id: 'xdp', name: 'XDP', cat: 'networking', at: [6.5, 6.1, 0.6], base: 5, where: 'In the network driver, the moment a packet arrives.', like: 'A bouncer at the very front door who turns troublemakers away before they come in.', use: 'Stopping floods of attack traffic, super fast load balancers and firewalls.', lang: 'c', code: 'SEC("xdp")\nint bouncer(struct xdp_md *ctx)\n{\n    return XDP_DROP;   /* or XDP_PASS */\n}', tech: 'XDP runs before the kernel allocates an sk_buff. Some network cards can even run XDP programs in hardware (offload).' },
    { id: 'perf', name: 'perf_event', cat: 'tracing', at: [-4, 1.9, 0], base: 0.5, where: 'On the processor’s timers and counters.', like: 'A metronome that taps your bee 99 times a second to ask: “what is the CPU busy with right now?”', use: 'CPU profiling and flame graphs: find out where time is spent.', lang: 'c', code: 'profile:hz:99 {\n    @[kstack] = count();\n}', tech: 'perf_event programs run on hardware or software events, such as CPU cycles, cache misses or a timer, and can record stack traces.' }
  ];
  const hookCard = $('#hookCard'), hookList = $('#hookList');
  const hookBtns = {};
  window.HOOKS.forEach(h => {
    const b = el('button', { type: 'button', 'aria-pressed': 'false' }, `<i class="dot" style="--c:var(--${CATC[h.cat]})"></i>${esc(h.name)}`);
    b.addEventListener('click', () => H.select(h.id));
    hookList.appendChild(b);
    hookBtns[h.id] = b;
  });
  function renderHook(h) {
    hookCard.innerHTML = `<span class="cat" style="--c:var(--${CATC[h.cat]})">${h.cat}</span><h3>${esc(h.name)}</h3><p><b>${esc(h.like)}</b></p>
      <dl><dt>Where it sits</dt><dd>${esc(h.where)}</dd><dt>Good for</dt><dd>${esc(h.use)}</dd></dl>
      <pre class="code small">${highlight(h.code, h.lang)}</pre><p class="techie">${h.tech}</p>`;
    for (const id in hookBtns) hookBtns[id].setAttribute('aria-pressed', String(id === h.id));
  }
  const H = Sc.hooks($('#hooks3d'), renderHook);
  H.select('xdp');

  /* ================= chapter 7: maps ================= */
  const MAPS = [
    { n: 'Hash map', c: 'yellow', s: 'Labelled drawers. Look things up by name, called a key.', mini: '<span class="bx" style="--c:var(--yellow)">pid 42</span><span class="ar">→</span><span class="bx">7</span><span class="bx" style="--c:var(--yellow)">pid 99</span><span class="ar">→</span><span class="bx">3</span>', t: '<code>BPF_MAP_TYPE_HASH</code>: any key and value size, set max_entries up front.' },
    { n: 'Array', c: 'blue', s: 'Numbered boxes in a row. Box 3 is always in the same place, so it’s very fast.', mini: ['0', '1', '2', '3', '4'].map(i => `<span class="bx" style="--c:var(--blue)">${i}</span>`).join(''), t: '<code>BPF_MAP_TYPE_ARRAY</code>: integer keys, preallocated, can be mmap()ed by user space.' },
    { n: 'Per-CPU', c: 'green', s: 'Every processor gets its own copy, so they never have to wait for each other.', mini: ['CPU0', 'CPU1', 'CPU2', 'CPU3'].map(i => `<span class="bx" style="--c:var(--green)">${i}</span>`).join(''), t: '<code>PERCPU_HASH</code> / <code>PERCPU_ARRAY</code>: no locking on the hot path; user space sums the copies.' },
    { n: 'LRU hash', c: 'orange', s: 'A drawer that throws out the oldest thing when it gets full.', mini: '<span class="bx" style="--c:var(--orange)">new</span><span class="bx" style="--c:var(--orange)">b</span><span class="bx" style="--c:var(--orange)">c</span><span class="bx fall">oldest</span>', t: '<code>BPF_MAP_TYPE_LRU_HASH</code>: great for connection tracking where entries come and go.' },
    { n: 'Ring buffer', c: 'pink', s: 'A merry-go-round that carries events to your app, in order.', mini: '<span class="ring"></span><span class="ar">→ events in order →</span>', t: '<code>BPF_MAP_TYPE_RINGBUF</code>: one buffer for all CPUs, reserve/submit API, epoll notification.' },
    { n: 'LPM trie', c: 'purple', s: 'Finds the best-matching address range, like a postcode lookup for internet addresses.', mini: '<span class="bx" style="--c:var(--purple)">10.0.0.0/8</span><span class="ar">⊃</span><span class="bx" style="--c:var(--purple)">10.1.0.0/16</span>', t: '<code>BPF_MAP_TYPE_LPM_TRIE</code>: longest-prefix match, used for routing and IP allow-lists.' },
    { n: 'Program array', c: 'yellow', s: 'A phone book of other programs. One bee can hand its job to the next.', mini: '<span class="bx" style="--c:var(--yellow)">0: parse</span><span class="ar">→</span><span class="bx" style="--c:var(--yellow)">1: filter</span><span class="ar">→</span><span class="bx" style="--c:var(--yellow)">2: log</span>', t: '<code>BPF_MAP_TYPE_PROG_ARRAY</code> powers <code>bpf_tail_call()</code>, which jumps to another program (up to 33 in a row).' },
    { n: 'Stack traces', c: 'blue', s: 'Remembers the trail of function calls that led somewhere. Used for flame graphs.', mini: '<span class="bx" style="--c:var(--blue)">main</span><span class="ar">→</span><span class="bx" style="--c:var(--blue)">read</span><span class="ar">→</span><span class="bx" style="--c:var(--blue)">vfs_read</span>', t: '<code>BPF_MAP_TYPE_STACK_TRACE</code> stores stacks captured with <code>bpf_get_stackid()</code>.' }
  ];
  $('#mapTypes').innerHTML = MAPS.map(m => `<li><h3><svg class="ico" style="color:var(--ink)" aria-hidden="true"><use href="#i-jar"/></svg>${m.n}</h3><div class="mini">${m.mini}</div><p>${m.s}</p><p class="techie">${m.t}</p></li>`).join('');
  const RB = Sc.ring($('#ring3d'), st => {
    $('#rProd').textContent = st.produced;
    $('#rCons').textContent = st.consumed;
    $('#rDrop').textContent = st.dropped;
    $('#rFill').textContent = st.count + '/' + st.N;
  });
  const rates = () => {
    const p = +$('#prodRate').value, c = +$('#consRate').value;
    $('#prodVal').textContent = p;
    $('#consVal').textContent = c;
    RB.setRates(p, c);
  };
  $('#prodRate').addEventListener('input', rates);
  $('#consRate').addEventListener('input', rates);
  rates();

  /* ================= chapter 8: XDP defender ================= */
  const X = Sc.xdp($('#xdp3d'), st => {
    const pct = Math.round(st.load * 100);
    $('#cpuBar').style.width = pct + '%';
    $('#cpuBar').style.background = `var(--${pct > 85 ? 'red' : pct > 55 ? 'orange' : 'green'})`;
    $('#cpuPct').textContent = pct + '%';
    $('#happy').textContent = st.happy;
    $('#lost').textContent = st.lost;
    $('#xdpMap').innerHTML = [['visitor', 'web'], ['ping', 'ping'], ['attack', 'attack']].map(([n, k]) => `<tr><td>${n}</td><td>${st.stats[k].pass}</td><td class="drop">${st.stats[k].drop}</td></tr>`).join('');
    const ab = $('#attackBtn');
    ab.disabled = st.attacking;
    ab.textContent = st.attacking ? 'Attack in progress…' : 'Launch the attack!';
  });
  function xdpRules() {
    const r = { on: $('#xdpOn').getAttribute('aria-pressed') === 'true', attack: $('#ruleAttack').checked, ping: $('#rulePing').checked, web: $('#ruleWeb').checked };
    X.setRules(r);
    $$('.rules-box input').forEach(i => { i.disabled = !r.on; });
    const lines = ['SEC("xdp")', 'int defender(struct xdp_md *ctx)', '{', '    struct packet p = parse(ctx);   // bounds-checked!', ''];
    if (r.attack) lines.push('    if (p.src_ip == IP(6,6,6,6))  return count(ATTACK, XDP_DROP);');
    if (r.ping) lines.push('    if (p.proto == IPPROTO_ICMP)  return count(PING, XDP_DROP);');
    if (r.web) lines.push('    if (p.dst_port == 443)        return count(WEB, XDP_DROP);   // hmm, that blocks visitors!');
    if (!r.attack && !r.ping && !r.web) lines.push('    // no rules: every packet passes');
    lines.push('', '    return count(p.kind, XDP_PASS);   // updates the xdp_stats map', '}');
    $('#xdpCode').innerHTML = r.on ? highlight(lines.join('\n'), 'c') : highlight('// XDP is OFF: no program is attached to the network card.\n// Every packet goes straight into the kernel network stack.', 'c');
  }
  $('#xdpOn').addEventListener('click', e => {
    const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    b.lastChild.textContent = on ? 'XDP program is ON' : 'XDP program is OFF';
    xdpRules();
  });
  $$('.rules-box input').forEach(i => i.addEventListener('change', xdpRules));
  $('#attackBtn').addEventListener('click', () => X.attack());
  xdpRules();

  const USES = [
    { n: 'Observability', icon: 'i-eye', c: 'blue', s: 'See inside a running computer, live.', ex: '“Which program is hammering my disk?”', tools: ['bpftrace', 'BCC tools', 'Pixie', 'Parca', 'Grafana Beyla', 'Inspektor Gadget'] },
    { n: 'Networking', icon: 'i-net', c: 'green', s: 'Move packets fast and smart.', ex: '“Send each visitor to a server that isn’t busy.”', tools: ['Cilium', 'Katran', 'Calico', 'XDP firewalls'] },
    { n: 'Security', icon: 'i-shield', c: 'pink', s: 'Spot and stop bad behaviour as it happens.', ex: '“Alert me if a container suddenly opens a shell.”', tools: ['Falco', 'Tetragon', 'Tracee', 'KubeArmor'] },
    { n: 'Performance', icon: 'i-gauge', c: 'orange', s: 'Find out exactly why something is slow.', ex: '“Draw a flame graph of where the CPU time goes.”', tools: ['profile', 'offcputime', 'biolatency', 'runqlat'] },
    { n: 'Scheduling', icon: 'i-cpu', c: 'purple', s: 'Write your own rules for sharing the CPU.', ex: '“Keep my game smooth while big jobs run.”', tools: ['sched_ext', 'scx_rusty', 'scx_lavd'] },
    { n: 'Everywhere', icon: 'i-phone', c: 'yellow', s: 'From phones to the biggest clouds.', ex: 'Android uses eBPF to count how much data each app uses.', tools: ['Android', 'Kubernetes', 'eBPF for Windows'] }
  ];
  $('#uses').innerHTML = USES.map((u, i) => `<li class="sticky" style="--bg:var(--${u.c});--rot:${[-1.2, 0.8, -0.5, 1.1, -0.9, 0.6][i]}deg"><h3><svg class="ico" aria-hidden="true"><use href="#${u.icon}"/></svg>${u.n}</h3><p>${u.s}</p><p class="ex">${u.ex}</p><div class="tools">${u.tools.map(t => `<span>${t}</span>`).join('')}</div></li>`).join('');

  /* ================= chapter 9: code ================= */
  const CODE = [
    { tab: 'bpftrace one-liners', intro: 'bpftrace is the quickest way to start. Each line below is a complete eBPF program. Press Ctrl-C to stop; maps that start with @ are printed when you do.', oneliners: [
      ['Who is opening which files?', 'sudo bpftrace -e \'tracepoint:syscalls:sys_enter_openat { printf("%s opened %s\\n", comm, str(args->filename)); }\''],
      ['Which new programs are starting?', 'sudo bpftrace -e \'tracepoint:syscalls:sys_enter_execve { printf("%s -> %s\\n", comm, str(args->filename)); }\''],
      ['Count system calls by program', 'sudo bpftrace -e \'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }\''],
      ['How big are reads? (a histogram)', 'sudo bpftrace -e \'tracepoint:syscalls:sys_exit_read /args->ret > 0/ { @bytes = hist(args->ret); }\''],
      ['What is the CPU busy doing? (for flame graphs)', 'sudo bpftrace -e \'profile:hz:99 { @[kstack] = count(); }\''],
      ['Show commands typed into bash', 'sudo bpftrace -e \'uretprobe:/bin/bash:readline { printf("%s\\n", str(retval)); }\'']
    ] },
    { tab: 'Hello world · Python', intro: 'BCC lets you write the eBPF part in C and the rest in Python. This prints a hello every time any program starts.', lang: 'py', file: 'hello.py',
      code: 'from bcc import BPF ⟨1⟩\n\nprogram = r"""\nint hello(void *ctx) { ⟨2⟩\n    bpf_trace_printk("Hello, eBPF! A program started.\\n");\n    return 0;\n}\n"""\n\nb = BPF(text=program) ⟨3⟩\nb.attach_kprobe(event=b.get_syscall_fnname("execve"), fn_name="hello") ⟨4⟩\nprint("Start any program in another terminal. Ctrl-C to stop.")\nb.trace_print() ⟨5⟩',
      notes: ['BCC compiles your C code on the fly with LLVM, right on this machine.', 'This small C function is the eBPF program: our bee.', 'Compiling and loading happen here, so this is where the verifier checks it.', 'Hook it onto the execve system call, which runs every time a program starts.', 'Print what the bee writes to the kernel’s trace log.'],
      run: '$ sudo apt install python3-bpfcc     # Debian/Ubuntu package name\n$ sudo python3 hello.py' },
    { tab: 'Block pings · XDP in C', intro: 'A real XDP program: drop ping packets the instant they reach the network card. This is the same idea as the game in Chapter 8.', lang: 'c', file: 'block_ping.bpf.c',
      code: '#include <linux/bpf.h>\n#include <linux/if_ether.h>\n#include <linux/ip.h>\n#include <linux/in.h>\n#include <bpf/bpf_helpers.h>\n#include <bpf/bpf_endian.h>\n\nSEC("xdp") ⟨1⟩\nint block_ping(struct xdp_md *ctx)\n{\n    void *data     = (void *)(long)ctx->data;\n    void *data_end = (void *)(long)ctx->data_end;\n\n    struct ethhdr *eth = data;\n    if ((void *)(eth + 1) > data_end) ⟨2⟩\n        return XDP_PASS;\n    if (eth->h_proto != bpf_htons(ETH_P_IP))\n        return XDP_PASS;\n\n    struct iphdr *ip = (void *)(eth + 1);\n    if ((void *)(ip + 1) > data_end)\n        return XDP_PASS;\n\n    if (ip->protocol == IPPROTO_ICMP) ⟨3⟩\n        return XDP_DROP;\n\n    return XDP_PASS; ⟨4⟩\n}\n\nchar LICENSE[] SEC("license") = "GPL"; ⟨5⟩',
      notes: ['SEC("xdp") tells the loader: attach this function at the XDP hook.', 'The bounds check the verifier insists on: is the packet long enough to hold an Ethernet header? Without it, the program is rejected (see “Peek past the packet” in Chapter 4).', 'ICMP is the protocol that ping uses.', 'Everything else continues into the kernel as normal.', 'Some helpers are only for GPL-compatible programs, so the license is declared here.'],
      run: '$ clang -O2 -g -target bpf -c block_ping.bpf.c -o block_ping.o\n$ sudo ip link set dev eth0 xdp obj block_ping.o sec xdp\n# ping this machine from another computer: no replies!\n$ sudo ip link set dev eth0 xdp off',
      tech: 'Replace <code>eth0</code> with your interface name (see <code>ip link</code>). If clang can’t find <code>asm/types.h</code>, add <code>-I/usr/include/$(uname -m)-linux-gnu</code>.' },
    { tab: 'Count file opens · map in C', intro: 'This program keeps a count per process in a hash map (a honey jar), and you read the jar from outside.', lang: 'c', file: 'opens.bpf.c',
      code: '#include "vmlinux.h" ⟨1⟩\n#include <bpf/bpf_helpers.h>\n\nstruct {\n    __uint(type, BPF_MAP_TYPE_HASH); ⟨2⟩\n    __uint(max_entries, 10240);\n    __type(key, u32);    // process id\n    __type(value, u64);  // files opened\n} open_count SEC(".maps");\n\nSEC("tracepoint/syscalls/sys_enter_openat")\nint count_opens(void *ctx)\n{\n    u32 pid = bpf_get_current_pid_tgid() >> 32; ⟨3⟩\n    u64 one = 1;\n\n    u64 *count = bpf_map_lookup_elem(&open_count, &pid);\n    if (count) ⟨4⟩\n        __sync_fetch_and_add(count, 1);\n    else\n        bpf_map_update_elem(&open_count, &pid, &one, BPF_ANY);\n    return 0;\n}\n\nchar LICENSE[] SEC("license") = "GPL";',
      notes: ['vmlinux.h describes every type in your running kernel. It is generated from BTF (first command below).', 'Declares a hash map: key = process id, value = a count.', 'A helper from the approved toolbox: which process is running right now? The process id is in the upper 32 bits.', 'The NULL check. Remove it and the verifier says no (try “Forgot the NULL check” in Chapter 4).'],
      run: '$ bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h\n$ clang -O2 -g -target bpf -c opens.bpf.c -o opens.bpf.o\n$ sudo bpftool prog loadall opens.bpf.o /sys/fs/bpf/opens autoattach\n$ sudo bpftool map dump name open_count\n$ sudo rm -r /sys/fs/bpf/opens          # unload when done',
      tech: '<code>autoattach</code> needs a recent bpftool. Otherwise, write a small loader with libbpf: the <a href="https://github.com/libbpf/libbpf-bootstrap" target="_blank" rel="noopener">libbpf-bootstrap</a> templates do exactly this.' }
  ];
  const tabs = $('#codeTabs'), panel = $('#codePanel');
  function copyBtn(text) {
    const b = el('button', { type: 'button', class: 'copy' }, 'copy');
    b.addEventListener('click', () => {
      const done = () => { b.textContent = 'copied!'; setTimeout(() => { b.textContent = 'copy'; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => { b.textContent = 'select & copy'; });
      else b.textContent = 'select & copy';
    });
    return b;
  }
  function showTab(i) {
    $$('button', tabs).forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    const c = CODE[i];
    panel.innerHTML = `<p class="intro">${c.intro}</p>`;
    if (c.oneliners) {
      const ul = el('ul', { class: 'oneliners' });
      c.oneliners.forEach(([d, cmd]) => {
        const li = el('li', {}, `<p>${esc(d)}</p>`);
        const w = el('div', { class: 'code-wrap' });
        w.appendChild(el('pre', { class: 'code' }, highlight(cmd, 'c')));
        w.appendChild(copyBtn(cmd));
        li.appendChild(w);
        ul.appendChild(li);
      });
      panel.appendChild(ul);
      return;
    }
    const grid = el('div', { class: 'code-grid' });
    const w = el('div', { class: 'code-wrap' });
    w.appendChild(el('p', { class: 'm-label' }, esc(c.file)));
    w.appendChild(el('pre', { class: 'code' }, highlight(c.code, c.lang)));
    const cb = copyBtn(plain(c.code));
    cb.style.top = '34px';
    w.appendChild(cb);
    grid.appendChild(w);
    grid.appendChild(el('ol', { class: 'notes' }, c.notes.map((n, k) => `<li><b>${k + 1}</b><span>${esc(n)}</span></li>`).join('')));
    panel.appendChild(grid);
    const run = el('div', { class: 'run code-wrap' }, '<p class="m-label">Try it</p>');
    run.appendChild(el('pre', { class: 'code' }, highlight(c.run, 'sh')));
    panel.appendChild(run);
    if (c.tech) panel.appendChild(el('p', { class: 'techie' }, c.tech));
  }
  CODE.forEach((c, i) => {
    const b = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false' }, esc(c.tab));
    b.addEventListener('click', () => showTab(i));
    tabs.appendChild(b);
  });
  showTab(0);

  /* ================= chapter 10: glossary ================= */
  const WORDS = [
    ['Kernel', 'yellow', 'The boss program of your computer. It talks to the hardware and shares it fairly between apps.', 'The privileged core of the OS: memory management, scheduling, drivers, networking and the system-call interface.'],
    ['User space', 'blue', 'Where normal apps live. They have to ask the kernel for anything important.', 'Unprivileged CPU mode. Code here reaches the kernel only through system calls.'],
    ['System call', 'pink', 'An app’s polite request to the kernel: “please open this file”.', 'The user/kernel boundary, e.g. openat(), read(), execve(), and bpf() for eBPF itself.'],
    ['eBPF program', 'yellow', 'A tiny program that runs inside the kernel when something happens.', 'Bytecode for the BPF ISA, loaded with BPF_PROG_LOAD and typed by program type (kprobe, xdp, lsm…).'],
    ['Verifier', 'green', 'The guard who proves a program is safe before it may run.', 'A static analyser that walks all paths, tracking register types and value ranges, with a 1M-instruction budget.'],
    ['JIT compiler', 'orange', 'A translator that turns bytecode into your processor’s own language, so it runs fast.', 'Compiles verified BPF instructions to native x86-64, arm64, riscv64 and more.'],
    ['Hook', 'purple', 'A spot where an eBPF program waits for something to happen.', 'An attach point: kprobe, tracepoint, uprobe, XDP, TC, cgroup, LSM, perf_event, struct_ops…'],
    ['Map', 'yellow', 'A honey jar: storage shared by eBPF programs and apps.', 'Kernel data structures (hash, array, ring buffer, LRU, LPM trie…) reached through helpers and file descriptors.'],
    ['Helper', 'blue', 'A tool from the kernel’s approved toolbox.', 'Stable kernel functions callable from BPF, like bpf_map_lookup_elem() or bpf_get_current_pid_tgid().'],
    ['kfunc', 'pink', 'Newer, more specialised tools the kernel lends out.', 'Kernel functions exposed to BPF through BTF. Unlike helpers, they have no stable-API promise.'],
    ['BTF', 'green', 'A dictionary that describes the shape of the kernel’s data.', 'BPF Type Format: compact type info for the kernel and programs. Powers CO-RE and readable verifier logs.'],
    ['CO-RE', 'orange', 'Compile Once, Run Everywhere: build once, and it adapts to other kernels.', 'libbpf rewrites struct field offsets at load time using the running kernel’s BTF.'],
    ['XDP', 'purple', 'eXpress Data Path: checks network packets the moment they arrive.', 'Runs in the NIC driver before sk_buff allocation. Verdicts: PASS, DROP, TX, REDIRECT, ABORTED.'],
    ['Tail call', 'yellow', 'One bee handing its job over to another bee.', 'bpf_tail_call() jumps into another program from a PROG_ARRAY without returning. Up to 33 in a chain.'],
    ['bpftrace', 'blue', 'A one-line magic wand for asking the kernel questions.', 'A high-level tracing language, inspired by awk and DTrace, compiled to BPF with LLVM.'],
    ['libbpf & bpftool', 'green', 'The toolkit that loads programs, and the pocket knife that inspects them.', 'libbpf: the reference C loader with CO-RE and skeletons. bpftool: list, dump, pin and generate.']
  ];
  $('#flips').innerHTML = WORDS.map(([w, c, a, b]) => `<li class="flip"><button type="button" aria-label="${esc(w)}: flip for the technical version"><span class="face front" style="--c:var(--${c})"><span class="term">${esc(w)}</span><p>${esc(a)}</p><span class="turn">tap to flip</span></span><span class="face back"><span class="term">${esc(w)}</span><p>${esc(b)}</p><span class="turn">tap to flip back</span></span></button></li>`).join('');
  $$('#flips .flip').forEach(f => f.querySelector('button').addEventListener('click', () => f.classList.toggle('on')));

  /* ================= chapter 12: quiz ================= */
  const QUIZ = [
    ['What is the kernel?', ['A kind of popcorn', 'The boss program that runs the computer', 'A web browser', 'A computer virus'], 1, 'The kernel controls the hardware and shares it between all your apps.'],
    ['What does the verifier do?', ['Makes programs faster', 'Checks that a program is safe before it runs', 'Writes code for you', 'Deletes viruses'], 1, 'It walks every possible path and rejects anything that could hurt the kernel.'],
    ['Which program will the verifier REJECT?', ['A loop that counts to 10', 'Using a map value after checking it isn’t NULL', 'A loop that never ends', 'Returning XDP_PASS'], 2, 'Every eBPF program must finish. Endless loops are never allowed.'],
    ['Where does an XDP program run?', ['In your web browser', 'In the network driver, the moment a packet arrives', 'On the hard disk', 'On a server in the cloud'], 1, 'That’s why XDP is so fast at dropping bad packets: they never get inside.'],
    ['eBPF programs store data and share it with apps using…', ['Maps', 'Emails', 'Cookies', 'Sticky notes'], 0, 'Maps are the honey jars: hash maps, arrays, ring buffers and more.'],
    ['Do you need to reboot to load an eBPF program?', ['Yes, always', 'No', 'Only on Tuesdays', 'Only for big programs'], 1, 'eBPF programs load into the running kernel in seconds.'],
    ['What does the JIT compiler do?', ['Translates bytecode into the processor’s own instructions', 'Checks your spelling', 'Compresses files', 'Makes coffee'], 0, 'After the verifier says yes, the JIT makes the program run at full speed.'],
    ['How big is an eBPF program’s stack (its backpack)?', ['512 bytes', '1 gigabyte', 'Unlimited', '64 kilobytes'], 0, 'Just 512 bytes. Bigger data goes into maps.']
  ];
  const qz = { i: 0, score: 0, answered: false };
  const qbox = $('#quizBox');
  function showQ() {
    if (qz.i >= QUIZ.length) {
      const great = qz.score >= 6;
      qbox.innerHTML = `<div class="final"><div class="badge"><svg aria-hidden="true"><use href="#i-bee"/></svg></div><h3>${qz.score} out of ${QUIZ.length}!</h3><p>${great ? 'You are an official eBPF beekeeper. The guard approves.' : 'Good try! Flip through the chapters again and have another go.'}</p><button class="btn" type="button" id="qAgain">Play again</button></div>`;
      $('#qAgain').addEventListener('click', () => { Object.assign(qz, { i: 0, score: 0 }); showQ(); });
      if (great) confetti(window.innerWidth / 2, window.innerHeight / 3, 140);
      return;
    }
    const [q, opts] = QUIZ[qz.i];
    qz.answered = false;
    qbox.innerHTML = `<p class="qnum">Question ${qz.i + 1} of ${QUIZ.length}</p><h3>${esc(q)}</h3><ul class="opts">${opts.map((o, k) => `<li><button type="button" data-k="${k}">${esc(o)}</button></li>`).join('')}</ul><div id="qWhy"></div><div class="qfoot"><span>Score: <b>${qz.score}</b></span><button class="btn sm" type="button" id="qNext" hidden>${qz.i === QUIZ.length - 1 ? 'See my score' : 'Next question'}</button></div>`;
    $$('.opts button', qbox).forEach(b => b.addEventListener('click', () => answer(+b.dataset.k, b)));
    $('#qNext').addEventListener('click', () => { qz.i++; showQ(); });
  }
  function answer(k, btn) {
    if (qz.answered) return;
    qz.answered = true;
    const [, , right, why] = QUIZ[qz.i];
    $$('.opts button', qbox).forEach(b => { b.disabled = true; if (+b.dataset.k === right) b.classList.add('right'); });
    if (k === right) {
      qz.score++;
      $('.qfoot b', qbox).textContent = qz.score;
      const r = btn.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top, 40);
    } else btn.classList.add('wrong');
    $('#qWhy').innerHTML = `<p class="why"><b>${k === right ? 'Yes!' : 'Not quite.'}</b> ${esc(why)}</p>`;
    $('#qNext').hidden = false;
    $('#qNext').focus();
  }
  showQ();

  /* ================= confetti ================= */
  const cf = $('#confetti'), cctx = cf.getContext('2d');
  let bits = [], cfRun = false;
  function confetti(x, y, n) {
    if (!S.motionOK) return;
    const cols = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'].map(c => S.col(c));
    for (let i = 0; i < n; i++) bits.push({ x, y, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3, r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.3, c: cols[i % cols.length], life: 1, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4 });
    if (!cfRun) { cfRun = true; requestAnimationFrame(cfLoop); }
  }
  function cfLoop() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cf.width !== Math.round(innerWidth * dpr)) { cf.width = Math.round(innerWidth * dpr); cf.height = Math.round(innerHeight * dpr); }
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter(b => b.life > 0);
    for (const b of bits) {
      b.vy += 0.28; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life -= 0.009;
      cctx.save(); cctx.translate(b.x, b.y); cctx.rotate(b.r); cctx.globalAlpha = Math.max(0, b.life);
      cctx.fillStyle = b.c; cctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); cctx.restore();
    }
    if (bits.length) requestAnimationFrame(cfLoop);
    else { cfRun = false; cctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
})();
