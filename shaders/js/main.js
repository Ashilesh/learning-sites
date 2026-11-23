/* main.js — page glue: table of contents, XP on chapter visits, scroll bar, reveal */
(function () {
  'use strict';
  const { $, $$ } = SL;

  SL.highlightAll();
  SL.xp.render();

  /* ---------- table of contents ---------- */
  const chapters = $$('section.chapter');
  const toc = $('#toc-panel'), tocBtn = $('#toc-btn');
  toc.innerHTML = chapters.map((c, i) => `<a class="toc-item${SL.xp.has('ch-' + c.id) ? ' seen' : ''}" href="#${c.id}" data-id="${c.id}"><span class="ti-n">${String(i + 1).padStart(2, '0')}</span><span class="ti-i">${c.dataset.icon || ''}</span>${c.dataset.title}</a>`).join('');
  const setToc = (open) => { toc.hidden = !open; tocBtn.setAttribute('aria-expanded', open); };
  tocBtn.addEventListener('click', (e) => { e.stopPropagation(); setToc(toc.hidden); });
  toc.addEventListener('click', (e) => { if (e.target.closest('a')) setToc(false); });
  document.addEventListener('click', (e) => { if (!toc.hidden && !toc.contains(e.target)) setToc(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setToc(false); });

  /* ---------- XP for visiting chapters ---------- */
  const seenIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.id, item = toc.querySelector(`[data-id="${id}"]`);
      item && item.classList.add('seen');
      SL.xp.award('ch-' + id, 50, `for exploring “${e.target.dataset.title}”`);
    });
  }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
  chapters.forEach((c) => seenIO.observe(c));

  /* ---------- scroll progress ---------- */
  const fill = $('#scroll-fill');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    fill.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.ch-head, .demo, .fact, .vs-card, .mail, .fn-card, .type-card, .fam, .q, .res, .eq-strip, .pipe-bar, .space-chain, .passes, .compile-path, .cheat, .gpgpu-diagram').forEach((el, i) => {
    el.classList.add('reveal'); el.style.transitionDelay = ((i % 4) * 0.06) + 's'; revealIO.observe(el);
  });

  /* ---------- misc ---------- */
  $('#xp-reset').addEventListener('click', () => { SL.xp.reset(); $$('.toc-item.seen').forEach((x) => x.classList.remove('seen')); SL.toast('XP reset — start fresh! 🌱'); });
})();
