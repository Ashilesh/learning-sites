/* =========================================================
   Cyber Sketchbook — extra labs (loaded after app.js,
   reuses its helpers: $, $$, rand, confetti, isDark, observeReveals)
   ========================================================= */

/* ---------- SHA-256 (pure JS, so it works even from file://) ---------- */
const sha256 = (() => {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const ror = (x, n) => (x >>> n) | (x << (32 - n));
  return str => {
    const bytes = new TextEncoder().encode(str), l = bytes.length;
    const buf = new Uint8Array(((l + 9 + 63) >> 6) << 6);
    buf.set(bytes); buf[l] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(buf.length - 8, Math.floor(l / 0x20000000));
    dv.setUint32(buf.length - 4, (l * 8) >>> 0);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const W = new Uint32Array(64);
    for (let o = 0; o < buf.length; o += 64) {
      for (let t = 0; t < 16; t++) W[t] = dv.getUint32(o + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = ror(W[t - 15], 7) ^ ror(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        const s1 = ror(W[t - 2], 17) ^ ror(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) >>> 0;
        const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => H[i] = (H[i] + v) >>> 0);
    }
    return H.map(x => x.toString(16).padStart(8, '0')).join('');
  };
})();
/* --- end sha256 --- */

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NS = 'http://www.w3.org/2000/svg';

/* =========================================================
   TREASURE MAP + "visited" stamps
   ========================================================= */
(function treasureMap() {
  const svg = $('#mapSvg'); if (!svg) return;
  const LEVELS = [
    ['Basics', '🌱', '#c6e86b'], ['Villains & heroes', '⚔️', '#ffb3cc'], ['How protection works', '🔧', '#a8d1ff'],
    ['Spot the tricks', '🕵️', '#ffc89e'], ['When things go wrong', '🚑', '#c9b3ff'], ['Pro level', '🚀', '#7ff0cc'], ['Show what you know', '🏆', '#ffd23f'],
  ];
  const STOPS = [
    ['what', '🏠', 'What is it?', 0], ['cia', '🤞', 'Big 3', 0], ['risk', '☔', 'Risk', 0], ['castle-sec', '🏰', '3D castle', 0],
    ['villains', '😈', 'Villains', 1], ['heroes', '🦸', 'Heroes', 1],
    ['auth', '🪪', 'Login & access', 2], ['journey-sec', '📦', 'Packets', 2], ['crypto', '🔐', 'Secret codes', 2], ['hash', '🫆', 'Hashing', 2], ['password', '💪', 'Passwords', 2],
    ['phish', '🎣', 'Phishing', 3], ['urls', '🔍', 'Fake links', 3], ['webattacks', '🧙', 'Web tricks', 3], ['privacy', '👣', 'Privacy', 3],
    ['story', '📖', 'Hack story', 4], ['uhoh', '🚑', 'Got hacked?', 4],
    ['ebpf', '🐝', 'eBPF', 5], ['world', '🌍', 'Real world', 5],
    ['glossary', '📝', 'Words', 6], ['quiz', '🏆', 'Quiz', 6], ['pledge', '✋', 'Pledge', 6],
  ];
  let visited = new Set();
  try { visited = new Set(JSON.parse(localStorage.getItem('cyber-visited') || '[]')); } catch (e) {}
  const save = () => { try { localStorage.setItem('cyber-visited', JSON.stringify([...visited])); } catch (e) {} };

  $('#mapLegend').innerHTML = LEVELS.map(([n, e, c]) => `<span style="--c:${c}">${e} ${n}</span>`).join('');

  let cols = 0;
  function draw() {
    const narrow = svg.clientWidth < 620;
    if ((narrow ? 3 : 6) === cols && svg.childNodes.length) return paint();
    cols = narrow ? 3 : 6;
    const W = narrow ? 600 : 1000, gap = narrow ? 200 : 164, x0 = narrow ? 100 : 90, rowH = 150;
    const rows = Math.ceil(STOPS.length / cols), H = 90 + (rows - 1) * rowH + 90;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const pos = STOPS.map((_, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      return { x: x0 + (r % 2 ? cols - 1 - c : c) * gap, y: 70 + r * rowH };
    });
    // winding dashed path
    let d = `M${pos[0].x} ${pos[0].y}`;
    for (let i = 1; i < pos.length; i++) {
      const p = pos[i - 1], q = pos[i];
      if (p.y === q.y) d += ` Q${(p.x + q.x) / 2} ${p.y + (i % 2 ? -26 : 26)} ${q.x} ${q.y}`;
      else { const out = p.x > W / 2 ? 90 : -90; d += ` C${p.x + out} ${p.y} ${q.x + out} ${q.y} ${q.x} ${q.y}`; }
    }
    let html = `<path d="${d}" fill="none" stroke="#23243a" stroke-width="4" stroke-dasharray="10 9" stroke-linecap="round" opacity=".55"/>`;
    html += `<text x="${pos[0].x - 36}" y="${pos[0].y - 52}" font-family="Permanent Marker" font-size="18" fill="#ef233c">START 🚩</text>`;
    STOPS.forEach(([id, emo, label, lv], i) => {
      const { x, y } = pos[i];
      html += `<a href="#${id}" data-id="${id}" aria-label="${esc(label)}"><g transform="translate(${x} ${y})"><g class="stop-in">
        <circle r="36" fill="${LEVELS[lv][2]}" stroke="#23243a" stroke-width="3.5"/>
        <text y="11" text-anchor="middle" font-size="30">${emo}</text>
        <text y="60" text-anchor="middle" font-family="Patrick Hand" font-size="${narrow ? 20 : 17}" fill="#23243a">${esc(label)}</text>
        <g class="stamp"><circle cx="28" cy="-28" r="15" fill="#06d6a0" stroke="#23243a" stroke-width="2.5"/><text x="28" y="-21" text-anchor="middle" font-family="Permanent Marker" font-size="18" fill="#23243a">✓</text></g>
        <text x="-30" y="-30" text-anchor="middle" font-family="Permanent Marker" font-size="13" fill="#55576e">${i + 1}</text>
      </g></g></a>`;
    });
    html += `<g id="youAreHere"><use href="#byte" width="46" height="50" x="-23" y="-25"/><text y="-30" text-anchor="middle" font-family="Permanent Marker" font-size="13" fill="#ef233c">you are here!</text></g>`;
    svg.innerHTML = html;
    svg._pos = pos;
    paint();
  }
  function paint() {
    $$('a[data-id]', svg).forEach(a => a.classList.toggle('visited', visited.has(a.dataset.id)));
    const n = STOPS.filter(s => visited.has(s[0])).length;
    $('#mapProgress').textContent = n === STOPS.length ? `🏆 All ${n} places explored! You're a true cyber explorer!` : `${n} / ${STOPS.length} places explored`;
    const next = STOPS.findIndex(s => !visited.has(s[0]));
    const you = $('#youAreHere', svg), p = svg._pos && svg._pos[next < 0 ? STOPS.length - 1 : next];
    if (you && p) you.setAttribute('transform', `translate(${p.x + 48} ${p.y + 6})`);
  }
  draw();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 150); });
  $('#mapReset').onclick = () => { visited.clear(); save(); paint(); };

  // a section counts as visited once it crosses the middle of the screen
  const ids = new Set(STOPS.map(s => s[0]));
  const vo = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || visited.has(e.target.id)) return;
    visited.add(e.target.id); save(); paint();
    if (visited.size >= STOPS.length && [...ids].every(i => visited.has(i))) confetti(120);
  }), { rootMargin: '-45% 0px -45% 0px' });
  STOPS.forEach(([id]) => { const el = document.getElementById(id); if (el) vo.observe(el); });
})();

