/* LEVEL 08 — lighting lab (many shading models) + the N/L/V/R/H vector diagram */
(function () {
  'use strict';
  const { glsl, geo, m4, OrbitCamera, $, hexToRgb, clamp } = SL;

  const VS = glsl.vs(`in vec3 a_position; in vec3 a_normal; in vec2 a_uv;
uniform mat4 u_model, u_view, u_proj;
out vec3 v_normal; out vec3 v_world; out vec2 v_uv;
void main(){ vec4 w = u_model * vec4(a_position, 1.0); v_world = w.xyz; v_normal = mat3(u_model) * a_normal; v_uv = a_uv; gl_Position = u_proj * u_view * w; }`);
  const GOURAUD_VS = glsl.vs(`in vec3 a_position; in vec3 a_normal;
uniform mat4 u_model, u_view, u_proj; uniform vec3 u_lightPos, u_eye, u_color, u_lightColor;
out vec3 v_color;
void main(){
  vec4 w = u_model * vec4(a_position, 1.0);
  // lighting computed HERE, once per vertex…
  vec3 N = normalize(mat3(u_model) * a_normal);
  vec3 L = normalize(u_lightPos - w.xyz), V = normalize(u_eye - w.xyz);
  float diffuse = max(dot(N, L), 0.0);
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 32.0);
  v_color = u_color * (0.08 + diffuse) * u_lightColor + spec * u_lightColor;
  gl_Position = u_proj * u_view * w;
}`);
  const HEAD = `in vec3 v_normal; in vec3 v_world; in vec2 v_uv; in vec3 v_color;
uniform vec3 u_lightPos, u_eye, u_color, u_lightColor; uniform float u_time;
out vec4 fragColor;
`;
  const MODELS = [
    { k: 'normals', label: '🧭 normals', title: 'Normals as colours', desc: 'Not lighting yet — just <i>looking</i> at the surface direction. Red = faces +X, green = +Y, blue = +Z.', f: 'colour = N × 0.5 + 0.5',
      body: `void main() {
  vec3 N = normalize(v_normal);       // -1..1 per axis
  fragColor = vec4(N * 0.5 + 0.5, 1.0); // squeeze into 0..1
}` },
    { k: 'lambert', label: '☁️ lambert', title: 'Lambert (diffuse)', desc: 'Matte surfaces: brightness = how directly the surface faces the light. One dot product!', f: 'diffuse = max(N · L, 0)',
      body: `void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPos - v_world);  // to the light
  float diffuse = max(dot(N, L), 0.0);       // 1 = facing it
  vec3 col = u_color * (0.08 + diffuse * u_lightColor);
  fragColor = vec4(col, 1.0);
}` },
    { k: 'phong', label: '✨ phong', title: 'Phong (diffuse + specular)', desc: 'Adds a shiny highlight where the reflected light ray points into your eye.', f: 'spec = max(R · V, 0)ˢʰⁱⁿʸ',
      body: `void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPos - v_world);
  vec3 V = normalize(u_eye - v_world);       // to the eye
  vec3 R = reflect(-L, N);                   // mirrored light
  float diffuse = max(dot(N, L), 0.0);
  float spec = pow(max(dot(R, V), 0.0), 32.0);
  vec3 col = u_color * (0.08 + diffuse) * u_lightColor
           + spec * u_lightColor;
  fragColor = vec4(col, 1.0);
}` },
    { k: 'blinn', label: '💎 blinn-phong', title: 'Blinn-Phong', desc: 'A cheaper, nicer highlight using the <b>halfway vector</b> H between L and V. The default in games for decades.', f: 'spec = max(N · H, 0)ˢʰⁱⁿʸ',
      body: `void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPos - v_world);
  vec3 V = normalize(u_eye - v_world);
  vec3 H = normalize(L + V);                 // halfway vector
  float diffuse = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 96.0);
  vec3 col = u_color * (0.08 + diffuse) * u_lightColor
           + spec * u_lightColor;
  fragColor = vec4(col, 1.0);
}` },
    { k: 'gouraud', label: '🧱 gouraud', title: 'Gouraud (per-vertex)', desc: 'Old-school: light is computed in the <b>vertex shader</b> and the colour is interpolated. Cheap, but highlights look blotchy on a low-poly mesh.', f: 'light per vertex → interpolate', lo: true,
      body: `// the vertex shader did all the work:
//   v_color = u_color * (0.08 + diffuse) + spec;
void main() {
  fragColor = vec4(v_color, 1.0);   // just pass it on
}` },
    { k: 'flat', label: '🔷 flat', title: 'Flat shading', desc: 'One normal per triangle, rebuilt from screen-space derivatives. Gives that crisp low-poly look.', f: 'N = normalize(cross(dFdx(p), dFdy(p)))', lo: true,
      body: `void main() {
  // the triangle's own normal, from neighbouring pixels
  vec3 N = normalize(cross(dFdx(v_world), dFdy(v_world)));
  vec3 L = normalize(u_lightPos - v_world);
  float diffuse = max(dot(N, L), 0.0);
  fragColor = vec4(u_color * (0.1 + diffuse) * u_lightColor, 1.0);
}` },
    { k: 'toon', label: '🎨 toon', title: 'Toon / cel shading', desc: 'Chop the smooth light into a few flat bands and draw a dark outline where the surface turns away. Instant cartoon.', f: 'bands = floor(diffuse × 4) / 3',
      body: `void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPos - v_world);
  vec3 V = normalize(u_eye - v_world);
  float diffuse = max(dot(N, L), 0.0);
  float bands = floor(diffuse * 4.0) / 3.0;     // 4 flat steps
  vec3 col = u_color * (0.25 + 0.75 * bands);
  float spec = step(0.97, dot(N, normalize(L + V)));
  col += spec * 0.8;                            // hard highlight
  float edge = 1.0 - max(dot(N, V), 0.0);
  col = mix(col, vec3(0.04), smoothstep(0.62, 0.68, edge)); // ink
  fragColor = vec4(col, 1.0);
}` },
    { k: 'rim', label: '🌟 rim / fresnel', title: 'Rim light (Fresnel)', desc: 'Surfaces seen edge-on glow brighter. Great for force fields, ghosts and sci-fi suits.', f: 'rim = (1 − N · V)³',
      body: `void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_eye - v_world);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 L = normalize(u_lightPos - v_world);
  float diffuse = max(dot(N, L), 0.0) * 0.35;
  vec3 col = u_color * (0.05 + diffuse) + rim * u_color * 2.2;
  fragColor = vec4(col, 1.0);
}` },
    { k: 'gooch', label: '🌡 gooch', title: 'Gooch (warm ↔ cool)', desc: 'Technical-illustration style: surfaces facing the light are warm, facing away are cool — no pure black shadows.', f: 'colour = mix(cool, warm, (N · L + 1) / 2)',
      body: `void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPos - v_world);
  vec3 V = normalize(u_eye - v_world);
  float t = (dot(N, L) + 1.0) * 0.5;            // -1..1 → 0..1
  vec3 cool = vec3(0.05, 0.15, 0.6) + 0.25 * u_color;
  vec3 warm = vec3(1.0, 0.55, 0.1) + 0.25 * u_color;
  vec3 col = mix(cool, warm, t);
  col += pow(max(dot(N, normalize(L + V)), 0.0), 60.0);
  fragColor = vec4(col, 1.0);
}` },
    { k: 'holo', label: '👻 hologram', title: 'Hologram', desc: 'Transparent, glowing edges + scrolling scanlines built from the world-space height and <code>u_time</code>. Drawn with additive blending.', f: 'alpha = fresnel + scanlines',
      body: `void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_eye - v_world);
  float fres = pow(1.0 - abs(dot(N, V)), 2.0);
  float scan = 0.5 + 0.5 * sin(v_world.y * 50.0 - u_time * 6.0);
  float flicker = 0.92 + 0.08 * sin(u_time * 40.0);
  vec3 col = u_color * (fres * 1.8 + scan * 0.3) * flicker;
  fragColor = vec4(col, fres * 0.9 + scan * 0.2);
}`, blend: true },
    { k: 'irid', label: '🫧 iridescent', title: 'Iridescent', desc: 'Like a soap bubble: the hue shifts with the viewing angle. The trick behind the hero knot!', f: 'hue = f(N · V, time)',
      body: `void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_eye - v_world);
  vec3 L = normalize(u_lightPos - v_world);
  float ndv = max(dot(N, V), 0.0);
  vec3 hue = 0.5 + 0.5 * cos(6.2831 * (ndv * 1.2 + u_time * 0.1
                             + vec3(0.0, 0.33, 0.67)));
  float diffuse = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 80.0);
  vec3 col = hue * (0.2 + 0.8 * diffuse) + spec * 1.2;
  fragColor = vec4(col, 1.0);
}` },
  ];
  const SHAPES = {
    knot: [() => geo.torusKnot(0.85, 0.28, 220, 32), () => geo.torusKnot(0.85, 0.28, 60, 8)],
    sphere: [() => geo.sphere(1.25, 64, 40), () => geo.sphere(1.25, 14, 9)],
    torus: [() => geo.torus(1.05, 0.45, 40, 90), () => geo.torus(1.05, 0.45, 9, 18)],
    cube: [() => geo.box(1.7, 1.7, 1.7), () => geo.box(1.7, 1.7, 1.7)],
  };
  const ORB_FS = glsl.fs(`uniform vec3 u_lightColor; out vec4 fragColor; void main(){ fragColor = vec4(u_lightColor * 1.2, 1.0); }`);
  const BG_FS = glsl.fs(`in vec2 v_uv; out vec4 fragColor; void main(){ float v = length(v_uv - vec2(0.5, 0.45)); fragColor = vec4(mix(vec3(0.1,0.05,0.2), vec3(0.02,0.01,0.05), smoothstep(0.0, 0.8, v)), 1.0); }`);

  const cam = new OrbitCamera({ dist: 5.2, theta: 0.4, phi: 1.2, minDist: 2.5, maxDist: 10 });
  let model = MODELS[2], shape = 'knot', baseColor = hexToRgb('#ff3d9a'), lightColor = hexToRgb('#fff4d6'), orbit = true, lightAngle = 0.6;
  let progs = {}, meshes = {}, orb, orbProg, bg;
  $('#lt-model').innerHTML = MODELS.map((m) => `<button data-v="${m.k}">${m.label}</button>`).join('');
  SL.tabs('#lt-model', (k) => {
    model = MODELS.find((m) => m.k === k);
    $('#lt-formula').innerHTML = `<b>${model.title}</b>${model.desc}<span class="f">${model.f}</span>`;
    const pre = $('#lt-code'); pre.classList.remove('hl-done'); SL.renderCode(pre, model.k === 'gouraud' ? model.body : model.body);
    SL.xp.award('lt-' + k, 6, null);
  }, 'phong');
  SL.tabs('#lt-shape', (v) => { shape = v; }, 'knot');
  $('#lt-color').addEventListener('input', (e) => { baseColor = hexToRgb(e.target.value); });
  $('#lt-lcolor').addEventListener('input', (e) => { lightColor = hexToRgb(e.target.value); });
  $('#lt-orbit').addEventListener('change', (e) => { orbit = e.target.checked; });

  SL.stage('#lt-stage', {
    setup(R, st) {
      progs = {};
      for (const m of MODELS) progs[m.k] = R.program(m.k === 'gouraud' ? GOURAUD_VS : VS, glsl.fs(HEAD + m.body));
      meshes = {}; for (const k in SHAPES) meshes[k] = [R.mesh(SHAPES[k][0]()), R.mesh(SHAPES[k][1]())];
      orb = R.mesh(geo.sphere(0.09, 16, 10)); orbProg = R.program(VS, ORB_FS); bg = R.program(glsl.fullscreenVS, BG_FS);
      if (!st.inited) { cam.attach(st.el); st.inited = true; }
    },
    frame(R, st, t, dt) {
      const gl = R.gl;
      cam.update(dt);
      if (orbit) lightAngle += dt * 0.7;
      const lp = [2.6 * Math.cos(lightAngle), 1.6 + 0.6 * Math.sin(lightAngle * 0.7), 2.6 * Math.sin(lightAngle)];
      const { view, proj, eye } = cam.matrices(st.aspect);
      R.clear(0, 0, 0, 1); R.fullscreen(bg, {});
      const mdl = m4.mulAll(m4.rotY(t * 0.15), m4.rotX(shape === 'cube' ? 0.6 : 0.3), shape === 'cube' ? m4.rotZ(0.5) : m4.identity());
      const U = { u_model: mdl, u_view: view, u_proj: proj, u_lightPos: lp, u_eye: eye, u_color: baseColor, u_lightColor: lightColor, u_time: t };
      const mesh = meshes[shape][model.lo ? 1 : 0];
      if (model.blend) { R.blend('add'); gl.depthMask(false); R.draw(mesh, progs[model.k], U); gl.depthMask(true); R.blend(null); }
      else R.draw(mesh, progs[model.k], U);
      R.draw(orb, orbProg, { ...U, u_model: m4.translation(lp) });
    },
  });

  /* ======================== vectors diagram ======================== */
  const cv = $('#vec-canvas'), ctx = SL.canvas2d(cv, () => { dirty = true; });
  let aL = 2.2, aV = 0.55, shine = 24, drag = null, dirty = true;
  SL.slider('#vec-shine', (v) => { shine = v; dirty = true; });
  const geom = () => { const W = ctx.W, H = ctx.H, P = [W / 2, H * 0.74], R = Math.min(H * 0.6, W * 0.36); return { W, H, P, R }; };
  const dirOf = (a) => [Math.cos(a), Math.sin(a)];
  function arrow(P, d, len, col, label, w = 3) {
    const x = P[0] + d[0] * len, y = P[1] - d[1] * len;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(x, y); ctx.stroke();
    const a = Math.atan2(-d[1], d[0]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 13 * Math.cos(a - 0.4), y - 13 * Math.sin(a - 0.4)); ctx.lineTo(x - 13 * Math.cos(a + 0.4), y - 13 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.font = '700 15px JetBrains Mono, monospace'; ctx.fillText(label, x + d[0] * 14 - 5, y - d[1] * 14 + 5);
  }
  function draw() {
    const { W, H, P, R } = geom();
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, W, H);
    // surface
    ctx.fillStyle = '#1d1338'; ctx.fillRect(0, P[1], W, H - P[1]);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; for (let x = -H; x < W; x += 14) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + (H - P[1]), P[1]); ctx.stroke(); }
    ctx.strokeStyle = '#ff3d9a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, P[1]); ctx.lineTo(W, P[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P[0], P[1], R, Math.PI, 0); ctx.stroke();
    const N = [0, 1], L = dirOf(aL), V = dirOf(aV);
    const ndl = L[1], R2 = [2 * ndl * N[0] - L[0], 2 * ndl * N[1] - L[1]], Hh = (() => { const h = [L[0] + V[0], L[1] + V[1]], l = Math.hypot(...h) || 1; return [h[0] / l, h[1] / l]; })();
    const diff = Math.max(ndl, 0), rv = Math.max(R2[0] * V[0] + R2[1] * V[1], 0), nh = Math.max(Hh[1], 0);
    const phong = Math.pow(rv, shine), blinn = Math.pow(nh, shine * 2);
    // light beam
    const grad = ctx.createLinearGradient(P[0] + L[0] * R * 1.15, P[1] - L[1] * R * 1.15, P[0], P[1]);
    grad.addColorStop(0, 'rgba(255,210,63,0.35)'); grad.addColorStop(1, 'rgba(255,210,63,0)');
    ctx.strokeStyle = grad; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(P[0] + L[0] * R * 1.15, P[1] - L[1] * R * 1.15); ctx.lineTo(P[0], P[1]); ctx.stroke(); ctx.lineWidth = 1;
    // angle arc N-L
    ctx.strokeStyle = 'rgba(255,210,63,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); const a0 = -Math.PI / 2, a1 = -aL; ctx.arc(P[0], P[1], R * 0.28, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
    arrow(P, Hh, R * 0.62, '#9b5cff', 'H', 2.5);
    arrow(P, R2, R * 0.86, '#ff3d9a', 'R', 2.5);
    arrow(P, N, R * 0.8, '#7cff6b', 'N');
    arrow(P, L, R, '#ffd23f', 'L');
    arrow(P, V, R, '#22e4ff', 'V');
    ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('☀️', P[0] + L[0] * R * 1.15, P[1] - L[1] * R * 1.15); ctx.fillText('👁️', P[0] + V[0] * R * 1.15, P[1] - V[1] * R * 1.15);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(P[0], P[1], 5, 0, 7); ctx.fill();
    // meters
    const base = [255, 61, 154], col = base.map((c) => Math.round(clamp(c * (0.1 + diff) + 255 * blinn, 0, 255)));
    const m = (name, v, c, f) => `<div class="meter"><span>${name}</span><span style="text-align:right;color:${c}">${v.toFixed(2)}</span><div class="mbar"><i style="width:${v * 100}%;background:${c}"></i></div><span style="grid-column:1/-1;color:var(--dim);font-size:11px">${f}</span></div>`;
    $('#vec-meters').innerHTML = m('diffuse', diff, '#ffd23f', 'max(dot(N, L), 0)') + m('phong spec', phong, '#ff3d9a', `pow(max(dot(R, V), 0), ${shine})`) + m('blinn spec', blinn, '#9b5cff', `pow(max(dot(N, H), 0), ${shine * 2})`)
      + `<div class="meter"><span>pixel colour</span><span></span><div class="mbar" style="height:22px"><i style="width:100%;background:rgb(${col})"></i></div></div>`;
    dirty = false;
  }
  const onMove = (p) => { const { P } = geom(); const a = clamp(Math.atan2(P[1] - p.y, p.x - P[0]), 0.04, Math.PI - 0.04); if (drag === 'L') aL = a; else aV = a; dirty = true; };
  SL.drag(cv, {
    down(p) {
      const { P, R } = geom();
      const dist = (a) => Math.hypot(P[0] + Math.cos(a) * R * 1.15 - p.x, P[1] - Math.sin(a) * R * 1.15 - p.y);
      drag = dist(aL) < dist(aV) ? 'L' : 'V'; onMove(p); SL.xp.award('vec-drag', 15, 'for bending light by hand');
    },
    move: onMove,
    up() { drag = null; },
  });
  SL.animateWhileVisible(cv, () => { if (dirty) draw(); });
})();
