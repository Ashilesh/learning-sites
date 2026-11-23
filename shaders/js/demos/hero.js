/* HERO — a domain-warped noise background + wobbly iridescent torus knot */
(function () {
  'use strict';
  const { glsl, geo, m4, OrbitCamera, $ } = SL;

  const BG_FS_BODY = `uniform vec2 u_resolution;
uniform vec2 u_mouse;      // 0..1
uniform float u_time;
in vec2 v_uv;
out vec4 fragColor;
${glsl.noise}
void main() {
  // centred coordinates, square pixels
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  p += (u_mouse - 0.5) * 0.15;               // gentle parallax
  float t = u_time * 0.08;

  // domain warping: feed noise into noise into noise
  vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.6 + 3.5 * q + vec2(1.7, 9.2) + t * 1.5),
                fbm(p * 1.6 + 3.5 * q + vec2(8.3, 2.8) - t * 1.2));
  float f = fbm(p * 1.6 + 3.0 * r);

  // neon synthwave palette
  vec3 col = palette(f * 1.4 + length(q) * 0.6 + t,
                     vec3(0.5, 0.3, 0.6), vec3(0.5, 0.4, 0.4),
                     vec3(1.0, 1.0, 1.0), vec3(0.85, 0.55, 0.25));
  col *= 0.25 + 1.1 * f * f;
  col += vec3(1.0, 0.25, 0.65) * pow(r.y, 4.0) * 0.6;

  // vignette + darken left side so text stays readable
  float vig = smoothstep(1.4, 0.2, length(p * vec2(0.8, 1.0)));
  col *= vig * mix(0.45, 1.0, smoothstep(-0.9, 0.4, p.x));
  fragColor = vec4(col, 1.0);
}`;

  const KNOT_VS_BODY = `in vec3 a_position;
in vec3 a_normal;
uniform mat4 u_model, u_view, u_proj;
uniform float u_time;
out vec3 v_normal;
out vec3 v_world;
void main() {
  // push each vertex along its normal with a travelling wave
  float wave = sin(u_time * 2.0 + a_position.x * 3.0 + a_position.y * 4.0);
  vec3 p = a_position + a_normal * 0.05 * wave;
  vec4 world = u_model * vec4(p, 1.0);
  v_world = world.xyz;
  v_normal = mat3(u_model) * a_normal;
  gl_Position = u_proj * u_view * world;
}`;
  const KNOT_FS_BODY = `in vec3 v_normal;
in vec3 v_world;
uniform vec3 u_eye;
uniform float u_time;
out vec4 fragColor;
void main() {
  vec3 n = normalize(v_normal);
  vec3 v = normalize(u_eye - v_world);          // to the eye
  vec3 l = normalize(vec3(0.6, 0.8, 0.5));      // to the light
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.5);   // edge glow
  // iridescence: hue depends on viewing angle + time
  vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fres * 0.9 + dot(n, vec3(0.3, 0.5, 0.2)) + u_time * 0.08 + vec3(0.0, 0.33, 0.67)));
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(n, normalize(l + v)), 0.0), 80.0);
  vec3 col = irid * (0.25 + 0.85 * diff) + spec * 1.2 + fres * vec3(1.0, 0.3, 0.8);
  fragColor = vec4(col, 1.0);
}`;

  // show code in modal
  SL.renderCode($('#hero-bg-code'), BG_FS_BODY.replace(glsl.noise, '\n// ... hash / value-noise / fbm helpers ...\n'));
  SL.renderCode($('#hero-knot-code'), '// ===== VERTEX SHADER =====\n' + KNOT_VS_BODY + '\n\n// ===== FRAGMENT SHADER =====\n' + KNOT_FS_BODY);
  const modal = $('#code-modal');
  $('#hero-code-btn').addEventListener('click', () => { modal.showModal(); SL.xp.award('hero-code', 20, 'for peeking under the hood'); });
  $('#code-modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  const cam = new OrbitCamera({ dist: 6.2, theta: 0, phi: Math.PI / 2, autoRotate: 0 });
  let bg, knot, knotMesh, spin = 0;
  const mouse = [0.5, 0.5];

  SL.stage('#hero-stage', {
    setup(R, st) {
      bg = R.program(glsl.fullscreenVS, glsl.fs(BG_FS_BODY));
      knot = R.program(glsl.vs(KNOT_VS_BODY), glsl.fs(KNOT_FS_BODY));
      knotMesh = R.mesh(geo.torusKnot(1.05, 0.32, 260, 36, 2, 3));
      if (!st.camAttached) { cam.attach(st.el); st.camAttached = true; }
    },
    frame(R, st, t, dt) {
      const gl = R.gl;
      mouse[0] += (st.mouse.nx - mouse[0]) * 0.05; mouse[1] += (st.mouse.ny - mouse[1]) * 0.05;
      cam.update(dt);
      R.clear(0.03, 0.02, 0.06, 1);
      R.fullscreen(bg, { u_resolution: [st.w, st.h], u_mouse: mouse, u_time: t + 20 });
      // place knot to the right on wide screens
      const wide = st.aspect > 1.15;
      // the drag inertia of the orbit camera spins the knot itself; the real camera stays put
      const eye = [0, 0, 6.2], view = m4.lookAt(eye, [0, 0, 0]), proj = m4.perspective(45 * Math.PI / 180, st.aspect, 0.1, 50);
      spin += dt * 0.35;
      const halfW = Math.tan(22.5 * Math.PI / 180) * 6.2 * st.aspect;
      const offX = wide ? halfW * 0.58 : 0, offY = wide ? 0 : -1.4;
      const sc = wide ? SL.clamp(halfW * 0.36 / 1.6, 0.6, 1.05) : 0.6;
      const model = m4.mulAll(m4.translation(offX, offY, 0), m4.rotX(0.5 - (cam.phi - Math.PI / 2) + (mouse[1] - 0.5) * -0.4), m4.rotY(spin - cam.theta + (mouse[0] - 0.5) * 0.6), m4.scaling(sc));
      gl.clear(gl.DEPTH_BUFFER_BIT);
      R.draw(knotMesh, knot, { u_model: model, u_view: view, u_proj: proj, u_eye: eye, u_time: t });
    },
  });
})();
