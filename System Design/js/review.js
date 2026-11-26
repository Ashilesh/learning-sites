/* Chapter 12 — Glossary & Quiz */
(function () {
  const { $, $$ } = SD;
  const CH = { home: "🏠 Start", toolbox: "🧰 Toolbox", numbers: "⏱️ Numbers", scaling: "📈 Scaling", data: "🗄️ Data", patterns: "🧩 Patterns", reliability: "🛡️ Reliability", cloud: "☁️ Cloud", deep: "🔬 Deep dives", cases: "🏗️ Cases", ai: "🤖 AI" };
  const FILE = Object.fromEntries(SD.CHAPTERS.map((c) => [c.id, c.file]));
  const G = [
    ["ACID", "Rules that make database transactions safe: all-or-nothing, rules kept, no peeking, saved for good.", "data"],
    ["API", "A menu of things a program lets other programs ask for, and how to ask.", "toolbox"],
    ["API gateway", "One front door for many services that handles login checks, limits and routing.", "toolbox"],
    ["Availability", "How much of the time a system is up and answering. Measured in “nines”.", "numbers"],
    ["Backoff (exponential)", "Waiting longer after each failed try: 1 s, 2 s, 4 s…", "reliability"],
    ["Back-of-the-envelope", "Quick rough math to estimate traffic, storage and servers.", "numbers"],
    ["Bandwidth", "How much data a connection can carry per second — the number of lanes on the road.", "numbers"],
    ["BASE", "Basically Available, Soft state, Eventually consistent — the relaxed cousin of ACID.", "data"],
    ["Bloom filter", "A tiny bit-array that answers “definitely not here” or “maybe here”.", "patterns"],
    ["Bulkhead", "Separate pools for each dependency so one leak doesn't sink the ship.", "reliability"],
    ["Cache", "Fast, small memory that keeps popular answers so you don't recompute them.", "scaling"],
    ["Cache-aside", "App checks the cache; on a miss it reads the DB and fills the cache.", "scaling"],
    ["Canary release", "Send a small % of traffic to a new version first, like a canary in a mine.", "reliability"],
    ["CAP theorem", "When the network splits, you must choose: consistent answers or always answering.", "data"],
    ["CDN", "Servers around the world holding copies of files close to users.", "scaling"],
    ["Circuit breaker", "Stops calling a failing service for a while and fails fast instead.", "reliability"],
    ["Client", "The app or browser that sends requests.", "toolbox"],
    ["Consensus", "How several machines agree on one answer, e.g. who's the leader (Raft, Paxos).", "patterns"],
    ["Consistent hashing", "Putting servers and keys on a ring so adding a server moves only a few keys.", "data"],
    ["CQRS", "Using separate models for writing data and for reading it.", "patterns"],
    ["Data center", "A big building full of servers, power and cooling.", "toolbox"],
    ["Dead-letter queue (DLQ)", "Where messages that keep failing are parked for later inspection.", "patterns"],
    ["Denormalization", "Copying data into several places so reads are faster (no JOINs).", "data"],
    ["DNS", "The internet's phone book: turns names into IP addresses.", "toolbox"],
    ["Durability", "Once saved, data survives crashes and power cuts.", "data"],
    ["Error budget", "How much failure your SLO allows — spend it on risky launches.", "numbers"],
    ["Event sourcing", "Storing every change as an event and rebuilding state by replaying them.", "patterns"],
    ["Eventual consistency", "Copies may differ for a moment but agree soon.", "data"],
    ["Failover", "Automatically switching to a backup when the main one fails.", "reliability"],
    ["Fan-out", "Sending one thing to many places (e.g. a post into every follower's feed).", "cases"],
    ["Geohash", "A short code for a map square, used to find nearby things fast.", "cases"],
    ["gRPC", "A fast, strict way for services to call each other using small binary messages.", "toolbox"],
    ["Health check", "A regular “are you OK?” ping so load balancers skip broken servers.", "scaling"],
    ["Horizontal scaling", "Adding more machines (scale out).", "scaling"],
    ["Hot key / hot shard", "One piece of data or shard getting way more traffic than others.", "data"],
    ["Idempotency", "Doing something twice has the same effect as once — like pressing an elevator button.", "patterns"],
    ["Index", "A sorted lookup structure that finds rows without scanning everything.", "data"],
    ["Jitter", "Adding randomness to wait times so clients don't all retry together.", "reliability"],
    ["JWT", "A signed token that says who you are; readable by anyone, unforgeable without the key.", "reliability"],
    ["Latency", "How long one request takes.", "numbers"],
    ["Leader election", "Choosing one node to coordinate; a new one is chosen if it dies.", "patterns"],
    ["Load balancer", "Spreads requests across many servers and avoids unhealthy ones.", "scaling"],
    ["Load shedding", "Dropping low-priority work on purpose when overloaded.", "reliability"],
    ["LRU", "Least Recently Used — evict whatever hasn't been touched the longest.", "scaling"],
    ["Message queue", "A waiting line of jobs so producers don't wait for workers.", "patterns"],
    ["Microservices", "Many small services, each owning one job and its data.", "patterns"],
    ["Monolith", "One big application deployed as a single unit.", "patterns"],
    ["NoSQL", "Non-table databases: key-value, document, wide-column, graph.", "data"],
    ["Object storage", "Cheap, durable storage for big files (photos, videos, backups).", "toolbox"],
    ["Observability", "Being able to see inside a system with metrics, logs and traces.", "reliability"],
    ["p50 / p99", "Percentiles: p99 is the time that 99% of requests beat — the unlucky 1 in 100.", "numbers"],
    ["PACELC", "If Partition: Availability vs Consistency; Else: Latency vs Consistency.", "data"],
    ["Partition (network)", "When parts of a system can't talk to each other.", "data"],
    ["Pub/Sub", "Publish a message once and every subscriber gets a copy.", "patterns"],
    ["Quorum", "The number of copies that must agree; R + W > N gives fresh reads.", "data"],
    ["Rate limiting", "Capping how many requests someone can make in a time window.", "reliability"],
    ["Read replica", "A read-only copy of a database that shares the reading work.", "data"],
    ["Replication", "Keeping copies of data on several machines.", "data"],
    ["Reverse proxy", "A server in front of your servers that receives requests for them.", "toolbox"],
    ["RPO / RTO", "How much data you can lose / how long you can be down after a disaster.", "reliability"],
    ["Saga", "A chain of local steps with “undo” steps if something fails later.", "patterns"],
    ["Scalability", "Handling more load by adding resources.", "scaling"],
    ["Server", "A computer that waits for requests and sends responses.", "toolbox"],
    ["Service mesh", "Sidecar proxies that handle retries, encryption and metrics between services.", "patterns"],
    ["Sharding", "Splitting data across machines so each holds a slice.", "data"],
    ["SLI / SLO / SLA", "What you measure / your goal / the promise with a penalty.", "numbers"],
    ["Single point of failure", "One part whose failure breaks everything.", "reliability"],
    ["Snowflake ID", "A 64-bit unique ID made of time + machine + counter.", "patterns"],
    ["SQL", "Table databases with JOINs and transactions.", "data"],
    ["Stateless", "A server that doesn't remember you between requests, so any copy can help.", "scaling"],
    ["Tail latency", "The slowest requests (p99, p99.9) — what unlucky users feel.", "numbers"],
    ["TCP / UDP", "Reliable ordered delivery (phone call) vs fast best-effort (shouting).", "toolbox"],
    ["Throughput", "How many requests finish per second.", "numbers"],
    ["Timeout", "Giving up after a set time instead of waiting forever.", "reliability"],
    ["TTL", "Time To Live — how long cached data stays before expiring.", "scaling"],
    ["Vertical scaling", "Buying a bigger machine (scale up).", "scaling"],
    ["WebSocket", "A connection that stays open so both sides can talk any time.", "toolbox"],
    ["Write-through / write-back", "Write to cache and DB together / write to cache now, DB later.", "scaling"],
    ["Availability zone (AZ)", "A separate data center inside a cloud region, with its own power and cooling.", "cloud"],
    ["Cold start", "The extra delay when a serverless function wakes up for its first call.", "cloud"],
    ["Container", "A standard box holding an app and everything it needs, so it runs the same anywhere.", "cloud"],
    ["CI/CD", "Robots that build, test and ship every code change automatically.", "cloud"],
    ["Egress", "Data leaving the cloud — often the sneakiest cost on the bill.", "cloud"],
    ["HTTP/2 & HTTP/3", "Newer web protocols: many files over one connection; HTTP/3 runs on QUIC (UDP) to avoid stalls.", "cloud"],
    ["Infrastructure as Code", "Describing servers and networks in files so they can be reviewed and recreated.", "cloud"],
    ["Kubernetes", "A system that keeps the right number of containers running and replaces broken ones.", "cloud"],
    ["Pod", "The smallest thing Kubernetes runs: one (or a few) containers together.", "cloud"],
    ["Recursive resolver", "The DNS helper that hunts down an answer for you, then caches it.", "cloud"],
    ["Region", "A geographic area of a cloud provider, made of several availability zones.", "cloud"],
    ["Serverless", "Run small functions on demand and pay per call — no servers to manage.", "cloud"],
    ["Spot instance", "Cheap spare cloud capacity that can be taken back at short notice.", "cloud"],
    ["TLS", "The encryption behind HTTPS: proves the server's identity and scrambles the traffic.", "cloud"],
    ["Virtual machine (VM)", "A pretend computer carved out of a real one, with its own operating system.", "cloud"],
    ["Race condition", "A bug where the result depends on who gets there first — like two people buying the last seat.", "deep"],
    ["Pessimistic locking", "Lock the data first so nobody else can change it until you're done.", "deep"],
    ["Optimistic locking", "Work freely, then check a version number before saving; retry if it changed.", "deep"],
    ["Isolation level", "How much transactions can see of each other's unfinished work.", "deep"],
    ["MVCC", "Each transaction reads a snapshot, so readers never block writers.", "deep"],
    ["Lamport clock", "A counter passed along with messages so causes always get smaller numbers than effects.", "deep"],
    ["Vector clock", "One counter per node, used to spot events that happened at the same time.", "deep"],
    ["Gossip protocol", "Servers spread news by telling a few random others each round — like a rumor.", "deep"],
    ["Lease", "A lock that expires automatically after a while.", "deep"],
    ["Fencing token", "An ever-increasing number handed out with a lock; storage rejects older numbers.", "deep"],
    ["Split brain", "Two nodes both believe they are the leader.", "deep"],
    ["Outbox pattern", "Save data and its event in one transaction; a relay publishes the event later.", "deep"],
    ["CDC (change data capture)", "Turning a database's change log into a stream of events.", "deep"],
    ["CRDT", "A data type that copies can edit separately and always merge without conflicts.", "deep"],
    ["HyperLogLog", "A tiny structure that estimates how many unique things you've seen.", "deep"],
    ["Count-Min Sketch", "A tiny structure that estimates how often things appear (great for top-K trends).", "deep"],
    ["Embedding", "A list of numbers capturing meaning — similar things get similar numbers.", "ai"],
    ["Vector database", "A database that finds the nearest embeddings — search by meaning.", "ai"],
    ["RAG", "Retrieval-augmented generation: look up relevant documents and give them to the model before it answers.", "ai"],
    ["LLM", "Large language model — an AI that writes text one token at a time.", "ai"],
    ["Token", "A word-piece; models read and write text one token at a time.", "ai"],
    ["Time to first token (TTFT)", "How long until an AI answer starts appearing.", "ai"],
    ["Continuous batching", "Serving many users together on a GPU, adding and removing them on the fly.", "ai"],
    ["KV cache", "The model's memory of work on earlier tokens, so it doesn't redo it.", "ai"],
    ["Semantic cache", "Reusing answers for questions that mean the same thing.", "ai"],
    ["Guardrails", "Checks on AI inputs and outputs for safety, privacy and allowed topics.", "ai"],
    ["Evals", "Automatic tests that score an AI system's answers.", "ai"],
    ["Fine-tuning", "Training a model further on your own examples to change its behavior.", "ai"],
    ["Hallucination", "When an AI confidently makes something up.", "ai"],
    ["Feature store", "One place for the facts ML models use, shared by training and serving.", "ai"],
    ["A/B test", "Show two versions to different users and compare the results.", "ai"],
    ["Trie", "A tree of letters for fast prefix lookups (autocomplete).", "cases"],
    ["Ledger", "An append-only record of every money movement (debits and credits).", "cases"],
    ["Reconciliation", "Comparing your records with someone else's to catch mismatches.", "cases"],
    ["Virtual waiting room", "A fair queue that lets users into a busy site a few at a time.", "cases"],
    ["URL frontier", "A crawler's to-visit list, organized by priority and by website.", "cases"],
  ];
  G.sort((a, b) => a[0].localeCompare(b[0]));
  let filter = "all";
  $("#glFilter").innerHTML = `<button class="chip on" data-f="all">All</button>` + Object.entries(CH).map(([k, v]) => `<button class="chip" data-f="${k}">${v}</button>`).join("");
  function renderG() {
    const q = $("#glSearch").value.trim().toLowerCase();
    const items = G.filter(([t, d, c]) => (filter === "all" || c === filter) && (!q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q)));
    $("#glCount").textContent = `${items.length} term${items.length === 1 ? "" : "s"}`;
    $("#glList").innerHTML = items.map(([t, d, c]) => `<div class="card"><h4>${t}</h4><p class="mb0">${d}</p><a class="where muted" href="${FILE[c]}">→ ${CH[c]}</a></div>`).join("") || '<p class="muted">No match — try another word! 🔍</p>';
  }
  $("#glSearch").addEventListener("input", renderG);
  $("#glFilter").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; filter = b.dataset.f; $$("#glFilter .chip").forEach((x) => x.classList.toggle("on", x === b)); renderG(); });
  renderG();

  /* ---------- quiz ---------- */
  const Q = [
    ["What does a load balancer do?", ["Stores data permanently", "Spreads requests across many servers", "Turns names into IP addresses", "Encrypts passwords"], 1, "It's the host at the door, sending each request to a healthy, not-too-busy server."],
    ["Your p50 is 80 ms and p99 is 2 s. What does p99 = 2 s mean?", ["The average request takes 2 s", "1 in 100 requests takes 2 s or longer", "99 requests take exactly 2 s", "The server is down 1% of the time"], 1, "p99 is the time 99% of requests beat. The slowest 1% wait 2 s or more."],
    ["Which helps MOST for a read-heavy app showing the same popular data?", ["A message queue", "A cache", "Sharding the writes", "Bigger log files"], 1, "Caches keep popular answers in fast memory, saving database trips."],
    ["99.99% availability allows roughly how much downtime per year?", ["3.65 days", "8.8 hours", "52 minutes", "5 minutes"], 2, "Four nines ≈ 52.6 minutes per year."],
    ["During a network partition, a CP system will…", ["Always answer, maybe with old data", "Refuse some requests to avoid wrong data", "Ignore the partition", "Delete the data"], 1, "CP chooses Consistency: better to say “try later” than give a wrong answer."],
    ["Why add jitter to retries?", ["To make retries faster", "So clients don't all retry at the same instant", "To encrypt the request", "To skip timeouts"], 1, "Randomness spreads retries out, avoiding synchronized retry storms."],
    ["What's the main benefit of consistent hashing?", ["Encrypts keys", "Adding/removing a server moves only a few keys", "Makes every key unique", "Removes the need for replicas"], 1, "With % N almost all keys move; with a ring, only neighbors' keys move."],
    ["A payment API may be retried after a timeout. What prevents double charges?", ["A bigger server", "An idempotency key", "A CDN", "Polling"], 1, "The server remembers the key and ignores repeats — idempotency!"],
    ["Which is best for a chat app's real-time messages?", ["Short polling every minute", "WebSockets", "Batch processing", "Email"], 1, "WebSockets keep a two-way connection open so messages arrive instantly."],
    ["With N=3 replicas, which setting guarantees reads see the latest write?", ["W=1, R=1", "W=2, R=2", "W=1, R=2", "W=0, R=3"], 1, "R + W = 4 > N = 3, so read and write sets always overlap."],
    ["Big video files should usually be stored in…", ["The SQL database", "Object storage (served via a CDN)", "The cache", "The load balancer"], 1, "Object storage is cheap and durable; CDNs deliver files close to viewers."],
    ["Scaling OUT (horizontal) means…", ["Buying a bigger machine", "Adding more machines", "Deleting old data", "Using a faster disk"], 1, "Horizontal = more machines. Vertical = a bigger machine."],
    ["What does a circuit breaker do when it's OPEN?", ["Sends all traffic to the failing service", "Rejects calls quickly without calling the failing service", "Restarts the database", "Doubles the timeout"], 1, "It fails fast for a cool-down period, then tries a test call (half-open)."],
    ["RPO answers which question?", ["How long can we be down?", "How much data can we afford to lose?", "How many users do we have?", "How fast is the CDN?"], 1, "RPO = data loss tolerance. RTO = downtime tolerance."],
    ["A celebrity with 100M followers posts. Which feed strategy avoids 100M writes?", ["Fan-out on write for everyone", "Fan-out on read (pull) for celebrities", "No caching", "Bigger load balancer"], 1, "Big apps use a hybrid: push for normal users, pull for celebrities."],
    ["Two fans buy the last seat at the same instant. What prevents double-booking?", ["Adding more servers", "One conditional UPDATE … WHERE the seat is still free", "A bigger cache", "Switching to HTTP/3"], 1, "Check-and-set in a single atomic statement lets only one request win."],
    ["A pod crashes in Kubernetes. What happens?", ["Nothing until a human notices", "A replacement starts to match the desired count", "The whole deployment is deleted", "The cluster shuts down"], 1, "Its control loop keeps comparing desired vs actual and fixes the difference."],
    ["What problem does the outbox pattern solve?", ["Slow DNS lookups", "Saving data AND publishing its event can't both be guaranteed (dual write)", "Too many images", "Clock skew"], 1, "The event is saved in the same transaction; a relay publishes it later."],
    ["In RAG, what happens before the model answers?", ["The model is retrained", "Relevant documents are retrieved and added to the prompt", "The answer is cached forever", "The GPU restarts"], 1, "Retrieval-augmented generation = an open-book exam."],
    ["Why give a fencing token with a lock?", ["To encrypt the data", "So a paused worker with an expired lock can't overwrite newer data", "To speed up DNS", "To count visitors"], 1, "Storage rejects writes carrying an older token number."],
  ];
  let i = 0, score = 0, answers = [];
  const box = $("#quizBox");
  function bar() { return `<div class="qbar">${Q.map((_, k) => `<i class="${answers[k] === true ? "r" : answers[k] === false ? "w" : k === i ? "c" : ""}"></i>`).join("")}</div>`; }
  function render() {
    if (i >= Q.length) return finish();
    const [q, opts] = Q[i];
    const order = opts.map((_, k) => k).sort(() => Math.random() - 0.5); // shuffle answer positions
    box.innerHTML = `${bar()}<p class="muted mb0">Question ${i + 1} of ${Q.length} · score ${score}</p><p class="quiz-q">${q}</p>
      <div class="opts">${order.map((k, pos) => `<button class="opt" data-k="${k}">${"ABCD"[pos]}. ${opts[k]}</button>`).join("")}</div><div class="explain"></div>`;
  }
  box.addEventListener("click", (e) => {
    const b = e.target.closest(".opt");
    if (b && !b.disabled) {
      const [, , ans, why] = Q[i], k = +b.dataset.k, ok = k === ans;
      answers[i] = ok; if (ok) score++;
      $$(".opt", box).forEach((o) => { const j = +o.dataset.k; o.disabled = true; if (j === ans) o.classList.add("right"); else if (j === k) o.classList.add("wrong"); });
      SD.$(".explain", box).innerHTML = `<div class="callout ${ok ? "good" : "warn"} mb0"><span class="lbl">${ok ? "✅ Correct!" : "❌ Not quite"}</span><p>${why}</p><button class="btn primary sm" data-next>${i === Q.length - 1 ? "See my score 🏁" : "Next question ⏭"}</button></div>`;
      return;
    }
    if (e.target.closest("[data-next]")) { i++; render(); }
    if (e.target.closest("[data-restart]")) { i = 0; score = 0; answers = []; render(); }
  });
  function finish() {
    const pct = score / Q.length, badge = pct >= 0.8;
    const best = Math.max(score, SD.store.get("sd-quiz-best", 0)); SD.store.set("sd-quiz-best", best);
    box.innerHTML = `${bar()}<div class="center"><div class="big-score">${score} / ${Q.length}</div>
      <p class="lead">${badge ? "🏅 You earned the <b>System Design Explorer</b> badge! Amazing!" : pct >= 0.5 ? "👍 Nice work! Revisit a few chapters and try again." : "🌱 Great start! Every expert began here — explore the chapters and come back."}</p>
      <p class="muted">Best score on this device: ${best}/${Q.length}</p>
      <button class="btn primary" data-restart>🔁 Try again</button> <a class="btn" href="world.html">🌍 Visit the 3D world</a></div>`;
    if (badge) SD.confetti(140);
  }
  render();
})();
