/* LEVEL 12 — post-processing: render scene → texture → full-screen effect shader */
(function () {
  'use strict';
  const { glsl, geo, m4, $, hexToRgb } = SL;

  const FX = [
    { k: 'gray', name: '⚫ grayscale', code: `vec3 effect(vec2 uv) {
  vec3 c = texture(u_tex, uv).rgb;
  // human eyes are most sensitive to green
  float gray = dot(c, vec3(0.299, 0.587, 0.114));
  return vec3(gray);
}` },
    { k: 'invert', name: '🔄 invert', code: `vec3 effect(vec2 uv) {
  return 1.0 - texture(u_tex, uv).rgb;
}` },
    { k: 'pixel', name: '👾 pixelate', code: `vec3 effect(vec2 uv) {
  float size = 10.0;                       // block size in pixels
  vec2 block = floor(uv * u_res / size) * size + size * 0.5;
  return texture(u_tex, block / u_res).rgb;  // one sample per block
}` },
    { k: 'blur', name: '🌫 blur', code: `vec3 effect(vec2 uv) {
  vec3 sum = vec3(0.0);
  for (int x = -3; x <= 3; x++)
    for (int y = -3; y <= 3; y++)
      sum += texture(u_tex, uv + vec2(x, y) * 2.0 / u_res).rgb;
  return sum / 49.0;                       // average of 49 neighbours
}` },
    { k: 'edges', name: '✏️ edge detect', code: `vec3 effect(vec2 uv) {
  vec2 p = 1.0 / u_res;                    // one pixel
  // Sobel filter: compare brightness of neighbours
  float tl = lum(uv + p * vec2(-1, 1)), t = lum(uv + p * vec2(0, 1)), tr = lum(uv + p * vec2(1, 1));
  float l  = lum(uv + p * vec2(-1, 0)),                              r  = lum(uv + p * vec2(1, 0));
  float bl = lum(uv + p * vec2(-1,-1)), b = lum(uv + p * vec2(0,-1)), br = lum(uv + p * vec2(1,-1));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = length(vec2(gx, gy));
  return mix(vec3(0.02, 0.0, 0.06), vec3(0.2, 1.0, 1.0), edge * 2.5);
}` },
    { k: 'chroma', name: '🌈 chromatic', code: `vec3 effect(vec2 uv) {
  vec2 dir = uv - 0.5;                     // away from centre
  float amount = 0.015;
  float r = texture(u_tex, uv + dir * amount).r;
  float g = texture(u_tex, uv).g;
  float b = texture(u_tex, uv - dir * amount).b;
  return vec3(r, g, b);                    // RGB split like a cheap lens
}` },
    { k: 'crt', name: '📺 CRT', code: `vec3 effect(vec2 uv) {
  vec2 c = uv - 0.5;
  c *= 1.0 + dot(c, c) * 0.3;              // bulge the glass
  vec2 q = c + 0.5;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return vec3(0.0);
  vec3 col = texture(u_tex, q).rgb;
  col *= 0.7 + 0.3 * sin(q.y * u_res.y * 1.2);       // scanlines
  col *= 0.85 + 0.15 * sin(q.x * u_res.x * 2.1 + vec3(0.0, 2.1, 4.2)); // RGB mask
  col *= 1.0 - dot(c, c) * 1.4;            // vignette
  return col * 1.35;
}` },
    { k: 'poster', name: '🎨 posterize', code: `vec3 effect(vec2 uv) {
  vec3 c = texture(u_tex, uv).rgb;
  float levels = 4.0;                      // only 4 shades per channel
  return floor(c * levels + 0.5) / levels;
}` },
    { k: 'thermal', name: '🔥 thermal', code: `vec3 effect(vec2 uv) {
  float t = lum(uv);                       // brightness → "heat"
  vec3 a = vec3(0.0, 0.0, 0.3), b = vec3(0.6, 0.0, 0.8);
  vec3 c = vec3(1.0, 0.2, 0.2), d = vec3(1.0, 0.95, 0.2);
  if (t < 0.33) return mix(a, b, t * 3.0);
  if (t < 0.66) return mix(b, c, (t - 0.33) * 3.0);
  return mix(c, d, (t - 0.66) * 3.0);
}` },
    { k: 'water', name: '🌊 underwater', code: `vec3 effect(vec2 uv) {
  uv.x += sin(uv.y * 30.0 + u_time * 3.0) * 0.006;   // wobble
  uv.y += cos(uv.x * 25.0 + u_time * 2.0) * 0.006;
  return texture(u_tex, uv).rgb * vec3(0.55, 0.9, 1.15);
}` },
    { k: 'halftone', name: '⚪ halftone', code: `vec3 effect(vec2 uv) {
  float size = 9.0;
  vec2 p = uv * u_res;
  vec2 cell = floor(p / size) * size + size * 0.5;
  vec3 c = texture(u_tex, cell / u_res).rgb;
  float radius = size * 0.6 * sqrt(lum(cell / u_res));  // bright = big dot
  return length(p - cell) < radius ? c * 1.3 : vec3(0.04, 0.02, 0.08);
}` },
    { k: 'kaleido', name: '🔮 kaleidoscope', code: `vec3 effect(vec2 uv) {
  vec2 p = uv - 0.5;
  float angle = atan(p.y, p.x), radius = length(p);
  float slice = 6.2831 / 8.0;              // 8 mirrored slices
  angle = abs(mod(angle + u_time * 0.2, slice) - slice * 0.5);
  return texture(u_tex, 0.5 + radius * vec2(cos(angle), sin(angle))).rgb;
}` },
    { k: 'bloom', name: '✨ bloom', code: `vec3 effect(vec2 uv) {
  vec3 c = texture(u_tex, uv).rgb, glow = vec3(0.0);
  for (int i = 1; i < 24; i++) {           // spiral of samples
    float a = float(i) * 2.4, r = sqrt(float(i)) * 4.0;
    vec3 s = texture(u_tex, uv + vec2(cos(a), sin(a)) * r / u_res).rgb;
    glow += max(s - 0.55, 0.0);            // keep only the bright parts
  }
  return c + glow * 0.3;
}` },
  ];
  const PRE = `in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_res; uniform float u_split, u_time; out vec4 fragColor;
float lum(vec2 uv) { return dot(texture(u_tex, uv).rgb, vec3(0.299, 0.587, 0.114)); }
`;
  const POST = `
void main() { vec3 orig = texture(u_tex, v_uv).rgb; fragColor = vec4(v_uv.x < u_split ? orig : effect(v_uv), 1.0); }`;

  const SCENE_FS = glsl.fs(`in vec3 v_normal; in vec3 v_world; in vec2 v_uv; uniform vec3 u_eye, u_color; uniform float u_floor; out vec4 fragColor;
void main(){
  if (u_floor > 0.5) {
    vec2 g = abs(fract(v_world.xz) - 0.5) / fwidth(v_world.xz);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    float fade = exp(-length(v_world.xz) * 0.12);
    fragColor = vec4(mix(vec3(0.08, 0.03, 0.15), vec3(0.15, 0.9, 1.0), line * fade) , 1.0); return;
  }
  vec3 n = normalize(v_normal), l = normalize(vec3(0.5, 0.9, 0.3)), v = normalize(u_eye - v_world);
  float d = max(dot(n, l), 0.0), s = pow(max(dot(n, normalize(l + v)), 0.0), 60.0), rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  fragColor = vec4(u_color * (0.2 + 0.85 * d) + s + rim * u_color * 0.8, 1.0);
}`);
  const SKY_FS = glsl.fs(`in vec2 v_uv; out vec4 fragColor; void main(){ vec3 c = mix(vec3(0.1, 0.03, 0.2), vec3(0.95, 0.3, 0.55), pow(max(v_uv.y - 0.3, 0.0) / 0.7, 1.6) * 0.8); float sun = smoothstep(0.16, 0.15, length((v_uv - vec2(0.5, 0.62)) * vec2(1.6, 1.0))); c = mix(c, vec3(1.0, 0.85, 0.3), sun * step(0.5, fract(v_uv.y * 40.0)) + sun * step(0.64, v_uv.y)); fragColor = vec4(c, 1.0); }`);

  let fx = FX[0], split = 0.5, progs = {}, P = {}, M = {}, rt;
  $('#pfx-list').innerHTML = FX.map((f) => `<button data-v="${f.k}">${f.name}</button>`).join('');
  SL.tabs('#pfx-list', (k) => {
    fx = FX.find((f) => f.k === k);
    const pre = $('#pfx-code'); pre.classList.remove('hl-done'); SL.renderCode(pre, '// u_tex = the rendered scene (a texture)\n// runs once per screen pixel\n' + fx.code);
    $('#pfx-tag').textContent = fx.name.replace(/^\S+\s/, '');
    SL.xp.award('pfx-' + k, 5, null);
  }, 'edges');
  const stageEl = $('#pfx-stage'), divider = $('#pfx-divider');
  const setSplit = (x) => { split = SL.clamp(x, 0, 1); divider.style.left = split * 100 + '%'; };
  setSplit(0.5);
  SL.drag(stageEl, { down(p) { setSplit(p.x / stageEl.clientWidth); SL.xp.award('pfx-split', 10, 'for comparing before & after'); }, move(p) { setSplit(p.x / stageEl.clientWidth); } });

  const objs = [
    { g: () => geo.torusKnot(0.7, 0.24, 160, 24), c: '#ff3d9a' },
    { g: () => geo.sphere(0.45, 32, 20), c: '#22e4ff' }, { g: () => geo.box(0.7, 0.7, 0.7), c: '#ffd23f' },
    { g: () => geo.sphere(0.35, 32, 20), c: '#7cff6b' }, { g: () => geo.torus(0.4, 0.15, 16, 40), c: '#9b5cff' }, { g: () => geo.box(0.5, 0.5, 0.5), c: '#ff8a3d' },
  ];
  SL.stage(stageEl, {
    setup(R, st) {
      progs = {}; for (const f of FX) progs[f.k] = R.program(glsl.fullscreenVS, glsl.fs(PRE + f.code + POST));
      P.scene = R.program(glsl.litVS, SCENE_FS); P.sky = R.program(glsl.fullscreenVS, SKY_FS);
      M.objs = objs.map((o) => R.mesh(o.g())); M.floor = R.mesh(geo.plane(60, 60, 1, 1));
      rt = R.target(st.w, st.h);
    },
    frame(R, st, t) {
      rt.resize(st.w, st.h);
      const a = t * 0.15, eye = [7 * Math.sin(a), 2.6, 7 * Math.cos(a)];
      const view = m4.lookAt(eye, [0, 0.9, 0]), proj = m4.perspective(0.75, st.aspect, 0.1, 100);
      // ---- pass 1: draw the 3D scene into a texture ----
      R.bind(rt); R.clear(0, 0, 0, 1); R.fullscreen(P.sky, {});
      const U = { u_view: view, u_proj: proj, u_eye: eye, u_floor: 0 };
      R.draw(M.floor, P.scene, { ...U, u_model: m4.identity(), u_floor: 1, u_color: [1, 1, 1] });
      R.draw(M.objs[0], P.scene, { ...U, u_model: m4.mulAll(m4.translation(0, 1.3, 0), m4.rotY(t * 0.6), m4.rotX(t * 0.3)), u_color: hexToRgb(objs[0].c) });
      for (let i = 1; i < objs.length; i++) {
        const ang = t * 0.5 + i * 1.256, r = 2.5;
        R.draw(M.objs[i], P.scene, { ...U, u_model: m4.mulAll(m4.translation(r * Math.cos(ang), 0.6 + 0.35 * Math.sin(t * 1.5 + i), r * Math.sin(ang)), m4.rotY(t + i), m4.rotX(t * 0.7)), u_color: hexToRgb(objs[i].c) });
      }
      // ---- pass 2: full-screen quad + effect shader, reading that texture ----
      R.bind(null);
      R.fullscreen(progs[fx.k], { u_tex: rt.tex, u_res: [st.w, st.h], u_split: split, u_time: t });
    },
  });
})();