/* =========================================================
   RISK-O-METER
   ========================================================= */
(function riskMeter() {
  const grid = $('#riskGrid'); if (!grid) return;
  const heat = ['#7ff0cc', '#c6e86b', '#ffe066', '#ffb36b', '#ff7a93'];
  for (let bad = 5; bad >= 1; bad--) for (let lik = 1; lik <= 5; lik++) {
    const c = document.createElement('div');
    c.style.background = heat[Math.min(4, Math.floor((bad * lik - 1) / 5))];
    c.dataset.k = `${lik}-${bad}`;
    grid.appendChild(c);
  }
  const EX = [
    { e: '🔑', t: '"123456" as your game password', l: 5, b: 4, why: 'Robots guess it in under a second and you lose your account.', fix: { l: 1, b: 4, how: 'Use a long passphrase + 2-step login: guessing becomes nearly impossible.' } },
    { e: '📱', t: 'Phone with no lock screen', l: 4, b: 4, why: 'If it\'s lost or grabbed, someone can read everything.', fix: { l: 1, b: 4, how: 'Add a PIN or fingerprint lock: a finder can\'t get in.' } },
    { e: '💾', t: 'School project with no backup', l: 3, b: 4, why: 'Spilled juice, a broken laptop or ransomware = project gone.', fix: { l: 3, b: 1, how: 'Keep a backup copy: if disaster hits, it barely hurts.' } },
    { e: '🎮', t: 'Console not updated for a year', l: 3, b: 3, why: 'Hackers know old bugs and look for un-updated devices.', fix: { l: 1, b: 3, how: 'Turn on automatic updates: the holes get patched.' } },
    { e: '☄️', t: 'A meteor hits the data center', l: 1, b: 5, why: 'Very unlikely, but terrible if it happens.', fix: { l: 1, b: 2, how: 'Big companies keep copies in other cities, so even this hurts less.' } },
    { e: '🎨', t: 'Someone sees your theme colour', l: 4, b: 1, why: 'Pretty likely… and totally harmless. Low risk!', fix: null },
  ];
  let cur = null, fixed = false;
  function place(l, b, emoji) {
    $$('div', grid).forEach(c => c.textContent = '');
    const cell = grid.querySelector(`[data-k="${l}-${b}"]`);
    cell.innerHTML = `<span class="pin">${emoji}</span>`;
  }
  function level(l, b) { const r = l * b; return r >= 15 ? ['🔴 HIGH risk', 'bad'] : r >= 6 ? ['🟠 MEDIUM risk', 'meh'] : ['🟢 LOW risk', 'good']; }
  EX.forEach((x, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = `${x.e} ${x.t}`;
    b.onclick = () => {
      $$('#riskChips .chip').forEach(c => c.classList.toggle('on', c === b));
      cur = x; fixed = false; place(x.l, x.b, x.e);
      const [lv, cls] = level(x.l, x.b);
      $('#riskExplain').className = 'verdict ' + cls;
      $('#riskExplain').innerHTML = `<b>${lv}</b> (likely ${x.l}/5 × bad ${x.b}/5). ${x.why}`;
      $('#riskFix').disabled = !x.fix;
    };
    $('#riskChips').appendChild(b);
  });
  $('#riskFix').onclick = () => {
    if (!cur || !cur.fix || fixed) return; fixed = true;
    place(cur.fix.l, cur.fix.b, '🛠️');
    const [lv, cls] = level(cur.fix.l, cur.fix.b);
    $('#riskExplain').className = 'verdict ' + cls;
    $('#riskExplain').innerHTML = `<b>Now: ${lv}</b>. ${cur.fix.how}`;
  };
})();

