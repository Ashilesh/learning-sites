/* ==========================================================
   sketch.js — tiny hand-drawn renderer
   Draws wobbly outlines behind .sk-box / .sk-btn elements and
   pencil arrows inside .sk-arrow elements. Outlines redraw on
   resize so layouts can reflow on phones.
   ========================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var seedCounter = 0;

  // Small deterministic random generator so a box keeps its wobble.
  function rng(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function f(n) { return n.toFixed(1); }

  // One pencil stroke from (x1,y1) to (x2,y2): a slightly bowed curve.
  function stroke(x1, y1, x2, y2, r, jitter) {
    var len = Math.hypot(x2 - x1, y2 - y1) || 1;
    var bow = Math.min(len * 0.015, 2.5);
    var nx = -(y2 - y1) / len;
    var ny = (x2 - x1) / len;
    var b = (r() - 0.5) * 2 * bow;
    var t = 0.35 + r() * 0.3;
    var mx = x1 + (x2 - x1) * t + nx * b;
    var my = y1 + (y2 - y1) * t + ny * b;
    var e = function () { return (r() - 0.5) * jitter; };
    return 'M' + f(x1 + e()) + ' ' + f(y1 + e()) +
      ' Q' + f(mx) + ' ' + f(my) + ' ' + f(x2 + e()) + ' ' + f(y2 + e());
  }

  function rectStrokes(x, y, w, h, r, jitter) {
    var over = function () { return r() * 5; };
    return stroke(x - over(), y, x + w + over(), y, r, jitter) +
      stroke(x + w, y - over(), x + w, y + h + over(), r, jitter) +
      stroke(x + w + over(), y + h, x - over(), y + h, r, jitter) +
      stroke(x, y + h + over(), x, y - over(), r, jitter);
  }

  function rectFill(x, y, w, h, r, off) {
    var e = function () { return (r() - 0.5) * 3; };
    return 'M' + f(x + off + e()) + ' ' + f(y + off + e()) +
      ' L' + f(x + w + off + e()) + ' ' + f(y + off + e()) +
      ' L' + f(x + w + off + e()) + ' ' + f(y + h + off + e()) +
      ' L' + f(x + off + e()) + ' ' + f(y + h + off + e()) + ' Z';
  }

  function outline(el) {
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    if (!w || !h) return;
    if (el._skW === w && el._skH === h && el.querySelector(':scope > svg.sk-outline')) return;
    el._skW = w;
    el._skH = h;
    if (!el._skSeed) el._skSeed = (++seedCounter) * 7919 + 13;

    var svg = el.querySelector(':scope > svg.sk-outline');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'sk-outline');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      el.insertBefore(svg, el.firstChild);
    }
    var pad = 8;
    svg.setAttribute('width', w + pad * 2);
    svg.setAttribute('height', h + pad * 2);
    svg.setAttribute('viewBox', '0 0 ' + (w + pad * 2) + ' ' + (h + pad * 2));
    svg.style.left = -pad + 'px';
    svg.style.top = -pad + 'px';

    var r = rng(el._skSeed);
    var x = pad + 1.5, y = pad + 1.5, ww = w - 3, hh = h - 3;
    var jitter = Math.min(2.4, Math.max(1.2, Math.min(w, h) / 40));
    var off = el.classList.contains('no-offset') ? 0 : 3;
    var fill = rectFill(x, y, ww, hh, r, off);
    var s1 = rectStrokes(x, y, ww, hh, r, jitter);
    var s2 = rectStrokes(x, y, ww, hh, r, jitter * 1.4);
    svg.innerHTML =
      '<path class="sk-fill" d="' + fill + '"/>' +
      '<path class="sk-stroke" d="' + s1 + '"/>' +
      '<path class="sk-stroke sk-stroke2" d="' + s2 + '"/>';
  }

  function arrow(el) {
    if (el.querySelector('svg')) return;
    if (!el._skSeed) el._skSeed = (++seedCounter) * 4513 + 7;
    var r = rng(el._skSeed);
    var d = stroke(4, 15, 52, 15, r, 1.5) +
      stroke(52, 15, 41, 6 + r() * 2, r, 1) +
      stroke(52, 15, 41, 24 - r() * 2, r, 1);
    el.innerHTML = '<svg viewBox="0 0 56 30" aria-hidden="true" focusable="false">' +
      '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  }

  // A wobbly polyline through points, for charts.
  function polyline(points, seed, jitter) {
    var r = rng(seed || 99);
    var d = '';
    for (var i = 1; i < points.length; i++) {
      var p = points[i - 1], q = points[i];
      var seg = stroke(p[0], p[1], q[0], q[1], r, jitter || 0.8);
      d += (i === 1 ? seg : seg.replace(/^M[^Q]+/, 'L' + f(p[0]) + ' ' + f(p[1]) + ' '));
    }
    return d;
  }

  var observer = 'ResizeObserver' in window
    ? new ResizeObserver(function (entries) {
      entries.forEach(function (entry) { outline(entry.target); });
    })
    : null;

  function refresh(root) {
    root = root || document;
    root.querySelectorAll('.sk-box, .sk-btn').forEach(function (el) {
      outline(el);
      if (observer && !el._skObserved) {
        observer.observe(el);
        el._skObserved = true;
      }
    });
    root.querySelectorAll('.sk-arrow').forEach(arrow);
  }

  function redrawAll() {
    document.querySelectorAll('.sk-box, .sk-btn').forEach(function (el) {
      el._skW = 0;
      outline(el);
    });
  }

  window.Sketch = {
    refresh: refresh,
    redrawAll: redrawAll,
    outline: outline,
    polyline: polyline,
    rng: rng
  };

  function start() {
    refresh(document);
    // Fonts change text size once loaded; redraw so outlines fit.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(redrawAll);
    }
    if (!observer) window.addEventListener('resize', redrawAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
