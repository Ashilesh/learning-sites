/* Part 1 scenes: pc, os, cpuvsgpu, uses */

/* ============ Chapter 1: a real PC + the data journey ============ */
GPU3D.register('pc', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  const hot = []; // things that glow during the journey
  const uniq = (m) => { m.material = m.material.clone(); m.material.emissive = new T.Color(0); m.userData.unique = true; return m; };
  const glowOn = (m, on, col) => { m.material.emissive.setHex(on ? (col || 0x553311) : 0); };
  const strip = (w, h, d, col, pos) => K.mesh(new T.BoxGeometry(w, h, d), 0, { mat: K.glow(col), pos, edges: false });

  // ---- desk ----
  const desk = K.box(4.5, .14, 5.0, 0xdcaa72, { pos: [.75, -.07, -.75], r: .05 }); root.add(desk);
  root.add(K.at(K.shadow(3.4, 3.6), .1, 0, 0));
  root.add(K.at(K.shadow(2.6, 1.8), 1.4, 0, -2.2));

  // ---- case (open on the side facing you) ----
  const H = 2.1, D = 2.0;
  root.add(K.box(.05, H, D, C.white, { pos: [-.5, H / 2, 0], r: .03 }));
  root.add(K.box(1, .05, D, C.white, { pos: [0, H, 0], r: .025 }));
  root.add(K.box(1, .06, D, C.white, { pos: [0, .03, 0], r: .03 }));
  root.add(K.box(1, H, .05, C.white, { pos: [0, H / 2, -1], r: .025 }));
  root.add(K.box(1, H, .07, C.white, { pos: [0, H / 2, 1], r: .03 }));
  root.add(K.box(.78, 1.7, .02, C.dark, { pos: [0, 1.12, 1.04], r: .01 }));          // front mesh
  root.add(strip(.03, 1.9, .03, C.cyan, [.47, 1.05, 1.02]));                          // RGB strip
  root.add(K.box(.72, .016, 1.5, C.dark, { pos: [0, H + .03, 0], r: .007 }));         // top dust filter
  root.add(K.cyl(.05, .05, .03, C.pink, { pos: [.3, 1.98, 1.045], rot: [Math.PI / 2, 0, 0] }));

  // motherboard + its little helpers
  const mobo = K.box(.03, 1.75, 1.7, C.teal, { pos: [-.465, 1.15, -.1] }); root.add(mobo);
  ctx.pick(mobo, '🛣️ Motherboard — the city roads', 'A big board covered in thin copper roads (traces) that connect every part. The long slot holding the graphics card is the <b>PCIe highway</b>.');
  root.add(K.box(.035, .05, .95, C.black, { pos: [-.44, .87, -.25] }));               // PCIe slot
  root.add(K.box(.09, .55, .11, C.dark, { pos: [-.41, 1.62, -.64] }));                // VRM heatsinks
  root.add(K.box(.09, .11, .48, C.dark, { pos: [-.41, 1.95, -.32] }));
  root.add(K.box(.1, .42, .24, C.slate, { pos: [-.41, 1.76, -.84] }));                // I/O cover
  root.add(K.box(.06, .26, .26, C.silver, { pos: [-.43, .58, .42] }));                // chipset heatsink
  root.add(K.box(.06, .3, .08, C.black, { pos: [-.42, 1.35, .66] }));                 // 24-pin socket
  [[1.3, -.58], [1.36, -.58], [1.42, -.58]].forEach(p => root.add(K.cyl(.018, .018, .06, C.purple, { pos: [-.43, p[0], p[1]], rot: [0, 0, Math.PI / 2], edges: false })));

  // CPU
  const cpu = K.group(K.box(.025, .4, .4, C.pcb, { pos: [-.44, 0, 0] }), uniq(K.box(.045, .3, .3, C.silver, { pos: [-.415, 0, 0] })));
  cpu.position.set(0, 1.62, -.3); root.add(cpu);
  const cpuLid = cpu.children[1]; hot.push(cpuLid);
  ctx.pick(cpu, '🧠 CPU — the brain', 'Runs the game rules, the operating system and your apps. A few very fast, very smart cores that are great at step-by-step thinking. (Its cooler is hidden so you can see it!)');

  // RAM sticks with heat spreaders and RGB
  const ram = K.group();
  [.06, .16].forEach(z => {
    const s = uniq(K.box(.17, .8, .04, C.yellow, { pos: [-.37, 0, z] })); ram.add(s); hot.push(s);
    ram.add(K.box(.05, .8, .05, C.dark, { pos: [-.28, 0, z] }));
    ram.add(strip(.012, .74, .03, C.pink, [-.252, 0, z]));
  });
  ram.position.set(0, 1.55, 0); root.add(ram);
  ctx.pick(ram, '📝 RAM — the desk', 'Short-term memory: fast, but it forgets everything when the power goes off. The game is copied here from the SSD so the CPU can reach it quickly.');

  // SSD (M.2)
  const ssd = uniq(K.box(.03, .12, .46, C.orange, { pos: [-.435, .62, -.2] })); root.add(ssd); hot.push(ssd);
  root.add(K.box(.034, .08, .14, C.white, { pos: [-.433, .62, -.1], r: .005 }));
  ctx.pick(ssd, '📚 SSD — the bookshelf', 'Long-term storage. Keeps your games, photos and the OS even when the PC is switched off. Much bigger than RAM, but slower.');

  // GPU card
  const gpu = K.group();
  const shroud = uniq(K.box(.42, .17, 1.6, C.pink, { r: .05 })); gpu.add(shroud); hot.push(shroud);
  gpu.add(K.box(.43, .025, 1.62, C.dark, { pos: [0, .095, 0], r: .01 }));             // backplate
  gpu.add(strip(.02, .04, 1.0, C.cyan, [.215, .02, .1]));                             // RGB logo strip
  gpu.add(K.box(.46, .22, .03, C.silver, { pos: [.01, 0, -.83], r: .008 }));          // bracket
  gpu.add(K.box(.06, .05, .16, C.black, { pos: [.17, .12, .38] }));                   // power plug
  const gfans = [];
  [-.32, .36].forEach(z => { const f = K.fan(.18, C.white, 9, { capColor: C.cyan }); f.rotation.x = Math.PI / 2; f.position.set(0, -.09, z); gpu.add(f); gfans.push(f); });
  gpu.position.set(-.22, .95, -.15); root.add(gpu);
  ctx.pick(gpu, '🎨 GPU — the art studio', 'The graphics card. Its GPU chip has thousands of small cores that paint every frame you see — and crunch AI math too. Its fans are on the bottom.');

  // PSU + sleeved cables
  const psu = K.group(K.box(.85, .42, .8, C.slate, { r: .04 }), K.box(.012, .2, .32, C.yellow, { pos: [.43, 0, 0], r: .004 }));
  [-.25, -.15, -.05, .05, .15, .25].forEach(z => psu.add(K.box(.014, .03, .06, C.dark, { pos: [.43, .14, z], r: .006, edges: false })));
  psu.position.set(0, .27, -.55); root.add(psu);
  ctx.pick(psu, '⚡ Power supply (PSU)', 'Turns wall power (110–240 V) into steady 12 V, 5 V and 3.3 V for every part. Big GPUs get extra cables straight from here.');
  const c24 = K.cable([[.22, .48, .05], [.2, .76, .55], [-.1, 1.15, .8], [-.38, 1.35, .68]], [C.pink, C.white, C.pink, C.white], .017, K.V(1, 0, 0));
  const cgpu = K.cable([[.25, .48, -.15], [.33, .8, .15], [.12, 1.13, .26], [-.04, 1.1, .23]], [C.yellow, C.black, C.yellow], .017, K.V(0, 0, 1));
  root.add(c24, cgpu);
  ctx.pick(c24, '🔌 Power cables', 'Sleeved cables carry power from the PSU: a big 24-pin plug for the motherboard and a separate plug for the hungry graphics card.');
  ctx.pick(cgpu, '🔌 GPU power cable', 'A big GPU needs so much power that it gets its own cable straight from the power supply.');

  // case fans (square frames, curved blades)
  const cfans = [];
  [1.25, 1.78].forEach(y => { const f = K.fan(.3, C.cyan, 7, { frame: true, frameColor: C.dark, capColor: C.pink }); f.position.set(0, y, .9); root.add(f); cfans.push(f); });
  const rear = K.fan(.22, C.cyan, 7, { frame: true, frameColor: C.dark, capColor: C.pink }); rear.position.set(.05, 1.72, -.92); root.add(rear); cfans.push(rear);
  const fanPick = K.group(); cfans.forEach(f => fanPick.add(f));
  root.add(fanPick);
  ctx.pick(fanPick, '🌀 Case fans', 'Pull cool air in at the front and push hot air out the back. Chips that work hard get hot!');

  // monitor
  const mon = new T.Group(); mon.position.set(1.4, 0, -2.2); mon.rotation.y = .6; root.add(mon);
  mon.add(K.cyl(.34, .4, .045, C.dark, { pos: [0, .0225, 0], r: .015 }));
  mon.add(K.box(.1, .64, .06, C.dark, { pos: [0, .35, -.12], rot: [-.06, 0, 0] }));
  mon.add(K.cyl(.05, .05, .16, C.slate, { pos: [0, .66, -.1], rot: [0, 0, Math.PI / 2] }));
  mon.add(K.box(1.1, .62, .12, C.dark, { pos: [0, 1.02, -.08], r: .05 }));
  const frame = uniq(K.box(1.94, 1.16, .07, C.black, { pos: [0, 1.06, 0], r: .035 })); mon.add(frame);
  const scr = K.canvasTex(512, 300);
  const screen = new T.Mesh(new T.PlaneGeometry(1.82, 1.04), new T.MeshBasicMaterial({ map: scr.tex }));
  screen.position.set(0, 1.06, .037); mon.add(screen);
  mon.add(K.sphere(.014, 0, { mat: K.glow(C.green), pos: [.86, .5, .037], outline: false }));
  ctx.pick(mon, '🖥️ Monitor', 'Shows the frames the GPU paints — 60, 144 or even 240 times every second. Each frame is millions of colored pixels.');

  // keyboard, mouse & a mug of coffee
  const kb = new T.Group(); kb.position.set(1.97, 0, -1.37); kb.rotation.y = .6; root.add(kb);
  kb.add(K.box(1.06, .05, .38, C.white, { pos: [0, .025, 0], r: .02 }));
  const keys = K.instanced(K.rgeo(.058, .035, .058, .014, 1), 56, 0xf3eee0);
  for (let i = 0; i < 56; i++) {
    const c = i % 14, rr = Math.floor(i / 14);
    K.dummy.position.set(-.45 + c * .069, .066, -.13 + rr * .068); K.dummy.rotation.set(0, 0, 0); K.dummy.scale.setScalar(1); K.dummy.updateMatrix();
    keys.setMatrixAt(i, K.dummy.matrix);
    if ([16, 29, 30, 31].includes(i)) keys.setColorAt(i, new T.Color(C.pink));
  }
  kb.add(keys);
  kb.add(K.box(.42, .035, .058, 0xf3eee0, { pos: [0, .066, .145], r: .014, edges: false }));
  const mouse = K.sphere(.1, C.white, { pos: [2.55, .05, -1.77] }); mouse.scale.set(.7, .42, 1.05); mouse.rotation.y = .6; root.add(mouse);
  root.add(K.box(.4, .012, .48, C.purple, { pos: [2.55, .006, -1.77], rot: [0, .6, 0], r: .006 }));
  ctx.pick(kb, '⌨️ Keyboard & mouse', 'Your commands go to the CPU first (through the OS), never straight to the GPU. Notice the pink W-A-S-D gamer keys!');
  const mug = K.group(K.cyl(.12, .11, .26, C.cyan, { pos: [0, .13, 0] }), K.cyl(.1, .1, .012, C.brown, { pos: [0, .257, 0], edges: false, outline: false }), K.torus(.07, .022, C.cyan, { pos: [.13, .14, 0] }));
  mug.position.set(1.05, 0, .62); mug.rotation.y = -.5; root.add(mug);
  ctx.pick(mug, '☕ Coffee', 'Fuel for the programmer writing GPU code. (Not recommended for the GPU itself.)');

  // cable GPU -> monitor
  const cable = K.tube([[-.2, .92, -1.06], [-.15, .5, -1.25], [.4, .04, -1.6], [1.15, .04, -2.15], [1.33, .35, -2.3]], .025, C.black);
  root.add(cable);

  function tri(g, a, b, c, d, e, f) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); g.stroke(); }
  function drawScreen(n) {
    const g = scr.g, w = 512, h = 300;
    g.lineWidth = 4; g.strokeStyle = '#24243a'; g.lineJoin = 'round';
    if (!n) {
      g.fillStyle = '#1d2033'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8a90b0'; g.font = '38px "Patrick Hand", cursive'; g.textAlign = 'center';
      g.fillText('zzz… waiting for a frame', w / 2, h / 2 + 10);
      scr.tex.needsUpdate = true; return;
    }
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6fd3ff'); sky.addColorStop(1, '#e2f8ff');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const sx = 70 + (n * 41) % 370;
    g.fillStyle = '#ffc928'; g.beginPath(); g.arc(sx, 66, 32, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#8b5cf6'; tri(g, 20, 240, 160, 90, 300, 240);
    g.fillStyle = '#ff3d8b'; tri(g, 200, 240, 340, 110, 490, 240);
    g.fillStyle = '#1fc96b'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, 230); g.quadraticCurveTo(130, 175, 260, 235); g.quadraticCurveTo(390, 190, 512, 225); g.lineTo(512, h); g.closePath(); g.fill(); g.stroke();
    const cx = 90 + (n * 29) % 330;
    g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(cx, 240, 22, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 7, 235, 6, 0, 7); g.arc(cx + 8, 235, 6, 0, 7); g.fill();
    g.fillStyle = '#24243a'; g.beginPath(); g.arc(cx - 6, 236, 3, 0, 7); g.arc(cx + 9, 236, 3, 0, 7); g.fill();
    g.font = '26px "Patrick Hand", cursive'; g.textAlign = 'left'; g.fillText('frame #' + n, 14, 30);
    scr.tex.needsUpdate = true;
  }
  drawScreen(0);

  // labels
  ctx.label(cpu, '🧠 CPU', { off: [0, .28, -.38], cls: 't-blue' });
  ctx.label(ram, '📝 RAM', { off: [0, .52, .38], cls: 't-yellow' });
  ctx.label(ssd, '📚 SSD', { off: [.15, -.14, .1], cls: 't-orange' });
  ctx.label(gpu, '🎨 GPU', { off: [.3, .2, .4], cls: 't-pink' });
  ctx.label(psu, '⚡ PSU', { off: [.3, .12, .3], cls: 't-yellow' });
  ctx.label(mon, '🖥️ Monitor', { off: [0, 1.82, 0], cls: 't-cyan' });

  // packet + burst
  const packet = K.sphere(.11, 0, { mat: K.glow(C.yellow), hull: 1.12 }); packet.visible = false; root.add(packet);
  const burst = K.instanced(new T.BoxGeometry(.05, .05, .05), 40, 0xffffff, true);
  const bcols = [C.pink, C.cyan, C.yellow, C.green, C.purple, C.orange];
  for (let i = 0; i < 40; i++) burst.setColorAt(i, new T.Color(bcols[i % 6]));
  burst.visible = false; root.add(burst);

  const P = {
    ssd: K.V(-.37, .62, -.2), ram: K.V(-.25, 1.55, .1), cpu: K.V(-.36, 1.62, -.3),
    gpu: K.V(.05, .95, -.15), back: K.V(-.2, .92, -1.06)
  };
  mon.updateMatrixWorld(true);
  const pScreen = screen.getWorldPosition(new T.Vector3()).add(K.V(Math.sin(.6) * .08, 0, Math.cos(.6) * .08));
  const hop = (a, b, lift, side) => { const m = a.clone().add(b).multiplyScalar(.5); m.y += lift; m.x += side; return new T.QuadraticBezierCurve3(a.clone(), m, b.clone()); };
  const cableCurve = cable.userData.curve;
  let frameN = 0;

  async function move(a, curve, dur) { await a.tween(dur, e => packet.position.copy(curve.getPoint(e))); }
  function resetGlow() { hot.forEach(m => glowOn(m, false)); }

  ctx.info('👆 Tap any part of the PC', 'Or press <b>▶ Play the data journey</b> to see how one game picture is made.');
  const playBtn = ctx.button('▶ Play the data journey', () => journey(), 'primary');
  ctx.button('⏹ Stop', () => { ctx.stop(); packet.visible = false; burst.visible = false; resetGlow(); });

  function journey() {
    ctx.play(async a => {
      resetGlow(); burst.visible = false;
      packet.visible = true; packet.position.copy(P.ssd);
      glowOn(ssd, true);
      ctx.info('Step 1 · 📚 → 📝 Load', 'The game wakes up: its files are copied from the <b>SSD</b> (long-term memory) into <b>RAM</b> (short-term memory).');
      await a.wait(.6);
      await move(a, hop(P.ssd, P.ram, .2, .5), 1.3);
      glowOn(ssd, false); ram.children.forEach(m => hot.includes(m) && glowOn(m, true));
      await a.wait(.4);
      ctx.info('Step 2 · 🧠 Think', 'The <b>CPU</b> reads the game rules: Where is the player? What moved? It writes a to-do list of things to draw.');
      await move(a, hop(P.ram, P.cpu, .15, .35), .9);
      ram.children.forEach(m => hot.includes(m) && glowOn(m, false)); glowOn(cpuLid, true, 0x2255aa);
      await a.tween(1.1, (e, p) => { packet.scale.setScalar(1 + Math.sin(p * Math.PI * 6) * .35); });
      ctx.info('Step 3 · 🛣️ Send', 'The to-draw list zooms down the <b>PCIe highway</b> to the GPU.');
      await move(a, hop(P.cpu, P.gpu, -.1, .55), 1.0);
      glowOn(cpuLid, false); glowOn(shroud, true, 0x661133);
      ctx.info('Step 4 · 🎨 Paint!', 'The GPU’s <b>thousands of cores</b> color millions of pixels <b>at the same time</b>.');
      packet.visible = false; burst.visible = true;
      const seeds = Array.from({ length: 40 }, () => [Math.random() * 6.28, K.rand(.25, .6), K.rand(-.7, .6), K.rand(1, 3)]);
      await a.tween(1.8, (e, p) => {
        for (let i = 0; i < 40; i++) {
          const s = seeds[i], ang = s[0] + p * s[3] * 3;
          K.dummy.position.set(P.gpu.x - .2 + Math.cos(ang) * s[1] * Math.sin(p * Math.PI), P.gpu.y + Math.sin(ang) * s[1] * .5 * Math.sin(p * Math.PI), P.gpu.z + s[2] * Math.sin(p * Math.PI));
          K.dummy.rotation.set(ang, ang, 0); K.dummy.scale.setScalar(Math.sin(p * Math.PI) + .05); K.dummy.updateMatrix();
          burst.setMatrixAt(i, K.dummy.matrix);
        }
        burst.instanceMatrix.needsUpdate = true;
      }, K.ease.lin);
      burst.visible = false; glowOn(shroud, false);
      ctx.info('Step 5 · 🖥️ Show', 'The finished picture — a <b>frame</b> — travels down the cable to the monitor.');
      packet.visible = true; packet.position.copy(P.back);
      await move(a, hop(P.gpu, P.back, .15, 0), .5);
      await move(a, cableCurve, 1.1);
      await move(a, hop(cableCurve.getPoint(1), pScreen, .3, 0), .4);
      packet.visible = false; drawScreen(++frameN); ctx.pulse(mon);
      await a.wait(.6);
      ctx.info('⚡ Now at full speed!', 'That was slow-motion. In real life the CPU → GPU → screen trip repeats <b>60 to 240 times every second</b>. (The game loads from the SSD only once.)');
      const fast = new T.CatmullRomCurve3([P.cpu, K.V(.3, 1.3, -.2), P.gpu, P.back].concat(cableCurve.points).concat([pScreen]));
      for (let k = 0; k < 14; k++) {
        packet.visible = true;
        await move(a, fast, .32);
        drawScreen(++frameN);
      }
      packet.visible = false;
    });
  }
  playBtn.title = 'Watch one frame being made';

  ctx.home([5.5, 3.4, 2.1], [.55, .85, -.7], 1.35);
  ctx.controls.minPolarAngle = .2; ctx.controls.maxPolarAngle = 1.5;
  ctx.autoRotate(.35);

  return {
    update(dt) {
      cfans.forEach(f => { f.userData.rotor.rotation.z += dt * 6; });
      gfans.forEach(f => { f.userData.rotor.rotation.z += dt * 9; });
    }
  };
});