/* ---------- a bug's life: update slider ---------- */
(function bugLife() {
  const sl = $('#updSlider'); if (!sl) return;
  const upd = () => {
    const d = +sl.value, w = 5 + d / 60 * 205;
    $('#updDays').textContent = d;
    $('#dangerZone').setAttribute('width', w);
    $('#youUpdate').setAttribute('transform', `translate(${w - 30} 0)`);
    const pct = Math.min(100, d / 30 * 100);
    $('#updBar').style.width = Math.max(4, pct) + '%';
    $('#updBar').style.background = d <= 2 ? '#06d6a0' : d <= 14 ? '#ffd23f' : '#ef233c';
    $('#updMsg').innerHTML = d <= 2 ? '🛡️ <b>Super fast!</b> Attackers barely get a chance.'
      : d <= 14 ? `😐 <b>${d} days</b> of open door. Attackers often start within days of a fix.`
        : `😱 <b>${d} days</b> of open door! Many real hacks use bugs that <i>already had a fix</i>. Turn on auto-update!`;
  };
  sl.oninput = upd; upd();
})();

/* =========================================================
   LOGIN & ACCESS
   ========================================================= */
(function factors() {
  const box = $('#factorChips'); if (!box) return;
  const F = [['🔤 Password', 'know'], ['🔢 PIN', 'know'], ['🐶 Pet\'s name answer', 'know'], ['📱 Code on your phone', 'have'],
    ['🔑 Security key', 'have'], ['💳 Key card', 'have'], ['👆 Fingerprint', 'are'], ['🙂 Face scan', 'are']];
  const kind = { know: 'something you KNOW 🧠', have: 'something you HAVE 📱', are: 'something you ARE 🫆' };
  let picked = [];
  F.forEach(([label, k], i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = label;
    b.onclick = () => {
      if (picked.includes(i)) picked = picked.filter(p => p !== i); else { picked.push(i); if (picked.length > 2) picked.shift(); }
      $$('.chip', box).forEach((c, j) => c.classList.toggle('on', picked.includes(j)));
      const v = $('#factorVerdict');
      if (picked.length < 2) { v.className = 'verdict'; v.textContent = '👆 pick one more'; return; }
      const [a, c] = picked.map(p => F[p]);
      if (a[1] === c[1]) { v.className = 'verdict bad'; v.innerHTML = `⚠️ Both are <b>${kind[a[1]]}</b>. One peek or one stolen thing could get both. <b>Not</b> real 2-factor!`; }
      else { v.className = 'verdict good'; v.innerHTML = `✅ Real 2-factor! <b>${kind[a[1]]}</b> + <b>${kind[c[1]]}</b>. A thief would need to get BOTH.`; }
    };
    box.appendChild(b);
  });
})();

