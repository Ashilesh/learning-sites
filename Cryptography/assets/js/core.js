/* CryptoSketch core: helpers, progress/XP/streaks, quiz engine, navigation, widget loader. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ------------------------------------------------------------ DOM helper
  function h(tag, attrs, ...kids) {
    const el = document.createElementNS(/^(svg|g|path|circle|rect|line|text|polyline|polygon|ellipse|tspan|defs|marker)$/.test(tag) ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
    return el;
  }

  // ------------------------------------------------------------ crypto & math helpers
  const te = new TextEncoder(), td = new TextDecoder();
  const enc = (s) => te.encode(s);
  const dec = (b) => td.decode(b);
  const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  const fromHex = (s) => new Uint8Array((s.replace(/[^0-9a-f]/gi, '').match(/../g) || []).map((x) => parseInt(x, 16)));
  const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
  const subtle = (window.crypto && crypto.subtle) || null;
  const sha = async (alg, data) => new Uint8Array(await subtle.digest(alg, typeof data === 'string' ? enc(data) : data));
  const hmac = async (alg, key, data) => {
    const k = await subtle.importKey('raw', typeof key === 'string' ? enc(key) : key, { name: 'HMAC', hash: alg }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', k, typeof data === 'string' ? enc(data) : data));
  };
  const modpow = (b, e, m) => { b = BigInt(b) % BigInt(m); e = BigInt(e); m = BigInt(m); let r = 1n; while (e > 0n) { if (e & 1n) r = (r * b) % m; e >>= 1n; b = (b * b) % m; } return r; };
  const gcd = (a, b) => { a = BigInt(a); b = BigInt(b); while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; };
  const modinv = (a, m) => { a = BigInt(a); m = BigInt(m); let [r0, r1, s0, s1] = [a % m, m, 1n, 0n]; while (r1) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; } return r0 === 1n ? ((s0 % m) + m) % m : null; };
  const isPrime = (n) => { n = Number(n); if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const popcount8 = (x) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
  const bitDiff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += popcount8(a[i] ^ b[i]); return d; };
  const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sketch = (w, hgt, cls = '') => { const svg = h('svg', { viewBox: `0 0 ${w} ${hgt}`, width: w, height: hgt, class: cls, role: 'img' }); return { svg, rc: window.rough ? rough.svg(svg) : null }; };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // ------------------------------------------------------------ state
  const KEY = 'cryptosketch:v1';
  const blank = () => ({ xp: 0, got: {}, read: {}, quiz: {}, frags: {}, ach: {}, done: {}, streak: { last: null, n: 0 }, likes: {}, seen: {}, last: null });
  let S = blank();
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage blocked: progress just won't persist */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  const LEVELS = [
    [0, 'Curious Cat', '🐱'], [60, 'Code Breaker', '🕵️'], [180, 'Cipher Apprentice', '🧙'], [380, 'Hash Hacker', '🧩'], [650, 'Key Keeper', '🗝️'],
    [1000, 'Signature Sage', '✍️'], [1450, 'Protocol Pro', '🛡️'], [2000, 'Cryptanalyst', '🔬'], [2700, 'Cryptographer', '🎓'], [3600, 'Cypherpunk Legend', '🦄'],
  ];
  const levelOf = (xp) => { let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++; return i; };

  const ACH = {
    first: ['👣', 'First steps', 'Read your first section'], boss: ['👾', 'Boss slayer', 'Beat a boss quiz'], perfect: ['💯', 'Flawless', 'Perfect boss score'],
    streak3: ['🔥', 'On fire', '3-day reading streak'], shorts: ['⚡', 'Snack attack', 'Swipe 15 Shorts'], night: ['🌙', 'Night owl', 'Try the chalkboard theme'],
    caesar: ['🏛️', 'Et tu, Brute?', 'Brute-force a Caesar cipher'], freq: ['🔎', 'Al-Kindi’s heir', 'Crack the substitution cipher'], penguin: ['🖼️', 'Pattern spotter', 'Watch ECB leak a picture'],
    tamper: ['🚨', 'Gotcha, Mallory', 'Catch tampering with AES-GCM'], rsa: ['🗝️', 'Trapdoor', 'Run toy RSA end to end'], dh: ['🎨', 'Paint mixer', 'Agree on a secret in public'],
    miner: ['⛏️', 'Miner', 'Mine a block'], totp: ['⏱️', 'Time lord', 'Generate a TOTP code'], half: ['🧭', 'Halfway there', 'Finish 10 chapters'],
    all: ['🎓', 'Graduate', 'Beat every boss quiz'], vault: ['🦄', 'Vault cracker', 'Open the vault'],
  };

  // ------------------------------------------------------------ toasts, confetti, modal
  let toastBox;
  function toast(msg, kind = '') {
    toastBox ||= document.body.appendChild(h('div', { class: 'toasts', 'aria-live': 'polite' }));
    const t = h('div', { class: 'toast ' + kind, html: msg });
    toastBox.append(t);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2600);
  }
  function confetti(n = 140) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = h('canvas', { id: 'confetti' }); document.body.append(c);
    const ctx = c.getContext('2d'); const W = (c.width = innerWidth), H = (c.height = innerHeight);
    const cols = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#8338ec', '#fb8500'];
    const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * W * .4, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 6 + Math.random() * 8, r: Math.random() * 6, c: cols[(Math.random() * cols.length) | 0] }));
    let f = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) { p.vy += .42; p.x += p.vx; p.y += p.vy; p.r += .2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
      if (++f < 150) requestAnimationFrame(tick); else c.remove();
    })();
  }
  function modal(html, onClose) {
    const scrim = h('div', { class: 'modal-scrim', role: 'dialog', 'aria-modal': 'true' });
    const box = h('div', { class: 'modal', html });
    const close = () => { scrim.remove(); onClose && onClose(); };
    box.append(h('p', {}, h('button', { class: 'btn', type: 'button', onclick: close }, 'Nice! ✕')));
    scrim.append(box); scrim.addEventListener('click', (e) => e.target === scrim && close());
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    document.body.append(scrim); box.querySelector('button').focus();
    return box;
  }

  // ------------------------------------------------------------ XP
  function renderXP() {
    const i = levelOf(S.xp), cur = LEVELS[i], nxt = LEVELS[i + 1];
    const pct = nxt ? ((S.xp - cur[0]) / (nxt[0] - cur[0])) * 100 : 100;
    const ln = $('#lvlName'), xf = $('#xpFill'), xn = $('#xpNum');
    if (ln) ln.textContent = `${cur[2]} Lv ${i + 1}`;
    if (xf) xf.style.width = pct.toFixed(1) + '%';
    if (xn) xn.textContent = `${fmt(S.xp)} XP`;
    const st = $('#streak'); if (st) st.textContent = `🔥 ${S.streak.n || 1}`;
  }
  function award(id, amount, label, badge) {
    if (S.got[id]) { badge && badge.classList.add('got'); return false; }
    const before = levelOf(S.xp);
    S.got[id] = 1; S.xp += amount; save(); renderXP();
    badge && badge.classList.add('got', 'pop');
    toast(`<b>+${amount} XP</b> · ${label}`);
    const after = levelOf(S.xp);
    if (after > before) {
      setTimeout(() => { confetti(); const L = LEVELS[after]; modal(`<div class="big-emoji">${L[2]}</div><p>LEVEL UP!</p><h3>Level ${after + 1}: ${L[1]}</h3><p>You now have <b>${fmt(S.xp)} XP</b>. ${LEVELS[after + 1] ? `Next rank at ${fmt(LEVELS[after + 1][0])} XP.` : 'You reached the top rank!'}</p>`); }, 500);
    }
    return true;
  }
  function achieve(id) {
    if (!ACH[id] || S.ach[id]) return;
    S.ach[id] = Date.now(); save();
    setTimeout(() => toast(`🏅 Achievement: <b>${ACH[id][0]} ${ACH[id][1]}</b>`, 'grape'), 700);
  }
  function showProfile() {
    const i = levelOf(S.xp);
    const chaptersDone = Object.keys(S.done).length;
    const box = modal(`<div class="big-emoji">${LEVELS[i][2]}</div><h3>${LEVELS[i][1]}</h3><p>Level ${i + 1} · <b>${fmt(S.xp)} XP</b> · 🔥 ${S.streak.n || 1}-day streak · ${chaptersDone}/21 chapters · 🔑 ${Object.keys(S.frags).length}/21 fragments</p>
      <div class="ach-grid">${Object.entries(ACH).map(([k, a]) => `<div class="ach ${S.ach[k] ? 'got' : ''}" title="${a[2]}"><b>${a[0]}</b>${a[1]}<br><small>${a[2]}</small></div>`).join('')}</div>`);
    box.append(h('p', {}, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { if (confirm('Reset all progress, XP and fragments in this browser?')) { S = blank(); save(); location.reload(); } } }, '↺ Reset my progress')));
  }

  // ------------------------------------------------------------ streak
  function tickStreak() {
    const d = new Date(); const today = d.toISOString().slice(0, 10);
    const y = new Date(d.getTime() - 864e5).toISOString().slice(0, 10);
    if (S.streak.last !== today) {
      S.streak.n = S.streak.last === y ? (S.streak.n || 0) + 1 : 1;
      S.streak.last = today; save();
      if (S.streak.n > 1) setTimeout(() => toast(`🔥 ${S.streak.n}-day streak! Keep it going.`, 'mint'), 1200);
    }
    if (S.streak.n >= 3) achieve('streak3');
  }

  // ------------------------------------------------------------ theme
  const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  function setThemeIcon() { const b = $('#themeBtn'); if (b) { b.textContent = isDark() ? '☀️' : '🌙'; b.title = isDark() ? 'Switch to sketchbook (light)' : 'Switch to chalkboard (dark)'; } }
  function toggleTheme() {
    const t = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('cs-theme', t); } catch (e) { /* ignore */ }
    setThemeIcon(); if (t === 'dark') achieve('night');
    document.dispatchEvent(new CustomEvent('themechange'));
  }

  // ------------------------------------------------------------ drawer & search
  function setupNav() {
    const drawer = $('#drawer'), scrim = $('#scrim'), btn = $('#menuBtn');
    const open = () => { drawer.hidden = false; scrim.hidden = false; btn.setAttribute('aria-expanded', 'true'); $('#closeDrawer').focus(); };
    const close = () => { drawer.hidden = true; scrim.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn && btn.addEventListener('click', open);
    $('#closeDrawer') && $('#closeDrawer').addEventListener('click', close);
    scrim && scrim.addEventListener('click', close);
    $$('.drawer-link[data-ch]').forEach((a) => {
      const n = a.dataset.ch;
      if (S.done[n]) { a.classList.add('done'); a.querySelector('.dl-state').textContent = '✅'; }
      else if (Object.keys(S.read).some((k) => k.startsWith(n + ':'))) a.querySelector('.dl-state').textContent = '✏️';
      if (window.PAGE && String(PAGE.ch) === n) a.classList.add('current');
    });
    $('#themeBtn') && $('#themeBtn').addEventListener('click', toggleTheme);
    $('#xpWrap') && $('#xpWrap').addEventListener('click', showProfile);
    // search
    const pop = $('#searchPop'), input = $('#searchInput'), out = $('#searchResults');
    let loaded = false;
    const openSearch = () => {
      pop.hidden = false; input.focus();
      if (!loaded) { loaded = true; const s = h('script', { src: 'assets/js/search-index.js' }); s.onload = () => input.value && run(); document.body.append(s); }
    };
    const closeSearch = () => { pop.hidden = true; };
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const run = debounce(() => {
      const q = input.value.trim().toLowerCase();
      out.innerHTML = '';
      if (!q || !window.SEARCH) return;
      const terms = q.split(/\s+/).filter(Boolean);
      const scored = SEARCH.map((r) => {
        const t = r.t.toLowerCase(), x = r.x.toLowerCase(); let sc = 0;
        for (const w of terms) { if (t.includes(w)) sc += 12; const c = x.split(w).length - 1; if (!c && !t.includes(w)) return null; sc += Math.min(c, 8); }
        return { r, sc };
      }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 14);
      if (!scored.length) { out.append(h('li', {}, h('p', {}, 'No luck. Try a different word (like “nonce” or “certificate”).'))); return; }
      const re = new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi');
      for (const { r } of scored) {
        const idx = r.x.toLowerCase().indexOf(terms[0]);
        const snip = (idx > 60 ? '…' : '') + r.x.slice(Math.max(0, idx - 60), idx + 120) + '…';
        const safe = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        out.append(h('li', {}, h('a', { href: r.u, html: `<b>${safe(r.t).replace(re, '<mark>$1</mark>')}</b> <small>${r.c} · ${safe(snip).replace(re, '<mark>$1</mark>')}</small>` })));
      }
    }, 120);
    $('#searchBtn') && $('#searchBtn').addEventListener('click', openSearch);
    $('#closeSearch') && $('#closeSearch').addEventListener('click', closeSearch);
    input && input.addEventListener('input', run);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeSearch(); close(); }
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
    });
    // copy buttons
    $$('.code-card .copy').forEach((b) => b.addEventListener('click', async () => {
      const code = b.closest('.code-card').querySelector('code').innerText;
      try { await navigator.clipboard.writeText(code); b.textContent = 'Copied ✓'; } catch (e) { b.textContent = 'Select & copy'; }
      setTimeout(() => (b.textContent = 'Copy'), 1600);
    }));
  }

  // ------------------------------------------------------------ chapter reading progress
  function setupReading() {
    const prog = $('#readProg');
    const art = $('.chapter');
    const onScroll = () => {
      if (!prog) return;
      const el = art || document.body;
      const r = el.getBoundingClientRect();
      const total = r.height - innerHeight * .6;
      const pct = Math.min(100, Math.max(0, ((-r.top + 60) / Math.max(1, total)) * 100));
      prog.style.width = pct + '%';
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if (!window.PAGE || !art) return;
    const ch = PAGE.ch;
    const seenAt = {};
    const tocLinks = $$('.side-toc a[data-sec]');
    const markToc = (id, cls) => { const a = tocLinks.find((x) => x.dataset.sec === id); if (a) a.classList.add(cls); return a; };
    $$('.sec').forEach((sec) => { if (S.read[ch + ':' + sec.id]) { sec.classList.add('read'); markToc(sec.id, 'read'); } });
    const ioTop = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) {
        seenAt[e.target.id] ||= Date.now();
        tocLinks.forEach((a) => a.classList.toggle('active', a.dataset.sec === e.target.id));
      }
    }), { rootMargin: '-20% 0px -55% 0px' });
    $$('.sec, .boss').forEach((s) => ioTop.observe(s));
    const ioEnd = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const sec = e.target.closest('.sec'); if (!sec) return;
      const k = ch + ':' + sec.id;
      if (S.read[k]) return;
      if (Date.now() - (seenAt[sec.id] || Date.now()) < 2500) return;
      S.read[k] = 1; save(); sec.classList.add('read'); markToc(sec.id, 'read');
      award('read:' + k, 5, 'Section read ✔');
      achieve('first');
    }), { threshold: 1 });
    $$('.sec-done').forEach((s) => ioEnd.observe(s));
    const remember = debounce(() => {
      const cur = $$('.sec').find((s) => s.getBoundingClientRect().bottom > 120);
      S.last = { ch, file: location.pathname.split('/').pop() || 'index.html', sec: cur ? cur.id : null, title: PAGE.title, at: Date.now() }; save();
    }, 600);
    addEventListener('scroll', remember, { passive: true }); remember();
  }

  // ------------------------------------------------------------ quiz (boss battle)
  function setupQuiz() {
    const box = $('#quiz'); if (!box || !window.PAGE || !PAGE.quiz) return;
    const ch = PAGE.ch, Q = PAGE.quiz;
    const answers = S.quiz[ch] || [];
    const revealFragment = (animate) => {
      const f = $('#fragment'); f.hidden = false; $('#fragWord').textContent = PAGE.fragment;
      if (!animate) f.querySelector('.frag-card').style.animation = 'none';
    };
    const finish = (fresh) => {
      const right = answers.filter((a, i) => a === Q[i].a).length;
      let sc = $('.q-score', box);
      if (!sc) { sc = h('div', { class: 'q-card q-score' }); box.append(sc); }
      sc.innerHTML = `${right === Q.length ? '💯' : right >= Q.length / 2 ? '🎉' : '💪'} You got ${right} / ${Q.length}. ${right === Q.length ? 'Flawless!' : 'Scroll up to review the ones you missed, or try again.'}`;
      sc.append(h('div', {}, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { S.quiz[ch] = []; save(); answers.length = 0; box.innerHTML = ''; render(); } }, '↺ Try again')));
      S.frags[ch] = PAGE.fragment;
      if (fresh) {
        const wasDone = S.done[ch]; S.done[ch] = 1; save();
        revealFragment(true);
        if (!wasDone) { award('ch:' + ch, 50, `Chapter ${ch} complete!`); confetti(); }
        achieve('boss'); if (right === Q.length) achieve('perfect');
        const n = Object.keys(S.done).length; if (n >= 10) achieve('half'); if (n >= (window.SITE ? SITE.chapters.filter((c) => c.quiz).length : 22)) achieve('all');
      } else revealFragment(false);
      save();
    };
    function render() {
      Q.forEach((q, i) => {
        const card = h('div', { class: 'q-card' }, h('h4', { html: `<span>Q${i + 1}.</span> ${q.q}` }));
        const opts = h('div', { class: 'q-opts' });
        const why = h('p', { class: 'q-why', hidden: true, html: q.why });
        const lock = (pick, fresh) => {
          $$('button', opts).forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add('right'); if (j === pick && pick !== q.a) b.classList.add('wrong'); });
          why.hidden = false; why.innerHTML = (pick === q.a ? '✅ <b>Correct!</b> ' : '❌ <b>Not quite.</b> ') + q.why;
          if (fresh) {
            answers[i] = pick; S.quiz[ch] = answers; save();
            if (pick === q.a) award(`q:${ch}:${i}`, 20, 'Correct answer!'); else card.classList.add('shake');
            if (answers.filter((a) => a != null).length === Q.length) finish(true);
          }
        };
        q.o.forEach((o, j) => opts.append(h('button', { class: 'q-opt', type: 'button', html: o, onclick: () => lock(j, true) })));
        card.append(opts, why); box.append(card);
        if (answers[i] != null) lock(answers[i], false);
      });
      if (answers.filter((a) => a != null).length === Q.length) finish(false);
    }
    render();
  }

  // ------------------------------------------------------------ widgets
  const W = (window.W = window.W || {});
  function mount(el) {
    const id = el.dataset.w, def = W[id];
    if (el.dataset.mounted) return;
    el.dataset.mounted = '1';
    el.innerHTML = '';
    if (!def) { el.remove(); return; }
    const badge = h('span', { class: 'w-xp' + (S.got['w:' + id] ? ' got' : '') }, `+${def.xp || 15} XP`);
    el.append(h('div', { class: 'w-head' }, h('span', { class: 'w-chip' }, def.chip || '🎮 Try it'), h('h3', { class: 'w-title' }, def.title), badge));
    if (def.sub) el.append(h('p', { class: 'w-sub', html: def.sub }));
    const body = h('div', { class: 'w-body' }); el.append(body);
    const api = { done: (label) => award('w:' + id, def.xp || 15, label || def.title, badge), achieve, toast, confetti };
    Promise.resolve().then(() => def.init(body, api)).catch((err) => { console.error('[widget ' + id + ']', err); body.append(h('p', { class: 'w-bad' }, 'This demo needs a newer browser (Web Crypto API).')); });
  }
  function setupWidgets() {
    const els = $$('.widget[data-w]');
    if (!('IntersectionObserver' in window)) return els.forEach(mount);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target); } }), { rootMargin: '600px 0px' });
    els.forEach((el) => io.observe(el));
  }

  // ------------------------------------------------------------ public API
  window.CS = { mountAll: () => $$('.widget[data-w]').forEach(mount), $, $$, h, enc, dec, hex, fromHex, b64, fromB64, rand, subtle, sha, hmac, modpow, gcd, modinv, isPrime, bitDiff, popcount8, debounce, fmt, sleep, sketch, css, toast, confetti, modal, award, achieve, isDark, get state() { return S; }, save, LEVELS, levelOf, ACH };

  document.addEventListener('DOMContentLoaded', () => {
    tickStreak(); renderXP(); setThemeIcon(); setupNav(); setupReading(); setupQuiz(); setupWidgets();
    if ($$('.drawer-link').length && document.body.classList.contains('page-chapter') && window.PAGE && PAGE.ch) {
      document.addEventListener('keydown', (e) => {
        if (/input|textarea|select/i.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
        const a = e.key === 'ArrowRight' && e.shiftKey ? $('.next-card .btn.big') : null; if (a) location.href = a.href;
      });
    }
  });
})();
