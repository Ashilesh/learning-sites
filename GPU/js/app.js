/* =========================================================
   app.js — page wiring: theme, chapter map, drawer, progress,
   quiz, glossary, certificate. Starts the 3D engine last.
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  const root = document.documentElement;

  /* ---------- theme ---------- */
  $('#themeBtn').addEventListener('click', () => {
    const t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('gpu-theme', t); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  });

  /* ---------- chapters → map + drawer ---------- */
  const chapters = $$('.chapter');
  const lvlName = { basic: 'Basic', mid: 'Intermediate', pro: 'Advanced' };
  const colorOf = el => [...el.classList].find(c => c.startsWith('c-')) || 'c-pink';
  const seen = new Set(store.get('gpu-seen', []));
  const map = $('#mapList'), toc = $('#tocList');
  const parts = { ch1: 'Part 1 · The Basics', ch5: 'Part 2 · Inside the GPU', ch8: 'Part 3 · Pro Level' };
  chapters.forEach((ch, i) => {
    const id = ch.id, ic = ch.dataset.icon, nm = ch.dataset.short, lv = ch.dataset.level, col = colorOf(ch);
    map.insertAdjacentHTML('beforeend', '<li class="' + col + '" data-id="' + id + '"><a href="#' + id + '"><span class="num">' + (i + 1) + '</span><span class="ico emoji">' + ic + '</span><span class="t">' + nm + '</span><span class="lvl ' + lv + '">' + (lvlName[lv] || 'Everyone') + '</span><span class="done">✅</span></a></li>');
    if (parts[id]) toc.insertAdjacentHTML('beforeend', '<li class="part-h">' + parts[id] + '</li>');
    toc.insertAdjacentHTML('beforeend', '<li class="' + col + '" data-id="' + id + '"><a href="#' + id + '"><span class="n">' + (i + 1) + '</span><span class="emoji">' + ic + '</span> ' + nm + '<span class="tick">✓</span></a></li>');
  });
  function paintSeen() { $$('[data-id]').forEach(li => li.classList.toggle('seen', seen.has(li.dataset.id))); }
  paintSeen();

  const drawer = $('#drawer'), bg = $('#drawerBg');
  const openD = () => { drawer.classList.add('open'); bg.classList.add('open'); };
  const closeD = () => { drawer.classList.remove('open'); bg.classList.remove('open'); };
  $('#openToc').addEventListener('click', openD);
  $('#closeToc').addEventListener('click', closeD);
  bg.addEventListener('click', closeD);
  toc.addEventListener('click', e => { if (e.target.closest('a')) closeD(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeD(); });

  const chObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const id = e.target.id;
    $$('#tocList a').forEach(a => a.classList.toggle('here', a.getAttribute('href') === '#' + id));
    if (!seen.has(id)) { seen.add(id); store.set('gpu-seen', [...seen]); paintSeen(); }
  }), { rootMargin: '-35% 0px -55% 0px' });
  chapters.forEach(c => chObs.observe(c));

  /* ---------- progress + back to top ---------- */
  const bar = $('#progress'), top = $('#toTop');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%';
      top.classList.toggle('show', scrollY > 900);
      ticking = false;
    });
  }, { passive: true });
  top.addEventListener('click', () => scrollTo({ top: 0 }));

  /* ---------- ch3: kid army ---------- */
  const army = $('#kidArmy');
  if (army) army.innerHTML = Array.from({ length: 50 }, (_, i) => '<span>' + ['🧒', '👧', '👦', '🧒🏽', '👧🏾', '👦🏻'][i % 6] + '</span>').join('');

  /* ---------- ch5: card legend <-> 3D ---------- */
  const legend = $('#cardLegend');
  if (legend) {
    legend.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (window.GPU3D) GPU3D.send('card', 'part', b.dataset.part);
      const st = $('.stage[data-scene="card"]');
      if (st) { const r = st.getBoundingClientRect(); if (r.bottom < 60 || r.top > innerHeight - 60) st.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
    document.addEventListener('cardpart', e => $$('button', legend).forEach(b => b.classList.toggle('on', b.dataset.part === e.detail)));
  }

  /* ---------- quiz ---------- */
  const Q = [
    ['What does GPU stand for?', ['Graphics Processing Unit', 'Giant Power Unit', 'General Pixel Updater', 'Game Playing Unit'], 0, 'GPU = Graphics Processing Unit. It started as a picture-drawing chip!'],
    ['Who is the “school principal” that gives apps turns, memory and access to devices?', ['The monitor', 'The Operating System', 'The SSD', 'The fan'], 1, 'The OS (Windows, macOS, Linux, Android, iOS…) is the boss of the computer.'],
    ['A GPU is best at…', ['One tricky step-by-step puzzle', 'Doing the same simple job on tons of data at once', 'Storing files when the power is off', 'Connecting to Wi-Fi'], 1, 'Thousands of simple cores = high throughput on parallel work.'],
    ['What is VRAM?', ['A virus', 'The GPU’s own super-fast memory', 'A type of fan', 'The CPU’s cache'], 1, 'VRAM (GDDR or HBM) sits next to the GPU and feeds it at huge speeds.'],
    ['In a game, what does rasterization do?', ['Plays the sound', 'Works out which pixels each triangle covers', 'Saves the game', 'Cools the GPU'], 1, 'Rasterization turns triangles into pixel squares; then pixel shaders color them.'],
    ['How many threads are in an NVIDIA warp?', ['4', '16', '32', '1,000'], 2, 'A warp is 32 threads that run the same instruction together.'],
    ['In CUDA, how does each thread find its own item?', ['It asks the CPU', 'i = blockIdx.x × blockDim.x + threadIdx.x', 'It guesses randomly', 'i = 0 for everyone'], 1, 'Every thread computes its unique global index from its block and thread numbers.'],
    ['What kind of math does AI mostly need?', ['Matrix multiplication (multiply + add, lots!)', 'Long division', 'Only adding 1', 'Geometry proofs'], 0, 'Neural networks are mostly giant matrix multiplications — tensor cores love them.'],
    ['What’s special about Apple Silicon’s memory?', ['It’s made of glass', 'CPU and GPU share one unified memory', 'It has no memory', 'It only stores music'], 1, 'Unified memory means no copying between CPU RAM and GPU VRAM.'],
    ['Which is a GPU best practice?', ['Copy data back and forth after every step', 'Make half of each warp take a different branch', 'Keep data on the GPU and read neighbor addresses', 'Launch one thread at a time'], 2, 'Avoid PCIe trips, coalesce memory access, avoid divergence.']
  ];
  const quiz = $('#quiz');
  let score = 0, answered = 0;
  Q.forEach((q, qi) => {
    const d = document.createElement('div'); d.className = 'quiz-q';
    d.innerHTML = '<h5><b>Q' + (qi + 1) + '</b>' + q[0] + '</h5><div class="quiz-opts">' + q[1].map((o, oi) => '<button data-o="' + oi + '">' + o + '</button>').join('') + '</div><div class="quiz-why">💡 ' + q[3] + '</div>';
    d.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || d.classList.contains('answered')) return;
      const ok = +b.dataset.o === q[2];
      d.classList.add('answered');
      $$('button', d).forEach((x, i) => { x.disabled = true; if (i === q[2]) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      if (ok) score++; answered++;
      $('#quizScore').innerHTML = 'Score: ' + score + ' / ' + Q.length + (answered === Q.length ? (score >= 7 ? ' 🎉 GPU Wizard!' : ' 👍 Nice try!') + ' <button class="btn-sk" id="quizAgain">↺ Try again</button>' : '');
      if (window.GPU3D) GPU3D.send('trophy', 'score', { score, total: Q.length, done: answered === Q.length });
      if (answered === Q.length) {
        $('#certScore').textContent = 'Quiz score: ' + score + ' / ' + Q.length + ' ⭐'.repeat(Math.max(1, Math.round(score / 2)));
        const st = $('.stage[data-scene="trophy"]'); if (st) st.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    quiz.appendChild(d);
  });
  document.addEventListener('click', e => {
    if (e.target.id !== 'quizAgain') return;
    score = 0; answered = 0;
    $$('.quiz-q').forEach(d => { d.classList.remove('answered'); $$('button', d).forEach(b => { b.disabled = false; b.classList.remove('right', 'wrong'); }); });
    $('#quizScore').textContent = 'Score: 0 / ' + Q.length;
    quiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- certificate ---------- */
  const nameIn = $('#nameIn'), certName = $('#certName');
  const saved = store.get('gpu-name', '');
  if (saved) { nameIn.value = saved; certName.textContent = saved; }
  nameIn.addEventListener('input', () => { const v = nameIn.value.trim(); certName.textContent = v || 'Future GPU Wizard'; store.set('gpu-name', v); });

  /* ---------- glossary ---------- */
  const G = [
    ['GPU', 'Graphics Processing Unit: a chip with thousands of small cores working in parallel.'],
    ['CPU', 'Central Processing Unit: the computer’s clever boss with a few fast cores.'],
    ['Core', 'One worker that can do math. GPUs have thousands, CPUs a handful.'],
    ['CUDA core', 'NVIDIA’s name for one FP32 math lane inside an SM.'],
    ['SM', 'Streaming Multiprocessor: a “factory” on the GPU with 128 CUDA cores, tensor cores and more.'],
    ['GPC', 'Graphics Processing Cluster: a neighborhood of SMs.'],
    ['Warp', '32 threads that run the same instruction together.'],
    ['Thread', 'One tiny program instance working on its own piece of data.'],
    ['Block', 'A team of threads that can share memory and sync up.'],
    ['Grid', 'All the blocks of one kernel launch.'],
    ['Kernel', 'A function that runs on the GPU, once per thread.'],
    ['CUDA', 'NVIDIA’s platform & language for programming GPUs.'],
    ['Shader', 'A small GPU program for graphics (vertex, pixel, compute).'],
    ['Vertex', 'A corner point of a 3D shape (x, y, z).'],
    ['Pixel', 'One colored square on your screen.'],
    ['Rasterization', 'Working out which pixels a triangle covers.'],
    ['Ray tracing', 'Following light rays to make realistic reflections and shadows.'],
    ['Frame / FPS', 'One finished picture / how many per second.'],
    ['VRAM', 'The GPU’s own fast memory on the graphics card.'],
    ['GDDR', 'Memory chips placed around the GPU on gaming cards.'],
    ['HBM', 'High Bandwidth Memory: stacked memory right next to big data-center GPUs.'],
    ['Unified memory', 'One memory pool shared by CPU and GPU (e.g., Apple Silicon).'],
    ['Bandwidth', 'How much data flows per second — the pipe’s width.'],
    ['Latency', 'How long until the first bit arrives — the pipe’s length.'],
    ['Cache', 'A small, fast memory that keeps popular data close.'],
    ['Registers', 'The fastest, tiniest storage, private to each thread.'],
    ['Shared memory', 'Fast on-chip scratchpad shared by threads in a block.'],
    ['PCIe', 'The highway slot connecting the graphics card to the motherboard.'],
    ['Driver', 'Software that translates OS requests into a device’s own language.'],
    ['Operating System', 'The boss software (Windows, macOS, Linux…) that manages everything.'],
    ['Kernel (OS)', 'The core of the operating system that controls hardware.'],
    ['API', 'A standard menu of commands apps can call (DirectX, Vulkan, Metal).'],
    ['Tensor core', 'A special unit that multiplies small matrices super fast (for AI).'],
    ['RT core', 'A special unit that speeds up ray–triangle tests.'],
    ['FLOPS', 'Floating-point operations per second — a measure of math speed.'],
    ['Matrix', 'A grid of numbers. AI is mostly multiplying these.'],
    ['Throughput', 'How much work gets done per second overall.'],
    ['Coalescing', 'Neighbor threads reading neighbor memory, so it’s fetched in one trip.'],
    ['Divergence', 'When threads in one warp take different branches and must take turns.'],
    ['Occupancy', 'How many warps are active on an SM compared to the maximum.'],
    ['Mixed precision', 'Using smaller number formats (FP16/BF16/FP8) where it’s safe, for speed.'],
    ['NVLink', 'Super-fast links between NVIDIA GPUs.'],
    ['TBDR', 'Tile-Based Deferred Rendering: drawing the screen tile by tile on-chip (Apple, phones).'],
    ['Inference', 'Using a trained AI model to answer questions.'],
    ['Training', 'Teaching an AI model by adjusting its weights over many examples.']
  ];
  const gl = $('#gloss');
  gl.innerHTML = G.map(g => '<div data-k="' + (g[0] + ' ' + g[1]).toLowerCase() + '"><b>' + g[0] + '</b>' + g[1] + '</div>').join('');
  $('#glossQ').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    $$('#gloss div').forEach(d => d.classList.toggle('hide', !!q && !d.dataset.k.includes(q)));
  });

  /* ---------- start 3D ---------- */
  if (window.GPU3D && GPU3D.init) GPU3D.init();
})();