/* ============ Chapter 2: the OS as a building ============ */
GPU3D.register('os', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.at(K.shadow(6, 3.6), 0, -.08, 0));
  const X = [-1.5, -.5, .5, 1.5];
  const floors = [
    { y: 0, name: '🔩 Hardware', color: C.slate },
    { y: 1.05, name: '🔌 Drivers', color: C.orange },
    { y: 2.1, name: '❤️ Kernel (OS core)', color: C.purple },
    { y: 3.15, name: '📚 Libraries & APIs', color: C.blue },
    { y: 4.2, name: '📱 Apps', color: C.pink }
  ];
  const slabs = floors.map(f => { const s = K.box(4.4, .14, 2.0, f.color, { unique: true }); s.material.emissive = new T.Color(0); s.position.y = f.y; root.add(s); return s; });
  [[-2.12, -.92], [2.12, -.92], [-2.12, .92], [2.12, .92]].forEach(p => root.add(K.cyl(.05, .05, 4.2, C.white, { pos: [p[0], 2.1, p[1]] })));
  floors.forEach((f, i) => ctx.label(K.V(-2.25, f.y + .32, .95), f.name, { cls: 'big' }));
  const slabInfo = [
    ['🔩 Hardware floor', 'The real machines: CPU, RAM, GPU, SSD, speakers. They only understand electrical signals and machine code.'],
    ['🔌 Drivers floor', 'Translators! Each device speaks its own secret language. A <b>driver</b> turns standard OS requests into that device’s commands. The GPU driver is one of the biggest programs on your PC.'],
    ['❤️ Kernel floor', 'The heart of the OS. Its scheduler, memory manager, file system and security guard decide who gets what. Only code here may touch hardware.'],
    ['📚 Libraries & APIs floor', 'Ready-made toolkits apps can call: graphics APIs (DirectX, Vulkan, Metal, OpenGL), file APIs, audio APIs…'],
    ['📱 Apps floor', 'Games, browsers, chat, music. They live in safe <b>user mode</b> and must ask the floors below for everything.']
  ];
  slabs.forEach((s, i) => ctx.pick(s, slabInfo[i][0], slabInfo[i][1]));

  const top = f => floors[f].y + .07;
  const items = {};
  function place(key, obj, f, col, z, title, text, lbl) {
    obj.position.set(X[col], top(f), z || 0); root.add(obj);
    items[key] = obj; if (title) ctx.pick(obj, title, text);
    if (lbl) itemLabels[key] = ctx.label(obj, lbl, { off: [0, .75, .2] }).show(false);
    return obj;
  }
  const itemLabels = {};
  function showLabels(keys) { Object.keys(itemLabels).forEach(k => itemLabels[k].show(keys.includes(k))); }
  // hardware
  const gpuHW = K.group(K.box(.75, .18, .5, C.pink, { pos: [0, .09, 0], unique: true }), K.cyl(.13, .13, .02, C.dark, { pos: [-.17, .19, 0] }), K.cyl(.13, .13, .02, C.dark, { pos: [.17, .19, 0] }));
  place('gpu', gpuHW, 0, 0, 0, '🎨 GPU', 'Paints frames and crunches math. Apps reach it only through the graphics API → kernel → GPU driver.', '🎨 GPU');
  place('ssd', K.group(K.box(.6, .1, .34, C.orange, { pos: [0, .05, 0], unique: true })), 0, 1, 0, '📚 SSD', 'Stores files forever. Reached through the file system and the disk driver.', '📚 SSD');
  const cpuHW = K.group(K.box(.5, .08, .5, C.blue, { pos: [0, .04, 0] }), K.box(.34, .07, .34, C.silver, { pos: [0, .115, 0], unique: true }));
  place('cpu', cpuHW, 0, 2, -.2, '🧠 CPU', 'Runs every app — taking turns, decided by the kernel’s scheduler.', '🧠 CPU');
  place('ram', K.group(K.box(.6, .26, .05, C.yellow, { pos: [0, .13, 0] }), K.box(.6, .26, .05, C.yellow, { pos: [0, .13, .12] })), 0, 2, .55, '📝 RAM', 'The memory manager gives every app its own private part of RAM.');
  const spk = K.group(K.box(.4, .52, .32, C.green, { pos: [0, .26, 0], unique: true }), K.cyl(.13, .13, .03, C.dark, { pos: [0, .3, .17], rot: [Math.PI / 2, 0, 0] }));
  place('spk', spk, 0, 3, 0, '🔊 Speaker', 'Plays sound. Reached through the audio API → kernel → audio driver.', '🔊 Speaker');
  // drivers
  const drv = (c) => K.group(K.box(.55, .36, .4, C.cream, { pos: [0, .18, 0], unique: true }), K.box(.3, .06, .22, c, { pos: [0, .39, 0] }));
  place('dGpu', drv(C.pink), 1, 0, 0, '🔌 GPU driver', 'Turns “draw these triangles” into the GPU’s own machine code and manages its memory.', 'GPU driver');
  place('dSsd', drv(C.orange), 1, 1, 0, '🔌 Disk driver', 'Speaks the SSD’s language (like NVMe).', 'disk driver');
  place('dIn', drv(C.cyan), 1, 2, 0, '🔌 Input driver', 'Reads your mouse, keyboard and touch screen.', 'input driver');
  place('dSnd', drv(C.green), 1, 3, 0, '🔌 Audio driver', 'Sends sound data to the speaker.', 'audio driver');
  // kernel
  const shield = K.group(K.cyl(.28, .28, .07, C.red, { rot: [Math.PI / 2, 0, 0], pos: [0, .35, 0], unique: true }), K.torus(.2, .03, C.yellow, { pos: [0, .35, .04] }), K.box(.06, .26, .1, C.dark, { pos: [0, .1, 0] }));
  place('guard', shield, 2, 0, 0, '🛡️ Security guard', 'Checks every request: is this app allowed? Apps can’t peek into each other’s memory or poke hardware directly.', '🛡️ guard');
  const cab = K.group(K.box(.46, .62, .4, C.cream, { pos: [0, .31, 0], unique: true }));
  [.15, .32, .49].forEach(y => cab.add(K.box(.3, .03, .02, C.dark, { pos: [0, y, .21] })));
  place('fs', cab, 2, 1, 0, '📁 File system', 'The librarian: remembers which bits on the SSD belong to which file and folder.', '📁 files');
  const clock = K.group(K.cyl(.3, .3, .08, C.white, { rot: [Math.PI / 2, 0, 0], pos: [0, .36, 0], unique: true }));
  const hand1 = K.box(.03, .22, .02, C.dark, { pos: [0, .1, 0] }), hand2 = K.box(.025, .15, .02, C.red, { pos: [0, .07, 0] });
  const h1 = K.group(hand1), h2 = K.group(hand2); h1.position.set(0, .36, .05); h2.position.set(0, .36, .06); clock.add(h1, h2);
  place('sched', clock, 2, 2, 0, '⏱️ Scheduler', 'Hands out tiny turns on the CPU (and GPU) so every app makes progress. Press “⏱️ Take turns”!', '⏱️ scheduler');
  const memM = K.group(K.box(.5, .15, .4, C.yellow, { pos: [0, .08, 0], unique: true }), K.box(.4, .15, .34, C.green, { pos: [0, .23, 0] }), K.box(.3, .15, .28, C.cyan, { pos: [0, .38, 0] }));
  place('mem', memM, 2, 3, 0, '🗄️ Memory manager', 'Gives each app its own room in RAM and moves things around (virtual memory) so nobody runs out.', '🗄️ memory');
  // libraries (book stacks)
  const books = (cs) => { const g = new T.Group(); cs.forEach((c, i) => g.add(K.box(.5 - i * .05, .12, .36, c, { pos: [(i % 2) * .03, .06 + i * .12, 0], unique: i === 0 }))); return g; };
  place('gApi', books([C.pink, C.yellow, C.cyan]), 3, 0, 0, '📚 Graphics API', 'DirectX, Vulkan, Metal, OpenGL: a standard menu of drawing commands so a game works on many GPUs.', 'graphics API');
  place('fApi', books([C.orange, C.white]), 3, 1, 0, '📚 File API', 'Standard “open, read, write, close” for files.', 'file API');
  place('sApi', books([C.cyan, C.purple]), 3, 2, 0, '📚 System services', 'Windows, notifications, networking, clipboard…', 'services');
  place('aApi', books([C.green, C.yellow, C.pink]), 3, 3, 0, '📚 Audio API', 'Mixes sounds from many apps and sends them on.', 'audio API');
  // apps
  const ctrl = K.group(K.box(.62, .16, .3, C.purple, { pos: [0, .2, 0], unique: true }), K.cyl(.1, .1, .3, C.purple, { pos: [-.27, .14, 0], rot: [Math.PI / 2, 0, 0] }), K.cyl(.1, .1, .3, C.purple, { pos: [.27, .14, 0], rot: [Math.PI / 2, 0, 0] }), K.sphere(.035, C.red, { pos: [.15, .3, 0] }), K.sphere(.035, C.yellow, { pos: [.08, .3, -.06] }), K.box(.14, .03, .04, C.dark, { pos: [-.15, .29, 0] }), K.box(.04, .03, .14, C.dark, { pos: [-.15, .29, 0] }));
  place('game', ctrl, 4, 0, 0, '🎮 Game app', 'Wants to draw 60+ frames a second. It asks the graphics API, never the GPU directly.', '🎮 game');
  const notes = K.group(K.box(.4, .5, .04, C.white, { pos: [0, .27, 0], unique: true }), K.cyl(.025, .025, .45, C.yellow, { pos: [.25, .27, .08], rot: [0, 0, .5] }));
  [.38, .3, .22, .14].forEach(y => notes.add(K.box(.28, .015, .01, C.blue, { pos: [0, y, .03] })));
  place('notes', notes, 4, 1, 0, '📝 Notes app', 'Wants to save your homework to the SSD.', '📝 notes');
  const chat = K.group(K.mesh(new T.SphereGeometry(.26, 18, 12), C.green, { edges: false, hull: 1.06, pos: [0, .3, 0], unique: true }), K.cone(.08, .16, C.green, { pos: [-.18, .1, 0], rot: [0, 0, 2.4] }));
  chat.children[0].scale.set(1.25, .85, .8);
  place('chat', chat, 4, 2, 0, '💬 Chat app', 'Waits for messages. Gets CPU turns from the scheduler like everyone else.', '💬 chat');
  const note = K.group(K.sphere(.11, C.purple, { pos: [-.06, .14, 0], unique: true }), K.cyl(.025, .025, .45, C.purple, { pos: [.04, .37, 0] }), K.box(.16, .07, .04, C.purple, { pos: [.11, .56, 0], rot: [0, 0, -.4] }));
  place('music', note, 4, 3, 0, '🎵 Music app', 'Sends sound to the speaker through the audio API.', '🎵 music');

  // kernel wall (user vs kernel mode)
  const wy = 2.62;
  root.add(K.line([[-2.35, wy, -1.12], [2.35, wy, -1.12], [2.35, wy, 1.12], [-2.35, wy, 1.12], [-2.35, wy, -1.12]], C.red, { dashed: true, dash: .16, gap: .1 }));
  ctx.label(K.V(2.35, wy, 1.12), '🔒 kernel wall', { cls: 't-red' });

  // moving requests
  const ball = K.sphere(.11, 0, { mat: K.glow(C.yellow) }); ball.visible = false; root.add(ball);
  const reply = K.sphere(.09, 0, { mat: K.glow(C.green) }); reply.visible = false; root.add(reply);
  const beam = new T.Mesh(new T.CylinderGeometry(.035, .035, 1, 8), K.glow(C.yellow, true)); beam.visible = false; root.add(beam);

  function mainMesh(o) { let m = null; o.traverse(c => { if (!m && c.userData.unique) m = c; }); return m; }
  function flash(o, col) { const m = mainMesh(o); if (m) m.material.emissive.setHex(col || 0x664400); }
  function unflash(o) { const m = mainMesh(o); if (m) m.material.emissive.setHex(0); }
  function allOff() { Object.keys(items).forEach(k => unflash(items[k])); slabs.forEach(s => s.material.emissive.setHex(0)); }

  const routes = {
    game: { keys: ['game', 'gApi', 'guard', 'dGpu', 'gpu'], col: 0, steps: [
      ['🎮 The game: “draw this frame!”', 'The request starts on the <b>apps floor</b> (user mode).'],
      ['📚 Graphics API', 'It calls DirectX / Vulkan / Metal — a standard menu of drawing commands.'],
      ['❤️ Kernel + 🛡️ guard', 'The request crosses the 🔒 kernel wall. The kernel checks permission and queues the work.'],
      ['🔌 GPU driver', 'The driver translates the commands into the GPU’s own machine code.'],
      ['🎨 GPU paints!', 'The GPU runs the work and paints the frame into its memory.'],
      ['✅ Frame ready', 'The answer travels back up: “done — send me the next frame!” Then it all repeats 60+ times a second.']] },
    save: { keys: ['notes', 'fApi', 'fs', 'dSsd', 'ssd'], col: 1, steps: [
      ['📝 Notes: “save my homework!”', 'The app asks to write a file.'],
      ['📚 File API', 'A standard “open → write → close” request.'],
      ['❤️ Kernel · 📁 file system', 'The librarian picks free spots on the SSD and records them.'],
      ['🔌 Disk driver', 'Speaks the SSD’s language (NVMe).'],
      ['📚 SSD stores it', 'Saved! It stays there even when the power is off.'],
      ['✅ “Saved!”', 'A reply travels back up so the app can show the ✓.']] },
    music: { keys: ['music', 'aApi', 'mem', 'dSnd', 'spk'], col: 3, steps: [
      ['🎵 Music: “play this song!”', 'The app has sound samples ready.'],
      ['📚 Audio API', 'Mixes your song with other sounds (like chat dings).'],
      ['❤️ Kernel · 🗄️ memory', 'The kernel gives the sound a buffer in memory and keeps it flowing on time.'],
      ['🔌 Audio driver', 'Sends the samples to the sound chip.'],
      ['🔊 Speaker', 'Your song plays! 🎶'],
      ['✅ More please', 'The driver asks for the next chunk of sound, again and again.']] }
  };
  function itemPos(k) { const p = items[k].position.clone(); p.y += .4; p.z += .42; return p; }

  function runRoute(name) {
    const r = routes[name];
    ctx.play(async a => {
      allOff(); beam.visible = false; reply.visible = false;
      ball.visible = true; showLabels(r.keys);
      const pts = r.keys.map(itemPos);
      ball.position.copy(pts[0]);
      for (let i = 0; i < pts.length; i++) {
        ctx.info(r.steps[i][0], r.steps[i][1]);
        flash(items[r.keys[i]]); ctx.pulse(items[r.keys[i]]);
        slabs[4 - i].material.emissive.setHex(0x221133);
        await a.wait(i === pts.length - 1 ? 1.0 : .7);
        if (i < pts.length - 1) {
          const p0 = pts[i], p1 = pts[i + 1];
          await a.tween(.75, e => ball.position.lerpVectors(p0, p1, e));
        }
        slabs[4 - i].material.emissive.setHex(0);
      }
      if (name === 'game') { const m = mainMesh(items.gpu); for (let k = 0; k < 6; k++) { m.material.emissive.setHex(k % 2 ? 0 : 0x993366); await a.wait(.12); } }
      if (name === 'music') { await a.tween(1, (e, p) => items.spk.scale.setScalar(1 + Math.sin(p * Math.PI * 8) * .06)); }
      ball.visible = false; reply.visible = true;
      ctx.info(r.steps[5][0], r.steps[5][1]);
      const up = pts.slice().reverse();
      for (let i = 0; i < up.length - 1; i++) {
        const p0 = up[i], p1 = up[i + 1];
        await a.tween(.32, e => reply.position.lerpVectors(p0, p1, e));
      }
      reply.visible = false; allOff();
    });
  }
  const appKeys = ['game', 'notes', 'chat', 'music'], appCols = [0x8b5cf6, 0xffffff, 0x1fc96b, 0x8b5cf6], beamCols = [C.purple, C.cyan, C.green, C.pink];
  let spinning = false;
  function runSched() {
    ctx.play(async a => {
      allOff(); ball.visible = false; reply.visible = false; spinning = true;
      showLabels(['game', 'notes', 'chat', 'music', 'cpu', 'sched']);
      ctx.info('⏱️ Taking turns', 'The scheduler gives each app a tiny turn on the CPU (a few milliseconds), then switches. So fast it looks like they all run at once!');
      const cpuP = items.cpu.position.clone().add(K.V(0, .2, 0));
      for (let k = 0; k < 24; k++) {
        const i = k % 4, app = items[appKeys[i]];
        const p1 = app.position.clone().add(K.V(0, .15, 0));
        const mid = cpuP.clone().add(p1).multiplyScalar(.5), len = cpuP.distanceTo(p1);
        beam.position.copy(mid); beam.scale.set(1, len, 1);
        beam.quaternion.setFromUnitVectors(K.V(0, 1, 0), p1.clone().sub(cpuP).normalize());
        beam.material.color.setHex(beamCols[i]); beam.visible = true;
        allOff(); flash(app, 0x553300); mainMesh(items.cpu).material.emissive.setHex(0x223366);
        app.position.y += .08;
        await a.wait(k < 8 ? .55 : .22);
        app.position.y -= .08;
      }
      beam.visible = false; allOff(); spinning = false;
      ctx.info('✅ Everyone got turns', 'Real computers switch hundreds to thousands of times per second. The GPU is shared the same way: the OS queues each app’s GPU work and takes turns.');
    });
  }
  ctx.modes(['🎮 Game draws', '💾 Save a file', '🎵 Play music', '⏱️ Take turns'], i => {
    spinning = false; beam.visible = false;
    [() => runRoute('game'), () => runRoute('save'), () => runRoute('music'), runSched][i]();
  }, -1);
  ctx.info('🏢 The OS building', 'Tap a floor or an object, or press a button to send a request down the floors.');
  ctx.home([6.3, 5.4, 9.0], [0, 2.3, 0], 1.15);
  ctx.autoRotate(.3);
  return {
    update(dt) {
      h1.rotation.z -= dt * (spinning ? 9 : .8);
      h2.rotation.z -= dt * (spinning ? .9 : .07);
    }
  };
});

