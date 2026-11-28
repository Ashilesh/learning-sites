/* Part 3 scenes: cuda, memory, matmul, compare, warp, trophy */

/* ============ Chapter 8: CUDA kernel launch ============ */
GPU3D.register('cuda', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.at(K.shadow(5.2, 4.2), 0, 0, -2.2)); root.add(K.at(K.shadow(5.4, 3.4), 0, 0, 1.2));
  const NB = 12;
  const thrGeo = K.rgeo(.078, .078, .078, .022, 1);
  const idleCol = 0x9fe6f5, w0Col = 0xffd84d, w1Col = 0xff6aa8;
  const blocks = [];
  root.add(K.box(4.6, .05, 3.5, C.white, { pos: [0, .025, -2.2] }));
  for (let b = 0; b < NB; b++) {
    const g = new T.Group();
    g.add(K.box(.92, .05, .92, C.cream, { pos: [0, .025, 0] }));
    const w = [K.instanced(thrGeo, 32, 0xffffff), K.instanced(thrGeo, 32, 0xffffff)];
    w.forEach((m, wi) => {
      m.material.color.setHex(idleCol);
      for (let i = 0; i < 32; i++) {
        const x = i % 8, z = Math.floor(i / 8) + wi * 4;
        K.dummy.position.set(-.35 + x * .1, .1, -.35 + z * .1); K.dummy.scale.setScalar(1); K.dummy.rotation.set(0, 0, 0); K.dummy.updateMatrix();
        m.setMatrixAt(i, K.dummy.matrix);
      }
      g.add(m);
    });
    g.userData.w = w;
    g.userData.home = K.V(-1.65 + (b % 4) * 1.1, .05, -3.3 + Math.floor(b / 4) * 1.1);
    g.position.copy(g.userData.home); root.add(g); blocks.push(g);
    ctx.pick(g, '📦 Block ' + b, 'A team of 64 threads (8×8). Threads in a block can share fast memory and wait for each other. On the GPU they run as <b>2 warps</b> of 32 — watch the yellow and pink halves take turns.');
  }
  const smPos = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) smPos.push(K.V(-1.68 + c * 1.12, 0, .55 + r * 1.25));
  const sms = smPos.map((p, i) => {
    const g = K.group(K.box(1.0, .1, 1.0, C.purple, { pos: [0, .05, 0], unique: true }), K.box(1.0, .55, .06, C.purple, { pos: [0, .32, -.47] }), K.box(.06, .55, .5, C.purple, { pos: [-.47, .32, -.22] }), K.box(.06, .55, .5, C.purple, { pos: [.47, .32, -.22] }));
    g.children[0].material.emissive = new T.Color(0);
    g.position.copy(p); root.add(g);
    ctx.pick(g, '🏭 SM ' + i, 'A Streaming Multiprocessor. It takes one block at a time here (real SMs can juggle several), runs its warps, then grabs the next block from the queue.');
    g.userData.L = ctx.label(g, 'SM ' + i, { off: [0, .75, -.4], cls: 't-purple' });
    return g;
  });
  const outs = [];
  for (let i = 0; i < NB; i++) {
    const m = K.box(.36, .1, .36, C.gray, { unique: true, pos: [-2.31 + i * .42, .05, 3.05] });
    root.add(m); outs.push(m);
  }
  ctx.label(K.V(0, .1, -4.15), '📦 grid: <code>add&lt;&lt;&lt;12, 64&gt;&gt;&gt;</code>', { cls: 'big t-cyan' });
  ctx.label(blocks[3].userData.home.clone().add(K.V(.95, .3, 0)), '🧵 block = 64 threads', { cls: 't-yellow' });
  ctx.label(K.V(-2.75, .9, 1.15), '🏭 SMs', { cls: 'big t-purple' });
  ctx.label(K.V(1.25, .1, 3.55), '✅ results c[ ]', { cls: 't-green' });
  const timer = ctx.label(K.V(-1.35, .1, 3.55), '⏱ ready', { cls: 'big' });

  let nSM = 2;
  const results = {};
  function showSMs() { sms.forEach((s, i) => { s.visible = i < nSM; s.userData.L.show(i < nSM); }); }
  function reset() {
    ctx.stop();
    blocks.forEach(b => { b.position.copy(b.userData.home); b.scale.setScalar(1); b.visible = true; b.userData.w.forEach(m => m.material.color.setHex(idleCol)); });
    outs.forEach(o => o.material.color.setHex(C.gray));
    sms.forEach(s => s.children[0].material.emissive.setHex(0));
    timer.set('⏱ ready');
  }
  function launch() {
    reset();
    ctx.play(async a => {
      ctx.info('🚀 Kernel launched!', 'The grid of 12 blocks is queued. Each free SM grabs the next block. Inside, the block’s 64 threads run as 2 warps of 32 (yellow, then pink…).');
      const queue = blocks.map((b, i) => i);
      const t0 = ctx.time;
      let running = true;
      (async () => { while (running && !a.dead) { timer.set('⏱ ' + (ctx.time - t0).toFixed(1) + ' s'); await a.wait(.1); } })().catch(() => {});
      async function worker(si) {
        const sm = sms[si];
        while (queue.length) {
          const bi = queue.shift(), b = blocks[bi];
          const p0 = b.position.clone(), p1 = sm.position.clone().add(K.V(0, .11, .03));
          await a.tween(.6, e => { b.position.lerpVectors(p0, p1, e); b.position.y += Math.sin(e * Math.PI) * 1.2; });
          sm.children[0].material.emissive.setHex(0x331a55);
          for (let k = 0; k < 6; k++) {
            const w = b.userData.w;
            w[k % 2].material.color.setHex(k % 2 ? w1Col : w0Col); w[(k + 1) % 2].material.color.setHex(idleCol);
            await a.wait(.2);
          }
          b.userData.w.forEach(m => m.material.color.setHex(0x7ef0a6));
          sm.children[0].material.emissive.setHex(0);
          const q0 = b.position.clone(), q1 = outs[bi].position.clone().add(K.V(0, .1, 0));
          await a.tween(.45, e => { b.position.lerpVectors(q0, q1, e); b.position.y += Math.sin(e * Math.PI) * .8; b.scale.setScalar(1 - e * .85); });
          b.visible = false; outs[bi].material.color.setHex(C.green); ctx.pulse(outs[bi]);
        }
      }
      await Promise.all(sms.slice(0, nSM).map((s, i) => worker(i)));
      running = false;
      const dt = ctx.time - t0; results[nSM] = dt;
      timer.set('✅ ' + nSM + ' SMs: ' + dt.toFixed(1) + ' s');
      if (nSM === 2) ctx.info('✅ Done with 2 SMs: ' + dt.toFixed(1) + ' s', 'Now pick <b>🦖 Big GPU (8 SMs)</b> and launch again. Same code, no changes!');
      else ctx.info('🦖 8 SMs: ' + dt.toFixed(1) + ' s' + (results[2] ? ' (vs ' + results[2].toFixed(1) + ' s)' : ''), 'Blocks are independent, so the GPU may run them in any order on any number of SMs. That’s why the <b>same CUDA program</b> automatically runs faster on a bigger GPU!');
    });
  }
  ctx.modes(['🐣 Small GPU (2 SMs)', '🦖 Big GPU (8 SMs)'], i => { nSM = i ? 8 : 2; showSMs(); reset(); launch(); }, 0);
  ctx.button('🚀 Launch kernel', launch, 'primary');
  ctx.button('↺ Reset', reset);
  showSMs();
  ctx.info('🚀 Ready to launch', '<code>add&lt;&lt;&lt;12, 64&gt;&gt;&gt;(…)</code> creates a <b>grid</b> of 12 <b>blocks</b>, each with 64 <b>threads</b>. Press <b>🚀 Launch kernel</b>.');
  ctx.home([0, 8.4, 7.2], [0, 0, -.25], 1.1);
  return {};
});

