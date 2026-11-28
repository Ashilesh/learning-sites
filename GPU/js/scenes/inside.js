/* Part 2 scenes: card, chip, pipeline */

/* ============ Chapter 5: exploded graphics card ============ */
GPU3D.register('card', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.at(K.shadow(6, 3.2), 0, -1.4, 0));
  const parts = {};
  const info = {
    die: ['🔲 GPU chip (the die)', 'The actual GPU: a slab of silicon smaller than a cookie with tens of billions of transistors. All the cores, caches and special units live here.'],
    vram: ['🟫 VRAM chips', 'The GPU’s own super-fast memory (GDDR6 / GDDR7). Holds textures, 3D models and AI weights. Gaming cards have about 8–32 GB.'],
    vrm: ['⚡ VRM (power stages)', 'Voltage regulators turn 12 V from the power supply into about 1 V for the chip — at hundreds of amps — very smoothly.'],
    pcb: ['🟩 Circuit board (PCB)', 'Many thin layers of copper roads connecting the chip, memory and power parts.'],
    pcie: ['🟨 PCIe gold fingers', 'They plug into the motherboard: the highway to the CPU and RAM (about 32–64 GB/s).'],
    ports: ['🔌 Display ports', 'HDMI and DisplayPort: where finished frames leave for your monitor.'],
    power: ['🔋 Power connector', 'Extra power straight from the PSU — big cards can pull 300–600 W.'],
    heatsink: ['🧊 Heatsink fins', 'Dozens of thin metal fins give the heat lots of surface to escape into the air.'],
    pipes: ['🟠 Heat pipes & copper base', 'Copper touches the chip; sealed pipes with a little liquid inside carry heat super fast to the fins.'],
    fans: ['🌀 Fans', 'Push air through the fins. They spin faster when the GPU works hard (many stop completely when it’s idle).'],
    backplate: ['🛡️ Backplate', 'A metal plate that stiffens the board and helps cool the back side.']
  };
  function reg(key, obj) { parts[key] = obj; ctx.pick(obj, info[key][0], info[key][1]); obj.userData.key = key; return obj; }

  // backplate
  const back = reg('backplate', K.group(K.box(4.3, .05, 1.65, C.dark, { r: .02 }), K.mesh(new T.BoxGeometry(1.4, .01, .1), 0, { mat: K.glow(C.pink), pos: [.6, -.03, .5], edges: false })));
  root.add(back);
  // board group
  const board = new T.Group(); root.add(board);
  board.add(reg('pcb', K.group(K.box(4.1, .06, 1.55, C.pcb))));
  board.add(reg('pcie', K.group(K.box(1.7, .06, .17, C.gold, { pos: [-.4, 0, .86] }))));
  const ports = K.group(K.box(.04, .9, 1.6, C.silver, { pos: [0, .42, 0] }));
  [-.45, 0, .45].forEach(z => ports.add(K.box(.16, .14, .3, C.black, { pos: [0, .3, z] })));
  ports.add(K.box(.16, .14, .22, C.black, { pos: [0, .58, 0] }));
  ports.position.set(-2.08, 0, 0); board.add(reg('ports', ports));
  const sub = K.box(.86, .05, .86, 0x2c6a48, { pos: [.1, .055, 0] }); board.add(sub);
  const dieMesh = K.box(.52, .05, .52, C.silver, { pos: [.1, .1, 0], unique: true }); dieMesh.material.emissive = new T.Color(0);
  board.add(reg('die', K.group(dieMesh)));
  const vram = K.group();
  [[-.58, .3], [-.58, -.3], [.78, .3], [.78, -.3], [-.13, .62], [.33, .62], [-.13, -.62], [.33, -.62]].forEach(p => vram.add(K.box(.24, .045, .18, C.black, { pos: [p[0], .055, p[1]] })));
  board.add(reg('vram', vram));
  const vrm = K.group();
  for (let i = 0; i < 6; i++) [-.17, .17].forEach(z => vrm.add(K.box(.13, .13, .13, C.slate, { pos: [1.15 + i * .15, .095, z] })));
  for (let i = 0; i < 6; i++) [-.4, .4].forEach(z => vrm.add(K.box(.08, .03, .08, C.black, { pos: [1.15 + i * .15, .045, z] })));
  board.add(reg('vrm', vrm));
  const pwr = K.group(K.box(.34, .16, .15, C.black, { pos: [1.7, .11, -.66] }));
  for (let i = 0; i < 4; i++) pwr.add(K.box(.04, .03, .04, C.yellow, { pos: [1.58 + i * .08, .2, -.66] }));
  board.add(reg('power', pwr));
  [[-1.0, .45], [-1.2, .45], [-1.0, -.45], [1.95, .62]].forEach(p => board.add(K.cyl(.045, .045, .12, C.purple, { pos: [p[0], .09, p[1]] })));

  // copper base + U-shaped heat pipes that rise into the fins
  const pipes = new T.Group(); root.add(pipes);
  pipes.add(K.box(.9, .07, .9, C.copper, { r: .02 }));
  [-.36, -.12, .12, .36].forEach(z => {
    pipes.add(K.tube([[-1.85, .2, z], [-1.1, .2, z], [-.6, .045, z], [.6, .045, z], [1.1, .2, z], [1.85, .2, z]], .045, C.copper, { seg: 90 }));
    [-1.85, 1.85].forEach(x => pipes.add(K.sphere(.045, C.copper, { pos: [x, .2, z], outline: false, seg: 10, seg2: 8 })));
  });
  reg('pipes', pipes);
  // fins
  const sink = new T.Group(); root.add(sink);
  // 34 fins drawn in ONE instanced call (+ one merged set of ink lines) to stay fast on phones
  const finGeo = new T.BoxGeometry(.035, .42, 1.45), NF = 34, finX = i => -1.9 + i * (3.8 / 33);
  const fins = K.instanced(finGeo, NF, C.silver);
  for (let i = 0; i < NF; i++) { K.dummy.position.set(finX(i), 0, 0); K.dummy.rotation.set(0, 0, 0); K.dummy.scale.setScalar(1); K.dummy.updateMatrix(); fins.setMatrixAt(i, K.dummy.matrix); }
  sink.add(fins);
  const fe = new T.EdgesGeometry(finGeo).attributes.position.array, fl = new Float32Array(fe.length * NF);
  for (let i = 0; i < NF; i++) for (let j = 0; j < fe.length; j += 3) { fl[i * fe.length + j] = fe[j] + finX(i); fl[i * fe.length + j + 1] = fe[j + 1]; fl[i * fe.length + j + 2] = fe[j + 2]; }
  const finLines = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(fl, 3)), K.inkLine);
  finLines.raycast = () => {}; sink.add(finLines);
  reg('heatsink', sink);
  // shroud: side skirt + a top cover with three round fan openings
  const shroud = new T.Group(); root.add(shroud);
  shroud.add(K.box(4.3, .16, .07, C.purple, { pos: [0, -.04, .79] }), K.box(4.3, .16, .07, C.purple, { pos: [0, -.04, -.79] }), K.box(.07, .16, 1.6, C.purple, { pos: [2.12, -.04, 0] }), K.box(.07, .16, 1.6, C.purple, { pos: [-2.12, -.04, 0] }));
  const cs = K.roundedRect(new T.Shape(), -2.17, -.82, 4.34, 1.64, .22);
  [-1.38, 0, 1.38].forEach(x => { const h = new T.Path(); h.absarc(x, 0, .64, 0, Math.PI * 2, true); cs.holes.push(h); });
  const cover = K.mesh(new T.ExtrudeGeometry(cs, { depth: .04, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 40 }), C.purple, { th: 40, outline: true });
  cover.rotation.x = -Math.PI / 2; cover.position.y = .04; shroud.add(cover);
  ctx.pick(cover, '🟪 Shroud', 'The plastic or metal cover that steers the fans’ air through the fins. Many have RGB lights — purely for looks!');
  [-.69, .69].forEach(x => shroud.add(K.box(.08, .03, 1.25, C.silver, { pos: [x, .115, 0], r: .012 })));
  shroud.add(K.mesh(new T.BoxGeometry(3.6, .035, .02), 0, { mat: K.glow(C.cyan), pos: [0, -.04, .83], edges: false }));
  const fans = [];
  [-1.38, 0, 1.38].forEach(x => { const f = K.fan(.6, C.dark, 11, { ringColor: C.black, capColor: C.cyan }); f.rotation.x = -Math.PI / 2; f.position.set(x, 0, 0); shroud.add(f); fans.push(f); });
  const fanG = new T.Group(); shroud.add(fanG); fans.forEach(f => fanG.add(f));
  reg('fans', fanG);

  // labels
  const L = [
    ctx.label(dieMesh, '🔲 GPU chip', { off: [0, .18, 0], cls: 't-pink' }),
    ctx.label(vram, '🟫 VRAM', { off: [-.6, .15, .62], cls: 't-yellow' }),
    ctx.label(vrm, '⚡ VRM', { off: [1.55, .3, 0], cls: 't-yellow' }),
    ctx.label(back, '🛡️ backplate', { off: [1.6, 0, .9] }),
    ctx.label(board, '🟨 PCIe', { off: [-.4, 0, 1.05], cls: 't-yellow' }),
    ctx.label(sink, '🧊 heatsink', { off: [1.9, .3, .8], cls: 't-cyan' }),
    ctx.label(pipes, '🟠 heat pipes', { off: [-1.95, .15, .5], cls: 't-orange' }),
    ctx.label(shroud, '🌀 fans', { off: [0, .3, .7], cls: 't-purple' }),
    ctx.label(ports, '🔌 ports', { off: [0, .95, .7] })
  ];

  // heat particles
  const NP = 70;
  const heat = K.instanced(new T.SphereGeometry(.045, 8, 6), NP, 0xff7a1a, true); heat.visible = false; root.add(heat);
  const hp = Array.from({ length: NP }, (_, i) => ({ p: i / NP, x: K.rand(-1.8, 1.8), z: K.rand(-.6, .6), j: K.rand(-.15, .15) }));
  const hc = [new T.Color(0xff3d3d), new T.Color(0xff7a1a), new T.Color(0xffc928)];

  let ex = .55, heatOn = false, fanSpeed = 4, sl = null;
  function layout() {
    if (sl) sl.value = ex;
    back.position.y = -.12 - ex * .95;
    board.position.y = 0;
    pipes.position.y = .2 + ex * .55;
    sink.position.y = .52 + ex * 1.05;
    shroud.position.y = .86 + ex * 1.65;
  }
  layout();
  sl = ctx.slider('💥 Explode', 0, 1, .01, ex, v => { ex = v; layout(); });
  const heatBtn = ctx.button('🔥 Show heat', () => {
    heatOn = !heatOn; heat.visible = heatOn; heatBtn.classList.toggle('on', heatOn);
    dieMesh.material.emissive.setHex(heatOn ? 0x992200 : 0);
    if (heatOn) ctx.info('🔥 Heat flow', 'Chip → copper base → heat pipes → fins → fans blow it away. Without the cooler, a big GPU would overheat in seconds!');
  });
  ctx.button('🔧 Put it together', () => { const e0 = ex; ctx.tween(1, e => { ex = e0 * (1 - e); layout(); }); });
  ctx.info('🥪 The graphics-card sandwich', 'Drag the <b>💥 Explode</b> slider, tap a part, or press <b>🔥 Show heat</b>.');
  ctx.home([4.6, 4.4, 5.8], [0, .5, 0], 1.3);
  ctx.autoRotate(.4);

  function select(key) {
    const o = parts[key]; if (!o) return;
    ctx.info(info[key][0], info[key][1]); ctx.pulse(o);
    document.dispatchEvent(new CustomEvent('cardpart', { detail: key }));
  }
  return {
    onPick(obj) { if (obj.userData.key) { select(obj.userData.key); return true; } },
    onMessage(msg, key) { if (msg === 'part') { if (ex < .4) { const e0 = ex; ctx.tween(.6, e => { ex = K.lerp(e0, .7, e); layout(); }); } select(key); } },
    update(dt, t) {
      const sp = heatOn ? 16 : fanSpeed;
      fans.forEach(f => { f.userData.rotor.rotation.z += dt * sp; });
      if (heatOn) {
        dieMesh.material.emissive.setRGB(.55 + Math.sin(t * 6) * .2, .12, 0);
        const yDie = .13, yBase = pipes.position.y, yPipe = pipes.position.y + .2, yTop = sink.position.y + .25, yFan = shroud.position.y + .2;
        hp.forEach((q, i) => {
          q.p += dt * .32; if (q.p > 1) { q.p -= 1; q.x = K.rand(-1.8, 1.8); q.z = K.rand(-.55, .55); }
          const p = q.p; let x, y, z, s = 1;
          if (p < .2) { const k = p / .2; x = .1 + q.j; z = q.j; y = K.lerp(yDie, yBase, k); }
          else if (p < .5) { const k = (p - .2) / .3; x = K.lerp(.1, q.x, k); z = K.lerp(q.j, [-.36, -.12, .12, .36][i % 4], k); y = yPipe; }
          else if (p < .78) { const k = (p - .5) / .28; x = q.x; z = K.lerp([-.36, -.12, .12, .36][i % 4], q.z, k); y = K.lerp(yPipe, yTop, k); }
          else { const k = (p - .78) / .22; x = q.x; z = q.z; y = K.lerp(yTop, yFan + .9, k); s = 1 - k; }
          K.dummy.position.set(x, y, z); K.dummy.scale.setScalar(s * (1.2 - p * .5)); K.dummy.rotation.set(0, 0, 0); K.dummy.updateMatrix();
          heat.setMatrixAt(i, K.dummy.matrix); heat.setColorAt(i, hc[Math.min(2, Math.floor(p * 3))]);
        });
        heat.instanceMatrix.needsUpdate = true; heat.instanceColor.needsUpdate = true;
      }
    }
  };
});