(function schoolBadges() {
  const school = $('#school'); if (!school) return;
  const ROOMS = [['🧑‍🏫', 'Classroom'], ['📚', 'Library'], ['🍕', 'Cafeteria'], ['☕', 'Teachers\' lounge'], ['📝', 'Exam vault'], ['🗂️', 'Principal\'s office'], ['🖥️', 'Server room']];
  const BADGES = [
    ['🎫 Visitor', [1, 2], 'Visitors only need the library and cafeteria.'],
    ['🎒 Student', [0, 1, 2], 'Students get classrooms, library and lunch. No exam peeking! 😉'],
    ['🍎 Teacher', [0, 1, 2, 3, 4], 'Teachers need the exam vault, but not the principal\'s files.'],
    ['👔 Principal', [0, 1, 2, 3, 4, 5], 'Even the boss doesn\'t get the server room: they don\'t need it!'],
    ['🧰 IT tech', [2, 6], 'The IT tech fixes servers, but can\'t read exam papers.'],
  ];
  school.innerHTML = ROOMS.map(([e, n]) => `<div class="room"><span class="st"></span><span class="ic">${e}</span>${n}</div>`).join('');
  BADGES.forEach(([label, open, msg]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = label;
    b.onclick = () => {
      $$('#badgeChips .chip').forEach(c => c.classList.toggle('on', c === b));
      $$('.room', school).forEach((r, i) => {
        const ok = open.includes(i);
        r.className = 'room ' + (ok ? 'open' : 'locked');
        $('.st', r).textContent = ok ? '✅' : '🔒';
      });
      $('#badgeMsg').className = 'verdict good';
      $('#badgeMsg').innerHTML = `<b>${label}</b> opens ${open.length} of ${ROOMS.length} doors. ${msg}`;
    };
    $('#badgeChips').appendChild(b);
  });
})();

