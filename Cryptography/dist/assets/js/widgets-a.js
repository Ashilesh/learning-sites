/* Widgets for Start + Chapters 1–4 */
(() => {
  'use strict';
  const { h, $, $$, enc, hex, b64, rand, sha, modpow, isPrime, fmt, debounce } = CS;
  const W = window.W;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const shift = (s, k) => s.toUpperCase().replace(/[A-Z]/g, (c) => A[(A.indexOf(c) + k + 2600) % 26]);
  const field = (label, input) => h('label', { style: 'display:flex;flex-direction:column;gap:4px;flex:1 1 200px' }, label, input);

  // ------------------------------------------------------------------ Start page
  W.howtoplay = {
    title: 'How this sketchbook works', chip: '🎮 Read me', xp: 10,
    init(el, api) {
      const S = CS.state;
      el.append(h('div', { class: 'w-grid3' },
        ...[['📖', 'Read', 'Every section you finish earns 5 XP and a ✔ stamp.'], ['🕹️', 'Play', '80 live demos, many running REAL crypto in your browser. Each is worth XP.'], ['👾', 'Beat the boss', 'Each chapter ends with a quiz. Win it to earn a 🔑 key fragment.'], ['🔒', 'Open the vault', 'Collect every fragment to decrypt the secret message on the home page.'], ['▶', 'Swipe Shorts', 'Short on time? Swipe bite-sized key ideas, true stories and quizzes.'], ['🔥', 'Keep a streak', 'Come back daily to grow your streak. 🌙 switches to chalkboard mode.']]
          .map(([e, t, d]) => h('div', { class: 'w-box' }, h('h5', {}, `${e} ${t}`), h('p', { style: 'margin:0;font-size:.95rem' }, d)))));
      const ladder = h('ol', { class: 'chips', style: 'list-style:none;padding:0;margin:14px 0 0' }, CS.LEVELS.map(([x, n, e], i) => h('li', { class: 'chip' + (CS.levelOf(S.xp) >= i ? ' on' : '') }, `${e} ${n} · ${fmt(x)}`)));
      el.append(h('p', { class: 'w-note' }, 'Your ranks on the way to legend:'), ladder);
      el.append(h('div', { class: 'w-row' }, h('button', { class: 'btn', type: 'button', onclick: () => api.done('Ready to go!') }, 'Got it, let’s play! 🚀')));
    },
  };

  // ------------------------------------------------------------------ 1.4 cast
  W.cast = {
    title: 'Meet the cast', chip: '🎭 Characters', xp: 10, sub: 'Tap each character to learn their superpower.',
    init(el, api) {
      const cast = [
        ['alice', 'Alice', 'Wants to send a secret message.', 'She’ll encrypt, sign and MAC everything she sends.'],
        ['bob', 'Bob', 'Wants to receive it.', 'He decrypts and verifies, and rejects anything tampered with.'],
        ['eve', 'Eve', 'The eavesdropper: listens to everything, changes nothing.', 'Defeated by encryption (confidentiality).'],
        ['mallory', 'Mallory', 'The active attacker: listens, blocks, modifies, replays, injects, impersonates.', 'Defeated by MACs, signatures and authenticated key exchange.'],
        ['trent', 'Trent', 'A trusted third party, like a notary or a certificate authority.', 'Vouches for whose key is whose (Chapter 13).'],
      ];
      const seen = new Set();
      const grid = h('div', { class: 'w-grid3' });
      for (const [k, name, role, power] of cast) {
        const svg = h('svg', { viewBox: '0 0 120 140', style: 'color:var(--ink);width:100%;height:120px' });
        Doodle.person(Doodle.pen(svg, name.length), k, 60, 48, .95);
        const back = h('p', { style: 'margin:6px 0 0;font-size:.9rem', hidden: true, html: `⚡ <b>${power}</b>` });
        const card = h('button', { type: 'button', class: 'w-box', style: 'cursor:pointer;text-align:center;font:inherit;color:inherit' }, svg, h('h5', {}, name), h('p', { style: 'margin:0;font-size:.9rem' }, role), back);
        card.addEventListener('click', () => { back.hidden = !back.hidden; card.classList.add('w-flash'); seen.add(k); if (seen.size === 5) api.done('Met the whole cast'); });
        grid.append(card);
      }
      el.append(grid, h('p', { class: 'w-note' }, '🕵️ On the internet, always assume Mallory is on the line.'));
    },
  };

  // ------------------------------------------------------------------ 1.6 triad
  W.triad = {
    title: 'Encoding vs. encryption vs. hashing', chip: '🔬 Live lab', xp: 15, sub: 'Type anything. All three outputs are computed for real in your browser.',
    async init(el, api) {
      const inp = h('input', { type: 'text', value: 'Hello, World!', 'aria-label': 'Text to transform' });
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
      const o1 = h('div', { class: 'w-out' }), o2 = h('div', { class: 'w-out' }), o3 = h('div', { class: 'w-out' });
      const n1 = h('p', { class: 'w-note' }), n2 = h('p', { class: 'w-note' }), n3 = h('p', { class: 'w-note' });
      let last = {};
      const run = debounce(async () => {
        const bytes = enc(inp.value);
        const iv = rand(12);
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
        last = { b: b64(bytes), ct, iv };
        o1.textContent = last.b; o2.textContent = hex(ct); o3.textContent = hex(await sha('SHA-256', bytes));
        n1.textContent = n2.textContent = n3.textContent = '';
      }, 150);
      inp.addEventListener('input', () => { run(); api.done('Compared all three'); });
      el.append(field('Your text', inp), h('div', { class: 'w-grid3', style: 'margin-top:12px' },
        h('div', { class: 'w-box' }, h('h5', {}, '📦 Base64 (encoding)'), o1, h('button', { class: 'btn small ghost', type: 'button', onclick: () => { try { n1.textContent = '✅ Anyone can decode: “' + new TextDecoder().decode(Uint8Array.from(atob(last.b), (c) => c.charCodeAt(0))) + '”'; } catch (e) { n1.textContent = 'decode error'; } } }, 'Decode it'), n1),
        h('div', { class: 'w-box' }, h('h5', {}, '🔐 AES-256-GCM (encryption)'), o2, h('div', { class: 'chips' }, h('button', { class: 'btn small ghost', type: 'button', onclick: async () => { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: last.iv }, key, last.ct); n2.textContent = '✅ With the key: “' + new TextDecoder().decode(pt) + '”'; } }, 'Decrypt with key'), h('button', { class: 'btn small coral', type: 'button', onclick: async () => { const wrong = await crypto.subtle.importKey('raw', rand(32), 'AES-GCM', false, ['decrypt']); try { await crypto.subtle.decrypt({ name: 'AES-GCM', iv: last.iv }, wrong, last.ct); } catch (e) { n2.textContent = '❌ Wrong key: decryption fails (OperationError).'; } } }, 'Wrong key')), n2,
          h('small', { style: 'color:var(--ink-faint)' }, 'key = ' + hex(rawKey).slice(0, 24) + '…')),
        h('div', { class: 'w-box' }, h('h5', {}, '🫆 SHA-256 (hashing)'), o3, h('button', { class: 'btn small ghost', type: 'button', onclick: () => { n3.textContent = '🙅 Impossible: hashing is one-way. There is no key and no “un-hash”.'; o3.classList.add('shake'); setTimeout(() => o3.classList.remove('shake'), 500); } }, 'Reverse it?'), n3)));
      run();
    },
  };

  // ------------------------------------------------------------------ 1.8 toolbox map
  W.toolbox = {
    title: 'Tap a tool to jump to its chapter', chip: '🧰 Map', xp: 5,
    init(el, api) {
      const rows = [
        ['Randomness', '🎲', 'The raw material every key is made from', 4, 'sun'],
        ['Encryption', '🔑', 'AES, ChaCha20 → secrecy', 5, 'coral'], ['Hash functions', '🫆', 'SHA-256, SHA-3 → fingerprints', 6, 'coral'], ['MACs', '🧷', 'HMAC, Poly1305 → tamper seals', 7, 'coral'], ['Passwords & KDFs', '🧂', 'Argon2, bcrypt, HKDF', 8, 'coral'],
        ['Public-key encryption', '🗝️', 'RSA, ECC → secrecy without meeting', 9, 'coral'], ['Key exchange', '🎨', 'Diffie-Hellman, ML-KEM → shared secrets', 10, 'coral'], ['Signatures', '✍️', 'Ed25519, ECDSA, RSA → proof of origin', 11, 'coral'],
        ['Certificates / PKI', '🪪', 'X.509, CAs → ID cards for keys', 13, 'ocean'], ['Protocols', '🤝', 'TLS, SSH, VPNs, Wi-Fi, Signal, passkeys', 14, 'mint'],
      ];
      el.append(h('div', { class: 'w-grid3' }, rows.map(([t, e, d, ch, col]) => h('a', { class: `w-box world-${col}`, href: `chapter-${String(ch).padStart(2, '0')}.html`, style: 'text-decoration:none;color:inherit;background:var(--accent-soft)', onclick: () => api.done('Explored the toolbox') }, h('h5', {}, `${e} ${t}`), h('p', { style: 'margin:0;font-size:.88rem' }, d), h('small', { style: 'font-family:var(--marker);color:var(--accent-ink)' }, `Chapter ${ch} →`)))));
    },
  };

  // ------------------------------------------------------------------ 2.1 Caesar wheel
  W.caesar = {
    title: 'The Caesar wheel', chip: '🏛️ Spin it', xp: 20, sub: 'Drag the slider to rotate the inner wheel. Then crack the mystery message below.',
    init(el, api) {
      const size = 260, c = size / 2;
      const svg = h('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, style: 'color:var(--ink);filter:url(#wobble)' });
      svg.append(h('circle', { cx: c, cy: c, r: 124, fill: 'var(--sun-soft)', stroke: 'currentColor', 'stroke-width': 3 }));
      svg.append(h('circle', { cx: c, cy: c, r: 88, fill: 'var(--paper-2)', stroke: 'currentColor', 'stroke-width': 3 }));
      const inner = h('g', { style: `transform-origin:${c}px ${c}px;transition:transform .45s cubic-bezier(.2,.9,.3,1.3)` });
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 - Math.PI / 2;
        svg.append(h('text', { x: c + Math.cos(a) * 106, y: c + Math.sin(a) * 106 + 7, 'text-anchor': 'middle', 'font-family': 'Patrick Hand', 'font-size': 18, fill: 'currentColor' }, A[i]));
        inner.append(h('text', { x: c + Math.cos(a) * 70, y: c + Math.sin(a) * 70 + 6, 'text-anchor': 'middle', 'font-family': 'Patrick Hand', 'font-size': 16, fill: 'var(--coral-ink)' }, A[i]));
      }
      svg.append(inner, h('text', { x: c, y: c + 6, 'text-anchor': 'middle', 'font-family': 'Caveat', 'font-size': 26, 'font-weight': 700, fill: 'currentColor', id: 'cz-k' }, 'k=3'));
      const slider = h('input', { type: 'range', min: 0, max: 25, value: 3, 'aria-label': 'Shift' });
      const pt = h('input', { type: 'text', value: 'ATTACK AT DAWN', 'aria-label': 'Plaintext' });
      const out = h('div', { class: 'w-out big' });
      const mystery = shift('VENI VIDI VICI', 11);
      const mOut = h('div', { class: 'w-out big' });
      const brute = h('ol', { style: 'columns:2;font-family:var(--mono);font-size:.85rem;margin:8px 0;padding-left:2.2em', hidden: true });
      const words = /\b(THE|AND|AT|DAWN|VENI|VIDI|VICI|ATTACK|CAME|SAW)\b/;
      const update = () => {
        const k = +slider.value;
        inner.style.transform = `rotate(${(-k * 360) / 26}deg)`;
        svg.querySelector('#cz-k').textContent = 'k=' + k;
        out.textContent = shift(pt.value, k);
        const dec = shift(mystery, -k);
        mOut.innerHTML = `${mystery} → <b>${dec}</b>`;
        if (dec === 'VENI VIDI VICI') { mOut.innerHTML += ' 🎉 <span class="w-good">Cracked! (“I came, I saw, I conquered”)</span>'; api.done('Cracked Caesar'); api.achieve('caesar'); }
      };
      slider.addEventListener('input', update); pt.addEventListener('input', update);
      el.append(h('div', { class: 'w-grid2' }, h('div', { class: 'svg-wrap' }, svg), h('div', {},
        field(h('span', {}, 'Shift key ', h('b', { id: 'cz-val' })), slider), field('Plaintext', pt), h('p', { class: 'w-note' }, 'Ciphertext:'), out,
        h('p', { class: 'w-note' }, '🕵️ Mystery message (shift unknown):'), mOut,
        h('div', { class: 'w-row' }, h('button', { class: 'btn coral small', type: 'button', onclick: () => { brute.hidden = false; brute.innerHTML = ''; for (let k = 1; k < 26; k++) { const d = shift(mystery, -k); brute.append(h('li', { style: words.test(d) ? 'background:var(--mint);color:#12352a;font-weight:800' : '' }, d)); } api.done('Brute-forced Caesar'); api.achieve('caesar'); } }, '💥 Brute-force all 25 keys')), brute)));
      update();
    },
  };

  // ------------------------------------------------------------------ 2.2 frequency analysis puzzle
  W.freq = {
    title: 'Be Al-Kindi: crack a substitution cipher', chip: '🔎 Puzzle', xp: 40, sub: 'Every letter was swapped for another. Compare the bar charts, type your guesses under the cipher letters, and watch the message appear. Stuck? Use a hint.',
    init(el, api) {
      const PLAIN = 'EVERY SECRET MESSAGE LEAVES FINGERPRINTS. IN ENGLISH THE LETTER E APPEARS MORE OFTEN THAN ANY OTHER, FOLLOWED BY T, A, O, I AND N. A SIMPLE SUBSTITUTION CIPHER SWAPS EACH LETTER FOR ANOTHER, BUT IT CANNOT HIDE HOW OFTEN EACH ONE SHOWS UP. COUNT THE SYMBOLS, MATCH THE MOST COMMON ONES TO THE MOST COMMON LETTERS, GUESS SHORT WORDS LIKE THE AND AND, AND THE WHOLE MESSAGE STARTS TO UNRAVEL.';
      const KEY = 'QWERTYUIOPASDFGHJKLZXCVBNM';
      const CT = PLAIN.replace(/[A-Z]/g, (c) => KEY[A.indexOf(c)]);
      const inv = {}; for (let i = 0; i < 26; i++) inv[KEY[i]] = A[i];
      const counts = {}; for (const ch of CT) if (/[A-Z]/.test(ch)) counts[ch] = (counts[ch] || 0) + 1;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const EN = { E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0, D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0, P: 1.9, B: 1.5, V: 1.0, K: .8, J: .15, X: .15, Q: .1, Z: .07 };
      const bars = (data, color) => { const max = Math.max(...data.map((d) => d[1])); return h('div', { class: 'bars' }, data.map(([l, v]) => h('div', { class: 'bar', title: `${l}: ${v.toFixed(1)}%` }, h('i', { style: `height:${(v / max) * 100}%;background:${color}` }), h('b', {}, l)))); };
      const cipherSorted = Object.entries(counts).map(([l, c]) => [l, (c / total) * 100]).sort((a, b) => b[1] - a[1]);
      el.append(h('div', { class: 'w-grid2' }, h('div', { class: 'w-box' }, h('h5', {}, 'Ciphertext letters (most → least)'), bars(cipherSorted, 'var(--coral)')), h('div', { class: 'w-box' }, h('h5', {}, 'Normal English letters'), bars(Object.entries(EN), 'var(--ocean)'))));
      const guess = {};
      const keyRow = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;margin:12px 0' });
      const out = h('div', { class: 'w-out', style: 'font-size:1rem;line-height:1.9;word-break:normal' });
      const status = h('p', { class: 'w-note' });
      const inputs = {};
      for (const [l] of cipherSorted) {
        const i = h('input', { type: 'text', maxlength: 1, 'aria-label': `Plain letter for cipher ${l}`, style: 'width:34px;text-align:center;padding:4px;text-transform:uppercase;font-family:var(--mono)' });
        i.addEventListener('input', () => { guess[l] = i.value.toUpperCase().replace(/[^A-Z]/g, ''); i.value = guess[l]; render(); });
        inputs[l] = i;
        keyRow.append(h('label', { style: 'display:flex;flex-direction:column;align-items:center;font-family:var(--mono);font-size:.9rem;color:var(--coral-ink)' }, l, i));
      }
      const render = () => {
        let solved = 0, html = '';
        for (const ch of CT) {
          if (!/[A-Z]/.test(ch)) { html += ch; continue; }
          const g = guess[ch];
          html += g ? `<b style="color:${g === inv[ch] ? 'var(--mint-ink)' : 'var(--coral-ink)'}">${g}</b>` : `<span style="color:var(--ink-faint)">${ch.toLowerCase()}</span>`;
        }
        out.innerHTML = html;
        for (const l of Object.keys(counts)) if (guess[l] === inv[l]) solved++;
        const n = Object.keys(counts).length;
        status.textContent = `${solved} / ${n} letters correct ${solved === n ? '🎉 You broke it, just like Al-Kindi ~850 AD!' : ''}`;
        if (solved === n) { api.done('Cracked the substitution cipher'); api.achieve('freq'); }
      };
      el.append(h('p', { class: 'w-note' }, 'Your key guesses (cipher letter → plain letter):'), keyRow,
        h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { const l = cipherSorted.map((x) => x[0]).find((x) => guess[x] !== inv[x]); if (l) { guess[l] = inv[l]; inputs[l].value = inv[l]; render(); } } }, '💡 Hint: reveal one letter'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => { for (const k in guess) delete guess[k]; Object.values(inputs).forEach((i) => (i.value = '')); render(); } }, '↺ Clear')),
        out, status);
      render();
    },
  };

  // ------------------------------------------------------------------ 2.3 Vigenère
  W.vigenere = {
    title: 'Vigenère: a different shift per letter', chip: '🔁 Play', xp: 15,
    init(el, api) {
      const pt = h('input', { type: 'text', value: 'ATTACK AT DAWN' }), kw = h('input', { type: 'text', value: 'LEMON' });
      const table = h('div', { class: 'svg-wrap' });
      const render = () => {
        const p = pt.value.toUpperCase().replace(/[^A-Z]/g, ''), k = (kw.value.toUpperCase().replace(/[^A-Z]/g, '') || 'A');
        const cells = (arr, style) => h('tr', {}, arr.map((x, i) => h('td', { style: (style ? style(i) : '') + ';text-align:center;padding:4px 6px;font-family:var(--mono)' }, x)));
        const ks = [...p].map((_, i) => k[i % k.length]);
        const cs = [...p].map((c, i) => A[(A.indexOf(c) + A.indexOf(ks[i])) % 26]);
        const hl = (i) => (p[i] === 'T' ? 'background:var(--sun-soft);font-weight:800' : '');
        table.innerHTML = '';
        table.append(h('table', { class: 'sk-table', style: 'width:auto' }, h('tbody', {},
          h('tr', {}, h('th', {}, 'Plain'), ...[...p].map((c, i) => h('td', { style: hl(i) + ';text-align:center;font-family:var(--mono)' }, c))),
          h('tr', {}, h('th', {}, 'Key'), ...ks.map((c, i) => h('td', { style: 'text-align:center;font-family:var(--mono);color:var(--coral-ink);' + hl(i) }, c))),
          h('tr', {}, h('th', {}, 'Shift'), ...ks.map((c, i) => h('td', { style: 'text-align:center;font-size:.8rem;' + hl(i) }, A.indexOf(c)))),
          h('tr', {}, h('th', {}, 'Cipher'), ...cs.map((c, i) => h('td', { style: 'text-align:center;font-family:var(--mono);font-weight:800;color:var(--ocean-ink);' + hl(i) }, c))))));
        cells; api.done('Tried Vigenère');
      };
      pt.addEventListener('input', render); kw.addEventListener('input', render);
      el.append(h('div', { class: 'w-row' }, field('Plaintext', pt), field('Keyword', kw)), table, h('p', { class: 'w-note' }, '🟨 Highlighted: the same plaintext letter T becomes different cipher letters. But the keyword repeats every ' + 5 + ' letters… and that is the crack.'));
      kw.addEventListener('input', () => { el.querySelector('.w-note').textContent = `🟨 The same letter T becomes different cipher letters. But the keyword repeats every ${kw.value.replace(/[^a-z]/gi, '').length || 1} letters… and that is the crack.`; });
      render();
    },
  };

  // ------------------------------------------------------------------ 2.4 toy Enigma
  W.enigma = {
    title: 'A toy Enigma (3 rotors + reflector)', chip: '⚙️ Type on it', xp: 20, sub: 'Real wirings of rotors I, II, III and reflector B (simplified stepping). Type the same letter over and over and watch the output change, and never equal itself.',
    init(el, api) {
      const R = ['EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'AJDKSIRUXBLHWTMCQGZNPYFVOE', 'BDFHJLCPRTXVZNYEIWGAKMUSQO'];
      const NOTCH = ['Q', 'E', 'V'];
      const REF = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';
      let pos = [0, 0, 0];
      const fwd = (w, c, p) => (A.indexOf(w[(c + p) % 26]) - p + 26) % 26;
      const back = (w, c, p) => (w.indexOf(A[(c + p) % 26]) - p + 26) % 26;
      const step = () => { if (A[pos[2]] === NOTCH[2]) { if (A[pos[1]] === NOTCH[1]) pos[0] = (pos[0] + 1) % 26; pos[1] = (pos[1] + 1) % 26; } pos[2] = (pos[2] + 1) % 26; };
      const press = (ch) => { step(); let c = A.indexOf(ch); c = fwd(R[2], c, pos[2]); c = fwd(R[1], c, pos[1]); c = fwd(R[0], c, pos[0]); c = A.indexOf(REF[c]); c = back(R[0], c, pos[0]); c = back(R[1], c, pos[1]); c = back(R[2], c, pos[2]); return A[c]; };
      const windows = h('div', { class: 'chips', style: 'font-size:1.6rem' });
      const lamps = h('div', { style: 'display:grid;grid-template-columns:repeat(13,1fr);gap:4px;margin:8px 0' });
      const lampEls = {}; for (const l of A) { lampEls[l] = h('span', { style: 'display:grid;place-items:center;height:30px;border:2px solid var(--ink);border-radius:50%;font-family:var(--mono);font-size:.85rem;background:var(--paper)' }, l); lamps.append(lampEls[l]); }
      const keys = h('div', { style: 'display:grid;grid-template-columns:repeat(13,1fr);gap:4px' });
      const tape = h('div', { class: 'w-out big' });
      let typed = '', outT = '';
      const render = () => { windows.innerHTML = ''; pos.forEach((p) => windows.append(h('span', { class: 'chip on', style: 'font-family:var(--mono);font-size:1.2rem' }, A[p]))); tape.innerHTML = `typed&nbsp; ${typed || '…'}<br>output ${outT || '…'}`; };
      for (const l of A) keys.append(h('button', { class: 'chip', type: 'button', style: 'padding:6px 0;font-family:var(--mono)', onclick: () => {
        const o = press(l); typed += l; outT += o; Object.values(lampEls).forEach((x) => (x.style.background = 'var(--paper)')); lampEls[o].style.background = 'var(--sun)'; render();
        if (typed.length >= 10) api.done('Typed on an Enigma');
      } }, l));
      el.append(h('div', { class: 'w-row' }, h('span', { class: 'w-note', style: 'margin:0' }, 'Rotor windows:'), windows, h('button', { class: 'btn small ghost', type: 'button', onclick: () => { pos = [0, 0, 0]; typed = outT = ''; render(); } }, '↺ Reset to AAA')),
        h('p', { class: 'w-note' }, '💡 Lampboard'), lamps, h('p', { class: 'w-note' }, '⌨️ Keyboard'), keys, tape,
        h('p', { class: 'w-sub', style: 'margin-top:10px' }, 'Reset and type the output back in: you get the original message. Enigma is its own inverse, which is exactly why a letter can never encrypt to itself, the flaw Bletchley Park exploited.'));
      render();
    },
  };

  // ------------------------------------------------------------------ 2.5 one-time pad
  W.otp = {
    title: 'One ciphertext, every possible message', chip: '🎟️ One-time pad', xp: 15, sub: 'The ciphertext is XMCKL. Type ANY 5-letter word: there is always a key that “decrypts” to it. That is perfect secrecy.',
    init(el, api) {
      const C = 'XMCKL';
      const g = h('input', { type: 'text', value: 'HELLO', maxlength: 5, style: 'text-transform:uppercase;font-family:var(--mono);max-width:140px' });
      const out = h('div', { class: 'w-out big' });
      let tries = new Set();
      const run = () => {
        const p = (g.value.toUpperCase().replace(/[^A-Z]/g, '') + 'AAAAA').slice(0, 5);
        const k = [...p].map((c, i) => A[(A.indexOf(C[i]) - A.indexOf(c) + 26) % 26]).join('');
        out.innerHTML = `ciphertext <b>XMCKL</b> − key <b style="color:var(--coral-ink)">${k}</b> = <b style="color:var(--mint-ink)">${p}</b>`;
        tries.add(p); if (tries.size >= 3) api.done('Saw perfect secrecy');
      };
      g.addEventListener('input', run);
      el.append(h('div', { class: 'w-row' }, field('Guess the plaintext', g), ...['HELLO', 'PIZZA', 'TANKS', 'PEACE'].map((w) => h('button', { class: 'chip', type: 'button', onclick: () => { g.value = w; run(); } }, w))), out,
        h('p', { class: 'w-note' }, 'Without the real key, every guess is equally likely. Reuse the pad once (Venona!) and this magic disappears.'));
      run();
    },
  };

  // ------------------------------------------------------------------ 3.1 bits & bytes
  W.bits = {
    title: 'Bits, bytes and hex explorer', chip: '💡 Flip switches', xp: 15, sub: 'Click any bit (a light switch) to flip it and see the letter change.',
    init(el, api) {
      const inp = h('input', { type: 'text', value: 'Hi', maxlength: 6, 'aria-label': 'Text' });
      const rows = h('div');
      const render = () => {
        rows.innerHTML = '';
        [...enc(inp.value)].forEach((byte, idx) => {
          const r = h('div', { class: 'w-row', style: 'align-items:center;gap:6px' });
          const label = h('b', { style: 'font:700 1.6rem var(--hand);width:42px;text-align:center' }, String.fromCharCode(byte));
          const info = h('span', { style: 'font-family:var(--mono);font-size:.9rem' });
          const bitsEl = h('span');
          const draw = (b) => { label.textContent = b >= 32 && b < 127 ? String.fromCharCode(b) : '·'; info.innerHTML = `dec <b>${b}</b> · hex <b>${b.toString(16).padStart(2, '0')}</b>`; bitsEl.innerHTML = ''; for (let i = 7; i >= 0; i--) { const on = (b >> i) & 1; bitsEl.append(h('span', { class: 'bitcell' + (on ? ' on' : ''), title: `bit value ${1 << i}`, onclick: () => { b ^= 1 << i; draw(b); api.done('Flipped a bit'); } }, on)); } };
          draw(byte); r.append(label, bitsEl, info); rows.append(r);
        });
      };
      inp.addEventListener('input', render);
      el.append(field('Type a few characters', inp), rows, h('p', { class: 'w-note' }, '8 bits = 1 byte = 2 hex characters. So a 64-character hex string is 256 bits.'));
      render();
    },
  };

  // ------------------------------------------------------------------ 3.2 Base64 step-by-step
  W.base64 = {
    title: 'Base64, step by step', chip: '📦 Encode', xp: 15, sub: '3 bytes (24 bits) become 4 characters of 6 bits each. “=” is padding.',
    init(el, api) {
      const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const inp = h('input', { type: 'text', value: 'Hi' });
      const out = h('div');
      const render = () => {
        const bytes = [...enc(inp.value)].slice(0, 9);
        const bits = bytes.map((b) => b.toString(2).padStart(8, '0')).join('');
        const padded = bits + '0'.repeat((6 - (bits.length % 6)) % 6);
        const groups = padded.match(/.{6}/g) || [];
        const chars = groups.map((g) => ALPH[parseInt(g, 2)]);
        const padN = (3 - (bytes.length % 3)) % 3;
        out.innerHTML = '';
        out.append(
          h('p', { class: 'w-note' }, '① bytes'), h('div', { class: 'w-out' }, bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')),
          h('p', { class: 'w-note' }, '② bits, regrouped in sixes'), h('div', { class: 'w-out', html: groups.map((g, i) => `<span style="background:${['var(--sun-soft)', 'var(--mint-soft)', 'var(--ocean-soft)', 'var(--coral-soft)'][i % 4]};padding:1px 3px;border-radius:4px">${g}</span>`).join(' ') }),
          h('p', { class: 'w-note' }, '③ each six bits → one character (index into A–Z a–z 0–9 + /)'), h('div', { class: 'w-out big', html: groups.map((g, i) => `${parseInt(g, 2)}→<b>${chars[i]}</b>`).join(' &nbsp;') + (padN ? ' &nbsp;+ ' + '='.repeat(padN) : '') }),
          h('p', { class: 'w-note' }, `✅ Result: ${chars.join('') + '='.repeat(padN)} (browser’s btoa says: ${b64(enc(inp.value.slice(0, 9)))})`));
        api.done('Encoded Base64 by hand');
      };
      inp.addEventListener('input', render);
      el.append(field('Text (first 9 bytes shown)', inp), out); render();
    },
  };

  // ------------------------------------------------------------------ 3.3 XOR
  W.xor = {
    title: 'XOR playground', chip: '⊕ Toggle', xp: 15, sub: 'Click bits in the message or key. A key bit of 1 flips the message bit; 0 leaves it alone. XOR again with the same key and you’re back.',
    init(el, api) {
      let m = 0b01001000, k = 0b10110011;
      const box = h('div');
      const row = (label, val, cls, onFlip) => h('div', { class: 'w-row', style: 'gap:4px' }, h('b', { style: 'width:110px;font-family:var(--marker)' }, label), ...Array.from({ length: 8 }, (_, i) => { const bit = (val >> (7 - i)) & 1; return h('span', { class: `bitcell ${cls}${bit ? ' on' : ''}${onFlip ? '' : ' ro'}`, onclick: onFlip ? () => onFlip(7 - i) : null }, bit); }), h('span', { style: 'font-family:var(--mono);margin-left:8px' }, `${val.toString(16).padStart(2, '0')} ${val >= 32 && val < 127 ? '“' + String.fromCharCode(val) + '”' : ''}`));
      const render = () => {
        const c = m ^ k;
        box.innerHTML = '';
        box.append(row('Message', m, '', (i) => { m ^= 1 << i; render(); api.done('Played with XOR'); }), row('⊕ Key', k, 'k', (i) => { k ^= 1 << i; render(); api.done('Played with XOR'); }), h('hr', { style: 'margin:6px 0;max-width:none;height:2px;background:var(--ink)' }), row('= Cipher', c, 'r'), row('⊕ Key again', k, 'k'), row('= Message!', c ^ k, ''));
      };
      render();
      const t1 = h('input', { type: 'text', value: 'ATTACK AT DAWN' }), t2 = h('input', { type: 'text', value: 'RETREAT AT TEN' });
      const two = h('div', { class: 'w-out' });
      const pad = rand(32);
      const runTwo = () => {
        const a = enc(t1.value), b = enc(t2.value);
        const ca = a.map((x, i) => x ^ pad[i % 32]), cb = b.map((x, i) => x ^ pad[i % 32]);
        const x = ca.slice(0, Math.min(ca.length, cb.length)).map((v, i) => v ^ cb[i]);
        const mx = a.slice(0, x.length).map((v, i) => v ^ b[i]);
        two.innerHTML = `C1 = ${hex(ca)}<br>C2 = ${hex(cb)}<br>C1 ⊕ C2 = <b>${hex(x)}</b><br>M1 ⊕ M2 = <b>${hex(mx)}</b> ← identical: the key cancelled out!`;
      };
      t1.addEventListener('input', runTwo); t2.addEventListener('input', runTwo);
      el.append(box, h('p', { class: 'w-note' }, '⚠️ The two-time pad: same random key, two messages'), h('div', { class: 'w-row' }, field('Message 1', t1), field('Message 2', t2)), two);
      runTwo();
    },
  };

  // ------------------------------------------------------------------ 3.4 clock math
  W.clock = {
    title: 'Clock math (modular arithmetic)', chip: '🕐 Wrap around', xp: 15,
    init(el, api) {
      const nI = h('input', { type: 'number', value: 12, min: 2, max: 30 }), aI = h('input', { type: 'number', value: 9 }), bI = h('input', { type: 'number', value: 5 });
      const svgWrap = h('div', { class: 'svg-wrap' }), out = h('div', { class: 'w-out big' }), alias = h('p', { class: 'w-note' });
      const draw = () => {
        const n = Math.max(2, Math.min(30, +nI.value || 12)), a = +aI.value || 0, b = +bI.value || 0, r = (((a + b) % n) + n) % n;
        const S = 240, c = 120, R = 96;
        const svg = h('svg', { viewBox: `0 0 ${S} ${S}`, width: S, height: S, style: 'color:var(--ink)' });
        svg.append(h('circle', { cx: c, cy: c, r: 112, fill: 'var(--ocean-soft)', stroke: 'currentColor', 'stroke-width': 3, style: 'filter:url(#wobble)' }));
        const pt = (i, rr = R) => { const ang = (i / n) * Math.PI * 2 - Math.PI / 2; return [c + Math.cos(ang) * rr, c + Math.sin(ang) * rr]; };
        for (let i = 0; i < n; i++) { const [x, y] = pt(i); const hit = i === r, start = i === ((a % n) + n) % n; svg.append(h('circle', { cx: x, cy: y, r: 13, fill: hit ? 'var(--coral)' : start ? 'var(--sun)' : 'var(--paper-2)', stroke: 'currentColor', 'stroke-width': 2 }), h('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-family': 'Patrick Hand', 'font-size': 14, fill: hit ? '#fff' : 'currentColor' }, i === 0 && n === 12 ? '12' : i)); }
        const [hx, hy] = pt(r, 66);
        svg.append(h('line', { x1: c, y1: c, x2: hx, y2: hy, stroke: 'var(--coral)', 'stroke-width': 5, 'stroke-linecap': 'round' }), h('circle', { cx: c, cy: c, r: 6, fill: 'currentColor' }));
        svgWrap.innerHTML = ''; svgWrap.append(svg);
        out.innerHTML = `${a} + ${b} = ${a + b} ≡ <b style="color:var(--coral-ink)">${r}</b> (mod ${n})`;
        alias.textContent = `If I tell you x mod ${n} = ${r}, x could be ${[0, 1, 2, 3, 4].map((k) => r + k * n).join(', ')}, … You can’t tell which. Wrapping hides information.`;
      };
      [nI, aI, bI].forEach((i) => i.addEventListener('input', () => { draw(); api.done('Did clock math'); }));
      el.append(h('div', { class: 'w-grid2' }, svgWrap, h('div', {}, h('div', { class: 'w-row' }, field('a', aI), field('+ b', bI), field('mod n', nI)), out, alias)));
      draw();
    },
  };

  // ------------------------------------------------------------------ 3.5 modular exponentiation hunt
  W.modexp = {
    title: 'Easy forward, hard backward', chip: '🎯 Find x', xp: 20, sub: 'g = 5, p = 23. Computing 5ˣ mod 23 is instant. But given the answer, can you find x? Click a card to reveal it.',
    init(el, api) {
      const p = 23, g = 5;
      let target, tries;
      const grid = h('div', { class: 'chips' }), status = h('p', { class: 'w-note' }), q = h('div', { class: 'w-out big' });
      const newRound = () => {
        const x = 1 + Math.floor(Math.random() * 21); target = Number(modpow(g, x, p)); tries = 0;
        q.innerHTML = `5<sup>x</sup> mod 23 = <b>${target}</b>. What is x?`; status.textContent = '';
        grid.innerHTML = '';
        for (let i = 1; i <= 22; i++) {
          const b = h('button', { class: 'chip', type: 'button' }, `x=${i}`);
          b.addEventListener('click', () => {
            tries++; const v = Number(modpow(g, i, p)); b.textContent = `x=${i} → ${v}`; b.disabled = true;
            if (v === target) { b.classList.add('on'); status.innerHTML = `🎉 Found it after <b>${tries}</b> tries. With a 617-digit prime there are ~10⁶¹⁷ cards… that’s the discrete logarithm problem.`; api.done('Felt the discrete log'); }
          });
          grid.append(b);
        }
      };
      el.append(q, grid, status, h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: newRound }, '🎲 New puzzle')));
      newRound();
    },
  };

  // ------------------------------------------------------------------ 3.6 multiply vs factor
  W.factor = {
    title: 'Multiplying is easy. Factoring is hard.', chip: '⏱️ Race', xp: 20,
    init(el, api) {
      const sizes = { '2 digits': [10, 99], '4 digits': [1000, 9999], '6 digits': [100000, 999999], '7 digits': [1000000, 9999999] };
      const sel = h('select', {}, Object.keys(sizes).map((k) => h('option', { value: k }, k)));
      sel.value = '6 digits';
      const out = h('div', { class: 'w-out big' }), out2 = h('div', { class: 'w-out' });
      const randPrime = ([lo, hi]) => { for (;;) { let n = lo + Math.floor(Math.random() * (hi - lo)); if (n % 2 === 0) n++; if (isPrime(n)) return n; } };
      let N = 0;
      const mult = () => { const [p, q] = [randPrime(sizes[sel.value]), randPrime(sizes[sel.value])]; const t0 = performance.now(); N = p * q; const t = performance.now() - t0; out.innerHTML = `${fmt(p)} × ${fmt(q)} = <b>${fmt(N)}</b> <small>(${t.toFixed(3)} ms)</small>`; out2.textContent = 'Now pretend you only know the product…'; };
      const fact = async () => {
        if (!N) mult();
        out2.textContent = 'Trial division running…';
        const t0 = performance.now(); let d = 2, tries = 0;
        const lim = Math.sqrt(N);
        while (d <= lim) {
          const end = Math.min(lim, d + 400000);
          for (; d <= end; d++) { tries++; if (N % d === 0) { const t = performance.now() - t0; out2.innerHTML = `Found it: ${fmt(N)} = <b>${fmt(d)} × ${fmt(N / d)}</b> after ${fmt(tries)} divisions (${t.toFixed(0)} ms).<br>A 617-digit RSA modulus would need roughly 10³⁰⁸ divisions this way. Even the best known algorithms would take longer than a human lifetime on every computer on Earth.`; api.done('Raced multiply vs factor'); return; } }
          out2.textContent = `Trial division… ${fmt(tries)} tries`; await new Promise((r) => setTimeout(r, 0));
        }
        out2.textContent = `${fmt(N)} is prime.`;
      };
      el.append(h('div', { class: 'w-row' }, field('Prime size', sel), h('button', { class: 'btn small', type: 'button', onclick: mult }, '✖️ Multiply two random primes'), h('button', { class: 'btn small coral', type: 'button', onclick: fact }, '🔨 Factor it back')), out, out2);
      mult();
    },
  };

  // ------------------------------------------------------------------ 3.8 elliptic curves
  W.ecurve = {
    title: 'Billiards on an elliptic curve', chip: '🎱 Click points', xp: 25, sub: 'Left: the real curve y² = x³ + 7 (Bitcoin’s curve). Click two points P and Q: the line hits the curve once more; flip it over the x-axis to get P + Q. Right: the same curve over “clock math” mod 97, where k × G jumps around with no visible pattern.',
    init(el, api) {
      const Wd = 340, Ht = 300, xmin = -2.6, xmax = 4.2, ymax = 10;
      const X = (x) => ((x - xmin) / (xmax - xmin)) * Wd, Y = (y) => Ht / 2 - (y / ymax) * (Ht / 2);
      const ix = (px) => xmin + (px / Wd) * (xmax - xmin), iy = (py) => ((Ht / 2 - py) / (Ht / 2)) * ymax;
      const f = (x) => x * x * x + 7, x0 = -Math.cbrt(7);
      const svg = h('svg', { viewBox: `0 0 ${Wd} ${Ht}`, width: Wd, height: Ht, style: 'color:var(--ink);cursor:crosshair;background:var(--paper);border:2px solid var(--ink);border-radius:12px;touch-action:none' });
      svg.append(h('line', { x1: 0, y1: Y(0), x2: Wd, y2: Y(0), stroke: 'var(--ink-faint)' }), h('line', { x1: X(0), y1: 0, x2: X(0), y2: Ht, stroke: 'var(--ink-faint)' }));
      let up = '', lo = '';
      for (let x = x0; x <= xmax; x += 0.01) { const y = Math.sqrt(Math.max(0, f(x))); up += `${up ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)} `; lo += `${lo ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(-y).toFixed(1)} `; }
      svg.append(h('path', { d: up, fill: 'none', stroke: 'var(--ocean)', 'stroke-width': 3 }), h('path', { d: lo, fill: 'none', stroke: 'var(--ocean)', 'stroke-width': 3 }));
      const layer = h('g'); svg.append(layer);
      const info = h('div', { class: 'w-out' });
      let pts = [];
      const dot = (x, y, color, label) => { layer.append(h('circle', { cx: X(x), cy: Y(y), r: 7, fill: color, stroke: 'currentColor', 'stroke-width': 2 }), h('text', { x: X(x) + 10, y: Y(y) - 8, 'font-family': 'Caveat', 'font-size': 20, 'font-weight': 700, fill: 'currentColor' }, label)); };
      svg.addEventListener('pointerdown', (e) => {
        const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * Wd, py = ((e.clientY - r.top) / r.height) * Ht;
        let x = Math.max(x0 + 0.001, ix(px)); const y = Math.sqrt(f(x)) * (iy(py) >= 0 ? 1 : -1);
        if (pts.length >= 2) { pts = []; layer.innerHTML = ''; }
        pts.push([x, y]); dot(x, y, pts.length === 1 ? 'var(--sun)' : 'var(--coral)', pts.length === 1 ? 'P' : 'Q');
        if (pts.length === 2) {
          let [[x1, y1], [x2, y2]] = pts;
          const same = Math.abs(x1 - x2) < 0.03 && Math.sign(y1) === Math.sign(y2);
          if (Math.abs(x1 - x2) < 0.03 && !same) { info.textContent = 'P and Q are mirror images: the line is vertical and the sum is the “point at infinity” (the zero of the curve).'; return; }
          const lam = same ? (3 * x1 * x1) / (2 * y1) : (y2 - y1) / (x2 - x1);
          const x3 = lam * lam - x1 - x2, y3 = lam * (x1 - x3) - y1;
          const xa = Math.min(x1, x2, x3) - .5, xb = Math.max(x1, x2, x3) + .5;
          layer.prepend(h('line', { x1: X(xa), y1: Y(y1 + lam * (xa - x1)), x2: X(xb), y2: Y(y1 + lam * (xb - x1)), stroke: 'var(--grape)', 'stroke-width': 2, 'stroke-dasharray': '6 5' }), h('line', { x1: X(x3), y1: Y(-y3), x2: X(x3), y2: Y(y3), stroke: 'var(--coral)', 'stroke-width': 2, 'stroke-dasharray': '3 4' }));
          dot(x3, -y3, 'var(--paper-2)', ''); dot(x3, y3, 'var(--mint)', 'P+Q');
          info.innerHTML = `P = (${x1.toFixed(2)}, ${y1.toFixed(2)}) &nbsp; Q = (${x2.toFixed(2)}, ${y2.toFixed(2)})<br>slope λ = ${lam.toFixed(3)} → <b>P + Q = (${x3.toFixed(2)}, ${y3.toFixed(2)})</b>${same ? ' (doubling: tangent line)' : ''}`;
          api.done('Added points on a curve');
        }
      });
      // finite field version
      const p = 97, pts97 = [];
      for (let x = 0; x < p; x++) for (let y = 0; y < p; y++) if ((y * y) % p === (x * x * x + 7) % p) pts97.push([x, y]);
      const inv = (a) => Number(CS.modinv(((a % p) + p) % p, p));
      const add = (P, Q) => { if (!P) return Q; if (!Q) return P; const [x1, y1] = P, [x2, y2] = Q; if (x1 === x2 && (y1 + y2) % p === 0) return null; const l = x1 === x2 ? (3 * x1 * x1 * inv(2 * y1)) % p : (((y2 - y1 + p) % p) * inv(x2 - x1)) % p; const x3 = (((l * l - x1 - x2) % p) + 2 * p) % p; return [x3, (((l * (x1 - x3) - y1) % p) + 2 * p) % p]; };
      const G = pts97.find(([x, y]) => x === 1) || pts97[0];
      const mults = []; let Pk = null; for (let k = 1; k <= 120; k++) { Pk = add(Pk, G); mults.push(Pk); if (!Pk) break; }
      const S2 = 300, sc = S2 / p;
      const svg2 = h('svg', { viewBox: `0 0 ${S2} ${S2}`, width: S2, height: S2, style: 'background:var(--paper);border:2px solid var(--ink);border-radius:12px' });
      pts97.forEach(([x, y]) => svg2.append(h('circle', { cx: x * sc + 2, cy: S2 - y * sc - 2, r: 2.6, fill: 'var(--ocean)' })));
      const trail = h('g'); svg2.append(trail);
      const k = h('input', { type: 'range', min: 1, max: mults.filter(Boolean).length, value: 1 });
      const kOut = h('div', { class: 'w-out' });
      const showK = () => { trail.innerHTML = ''; const n = +k.value; for (let i = Math.max(0, n - 6); i < n; i++) { const q = mults[i]; if (!q) continue; trail.append(h('circle', { cx: q[0] * sc + 2, cy: S2 - q[1] * sc - 2, r: i === n - 1 ? 8 : 4, fill: i === n - 1 ? 'var(--coral)' : 'var(--sun)', stroke: 'var(--ink)', 'stroke-width': 1.5 })); } const q = mults[n - 1]; kOut.innerHTML = `G = (${G[0]}, ${G[1]}) · <b>${n} × G = (${q[0]}, ${q[1]})</b><br>${pts97.length} points on this curve. Private key = k, public key = k × G. Given only the dot, find k? That’s the elliptic-curve discrete log problem.`; };
      k.addEventListener('input', () => { showK(); api.done('Bounced around the curve'); });
      el.append(h('div', { class: 'w-grid2' }, h('div', {}, h('div', { class: 'svg-wrap' }, svg), info), h('div', {}, h('div', { class: 'svg-wrap' }, svg2), field('k (number of bounces)', k), kOut)));
      info.textContent = 'Click the curve to place P, then Q.'; showK();
    },
  };

  // ------------------------------------------------------------------ 3.9 key size brute force
  W.keysize = {
    title: 'How long to try every key?', chip: '⏳ Slide', xp: 15, sub: 'Attacker speed: one trillion (10¹²) keys per second. Every extra bit doubles the work.',
    init(el, api) {
      const s = h('input', { type: 'range', min: 8, max: 256, value: 56 });
      const out = h('div', { class: 'w-out big' }), cmp = h('p', { class: 'w-note' }), meter = h('div', { class: 'meter' }, h('i'));
      const pretty = (log10) => (log10 < 15 ? fmt(Math.round(10 ** log10)) : `${(10 ** (log10 % 1)).toFixed(1)} × 10${String(Math.floor(log10)).replace(/./g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`);
      const run = () => {
        const n = +s.value, lk = n * Math.log10(2), ls = lk - 12;
        const units = [[0, 'seconds'], [Math.log10(60), 'minutes'], [Math.log10(3600), 'hours'], [Math.log10(86400), 'days'], [Math.log10(3.156e7), 'years']];
        let u = units[0]; for (const x of units) if (ls >= x[0]) u = x;
        out.innerHTML = `<b>${n}-bit</b> key → ${pretty(lk)} keys → <b>${ls < 0 ? 'instantly' : pretty(ls - u[0]) + ' ' + u[1]}</b>`;
        const ageU = Math.log10(1.4e10 * 3.156e7);
        cmp.textContent = n <= 40 ? '😬 About a second or less. Toy security.' : n <= 64 ? '⚠️ Feasible for a determined attacker (DES fell in 56 hours in 1998).' : ls < ageU ? '🤔 Very slow, but not cosmic.' : `🌌 That is about ${pretty(ls - ageU)} times the age of the universe (14 billion years).`;
        meter.firstChild.style.width = Math.min(100, (n / 256) * 100) + '%';
        meter.firstChild.style.background = n < 64 ? 'var(--coral)' : n < 112 ? 'var(--sun)' : 'var(--mint)';
        if (n >= 128) api.done('Reached 128-bit security');
      };
      s.addEventListener('input', run);
      el.append(field('Key size in bits', s), meter, out, cmp, h('div', { class: 'chips' }, [40, 56, 64, 80, 128, 256].map((v) => h('button', { class: 'chip', type: 'button', onclick: () => { s.value = v; run(); } }, v + ' bits'))));
      run();
    },
  };

  // ------------------------------------------------------------------ 3.10 key growth chart
  W.keygrowth = {
    title: 'Same strength, very different key sizes', chip: '📊 Compare', xp: 10,
    init(el, api) {
      const lv = [[80, 80, 1024, 160], [112, 112, 2048, 224], [128, 128, 3072, 256], [192, 192, 7680, 384], [256, 256, 15360, 512]];
      const max = 15360;
      const wrap = h('div', { style: 'display:grid;gap:10px' });
      lv.forEach(([sec, sym, rsa, ecc]) => wrap.append(h('div', {}, h('b', { style: 'font-family:var(--marker)' }, `${sec}-bit security`),
        ...[['AES', sym, 'var(--mint)'], ['ECC', ecc, 'var(--ocean)'], ['RSA', rsa, 'var(--coral)']].map(([n, v, c]) => h('div', { style: 'display:flex;align-items:center;gap:8px;font-size:.85rem' }, h('span', { style: 'width:36px' }, n), h('span', { style: `height:14px;border:2px solid var(--ink);border-radius:4px;background:${c};width:${Math.max(1, (v / max) * 100)}%;transition:width .5s` }), h('span', { style: 'font-family:var(--mono)' }, fmt(v) + ' bits'))))));
      el.append(wrap, h('p', { class: 'w-note' }, 'RSA keys balloon; elliptic-curve keys grow gently. That is why the world moved to ECC.'));
      el.addEventListener('mouseenter', () => api.done('Compared key sizes'), { once: true });
      el.addEventListener('touchstart', () => api.done('Compared key sizes'), { once: true, passive: true });
    },
  };

  // ------------------------------------------------------------------ 4.2 are you random?
  W.humanrng = {
    title: 'Are YOU random? (Spoiler: no)', chip: '🧠 Mind game', xp: 25, sub: 'Click Heads or Tails 40 times, as randomly as you can. A tiny predictor watches your last 3 choices and guesses your next one. Above 50% means it sees your patterns.',
    init(el, api) {
      let seq = [], hits = 0, preds = 0; const model = {};
      const ctx = () => seq.slice(-3).join('');
      const predict = () => { const m = model[ctx()] || { H: 0, T: 0 }; return m.H === m.T ? (Math.random() < .5 ? 'H' : 'T') : m.H > m.T ? 'H' : 'T'; };
      const learn = (c, x) => { (model[c] ||= { H: 0, T: 0 })[x]++; };
      const out = h('div', { class: 'w-out big' }), hist = h('div', { class: 'w-out', style: 'letter-spacing:2px' });
      const flip = (x) => { const p = predict(); if (seq.length >= 3) { preds++; if (p === x) hits++; } learn(ctx(), x); seq.push(x); render(); if (seq.length >= 40) api.done('Tested your own randomness'); };
      const render = () => { const pct = preds ? (100 * hits) / preds : 0; hist.textContent = seq.join(' ') || '…'; out.innerHTML = `${seq.length}/40 flips · predictor right <b>${hits}/${preds}</b> = <b style="color:${pct > 55 ? 'var(--coral-ink)' : 'var(--mint-ink)'}">${pct.toFixed(0)}%</b> ${seq.length >= 40 ? (pct > 55 ? '🤖 It read your mind! Humans make terrible random number generators.' : '🎲 Impressive! But try again… patterns usually show.') : ''}`; };
      const reset = () => { seq = []; hits = preds = 0; for (const k in model) delete model[k]; render(); };
      const auto = () => { reset(); const r = rand(40); for (const b of r) flip(b & 1 ? 'H' : 'T'); };
      el.append(h('div', { class: 'w-row' }, h('button', { class: 'btn big', type: 'button', onclick: () => flip('H') }, '🙂 Heads'), h('button', { class: 'btn big ocean', type: 'button', onclick: () => flip('T') }, '🦅 Tails'), h('button', { class: 'btn small ghost', type: 'button', onclick: reset }, '↺'), h('button', { class: 'btn small grape', type: 'button', onclick: auto }, '🎲 Let the CSPRNG play')), out, hist);
      render();
    },
  };

  // ------------------------------------------------------------------ 4.2 lava lamps
  W.lava = {
    title: 'A wall of lava lamps', chip: '🌋 Entropy', xp: 10, sub: 'Cloudflare photographs ~100 lava lamps and mixes the chaos into its random number generators. Snap a “photo” of these blobs and hash it.',
    init(el, api) {
      const n = 8, svg = h('svg', { viewBox: '0 0 400 170', style: 'width:100%;max-width:520px;color:var(--ink)' });
      const cols = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#8338ec', '#fb8500', '#ff8fab', '#7ee8c6'];
      const blobs = [];
      for (let i = 0; i < n; i++) {
        const x = 20 + i * 48;
        svg.append(h('path', { d: `M${x + 6} 30 L${x + 30} 30 L${x + 36} 130 L${x} 130 Z`, fill: 'var(--paper)', stroke: 'currentColor', 'stroke-width': 2.5 }), h('rect', { x: x - 2, y: 130, width: 40, height: 24, rx: 4, fill: 'var(--ink-soft)' }), h('rect', { x: x + 8, y: 18, width: 20, height: 14, rx: 3, fill: 'var(--ink-soft)' }));
        for (let j = 0; j < 2; j++) { const c = h('ellipse', { cx: x + 18, cy: 80, rx: 8 + j * 3, ry: 10, fill: cols[(i + j * 3) % 8], opacity: .9 }); svg.append(c); blobs.push({ c, x: x + 18, ph: Math.random() * 6, sp: .5 + Math.random() }); }
      }
      let t = 0, raf;
      const anim = () => { t += .016; for (const b of blobs) { const y = 80 + Math.sin(t * b.sp + b.ph) * 36; b.c.setAttribute('cy', y.toFixed(2)); b.c.setAttribute('ry', (10 + Math.sin(t * 2 * b.sp + b.ph) * 4).toFixed(2)); } raf = requestAnimationFrame(anim); };
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) anim();
      const out = h('div', { class: 'w-out' });
      el.append(h('div', { class: 'svg-wrap' }, svg), h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: async () => {
        const snap = blobs.map((b) => b.c.getAttribute('cy') + ',' + b.c.getAttribute('ry')).join(';') + '|' + performance.now();
        out.innerHTML = `📸 snapshot: <small>${snap.slice(0, 70)}…</small><br>SHA-256 → <b>${hex(await sha('SHA-256', snap))}</b>`;
        api.done('Harvested lava-lamp entropy');
      } }, '📸 Snap & hash')), out);
    },
  };

  // ------------------------------------------------------------------ 4.3 CSPRNG
  W.csprng = {
    title: 'Your browser’s CSPRNG', chip: '🎲 Generate', xp: 10, sub: '<code>crypto.getRandomValues()</code> is the browser version of <code>openssl rand</code> and Python’s <code>secrets</code>.',
    init(el, api) {
      const out = h('div', { class: 'w-out big' }), grid = h('div', { class: 'grid-cells', style: 'grid-template-columns:repeat(32,1fr);max-width:520px;margin-top:10px' });
      const show = (label, val) => { out.innerHTML = `<small>${label}</small><br><b>${val}</b>`; api.done('Generated secure randomness'); };
      const bitsGrid = (bytes) => { grid.innerHTML = ''; for (const b of bytes) for (let i = 7; i >= 0; i--) grid.append(h('i', { class: 'cell', style: `background:${(b >> i) & 1 ? 'var(--grape)' : 'var(--paper)'}` })); };
      el.append(h('div', { class: 'chips' },
        h('button', { class: 'btn small', type: 'button', onclick: () => { const r = rand(32); bitsGrid(r); show('openssl rand -hex 32 · an AES-256 key (64 hex chars)', hex(r)); } }, '🔑 AES-256 key'),
        h('button', { class: 'btn small ocean', type: 'button', onclick: () => { const r = rand(24); bitsGrid(r); show('openssl rand -base64 24 · a strong random password', b64(r)); } }, '🔤 Base64 password'),
        h('button', { class: 'btn small mint', type: 'button', onclick: () => { const r = rand(16); bitsGrid(r); show('secrets.token_urlsafe(16) · a reset-link token', b64(r).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')); } }, '🔗 URL token'),
        h('button', { class: 'btn small coral', type: 'button', onclick: () => show('Math.random() · ❌ NOT for security (predictable PRNG)', Math.random()) }, '🙅 Math.random()')), out, grid);
    },
  };
})();
