/* LEVEL 13 — GPGPU: particle simulation stored in float textures, updated by a shader */
(function () {
  'use strict';
  const { glsl, $ } = SL;
  const HASH = `float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
`;
  const INIT_FS = glsl.fs(`out vec4 o; uniform float u_aspect, u_seed;
${HASH}
void main(){
  vec2 id = gl_FragCoord.xy;
  float a = hash(id + u_seed) * 6.2831, r = sqrt(hash(id * 1.37 + 4.1 + u_seed)) * 0.9;
  o = vec4(vec2(cos(a) * u_aspect, sin(a)) * r, 0.0, 0.0);
}`);
  const UPDATE_FS = glsl.fs(`uniform sampler2D u_state; uniform float u_time, u_dt, u_aspect, u_mouseOn, u_kick; uniform vec2 u_mouse; uniform int u_mode;
out vec4 o;
${HASH}
vec2 curl(vec2 p){ float e = 0.02;
  float a = noise(p + vec2(0, e)), b = noise(p - vec2(0, e)), c = noise(p + vec2(e, 0)), d = noise(p - vec2(e, 0));
  return vec2(a - b, -(c - d)) / (2.0 * e); }
void main(){
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(u_state, ij, 0);          // read MY particle
  vec2 p = s.xy, v = s.zw;
  float rnd = hash(vec2(ij) * 0.731);
  if (u_mode == 0) {                             // 🌊 flow field
    vec2 target = curl(p * 1.3 + vec2(0.0, u_time * 0.07)) * 0.22 + curl(p * 3.1 - u_time * 0.05) * 0.06;
    v = mix(v, target, 0.06);
  } else if (u_mode == 1) {                      // 🌌 galaxy: stars on tilted ellipses → spiral arms
    float a = 0.05 + 0.92 * pow(hash(vec2(ij) * 0.37 + 1.3), 0.85);
    float phi = rnd * 6.2831 + u_time * 0.25 / (pow(a, 1.5) + 0.06);
    float th = a * 3.4;
    vec2 e = vec2(cos(phi) * a, sin(phi) * a * 0.7);
    vec2 target = mat2(cos(th), sin(th), -sin(th), cos(th)) * e * 0.95;
    v = (mix(p, target, 0.08) - p) / u_dt;
  } else {                                       // 💥 explode & regroup
    v += -p * 2.2 * u_dt;
    v += normalize(p + 1e-4) * u_kick * (0.6 + 2.6 * rnd);
    v *= 0.985;
  }
  if (u_mouseOn > 0.5) { vec2 d = u_mouse - p; v += d / (dot(d, d) + 0.03) * 0.045 * u_dt * 60.0 * 0.1; }
  p += v * u_dt;
  if (abs(p.x) > u_aspect * 1.15 || abs(p.y) > 1.15) {   // respawn
    float a = hash(vec2(ij) + u_time) * 6.2831, r = sqrt(hash(vec2(ij) * 1.7 + u_time)) * 0.8;
    p = vec2(cos(a) * u_aspect, sin(a)) * r; v = vec2(0.0);
  }
  o = vec4(p, v);                                // write MY new state
}`);
  const DRAW_VS = glsl.vs(`uniform sampler2D u_state; uniform int u_n; uniform float u_aspect, u_size, u_time;
out vec3 v_color;
void main(){
  ivec2 ij = ivec2(gl_VertexID % u_n, gl_VertexID / u_n);
  vec4 s = texelFetch(u_state, ij, 0);
  float speed = length(s.zw);
  float id = float(gl_VertexID) / float(u_n * u_n);
  v_color = 0.5 + 0.5 * cos(6.2831 * (speed * 1.2 + id * 0.35 + u_time * 0.03 + vec3(0.0, 0.33, 0.67)));
  v_color = mix(v_color, vec3(1.0, 0.25, 0.65), 0.25);
  gl_Position = vec4(s.x / u_aspect, s.y, 0.0, 1.0);
  gl_PointSize = u_size;
}`);
  const DRAW_FS = glsl.fs(`in vec3 v_color; uniform float u_alpha; out vec4 o; void main(){ o = vec4(v_color, u_alpha); }`);
  const FADE_FS = glsl.fs(`uniform float u_fade; out vec4 o; void main(){ o = vec4(0.02, 0.0, 0.05, u_fade); }`);
  const BLIT_FS = glsl.fs(`in vec2 v_uv; uniform sampler2D u_tex; out vec4 o; void main(){ vec3 c = texture(u_tex, v_uv).rgb; o = vec4(c / (1.0 + c * 0.25) + vec3(0.02, 0.01, 0.04), 1.0); }`);

  let N = 256, mode = 0, P = {}, A = null, B = null, trail = null, vao = null, R0 = null, needInit = true, kick = 0, kickT = 0, fpsAvg = 60, ok = true;
  const hudN = $('#pt-num'), hudF = $('#pt-fps');
  SL.tabs('#pt-count', (v) => { N = +v; needInit = true; hudN.textContent = (N * N).toLocaleString(); if (N >= 512) SL.xp.award('pt-big', 20, `for simulating ${(N * N).toLocaleString()} particles`); }, '256');
  SL.tabs('#pt-mode', (v) => { mode = { flow: 0, galaxy: 1, boom: 2 }[v]; kickT = 0; if (v === 'boom') { kick = 1; } SL.xp.award('pt-' + v, 5, null); }, 'flow');

  function init(R, st) {
    const gl = R.gl;
    A = R.target(N, N, { float: true, depth: false }); B = R.target(N, N, { float: true, depth: false });
    R.bind(A); R.fullscreen(P.init, { u_aspect: st.aspect, u_seed: Math.random() * 100 }); R.bind(B); R.fullscreen(P.init, { u_aspect: st.aspect, u_seed: 3.3 }); R.bind(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    needInit = false;
  }
  SL.stage('#pt-stage', {
    setup(R, st) {
      R0 = R; ok = !!R.floatExt;
      if (!ok) { $('.pt-hud').innerHTML = '😢 This GPU/browser can’t render to float textures (EXT_color_buffer_float), so the simulation is off.'; return; }
      P.init = R.program(glsl.fullscreenVS, INIT_FS); P.update = R.program(glsl.fullscreenVS, UPDATE_FS);
      P.draw = R.program(DRAW_VS, DRAW_FS); P.fade = R.program(glsl.fullscreenVS, FADE_FS); P.blit = R.program(glsl.fullscreenVS, BLIT_FS);
      vao = R.gl.createVertexArray();
      trail = R.target(st.w, st.h, { half: true, depth: false });
      needInit = true;
    },
    frame(R, st, t, dt) {
      if (!ok) return;
      const gl = R.gl;
      if (needInit) init(R, st);
      fpsAvg += ((dt > 0 ? 1 / dt : 60) - fpsAvg) * 0.05; if (st.frameCount % 20 === 0) hudF.textContent = Math.round(fpsAvg);
      if (mode === 2) { kickT += dt; if (kickT > 3.6) { kickT = 0; kick = 1; } }
      gl.disable(gl.DEPTH_TEST);
      // ---- 1. simulate: read A, write B (one fragment = one particle) ----
      R.bind(B);
      R.fullscreen(P.update, {
        u_state: A.tex, u_time: t, u_dt: 1 / 60, u_aspect: st.aspect, u_mode: mode, u_kick: kick,
        u_mouse: [(st.mouse.nx * 2 - 1) * st.aspect, st.mouse.ny * 2 - 1], u_mouseOn: st.mouse.inside ? 1 : 0,
      });
      kick = 0;
      [A, B] = [B, A];
      // ---- 2. draw: fade the trail, then add every particle as a point ----
      trail.resize(st.w, st.h);
      R.bind(trail);
      R.blend('alpha'); R.fullscreen(P.fade, { u_fade: mode === 1 ? 0.25 : 0.18 });
      R.blend('add');
      gl.useProgram(P.draw.p);
      P.draw.set({ u_state: A.tex, u_n: N, u_aspect: st.aspect, u_size: Math.max(1, (st.h / st.cssH) * (N >= 1024 ? 0.8 : 1.1)), u_time: t, u_alpha: SL.clamp(70000 / (N * N), 0.05, 0.55) });
      gl.bindVertexArray(vao); gl.drawArrays(gl.POINTS, 0, N * N); gl.bindVertexArray(null);
      R.blend(null);
      R.bind(null);
      R.fullscreen(P.blit, { u_tex: trail.tex });
      gl.enable(gl.DEPTH_TEST);
    },
    teardown() { A = B = trail = null; needInit = true; },
  }, { antialias: false });
})();