/* ============ Chapter 6: chip city & one SM ============ */
GPU3D.register('chip', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.shadow(8, 8));
  /* ---- whole chip ---- */
  const chipV = new T.Group(); root.add(chipV);
  chipV.add(K.box(6.4, .15, 6.4, C.pcb, { pos: [0, .075, 0] }));
  chipV.add(K.box(5, .14, 5, C.dark, { pos: [0, .22, 0] }));
  const sms = [], gpcs = [];
  const gpcCols = [C.blue, C.purple, C.cyan, C.purple, C.cyan, C.blue];
  let gi = 0;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const g = new T.Group(); g.position.set(-1.6 + c * 1.6, .29, r ? 1.25 : -1.25);
    const base = K.box(1.35, .05, 1.95, gpcCols[gi++]); g.add(base);
    ctx.pick(base, '🏘️ GPC (Graphics Processing Cluster)', 'A neighborhood of SMs plus a raster engine that turns triangles into pixels. Big GPUs have 7–12 GPCs.');
    for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) {
      const sm = K.box(.52, .16, .5, C.pink, { unique: true, pos: [a ? .32 : -.32, .1, -.62 + b * .62] });
      sm.material.emissive = new T.Color(0); sm.userData.ph = Math.random() * 6.28; sm.userData.sp = K.rand(2, 5);
      ctx.pick(sm, '🏭 SM (Streaming Multiprocessor)', 'A factory with 128 CUDA cores, 4 Tensor cores and an RT core. <b>Tap again or press 🏭 One SM to go inside!</b>');
      sm.userData.isSM = true; g.add(sm); sms.push(sm);
    }
    chipV.add(g); gpcs.push(g);
  }
  const l2 = K.box(4.6, .12, .4, C.yellow, { pos: [0, .35, 0] }); chipV.add(l2);
  ctx.pick(l2, '🗄️ L2 cache', 'A big shared storeroom (tens of MB) in the middle of the chip. It keeps popular data close so the SMs don’t have to go all the way out to VRAM.');
  const mcs = [], vrams = [];
  [-1.8, -.6, .6, 1.8].forEach(z => [-1, 1].forEach(s => {
    const mc = K.box(.16, .1, .5, C.orange, { pos: [s * 2.4, .34, z] }); chipV.add(mc); mcs.push(mc);
    ctx.pick(mc, '🚪 Memory controller', 'A loading dock! Each one talks to a VRAM chip over many wires at once. Together they create the GPU’s huge memory bandwidth.');
    const vr = K.box(.42, .09, .6, C.black, { pos: [s * 2.92, .2, z] }); chipV.add(vr); vrams.push(vr);
    ctx.pick(vr, '🟫 VRAM chip', 'Off-chip memory on the card: gigabytes of space, up to about 1–1.8 TB/s on top gaming cards.');
  }));
  const pcie = K.box(1.2, .1, .16, C.cyan, { pos: [0, .34, 2.4] }); chipV.add(pcie);
  ctx.pick(pcie, '🛣️ PCIe interface', 'The on-ramp to the highway that leads to the CPU and system RAM.');
  const vid = K.box(1.6, .1, .16, C.green, { pos: [0, .34, -2.4] }); chipV.add(vid);
  ctx.pick(vid, '🎬 Display & video engines', 'Fixed-function helpers: send frames to monitors and encode/decode video (NVENC/NVDEC) without bothering the cores.');
  const chipL = [
    ctx.label(gpcs[0], '🏘️ GPC', { off: [0, .3, -1.15], cls: 'big t-blue' }),
    ctx.label(sms[4], '🏭 SM', { off: [0, .35, 0], cls: 't-pink' }),
    ctx.label(l2, '🗄️ L2 cache', { off: [0, .25, 0], cls: 't-yellow' }),
    ctx.label(mcs[1], '🚪 memory controller', { off: [.3, .3, 0], cls: 't-orange' }),
    ctx.label(vrams[7], '🟫 VRAM', { off: [0, .3, .4] }),
    ctx.label(pcie, '🛣️ PCIe', { off: [0, .25, .25], cls: 't-cyan' }),
    ctx.label(vid, '🎬 video / display', { off: [0, .25, -.2], cls: 't-green' })
  ];
  // data packets VRAM → MC → L2 → SM
  const NPk = 10;
  const pk = K.instanced(new T.SphereGeometry(.07, 8, 6), NPk, 0xffc928, true); chipV.add(pk);
  const route = () => { const k = Math.floor(Math.random() * mcs.length); const sm = sms[Math.floor(Math.random() * sms.length)]; const sp = sm.getWorldPosition(new T.Vector3()); return [vrams[k].position.clone().setY(.4), mcs[k].position.clone().setY(.45), K.V(sp.x * .8, .48, 0), sp.setY(.5)]; };
  chipV.updateMatrixWorld(true);
  const packets = Array.from({ length: NPk }, (_, i) => ({ p: i / NPk, r: route() }));

  /* ---- one SM ---- */
  const smV = new T.Group(); smV.visible = false; root.add(smV);
  smV.add(K.box(5.2, .12, 4.8, 0xffb3d1, { pos: [0, .06, 0] }));
  const smL = [];
  const coreI = K.instanced(K.rgeo(.14, .14, .14, .035, 1), 128, 0x8fe3b0, false, true); smV.add(coreI);
  const tens = K.instanced(K.rgeo(.11, .06, .11, .02, 1), 64, 0xffe1a8); smV.add(tens);
  const scheds = [];
  const P = [[-1.32, -.92], [1.32, -.92], [-1.32, .92], [1.32, .92]];
  P.forEach((pp, q) => {
    const g = new T.Group(); g.position.set(pp[0], .12, pp[1]); smV.add(g);
    g.add(K.box(2.45, .05, 1.65, C.white));
    const sc = K.box(2.2, .14, .2, C.purple, { pos: [0, .1, -.64], unique: true }); sc.material.emissive = new T.Color(0); g.add(sc); scheds.push(sc);
    ctx.pick(sc, '📣 Warp scheduler', 'Every clock it picks a warp that’s ready and sends its next instruction to 32 lanes. If a warp is waiting for memory, it simply picks another one — no time wasted!');
    const rf = K.box(2.2, .16, .2, C.yellow, { pos: [0, .1, -.38] }); g.add(rf);
    ctx.pick(rf, '🔒 Register file', 'Super-fast private lockers for every thread’s variables. 256 KB per SM — even bigger than the L1 cache!');
    const tc = K.box(.66, .28, .66, C.orange, { pos: [.8, .16, .18] }); g.add(tc);
    ctx.pick(tc, '🧮 Tensor core', 'A matrix machine: multiplies whole tiles of numbers at once. The secret sauce for AI.');
    const ls = K.group(); for (let i = 0; i < 4; i++) ls.add(K.box(.2, .1, .12, C.cyan, { pos: [-.95 + i * .26, .07, .67] }));
    ls.add(K.box(.2, .1, .12, C.green, { pos: [.25, .07, .67] }), K.box(.2, .1, .12, C.green, { pos: [.5, .07, .67] }));
    g.add(ls);
    ctx.pick(ls, '📦 Load/store units & SFUs', 'Load/store units (blue) fetch data from memory; special function units (green) do sin, cos and square roots.');
    for (let i = 0; i < 32; i++) {
      const cx = i % 8, cz = Math.floor(i / 8);
      K.dummy.position.set(pp[0] - 1.0 + cx * .19, .27, pp[1] - .1 + cz * .19); K.dummy.rotation.set(0, 0, 0); K.dummy.scale.set(1, 1, 1); K.dummy.updateMatrix();
      coreI.setMatrixAt(q * 32 + i, K.dummy.matrix);
    }
    for (let i = 0; i < 16; i++) {
      K.dummy.position.set(pp[0] + .8 - .24 + (i % 4) * .16, .48, pp[1] + .18 - .24 + Math.floor(i / 4) * .16); K.dummy.updateMatrix();
      tens.setMatrixAt(q * 16 + i, K.dummy.matrix);
    }
    if (q === 0) smL.push(ctx.label(sc, '📣 warp scheduler', { off: [-.3, .25, 0], cls: 't-purple' }));
    if (q === 1) smL.push(ctx.label(rf, '🔒 registers', { off: [.2, .2, 0], cls: 't-yellow' }));
    if (q === 2) smL.push(ctx.label(K.V(pp[0] - .35, .5, pp[1] + .2), '👷 32 CUDA cores', { cls: 't-green' }));
    if (q === 3) smL.push(ctx.label(tc, '🧮 Tensor core', { off: [0, .45, 0], cls: 't-orange' }));
  });
  ctx.pick(coreI, '👷 CUDA cores (FP32 lanes)', 'Each lane does one multiply-add per clock. When 32 flash together, that’s one <b>warp</b> doing one instruction.');
  ctx.pick(tens, '🧮 Tensor core', 'A matrix machine: multiplies whole tiles of numbers at once.');
  const l1 = K.box(4.9, .16, .45, C.blue, { pos: [0, .2, 2.08] }); smV.add(l1);
  ctx.pick(l1, '🎒 L1 cache / shared memory', 'About 128 KB of fast scratchpad shared by the threads of a block. Way faster than VRAM.');
  const rt = K.box(.95, .3, .45, C.red, { pos: [-1.7, .27, -2.08] }); smV.add(rt);
  ctx.pick(rt, '💡 RT core', 'Hardware that answers “does this light ray hit this triangle?” super fast — for ray tracing.');
  const tex = K.group(); [.2, .7, 1.2, 1.7].forEach(x => tex.add(K.box(.38, .16, .4, C.cyan, { pos: [x, .2, -2.08] }))); smV.add(tex);
  ctx.pick(tex, '🖼️ Texture units', 'Fetch and blend texture pixels (filtering) for graphics.');
  smL.push(ctx.label(l1, '🎒 L1 / shared memory', { off: [0, .25, 0], cls: 't-blue' }));
  smL.push(ctx.label(rt, '💡 RT core', { off: [-.3, .3, -.1], cls: 't-red' }));
  smL.forEach(l => l.show(false));

  const warpCols = [0x2ee88a, 0x3fd2ff, 0xffd84d, 0xff6aa8, 0xb18cff, 0xff9447].map(c => new T.Color(c));
  const idle = new T.Color(0x6a9a86);
  const qState = P.map((_, q) => ({ t: q * .17, w: q }));
  let view = 0;
  const modes = ctx.modes(['🗺️ Whole chip', '🏭 One SM'], i => setView(i), 0);
  function setView(i) {
    view = i; modes.mark(i);
    chipV.visible = i === 0; smV.visible = i === 1;
    chipL.forEach(l => l.show(i === 0)); smL.forEach(l => l.show(i === 1));
    if (i === 0) {
      ctx.view([5.6, 7.4, 7.6], [0, 0, .3], 1);
      ctx.info('🗺️ The whole chip (a city!)', '6 neighborhoods (GPCs) with 6 factories (SMs) each, sharing a big L2 cache in the middle. Memory controllers on the sides talk to the VRAM chips. Yellow dots = data being delivered. Tap any part — or tap an SM to go inside!');
    } else {
      ctx.view([0, 7.6, 4.6], [0, 0, .25], 1);
      ctx.info('🏭 Inside one SM', '4 teams. Each has a warp scheduler 📣, registers 🔒, 32 CUDA-core lanes 👷 and a Tensor core 🧮. Watch the lanes flash together: each flash = one <b>warp</b> (32 threads) running one instruction. Colors = different warps taking turns.');
    }
  }
  ctx.home([5.6, 7.4, 7.6], [0, 0, .3], 1.2);
  setView(0);
  return {
    onPick(obj) { if (obj.userData.isSM) { if (obj.userData.tapped) { setView(1); return true; } sms.forEach(s => s.userData.tapped = false); obj.userData.tapped = true; } },
    update(dt, t) {
      if (view === 0) {
        sms.forEach(s => { const v = Math.sin(t * s.userData.sp + s.userData.ph); s.material.emissive.setRGB(v > .55 ? .35 : 0, v > .55 ? .05 : 0, v > .55 ? .15 : 0); });
        packets.forEach((q, i) => {
          q.p += dt * .45; if (q.p >= 1) { q.p = 0; q.r = route(); }
          const seg = Math.min(2, Math.floor(q.p * 3)), k = q.p * 3 - seg;
          K.dummy.position.lerpVectors(q.r[seg], q.r[seg + 1], k); K.dummy.scale.setScalar(1); K.dummy.updateMatrix();
          pk.setMatrixAt(i, K.dummy.matrix);
        });
        pk.instanceMatrix.needsUpdate = true;
      } else {
        qState.forEach((s, q) => {
          s.t += dt;
          const cyc = .42, lit = s.t % cyc < .26;
          if (s.t > cyc) { s.t -= cyc; s.w = (s.w + 1 + Math.floor(Math.random() * 2)) % warpCols.length; }
          for (let i = 0; i < 32; i++) coreI.setColorAt(q * 32 + i, lit ? warpCols[s.w] : idle);
          scheds[q].material.emissive.setHex(lit ? 0x331155 : 0);
        });
        coreI.instanceColor.needsUpdate = true;
        const tp = (t % 1.6) / 1.6;
        for (let i = 0; i < 64; i++) {
          const k = i % 16, d = ((k % 4) + Math.floor(k / 4)) / 6;
          tens.setColorAt(i, Math.abs(tp - d * .6) < .1 ? warpCols[2] : idle);
        }
        tens.instanceColor.needsUpdate = true;
      }
    }
  };
});

