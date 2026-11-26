/* Chapter 9 — Real-World Designs */
(function () {
  const { $, $$, flow } = SD;
  const F = { flow: 1 };
  const CASES = [
    {
      id: "link", em: "🔗", t: "Link Shortener",
      what: "Turn <code>https://a-very-long-site.com/blog/2026/how-to-…</code> into <code>sho.rt/aZ3k9Q</code>, and send anyone who clicks it to the right page — fast.",
      func: ["Create a short link for a long URL", "Redirect short → long", "Optional custom alias & expiry", "Count clicks (analytics)"],
      nfr: ["Redirects super fast (p99 &lt; 50 ms)", "Highly available — broken links are terrible", "Codes must never collide", "Read-heavy: ~100 clicks per new link"],
      nums: [["New links", "100M / month ≈ 40/s"], ["Redirects", "10B / month ≈ 4K/s (peak ~12K)"], ["Storage (10 yrs)", "12B links × 500 B ≈ 6 TB"], ["Code length", "7 chars base62 = 3.5 trillion"]],
      cfg: { w: 760, h: 380, minW: 600, groups: [{ x: 300, y: 205, w: 450, h: 165, label: "async analytics", c: "purple" }],
        nodes: [{ id: "u", x: 60, y: 120, w: 90, h: 64, icon: "🙋", label: "Users", c: "blue" }, { id: "lb", x: 190, y: 120, w: 96, h: 56, icon: "🚦", label: "LB", c: "orange" },
          { id: "w", x: 340, y: 50, w: 130, h: 52, label: "✍️ Create API", c: "yellow", small: 1 }, { id: "r", x: 340, y: 140, w: 130, h: 52, label: "↪️ Redirect svc", c: "yellow", small: 1 },
          { id: "k", x: 520, y: 50, w: 140, h: 52, label: "🔑 Key generator", c: "pink", small: 1 }, { id: "c", x: 520, y: 140, w: 110, h: 50, label: "⚡ Cache", c: "red" },
          { id: "db", x: 690, y: 95, w: 120, h: 84, icon: "🗄️", label: "KV store\n(sharded)", c: "green", shape: "db", small: 1 },
          { id: "q", x: 400, y: 290, w: 120, h: 50, label: "📢 Click events", c: "purple", small: 1 }, { id: "a", x: 560, y: 290, w: 110, h: 50, label: "👷 Counters", c: "pink", small: 1 }, { id: "dw", x: 690, y: 290, w: 100, h: 60, label: "📊 Warehouse", c: "teal", shape: "db", small: 1 }],
        edges: [["u", "lb", "", F], ["lb", "w"], ["lb", "r", "", F], ["w", "k", "get code"], ["w", "db"], ["r", "c", "", F], ["c", "db", "miss", { dash: 1 }], ["r", "q", "click!", { dash: 1 }], ["q", "a", "", F], ["a", "dw"]] },
      dec: [
        ["🔑", "Making codes", "Encode a unique number (from a counter range or Snowflake ID) in <b>base62</b> (a–z, A–Z, 0–9). Or pre-generate random codes in a <b>Key Generation Service</b> — no collision checks needed."],
        ["🗄️", "Storage", "It's just <code>code → URL</code>: a <b>key-value store</b> sharded by code is perfect. No JOINs needed."],
        ["⚡", "Cache the hot links", "A few viral links get most clicks (80/20). Cache them in Redis — or even at the CDN edge."],
        ["↪️", "301 vs 302", "<b>301</b> (permanent) lets browsers cache the redirect → less load but you miss clicks. <b>302</b> keeps every click countable."],
        ["📢", "Analytics off the hot path", "Redirect immediately, then publish a click event to a queue. Counting happens later."],
      ],
      trade: ["Hashing the URL gives the same code for the same URL but needs collision handling; a counter is collision-free but guessable (add a random salt / shuffle).", "Strong consistency is only needed on create (no duplicate codes); redirects can use eventually-consistent replicas & caches."],
    },
    {
      id: "chat", em: "💬", t: "Chat App",
      what: "Send messages to friends and groups instantly, see ✓✓ ticks and who's online — like the messaging apps on your phone.",
      func: ["1:1 and group chats", "Delivered / read receipts", "Online & last seen", "Photos & videos", "Push when offline"],
      nfr: ["Real-time delivery (&lt; 200 ms)", "Never lose a message", "Messages in order per chat", "Hundreds of millions of open connections", "Privacy: end-to-end encryption"],
      nums: [["Daily users", "500M"], ["Messages", "20B / day ≈ 230K/s"], ["Text storage", "≈ 2 TB / day"], ["Open connections", "~100M+ at peak"]],
      cfg: { w: 760, h: 400, minW: 600,
        nodes: [{ id: "a", x: 60, y: 90, w: 90, h: 60, icon: "📱", label: "Ana", c: "blue" }, { id: "b", x: 60, y: 300, w: 90, h: 60, icon: "📱", label: "Bo", c: "pink" },
          { id: "s1", x: 240, y: 90, w: 130, h: 56, label: "🔌 Chat server 1", c: "yellow", small: 1 }, { id: "s2", x: 240, y: 300, w: 130, h: 56, label: "🔌 Chat server 2", c: "yellow", small: 1 },
          { id: "reg", x: 440, y: 195, w: 140, h: 56, label: "🗂️ Who's where?\n(session registry)", c: "red", small: 1 },
          { id: "db", x: 650, y: 90, w: 140, h: 84, icon: "🧱", label: "Message store\n(wide-column)", c: "green", shape: "db", small: 1 },
          { id: "q", x: 470, y: 330, w: 120, h: 50, label: "📬 Offline queue", c: "purple", small: 1 }, { id: "push", x: 660, y: 330, w: 130, h: 50, label: "🔔 Push service", c: "orange", small: 1 },
          { id: "m", x: 650, y: 210, w: 130, h: 50, label: "🪣 Media + CDN", c: "gray", small: 1 }],
        edges: [["a", "s1", "WebSocket", { two: 1, flow: 1 }], ["b", "s2", "WebSocket", { two: 1 }], ["s1", "reg", "where is Bo?", { dash: 1 }], ["s1", "s2", "deliver", { flow: 1, bend: -30 }], ["s1", "db", "store", F], ["s2", "q", "Bo offline?", { dash: 1 }], ["q", "push", "", F], ["a", "m", "upload", { dash: 1, bend: -70 }]] },
      dec: [
        ["🔌", "Persistent connections", "Each phone keeps a <b>WebSocket</b> open to a chat server, so messages can be pushed instantly both ways."],
        ["🗂️", "Session registry", "A fast store (Redis) maps <code>user → which chat server</code>, so server 1 can forward Ana's message to Bo's server."],
        ["🧱", "Message storage", "A wide-column DB partitioned by <code>chat_id</code>, sorted by message time/ID — perfect for “load the last 50 messages”."],
        ["📬", "Offline users", "If Bo is offline, the message waits; a push notification wakes his phone, which then syncs."],
        ["✓✓", "Receipts", "✓ = server stored it · ✓✓ = Bo's phone acknowledged · blue ✓✓ = Bo opened the chat. Each is just a small event."],
      ],
      trade: ["Big groups: fan-out on send to 1,000 members is costly — store once per group and let members pull.", "End-to-end encryption means servers can't read messages → no server-side search, but much better privacy."],
    },
    {
      id: "feed", em: "📰", t: "News Feed",
      what: "Open the app and instantly see the latest posts from everyone you follow, ranked so the best stuff is on top.",
      func: ["Create posts (text, photos)", "Follow people", "See a ranked feed", "Like & comment"],
      nfr: ["Feed loads in &lt; 200 ms", "Read-heavy (scroll ≫ post)", "Eventual consistency is fine (a post can show up seconds later)", "Handle celebrities with 100M followers"],
      nums: [["Daily users", "300M"], ["Feed loads", "3B / day ≈ 35K/s"], ["New posts", "50M / day ≈ 600/s"], ["Avg followers", "~200 (some have 100M!)"]],
      cfg: { w: 760, h: 400, minW: 600,
        nodes: [{ id: "u", x: 60, y: 200, w: 90, h: 64, icon: "🙋", label: "Users", c: "blue" }, { id: "lb", x: 175, y: 200, w: 80, h: 56, label: "🚦 LB", c: "orange" },
          { id: "ps", x: 320, y: 70, w: 120, h: 52, label: "✍️ Post service", c: "yellow", small: 1 }, { id: "fs", x: 320, y: 320, w: 120, h: 52, label: "📰 Feed service", c: "yellow", small: 1 },
          { id: "pdb", x: 500, y: 60, w: 110, h: 64, label: "Posts DB", c: "green", shape: "db", small: 1 }, { id: "q", x: 470, y: 180, w: 110, h: 48, label: "📬 Fan-out queue", c: "purple", small: 1 },
          { id: "fw", x: 640, y: 180, w: 120, h: 48, label: "👷 Fan-out workers", c: "pink", small: 1 }, { id: "fc", x: 640, y: 320, w: 130, h: 56, label: "⚡ Feed cache\n(per-user lists)", c: "red", small: 1 },
          { id: "g", x: 680, y: 60, w: 110, h: 56, label: "🕸️ Follower graph", c: "teal", small: 1 }, { id: "rk", x: 470, y: 330, w: 100, h: 46, label: "🎯 Ranking", c: "orange", small: 1 }],
        edges: [["u", "lb", "", F], ["lb", "ps"], ["lb", "fs", "", F], ["ps", "pdb"], ["ps", "q", "new post!", F], ["q", "fw", "", F], ["fw", "g", "who follows?", { dash: 1 }], ["fw", "fc", "push post id", F], ["fs", "rk"], ["rk", "fc", "", { two: 1 }]] },
      dec: [
        ["📤", "Fan-out on write (push)", "When you post, workers add the post ID to every follower's precomputed feed. Reads are instant! But a celebrity post = 100M writes. 😰"],
        ["📥", "Fan-out on read (pull)", "Build the feed when someone opens the app by fetching from everyone they follow. Cheap writes, slow reads."],
        ["🤝", "Hybrid (what big apps do)", "Push for normal users; for celebrities, pull their posts at read time and merge. Best of both."],
        ["⚡", "Store IDs, not posts", "Feed cache keeps lists of post IDs; post content is fetched (and cached) separately."],
        ["📜", "Cursor pagination", "“Give me 20 posts after post #9876” — stable even while new posts arrive."],
      ],
      trade: ["Precomputing feeds uses lots of memory for inactive users — only precompute for active users.", "Ranking improves engagement but adds latency and complexity; chronological is simpler and more predictable."],
    },
    {
      id: "video", em: "🎬", t: "Video Streaming",
      what: "Creators upload videos; millions watch smoothly on any device and connection, from anywhere in the world.",
      func: ["Upload videos (huge files)", "Process into many qualities", "Stream with adaptive quality", "Search & recommendations"],
      nfr: ["No buffering — smooth playback", "Massive bandwidth, global reach", "Uploads never lost", "Cost-efficient storage"],
      nums: [["Uploads", "500+ hours / minute"], ["Storage per video", "~5 qualities × chunks"], ["Watching", "Tbps of traffic at peak"], ["Most views", "go to a small % of videos"]],
      cfg: { w: 760, h: 380, minW: 600,
        nodes: [{ id: "cr", x: 60, y: 80, w: 92, h: 60, icon: "🎥", label: "Creator", c: "pink" }, { id: "up", x: 210, y: 80, w: 120, h: 52, label: "⬆️ Upload svc", c: "yellow", small: 1 },
          { id: "raw", x: 380, y: 80, w: 110, h: 62, label: "🪣 Raw files", c: "gray", shape: "db", small: 1 }, { id: "q", x: 530, y: 80, w: 100, h: 48, label: "📬 Jobs", c: "purple", small: 1 },
          { id: "tw", x: 680, y: 80, w: 120, h: 56, label: "👷 Transcoders\n240p → 4K", c: "orange", small: 1 }, { id: "out", x: 680, y: 220, w: 120, h: 66, label: "🪣 Video chunks", c: "gray", shape: "db", small: 1 },
          { id: "cdn", x: 450, y: 300, w: 130, h: 60, label: "🌐 CDN edges", c: "teal", small: 1 }, { id: "v", x: 120, y: 300, w: 100, h: 64, icon: "🍿", label: "Viewers", c: "blue" },
          { id: "meta", x: 270, y: 200, w: 120, h: 56, label: "🗄️ Metadata\n+ search", c: "green", small: 1 }],
        edges: [["cr", "up", "chunks", F], ["up", "raw", "", F], ["raw", "q", "new video"], ["q", "tw", "", F], ["tw", "out", "", F], ["out", "cdn", "", F], ["cdn", "v", "4 s segments", F], ["up", "meta", "", { dash: 1 }], ["v", "meta", "browse", { dash: 1 }]] },
      dec: [
        ["🧩", "Chunked, resumable uploads", "Big files go up in pieces (straight to object storage with pre-signed URLs), so a dropped connection doesn't restart from zero."],
        ["🏭", "Transcoding pipeline", "Split the video into chunks, encode each in parallel into many resolutions & formats. A queue + workers make it scale."],
        ["📶", "Adaptive bitrate (HLS/DASH)", "Video is cut into ~4-second segments in several qualities. The player picks the best quality for each segment based on your current speed."],
        ["🌐", "CDN does the heavy lifting", "Popular videos are cached (or pre-pushed) at edges — some services even place cache boxes inside internet providers."],
        ["🧊", "Hot vs cold storage", "Rarely-watched old videos move to cheaper, slower storage tiers."],
      ],
      trade: ["Encoding more qualities = smoother playback for everyone, but more compute & storage cost.", "Pre-pushing to edges uses bandwidth up front; pulling on demand makes the first viewer wait."],
    },
    {
      id: "ride", em: "🚕", t: "Ride Sharing",
      what: "Tap a button, see cars nearby, get matched with a driver in seconds, and watch them drive toward you on a map.",
      func: ["See nearby drivers", "Request & match a ride", "Live location tracking", "Pricing (with surge)", "Payments & ratings"],
      nfr: ["Match in a few seconds", "Location updates every few seconds", "One driver per ride — no double booking!", "Always available (people get stranded otherwise)"],
      nums: [["Active drivers", "5M"], ["Location pings", "every 4 s → ~1.25M/s"], ["Ride requests", "~20M / day"], ["Location data", "mostly temporary (kept in memory)"]],
      cfg: { w: 760, h: 380, minW: 600,
        nodes: [{ id: "d", x: 60, y: 80, w: 92, h: 60, icon: "🚗", label: "Drivers", c: "yellow" }, { id: "r", x: 60, y: 290, w: 92, h: 60, icon: "🙋", label: "Riders", c: "blue" },
          { id: "loc", x: 230, y: 80, w: 130, h: 52, label: "📍 Location svc", c: "orange", small: 1 }, { id: "geo", x: 430, y: 80, w: 140, h: 58, label: "🗺️ Geo index\n(in-memory)", c: "red", small: 1 },
          { id: "ride", x: 230, y: 290, w: 120, h: 52, label: "🚕 Ride svc", c: "yellow", small: 1 }, { id: "m", x: 430, y: 200, w: 120, h: 52, label: "🤝 Matching", c: "pink", small: 1 },
          { id: "trip", x: 630, y: 290, w: 120, h: 70, label: "🗄️ Trips DB\n(strong)", c: "green", shape: "db", small: 1 }, { id: "price", x: 430, y: 310, w: 110, h: 48, label: "💲 Pricing", c: "teal", small: 1 },
          { id: "k", x: 640, y: 80, w: 120, h: 52, label: "📢 Location stream", c: "purple", small: 1 }],
        edges: [["d", "loc", "ping every 4 s", F], ["loc", "geo", "", F], ["loc", "k", "", { dash: 1 }], ["r", "ride", "request", F], ["ride", "m", "", F], ["m", "geo", "who's near?", { dash: 1 }], ["m", "d", "offer ride", { dash: 1, bend: -60 }], ["ride", "price"], ["m", "trip", "lock driver", F]] },
      dec: [
        ["🗺️", "Geospatial index", "Divide the map into cells (geohash squares, quadtrees, or hexagons). To find drivers near you, look in your cell and its neighbors — not the whole planet. Try it below ↓"],
        ["🧠", "Keep locations in memory", "1M+ updates/sec are short-lived. Store the latest position in an in-memory index; stream history to analytics."],
        ["🔒", "No double booking", "Assigning a driver uses a lock / conditional write in a strongly consistent store — one ride per driver, guaranteed."],
        ["🏙️", "Shard by region", "Most activity is local, so split by city/region. Each region can run mostly independently."],
        ["📡", "Push updates", "Riders and drivers keep WebSocket connections for live tracking and offers."],
      ],
      trade: ["More frequent location pings = smoother maps and better matches, but more battery and server load.", "Bigger cells = simpler, fewer lookups but less precise; smaller cells = precise but more cells to scan."],
      extra: "geo",
    },
    {
      id: "notify", em: "🔔", t: "Notification System",
      what: "Any team can send push, SMS or email to millions of users — reliably, without spamming, and without sending the same thing twice.",
      func: ["Push, SMS, email channels", "User preferences & quiet hours", "Templates", "Scheduling & campaigns", "Delivery tracking"],
      nfr: ["At-least-once, but no visible duplicates", "Handle huge spikes (campaigns)", "One-time codes in seconds", "Respect rate limits of providers"],
      nums: [["Notifications", "~1B / day"], ["Campaign spike", "50M in 10 minutes"], ["OTP codes", "must arrive in &lt; 10 s"], ["Providers", "APNs/FCM, SMS & email gateways"]],
      cfg: { w: 760, h: 400, minW: 600,
        nodes: [{ id: "s", x: 60, y: 200, w: 100, h: 64, icon: "🏢", label: "Other services", c: "blue", small: 1 }, { id: "api", x: 210, y: 200, w: 120, h: 60, label: "🔔 Notify API\n(validate, dedupe)", c: "yellow", small: 1 },
          { id: "pref", x: 210, y: 60, w: 120, h: 52, label: "⚙️ Preferences", c: "teal", small: 1 },
          { id: "q1", x: 410, y: 80, w: 110, h: 46, label: "📬 push queue", c: "purple", small: 1 }, { id: "q2", x: 410, y: 200, w: 110, h: 46, label: "📬 SMS queue", c: "purple", small: 1 }, { id: "q3", x: 410, y: 320, w: 110, h: 46, label: "📬 email queue", c: "purple", small: 1 },
          { id: "w1", x: 570, y: 80, w: 90, h: 46, label: "👷 push", c: "pink", small: 1 }, { id: "w2", x: 570, y: 200, w: 90, h: 46, label: "👷 SMS", c: "pink", small: 1 }, { id: "w3", x: 570, y: 320, w: 90, h: 46, label: "👷 email", c: "pink", small: 1 },
          { id: "p", x: 700, y: 200, w: 90, h: 120, label: "📡 3rd-party\nproviders", c: "gray", small: 1 }, { id: "dlq", x: 250, y: 330, w: 100, h: 46, label: "☠️ DLQ", c: "red", small: 1 }],
        edges: [["s", "api", "", F], ["api", "pref", "allowed?", { dash: 1 }], ["api", "q1", "", F], ["api", "q2", "", F], ["api", "q3", "", F], ["q1", "w1"], ["q2", "w2"], ["q3", "w3"], ["w1", "p", "", F], ["w2", "p", "", F], ["w3", "p", "", F], ["q3", "dlq", "keeps failing", { dash: 1 }]] },
      dec: [
        ["📬", "One queue per channel", "A slow email provider must not delay push notifications. Separate queues and worker pools (bulkheads!)."],
        ["🔑", "Idempotency & dedupe", "Each notification has a unique ID; workers skip IDs already sent, so retries never double-notify."],
        ["⭐", "Priorities", "Login codes jump the line; marketing campaigns wait. Use priority queues or separate lanes."],
        ["🔁", "Retries + DLQ", "Retry provider errors with backoff + jitter; after N tries, park it in a dead-letter queue."],
        ["🙅", "Respect the user", "Check preferences, quiet hours, unsubscribes and per-user rate limits before sending."],
      ],
      trade: ["Batching sends is cheaper and faster for campaigns but adds delay — never batch OTP codes.", "Exactly-once is impossible across third-party providers; aim for at-least-once + dedupe."],
    },
    {
      id: "ratelimit", em: "🪣", t: "Rate Limiter",
      what: "Stop any single user or bot from flooding your API — e.g. at most 100 requests per minute — consistently across a whole fleet of servers.",
      func: ["Limit by user, IP or API key", "Different rules per endpoint &amp; plan", "Return 429 + Retry-After when over", "Change rules without deploying"],
      nfr: ["Adds only ~1 ms per request", "Accurate across many servers", "Highly available — never take the API down", "Millions of tracked keys"],
      nums: [["API traffic", "50K requests/s"], ["Tracked keys", "~10M users / IPs"], ["Counter memory", "10M × ~50 B ≈ 500 MB"], ["Redis ops", "~50K/s (one atomic op each)"]],
      cfg: { w: 760, h: 380, minW: 600,
        nodes: [{ id: "c", x: 65, y: 170, w: 100, h: 66, icon: "👥", label: "Clients", c: "blue" }, { id: "gw", x: 255, y: 170, w: 150, h: 76, icon: "🚪", label: "API gateway\n+ rate limiter", c: "orange", small: 1 },
          { id: "r", x: 470, y: 60, w: 130, h: 70, label: "⚡ Redis\n(counters)", c: "red", shape: "db", small: 1 }, { id: "cfg", x: 470, y: 310, w: 130, h: 56, label: "⚙️ Rules config", c: "gray", small: 1 },
          { id: "svc", x: 670, y: 170, w: 120, h: 66, icon: "🖥️", label: "Services", c: "yellow" }, { id: "no", x: 255, y: 330, w: 140, h: 52, label: "🚫 429 Too Many", c: "pink", small: 1 }],
        edges: [["c", "gw", "", F], ["gw", "r", "INCR + check (atomic)", { two: 1, flow: 1, flowC: "red" }], ["gw", "svc", "allowed ✅", F], ["gw", "no", "over limit", { dash: 1 }], ["cfg", "gw", "rules (cached)", { dash: 1 }]] },
      dec: [
        ["🪣", "Pick the algorithm", "Token bucket allows short bursts; a sliding-window counter is smooth and fair. Fixed windows are simplest but allow double bursts at the edges."],
        ["🚪", "Where it lives", "In the API gateway or shared middleware, so every service is protected before any expensive work happens."],
        ["⚡", "Shared counters", "Counters live in Redis and are updated with one atomic operation (a Lua script, or INCR + EXPIRE) so servers never race."],
        ["🏎️", "Stay fast", "Pre-count locally and sync to Redis in small batches — trading a little accuracy for speed."],
        ["🛟", "Fail open or closed?", "If Redis is down, usually let traffic through with a local backup limit — the limiter must never cause the outage."],
      ],
      trade: ["Exact global limits need a shared store (extra latency); local-only limits are fast but each server sees just its slice.", "Strict limits protect the system but frustrate power users — offer higher tiers and clear Retry-After headers."],
    },
    {
      id: "typeahead", em: "🔤", t: "Search Autocomplete",
      what: "As you type “sys…”, instantly suggest “system design”, “sysadmin”, “sydney”… ranked by how popular they are.",
      func: ["Top 5–10 suggestions per prefix", "Ranked by popularity &amp; freshness", "Trending boosts", "Typo tolerance (nice to have)"],
      nfr: ["&lt; 100 ms per keystroke", "Huge read volume (every keystroke!)", "Suggestions may be minutes–hours old", "Filter unsafe suggestions"],
      nums: [["Searches", "5B/day ≈ 60K/s"], ["Lookups", "~5 keystrokes each ≈ 300K/s"], ["Unique queries", "~100M"], ["Trie size", "tens of GB → shard by prefix"]],
      cfg: { w: 760, h: 380, minW: 600,
        groups: [{ x: 20, y: 230, w: 600, h: 140, label: "offline pipeline (hourly / daily)", c: "purple" }],
        nodes: [{ id: "u", x: 70, y: 110, w: 100, h: 66, icon: "⌨️", label: "Typing…", c: "blue" }, { id: "cdn", x: 230, y: 110, w: 130, h: 66, icon: "🌐", label: "Browser / CDN\ncache", c: "teal", small: 1 },
          { id: "svc", x: 410, y: 110, w: 130, h: 66, icon: "🔤", label: "Suggest service", c: "yellow", small: 1 }, { id: "trie", x: 640, y: 110, w: 150, h: 80, label: "🌳 Trie servers\n(top-k per prefix)", c: "green", small: 1 },
          { id: "logs", x: 100, y: 300, w: 120, h: 60, icon: "📜", label: "Query logs", c: "gray", small: 1 }, { id: "agg", x: 300, y: 300, w: 130, h: 60, icon: "🏭", label: "Count queries", c: "orange", small: 1 },
          { id: "bld", x: 500, y: 300, w: 130, h: 60, icon: "🔨", label: "Build tries", c: "pink", small: 1 }],
        edges: [["u", "cdn", "“sys”", F], ["cdn", "svc", "miss", F], ["svc", "trie", "", F], ["logs", "agg", "", F], ["agg", "bld"], ["bld", "trie", "publish", { dash: 1 }]] },
      dec: [
        ["🌳", "Trie with top-k", "A prefix tree where every node already stores its top-10 completions — answering is just walking down the typed letters. See below ↓"],
        ["🏭", "Build offline", "Aggregate query logs (hourly/daily batch, plus a fast stream for trending) and rebuild tries; swap them in atomically."],
        ["🌐", "Cache everywhere", "Browsers and CDNs cache short prefixes; the app waits ~100 ms after a keystroke (debouncing) to cut requests."],
        ["🍕", "Shard by prefix", "Split tries by first letters, balanced by traffic (not alphabet — many words start with “s”)."],
        ["🧹", "Filter", "Remove hateful or unsafe suggestions before publishing a new trie."],
      ],
      trade: ["Fresh trending suggestions need streaming updates; most of the trie can be rebuilt slowly.", "Precomputing top-k makes reads instant but uses more memory and makes updates heavier."],
      extra: "trie",
    },
    {
      id: "filesync", em: "📁", t: "Cloud File Sync",
      what: "Save a file on your laptop and it appears on your phone seconds later — even huge files, even edits made offline (think Dropbox / Google Drive).",
      func: ["Upload &amp; download files", "Auto-sync across devices", "Share with others", "Version history"],
      nfr: ["Never lose a file (very high durability)", "Resume big uploads", "Send only what changed", "Handle conflicting edits"],
      nums: [["Users", "100M (10% daily active)"], ["Files per user", "~1,000 · avg 500 KB"], ["Storage", "≈ 50 PB (+ copies)"], ["Changes", "~1M file edits/min"]],
      cfg: { w: 760, h: 380, minW: 600,
        nodes: [{ id: "lap", x: 65, y: 90, w: 100, h: 66, icon: "💻", label: "Laptop", c: "blue" }, { id: "ph", x: 65, y: 290, w: 100, h: 66, icon: "📱", label: "Phone", c: "pink" },
          { id: "api", x: 250, y: 190, w: 120, h: 66, icon: "🚪", label: "Sync API", c: "orange" },
          { id: "meta", x: 460, y: 80, w: 150, h: 80, label: "🗂️ Metadata DB\n(files, versions)", c: "green", shape: "db", small: 1 }, { id: "blk", x: 460, y: 300, w: 150, h: 80, label: "🪣 Block storage\n(4 MB chunks)", c: "gray", shape: "db", small: 1 },
          { id: "nt", x: 670, y: 190, w: 130, h: 70, icon: "🔔", label: "Change\nnotifier", c: "purple", small: 1 }],
        edges: [["lap", "api", "changed blocks only", F], ["api", "meta", "", F], ["lap", "blk", "upload chunks", { dash: 1, bend: 40 }], ["meta", "nt", "file v7!", F], ["nt", "ph", "sync now", { bend: 70, flow: 1, flowC: "purple" }], ["ph", "blk", "fetch new chunks", { dash: 1 }]] },
      dec: [
        ["🧩", "Chunk files", "Split files into ~4 MB blocks named by their hash. Edit one paragraph → only that block is uploaded."],
        ["♻️", "Deduplicate", "Same hash = same block. Identical files (like a popular attachment saved by 1,000 people) are stored once."],
        ["🗂️", "Metadata vs data", "A strongly consistent DB tracks files, versions and their block lists; the blocks live in cheap object storage."],
        ["🔔", "Notify devices", "Devices keep a long-poll/WebSocket open; when metadata changes, they fetch the new block list."],
        ["⚔️", "Conflicts", "Two offline edits to one file → keep both (“report (Bo's conflicted copy).docx”) instead of silently losing one."],
      ],
      trade: ["Smaller blocks save bandwidth on edits but mean more metadata to track.", "End-to-end encryption gives privacy but breaks server-side dedupe and search."],
    },
    {
      id: "booking", em: "🎟️", t: "Ticket Booking",
      what: "A hugely popular concert goes on sale: 2 million fans, 50,000 seats. Nobody may get the same seat — and the site must not melt.",
      func: ["Browse events &amp; seat maps", "Hold seats while paying (10 min)", "Pay and get tickets", "Release unpaid holds"],
      nfr: ["Never double-book (strong consistency)", "Survive a giant spike at sale time", "Fair — first come, first served", "Charge exactly once"],
      nums: [["Fans at start", "2M in the first minute"], ["Seats", "50K"], ["Peak requests", "~100K/s"], ["Hold time", "10 min TTL"]],
      cfg: { w: 760, h: 380, minW: 600,
        nodes: [{ id: "f", x: 65, y: 180, w: 100, h: 66, icon: "👥", label: "Fans", c: "blue" }, { id: "wr", x: 230, y: 180, w: 130, h: 72, icon: "⏳", label: "Virtual\nwaiting room", c: "purple", small: 1 },
          { id: "bk", x: 420, y: 180, w: 130, h: 66, icon: "🎟️", label: "Booking service", c: "yellow", small: 1 },
          { id: "st", x: 640, y: 80, w: 150, h: 80, label: "🗄️ Seats DB\n(status + hold expiry)", c: "green", shape: "db", small: 1 }, { id: "pay", x: 640, y: 290, w: 140, h: 66, icon: "💳", label: "Payments", c: "pink" },
          { id: "map", x: 230, y: 330, w: 130, h: 56, label: "🗺️ Seat map (CDN)", c: "teal", small: 1 }],
        edges: [["f", "wr", "", F], ["wr", "bk", "let in N/sec", F], ["bk", "st", "hold seat IF free", { two: 1 }], ["bk", "pay", "charge (idempotent)"], ["pay", "bk", "webhook: paid", { dash: 1, bend: 40 }], ["f", "map", "browse", { dash: 1 }]] },
      dec: [
        ["⏳", "Virtual waiting room", "Put everyone in a fair queue and admit a steady number per second — the system sees a smooth flow, not a stampede."],
        ["🔒", "Atomic seat holds", "UPDATE seats SET held_by = me, hold_until = now + 10 min WHERE id = 7 AND status = 'free' — only one request can win (see Distributed Deep Dives)."],
        ["⏰", "Holds expire", "Unpaid holds expire by TTL and seats automatically go back on sale."],
        ["💳", "Idempotent payment", "One idempotency key per order, so retries never charge twice; confirm via payment webhooks."],
        ["🗺️", "Cache the seat map", "The venue map is mostly static — serve it from a CDN; only live availability hits the database."],
      ],
      trade: ["Strong consistency on seats limits write speed — shard by event or section to scale.", "A waiting room adds delay for everyone, but keeps the sale fair and the site alive."],
    },
    {
      id: "payments", em: "💳", t: "Payment System",
      what: "Move money from buyers to sellers reliably — every cent accounted for, never charged twice, even when networks fail.",
      func: ["Charge cards &amp; wallets", "Refunds", "Pay out to sellers", "History &amp; receipts"],
      nfr: ["Exactly-once effect (no double charges)", "Every cent traceable (audit)", "Strong consistency for balances", "Security &amp; compliance (PCI)"],
      nums: [["Payments", "~10M/day ≈ 115/s (peaks 10×)"], ["Latency", "1–3 s (external providers)"], ["Ledger rows", "2+ per payment"], ["Retention", "many years (legal)"]],
      cfg: { w: 760, h: 380, minW: 600,
        nodes: [{ id: "co", x: 65, y: 175, w: 100, h: 66, icon: "🛒", label: "Checkout", c: "blue" }, { id: "ps", x: 245, y: 175, w: 130, h: 66, icon: "💳", label: "Payment service", c: "yellow", small: 1 },
          { id: "db", x: 450, y: 65, w: 150, h: 80, label: "🗄️ Payments DB\n(state machine)", c: "green", shape: "db", small: 1 }, { id: "psp", x: 450, y: 300, w: 150, h: 66, icon: "🏦", label: "Payment provider", c: "purple", small: 1 },
          { id: "led", x: 665, y: 65, w: 140, h: 80, label: "📒 Ledger\n(append-only)", c: "orange", shape: "db", small: 1 }, { id: "rec", x: 665, y: 300, w: 140, h: 66, icon: "🔍", label: "Reconciliation", c: "pink", small: 1 }],
        edges: [["co", "ps", "pay $20 + idempotency key", F], ["ps", "db", "PENDING"], ["ps", "psp", "charge", F], ["psp", "ps", "webhook: succeeded", { dash: 1, bend: -40 }], ["ps", "led", "debit buyer / credit seller", { bend: -50 }], ["psp", "rec", "settlement files", { dash: 1 }], ["rec", "led", "compare ✓", { dash: 1 }]] },
      dec: [
        ["🔑", "Idempotency keys", "Every request carries a unique key; a repeat returns the stored result instead of charging again."],
        ["🚦", "State machine", "Each payment moves CREATED → PENDING → SUCCEEDED / FAILED → REFUNDED; every transition is checked and recorded."],
        ["📒", "Double-entry ledger", "Every movement writes matching debit and credit rows that sum to zero. Rows are never edited — only added."],
        ["🔍", "Reconciliation", "Daily jobs compare our ledger with the provider's settlement reports and flag any mismatch."],
        ["🔐", "Never store card numbers", "Use the provider's tokens; encrypt everything, audit access, follow PCI rules."],
      ],
      trade: ["Charging synchronously gives instant answers but depends on slow providers; async + webhooks is more robust.", "Audit trails and strong consistency cost speed and storage — always worth it for money."],
    },
    {
      id: "crawler", em: "🕷️", t: "Web Crawler",
      what: "Visit billions of web pages, download them and follow their links — for a search engine — politely, and without getting stuck.",
      func: ["Start from seed URLs", "Download pages &amp; extract links", "Store pages for indexing", "Re-crawl changing pages"],
      nfr: ["Politeness: never overload a site", "Billions of pages (scale out)", "Skip duplicates &amp; traps", "Respect robots.txt"],
      nums: [["Pages", "1B/month ≈ 400/s"], ["Avg page", "~500 KB → 500 TB/month"], ["Links per page", "~50"], ["Seen-URL set", "billions → bloom filter"]],
      cfg: { w: 760, h: 380, minW: 600,
        nodes: [{ id: "seed", x: 65, y: 90, w: 100, h: 64, icon: "🌱", label: "Seed URLs", c: "green", small: 1 }, { id: "fr", x: 250, y: 90, w: 150, h: 76, icon: "📋", label: "URL frontier\n(per-site queues)", c: "yellow", small: 1 },
          { id: "fe", x: 460, y: 90, w: 140, h: 70, icon: "🕷️", label: "Fetchers\n(+ DNS cache)", c: "purple", small: 1 }, { id: "st", x: 670, y: 90, w: 130, h: 76, label: "🪣 Page\nstorage", c: "gray", shape: "db", small: 1 },
          { id: "pa", x: 460, y: 290, w: 140, h: 66, icon: "🧩", label: "Parse links", c: "orange", small: 1 }, { id: "dd", x: 250, y: 290, w: 150, h: 66, icon: "🌸", label: "Seen before?", c: "pink", small: 1 }],
        edges: [["seed", "fr"], ["fr", "fe", "", F], ["fe", "st", "", F], ["fe", "pa", "", F], ["pa", "dd", "50 links", F], ["dd", "fr", "only new ones", F]] },
      dec: [
        ["📋", "URL frontier", "Priority queues (important pages first) plus one queue per website, so each site is fetched slowly and politely."],
        ["🌸", "Seen-URL check", "A bloom filter (or huge key-value set) skips URLs already crawled; content hashes skip duplicate pages."],
        ["🤖", "robots.txt", "Each site says what crawlers may fetch and how fast — cache it and obey it."],
        ["🪤", "Avoid traps", "Limit URL length, depth and pages per site so infinite calendars or session IDs can't trap the crawler."],
        ["🔄", "Re-crawl smartly", "Pages that change often (news) are revisited sooner than pages that rarely change."],
      ],
      trade: ["Crawling faster finds new pages sooner but risks overloading sites and getting blocked.", "Storing full pages allows re-indexing later but costs huge storage — compress and keep what matters."],
    },
  ];

  const list = $("#caseList"), tabs = $("#caseTabs");
  list.innerHTML = CASES.map((c, i) => `<button class="chip" data-tab="${c.id}" ${i === 0 ? 'aria-selected="true"' : ""}>${c.em} ${c.t}</button>`).join("");
  CASES.forEach((c) => {
    const p = document.createElement("div");
    p.className = "tabpanel"; p.dataset.panel = c.id;
    p.innerHTML = `
      <div class="case-head"><span class="emoji-xl">${c.em}</span><div><h2 class="mb0">Design a ${c.t}</h2><p class="lead mb0">${c.what}</p></div></div>
      <div class="req-cols mt">
        <div class="card"><h3>✅ Must do</h3><ul>${c.func.map((x) => `<li>${x}</li>`).join("")}</ul></div>
        <div class="card"><h3>💪 Must be</h3><ul>${c.nfr.map((x) => `<li>${x}</li>`).join("")}</ul></div>
        <div class="card"><h3>🧮 Napkin math</h3><div class="num-list">${c.nums.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div></div>
      </div>
      <div class="diagram mt"><div class="scroll-x"><div class="cfl"></div></div><p class="scroll-hint">swipe the drawing →</p><p class="cap">The high-level design — dots show data flowing</p></div>
      <h3 class="mt2">🔑 Key decisions</h3>
      <div class="grid">${c.dec.map(([e, h, txt], i) => `<div class="card ${i % 2 ? "tilt-r" : "tilt-l"}"><div class="decision"><span class="emoji-xl" style="font-size:2rem">${e}</span><div><h4>${h}</h4><p class="mb0">${txt}</p></div></div></div>`).join("")}</div>
      ${c.extra === "geo" ? `<div class="diagram mt geo"><div id="geoGrid"></div><p class="cap">Find drivers in your cell + 8 neighbors</p><div class="row" style="justify-content:center"><button class="btn primary sm" id="geoShuffle">🎲 Move everyone</button></div></div>` : ""}
      ${c.extra === "trie" ? `<div class="diagram mt"><div class="scroll-x"><div id="trieFlow"></div></div><p class="cap">Each trie node stores its top suggestions — typing “sys” is just 3 hops ✨</p></div>` : ""}
      <div class="callout warn mt"><span class="lbl">⚖️ Trade-offs</span><ul class="mb0">${c.trade.map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
    tabs.appendChild(p);
    flow(SD.$(".cfl", p), c.cfg);
  });

  /* geohash-style grid for ride sharing */
  function geo() {
    const C = 8, R = 6, s = 52, W = C * s + 20, H = R * s + 20;
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "Map grid with drivers near the rider" });
    const rc = 3, rr = 2;
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const near = Math.abs(x - rc) <= 1 && Math.abs(y - rr) <= 1;
      SD.svgEl("rect", { x: 10 + x * s, y: 10 + y * s, width: s, height: s, class: "r", "data-sw": 1.2, "data-rough": 0.6, "data-fill": near ? (x === rc && y === rr ? "yellow" : "teal") : undefined, "data-gap": 9 }, svg);
      SD.text(svg, 10 + x * s + 12, 10 + y * s + 10, "9q" + "abcdefgh"[x] + y, "xs soft").setAttribute("text-anchor", "start");
    }
    let found = 0;
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * C, y = Math.random() * R, near = Math.abs(Math.floor(x) - rc) <= 1 && Math.abs(Math.floor(y) - rr) <= 1;
      if (near) found++;
      SD.text(svg, 10 + x * s, 10 + y * s, "🚗", near ? "" : "s").style.opacity = near ? 1 : 0.4;
    }
    SD.text(svg, 10 + (rc + 0.5) * s, 10 + (rr + 0.5) * s, "🙋", "lg");
    const host = $("#geoGrid"); host.innerHTML = ""; host.appendChild(svg); SD.roughify(svg);
    host.nextElementSibling.innerHTML = `Search only your cell + 8 neighbors → found <b>${found}</b> nearby drivers without scanning the whole map 🗺️`;
  }
  geo();
  $("#geoShuffle").addEventListener("click", geo);

  /* trie for autocomplete */
  flow("#trieFlow", {
    w: 720, h: 270, minW: 560,
    nodes: [{ id: "r", x: 50, y: 135, w: 70, h: 50, label: "start", c: "gray", small: 1 },
      { id: "s", x: 185, y: 135, w: 150, h: 64, label: "“s”\n🔝 system design, sushi", c: "yellow", small: 1 },
      { id: "su", x: 400, y: 60, w: 160, h: 64, label: "“su”\n🔝 sushi, sunset, sun", c: "orange", small: 1 },
      { id: "sy", x: 400, y: 210, w: 160, h: 64, label: "“sy”\n🔝 system design, sydney", c: "green", small: 1 },
      { id: "sys", x: 620, y: 210, w: 170, h: 64, label: "“sys”\n🔝 system design, sysadmin", c: "pink", small: 1 }],
    edges: [["r", "s", "s"], ["s", "su", "u"], ["s", "sy", "y", { flow: 1 }], ["sy", "sys", "s", { flow: 1 }]],
  });
  if (location.hash) { const id = location.hash.slice(1); const b = SD.$(`#caseList [data-tab="${id}"]`); if (b) { SD.$$("#caseList .chip").forEach((x) => x.removeAttribute("aria-selected")); b.setAttribute("aria-selected", "true"); } }
})();
