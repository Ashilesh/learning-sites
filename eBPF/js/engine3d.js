/* Engine3D — a small hand-drawn 3D engine on top of canvas 2D.
   - perspective camera that orbits a target (drag / arrow keys, ctrl+wheel zoom)
   - painter's algorithm with "floors": things are drawn floor by floor, back to front
   - flat shading from a light that follows the camera, pencil hatching on shadowed faces
   - wobbly double-stroked outlines that "boil" a few times a second, like a flip-book
   - billboard sprites (bees, jars, guards…), labels, paths and picking */
(function (global) {
  'use strict';
  const S = global.Sketch;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const centroid = vs => { let x = 0, y = 0, z = 0; for (const v of vs) { x += v[0]; y += v[1]; z += v[2]; } const n = vs.length; return [x / n, y / n, z / n]; };
  const area2 = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };

  let uid = 0;
  class Thing {
    constructor(o) {
      this.id = ++uid;
      this.pos = [0, 0, 0];
      this.rotY = 0;
      this.scale = 1;
      this.group = 'auto';
      this.pass = 1;
      this.visible = true;
      Object.assign(this, o);
      this.pos = this.pos.slice();
    }
    g(sc) { return this.group === 'auto' ? sc.groupOf(this.pos[1]) : this.group; }
    toWorld(p) {
      const c = Math.cos(this.rotY), s = Math.sin(this.rotY), k = this.scale;
      const x = p[0] * k, y = p[1] * k, z = p[2] * k;
      return [this.pos[0] + x * c + z * s, this.pos[1] + y, this.pos[2] - x * s + z * c];
    }
    rotN(n) {
      const c = Math.cos(this.rotY), s = Math.sin(this.rotY);
      return [n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c];
    }
  }

  class Mesh extends Thing {
    constructor(faces, o) {
      super(o);
      this.faces = faces;
      const c = centroid(faces.flatMap(f => f.v));
      for (const f of faces) {
        if (!f.n) {
          let n = norm(cross(sub(f.v[1], f.v[0]), sub(f.v[2], f.v[0])));
          if (dot(n, sub(centroid(f.v), c)) < 0) n = n.map(x => -x);
          f.n = n;
        }
      }
    }
    emit(sc, out) {
      const g = this.g(sc), F = this.faces, n = F.length, data = new Array(n);
      for (let i = 0; i < n; i++) {
        const f = F[i];
        const wv = f.v.map(v => this.toWorld(v));
        const nn = this.rotN(f.n);
        const two = f.twoSided || this.twoSided;
        data[i] = { wv, nn, two, vis: two || dot(nn, sub(sc.eye, centroid(wv))) > 0 };
      }
      const color = this.color || 'paper2';
      for (let i = 0; i < n; i++) {
        const d = data[i];
        if (!d.vis) continue;
        const f = F[i];
        const pts = [];
        let z = 0, ok = true;
        for (const v of d.wv) {
          const p = sc.project(v);
          if (!p) { ok = false; break; }
          pts.push([p.x, p.y]);
          z += p.z;
        }
        if (!ok) continue;
        z /= pts.length;
        let edges = null;
        if (f.ring) {
          const nx = !data[f.ring[1]].vis, pv = !data[f.ring[0]].vis;
          edges = f.cone ? [true, nx, pv] : [true, nx, true, pv];
        }
        let lam = dot(d.nn, sc.light);
        if (d.two) lam = Math.abs(lam);
        lam = Math.max(0, lam);
        let k = lam > 0.7 ? (lam - 0.7) * 0.5 : -(0.7 - lam) * 0.42;
        if (this.flat) k = 0;
        if (this.hl) k += 0.14;
        k = Math.round(k * 25) / 25;
        const c = f.c || color;
        const fill = S.tone(c, k, this.alpha ?? 1);
        const hatch = !this.noHatch && lam < 0.42 && Math.abs(area2(pts)) > 140
          ? { color: S.tone(c, -0.62), gap: 5, angle: 1.05, width: 1, alpha: (this.alpha ?? 1) * 0.5 } : null;
        const seed = this.id * 97 + i * 13;
        const lw = (this.lw || 1.7) * (this.hl ? 1.6 : 1);
        const st = this.stroke || 'ink';
        const rough = this.rough ?? 0.8;
        out.push({ g, p: this.pass, z: z + (this.zBias || 0), draw: ctx => S.poly(ctx, pts, { fill, grow: 0.6, hatch, stroke: st, width: lw, seed, edges, rough }) });
      }
      if (this.pick) {
        const p = sc.project(this.toWorld(this.pickAt || [0, 0.5, 0]));
        if (p) sc._pick.push({ x: p.x, y: p.y, r: (this.pickR || 1) * p.s, z: p.z, thing: this.ref || this });
      }
    }
  }

  function emitShadow(sc, out, th, r) {
    if (th.shadow == null) return;
    const c = sc.project([th.pos[0], th.shadow, th.pos[2]]);
    if (!c) return;
    const rx = r * c.s, ry = rx * Math.max(0.2, Math.abs(Math.sin(sc.cam.pitch)));
    const lift = clamp(1 - (th.pos[1] - th.shadow) / 8, 0.25, 1);
    out.push({ g: sc.groupOf(th.shadow + 0.01), p: 0.5, z: c.z, draw: ctx => { ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * lift, ry * lift, 0, 0, S.TAU); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fill(); } });
  }

  class Ball extends Thing {
    emit(sc, out) {
      const p = sc.project(this.pos);
      if (!p) return;
      const r = this.r * p.s;
      if (r < 0.4) return;
      const a = this.alpha ?? 1;
      out.push({ g: this.g(sc), p: this.pass, z: p.z, draw: ctx => {
        ctx.globalAlpha = a;
        S.ellipse(ctx, p.x, p.y, r, r, { fill: S.tone(this.color || 'blue', this.hl ? 0.15 : 0), stroke: this.stroke || 'ink', width: clamp(r * 0.22, 1, this.hl ? 3 : 2.2), seed: this.id, double: r > 7, rough: 0.6 });
        ctx.beginPath();
        ctx.ellipse(p.x - r * 0.34, p.y - r * 0.36, r * 0.3, r * 0.2, -0.6, 0, S.TAU);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
        ctx.globalAlpha = 1;
      } });
      emitShadow(sc, out, this, this.r);
      if (this.pick) sc._pick.push({ x: p.x, y: p.y, r, z: p.z, thing: this.ref || this });
    }
  }

  /* Sprite: a 2D doodle that always faces the camera. draw(ctx, x, y, scale, t, self) */
  class Sprite extends Thing {
    emit(sc, out) {
      const p = sc.project(this.pos);
      if (!p) return;
      const s = (p.s * (this.size || 1)) / (this.unit || 30);
      if (s < 0.02) return;
      out.push({ g: this.g(sc), p: this.pass, z: p.z + (this.zBias || 0), draw: ctx => {
        ctx.globalAlpha = this.alpha ?? 1;
        this.draw(ctx, p.x, p.y, s, sc.t, this);
        ctx.globalAlpha = 1;
      } });
      emitShadow(sc, out, this, (this.size || 1) * 0.45);
      if (this.pick) sc._pick.push({ x: p.x, y: p.y - (this.pickDy || 0) * s, r: (this.pickR || 18) * s, z: p.z, thing: this.ref || this });
    }
  }

  class Label extends Thing {
    emit(sc, out) {
      const p = sc.project(this.pos);
      if (!p) return;
      const k = clamp(p.s / sc.refS, 0.72, 1.3);
      const px = (this.px || 13) * k;
      out.push({ g: this.overlay ? 1e6 : this.g(sc), p: 2, z: p.z, draw: ctx => {
        ctx.globalAlpha = this.alpha ?? 1;
        if (this.style === 'plain') S.text(ctx, this.text, p.x, p.y, { size: px, halo: 4, weight: 700, align: this.align || 'center', color: this.color || 'ink' });
        else S.tag(ctx, this.text, p.x, p.y, { size: px, bg: this.bg || 'yellow', seed: this.id, align: this.align, rotate: this.rot, lw: this.hl ? 3 : 1.5 });
        ctx.globalAlpha = 1;
      } });
      if (this.pick) sc._pick.push({ x: p.x, y: p.y, r: px * 1.6, z: p.z - 0.01, thing: this.ref || this });
    }
  }

  class Path extends Thing {
    emit(sc, out) {
      const pts = [];
      let z = 0;
      for (const v of this.pts) {
        const p = sc.project(v);
        if (!p) return;
        pts.push([p.x, p.y]);
        z += p.z;
      }
      z /= pts.length;
      const g = this.group === 'auto' ? sc.groupOf(this.pts[0][1]) : this.group;
      out.push({ g, p: this.pass, z: z + (this.zBias || 0), draw: ctx => {
        ctx.globalAlpha = this.alpha ?? 1;
        const o = { color: this.color || 'ink', width: this.width || 2, seed: this.id, rough: 0.3, dash: this.dash, double: false, head: this.head || 9 };
        ctx.lineDashOffset = this.flow ? -sc.t * this.flow : 0;
        if (this.arrow) S.arrow(ctx, pts, o); else S.polyline(ctx, pts, o);
        ctx.lineDashOffset = 0;
        ctx.globalAlpha = 1;
      } });
    }
  }

  /* ---------- mesh builders (base sits at y = 0, centred on x/z) ---------- */
  function boxFaces(w, h, d) {
    const x = w / 2, z = d / 2;
    return [
      { v: [[-x, h, -z], [x, h, -z], [x, h, z], [-x, h, z]], n: [0, 1, 0] },
      { v: [[-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z]], n: [0, 0, 1] },
      { v: [[x, 0, z], [x, 0, -z], [x, h, -z], [x, h, z]], n: [1, 0, 0] },
      { v: [[x, 0, -z], [-x, 0, -z], [-x, h, -z], [x, h, -z]], n: [0, 0, -1] },
      { v: [[-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z]], n: [-1, 0, 0] },
      { v: [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z]], n: [0, -1, 0] }
    ];
  }
  function cylFaces(r, rt, h, segs, cap) {
    const F = [], cone = rt <= 0.0001, slope = (r - rt) / h;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * S.TAU, a1 = ((i + 1) / segs) * S.TAU, am = (a0 + a1) / 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const v = cone
        ? [[r * c0, 0, r * s0], [r * c1, 0, r * s1], [0, h, 0]]
        : [[r * c0, 0, r * s0], [r * c1, 0, r * s1], [rt * c1, h, rt * s1], [rt * c0, h, rt * s0]];
      F.push({ v, n: norm([Math.cos(am), slope, Math.sin(am)]), ring: [(i - 1 + segs) % segs, (i + 1) % segs], cone });
    }
    if (cap && !cone) F.push({ v: Array.from({ length: segs }, (_, i) => { const a = (i / segs) * S.TAU; return [rt * Math.cos(a), h, rt * Math.sin(a)]; }), n: [0, 1, 0] });
    return F;
  }
  function pyramidFaces(w, d, h) {
    const x = w / 2, z = d / 2, A = [0, h, 0];
    return [
      { v: [[-x, 0, z], [x, 0, z], A] }, { v: [[x, 0, z], [x, 0, -z], A] },
      { v: [[x, 0, -z], [-x, 0, -z], A] }, { v: [[-x, 0, -z], [-x, 0, z], A] },
      { v: [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z]], n: [0, -1, 0] }
    ];
  }

  /* ---------- the scene ---------- */
  class Scene {
    constructor(canvas, o = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.things = [];
      this.cam = Object.assign({ yaw: 0.5, pitch: 0.4, dist: 30, target: [0, 0, 0], fov: 0.85 }, o.cam);
      this.cam.target = this.cam.target.slice();
      this.home = { yaw: this.cam.yaw, pitch: this.cam.pitch, dist: this.cam.dist, target: this.cam.target.slice() };
      this.limits = Object.assign({ minPitch: 0.06, maxPitch: 1.35, minDist: 6, maxDist: 90 }, o.limits);
      this.levels = o.levels || [];
      this.update = o.update;
      this.overlay = o.overlay;
      this.sway = S.motionOK ? (o.sway ?? 0.25) : 0;
      this.swaySpeed = o.swaySpeed ?? 0.13;
      this.swayT = 0;
      this.zoom = o.zoom || 1;
      this.zoomNarrow = o.zoomNarrow;
      this.t = 0;
      this._pick = [];
      this.hover = null;
      this.onPick = o.onPick;
      this.onHover = o.onHover;
      this.lastInteract = -1e9;
      this.eye = [0, 0, 0];
      this.light = [0, 1, 0];
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      this._bind();
      S.Ticker.add(this, canvas);
    }
    add(th) { this.things.push(th); return th; }
    remove(th) { const i = this.things.indexOf(th); if (i >= 0) this.things.splice(i, 1); }
    groupOf(y) { let g = 0; for (const l of this.levels) if (y >= l) g++; return g; }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(2, global.devicePixelRatio || 1);
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
    }
    _bind() {
      const c = this.canvas;
      c.style.touchAction = 'pan-y';
      if (!c.hasAttribute('tabindex')) c.tabIndex = 0;
      let drag = null;
      const local = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      c.addEventListener('pointerdown', e => {
        this.mouse = local(e);
        drag = { x: e.clientX, y: e.clientY, yaw: this.cam.yaw + this.sway * Math.sin(this.swayT * this.swaySpeed), pitch: this.cam.pitch, moved: 0 };
        this.swayT = 0;
        this.cam.yaw = drag.yaw;
        try { c.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        this.lastInteract = performance.now();
      });
      c.addEventListener('pointermove', e => {
        this.mouse = local(e);
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
        if (drag.moved > 4) {
          this._tween = null;
          this.cam.yaw = drag.yaw - dx * 0.008;
          this.cam.pitch = clamp(drag.pitch + dy * 0.006, this.limits.minPitch, this.limits.maxPitch);
          this.dragging = true;
        }
        this.lastInteract = performance.now();
      });
      const end = () => {
        if (drag && drag.moved <= 6 && this.mouse) {
          const hit = this.pickAt(this.mouse.x, this.mouse.y);
          if (hit && this.onPick) this.onPick(hit);
        }
        drag = null;
        this.dragging = false;
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', () => { drag = null; this.dragging = false; });
      c.addEventListener('pointerleave', () => { if (!drag) { this.mouse = null; this._setHover(null); } });
      c.addEventListener('dblclick', () => this.flyTo(this.home, 700));
      c.addEventListener('wheel', e => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.cam.dist = clamp(this.cam.dist * (1 + e.deltaY * 0.003), this.limits.minDist, this.limits.maxDist);
        this.lastInteract = performance.now();
      }, { passive: false });
      c.addEventListener('keydown', e => {
        const k = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
        if (!k) return;
        e.preventDefault();
        this.cam.yaw += k[0];
        this.cam.pitch = clamp(this.cam.pitch + k[1], this.limits.minPitch, this.limits.maxPitch);
        this.lastInteract = performance.now();
      });
    }
    _setHover(th) {
      if (th === this.hover) return;
      this.hover = th;
      this.canvas.style.cursor = th ? 'pointer' : '';
      if (this.onHover) this.onHover(th);
    }
    pickAt(x, y) {
      let best = null;
      for (const p of this._pick) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d <= p.r + 6 && (!best || p.z < best.z)) best = p;
      }
      return best && best.thing;
    }
    flyTo(c, ms = 800) {
      const yaw = this.cam.yaw + this.sway * Math.sin(this.swayT * this.swaySpeed);
      this.swayT = 0;
      const from = { yaw, pitch: this.cam.pitch, dist: this.cam.dist, target: this.cam.target.slice() };
      let ty = c.yaw ?? from.yaw;
      while (ty - from.yaw > Math.PI) ty -= S.TAU;
      while (ty - from.yaw < -Math.PI) ty += S.TAU;
      this.cam.yaw = yaw;
      this._tween = { from, to: { yaw: ty, pitch: c.pitch ?? from.pitch, dist: c.dist ?? from.dist, target: (c.target || from.target).slice() }, t: 0, dur: Math.max(0.01, (S.motionOK ? ms : 1) / 1000) };
    }
    _camera() {
      const c = this.cam;
      const yaw = c.yaw + this.sway * Math.sin(this.swayT * this.swaySpeed);
      const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
      this.eye = [c.target[0] + c.dist * cp * Math.sin(yaw), c.target[1] + c.dist * sp, c.target[2] + c.dist * cp * Math.cos(yaw)];
      const f = norm(sub(c.target, this.eye)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
      this.F = f; this.R = r; this.U = u;
      const aspectFit = Math.min(this.w, this.h * 1.55);
      const zoom = this.w < 540 && this.zoomNarrow ? this.zoomNarrow : this.zoom;
      this.focal = (aspectFit * 0.5) / Math.tan(c.fov / 2) * zoom;
      this.refS = this.focal / c.dist;
      this.cx = this.w / 2;
      this.cy = this.h / 2;
      this.light = norm([-0.45 * r[0] + 0.8 * u[0] - 0.42 * f[0], -0.45 * r[1] + 0.8 * u[1] - 0.42 * f[1], -0.45 * r[2] + 0.8 * u[2] - 0.42 * f[2]]);
    }
    project(p) {
      const dx = p[0] - this.eye[0], dy = p[1] - this.eye[1], dz = p[2] - this.eye[2];
      const z = dx * this.F[0] + dy * this.F[1] + dz * this.F[2];
      if (z < 0.4) return null;
      const s = this.focal / z;
      return { x: this.cx + (dx * this.R[0] + dy * this.R[1] + dz * this.R[2]) * s, y: this.cy - (dx * this.U[0] + dy * this.U[1] + dz * this.U[2]) * s, z, s };
    }
    /* which way is a world-space velocity going on screen? (+1 right, -1 left) */
    screenDir(v) { return dot(v, this.R) >= 0 ? 1 : -1; }
    frame(t, dt) {
      this.t = t;
      const idle = performance.now() - this.lastInteract > 2600;
      if (this._tween) {
        const tw = this._tween;
        tw.t += dt / tw.dur;
        const k = ease(Math.min(1, tw.t));
        this.cam.yaw = lerp(tw.from.yaw, tw.to.yaw, k);
        this.cam.pitch = lerp(tw.from.pitch, tw.to.pitch, k);
        this.cam.dist = lerp(tw.from.dist, tw.to.dist, k);
        this.cam.target = [0, 1, 2].map(i => lerp(tw.from.target[i], tw.to.target[i], k));
        if (tw.t >= 1) this._tween = null;
      } else if (idle) this.swayT += dt;
      this._camera();
      if (this.update) this.update(dt, t, this);
      this.render();
      if (this.mouse && !this.dragging) this._setHover(this.pickAt(this.mouse.x, this.mouse.y));
    }
    render() {
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      this._camera();
      const out = [];
      this._pick.length = 0;
      for (const th of this.things) if (th.visible) th.emit(this, out);
      out.sort((a, b) => (a.g - b.g) || (a.p - b.p) || (b.z - a.z));
      for (const d of out) d.draw(ctx);
      if (this.overlay) this.overlay(ctx, this.w, this.h, this);
    }
  }

  const E = {
    Scene, Thing, Mesh, Ball, Sprite, Label, Path, ease, lerp, clamp,
    box: o => new Mesh(boxFaces(o.w ?? 1, o.h ?? 1, o.d ?? 1), o),
    cyl: o => new Mesh(cylFaces(o.r ?? 1, o.rt ?? o.r ?? 1, o.h ?? 1, o.segs ?? 14, o.cap !== false), o),
    cone: o => new Mesh(cylFaces(o.r ?? 1, 0, o.h ?? 1, o.segs ?? 14, false), o),
    pyramid: o => new Mesh(pyramidFaces(o.w ?? 1, o.d ?? 1, o.h ?? 1), o),
    quad: o => new Mesh([{ v: o.v, n: o.n || [0, 0, 1], twoSided: true }], Object.assign({}, o, { pos: [0, 0, 0] })),
    ball: o => new Ball(o),
    sprite: o => new Sprite(o),
    label: o => new Label(o),
    path: o => new Path(o),
    /* sample a smooth 3D arc between two points (height = bump at the middle) */
    arc(a, b, height, n = 18) {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + Math.sin(Math.PI * t) * height, lerp(a[2], b[2], t)]);
      }
      return out;
    }
  };
  global.Engine3D = E;
})(window);
