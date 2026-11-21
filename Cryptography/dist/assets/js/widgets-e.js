/* Widgets for Chapter 20: Going Deeper */
(() => {
  'use strict';
  const { h, enc, dec, hex, b64, rand, sha, hmac, fmt } = CS;
  const W = window.W;
  const field = (label, input) => h('label', { style: 'display:flex;flex-direction:column;gap:4px;flex:1 1 180px' }, label, input);
  const b64url = (bytes) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const cat = (...arrs) => { const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
  const short = (x, n = 40) => (x.length > n ? x.slice(0, n) + '…' : x);
  const byteStr = (b) => `${b.toString(16).padStart(2, '0')} ${b >= 33 && b < 127 ? '“' + String.fromCharCode(b) + '”' : ''}`;

  // ------------------------------------------------------------------ 20.1 IND-CPA game
  W.indgame = {
    title: 'Play the IND-CPA game: you are the attacker', chip: '🎲 Beat 50%?', xp: 25, sub: 'Ask the challenger to encrypt anything (step 1), then get a challenge: the encryption of M0 or M1. Guess which. Against deterministic encryption you can win every time. Against randomized encryption you’re stuck at a coin flip.',
    async init(el, api) {
      const m0 = h('input', { type: 'text', value: 'ATTACK AT DAWN!!' }), m1 = h('input', { type: 'text', value: 'RETREAT AT TEN!!' });
      const scheme = h('select', {}, h('option', { value: 'det' }, 'Deterministic (AES, fixed IV, like ECB)'), h('option', { value: 'rnd' }, 'Randomized (AES-GCM, fresh nonce)'));
      const detKey = await crypto.subtle.importKey('raw', rand(16), 'AES-CBC', false, ['encrypt']);
      const gcmKey = await crypto.subtle.importKey('raw', rand(16), 'AES-GCM', false, ['encrypt']);
      const encrypt = async (m) => scheme.value === 'det'
        ? new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, detKey, enc(m)))
        : (async () => { const iv = rand(12); return cat(iv, new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, gcmKey, enc(m)))); })();
      const log = h('div', { class: 'w-out', style: 'min-height:4.5em' }), chal = h('div', { class: 'w-out big' }), score = h('p', { class: 'w-note' });
      let b = null, cstar = null, rounds = 0, wins = 0;
      const lines = [];
      const addLog = (t) => { lines.unshift(t); log.innerHTML = lines.slice(0, 5).join('<br>'); };
      const query = async (which) => { const m = which ? m1.value : m0.value; addLog(`Enc(M${which}) = <b>${short(hex(await encrypt(m)), 48)}</b>`); };
      const challenge = async () => {
        if (enc(m0.value).length !== enc(m1.value).length) { chal.innerHTML = '<span class="w-bad">M0 and M1 must be the same length: length is allowed to leak.</span>'; return; }
        b = rand(1)[0] & 1; cstar = hex(await encrypt(b ? m1.value : m0.value));
        chal.innerHTML = `🎯 Challenge C* = <b>${short(cstar, 48)}</b><br><small>Is it M0 or M1? Use step 1 as much as you like.</small>`;
      };
      const guess = (g) => {
        if (b === null) { chal.textContent = 'Get a challenge first.'; return; }
        rounds++; if (g === b) wins++;
        chal.innerHTML = `${g === b ? '✅ Right!' : '❌ Wrong.'} It was M${b}.`;
        const rate = (100 * wins) / rounds;
        score.innerHTML = `Round ${rounds}: you won <b>${wins}/${rounds}</b> = <b style="color:${rate > 75 ? 'var(--coral-ink)' : 'var(--mint-ink)'}">${rate.toFixed(0)}%</b>. ${rounds >= 5 ? (rate > 75 ? 'You broke it: this scheme is <b>not</b> IND-CPA secure.' : 'No better than a coin flip: that’s what IND-CPA security looks like.') : ''}`;
        b = null; if (rounds >= 5) api.done('Played the IND-CPA game');
      };
      scheme.addEventListener('change', () => { lines.length = 0; log.innerHTML = ''; rounds = wins = 0; score.textContent = ''; chal.textContent = 'Scheme changed. Get a new challenge.'; b = null; });
      el.append(h('div', { class: 'w-row' }, field('M0', m0), field('M1', m1), field('Encryption scheme', scheme)),
        h('p', { class: 'w-note' }, '① Ask the challenger to encrypt (chosen plaintexts)'), h('div', { class: 'chips' }, h('button', { class: 'btn small ghost', type: 'button', onclick: () => query(0) }, 'Encrypt M0'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => query(1) }, 'Encrypt M1')), log,
        h('p', { class: 'w-note' }, '② Get the challenge, ③ guess'), h('div', { class: 'chips' }, h('button', { class: 'btn small', type: 'button', onclick: challenge }, '🎯 Get a challenge'), h('button', { class: 'btn small mint', type: 'button', onclick: () => guess(0) }, 'It’s M0'), h('button', { class: 'btn small ocean', type: 'button', onclick: () => guess(1) }, 'It’s M1')), chal, score);
    },
  };

  // ------------------------------------------------------------------ 20.3 Feistel
  W.feistel = {
    title: 'A toy Feistel cipher (same as the guide’s Python)', chip: '🔀 Rounds', xp: 20, sub: 'Two characters = two 8-bit halves. The round function F is a SHA-256 hash, which can’t be reversed, yet decryption works by running the rounds with the keys backwards.',
    init(el, api) {
      const pt = h('input', { type: 'text', value: 'Hi', maxlength: 2, style: 'max-width:90px;font-size:1.2rem;text-align:center' });
      const keysI = h('input', { type: 'text', value: 'k1, k2, k3, k4', style: 'font-family:var(--mono)' });
      const tbl = h('div', { class: 'table-wrap' }), out = h('div', { class: 'w-out big' });
      const F = async (half, k) => (await sha('SHA-256', cat(enc(k), new Uint8Array([half]))))[0];
      const run = async () => {
        const bytes = enc((pt.value + '  ').slice(0, 2)); const keys = keysI.value.split(',').map((k) => k.trim()).filter(Boolean);
        if (!keys.length) return;
        let L = bytes[0], R = bytes[1]; const rows = [`<tr><td>start</td><td>${byteStr(L)}</td><td>${byteStr(R)}</td><td></td></tr>`];
        for (const [i, k] of keys.entries()) { const f = await F(R, k); [L, R] = [R, L ^ f]; rows.push(`<tr><td>round ${i + 1} (${k})</td><td>${byteStr(L)}</td><td>${byteStr(R)}</td><td style="font-family:var(--mono)">F = ${f.toString(16).padStart(2, '0')}</td></tr>`); }
        const ct = [R, L];
        let dL = ct[0], dR = ct[1];
        for (const k of [...keys].reverse()) { const f = await F(dR, k); [dL, dR] = [dR, dL ^ f]; }
        const back = String.fromCharCode(dR, dL);
        tbl.innerHTML = `<table class="sk-table"><thead><tr><th>Step</th><th>Left half</th><th>Right half</th><th>F(right, key)</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
        out.innerHTML = `ciphertext (halves swapped at the end) = <b>${hex(ct)}</b><br>decrypt with keys ${[...keys].reverse().join(', ')} → <b style="color:var(--mint-ink)">“${back}”</b> ✓${pt.value === 'Hi' && keysI.value.replace(/\s/g, '') === 'k1,k2,k3,k4' ? ' &nbsp;(matches the guide: ebda)' : ''}`;
        api.done('Ran a Feistel cipher');
      };
      [pt, keysI].forEach((i) => i.addEventListener('input', run));
      el.append(h('div', { class: 'w-row' }, field('Plaintext (2 characters)', pt), field('Round keys (comma-separated)', keysI)), tbl, out); run();
    },
  };

  // ------------------------------------------------------------------ 20.4 difference distribution table
  W.ddt = {
    title: 'Where differential attacks find their foothold', chip: '🔥 Heat map', xp: 25, sub: 'For every input difference (row), count how often each output difference (column) appears across all 16 inputs of a 4-bit S-box. A random box would spread them evenly (~1 each). Hot cells are paths an attacker can follow.',
    init(el, api) {
      const BOXES = {
        'PRESENT (a real cipher)': [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2],
        'A random S-box': null,
        'A terrible S-box (x ⊕ 3)': Array.from({ length: 16 }, (_, x) => x ^ 3),
      };
      const sel = h('select', {}, Object.keys(BOXES).map((k) => h('option', { value: k }, k)));
      const grid = h('div', { style: 'display:grid;grid-template-columns:28px repeat(16,1fr);gap:2px;max-width:560px;font:400 .7rem var(--mono)' });
      const info = h('div', { class: 'w-out big' }), sboxOut = h('div', { class: 'w-out' });
      let S = BOXES['PRESENT (a real cipher)'];
      const randomBox = () => { const a = [...Array(16).keys()]; const r = rand(16); for (let i = 15; i > 0; i--) { const j = r[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const draw = () => {
        const T = Array.from({ length: 16 }, () => new Array(16).fill(0));
        for (let a = 0; a < 16; a++) for (let x = 0; x < 16; x++) T[a][S[x] ^ S[x ^ a]]++;
        let worst = 0; for (let a = 1; a < 16; a++) worst = Math.max(worst, ...T[a]);
        sboxOut.innerHTML = `S-box: ${S.map((v) => v.toString(16)).join(' ')}`;
        grid.innerHTML = '';
        grid.append(h('span'), ...[...Array(16).keys()].map((b) => h('span', { style: 'text-align:center;color:var(--ink-faint)' }, b.toString(16))));
        for (let a = 1; a < 16; a++) {
          grid.append(h('span', { style: 'color:var(--ink-faint)' }, `Δ${a.toString(16)}`));
          for (let bb = 0; bb < 16; bb++) {
            const v = T[a][bb];
            const bg = v === 0 ? 'var(--paper)' : v <= 2 ? 'var(--sun-soft)' : v <= 4 ? 'var(--orange)' : 'var(--coral)';
            grid.append(h('button', { type: 'button', title: `in Δ${a.toString(16)} → out Δ${bb.toString(16)}: ${v}/16`, style: `aspect-ratio:1;border:1px solid color-mix(in srgb,var(--ink) 25%,transparent);border-radius:3px;background:${bg};color:${v > 4 ? '#fff' : 'var(--ink)'};font:inherit;padding:0;cursor:pointer`, onclick: () => { info.innerHTML = `Input difference <b>${a.toString(16)}</b> becomes output difference <b>${bb.toString(16)}</b> in <b>${v} of 16</b> cases (${((v / 16) * 100).toFixed(0)}%). ${v >= 8 ? 'An attacker can follow this almost for free.' : v === 4 ? 'Four times chance: the best any 4-bit S-box can do.' : ''}`; api.done('Explored a difference table'); } }, v || ''));
          }
        }
        info.innerHTML = `Hottest cell: <b>${worst}/16</b>. ${worst >= 16 ? '💀 Every difference passes through with certainty: a linear box gives the attacker everything.' : worst <= 4 ? '✅ As flat as a 4-bit S-box can be.' : '⚠️ Worse than a carefully designed box.'} Tap a cell for details.`;
      };
      sel.addEventListener('change', () => { S = BOXES[sel.value] || randomBox(); draw(); });
      el.append(field('S-box', sel), sboxOut, h('div', { class: 'svg-wrap', style: 'margin-top:8px' }, grid), info); draw();
    },
  };

  // ------------------------------------------------------------------ 20.5 onion routing
  W.onion = {
    title: 'Peel the onion: a three-hop Tor circuit', chip: '🧅 Real layers', xp: 25, sub: 'Your client wraps the request in three layers of real AES-256-GCM, one per relay key. Step through the circuit and see what each relay learns.',
    async init(el, api) {
      const gen = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      const [kG, kM, kE] = await Promise.all([gen(), gen(), gen()]);
      const seal = async (k, obj) => { const iv = rand(12); return b64(iv) + '.' + b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc(JSON.stringify(obj))))); };
      const open = async (k, s) => { const [iv, ct] = s.split('.'); return JSON.parse(dec(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: CS.fromB64(iv) }, k, CS.fromB64(ct)))); };
      const https = h('input', { type: 'checkbox', checked: true });
      const nodes = ['🧑‍💻 You', '🛡️ Guard', '🔀 Middle', '🚪 Exit', '🌐 Website'];
      const row = h('div', { style: 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px;text-align:center' });
      const cards = nodes.map((n) => { const c = h('div', { class: 'w-box', style: 'padding:8px;font-size:.8rem' }, h('b', { style: 'display:block;font-size:.95rem' }, n), h('div', { class: 'know' }, '…')); row.append(c); return c; });
      const pkt = h('div', { class: 'w-out' });
      let step = 0, layers = null;
      const build = async () => {
        const data = https.checked ? '🔒 TLS-encrypted bytes (only the website can read them)' : 'GET http://example.com/secret-page  Cookie: session=abc123';
        const exitL = await seal(kE, { to: 'example.com:443', data });
        const midL = await seal(kM, { next: 'Exit relay 198.51.100.7', payload: exitL });
        const guardL = await seal(kG, { next: 'Middle relay 203.0.113.9', payload: midL });
        layers = { exitL, midL, guardL }; step = 0;
        cards.forEach((c) => { c.style.background = 'var(--paper)'; c.querySelector('.know').textContent = '…'; });
        cards[0].style.background = 'var(--sun-soft)';
        cards[0].querySelector('.know').innerHTML = 'Knows everything (it built the circuit)';
        pkt.innerHTML = `📦 Leaving you: <b>${layers.guardL.length} bytes</b> of ciphertext, 3 layers deep<br><small>${short(layers.guardL, 90)}</small>`;
      };
      const next = async () => {
        if (!layers) await build();
        step++;
        if (step === 1) { const o = await open(kG, layers.guardL); cards[1].style.background = 'var(--ocean-soft)'; cards[1].querySelector('.know').innerHTML = `From: <b>you (192.0.2.10)</b><br>Next: <b>${o.next}</b><br>Website: ❓`; pkt.innerHTML = `Guard peeled layer 1 → forwards <b>${o.payload.length} bytes</b> it can’t read`; }
        else if (step === 2) { const o = await open(kM, layers.midL); cards[2].style.background = 'var(--ocean-soft)'; cards[2].querySelector('.know').innerHTML = `From: <b>guard</b><br>Next: <b>${o.next}</b><br>You? ❓ Website? ❓`; pkt.innerHTML = `Middle peeled layer 2 → forwards <b>${o.payload.length} bytes</b>`; }
        else if (step === 3) { const o = await open(kE, layers.exitL); cards[3].style.background = https.checked ? 'var(--mint-soft)' : 'var(--coral-soft)'; cards[3].querySelector('.know').innerHTML = `From: <b>middle</b><br>To: <b>${o.to}</b><br>You? ❓`; pkt.innerHTML = `Exit peeled the last layer and sees: <b>${o.data.replace(/</g, '&lt;')}</b> ${https.checked ? '' : '<span class="w-bad">← readable! Use HTTPS inside Tor.</span>'}`; }
        else if (step === 4) { cards[4].style.background = 'var(--sun-soft)'; cards[4].querySelector('.know').innerHTML = 'Sees a visitor from <b>the exit relay</b>, not you'; pkt.innerHTML = '✅ No single relay knew both who you are and where you went.'; api.done('Routed through an onion circuit'); }
        else { await build(); }
      };
      https.addEventListener('change', build);
      el.append(h('div', { class: 'w-row' }, h('label', { style: 'display:flex;gap:6px;align-items:center' }, https, 'Website uses HTTPS'), h('button', { class: 'btn', type: 'button', onclick: next }, 'Next hop ▶'), h('button', { class: 'btn small ghost', type: 'button', onclick: build }, '↺ New circuit')), h('div', { class: 'svg-wrap' }, row), pkt);
      await build();
    },
  };

  // ------------------------------------------------------------------ 20.6 OpenID Connect with PKCE
  W.pkce = {
    title: '“Sign in with…” step by step (OpenID Connect + PKCE)', chip: '🔐 Real hashes & signatures', xp: 30, sub: 'Real PKCE values, and a real ES256-signed ID token from a pretend identity provider. Turn on the attacker to see a stolen code fail.',
    async init(el, api) {
      const attacker = h('input', { type: 'checkbox' });
      const list = h('ol', { class: 'step-list' }); const rfc = h('p', { class: 'w-note' });
      const challengeFor = async (v) => b64url(await sha('SHA-256', v));
      rfc.innerHTML = `RFC 7636 test: SHA-256(“dBjftJeZ…EjXk”) → <code>${await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')}</code> ✓`;
      const idp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
      let st = {}, i = 0, steps = [];
      const reset = async () => {
        const verifier = b64url(rand(32)), state = b64url(rand(12));
        st = { verifier, state, challenge: await challengeFor(verifier), code: b64url(rand(18)) };
        steps = [
          () => `📱 The app picks a secret <b>code_verifier</b> = <code>${st.verifier}</code><br>and computes <b>code_challenge</b> = SHA-256(verifier) = <code>${st.challenge}</code>`,
          () => `↪️ Browser goes to the identity provider:<br><code style="word-break:break-all">https://login.example.com/authorize?response_type=code&amp;client_id=photo-app&amp;redirect_uri=https://photo.example/cb&amp;scope=openid%20email&amp;state=${st.state}&amp;code_challenge=${st.challenge}&amp;code_challenge_method=S256</code>`,
          () => '🔑 You log in at the identity provider (with a passkey). The app never sees your credentials.',
          () => `↩️ Redirected back with a one-time code: <code>https://photo.example/cb?code=${st.code}&amp;state=${st.state}</code><br>The app checks <b>state</b> matches what it sent ✓ (stops login CSRF)`,
          ...(attacker.checked ? [async () => { const guess = b64url(rand(32)); const ok = (await challengeFor(guess)) === st.challenge; return `😈 A malicious app stole the code and tries to redeem it with its own guess of the verifier.<br>IdP computes SHA-256(guess) = <code>${short(await challengeFor(guess), 24)}</code> ≠ <code>${short(st.challenge, 24)}</code> → ${ok ? '??' : '<span class="w-bad">❌ invalid_grant</span>'}. Without the verifier, a stolen code is useless.`; }] : []),
          async () => {
            const ok = (await challengeFor(st.verifier)) === st.challenge;
            const header = { alg: 'ES256', typ: 'JWT', kid: 'idp-key-1' };
            const now = Math.floor(Date.now() / 1000);
            const payload = { iss: 'https://login.example.com', sub: 'alice-1234', aud: 'photo-app', email: 'alice@example.com', iat: now, exp: now + 3600 };
            const data = `${b64url(enc(JSON.stringify(header)))}.${b64url(enc(JSON.stringify(payload)))}`;
            const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, idp.privateKey, enc(data)));
            const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, idp.publicKey, sig, enc(data));
            return `📨 The app sends code + the original verifier. IdP checks SHA-256(verifier) = challenge ${ok ? '✓' : '✗'}<br>🎫 It returns an <b>ID token</b> (a signed JWT, Chapter 16):<br><code style="word-break:break-all;font-size:.72rem">${data}.${b64url(sig)}</code><br>payload: <code>${JSON.stringify(payload)}</code><br>✅ App verifies the ES256 signature with the IdP’s public key (${valid ? 'valid' : 'INVALID'}), plus iss, aud and exp. Alice is signed in.`;
          },
        ];
        i = 0; list.innerHTML = '';
      };
      const next = async () => {
        if (i >= steps.length) { await reset(); }
        const html = await steps[i](); i++;
        [...list.children].forEach((li) => li.classList.remove('now'));
        list.append(h('li', { class: 'on now pop', html }));
        if (i === steps.length) api.done('Walked through OpenID Connect with PKCE');
      };
      attacker.addEventListener('change', reset);
      el.append(h('div', { class: 'w-row' }, h('label', { style: 'display:flex;gap:6px;align-items:center' }, attacker, '😈 Add an attacker who steals the code'), h('button', { class: 'btn', type: 'button', onclick: next }, 'Next step ▶'), h('button', { class: 'btn small ghost', type: 'button', onclick: reset }, '↺ Restart')), list, rfc);
      await reset();
    },
  };

  // ------------------------------------------------------------------ 20.7 EMV cryptograms
  W.emv = {
    title: 'Why a skimmer can’t clone a chip card', chip: '💳 Pay & attack', xp: 25, sub: 'Simplified with HMAC-SHA256 (real cards use AES- or 3DES-based MACs), but the logic is the same: a fresh cryptogram for every payment, from a key that never leaves the chip.',
    async init(el, api) {
      const cardKey = rand(16); const PAN = '4111 1111 1111 1111';
      let atc = 0, issuerAtc = 0, skimmed = null, lastTx = null;
      const amount = h('input', { type: 'text', value: '12.50', style: 'max-width:110px' });
      const stripe = h('input', { type: 'checkbox' });
      const log = h('ol', { class: 'step-list' });
      const add = (html, good) => { log.prepend(h('li', { class: 'on pop', style: `background:${good === true ? 'var(--mint-soft)' : good === false ? 'var(--coral-soft)' : 'var(--paper)'}`, html })); };
      const today = new Date().toISOString().slice(0, 10);
      const arqcFor = async (key, tx) => hex(await hmac('SHA-256', key, `${tx.amount}|EUR|${today}|${tx.un}|${tx.atc}`)).slice(0, 16);
      const issuerCheck = async (tx, arqc) => {
        if (stripe.checked) return [true, 'magnetic-stripe data matches the account'];
        if (!arqc) return [false, 'no cryptogram'];
        const expected = await arqcFor(cardKey, tx);
        if (expected !== arqc) return [false, `cryptogram mismatch (expected ${expected})`];
        if (tx.atc <= issuerAtc) return [false, `counter ${tx.atc} already used (last seen ${issuerAtc}): replay`];
        issuerAtc = tx.atc; return [true, 'cryptogram valid, counter fresh'];
      };
      const pay = async () => {
        atc++; const tx = { amount: amount.value, un: hex(rand(4)), atc };
        const arqc = stripe.checked ? null : await arqcFor(cardKey, tx);
        lastTx = { tx, arqc };
        const [ok, why] = await issuerCheck(tx, arqc);
        add(`💳 Genuine card pays €${tx.amount} · terminal’s unpredictable number <code>${tx.un}</code> · counter ${tx.atc}${arqc ? ` · ARQC <code>${arqc}</code>` : ' · (stripe: static data only)'}<br>🏦 Bank: ${ok ? '✅ approved' : '❌ declined'}: ${why}`, ok);
      };
      const skim = () => { skimmed = { pan: PAN, expiry: '12/29', recorded: lastTx }; add(`😈 Skimmer copies the card number <code>${PAN}</code>, expiry and ${lastTx ? 'the last cryptogram' : 'whatever it can'}… but cannot read the chip’s secret key.`); };
      const clone = async () => {
        if (!skimmed) { add('Skim the card first.'); return; }
        const tx = { amount: '999.00', un: hex(rand(4)), atc: skimmed.recorded ? skimmed.recorded.tx.atc : 1 };
        const replay = skimmed.recorded && skimmed.recorded.arqc;
        const [ok, why] = await issuerCheck(tx, stripe.checked ? null : replay || null);
        add(`🃏 Cloned card tries €999.00 ${stripe.checked ? 'with the copied stripe data' : replay ? `replaying the recorded ARQC <code>${replay}</code> against a new unpredictable number <code>${tx.un}</code>` : 'with no cryptogram'}<br>🏦 Bank: ${ok ? '✅ approved <b>(the clone works!)</b>' : '❌ declined'}: ${why}`, !ok);
        api.done('Defeated a card clone');
      };
      el.append(h('div', { class: 'w-row' }, field('Amount (€)', amount), h('label', { style: 'display:flex;gap:6px;align-items:center' }, stripe, 'Old magnetic-stripe card (no chip)')),
        h('div', { class: 'chips', style: 'margin:10px 0' }, h('button', { class: 'btn small', type: 'button', onclick: pay }, '💳 Pay with the real card'), h('button', { class: 'btn small coral', type: 'button', onclick: skim }, '😈 Skim it'), h('button', { class: 'btn small coral', type: 'button', onclick: clone }, '🃏 Pay with the clone'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => { log.innerHTML = ''; skimmed = lastTx = null; } }, '↺')), log);
    },
  };

  // ------------------------------------------------------------------ 20.8 secure + measured boot
  W.measuredboot = {
    title: 'Boot a machine: secure boot + measured boot + attestation', chip: '🖥️ Real PCRs', xp: 25, sub: 'Each stage is hashed and “extended” into a PCR with real SHA-256. With Secure Boot on, a tampered stage is stopped. Either way, the final PCR tells a remote server whether the machine is trustworthy.',
    async init(el, api) {
      const CLEAN = ['firmware v1.2', 'bootloader v2.06', 'kernel 6.8', 'drivers v26.11'];
      const NAMES = ['UEFI firmware', 'Bootloader', 'OS kernel', 'Drivers'];
      const inputs = CLEAN.map((v) => h('input', { type: 'text', value: v, style: 'font-family:var(--mono)' }));
      const sb = h('input', { type: 'checkbox', checked: true });
      const out = h('div'), verdict = h('div', { class: 'w-out big' });
      const extend = async (pcr, text) => sha('SHA-256', cat(pcr, await sha('SHA-256', text)));
      let golden = new Uint8Array(32); for (const t of CLEAN) golden = await extend(golden, t);
      const boot = async () => {
        let pcr = new Uint8Array(32); const rows = []; let halted = -1;
        for (let i = 0; i < CLEAN.length; i++) {
          const v = inputs[i].value, signed = v === CLEAN[i];
          if (sb.checked && !signed) { halted = i; rows.push(`<tr><td>${NAMES[i]}</td><td>🛑 signature invalid</td><td>startup stopped</td></tr>`); break; }
          pcr = await extend(pcr, v);
          rows.push(`<tr><td>${NAMES[i]}</td><td>${signed ? '✅ signed' : '⚠️ unsigned'}</td><td style="font-family:var(--mono);font-size:.8rem">${hex(pcr).slice(0, 16)}…</td></tr>`);
        }
        out.innerHTML = `<div class="table-wrap"><table class="sk-table"><thead><tr><th>Stage</th><th>Secure Boot check</th><th>PCR after extend</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
        const good = halted < 0 && hex(pcr) === hex(golden);
        verdict.innerHTML = halted >= 0 ? `🛑 Secure Boot blocked the tampered ${NAMES[halted].toLowerCase()} before it could run.` : good ? `✅ Final PCR matches the known-good value <code>${hex(golden).slice(0, 16)}…</code><br>TPM releases the disk key; the company server accepts the attestation.` : `❌ Final PCR <code>${hex(pcr).slice(0, 16)}…</code> ≠ known-good <code>${hex(golden).slice(0, 16)}…</code><br>TPM keeps the disk key sealed; the server quarantines this machine.`;
        if (inputs.some((x, k) => x.value !== CLEAN[k])) api.done('Caught a tampered boot');
      };
      inputs.forEach((x) => x.addEventListener('input', boot)); sb.addEventListener('change', boot);
      el.append(h('div', { class: 'w-grid2' }, ...inputs.map((x, k) => field(NAMES[k], x))),
        h('div', { class: 'w-row' }, h('label', { style: 'display:flex;gap:6px;align-items:center' }, sb, 'Secure Boot on'), h('button', { class: 'btn small coral', type: 'button', onclick: () => { inputs[1].value = 'bootloader v2.06 + bootkit'; boot(); } }, '😈 Infect the bootloader'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => { inputs.forEach((x, k) => (x.value = CLEAN[k])); boot(); } }, '↺ Clean')), out, verdict);
      boot();
    },
  };

  // ------------------------------------------------------------------ 20.9 LSB steganography
  W.stego = {
    title: 'Hide a message inside a picture', chip: '🖼️ Real pixels', xp: 25, sub: 'Your message is written into the lowest bit of each colour value. The two pictures look identical; the “lowest-bit view” shows where the data went. Encrypt first and the hidden bits look like pure noise.',
    async init(el, api) {
      const Wd = 200, Ht = 120;
      const mk = () => h('canvas', { width: Wd, height: Ht, style: 'width:100%;max-width:240px;border:2px solid var(--ink);border-radius:8px;image-rendering:pixelated;display:block;margin:auto' });
      const cOrig = mk(), cStego = mk(), cLsb = mk();
      const ctx = cOrig.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, Ht); g.addColorStop(0, '#a2d2ff'); g.addColorStop(1, '#fdf8ee'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Ht);
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(160, 30, 18, 0, 7); ctx.fill();
      ctx.fillStyle = '#06d6a0'; ctx.beginPath(); ctx.moveTo(0, 120); ctx.quadraticCurveTo(60, 50, 120, 120); ctx.fill();
      ctx.fillStyle = '#118ab2'; ctx.beginPath(); ctx.moveTo(70, 120); ctx.quadraticCurveTo(150, 60, 200, 120); ctx.fill();
      ctx.fillStyle = '#ef476f'; ctx.fillRect(40, 84, 18, 14); ctx.fillStyle = '#2b2d42'; ctx.fillRect(46, 90, 5, 8);
      const base = ctx.getImageData(0, 0, Wd, Ht);
      const msg = h('input', { type: 'text', value: 'meet at 5' }); const encrypt = h('input', { type: 'checkbox' });
      const out = h('div', { class: 'w-out' });
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']);
      const slots = (data) => { const idx = []; for (let i = 0; i < data.length; i++) if (i % 4 !== 3) idx.push(i); return idx; };
      const run = async () => {
        let payload = enc(msg.value), iv = null;
        if (encrypt.checked) { iv = rand(12); payload = cat(iv, new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload))); }
        const framed = cat(new Uint8Array([payload.length >> 8, payload.length & 255]), payload);
        const img = new ImageData(new Uint8ClampedArray(base.data), Wd, Ht); const S = slots(img.data);
        let changed = 0;
        framed.forEach((byte, bi) => { for (let k = 0; k < 8; k++) { const bit = (byte >> (7 - k)) & 1; const p = S[bi * 8 + k]; const nv = (img.data[p] & 0xfe) | bit; if (nv !== img.data[p]) changed++; img.data[p] = nv; } });
        cStego.getContext('2d').putImageData(img, 0, 0);
        const lsb = new ImageData(Wd, Ht); for (let i = 0; i < img.data.length; i += 4) { for (let c = 0; c < 3; c++) lsb.data[i + c] = (img.data[i + c] & 1) * 255; lsb.data[i + 3] = 255; }
        cLsb.getContext('2d').putImageData(lsb, 0, 0);
        // read it back from the canvas pixels
        const back = cStego.getContext('2d').getImageData(0, 0, Wd, Ht).data; const S2 = slots(back);
        const readByte = (bi) => { let v = 0; for (let k = 0; k < 8; k++) v = (v << 1) | (back[S2[bi * 8 + k]] & 1); return v; };
        const len = (readByte(0) << 8) | readByte(1); const got = new Uint8Array(len); for (let i = 0; i < len; i++) got[i] = readByte(i + 2);
        let text;
        if (encrypt.checked) { const plain = dec(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: got.slice(0, 12) }, key, got.slice(12))); text = `hidden bytes look random: <code>${short(hex(got), 32)}</code> → decrypt with the key → “${plain.replace(/</g, '&lt;')}”`; }
        else text = `“${dec(got).replace(/</g, '&lt;')}”`;
        let maxDiff = 0; for (let i = 0; i < back.length; i++) maxDiff = Math.max(maxDiff, Math.abs(back[i] - base.data[i]));
        out.innerHTML = `${framed.length * 8} bits hidden in the first ${framed.length * 8} colour values · ${changed} values actually changed · biggest change to any pixel: <b>${maxDiff}</b> out of 255<br>🔍 Extracted from the picture: <b>${text}</b>`;
        api.done('Hid a message in a picture');
      };
      msg.addEventListener('input', run); encrypt.addEventListener('change', run);
      el.append(h('div', { class: 'w-row' }, field('Secret message', msg), h('label', { style: 'display:flex;gap:6px;align-items:center' }, encrypt, 'Encrypt first (AES-GCM)')),
        h('div', { class: 'w-grid3' }, h('div', { class: 'w-box', style: 'text-align:center' }, h('h5', {}, 'Original'), cOrig), h('div', { class: 'w-box', style: 'text-align:center' }, h('h5', {}, 'With hidden message'), cStego), h('div', { class: 'w-box', style: 'text-align:center' }, h('h5', {}, 'Lowest-bit view'), cLsb)), out);
      run();
    },
  };
})();
