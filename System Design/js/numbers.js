/* Chapter 3 — Speed & Numbers */
(function () {
  const { $, $$, fmtNum, fmtBytes, fmtSecs, clamp } = SD;
  const ink = () => SD.cssVar("--ink"), soft = () => SD.cssVar("--ink-soft"), card2 = () => SD.cssVar("--card-2");

  /* ---------- 3.1 highway ---------- */
  (function road() {
    const cv = $("#roadCv");
    const st = SD.canvas(cv, null, 0.36, 200, 300);
    let lanes = 2, lenIdx = 2, cars = [], spawnT = [];
    const LEN = { 1: 0.42, 2: 0.62, 3: 0.82 }, LAT = { 1: "1 s", 2: "1.5 s", 3: "2 s" }, NAME = { 1: "short", 2: "medium", 3: "long" };
    const RATE = 1.4; // cars per second per lane
    function update() {
      lanes = +$("#lanes").value; lenIdx = +$("#roadLen").value;
      $("#laneV").textContent = lanes; $("#lenV").textContent = NAME[lenIdx];
      $("#latOut").textContent = LAT[lenIdx];
      $("#thrOut").textContent = (lanes * RATE).toFixed(1) + " cars/s";
      spawnT = Array.from({ length: lanes }, (_, i) => i * 0.25);
      cars = cars.filter((c) => c.lane < lanes);
    }
    $("#lanes").addEventListener("input", update); $("#roadLen").addEventListener("input", update);
    update();
    SD.loop(cv, (dt) => {
      const { ctx, w, h } = st; ctx.clearRect(0, 0, w, h);
      const x0 = 70, x1 = x0 + (w - 140) * LEN[lenIdx] + 40, top = 30, rh = h - 60, lh = rh / lanes;
      const dur = { 1: 1, 2: 1.5, 3: 2 }[lenIdx];
      ctx.fillStyle = card2(); ctx.strokeStyle = ink(); ctx.lineWidth = 2.5;
      ctx.fillRect(x0, top, x1 - x0, rh); ctx.strokeRect(x0, top, x1 - x0, rh);
      ctx.setLineDash([12, 10]); ctx.lineWidth = 1.5;
      for (let i = 1; i < lanes; i++) { ctx.beginPath(); ctx.moveTo(x0, top + i * lh); ctx.lineTo(x1, top + i * lh); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("📱", x0 - 32, top + rh / 2); ctx.fillText("🖥️", x1 + 30, top + rh / 2);
      ctx.fillStyle = ink(); ctx.font = SD.font(15); ctx.fillText("client", x0 - 32, top + rh / 2 + 28); ctx.fillText("server", x1 + 30, top + rh / 2 + 28);
      // spawn
      for (let l = 0; l < lanes; l++) { spawnT[l] -= dt; if (spawnT[l] <= 0) { spawnT[l] += 1 / RATE; cars.push({ lane: l, t: 0 }); } }
      ctx.font = Math.min(26, lh * 0.7) + "px serif";
      cars.forEach((c) => {
        c.t += dt / dur;
        const x = x0 + 14 + (x1 - x0 - 28) * c.t, y = top + lh * (c.lane + 0.5);
        ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.fillText("🚗", 0, 0); ctx.restore();
      });
      cars = cars.filter((c) => c.t < 1);
    }).start();
  })();

  /* ---------- 3.2 latency numbers ---------- */
  const LN = [
    ["🧠", "CPU L1 cache read", "the pocket of the CPU", 1],
    ["🗃️", "Main memory (RAM) read", "the desk drawer", 100],
    ["🗜️", "Compress 1 KB", "", 2000],
    ["📖", "Read 1 MB from RAM", "", 10000],
    ["💾", "SSD random read", "fast flash storage", 100000],
    ["🏢", "Round trip inside one data center", "server → server nearby", 500000],
    ["💿", "Spinning hard-disk seek", "a needle moving", 5000000],
    ["👁️", "A blink of an eye", "for comparison", 300000000],
    ["🌍", "Round trip California ↔ Europe", "speed-of-light limited!", 150000000],
  ].sort((a, b) => a[3] - b[3]);
  let human = false;
  const fmtNs = (ns) => ns < 1e3 ? ns + " ns" : ns < 1e6 ? +(ns / 1e3).toFixed(1) + " µs" : +(ns / 1e6).toFixed(1) + " ms";
  function drawLat() {
    const max = Math.log10(3e8);
    $("#latList").innerHTML = LN.map(([e, name, sub, ns]) => {
      const p = Math.max(1.5, (Math.log10(ns) / max) * 100), hue = 130 - (Math.log10(ns) / max) * 130;
      return `<div class="lat-row"><div class="what">${e} ${name}${sub ? `<small>${sub}</small>` : ""}</div>
        <div class="bar-wrap"><div class="bar" style="width:${p}%;background:hsl(${hue} 80% 60%)"></div></div>
        <div class="v">${human ? fmtSecs(ns) : "~" + fmtNs(ns)}</div></div>`;
    }).join("");
  }
  $("#humanBtn").addEventListener("click", (e) => { human = !human; e.target.textContent = human ? "💻 Show real time" : "🧒 Show in human time"; e.target.classList.toggle("on", human); drawLat(); });
  drawLat();

  /* ---------- 3.3 percentiles ---------- */
  const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  function sample(slowP) {
    if (Math.random() < slowP) return 250 + Math.random() * 300 + -Math.log(Math.random()) * 500;
    return Math.exp(Math.log(80) + 0.35 * randn());
  }
  const pctl = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
  const hueOf = (ms) => 130 - clamp((Math.log10(ms) - Math.log10(40)) / (Math.log10(1500) - Math.log10(40)), 0, 1) * 130;
  let data = [];
  const hist = SD.canvas($("#histCv"), drawHist, 0.4, 230, 360);
  function regen() {
    const s = +$("#slow").value / 100;
    $("#slowV").textContent = $("#slow").value + "%";
    data = Array.from({ length: 1000 }, () => sample(s)).sort((a, b) => a - b);
    const kids = Array.from({ length: 100 }, () => sample(s)).sort((a, b) => a - b);
    $("#kids").innerHTML = kids.map((ms, i) => {
      const mark = i === 49 || i === 89 || i === 98;
      return `<div class="kid${mark ? " mark" : ""}" style="background:hsl(${hueOf(ms)} 80% 62%)" title="#${i + 1}: ${Math.round(ms)} ms">${mark ? `<span class="tagp">p${i + 1}</span>` : ""}${Math.round(ms)}</div>`;
    }).join("");
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const vals = [["avg", avg, "😐 average"], ["p50", pctl(data, 50), "🙂 median"], ["p90", pctl(data, 90), ""], ["p99", pctl(data, 99), "😤 1 in 100"], ["p99.9", pctl(data, 99.9), "😱 1 in 1000"], ["max", data[data.length - 1], ""]];
    $("#pctVals").innerHTML = vals.map(([k, v, s]) => `<div class="stat"><span class="v" style="font-size:1.5rem">${Math.round(v)}<small style="font-size:.9rem"> ms</small></span><span class="k">${k} ${s}</span></div>`).join("");
    hist.vals = vals;
    drawHist();
  }
  function drawHist() {
    const { ctx, w, h } = hist; if (!data.length) return;
    ctx.clearRect(0, 0, w, h);
    const L = Math.log10(20), R = Math.log10(4000), pad = 30, bw = w - pad * 2, bh = h - 70, base = h - 40;
    const X = (ms) => pad + ((Math.log10(clamp(ms, 20, 4000)) - L) / (R - L)) * bw;
    const nb = 50, bins = new Array(nb).fill(0);
    data.forEach((ms) => bins[clamp(Math.floor(((Math.log10(clamp(ms, 20, 3999)) - L) / (R - L)) * nb), 0, nb - 1)]++);
    const mx = Math.max(...bins);
    bins.forEach((c, i) => {
      if (!c) return;
      const x = pad + (i / nb) * bw, wdt = bw / nb - 2, ht = Math.max(2, (c / mx) * bh);
      const ms = Math.pow(10, L + ((i + 0.5) / nb) * (R - L));
      ctx.fillStyle = `hsl(${hueOf(ms)} 75% 60%)`; ctx.strokeStyle = ink(); ctx.lineWidth = 1.2;
      ctx.fillRect(x, base - ht, wdt, ht); ctx.strokeRect(x, base - ht, wdt, ht);
    });
    ctx.strokeStyle = ink(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, base); ctx.lineTo(w - pad, base); ctx.stroke();
    ctx.fillStyle = soft(); ctx.font = SD.font(13); ctx.textAlign = "center"; ctx.textBaseline = "top";
    [20, 50, 100, 200, 500, 1000, 2000].forEach((t) => { ctx.fillText(t >= 1000 ? t / 1000 + "s" : t + "ms", X(t), base + 6); });
    const cols = { avg: "#868e96", p50: "#2f9e44", p90: "#f59f00", p99: "#e8590c", "p99.9": "#e03131" };
    (hist.vals || []).filter((v) => cols[v[0]]).forEach(([k, v], i) => {
      const x = X(v);
      ctx.strokeStyle = cols[k]; ctx.lineWidth = 3; ctx.setLineDash(k === "avg" ? [6, 5] : []);
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, 22 + i * 15); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = cols[k]; ctx.font = SD.font(15, "head"); ctx.textBaseline = "bottom";
      ctx.fillText(k, x, 22 + i * 15);
    });
  }
  $("#slow").addEventListener("input", regen); $("#regen").addEventListener("click", regen);
  document.addEventListener("themechange", drawHist);
  if (document.fonts) document.fonts.ready.then(drawHist);
  regen();

  /* ---------- 3.4 tail at scale ---------- */
  function fan() {
    const n = +$("#fan").value, p = 1 - Math.pow(0.99, n);
    $("#fanV").textContent = n;
    $("#fanOut").textContent = (p * 100).toFixed(p < 0.1 ? 1 : 0) + "%";
    const bar = $("#fanBar"); bar.style.width = p * 100 + "%"; bar.style.background = p > 0.5 ? "var(--red)" : p > 0.2 ? "var(--orange)" : "var(--green)";
    $("#fanNote").innerHTML = `About <b>${Math.round(p * 100)} of every 100</b> page loads wait for at least one slow (p99) service. ${n >= 100 ? "😱 Your p99 became everyone's p63!" : ""}`;
  }
  $("#fan").addEventListener("input", fan); fan();

  /* ---------- 3.5 nines ---------- */
  const NINES = [
    [0.9, "90%", "one 9", "a whole month-long vacation 🏖️"],
    [0.99, "99%", "two 9s", "a long weekend 🏕️"],
    [0.999, "99.9%", "three 9s", "one night's sleep 😴"],
    [0.9999, "99.99%", "four 9s", "one TV episode 📺"],
    [0.99999, "99.999%", "five 9s", "brushing your teeth twice 🪥"],
  ];
  $("#nines").innerHTML = NINES.map((n, i) => `<button class="chip" data-i="${i}">${n[1]} <span class="muted small">(${n[2]})</span></button>`).join("");
  function nines(i) {
    const [a, label, , fun] = NINES[i];
    $$("#nines .chip").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
    const down = 1 - a, yr = 365.25 * 86400 * down;
    $("#ninesStats").innerHTML = [["per year", yr], ["per month", yr / 12], ["per week", yr / 52.18], ["per day", 86400 * down]]
      .map(([k, s]) => `<div class="stat"><span class="v" style="font-size:1.5rem">${fmtSecs(s)}</span><span class="k">down ${k}</span></div>`).join("");
    const dd = 365 * down;
    let html = "";
    for (let d = 0; d < 365; d++) {
      const f = clamp(dd - d, 0, 1);
      if (f >= 1) html += '<i class="dn"></i>';
      else if (f > 0) html += `<i style="background:linear-gradient(90deg,var(--red) ${Math.max(f * 100, 8)}%,var(--hl-green) 0)"></i>`;
      else html += "<i></i>";
    }
    $("#year").innerHTML = html;
    $("#ninesNote").innerHTML = `${label} uptime still allows downtime about as long as <b>${fun}</b> every year. ${i >= 3 ? "(The red sliver is so small you can barely see it — that's the point!)" : ""}`;
  }
  $("#nines").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) nines(+b.dataset.i); });
  nines(2);

  function chain() {
    const a = +$("#aA").value / 10000, b = +$("#aB").value / 10000;
    const pct = (x) => (x * 100).toFixed(x > 0.9999 ? 4 : x > 0.999 ? 3 : 2) + "%";
    $("#aV").textContent = pct(a); $("#bV").textContent = pct(b);
    const ser = a * b, par = 1 - (1 - a) * (1 - a);
    $("#serOut").innerHTML = `${pct(ser)} <span class="muted small">(~${fmtSecs((1 - ser) * 365.25 * 86400)} down/yr)</span> 📉`;
    $("#parOut").innerHTML = `${pct(par)} <span class="muted small">(~${fmtSecs((1 - par) * 365.25 * 86400)} down/yr)</span> 📈`;
  }
  $("#aA").addEventListener("input", chain); $("#aB").addEventListener("input", chain); chain();

  /* ---------- 3.6 error budget ---------- */
  function budget() {
    const slo = +$("#sloSel").value, total = 30 * 24 * 60 * (1 - slo);
    const used = $("#used"); used.max = Math.max(10, Math.round(total * 1.5));
    const u = +used.value;
    $("#sloV").textContent = (slo * 100).toFixed(2).replace(/\.?0+$/, "") + "%";
    $("#usedV").textContent = u + " min";
    const f = clamp(u / total, 0, 1);
    $("#budBar").style.width = f * 100 + "%";
    $("#budTxt").textContent = `${Math.max(0, total - u).toFixed(1)} of ${total.toFixed(1)} min left`;
    $("#budVerdict").innerHTML = f < 0.5 ? "🚀 Plenty of budget: ship features, try experiments!" : f < 1 ? "🟡 Careful: slow down risky releases." : "🧯 Budget blown! Freeze launches and fix reliability first.";
  }
  $("#sloSel").addEventListener("change", budget); $("#used").addEventListener("input", budget); budget();

  /* ---------- 3.7 estimation ---------- */
  function calc() {
    const dau = Math.pow(10, +$("#dau").value), wpu = +$("#wpu").value, rw = +$("#rw").value;
    const size = Math.pow(10, +$("#size").value), yrs = +$("#yrs").value, peak = +$("#peak").value;
    $("#dauV").textContent = fmtNum(dau); $("#wpuV").textContent = wpu; $("#rwV").textContent = rw + " : 1";
    $("#sizeV").textContent = fmtBytes(size); $("#yrsV").textContent = yrs; $("#peakV").textContent = peak + "×";
    const wq = (dau * wpu) / 86400, rq = wq * rw, pk = (wq + rq) * peak;
    const day = dau * wpu * size, total = day * 365 * yrs * 3;
    const egress = rq * size * 8; // bits/s
    const servers = Math.max(2, Math.ceil(pk / 1000));
    const bw = egress >= 1e9 ? (egress / 1e9).toFixed(1) + " Gbps" : (egress / 1e6).toFixed(1) + " Mbps";
    $("#calcOut").innerHTML = [
      ["✍️ writes/s", fmtNum(wq)], ["👀 reads/s", fmtNum(rq)], ["🔥 peak req/s", fmtNum(pk)],
      ["💾 new data/day", fmtBytes(day)], ["🗄️ total (×3 copies)", fmtBytes(total)], ["📤 bandwidth out", bw],
    ].map(([k, v]) => `<div class="stat"><span class="v" style="font-size:1.45rem">${v}</span><span class="k">${k}</span></div>`).join("");
    $("#calcSay").innerHTML = `<span class="lbl">🧾 What this tells us</span><p class="mb0">Roughly <b>${servers} app servers</b> at peak (≈1K req/s each, before headroom). ` +
      (total > 1e14 ? "Storage is in the <b>hundreds of TB+</b> → object storage + sharded metadata. " : total > 1e12 ? "Storage in the <b>TBs</b> → plan for sharding or object storage. " : "Storage fits on a few machines — keep it simple! ") +
      (rw >= 20 ? "It's <b>read-heavy</b> → caches, replicas and a CDN will do most of the work." : "Lots of writes → think about write-friendly databases and queues.") + "</p>";
  }
  ["dau", "wpu", "rw", "size", "yrs", "peak"].forEach((id) => $("#" + id).addEventListener("input", calc));
  calc();
})();