/* =========================================================
   HASHING LAB
   ========================================================= */
(function hashLab() {
  const A = $('#hashA'); if (!A) return;
  const B = $('#hashB');
  const PAL = ['#ff4f8b', '#ffd23f', '#06d6a0', '#3a86ff', '#8338ec', '#fb5607', '#ef233c', '#2ec4b6',
    '#ffb3cc', '#fff3b8', '#a8f5dd', '#a8d1ff', '#c9b3ff', '#ffc89e', '#23243a', '#fffdf5'];
  const icon = (el, h) => { el.innerHTML = [...h].map(ch => `<i style="background:${PAL[parseInt(ch, 16)]}"></i>`).join(''); };
  function upd() {
    const ha = sha256(A.value), hb = sha256(B.value);
    icon($('#iconA'), ha); icon($('#iconB'), hb);
    let diff = 0;
    $('#hexA').innerHTML = [...ha].map((c, i) => c === hb[i] ? c : (diff++, `<b>${c}</b>`)).join('');
    $('#hexB').innerHTML = [...hb].map((c, i) => c === ha[i] ? c : `<b>${c}</b>`).join('');
    const v = $('#hashDiff');
    if (A.value === B.value) { v.className = 'verdict good'; v.innerHTML = '🟰 Same text → <b>exactly the same</b> fingerprint, every time. That\'s how a website checks your password!'; }
    else { v.className = 'verdict meh'; v.innerHTML = `🌪️ <b>${diff} of 64</b> characters changed! Tiny change → totally different fingerprint. And you can't work backwards from it.`; }
  }
  A.oninput = B.oninput = upd; upd();

  // salt demo
  const USERS = [['🧒 Ana', 'sunshine', 'x7Q2'], ['👦 Ben', 'sunshine', 'M9pa'], ['👧 Cara', 'PurpleTiger7!', 'k3Zr']];
  const tog = $('#saltToggle');
  function salt() {
    const on = tog.checked;
    const rows = USERS.map(([u, pw, s]) => ({ u, pw, s, h: sha256(on ? s + pw : pw) }));
    const same = rows[0].h === rows[1].h;
    $('#saltTable').innerHTML = `<tr><th>User</th><th>Password</th>${on ? '<th>Salt 🧂</th>' : ''}<th>Stored fingerprint</th></tr>` +
      rows.map((r, i) => `<tr><td>${r.u}</td><td>${esc(r.pw)}</td>${on ? `<td class="h">${r.s}</td>` : ''}<td class="h ${i < 2 ? (same ? 'same' : 'diff') : ''}">${r.h.slice(0, 14)}…</td></tr>`).join('');
    const m = $('#saltMsg');
    if (on) { m.className = 'verdict good'; m.innerHTML = '✅ With a random pinch of <b>salt</b> mixed in, Ana and Ben get <b>different</b> fingerprints. Hackers must crack each one separately. (Real sites also use <b>slow</b> hashes like bcrypt or Argon2.)'; }
    else { m.className = 'verdict bad'; m.innerHTML = '⚠️ Ana and Ben both use "sunshine", so their fingerprints are <b>identical</b>. Crack one, get both! Hackers even keep giant lists of common-password fingerprints.'; }
  }
  tog.onchange = salt; salt();
})();

/* =========================================================
   LINK DETECTIVE
   ========================================================= */
