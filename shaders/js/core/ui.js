/* =====================================================================
   UI helpers: GLSL highlighter, live editor, tabs, toasts, XP system
   ===================================================================== */
(function () {
  'use strict';
  const SL = (window.SL = window.SL || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  SL.$ = $; SL.$$ = $$;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  SL.esc = esc;

  /* ------------------------- GLSL highlighter ------------------------- */
  const KW = 'uniform|in|out|inout|varying|attribute|const|precision|highp|mediump|lowp|if|else|for|while|do|return|break|continue|discard|struct|layout|flat|smooth|true|false|fn|let|var|return|cbuffer|struct|kernel|fragment|vertex|constant|device|thread|using|namespace';
  const TYPES = 'void|bool|int|uint|float|half|double|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234]|mat[234]x[234]|sampler2D|samplerCube|sampler3D|float[234]|half[234]|float4x4|f32|vec[234]f|vec[234]<f32>|Texture2D|SamplerState|texture2d|sampler';
  const FN = 'sin|cos|tan|asin|acos|atan|pow|exp|exp2|log|log2|sqrt|inversesqrt|rsqrt|abs|sign|floor|ceil|round|fract|frac|mod|fmod|min|max|clamp|saturate|mix|lerp|step|smoothstep|length|distance|dot|cross|normalize|reflect|refract|faceforward|texture|texture2D|textureLod|texelFetch|textureSize|dFdx|dFdy|fwidth|radians|degrees|transpose|inverse|mul|sample|discard_fragment';
  const RE = new RegExp([
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)', // 1 comment
    '(^\\s*#[^\\n]*|@\\w+(?:\\([^)]*\\))?|\\[\\[[^\\]]*\\]\\])', // 2 preprocessor / attributes
    '(\\b(?:\\d+\\.\\d*|\\.\\d+|\\d+)(?:[eE][+-]?\\d+)?[fuh]?\\b)', // 3 number
    `(\\b(?:${TYPES})\\b)`, // 4 types
    `(\\b(?:${KW})\\b)`, // 5 keywords
    `(\\b(?:${FN})\\b(?=\\s*\\())`, // 6 builtin fn
    '(\\bgl_\\w+|\\b[uU]_\\w+|\\bi(?:Time|Resolution|Mouse)\\b)', // 7 builtin vars / uniforms
    '(\\b[a-zA-Z_]\\w*(?=\\s*\\())', // 8 user function
  ].join('|'), 'gm');
  SL.highlight = (code) => {
    let out = '', last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(code))) {
      if (m.index === RE.lastIndex) RE.lastIndex++;
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 'pp' : m[3] ? 'n' : m[4] ? 't' : m[5] ? 'k' : m[6] ? 'f' : m[7] ? 'g' : m[8] ? 'uf' : '';
      out += cls ? `<span class="hl-${cls}">${esc(m[0])}</span>` : esc(m[0]);
      last = m.index + m[0].length;
    }
    return out + esc(code.slice(last));
  };
  /** highlight every <pre class="code"> on the page (optionally marking lines with data-mark="2,3") */
  SL.highlightAll = (root = document) => {
    $$('pre.code:not(.hl-done)', root).forEach((pre) => SL.renderCode(pre, pre.textContent.replace(/^\n/, '').replace(/\s+$/, ''), pre.dataset.mark));
  };
  SL.renderCode = (pre, code, marks) => {
    const set = new Set(String(marks || '').split(',').filter(Boolean).map(Number));
    const lines = SL.highlight(code).split('\n');
    pre.innerHTML = lines.map((l, i) => `<span class="ln${set.has(i + 1) ? ' mark' : ''}">${l || ' '}</span>`).join('');
    pre.classList.add('hl-done');
  };

  /* ------------------------- Live code editor ------------------------- */
  class Editor {
    constructor(el, opts = {}) {
      this.el = el; this.opts = opts; this.errors = {};
      el.classList.add('editor');
      el.innerHTML = `<div class="ed-gutter"></div><div class="ed-scroll"><pre class="ed-hl" aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Shader code"></textarea></div><div class="ed-status"></div>`;
      this.ta = $('textarea', el); this.hl = $('.ed-hl', el); this.gutter = $('.ed-gutter', el); this.status = $('.ed-status', el); this.scroll = $('.ed-scroll', el);
      this.ta.value = opts.code || '';
      this.ta.addEventListener('input', () => { this.render(); this.schedule(); });
      this.ta.addEventListener('scroll', () => { this.hl.scrollTop = this.ta.scrollTop; this.hl.scrollLeft = this.ta.scrollLeft; this.gutter.scrollTop = this.ta.scrollTop; });
      this.ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const s = this.ta.selectionStart, en = this.ta.selectionEnd;
          this.ta.setRangeText('  ', s, en, 'end'); this.render(); this.schedule();
        } else if (e.key === 'Enter') {
          const s = this.ta.selectionStart, line = this.ta.value.slice(0, s).split('\n').pop(), ind = line.match(/^\s*/)[0] + (/[{(]\s*$/.test(line) ? '  ' : '');
          e.preventDefault(); this.ta.setRangeText('\n' + ind, s, this.ta.selectionEnd, 'end'); this.render(); this.schedule();
        }
      });
      this.render();
    }
    get value() { return this.ta.value; }
    set value(v) { this.ta.value = v; this.ta.scrollTop = 0; this.render(); this.schedule(0); }
    schedule(delay = 350) { clearTimeout(this._t); this._t = setTimeout(() => this.opts.onChange && this.opts.onChange(this.ta.value), delay); }
    render() {
      const code = this.ta.value, lines = code.split('\n');
      const hl = SL.highlight(code).split('\n');
      this.hl.innerHTML = hl.map((l, i) => `<span class="ln${this.errors[i + 1] ? ' err' : ''}">${l || ' '}</span>`).join('') + '\n';
      this.gutter.innerHTML = lines.map((_, i) => `<span class="${this.errors[i + 1] ? 'err' : ''}" ${this.errors[i + 1] ? `title="${esc(this.errors[i + 1])}"` : ''}>${i + 1}</span>`).join('') + '<span>&nbsp;</span>';
    }
    /** errors: string log from GL; lineOffset: lines prepended before user code */
    setErrors(log, lineOffset = 0) {
      this.errors = {};
      if (!log) { this.status.className = 'ed-status ok'; this.status.textContent = '✓ compiled — running on your GPU'; this.render(); return; }
      const msgs = [];
      log.split('\n').forEach((line) => {
        const m = line.match(/ERROR:\s*\d+:(\d+):\s*(.*)/);
        if (m) { const ln = +m[1] - lineOffset; this.errors[ln] = (this.errors[ln] ? this.errors[ln] + '; ' : '') + m[2]; msgs.push(`line ${ln}: ${m[2]}`); }
      });
      if (!msgs.length && log.trim()) msgs.push(log.trim().split('\n')[0]);
      this.status.className = 'ed-status bad';
      this.status.textContent = '✗ ' + msgs.slice(0, 3).join('  •  ');
      this.render();
    }
  }
  SL.Editor = Editor;

  /* ------------------------- Segmented tabs ------------------------- */
  /** el contains buttons with data-v. calls cb(value, btn). returns {set(v)} */
  SL.tabs = (el, cb, initial) => {
    if (typeof el === 'string') el = $(el);
    const btns = $$('[data-v]', el);
    const set = (v, fire = true) => {
      btns.forEach((b) => b.classList.toggle('active', b.dataset.v === String(v)));
      const b = btns.find((x) => x.dataset.v === String(v));
      if (fire && cb) cb(v, b);
    };
    btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.v)));
    if (initial !== undefined) set(initial);
    return { set, el };
  };

  /** slider helper: binds <input type=range> with an output span */
  SL.slider = (sel, cb, fmt = (v) => v) => {
    const el = typeof sel === 'string' ? $(sel) : sel; if (!el) return;
    const out = el.parentElement.querySelector('output');
    const f = () => { const v = parseFloat(el.value); if (out) out.textContent = fmt(v); cb && cb(v); };
    el.addEventListener('input', f); f();
    return el;
  };

  /* ------------------------- Toasts ------------------------- */
  SL.toast = (html, kind = '') => {
    let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = html; box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 500); }, 3600);
  };

  /* ------------------------- XP / level system ------------------------- */
  const LEVELS = ['Curious Pixel', 'Pixel Pusher', 'Vertex Wrangler', 'Fragment Fiddler', 'Uniform Uploader', 'Raster Rider', 'Light Bender', 'Texture Tamer', 'Warp Weaver', 'Ray Marcher', 'Shader Wizard'];
  const XP_PER_LEVEL = 100;
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('shaderland-xp') || '{}'); } catch (e) { return {}; } },
    set(v) { try { localStorage.setItem('shaderland-xp', JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const state = Object.assign({ xp: 0, seen: {} }, store.get());
  SL.xp = {
    LEVELS,
    level: () => Math.min(LEVELS.length - 1, Math.floor(state.xp / XP_PER_LEVEL)),
    has: (key) => !!state.seen[key],
    award(key, amount, label) {
      if (key && state.seen[key]) return;
      if (key) state.seen[key] = 1;
      const before = SL.xp.level();
      state.xp += amount; store.set(state); SL.xp.render();
      const after = SL.xp.level();
      if (after > before) SL.toast(`<b>⚡ LEVEL UP!</b> You are now a <em>${LEVELS[after]}</em>`, 'level');
      else if (label) SL.toast(`<b>+${amount} XP</b> ${label}`);
    },
    render() {
      const lvl = SL.xp.level(), into = state.xp - lvl * XP_PER_LEVEL, pct = lvl >= LEVELS.length - 1 ? 100 : Math.min(100, into / XP_PER_LEVEL * 100);
      const n = $('#xp-name'), b = $('#xp-fill'), l = $('#xp-level'), x = $('#xp-num');
      if (n) n.textContent = LEVELS[lvl]; if (b) b.style.width = pct + '%'; if (l) l.textContent = 'LV ' + (lvl + 1); if (x) x.textContent = state.xp + ' XP';
    },
    reset() { state.xp = 0; state.seen = {}; store.set(state); SL.xp.render(); },
  };

  /* ------------------------- misc ------------------------- */
  SL.fmt = (n, d = 2) => (Math.abs(n) < 1e-9 ? 0 : n).toFixed(d);
  SL.copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); if (btn) { const o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => (btn.textContent = o), 1200); } } catch (e) { /* ignore */ }
  };
  /** setup a 2D canvas sized to its css box (with dpr). returns ctx; call fit() on resize */
  SL.canvas2d = (canvas, onResize) => {
    const ctx = canvas.getContext('2d');
    const fit = (notify = true) => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.W = r.width; ctx.H = r.height;
      if (notify && onResize) onResize(ctx);
    };
    // initial fit is silent (callers' variables may not exist yet); the observer fires right after
    new ResizeObserver(() => fit()).observe(canvas); fit(false);
    ctx.fit = fit;
    return ctx;
  };
  /** run a callback every animation frame only while element is on screen */
  SL.animateWhileVisible = (el, fn) => {
    let vis = false, last = performance.now(), t = 0;
    new IntersectionObserver((es) => es.forEach((e) => { vis = e.isIntersecting; }), { rootMargin: '100px' }).observe(el);
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (vis && !document.hidden) { t += dt; fn(t, dt); }
    };
    requestAnimationFrame(loop);
  };
  /** pointer-drag helper on canvas, returns pos in CSS px */
  SL.drag = (el, { down, move, up, hover }) => {
    let active = false;
    const pos = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    el.addEventListener('pointerdown', (e) => { const p = pos(e); if (down && down(p, e) === false) return; active = true; el.setPointerCapture(e.pointerId); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { const p = pos(e); if (active) move && move(p, e); else hover && hover(p, e); });
    const end = (e) => { if (active) { active = false; up && up(pos(e), e); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', (e) => { if (!active && hover) hover(null, e); });
  };
})();
