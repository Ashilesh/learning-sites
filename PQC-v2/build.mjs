// Builds index.html from the PQC guide markdown.
// Usage: node build.mjs   (re-run whenever the .md file changes)
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "PQC_Complete_Practical_Guide_Plain_Language.md");
const md = readFileSync(SRC, "utf8");

// Copy diagrams next to the page so the site is self-contained.
mkdirSync(join(here, "images"), { recursive: true });
cpSync(join(here, "..", "images"), join(here, "images"), { recursive: true });

const slug = (s) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- markdown renderer tweaks ----------
const renderer = new marked.Renderer();
renderer.blockquote = (quote) => {
  if (quote.includes("💡")) {
    const body = quote.replace(/💡\s*<strong>In plain words:<\/strong>\s*/, "");
    return `<aside class="sticky"><span class="tape"></span><div class="sticky-label">💡 In plain words</div>${body}</aside>`;
  }
  return `<blockquote>${quote}</blockquote>`;
};
renderer.image = (href, title, text) =>
  `<figure class="polaroid"><span class="tape t1"></span><span class="tape t2"></span>` +
  `<button class="zoom" aria-label="Enlarge diagram: ${esc(text)}"><img src="${href}" alt="${esc(text)}" loading="lazy"></button>` +
  `<figcaption>${esc(text)}</figcaption></figure>`;
renderer.paragraph = (text) =>
  /^<figure/.test(text.trim()) ? text : `<p>${text}</p>\n`;
renderer.table = (header, body) =>
  `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
renderer.code = (code, lang) => {
  const label = lang || (/^(openssl|curl|ssh|go |grpcurl|tshark|jq|kubectl|nmap|testssl|sudo|#)/m.test(code) ? "terminal" : "diagram");
  const cls = label === "diagram" ? "code diagram" : "code";
  return `<div class="${cls}"><div class="code-bar"><span class="dots"><i></i><i></i><i></i></span><span class="code-lang">${esc(label)}</span><button class="copy" type="button">copy</button></div><pre><code>${esc(code)}</code></pre></div>`;
};
renderer.listitem = (text, task, checked) =>
  task ? `<li class="task"><label>${text.replace(/<input[^>]*>/, '<input type="checkbox">')}</label></li>` : `<li>${text}</li>`;
renderer.link = (href, title, text) =>
  `<a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
marked.use({ renderer, gfm: true });

