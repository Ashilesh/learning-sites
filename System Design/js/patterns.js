/* Chapter 6 — Advanced Patterns */
(function () {
  const { $, $$, flow } = SD;
  const ink = () => SD.cssVar("--ink"), soft = () => SD.cssVar("--ink-soft");
  const onScreen = (el) => { const o = { v: false }; new IntersectionObserver((es) => (o.v = es[0].isIntersecting)).observe(el); return o; };

  /* ---------- 6.1 sync / async ---------- */
  flow("#syncFlow", { w: 440, h: 150, nodes: [{ id: "y", x: 70, y: 75, w: 90, h: 60, icon: "🙋", label: "You", c: "blue" }, { id: "s", x: 360, y: 75, w: 110, h: 60, icon: "🐢", label: "Slow service", c: "orange", small: 1 }],
    edges: [["y", "s", "request… ⏳ waiting", { bend: 28, flow: 1 }], ["s", "y", "answer (finally)", { bend: 28 }]] });
  flow("#asyncFlow", { w: 440, h: 150, nodes: [{ id: "y", x: 60, y: 75, w: 86, h: 60, icon: "🙋", label: "You", c: "blue" }, { id: "q", x: 220, y: 75, w: 100, h: 56, icon: "📬", label: "Queue", c: "purple" }, { id: "s", x: 380, y: 75, w: 100, h: 60, icon: "🐢", label: "Service", c: "orange" }],
    edges: [["y", "q", "drop msg", { flow: 1 }], ["q", "s", "later", { flow: 1, flowC: "purple", flowDur: 4 }]] });

  /* ---------- 6.2 queue simulation ---------- */
  (function queueSim() {
    const cv = $("#qCv"), st = SD.canvas(cv, null, 0.42, 240, 360);
    let q = [], fly = [], workers = [], done = 0, doneWin = [], now = 0, spawn = 0, dropped = 0;
    const CAP = 1.5, MAXQ = 400;
    function syncWorkers() { const n = +$("#workers").value; $("#wkV").textContent = n; while (workers.length < n) workers.push({ busy: 0, job: null }); workers.length = n; }
    $("#workers").addEventListener("input", syncWorkers); syncWorkers();
    $("#inRate").addEventListener("input", () => ($("#inV").textContent = $("#inRate").value));
    $("#spike").addEventListener("click", () => { for (let i = 0; i < 60; i++) fly.push({ t: -Math.random() * 1.2, y: Math.random() }); });
    SD.loop(cv, (dt) => {
      const { ctx, w, h } = st; now += dt;
      spawn -= dt * +$("#inRate").value;
      while (spawn < 0) { spawn += 1; fly.push({ t: 0, y: Math.random() }); }
      const qx0 = w * 0.25, qx1 = w * 0.66, qy = h / 2, qh = Math.min(70, h * 0.26);
      fly.forEach((f) => { f.t += dt * 2.2; if (f.t >= 1 && !f.in) { f.in = true; if (q.length < MAXQ) q.push({ born: now }); else dropped++; } });
      fly = fly.filter((f) => !f.in);
      workers.forEach((wk) => {
        if (wk.job) { wk.busy -= dt; if (wk.busy <= 0) { wk.job = null; done++; doneWin.push(now); } }
        if (!wk.job && q.length) { wk.job = q.shift(); wk.busy = 1 / CAP; }
      });
      doneWin = doneWin.filter((t) => now - t < 3);
      ctx.clearRect(0, 0, w, h);
      // producers
      ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ["🧑", "👩", "🧔"].forEach((e, i) => ctx.fillText(e, 30, h * (0.25 + i * 0.25)));
      ctx.fillStyle = ink(); ctx.font = SD.font(14); ctx.fillText("orders", 30, h - 14);
      fly.forEach((f) => { if (f.t < 0) return; const x = SD.lerp(50, qx0, f.t), y = SD.lerp(h * (0.2 + f.y * 0.6), qy, f.t); ctx.fillStyle = "#f06595"; ctx.fillRect(x - 5, y - 5, 10, 10); });
      // tube
      ctx.strokeStyle = ink(); ctx.lineWidth = 2.5; ctx.fillStyle = SD.cssVar("--card-2");
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(qx0, qy - qh / 2, qx1 - qx0, qh, 14) : ctx.rect(qx0, qy - qh / 2, qx1 - qx0, qh); ctx.fill(); ctx.stroke();
      const cell = 11, cols = Math.max(1, Math.floor((qx1 - qx0 - 12) / cell)), rows = Math.max(1, Math.floor((qh - 10) / cell)), vis = Math.min(q.length, cols * rows);
      for (let i = 0; i < vis; i++) {
        const c = Math.floor(i / rows), r = i % rows, age = now - q[i].born;
        ctx.fillStyle = `hsl(${Math.max(0, 50 - age * 6)} 90% 60%)`;
        ctx.fillRect(qx1 - 8 - (c + 1) * cell, qy - qh / 2 + 5 + r * cell, cell - 2, cell - 2);
      }
      ctx.fillStyle = ink(); ctx.font = SD.font(15); ctx.fillText(`📬 queue: ${q.length} waiting${q.length > vis ? " (+" + (q.length - vis) + " more)" : ""}`, (qx0 + qx1) / 2, qy - qh / 2 - 14);
      ctx.fillText("← tail          head →", (qx0 + qx1) / 2, qy + qh / 2 + 14);
      // workers
      const wx = w * 0.84, gap = Math.min(42, (h - 20) / workers.length);
      workers.forEach((wk, i) => {
        const y = h / 2 + (i - (workers.length - 1) / 2) * gap;
        ctx.font = Math.min(24, gap * 0.7) + "px serif"; ctx.fillText(wk.job ? "👷" : "😴", wx, y);
        if (wk.job) { ctx.strokeStyle = "#51cf66"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx, y, Math.min(16, gap * 0.45), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - wk.busy * CAP)); ctx.stroke(); }
        ctx.strokeStyle = soft(); ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(qx1, qy); ctx.lineTo(wx - 18, y); ctx.stroke(); ctx.setLineDash([]);
      });
      if (Math.round(now * 10) % 4 === 0) {
        const thr = doneWin.length / Math.min(3, now), wait = thr > 0 ? q.length / thr : 0, inR = +$("#inRate").value, capT = workers.length * CAP;
        $("#qStats").innerHTML = [["📬 in line", q.length], ["✅ done/sec", thr.toFixed(1)], ["⏳ wait", wait > 99 ? "99+ s" : wait.toFixed(1) + " s"], ["🏭 capacity", capT.toFixed(1) + "/s"]]
          .map(([k, v]) => `<div class="stat"><span class="v" style="font-size:1.4rem">${v}</span><span class="k">${k}</span></div>`).join("");
        $("#qCap").textContent = inR > capT ? `😰 ${inR} jobs/s arrive but workers finish only ${capT.toFixed(1)}/s — the line grows forever! Add workers (autoscale on queue length).` : q.length > 20 ? "🔥 A spike! The queue absorbs it and workers catch up — nobody crashed." : "😌 Workers keep up. The queue stays short.";
      }
    }).start();
  })();

  /* ---------- 6.3 queue vs pubsub vs stream ---------- */
  const fq = flow("#fQueue", { w: 320, h: 230, nodes: [{ id: "p", x: 45, y: 115, w: 64, h: 50, label: "📤 P", c: "blue" }, { id: "q", x: 150, y: 115, w: 76, h: 50, label: "📬 Q", c: "purple" },
    { id: "a", x: 270, y: 40, w: 76, h: 44, label: "👷 W1", c: "yellow" }, { id: "b", x: 270, y: 115, w: 76, h: 44, label: "👷 W2", c: "yellow" }, { id: "c", x: 270, y: 190, w: 76, h: 44, label: "👷 W3", c: "yellow" }],
    edges: [["p", "q"], ["q", "a"], ["q", "b"], ["q", "c"]] });
  const fp = flow("#fPubsub", { w: 320, h: 230, nodes: [{ id: "p", x: 45, y: 115, w: 64, h: 50, label: "📤 P", c: "blue" }, { id: "t", x: 150, y: 115, w: 76, h: 50, label: "📢 Topic", c: "pink" },
    { id: "a", x: 268, y: 40, w: 84, h: 44, label: "📧 Email", c: "green" }, { id: "b", x: 268, y: 115, w: 84, h: 44, label: "📊 Stats", c: "teal" }, { id: "c", x: 268, y: 190, w: 84, h: 44, label: "🔔 Push", c: "orange" }],
    edges: [["p", "t"], ["t", "a"], ["t", "b"], ["t", "c"]] });
  const visQ = onScreen($("#fQueue"));
  (async function loopQP() {
    const ws = ["a", "b", "c"]; let i = 0;
    while (true) {
      if (!visQ.v) { await SD.sleep(500); continue; }
      const n = ++i, wk = ws[n % 3];
      await Promise.all([fq.send("p", "q", { label: "#" + n, dur: 600 }), fp.send("p", "t", { label: "#" + n, dur: 600, color: "blue" })]);
      await Promise.all([fq.send("q", wk, { label: "#" + n, dur: 600 }), ...ws.map((k) => fp.send("t", k, { label: "#" + n, dur: 600, color: "blue" }))]);
    }
  })();
  (function stream() {
    const W = 320, H = 230, svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "Event log with consumer offsets" });
    const host = $("#fStream"); host.appendChild(svg);
    const cells = SD.svgEl("g", {}, svg), ptr = SD.svgEl("g", {}, svg);
    SD.text(svg, 10, 24, "partition 0 → (append only)", "l s");
    const N = 9, cw = 32, x0 = 14, y0 = 60;
    const colors = ["#f06595", "#339af0", "#51cf66", "#ff922b", "#9775fa", "#22b8cf", "#fcc419", "#ff6b6b", "#adb5bd"];
    let len = 0, a = 0, b = 0, tick = 0;
    const vis = onScreen(host);
    function draw() {
      cells.innerHTML = ""; ptr.innerHTML = "";
      for (let i = 0; i < len; i++) {
        SD.svgEl("rect", { x: x0 + i * cw, y: y0, width: cw - 4, height: 40, fill: colors[i], stroke: "currentColor", "stroke-width": 2, rx: 4 }, cells);
        SD.text(cells, x0 + i * cw + (cw - 4) / 2, y0 + 20, i, "s").style.fill = "#1f2430";
      }
      const pt = (off, y, label, col) => { const x = x0 + off * cw + (cw - 4) / 2; SD.svgEl("path", { d: `M${x},${y0 + 46} L${x - 7},${y} L${x + 7},${y} Z`, fill: col, stroke: "currentColor", "stroke-width": 1.5 }, ptr); SD.text(ptr, x, y + 14, label, "xs halo"); };
      pt(Math.min(a, Math.max(0, len - 1)), y0 + 66, "🐇 A @" + a, "#51cf66");
      pt(Math.min(b, Math.max(0, len - 1)), y0 + 110, "🐢 B @" + b, "#ff922b");
      SD.text(ptr, W / 2, H - 12, "each reader keeps its own bookmark", "xs soft");
    }
    draw();
    setInterval(() => {
      if (!vis.v) return;
      tick++;
      if (len < N) len++; else if (a >= N && b >= N) { len = 1; a = 0; b = 0; }
      if (a < len) a++;
      if (tick % 3 === 0 && b < len) b++;
      draw();
    }, 800);
  })();

  /* ---------- 6.4 idempotency ---------- */
  (function idem() {
    const seen = new Set(); let busy = false;
    $("#payReset").addEventListener("click", () => { seen.clear(); $("#charges").innerHTML = ""; $("#payMsg").textContent = ""; });
    $("#payBtn").addEventListener("click", async () => {
      if (busy) return; busy = true;
      const useKey = $("#useKey").checked, key = "pay-" + Math.random().toString(36).slice(2, 8);
      for (let attempt = 1; attempt <= 3; attempt++) {
        $("#payMsg").textContent = `📡 Attempt ${attempt}${useKey ? ` (key ${key})` : ""}…`;
        await SD.sleep(650);
        if (useKey && seen.has(key)) { $("#payMsg").textContent = `🛡️ Server: “I've seen ${key} already — returning the same receipt, no new charge.”`; }
        else { seen.add(key); const c = document.createElement("span"); c.className = "charge"; c.textContent = "−$10"; $("#charges").appendChild(c); }
        await SD.sleep(500);
        if (attempt < 3) { $("#payMsg").textContent = "📵 Response lost in the network! The app retries…"; await SD.sleep(700); }
      }
      const n = $("#charges").children.length;
      $("#payMsg").innerHTML = useKey ? `✅ Charged once, even with 3 tries. That's idempotency!` : `😱 Charged ${n}× for one purchase! Turn on the idempotency key and try again.`;
      busy = false;
    });
  })();

  /* ---------- 6.5 monolith / microservices ---------- */
  flow("#monoFlow", {
    w: 440, h: 270, groups: [{ x: 110, y: 18, w: 220, h: 160, label: "🏰 one app, one deploy", c: "orange" }],
    nodes: [{ id: "u", x: 50, y: 98, w: 70, h: 50, label: "👥", c: "blue" },
      { id: "m1", x: 170, y: 72, w: 90, h: 38, label: "Users", c: "yellow", small: 1 }, { id: "m2", x: 275, y: 72, w: 90, h: 38, label: "Orders", c: "yellow", small: 1 },
      { id: "m3", x: 170, y: 140, w: 90, h: 38, label: "Payments", c: "yellow", small: 1 }, { id: "m4", x: 275, y: 140, w: 90, h: 38, label: "Search", c: "yellow", small: 1 },
      { id: "db", x: 220, y: 230, w: 130, h: 60, label: "🗄️ one DB", c: "green", shape: "db" }],
    edges: [["u", "m1", "", { flow: 1 }], ["m3", "db"], ["m4", "db"]],
  });
  flow("#microFlow", {
    w: 440, h: 270,
    nodes: [{ id: "g", x: 50, y: 135, w: 76, h: 56, label: "🚪 API\ngateway", c: "orange", small: 1 },
      { id: "s1", x: 190, y: 40, w: 90, h: 40, label: "Users", c: "yellow", small: 1 }, { id: "s2", x: 190, y: 105, w: 90, h: 40, label: "Orders", c: "yellow", small: 1 },
      { id: "s3", x: 190, y: 170, w: 90, h: 40, label: "Payments", c: "yellow", small: 1 }, { id: "s4", x: 190, y: 235, w: 90, h: 40, label: "Search", c: "yellow", small: 1 },
      { id: "d1", x: 340, y: 40, w: 62, h: 40, label: "🗄️", c: "green", shape: "db" }, { id: "d2", x: 340, y: 105, w: 62, h: 40, label: "🗄️", c: "green", shape: "db" },
      { id: "d3", x: 340, y: 170, w: 62, h: 40, label: "🗄️", c: "green", shape: "db" }, { id: "d4", x: 340, y: 235, w: 62, h: 40, label: "🔎", c: "teal", shape: "db" }],
    edges: [["g", "s1", "", { flow: 1 }], ["g", "s2", "", { flow: 1 }], ["g", "s3"], ["g", "s4"], ["s1", "d1"], ["s2", "d2"], ["s3", "d3"], ["s4", "d4"], ["s2", "s3", "event", { dash: 1, bend: -30 }]],
  });
  flow("#meshFlow", {
    w: 760, h: 250, minW: 560,
    groups: [{ x: 250, y: 40, w: 180, h: 110, label: "pod A", c: "yellow" }, { x: 520, y: 40, w: 180, h: 110, label: "pod B", c: "yellow" }],
    nodes: [{ id: "c", x: 60, y: 95, w: 90, h: 56, icon: "📱", label: "Client", c: "blue" }, { id: "g", x: 175, y: 95, w: 90, h: 56, icon: "🚪", label: "Gateway", c: "orange", small: 1 },
      { id: "a", x: 300, y: 100, w: 80, h: 48, label: "Svc A", c: "yellow" }, { id: "pa", x: 390, y: 100, w: 64, h: 44, label: "🛵 proxy", c: "pink", small: 1 },
      { id: "pb", x: 560, y: 100, w: 64, h: 44, label: "🛵 proxy", c: "pink", small: 1 }, { id: "b", x: 650, y: 100, w: 80, h: 48, label: "Svc B", c: "yellow" },
      { id: "r", x: 475, y: 210, w: 160, h: 50, icon: "", label: "🧭 Service registry", c: "purple", small: 1 }],
    edges: [["c", "g", "", { flow: 1 }], ["g", "a", "", { flow: 1 }], ["a", "pa"], ["pa", "pb", "mTLS + retries", { flow: 1 }], ["pb", "b"], ["pa", "r", "where is B?", { dash: 1 }], ["pb", "r", "I'm here!", { dash: 1 }]],
  });

  /* ---------- 6.6 Raft ---------- */
  (function raft() {
    const S = 400, cx = 200, cy = 175, R = 120;
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${S} 350`, class: "sketch", role: "img", "aria-label": "Raft leader election" });
    $("#raftSvg").appendChild(svg);
    const gl = SD.svgEl("g", {}, svg), gp = SD.svgEl("g", {}, svg), gn = SD.svgEl("g", {}, svg);
    const nodes = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      const g = SD.svgEl("g", {}, gn);
      const arc = SD.svgEl("path", { fill: "none", stroke: "#ff922b", "stroke-width": 4, "stroke-linecap": "round" }, g);
      const c = SD.svgEl("circle", { cx: x, cy: y, r: 32, stroke: "currentColor", "stroke-width": 2.5 }, g);
      const em = SD.text(g, x, y - 6, "🙂", "lg"); const lb = SD.text(g, x, y + 16, "S" + (i + 1), "xs");
      lb.style.fill = "#1f2430";
      return { i, x, y, g, c, em, lb, arc, role: "follower", term: 1, alive: true, el: 0, to: 2.5 + Math.random() * 2, voted: {}, votes: 0 };
    });
    nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i) SD.svgEl("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "currentColor", "stroke-width": 1, opacity: 0.18 }, gl); }));
    const termTxt = SD.text(svg, cx, cy, "term 1", "title");
    let pk = [], hbT = 0, leader = nodes[0];
    leader.role = "leader";
    const cap = (t) => ($("#raftCap").innerHTML = t);
    function send(from, to, type, term) { pk.push({ from, to, type, term, t: 0, el: SD.svgEl("circle", { r: type === "hb" ? 6 : 7, fill: type === "hb" ? "#f06595" : type === "req" ? "#ff922b" : "#51cf66", stroke: "currentColor", "stroke-width": 1.2 }, gp) }); }
    function becomeLeader(n) { n.role = "leader"; leader = n; nodes.forEach((m) => { if (m !== n && m.role === "candidate" && m.term <= n.term) m.role = "follower"; }); cap(`🎉 S${n.i + 1} won a majority — new leader for term ${n.term}!`); hbT = 0; }
    $("#raftKill").addEventListener("click", () => { const l = nodes.find((n) => n.role === "leader" && n.alive); if (!l) return cap("No leader right now — wait for the election!"); l.alive = false; l.role = "down"; cap(`💥 S${l.i + 1} (leader) crashed! Followers will notice the silence…`); });
    $("#raftRevive").addEventListener("click", () => { nodes.forEach((n) => { if (!n.alive) { n.alive = true; n.role = "follower"; n.el = 0; } }); cap("💚 Crashed servers are back — they'll follow whoever has the newest term."); });
    SD.loop(svg, (dt) => {
      // leader heartbeats
      const L = nodes.find((n) => n.role === "leader" && n.alive);
      if (L) { hbT -= dt; if (hbT <= 0) { hbT = 0.9; nodes.forEach((n) => n !== L && n.alive && send(L, n, "hb", L.term)); } }
      nodes.forEach((n) => {
        if (!n.alive || n.role === "leader") return;
        n.el += dt;
        if (n.el > n.to) { // election timeout → candidate
          n.role = "candidate"; n.term = Math.max(...nodes.map((m) => m.term)) + 1; n.votes = 1; n.voted[n.term] = n.i; n.el = 0; n.to = 2.5 + Math.random() * 2;
          cap(`🙋 S${n.i + 1} timed out → candidate for term ${n.term}: “Vote for me!”`);
          nodes.forEach((m) => m !== n && m.alive && send(n, m, "req", n.term));
        }
      });
      pk.forEach((p) => {
        p.t += dt / 0.55;
        const k = Math.min(1, p.t); p.el.setAttribute("cx", SD.lerp(p.from.x, p.to.x, k)); p.el.setAttribute("cy", SD.lerp(p.from.y, p.to.y, k));
        if (p.t >= 1) {
          const n = p.to; p.el.remove(); p.dead = true;
          if (!n.alive) return;
          if (p.type === "hb") { if (p.term >= n.term) { n.term = p.term; n.role = "follower"; n.el = 0; } }
          else if (p.type === "req") { if (p.term > n.term || (p.term === n.term && n.voted[p.term] === undefined)) { n.term = p.term; if (n.role !== "leader") n.role = "follower"; if (n.voted[p.term] === undefined) { n.voted[p.term] = p.from.i; n.el = 0; send(n, p.from, "vote", p.term); } } }
          else if (p.type === "vote") { if (n.role === "candidate" && p.term === n.term) { n.votes++; if (n.votes >= 3) becomeLeader(n); } }
        }
      });
      pk = pk.filter((p) => !p.dead);
      // draw
      const maxT = Math.max(...nodes.map((n) => n.term)); termTxt.textContent = "term " + maxT;
      nodes.forEach((n) => {
        const col = !n.alive ? "#868e96" : n.role === "leader" ? "#fcc419" : n.role === "candidate" ? "#ffa94d" : "#a5d8ff";
        n.c.setAttribute("fill", col);
        n.em.textContent = !n.alive ? "💀" : n.role === "leader" ? "👑" : n.role === "candidate" ? "🙋" : "🙂";
        if (n.alive && n.role !== "leader") {
          const f = Math.min(0.999, n.el / n.to), a0 = -Math.PI / 2, a1 = a0 + f * Math.PI * 2, r = 40;
          n.arc.setAttribute("d", `M${n.x + Math.cos(a0) * r},${n.y + Math.sin(a0) * r} A${r},${r} 0 ${f > 0.5 ? 1 : 0} 1 ${n.x + Math.cos(a1) * r},${n.y + Math.sin(a1) * r}`);
        } else n.arc.setAttribute("d", "");
      });
    }).start();
    SD.text(svg, 200, 338, "💓 heartbeat  🟠 vote request  🟢 vote   (orange ring = election timer)", "xs soft");
  })();

  /* ---------- 6.7 saga ---------- */
  (function saga() {
    const f = flow("#sagaFlow", {
      w: 760, h: 270, minW: 560,
      nodes: [{ id: "o", x: 120, y: 135, w: 150, h: 80, icon: "🎼", label: "Saga orchestrator", c: "purple", small: 1 },
        { id: "fl", x: 520, y: 45, w: 170, h: 54, label: "✈️ Flight service", c: "blue" },
        { id: "ho", x: 520, y: 135, w: 170, h: 54, label: "🏨 Hotel service", c: "pink" },
        { id: "ca", x: 520, y: 225, w: 170, h: 54, label: "🚗 Car service", c: "orange" }],
      edges: [["o", "fl"], ["o", "ho"], ["o", "ca"]],
    });
    const steps = [];
    const OK = [
      { cap: "Step 1: book the <b>flight</b> ✈️", run: async () => { await f.send("o", "fl", { label: "book", color: "purple" }); await f.send("fl", "o", { label: "✅ booked", color: "green" }); f.state("fl", "good"); } },
      { cap: "Step 2: book the <b>hotel</b> 🏨", run: async () => { await f.send("o", "ho", { label: "book", color: "purple" }); await f.send("ho", "o", { label: "✅ booked", color: "green" }); f.state("ho", "good"); } },
    ];
    const FAIL = [
      { cap: "Step 3: book the <b>car</b>… ❌ no cars left!", run: async () => { await f.send("o", "ca", { label: "book", color: "purple" }); f.state("ca", "bad"); await f.send("ca", "o", { label: "❌ failed", color: "red" }); } },
      { cap: "Compensate: <b>cancel the hotel</b> ↩️", run: async () => { await f.send("o", "ho", { label: "↩️ cancel", color: "orange" }); f.state("ho", "good", false); f.pop("ho", "cancelled", { color: "orange" }); } },
      { cap: "Compensate: <b>refund the flight</b> ↩️", run: async () => { await f.send("o", "fl", { label: "↩️ refund", color: "orange" }); f.state("fl", "good", false); f.pop("fl", "refunded", { color: "orange" }); } },
      { cap: "Everything is undone cleanly — the customer gets a polite “sorry, no cars” 🙏", run: async () => { f.hl("o"); await SD.sleep(900); } },
    ];
    const WIN = [
      { cap: "Step 3: book the <b>car</b> 🚗", run: async () => { await f.send("o", "ca", { label: "book", color: "purple" }); await f.send("ca", "o", { label: "✅ booked", color: "green" }); f.state("ca", "good"); } },
      { cap: "All three succeeded — trip confirmed! 🎉", run: async () => { f.hl("o"); SD.confetti(40); await SD.sleep(900); } },
    ];
    const build = () => { steps.length = 0; steps.push(...OK, ...($("#carFail").checked ? FAIL : WIN)); };
    build();
    const p = SD.player({ root: $("#sagaBox"), intro: "Press ▶ to book a trip with a saga", onReset: () => f.reset(), steps });
    $("#carFail").addEventListener("change", () => { build(); p.reset(); });
  })();

  /* ---------- 6.8 event sourcing / CQRS ---------- */
  (function es() {
    let events = [];
    const bal = () => events.reduce((s, e) => s + e.amt, 0);
    function render(upto) {
      const list = upto == null ? events : events.slice(0, upto);
      $("#events").innerHTML = list.map((e, i) => `<div class="ev ${e.amt > 0 ? "dep" : "wd"}"><span>#${i + 1} ${e.amt > 0 ? "💰 Deposited" : "🛍️ Withdrew"} $${Math.abs(e.amt)}</span><span class="muted">${e.time}</span></div>`).join("") || '<p class="muted small mb0">No events yet — the diary is empty.</p>';
      $("#bal").textContent = "$" + list.reduce((s, e) => s + e.amt, 0);
    }
    const add = (amt) => { if (bal() + amt < 0) { SD.toast("❌ Rejected: not enough money!"); return; } events.push({ amt, time: new Date().toLocaleTimeString() }); render(); };
    $("#dep").addEventListener("click", () => add(20)); $("#wd").addEventListener("click", () => add(-10));
    $("#replay").addEventListener("click", async () => { for (let i = 0; i <= events.length; i++) { render(i); await SD.sleep(400); } });
    render();
    flow("#cqrsFlow", {
      w: 460, h: 250,
      nodes: [{ id: "u", x: 50, y: 125, w: 70, h: 56, label: "🧑", c: "blue" },
        { id: "cmd", x: 165, y: 55, w: 104, h: 52, label: "✍️ Commands", c: "pink", small: 1 }, { id: "q", x: 165, y: 195, w: 104, h: 52, label: "👀 Queries", c: "teal", small: 1 },
        { id: "w", x: 315, y: 55, w: 100, h: 58, label: "Write DB\n(events)", c: "yellow", shape: "db", small: 1 },
        { id: "r", x: 315, y: 195, w: 100, h: 58, label: "Read views", c: "green", shape: "db", small: 1 },
        { id: "bus", x: 420, y: 125, w: 70, h: 46, label: "📢 bus", c: "purple", small: 1 }],
      edges: [["u", "cmd", "", { flow: 1 }], ["cmd", "w"], ["w", "bus", "", { flow: 1, flowC: "purple" }], ["bus", "r", "", { flow: 1, flowC: "purple" }], ["r", "q"], ["q", "u", "", { flow: 1, flowC: "teal" }]],
    });
  })();

  /* ---------- 6.9 bloom filter ---------- */
  (function bloom() {
    const M = 32, K = 3, bits = new Array(M).fill(0), added = new Set();
    $("#bfBits").innerHTML = bits.map((_, i) => `<div class="bit">${i}</div>`).join("");
    const els = $$("#bfBits .bit");
    const idxs = (w) => [...new Set(Array.from({ length: K }, (_, k) => SD.hash(w.toLowerCase(), (k + 1) * 0x9e3779b1) % M))];
    const word = () => $("#bfIn").value.trim();
    const msg = (t) => ($("#bfMsg").innerHTML = t);
    $("#bfAdd").addEventListener("click", async () => {
      const w = word(); if (!w) return msg("Type a word first ✏️");
      const ix = idxs(w); added.add(w.toLowerCase());
      ix.forEach((i) => { bits[i] = 1; els[i].classList.add("on", "ping"); });
      msg(`➕ “${w}” flipped switches ${ix.join(", ")}`);
      $("#bfSet").textContent = "Added: " + [...added].join(", ");
      $("#bfIn").value = ""; await SD.sleep(700); ix.forEach((i) => els[i].classList.remove("ping"));
    });
    $("#bfCheck").addEventListener("click", async () => {
      const w = word(); if (!w) return msg("Type a word to check ❓");
      const ix = idxs(w), off = ix.filter((i) => !bits[i]);
      ix.forEach((i) => els[i].classList.add(bits[i] ? "ping" : "miss"));
      if (off.length) msg(`🙅 Switch ${off.join(", ")} is off → “${w}” is <b>definitely NOT</b> in the set.`);
      else if (added.has(w.toLowerCase())) msg(`✅ All switches (${ix.join(", ")}) on → “${w}” is <b>probably</b> in the set (and it is!).`);
      else msg(`😮 All switches (${ix.join(", ")}) are on, but we never added “${w}” — a <b>false positive</b>! Other words flipped them.`);
      await SD.sleep(1200); ix.forEach((i) => els[i].classList.remove("ping", "miss"));
    });
    $("#bfIn").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#bfAdd").click(); });
  })();

  /* ---------- 6.10 snowflake ---------- */
  (function snow() {
    const parts = [["0", "sign", 1, "#dee2e6"], ["timestamp (ms)", "41 bits", 41, "#a5d8ff"], ["machine", "10 bits", 10, "#ffc9de"], ["sequence", "12 bits", 12, "#ffec99"]];
    $("#snowBar").innerHTML = parts.map(([a, b, n, c]) => `<div style="flex:${Math.max(n, 6)};background:${c}">${a}<br>${b}</div>`).join("");
    const EPOCH = 1288834974657n; let lastMs = 0n, seq = 0n;
    $("#snowGen").addEventListener("click", () => {
      const m = BigInt(SD.clamp(+$("#snowM").value || 0, 0, 1023)), out = [];
      for (let i = 0; i < 5; i++) {
        const ms = BigInt(Date.now()) - EPOCH;
        if (ms === lastMs) seq = (seq + 1n) & 4095n; else { seq = 0n; lastMs = ms; }
        const id = (ms << 22n) | (m << 12n) | seq;
        out.push(`<div>❄️ <b>${id}</b> <span class="muted">= time ${ms} · machine ${m} · seq ${seq}</span></div>`);
      }
      $("#snowList").innerHTML = out.join("") + '<p class="small muted mt mb0">Same millisecond → the sequence counts up. IDs sort by time automatically!</p>';
    });
    $("#snowGen").click();
  })();
})();
