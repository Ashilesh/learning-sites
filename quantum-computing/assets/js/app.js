/* app.js: the "hook" layer. XP, levels, daily streaks, badges, quizzes,
   reading progress, the episode drawer with search, the home-page journey
   map and story player, and the Quick Bites feed. Progress lives only in
   this browser's localStorage (and the site works fine without it). */
(function () {
  'use strict';
  const D = window.QSK || { chapters: [], parts: [], tracks: [], search: [], bites: 0, widgets: 0 };
  const KEY = 'qsk:v1';
  const ROOT = document.querySelector('link[rel="stylesheet"][href*="assets/css"]').getAttribute('href').replace(/assets\/css\/style\.css.*$/, '');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------------ state */
  const blank = () => ({ xp: 0, ch: {}, sec: {}, q: {}, w: {}, ex: {}, myth: {}, bites: {}, liked: {}, badges: {}, checks: {}, streak: { last: '', n: 0 }, track: '', lastCh: '' });
  let S = blank();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* private mode: keep in memory */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  const LEVELS = [[0, 'Classical Muggle'], [80, 'Bit Flipper'], [250, 'Superposer'], [500, 'Phase Kicker'], [850, 'Entangler'],
    [1300, 'Interference Wizard'], [1900, 'Error Corrector'], [2700, 'Fault-Tolerant Sage'], [3600, 'Quantum Grandmaster']];
  const level = (xp) => { let i = 0; LEVELS.forEach(([t], j) => { if (xp >= t) i = j; }); return i; };
  const chById = Object.fromEntries(D.chapters.map((c) => [c.id, c]));
  const partOf = (pk) => D.chapters.filter((c) => c.part === pk);
  const doneCount = () => D.chapters.filter((c) => S.ch[c.id]).length;
  const correctCount = () => Object.values(S.q).filter((v) => v === 'right').length;

  const BADGES = [
    ['first', '🎯', 'First measurement', 'Finish your first episode', () => doneCount() >= 1],
    ...D.parts.map((p) => [`part-${p.key}`, p.emoji, { 1: 'Foundation layer', 2: 'Signal sent', 3: 'Algorithm ace', 4: 'Hardware hacker', 5: 'Code wizard', 6: 'Beyond computing', 7: 'Big-picture thinker', 8: 'Bonus round' }[p.key],
      `Finish every episode in ${p.roman ? 'Part ' + p.roman : 'the appendices'}`, () => partOf(p.key).every((c) => S.ch[c.id])]),
    ['perfect', '💯', 'Perfect interference', 'Ace a whole episode quiz on the first try', () => D.chapters.some((c) => c.quiz && Array.from({ length: c.quiz }, (_, i) => S.q[`${c.id}-${i}`]).every((v) => v === 'right'))],
    ['quiz-10', '🧠', 'Quiz whiz', 'Answer 10 quiz questions right', () => correctCount() >= 10],
    ['quiz-50', '🏅', 'Know-it-all', 'Answer 50 quiz questions right', () => correctCount() >= 50],
    ['tinker-5', '🧪', 'Tinkerer', 'Play with 5 interactive widgets', () => Object.keys(S.w).length >= 5],
    ['tinker-15', '⚗️', 'Mad scientist', 'Play with 15 widgets', () => Object.keys(S.w).length >= 15],
    ['tinker-all', '🌌', 'Played them all', `Play with all ${D.widgets} widgets`, () => Object.keys(S.w).length >= D.widgets],
    ['bites-10', '🍿', 'Snack attack', 'Swipe through 10 Quick Bites', () => Object.keys(S.bites).length >= 10],
    ['bites-all', '🍱', 'Bite collector', `See all ${D.bites} Quick Bites`, () => Object.keys(S.bites).length >= D.bites],
    ['solver', '✏️', 'Problem solver', 'Reveal 10 exercise solutions', () => Object.keys(S.ex).length >= 10],
    ['streak-3', '🔥', 'On fire', 'Read on 3 days in a row', () => S.streak.n >= 3],
    ['streak-7', '☄️', 'Unstoppable', 'Read on 7 days in a row', () => S.streak.n >= 7],
    ['all', '👑', 'Quantum Grandmaster', 'Finish all episodes', () => doneCount() >= D.chapters.length],
  ];

  /* ------------------------------------------------------------------ toasts, confetti, XP */
  function toast(emo, title, sub = '') {
    const box = $('.toasts'); if (!box) return;
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="t-emo">${emo}</span><span>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
    box.append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 3200);
  }
  function confetti(n = 70) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = ['--violet', '--coral', '--teal', '--sky', '--sun', '--pink', '--lime', '--amber'].map((c) => getComputedStyle(document.body).getPropertyValue(c));
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.left = `${Math.random() * 100}vw`; c.style.background = cols[i % cols.length];
      c.style.animationDuration = `${1.6 + Math.random() * 1.8}s`; c.style.animationDelay = `${Math.random() * 0.4}s`;
      c.style.borderRadius = i % 3 ? '2px' : '50%';
      document.body.append(c); setTimeout(() => c.remove(), 4200);
    }
  }
  function addXP(n, why) {
    const before = level(S.xp);
    S.xp += n; save(); hud();
    $$('.xp-chip').forEach((x) => { x.classList.remove('bump'); void x.offsetWidth; x.classList.add('bump'); });
    if (why) toast('⚡', `+${n} XP`, why);
    const after = level(S.xp);
    if (after > before) { setTimeout(() => { toast('🆙', `Level up: ${LEVELS[after][1]}!`, `${S.xp} XP`); confetti(90); }, 500); }
    checkBadges();
  }
  function checkBadges() {
    BADGES.forEach(([id, emo, name, desc, test]) => {
      if (!S.badges[id] && test()) { S.badges[id] = Date.now(); save(); setTimeout(() => { toast(emo, `Badge unlocked: ${name}`, desc); confetti(50); }, 900); }
    });
    hud();
  }
  function hud() {
    const L = level(S.xp);
    $$('[data-xp]').forEach((x) => { x.textContent = S.xp.toLocaleString('en-US'); });
    $$('[data-level]').forEach((x) => { x.textContent = LEVELS[L][1]; });
    $$('[data-streak]').forEach((x) => { x.textContent = S.streak.n; });
    $$('[data-done]').forEach((x) => { x.textContent = doneCount(); });
    $$('[data-badges]').forEach((x) => { x.textContent = `${Object.keys(S.badges).length}/${BADGES.length}`; });
  }

  /* ------------------------------------------------------------------ daily streak */
  (function streak() {
    const day = (d) => d.toISOString().slice(0, 10);
    const now = new Date(), today = day(now), y = new Date(now); y.setDate(now.getDate() - 1);
    if (S.streak.last === today) return;
    const cont = S.streak.last === day(y);
    S.streak = { last: today, n: cont ? S.streak.n + 1 : 1 }; save();
    if (cont) setTimeout(() => addXP(20, `🔥 ${S.streak.n}-day streak! Come back tomorrow to keep it alive.`), 1200);
  })();

  /* ------------------------------------------------------------------ theme */
  function isDark() { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
  function syncThemeBtn() { $$('.theme-toggle').forEach((b) => { b.firstElementChild.textContent = isDark() ? '☀️' : '🌙'; b.setAttribute('aria-label', isDark() ? 'Switch to paper (light) mode' : 'Switch to chalkboard (dark) mode'); }); }
  $$('.theme-toggle').forEach((b) => b.addEventListener('click', () => {
    const t = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('qsk-theme', t); } catch (e) { /* ignore */ }
    syncThemeBtn(); document.dispatchEvent(new CustomEvent('qsk:theme'));
  }));
  syncThemeBtn();

  /* ------------------------------------------------------------------ drawer (episodes + search) & trophies */
  const here = document.querySelector('main')?.dataset.ch;
  function openPanel(id) {
    const wrap = document.getElementById(id); if (!wrap) return;
    const panel = wrap.firstElementChild;
    if (id === 'drawer') renderDrawer(panel); else renderTrophies(panel);
    wrap.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(() => (panel.querySelector('input') || panel.querySelector('button'))?.focus(), 30);
  }
  function closePanels() { $$('.drawer, .modal').forEach((w) => { w.hidden = true; }); document.body.style.overflow = document.body.classList.contains('bites-body') ? 'hidden' : ''; }
  document.addEventListener('click', (e) => {
    const op = e.target.closest('[data-open]'); if (op) { openPanel(op.dataset.open); return; }
    if (e.target.matches('.drawer, .modal') || e.target.closest('.close-x')) closePanels();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels(); });
  function renderDrawer(p) {
    const parts = D.parts.map((pt) => {
      const items = partOf(pt.key).map((c) => `<li><a href="${ROOT}${c.file}" class="${S.ch[c.id] ? 'done' : ''} ${c.id === here ? 'current' : ''}"><span class="d-num">${c.id}</span><span>${c.emoji} ${esc(c.title)}</span><span class="d-st">${S.ch[c.id] ? '✓' : c.minutes + 'm'}</span></a></li>`).join('');
      return `<div class="d-part"><i style="background:var(--${pt.color})"></i>${pt.roman ? 'Part ' + pt.roman + ': ' : ''}${esc(pt.title)}</div><ul class="d-list">${items}</ul>`;
    }).join('');
    p.innerHTML = `<div class="panel-head"><h2>📚 All episodes</h2><button class="close-x" type="button" aria-label="Close">✕</button></div>
      <input class="search-box" type="search" placeholder="Search ${D.search.length} sections & glossary terms..." aria-label="Search the guide"><div class="search-results"></div>
      <p style="margin:0;font-weight:700">${doneCount()} of ${D.chapters.length} done · <a href="${ROOT}index.html">journey map</a> · <a href="${ROOT}bites.html">quick bites</a></p>${parts}`;
    const box = p.querySelector('.search-box'), res = p.querySelector('.search-results');
    box.addEventListener('input', () => {
      const q = box.value.trim().toLowerCase();
      if (q.length < 2) { res.innerHTML = ''; return; }
      const hits = D.search.map((x) => { const t = x.t.toLowerCase(), s = t.includes(q) ? (t.startsWith(q) ? 3 : 2) : x.x.toLowerCase().includes(q) ? 1 : 0; return [s, x]; })
        .filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 12);
      res.innerHTML = hits.length ? hits.map(([, x]) => { const c = chById[x.c]; return `<a href="${ROOT}${c.file}#${x.a}"><b>${esc(x.n)} ${esc(x.t)}</b><small>${c.id === 'A' && x.n === '📖' ? 'Glossary' : 'Ch ' + c.id + ' · ' + esc(c.title)} — ${esc(x.x.slice(0, 90))}…</small></a>`; }).join('') : '<p>No matches. Try another word.</p>';
    });
  }
  function renderTrophies(p) {
    const L = level(S.xp), next = LEVELS[L + 1], lo = LEVELS[L][0];
    const prog = next ? (S.xp - lo) / (next[0] - lo) : 1;
    p.innerHTML = `<div class="panel-head"><h2>🏆 Your sketchbook</h2><button class="close-x" type="button" aria-label="Close">✕</button></div>
      <div class="lvl-card"><div class="lvl-badge">${L + 1}</div><div><div class="lvl-name">${LEVELS[L][1]}</div><div class="lvl-bar"><i style="width:${(prog * 100).toFixed(1)}%"></i></div>
      <div class="lvl-next">${S.xp.toLocaleString('en-US')} XP${next ? ` · ${next[0] - S.xp} XP to ${next[1]}` : ' · max level!'}</div></div></div>
      <div class="w-stats" style="margin-top:14px"><div class="w-stat"><b>${doneCount()}/${D.chapters.length}</b><span>episodes</span></div><div class="w-stat"><b>${correctCount()}</b><span>quiz answers right</span></div>
      <div class="w-stat"><b>${Object.keys(S.w).length}/${D.widgets}</b><span>widgets played</span></div><div class="w-stat"><b>🔥 ${S.streak.n}</b><span>day streak</span></div></div>
      <h3 style="font:700 1.6rem var(--f-hand);margin:16px 0 0">Badges (${Object.keys(S.badges).length}/${BADGES.length})</h3>
      <div class="badges">${BADGES.map(([id, emo, name, desc]) => `<div class="badge ${S.badges[id] ? '' : 'locked'}"><span class="b-emo">${emo}</span><b>${esc(name)}</b>${esc(desc)}</div>`).join('')}</div>
      <p style="font-size:.85rem;color:var(--ink-2)">How to earn XP: finish an episode (+50), answer a quiz question right first time (+10), play with a widget (+15), reveal an exercise solution (+10), bust a myth (+5), swipe a Quick Bite (+5), keep a daily streak (+20).</p>
      <button type="button" class="reset-link" data-reset-all>Reset all progress</button>`;
    p.querySelector('[data-reset-all]').addEventListener('click', () => { if (confirm('Erase all XP, badges and progress saved in this browser?')) { S = blank(); save(); location.reload(); } });
  }

  /* ------------------------------------------------------------------ reading progress */
  const bar = $('.read-progress > div');
  function onScroll() {
    if (!bar) return;
    const h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    bar.style.width = `${max > 0 ? (h.scrollTop / max) * 100 : 0}%`;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ------------------------------------------------------------------ copy buttons */
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.copy-btn'); if (!b) return;
    const code = b.closest('.codebox').querySelector('code').innerText;
    try { await navigator.clipboard.writeText(code); b.textContent = 'Copied!'; } catch (err) { b.textContent = 'Select & copy'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1600);
  });

  /* ------------------------------------------------------------------ widgets: lazy mount + XP */
  const widgets = $$('.widget');
  if (widgets.length && window.QSKWidgets) {
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { window.QSKWidgets.mount(en.target); io.unobserve(en.target); } }), { rootMargin: '400px 0px' }) : null;
    widgets.forEach((w) => {
      const key = `${here || 'x'}:${w.dataset.widget}`;
      if (S.w[key]) w.classList.add('played');
      if (io) io.observe(w); else window.QSKWidgets.mount(w);
      w.addEventListener('qsk:played', () => { if (S.w[key]) return; S.w[key] = 1; w.classList.add('played'); addXP(15, `Played: ${w.querySelector('.widget-title').textContent}`); });
    });
  }

  /* ------------------------------------------------------------------ chapter page */
  if (here) {
    S.lastCh = here; save();
    const secs = $$('.sec');
    const links = (sid) => $$(`.toc-side a[href="#${sid}"], .toc-mobile a[href="#${sid}"]`);
    const markRead = (sid) => { if (!S.sec[sid + '@' + here]) { S.sec[sid + '@' + here] = 1; save(); } links(sid).forEach((a) => a.classList.add('read')); tocProg(); };
    const tocProg = () => { const n = secs.filter((s) => S.sec[s.id + '@' + here]).length, p = $('.toc-progress > div'); if (p) p.style.width = `${secs.length ? (n / secs.length) * 100 : 100}%`; return n; };
    secs.forEach((s) => { if (S.sec[s.id + '@' + here]) links(s.id).forEach((a) => a.classList.add('read')); });
    tocProg();
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((es) => es.forEach((en) => {
        if (en.isIntersecting) { $$('.toc-side a.active').forEach((a) => a.classList.remove('active')); links(en.target.id).forEach((a) => a.classList.add('active')); }
      }), { rootMargin: '-30% 0px -60% 0px' });
      secs.forEach((s) => spy.observe(s));
      const readObs = new IntersectionObserver((es) => es.forEach((en) => {
        if (!en.isIntersecting && en.boundingClientRect.top < 0) markRead(en.target.id);
      }), { threshold: 0 });
      secs.forEach((s) => readObs.observe(s));
      const end = $('.ch-end');
      if (end) new IntersectionObserver((es) => es.forEach((en) => {
        if (!en.isIntersecting) return;
        secs.forEach((s) => { if (s.getBoundingClientRect().bottom < innerHeight) markRead(s.id); });
        if (S.ch[here]) return;
        if (tocProg() < Math.ceil(secs.length * 0.5)) { toast('👀', 'Skimmed to the end?', 'Read through the sections to complete this episode.'); return; }
        S.ch[here] = Date.now(); save();
        $('.done-flag')?.removeAttribute('hidden');
        addXP(50, `Episode complete: ${chById[here]?.title || ''}`); confetti(110);
        $('.next-card')?.classList.add('pulse');
      }), { threshold: 0.6 }).observe(end);
    }
    if (S.ch[here]) $('.done-flag')?.removeAttribute('hidden');

    // quizzes
    $$('.q').forEach((q) => {
      const id = q.dataset.q, ans = +q.dataset.answer, opts = $$('.q-opt', q);
      const reveal = (picked) => {
        opts.forEach((o, i) => { o.disabled = true; if (i === ans) o.classList.add('correct'); if (i === picked && i !== ans) o.classList.add('wrong'); });
        $('.q-why', q).hidden = false;
      };
      if (S.q[id]) reveal(S.q[id] === 'right' ? ans : -1);
      opts.forEach((o, i) => o.addEventListener('click', () => {
        if (S.q[id]) return;
        S.q[id] = i === ans ? 'right' : 'wrong'; save(); reveal(i);
        if (i === ans) addXP(10, 'Correct!'); else { toast('🤔', 'Not quite', 'Read the explanation: wrong answers teach too.'); checkBadges(); }
      }));
    });
    // exercise solutions
    $$('details.solution').forEach((d) => {
      const id = `${here}-${d.dataset.ex || $$('details.solution').indexOf(d)}`;
      d.addEventListener('toggle', () => { if (d.open && !S.ex[id]) { S.ex[id] = 1; save(); addXP(10, 'Solution revealed. Did you get it?'); } });
    });
    // checklists
    $$('input[data-check]').forEach((c) => {
      c.checked = !!S.checks[c.dataset.check];
      c.addEventListener('change', () => { S.checks[c.dataset.check] = c.checked ? 1 : 0; save(); if (c.checked) toast('✅', 'Ticked off!'); });
    });
    // myth cards
    $$('.myth-card').forEach((m, i) => m.addEventListener('click', () => {
      const on = m.classList.toggle('flipped'); m.setAttribute('aria-pressed', on);
      const id = `${here}-${i}`; if (on && !S.myth[id]) { S.myth[id] = 1; save(); addXP(5, 'Myth busted!'); }
    }));
    // glossary search + flashcards
    const g = $('.glossary');
    if (g) {
      const items = $$('.g-item', g), search = $('.g-search', g), list = $('.g-list', g), flash = $('.g-flashcards', g), fb = $('.g-flash', g);
      search.addEventListener('input', () => { const q = search.value.trim().toLowerCase(); items.forEach((it) => { it.hidden = q && !it.textContent.toLowerCase().includes(q); }); });
      let deck = [], k = 0;
      const card = () => {
        const it = deck[k];
        flash.innerHTML = `<button type="button" class="flashcard" aria-label="Flip card"><span class="fc-front">${it.querySelector('dt').innerHTML}</span><span class="fc-back">${it.querySelector('dd').innerHTML}</span></button>
          <div class="fc-nav"><button type="button" class="w-btn" data-fc="-1">← Prev</button><span>${k + 1} / ${deck.length} · tap the card to flip</span><button type="button" class="w-btn" data-fc="1">Next →</button><button type="button" class="w-btn" data-fc="0">🔀 Shuffle</button></div>`;
      };
      flash.addEventListener('click', (e) => {
        const f = e.target.closest('.flashcard'); if (f) { f.classList.toggle('flipped'); return; }
        const n = e.target.closest('[data-fc]'); if (!n) return;
        if (n.dataset.fc === '0') { deck.sort(() => Math.random() - 0.5); k = 0; } else k = (k + +n.dataset.fc + deck.length) % deck.length;
        card();
      });
      fb.addEventListener('click', () => {
        const on = flash.hidden; flash.hidden = !on; list.hidden = on; fb.textContent = on ? '📋 List mode' : '🃏 Flashcard mode';
        if (on) { deck = items.filter((it) => !it.hidden); k = 0; if (deck.length) card(); }
      });
    }
    // keyboard: n / p
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n') { const n = $('.next-card'); if (n) location.href = n.href; }
      if (e.key === 'p') { const p = $('.prev-link'); if (p) location.href = p.href; }
    });
  }

  /* ------------------------------------------------------------------ home page */
  if ($('.home')) {
    const nextUp = D.chapters.find((c) => !S.ch[c.id]);
    $$('.node').forEach((n) => {
      const id = n.dataset.node;
      n.classList.toggle('done', !!S.ch[id]);
      n.classList.toggle('next', nextUp && nextUp.id === id);
    });
    $$('[data-part-count]').forEach((x) => { const cs = partOf(x.dataset.partCount); x.textContent = `${cs.filter((c) => S.ch[c.id]).length}/${cs.length}`; });
    const cont = $('[data-continue]');
    if (cont && doneCount() > 0 && nextUp) { cont.href = ROOT + nextUp.file; cont.innerHTML = `▶ Continue: ${nextUp.appendix ? 'Appendix' : 'Episode'} ${nextUp.id} <small>(${nextUp.minutes} min)</small>`; }
    else if (cont && !nextUp) { cont.href = '#main'; cont.innerHTML = '👑 You finished everything!'; }
    // tracks
    const journey = $('.journey');
    const setTrack = (k) => {
      S.track = k; save();
      $$('.track-card').forEach((c) => c.setAttribute('aria-pressed', c.dataset.track === k));
      const tr = D.tracks.find((t) => t.key === k);
      journey.classList.toggle('tracking', !!tr);
      $$('.node').forEach((n) => n.classList.toggle('on-track', !!tr && tr.chapters.includes(n.dataset.node)));
    };
    $$('.track-card').forEach((c) => c.addEventListener('click', () => { setTrack(S.track === c.dataset.track ? '' : c.dataset.track); if (S.track) journey.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    if (S.track) setTrack(S.track);
    // stories
    const st = $('.stories');
    if (st) {
      const slides = $$('.story', st), bars = $$('.story-bars i', st), DUR = 5200;
      let i = 0, t0 = performance.now(), paused = false, acc = 0, seen = false;
      const show = (k) => {
        i = (k + slides.length) % slides.length; acc = 0; t0 = performance.now();
        slides.forEach((s, j) => s.classList.toggle('on', j === i));
        bars.forEach((b, j) => { b.style.width = j < i ? '100%' : '0'; });
        if (i === slides.length - 1 && !seen) { seen = true; }
      };
      const tick = (now) => {
        if (!paused) {
          const f = (acc + now - t0) / DUR;
          bars[i].style.width = `${Math.min(1, f) * 100}%`;
          if (f >= 1) show(i + 1);
        }
        requestAnimationFrame(tick);
      };
      $('.story-nav.next', st).addEventListener('click', () => show(i + 1));
      $('.story-nav.prev', st).addEventListener('click', () => show(i - 1));
      const pause = () => { if (!paused) { paused = true; acc += performance.now() - t0; } }, resume = () => { if (paused) { paused = false; t0 = performance.now(); } };
      st.addEventListener('pointerdown', () => { const h = setTimeout(pause, 220); st.addEventListener('pointerup', () => { clearTimeout(h); resume(); }, { once: true }); });
      st.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
      if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((en) => (en.isIntersecting ? resume() : pause()))).observe(st);
      show(0); requestAnimationFrame(tick);
    }
  }

  /* ------------------------------------------------------------------ Quick Bites */
  const feed = $('.bites-feed');
  if (feed) {
    const bites = $$('.bite[data-bite]', feed), hint = $('.bites-hint');
    bites.forEach((b) => {
      const id = b.dataset.bite, like = $('.bite-like', b);
      if (S.liked[id]) { like.setAttribute('aria-pressed', 'true'); like.firstChild.textContent = '💖 '; }
      like.addEventListener('click', () => {
        const on = !S.liked[id]; S.liked[id] = on ? 1 : 0; if (!on) delete S.liked[id]; save();
        like.setAttribute('aria-pressed', on); like.firstChild.textContent = on ? '💖 ' : '🤍 '; like.classList.remove('pop'); void like.offsetWidth; like.classList.add('pop');
      });
      $('.bite-share', b).addEventListener('click', async () => {
        const url = `${location.origin}${location.pathname}#bite-${id}`;
        try { await navigator.clipboard.writeText(url); toast('🔗', 'Link copied', 'Send this bite to a friend.'); } catch (e) { toast('🔗', 'Copy this link', url); }
      });
    });
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((es) => es.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.dataset.bite;
        if (id && id !== '1') hint?.classList.add('gone');
        if (id && !S.bites[id]) { S.bites[id] = 1; save(); addXP(5); }
        if (id) history.replaceState(null, '', `#bite-${id}`);
        if (en.target.classList.contains('bite-end')) confetti(60);
      }), { root: feed, threshold: 0.6 });
      $$('.bite', feed).forEach((b) => obs.observe(b));
    }
    const go = (d) => { const h = feed.clientHeight; feed.scrollBy({ top: d * h, behavior: 'smooth' }); };
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input')) return;
      if (['ArrowDown', 'j', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
      if (['ArrowUp', 'k', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    });
    if (location.hash.startsWith('#bite-')) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 50); }
    feed.focus({ preventScroll: true });
  }

  hud(); checkBadges();
})();
