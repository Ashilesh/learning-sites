/* Chapter 4 — Scaling Up */
(function () {
  const { $, $$, flow, clamp } = SD;
  const ink = () => SD.cssVar("--ink"), soft = () => SD.cssVar("--ink-soft");

  /* ---------- 4.1 vertical vs horizontal ---------- */
  let vl = 1, hc = 1, vDead = false;
  const msg = (t) => ($("#vhMsg").innerHTML = t);
  function drawV() {
    const s = 46 + vl * 22, box = $("#vBox");
    box.style.width = s + "px"; box.style.height = Math.min(180, s) + "px"; box.style.fontSize = 1 + vl * 0.35 + "rem";
    box.style.background = vDead ? "var(--red)" : "";
    box.textContent = vDead ? "💀" : "🤖";
    $("#vCap").textContent = vDead ? "0×" : Math.pow(2, vl - 1) + "×";
    $("#vCost").textContent = "$" + Math.round(Math.pow(2.6, vl - 1));
    $("#vUp").disabled = vl >= 6;
  }
  function drawH() {
    $("#hStage").innerHTML = Array.from({ length: hc }, () => '<div class="smallbox">🤖</div>').join("");
    $("#hCap").textContent = hc + "×"; $("#hCost").textContent = "$" + hc;
  }
  $("#vUp").addEventListener("click", () => { if (vDead) return; vl++; drawV(); msg(vl >= 6 ? "💸 That's the biggest machine money can buy. No more vertical room!" : "Bigger box = more power… but the price climbs fast 📈"); });
  $("#hUp").addEventListener("click", () => { if (hc < 32) hc++; drawH(); msg("Each new small machine adds the same capacity for the same price 👍"); });
  $("#vKill").addEventListener("click", () => { vDead = true; drawV(); msg("😱 The one big machine crashed — the WHOLE app is down until it reboots!"); setTimeout(() => { vDead = false; drawV(); }, 2500); });
  $("#hKill").addEventListener("click", () => { if (hc > 1) { hc--; drawH(); msg("🙂 One robot fell over, the others keep serving. Users barely notice!"); } else msg("Add a few more robots first!"); });
  drawV(); drawH();

  /* ---------- 4.2 stateless ---------- */
  flow("#stickyFlow", {
    w: 480, h: 200,
    nodes: [{ id: "b", x: 60, y: 100, w: 80, h: 56, icon: "🧑", label: "Bob", c: "blue" }, { id: "lb", x: 190, y: 100, w: 76, h: 50, label: "🚦 LB", c: "orange" },
      { id: "s1", x: 350, y: 45, w: 150, h: 54, label: "🖥️ S1 (Bob's cart 🛒)", c: "yellow", small: 1 }, { id: "s2", x: 350, y: 155, w: 150, h: 50, label: "🖥️ S2 (knows nothing)", c: "gray", small: 1 }],
    edges: [["b", "lb", "", { flow: 1 }], ["lb", "s1", "always here", { flow: 1 }], ["lb", "s2", "", { dash: 1 }]],
  });
  flow("#sharedFlow", {
    w: 480, h: 200,
    nodes: [{ id: "b", x: 50, y: 100, w: 76, h: 56, icon: "🧑", label: "Bob", c: "blue" }, { id: "lb", x: 160, y: 100, w: 70, h: 50, label: "🚦 LB", c: "orange" },
      { id: "s1", x: 280, y: 45, w: 90, h: 46, label: "🖥️ S1", c: "yellow" }, { id: "s2", x: 280, y: 155, w: 90, h: 46, label: "🖥️ S2", c: "yellow" },
      { id: "r", x: 420, y: 100, w: 100, h: 70, icon: "🗂️", label: "Sessions", c: "red", small: 1 }],
    edges: [["b", "lb", "", { flow: 1 }], ["lb", "s1", "", { flow: 1 }], ["lb", "s2", "", { flow: 1 }], ["s1", "r"], ["s2", "r"]],
  });

  /* ---------- 4.3 load balancer simulation ---------- */
  (function lbSim() {
    const cv = $("#lbCv"), st = SD.canvas(cv, null, 0.5, 280, 420);
    const ALGOS = {
      rr: ["🔁 Round robin", "Takes turns 1→2→3→4. Notice server 4 (slow) builds a long line!"],
      least: ["📉 Least connections", "Picks the server with the fewest requests in progress. Slow server 4 automatically gets less work."],
      weighted: ["⚖️ Weighted", "Servers 1–3 get weight 6, server 4 gets 2.5 — matching their real speed."],
      random: ["🎲 Random", "Coin flips. Fair on average, but lines can get unlucky and lumpy."],
      p2c: ["✌️ Power of 2", "Pick two random servers, send to the less busy. Nearly as good as least-connections, much cheaper at scale."],
      hash: ["#️⃣ IP hash", "Same user always lands on the same server. One heavy user can overload one server."],
    };
    let algo = "rr", rr = 0, wrr = [0, 0, 0, 0];
    const servers = [6, 6, 6, 2.5].map((speed, i) => ({ i, speed, q: [], cur: null, rem: 0, assigned: 0, down: false, detected: false, downAt: 0, done: 0 }));
    let reqs = [], fx = [], lat = [], completed = 0, errors = 0, spawn = 0, now = 0;
    $("#algoChips").innerHTML = Object.entries(ALGOS).map(([k, v]) => `<button class="chip" data-k="${k}">${v[0]}</button>`).join("");
    function setAlgo(k) { algo = k; $$("#algoChips .chip").forEach((b) => b.classList.toggle("on", b.dataset.k === k)); $("#algoCap").textContent = ALGOS[k][1]; resetStats(); }
    $("#algoChips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setAlgo(b.dataset.k); });
    function resetStats() { lat = []; completed = 0; errors = 0; servers.forEach((s) => (s.done = 0)); }
    $("#resetLb").addEventListener("click", resetStats);
    $("#rate").addEventListener("input", () => ($("#rateV").textContent = $("#rate").value));
    $("#kill2").addEventListener("click", (e) => {
      const s = servers[1];
      if (!s.down) { s.down = true; s.detected = false; s.downAt = now; errors += s.q.length + (s.cur ? 1 : 0); s.q.forEach((r) => burst(r, false)); s.q = []; s.cur = null; s.assigned = 0; e.target.textContent = "💚 Revive server 2"; }
      else { s.down = false; s.detected = false; e.target.textContent = "💥 Kill server 2"; }
    });
    const load = (s) => s.assigned;
    function pick(r) {
      const alive = servers.filter((s) => !(s.down && s.detected));
      if (!alive.length) return null;
      if (algo === "rr") { rr = (rr + 1) % alive.length; return alive[rr]; }
      if (algo === "random") return alive[Math.floor(Math.random() * alive.length)];
      if (algo === "least") return alive.reduce((a, b) => (load(b) < load(a) ? b : a));
      if (algo === "p2c") { const a = alive[Math.floor(Math.random() * alive.length)], b = alive[Math.floor(Math.random() * alive.length)]; return load(a) <= load(b) ? a : b; }
      if (algo === "weighted") { // smooth weighted round robin
        let total = 0, best = null;
        alive.forEach((s) => { wrr[s.i] += s.speed; total += s.speed; if (!best || wrr[s.i] > wrr[best.i]) best = s; });
        wrr[best.i] -= total; return best;
      }
      if (algo === "hash") return alive[SD.hash("user" + r.user) % alive.length];
    }
    function burst(r, ok) { fx.push({ x: r.x, y: r.y, t: 0, ok }); }
    $("#rate").dispatchEvent(new Event("input"));
    setAlgo("rr");

    SD.loop(cv, (dt) => {
      const { ctx, w, h } = st; now += dt;
      const lbX = w * 0.3, srvX = w * 0.74, sy = (i) => h * (0.15 + i * 0.235), bw = Math.min(110, w * 0.17), bh = Math.min(52, h * 0.15);
      // spawn
      spawn -= dt * +$("#rate").value;
      while (spawn < 0) { spawn += 1; const u = Math.floor(Math.pow(Math.random(), 2.2) * 30); reqs.push({ x: 18, y: h / 2 + (Math.random() - 0.5) * h * 0.5, sx: 18, sy0: 0, t: 0, ph: "in", born: now, user: u }); }
      // health check detection
      servers.forEach((s) => { if (s.down && !s.detected && now - s.downAt > 1.6) s.detected = true; });
      // move
      reqs.forEach((r) => {
        if (r.ph === "in") {
          if (!r.t) r.sy0 = r.y;
          r.t += dt / 0.35; r.x = SD.lerp(r.sx, lbX, Math.min(1, r.t)); r.y = SD.lerp(r.sy0, h / 2, Math.min(1, r.t));
          if (r.t >= 1) { const s = pick(r); if (!s) { r.ph = "x"; errors++; burst(r, false); return; } r.s = s; s.assigned++; r.ph = "go"; r.t = 0; r.fx = lbX; r.fy = h / 2; }
        } else if (r.ph === "go") {
          r.t += dt / 0.35; const tx = srvX - bw / 2 - 10, ty = sy(r.s.i);
          r.x = SD.lerp(r.fx, tx, Math.min(1, r.t)); r.y = SD.lerp(r.fy, ty, Math.min(1, r.t));
          if (r.t >= 1) {
            if (r.s.down) { r.ph = "x"; errors++; r.s.assigned = Math.max(0, r.s.assigned - 1); burst(r, false); }
            else if (r.s.q.length > 24) { r.ph = "x"; errors++; r.s.assigned--; burst(r, false); }
            else { r.ph = "q"; r.s.q.push(r); }
          }
        }
      });
      // serve
      servers.forEach((s) => {
        if (s.down) return;
        if (!s.cur && s.q.length) { s.cur = s.q.shift(); s.rem = (1 / s.speed) * (0.6 + Math.random() * 0.8); }
        if (s.cur) {
          s.rem -= dt;
          if (s.rem <= 0) { const r = s.cur; s.cur = null; s.assigned = Math.max(0, s.assigned - 1); r.ph = "done"; completed++; s.done++; lat.push((now - r.born) * 1000); if (lat.length > 300) lat.shift(); fx.push({ x: srvX + bw / 2 + 8, y: sy(s.i), t: 0, ok: true }); }
        }
      });
      reqs = reqs.filter((r) => r.ph === "in" || r.ph === "go");
      // draw
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = soft(); ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]);
      servers.forEach((s) => { ctx.beginPath(); ctx.moveTo(lbX, h / 2); ctx.lineTo(srvX - bw / 2 - 10, sy(s.i)); ctx.stroke(); });
      ctx.setLineDash([]);
      // LB
      ctx.fillStyle = "#ffa94d"; ctx.strokeStyle = ink(); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(lbX, h / 2, Math.min(34, w * 0.05), 0, 7); ctx.fill(); ctx.stroke();
      ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🚦", lbX, h / 2);
      ctx.fillStyle = ink(); ctx.font = SD.font(15); ctx.fillText("load balancer", lbX, h / 2 + 46);
      ctx.fillText("users →", 34, 18);
      // servers
      servers.forEach((s) => {
        const x = srvX - bw / 2, y = sy(s.i) - bh / 2, util = Math.min(1, s.q.length / 15);
        ctx.fillStyle = s.down ? "#ff8787" : s.i === 3 ? "#e5dbff" : "#fff3bf"; ctx.strokeStyle = ink(); ctx.lineWidth = 2.5;
        ctx.fillRect(x, y, bw, bh); ctx.strokeRect(x, y, bw, bh);
        ctx.fillStyle = "#1f2430"; ctx.font = SD.font(15);
        ctx.fillText(s.down ? `💀 S${s.i + 1} ${s.detected ? "(removed)" : "(down!)"}` : `🖥️ S${s.i + 1} ${s.i === 3 ? "🐢 slow" : "⚡"}`, srvX, sy(s.i) - 7);
        ctx.font = SD.font(13); ctx.fillText(s.down ? "" : `served ${s.done}`, srvX, sy(s.i) + 12);
        // queue dots
        const n = s.q.length;
        for (let k = 0; k < Math.min(n, 12); k++) { ctx.fillStyle = "#f06595"; ctx.beginPath(); ctx.arc(x - 14 - k * 9, sy(s.i), 4, 0, 7); ctx.fill(); }
        if (n > 12) { ctx.fillStyle = ink(); ctx.font = SD.font(13); ctx.textAlign = "right"; ctx.fillText("+" + (n - 12), x - 14 - 12 * 9 - 4, sy(s.i)); ctx.textAlign = "center"; }
        // utilization bar
        ctx.fillStyle = util > 0.7 ? "#ff6b6b" : util > 0.35 ? "#ffa94d" : "#51cf66";
        ctx.fillRect(x, y + bh + 4, bw * util, 6); ctx.strokeStyle = soft(); ctx.lineWidth = 1; ctx.strokeRect(x, y + bh + 4, bw, 6);
        if (s.cur) { ctx.fillStyle = "#339af0"; ctx.beginPath(); ctx.arc(x + bw - 10, y + 10, 5, 0, 7); ctx.fill(); }
      });
      // requests
      reqs.forEach((r) => { ctx.fillStyle = "#f06595"; ctx.strokeStyle = ink(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(r.x, r.y, 4.5, 0, 7); ctx.fill(); ctx.stroke(); });
      fx = fx.filter((f) => (f.t += dt) < 0.7);
      fx.forEach((f) => { ctx.globalAlpha = 1 - f.t / 0.7; ctx.font = SD.font(16, "head"); ctx.fillStyle = f.ok ? "#2f9e44" : "#e03131"; ctx.fillText(f.ok ? "✓" : "✗", f.x + (f.ok ? f.t * 40 : 0), f.y - f.t * 20); ctx.globalAlpha = 1; });
      // stats
      if (Math.round(now * 10) % 3 === 0) {
        const sorted = lat.slice().sort((a, b) => a - b), p = (q) => (sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]) : 0);
        const avg = sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
        $("#lbStats").innerHTML = [["✅ served", completed], ["⏱️ avg", avg + " ms"], ["😤 p99", p(0.99) + " ms"], ["💥 errors", errors]]
          .map(([k, v]) => `<div class="stat"><span class="v" style="font-size:1.4rem">${v}</span><span class="k">${k}</span></div>`).join("");
      }
    }).start();
  })();

  /* ---------- 4.4 caching ---------- */
  flow("#layersFlow", {
    w: 480, h: 250,
    nodes: [
      { id: "b", x: 70, y: 55, w: 110, h: 54, icon: "🌐", label: "Browser", c: "blue", small: 1 },
      { id: "c", x: 240, y: 55, w: 110, h: 54, icon: "🚚", label: "CDN edge", c: "teal", small: 1 },
      { id: "a", x: 410, y: 55, w: 110, h: 54, icon: "🧠", label: "App memory", c: "yellow", small: 1 },
      { id: "r", x: 410, y: 190, w: 110, h: 54, icon: "⚡", label: "Redis cluster", c: "red", small: 1 },
      { id: "d", x: 240, y: 190, w: 110, h: 70, icon: "🗄️", label: "DB buffer", c: "green", shape: "db", small: 1 },
    ],
    edges: [["b", "c", "miss →"], ["c", "a", "miss →"], ["a", "r", "miss ↓"], ["r", "d", "← miss"]],
  });
  const STRATS = {
    aside: [
      ["App asks the cache for <b>user:42</b>", (f) => f.send("app", "cache", { label: "user:42?", color: "red" })],
      ["Not there — a cache <b>miss</b> ❌", (f) => f.send("cache", "app", { label: "❌ miss", color: "red" })],
      ["App reads it from the database (slow, ~20 ms)", async (f) => { await f.send("app", "db", { label: "SELECT", color: "green", dur: 1200 }); await f.send("db", "app", { label: "📄", color: "green", dur: 1200 }); }],
      ["App stores it in the cache with a TTL ⏰", (f) => f.send("app", "cache", { label: "SET ttl=60s", color: "red" })],
      ["Next read is a <b>hit</b> ✅ — ~1 ms instead of 20!", async (f) => { await f.send("app", "cache", { label: "user:42?", color: "red", dur: 500 }); await f.send("cache", "app", { label: "✅ hit!", color: "green", dur: 500 }); }],
    ],
    wt: [
      ["App writes <b>name=Bo</b> to the cache", (f) => f.send("app", "cache", { label: "SET name=Bo", color: "red" })],
      ["…and it's written to the DB <b>at the same time</b>", (f) => f.send("cache", "db", { label: "write", color: "green" })],
      ["Only when both are saved, the app hears ✅", async (f) => { await f.send("db", "cache", { label: "ok", color: "green" }); await f.send("cache", "app", { label: "✅ saved", color: "green" }); }],
      ["Reads are always fresh hits 🎯", async (f) => { await f.send("app", "cache", { label: "name?", color: "red", dur: 500 }); await f.send("cache", "app", { label: "Bo ✅", color: "green", dur: 500 }); }],
    ],
    wb: [
      ["App writes to the cache only — done instantly ⚡", async (f) => { await f.send("app", "cache", { label: "SET", color: "red", dur: 500 }); await f.send("cache", "app", { label: "✅", color: "green", dur: 400 }); }],
      ["More writes pile up in the cache (marked “dirty”)", async (f) => { await f.send("app", "cache", { label: "SET", color: "red", dur: 400 }); await f.send("app", "cache", { label: "SET", color: "red", dur: 400 }); }],
      ["Later, the cache flushes a <b>batch</b> to the DB", (f) => f.send("cache", "db", { label: "📦 batch of 3", color: "green", dur: 1300 })],
      ["⚠️ If the cache crashes <b>before</b> flushing, those writes are lost!", async (f) => { f.state("cache", "bad"); f.pop("cache", "💥 crash!", { color: "red", ms: 1800 }); await SD.sleep(1200); }],
    ],
    wa: [
      ["Writes go straight to the database", (f) => f.send("app", "db", { label: "UPDATE", color: "green" })],
      ["The old cached copy is deleted (so it can't be stale)", (f) => f.send("app", "cache", { label: "DEL key", color: "red" })],
      ["First read: miss ❌ → read DB → fill cache", async (f) => { await f.send("app", "cache", { label: "miss", color: "red", dur: 500 }); await f.send("app", "db", { label: "SELECT", color: "green", dur: 700 }); await f.send("app", "cache", { label: "SET", color: "red", dur: 500 }); }],
    ],
  };
  $$("[data-strat]").forEach((box) => {
    const f = flow(SD.$(".fl", box), {
      w: 520, h: 240,
      nodes: [{ id: "app", x: 90, y: 120, w: 110, h: 70, icon: "🖥️", label: "App", c: "yellow" }, { id: "cache", x: 400, y: 55, w: 120, h: 60, icon: "⚡", label: "Cache", c: "red" }, { id: "db", x: 400, y: 185, w: 120, h: 80, icon: "🗄️", label: "Database", c: "green", shape: "db" }],
      edges: [["app", "cache"], ["app", "db"], ["cache", "db", "", { dash: 1 }]],
    });
    SD.player({ root: box, intro: "Press ▶ Play to watch this strategy", onReset: () => f.reset(), steps: STRATS[box.dataset.strat].map(([cap, fn]) => ({ cap, run: () => fn(f) })) });
  });

  /* LRU */
  (function lru() {
    const CAP = 4; let list = [], hits = 0, miss = 0;
    $("#lruKeys").innerHTML = "ABCDEFGH".split("").map((k) => `<button class="btn sm" data-k="${k}">${k}</button>`).join("");
    function draw(hitKey) {
      $("#lruSlots").innerHTML = Array.from({ length: CAP }, (_, i) => list[i] ? `<div class="slot full ${list[i] === hitKey ? "hit" : ""}">${list[i]}</div>` : '<div class="slot">·</div>').join("");
      $("#lruHit").textContent = hits; $("#lruMiss").textContent = miss;
      $("#lruRate").textContent = hits + miss ? Math.round((hits / (hits + miss)) * 100) + "%" : "–";
    }
    $("#lruKeys").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; const k = b.dataset.k;
      const i = list.indexOf(k);
      if (i >= 0) { hits++; list.splice(i, 1); list.unshift(k); $("#lruMsg").textContent = `✅ ${k} was in the cache — hit! Moved to the front.`; draw(k); }
      else { miss++; list.unshift(k); let ev = ""; if (list.length > CAP) ev = list.pop(); $("#lruMsg").textContent = ev ? `❌ miss → loaded ${k}. 👋 Evicted ${ev} (least recently used)` : `❌ miss → loaded ${k} from the DB`; draw(); }
    });
    draw();
  })();

  /* ---------- 4.5 CDN map ---------- */
  (function cdn() {
    const W = 760, H = 380;
    const P = (lat, lon) => ({ x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H });
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "World map with CDN edges" });
    svg.style.minWidth = "560px";
    const land = [
      "40,60 120,40 230,45 290,70 250,110 215,135 175,160 150,185 120,150 80,110 40,90",
      "215,185 260,190 300,225 285,270 255,320 235,330 230,280 210,230",
      "355,60 420,45 450,60 430,95 395,100 365,95",
      "360,125 420,115 460,140 470,190 450,250 425,280 405,250 385,190 355,160",
      "450,45 560,30 700,45 730,80 690,130 650,165 600,180 560,165 520,140 470,110 445,80",
      "640,230 700,225 730,255 710,290 660,290 635,265",
    ];
    land.forEach((pts) => SD.svgEl("polygon", { points: pts, class: "r", "data-fill": "green", "data-gap": 9, "data-sw": 1.6, "data-fw": 1 }, svg));
    const edges = { Virginia: [38, -78], California: [37, -122], "São Paulo": [-23, -46], London: [51, 0], Frankfurt: [50, 8], Johannesburg: [-26, 28], Mumbai: [19, 73], Singapore: [1, 104], Tokyo: [35, 139], Sydney: [-34, 151] };
    const users = { "🗽 New York": [40.7, -74], "🇧🇷 Brazil": [-22.9, -43.2], "🇬🇧 London": [51.5, -0.1], "🇿🇦 South Africa": [-33.9, 18.4], "🇮🇳 India": [28.6, 77.2], "🇯🇵 Japan": [34.7, 135.5], "🇦🇺 Australia": [-37.8, 145] };
    Object.entries(edges).forEach(([n, [la, lo]]) => { const p = P(la, lo); SD.svgEl("circle", { cx: p.x, cy: p.y, r: n === "Virginia" ? 11 : 7, class: "r", "data-fill": n === "Virginia" ? "orange" : "teal", "data-fs": "solid" }, svg); });
    const o = P(38, -78); SD.text(svg, o.x, o.y - 22, "🏠 origin", "s halo");
    const legend = SD.text(svg, 14, H - 16, "● teal = CDN edge   ● orange = origin server", "l xs halo");
    legend.style.opacity = 0.8;
    const top = SD.svgEl("g", {}, svg);
    $("#cdnMap").appendChild(svg); SD.roughify(svg);
    const hav = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r, s = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); };
    const rtt = (km) => Math.round(((2 * km) / 200) * 1.6 + 4);
    $("#cdnChips").innerHTML = Object.keys(users).map((u) => `<button class="chip" data-u="${u}">${u}</button>`).join("");
    let gen = 0;
    async function show(u) {
      const g = ++gen;
      $$("#cdnChips .chip").forEach((b) => b.classList.toggle("on", b.dataset.u === u));
      top.innerHTML = "";
      const ul = users[u], up = P(...ul);
      let best = null, bd = 1e9;
      Object.entries(edges).forEach(([n, c]) => { const d = hav(ul, c); if (d < bd) { bd = d; best = [n, c]; } });
      const od = hav(ul, edges.Virginia), oR = rtt(od), eR = rtt(bd);
      $("#cdnOrigin").textContent = oR + " ms"; $("#cdnEdge").textContent = eR + " ms"; $("#cdnX").textContent = (oR / eR).toFixed(1) + "×";
      SD.svgEl("circle", { cx: up.x, cy: up.y, r: 9, fill: "#f06595", class: "pkt" }, top);
      SD.text(top, up.x, up.y + 22, "🙋 you", "s halo");
      const ep = P(...best[1]);
      const arc = (a, b, k) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * k; return { mx, my, d: `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}` }; };
      const ao = arc(up, o, 0.3), ae = arc(up, ep, 0.3);
      SD.svgEl("path", { d: ao.d, fill: "none", stroke: "#f06595", "stroke-width": 2.5, "stroke-dasharray": "7 7" }, top);
      SD.svgEl("path", { d: ae.d, fill: "none", stroke: "#22b8cf", "stroke-width": 3.5 }, top);
      SD.text(top, ep.x, ep.y + 20, "⚡ " + best[0], "s halo");
      const qp = (a, m, b, t) => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * m.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * m.y + t * t * b.y });
      const d1 = SD.svgEl("circle", { r: 7, fill: "#f06595", class: "pkt" }, top), d2 = SD.svgEl("circle", { r: 7, fill: "#22b8cf", class: "pkt" }, top);
      while (g === gen) {
        const tOrigin = Math.max(900, oR * 9), tEdge = Math.max(250, eR * 9);
        await SD.tween(tOrigin * 2, (k, raw) => {
          if (g !== gen) return;
          const ko = raw < 0.5 ? raw * 2 : 2 - raw * 2; const p1 = qp(up, { x: ao.mx, y: ao.my }, o, ko); d1.setAttribute("cx", p1.x); d1.setAttribute("cy", p1.y);
          const re = ((raw * tOrigin * 2) % (tEdge * 2)) / (tEdge * 2); const ke = re < 0.5 ? re * 2 : 2 - re * 2; const p2 = qp(up, { x: ae.mx, y: ae.my }, ep, ke); d2.setAttribute("cx", p2.x); d2.setAttribute("cy", p2.y);
        }, (t) => t);
        await SD.sleep(400);
      }
    }
    $("#cdnChips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.u); });
    show("🇦🇺 Australia");
  })();

  /* ---------- 4.6 autoscaling ---------- */
  (function auto() {
    const W = 760, H = 300, pl = 44, pr = 16, pt = 20, pb = 36;
    function demand(m) {
      const t = m / 60; let d = 1;
      if (t > 6 && t < 23) d += 8.2 * Math.pow(Math.sin((Math.PI * (t - 6)) / 17), 1.4);
      if (t > 19.5 && t < 20.6) d += 3.5; // flash sale!
      return d + Math.sin(m / 7) * 0.25;
    }
    function draw() {
      const boot = +$("#boot").value, minS = +$("#minS").value;
      $("#bootV").textContent = boot + " min"; $("#minV").textContent = minS;
      let cap = minS, pending = [], low = 0, over = 0, used = 0;
      const caps = [], dem = [];
      for (let m = 0; m < 1440; m++) {
        pending = pending.filter((p) => { if (p <= m) { cap++; return false; } return true; });
        const d = demand(m), want = Math.max(minS, Math.ceil(d * 1.15));
        if (want > cap + pending.length) for (let k = cap + pending.length; k < want; k++) pending.push(m + boot);
        if (want < cap - 1) { if (++low > 30) { cap--; low = 0; } } else low = 0;
        caps.push(cap); dem.push(d); if (d > cap) over++; used += cap / 60;
      }
      const X = (m) => pl + (m / 1440) * (W - pl - pr), Y = (v) => H - pb - (v / 14) * (H - pt - pb);
      const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "Autoscaling chart" });
      SD.svgEl("line", { x1: pl, y1: H - pb, x2: W - pr, y2: H - pb, class: "r" }, svg);
      SD.svgEl("line", { x1: pl, y1: pt, x2: pl, y2: H - pb, class: "r" }, svg);
      [0, 6, 12, 18, 24].forEach((hh) => SD.text(svg, X(hh * 60), H - pb + 18, hh === 12 ? "noon" : hh === 0 || hh === 24 ? "midnight" : hh + ":00", "xs soft"));
      [0, 4, 8, 12].forEach((v) => SD.text(svg, pl - 16, Y(v), v, "xs soft"));
      let red = "";
      for (let m = 0; m < 1440; m++) if (dem[m] > caps[m]) red += `M${X(m)},${Y(caps[m])} L${X(m)},${Y(dem[m])} `;
      SD.svgEl("path", { d: red, stroke: "#ff6b6b", "stroke-width": 1.4, opacity: 0.7 }, svg);
      SD.svgEl("path", { d: "M" + dem.map((d, m) => `${X(m).toFixed(1)},${Y(d).toFixed(1)}`).filter((_, i) => i % 4 === 0).join(" L"), fill: "none", stroke: "#f06595", "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      SD.svgEl("path", { d: "M" + caps.map((c, m) => `${X(m).toFixed(1)},${Y(c).toFixed(1)}`).join(" L"), fill: "none", stroke: "#339af0", "stroke-width": 3 }, svg);
      SD.text(svg, X(20 * 60), Y(13), "🛍️ flash sale!", "s halo");
      SD.text(svg, pl + 10, pt + 4, "— needed (traffic)", "l s").style.fill = "#f06595";
      SD.text(svg, pl + 10, pt + 24, "— servers running", "l s").style.fill = "#339af0";
      SD.text(svg, pl + 10, pt + 44, "| overloaded", "l s").style.fill = "#ff6b6b";
      const host = $("#autoChart"); host.innerHTML = ""; host.appendChild(svg); SD.roughify(svg);
      const peakCost = 24 * Math.max(...caps);
      $("#autoCap").innerHTML = `😓 Overloaded for <b>${over} min</b> today · 💰 used <b>${Math.round(used)}</b> server-hours (vs ${peakCost} if we always ran peak size).`;
    }
    $("#boot").addEventListener("input", draw); $("#minS").addEventListener("input", draw);
    draw();
  })();
})();
