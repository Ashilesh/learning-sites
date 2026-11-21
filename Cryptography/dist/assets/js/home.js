/* Landing page: decrypting hero line, continue card, level map and the Vault. */
(() => {
  'use strict';
  const { $, $$, h, enc, dec, hex, fromB64 } = CS;
  const S = CS.state;

  // ---- hero "decryption" effect
  const line = $('#decrypt');
  if (line && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const target = line.textContent, glyphs = '0123456789abcdef#%&@$?!';
    let f = 0;
    const tick = () => {
      const shown = Math.floor(f / 2);
      line.textContent = [...target].map((c, i) => (i < shown || c === ' ' ? c : glyphs[(Math.random() * glyphs.length) | 0])).join('');
      if (shown <= target.length) { f++; requestAnimationFrame(tick); }
    };
    setTimeout(tick, 400);
  }

  // ---- continue where you left off
  const cc = $('#continueCard');
  if (cc && S.last && S.last.file && S.last.ch !== undefined) {
    const href = S.last.file + (S.last.sec ? '#' + S.last.sec : '');
    cc.hidden = false;
    cc.append(h('span', { style: 'font-size:2rem' }, '📍'), h('p', {}, `Welcome back! You were reading ${S.last.ch === 0 ? 'Start here' : 'Chapter ' + S.last.ch}: ${S.last.title}.`), h('a', { class: 'btn', href }, 'Continue →'));
    const cta = $('#ctaStart'); if (cta) { cta.href = href; cta.textContent = '▶ Continue the journey'; }
  }

  // ---- level map states
  $$('.level[data-ch]').forEach((li) => {
    const n = li.dataset.ch, info = SITE.chapters.find((c) => String(c.n) === n);
    const read = info ? info.secs.filter((id) => S.read[n + ':' + id]).length : 0;
    const st = li.querySelector('.lv-state');
    if (S.done[n]) { li.classList.add('done'); st.textContent = `✅ boss beaten · 🔑 ${S.frags[n] ? 'fragment won' : ''}`; }
    else if (read) { li.classList.add('started'); st.textContent = `✏️ ${read}/${info.secs.length} sections read`; }
    if (S.last && String(S.last.ch) === n) li.classList.add('current');
  });

  // ---- the vault
  const V = SITE.vault;
  const ctEl = $('#vaultCt'); if (ctEl) ctEl.textContent = hex(fromB64(V.ct)).slice(0, 96) + '…';
  const slots = $('#vaultSlots');
  const got = [];
  if (slots) {
    for (let i = 1; i <= V.n; i++) {
      const w = S.frags[i];
      if (w) got.push(w);
      slots.append(h('li', { class: w ? 'got' : '' }, w ? `🔑 ${w}` : h('a', { href: `chapter-${String(i).padStart(2, '0')}.html#boss` }, `Ch ${i} 🔒`)));
    }
    const btn = $('#vaultOpen'), hint = $('#vaultHint'), msg = $('#vaultMsg');
    const all = got.length === V.n;
    btn.disabled = !all;
    hint.textContent = all ? `All ${V.n} fragments collected. Go!` : `${got.length} / ${V.n} fragments collected. Beat more boss quizzes!`;
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = `⏳ Stretching ${V.n} words with PBKDF2…`;
      try {
        const pass = Array.from({ length: V.n }, (_, i) => S.frags[i + 1]).join('-');
        const base = await crypto.subtle.importKey('raw', enc(pass), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(V.salt), iterations: V.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        const pt = dec(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(V.iv) }, key, fromB64(V.ct)));
        msg.hidden = false; msg.textContent = pt; $('#vaultIcon').textContent = '🔓'; btn.textContent = '🔓 Opened!';
        CS.confetti(220); CS.award('vault', 200, 'Opened the vault!'); CS.achieve('vault');
      } catch (e) {
        msg.hidden = false; msg.textContent = '❌ The AES-GCM tag did not verify: one of the fragments is wrong. (That’s authenticated encryption doing its job!)';
        btn.disabled = false; btn.textContent = '🔓 Try to open';
      }
    });
  }
})();
