# CryptoSketch: the interactive sketchbook edition of *Cryptography, Explained*

A static website generated from [`../Cryptography-Guide.md`](../Cryptography-Guide.md). Every word, table and code block in the guide is on the site, plus:

- **80 interactive demos, many running real cryptography** in the browser (Web Crypto API): AES rounds checked against the browser's AES, the ECB picture leak, AES-GCM tamper detection, live SHA-256 avalanche, HMAC vs. plain hash, PBKDF2 timing, toy and real RSA, paint-mixing Diffie-Hellman, real X25519 and Ed25519, a TLS 1.3 handshake stepper, TOTP (checked against the RFC 6238 test vector), JWT forging, blockchain mining, Shamir secret sharing, envelope encryption, the IND-CPA game, a Feistel cipher, onion routing, OpenID Connect with PKCE, EMV card cryptograms, measured boot and image steganography.
- **200+ pros & cons cards** for every cipher, mode, hash, MAC, KDF, curve, signature scheme, protocol version, VPN, Wi-Fi standard, trust model, certificate revocation method, key-storage option, single sign-on standard, payment method and device-trust technique.
- **Game mechanics:** XP and 10 ranks, daily streaks, 17 achievements, a boss quiz per chapter, and 22 key fragments that open a vault (a message encrypted at build time with AES-256-GCM, key derived with PBKDF2).
- **Crypto Shorts:** a vertical, swipeable feed of every key idea, true story, warning and quiz, reshuffled daily.
- Sketchbook (light) and chalkboard (dark) themes, a hand-drawn doodle per chapter (Rough.js), search, phone-friendly layout.

Progress is stored only in the visitor's browser (`localStorage`); there is no backend.

## Build and preview

```bash
npm install
npm run build      # writes the site to dist/
npm run serve      # http://localhost:8080
```

Edit the guide and rebuild: the site always reflects `Cryptography-Guide.md`.

## Deploy

`dist/` is a plain static folder. Upload it to any static host (GitHub Pages, Netlify, Cloudflare Pages, S3). Asset URLs carry a content hash (`?v=…`) so visitors always get fresh files after a rebuild.

## Where things live

| Path | What it does |
|---|---|
| `build.mjs` | Splits the guide into chapters and sections, renders Markdown, styles callouts and tables, injects widgets / pros & cons / quizzes, builds search and Shorts data, encrypts the vault |
| `src/chapters.mjs` | Per-chapter hook question, emoji, boss quiz and key fragment; the vault message |
| `src/proscons.mjs` | Pros & cons cards, keyed by the guide section they follow |
| `src/placements.mjs` | Which interactive widget appears after which section |
| `assets/css/style.css` | Sketchbook / chalkboard theme and colour system |
| `assets/js/core.js` | XP, levels, streaks, achievements, quizzes, search, drawer, widget loader |
| `assets/js/doodles.js` | Hand-drawn chapter doodles and the Alice / Bob / Eve / Mallory / Trent characters |
| `assets/js/widgets-a…e.js` | The interactive demos (a: Chapters 1–4, b: 5–8, c: 9–11, d: 12–19 and 21–22, e: 20) |
| `assets/js/home.js`, `shorts.js` | Landing page (level map, vault) and the Shorts feed |

To add a demo: write `W.myDemo = { title, xp, init(el, api) { … } }` in a widgets file, then add `'5.8': ['myDemo']` to `src/placements.mjs`. To add pros & cons: add an entry under the section number in `src/proscons.mjs`.