/* ============ Chapter 9: memory tower ============ */
GPU3D.register('memory', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.at(K.shadow(5, 5), -1.2, 0, 0)); root.add(K.at(K.shadow(2.8, 2.8), 3.5, 0, 0));
  const cx = -1.2;
  const tiers = [
    { k: 'vram', r: 2.0, h: .5, col: C.green, name: '🟩 VRAM', lat: '~500 ticks', time: 3.2, t: '🟩 VRAM — the school library 🏫', d: 'Gigabytes of memory on the card, about 500 clock ticks away — but with a super-wide pipe: roughly 1–8 TB/s depending on the GPU.' },
    { k: 'l2', r: 1.45, h: .45, col: C.yellow, name: '🟨 L2 cache', lat: '~200 ticks', time: 1.6, t: '🟨 L2 cache — the classroom shelf 🗄️', d: 'Shared by the whole chip. Tens of MB, about 200 ticks away.' },
    { k: 'l1', r: .95, h: .4, col: C.orange, name: '🟧 L1 / shared', lat: '~30 ticks', time: .6, t: '🟧 L1 / shared memory — your backpack 🎒', d: 'Fast on-chip memory inside each SM (about 128–256 KB). Threads in a block share it as a scratchpad. About 30 ticks away.' },
    { k: 'reg', r: .5, h: .35, col: C.pink, name: '🟥 registers', lat: '~1 tick', time: .15, t: '🟥 Registers — your hands ✋', d: 'Each thread’s own tiny storage, right inside the core. About 1 clock tick. ~256 KB per SM in total.' }
  ];
  let y = 0;
  tiers.forEach(tr => {
    const m = K.cyl(tr.r, tr.r, tr.h, tr.col, { pos: [cx, y + tr.h / 2, 0], seg: 40 });
    root.add(m); tr.m = m; tr.top = y + tr.h; y += tr.h;
    ctx.pick(m, tr.t, tr.d);
    ctx.label(K.V(cx + tr.r * .72, tr.top - tr.h / 2, tr.r * .72), tr.name + ' · ' + tr.lat, { cls: '' });
  });
  const topY = y;
  const bot = K.group(K.capsule(.12, .12, C.cyan, { pos: [0, .18, 0] }), K.sphere(.13, C.white, { pos: [0, .47, 0] }),
    K.sphere(.028, 0, { mat: K.glow(0x24243a), pos: [-.05, .48, .115], outline: false }), K.sphere(.028, 0, { mat: K.glow(0x24243a), pos: [.05, .48, .115], outline: false }),
    K.cyl(.01, .01, .12, C.slate, { pos: [0, .64, 0], edges: false, outline: false }), K.sphere(.035, C.pink, { pos: [0, .71, 0] }));
  bot.position.set(cx, topY, 0); root.add(bot);
  ctx.pick(bot, '👷 A GPU thread', 'The worker who needs the data. The closer the data, the faster it can start working!');
  ctx.label(bot, '👷 thread', { off: [0, .75, 0], cls: 't-cyan' });
  // RAM island + bridge
  const ram = K.group(K.cyl(1.1, 1.1, .5, C.blue, { pos: [0, .25, 0], seg: 36 }), K.box(.9, .3, .07, C.yellow, { pos: [0, .65, -.15] }), K.box(.9, .3, .07, C.yellow, { pos: [0, .65, .15] }));
  ram.position.set(3.5, 0, 0); root.add(ram);
  ctx.pick(ram, '🟦 CPU RAM — across town 🌉', 'The CPU’s own memory. To reach it, data must cross the narrow PCIe bridge: only about 32–64 GB/s and many microseconds. Avoid this trip when you can!');
  ctx.label(ram, '🟦 CPU RAM · µs away!', { off: [0, 1.15, 0], cls: 't-blue' });
  const bridge = K.tube([[2.42, .4, 0], [1.8, .95, 0], [1.2, .95, 0], [.75, .45, 0]], .05, C.gray);
  root.add(bridge);
  ctx.pick(bridge, '🌉 PCIe bridge', 'A narrow road between the CPU side and the GPU card. Fine for occasional trips, terrible for constant traffic.');
  ctx.label(K.V(1.5, 1.2, 0), '🌉 PCIe (narrow!)', { cls: 't-red' });

  const target = K.V(cx, topY + .45, .12);
  const racers = tiers.map(tr => ({ start: K.V(cx + .1, tr.top + .08, tr.r - .18), time: tr.time, col: tr.col, name: tr.name }));
  racers.push({ start: K.V(3.5, .62, .4), time: 7.5, col: C.blue, name: '🟦 RAM', viaBridge: true });
  const cubes = racers.map(r => { const m = K.box(.16, .16, .16, r.col); m.visible = false; root.add(m); return m; });
  const marks = racers.map(r => ctx.label(r.start.clone().add(K.V(-.35, .25, 0)), '', { cls: 'hot' }).show(false));

  function pathPos(r, e, out) {
    if (!r.viaBridge) return out.lerpVectors(r.start, target, e);
    const pts = [r.start, K.V(2.42, .55, 0), K.V(1.8, 1.1, 0), K.V(1.2, 1.1, 0), K.V(.75, .6, 0), K.V(cx + .9, topY + .1, .2), target];
    const c = r.curve || (r.curve = new T.CatmullRomCurve3(pts));
    return out.copy(c.getPoint(e));
  }
  // bandwidth particles
  const NP = 64;
  const flow = K.instanced(new T.BoxGeometry(.08, .08, .08), NP, 0xffffff, true); flow.visible = false; root.add(flow);
  const fl = Array.from({ length: NP }, (_, i) => ({ p: Math.random(), wide: i >= 4, a: Math.random() * 6.28 }));
  const bridgeCurve = new T.CatmullRomCurve3([K.V(3.5, .6, 0), K.V(2.42, .55, 0), K.V(1.8, 1.1, 0), K.V(1.2, 1.1, 0), K.V(.75, .6, 0)]);
  for (let i = 0; i < NP; i++) flow.setColorAt(i, new T.Color(i < 4 ? C.blue : C.green));
  const bwL = [ctx.label(K.V(cx + 1.6, 1.4, 1.2), '🚰 VRAM pipe: ~1,000+ GB/s', { cls: 't-green' }).show(false), ctx.label(K.V(1.6, 1.55, .3), '🐌 PCIe: ~32 GB/s', { cls: 't-red' }).show(false)];

  let mode = 0;
  function race() {
    flow.visible = false; bwL.forEach(l => l.show(false));
    ctx.play(async a => {
      ctx.info('🏁 The latency race!', 'Every level sends one piece of data to the thread at the same moment. Who arrives first?');
      cubes.forEach((c, i) => { c.visible = true; c.position.copy(racers[i].start); marks[i].show(false); });
      const t0 = ctx.time;
      await Promise.all(racers.map((r, i) => a.tween(r.time, e => pathPos(r, e, cubes[i].position), K.ease.inOut).then(() => {
        marks[i].set('✓ ' + r.name + ' ' + (ctx.time - t0).toFixed(2) + 's').show(true); cubes[i].visible = false; ctx.pulse(bot);
      })));
      ctx.info('🏆 Closer = faster!', 'Registers arrive instantly, VRAM takes a while, and CPU RAM across the bridge is <b>way</b> slower. GPUs hide these waits by switching to other warps — and programmers keep data close.');
    });
  }
  function bandwidth() {
    ctx.stop(); cubes.forEach(c => c.visible = false); marks.forEach(m => m.show(false));
    flow.visible = true; bwL.forEach(l => l.show(true));
    ctx.info('🚰 Bandwidth = how wide the pipe is', 'Green: VRAM → chip moves a <b>flood</b> of data every second. Blue: the PCIe bridge from CPU RAM is a trickle. That’s why we copy data to the GPU once and keep it there!');
  }
  ctx.modes(['🏁 Latency race', '🚰 Bandwidth flow'], i => { mode = i; i ? bandwidth() : race(); }, 0);
  ctx.button('▶ Go!', () => (mode ? bandwidth() : race()), 'primary');
  ctx.info('🎂 The memory cake', 'Top = closest to the thread: tiny but instant. Bottom = huge but far. Press <b>▶ Go!</b> to race.');
  ctx.home([1.6, 4.9, 8.4], [.9, 1.0, 0], 1.35);
  return {
    update(dt, t) {
      if (!flow.visible) return;
      fl.forEach((q, i) => {
        if (!q.wide) { q.p += dt * .12; if (q.p > 1) q.p -= 1; K.dummy.position.copy(bridgeCurve.getPoint(q.p)); }
        else {
          q.p += dt * .9; if (q.p > 1) { q.p -= 1; q.a = Math.random() * 6.28; }
          const r0 = 1.85, r1 = .4, rr = K.lerp(r0, r1, q.p);
          K.dummy.position.set(cx + Math.cos(q.a + q.p * 2) * rr, K.lerp(.55, topY + .2, q.p), Math.sin(q.a + q.p * 2) * rr);
        }
        K.dummy.scale.setScalar(1); K.dummy.rotation.set(t, t, 0); K.dummy.updateMatrix(); flow.setMatrixAt(i, K.dummy.matrix);
      });
      flow.instanceMatrix.needsUpdate = true;
    }
  };
});

