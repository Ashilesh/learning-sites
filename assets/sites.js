/* =====================================================================
 * SITE CATALOG — the ONLY file you normally edit to add a new site.
 * ---------------------------------------------------------------------
 * HOW TO ADD A NEW SITE
 *   1. Put the site in its own folder at the repo root, e.g. /TLS/index.html
 *      (folder name = short topic, UPPERCASE for acronyms, kebab-case otherwise).
 *   2. Append an entry to SITES below (newest at the bottom is fine — the
 *      home page sorts by `added` itself).
 *   3. If no existing category fits, add one to CATEGORIES (keep `id` kebab-case).
 *      Categories with zero sites are hidden automatically, so it is safe to
 *      pre-create them.
 *
 * Paths are RELATIVE (no leading "/") so the site works both at
 * https://<user>.github.io/ and at https://<user>.github.io/<repo>/.
 * ===================================================================== */

window.SITE_CONFIG = {
  title: "Tech Explainers",
  prompt: "~/explainers",
  tagline:
    "Hands-on, visual guides to how computers and the internet really work. " +
    "Every page has a toy you can poke at.",
  // Sites added within this many days get a "NEW" badge.
  newBadgeDays: 14,
};

/* ---------------------------------------------------------------------
 * CATEGORIES
 *   id     : kebab-case, referenced by SITES[].category
 *   name   : shown on the page
 *   icon   : one of the keys in ICONS (assets/app.js) — add a new SVG there if needed
 *   blurb  : one line shown under the category heading
 * Order here = order on the page.
 * ------------------------------------------------------------------- */
window.CATEGORIES = [
  { id: "security",   name: "Security & Cryptography", icon: "lock",    blurb: "Locks, keys, signatures and the threats they defend against." },
  { id: "networking", name: "Networking & Protocols",  icon: "network", blurb: "How bytes find their way across the internet." },
  { id: "systems",    name: "Operating Systems",       icon: "chip",    blurb: "Processes, memory, files and what the kernel does for you." },
  { id: "web",        name: "Web & Browsers",          icon: "globe",   blurb: "HTML, rendering, caching and what happens when you hit Enter." },
  { id: "data",       name: "Databases & Storage",     icon: "db",      blurb: "Indexes, transactions and keeping data safe on disk." },
  { id: "ai",         name: "AI & Machine Learning",   icon: "spark",   blurb: "Models, training and inference, minus the hype." },
  { id: "cloud",      name: "Cloud & DevOps",          icon: "cloud",   blurb: "Containers, deployment pipelines and running things at scale." },
  { id: "algorithms", name: "Algorithms & Data Structures", icon: "tree", blurb: "The ideas underneath every fast program." },
  { id: "quantum",    name: "Quantum Computing",       icon: "atom",    blurb: "Qubits, entanglement and the machines being built from them." },
];

/* ---------------------------------------------------------------------
 * SITES
 *   id          : unique kebab-case slug
 *   title       : card title (usually the page's <title>)
 *   path        : relative link to the page
 *   category    : a CATEGORIES id
 *   topic       : short series label; pages sharing a topic are shown as a series
 *   format      : "Interactive guide" | "Animation" | "Visual story" | "Cheat sheet" | ...
 *   description : 1–2 sentences, plain language
 *   tags        : lowercase search keywords
 *   added       : "YYYY-MM-DD" (drives sorting and the NEW badge)
 *   minutes     : optional rough time to read/watch
 *   featured    : optional true — pinned to the "Start here" strip
 * ------------------------------------------------------------------- */
