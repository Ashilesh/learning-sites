/* ==========================================================
   widgets.js — the interactive bits
   Flip cards, step-through diagrams, click-to-explain,
   the stack machine, the memory demo, the speed race and
   the quiz. Each widget only starts if its markup exists.
   ========================================================== */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function refresh(root) { if (window.Sketch) window.Sketch.refresh(root); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- flip cards ---------- */
  function initFlips() {
    $all('.flip').forEach(function (card) {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', 'false');
      function toggle() {
        var on = card.classList.toggle('flipped');
        card.setAttribute('aria-pressed', String(on));
      }
      card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        toggle();
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
    $all('[data-flip-all]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = document.getElementById(btn.getAttribute('data-flip-all'));
        if (!group) return;
        var cards = $all('.flip', group);
        var anyFront = cards.some(function (c) { return !c.classList.contains('flipped'); });
        cards.forEach(function (c) {
          c.classList.toggle('flipped', anyFront);
          c.setAttribute('aria-pressed', String(anyFront));
        });
        btn.textContent = anyFront ? 'Flip all back' : 'Flip them all';
        refresh(btn.parentNode);
      });
    });
  }

  /* ---------- steppers: walk through a diagram ---------- */
  function initSteppers() {
    $all('.stepper').forEach(function (root) {
      var list = $('.stepper-steps', root);
      if (!list) return;
      var steps = $all('li', list);
      var targets = $all('[data-step-id]', root);
      var i = 0;
      var timer = null;

      var caption = document.createElement('div');
      caption.className = 'stepper-caption sk-box';
      caption.setAttribute('data-fill', 'paper');
      caption.setAttribute('aria-live', 'polite');

      var controls = document.createElement('div');
      controls.className = 'stepper-controls btn-row';
      controls.innerHTML =
        '<button type="button" class="sk-btn small" data-fill="paper" data-act="prev">← Back</button>' +
        '<span class="stepper-count"></span>' +
        '<button type="button" class="sk-btn small" data-fill="yellow" data-act="next">Next →</button>' +
        '<button type="button" class="sk-btn small" data-fill="paper" data-act="play">▶ Play all</button>';

      list.parentNode.insertBefore(caption, list);
      list.parentNode.insertBefore(controls, list);

      var prevBtn = $('[data-act="prev"]', controls);
      var nextBtn = $('[data-act="next"]', controls);
      var playBtn = $('[data-act="play"]', controls);
      var count = $('.stepper-count', controls);

      function idsOf(li) {
        return (li.getAttribute('data-on') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      }

      function show(n) {
        i = Math.max(0, Math.min(steps.length - 1, n));
        var on = idsOf(steps[i]);
        var before = [];
        for (var k = 0; k < i; k++) before = before.concat(idsOf(steps[k]));
        targets.forEach(function (t) {
          var id = t.getAttribute('data-step-id');
          t.classList.toggle('is-active', on.indexOf(id) >= 0);
          t.classList.toggle('is-done', on.indexOf(id) < 0 && before.indexOf(id) >= 0);
        });
        caption.innerHTML = '<span class="step-no">Step ' + (i + 1) + '.</span>' + steps[i].innerHTML;
        count.textContent = (i + 1) + ' / ' + steps.length;
        prevBtn.disabled = i === 0;
        nextBtn.disabled = i === steps.length - 1;
        refresh(caption.parentNode);
      }

      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
        playBtn.textContent = '▶ Play all';
      }

      prevBtn.addEventListener('click', function () { stop(); show(i - 1); });
      nextBtn.addEventListener('click', function () { stop(); show(i + 1); });
      playBtn.addEventListener('click', function () {
        if (timer) { stop(); return; }
        if (i >= steps.length - 1) show(0);
        playBtn.textContent = '❚❚ Pause';
        timer = setInterval(function () {
          if (i >= steps.length - 1) { stop(); return; }
          show(i + 1);
        }, parseInt(root.getAttribute('data-speed') || '2600', 10));
      });

      show(0);
    });
  }

  /* ---------- explorers: tap a part, read about it ---------- */
  function initExplorers() {
    $all('.explorer').forEach(function (root) {
      var out = $('.explorer-out', root);
      var buttons = $all('[data-explain]', root);
      function pick(btn) {
        var key = btn.getAttribute('data-explain');
        var tpl = $('template[data-for="' + key + '"]', root);
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-selected', on);
          b.classList.toggle('is-active', on && b.classList.contains('sk-box'));
          b.setAttribute('aria-pressed', String(on));
        });
        if (tpl && out) {
          out.innerHTML = tpl.innerHTML;
          refresh(out.parentNode);
        }
      }
      buttons.forEach(function (btn) {
        if (btn.tagName !== 'BUTTON') {
          btn.setAttribute('role', 'button');
          btn.setAttribute('tabindex', '0');
          btn.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(btn); }
          });
        }
        btn.setAttribute('aria-pressed', 'false');
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', function () { pick(btn); });
      });
    });
  }

  /* ---------- stack machine playground ---------- */
  var PROGRAMS = [
    {
      label: '2 + 3',
      code: [['i32.const 2', 'push', 2], ['i32.const 3', 'push', 3], ['i32.add', 'add']]
    },
    {
      label: '(2 + 3) × 4',
      code: [['i32.const 2', 'push', 2], ['i32.const 3', 'push', 3], ['i32.add', 'add'], ['i32.const 4', 'push', 4], ['i32.mul', 'mul']]
    },
    {
      label: 'add(a = 7, b = 5)',
      code: [['local.get $a', 'local', 7, 'a'], ['local.get $b', 'local', 5, 'b'], ['i32.add', 'add']]
    },
    {
      label: '10 − 4',
      code: [['i32.const 10', 'push', 10], ['i32.const 4', 'push', 4], ['i32.sub', 'sub']]
    }
  ];

  function initStackMachine() {
    var root = document.getElementById('stack-machine');
    if (!root) return;
    var prog = PROGRAMS[0];
    var pc = 0;
    var stack = [];

    root.innerHTML =
      '<div class="btn-row sm-programs" role="group" aria-label="Pick a program"></div>' +
      '<div class="sm" style="margin-top:18px">' +
      '<div class="sk-box code-card" data-fill="paper"><div class="code-title">The program</div><ol class="sm-code"></ol></div>' +
      '<div class="sm-stack-wrap"><div class="sm-stack" aria-live="polite" aria-label="The stack"></div><div class="sm-label">the stack (top is the newest)</div></div>' +
      '</div>' +
      '<div class="sm-explain sk-box" data-fill="blue" aria-live="polite"></div>' +
      '<div class="btn-row" style="margin-top:14px">' +
      '<button type="button" class="sk-btn" data-fill="yellow" data-sm="step">Step →</button>' +
      '<button type="button" class="sk-btn" data-fill="paper" data-sm="reset">↺ Reset</button></div>';

    var picker = $('.sm-programs', root);
    PROGRAMS.forEach(function (p, n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sk-btn small';
      b.setAttribute('data-fill', 'paper');
      b.textContent = p.label;
      b.addEventListener('click', function () { prog = PROGRAMS[n]; reset(); });
      picker.appendChild(b);
    });

    var codeList = $('.sm-code', root);
    var stackEl = $('.sm-stack', root);
    var explain = $('.sm-explain', root);
    var stepBtn = $('[data-sm="step"]', root);

    function renderCode() {
      codeList.innerHTML = prog.code.map(function (line, n) {
        var cls = n < pc ? 'done' : (n === pc ? 'current' : '');
        return '<li class="' + cls + '">' + esc(line[0]) + '</li>';
      }).join('');
    }
    function renderStack() {
      stackEl.innerHTML = stack.map(function (v, n) {
        var isTop = n === stack.length - 1;
        return '<div class="sm-plate sk-box' + (isTop ? ' new' : '') + '" data-fill="yellow">' + v + '</div>';
      }).join('');
      refresh(stackEl);
    }
    function say(html) { explain.innerHTML = html; refresh(root); }

    function reset() {
      pc = 0;
      stack = [];
      $all('.sm-programs .sk-btn', root).forEach(function (b) {
        b.classList.toggle('is-selected', b.textContent === prog.label);
      });
      renderCode();
      renderStack();
      stepBtn.disabled = false;
      say('Program <strong>' + esc(prog.label) + '</strong> is loaded. Press <em>Step</em> to run one instruction at a time.');
    }

    function step() {
      if (pc >= prog.code.length) return;
      var line = prog.code[pc];
      var op = line[1];
      var msg = '';
      if (op === 'push') {
        stack.push(line[2]);
        msg = '<code>' + esc(line[0]) + '</code>: put the number <strong>' + line[2] + '</strong> on top of the stack.';
      } else if (op === 'local') {
        stack.push(line[2]);
        msg = '<code>' + esc(line[0]) + '</code>: read parameter <strong>' + line[3] + '</strong> (it is ' + line[2] + ') and push it.';
      } else {
        var b = stack.pop();
        var a = stack.pop();
        var res = op === 'add' ? a + b : op === 'mul' ? a * b : a - b;
        var sym = op === 'add' ? '+' : op === 'mul' ? '×' : '−';
        stack.push(res);
        msg = '<code>' + esc(line[0]) + '</code>: take the top two (' + a + ' and ' + b + '), work out ' + a + ' ' + sym + ' ' + b + ', push <strong>' + res + '</strong>.';
      }
      pc++;
      renderCode();
      renderStack();
      if (pc >= prog.code.length) {
        msg += ' <br>Done! The answer, <strong>' + stack[stack.length - 1] + '</strong>, is left on top. That is the function’s result.';
        stepBtn.disabled = true;
      }
      say(msg);
    }

    stepBtn.addEventListener('click', step);
    $('[data-sm="reset"]', root).addEventListener('click', reset);
    reset();
  }

  /* ---------- memory demo: passing a string ---------- */
  function initMemoryDemo() {
    var root = document.getElementById('memory-demo');
    if (!root) return;
    var BASE = 1024;
    root.innerHTML =
      '<label for="mem-text" class="box-title" style="font-size:1.35rem">Type something for Wasm to read:</label>' +
      '<input id="mem-text" class="mem-input" type="text" maxlength="12" value="Hi Wasm!" autocomplete="off" spellcheck="false">' +
      '<div class="mem-cells" aria-label="Linear memory, addresses ' + BASE + ' onward"></div>' +
      '<div class="mem-out sk-box" data-fill="blue" aria-live="polite"></div>';
    var input = $('#mem-text', root);
    var cells = $('.mem-cells', root);
    var out = $('.mem-out', root);
    var enc = 'TextEncoder' in window ? new TextEncoder() : null;

    function bytesOf(str) {
      if (enc) return Array.prototype.slice.call(enc.encode(str));
      return str.split('').map(function (c) { return c.charCodeAt(0) & 255; });
    }

    function render() {
      var str = input.value;
      var bytes = bytesOf(str);
      var total = Math.min(32, Math.max(16, Math.ceil(bytes.length / 8) * 8));
      var html = '';
      for (var n = 0; n < total; n++) {
        var has = n < bytes.length;
        var b = has ? bytes[n] : 0;
        var ch = has && b >= 32 && b < 127 ? String.fromCharCode(b) : (has ? '•' : '');
        html += '<div class="mem-cell' + (has ? ' filled' : '') + (n === 0 ? ' ptr' : '') + '">' +
          '<span class="mem-addr">' + (BASE + n) + '</span>' +
          '<span class="mem-byte">' + (has ? b : 0) + '</span>' +
          '<span class="mem-char">' + esc(ch) + '</span></div>';
      }
      cells.innerHTML = html;
      out.innerHTML = bytes.length
        ? 'JavaScript wrote <strong>' + bytes.length + ' bytes</strong> into Wasm’s memory, starting at address <strong>' + BASE + '</strong> (the red box). ' +
          'Wasm only receives two numbers: <code>shout(' + BASE + ', ' + bytes.length + ')</code> — “start here, read this many”.'
        : 'Nothing to send yet. Type a word above.';
      refresh(root);
    }
    input.addEventListener('input', render);
    render();
  }

  /* ---------- speed race (illustrative) ---------- */
  function initRace() {
    var root = document.getElementById('speed-race');
    if (!root || !window.Sketch) return;
    var P = window.Sketch.polyline;
    var jsPts = [[60, 270], [112, 270], [150, 232], [225, 216], [262, 172], [322, 122], [350, 120], [362, 205], [395, 203], [436, 112], [570, 100]];
    var wasmPts = [[60, 270], [92, 268], [112, 150], [205, 142], [245, 92], [570, 84]];
    var axes = P([[60, 30], [60, 272], [575, 272]], 5, 0.6);

    root.innerHTML =
      '<svg class="doodle" viewBox="0 0 600 330" role="img" aria-label="Sketch: Wasm reaches steady speed early, JavaScript warms up in steps and dips when a guess fails">' +
      '<path class="axis wob" d="' + axes + '"/>' +
      '<path class="axis" d="M52 42 L60 30 L68 42 M563 264 L575 272 L563 280"/>' +
      '<text x="70" y="40" class="t-soft">speed ↑</text>' +
      '<text x="490" y="300" class="t-soft">time →</text>' +
      '<path class="line js" d="' + P(jsPts, 21, 1) + '"/>' +
      '<path class="line wasm" d="' + P(wasmPts, 42, 1) + '"/>' +
      '<g class="race-labels" style="opacity:0;transition:opacity .4s">' +
      '<text x="70" y="300" class="t-sm t-soft">download + parse</text>' +
      '<text x="118" y="170" class="t-sm t-blue">Wasm: running early (Liftoff)</text>' +
      '<text x="262" y="70" class="t-sm t-blue">hot code optimized</text>' +
      '<text x="160" y="258" class="t-sm" style="fill:var(--orange)">JS: interpreting, watching types</text>' +
      '<text x="352" y="230" class="t-sm t-red">deopt!</text>' +
      '</g>' +
      '<g transform="translate(430 196)"><rect x="0" y="0" width="140" height="62" rx="8" class="f-paper" style="stroke:var(--pencil);stroke-width:1.5"/>' +
      '<path d="M12 20h30" class="line wasm"/><text x="50" y="26" class="t-sm">WebAssembly</text>' +
      '<path d="M12 44h30" class="line js"/><text x="50" y="50" class="t-sm">JavaScript</text></g>' +
      '</svg>' +
      '<div class="btn-row" style="margin-top:8px"><button type="button" class="sk-btn" data-fill="yellow">▶ Start the race</button></div>';

    var lines = $all('.line.js, .line.wasm', root).slice(0, 2);
    var labels = $('.race-labels', root);
    function hide() {
      lines.forEach(function (l) {
        var len = l.getTotalLength();
        l.style.transition = 'none';
        l.style.strokeDasharray = len;
        l.style.strokeDashoffset = len;
      });
      labels.style.opacity = 0;
    }
    function run() {
      hide();
      // force layout so the transition restarts
      void root.offsetWidth;
      lines.forEach(function (l, n) {
        l.style.transition = 'stroke-dashoffset ' + (n === 0 ? 3.2 : 2.6) + 's ease-in-out';
        l.style.strokeDashoffset = 0;
      });
      setTimeout(function () { labels.style.opacity = 1; }, 1400);
    }
    hide();
    $('button', root).addEventListener('click', run);
    refresh(root);
  }

  /* ---------- quiz ---------- */
  var QUIZ = [
    { q: 'What is a .wasm file?', a: ['A human-readable script, like JavaScript', 'A compact binary instruction format', 'An image format for the web', 'A browser extension'], c: 1, why: 'Wasm is bytes, not text. The readable .wat format exists only for learning and debugging.' },
    { q: 'Who usually writes WebAssembly?', a: ['You, by hand, instruction by instruction', 'A compiler, from C, C++, Rust, Go, Kotlin and others', 'The browser, while you browse', 'The GPU'], c: 1, why: 'Wasm is a compilation target: toolchains like Emscripten, rustc and Kotlin/Wasm produce it.' },
    { q: 'How does Wasm change the page (the DOM) today?', a: ['It edits the DOM directly', 'Through JavaScript functions it imports', 'Through the GPU', 'Through WASI'], c: 1, why: 'Wasm has no direct DOM access. Glue code (wasm-bindgen, Emscripten) passes its requests to JavaScript.' },
    { q: 'What is linear memory?', a: ['A tree of JavaScript objects', 'One big, resizable array of bytes', 'A database built into the browser', 'The graphics card’s video memory'], c: 1, why: 'It is the module’s private countertop: numbered bytes it can read and write, and nothing outside.' },
    { q: 'Why can engines compile Wasm so quickly?', a: ['Wasm files skip validation', 'Every type is declared up front, so there is no guessing', 'Wasm runs on the GPU', 'Wasm code never needs machine code'], c: 1, why: 'JS engines spend effort discovering types. Wasm states them, so the engine goes straight to machine code.' },
    { q: 'In Chrome (V8), which compiler gets Wasm running first?', a: ['Liftoff', 'TurboFan', 'Ignition', 'Maglev'], c: 0, why: 'Liftoff is the one-pass baseline compiler. Hot functions are later recompiled by TurboFan in the background.' },
    { q: 'Optimized JavaScript guessed “x is always a number”, then x becomes a string. What happens?', a: ['The page crashes', 'The engine deoptimizes back to slower code', 'Validation fails and the script is rejected', 'The garbage collector deletes x'], c: 1, why: 'That fallback is called deoptimization. Wasm avoids it because its types never change.' },
    { q: 'How does Wasm reach the GPU?', a: ['With its own GPU instructions', 'Through WebGL or WebGPU, via JavaScript and the browser’s GPU process', 'By talking to the driver directly', 'Through linear memory'], c: 1, why: 'Every call is checked and passed to a separate, privileged GPU process. That is what keeps 3D on the web safe.' },
    { q: 'Which of these is NOT part of Wasm 3.0?', a: ['Garbage collection', 'Exception handling', 'Direct DOM access', '64-bit memory'], c: 2, why: 'Wasm 3.0 (Sept 2025) added GC, exceptions, 64-bit memory and more. There is no active proposal for direct DOM access.' },
    { q: 'What does JS Promise Integration (JSPI) help with?', a: ['Drawing faster graphics', 'Letting synchronous Wasm code wait on async web APIs', 'Making .wasm files smaller', 'Sharing GC objects between threads'], c: 1, why: 'Most C, C++ and Rust code expects blocking calls. JSPI lets it pause until a JavaScript promise settles.' }
  ];

  function initQuiz() {
    var root = document.getElementById('quiz');
    if (!root) return;
    var BEST = 'wasm-sketchbook-best-score';
    var answered = 0;
    var score = 0;
    var html = '';
    QUIZ.forEach(function (item, n) {
      html += '<div class="q" data-q="' + n + '"><div class="q-text"><span class="q-no">' + (n + 1) + '.</span>' + esc(item.q) + '</div><div class="q-options">';
      item.a.forEach(function (opt, k) {
        html += '<button type="button" class="sk-btn" data-fill="paper" data-k="' + k + '">' + esc(opt) + '</button>';
      });
      html += '</div><div class="q-feedback" aria-live="polite"></div></div>';
    });
    html += '<div class="sk-box" data-fill="yellow" id="quiz-result"><span class="quiz-score">Score: 0 / ' + QUIZ.length + '</span><p class="small muted" style="margin:4px 0 0">Answer all ten to see how you did.</p></div>' +
      '<div class="btn-row" style="margin-top:14px"><button type="button" class="sk-btn" data-fill="paper" id="quiz-reset">↺ Try again</button></div>';
    root.innerHTML = html;

    var result = $('#quiz-result', root);
    function best() {
      try { return parseInt(window.localStorage.getItem(BEST) || '0', 10) || 0; } catch (e) { return 0; }
    }
    function paintResult() {
      var msg;
      if (answered < QUIZ.length) {
        msg = 'Answer all ten to see how you did.';
      } else if (score === QUIZ.length) {
        msg = 'Perfect! You could teach this.';
      } else if (score >= 7) {
        msg = 'Great work. Revisit the chapters behind the ones you missed.';
      } else {
        msg = 'Good start. Flip back through the sketches and try again.';
      }
      var b = best();
      result.innerHTML = '<span class="quiz-score">Score: ' + score + ' / ' + QUIZ.length + '</span>' +
        '<p class="small muted" style="margin:4px 0 0">' + msg + (b ? ' Your best so far: ' + b + ' / ' + QUIZ.length + '.' : '') + '</p>';
      refresh(root);
    }

    $all('.q', root).forEach(function (qEl) {
      var item = QUIZ[parseInt(qEl.getAttribute('data-q'), 10)];
      var fb = $('.q-feedback', qEl);
      $all('.q-options .sk-btn', qEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (qEl.getAttribute('data-done')) return;
          qEl.setAttribute('data-done', '1');
          var k = parseInt(btn.getAttribute('data-k'), 10);
          var ok = k === item.c;
          answered++;
          if (ok) score++;
          $all('.q-options .sk-btn', qEl).forEach(function (b, idx) {
            if (idx === item.c) b.classList.add('correct');
            else if (b === btn) b.classList.add('wrong');
            b.disabled = idx !== item.c && b !== btn;
          });
          fb.className = 'q-feedback ' + (ok ? 'ok' : 'no');
          fb.textContent = (ok ? 'Yes! ' : 'Not quite. ') + item.why;
          if (answered === QUIZ.length) {
            try { if (score > best()) window.localStorage.setItem(BEST, String(score)); } catch (e) { /* ignore */ }
          }
          paintResult();
        });
      });
    });

    $('#quiz-reset', root).addEventListener('click', function () {
      initQuizReset(root);
    });
    paintResult();
    refresh(root);
  }
  function initQuizReset(root) {
    root.innerHTML = '';
    initQuiz();
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function start() {
    initFlips();
    initSteppers();
    initExplorers();
    initStackMachine();
    initMemoryDemo();
    initRace();
    initQuiz();
    refresh(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