/* ============ Chapter 10: matrix multiplication cube ============ */
GPU3D.register('matmul', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  const N = 8, s = .42, off = (N - 1) * s / 2, gap = .95, cs = .34;
  const A = [], B = [], Cm = [];
  for (let i = 0; i < N; i++) { A.push([]); B.push([]); for (let j = 0; j < N; j++) { A[i].push(Math.round(K.rand(-1, 1) * 10) / 10); B[i].push(Math.round(K.rand(-1, 1) * 10) / 10); } }
  let maxC = 0, maxP = 0;
  for (let i = 0; i < N; i++) { Cm.push([]); for (let j = 0; j < N; j++) { let v = 0; for (let k = 0; k < N; k++) { v += A[i][k] * B[k][j]; maxP = Math.max(maxP, Math.abs(A[i][k] * B[k][j])); } Cm[i].push(v); maxC = Math.max(maxC, Math.abs(v)); } }
  const white = new T.Color(0xf6f1e4), pink = new T.Color(C.pink), blue = new T.Color(C.blue), empty = new T.Color(0xd9d4c6), yel = new T.Color(C.yellow);
  const vcol = (v, m) => { const t = K.clamp(v / m, -1, 1); return white.clone().lerp(t > 0 ? pink : blue, Math.abs(t)); };
  const geo = K.rgeo(cs, cs, cs, .075, 2);
  const mA = K.instanced(geo, N * N, undefined, false, true), mB = K.instanced(geo, N * N, undefined, false, true), mC = K.instanced(geo, N * N, undefined, false, true);
  const mP = K.instanced(K.rgeo(cs * .55, cs * .55, cs * .55, .045, 1), N * N * N, 0xffffff, true);
  root.add(mA, mB, mC, mP);
  const pA = (i, k) => K.V(-off - gap, off - i * s, off - k * s);
  const pB = (k, j) => K.V(j * s - off, off + gap, off - k * s);
  const pC = (i, j) => K.V(j * s - off, off - i * s, off + gap);
  const pP = (i, j, k) => K.V(j * s - off, off - i * s, off - k * s);
  function put(m, idx, p, sc, col) { K.dummy.position.copy(p); K.dummy.rotation.set(0, 0, 0); K.dummy.scale.setScalar(sc); K.dummy.updateMatrix(); m.setMatrixAt(idx, K.dummy.matrix); if (col) m.setColorAt(idx, col); }
  const cDone = new Float32Array(N * N);
  function drawAB(hi) {
    for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
      const on = hi && hi.A(i, k);
      put(mA, i * N + k, pA(i, k), on ? 1.18 : 1, on ? vcol(A[i][k], 1).lerp(yel, .45) : vcol(A[i][k], 1));
      const onB = hi && hi.B(k, i);
      put(mB, k * N + i, pB(k, i), onB ? 1.18 : 1, onB ? vcol(B[k][i], 1).lerp(yel, .45) : vcol(B[k][i], 1));
    }
    mA.instanceMatrix.needsUpdate = mB.instanceMatrix.needsUpdate = true; mA.instanceColor.needsUpdate = mB.instanceColor.needsUpdate = true;
  }
  function drawC() {
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const f = cDone[i * N + j];
      put(mC, i * N + j, pC(i, j), f > 0 ? .7 + .3 * Math.min(1, f) : .55, f > 0 ? vcol(Cm[i][j] * Math.min(1, f), maxC) : empty);
    }
    mC.instanceMatrix.needsUpdate = mC.instanceColor.needsUpdate = true;
  }
  const _p = new T.Vector3();
  function drawP(list, e) { // list of [i,j,k]; e: 0..1 appear, 1..2 collapse
    for (let n = 0; n < N * N * N; n++) put(mP, n, pP(0, 0, 0), 0);
    list.forEach(([i, j, k]) => {
      const n = (i * N + j) * N + k, a = pP(i, j, k);
      if (e <= 1) put(mP, n, a, e, vcol(A[i][k] * B[k][j], maxP));
      else { _p.lerpVectors(a, pC(i, j), e - 1); put(mP, n, _p, 1 - (e - 1) * .7, vcol(A[i][k] * B[k][j], maxP)); }
    });
    mP.instanceMatrix.needsUpdate = mP.instanceColor.needsUpdate = true;
  }
  function resetAll() { ctx.stop(); cDone.fill(0); drawAB(null); drawC(); drawP([], 0); }
  resetAll();
  ctx.pick(mA, '🅰️ Matrix A — the inputs', 'Each row is one input — like the numbers describing one word or one picture. Pink = positive, blue = negative.');
  ctx.pick(mB, '🅱️ Matrix B — the weights (knobs)', 'The AI’s learned knobs. Training slowly adjusts every one of them.');
  ctx.pick(mC, '©️ Matrix C = A × B — the answers', 'Each answer = one row of A “dot” one column of B: multiply pairs, then add them all up.');
  ctx.label(K.V(-off - gap, off + .5, off + .3), '🅰️ inputs', { cls: 'big t-pink' });
  ctx.label(K.V(off + .5, off + gap + .3, -off), '🅱️ weights (knobs)', { cls: 'big t-blue' });
  ctx.label(K.V(off + .35, -off - .5, off + gap), '©️ answers = A × B', { cls: 'big t-yellow' });
  const status = ctx.status('');

  const kArr = [...Array(N).keys()];
  function oneByOne() {
    resetAll();
    ctx.play(async a => {
      ctx.info('🐢 One answer at a time', 'Like one CPU core: pick ONE answer cell, multiply its row of A with its column of B (8 little product cubes), add them up, slide the sum into C. Then the next… 64 times!');
      for (let c = 0; c < N * N; c++) {
        const i = Math.floor(c / N), j = c % N, slow = c < 3;
        drawAB({ A: (ii) => ii === i, B: (k, jj) => jj === j });
        const list = kArr.map(k => [i, j, k]);
        const dur = slow ? .5 : .05;
        await a.tween(dur, e => drawP(list, e));
        await a.tween(dur, e => drawP(list, 1 + e));
        cDone[c] = 1; drawC();
        status.innerHTML = 'C[' + i + '][' + j + '] = ' + kArr.map(k => A[i][k] + '·' + B[k][j]).slice(0, 3).join(' + ') + ' + … = <b>' + Cm[i][j].toFixed(2) + '</b>';
        if (slow) await a.wait(.4);
      }
      drawP([], 0); drawAB(null);
      ctx.info('🐢 Done… finally!', '64 answers, one after another. Now try <b>⚡ All at once</b>!');
    });
  }
  function allAtOnce() {
    resetAll();
    ctx.play(async a => {
      ctx.info('⚡ All at once (GPU threads)', 'The GPU gives <b>every answer cell its own thread</b>. All 512 multiplications happen together, then all 64 sums slide into C at once!');
      const list = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) list.push([i, j, k]);
      drawAB({ A: () => true, B: () => true });
      status.innerHTML = '512 multiplies + 64 sums, in parallel';
      await a.tween(.9, e => drawP(list, e));
      await a.wait(.4);
      await a.tween(1.0, e => drawP(list, 1 + e));
      cDone.fill(1); drawC(); drawP([], 0); drawAB(null);
      ctx.info('⚡ Done in one go!', 'That’s why GPUs are amazing for AI: a big model does this with matrices of thousands × thousands — billions of multiplications per answer.');
    });
  }
  function tiles() {
    resetAll();
    ctx.play(async a => {
      ctx.info('🧩 Tensor-core tiles', 'Tensor cores chew a <b>4×4 tile</b> at a time: a 4×4 block of A times a 4×4 block of B, added into a 4×4 tile of C — 64 multiply-adds in one go. Two tensor cores work side by side here.');
      for (let round = 0; round < 2; round++) for (let kc = 0; kc < 2; kc++) {
        const tilesNow = [[round, 0], [round, 1]];
        drawAB({ A: (i, k) => Math.floor(i / 4) === round && Math.floor(k / 4) === kc, B: (k, j) => Math.floor(k / 4) === kc });
        const list = [];
        tilesNow.forEach(([TI, TJ]) => { for (let i = TI * 4; i < TI * 4 + 4; i++) for (let j = TJ * 4; j < TJ * 4 + 4; j++) for (let k = kc * 4; k < kc * 4 + 4; k++) list.push([i, j, k]); });
        status.innerHTML = 'tile row ' + round + ', k-chunk ' + kc + ': 2 tiles × 64 multiply-adds';
        await a.tween(.55, e => drawP(list, e));
        await a.tween(.6, e => drawP(list, 1 + e));
        tilesNow.forEach(([TI, TJ]) => { for (let i = TI * 4; i < TI * 4 + 4; i++) for (let j = TJ * 4; j < TJ * 4 + 4; j++) cDone[i * N + j] = kc ? 1 : .5; });
        drawC(); await a.wait(.35);
      }
      drawP([], 0); drawAB(null);
      ctx.info('🧩 Tiles done!', 'Each tile needed 2 passes (k-chunks) and its colors got stronger as the sums added up. Real tensor cores do this every few clock cycles — in FP16, BF16, FP8 or even FP4.');
    });
  }
  ctx.modes(['🐢 One at a time', '⚡ All at once', '🧩 Tensor-core tiles'], i => [oneByOne, allAtOnce, tiles][i](), -1);
  ctx.button('↺', resetAll);
  ctx.info('🧊 The matrix cube', '<b>A</b> on the left, <b>B</b> on top, answers <b>C</b> in front. Each little cube inside = one multiplication. Pick a mode!');
  ctx.home([6.0, 4.5, 8.4], [0, -.1, .2], 1.25);
  ctx.autoRotate(.25);
  return {};
});