// ---------- split into parts (#) and sections (##), ignoring code fences ----------
const lines = md.split("\n");
const parts = []; // {title, lines, sections:[{title, lines}]}
let inFence = false;
let cur = null, sec = null;
for (const line of lines) {
  if (/^```/.test(line)) inFence = !inFence;
  if (!inFence && /^# /.test(line)) {
    cur = { title: line.slice(2).trim(), intro: [], sections: [] };
    parts.push(cur); sec = null; continue;
  }
  if (!inFence && /^## /.test(line) && cur) {
    sec = { title: line.slice(3).trim(), lines: [] };
    cur.sections.push(sec); continue;
  }
  if (!cur) continue;
  if (/^---\s*$/.test(line) && !inFence) continue; // part separators become page design
  (sec ? sec.lines : cur.intro).push(line);
}

// Part metadata: emoji doodle + colour + short label
const META = [
  { k: "Part 0", e: "🔤", c: "sun", tag: "Warm-up" },
  { k: "Part 1", e: "🧰", c: "sky", tag: "Basics" },
  { k: "Part 2", e: "⚛️", c: "coral", tag: "The threat" },
  { k: "Part 3", e: "🌐", c: "teal", tag: "Protocols" },
  { k: "Part 4", e: "🧮", c: "grape", tag: "New algorithms" },
  { k: "Part 5", e: "🔌", c: "sky", tag: "In real protocols" },
  { k: "Part 6", e: "🗺️", c: "teal", tag: "Migration" },
  { k: "Part 7", e: "🧪", c: "coral", tag: "Hands-on labs" },
  { k: "Part 8", e: "📝", c: "sun", tag: "Cheat sheet" },
  { k: "Appendix A", e: "🪪", c: "grape", tag: "Certificates" },
  { k: "Appendix B", e: "📦", c: "sky", tag: "CBOM" },
  { k: "Appendix C", e: "🔧", c: "teal", tag: "Recipes" },
  { k: "Appendix D", e: "🗝️", c: "sun", tag: "Keys & HSMs" },
  { k: "Appendix E", e: "🚦", c: "coral", tag: "Rollout" },
  { k: "Appendix F", e: "🏛️", c: "grape", tag: "Governance" },
  { k: "Appendix G", e: "💭", c: "sky", tag: "Concepts" },
  { k: "Appendix H", e: "🕵️", c: "coral", tag: "HNDL deep dive" },
];

const docTitle = parts[0];
const body = parts.slice(1);
let words = 0;
const countWords = (s) => (words += s.split(/\s+/).length);

function renderSection(s, partId) {
  const id = `${partId}--${slug(s.title)}`;
  const src = s.lines.join("\n");
  countWords(src);
  const num = (s.title.match(/^([0-9A-H]+\.[0-9]+)/) || [])[1] || "";
  const title = s.title.replace(/^([0-9A-H]+\.[0-9]+)\s*/, "");
  return {
    id, num, title,
    html: `<article class="sec" id="${id}" data-sec="${esc(s.title)}">
<h2>${num ? `<span class="num">${num}</span>` : ""}${marked.parseInline(title)}</h2>
${marked.parse(src)}
<div class="sec-end" aria-hidden="true"></div>
</article>`,
  };
}

// Intro ("How to use this guide") is the doc title's section(s)
const introSecs = docTitle.sections.map((s) => renderSection(s, "intro"));
const subtitle = marked.parseInline(docTitle.intro.join(" ").trim().replace(/^\*|\*$/g, ""));
countWords(docTitle.intro.join(" "));

const toc = [];
const partsHtml = body.map((p, i) => {
  const [label, ...rest] = p.title.split(":");
  const name = rest.join(":").trim() || p.title;
  const m = META.find((x) => label.trim() === x.k) || { e: "📘", c: "sky", tag: "" };
  const pid = slug(label);
  const secs = p.sections.map((s) => renderSection(s, pid));
  const introSrc = p.intro.join("\n");
  countWords(introSrc);
  toc.push({ pid, label: label.trim(), name, e: m.e, c: m.c, secs });
  return `<section class="part c-${m.c}" id="${pid}" data-part="${esc(label.trim())}">
<header class="part-head">
  <div class="part-doodle" aria-hidden="true">${m.e}</div>
  <div>
    <p class="part-label">${esc(label.trim())}${m.tag ? ` · <span>${esc(m.tag)}</span>` : ""}</p>
    <h1>${marked.parseInline(name)}</h1>
    <p class="part-meta"><span data-part-count>${secs.length} page${secs.length === 1 ? "" : "s"}</span> · <span data-part-progress>0 read</span></p>
  </div>
</header>
${introSrc.trim() ? `<div class="part-intro">${marked.parse(introSrc)}</div>` : ""}
${secs.map((s) => s.html).join("\n")}
<div class="part-done" aria-hidden="true"><span>${esc(label.trim())} complete!</span></div>
</section>`;
}).join("\n");

const minutes = Math.round(words / 200);
const tocHtml = toc.map((t) => `<li class="toc-part c-${t.c}" data-pid="${t.pid}">
<a class="toc-part-link" href="#${t.pid}"><span class="toc-e">${t.e}</span><span class="toc-txt"><b>${esc(t.label)}</b><small>${marked.parseInline(t.name)}</small></span><span class="toc-ring" data-ring></span></a>
<ol>${t.secs.map((s) => `<li><a href="#${s.id}" data-sec-link="${s.id}">${s.num ? `<span>${s.num}</span> ` : ""}${marked.parseInline(s.title)}</a></li>`).join("")}</ol>
</li>`).join("\n");

const partCards = toc.map((t, i) => `<a class="pcard c-${t.c}" href="#${t.pid}" style="--r:${[-1.5, 1, -0.5, 1.5, -1, 0.5][i % 6]}deg"><span class="pcard-e">${t.e}</span><b>${esc(t.label)}</b><span>${marked.parseInline(t.name)}</span><i data-card-progress="${t.pid}"></i></a>`).join("\n");

const tpl = readFileSync(join(here, "template.html"), "utf8");
const out = tpl
  .replaceAll("{{SUBTITLE}}", subtitle)
  .replaceAll("{{MINUTES}}", String(minutes))
  .replaceAll("{{HOURS}}", (minutes / 60).toFixed(1))
  .replaceAll("{{PARTS}}", String(toc.length))
  .replaceAll("{{SECTIONS}}", String(toc.reduce((n, t) => n + t.secs.length, 0)))
  .replaceAll("{{INTRO}}", introSecs.map((s) => s.html).join("\n"))
  .replaceAll("{{PART_CARDS}}", partCards)
  .replaceAll("{{TOC}}", tocHtml)
  .replaceAll("{{BODY}}", partsHtml);
writeFileSync(join(here, "index.html"), out);
console.log(`Built index.html: ${toc.length} parts, ${words} words, ~${minutes} min read`);
