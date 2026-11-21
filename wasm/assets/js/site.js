/* ==========================================================
   site.js — shared chrome for every page
   Top bar, chapter drawer, prev/next pager, footer, theme
   toggle, reading progress and "chapters visited" ticks.
   ========================================================== */
(function () {
  'use strict';

  var CHAPTERS = [
    { id: 'plain-words', file: '01-plain-words.html', title: 'Wasm in plain words', blurb: 'The kitchen analogy and what Wasm is, in one minute.', icon: 'bulb' },
    { id: 'why', file: '02-why.html', title: 'Why Wasm exists', blurb: 'What JavaScript struggles with, and the road from asm.js to Wasm 3.0.', icon: 'question' },
    { id: 'key-terms', file: '03-key-terms.html', title: 'Key terms', blurb: 'Seven words, flip cards and a stack machine you can play with.', icon: 'book' },
    { id: 'architecture', file: '04-architecture.html', title: 'Architecture', blurb: 'From source code to a module to a sandboxed instance.', icon: 'blueprint' },
    { id: 'js-engine', file: '05-js-engine.html', title: 'Inside a JS engine', blurb: 'Parser, interpreter, JIT tiers, garbage collector, event loop.', icon: 'gear' },
    { id: 'wasm-and-engine', file: '06-wasm-and-engine.html', title: 'Wasm rides the JS engine', blurb: 'Which engine parts Wasm skips and which it borrows.', icon: 'merge' },
    { id: 'running', file: '07-running.html', title: 'How Wasm runs', blurb: 'Fetch, compile, validate, instantiate, call. Plus passing a string.', icon: 'play' },
    { id: 'browser-features', file: '08-browser-features.html', title: 'Borrowed browser powers', blurb: 'What is built into Wasm and what it borrows through JavaScript.', icon: 'toolbox' },
    { id: 'gpu', file: '09-gpu.html', title: 'Reaching the GPU', blurb: 'The trip from Wasm memory to graphics hardware.', icon: 'chip' },
    { id: 'limitations', file: '10-limitations.html', title: 'Limitations', blurb: 'What Wasm cannot do yet, why, and today’s workarounds.', icon: 'wall' },
    { id: 'future', file: '11-future.html', title: 'What comes next', blurb: 'Proposals on their way through the five standards phases.', icon: 'rocket' },
    { id: 'quiz', file: '12-quiz.html', title: 'Quiz & sources', blurb: 'Ten questions to check yourself, and where the facts come from.', icon: 'pencil' }
  ];

  var ICONS = {
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
    question: 'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.7v.6M12 17.2v.1',
    book: 'M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3zM21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z',
    blueprint: 'M3 3h7v6H3zM14 3h7v6h-7zM8.5 15h7v6h-7zM6.5 9v3h11V9M12 12v3',
    gear: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22M4.9 4.9l2.5 2.5M16.6 16.6l2.5 2.5M4.9 19.1l2.5-2.5M16.6 7.4l2.5-2.5',
    merge: 'M5 3c0 6 7 5 7 11v7M19 3c0 6-7 5-7 11M9 18l3 3 3-3',
    play: 'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM10 8l6 4-6 4z',
    toolbox: 'M3 8h18v12H3zM8.5 8V5h7v3M3 13h18M10.5 12h3v2.5h-3z',
    chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4',
    wall: 'M3 5h18v15H3zM3 10h18M3 15h18M9 5v5M15 5v5M6 10v5M12 10v5M18 10v5M9 15v5M15 15v5',
    rocket: 'M12 2.5c4 3 5.2 8 3.2 13H8.8C6.8 10.5 8 5.5 12 2.5zM8.8 15.5l-3 4 4-1.2M15.2 15.5l3 4-4-1.2M12 8a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 12 8zM12 18.5v3',
    pencil: 'M4 20l1-4.5L16.5 4l3.5 3.5L8.5 19zM14 6.5l3.5 3.5M4 20l4.5-1',
    home: 'M3 11.5l9-8 9 8M5.5 9.5V20h13V9.5M10 20v-5h4v5',
    menu: 'M4 7c5-.6 11-.4 16 0M4 12.2c5.5-.5 10.5-.2 16-.2M4 17.4c5-.5 11-.3 16 0',
    close: 'M6 6c4 4 8 8 12 12M18 6c-4 4-8 8-12 12',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2L7 7M17 17l1.8 1.8M5.2 18.8L7 17M17 7l1.8-1.8',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'
  };

  function icon(name, cls) {
    return '<svg class="doodle-icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path class="ink wob" d="' + (ICONS[name] || ICONS.bulb) + '"/></svg>';
  }

  // ---------- storage (always optional) ----------
  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  var VISITED_KEY = 'wasm-sketchbook-visited';
  var THEME_KEY = 'wasm-sketchbook-theme';

  var page = document.body.getAttribute('data-page') || 'home';
  var index = -1;
  CHAPTERS.forEach(function (c, i) { if (c.id === page) index = i; });

  var visited = readJSON(VISITED_KEY, []);
  if (index >= 0 && visited.indexOf(page) === -1) {
    visited.push(page);
    writeJSON(VISITED_KEY, visited);
  }

  // ---------- wobble filter used by doodles ----------
  var filterHost = document.createElement('div');
  filterHost.innerHTML =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
    '<filter id="sk-wobble" x="-5%" y="-5%" width="110%" height="110%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>' +
    '</filter></svg>';
  document.body.insertBefore(filterHost.firstChild, document.body.firstChild);

  // ---------- reading progress ----------
  var bar = document.createElement('div');
  bar.className = 'read-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(bar, document.body.firstChild);
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    bar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- top bar ----------
  var topbar = document.createElement('header');
  topbar.className = 'topbar';
  topbar.innerHTML =
    '<button class="icon-btn menu-btn" type="button" aria-label="Open chapter list" aria-expanded="false" aria-controls="chapter-drawer">' + icon('menu') + '</button>' +
    '<a class="brand" href="index.html">Wasm <span>Sketchbook</span></a>' +
    '<a class="home-link" href="../index.html" title="All explainers">&larr; all</a>' +
    '<span class="topbar-progress">' + (index >= 0 ? 'Ch ' + (index + 1) + ' / ' + CHAPTERS.length : visited.length + ' / ' + CHAPTERS.length + ' read') + '</span>' +
    '<button class="icon-btn theme-btn" type="button" aria-label="Switch light or dark theme"></button>';
  document.body.insertBefore(topbar, bar.nextSibling);

  // ---------- drawer ----------
  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  var drawer = document.createElement('nav');
  drawer.className = 'drawer';
  drawer.id = 'chapter-drawer';
  drawer.setAttribute('aria-label', 'Chapters');
  var items = '<li><a href="../index.html"><span aria-hidden="true" style="width:28px;text-align:center;font-size:1.4rem">&larr;</span><span>All explainers</span><span></span></a></li>' +
    '<li><a href="index.html"' + (page === 'home' ? ' aria-current="page"' : '') + '>' + icon('home') + '<span>Start here</span><span></span></a></li>' +
    '<li><a href="animation.html">' + icon('play') + '<span>Wasm in two minutes</span><span></span></a></li>';
  CHAPTERS.forEach(function (c, i) {
    items += '<li><a href="' + c.file + '"' + (c.id === page ? ' aria-current="page"' : '') + '>' +
      icon(c.icon) +
      '<span><span class="num">' + (i + 1) + '.</span> ' + c.title + '</span>' +
      '<span class="check" aria-label="' + (visited.indexOf(c.id) >= 0 ? 'visited' : '') + '">' + (visited.indexOf(c.id) >= 0 ? '✓' : '') + '</span>' +
      '</a></li>';
  });
  drawer.innerHTML =
    '<div class="drawer-head"><a class="brand" href="index.html">Wasm <span>Sketchbook</span></a>' +
    '<button class="icon-btn close-btn" type="button" aria-label="Close chapter list">' + icon('close') + '</button></div>' +
    '<ol>' + items + '</ol>';
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  var menuBtn = topbar.querySelector('.menu-btn');
  function setDrawer(open) {
    drawer.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) drawer.querySelector('a').focus();
  }
  menuBtn.addEventListener('click', function () { setDrawer(true); });
  overlay.addEventListener('click', function () { setDrawer(false); });
  drawer.querySelector('.close-btn').addEventListener('click', function () { setDrawer(false); menuBtn.focus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) { setDrawer(false); menuBtn.focus(); }
  });

  // ---------- theme ----------
  var themeBtn = topbar.querySelector('.theme-btn');
  function currentTheme() {
    var set = document.documentElement.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function paintThemeBtn() {
    var dark = currentTheme() === 'dark';
    themeBtn.innerHTML = icon(dark ? 'sun' : 'moon');
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light sketchbook' : 'Switch to dark chalkboard');
  }
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    paintThemeBtn();
  });
  paintThemeBtn();

  // ---------- chapter kicker icon ----------
  document.querySelectorAll('.chapter-kicker[data-icon]').forEach(function (el) {
    el.insertAdjacentHTML('afterbegin', icon(el.getAttribute('data-icon')));
  });

  // ---------- home: chapter map ----------
  var map = document.getElementById('chapter-map');
  if (map) {
    var html = '';
    CHAPTERS.forEach(function (c, i) {
      var seen = visited.indexOf(c.id) >= 0;
      html += '<li><a class="map-card sk-box" data-fill="' + (seen ? 'green' : 'paper') + '" href="' + c.file + '">' +
        icon(c.icon) +
        '<span><span class="num">Chapter ' + (i + 1) + (seen ? ' <span class="seen">✓ read</span>' : '') + '</span>' +
        '<span class="box-title">' + c.title + '</span>' +
        '<span class="box-sub">' + c.blurb + '</span></span></a></li>';
    });
    map.innerHTML = html;
  }

  // ---------- pager ----------
  var main = document.querySelector('main');
  if (main && index >= 0) {
    var prev = index > 0 ? CHAPTERS[index - 1] : null;
    var next = index < CHAPTERS.length - 1 ? CHAPTERS[index + 1] : null;
    var pager = document.createElement('nav');
    pager.className = 'pager';
    pager.setAttribute('aria-label', 'Chapter navigation');
    pager.innerHTML =
      (prev
        ? '<a class="sk-box prev" data-fill="paper" href="' + prev.file + '"><span class="dir">← Previous</span><span class="box-title">' + prev.title + '</span></a>'
        : '<a class="sk-box prev" data-fill="paper" href="index.html"><span class="dir">← Back to</span><span class="box-title">The start</span></a>') +
      (next
        ? '<a class="sk-box next" data-fill="yellow" href="' + next.file + '"><span class="dir">Next →</span><span class="box-title">' + next.title + '</span></a>'
        : '<a class="sk-box next" data-fill="yellow" href="index.html"><span class="dir">All done →</span><span class="box-title">Back to the map</span></a>');
    main.appendChild(pager);
  }

  // ---------- footer ----------
  var footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = 'Wasm Sketchbook · hand-drawn notes on WebAssembly · facts checked as of Nov 2026 (see <a href="12-quiz.html#sources">sources</a>)';
  document.body.appendChild(footer);

  window.SiteData = { chapters: CHAPTERS, icon: icon };

  if (window.Sketch) window.Sketch.refresh(document);
  onScroll();
})();
