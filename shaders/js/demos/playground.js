/* LEVEL 15 — the playground: live-compiled fragment shaders */
(function () {
  'use strict';
  const { glsl, $, $$ } = SL;
  const HEADER = `uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
out vec4 fragColor;
`;
  const PRESETS = {
    '🌈 Neon plasma': `void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float t = u_time * 0.6;
  float v = sin(uv.x * 3.0 + t)
          + sin(uv.y * 4.0 - t * 1.3)
          + sin(length(uv * 3.0) * 2.0 - t * 2.0)
          + sin((uv.x + uv.y) * 2.5 + t);
  vec3 col = 0.5 + 0.5 * cos(3.14159 * v * 0.5 + vec3(0.0, 2.0, 4.0) + t);
  fragColor = vec4(col * col * 1.2, 1.0);
}`,
    '🌅 Synthwave sunset': `void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  vec3 col = mix(vec3(0.1, 0.02, 0.25), vec3(1.0, 0.3, 0.55), smoothstep(-0.2, 1.0, uv.y));

  // a striped sun
  vec2 s = uv - vec2(0.0, 0.25);
  float sun = smoothstep(0.52, 0.5, length(s));
  float stripes = step(0.0, sin(uv.y * 60.0 - u_time * 2.0)) + step(0.25, uv.y);
  vec3 sunCol = mix(vec3(1.0, 0.2, 0.6), vec3(1.0, 0.85, 0.2), smoothstep(-0.2, 0.7, uv.y));
  col = mix(col, sunCol, sun * min(stripes, 1.0));

  // an endless neon grid
  if (uv.y < -0.1) {
    float depth = 1.0 / (-0.1 - uv.y + 0.001);
    vec2 g = vec2(uv.x * depth, depth + u_time * 2.0);
    vec2 grid = abs(fract(g) - 0.5) / fwidth(g);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);
    col = mix(vec3(0.05, 0.0, 0.12), vec3(0.2, 0.9, 1.0), line);
    col += vec3(1.0, 0.2, 0.6) * 0.35 * exp(-depth * 0.15);
  }
  fragColor = vec4(col, 1.0);
}`,
    '🫧 Raymarched blobs': `float map(vec3 p) {
  float d = 1e9;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec3 c = vec3(sin(u_time * 0.7 + fi * 1.7), cos(u_time * 0.9 + fi * 2.3), sin(u_time * 0.5 + fi)) * 0.9;
    float s = length(p - c) - 0.45;
    float k = 0.5, h = clamp(0.5 + 0.5 * (d - s) / k, 0.0, 1.0);
    d = mix(d, s, h) - k * h * (1.0 - h);      // smooth union
  }
  return d;
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  vec3 ro = vec3(0.0, 0.0, 3.5), rd = normalize(vec3(uv, -1.6));
  float t = 0.0;
  for (int i = 0; i < 80; i++) {
    float d = map(ro + rd * t);
    if (d < 0.001 || t > 10.0) break;
    t += d;
  }
  vec3 col = vec3(0.05, 0.02, 0.1) + 0.08 * uv.y;
  if (t < 10.0) {
    vec3 p = ro + rd * t;
    vec2 e = vec2(0.001, 0.0);
    vec3 n = normalize(vec3(map(p + e.xyy) - map(p - e.xyy),
                            map(p + e.yxy) - map(p - e.yxy),
                            map(p + e.yyx) - map(p - e.yyx)));
    vec3 l = normalize(vec3(0.6, 0.7, 0.5));
    vec3 base = 0.5 + 0.5 * cos(6.2831 * (n.y * 0.3 + u_time * 0.1 + vec3(0.0, 0.33, 0.67)));
    float dif = max(dot(n, l), 0.0);
    float spec = pow(max(dot(reflect(-l, n), -rd), 0.0), 32.0);
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col = base * (0.2 + 0.8 * dif) + spec + rim * vec3(1.0, 0.3, 0.7);
  }
  fragColor = vec4(col, 1.0);
}`,
    '🔮 Mandelbrot dive': `void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  float zoom = exp(-mod(u_time * 0.35, 9.0));
  vec2 c = vec2(-0.743643887, 0.131825904) + uv * zoom * 1.5;
  vec2 z = vec2(0.0);
  float i;
  for (i = 0.0; i < 300.0; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;   // z = z² + c
    if (dot(z, z) > 16.0) break;
  }
  float s = i - log2(log2(dot(z, z))) + 4.0;               // smooth count
  vec3 col = 0.5 + 0.5 * cos(3.0 + s * 0.15 + vec3(0.0, 0.6, 1.0));
  if (i >= 300.0) col = vec3(0.0);
  fragColor = vec4(col, 1.0);
}`,
    '🧊 Voronoi cells': `vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.y * 6.0;
  vec2 cell = floor(uv), f = fract(uv);
  float best = 8.0, second = 8.0;
  vec2 bestId = vec2(0.0);
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 o = 0.5 + 0.45 * sin(u_time + 6.2831 * hash2(cell + g));   // wobbly seeds
    float d = length(g + o - f);
    if (d < best) { second = best; best = d; bestId = cell + g; }
    else if (d < second) second = d;
  }
  vec3 col = 0.5 + 0.5 * cos(6.2831 * (hash2(bestId).x + vec3(0.0, 0.33, 0.67)));
  col *= 0.55 + 0.45 * best;
  col = mix(vec3(1.0), col, smoothstep(0.0, 0.06, second - best));      // borders
  fragColor = vec4(col, 1.0);
}`,
    '🌀 Infinite tunnel': `void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  uv += 0.1 * vec2(sin(u_time * 0.7), cos(u_time * 0.5));
  float angle = atan(uv.y, uv.x);
  float r = length(uv);
  vec2 t = vec2(angle / 3.14159, 0.4 / r + u_time * 0.6);   // polar → tunnel
  float check = mod(floor(t.x * 8.0) + floor(t.y * 4.0), 2.0);
  vec3 col = mix(vec3(1.0, 0.2, 0.6), vec3(0.15, 0.85, 1.0), check);
  col *= 0.6 + 0.4 * cos(t.y * 2.0 + vec3(0.0, 1.0, 2.0));
  col *= smoothstep(0.0, 0.7, r);                          // far = dark
  fragColor = vec4(col, 1.0);
}`,
    '🔥 Fire': `float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = vec2(uv.x * u_resolution.x / u_resolution.y, uv.y);
  float n = fbm(p * 4.0 - vec2(0.0, u_time * 2.5));
  float shape = 1.0 - uv.y * 1.3 - abs(uv.x - 0.5) * 1.6;
  float flame = clamp(shape + (n - 0.5) * 1.3, 0.0, 1.0);
  vec3 col = vec3(flame * 1.6, pow(flame, 1.8) * 1.1, pow(flame, 4.0) * 0.9);
  fragColor = vec4(col, 1.0);
}`,
    '⭐ Warp speed': `float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
  vec3 col = vec3(0.01, 0.0, 0.03);
  for (float layer = 0.0; layer < 1.0; layer += 0.2) {
    float depth = fract(layer + u_time * 0.12);
    float scale = mix(18.0, 0.6, depth);
    float fade = depth * smoothstep(1.0, 0.85, depth);
    vec2 p = uv * scale + layer * 37.0;
    vec2 id = floor(p), f = fract(p) - 0.5;
    float h = hash(id);
    vec2 offs = vec2(h, fract(h * 13.7)) - 0.5;
    float d = length(f - offs * 0.7);
    float star = 0.015 / d * smoothstep(0.5, 0.1, d) * step(0.55, h);
    col += star * fade * (0.6 + 0.4 * cos(h * 20.0 + vec3(0.0, 1.0, 2.0)));
  }
  fragColor = vec4(col, 1.0);
}`,
    '✏️ Blank canvas': `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  // your masterpiece here ✨
  vec3 col = vec3(uv, 0.5 + 0.5 * sin(u_time));
  fragColor = vec4(col, 1.0);
}`,
  };
  const sel = $('#pg-preset');
  sel.innerHTML = Object.keys(PRESETS).map((k) => `<option>${k}</option>`).join('');
  let prog = null, R0 = null, code = PRESETS['🌈 Neon plasma'], userEdited = false, mouse = [0, 0];
  const LINE_OFFSET = 2 + HEADER.split('\n').length - 1;
  const editor = new SL.Editor($('#pg-editor'), { code, onChange: (c) => { code = c; compile(); } });
  editor.ta.addEventListener('input', () => { userEdited = true; });
  function compile() {
    if (!R0) return;
    const r = R0.tryProgram(glsl.fullscreenVS, glsl.fs(HEADER + code));
    if (r.ok) { prog = r.program; editor.setErrors(null); if (userEdited) SL.xp.award('pg-compile', 40, 'for compiling your own shader! 🎉'); }
    else editor.setErrors(r.error, LINE_OFFSET);
  }
  sel.addEventListener('change', () => { editor.value = PRESETS[sel.value]; userEdited = false; });
  const st = SL.stage('#pg-stage', {
    setup(R) { R0 = R; compile(); },
    frame(R, s, t) {
      if (s.mouse.inside) mouse = [s.mouse.nx * s.w, s.mouse.ny * s.h];
      if (prog) R.fullscreen(prog, { u_resolution: [s.w, s.h], u_mouse: mouse, u_time: t });
      if (s.frameCount % 6 === 0) $('#pg-time').textContent = `t = ${t.toFixed(1)}s`;
    },
    teardown() { R0 = null; prog = null; },
  }, { maxDpr: 1.5 });
  $('#pg-pause').addEventListener('click', (e) => { st.paused = !st.paused; e.target.textContent = st.paused ? '▶ play' : '⏸ pause'; });
  $('#pg-restart').addEventListener('click', () => { st.time = 0; });
  $('#pg-full').addEventListener('click', () => { const el = $('#pg-stage'); (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); });
  $('#pg-copy').addEventListener('click', (e) => SL.copy(editor.value, e.target));
  $('#pg-random').addEventListener('click', () => {
    const keys = Object.keys(PRESETS).filter((k) => k !== sel.value && !k.includes('Blank'));
    sel.value = keys[Math.floor(Math.random() * keys.length)]; editor.value = PRESETS[sel.value]; userEdited = false;
  });
  $$('.cheat').forEach((c) => c.addEventListener('click', () => {
    const ta = editor.ta, snippet = $('code', c).textContent;
    ta.focus(); ta.setRangeText(snippet, ta.selectionStart, ta.selectionEnd, 'end');
    editor.render(); editor.schedule(); userEdited = true;
    SL.toast('Snippet inserted at the cursor ✍️');
  }));
  SL.playground = {
    load(src, label) {
      let opt = [...sel.options].find((o) => o.dataset.custom); if (!opt) { opt = document.createElement('option'); opt.dataset.custom = '1'; sel.appendChild(opt); }
      opt.textContent = '📥 ' + label; sel.value = opt.textContent; editor.value = src; userEdited = true;
      $('#playground').scrollIntoView({ behavior: 'smooth' });
    },
  };
})();
