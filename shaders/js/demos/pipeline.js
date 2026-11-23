/* LEVEL 03 — The graphics pipeline, step by step (3D) + rasterization playground (2D) */
(function () {
  'use strict';
  const { glsl, geo, m4, OrbitCamera, $, $$, fmt } = SL;

  /* ============================ 3D PIPELINE ============================ */
  const STAGES = [
    { ico: '📦', name: 'Vertex data', prog: false, title: 'Vertex data', text: 'A 3D model is just a list of <b>vertices</b> (corners). Each vertex is a bundle of numbers: position, normal, UV… stored in a buffer in VRAM.',
      code: `// one vertex = a little bundle of numbers
//   x     y     z  |  nx   ny   nz  |  u    v
  1.45, 0.00, 0.00,  1.0, 0.0, 0.0,  0.0, 0.0,
  1.32, 0.00, 0.37,  0.7, 0.0, 0.7,  0.0, 0.1,
  ... ×153 vertices` },
    { ico: '✏️', name: 'Vertex shader', prog: true, title: 'Vertex shader', text: 'Runs <b>once per vertex</b>. Its job: output <code>gl_Position</code> — where this corner lands on screen. It can also bend & wiggle the shape!',
      code: `in vec3 a_position;
in vec3 a_normal;
uniform mat4 u_proj, u_view, u_model;
uniform float u_time;
void main() {
  vec3 p = a_position;
  p += a_normal * 0.12 * sin(u_time * 3.0 + p.x * 4.0);
  gl_Position = u_proj * u_view * u_model * vec4(p, 1.0);
}` },
    { ico: '🔺', name: 'Primitive assembly', prog: false, title: 'Primitive assembly', text: 'Vertices get grouped into <b>triangles</b> (every 3 indices = 1 triangle). Triangles facing away can be <i>culled</i>; parts outside the screen get <i>clipped</i>.', code: '' },
    { ico: '▦', name: 'Rasterization', prog: false, title: 'Rasterization', text: 'The rasterizer lays a <b>pixel grid</b> over each triangle and asks every pixel centre: “am I inside?”. Each “yes” becomes a <b>fragment</b> — a pixel-to-be.', code: '' },
    { ico: '✏️', name: 'Fragment shader', prog: true, title: 'Fragment shader', text: 'Runs <b>once per fragment</b> and decides its colour — lighting, textures, anything. Slide the resolution up to see pixels become a smooth image!',
      code: `in vec3 v_normal;
uniform vec3 u_lightDir;
out vec4 fragColor;
void main() {
  vec3 n = normalize(v_normal);
  float light = max(dot(n, u_lightDir), 0.0);
  vec3 base = 0.5 + 0.5 * n;   // colour from the normal
  fragColor = vec4(base * (0.25 + 0.85 * light), 1.0);
}` },
    { ico: '🧪', name: 'Tests & blending', prog: false, title: 'Depth test & blending', text: 'Each pixel remembers <b>how far away</b> its colour is (the depth buffer, left: white = near). A new fragment only wins if it’s closer — that’s how the box pokes <i>through</i> the donut correctly.',
      code: `gl.enable(gl.DEPTH_TEST);  // fixed hardware:
gl.depthFunc(gl.LESS);     // you only flip switches
gl.enable(gl.BLEND);       // for see-through stuff` },
    { ico: '🖼', name: 'Framebuffer', prog: false, title: 'Framebuffer → screen', text: 'The finished image sits in the <b>framebuffer</b>. When the frame is done the GPU swaps it to the screen (double buffering) — and immediately starts the next one.', code: '' },
  ];
  const bar = $('#pipe-bar');
  bar.innerHTML = STAGES.map((s, i) => `<button class="pipe-st ${s.prog ? 'prog' : ''}" data-i="${i}"><span class="ps-ico">${s.ico}</span><b>${s.name}</b><small>${s.prog ? '✏️ YOU WRITE IT' : '⚙ FIXED HW'}</small></button>`).join('');

  const VS = glsl.vs(`in vec3 a_position; in vec3 a_normal; in vec3 a_color; in vec4 a_extra;
uniform mat4 u_model, u_rest, u_view, u_proj; uniform float u_time, u_wave, u_morph, u_size, u_lineMode;
out vec3 v_color; out vec3 v_normal; out vec3 v_world; out vec4 v_extra;
void main(){
  vec3 p = a_position;
  vec3 moved = p + a_normal * u_wave * 0.12 * sin(u_time * 3.0 + p.x * 4.0);
  vec3 a = (u_rest * vec4(p, 1.0)).xyz;
  vec3 b = (u_model * vec4(moved, 1.0)).xyz;
  float k = u_lineMode > 0.5 ? a_extra.x * u_morph : u_morph;
  vec3 w = mix(a, b, k);
  v_world = w; v_color = a_color; v_extra = a_extra;
  v_normal = mat3(u_model) * a_normal;
  gl_Position = u_proj * u_view * vec4(w, 1.0);
  gl_PointSize = u_size;
}`);
  const FS_POINT = glsl.fs(`in vec3 v_color; uniform float u_alpha; out vec4 fragColor;
void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float rim = smoothstep(0.32, 0.5, d);
  fragColor = vec4(mix(v_color, vec3(1.0), rim * 0.6), u_alpha); }`);
  const FS_FLAT = glsl.fs(`in vec3 v_color; in vec3 v_normal; in vec4 v_extra; uniform float u_progress; uniform float u_alpha; uniform float u_unlit; out vec4 fragColor;
void main(){ if (v_extra.y > u_progress) discard;
  float l = max(dot(normalize(v_normal), normalize(vec3(0.4, 0.8, 0.6))), 0.0);
  vec3 c = u_unlit > 0.5 ? v_color : v_color * (0.45 + 0.65 * l);
  fragColor = vec4(c, u_alpha); }`);
  const FS_LIT = glsl.fs(`in vec3 v_normal; in vec3 v_world; uniform vec3 u_eye; uniform float u_fancy; out vec4 fragColor;
void main(){
  vec3 n = normalize(v_normal); if (!gl_FrontFacing) n = -n;
  vec3 l = normalize(vec3(0.4, 0.8, 0.6));
  float light = max(dot(n, l), 0.0);
  vec3 base = 0.5 + 0.5 * n;
  vec3 col = base * (0.25 + 0.85 * light);
  if (u_fancy > 0.5) {
    vec3 v = normalize(u_eye - v_world);
    col += pow(max(dot(n, normalize(l + v)), 0.0), 60.0) * 0.8;
    col += pow(1.0 - max(dot(n, v), 0.0), 3.0) * vec3(1.0, 0.3, 0.8) * 0.7;
  }
  fragColor = vec4(col, 1.0);
}`);
  const FS_DEPTH = glsl.fs(`uniform float u_near, u_far; out vec4 fragColor;
void main(){ float z = gl_FragCoord.z * 2.0 - 1.0; float lin = (2.0 * u_near * u_far) / (u_far + u_near - z * (u_far - u_near));
  float d = 1.0 - clamp((lin - 4.2) / 3.2, 0.0, 1.0); fragColor = vec4(vec3(d), 1.0); }`);
  const FS_LINE = glsl.fs(`uniform vec3 u_color; uniform float u_alpha; out vec4 fragColor; void main(){ fragColor = vec4(u_color, u_alpha); }`);
  const FS_SHOW = glsl.fs(`in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_res; uniform float u_grid; out vec4 fragColor;
void main(){
  vec4 c = texture(u_tex, v_uv);
  vec2 g = v_uv * u_res;
  vec2 d = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1.0 - min(min(d.x, d.y), 1.0);
  vec3 bg = vec3(0.03, 0.02, 0.06) + 0.025;
  vec3 col = mix(bg, c.rgb, c.a);
  float dotc = smoothstep(0.13, 0.08, length(fract(g) - 0.5));
  col = mix(col, c.a > 0.5 ? vec3(1.0) : vec3(0.25, 0.22, 0.35), dotc * u_grid * 0.85 * step(14.0, 1.0 / max(fwidth(g.x), 1e-4)));
  col = mix(col, vec3(0.0), line * u_grid * 0.6);
  fragColor = vec4(col, 1.0);
}`);
  const FS_BG = glsl.fs(`in vec2 v_uv; out vec4 fragColor; void main(){ vec3 c = mix(vec3(0.05,0.02,0.12), vec3(0.16,0.04,0.2), v_uv.y); c += vec3(0.4,0.1,0.5) * pow(1.0 - length(v_uv - vec2(0.5, 0.6)), 4.0); fragColor = vec4(c, 1.0); }`);

  const cam = new OrbitCamera({ dist: 5.8, theta: 0.3, phi: 1.05, minDist: 3, maxDist: 12 });
  let stage = 0, stageT = 0, auto = false, autoT = 0, res = 48;
  let P = {}, M = {}, lowRT;
  const baseGeo = geo.torus(1, 0.45, 8, 16);
  const nV = baseGeo.positions.length / 3;
  baseGeo.colors = new Float32Array(nV * 3);
  for (let i = 0; i < nV; i++) baseGeo.colors.set(SL.hsl((i / nV * 2.3) % 1, 1, 0.62), i * 3);
  const flatGeo = geo.flat(baseGeo, (t, n) => SL.hsl((t / n * 3.1 + 0.05) % 1, 0.85, 0.6));
  const edgeGeo = geo.edges(baseGeo);
  // rest→moved connector lines: each vertex twice (extra.x = 0 / 1)
  const conn = { positions: new Float32Array(nV * 6), normals: new Float32Array(nV * 6), colors: new Float32Array(nV * 6), extra: new Float32Array(nV * 8), mode: 'lines' };
  for (let i = 0; i < nV; i++) for (let e = 0; e < 2; e++) {
    conn.positions.set(baseGeo.positions.subarray(i * 3, i * 3 + 3), (i * 2 + e) * 3);
    conn.normals.set(baseGeo.normals.subarray(i * 3, i * 3 + 3), (i * 2 + e) * 3);
    conn.colors.set(baseGeo.colors.subarray(i * 3, i * 3 + 3), (i * 2 + e) * 3);
    conn.extra.set([e, 0, 0, 0], (i * 2 + e) * 4);
  }
  const stageEl = $('#pipe-stage');
  const split = document.createElement('div');
  split.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:2px;background:#fff;box-shadow:0 0 12px #fff;z-index:3;display:none;pointer-events:none';
  split.innerHTML = '<span style="position:absolute;bottom:14px;right:10px;font:11px Silkscreen,monospace;white-space:nowrap;background:#000a;padding:3px 6px;border-radius:5px">depth buffer</span><span style="position:absolute;bottom:14px;left:10px;font:11px Silkscreen,monospace;white-space:nowrap;background:#000a;padding:3px 6px;border-radius:5px">colour buffer</span>';
  stageEl.appendChild(split);

  function setStage(i) {
    stage = (i + STAGES.length) % STAGES.length; stageT = 0; const s = STAGES[stage];
    $$('.pipe-st', bar).forEach((b, k) => { b.classList.toggle('active', k === stage); b.classList.toggle('done', k < stage); });
    const kind = $('#pipe-kind'); kind.textContent = s.prog ? '✏️ PROGRAMMABLE — A SHADER YOU WRITE' : '⚙ FIXED-FUNCTION HARDWARE'; kind.classList.toggle('prog', s.prog);
    $('#pipe-title').textContent = `${stage + 1}. ${s.title}`; $('#pipe-text').innerHTML = s.text;
    const pre = $('#pipe-code'); if (s.code) SL.renderCode(pre, s.code); else pre.innerHTML = '';
    split.style.display = stage === 5 ? 'block' : 'none';
    const ex = $('#pipe-extra');
    if (stage === 0) {
      const rows = [0, 1, 2, 17].map((k) => { const p = baseGeo.positions, n = baseGeo.normals, u = baseGeo.uvs;
        return `<div>#${k}: <span>pos</span>(${fmt(p[k * 3])}, ${fmt(p[k * 3 + 1])}, ${fmt(p[k * 3 + 2])}) <span>uv</span>(${fmt(u[k * 2])}, ${fmt(u[k * 2 + 1])})</div>`; }).join('');
      ex.innerHTML = `<div class="vtable"><b>Vertex buffer</b> (${nV} vertices)${rows}<div>…</div></div>`;
    } else if (stage === 3 || stage === 4) {
      ex.innerHTML = `<div class="resbox"><label class="ctl">pixels across <input type="range" id="pipe-res" min="12" max="200" value="${res}"><output></output></label></div>`;
      SL.slider('#pipe-res', (v) => { res = v; if (v >= 120 && stage === 4) SL.xp.award('pipe-res', 15, 'for sharpening the pixels'); }, (v) => (v >= 200 ? 'full' : v));
    } else if (stage === 6) {
      ex.innerHTML = `<div class="resbox" style="font-size:13px">🔁 <b>front buffer</b> → on screen<br>✏️ <b>back buffer</b> → being drawn<br><span class="c-yellow">…swap! 60–240× per second</span></div>`;
    } else ex.innerHTML = '';
    if (stage === STAGES.length - 1) SL.xp.award('pipeline-all', 25, 'for riding the whole pipeline');
  }
  $$('.pipe-st', bar).forEach((b) => b.addEventListener('click', () => { auto = false; updAuto(); setStage(+b.dataset.i); }));
  const updAuto = () => { $('#pipe-auto').textContent = auto ? '⏸ pause' : '⏵ autoplay'; };
  $('#pipe-prev').addEventListener('click', () => { auto = false; updAuto(); setStage(stage - 1); });
  $('#pipe-next').addEventListener('click', () => { auto = false; updAuto(); setStage(stage + 1); });
  $('#pipe-auto').addEventListener('click', () => { auto = !auto; autoT = 0; updAuto(); });
  setStage(0);

  SL.stage(stageEl, {
    setup(R, st) {
      P.pt = R.program(VS, FS_POINT); P.flat = R.program(VS, FS_FLAT); P.lit = R.program(VS, FS_LIT); P.depth = R.program(VS, FS_DEPTH);
      P.line = R.program(VS, FS_LINE); P.show = R.program(glsl.fullscreenVS, FS_SHOW); P.bg = R.program(glsl.fullscreenVS, FS_BG);
      M.points = R.mesh({ positions: baseGeo.positions, normals: baseGeo.normals, colors: baseGeo.colors }, { mode: 'points' });
      M.solid = R.mesh(baseGeo); M.flat = R.mesh(flatGeo); M.edges = R.mesh(edgeGeo); M.conn = R.mesh(conn);
      M.cube = R.mesh(geo.box(0.9, 0.9, 0.9));
      lowRT = R.target(64, 40, { filter: 'nearest' });
      if (!st.inited) { cam.attach(st.el); st.inited = true; }
    },
    frame(R, st, t, dt) {
      const gl = R.gl;
      cam.update(dt); stageT += dt;
      if (auto) { autoT += dt; if (autoT > 6) { autoT = 0; setStage(stage + 1); } }
      const { view, proj, eye } = cam.matrices(st.aspect);
      if (st.aspect > 1.25) proj[8] = 0.32; // lens shift: push the model left, away from the info panel
      const rot = m4.mulAll(m4.rotY(t * 0.25), m4.rotX(0.45));
      const U = { u_view: view, u_proj: proj, u_model: rot, u_rest: rot, u_time: t, u_wave: 0, u_morph: 1, u_size: 9 * (st.h / st.cssH), u_lineMode: 0, u_alpha: 1, u_progress: 2, u_eye: eye, u_unlit: 0, u_fancy: 0, u_color: [1, 1, 1] };
      R.clear(0.03, 0.02, 0.06, 1);
      if (stage === 0) {
        R.draw(M.points, P.pt, U);
      } else if (stage === 1) {
        const cyc = (stageT % 4) / 4, k = SL.ease.inOut(SL.clamp(cyc * 1.6, 0, 1));
        const moved = { ...U, u_model: m4.mulAll(m4.translation(0, 0, 0), rot, m4.scaling(1.0)), u_rest: m4.mulAll(m4.rotX(0.45), m4.scaling(0.55)), u_wave: 1, u_morph: k };
        R.blend('alpha');
        R.draw(M.points, P.pt, { ...moved, u_morph: 0, u_alpha: 0.25, u_size: U.u_size * 0.7 });
        R.draw(M.conn, P.line, { ...moved, u_lineMode: 1, u_alpha: 0.25, u_color: [0.6, 1, 0.5] });
        R.blend(null);
        R.draw(M.points, P.pt, moved);
      } else if (stage === 2) {
        const prog = Math.min(1, stageT / 3.5);
        R.blend('alpha'); gl.depthMask(false);
        R.draw(M.flat, P.flat, { ...U, u_progress: prog, u_alpha: 0.55 });
        gl.depthMask(true); R.blend(null);
        R.draw(M.edges, P.line, { ...U, u_color: [1, 1, 1], u_alpha: 1 });
        R.draw(M.points, P.pt, { ...U, u_size: U.u_size * 0.6 });
      } else if (stage === 3 || stage === 4) {
        const full = stage === 4 && res >= 200;
        if (full) { R.draw(M.solid, P.lit, U); }
        else {
          const lw = res, lh = Math.max(4, Math.round(res / st.aspect));
          lowRT.resize(lw, lh); R.bind(lowRT); R.clear(0, 0, 0, 0);
          if (stage === 3) R.draw(M.flat, P.flat, { ...U, u_unlit: 1 }); else R.draw(M.solid, P.lit, U);
          R.bind(null);
          R.fullscreen(P.show, { u_tex: lowRT.tex, u_res: [lw, lh], u_grid: 1 });
          if (stage === 3) { gl.disable(gl.DEPTH_TEST); R.blend('alpha'); R.draw(M.edges, P.line, { ...U, u_color: [1, 1, 1], u_alpha: 0.55 }); R.blend(null); gl.enable(gl.DEPTH_TEST); }
        }
      } else if (stage === 5) {
        const cube = m4.mulAll(m4.translation(0.9 * Math.sin(t * 0.7), 0.1, 0.4), m4.rotY(t * 0.6), m4.rotX(0.4));
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(Math.floor(st.w / 2), 0, st.w, st.h);
        R.clear(0.03, 0.02, 0.06, 1);
        R.draw(M.solid, P.lit, U); R.draw(M.cube, P.lit, { ...U, u_model: cube, u_rest: cube });
        gl.scissor(0, 0, Math.floor(st.w / 2), st.h);
        R.clear(0, 0, 0, 1);
        const D = { ...U, u_near: cam.near, u_far: cam.far };
        R.draw(M.solid, P.depth, D); R.draw(M.cube, P.depth, { ...D, u_model: cube, u_rest: cube });
        gl.disable(gl.SCISSOR_TEST);
      } else {
        R.fullscreen(P.bg, {});
        const cube = m4.mulAll(m4.translation(0.9 * Math.sin(t * 0.7), 0.1, 0.4), m4.rotY(t * 0.6), m4.rotX(0.4));
        R.draw(M.solid, P.lit, { ...U, u_fancy: 1 }); R.draw(M.cube, P.lit, { ...U, u_model: cube, u_rest: cube, u_fancy: 1 });
      }
    },
  });

  /* ============================ RASTER PLAYGROUND ============================ */
  const cv = $('#raster-canvas');
  const verts = [{ x: 0.2, y: 0.82, c: [255, 61, 110], n: 'A' }, { x: 0.55, y: 0.1, c: [61, 255, 138], n: 'B' }, { x: 0.86, y: 0.7, c: [61, 138, 255], n: 'C' }];
  let cell = 22, interp = true, centers = true, hoverCell = null, dragging = null, dirty = true;
  const ctx = SL.canvas2d(cv, () => { dirty = true; });
  SL.slider('#rs-size', (v) => { cell = v; dirty = true; });
  $('#rs-interp').addEventListener('change', (e) => { interp = e.target.checked; dirty = true; });
  $('#rs-centers').addEventListener('change', (e) => { centers = e.target.checked; dirty = true; });
  const edge = (a, b, p) => (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
  function bary(px, py) {
    const W = ctx.W, H = ctx.H, [A, B, Cc] = verts.map((v) => ({ x: v.x * W, y: v.y * H })), p = { x: px, y: py };
    const area = edge(A, B, Cc); if (Math.abs(area) < 1e-6) return null;
    const w0 = edge(B, Cc, p) / area, w1 = edge(Cc, A, p) / area, w2 = edge(A, B, p) / area;
    return [w0, w1, w2];
  }
  function draw() {
    const W = ctx.W, H = ctx.H, cols = Math.floor(W / cell), rows = Math.floor(H / cell), ox = (W - cols * cell) / 2, oy = (H - rows * cell) / 2;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, W, H);
    let count = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = ox + i * cell, y = oy + j * cell, cx = x + cell / 2, cy = y + cell / 2, w = bary(cx, cy);
      const inside = w && w[0] >= 0 && w[1] >= 0 && w[2] >= 0;
      if (inside) {
        count++;
        const col = interp ? [0, 1, 2].map((k) => Math.round(w[0] * verts[0].c[k] + w[1] * verts[1].c[k] + w[2] * verts[2].c[k])) : [255, 61, 154];
        ctx.fillStyle = `rgb(${col})`; ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      } else { ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1); }
      if (centers) { ctx.fillStyle = inside ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, cell * 0.08), 0, 7); ctx.fill(); }
      if (hoverCell && hoverCell[0] === i && hoverCell[1] === j) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3); ctx.lineWidth = 1; hoverCell.w = w; hoverCell.inside = inside; }
    }
    // triangle
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2; ctx.beginPath();
    verts.forEach((v, k) => (k ? ctx.lineTo(v.x * W, v.y * H) : ctx.moveTo(v.x * W, v.y * H))); ctx.closePath(); ctx.stroke(); ctx.lineWidth = 1;
    for (const v of verts) {
      ctx.fillStyle = `rgb(${v.c})`; ctx.shadowColor = `rgb(${v.c})`; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(v.x * W, v.y * H, 11, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#07040f'; ctx.font = '700 12px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v.n, v.x * W, v.y * H + 0.5);
    }
    $('#rs-count').textContent = count;
    const box = $('#rs-hover');
    if (hoverCell && hoverCell.w) {
      const w = hoverCell.w, ins = hoverCell.inside;
      const rows2 = verts.map((v, k) => `<div class="w"><span style="color:rgb(${v.c})">${v.n}</span><i style="width:${Math.max(0, Math.min(1, w[k])) * 100}%;background:rgb(${v.c})"></i><span>${fmt(w[k])}</span></div>`).join('');
      const col = [0, 1, 2].map((k) => Math.round(SL.clamp(w[0] * verts[0].c[k] + w[1] * verts[1].c[k] + w[2] * verts[2].c[k], 0, 255)));
      box.innerHTML = `Pixel <b>(${hoverCell[0]}, ${hoverCell[1]})</b> → ${ins ? '<b class="c-lime">inside ✓</b>' : '<b class="c-pink">outside ✗</b> (a weight is negative)'}${rows2}${ins ? `<div class="res"><span style="background:rgb(${col})"></span>= ${fmt(w[0])}·A + ${fmt(w[1])}·B + ${fmt(w[2])}·C</div>` : ''}`;
    }
    dirty = false;
  }
  const cellAt = (p) => { const W = ctx.W, H = ctx.H, cols = Math.floor(W / cell), rows = Math.floor(H / cell), ox = (W - cols * cell) / 2, oy = (H - rows * cell) / 2; const i = Math.floor((p.x - ox) / cell), j = Math.floor((p.y - oy) / cell); return i >= 0 && j >= 0 && i < cols && j < rows ? [i, j] : null; };
  SL.drag(cv, {
    down(p) { let best = null, bd = 28; verts.forEach((v) => { const d = Math.hypot(v.x * ctx.W - p.x, v.y * ctx.H - p.y); if (d < bd) { bd = d; best = v; } }); dragging = best; if (!best) return false; SL.xp.award('raster-drag', 15, 'for reshaping a triangle'); },
    move(p) { if (dragging) { dragging.x = SL.clamp(p.x / ctx.W, 0.02, 0.98); dragging.y = SL.clamp(p.y / ctx.H, 0.02, 0.98); hoverCell = cellAt(p); dirty = true; } },
    up() { dragging = null; },
    hover(p) { hoverCell = p ? cellAt(p) : null; dirty = true; },
  });
  SL.animateWhileVisible(cv, () => { if (dirty) draw(); });
})();
