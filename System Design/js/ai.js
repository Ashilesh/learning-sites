/* Chapter — AI & ML Systems */
(function () {
  const { $, $$, flow } = SD;

  /* ---------- big picture ---------- */
  const af = flow("#aiFlow", {
    w: 780, h: 370, minW: 620,
    nodes: [{ id: "user", x: 62, y: 185, w: 96, h: 70, icon: "🙋", label: "You", c: "blue" },
      { id: "gw", x: 200, y: 185, w: 120, h: 70, icon: "🚪", label: "API gateway\n(auth, quotas)", c: "orange", small: 1 },
      { id: "orch", x: 380, y: 185, w: 140, h: 74, icon: "🎼", label: "Orchestrator", c: "yellow", small: 1 },
      { id: "guard", x: 380, y: 50, w: 140, h: 60, icon: "🛡️", label: "Guardrails", c: "red", small: 1 },
      { id: "cache", x: 380, y: 318, w: 150, h: 60, icon: "💾", label: "Semantic cache", c: "teal", small: 1 },
      { id: "retr", x: 570, y: 90, w: 120, h: 64, icon: "🔎", label: "Retriever", c: "purple", small: 1 },
      { id: "vdb", x: 715, y: 90, w: 110, h: 76, label: "🧭 Vector\nDB", c: "green", shape: "db", small: 1 },
      { id: "llm", x: 640, y: 280, w: 150, h: 76, icon: "🧠", label: "LLM on GPUs", c: "pink", small: 1 },
      { id: "logs", x: 200, y: 318, w: 120, h: 60, icon: "📊", label: "Logs & evals", c: "gray", small: 1 }],
    edges: [["user", "gw"], ["gw", "orch"], ["orch", "guard"], ["orch", "cache"], ["orch", "retr"], ["retr", "vdb"], ["orch", "llm"], ["orch", "logs", "", { dash: 1 }]],
  });
  SD.player({
    root: $("#aiBox"), intro: "Press ▶ to ask: “How do I reset my password?”", onReset: () => af.reset(),
    steps: [
      { cap: "You ask a question. The <b>API gateway</b> checks you're logged in and still have token quota 🎟️", run: async () => { af.clear().hl("gw"); await af.send("user", "gw", { label: "reset password?", color: "blue" }); } },
      { cap: "The orchestrator checks the <b>semantic cache</b>: did someone ask something similar recently? — miss ❌", run: async () => { af.clear().hl("cache"); await af.send("gw", "orch", { color: "blue" }); await af.send("orch", "cache", { label: "similar?", color: "teal" }); await af.send("cache", "orch", { label: "❌ miss", color: "teal" }); } },
      { cap: "<b>Guardrails</b> check the question: safe? any personal data to hide? ✅", run: async () => { af.clear().hl("guard"); await af.send("orch", "guard", { color: "red" }); await af.send("guard", "orch", { label: "✅ ok", color: "green" }); } },
      { cap: "The <b>retriever</b> finds the most relevant help articles with vector search 📚", run: async () => { af.clear().hl(["retr", "vdb"]); await af.send("orch", "retr", { color: "purple" }); await af.send("retr", "vdb", { label: "nearest?", color: "purple" }); await af.send("vdb", "retr", { label: "3 articles", color: "green" }); await af.send("retr", "orch", { color: "green" }); } },
      { cap: "The prompt (instructions + articles + your question) goes to the <b>LLM</b> on a GPU server 🧠", run: async () => { af.clear().hl("llm"); await af.send("orch", "llm", { label: "prompt", color: "pink", dur: 1100 }); } },
      { cap: "The answer <b>streams back token by token</b> — you start reading almost instantly ⚡", run: async () => {
        af.clear().hl("user");
        const words = ["Open", "Settings", "→", "Security", "→", "Reset", "🔐"];
        for (const w of words) { af.send("llm", "orch", { label: w, color: "pink", dur: 500 }).then(() => af.send("orch", "gw", { color: "pink", dur: 300 })).then(() => af.send("gw", "user", { label: w, color: "pink", dur: 300 })); await SD.sleep(260); }
        await SD.sleep(1300);
      } },
      { cap: "Finally: the answer is checked, <b>saved to the cache</b> for similar questions, and <b>logged</b> for quality evals 📊", run: async () => { af.clear().hl(["cache", "logs"]); await Promise.all([af.send("orch", "cache", { label: "save", color: "teal" }), af.send("orch", "logs", { label: "log", color: "gray" })]); } },
    ],
  });

  /* ---------- embeddings map ---------- */
  (function emb() {
    const W = 600, H = 390;
    const PTS = [
      ["🐶", "dog", 120, 95, "a"], ["🐱", "cat", 165, 128, "a"], ["🐴", "horse", 85, 152, "a"], ["🐯", "tiger", 190, 70, "a"], ["🐰", "rabbit", 140, 175, "a"],
      ["🍎", "apple", 430, 92, "f"], ["🍌", "banana", 475, 132, "f"], ["🍇", "grapes", 505, 78, "f"], ["🍓", "strawberry", 432, 160, "f"], ["🍊", "orange", 530, 158, "f"],
      ["🚗", "car", 130, 292, "v"], ["🚌", "bus", 85, 330, "v"], ["🚲", "bike", 195, 335, "v"], ["✈️", "plane", 215, 262, "v"], ["🚂", "train", 60, 268, "v"],
      ["😀", "happy", 430, 300, "e"], ["😢", "sad", 525, 340, "e"], ["😡", "angry", 545, 278, "e"], ["😴", "tired", 465, 352, "e"], ["🥰", "loving", 400, 255, "e"],
    ];
    const Q = [["🐕", "puppy", 140, 108], ["🥭", "mango", 488, 112], ["🚕", "taxi", 152, 308], ["🎉", "joyful", 418, 286], ["🦁", "lion", 200, 96], ["🛵", "scooter", 175, 318]];
    const svg = SD.svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "sketch", role: "img", "aria-label": "2D map of word meanings" });
    [[140, 125, 120, 90, "blue", "animals"], [480, 120, 115, 85, "green", "fruits"], [140, 300, 125, 75, "orange", "vehicles"], [470, 305, 115, 80, "pink", "feelings"]].forEach(([cx, cy, rx, ry, c, l]) => {
      SD.svgEl("ellipse", { cx, cy, rx, ry, class: "r", "data-fill": c, "data-gap": 12, "data-fw": 1, "data-sw": 1.5, "data-dash": 1, "data-wash": 0.18 }, svg);
      SD.text(svg, cx, cy - ry - 8, l, "note halo");
    });
    const linkG = SD.svgEl("g", {}, svg);
    PTS.forEach(([e, w, x, y]) => { SD.text(svg, x, y - 4, e, "lg"); SD.text(svg, x, y + 17, w, "xs halo"); });
    const qG = SD.svgEl("g", {}, svg);
    $("#embSvg").appendChild(svg); SD.roughify(svg);
    let cur = 0;
    $("#qChips").innerHTML = Q.map(([e, w], i) => `<button class="chip" data-i="${i}">${e} ${w}</button>`).join("");
    function show(i) {
      cur = i; const [e, w, x, y] = Q[i], k = +$("#kN").value;
      $("#kV").textContent = k;
      $$("#qChips .chip").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
      const ranked = PTS.map((p) => ({ p, d: Math.hypot(p[2] - x, p[3] - y) })).sort((a, b) => a.d - b.d).slice(0, k);
      linkG.innerHTML = ""; qG.innerHTML = "";
      ranked.forEach(({ p }, r) => SD.svgEl("line", { x1: x, y1: y, x2: p[2], y2: p[3], stroke: "#f06595", "stroke-width": 3 - r * 0.3, "stroke-dasharray": "5 4" }, linkG));
      SD.svgEl("circle", { cx: x, cy: y, r: 20, fill: "#fcc419", stroke: "currentColor", "stroke-width": 2.5 }, qG);
      SD.text(qG, x, y + 1, e, "lg"); SD.text(qG, x, y - 30, "🔎 " + w, "s halo");
      $("#nearList").innerHTML = ranked.map(({ p, d }, r) => `<span class="tag ${["g", "b", "o", "p", "r", "g"][r]}">#${r + 1} ${p[0]} ${p[1]} · ${Math.round((1 - d / 520) * 100)}% similar</span>`).join("");
    }
    $("#qChips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(+b.dataset.i); });
    $("#kN").addEventListener("input", () => show(cur));
    show(0);
  })();

  /* ---------- RAG ---------- */
  const rf = flow("#ragFlow", {
    w: 830, h: 330, minW: 640,
    groups: [{ x: 8, y: 8, w: 600, h: 132, label: "① Indexing — done ahead of time", c: "blue" }, { x: 8, y: 168, w: 814, h: 154, label: "② Answering a question — in real time", c: "pink" }],
    nodes: [{ id: "docs", x: 75, y: 82, w: 100, h: 62, icon: "📄", label: "Docs", c: "blue" }, { id: "chunk", x: 220, y: 82, w: 100, h: 62, icon: "✂️", label: "Chunk", c: "yellow" },
      { id: "e1", x: 365, y: 82, w: 100, h: 62, icon: "🔢", label: "Embed", c: "orange" }, { id: "vdb", x: 530, y: 82, w: 120, h: 78, label: "🧭 Vector\nDB", c: "green", shape: "db", small: 1 },
      { id: "q", x: 70, y: 252, w: 96, h: 66, icon: "❓", label: "Question", c: "purple", small: 1 }, { id: "e2", x: 200, y: 252, w: 96, h: 66, icon: "🔢", label: "Embed", c: "orange" },
      { id: "srch", x: 335, y: 252, w: 104, h: 66, icon: "🔎", label: "Top-k search", c: "teal", small: 1 }, { id: "prm", x: 480, y: 252, w: 112, h: 66, icon: "📝", label: "Prompt", c: "yellow" },
      { id: "llm", x: 620, y: 252, w: 96, h: 66, icon: "🧠", label: "LLM", c: "pink" }, { id: "ans", x: 755, y: 252, w: 100, h: 66, icon: "💬", label: "Answer\n+ sources", c: "green", small: 1 }],
    edges: [["docs", "chunk"], ["chunk", "e1"], ["e1", "vdb"], ["q", "e2"], ["e2", "srch"], ["srch", "vdb", "", { two: 1 }], ["srch", "prm"], ["prm", "llm"], ["llm", "ans"]],
  });
  SD.player({
    root: $("#ragBox"), intro: "Press ▶ to build the index, then answer a question", onReset: () => rf.reset(),
    steps: [
      { cap: "① Collect your documents (help center, policies, manuals)", run: async () => { rf.clear().hl("docs"); await SD.sleep(700); } },
      { cap: "Cut them into small, overlapping <b>chunks</b>", run: async () => { rf.clear().hl("chunk"); await rf.send("docs", "chunk", { label: "📄📄📄", color: "blue" }); } },
      { cap: "Turn each chunk into an <b>embedding</b> (numbers that capture meaning)", run: async () => { rf.clear().hl("e1"); await rf.send("chunk", "e1", { label: "✂️ pieces", color: "yellow" }); } },
      { cap: "Store them in the <b>vector database</b> — ready to search", run: async () => { rf.clear().hl("vdb"); await rf.send("e1", "vdb", { label: "[0.1, -0.4…]", color: "orange" }); rf.state("vdb", "good"); } },
      { cap: "② A user asks: “Can I change my plan mid-month?”", run: async () => { rf.clear().hl("q"); await SD.sleep(700); } },
      { cap: "The question is embedded the <b>same way</b>", run: async () => { rf.clear().hl("e2"); await rf.send("q", "e2", { label: "question", color: "purple" }); } },
      { cap: "Vector search finds the <b>3 most similar chunks</b>", run: async () => { rf.clear().hl(["srch", "vdb"]); await rf.send("e2", "srch", { color: "orange" }); await rf.send("srch", "vdb", { label: "nearest?", color: "teal" }); await rf.send("vdb", "srch", { label: "3 chunks", color: "green" }); } },
      { cap: "Build the prompt: instructions + those chunks + the question", run: async () => { rf.clear().hl("prm"); await rf.send("srch", "prm", { label: "📄📄📄", color: "teal" }); } },
      { cap: "The LLM answers <b>using the chunks</b> (an open-book exam!)", run: async () => { rf.clear().hl("llm"); await rf.send("prm", "llm", { color: "yellow" }); await rf.send("llm", "ans", { label: "answer", color: "pink" }); } },
      { cap: "…with sources: “Yes — changes apply next billing day (see Billing FAQ §2)” 📎", run: async () => { rf.clear().hl("ans"); rf.state("ans", "good"); rf.pop("ans", "📎 sources", { ms: 1800 }); await SD.sleep(900); } },
    ],
  });

  /* ---------- LLM serving sim ---------- */
  (function serve() {
    const M = [
      { n: "🐭 Small model", q: "★★☆☆☆", pre: 120, tok: 12, gpu: 1.2 },
      { n: "🐶 Medium model", q: "★★★★☆", pre: 300, tok: 25, gpu: 3 },
      { n: "🐘 Large model", q: "★★★★★", pre: 700, tok: 50, gpu: 9 },
    ];
    const ANSWER = "Sure! To reset your password, open Settings → Security → Reset password, then click the link we email you. It expires in 15 minutes. 🔐";
    $("#llmGrid").innerHTML = M.map((m, i) => `<div class="card" data-m="${i}"><h4>${m.n}</h4><div class="small muted">quality ${m.q}</div><div class="mini" id="mm${i}"></div><div class="bubble" id="mb${i}"><span class="muted">waiting for a question…</span></div></div>`).join("");
    const calc = (m, b) => { const tokE = m.tok * (1 + 0.035 * (b - 1)), ttft = m.pre * (1 + 0.025 * (b - 1)), per = 1000 / tokE, thr = b * per; return { tokE, ttft, per, thr, cost: ((300 * 1000) / thr) * (m.gpu / 3600) }; };
    function stats() {
      const b = +$("#bN").value; $("#bV").textContent = b;
      M.forEach((m, i) => { const s = calc(m, b); $("#mm" + i).innerHTML = `<span>⏱️ first token</span><b>${Math.round(s.ttft)} ms</b><span>📖 speed per user</span><b>${Math.round(s.per)} tok/s</b><span>🏭 total per GPU</span><b>${SD.fmtNum(s.thr, 1)} tok/s</b><span>💸 per 1K answers</span><b>$${s.cost.toFixed(2)}</b>`; });
    }
    let gen = 0;
    $("#askAll").addEventListener("click", () => {
      const g = ++gen, b = +$("#bN").value, words = ANSWER.split(" ");
      M.forEach(async (m, i) => {
        const s = calc(m, b), el = $("#mb" + i);
        el.innerHTML = '<span class="muted">🤔 thinking…</span>';
        await SD.sleep(s.ttft); if (g !== gen) return;
        let out = "";
        for (const w of words) { if (g !== gen) return; out += (out ? " " : "") + w; el.innerHTML = out + ' <span class="cursor"></span>'; await SD.sleep(s.tokE * 1.3); }
        el.innerHTML = out + ` <span class="tag g">done</span>`;
      });
    });
    $("#bN").addEventListener("input", stats);
    stats();
  })();

  /* ---------- recommendations funnel ---------- */
  const F = [["📚 All videos", "100,000,000", 100, "#a5d8ff"], ["🎣 Candidate generation", "~1,000 · cheap: similar users, topics you follow, trending", 84, "#b2f2bb"], ["⚖️ Light ranking", "~200 · a small, fast model", 68, "#ffec99"], ["🧠 Heavy ranking", "~50 · a big model with many features", 52, "#ffd8a8"], ["🎨 Re-rank & rules", "~20 · diversity, freshness, no repeats, safety", 38, "#fcc2d7"], ["📱 Your feed", "10 videos, in ~100 ms", 26, "#d0bfff"]];
  $("#funnel").innerHTML = F.map(([t, d, w, c]) => `<div class="fstep" style="width:${w}%;min-width:200px;background:${c}"><b>${t}</b><br><span class="small">${d}</span></div>`).join('<div class="arrow-doodle">↓</div>');
})();
