/* Chapter 11 — Design Doc & Playbook */
(function () {
  const { $, $$ } = SD;

  /* ---------- 8-step method ---------- */
  const STEPS = [
    ["🎯", "Clarify", "5 min", "Understand what to build before building it.", ["List the <b>functional</b> requirements (what it does).", "List the <b>non-functional</b> ones (scale, latency, availability, consistency).", "Agree on what's <b>out of scope</b>."], "“Should we support group chats, or just 1:1 for now?”", "A short list of must-haves + numbers to aim for."],
    ["🧮", "Estimate", "3–5 min", "Napkin math tells you how big the problem is.", ["Users → requests/sec (average and peak).", "Storage per day and over the years.", "Bandwidth, and memory for caches."], "“300M daily users × 10 feed loads ≈ 35K reads/sec.”", "Rough QPS, storage and bandwidth numbers."],
    ["🔌", "API", "3 min", "Define how the outside world talks to your system.", ["Main endpoints with inputs & outputs.", "Pagination, auth, idempotency keys.", "Sync vs async (return a job ID?)."], "<code>POST /v1/links {url} → {code}</code>", "3–6 key endpoints."],
    ["🗂️", "Data model", "5 min", "What data you keep and how you'll read it.", ["Entities and their relationships.", "Access patterns → indexes and keys.", "Pick a database type and justify it."], "“Messages partitioned by chat_id, sorted by time.”", "Tables/collections + DB choice."],
    ["🖼️", "High-level design", "10 min", "Boxes and arrows for the whole system.", ["Draw clients, LB, services, caches, DBs, queues.", "Walk through the main flows step by step.", "Make sure every requirement is covered."], "“A post goes to the post service, then a fan-out queue…”", "One clear diagram everyone agrees on."],
    ["🔬", "Deep dives", "10–15 min", "Zoom into the hardest, most interesting parts.", ["Scaling the hot path (caching, sharding).", "Consistency & concurrency (no double booking!).", "Special algorithms (geo index, ranking, IDs)."], "“How do we handle a celebrity with 100M followers?”", "Detailed designs for 2–3 critical pieces."],
    ["💥", "Bottlenecks & failures", "5 min", "Break your own design before reality does.", ["Find single points of failure.", "What if a node, a zone or a region dies?", "Hot keys, traffic spikes, slow dependencies; monitoring."], "“If Redis dies, we fall back to the DB with rate limiting.”", "Failure table + mitigations."],
    ["⚖️", "Trade-offs & wrap-up", "2–3 min", "Show you understand the costs of your choices.", ["Summarize the design in 30 seconds.", "Name the trade-offs you accepted and why.", "What you'd improve with more time."], "“We chose eventual consistency for feeds to keep reads fast.”", "A confident summary + next steps."],
  ];
  $("#road").innerHTML = STEPS.map((s, i) => `<button class="mile" data-i="${i}"><span class="dot">${s[0]}</span><span class="t">${i + 1}. ${s[1]}</span></button>`).join("");
  function showStep(i) {
    const [e, t, time, why, todo, ex, out] = STEPS[i];
    $$("#road .mile").forEach((m) => m.classList.toggle("on", +m.dataset.i === i));
    $("#stepCard").innerHTML = `
      <div class="row" style="justify-content:space-between"><h3 class="mb0">${e} Step ${i + 1}: ${t}</h3><span class="time-badge">⏱️ ${time}</span></div>
      <p class="lead mt">${why}</p>
      <div class="step-detail"><div><b>What to do</b><ul>${todo.map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div class="stack"><div class="sticky b small"><b>💬 Sounds like:</b> ${ex}</div><div class="sticky g small"><b>📦 You end with:</b> ${out}</div></div></div>
      <div class="row mt"><button class="btn sm" data-go="${i - 1}" ${i === 0 ? "disabled" : ""}>⏮ Back</button><button class="btn primary sm" data-go="${i + 1}" ${i === STEPS.length - 1 ? "disabled" : ""}>Next step ⏭</button></div>`;
  }
  $("#road").addEventListener("click", (e) => { const m = e.target.closest(".mile"); if (m) showStep(+m.dataset.i); });
  $("#stepCard").addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) showStep(+b.dataset.go); });
  showStep(0);

  /* ---------- doc template ---------- */
  const SECTIONS = [
    ["📌", "1. Summary (TL;DR)", "One paragraph a busy person can read: what, why, and the key idea of the solution."],
    ["🧩", "2. Context & problem", "What hurts today, why now, what happens if we do nothing. Link specs, incidents, past docs."],
    ["🎯", "3. Goals & non-goals", "Goals are measurable. Non-goals are just as important: they stop scope creep."],
    ["📋", "4. Requirements", "Functional list + a table of non-functional targets: scale, latency (p99), availability, consistency, durability, security, cost."],
    ["🧮", "5. Estimates", "Back-of-the-envelope numbers: QPS (avg/peak), read:write, storage over time, bandwidth, cache size."],
    ["🖼️", "6. High-level design", "The main diagram + what each component does + a walk-through of key flows."],
    ["🔌", "7. API design", "Endpoints, request/response shapes, errors, pagination, idempotency, versioning."],
    ["🗂️", "8. Data model & storage", "Entities, access patterns, indexes, DB choice (and why), sharding key, replication."],
    ["🔬", "9. Deep dives", "The hard parts in detail: algorithms, caching strategy, consistency, concurrency."],
    ["📈", "10. Scalability & performance", "How each piece scales, hot spots, capacity plan, load tests."],
    ["💥", "11. Reliability & failure modes", "A table: failure → impact → detection → mitigation. Timeouts, retries, backups, RPO/RTO."],
    ["🔐", "12. Security & privacy", "AuthN/AuthZ, encryption, secrets, PII, abuse & rate limits, threat model."],
    ["🔭", "13. Observability", "SLIs/SLOs, dashboards, alerts (with runbooks), logs, traces."],
    ["🚀", "14. Rollout & migration", "Feature flags, canary, data backfill, rollback plan."],
    ["🔀", "15. Alternatives considered", "Other options with pros/cons and why they lost. Shows you thought it through."],
    ["⚖️", "16. Trade-offs, risks, open questions", "What you knowingly gave up, what could go wrong, what's still undecided (with owners)."],
    ["💰", "17. Cost & 🗓️ 18. Timeline", "Monthly cost estimate; milestones and who does what."],
  ];
  $("#docSections").innerHTML = SECTIONS.map(([e, h, d], i) => `<details class="sec-card" ${i === 0 ? "open" : ""}><summary>${e} ${h}</summary><p class="mb0">${d}</p></details>`).join("");

  const BLANK = `# Design Doc: <System name>

| | |
|---|---|
| **Author(s)** | |
| **Reviewers** | |
| **Status** | Draft / In review / Approved |
| **Last updated** | YYYY-MM-DD |

## 1. Summary (TL;DR)
One paragraph: what we're building, why, and the key idea of the solution.

## 2. Context & problem
- What problem do users have today?
- Why now? What happens if we do nothing?
- Links: product spec, past docs, incidents.

## 3. Goals and non-goals
**Goals**
- G1:
- G2:

**Non-goals** (explicitly out of scope)
- NG1:

## 4. Requirements
### Functional
- Users can …
- Users can …

### Non-functional
| Quality | Target |
|---|---|
| Scale | e.g. 10M DAU, 5K req/s peak |
| Latency | e.g. p99 < 200 ms for reads |
| Availability | e.g. 99.95% per month |
| Consistency | e.g. read-your-writes for profiles |
| Durability | e.g. no acknowledged write lost |
| Security / compliance | e.g. PII encrypted, deletion within 30 days |
| Cost | e.g. < $X / month |

## 5. Back-of-the-envelope estimates
- Traffic: avg / peak QPS, read:write ratio
- Storage: item size × items/day × retention × replication
- Bandwidth and cache memory

## 6. High-level design
- Architecture diagram (boxes & arrows)
- Components and responsibilities
- Walk-through of the key flows

## 7. API design
| Method | Endpoint | Request | Response | Notes |
|---|---|---|---|---|
| POST | /v1/… | | | idempotency key |
| GET | /v1/… | | | cursor pagination |

## 8. Data model & storage
- Entities, fields, relationships
- Access patterns → indexes
- Database choice and why
- Partition/shard key, replication

## 9. Detailed design / deep dives
- The hardest parts: algorithms, caching, consistency, concurrency

## 10. Scalability & performance
- How each component scales, hot spots, capacity plan

## 11. Reliability & failure modes
| Failure | Impact | Detection | Mitigation |
|---|---|---|---|
| | | | |

- Timeouts, retries (backoff + jitter), circuit breakers, degradation
- Backups, RPO / RTO, multi-zone / multi-region

## 12. Security & privacy
- AuthN / AuthZ, encryption, secrets, PII, abuse & rate limiting, threat model

## 13. Observability
- SLIs / SLOs, dashboards, alerts (+ runbooks), logs, traces

## 14. Rollout, migration & rollback
- Feature flags, canary plan, data migration/backfill, rollback steps

## 15. Alternatives considered
| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| | | | |

## 16. Trade-offs, risks & open questions
- Trade-offs we accept and why
- Risks and mitigations
- Open questions (owner, due date)

## 17. Cost estimate

## 18. Timeline & milestones

## Appendix
- Glossary, references, benchmarks
`;

  const EX = `# Design Doc: Link Shortener ("sho.rt")

| | |
|---|---|
| **Author(s)** | You |
| **Status** | Draft |

## 1. Summary
A service that turns long URLs into 7-character codes (sho.rt/aZ3k9Q) and redirects clicks in under 50 ms. Codes are base62-encoded unique IDs stored in a sharded key-value store, with hot links cached in Redis and click analytics processed asynchronously.

## 2. Context & problem
Marketing links are long and ugly, and we can't see how many people click them.

## 3. Goals and non-goals
**Goals:** create short links; fast, reliable redirects; click counts per link.
**Non-goals:** link previews, QR codes, editing a link's destination (v2).

## 4. Requirements
### Functional
- Create a short link (optional custom alias, optional expiry)
- Redirect short → long
- See total clicks per link

### Non-functional
| Quality | Target |
|---|---|
| Scale | 100M new links/month, 10B redirects/month |
| Latency | redirect p99 < 50 ms |
| Availability | 99.99% for redirects |
| Consistency | a code never maps to two URLs |
| Durability | links live 10 years |

## 5. Estimates
- Writes ≈ 40/s; reads ≈ 4K/s avg, ~12K/s peak (100:1 read-heavy)
- Storage: 12B links × 500 B ≈ 6 TB over 10 years (×3 replicas = 18 TB)
- Cache: top 20% of daily links ≈ a few GB of RAM

## 6. High-level design
Users → Load balancer → Create API / Redirect service.
Create API → Key generator → KV store.
Redirect service → Redis cache → (miss) KV store → 302 to long URL.
Redirect service → click events queue → counter workers → analytics warehouse.

## 7. API design
| Method | Endpoint | Request | Response |
|---|---|---|---|
| POST | /v1/links | { url, alias?, expiresAt? } | { code, shortUrl } |
| GET | /{code} | – | 302 Location: longUrl |
| GET | /v1/links/{code}/stats | – | { clicks } |

## 8. Data model & storage
- links(code PK, long_url, owner_id, created_at, expires_at)
- Key-value store sharded by code (no joins needed)
- Analytics in a columnar warehouse

## 9. Deep dives
- **Code generation:** each app server leases a range of 1M IDs from a counter service and base62-encodes them (with a bit-shuffle so codes aren't guessable). No collisions, no lookups.
- **Hot links:** cache-aside in Redis with a 24 h TTL; popular codes also cached at the CDN.

## 11. Reliability & failure modes
| Failure | Impact | Mitigation |
|---|---|---|
| Redis down | slower redirects | fall back to KV store; rate-limit |
| KV shard down | some links fail | 3 replicas per shard, automatic failover |
| Counter service down | can't create links | servers hold pre-leased ID ranges |
| Queue backlog | stats delayed | autoscale workers on queue length |

## 12. Security
Block known-malicious URLs at creation, rate-limit creation per user/IP, no open redirects to blocked domains.

## 15. Alternatives considered
| Option | Why not |
|---|---|
| MD5(url) truncated | collisions need checks; same URL always same code |
| SQL with auto-increment | single writer bottleneck; guessable codes |

## 16. Trade-offs
302 instead of 301: more redirect load, but every click is counted. Analytics are eventually consistent (seconds behind).
`;
  $("#mdBlank").textContent = BLANK; $("#mdEx").textContent = EX;
  const current = () => (SD.$('[data-tab="ex"]').getAttribute("aria-selected") === "true" ? ["link-shortener-design-doc.md", EX] : ["design-doc-template.md", BLANK]);
  $("#copyMd").addEventListener("click", () => SD.copy(current()[1]));
  $("#dlMd").addEventListener("click", () => { const [n, t] = current(); SD.download(n, t); });

  /* ---------- practice ---------- */
  const PR = [["🔗 URL shortener", "link"], ["💬 Chat app", "chat"], ["📰 News feed", "feed"], ["🎬 Video streaming", "video"], ["🚕 Ride sharing", "ride"], ["🔔 Notification system", "notify"],
    ["🪣 Rate limiter", "ratelimit"], ["📁 File sync (cloud drive)", "filesync"], ["🕷️ Web crawler", "crawler"], ["🔤 Search autocomplete", "typeahead"], ["💳 Payment system", "payments"], ["🎟️ Ticket booking (no double booking!)", "booking"], ["🤖 AI support chatbot (RAG)"], ["🏆 Game leaderboard"], ["🔑 Distributed key-value store"], ["⚡ Distributed cache"], ["📊 Metrics & monitoring system"], ["🗺️ Maps & directions"], ["🏨 Hotel reservations"]];
  $("#practiceList").innerHTML = PR.map(([l, id]) => id ? `<a class="chip" href="cases.html#${id}">${l} 🔗</a>` : `<span class="chip">${l}</span>`).join("");
})();
