/* Chapter — Cloud & Infrastructure */
(function () {
  const { $, $$, flow } = SD;

  /* ---------- Kubernetes self-healing ---------- */
  (function k8s() {
    const W = 460, H = 270, CAP = 4;
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "Kubernetes cluster with nodes and pods" });
    $("#k8sSvg").appendChild(svg);
    const head = SD.text(svg, W / 2, 20, "", "title");
    const nodes = [0, 1, 2].map((i) => {
      const x = 14 + i * 148, g = SD.svgEl("g", {}, svg);
      SD.svgEl("rect", { x, y: 44, width: 136, height: 210, class: "r", "data-fill": "blue", "data-gap": 10, "data-fw": 1 }, g);
      SD.text(g, x + 68, 62, `🖥️ Node ${i + 1}`, "s halo");
      const dead = SD.svgEl("g", { visibility: "hidden" }, g);
      SD.svgEl("rect", { x: x + 2, y: 46, width: 132, height: 206, fill: "#868e96", opacity: 0.75, rx: 6 }, dead);
      SD.text(dead, x + 68, 150, "💀 down", "lg");
      return { i, x, up: true, pods: [], dead };
    });
    const podLayer = SD.svgEl("g", {}, svg); // pods drawn above the hand-drawn nodes (a dead node has no pods)
    SD.roughify(svg);
    let want = 4, next = 1;
    const log = (t, cls = "info") => { const d = document.createElement("div"); d.className = cls; d.textContent = t; const L = $("#kLog"); L.prepend(d); while (L.children.length > 25) L.lastChild.remove(); };
    const running = () => nodes.reduce((s, n) => s + (n.up ? n.pods.length : 0), 0);
    function draw() {
      podLayer.innerHTML = "";
      nodes.forEach((n) => {
        n.dead.setAttribute("visibility", n.up ? "hidden" : "visible");
        n.pods.forEach((p, k) => {
          const cx = n.x + 38 + (k % 2) * 60, cy = 112 + Math.floor(k / 2) * 78;
          const c = SD.svgEl("circle", { cx, cy, r: 25, fill: p.state === "starting" ? "#ffe066" : "#69db7c", stroke: "currentColor", "stroke-width": 2.5 }, podLayer);
          if (p.state === "starting") c.setAttribute("stroke-dasharray", "6 5");
          SD.text(podLayer, cx, cy - 4, "🫛", "s"); SD.text(podLayer, cx, cy + 13, "pod-" + p.id, "xs").style.fill = "#1f2430";
        });
      });
      head.textContent = `🎯 want ${want} · ✅ running ${running()}`;
    }
    function reconcile() {
      const have = running();
      if (have < want) {
        const free = nodes.filter((n) => n.up && n.pods.length < CAP).sort((a, b) => a.pods.length - b.pods.length)[0];
        if (!free) { log(`⚠️ Want ${want}, have ${have}, but no room on any node! (add a node)`, "bad"); return; }
        const p = { id: next++, state: "starting" }; free.pods.push(p);
        log(`🔁 Want ${want}, have ${have} → starting pod-${p.id} on Node ${free.i + 1}`);
        setTimeout(() => { p.state = "running"; draw(); }, 700);
      } else if (have > want) {
        const n = nodes.filter((x) => x.up && x.pods.length).sort((a, b) => b.pods.length - a.pods.length)[0];
        const p = n.pods.pop(); log(`✂️ Want ${want}, have ${have} → stopping pod-${p.id}`);
      }
      draw();
    }
    setInterval(reconcile, 900);
    $("#kWant").addEventListener("input", (e) => { want = +e.target.value; $("#kWantV").textContent = want; log(`📝 You changed the Deployment: replicas = ${want}`, "ok"); draw(); });
    $("#kKillPod").addEventListener("click", () => {
      const all = nodes.filter((n) => n.up).flatMap((n) => n.pods.map((p) => [n, p]));
      if (!all.length) return;
      const [n, p] = all[Math.floor(Math.random() * all.length)];
      n.pods.splice(n.pods.indexOf(p), 1); log(`💥 pod-${p.id} crashed!`, "bad"); draw();
    });
    $("#kKillNode").addEventListener("click", () => {
      const n = nodes.filter((x) => x.up)[0]; if (!n) return;
      n.up = false; log(`🔥 Node ${n.i + 1} died — lost ${n.pods.length} pod(s)`, "bad"); n.pods = []; draw();
    });
    $("#kFixNode").addEventListener("click", () => { const n = nodes.find((x) => !x.up); if (!n) return; n.up = true; log(`💚 Node ${n.i + 1} is back (empty, ready for pods)`, "ok"); draw(); });
    draw();
  })();

  /* ---------- regions & AZs ---------- */
  flow("#azFlow", {
    w: 640, h: 330, minW: 540,
    groups: [{ x: 120, y: 10, w: 510, h: 310, label: "Region: US-East", c: "blue" },
      { x: 135, y: 115, w: 150, h: 195, label: "Zone A", c: "teal" }, { x: 300, y: 115, w: 150, h: 195, label: "Zone B", c: "teal" }, { x: 465, y: 115, w: 150, h: 195, label: "Zone C", c: "teal" }],
    nodes: [{ id: "u", x: 55, y: 70, w: 80, h: 56, icon: "👥", label: "Users", c: "blue" }, { id: "edge", x: 55, y: 230, w: 86, h: 56, icon: "📍", label: "Edge/CDN", c: "pink", small: 1 },
      { id: "lb", x: 375, y: 62, w: 150, h: 50, label: "🚦 Load balancer", c: "orange", small: 1 },
      { id: "a1", x: 210, y: 170, w: 100, h: 44, label: "🖥️ App", c: "yellow" }, { id: "a2", x: 375, y: 170, w: 100, h: 44, label: "🖥️ App", c: "yellow" }, { id: "a3", x: 540, y: 170, w: 100, h: 44, label: "🖥️ App", c: "yellow" },
      { id: "d1", x: 210, y: 262, w: 100, h: 54, label: "👑 DB", c: "green", shape: "db", small: 1 }, { id: "d2", x: 375, y: 262, w: 100, h: 54, label: "Replica", c: "teal", shape: "db", small: 1 }, { id: "d3", x: 540, y: 262, w: 100, h: 54, label: "Replica", c: "teal", shape: "db", small: 1 }],
    edges: [["u", "lb", "", { flow: 1 }], ["u", "edge", "images", { dash: 1 }], ["lb", "a1", "", { flow: 1 }], ["lb", "a2", "", { flow: 1 }], ["lb", "a3", "", { flow: 1 }], ["d1", "d2", "", { dash: 1 }], ["d2", "d3", "", { dash: 1 }]],
  });

  /* ---------- DNS lookup ---------- */
  const df = flow("#dnsFlow", {
    w: 720, h: 330, minW: 560,
    nodes: [{ id: "b", x: 70, y: 165, w: 110, h: 72, icon: "🧑‍💻", label: "Your browser", c: "blue", small: 1 },
      { id: "r", x: 290, y: 165, w: 140, h: 76, icon: "🔁", label: "Recursive resolver\n(ISP / 1.1.1.1)", c: "purple", small: 1 },
      { id: "root", x: 560, y: 50, w: 140, h: 64, icon: "🌳", label: "Root server “.”", c: "green", small: 1 },
      { id: "tld", x: 620, y: 165, w: 140, h: 64, icon: "🏷️", label: ".com TLD server", c: "orange", small: 1 },
      { id: "auth", x: 560, y: 280, w: 160, h: 64, icon: "🍕", label: "pizza.com's own\nDNS server", c: "pink", small: 1 }],
    edges: [["b", "r"], ["r", "root"], ["r", "tld"], ["r", "auth"]],
  });
  SD.player({
    root: $("#dnsBox"), intro: "Press ▶ to follow a DNS lookup", onReset: () => df.reset(),
    steps: [
      { cap: "Browser &amp; computer check their own caches: “looked up pizza.com lately?” — nope ❌", run: async () => { df.clear().hl("b"); df.pop("b", "cache? ❌", { ms: 1200 }); await SD.sleep(1100); } },
      { cap: "Ask the <b>recursive resolver</b> — it does the hunting for you", run: async () => { df.clear().hl("r"); await df.send("b", "r", { label: "pizza.com?", color: "purple" }); } },
      { cap: "Resolver asks a <b>root server</b>: “who handles .com?”", run: async () => { df.clear().hl("root"); await df.send("r", "root", { label: ".com?", color: "green" }); await df.send("root", "r", { label: "ask the .com servers", color: "green" }); } },
      { cap: "Asks the <b>.com TLD server</b>: “who handles pizza.com?”", run: async () => { df.clear().hl("tld"); await df.send("r", "tld", { label: "pizza.com?", color: "orange" }); await df.send("tld", "r", { label: "ask ns1.pizza.com", color: "orange" }); } },
      { cap: "Asks pizza.com's <b>authoritative server</b> for the A record", run: async () => { df.clear().hl("auth"); await df.send("r", "auth", { label: "A record?", color: "pink" }); await df.send("auth", "r", { label: "93.184.216.34 · TTL 300 s", color: "pink", dur: 1200 }); } },
      { cap: "Resolver <b>caches</b> the answer for 300 s and tells the browser 🎉", run: async () => { df.clear().hl("b"); await df.send("r", "b", { label: "93.184.216.34", color: "yellow" }); } },
      { cap: "Next lookup within the TTL? Answered straight from cache — about 1 ms ⚡", run: async () => { df.clear().hl("r"); await df.send("b", "r", { label: "pizza.com?", color: "purple", dur: 450 }); await df.send("r", "b", { label: "⚡ cached!", color: "green", dur: 450 }); } },
    ],
  });

  /* ---------- HTTP race ---------- */
  (function race() {
    const N = 12;
    ["pf1", "pf2", "pf3"].forEach((id) => ($("#" + id).innerHTML = Array.from({ length: N }, () => '<div class="file"></div>').join("")));
    function plan(loss) {
      const lossFiles = new Set([Math.floor(Math.random() * 6), 6 + Math.floor(Math.random() * 6)]);
      // HTTP/1.1: 6 connections, 2 rounds, each request waits a round trip
      const h1 = Array.from({ length: N }, () => ({ s: 0, e: 0, st: [] }));
      for (let c = 0; c < 6; c++) { let t = 100; for (let k = 0; k < 2; k++) { const f = h1[k * 6 + c]; f.s = t; f.e = t + 290; if (loss && lossFiles.has(k * 6 + c)) { f.st.push([t + 140, t + 290]); f.e += 150; } t = f.e; } }
      // HTTP/2: one connection, all multiplexed; a lost packet stalls EVERY stream
      const h2 = Array.from({ length: N }, (_, i) => ({ s: 150, e: 150 + (i + 1) * 40, st: [] }));
      // HTTP/3: faster handshake; a lost packet stalls only its own stream
      const h3 = Array.from({ length: N }, (_, i) => ({ s: 100, e: 100 + (i + 1) * 40, st: [] }));
      if (loss) [260, 430].forEach((T) => {
        h2.forEach((f) => { if (f.e > T) { f.st.push([T, T + 150]); f.e += 150; } });
        const victim = h3.filter((f) => f.e > T).sort((a, b) => a.e - b.e)[0]; if (victim) { victim.st.push([T, T + 150]); victim.e += 150; }
      });
      return [h1, h2, h3];
    }
    let gen = 0;
    $("#raceBtn").addEventListener("click", async () => {
      const g = ++gen, plans = plan($("#lossBox").checked), total = Math.max(...plans.flat().map((f) => f.e));
      const els = ["pf1", "pf2", "pf3"].map((id) => $$("#" + id + " .file")), times = ["pt1", "pt2", "pt3"].map((id) => $("#" + id));
      times.forEach((t) => (t.textContent = "…"));
      await SD.tween(total * 5, (k, raw) => {
        if (g !== gen) return;
        const t = raw * total;
        plans.forEach((files, p) => {
          files.forEach((f, i) => {
            const stalled = f.st.some(([a, b]) => t >= a && t < b);
            els[p][i].className = "file" + (t >= f.e ? " done" : stalled ? " stall" : t >= f.s ? " go" : "");
          });
          const end = Math.max(...files.map((f) => f.e)); if (t >= end) times[p].textContent = end + " ms";
        });
      }, (x) => x);
      if (g !== gen) return;
      plans.forEach((files, p) => (times[p].textContent = Math.max(...files.map((f) => f.e)) + " ms"));
      const best = plans.map((f) => Math.max(...f.map((x) => x.e))); const w = best.indexOf(Math.min(...best));
      SD.toast(`🏆 HTTP/${["1.1", "2", "3"][w]} wins${$("#lossBox").checked ? " on a bad network" : ""}!`);
    });
  })();

  /* ---------- CI/CD ---------- */
  (function cicd() {
    const names = [["c", "💻", "Commit"], ["b", "🏗️", "Build"], ["t", "🧪", "Tests"], ["i", "📦", "Image"], ["s", "🎭", "Staging"], ["k", "🐤", "Canary 5%"], ["p", "🌍", "Production"]];
    const cols = ["blue", "yellow", "purple", "orange", "teal", "pink", "green"];
    const f = flow("#ciFlow", {
      w: 840, h: 170, minW: 640,
      nodes: names.map(([id, ic, l], i) => ({ id, x: 62 + i * 119, y: 85, w: 98, h: 70, icon: ic, label: l, c: cols[i], small: 1 })),
      edges: names.slice(1).map(([id], i) => [names[i][0], id]),
    });
    const stepsArr = [];
    const go = (a, b, cap, extra) => ({ cap, run: async () => { f.hl(b); await f.send(a, b, { color: "green", dur: 650 }); f.state(b, "good"); if (extra) await extra(); } });
    const OK = [
      { cap: "A developer pushes a commit 💻", run: async () => { f.hl("c"); f.state("c", "good"); await SD.sleep(600); } },
      go("c", "b", "The code is <b>built</b> automatically 🏗️"),
    ];
    const PASS = [
      go("b", "t", "Hundreds of <b>tests</b> run in minutes — all green ✅"),
      go("t", "i", "Packed into a versioned <b>container image</b> 📦"),
      go("i", "s", "Deployed to <b>staging</b> — a copy of production for final checks 🎭"),
      go("s", "k", "<b>Canary</b>: 5% of real users get it. Metrics look healthy 🐤"),
      go("k", "p", "Rolled out to <b>everyone</b>. Many teams do this dozens of times a day! 🎉", async () => SD.confetti(30)),
    ];
    const FAIL = [
      { cap: "Tests run… ❌ 2 tests fail!", run: async () => { f.hl("t"); await f.send("b", "t", { color: "green", dur: 650 }); f.state("t", "bad"); f.pop("t", "❌ 2 failed", { color: "red", ms: 1800 }); await SD.sleep(900); } },
      { cap: "The pipeline <b>stops</b>. The bug never reaches users, and the developer gets a message to fix it 📩", run: async () => { f.state("c", "bad"); f.pop("c", "📩 fix me!", { ms: 1800 }); await SD.sleep(1000); } },
    ];
    const build = () => { stepsArr.length = 0; stepsArr.push(...OK, ...($("#bugBox").checked ? FAIL : PASS)); };
    build();
    const p = SD.player({ root: $("#ciBox"), intro: "Press ▶ to push a commit through the pipeline", onReset: () => f.reset(), steps: stepsArr });
    $("#bugBox").addEventListener("change", () => { build(); p.reset(); });
  })();

  /* ---------- cost estimator ---------- */
  function cost() {
    const srv = +$("#cSrv").value, m = +$("#cModel").value, sto = +$("#cSto").value, egr = +$("#cEgr").value;
    $("#cSrvV").textContent = srv; $("#cStoV").textContent = sto; $("#cEgrV").textContent = egr;
    $("#cModelV").textContent = m === 1 ? "full price" : `${Math.round((1 - m) * 100)}% off`;
    const c1 = srv * 730 * 0.1 * m, c2 = sto * 23, c3 = egr * 80, tot = c1 + c2 + c3;
    const $f = (v) => "$" + (v >= 1000 ? SD.fmtNum(v, 1) : Math.round(v));
    $("#cOut").innerHTML = [["🖥️ compute", c1], ["💾 storage", c2], ["📤 egress", c3], ["🧾 total / month", tot]]
      .map(([k, v]) => `<div class="stat"><span class="v">${$f(v)}</span><span class="k">${k}</span></div>`).join("");
  }
  ["cSrv", "cSto", "cEgr"].forEach((id) => $("#" + id).addEventListener("input", cost));
  $("#cModel").addEventListener("change", cost);
  cost();
})();
