/* Chapter 8 — 3D Data Center World (three.js r128)
   A natural low-poly diorama: two data-center campuses (US & EU) separated by an ocean
   channel, towns, trees, mountains, sky, day/night (follows the site theme). */
(function () {
  const { $, $$ } = SD;
  const stage = $("#stage");
  const hasGL = () => { try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { return false; } };
  if (!window.THREE || !hasGL()) { stage.classList.add("fail"); $("#loading3d").remove(); return; }

  const HEX = { yellow: 0xffd43b, red: 0xff6b6b, green: 0x51cf66, teal: 0x3bc9db, purple: 0x9775fa, pink: 0xf783ac, orange: 0xffa94d, blue: 0x4dabf7, gray: 0xadb5bd, white: 0xf8f9fa, dark: 0x343a40, cream: 0xfff3bf };
  const INFO = {
    users: ["👥 Users", "People on phones and laptops. Every tap sends a request into the system."],
    dns: ["📖 DNS / GeoDNS", "The internet's phone book. GeoDNS also sends you to the closest healthy region."],
    cdn: ["🌐 CDN edge", "A small shop near users holding copies of images, videos and scripts."],
    lb: ["🚦 Load balancer", "The host at the door: spreads requests across healthy servers and skips broken ones."],
    app: ["🖥️ App server", "Runs the code. Stateless, so we can add or remove copies any time."],
    cache: ["⚡ Cache", "Super-fast memory for popular answers (like Redis). Saves trips to the database."],
    dbp: ["🗄️ Primary database", "The source of truth. All writes go here first."],
    dbr: ["📠 Replica database", "A copy of the primary. Serves reads and can be promoted if the primary dies."],
    queue: ["📬 Message queue", "A waiting line of jobs to do later, so users don't have to wait."],
    worker: ["👷 Worker", "Background helper robot that picks jobs off the queue (resize photos, send emails…)."],
    s3: ["🪣 Object storage", "Cheap, durable storage for big files: photos, videos, backups."],
  };

  let renderer, scene, camera, controls, glowTex, cableMesh, cutLab, sky, hemi, sun, sunSprite, moon, stars, water, fiberMat, landMats = [];
  const nodes = {}, clickables = [], packets = [], pops = [];
  const anim = { spin: [], fans: [], bob: [], flags: [], clouds: [], windows: [], cars: [], boats: [], birds: [], nightGlow: [] };
  let showLabels = true, showLoad = true, GEN = 0, qLen = 0, qCubes = [], fly = null, nightK = 1, waterGeo = null, waterBase = null;
  let reqTimes = [], cutOn = false, hovered = null, hudT = 0;
  /* how much "load" one arriving packet adds, per machine type (meters decay over time) */
  const LOAD = { app: 0.45, cache: 0.08, db: 0.3, lb: 0.04 };
  /* sandbox stats */
  const SB = { spike: false, ok: 0, err: 0, lat: [], rr: { A: 0, B: 0 } };
  const TOGGLE = new Set(["lb", "app", "cache", "db", "queue", "worker", "s3"]);
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const GRAY = C(0x80868e), BLACK = new THREE.Color(0, 0, 0), MC = { g: C(0x40c057), y: C(0xfab005), r: C(0xfa5252) };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ---------- labels (canvas sprites, always readable) ---------- */
  function labelTexture(text, o = {}) {
    const fs = o.small ? 34 : 44, pad = 18, c = document.createElement("canvas"), ctx = c.getContext("2d");
    ctx.font = `${fs}px "Patrick Hand", "Comic Sans MS", cursive`;
    const tw = Math.ceil(ctx.measureText(text).width);
    c.width = tw + pad * 2; c.height = fs + 26;
    ctx.font = `${fs}px "Patrick Hand", "Comic Sans MS", cursive`;
    const r = 14, w = c.width - 4, h = c.height - 4;
    ctx.fillStyle = o.bg || "#fffdf6"; ctx.strokeStyle = "#1f2430"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(2 + r, 2); ctx.lineTo(2 + w - r, 2); ctx.quadraticCurveTo(2 + w, 2, 2 + w, 2 + r); ctx.lineTo(2 + w, 2 + h - r); ctx.quadraticCurveTo(2 + w, 2 + h, 2 + w - r, 2 + h);
    ctx.lineTo(2 + r, 2 + h); ctx.quadraticCurveTo(2, 2 + h, 2, 2 + h - r); ctx.lineTo(2, 2 + r); ctx.quadraticCurveTo(2, 2, 2 + r, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.fg || "#1f2430"; ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillText(text, c.width / 2, c.height / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.anisotropy = 4; t.encoding = THREE.sRGBEncoding;
    return { t, aspect: c.width / c.height };
  }
  function makeLabel(text, o = {}) {
    const { t, aspect } = labelTexture(text, o);
    // sizeAttenuation:false keeps labels the same readable size on screen at any zoom
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false, toneMapped: false }));
    const aspect0 = stage.clientWidth / Math.max(1, stage.clientHeight); // portrait phones get smaller labels
    const H = (o.small ? 0.028 : 0.036) * (o.scale || 1) * SD.clamp(aspect0 * 0.85, 0.55, 1);
    s.scale.set(H * aspect, H, 1); s.renderOrder = 10; s.userData.o = o;
    return s;
  }
  function relabel(s, text) { const { t, aspect } = labelTexture(text, s.userData.o); s.material.map.dispose(); s.material.map = t; s.material.needsUpdate = true; const H = s.scale.y; s.scale.set(H * aspect, H, 1); }

  /* ---------- materials, geometry helpers ---------- */
  function std(hex, o = {}) {
    const m = new THREE.MeshStandardMaterial({ color: C(hex), roughness: o.rough != null ? o.rough : 0.72, metalness: o.metal || 0, flatShading: !!o.flat });
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = o.opacity > 0.6; }
    if (o.em != null) { m.emissive = C(o.em); m.emissiveIntensity = o.ei != null ? o.ei : 1; }
    if (o.side) m.side = o.side;
    return m;
  }
  const GEO = {};
  const geo = (key, fn) => GEO[key] || (GEO[key] = fn());
  /* soft rounded box (extruded rounded rectangle with bevel) */
  function rbox(w, h, d, r = 0.15) {
    return geo(`rb${w}_${h}_${d}_${r}`, () => {
      r = Math.max(0.01, Math.min(r, w / 2 - 0.02, h / 2 - 0.02, d / 2 - 0.02));
      const iw = w - 2 * r, ih = h - 2 * r, k = Math.min(0.05, iw / 2, ih / 2);
      const s = new THREE.Shape();
      s.moveTo(-iw / 2 + k, -ih / 2); s.lineTo(iw / 2 - k, -ih / 2); s.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + k);
      s.lineTo(iw / 2, ih / 2 - k); s.quadraticCurveTo(iw / 2, ih / 2, iw / 2 - k, ih / 2); s.lineTo(-iw / 2 + k, ih / 2);
      s.quadraticCurveTo(-iw / 2, ih / 2, -iw / 2, ih / 2 - k); s.lineTo(-iw / 2, -ih / 2 + k); s.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + k, -ih / 2);
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 3, steps: 1 });
      g.translate(0, 0, -(d - 2 * r) / 2);
      return g;
    });
  }
  /* triangular roof prism */
  function prism(w, h, d) {
    return geo(`pr${w}_${h}_${d}`, () => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g; });
  }
  const box = (w, h, d) => geo(`bx${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cyl = (rt, rb, h, s = 16, open = false) => geo(`cy${rt}_${rb}_${h}_${s}_${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
  const sph = (r, ws = 16, hs = 12, half = false) => geo(`sp${r}_${ws}_${hs}_${half}`, () => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI));
  function part(g, hex, parent, pos = [0, 0, 0], o = {}) {
    const m = new THREE.Mesh(g, std(hex, o));
    m.position.set(pos[0], pos[1], pos[2]); if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]); if (o.scale) m.scale.set(...o.scale);
    m.castShadow = o.shadow !== false; m.receiveShadow = o.receive !== false;
    m.userData.base = m.material.color.clone(); m.userData.baseEm = m.material.emissive.clone(); m.userData.baseEI = m.material.emissiveIntensity;
    parent.add(m); return m;
  }
  const led = (parent, pos, hex, g = box(0.32, 0.06, 0.04)) => { const m = part(g, hex, parent, pos, { em: hex, ei: 1, shadow: false }); m.userData.led = rnd() * 6; return m; };
  const glow = (parent, g, hex, pos, o = {}) => { const m = part(g, hex, parent, pos, Object.assign({ em: hex, ei: 0.9, shadow: false }, o)); m.userData.glow = true; return m; };
  const windowPane = (parent, pos, w = 0.5, h = 0.5, rotY = 0) => { const m = part(box(w, h, 0.04), 0xfff3bf, parent, pos, { em: 0xffd66b, ei: 0.2, shadow: false, rot: [0, rotY, 0] }); m.userData.win = true; anim.windows.push(m); return m; };

  /* ---------- little scene pieces ---------- */
  function house(parent, x, z, wall, roof, s = 1, rotY = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = rotY; parent.add(g);
    part(rbox(2.8, 2, 2.4, 0.08), wall, g, [0, 1, 0]);
    part(prism(3.3, 1.25, 2.8), roof, g, [0, 2, 0], { flat: true });
    part(box(0.38, 0.9, 0.38), 0x8d6e63, g, [0.85, 2.6, -0.4]);
    part(box(0.55, 0.95, 0.06), 0x6d4c41, g, [0, 0.48, 1.22]);
    windowPane(g, [-0.85, 1.2, 1.22]); windowPane(g, [0.85, 1.2, 1.22]);
    return g;
  }
  function person(parent, x, z, shirt, i) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = (rnd() - 0.5) * 1.2; parent.add(g);
    const skin = [0xffd7b5, 0xe0ac69, 0x8d5524, 0xf1c27d][i % 4], hair = [0x3b2a20, 0x111111, 0xa0522d, 0xe6c35c][i % 4];
    part(cyl(0.2, 0.17, 0.75, 10), 0x34495e, g, [0, 0.38, 0]);
    part(cyl(0.27, 0.22, 0.72, 12), shirt, g, [0, 1.1, 0]);
    part(sph(0.27, 12, 8), shirt, g, [0, 1.44, 0], { scale: [1, 0.55, 1] });
    part(sph(0.25, 14, 10), skin, g, [0, 1.78, 0]);
    part(sph(0.265, 14, 8, true), hair, g, [0, 1.8, -0.02]);
    [-0.09, 0.09].forEach((ex) => part(sph(0.035, 6, 4), 0x1f2430, g, [ex, 1.8, 0.235], { shadow: false }));
    [-1, 1].forEach((s) => part(cyl(0.075, 0.065, 0.62, 6), shirt, g, [s * 0.27, 1.22, 0.14], { rot: [-0.9, 0, s * 0.25] }));
    const ph = part(box(0.15, 0.26, 0.03), 0x222831, g, [0.12, 1.25, 0.3], { rot: [-0.6, 0, 0], shadow: false });
    glow(ph, box(0.12, 0.21, 0.01), 0x66d9e8, [0, 0, 0.018]);
    return g;
  }
  function chiller(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    part(rbox(2.6, 1.5, 2.6, 0.12), 0xe9ecef, g, [0, 0.75, 0]);
    for (let i = 0; i < 4; i++) part(box(2.2, 0.06, 0.05), 0xadb5bd, g, [0, 0.4 + i * 0.25, 1.31], { shadow: false });
    part(cyl(0.95, 0.95, 0.12, 24), 0x495057, g, [0, 1.56, 0]);
    const fan = new THREE.Group(); fan.position.set(0, 1.66, 0); g.add(fan);
    for (let i = 0; i < 3; i++) part(box(1.7, 0.04, 0.3), 0xced4da, fan, [0, 0, 0], { rot: [0.25, (i * Math.PI) / 3, 0], shadow: false });
    anim.fans.push(fan);
  }
  function car(hex) {
    const g = new THREE.Group(); scene.add(g);
    part(rbox(1.9, 0.55, 1.0, 0.18), hex, g, [0, 0.45, 0], { rough: 0.35, metal: 0.2 });
    part(rbox(1.0, 0.5, 0.88, 0.16), 0xdbe4ff, g, [-0.1, 0.92, 0], { rough: 0.15, metal: 0.3 });
    [[-0.6, 0.5], [0.6, 0.5], [-0.6, -0.5], [0.6, -0.5]].forEach(([x, z]) => part(cyl(0.2, 0.2, 0.16, 12), 0x212529, g, [x, 0.2, z], { rot: [Math.PI / 2, 0, 0] }));
    [-0.28, 0.28].forEach((z) => { const l = part(box(0.06, 0.12, 0.2), 0xfff3bf, g, [0.97, 0.52, z], { em: 0xffe066, ei: 0.2, shadow: false }); l.userData.win = true; anim.windows.push(l); });
    return g;
  }
  function boat(dir, z, hull) {
    const g = new THREE.Group(); scene.add(g);
    part(rbox(3.4, 0.7, 1.4, 0.3), hull, g, [0, 0.15, 0], { rough: 0.5 });
    part(box(3.45, 0.12, 1.45), 0xf8f9fa, g, [0, 0.42, 0], { shadow: false });
    part(rbox(1.1, 0.6, 0.95, 0.12), 0xf8f9fa, g, [-0.7, 0.8, 0]);
    windowPane(g, [-0.7, 0.85, 0.49], 0.6, 0.25);
    part(cyl(0.05, 0.05, 2.8, 6), 0xadb5bd, g, [0.45, 1.85, 0]);
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0, 2.4); s.lineTo(1.4, 0.15); s.lineTo(0, 0);
    const sail = new THREE.Mesh(geo("sail", () => new THREE.ShapeGeometry(s)), std(0xfffdf6, { side: THREE.DoubleSide, rough: 0.9 }));
    sail.position.set(0.5, 0.6, 0); sail.castShadow = true; g.add(sail);
    anim.boats.push({ o: g, dir, z, x: dir > 0 ? -60 - rnd() * 60 : 60 + rnd() * 60, sp: 2.5 + rnd() * 1.5 });
  }
  function birds() {
    const wg = geo("wing", () => { const p = new THREE.PlaneGeometry(0.9, 0.35); p.rotateX(-Math.PI / 2); p.translate(0.45, 0, 0); return p; });
    const wm = std(0x495057, { side: THREE.DoubleSide }), bm = std(0x343a40);
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group(); scene.add(g);
      const body = new THREE.Mesh(sph(0.18, 8, 6), bm); body.scale.set(1, 0.8, 2.2); g.add(body);
      const wl = new THREE.Mesh(wg, wm), wr = new THREE.Mesh(wg, wm); wr.scale.x = -1; g.add(wl, wr);
      anim.birds.push({ o: g, wl, wr, off: i * 0.16 + rnd() * 0.08, r: 40 + rnd() * 6, h: 24 + rnd() * 4, ph: rnd() * 6 });
    }
  }
  function lamp(x, z, dirZ) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    part(cyl(0.06, 0.09, 3.3, 8), 0x6c757d, g, [0, 1.65, 0], { metal: 0.5 });
    part(box(0.06, 0.06, 0.8), 0x6c757d, g, [0, 3.28, dirZ * 0.38]);
    const bulb = part(sph(0.16, 10, 8), 0xfff3bf, g, [0, 3.15, dirZ * 0.72], { em: 0xffe8a3, ei: 0.2, shadow: false }); bulb.userData.win = true; anim.windows.push(bulb);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd8a8, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.85 }));
    gl.scale.set(2.6, 2.6, 1); gl.position.set(0, 3.1, dirZ * 0.72); g.add(gl); anim.nightGlow.push(gl);
    const pool = new THREE.Mesh(geo("pool", () => new THREE.CircleGeometry(2, 24)), new THREE.MeshBasicMaterial({ color: 0xffd8a8, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.09, dirZ * 1.2); g.add(pool); anim.nightGlow.push(pool);
  }

  /* ---------- node builders (return height) ---------- */
  const GRAPHITE = 0x3b414d;
  function rack(g, accent, h = 4.4, blades = 6) {
    part(rbox(2.4, h, 2.4, 0.16), GRAPHITE, g, [0, h / 2, 0], { rough: 0.5, metal: 0.25 });
    part(rbox(2.04, h - 0.4, 0.1, 0.03), accent, g, [0, h / 2, 1.2], { rough: 0.45 });
    for (let i = 0; i < blades; i++) {
      const y = 0.55 + i * ((h - 1.1) / Math.max(1, blades - 1));
      part(box(1.72, 0.34, 0.07), 0x22262e, g, [0, y, 1.27], { shadow: false });
      led(g, [0.55, y, 1.32], i % 3 === 0 ? 0x4dabf7 : 0x69db7c);
      led(g, [-0.55, y, 1.32], 0x69db7c, box(0.12, 0.08, 0.04));
    }
    part(cyl(0.42, 0.42, 0.06, 16), 0x22262e, g, [-0.5, h + 0.03, 0], { shadow: false });
    part(cyl(0.42, 0.42, 0.06, 16), 0x22262e, g, [0.5, h + 0.03, 0], { shadow: false });
  }
  const B = {
    users(g) {
      house(g, -2.2, -2.2, 0xffd6a5, 0xd9534f, 1, 0.15); house(g, 2.3, -2.6, 0xb5ddff, 0x6c5ce7, 0.9, -0.2);
      [[-2.4, 1.4, 0x4dabf7], [-0.8, 2.1, 0xf06595], [0.9, 1.3, 0xffa94d], [2.4, 2.0, 0x40c057]].forEach(([x, z, c], i) => person(g, x, z, c, i));
      return 3.6;
    },
    dns(g) {
      part(rbox(2.6, 0.5, 2.6, 0.1), 0xced4da, g, [0, 0.25, 0]);
      part(cyl(0.16, 0.5, 7.6, 8), 0x7950f2, g, [0, 4.3, 0], { metal: 0.3, rough: 0.5 });
      const lat = new THREE.Mesh(cyl(0.32, 1.05, 7.4, 6, true), new THREE.MeshBasicMaterial({ color: C(0x5f3dc4), wireframe: true }));
      lat.position.y = 4.2; g.add(lat);
      [[3.8, 0], [5.2, 2.1], [6.3, 4.2]].forEach(([y, a]) => { const d = part(sph(0.6, 14, 8, true), 0xf8f9fa, g, [Math.cos(a) * 0.55, y, Math.sin(a) * 0.55], { rot: [Math.PI / 2, 0, -a + Math.PI / 2] }); d.material.side = THREE.DoubleSide; });
      led(g, [0, 8.2, 0], 0xff4d4d, sph(0.2, 10, 8));
      return 8.4;
    },
    cdn(g) {
      part(rbox(3.4, 2.4, 3, 0.12), 0xe3fafc, g, [0, 1.2, 0]);
      part(prism(3.9, 1.3, 3.4), 0x1098ad, g, [0, 2.4, 0], { flat: true });
      part(box(3.6, 0.1, 1.1), 0xff922b, g, [0, 1.95, 1.75], { rot: [0.35, 0, 0] });
      part(box(0.7, 1.2, 0.06), 0x495057, g, [0.9, 0.6, 1.52]);
      windowPane(g, [-0.7, 1.15, 1.52], 1.1, 0.8);
      glow(g, box(1.6, 0.42, 0.1), 0x22b8cf, [0, 3.1, 1.25], { ei: 0.7 });
      const dish = part(sph(0.55, 14, 8, true), 0xf8f9fa, g, [-0.9, 3.25, -0.5], { rot: [-0.9, 0.6, 0] }); dish.material.side = THREE.DoubleSide;
      return 4.2;
    },
    lb(g) {
      part(cyl(1.9, 2.1, 0.35, 28), 0xced4da, g, [0, 0.18, 0]);
      part(rbox(3.2, 1.5, 2.2, 0.25), 0xff922b, g, [0, 1.1, 0], { rough: 0.45 });
      part(rbox(2.7, 0.45, 0.1, 0.04), 0x22262e, g, [0, 1.1, 1.12], { shadow: false });
      for (let i = 0; i < 7; i++) led(g, [-1.05 + i * 0.35, 1.1, 1.19], i % 2 ? 0xffd43b : 0x69db7c, box(0.16, 0.12, 0.04));
      part(cyl(0.07, 0.07, 0.9, 8), 0xadb5bd, g, [0, 2.3, 0]);
      const radar = new THREE.Group(); radar.position.set(0, 2.85, 0); g.add(radar);
      const dsh = part(sph(0.6, 16, 8, true), 0xf8f9fa, radar, [0, 0, 0], { rot: [-1.1, 0, 0] }); dsh.material.side = THREE.DoubleSide;
      led(radar, [0, 0.05, 0.45], 0xff6b6b, sph(0.09, 8, 6));
      anim.spin.push({ o: radar, s: 1.6 });
      return 3.5;
    },
    app(g) { rack(g, 0xffc933); return 4.5; },
    cache(g) {
      rack(g, 0xff5c5c, 3.2, 4);
      const holo = part(new THREE.OctahedronGeometry(0.75), 0xff6b6b, g, [0, 4.4, 0], { em: 0xff4d4d, ei: 0.9, opacity: 0.8, shadow: false });
      holo.userData.glow = true; anim.spin.push({ o: holo, s: 1.4, bob: 0.18 });
      return 5.2;
    },
    db(g, o) {
      const drum = geo("drum", () => new THREE.LatheGeometry([v3(0, 0, 0), v3(1.5, 0, 0), v3(1.72, 0.1, 0), v3(1.8, 0.4, 0), v3(1.72, 0.7, 0), v3(1.5, 0.8, 0), v3(0, 0.8, 0)].map((p) => new THREE.Vector2(p.x, p.y)), 30));
      for (let i = 0; i < 3; i++) part(drum, o.c, g, [0, 0.05 + i * 0.95, 0], { metal: 0.3, rough: 0.35 });
      [0.9, 1.85].forEach((y) => glow(g, geo("dbring", () => new THREE.TorusGeometry(1.7, 0.05, 6, 40)), o.ring, [0, y, 0], { rot: [Math.PI / 2, 0, 0] }));
      part(cyl(0.9, 0.9, 0.08, 24), 0x22262e, g, [0, 2.9, 0], { shadow: false });
      led(g, [0, 2.97, 0.4], 0x69db7c, sph(0.1, 8, 6));
      return 3.1;
    },
    queue(g) {
      [[-3.6, -0.9], [3.6, -0.9], [-3.6, 0.9], [3.6, 0.9]].forEach(([x, z]) => part(box(0.22, 0.65, 0.22), 0x868e96, g, [x, 0.33, z], { metal: 0.4 }));
      part(rbox(8, 0.45, 2.4, 0.1), 0x845ef7, g, [0, 0.85, 0]);
      part(box(7.6, 0.1, 2.0), 0x2b2f36, g, [0, 1.1, 0], { rough: 0.95 });
      [-3.9, 3.9].forEach((x) => part(cyl(0.26, 0.26, 2.3, 14), 0xadb5bd, g, [x, 0.92, 0], { rot: [Math.PI / 2, 0, 0], metal: 0.5 }));
      qCubes = Array.from({ length: 10 }, (_, i) => {
        const p = part(rbox(0.72, 0.55, 0.72, 0.05), 0xc98d4e, g, [3.2 - i * 0.7, 1.43, 0], { rough: 0.9 });
        part(box(0.74, 0.04, 0.16), 0xe8c48c, p, [0, 0.29, 0], { shadow: false });
        p.visible = false; return p;
      });
      return 1.8;
    },
    worker(g) {
      const rb = new THREE.Group(); g.add(rb); anim.bob.push({ o: rb, p: rnd() * 6 });
      part(cyl(0.7, 0.8, 0.35, 18), 0x343a40, rb, [0, 0.18, 0]);
      part(cyl(0.58, 0.66, 1.1, 18), 0xf06595, rb, [0, 0.9, 0], { rough: 0.45 });
      part(sph(0.58, 16, 10), 0xf06595, rb, [0, 1.45, 0], { scale: [1, 0.5, 1], rough: 0.45 });
      part(rbox(1.1, 0.75, 0.95, 0.2), 0xf8f9fa, rb, [0, 2.12, 0], { rough: 0.4 });
      part(box(0.86, 0.3, 0.05), 0x1f2430, rb, [0, 2.15, 0.48], { shadow: false });
      [-0.2, 0.2].forEach((x) => glow(rb, sph(0.07, 8, 6), 0x66d9e8, [x, 2.15, 0.52], { ei: 1.4 }));
      part(cyl(0.03, 0.03, 0.45, 6), 0xadb5bd, rb, [0, 2.7, 0]);
      led(rb, [0, 2.95, 0], 0xf783ac, sph(0.1, 8, 6));
      [-1, 1].forEach((s) => part(cyl(0.11, 0.1, 0.85, 8), 0xf06595, rb, [s * 0.74, 1.15, 0.1], { rot: [0.4, 0, s * 0.45] }));
      return 3.1;
    },
    s3(g) {
      part(cyl(2, 2, 3.4, 30), 0xc9d1d9, g, [0, 1.7, 0], { metal: 0.55, rough: 0.32 });
      part(sph(2, 30, 12, true), 0xdee2e6, g, [0, 3.4, 0], { metal: 0.5, rough: 0.3 });
      [0.6, 1.8, 3.0].forEach((y) => part(geo("band", () => new THREE.TorusGeometry(2.02, 0.08, 6, 40)), 0x868e96, g, [0, y, 0], { rot: [Math.PI / 2, 0, 0] }));
      [-0.25, 0.25].forEach((x) => part(box(0.06, 3.6, 0.06), 0x495057, g, [x, 1.8, 2.08], { shadow: false }));
      for (let i = 0; i < 8; i++) part(box(0.5, 0.05, 0.05), 0x495057, g, [0, 0.3 + i * 0.42, 2.08], { shadow: false });
      return 5.5;
    },
  };

  function addNode(id, type, x, z, label, o = {}) {
    const g = new THREE.Group(); g.position.set(x, o.y != null ? o.y : 0.8, z); scene.add(g);
    const h = B[type](g, o);
    const n = { id, type, info: o.info || type, g, h, label, cur: label, x, z, hiddenDefault: !!o.hidden, meshes: [], warn: false, pulse: 0, popIn: 0, state: "up" };
    g.traverse((m) => { if (m.isMesh && m.userData.base) { n.meshes.push(m); m.userData.nodeId = id; clickables.push(m); } });
    const bb = new THREE.Box3().setFromObject(g), sz = bb.getSize(v3(0, 0, 0)), rad = Math.max(sz.x, sz.z) / 2 + 0.5;
    n.halo = new THREE.Mesh(geo("halo", () => new THREE.RingGeometry(0.82, 1, 48)), new THREE.MeshBasicMaterial({ color: C(0x51cf66), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    n.halo.rotation.x = -Math.PI / 2; n.halo.position.y = 0.06; n.halo.scale.setScalar(rad); n.halo.visible = false; g.add(n.halo);
    if (LOAD[type]) { // live load bar (game-style health bar) that always faces the camera
      const mg = new THREE.Group(); mg.position.set(0, h + 0.62, 0); g.add(mg);
      const bgm = new THREE.Mesh(box(2.9, 0.52, 0.04), new THREE.MeshBasicMaterial({ color: C(0x1f2430), transparent: true, opacity: 0.78, depthTest: false, toneMapped: false }));
      bgm.renderOrder = 9; mg.add(bgm);
      const fill = new THREE.Mesh(geo("meterfill", () => { const b = new THREE.BoxGeometry(1, 0.36, 0.05); b.translate(0.5, 0, 0); return b; }), new THREE.MeshBasicMaterial({ color: C(0x51cf66), depthTest: false, transparent: true, toneMapped: false })); // transparent so renderOrder puts it above the background
      fill.position.set(-1.37, 0, 0.03); fill.scale.x = 0.05; fill.renderOrder = 10; mg.add(fill);
      n.meter = { g: mg, fill, W: 2.74 }; n.load = 0; n.hotCd = 0;
    }
    const lab = makeLabel(label); lab.position.set(0, h + 1.5, 0); g.add(lab); n.lab = lab;
    if (o.hidden) g.visible = false;
    nodes[id] = n; return n;
  }
  const anchor = (id) => { const n = nodes[id]; return v3(n.x, n.g.position.y + n.h * 0.6, n.z); };
  const anchorGround = (id) => { const n = nodes[id]; return v3(n.x, n.g.position.y + 0.1, n.z); };

  /* ---------- environment ---------- */
  const shoreZ = (x, side) => (side < 0 ? -0.3 : 6.9) + Math.sin(x * 0.13) * 0.55 + Math.sin(x * 0.047 + 1) * 0.45;
  function land(side, offset, hex, top, depth) {
    const s = new THREE.Shape(), FAR = side < 0 ? -170 : 170, pts = [];
    for (let x = -170; x <= 170; x += 4) pts.push([x, shoreZ(x, side) + offset]);
    pts.push([170, FAR], [-170, FAR]);
    s.moveTo(pts[0][0], -pts[0][1]); pts.slice(1).forEach((p) => s.lineTo(p[0], -p[1]));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, std(hex, { rough: 0.95 })); m.position.y = top - depth; m.receiveShadow = true; scene.add(m);
    return m;
  }
  function region(cx, cz, w, d, sideHex, label, flagZ) {
    const base = new THREE.Mesh(rbox(w, 0.62, d, 0.28), std(sideHex, { rough: 0.6 })); base.position.set(cx, 0.31, cz); base.castShadow = true; base.receiveShadow = true; scene.add(base);
    const tc = document.createElement("canvas"); tc.width = tc.height = 64; const tx = tc.getContext("2d");
    tx.fillStyle = "#e9edf1"; tx.fillRect(0, 0, 64, 64); tx.strokeStyle = "#c3cad3"; tx.lineWidth = 2; tx.strokeRect(1, 1, 62, 62);
    const tex = new THREE.CanvasTexture(tc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 2.5, d / 2.5); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    const topM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    const top = new THREE.Mesh(box(w - 0.9, 0.2, d - 0.9), topM); top.position.set(cx, 0.7, cz); top.receiveShadow = true; scene.add(top);
    // railing with a gate on the street side
    const x0 = cx - w / 2 + 0.6, x1 = cx + w / 2 - 0.6, z0 = cz - d / 2 + 0.6, z1 = cz + d / 2 - 0.6, railM = std(0x9aa3ad, { metal: 0.5, rough: 0.4 });
    const post = (x, z) => { const p = new THREE.Mesh(cyl(0.07, 0.07, 1.1, 6), railM); p.position.set(x, 1.35, z); p.castShadow = true; scene.add(p); };
    const rail = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az); const r = new THREE.Mesh(box(len, 0.08, 0.08), railM); r.position.set((ax + bx) / 2, 1.85, (az + bz) / 2); r.rotation.y = -Math.atan2(bz - az, bx - ax); scene.add(r); for (let t = 0; t <= len; t += 5) post(ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len); };
    rail(x0, z0, x1, z0); rail(x0, z1, x1, z1); rail(x1, z0, x1, z1);
    rail(x0, z0, x0, cz - 3); rail(x0, cz + 3, x0, z1);
    // flag
    const fx = x0 + 0.3, fz = flagZ;
    const pole = new THREE.Mesh(cyl(0.07, 0.09, 5.2, 8), railM); pole.position.set(fx, 3.3, fz); pole.castShadow = true; scene.add(pole);
    const fg = new THREE.PlaneGeometry(2.4, 1.4, 12, 2); fg.translate(1.2, 0, 0);
    const flag = new THREE.Mesh(fg, std(sideHex, { side: THREE.DoubleSide, rough: 0.8 })); flag.position.set(fx + 0.05, 5.1, fz); flag.castShadow = true; scene.add(flag);
    anim.flags.push({ geo: fg, base: fg.attributes.position.array.slice() });
    const l = makeLabel(label, { scale: 1.15, bg: "#fff3bf" }); l.position.set(cx - w / 2 - 2, 1.2, cz + d / 2 - 3); scene.add(l); l.userData.region = 1;
  }
  function road(x0, x1, z) {
    const r = new THREE.Mesh(box(x1 - x0, 0.06, 3.2), std(0x4b5058, { rough: 0.95 })); r.position.set((x0 + x1) / 2, 0.03, z); r.receiveShadow = true; scene.add(r);
    for (let x = x0 + 1; x < x1 - 1; x += 2.6) { const d = new THREE.Mesh(box(1.2, 0.07, 0.16), std(0xf8f9fa)); d.position.set(x + 0.6, 0.05, z); scene.add(d); }
  }
  function fiber(a, b) {
    const A = anchorGround(a), Bv = anchorGround(b), len = A.distanceTo(Bv);
    const m = new THREE.Mesh(cyl(0.08, 0.08, 1, 6), fiberMat); m.scale.y = len;
    m.position.copy(A).lerp(Bv, 0.5); m.quaternion.setFromUnitVectors(v3(0, 1, 0), Bv.clone().sub(A).normalize()); scene.add(m);
  }
  function cloud(x, y, z, s, label) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g);
    const m = std(0xffffff, { rough: 1, flat: true });
    [[0, 0, 0, 2.6], [2.4, -0.4, 0.6, 1.9], [-2.4, -0.5, 0.3, 2], [1, 1.3, -0.2, 1.8], [-1.2, 1, -0.5, 1.6], [0.2, -0.6, 1.4, 1.7]].forEach(([a, b, c, r]) => {
      const p = new THREE.Mesh(geo("cl" + r, () => new THREE.IcosahedronGeometry(r, 1)), m); p.position.set(a, b, c); g.add(p);
    });
    anim.clouds.push({ o: g, m, v: label ? 0 : 0.6 + rnd() * 0.8, y0: y, p: rnd() * 6 });
    return g;
  }
  function trees() {
    const blocked = (x, z) =>
      (x > -16 && x < 36 && z > -30 && z < 31) || (z > -3.5 && z < 10) ||
      [[-44, -12, 8], [-44, 19, 8], [-31, -27, 4.5], [-29, -8, 4.5], [-29, 24, 4.5], [38, -24, 4.5], [35, -16, 4.5], [-15.5, 12.4, 4.5], [-40, 3, 6]].some(([a, b, r]) => Math.hypot(x - a, z - b) < r) ||
      (Math.abs(z + 13) < 3 && x > -42 && x < -10) || (Math.abs(z - 18.5) < 3 && x > -42 && x < -10) || (x > 32 && x < 40 && z > -12 && z < 15);
    const list = [];
    for (let i = 0; i < 900 && list.length < 140; i++) {
      const x = -100 + rnd() * 200, z = -75 + rnd() * 135;
      if (blocked(x, z)) continue;
      list.push({ x, z, s: 0.75 + rnd() * 0.7, pine: rnd() < 0.55 });
    }
    const dummy = new THREE.Object3D();
    const mk = (g, hex, count, flat) => { const im = new THREE.InstancedMesh(g, std(hex, { flat, rough: 0.9 }), count); im.castShadow = true; im.receiveShadow = true; scene.add(im); return im; };
    const pines = list.filter((t) => t.pine), rounds = list.filter((t) => !t.pine);
    const trunks = mk(cyl(0.16, 0.24, 1.3, 6), 0x8b5a2b, list.length, true);
    const pineM = mk(geo("pine", () => { const a = new THREE.ConeGeometry(1.25, 2.4, 7); a.translate(0, 1.2, 0); return a; }), 0xffffff, pines.length, true);
    const pineTop = mk(geo("pinet", () => { const a = new THREE.ConeGeometry(0.9, 1.8, 7); a.translate(0, 0.9, 0); return a; }), 0xffffff, pines.length, true);
    const roundM = mk(geo("roundt", () => new THREE.IcosahedronGeometry(1.35, 0)), 0xffffff, rounds.length, true);
    const greens = [0x2f9e44, 0x37b24d, 0x40c057, 0x2b8a3e, 0x66a80f, 0x74b816];
    list.forEach((t, i) => { dummy.position.set(t.x, 0.65 * t.s, t.z); dummy.scale.setScalar(t.s); dummy.rotation.set(0, rnd() * 6, 0); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix); });
    pines.forEach((t, i) => {
      const col = C(greens[i % 3 + 3 * (i % 2)]);
      dummy.position.set(t.x, 1.0 * t.s, t.z); dummy.scale.setScalar(t.s); dummy.rotation.set(0, rnd() * 6, 0); dummy.updateMatrix(); pineM.setMatrixAt(i, dummy.matrix); pineM.setColorAt(i, col);
      dummy.position.set(t.x, 2.6 * t.s, t.z); dummy.updateMatrix(); pineTop.setMatrixAt(i, dummy.matrix); pineTop.setColorAt(i, col);
    });
    rounds.forEach((t, i) => { dummy.position.set(t.x, 2.2 * t.s, t.z); dummy.scale.set(t.s, t.s * 1.05, t.s); dummy.rotation.set(rnd(), rnd() * 6, 0); dummy.updateMatrix(); roundM.setMatrixAt(i, dummy.matrix); roundM.setColorAt(i, C(greens[(i * 7) % 6])); });
    [pineM, pineTop, roundM].forEach((m) => m.instanceColor && (m.instanceColor.needsUpdate = true));
    // bushes & rocks
    const bush = mk(geo("bush", () => new THREE.IcosahedronGeometry(0.7, 0)), 0xffffff, 60, true);
    let bi = 0;
    for (let i = 0; i < 600 && bi < 60; i++) {
      const x = -70 + rnd() * 140, z = -50 + rnd() * 95; if (blocked(x, z)) continue;
      const rock = rnd() < 0.3; dummy.position.set(x, rock ? 0.2 : 0.35, z); dummy.scale.set(0.6 + rnd(), rock ? 0.5 : 0.7 + rnd() * 0.4, 0.6 + rnd()); dummy.rotation.set(0, rnd() * 6, 0); dummy.updateMatrix();
      bush.setMatrixAt(bi, dummy.matrix); bush.setColorAt(bi, C(rock ? 0x9ca3ab : greens[bi % 6])); bi++;
    }
    bush.count = bi; bush.instanceColor && (bush.instanceColor.needsUpdate = true);
  }
  function mountains() {
    [[-140, -205, 36, 46], [-80, -225, 42, 58], [-20, -200, 32, 40], [40, -230, 46, 62], [100, -205, 36, 48], [160, -170, 32, 40], [-200, -120, 30, 36], [205, -95, 28, 34]].forEach(([x, z, r, h], i) => {
      const m = new THREE.Mesh(geo("mtn" + i, () => new THREE.ConeGeometry(r, h, 7 + (i % 3), 3)), std(i % 2 ? 0x7c9a6d : 0x8a9a8f, { flat: true, rough: 1 }));
      m.position.set(x, h / 2 - 2, z); m.rotation.y = i; scene.add(m);
      const cap = new THREE.Mesh(geo("cap" + i, () => new THREE.ConeGeometry(r * 0.32, h * 0.32, 7 + (i % 3), 1)), std(0xf8f9fa, { flat: true, rough: 0.9 }));
      cap.position.set(x, h - 2 - h * 0.16 + 0.2, z); cap.rotation.y = i; scene.add(cap);
    });
  }
  function skyAndLights() {
    sky = new THREE.Mesh(new THREE.SphereGeometry(520, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x5bb8ff) }, bottom: { value: new THREE.Color(0xe6f6ff) } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.5 + 0.08, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0); }",
    }));
    scene.add(sky);
    const sp = new Float32Array(1800);
    for (let i = 0; i < 600; i++) { const a = rnd() * Math.PI * 2, e = 0.12 + rnd() * 1.4, r = 480; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, toneMapped: false })); scene.add(stars);
    hemi = new THREE.HemisphereLight(0xffffff, 0x6e8f5c, 0.5); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(-45, 80, 50); sun.castShadow = true;
    sun.shadow.mapSize.set(Math.min(screen.width, screen.height) < 700 ? 1024 : 2048, Math.min(screen.width, screen.height) < 700 ? 1024 : 2048); const sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 260;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04; scene.add(sun);
    const dir = sun.position.clone().normalize().multiplyScalar(440);
    sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff3b0, transparent: true, depthWrite: false, fog: false, toneMapped: false })); sunSprite.scale.set(90, 90, 1); sunSprite.position.copy(dir); scene.add(sunSprite);
    moon = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf1f3f5, fog: false, toneMapped: false })); moon.position.copy(dir); scene.add(moon);
  }
  function waterChannel() {
    waterGeo = new THREE.PlaneGeometry(340, 13, 110, 6); waterGeo.rotateX(-Math.PI / 2);
    waterBase = waterGeo.attributes.position.array.slice();
    water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: C(0x39a7ee), roughness: 0.18, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.88 }));
    water.position.set(0, -0.42, 3.3); water.receiveShadow = true; scene.add(water);
    const bed = new THREE.Mesh(box(340, 0.2, 14), std(0xc2a878, { rough: 1 })); bed.position.set(0, -2.6, 3.3); scene.add(bed);
  }

  function themeCols() { return SD.isDark(); }
  function applyTheme() {
    const night = themeCols(); nightK = night ? 1.8 : 0.75;
    sky.material.uniforms.top.value.set(night ? 0x07112b : 0x4fb3ff); sky.material.uniforms.bottom.value.set(night ? 0x2a3d6e : 0xe3f4ff);
    if (!scene.fog) scene.fog = new THREE.Fog(0xffffff, 130, 430);
    scene.fog.color.copy(C(night ? 0x22345f : 0xd9efff));
    hemi.color.copy(C(night ? 0x5465a0 : 0xd8ecff)); hemi.groundColor.copy(C(night ? 0x1a2230 : 0x6e8f5c)); hemi.intensity = night ? 0.42 : 0.55;
    sun.color.copy(C(night ? 0xb3c4ff : 0xfff1d9)); sun.intensity = night ? 0.45 : 0.88;
    stars.visible = night; sunSprite.visible = !night; moon.visible = night;
    water.material.color.copy(C(night ? 0x1b4a7a : 0x39a7ee));
    anim.windows.forEach((m) => (m.material.emissiveIntensity = night ? 1.5 : 0.12));
    fiberMat.emissiveIntensity = night ? 1.4 : 0.55;
    anim.clouds.forEach((c) => c.m.color.copy(C(night ? 0x8792b0 : 0xffffff)));
    anim.nightGlow.forEach((g) => (g.visible = night));
    landMats.forEach(([m, d, n]) => m.color.copy(C(night ? n : d)));
  }

  function build() {
    const W = stage.clientWidth, H = stage.clientHeight;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    const small = Math.min(screen.width, screen.height) < 700; // phones: lighter settings
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    stage.prepend(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, W / H, 0.5, 1200);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.46; controls.minDistance = 10; controls.maxDistance = 200;
    controls.autoRotateSpeed = 0.6;
    controls.addEventListener("start", () => (fly = null));

    const gc = document.createElement("canvas"); gc.width = gc.height = 64; const gx = gc.getContext("2d"), grd = gx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,.55)"); grd.addColorStop(1, "rgba(255,255,255,0)"); gx.fillStyle = grd; gx.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(gc);
    fiberMat = new THREE.MeshStandardMaterial({ color: C(0x2b3a4a), emissive: C(0x3bc9db), emissiveIntensity: 0.55, roughness: 0.5 });

    skyAndLights();
    // land: sand beach + grass, on both sides of the ocean channel
    const sandUS = land(-1, 0, 0xf2dca4, -0.12, 3), grassUS = land(-1, -1.1, 0x8fd16f, 0, 3);
    const sandEU = land(1, 0, 0xf2dca4, -0.12, 3), grassEU = land(1, 1.1, 0x8fd16f, 0, 3);
    landMats = [[grassUS.material, 0x8fd16f, 0x4f7a45], [grassEU.material, 0x8fd16f, 0x4f7a45], [sandUS.material, 0xf2dca4, 0x9c8c6a], [sandEU.material, 0xf2dca4, 0x9c8c6a]];
    waterChannel(); mountains();

    region(10, -14, 44, 25, 0x74c0fc, "🇺🇸 Region A · US-East", -25.6);
    region(10, 18, 44, 21, 0xb197fc, "🇪🇺 Region B · EU-West", 27.6);
    road(-41, -12, -13); road(-41, -12, 18.5);
    chiller(35, -18.5); chiller(35, -14); chiller(-15.5, 10.5); chiller(-15.5, 14.2);

    addNode("uUS", "users", -44, -12, "👥 US users", { y: 0, info: "users" });
    addNode("uEU", "users", -44, 19, "👥 EU users", { y: 0, info: "users" });
    addNode("dns", "dns", -31, -27, "📖 GeoDNS", { y: 0 });
    addNode("cdnUS", "cdn", -29, -8, "🌐 CDN (US)", { y: 0, info: "cdn" });
    addNode("cdnEU", "cdn", -29, 24, "🌐 CDN (EU)", { y: 0, info: "cdn" });
    addNode("lbA", "lb", -6, -14, "🚦 Load balancer", { info: "lb" });
    addNode("a1", "app", 3, -22, "🖥️ App 1", { info: "app" });
    addNode("a2", "app", 3, -16, "🖥️ App 2", { info: "app" });
    addNode("a3", "app", 3, -10, "🖥️ App 3", { info: "app" });
    addNode("a4", "app", 3, -4, "🖥️ App 4 (new!)", { info: "app", hidden: true });
    addNode("cA", "cache", 12, -22, "⚡ Cache", { info: "cache" });
    addNode("dbA", "db", 20, -15, "🗄️ Primary DB", { info: "dbp", c: 0x40c057, ring: 0x8ce99a });
    addNode("rA1", "db", 28, -22, "📠 Replica 1", { info: "dbr", c: 0x22b8cf, ring: 0x99e9f2 });
    addNode("rA2", "db", 28, -9, "📠 Replica 2", { info: "dbr", c: 0x22b8cf, ring: 0x99e9f2 });
    addNode("qA", "queue", 12.5, -5, "📬 Queue · 0", { info: "queue" });
    addNode("wA1", "worker", 21, -4, "👷 Worker", { info: "worker" });
    addNode("wA2", "worker", 25.5, -4, "👷 Worker", { info: "worker" });
    addNode("s3", "s3", 38, -24, "🪣 Storage", { y: 0 });
    addNode("lbB", "lb", -6, 18, "🚦 Load balancer", { info: "lb" });
    addNode("b1", "app", 3, 13, "🖥️ App", { info: "app" });
    addNode("b2", "app", 3, 23, "🖥️ App", { info: "app" });
    addNode("cB", "cache", 12, 12, "⚡ Cache", { info: "cache" });
    addNode("dbB", "db", 20, 18, "📠 Replica (EU)", { info: "dbr", c: 0x22b8cf, ring: 0x99e9f2 });

    trees();
    // life: traffic, boats, birds, street lamps
    [[-13, 0xff6b6b, 1, -30], [-13, 0x4dabf7, -1, -20], [18.5, 0xfcc419, 1, -25], [18.5, 0x9775fa, -1, -36]].forEach(([z, c, d, x]) => anim.cars.push({ o: car(c), z, dir: d, x, sp: 4 + rnd() * 2 }));
    boat(1, 2.1, 0xe8590c); boat(-1, 4.6, 0x1c7ed6);
    birds();
    for (let x = -38; x <= -16; x += 7) { lamp(x, -15.3, 1); lamp(x, 20.8, -1); }
    cloud(-40, 15, 3, 0.9, true); const cl = makeLabel("☁️ the internet", { small: true }); cl.position.set(-40, 19.5, 3); scene.add(cl);
    for (let i = 0; i < 7; i++) cloud(-150 + i * 45 + rnd() * 20, 32 + rnd() * 12, -70 + rnd() * 110, 1.4 + rnd() * 1.2);

    [["lbA", "a1"], ["lbA", "a2"], ["lbA", "a3"], ["a2", "cA"], ["a2", "dbA"], ["dbA", "rA1"], ["dbA", "rA2"], ["a3", "qA"], ["qA", "wA1"], ["qA", "wA2"], ["lbB", "b1"], ["lbB", "b2"], ["b1", "cB"], ["b2", "dbB"]].forEach(([a, b]) => fiber(a, b));
    // undersea cable: dives under the waves between the regions
    const path = new THREE.CatmullRomCurve3([v3(31, 0.9, -14), v3(35, 0.3, -8), v3(36, 0.05, -2.5), v3(36, -1.9, 3.3), v3(36, 0.05, 9), v3(35, 0.3, 13), v3(31, 0.9, 18)]);
    cableMesh = new THREE.Mesh(new THREE.TubeGeometry(path, 60, 0.32, 10, false), std(0x1864ab, { rough: 0.4, metal: 0.2 })); cableMesh.castShadow = true; scene.add(cableMesh);
    const cabL = makeLabel("🌊 undersea cable", { small: true }); cabL.position.set(38.5, 2.6, 3.3); scene.add(cabL);
    cutLab = makeLabel("✂️ CUT!", { bg: "#ff8787" }); cutLab.position.set(36, 4.4, 3.3); cutLab.visible = false; scene.add(cutLab);

    applyTheme();
    document.addEventListener("themechange", applyTheme);
    new ResizeObserver(() => { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }).observe(stage);
    setupPicking();
  }

  /* ---------- world API used by topics ---------- */
  /* Stale packets are dropped WITHOUT resolving their promises, so old step scripts simply stop. */
  function disposePacket(p) {
    scene.remove(p.m); p.m.material.dispose();
    p.m.children.forEach((c) => { if (c.material) { c.material.map && c.material.map !== glowTex && c.material.map.dispose(); c.material.dispose(); } });
    p.trail.forEach((t) => { scene.remove(t); t.material.dispose(); });
  }
  function disposePop(p) { scene.remove(p.s); p.s.material.map.dispose(); p.s.material.dispose(); }
  function clearPackets() { packets.splice(0).forEach(disposePacket); pops.splice(0).forEach(disposePop); }
  const pktGeo = () => geo("pkt", () => new THREE.SphereGeometry(0.55, 14, 10));
  function send(from, to, o = {}) {
    return new Promise((res) => {
      const a = anchor(from), b = anchor(to), mid = a.clone().add(b).multiplyScalar(0.5); mid.y += a.distanceTo(b) * 0.22 + 2.5;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b), color = C(HEX[o.color || "pink"] || o.color);
      const m = new THREE.Mesh(pktGeo(), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, opacity: 0.9, toneMapped: false })); gl.scale.set(3, 3, 1); m.add(gl);
      if (o.label) { const l = makeLabel(o.label, { small: true }); l.position.y = 1.5; l.visible = showLabels; m.add(l); }
      const trail = Array.from({ length: 5 }, (_, i) => { const t = new THREE.Mesh(pktGeo(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 - i * 0.07, toneMapped: false })); t.scale.setScalar(0.75 - i * 0.12); t.visible = false; scene.add(t); return t; });
      m.visible = false; scene.add(m);
      if (from === "uUS" || from === "uEU") reqTimes.push(performance.now() / 1000);
      packets.push({ m, curve, t: -(o.delay || 0) / (o.dur || 1.2), dur: o.dur || 1.2, res, trail, hist: [], onArrive: o.onArrive, to });
    });
  }
  async function route(path, o = {}) { for (let i = 0; i < path.length - 1; i++) await send(path[i], path[i + 1], o); }
  function pop(id, text, o = {}) { const n = nodes[id]; const s = makeLabel(text, { bg: o.bg || "#fff3bf" }); s.position.set(n.x, n.g.position.y + n.h + 3.4, n.z); scene.add(s); pops.push({ s, t: 0, life: o.life || 1.6 }); }
  function setState(id, st) {
    [].concat(id).forEach((i) => {
      const n = nodes[i]; n.state = st; n.warn = st === "warn";
      n.meshes.forEach((m) => {
        const u = m.userData;
        if (st === "down") { m.material.color.copy(GRAY); m.material.emissive.copy(BLACK); }
        else { m.material.color.copy(u.base); m.material.emissive.copy(u.baseEm); if (!u.win) m.material.emissiveIntensity = u.baseEI; }
      });
      n.halo.visible = st === "good" || st === "warn" || st === "down";
      n.halo.material.color.copy(C(st === "good" ? 0x51cf66 : st === "warn" ? 0xff6b6b : 0xc92a2a));
      if (!n.downLab) { n.downLab = makeLabel("💥 down", { bg: "#ff8787", small: true }); n.downLab.position.set(0, n.h + 3.1, 0); n.g.add(n.downLab); }
      n.downLab.visible = st === "down";
    });
  }
  function show(id, on = true) { const n = nodes[id]; if (on && !n.g.visible) { n.g.visible = true; n.popIn = 0.001; } else if (!on) n.g.visible = false; }
  function setLabel(id, t) { const n = nodes[id]; if (n.cur !== t) { relabel(n.lab, t); n.cur = t; } }
  function pulse(id) { [].concat(id).forEach((i) => (nodes[i].pulse = 0.7)); }
  function setQ(n) { qLen = Math.max(0, n); setLabel("qA", "📬 Queue · " + qLen); qCubes.forEach((c, i) => (c.visible = i < qLen)); }
  function cut(on) { cutOn = on; cutLab.visible = on; cableMesh.material.color.copy(C(on ? 0xe03131 : 0x1864ab)); }
  function resetWorld() {
    Object.values(nodes).forEach((n) => { setState(n.id, "up"); setLabel(n.id, n.label); n.g.visible = !n.hiddenDefault; n.g.scale.setScalar(1); n.pulse = 0; if (n.meter) n.load = 0; });
    setQ(0); cut(false);
  }
  const A = { send, route, pop, setState, show, setLabel, pulse, setQ, cut, sleep: (ms) => SD.sleep(ms), get q() { return qLen; } };
  const shuffle = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- live HUD ---------- */
  function updateHud() {
    const now = performance.now() / 1000; reqTimes = reqTimes.filter((t) => now - t < 3);
    let hot = null, down = 0;
    Object.values(nodes).forEach((n) => {
      if (!n.g.visible) return;
      if (n.state === "down") down++;
      else if (n.meter && (!hot || n.load > hot.load)) hot = n;
    });
    const hotTxt = hot && hot.load > 0.05 ? `${hot.cur} · ${Math.round(Math.min(hot.load, 1.5) * 100)}%` : "all calm 😌";
    let html = `<span>📨 ${(reqTimes.length / 3).toFixed(1)} requests/s</span><span>🔥 busiest: ${hotTxt}</span><span>💥 ${down} machine${down === 1 ? "" : "s"} down</span>`;
    if (topic && topic.id === "sandbox") {
      const tot = SB.ok + SB.err, lat = SB.lat.length ? Math.round(SB.lat.reduce((a, b) => a + b, 0) / SB.lat.length) : 0;
      html += `<span class="sb">✅ ${tot ? Math.round((SB.ok / tot) * 100) : 100}% success · ❌ ${SB.err} errors</span><span class="sb">⏱️ avg ${lat} ms per request</span>`;
    }
    const h = $("#hud3d"); if (h.innerHTML !== html) h.innerHTML = html;
  }

  /* ---------- sandbox: a tiny live simulation you can break ---------- */
  const up = (id) => nodes[id].g.visible && nodes[id].state !== "down";
  const appsOf = (r) => (r === "A" ? ["a1", "a2", "a3", "a4"] : ["b1", "b2"]).filter(up);
  const lbOf = (r) => (r === "A" ? "lbA" : "lbB");
  const dbOf = (r) => {
    const us = ["dbA", "rA1", "rA2"].find(up);
    if (r === "A") return us || (!cutOn && up("dbB") ? "dbB" : null);
    return up("dbB") ? "dbB" : !cutOn ? us : null;
  };
  function sbFail(id, msg = "💥 timeout") { pop(id, msg, { bg: "#ff8787", life: 0.9 }); SB.err++; }
  async function sbRequest(home) {
    const user = home === "A" ? "uUS" : "uEU", other = home === "A" ? "B" : "A";
    const ok = (r) => up(lbOf(r)) && appsOf(r).length > 0;
    const r = ok(home) ? home : ok(other) ? other : null;
    if (!r) return sbFail(user, "💥 site down!");
    const far = r !== home; let ms = 40 + (far ? 150 : 0);
    const lb = lbOf(r);
    await send(user, lb, { color: far ? "orange" : "pink", dur: far ? 1.4 : 0.7 });
    if (!up(lb)) return sbFail(lb);
    const apps = appsOf(r); if (!apps.length) return sbFail(lb, "💥 no servers!");
    const app = apps[SB.rr[r]++ % apps.length];
    await send(lb, app, { dur: 0.45 });
    if (!up(app)) return sbFail(app);
    const load = nodes[app].load;
    if (load > 1.3 && Math.random() < 0.35) return sbFail(app, "🥵 503 overloaded");
    ms += Math.max(0, load - 0.6) * 320;
    const c = r === "A" ? "cA" : "cB";
    if (up(c) && Math.random() < 0.65) {
      await send(app, c, { color: "red", dur: 0.3 }); if (!up(c)) return sbFail(c);
      await send(c, app, { color: "green", dur: 0.3 }); ms += 5;
    } else {
      const db = dbOf(r); if (!db) return sbFail(app, "💥 no database!");
      const crossDb = (r === "A" && db === "dbB") || (r === "B" && db !== "dbB"); // reading across the ocean is slow
      await send(app, db, { color: "green", dur: crossDb ? 1.6 : 0.6 }); if (!up(db)) return sbFail(db);
      await send(db, app, { color: "green", dur: crossDb ? 1.6 : 0.6 }); ms += 30 + (crossDb ? 150 : 0) + Math.max(0, nodes[db].load - 0.6) * 200;
    }
    await send(app, lb, { color: "yellow", dur: 0.4 }); await send(lb, user, { color: "yellow", dur: far ? 1.3 : 0.6 });
    SB.ok++; SB.lat.push(ms + Math.random() * 25); if (SB.lat.length > 40) SB.lat.shift();
  }
  const REGION_A = ["lbA", "a1", "a2", "a3", "a4", "cA", "dbA", "rA1", "rA2", "qA", "wA1", "wA2"];
  function sbAction(k, btn) {
    if (!topic || topic.id !== "sandbox") return;
    if (k === "spike") SB.spike = !SB.spike;
    else if (k === "add") { const on = !nodes.a4.g.visible; show("a4", on); if (!on) nodes.a4.g.visible = false; }
    else if (k === "cache") setState("cA", nodes.cA.state === "down" ? "up" : "down");
    else if (k === "cable") cut(!cutOn);
    else if (k === "region") { const isDown = nodes.lbA.state === "down"; setState(REGION_A.filter((id) => nodes[id].g.visible), isDown ? "up" : "down"); if (!isDown) pop("lbA", "🌪️ power cut!", { bg: "#ff8787" }); }
    else if (k === "reset") { SB.spike = false; goStep(0); }
    sbButtons();
  }
  function sbButtons() {
    const set = (k, t, on) => { const b = SD.$(`[data-sb="${k}"]`); if (b) { b.textContent = t; b.classList.toggle("on", !!on); } };
    set("spike", SB.spike ? "🔥 Spike ON (tap to calm)" : "🔥 Traffic spike", SB.spike);
    set("add", nodes.a4.g.visible ? "➖ Remove App 4" : "➕ Add App 4", nodes.a4.g.visible);
    set("cache", nodes.cA.state === "down" ? "💚 Fix cache" : "⚡ Kill cache", nodes.cA.state === "down");
    set("cable", cutOn ? "🔧 Fix cable" : "✂️ Cut cable", cutOn);
    set("region", nodes.lbA.state === "down" ? "💚 Restore Region A" : "🌪️ Region A disaster", nodes.lbA.state === "down");
  }
  $("#sbCtrls").addEventListener("click", (e) => { const b = e.target.closest("[data-sb]"); if (b) sbAction(b.dataset.sb, b); });

  /* ---------- topics ---------- */
  const OVER = { pos: [-20, 52, 70], target: [-4, 0, 1] };
  const TOPICS = [
    { id: "journey", t: "📨 Request journey", cam: OVER, steps: [
      { text: "A US user opens the app. First stop: <b>DNS</b>, the internet's phone book — “where does this app live?”", run: async () => { await send("uUS", "dns", { color: "purple", label: "where?" }); await send("dns", "uUS", { color: "purple", label: "→ Region A" }); } },
      { text: "Pictures and scripts come from the nearby <b>CDN</b> shop — quick!", run: async () => { await send("uUS", "cdnUS", { color: "teal", label: "logo.png" }); await send("cdnUS", "uUS", { color: "teal", label: "🖼️" }); } },
      { text: "The real request reaches Region A's <b>load balancer</b>, which picks a healthy server.", run: () => route(["uUS", "lbA", "a2"], { label: "GET /menu" }) },
      { text: "The server checks the <b>cache</b> first… it's a <b>miss</b> ❌", run: async () => { await send("a2", "cA", { color: "red", label: "menu?" }); await send("cA", "a2", { color: "red", label: "❌ miss" }); } },
      { text: "So it asks the <b>primary database</b> (slower, but it knows everything).", run: async () => { await send("a2", "dbA", { color: "green", label: "SELECT", dur: 1.6 }); await send("dbA", "a2", { color: "green", label: "🍕 data", dur: 1.6 }); } },
      { text: "It saves the answer in the cache, then replies to the user. ✅", run: async () => { await send("a2", "cA", { color: "red", label: "SET" }); await route(["a2", "lbA", "uUS"], { color: "yellow", label: "200 OK" }); } },
      { text: "Next time someone asks: <b>cache hit</b> ⚡ — no database trip at all!", run: async () => { await route(["uUS", "lbA", "a1"], { dur: 0.8 }); await send("a1", "cA", { color: "red", dur: 0.5 }); await send("cA", "a1", { color: "green", label: "✅ hit!", dur: 0.5 }); await route(["a1", "lbA", "uUS"], { color: "yellow", dur: 0.8 }); } },
    ] },
    { id: "lb", t: "🚦 Load balancing", cam: { pos: [-4, 40, 26], target: [-14, 0, -13] }, steps: [
      { text: "Crowds of users arrive. The load balancer takes turns (<b>round robin</b>): App 1, App 2, App 3…", loop: true, run: async (al) => { for (let i = 0; i < 6 && al(); i++) { route(["uUS", "lbA", ["a1", "a2", "a3"][i % 3]], { dur: 0.75 }); await SD.sleep(380); } await SD.sleep(700); } },
      { text: "💥 App 2 crashes! The load balancer's <b>health checks</b> start failing…", pre: () => setState("a2", "down"), run: async () => { for (let i = 0; i < 3; i++) { await send("lbA", "a2", { color: "orange", label: "/health?", dur: 0.6 }); pop("a2", "❌ no answer", { bg: "#ff8787", life: 0.8 }); await SD.sleep(250); } } },
      { text: "…so it <b>stops sending</b> traffic to App 2. Users don't even notice. 😎", loop: true, run: async (al) => { for (let i = 0; i < 6 && al(); i++) { route(["uUS", "lbA", ["a1", "a3"][i % 2]], { dur: 0.75 }); await SD.sleep(380); } await SD.sleep(700); } },
      { text: "Traffic keeps growing → <b>autoscaling</b> adds App 4 automatically! 🆕", pre: () => show("a4"), loop: true, run: async (al) => { for (let i = 0; i < 6 && al(); i++) { route(["uUS", "lbA", ["a1", "a3", "a4"][i % 3]], { dur: 0.75 }); await SD.sleep(300); } await SD.sleep(600); } },
    ] },
    { id: "cache", t: "⚡ Caching", cam: { pos: [-6, 28, 10], target: [12, 0, -16] }, steps: [
      { text: "Request #1 asks for the menu: cache <b>miss</b> → slow trip to the database (~20 ms).", run: async () => { await send("a1", "cA", { color: "red", label: "menu?" }); await send("cA", "a1", { color: "red", label: "❌ miss" }); await send("a1", "dbA", { color: "green", dur: 1.8 }); await send("dbA", "a1", { color: "green", dur: 1.8, label: "🍕" }); await send("a1", "cA", { color: "red", label: "SET ttl=60s" }); } },
      { text: "Everyone after that gets a cache <b>hit</b> (~1 ms). The database gets to rest 😴", pre: () => setState("dbA", "good"), loop: true, run: async (al) => { for (const a of ["a2", "a3", "a1"]) { if (!al()) return; send(a, "cA", { color: "red", dur: 0.45 }).then(() => send("cA", a, { color: "green", dur: 0.45, label: "hit" })); await SD.sleep(350); } await SD.sleep(500); } },
      { text: "⏰ The entry's <b>TTL</b> expires (so data can't stay stale forever). The next request refills it.", run: async () => { pop("cA", "⏰ expired!"); await SD.sleep(700); await send("a3", "cA", { color: "red", label: "miss" }); await send("a3", "dbA", { color: "green", dur: 1.4 }); await send("dbA", "a3", { color: "green", dur: 1.4 }); await send("a3", "cA", { color: "red", label: "SET" }); } },
    ] },
    { id: "cdn", t: "🌐 CDN", cam: OVER, steps: [
      { text: "No CDN: a European user fetches a big video from storage in the US — a long trip across the ocean 🐌", run: async () => { await send("uEU", "s3", { color: "orange", dur: 2.8, label: "video.mp4?" }); await send("s3", "uEU", { color: "orange", dur: 2.8, label: "🎬" }); } },
      { text: "With a CDN: the first request makes the EU edge fetch it <b>once</b> from the origin…", run: async () => { await send("uEU", "cdnEU", { color: "teal" }); await send("cdnEU", "s3", { color: "orange", dur: 2.4, label: "miss → origin" }); await send("s3", "cdnEU", { color: "orange", dur: 2.4, label: "🎬 copy" }); await send("cdnEU", "uEU", { color: "teal" }); } },
      { text: "…then every other request is served from the nearby edge ⚡ (same for US users).", pre: () => setState(["cdnEU", "cdnUS"], "good"), loop: true, run: async () => { send("uEU", "cdnEU", { color: "teal", dur: 0.5 }).then(() => send("cdnEU", "uEU", { color: "green", dur: 0.5, label: "⚡" })); await SD.sleep(250); send("uUS", "cdnUS", { color: "teal", dur: 0.5 }).then(() => send("cdnUS", "uUS", { color: "green", dur: 0.5 })); await SD.sleep(900); } },
    ] },
    { id: "repl", t: "📠 Replication", cam: { pos: [62, 42, 30], target: [18, 0, 0] }, steps: [
      { text: "Every <b>write</b> goes to the primary database 👑", run: () => send("a1", "dbA", { color: "pink", label: "name=Zed" }) },
      { text: "The primary copies the change to its replicas — even one across the ocean in Europe (that one lags a bit 🐢).", run: async () => { send("dbA", "rA1", { color: "green", label: "copy" }); send("dbA", "rA2", { color: "green", label: "copy" }); await send("dbA", "dbB", { color: "green", dur: 2.6, label: "copy 🌊" }); } },
      { text: "<b>Reads</b> are spread across replicas, so the primary isn't overwhelmed.", loop: true, run: async () => { send("a2", "rA1", { color: "blue", dur: 0.7 }).then(() => send("rA1", "a2", { color: "blue", dur: 0.7 })); await SD.sleep(300); send("a3", "rA2", { color: "blue", dur: 0.7 }).then(() => send("rA2", "a3", { color: "blue", dur: 0.7 })); await SD.sleep(300); send("b2", "dbB", { color: "blue", dur: 0.7 }).then(() => send("dbB", "b2", { color: "blue", dur: 0.7 })); await SD.sleep(800); } },
      { text: "💥 The primary dies → Replica 1 is <b>promoted</b> to be the new primary. Writes go there now.", pre: () => { setState("dbA", "down"); setLabel("rA1", "👑 New primary"); setState("rA1", "good"); }, run: async () => { pop("rA1", "promoted! 🎉"); await send("a1", "rA1", { color: "pink", label: "write" }); await send("rA1", "rA2", { color: "green" }); } },
    ] },
    { id: "shard", t: "🍕 Sharding", cam: { pos: [6, 30, 14], target: [22, 0, -14] },
      setup: () => { setLabel("dbA", "🍕 Shard 1 · A–H"); setLabel("rA1", "🍕 Shard 2 · I–P"); setLabel("rA2", "🍕 Shard 3 · Q–Z"); },
      steps: [
        { text: "Too much data for one machine → split it into 3 <b>shards</b> by the first letter of the user's name.", run: async () => { pulse(["dbA", "rA1", "rA2"]); await SD.sleep(1500); } },
        { text: "The app routes each request using the <b>shard key</b> (the name).", loop: true, run: async () => { const n = shuffle(["Ana", "Ben", "Kai", "Mia", "Omar", "Raj", "Zoe", "Liu", "Eve", "Tom"]); const c = n[0]; const t = c <= "H" ? "dbA" : c <= "P" ? "rA1" : "rA2"; await send(shuffle(["a1", "a2", "a3"]), t, { color: "purple", label: n, dur: 0.9 }); } },
        { text: "⚠️ <b>Hot shard!</b> A celebrity named Taylor gets millions of reads → Shard 3 overheats 🔥", pre: () => setState("rA2", "warn"), loop: true, run: async () => { for (let i = 0; i < 4; i++) { send(shuffle(["a1", "a2", "a3"]), "rA2", { color: "red", label: "Taylor", dur: 0.7 }); await SD.sleep(150); } await SD.sleep(400); } },
        { text: "Fix: put the hot data in the <b>cache</b> (or split the hot shard / use a hashed key). Shard 3 cools down 😌", pre: () => setState("rA2", "up"), loop: true, run: async () => { const a = shuffle(["a1", "a2", "a3"]); send(a, "cA", { color: "red", dur: 0.5, label: "Taylor" }).then(() => send("cA", a, { color: "green", dur: 0.5, label: "hit" })); await SD.sleep(450); } },
      ] },
    { id: "queue", t: "📬 Queues & workers", cam: { pos: [2, 26, 22], target: [14, 0, -7] }, steps: [
      { text: "Users upload photos. Resizing is slow, so the app drops a <b>job</b> in the queue and replies right away ✅", loop: true, run: async () => { await route(["uUS", "lbA", "a3"], { dur: 0.6 }); send("a3", "qA", { color: "purple", label: "resize", dur: 0.6, onArrive: () => setQ(A.q + 1) }); await send("a3", "uUS", { color: "yellow", label: "✅ uploaded!", dur: 1 }); } },
      { text: "<b>Workers</b> pull jobs off the queue at their own pace, and save results to storage.", loop: true, run: async () => { if (A.q < 3) setQ(A.q + 2); const w = shuffle(["wA1", "wA2"]); setQ(A.q - 1); await send("qA", w, { color: "purple", dur: 0.6 }); await send(w, "s3", { color: "teal", label: "🖼️ saved", dur: 1 }); } },
      { text: "🔥 A traffic spike! Jobs pile up in the queue… but nothing crashes. Workers just keep chewing.", loop: true, run: async () => { for (let i = 0; i < 5; i++) { send("a3", "qA", { color: "purple", dur: 0.5, onArrive: () => setQ(A.q + 1) }); await SD.sleep(120); } if (A.q > 0) { setQ(A.q - 1); send("qA", shuffle(["wA1", "wA2"]), { color: "purple", dur: 0.5 }); } await SD.sleep(400); } },
      { text: "Autoscaling on <b>queue length</b>: more workers join and the line shrinks. 💪", loop: true, run: async () => { for (const w of ["wA1", "wA2", "wA1", "wA2"]) { if (A.q > 0) { setQ(A.q - 1); send("qA", w, { color: "purple", dur: 0.4 }); } await SD.sleep(160); } await SD.sleep(250); } },
    ] },
    { id: "failover", t: "🌪️ Region failover", cam: OVER, steps: [
      { text: "Normally <b>GeoDNS</b> sends US users to Region A and EU users to Region B.", loop: true, run: async () => { route(["uUS", "lbA", shuffle(["a1", "a2", "a3"])], { dur: 0.8 }); await SD.sleep(300); await route(["uEU", "lbB", shuffle(["b1", "b2"])], { color: "blue", dur: 0.8 }); } },
      { text: "🌪️ <b>Disaster!</b> Region A loses power. Everything there goes dark.", pre: () => setState(["lbA", "a1", "a2", "a3", "cA", "dbA", "rA1", "rA2", "qA", "wA1", "wA2"], "down"), run: async () => { pop("lbA", "⚡ power cut!", { bg: "#ff8787" }); await send("uUS", "lbA", { color: "red", label: "hello?" }); pop("lbA", "…no answer", { bg: "#ff8787" }); await SD.sleep(600); } },
      { text: "GeoDNS notices failing health checks and now sends <b>US users to Europe</b>. Slower, but working! 🌍", loop: true, run: async () => { route(["uUS", "lbB", shuffle(["b1", "b2"])], { dur: 1 }); await SD.sleep(400); await route(["uEU", "lbB", shuffle(["b1", "b2"])], { color: "blue", dur: 0.8 }); } },
      { text: "Region B's replica becomes the <b>primary</b>. The app survives 💪 (writes not yet copied before the crash are lost — that's the RPO).", pre: () => { setLabel("dbB", "👑 Primary (EU)"); setState("dbB", "good"); }, run: async () => { pop("dbB", "promoted! 🎉"); await send("b1", "dbB", { color: "pink", label: "write" }); } },
    ] },
    { id: "cap", t: "🔺 CAP & partitions", cam: { pos: [70, 38, 26], target: [22, 0, 2] }, steps: [
      { text: "Both regions keep copies of the same data and sync over the <b>undersea cable</b>.", pre: () => { setLabel("dbA", "🗄️ US · x = 1"); setLabel("dbB", "📠 EU · x = 1"); }, loop: true, run: async () => { await send("dbA", "dbB", { color: "green", dur: 1.4, label: "sync" }); await send("dbB", "dbA", { color: "green", dur: 1.4 }); } },
      { text: "✂️ The cable is cut — a <b>network partition</b>! The regions can't talk.", pre: () => cut(true), run: async () => { pop("dbA", "can't reach EU 😟"); await SD.sleep(1600); } },
      { text: "<b>AP choice</b>: both sides keep accepting writes → always available, but the copies now <b>disagree</b> (US x=5, EU x=7).", pre: () => { setLabel("dbA", "🗄️ US · x = 5"); setLabel("dbB", "📠 EU · x = 7"); setState(["dbA", "dbB"], "warn"); }, loop: true, run: async () => { send("a1", "dbA", { color: "pink", label: "x=5", dur: 0.9 }); await send("b1", "dbB", { color: "blue", label: "x=7", dur: 0.9 }); await SD.sleep(600); } },
      { text: "<b>CP choice</b>: the side that can't confirm refuses writes → data never disagrees, but EU is <b>unavailable</b> for writes.", pre: () => { setLabel("dbA", "🗄️ US · x = 5"); setLabel("dbB", "🚫 EU · read-only"); setState(["dbA", "dbB"], "up"); setState("dbB", "down"); }, loop: true, run: async () => { await send("b1", "dbB", { color: "blue", label: "x=7?", dur: 0.9 }); pop("dbB", "🚫 refused", { bg: "#ff8787", life: 1 }); await SD.sleep(900); } },
      { text: "🔧 Cable fixed → copies <b>reconcile</b> and agree again (eventual consistency). 🤝", pre: () => { cut(false); setState(["dbA", "dbB"], "up"); setLabel("dbA", "🗄️ US · x = 7"); setLabel("dbB", "📠 EU · x = 7"); setState(["dbA", "dbB"], "good"); }, loop: true, run: async () => { await send("dbA", "dbB", { color: "green", dur: 1.2, label: "sync ✅" }); await send("dbB", "dbA", { color: "green", dur: 1.2 }); } },
    ] },
    { id: "sandbox", t: "🎮 Sandbox: break it!", cam: OVER, steps: [
      { text: "🎮 <b>Your turn!</b> Real traffic is flowing from both towns. <b>Tap any machine</b> to crash it 💥 (tap again to fix it), or use the buttons below. Watch the 📊 load meters and the live stats in the corner — can you keep the site up?", loop: true,
        run: async () => {
          const n = SB.spike ? 3 : 1;
          for (let i = 0; i < n; i++) { sbRequest(Math.random() < 0.6 ? "A" : "B"); if (n > 1) await SD.sleep(80); }
          if (Math.random() < 0.12 && !cutOn && up("dbA") && up("dbB")) send("dbA", "dbB", { color: "green", dur: 1.6, label: "sync" });
          await SD.sleep(SB.spike ? 0 : 550);
        } },
    ] },
  ];

  /* ---------- tour engine ---------- */
  let topic = null, step = 0, auto = false, autoTimer = 0;
  function flyTo(pos, target, dur = 1.3) {
    const k = SD.clamp(1.6 / camera.aspect, 1, 2.4); // back the camera off on narrow screens
    const t = v3(...target), p = v3(...pos).sub(t).multiplyScalar(k).add(t);
    fly = { fromP: camera.position.clone(), fromT: controls.target.clone(), toP: p, toT: t, t: 0, dur };
  }
  function renderNarr() {
    $("#narrMeta").textContent = `${topic.t} · step ${step + 1} of ${topic.steps.length}`;
    $("#narrTxt").innerHTML = topic.steps[step].text;
    $("#stepDots").innerHTML = topic.steps.map((_, i) => `<i class="${i === step ? "on" : i < step ? "done" : ""}" data-i="${i}" title="Step ${i + 1}"></i>`).join("");
    $("#prevStep").disabled = step === 0;
    $("#nextStep").textContent = step === topic.steps.length - 1 ? "Next topic ⏭" : "Next ⏭";
    $("#fsTxt").innerHTML = `<b>${topic.t} · ${step + 1}/${topic.steps.length}</b><br>${topic.steps[step].text}`;
  }
  async function goStep(i) {
    const g = ++GEN; clearTimeout(autoTimer); clearPackets();
    step = i; resetWorld(); topic.setup && topic.setup(A);
    if (topic.id === "sandbox") { SB.ok = 0; SB.err = 0; SB.lat = []; }
    sbButtons();
    for (let k = 0; k <= i; k++) topic.steps[k].pre && topic.steps[k].pre(A);
    renderNarr();
    const s = topic.steps[i], alive = () => g === GEN;
    if (s.loop && auto) autoTimer = setTimeout(() => { if (alive() && auto) next(); }, 7000);
    do { await s.run(alive); if (!alive()) return; await SD.sleep(s.loop ? 250 : 0); } while (s.loop && alive());
    if (auto && alive()) { await SD.sleep(1800); if (alive() && auto) next(); }
  }
  function setTopic(id, keepCam) {
    topic = TOPICS.find((t) => t.id === id);
    $$("#topics .chip").forEach((b) => b.setAttribute("aria-selected", b.dataset.id === id ? "true" : "false"));
    $("#sbCtrls").hidden = id !== "sandbox"; SB.spike = false;
    if (!keepCam) flyTo(topic.cam.pos, topic.cam.target);
    goStep(0);
  }
  function next() {
    if (step < topic.steps.length - 1) goStep(step + 1);
    else { const i = TOPICS.indexOf(topic); setTopic(TOPICS[(i + 1) % TOPICS.length].id); }
  }
  $("#topics").innerHTML = TOPICS.map((t) => `<button class="chip" role="tab" data-id="${t.id}">${t.t}</button>`).join("");
  $("#topics").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setTopic(b.dataset.id); });
  $("#nextStep").addEventListener("click", next);
  $("#prevStep").addEventListener("click", () => step > 0 && goStep(step - 1));
  $("#stepDots").addEventListener("click", (e) => { const d = e.target.closest("i"); if (d) goStep(+d.dataset.i); });
  $("#autoBtn").addEventListener("click", (e) => { auto = !auto; e.target.textContent = auto ? "⏸ Pause auto" : "▶ Auto-play"; e.target.classList.toggle("on", auto); if (auto) goStep(step); });

  /* ---------- picking + legend ---------- */
  function showInfo(id) {
    const n = nodes[id], [title, txt] = INFO[n.info] || INFO[n.type];
    const box = $("#info3d"); box.innerHTML = `<h3>${title} <span class="muted small">· ${n.cur}</span></h3><p class="mb0">${txt}</p>`;
    box.classList.remove("show"); void box.offsetWidth; box.classList.add("show");
    pulse(id);
  }
  function setupPicking() {
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
    const el = renderer.domElement;
    const pick = (e) => {
      const r = el.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(clickables.filter((m) => nodes[m.userData.nodeId].g.visible), false)[0];
      return hit ? hit.object.userData.nodeId : null;
    };
    const sandboxable = (id) => topic && topic.id === "sandbox" && TOGGLE.has(nodes[id].type);
    el.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
    el.addEventListener("pointerup", (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const id = pick(e); if (!id) return;
      if (sandboxable(id)) {
        const wasDown = nodes[id].state === "down";
        setState(id, wasDown ? "up" : "down");
        pop(id, wasDown ? "💚 fixed!" : "💥 crashed!", { bg: wasDown ? "#b2f2bb" : "#ff8787", life: 1.1 });
        sbButtons();
      }
      showInfo(id);
    });
    // hover: grow a little, pointer cursor, tooltip (mouse only)
    const tip = $("#tip3d"); let lastMove = 0;
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || e.buttons) { tip.hidden = true; return; }
      const now = performance.now(); if (now - lastMove < 50) return; lastMove = now;
      const id = pick(e);
      if (id !== hovered) { if (hovered) nodes[hovered].hover = false; hovered = id; if (id) nodes[id].hover = true; el.style.cursor = id ? "pointer" : ""; }
      if (!id) { tip.hidden = true; return; }
      const n = nodes[id], title = (INFO[n.info] || INFO[n.type])[0];
      tip.innerHTML = `${title}<br><small>${sandboxable(id) ? (n.state === "down" ? "💚 click to fix it" : "💥 click to crash it") : "👆 click to learn more"}</small>`;
      const r = stage.getBoundingClientRect(); tip.hidden = false;
      tip.style.left = Math.min(e.clientX - r.left + 16, r.width - 250) + "px"; tip.style.top = e.clientY - r.top + 14 + "px";
    });
    el.addEventListener("pointerleave", () => { tip.hidden = true; if (hovered) nodes[hovered].hover = false; hovered = null; });
  }
  const LEG = [["uUS", "👥 Users"], ["dns", "📖 GeoDNS"], ["cdnEU", "🌐 CDN edges"], ["lbA", "🚦 Load balancer"], ["a2", "🖥️ App servers"], ["cA", "⚡ Cache"], ["dbA", "🗄️ Primary DB"], ["rA1", "📠 Replicas"], ["qA", "📬 Queue"], ["wA1", "👷 Workers"], ["s3", "🪣 Storage"], ["dbB", "🇪🇺 Europe region"]];
  $("#legend3d").innerHTML = LEG.map(([id, l]) => `<button data-id="${id}">${l}</button>`).join("");
  $("#legend3d").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !renderer) return; const n = nodes[b.dataset.id];
    flyTo([n.x - 12, 18, n.z + 20], [n.x, 1, n.z], 1.1); showInfo(n.id);
    stage.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#btnLabels").addEventListener("click", (e) => {
    showLabels = !showLabels; e.currentTarget.classList.toggle("on", !showLabels);
    Object.values(nodes).forEach((n) => (n.lab.visible = showLabels));
    scene.traverse((o) => { if (o.isSprite && o.userData.region) o.visible = showLabels; });
  });
  $("#btnSpin").addEventListener("click", (e) => { controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle("on", controls.autoRotate); });
  $("#btnLoad").addEventListener("click", (e) => { showLoad = !showLoad; e.currentTarget.classList.toggle("on", !showLoad); });
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  if (!(stage.requestFullscreen || stage.webkitRequestFullscreen)) $("#btnFull").hidden = true;
  $("#btnFull").addEventListener("click", () => {
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage);
  });
  $("#fsPrev").addEventListener("click", () => step > 0 && goStep(step - 1));
  $("#fsNext").addEventListener("click", () => next());
  document.addEventListener("keydown", (e) => {
    if (!topic || /input|textarea|select/i.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (step > 0) goStep(step - 1); }
  });
  $("#btnView").addEventListener("click", () => flyTo(topic ? topic.cam.pos : OVER.pos, topic ? topic.cam.target : OVER.target));

  /* ---------- frame loop ---------- */
  function frame(dt, time) {
    if (fly) {
      fly.t += dt / fly.dur; const k = SD.ease(Math.min(1, fly.t));
      camera.position.lerpVectors(fly.fromP, fly.toP, k); controls.target.lerpVectors(fly.fromT, fly.toT, k);
      if (fly.t >= 1) fly = null;
    }
    controls.update();
    Object.values(nodes).forEach((n) => {
      if (n.popIn > 0) { n.popIn = Math.min(1, n.popIn + dt * 2.5); const s = n.popIn < 1 ? 1 + Math.sin(n.popIn * Math.PI) * 0.35 : 1; n.g.scale.setScalar(Math.max(0.05, n.popIn < 0.4 ? n.popIn / 0.4 : s)); if (n.popIn >= 1) n.popIn = 0; }
      if (n.pulse > 0) { n.pulse = Math.max(0, n.pulse - dt); n.g.scale.setScalar(1 + Math.sin((n.pulse / 0.7) * Math.PI) * 0.18); }
      else if (!n.popIn) { const ts = n.hover ? 1.07 : 1, cs = n.g.scale.x; if (Math.abs(cs - ts) > 0.001) n.g.scale.setScalar(cs + (ts - cs) * Math.min(1, dt * 12)); }
      const down = n.state === "down";
      if (n.meter) {
        n.load *= Math.exp(-dt * 0.9); n.hotCd = Math.max(0, n.hotCd - dt);
        const vis = showLoad && !down && n.g.visible; n.meter.g.visible = vis;
        if (vis) {
          const L = Math.min(1, n.load); n.meter.fill.scale.x = Math.max(0.02, L) * n.meter.W; n.meter.g.quaternion.copy(camera.quaternion);
          n.meter.fill.material.color.copy(L < 0.5 ? MC.g : L < 0.8 ? MC.y : MC.r);
          if (n.load > 1.15 && !n.hotCd) { n.hotCd = 3.5; pop(n.id, "🥵 overloaded!", { bg: "#ffc9c9", life: 1.3 }); }
        }
      }
      n.meshes.forEach((m) => {
        const u = m.userData;
        if (u.led != null) m.material.emissiveIntensity = down ? 0 : (0.35 + 0.9 * (Math.sin(time * 5 + u.led) > 0 ? 1 : 0)) * nightK;
        else if (u.glow) m.material.emissiveIntensity = down ? 0 : u.baseEI * nightK;
        else if (n.warn) m.material.emissive.setRGB(0.45 + 0.3 * Math.sin(time * 8), 0.03, 0.01);
      });
      if (n.halo.visible) n.halo.material.opacity = n.state === "good" ? 0.8 : 0.45 + 0.4 * Math.sin(time * 7);
    });
    anim.spin.forEach((s) => { s.o.rotation.y += dt * s.s; if (s.bob) s.o.position.y = 4.4 + Math.sin(time * 2) * s.bob; });
    anim.fans.forEach((f) => (f.rotation.y += dt * 6));
    anim.bob.forEach((b) => (b.o.position.y = Math.abs(Math.sin(time * 3 + b.p)) * 0.12));
    anim.flags.forEach((f) => { const p = f.geo.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const x = f.base[i]; p[i + 2] = Math.sin(x * 2.2 - time * 4) * 0.12 * x; p[i + 1] = f.base[i + 1] - x * 0.04; } f.geo.attributes.position.needsUpdate = true; });
    anim.clouds.forEach((c) => { c.o.position.x += c.v * dt; if (c.o.position.x > 190) c.o.position.x = -190; c.o.position.y = c.y0 + Math.sin(time * 0.6 + c.p) * 0.4; });
    if (waterGeo) { const p = waterGeo.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const x = waterBase[i], z = waterBase[i + 2]; p[i + 1] = Math.sin(x * 0.22 + time * 1.5) * 0.12 + Math.cos(z * 1.1 + x * 0.05 + time * 1.1) * 0.08; } waterGeo.attributes.position.needsUpdate = true; }
    qCubes.forEach((c, i) => { if (c.visible) c.position.x = 3.2 - ((i * 0.7 + time * 0.6) % 7); });
    anim.cars.forEach((c) => {
      c.x += c.dir * c.sp * dt;
      if (c.x > -13.5) { c.x = -13.5; c.dir = -1; } else if (c.x < -40) { c.x = -40; c.dir = 1; }
      c.o.position.set(c.x, 0.06, c.z + (c.dir > 0 ? 0.8 : -0.8)); c.o.rotation.y = c.dir > 0 ? 0 : Math.PI;
    });
    anim.boats.forEach((b) => {
      b.x += b.dir * b.sp * dt; if (b.x > 170) b.x = -170; else if (b.x < -170) b.x = 170;
      b.o.position.set(b.x, -0.3 + Math.sin(time * 2 + b.x) * 0.06, b.z);
      b.o.rotation.set(Math.sin(time * 1.7 + b.x) * 0.05, b.dir > 0 ? 0 : Math.PI, Math.sin(time * 1.3 + b.x) * 0.05);
    });
    anim.birds.forEach((b) => {
      const a = time * 0.16 + b.off; b.o.position.set(5 + Math.cos(a) * b.r, b.h + Math.sin(time * 0.8 + b.ph) * 1.2, -15 + Math.sin(a) * b.r);
      b.o.rotation.y = Math.PI - a; const f = Math.sin(time * 9 + b.ph) * 0.6; b.wl.rotation.z = f; b.wr.rotation.z = -f;
    });
    hudT -= dt; if (hudT <= 0) { hudT = 0.3; updateHud(); }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]; p.t += dt / p.dur;
      if (p.t < 0) continue;
      const pos = p.curve.getPoint(SD.ease(Math.min(1, p.t)));
      p.m.visible = true; p.m.position.copy(pos);
      p.hist.unshift(pos.clone()); if (p.hist.length > 16) p.hist.pop();
      p.trail.forEach((t, k) => { const h = p.hist[(k + 1) * 3]; if (h) { t.visible = true; t.position.copy(h); } });
      if (p.t >= 1) {
        disposePacket(p); packets.splice(i, 1);
        const tn = nodes[p.to]; if (tn && tn.meter && tn.state !== "down") tn.load += LOAD[tn.type];
        p.onArrive && p.onArrive(); p.res();
      }
    }
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.t += dt; p.s.position.y += dt * 1.4; p.s.material.opacity = Math.max(0, 1 - Math.max(0, p.t - p.life * 0.6) / (p.life * 0.4)); if (p.t >= p.life) { disposePop(p); pops.splice(i, 1); } }
    renderer.render(scene, camera);
  }

  /* ---------- boot ---------- */
  (async function boot() {
    try { if (document.fonts) await Promise.race([document.fonts.load('44px "Patrick Hand"'), SD.sleep(2500)]); } catch (e) {}
    try { build(); } catch (e) { console.error(e); SD.errors && SD.errors.push("3D build: " + e.message); stage.classList.add("fail"); $("#loading3d").remove(); return; }
    $("#loading3d").remove();
    camera.position.set(-60, 90, 120); controls.target.set(0, 0, 0);
    SD.loop(stage, frame).start();
    setTopic(location.hash && TOPICS.some((t) => "#" + t.id === location.hash) ? location.hash.slice(1) : "journey");
  })();
})();