/* ============ Chapter 11: NVIDIA vs Apple Silicon ============ */
GPU3D.register('compare', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  // ---- left: discrete PC (everything in L-local coordinates) ----
  const L = new T.Group(); root.add(L);
  L.add(K.shadow(4.2, 3.6));
  L.add(K.box(3.6, .08, 3.2, C.teal, { pos: [0, .04, 0] }));
  const lcpu = K.group(K.box(.62, .08, .62, C.blue, { pos: [0, .12, 0] }), K.box(.42, .06, .42, C.silver, { pos: [0, .19, 0] }));
  const cool = K.fan(.2, C.white, 7, { frame: true, frameColor: C.dark, capColor: C.blue }); cool.rotation.x = -Math.PI / 2; cool.position.y = .3; lcpu.add(cool);
  lcpu.position.set(-.95, 0, -.85); L.add(lcpu);
  ctx.pick(lcpu, '🧠 CPU', 'On a PC the CPU is its own chip, with its own RAM next to it.');
  const lram = K.group(K.box(1.1, .32, .07, C.yellow, { pos: [0, .24, -.1] }), K.box(1.1, .32, .07, C.yellow, { pos: [0, .24, .1] })); lram.position.set(.55, 0, -.85); L.add(lram);
  ctx.pick(lram, '📝 System RAM', 'The CPU’s memory (DDR). The GPU can’t use it quickly — data must be copied across PCIe first.');
  L.add(K.box(1.8, .25, .12, C.black, { pos: [0, .2, .2] }));
  const card = new T.Group(); card.position.set(0, .62, .85); L.add(card);
  card.add(K.box(2.8, .06, 1.1, C.pcb));
  [-1.42, 1.42].forEach(x => card.add(K.box(.06, .14, 1.1, C.pink, { pos: [x, .03, 0] })));
  [-.57, .57].forEach(z => card.add(K.box(2.9, .14, .06, C.pink, { pos: [0, .03, z] })));
  const ldie = K.box(.5, .07, .5, C.silver, { pos: [0, .065, 0], unique: true }); ldie.material.emissive = new T.Color(0); card.add(ldie);
  const vr = K.group(); [[-.62, -.25], [-.62, .25], [.62, -.25], [.62, .25], [-1.05, 0], [1.05, 0]].forEach(p => vr.add(K.box(.26, .05, .2, C.black, { pos: [p[0], .06, p[1]] }))); card.add(vr);
  ctx.pick(card, '🎨 NVIDIA graphics card', 'A separate card with its own GPU chip and its own <b>VRAM</b> (the black chips). Super fast memory — but only for the GPU.');
  const pcie = K.tube([[.55, .45, -.85], [.5, 1.2, -.1], [-.2, 1.0, .65], [-.5, .72, .85]], .04, C.gray);
  L.add(pcie);
  ctx.pick(pcie, '🛣️ PCIe bridge', 'The road between system RAM and the card’s VRAM. About 32–64 GB/s — much slower than VRAM itself (~1,000+ GB/s).');
  // ---- right: Apple SoC (R-local) ----
  const R = new T.Group(); root.add(R);
  R.add(K.shadow(3.6, 3.6));
  R.add(K.box(3.0, .1, 3.0, 0x2c6a48, { pos: [0, .05, 0] }));
  R.add(K.box(1.75, .1, 1.75, C.dark, { pos: [0, .15, 0] }));
  const blk = (w, d, c, x, z, t, txt) => { const m = K.box(w, .08, d, c, { pos: [x, .24, z], unique: true }); m.material.emissive = new T.Color(0); R.add(m); ctx.pick(m, t, txt); return m; };
  const rcpu = blk(.72, .34, C.blue, -.42, -.55, '🧠 CPU cores', 'Performance + efficiency CPU cores, on the same chip as the GPU.');
  blk(.72, .24, C.cyan, -.42, -.2, '🧠 Efficiency cores', 'Low-power CPU cores for light tasks.');
  const rgpu = blk(.72, .72, C.pink, .42, -.37, '🎨 Apple GPU', 'Built into the chip. It reads the same unified memory as the CPU — no copying!');
  blk(.72, .36, C.purple, -.42, .35, '🧠 Neural Engine', 'A special unit for AI math, like a cousin of NVIDIA’s Tensor cores.');
  blk(.34, .34, C.green, .25, .4, '🎬 Media engines', 'Encode/decode video super efficiently.');
  blk(.34, .34, C.yellow, .62, .4, '🗄️ System cache', 'A shared cache all units can use.');
  const umem = K.group(); [[-1.17, -.48], [-1.17, .48], [1.17, -.48], [1.17, .48]].forEach(p => umem.add(K.box(.42, .12, .8, C.black, { pos: [p[0], .16, p[1]] }))); R.add(umem);
  ctx.pick(umem, '🤝 Unified memory', 'Memory chips right on the chip package, shared by CPU, GPU and Neural Engine. Everyone reads the same data — up to 128 GB on M4 Max.');
  // labels
  ctx.label(L, '🟩 PC + NVIDIA card', { off: [0, 1.75, -1.4], cls: 'big t-green' });
  ctx.label(R, '🍎 Apple M-series chip', { off: [0, 1.2, -1.4], cls: 'big t-pink' });
  ctx.label(lcpu, 'CPU', { off: [0, .4, 0], cls: 't-blue' }); ctx.label(lram, 'RAM', { off: [0, .55, 0], cls: 't-yellow' });
  ctx.label(card, 'GPU + own VRAM', { off: [0, .3, .7], cls: 't-pink' });
  ctx.label(L, '🛣️ PCIe', { off: [-.1, 1.25, -.2], cls: 't-red' });
  ctx.label(rgpu, 'GPU', { off: [0, .25, 0], cls: 't-pink' }); ctx.label(rcpu, 'CPU', { off: [0, .25, 0], cls: 't-blue' });
  ctx.label(umem, '🤝 unified memory', { off: [1.17, .4, 1.0] });
  const note = [ctx.label(L, '', { off: [0, 2.3, .4], cls: 'hot' }).show(false), ctx.label(R, '', { off: [0, 1.8, .4], cls: 'hot' }).show(false)];

  const dataL = K.box(.18, .18, .18, C.yellow), dataR = K.box(.18, .18, .18, C.yellow);
  dataL.visible = dataR.visible = false; L.add(dataL); R.add(dataR);
  const beams = [0, 1].map(() => { const m = new T.Mesh(new T.CylinderGeometry(.03, .03, 1, 8), K.glow(C.yellow)); m.visible = false; R.add(m); return m; });
  function beam(m, a, b) { m.position.copy(a).add(b).multiplyScalar(.5); m.scale.set(1, a.distanceTo(b), 1); m.quaternion.setFromUnitVectors(K.V(0, 1, 0), b.clone().sub(a).normalize()); m.visible = true; }
  // power bars + memory stacks (one per side)
  const barL = K.cyl(.35, .35, 1, C.red, { unique: true }), barR = K.cyl(.35, .35, 1, C.green, { unique: true });
  barL.position.set(2.15, 0, .9); barR.position.set(-1.95, 0, .9); L.add(barL); R.add(barR);
  barL.visible = barR.visible = false;
  const barLL = ctx.label(barL, '', { off: [0, .6, 0], cls: 't-red' }).show(false), barRL = ctx.label(barR, '', { off: [0, .6, 0], cls: 't-green' }).show(false);
  function setBar(m, h) { m.scale.y = Math.max(.01, h); m.position.y = h / 2; }
  const stackL = [], stackR = [];
  for (let i = 0; i < 16; i++) {
    const a = K.box(.5, .2, .5, C.green); a.visible = false; L.add(a); stackL.push(a);
    const b = K.box(.5, .2, .5, C.pink); b.visible = false; R.add(b); stackR.push(b);
  }
  function clearAll() {
    ctx.stop(); dataL.visible = dataR.visible = false; beams.forEach(b => b.visible = false);
    barL.visible = barR.visible = false; barLL.show(false); barRL.show(false); note.forEach(n => n.show(false));
    stackL.concat(stackR).forEach(m => m.visible = false);
    ldie.material.emissive.setHex(0); rgpu.material.emissive.setHex(0);
  }
  const P = {
    ram: K.V(.55, .55, -.85), mid1: K.V(.5, 1.3, -.1), mid2: K.V(-.2, 1.1, .65), vram: K.V(-.6, .8, .85),
    umem: K.V(-1.17, .4, -.48), cpu: K.V(-.42, .35, -.55), gpu: K.V(.42, .35, -.37)
  };
  function moving() {
    clearAll();
    ctx.info('🚚 Moving data', 'Left: data must be <b>copied</b> from RAM over the PCIe bridge into VRAM before the GPU can use it, then results copied back. Right: CPU and GPU simply look at the <b>same</b> memory.');
    note[0].set('🚚 copying over PCIe…').show(true); note[1].set('🤝 zero copy!').show(true);
    ctx.play(async a => {
      const curve = new T.CatmullRomCurve3([P.ram, P.mid1, P.mid2, P.vram]);
      for (let loop = 0; loop < 4; loop++) {
        dataL.visible = true; dataR.visible = true; dataR.position.copy(P.umem);
        beams.forEach(b => b.visible = false);
        const left = (async () => {
          note[0].set('🚚 copying to VRAM…');
          await a.tween(2.2, e => dataL.position.copy(curve.getPoint(e)));
          note[0].set('🎨 GPU working'); ldie.material.emissive.setHex(0x663300); await a.wait(.7); ldie.material.emissive.setHex(0);
          note[0].set('🚚 copying results back…');
          await a.tween(2.2, e => dataL.position.copy(curve.getPoint(1 - e)));
        })();
        const right = (async () => {
          await a.wait(.3);
          beam(beams[0], P.cpu, P.umem); await a.wait(.4);
          beam(beams[1], P.gpu, P.umem); rgpu.material.emissive.setHex(0x661133); await a.wait(.7); rgpu.material.emissive.setHex(0);
          note[1].set('✅ done — nothing copied!');
          await a.wait(2.0); note[1].set('🤝 zero copy!');
        })();
        await Promise.all([left, right]);
      }
      clearAll();
    });
  }
  function power() {
    clearAll(); barL.visible = barR.visible = true;
    ctx.info('⚡ Power use', 'A top desktop graphics card can use <b>450–575 watts</b> by itself (it needs big fans!). A whole Apple laptop chip — CPU, GPU and all — typically uses a small fraction of that. Different goals: maximum speed vs. maximum battery life.');
    barLL.set('🔥 top card: 450–575 W').show(true); barRL.set('🔋 laptop chip: a fraction').show(true);
    ctx.play(async a => { await a.tween(1.4, e => { setBar(barL, e * 3.0); setBar(barR, e * .55); }, K.ease.back); });
  }
  function memSize() {
    clearAll();
    ctx.info('🧠 Memory size', 'Each block = 8 GB. A gaming card has its own 8–32 GB of VRAM (here: 24 GB). An M4 Max can have up to 128 GB of unified memory — handy for running really big AI models. (Data-center NVIDIA GPUs use 80–192 GB of HBM and link many GPUs together.)');
    note[0].set('🟩 gaming card VRAM: 24 GB').show(true); note[1].set('🍎 M4 Max: up to 128 GB').show(true);
    ctx.play(async a => {
      for (let i = 0; i < 16; i++) {
        if (i < 3) { const m = stackL[i]; m.position.set(2.15, .1 + i * .22, .9); m.visible = true; ctx.pulse(m); }
        const m = stackR[i]; m.position.set(-1.95 - (i % 2) * .55, .1 + Math.floor(i / 2) * .22, .9); m.visible = true;
        await a.wait(.12);
      }
    });
  }
  ctx.modes(['🚚 Moving data', '⚡ Power', '🧠 Memory size'], i => [moving, power, memSize][i](), -1);
  ctx.info('⚖️ Two designs, side by side', 'A PC with a separate NVIDIA card (own VRAM) and an Apple M-series chip with everything on one package. Pick a comparison!');
  // responsive layout: side by side when wide, front/back when narrow (phones)
  let narrow = null;
  function layout(w, h) {
    const n = w / h < 1.15;
    if (n === narrow) return;
    narrow = n;
    L.position.set(n ? 0 : -3.1, 0, n ? -2.1 : 0);
    R.position.set(n ? 0 : 3.1, 0, n ? 2.3 : 0);
    if (n) ctx.home([0, 8.2, 8.0], [0, .3, .1], .9); else ctx.home([0, 6.4, 9.4], [0, .45, .25], 1.45);
  }
  layout(ctx.stage.clientWidth || 4, ctx.stage.clientHeight || 3);
  return { onResize: layout };
});
/* ============ Chapter 12: one warp of 32 robots ============ */
GPU3D.register('warp', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.at(K.shadow(7, 3.4), 0, 0, .6));
  const NL = 32;
  const lanePos = i => K.V(((i % 16) - 7.5) * .36, 0, .95 + Math.floor(i / 16) * .55);
  const body = K.instanced(new T.CapsuleGeometry(.1, .1, 4, 14), NL, 0xffffff, false, true);
  const head = K.instanced(new T.SphereGeometry(.105, 16, 12), NL, 0xffffff, false, true);
  const eyes = K.instanced(new T.SphereGeometry(.024, 8, 6), NL * 2, 0x24243a, true);
  const stick = K.instanced(new T.CylinderGeometry(.009, .009, .1, 6), NL, 0x5b6178, true);
  const bulb = K.instanced(new T.SphereGeometry(.032, 10, 8), NL, 0xffffff, false, true);
  root.add(body, head, eyes, stick, bulb);
  const setI = (m, i, x, y, z) => { K.dummy.position.set(x, y, z); K.dummy.updateMatrix(); m.setMatrixAt(i, K.dummy.matrix); };
  const base = [], cIdle = new T.Color(0xf1eee6), cA = new T.Color(C.green), cB = new T.Color(C.orange), cWait = new T.Color(0x8a8fa6), cGo = new T.Color(C.cyan);
  for (let i = 0; i < NL; i++) base.push(new T.Color().setHSL(i / NL * .85, .75, .6));
  const hop = new Float32Array(NL), cols = base.map(c => c.clone());
  function drawBots() {
    K.dummy.rotation.set(0, 0, 0); K.dummy.scale.setScalar(1);
    for (let i = 0; i < NL; i++) {
      const p = lanePos(i), y = hop[i];
      setI(body, i, p.x, .15 + y, p.z); body.setColorAt(i, cols[i]);
      setI(head, i, p.x, .4 + y, p.z); head.setColorAt(i, cIdle);
      setI(eyes, i * 2, p.x - .04, .41 + y, p.z + .092); setI(eyes, i * 2 + 1, p.x + .04, .41 + y, p.z + .092);
      setI(stick, i, p.x, .555 + y, p.z);
      setI(bulb, i, p.x, .615 + y, p.z); bulb.setColorAt(i, cols[i]);
    }
    [body, head, eyes, stick, bulb].forEach(m => { m.instanceMatrix.needsUpdate = true; });
    body.instanceColor.needsUpdate = head.instanceColor.needsUpdate = bulb.instanceColor.needsUpdate = true;
  }
  drawBots();
  ctx.pick(body, '🤖 One warp = 32 threads', 'These 32 robots share ONE instruction at a time. They’re fastest when they all do the same thing and read neighboring memory.');
  // memory wall: 8 rows (segments) x 32 slots
  const RW = 8, SW = 32;
  const slotPos = (r, c) => K.V((c - 15.5) * .18, .25 + r * .2, -1.5);
  const slots = K.instanced(new T.BoxGeometry(.15, .15, .08), RW * SW, 0xf1ead6); root.add(slots);
  const sBase = new T.Color(0xf1ead6), sAlt = new T.Color(0xe2d9c2), sHot = new T.Color(C.yellow);
  function drawSlots(hotRows, hotSlots) {
    for (let r = 0; r < RW; r++) for (let c = 0; c < SW; c++) {
      K.dummy.position.copy(slotPos(r, c)); K.dummy.scale.setScalar(1); K.dummy.rotation.set(0, 0, 0); K.dummy.updateMatrix();
      slots.setMatrixAt(r * SW + c, K.dummy.matrix);
      const hot = (hotRows && hotRows.has(r)) || (hotSlots && hotSlots.has(r * SW + c));
      slots.setColorAt(r * SW + c, hot ? sHot : (r % 2 ? sAlt : sBase));
    }
    slots.instanceMatrix.needsUpdate = slots.instanceColor.needsUpdate = true;
  }
  drawSlots();
  root.add(K.box(6.0, 1.75, .06, C.dark, { pos: [0, .95, -1.58] }));
  ctx.pick(slots, '🧱 Memory', 'Each row is one memory <b>segment</b> (think: one 128-byte chunk). Fetching a whole segment costs about the same as fetching one number from it!');
  const pk = K.instanced(new T.BoxGeometry(.08, .08, .08), NL, C.yellow, true); pk.visible = false; root.add(pk);
  const truck = K.group(K.box(1.2, .32, .45, C.yellow, { pos: [0, .2, 0] }), K.box(.35, .25, .4, C.red, { pos: [.75, .17, 0] }));
  [[-.4, .24], [.4, .24], [-.4, -.24], [.4, -.24], [.8, .24], [.8, -.24]].forEach(p => truck.add(K.cyl(.08, .08, .06, C.black, { pos: [p[0], .04, p[1]], rot: [Math.PI / 2, 0, 0] })));
  truck.visible = false; root.add(truck);
  ctx.label(K.V(-1.2, 2.0, -1.5), '🧱 memory (row = one segment)', { cls: 't-yellow' });
  ctx.label(K.V(0, -.05, 2.15), '🤖 1 warp = 32 threads', { cls: 'big t-cyan' });
  const counter = ctx.label(K.V(1.9, 2.0, -1.5), '🚚 trips: 0', { cls: 'big' });
  const zz = ctx.label(K.V(0, 1.0, 1.2), '', { cls: 'hot' }).show(false);

  function resetBots() { for (let i = 0; i < NL; i++) { hop[i] = 0; cols[i].copy(base[i]); } drawBots(); pk.visible = false; truck.visible = false; zz.show(false); drawSlots(); }
  function setPk(i, p, sc) { K.dummy.position.copy(p); K.dummy.scale.setScalar(sc); K.dummy.rotation.set(0, 0, 0); K.dummy.updateMatrix(); pk.setMatrixAt(i, K.dummy.matrix); }
  function hidePk() { for (let i = 0; i < NL; i++) setPk(i, K.V(0, -5, 0), 0); pk.instanceMatrix.needsUpdate = true; }

  function coalesced() {
    resetBots();
    ctx.play(async a => {
      ctx.info('✅ Coalesced reads', 'Thread 0 reads slot 0, thread 1 reads slot 1, … all 32 are <b>neighbors</b> in one segment. The memory system grabs the whole row in <b>ONE trip</b>.');
      counter.set('🚚 trips: 0');
      const row = 3; drawSlots(new Set([row]));
      await a.wait(.5);
      truck.visible = true; const t0 = K.V(0, 0, -1.2), t1 = K.V(0, 0, .25);
      await a.tween(.9, e => truck.position.lerpVectors(t0, t1, e));
      counter.set('🚚 trips: 1');
      pk.visible = true; hidePk();
      await a.tween(.6, e => { for (let i = 0; i < NL; i++) { const p = K.V(0, .45, .25).lerp(lanePos(i).add(K.V(0, .55, 0)), e); setPk(i, p, 1); } pk.instanceMatrix.needsUpdate = true; });
      for (let i = 0; i < NL; i++) { cols[i].copy(cGo); hop[i] = .15; } drawBots();
      await a.wait(.4); for (let i = 0; i < NL; i++) hop[i] = 0; drawBots(); truck.visible = false; pk.visible = false;
      ctx.info('✅ 1 trip for 32 numbers!', 'Best practice: lay out data so neighboring threads read neighboring addresses (e.g., <code>a[threadIdx.x]</code>).');
    });
  }
  function scattered() {
    resetBots();
    ctx.play(async a => {
      ctx.info('❌ Scattered reads', 'Each thread wants a random, far-away slot. Now the memory system needs a <b>separate trip for each one</b> — up to 32 trips instead of 1!');
      const picks = Array.from({ length: NL }, () => [Math.floor(Math.random() * RW), Math.floor(Math.random() * SW)]);
      drawSlots(null, new Set(picks.map(p => p[0] * SW + p[1])));
      pk.visible = true; hidePk();
      for (let i = 0; i < NL; i++) {
        counter.set('🚚 trips: ' + (i + 1));
        const s0 = slotPos(picks[i][0], picks[i][1]).add(K.V(0, 0, .1)), s1 = lanePos(i).add(K.V(0, .55, 0));
        await a.tween(i < 4 ? .45 : .11, e => { const p = s0.clone().lerp(s1, e); p.y += Math.sin(e * Math.PI) * .4; setPk(i, p, 1); pk.instanceMatrix.needsUpdate = true; });
        cols[i].copy(cGo); hop[i] = .1; drawBots();
      }
      await a.wait(.4); for (let i = 0; i < NL; i++) hop[i] = 0; drawBots(); pk.visible = false;
      ctx.info('❌ 32 trips for 32 numbers', 'Same data, many times slower. Fixes: reorganize the data (structure-of-arrays), sort the work, or load into shared memory first.');
    });
  }
  function divergent(split) {
    resetBots();
    ctx.play(async a => {
      counter.set('🔁 passes: 0');
      if (split) ctx.info('🔀 Divergent if / else', '<code>if (x &lt; 0) A(); else B();</code> — even lanes go to A, odd lanes to B. The warp can only run ONE path at a time…');
      else ctx.info('✅ Everyone takes the same path', 'All 32 lanes say “A!” — so the warp runs path A once and it’s done.');
      await a.wait(.6);
      const passes = split ? [i => i % 2 === 0, i => i % 2 === 1] : [() => true];
      for (let p = 0; p < passes.length; p++) {
        counter.set('🔁 passes: ' + (p + 1));
        const on = passes[p];
        if (split) zz.set(p === 0 ? '😴 odd lanes wait…' : '😴 even lanes wait…').show(true);
        for (let i = 0; i < NL; i++) cols[i].copy(on(i) ? (p ? cB : cA) : cWait);
        await a.tween(1.1, (e, q) => { for (let i = 0; i < NL; i++) hop[i] = on(i) ? Math.abs(Math.sin(q * Math.PI * 3)) * .22 : 0; drawBots(); }, K.ease.lin);
      }
      zz.show(false);
      for (let i = 0; i < NL; i++) { cols[i].copy(base[i]); hop[i] = 0; } drawBots();
      if (split) ctx.info('🔀 2 passes = double time', 'Each half waited while the other worked. Tip: arrange work so threads in the same warp make the same choice, or replace branches with math.');
      else ctx.info('✅ 1 pass', 'No waiting. Same work, half the time of the divergent version!');
    });
  }
  ctx.modes(['✅ Coalesced', '❌ Scattered', '🔀 Divergent', '✅ Same path'], i => [coalesced, scattered, () => divergent(true), () => divergent(false)][i](), -1);
  ctx.info('🤖 Meet the warp', '32 robots = 32 threads in one warp. Try the good ✅ and bad ❌ ways to read memory and to branch!');
  ctx.home([0, 3.9, 7.2], [0, .6, 0], 1.45);
  return {};
});

