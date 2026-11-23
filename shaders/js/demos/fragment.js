/* LEVEL 06 — fragment shader recipe: build a shader one ingredient at a time */
(function () {
  'use strict';
  const { glsl, $, $$ } = SL;
  const HEADER = `uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
out vec4 fragColor;
`;
  const STEPS = [
    { name: 'solid colour', title: 'Every pixel, one colour', text: 'The simplest fragment shader ignores its input and returns the same colour for every pixel. Colours are <b>vec4(red, green, blue, alpha)</b> with values from 0 to 1.',
      code: `void main() {
  // red, green, blue, alpha — each 0.0 to 1.0
  fragColor = vec4(1.0, 0.24, 0.6, 1.0);
}` },
    { name: 'uv', title: 'Where am I? Meet uv', text: '<code>gl_FragCoord</code> is this pixel’s position in pixels. Divide by the resolution and you get <b>uv</b>: (0,0) bottom-left → (1,1) top-right. Paint x as red and y as green.',
      code: `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;  // 0 → 1
  fragColor = vec4(uv.x, uv.y, 0.0, 1.0);
}` },
    { name: 'distance', title: 'Distance to the centre', text: '<code>length(uv - 0.5)</code> measures how far each pixel is from the middle. Showing that number as grey gives a radial gradient: black = close, white = far.',
      code: `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d = length(uv - 0.5);       // distance to centre
  fragColor = vec4(vec3(d), 1.0);   // dark = near
}` },
    { name: 'step()', title: 'A hard circle with step()', text: '<code>step(edge, x)</code> returns 0 or 1. Every pixel closer than 0.3 becomes 1 (white). Boom — a circle, with jagged edges.',
      code: `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d = length(uv - 0.5);
  float circle = step(d, 0.3);      // 1 inside, 0 outside
  fragColor = vec4(vec3(circle), 1.0);
}` },
    { name: 'smoothstep()', title: 'Soft edges & colour', text: '<code>smoothstep</code> fades from 1 to 0 over a tiny distance — free anti-aliasing. <code>mix(a, b, t)</code> blends two colours using that value.',
      code: `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d = length(uv - 0.5);
  float circle = smoothstep(0.3, 0.29, d);   // soft edge
  vec3 bg = vec3(0.1, 0.0, 0.2), pink = vec3(1.0, 0.3, 0.6);
  fragColor = vec4(mix(bg, pink, circle), 1.0);
}` },
    { name: 'fract()', title: 'Copy-paste with fract()', text: 'Multiply uv by 5 and keep only the fractional part: each tile now has its own little 0→1 space. The same circle code runs inside every tile.',
      code: `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 cell = fract(uv * 5.0);              // 5×5 tiles
  float d = length(cell - 0.5);
  float circle = smoothstep(0.3, 0.28, d);
  vec3 bg = vec3(0.1, 0.0, 0.2), pink = vec3(1.0, 0.3, 0.6);
  fragColor = vec4(mix(bg, pink, circle), 1.0);
}` },
    { name: 'u_time', title: 'Bring it to life with time', text: '<code>u_time</code> is a uniform the CPU updates every frame. <code>floor()</code> gives each tile an id, so each circle pulses with its own offset.',
      code: `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 cell = fract(uv * 5.0);
  vec2 id = floor(uv * 5.0);                // which tile?
  float d = length(cell - 0.5);
  float r = 0.22 + 0.12 * sin(u_time * 3.0 + id.x + id.y);
  float circle = smoothstep(r, r - 0.02, d);
  vec3 bg = vec3(0.1, 0.0, 0.2), pink = vec3(1.0, 0.3, 0.6);
  fragColor = vec4(mix(bg, pink, circle), 1.0);
}` },
    { name: 'palette', title: 'Rainbow palette', text: 'A cosine palette turns one number into a smooth rainbow. Feed it the tile id and time and every circle gets its own shifting colour.',
      code: `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 cell = fract(uv * 5.0);
  vec2 id = floor(uv * 5.0);
  float d = length(cell - 0.5);
  float r = 0.22 + 0.12 * sin(u_time * 3.0 + id.x + id.y);
  float circle = smoothstep(r, r - 0.02, d);
  vec3 pal = 0.5 + 0.5 * cos(6.2831 * (id.x * 0.1 + id.y * 0.07
                 + u_time * 0.2 + vec3(0.0, 0.33, 0.67)));
  vec3 bg = vec3(0.05, 0.02, 0.1);
  fragColor = vec4(mix(bg, pal, circle), 1.0);
}` },
    { name: 'mouse + glow', title: 'Glow & mouse magic ✨', text: 'Add a soft glow and make circles near the <b>mouse</b> grow. Hover the image! That’s a complete, interactive shader in ~15 lines.',
      code: `void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 cell = fract(uv * 5.0);
  vec2 id = floor(uv * 5.0);
  float d = length(cell - 0.5);
  vec2 mouse = u_mouse / u_resolution;
  float near = 1.0 - smoothstep(0.0, 0.45, length((id + 0.5) / 5.0 - mouse));
  float r = 0.18 + 0.1 * sin(u_time * 3.0 + id.x + id.y) + 0.14 * near;
  float circle = smoothstep(r, r - 0.02, d);
  vec3 pal = 0.5 + 0.5 * cos(6.2831 * (id.x * 0.1 + id.y * 0.07
                 + u_time * 0.2 + vec3(0.0, 0.33, 0.67)));
  vec3 col = mix(vec3(0.05, 0.02, 0.1), pal, circle);
  col += pal * 0.35 * smoothstep(0.5, 0.0, d) * (1.0 - circle);  // glow
  fragColor = vec4(col, 1.0);
}` },
  ];
  // mark lines that are new compared to the previous step
  STEPS.forEach((s, i) => {
    const prev = i ? new Set(STEPS[i - 1].code.split('\n').map((l) => l.trim())) : new Set();
    s.marks = s.code.split('\n').map((l, k) => (!prev.has(l.trim()) && l.trim() !== '}' ? k + 1 : 0)).filter(Boolean).join(',');
  });

  let step = 0, progs = [], R0 = null, grid = false, readout = $('#recipe-readout');
  $('#recipe-steps').innerHTML = STEPS.map((s, i) => `<button data-i="${i}"><i>${i + 1}</i>${s.name}</button>`).join('');
  function setStep(i) {
    step = SL.clamp(i, 0, STEPS.length - 1); const s = STEPS[step];
    $$('#recipe-steps button').forEach((b, k) => { b.classList.toggle('active', k === step); b.classList.toggle('done', k < step); });
    $('#recipe-num').textContent = `INGREDIENT ${step + 1} / ${STEPS.length}`;
    $('#recipe-title').innerHTML = s.title; $('#recipe-text').innerHTML = s.text;
    const pre = $('#recipe-code'); pre.classList.remove('hl-done'); SL.renderCode(pre, s.code, step ? s.marks : '');
    $$('.ln.mark', pre).forEach((l) => l.classList.replace('mark', 'mark-new'));
    $('#recipe-prev').disabled = step === 0; $('#recipe-next').textContent = step === STEPS.length - 1 ? '🎉 done!' : 'next ingredient ▶';
    const active = $('#recipe-steps button.active'); active && active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    if (step === STEPS.length - 1) SL.xp.award('recipe-done', 30, 'for cooking a complete shader');
  }
  $$('#recipe-steps button').forEach((b) => b.addEventListener('click', () => setStep(+b.dataset.i)));
  $('#recipe-prev').addEventListener('click', () => setStep(step - 1));
  $('#recipe-next').addEventListener('click', () => setStep(step + 1));
  $('#recipe-play').addEventListener('click', () => { SL.playground && SL.playground.load(STEPS[step].code, `recipe step ${step + 1}`); });

  // uv grid overlay
  const ov = $('#recipe-overlay');
  const octx = SL.canvas2d(ov, () => drawGrid());
  function drawGrid() {
    const W = octx.W, H = octx.H; octx.clearRect(0, 0, W, H); if (!grid) return;
    octx.strokeStyle = 'rgba(255,255,255,0.35)'; octx.lineWidth = 1; octx.font = '11px JetBrains Mono, monospace'; octx.fillStyle = '#fff';
    for (let i = 0; i <= 10; i++) { const x = i / 10 * W, y = i / 10 * H; octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, H); octx.moveTo(0, y); octx.lineTo(W, y); octx.stroke(); }
    octx.strokeStyle = '#ffd23f'; octx.lineWidth = 2; octx.beginPath(); octx.moveTo(W / 2, 0); octx.lineTo(W / 2, H); octx.moveTo(0, H / 2); octx.lineTo(W, H / 2); octx.stroke();
    const lab = (s, x, y, a = 'left') => { octx.textAlign = a; octx.fillStyle = 'rgba(0,0,0,0.65)'; const w = octx.measureText(s).width; octx.fillRect(a === 'left' ? x - 3 : x - w - 3, y - 12, w + 6, 16); octx.fillStyle = '#fff'; octx.fillText(s, x, y); };
    lab('(0,0)', 6, H - 8); lab('(1,1)', W - 6, 18, 'right'); lab('(1,0)', W - 6, H - 8, 'right'); lab('(0,1)', 6, 18); lab('(0.5, 0.5)', W / 2 + 6, H / 2 - 6);
  }
  $('#recipe-grid').addEventListener('change', (e) => { grid = e.target.checked; drawGrid(); });

  const px = new Uint8Array(4);
  SL.stage('#recipe-stage', {
    setup(R) { R0 = R; progs = STEPS.map((s) => R.program(glsl.fullscreenVS, glsl.fs(HEADER + s.code))); },
    frame(R, st, t) {
      const m = st.mouse.inside ? [st.mouse.nx * st.w, st.mouse.ny * st.h] : [st.w * (0.5 + 0.3 * Math.cos(t * 0.7)), st.h * (0.5 + 0.3 * Math.sin(t * 0.9))];
      R.fullscreen(progs[step], { u_resolution: [st.w, st.h], u_mouse: m, u_time: t });
      if (st.mouse.inside) {
        const x = Math.floor(st.mouse.nx * st.w), y = Math.floor(st.mouse.ny * st.h);
        R.gl.readPixels(x, y, 1, 1, R.gl.RGBA, R.gl.UNSIGNED_BYTE, px);
        readout.innerHTML = `<i style="background:rgb(${px[0]},${px[1]},${px[2]})"></i>uv (${(st.mouse.nx).toFixed(2)}, ${(st.mouse.ny).toFixed(2)}) → rgb(${(px[0] / 255).toFixed(2)}, ${(px[1] / 255).toFixed(2)}, ${(px[2] / 255).toFixed(2)})`;
      } else if (st.frameCount % 30 === 0) readout.textContent = 'hover the image';
    },
  });
  setStep(0);
  SL.recipeHeader = HEADER;
})();