/* ============ Chapter 3: CPU vs GPU race ============ */
GPU3D.register('cpuvsgpu', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  const N = 32, TT = N * N;
  const chipZ = -.95, gridZ = 1.45;
  // each side is a "pair" (chip + its picture) so the layout can change for phones
  const pairC = new T.Group(), pairG = new T.Group(); root.add(pairC, pairG);
  pairC.add(K.at(K.shadow(3, 3), 0, 0, chipZ)); pairG.add(K.at(K.shadow(3, 3), 0, 0, chipZ));

  // CPU chip
  const cpu = K.group(K.box(2.2, .12, 2.2, C.pcb, { pos: [0, .06, 0] }), K.box(1.75, .1, 1.75, C.dark, { pos: [0, .17, 0] }));
  cpu.position.set(0, 0, chipZ); pairC.add(cpu);
  const cores = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const m = K.box(.34, .22, .5, C.blue, { unique: true, pos: [-.6 + c * .4, .33, -.38 + r * .6] });
    m.material.emissive = new T.Color(0); cpu.add(m); cores.push(m);
  }
  cpu.add(K.box(1.5, .12, .22, C.yellow, { pos: [0, .28, .7] }));
  ctx.pick(cpu, '🧠 CPU: 8 big cores', 'Each blue block is one big, clever, very fast core with lots of helpers (caches, branch predictors). The yellow strip is a big cache.');

  // GPU chip with 1024 tiny cores
  const gpu = K.group(K.box(2.2, .12, 2.2, C.pcb, { pos: [0, .06, 0] }), K.box(1.95, .1, 1.95, C.dark, { pos: [0, .17, 0] }));
  gpu.position.set(0, 0, chipZ); pairG.add(gpu);
  const gcores = K.instanced(K.rgeo(.046, .07, .046, .012, 1), TT, 0xffffff);
  const idleC = new T.Color(0xd56b9a), hotC = new T.Color(0xfff17a), doneC = new T.Color(0x6fe3a1);
  for (let i = 0; i < TT; i++) {
    const x = i % N, y = Math.floor(i / N);
    K.dummy.position.set((x - 15.5) * .056, .255, (y - 15.5) * .056); K.dummy.rotation.set(0, 0, 0); K.dummy.scale.set(1, 1, 1); K.dummy.updateMatrix();
    gcores.setMatrixAt(i, K.dummy.matrix); gcores.setColorAt(i, idleC);
  }
  gpu.add(gcores);
  ctx.pick(gpu, '🎨 GPU: 1,024 tiny cores', 'Each pink dot is a small, simple core. One alone is slower than a CPU core — but there are SO many! Real GPUs have about 2,000 to 20,000+ of them.');

  // job grids (pixel art)
  function pix(x, y) {
    const u = (x - 15.5) / 11.5, v = (15.5 - y) / 11.5 + .12;
    if ((u + .45) ** 2 + (v - .55) ** 2 < .03) return 0xffffff;
    if (Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v <= 0) return y < 13 ? 0xff3d8b : 0xff5470;
    return [0x8fd8ff, 0xb9ecff, 0xffe28a, 0xc6f3d6][Math.floor((x + y) / 5) % 4];
  }
  const art = []; for (let i = 0; i < TT; i++) art.push(new T.Color(pix(i % N, Math.floor(i / N))));
  const blankC = new T.Color(0xece6d6), workC = new T.Color(0xffffff);
  function makeGrid(parent) {
    const g = K.instanced(new T.BoxGeometry(.053, .035, .053), TT, 0xece6d6);
    for (let i = 0; i < TT; i++) { K.dummy.position.set((i % N - 15.5) * .06, .02, gridZ + (Math.floor(i / N) - 15.5) * .06); K.dummy.updateMatrix(); g.setMatrixAt(i, K.dummy.matrix); }
    parent.add(g); parent.add(K.box(2.05, .02, 2.05, C.white, { pos: [0, 0, gridZ] })); return g;
  }
  const cGrid = makeGrid(pairC), gGrid = makeGrid(pairG);

  // puzzle stones
  const stones = { c: [], g: [] };
  for (let i = 0; i < 10; i++) {
    ['c', 'g'].forEach(s => {
      const m = K.box(.26, .12, .26, C.cream, { unique: true }); m.material.emissive = new T.Color(0);
      m.position.set(-.95 + (i % 5) * .48, .06, gridZ - .3 + Math.floor(i / 5) * .6);
      m.visible = false; (s === 'c' ? pairC : pairG).add(m); stones[s].push(m);
    });
  }

  ctx.label(pairC, '🧠 CPU · 8 big cores', { off: [0, .55, chipZ - 1.05], cls: 'big t-blue' });
  ctx.label(pairG, '🎨 GPU · 1,024 tiny cores', { off: [0, .55, chipZ - 1.05], cls: 'big t-pink' });
  const tC = ctx.label(pairC, '⏱ 0.0 s', { off: [0, .1, gridZ + 1.25], cls: 'big' });
  const tG = ctx.label(pairG, '⏱ 0.0 s', { off: [0, .1, gridZ + 1.25], cls: 'big' });
  const zz = ctx.label(pairG, '😴 1,023 cores have nothing to do', { off: [0, .75, chipZ + .3], cls: 't-yellow' }); zz.show(false);

  let mode = 0, running = false, t = 0, cDone = 0, gRows = 0, cFin = 0, gFin = 0;
  function reset() {
    running = false; t = 0; cDone = 0; gRows = 0; cFin = 0; gFin = 0;
    for (let i = 0; i < TT; i++) { cGrid.setColorAt(i, blankC); gGrid.setColorAt(i, blankC); gcores.setColorAt(i, idleC); }
    cGrid.instanceColor.needsUpdate = gGrid.instanceColor.needsUpdate = gcores.instanceColor.needsUpdate = true;
    cores.forEach(m => m.material.emissive.setHex(0));
    stones.c.concat(stones.g).forEach(m => { m.material.color.setHex(C.cream); m.material.emissive.setHex(0); m.visible = mode === 1; });
    cGrid.visible = gGrid.visible = mode === 0;
    tC.set('⏱ 0.0 s'); tG.set('⏱ 0.0 s'); zz.show(false);
  }
  const CPU_STEP = .055, GPU_TASK = .6, ROW_STAG = .01;
  const S_CPU = .28, S_GPU = 1.1;
  function race() {
    reset(); running = true;
    if (mode === 0) ctx.info('🏁 Race: paint 1,024 tiles!', 'CPU: 8 fast cores take turns, 8 tiles at a time. GPU: every tiny core grabs ONE tile and they all paint together.');
    else { ctx.info('🧩 Race: step-by-step puzzle', 'Each step needs the answer from the step before — so only ONE worker can help at a time. The fast CPU core wins!'); zz.show(true); }
  }
  ctx.modes(['🧱 Big repeated job', '🧩 Step-by-step puzzle'], i => { mode = i; reset(); race(); }, 0);
  ctx.button('▶ Race!', race, 'primary');
  ctx.button('↺ Reset', reset);
  reset();
  ctx.info('🏁 Who paints faster?', 'Press <b>▶ Race!</b> The tiles in front of each chip form a picture when they’re done.');

  let narrow = null;
  function layout(w, h) {
    const n = w / h < 1.1;
    if (n === narrow) return;
    narrow = n;
    if (n) {
      pairC.position.set(0, 0, -2.1); pairG.position.set(0, 0, 2.4); ctx.home([0, 12.6, 6.6], [0, 0, .3], .75);
      tC.off.set(1.45, .1, gridZ); tG.off.set(1.45, .1, gridZ);
    } else {
      pairC.position.set(-2.45, 0, 0); pairG.position.set(2.45, 0, 0); ctx.home([0, 5.7, 6.4], [0, 0, .3], 1.4);
      tC.off.set(0, .1, gridZ + 1.25); tG.off.set(0, .1, gridZ + 1.25);
    }
  }
  layout(ctx.stage.clientWidth || 4, ctx.stage.clientHeight || 3);
  return {
    onResize: layout,
    update(dt) {
      if (!running) return;
      t += dt;
      if (mode === 0) {
        // CPU: 8 tiles per step
        if (!cFin) {
          const n = Math.min(TT, Math.floor(t / CPU_STEP) * 8);
          for (let i = cDone; i < n; i++) cGrid.setColorAt(i, art[i]);
          if (n < TT) for (let i = n; i < Math.min(TT, n + 8); i++) cGrid.setColorAt(i, workC);
          cDone = n; cGrid.instanceColor.needsUpdate = true;
          const ph = Math.floor(t / CPU_STEP) % 2;
          cores.forEach((m, k) => m.material.emissive.setHex(ph === k % 2 ? 0x2a5cff : 0x0a1a55));
          tC.set('⏱ ' + t.toFixed(1) + ' s');
          if (n >= TT) { cFin = t; cores.forEach(m => m.material.emissive.setHex(0)); tC.set('✅ ' + t.toFixed(1) + ' s'); }
        }
        // GPU: rows of 32 start in a quick wave, each takes GPU_TASK
        if (!gFin) {
          for (let r = 0; r < N; r++) {
            const st = r * ROW_STAG, fin = st + GPU_TASK;
            const col = t >= fin ? doneC : t >= st ? hotC : idleC;
            for (let x = 0; x < N; x++) gcores.setColorAt(r * N + x, col);
            if (t >= fin && r >= gRows) { for (let x = 0; x < N; x++) gGrid.setColorAt(r * N + x, art[r * N + x]); gRows = r + 1; }
            else if (t >= st && t < fin) for (let x = 0; x < N; x++) gGrid.setColorAt(r * N + x, workC);
          }
          gcores.instanceColor.needsUpdate = gGrid.instanceColor.needsUpdate = true;
          tG.set('⏱ ' + t.toFixed(1) + ' s');
          if (gRows >= N) {
            gFin = t; tG.set('✅ ' + t.toFixed(2) + ' s');
            for (let i = 0; i < TT; i++) gcores.setColorAt(i, idleC); gcores.instanceColor.needsUpdate = true;
            ctx.info('🎨 GPU finished first!', 'All 1,024 tiles were painted at the same time. The CPU is still going, 8 tiles at a time…');
          }
        }
        if (cFin && gFin) { running = false; ctx.info('🏆 GPU wins big jobs!', 'GPU: <b>' + gFin.toFixed(2) + ' s</b> · CPU: <b>' + cFin.toFixed(1) + ' s</b>. Lots of small workers beat a few fast ones when the job can be split up. Now try the 🧩 puzzle!'); }
      } else {
        const ci = Math.min(10, Math.floor(t / S_CPU)), gi = Math.min(10, Math.floor(t / S_GPU));
        stones.c.forEach((m, i) => { m.material.color.setHex(i < ci ? C.green : i === ci ? C.yellow : C.cream); });
        stones.g.forEach((m, i) => { m.material.color.setHex(i < gi ? C.green : i === gi ? C.yellow : C.cream); });
        cores.forEach((m, k) => m.material.emissive.setHex(k === 0 && ci < 10 ? 0x2a5cff : 0));
        const mid = 16 * N + 16;
        gcores.setColorAt(mid, gi < 10 ? hotC : idleC); gcores.instanceColor.needsUpdate = true;
        if (ci < 10) tC.set('⏱ ' + t.toFixed(1) + ' s'); else if (!cFin) { cFin = t; tC.set('✅ ' + (10 * S_CPU).toFixed(1) + ' s'); ctx.info('🧠 CPU finished first!', 'Its one fast core zipped through the steps. The GPU can only use ONE of its slow little cores here…'); }
        if (gi < 10) tG.set('⏱ ' + t.toFixed(1) + ' s'); else if (!gFin) { gFin = t; tG.set('✅ ' + (10 * S_GPU).toFixed(1) + ' s'); }
        if (cFin && gFin) { running = false; zz.show(false); ctx.info('🏆 CPU wins step-by-step jobs!', 'When every step needs the one before, extra workers can’t help. That’s why computers have <b>both</b>: the CPU for tricky sequences, the GPU for giant piles of similar work.'); }
      }
    }
  };
});