/* ============ Chapter 13: trophy ============ */
GPU3D.register('trophy', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.shadow(3.2, 3.2));
  const prof = [[0, 0], [.75, 0], [.75, .14], [.32, .22], [.18, .6], [.26, .8], [.6, .95], [.85, 1.55], [.9, 1.72], [.8, 1.72], [.72, 1.56], [.5, 1.08], [0, 1.0]].map(p => new T.Vector2(p[0], p[1]));
  const cup = K.mesh(new T.LatheGeometry(prof, 40), C.gold, { th: 35 }); cup.position.y = .4; root.add(cup);
  [-1, 1].forEach(s => { const h = K.torus(.3, .06, C.gold, { arc: Math.PI, hull: 1.1 }); h.position.set(s * .82, 1.68, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; root.add(h); });
  root.add(K.box(1.5, .4, 1.5, C.dark, { pos: [0, .2, 0] }));
  root.add(K.box(.9, .2, .04, C.gold, { pos: [0, .2, .76] }));
  const face = K.group(K.box(.46, .46, .08, C.pink), K.sphere(.06, C.white, { pos: [-.1, .04, .05] }), K.sphere(.06, C.white, { pos: [.1, .04, .05] }), K.sphere(.025, 0, { mat: K.glow(0x24243a), pos: [-.09, .04, .1] }), K.sphere(.025, 0, { mat: K.glow(0x24243a), pos: [.11, .04, .1] }), K.box(.14, .03, .03, C.dark, { pos: [0, -.1, .05] }));
  face.position.set(0, 1.62, .74); face.rotation.x = -.38; root.add(face);
  const sh = new T.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? .14 : .32, a = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  const star = K.mesh(new T.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: false }), C.yellow, { th: 20 }); star.position.set(0, 2.55, 0); root.add(star);
  ctx.pick(cup, '🏆 The GPU Wizard trophy', 'Finish the quiz below to fill the sky with confetti!');
  ctx.pick(face, '😊 Chippy', 'That’s me! Thanks for learning about GPUs with me!');
  const scoreL = ctx.label(K.V(0, 3.05, 0), '🏆 take the quiz below!', { cls: 'big t-yellow' });
  const NC = 160;
  const conf = K.instanced(new T.PlaneGeometry(.09, .05), NC, 0xffffff, true); conf.material.side = T.DoubleSide; conf.visible = false; root.add(conf);
  const cc = [C.pink, C.cyan, C.yellow, C.green, C.purple, C.orange, C.red, C.blue];
  const cf = Array.from({ length: NC }, (_, i) => ({ x: K.rand(-2.2, 2.2), y: K.rand(2, 5), z: K.rand(-2.2, 2.2), v: K.rand(.6, 1.4), r: Math.random() * 6, s: K.rand(2, 6) }));
  for (let i = 0; i < NC; i++) conf.setColorAt(i, new T.Color(cc[i % cc.length]));
  let party = 0;
  function celebrate() { party = 9; conf.visible = true; cf.forEach(q => { q.y = K.rand(2.5, 5.5); }); }
  ctx.button('🎉 Celebrate!', celebrate, 'primary');
  ctx.info('🏆 Your trophy', 'Answer the quiz questions below. Get 7 or more right for a confetti party!');
  ctx.home([0, 2.4, 6.2], [0, 1.3, 0], 1.2);
  ctx.autoRotate(.9);
  return {
    onMessage(msg, d) {
      if (msg !== 'score') return;
      scoreL.set('🏆 ' + d.score + ' / ' + d.total);
      if (d.done) { if (d.score >= 7) { celebrate(); ctx.info('🎉 GPU Wizard!', 'You scored ' + d.score + ' / ' + d.total + '. You now know more about GPUs than most people on Earth!'); } else ctx.info('👍 Nice try!', 'You scored ' + d.score + ' / ' + d.total + '. Peek back at the chapters and try again — every expert started as a beginner!'); }
    },
    update(dt, t) {
      star.rotation.y += dt * 1.5; star.position.y = 2.55 + Math.sin(t * 2) * .08;
      if (party > 0) {
        party -= dt;
        cf.forEach((q, i) => {
          q.y -= dt * q.v; q.r += dt * q.s; if (q.y < 0) q.y = party > 2 ? K.rand(3.5, 5.5) : -9;
          K.dummy.position.set(q.x + Math.sin(q.r) * .2, q.y, q.z); K.dummy.rotation.set(q.r, q.r * .7, 0); K.dummy.scale.setScalar(1); K.dummy.updateMatrix();
          conf.setMatrixAt(i, K.dummy.matrix);
        });
        conf.instanceMatrix.needsUpdate = true;
        if (party <= 0) conf.visible = false;
      }
    }
  };
});
