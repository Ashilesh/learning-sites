/* Chapter 1 — Start Here */
(function () {
  const { $, flow } = SD;

  /* hero flow */
  flow("#heroFlow", {
    w: 520, h: 300, label: "You to internet to servers to data",
    nodes: [
      { id: "you", x: 70, y: 150, w: 92, h: 70, icon: "📱", label: "You", c: "blue" },
      { id: "net", x: 220, y: 70, w: 130, h: 80, icon: "☁️", label: "Internet", c: "teal", shape: "cloud" },
      { id: "srv", x: 410, y: 90, w: 140, h: 70, icon: "🏢", label: "Servers", c: "yellow" },
      { id: "db", x: 410, y: 235, w: 120, h: 76, icon: "🗄️", label: "Data", c: "green", shape: "db" },
    ],
    edges: [["you", "net", "", { flow: 1, c: "pink" }], ["net", "srv", "", { flow: 1 }], ["srv", "db", "", { flow: 1, flowC: "green" }], ["db", "you", "answer!", { bend: -40, flow: 1, flowC: "blue", dash: 1 }]],
  });

  /* restaurant analogy */
  const pairs = [
    ["🧑‍🤝‍🧑", "Hungry customers", "📱", "Clients", "phones, browsers"],
    ["📒", "Address book", "📖", "DNS", "name → address"],
    ["🙋", "Host at the door", "🚦", "Load balancer", "spreads people out"],
    ["📜", "The menu", "🔌", "API", "what you can ask for"],
    ["🧑‍🍳", "Many identical chefs", "🖥️", "App servers", "do the work"],
    ["🧊", "Mini-fridge by the stove", "⚡", "Cache", "fast, small, temporary"],
    ["🏬", "Big storeroom", "🗄️", "Database", "safe & permanent"],
    ["🎫", "Order ticket rail", "📬", "Message queue", "do it a bit later"],
    ["🚚", "Food trucks everywhere", "🌐", "CDN", "copies near you"],
    ["🕵️", "Manager watching", "📊", "Monitoring", "spot trouble early"],
    ["🏪", "Branches in other cities", "🌍", "Regions", "survive disasters"],
    ["🦺", "Bouncer checking IDs", "🔐", "Auth", "who are you? allowed?"],
  ];
  $("#analogy").innerHTML = pairs.map(([e1, t1, e2, t2, s]) => `
    <div class="pair"><div class="side"><span class="e">${e1}</span>${t1}</div><div class="eq">=</div>
    <div class="side"><span class="e">${e2}</span><b>${t2}</b><br><small>${s}</small></div></div>`).join("");

  /* superpowers */
  const powers = [
    ["📈", "Scalability", "Handles 10× more people by adding machines."],
    ["💪", "Reliability", "Keeps giving correct answers when parts break."],
    ["🟢", "Availability", "Is open whenever you need it (uptime)."],
    ["⚡", "Performance", "Answers fast — low latency."],
    ["🎯", "Consistency", "Everyone sees the right, latest data."],
    ["🔒", "Security", "Keeps bad guys out and data private."],
    ["💰", "Cost efficiency", "Doesn't burn money on idle machines."],
    ["🧹", "Maintainability", "Easy to change, fix and understand."],
  ];
  $("#powers").innerHTML = powers.map(([e, t, d], i) => `<div class="card power ${i % 2 ? "tilt-r" : "tilt-l"}"><span class="e">${e}</span><h4>${t}</h4><p class="mb0 small">${d}</p></div>`).join("");

  /* scaling journey */
  const U = (id, x, y) => ({ id, x, y, w: 96, h: 64, icon: "👥", label: "Users", c: "blue" });
  const stages = [
    { users: "1 – 100", crowd: 1, title: "Stage 1 · One computer does everything",
      problem: "Everything lives on one box: code, data, files. If it crashes or gets busy, the whole app is gone.",
      fix: "Nothing yet — and that's OK! For a tiny app, one server is cheap, simple and fast to build.",
      cfg: { w: 760, h: 300, nodes: [U("u", 110, 150), { id: "s", x: 450, y: 150, w: 230, h: 120, icon: "🖥️", label: "One server\n(app + database + files)", c: "yellow" }],
        edges: [["u", "s", "requests", { two: 1, flow: 1 }]] } },
    { users: "1,000", crowd: 3, title: "Stage 2 · Give the data its own home",
      problem: "The app code and the database fight over the same CPU and memory. Slow pages!",
      fix: "Move the database to its own machine. Now each can grow separately.",
      cfg: { w: 760, h: 300, nodes: [U("u", 100, 150), { id: "s", x: 350, y: 150, w: 150, h: 76, icon: "🖥️", label: "App server", c: "yellow" }, { id: "db", x: 620, y: 150, w: 140, h: 96, icon: "🗄️", label: "Database", c: "green", shape: "db" }],
        edges: [["u", "s", "", { two: 1, flow: 1 }], ["s", "db", "SQL", { two: 1, flow: 1, flowC: "green" }]] } },
    { users: "10,000", crowd: 6, title: "Stage 3 · More servers + a load balancer",
      problem: "One app server can't serve the crowd, and if it dies everyone is locked out (single point of failure).",
      fix: "Run several identical (stateless) servers and put a load balancer in front to share the work.",
      cfg: { w: 760, h: 340, nodes: [U("u", 80, 170), { id: "lb", x: 245, y: 170, w: 112, h: 64, icon: "🚦", label: "Load bal.", c: "orange" },
        { id: "a1", x: 430, y: 65, w: 120, h: 56, icon: "", label: "🖥️ App 1", c: "yellow" }, { id: "a2", x: 430, y: 170, w: 120, h: 56, label: "🖥️ App 2", c: "yellow" }, { id: "a3", x: 430, y: 275, w: 120, h: 56, label: "🖥️ App 3", c: "yellow" },
        { id: "db", x: 650, y: 170, w: 130, h: 96, icon: "🗄️", label: "Database", c: "green", shape: "db" }],
        edges: [["u", "lb", "", { flow: 1 }], ["lb", "a1", "", { flow: 1 }], ["lb", "a2", "", { flow: 1 }], ["lb", "a3", "", { flow: 1 }], ["a1", "db"], ["a2", "db"], ["a3", "db"]] } },
    { users: "100,000", crowd: 10, title: "Stage 4 · Cache + read replicas",
      problem: "The database is drowning — most requests read the same popular data again and again.",
      fix: "Keep hot data in a super-fast in-memory cache, and make read-only copies (replicas) of the database.",
      cfg: { w: 760, h: 360, nodes: [U("u", 70, 180), { id: "lb", x: 210, y: 180, w: 104, h: 60, icon: "🚦", label: "LB", c: "orange" },
        { id: "a1", x: 360, y: 110, w: 110, h: 52, label: "🖥️ App", c: "yellow" }, { id: "a2", x: 360, y: 250, w: 110, h: 52, label: "🖥️ App", c: "yellow" },
        { id: "c", x: 560, y: 55, w: 120, h: 58, icon: "⚡", label: "Cache", c: "red" },
        { id: "p", x: 560, y: 200, w: 120, h: 86, icon: "🗄️", label: "Primary", c: "green", shape: "db" },
        { id: "r1", x: 700, y: 135, w: 96, h: 70, label: "Replica", c: "teal", shape: "db" }, { id: "r2", x: 700, y: 290, w: 96, h: 70, label: "Replica", c: "teal", shape: "db" }],
        edges: [["u", "lb", "", { flow: 1 }], ["lb", "a1"], ["lb", "a2"], ["a1", "c", "hot data", { flow: 1, flowC: "red" }], ["a2", "c", "", { bend: -60 }], ["a1", "p", "writes"], ["a2", "p"], ["p", "r1", "copy", { dash: 1 }], ["p", "r2", "copy", { dash: 1 }]] } },
    { users: "1 million", crowd: 16, title: "Stage 5 · DNS + CDN for the whole world",
      problem: "Users far away wait ages for images and videos, and they all hit your servers for the same files.",
      fix: "Serve static files (images, CSS, video) from a CDN with copies in cities around the world.",
      cfg: { w: 760, h: 360, nodes: [U("u", 80, 180), { id: "dns", x: 220, y: 50, w: 110, h: 56, icon: "📖", label: "DNS", c: "purple" },
        { id: "cdn", x: 230, y: 305, w: 120, h: 62, icon: "🌐", label: "CDN edge", c: "teal" },
        { id: "lb", x: 340, y: 180, w: 100, h: 60, icon: "🚦", label: "LB", c: "orange" },
        { id: "a", x: 490, y: 180, w: 110, h: 60, icon: "🖥️", label: "Apps ×N", c: "yellow" },
        { id: "c", x: 660, y: 70, w: 110, h: 56, icon: "⚡", label: "Cache", c: "red" },
        { id: "db", x: 660, y: 245, w: 120, h: 90, icon: "🗄️", label: "DB + replicas", c: "green", shape: "db" },
        { id: "s3", x: 500, y: 320, w: 130, h: 56, icon: "🪣", label: "File storage", c: "gray" }],
        edges: [["u", "dns", "where?", { dash: 1 }], ["u", "cdn", "images", { flow: 1, flowC: "teal" }], ["u", "lb", "", { flow: 1 }], ["lb", "a"], ["a", "c"], ["a", "db"], ["cdn", "s3", "origin", { dash: 1 }]] } },
    { users: "10 million", crowd: 22, title: "Stage 6 · Queues + background workers",
      problem: "Slow jobs (sending emails, resizing photos, generating reports) make users wait and crash servers during spikes.",
      fix: "Drop slow jobs into a message queue and let a team of background workers finish them at their own pace.",
      cfg: { w: 760, h: 360, nodes: [U("u", 70, 170), { id: "lb", x: 200, y: 170, w: 96, h: 56, icon: "🚦", label: "LB", c: "orange" },
        { id: "a", x: 340, y: 170, w: 110, h: 60, icon: "🖥️", label: "Apps", c: "yellow" },
        { id: "q", x: 520, y: 290, w: 150, h: 56, icon: "📬", label: "Queue", c: "purple" },
        { id: "w", x: 690, y: 290, w: 110, h: 56, icon: "👷", label: "Workers", c: "pink" },
        { id: "c", x: 520, y: 60, w: 100, h: 54, icon: "⚡", label: "Cache", c: "red" },
        { id: "db", x: 680, y: 140, w: 110, h: 90, icon: "🗄️", label: "DB", c: "green", shape: "db" }],
        edges: [["u", "lb", "", { flow: 1 }], ["lb", "a"], ["a", "c"], ["a", "db"], ["a", "q", "“send email later”", { flow: 1, flowC: "purple" }], ["q", "w", "", { flow: 1, flowC: "purple" }], ["w", "db", "", { dash: 1 }]] } },
    { users: "100 million+", crowd: 30, title: "Stage 7 · Shards + many regions",
      problem: "One database can't hold all the data, and a single data center can go down (power cut, storm, cable cut).",
      fix: "Split data into shards, run copies of everything in several regions, and let GeoDNS send people to the closest healthy one.",
      cfg: { w: 760, h: 400, groups: [{ x: 210, y: 20, w: 540, h: 170, label: "Region: America 🇺🇸", c: "blue" }, { x: 210, y: 215, w: 540, h: 170, label: "Region: Europe 🇪🇺", c: "purple" }],
        nodes: [U("u", 70, 200), { id: "g", x: 70, y: 70, w: 100, h: 54, icon: "🧭", label: "GeoDNS", c: "purple" },
          { id: "lb1", x: 285, y: 105, w: 90, h: 52, label: "🚦 LB", c: "orange" }, { id: "a1", x: 410, y: 105, w: 96, h: 52, label: "🖥️ Apps", c: "yellow" },
          { id: "s1", x: 560, y: 75, w: 92, h: 56, label: "Shard A-M", c: "green", shape: "db", small: 1 }, { id: "s2", x: 680, y: 75, w: 92, h: 56, label: "Shard N-Z", c: "green", shape: "db", small: 1 }, { id: "c1", x: 620, y: 155, w: 90, h: 40, label: "⚡ Cache", c: "red" },
          { id: "lb2", x: 285, y: 300, w: 90, h: 52, label: "🚦 LB", c: "orange" }, { id: "a2", x: 410, y: 300, w: 96, h: 52, label: "🖥️ Apps", c: "yellow" },
          { id: "s3", x: 560, y: 270, w: 92, h: 56, label: "Shard A-M", c: "green", shape: "db", small: 1 }, { id: "s4", x: 680, y: 270, w: 92, h: 56, label: "Shard N-Z", c: "green", shape: "db", small: 1 }, { id: "c2", x: 620, y: 350, w: 90, h: 40, label: "⚡ Cache", c: "red" }],
        edges: [["u", "g", "", { dash: 1 }], ["u", "lb1", "", { flow: 1 }], ["u", "lb2", "", { flow: 1 }], ["lb1", "a1"], ["a1", "s1"], ["lb2", "a2"], ["a2", "s3"], ["s2", "s4", "sync", { dash: 1, two: 1 }]] } },
  ];
  const range = $("#stageRange"), dots = $("#stageDots");
  dots.innerHTML = stages.map((s, i) => `<button aria-label="Stage ${i + 1}">${i + 1}</button>`).join("");
  const dotBtns = Array.from(dots.children);
  function showStage(i) {
    const s = stages[i];
    $("#usersCount").textContent = s.users;
    $("#crowd").textContent = "🧑".repeat(Math.min(s.crowd, 30)) + (i > 3 ? " …and way more!" : "");
    $("#stageTitle").textContent = s.title;
    $("#stageProblem").textContent = s.problem;
    $("#stageFix").textContent = s.fix;
    flow("#stageFlow", Object.assign({ minW: 560 }, s.cfg));
    dotBtns.forEach((b, k) => b.classList.toggle("on", k === i));
    range.value = i;
  }
  range.addEventListener("input", () => showStage(+range.value));
  dotBtns.forEach((b, i) => b.addEventListener("click", () => showStage(i)));
  showStage(0);

  /* request journey */
  const rf = flow("#reqFlow", {
    w: 760, h: 380, minW: 560, label: "Request journey",
    nodes: [
      { id: "you", x: 80, y: 190, w: 100, h: 72, icon: "👩", label: "You", c: "blue" },
      { id: "dns", x: 250, y: 60, w: 110, h: 64, icon: "📖", label: "DNS", c: "purple" },
      { id: "cdn", x: 250, y: 320, w: 110, h: 64, icon: "🚚", label: "CDN", c: "teal" },
      { id: "lb", x: 400, y: 190, w: 116, h: 70, icon: "🚦", label: "Load balancer", c: "orange", small: 1 },
      { id: "app", x: 560, y: 190, w: 116, h: 70, icon: "👨‍🍳", label: "App server", c: "yellow" },
      { id: "cache", x: 690, y: 70, w: 104, h: 64, icon: "⚡", label: "Cache", c: "red" },
      { id: "db", x: 690, y: 305, w: 110, h: 92, icon: "🗄️", label: "Database", c: "green", shape: "db" },
    ],
    edges: [["you", "dns"], ["you", "cdn"], ["you", "lb"], ["lb", "app"], ["app", "cache"], ["app", "db"]],
  });
  SD.player({
    root: $("#reqBox"),
    intro: "Press ▶ Play to follow your request around the system",
    onReset: () => rf.reset(),
    steps: [
      { cap: "You type <b>pizza.com</b> and hit Enter ⌨️", run: async () => { rf.clear().hl("you"); await SD.sleep(900); } },
      { cap: "<b>DNS</b>, the internet's phone book, turns <i>pizza.com</i> into an address like <code>93.184.216.34</code>", run: async () => { rf.clear().hl("dns"); await rf.send("you", "dns", { label: "pizza.com?", color: "purple" }); await rf.send("dns", "you", { label: "93.184…", color: "purple" }); } },
      { cap: "Pictures & styles come from a <b>CDN</b> shop near you — super quick 🏎️", run: async () => { rf.clear().hl("cdn"); await rf.send("you", "cdn", { label: "logo.png", color: "teal" }); await rf.send("cdn", "you", { label: "🖼️", color: "teal" }); } },
      { cap: "Your request reaches the <b>load balancer</b>, which picks a server that isn't busy", run: async () => { rf.clear().hl("lb"); await rf.send("you", "lb", { label: "GET /menu" }); await rf.send("lb", "app", { label: "you take it!" }); } },
      { cap: "The app server checks the <b>cache</b> first: “Do I already have the menu?” — nope, a <b>miss</b> ❌", run: async () => { rf.clear().hl("cache"); await rf.send("app", "cache", { label: "menu?", color: "red" }); await rf.send("cache", "app", { label: "❌ miss", color: "red" }); } },
      { cap: "So it asks the <b>database</b> (slower, but it knows everything)", run: async () => { rf.clear().hl("db"); await rf.send("app", "db", { label: "SELECT…", color: "green", dur: 1300 }); await rf.send("db", "app", { label: "🍕 data", color: "green", dur: 1300 }); } },
      { cap: "It saves the answer in the cache, so the next person gets it <b>10× faster</b> ⚡", run: async () => { rf.clear().hl("cache"); await rf.send("app", "cache", { label: "save!", color: "red" }); } },
      { cap: "The answer travels back and the page appears — about <b>200 ms</b>, faster than a blink 👀", run: async () => { rf.clear().hl("you"); await rf.send("app", "lb", { label: "200 OK", color: "yellow" }); await rf.send("lb", "you", { label: "🍕 page!", color: "yellow" }); } },
    ],
  });

  /* learning map */
  $("#mapGrid").innerHTML = SD.CHAPTERS.map((c, i) => `
    <a class="card map-card ${i % 3 === 1 ? "tilt-r" : i % 3 === 2 ? "tilt-l" : ""}" href="${c.file}">
      <span class="em">${c.em}</span><span class="n">Chapter ${i + 1}</span>
      <h3 class="mb0">${c.title}</h3><span class="lvl ${c.lvl === "x" ? "a" : c.lvl}">${SD.LVL[c.lvl]}</span>
      <span class="small">${c.blurb}</span></a>`).join("");
})();