(function linkDetective() {
  const box = $('#urlGame'); if (!box) return;
  // [url, isReal, domainStart, domainEnd, explanation]
  const U = [
    ['https://megagame.com/login', true, 'megagame.com', 'The owner is exactly megagame.com. Real!'],
    ['https://megagame.com.prize-claim.xyz/login', false, 'prize-claim.xyz', '"megagame.com" is just a room name here. The real owner is prize-claim.xyz!'],
    ['https://support.megagame.com/help', true, 'megagame.com', 'support. is a room inside megagame.com\'s house. Real!'],
    ['https://rnegagame.com/login', false, 'rnegagame.com', 'Look closely: "rn" pretending to be "m"! rnegagame ≠ megagame.'],
    ['http://megagame-security-check.net/verify', false, 'megagame-security-check.net', 'A totally different house with "megagame" in its name. Plus no 🔒!'],
    ['https://megagame.com@free-gems.example/claim', false, 'free-gems.example', 'Sneaky! Everything before an @ is ignored. You\'d really go to free-gems.example.'],
    ['https://shop.megagame.com/skins', true, 'megagame.com', 'shop. is another room in megagame.com. Real!'],
  ];
  let score = 0, answered = 0;
  $('#urlTotal').textContent = U.length;
  U.forEach(([url, real, dom, why]) => {
    const row = document.createElement('div'); row.className = 'url-row';
    const i = url.lastIndexOf(dom, url.indexOf('/', 8) < 0 ? url.length : url.indexOf('/', 8));
    const shown = esc(url);
    row.innerHTML = `<div class="url-text">${shown}</div><div class="btns"><button type="button" data-a="1">✅ Real</button><button type="button" data-a="0">🚩 Fake</button></div><div class="fb"></div>`;
    $$('button', row).forEach(b => b.onclick = () => {
      const ok = (b.dataset.a === '1') === real;
      answered++; if (ok) score++;
      $$('button', row).forEach(x => x.disabled = true);
      b.style.background = ok ? '#a8f5dd' : '#ffc2d1';
      $('.url-text', row).innerHTML = i >= 0 ? esc(url.slice(0, i)) + `<span class="dom">${esc(dom)}</span>` + esc(url.slice(i + dom.length)) : shown;
      $('.fb', row).innerHTML = `${ok ? '✅ Correct!' : '❌ Oops!'} ${real ? '🟢 Real.' : '🔴 Fake.'} ${why}`;
      $('#urlScore').textContent = score;
      if (answered === U.length && score >= U.length - 1) confetti(90);
    });
    box.appendChild(row);
  });
})();

/* =========================================================
   WEB TRICKS: SQL injection + XSS (simulated, nothing runs)
   ========================================================= */
(function sqlInjection() {
  const user = $('#sqlUser'); if (!user) return;
  const pass = $('#sqlPass'), safe = $('#sqlSafe'), q = $('#sqlQuery'), res = $('#sqlResult');
  const TRICK = /'\s*(or|\|\|)\s*'?\s*(\w+)'?\s*=\s*'?\s*\2|'\s*(--|#|\/\*)/i;
  const hasQuote = s => s.includes("'");
  function render() {
    const u = user.value, p = pass.value;
    if (safe.checked) {
      q.innerHTML = `<span class="kw">SELECT</span> * <span class="kw">FROM</span> users\n<span class="kw">WHERE</span> name = ? <span class="kw">AND</span> password = ?\n\n✉️ envelope 1: <span class="env">${esc(u)}</span>\n✉️ envelope 2: <span class="env">${esc(p)}</span>`;
    } else {
      const mark = s => `<span class="${TRICK.test(s) || hasQuote(s) ? 'bad' : 'u'}">${esc(s)}</span>`;
      q.innerHTML = `<span class="kw">SELECT</span> * <span class="kw">FROM</span> users\n<span class="kw">WHERE</span> name = '${mark(u)}' <span class="kw">AND</span> password = '${mark(p)}'`;
    }
  }
  function login() {
    const u = user.value, p = pass.value, tricked = TRICK.test(u) || TRICK.test(p);
    if (!safe.checked && tricked) {
      res.className = 'verdict bad';
      res.innerHTML = `😱 <b>Logged in as admin without the password!</b> The robot read your text as an <i>instruction</i>: <code>OR '1'='1'</code> means "…or if 1 equals 1", which is always true!`;
    } else if (!safe.checked && (hasQuote(u) || hasQuote(p))) {
      res.className = 'verdict meh'; res.innerHTML = '🤖 "ERROR: I don\'t understand this note!" A stray <code>\'</code> broke the note. Hackers use errors like this to learn how a site works.';
    } else if (u === 'admin' && p === 'Tacos4Ever!') {
      res.className = 'verdict good'; res.innerHTML = '✅ Welcome, admin! (You guessed the practice password.)';
    } else if (safe.checked && tricked) {
      res.className = 'verdict good'; res.innerHTML = '🛡️ <b>Trick failed!</b> In a sealed envelope your text is <i>only</i> a password, never an instruction. The robot just looked for a password literally called that. Nope!';
    } else {
      res.className = 'verdict'; res.innerHTML = '❌ Wrong password. The robot says no.';
    }
  }
  user.oninput = pass.oninput = () => { render(); res.className = 'verdict'; res.innerHTML = 'Press <b>Log in</b> to hand the note to the robot.'; };
  safe.onchange = () => { render(); login(); };
  $('#sqlTrick').onclick = () => { pass.value = "' OR '1'='1"; render(); login(); };
  $('#sqlLogin').onclick = login;
  render();
})();

