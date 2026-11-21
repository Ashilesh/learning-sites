/* Widgets for Chapters 12–19, 21–22 */
(() => {
  'use strict';
  const { h, $, $$, enc, dec, hex, b64, rand, sha, hmac, modpow, fmt, debounce } = CS;
  const W = window.W;
  const field = (label, input) => h('label', { style: 'display:flex;flex-direction:column;gap:4px;flex:1 1 180px' }, label, input);
  const b64url = (bytes) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64url = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return CS.fromB64(s); };

  // ------------------------------------------------------------------ 12.1 packets
  W.packets = {
    title: 'Send a message as packets', chip: '📮 Animate', xp: 15, sub: 'Your message is chopped into postcards. They take different routes and arrive out of order. Turn on HTTPS to see what every hop can read.',
    init(el, api) {
      const msg = h('input', { type: 'text', value: 'card=4111 1111 1111 1111' }); const tls = h('input', { type: 'checkbox' });
      const svg = h('svg', { viewBox: '0 0 560 200', style: 'width:100%;max-width:640px' }); const out = h('div', { class: 'w-out' });
      const routers = [[150, 50], [150, 150], [290, 30], [290, 100], [290, 170], [420, 70], [420, 140]];
      const base = () => { svg.innerHTML = ''; const L = (a, b) => svg.append(h('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'var(--ink-faint)', 'stroke-width': 2, 'stroke-dasharray': '5 5' })); const S = [30, 100], D = [530, 100];
        [[S, routers[0]], [S, routers[1]], [routers[0], routers[2]], [routers[0], routers[3]], [routers[1], routers[3]], [routers[1], routers[4]], [routers[2], routers[5]], [routers[3], routers[5]], [routers[3], routers[6]], [routers[4], routers[6]], [routers[5], D], [routers[6], D]].forEach(([a, b]) => L(a, b));
        routers.forEach(([x, y], i) => svg.append(h('circle', { cx: x, cy: y, r: 12, fill: 'var(--paper-2)', stroke: 'var(--ink)', 'stroke-width': 2 }), h('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11 }, '👀')));
        svg.append(h('text', { x: 30, y: 104, 'text-anchor': 'middle', 'font-size': 26 }, '💻'), h('text', { x: 530, y: 108, 'text-anchor': 'middle', 'font-size': 26 }, '🏬')); };
      const paths = [[0, 2, 5], [1, 4, 6], [0, 3, 6], [1, 3, 5]];
      const send = async () => {
        base(); out.innerHTML = '';
        const text = msg.value; const chunks = text.match(/.{1,7}/g) || [''];
        const ctText = tls.checked ? hex(rand(Math.max(4, text.length))) : null;
        const arrived = [];
        await Promise.all(chunks.map(async (c, i) => {
          const g = h('g'); svg.append(g);
          const label = tls.checked ? ctText.slice(i * 6, i * 6 + 6) : c;
          g.append(h('rect', { x: -26, y: -11, width: 52, height: 22, rx: 4, fill: tls.checked ? 'var(--mint)' : 'var(--sun)', stroke: 'var(--ink)', 'stroke-width': 1.5 }), h('text', { x: 0, y: 4, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 9 }, `#${i + 1} ${label.slice(0, 6)}`));
          const pts = [[30, 100], ...paths[i % 4].map((r) => routers[r]), [530, 100]];
          await CS.sleep(i * 180 + Math.random() * 300);
          for (let k = 0; k < pts.length - 1; k++) {
            const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
            for (let t = 0; t <= 1; t += .08 + Math.random() * .04) { g.setAttribute('transform', `translate(${x1 + (x2 - x1) * t},${y1 + (y2 - y1) * t})`); await CS.sleep(16); }
          }
          g.remove(); arrived.push([i, c, label]);
          out.innerHTML = `Arrival order: ${arrived.map((a) => '#' + (a[0] + 1)).join(', ')}<br>Each router saw: ${arrived.map((a) => `<code>${a[2].replace(/</g, '&lt;')}</code>`).join(' ')}`;
        }));
        out.innerHTML += `<br>✅ Reassembled by sequence number: <b>${arrived.sort((a, b) => a[0] - b[0]).map((a) => a[1]).join('')}</b> ${tls.checked ? '(only the shop can decrypt it)' : '<span class="w-bad">(every hop could read your card number!)</span>'}`;
        api.done('Sent a message as packets');
      };
      base();
      el.append(h('div', { class: 'w-row' }, field('Message', msg), h('label', { style: 'display:flex;gap:6px;align-items:center' }, tls, '🔒 HTTPS (TLS)'), h('button', { class: 'btn', type: 'button', onclick: send }, '📤 Send')), h('div', { class: 'svg-wrap' }, svg), out);
    },
  };

  // ------------------------------------------------------------------ 12.3 encapsulation
  W.encap = {
    title: 'Envelopes inside envelopes', chip: '✉️ Wrap it', xp: 15, sub: 'Each layer adds its own header. TLS seals the HTTP request so the outer layers can only see addresses.',
    init(el, api) {
      const layers = [
        ['HTTP request', 'GET /account HTTP/1.1 · Host: bank.example · Cookie: session=…', 'var(--sun-soft)'],
        ['TLS record', 'type 23 · length 412 · 🔒 encrypted + authenticated (AES-GCM)', 'var(--mint-soft)'],
        ['TCP segment', 'src port 51514 → dst port 443 · seq 1001', 'var(--ocean-soft)'],
        ['IP packet', '192.168.1.20 → 203.0.113.10 · TTL 64', 'var(--grape-soft)'],
        ['Wi-Fi frame', 'your MAC → router MAC · (WPA2/WPA3 encrypted over the air)', 'var(--coral-soft)'],
      ];
      let n = 1; const box = h('div');
      const draw = () => {
        let inner = null;
        for (let i = 0; i < n; i++) {
          const [t, d, c] = layers[i];
          const sealed = n > 1 && i === 0;
          const div = h('div', { class: i === n - 1 ? 'pop' : '', style: `border:2.5px ${i === 1 ? 'solid' : 'dashed'} var(--ink);border-radius:12px;padding:10px;margin:6px 0 0;background:${c}` }, h('b', { style: 'font-family:var(--marker)' }, `${t} header: `), h('small', {}, sealed ? '🔒🔒🔒 (sealed inside TLS: hidden from the network)' : d));
          if (inner) div.append(inner); inner = div;
        }
        box.innerHTML = ''; box.append(inner);
        if (n === layers.length) api.done('Wrapped all the layers');
      };
      el.append(h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { n = Math.min(layers.length, n + 1); draw(); } }, '➕ Wrap in next layer'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => { n = Math.max(1, n - 1); draw(); } }, '➖ Peel a layer')), box);
      draw();
    },
  };

  // ------------------------------------------------------------------ 12.8 what others see
  W.seeview = {
    title: 'What the café Wi-Fi can see', chip: '👀 Spy view', xp: 10,
    init(el, api) {
      const rows = [['Your IP & the server’s IP', 'v', 'v', 'v'], ['Domain name (bank.example)', 'v', 'v', 'h'], ['Page path (/account/statements?id=77)', 'v', 'h', 'h'], ['Page content, forms, passwords', 'v', 'h', 'h'], ['Cookies and headers', 'v', 'h', 'h'], ['Amount of data and timing', 'v', 'v', 'v'], ['Can modify the page in transit?', 'm', 'n', 'n']];
      const modes = ['Plain HTTP', 'HTTPS', 'HTTPS + encrypted DNS + ECH'];
      let m = 0; const list = h('div'); const chips = h('div', { class: 'chips' });
      const draw = () => {
        chips.innerHTML = ''; modes.forEach((t, i) => chips.append(h('button', { class: 'chip' + (i === m ? ' on' : ''), type: 'button', onclick: () => { m = i; draw(); api.done('Compared HTTP and HTTPS'); } }, t)));
        list.innerHTML = ''; rows.forEach((r) => { const v = r[m + 1]; list.append(h('div', { class: 'w-row', style: 'margin:4px 0;padding:6px 10px;border:2px solid var(--ink);border-radius:10px;background:' + (v === 'v' || v === 'm' ? 'var(--coral-soft)' : 'var(--mint-soft)') }, h('span', { style: 'font-size:1.3rem' }, { v: '👀', h: '🔒', m: '⚠️', n: '🛡️' }[v]), h('span', { style: 'flex:1' }, r[0]), h('b', {}, { v: 'visible', h: 'hidden', m: 'YES', n: 'no (detected)' }[v]))); });
      };
      el.append(chips, list, h('p', { class: 'w-note' }, 'To hide IP addresses too, you need a VPN (which moves trust to the VPN provider) or Tor.')); draw();
    },
  };

  // ------------------------------------------------------------------ 13.3 certificate fields
  W.certfields = {
    title: 'Inspect a certificate', chip: '🪪 Tap the fields', xp: 15,
    init(el, api) {
      const F = [
        ['Version', '3', 'X.509 version 3, the version that supports extensions.'], ['Serial Number', '4a:ac:bc:0b:c2:99:58:f1…', 'Unique per CA. Used to revoke this exact certificate.'],
        ['Signature Algorithm', 'ecdsa-with-SHA256', 'How the CA signed it: hash with SHA-256, sign with ECDSA.'], ['Issuer', 'CN=My Learning Intermediate CA', 'Who vouches for this certificate (the CA).'],
        ['Validity', 'Nov 21 2026 → Feb 19 2027', 'Not Before / Not After. This one lasts 90 days.'], ['Subject', 'CN=myapp.local', 'Who the certificate identifies. Browsers actually check the SAN, not CN.'],
        ['Public Key', 'EC P-256 · 04:05:67:14:83…', 'The key being vouched for. The whole point of the certificate.'], ['Basic Constraints', 'CA:FALSE', 'An end certificate. It may NOT sign other certificates.'],
        ['Key Usage / EKU', 'Digital Signature · TLS Web Server', 'What the key may be used for.'], ['Subject Alt Name', 'DNS:myapp.local, DNS:localhost, IP:127.0.0.1', 'The names (and IPs) this certificate is valid for.'],
        ['SCTs', '2 log timestamps', 'Proof it was published in Certificate Transparency logs.'], ['Signature', '30:44:02:20:7e:11:4f:b4…', 'The CA’s signature over everything above. Change one byte and it breaks.'],
      ];
      const info = h('div', { class: 'w-out big' }, 'Tap any line of the certificate.'); const seen = new Set();
      const card = h('div', { style: 'border:3px solid var(--ink);border-radius:16px;background:linear-gradient(135deg,var(--paper-2),var(--ocean-soft));padding:12px;box-shadow:var(--shadow-sm)' }, h('p', { style: 'margin:0 0 6px;font:700 1.5rem var(--hand)' }, '📜 X.509 certificate · myapp.local'));
      F.forEach(([k, v, d], i) => card.append(h('button', { type: 'button', style: 'display:flex;gap:10px;width:100%;text-align:left;font:inherit;font-size:.9rem;padding:5px 8px;margin:2px 0;border:1.5px dashed transparent;border-radius:8px;background:transparent;color:var(--ink);cursor:pointer', onmouseenter: (e) => (e.currentTarget.style.borderColor = 'var(--ink)'), onmouseleave: (e) => (e.currentTarget.style.borderColor = 'transparent'), onclick: () => { info.innerHTML = `<b>${k}</b>: ${d}`; seen.add(i); if (seen.size >= 4) api.done('Inspected a certificate'); } }, h('b', { style: 'min-width:140px' }, k), h('code', {}, v))));
      el.append(h('div', { class: 'w-grid2' }, card, info));
    },
  };

  // ------------------------------------------------------------------ 13.4 chain of trust
  W.chain = {
    title: 'Verify a chain of trust (and break it)', chip: '⛓️ Break things', xp: 25, sub: 'Your browser walks from the website’s certificate up to a root it already trusts. Toggle a problem and see what fails.',
    init(el, api) {
      const probs = { missing: 'Server forgot to send the intermediate', expired: 'Leaf certificate expired', name: 'Visiting evil.example with example.com’s cert', root: 'Chain ends at an unknown, self-made root', tamper: 'Leaf certificate bytes were altered' };
      const on = {}; const tried = new Set();
      const chips = h('div', { class: 'chips' }); const view = h('div'); const res = h('div', { class: 'w-out big' });
      const draw = () => {
        chips.innerHTML = ''; Object.entries(probs).forEach(([k, t]) => chips.append(h('button', { type: 'button', class: 'chip' + (on[k] ? ' on' : ''), onclick: () => { on[k] = !on[k]; tried.add(k); draw(); if (tried.size >= 3) api.done('Broke a chain of trust'); } }, (on[k] ? '💥 ' : '') + t)));
        const card = (title, sub, color, bad) => h('div', { class: 'w-box', style: `text-align:center;border-color:${bad ? 'var(--coral)' : 'var(--ink)'};background:${color}` }, h('h5', {}, title), h('small', {}, sub));
        const arrow = (bad, txt) => h('div', { style: `text-align:center;font:700 1.1rem var(--hand);color:${bad ? 'var(--coral-ink)' : 'var(--mint-ink)'}` }, `${bad ? '✗' : '↑ ✓'} ${txt}`);
        view.innerHTML = '';
        view.append(
          card(on.root ? '🏴‍☠️ “Totally Real Root CA”' : '🏛️ Root CA', on.root ? 'not in your trust store' : 'pre-installed in your OS/browser (self-signed)', 'var(--grape-soft)', on.root),
          arrow(on.root, 'root’s key verifies the intermediate’s signature'),
          on.missing ? card('❓ Intermediate CA', 'missing from what the server sent', 'var(--paper)', true) : card('🏢 Intermediate CA', 'signed by the root · CA:TRUE, pathlen:0', 'var(--ocean-soft)', false),
          arrow(on.missing || on.tamper, 'intermediate’s key verifies the leaf’s signature'),
          card('🌐 example.com', `${on.expired ? 'Not After: last month 💀' : 'valid for 90 days'} · SAN: example.com`, 'var(--sun-soft)', on.expired || on.name || on.tamper));
        const errs = [];
        if (on.missing) errs.push('unable to get local issuer certificate (error 20)');
        if (on.root) errs.push('self-signed certificate in certificate chain / unknown issuer');
        if (on.tamper) errs.push('certificate signature failure');
        if (on.expired) errs.push('certificate has expired (NET::ERR_CERT_DATE_INVALID)');
        if (on.name) errs.push('name mismatch: you asked for evil.example (NET::ERR_CERT_COMMON_NAME_INVALID)');
        res.innerHTML = errs.length ? '🚫 <span class="w-bad">Browser warning!</span><br>' + errs.map((e) => '• ' + e).join('<br>') : '🔒 <span class="w-good">All checks pass</span>: signatures valid up to a trusted root, dates OK, name matches. Padlock shown.';
      };
      el.append(chips, h('div', { style: 'max-width:420px;margin:12px auto;display:grid;gap:4px' }, view), res); draw();
    },
  };

  // ------------------------------------------------------------------ 13.9 certificate lifetimes
  W.lifetimes = {
    title: 'Certificate lifetimes keep shrinking', chip: '📉 Chart', xp: 5,
    init(el, api) {
      const d = [['Early 2010s', 1825], ['2015', 1186], ['2018', 825], ['Sep 2020', 398], ['Mar 2026', 200], ['Mar 2027*', 100], ['Mar 2029*', 47]];
      el.append(h('div', { style: 'display:grid;gap:6px' }, d.map(([y, v], i) => h('div', { style: 'display:flex;align-items:center;gap:8px;font-size:.9rem' }, h('span', { style: 'width:96px;font-family:var(--marker)' }, y), h('span', { style: `height:20px;width:${(v / 1825) * 100}%;min-width:6px;background:${['var(--grape)', 'var(--ocean)', 'var(--ocean)', 'var(--mint)', 'var(--sun)', 'var(--orange)', 'var(--coral)'][i]};border:2px solid var(--ink);border-radius:5px` }), h('b', {}, `${fmt(v)} days`)))), h('p', { class: 'w-note' }, '* planned. Let’s Encrypt already issues 90-day certificates and has begun offering ~6-day ones.'));
      api.done('Saw certificate lifetimes shrink');
    },
  };

  // ------------------------------------------------------------------ 14.4 TLS 1.3 handshake
  W.handshake = {
    title: 'The TLS 1.3 handshake in slow motion', chip: '🎬 Step through', xp: 30,
    init(el, api) {
      const S = [
        ['→', 'ClientHello', '“I speak TLS 1.3” · random · cipher suites · key_share (X25519MLKEM768) · SNI example.com · ALPN h2', 'The browser guesses the key-exchange method and sends its half right away.', 4, false],
        ['←', 'ServerHello', 'TLS_AES_256_GCM_SHA384 · random · key_share', 'The server picks options and sends its half of the key exchange.', 10, false],
        ['⚡', 'Both compute the shared secret', 'HKDF → handshake keys', 'Like Alice and Bob in Chapter 10. Eve saw both public halves but can’t compute it.', 8, false],
        ['←', 'EncryptedExtensions', '“Let’s use HTTP/2”', 'Everything from here on is encrypted.', 5, true],
        ['←', 'Certificate', 'leaf + intermediate certificates', 'The server’s ID card.', 13, true],
        ['←', 'CertificateVerify', 'signature over the whole handshake', 'The anti-Mallory step: proves the server holds the certificate’s private key, and covers the key-exchange values.', 11, true],
        ['←', 'Finished', 'HMAC over the transcript', 'If anyone altered anything (like removing strong cipher suites), the MACs won’t match.', 7, true],
        ['🔍', 'Browser checks', 'chain → trusted root? name? dates? signature? Finished MAC?', 'Everything from section 13.5.', 13, true],
        ['→', 'Finished', 'client confirms', 'The browser’s side of the transcript MAC.', 7, true],
        ['⇄', 'Application data', 'GET / … 200 OK (AES-256-GCM)', 'Derive traffic keys and go. All of this took ONE round trip.', 5, true],
      ];
      let i = -1, timer = null;
      const stage = h('div', { style: 'position:relative;display:grid;grid-template-columns:90px 1fr 90px;gap:8px;align-items:start' });
      const lane = h('div', { style: 'display:flex;flex-direction:column;gap:6px;min-height:60px' });
      stage.append(h('div', { style: 'text-align:center;font-size:2.4rem' }, '🧑‍💻', h('div', { style: 'font:700 1.1rem var(--hand)' }, 'Browser')), lane, h('div', { style: 'text-align:center;font-size:2.4rem' }, '🖥️', h('div', { style: 'font:700 1.1rem var(--hand)' }, 'Server')));
      const expl = h('div', { class: 'w-out big' }, 'Press ▶ to start.');
      const render = () => {
        lane.innerHTML = '';
        S.slice(0, i + 1).forEach(([dir, name, det, , , encd], k) => lane.append(h('div', { class: k === i ? 'pop' : '', style: `display:flex;align-items:center;gap:6px;justify-content:${dir === '←' ? 'flex-end' : dir === '→' ? 'flex-start' : 'center'};padding:6px 10px;border:2px solid var(--ink);border-radius:10px;background:${encd ? 'var(--mint-soft)' : 'var(--sun-soft)'};font-size:.85rem` }, h('b', {}, `${dir === '←' ? '◀ ' : ''}${encd ? '🔒 ' : ''}${name}${dir === '→' ? ' ▶' : ''}`), h('small', { style: 'color:var(--ink-soft)' }, det))));
        if (i >= 0) { const s = S[i]; expl.innerHTML = `<b>${i + 1}. ${s[1]}</b>: ${s[3]} <a class="xref" href="chapter-${String(s[4]).padStart(2, '0')}.html">Chapter ${s[4]} →</a>`; }
        if (i === S.length - 1) api.done('Watched a full TLS 1.3 handshake');
      };
      const next = () => { if (i < S.length - 1) { i++; render(); } else stop(); };
      const stop = () => { clearInterval(timer); timer = null; };
      el.append(h('div', { class: 'w-row' }, h('button', { class: 'btn small ghost', type: 'button', onclick: () => { stop(); i = Math.max(-1, i - 1); render(); } }, '◀'), h('button', { class: 'btn small', type: 'button', onclick: () => { stop(); next(); } }, 'Next ▶'), h('button', { class: 'btn small grape', type: 'button', onclick: () => { stop(); i = -1; render(); timer = setInterval(next, 1600); } }, '▶ Autoplay')), stage, expl);
    },
  };

  // ------------------------------------------------------------------ 14.6 cipher suite decoder
  W.suite = {
    title: 'Cipher-suite decoder', chip: '🔤 Decode', xp: 20, sub: 'Paste any TLS cipher suite or group name.',
    init(el, api) {
      const T = {
        TLS: ['protocol', 'Transport Layer Security', 0], ECDHE: ['key exchange', 'Ephemeral elliptic-curve Diffie-Hellman: forward secrecy ✅', 0], DHE: ['key exchange', 'Ephemeral finite-field DH: forward secrecy, but slow', 1],
        RSA: ['auth / key exchange', 'RSA certificate. Right after TLS_ (no ECDHE) it means static RSA key transport: NO forward secrecy', 1], ECDSA: ['authentication', 'ECDSA certificate signature', 0],
        AES_128_GCM: ['bulk cipher', 'AES-128 in GCM mode (AEAD) ✅', 0], AES_256_GCM: ['bulk cipher', 'AES-256 in GCM mode (AEAD) ✅', 0], CHACHA20_POLY1305: ['bulk cipher', 'ChaCha20-Poly1305 AEAD ✅ (great on phones)', 0],
        AES_128_CCM: ['bulk cipher', 'AES-CCM AEAD (IoT)', 0], AES_128_CCM_8: ['bulk cipher', 'AES-CCM with a short 8-byte tag (not for general use)', 1], AES_128_CBC: ['bulk cipher', 'AES-CBC: legacy, padding-oracle prone', 1], AES_256_CBC: ['bulk cipher', 'AES-CBC: legacy, padding-oracle prone', 1],
        '3DES_EDE_CBC': ['bulk cipher', 'Triple DES: retired (Sweet32) ❌', 2], RC4_128: ['bulk cipher', 'RC4: broken ❌', 2], RC4_40: ['bulk cipher', '40-bit RC4: broken and export-grade ❌', 2], DES_CBC: ['bulk cipher', 'DES: brute-forced in 1998 ❌', 2],
        SHA256: ['hash', 'SHA-256 for key derivation / MAC', 0], SHA384: ['hash', 'SHA-384 for key derivation', 0], SHA: ['hash', 'SHA-1 (legacy HMAC use)', 1], MD5: ['hash', 'MD5 ❌', 2],
        NULL: ['bulk cipher', 'NO encryption at all ❌', 2], anon: ['authentication', 'NO authentication: anyone can be in the middle ❌', 2], EXPORT: ['grade', 'Deliberately weakened 1990s export crypto ❌ (FREAK/Logjam)', 2], WITH: ['separator', '“…using…”', 0],
        X25519MLKEM768: ['key-exchange group', 'Hybrid: X25519 + post-quantum ML-KEM-768 ✅', 0], X25519: ['key-exchange group', 'Curve25519 Diffie-Hellman ✅', 0], SECP256R1: ['key-exchange group', 'NIST P-256 ECDH ✅', 0],
      };
      const inp = h('input', { type: 'text', value: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256', style: 'font-family:var(--mono)' }); const out = h('div');
      const run = () => {
        const s = inp.value.trim().replace(/^TLS_/, 'TLS_').toUpperCase().replace('ANON', 'anon');
        const toks = []; let rest = s.replace(/-/g, '_');
        const keys = Object.keys(T).sort((a, b) => b.length - a.length);
        while (rest.length) { rest = rest.replace(/^_+/, ''); if (!rest) break; const k = keys.find((k) => rest.toUpperCase().startsWith(k.toUpperCase())); if (k) { toks.push(k); rest = rest.slice(k.length); } else { const m = rest.match(/^[^_]+/); toks.push(m[0]); rest = rest.slice(m[0].length); } }
        const isStatic = toks[0] === 'TLS' && toks[1] === 'RSA';
        let worst = 0;
        out.innerHTML = '';
        out.append(h('div', { class: 'chips', style: 'margin:10px 0' }, toks.map((t) => { const info = T[t]; let lvl = info ? info[2] : 1; if (t === 'RSA' && !isStatic) lvl = 0; worst = Math.max(worst, lvl); return h('span', { class: 'chip', style: `background:${['var(--mint-soft)', 'var(--sun-soft)', 'var(--coral-soft)'][lvl]}`, title: info ? info[1] : 'unknown' }, t); })),
          h('ul', { style: 'margin:0;padding-left:1.2em' }, toks.filter((t) => t !== 'WITH').map((t) => { const info = T[t]; return h('li', { html: `<b>${t}</b>: ${info ? `<i>${info[0]}</i>. ${t === 'RSA' && !isStatic ? 'RSA certificate (authentication) ✅' : info[1]}` : 'unknown component' }` }); })),
          h('p', { class: 'w-note', html: worst === 2 ? '❌ <b>Avoid.</b> Contains a red-flag component.' : worst === 1 ? '⚠️ <b>Legacy.</b> Works, but prefer TLS 1.3 suites.' : '✅ <b>Modern and safe.</b>' + (toks.length <= 4 && toks[0] === 'TLS' ? ' (A TLS 1.3 suite names only the AEAD and the hash; key exchange is negotiated separately.)' : '') }));
        api.done('Decoded a cipher suite');
      };
      inp.addEventListener('input', debounce(run, 150));
      el.append(field('Cipher suite', inp), h('div', { class: 'chips' }, ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256', 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384', 'TLS_RSA_WITH_AES_128_CBC_SHA', 'TLS_RSA_EXPORT_WITH_RC4_40_MD5', 'TLS_DH_anon_WITH_3DES_EDE_CBC_SHA', 'X25519MLKEM768'].map((v) => h('button', { class: 'chip', type: 'button', onclick: () => { inp.value = v; run(); } }, v))), out);
      T.DH = ['key exchange', 'Static finite-field DH: no forward secrecy', 1];
      run();
    },
  };

  // ------------------------------------------------------------------ 16.2 symmetric ratchet
  W.ratchet = {
    title: 'The Signal ratchet: a new key for every message', chip: '⚙️ Turn the crank', xp: 20, sub: 'Each message key is derived from a chain key with HMAC, then the chain key moves forward and the old one is deleted. Real HMAC-SHA256.',
    init(el, api) {
      let ck = rand(32), n = 0; const list = h('ol', { class: 'step-list' }); const note = h('div', { class: 'w-out' });
      const send = async () => {
        const mk = await hmac('SHA-256', ck, new Uint8Array([1])); const next = await hmac('SHA-256', ck, new Uint8Array([2]));
        n++; list.append(h('li', { class: 'on pop' }, h('b', {}, `Message ${n}`), h('div', { style: 'font-family:var(--mono);font-size:.78rem' }, `message key = ${hex(mk).slice(0, 32)}…`), h('div', { style: 'font-family:var(--mono);font-size:.72rem;color:var(--ink-faint)' }, `chain key ${hex(ck).slice(0, 16)}… → 🗑️ deleted`)));
        ck = next; note.innerHTML = `current chain key: <b>${hex(ck).slice(0, 32)}…</b>`; if (n >= 3) api.done('Turned the ratchet');
      };
      const steal = () => { note.innerHTML = `😈 Mallory steals the current chain key <b>${hex(ck).slice(0, 16)}…</b><br>➡️ She can derive FUTURE message keys… but HMAC is one-way, so all ${n} past keys stay safe (forward secrecy).<br>🩹 The next Diffie-Hellman ratchet step mixes in fresh randomness and locks her out again (post-compromise security).`; };
      const heal = () => { ck = rand(32); list.append(h('li', { class: 'on pop', style: 'background:var(--mint-soft)' }, h('b', {}, '🔄 DH ratchet: fresh shared secret mixed in'), h('div', { style: 'font-size:.8rem' }, 'New chain begins. Mallory’s stolen key is now useless.'))); note.textContent = 'Healed.'; };
      el.append(h('div', { class: 'chips' }, h('button', { class: 'btn small', type: 'button', onclick: send }, '📨 Send a message'), h('button', { class: 'btn small coral', type: 'button', onclick: steal }, '😈 Steal the chain key'), h('button', { class: 'btn small mint', type: 'button', onclick: heal }, '🔄 DH ratchet step')), note, list);
    },
  };

  // ------------------------------------------------------------------ 16.4 TOTP
  W.totp = {
    title: 'A live authenticator app (TOTP)', chip: '⏱️ Live', xp: 25, sub: 'The same secret as the guide’s QR-code example. Add <code>JBSWY3DPEHPK3PXP</code> to your own authenticator app and compare: the codes match.',
    async init(el, api) {
      const sec = h('input', { type: 'text', value: 'JBSWY3DPEHPK3PXP', style: 'font-family:var(--mono)' });
      const b32 = (s) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '', out = []; for (const c of s.toUpperCase().replace(/[^A-Z2-7]/g, '')) bits += A.indexOf(c).toString(2).padStart(5, '0'); for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return new Uint8Array(out); };
      const totp = async (key, t, digits = 6) => {
        const ctr = new Uint8Array(8); let c = Math.floor(t / 30); for (let i = 7; i >= 0; i--) { ctr[i] = c & 0xff; c = Math.floor(c / 256); }
        const mac = await hmac('SHA-1', key, ctr); const off = mac[19] & 0xf;
        const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
        return { code: String(bin % 10 ** digits).padStart(digits, '0'), mac, off, ctr: Math.floor(t / 30) };
      };
      const code = h('div', { style: 'font:700 3rem var(--mono);letter-spacing:6px;text-align:center' }), ring = h('div', { class: 'meter' }, h('i')), det = h('div', { class: 'w-out' }), rfc = h('p', { class: 'w-note' });
      let shown = false;
      const tick = async () => {
        if (!el.isConnected) return clearInterval(iv);
        const now = Date.now() / 1000; const key = b32(sec.value); if (!key.length) return;
        const r = await totp(key, now);
        code.textContent = r.code.slice(0, 3) + ' ' + r.code.slice(3);
        const left = 30 - (now % 30); ring.firstChild.style.width = (left / 30) * 100 + '%'; ring.firstChild.style.background = left < 6 ? 'var(--coral)' : 'var(--mint)';
        det.innerHTML = `time step T = floor(${Math.floor(now)} / 30) = <b>${r.ctr}</b> · ${left.toFixed(0)} s left<br>HMAC-SHA1(secret, T) = ${[...r.mac].map((b, i) => `<span class="hexb" style="${i >= r.off && i < r.off + 4 ? 'background:var(--sun);color:#2b2d42' : i === 19 ? 'background:var(--grape);color:#fff' : ''}">${b.toString(16).padStart(2, '0')}</span>`).join('')}<br>last nibble = ${r.off} → take 4 bytes at offset ${r.off} → mod 10⁶ → <b>${r.code}</b>`;
        if (!shown) { shown = true; api.done('Generated a TOTP code'); api.achieve('totp'); }
      };
      const iv = setInterval(tick, 1000);
      sec.addEventListener('input', tick);
      const t = await totp(enc('12345678901234567890'), 59, 8);
      rfc.innerHTML = `RFC 6238 test vector (secret “12345678901234567890”, time 59, 8 digits): <b>${t.code}</b> ${t.code === '94287082' ? '✅ matches 94287082' : ''}`;
      el.append(field('Shared secret (Base32, from the QR code)', sec), code, ring, det, rfc); tick();
    },
  };

  // ------------------------------------------------------------------ 16.5 JWT
  W.jwt = {
    title: 'Forge-proof (but readable!) JWTs', chip: '🎫 Build & tamper', xp: 25, sub: 'Real HS256 (HMAC-SHA256) in your browser. Note how anyone can read the payload.',
    init(el, api) {
      const payload = h('textarea', { rows: 2 }, '{"sub":"alice","admin":false,"exp":1798761600}');
      const secret = h('input', { type: 'text', value: 'a-long-random-server-secret-at-least-32-bytes!' });
      const tok = h('div', { class: 'w-out', style: 'font-size:.85rem' }), ver = h('div', { class: 'w-out big' }), decd = h('div', { class: 'w-out' });
      let token = '';
      const header = '{"alg":"HS256","typ":"JWT"}';
      const sign = async (h1, p1) => { const data = `${b64url(enc(h1))}.${b64url(enc(p1))}`; return `${data}.${b64url(await hmac('SHA-256', secret.value, data))}`; };
      const show = () => { const [a, b, c] = token.split('.'); tok.innerHTML = `<span style="color:var(--coral-ink)">${a}</span>.<span style="color:var(--grape-ink)">${b}</span>.<span style="color:var(--ocean-ink)">${c}</span>`; try { decd.innerHTML = `👀 Anyone can decode:<br>header = <b>${dec(fromB64url(a))}</b><br>payload = <b>${dec(fromB64url(b)).replace(/</g, '&lt;')}</b>`; } catch (e) { decd.textContent = 'decode error'; } };
      const build = async () => { token = await sign(header, payload.value); show(); ver.textContent = 'Signed by the server. Now try to tamper with it.'; };
      const verify = async () => {
        const [a, b, c] = token.split('.'); let alg = '';
        try { alg = JSON.parse(dec(fromB64url(a))).alg; } catch (e) { /* ignore */ }
        if (alg !== 'HS256') { ver.innerHTML = `🛡️ <span class="w-good">Rejected</span>: header says alg “${alg}”, but the server enforces HS256. (Libraries that trusted “none” were famously forgeable.)`; api.done('Blocked a forged JWT'); return; }
        const good = b64url(await hmac('SHA-256', secret.value, `${a}.${b}`)) === c;
        ver.innerHTML = good ? '✅ <span class="w-good">Valid signature</span>: the server trusts this payload.' : '🚫 <span class="w-bad">Invalid signature</span>: the payload was changed. Rejected!';
        if (!good) api.done('Caught a tampered JWT');
      };
      el.append(h('div', { class: 'w-grid2' }, field('Payload (JSON)', payload), field('Server secret', secret)), h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: build }, '🖊️ Sign token')), tok, decd,
        h('div', { class: 'chips', style: 'margin:10px 0' },
          h('button', { class: 'btn small coral', type: 'button', onclick: () => { const [a, b, c] = token.split('.'); const p = dec(fromB64url(b)).replace('"admin":false', '"admin":true'); token = `${a}.${b64url(enc(p))}.${c}`; show(); ver.textContent = 'Alice edited her payload to admin:true…'; } }, '😈 Make me admin'),
          h('button', { class: 'btn small coral', type: 'button', onclick: () => { const [, b] = token.split('.'); token = `${b64url(enc('{"alg":"none","typ":"JWT"}'))}.${b}.`; show(); ver.textContent = 'Attacker switched to alg:none and dropped the signature…'; } }, '😈 alg: none attack'),
          h('button', { class: 'btn small mint', type: 'button', onclick: verify }, '🔍 Server verifies')), ver);
      build();
    },
  };

  // ------------------------------------------------------------------ 16.6 blockchain
  W.blockchain = {
    title: 'Mine a tiny blockchain (real SHA-256)', chip: '⛏️ Mine', xp: 30, sub: 'A block is valid when its hash starts with “000”. Edit any block: it and everything after it break, because each block holds the previous hash.',
    init(el, api) {
      const D = 3, Z = '0'.repeat(D);
      const blocks = [{ data: 'Alice pays Bob 5', nonce: 0 }, { data: 'Bob pays Carol 2', nonce: 0 }, { data: 'Carol pays Dave 1', nonce: 0 }];
      const wrap = h('div', { class: 'w-grid3' });
      const hashOf = async (i, prev) => hex(await sha('SHA-256', `${i}|${prev}|${blocks[i].data}|${blocks[i].nonce}`));
      const render = async () => {
        let prev = '0'.repeat(64); wrap.innerHTML = ''; let chainOk = true;
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i]; const hh = await hashOf(i, prev); const ok = chainOk && hh.startsWith(Z); if (!ok) chainOk = false;
          const data = h('input', { type: 'text', value: b.data, style: 'width:100%' });
          data.addEventListener('input', debounce(() => { b.data = data.value; render(); }, 250));
          wrap.append(h('div', { class: 'w-box', style: `border-color:${ok ? 'var(--mint)' : 'var(--coral)'};background:${ok ? 'var(--mint-soft)' : 'var(--coral-soft)'}` }, h('h5', {}, `Block #${i + 1} ${ok ? '✅' : '❌'}`),
            h('small', { style: 'font-family:var(--mono);word-break:break-all' }, `prev: ${prev.slice(0, 16)}…`), data, h('small', { style: 'display:block;font-family:var(--mono)' }, `nonce: ${fmt(b.nonce)}`), h('small', { style: 'display:block;font-family:var(--mono);word-break:break-all' }, `hash: ${hh.slice(0, 22)}…`),
            h('button', { class: 'btn small', type: 'button', onclick: async (e) => { e.target.textContent = '⛏️ mining…'; const t0 = performance.now(); let p = i === 0 ? '0'.repeat(64) : await (async () => { let pr = '0'.repeat(64); for (let k = 0; k < i; k++) pr = await hashOf(k, pr); return pr; })(); b.nonce = 0; while (!(await hashOf(i, p)).startsWith(Z)) b.nonce++; CS.toast(`⛏️ Block #${i + 1} mined: ${fmt(b.nonce)} tries in ${(performance.now() - t0).toFixed(0)} ms`); await render(); api.done('Mined a block'); api.achieve('miner'); } }, '⛏️ Mine')));
          prev = hh;
        }
      };
      el.append(wrap, h('p', { class: 'w-note' }, 'Bitcoin’s difficulty needs about 20 leading hex zeros… which takes the whole network ~10 minutes per block.'));
      render();
    },
  };

  // ------------------------------------------------------------------ 17.1 PQ sizes
  W.pqsizes = {
    title: 'The price of quantum safety: bigger keys', chip: '📏 Sizes in bytes', xp: 10,
    init(el, api) {
      const D = [['X25519 (classical)', 32, 32, 'key share'], ['ML-KEM-768', 1184, 1088, 'ciphertext'], ['Ed25519 (classical)', 32, 64, 'signature'], ['ECDSA P-256', 64, 72, 'signature'], ['RSA-3072', 384, 384, 'signature'], ['FN-DSA-512 (Falcon)', 897, 666, 'signature'], ['ML-DSA-65', 1952, 3309, 'signature'], ['SLH-DSA-128s', 32, 7856, 'signature']];
      const log = h('input', { type: 'checkbox', checked: true }); const box = h('div');
      const draw = () => { const sc = (v) => (log.checked ? (Math.log10(v) / Math.log10(8000)) * 100 : (v / 7856) * 100); box.innerHTML = ''; D.forEach(([n, pk, out, kind]) => box.append(h('div', { style: 'margin:8px 0' }, h('b', { style: 'font-size:.9rem' }, n), h('div', { style: 'display:flex;align-items:center;gap:6px;font-size:.8rem' }, h('span', { style: 'width:72px' }, 'public key'), h('span', { style: `height:12px;width:${sc(pk)}%;background:var(--ocean);border:1.5px solid var(--ink);border-radius:3px` }), fmt(pk)), h('div', { style: 'display:flex;align-items:center;gap:6px;font-size:.8rem' }, h('span', { style: 'width:72px' }, kind), h('span', { style: `height:12px;width:${sc(out)}%;background:var(--coral);border:1.5px solid var(--ink);border-radius:3px` }), fmt(out))))); };
      log.addEventListener('change', draw);
      el.append(h('label', { style: 'display:flex;gap:6px;align-items:center' }, log, 'Logarithmic scale'), box); draw();
      api.done('Compared post-quantum sizes');
    },
  };

  // ------------------------------------------------------------------ 17.2 ZK cave
  W.zkcave = {
    title: 'The magic cave: a zero-knowledge proof', chip: '🕳️ Play Victor', xp: 25, sub: 'Peggy claims she knows the magic word that opens the door inside a ring-shaped cave. She walks in via path A or B (you can’t see which). You shout which side she must come out of.',
    init(el, api) {
      const knows = h('input', { type: 'checkbox', checked: true }); let rounds = 0, passed = 0; const log = h('div', { class: 'w-out' }), stat = h('div', { class: 'w-out big' });
      const svg = h('svg', { viewBox: '0 0 220 170', style: 'width:220px;color:var(--ink)' });
      svg.append(h('path', { d: 'M110 160 L110 120 M110 120 C 30 120, 30 20, 110 20 C 190 20, 190 120, 110 120', fill: 'none', stroke: 'currentColor', 'stroke-width': 22, 'stroke-linecap': 'round', opacity: .18 }), h('rect', { x: 102, y: 10, width: 16, height: 22, fill: 'var(--coral)', stroke: 'currentColor', 'stroke-width': 2 }), h('text', { x: 40, y: 76, 'font-family': 'Caveat', 'font-size': 22 }, 'A'), h('text', { x: 172, y: 76, 'font-family': 'Caveat', 'font-size': 22 }, 'B'), h('text', { x: 110, y: 6, 'text-anchor': 'middle', 'font-size': 10 }, '🚪 magic door'));
      const peg = h('text', { x: 110, y: 158, 'text-anchor': 'middle', 'font-size': 20 }, '🧑'); svg.append(peg);
      const shout = async (side) => {
        const went = Math.random() < .5 ? 'A' : 'B';
        const ok = knows.checked || went === side;
        peg.setAttribute('x', went === 'A' ? 50 : 170); peg.setAttribute('y', 100); await CS.sleep(350);
        peg.setAttribute('x', side === 'A' ? 70 : 150); peg.setAttribute('y', ok ? 140 : 40); await CS.sleep(350);
        rounds++; if (ok) passed++;
        log.innerHTML = `Round ${rounds}: she went ${went}, you asked ${side} → ${ok ? (went === side ? 'walked straight back ✅' : 'opened the door with the word ✅') : '❌ stuck behind the door: caught bluffing!'}<br>` + log.innerHTML;
        const p = 0.5 ** passed;
        stat.innerHTML = ok && passed === rounds ? `${passed} rounds passed. Chance a bluffer gets this lucky: <b>${p < 1e-4 ? p.toExponential(1) : (p * 100).toFixed(2) + '%'}</b>. And you never learned the word.` : `🚨 Bluff exposed in round ${rounds}.`;
        if (passed >= 10 && passed === rounds) api.done('Verified a zero-knowledge proof');
        peg.setAttribute('x', 110); peg.setAttribute('y', 158);
      };
      el.append(h('div', { class: 'w-row', style: 'align-items:center' }, svg, h('div', { style: 'flex:1 1 220px' }, h('label', { style: 'display:flex;gap:6px;align-items:center' }, knows, 'Peggy really knows the word'), h('div', { class: 'chips', style: 'margin:10px 0' }, h('button', { class: 'btn', type: 'button', onclick: () => shout('A') }, '📣 Come out of A'), h('button', { class: 'btn ocean', type: 'button', onclick: () => shout('B') }, '📣 Come out of B'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => { rounds = passed = 0; log.innerHTML = ''; stat.textContent = ''; } }, '↺')), stat)), log);
    },
  };

  // ------------------------------------------------------------------ 17.3 homomorphic
  W.homo = {
    title: 'Compute on locked data (toy RSA is multiplicatively homomorphic)', chip: '☁️ Cloud math', xp: 20, sub: 'Using the guide’s toy key n = 3233, e = 17, d = 2753. The “cloud” multiplies two ciphertexts without ever decrypting.',
    init(el, api) {
      const n = 3233n, e = 17n, d = 2753n; const a = h('input', { type: 'number', value: 7 }), b = h('input', { type: 'number', value: 9 }); const out = h('div', { class: 'w-out big' });
      const run = () => {
        const x = BigInt(+a.value || 0), y = BigInt(+b.value || 0);
        if (x * y >= n) { out.innerHTML = '<span class="w-bad">Keep a × b below 3233 for this toy key.</span>'; return; }
        const ca = modpow(x, e, n), cb = modpow(y, e, n), prod = (ca * cb) % n, back = modpow(prod, d, n);
        out.innerHTML = `👩 encrypts: E(${x}) = <b>${ca}</b>, E(${y}) = <b>${cb}</b><br>☁️ cloud computes ${ca} × ${cb} mod 3233 = <b>${prod}</b> (sees only gibberish)<br>👩 decrypts: ${prod}<sup>2753</sup> mod 3233 = <b style="color:var(--mint-ink)">${back}</b> = ${x} × ${y} ✓`;
        api.done('Computed on encrypted data');
      };
      [a, b].forEach((i) => i.addEventListener('input', run));
      el.append(h('div', { class: 'w-row' }, field('a', a), field('b', b)), out, h('p', { class: 'w-note' }, 'Fully homomorphic encryption (FHE) allows ANY computation this way, at a huge speed cost.')); run();
    },
  };

  // ------------------------------------------------------------------ 17.4 Shamir
  W.shamir = {
    title: 'Split a secret: any k of n shares', chip: '🧩 Share & recover', xp: 30, sub: 'The secret hides where the curve crosses the y-axis. Select shares to rebuild it. Drawn over ordinary numbers for intuition; real systems use clock math mod a big prime (like the guide’s Python), where fewer than k shares reveal nothing.',
    init(el, api) {
      const secI = h('input', { type: 'number', value: 42 }), kS = h('select', {}, [2, 3, 4].map((x) => h('option', { value: x }, `k = ${x}`))), nS = h('select', {}, [3, 4, 5, 6].map((x) => h('option', { value: x }, `n = ${x}`)));
      kS.value = 3; nS.value = 5;
      const svg = h('svg', { viewBox: '0 0 420 260', style: 'width:100%;max-width:520px;background:var(--paper);border:2px solid var(--ink);border-radius:12px' });
      const chips = h('div', { class: 'chips' }), out = h('div', { class: 'w-out big' });
      let coef = [], shares = [], pick = new Set();
      const f = (c, x) => c.reduce((s, v, i) => s + v * x ** i, 0);
      const lagr0 = (pts) => { // exact rational Lagrange at x=0 using BigInt fractions
        let num = 0n, den = 1n;
        for (let i = 0; i < pts.length; i++) { let pn = BigInt(pts[i][1]), pd = 1n; for (let j = 0; j < pts.length; j++) if (i !== j) { pn *= BigInt(-pts[j][0]); pd *= BigInt(pts[i][0] - pts[j][0]); } num = num * pd + pn * den; den *= pd; }
        return Number(num) / Number(den);
      };
      const make = () => { const k = +kS.value, n = Math.max(+nS.value, k); nS.value = n; const r = rand(4); coef = [+secI.value || 0, ...Array.from({ length: k - 1 }, (_, i) => (r[i] % 9) - 4 || 2)]; shares = Array.from({ length: n }, (_, i) => [i + 1, f(coef, i + 1)]); pick = new Set(); draw(); };
      const X = (x) => 30 + x * 60, maxY = () => Math.max(60, ...shares.map((s) => Math.abs(s[1])), Math.abs(coef[0])) * 1.15, Y = (y) => 130 - (y / maxY()) * 120;
      const draw = () => {
        svg.innerHTML = '';
        svg.append(h('line', { x1: 0, y1: Y(0), x2: 420, y2: Y(0), stroke: 'var(--ink-faint)' }), h('line', { x1: X(0), y1: 0, x2: X(0), y2: 260, stroke: 'var(--ink-faint)' }));
        const sel = shares.filter((s) => pick.has(s[0])); const k = +kS.value;
        const curve = (c, col, dash) => { let d = ''; for (let x = -0.4; x <= 6.4; x += 0.05) d += `${d ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(f(c, x)).toFixed(1)} `; svg.append(h('path', { d, fill: 'none', stroke: col, 'stroke-width': 2.5, 'stroke-dasharray': dash || '' })); };
        if (sel.length >= k) curve(coef, 'var(--mint)');
        else if (sel.length) {
          for (const fake of [-40, 15, 70]) { // other curves through the selected points with a different intercept
            const pts = [[0, fake], ...sel]; const c = [];
            const deg = k - 1; for (let x = -0.4; x <= 6.4; x += 0.05) { }
            const lag = (x) => pts.reduce((s, [xi, yi], i) => s + yi * pts.reduce((p, [xj], j) => (i === j ? p : (p * (x - xj)) / (xi - xj)), 1), 0);
            let d = ''; for (let x = -0.4; x <= 6.4; x += 0.05) d += `${d ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(lag(x)).toFixed(1)} `; svg.append(h('path', { d, fill: 'none', stroke: 'var(--coral)', 'stroke-width': 1.6, 'stroke-dasharray': '5 5', opacity: .8 })); c; deg;
          }
        }
        shares.forEach(([x, y]) => svg.append(h('circle', { cx: X(x), cy: Y(y), r: pick.has(x) ? 9 : 6, fill: pick.has(x) ? 'var(--sun)' : 'var(--ocean)', stroke: 'var(--ink)', 'stroke-width': 2 }), h('text', { x: X(x) + 8, y: Y(y) - 10, 'font-family': 'Caveat', 'font-size': 18, fill: 'var(--ink)' }, `#${x}`)));
        if (sel.length >= k) svg.append(h('circle', { cx: X(0), cy: Y(coef[0]), r: 10, fill: 'var(--coral)', stroke: 'var(--ink)', 'stroke-width': 2 }));
        chips.innerHTML = ''; shares.forEach(([x, y]) => chips.append(h('button', { type: 'button', class: 'chip' + (pick.has(x) ? ' on' : ''), onclick: () => { pick.has(x) ? pick.delete(x) : pick.add(x); draw(); } }, `share #${x}: (${x}, ${y})`)));
        if (sel.length >= k) { const rec = lagr0(sel.slice(0, k)); out.innerHTML = `✅ ${sel.length} shares ≥ k = ${k} → the curve is fixed → secret = <b style="color:var(--coral-ink)">${Math.round(rec)}</b>`; api.done('Recovered a Shamir secret'); }
        else out.innerHTML = sel.length ? `🔒 Only ${sel.length} share(s), need ${k}. Infinitely many curves pass through them (dashed): each crosses the y-axis somewhere different.` : 'Tap shares to combine them.';
      };
      [secI, kS, nS].forEach((i) => i.addEventListener('input', make));
      el.append(h('div', { class: 'w-row' }, field('Secret', secI), field('Threshold', kS), field('Shares', nS)), h('div', { class: 'svg-wrap' }, svg), chips, out); make();
    },
  };

  // ------------------------------------------------------------------ 17.5 MPC average salary
  W.mpc = {
    title: 'Average salary without revealing anyone’s salary', chip: '🤫 Secure sum', xp: 20, sub: 'Each friend splits their salary into 3 random shares that add up to it, and hands one share to each person. Everyone announces only the sum of the shares they received.',
    init(el, api) {
      const names = ['🦊 Ana', '🐼 Ben', '🐙 Cy']; const ins = [52000, 61000, 47000].map((v) => h('input', { type: 'number', value: v })); const out = h('div');
      const run = () => {
        const sal = ins.map((i) => Math.round(+i.value || 0)); const M = 1e9;
        const shares = sal.map((s) => { const r = new Uint32Array(2); crypto.getRandomValues(r); const a = r[0] % M, b = r[1] % M; return [a, b, s - a - b]; });
        const sums = [0, 1, 2].map((j) => shares.reduce((t, row) => t + row[j], 0)); const total = sums.reduce((a, b) => a + b, 0);
        out.innerHTML = `<div class="table-wrap"><table class="sk-table"><thead><tr><th></th>${names.map((n) => `<th>to ${n}</th>`).join('')}</tr></thead><tbody>${shares.map((row, i) => `<tr><td>${names[i]} splits</td>${row.map((v) => `<td style="font-family:var(--mono);font-size:.8rem">${fmt(v)}</td>`).join('')}</tr>`).join('')}<tr><td>announces sum</td>${sums.map((s) => `<td><b>${fmt(s)}</b></td>`).join('')}</tr></tbody></table></div><p class="w-out big">Total = ${fmt(total)} → average = <b>${fmt(Math.round(total / 3))}</b>. Each announced number looks random; no single salary was revealed.</p>`;
        api.done('Ran a secure multi-party sum');
      };
      ins.forEach((i) => i.addEventListener('input', debounce(run, 200)));
      el.append(h('div', { class: 'w-row' }, ins.map((i, k) => field(names[k] + '’s secret salary', i))), h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: run }, '🎲 New random shares')), out); run();
    },
  };

  // ------------------------------------------------------------------ 18.4 replay
  W.replay = {
    title: 'Replay attack on a car key', chip: '🚗 Record & replay', xp: 20,
    async init(el, api) {
      const prot = h('input', { type: 'checkbox' }); const key = rand(16); let counter = 0, carLast = 0, recorded = null; const log = h('ol', { class: 'step-list' });
      const add = (t, good) => { log.append(h('li', { class: 'on pop', style: `background:${good === true ? 'var(--mint-soft)' : good === false ? 'var(--coral-soft)' : 'var(--paper)'}`, html: t })); };
      const press = async () => {
        counter++; const msg = prot.checked ? `UNLOCK#${counter}` : 'UNLOCK'; const tag = prot.checked ? hex(await hmac('SHA-256', key, msg)).slice(0, 16) : '';
        recorded = { msg, tag }; add(`🔑 Fob sends <code>${msg}</code>${tag ? ` + MAC <code>${tag}</code>` : ''} · 😈 Mallory records it`, null); await check(recorded, 'fob');
      };
      const check = async (m, who) => {
        if (!prot.checked) { add(`🚗 Car hears <code>${m.msg}</code> → 🔓 UNLOCKED${who === 'mallory' ? ' <b>for Mallory!</b>' : ''}`, who !== 'mallory'); if (who === 'mallory') api.done('Saw a replay attack'); return; }
        const n = +m.msg.split('#')[1]; const ok = hex(await hmac('SHA-256', key, m.msg)).slice(0, 16) === m.tag;
        if (ok && n > carLast) { carLast = n; add(`🚗 MAC valid, counter ${n} > ${n - 1} → 🔓 unlocked`, true); }
        else { add(`🚗 MAC valid but counter ${n} ≤ last seen ${carLast} → 🛡️ <b>replay rejected</b>`, false); api.done('Blocked a replay attack'); }
      };
      el.append(h('div', { class: 'w-row' }, h('label', { style: 'display:flex;gap:6px;align-items:center' }, prot, 'Protect with counter + MAC'), h('button', { class: 'btn small', type: 'button', onclick: press }, '🔑 Press unlock'), h('button', { class: 'btn small coral', type: 'button', onclick: async () => { if (!recorded) return CS.toast('Press unlock first so Mallory can record it'); add('😈 Later that night, Mallory replays the recording…', null); await check(recorded, 'mallory'); } }, '😈 Replay recording'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => { log.innerHTML = ''; counter = carLast = 0; recorded = null; } }, '↺')), log);
    },
  };

  // ------------------------------------------------------------------ 18.9 checklist
  W.checklist = {
    title: 'Your crypto code-review checklist', chip: '✅ Tick them off', xp: 20, sub: 'Saved in this browser. Use it on your next project.',
    init(el, api) {
      const rows = $$('.sec-18-9 table tbody tr').map((tr) => [...tr.children].map((td) => td.innerHTML));
      const S = CS.state; S.check ||= {};
      const box = h('div'); const prog = h('p', { class: 'w-note' });
      const upd = () => { const n = rows.filter((_, i) => S.check[i]).length; prog.textContent = `${n} / ${rows.length} checked`; if (n === rows.length) api.done('Completed the checklist'); };
      rows.forEach(([bad, good], i) => { const cb = h('input', { type: 'checkbox', checked: !!S.check[i] }); cb.addEventListener('change', () => { S.check[i] = cb.checked; CS.save(); upd(); }); box.append(h('label', { style: 'display:flex;gap:10px;align-items:flex-start;padding:8px 10px;margin:6px 0;border:2px solid var(--ink);border-radius:10px;background:var(--paper);font-family:var(--body);font-size:.95rem' }, cb, h('span', { html: `<s style="color:var(--coral-ink)">${bad}</s><br>✅ ${good}` }))); });
      el.append(prog, box); upd();
    },
  };

  // ------------------------------------------------------------------ 19.2 key lifecycle
  W.lifecycle = {
    title: 'The key lifecycle wheel', chip: '🔄 Tap a stage', xp: 15,
    init(el, api) {
      const map = {}; $$('.sec-19-2 table tbody tr').forEach((tr) => { map[tr.children[0].textContent.trim()] = tr.children[1].innerHTML; });
      const st = ['Generate', 'Distribute', 'Store', 'Use', 'Rotate', 'Revoke', 'Destroy', 'Back up'];
      const cols = ['var(--sun)', 'var(--orange)', 'var(--coral)', 'var(--grape)', 'var(--ocean)', 'var(--mint)', 'var(--ink-faint)', 'var(--sky, #a2d2ff)'];
      const S = 320, c = 160, R = 118; const svg = h('svg', { viewBox: `0 0 ${S} ${S}`, width: S, height: S }); const info = h('div', { class: 'w-out big' }, 'Tap a stage.'); const seen = new Set();
      svg.append(h('circle', { cx: c, cy: c, r: R, fill: 'none', stroke: 'var(--ink-faint)', 'stroke-width': 3, 'stroke-dasharray': '8 6' }), h('text', { x: c, y: c + 8, 'text-anchor': 'middle', 'font-size': 34 }, '🔑'));
      st.forEach((s, i) => {
        const a = (i / st.length) * Math.PI * 2 - Math.PI / 2, x = c + Math.cos(a) * R, y = c + Math.sin(a) * R;
        const g = h('g', { style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': s });
        g.append(h('circle', { cx: x, cy: y, r: 32, fill: cols[i], stroke: 'var(--ink)', 'stroke-width': 2.5 }), h('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-family': 'Patrick Hand', 'font-size': 13, fill: '#2b2d42' }, s));
        const pickS = () => { info.innerHTML = `<b>${s}</b>: ${map[s] || ''}`; seen.add(s); if (seen.size >= 5) api.done('Toured the key lifecycle'); };
        g.addEventListener('click', pickS); g.addEventListener('keydown', (e) => e.key === 'Enter' && pickS()); svg.append(g);
      });
      el.append(h('div', { class: 'w-grid2' }, h('div', { class: 'svg-wrap' }, svg), info));
    },
  };

  // ------------------------------------------------------------------ 19.4 envelope encryption
  W.envelope = {
    title: 'Envelope encryption with a pretend KMS', chip: '✉️ Real wrapKey', xp: 25, sub: 'Each file gets its own data key (DEK). The DEK is wrapped by a key-encryption key (KEK) that never leaves the “KMS”. Real AES-GCM + AES-KW.',
    async init(el, api) {
      let kek = await crypto.subtle.generateKey({ name: 'AES-KW', length: 256 }, false, ['wrapKey', 'unwrapKey']); let kekVer = 1;
      const files = []; const list = h('div'); const name = h('input', { type: 'text', value: 'photo-001.jpg' });
      const draw = () => { list.innerHTML = ''; files.forEach((f) => list.append(h('div', { class: 'w-box', style: 'margin:6px 0' }, h('b', {}, `📄 ${f.name}`), h('div', { style: 'font-family:var(--mono);font-size:.78rem;word-break:break-all' }, `ciphertext: ${hex(f.ct).slice(0, 40)}… (${f.ct.length} B)`), h('div', { style: 'font-family:var(--mono);font-size:.78rem;word-break:break-all;color:var(--grape-ink)' }, `wrapped DEK (KEK v${f.v}): ${hex(f.wdek)} (${f.wdek.length} B)`), h('button', { class: 'btn small mint', type: 'button', onclick: async (e) => { const dek = await crypto.subtle.unwrapKey('raw', f.wdek, kek, 'AES-KW', 'AES-GCM', false, ['decrypt']); const pt = dec(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: f.iv }, dek, f.ct)); e.target.replaceWith(h('span', { class: 'w-good' }, `✅ KMS unwrapped the DEK → “${pt}”`)); } }, '🔓 Decrypt')))); };
      const add = async () => {
        const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); const iv = rand(12);
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, enc(`contents of ${name.value}`)));
        const wdek = new Uint8Array(await crypto.subtle.wrapKey('raw', dek, kek, 'AES-KW'));
        files.push({ name: name.value, ct, iv, wdek, v: kekVer }); name.value = `photo-${String(files.length + 1).padStart(3, '0')}.jpg`; draw(); api.done('Encrypted with envelope encryption');
      };
      const rotate = async () => {
        const nk = await crypto.subtle.generateKey({ name: 'AES-KW', length: 256 }, false, ['wrapKey', 'unwrapKey']); const t0 = performance.now();
        for (const f of files) { const dek = await crypto.subtle.unwrapKey('raw', f.wdek, kek, 'AES-KW', 'AES-GCM', true, ['encrypt', 'decrypt']); f.wdek = new Uint8Array(await crypto.subtle.wrapKey('raw', dek, nk, 'AES-KW')); f.v = kekVer + 1; }
        kek = nk; kekVer++; draw(); CS.toast(`🔄 KEK rotated to v${kekVer}: re-wrapped ${files.length} tiny DEKs in ${(performance.now() - t0).toFixed(1)} ms. No file was re-encrypted!`, 'mint');
      };
      el.append(h('div', { class: 'w-row' }, field('File name', name), h('button', { class: 'btn small', type: 'button', onclick: add }, '➕ Encrypt a file'), h('button', { class: 'btn small grape', type: 'button', onclick: rotate }, '🔄 Rotate the KEK')), h('p', { class: 'w-note' }, '🏦 KMS: holds the KEK (non-exportable, it can only wrap/unwrap).'), list);
      await add();
    },
  };

  // ------------------------------------------------------------------ 21.3 decision helper
  W.decide = {
    title: '“Which tool do I need?” in three taps', chip: '🧭 Choose', xp: 20,
    init(el, api) {
      const T = {
        '🙈 Keep data SECRET': [['Both sides already share a key', 'AEAD: AES-GCM / ChaCha20-Poly1305', 5], ['Send to someone’s public key', 'Hybrid encryption: HPKE, age', 9], ['Set up a shared key over a network', 'Key exchange (X25519 / X25519MLKEM768) + authentication', 10]],
        '🧪 Detect CHANGES': [['Accidental corruption only', 'Hash: SHA-256', 6], ['Deliberate tampering, shared key', 'MAC: HMAC-SHA256, or AEAD', 7], ['Deliberate tampering, anyone must verify', 'Digital signature: Ed25519', 11]],
        '🪪 Prove IDENTITY': [['A website or server', 'Certificate (X.509) + TLS', 13], ['A person logging in', 'Passkey, or password + MFA', 16], ['“Sign in with…” another account', 'OpenID Connect + PKCE', 20], ['A machine or service', 'mTLS, SSH keys, signed tokens', 14]],
        '🧂 Store PASSWORDS': [['User passwords', 'Argon2id (salted, slow)', 8]],
        '🚇 Protect a CONNECTION': [['Web / API', 'HTTPS (TLS 1.3)', 14], ['Remote shell / file copy', 'SSH', 15], ['Whole network / device', 'VPN: WireGuard, IPsec', 15]],
      };
      const box = h('div'); const found = new Set();
      const home = () => { box.innerHTML = ''; box.append(h('p', { class: 'w-note' }, 'What are you trying to do?'), h('div', { class: 'chips' }, Object.keys(T).map((k) => h('button', { class: 'btn small ghost', type: 'button', onclick: () => step(k) }, k)))); };
      const step = (k) => { box.innerHTML = ''; box.append(h('p', { class: 'w-note' }, k), h('div', { class: 'chips' }, T[k].map(([q, a, ch]) => h('button', { class: 'btn small', type: 'button', onclick: () => result(q, a, ch) }, q))), h('p', {}, h('button', { class: 'btn small ghost', type: 'button', onclick: home }, '◀ Back'))); };
      const result = (q, a, ch) => { found.add(a); box.innerHTML = ''; box.append(h('div', { class: 'w-box pop', style: 'background:var(--mint-soft)' }, h('p', { style: 'margin:0' }, q + ' →'), h('h5', { style: 'font-size:1.8rem' }, '✅ ' + a), h('a', { class: 'xref', href: `chapter-${String(ch).padStart(2, '0')}.html` }, `Read Chapter ${ch} →`)), h('p', {}, h('button', { class: 'btn small', type: 'button', onclick: home }, '↺ Ask another'))); if (found.size >= 3) api.done('Used the decision guide'); };
      el.append(box); home();
    },
  };

  // ------------------------------------------------------------------ 22 glossary flashcards
  W.flashcards = {
    title: 'Glossary flashcards', chip: '🃏 Flip', xp: 30, sub: 'Every term from the glossary below. Flip, then be honest!',
    init(el, api) {
      const cards = $$('.chapter .sk-table tbody tr').map((tr) => [tr.children[0].textContent.trim(), tr.children[1].innerHTML]).filter((c) => c[0]);
      for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
      let i = 0, flipped = false, known = 0, done = 0;
      const card = h('button', { type: 'button', style: 'display:grid;place-items:center;width:100%;min-height:170px;padding:18px;border:3px solid var(--ink);border-radius:18px;background:var(--sun-soft);color:var(--ink);cursor:pointer;font:inherit;box-shadow:var(--shadow-sm);transition:transform .35s' });
      const stat = h('p', { class: 'w-note' }); const filter = h('input', { type: 'search', placeholder: 'Filter the glossary table below…' });
      const show = () => { const [t, m] = cards[i % cards.length]; card.style.background = flipped ? 'var(--mint-soft)' : 'var(--sun-soft)'; card.innerHTML = flipped ? `<span style="font-size:1.05rem">${m}</span>` : `<span style="font:700 2.4rem var(--hand)">${t}</span><small>tap to flip</small>`; stat.textContent = `Card ${(i % cards.length) + 1} / ${cards.length} · knew ${known} of ${done}`; };
      card.addEventListener('click', () => { flipped = !flipped; card.style.transform = 'rotateY(180deg)'; setTimeout(() => { card.style.transform = ''; show(); }, 180); });
      const next = (k) => { done++; if (k) known++; i++; flipped = false; show(); if (done >= 10) api.done('Studied 10 flashcards'); };
      filter.addEventListener('input', () => { const q = filter.value.toLowerCase(); $$('.chapter .sk-table tbody tr').forEach((tr) => (tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none')); });
      el.append(card, h('div', { class: 'chips', style: 'margin-top:10px;justify-content:center' }, h('button', { class: 'btn small mint', type: 'button', onclick: () => next(true) }, '✓ I knew it'), h('button', { class: 'btn small coral', type: 'button', onclick: () => next(false) }, '✗ Still learning')), stat, field('🔎 Search the glossary', filter));
      show();
    },
  };
})();