/* ============ Chapter 7: the graphics pipeline ============ */
GPU3D.register('pipeline', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.at(K.shadow(3.2, 3.2), -1.6, -.6, 0));

  // island definition (shared by main scene and the GPU's offscreen view)
  const defs = [
    [new T.CylinderGeometry(1.3, 1.05, .35, 7), C.green, [0, .17, 0]],
    [new T.CylinderGeometry(1.05, .25, .7, 7), C.brown, [0, -.35, 0]],
    [new T.CylinderGeometry(.08, .11, .5, 6), C.brown, [.55, .6, -.3]],
    [new T.ConeGeometry(.42, .72, 7), 0x13a84d, [.55, 1.08, -.3]],
    [new T.ConeGeometry(.3, .52, 7), 0x13a84d, [.55, 1.45, -.3]],
    [new T.BoxGeometry(.64, .5, .56), 0xffd166, [-.35, .6, .15]],
    [new T.ConeGeometry(.54, .42, 4), C.red, [-.35, 1.06, .15], [0, Math.PI / 4, 0]],
    [new T.BoxGeometry(.15, .25, .03), C.brown, [-.35, .48, .44]],
    [new T.DodecahedronGeometry(.19), C.gray, [.45, .43, .55]],
    [new T.ConeGeometry(.12, .2, 6), C.pink, [-.85, .45, -.45]],
    [new T.CylinderGeometry(.03, .03, .16, 6), C.white, [-.85, .3, -.45]]
  ];
  const model = new T.Group(); model.position.set(-1.6, 0, 0); root.add(model);
  const parts = [];
  let vCount = 0;
  const wireMat = new T.MeshBasicMaterial({ color: 0x5a5f80, wireframe: true });
  const ptMat = new T.PointsMaterial({ color: C.pink, size: .075 });
  defs.forEach(d => {
    const toon = K.mat(d[1], true), flat = new T.MeshBasicMaterial({ color: d[1] });
    const m = new T.Mesh(d[0], toon); m.position.set(...d[2]); if (d[3]) m.rotation.set(...d[3]);
    K.edges(m, 25);
    const pts = new T.Points(d[0], ptMat); m.add(pts);
    model.add(m); parts.push({ m, toon, flat, pts, edge: m.children[0] });
    vCount += d[0].attributes.position.count;
  });
  ctx.pick(model, '🏝️ The 3D world', 'Just a list of corner points (vertices) grouped into triangles. Every game world — from a tiny island to a giant city — is built this way.');

  // offscreen copy for the GPU's "screen"
  const rs = new T.Scene();
  rs.add(new T.HemisphereLight(0xffffff, 0x9aa0c0, .62));
  const rsun = new T.DirectionalLight(0xffffff, .8); rsun.position.set(-1, 6, 3); rs.add(rsun);
  const rModel = new T.Group(); rModel.position.copy(model.position); rs.add(rModel);
  const rParts = defs.map(d => {
    const m = new T.Mesh(d[0], K.mat(d[1], true)); m.position.set(...d[2]); if (d[3]) m.rotation.set(...d[3]);
    const flat = new T.MeshBasicMaterial({ color: d[1] }), toon = m.material;
    const pts = new T.Points(d[0], new T.PointsMaterial({ color: 0xff6aa8, size: 3, sizeAttenuation: false }));
    m.add(pts); rModel.add(m);
    const edge = new T.LineSegments(new T.EdgesGeometry(d[0], 25), new T.LineBasicMaterial({ color: 0x24243a })); m.add(edge);
    return { m, flat, toon, pts, edge };
  });

  // virtual camera
  const vcam = new T.PerspectiveCamera(42, 4 / 3, .1, 40);
  vcam.position.set(1.05, 1.75, 3.1); vcam.lookAt(-1.6, .55, 0); scene.add(vcam); vcam.updateMatrixWorld(true);
  const camIcon = K.group(K.box(.4, .28, .32, C.dark), K.cyl(.11, .13, .2, C.cyan, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, .24] }), K.box(.12, .07, .1, C.red, { pos: [.1, .18, -.05] }));
  camIcon.position.copy(vcam.position); camIcon.lookAt(-1.6, .55, 0); root.add(camIcon);
  ctx.pick(camIcon, '📷 The camera', 'The player’s eye. The vertex shader works out where every corner point lands from this point of view.');
  ctx.label(camIcon, '📷 camera', { off: [0, .35, 0] });
  // frustum
  const fr = [];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => { const p = K.V(c[0], c[1], .5).unproject(vcam); fr.push(p.sub(vcam.position).normalize().multiplyScalar(4.4).add(vcam.position)); });
  const frustum = K.group(...fr.map(p => K.line([vcam.position, p], C.blue, { dashed: true })), K.line(fr.concat([fr[0]]), C.blue, { dashed: true }));
  root.add(frustum);
  // projection lines (vertex → camera)
  const NPL = 16;
  const plGeo = new T.BufferGeometry(); plGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(NPL * 6), 3));
  const projLines = new T.LineSegments(plGeo, new T.LineBasicMaterial({ color: C.pink, transparent: true, opacity: .7 })); root.add(projLines);
  const plPick = []; for (let i = 0; i < NPL; i++) { const p = parts[i % parts.length]; plPick.push([p.m, Math.floor(Math.random() * p.m.geometry.attributes.position.count)]); }

  // screen
  const screenG = new T.Group(); screenG.position.set(2.35, 1.65, -1.0); screenG.rotation.y = -.42; root.add(screenG);
  screenG.add(K.box(2.85, 2.2, .1, C.black, { pos: [0, 0, -.06] }));
  screenG.add(K.box(.12, 1.3, .1, C.dark, { pos: [0, -1.55, -.1] }));
  screenG.add(K.box(1.1, .08, .6, C.dark, { pos: [0, -2.2, -.1] }));
  const scrMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const scr = new T.Mesh(new T.PlaneGeometry(2.6, 1.95), scrMat); screenG.add(scr);
  ctx.pick(screenG, '🖥️ The screen', 'What the GPU actually makes: a grid of colored pixels. Watch it change at every step!');
  ctx.label(screenG, '🖥️ what the GPU makes', { off: [0, 1.35, 0], cls: 't-yellow' });
  const gridTex = K.canvasTex(480, 360);
  (function () { const g = gridTex.g; g.clearRect(0, 0, 480, 360); g.strokeStyle = 'rgba(20,20,40,.55)'; g.lineWidth = 1.2; for (let x = 0; x <= 480; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 360); g.stroke(); } for (let y = 0; y <= 360; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(480, y); g.stroke(); } gridTex.tex.needsUpdate = true; })();
  const gridPlane = new T.Mesh(new T.PlaneGeometry(2.6, 1.95), new T.MeshBasicMaterial({ map: gridTex.tex, transparent: true })); gridPlane.position.z = .005; screenG.add(gridPlane);
  const idleTex = K.canvasTex(480, 360);
  function drawIdle(msg) { const g = idleTex.g; g.fillStyle = '#1d2033'; g.fillRect(0, 0, 480, 360); g.fillStyle = '#9aa0c0'; g.font = '34px "Patrick Hand", cursive'; g.textAlign = 'center'; g.fillText(msg, 240, 190); idleTex.tex.needsUpdate = true; }
  const mkRT = (w, h) => { const r = new T.WebGLRenderTarget(w, h); r.texture.minFilter = r.texture.magFilter = T.NearestFilter; r.texture.generateMipmaps = false; return r; };
  const rtLow = mkRT(40, 30), rtMid = mkRT(96, 72), rtHigh = mkRT(480, 360);
  rtHigh.texture.minFilter = rtHigh.texture.magFilter = T.LinearFilter;

  // sun + rays
  const sun = K.sphere(.28, 0, { mat: K.glow(C.yellow), pos: [-.3, 3.7, -1.0] }); root.add(sun);
  ctx.pick(sun, '☀️ The light', 'Lights tell the pixel shader how bright each spot is. Ray tracing follows rays toward it to check for shadows.');
  const rays = new T.Group(); root.add(rays);
  const ray = new T.Raycaster();
  const missMat = new T.MeshBasicMaterial({ color: C.blue, transparent: true, opacity: .45 });
  function buildRays() {
    rays.clear();
    model.updateMatrixWorld(true); vcam.updateMatrixWorld(true);
    const solids = parts.map(p => p.m), list = [];
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 7; xx++) {
      const ndc = new T.Vector2(-.75 + xx * .25 + K.rand(-.05, .05), -.7 + yy * .32 + K.rand(-.05, .05));
      ray.setFromCamera(ndc, vcam);
      const hit = ray.intersectObjects(solids, false)[0];
      if (hit) {
        const a = K.beam(vcam.position, hit.point, .014, C.orange); a.visible = false; rays.add(a);
        const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : K.V(0, 1, 0);
        const o = hit.point.clone().add(n.multiplyScalar(.02)), dir = sun.position.clone().sub(o).normalize();
        ray.set(o, dir);
        const blk = ray.intersectObjects(solids, false)[0];
        const b = blk && blk.distance < o.distanceTo(sun.position) ? K.beam(hit.point, blk.point, .016, C.purple) : K.beam(hit.point, sun.position, .009, C.yellow);
        b.visible = false; rays.add(b); list.push([a, b]);
      } else {
        const far = ray.ray.direction.clone().multiplyScalar(5.5).add(vcam.position);
        const a = K.beam(vcam.position, far, .008, C.blue, missMat); a.visible = false; rays.add(a); list.push([a]);
      }
    }
    return list;
  }

  const steps = [
    ['① Vertices (corner points)', 'A 3D world is stored as <b>corner points</b> called vertices — just lists of numbers (x, y, z). This little island has about ' + vCount + ' of them.'],
    ['② Triangles', 'Every 3 vertices make a <b>triangle</b>. Triangles are the GPU’s favorite shape — any 3 points are always flat, so they’re easy to draw. Huge game worlds are just millions of triangles.'],
    ['③ Vertex shader: camera view', 'A tiny program runs for <b>every vertex at the same time</b> and works out where it lands on the screen from the camera’s point of view. The dots on the screen are the result!'],
    ['④ Rasterization: which pixels?', 'For each triangle the GPU checks which <b>pixel squares</b> it covers. This screen is only 40×30 pixels so you can see the chunky squares. (Try the rasterizer toy below!)'],
    ['⑤ Pixel shader: color + light', 'Now a tiny program runs for <b>every pixel</b>: what color? how much light? in shadow? Millions of pixels, all shaded in parallel.'],
    ['⑥ The finished frame! 🖼️', 'Full resolution, sky, outlines and all. It goes to the monitor — then the GPU starts the next frame. At 60 FPS that’s one frame every <b>16.7 ms</b>!'],
    ['✨ Bonus: ray tracing', 'Rays shoot out from the camera. <span style="color:#ff7a1a">Orange</span> = hits the island, <span style="color:#d9a400">yellow</span> = clear path to the sun (lit), <span style="color:#8b5cf6">purple</span> = blocked (shadow), <span style="color:#2d7dff">blue</span> = missed, sees sky. RT cores speed up these hit tests.']
  ];
  let step = 0, rayList = [], rayT = 0, spin = true;
  const status = ctx.status('');
  function setStep(s) {
    step = (s + steps.length) % steps.length;
    ctx.info(steps[step][0], steps[step][1]);
    status.innerHTML = 'step ' + (step + 1) + ' / ' + steps.length;
    parts.forEach(p => {
      p.m.material = step === 3 ? p.flat : step < 3 ? wireMat : p.toon;
      p.m.visible = step !== 0;
      p.pts.visible = step <= 2;
      p.edge.visible = step >= 5;
    });
    // when the mesh is hidden its points are hidden too, so keep points on a visible proxy
    parts.forEach(p => { if (step === 0) { p.m.visible = true; p.m.material = invisible; } });
    frustum.visible = step === 2 || step === 6; camIcon.visible = step >= 2;
    projLines.visible = step === 2;
    gridPlane.visible = step === 3;
    sun.visible = step >= 4;
    rParts.forEach(p => {
      p.m.material = step === 3 ? p.flat : step === 2 ? invisible : p.toon;
      p.pts.visible = step === 2; p.edge.visible = step >= 5;
    });
    rays.visible = step === 6;
    spin = step !== 6;
    if (step < 2) { drawIdle(step === 0 ? 'waiting for points…' : 'waiting for triangles…'); scrMat.map = idleTex.tex; }
    else scrMat.map = (step === 3 ? rtLow : step === 4 ? rtMid : rtHigh).texture;
    scrMat.needsUpdate = true;
    if (step === 6) { rayList = buildRays(); rayT = 0; }
  }
  const invisible = new T.MeshBasicMaterial({ visible: false });
  ctx.button('◀ Back', () => setStep(step - 1));
  ctx.button('Next ▶', () => setStep(step + 1), 'primary');
  ctx.home([1.7, 3.4, 7.6], [.35, 1.0, 0], 1.4);
  setStep(0);

  // responsive: on narrow (portrait) stages float the screen above the island
  const stand = [screenG.children[1], screenG.children[2]];
  let narrow = null;
  function layout(w, h) {
    const n = w / h < 1.1;
    if (n === narrow) return;
    narrow = n;
    if (n) {
      screenG.position.set(-.45, 3.3, -2.3); screenG.rotation.set(0, .12, 0); screenG.scale.setScalar(.85);
      sun.position.set(-3.1, 2.9, -.8);
      ctx.home([1.0, 3.9, 10.4], [-.55, 1.85, 0], .8);
    } else {
      screenG.position.set(2.35, 1.65, -1.0); screenG.rotation.set(0, -.42, 0); screenG.scale.setScalar(1);
      sun.position.set(-.3, 3.7, -1.0);
      ctx.home([1.7, 3.4, 7.6], [.35, 1.0, 0], 1.4);
    }
    stand.forEach(m => { m.visible = !n; });
    if (step === 6) { rayList = buildRays(); rayT = 0; }
  }
  layout(ctx.stage.clientWidth || 4, ctx.stage.clientHeight || 3);

  const bgSky = new T.Color(0xbfeaff), bgDark = new T.Color(0x1d2033), bgFlat = new T.Color(0xeaf6ff);
  const _p = new T.Vector3();
  function renderGPU() {
    const r = ctx.renderer; if (!r || step < 2 || (step === 6 && rayT > .3)) return;
    const rt = step === 3 ? rtLow : step === 4 ? rtMid : rtHigh;
    r.setRenderTarget(rt);
    r.setClearColor(step === 2 ? bgDark : step === 3 ? bgFlat : bgSky, 1); r.clear();
    r.render(rs, vcam);
    r.setRenderTarget(null); r.setClearColor(0x000000, 0);
  }
  return {
    _rays: () => ({ list: rayList, group: rays }),
    onResize: layout,
    update(dt, t) {
      if (spin) { model.rotation.y += dt * .35; rModel.rotation.y = model.rotation.y; }
      if (step === 2) {
        model.updateMatrixWorld(true);
        const arr = plGeo.attributes.position.array;
        plPick.forEach((pp, i) => {
          _p.fromBufferAttribute(pp[0].geometry.attributes.position, pp[1]).applyMatrix4(pp[0].matrixWorld);
          arr.set([_p.x, _p.y, _p.z, vcam.position.x, vcam.position.y, vcam.position.z], i * 6);
        });
        plGeo.attributes.position.needsUpdate = true;
      }
      if (step === 6) {
        rayT += dt;
        const k = Math.floor(rayT / .07);
        rayList.forEach((r, i) => { r[0].visible = i <= k; if (r[1]) r[1].visible = i <= k - 3; });
        if (rayT > rayList.length * .07 + 4) rayT = 0;
      }
      renderGPU();
    }
  };
});
