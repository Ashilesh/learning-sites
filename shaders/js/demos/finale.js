/* LEVEL 16 — boss quiz + flip-card glossary */
(function () {
  'use strict';
  const { $, $$ } = SL;
  const QUIZ = [
    { q: 'A fragment shader runs once per…', a: ['frame', 'pixel (fragment)', 'triangle', 'draw call'], c: 1, why: 'Every pixel a triangle covers becomes a fragment → one fragment-shader run.' },
    { q: 'Which stage decides where a vertex lands on screen?', a: ['the rasterizer', 'the vertex shader', 'the fragment shader', 'the framebuffer'], c: 1, why: 'The vertex shader outputs gl_Position — that’s its main job.' },
    { q: 'Every pixel needs the same time value. You send it as a…', a: ['attribute', 'varying', 'uniform', 'texture'], c: 2, why: 'Uniforms are broadcast: the same value for every vertex & pixel in a draw.' },
    { q: 'Colours output at a triangle’s 3 corners get… by the rasterizer.', a: ['replaced by the brightest one', 'interpolated across the triangle', 'averaged into one flat colour', 'thrown away'], c: 1, why: 'Barycentric weights blend corner values for each pixel — that’s what a varying is.' },
    { q: 'Why can if/else be slow on a GPU?', a: ['GPUs can’t compare numbers', 'lanes in a warp that disagree must take turns', 'if is illegal in GLSL', 'branches live in VRAM'], c: 1, why: 'A warp runs one instruction at a time, so divergent lanes sit idle while the other path runs.' },
    { q: 'After projection & the divide by w, the visible scene fits in…', a: ['a sphere of radius 1', 'the cube from −1 to +1', 'a 1920×1080 grid', 'the 0 → 1 square'], c: 1, why: 'That cube is NDC — normalized device coordinates.' },
    { q: 'smoothstep(0.3, 0.29, d) is mostly used to…', a: ['make a soft, anti-aliased edge', 'calculate lighting', 'generate random noise', 'sample a texture'], c: 0, why: 'It fades 1→0 over a tiny distance instead of a jagged step().' },
    { q: 'A raymarcher steps along its ray by…', a: ['exactly one pixel', 'the distance to the nearest surface', 'a random amount', 'the speed of light'], c: 1, why: 'The SDF guarantees nothing is closer, so it’s a safe jump.' },
  ];
  const box = $('#quiz');
  box.innerHTML = QUIZ.map((x, i) => `<div class="q" data-i="${i}"><h4><span>Q${i + 1}</span>${x.q}</h4>${x.a.map((a, k) => `<button data-k="${k}">${a}</button>`).join('')}<div class="why">${x.why}</div></div>`).join('');
  let answered = 0, right = 0;
  $$('.q', box).forEach((qe) => {
    const x = QUIZ[+qe.dataset.i];
    $$('button', qe).forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.k;
      $$('button', qe).forEach((bb) => { bb.disabled = true; if (+bb.dataset.k === x.c) bb.classList.add('right'); });
      if (k !== x.c) b.classList.add('wrong'); else { right++; SL.xp.award('quiz-' + qe.dataset.i, 15, 'correct! ✅'); }
      qe.classList.add('answered'); answered++;
      if (answered === QUIZ.length) {
        const perfect = right === QUIZ.length;
        const s = document.createElement('div'); s.className = 'quiz-score';
        s.innerHTML = `<b>${right} / ${QUIZ.length}</b>${perfect ? '🧙 FLAWLESS! You are a certified <b style="display:inline;font-size:inherit;color:var(--pink)">Shader Wizard</b>.' : right >= 5 ? '⚡ Great run! Re-read a level or two and try again.' : '🌱 Every wizard starts somewhere — revisit the levels and retry!'}<div style="margin-top:12px"><button class="btn btn-small" id="quiz-retry">↻ retry</button></div>`;
        box.appendChild(s);
        if (perfect) SL.xp.award('quiz-perfect', 120, 'for a perfect boss fight!');
        $('#quiz-retry').addEventListener('click', () => {
          answered = 0; right = 0; s.remove();
          $$('.q', box).forEach((q2) => { q2.classList.remove('answered'); $$('button', q2).forEach((bb) => { bb.disabled = false; bb.classList.remove('right', 'wrong'); }); });
        });
      }
    }));
  });

  const GLOSS = [
    ['🔺', 'Vertex', 'A corner of a 3D shape. Carries a position plus extras like normal, UV and colour.', '--lime'],
    ['🟪', 'Fragment', 'A “pixel-to-be” made by the rasterizer. The fragment shader decides its colour.', '--pink'],
    ['🧱', 'Texel', 'One pixel of a texture image.', '--cyan'],
    ['📢', 'Uniform', 'An input that’s the same for every shader run in one draw call (time, matrices…).', '--yellow'],
    ['📦', 'Attribute', 'A per-vertex input read from a buffer (position, normal, uv).', '--cyan'],
    ['🌈', 'Varying', 'A value passed from vertex to fragment shader, interpolated across the triangle.', '--pink'],
    ['▦', 'Rasterization', 'Turning triangles into the set of pixels (fragments) they cover.', '--orange'],
    ['🖼', 'Framebuffer', 'The image memory being drawn into. Swapped to the screen when done.', '--violet'],
    ['📞', 'Draw call', 'The CPU telling the GPU: draw this mesh with this shader.', '--yellow'],
    ['🐜', 'Warp / wavefront', 'A squad of 32 (NVIDIA) or 64 (AMD) threads running the same instruction together.', '--lime'],
    ['🧊', 'NDC', 'Normalized Device Coordinates — the −1…+1 cube everything visible ends up in.', '--cyan'],
    ['✂️', 'Clipping', 'Cutting away the parts of triangles outside the view.', '--red'],
    ['🪜', 'Mipmap', 'Pre-shrunk copies of a texture, used when it’s far away to avoid shimmering.', '--orange'],
    ['📏', 'SDF', 'Signed Distance Function: tells you how far you are from the nearest surface.', '--violet'],
    ['🔀', 'Swizzle', 'Reading vector parts in any order: v.zyx, c.rrr, p.xy.', '--orange'],
    ['🧭', 'Normal', 'A unit vector pointing straight out of a surface. Key for lighting.', '--lime'],
    ['⚖️', 'Barycentric', 'Three weights saying how close a point is to each triangle corner.', '--pink'],
    ['🕳', 'Depth buffer', 'Stores each pixel’s distance so nearer things hide farther ones.', '--blue'],
    ['🎯', 'Precision', 'highp / mediump / lowp — how many bits a float uses.', '--yellow'],
    ['♻️', 'Ping-pong', 'Swapping two textures every frame to simulate things over time.', '--cyan'],
  ];
  $('#glossary').innerHTML = GLOSS.map(([i, t, d, c]) => `<div class="gcard" style="--c:var(${c})" tabindex="0"><div class="gcard-in"><div class="gface gfront"><span>${i}</span><b>${t}</b></div><div class="gface gback">${d}</div></div></div>`).join('');
  let flips = 0;
  $$('.gcard').forEach((g) => { const f = () => { g.classList.toggle('flip'); if (++flips === 6) SL.xp.award('gloss', 20, 'for studying the glossary'); }; g.addEventListener('click', f); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }); });
})();