(function xss() {
  const wall = $('#commentWall'); if (!wall) return;
  const safe = $('#xssSafe'), res = $('#xssResult');
  const CODEY = /<\s*script|on\w+\s*=|javascript:|<\s*img|<\s*iframe/i;
  function post(name, text) {
    // we ALWAYS escape for real; "unsafe mode" only *pretends* the code ran
    const c = document.createElement('div'); c.className = 'comment';
    if (CODEY.test(text) && !safe.checked) {
      const visible = esc(text.replace(/<[^>]*>[^<]*<\/[^>]*>|<[^>]*>/g, '').trim()) || '…';
      c.classList.add('evil');
      c.innerHTML = `<b>${esc(name)}:</b> ${visible}<span class="boom">💥 Hidden code RAN in every visitor's browser: 🍪 their login cookies were sent to the hacker!</span>`;
      res.className = 'verdict bad'; res.innerHTML = '😱 The website treated the comment as <b>code</b>. Everyone who views the page gets attacked, not just one person!';
    } else if (CODEY.test(text)) {
      c.innerHTML = `<b>${esc(name)}:</b> <code>${esc(text)}</code>`;
      res.className = 'verdict good'; res.innerHTML = '🛡️ <b>Escaped!</b> The site turned the code into plain, harmless text. It shows up, but nothing runs.';
    } else {
      c.innerHTML = `<b>${esc(name)}:</b> ${esc(text)}`;
      res.className = 'verdict'; res.innerHTML = '👍 A normal comment. Try the sneaky one!';
    }
    wall.appendChild(c); wall.scrollTop = wall.scrollHeight;
  }
  $('#commentPost').onclick = () => { const t = $('#commentIn').value.trim(); if (t) { post('you', t); $('#commentIn').value = ''; } };
  $('#commentIn').onkeydown = e => { if (e.key === 'Enter') $('#commentPost').click(); };
  $('#commentEvil').onclick = () => post('n1ce_guy', "Cool pic! <script>sendCookiesTo('hacker')</script>");
})();

/* =========================================================
   PRIVACY: footprint clues + app permissions
   ========================================================= */
(function footprint() {
  const post = $('#post'); if (!post) return;
  const found = new Set();
  function hit(n, el) {
    if (found.has(n)) return;
    found.add(n);
    $$(`#post [data-c="${n}"]`).forEach(x => { x.classList.add('found'); x.dataset.n = n; });
    $(`#clueList li[data-c="${n}"]`).classList.add('found');
    $('#clueCount').textContent = found.size;
    if (found.size === 6) { $('#clueWin').style.display = 'block'; confetti(); }
  }
  $$('#post [data-c]').forEach(el => el.addEventListener('click', () => hit(el.dataset.c, el)));
})();

