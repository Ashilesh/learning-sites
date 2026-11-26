/* Chapter 7 — Reliability & Ops */
(function () {
  const { $, $$, flow } = SD;
  const ink = () => SD.cssVar("--ink"), soft = () => SD.cssVar("--ink-soft");
  const onScreen = (el) => { const o = { v: false }; new IntersectionObserver((es) => (o.v = es[0].isIntersecting)).observe(el); return o; };

  /* ---------- failover ---------- */
  const fo = flow("#foFlow", {
    w: 460, h: 280,
    nodes: [{ id: "u", x: 55, y: 140, w: 76, h: 56, icon: "👥", label: "Users", c: "blue" }, { id: "lb", x: 170, y: 140, w: 80, h: 56, icon: "🚦", label: "LB", c: "orange" },
      { id: "p", x: 360, y: 60, w: 150, h: 64, label: "👑 Primary\n(region A)", c: "yellow", small: 1 }, { id: "s", x: 360, y: 220, w: 150, h: 64, label: "😴 Standby\n(region B)", c: "gray", small: 1 }],
    edges: [["u", "lb"], ["lb", "p"], ["lb", "s", "", { dash: 1 }], ["p", "s", "replicate", { dash: 1 }]],
  });
  SD.player({
    root: $("#foBox"), intro: "Press ▶ to watch an automatic failover", pause: 500,
    onReset: () => { fo.reset(); fo.setLabel("s", "😴 Standby").setLabel("p", "👑 Primary"); },
    steps: [
      { cap: "Normal day: all traffic goes to the primary", run: async () => { await fo.send("u", "lb", { dur: 500 }); await fo.send("lb", "p", { dur: 500 }); } },
      { cap: "Data is copied to the standby all the time", run: () => fo.send("p", "s", { label: "data", color: "green" }) },
      { cap: "💥 The primary crashes!", run: async () => { fo.state("p", "down"); fo.pop("p", "💥", { ms: 1500 }); await SD.sleep(900); } },
      { cap: "Health checks fail 3× in a row → declared dead", run: async () => { for (let i = 0; i < 3; i++) { await fo.send("lb", "p", { label: "ping?", color: "orange", dur: 400 }); fo.pop("p", "❌", { color: "red", ms: 500 }); } } },
      { cap: "The standby is promoted and traffic switches over", run: async () => { fo.setLabel("s", "👑 New primary"); fo.state("s", "good"); await fo.send("u", "lb", { dur: 500 }); await fo.send("lb", "s", { dur: 500, color: "green" }); } },
      { cap: "Users saw a blip of a few seconds. That's the RTO! ⏱️", run: async () => { fo.hl("u"); await SD.sleep(1000); } },
    ],
  });

  /* ---------- retries chart ---------- */
  (function retries() {
    const cv = $("#retryCv"), st = SD.canvas(cv, null, 0.5, 280, 440);
    const MODES = {
      fixed: ["🔨 Retry immediately", "Everyone retries every 0.5 s in lock-step → giant spikes keep hammering the server while it tries to recover. 😵"],
      exp: ["📈 Exponential backoff", "Waits double (0.5, 1, 2, 4 s…) — fewer retries, but clients still retry at the same moments: synchronized spikes."],
      jitter: ["🎲 Backoff + jitter", "Random waits spread retries out smoothly — the recovering server sees a gentle, steady flow. 😌"],
    };
    let mode = "fixed", pts = [];
    $("#retryChips").innerHTML = Object.entries(MODES).map(([k, v]) => `<button class="chip" data-k="${k}">${v[0]}</button>`).join("");
    function compute() {
      pts = []; const C = 40, T = 16;
      for (let c = 0; c < C; c++) {
        let t = Math.random() * 0.15, n = 0;
        while (t < T && n < 30) {
          pts.push({ c, t });
          const base = 0.5 * Math.pow(2, n);
          const wait = mode === "fixed" ? 0.5 : mode === "exp" ? base : Math.random() * base * 2;
          t += Math.max(0.05, wait); n++;
          if (t > 4 && Math.random() < 0.5) { pts.push({ c, t, ok: true }); break; } // server recovered at 4s
        }
      }
      draw();
    }
    function draw() {
      const { ctx, w, h } = st; ctx.clearRect(0, 0, w, h);
      const pl = 40, pr = 12, top = 14, mid = h * 0.58, bot = h - 26, T = 16;
      const X = (t) => pl + (t / T) * (w - pl - pr);
      ctx.fillStyle = "rgba(255,107,107,.12)"; ctx.fillRect(X(0), top, X(4) - X(0), bot - top);
      ctx.fillStyle = soft(); ctx.font = SD.font(13); ctx.textAlign = "left"; ctx.fillText("server down 💀", X(0) + 4, top + 10);
      ctx.fillText("clients ↓", 2, top + 10);
      pts.forEach((p) => { ctx.fillStyle = p.ok ? "#51cf66" : "#f06595"; ctx.beginPath(); ctx.arc(X(p.t), top + 18 + (p.c / 40) * (mid - top - 30), 3, 0, 7); ctx.fill(); });
      // histogram
      const B = 64, bins = new Array(B).fill(0);
      pts.forEach((p) => { const i = Math.floor((p.t / T) * B); if (i < B) bins[i]++; });
      const mx = Math.max(12, ...bins), capY = bot - (10 / mx) * (bot - mid - 10);
      bins.forEach((v, i) => { const x = X((i / B) * T), bw = (w - pl - pr) / B - 1, hh = (v / mx) * (bot - mid - 10); ctx.fillStyle = v > 10 ? "#ff6b6b" : "#74c0fc"; ctx.fillRect(x, bot - hh, bw, hh); });
      ctx.strokeStyle = "#e03131"; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl, capY); ctx.lineTo(w - pr, capY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#e03131"; ctx.textAlign = "right"; ctx.fillText("server capacity", w - pr, capY - 6);
      ctx.strokeStyle = ink(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl, bot); ctx.lineTo(w - pr, bot); ctx.stroke();
      ctx.fillStyle = soft(); ctx.textAlign = "center";
      for (let s = 0; s <= 16; s += 4) ctx.fillText(s + "s", X(s), bot + 14);
      ctx.textAlign = "left"; ctx.fillText("retries per moment", 2, mid + 4);
    }
    $("#retryChips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; mode = b.dataset.k; $$("#retryChips .chip").forEach((x) => x.classList.toggle("on", x === b)); $("#retryCap").textContent = MODES[mode][1]; compute(); });
    st.resize(); document.addEventListener("themechange", draw);
    $("#retryChips .chip").click();
    new ResizeObserver(() => draw()).observe(cv.parentElement);
  })();

  /* ---------- circuit breaker ---------- */
  (function cb() {
    let state = "closed", fails = 0, openUntil = 0, auto = null;
    const TH = 3, COOL = 5000;
    const log = (t, cls) => { const d = document.createElement("div"); d.className = cls; d.textContent = new Date().toLocaleTimeString() + "  " + t; const L = $("#cbLog"); L.prepend(d); while (L.children.length > 30) L.lastChild.remove(); };
    function paint() {
      $("#cbC").classList.toggle("on", state === "closed"); $("#cbO").classList.toggle("on", state === "open"); $("#cbH").classList.toggle("on", state === "half");
      $("#cbFails").textContent = fails + "/" + TH;
      $("#cbTimer").textContent = state === "open" ? Math.ceil((openUntil - Date.now()) / 1000) + " s" : "–";
    }
    setInterval(() => { if (state === "open" && Date.now() >= openUntil) { state = "half"; log("🟡 Cool-down over → half-open: next request is a trial", "info"); } paint(); }, 250);
    function send() {
      const healthy = $("#cbHealthy").checked;
      if (state === "open") { log("⚡ Rejected instantly (breaker open) → showing cached fallback", "bad"); return paint(); }
      if (healthy) {
        log(state === "half" ? "✅ Trial call succeeded → breaker CLOSED" : "✅ 200 OK", "ok");
        state = "closed"; fails = 0;
      } else {
        fails++;
        if (state === "half" || fails >= TH) { const trial = state === "half"; state = "open"; openUntil = Date.now() + COOL; log(`💥 Failed (${trial ? "trial call" : fails + " in a row"}) → breaker OPEN for 5 s`, "bad"); fails = TH; }
        else log(`⏳ Timeout after 2 s… failure ${fails}/${TH}`, "bad");
      }
      paint();
    }
    $("#cbSend").addEventListener("click", send);
    $("#cbAuto").addEventListener("click", (e) => { if (auto) { clearInterval(auto); auto = null; e.target.textContent = "🔁 Auto-send"; e.target.classList.remove("on"); } else { auto = setInterval(send, 800); e.target.textContent = "⏸ Stop"; e.target.classList.add("on"); } });
    $("#cbHealthy").addEventListener("change", (e) => log(e.target.checked ? "💚 Payment service recovered" : "🔥 Payment service is now failing!", "info"));
    paint();
  })();

  /* ---------- token bucket ---------- */
  (function bucket() {
    const CAP = 8; let tokens = 8, ok = 0, no = 0;
    const B = $("#bucket");
    function draw() { const n = Math.floor(tokens); if (B.children.length !== n) B.innerHTML = Array.from({ length: n }, () => '<div class="tok">🪙</div>').join(""); $("#rlOk").textContent = ok; $("#rlNo").textContent = no; }
    setInterval(() => { tokens = Math.min(CAP, tokens + (+$("#refill").value) * 0.1); draw(); }, 100);
    $("#refill").addEventListener("input", () => ($("#refV").textContent = $("#refill").value + " tokens/s"));
    function req() { if (tokens >= 1) { tokens -= 1; ok++; flash("var(--green)"); } else { no++; flash("var(--red)"); } draw(); }
    let ft = 0; function flash(c) { B.style.borderColor = c; clearTimeout(ft); ft = setTimeout(() => (B.style.borderColor = ""), 250); }
    $("#rl1").addEventListener("click", req);
    $("#rl10").addEventListener("click", async () => { for (let i = 0; i < 10; i++) { req(); await SD.sleep(60); } });
    draw();
  })();

  /* ---------- RPO / RTO ---------- */
  (function rpo() {
    const W = 760, H = 200, svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "RPO and RTO timeline" });
    svg.style.minWidth = "520px";
    const X = (t) => 40 + t * 68;
    SD.svgEl("line", { x1: 30, y1: 110, x2: W - 20, y2: 110, class: "r", "data-sw": 3 }, svg);
    SD.svgEl("path", { d: `M${W - 32},102 L${W - 20},110 L${W - 32},118`, class: "r" }, svg);
    SD.text(svg, W - 40, 132, "time →", "s soft");
    SD.svgEl("rect", { x: X(2), y: 88, width: X(5) - X(2), height: 44, class: "r", "data-fill": "pink" }, svg);
    SD.svgEl("rect", { x: X(5), y: 88, width: X(8.5) - X(5), height: 44, class: "r", "data-fill": "blue" }, svg);
    [[2, "💾 last good backup"], [5, "💥 disaster!"], [8.5, "✅ back online"]].forEach(([t, l]) => { SD.svgEl("line", { x1: X(t), y1: 60, x2: X(t), y2: 150, class: "r", "data-sw": 2.5 }, svg); SD.text(svg, X(t), 44, l, "halo"); });
    SD.text(svg, (X(2) + X(5)) / 2, 172, "⏪ RPO: data lost", "note halo");
    SD.text(svg, (X(5) + X(8.5)) / 2, 172, "⏩ RTO: downtime", "note halo");
    const host = $("#rpoSvg"); host.classList.add("scroll-x"); host.appendChild(svg); SD.roughify(svg);
  })();

  /* ---------- deployments ---------- */
  (function deploys() {
    const mk = (id, nodes, edges) => flow(id, { w: 300, h: 220, nodes, edges });
    const S = (id, y, label, c) => ({ id, x: 220, y, w: 110, h: 36, label, c, small: 1 });
    const roll = mk("#dRoll", [{ id: "lb", x: 55, y: 110, w: 70, h: 50, label: "🚦 LB", c: "orange" }, S("a", 30, "v1", "gray"), S("b", 83, "v1", "gray"), S("c", 136, "v1", "gray"), S("d", 189, "v1", "gray")], [["lb", "a"], ["lb", "b"], ["lb", "c"], ["lb", "d"]]);
    const bg = mk("#dBG", [{ id: "lb", x: 55, y: 110, w: 70, h: 50, label: "🚦 LB", c: "orange" }, { id: "bl", x: 215, y: 55, w: 120, h: 56, label: "🔵 Blue v1", c: "blue", small: 1 }, { id: "gr", x: 215, y: 170, w: 120, h: 56, label: "🟢 Green v2", c: "green", small: 1 }], [["lb", "bl"], ["lb", "gr"]]);
    const can = mk("#dCan", [{ id: "lb", x: 55, y: 110, w: 70, h: 50, label: "🚦 LB", c: "orange" }, { id: "v1", x: 215, y: 60, w: 120, h: 60, label: "v1 · 95%", c: "gray", small: 1 }, { id: "v2", x: 215, y: 175, w: 120, h: 50, label: "🐤 v2 · 5%", c: "yellow", small: 1 }], [["lb", "v1"], ["lb", "v2"]]);
    const vis = onScreen($("#dRoll"));
    (async function rollLoop() {
      const ids = ["a", "b", "c", "d"];
      while (true) {
        if (!vis.v) { await SD.sleep(600); continue; }
        for (const id of ids) { roll.state(id, "hl"); await SD.sleep(500); roll.setLabel(id, "v2 ✅"); roll.state(id, "hl", false); roll.state(id, "good"); await SD.sleep(500); }
        await SD.sleep(1200); ids.forEach((id) => { roll.setLabel(id, "v1"); roll.state(id, "good", false); });
      }
    })();
    (async function bgLoop() {
      let live = "bl";
      while (true) {
        if (!vis.v) { await SD.sleep(600); continue; }
        bg.edgeState("lb", live === "bl" ? "gr" : "bl", "faint", true); bg.edgeState("lb", live, "faint", false);
        bg.state(live, "good"); bg.state(live === "bl" ? "gr" : "bl", "good", false);
        for (let i = 0; i < 3; i++) await bg.send("lb", live, { dur: 500, color: live === "bl" ? "blue" : "green" });
        live = live === "bl" ? "gr" : "bl"; bg.pop("lb", "🔀 flip!", { ms: 700 }); await SD.sleep(400);
      }
    })();
    (async function canLoop() {
      let n = 0;
      while (true) {
        if (!vis.v) { await SD.sleep(600); continue; }
        n++; const to = n % 6 === 0 ? "v2" : "v1";
        await can.send("lb", to, { dur: 450, color: to === "v2" ? "yellow" : "gray" });
        if (to === "v2") can.pop("v2", "metrics ✅", { color: "green", ms: 800 });
      }
    })();
  })();

  /* ---------- trace waterfall ---------- */
  (function trace() {
    const spans = [["GET /checkout", 0, 420, 0, "blue"], ["auth-service", 10, 30, 1, "purple"], ["cart-service", 45, 75, 1, "teal"], ["redis GET cart", 50, 8, 2, "red"], ["db SELECT items", 60, 55, 2, "green"],
      ["payment-service", 125, 285, 1, "orange"], ["fraud check", 130, 50, 2, "pink"], ["db INSERT payment 🐌", 185, 215, 2, "red"]];
    const W = 760, rowH = 34, H = spans.length * rowH + 50, lx = 210, X = (ms) => lx + (ms / 430) * (W - lx - 20);
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "Trace waterfall" });
    svg.style.minWidth = "560px";
    [0, 100, 200, 300, 400].forEach((ms) => { SD.svgEl("line", { x1: X(ms), y1: 10, x2: X(ms), y2: H - 26, stroke: "currentColor", opacity: 0.15, "stroke-dasharray": "4 5" }, svg); SD.text(svg, X(ms), H - 12, ms + " ms", "xs soft"); });
    spans.forEach(([n, s, d, depth, c], i) => {
      const y = 14 + i * rowH;
      SD.text(svg, 12 + depth * 18, y + rowH / 2 - 2, (depth ? "└ " : "") + n, "l s");
      SD.svgEl("rect", { x: X(s), y: y + 4, width: Math.max(6, X(s + d) - X(s)), height: rowH - 12, class: "r", "data-fill": c }, svg);
      SD.text(svg, X(s + d) + 6, y + rowH / 2 - 2, d + "ms", "l xs");
    });
    $("#traceSvg").appendChild(svg); SD.roughify(svg);
  })();

  /* ---------- castle ---------- */
  (function castle() {
    const S = 440, c = 220, svg = SD.svgEl("svg", { viewBox: `0 0 ${S} ${S}`, class: "sketch", role: "img", "aria-label": "Defense in depth layers" });
    const rings = [["🌐 Edge: WAF + DDoS shield", "teal"], ["🔒 TLS encryption", "blue"], ["🪪 Authentication", "purple"], ["🎟️ Authorization", "pink"], ["🧼 Input validation", "orange"], ["🔐 Encrypted at rest", "yellow"]];
    rings.forEach(([l, col], i) => { const r = 210 - i * 30; SD.svgEl("circle", { cx: c, cy: c, r, class: "r", "data-fill": col, "data-gap": 11, "data-fw": 1, "data-sw": 2, "data-wash": 0.13 }, svg); });
    rings.forEach(([l], i) => { const r = 210 - i * 30; SD.text(svg, c, c - r + 15, l, "s halo"); });
    SD.text(svg, c, c - 6, "💎", "lg"); SD.text(svg, c, c + 18, "your data", "s halo");
    $("#castle").appendChild(svg); SD.roughify(svg);
  })();
})();
