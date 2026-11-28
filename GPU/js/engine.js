/* =========================================================
   engine.js — a tiny "sketchbook" 3D engine shared by every chapter.
   - ONE WebGL renderer; its canvas moves to whichever 3D stage is on screen
     (saves memory & battery, works on phones). Stages that scroll away keep a
     snapshot so they never look empty.
   - Toon materials + ink outlines = hand-drawn look. Ink turns to chalk at night.
   - Scenes register with GPU3D.register(name, ctx => api).
   ========================================================= */
(function () {
  'use strict';
  const T = window.THREE;
  const root = document.documentElement;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isTouch) root.classList.add('is-touch');

  const registry = {};
  const pending = {};
  const instances = new Map();
  const noop = () => {};

  if (!T || !T.OrbitControls) {
    window.GPU3D = {
      register: noop, send: noop, ready: false,
      init() {
        document.querySelectorAll('.stage').forEach(s => {
          s.classList.add('no-gl');
          s.insertAdjacentHTML('beforeend', '<div class="ph"><div><span>📡</span>The 3D library couldn’t load — check your internet connection and refresh.</div></div>');
        });
      }
    };
    return;
  }

  /* ---------------- palette & materials ---------------- */
  const C = {
    pink: 0xff3d8b, blue: 0x2d7dff, yellow: 0xffc928, green: 0x1fc96b, orange: 0xff7a1a,
    purple: 0x8b5cf6, cyan: 0x10c5e0, red: 0xff4d4d, white: 0xf8f5ec, cream: 0xfff1d0,
    gray: 0xa3a9bd, slate: 0x5b6178, dark: 0x33374d, black: 0x1f2130, gold: 0xf2c230,
    copper: 0xdb8a4e, silver: 0xc9cfdb, pcb: 0x1f9a62, teal: 0x14a39a, brown: 0x9a6a44, lime: 0x9be22d
  };

  const grad = (() => {
    const d = new Uint8Array([100, 100, 100, 255, 180, 180, 180, 255, 255, 255, 255, 255]);
    const t = new T.DataTexture(d, 3, 1, T.RGBAFormat);
    t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  })();
  const shared = new Map();
  function mat(color, unique) {
    if (!unique && shared.has(color)) return shared.get(color);
    const m = new T.MeshToonMaterial({ color, gradientMap: grad });
    if (!unique) shared.set(color, m);
    return m;
  }
  const glows = new Map();
  function glow(color, unique) {
    if (!unique && glows.has(color)) return glows.get(color);
    const m = new T.MeshBasicMaterial({ color });
    if (!unique) glows.set(color, m);
    return m;
  }
  const inkLine = new T.LineBasicMaterial({ color: 0x24243a });
  /* Cartoon outline: an inked back-face shell pushed outwards along the normals by a fixed
     number of SCREEN pixels, so the line weight stays the same at any zoom (works for instanced meshes too). */
  const outlineU = { thick: { value: 3 }, res: { value: new T.Vector2(1200, 800) } };
  const inkHull = new T.MeshBasicMaterial({ color: 0x24243a, side: T.BackSide });
  inkHull.onBeforeCompile = sh => {
    sh.uniforms.uThick = outlineU.thick; sh.uniforms.uRes = outlineU.res;
    sh.vertexShader = 'uniform float uThick;\nuniform vec2 uRes;\n' + sh.vertexShader.replace('#include <project_vertex>', [
      '#include <project_vertex>',
      'vec3 oN = normal;',
      '#ifdef USE_INSTANCING',
      'oN = mat3( instanceMatrix ) * oN;',
      '#endif',
      'vec4 cN = projectionMatrix * vec4( normalize( normalMatrix * oN ), 0.0 );',
      'float cL = length( cN.xy );',
      'if ( cL > 1e-5 ) gl_Position.xy += cN.xy / cL * uThick * gl_Position.w * 2.0 / uRes;'
    ].join('\n'));
  };
  inkHull.customProgramCacheKey = () => 'ink-outline-v1';
  const shadowMat = new T.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0x24243a, opacity: .45 });
  let hatchTex = null;
  function makeHatch() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.strokeStyle = '#fff'; g.lineWidth = 3.2; g.lineCap = 'round';
    for (let x = -256; x < 512; x += 15) { g.beginPath(); g.moveTo(x + Math.random() * 3, 256); g.lineTo(x + 256 + Math.random() * 3, 0); g.stroke(); }
    g.globalCompositeOperation = 'destination-in';
    const rg = g.createRadialGradient(128, 128, 30, 128, 128, 127);
    rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(.7, 'rgba(0,0,0,.65)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(c);
  }

  /* ---------------- geometry kit ---------------- */
  const gcache = new Map();
  const cached = (key, make) => { let g = gcache.get(key); if (!g) { g = make(); gcache.set(key, g); } return g; };
  const qz = v => Math.round(v * 1e4) / 1e4;
  // rounded box with smooth normals (same idea as three's RoundedBoxGeometry)
  function rboxGeo(w, h, d, r, s) {
    r = Math.max(1e-4, Math.min(r, w / 2, h / 2, d / 2) * .999);
    if (s === undefined) s = r >= .05 ? 3 : r >= .015 ? 2 : 1;
    return cached('rb' + [w, h, d, r, s].map(qz).join(','), () => {
      const segs = s * 2 + 1, geo = new T.BoxGeometry(1, 1, 1, segs, segs, segs).toNonIndexed();
      const p = geo.attributes.position.array, nr = geo.attributes.normal.array, half = .5 / segs;
      const bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r, n = new T.Vector3();
      for (let i = 0; i < p.length; i += 3) {
        const x = p[i], y = p[i + 1], z = p[i + 2], sx = Math.sign(x), sy = Math.sign(y), sz = Math.sign(z);
        n.set(x - sx * half, y - sy * half, z - sz * half).normalize();
        p[i] = bx * sx + n.x * r; p[i + 1] = by * sy + n.y * r; p[i + 2] = bz * sz + n.z * r;
        nr[i] = n.x; nr[i + 1] = n.y; nr[i + 2] = n.z;
      }
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      return geo;
    });
  }
  // ink lines that run along the middle of each rounded edge
  function rboxEdges(w, h, d, r) {
    return cached('re' + [w, h, d, r].map(qz).join(','), () => {
      const k = r * .54;
      return new T.EdgesGeometry(new T.BoxGeometry(Math.max(1e-3, w - k), Math.max(1e-3, h - k), Math.max(1e-3, d - k)));
    });
  }
  // cylinder with rounded rims (a lathe), smooth normals for nice toon shading + outlines
  function rcylGeo(rt, rb, h, seg, r) {
    return cached('rc' + [rt, rb, h, seg, r].map(qz).join(','), () => {
      const hh = h / 2, pts = [new T.Vector2(0, -hh)], n = 4;
      for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI / 2; pts.push(new T.Vector2(rb - r + Math.cos(a) * r, -hh + r + Math.sin(a) * r)); }
      for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; pts.push(new T.Vector2(rt - r + Math.cos(a) * r, hh - r + Math.sin(a) * r)); }
      pts.push(new T.Vector2(0, hh));
      return new T.LatheGeometry(pts, seg);
    });
  }
  function rimGeo(rad, y, seg) {
    return cached('rim' + [rad, y, seg].map(qz).join(','), () => {
      const p = [];
      for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; p.push(new T.Vector3(Math.sin(a) * rad, y, Math.cos(a) * rad)); }
      return new T.BufferGeometry().setFromPoints(p);
    });
  }
  function roundedRect(sh, x, y, w, h, r) {
    sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r);
    sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
    sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
    return sh;
  }
  // a curved, twisted-looking fan blade (lies along +x, thin along z)
  function bladeGeo(r) {
    return cached('blade' + qz(r), () => {
      const L = r * .64, w = r * .22, s = new T.Shape();
      s.moveTo(0, -w * .5);
      s.bezierCurveTo(L * .35, -w * .95, L * .8, -w * .8, L, -w * .1);
      s.bezierCurveTo(L * 1.03, w * .4, L * .85, w * .95, L * .55, w * .9);
      s.bezierCurveTo(L * .3, w * .85, L * .1, w * .6, 0, w * .45);
      s.lineTo(0, -w * .5);
      const g = new T.ExtrudeGeometry(s, { depth: r * .03, bevelEnabled: true, bevelThickness: r * .012, bevelSize: r * .012, bevelSegments: 2, curveSegments: 10 });
      g.translate(r * .22, 0, -r * .015);
      return g;
    });
  }
  // square fan housing with a round opening
  function fanFrameGeo(r) {
    return cached('frame' + qz(r), () => {
      const s = r * 1.12, sh = roundedRect(new T.Shape(), -s, -s, s * 2, s * 2, r * .25);
      const hole = new T.Path(); hole.absarc(0, 0, r * 1.0, 0, Math.PI * 2, true); sh.holes.push(hole);
      const g = new T.ExtrudeGeometry(sh, { depth: r * .22, bevelEnabled: true, bevelThickness: r * .03, bevelSize: r * .03, bevelSegments: 2, curveSegments: 28 });
      g.translate(0, 0, -r * .11);
      return g;
    });
  }
  function hull(m) {
    const h = new T.Mesh(m.geometry, inkHull);
    h.raycast = noop; m.add(h); return m;
  }
  const wantOutline = (o, def) => (o.outline !== undefined ? !!o.outline : o.hull !== undefined ? !!o.hull : def);
  function place(m, o) {
    if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    return m;
  }
  function edges(m, th) {
    const e = new T.LineSegments(new T.EdgesGeometry(m.geometry, th || 30), inkLine);
    e.raycast = noop; m.add(e); return m;
  }
  function mesh(geo, color, o) {
    o = o || {};
    const m = new T.Mesh(geo, o.mat || mat(color, o.unique));
    if (o.unique) m.userData.unique = true;
    if (o.edges !== false) edges(m, o.th);
    if (wantOutline(o, false)) hull(m);
    return place(m, o);
  }
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const toV = p => (p.isVector3 ? p : V(p[0], p[1], p[2]));
  const ease = {
    lin: t => t,
    inOut: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  const K = {
    C, T, mat, glow, inkLine, inkHull, edges, hull, mesh, V, ease, roundedRect,
    dummy: new T.Object3D(),
    rgeo: rboxGeo,
    // soft rounded box: smooth corners + bold outline + fine ink lines along the edges
    box(w, h, d, c, o) {
      o = o || {};
      if (o.sharp) return mesh(new T.BoxGeometry(w, h, d), c, Object.assign({ outline: true }, o));
      const r = Math.max(1e-4, Math.min(o.r !== undefined ? o.r : Math.min(w, h, d) * .24, w / 2, h / 2, d / 2) * .999);
      const m = new T.Mesh(rboxGeo(w, h, d, r), o.mat || mat(c, o.unique));
      if (o.unique) m.userData.unique = true;
      if (o.edges !== false) { const e = new T.LineSegments(rboxEdges(w, h, d, r), inkLine); e.raycast = noop; m.add(e); }
      if (wantOutline(o, true)) hull(m);
      return place(m, o);
    },
    cyl(rt, rb, h, c, o) {
      o = o || {};
      const seg = o.seg || 28, r = o.r !== undefined ? o.r : Math.min(rt, rb, h / 2) * .35;
      const m = new T.Mesh(rcylGeo(rt, rb, h, seg, r), o.mat || mat(c, o.unique));
      if (o.unique) m.userData.unique = true;
      if (o.edges !== false) {
        const k = r * .27;
        [[rt, h / 2 - k], [rb, -h / 2 + k]].forEach(([R, y]) => { const l = new T.Line(rimGeo(Math.max(.001, R - k), y, seg), inkLine); l.raycast = noop; m.add(l); });
      }
      if (wantOutline(o, true)) hull(m);
      return place(m, o);
    },
    cone: (r, h, c, o) => mesh(new T.ConeGeometry(r, h, (o && o.seg) || 24), c, Object.assign({ outline: true }, o)),
    sphere: (r, c, o) => mesh(new T.SphereGeometry(r, (o && o.seg) || 22, (o && o.seg2) || 16), c, Object.assign({ edges: false, outline: true }, o)),
    capsule: (r, len, c, o) => mesh(new T.CapsuleGeometry(r, len, 6, 16), c, Object.assign({ edges: false, outline: true }, o)),
    torus: (R, r, c, o) => mesh(new T.TorusGeometry(R, r, (o && o.rs) || 10, (o && o.ts) || 40, (o && o.arc) || Math.PI * 2), c, Object.assign({ edges: false, outline: true }, o)),
    group(...kids) { const g = new T.Group(); kids.forEach(k => k && g.add(k)); return g; },
    at(o, x, y, z) { o.position.set(x, y, z); return o; },
    line(pts, color, o) {
      o = o || {};
      const g = new T.BufferGeometry().setFromPoints(pts.map(toV));
      const m = o.ink ? inkLine : o.dashed ? new T.LineDashedMaterial({ color, dashSize: o.dash || .14, gapSize: o.gap || .1 }) : new T.LineBasicMaterial({ color, transparent: !!o.opacity, opacity: o.opacity || 1 });
      const l = new T.Line(g, m);
      if (o.dashed) l.computeLineDistances();
      l.raycast = noop; return l;
    },
    beam(a, b, r, color, mat) {
      a = toV(a); b = toV(b);
      const m = new T.Mesh(new T.CylinderGeometry(r, r, 1, 6), mat || glow(color));
      m.scale.set(1, Math.max(.001, a.distanceTo(b)), 1);
      m.position.copy(a).add(b).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
      m.raycast = noop; return m;
    },
    tube(pts, r, color, o) {
      const curve = new T.CatmullRomCurve3(pts.map(toV));
      const m = mesh(new T.TubeGeometry(curve, (o && o.seg) || 64, r, 10, false), color, Object.assign({ edges: false, outline: true }, o));
      m.userData.curve = curve; return m;
    },
    // several thin tubes side by side = a sleeved cable bundle
    cable(pts, cols, r, offset) {
      const g = new T.Group(); offset = offset || V(0, 0, 1);
      cols.forEach((c, i) => {
        const k = (i - (cols.length - 1) / 2) * r * 2.1;
        g.add(K.tube(pts.map(p => toV(p).clone().addScaledVector(offset, k)), r, c));
      });
      return g;
    },
    shadow(w, d) {
      if (!hatchTex) { hatchTex = makeHatch(); shadowMat.map = hatchTex; shadowMat.needsUpdate = true; }
      const m = new T.Mesh(new T.PlaneGeometry(w, d || w), shadowMat);
      m.rotation.x = -Math.PI / 2; m.position.y = .004; m.raycast = noop; m.renderOrder = -1;
      return m;
    },
    instanced(geo, count, color, basic, outline) {
      const m = new T.InstancedMesh(geo, basic ? new T.MeshBasicMaterial({ color: 0xffffff }) : new T.MeshToonMaterial({ color: 0xffffff, gradientMap: grad }), count);
      const c = new T.Color(color === undefined ? 0xffffff : color);
      for (let i = 0; i < count; i++) { m.setColorAt(i, c); }
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.frustumCulled = false;
      if (outline) {
        const o = new T.InstancedMesh(geo, inkHull, count);
        o.instanceMatrix = m.instanceMatrix; o.frustumCulled = false; o.raycast = noop;
        m.add(o);
      }
      return m;
    },
    canvasTex(w, h) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const tex = new T.CanvasTexture(c);
      return { canvas: c, g: c.getContext('2d'), tex };
    },
    // a fan: curved blades on a hub; optional square housing (case fans) or a ring (GPU fans)
    fan(r, color, n, o) {
      o = o || {}; n = n || 7; color = color === undefined ? C.dark : color;
      const g = new T.Group();
      if (o.frame) g.add(mesh(fanFrameGeo(r), o.frameColor !== undefined ? o.frameColor : C.dark, { th: 40, outline: true }));
      else g.add(K.torus(r * 1.03, r * .06, o.ringColor !== undefined ? o.ringColor : C.black));
      const rotor = new T.Group();
      rotor.add(K.cyl(r * .25, r * .27, r * .2, o.hubColor !== undefined ? o.hubColor : C.black, { rot: [Math.PI / 2, 0, 0] }));
      rotor.add(K.cyl(r * .15, r * .15, r * .215, o.capColor !== undefined ? o.capColor : C.pink, { rot: [Math.PI / 2, 0, 0], edges: false, outline: false }));
      const bg = bladeGeo(r);
      for (let i = 0; i < n; i++) {
        const b = mesh(bg, color, { edges: false, outline: true });
        b.rotation.order = 'ZYX'; b.rotation.set(.5, 0, i / n * Math.PI * 2);
        rotor.add(b);
      }
      g.add(rotor); g.userData.rotor = rotor;
      return g;
    },
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    rand: (a, b) => a + Math.random() * (b - a),
    isTouch, reduce
  };

  /* ---------------- tweens ---------------- */
  function Tweener() { this.list = []; }
  Tweener.prototype.add = function (dur, fn, ez, done) {
    const tw = { t: 0, dur: Math.max(dur, 1e-4), fn, ez: ez || ease.inOut, done };
    this.list.push(tw); return tw;
  };
  Tweener.prototype.update = function (dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const tw = l[i]; if (!tw) continue;
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.ez(p), p);
      if (p >= 1) { l.splice(i, 1); if (tw.done) tw.done(); }
    }
  };
  const CANCEL = { cancelled: true };
  function makePlay(inst) {
    return function play(fn) {
      if (inst.run) inst.run.dead = true;
      const run = { dead: false }; inst.run = run;
      const a = {
        tween: (dur, f, ez) => new Promise((res, rej) => {
          if (run.dead) return rej(CANCEL);
          inst.tw.add(dur, (e, p) => { if (!run.dead) f(e, p); }, ez, () => (run.dead ? rej(CANCEL) : res()));
        }),
        wait: s => a.tween(s, noop),
        get dead() { return run.dead; }
      };
      Promise.resolve().then(() => fn(a)).catch(e => { if (e !== CANCEL) console.error(e); });
      return run;
    };
  }

  /* ---------------- labels ---------------- */
  const _v = new T.Vector3();
  function addLabel(inst, target, html, o) {
    o = o || {};
    const el = document.createElement('div');
    el.className = 'lbl ' + (o.cls || '');
    el.innerHTML = html;
    inst.labelLayer.appendChild(el);
    const L = {
      el, target, off: o.off ? V(o.off[0], o.off[1], o.off[2]) : V(0, 0, 0), visible: true,
      set(h) { el.innerHTML = h; return L; },
      show(v) { L.visible = !!v; el.style.display = v ? '' : 'none'; return L; }
    };
    inst.labels.push(L);
    return L;
  }
  function placeLabels(inst) {
    const w = inst.w, h = inst.h;
    for (let i = 0; i < inst.labels.length; i++) {
      const L = inst.labels[i];
      if (!L.visible) continue;
      if (L.target.isVector3) _v.copy(L.target); else _v.setFromMatrixPosition(L.target.matrixWorld);
      _v.add(L.off).project(inst.camera);
      if (_v.z > 1) { L.el.style.opacity = '0'; continue; }
      L.el.style.opacity = '';
      L.el.style.transform = 'translate(' + ((_v.x * .5 + .5) * w).toFixed(1) + 'px,' + ((-_v.y * .5 + .5) * h).toFixed(1) + 'px) translate(-50%,-50%)';
    }
  }

  /* ---------------- renderer ---------------- */
  let renderer = null, canvas = null, active = null, glFailed = false, maxed = null;
  function ensureRenderer() {
    if (renderer) return true;
    if (glFailed) return false;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      glFailed = true;
      document.querySelectorAll('.stage').forEach(s => s.classList.add('no-gl'));
      return false;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.75 : 2));
    canvas = renderer.domElement;
    canvas.className = 'gl';
    canvas.addEventListener('webglcontextlost', e => e.preventDefault());
    return true;
  }

  function fitFactor(inst) {
    const a = inst.w / inst.h, base = inst.base || 1.35;
    return a < base ? Math.pow(base / a, .85) : 1;
  }
  function fitPos(inst, pos, target) { return pos.clone().sub(target).multiplyScalar(fitFactor(inst)).add(target); }
  function applyView(inst) {
    if (!inst.cur) return;
    inst.camera.position.copy(fitPos(inst, inst.cur.pos, inst.cur.target));
    inst.controls.target.copy(inst.cur.target);
    inst.camera.lookAt(inst.cur.target);
  }

  function makeCtx(inst) {
    const ctrl = inst.wrap.querySelector('.stage-ctrl');
    const info = inst.wrap.querySelector('.stage-info');
    const ctx = {
      T, K, C, scene: inst.scene, camera: inst.camera, controls: inst.controls, stage: inst.stage,
      get renderer() { return renderer; },
      get time() { return inst.time; },
      isActive: () => active === inst,
      home(pos, target, aspect) {
        inst.base = aspect || 1.35;
        inst.cur = { pos: toV(pos).clone(), target: toV(target).clone() };
        applyView(inst);
      },
      view(pos, target, dur) {
        inst.cur = { pos: toV(pos).clone(), target: toV(target).clone() };
        inst.userMoved = false;
        const p0 = inst.camera.position.clone(), t0 = inst.controls.target.clone();
        const t1 = inst.cur.target.clone(), p1 = fitPos(inst, inst.cur.pos, t1);
        return new Promise(res => inst.tw.add(dur === undefined ? 1.2 : dur, e => {
          inst.camera.position.lerpVectors(p0, p1, e); inst.controls.target.lerpVectors(t0, t1, e);
        }, ease.inOut, res));
      },
      autoRotate(speed) {
        inst.autoRotate = !reduce;
        inst.controls.autoRotate = !reduce;
        inst.controls.autoRotateSpeed = speed || .6;
      },
      label: (target, html, o) => addLabel(inst, target, html, o),
      info(title, html) {
        info.innerHTML = '<b>' + title + '</b><p>' + (html || '') + '</p>';
        info.classList.remove('pop'); void info.offsetWidth; info.classList.add('pop');
      },
      pick(obj, title, text) { obj.userData.pick = { title, text }; inst.picks.push(obj); return obj; },
      button(html, onClick, cls) {
        const b = document.createElement('button');
        b.className = 'btn-sk ' + (cls || ''); b.innerHTML = html;
        b.addEventListener('click', onClick); ctrl.appendChild(b); return b;
      },
      modes(list, onChange, init) {
        const g = document.createElement('div'); g.className = 'seg';
        const api = { index: init || 0, el: g };
        const bs = list.map((l, i) => {
          const b = document.createElement('button'); b.className = 'btn-sk'; b.innerHTML = l;
          b.addEventListener('click', () => set(i, true)); g.appendChild(b); return b;
        });
        function set(i, fire) { bs.forEach((b, j) => b.classList.toggle('on', i === j)); api.index = i; if (fire) onChange(i); }
        api.set = i => set(i, true); api.mark = i => set(i, false);
        ctrl.appendChild(g); set(api.index, false);
        return api;
      },
      slider(lab, min, max, step, val, onInput) {
        const w = document.createElement('label'); w.className = 'ctrl-slider';
        w.innerHTML = lab + ' <input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">';
        const inp = w.querySelector('input');
        inp.addEventListener('input', () => onInput(parseFloat(inp.value)));
        ctrl.appendChild(w); return inp;
      },
      status(html) { const s = document.createElement('span'); s.className = 'ctrl-status'; s.innerHTML = html || ''; ctrl.appendChild(s); return s; },
      tween: (dur, fn, ez) => new Promise(res => inst.tw.add(dur, fn, ez, res)),
      play: makePlay(inst),
      stop() { if (inst.run) inst.run.dead = true; },
      pulse(obj) {
        if (obj.userData.pulsing) return;
        const s0 = obj.scale.clone(); obj.userData.pulsing = true;
        inst.tw.add(.55, (e, p) => obj.scale.copy(s0).multiplyScalar(1 + Math.sin(p * Math.PI) * .16), ease.lin, () => { obj.scale.copy(s0); obj.userData.pulsing = false; });
      }
    };
    return ctx;
  }

  function build(stage) {
    const name = stage.dataset.scene, factory = registry[name];
    if (!factory) return null;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1.4, .1, 400);
    scene.add(new T.HemisphereLight(0xffffff, 0xb6bad4, .62));
    const sun = new T.DirectionalLight(0xffffff, .72); sun.position.set(4, 9, 6); scene.add(sun);
    const controls = new T.OrbitControls(camera, stage);
    controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false;
    controls.rotateSpeed = .75; controls.zoomSpeed = .8; controls.minDistance = 1.5; controls.maxDistance = 70;
    controls.enabled = false;
    stage.style.touchAction = '';
    const inst = {
      name, stage, wrap: stage.parentElement, scene, camera, controls, tw: new Tweener(),
      labels: [], picks: [], time: 0, w: stage.clientWidth || 1, h: stage.clientHeight || 1,
      labelLayer: stage.querySelector('.labels'), poster: stage.querySelector('.poster'), api: {}
    };
    camera.aspect = inst.w / inst.h; camera.updateProjectionMatrix();
    const ctx = makeCtx(inst); inst.ctx = ctx;
    try { inst.api = factory(ctx) || {}; } catch (e) { console.error('[3D] scene "' + name + '" failed', e); }
    if (!inst.cur) ctx.home([6, 4, 8], [0, 0, 0]);
    controls.update();
    controls.addEventListener('start', () => {
      inst.userMoved = true; stage.classList.add('touched');
      controls.autoRotate = false; clearTimeout(inst.arT);
    });
    controls.addEventListener('end', () => {
      if (inst.autoRotate) { clearTimeout(inst.arT); inst.arT = setTimeout(() => { controls.autoRotate = true; }, 8000); }
    });
    // picking
    let down = null, lastHover = 0;
    stage.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    stage.addEventListener('pointerup', e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y, quick = performance.now() - down.t < 650;
      down = null;
      if (dx * dx + dy * dy < 70 && quick) doPick(inst, e);
    });
    stage.addEventListener('pointercancel', () => { down = null; });
    if (!isTouch) stage.addEventListener('pointermove', e => {
      if (e.buttons || active !== inst) return;
      const now = performance.now(); if (now - lastHover < 70) return; lastHover = now;
      stage.style.cursor = hitTest(inst, e) ? 'pointer' : '';
    });
    if (pending[name]) { pending[name].forEach(m => inst.api.onMessage && inst.api.onMessage(m[0], m[1])); delete pending[name]; }
    applyTheme1(inst);
    return inst;
  }

  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function visibleChain(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function hitTest(inst, e) {
    if (!inst.picks.length) return null;
    const r = inst.stage.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, inst.camera);
    const hits = ray.intersectObjects(inst.picks, true);
    for (const h of hits) {
      if (!visibleChain(h.object)) continue;
      let o = h.object; while (o && !o.userData.pick) o = o.parent;
      if (o) return { obj: o, hit: h };
    }
    return null;
  }
  function doPick(inst, e) {
    if (active !== inst) { activate(inst.stage); return; }
    const r = hitTest(inst, e);
    if (!r) { if (inst.api.onMiss) inst.api.onMiss(); return; }
    const handled = inst.api.onPick ? inst.api.onPick(r.obj, r.hit) : false;
    const d = r.obj.userData.pick;
    if (handled !== true && d && d.title) { inst.ctx.info(d.title, d.text); inst.ctx.pulse(r.obj); }
    inst.stage.classList.add('touched');
  }

  function measure(inst) { inst.w = inst.stage.clientWidth || 1; inst.h = inst.stage.clientHeight || 1; }
  function resize() {
    if (!active) return;
    const i = active; measure(i);
    renderer.setSize(i.w, i.h, false);
    renderer.getDrawingBufferSize(outlineU.res.value);
    outlineU.thick.value = 1.6 * renderer.getPixelRatio();
    i.camera.aspect = i.w / i.h; i.camera.updateProjectionMatrix();
    if (!i.userMoved) applyView(i);
    if (i.api.onResize) i.api.onResize(i.w, i.h);
  }

  function snapshot(inst) {
    try {
      renderer.render(inst.scene, inst.camera);
      const p = inst.poster;
      p.width = canvas.width; p.height = canvas.height;
      p.getContext('2d').drawImage(canvas, 0, 0);
      p.hidden = false; inst.stage.classList.add('posted');
    } catch (e) { /* ignore */ }
  }
  function activate(stage) {
    if (!ensureRenderer()) return;
    let inst = instances.get(stage);
    if (!inst) { inst = build(stage); if (!inst) return; instances.set(stage, inst); }
    if (active === inst) return;
    if (active) { snapshot(active); active.controls.enabled = false; active.stage.classList.remove('live'); }
    active = inst;
    stage.insertBefore(canvas, stage.firstChild);
    inst.poster.hidden = true;
    stage.classList.add('live');
    inst.controls.enabled = !isTouch || !!inst.unlocked || inst.wrap.classList.contains('max');
    resize();
    lastT = performance.now();
  }

  /* ---------------- theme ---------------- */
  function isDark() { return root.getAttribute('data-theme') === 'dark'; }
  function applyTheme1(inst) { if (inst.api.onTheme) inst.api.onTheme(isDark()); }
  function applyTheme() {
    const dark = isDark(), ink = dark ? 0xf0ead8 : 0x24243a;
    inkLine.color.setHex(ink); inkHull.color.setHex(ink); shadowMat.color.setHex(ink);
    shadowMat.opacity = dark ? .3 : .45;
    instances.forEach(i => {
      applyTheme1(i);
      if (i !== active) { i.poster.hidden = true; i.stage.classList.remove('posted'); }
    });
  }
  document.addEventListener('themechange', applyTheme);

  /* ---------------- loop ---------------- */
  const ratios = new Map();
  let lastT = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min(.1, (now - lastT) / 1000)); lastT = now;
    if (!active || document.hidden) return;
    const i = active;
    if (!(ratios.get(i.stage) > 0) && !i.wrap.classList.contains('max')) return;
    i.time += dt;
    i.tw.update(dt);
    if (i.api.update) { try { i.api.update(dt, i.time); } catch (e) { console.error(e); i.api.update = null; } }
    i.controls.update();
    renderer.render(i.scene, i.camera);
    placeLabels(i);
  }

  function choose() {
    if (maxed) return;
    let best = null, br = 0;
    ratios.forEach((r, el) => { if (r > br) { br = r; best = el; } });
    if (!best || br < .12) return;
    const cur = active ? (ratios.get(active.stage) || 0) : 0;
    if (!active || (best !== active.stage && (br > cur + .12 || cur < .1))) activate(best);
  }

  /* ---------------- DOM decoration ---------------- */
  function decorate(stage) {
    const wrap = stage.parentElement;
    stage.insertAdjacentHTML('beforeend',
      '<canvas class="poster" hidden></canvas><div class="labels"></div>' +
      '<div class="ph"><div><span>✏️</span>Sketching the 3D model…</div></div>' +
      (stage.dataset.badge ? '<div class="badge3d">' + stage.dataset.badge + '</div>' : '') +
      '<div class="hint">' + (isTouch ? 'tap ✋ to spin · tap parts to learn' : 'drag to spin · ⌘/ctrl + scroll to zoom · click parts') + '</div>');
    wrap.insertAdjacentHTML('beforeend',
      '<div class="stage-tools">' +
      '<button class="spin-btn" title="Spin mode (drag to rotate)" aria-label="Toggle spin mode">✋</button>' +
      '<button class="lbl-btn on" title="Show / hide labels" aria-label="Toggle labels">🏷️</button>' +
      '<button class="home-btn" title="Reset view" aria-label="Reset view">⟲</button>' +
      '<button class="max-btn" title="Full screen" aria-label="Toggle full screen">⛶</button>' +
      '</div><div class="stage-ctrl"></div>' +
      '<div class="stage-info"><b>👋 Scroll here to wake me up!</b><p>The 3D model starts when it’s on your screen.</p></div>');
    const tools = wrap.querySelector('.stage-tools');
    tools.addEventListener('pointerdown', e => e.stopPropagation());
    const get = () => { activate(stage); return instances.get(stage); };
    tools.querySelector('.spin-btn').addEventListener('click', e => {
      const inst = get(); if (!inst) return;
      inst.unlocked = !inst.unlocked;
      wrap.classList.toggle('unlocked', inst.unlocked);
      e.currentTarget.classList.toggle('on', inst.unlocked);
      inst.controls.enabled = inst.unlocked || wrap.classList.contains('max');
      stage.classList.add('touched');
    });
    tools.querySelector('.lbl-btn').addEventListener('click', e => {
      const off = wrap.classList.toggle('no-labels');
      e.currentTarget.classList.toggle('on', !off);
    });
    tools.querySelector('.home-btn').addEventListener('click', () => {
      const inst = get(); if (!inst || !inst.cur) return;
      inst.ctx.view(inst.cur.pos, inst.cur.target, .8);
    });
    tools.querySelector('.max-btn').addEventListener('click', () => toggleMax(wrap, stage));
    // wheel: let the page scroll unless ctrl/⌘ (pinch) or full screen
    wrap.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey) && !wrap.classList.contains('max')) e.stopPropagation();
    }, { capture: true });
  }
  function toggleMax(wrap, stage) {
    const on = !wrap.classList.contains('max');
    wrap.classList.toggle('max', on);
    document.body.classList.toggle('no-scroll', on);
    maxed = on ? wrap : null;
    activate(stage);
    const inst = instances.get(stage);
    if (inst) inst.controls.enabled = !isTouch || on || !!inst.unlocked;
    requestAnimationFrame(() => { resize(); requestAnimationFrame(resize); });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && maxed) toggleMax(maxed, maxed.querySelector('.stage')); });

  function init() {
    const stages = document.querySelectorAll('.stage[data-scene]');
    stages.forEach(decorate);
    const io = new IntersectionObserver(es => {
      es.forEach(e => ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
      choose();
    }, { threshold: [0, .1, .2, .35, .5, .65, .8, 1] });
    const ro = new ResizeObserver(es => { for (const e of es) if (active && e.target === active.stage) resize(); });
    stages.forEach(s => { io.observe(s); ro.observe(s); });
    // backup for jumps (anchor links, restored scroll) that the observer can miss
    let st = 0;
    const recalc = () => {
      const vh = innerHeight;
      stages.forEach(s => {
        const r = s.getBoundingClientRect();
        const vis = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        ratios.set(s, r.height ? vis / r.height : 0);
      });
      choose();
    };
    addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(recalc, 160); }, { passive: true });
    addEventListener('load', recalc);
    setTimeout(recalc, 300);
    applyTheme();
    requestAnimationFrame(loop);
  }

  window.GPU3D = {
    ready: true, K,
    _instances: instances,
    register(name, factory) { registry[name] = factory; },
    send(name, msg, data) {
      let found = false;
      instances.forEach(i => { if (i.name === name) { found = true; if (i.api.onMessage) i.api.onMessage(msg, data); } });
      if (!found) (pending[name] = pending[name] || []).push([msg, data]);
    },
    init
  };
})();
