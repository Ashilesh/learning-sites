/* Chapter 5 — Data Land */
(function () {
  const { $, $$, flow } = SD;

  /* ---------- DB zoo ---------- */
  const types = [
    ["📊", "Relational (SQL)", "Tables + JOINs + transactions.", "Orders, payments, users", "PostgreSQL, MySQL"],
    ["🔑", "Key-value", "A giant coat-check: ticket → coat. Blazing fast lookups.", "Sessions, carts, caches, counters", "Redis, DynamoDB, etcd"],
    ["📄", "Document", "JSON-like documents with flexible shapes.", "Profiles, catalogs, content", "MongoDB, Firestore, Couchbase"],
    ["🧱", "Wide-column", "Huge tables spread over many machines, great for write floods.", "Chat history, IoT, activity logs", "Cassandra, ScyllaDB, Bigtable"],
    ["🕸️", "Graph", "Things + relationships between them.", "Friends-of-friends, fraud rings, recommendations", "Neo4j, Neptune"],
    ["⏲️", "Time-series", "Values stamped with time, squeezed small.", "Metrics, sensors, stock prices", "InfluxDB, TimescaleDB, Prometheus"],
    ["🔎", "Search engine", "Inverted index: word → documents.", "Search boxes, log search, autocomplete", "Elasticsearch, OpenSearch"],
    ["🧭", "Vector", "Finds things that are <i>similar</i> (by meaning).", "AI search, recommendations, RAG", "pgvector, Pinecone, Milvus"],
    ["🪣", "Object / blob", "Files of any size, cheap and durable.", "Photos, videos, backups", "Amazon S3, GCS, Azure Blob"],
    ["🏭", "Columnar warehouse", "Scans billions of rows for one column fast.", "Analytics, dashboards, reports", "BigQuery, Snowflake, ClickHouse"],
  ];
  $("#dbTypes").innerHTML = types.map(([e, n, d, use, ex], i) => `<div class="card ${i % 3 === 0 ? "tilt-l" : i % 3 === 2 ? "tilt-r" : ""}"><div class="emoji-xl">${e}</div><h3>${n}</h3><p>${d}</p><p class="small mb0"><b>Great for:</b> ${use}<br><span class="muted">e.g. ${ex}</span></p></div>`).join("");

  /* ---------- index race ---------- */
  (function idx() {
    const N = 64;
    let nums = [], gen = 0;
    function setup() {
      const s = new Set(); while (s.size < N) s.add(1 + Math.floor(Math.random() * 999));
      nums = [...s];
      $("#scanBooks").innerHTML = nums.map((n) => `<div class="book">${n}</div>`).join("");
      $("#idxBooks").innerHTML = nums.slice().sort((a, b) => a - b).map((n) => `<div class="book">${n}</div>`).join("");
      $("#scanN").textContent = 0; $("#idxN").textContent = 0;
    }
    setup();
    $("#findBtn").addEventListener("click", async () => {
      const g = ++gen; setup();
      const target = nums[Math.floor(N * 0.55 + Math.random() * N * 0.45)];
      $("#findTarget").textContent = `Looking for book #${target}…`;
      const sb = $$("#scanBooks .book"), ib = $$("#idxBooks .book"), sorted = nums.slice().sort((a, b) => a - b);
      const scan = (async () => {
        for (let i = 0; i < N; i++) {
          if (g !== gen) return;
          sb[i].classList.add("look"); $("#scanN").textContent = i + 1; await SD.sleep(70);
          sb[i].classList.remove("look");
          if (nums[i] === target) { sb[i].classList.add("found"); return; }
          sb[i].classList.add("seen");
        }
      })();
      const bin = (async () => {
        let lo = 0, hi = N - 1, c = 0;
        while (lo <= hi) {
          if (g !== gen) return;
          const mid = (lo + hi) >> 1; c++;
          ib.forEach((b, k) => b.classList.toggle("seen", k < lo || k > hi));
          ib[mid].classList.add("look"); $("#idxN").textContent = c; await SD.sleep(450);
          ib[mid].classList.remove("look");
          if (sorted[mid] === target) { ib[mid].classList.add("found"); return; }
          if (sorted[mid] < target) lo = mid + 1; else hi = mid - 1;
        }
      })();
      await Promise.all([scan, bin]);
      if (g === gen) $("#findTarget").textContent = `Found #${target}! Index looked at ${$("#idxN").textContent} books, scan looked at ${$("#scanN").textContent}. 🏆`;
    });
  })();

  /* ---------- replication ---------- */
  const rf = flow("#replFlow", {
    w: 760, h: 320, minW: 560,
    nodes: [
      { id: "app", x: 90, y: 160, w: 110, h: 76, icon: "🧑‍💻", label: "App", c: "blue" },
      { id: "lead", x: 350, y: 160, w: 150, h: 84, label: "👑 Leader\nname = Ana", c: "yellow", shape: "db" },
      { id: "f1", x: 640, y: 70, w: 150, h: 76, label: "Follower 1\nname = Ana", c: "teal", shape: "db" },
      { id: "f2", x: 640, y: 255, w: 150, h: 76, label: "Follower 2 🐢\nname = Ana", c: "teal", shape: "db" },
    ],
    edges: [["app", "lead", "writes"], ["lead", "f1", "copy", { dash: 1 }], ["lead", "f2", "copy", { dash: 1 }], ["app", "f2", "reads", { bend: 60 }]],
  });
  const resetRepl = () => { rf.reset(); rf.setLabel("lead", "👑 Leader").setLabel("lead", "name = Ana", 1).setLabel("f1", "name = Ana", 1).setLabel("f2", "name = Ana", 1).setLabel("f1", "Follower 1"); };
  SD.player({
    root: $("#replBox"), intro: "Press ▶ Play: a user renames themselves from Ana to Zed", onReset: resetRepl,
    steps: [
      { cap: "All <b>writes</b> go to the leader 👑", run: async () => { rf.clear().hl("lead"); await rf.send("app", "lead", { label: "name=Zed" }); rf.setLabel("lead", "name = Zed", 1); } },
      { cap: "Leader says OK right away (<b>asynchronous</b> replication)", run: () => rf.send("lead", "app", { label: "✅ saved", color: "green" }) },
      { cap: "Copies travel to the followers. Follower 1 is quick…", run: async () => { rf.clear().hl("f1"); await rf.send("lead", "f1", { label: "Zed", color: "teal" }); rf.setLabel("f1", "name = Zed", 1); } },
      { cap: "…but the user's next <b>read</b> hits slow Follower 2 — it still says <b>Ana</b> 😕 (stale read, replication lag)", run: async () => { rf.clear().hl("f2"); await rf.send("app", "f2", { label: "name?" }); await rf.send("f2", "app", { label: "Ana 😕", color: "red" }); rf.state("f2", "bad"); } },
      { cap: "A moment later Follower 2 catches up — <b>eventual consistency</b> 🌊", run: async () => { rf.clear("hl bad"); await rf.send("lead", "f2", { label: "Zed", color: "teal", dur: 1600 }); rf.setLabel("f2", "name = Zed", 1); rf.state("f2", "good"); } },
      { cap: "Fix: read <b>your own</b> recent changes from the leader (read-your-writes)", run: async () => { rf.clear("hl good"); await rf.send("app", "lead", { label: "name?" }); await rf.send("lead", "app", { label: "Zed ✅", color: "green" }); } },
      { cap: "💥 The leader dies! A follower gets <b>promoted</b> to leader (failover)", run: async () => { rf.state("lead", "down"); await SD.sleep(700); rf.setLabel("f1", "👑 New leader"); rf.state("f1", "good"); rf.pop("f1", "promoted!", { color: "green", ms: 2000 }); await SD.sleep(1200); } },
    ],
  });

  /* ---------- sharding ---------- */
  const sf = flow("#shardFlow", {
    w: 480, h: 260,
    nodes: [
      { id: "app", x: 60, y: 130, w: 86, h: 60, icon: "🖥️", label: "App", c: "yellow" },
      { id: "rt", x: 200, y: 130, w: 96, h: 60, icon: "🧭", label: "Router", c: "purple" },
      { id: "s1", x: 400, y: 45, w: 120, h: 60, label: "Shard 1\nA – H", c: "green", shape: "db" },
      { id: "s2", x: 400, y: 132, w: 120, h: 60, label: "Shard 2\nI – P", c: "teal", shape: "db" },
      { id: "s3", x: 400, y: 219, w: 120, h: 60, label: "Shard 3\nQ – Z", c: "blue", shape: "db" },
    ],
    edges: [["app", "rt"], ["rt", "s1"], ["rt", "s2"], ["rt", "s3"]],
  });
  (function shardLoop() {
    let vis = false;
    new IntersectionObserver((es) => (vis = es[0].isIntersecting)).observe($("#shardFlow"));
    const names = ["Ana", "Zoe", "Ben", "Kai", "Mia", "Raj", "Eve", "Liu", "Sam", "Omar", "Ivy", "Tom", "Yui", "Dev", "Pia"];
    (async function go() {
      while (true) {
        if (!vis) { await SD.sleep(500); continue; }
        const n = names[Math.floor(Math.random() * names.length)], c = n[0];
        const target = c <= "H" ? "s1" : c <= "P" ? "s2" : "s3";
        await sf.send("app", "rt", { label: n, color: "purple", dur: 600 });
        sf.hl(target); await sf.send("rt", target, { label: n, color: "green", dur: 600 }); sf.hl(target, false);
      }
    })();
  })();

  /* ---------- consistent hashing ring ---------- */
  (function ring() {
    const COLORS = ["blue", "pink", "green", "orange", "purple", "teal", "red", "yellow"];
    const KEYS = Array.from({ length: 72 }, (_, i) => "user" + i);
    let servers = ["S1", "S2", "S3"], vn = 1, prev = null, prevN = 3, nextId = 4;
    const ang = (s) => (SD.hash(s) / 4294967296) * Math.PI * 2;
    function assign(list) {
      const pts = [];
      list.forEach((s, si) => { for (let v = 0; v < vn; v++) pts.push({ a: ang(s + "#" + v), s, si, v }); });
      pts.sort((a, b) => a.a - b.a);
      const map = {};
      KEYS.forEach((k) => { const a = ang(k); const p = pts.find((q) => q.a >= a) || pts[0]; map[k] = p.s; });
      return { pts, map };
    }
    const colorOf = (s) => COLORS[(parseInt(s.slice(1)) - 1) % COLORS.length];
    function draw(moved) {
      const { pts, map } = assign(servers);
      const S = 420, cx = 210, cy = 210, R = 160;
      const svg = SD.svgEl("svg", { viewBox: `0 0 ${S} ${S}`, class: "sketch", role: "img", "aria-label": "Consistent hashing ring" });
      SD.svgEl("circle", { cx, cy, r: R, class: "r", "data-sw": 2.5 }, svg);
      SD.text(svg, cx, cy - 8, "hash ring", "note");
      SD.text(svg, cx, cy + 18, "keys go clockwise ↻", "s soft");
      KEYS.forEach((k) => {
        const a = ang(k), x = cx + Math.cos(a - Math.PI / 2) * (R - 18), y = cy + Math.sin(a - Math.PI / 2) * (R - 18);
        const mv = moved && moved.has(k);
        SD.svgEl("circle", { cx: x, cy: y, r: mv ? 6.5 : 4.5, fill: SD.PALETTE[colorOf(map[k])], stroke: mv ? "currentColor" : "none", "stroke-width": 2 }, svg);
      });
      pts.forEach((p) => {
        const x = cx + Math.cos(p.a - Math.PI / 2) * R, y = cy + Math.sin(p.a - Math.PI / 2) * R;
        SD.svgEl("rect", { x: x - 9, y: y - 9, width: 18, height: 18, class: "r", "data-fill": colorOf(p.s), "data-fs": "solid", transform: `rotate(45 ${x} ${y})` }, svg);
        if (p.v === 0 || vn <= 3) {
          const lx = cx + Math.cos(p.a - Math.PI / 2) * (R + 26), ly = cy + Math.sin(p.a - Math.PI / 2) * (R + 26);
          SD.text(svg, lx, ly, p.s, (vn > 1 ? "xs" : "s") + " halo");
        }
      });
      const host = $("#ringSvg"); host.innerHTML = ""; host.appendChild(svg); SD.roughify(svg);
      const counts = {}; servers.forEach((s) => (counts[s] = 0)); Object.values(map).forEach((s) => counts[s]++);
      $("#ringLegend").innerHTML = servers.map((s) => `<span><i style="background:${SD.PALETTE[colorOf(s)]}"></i>${s}: ${counts[s]} keys</span>`).join("");
      return map;
    }
    function change(fn) {
      const before = assign(servers).map, nBefore = servers.length;
      fn();
      const after = assign(servers).map, nAfter = servers.length;
      const moved = new Set(KEYS.filter((k) => before[k] !== after[k]));
      const modMoved = KEYS.filter((k) => SD.hash(k) % nBefore !== SD.hash(k) % nAfter).length;
      $("#movedRing").textContent = Math.round((moved.size / KEYS.length) * 100) + "%";
      $("#movedMod").textContent = Math.round((modMoved / KEYS.length) * 100) + "%";
      draw(moved);
    }
    $("#addNode").addEventListener("click", () => { if (servers.length >= 8) return SD.toast("8 servers is plenty! 😄"); change(() => { const used = new Set(servers); let i = 1; while (used.has("S" + i)) i++; servers.push("S" + i); }); });
    $("#rmNode").addEventListener("click", () => { if (servers.length <= 1) return; change(() => servers.splice(Math.floor(Math.random() * servers.length), 1)); });
    $("#vn").addEventListener("input", () => { vn = +$("#vn").value; $("#vnV").textContent = vn; draw(); });
    draw();
  })();

  /* ---------- CAP ---------- */
  (function cap() {
    let mode = "CP", cut = false, nyc = 1, lon = 1, busy = false;
    const cf = flow("#capSvg", {
      w: 460, h: 190,
      nodes: [
        { id: "n", x: 90, y: 95, w: 130, h: 100, label: "🗽 NYC\nx = 1", c: "blue", shape: "db" },
        { id: "l", x: 370, y: 95, w: 130, h: 100, label: "💂 London\nx = 1", c: "purple", shape: "db" },
      ],
      edges: [["n", "l", "🔌 network cable", { noArrow: 1, sw: 3 }]],
    });
    const say = (t) => ($("#capMsg").innerHTML = t);
    const paint = () => { cf.setLabel("n", "x = " + nyc, 1).setLabel("l", "x = " + lon, 1); cf.edgeState("n", "l", "cut", cut); cf.state("l", "bad", nyc !== lon); };
    const setMode = (m) => { mode = m; $("#modeCP").classList.toggle("on", m === "CP"); $("#modeAP").classList.toggle("on", m === "AP"); say(m === "CP" ? "🛡️ CP: never show wrong data — even if that means saying “sorry, try later”." : "🏃 AP: always answer — even if the data might be a little old."); };
    $("#modeCP").addEventListener("click", () => setMode("CP")); $("#modeAP").addEventListener("click", () => setMode("AP"));
    $("#capCut").addEventListener("click", async (e) => {
      if (busy) return;
      cut = !cut; e.target.textContent = cut ? "🔧 Fix cable" : "✂️ Cut cable"; paint();
      if (cut) { say("✂️ Network partition! NYC and London can't talk."); cf.pop("n", "✂️", { dx: 140, dy: 40 }); }
      else if (nyc !== lon) { busy = true; say("🔄 Cable fixed — copies sync up (eventual consistency)"); await cf.send("n", "l", { label: "x=" + nyc, color: "green" }); lon = nyc; paint(); busy = false; }
      else say("🔧 Cable fixed. All good!");
    });
    $("#capWrite").addEventListener("click", async () => {
      if (busy) return; busy = true;
      if (!cut) { nyc++; paint(); await cf.send("n", "l", { label: "x=" + nyc, color: "green" }); lon = nyc; paint(); say(`✍️ Wrote x=${nyc} — both copies agree ✅`); }
      else if (mode === "CP") { cf.pop("n", "❌ rejected", { color: "red", ms: 1600 }); say("🛡️ CP: write <b>refused</b> — NYC can't reach London to keep copies in sync. Consistent, but <b>not available</b>."); }
      else { nyc++; paint(); say(`🏃 AP: NYC accepted x=${nyc}, but London still has x=${lon}. Available, but copies <b>disagree</b> ⚠️`); }
      busy = false;
    });
    $("#capRead").addEventListener("click", async () => {
      if (busy) return; busy = true;
      if (cut && mode === "CP") { cf.pop("l", "🚫 error", { color: "red", ms: 1600 }); say("🛡️ CP: London says “I can't be sure I have the latest value — error.”"); }
      else { cf.pop("l", "x = " + lon, { color: lon === nyc ? "green" : "orange", ms: 1600 }); say(lon === nyc ? `👀 London returns x=${lon} ✅ (latest)` : `🏃 AP: London answers x=${lon}… but the latest is ${nyc}. Stale! 🥖`); }
      busy = false;
    });
    setMode("CP"); paint();
  })();

  /* ---------- quorum ---------- */
  function quorum() {
    const qN = $("#qN"), qW = $("#qW"), qR = $("#qR");
    const N = +qN.value; qW.max = N; qR.max = N;
    const W = Math.min(+qW.value, N), R = Math.min(+qR.value, N);
    $("#qNV").textContent = N; $("#qWV").textContent = W; $("#qRV").textContent = R;
    $("#qNodes").innerHTML = Array.from({ length: N }, (_, i) => { const w = i < W, r = i >= N - R; return `<div class="qn ${w ? "w" : ""} ${r ? "r" : ""}">${w && r ? "✨" : "🗄️"}</div>`; }).join("");
    const ov = W + R - N;
    $("#qVerdict").innerHTML = (ov > 0 ? `✅ R + W = ${W + R} &gt; N = ${N}: every read overlaps the latest write (at least ${ov} node${ov > 1 ? "s" : ""}).` : `⚠️ R + W = ${W + R} ≤ N = ${N}: a read might miss the latest write → stale data possible.`) +
      `<br><span class="small muted">Writes survive ${N - W} node(s) down · reads survive ${N - R} down. Popular choice: N=3, W=2, R=2.</span>`;
  }
  ["qN", "qW", "qR"].forEach((id) => $("#" + id).addEventListener("input", quorum));
  quorum();
})();
