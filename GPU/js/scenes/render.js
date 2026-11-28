/* =========================================================
   Chapter 7 deep dive: ONE frame in slow motion.
   Model → View → Projection matrices, vertex shader, back-face culling,
   rasterization, depth test, pixel shader, final frame.
   The math is real: a tiny software "GPU" below renders the final 32×24 picture.
   ========================================================= */
GPU3D.register('render', function (ctx) {
  const { T, K, C, scene } = ctx;
  const root = new T.Group(); scene.add(root);
  const V3 = (x, y, z) => new T.Vector3(x || 0, y || 0, z || 0);

  /* ---------- the tiny game world: two objects in their own model space ---------- */
  const cube = {
    verts: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]],
    faces: [[[0, 1, 2, 3], C.pink], [[5, 4, 7, 6], C.cyan], [[1, 5, 6, 2], C.yellow], [[4, 0, 3, 7], C.green], [[3, 2, 6, 7], C.orange], [[4, 5, 1, 0], C.purple]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]],
    pos: [.75, .62, .5], rot: [.3, .7, .1], scl: .5
  };
  const pyr = {
    verts: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1], [0, 1.3, 0]],
    faces: [[[0, 1, 4], C.blue], [[1, 2, 4], C.purple], [[2, 3, 4], 0x6fd6ff], [[3, 0, 4], 0x5a8cff], [[3, 2, 1, 0], C.brown]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]],
    pos: [-2.3, 1.1, -1.6], rot: [0, .4, 0], scl: .8
  };
  const OBJ = [cube, pyr];
  const _p = V3(), _q = new T.Quaternion(), _s = V3(), QI = new T.Quaternion();
  const decompose = m => { const d = { p: V3(), q: new T.Quaternion(), s: V3() }; m.decompose(d.p, d.q, d.s); return d; };
  // blend from "do nothing" (identity) to a full matrix — lets us animate a matrix being applied
  const lerpMat = (D, t, out) => out.compose(_p.set(0, 0, 0).lerp(D.p, t), _q.copy(QI).slerp(D.q, t), _s.set(1, 1, 1).lerp(D.s, t));

  OBJ.forEach(o => {
    o.M = new T.Matrix4().compose(V3(...o.pos), new T.Quaternion().setFromEuler(new T.Euler(...o.rot)), V3(o.scl, o.scl, o.scl));
    o.D = decompose(o.M);
    o.tris = [];
    o.faces.forEach(([f, col]) => {
      if (f.length === 4) {
        o.tris.push({ i: [f[0], f[1], f[2]], uv: [[0, 0], [1, 0], [1, 1]], col });
        o.tris.push({ i: [f[0], f[2], f[3]], uv: [[0, 0], [1, 1], [0, 1]], col });
      } else o.tris.push({ i: f, uv: [[0, 0], [1, 0], [.5, 1]], col });
    });
    const n = o.tris.length * 3, cols = new Float32Array(n * 3), cc = new T.Color();
    o.tris.forEach((t, k) => { cc.setHex(t.col); for (let j = 0; j < 3; j++) cols.set([cc.r, cc.g, cc.b], (k * 3 + j) * 3); });
    o.geo = new T.BufferGeometry();
    o.geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    o.geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    const m = K.mat(0xffffff, true); m.vertexColors = true;
    o.mesh = new T.Mesh(o.geo, m); o.mesh.frustumCulled = false; root.add(o.mesh);
    o.egeo = new T.BufferGeometry();
    o.egeo.setAttribute('position', new T.BufferAttribute(new Float32Array(o.edges.length * 6), 3));
    const lines = new T.LineSegments(o.egeo, K.inkLine); lines.frustumCulled = false; lines.raycast = () => {}; o.mesh.add(lines);
    o.world = o.verts.map(() => V3()); o.view = o.verts.map(() => V3()); o.ndc = o.verts.map(() => V3()); o.cur = o.verts.map(() => V3());
  });
  ctx.pick(cube.mesh, '📦 The cube', '8 corners (vertices), 6 faces, 12 triangles. Everything a GPU draws is built from triangles like these.');
  ctx.pick(pyr.mesh, '🔺 The pyramid', '5 corners, 6 triangles. It sits farther from the camera — watch it shrink during projection!');

  /* ---------- the game camera (the player's eye) ---------- */
  const NEAR = 2, FAR = 9, FOV = 44;
  const gameCam = new T.PerspectiveCamera(FOV, 4 / 3, NEAR, FAR);
  gameCam.position.set(2.8, 1.75, 3.6); gameCam.lookAt(-.8, .8, -.6);
  gameCam.updateMatrixWorld(true); gameCam.updateProjectionMatrix();
  const CAMW = gameCam.matrixWorld.clone(), VIEW = gameCam.matrixWorldInverse.clone(), PROJ = gameCam.projectionMatrix.clone();
  const DV = decompose(VIEW);
  const camIcon = K.group(K.box(.44, .32, .34, C.dark), K.cyl(.12, .15, .22, C.cyan, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, -.27] }), K.box(.14, .08, .1, C.red, { pos: [.1, .2, .04] }));
  camIcon.matrixAutoUpdate = false; root.add(camIcon);
  ctx.pick(camIcon, '📷 The game camera', 'The player’s eye. Where it stands and where it looks becomes the <b>View matrix</b>.');

  // the "clip box" (NDC cube) we draw in front of the camera, and the flat screen
  const BX = 2, BY = 1.5, ZN = -3, ZF = -6;
  const boxOf = (n, out) => out.set(n.x * BX, n.y * BY, K.lerp(ZN, ZF, (n.z + 1) / 2));

  // frustum: what the camera can see (near & far rectangles), squishes into the clip box
  const tH = Math.tan(FOV / 2 * Math.PI / 180);
  const FR = [];
  [[NEAR, ZN], [FAR, ZF]].forEach(([d, bz]) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => FR.push({ c: V3(sx * tH * d * 4 / 3, sy * tH * d, -d), box: V3(sx * BX, sy * BY, bz) })));
  const frEdges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const frGeo = new T.BufferGeometry(); frGeo.setAttribute('position', new T.BufferAttribute(new Float32Array((frEdges.length + 4) * 6), 3));
  const frustum = new T.LineSegments(frGeo, new T.LineBasicMaterial({ color: C.blue })); frustum.frustumCulled = false; root.add(frustum);

  // ground grid of the game world
  const GP = []; for (let i = -4; i <= 4; i++) GP.push(V3(i, 0, -5), V3(i, 0, 3), V3(-4, 0, i - 1), V3(4, 0, i - 1));
  const gGeo = new T.BufferGeometry(); gGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(GP.length * 3), 3));
  const ground = new T.LineSegments(gGeo, new T.LineBasicMaterial({ color: 0x9aa0b8, transparent: true, opacity: .55 })); ground.frustumCulled = false; root.add(ground);

  // the cube's own little axes (model space)
  const AX = [V3(), V3(1.7, 0, 0), V3(), V3(0, 1.7, 0), V3(), V3(0, 0, 1.7)];
  const axGeo = new T.BufferGeometry(); axGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(18), 3));
  axGeo.setAttribute('color', new T.BufferAttribute(new Float32Array([1, .3, .3, 1, .3, .3, .2, .8, .4, .2, .8, .4, .2, .5, 1, .2, .5, 1]), 3));
  const axes = new T.LineSegments(axGeo, new T.LineBasicMaterial({ vertexColors: true })); axes.frustumCulled = false; root.add(axes);

  // vertex dots
  const NDOT = 13;
  const dots = K.instanced(new T.SphereGeometry(.065, 12, 8), NDOT, 0xffffff, true, true); root.add(dots);
  const dotBase = []; for (let i = 0; i < NDOT; i++) dotBase.push(new T.Color(i === 0 ? C.pink : i < 8 ? 0xffffff : 0xbfe9ff));
  dotBase.forEach((c, i) => dots.setColorAt(i, c));
  const dotScale = new Float32Array(NDOT).fill(1);
  ctx.pick(dots, '⚪ Vertices', 'The corner points. Each one gets its own vertex-shader thread on the GPU.');

  /* ---------- the screen: 32 × 24 pixels ---------- */
  const GW = 32, GH = 24, CWD = 2 * BX / GW, NPIX = GW * GH;
  const pc = (i, j) => [-BX + (i + .5) * CWD, -BY + (j + .5) * CWD];
  const tiles = K.instanced(K.rgeo(CWD * .9, CWD * .9, .03, .008, 1), NPIX, 0xe6e0cf);
  for (let k = 0; k < NPIX; k++) { const [x, y] = pc(k % GW, Math.floor(k / GW)); K.dummy.position.set(x, y, ZN - .04); K.dummy.rotation.set(0, 0, 0); K.dummy.scale.setScalar(1); K.dummy.updateMatrix(); tiles.setMatrixAt(k, K.dummy.matrix); }
  root.add(tiles);
  ctx.pick(tiles, '🟦 The screen', 'Our screen is only 32 × 24 = 768 pixels so you can see each one. A 1080p screen has 2,073,600!');
  const brickGeo = K.rgeo(CWD * .84, CWD * .84, 1, .012, 1);
  const bricks = K.instanced(brickGeo, NPIX, 0xffffff); root.add(bricks);
  const rejects = K.instanced(brickGeo, NPIX, C.red, true); root.add(rejects);
  ctx.pick(bricks, '🧱 Fragments', 'Each brick is a fragment: a “pixel candidate”. Taller = closer to the camera. The depth test keeps the closest one.');
  const bh = new Float32Array(NPIX), rh = new Float32Array(NPIX), bcol = Array.from({ length: NPIX }, () => new T.Color(0xffffff));
  function writeBricks() {
    K.dummy.rotation.set(0, 0, 0);
    for (let k = 0; k < NPIX; k++) {
      const [x, y] = pc(k % GW, Math.floor(k / GW));
      let h = bh[k], on = h > 1e-3 ? 1 : 0;
      K.dummy.position.set(x, y, ZN + h / 2); K.dummy.scale.set(on, on, Math.max(1e-3, h)); K.dummy.updateMatrix();
      bricks.setMatrixAt(k, K.dummy.matrix); bricks.setColorAt(k, bcol[k]);
      h = rh[k]; on = h > 1e-3 ? 1 : 0;
      K.dummy.position.set(x, y, ZN + h / 2 + .002); K.dummy.scale.set(on * 1.06, on * 1.06, Math.max(1e-3, h)); K.dummy.updateMatrix();
      rejects.setMatrixAt(k, K.dummy.matrix);
    }
    bricks.instanceMatrix.needsUpdate = rejects.instanceMatrix.needsUpdate = bricks.instanceColor.needsUpdate = true;
  }
  const triFront = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0x24243a })), triBack = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: C.red }));
  triFront.frustumCulled = triBack.frustumCulled = false; root.add(triFront, triBack);
  const hiGroup = new T.Group(); root.add(hiGroup);
  const sky = Array.from({ length: GH }, (_, j) => new T.Color(0x86d3ff).lerp(new T.Color(0xeaf7ff), 1 - j / (GH - 1)));

  /* ---------- labels + the math card ---------- */
  const aCube = V3(), aPyr = V3(), aV0 = V3(), aWarp = V3();
  const L = {
    cube: ctx.label(aCube, '📦 cube', { off: [0, .75, 0], cls: 't-pink' }),
    pyr: ctx.label(aPyr, '🔺 pyramid', { off: [0, .95, 0], cls: 't-blue' }),
    v0: ctx.label(aV0, 'v0', { off: [-.2, -.16, 0], cls: 'hot' }),
    cam: ctx.label(camIcon, '📷 game camera', { off: [0, .45, 0] }),
    box: ctx.label(V3(BX, BY + .2, ZF), '🧊 clip box (NDC)', { cls: 't-cyan' }),
    screen: ctx.label(V3(-BX + 1.1, BY + .3, ZN), '🟦 screen: 32 × 24 pixels', { cls: 't-blue' }),
    warp: ctx.label(aWarp, '🧵 4 warps working', { cls: 't-yellow' })
  };
  const card = document.createElement('div'); card.className = 'mx-card'; ctx.stage.appendChild(card);
  const f2 = v => (Math.abs(v) < .005 ? '0' : v.toFixed(2).replace(/^(-?)0\./, '$1.'));
  const mx = m => '<span class="mx m4">' + [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => '<i>' + f2(m.elements[c * 4 + r]) + '</i>').join('')).join('') + '</span>';
  const vec = (a, hl) => '<span class="mx m1' + (hl ? ' hl' : '') + '">' + a.map(v => '<i>' + f2(v) + '</i>').join('') + '</span>';

  /* ---------- the vertex pipeline (what a vertex shader does) ---------- */
  const st = { mT: 0, vT: 0, pT: 0, sT: 0, spin: 0 };
  const Mc = new T.Matrix4(), Vc = new T.Matrix4(), Rspin = new T.Matrix4(), tmpM = new T.Matrix4(), tmp = V3();
  function modelOf(o, out) {
    if (o !== cube) return out.copy(o.M);
    lerpMat(o.D, st.mT, out);
    if (st.spin) out.multiply(Rspin.makeRotationY(st.spin));
    return out;
  }
  function pipeline() {
    lerpMat(DV, st.vT, Vc);
    OBJ.forEach(o => {
      modelOf(o, Mc);
      o.verts.forEach((v, k) => {
        const w = o.world[k].set(v[0], v[1], v[2]).applyMatrix4(Mc);   // ① model  → world
        o.view[k].copy(w).applyMatrix4(VIEW);                           // ② view   → camera space
        o.ndc[k].copy(o.view[k]).applyMatrix4(PROJ);                     // ③ projection + divide by w → NDC
        const d = o.cur[k].copy(w).applyMatrix4(Vc);                     // what we draw right now
        if (st.pT > 0) d.lerp(boxOf(o.ndc[k], tmp), st.pT);
        if (st.sT > 0) d.z = K.lerp(d.z, ZN + .05 - (o.ndc[k].z + 1) * .02, st.sT);
      });
      const pa = o.geo.attributes.position.array;
      o.tris.forEach((t, i) => t.i.forEach((vi, j) => { const p = o.cur[vi]; pa[(i * 3 + j) * 3] = p.x; pa[(i * 3 + j) * 3 + 1] = p.y; pa[(i * 3 + j) * 3 + 2] = p.z; }));
      o.geo.attributes.position.needsUpdate = true; o.geo.computeVertexNormals(); o.geo.computeBoundingSphere();
      const ea = o.egeo.attributes.position.array;
      o.edges.forEach((e, i) => { const a = o.cur[e[0]], b = o.cur[e[1]]; ea.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); });
      o.egeo.attributes.position.needsUpdate = true;
    });
    // dots + label anchors
    let di = 0; K.dummy.rotation.set(0, 0, 0);
    OBJ.forEach(o => o.cur.forEach(p => { K.dummy.position.copy(p); K.dummy.scale.setScalar(dotScale[di]); K.dummy.updateMatrix(); dots.setMatrixAt(di++, K.dummy.matrix); }));
    dots.instanceMatrix.needsUpdate = true;
    aCube.set(0, 0, 0); cube.cur.forEach(p => aCube.add(p)); aCube.divideScalar(cube.cur.length);
    aPyr.set(0, 0, 0); pyr.cur.forEach(p => aPyr.add(p)); aPyr.divideScalar(pyr.cur.length);
    aV0.copy(cube.cur[0]);
    // camera, frustum, ground, axes ride along with the View matrix
    camIcon.matrix.multiplyMatrices(Vc, CAMW); camIcon.matrixWorldNeedsUpdate = true;
    const fa = frGeo.attributes.position.array;
    const pts = FR.map(f => { const q = f.c.clone().applyMatrix4(CAMW).applyMatrix4(Vc); if (st.pT > 0) q.lerp(f.box, st.pT); if (st.sT > 0) q.z = K.lerp(q.z, ZN + .06, st.sT); return q; });
    frEdges.forEach((e, i) => fa.set([pts[e[0]].x, pts[e[0]].y, pts[e[0]].z, pts[e[1]].x, pts[e[1]].y, pts[e[1]].z], i * 6));
    const apex = V3().applyMatrix4(camIcon.matrix);
    for (let i = 0; i < 4; i++) fa.set([apex.x, apex.y, apex.z, pts[i].x, pts[i].y, pts[i].z], (frEdges.length + i) * 6);
    frGeo.attributes.position.needsUpdate = true;
    const ga = gGeo.attributes.position.array;
    GP.forEach((p, i) => { tmp.copy(p).applyMatrix4(Vc); ga[i * 3] = tmp.x; ga[i * 3 + 1] = tmp.y; ga[i * 3 + 2] = tmp.z; });
    gGeo.attributes.position.needsUpdate = true;
    modelOf(cube, tmpM);
    const xa = axGeo.attributes.position.array;
    AX.forEach((p, i) => { tmp.copy(p).applyMatrix4(tmpM).applyMatrix4(Vc); xa[i * 3] = tmp.x; xa[i * 3 + 1] = tmp.y; xa[i * 3 + 2] = tmp.z; });
    axGeo.attributes.position.needsUpdate = true;
  }

  /* ---------- the rasterizer + depth test + pixel shader (software GPU) ---------- */
  const LDIR = V3(-.4, .85, .55).normalize();
  function shade(hex, N, uv) {                       // the "pixel shader"
    const nl = Math.max(0, N.dot(LDIR));
    const light = nl > .55 ? 1 : nl > .2 ? .8 : .6;   // toon-style light bands
    const tex = (Math.floor(uv[0] * 4) + Math.floor(uv[1] * 4)) % 2 ? 1 : .84; // checker "texture"
    return new T.Color(hex).multiplyScalar(light * tex);
  }
  const edgeF = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const distOf = z => 2 * FAR * NEAR / ((FAR + NEAR) - z * (FAR - NEAR));   // NDC depth → real distance
  const hOf = z => .08 + K.clamp((FAR - distOf(z)) / (FAR - NEAR), 0, 1) * .95;
  function rasterize(order) {
    const zb = new Float32Array(NPIX).fill(Infinity);
    const res = { tris: [], tested: 0, written: 0, rejected: 0, final: new Array(NPIX).fill(null) };
    order.forEach(o => o.tris.forEach(t => {
      const S = t.i.map(k => [o.ndc[k].x * BX, o.ndc[k].y * BY]), Z = t.i.map(k => o.ndc[k].z);
      const area = edgeF(S[0], S[1], S[2]);
      const W = t.i.map(k => o.world[k]);
      const N = W[1].clone().sub(W[0]).cross(W[2].clone().sub(W[0])).normalize();
      const rec = { S, back: area <= 0, frags: [] };
      res.tris.push(rec);
      if (rec.back) return;                          // back-face culling
      const xs = S.map(s => s[0]), ys = S.map(s => s[1]);
      const i0 = Math.max(0, Math.floor((Math.min(...xs) + BX) / CWD)), i1 = Math.min(GW - 1, Math.floor((Math.max(...xs) + BX) / CWD));
      const j0 = Math.max(0, Math.floor((Math.min(...ys) + BY) / CWD)), j1 = Math.min(GH - 1, Math.floor((Math.max(...ys) + BY) / CWD));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const p = pc(i, j);
        const w0 = edgeF(S[1], S[2], p), w1 = edgeF(S[2], S[0], p), w2 = edgeF(S[0], S[1], p);
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;      // pixel center outside the triangle
        const b0 = w0 / area, b1 = w1 / area, b2 = w2 / area;
        const z = b0 * Z[0] + b1 * Z[1] + b2 * Z[2];
        const uv = [b0 * t.uv[0][0] + b1 * t.uv[1][0] + b2 * t.uv[2][0], b0 * t.uv[0][1] + b1 * t.uv[1][1] + b2 * t.uv[2][1]];
        const idx = j * GW + i, pass = z < zb[idx];   // depth test
        const f = { idx, z, pass, flat: new T.Color(t.col), lit: shade(t.col, N, uv) };
        rec.frags.push(f); res.tested++;
        if (pass) { zb[idx] = z; res.final[idx] = f; res.written++; } else res.rejected++;
      }
    }));
    return res;
  }
  let R = null;
  function getRaster() {
    if (R) return R;
    const keep = Object.assign({}, st);
    Object.assign(st, { mT: 1, vT: 1, pT: 1, sT: 1, spin: 0 }); pipeline();
    R = rasterize([cube, pyr]);                     // near cube first → the far pyramid gets rejected behind it
    Object.assign(st, keep); pipeline();
    return R;
  }
  function buildTriLines() {
    const f = [], b = [], z = ZN + .08;
    getRaster().tris.forEach(r => { const arr = r.back ? b : f; for (let e = 0; e < 3; e++) { const a = r.S[e], c = r.S[(e + 1) % 3]; arr.push(a[0], a[1], z, c[0], c[1], z); } });
    triFront.geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(f), 3));
    triBack.geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(b), 3));
  }
  function highlight(rec) {
    hiGroup.children.forEach(c => c.geometry.dispose()); hiGroup.clear();
    if (!rec) return;
    for (let e = 0; e < 3; e++) { const a = rec.S[e], c = rec.S[(e + 1) % 3]; hiGroup.add(K.beam([a[0], a[1], ZN + .09], [c[0], c[1], ZN + .09], .018, C.orange)); }
  }

  /* ---------- steps ---------- */
  const VIEWS = [
    [[-5.2, 4.4, 7.0], [0, .5, -.9]],
    [[-5.2, 4.4, 7.0], [0, .5, -.9]],
    [[7.8, 5.6, 4.2], [-.4, .2, -3.2]],
    [[7.4, 4.2, 1.2], [0, 0, -4.4]],
    [[5.2, 3.4, 2.4], [0, 0, -3.8]],
    [[1.4, 1.6, 3.2], [0, 0, -3]],
    [[3.0, 2.6, 2.2], [0, -.1, -3]],
    [[1.8, 2.0, 2.8], [0, 0, -3]],
    [[0, 0, 1.55], [0, 0, -3]]
  ];
  const INFO = [
    ['🎮 A tiny game world', 'Every 3D object is just a list of corner points (<b>vertices</b>) in its own little space — <b>model space</b>. The cube’s 8 corners are plain numbers like (−1, −1, 1). The pyramid is already in place. Press <b>Next ▶</b> to move the cube into the world!'],
    ['① Model matrix: object → world', 'One <b>4×4 matrix</b> scales, turns and moves the cube into the game world. The GPU multiplies <b>every</b> corner by it. Watch corner <b>v0</b>’s numbers change in the corner card.'],
    ['② View matrix: world → camera', 'Surprise — the camera never moves! Instead the <b>whole world</b> is moved and turned so the camera sits at the center (0, 0, 0) looking straight ahead. That’s another 4×4 matrix.'],
    ['③ Projection matrix: perspective!', 'The camera sees a pyramid-shaped region (the <b>frustum</b>, blue). The projection matrix plus a <b>divide by w</b> squishes it into a neat box (clip space / NDC). Far things shrink — see how small the pyramid got!'],
    ['④ The vertex shader = ①②③ for every corner at once', 'Steps ①–③ are exactly what a <b>vertex shader</b> does: <code>P × V × M × vertex</code>. Each corner gets its own GPU thread, so all 13 run <b>at the same time</b> (real games: millions). Then the box is flattened onto the screen.'],
    ['⑤ Triangles + back-face culling', 'Every 3 corners make a triangle. Triangles facing <b>away</b> from the camera (red) are thrown away for free — you can never see the back of a cube anyway!'],
    ['⑥ Rasterization + depth test', 'For each triangle the GPU finds which pixel centers it covers and makes a <b>fragment</b> there. Taller brick = closer. When a farther fragment lands where a closer one already is, the <b>depth test</b> (z-buffer) rejects it — red flash!'],
    ['⑦ The pixel (fragment) shader', 'A tiny program now runs for <b>every fragment</b>: look up the texture (the checker pattern) and work out the light (<b>N·L</b>). Each row of 32 pixels is one <b>warp</b>; 4 warps run at once here.'],
    ['⑧ Frame done — and again, and again!', 'Our 32×24 picture was made with the same steps a real GPU uses — and now it runs <b>live</b> while the cube spins. A 1080p frame has 2,073,600 pixels, and games redo all of this <b>60–240 times per second</b>!']
  ];
  let step = 0, live = false, liveAcc = 0, frameN = 0, stats = { t: 0, w: 0, r: 0 }, cardTick = 0;

  function setCard(k) {
    const v0 = cube.verts[0];
    let h = '';
    if (k === 0) {
      h = '<h6>📋 Vertex buffer (cube)</h6><div class="vb">' + cube.verts.map((v, i) => '<span' + (i === 0 ? ' class="hl"' : '') + '>v' + i + ' (' + v.map(n => String(n).replace('-', '−')).join(', ') + ')</span>').join('') + '</div>';
    } else if (k === 1) {
      const w = cube.cur[0];
      h = '<h6>① Model matrix M × v0</h6><div class="eq"><b>M</b>' + mx(cube.M) + '<b>×</b>' + vec([v0[0], v0[1], v0[2], 1]) + '<b>=</b>' + vec([w.x, w.y, w.z], 1) + '</div>';
    } else if (k === 2) {
      const w = cube.world[0], v = cube.cur[0];
      h = '<h6>② View matrix V × v0</h6><div class="eq"><b>V</b>' + mx(VIEW) + '<b>×</b>' + vec([w.x, w.y, w.z, 1]) + '<b>=</b>' + vec([v.x, v.y, v.z], 1) + '</div>';
    } else if (k === 3) {
      const v = cube.view[0], c4 = new T.Vector4(v.x, v.y, v.z, 1).applyMatrix4(PROJ), n = cube.ndc[0];
      h = '<h6>③ Projection P × v0, then ÷ w</h6><div class="eq"><b>P</b>' + mx(PROJ) + '<b>×</b>' + vec([v.x, v.y, v.z, 1]) + '<b>=</b>' + vec([c4.x, c4.y, c4.z, c4.w]) + '</div><div class="eq"><b>÷ w (' + f2(c4.w) + ') =</b>' + vec([n.x, n.y, n.z], 1) + '<b>NDC</b></div>';
    } else if (k === 4) {
      h = '<h6>④ Vertex shader</h6><code class="cl">gl_Position = P * V * M * vertex;</code><div>13 corners → <b>13 threads</b>, all at once ⚡</div>';
    } else if (k === 5) {
      const r = getRaster(), back = r.tris.filter(t => t.back).length;
      h = '<h6>⑤ Triangle setup</h6><div>triangles: <b>' + r.tris.length + '</b></div><div>✅ facing camera: <b>' + (r.tris.length - back) + '</b></div><div>🗑️ culled (back): <b>' + back + '</b></div>';
    } else if (k === 6) {
      h = '<h6>⑥ Rasterizer + z-buffer</h6><div>fragments tested: <b>' + stats.t + '</b></div><div>✅ written: <b>' + stats.w + '</b></div><div>❌ rejected (hidden): <b>' + stats.r + '</b></div>';
    } else if (k === 7) {
      h = '<h6>⑦ Pixel shader (per fragment)</h6><code class="cl">base  = texture(tex, uv);<br>light = max(dot(N, L), 0.0);<br>color = base * (0.3 + 0.7*light);</code>';
    } else {
      h = '<h6>⑧ The frame</h6><div>frame <b>#' + frameN + '</b> · 768 pixels · 18 triangles</div><div>real 1080p: <b>2,073,600</b> px × 60 fps</div>';
    }
    card.innerHTML = h;
  }
  function setUI(k) {
    ctx.info(INFO[k][0], INFO[k][1]);
    status.innerHTML = 'step ' + (k + 1) + ' / 9';
    L.cube.show(k <= 4); L.pyr.show(k <= 4); L.v0.show(k <= 3); L.cam.show(k <= 3);
    L.box.show(k === 3 || k === 4); L.screen.show(k >= 5 && k <= 7); L.warp.show(false);
    setCard(k);
  }
  // instantly show the END of step k (k = -1 → the very start)
  function snap(k) {
    live = false; st.spin = 0; dotScale.fill(1); stats = { t: 0, w: 0, r: 0 };
    dotBase.forEach((c, i) => dots.setColorAt(i, c)); dots.instanceColor.needsUpdate = true;
    st.mT = k >= 1 ? 1 : 0; st.vT = k >= 2 ? 1 : 0; st.pT = k >= 3 ? 1 : 0; st.sT = k >= 4 ? 1 : 0;
    pipeline();
    OBJ.forEach(o => { o.mesh.visible = k <= 4; });
    ground.visible = k <= 2; axes.visible = k <= 1; frustum.visible = k <= 4;
    camIcon.visible = k <= 3; dots.visible = k <= 4; tiles.visible = k >= 4; tiles.position.z = 0;
    triFront.visible = triBack.visible = false; highlight(null);
    bh.fill(0); rh.fill(0);
    if (k >= 5) { buildTriLines(); triFront.visible = k === 5; }
    if (k >= 6) {
      const r = getRaster(); stats = { t: r.tested, w: r.written, r: r.rejected };
      r.final.forEach((f, idx) => { if (f) { bh[idx] = hOf(f.z); bcol[idx].copy(k >= 7 ? f.lit : f.flat); } });
    }
    writeBricks();
  }

  async function runStep(a, k) {
    step = k; snap(k - 1); setUI(k);
    ctx.view(VIEWS[k][0], VIEWS[k][1], k === 0 ? .6 : 1.2);
    if (k === 0) {
      await a.tween(1.2, (e, p) => { dotScale.fill(1 + Math.sin(p * Math.PI) * .8); pipeline(); }, K.ease.lin);
    } else if (k === 1) {
      await a.wait(.4);
      await a.tween(2.8, e => { st.mT = e; pipeline(); });
      axes.visible = false;
    } else if (k === 2) {
      axes.visible = false;
      await a.wait(.4);
      await a.tween(3.2, e => { st.vT = e; pipeline(); });
    } else if (k === 3) {
      ground.visible = false;
      await a.wait(.5);
      await a.tween(3.2, e => { st.pT = e; pipeline(); });
    } else if (k === 4) {
      camIcon.visible = false;
      const hot = new T.Color(C.yellow);
      await a.tween(1.3, (e, p) => {
        dotScale.fill(1 + Math.sin(p * Math.PI) * 1.4);
        for (let i = 0; i < NDOT; i++) dots.setColorAt(i, p < .85 ? hot : dotBase[i]);
        dots.instanceColor.needsUpdate = true; pipeline();
      }, K.ease.lin);
      await a.tween(1.6, e => { st.sT = e; pipeline(); });
      tiles.visible = true;
      await a.tween(.5, e => { tiles.scale.setScalar(1); tiles.position.z = (1 - e) * -.6; });
    } else if (k === 5) {
      OBJ.forEach(o => { o.mesh.visible = false; }); dots.visible = false; frustum.visible = false;
      buildTriLines(); triFront.visible = triBack.visible = true;
      await a.wait(1.2);
      for (let i = 0; i < 6; i++) { triBack.visible = i % 2 === 1; await a.wait(.2); }
      triBack.visible = false;
    } else if (k === 6) {
      const r = getRaster(); triFront.visible = false;
      const front = r.tris.filter(t => !t.back);
      for (const rec of front) {
        highlight(rec);
        const pass = rec.frags.filter(f => f.pass), fail = rec.frags.filter(f => !f.pass);
        await a.tween(fail.length ? .75 : .45, (e, p) => {
          pass.forEach(f => { bh[f.idx] = hOf(f.z) * Math.min(1, p * 1.6); bcol[f.idx].copy(f.flat); });
          fail.forEach(f => { rh[f.idx] = hOf(f.z) * Math.sin(Math.min(1, p) * Math.PI); });
          writeBricks();
        }, K.ease.lin);
        fail.forEach(f => { rh[f.idx] = 0; }); writeBricks();
        stats.t += rec.frags.length; stats.w += pass.length; stats.r += fail.length; setCard(6);
      }
      highlight(null);
    } else if (k === 7) {
      const r = getRaster(), white = new T.Color(0xffffff);
      L.warp.show(true);
      for (let round = 0; round < GH / 4; round++) {
        const rows = [0, 1, 2, 3].map(q => GH - 1 - (round * 4 + q));
        aWarp.set(-BX - .1, pc(0, rows[1])[1] - CWD / 2, ZN + .3);
        await a.tween(.34, (e, p) => {
          rows.forEach(j => { for (let i = 0; i < GW; i++) { const f = r.final[j * GW + i]; if (f) bcol[j * GW + i].copy(p < .5 ? white : f.lit); } });
          writeBricks();
        }, K.ease.lin);
      }
      L.warp.show(false);
    } else if (k === 8) {
      const r = getRaster(), h0 = Float32Array.from(bh);
      L.screen.show(false);
      for (let idx = 0; idx < NPIX; idx++) if (!r.final[idx]) { bcol[idx].copy(sky[Math.floor(idx / GW)]); h0[idx] = 0; } else bcol[idx].copy(r.final[idx].lit);
      await a.tween(1.0, e => { for (let idx = 0; idx < NPIX; idx++) bh[idx] = K.lerp(h0[idx], .05, e); writeBricks(); });
      live = true; liveAcc = 0; frameN = 0;
    }
  }

  ctx.button('◀ Back', () => ctx.play(a => runStep(a, Math.max(0, step - 1))));
  ctx.button('Next ▶', () => ctx.play(a => runStep(a, Math.min(8, step + 1))), 'primary');
  ctx.button('▶ Play all', () => ctx.play(async a => { for (let k = 0; k <= 8; k++) { await runStep(a, k); if (k < 8) await a.wait(1.4); } }));
  const status = ctx.status('');

  ctx.home(VIEWS[0][0], VIEWS[0][1], 1.45);
  snap(-1); setUI(0);

  return {
    update(dt) {
      if (step >= 1 && step <= 3 && ++cardTick % 3 === 0) setCard(step);
      if (!live) return;
      st.spin += dt * .8; liveAcc += dt;
      if (liveAcc < 1 / 12) return;
      liveAcc = 0;
      Object.assign(st, { mT: 1, vT: 1, pT: 1, sT: 1 }); pipeline();
      const r = rasterize([cube, pyr]);
      for (let k = 0; k < NPIX; k++) { const f = r.final[k]; bh[k] = .05; bcol[k].copy(f ? f.lit : sky[Math.floor(k / GW)]); }
      writeBricks();
      frameN++; if (frameN % 3 === 0) setCard(8);
    }
  };
});
