// Build script: turns ../Cryptography-Guide.md into the CryptoSketch website in ./dist
// Usage: npm run build   (then: npm run serve  → http://localhost:8080)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import ini from 'highlight.js/lib/languages/ini';
import { CHAPTERS, WORLDS, VAULT_MESSAGE } from './src/chapters.mjs';
import { PROSCONS } from './src/proscons.mjs';
import { PLACEMENTS } from './src/placements.mjs';

hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('ini', ini);

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC_MD = path.resolve(ROOT, '..', 'Cryptography-Guide.md');
const DIST = path.join(ROOT, 'dist');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
const pad = (n) => String(n).padStart(2, '0');
const chFile = (n) => (n === 0 ? 'start.html' : n === 'appendix' ? 'appendix.html' : `chapter-${pad(n)}.html`);
const secHref = (num) => `${chFile(+num.split('.')[0])}#s-${num.replace('.', '-')}`;
const stripTags = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- parse the guide
function parseGuide(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let fence = false, part = null, cur = null;
  const pre = [], parts = [], chapters = [];
  for (const line of lines) {
    if (!fence) {
      let m;
      if ((m = line.match(/^# Part ([IVX]+): (.+)$/))) { part = { roman: m[1], title: m[2].trim() }; parts.push(part); cur = null; continue; }
      if ((m = line.match(/^## Chapter (\d+)\. (.+)$/))) { cur = { num: +m[1], title: m[2].trim(), part, lines: [] }; chapters.push(cur); continue; }
      if ((m = line.match(/^## Appendix: (.+)$/))) { cur = { num: 'appendix', title: m[1].trim(), part, lines: [] }; chapters.push(cur); continue; }
    }
    if (/^\s*```/.test(line)) fence = !fence;
    if (cur) cur.lines.push(line); else if (!part) pre.push(line);
  }
  for (const c of chapters) {
    while (c.lines.length && /^\s*(---)?\s*$/.test(c.lines[c.lines.length - 1])) c.lines.pop();
  }
  return { pre, parts, chapters };
}

function splitSections(lines) {
  let fence = false, cur = null;
  const intro = [], secs = [];
  for (const line of lines) {
    if (!fence) {
      const m = line.match(/^### (.+)$/);
      if (m) {
        const t = m[1].trim();
        const nm = t.match(/^(\d+\.\d+)\s+(.*)$/);
        cur = { num: nm ? nm[1] : null, title: nm ? nm[2] : t, lines: [] };
        cur.id = nm ? 's-' + nm[1].replace('.', '-') : 's-' + slug(t);
        secs.push(cur);
        continue;
      }
    }
    if (/^\s*```/.test(line)) fence = !fence;
    (cur ? cur.lines : intro).push(line);
  }
  return { intro, secs };
}

// ---------------------------------------------------------------- markdown → html
const LANG_LABEL = { bash: 'Terminal', python: 'Python', powershell: 'PowerShell', ini: 'Config' };
function renderCode(text, lang) {
  if (!lang) {
    const diagram = /[─│┌┐└┘├┤┬┴┼►◄▲▼═║╔╗╚╝⊕]/.test(text);
    return `<figure class="sketch ${diagram ? 'diagram' : 'plain'}"><div class="sketch-scroll"><pre>${esc(text)}</pre></div>${diagram ? '<figcaption>✏️ napkin sketch · scroll sideways on small screens</figcaption>' : ''}</figure>`;
  }
  const language = hljs.getLanguage(lang) ? lang : null;
  const code = language ? hljs.highlight(text, { language }).value : esc(text);
  return `<div class="code-card lang-${esc(lang)}"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span class="lang">${LANG_LABEL[lang] || esc(lang)}</span><button class="copy" type="button" aria-label="Copy code">Copy</button></div><pre><code class="hljs">${code}</code></pre></div>`;
}

const md = new Marked({ gfm: true });
md.use({
  renderer: {
    code(tok) { return renderCode(tok.text, (tok.lang || '').trim().split(/\s+/)[0]); },
    heading(tok) {
      const inner = this.parser.parseInline(tok.tokens);
      return `<h${tok.depth} id="${slug(tok.text)}" class="h${tok.depth}">${inner}</h${tok.depth}>\n`;
    },
    link(tok) {
      let href = tok.href;
      const m = href.match(/^#chapter-(\d+)-/);
      if (m) href = chFile(+m[1]);
      else if (href.startsWith('#appendix')) href = 'appendix.html';
      const inner = this.parser.parseInline(tok.tokens);
      const ext = /^https?:/.test(href);
      return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>`;
    },
  },
});

function calloutKind(inner) {
  const t = stripTags(inner);
  if (t.startsWith('💡')) return 'key';
  if (t.startsWith('⚠')) return 'warn';
  if (t.startsWith('📜')) return 'story';
  if (t.startsWith('🧮')) return 'math';
  if (t.startsWith('🧪')) return 'lab';
  if (t.startsWith('🌐')) return 'net';
  return 'quote';
}

function timelineFromTable(tableHtml) {
  const heads = [...tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1]);
  const rows = [...tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1])).filter((r) => r.length);
  return `<ol class="timeline">${rows.map((r, i) => `<li class="tl-item c${i % 6}"><span class="tl-year">${r[0]}</span><div class="tl-body"><h5>${r[1]}</h5>${r.slice(2).map((cell, j) => `<p><b>${heads[j + 2]}:</b> ${cell}</p>`).join('')}</div></li>`).join('')}</ol>`;
}

function crossLink(html, selfNum) {
  let skip = 0;
  return html.split(/(<[^>]+>)/).map((p) => {
    if (p.startsWith('<')) {
      if (/^<\/?(a|code|pre|h[1-6]|button|figcaption|summary)\b/i.test(p)) skip += p.startsWith('</') ? -1 : 1;
      return p;
    }
    if (skip > 0 || !p) return p;
    return p
      .replace(/\bChapters?\s+\d+(?:\s*(?:and|–|-|,)\s*\d+)*/g, (all) =>
        all.replace(/\d+/g, (n) => (+n >= 1 && +n <= MAXCH && +n !== selfNum ? `<a class="xref" href="${chFile(+n)}">${n}</a>` : n)))
      .replace(/\b(section)\s+(\d+\.\d+)/gi, (all, w, n) => (+n.split('.')[0] <= MAXCH ? `<a class="xref" href="${secHref(n)}">${w} ${n}</a>` : all));
  }).join('');
}

function decorate(html, selfNum, secNum) {
  const stash = [];
  html = html.replace(/<blockquote>\s*([\s\S]*?)<\/blockquote>/g, (m, inner) => {
    stash.push(`<aside class="callout ${calloutKind(inner)}">${inner}</aside>`);
    return `@@STASH${stash.length - 1}@@`;
  });
  html = html.replace(/<p>(💡|⚠️|⚠|📜|🧮|🧪)([\s\S]*?)<\/p>/g, (m, e) => {
    const k = calloutKind(e);
    if (k === 'lab') return `<p class="lab-label">${m.slice(3, -4)}</p>`;
    return `<div class="callout ${k}">${m}</div>`;
  });
  html = html.replace(/@@STASH(\d+)@@/g, (m, i) => stash[+i]);
  if (secNum === '2.6' || secNum === '18.7') html = html.replace(/<table>[\s\S]*?<\/table>/, (t) => timelineFromTable(t));
  html = html.replace(/<table>/g, '<div class="table-wrap"><table class="sk-table">').replace(/<\/table>/g, '</table></div>');
  const ST = { '✅': 'ok', '❌': 'bad', '⚠️': 'warn', '👀': 'seen', '🔒': 'hidden' };
  html = html.replace(/<td>(\s*)(✅|❌|⚠️|👀|🔒)/g, (m, sp, e) => `<td class="st-${ST[e]}">${sp}${e}`);
  return crossLink(html, selfNum);
}

const renderMd = (lines, selfNum, secNum) => decorate(md.parse(lines.join('\n')), selfNum, secNum);

// ---------------------------------------------------------------- extras
const VERDICT = { use: ['✅', 'Use it'], ok: ['👍', 'Situational'], legacy: ['⚠️', 'Legacy'], avoid: ['❌', 'Avoid'], idea: ['💡', 'Concept'] };
function renderProsCons(pc) {
  return `<div class="pc-block"><div class="pc-head"><span class="pc-badge">⚖️ Pros &amp; Cons</span><h4>${esc(pc.title)}</h4></div><div class="pc-grid">${pc.items.map((it) => `
<article class="pc-card v-${it.v}"><header><span class="pc-verdict">${VERDICT[it.v][0]} ${VERDICT[it.v][1]}</span><h5>${esc(it.name)}</h5><p class="pc-tag">${esc(it.tag)}</p></header>
<ul class="pros">${it.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
<ul class="cons">${it.cons.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
<footer><b>Best for:</b> ${esc(it.best)}</footer></article>`).join('')}</div></div>`;
}
const widgetSlot = (id) => `<div class="widget" data-w="${id}"><div class="widget-loading">✏️ sketching an interactive demo…</div><noscript>Turn on JavaScript to play with this demo.</noscript></div>`;

// ---------------------------------------------------------------- page shell
const NAV = { chapters: [] };
let MAXCH = 21; // number of numbered chapters; set from the guide at build time
const NQUIZ = Object.keys(CHAPTERS).length; // chapters with a boss quiz = key fragments
function header() {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="pill home-link" href="../../index.html" title="Back to all explainers">←<span class="sp-text"> All explainers</span></a>
  <button class="icon-btn" id="menuBtn" aria-label="Open the chapter map" aria-expanded="false">☰</button>
  <a class="brand" href="index.html" aria-label="CryptoSketch home"><span class="brand-lock">🔐</span><span class="brand-text">Crypto<b>Sketch</b></span></a>
  <a href="shorts.html" class="pill shorts-pill" title="Bite-sized cards">▶<span class="sp-text"> Shorts</span></a>
  <span class="grow"></span>
  <button class="xp-wrap" id="xpWrap" type="button" title="Your level and achievements"><span class="lvl" id="lvlName">Lv 1</span><span class="xp-bar"><i id="xpFill"></i></span><span class="xp-num" id="xpNum">0 XP</span></button>
  <span class="streak" id="streak" title="Daily reading streak">🔥 1</span>
  <button class="icon-btn" id="searchBtn" aria-label="Search the guide">🔎</button>
  <button class="icon-btn" id="themeBtn" aria-label="Switch sketchbook / chalkboard theme">🌙</button>
</header>
<div class="read-progress" aria-hidden="true"><i id="readProg"></i></div>`;
}
function drawer() {
  const groups = {};
  for (const c of NAV.chapters) (groups[c.world] ||= []).push(c);
  return `<div class="drawer-scrim" id="scrim" hidden></div>
<nav class="drawer" id="drawer" aria-label="All chapters" hidden>
  <div class="drawer-head"><b>🗺️ The Map</b><button class="icon-btn" id="closeDrawer" aria-label="Close">✕</button></div>
  <a class="drawer-link start" href="start.html">🧭 Start here: how to read this guide</a>
  ${Object.entries(groups).map(([w, list]) => `<div class="drawer-world world-${WORLDS[w].color}"><p>${WORLDS[w].emoji} World ${WORLDS[w].n}: ${WORLDS[w].name}</p>${list.map((c) => `<a class="drawer-link" data-ch="${c.n}" href="${c.file}"><span class="dl-num">${c.n}</span><span class="dl-title">${esc(c.title)}</span><span class="dl-state"></span></a>`).join('')}</div>`).join('')}
  <a class="drawer-link" href="appendix.html">📚 Appendix: Where to Learn More</a>
  <a class="drawer-link" href="shorts.html">▶ Crypto Shorts</a>
  <a class="drawer-link" href="animation.html">🎬 Crypto in Two Minutes</a>
  <a class="drawer-link" href="index.html#vault">🔒 The Vault</a>
</nav>
<div class="search-pop" id="searchPop" hidden><div class="search-box"><input id="searchInput" type="search" placeholder="Search: nonce, Argon2, TLS handshake…" autocomplete="off"><button class="icon-btn" id="closeSearch" aria-label="Close search">✕</button></div><ol id="searchResults"></ol></div>`;
}
function footer() {
  return `<footer class="site-foot"><p>✏️ <b>CryptoSketch</b> · every word comes from <i>Cryptography, Explained</i> · built with doodles, real crypto (Web Crypto API) and too much coffee ☕</p><p><a href="index.html">Home</a> · <a href="start.html">Start</a> · <a href="shorts.html">Shorts</a> · <a href="chapter-20.html">Cheat sheet</a> · <a href="chapter-21.html">Glossary</a></p></footer>`;
}
const SVG_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="wobble"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></defs></svg>`;

let VER = 'dev';
const v = (u) => `${u}?v=${VER}`;
function page({ title, desc, body, bodyClass = '', scripts = [], inline = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#fdf8ee">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔐</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Patrick+Hand&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${v('assets/css/style.css')}">
<script>try{var t=localStorage.getItem('cs-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body class="${bodyClass}">
${SVG_DEFS}
${header()}
${drawer()}
<main id="main">
${body}
</main>
${footer()}
${inline}
<script src="${v('assets/vendor/rough.js')}"></script>
<script src="${v('assets/js/site-data.js')}"></script>
<script src="${v('assets/js/core.js')}"></script>
<script src="${v('assets/js/doodles.js')}"></script>
${scripts.map((s) => `<script src="${v(s)}"></script>`).join('\n')}
</body>
</html>`;
}

const widgetFileFor = (n) => (n <= 4 ? 'a' : n <= 8 ? 'b' : n <= 11 ? 'c' : n === 20 ? 'e' : 'd');

// ---------------------------------------------------------------- build
function build() {
  const raw = fs.readFileSync(SRC_MD, 'utf8');
  const hashAll = crypto.createHash('sha256').update(raw);
  for (const f of fs.readdirSync(path.join(ROOT, 'assets'), { recursive: true })) { const fp = path.join(ROOT, 'assets', f); if (fs.statSync(fp).isFile()) hashAll.update(fs.readFileSync(fp)); }
  VER = hashAll.digest('hex').slice(0, 10);
  const { pre, chapters } = parseGuide(raw);
  MAXCH = chapters.filter((c) => c.num !== 'appendix').length;
  const shorts = [];
  const search = [];

  NAV.chapters = chapters.filter((c) => c.num !== 'appendix').map((c) => ({
    n: c.num, title: c.title, file: chFile(c.num), world: c.part.roman,
    emoji: CHAPTERS[c.num]?.emoji || '📘', color: WORLDS[c.part.roman].color,
  }));

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(DIST, 'assets', 'vendor'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'node_modules/roughjs/bundled/rough.js'), path.join(DIST, 'assets/vendor/rough.js'));
  // Hand-written page (not generated from the guide): copied as-is.
  fs.copyFileSync(path.join(ROOT, 'animation.html'), path.join(DIST, 'animation.html'));

  const siteChapters = [];

  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const isApp = c.num === 'appendix';
    const meta = CHAPTERS[c.num] || {};
    const world = WORLDS[c.part.roman];
    const { intro, secs } = splitSections(c.lines);
    const selfNum = isApp ? -1 : c.num;
    const words = c.lines.join(' ').replace(/```[\s\S]*?```/g, ' ').split(/\s+/).length;
    const mins = Math.max(2, Math.round(words / 200));
    let widgetCount = 0;

    const chapterLevel = (PLACEMENTS[String(c.num)] || []).map((w) => { widgetCount++; return widgetSlot(w); }).join('');
    const introHtml = renderMd(intro, selfNum, null);

    const secHtml = secs.map((s) => {
      let body = renderMd(s.lines, selfNum, s.num);
      const widgets = (PLACEMENTS[s.num] || []).map((w) => { widgetCount++; return widgetSlot(w); }).join('');
      const pc = PROSCONS[s.num] ? renderProsCons(PROSCONS[s.num]) : '';
      const titleHtml = md.parseInline(s.title);
      const sec = `<section class="sec${s.num ? ' sec-' + s.num.replace('.', '-') : ''}" id="${s.id}" data-sec="${s.id}">
<h2 class="sec-title">${s.num ? `<span class="sec-num">${s.num}</span>` : ''}<span class="sec-text">${titleHtml}</span><a class="sec-anchor" href="#${s.id}" aria-label="Link to this section">#</a></h2>
<div class="prose">${body}</div>${widgets}${pc}
<div class="sec-done" aria-hidden="true"><span>✔ section read</span></div>
</section>`;
      // collect shorts + search
      const url = `${chFile(c.num)}#${s.id}`;
      search.push({ t: (s.num ? s.num + ' ' : '') + stripTags(titleHtml), c: isApp ? 'Appendix' : 'Ch ' + c.num, u: url, x: stripTags(body).slice(0, 4000) });
      for (const m of body.matchAll(/<(aside|div) class="callout (key|story|warn)">([\s\S]*?)<\/\1>/g)) {
        const text = stripTags(m[3]);
        if (text.length > 30 && text.length < 760) shorts.push({ t: m[2], ch: c.num, chTitle: c.title, sec: s.num, secTitle: stripTags(titleHtml), url, html: m[3].replace(/<a class="xref"[^>]*>(.*?)<\/a>/g, '$1') });
      }
      return sec;
    }).join('\n');

    const xpAvail = secs.length * 5 + widgetCount * 15 + (meta.quiz ? meta.quiz.length * 20 + 50 : 0);
    const prev = i === 0 ? { file: 'start.html', title: 'Start here' } : { file: chFile(chapters[i - 1].num), title: chapters[i - 1].title };
    const next = chapters[i + 1] ? { file: chFile(chapters[i + 1].num), title: chapters[i + 1].title, num: chapters[i + 1].num } : null;
    const nextMeta = next ? CHAPTERS[next.num] || {} : {};

    const boss = meta.quiz ? `<section class="boss" id="boss" aria-labelledby="boss-title">
<div class="boss-head"><span class="boss-emoji">👾</span><div><p class="boss-kicker">Boss battle · Chapter ${c.num}</p><h2 id="boss-title">Beat the quiz, win a 🔑 key fragment</h2><p>Answer all ${meta.quiz.length} questions. Each correct answer is worth 20 XP. The fragment opens <a href="index.html#vault">the Vault</a>.</p></div></div>
<div class="quiz" id="quiz"></div>
<div class="fragment" id="fragment" hidden><div class="frag-card"><p>🔑 Key fragment ${c.num} of ${NQUIZ}</p><b class="frag-word" id="fragWord">?????</b><small>Saved automatically. Collect all ${NQUIZ} to open the Vault.</small></div></div>
</section>` : '';

    const nextCard = next ? `<nav class="next-card world-${WORLDS[chapters[i + 1].part.roman].color}" aria-label="Next chapter">
<p class="next-kicker">⏭️ Up next · ${next.num === 'appendix' ? 'Appendix' : 'Chapter ' + next.num}</p>
<h3>${esc(next.title)}</h3>
${nextMeta.hook ? `<p class="next-hook">${esc(nextMeta.hook)}</p>` : ''}
<div class="next-actions"><a class="btn big" href="${next.file}">Keep going →</a><a class="btn ghost" href="shorts.html">or swipe a few Shorts ▶</a></div>
</nav>` : `<nav class="next-card world-grape"><p class="next-kicker">🏁 The end</p><h3>You made it through the whole guide!</h3><div class="next-actions"><a class="btn big" href="index.html#vault">Open the Vault 🔓</a></div></nav>`;

    const body = `<div class="chapter-layout">
<aside class="side-toc" id="sideToc" aria-label="Sections in this chapter"><div class="side-inner"><p class="side-title">${meta.emoji || '📚'} In this chapter</p><ol>${secs.map((s) => `<li><a href="#${s.id}" data-sec="${s.id}"><span class="st-num">${s.num || '•'}</span><span class="st-t">${stripTags(md.parseInline(s.title))}</span></a></li>`).join('')}${meta.quiz ? '<li><a href="#boss" data-sec="boss"><span class="st-num">👾</span><span class="st-t">Boss battle</span></a></li>' : ''}</ol></div></aside>
<article class="chapter" data-ch="${c.num}">
<header class="ch-hero world-${world.color}">
  <div class="ch-hero-text">
    <a class="world-chip" href="index.html#world-${world.n}">${world.emoji} World ${world.n} · ${esc(c.part.title)}</a>
    <p class="ch-num">${isApp ? 'Appendix' : 'Chapter ' + c.num}</p>
    <h1 class="ch-title">${esc(c.title)}</h1>
    ${meta.hook ? `<p class="ch-hook"><span>🤔</span> ${esc(meta.hook)}</p>` : ''}
    <ul class="ch-stats"><li>⏱️ ~${mins} min</li><li>📚 ${secs.length} sections</li>${widgetCount ? `<li>🎮 ${widgetCount} interactive</li>` : ''}<li>⭐ ${xpAvail} XP</li>${meta.quiz ? '<li>🔑 1 fragment</li>' : ''}</ul>
  </div>
  <div class="ch-doodle" data-doodle="${c.num}" aria-hidden="true"></div>
</header>
${chapterLevel}
<div class="prose ch-intro">${introHtml}</div>
${secHtml}
${boss}
${nextCard}
<p class="prevnext"><a href="${prev.file}">← ${esc(prev.title)}</a></p>
</article>
</div>`;

    const pageData = { ch: c.num, title: c.title, quiz: meta.quiz || null, fragment: meta.fragment || null, secs: secs.map((s) => s.id) };
    const scripts = isApp ? [] : [`assets/js/widgets-${widgetFileFor(c.num)}.js`];
    fs.writeFileSync(path.join(DIST, chFile(c.num)), page({
      title: `${isApp ? 'Appendix' : 'Ch ' + c.num}: ${c.title} · CryptoSketch`,
      desc: meta.hook || c.title,
      body, bodyClass: `page-chapter world-${world.color}`, scripts,
      inline: `<script>window.PAGE=${JSON.stringify(pageData)};</script>`,
    }));

    siteChapters.push({ n: c.num, title: c.title, file: chFile(c.num), world: world.n, color: world.color, emoji: meta.emoji || '📚', mins, secs: secs.map((s) => s.id), quiz: !!meta.quiz, hook: meta.hook || '' });
    if (meta.quiz) meta.quiz.forEach((q, qi) => shorts.push({ t: 'quiz', ch: c.num, chTitle: c.title, url: chFile(c.num), q: q.q, o: q.o, a: q.a, why: q.why, id: `q${c.num}-${qi}` }));
  }

  // ---------------- Start page (How to read + setup) and landing page
  const preText = pre.join('\n');
  const howIdx = preText.indexOf('## How to Read This Guide');
  const tocIdx = preText.indexOf('## Table of Contents');
  const introMd = preText.slice(0, howIdx).replace(/^# .+$/m, '').replace(/^### .+$/m, '').replace(/^---\s*$/gm, '');
  const howMd = preText.slice(howIdx, tocIdx).replace(/^---\s*$/gm, '');
  const subtitle = (preText.match(/^### (.+)$/m) || [, ''])[1];
  const title = (preText.match(/^# (.+)$/m) || [, 'Cryptography, Explained'])[1];

  fs.writeFileSync(path.join(DIST, 'start.html'), page({
    title: 'Start here · CryptoSketch', desc: 'How to read this guide and set up your lab.',
    bodyClass: 'page-chapter world-sun', scripts: ['assets/js/widgets-a.js'],
    inline: `<script>window.PAGE=${JSON.stringify({ ch: 0, title: 'Start here', quiz: null, secs: [] })};</script>`,
    body: `<div class="chapter-layout single"><article class="chapter" data-ch="0">
<header class="ch-hero world-sun"><div class="ch-hero-text"><span class="world-chip">🧭 Before you begin</span><p class="ch-num">Start here</p><h1 class="ch-title">How to read this guide</h1><p class="ch-hook"><span>🎒</span> Grab a coffee. You need no math degree and no programming background. Just curiosity.</p></div><div class="ch-doodle" data-doodle="0" aria-hidden="true"></div></header>
<div class="widget" data-w="howtoplay"></div>
<section class="sec" id="s-how" data-sec="s-how"><div class="prose">${decorate(md.parse(howMd), 0, null)}</div></section>
<nav class="next-card world-sun"><p class="next-kicker">⏭️ Up next · Chapter 1</p><h3>${esc(chapters[0].title)}</h3><p class="next-hook">${esc(CHAPTERS[1].hook)}</p><div class="next-actions"><a class="btn big" href="chapter-01.html">Let’s go →</a></div></nav>
</article></div>`,
  }));

  const worldsHtml = Object.entries(WORLDS).map(([roman, w]) => {
    const list = siteChapters.filter((c) => c.world === w.n && c.n !== 'appendix');
    return `<section class="world world-${w.color}" id="world-${w.n}"><div class="world-banner"><span class="wb-emoji">${w.emoji}</span><div><p>World ${w.n}</p><h3>${esc(w.name)}</h3></div></div>
<ol class="levels">${list.map((c, k) => `<li class="level ${k % 2 ? 'r' : 'l'}" data-ch="${c.n}"><a href="${c.file}"><span class="lv-node"><span class="lv-emoji">${c.emoji}</span><span class="lv-n">${c.n}</span></span><span class="lv-card"><b>${esc(c.title)}</b><small>⏱️ ${c.mins} min · <span class="lv-state">not started</span></small></span></a></li>`).join('')}</ol></section>`;
  }).join('');

  fs.writeFileSync(path.join(DIST, 'index.html'), page({
    title: `${title}: the interactive sketchbook`, desc: subtitle,
    bodyClass: 'page-home', scripts: ['assets/js/home.js'],
    body: `<section class="hero">
  <div class="hero-text">
    <p class="hero-kicker">✏️ the interactive sketchbook edition</p>
    <h1 class="hero-title">${esc(title)}</h1>
    <p class="hero-sub">${esc(subtitle)}</p>
    <p class="decrypt-line" aria-live="polite"><span id="decrypt">Every secret on the internet is guarded by math. Let’s learn how.</span></p>
    <div class="hero-actions"><a class="btn big" id="ctaStart" href="start.html">▶ Start the journey</a><a class="btn ghost" href="shorts.html">⚡ 60-second Shorts</a><a class="btn ghost" href="animation.html">🎬 2-minute animation</a></div>
    <p class="hero-meta">${MAXCH} chapters · 80 interactive demos (many running real crypto) · 150+ pros &amp; cons cards · 1 locked vault</p>
  </div>
  <div class="hero-doodle" data-doodle="hero" aria-hidden="true"></div>
</section>
<section class="continue-card" id="continueCard" hidden></section>
<section class="intro-page prose">${decorate(md.parse(introMd), 0, null)}</section>
<section class="vault" id="vault" aria-labelledby="vault-title">
  <div class="vault-head"><span class="vault-icon" id="vaultIcon">🔒</span><div><p class="vault-kicker">The mystery</p><h2 id="vault-title">A secret message is locked in this vault</h2><p>It’s encrypted with real <b>AES-256-GCM</b>. The key is stretched with <b>PBKDF2</b> from ${NQUIZ} words. Beat each chapter’s boss quiz to earn one word. Collect all ${NQUIZ} and the vault opens.</p></div></div>
  <div class="vault-cipher"><span>ciphertext:</span> <code id="vaultCt"></code></div>
  <ol class="vault-slots" id="vaultSlots"></ol>
  <div class="vault-actions"><button class="btn" id="vaultOpen" type="button" disabled>🔓 Try to open</button><span id="vaultHint"></span></div>
  <div class="vault-msg" id="vaultMsg" hidden></div>
</section>
<section class="map" aria-labelledby="map-title"><h2 id="map-title" class="map-title">🗺️ Your journey: ${Object.keys(WORLDS).length} worlds, ${MAXCH} levels</h2>
<p class="map-sub">Read a section, play with a demo, beat a boss. Every action earns XP. Your progress stays in this browser.</p>
<div class="level start-level"><a href="start.html"><span class="lv-node"><span class="lv-emoji">🧭</span><span class="lv-n">0</span></span><span class="lv-card"><b>Start here</b><small>How to read this guide</small></span></a></div>
${worldsHtml}
<div class="level start-level"><a href="appendix.html"><span class="lv-node"><span class="lv-emoji">📚</span><span class="lv-n">+</span></span><span class="lv-card"><b>Appendix: Where to Learn More</b><small>Books, courses, practice</small></span></a></div>
</section>`,
  }));

  // ---------------- Shorts page
  fs.writeFileSync(path.join(DIST, 'shorts.html'), page({
    title: 'Crypto Shorts · CryptoSketch', desc: 'Bite-sized cryptography: key ideas, true stories and quick quizzes.',
    bodyClass: 'page-shorts', scripts: ['assets/js/shorts-data.js', 'assets/js/shorts.js'],
    body: `<div class="shorts" id="shorts" tabindex="0" aria-label="Crypto Shorts feed. Use arrow keys to move."></div><div class="shorts-hud"><span id="shortsCount"></span></div>`,
  }));

  // ---------------- data files
  const pass = Object.keys(CHAPTERS).map(Number).sort((a, b) => a - b).map((k) => CHAPTERS[k].fragment).join('-');
  const salt = crypto.createHash('sha256').update('cryptosketch-vault-salt').digest().subarray(0, 16);
  const iv = crypto.createHash('sha256').update('cryptosketch-iv|' + VAULT_MESSAGE).digest().subarray(0, 12);
  const iter = 200000;
  const key = crypto.pbkdf2Sync(pass, salt, iter, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(VAULT_MESSAGE, 'utf8'), cipher.final(), cipher.getAuthTag()]);

  const site = {
    chapters: siteChapters,
    worlds: Object.values(WORLDS),
    vault: { salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'), iter, n: NQUIZ },
  };
  fs.writeFileSync(path.join(DIST, 'assets/js/site-data.js'), `window.SITE=${JSON.stringify(site)};\n`);
  fs.writeFileSync(path.join(DIST, 'assets/js/shorts-data.js'), `window.SHORTS=${JSON.stringify(shorts)};\n`);
  fs.writeFileSync(path.join(DIST, 'assets/js/search-index.js'), `window.SEARCH=${JSON.stringify(search)};\n`);

  const pages = fs.readdirSync(DIST).filter((f) => f.endsWith('.html'));
  console.log(`✔ Built ${pages.length} pages, ${shorts.length} shorts, ${search.length} searchable sections → ${path.relative(process.cwd(), DIST) || 'dist'}/`);
}

build();
