/* LEVEL 01 — The Pixel Machine + CPU vs GPU painting race */
(function () {
  'use strict';
  const { glsl, $, fmt } = SL;

  /* ===================== Pixel Machine ===================== */
  const RES = [[8, 5], [16, 10], [32, 20], [64, 40], [160, 100], null];
  let level = 1, hover = null, autoIdx = 0, autoT = 0, lastShown = '';
  const FS = `uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float b = 0.5 + 0.5 * sin(u_time);
  fragColor = vec4(uv.x, uv.y, b, 1.0);
}`;
  const stageEl = $('#pm-stage'), cross = $('#pm-cross');
  const grid = document.createElement('div'); grid.className = 'pm-gridlines';
  grid.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;';
  stageEl.appendChild(grid);
  let prog;
  const st = SL.stage(stageEl, {
    setup(R) { prog = R.program(glsl.fullscreenVS, glsl.fs(FS)); },
    frame(R, s, t, dt) {
      R.clear(0, 0, 0, 1);
      R.fullscreen(prog, { u_resolution: [s.w, s.h], u_time: t });
      // pick pixel: mouse or auto-scan
      let px, py;
      if (s.mouse.inside) {
        px = Math.floor(s.mouse.nx * s.w); py = Math.floor(s.mouse.ny * s.h);
      } else {
        autoT += dt;
        if (autoT > (RES[level] ? 0.35 : 0.05)) { autoT = 0; autoIdx++; }
        const n = s.w * s.h, i = (autoIdx * (RES[level] ? 1 : 997)) % n;
        px = i % s.w; py = s.h - 1 - Math.floor(i / s.w);
      }
      px = SL.clamp(px, 0, s.w - 1); py = SL.clamp(py, 0, s.h - 1);
      show(px, py, s, t);
    },
  });
  function show(px, py, s, t) {
    const fx = px + 0.5, fy = py + 0.5, u = fx / s.w, v = fy / s.h, b = 0.5 + 0.5 * Math.sin(t);
    // crosshair box (css px)
    const cw = s.cssW / s.w, ch = s.cssH / s.h, size = Math.max(cw, 12), sizeY = Math.max(ch, 12);
    cross.style.display = 'block';
    cross.style.width = size + 'px'; cross.style.height = sizeY + 'px';
    cross.style.left = (px * cw + cw / 2 - size / 2) + 'px'; cross.style.top = ((s.h - 1 - py) * ch + ch / 2 - sizeY / 2) + 'px';
    const key = px + ',' + py + ',' + b.toFixed(2);
    if (key === lastShown) return; lastShown = key;
    $('#pm-fx').textContent = fmt(fx, 1); $('#pm-fy').textContent = fmt(fy, 1);
    $('#pm-u').textContent = fmt(u); $('#pm-v').textContent = fmt(v);
    const V = (x) => `<span class="live-val">${x}</span>`;
    $('#pm-code').innerHTML = [
      SL.highlight('vec2 uv = gl_FragCoord.xy / u_resolution;'),
      `<span class="hl-c">//   = (${fmt(fx, 1)}, ${fmt(fy, 1)}) / (${s.w}, ${s.h})</span>`,
      `<span class="hl-c">//   = </span>${V(`(${fmt(u)}, ${fmt(v)})`)}`,
      SL.highlight('float b = 0.5 + 0.5 * sin(u_time);') + ` <span class="hl-c">// =</span> ${V(fmt(b))}`,
      SL.highlight('fragColor = vec4(uv.x, uv.y, b, 1.0);'),
    ].map((l) => `<span class="ln">${l}</span>`).join('');
    const c = [u, v, b].map((x) => Math.round(x * 255));
    $('#pm-swatch').style.background = `rgb(${c})`; $('#pm-swatch').style.color = `rgb(${c})`;
    $('#pm-out').innerHTML = `vec4(<span class="c-pink">${fmt(u)}</span>, <span class="c-lime">${fmt(v)}</span>, <span class="c-cyan">${fmt(b)}</span>, 1.00)`;
    $('#pm-runs').textContent = (s.w * s.h).toLocaleString();
  }
  SL.slider('#pm-res', (v) => {
    level = v; const r = RES[v];
    st.forceSize = r; st.refresh(); lastShown = '';
    if (r) {
      grid.style.backgroundImage = 'linear-gradient(rgba(0,0,0,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.55) 1px, transparent 1px)';
      grid.style.backgroundSize = `calc(100% / ${r[0]}) calc(100% / ${r[1]})`;
      grid.style.display = r[0] <= 64 ? 'block' : 'none';
    } else grid.style.display = 'none';
    if (v >= 3) SL.xp.award('pm-res', 15, 'for cranking up the resolution');
  }, (v) => (RES[v] ? `${RES[v][0]}×${RES[v][1]}` : 'full'));
  stageEl.addEventListener('pointerenter', () => SL.xp.award('pm-hover', 10, 'for inspecting a pixel'), { once: true });

  /* ===================== CPU vs GPU race ===================== */
  const W = 60, H = 36, N = W * H;
  const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const picture = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W, v = (y + 0.5) / H, horizon = 0.64;
    let c;
    if (v < horizon) {
      c = mix([20, 6, 50], [255, 61, 154], Math.pow(v / horizon, 1.6));
      if (hash(x, y) > 0.965 && v < 0.4) c = [255, 255, 255];
      const dx = (u - 0.5) * W / H, dy = v - 0.42, r = Math.hypot(dx, dy);
      if (r < 0.24) {
        const stripe = dy > 0.02 && Math.floor((dy) * 60) % 3 === 0;
        if (!stripe) c = mix([255, 230, 80], [255, 70, 150], SL.clamp((dy + 0.24) / 0.48, 0, 1));
      }
    } else {
      const gv = (v - horizon) / (1 - horizon), z = 1 / (gv + 0.05);
      const lineZ = Math.abs(((z * 1.2) % 1) - 0.5) > 0.42, lineX = Math.abs((((u - 0.5) * z * 1.5) % 1 + 1) % 1 - 0.5) > 0.44;
      c = (lineZ || lineX) ? mix([34, 228, 255], [155, 92, 255], gv) : [18, 6, 36];
    }
    picture.push(c.map(Math.round));
  }
  const cpuCtx = SL.canvas2d($('#race-cpu')), gpuCtx = SL.canvas2d($('#race-gpu'));
  let race = null;
  const CPU_CORES = 8, GPU_BATCH = 2048, GPU_FRAMES_PER_BATCH = 9;
  function reset() {
    race = { running: false, frame: 0, cpu: new Float32Array(N), gpu: new Float32Array(N), cpuDone: -1, gpuDone: -1 };
  }
  reset();
  // CPU core k paints its own band of rows, one pixel per frame
  const cpuOrder = [];
  for (let k = 0; k < CPU_CORES; k++) { const list = []; for (let y = Math.floor(k * H / CPU_CORES); y < Math.floor((k + 1) * H / CPU_CORES); y++) for (let x = 0; x < W; x++) list.push(y * W + x); cpuOrder.push(list); }
  // GPU: pixels grouped in 8x4 tiles (warps of 32)
  const gpuOrder = [];
  for (let ty = 0; ty < H; ty += 4) for (let tx = 0; tx < W; tx += 8) for (let y = ty; y < Math.min(ty + 4, H); y++) for (let x = tx; x < Math.min(tx + 8, W); x++) gpuOrder.push(y * W + x);

  function step() {
    const f = race.frame;
    // CPU
    let cpuBusy = false;
    for (let k = 0; k < CPU_CORES; k++) { const list = cpuOrder[k]; if (f < list.length) { race.cpu[list[f]] = 1; cpuBusy = true; } }
    if (!cpuBusy && race.cpuDone < 0) race.cpuDone = f;
    // GPU
    const batch = Math.floor(f / GPU_FRAMES_PER_BATCH), within = (f % GPU_FRAMES_PER_BATCH + 1) / GPU_FRAMES_PER_BATCH;
    const start = batch * GPU_BATCH;
    if (start < N) {
      for (let i = start; i < Math.min(start + GPU_BATCH, N); i++) {
        const warp = Math.floor((i - start) / 32), jitter = (warp % 7) / 7 * 0.35;
        race.gpu[gpuOrder[i]] = SL.clamp((within - jitter) / (1 - jitter), 0, 1);
      }
    } else if (race.gpuDone < 0) race.gpuDone = f;
    race.frame++;
    if (race.cpuDone >= 0 && race.gpuDone >= 0) {
      race.running = false; $('#race-go').textContent = '↻ Race again';
      SL.xp.award('race', 20, 'for watching the GPU win');
    }
  }
  function draw(ctx, fill, isCPU) {
    const cw = ctx.W / W, ch = ctx.H / H;
    ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, ctx.W, ctx.H);
    for (let i = 0; i < N; i++) {
      const x = i % W, y = (i / W) | 0, a = fill[i];
      if (a <= 0) { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(x * cw + 0.5, y * ch + 0.5, cw - 1, ch - 1); continue; }
      const c = picture[i];
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`; ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);
      if (a < 1) { ctx.fillStyle = `rgba(255,255,255,${(1 - a) * 0.8})`; ctx.fillRect(x * cw, y * ch, cw, ch); }
    }
    if (isCPU && race.running) {
      for (let k = 0; k < CPU_CORES; k++) {
        const list = cpuOrder[k], idx = list[Math.min(race.frame, list.length - 1)];
        if (race.frame >= list.length) continue;
        const x = (idx % W + 0.5) * cw, y = ((idx / W | 0) + 0.5) * ch, r = Math.max(4.5, Math.min(cw, ch) * 1.1);
        ctx.fillStyle = '#22e4ff'; ctx.shadowColor = '#22e4ff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#07040f'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.2, 0, 7); ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.2, 0, 7); ctx.fill();
      }
    }
    const done = isCPU ? race.cpuDone : race.gpuDone;
    if (done >= 0) {
      ctx.fillStyle = 'rgba(7,4,15,0.55)'; ctx.fillRect(0, ctx.H / 2 - 26, ctx.W, 52);
      ctx.fillStyle = isCPU ? '#22e4ff' : '#ff3d9a'; ctx.font = '700 20px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      const gpuMsg = race.cpuDone >= 0 ? `done in ${(done / 60).toFixed(2)} s  🏆 ~${Math.round(race.cpuDone / Math.max(1, done))}× faster` : `done in ${(done / 60).toFixed(2)} s 🏁 …waiting for the CPU`;
      ctx.fillText(isCPU ? `done in ${(done / 60).toFixed(2)} s` : gpuMsg, ctx.W / 2, ctx.H / 2 + 7);
    }
  }
  $('#race-go').addEventListener('click', () => { reset(); race.running = true; $('#race-go').textContent = '… racing'; });
  SL.animateWhileVisible($('#race'), () => {
    if (race.running) step();
    draw(cpuCtx, race.cpu, true); draw(gpuCtx, race.gpu, false);
    const fr = race.frame;
    $('#race-cpu-t').textContent = ((race.cpuDone >= 0 ? race.cpuDone : fr) / 60).toFixed(2) + ' s';
    $('#race-gpu-t').textContent = ((race.gpuDone >= 0 ? race.gpuDone : fr) / 60).toFixed(2) + ' s';
  });
})();