(function permissions() {
  const list = $('#permList'); if (!list) return;
  const P = [
    ['💡', 'Use the camera light', true, 'Yes! That\'s the flashlight. The only thing it needs.'],
    ['👥', 'Read your contacts', false, 'Why would a flashlight need your friends\' numbers? To sell them!'],
    ['📍', 'Know your location', false, 'A light doesn\'t care where you are. Trackers do.'],
    ['🎤', 'Use the microphone', false, 'A flashlight that listens? Big nope.'],
    ['🖼️', 'See all your photos', false, 'Your photos are none of its business.'],
    ['💬', 'Send text messages', false, 'Sneaky apps send paid texts that cost real money!'],
  ];
  let right = 0, done = 0;
  P.forEach(([e, what, ok, why]) => {
    const row = document.createElement('div'); row.className = 'perm';
    row.innerHTML = `<div>${e} ${what}<span class="why"></span></div><div class="btns"><button type="button" data-a="1">Allow</button><button type="button" data-a="0">Deny</button></div>`;
    $$('button', row).forEach(b => b.onclick = () => {
      const good = (b.dataset.a === '1') === ok;
      done++; if (good) right++;
      row.classList.add(good ? 'right' : 'wrong');
      $$('button', row).forEach(x => x.disabled = true);
      $('.why', row).textContent = (good ? '✅ ' : '❌ ') + why;
      if (done === P.length) {
        const r = $('#permResult');
        r.className = 'verdict ' + (right === P.length ? 'good' : 'meh');
        r.innerHTML = right === P.length ? '🏆 Perfect! You gave it only what it needs: <b>least privilege</b> again!' : `${right} / ${P.length} right. Rule of thumb: if a permission has nothing to do with what the app does, <b>deny</b>.`;
        if (right === P.length) confetti(60);
      }
    });
    list.appendChild(row);
  });
})();

/* =========================================================
   GOT HACKED? first-aid steps
   ========================================================= */
(function firstAid() {
  const box = $('#aidSteps'); if (!box) return;
  const S = [
    ['😮‍💨', 'Stay calm & tell a grown-up', 'Or your IT team. Hiding it lets it get worse, and nobody should be mad at you for asking for help.', 'yellow'],
    ['📴', 'Disconnect the weird device', 'Turn off Wi-Fi so the bad program can\'t talk to the hacker or spread.', 'pink'],
    ['💻', 'Change passwords from a SAFE device', 'Start with your EMAIL: it\'s the master key that can reset every other account.', 'blue'],
    ['📱', 'Turn on 2-step login', 'Even if they still know the password, they\'re locked out now.', 'teal'],
    ['🚪', 'Log out everywhere', 'Most apps have "sign out of all devices". It kicks the intruder out.', 'purple'],
    ['🔄', 'Update & scan', 'Install updates and run an antivirus scan to remove the bad program.', 'orange'],
    ['💾', 'Restore from backup', 'If files are broken or locked, bring back your clean copy.', 'yellow'],
    ['📣', 'Warn friends & report it', 'Tell friends not to click weird messages "from you", and report it to the app or website.', 'pink'],
  ];
  let done = 0;
  S.forEach(([ic, t, why, col], i) => {
    const d = document.createElement('div');
    d.className = `sketch aid-step reveal ${col} ${i % 2 ? 'alt' : ''}`; d.tabIndex = 0; d.setAttribute('role', 'button');
    d.innerHTML = `<span class="ic">${ic}</span><br><b>${t}</b><p class="why">${why}</p>`;
    const toggle = () => {
      d.classList.toggle('done');
      done = $$('.aid-step.done').length;
      const m = $('#aidMsg');
      m.className = 'verdict ' + (done === S.length ? 'good' : '');
      m.innerHTML = done === S.length ? '🏅 <b>Drill complete!</b> You know exactly what to do if it ever happens.' : `${done} / ${S.length} steps practised`;
      if (done === S.length) confetti(80);
    };
    d.onclick = toggle;
    d.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
    box.appendChild(d);
  });
})();

observeReveals();
