/* LEVEL 09 — textures: UV mapping with GPU picking + filtering / wrap modes */
(function () {
  'use strict';
  const { glsl, geo, m4, OrbitCamera, $ } = SL;

  /* ------------ procedural textures (2D canvas) ------------ */
  const gridCanvas = document.createElement('canvas'); gridCanvas.width = gridCanvas.height = 512;
  (() => {
    const c = gridCanvas.getContext('2d'), n = 8, s = 512 / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const [r, g, b] = SL.hsl(((i + j * 0.55) / n) % 1, 0.85, (i + j) % 2 ? 0.55 : 0.42);
      c.fillStyle = `rgb(${r * 255},${g * 255},${b * 255})`; c.fillRect(i * s, j * s, s, s);
      c.fillStyle = 'rgba(255,255,255,0.92)'; c.font = '700 24px Space Grotesk, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ABCDEFGH'[i] + (n - j), i * s + s / 2, j * s + s / 2);
    }
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
    for (let k = 0; k <= n; k++) { c.beginPath(); c.moveTo(k * s, 0); c.lineTo(k * s, 512); c.moveTo(0, k * s); c.lineTo(512, k * s); c.stroke(); }
    c.lineWidth = 8; c.strokeStyle = '#fff'; c.strokeRect(4, 4, 504, 504);
  })();
  const checkCanvas = document.createElement('canvas'); checkCanvas.width = checkCanvas.height = 256;
  (() => {
    const c = checkCanvas.getContext('2d');
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { c.fillStyle = (i + j) % 2 ? '#f4f0ff' : '#140a28'; c.fillRect(i * 32, j * 32, 32, 32); }
    c.strokeStyle = '#ff3d9a'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, 253, 253);
    c.strokeStyle = '#22e4ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 128); c.lineTo(256, 128); c.moveTo(128, 0); c.lineTo(128, 256); c.stroke();
  })();

  const VS = glsl.vs(`in vec3 a_position; in vec3 a_normal; in vec2 a_uv;
uniform mat4 u_model, u_view, u_proj; uniform vec2 u_uvScale, u_uvOffset;
out vec3 v_normal; out vec3 v_world; out vec2 v_uv;
void main(){ vec4 w = u_model * vec4(a_position, 1.0); v_world = w.xyz; v_normal = mat3(u_model) * a_normal; v_uv = a_uv * u_uvScale + u_uvOffset; gl_Position = u_proj * u_view * w; }`);
  const FS = glsl.fs(`in vec3 v_normal; in vec3 v_world; in vec2 v_uv;
uniform sampler2D u_tex; uniform vec2 u_hover; uniform float u_lit; uniform vec3 u_eye; uniform float u_fog;
out vec4 fragColor;
void main(){
  vec3 col = texture(u_tex, v_uv).rgb;          // ← the texture lookup
  if (u_lit > 0.5) { vec3 n = normalize(v_normal); col *= 0.45 + 0.7 * max(dot(n, normalize(vec3(0.4, 0.9, 0.5))), 0.0); }
  if (u_hover.x >= 0.0) {
    float d = length(v_uv - u_hover);
    col = mix(col, vec3(1.0, 0.85, 0.2), smoothstep(0.045, 0.035, d) * smoothstep(0.015, 0.025, d));
    col += vec3(1.0, 0.85, 0.2) * smoothstep(0.02, 0.0, d);
  }
  if (u_fog > 0.0) { float f = 1.0 - exp(-length(v_world - u_eye) * u_fog); col = mix(col, vec3(0.08, 0.03, 0.16), f); }
  fragColor = vec4(col, 1.0);
}`);
  const PICK_FS = glsl.fs(`in vec2 v_uv; out vec4 fragColor; void main(){ fragColor = vec4(fract(v_uv), 1.0, 1.0); }`);
  const SKY_FS = glsl.fs(`in vec2 v_uv; out vec4 fragColor; void main(){ vec3 c = mix(vec3(0.08,0.03,0.16), vec3(0.35,0.08,0.4), pow(v_uv.y, 1.5)); fragColor = vec4(c, 1.0); }`);

  const SHAPES = { cube: () => geo.box(1.8, 1.8, 1.8), sphere: () => geo.sphere(1.3, 32, 18), torus: () => geo.torus(1.1, 0.48, 24, 48) };
  const shapeGeos = {}; for (const k in SHAPES) shapeGeos[k] = SHAPES[k]();
  const cam = new OrbitCamera({ dist: 5, theta: 0.6, phi: 1.1, minDist: 2.5, maxDist: 12 });
  const cam2 = new OrbitCamera({ target: [0, 0.6, -8], dist: 8.6, theta: 0, phi: 1.42, minPhi: 1.1, maxPhi: 1.55, minDist: 4, maxDist: 20 });
  let mode = 'uv', shape = 'cube', filter = 'nearest', wrap = 'repeat';
  let P = {}, M = {}, T = {}, pickRT, R0, picked = null, hoverUV = [-1, -1];
  const px = new Uint8Array(4);

  const stageEl = $('#tx-stage'), readout = $('#tx-readout');
  SL.tabs('#tx-mode', (v) => {
    mode = v; cam.enabled = v === 'uv'; cam2.enabled = v !== 'uv';
    $('#tx-shape').hidden = v !== 'uv'; $('#tx-filter').hidden = v !== 'filter'; $('#tx-wrap').hidden = v !== 'filter';
    $('#tx-help').innerHTML = v === 'uv'
      ? 'Hover the 3D shape — the <b class="c-yellow">crosshair</b> shows which texel it reads. Hover the image to light up that spot on the shape. Faint lines = the mesh’s <b>UV layout</b>.'
      : 'Far away, many texels squeeze into one pixel. <b>NEAREST</b> picks one → sparkly noise (aliasing). <b>MIPMAPS</b> are pre-shrunk copies of the texture (above) so the GPU can pick the right size. <b>ANISOTROPIC</b> sharpens floors seen at a grazing angle.<br><br>The wall shows <b>wrap modes</b>: what happens when uv goes outside 0→1.';
    readout.style.display = v === 'uv' ? '' : 'none';
    applyParams();
    if (v === 'filter') SL.xp.award('tx-filter', 15, 'for fighting aliasing');
  }, 'uv');
  SL.tabs('#tx-shape', (v) => { shape = v; }, 'cube');
  SL.tabs('#tx-filter', (v) => { filter = v; applyParams(); }, 'nearest');
  SL.tabs('#tx-wrap', (v) => { wrap = v; applyParams(); }, 'repeat');
  function applyParams() {
    if (!R0) return;
    if (mode === 'uv') R0.setTexParams(T.grid, 'linear', 'clamp', true, 8);
    else {
      R0.setTexParams(T.check, filter === 'nearest' ? 'nearest' : 'linear', 'repeat', filter === 'mip' || filter === 'aniso', filter === 'aniso' ? 16 : 1);
      R0.setTexParams(T.grid, 'linear', wrap, true, 4);
    }
  }

  // side map
  const map = $('#tx-map'), mctx = SL.canvas2d(map);
  const uvEdges = {};
  for (const k in shapeGeos) { const g = shapeGeos[k], e = geo.edges(g); uvEdges[k] = { idx: e.indices, uv: g.uvs }; }
  SL.drag(map, {
    down: () => false,
    hover(p) { hoverUV = p ? [p.x / mctx.W, 1 - p.y / mctx.H] : [-1, -1]; if (p) SL.xp.award('tx-map', 10, 'for painting with UVs'); },
  });
  function drawMap() {
    const W = mctx.W, H = mctx.H; mctx.clearRect(0, 0, W, H);
    if (mode === 'uv') {
      mctx.imageSmoothingEnabled = true; mctx.drawImage(gridCanvas, 0, 0, W, H);
      const { idx, uv } = uvEdges[shape];
      mctx.strokeStyle = 'rgba(255,255,255,0.28)'; mctx.lineWidth = 1; mctx.beginPath();
      for (let i = 0; i < idx.length; i += 2) {
        const a = idx[i], b = idx[i + 1], ua = uv[a * 2], va = uv[a * 2 + 1], ub = uv[b * 2], vb = uv[b * 2 + 1];
        if (Math.abs(ua - ub) > 0.5 || Math.abs(va - vb) > 0.5) continue;
        mctx.moveTo(ua * W, (1 - va) * H); mctx.lineTo(ub * W, (1 - vb) * H);
      }
      mctx.stroke();
      const cross = (u, v, col) => { const x = u * W, y = (1 - v) * H; mctx.strokeStyle = col; mctx.lineWidth = 2; mctx.shadowColor = col; mctx.shadowBlur = 8; mctx.beginPath(); mctx.moveTo(x - 14, y); mctx.lineTo(x + 14, y); mctx.moveTo(x, y - 14); mctx.lineTo(x, y + 14); mctx.stroke(); mctx.beginPath(); mctx.arc(x, y, 8, 0, 7); mctx.stroke(); mctx.shadowBlur = 0; };
      if (picked) cross(picked[0], picked[1], '#ffd23f');
      if (hoverUV[0] >= 0) cross(hoverUV[0], hoverUV[1], '#ffffff');
    } else {
      // mip chain
      mctx.fillStyle = '#0b0717'; mctx.fillRect(0, 0, W, H);
      let s = W * 0.5, x = 0, y = 0;
      mctx.imageSmoothingEnabled = filter !== 'nearest';
      mctx.font = '11px JetBrains Mono'; mctx.fillStyle = '#a99cc9';
      for (let lvl = 0; lvl < 7; lvl++) {
        mctx.drawImage(checkCanvas, x, y, s, s); mctx.strokeStyle = '#ff3d9a'; mctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
        mctx.fillStyle = '#a99cc9'; if (s > 20) mctx.fillText(`${256 >> lvl}px`, x + 4, y + s + 13);
        if (lvl % 2 === 0) x += s + 6; else y += s + 18;
        s /= 2;
      }
      mctx.fillStyle = '#fff'; mctx.font = '600 13px Space Grotesk'; mctx.fillText('mipmap chain: each level half the size', 4, H - 8);
    }
  }

  SL.stage(stageEl, {
    setup(R, st) {
      R0 = R;
      P.main = R.program(VS, FS); P.pick = R.program(VS, PICK_FS); P.sky = R.program(glsl.fullscreenVS, SKY_FS);
      M = {}; for (const k in shapeGeos) M[k] = R.mesh(shapeGeos[k]);
      M.floor = R.mesh(geo.plane(240, 240, 1, 1)); M.wall = R.mesh(geo.quad(6, 4));
      T.grid = R.texture(gridCanvas, { mipmap: true, filter: 'linear' }); T.check = R.texture(checkCanvas, { mipmap: true, filter: 'nearest', wrap: 'repeat' });
      pickRT = R.target(64, 64, { filter: 'nearest' });
      applyParams();
      if (!st.inited) { cam.attach(st.el); cam2.attach(st.el); st.inited = true; }
    },
    frame(R, st, t, dt) {
      const gl = R.gl;
      if (mode === 'uv') {
        cam.update(dt); cam2.update(0);
        const { view, proj, eye } = cam.matrices(st.aspect);
        const mdl = m4.mulAll(m4.rotY(t * 0.2), m4.rotX(shape === 'torus' ? 1.0 : 0.25));
        const U = { u_model: mdl, u_view: view, u_proj: proj, u_uvScale: [1, 1], u_uvOffset: [0, 0], u_tex: T.grid, u_hover: hoverUV, u_lit: 1, u_eye: eye, u_fog: 0 };
        R.clear(0.03, 0.02, 0.06, 1);
        R.draw(M[shape], P.main, U);
        if (st.mouse.inside) {
          pickRT.resize(Math.ceil(st.w / 2), Math.ceil(st.h / 2));
          R.bind(pickRT); R.clear(0, 0, 0, 0); R.draw(M[shape], P.pick, U);
          gl.readPixels(Math.floor(st.mouse.nx * pickRT.w), Math.floor(st.mouse.ny * pickRT.h), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          R.bind(null);
          if (px[2] > 0) { picked = [px[0] / 255, px[1] / 255]; readout.innerHTML = `uv = (${picked[0].toFixed(2)}, ${picked[1].toFixed(2)}) → texel (${Math.round(picked[0] * 511)}, ${Math.round(picked[1] * 511)}) · cell <b>${'ABCDEFGH'[Math.min(7, Math.floor(picked[0] * 8))]}${Math.min(8, Math.floor(picked[1] * 8) + 1)}</b>`; SL.xp.award('tx-pick', 10, 'for GPU picking a texel'); }
          else { picked = null; readout.textContent = 'missed! (background)'; }
        }
      } else {
        cam2.update(dt); cam.update(0);
        const { view, proj, eye } = cam2.matrices(st.aspect);
        R.clear(0, 0, 0, 1); R.fullscreen(P.sky, {});
        R.draw(M.floor, P.main, { u_model: m4.identity(), u_view: view, u_proj: proj, u_uvScale: [60, 60], u_uvOffset: [0, t * 0.15], u_tex: T.check, u_hover: [-1, -1], u_lit: 0, u_eye: eye, u_fog: 0.025 });
        R.draw(M.wall, P.main, { u_model: m4.mulAll(m4.translation(-4.2, 1.7, -13), m4.rotY(0.45), m4.scaling(0.75)), u_view: view, u_proj: proj, u_uvScale: [3, 2], u_uvOffset: [-1, -0.5], u_tex: T.grid, u_hover: [-1, -1], u_lit: 0, u_eye: eye, u_fog: 0.0 });
      }
      drawMap();
    },
  });
})();
