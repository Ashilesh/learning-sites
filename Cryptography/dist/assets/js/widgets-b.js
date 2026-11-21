/* Widgets for Chapters 5–8 */
(() => {
  'use strict';
  const { h, $$, enc, dec, hex, b64, rand, sha, hmac, bitDiff, fmt, debounce } = CS;
  const W = window.W;
  const field = (label, input) => h('label', { style: 'display:flex;flex-direction:column;gap:4px;flex:1 1 200px' }, label, input);
  const bytesHtml = (b, cls = () => '') => [...b].map((x, i) => `<span class="hexb ${cls(i)}">${x.toString(16).padStart(2, '0')}</span>`).join(' ');

  // ------------------------------------------------------------------ tiny AES-128 (for visualisation; verified against Web Crypto)
  const SBOX = new Uint8Array(256);
  (() => {
    const rotl = (x, s) => ((x << s) | (x >> (8 - s))) & 0xff;
    let p = 1, q = 1;
    do {
      p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0);
      q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff; if (q & 0x80) q ^= 0x09;
      SBOX[p] = (q ^ rotl(q, 1) ^ rotl(q, 2) ^ rotl(q, 3) ^ rotl(q, 4) ^ 0x63) & 0xff;
    } while (p !== 1);
    SBOX[0] = 0x63;
  })();
  const xt = (a) => ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff;
  function expandKey(key) {
    const w = new Uint8Array(176); w.set(key); let rcon = 1;
    for (let i = 16; i < 176; i += 4) {
      let t = w.slice(i - 4, i);
      if (i % 16 === 0) { t = new Uint8Array([SBOX[t[1]] ^ rcon, SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]]); rcon = xt(rcon); }
      for (let j = 0; j < 4; j++) w[i + j] = w[i - 16 + j] ^ t[j];
    }
    return w;
  }
  const subBytes = (s) => s.map((x) => SBOX[x]);
  const shiftRows = (s) => { const o = new Uint8Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = s[((c + r) % 4) * 4 + r]; return o; };
  const mixColumns = (s) => { const o = new Uint8Array(16); for (let c = 0; c < 4; c++) { const [a0, a1, a2, a3] = s.slice(c * 4, c * 4 + 4); o[c * 4] = xt(a0) ^ xt(a1) ^ a1 ^ a2 ^ a3; o[c * 4 + 1] = a0 ^ xt(a1) ^ xt(a2) ^ a2 ^ a3; o[c * 4 + 2] = a0 ^ a1 ^ xt(a2) ^ xt(a3) ^ a3; o[c * 4 + 3] = xt(a0) ^ a0 ^ a1 ^ a2 ^ xt(a3); } return o; };
  const addKey = (s, w, r) => s.map((x, i) => x ^ w[r * 16 + i]);
  function aesSteps(block, key) {
    const w = expandKey(key); const steps = [];
    let s = addKey(new Uint8Array(block), w, 0); steps.push(['Round 0 · AddRoundKey', s]);
    for (let r = 1; r <= 10; r++) {
      s = subBytes(s); steps.push([`Round ${r} · SubBytes`, s]);
      s = shiftRows(s); steps.push([`Round ${r} · ShiftRows`, s]);
      if (r < 10) { s = mixColumns(s); steps.push([`Round ${r} · MixColumns`, s]); }
      s = addKey(s, w, r); steps.push([`Round ${r} · AddRoundKey`, s]);
    }
    return steps;
  }
  const aesBlock = (block, w) => { let s = addKey(block, w, 0); for (let r = 1; r <= 10; r++) { s = shiftRows(subBytes(s)); if (r < 10) s = mixColumns(s); s = addKey(s, w, r); } return s; };
  window.MiniAES = { expandKey, aesBlock };

  // ------------------------------------------------------------------ 5.2 key count
  W.keycount = {
    title: 'The key-distribution explosion', chip: '🕸️ Slide', xp: 15, sub: 'Every pair of people needs its own shared key: n(n−1)/2.',
    init(el, api) {
      const s = h('input', { type: 'range', min: 2, max: 24, value: 5 });
      const wrap = h('div', { class: 'svg-wrap' }), out = h('div', { class: 'w-out big' });
      const draw = () => {
        const n = +s.value, S = 300, c = 150, R = 118;
        const svg = h('svg', { viewBox: `0 0 ${S} ${S}`, width: S, height: S });
        const pts = Array.from({ length: n }, (_, i) => [c + Math.cos((i / n) * 2 * Math.PI - Math.PI / 2) * R, c + Math.sin((i / n) * 2 * Math.PI - Math.PI / 2) * R]);
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) svg.append(h('line', { x1: pts[i][0], y1: pts[i][1], x2: pts[j][0], y2: pts[j][1], stroke: 'var(--coral)', 'stroke-width': 1.2, opacity: .65 }));
        pts.forEach(([x, y], i) => svg.append(h('circle', { cx: x, cy: y, r: 11, fill: ['var(--sun)', 'var(--mint)', 'var(--ocean)', 'var(--grape)'][i % 4], stroke: 'var(--ink)', 'stroke-width': 2 })));
        wrap.innerHTML = ''; wrap.append(svg);
        out.innerHTML = `${n} people → <b>${fmt((n * (n - 1)) / 2)}</b> keys 🔑 &nbsp;·&nbsp; 1,000 people → 499,500 &nbsp;·&nbsp; 1 billion → ~500 quadrillion`;
        if (n >= 10) api.done('Saw the key explosion');
      };
      s.addEventListener('input', draw);
      el.append(field('People', s), wrap, out, h('p', { class: 'w-note' }, 'The fix (Chapters 9–10): public-key crypto to agree on a key, then symmetric crypto for the data.'));
      draw();
    },
  };

  // ------------------------------------------------------------------ 5.5 AES round-by-round
  W.aesround = {
    title: 'Watch AES scramble 16 bytes, round by round', chip: '🧊 Rubik’s cube', xp: 30, sub: 'A real AES-128 implementation. Step through all 10 rounds, then we check the result against your browser’s built-in AES.',
    init(el, api) {
      const pt = h('input', { type: 'text', value: 'Hello, Bob! Hi!!', maxlength: 16 });
      const kt = h('input', { type: 'text', value: '000102030405060708090a0b0c0d0e0f', style: 'font-family:var(--mono)' });
      const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(4,52px);gap:5px;justify-content:center;margin:10px 0' });
      const label = h('p', { class: 'w-note', style: 'text-align:center' }), verify = h('div', { class: 'w-out' });
      const slider = h('input', { type: 'range', min: 0, max: 40, value: 0 });
      let steps = [], prev = null;
      const block = () => { const b = new Uint8Array(16); b.set(enc(pt.value).slice(0, 16)); return b; };
      const key = () => { const k = CS.fromHex(kt.value); const o = new Uint8Array(16); o.set(k.slice(0, 16)); return o; };
      const show = (i) => {
        const [name, s] = i === 0 ? ['Input block (plaintext bytes in a 4×4 grid, column by column)', block()] : steps[i - 1];
        grid.innerHTML = '';
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = s[c * 4 + r]; const changed = prev && prev[c * 4 + r] !== v; grid.append(h('span', { class: changed ? 'pop' : '', style: `display:grid;place-items:center;height:44px;border:2px solid var(--ink);border-radius:8px;font:700 1rem var(--mono);background:hsl(${v * 1.4},70%,${CS.isDark() ? 30 : 82}%)` }, v.toString(16).padStart(2, '0'))); }
        label.innerHTML = `<b>${name}</b> · step ${i}/${steps.length}`; prev = s;
      };
      const recompute = async () => {
        steps = aesSteps(block(), key()); slider.max = steps.length; prev = null; show(+slider.value);
        const ours = steps[steps.length - 1][1];
        try {
          const k = await crypto.subtle.importKey('raw', key(), 'AES-CBC', false, ['encrypt']);
          const theirs = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, k, block())).slice(0, 16);
          const ok = hex(ours) === hex(theirs);
          verify.innerHTML = `Our ciphertext: <b>${hex(ours)}</b><br>Web Crypto AES: <b>${hex(theirs)}</b> ${ok ? '<span class="w-good">✅ identical</span>' : '<span class="w-bad">mismatch</span>'}`;
        } catch (e) { verify.textContent = 'Ciphertext: ' + hex(ours); }
      };
      slider.addEventListener('input', () => { show(+slider.value); if (+slider.value === +slider.max) api.done('Ran all 10 AES rounds'); });
      [pt, kt].forEach((i) => i.addEventListener('input', debounce(recompute, 150)));
      const avalanche = h('div', { class: 'w-out' });
      el.append(h('div', { class: 'w-row' }, field('Plaintext (16 bytes)', pt), field('Key (hex, 16 bytes)', kt)), grid, label, field('Step through the rounds', slider),
        h('div', { class: 'chips' }, h('button', { class: 'btn small', type: 'button', onclick: () => { slider.value = Math.min(+slider.max, +slider.value + 1); slider.dispatchEvent(new Event('input')); } }, 'Next step ▶'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => { slider.value = slider.max; slider.dispatchEvent(new Event('input')); } }, 'Jump to the end ⏭'),
          h('button', { class: 'btn small grape', type: 'button', onclick: () => {
            const b = block(); const b2 = b.slice(); b2[0] ^= 1; const w = expandKey(key());
            const c1 = aesBlock(b, w), c2 = aesBlock(b2, w); const d = bitDiff(c1, c2);
            avalanche.innerHTML = `Flip 1 input bit → ${bytesHtml(c1)}<br>vs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${bytesHtml(c2, (i) => (c1[i] !== c2[i] ? 'diff' : ''))}<br><b>${d} of 128</b> output bits changed (~half). Diffusion!`;
          } }, '🌊 Avalanche: flip one bit')), verify, avalanche);
      recompute();
    },
  };

  // ------------------------------------------------------------------ 5.6 ECB picture leak
  W.ecbimage = {
    title: 'The ECB picture leak, with real AES', chip: '🖼️ See it', xp: 25, sub: 'A 128×128 doodle (1 byte per pixel) is encrypted with AES-128. In ECB mode, identical 16-pixel runs give identical ciphertext… and the picture survives.',
    init(el, api) {
      const N = 128, img = new Uint8Array(N * N);
      const pal = { 0: 40, 1: 200, 2: 120, 3: 250 };
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let v = 0; const dx = x - 64, dy = y - 66;
        if (dx * dx + dy * dy < 50 * 50) v = 1;
        if ((x - 44) ** 2 + (y - 50) ** 2 < 81 || (x - 84) ** 2 + (y - 50) ** 2 < 81) v = 2;
        if (dx * dx + (dy - 8) ** 2 < 30 * 30 && dx * dx + (dy - 8) ** 2 > 20 * 20 && dy > 12) v = 2;
        if (y < 10 || y > 117) v = 3;
        img[y * N + x] = pal[v];
      }
      const canv = (title) => { const c = h('canvas', { width: N, height: N, style: 'width:100%;max-width:200px;image-rendering:pixelated;border:2px solid var(--ink);border-radius:8px;display:block;margin:auto' }); return [c, h('div', { class: 'w-box', style: 'text-align:center' }, h('h5', {}, title), c)]; };
      const paint = (c, bytes, color) => { const ctx = c.getContext('2d'); const id = ctx.createImageData(N, N); for (let i = 0; i < N * N; i++) { const b = bytes[i]; const [r, g, bl] = color(b); id.data.set([r, g, bl, 255], i * 4); } ctx.putImageData(id, 0, 0); };
      const plainCol = (b) => (b === 40 ? [17, 138, 178] : b === 200 ? [255, 209, 102] : b === 120 ? [43, 45, 66] : [6, 214, 160]);
      const hsl = (b) => { const hh = (b / 255) * 360, s = .75, l = .55; const k = (n) => (n + hh / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
      const [c1, b1] = canv('Original'), [c2, b2] = canv('AES-ECB ❌'), [c3, b3] = canv('AES-CTR ✅');
      paint(c1, img, plainCol);
      const out = h('p', { class: 'w-note' });
      const go = async () => {
        const key = rand(16), w = expandKey(key), ecb = new Uint8Array(img.length);
        for (let i = 0; i < img.length; i += 16) ecb.set(aesBlock(img.slice(i, i + 16), w), i);
        paint(c2, ecb, hsl);
        const k = await crypto.subtle.importKey('raw', key, 'AES-CTR', false, ['encrypt']);
        const ctr = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CTR', counter: rand(16), length: 64 }, k, img));
        paint(c3, ctr, hsl);
        const uniq = new Set(); for (let i = 0; i < ecb.length; i += 16) uniq.add(hex(ecb.slice(i, i + 16)));
        out.innerHTML = `Fresh random key: <code>${hex(key)}</code>. ECB produced only <b>${uniq.size}</b> distinct ciphertext blocks out of ${img.length / 16}, so the shape shows through. CTR’s output looks like noise.`;
        api.done('Saw ECB leak a picture'); api.achieve('penguin');
      };
      el.append(h('div', { class: 'w-grid3' }, b1, b2, b3), h('div', { class: 'w-row' }, h('button', { class: 'btn', type: 'button', onclick: go }, '🔐 Encrypt with a new random key')), out);
      go();
    },
  };

  // ------------------------------------------------------------------ 5.6 PKCS#7 padding
  W.padding = {
    title: 'PKCS#7 padding visualizer', chip: '🧱 Blocks', xp: 10,
    init(el, api) {
      const inp = h('input', { type: 'text', value: 'HELLO WORLD' }), out = h('div');
      const run = () => {
        const b = enc(inp.value); const n = 16 - (b.length % 16); const all = new Uint8Array(b.length + n); all.set(b); all.fill(n, b.length);
        out.innerHTML = '';
        for (let i = 0; i < all.length; i += 16) out.append(h('div', { class: 'w-out', style: 'margin:6px 0', html: `<small>block ${i / 16 + 1}</small> ` + [...all.slice(i, i + 16)].map((x, j) => `<span class="hexb" style="${i + j >= b.length ? 'background:var(--coral);color:#fff' : ''}">${x.toString(16).padStart(2, '0')}</span>`).join(' ') }));
        out.append(h('p', { class: 'w-note' }, `${b.length} bytes → needs ${n} more → add ${n} bytes of value 0x${n.toString(16).padStart(2, '0')}. ${n === 16 ? 'Exactly a multiple of 16? A whole extra block of 0x10 is added, so padding is always removable.' : ''}`));
        api.done('Padded a message');
      };
      inp.addEventListener('input', run); el.append(field('Message', inp), out); run();
    },
  };

  // ------------------------------------------------------------------ 5.7 malleability
  W.malleable = {
    title: 'Mallory turns $100 into $900 without the key', chip: '😈 Attack', xp: 25, sub: 'Real AES-128-CTR in your browser. Mallory can’t read the bytes, but she knows the message format.',
    async init(el, api) {
      const key = await crypto.subtle.importKey('raw', rand(16), 'AES-CTR', false, ['encrypt', 'decrypt']);
      const counter = rand(16);
      const P = 'PAY BOB $100';
      let ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CTR', counter, length: 64 }, key, enc(P)));
      const orig = ct.slice();
      const ctOut = h('div', { class: 'w-out big' }), bob = h('div', { class: 'w-out big' });
      const amount = h('input', { type: 'text', value: '900', maxlength: 3, style: 'max-width:100px;font-family:var(--mono)' });
      const render = async () => {
        ctOut.innerHTML = bytesHtml(ct, (i) => (ct[i] !== orig[i] ? 'diff' : ''));
        const pt = dec(await crypto.subtle.decrypt({ name: 'AES-CTR', counter, length: 64 }, key, ct));
        bob.innerHTML = `🏦 Bob decrypts: <b>${pt}</b> ${pt !== P ? '<span class="w-bad">← no error, no warning!</span>' : ''}`;
      };
      el.append(h('p', { class: 'w-note' }, 'Ciphertext on the wire (positions 9–11 hold the amount):'), ctOut,
        h('div', { class: 'w-row' }, field('Mallory wants the amount to be', amount), h('button', { class: 'btn coral', type: 'button', onclick: async () => {
          const want = (amount.value + '000').slice(0, 3);
          for (let i = 0; i < 3; i++) ct[9 + i] = orig[9 + i] ^ P.charCodeAt(9 + i) ^ want.charCodeAt(i);
          await render(); api.done('Flipped ciphertext bits like Mallory');
        } }, '😈 Flip the bits: c ⊕ “1” ⊕ “9”'), h('button', { class: 'btn small ghost', type: 'button', onclick: async () => { ct = orig.slice(); await render(); } }, '↺')), bob,
        h('p', { class: 'w-note' }, 'This is malleability. The cure: authenticated encryption (next section).'));
      render();
    },
  };

  // ------------------------------------------------------------------ 5.8 AEAD tamper detection
  W.aead = {
    title: 'AES-256-GCM: tamper detection', chip: '🚨 Catch Mallory', xp: 30, sub: 'Encrypt for real, then let Mallory flip one bit anywhere. GCM refuses to decrypt.',
    async init(el, api) {
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const pt = h('input', { type: 'text', value: 'Meet me at 5pm' }), ad = h('input', { type: 'text', value: 'to:bob' });
      const out = h('div', { class: 'w-out' }), res = h('div', { class: 'w-out big' });
      let st = null;
      const doEnc = async () => {
        const iv = rand(12);
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc(ad.value) }, key, enc(pt.value)));
        st = { iv, ct, ad: ad.value, orig: ct.slice() }; show(); res.innerHTML = 'Encrypted. Now tamper, or decrypt as Bob.';
      };
      const show = () => {
        const n = st.ct.length - 16;
        out.innerHTML = `nonce (12 B): <b>${hex(st.iv)}</b><br>ciphertext (${n} B): <b>${bytesHtml(st.ct.slice(0, n), (i) => (st.ct[i] !== st.orig[i] ? 'diff' : ''))}</b><br>tag (16 B): <b style="color:var(--grape-ink)">${bytesHtml(st.ct.slice(n), (i) => (st.ct[n + i] !== st.orig[n + i] ? 'diff' : ''))}</b><br>associated data: <b>${st.ad}</b> · total sent: ${12 + st.ct.length} bytes`;
      };
      const decrypt = async () => {
        try {
          const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: st.iv, additionalData: enc(st.ad) }, key, st.ct);
          res.innerHTML = `✅ Bob decrypts: <b>${dec(p)}</b>`;
        } catch (e) { res.innerHTML = '🚨 <span class="w-bad">Decryption FAILED: InvalidTag. Tampering detected, no output released.</span>'; api.done('Caught tampering with AES-GCM'); api.achieve('tamper'); }
      };
      const nr = h('div', { class: 'w-out' });
      el.append(h('div', { class: 'w-row' }, field('Plaintext (secret)', pt), field('Associated data (visible, protected)', ad), h('button', { class: 'btn', type: 'button', onclick: doEnc }, '🔐 Encrypt')), out,
        h('div', { class: 'chips', style: 'margin:10px 0' },
          h('button', { class: 'btn small coral', type: 'button', onclick: () => { st.ct[0] ^= 1; show(); res.textContent = 'Mallory flipped 1 bit of the ciphertext…'; } }, '😈 Flip a ciphertext bit'),
          h('button', { class: 'btn small coral', type: 'button', onclick: () => { st.ct[st.ct.length - 1] ^= 0x80; show(); res.textContent = 'Mallory changed the tag…'; } }, '😈 Change the tag'),
          h('button', { class: 'btn small coral', type: 'button', onclick: () => { st.ad = st.ad.replace('bob', 'eve') + (st.ad.includes('bob') ? '' : '!'); show(); res.textContent = 'Mallory rewrote the visible header…'; } }, '😈 Edit the header'),
          h('button', { class: 'btn small mint', type: 'button', onclick: decrypt }, '🔓 Bob decrypts')), res,
        h('p', { class: 'w-note' }, '⚠️ Bonus: what nonce reuse does'), h('div', { class: 'w-row' }, h('button', { class: 'btn small grape', type: 'button', onclick: async () => {
          const iv = rand(12), m1 = enc('ATTACK AT DAWN!'), m2 = enc('RETREAT AT TEN!');
          const c1 = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, m1)), c2 = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, m2));
          const x = c1.slice(0, 15).map((v, i) => v ^ c2[i]), mx = m1.map((v, i) => v ^ m2[i]);
          nr.innerHTML = `Same key + same nonce twice:<br>C1 ⊕ C2 = <b>${hex(x)}</b><br>M1 ⊕ M2 = <b>${hex(mx)}</b> ← equal. The keystream cancelled out (and GCM’s authentication key leaks too).`;
        } }, '♻️ Reuse a nonce')), nr);
      doEnc();
    },
  };

  // ------------------------------------------------------------------ 6.2 avalanche
  W.avalanche = {
    title: 'The avalanche effect, live', chip: '🌊 Live hash', xp: 20, sub: 'Change one character. About half of the output bits flip.',
    init(el, api) {
      const a = h('input', { type: 'text', value: 'hello' }), b = h('input', { type: 'text', value: 'Hello' });
      const alg = h('select', {}, ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512'].map((x) => h('option', {}, x)));
      const o = h('div', { class: 'w-out' }), grid = h('div', { class: 'grid-cells', style: 'grid-template-columns:repeat(32,1fr);max-width:560px;margin-top:8px' }), stat = h('p', { class: 'w-note' });
      const run = debounce(async () => {
        const [ha, hb] = await Promise.all([sha(alg.value, a.value), sha(alg.value, b.value)]);
        const xa = hex(ha), xb = hex(hb);
        o.innerHTML = `${a.value || '∅'} → <b>${xa}</b><br>${b.value || '∅'} → <b>${[...xb].map((c, i) => (c !== xa[i] ? `<span class="hexb diff">${c}</span>` : c)).join('')}</b>`;
        grid.innerHTML = ''; const bits = Math.min(256, ha.length * 8);
        for (let i = 0; i < bits; i++) { const d = ((ha[i >> 3] ^ hb[i >> 3]) >> (7 - (i & 7))) & 1; grid.append(h('i', { class: 'cell', style: `background:${d ? 'var(--coral)' : 'var(--paper)'}` })); }
        const d = bitDiff(ha, hb);
        stat.textContent = `${d} of ${ha.length * 8} bits differ (${((100 * d) / (ha.length * 8)).toFixed(0)}%). ${a.value === 'hello' && alg.value === 'SHA-256' ? 'Matches the guide: hello → 2cf24dba…' : ''}`;
        if (a.value !== b.value) api.done('Saw the avalanche effect');
      }, 120);
      [a, b, alg].forEach((x) => x.addEventListener('input', run));
      el.append(h('div', { class: 'w-row' }, field('Input A', a), field('Input B', b), field('Algorithm', alg)), o, grid, stat,
        h('div', { class: 'chips' }, [['hello', 'hello!'], ['hello', 'hello\n'], ['Transfer $100', 'Transfer $900']].map(([x, y]) => h('button', { class: 'chip', type: 'button', onclick: () => { a.value = x; b.value = y; run(); } }, `${x.replace('\n', '⏎')} vs ${y.replace('\n', '⏎')}`))));
      run();
    },
  };

  // ------------------------------------------------------------------ 6.4 birthday paradox
  W.birthday = {
    title: 'The birthday paradox', chip: '🎂 Simulate', xp: 20,
    init(el, api) {
      const s = h('input', { type: 'range', min: 2, max: 80, value: 23 });
      const prob = (n) => { let p = 1; for (let i = 0; i < n; i++) p *= (365 - i) / 365; return 1 - p; };
      const svg = h('svg', { viewBox: '0 0 400 170', style: 'width:100%;max-width:520px' });
      const out = h('div', { class: 'w-out big' }), cal = h('div', { class: 'grid-cells', style: 'grid-template-columns:repeat(31,1fr);max-width:520px;margin-top:10px' }), simOut = h('p', { class: 'w-note' });
      let d = ''; for (let n = 1; n <= 80; n++) d += `${n === 1 ? 'M' : 'L'}${(n / 80) * 390 + 5} ${160 - prob(n) * 150}`;
      svg.append(h('path', { d, fill: 'none', stroke: 'var(--grape)', 'stroke-width': 3 }), h('line', { x1: 5, y1: 85, x2: 395, y2: 85, stroke: 'var(--ink-faint)', 'stroke-dasharray': '4 4' }), h('text', { x: 8, y: 80, 'font-family': 'Patrick Hand', 'font-size': 13, fill: 'var(--ink-soft)' }, '50%'));
      const mark = h('circle', { r: 7, fill: 'var(--coral)', stroke: 'var(--ink)', 'stroke-width': 2 }); svg.append(mark);
      const run = () => { const n = +s.value, p = prob(n); mark.setAttribute('cx', (n / 80) * 390 + 5); mark.setAttribute('cy', 160 - p * 150); out.innerHTML = `${n} people → ${fmt((n * (n - 1)) / 2)} pairs → <b>${(p * 100).toFixed(1)}%</b> chance two share a birthday`; };
      const sim = () => {
        const n = +s.value, days = new Uint16Array(365); const r = new Uint32Array(n); crypto.getRandomValues(r); r.forEach((x) => days[x % 365]++);
        cal.innerHTML = ''; let hits = 0; days.forEach((c) => { if (c > 1) hits++; cal.append(h('i', { class: 'cell', title: c ? `${c} birthday(s)` : '', style: `background:${c > 1 ? 'var(--coral)' : c ? 'var(--ocean)' : 'var(--paper)'}` })); });
        simOut.innerHTML = hits ? `🎉 <b>${hits}</b> shared birthday(s) in this random room!` : 'No match this time. Try again!';
        api.done('Simulated the birthday paradox');
      };
      s.addEventListener('input', run);
      el.append(field('People in the room', s), h('div', { class: 'svg-wrap' }, svg), out, h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: sim }, '🎲 Fill a random room')), cal, simOut,
        h('p', { class: 'w-note' }, 'For an n-bit hash, expect a collision after about 2^(n/2) tries. That’s why SHA-256 gives 128-bit collision security.'));
      run();
    },
  };

  // ------------------------------------------------------------------ 6.7 Merkle tree
  W.merkle = {
    title: 'Build a Merkle tree (real SHA-256)', chip: '🌳 Edit a leaf', xp: 20, sub: 'Edit any data block: watch the change ripple up to the root. Then ask for a proof that C is included.',
    init(el, api) {
      const leaves = ['data A', 'data B', 'data C', 'data D'].map((v) => h('input', { type: 'text', value: v, style: 'width:100%' }));
      const svg = h('svg', { viewBox: '0 0 520 250', style: 'width:100%;max-width:620px' });
      let prev = {}, proof = false;
      const box = (x, y, label, val, changed, inProof) => { svg.append(h('rect', { x: x - 58, y: y - 20, width: 116, height: 40, rx: 10, fill: inProof ? 'var(--sun)' : changed ? 'var(--coral-soft)' : 'var(--paper)', stroke: changed ? 'var(--coral)' : 'var(--ink)', 'stroke-width': changed ? 3 : 2 }), h('text', { x, y: y - 3, 'text-anchor': 'middle', 'font-family': 'Patrick Hand', 'font-size': 14, fill: 'var(--ink)' }, label), h('text', { x, y: y + 13, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 11, fill: 'var(--ink-soft)' }, val.slice(0, 12) + '…')); };
      const run = debounce(async () => {
        const H = async (s) => hex(await sha('SHA-256', s));
        const l = await Promise.all(leaves.map((i) => H(i.value)));
        const h12 = await H(l[0] + l[1]), h34 = await H(l[2] + l[3]), root = await H(h12 + h34);
        const cur = { l0: l[0], l1: l[1], l2: l[2], l3: l[3], h12, h34, root };
        svg.innerHTML = '';
        const L = (x1, y1, x2, y2) => svg.append(h('line', { x1, y1, x2, y2, stroke: 'var(--ink-faint)', 'stroke-width': 2 }));
        L(260, 40, 140, 120); L(260, 40, 380, 120); [[140, 70], [140, 200], [380, 320], [380, 450]].forEach(([px, cx]) => L(px, 120, cx, 210));
        const ch = (k) => prev[k] && prev[k] !== cur[k];
        box(260, 34, 'Root', root, ch('root'), false);
        box(140, 120, 'H12 = H(H1+H2)', h12, ch('h12'), proof);
        box(380, 120, 'H34 = H(H3+H4)', h34, ch('h34'), false);
        [['H1 = H(A)', 'l0', 70], ['H2 = H(B)', 'l1', 200], ['H3 = H(C)', 'l2', 320], ['H4 = H(D)', 'l3', 450]].forEach(([t, k, x]) => box(x, 210, t, cur[k], ch(k), proof && k === 'l3'));
        if (Object.keys(prev).length && cur.root !== prev.root) api.done('Changed a Merkle leaf');
        prev = cur;
      }, 120);
      leaves.forEach((i) => i.addEventListener('input', run));
      el.append(h('div', { class: 'w-grid3', style: 'grid-template-columns:repeat(4,1fr)' }, leaves.map((i, k) => field('ABCD'[k], i))), h('div', { class: 'svg-wrap' }, svg),
        h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { proof = !proof; prev = {}; run(); } }, '🧾 Toggle: prove C is included')),
        h('p', { class: 'w-note' }, 'Highlighted in yellow: the only two hashes (H4 and H12) needed to prove C is in the tree. Git, Bitcoin and Certificate Transparency all use this trick.'));
      run();
    },
  };

  // ------------------------------------------------------------------ 7.2 HMAC
  W.hmac = {
    title: 'Hash vs. HMAC: can Mallory fool Bob?', chip: '🧷 Seal it', xp: 25, sub: 'Real SHA-256 and HMAC-SHA256. Mallory changes the message and recomputes whatever she can.',
    init(el, api) {
      const key = h('input', { type: 'text', value: 'shared-secret-between-alice-and-bob' }), msg = h('input', { type: 'text', value: 'Transfer $100 to Bob' });
      const evil = h('input', { type: 'text', value: 'Transfer $9999 to Mallory' });
      const o = h('div', { class: 'w-out' }), r = h('div');
      const run = async () => {
        const [hm, tag] = await Promise.all([sha('SHA-256', msg.value), hmac('SHA-256', key.value, msg.value)]);
        o.innerHTML = `SHA-256(message) = <b>${hex(hm).slice(0, 32)}…</b><br>HMAC(key, message) = <b style="color:var(--grape-ink)">${hex(tag).slice(0, 32)}…</b>`;
      };
      const attack = async () => {
        const hNew = await sha('SHA-256', evil.value);
        const bobHash = hex(await sha('SHA-256', evil.value)) === hex(hNew);
        const fakeTag = await hmac('SHA-256', 'mallory-guess', evil.value);
        const bobTag = await hmac('SHA-256', key.value, evil.value);
        const ok = hex(fakeTag) === hex(bobTag);
        r.innerHTML = '';
        r.append(h('div', { class: 'w-grid2' },
          h('div', { class: 'w-box', style: 'border-color:var(--coral)' }, h('h5', {}, 'Plain hash only'), h('p', { html: `Mallory sends “${evil.value}” + its freshly computed SHA-256.<br>Bob recomputes: ${bobHash ? '<b>match</b>' : 'mismatch'} → <span class="w-bad">😱 FOOLED</span>` })),
          h('div', { class: 'w-box', style: 'border-color:var(--mint)' }, h('h5', {}, 'HMAC'), h('p', { html: `Mallory doesn’t know the key, so her tag is <code>${hex(fakeTag).slice(0, 16)}…</code><br>Bob expects <code>${hex(bobTag).slice(0, 16)}…</code> → ${ok ? 'match?!' : '<span class="w-good">✅ REJECTED</span>'}` }))));
        api.done('Defeated Mallory with HMAC');
      };
      [key, msg].forEach((i) => i.addEventListener('input', debounce(run, 120)));
      const check = h('p', { class: 'w-note' });
      hmac('SHA-256', 'secret', 'hello').then((t) => (check.innerHTML = `Same as the guide’s OpenSSL example: HMAC-SHA256(“secret”, “hello”) = <code>${hex(t)}</code>`));
      el.append(h('div', { class: 'w-row' }, field('Shared key', key), field('Alice’s message', msg)), o, h('div', { class: 'w-row' }, field('Mallory’s replacement', evil), h('button', { class: 'btn coral', type: 'button', onclick: attack }, '😈 Swap the message')), r, check);
      run();
    },
  };

  // ------------------------------------------------------------------ 7.5 timing attack
  W.timing = {
    title: 'A timing attack, byte by byte', chip: '⏱️ Simulate', xp: 25, sub: 'A server checks a secret 6-byte tag with a normal “stop at the first difference” comparison. Each extra matching byte makes it answer a tiny bit slower. The attacker listens.',
    init(el, api) {
      const secret = hex(rand(6)); const ct = h('input', { type: 'checkbox' });
      const bars = h('div', { class: 'bars', style: 'height:120px' }), out = h('div', { class: 'w-out big' }), log = h('p', { class: 'w-note' });
      let running = false;
      const measure = (guess) => { let t = 1; if (ct.checked) t = 13; else for (let i = 0; i < guess.length; i += 2) { if (guess.slice(i, i + 2) !== secret.slice(i, i + 2)) break; t += 2; } return t + Math.random() * .9; };
      const run = async () => {
        if (running) return; running = true;
        let known = '', tries = 0;
        for (let pos = 0; pos < 6; pos++) {
          const times = []; bars.innerHTML = '';
          for (let b = 0; b < 256; b += 17) { }
          const cands = Array.from({ length: 16 }, (_, i) => (i * 16 + (pos * 7 % 16)).toString(16).padStart(2, '0'));
          if (!ct.checked && !cands.includes(secret.slice(pos * 2, pos * 2 + 2))) cands[Math.floor(Math.random() * 16)] = secret.slice(pos * 2, pos * 2 + 2);
          for (const c of cands) { const avg = Array.from({ length: 50 }, () => measure(known + c + '00'.repeat(5 - pos))).reduce((a, b) => a + b) / 50; tries += 50; times.push([c, avg]); }
          const max = Math.max(...times.map((t) => t[1]));
          times.forEach(([c, t]) => bars.append(h('div', { class: 'bar' }, h('i', { style: `height:${(t / 14) * 100}%;background:${t === max ? 'var(--coral)' : 'var(--ocean)'}` }), h('b', {}, c))));
          const best = times.find((t) => t[1] === max)[0]; known += best;
          out.innerHTML = `guessed so far: <b>${known}</b>${'··'.repeat(5 - pos)} &nbsp; real tag: <b>${secret}</b>`;
          await new Promise((r) => setTimeout(r, 650));
        }
        log.innerHTML = known === secret ? `😱 Recovered the whole tag with ~${fmt(tries)} timed requests instead of 2⁴⁸ ≈ 281 trillion guesses.` : `🛡️ With constant-time comparison every guess takes the same time. The attacker’s “best guess” <b>${known}</b> is just noise.`;
        api.done('Ran a timing attack'); running = false;
      };
      el.append(h('div', { class: 'w-row' }, h('button', { class: 'btn coral', type: 'button', onclick: run }, '▶ Run the attack'), h('label', { style: 'display:flex;gap:6px;align-items:center' }, ct, 'Use constant-time compare (hmac.compare_digest)')), bars, out, log);
    },
  };

  // ------------------------------------------------------------------ 8.3 salt
  W.salt = {
    title: 'Same password, with and without salt', chip: '🧂 Sprinkle', xp: 15,
    init(el, api) {
      const pw = h('input', { type: 'text', value: 'sunshine' }); const tbl = h('div', { class: 'table-wrap' });
      let salts = [rand(6), rand(6)];
      const run = debounce(async () => {
        const rows = await Promise.all(['alice', 'bob'].map(async (u, i) => { const plain = hex(await sha('SHA-256', pw.value)); const s = hex(salts[i]); const salted = hex(await sha('SHA-256', s + pw.value)); return [u, plain, s, salted]; }));
        tbl.innerHTML = `<table class="sk-table"><thead><tr><th>User</th><th>Unsalted SHA-256</th><th>Salt</th><th>SHA-256(salt + password)</th></tr></thead><tbody>${rows.map(([u, p, s, x]) => `<tr><td>${u}</td><td style="font-family:var(--mono);font-size:.8rem;color:var(--coral-ink)">${p.slice(0, 16)}…</td><td style="font-family:var(--mono);font-size:.8rem">${s}</td><td style="font-family:var(--mono);font-size:.8rem;color:var(--mint-ink)">${x.slice(0, 16)}…</td></tr>`).join('')}</tbody></table>`;
        api.done('Salted a password');
      }, 120);
      pw.addEventListener('input', run);
      el.append(h('div', { class: 'w-row' }, field('Both users chose the password', pw), h('button', { class: 'btn small', type: 'button', onclick: () => { salts = [rand(6), rand(6)]; run(); } }, '🧂 New salts')), tbl,
        h('p', { class: 'w-note' }, 'Unsalted: identical hashes, so crack one, crack both (and precomputed tables work). Salted: completely different. Real systems ALSO need a slow hash (next section).'));
      run();
    },
  };

  // ------------------------------------------------------------------ 8.4 crack time
  W.cracktime = {
    title: 'How long would your password survive?', chip: '⏳ Estimate', xp: 20, sub: 'Nothing leaves your browser. Rough guess rates for an 8-GPU cracking rig (illustrative, they keep rising).',
    init(el, api) {
      const COMMON = ['password', '123456', '12345678', 'qwerty', 'abc123', 'password1', 'p@ssw0rd', 'p@ssw0rd!', 'letmein', 'sunshine', 'iloveyou', 'admin', 'welcome', 'monkey', 'dragon', 'football', 'baseball', 'princess', 'trustno1', '111111', 'qwerty123', 'password123', 'passw0rd', 'master', 'hello', 'freedom', 'whatever', 'shadow', 'tr0ub4dor&3'];
      const pw = h('input', { type: 'text', value: 'Tr0ub4dor&3', autocomplete: 'off', spellcheck: 'false' });
      const out = h('div'), meter = h('div', { class: 'meter' }, h('i'));
      const RATES = [['MD5 (fast hash)', 1e12, 'var(--coral)'], ['SHA-256 (fast hash)', 1.7e11, 'var(--coral)'], ['bcrypt, cost 12', 1e4, 'var(--sun)'], ['Argon2id, 64 MiB', 1e3, 'var(--mint)']];
      const human = (s) => { if (s < 1) return 'instantly'; const u = [[31557600e9, 'billion years'], [31557600e6, 'million years'], [31557600, 'years'], [86400, 'days'], [3600, 'hours'], [60, 'minutes'], [1, 'seconds']]; for (const [v, n] of u) if (s >= v) return `${fmt(Math.round(s / v))} ${n}`; return 'instantly'; };
      const run = () => {
        const p = pw.value; let cs = 0;
        if (/[a-z]/.test(p)) cs += 26; if (/[A-Z]/.test(p)) cs += 26; if (/[0-9]/.test(p)) cs += 10; if (/[^a-zA-Z0-9]/.test(p)) cs += 33;
        let bits = p.length * Math.log2(Math.max(cs, 1));
        const common = COMMON.includes(p.toLowerCase());
        if (common) bits = Math.min(bits, 10);
        else if (/^(.)\1+$/.test(p) || /^(0123|1234|abcd|qwer)/i.test(p)) bits = Math.min(bits, 16);
        const guesses = 2 ** bits / 2;
        meter.firstChild.style.width = Math.min(100, (bits / 100) * 100) + '%';
        meter.firstChild.style.background = bits < 40 ? 'var(--coral)' : bits < 70 ? 'var(--sun)' : 'var(--mint)';
        out.innerHTML = `<p class="w-note">≈ <b>${bits.toFixed(0)} bits</b> of entropy ${common ? '· ⚠️ it’s on every attacker’s wordlist!' : p.length < 12 ? '· tip: length beats complexity' : ''}</p>` +
          `<div class="table-wrap"><table class="sk-table"><thead><tr><th>Stored with</th><th>Guesses / second</th><th>Average time to crack</th></tr></thead><tbody>${RATES.map(([n, r]) => `<tr><td>${n}</td><td>${r.toExponential(0).replace('e+', ' × 10^')}</td><td><b>${human(guesses / r)}</b></td></tr>`).join('')}</tbody></table></div>`;
        if (bits >= 60) api.done('Built a strong password');
      };
      pw.addEventListener('input', run);
      el.append(field('Try a password (stays on your device)', pw), meter, out, h('div', { class: 'chips' }, ['P@ssw0rd!', 'correct horse battery staple', 'mango orbit fable crisp wagon ledge', 'x7$Kq9!vL2#p'].map((v) => h('button', { class: 'chip', type: 'button', onclick: () => { pw.value = v; run(); } }, v))));
      run();
    },
  };

  // ------------------------------------------------------------------ 8.4 PBKDF2 timer
  W.pbkdf2 = {
    title: 'Feel the slowness: real PBKDF2 on your device', chip: '🐢 Benchmark', xp: 15,
    init(el, api) {
      const s = h('input', { type: 'range', min: 0, max: 4, step: 1, value: 2 });
      const vals = [1000, 10000, 100000, 600000, 1000000];
      const lab = h('b'), out = h('div', { class: 'w-out big' });
      const upd = () => (lab.textContent = fmt(vals[+s.value]) + ' iterations');
      s.addEventListener('input', upd); upd();
      const go = async () => {
        out.textContent = 'Hashing…';
        const it = vals[+s.value], salt = rand(16);
        const base = await crypto.subtle.importKey('raw', enc('correct horse battery staple'), 'PBKDF2', false, ['deriveBits']);
        const t0 = performance.now();
        const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, base, 256));
        const ms = performance.now() - t0, perSec = 1000 / ms;
        out.innerHTML = `key = <b>${hex(bits).slice(0, 32)}…</b><br>⏱️ <b>${ms.toFixed(0)} ms</b> for one guess on your device → ~${fmt(Math.round(perSec))} guesses/s → 1 billion guesses ≈ <b>${fmt(Math.round(1e9 / perSec / 86400))} days</b> (on this device)`;
        api.done('Benchmarked PBKDF2');
      };
      el.append(field(h('span', {}, 'Iterations: ', lab), s), h('div', { class: 'w-row' }, h('button', { class: 'btn', type: 'button', onclick: go }, '🔨 Hash “correct horse battery staple”')), out,
        h('p', { class: 'w-note' }, 'OWASP recommends 600,000 iterations for PBKDF2-HMAC-SHA256. Argon2id adds memory-hardness on top, which hurts GPUs far more.'));
    },
  };

  // ------------------------------------------------------------------ 8.5 hash anatomy
  W.anatomy = {
    title: 'Dissect a stored password hash', chip: '🔍 Tap the parts', xp: 10,
    init(el, api) {
      const parts = [
        ['$argon2id', 'Algorithm: Argon2id', 'var(--coral-soft)'], ['$v=19', 'Version 19 (0x13)', 'var(--sun-soft)'], ['$m=65536,t=3,p=4', 'Settings: 64 MiB memory, 3 iterations, 4 threads', 'var(--ocean-soft)'],
        ['$D1+DM9x/bm3LfaTFlhL4IQ', 'Salt, Base64 (16 random bytes, unique per user)', 'var(--mint-soft)'], ['$D+rtaBkOv+0qB6VJW31BspRapcW31OTydi86CFUqYWU', 'The hash output, Base64 (32 bytes)', 'var(--grape-soft)'],
      ];
      const expl = h('div', { class: 'w-out big' }, 'Tap a coloured part.');
      const seen = new Set();
      el.append(h('div', { class: 'w-out', style: 'font-size:.95rem' }, parts.map(([t, d, c], i) => h('button', { type: 'button', style: `font:inherit;border:2px dashed var(--ink);background:${c};color:var(--ink);border-radius:6px;padding:2px 3px;margin:2px 0;cursor:pointer;word-break:break-all`, onclick: () => { expl.innerHTML = `<b>${t}</b><br>${d}`; seen.add(i); if (seen.size >= 3) api.done('Dissected a password hash'); } }, t))), expl,
        h('p', { class: 'w-note' }, 'Everything needed to verify the password is in one string, so the settings can be raised later and old hashes still work.'));
    },
  };

  // ------------------------------------------------------------------ 8.7 passphrase generator
  W.passphrase = {
    title: 'Passphrase & password generator', chip: '🎲 Roll', xp: 15, sub: 'Uses your browser’s CSPRNG. This demo list has 256 words (8 bits per word). Real Diceware lists have 7,776 (12.9 bits per word).',
    init(el, api) {
      const WORDS = 'able acid aged also area army away baby back ball band bank base bath bear beat bell belt best bike bird blue boat body bone book boot bowl brave bread brick bring brush cable cake calm camp card care cart cash cave chair chalk charm chef chess chip city clay clip cloud coal coat code coin cold cook cool copy coral corn cozy crab crisp crow cube cup curl cycle dance dawn deer desk dice disk dock dog doll door dove draw dream drum duck dune dust eagle earth echo edge egg elbow elk ember fable face farm fern field film fire fish flag flame flute foam fog fork fox frog fruit game gate gem ghost gift glow goat gold golf grape grass gravy gull hair hall hand harp hat hawk heart hill honey hook horn horse house ice iron island ivy jam jar jazz jelly jet joke juice kayak kettle key kite knee knot lake lamp lark leaf ledge lemon lens lily lime lion lock log lunar mango map maple marble mask meadow melon mint mist moon moss moth mug nest net nimble noble nut oak oasis ocean olive onion orbit otter owl paint palm panda paper park pearl pellet pen piano pig pilot pine pixel plum pond pony pool puzzle quilt rabbit radio rain raven reef ribbon rice ring river robot rock rope rose ruby sail salt sand scarf seal shell ship silk sky sled snow sock sofa solar spark staple star stone sugar sun swan table tea tent tiger toast tower train tree tulip tundra turtle valley vase velvet violin wagon walrus wave whale wheel wind wolf wool yarn yeti zebra zinc'.split(' ');
      const n = h('input', { type: 'range', min: 3, max: 8, value: 5 }), len = h('input', { type: 'range', min: 8, max: 32, value: 16 });
      const o1 = h('div', { class: 'w-out big' }), o2 = h('div', { class: 'w-out big' });
      const pick = (max) => { const r = new Uint32Array(1); const lim = Math.floor(0x100000000 / max) * max; do crypto.getRandomValues(r); while (r[0] >= lim); return r[0] % max; };
      const roll = () => {
        const k = +n.value; const words = Array.from({ length: k }, () => WORDS[pick(WORDS.length)]);
        o1.innerHTML = `<b>${words.join(' ')}</b><br><small>${k} × log₂(${WORDS.length}) = ${(k * Math.log2(WORDS.length)).toFixed(0)} bits here · with the full Diceware list: ~${(k * 12.9).toFixed(0)} bits</small>`;
        const CH = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()-_=+[]{};:,.?/'; const L = +len.value;
        o2.innerHTML = `<b>${Array.from({ length: L }, () => CH[pick(CH.length)]).join('')}</b><br><small>${L} × log₂(${CH.length}) = ${(L * Math.log2(CH.length)).toFixed(0)} bits</small>`;
        api.done('Generated a strong passphrase');
      };
      el.append(h('div', { class: 'w-grid2' }, h('div', {}, field(h('span', {}, 'Words: ', h('b', {}, n.value)), n), o1), h('div', {}, field(h('span', {}, 'Characters: ', h('b', {}, len.value)), len), o2)), h('div', { class: 'w-row' }, h('button', { class: 'btn', type: 'button', onclick: roll }, '🎲 Roll again')));
      [n, len].forEach((i) => i.addEventListener('input', () => { i.parentElement.querySelector('b').textContent = i.value; roll(); }));
      roll();
    },
  };

  // ------------------------------------------------------------------ 8.7 Have I Been Pwned k-anonymity
  W.hibp = {
    title: 'How “Have I Been Pwned” checks without seeing your password', chip: '🕵️ k-anonymity', xp: 15, sub: 'This demo computes the hash locally and sends NOTHING. It just shows what the real service would receive.',
    init(el, api) {
      const pw = h('input', { type: 'text', value: 'P@ssw0rd!', autocomplete: 'off', spellcheck: 'false' }); const out = h('div', { class: 'w-out big' });
      const run = debounce(async () => {
        const x = hex(await sha('SHA-1', pw.value)).toUpperCase();
        out.innerHTML = `SHA-1 = <b><span style="background:var(--sun);color:#2b2d42;padding:0 3px;border-radius:4px">${x.slice(0, 5)}</span>${x.slice(5)}</b><br>📤 Sent to the service: <b>${x.slice(0, 5)}</b> (just 5 characters)<br>📥 It replies with hundreds of leaked hashes starting with ${x.slice(0, 5)}…<br>🔒 Your browser checks for <b>${x.slice(5, 12)}…</b> locally. The service never learns your password or even its full hash.`;
        api.done('Understood k-anonymity');
      }, 150);
      pw.addEventListener('input', run); el.append(field('Password', pw), out); run();
    },
  };

  // ------------------------------------------------------------------ 8.8 HKDF
  W.hkdf = {
    title: 'HKDF: one secret, many independent keys', chip: '🌱 Derive', xp: 15,
    init(el, api) {
      let master = rand(32);
      const labels = ['client key', 'server key', 'resumption'].map((v) => h('input', { type: 'text', value: v }));
      const outs = labels.map(() => h('div', { class: 'w-out' })); const mOut = h('div', { class: 'w-out' });
      const run = debounce(async () => {
        mOut.innerHTML = `shared secret (from key exchange): <b>${hex(master)}</b>`;
        const base = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveBits']);
        await Promise.all(labels.map(async (l, i) => { const k = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: enc(l.value) }, base, 256); outs[i].innerHTML = `<b>${hex(k)}</b>`; }));
        api.done('Derived keys with HKDF');
      }, 120);
      labels.forEach((l) => l.addEventListener('input', run));
      el.append(mOut, ...labels.map((l, i) => h('div', { class: 'w-box', style: 'margin:8px 0' }, field('info label', l), outs[i])), h('div', { class: 'w-row' }, h('button', { class: 'btn small', type: 'button', onclick: () => { master = rand(32); run(); } }, '🎲 New master secret')),
        h('p', { class: 'w-note' }, 'Key separation: change one label and only that key changes. Leak one key and the others stay safe.'));
      run();
    },
  };
})();
