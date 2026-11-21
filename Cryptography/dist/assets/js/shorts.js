/* Crypto Shorts: a vertical, swipeable feed of key ideas, true stories, warnings and quick quizzes. */
(() => {
  'use strict';
  const { $, h } = CS;
  const S = CS.state;
  const feed = $('#shorts'); if (!feed) return;

  const FACTS = [
    ['🌌', 'Even with a billion computers each testing a billion keys per second, trying all 128-bit keys would take about <b>780 times the age of the universe</b>.', 3],
    ['🎂', 'In a room of just <b>23 people</b>, there’s a better than 50% chance two share a birthday. That’s why hash collisions arrive after ~2<sup>n/2</sup> tries.', 6],
    ['🌋', 'Cloudflare photographs a wall of about <b>100 lava lamps</b> and mixes the chaos into its random number generators.', 4],
    ['🔢', 'The largest RSA-style number publicly factored is <b>RSA-250</b> (829 bits), cracked in 2020 with about <b>2,700 years</b> of computer-core time. Real keys use 617+ digits.', 3],
    ['🔓', 'In 1998 the EFF built “Deep Crack” and broke DES in <b>56 hours</b>. 56-bit keys were officially too short.', 2],
    ['🔐', 'Since 2015, <b>Let’s Encrypt</b> has issued free, automated certificates, which made HTTPS the default for the web.', 13],
    ['⚛️', 'Your browser probably already uses <b>post-quantum</b> key exchange: <code>X25519MLKEM768</code> is on by default in Chrome, Edge and Firefox.', 10],
    ['🕵️', 'The RSA idea was invented in <b>1973 by Clifford Cocks at GCHQ</b>, and kept classified until 1997.', 2],
    ['📱', 'Your authenticator app’s 6-digit code is just <b>HMAC-SHA1(secret, time ÷ 30)</b>, cut down to 6 digits.', 16],
    ['🤝', 'A full TLS 1.3 handshake takes <b>one round trip</b>: key exchange, certificate, signature, MAC… all of it.', 14],
    ['🧂', 'A salt isn’t secret. It sits right next to the hash. Its only job is to make every hash unique.', 8],
    ['🎰', 'Enigma had about <b>159 quintillion</b> settings, but it never encrypted a letter as itself. That tiny pattern helped break it.', 2],
  ];

  // seeded daily shuffle so the feed feels fresh each day
  let seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const items = [...SHORTS.map((s, i) => ({ ...s, id: s.id || `${s.t}-${s.ch}-${s.sec}-${i}` })), ...FACTS.map(([e, html, ch], i) => ({ t: 'fact', emoji: e, html, ch, id: 'fact-' + i, url: `chapter-${String(ch).padStart(2, '0')}.html` }))];
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  for (let i = 1; i < items.length; i++) if (items[i].t === 'quiz' && items[i - 1].t === 'quiz') { const k = items.findIndex((x, j) => j > i && x.t !== 'quiz'); if (k > 0) [items[i], items[k]] = [items[k], items[i]]; }

  const KIND = { key: ['💡', 'KEY IDEA'], story: ['📜', 'TRUE STORY'], warn: ['⚠️', 'WATCH OUT'], quiz: ['❓', 'QUICK QUIZ'], fact: ['🤯', 'DID YOU KNOW?'] };
  const chHref = (it) => (it.url || `chapter-${String(it.ch).padStart(2, '0')}.html`);

  const intro = h('section', { class: 'short t-end' }, h('div', { class: 'short-card', style: 'text-align:center' }, h('div', { style: 'font-size:3.4rem' }, '⚡'), h('h3', {}, 'Crypto Shorts'), h('p', { class: 'short-body' }, `${items.length} bite-sized cards: key ideas, true stories, traps and quick quizzes, straight from the guide. Fresh order every day.`), h('p', { class: 'short-body' }, 'Swipe ⬆️, scroll, or press ↓ / j.')), h('div', { class: 'swipe-hint' }, '⬆️ swipe up'));
  feed.append(intro);

  items.forEach((it, idx) => {
    const [emoji, kind] = KIND[it.t];
    const card = h('div', { class: 'short-card' }, h('span', { class: 'short-emoji' }, it.emoji || emoji), h('div', { class: 'short-kind' }, kind), h('h3', {}, it.t === 'quiz' ? it.q.replace(/<[^>]+>/g, '') : it.secTitle || (it.chTitle ? it.chTitle : 'Did you know?')));
    if (it.t === 'quiz') {
      const opts = h('div', { class: 'q-opts' }); const why = h('p', { class: 'q-why', hidden: true });
      it.o.forEach((o, j) => opts.append(h('button', { class: 'q-opt', type: 'button', html: o, onclick: () => {
        [...opts.children].forEach((b, k) => { b.disabled = true; if (k === it.a) b.classList.add('right'); if (k === j && j !== it.a) b.classList.add('wrong'); });
        why.hidden = false; why.innerHTML = (j === it.a ? '✅ <b>Correct!</b> ' : '❌ <b>Not quite.</b> ') + it.why;
        if (j === it.a) CS.award('short:' + it.id, 5, 'Shorts quiz');
      } })));
      card.append(opts, why);
    } else card.append(h('div', { class: 'short-body', html: it.html }));
    card.append(h('div', { class: 'short-foot' }, h('a', { href: chHref(it) }, `📖 ${it.ch === 'appendix' ? 'Appendix' : 'Chapter ' + it.ch}${it.chTitle ? ': ' + it.chTitle : ''} →`), h('small', {}, `${idx + 1} / ${items.length}`)));
    const like = h('button', { class: 'rail-btn' + (S.likes[it.id] ? ' on' : ''), type: 'button', 'aria-label': 'Like', onclick: () => { S.likes[it.id] = !S.likes[it.id]; like.classList.toggle('on', !!S.likes[it.id]); if (S.likes[it.id]) { like.classList.add('pop'); setTimeout(() => like.classList.remove('pop'), 500); } CS.save(); } }, '❤️');
    const share = h('button', { class: 'rail-btn', type: 'button', 'aria-label': 'Copy link to this chapter', onclick: async () => { try { await navigator.clipboard.writeText(new URL(chHref(it), location.href).href); CS.toast('🔗 Link copied'); } catch (e) { CS.toast('Copy failed'); } } }, '🔗');
    const open = h('a', { class: 'rail-btn', href: chHref(it), 'aria-label': 'Open chapter', style: 'text-decoration:none' }, '📖');
    feed.append(h('section', { class: `short t-${it.t}`, 'data-id': it.id }, card, h('div', { class: 'short-rail' }, like, share, open)));
  });
  feed.append(h('section', { class: 'short t-end' }, h('div', { class: 'short-card', style: 'text-align:center' }, h('div', { style: 'font-size:3.4rem' }, '🏁'), h('h3', {}, 'You reached the end!'), h('p', { class: 'short-body' }, 'Now go deeper: every card came from a chapter with live demos and a boss quiz.'), h('p', {}, h('a', { class: 'btn', href: 'index.html' }, '🗺️ Open the map')))));

  // seen tracking & HUD
  const hud = $('#shortsCount');
  const all = [...feed.querySelectorAll('.short[data-id]')];
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const id = e.target.dataset.id, i = all.indexOf(e.target);
    hud.textContent = i >= 0 ? `${i + 1} / ${all.length}` : '';
    if (id && !S.seen[id]) {
      S.seen[id] = 1; CS.save();
      const n = Object.keys(S.seen).length;
      if (n % 10 === 0) CS.award('shorts-' + n, 10, `Swiped ${n} Shorts`);
      if (n >= 15) CS.achieve('shorts');
    }
  }), { threshold: .6 });
  all.forEach((s) => io.observe(s));

  const go = (d) => { const hgt = feed.clientHeight; feed.scrollBy({ top: d * hgt, behavior: 'smooth' }); };
  document.addEventListener('keydown', (e) => {
    if (/input|textarea/i.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  });
  feed.focus({ preventScroll: true });
})();
