/* Scenes — the 3D worlds of the sketchbook, built with Engine3D.
   Each builder takes a <canvas> (plus UI callbacks) and returns a small API. */
(function () {
  'use strict';
  const S = window.Sketch, E = window.Engine3D;
  const { lerp, ease } = E;
  const TAU = Math.PI * 2;
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rand = (a, b) => a + Math.random() * (b - a);

  /* Moves things from A to B over time, with an optional hop. */
  class Movers {
    constructor() { this.list = []; }
    add(th, a, b, dur, o = {}) {
      this.cancel(th);
      this.list.push({ th, a: a.slice(), b: b.slice(), dur: Math.max(0.01, dur), t: 0, arc: o.arc || 0, lin: o.linear, done: o.done, fade: o.fade });
    }
    cancel(th) { this.list = this.list.filter(m => m.th !== th); }
    busy(th) { return this.list.some(m => m.th === th); }
    tick(dt, sc) {
      for (const m of this.list.slice()) {
        m.t += dt / m.dur;
        const k = Math.min(1, m.t), e = m.lin ? k : ease(k);
        const prev = m.th.pos;
        const p = lerp3(m.a, m.b, e);
        p[1] += Math.sin(Math.PI * k) * m.arc;
        m.th.pos = p;
        if (m.fade) m.th.alpha = 1 - k;
        if (m.th.isBee && sc) {
          const v = [p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]];
          if (Math.abs(v[0]) + Math.abs(v[2]) > 1e-4) m.th.flip = sc.screenDir(v) < 0;
        }
        if (k >= 1) {
          const i = this.list.indexOf(m);
          if (i >= 0) this.list.splice(i, 1);
          if (m.done) m.done(m.th);
        }
      }
    }
  }

  const beeDraw = (ctx, x, y, s, t, self) => S.bee(ctx, x, y, s, t, { flip: self.flip, phase: self.id, tilt: self.tilt || 0, sad: self.sad });
  const makeBee = (sc, pos, o = {}) => sc.add(E.sprite(Object.assign({ pos, size: 1.3, unit: 36, draw: beeDraw, isBee: true }, o)));
  const jarDraw = (ctx, x, y, s, t, self) => S.jar(ctx, x, y, s, self.level, self.tagText || 'map', { t, seed: self.id });
  const hover = (sc, b, center, t, ph, rx = 0.8, rz = 0.55) => {
    const a = t * 1.2 + ph;
    const prev = b.pos;
    b.pos = [center[0] + Math.cos(a) * rx, center[1] + Math.sin(t * 2.2 + ph) * 0.2, center[2] + Math.sin(a) * rz];
    b.flip = sc.screenDir([b.pos[0] - prev[0], 0, b.pos[2] - prev[2]]) < 0;
  };
  const burstSprite = (sc, pos, o = {}) => sc.add(E.sprite({ pos, size: o.size || 1.4, unit: 30, zBias: -0.5, life: o.life || 0.45, draw: (ctx, x, y, s, t, self) => S.burst(ctx, x, y, 14 * s, { fill: o.fill || 'yellow', text: o.text, size: 9 * s, seed: self.id }) }));

  /* ============ HERO: the kernel castle ============ */
  function hero(canvas) {
    const Y = [0, 6.2, 12.4], T = 0.45, K = Y[1], U = Y[2];
    const mv = new Movers();
    const sc = new E.Scene(canvas, { cam: { yaw: 0.55, pitch: 0.42, dist: 38, target: [-1.6, 6.6, 0.6], fov: 0.8 }, levels: [6, 12.2], sway: 0.36, swaySpeed: 0.14, zoom: 1.06, zoomNarrow: 0.84 });
    const add = th => sc.add(th);

    [['purple', 0.3], ['orange', 0.26], ['blue', 0.24]].forEach(([c, a], i) =>
      add(E.box({ pos: [0, Y[i] - T, 0], w: 22, h: T, d: 13, color: c, alpha: a, pass: 0, group: i, noHatch: true, lw: 2.2 })));
    add(E.label({ pos: [-11.4, U - 0.2, 2], text: 'USER LAND\nyour apps', bg: 'blue', px: 14, align: 'right', group: 2 }));
    add(E.label({ pos: [-11.4, K - 0.2, 2], text: 'KERNEL\nthe castle', bg: 'orange', px: 14, align: 'right', group: 1 }));
    add(E.label({ pos: [-11.4, -0.2, 2], text: 'HARDWARE\nthe chips', bg: 'purple', px: 14, align: 'right', group: 0 }));

    // hardware
    add(E.box({ pos: [-5.5, 0, 1], w: 3.4, h: 0.45, d: 3.4, color: 'green' }));
    add(E.box({ pos: [-5.5, 0.45, 1], w: 1.8, h: 0.3, d: 1.8, color: 'green' }));
    add(E.label({ pos: [-5.5, 1.5, 1], text: 'CPU', px: 12, style: 'plain' }));
    for (let i = 0; i < 3; i++) add(E.box({ pos: [-0.9 + i * 0.9, 0, -2.6], w: 0.35, h: 1.5, d: 3.4, color: 'blue' }));
    add(E.label({ pos: [0, 2.2, -2.6], text: 'memory', px: 12, style: 'plain' }));
    add(E.cyl({ pos: [5.5, 0, -2.4], r: 1.5, h: 0.8, color: 'orange', segs: 16 }));
    add(E.cyl({ pos: [5.5, 0.8, -2.4], r: 0.35, h: 0.15, color: 'muted', segs: 10 }));
    add(E.label({ pos: [5.5, 1.8, -2.4], text: 'disk', px: 12, style: 'plain' }));
    add(E.box({ pos: [6.2, 0, 3.2], w: 3, h: 0.55, d: 1.8, color: 'pink' }));
    add(E.cyl({ pos: [7.3, 0.55, 3.2], r: 0.08, h: 1.2, color: 'muted', segs: 6, noHatch: true }));
    add(E.label({ pos: [6.2, 1.4, 4.4], text: 'network card', px: 12, style: 'plain' }));

    // kernel castle
    for (const [x, z] of [[-10, -5.7], [10, -5.7], [-10, 5.7], [10, 5.7]]) {
      add(E.cyl({ pos: [x, K, z], r: 0.85, h: 2.8, color: 'orange', segs: 10 }));
      add(E.cone({ pos: [x, K + 2.8, z], r: 1.15, h: 1.5, color: 'red', segs: 10 }));
      add(E.sprite({ pos: [x, K + 4.3, z], size: 1.3, unit: 30, draw: (c, px, py, s, t) => S.flag(c, px, py, s, t, 'pink') }));
    }
    const rooms = [
      { name: 'network', pos: [4.6, K, 2.8], color: 'blue', h: 1.6, kind: 0 },
      { name: 'files', pos: [-4.6, K, 2.8], color: 'green', h: 1.4, kind: 1 },
      { name: 'who runs next', pos: [-4.6, K, -2.8], color: 'purple', h: 1.9, kind: 2 },
      { name: 'memory', pos: [4.6, K, -2.8], color: 'pink', h: 1.4, kind: 3 }
    ];
    rooms.forEach((r, i) => {
      add(E.box({ pos: r.pos, w: 3.4, h: r.h, d: 2.4, color: r.color }));
      add(E.label({ pos: [r.pos[0], K + 0.45, r.pos[2] + 1.35], text: r.name, px: 11, style: 'plain' }));
      r.hook = [r.pos[0], K + r.h + 1.2, r.pos[2]];
      r.bee = makeBee(sc, r.hook.slice(), { shadow: K + r.h, size: 1.2 });
      r.phase = i * 1.7;
      r.zap = 0;
      r.spark = burstSprite(sc, r.hook.slice(), { size: 0.9 });
      r.spark.visible = false;
    });
    // verifier gate
    add(E.box({ pos: [-1.4, K, 5.4], w: 0.5, h: 2.4, d: 0.5, color: 'muted' }));
    add(E.box({ pos: [1.4, K, 5.4], w: 0.5, h: 2.4, d: 0.5, color: 'muted' }));
    add(E.box({ pos: [0, K + 2.4, 5.4], w: 3.4, h: 0.5, d: 0.7, color: 'red' }));
    add(E.label({ pos: [0, K + 3.35, 5.4], text: 'verifier gate', px: 11, style: 'plain' }));
    const guard = add(E.sprite({ pos: [2.6, K, 5.7], size: 2.3, unit: 60, draw: (c, x, y, s, t, self) => S.guard(c, x, y, s, t, { mood: self.mood, scan: self.scan }) }));
    const say = add(E.label({ pos: [3.2, K + 3.4, 5.7], text: 'checking…', bg: 'paper2', px: 12, visible: false }));
    // maps (honey jars)
    const jars = [
      add(E.sprite({ pos: [-1, K, -0.2], size: 1.6, unit: 32, level: 0.25, q: [], draw: jarDraw })),
      add(E.sprite({ pos: [1, K, 0.4], size: 1.6, unit: 32, level: 0.4, q: [], draw: jarDraw }))
    ];
    // system-call tube between floors
    add(E.cyl({ pos: [-8.2, K, -0.6], r: 0.5, h: U - K, color: 'yellow', segs: 12 }));
    add(E.label({ pos: [-8.2, K + 2.7, 0.5], text: 'system calls', px: 11, style: 'plain' }));

    // user land
    [['browser', [-5.4, U, 2.2], 'yellow', 'red'], ['game', [-2.2, U, -3.2], 'green', 'purple'], ['music', [2.6, U, -3.2], 'pink', 'blue']].forEach(([n, p, c, r]) => {
      add(E.box({ pos: p, w: 2.2, h: 1.4, d: 2, color: c }));
      add(E.pyramid({ pos: [p[0], U + 1.4, p[2]], w: 2.6, d: 2.4, h: 1.1, color: r }));
      add(E.label({ pos: [p[0], U + 0.45, p[2] + 1.15], text: n, px: 11, style: 'plain' }));
    });
    add(E.box({ pos: [5.6, U, 2.4], w: 3.4, h: 2.3, d: 0.35, color: 'purple' }));
    const dash = add(E.sprite({ pos: [5.6, U + 1.15, 2.7], size: 2.9, unit: 60, counts: [2, 1, 1, 1], draw: (c, x, y, s, t, self) => S.miniChart(c, x, y, s, self.counts, ['net', 'files', 'cpu', 'mem']) }));
    add(E.label({ pos: [5.6, U + 3.0, 2.4], text: 'your eBPF tool', bg: 'yellow', px: 12 }));
    add(E.box({ pos: [0.8, U, 3.8], w: 1.8, h: 0.7, d: 1.1, color: 'orange' }));

    // honey: bees → jars → your tool
    function honey(room) {
      const j = jars[Math.random() < 0.5 ? 0 : 1];
      const drop = add(E.ball({ pos: room.bee.pos.slice(), r: 0.2, color: 'yellow' }));
      mv.add(drop, drop.pos, [j.pos[0], K + 1.1, j.pos[2]], 1.1, { arc: 1, done: () => { sc.remove(drop); j.level = Math.min(1, j.level + 0.09); j.q.push(room.kind); } });
    }
    function zap(room) { room.zap = 1; honey(room); }
    function sendUp() {
      const j = jars[0].q.length > jars[1].q.length ? jars[0] : jars[1];
      if (!j.q.length) return;
      const kind = j.q.shift();
      j.level = Math.max(0.12, j.level - 0.09);
      const drop = add(E.ball({ pos: [j.pos[0], K + 1.2, j.pos[2]], r: 0.24, color: 'yellow' }));
      mv.add(drop, drop.pos, [5.6, U + 1.4, 3], 1.9, { arc: 2.2, done: () => { sc.remove(drop); dash.counts[kind]++; if (Math.max(...dash.counts) > 14) dash.counts = dash.counts.map(c => Math.ceil(c / 2)); } });
    }
    function packet() {
      const b = add(E.ball({ pos: [14, 0.7, 3.2], r: 0.3, color: 'blue', shadow: 0 }));
      mv.add(b, b.pos, [7.2, 0.8, 3.2], 1.2, { linear: true, done: () => {
        b.shadow = null;
        mv.add(b, b.pos, [4.6, K + 0.9, 2.8], 1.3, { done: () => { sc.remove(b); zap(rooms[0]); } });
      } });
    }

    // the travelling bee: from you → past the guard → into the kernel
    const start = [0.8, U + 1.3, 3.8];
    const trav = makeBee(sc, start.slice(), { size: 1.35 });
    let li = -1, waitT = 0;
    const wait = s => { waitT = s; };
    const next = () => { li = (li + 1) % legs.length; legs[li](); };
    const legs = [
      () => mv.add(trav, trav.pos, [0.8, U + 2.4, 4.8], 0.8, { done: next }),
      () => mv.add(trav, trav.pos, [0, K + 1.6, 7.8], 2.2, { arc: 0.6, done: next }),
      () => mv.add(trav, trav.pos, [0, K + 1.3, 6.5], 0.6, { done: next }),
      () => { guard.mood = null; guard.scan = true; say.text = 'checking…'; say.visible = true; wait(1.6); },
      () => { guard.mood = 'ok'; guard.scan = false; say.text = 'safe ✓'; wait(0.9); },
      () => { say.visible = false; mv.add(trav, trav.pos, [0, K + 1.5, 3.8], 0.9, { done: next }); },
      () => mv.add(trav, trav.pos, [rooms[3].hook[0] - 1.2, rooms[3].hook[1], rooms[3].hook[2] + 0.6], 1.5, { arc: 0.8, done: next }),
      () => { zap(rooms[3]); wait(2.6); },
      () => { guard.mood = null; trav.visible = false; trav.pos = start.slice(); wait(1.4); },
      () => { trav.visible = true; next(); }
    ];
    next();

    const timers = { pkt: 0.5, files: 1.2, sched: 0.4, mem: 2, up: 1.5 };
    sc.update = (dt, t) => {
      mv.tick(dt, sc);
      if (waitT > 0) { waitT -= dt; if (waitT <= 0) next(); }
      rooms.forEach(r => {
        r.zap = Math.max(0, r.zap - dt * 1.6);
        hover(sc, r.bee, r.hook, t, r.phase);
        r.bee.pos[1] += r.zap * 0.6;
        r.bee.tilt = r.zap * 0.4 * Math.sin(t * 30);
        r.spark.visible = r.zap > 0.55;
        r.spark.pos = [r.bee.pos[0], r.bee.pos[1] + 0.9, r.bee.pos[2]];
      });
      const tick = (k, every, fn) => { timers[k] -= dt; if (timers[k] <= 0) { timers[k] += every; fn(); } };
      tick('pkt', 1.6, packet);
      tick('files', 2.5, () => zap(rooms[1]));
      tick('sched', 1.9, () => zap(rooms[2]));
      tick('mem', 3.7, () => zap(rooms[3]));
      tick('up', 0.9, sendUp);
    };
    return sc;
  }

  /* ============ JOURNEY: from your keyboard into the kernel ============ */
  function journey(canvas) {
    const mv = new Movers();
    const sc = new E.Scene(canvas, { cam: { yaw: 0, pitch: 1.0, dist: 42, target: [0.5, 0.4, 1.4], fov: 0.8 }, sway: 0.12, zoomNarrow: 0.92 });
    const add = th => sc.add(th);
    add(E.box({ pos: [-8.6, -0.4, 0], w: 16.6, h: 0.4, d: 13, color: 'blue', alpha: 0.22, pass: 0, noHatch: true, lw: 2.2 }));
    add(E.box({ pos: [8.6, -0.4, 0], w: 16.6, h: 0.4, d: 13, color: 'orange', alpha: 0.22, pass: 0, noHatch: true, lw: 2.2 }));
    add(E.label({ pos: [-16.6, 0.2, 6.5], text: 'USER SPACE', bg: 'blue', px: 14, align: 'left' }));
    add(E.label({ pos: [1.2, 0.2, 6.5], text: 'KERNEL', bg: 'orange', px: 14, align: 'left' }));
    // the wall between user space and the kernel, with one door: the bpf() system call
    add(E.box({ pos: [0, 0, -4], w: 0.6, h: 3, d: 5, color: 'muted' }));
    add(E.box({ pos: [0, 0, 4], w: 0.6, h: 3, d: 5, color: 'muted' }));
    add(E.box({ pos: [0, 2.2, 0], w: 0.6, h: 0.8, d: 3, color: 'muted' }));
    // 1 desk + laptop
    add(E.box({ pos: [-13, 0, 1], w: 2.6, h: 1.1, d: 1.6, color: 'orange' }));
    add(E.sprite({ pos: [-13, 1.15, 1.2], size: 1.9, unit: 40, draw: (c, x, y, s) => S.laptop(c, x, y, s) }));
    // 2 compiler machine
    add(E.box({ pos: [-7.5, 0, -1], w: 2.6, h: 2.2, d: 2.2, color: 'purple' }));
    add(E.cyl({ pos: [-7.5, 2.2, -1], r: 0.35, rt: 1.0, h: 1.0, color: 'yellow', segs: 12 }));
    const gearS = add(E.sprite({ pos: [-7.5, 1.1, 0.2], size: 1.1, unit: 30, spin: 0.4, draw: (c, x, y, s, t, self) => { S.gear(c, x - 7 * s, y, 9 * s, t * self.spin, 'yellow'); S.gear(c, x + 8 * s, y + 3 * s, 6 * s, -t * self.spin * 1.5, 'green', { teeth: 6 }); } }));
    add(E.label({ pos: [-7.5, 0.35, 0.3], text: 'clang', px: 11, style: 'plain' }));
    // 4 verifier arch + guard
    add(E.box({ pos: [4.6, 0, -1.4], w: 0.5, h: 3, d: 0.5, color: 'blue' }));
    add(E.box({ pos: [4.6, 0, 1.4], w: 0.5, h: 3, d: 0.5, color: 'blue' }));
    add(E.box({ pos: [4.6, 3, 0], w: 0.7, h: 0.5, d: 3.3, color: 'red' }));
    const scanQ = add(E.quad({ v: [[4.6, 0.1, -1.15], [4.6, 0.1, 1.15], [4.6, 2.95, 1.15], [4.6, 2.95, -1.15]], n: [1, 0, 0], color: 'green', alpha: 0.28, noHatch: true, lw: 1, visible: false }));
    const guardS = add(E.sprite({ pos: [5.4, 0, 2.6], size: 2.3, unit: 60, draw: (c, x, y, s, t, self) => S.guard(c, x, y, s, t, { mood: self.mood, scan: self.scan }) }));
    const gSay = add(E.label({ pos: [5.8, 3.4, 2.6], text: '', bg: 'paper2', px: 12, visible: false }));
    // 5 JIT machine
    add(E.box({ pos: [9, 0, -1.5], w: 2.4, h: 1.8, d: 2.2, color: 'green' }));
    add(E.label({ pos: [9, 0.4, -0.3], text: 'JIT', px: 11, style: 'plain' }));
    const boltS = add(E.sprite({ pos: [9, 3.6, -1.5], size: 1.6, unit: 30, visible: false, draw: (c, x, y, s) => S.bolt(c, x, y, s, 'yellow') }));
    // 6 hook on a pole + 7 the event source
    add(E.cyl({ pos: [13.5, 0, -3.2], r: 0.12, h: 3.1, color: 'muted', segs: 8, noHatch: true }));
    add(E.sprite({ pos: [13.5, 3.3, -3.2], size: 1, unit: 30, draw: (c, x, y, s) => S.hookIcon(c, x, y, s) }));
    add(E.box({ pos: [15.5, 0, -0.6], w: 1.6, h: 1.2, d: 1.6, color: 'pink' }));
    add(E.label({ pos: [15.5, 0.6, 0.6], text: 'a program starts', px: 10, style: 'plain' }));
    // 8 maps + your app's dashboard back in user space
    const jarS = add(E.sprite({ pos: [13.5, 0, 3], size: 1.9, unit: 32, level: 0.15, draw: jarDraw }));
    add(E.path({ pts: E.arc([13.5, 1.6, 3], [-7.5, 2.3, 4.8], 6, 36), dash: [8, 8], flow: 18, color: 'orange', width: 2.4, zBias: -2 }));
    add(E.box({ pos: [-7.5, 0, 4.8], w: 3, h: 2, d: 0.3, color: 'purple' }));
    const dash = add(E.sprite({ pos: [-7.5, 1, 5.05], size: 2.6, unit: 60, counts: [0, 0, 0, 0], draw: (c, x, y, s, t, self) => S.miniChart(c, x, y, s, self.counts) }));
    add(E.label({ pos: [-7.5, 0.3, 5.6], text: 'your app reads the map', px: 10, style: 'plain' }));

    const ST = [
      { cam: sc.home },
      { p: [-13, 2.3, 1.2], cam: { target: [-11.5, 1, 1], dist: 15, yaw: 0.2, pitch: 0.42 } },
      { p: [-5.6, 1.4, -0.4], cam: { target: [-7, 1.5, -0.8], dist: 15, yaw: -0.15, pitch: 0.42 } },
      { p: [0, 1.2, 0], cam: { target: [0, 1.2, 0], dist: 15, yaw: 0.55, pitch: 0.42 } },
      { p: [4.6, 1.4, 0], cam: { target: [4.8, 1.4, 0.6], dist: 14, yaw: 0.35, pitch: 0.32 } },
      { p: [9, 2.6, -1.5], cam: { target: [9, 1.4, -1.4], dist: 14, yaw: 0.05, pitch: 0.42 } },
      { p: [13.5, 3.9, -3.2], cam: { target: [13.6, 2, -2.6], dist: 15, yaw: -0.25, pitch: 0.36 } },
      { p: [13.5, 3.9, -3.2], cam: { target: [14.2, 1.5, -1.8], dist: 16, yaw: 0.3, pitch: 0.4 } },
      { p: [13.5, 3.9, -3.2], cam: { target: [3, 0.6, 1.4], dist: 40, yaw: 0, pitch: 0.8 } }
    ];
    const tagPos = [[-13, 3.4, 1], [-7.5, 4.4, -1], [0, 3.8, 0], [4.6, 4.2, 0], [9, 2.6, -2.9], [13.5, 4.8, -3.2], [15.5, 2.6, -0.6], [13.5, 3.2, 3]];
    const tags = tagPos.map((p, i) => add(E.label({ pos: p, text: String(i + 1), bg: 'paper2', px: 15 })));

    const pkg = add(E.sprite({ pos: ST[1].p.slice(), size: 1.4, unit: 32, stage: 'paper', draw: (c, x, y, s, t, self) => {
      if (self.stage === 'paper') S.paperSheet(c, x, y, s);
      else if (self.stage === 'cube') S.byteCube(c, x, y, s, { stamped: self.stamped });
      else S.bee(c, x, y, s * 0.95, t, { flip: self.flip, phase: 3 });
    } }));
    let cur = 0, pending = 0;
    const sparkT = { ev: 0, honey: 0, up: 0 };

    function setStage(k) {
      pkg.stage = k < 2 ? 'paper' : k < 5 ? 'cube' : 'bee';
      pkg.isBee = pkg.stage === 'bee';
      pkg.stamped = k > 4;
    }
    function go(k) {
      cur = k;
      pending = 0;
      sc.flyTo(ST[k].cam, 1000);
      tags.forEach((tg, i) => { tg.bg = i + 1 === k ? 'yellow' : 'paper2'; tg.hl = i + 1 === k; });
      scanQ.visible = false; guardS.mood = null; guardS.scan = false; gSay.visible = false; boltS.visible = false;
      gearS.spin = 0.4;
      const to = ST[Math.max(1, k)].p;
      if (k === 2) {
        setStage(1);
        mv.add(pkg, pkg.pos, [-7.5, 4.3, -1], 0.8, { arc: 0.8, done: () => {
          gearS.spin = 3; setStage(2);
          mv.add(pkg, pkg.pos, to, 0.7, { done: () => { gearS.spin = 0.4; } });
        } });
      } else if (k === 4) {
        setStage(3);
        mv.add(pkg, pkg.pos, to, 0.9, { done: () => {
          scanQ.visible = true; guardS.scan = true; gSay.text = 'checking every path…'; gSay.visible = true;
          pending = 1.8;
        } });
      } else if (k === 5) {
        setStage(4);
        mv.add(pkg, pkg.pos, [9, 2.4, -1.5], 0.9, { arc: 1, done: () => {
          boltS.visible = true; pending = -0.8;
        } });
      } else {
        setStage(k);
        mv.add(pkg, pkg.pos, to, k === 0 ? 0.01 : 0.9, { arc: k >= 6 ? 1 : 0.4 });
      }
    }
    function spark() {
      const b = add(E.ball({ pos: [15.5, 1.4, -0.6], r: 0.25, color: 'pink' }));
      mv.add(b, b.pos, [13.6, 3.5, -3.1], 0.8, { arc: 0.8, done: () => { sc.remove(b); pkg.zap = 1; } });
    }
    function honeyDrop() {
      const b = add(E.ball({ pos: pkg.pos.slice(), r: 0.22, color: 'yellow' }));
      mv.add(b, b.pos, [13.5, 1.2, 3], 1.1, { arc: 1.2, done: () => { sc.remove(b); jarS.level = Math.min(1, jarS.level + 0.12); } });
    }
    function upToApp() {
      if (jarS.level < 0.25) return;
      jarS.level -= 0.12;
      const b = add(E.ball({ pos: [13.5, 1.6, 3], r: 0.26, color: 'yellow' }));
      const pts = E.arc([13.5, 1.6, 3], [-7.5, 2.3, 4.8], 6, 30);
      let i = 0;
      const stepAlong = () => { i++; if (i >= pts.length) { sc.remove(b); dash.counts[Math.floor(Math.random() * 4)]++; if (Math.max(...dash.counts) > 12) dash.counts = dash.counts.map(c => Math.ceil(c / 2)); return; } mv.add(b, b.pos, pts[i], 0.07, { linear: true, done: stepAlong }); };
      stepAlong();
    }
    sc.update = (dt, t) => {
      mv.tick(dt, sc);
      if (pending > 0) {
        pending -= dt;
        if (pending <= 0) { pending = 0; scanQ.visible = false; guardS.scan = false; guardS.mood = 'ok'; gSay.text = 'SAFE ✓'; pkg.stamped = true; }
      } else if (pending < 0) {
        pending += dt;
        if (pending >= 0) { pending = 0; setStage(5); boltS.visible = false; }
      }
      if (pkg.stage === 'bee' && !mv.busy(pkg) && cur >= 6) {
        const base = ST[6].p;
        const prev = pkg.pos;
        pkg.zap = Math.max(0, (pkg.zap || 0) - dt * 1.8);
        pkg.pos = [base[0] + Math.cos(t * 1.5) * 0.5, base[1] + Math.sin(t * 2.4) * 0.15 + pkg.zap * 0.5, base[2] + Math.sin(t * 1.5) * 0.35];
        pkg.flip = sc.screenDir([pkg.pos[0] - prev[0], 0, pkg.pos[2] - prev[2]]) < 0;
      }
      if (cur >= 7) {
        sparkT.ev -= dt;
        if (sparkT.ev <= 0) { sparkT.ev = 1.3; spark(); }
      }
      if (cur >= 8) {
        sparkT.honey -= dt;
        if (sparkT.honey <= 0) { sparkT.honey = 1.3; honeyDrop(); }
        sparkT.up -= dt;
        if (sparkT.up <= 0) { sparkT.up = 1.6; upToApp(); }
      }
    };
    return { scene: sc, go };
  }

  /* ============ HOOKS: where can a bee sit? ============ */
  const CAT = { tracing: 'blue', networking: 'green', security: 'red', scheduling: 'purple' };
  function hooks(canvas, onSelect) {
    const mv = new Movers();
    const L = { hw: 0, drv: 4, k: 8.4, sys: 15, user: 19.4 };
    const sc = new E.Scene(canvas, {
      cam: { yaw: 0.4, pitch: 0.28, dist: 37, target: [0.8, 10.4, 0], fov: 0.8 }, levels: [3.8, 8.2, 14.8, 19.2], sway: 0.3, zoomNarrow: 0.86,
      onPick: ref => ref && ref.hook && select(ref.hook.id, true),
      onHover: ref => { pins.forEach(p => { p.ball.hl = ref && ref.hook === p.h; }); }
    });
    const add = th => sc.add(th);
    const slabs = [['hardware', L.hw, 'purple'], ['drivers', L.drv, 'muted'], ['kernel', L.k, 'orange'], ['system calls', L.sys, 'yellow'], ['apps (user space)', L.user, 'blue']];
    slabs.forEach(([name, y, c], i) => {
      add(E.box({ pos: [0, y - 0.4, 0], w: 20, h: 0.4, d: 7, color: c, alpha: 0.26, pass: 0, group: i, noHatch: true, lw: 2 }));
      add(E.label({ pos: [-9.8, y + 0.2, 3.6], text: name, bg: c, px: 12, align: 'left', group: i }));
    });
    // user apps
    [['bash', -5.5, 0, 'blue'], ['python', -1.5, -1.5, 'yellow'], ['nginx', 5, 0, 'green']].forEach(([n, x, z, c]) => {
      add(E.box({ pos: [x, L.user, z], w: 2.2, h: 1.2, d: 1.8, color: c }));
      add(E.label({ pos: [x, L.user + 0.5, z + 1.05], text: n, px: 11, style: 'plain' }));
    });
    // system call gates
    ['openat', 'read', 'execve', 'connect'].forEach((n, i) => {
      const x = -6 + i * 3.6;
      add(E.box({ pos: [x, L.sys, 0], w: 1.8, h: 0.6, d: 1.4, color: 'yellow' }));
      add(E.label({ pos: [x, L.sys + 0.25, 0.85], text: n + '()', px: 10, style: 'plain' }));
    });
    // kernel subsystems
    [['files', -6, -1, 'green', 1.6], ['processes', -2, 1.4, 'purple', 1.8], ['security', 2.2, -1.4, 'red', 1.6], ['network stack', 6.5, 0.6, 'blue', 2.2], ['traffic control', 9, 2.4, 'blue', 0.8]].forEach(([n, x, z, c, h]) => {
      add(E.box({ pos: [x, L.k, z], w: n === 'traffic control' ? 1.6 : 2.6, h, d: n === 'traffic control' ? 1.2 : 2, color: c }));
      add(E.label({ pos: [x, L.k + 0.4, z + (n === 'traffic control' ? 0.75 : 1.15)], text: n, px: 10, style: 'plain' }));
    });
    add(E.box({ pos: [6.5, L.drv, 0.6], w: 2.6, h: 1, d: 2, color: 'pink' }));
    add(E.label({ pos: [6.5, L.drv + 0.4, 1.75], text: 'network driver', px: 10, style: 'plain' }));
    add(E.box({ pos: [6.5, L.hw, 0.6], w: 2.8, h: 0.5, d: 1.8, color: 'pink' }));
    add(E.label({ pos: [6.5, L.hw + 0.25, 1.7], text: 'network card', px: 10, style: 'plain' }));
    add(E.box({ pos: [-4, L.hw, 0], w: 2.6, h: 0.5, d: 2.6, color: 'green' }));
    add(E.label({ pos: [-4, L.hw + 0.25, 1.5], text: 'CPU', px: 10, style: 'plain' }));

    const pins = window.HOOKS.map(h => {
      const ref = { hook: h };
      add(E.cyl({ pos: [h.at[0], h.base, h.at[2]], r: 0.06, h: h.at[1] - h.base, segs: 6, color: 'muted', noHatch: true, lw: 1.1 }));
      const ball = add(E.ball({ pos: h.at.slice(), r: 0.42, color: CAT[h.cat], pick: true, ref }));
      const lab = add(E.label({ pos: [h.at[0], h.at[1] + 0.9, h.at[2]], text: h.name, bg: 'paper2', px: 10, pick: true, ref }));
      return { h, ball, lab };
    });
    const bee = makeBee(sc, [0, 9, 4], { size: 1.3 });
    let sel = null;
    function select(id, fromScene) {
      const p = pins.find(q => q.h.id === id);
      if (!p) return;
      sel = p;
      pins.forEach(q => { q.ball.r = q === p ? 0.62 : 0.42; q.lab.bg = q === p ? 'yellow' : 'paper2'; q.lab.hl = q === p; q.lab.px = q === p ? 13 : 10; q.lab.overlay = q === p; });
      const at = p.h.at;
      mv.add(bee, bee.pos, [at[0] + 1.1, at[1] + 0.3, at[2] + 0.6], 1.0, { arc: 1 });
      if (onSelect) onSelect(p.h, fromScene);
    }
    // a packet's trip up through the layers
    const route = [[6.5, 0.7, 2.4], [6.5, 4.4, 2.4], [6.5, 9.3, 2.4], [5.5, 11.2, 1.6], [4.8, 15.6, 1.2], [5, 20.2, 1.4]];
    function packet() {
      const b = add(E.ball({ pos: [14, 0.7, 2.4], r: 0.26, color: 'green' }));
      let i = -1;
      const step = () => { i++; if (i >= route.length) { sc.remove(b); return; } mv.add(b, b.pos, route[i], i === 0 ? 1.1 : 0.75, { linear: i === 0, done: step }); };
      step();
    }
    let pt = 0.4;
    sc.update = (dt, t) => {
      mv.tick(dt, sc);
      pt -= dt;
      if (pt <= 0) { pt = 2.4; packet(); }
      if (sel) sel.ball.r = 0.58 + Math.sin(t * 5) * 0.06;
      if (sel && !mv.busy(bee)) { const at = sel.h.at; hover(sc, bee, [at[0] + 0.9, at[1] + 0.3, at[2] + 0.4], t, 0, 0.5, 0.35); }
    };
    return { scene: sc, select };
  }

  /* ============ XDP DEFENDER ============ */
  function xdp(canvas, ui) {
    const mv = new Movers();
    const sc = new E.Scene(canvas, { cam: { yaw: 0.2, pitch: 0.5, dist: 36, target: [-1.4, 0.5, 0.5], fov: 0.8 }, sway: 0.16, zoomNarrow: 0.86 });
    const add = th => sc.add(th);
    add(E.box({ pos: [-5, -0.3, 0], w: 23, h: 0.3, d: 4.8, color: 'muted', alpha: 0.45, pass: 0, noHatch: true }));
    add(E.box({ pos: [10.5, -0.3, 0], w: 8.4, h: 0.3, d: 8.4, color: 'orange', alpha: 0.28, pass: 0, noHatch: true }));
    add(E.sprite({ pos: [-16, 2.4, 0], size: 6, unit: 60, draw: (c, x, y, s) => S.cloud(c, x, y, s, { label: 'the internet' }) }));
    add(E.box({ pos: [2, 0, -2.4], w: 0.6, h: 3.2, d: 0.6, color: 'pink' }));
    add(E.box({ pos: [2, 0, 2.4], w: 0.6, h: 3.2, d: 0.6, color: 'pink' }));
    add(E.box({ pos: [2, 3.2, 0], w: 0.8, h: 0.6, d: 5.4, color: 'pink' }));
    add(E.label({ pos: [2, 0.5, 3.3], text: 'network card', px: 12, style: 'plain' }));
    const bee = makeBee(sc, [2, 4.6, 0], { size: 1.8 });
    const beeTag = add(E.label({ pos: [2, 6.2, 0], text: 'XDP program', bg: 'yellow', px: 12 }));
    const castleParts = [add(E.box({ pos: [10.5, 0, 0], w: 5, h: 2.8, d: 5, color: 'orange' }))];
    for (const [x, z] of [[8, -2.5], [13, -2.5], [8, 2.5], [13, 2.5]]) {
      castleParts.push(add(E.cyl({ pos: [x, 0, z], r: 0.75, h: 3.8, color: 'orange', segs: 10 })));
      castleParts.push(add(E.cone({ pos: [x, 3.8, z], r: 1, h: 1.3, color: 'red', segs: 10 })));
    }
    castleParts.forEach(p => { p.home = p.pos.slice(); });
    add(E.label({ pos: [10.5, 0.6, 3.6], text: 'your server', px: 12, style: 'plain' }));
    const mood = add(E.label({ pos: [10.5, 6.4, 0], text: 'all good', bg: 'green', px: 13 }));

    const TYPES = { web: 'green', ping: 'blue', attack: 'red' };
    const stats = { web: { pass: 0, drop: 0 }, ping: { pass: 0, drop: 0 }, attack: { pass: 0, drop: 0 } };
    let rules = { on: true, attack: true, ping: false, web: false };
    let backlog = 0, happy = 0, lost = 0, attackT = 0, uiT = 0;
    const CAP = 14, DRAIN = 9;
    const acc = { web: 0, ping: 0, attack: 0 };

    function spawn(type) {
      const z = rand(-1.6, 1.6);
      const b = add(E.ball({ pos: [-13, 0.65, z], r: 0.34, color: TYPES[type], shadow: 0 }));
      b.type = type;
      mv.add(b, b.pos, [1.3, 0.65, z], 2.1, { linear: true, done: () => atGate(b) });
    }
    function atGate(b) {
      const t = b.type;
      if (rules.on && rules[t]) {
        stats[t].drop++;
        bee.zap = 1;
        const s = burstSprite(sc, [1.3, 1.4, b.pos[2]], { size: 1.1, fill: 'red', text: 'DROP' });
        setTimeout(() => sc.remove(s), 350);
        b.shadow = null;
        mv.add(b, b.pos, [0.6, -3, b.pos[2]], 0.7, { arc: 0.9, fade: true, done: () => sc.remove(b) });
        return;
      }
      if (rules.on) stats[t].pass++;
      mv.add(b, b.pos, [8.2, 0.65, b.pos[2] * 0.6], 1.1, { linear: true, done: () => atServer(b) });
    }
    function atServer(b) {
      if (backlog > CAP && b.type === 'web') {
        lost++;
        b.color = 'muted';
        b.shadow = null;
        mv.add(b, b.pos, [7.6, -2.5, b.pos[2]], 0.8, { arc: 0.6, fade: true, done: () => sc.remove(b) });
        return;
      }
      backlog += 1;
      if (b.type === 'web') happy++;
      sc.remove(b);
    }
    sc.update = (dt, t) => {
      mv.tick(dt, sc);
      acc.web += dt * 1.7;
      acc.ping += dt * 0.6;
      if (attackT > 0) { attackT -= dt; acc.attack += dt * 16; }
      for (const k in acc) while (acc[k] >= 1) { acc[k] -= 1; spawn(k); }
      backlog = Math.max(0, backlog - DRAIN * dt);
      const over = backlog > CAP;
      castleParts.forEach(p => { p.pos = over && S.motionOK ? [p.home[0] + rand(-0.08, 0.08), p.home[1], p.home[2] + rand(-0.08, 0.08)] : p.home; });
      mood.text = over ? 'OVERLOADED!' : backlog > CAP * 0.6 ? 'getting busy…' : 'all good';
      mood.bg = over ? 'red' : backlog > CAP * 0.6 ? 'orange' : 'green';
      bee.zap = Math.max(0, (bee.zap || 0) - dt * 3);
      bee.alpha = rules.on ? 1 : 0.25;
      beeTag.text = rules.on ? 'XDP program' : 'XDP is OFF';
      beeTag.bg = rules.on ? 'yellow' : 'muted';
      hover(sc, bee, [2, 4.5 + bee.zap * 0.5, 0], t, 0, 0.5, 0.4);
      bee.tilt = bee.zap * 0.5 * Math.sin(t * 40);
      uiT -= dt;
      if (uiT <= 0 && ui) { uiT = 0.2; ui({ load: Math.min(1, backlog / CAP), over, stats, happy, lost, attacking: attackT > 0 }); }
    };
    return {
      scene: sc,
      setRules(r) { rules = Object.assign({}, rules, r); },
      attack() { attackT = 7; },
      reset() { for (const k in stats) stats[k] = { pass: 0, drop: 0 }; happy = 0; lost = 0; }
    };
  }

  /* ============ RING BUFFER ============ */
  function ring(canvas, ui) {
    const N = 16, R = 5.2;
    const mv = new Movers();
    const sc = new E.Scene(canvas, { cam: { yaw: 0.25, pitch: 0.82, dist: 24, target: [0.3, 0, 1.1], fov: 0.8 }, sway: 0.25, swaySpeed: 0.1, zoomNarrow: 0.92 });
    const add = th => sc.add(th);
    add(E.cyl({ pos: [0, -0.35, 0], r: 6.9, h: 0.35, segs: 28, color: 'muted', alpha: 0.35, pass: 0, noHatch: true }));
    const slots = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const p = [Math.cos(a) * R, 0, Math.sin(a) * R];
      slots.push({ a, p, box: add(E.box({ pos: p, w: 1.75, h: 0.22, d: 1.1, rotY: -(a + Math.PI / 2), color: 'paper2', lw: 1.4, noHatch: true })), evt: null });
    }
    add(E.sprite({ pos: [0, 0.2, 0], size: 3, unit: 40, draw: (c, x, y, s) => S.laptop(c, x, y, s, { label: 'your app' }) }));
    const bee = makeBee(sc, [R + 1.5, 1, 0], { size: 1.3 });
    const wTag = add(E.label({ pos: [R + 2, 2, 0], text: 'kernel writes', bg: 'yellow', px: 11 }));
    const rTag = add(E.label({ pos: [R - 2, 1.4, 0], text: 'app reads', bg: 'blue', px: 11 }));
    let head = 0, tail = 0, count = 0, produced = 0, consumed = 0, dropped = 0;
    let prodRate = 4, consRate = 3, pa = 0, ca = 0, beeA = 0, uiT = 0;
    const colors = ['pink', 'green', 'orange', 'purple', 'blue', 'yellow'];
    function produce() {
      if (count >= N) {
        dropped++;
        const s = burstSprite(sc, bee.pos.slice(), { size: 0.9, fill: 'red', text: 'FULL' });
        setTimeout(() => sc.remove(s), 400);
        return;
      }
      const sl = slots[head];
      const cube = add(E.box({ pos: [sl.p[0], 2.6, sl.p[2]], w: 0.85, h: 0.6, d: 0.85, rotY: -(sl.a + Math.PI / 2), color: colors[produced % colors.length] }));
      cube.landed = false;
      mv.add(cube, cube.pos, [sl.p[0], 0.22, sl.p[2]], 0.35, { done: () => { cube.landed = true; } });
      sl.evt = cube;
      head = (head + 1) % N;
      count++;
      produced++;
    }
    function consume() {
      const sl = slots[tail];
      if (!count || !sl.evt || !sl.evt.landed) return;
      const cube = sl.evt;
      sl.evt = null;
      tail = (tail + 1) % N;
      count--;
      consumed++;
      mv.add(cube, cube.pos, [0, 1.3, 0], 0.5, { arc: 0.8, fade: true, done: () => sc.remove(cube) });
    }
    sc.update = (dt, t) => {
      mv.tick(dt, sc);
      pa += dt * prodRate;
      while (pa >= 1) { pa -= 1; produce(); }
      ca += dt * consRate;
      while (ca >= 1) { ca -= 1; consume(); }
      const target = slots[head].a;
      let d = target - beeA;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      beeA += d * Math.min(1, dt * 6);
      const prev = bee.pos;
      bee.pos = [Math.cos(beeA) * (R + 1.5), 1 + Math.sin(t * 3) * 0.15, Math.sin(beeA) * (R + 1.5)];
      bee.flip = sc.screenDir([bee.pos[0] - prev[0], 0, bee.pos[2] - prev[2]]) < 0;
      wTag.pos = [Math.cos(beeA) * (R + 2.4), 2.6, Math.sin(beeA) * (R + 2.4)];
      const ra = slots[tail].a;
      rTag.pos = [Math.cos(ra) * (R + 2.3), 0.9, Math.sin(ra) * (R + 2.3)];
      slots.forEach((s, i) => { s.box.color = i === head ? 'yellow' : i === tail && count ? 'blue' : 'paper2'; });
      uiT -= dt;
      if (uiT <= 0 && ui) { uiT = 0.15; ui({ produced, consumed, dropped, count, N }); }
    };
    return {
      scene: sc,
      setRates(p, c) { prodRate = p; consRate = c; },
      reset() { produced = consumed = dropped = 0; }
    };
  }

  window.Scenes = { hero, journey, hooks, xdp, ring };
})();
