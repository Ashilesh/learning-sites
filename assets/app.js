/* Home page renderer. Reads window.SITE_CONFIG / CATEGORIES / SITES from
 * assets/sites.js. You should not need to edit this file to add a site.
 * To add a category icon: add an SVG path string to ICONS, then use its key
 * as `icon` in CATEGORIES. To add a category color: add --c-<id> in style.css
 * (light AND both dark blocks); otherwise --c-default is used. */
(function () {
  "use strict";

  var CONFIG = window.SITE_CONFIG || {};
  var CATS = window.CATEGORIES || [];
  var SITES = (window.SITES || []).slice();

  // 24x24 stroke icons (inner markup only).
  var ICONS = {
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>',
    network: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M11 7l-5 9M13 7l5 9M7.2 18h9.6"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    db: '<ellipse cx="12" cy="5.5" rx="7" ry="2.8"/><path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 9z"/>',
    tree: '<circle cx="12" cy="4.5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="3.5" cy="19.5" r="2"/><circle cx="8.5" cy="19.5" r="2"/><path d="M10.6 6l-3.2 4.5M13.4 6l3.2 4.5M5.2 13.8l-1 3.8M6.8 13.8l1 3.8"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    prism: '<path d="M12 3L3 19h18z"/><path d="M1 13l7.5-1.5M15.5 10.5L23 8M15.5 10.5L23 12M15.5 10.5L23 16"/>',
    atom: '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-60 12 12)"/>',
    blocks: '<rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="3" width="7" height="6" rx="1.5"/><rect x="8.5" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v3h11V9M12 12v3"/>',
  };

  var catById = {};
  CATS.forEach(function (c) { catById[c.id] = c; });
  // Sites whose category is missing still show up, under "Other".
  SITES.forEach(function (s) {
    if (!catById[s.category]) {
      if (!catById.other) { catById.other = { id: "other", name: "Other", icon: "code", blurb: "" }; CATS.push(catById.other); }
      s.category = "other";
    }
  });
  SITES.sort(function (a, b) { return (b.added || "").localeCompare(a.added || "") || a.title.localeCompare(b.title); });

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  };
  var catVar = function (id) { return "--cat: var(--c-" + id + ", var(--c-default))"; };
  var icon = function (key) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[key] || ICONS.code) + "</svg>"; };
  var isNew = function (s) {
    if (!s.added) return false;
    var days = (Date.now() - new Date(s.added + "T00:00:00").getTime()) / 864e5;
    return days >= 0 && days <= (CONFIG.newBadgeDays || 14);
  };
  var fmtDate = function (d) {
    try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
    catch (e) { return d; }
  };

  /* ---------- static bits ---------- */
  document.querySelectorAll("[data-config]").forEach(function (el) {
    var v = CONFIG[el.getAttribute("data-config")];
    if (v) el.textContent = v;
  });
  if (CONFIG.title) document.title = CONFIG.title;

  var usedCats = CATS.filter(function (c) { return SITES.some(function (s) { return s.category === c.id; }); });
  var topics = {};
  SITES.forEach(function (s) { if (s.topic) topics[s.topic] = 1; });
  var latest = SITES.reduce(function (m, s) { return s.added > m ? s.added : m; }, "");

  $("stats").innerHTML = [
    ["pages", SITES.length],
    ["topics", Object.keys(topics).length],
    ["categories", usedCats.length],
    ["updated", latest ? fmtDate(latest) : "—"],
  ].map(function (p) { return "<div><dt>" + p[0] + "</dt><dd>" + esc(p[1]) + "</dd></div>"; }).join("");
  if (latest) $("updated").textContent = "Last updated " + fmtDate(latest) + ".";

  var featured = SITES.filter(function (s) { return s.featured; });
  if (featured.length) {
    $("featuredWrap").hidden = false;
    $("featured").innerHTML = featured.map(function (s) {
      var c = catById[s.category];
      return '<a class="feat" href="' + esc(s.path) + '" style="' + catVar(c.id) + '">' +
        '<span class="glyph">' + icon(c.icon) + "</span>" +
        "<span><h3>" + esc(s.title) + "</h3><p>" + esc(s.topic ? s.topic + " · " : "") + esc(s.format || "") +
        (s.minutes ? " · ~" + s.minutes + " min" : "") + "</p></span></a>";
    }).join("");
  }

  /* ---------- filter state ---------- */
  var state = { cat: "all", q: "" };
  var readHash = function () {
    var m = /cat=([\w-]+)/.exec(location.hash);
    state.cat = m && catById[m[1]] ? m[1] : "all";
  };

  function renderChips() {
    var all = [{ id: "all", name: "All", n: SITES.length }].concat(usedCats.map(function (c) {
      return { id: c.id, name: c.name, n: SITES.filter(function (s) { return s.category === c.id; }).length };
    }));
    $("chips").innerHTML = all.map(function (c) {
      return '<button class="chip" role="tab" type="button" data-cat="' + c.id + '" aria-selected="' + (state.cat === c.id) + '">' +
        esc(c.name) + ' <span class="n">' + c.n + "</span></button>";
    }).join("");
  }

  function hl(text, q) {
    var t = esc(text);
    if (!q) return t;
    var rx = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return t.replace(rx, "<mark>$1</mark>");
  }

  function matches(s, q) {
    if (!q) return true;
    var c = catById[s.category];
    var hay = [s.title, s.description, s.topic, s.format, c && c.name].concat(s.tags || []).join(" ").toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function card(s, q) {
    var c = catById[s.category];
    var meta = [s.minutes ? "~" + s.minutes + " min" : "", s.added ? fmtDate(s.added) : ""].filter(Boolean).join(" · ");
    return '<article class="card" style="' + catVar(c.id) + '">' +
      '<div class="card-top">' +
        (s.topic ? '<span class="topic">' + esc(s.topic) + "</span>" : "") +
        '<span class="format">' + esc(s.format || "") + "</span>" +
        (isNew(s) ? '<span class="new">NEW</span>' : "") +
      "</div>" +
      '<h3><a href="' + esc(s.path) + '">' + hl(s.title, q) + "</a></h3>" +
      "<p>" + hl(s.description, q) + "</p>" +
      '<div class="card-foot">' +
        '<div class="tags">' + (s.tags || []).slice(0, 4).map(function (t) { return '<span class="tag">#' + hl(t, q) + "</span>"; }).join("") + "</div>" +
        '<span class="meta">' + esc(meta) + ' <span class="go" aria-hidden="true">→</span></span>' +
      "</div></article>";
  }

  function render() {
    var q = state.q.trim().toLowerCase();
    var html = "";
    var shown = 0;
    usedCats.forEach(function (c) {
      if (state.cat !== "all" && state.cat !== c.id) return;
      var list = SITES.filter(function (s) { return s.category === c.id && matches(s, q); });
      if (!list.length) return;
      shown += list.length;
      html += '<section class="cat" id="cat-' + c.id + '" style="' + catVar(c.id) + '">' +
        '<div class="cat-head"><span class="glyph">' + icon(c.icon) + "</span>" +
        "<div><h2>" + esc(c.name) + "</h2>" + (c.blurb ? "<p>" + esc(c.blurb) + "</p>" : "") + "</div>" +
        '<span class="count">' + list.length + (list.length === 1 ? " page" : " pages") + "</span></div>" +
        '<div class="grid">' + list.map(function (s) { return card(s, q); }).join("") + "</div></section>";
    });
    $("sections").innerHTML = html;
    $("empty").hidden = shown > 0;
    // Hide "Start here" while the user is filtering.
    if (featured.length) $("featuredWrap").hidden = !!q || state.cat !== "all";
  }

  /* ---------- events ---------- */
  $("chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    state.cat = b.getAttribute("data-cat");
    history.replaceState(null, "", state.cat === "all" ? location.pathname + location.search : "#cat=" + state.cat);
    renderChips(); render();
  });
  $("q").addEventListener("input", function (e) { state.q = e.target.value; render(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== $("q") && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault(); $("q").focus();
    } else if (e.key === "Escape" && document.activeElement === $("q")) {
      $("q").value = ""; state.q = ""; render(); $("q").blur();
    }
  });
  window.addEventListener("hashchange", function () { readHash(); renderChips(); render(); });

  $("themeBtn").addEventListener("click", function () {
    var root = document.documentElement;
    var cur = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  readHash(); renderChips(); render();
})();