window.SITES = [
  {
    id: "pqc-quantum-safe-locks",
    title: "Quantum-Safe Locks",
    path: "PQC/quantum-safe-locks.html",
    category: "security",
    topic: "PQC",
    format: "Interactive guide",
    description:
      "Why the internet is changing its locks before quantum computers learn to pick them. " +
      "Covers the TLS handshake, key exchange, harvest-now-decrypt-later and the new post-quantum algorithms, with live demos.",
    tags: ["pqc", "post-quantum", "cryptography", "tls", "ml-kem", "kyber", "key exchange", "quantum"],
    added: "2026-11-21",
    minutes: 30,
    featured: true,
  },
  {
    id: "pqc-secret-journey",
    title: "The Secret's Journey",
    path: "PQC/secret-journey.html",
    category: "security",
    topic: "PQC",
    format: "Animation",
    description:
      "One secret travels from your browser to the bank, before and after the quantum robot arrives. A 90-second animated story.",
    tags: ["pqc", "post-quantum", "animation", "tls", "quantum", "https"],
    added: "2026-11-21",
    minutes: 2,
  },
  {
    id: "quic-sketchbook",
    title: "QUIC Sketchbook",
    path: "QUIC/index.html",
    category: "networking",
    topic: "QUIC",
    format: "Interactive guide",
    description:
      "A newer, faster way for devices to talk to websites, explained with parcels and couriers. " +
      "TCP vs UDP, streams, 0-RTT and connection migration. No networking background needed.",
    tags: ["quic", "http/3", "udp", "tcp", "transport", "networking", "tls"],
    added: "2026-11-21",
    minutes: 25,
    featured: true,
  },

  {
    id: "wasm-sketchbook",
    title: "Wasm Sketchbook",
    path: "wasm/index.html",
    category: "web",
    topic: "Wasm",
    format: "Interactive guide · 12 chapters",
    description:
      "A hand-drawn guide to WebAssembly: what it is, how the browser runs it, how it rides the JavaScript engine " +
      "and reaches the GPU, and what it still can't do. Flip cards, a stack machine and a quiz.",
    tags: ["wasm", "webassembly", "javascript", "v8", "browser", "compilers", "gpu", "webgpu"],
    added: "2026-11-21",
    minutes: 45,
    featured: true,
  },

  {
    id: "pqc-quantum-safe-sketchbook",
    title: "Quantum-Safe Sketchbook",
    path: "PQC-v2/index.html",
    category: "security",
    topic: "PQC",
    format: "Illustrated guide",
    description:
      "The complete, plain-language guide to post-quantum cryptography: what quantum computers break, " +
      "harvest-now-decrypt-later, hybrid key exchange, certificate sizes and a step-by-step migration roadmap. 18 diagrams.",
    tags: ["pqc", "post-quantum", "cryptography", "ml-kem", "ml-dsa", "hybrid", "x25519mlkem768", "migration", "certificates", "quantum"],
    added: "2026-11-21",
    minutes: 60,
  },
  {
    id: "crypto-sketch",
    title: "Cryptography, Explained",
    path: "Cryptography/dist/index.html",
    category: "security",
    topic: "Cryptography",
    format: "Interactive guide · 22 chapters",
    description:
      "The whole of applied cryptography as a game: ciphers, hashes, MACs, RSA, Diffie-Hellman, TLS, PKI, passwords and more, " +
      "with 80 live demos running real crypto in your browser, boss quizzes and a vault to unlock.",
    tags: ["cryptography", "aes", "rsa", "sha-256", "hmac", "diffie-hellman", "tls", "pki", "signatures", "jwt", "totp", "encryption"],
    added: "2026-11-21",
    minutes: 240,
    featured: true,
  },

  {
    id: "qubit-sketchbook",
    title: "Qubit Sketchbook",
    path: "quantum-computing/index.html",
    category: "quantum",
    topic: "Quantum",
    format: "Interactive guide · 36 episodes",
    description:
      "Quantum computing from \"what is a qubit?\" to fault-tolerant machines, in plain language. " +
      "Superposition, entanglement, Shor and Grover, error correction and real hardware, with 34 widgets to play with and quick bites to swipe.",
    tags: ["quantum", "quantum computing", "qubit", "superposition", "entanglement", "shor", "grover", "error correction", "bloch sphere", "qiskit", "hardware"],
    added: "2026-11-21",
    minutes: 300,
  },

  {
    id: "quantum-in-two-minutes",
    title: "Quantum in Two Minutes",
    path: "quantum-computing/animation.html",
    category: "quantum",
    topic: "Quantum",
    format: "Animation",
    description:
      "A hand-drawn, two-minute animated tour: bits vs qubits, measurement, entanglement, interference, " +
      "a real quantum search step by step, why qubits are fragile, and what quantum computers are actually good for.",
    tags: ["quantum", "quantum computing", "animation", "qubit", "superposition", "entanglement", "interference", "grover", "decoherence"],
    added: "2026-11-21",
    minutes: 2,
  },

  {
    id: "quic-in-two-minutes",
    title: "QUIC in Two Minutes",
    path: "QUIC/animation.html",
    category: "networking",
    topic: "QUIC",
    format: "Animation",
    description:
      "A hand-drawn, two-minute animated tour of QUIC: parcels and couriers, the TCP vs QUIC handshake race, 0-RTT, " +
      "streams vs head-of-line blocking, switching from Wi-Fi to 5G mid-download, and the always-locked box.",
    tags: ["quic", "http/3", "animation", "udp", "tcp", "handshake", "0-rtt", "streams", "head-of-line blocking", "connection migration", "tls"],
    added: "2026-11-21",
    minutes: 2,
  },

  {
    id: "crypto-in-two-minutes",
    title: "Cryptography in Two Minutes",
    path: "Cryptography/dist/animation.html",
    category: "security",
    topic: "Cryptography",
    format: "Animation",
    description:
      "A hand-drawn, two-minute animated tour with Alice, Bob, Eve and Mallory: Caesar's cipher, AES, Diffie-Hellman paint mixing, " +
      "public-key padlocks, hashes, tamper-proof tags, signatures, password storage and how HTTPS ties it all together.",
    tags: ["cryptography", "animation", "encryption", "aes", "diffie-hellman", "rsa", "public key", "sha-256", "hash", "hmac", "signatures", "passwords", "tls", "https"],
    added: "2026-11-21",
    minutes: 2,
  },

  {
    id: "wasm-in-two-minutes",
    title: "Wasm in Two Minutes",
    path: "wasm/animation.html",
    category: "web",
    topic: "Wasm",
    format: "Animation",
    description:
      "A hand-drawn, two-minute animated tour of WebAssembly: the kitchen analogy, compiling once, the stack machine, " +
      "loading and validation, riding the JS engine, the sandbox and linear memory, the trip to the GPU, limits and what comes next.",
    tags: ["wasm", "webassembly", "animation", "javascript", "v8", "browser", "stack machine", "linear memory", "sandbox", "webgpu", "wasi"],
    added: "2026-11-21",
    minutes: 2,
  },

  // ↓↓↓ ADD NEW SITES HERE ↓↓↓
];
