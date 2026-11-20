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

  // ↓↓↓ ADD NEW SITES HERE ↓↓↓
];