/* ============ Chapter 4: wheel of wonders ============ */
GPU3D.register('uses', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  root.add(K.shadow(8.5, 8.5));
  const R = 3.3;
  const ring = new T.Group(); root.add(ring);

  // center: mini graphics card
  const core = K.group(K.cyl(.7, .8, .3, C.white, { pos: [0, .15, 0] }), K.box(1.3, .26, .62, C.pink, { pos: [0, .5, 0] }));
  [-.3, .3].forEach(x => { const f = K.fan(.22, C.dark, 7); f.rotation.x = -Math.PI / 2; f.position.set(x, .64, 0); core.add(f); });
  root.add(core);
  ctx.pick(core, '🎨 The GPU', 'One kind of chip, a thousand jobs! Tap the things around me.');
  ctx.label(core, '🎨 GPU', { off: [0, 1.05, 0], cls: 'big t-pink' });

  const build = {
    game() {
      const g = K.group(K.box(.9, .24, .44, C.purple), K.cyl(.15, .15, .44, C.purple, { pos: [-.4, -.07, 0], rot: [Math.PI / 2, 0, 0] }), K.cyl(.15, .15, .44, C.purple, { pos: [.4, -.07, 0], rot: [Math.PI / 2, 0, 0] }));
      g.add(K.box(.24, .05, .07, C.dark, { pos: [-.22, .14, 0] }), K.box(.07, .05, .24, C.dark, { pos: [-.22, .14, 0] }));
      [[.2, 0, C.red], [.3, -.08, C.yellow], [.3, .08, C.green], [.4, 0, C.cyan]].forEach(b => g.add(K.sphere(.045, b[2], { pos: [b[0], .15, b[1]] })));
      return g;
    },
    robot() {
      const g = K.group(K.box(.66, .56, .56, C.silver));
      [-.15, .15].forEach(x => g.add(K.sphere(.08, 0, { mat: K.glow(C.cyan), pos: [x, .06, .29] })));
      g.add(K.box(.3, .05, .02, C.dark, { pos: [0, -.14, .29] }), K.cyl(.02, .02, .25, C.dark, { pos: [0, .4, 0] }), K.sphere(.06, 0, { mat: K.glow(C.red), pos: [0, .55, 0] }));
      [-.36, .36].forEach(x => g.add(K.cyl(.1, .1, .08, C.orange, { pos: [x, 0, 0], rot: [0, 0, Math.PI / 2] })));
      return g;
    },
    movie() {
      const g = K.group(K.box(.8, .5, .08, C.black, { pos: [0, -.05, 0] }));
      for (let i = 0; i < 4; i++) g.add(K.box(.08, .5, .01, C.white, { pos: [-.3 + i * .2, -.05, .045] }));
      const arm = K.group(K.box(.82, .12, .09, C.white));
      for (let i = 0; i < 4; i++) arm.add(K.box(.1, .12, .095, C.black, { pos: [-.3 + i * .2, 0, 0] }));
      arm.position.set(0, .3, 0); arm.rotation.z = .28; g.add(arm);
      return g;
    },
    dna() {
      const g = new T.Group();
      for (let i = 0; i < 13; i++) {
        const a = i * .52, y = i * .075 - .45, r = .27;
        g.add(K.sphere(.06, C.pink, { pos: [Math.cos(a) * r, y, Math.sin(a) * r] }));
        g.add(K.sphere(.06, C.cyan, { pos: [-Math.cos(a) * r, y, -Math.sin(a) * r] }));
        const rung = K.cyl(.015, .015, r * 2, i % 2 ? C.yellow : C.green, { edges: false }); rung.rotation.set(0, -a, Math.PI / 2); rung.position.y = y; g.add(rung);
      }
      return g;
    },
    car() {
      const g = K.group(K.box(1.0, .24, .5, C.red, { pos: [0, .02, 0] }), K.box(.55, .22, .44, C.cyan, { pos: [-.05, .25, 0] }));
      [[-.32, .26], [.32, .26], [-.32, -.26], [.32, -.26]].forEach(p => g.add(K.cyl(.13, .13, .1, C.black, { pos: [p[0], -.1, p[1]], rot: [Math.PI / 2, 0, 0] })));
      const lid = K.cyl(.07, .07, .09, C.yellow, { pos: [-.05, .41, 0] }); g.add(lid); g.userData.spin = lid;
      return g;
    },
    weather() {
      const g = new T.Group();
      [[0, .1, 0, .3], [.28, .05, 0, .24], [-.28, .03, 0, .23], [.12, .28, 0, .22], [-.13, .25, .02, .2]].forEach(s => g.add(K.sphere(s[3], C.white, { pos: [s[0], s[1], s[2]], seg: 16, seg2: 12 })));
      const sh = new T.Shape(); [[0, 0], [.12, 0], [.05, -.2], [.16, -.2], [-.06, -.56], [0, -.28], [-.1, -.28]].forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
      const bolt = K.mesh(new T.ExtrudeGeometry(sh, { depth: .06, bevelEnabled: false }), C.yellow, { th: 20 });
      bolt.position.set(-.02, -.12, .08); g.add(bolt);
      return g;
    },
    art() {
      const pal = K.cyl(.45, .45, .06, C.cream); pal.scale.z = .8;
      const g = K.group(pal);
      [C.pink, C.cyan, C.yellow, C.green, C.purple].forEach((c, i) => { const a = i * 1.1 + .4; g.add(K.sphere(.07, c, { pos: [Math.cos(a) * .28, .06, Math.sin(a) * .22] })); });
      const brush = K.group(K.cyl(.03, .03, .7, C.brown), K.cone(.05, .14, C.pink, { pos: [0, -.42, 0], rot: [Math.PI, 0, 0] }));
      brush.position.set(.1, .3, 0); brush.rotation.z = -.9; g.add(brush);
      g.rotation.x = .5;
      return g;
    },
    space() {
      const g = K.group(K.sphere(.33, C.orange), K.torus(.52, .035, C.yellow, { rot: [1.25, 0, .2] }), K.sphere(.07, C.white, { pos: [.62, .25, 0] }));
      return g;
    }
  };
  const list = [
    ['game', '🎮 Games', 'Every frame of a game — mountains, monsters, water, shadows — is painted by the GPU, often 60–240 times per second.', C.purple],
    ['robot', '🤖 AI helpers', 'Chatbots, voice assistants and translators learn by doing trillions of multiplications. Training a big AI model can keep thousands of GPUs busy for weeks.', C.cyan],
    ['movie', '🎬 Movies', 'Animated films and visual effects calculate how light bounces around every scene. Some frames take hours even on powerful machines.', C.yellow],
    ['dna', '🧬 Science & medicine', 'GPUs help predict how proteins fold, test medicines in simulation and spot problems in X-rays and scans.', C.pink],
    ['car', '🚗 Self-driving & robots', 'Cameras and sensors create floods of data; GPUs recognize cars, people and signs many times every second.', C.green],
    ['weather', '🌦️ Weather & climate', 'The air is split into millions of little boxes; GPUs update all the boxes at once to forecast storms and study the climate.', C.blue],
    ['art', '🎨 Art & video', 'Photo filters, video editing, live streaming and AI image generators all lean on the GPU.', C.orange],
    ['space', '🪐 Space & physics', 'Simulating galaxies, black holes or a car crash means updating millions of particles every step — perfect for GPUs.', C.red]
  ];
  const n = list.length, nodes = [];
  list.forEach((it, i) => {
    const a = i / n * Math.PI * 2;
    const g = new T.Group(); g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); ring.add(g);
    g.add(K.cyl(.55, .62, .26, it[3], { pos: [0, .13, 0] }));
    const obj = build[it[0]](); obj.position.y = .95; g.add(obj);
    ctx.pick(g, it[1], it[2]);
    const L = ctx.label(g, it[1], { off: [0, 1.75, 0] });
    nodes.push({ g, obj, a, L, i });
    root.add(K.line([[0, .35, 0], [Math.sin(a) * (R - .6), .2, Math.cos(a) * (R - .6)]], C.gray, { dashed: true }));
  });
  // dashed lines should rotate with ring
  root.children.filter(c => c.isLine).forEach(l => { root.remove(l); ring.add(l); });

  let target = 0, cur = 0, hold = 0, sel = -1;
  function select(i) {
    sel = (i + n) % n;
    let tgt = -nodes[sel].a;
    while (tgt - cur > Math.PI) tgt -= Math.PI * 2;
    while (tgt - cur < -Math.PI) tgt += Math.PI * 2;
    target = tgt; hold = 9;
    ctx.info(list[sel][1], list[sel][2]);
    status.innerHTML = (sel + 1) + ' / ' + n;
  }
  ctx.button('◀', () => select((sel < 0 ? 0 : sel) - 1));
  ctx.button('Next ▶', () => select(sel + 1), 'primary');
  const status = ctx.status('');
  ctx.info('🎡 The wheel of wonders', 'Press <b>Next ▶</b> or tap an object to see what GPUs do in the real world.');
  ctx.home([0, 5.4, 9.2], [0, .7, 0], 1.3);
  return {
    onPick(obj) { const k = nodes.findIndex(nd => nd.g === obj); if (k >= 0) { select(k); return true; } },
    update(dt, t) {
      if (hold > 0) { hold -= dt; } else { target += dt * .12; }
      cur += (target - cur) * Math.min(1, dt * 3);
      ring.rotation.y = cur;
      nodes.forEach(nd => {
        const wa = nd.a + cur; const front = Math.cos(wa);
        const s = 1 + Math.max(0, front) * .3;
        nd.obj.scale.setScalar(s);
        nd.obj.rotation.y = t * .6 + nd.i;
        nd.obj.position.y = .95 + Math.sin(t * 2 + nd.i) * .07;
        nd.L.el.classList.toggle('hot', nd.i === sel);
        nd.L.show(front > -.2 || nd.i === sel);
        if (nd.obj.userData.spin) nd.obj.userData.spin.rotation.y += dt * 8;
      });
      core.children.forEach(c => { if (c.userData.rotor) c.userData.rotor.rotation.z += dt * 8; });
    }
  };
});
