/* =========================================================
   System Design Sketchbook — shared runtime
   (header, theme, chapters, sketchy SVG diagrams, helpers)
   ========================================================= */
(function () {
  "use strict";
  const SD = (window.SD = {});
  const NS = "http://www.w3.org/2000/svg";
  SD.errors = []; // collected for debugging (see console)
  addEventListener("error", (e) => SD.errors.push(`${e.message} @ ${(e.filename || "").split("/").pop()}:${e.lineno}`));
  addEventListener("unhandledrejection", (e) => SD.errors.push("promise: " + (e.reason && e.reason.message)));

  /* ---------------- chapters ---------------- */
  SD.CHAPTERS = [
    { id: "home", file: "index.html", em: "🏠", title: "Start Here", lvl: "b", blurb: "What system design is, a growing-app story, and a request's journey." },
    { id: "toolbox", file: "toolbox.html", em: "🧰", title: "The Toolbox", lvl: "b", blurb: "Every building block (DNS, load balancer, cache…) and how they talk." },
    { id: "numbers", file: "numbers.html", em: "⏱️", title: "Speed & Numbers", lvl: "b", blurb: "Latency, throughput, p50/p99, the nines, SLOs and napkin math." },
    { id: "scaling", file: "scaling.html", em: "📈", title: "Scaling Up", lvl: "i", blurb: "Load balancers, caching, CDNs, stateless servers, autoscaling." },
    { id: "data", file: "data.html", em: "🗄️", title: "Data Land", lvl: "i", blurb: "SQL vs NoSQL, indexes, replication, sharding, CAP & quorums." },
    { id: "cloud", file: "cloud.html", em: "☁️", title: "Cloud & Infrastructure", lvl: "i", blurb: "VMs, containers, Kubernetes, regions, DNS & HTTP deep dives, CI/CD, cost." },
    { id: "patterns", file: "patterns.html", em: "🧩", title: "Advanced Patterns", lvl: "a", blurb: "Queues, pub/sub, microservices, consensus, sagas, bloom filters." },
    { id: "deep", file: "deep.html", em: "🔬", title: "Distributed Deep Dives", lvl: "a", blurb: "Race conditions, locks, clocks, gossip, fencing tokens, outbox, CRDTs." },
    { id: "reliability", file: "reliability.html", em: "🛡️", title: "Reliability & Ops", lvl: "a", blurb: "Failures, retries, circuit breakers, rate limits, observability, security." },
    { id: "world", file: "world.html", em: "🌍", title: "3D Data Center", lvl: "x", blurb: "Fly around a 3D world and watch every concept flow live." },
    { id: "cases", file: "cases.html", em: "🏗️", title: "Real-World Designs", lvl: "a", blurb: "12 classic designs: shortener, chat, feed, video, rides, payments, crawler…" },
    { id: "ai", file: "ai.html", em: "🤖", title: "AI & ML Systems", lvl: "a", blurb: "Embeddings, vector search, RAG, serving LLMs, recommendations." },
    { id: "tradeoffs", file: "tradeoffs.html", em: "⚖️", title: "Trade-offs & Best Practices", lvl: "i", blurb: "Seesaws of choices, golden rules, and anti-patterns to avoid." },
    { id: "playbook", file: "playbook.html", em: "📝", title: "Design Doc & Playbook", lvl: "i", blurb: "A step-by-step method plus a copy-ready design document template." },
    { id: "review", file: "review.html", em: "🎓", title: "Glossary & Quiz", lvl: "b", blurb: "Every term in kid-friendly words, a cheat sheet, and a quiz." },
  ];
  SD.LVL = { b: "Beginner", i: "Intermediate", a: "Advanced", x: "Everything!" };

  SD.PALETTE = {
    yellow: "#fcc419", pink: "#f06595", blue: "#339af0", green: "#51cf66", orange: "#ff922b",
    purple: "#9775fa", teal: "#22b8cf", red: "#ff6b6b", gray: "#adb5bd", ink: "currentColor",
  };

  /* ---------------- small helpers ---------------- */
  SD.$ = (s, r = document) => r.querySelector(s);
  SD.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  SD.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  SD.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  SD.lerp = (a, b, t) => a + (b - a) * t;
  SD.ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  SD.cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  SD.isDark = () => {
    const a = document.documentElement.getAttribute("data-theme");
    if (a) return a === "dark";
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  };
  SD.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  SD.hash = function (str, seed = 0) { // FNV-1a 32-bit
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
    return h >>> 0;
  };
  SD.fmtNum = function (n, d = 1) {
    const a = Math.abs(n);
    if (a >= 1e12) return +(n / 1e12).toFixed(d) + "T";
    if (a >= 1e9) return +(n / 1e9).toFixed(d) + "B";
    if (a >= 1e6) return +(n / 1e6).toFixed(d) + "M";
    if (a >= 1e3) return +(n / 1e3).toFixed(d) + "K";
    return +n.toFixed(d) + "";
  };
  SD.fmtBytes = function (b) {
    const u = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]; let i = 0;
    while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
    return (b >= 100 ? b.toFixed(0) : b >= 10 ? b.toFixed(1) : b.toFixed(2)) + " " + u[i];
  };
  SD.fmtSecs = function (s) { // human duration
    if (s < 1) return Math.round(s * 1000) + " ms";
    if (s < 60) return (+s.toFixed(1)) + " sec";
    if (s < 3600) return (+(s / 60).toFixed(1)) + " min";
    if (s < 86400) return (+(s / 3600).toFixed(1)) + " hours";
    if (s < 86400 * 60) return (+(s / 86400).toFixed(1)) + " days";
    if (s < 86400 * 365) return (+(s / 86400 / 30.4).toFixed(1)) + " months";
    return (+(s / 86400 / 365).toFixed(1)) + " years";
  };
  SD.toast = function (msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%) rotate(-2deg);z-index:120;background:var(--yellow);color:#1f2430;border:2.5px solid #1f2430;border-radius:255px 15px 225px 15px/15px 225px 15px 255px;padding:8px 18px;font-family:var(--f-head);box-shadow:4px 4px 0 #1f2430;animation:pop .2s";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  };
  SD.copy = async function (text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e2) {} ta.remove();
    }
    SD.toast("Copied! 📋");
  };
  SD.download = function (name, text, type = "text/markdown") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  SD.confetti = function (n = 90) {
    const cols = Object.values(SD.PALETTE).slice(0, 8);
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = cols[i % cols.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.8 + "s";
      c.style.animationDelay = Math.random() * 0.4 + "s";
      c.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4200);
    }
  };
  SD.tween = function (dur, fn, ease = SD.ease) {
    return new Promise((res) => {
      const t0 = performance.now();
      function f(now) {
        const t = Math.min(1, (now - t0) / dur); fn(ease(t), t);
        if (t < 1) requestAnimationFrame(f); else res();
      }
      requestAnimationFrame(f);
    });
  };

  /* run fn(dt,t) every frame, only while el is on screen and the tab is visible */
  SD.loop = function (el, fn) {
    let on = false, vis = false, raf = 0, last = 0;
    function frame(now) {
      if (!on || !vis || document.hidden) { raf = 0; return; }
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      fn(dt, now / 1000);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (on && vis && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
    const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; kick(); }, { rootMargin: "80px" });
    io.observe(el);
    document.addEventListener("visibilitychange", kick);
    const api = { start() { on = true; kick(); return api; }, stop() { on = false; }, get running() { return on; } };
    return api;
  };

  /* HiDPI canvas helper. aspect = height/width; returns state object with ctx,w,h */
  SD.canvas = function (cv, draw, aspect = 0.5, minH = 220, maxH = 520) {
    const ctx = cv.getContext("2d");
    const st = { ctx, w: 0, h: 0, cv };
    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth || cv.parentElement.clientWidth;
      const h = Math.round(SD.clamp(w * aspect, minH, maxH));
      if (w === st.w && h === st.h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); st.w = w; st.h = h;
      if (st.ready && draw) draw(); // first draw is the caller's job (avoids TDZ issues)
    }
    st.resize = resize;
    resize();
    st.ready = true;
    if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(cv.parentElement);
    else window.addEventListener("resize", resize);
    return st;
  };
  /* canvas sketch helpers */
  SD.font = (px, kind = "body") => `${px}px ${kind === "head" ? '"Permanent Marker"' : kind === "note" ? '"Caveat"' : '"Patrick Hand"'}, cursive`;
  SD.wobblyRect = function (ctx, x, y, w, h, r = 1.5) {
    ctx.beginPath();
    const j = () => (Math.random() - 0.5) * r;
    ctx.moveTo(x + j(), y + j()); ctx.lineTo(x + w + j(), y + j()); ctx.lineTo(x + w + j(), y + h + j()); ctx.lineTo(x + j(), y + h + j()); ctx.closePath();
  };

  /* ---------------- SVG helpers ---------------- */
  SD.svgEl = function (tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  SD.text = function (parent, x, y, str, cls) {
    const t = SD.svgEl("text", { x, y, class: cls || "" }, parent);
    t.textContent = str; return t;
  };

  /* Replace every .r shape inside sketch SVGs with a hand-drawn rough.js version */
  SD.roughify = function (root) {
    root = root || document;
    const svgs = root.tagName && root.tagName.toLowerCase() === "svg" ? [root] : SD.$$("svg.sketch", root);
    svgs.forEach((svg) => {
      const shapes = SD.$$(".r", svg);
      if (!window.rough) { // graceful fallback: plain shapes + translucent fills
        shapes.forEach((el) => { const f = el.getAttribute("data-fill"); if (f && SD.PALETTE[f]) { el.style.fill = SD.PALETTE[f]; el.style.fillOpacity = 0.3; } });
        return;
      }
      const rc = rough.svg(svg);
      shapes.forEach((el) => {
        const A = (n) => parseFloat(el.getAttribute(n) || 0);
        const fillName = el.getAttribute("data-fill");
        const o = {
          stroke: "currentColor",
          strokeWidth: parseFloat(el.getAttribute("data-sw") || 2),
          roughness: parseFloat(el.getAttribute("data-rough") || 1.15),
          bowing: 1.1,
        };
        if (fillName) {
          o.fill = SD.PALETTE[fillName] || fillName;
          o.fillStyle = el.getAttribute("data-fs") || "hachure";
          o.hachureGap = parseFloat(el.getAttribute("data-gap") || 5.5);
          o.fillWeight = parseFloat(el.getAttribute("data-fw") || 1.6);
          o.hachureAngle = -41;
        }
        if (el.hasAttribute("data-dash")) o.strokeLineDash = [7, 7];
        if (el.hasAttribute("data-single")) o.disableMultiStroke = true;
        const tag = el.tagName.toLowerCase();
        let node = null;
        try {
          if (tag === "rect") node = rc.rectangle(A("x"), A("y"), A("width"), A("height"), o);
          else if (tag === "circle") node = rc.circle(A("cx"), A("cy"), A("r") * 2, o);
          else if (tag === "ellipse") node = rc.ellipse(A("cx"), A("cy"), A("rx") * 2, A("ry") * 2, o);
          else if (tag === "line") node = rc.line(A("x1"), A("y1"), A("x2"), A("y2"), o);
          else if (tag === "path") node = rc.path(el.getAttribute("d"), o);
          else if (tag === "polygon" || tag === "polyline") {
            const pts = el.getAttribute("points").trim().split(/[\s]+/).map((p) => p.split(",").map(Number));
            node = tag === "polygon" ? rc.polygon(pts, o) : rc.linearPath(pts, o);
          }
        } catch (e) { node = null; }
        if (!node) return;
        // watercolor wash: a soft, slightly offset color fill under the pencil hatching
        if (fillName && o.fillStyle !== "solid" && o.fill !== "currentColor") {
          const wash = el.cloneNode(false);
          ["class", "id", "data-fill", "data-fs", "style"].forEach((a) => wash.removeAttribute(a));
          wash.setAttribute("fill", o.fill); wash.setAttribute("fill-opacity", el.getAttribute("data-wash") || 0.32); wash.setAttribute("stroke", "none");
          wash.setAttribute("transform", "translate(2.5 2.5) " + (el.getAttribute("transform") || ""));
          el.before(wash);
        }
        const cls = (el.getAttribute("class") || "").replace(/(^|\s)r(\s|$)/, " ").trim();
        node.setAttribute("class", (cls + " rough").trim());
        ["transform", "id", "style", "data-k"].forEach((a) => { if (el.getAttribute(a)) node.setAttribute(a, el.getAttribute(a)); });
        el.replaceWith(node);
      });
    });
  };

  /* ---------------- FLOW DIAGRAMS ----------------
     SD.flow(host, { w, h, nodes:[{id,x,y,w,h,label,icon,c,shape}], edges:[[from,to,label,{dash,bend,c,two,flow}]], groups:[{x,y,w,h,label,c}] })
     returns controller with send(), hl(), state(), setLabel()
  */
  let UID = 0;
  function anchor(n, tx, ty, pad = 5) {
    const dx = tx - n.x, dy = ty - n.y;
    if (!dx && !dy) return { x: n.x, y: n.y };
    if (n.shape === "circle") { const r = n.w / 2 + pad, d = Math.hypot(dx, dy); return { x: n.x + (dx / d) * r, y: n.y + (dy / d) * r }; }
    const hw = n.w / 2 + pad, hh = n.h / 2 + pad;
    const t = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
    return { x: n.x + dx * t, y: n.y + dy * t };
  }
  function arrowHead(p, from, len = 11) {
    const a = Math.atan2(p.y - from.y, p.x - from.x);
    const l = { x: p.x - len * Math.cos(a - 0.45), y: p.y - len * Math.sin(a - 0.45) };
    const r = { x: p.x - len * Math.cos(a + 0.45), y: p.y - len * Math.sin(a + 0.45) };
    return `M${l.x.toFixed(1)},${l.y.toFixed(1)} L${p.x.toFixed(1)},${p.y.toFixed(1)} L${r.x.toFixed(1)},${r.y.toFixed(1)}`;
  }

  SD.flow = function (host, cfg) {
    if (typeof host === "string") host = SD.$(host);
    const fid = "fl" + ++UID;
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${cfg.w} ${cfg.h}`, class: "sketch flow", role: "img", "aria-label": cfg.label || "diagram" });
    if (cfg.minW) svg.style.minWidth = cfg.minW + "px";
    const gG = SD.svgEl("g", { class: "groups" }, svg);
    const gE = SD.svgEl("g", { class: "edges" }, svg);
    const gN = SD.svgEl("g", { class: "nodes" }, svg);
    const gT = SD.svgEl("g", { class: "top" }, svg);
    const nodes = {}, edges = {};

    (cfg.groups || []).forEach((gr) => {
      const g = SD.svgEl("g", { class: "grp" + (gr.c ? " c-" + gr.c : "") }, gG);
      SD.svgEl("rect", { x: gr.x, y: gr.y, width: gr.w, height: gr.h, class: "r", "data-dash": "1", "data-rough": "0.7", "data-sw": 1.6, "data-fill": gr.fill || undefined, "data-gap": 14, "data-fw": 0.8 }, g);
      if (gr.label) SD.text(g, gr.x + 10, gr.y + 15, gr.label, "l note halo");
    });

    cfg.nodes.forEach((n0) => {
      const n = Object.assign({ w: 110, h: 54, shape: "box" }, n0);
      nodes[n.id] = n;
      const g = SD.svgEl("g", { class: "node" + (n.cls ? " " + n.cls : ""), "data-id": n.id }, gN);
      n.g = g;
      SD.svgEl("rect", { x: n.x - n.w / 2 - 9, y: n.y - n.h / 2 - 9, width: n.w + 18, height: n.h + 18, rx: 16, class: "hlbg" }, g);
      const fillAttrs = { "data-fill": n.c || undefined, "data-fs": n.fs || undefined };
      if (n.shape === "box") SD.svgEl("rect", Object.assign({ x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, class: "r" }, fillAttrs), g);
      else if (n.shape === "circle") SD.svgEl("circle", Object.assign({ cx: n.x, cy: n.y, r: n.w / 2, class: "r" }, fillAttrs), g);
      else if (n.shape === "db") {
        const ry = Math.min(11, n.h * 0.18), x = n.x - n.w / 2, y = n.y - n.h / 2;
        SD.svgEl("path", Object.assign({ d: `M${x},${y + ry} L${x},${y + n.h - ry} A${n.w / 2},${ry} 0 0 0 ${x + n.w},${y + n.h - ry} L${x + n.w},${y + ry}`, class: "r" }, fillAttrs), g);
        SD.svgEl("ellipse", Object.assign({ cx: n.x, cy: y + ry, rx: n.w / 2, ry, class: "r" }, fillAttrs), g);
      } else if (n.shape === "cloud") {
        const x = n.x, y = n.y, w = n.w / 2, h = n.h / 2;
        SD.svgEl("path", Object.assign({ d: `M${x - w * 0.7},${y + h * 0.6} C${x - w * 1.15},${y + h * 0.6} ${x - w * 1.1},${y - h * 0.3} ${x - w * 0.62},${y - h * 0.25} C${x - w * 0.6},${y - h * 1.05} ${x + w * 0.1},${y - h * 1.1} ${x + w * 0.2},${y - h * 0.55} C${x + w * 0.55},${y - h * 0.95} ${x + w * 1.1},${y - h * 0.5} ${x + w * 0.78},${y} C${x + w * 1.2},${y + h * 0.2} ${x + w * 1},${y + h * 0.75} ${x + w * 0.6},${y + h * 0.6} Z`, class: "r" }, fillAttrs), g);
      }
      const lines = n.label ? String(n.label).split("\n") : [];
      const total = lines.length + (n.icon ? 1 : 0);
      const lh = n.lh || 19;
      let y0 = n.y - ((total - 1) * lh) / 2 + (n.shape === "db" ? 5 : 0);
      if (n.icon) { SD.text(g, n.x, y0 - 1, n.icon, "lg"); y0 += lh + 2; }
      n.textEls = lines.map((ln, i) => SD.text(g, n.x, y0 + i * lh, ln, (i ? "s " : "") + "halo" + (n.small ? " s" : "")));
    });

    (cfg.edges || []).forEach((e0) => {
      const e = Array.isArray(e0) ? Object.assign({ from: e0[0], to: e0[1], label: e0[2] }, e0[3] || {}) : e0;
      const A = nodes[e.from], B = nodes[e.to];
      if (!A || !B) return;
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      let c = null;
      if (e.bend) { const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1; c = { x: mx + (-dy / L) * e.bend, y: my + (dx / L) * e.bend }; }
      const a = anchor(A, c ? c.x : B.x, c ? c.y : B.y, e.pad), b = anchor(B, c ? c.x : A.x, c ? c.y : A.y, e.pad);
      const d = c ? `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}` : `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
      const g = SD.svgEl("g", { class: "edge" + (e.c ? " c-" + e.c : "") + (e.cls ? " " + e.cls : "") }, gE);
      const vis = SD.svgEl("path", { d, class: "r", "data-sw": e.sw || 2, "data-rough": 0.9, "data-single": "1" }, g);
      if (e.dash) vis.setAttribute("data-dash", "1");
      if (!e.noArrow) SD.svgEl("path", { d: arrowHead(b, c || a), class: "r", "data-sw": 2.2, "data-rough": 0.5, "data-single": "1" }, g);
      if (e.two) SD.svgEl("path", { d: arrowHead(a, c || b), class: "r", "data-sw": 2.2, "data-rough": 0.5, "data-single": "1" }, g);
      const mp = SD.svgEl("path", { d, id: `${fid}-${e.from}-${e.to}`, fill: "none", stroke: "none" }, g);
      if (e.label) {
        const lx = c ? 0.25 * a.x + 0.5 * c.x + 0.25 * b.x : (a.x + b.x) / 2;
        const ly = c ? 0.25 * a.y + 0.5 * c.y + 0.25 * b.y : (a.y + b.y) / 2;
        const t = SD.text(g, lx + (e.lx || 0), ly + (e.ly || 0), e.label, "s halo");
        t.style.color = "var(--ink)";
      }
      if (e.flow || cfg.flowing) {
        const n = e.flowN || 2;
        for (let i = 0; i < n; i++) {
          const dot = SD.svgEl("circle", { r: 4.5, class: "flowdot", fill: SD.PALETTE[e.flowC || e.c || "pink"] || "#f06595" }, gT);
          const am = SD.svgEl("animateMotion", { dur: (e.flowDur || 2.4) + "s", repeatCount: "indefinite", begin: (-i * (e.flowDur || 2.4) / n) + "s" }, dot);
          const mpath = SD.svgEl("mpath", {}, am);
          mpath.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + mp.id);
          mpath.setAttribute("href", "#" + mp.id);
        }
      }
      edges[e.from + ">" + e.to] = { g, path: mp, e };
    });

    host.innerHTML = "";
    host.appendChild(svg);
    SD.roughify(svg);

    const api = {
      svg, nodes, edges, top: gT,
      node: (id) => nodes[id],
      hl(ids, on = true) { [].concat(ids).forEach((id) => nodes[id] && nodes[id].g.classList.toggle("hl", on)); return api; },
      clear(cls = "hl") { Object.values(nodes).forEach((n) => n.g.classList.remove(...cls.split(" "))); return api; },
      state(id, cls, on = true) { [].concat(id).forEach((i) => nodes[i] && nodes[i].g.classList.toggle(cls, on)); return api; },
      edgeState(from, to, cls, on = true) { const e = edges[from + ">" + to] || edges[to + ">" + from]; if (e) e.g.classList.toggle(cls, on); return api; },
      setLabel(id, str, line = 0) { const n = nodes[id]; if (n && n.textEls[line]) n.textEls[line].textContent = str; return api; },
      reset() { api.clear("hl down bad good"); SD.$$(".pkt, .pkt-l", gT).forEach((p) => p.remove()); return api; },
      /* animate a packet from one node to another (follows the edge if one exists) */
      send(from, to, o = {}) {
        let path = null, rev = false;
        if (edges[from + ">" + to]) path = edges[from + ">" + to].path;
        else if (edges[to + ">" + from]) { path = edges[to + ">" + from].path; rev = true; }
        let temp = null;
        if (!path) {
          const A = nodes[from], B = nodes[to];
          const a = anchor(A, B.x, B.y), b = anchor(B, A.x, A.y);
          temp = path = SD.svgEl("path", { d: `M${a.x},${a.y} L${b.x},${b.y}`, fill: "none", stroke: "none" }, gT);
        }
        const L = path.getTotalLength();
        const col = SD.PALETTE[o.color || "pink"] || o.color;
        const dot = SD.svgEl("circle", { r: o.r || 8, class: "pkt", fill: col }, gT);
        let lab = null;
        if (o.label) { lab = SD.text(gT, 0, 0, o.label, "s halo pkt-l"); }
        const dur = (o.dur || 900) / (SD.speed || 1);
        return SD.tween(dur, (k) => {
          const p = path.getPointAtLength(rev ? L * (1 - k) : L * k);
          dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
          if (lab) { lab.setAttribute("x", p.x); lab.setAttribute("y", p.y - 17); }
        }).then(() => {
          if (!o.keep) { dot.remove(); lab && lab.remove(); }
          temp && temp.remove();
          return dot;
        });
      },
      /* show a little floating note above a node */
      pop(id, str, o = {}) {
        const n = nodes[id];
        const t = SD.text(gT, n.x + (o.dx || 0), n.y - n.h / 2 - 16 + (o.dy || 0), str, "note halo pkt-l");
        if (o.color) t.style.fill = SD.PALETTE[o.color];
        setTimeout(() => t.remove(), o.ms || 1400);
      },
    };
    return api;
  };

  /* Step-by-step animation player.
     opts: { root, intro, steps:[{cap, run:async(gen)=>{}}], onReset } — buttons: [data-act=play|next|reset] */
  SD.player = function (opts) {
    const root = opts.root, cap = SD.$(".cap", root);
    let i = -1, gen = 0, busy = false;
    const alive = (g) => g === gen;
    function setCap(k) { cap.innerHTML = k < 0 ? opts.intro || "Press ▶ Play" : `<span class="pill-n">${k + 1}</span> ${opts.steps[k].cap}`; }
    async function step(k, g) {
      busy = true; i = k; setCap(k);
      try { await opts.steps[k].run(g, alive); } catch (e) { console.warn(e); }
      busy = false;
    }
    function reset() { gen++; i = -1; busy = false; opts.onReset && opts.onReset(); setCap(-1); }
    async function play() {
      reset(); const g = gen;
      for (let k = 0; k < opts.steps.length; k++) { if (!alive(g)) return; await step(k, g); if (!alive(g)) return; await SD.sleep(opts.pause || 700); }
    }
    function next() { if (busy) return; if (i >= opts.steps.length - 1) { reset(); } const g = gen; step(i + 1, g); }
    SD.$$("[data-act]", root).forEach((b) => b.addEventListener("click", () => ({ play, next, reset })[b.dataset.act]()));
    setCap(-1);
    return { play, next, reset, get i() { return i; } };
  };

  /* ---------------- SEQUENCE DIAGRAMS ----------------
     SD.seq(host, { w, actors:[{name,icon,c}], msgs:[{f,t,label,dash,c} | {f, note}] })  → { play() } */
  SD.seq = function (host, cfg) {
    if (typeof host === "string") host = SD.$(host);
    const W = cfg.w || 560, gap = cfg.gap || 46, top = 84;
    const H = top + cfg.msgs.reduce((s, m) => s + (m.gap || gap), 0) + 20;
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": cfg.label || "sequence diagram" });
    const n = cfg.actors.length, xs = cfg.actors.map((a, i) => (W * (i + 0.5)) / n);
    const gl = SD.svgEl("g", {}, svg), gm = SD.svgEl("g", {}, svg), gt = SD.svgEl("g", {}, svg);
    cfg.actors.forEach((a, i) => {
      SD.svgEl("line", { x1: xs[i], y1: 62, x2: xs[i], y2: H - 6, class: "r", "data-dash": 1, "data-sw": 1.4, "data-rough": 0.5 }, gl);
      SD.svgEl("rect", { x: xs[i] - 70, y: 8, width: 140, height: 52, class: "r", "data-fill": a.c || "yellow" }, gl);
      SD.text(gl, xs[i], 34, (a.icon ? a.icon + " " : "") + a.name, "halo");
    });
    let y = top;
    const items = cfg.msgs.map((m) => {
      const g = SD.svgEl("g", { opacity: 0, class: m.c ? "c-" + m.c : "" }, gm);
      const item = { g, m };
      if (m.note) {
        SD.text(g, xs[m.f] + (m.f === 0 ? 14 : -14), y + 4, m.note, (m.f === 0 ? "l" : "r-a") + " note halo");
      } else {
        const x1 = xs[m.f], x2 = xs[m.t], dir = Math.sign(x2 - x1);
        const a = { x: x1 + dir * 4, y }, b = { x: x2 - dir * 4, y: y + 12 };
        const pth = SD.svgEl("path", { d: `M${a.x},${a.y} L${b.x},${b.y}`, class: "r", "data-single": 1, "data-rough": 0.8 }, g);
        if (m.dash) pth.setAttribute("data-dash", 1);
        SD.svgEl("path", { d: arrowHead(b, a), class: "r", "data-single": 1, "data-rough": 0.4, "data-sw": 2.2 }, g);
        const t = SD.text(g, (x1 + x2) / 2, y - 9, m.label, "s halo");
        t.style.color = "var(--ink)";
        item.a = a; item.b = b;
      }
      y += m.gap || gap;
      return item;
    });
    host.innerHTML = ""; host.appendChild(svg); SD.roughify(svg);
    let gen = 0;
    return {
      svg,
      async play(loop) {
        const g = ++gen;
        do {
          items.forEach((it) => it.g.setAttribute("opacity", 0));
          for (const it of items) {
            if (g !== gen) return;
            if (it.a) {
              const dot = SD.svgEl("circle", { r: 7, class: "pkt", fill: SD.PALETTE[it.m.c || "pink"] || "#f06595" }, gt);
              await SD.tween(it.m.dur || 650, (k) => { dot.setAttribute("cx", SD.lerp(it.a.x, it.b.x, k)); dot.setAttribute("cy", SD.lerp(it.a.y, it.b.y, k)); });
              dot.remove();
            } else await SD.sleep(it.m.wait || 700);
            if (g !== gen) return;
            it.g.setAttribute("opacity", 1);
            await SD.sleep(180);
          }
          if (loop) await SD.sleep(2200);
        } while (loop && g === gen);
      },
      stop() { gen++; },
    };
  };

  /* ---------------- tabs ---------------- */
  SD.tabs = function (root) {
    SD.$$(".tabs", root || document).forEach((t) => {
      if (t.dataset.ready) return; t.dataset.ready = 1;
      const btns = SD.$$(":scope > .tablist [data-tab]", t);
      const show = (id) => {
        btns.forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === id ? "true" : "false"));
        SD.$$(":scope > .tabpanel", t).forEach((p) => {
          const on = p.dataset.panel === id; p.hidden = !on;
          if (on) p.dispatchEvent(new CustomEvent("tabshow", { bubbles: true }));
        });
      };
      btns.forEach((b) => { b.setAttribute("role", "tab"); b.addEventListener("click", () => show(b.dataset.tab)); });
      const first = btns.find((b) => b.getAttribute("aria-selected") === "true") || btns[0];
      if (first) show(first.dataset.tab);
    });
  };

  /* ---------------- page chrome ---------------- */
  function buildChrome() {
    const page = document.body.dataset.page || "home";
    const idx = SD.CHAPTERS.findIndex((c) => c.id === page);
    const visited = SD.store.get("sd-visited", []);
    if (!visited.includes(page)) { visited.push(page); SD.store.set("sd-visited", visited); }
    // chapter & section numbers follow the CHAPTERS order automatically
    if (idx >= 0) {
      SD.$$(".chapter-tag").forEach((t) => (t.textContent = t.textContent.replace(/Chapter \d+/, "Chapter " + (idx + 1))));
      SD.$$(".sec-num").forEach((s) => (s.textContent = s.textContent.replace(/^\d+(?=\.)/, String(idx + 1))));
    }

    const bar = document.createElement("header");
    bar.className = "topbar";
    bar.innerHTML = `
      <a class="home-link" href="../index.html" title="All explainers">← <span class="long">All explainers</span><span class="short">All</span></a>
      <a class="brand" href="index.html" aria-label="System Design Sketchbook home"><span class="logo">✏️</span><span class="t"><span class="w1">System</span> <span class="w2">Design</span> <small>Sketchbook</small></span></a>
      <span class="sp"></span>
      <button class="icon-btn" id="menuBtn" aria-expanded="false" aria-controls="chapMenu">📚 <span class="hide-xs">Chapters</span></button>
      <button class="icon-btn theme-btn" id="themeBtn" aria-label="Toggle night mode" title="Toggle night mode"></button>`;
    document.body.prepend(bar);
    const prog = document.createElement("div"); prog.className = "progress"; bar.after(prog);
    const scrim = document.createElement("div"); scrim.className = "scrim"; document.body.appendChild(scrim);
    const menu = document.createElement("nav");
    menu.className = "menu"; menu.id = "chapMenu"; menu.setAttribute("aria-label", "Chapters");
    menu.innerHTML = `<h3>📚 Pick a chapter <span class="muted note-font">(${visited.length}/${SD.CHAPTERS.length} explored)</span></h3>
      <div class="menu-grid">${SD.CHAPTERS.map((c, i) => `
        <a href="${c.file}" class="${c.id === page ? "cur" : ""}"><span class="em">${c.em}</span>
        <span><span class="n">Chapter ${i + 1}</span>${c.title}</span>${visited.includes(c.id) ? '<span class="done-tick">✓</span>' : ""}</a>`).join("")}
      </div>`;
    document.body.appendChild(menu);
    const mb = SD.$("#menuBtn");
    const toggle = (open) => { menu.classList.toggle("open", open); scrim.classList.toggle("open", open); mb.setAttribute("aria-expanded", open); };
    mb.addEventListener("click", () => toggle(!menu.classList.contains("open")));
    scrim.addEventListener("click", () => toggle(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });

    const st = document.createElement("style");
    st.textContent = "@media (max-width:400px){.hide-xs{display:none}}";
    document.head.appendChild(st);

    // theme
    const tb = SD.$("#themeBtn");
    const paint = () => { tb.textContent = SD.isDark() ? "☀️" : "🌙"; };
    paint();
    tb.addEventListener("click", () => {
      const next = SD.isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("sd-theme", next); } catch (e) {}
      paint(); document.dispatchEvent(new CustomEvent("themechange"));
    });
    if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { paint(); document.dispatchEvent(new CustomEvent("themechange")); });

    // progress bar
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // footer chapter nav
    const main = SD.$("main") || document.body;
    if (idx >= 0) {
      const prev = SD.CHAPTERS[idx - 1], next = SD.CHAPTERS[idx + 1];
      const nav = document.createElement("nav");
      nav.className = "chapter-nav";
      nav.setAttribute("aria-label", "Chapter navigation");
      nav.innerHTML = `
        <div>${prev ? `<a href="${prev.file}"><div class="card"><div class="dir">← Previous</div><h3 class="mb0">${prev.em} ${prev.title}</h3></div></a>` : ""}</div>
        <div>${next ? `<a href="${next.file}"><div class="card next"><div class="dir">Next chapter →</div><h3 class="mb0">${next.em} ${next.title}</h3></div></a>` : `<a href="index.html"><div class="card next"><div class="dir">You did it! 🎉</div><h3 class="mb0">🏠 Back to start</h3></div></a>`}</div>`;
      main.appendChild(nav);
      const foot = document.createElement("p");
      foot.className = "foot";
      foot.innerHTML = "Drawn with ✏️ for curious minds of every age · tip: press 🌙 for chalkboard mode";
      main.appendChild(foot);
    }
  }

  function reveal() {
    const els = SD.$$(".sec .card, .sec .sticky, .sec .diagram, .sec .callout, .sec .table-wrap, [data-reveal]");
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => { if (el.closest(".menu, .chapter-nav")) return; el.classList.add("reveal"); io.observe(el); });
  }

  /* glossary-style hover hints: <span class="term" data-tip="...">word</span> */
  function tips() {
    SD.$$(".term[data-tip]").forEach((t) => { t.title = t.dataset.tip; t.tabIndex = 0; });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildChrome();
    SD.roughify(document);
    SD.tabs(document);
    tips();
    reveal();
  });
})();
