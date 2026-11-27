/* =========================================================
   SK — tiny hand-drawn SVG diagram engine + step "flow" player
   SK.diagram(el, spec)  → draws boxes/arrows that look sketched
   SK.flow(el, D, steps) → play a story: highlight + moving packets
   SK.chain(items, opts) → auto "snake" layout (desktop / mobile)
   ========================================================= */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function rng(str) {
    var h = 2166136261 >>> 0; str = String(str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return function () { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  }
  function f(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }

  /* rough straight line (2 strokes) */
  function rline(x1, y1, x2, y2, r, j) {
    j = j == null ? 1.6 : j; var d = '';
    for (var p = 0; p < 2; p++) {
      var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      var bow = (r() - .5) * Math.min(len * .03, 5);
      var mx = x1 + dx * (.4 + r() * .2) + nx * bow, my = y1 + dy * (.4 + r() * .2) + ny * bow;
      d += 'M' + f([x1 + (r() - .5) * j, y1 + (r() - .5) * j]) + 'Q' + f([mx, my]) + ' ' + f([x2 + (r() - .5) * j, y2 + (r() - .5) * j]);
    }
    return d;
  }
  /* rough rounded rectangle */
  function rround(x, y, w, h, rad, r, j, passes) {
    rad = Math.max(0, Math.min(rad == null ? 8 : rad, w / 2, h / 2)); j = j == null ? 1.5 : j; passes = passes || 2;
    var d = '';
    for (var p = 0; p < passes; p++) {
      var o = function () { return (r() - .5) * j * 2; };
      var pts = [[x + rad, y], [x + w - rad, y], [x + w, y + rad], [x + w, y + h - rad], [x + w - rad, y + h], [x + rad, y + h], [x, y + h - rad], [x, y + rad]];
      var cs = [[x + w, y], [x + w, y + h], [x, y + h], [x, y]];
      var J = pts.map(function (pt) { return [pt[0] + o(), pt[1] + o()]; });
      d += 'M' + f(J[0]);
      for (var i = 0; i < 4; i++) {
        var a = J[i * 2], b = J[i * 2 + 1], c = cs[i], nx = J[(i * 2 + 2) % 8];
        d += 'Q' + f([(a[0] + b[0]) / 2 + o(), (a[1] + b[1]) / 2 + o()]) + ' ' + f(b);
        d += 'Q' + f([c[0] + o() * .4, c[1] + o() * .4]) + ' ' + f(i === 3 ? [nx[0] + o() * 1.5, nx[1] + o()] : nx);
      }
    }
    return d;
  }
  /* rough ellipse */
  function rellipse(cx, cy, rx, ry, r, passes) {
    var d = ''; passes = passes || 2;
    for (var p = 0; p < passes; p++) {
      var n = 10, st = r() * Math.PI * 2, pts = [];
      for (var i = 0; i < n; i++) { var a = st + i / n * Math.PI * 2, k = 1 + (r() - .5) * .05; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
      var mid = function (a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
      d += 'M' + f(mid(pts[0], pts[1]));
      for (var q = 1; q <= n + (p ? 0 : 1); q++) d += 'Q' + f(pts[q % n]) + ' ' + f(mid(pts[q % n], pts[(q + 1) % n]));
    }
    return d;
  }
  function col(c) { return c && c !== 'gray' ? c : null; }
  function tint(c) { return col(c) ? 'var(--' + c + '-t)' : 'var(--gray-t)'; }
  function solid(c) { return col(c) ? 'var(--' + c + ')' : 'var(--ink-faint)'; }

  /* ---------------- diagram ---------------- */
  function diagram(target, spec) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return null;
    host.classList.add('diagram');
    var id = 'skd' + (++uid);
    var box = document.createElement('div'); box.className = spec.bare ? '' : 'diagram-box';
    var scroll = document.createElement('div'); scroll.className = 'diagram-scroll';
    var svg = S('svg', { role: 'img', 'aria-label': spec.title || 'diagram' });
    scroll.appendChild(svg); box.appendChild(scroll); host.appendChild(box);
    var hint = document.createElement('div'); hint.className = 'swipe-hint'; hint.textContent = '↔ swipe the drawing to see all of it';
    host.appendChild(hint);
    var mq = window.matchMedia ? window.matchMedia('(max-width: 640px)') : { matches: false };

    var api = { host: host, svg: svg, spec: spec, g: {}, edges: [], tok: 0, onrender: [], layers: {} };
    api.newToken = function () { api.tok++; clearPackets(); return api.tok; };

    function geom(n, m) {
      var o = m ? (n.m || (spec.mobile && spec.mobile.nodes && spec.mobile.nodes[n.id])) : null;
      var x = o ? o[0] : n.x, y = o ? o[1] : n.y, w = o && o[2] != null ? o[2] : n.w, h = o && o[3] != null ? o[3] : n.h;
      if (n.r) { w = h = n.r * 2; }
      return { x: x, y: y, w: w, h: h, cx: x + w / 2, cy: y + h / 2, shape: n.shape || (n.r ? 'ellipse' : 'rect'), hidden: m && n.mHide };
    }
    function boundary(g, tx, ty, pad) {
      pad = pad == null ? 6 : pad;
      var dx = tx - g.cx, dy = ty - g.cy;
      if (!dx && !dy) return [g.cx, g.cy];
      if (g.shape === 'ellipse') {
        var rx = g.w / 2 + pad, ry = g.h / 2 + pad, t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
        return [g.cx + dx * t, g.cy + dy * t];
      }
      var sx = dx ? (g.w / 2 + pad) / Math.abs(dx) : Infinity, sy = dy ? (g.h / 2 + pad) / Math.abs(dy) : Infinity, tt = Math.min(sx, sy);
      return [g.cx + dx * tt, g.cy + dy * tt];
    }
    function sidePt(g, side, pad) {
      pad = pad == null ? 6 : pad;
      return { l: [g.x - pad, g.cy], r: [g.x + g.w + pad, g.cy], t: [g.cx, g.y - pad], b: [g.cx, g.y + g.h + pad] }[side];
    }

    function render() {
      var m = !!(spec.mobile && mq.matches);
      var W = m ? spec.mobile.w : spec.w, H = m ? spec.mobile.h : spec.h;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.classList.toggle('minw', !!spec.minw && !m);
      hint.classList.toggle('show', !!spec.minw && !m);
      if (spec.maxh) svg.style.maxHeight = spec.maxh + 'px';
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      api.g = {}; api.edges = [];
      var defs = S('defs', null, svg);
      var pat = S('pattern', { id: id + 'h', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      S('line', { x1: 0, y1: 0, x2: 0, y2: 7, style: 'stroke:var(--ink);stroke-width:1.4;opacity:.18' }, pat);
      var LG = S('g', { class: 'sk-groups' }, svg), LE = S('g', { class: 'sk-edges' }, svg), LN = S('g', { class: 'sk-nodes' }, svg), LT = S('g', { class: 'sk-texts' }, svg), LP = S('g', { class: 'sk-packets' }, svg);
      api.layers = { groups: LG, edges: LE, nodes: LN, texts: LT, packets: LP };

      (spec.groups || []).forEach(function (gr, gi) {
        var o = m && gr.m ? gr.m : [gr.x, gr.y, gr.w, gr.h]; if (m && gr.mHide) return;
        var r = rng('g' + gi + (gr.label || ''));
        var gg = S('g', { class: 'sk-group' }, LG);
        S('path', { d: rround(o[0], o[1], o[2], o[3], 14, r, 1, 1), class: 'gfill', style: 'fill:' + tint(gr.c) }, gg);
        S('path', { d: rround(o[0], o[1], o[2], o[3], 14, r, 1, 1), class: 'gstroke', style: gr.c ? 'stroke:' + solid(gr.c) : '' }, gg);
        if (gr.label) { var t = S('text', { x: o[0] + 14, y: o[1] + 26, style: gr.c ? 'fill:' + solid(gr.c) : '' }, gg); t.textContent = gr.label; if (gr.lfs) t.style.fontSize = gr.lfs + 'px'; if (gr.lAnchor === 'end') { t.setAttribute('x', o[0] + o[2] - 14); t.setAttribute('text-anchor', 'end'); } }
      });

      (spec.nodes || []).forEach(function (n) {
        var gm = geom(n, m); if (gm.hidden) return;
        api.g[n.id] = gm;
        var r = rng(n.id + (spec.seed || ''));
        var g = S('g', { class: 'sk-node' + (n.click || spec.onClick ? ' click' : '') + (n.cls ? ' ' + n.cls : ''), 'data-id': n.id }, LN);
        var x = gm.x, y = gm.y, w = gm.w, h = gm.h, c = n.c;
        var fillStyle = 'fill:' + (n.fill || (n.solid ? solid(c) : tint(c)));
        if (gm.shape === 'ellipse') {
          S('ellipse', { cx: gm.cx, cy: gm.cy, rx: w / 2 + 3, ry: h / 2 + 3, class: 'sk-glow', style: 'stroke:' + solid(c || 'pink') }, g);
          S('path', { d: rellipse(gm.cx + 1.5, gm.cy + 1.5, w / 2 - 1, h / 2 - 1, r, 1) + 'Z', class: 'sk-fill', style: fillStyle }, g);
          if (n.hatch) S('ellipse', { cx: gm.cx, cy: gm.cy, rx: w / 2 - 2, ry: h / 2 - 2, fill: 'url(#' + id + 'h)' }, g);
          if (!n.noStroke) S('path', { d: rellipse(gm.cx, gm.cy, w / 2, h / 2, r), class: 'sk-stroke' }, g);
        } else if (gm.shape === 'cyl') {
          var ry = Math.min(14, h * .16), rx = w / 2;
          S('rect', { x: x - 3, y: y - 3, width: w + 6, height: h + 6, rx: 14, class: 'sk-glow', style: 'stroke:' + solid(c || 'pink') }, g);
          S('path', { d: 'M' + x + ' ' + (y + ry) + 'A' + rx + ' ' + ry + ' 0 0 1 ' + (x + w) + ' ' + (y + ry) + 'L' + (x + w) + ' ' + (y + h - ry) + 'A' + rx + ' ' + ry + ' 0 0 1 ' + x + ' ' + (y + h - ry) + 'Z', class: 'sk-fill', style: fillStyle }, g);
          S('path', { d: rellipse(gm.cx, y + ry, rx, ry, r) + rline(x, y + ry, x, y + h - ry, r) + rline(x + w, y + ry, x + w, y + h - ry, r) + 'M' + x + ' ' + (y + h - ry) + 'A' + rx + ' ' + ry + ' 0 0 0 ' + (x + w) + ' ' + (y + h - ry), class: 'sk-stroke' }, g);
        } else {
          var rad = n.rad == null ? 8 : n.rad;
          S('rect', { x: x - 3, y: y - 3, width: w + 6, height: h + 6, rx: rad + 3, class: 'sk-glow', style: 'stroke:' + solid(c || 'pink') }, g);
          S('path', { d: rround(x + 2, y + 2, w - 2, h - 2, rad, r, .8, 1) + 'Z', class: 'sk-fill', style: fillStyle }, g);
          if (n.hatch) S('rect', { x: x + 2, y: y + 2, width: w - 4, height: h - 4, rx: rad, fill: 'url(#' + id + 'h)' }, g);
          if (!n.noStroke) S('path', { d: rround(x, y, w, h, rad, r, n.j), class: 'sk-stroke', style: n.dash ? 'stroke-dasharray:7 6' : '' }, g);
          if (n.shape === 'note') S('path', { d: 'M' + (x + w - 18) + ' ' + y + 'L' + (x + w - 18) + ' ' + (y + 16) + 'L' + (x + w) + ' ' + (y + 16), class: 'sk-stroke' }, g);
        }
        // text
        var fs = n.fs || spec.fs || 18, lines = (m && n.mLabel != null) ? String(n.mLabel).split('\n') : (n.label != null ? String(n.label).split('\n') : []), sub = n.sub != null ? String(n.sub).split('\n') : [];
        var sfs = n.sfs || fs * .78, ic = n.icon ? (n.iconSize || fs * 1.45) : 0;
        var total = (ic ? ic * 1.08 : 0) + lines.length * fs * 1.12 + sub.length * sfs * 1.15;
        var yy = n.top ? y + (n.top === true ? 12 : n.top) : gm.cy - total / 2;
        var tcol = n.solid && !n.tcol ? 'fill:#24222c' : (n.tcol ? 'fill:' + n.tcol : '');
        if (ic) { var ti = S('text', { x: gm.cx, y: yy + ic / 2, 'font-size': ic, class: 'sk-icon' }, g); ti.textContent = n.icon; yy += ic * 1.08; }
        lines.forEach(function (l) { var t = S('text', { x: gm.cx, y: yy + fs * .56, 'font-size': fs, class: 'sk-label', style: tcol + (n.bold === false ? '' : ';font-weight:700') }, g); t.textContent = l; yy += fs * 1.12; });
        sub.forEach(function (l) { var t = S('text', { x: gm.cx, y: yy + sfs * .58, 'font-size': sfs, class: 'sk-sub', style: n.mono ? 'font-family:var(--font-mono);font-size:' + (sfs * .82) + 'px' : (tcol || '') }, g); t.textContent = l; yy += sfs * 1.15; });
        var clickable = n.click || spec.onClick;
        if (clickable) {
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', (n.label || n.id).replace(/\n/g, ' '));
          var fire = function () { (n.click || spec.onClick)(n.id, n, api); };
          g.addEventListener('click', fire);
          g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
        }
      });

      (spec.edges || []).forEach(function (e, ei) {
        var a = api.g[e.from], b = api.g[e.to]; if (!a || !b) return;
        var mc = m && e.m ? e.m : e;
        var s0 = mc.fs ? sidePt(a, mc.fs, 0) : [a.cx, a.cy], t0 = mc.ts ? sidePt(b, mc.ts, 0) : [b.cx, b.cy];
        var dx = t0[0] - s0[0], dy = t0[1] - s0[1], len = Math.hypot(dx, dy) || 1;
        var curve = mc.curve || 0;
        var ctrl = [(s0[0] + t0[0]) / 2 - dy / len * curve, (s0[1] + t0[1]) / 2 + dx / len * curve];
        var s = mc.fs ? sidePt(a, mc.fs) : boundary(a, ctrl[0], ctrl[1]), t = mc.ts ? sidePt(b, mc.ts) : boundary(b, ctrl[0], ctrl[1]);
        if (!curve) ctrl = [(s[0] + t[0]) / 2, (s[1] + t[1]) / 2];
        var r = rng('e' + e.from + e.to + ei);
        var eg = S('g', { class: 'sk-edge' + (e.dash ? ' dash' : ''), 'data-e': e.from + '>' + e.to }, LE);
        var d = '';
        for (var p = 0; p < (e.single ? 1 : 2); p++) { var j = function () { return (r() - .5) * 2.4; }; d += 'M' + f([s[0] + j(), s[1] + j()]) + 'Q' + f([ctrl[0] + j() * 2, ctrl[1] + j() * 2]) + ' ' + f([t[0] + j(), t[1] + j()]); }
        S('path', { d: d, class: 'l', style: e.c ? 'stroke:' + solid(e.c) : '' }, eg);
        function head(tip, from) {
          var ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]), L = 12, A = .5;
          var hd = 'M' + f([tip[0] - L * Math.cos(ang - A), tip[1] - L * Math.sin(ang - A)]) + 'L' + f(tip) + 'L' + f([tip[0] - L * Math.cos(ang + A), tip[1] - L * Math.sin(ang + A)]);
          S('path', { d: hd, style: (e.c ? 'stroke:' + solid(e.c) + ';' : '') + 'stroke-linejoin:round' }, eg);
        }
        if (!e.noHead) head(t, ctrl);
        if (e.both) head(s, ctrl);
        var geo = { from: e.from, to: e.to, s: s, c: ctrl, t: t, el: eg };
        api.edges.push(geo);
        if (e.label && !(m && e.mNoLabel)) {
          var mp = qpt(geo, .5), lf = e.lfs || 15, tw = String(e.label).length * lf * .48 + 10;
          S('rect', { x: mp[0] - tw / 2, y: mp[1] - lf * .7, width: tw, height: lf * 1.4, rx: 5, class: 'lbg' }, eg);
          var tx = S('text', { x: mp[0], y: mp[1], style: 'font-size:' + lf + 'px' }, eg); tx.textContent = e.label;
        }
      });

      (spec.texts || []).forEach(function (t) {
        if (m && t.mHide) return; var p = m && t.m ? t.m : [t.x, t.y];
        var lines = String(t.t).split('\n'), fs = t.fs || 17;
        lines.forEach(function (l, li) {
          var tx = S('text', { x: p[0], y: p[1] + li * fs * 1.15, 'font-size': fs, 'text-anchor': t.anchor || 'middle', class: 'sk-text' + (t.title ? ' title' : ''), style: (t.c ? 'fill:' + solid(t.c) : '') + (t.rot ? ';transform-box:fill-box;transform-origin:center;transform:rotate(' + t.rot + 'deg)' : '') + (t.bold ? ';font-weight:700' : '') + (t.mono ? ';font-family:var(--font-mono)' : '') }, LT);
          tx.textContent = l;
        });
      });
      if (spec.after) spec.after(api, m);
      api.mobile = m;
    }
    function qpt(e, t) { var u = 1 - t; return [u * u * e.s[0] + 2 * u * t * e.c[0] + t * t * e.t[0], u * u * e.s[1] + 2 * u * t * e.c[1] + t * t * e.t[1]]; }
    function clearPackets() { if (api.layers.packets) while (api.layers.packets.firstChild) api.layers.packets.removeChild(api.layers.packets.firstChild); }

    api.render = render;
    api.on = function (ids, edges) {
      ids = ids || []; edges = edges || [];
      svg.classList.toggle('dimmed', ids.length > 0 && spec.dim !== false);
      Array.prototype.forEach.call(svg.querySelectorAll('.sk-node'), function (g) { g.classList.toggle('on', ids.indexOf(g.getAttribute('data-id')) >= 0); });
      Array.prototype.forEach.call(svg.querySelectorAll('.sk-edge'), function (g) {
        var k = g.getAttribute('data-e'), on = edges.indexOf(k) >= 0;
        if (!on && edges === 'auto') on = false;
        g.classList.toggle('on', on);
      });
    };
    api.center = function (id) { var g = api.g[id]; return g ? [g.cx, g.cy] : [0, 0]; };
    api.node = function (id) { return svg.querySelector('.sk-node[data-id="' + id + '"]'); };
    api.setText = function (id, txt) { var n = api.node(id); if (!n) return; var t = n.querySelector('.sk-label'); if (t) t.textContent = txt; };
    /* move a packet from node A to node B along their edge (or a straight line) */
    api.packet = function (from, to, o) {
      o = o || {}; var tok = api.tok;
      return new Promise(function (res) {
        var e = null, rev = false;
        api.edges.forEach(function (x) { if (!e && x.from === from && x.to === to) e = x; });
        if (!e) api.edges.forEach(function (x) { if (!e && x.from === to && x.to === from) { e = x; rev = true; } });
        if (!e) {
          var A = api.g[from], B = api.g[to]; if (!A || !B) return res();
          var s = boundary(A, B.cx, B.cy, 0), t = boundary(B, A.cx, A.cy, 0);
          e = { s: s, t: t, c: [(s[0] + t[0]) / 2, (s[1] + t[1]) / 2] };
        }
        var c = o.c || 'pink', g = S('g', { class: 'sk-packet' }, api.layers.packets);
        if (o.label) {
          var fs = 14, w = String(o.label).length * 7.6 + 16;
          S('rect', { x: -w / 2, y: -12, width: w, height: 24, rx: 10, style: 'fill:' + solid(c) }, g);
          var tx = S('text', { x: 0, y: 0, style: 'fill:#1d1b25' }, g); tx.textContent = o.label;
        } else {
          S('circle', { r: o.r || 9, style: 'fill:' + solid(c) }, g);
        }
        var len = Math.hypot(e.t[0] - e.s[0], e.t[1] - e.s[1]);
        var dur = o.dur || Math.max(550, Math.min(1500, len * 3.4)), t0 = performance.now();
        function step(now) {
          if (tok !== api.tok) { g.remove(); return res(); }
          var k = Math.min(1, (now - t0) / dur), ee = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, tt = rev ? 1 - ee : ee;
          var p = qpt(e, tt); g.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')');
          if (k < 1) requestAnimationFrame(step); else { if (!o.keep) g.remove(); res(g); }
        }
        requestAnimationFrame(step);
      });
    };
    render();
    if (spec.mobile && mq.addEventListener) mq.addEventListener('change', function () { render(); api.onrender.forEach(function (fn) { fn(); }); });
    return api;
  }

  /* ---------------- flow player ---------------- */
  function flow(D, steps, opts) {
    opts = opts || {};
    if (!D) return null;
    var ui = document.createElement('div'); ui.className = 'flow-ui';
    ui.innerHTML = '<div class="flow-cap" aria-live="polite"><span class="flow-num"></span><span class="flow-text"></span><div class="flow-code"></div></div>' +
      '<div class="flow-ctrl"><button class="btn sm" type="button" data-a="prev">◀ Back</button><button class="btn sm yellow" type="button" data-a="play">▶ Play</button>' +
      '<button class="btn sm" type="button" data-a="next">Next ▶</button><button class="btn sm" type="button" data-a="reset" title="Restart">↺</button><div class="flow-dots"></div></div>';
    (opts.mount || D.host).appendChild(ui);
    var num = ui.querySelector('.flow-num'), txt = ui.querySelector('.flow-text'), code = ui.querySelector('.flow-code'), dots = ui.querySelector('.flow-dots');
    var bPrev = ui.querySelector('[data-a=prev]'), bNext = ui.querySelector('[data-a=next]'), bPlay = ui.querySelector('[data-a=play]');
    var i = -1, playing = false, timer = null;
    steps.forEach(function (s, k) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Step ' + (k + 1));
      b.addEventListener('click', function () { pause(); show(k); }); dots.appendChild(b);
    });
    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function intro() {
      i = -1; D.newToken(); D.on([]); num.textContent = '';
      txt.innerHTML = opts.intro || 'Press <b>▶ Play</b> to watch the story, or <b>Next ▶</b> to go one step at a time.';
      code.innerHTML = ''; ui.querySelectorAll('.flow-dots button').forEach(function (b) { b.className = ''; });
      bPrev.disabled = true; bNext.disabled = false;
      if (opts.onReset) opts.onReset(D);
    }
    function show(k, animate) {
      if (animate == null) animate = true;
      clearTimeout(timer); i = k; var s = steps[k]; var tok = D.newToken();
      D.on(s.on || [], s.edges || []);
      num.textContent = (k + 1) + '/' + steps.length;
      txt.innerHTML = s.say || '';
      code.innerHTML = s.code ? '<code>' + esc(s.code) + '</code>' : '';
      Array.prototype.forEach.call(dots.children, function (b, bi) { b.className = bi === k ? 'cur' : (bi < k ? 'past' : ''); });
      bPrev.disabled = k <= 0; bNext.disabled = k >= steps.length - 1;
      if (s.fn) s.fn(D, animate);
      if (opts.onStep) opts.onStep(k, s, D);
      var p = Promise.resolve();
      if (animate && s.go) {
        if (s.par) p = Promise.all(s.go.map(function (g) { return D.packet(g[0], g[1], g[2]); }));
        else s.go.forEach(function (g) { p = p.then(function () { return tok === D.tok ? D.packet(g[0], g[1], g[2]) : null; }); });
      }
      p.then(function () {
        if (tok !== D.tok || !playing) return;
        var plain = (s.say || '').replace(/<[^>]+>/g, '');
        timer = setTimeout(function () { if (i < steps.length - 1) show(i + 1); else pause(); }, Math.max(1700, plain.length * 40) * (opts.pace || 1));
      });
    }
    function play() {
      if (playing) { pause(); return; }
      playing = true; bPlay.textContent = '⏸ Pause';
      show(i >= steps.length - 1 ? 0 : i + 1);
    }
    function pause() { playing = false; clearTimeout(timer); bPlay.textContent = '▶ Play'; }
    bPlay.addEventListener('click', play);
    bNext.addEventListener('click', function () { pause(); if (i < steps.length - 1) show(i + 1); });
    bPrev.addEventListener('click', function () { pause(); if (i > 0) show(i - 1); });
    ui.querySelector('[data-a=reset]').addEventListener('click', function () { pause(); intro(); });
    D.onrender.push(function () { if (i >= 0) show(i, false); });
    intro();
    return { show: show, play: play, pause: pause, reset: intro, ui: ui };
  }

  /* ---------------- chain layout ---------------- */
  function chain(items, o) {
    o = o || {};
    var cols = o.cols || 5, mcols = o.mcols || 2, nw = o.nw || 150, nh = o.nh || 92, gx = o.gx || 48, gy = o.gy || 58, pad = o.pad || 18;
    var mnw = o.mnw || nw, mgx = o.mgx || gx;
    function pos(i, c, w, g) { var r = Math.floor(i / c), c0 = i % c, cc = r % 2 ? c - 1 - c0 : c0; return [pad + cc * (w + g), pad + r * (nh + gy)]; }
    var rows = Math.ceil(items.length / cols), mrows = Math.ceil(items.length / mcols);
    var nodes = items.map(function (it, i) {
      var p = pos(i, cols, nw, gx), mp = pos(i, mcols, mnw, mgx);
      var n = { w: nw, h: nh, x: p[0], y: p[1], m: [mp[0], mp[1], mnw, nh] };
      for (var k in it) n[k] = it[k];
      return n;
    });
    var edges = items.slice(1).map(function (it, i) { return { from: items[i].id, to: it.id, label: it.edge }; });
    return {
      w: pad * 2 + cols * nw + (cols - 1) * gx, h: pad * 2 + rows * nh + (rows - 1) * gy,
      nodes: nodes, edges: edges, fs: o.fs,
      mobile: { w: pad * 2 + mcols * mnw + (mcols - 1) * mgx, h: pad * 2 + mrows * nh + (mrows - 1) * gy }
    };
  }

  window.SK = { diagram: diagram, flow: flow, chain: chain, S: S, rng: rng, rline: rline, rround: rround, rellipse: rellipse, tint: tint, solid: solid };
})();
