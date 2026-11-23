/* LEVEL 02 — 3D hardware: a PC diorama (frame journey) + CPU vs GPU chip models */
(function () {
  'use strict';
  const { glsl, geo, m4, v3, OrbitCamera, Labels, $, $$, hexToRgb, TAU } = SL;
  const C = (h) => hexToRgb(h);

  /* ------------------------------ helpers ------------------------------ */
  function catmull(pts, samples = 16) {
    const out = [], cr = (a, b, c, d, t) => [0, 1, 2].map((k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t));
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      for (let s = 0; s < samples; s++) out.push(cr(p0, p1, p2, p3, s / samples));
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function makePath(ctrl, color) {
    const pts = catmull(ctrl), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + v3.len(v3.sub(pts[i], pts[i - 1])));
    const total = cum[cum.length - 1];
    return {
      pts, color, total,
      at(u) {
        const d = u * total; let i = 1;
        while (i < cum.length - 1 && cum[i] < d) i++;
        const t = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
        return v3.lerp(pts[i - 1], pts[i], SL.clamp(t, 0, 1));
      },
    };
  }
  function tube(pts, r, radial = 10) {
    const P = [], N = [], U = [], I = [], n = pts.length; let prev = null;
    for (let i = 0; i < n; i++) {
      const t = v3.norm(v3.sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)]));
      let nr = prev ? v3.sub(prev, v3.scale(t, v3.dot(prev, t))) : v3.cross(t, Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
      nr = v3.norm(nr); prev = nr; const b = v3.cross(t, nr);
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * TAU, d = v3.add(v3.scale(nr, Math.cos(a)), v3.scale(b, Math.sin(a)));
        P.push(...v3.add(pts[i], v3.scale(d, r))); N.push(...d); U.push(i / (n - 1), j / radial);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    return { positions: new Float32Array(P), normals: new Float32Array(N), uvs: new Float32Array(U), indices: new Uint16Array(I) };
  }

  /* ------------------------------ shaders ------------------------------ */
  const VS = glsl.vs(`in vec3 a_position; in vec3 a_normal; in vec2 a_uv; in vec3 a_color; in vec4 a_extra;
uniform mat4 u_model, u_view, u_proj; uniform float u_time;
out vec3 v_normal; out vec3 v_world; out vec3 v_color; out vec4 v_extra; out float v_glow; out vec2 v_uv;
void main(){
  vec3 p = a_position; float glow = 0.0;
  // a_extra.y = animation type; a_extra.z = phase  (this whole animation is a vertex shader!)
  if (a_extra.y > 1.5 && a_extra.y < 2.5) {          // GPU core: waves across the chip
    float w = sin(u_time * 5.0 - a_extra.z * 3.0);
    glow = smoothstep(0.55, 1.0, w);
    p.y += glow * 0.06;
  } else if (a_extra.y > 0.5 && a_extra.y < 1.5) {   // CPU ALU: busy, individual
    float w = sin(u_time * 9.0 + a_extra.z * 17.0);
    glow = smoothstep(0.3, 1.0, w) * 0.8;
  }
  vec4 wp = u_model * vec4(p, 1.0);
  v_world = wp.xyz; v_normal = mat3(u_model) * a_normal; v_color = a_color; v_extra = a_extra; v_glow = glow; v_uv = a_uv;
  gl_Position = u_proj * u_view * wp;
}`);
  const FS = glsl.fs(`in vec3 v_normal; in vec3 v_world; in vec3 v_color; in vec4 v_extra; in float v_glow; in vec2 v_uv;
uniform vec3 u_eye; uniform vec4 u_focus; uniform float u_time; uniform float u_dim;
out vec4 fragColor;
void main(){
  vec3 n = normalize(v_normal), l = normalize(vec3(0.45, 1.0, 0.35)), v = normalize(u_eye - v_world);
  float diff = max(dot(n, l), 0.0), hemi = 0.5 + 0.5 * n.y;
  vec3 col = v_color * (0.3 * hemi + 0.8 * diff) + pow(max(dot(n, normalize(l + v)), 0.0), 40.0) * 0.3;
  col += pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.12 * vec3(0.5, 0.6, 1.0);
  col += v_color * v_glow * 1.4 + v_glow * 0.25;
  float id = v_extra.x;
  bool hot = id > 0.5 && (abs(id - u_focus.x) < 0.5 || abs(id - u_focus.y) < 0.5 || abs(id - u_focus.z) < 0.5 || u_focus.w > 0.5);
  if (hot) col = col * 1.25 + (0.3 + 0.2 * sin(u_time * 6.0)) * vec3(0.15, 0.75, 1.0);
  else if (u_dim > 0.5 && id > -0.5) col *= 0.45;
  fragColor = vec4(col, 1.0);
}`);
  const SCREEN_FS = glsl.fs(`in vec2 v_uv; uniform float u_time; uniform float u_bright; out vec4 fragColor;
void main(){
  vec2 uv = v_uv;
  vec3 col = mix(vec3(0.08, 0.02, 0.22), vec3(1.0, 0.25, 0.6), smoothstep(0.35, 1.0, uv.y));
  vec2 sp = (uv - vec2(0.5, 0.58)) * vec2(1.75, 1.0);
  float sun = smoothstep(0.24, 0.235, length(sp));
  float cut = step(0.5, fract(uv.y * 28.0 - u_time * 0.5)) + step(0.6, uv.y);
  col = mix(col, mix(vec3(1.0, 0.25, 0.6), vec3(1.0, 0.9, 0.3), smoothstep(0.4, 0.8, uv.y)), sun * min(cut, 1.0));
  if (uv.y < 0.4) {
    float h = 0.4 - uv.y, z = 0.08 / h;
    float gx = abs(fract((uv.x - 0.5) * z * 4.0) - 0.5), gz = abs(fract(z * 2.0 + u_time * 0.8) - 0.5);
    float line = max(smoothstep(0.03 * z, 0.0, 0.5 - gx), smoothstep(0.04 * z, 0.0, 0.5 - gz));
    col = mix(vec3(0.05, 0.0, 0.12), vec3(0.13, 0.9, 1.0), line * smoothstep(0.0, 0.25, h));
  }
  col *= u_bright;
  col += 0.03 * sin(gl_FragCoord.y * 3.0);
  fragColor = vec4(col, 1.0);
}`);
  const LINE_VS = glsl.vs(`in vec3 a_position; in vec3 a_color; uniform mat4 u_vp; out vec3 v_color; void main(){ v_color = a_color; gl_Position = u_vp * vec4(a_position, 1.0); }`);
  const LINE_FS = glsl.fs(`in vec3 v_color; uniform float u_alpha; out vec4 fragColor; void main(){ fragColor = vec4(v_color, u_alpha); }`);
  const PT_VS = glsl.vs(`in vec3 a_position; in vec3 a_color; uniform mat4 u_vp; uniform float u_size; out vec3 v_color;
void main(){ v_color = a_color; gl_Position = u_vp * vec4(a_position, 1.0); gl_PointSize = u_size / gl_Position.w; }`);
  const PT_FS = glsl.fs(`in vec3 v_color; out vec4 fragColor;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); fragColor = vec4(v_color * (a * 1.6) + a * a * 0.6, a); }`);

  /* ------------------------------ PC scene geometry ------------------------------ */
  const ID = { CPU: 1, RAM: 2, SSD: 3, PCIE: 4, DIE: 5, VRAM: 6, PORTS: 7, MON: 8, FANS: 9 };
  function buildPC() {
    const items = [], add = (g, p, col, id = 0, r = [0, 0, 0], s = 1) => items.push({ geo: g, matrix: m4.trs(p, r, s), color: typeof col === 'string' ? C(col) : col, extra: [id, 0, 0, 0] });
    // platform
    add(geo.cylinder(9.5, 9.8, 0.3, 72), [0, -0.3, -0.6], '#140c28', -1);
    // motherboard
    add(geo.box(6.6, 0.15, 5.6), [-2.4, 0, 0], '#0d4d43');
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 18; i++) { const z = -2.5 + rnd() * 5, x = -5.4 + rnd() * 4.5, w = 0.6 + rnd() * 1.8; add(geo.box(w, 0.02, 0.035), [x + w / 2, 0.085, z], '#c99a3a'); }
    add(geo.box(1.7, 0.12, 1.7), [-3.4, 0.13, -0.8], '#2a2a35');                     // socket
    add(geo.box(1.35, 0.14, 1.35), [-3.4, 0.25, -0.8], '#b9bdc9', ID.CPU);           // CPU heat spreader
    add(geo.box(0.7, 0.04, 0.7), [-3.4, 0.33, -0.8], '#8d92a3', ID.CPU);
    for (let k = 0; k < 4; k++) {                                                    // RAM sticks with RGB tops
      const x = -2.05 + k * 0.28;
      add(geo.box(0.13, 0.9, 3.0), [x, 0.53, -0.8], '#1b2550', ID.RAM);
      add(geo.box(0.15, 0.08, 3.0), [x, 1.0, -0.8], SL.hsl(0.85 - k * 0.12, 1, 0.6), ID.RAM);
      add(geo.box(0.2, 0.14, 3.1), [x, 0.12, -0.8], '#111118');
    }
    add(geo.box(2.3, 0.05, 0.62), [-3.7, 0.1, 1.85], '#16161e', ID.SSD);             // M.2 SSD
    for (let k = 0; k < 3; k++) add(geo.box(0.5, 0.05, 0.42), [-4.4 + k * 0.62, 0.14, 1.85], '#2b2b3a', ID.SSD);
    add(geo.box(3.6, 0.22, 0.26), [-2.2, 0.18, 1.0], '#0b0b10', ID.PCIE);           // PCIe slot
    add(geo.box(3.4, 0.03, 0.08), [-2.2, 0.3, 1.0], '#c99a3a', ID.PCIE);
    add(geo.box(0.9, 0.1, 0.9), [-1.1, 0.13, 2.1], '#22222c');                      // chipset
    add(geo.box(0.5, 0.6, 2.4), [-5.45, 0.38, -0.8], '#30303d');                    // rear I/O
    for (let k = 0; k < 6; k++) add(geo.cylinder(0.12, 0.12, 0.3, 14), [-4.8 + k * 0.3, 0.22, -2.3], '#3d3d4c');
    // graphics card (exploded)
    const gx = 3.5;
    add(geo.box(4.8, 0.12, 2.6), [gx, 0, 0], '#0b1f1a');
    add(geo.box(2.4, 0.13, 0.14), [gx - 0.7, 0.0, 1.32], '#d9a83f', ID.PCIE);       // gold fingers
    add(geo.box(1.15, 0.14, 1.15), [gx, 0.13, 0], '#6a6f80', ID.DIE);               // GPU package
    add(geo.box(0.8, 0.06, 0.8), [gx, 0.22, 0], '#2a1840', ID.DIE);                 // GPU die
    const vram = [[-0.7, -0.98], [0, -0.98], [0.7, -0.98], [-0.7, 0.98], [0, 0.98], [0.7, 0.98], [-1.05, 0], [1.05, 0]];
    for (const [dx, dz] of vram) add(geo.box(0.46, 0.08, 0.46), [gx + dx, 0.1, dz], '#15151c', ID.VRAM);
    for (let k = 0; k < 8; k++) add(geo.cylinder(0.11, 0.11, 0.26, 12), [gx + 1.55 + (k % 4) * 0.22, 0.19, -0.5 + Math.floor(k / 4) * 0.45], '#4c4c5c');
    add(geo.box(0.7, 0.32, 0.3), [gx + 1.7, 0.22, -1.05], '#0b0b10');                // power plug
    add(geo.box(0.1, 0.9, 2.6), [gx + 2.45, 0.4, 0], '#9aa0ae', ID.PORTS);          // bracket
    for (let k = 0; k < 4; k++) add(geo.box(0.12, 0.18, 0.42), [gx + 2.48, 0.35, -0.8 + k * 0.53], '#14141a', ID.PORTS);
    // shroud frame (floating above)
    const sy = 1.8;
    add(geo.box(4.8, 0.12, 0.14), [gx, sy, -1.25], '#3b3b4a', ID.FANS); add(geo.box(4.8, 0.12, 0.14), [gx, sy, 1.25], '#3b3b4a', ID.FANS);
    add(geo.box(0.14, 0.12, 2.6), [gx - 2.35, sy, 0], '#3b3b4a', ID.FANS); add(geo.box(0.14, 0.12, 2.6), [gx + 2.35, sy, 0], '#3b3b4a', ID.FANS);
    add(geo.box(4.6, 0.04, 0.05), [gx, sy + 0.07, 1.25], '#ff3d9a', ID.FANS);       // RGB strip
    // monitor
    add(geo.box(1.8, 0.1, 1.1), [0.6, 0.05, -4.6], '#22222c', ID.MON);
    add(geo.box(0.28, 1.6, 0.22), [0.6, 0.85, -4.75], '#2c2c38', ID.MON);
    add(geo.box(5.3, 3.15, 0.2), [0.6, 2.95, -4.6], '#18181f', ID.MON);
    return geo.merge(items);
  }
  function buildFan() {
    const items = [{ geo: geo.cylinder(0.26, 0.26, 0.14, 20), color: C('#2a2a35'), extra: [ID.FANS, 0, 0, 0] },
      { geo: geo.torus(0.9, 0.05, 8, 40), matrix: m4.rotX(Math.PI / 2), color: C('#3b3b4a'), extra: [ID.FANS, 0, 0, 0] }];
    for (let k = 0; k < 7; k++) items.push({ geo: geo.box(0.62, 0.025, 0.3), matrix: m4.mulAll(m4.rotY(k / 7 * TAU), m4.translation(0.55, 0, 0), m4.rotX(0.35)), color: C('#22e4ff'), extra: [ID.FANS, 0, 0, 0] });
    return geo.merge(items);
  }
  const PATHS = {
    ssdRam: makePath([[-4.6, 0.25, 1.85], [-3.0, 0.4, 1.7], [-2.4, 0.6, 0.6], [-1.6, 1.1, -0.3]], C('#7cff6b')),
    ramCpu: makePath([[-1.6, 1.1, -0.8], [-2.4, 0.8, -1.2], [-3.4, 0.45, -0.8]], C('#22e4ff')),
    cpuPcie: makePath([[-3.4, 0.45, -0.8], [-3.2, 0.4, 0.4], [-2.6, 0.35, 1.0], [-1.0, 0.35, 1.0]], C('#ffd23f')),
    pcieGpu: makePath([[-0.4, 0.35, 1.0], [0.6, 1.0, 1.6], [1.8, 0.7, 1.7], [2.8, 0.12, 1.35], [3.5, 0.2, 0.98]], C('#ffd23f')),
    vramDie1: makePath([[2.8, 0.2, -0.98], [3.2, 0.3, -0.5], [3.5, 0.3, 0]], C('#ff3d9a')),
    vramDie2: makePath([[4.2, 0.2, -0.98], [3.8, 0.3, -0.5], [3.5, 0.3, 0]], C('#ff3d9a')),
    vramDie3: makePath([[2.45, 0.2, 0], [3.0, 0.3, 0.1], [3.5, 0.3, 0]], C('#ff3d9a')),
    vramDie4: makePath([[4.55, 0.2, 0], [4.0, 0.3, -0.1], [3.5, 0.3, 0]], C('#ff3d9a')),
    vramDie5: makePath([[3.5, 0.2, 0.98], [3.5, 0.32, 0.5], [3.5, 0.3, 0]], C('#ff3d9a')),
    dieOut: makePath([[3.5, 0.3, 0], [4.6, 0.35, 0.1], [5.95, 0.38, 0.27], [6.6, 0.9, 0.3], [5.6, 2.2, -3.2], [3.2, 2.6, -4.85]], C('#9b5cff')),
  };
  const STEPS = [
    { title: 'Your computer 🖥', text: 'A simplified gaming PC. <b>Left:</b> motherboard with CPU, RAM & SSD. <b>Right:</b> the graphics card, exploded so you can peek inside. <b>Back:</b> the monitor. Press ▶ to follow one frame!', cam: { target: [0.4, 0.8, -0.6], dist: 14.5, theta: 0.45, phi: 0.95 }, focus: [], paths: [] },
    { title: '① Load: SSD → RAM', text: 'Game files — 3D meshes, textures and <b>shader source code</b> — are loaded from the SSD into system memory (RAM).', cam: { target: [-2.8, 0.4, 0.5], dist: 6.5, theta: -0.35, phi: 0.95 }, focus: [ID.SSD, ID.RAM], paths: ['ssdRam'] },
    { title: '② The CPU decides what to draw', text: 'The CPU runs game logic, physics & AI, then builds a list of <b>draw calls</b>: “draw <i>this</i> mesh, with <i>this</i> shader, <i>here</i>”.', cam: { target: [-3.0, 0.4, -0.7], dist: 5.2, theta: 0.35, phi: 0.85 }, focus: [ID.CPU], paths: ['ramCpu'] },
    { title: '③ Across the PCIe bus', text: 'Commands & data travel over the <b>PCIe bus</b> to the graphics card (~32–64 GB/s). Big things like meshes & textures are uploaded once and stay on the GPU.', cam: { target: [0.4, 0.4, 0.9], dist: 8.5, theta: 0.05, phi: 1.0 }, focus: [ID.PCIE], paths: ['cpuPcie', 'pcieGpu'] },
    { title: '④ Into VRAM', text: 'The GPU has its own super-fast memory: <b>VRAM</b> (500–1000+ GB/s). Meshes, textures and the frame being drawn all live here.', cam: { target: [3.5, 0.2, 0], dist: 5.6, theta: 0.5, phi: 0.72 }, focus: [ID.VRAM], paths: ['vramDie1', 'vramDie2', 'vramDie3', 'vramDie4', 'vramDie5'] },
    { title: '⑤ The GPU runs your shaders ⚡', text: 'Thousands of cores run the <b class="c-lime">vertex shader</b> on every vertex, the rasterizer finds covered pixels, then the <b class="c-pink">fragment shader</b> colours each one — all in parallel.', cam: { target: [3.5, 0.25, 0], dist: 3.6, theta: 0.9, phi: 0.62 }, focus: [ID.DIE], paths: ['vramDie1', 'vramDie2', 'vramDie3', 'vramDie4', 'vramDie5'] },
    { title: '⑥ To the screen', text: 'The finished image — the <b>framebuffer</b> — leaves through the DisplayPort/HDMI port and lights up the monitor.', cam: { target: [2.2, 1.9, -3.0], dist: 10, theta: 0.55, phi: 1.2 }, focus: [ID.PORTS, ID.MON], paths: ['dieOut'] },
    { title: '⑦ …and again, and again!', text: 'That whole trip repeats <b>60 – 240 times per second</b>. At 120 fps the GPU has just <b class="c-yellow">8.3 ms</b> to draw each frame.', cam: { target: [0.4, 0.8, -0.6], dist: 14, theta: -0.4, phi: 0.95 }, focus: ['all'], paths: Object.keys(PATHS) },
  ];

  /* ------------------------------ chip scene ------------------------------ */
  function buildChips() {
    const items = [], add = (g, p, col, ex = [0, 0, 0, 0]) => items.push({ geo: g, matrix: m4.translation(p), color: typeof col === 'string' ? C(col) : col, extra: ex });
    add(geo.cylinder(9.5, 9.8, 0.3, 72), [0, -0.45, 0], '#140c28', [-1, 0, 0, 0]);
    // ---- CPU ----
    const cx = -3.2;
    add(geo.box(4.3, 0.2, 4.3), [cx, 0, 0], '#0f4a33');
    add(geo.box(3.7, 0.1, 3.7), [cx, 0.15, 0], '#1a1a24');
    add(geo.box(3.4, 0.14, 0.62), [cx, 0.27, 0], '#4d7cff', [0, 0, 0, 0]); // L3 cache
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
      const x = cx + (i - 1.5) * 0.86, side = row ? 1 : -1, z = side * 1.08;
      add(geo.box(0.78, 0.06, 1.2), [x, 0.23, z], '#2b2b3a');
      add(geo.box(0.68, 0.32, 0.36), [x, 0.4, z + side * 0.36], '#ff8a3d');                     // control unit
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) add(geo.box(0.26, 0.26, 0.2), [x - 0.16 + a * 0.32, 0.37, z - side * 0.02 + (b - 0.5) * 0.23], '#7cff6b', [0, 1, row * 4 + i + a * 0.3 + b * 0.7, 0]);
      add(geo.box(0.68, 0.18, 0.22), [x, 0.33, z - side * 0.42], '#4d7cff');                    // L1/L2
    }
    // ---- GPU ----
    const gx = 3.2;
    add(geo.box(4.3, 0.2, 4.3), [gx, 0, 0], '#0f4a33');
    add(geo.box(3.9, 0.1, 3.9), [gx, 0.15, 0], '#1a1a24');
    add(geo.box(3.7, 0.1, 0.36), [gx, 0.25, 0], '#4d7cff'); // L2
    const cols = 6, rows = 3;
    for (let half = 0; half < 2; half++) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = gx + (c - (cols - 1) / 2) * 0.61, z = (half ? 1 : -1) * (0.33 + (r + 0.5) * 0.53);
      add(geo.box(0.56, 0.04, 0.48), [x, 0.22, z], '#2b2b3a');
      add(geo.box(0.52, 0.09, 0.07), [x, 0.27, z - 0.2], '#ff8a3d');
      add(geo.box(0.52, 0.07, 0.07), [x, 0.26, z + 0.2], '#4d7cff');
      for (let a = 0; a < 6; a++) for (let b = 0; b < 4; b++) {
        const px = x - 0.2 + a * 0.08, pz = z - 0.12 + b * 0.085;
        add(geo.box(0.055, 0.08, 0.055), [px, 0.28, pz], '#7cff6b', [0, 2, (px - gx) * 0.9 + pz * 0.6, 0]);
      }
    }
    return geo.merge(items);
  }

  /* ------------------------------ state ------------------------------ */
  const cam = new OrbitCamera({ ...STEPS[0].cam, minDist: 2.5, maxDist: 30, maxPhi: 1.5, fitAspect: 1.45 });
  let scene = 'pc', step = 0, playing = false, playT = 0;
  let prog, screenProg, lineProg, ptProg, pcMesh, chipMesh, fanMesh, screenMesh, tubes = [], guideMesh, ptMesh, labelsPC, labelsChip;
  const MAX_PT = 400, ptPos = new Float32Array(MAX_PT * 3), ptCol = new Float32Array(MAX_PT * 3);
  const stageEl = $('#hw-stage');

  function setStep(i) {
    step = (i + STEPS.length) % STEPS.length; const s = STEPS[step];
    cam.animateTo({ ...s.cam, target: [...s.cam.target] }, 1.4);
    $('#hw-stepnum').textContent = `STEP ${step} / ${STEPS.length - 1}`;
    $('#hw-title').innerHTML = s.title; $('#hw-text').innerHTML = s.text;
    $$('#hw-dots i').forEach((d, k) => d.classList.toggle('on', k === step));
    if (labelsPC) labelsPC.items.forEach((it) => { const f = s.focus; it.el.classList.toggle('hot', f.includes(it.id)); it.el.classList.toggle('dim', f.length > 0 && !f.includes(it.id) && !f.includes('all')); });
    if (step === STEPS.length - 1) SL.xp.award('hw-journey', 30, 'for following a frame through the PC');
  }
  $('#hw-dots').innerHTML = STEPS.map(() => '<i></i>').join('');
  $$('#hw-dots i').forEach((d, k) => d.addEventListener('click', () => { playing = false; updPlay(); setStep(k); }));
  const updPlay = () => { $('#hw-play').textContent = playing ? '⏸ Pause' : '▶ Play'; };
  $('#hw-prev').addEventListener('click', () => { playing = false; updPlay(); setStep(step - 1); });
  $('#hw-next').addEventListener('click', () => { playing = false; updPlay(); setStep(step + 1); });
  $('#hw-play').addEventListener('click', () => { playing = !playing; playT = 0; if (playing && step === STEPS.length - 1) setStep(0); else if (playing) setStep(step + 1); updPlay(); });

  SL.tabs('#hw-scene', (v) => {
    scene = v;
    $('#hw-panel').hidden = v !== 'pc'; $('#hw-legend').hidden = v !== 'chips';
    if (labelsPC) labelsPC.layer.style.display = v === 'pc' ? '' : 'none';
    if (labelsChip) labelsChip.layer.style.display = v === 'chips' ? '' : 'none';
    if (v === 'chips') { cam.animateTo({ target: [0, -0.2, 0.1], dist: 9.6, theta: 0.0, phi: 0.82 }, 1.2); playing = false; updPlay(); SL.xp.award('hw-chips', 15, 'for comparing CPU & GPU chips'); }
    else setStep(step);
  }, 'pc');

  function makeLabels() {
    labelsPC = new Labels(stageEl); labelsChip = new Labels(stageEl);
    const L = (id, html, p) => { const it = labelsPC.add(html, p); it.id = id; };
    L(ID.CPU, 'CPU', [-3.4, 0.4, -0.8]); L(ID.RAM, 'RAM <small>system memory</small>', [-1.7, 1.1, -2.2]); L(ID.SSD, 'SSD <small>storage</small>', [-4.7, 0.15, 1.85]);
    L(ID.PCIE, 'PCIe slot <small>the bus to the GPU</small>', [-2.0, 0.3, 1.0]); L(ID.DIE, 'GPU chip', [3.5, 0.3, 0]); L(ID.VRAM, 'VRAM <small>video memory</small>', [4.2, 0.18, 0.98]);
    L(ID.FANS, 'Cooler & fans <small>(lifted off)</small>', [4.4, 2.1, -0.4]); L(ID.MON, 'Monitor', [-1.9, 4.5, -4.6]); L(ID.PORTS, 'Display out', [6.0, 0.8, 1.0]);
    L(0, 'Motherboard', [-5.4, 0.1, 2.6]); L(0, 'Graphics card', [5.6, 0.1, 1.4]);
    const K = (html, p, cls = '') => labelsChip.add(html, p, cls);
    K('<b>CPU</b> <small>8 big, smart cores</small>', [-5.35, 0.12, -2.15], 'big'); K('<b>GPU</b> <small>~860 little cores here — real ones: 10,000+</small>', [1.05, 0.12, -2.15], 'big');
    K('Control unit <small>branch prediction, out-of-order magic</small>', [-4.5, 0.6, 1.45]); K('ALU <small>does the math</small>', [-1.95, 0.52, 1.05]);
    K('Cache <small>fast local memory</small>', [-1.55, 0.36, 0.0]); K('SM / Compute Unit <small>a squad of cores sharing one control unit</small>', [1.3, 0.3, 1.75]);
    K('Shader cores <small>simple ALUs, marching in step</small>', [4.15, 0.38, -0.9]); K('L2 cache', [5.0, 0.32, 0]);
    labelsChip.layer.style.display = 'none';
  }

  const pts = [];
  SL.stage(stageEl, {
    setup(R, st) {
      prog = R.program(VS, FS); screenProg = R.program(glsl.litVS, SCREEN_FS); lineProg = R.program(LINE_VS, LINE_FS); ptProg = R.program(PT_VS, PT_FS);
      pcMesh = R.mesh(buildPC()); chipMesh = R.mesh(buildChips()); fanMesh = R.mesh(buildFan());
      screenMesh = R.mesh(geo.quad(4.95, 2.8));
      tubes = [R.mesh(tube(catmull([[-1.0, 0.33, 1.0], [0.6, 1.0, 1.6], [1.8, 0.7, 1.7], [2.6, 0.08, 1.4]]), 0.07)), R.mesh(tube(PATHS.dieOut.pts.slice(Math.floor(PATHS.dieOut.pts.length * 0.38)), 0.08))];
      const gx = 3.5, g = [];
      for (const [x, z] of [[-2.35, -1.25], [2.35, -1.25], [-2.35, 1.25], [2.35, 1.25]]) g.push([gx + x, 0.06, z], [gx + x, 1.75, z]);
      guideMesh = R.mesh(geo.lines(g, g.map(() => [0.6, 0.6, 0.9])));
      ptMesh = R.mesh({ positions: ptPos, colors: ptCol }, { mode: 'points', dynamic: true });
      if (!st.inited) { cam.attach(st.el); makeLabels(); setStep(0); st.inited = true; }
    },
    frame(R, st, t, dt) {
      const gl = R.gl;
      cam.update(dt);
      if (playing && scene === 'pc') { playT += dt; if (playT > 5.5) { playT = 0; if (step === STEPS.length - 1) { playing = false; updPlay(); } else setStep(step + 1); } }
      const { view, proj, eye } = cam.matrices(st.aspect);
      if (st.aspect < 1 && scene === 'pc') proj[9] = -0.4; // portrait: lift the scene above the info panel
      const vp = m4.mul(proj, view);
      R.clear(0.027, 0.016, 0.06, 1);
      const s = STEPS[step];
      const f = scene === 'pc' ? s.focus : [];
      const focus = [f[0] && f[0] !== 'all' ? f[0] : -9, f[1] || -9, f[2] || -9, f.includes('all') ? 1 : 0];
      const base = { u_view: view, u_proj: proj, u_eye: eye, u_time: t, u_focus: focus, u_dim: f.length && !f.includes('all') ? 1 : 0 };
      if (scene === 'pc') {
        R.draw(pcMesh, prog, { ...base, u_model: m4.identity() });
        for (const fx of [2.55, 4.45]) R.draw(fanMesh, prog, { ...base, u_model: m4.mulAll(m4.translation(fx, 1.82, 0), m4.rotY(t * 7 + fx)) });
        R.draw(screenMesh, screenProg, { u_model: m4.translation(0.6, 2.95, -4.49), u_view: view, u_proj: proj, u_time: t, u_bright: step === 6 || step === 7 ? 1.25 : 0.85 });
        // bus tubes
        R.draw(tubes[0], prog, { ...base, u_model: m4.identity(), u_focus: [ID.PCIE, -9, -9, 0], u_dim: 0 });
        R.draw(tubes[1], prog, { ...base, u_model: m4.identity(), u_focus: [step === 6 ? 0 : -9, -9, -9, 0], u_dim: 0 });
        R.blend('alpha'); R.draw(guideMesh, lineProg, { u_vp: vp, u_alpha: 0.35 }); R.blend(null);
        // data packets
        let n = 0;
        for (const key of s.paths) {
          const p = PATHS[key], count = Math.max(4, Math.round(p.total * 1.6));
          for (let k = 0; k < count && n < MAX_PT; k++) {
            const u = ((t * 0.35 * (4 / p.total)) + k / count) % 1, pos = p.at(u);
            ptPos.set(pos, n * 3); ptCol.set(p.color, n * 3); n++;
          }
        }
        if (n) {
          ptMesh.update(0, ptPos); ptMesh.update(3, ptCol);
          R.blend('add'); gl.depthMask(false);
          R.draw(ptMesh, ptProg, { u_vp: vp, u_size: 0.55 * st.h }, n);
          gl.depthMask(true); R.blend(null);
        }
        labelsPC.update(vp, st.cssW, st.cssH);
      } else {
        R.draw(chipMesh, prog, { ...base, u_model: m4.identity(), u_focus: [-9, -9, -9, 0], u_dim: 0 });
        labelsChip.update(vp, st.cssW, st.cssH);
      }
    },
  });
})();
