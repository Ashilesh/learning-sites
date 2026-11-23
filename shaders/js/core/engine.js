/* =====================================================================
   PRISM — a tiny hand-made WebGL2 3D engine for Shaderland
   ---------------------------------------------------------------------
   - math (vec3 / mat4, column-major like OpenGL)
   - geometry generators (box, sphere, torus, knot, plane, cylinder...)
   - Renderer: programs, meshes, textures, render targets
   - OrbitCamera with inertia + tweening
   - Labels: HTML tags pinned to 3D points
   - Stage manager: lazily creates / frees WebGL contexts as you scroll
   ===================================================================== */
(function () {
  'use strict';
  const SL = (window.SL = window.SL || {});
  const PI = Math.PI, TAU = PI * 2;

  /* ============================ MATH ============================ */
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  };

  const m4 = {
    identity() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return o;
    },
    mulAll(...ms) { return ms.reduce((acc, m) => m4.mul(acc, m)); },
    perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), m = new Float32Array(16);
      m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf;
      return m;
    },
    ortho(l, r, b, t, n, f) {
      const m = new Float32Array(16);
      m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
      m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); m[15] = 1;
      return m;
    },
    lookAt(eye, target, up = [0, 1, 0]) {
      const z = v3.norm(v3.sub(eye, target));
      let x = v3.cross(up, z);
      if (v3.len(x) < 1e-6) x = v3.cross([0, 0, 1], z);
      x = v3.norm(x);
      const y = v3.cross(z, x), m = new Float32Array(16);
      m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
      m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
      m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
      m[12] = -v3.dot(x, eye); m[13] = -v3.dot(y, eye); m[14] = -v3.dot(z, eye); m[15] = 1;
      return m;
    },
    translation(x, y, z) { const m = m4.identity(); if (Array.isArray(x)) [x, y, z] = x; m[12] = x; m[13] = y; m[14] = z; return m; },
    scaling(x, y, z) { const m = m4.identity(); if (Array.isArray(x)) [x, y, z] = x; if (y === undefined) y = z = x; m[0] = x; m[5] = y; m[10] = z; return m; },
    rotX(a) { const m = m4.identity(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
    rotY(a) { const m = m4.identity(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
    rotZ(a) { const m = m4.identity(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
    /** T * Ry * Rx * Rz * S */
    trs(p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
      if (typeof s === 'number') s = [s, s, s];
      return m4.mulAll(m4.translation(p), m4.rotY(r[1]), m4.rotX(r[0]), m4.rotZ(r[2]), m4.scaling(s));
    },
    invert(m) {
      const a = m, o = new Float32Array(16);
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return m4.identity();
      det = 1 / det;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return o;
    },
    transpose(m) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[r * 4 + c] = m[c * 4 + r]; return o; },
    /** inverse-transpose of upper 3x3 → Float32Array(9) */
    normalMat(m) {
      const inv = m4.invert(m), o = new Float32Array(9);
      o[0] = inv[0]; o[1] = inv[4]; o[2] = inv[8];
      o[3] = inv[1]; o[4] = inv[5]; o[5] = inv[9];
      o[6] = inv[2]; o[7] = inv[6]; o[8] = inv[10];
      return o;
    },
    xform(m, v) {
      const x = v[0], y = v[1], z = v[2], w = v.length > 3 ? v[3] : 1;
      return [m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w,
        m[2] * x + m[6] * y + m[10] * z + m[14] * w, m[3] * x + m[7] * y + m[11] * z + m[15] * w];
    },
    xformPoint(m, v) { const r = m4.xform(m, [v[0], v[1], v[2], 1]); return [r[0] / r[3], r[1] / r[3], r[2] / r[3]]; },
  };

  const ease = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hexToRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const hsl = (h, s, l) => { // h 0..1
    const k = (n) => (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)];
  };

  /* ============================ GEOMETRY ============================ */
  function finish(P, N, U, I) {
    return { positions: new Float32Array(P), normals: N ? new Float32Array(N) : null, uvs: U ? new Float32Array(U) : null, indices: I ? (P.length / 3 > 65535 ? new Uint32Array(I) : new Uint16Array(I)) : null };
  }
  const geo = {};
  geo.box = (w = 1, h = 1, d = 1) => {
    const P = [], N = [], U = [], I = [], hs = [w / 2, h / 2, d / 2];
    const faces = [
      [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    ];
    for (const [n, u, v] of faces) {
      const base = P.length / 3;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        for (let k = 0; k < 3; k++) P.push((n[k] + u[k] * su + v[k] * sv) * hs[k]);
        N.push(n[0], n[1], n[2]); U.push((su + 1) / 2, (sv + 1) / 2);
      }
      I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return finish(P, N, U, I);
  };
  geo.sphere = (r = 1, ws = 32, hs = 16) => {
    const P = [], N = [], U = [], I = [];
    for (let y = 0; y <= hs; y++) {
      const v = y / hs, phi = v * PI;
      for (let x = 0; x <= ws; x++) {
        const u = x / ws, th = u * TAU;
        const nx = -Math.cos(th) * Math.sin(phi), ny = Math.cos(phi), nz = Math.sin(th) * Math.sin(phi);
        P.push(r * nx, r * ny, r * nz); N.push(nx, ny, nz); U.push(u, 1 - v);
      }
    }
    for (let y = 0; y < hs; y++) for (let x = 0; x < ws; x++) {
      const a = y * (ws + 1) + x, b = a + ws + 1;
      if (y !== 0) I.push(a, b, a + 1);
      if (y !== hs - 1) I.push(b, b + 1, a + 1);
    }
    return finish(P, N, U, I);
  };
  geo.torus = (R = 1, r = 0.35, rs = 24, ts = 64) => {
    const P = [], N = [], U = [], I = [];
    for (let j = 0; j <= rs; j++) for (let i = 0; i <= ts; i++) {
      const u = i / ts * TAU, v = j / rs * TAU;
      const x = (R + r * Math.cos(v)) * Math.cos(u), y = (R + r * Math.cos(v)) * Math.sin(u), z = r * Math.sin(v);
      P.push(x, y, z);
      const n = v3.norm([x - R * Math.cos(u), y - R * Math.sin(u), z]); N.push(...n);
      U.push(i / ts, j / rs);
    }
    for (let j = 1; j <= rs; j++) for (let i = 1; i <= ts; i++) {
      const a = (ts + 1) * j + i - 1, b = (ts + 1) * (j - 1) + i - 1, c = (ts + 1) * (j - 1) + i, d = (ts + 1) * j + i;
      I.push(a, b, d, b, c, d);
    }
    return finish(P, N, U, I);
  };
  geo.torusKnot = (R = 1, r = 0.3, ts = 160, rs = 20, p = 2, q = 3) => {
    const P = [], N = [], U = [], I = [];
    const pos = (u) => { const qu = q / p * u, cs = Math.cos(qu); return [R * (2 + cs) * 0.5 * Math.cos(u), R * (2 + cs) * Math.sin(u) * 0.5, R * Math.sin(qu) * 0.5]; };
    for (let i = 0; i <= ts; i++) {
      const u = i / ts * p * TAU, P1 = pos(u), P2 = pos(u + 0.01);
      const T = v3.sub(P2, P1); let Nn = v3.add(P2, P1); const B = v3.norm(v3.cross(T, Nn)); Nn = v3.norm(v3.cross(B, T));
      for (let j = 0; j <= rs; j++) {
        const v = j / rs * TAU, cx = -r * Math.cos(v), cy = r * Math.sin(v);
        const vx = [P1[0] + cx * Nn[0] + cy * B[0], P1[1] + cx * Nn[1] + cy * B[1], P1[2] + cx * Nn[2] + cy * B[2]];
        P.push(...vx); N.push(...v3.norm(v3.sub(vx, P1))); U.push(i / ts, j / rs);
      }
    }
    for (let j = 1; j <= ts; j++) for (let i = 1; i <= rs; i++) {
      const a = (rs + 1) * (j - 1) + (i - 1), b = (rs + 1) * j + (i - 1), c = (rs + 1) * j + i, d = (rs + 1) * (j - 1) + i;
      I.push(a, b, d, b, c, d);
    }
    return finish(P, N, U, I);
  };
  /** plane on XZ, normal +Y */
  geo.plane = (w = 1, d = 1, ws = 1, ds = 1) => {
    const P = [], N = [], U = [], I = [];
    for (let iz = 0; iz <= ds; iz++) for (let ix = 0; ix <= ws; ix++) {
      P.push((ix / ws - 0.5) * w, 0, (iz / ds - 0.5) * d); N.push(0, 1, 0); U.push(ix / ws, 1 - iz / ds);
    }
    for (let iz = 0; iz < ds; iz++) for (let ix = 0; ix < ws; ix++) {
      const a = iz * (ws + 1) + ix, b = a + ws + 1, c = b + 1, d2 = a + 1;
      I.push(a, b, c, a, c, d2);
    }
    return finish(P, N, U, I);
  };
  /** quad on XY facing +Z */
  geo.quad = (w = 1, h = 1) => finish(
    [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0],
    [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1], [0, 1, 2, 0, 2, 3]);
  geo.cylinder = (rt = 0.5, rb = 0.5, h = 1, seg = 24, caps = true) => {
    const P = [], N = [], U = [], I = [];
    const slope = (rb - rt) / h;
    for (let y = 0; y <= 1; y++) for (let i = 0; i <= seg; i++) {
      const th = i / seg * TAU, r = lerp(rb, rt, y);
      P.push(r * Math.sin(th), (y - 0.5) * h, r * Math.cos(th));
      N.push(...v3.norm([Math.sin(th), slope, Math.cos(th)])); U.push(i / seg, y);
    }
    for (let i = 0; i < seg; i++) { const a = i, b = i + seg + 1; I.push(a, a + 1, b, b, a + 1, b + 1); }
    if (caps) {
      for (const top of [1, 0]) {
        const r = top ? rt : rb; if (r <= 0) continue;
        const yy = (top ? 0.5 : -0.5) * h, ny = top ? 1 : -1, c = P.length / 3;
        P.push(0, yy, 0); N.push(0, ny, 0); U.push(0.5, 0.5);
        for (let i = 0; i <= seg; i++) { const th = i / seg * TAU; P.push(r * Math.sin(th), yy, r * Math.cos(th)); N.push(0, ny, 0); U.push(0.5 + 0.5 * Math.sin(th), 0.5 + 0.5 * Math.cos(th)); }
        for (let i = 0; i < seg; i++) top ? I.push(c, c + 1 + i, c + 2 + i) : I.push(c, c + 2 + i, c + 1 + i);
      }
    }
    return finish(P, N, U, I);
  };
  geo.icosphere = (r = 1, detail = 1) => {
    const t = (1 + Math.sqrt(5)) / 2;
    let verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(v3.norm);
    let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let d = 0; d < detail; d++) {
      const cache = {}, nf = [];
      const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache[k] === undefined) { cache[k] = verts.length; verts.push(v3.norm(v3.lerp(verts[a], verts[b], 0.5))); } return cache[k]; };
      for (const [a, b, c] of faces) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
      faces = nf;
    }
    const P = [], N = [], U = [], I = [];
    for (const v of verts) { P.push(v[0] * r, v[1] * r, v[2] * r); N.push(...v); U.push(0.5 + Math.atan2(v[2], v[0]) / TAU, 0.5 + Math.asin(v[1]) / PI); }
    for (const f of faces) I.push(...f);
    return finish(P, N, U, I);
  };
  /** turn an indexed geometry into a flat one (one normal per triangle) + optional per-tri color fn */
  geo.flat = (g, colorFn) => {
    const P = [], N = [], U = [], C = [], E = [], idx = g.indices, triCount = idx.length / 3;
    for (let t = 0; t < triCount; t++) {
      const vs = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]].map((i) => [g.positions[i * 3], g.positions[i * 3 + 1], g.positions[i * 3 + 2]]);
      const n = v3.norm(v3.cross(v3.sub(vs[1], vs[0]), v3.sub(vs[2], vs[0])));
      const col = colorFn ? colorFn(t, triCount) : [1, 1, 1];
      for (let k = 0; k < 3; k++) {
        const i = idx[t * 3 + k];
        P.push(...vs[k]); N.push(...n); C.push(...col);
        U.push(g.uvs ? g.uvs[i * 2] : 0, g.uvs ? g.uvs[i * 2 + 1] : 0);
        E.push(t, t / triCount, k, 0);
      }
    }
    const out = finish(P, N, U, null); out.colors = new Float32Array(C); out.extra = new Float32Array(E); return out;
  };
  /** unique edges for wireframe (LINES) */
  geo.edges = (g) => {
    const idx = g.indices, seen = new Set(), L = [], n = g.positions.length / 3;
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) {
      const a = idx[t + k], b = idx[t + (k + 1) % 3], key = a < b ? a * n + b : b * n + a;
      if (!seen.has(key)) { seen.add(key); L.push(a, b); }
    }
    return { positions: g.positions, normals: g.normals, uvs: g.uvs, colors: g.colors, extra: g.extra, indices: n > 65535 ? new Uint32Array(L) : new Uint16Array(L), mode: 'lines' };
  };
  /** merge many geometries: items = [{geo, matrix, color:[r,g,b], extra:[a,b,c,d]}] */
  geo.merge = (items) => {
    let vCount = 0, iCount = 0;
    for (const it of items) { vCount += it.geo.positions.length / 3; iCount += it.geo.indices.length; }
    const P = new Float32Array(vCount * 3), N = new Float32Array(vCount * 3), U = new Float32Array(vCount * 2), C = new Float32Array(vCount * 3), E = new Float32Array(vCount * 4);
    const I = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
    let vo = 0, io = 0;
    for (const it of items) {
      const g = it.geo, m = it.matrix || m4.identity(), nm = m4.normalMat(m), n = g.positions.length / 3;
      const col = it.color || [1, 1, 1], ex = it.extra || [0, 0, 0, 0];
      for (let i = 0; i < n; i++) {
        const x = g.positions[i * 3], y = g.positions[i * 3 + 1], z = g.positions[i * 3 + 2];
        P[(vo + i) * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
        P[(vo + i) * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        P[(vo + i) * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
        if (g.normals) {
          const a = g.normals[i * 3], b = g.normals[i * 3 + 1], c = g.normals[i * 3 + 2];
          const nx = nm[0] * a + nm[3] * b + nm[6] * c, ny = nm[1] * a + nm[4] * b + nm[7] * c, nz = nm[2] * a + nm[5] * b + nm[8] * c;
          const l = Math.hypot(nx, ny, nz) || 1;
          N[(vo + i) * 3] = nx / l; N[(vo + i) * 3 + 1] = ny / l; N[(vo + i) * 3 + 2] = nz / l;
        }
        if (g.uvs) { U[(vo + i) * 2] = g.uvs[i * 2]; U[(vo + i) * 2 + 1] = g.uvs[i * 2 + 1]; }
        C[(vo + i) * 3] = col[0]; C[(vo + i) * 3 + 1] = col[1]; C[(vo + i) * 3 + 2] = col[2];
        E[(vo + i) * 4] = ex[0]; E[(vo + i) * 4 + 1] = ex[1]; E[(vo + i) * 4 + 2] = ex[2]; E[(vo + i) * 4 + 3] = ex[3];
      }
      for (let k = 0; k < g.indices.length; k++) I[io + k] = g.indices[k] + vo;
      vo += n; io += g.indices.length;
    }
    return { positions: P, normals: N, uvs: U, colors: C, extra: E, indices: I };
  };
  /** line list from array of [x,y,z] pairs, optional colors per vertex */
  geo.lines = (pts, cols) => ({ positions: new Float32Array(pts.flat()), colors: cols ? new Float32Array(cols.flat()) : null, mode: 'lines' });
  geo.grid = (size = 10, div = 10) => {
    const pts = [], h = size / 2;
    for (let i = 0; i <= div; i++) { const p = -h + size * i / div; pts.push([p, 0, -h], [p, 0, h], [-h, 0, p], [h, 0, p]); }
    return geo.lines(pts);
  };

  /* ============================ SHADER HELPERS ============================ */
  const glsl = {
    vs: (body) => `#version 300 es\nprecision highp float;\n${body}`,
    fs: (body) => `#version 300 es\nprecision highp float;\n${body}`,
  };
  /** shared vertex shader for full-screen passes */
  glsl.fullscreenVS = glsl.vs(`in vec3 a_position; out vec2 v_uv;
void main(){ v_uv = a_position.xy*0.5+0.5; gl_Position = vec4(a_position.xy, 0.0, 1.0); }`);
  /** a standard lit vertex shader */
  glsl.litVS = glsl.vs(`in vec3 a_position; in vec3 a_normal; in vec2 a_uv; in vec3 a_color; in vec4 a_extra;
uniform mat4 u_model, u_view, u_proj;
out vec3 v_normal; out vec3 v_world; out vec2 v_uv; out vec3 v_color; out vec4 v_extra;
void main(){
  vec4 wp = u_model * vec4(a_position, 1.0);
  v_world = wp.xyz; v_normal = mat3(u_model) * a_normal; v_uv = a_uv; v_color = a_color; v_extra = a_extra;
  gl_Position = u_proj * u_view * wp;
}`);
  glsl.noise = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 r = mat2(0.8,0.6,-0.6,0.8); for(int i=0;i<5;i++){ v += a*vnoise(p); p = r*p*2.02; a *= 0.5; } return v; }
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t+d)); }
`;

  const ATTRIBS = ['a_position', 'a_normal', 'a_uv', 'a_color', 'a_extra'];

  /* ============================ RENDERER ============================ */
  class Renderer {
    constructor(gl) {
      this.gl = gl;
      gl.enable(gl.DEPTH_TEST);
      gl.vertexAttrib4f(3, 1, 1, 1, 1); // default a_color = white
      gl.vertexAttrib4f(4, 0, 0, 0, 0);
      this.quad = this.mesh({ positions: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), indices: new Uint16Array([0, 1, 2, 0, 2, 3]) });
      this.anisoExt = gl.getExtension('EXT_texture_filter_anisotropic');
      this.floatExt = gl.getExtension('EXT_color_buffer_float');
      this.current = null; // current target
      this.width = gl.canvas.width; this.height = gl.canvas.height;
    }
    /** compile → {ok, program, error, line} */
    tryProgram(vsSrc, fsSrc) {
      const gl = this.gl;
      const compile = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); return { error: log }; }
        return { shader: s };
      };
      const v = compile(gl.VERTEX_SHADER, vsSrc); if (v.error) return { ok: false, stage: 'vertex', error: v.error };
      const f = compile(gl.FRAGMENT_SHADER, fsSrc); if (f.error) { gl.deleteShader(v.shader); return { ok: false, stage: 'fragment', error: f.error }; }
      const p = gl.createProgram();
      gl.attachShader(p, v.shader); gl.attachShader(p, f.shader);
      ATTRIBS.forEach((n, i) => gl.bindAttribLocation(p, i, n));
      gl.linkProgram(p);
      gl.deleteShader(v.shader); gl.deleteShader(f.shader);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { const log = gl.getProgramInfoLog(p); gl.deleteProgram(p); return { ok: false, stage: 'link', error: log }; }
      return { ok: true, program: new Program(gl, p) };
    }
    program(vs, fs) {
      const r = this.tryProgram(vs, fs);
      if (!r.ok) { console.error(`[Prism] ${r.stage} shader error:\n${r.error}`); throw new Error(r.error); }
      return r.program;
    }
    mesh(g, opts = {}) {
      const gl = this.gl, vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const bufs = [];
      const add = (data, loc, size) => {
        if (!data) return;
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, opts.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        bufs[loc] = b;
      };
      add(g.positions, 0, 3); add(g.normals, 1, 3); add(g.uvs, 2, 2); add(g.colors, 3, 3); add(g.extra, 4, 4);
      let ib = null, count = g.positions.length / 3, itype = 0;
      if (g.indices) {
        ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.indices, gl.STATIC_DRAW);
        count = g.indices.length; itype = g.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      }
      gl.bindVertexArray(null);
      const modes = { triangles: gl.TRIANGLES, lines: gl.LINES, points: gl.POINTS, strip: gl.TRIANGLE_STRIP, linestrip: gl.LINE_STRIP };
      return {
        vao, ib, bufs, count, itype, mode: modes[opts.mode || g.mode || 'triangles'], vertexCount: g.positions.length / 3,
        update: (loc, data) => { gl.bindBuffer(gl.ARRAY_BUFFER, bufs[loc]); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); },
      };
    }
    texture(src, opts = {}) {
      const gl = this.gl, t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      if (src && (src instanceof HTMLCanvasElement || src instanceof HTMLImageElement || src instanceof ImageData)) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opts.flipY !== false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      } else {
        const { width, height, data = null, internal = gl.RGBA8, format = gl.RGBA, type = gl.UNSIGNED_BYTE } = src;
        gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, data);
      }
      const filter = opts.filter || 'linear', wrap = opts.wrap || 'clamp';
      if (opts.mipmap) gl.generateMipmap(gl.TEXTURE_2D);
      this.setTexParams(t, filter, wrap, opts.mipmap);
      return t;
    }
    setTexParams(t, filter, wrap, mipmap, aniso) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, t);
      const W = { clamp: gl.CLAMP_TO_EDGE, repeat: gl.REPEAT, mirror: gl.MIRRORED_REPEAT }[wrap];
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, W); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, W);
      const mag = filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
      let min = mag;
      if (mipmap) min = filter === 'nearest' ? gl.NEAREST_MIPMAP_NEAREST : gl.LINEAR_MIPMAP_LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
      if (this.anisoExt) gl.texParameterf(gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, aniso || 1);
    }
    /** render target with color texture (+ depth) */
    target(w, h, opts = {}) {
      const gl = this.gl, R = this;
      const tgt = { w: 0, h: 0, fbo: gl.createFramebuffer(), tex: gl.createTexture(), depth: opts.depth !== false ? gl.createRenderbuffer() : null, opts };
      tgt.resize = (W, H) => {
        W = Math.max(1, W | 0); H = Math.max(1, H | 0);
        if (W === tgt.w && H === tgt.h) return;
        tgt.w = W; tgt.h = H;
        gl.bindTexture(gl.TEXTURE_2D, tgt.tex);
        const isF = opts.float && R.floatExt;
        gl.texImage2D(gl.TEXTURE_2D, 0, isF ? gl.RGBA32F : (opts.half && R.floatExt ? gl.RGBA16F : gl.RGBA8), W, H, 0, gl.RGBA, isF ? gl.FLOAT : (opts.half && R.floatExt ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE), null);
        const f = opts.filter === 'nearest' || isF ? gl.NEAREST : gl.LINEAR;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, tgt.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tgt.tex, 0);
        if (tgt.depth) {
          gl.bindRenderbuffer(gl.RENDERBUFFER, tgt.depth);
          gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, tgt.depth);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      };
      tgt.resize(w, h);
      return tgt;
    }
    bind(tgt) {
      const gl = this.gl; this.current = tgt || null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgt ? tgt.fbo : null);
      const w = tgt ? tgt.w : gl.drawingBufferWidth, h = tgt ? tgt.h : gl.drawingBufferHeight;
      gl.viewport(0, 0, w, h); this.width = w; this.height = h;
    }
    clear(r = 0, g = 0, b = 0, a = 1, depth = true) {
      const gl = this.gl; gl.clearColor(r, g, b, a);
      gl.clear(gl.COLOR_BUFFER_BIT | (depth ? gl.DEPTH_BUFFER_BIT : 0));
    }
    draw(mesh, prog, uniforms, count) {
      const gl = this.gl;
      gl.useProgram(prog.p); prog.set(uniforms || {});
      gl.bindVertexArray(mesh.vao);
      if (mesh.ib) gl.drawElements(mesh.mode, count ?? mesh.count, mesh.itype, 0);
      else gl.drawArrays(mesh.mode, 0, count ?? mesh.count);
      gl.bindVertexArray(null);
    }
    fullscreen(prog, uniforms) {
      const gl = this.gl, dt = gl.isEnabled(gl.DEPTH_TEST);
      gl.disable(gl.DEPTH_TEST); this.draw(this.quad, prog, uniforms); if (dt) gl.enable(gl.DEPTH_TEST);
    }
    blend(mode) {
      const gl = this.gl;
      if (!mode) { gl.disable(gl.BLEND); return; }
      gl.enable(gl.BLEND);
      if (mode === 'add') gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      else if (mode === 'alpha') gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else if (mode === 'premult') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  class Program {
    constructor(gl, p) {
      this.gl = gl; this.p = p; this.u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i), name = info.name.replace(/\[0\]$/, '');
        this.u[name] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
      }
    }
    has(name) { return !!this.u[name]; }
    set(vals) {
      const gl = this.gl; let unit = 0;
      for (const k in vals) {
        const u = this.u[k]; if (!u) continue;
        const v = vals[k], l = u.loc;
        switch (u.type) {
          case gl.FLOAT: u.size > 1 ? gl.uniform1fv(l, v) : gl.uniform1f(l, v); break;
          case gl.FLOAT_VEC2: gl.uniform2fv(l, v); break;
          case gl.FLOAT_VEC3: gl.uniform3fv(l, v); break;
          case gl.FLOAT_VEC4: gl.uniform4fv(l, v); break;
          case gl.FLOAT_MAT3: gl.uniformMatrix3fv(l, false, v); break;
          case gl.FLOAT_MAT4: gl.uniformMatrix4fv(l, false, v); break;
          case gl.INT: case gl.BOOL: u.size > 1 ? gl.uniform1iv(l, v) : gl.uniform1i(l, v | 0); break;
          case gl.SAMPLER_2D: gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v && v.tex ? v.tex : v); gl.uniform1i(l, unit); unit++; break;
        }
      }
    }
  }

  /* ============================ ORBIT CAMERA ============================ */
  class OrbitCamera {
    constructor(o = {}) {
      this.target = o.target || [0, 0, 0]; this.dist = o.dist || 6; this.theta = o.theta ?? 0.6; this.phi = o.phi ?? 1.1;
      this.fov = o.fov || 45 * PI / 180; this.near = o.near || 0.05; this.far = o.far || 200;
      this.minDist = o.minDist || 1.5; this.maxDist = o.maxDist || 40; this.minPhi = o.minPhi ?? 0.08; this.maxPhi = o.maxPhi ?? PI - 0.08;
      this.autoRotate = o.autoRotate || 0; this.vTheta = 0; this.vPhi = 0; this.dragging = false; this.tween = null; this.idle = 0;
      this.aspect = 1; this.enabled = true; this.fitAspect = o.fitAspect ?? 1.25;
    }
    attach(el) {
      let lx = 0, ly = 0, pid = null;
      el.addEventListener('pointerdown', (e) => {
        if (!this.enabled || (e.target.closest && e.target.closest('button, input, select, textarea, .no-orbit, a'))) return;
        pid = e.pointerId; this.dragging = true; lx = e.clientX; ly = e.clientY; this.tween = null;
        el.setPointerCapture?.(pid); el.classList.add('grabbing');
      });
      el.addEventListener('pointermove', (e) => {
        if (!this.dragging || e.pointerId !== pid) return;
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        this.vTheta = -dx * 0.006; this.vPhi = -dy * 0.006;
        this.theta += this.vTheta; this.phi = clamp(this.phi + this.vPhi, this.minPhi, this.maxPhi); this.idle = 0;
      });
      const up = () => { this.dragging = false; pid = null; el.classList.remove('grabbing'); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', (e) => { // trackpad pinch (ctrlKey) or ctrl/cmd + wheel zooms; plain wheel scrolls the page
        if (!this.enabled || !(e.ctrlKey || e.metaKey)) return;
        e.preventDefault(); this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.01), this.minDist, this.maxDist);
      }, { passive: false });
      return this;
    }
    zoom(f) { this.dist = clamp(this.dist * f, this.minDist, this.maxDist); }
    animateTo(o, dur = 1.2) {
      this.tween = { from: { target: [...this.target], dist: this.dist, theta: this.theta, phi: this.phi }, to: o, t: 0, dur };
      // shortest path for theta
      if (o.theta !== undefined) { let d = o.theta - this.theta; d = ((d + PI) % TAU + TAU) % TAU - PI; o.theta = this.theta + d; }
    }
    update(dt) {
      if (this.tween) {
        const tw = this.tween; tw.t += dt / tw.dur; const k = ease.inOut(Math.min(tw.t, 1));
        if (tw.to.target) this.target = v3.lerp(tw.from.target, tw.to.target, k);
        if (tw.to.dist !== undefined) this.dist = lerp(tw.from.dist, tw.to.dist, k);
        if (tw.to.theta !== undefined) this.theta = lerp(tw.from.theta, tw.to.theta, k);
        if (tw.to.phi !== undefined) this.phi = lerp(tw.from.phi, tw.to.phi, k);
        if (tw.t >= 1) this.tween = null;
      } else if (!this.dragging) {
        this.theta += this.vTheta; this.phi = clamp(this.phi + this.vPhi, this.minPhi, this.maxPhi);
        this.vTheta *= 0.92; this.vPhi *= 0.92; this.idle += dt;
        if (this.autoRotate && this.idle > 1.5) this.theta += this.autoRotate * dt;
      }
    }
    eye() {
      const s = Math.sin(this.phi);
      return [this.target[0] + this.dist * s * Math.sin(this.theta), this.target[1] + this.dist * Math.cos(this.phi), this.target[2] + this.dist * s * Math.cos(this.theta)];
    }
    view() { return m4.lookAt(this.eye(), this.target); }
    /** on narrow screens widen the vertical fov so the horizontal view stays the same as at `fitAspect` */
    proj(aspect) {
      this.aspect = aspect; let f = this.fov;
      if (aspect < this.fitAspect) f = Math.min(2.4, 2 * Math.atan(Math.tan(f / 2) * this.fitAspect / aspect));
      return m4.perspective(f, aspect, this.near, this.far);
    }
    matrices(aspect) { const v = this.view(), p = this.proj(aspect); return { view: v, proj: p, vp: m4.mul(p, v), eye: this.eye() }; }
  }

  /* ============================ LABELS ============================ */
  class Labels {
    constructor(container) {
      this.layer = document.createElement('div'); this.layer.className = 'labels3d';
      container.appendChild(this.layer); this.items = [];
    }
    add(html, pos, cls = '') {
      const el = document.createElement('div'); el.className = 'label3d ' + cls; el.innerHTML = html;
      this.layer.appendChild(el); const it = { el, pos, show: true }; this.items.push(it); return it;
    }
    clear() { this.layer.innerHTML = ''; this.items = []; }
    update(vp, w, h) {
      for (const it of this.items) {
        if (!it.show) { it.el.style.display = 'none'; continue; }
        const p = m4.xform(vp, [...it.pos, 1]);
        if (p[3] <= 0.01) { it.el.style.display = 'none'; continue; }
        const x = (p[0] / p[3] * 0.5 + 0.5) * w, y = (1 - (p[1] / p[3] * 0.5 + 0.5)) * h;
        it.el.style.display = '';
        it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    }
  }

  /* ============================ STAGE MANAGER ============================ */
  const stages = [];
  let live = [];
  const MAX_LIVE = 6;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const s = e.target.__stage; if (!s) continue;
      s.visible = e.isIntersecting;
      if (s.visible) { s.lastSeen = performance.now(); if (!s.gl) s.create(); }
    }
  }, { rootMargin: '250px 0px' });
  const ro = new ResizeObserver((entries) => { for (const e of entries) if (e.target.__stage) e.target.__stage.dirty = true; });

  class Stage {
    constructor(el, demo, opts = {}) {
      this.el = typeof el === 'string' ? document.querySelector(el) : el;
      this.demo = demo; this.opts = opts; this.gl = null; this.R = null; this.canvas = null;
      this.visible = false; this.time = 0; this.paused = false; this.dirty = true; this.lastSeen = 0;
      this.w = 1; this.h = 1; this.cssW = 1; this.cssH = 1; this.forceSize = null; this.frameCount = 0;
      this.mouse = { x: 0, y: 0, nx: 0.5, ny: 0.5, inside: false, down: false }; // css px & normalized (y up)
      this.el.__stage = this; this.el.classList.add('stage');
      const upd = (e) => {
        const r = this.el.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
        this.mouse.nx = this.mouse.x / r.width; this.mouse.ny = 1 - this.mouse.y / r.height;
      };
      this.el.addEventListener('pointermove', (e) => { upd(e); this.mouse.inside = true; this.mouse.moved = true; });
      this.el.addEventListener('pointerdown', (e) => { upd(e); this.mouse.down = true; });
      window.addEventListener('pointerup', () => { this.mouse.down = false; });
      this.el.addEventListener('pointerleave', () => { this.mouse.inside = false; });
      io.observe(this.el); ro.observe(this.el); stages.push(this);
    }
    create() {
      const c = document.createElement('canvas'); c.className = 'stage-canvas';
      this.el.prepend(c); this.canvas = c;
      const gl = c.getContext('webgl2', { antialias: this.opts.antialias !== false, alpha: !!this.opts.alpha, preserveDrawingBuffer: !!this.opts.preserve, premultipliedAlpha: true, powerPreference: 'high-performance' });
      if (!gl) { c.remove(); this.canvas = null; this.el.classList.add('no-webgl'); return; }
      this.gl = gl; this.dirty = true; this.resize();
      c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.drop(); });
      this.R = new Renderer(gl);
      try { this.demo.setup && this.demo.setup(this.R, this); this.failed = false; } catch (err) { console.error('Stage setup failed', err); this.failed = true; }
      live.push(this); live = live.filter((s) => s.gl);
      if (live.length > MAX_LIVE) {
        const victims = live.filter((s) => !s.visible).sort((a, b) => a.lastSeen - b.lastSeen);
        while (live.length > MAX_LIVE && victims.length) victims.shift().drop();
      }
    }
    drop() {
      if (!this.gl) return;
      const ext = this.gl.getExtension('WEBGL_lose_context');
      this.demo.teardown && this.demo.teardown(this);
      this.gl = null; this.R = null;
      try { ext && ext.loseContext(); } catch (e) { /* ignore */ }
      this.canvas && this.canvas.remove(); this.canvas = null;
      live = live.filter((s) => s !== this);
    }
    resize() {
      if (!this.canvas) return;
      const r = this.el.getBoundingClientRect();
      this.cssW = Math.max(1, r.width); this.cssH = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr || 2) * (this.opts.scale || 1);
      let w = Math.round(this.cssW * dpr), h = Math.round(this.cssH * dpr);
      if (this.forceSize) [w, h] = this.forceSize;
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.w = w; this.h = h; this.aspect = this.cssW / this.cssH; this.dirty = false;
      this.demo.resize && this.R && this.demo.resize(this.R, this);
    }
    refresh() { this.dirty = true; }
  }

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (document.hidden) return;
    for (const s of stages) {
      if (!s.visible || !s.gl || s.failed) continue;
      if (s.dirty) s.resize();
      if (!s.paused) s.time += dt;
      s.R.bind(null);
      try { s.demo.frame(s.R, s, s.time, s.paused ? 0 : dt); } catch (err) { console.error(err); s.failed = true; }
      s.frameCount++; s.mouse.moved = false;
    }
  }
  requestAnimationFrame(loop);

  Object.assign(SL, { v3, m4, geo, glsl, ease, clamp, lerp, hexToRgb, hsl, Renderer, Program, OrbitCamera, Labels, Stage, stages, PI, TAU });
  SL.stage = (el, demo, opts) => new Stage(el, demo, opts);
})();
