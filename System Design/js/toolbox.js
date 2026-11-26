/* Chapter 2 — The Toolbox */
(function () {
  const { $, flow } = SD;

  /* client / server */
  flow("#csFlow", {
    w: 480, h: 230, label: "Client and server",
    nodes: [
      { id: "c", x: 80, y: 115, w: 110, h: 90, icon: "📱", label: "Client", c: "blue" },
      { id: "s", x: 390, y: 115, w: 130, h: 110, icon: "🖥️", label: "Server\n(in a data center)", c: "yellow" },
    ],
    edges: [["c", "s", "request: “GET /cats”", { bend: 34, flow: 1, c: "pink" }], ["s", "c", "response: 🐱🐱🐱", { bend: 34, flow: 1, flowC: "blue" }]],
  });

  /* building blocks (flip cards) */
  const blocks = [
    ["📱", "Client", "The app or browser in your hand. It asks for things.", "The customer placing an order.", "Browsers, iOS & Android apps, smart TVs", "Always — it's where users live."],
    ["📖", "DNS", "Turns names like pizza.com into IP addresses.", "Your phone's contacts list: name → number.", "Route 53, Cloudflare DNS, Google DNS", "Every public service. Can also route by location (GeoDNS)."],
    ["🌐", "CDN", "Servers all over the world holding copies of images, videos, scripts.", "Ice-cream trucks in every neighborhood instead of one far factory.", "Cloudflare, Akamai, CloudFront, Fastly", "Users are far away or you serve big static files."],
    ["🚦", "Load Balancer", "Spreads requests across many servers and skips sick ones.", "The host at the door who seats you at a free table.", "NGINX, HAProxy, Envoy, AWS ALB/NLB", "You have 2+ servers (that's always, for safety!)."],
    ["🚪", "API Gateway", "One front door for many services: login checks, rate limits, routing.", "A hotel reception desk that sends you to the right room.", "Kong, AWS API Gateway, Apigee, Envoy", "You have many microservices behind one public API."],
    ["🖥️", "App Server", "Runs your code — the business logic.", "The chefs who actually cook.", "Node.js, Java/Spring, Go, Python — in containers", "Always. Keep them stateless so you can add more."],
    ["⚡", "Cache", "Tiny, super-fast memory for popular answers.", "A sticky note on the fridge vs walking to the library.", "Redis, Memcached, in-process caches", "Same data is read again and again."],
    ["🗄️", "SQL Database", "Tables with strict rules. Great at relationships and safe transactions.", "A super-organized binder of spreadsheets.", "PostgreSQL, MySQL, SQL Server, Aurora", "Money, orders, users — data that must be correct."],
    ["📦", "NoSQL Database", "Flexible shapes (key-value, documents, columns, graphs). Spreads across machines easily.", "Labeled boxes you can stack in any warehouse.", "DynamoDB, MongoDB, Cassandra, Neo4j", "Huge scale, flexible data, simple access patterns."],
    ["🪣", "Object Storage", "Stores giant files (photos, videos, backups) cheaply and safely.", "A gigantic self-storage locker building.", "Amazon S3, Google Cloud Storage, Azure Blob", "Files bigger than a few KB. Never put videos in a DB!"],
    ["📬", "Message Queue", "A waiting line of jobs, so senders don't wait for doers.", "The order-ticket rail in a kitchen.", "RabbitMQ, Amazon SQS, Kafka, Pub/Sub", "Slow work, traffic spikes, or one event → many listeners."],
    ["👷", "Workers", "Background programs that pick jobs off the queue.", "Kitchen helpers prepping in the back room.", "Celery, Sidekiq, AWS Lambda, K8s jobs", "Emails, video processing, reports, retries."],
    ["🔎", "Search Index", "Finds words in millions of documents in milliseconds (inverted index).", "The index at the back of a book.", "Elasticsearch, OpenSearch, Solr, Meilisearch", "Full-text search, filters, autocomplete."],
    ["📊", "Monitoring", "Metrics, logs, traces and alerts about system health.", "A car's dashboard and warning lights.", "Prometheus, Grafana, Datadog, OpenTelemetry", "From day one. You can't fix what you can't see."],
    ["🏭", "Data Warehouse", "Answers big questions over ALL your history (analytics).", "The school archive used for yearly statistics.", "BigQuery, Snowflake, Redshift, ClickHouse", "Reports, dashboards, ML — not for live user requests."],
    ["🧭", "Service Discovery", "A live phone book of which servers are up and where.", "A school directory updated as kids join or leave.", "Consul, etcd, ZooKeeper, Kubernetes DNS", "Servers come and go automatically (autoscaling)."],
  ];
  const cols = ["", "b", "p", "g", "o", "v"];
  $("#blockGrid").innerHTML = blocks.map(([e, name, what, ana, ex, when], i) => `
    <div class="flip" tabindex="0" role="button" aria-label="${name}: flip card">
      <div class="inner">
        <div class="face front card"><span class="e">${e}</span><h3>${name}</h3><p>${what}</p><span class="hint">tap to flip ↻</span></div>
        <div class="face back sticky ${cols[i % cols.length]}"><p><b>🍕 Everyday twin:</b> ${ana}</p><p><b>🛠️ Real tools:</b> ${ex}</p><p class="mb0"><b>✅ Use when:</b> ${when}</p></div>
      </div>
    </div>`).join("");
  SD.$$(".flip").forEach((f) => {
    const t = () => f.classList.toggle("on");
    f.addEventListener("click", t);
    f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } });
  });

  /* TCP handshake */
  const tcp = SD.seq("#tcpSeq", {
    w: 440, gap: 50, label: "TCP handshake",
    actors: [{ name: "You", icon: "📱", c: "blue" }, { name: "Server", icon: "🖥️", c: "yellow" }],
    msgs: [
      { f: 0, t: 1, label: "SYN — “Hi! Can we talk?”", c: "pink" },
      { f: 1, t: 0, label: "SYN-ACK — “Yes! Can you hear me?”", c: "blue" },
      { f: 0, t: 1, label: "ACK — “Loud and clear!”", c: "pink" },
      { f: 0, t: 1, label: "GET /index.html", c: "green" },
      { f: 1, t: 0, label: "200 OK 📄", c: "green" },
    ],
  });
  let tcpPlayed = false;
  new IntersectionObserver((es) => { if (es[0].isIntersecting && !tcpPlayed) { tcpPlayed = true; tcp.play(); } }).observe($("#tcpSeq"));
  $("#tcpPlay").addEventListener("click", () => tcp.play());

  /* real-time techniques */
  const C = { name: "Client", icon: "📱", c: "blue" }, S = { name: "Server", icon: "🖥️", c: "yellow" };
  const rts = {
    poll: { t: "🔁 Short polling", cap: "Ask every few seconds: “Anything new?” Simple — but most answers are “nope”, wasting work.",
      msgs: [{ f: 0, t: 1, label: "Anything new?" }, { f: 1, t: 0, label: "Nope 😐", c: "gray" }, { f: 0, t: 1, label: "Anything new?" }, { f: 1, t: 0, label: "Nope 😐", c: "gray" }, { f: 0, t: 1, label: "Anything new?" }, { f: 1, t: 0, label: "Yes! 📩 “hi!”", c: "green" }] },
    long: { t: "⏳ Long polling", cap: "Ask once, and the server holds the line until something happens. Fewer wasted trips.",
      msgs: [{ f: 0, t: 1, label: "Anything new? (I'll wait)" }, { f: 1, note: "⏳ holding…", wait: 1100 }, { f: 1, t: 0, label: "📩 “hi!”", c: "green" }, { f: 0, t: 1, label: "Anything new? (I'll wait)" }, { f: 1, note: "⏳ holding…", wait: 1100 }, { f: 1, t: 0, label: "📩 “how are you?”", c: "green" }] },
    ws: { t: "🔌 WebSocket", cap: "One handshake, then a permanent two-way phone line. Both sides talk any time. Perfect for chat & games.",
      msgs: [{ f: 0, t: 1, label: "Upgrade to WebSocket?" }, { f: 1, t: 0, label: "101 Switching 🤝", c: "purple" }, { f: 1, t: 0, label: "📩 “hi!”", c: "green" }, { f: 0, t: 1, label: "✍️ typing…", c: "pink" }, { f: 0, t: 1, label: "📩 “hey!”", c: "pink" }, { f: 1, t: 0, label: "📩 “🎉”", c: "green" }] },
    sse: { t: "📻 Server-Sent Events", cap: "Subscribe once; the server keeps streaming updates one way. Great for live scores and AI answers typed word by word.",
      msgs: [{ f: 0, t: 1, label: "GET /scores (stream)" }, { f: 1, t: 0, label: "event: ⚽ 1–0", c: "green" }, { f: 1, t: 0, label: "event: ⚽ 1–1", c: "green" }, { f: 1, t: 0, label: "event: 🟨 card", c: "orange" }, { f: 1, t: 0, label: "event: ⚽ 2–1", c: "green" }] },
    hook: { t: "📞 Webhook", cap: "“Don't call us, we'll call you.” One server registers a URL; the other calls it when the job is done.",
      actors: [{ name: "Your app", icon: "🛒", c: "blue" }, { name: "Payments", icon: "💳", c: "purple" }],
      msgs: [{ f: 0, t: 1, label: "Charge $20, call /paid when done" }, { f: 1, t: 0, label: "202 Accepted 👍", c: "gray" }, { f: 1, note: "💳 processing…", wait: 1100 }, { f: 1, t: 0, label: "POST /paid ✅", c: "green" }, { f: 0, t: 1, label: "200 thanks!", c: "pink" }] },
  };
  let cur = null;
  const chips = $("#rtChips");
  chips.innerHTML = Object.entries(rts).map(([k, v]) => `<button class="chip" data-k="${k}">${v.t}</button>`).join("");
  function showRt(k) {
    cur && cur.stop();
    SD.$$("button", chips).forEach((b) => b.classList.toggle("on", b.dataset.k === k));
    const r = rts[k];
    $("#rtCap").textContent = r.cap;
    cur = SD.seq("#rtSeq", { w: 560, gap: 46, actors: r.actors || [C, S], msgs: r.msgs });
    cur.play(true);
  }
  chips.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showRt(b.dataset.k); });
  showRt("poll");

  /* proxies */
  flow("#fwdFlow", {
    w: 480, h: 220,
    groups: [{ x: 10, y: 20, w: 250, h: 185, label: "your side", c: "blue" }],
    nodes: [
      { id: "a", x: 70, y: 80, w: 80, h: 46, label: "💻 You", c: "blue" }, { id: "b", x: 70, y: 160, w: 80, h: 46, label: "💻 Friend", c: "blue" },
      { id: "p", x: 200, y: 120, w: 90, h: 60, icon: "🕴️", label: "Proxy", c: "purple" },
      { id: "w", x: 400, y: 120, w: 110, h: 60, icon: "🌍", label: "Websites", c: "teal" },
    ],
    edges: [["a", "p"], ["b", "p"], ["p", "w", "", { flow: 1 }]],
  });
  flow("#revFlow", {
    w: 480, h: 220,
    groups: [{ x: 160, y: 15, w: 310, h: 195, label: "company side", c: "orange" }],
    nodes: [
      { id: "u", x: 70, y: 115, w: 90, h: 60, icon: "🌍", label: "Users", c: "blue" },
      { id: "p", x: 240, y: 115, w: 96, h: 66, icon: "🕴️", label: "Reverse\nproxy", c: "purple", small: 1 },
      { id: "s1", x: 400, y: 60, w: 100, h: 42, label: "🖥️ Server", c: "yellow" }, { id: "s2", x: 400, y: 115, w: 100, h: 42, label: "🖥️ Server", c: "yellow" }, { id: "s3", x: 400, y: 170, w: 100, h: 42, label: "🖥️ Server", c: "yellow" },
    ],
    edges: [["u", "p", "", { flow: 1 }], ["p", "s1"], ["p", "s2"], ["p", "s3"]],
  });
})();
