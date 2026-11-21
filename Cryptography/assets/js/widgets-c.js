/* Widgets for Chapters 9–11 */
(() => {
  'use strict';
  const { h, enc, dec, hex, b64, rand, modpow, gcd, modinv, isPrime, fmt, debounce } = CS;
  const W = window.W;
  const field = (label, input) => h('label', { style: 'display:flex;flex-direction:column;gap:4px;flex:1 1 160px' }, label, input);
  const primes = (lo, hi) => { const o = []; for (let i = lo; i <= hi; i++) if (isPrime(i)) o.push(i); return o; };
  const pem = (der, label) => `-----BEGIN ${label}-----\n${b64(der).match(/.{1,64}/g).join('\n')}\n-----END ${label}-----`;

  // Ed25519 / X25519 support detection with P-256 fallbacks
  async function supports(alg, usages) { try { await crypto.subtle.generateKey(alg, false, usages); return true; } catch (e) { return false; } }

  // ------------------------------------------------------------------ 9.1 padlock story
  W.padlock = {
    title: 'The open-padlock trick', chip: '🔓 Story mode', xp: 10,
    init(el, api) {
      const steps = [
        ['bob', '🔓🔓🔓', 'Bob hands out OPEN padlocks to anyone who asks. That’s his public key.'],
        ['alice', '📦🔓', 'Alice puts her letter in a box and takes one of Bob’s padlocks.'],
        ['alice', '📦🔒', 'Snap! She locks it. Now even Alice can’t open it again.'],
        ['mallory', '📦🔒❓', 'Mallory grabs the box in transit. No key, no luck.'],
        ['bob', '🔑📦🔓', 'Only Bob, with his PRIVATE key, opens it. No secret was ever shared in advance.'],
      ];
      let i = 0;
      const svg = h('svg', { viewBox: '0 0 120 140', style: 'color:var(--ink);width:120px;height:130px' });
      const big = h('div', { style: 'font-size:3rem;min-width:150px;text-align:center' }), txt = h('p', { style: 'font-weight:700;font-size:1.05rem;margin:0' });
      const show = () => { svg.innerHTML = ''; Doodle.person(Doodle.pen(svg, i + 2), steps[i][0], 60, 48, .95); big.textContent = steps[i][1]; txt.textContent = `${i + 1}/5 · ${steps[i][2]}`; big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop'); };
      el.append(h('div', { class: 'w-row', style: 'align-items:center' }, svg, big, h('div', { style: 'flex:1 1 220px' }, txt)), h('div', { class: 'w-row' }, h('button', { class: 'btn small ghost', type: 'button', onclick: () => { i = Math.max(0, i - 1); show(); } }, '◀ Back'), h('button', { class: 'btn small', type: 'button', onclick: () => { i = Math.min(steps.length - 1, i + 1); show(); if (i === steps.length - 1) api.done('Understood public-key locks'); } }, 'Next ▶')));
      show();
    },
  };

  // ------------------------------------------------------------------ 9.3 toy RSA
  W.toyrsa = {
    title: 'Toy RSA calculator', chip: '🧮 Your own keys', xp: 30, sub: 'Pick two primes and build a real (tiny) RSA key pair. Defaults match the guide: p = 61, q = 53, e = 17.',
    init(el, api) {
      const P = primes(11, 251);
      const pS = h('select', {}, P.map((x) => h('option', { value: x }, x))), qS = h('select', {}, P.map((x) => h('option', { value: x }, x)));
      pS.value = 61; qS.value = 53;
      const eS = h('select'), mI = h('input', { type: 'text', value: 'A', maxlength: 1, style: 'max-width:80px;font-size:1.2rem;text-align:center' });
      const keys = h('div', { class: 'table-wrap' }), flow = h('div', { class: 'w-out big' }), atk = h('div', { class: 'w-out' });
      let st = {};
      const build = (keepE) => {
        const p = BigInt(pS.value), q = BigInt(qS.value);
        if (p === q) { keys.innerHTML = '<p class="w-bad" style="padding:10px">p and q must be different primes.</p>'; return; }
        const n = p * q, phi = (p - 1n) * (q - 1n);
        const es = [3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 65537n].filter((e) => e < phi && gcd(e, phi) === 1n);
        const prevE = eS.value;
        eS.innerHTML = ''; es.forEach((e) => eS.append(h('option', { value: String(e) }, String(e))));
        eS.value = keepE && es.map(String).includes(prevE) ? prevE : es.map(String).includes('17') ? '17' : String(es[0]);
        const e = BigInt(eS.value), d = modinv(e, phi);
        st = { p, q, n, phi, e, d };
        keys.innerHTML = `<table class="sk-table"><tbody>
<tr><td>1. Two secret primes</td><td>p = ${p}, q = ${q}</td><td class="st-bad">🔒 secret</td></tr>
<tr><td>2. n = p × q</td><td><b>n = ${n}</b></td><td class="st-ok">🌍 public</td></tr>
<tr><td>3. φ = (p−1)(q−1)</td><td>φ = ${p - 1n} × ${q - 1n} = ${phi}</td><td class="st-bad">🔒 secret</td></tr>
<tr><td>4. public exponent e</td><td><b>e = ${e}</b></td><td class="st-ok">🌍 public</td></tr>
<tr><td>5. d with e·d mod φ = 1</td><td><b>d = ${d}</b> (check: ${e}×${d} = ${e * d} = ${(e * d) / phi}×${phi} + 1 ✓)</td><td class="st-bad">🔒 secret</td></tr></tbody></table>`;
        run();
      };
      const run = () => {
        if (!st.n) return;
        const ch = mI.value || 'A'; let m = BigInt(ch.charCodeAt(0));
        if (m >= st.n) { flow.innerHTML = `<span class="w-bad">Message ${m} must be smaller than n = ${st.n}. Pick bigger primes.</span>`; return; }
        const c = modpow(m, st.e, st.n), back = modpow(c, st.d, st.n);
        flow.innerHTML = `Alice’s message “${ch}” = ${m}<br>🔐 c = m<sup>e</sup> mod n = ${m}<sup>${st.e}</sup> mod ${st.n} = <b style="color:var(--coral-ink)">${c}</b><br>🔓 m = c<sup>d</sup> mod n = ${c}<sup>${st.d}</sup> mod ${st.n} = <b style="color:var(--mint-ink)">${back}</b> = “${String.fromCharCode(Number(back))}” ✓`;
        api.done('Ran toy RSA end to end'); api.achieve('rsa');
      };
      pS.addEventListener('change', () => build(false)); qS.addEventListener('change', () => build(false)); eS.addEventListener('change', () => build(true)); mI.addEventListener('input', run);
      el.append(h('div', { class: 'w-row' }, field('Prime p', pS), field('Prime q', qS), field('Public e', eS), field('Message (a letter)', mI)), keys, flow,
        h('div', { class: 'w-row' }, h('button', { class: 'btn small coral', type: 'button', onclick: () => {
          const t0 = performance.now(); let f = 2n; while (st.n % f !== 0n) f++; const ms = performance.now() - t0;
          const d2 = modinv(st.e, (f - 1n) * (st.n / f - 1n));
          atk.innerHTML = `😈 Eve factors n = ${st.n} = <b>${f} × ${st.n / f}</b> in ${ms.toFixed(2)} ms, then computes d = <b>${d2}</b>. Game over for tiny keys. Real n has 617+ digits.`;
        } }, '😈 Eve: factor n')), atk);
      build(false);
    },
  };

  // ------------------------------------------------------------------ 9.5 RSA vs ECC, generated for real
  W.sizes = {
    title: 'Generate RSA and elliptic-curve keys, for real', chip: '⚡ Race', xp: 20, sub: 'Same ~128-bit security. Watch the time and the size.',
    init(el, api) {
      const out = h('div', { class: 'w-grid2' });
      const card = (name) => { const b = h('div', { class: 'w-box' }, h('h5', {}, name), h('div', { class: 'w-out' }, '…')); out.append(b); return b.lastChild; };
      const go = async () => {
        out.innerHTML = '';
        const r = card('RSA-3072'), e = card('ECDSA P-256');
        r.textContent = 'Searching for two 1536-bit primes…';
        let t0 = performance.now();
        const kp = await crypto.subtle.generateKey({ name: 'RSA-PSS', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
        const rt = performance.now() - t0; const rspki = new Uint8Array(await crypto.subtle.exportKey('spki', kp.publicKey));
        const rsig = new Uint8Array(await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, kp.privateKey, enc('hi')));
        r.innerHTML = `⏱️ keygen <b>${rt.toFixed(0)} ms</b><br>public key file: <b>${rspki.length} bytes</b><br>signature: <b>${rsig.length} bytes</b><br><small>${hex(rspki).slice(0, 80)}…</small>`;
        t0 = performance.now();
        const kp2 = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
        const et = performance.now() - t0; const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp2.publicKey));
        const esig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp2.privateKey, enc('hi')));
        e.innerHTML = `⏱️ keygen <b>${et.toFixed(1)} ms</b><br>public key: <b>${raw.length} bytes</b> (uncompressed point)<br>signature: <b>${esig.length} bytes</b><br><small>${hex(raw).slice(0, 80)}…</small>`;
        api.done('Generated RSA and ECC keys');
      };
      el.append(h('div', { class: 'w-row' }, h('button', { class: 'btn', type: 'button', onclick: go }, '🏁 Generate both')), out);
    },
  };

  // ------------------------------------------------------------------ 9.6 hybrid encryption
  W.hybrid = {
    title: 'Hybrid encryption, step by step (RSA-OAEP + AES-GCM)', chip: '📦 Real crypto', xp: 30,
    init(el, api) {
      const msg = h('textarea', { rows: 3 }, 'Top secret: the cake is in the fridge. 🎂 (Make this as long as you like: AES handles the bulk.)');
      const list = h('ol', { class: 'step-list' }); const pemOut = h('details', {}, h('summary', {}, 'Show Bob’s public key (PEM)'), h('pre', { class: 'w-out', style: 'white-space:pre-wrap;font-size:.72rem' }));
      const steps = ['Bob generates an RSA-2048 key pair and publishes the public key', 'Alice generates a random one-time AES-256 key 🔑', 'Alice encrypts the message with AES-256-GCM using 🔑', 'Alice wraps 🔑 with Bob’s PUBLIC key (RSA-OAEP)', 'Bob unwraps 🔑 with his PRIVATE key', 'Bob decrypts the message with 🔑'].map((t) => h('li', {}, h('b', {}, t), h('div', { class: 'w-out', style: 'margin-top:4px;font-size:.78rem' })));
      list.append(...steps);
      const set = (i, html) => { steps[i].classList.add('on', 'now'); steps.forEach((s, j) => j !== i && s.classList.remove('now')); steps[i].querySelector('.w-out').innerHTML = html; };
      const run = async () => {
        steps.forEach((s) => { s.classList.remove('on', 'now'); s.querySelector('.w-out').textContent = ''; });
        const bob = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['wrapKey', 'unwrapKey']);
        const spki = new Uint8Array(await crypto.subtle.exportKey('spki', bob.publicKey));
        pemOut.querySelector('pre').textContent = pem(spki, 'PUBLIC KEY');
        set(0, `public key: ${spki.length} bytes (DER) · ${hex(spki).slice(0, 48)}…`); await CS.sleep(450);
        const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const raw = new Uint8Array(await crypto.subtle.exportKey('raw', aes));
        set(1, `🔑 = ${hex(raw)}`); await CS.sleep(450);
        const iv = rand(12), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, enc(msg.value)));
        set(2, `${enc(msg.value).length}-byte message → ${ct.length} bytes (ciphertext + 16-byte tag): ${hex(ct).slice(0, 64)}…`); await CS.sleep(450);
        const wrapped = new Uint8Array(await crypto.subtle.wrapKey('raw', aes, bob.publicKey, { name: 'RSA-OAEP' }));
        set(3, `wrapped key: <b>${wrapped.length} bytes</b> (always the RSA key size, whatever the message length) · ${hex(wrapped).slice(0, 64)}…`); await CS.sleep(450);
        const k2 = await crypto.subtle.unwrapKey('raw', wrapped, bob.privateKey, { name: 'RSA-OAEP' }, { name: 'AES-GCM' }, true, ['decrypt']);
        set(4, `🔑 recovered = ${hex(await crypto.subtle.exportKey('raw', k2))} ✓`); await CS.sleep(450);
        const pt = dec(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k2, ct));
        set(5, `✅ “${pt.replace(/</g, '&lt;')}”`);
        api.done('Ran hybrid encryption');
      };
      el.append(field('Alice’s message (any length)', msg), h('div', { class: 'w-row' }, h('button', { class: 'btn', type: 'button', onclick: run }, '▶ Run all six steps')), list, pemOut);
    },
  };

  // ------------------------------------------------------------------ 10.2 paint mixing
  W.paint = {
    title: 'Mix a secret colour in public', chip: '🎨 Paint lab', xp: 30, sub: 'Mixing paint is easy; un-mixing is impossible. Pick secret colours for Alice and Bob, then exchange the mixtures in public.',
    init(el, api) {
      const SW = ['#ef476f', '#118ab2', '#06d6a0', '#8338ec', '#fb8500', '#2b2d42', '#ff8fab', '#7c4d2b'];
      const Y = [255, 209, 102];
      const toRgb = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16));
      const css = (c) => `rgb(${c.map((x) => Math.round(x)).join(',')})`;
      const mix = (...cs) => [0, 1, 2].map((i) => cs.reduce((a, c) => a + c[i], 0) / cs.length);
      let a = toRgb(SW[0]), b = toRgb(SW[1]);
      const pickers = (who, set) => h('div', { class: 'chips' }, SW.map((c) => h('button', { type: 'button', class: 'chip', 'aria-label': `${who} secret colour ${c}`, style: `background:${c};width:34px;height:34px;padding:0`, onclick: () => { set(toRgb(c)); draw(); } })));
      const blob = (c, label, sub) => h('div', { style: 'text-align:center' }, h('div', { style: `width:74px;height:56px;margin:auto;background:${css(c)};border:3px solid var(--ink);border-radius:50% 46% 52% 48% / 58% 52% 48% 42%;box-shadow:var(--shadow-sm)` }), h('b', { style: 'font-family:var(--marker);display:block;margin-top:6px' }, label), h('small', {}, sub || ''));
      const stage = h('div');
      const draw = () => {
        const A = mix(Y, a), B = mix(Y, b);
        const sA = mix(B, B, a), sB = mix(A, A, b);
        const eve = mix(A, B);
        const same = sA.every((v, i) => Math.abs(v - sB[i]) < 1);
        stage.innerHTML = '';
        stage.append(
          h('div', { class: 'w-grid3' }, h('div', { class: 'w-box' }, h('h5', {}, '👩 Alice'), blob(a, 'secret', 'never leaves home'), blob(A, 'yellow + secret', 'sent publicly')),
            h('div', { class: 'w-box', style: 'background:var(--sun-soft)' }, h('h5', {}, '🌍 Public (Eve sees)'), blob(Y, 'common yellow'), h('div', { style: 'display:flex;gap:8px;justify-content:center' }, blob(A, 'Alice’s mix'), blob(B, 'Bob’s mix'))),
            h('div', { class: 'w-box' }, h('h5', {}, '👨 Bob'), blob(b, 'secret', 'never leaves home'), blob(B, 'yellow + secret', 'sent publicly'))),
          h('div', { class: 'w-grid3', style: 'margin-top:12px' }, blob(sA, 'Alice: Bob’s mix + her secret'), h('div', { style: 'display:grid;place-items:center;font:700 1.6rem var(--hand)' }, same ? '🟰 same colour!' : '≠'), blob(sB, 'Bob: Alice’s mix + his secret')),
          h('div', { class: 'w-box', style: 'margin-top:12px;border-color:var(--grape)' }, h('div', { style: 'display:flex;gap:14px;align-items:center;flex-wrap:wrap' }, blob(eve, 'Eve mixes what she saw'), h('p', { style: 'margin:0;flex:1 1 200px' }, '😈 Eve’s colour has too much yellow and only half of each secret. She can’t “un-mix” orange to get Alice’s red. In real Diffie-Hellman, mixing = modular exponentiation.'))));
        if (same) { api.done('Agreed on a secret colour'); api.achieve('dh'); }
      };
      el.append(h('div', { class: 'w-grid2' }, h('div', {}, h('p', { class: 'w-note' }, 'Alice’s secret'), pickers('Alice', (c) => (a = c))), h('div', {}, h('p', { class: 'w-note' }, 'Bob’s secret'), pickers('Bob', (c) => (b = c)))), stage);
      draw();
    },
  };

  // ------------------------------------------------------------------ 10.3 toy Diffie-Hellman
  W.dhtoy = {
    title: 'Diffie-Hellman with real numbers', chip: '🔢 Calculator', xp: 25, sub: 'Defaults match the guide: p = 23, g = 5, a = 6, b = 15.',
    init(el, api) {
      const G = [['p = 23 (guide)', 23n, 5n], ['p = 1019', 1019n, 2n], ['p = 65537', 65537n, 3n], ['p = 2³¹ − 1', 2147483647n, 7n], ['p = 2⁶¹ − 1 (big!)', 2305843009213693951n, 37n]];
      const groups = Object.fromEntries(G.map(([k, p, g]) => [k, [p, g]]));
      const gS = h('select', {}, G.map(([k]) => h('option', { value: k }, k)));
      gS.value = G[0][0];
      const aI = h('input', { type: 'text', value: '6' }), bI = h('input', { type: 'text', value: '15' });
      const tbl = h('div', { class: 'table-wrap' }), eve = h('div', { class: 'w-out' });
      let cur = {};
      const run = () => {
        const [p, g] = groups[gS.value]; let a, b;
        try { a = BigInt(aI.value || 1); b = BigInt(bI.value || 1); } catch (e) { return; }
        const A = modpow(g, a, p), B = modpow(g, b, p), sA = modpow(B, a, p), sB = modpow(A, b, p);
        cur = { p, g, A };
        tbl.innerHTML = `<table class="sk-table"><thead><tr><th>Step</th><th>👩 Alice</th><th>🌍 Public (Eve sees)</th><th>👨 Bob</th></tr></thead><tbody>
<tr><td>1. Agree</td><td></td><td>p = ${p}, g = ${g}</td><td></td></tr>
<tr><td>2. Secret</td><td class="st-bad">a = ${a}</td><td></td><td class="st-bad">b = ${b}</td></tr>
<tr><td>3. Public value</td><td>A = ${g}<sup>${a}</sup> mod ${p} = <b>${A}</b></td><td>A = ${A}, B = ${B}</td><td>B = ${g}<sup>${b}</sup> mod ${p} = <b>${B}</b></td></tr>
<tr><td>4. Shared secret</td><td class="st-ok">B<sup>a</sup> mod p = <b>${sA}</b></td><td>❓</td><td class="st-ok">A<sup>b</sup> mod p = <b>${sB}</b></td></tr></tbody></table>`;
        api.done('Computed a Diffie-Hellman secret');
      };
      const brute = async () => {
        const { p, g, A } = cur; eve.textContent = 'Eve tries x = 1, 2, 3… until gˣ mod p = A';
        let x = 1n, v = g % p; const t0 = performance.now();
        while (v !== A) {
          v = (v * g) % p; x++;
          if (x % 200000n === 0n) { const s = (performance.now() - t0) / 1000; eve.textContent = `Trying… ${fmt(Number(x))} so far (${fmt(Math.round(Number(x) / s))}/s)`; await new Promise((r) => setTimeout(r, 0)); if (s > 6) { const est = Number(p) / (Number(x) / s) / 2; eve.innerHTML = `⏳ Gave up after 6 s and ${fmt(Number(x))} tries. Expected time for this p: ~<b>${fmt(Math.round(est / 86400 / 365))} years</b>. Real DH uses 2048-bit p (617 digits), or elliptic curves.`; return; } }
        }
        eve.innerHTML = `😈 Found a = <b>${x}</b> after ${fmt(Number(x))} tries (${(performance.now() - t0).toFixed(1)} ms). Small p is hopeless.`;
      };
      [gS, aI, bI].forEach((i) => i.addEventListener('input', run));
      el.append(h('div', { class: 'w-row' }, field('Prime p', gS), field('Alice’s secret a', aI), field('Bob’s secret b', bI)), tbl, h('div', { class: 'w-row' }, h('button', { class: 'btn small coral', type: 'button', onclick: brute }, '😈 Eve: brute-force a')), eve);
      run();
    },
  };

  // ------------------------------------------------------------------ 10.5 man in the middle
  W.mitm = {
    title: 'Mallory in the middle', chip: '🎭 Scenario', xp: 20, sub: 'Toggle authentication and replay the exchange.',
    init(el, api) {
      const auth = h('input', { type: 'checkbox' }); const out = h('ol', { class: 'step-list' });
      const p = 23n, g = 5n;
      const run = async () => {
        out.innerHTML = '';
        const a = 6n, b = 15n, m1 = 13n, m2 = 9n;
        const A = modpow(g, a, p), B = modpow(g, b, p), M1 = modpow(g, m1, p), M2 = modpow(g, m2, p);
        const lines = auth.checked ? [
          `👩 Alice sends A = ${A}, <b>signed with her private key</b>.`, `😈 Mallory swaps in her own value ${M1}… but can’t produce Alice’s signature.`, `👨 Bob verifies the signature with Alice’s public key (from her certificate): <span class="w-bad">❌ INVALID</span>. Connection aborted.`, `✅ Authentication (certificates + signatures) defeats the man in the middle. This is TLS’s CertificateVerify step.`,
        ] : [
          `👩 Alice sends A = ${A} → 😈 Mallory intercepts it and sends Bob her own M = ${M1}.`, `👨 Bob sends B = ${B} → 😈 Mallory intercepts it and sends Alice M' = ${M2}.`,
          `👩 Alice computes ${M2}<sup>${a}</sup> mod 23 = <b>${modpow(M2, a, p)}</b> (shared with Mallory, not Bob!)`, `👨 Bob computes ${M1}<sup>${b}</sup> mod 23 = <b>${modpow(M1, b, p)}</b> (also shared with Mallory)`,
          `😈 Mallory decrypts everything from Alice, reads it, re-encrypts it for Bob. Both see a “secure” connection. <span class="w-bad">Totally fooled.</span>`,
        ];
        for (const l of lines) { out.append(h('li', { class: 'on now', html: l })); await CS.sleep(500); out.lastChild.classList.remove('now'); }
        api.done('Saw a man-in-the-middle attack');
      };
      el.append(h('div', { class: 'w-row' }, h('label', { style: 'display:flex;gap:8px;align-items:center' }, auth, 'Authenticate the key exchange (signatures)'), h('button', { class: 'btn', type: 'button', onclick: run }, '▶ Play')), out);
    },
  };

  // ------------------------------------------------------------------ 10.9 real X25519
  W.ecdh = {
    title: 'A real X25519 key exchange in your browser', chip: '🤝 Real crypto', xp: 25,
    async init(el, api) {
      const x = await supports({ name: 'X25519' }, ['deriveBits']);
      const ALG = x ? { name: 'X25519' } : { name: 'ECDH', namedCurve: 'P-256' };
      const label = x ? 'X25519' : 'ECDH P-256 (your browser lacks X25519)';
      const out = h('div');
      const run = async () => {
        const [al, bo] = await Promise.all([crypto.subtle.generateKey(ALG, true, ['deriveBits']), crypto.subtle.generateKey(ALG, true, ['deriveBits'])]);
        const [ap, bp] = await Promise.all([crypto.subtle.exportKey('raw', al.publicKey), crypto.subtle.exportKey('raw', bo.publicKey)]);
        const bits = x ? 256 : 256;
        const sA = new Uint8Array(await crypto.subtle.deriveBits({ name: ALG.name, public: bo.publicKey }, al.privateKey, bits));
        const sB = new Uint8Array(await crypto.subtle.deriveBits({ name: ALG.name, public: al.publicKey }, bo.privateKey, bits));
        const base = await crypto.subtle.importKey('raw', sA, 'HKDF', false, ['deriveBits']);
        const k = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: enc('handshake data') }, base, 256);
        out.innerHTML = `<div class="w-grid2"><div class="w-box"><h5>👩 Alice’s public key (${new Uint8Array(ap).length} B)</h5><div class="w-out">${hex(ap)}</div></div><div class="w-box"><h5>👨 Bob’s public key (${new Uint8Array(bp).length} B)</h5><div class="w-out">${hex(bp)}</div></div></div>
<p class="w-note">Alice computes (her private × Bob’s public), Bob computes (his private × Alice’s public):</p><div class="w-out big">Alice: <b>${hex(sA)}</b><br>Bob:&nbsp;&nbsp; <b>${hex(sB)}</b> ${hex(sA) === hex(sB) ? '<span class="w-good">✅ identical</span>' : ''}</div>
<p class="w-note">Never use the raw secret directly: HKDF(“handshake data”) → <code>${hex(k)}</code></p>`;
        api.done('Did a real ' + label + ' exchange');
      };
      el.append(h('p', { class: 'w-sub' }, `Algorithm: ${label}. Press again for fresh ephemeral keys (that’s forward secrecy).`), h('div', { class: 'w-row' }, h('button', { class: 'btn', type: 'button', onclick: run }, '🔁 New ephemeral keys')), out);
      run();
    },
  };

  // ------------------------------------------------------------------ 11.2 real signatures
  W.sign = {
    title: 'Sign a contract (real Ed25519)', chip: '✍️ Sign & tamper', xp: 30,
    async init(el, api) {
      const ed = await supports({ name: 'Ed25519' }, ['sign', 'verify']);
      const ALG = ed ? { name: 'Ed25519' } : { name: 'ECDSA', namedCurve: 'P-256' };
      const SIG = ed ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' };
      const bob = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
      const mallory = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
      const pub = new Uint8Array(await crypto.subtle.exportKey(ed ? 'raw' : 'raw', bob.publicKey));
      const doc = h('textarea', { rows: 2 }, 'I, Bob, agree to pay Alice $100 on 1 March.');
      const sigOut = h('div', { class: 'w-out' }), ver = h('div', { class: 'w-out big' });
      let sig = null, signer = 'Bob';
      const signWith = async (k, who) => { sig = new Uint8Array(await crypto.subtle.sign(SIG, k, enc(doc.value))); signer = who; sigOut.innerHTML = `${who}’s signature (${sig.length} bytes): <b>${hex(sig)}</b>`; ver.textContent = 'Signed. Now anyone can verify with Bob’s public key.'; };
      const verify = async () => {
        if (!sig) return;
        const ok = await crypto.subtle.verify(SIG, bob.publicKey, sig, enc(doc.value));
        ver.innerHTML = ok ? '✅ <span class="w-good">Signature valid</span>: Bob signed exactly this text.' : `❌ <span class="w-bad">Verification FAILED</span>: ${signer === 'Bob' ? 'the document was changed after signing.' : 'this was not signed with Bob’s private key.'}`;
        if (!ok) api.done('Caught a forged or altered document');
      };
      el.append(h('p', { class: 'w-sub' }, `${ed ? 'Ed25519' : 'ECDSA P-256 (your browser lacks Ed25519)'} · Bob’s public key (${pub.length} B): ${hex(pub)}`), field('The contract', doc),
        h('div', { class: 'chips', style: 'margin:10px 0' }, h('button', { class: 'btn small', type: 'button', onclick: () => signWith(bob.privateKey, 'Bob') }, '✍️ Bob signs'), h('button', { class: 'btn small mint', type: 'button', onclick: verify }, '🔍 Anyone verifies'),
          h('button', { class: 'btn small coral', type: 'button', onclick: () => { doc.value = doc.value.replace('$100', '$10,000'); ver.textContent = 'Mallory edited the amount… verify again!'; } }, '😈 Change $100 → $10,000'),
          h('button', { class: 'btn small coral', type: 'button', onclick: () => signWith(mallory.privateKey, 'Mallory') }, '😈 Mallory signs as “Bob”')), sigOut, ver);
      await signWith(bob.privateKey, 'Bob');
    },
  };

  // ------------------------------------------------------------------ 11.3 toy RSA signature
  W.toysig = {
    title: 'Toy RSA signature (n = 3233, e = 17, d = 2753)', chip: '🧮 Numbers', xp: 15,
    init(el, api) {
      const n = 3233n, e = 17n, d = 2753n;
      const hI = h('input', { type: 'number', value: 65, min: 0, max: 3232 }), sI = h('input', { type: 'number', value: 588 });
      const o1 = h('div', { class: 'w-out big' }), o2 = h('div', { class: 'w-out big' });
      const sign = () => { const hv = BigInt(Math.max(0, Math.min(3232, +hI.value || 0))); const s = modpow(hv, d, n); sI.value = String(s); o1.innerHTML = `Bob signs with private d: s = ${hv}<sup>2753</sup> mod 3233 = <b>${s}</b>`; check(); };
      const check = () => { const s = BigInt(+sI.value || 0), back = modpow(s, e, n), hv = BigInt(+hI.value || 0); o2.innerHTML = `Anyone verifies with public e: ${s}<sup>17</sup> mod 3233 = <b>${back}</b> ${back === hv ? '<span class="w-good">✅ matches the hash</span>' : '<span class="w-bad">❌ doesn’t match: forgery!</span>'}`; api.done('Verified a toy signature'); };
      hI.addEventListener('input', sign); sI.addEventListener('input', check);
      el.append(h('div', { class: 'w-row' }, field('Hash of the message', hI), field('Signature (try forging one)', sI)), o1, o2); sign();
    },
  };
})();
