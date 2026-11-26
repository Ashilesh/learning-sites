// Connections table and Findings list.
import { h, clear, fill, resEl, resText, SCOPE_LABEL, CAT_LABEL, cssVar } from './dom.js';

const SCOPE_ORDER = { cross: 0, cluster: 1, external: 2, same: 3 };

export function createConnectionsView(root, ctx) {
  let sortKey = 'scope';
  let sortDir = 1;
  let query = '';
  const searchInput = h('input', { type: 'search', placeholder: 'Filter connections…', spellcheck: 'false', oninput: (e) => { query = e.target.value; render(); } });

  function rows() {
    const q = query.trim().toLowerCase();
    let list = ctx.visibleEdges();
    if (q) {
      list = list.filter((e) => {
        const s = ctx.node(e.source);
        const t = ctx.node(e.target);
        return `${s ? resText(s) : e.source} ${e.label} ${t ? resText(t) : e.target} ${e.details.map((d) => `${d.path} ${d.text || ''}`).join(' ')}`.toLowerCase().includes(q);
      });
    }
    const key = (e) => {
      const s = ctx.node(e.source);
      const t = ctx.node(e.target);
      switch (sortKey) {
        case 'from': return s ? resText(s) : e.source;
        case 'to': return t ? resText(t) : e.target;
        case 'type': return e.label;
        case 'scope': return `${SCOPE_ORDER[e.scope]}|${e.sourceNs}|${e.targetNs}`;
        default: return '';
      }
    };
    return list.map((e) => [key(e), e]).sort((a, b) => (a[0] < b[0] ? -sortDir : a[0] > b[0] ? sortDir : 0)).map((x) => x[1]);
  }

  function th(label, key) {
    return h('th', { 'aria-sort': sortKey === key ? (sortDir > 0 ? 'ascending' : 'descending') : null, onclick: () => { if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; } render(); } },
      label, sortKey === key ? (sortDir > 0 ? ' ↑' : ' ↓') : '');
  }

  function target(id) {
    const n = ctx.node(id);
    return n ? resEl(n) : h('span', { class: 'res' }, h('span', { class: 'k' }, 'Namespace '), id.replace(/^ns:/, ''));
  }

  function render() {
    const list = rows();
    const total = ctx.visibleEdges().length;
    const shown = list.slice(0, 3000);
    const cross = list.filter((e) => e.scope === 'cross').length;
    fill(root,
      h('div', { class: 'view-head' },
        h('h2', null, 'Connections'),
        h('span', { class: 'sub' }, `${list.length} of ${total} links · ${cross} cross-namespace`),
        h('span', { class: 'spacer' }),
        searchInput),
      list.length ? h('table', { class: 'conn' },
        h('thead', null, h('tr', null, th('From', 'from'), th('Relationship', 'type'), th('To', 'to'), th('Scope', 'scope'), h('th', null, 'Evidence'))),
        h('tbody', null, shown.map((e) => h('tr', { onclick: () => ctx.selectEdge(e.id) },
          h('td', null, target(e.source)),
          h('td', { class: 'rel-cell' }, h('span', { class: 'cat-dot', style: { background: cssVar(`--c-${e.category}`) }, title: CAT_LABEL[e.category] }), e.label, e.inferred ? h('div', { class: 'ev' }, 'inferred from host name') : null),
          h('td', null, target(e.target)),
          h('td', null, h('span', { class: `scope-pill scope-${e.scope}` }, SCOPE_LABEL[e.scope]), e.allowed === false ? h('div', null, h('span', { class: 'tag err' }, 'not allowed')) : null),
          h('td', null, h('div', { class: 'ev' }, e.details[0]?.path || ''), e.details[0]?.text ? h('div', { class: 'ev' }, e.details[0].text) : null))))) :
        h('div', { class: 'empty-state' }, h('b', null, 'No connections'), 'Nothing matches the current filters.'),
      list.length > shown.length ? h('p', { class: 'table-note' }, `Showing the first ${shown.length}. Narrow the filters to see the rest.`) : null,
    );
  }

  return { render, rows };
}

export function createFindingsView(root, ctx) {
  const active = new Set(['error', 'warn', 'info']);

  function render() {
    const all = ctx.findings();
    const counts = { error: 0, warn: 0, info: 0 };
    for (const f of all) counts[f.severity]++;
    const list = all.filter((f) => active.has(f.severity));
    const chip = (sev, label) => h('button', {
      class: 'chip', 'aria-pressed': String(active.has(sev)),
      onclick: () => { if (active.has(sev)) active.delete(sev); else active.add(sev); render(); },
    }, h('span', { class: `sev ${sev}` }, label), h('span', { class: 'n' }, String(counts[sev])));
    fill(root,
      h('div', { class: 'view-head' },
        h('h2', null, 'Findings'),
        h('span', { class: 'sub' }, 'Problems and loose ends spotted while tracing references'),
        h('span', { class: 'spacer' }),
        h('div', { class: 'sev-filter' }, chip('error', 'Error'), chip('warn', 'Warning'), chip('info', 'Info'))),
      list.length ? h('div', { class: 'findings' }, list.map((f) => h('article', { class: `finding ${f.severity}` },
        h('h3', null, h('span', { class: `sev ${f.severity}` }, f.severity === 'warn' ? 'warning' : f.severity), f.title),
        h('p', null, f.message),
        f.nodes?.length ? h('button', { class: 'btn btn-sm', onclick: () => ctx.showInGraph(f) }, 'Show in graph') : null))) :
        h('div', { class: 'empty-state' }, h('b', null, all.length ? 'Nothing at this severity' : 'No findings'), all.length ? 'Turn on another severity above.' : 'Every reference this tool knows how to check resolved cleanly.'),
    );
  }

  return { render };
}
