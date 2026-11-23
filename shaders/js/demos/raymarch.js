/* LEVEL 11 — raymarching: 2D sphere tracing visualizer + 3D SDF scene */
(function () {
  'use strict';
  const { glsl, OrbitCamera, $ } = SL;

  /* ===================== 2D sphere tracing ===================== */
  const cv = $('#sdf-canvas'), ctx = SL.canvas2d(cv, () => { field = null; });
  let field = null, eye = { x: 0.07, y: 0.55 }, aim = { x: 0.55, y: 0.42 }, shown = 0, auto = true, acc = 0, drag = null;
  const shapes = () => {
    const W = ctx.W, H = ctx.H;
    return [
      { t: 'c', x: 0.66 * W, y: 0.32 * H, r: 0.13 * H },
      { t: 'c', x: 0.86 * W, y: 0.72 * H, r: 0.1 * H },
      { t: 'b', x: 0.45 * W, y: 0.8 * H, hx: 0.12 * H, hy: 0.08 * H },
      { t: 'c', x: 0.3 * W, y: 0.2 * H, r: 0.07 * H },
    ];
  };
  function sdf(px, py, S) {
    let d = 1e9;
    for (const s of S) {
      let v;
      if (s.t === 'c') v = Math.hypot(px - s.x, py - s.y) - s.r;
      else { const qx = Math.abs(px - s.x) - s.hx, qy = Math.abs(py - s.y) - s.hy; v = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 6; }
      d = Math.min(d, v);
    }
    return d;
  }
  function buildField() {
    const W = ctx.W, H = ctx.H, s = 2, w = Math.ceil(W / s), h = Math.ceil(H / s), S = shapes();
    const off = document.createElement('canvas'); off.width = w; off.height = h;
    const o = off.getContext('2d'), img = o.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = sdf(x * s, y * s, S), k = (y * w + x) * 4;
      const band = Math.abs(((d / 18) % 1 + 1) % 1 - 0.5) * 2, edge = Math.max(0, 1 - Math.abs(d) / 2.5);
      let c;
      if (d > 0) { const f = Math.exp(-d / 220); c = [20 + 40 * f, 20 + 90 * f, 60 + 150 * f].map((v) => v * (0.75 + 0.25 * band)); }
      else c = [255 * (0.6 + 0.2 * band), 120 * (0.6 + 0.2 * band), 40];
      c = c.map((v) => v + (255 - v) * edge);
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
    o.putImageData(img, 0, 0); field = off;
  }
  function march() {
    const W = ctx.W, H = ctx.H, S = shapes(), ex = eye.x * W, ey = eye.y * H;
    let dx = aim.x * W - ex, dy = aim.y * H - ey; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const steps = []; let px = ex, py = ey, hit = false;
    for (let i = 0; i < 60; i++) {
      const d = sdf(px, py, S); steps.push({ x: px, y: py, d });
      if (d < 0.8) { hit = true; break; }
      px += dx * d; py += dy * d;
      if (px < -20 || py < -20 || px > W + 20 || py > H + 20) break;
    }
    return { steps, hit, dx, dy };
  }
  function draw() {
    const W = ctx.W, H = ctx.H;
    if (!field) buildField();
    ctx.drawImage(field, 0, 0, W, H);
    const { steps, hit, dx, dy } = march(), n = Math.min(shown, steps.length);
    const ex = eye.x * W, ey = eye.y * H;
    // full ray (faint)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + dx * 3000, ey + dy * 3000); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < n; i++) {
      const s = steps[i], last = i === n - 1;
      ctx.fillStyle = last ? 'rgba(34,228,255,0.18)' : 'rgba(34,228,255,0.06)'; ctx.strokeStyle = last ? '#22e4ff' : 'rgba(34,228,255,0.55)'; ctx.lineWidth = last ? 2.5 : 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(0, s.d), 0, 7); ctx.fill(); ctx.stroke();
      if (i > 0) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(steps[i - 1].x, steps[i - 1].y); ctx.lineTo(s.x, s.y); ctx.stroke(); }
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill();
      if (last && s.d > 14) { ctx.fillStyle = '#fff'; ctx.font = '600 12px JetBrains Mono'; ctx.fillText(`d = ${(s.d / H).toFixed(3)}`, s.x + 8, s.y - 8); }
    }
    if (n === steps.length && n > 0) {
      const s = steps[n - 1];
      ctx.font = '700 15px Space Grotesk'; ctx.fillStyle = hit ? '#ff3d9a' : '#a99cc9';
      if (hit) { ctx.shadowColor = '#ff3d9a'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.fillText('HIT! 🎯', s.x + 14, s.y + 5); }
      else ctx.fillText('missed → sky', Math.min(W - 110, Math.max(10, s.x)), Math.min(H - 10, Math.max(20, s.y)));
    }
    // handles
    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('👁', ex, ey); ctx.fillText('🎯', aim.x * W, aim.y * H); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    $('#sdf-steps').textContent = n;
    return steps.length;
  }
  $('#sdf-step').addEventListener('click', () => { auto = false; $('#sdf-auto').textContent = '⏵ animate'; shown++; const total = march().steps.length; if (shown > total) shown = 1; SL.xp.award('sdf-step', 10, 'for stepping a ray by hand'); });
  $('#sdf-auto').addEventListener('click', () => { auto = !auto; $('#sdf-auto').textContent = auto ? '⏸ pause' : '⏵ animate'; });
  SL.drag(cv, {
    down(p) {
      const W = ctx.W, H = ctx.H, de = Math.hypot(p.x - eye.x * W, p.y - eye.y * H), da = Math.hypot(p.x - aim.x * W, p.y - aim.y * H);
      drag = de < da ? eye : aim; SL.xp.award('sdf-drag', 10, 'for aiming a ray');
    },
    move(p) { drag.x = SL.clamp(p.x / ctx.W, 0.01, 0.99); drag.y = SL.clamp(p.y / ctx.H, 0.01, 0.99); shown = 999; },
    up() { drag = null; },
  });
  SL.animateWhileVisible(cv, (t, dt) => {
    if (auto && !drag) { acc += dt; if (acc > 0.45) { acc = 0; shown++; if (shown > march().steps.length + 3) shown = 0; } }
    draw();
  });

  /* ===================== 3D raymarcher ===================== */
  const FS = glsl.fs(`uniform vec2 u_resolution; uniform float u_time, u_k, u_heat; uniform vec3 u_eye, u_target;
out vec4 fragColor;
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec2 map(vec3 p) {
  float t = u_time;
  float s1 = length(p - vec3(sin(t) * 1.1, 1.0 + 0.3 * sin(t * 1.3), cos(t * 0.8) * 0.7)) - 0.55;
  float s2 = length(p - vec3(cos(t * 0.9) * 1.0, 0.9 + 0.25 * cos(t * 1.1), sin(t * 0.7) * 0.9)) - 0.45;
  vec3 q = p - vec3(0.0, 1.0, 0.0); q.yz *= rot(t * 0.5); q.xy *= rot(0.4);
  float tor = sdTorus(q, vec2(0.95, 0.17));
  float blob = smin(smin(s1, s2, u_k), tor, u_k);
  return blob < p.y ? vec2(blob, 1.0) : vec2(p.y, 2.0);
}
vec3 calcNormal(vec3 p) { vec2 e = vec2(0.001, -0.001);
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x); }
float softShadow(vec3 ro, vec3 rd) { float res = 1.0, t = 0.03;
  for (int i = 0; i < 40; i++) { float h = map(ro + rd * t).x; res = min(res, 9.0 * h / t); t += clamp(h, 0.02, 0.3); if (res < 0.002 || t > 8.0) break; }
  return clamp(res, 0.0, 1.0); }
float ambientOcclusion(vec3 p, vec3 n) { float o = 0.0, s = 1.0;
  for (int i = 0; i < 5; i++) { float h = 0.01 + 0.12 * float(i); o += (h - map(p + n * h).x) * s; s *= 0.85; }
  return clamp(1.0 - 2.5 * o, 0.0, 1.0); }
vec3 heat(float x) { return clamp(vec3(1.6 * x, 2.0 * x * x - 0.2, 4.0 * x * x * x * x - 1.0 + 0.6 * smoothstep(0.0, 0.3, x)), 0.0, 1.0); }
void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  vec3 ro = u_eye, ww = normalize(u_target - ro), uu = normalize(cross(ww, vec3(0, 1, 0))), vv = cross(uu, ww);
  vec3 rd = normalize(p.x * uu + p.y * vv + 1.8 * ww);
  // ---- the march ----
  float t = 0.0; int steps = 0; vec2 h = vec2(0.0);
  for (int i = 0; i < 128; i++) { h = map(ro + rd * t); if (h.x < 0.0005 * t || t > 40.0) break; t += h.x; steps = i; }
  vec3 sky = mix(vec3(0.45, 0.08, 0.4), vec3(0.04, 0.01, 0.1), clamp(rd.y * 2.5, 0.0, 1.0));
  vec3 col = sky;
  if (t < 40.0) {
    vec3 pos = ro + rd * t, n = calcNormal(pos), l = normalize(vec3(0.6, 0.8, 0.4));
    float dif = max(dot(n, l), 0.0) * softShadow(pos + n * 0.01, l), ao = ambientOcclusion(pos, n);
    vec3 base;
    if (h.y < 1.5) base = 0.55 + 0.45 * cos(6.2831 * (pos.y * 0.4 + n.x * 0.15 + u_time * 0.08 + vec3(0.0, 0.33, 0.67)));
    else {
      vec2 c = floor(pos.xz), g = abs(fract(pos.xz) - 0.5);
      base = mix(vec3(0.08, 0.03, 0.16), vec3(0.16, 0.06, 0.28), mod(c.x + c.y, 2.0));
      base += vec3(0.1, 0.8, 1.0) * smoothstep(0.46, 0.5, max(g.x, g.y)) * 1.5 * exp(-0.07 * t);   // neon grid lines
    }
    float spe = pow(max(dot(reflect(-l, n), -rd), 0.0), 40.0) * dif;
    col = base * (0.25 * ao + 1.15 * dif * vec3(1.0, 0.92, 0.88)) + base * 0.3 * (0.5 + 0.5 * n.y) * ao + spe * 0.9;
    col += pow(1.0 - max(dot(n, -rd), 0.0), 4.0) * vec3(1.0, 0.3, 0.7) * 0.35 * ao;
    col = mix(col, sky, 1.0 - exp(-0.0025 * t * t));
  }
  if (u_heat > 0.5) col = heat(float(steps) / 90.0);
  fragColor = vec4(col, 1.0);
}`);
  const cam = new OrbitCamera({ target: [0, 0.8, 0], dist: 5.2, theta: 0.4, phi: 1.2, minDist: 2.5, maxDist: 12, maxPhi: 1.5, autoRotate: 0.15 });
  let prog, k = 0.45, heatOn = false;
  SL.slider('#rm-k', (v) => { k = v; }, (v) => v.toFixed(2));
  $('#rm-heat').addEventListener('change', (e) => { heatOn = e.target.checked; if (heatOn) SL.xp.award('rm-heat', 15, 'for seeing the cost of every pixel'); });
  SL.stage('#rm-stage', {
    setup(R, st) { prog = R.program(glsl.fullscreenVS, FS); if (!st.inited) { cam.attach(st.el); st.inited = true; } },
    frame(R, st, t, dt) { cam.update(dt); R.fullscreen(prog, { u_resolution: [st.w, st.h], u_time: t, u_k: k, u_heat: heatOn ? 1 : 0, u_eye: cam.eye(), u_target: cam.target }); },
  }, { maxDpr: 1 });
})();
