/* =========================================================
   OS Sketchbook — core UI (nav, theme, quiz, tabs, terms…)
   ========================================================= */
(function () {
  'use strict';

  var CHAPTERS = [
    { id: 'index',       file: 'index.html',       n: 0,  title: 'What is an OS?',             icon: '🧠' },
    { id: 'lab',         file: 'lab.html',         n: 1,  title: '3D Linux Lab',               icon: '🖥️' },
    { id: 'boot',        file: 'boot.html',        n: 2,  title: 'Waking Up (Boot)',           icon: '⏰' },
    { id: 'processes',   file: 'processes.html',   n: 3,  title: 'Processes & Scheduling',     icon: '🏃' },
    { id: 'cpu',         file: 'cpu.html',         n: 4,  title: 'How the CPU Runs Code',      icon: '🔁' },
    { id: 'memory',      file: 'memory.html',      n: 5,  title: 'Memory, RAM & VRAM',         icon: '🧮' },
    { id: 'files',       file: 'files.html',       n: 6,  title: 'Everything is a File',       icon: '📁' },
    { id: 'kernel',      file: 'kernel.html',      n: 7,  title: 'Kernel, Syscalls & Devices', icon: '⚙️' },
    { id: 'concurrency', file: 'concurrency.html', n: 8,  title: 'Teamwork: Locks & IPC',      icon: '🤝' },
    { id: 'security',    file: 'security.html',    n: 9,  title: 'Users & Security',           icon: '🔐' },
    { id: 'containers',  file: 'containers.html',  n: 10, title: 'Containers & Docker',        icon: '📦' },
    { id: 'playground',  file: 'playground.html',  n: 11, title: 'Terminal Playground',        icon: '⌨️' },
    { id: 'design',      file: 'design.html',      n: 12, title: 'Design Decisions & Final Quiz', icon: '🏆' }
  ];

  /* ---------- safe storage ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('os-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('os-' + k, JSON.stringify(v)); } catch (e) {} }
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var page = document.body.getAttribute('data-page') || 'index';
  var cur = CHAPTERS.filter(function (c) { return c.id === page; })[0] || CHAPTERS[0];

  /* ---------- theme ---------- */
  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('os-theme', t); } catch (e) {}
    var b = $('#themeBtn'); if (b) { b.textContent = t === 'dark' ? '☀️' : '🌙'; b.title = t === 'dark' ? 'Switch to paper (light)' : 'Switch to midnight (dark)'; }
    window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onMq = function () { if (!document.documentElement.getAttribute('data-theme')) window.dispatchEvent(new CustomEvent('themechange', { detail: currentTheme() })); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------- progress ---------- */
  function progress() { return store.get('progress', {}); }
  function markDone(id) { var p = progress(); p[id] = 2; store.set('progress', p); renderDrawer(); }
  function markVisited(id) { var p = progress(); if (!p[id]) { p[id] = 1; store.set('progress', p); } }

  /* ---------- header + drawer ---------- */
  var LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="6" width="32" height="22" rx="4" fill="var(--yellow)" stroke="var(--ink)" stroke-width="2.5"/><rect x="8" y="10" width="24" height="14" rx="2" fill="var(--term-bg)"/><circle cx="15" cy="16" r="2" fill="#5cf0a8"/><circle cx="25" cy="16" r="2" fill="#5cf0a8"/><path d="M14 20 q6 4 12 0" stroke="#5cf0a8" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M15 28 l-3 6 h16 l-3-6" fill="var(--card)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/></svg>';

  function buildHeader() {
    var h = el('header', { class: 'site-header' });
    h.innerHTML = '<div class="wrap">' +
      '<a class="home-link" href="../index.html" title="All explainers">← <span>All explainers</span></a>' +
      '<a class="logo" href="index.html" aria-label="OS Sketchbook home">' + LOGO + '<span>OS Sketchbook<small>learn how computers think</small></span></a>' +
      '<div class="hdr-where">' + (cur.n ? 'Chapter ' + cur.n + ' · ' : '') + esc(cur.title) + '</div>' +
      '<div class="hdr-btns"><button class="btn icon" id="themeBtn" aria-label="Toggle dark mode"></button>' +
      '<button class="btn yellow" id="chapBtn" aria-haspopup="dialog" aria-controls="drawer">📚 <span>Chapters</span></button></div></div>';
    document.body.insertBefore(h, document.body.firstChild);
    var bg = el('div', { class: 'drawer-bg' });
    var d = el('aside', { class: 'drawer', id: 'drawer', role: 'dialog', 'aria-label': 'Chapters' });
    document.body.appendChild(bg); document.body.appendChild(d);
    renderDrawer();
    function open() { d.classList.add('open'); bg.classList.add('open'); var a = $('a.cur', d) || $('a', d); if (a) a.focus(); }
    function close() { d.classList.remove('open'); bg.classList.remove('open'); }
    $('#chapBtn').addEventListener('click', open);
    bg.addEventListener('click', close);
    d.addEventListener('click', function (e) { if (e.target.closest('.close')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    $('#themeBtn').addEventListener('click', function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); });
    var t = currentTheme(); var b = $('#themeBtn'); b.textContent = t === 'dark' ? '☀️' : '🌙';
  }
  function renderDrawer() {
    var d = $('#drawer'); if (!d) return;
    var p = progress(); var done = CHAPTERS.filter(function (c) { return p[c.id] === 2; }).length;
    d.innerHTML = '<button class="btn sm close" aria-label="Close">✕</button><h3>Chapters</h3>' +
      '<div class="prog">Stickers earned: <b>' + done + '</b> / ' + CHAPTERS.length + ' — pass a chapter quiz to earn its sticker ⭐</div><ol>' +
      CHAPTERS.map(function (c) {
        var st = p[c.id] === 2 ? '⭐' : (p[c.id] === 1 ? '👀' : '');
        return '<li><a href="' + c.file + '" class="' + (c.id === cur.id ? 'cur' : '') + '"><span class="n">' + c.n + '</span><span class="ic">' + c.icon + '</span><span>' + esc(c.title) + '</span><span class="done">' + st + '</span></a></li>';
      }).join('') + '</ol>';
  }

  /* ---------- footer / pager ---------- */
  function buildFooter() {
    var i = CHAPTERS.indexOf(cur), prev = CHAPTERS[i - 1], next = CHAPTERS[i + 1];
    var main = $('main') || document.body;
    var pg = el('nav', { class: 'pager wrap', 'aria-label': 'Chapter navigation' });
    pg.innerHTML = (prev ? '<a class="prev" href="' + prev.file + '"><small>← Previous</small><b>' + prev.icon + ' ' + esc(prev.title) + '</b></a>' : '<a class="empty" aria-hidden="true"></a>') +
      (next ? '<a class="next" href="' + next.file + '"><small>Next chapter →</small><b>' + next.icon + ' ' + esc(next.title) + '</b></a>' : '<a class="next" href="index.html"><small>All done! →</small><b>🏠 Back to the start</b></a>');
    main.appendChild(pg);
    var f = el('footer', { class: 'site-footer' });
    f.innerHTML = '<div class="wrap">✏️ OS Sketchbook — a hand-drawn guide to Operating Systems, explained with Linux. Commands shown are real Linux commands; outputs are trimmed examples and will differ on your machine.</div>';
    document.body.appendChild(f);
  }

  /* ---------- page TOC (from section h2) ---------- */
  function buildToc() {
    var toc = $('.toc'); if (!toc) return;
    var secs = $$('main section.sec[id]');
    toc.innerHTML = '<span class="lbl">Jump to:</span>' + secs.map(function (s) {
      var h = $('h2', s); var t = h ? (h.getAttribute('data-short') || h.textContent) : s.id;
      return '<a class="chip" href="#' + s.id + '">' + esc(t.trim()) + '</a>';
    }).join('');
  }

  /* ---------- terminals: colorize + copy ---------- */
  function initTerms(root) {
    $$('.term pre', root).forEach(function (pre) {
      if (pre.dataset.done) return; pre.dataset.done = 1;
      var lines = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
      pre.innerHTML = lines.map(function (l) {
        if (/^\$ /.test(l)) return '<span class="p">' + esc(l.slice(2)) + '</span>';
        if (/^# /.test(l) || l === '#') return '<span class="cm">' + esc(l) + '</span>';
        return '<span class="o">' + esc(l) + '</span>';
      }).join('\n');
      var term = pre.closest('.term');
      if (!$('.term-h', term)) {
        var hd = el('div', { class: 'term-h' }, '<i></i><i></i><i></i><span>' + esc(term.getAttribute('data-title') || 'bash — linux') + '</span>');
        term.insertBefore(hd, pre);
      }
      var cmds = lines.filter(function (l) { return /^\$ /.test(l); }).map(function (l) { return l.slice(2); });
      if (cmds.length && navigator.clipboard) {
        var b = el('button', { class: 'copy', type: 'button', 'aria-label': 'Copy commands' }, 'copy');
        b.addEventListener('click', function () { navigator.clipboard.writeText(cmds.join('\n')).then(function () { b.textContent = 'copied!'; setTimeout(function () { b.textContent = 'copy'; }, 1400); }); });
        term.appendChild(b);
      }
    });
  }

  /* ---------- tabs ---------- */
  function initTabs(root) {
    $$('[data-tabs]', root).forEach(function (box) {
      var btns = $$('.tabs button', box), panels = $$('[data-panel]', box);
      function show(id) {
        btns.forEach(function (b) { b.classList.toggle('active', b.dataset.tab === id); b.setAttribute('aria-selected', b.dataset.tab === id); });
        panels.forEach(function (p) { p.classList.toggle('active', p.dataset.panel === id); });
        box.dispatchEvent(new CustomEvent('tabchange', { detail: id }));
      }
      btns.forEach(function (b) { b.setAttribute('role', 'tab'); b.addEventListener('click', function () { show(b.dataset.tab); }); });
      if (btns[0]) show((btns.filter(function (b) { return b.classList.contains('active'); })[0] || btns[0]).dataset.tab);
    });
  }

  /* ---------- flip cards ---------- */
  function initFlips(root) {
    $$('.flip', root).forEach(function (f) {
      f.setAttribute('tabindex', '0'); f.setAttribute('role', 'button');
      var t = function () { f.classList.toggle('flipped'); };
      f.addEventListener('click', function (e) { if (!e.target.closest('a')) t(); });
      f.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } });
    });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var items = $$('.sec > *:not(.sec-title), .card, .sim, .diagram');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (i) { if (i.closest('.flip') || i.closest('.lab')) return; i.classList.add('reveal'); io.observe(i); });
    setTimeout(function () { items.forEach(function (i) { i.classList.add('in'); }); }, 4000); // safety net
  }

  /* ---------- toast ---------- */
  function toast(msg, ms) {
    var box = $('.toasts'); if (!box) { box = el('div', { class: 'toasts', 'aria-live': 'polite' }); document.body.appendChild(box); }
    var t = el('div', { class: 'toast' }, msg); box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, ms || 3200);
  }

  /* ---------- quiz ---------- */
  function quiz(target, qs, opts) {
    var root = typeof target === 'string' ? $(target) : target; if (!root) return;
    opts = opts || {};
    var chapter = opts.chapter || page, need = opts.pass || Math.ceil(qs.length * 0.6);
    var answered = 0, right = 0;
    root.classList.add('quiz'); root.innerHTML = '';
    qs.forEach(function (q, qi) {
      var c = el('div', { class: 'q-card' });
      c.innerHTML = '<div class="q"><b>Q' + (qi + 1) + '.</b>' + q.q + '</div><div class="q-opts"></div><div class="q-why">' + (q.why || '') + '</div>';
      var box = $('.q-opts', c);
      q.a.forEach(function (a, ai) {
        var b = el('button', { type: 'button' }, a);
        b.addEventListener('click', function () {
          var bs = $$('button', box); bs.forEach(function (x) { x.disabled = true; });
          bs[q.c].classList.add('right');
          if (ai !== q.c) { b.classList.add('wrong'); c.classList.add('shake'); } else { right++; b.classList.add('pop'); }
          $('.q-why', c).classList.add('show');
          answered++;
          if (answered === qs.length) finish();
        });
        box.appendChild(b);
      });
      root.appendChild(c);
    });
    var score = el('div', { class: 'q-card q-score' }, 'Answer all ' + qs.length + ' to earn this chapter\'s sticker ⭐');
    root.appendChild(score);
    function finish() {
      var pass = right >= need;
      score.innerHTML = (pass ? '<span class="sticker pop">' + (cur.icon || '⭐') + '</span><br>' : '') +
        'You got <b>' + right + ' / ' + qs.length + '</b>! ' + (pass ? 'Sticker earned! 🎉' : 'So close — read again & retry 💪') +
        '<div class="btn-row" style="justify-content:center"><button class="btn sm" type="button">↺ Try again</button></div>';
      $('button', score).addEventListener('click', function () { quiz(root, qs, opts); });
      if (pass) { markDone(chapter); confetti(); toast('⭐ Sticker earned for <b>' + esc(cur.title) + '</b>!'); }
      if (opts.onFinish) opts.onFinish(right, qs.length);
    }
  }

  /* ---------- confetti (tiny) ---------- */
  function confetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = el('canvas'); cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:150;width:100%;height:100%';
    document.body.appendChild(cv); var ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    var cols = ['#ff4f8b', '#ffbf1f', '#3a86ff', '#06b77f', '#8b5cf6', '#ff7f32'];
    var ps = []; for (var i = 0; i < 120; i++) ps.push({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 3, r: Math.random() * 6 + 3, c: cols[i % 6], a: Math.random() * 6 });
    var t0 = performance.now();
    (function f(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += .35; p.a += .2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(f); else cv.remove();
    })(t0);
  }

  /* ---------- typing terminal ---------- */
  function typeTerm(pre, lines, opts) {
    opts = opts || {}; var speed = opts.speed || 22; var i = 0, tok = {};
    pre._tok = tok; pre.innerHTML = '';
    function next() {
      if (pre._tok !== tok || i >= lines.length) { if (opts.done) opts.done(); return; }
      var l = lines[i++]; var span = document.createElement('span');
      var cls = /^\$ /.test(l) ? 'p' : (/^# /.test(l) ? 'cm' : 'o');
      span.className = cls; pre.appendChild(span); pre.appendChild(document.createTextNode('\n'));
      var txt = cls === 'p' ? l.slice(2) : l;
      if (cls === 'p') { var j = 0; (function ty() { if (pre._tok !== tok) return; span.textContent = txt.slice(0, ++j); if (j < txt.length) setTimeout(ty, speed * 2); else setTimeout(next, 260); })(); }
      else { span.textContent = txt; pre.scrollTop = pre.scrollHeight; setTimeout(next, opts.lineDelay || 110); }
    }
    next();
    return function stop() { pre._tok = null; };
  }

  /* ---------- when visible helper ---------- */
  function whenVisible(node, fn, margin) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (ents) { if (ents.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); } }, { rootMargin: margin || '200px' });
    io.observe(node);
  }

  /* ---------- learning map (home) ---------- */
  function chapterMap(target) {
    var root = typeof target === 'string' ? $(target) : target; if (!root) return;
    var p = progress();
    root.innerHTML = CHAPTERS.map(function (c, i) {
      var st = p[c.id] === 2 ? '<span class="badge y">⭐ done</span>' : (p[c.id] === 1 ? '<span class="badge">👀 peeked</span>' : '');
      return '<a class="card map-stop" href="' + c.file + '" style="--i:' + i + '"><span class="map-n">' + c.n + '</span><span class="map-ic">' + c.icon + '</span><b>' + esc(c.title) + '</b>' + st + '</a>';
    }).join('');
  }

  /* ---------- boot ---------- */
  function init() {
    buildHeader();
    buildToc();
    buildFooter();
    initTerms(document);
    initTabs(document);
    initFlips(document);
    initReveal();
    markVisited(cur.id);
    // keep current-hash section visible after the sticky header got injected
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 60); }
  }

  window.Core = {
    CHAPTERS: CHAPTERS, store: store, $: $, $$: $$, el: el, esc: esc,
    toast: toast, quiz: quiz, confetti: confetti, typeTerm: typeTerm, whenVisible: whenVisible,
    initTerms: initTerms, initTabs: initTabs, initFlips: initFlips, chapterMap: chapterMap,
    theme: currentTheme, markDone: markDone, page: page
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
