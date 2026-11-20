# Wasm Sketchbook

A hand-drawn, mobile-friendly learning site about WebAssembly, built from
[`../webassembly-explained.md`](../webassembly-explained.md).

Plain HTML, CSS and JavaScript: no build step, no frameworks, no dependencies
except Google Fonts (it falls back to system handwriting fonts offline).

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8765 --directory site
```

Then visit http://localhost:8765. Any static host (GitHub Pages, Netlify,
Cloudflare Pages, S3) can serve the `site/` folder as is.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Home page: hero sketch and chapter map |
| `01-…12-*.html` | One page per chapter |
| `assets/css/sketch.css` | Paper, pencils, highlighters; light sketchbook + dark chalkboard themes |
| `assets/js/sketch.js` | Draws the wobbly hand-drawn outlines and arrows; redraws on resize |
| `assets/js/site.js` | Chapter list, top bar, drawer, prev/next, theme toggle, "visited" ticks |
| `assets/js/widgets.js` | Flip cards, step-through diagrams, module explorer, stack machine, memory demo, speed race, quiz |

## Adding or changing content

- **New chapter:** copy a chapter page, set `<body data-page="your-id">`, and add
  an entry to `CHAPTERS` at the top of `assets/js/site.js`. Navigation, the
  pager and the home map update automatically.
- **Sketchy box:** any element with class `sk-box` (or `sk-btn` for buttons)
  gets a hand-drawn outline. Colour it with `data-fill="yellow|blue|green|pink|purple|orange|paper|gray"`.
  Modifiers: `dashed`, `thick`, `quiet`, `blue-line`, `red-line`, `green-line`.
- **Arrow:** `<span class="sk-arrow"></span>`. Inside a `.flow`, arrows point
  right on desktop and down on phones.
- **Step-through diagram:** wrap boxes in `.stepper`, give each box a
  `data-step-id`, and list the steps in a hidden
  `<ol class="stepper-steps">` whose `<li data-on="id1,id2">` say which boxes
  light up.
- **Flip card:** `.flip > .flip-inner > .flip-face.flip-front + .flip-face.flip-back`.
- **Quiz questions** live in the `QUIZ` array in `assets/js/widgets.js`.

Facts were checked as of November 2026; the sources are listed on the quiz page.
