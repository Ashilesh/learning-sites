/* Chapter 10 — Trade-offs & Best Practices */
(function () {
  const { $, $$ } = SD;

  /* ---------- seesaws ---------- */
  const SS = [
    ["Consistency vs Availability", "🛡️", "Consistency", "Money, stock levels, seat bookings — a wrong answer is worse than “try again”.", "🏃", "Availability", "Likes, feeds, view counts — slightly old data is totally fine; being down is not."],
    ["Latency vs Throughput", "⚡", "Low latency", "Interactive stuff: every tap must feel instant. Small requests, caches, nearby servers.", "🚚", "High throughput", "Big jobs: move the most data in total — batch, buffer and compress, even if each item waits."],
    ["SQL vs NoSQL", "📊", "SQL", "Relationships, transactions, flexible queries. The safe default.", "📦", "NoSQL", "Massive scale with simple key lookups, flexible shapes, or writes spread across regions."],
    ["Monolith vs Microservices", "🏰", "Monolith", "Small team, new product, need to move fast. Start here (keep it modular!).", "🏘️", "Microservices", "Many teams blocking each other, or parts with very different scaling needs."],
    ["Sync vs Async", "📞", "Synchronous", "The user needs the answer right now: login, search, checkout total.", "💌", "Asynchronous", "Slow or spiky work: emails, video processing, reports. Use a queue."],
    ["Fan-out on write vs read", "📤", "Push (on write)", "Most users have few followers & feeds are read a lot → precompute feeds.", "📥", "Pull (on read)", "Celebrities with millions of followers or rarely-opened feeds → compute when asked."],
    ["Normalize vs Denormalize", "🧹", "Normalize", "Each fact stored once → easy, consistent updates. Good for write-heavy data.", "📑", "Denormalize", "Copy data where it's read → no slow JOINs. Good for read-heavy screens."],
    ["Scale up vs Scale out", "⬆️", "Vertical", "A quick, simple win — until you hit the biggest machine (and a single point of failure).", "➡️", "Horizontal", "Near-unlimited growth and survives failures, but needs stateless design & load balancing."],
    ["Fresh vs Fast (caching)", "🥬", "Fresh", "Prices, balances, inventory: no cache or very short TTL + invalidation.", "⚡", "Fast", "Avatars, product descriptions, configs: long TTLs and CDN caching."],
    ["Batch vs Stream", "🧺", "Batch", "Nightly reports, billing, ML training. Simple, cheap, efficient.", "🚰", "Stream", "Fraud detection, live dashboards, alerts — you need it within seconds."],
    ["Build vs Buy", "🔨", "Build", "It's your core “secret sauce” and a real competitive advantage.", "🛒", "Buy / managed", "Commodity stuff: auth, payments, email, databases-as-a-service. Save your team's time."],
    ["Stateful vs Stateless", "🎒", "Stateful", "Game servers, WebSocket connections, in-memory caches — when state must live close to compute.", "🍃", "Stateless", "Web & API servers. Replace, restart and scale them freely."],
    ["WebSockets vs Polling", "🔌", "WebSockets", "Chat, multiplayer games, live collaboration — constant two-way updates.", "🔁", "Polling", "Updates are rare, infra is simple, or clients are behind strict firewalls."],
    ["Read- vs Write-optimized", "👀", "Read-optimized", "Indexes, caches, replicas, materialized views. Most apps!", "✍️", "Write-optimized", "Append-only logs, LSM trees, fewer indexes. Logs, metrics, IoT."],
    ["Cost vs Performance", "💰", "Cheaper", "Internal tools, background jobs, dev environments.", "🏎️", "Faster", "Revenue-critical paths like checkout and search."],
    ["Simplicity vs Flexibility", "🧸", "Simple", "Almost always! Fewer parts → fewer outages and easier onboarding.", "🧰", "Flexible", "Only when you truly know requirements will change in that exact way."],
    ["Pessimistic vs Optimistic locking", "🔒", "Pessimistic", "Conflicts are common (hot seats, popular stock) — lock first so nobody wastes work.", "🔢", "Optimistic", "Conflicts are rare — work freely and check a version number at the end; retry the loser."],
    ["Containers vs Serverless", "📦", "Containers", "Steady traffic, long-running services, special runtimes, full control over performance.", "🚕", "Serverless", "Spiky or rare jobs, glue code and prototypes — pay only per call and scale to zero."],
    ["RAG vs Fine-tuning", "📚", "RAG", "The model needs your fresh, changing facts with sources — an open-book exam.", "🏋️", "Fine-tuning", "You want a consistent style, format or skill baked in — studying for the exam."],
    ["Big vs Small AI model", "🐘", "Big model", "Hard reasoning where quality matters more than speed or cost.", "🐭", "Small model", "Simple, high-volume tasks (classify, extract, autocomplete) — fast and cheap."],
  ];
  $("#ssGrid").innerHTML = SS.map(([t, le, ln, lw, re, rn, rw], i) => `
    <div class="card ${i % 3 === 0 ? "tilt-l" : i % 3 === 2 ? "tilt-r" : ""}" data-i="${i}">
      <h3>${t}</h3>
      <div class="ss"><div class="plank"></div><div class="fulcrum"></div>
        <button class="end l" data-s="l"><span class="e">${le}</span>${ln}</button>
        <button class="end r" data-s="r"><span class="e">${re}</span>${rn}</button></div>
      <p class="why muted">Tap a side ↑</p>
    </div>`).join("");
  $("#ssGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".end"); if (!b) return;
    const card = b.closest(".card"), d = SS[+card.dataset.i], s = b.dataset.s;
    const ss = SD.$(".ss", card); ss.classList.remove("l", "r"); void ss.offsetWidth; ss.classList.add(s);
    const why = SD.$(".why", card); why.classList.remove("muted");
    why.innerHTML = `<b>Pick ${s === "l" ? d[2] : d[5]} when:</b> ${s === "l" ? d[3] : d[6]}`;
  });

  /* ---------- decision trees ---------- */
  const TREES = [
    { t: "🗄️ Which database?", root: { q: "Do you need transactions across several records (money, orders, bookings)?", a: [
      ["Yes", { q: "Will writes outgrow one big machine (or need many regions)?", a: [["No", { r: "📊 <b>PostgreSQL or MySQL.</b> Add read replicas & caching as you grow. 🎉" }], ["Yes", { r: "🌍 <b>Distributed SQL</b> (e.g. Spanner, CockroachDB, YugabyteDB) — or shard your SQL database carefully." }]] }],
      ["No", { q: "What's the main way you'll read the data?", a: [
        ["By a key", { r: "🔑 <b>Key-value store</b> (DynamoDB, Redis) — blazing fast lookups." }],
        ["Flexible docs", { r: "📄 <b>Document DB</b> (MongoDB, Firestore)." }],
        ["Huge time-ordered writes", { r: "🧱 <b>Wide-column</b> (Cassandra, ScyllaDB, Bigtable)." }],
        ["Relationships", { r: "🕸️ <b>Graph DB</b> (Neo4j, Neptune)." }],
        ["Text search", { r: "🔎 <b>Search engine</b> (Elasticsearch/OpenSearch) next to your main DB." }],
        ["Similar meaning (AI)", { r: "🧭 <b>Vector search</b> (pgvector, Pinecone, Milvus)." }],
      ] }],
    ] } },
    { t: "⚡ Should I add a cache?", root: { q: "Is the same data read again and again?", a: [
      ["No", { r: "🙅 Probably not — a cache won't get hits. Fix queries/indexes instead." }],
      ["Yes", { q: "Is it OK if users sometimes see data a few seconds/minutes old?", a: [
        ["No", { r: "⚠️ Only with care: write-through or delete-on-write + short TTL. Or skip the cache." }],
        ["Yes", { q: "Have you measured that the database is actually slow or overloaded?", a: [["Not yet", { r: "📏 Measure first! Keep it simple until numbers say otherwise." }], ["Yes", { r: "✅ <b>Add cache-aside with a TTL</b>, watch the hit rate, and plan for stampedes." }]] }],
      ] }],
    ] } },
    { t: "🏘️ Microservices?", root: { q: "Do several teams keep blocking each other in one codebase?", a: [
      ["No", { q: "Does one part need very different scaling or technology?", a: [["No", { r: "🏰 <b>Modular monolith.</b> Clean modules, one deploy. Fast & simple." }], ["Yes", { r: "✂️ Extract <b>just that part</b> into a service. Keep the rest together." }]] }],
      ["Yes", { q: "Do you have solid CI/CD, monitoring and tracing?", a: [["No", { r: "🧱 Invest in the platform first (automation, observability), then split." }], ["Yes", { r: "🏘️ <b>Microservices along business boundaries</b>, each owning its data." }]] }],
    ] } },
    { t: "📬 Sync call or queue?", root: { q: "Does the user need the result before the screen can continue?", a: [
      ["Yes", { q: "Can the work finish in well under a second?", a: [["Yes", { r: "📞 <b>Synchronous API call</b> with a timeout & retries." }], ["No", { r: "⏳ Accept the request, return a job ID, and show progress (async + polling/WebSocket)." }]] }],
      ["No", { r: "💌 <b>Queue it!</b> Workers do it in the background; add retries + a dead-letter queue." }],
    ] } },
  ];
  $("#trees").innerHTML = TREES.map((t, i) => `<div class="card tree" data-i="${i}"><h3>${t.t}</h3><div class="body"></div></div>`).join("");
  $$("#trees .tree").forEach((card) => {
    const T = TREES[+card.dataset.i], body = SD.$(".body", card); let path = [];
    function render(node) {
      const crumbs = path.length ? `<div class="crumbs">${path.map((p) => "✓ " + p).join(" → ")}</div>` : "";
      if (node.r) body.innerHTML = `${crumbs}<div class="ans">${node.r}</div><button class="btn sm mt" data-restart>↺ Start over</button>`;
      else body.innerHTML = `${crumbs}<p class="q">${node.q}</p><div class="row">${node.a.map(([l], k) => `<button class="btn sm ${k ? "" : "primary"}" data-k="${k}">${l}</button>`).join("")}</div>`;
      body.onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.hasAttribute("data-restart")) { path = []; return render(T.root); }
        const [l, nx] = node.a[+b.dataset.k]; path.push(l); render(nx);
      };
    }
    render(T.root);
  });

  /* ---------- best practices ---------- */
  const BP = [
    ["🏗️ Design", ["Write down requirements & numbers before drawing boxes", "Start simple; add parts only to fix a measured problem", "Keep services stateless", "Define clear, versioned APIs", "Remove single points of failure"]],
    ["📈 Scale & speed", ["Cache read-heavy data (with TTLs)", "Serve static files from a CDN", "Paginate anything that can grow", "Move slow or spiky work to queues", "Track p99 latency, not just averages"]],
    ["🗄️ Data", ["Choose databases by access patterns", "Index for real queries (not everything)", "Back up — and test restores", "Pick shard keys that spread load evenly", "Make writes idempotent"]],
    ["🛡️ Reliability", ["Set a timeout on every network call", "Retry with exponential backoff + jitter", "Use circuit breakers & graceful degradation", "Deploy gradually (canary) with fast rollback", "Run across multiple zones/regions"]],
    ["🔐 Security & ops", ["Encrypt in transit and at rest", "Least privilege for people & services", "Rate limit public endpoints", "Monitor golden signals; alert on SLOs", "Write runbooks & do blameless postmortems"]],
  ];
  const KEY = "sd-bp", ticks = new Set(SD.store.get(KEY, []));
  $("#bpGrid").innerHTML = BP.map(([g, items], gi) => `<div class="card bp-group"><h3>${g}</h3>${items.map((it, ii) => { const id = gi + "-" + ii; return `<label class="check"><input type="checkbox" data-id="${id}" ${ticks.has(id) ? "checked" : ""}><span>${it}</span></label>`; }).join("")}</div>`).join("");
  const total = BP.reduce((s, g) => s + g[1].length, 0);
  function count() {
    $("#bpCount").textContent = `✅ ${ticks.size} / ${total} practices ticked`;
    const f = ticks.size / total; const bar = $("#bpBar"); bar.style.width = f * 100 + "%"; bar.style.background = f === 1 ? "var(--green)" : "var(--yellow)";
  }
  $("#bpGrid").addEventListener("change", (e) => {
    const c = e.target; if (!c.dataset.id) return;
    c.checked ? ticks.add(c.dataset.id) : ticks.delete(c.dataset.id);
    SD.store.set(KEY, [...ticks]); count();
    if (ticks.size === total) { SD.confetti(); SD.toast("All best practices ticked! 🏆"); }
  });
  $("#bpReset").addEventListener("click", () => { ticks.clear(); SD.store.set(KEY, []); $$("#bpGrid input").forEach((c) => (c.checked = false)); count(); });
  count();

  /* ---------- anti-patterns ---------- */
  const ANTI = [
    ["🕸️", "Distributed monolith", "Microservices that must all deploy together and call each other constantly. All the pain, none of the gain."],
    ["🔮", "Designing for a billion users on day one", "Premature complexity slows you down. Build for 10× today's load, not 10,000×."],
    ["🎯", "Single point of failure", "One database, one load balancer, one region, one person who knows the password."],
    ["🗣️", "Chatty services", "A page that makes 100 network calls. Batch, aggregate, or cache."],
    ["🤝", "Shared database between services", "Services secretly coupled through tables. Each service should own its data."],
    ["♾️", "No timeouts, unbounded queues", "One slow dependency quietly eats all threads and memory until everything stops."],
    ["🌪️", "Retry storms", "Everyone retries instantly at the same time and keeps a struggling service down."],
    ["📉", "Only watching averages", "The average looks fine while 1% of users suffer. Watch p99."],
    ["🧊", "Cache with no invalidation plan", "Users see stale prices or old profiles forever."],
    ["🧪", "Untested backups", "Discovering during a disaster that the backups don't restore."],
  ];
  $("#antiGrid").innerHTML = ANTI.map(([e, t, d], i) => `<div class="card anti ${i % 2 ? "tilt-r" : "tilt-l"}"><span class="emoji-xl">${e}</span><h4>${t}</h4><p class="mb0">${d}</p></div>`).join("");

  /* ---------- ladder ---------- */
  const steps = [["1", "🖥️", "One server"], ["2", "🗄️", "Own DB"], ["3", "🚦", "LB + copies"], ["4", "⚡", "Cache"], ["5", "🌐", "CDN"], ["6", "📬", "Queues"], ["7", "🍕", "Shards"], ["8", "🌍", "Regions"]];
  SD.flow("#ladderFlow", {
    w: 820, h: 320, minW: 640,
    nodes: steps.map(([n, ic, l], i) => ({ id: "s" + n, x: 60 + i * 100, y: 262 - i * 30, w: 92, h: 66, icon: ic, label: l, c: ["green", "green", "yellow", "yellow", "orange", "orange", "red", "red"][i], small: 1 })),
    edges: steps.slice(1).map((_, i) => ["s" + (i + 1), "s" + (i + 2), "", { flow: 1 }]),
  });
})();
