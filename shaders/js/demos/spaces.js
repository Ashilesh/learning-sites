/* LEVEL 04 — coordinate spaces morph + vertex shader playground */
(function () {
  'use strict';
  const { glsl, geo, m4, OrbitCamera, $, $$, fmt, hexToRgb } = SL;

  /* ============================ SPACES ============================ */
  const ASPECT = 16 / 9;
  const camEye = [2.6, 1.9, 3.2], camTarget = [0, 0.5, 0];
  const camV = m4.lookAt(camEye, camTarget), camP = m4.perspective(42 * Math.PI / 180, ASPECT, 2.0, 7.5);
  const NOTES = [
    ['Model space', 'The box exactly as its artist built it — centred on its <i>own</i> origin. The arrows are its local X / Y / Z.'],
    ['World space', 'The <b class="c-pink">model matrix</b> places, rotates & scales each object in the shared scene. Play with the sliders →'],
    ['View space', 'Now the <i>whole world</i> moves so the camera sits at (0,0,0) looking down −Z. From the camera’s point of view, nothing changed!'],
    ['Clip space → NDC', 'The projection matrix + divide by <code>w</code> squash the viewing pyramid into a 2×2×2 cube. Far things shrink. Anything outside is <b style="color:#ff4d5e">clipped</b>.'],
    ['Screen space', 'The cube is flattened & stretched onto your viewport: x,y become <b>pixel</b> coordinates, z is kept for the depth test.'],
  ];
  const GOD = [
    { target: [0, 0.3, 0], dist: 7, theta: 0.6, phi: 1.05 },
    { target: [0.6, 0.6, 0.6], dist: 15, theta: 0.75, phi: 1.0 },
    { target: [0, 0.3, -3.6], dist: 15, theta: 1.0, phi: 1.05 },
    { target: [0, 0, 0], dist: 10.5, theta: 0.7, phi: 1.1 },
    { target: [0, 0, 0], dist: 9.5, theta: 0.12, phi: 1.45 },
  ];
  const VS = glsl.vs(`in vec3 a_position; in vec3 a_normal; in vec3 a_color;
uniform mat4 u_model, u_camV, u_camP, u_view, u_proj;
uniform vec4 u_s; uniform float u_isWorld;
out vec3 v_n; out vec3 v_c; out vec3 v_ndc;
void main(){
  vec4 world = u_model * vec4(a_position, 1.0);
  vec3 local = u_isWorld > 0.5 ? world.xyz : a_position;
  vec3 viewP = (u_camV * world).xyz;
  vec4 clip = u_camP * vec4(viewP, 1.0);
  float w = max(clip.w, 0.05);
  vec3 ndc = clip.xyz / w;
  v_ndc = ndc;
  vec3 ndcD = vec3(ndc.xy, -ndc.z) * 2.0;
  vec3 scr = vec3(ndc.x * 2.0 * ${ASPECT.toFixed(4)}, ndc.y * 2.0, -ndc.z * 0.12);
  vec3 p = mix(local, world.xyz, u_s.x);
  p = mix(p, viewP, u_s.y);
  p = mix(p, ndcD, u_s.z);
  p = mix(p, scr, u_s.w);
  v_n = mat3(u_model) * a_normal; v_c = a_color;
  gl_Position = u_proj * u_view * vec4(p, 1.0);
}`);
  const FS = glsl.fs(`in vec3 v_n; in vec3 v_c; in vec3 v_ndc;
uniform vec3 u_color; uniform float u_alpha, u_lit, u_clip, u_vcol;
out vec4 fragColor;
void main(){
  vec3 base = u_vcol > 0.5 ? v_c : u_color;
  vec3 col = base;
  if (u_lit > 0.5) { vec3 n = normalize(v_n); if (!gl_FrontFacing) n = -n; col = base * (0.35 + 0.75 * max(dot(n, normalize(vec3(0.5, 0.9, 0.4))), 0.0)); }
  float outside = step(1.0, max(max(abs(v_ndc.x), abs(v_ndc.y)), abs(v_ndc.z)));
  float k = outside * u_clip;
  col = mix(col, vec3(1.0, 0.18, 0.3), k * 0.85);
  fragColor = vec4(col, u_alpha * mix(1.0, 0.45, k));
}`);

  const box = { tx: -0.6, ty: 0.6, ry: 0.6, s: 1 };
  const boxModel = () => m4.mulAll(m4.translation(box.tx, box.ty, 0), m4.rotY(box.ry), m4.scaling(box.s * 0.9));
  const others = [
    { g: geo.sphere(0.5, 32, 18), m: m4.translation(1.3, 0.5, -1.2), c: '#22e4ff' },
    { g: geo.torus(0.45, 0.18, 16, 32), m: m4.mulAll(m4.translation(-1.1, 0.55, -2.6), m4.rotX(0.4)), c: '#ffd23f' },
    { g: geo.cylinder(0, 0.45, 1.0, 24), m: m4.translation(-2.5, 0.5, 2.0), c: '#7cff6b' },
  ];
  // frustum corners (world) from NDC cube
  const invVP = m4.invert(m4.mul(camP, camV));
  const corner = (x, y, z) => m4.xformPoint(invVP, [x, y, z]);
  const fr = { n: [corner(-1, -1, -1), corner(1, -1, -1), corner(1, 1, -1), corner(-1, 1, -1)], f: [corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1)] };
  const frLines = [];
  for (let i = 0; i < 4; i++) { frLines.push(fr.n[i], fr.n[(i + 1) % 4], fr.f[i], fr.f[(i + 1) % 4], fr.n[i], fr.f[i]); }
  const apexLines = []; for (let i = 0; i < 4; i++) apexLines.push(camEye, fr.n[i]);
  const camModel = (() => { // little camera body facing the target
    const inv = m4.invert(camV);
    return geo.merge([{ geo: geo.box(0.5, 0.36, 0.42), matrix: m4.mul(inv, m4.translation(0, 0, 0.25)), color: [0.95, 0.95, 1] }, { geo: geo.cylinder(0.12, 0.17, 0.25, 16), matrix: m4.mulAll(inv, m4.translation(0, 0, -0.08), m4.rotX(Math.PI / 2)), color: [0.3, 0.3, 0.4] }]);
  })();
  const axes = geo.lines([[0, 0, 0], [1.1, 0, 0], [0, 0, 0], [0, 1.1, 0], [0, 0, 0], [0, 0, 1.1]], [[1, 0.25, 0.3], [1, 0.25, 0.3], [0.4, 1, 0.4], [0.4, 1, 0.4], [0.3, 0.6, 1], [0.3, 0.6, 1]]);
  const cubeLines = (() => { const L = [], c = [-2, 2]; for (const a of c) for (const b of c) { L.push([a, b, -2], [a, b, 2], [a, -2, b], [a, 2, b], [-2, a, b], [2, a, b]); } return geo.lines(L); })();
  const screenLines = (() => { const L = [], W = 2 * ASPECT * 2, H = 4; for (let i = 0; i <= 32; i++) { const x = -W / 2 + W * i / 32; L.push([x, -H / 2, -0.13], [x, H / 2, -0.13]); } for (let j = 0; j <= 18; j++) { const y = -H / 2 + H * j / 18; L.push([-W / 2, y, -0.13], [W / 2, y, -0.13]); } return geo.lines(L); })();

  const cam = new OrbitCamera({ ...GOD[0], minDist: 3, maxDist: 30 });
  let space = 0; const s = [0, 0, 0, 0], sTarget = [0, 0, 0, 0];
  let P, meshes = {};
  const stageEl = $('#spaces-stage'), insetLabel = $('.inset-label', stageEl);

  function renderMatrix() {
    const m = boxModel();
    $('#sp-matrix').innerHTML = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => `<span class="${r === 3 ? 'fx' : c === 3 ? 'tr' : 'rs'}">${fmt(m[c * 4 + r])}</span>`).join('')).join('');
  }
  ['tx', 'ty', 'ry', 's'].forEach((k) => SL.slider('#sp-' + k, (v) => { box[k] = v; renderMatrix(); }, (v) => v.toFixed(2)));
  $$('#sp-tx, #sp-ty, #sp-ry, #sp-s').forEach((el) => el.addEventListener('input', () => SL.xp.award('sp-matrix', 15, 'for building a model matrix'), { once: true }));

  const chain = SL.tabs('#space-chain', (v) => {
    space = +v; for (let i = 0; i < 4; i++) sTarget[i] = i < space ? 1 : 0;
    $('#space-note').innerHTML = `<b>${NOTES[space][0]}</b>${NOTES[space][1]}`;
    cam.animateTo({ ...GOD[space], target: [...GOD[space].target] }, 1.6);
    const on = [['m-x'], ['m-m', 'm-x'], ['m-v', 'm-m', 'm-x'], ['m-p', 'm-v', 'm-m', 'm-x'], ['m-p', 'm-v', 'm-m', 'm-x']][space];
    $$('.equation span').forEach((e) => e.classList.toggle('on', on.some((c) => e.classList.contains(c))));
    if (space === 4) SL.xp.award('spaces-all', 25, 'for travelling all the way to screen space');
  });
  chain.set('1');

  SL.stage(stageEl, {
    setup(R, st) {
      P = R.program(VS, FS);
      meshes.box = R.mesh(geo.box(1, 1, 1));
      meshes.others = others.map((o) => R.mesh(o.g));
      meshes.frustum = R.mesh(geo.lines(frLines)); meshes.apex = R.mesh(geo.lines(apexLines));
      meshes.cam = R.mesh(camModel); meshes.axes = R.mesh(axes); meshes.grid = R.mesh(geo.grid(10, 20));
      meshes.cube = R.mesh(cubeLines); meshes.screen = R.mesh(screenLines);
      if (!st.inited) { cam.attach(st.el); renderMatrix(); st.inited = true; }
    },
    frame(R, st, t, dt) {
      const gl = R.gl;
      cam.update(dt);
      // morph stages one after another
      for (let i = 0; i < 4; i++) {
        const prevDone = i === 0 || Math.abs(s[i - 1] - sTarget[i - 1]) < 0.02;
        const nextIdle = i === 3 || Math.abs(s[i + 1] - sTarget[i + 1]) < 0.02;
        if (sTarget[i] > s[i] && prevDone) s[i] = Math.min(sTarget[i], s[i] + dt * 0.9);
        if (sTarget[i] < s[i] && nextIdle) s[i] = Math.max(sTarget[i], s[i] - dt * 0.9);
      }
      const e = s.map((x) => SL.ease.inOut(x));
      const { view, proj } = cam.matrices(st.aspect);
      R.clear(0.03, 0.02, 0.06, 1);
      const base = { u_camV: camV, u_camP: camP, u_view: view, u_proj: proj, u_s: e, u_isWorld: 0, u_alpha: 1, u_lit: 1, u_clip: e[2] * 0.5 + e[2] * e[2] * 0.5, u_vcol: 0 };
      R.blend('alpha');
      const draw = (mesh, u) => { if ((u.u_alpha ?? 1) > 0.01) R.draw(mesh, P, { ...base, ...u }); };
      // world-only helpers
      gl.depthMask(false);
      draw(meshes.grid, { u_model: m4.identity(), u_isWorld: 1, u_color: [0.5, 0.4, 0.9], u_lit: 0, u_alpha: 0.35 * e[0] * (1 - e[1]), u_clip: 0 });
      draw(meshes.axes, { u_model: boxModel(), u_vcol: 1, u_lit: 0, u_alpha: 1 - e[1] * 0.8, u_clip: 0 });
      draw(meshes.frustum, { u_model: m4.identity(), u_isWorld: 1, u_color: [1, 0.82, 0.25], u_lit: 0, u_alpha: 0.9 * e[0] * (1 - e[3]), u_clip: 0 });
      draw(meshes.apex, { u_model: m4.identity(), u_isWorld: 1, u_color: [1, 0.82, 0.25], u_lit: 0, u_alpha: 0.5 * e[0] * (1 - e[2]), u_clip: 0 });
      draw(meshes.cube, { u_model: m4.identity(), u_isWorld: 1, u_color: [0.3, 0.9, 1], u_lit: 0, u_alpha: e[2] * (1 - e[3]) * 0.9, u_s: [0, 0, 0, 0], u_clip: 0 });
      draw(meshes.screen, { u_model: m4.identity(), u_isWorld: 1, u_color: [0.3, 0.9, 1], u_lit: 0, u_alpha: e[3] * 0.35, u_s: [0, 0, 0, 0], u_clip: 0 });
      gl.depthMask(true);
      draw(meshes.cam, { u_model: m4.identity(), u_isWorld: 1, u_vcol: 1, u_alpha: e[0] * (1 - e[2]), u_clip: 0 });
      draw(meshes.box, { u_model: boxModel(), u_color: hexToRgb('#ff3d9a') });
      others.forEach((o, i) => draw(meshes.others[i], { u_model: o.m, u_color: hexToRgb(o.c), u_alpha: e[0] }));
      R.blend(null);
      // inset: what the camera actually sees
      const iw = Math.round(st.w * 0.3), ih = Math.round(iw / ASPECT), pad = Math.round(14 * st.h / st.cssH);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(st.w - iw - pad - 2, pad - 2, iw + 4, ih + 4); R.clear(1, 0.82, 0.25, 1);
      gl.scissor(st.w - iw - pad, pad, iw, ih); gl.viewport(st.w - iw - pad, pad, iw, ih); R.clear(0.06, 0.04, 0.12, 1);
      const inset = { ...base, u_view: camV, u_proj: camP, u_s: [1, 0, 0, 0], u_clip: 0 };
      R.blend('alpha'); gl.depthMask(false);
      R.draw(meshes.grid, P, { ...inset, u_model: m4.identity(), u_isWorld: 1, u_color: [0.5, 0.4, 0.9], u_lit: 0, u_alpha: 0.4 });
      gl.depthMask(true); R.blend(null);
      R.draw(meshes.box, P, { ...inset, u_model: boxModel(), u_color: hexToRgb('#ff3d9a') });
      others.forEach((o, i) => R.draw(meshes.others[i], P, { ...inset, u_model: o.m, u_color: hexToRgb(o.c) }));
      gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, st.w, st.h);
      insetLabel.style.bottom = (ih / (st.h / st.cssH) + 22) + 'px';
    },
  });

  /* ============================ VERTEX PLAYGROUND ============================ */
  const PRESETS = {
    '🌊 wave': { shape: 'sphere', code: `vec3 displace(vec3 p, vec3 n, vec2 uv) {
  // push each vertex along its normal
  float wave = sin(p.y * 8.0 + u_time * 3.0);
  return p + n * 0.15 * wave;
}` },
    '🌀 twist': { shape: 'torus', code: `vec3 displace(vec3 p, vec3 n, vec2 uv) {
  // spin around the X axis by an angle that depends on x
  float angle = p.x * 1.2 * sin(u_time);
  float c = cos(angle), s = sin(angle);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}` },
    '🫁 breathe': { shape: 'sphere', code: `vec3 displace(vec3 p, vec3 n, vec2 uv) {
  float pulse = 0.5 + 0.5 * sin(u_time * 2.0);
  return p * (0.8 + 0.3 * pulse);
}` },
    '🦔 spikes': { shape: 'sphere', code: `vec3 displace(vec3 p, vec3 n, vec2 uv) {
  float spikes = pow(abs(sin(uv.x * 40.0) * sin(uv.y * 30.0)), 8.0);
  return p + n * spikes * (0.35 + 0.2 * sin(u_time * 2.0));
}` },
    '🫧 blob': { shape: 'sphere', code: `vec3 displace(vec3 p, vec3 n, vec2 uv) {
  float b = sin(p.x * 3.0 + u_time)
          * sin(p.y * 4.0 + u_time * 1.3)
          * sin(p.z * 3.5 + u_time * 0.7);
  return p + n * b * 0.35;
}` },
    '🫠 melt': { shape: 'sphere', code: `vec3 displace(vec3 p, vec3 n, vec2 uv) {
  float melt = smoothstep(0.6, -1.0, p.y) * (0.5 + 0.5 * sin(u_time));
  p.xz *= 1.0 + melt * 0.8;
  p.y -= melt * 0.45 + 0.04 * sin(p.x * 12.0 + u_time * 4.0) * melt;
  return p;
}` },
    '🚩 flag': { shape: 'plane', code: `vec3 displace(vec3 p, vec3 n, vec2 uv) {
  // the left edge (uv.x = 0) is tied to the pole
  float wind = sin(p.x * 3.0 - u_time * 4.0) + 0.5 * sin(p.z * 5.0 - u_time * 2.5);
  return p + n * wind * 0.13 * uv.x;
}` },
  };
  const HEAD = `in vec3 a_position; in vec3 a_normal; in vec2 a_uv;
uniform mat4 u_model, u_view, u_proj; uniform float u_time;
out vec3 v_world; out vec2 v_uv; out float v_h;
`;
  const TAIL = `
void main(){
  vec3 p = displace(a_position, a_normal, a_uv);
  v_h = dot(p - a_position, a_normal);
  vec4 w = u_model * vec4(p, 1.0);
  v_world = w.xyz; v_uv = a_uv;
  gl_Position = u_proj * u_view * w;
}`;
  const VFS = glsl.fs(`in vec3 v_world; in vec2 v_uv; in float v_h; uniform vec3 u_eye; uniform float u_wire; out vec4 fragColor;
void main(){
  if (u_wire > 0.5) { fragColor = vec4(1.0, 1.0, 1.0, 0.28); return; }
  vec3 n = normalize(cross(dFdx(v_world), dFdy(v_world)));
  vec3 v = normalize(u_eye - v_world); if (dot(n, v) < 0.0) n = -n;
  vec3 l = normalize(vec3(0.5, 0.9, 0.4));
  vec3 base = 0.5 + 0.5 * cos(6.2831 * (v_h * 1.8 + v_uv.x * 0.6 + vec3(0.0, 0.33, 0.67)));
  vec3 col = base * (0.25 + 0.8 * max(dot(n, l), 0.0)) + pow(max(dot(n, normalize(l + v)), 0.0), 50.0) * 0.5;
  col += pow(1.0 - max(dot(n, v), 0.0), 3.0) * vec3(0.6, 0.3, 1.0) * 0.6;
  fragColor = vec4(col, 1.0);
}`);
  const SHAPES = {
    sphere: () => geo.sphere(1, 96, 64),
    plane: () => { const g = geo.plane(3, 2, 72, 48); return g; },
    torus: () => geo.torus(1, 0.42, 48, 120),
  };
  const vcam = new OrbitCamera({ dist: 4.2, theta: 0.5, phi: 1.2, autoRotate: 0.25, minDist: 2, maxDist: 9 });
  let vShape = 'sphere', vWire = false, vProg = null, vR = null, vMeshes = {}, vCode = PRESETS['🌊 wave'].code;
  const lineOffset = HEAD.split('\n').length + 1; // + version/precision lines (glsl.vs adds 2) - 1
  const editor = new SL.Editor($('#vp-editor'), { code: vCode, onChange: (c) => { vCode = c; compileV(); } });
  function compileV() {
    if (!vR) return;
    const r = vR.tryProgram(glsl.vs(HEAD + vCode + TAIL), VFS);
    if (r.ok) { vProg = r.program; editor.setErrors(null); }
    else editor.setErrors(r.error, lineOffset);
  }
  let edits = 0;
  editor.ta.addEventListener('input', () => { if (++edits === 3) SL.xp.award('vp-edit', 25, 'for writing your own vertex shader'); });
  $('#vp-presets').innerHTML = Object.keys(PRESETS).map((k) => `<button data-v="${k}">${k}</button>`).join('');
  const shapeTabs = SL.tabs('#vp-shape', (v) => { vShape = v; });
  shapeTabs.set('sphere', false);
  SL.tabs('#vp-presets', (k) => { editor.value = PRESETS[k].code; shapeTabs.set(PRESETS[k].shape); }, '🌊 wave');
  $('#vp-wire').addEventListener('change', (e) => { vWire = e.target.checked; });

  SL.stage('#vp-stage', {
    setup(R, st) {
      vR = R; vMeshes = {};
      for (const k in SHAPES) { const g = SHAPES[k](); vMeshes[k] = { solid: R.mesh(g), wire: R.mesh(geo.edges(g)) }; }
      compileV();
      if (!st.inited) { vcam.attach(st.el); st.inited = true; }
    },
    frame(R, st, t, dt) {
      vcam.update(dt);
      const { view, proj, eye } = vcam.matrices(st.aspect);
      R.clear(0.03, 0.02, 0.06, 1);
      if (!vProg) return;
      const model = vShape === 'plane' ? m4.rotX(Math.PI / 2) : vShape === 'torus' ? m4.rotX(-1.2) : m4.identity();
      const U = { u_model: model, u_view: view, u_proj: proj, u_time: t, u_eye: eye, u_wire: 0 };
      R.draw(vMeshes[vShape].solid, vProg, U);
      if (vWire) { R.blend('alpha'); R.gl.depthMask(false); R.draw(vMeshes[vShape].wire, vProg, { ...U, u_wire: 1 }); R.gl.depthMask(true); R.blend(null); }
    },
    teardown() { vR = null; vProg = null; },
  });
})();
