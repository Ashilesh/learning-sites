/* Chapter — Distributed Deep Dives */
(function () {
  const { $, $$, flow } = SD;

  /* ---------- race conditions: last seat ---------- */
  (function race() {
    const A = { name: "Ana", icon: "🙋", c: "blue" }, D = { name: "Database", icon: "🗄️", c: "green" }, B = { name: "Bo", icon: "🙋‍♂️", c: "pink" };
    const MODES = {
      none: ["🙈 No protection", "😱 Both got a ticket for ONE seat — overbooked! (check-then-act race)", [
        { f: 0, t: 1, label: "is seat 7 free?" }, { f: 1, t: 0, label: "yes ✅", c: "green" },
        { f: 2, t: 1, label: "is seat 7 free?" }, { f: 1, t: 2, label: "yes ✅", c: "green" },
        { f: 0, t: 1, label: "book seat 7" }, { f: 1, t: 0, label: "booked 🎟️", c: "green" },
        { f: 2, t: 1, label: "book seat 7" }, { f: 1, t: 2, label: "booked 🎟️", c: "red" }]],
      pess: ["🔒 Pessimistic lock", "✅ One ticket sold. Bo waited for the lock, then saw the seat was taken.", [
        { f: 0, t: 1, label: "lock seat 7, check" }, { f: 1, t: 0, label: "free — locked for you 🔒", c: "green" },
        { f: 2, t: 1, label: "lock seat 7, check" }, { f: 1, note: "⏳ Bo waits…", wait: 900 },
        { f: 0, t: 1, label: "book + unlock" }, { f: 1, t: 0, label: "booked 🎟️", c: "green" },
        { f: 1, t: 2, label: "sorry, taken ❌", c: "red" }]],
      opt: ["🔢 Optimistic (versions)", "✅ One ticket sold. Bo's write failed the version check, so he re-reads and sees it's gone.", [
        { f: 0, t: 1, label: "read seat 7" }, { f: 1, t: 0, label: "free (version 1)", c: "green" },
        { f: 2, t: 1, label: "read seat 7" }, { f: 1, t: 2, label: "free (version 1)", c: "green" },
        { f: 0, t: 1, label: "book IF still v1" }, { f: 1, t: 0, label: "✅ booked → v2", c: "green" },
        { f: 2, t: 1, label: "book IF still v1" }, { f: 1, t: 2, label: "❌ conflict (it's v2)", c: "red" }]],
      atomic: ["⚛️ Atomic update", "✅ One ticket sold. A single conditional UPDATE checks and books in one step.", [
        { f: 0, t: 1, label: "UPDATE … WHERE free" }, { f: 1, t: 0, label: "1 row changed ✅", c: "green" },
        { f: 2, t: 1, label: "UPDATE … WHERE free" }, { f: 1, t: 2, label: "0 rows — taken ❌", c: "red" }]],
    };
    let cur = null;
    $("#raceChips").innerHTML = Object.entries(MODES).map(([k, v]) => `<button class="chip" data-k="${k}">${v[0]}</button>`).join("");
    async function show(k) {
      cur && cur.stop();
      $$("#raceChips .chip").forEach((b) => b.classList.toggle("on", b.dataset.k === k));
      $("#raceVerdict").textContent = "";
      cur = SD.seq("#raceSeq", { w: 600, gap: 42, actors: [A, D, B], msgs: MODES[k][2] });
      const me = cur; await me.play(false);
      if (me === cur) $("#raceVerdict").textContent = MODES[k][1];
    }
    $("#raceChips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.k); });
    let shown = false;
    new IntersectionObserver((es) => { if (es[0].isIntersecting && !shown) { shown = true; show("none"); } }).observe($("#raceSeq"));
  })();

  /* ---------- Lamport clocks ---------- */
  (function lamport() {
    const W = 640, H = 250, Y = [60, 130, 200], L = ["A", "B", "C"], COL = ["#339af0", "#f06595", "#51cf66"];
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "Lamport clock timelines" });
    Y.forEach((y, i) => { SD.svgEl("line", { x1: 50, y1: y, x2: W - 15, y2: y, class: "r", "data-sw": 2 }, svg); SD.text(svg, 24, y, "🖥️" + L[i], "s"); });
    SD.text(svg, W - 40, H - 12, "time →", "xs soft");
    const ev = SD.svgEl("g", {}, svg);
    $("#lamSvg").appendChild(svg); SD.roughify(svg);
    const dot = (p, x, n) => { const g = SD.svgEl("g", {}, ev); SD.svgEl("circle", { cx: x, cy: Y[p], r: 15, fill: COL[p], stroke: "currentColor", "stroke-width": 2 }, g); const t = SD.text(g, x, Y[p] + 1, n, "s"); t.style.fill = "#1f2430"; t.style.fontWeight = 700; return g; };
    async function msg(p1, x1, p2, x2, n) {
      SD.svgEl("path", { d: `M${x1},${Y[p1]} L${x2},${Y[p2]}`, stroke: "currentColor", "stroke-width": 2, "stroke-dasharray": "6 5", fill: "none" }, ev);
      SD.text(ev, (x1 + x2) / 2 + 8, (Y[p1] + Y[p2]) / 2 - 6, "✉️ " + n, "xs halo");
      const d = SD.svgEl("circle", { r: 6, fill: "#fcc419", class: "pkt" }, ev);
      await SD.tween(700, (k) => { d.setAttribute("cx", SD.lerp(x1, x2, k)); d.setAttribute("cy", SD.lerp(Y[p1], Y[p2], k)); });
      d.remove();
    }
    SD.player({
      root: $("#lamBox"), intro: "Press ▶ to play the pass-the-number game", onReset: () => (ev.innerHTML = ""),
      steps: [
        { cap: "A does some work: its counter goes 0 → <b>1</b>", run: async () => { dot(0, 100, 1); await SD.sleep(600); } },
        { cap: "A sends a note stamped <b>2</b>. B receives: max(0, 2) + 1 = <b>3</b>", run: async () => { dot(0, 170, 2); await msg(0, 170, 1, 240, 2); dot(1, 240, 3); } },
        { cap: "Meanwhile C works on its own: <b>1</b>. (A's and C's work are <i>concurrent</i>)", run: async () => { dot(2, 170, 1); await SD.sleep(600); } },
        { cap: "B does more work: <b>4</b>", run: async () => { dot(1, 310, 4); await SD.sleep(600); } },
        { cap: "B sends <b>5</b> to C. C jumps: max(1, 5) + 1 = <b>6</b>", run: async () => { dot(1, 380, 5); await msg(1, 380, 2, 450, 5); dot(2, 450, 6); } },
        { cap: "C sends <b>7</b> to A. A jumps from 2 to max(2, 7) + 1 = <b>8</b>. Every effect has a bigger number than its cause ✅", run: async () => { dot(2, 520, 7); await msg(2, 520, 0, 590, 7); dot(0, 590, 8); } },
      ],
    });
  })();

  /* ---------- gossip ---------- */
  (function gossip() {
    const W = 460, H = 330, N = 48;
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "Gossip spreading between servers" });
    $("#gossipSvg").appendChild(svg);
    const lines = SD.svgEl("g", {}, svg), dots = SD.svgEl("g", {}, svg);
    let s = 3; const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const P = Array.from({ length: N }, (_, i) => ({ x: 40 + (i % 8) * 54 + (r() - 0.5) * 18, y: 36 + Math.floor(i / 8) * 52 + (r() - 0.5) * 16 }));
    const C = P.map((p) => SD.svgEl("circle", { cx: p.x, cy: p.y, r: 13, fill: "#dee2e6", stroke: "currentColor", "stroke-width": 2 }, dots));
    let known = new Set(), round = 0, timer = 0, hist = [];
    const paint = () => C.forEach((c, i) => c.setAttribute("fill", known.has(i) ? "#fcc419" : "#dee2e6"));
    function step() {
      round++; const fan = +$("#fan").value, add = [];
      known.forEach((i) => { for (let k = 0; k < fan; k++) { const j = Math.floor(Math.random() * N); add.push([i, j]); } });
      add.forEach(([i, j]) => { const l = SD.svgEl("line", { x1: P[i].x, y1: P[i].y, x2: P[j].x, y2: P[j].y, stroke: "#f06595", "stroke-width": 2, opacity: 0.8 }, lines); setTimeout(() => l.remove(), 550); known.add(j); });
      hist.push(known.size); paint();
      $("#gossipMsg").innerHTML = `Round <b>${round}</b>: <b>${known.size}/${N}</b> servers know · history: ${hist.join(" → ")}`;
      if (known.size >= N) { clearInterval(timer); $("#gossipMsg").innerHTML += ` 🎉 Everyone knows after ${round} rounds!`; }
    }
    $("#fan").addEventListener("input", () => ($("#fanV").textContent = $("#fan").value));
    $("#gossipGo").addEventListener("click", () => {
      clearInterval(timer); known = new Set([Math.floor(Math.random() * N)]); round = 0; hist = [1]; paint();
      $("#gossipMsg").textContent = "Round 0: one server heard the news… 🤫";
      timer = setInterval(step, 750);
    });
    paint();
  })();

  /* ---------- fencing tokens ---------- */
  const ff = flow("#fenceFlow", {
    w: 700, h: 320, minW: 560,
    nodes: [{ id: "lock", x: 350, y: 55, w: 160, h: 64, icon: "🔐", label: "Lock service", c: "purple", small: 1 },
      { id: "w1", x: 100, y: 170, w: 120, h: 70, icon: "🤖", label: "Worker 1", c: "yellow" },
      { id: "w2", x: 600, y: 170, w: 120, h: 70, icon: "🤖", label: "Worker 2", c: "orange" },
      { id: "st", x: 350, y: 270, w: 150, h: 70, label: "🗄️ Storage\nlast token: –", c: "green", shape: "db", small: 1 }],
    edges: [["w1", "lock"], ["w2", "lock"], ["w1", "st"], ["w2", "st"]],
  });
  SD.player({
    root: $("#fenceBox"), intro: "Press ▶ to see why locks need fencing tokens",
    onReset: () => { ff.reset(); ff.setLabel("st", "last token: –", 1); },
    steps: [
      { cap: "Worker 1 gets the lock with a 10-second lease and <b>token 33</b>", run: async () => { ff.clear().hl("w1"); await ff.send("w1", "lock", { label: "lock please", color: "purple" }); await ff.send("lock", "w1", { label: "✅ token 33", color: "purple" }); } },
      { cap: "Worker 1 suddenly <b>freezes</b> (a long garbage-collection pause or network hiccup) 😴", run: async () => { ff.state("w1", "bad"); ff.pop("w1", "😴 zzz…", { ms: 1800 }); await SD.sleep(1200); } },
      { cap: "The lease <b>expires</b> ⏰, so the lock goes to Worker 2 with <b>token 34</b>", run: async () => { ff.pop("lock", "⏰ lease expired", { ms: 1500 }); await ff.send("w2", "lock", { label: "lock please", color: "purple" }); await ff.send("lock", "w2", { label: "✅ token 34", color: "purple" }); } },
      { cap: "Worker 2 writes with token 34 — storage accepts and remembers 34", run: async () => { ff.clear("hl").hl("st"); await ff.send("w2", "st", { label: "write #34", color: "orange" }); ff.setLabel("st", "last token: 34", 1); ff.state("st", "good"); } },
      { cap: "Worker 1 wakes up, <i>still thinks</i> it holds the lock, writes with token 33… <b>rejected</b>: 33 &lt; 34 ❌", run: async () => { ff.state("w1", "bad", false); await ff.send("w1", "st", { label: "write #33", color: "yellow" }); ff.pop("st", "❌ 33 is stale", { color: "red", ms: 1800 }); await SD.sleep(1000); } },
      { cap: "Without the token, Worker 1's stale write would have silently <b>corrupted</b> data 💥. Tokens make old lock-holders harmless.", run: async () => { ff.hl("st"); await SD.sleep(900); } },
    ],
  });

  /* ---------- outbox ---------- */
  (function outbox() {
    const of = flow("#obFlow", {
      w: 760, h: 300, minW: 600,
      nodes: [{ id: "svc", x: 90, y: 140, w: 130, h: 70, icon: "🛒", label: "Order service", c: "yellow", small: 1 },
        { id: "db", x: 320, y: 60, w: 170, h: 80, label: "🗄️ Orders DB\n(+ outbox table)", c: "green", shape: "db", small: 1 },
        { id: "relay", x: 320, y: 240, w: 160, h: 60, icon: "🚚", label: "Relay / CDC", c: "teal", small: 1 },
        { id: "br", x: 530, y: 150, w: 120, h: 64, icon: "📢", label: "Broker", c: "purple" },
        { id: "em", x: 690, y: 150, w: 120, h: 76, icon: "📦", label: "Warehouse\n& email", c: "pink", small: 1 }],
      edges: [["svc", "db"], ["svc", "br", "publish", { dash: 1 }], ["db", "relay", "", { dash: 1 }], ["relay", "br"], ["br", "em"]],
    });
    const steps = [];
    const BAD = [
      { cap: "The order service saves the order in the database ✅", run: async () => { await of.send("svc", "db", { label: "INSERT order", color: "green" }); of.state("db", "good"); } },
      { cap: "Next it tries to publish “OrderPlaced” to the broker… 💥 <b>crash!</b>", run: async () => { of.state("svc", "bad"); of.pop("svc", "💥 crash!", { color: "red", ms: 1800 }); await SD.sleep(1200); } },
      { cap: "The event is <b>never sent</b>: nothing ships, no email. The database and the events now disagree 😱", run: async () => { of.state("em", "bad"); of.pop("em", "🤷 what order?", { ms: 1800 }); await SD.sleep(1200); } },
      { cap: "Publishing first doesn't help — then you can announce an order that was never saved. This is the <b>dual-write problem</b>.", run: async () => { await SD.sleep(900); } },
    ];
    const GOOD = [
      { cap: "In <b>one transaction</b>: save the order AND an “OrderPlaced” row in the outbox table ✅", run: async () => { await of.send("svc", "db", { label: "order + outbox row", color: "green" }); of.state("db", "good"); } },
      { cap: "💥 Even if the service crashes now, the event is safely stored in the database", run: async () => { of.state("svc", "bad"); of.pop("svc", "💥 crash!", { color: "red", ms: 1500 }); await SD.sleep(1000); } },
      { cap: "A relay (or CDC reading the database's change log) finds the new outbox row", run: async () => { await of.send("db", "relay", { label: "new row!", color: "teal" }); } },
      { cap: "…and publishes it to the broker", run: async () => { await of.send("relay", "br", { label: "OrderPlaced", color: "purple" }); } },
      { cap: "Consumers get the event (maybe twice — they skip duplicate IDs). Everything stays in sync ✅", run: async () => { await of.send("br", "em", { label: "OrderPlaced", color: "purple" }); of.state("em", "good"); } },
    ];
    const reset = () => { of.reset(); const on = $("#obMode").checked; of.state("relay", "down", !on); of.edgeState("svc", "br", "faint", on); };
    const build = () => { steps.length = 0; steps.push(...($("#obMode").checked ? GOOD : BAD)); };
    build();
    const p = SD.player({ root: $("#obBox"), intro: "Press ▶ to save an order", onReset: reset, steps });
    $("#obMode").addEventListener("change", () => { build(); p.reset(); });
    reset();
  })();

  /* ---------- CRDT counter ---------- */
  (function crdt() {
    let lww, vec, clock, total, synced;
    const init = () => { lww = { phone: { v: 0, ts: 0 }, laptop: { v: 0, ts: 0 } }; vec = { phone: { phone: 0, laptop: 0 }, laptop: { phone: 0, laptop: 0 } }; clock = 0; total = 0; synced = false; };
    const sum = (o) => o.phone + o.laptop;
    function paint(msg) {
      $("#dPhone").textContent = sum(vec.phone); $("#dLap").textContent = sum(vec.laptop);
      $("#dPhoneS").textContent = `(last-write-wins copy says ${lww.phone.v})`; $("#dLapS").textContent = `(last-write-wins copy says ${lww.laptop.v})`;
      $("#crdtOut").innerHTML = synced
        ? [["✅ real likes", total], ["🙈 last-write-wins", lww.phone.v], ["🤝 CRDT", sum(vec.phone)]].map(([k, v]) => `<div class="stat"><span class="v">${v}</span><span class="k">${k}</span></div>`).join("") + `<p class="center mb0" style="grid-column:1/-1">${msg || ""}</p>`
        : `<p class="center muted mb0" style="grid-column:1/-1">Devices are offline 📴 — tap ❤️ on both, then Sync.</p>`;
    }
    $$("[data-inc]").forEach((b) => b.addEventListener("click", () => {
      const d = b.dataset.inc; synced = false; total++;
      lww[d].v += 1; lww[d].ts = ++clock; vec[d][d] += 1; paint();
    }));
    $("#crdtSync").addEventListener("click", () => {
      const win = lww.phone.ts >= lww.laptop.ts ? lww.phone : lww.laptop;
      lww.phone = { ...win }; lww.laptop = { ...win };
      const m = { phone: Math.max(vec.phone.phone, vec.laptop.phone), laptop: Math.max(vec.phone.laptop, vec.laptop.laptop) };
      vec.phone = { ...m }; vec.laptop = { ...m }; synced = true;
      const lost = total - win.v;
      paint(lost > 0 ? `😬 Last-write-wins threw away ${lost} like${lost > 1 ? "s" : ""}. The CRDT kept them all!` : "Tap ❤️ on <b>both</b> devices before syncing to see the difference.");
    });
    $("#crdtReset").addEventListener("click", () => { init(); paint(); });
    init(); paint();
  })();

  /* ---------- HyperLogLog ---------- */
  (function hll() {
    const label = () => { const n = Math.round(Math.pow(10, +$("#hllN").value)); $("#hllV").textContent = SD.fmtNum(n); return n; };
    $("#hllN").addEventListener("input", label); label();
    $("#hllGo").addEventListener("click", () => {
      const N = label(); $("#hllOut").innerHTML = '<p class="center mb0">🎲 counting…</p>';
      setTimeout(() => {
        const m = 1024, reg = new Uint8Array(m), seed = Math.floor(Math.random() * 1e9), t0 = performance.now();
        for (let i = 0; i < N; i++) {
          const h = SD.hash("v" + i, seed), idx = h & 1023, w = h >>> 10;
          const rho = w === 0 ? 23 : Math.clz32(w) - 10 + 1;
          if (rho > reg[idx]) reg[idx] = rho;
        }
        let z = 0, zeros = 0; for (let j = 0; j < m; j++) { z += Math.pow(2, -reg[j]); if (!reg[j]) zeros++; }
        let E = ((0.7213 / (1 + 1.079 / m)) * m * m) / z;
        if (E <= 2.5 * m && zeros) E = m * Math.log(m / zeros);
        const err = ((E - N) / N) * 100, ms = Math.round(performance.now() - t0);
        $("#hllOut").innerHTML = [["✅ real uniques", SD.fmtNum(N)], ["🎲 HLL estimate", SD.fmtNum(E)], ["🎯 error", (err >= 0 ? "+" : "") + err.toFixed(1) + "%"], ["🧠 HLL memory", "768 B"], ["💾 exact set needs", SD.fmtBytes(N * 16)], ["⏱️ took", ms + " ms"]]
          .map(([k, v]) => `<div class="stat"><span class="v">${v}</span><span class="k">${k}</span></div>`).join("");
      }, 30);
    });
  })();
})();
