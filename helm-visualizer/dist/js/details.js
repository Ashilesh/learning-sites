// Right-hand details panel: a resource, a link, a namespace or a namespace pair.
import { dump } from 'js-yaml';
import { h, clear, fill, resEl, resText, CAT_LABEL, SCOPE_LABEL, STATUS_LABEL, nsLabel, cssVar } from './dom.js';
import { CLUSTER_NS, EXTERNAL_NS } from './graph.js';

const PSEUDO_HELP = {
  PodSelector: 'Pods picked by a label selector in a policy rule. Either nothing in this chart matched it, or so many workloads matched that they are grouped here.',
  IPBlock: 'An IP range named in a network policy rule.',
  AnyNamespace: 'Every namespace in the cluster (an empty namespace selector).',
  NamespaceSelector: 'Namespaces chosen by labels. No namespace known to this chart has those labels.',
  ExternalHost: 'A host name outside the cluster.',
  User: 'A Kubernetes user named in an RBAC binding.',
  Group: 'A Kubernetes group named in an RBAC binding.',
  Entity: 'A Cilium entity such as world, cluster or host.',
};

export function createDetails(root, body, ctx) {
  const show = (content) => { fill(body, content); root.hidden = false; root.scrollTop = 0; ctx.onResize?.(); };
  const hide = () => { root.hidden = true; ctx.onResize?.(); };

  function relItem(e, dir) {
    const other = ctx.node(dir === 'out' ? e.target : e.source);
    const cross = e.scope === 'cross';
    return h('li', { class: `rel${cross ? ' cross' : ''}`, onclick: () => ctx.selectEdge(e.id) },
      h('div', { class: 'rel-head' },
        h('span', { class: 'rel-type' }, dir === 'out' ? `${e.label} →` : `← ${e.label}`),
        other ? resEl(other, 'span') : h('span', { class: 'rel-target' }, dir === 'out' ? e.target : e.source),
        cross ? h('span', { class: 'tag cross' }, 'cross-namespace') : null,
        e.inferred ? h('span', { class: 'tag' }, 'inferred') : null,
        e.allowed === false ? h('span', { class: 'tag err' }, 'not allowed') : null),
      e.details[0] ? h('div', { class: 'rel-ev' }, e.details[0].path, e.details[0].text ? `  ·  ${e.details[0].text}` : '', e.details.length > 1 ? `  (+${e.details.length - 1})` : '') : null);
  }

  function relSection(title, edges, dir) {
    if (!edges.length) return null;
    const sorted = [...edges].sort((a, b) => (a.scope === 'cross' ? -1 : 0) - (b.scope === 'cross' ? -1 : 0) || a.label.localeCompare(b.label));
    return h('div', { class: 'd-section' }, h('h3', null, title, h('span', null, String(edges.length))),
      h('ul', { class: 'rel-list' }, sorted.slice(0, 200).map((e) => relItem(e, dir))));
  }

  function badge(n) {
    const color = cssVar(`--c-${n.category}`) || cssVar('--c-platform');
    return h('span', { class: 'badge', style: { background: color } }, n.abbrev);
  }

  function showNode(n) {
    const out = ctx.edges().filter((e) => e.source === n.id);
    const inc = ctx.edges().filter((e) => e.target === n.id);
    const statusTag = h('span', { class: `tag${n.status === 'external' ? ' ext' : ''}` }, STATUS_LABEL[n.status] || n.status);
    const meta = [];
    if (n.apiVersion && n.status === 'defined') meta.push(['API', n.apiVersion]);
    if (n.source) meta.push(['Template', n.source]);
    if (n.chart) meta.push(['Chart', n.chart]);
    if (n.hook) meta.push(['Helm hook', n.hook]);
    const gen = (n.generatedBy || []).map((id) => ctx.node(id)).filter(Boolean);
    const matches = (n.matches || []).map((id) => ctx.node(id)).filter(Boolean);
    const content = [
      h('div', { class: 'd-kind' }, badge(n), h('span', null, n.kind), n.group ? h('span', null, `· ${n.group}`) : null),
      h('div', { class: 'd-name' }, n.name),
      h('div', { class: 'tags' },
        h('span', { class: 'tag' }, n.namespace === null ? 'cluster-scoped' : n.namespace === EXTERNAL_NS ? 'outside the cluster' : `ns: ${n.namespace}`),
        statusTag, h('span', { class: 'tag' }, CAT_LABEL[n.category] || n.category)),
      n.status === 'external' ? h('p', { class: 'hint' }, 'Referenced by this chart but not defined in it. It has to exist already, or be created by another release or operator.') : null,
      n.status === 'pseudo' ? h('p', { class: 'hint' }, PSEUDO_HELP[n.kind] || '') : null,
      gen.length ? h('div', { class: 'd-section' }, h('h3', null, 'Created by'), h('ul', { class: 'rel-list' }, gen.map((g) => h('li', { class: 'rel', onclick: () => ctx.selectNode(g.id) }, resEl(g))))) : null,
      matches.length ? h('div', { class: 'd-section' }, h('h3', null, 'Matches', h('span', null, String(matches.length))), h('ul', { class: 'rel-list' }, matches.map((g) => h('li', { class: 'rel', onclick: () => ctx.selectNode(g.id) }, resEl(g))))) : null,
      meta.length ? h('div', { class: 'd-section' }, h('dl', { class: 'd-meta' }, meta.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]))) : null,
      n.notes?.length ? h('div', { class: 'd-section' }, h('h3', null, 'Notes'), h('ul', { class: 'notes' }, n.notes.map((t) => h('li', null, t)))) : null,
      relSection('Points to', out, 'out'),
      relSection('Referenced by', inc, 'in'),
      !out.length && !inc.length ? h('p', { class: 'hint' }, 'No relationships found for this resource.') : null,
      Object.keys(n.labels || {}).length ? h('div', { class: 'd-section' }, h('h3', null, 'Labels'), h('div', { class: 'kv' }, Object.entries(n.labels).map(([k, v]) => h('span', null, `${k}=${v}`)))) : null,
      n.obj ? manifest(n.obj) : null,
    ];
    show(content);
  }

  function manifest(obj) {
    let text;
    try { text = dump(obj, { lineWidth: 140, noRefs: true }); } catch { text = JSON.stringify(obj, null, 2); }
    const det = h('details', { class: 'd-section sub' }, h('summary', null, 'Manifest'), h('pre', { class: 'yaml' }, text));
    return det;
  }

  function showEdge(e) {
    const s = ctx.node(e.source);
    const t = ctx.node(e.target);
    show([
      h('div', { class: 'd-kind' }, h('span', { class: 'cat-dot', style: { background: cssVar(`--c-${e.category}`) } }), h('span', null, `${CAT_LABEL[e.category] || e.category} link`)),
      h('div', { class: 'd-name', style: { fontFamily: 'var(--font)' } }, e.label),
      h('div', { class: 'tags' },
        h('span', { class: `tag${e.scope === 'cross' ? ' cross' : ''}` }, SCOPE_LABEL[e.scope]),
        e.inferred ? h('span', { class: 'tag' }, 'inferred from a host name') : h('span', { class: 'tag' }, 'explicit reference'),
        e.optional ? h('span', { class: 'tag' }, 'optional') : null,
        e.allowed === false ? h('span', { class: 'tag err' }, 'not allowed by Gateway API') : e.allowed === true ? h('span', { class: 'tag ok' }, 'allowed') : null),
      h('div', { class: 'flow' },
        nodeRef(s, e.source, e.sourceNs), h('div', { class: 'arrow' }, `↓ ${e.label}`), nodeRef(t, e.target, e.targetNs)),
      h('div', { class: 'd-section' }, h('h3', null, 'Evidence'),
        h('ul', { class: 'ev-list' }, e.details.map((d) => h('li', null, d.path, d.text ? h('span', null, d.text) : null)))),
      e.inferred ? h('p', { class: 'hint' }, 'The host name of the target Service appears in this resource (env, args or config). That usually means it connects to it.') : null,
    ]);
  }

  function nodeRef(n, id, ns) {
    if (!n) {
      return h('div', { class: 'node-ref', onclick: () => ctx.selectNamespace(id) }, h('small', null, 'Namespace'), id.replace(/^ns:/, ''));
    }
    return h('div', { class: 'node-ref', onclick: () => ctx.selectNode(n.id) }, h('small', null, `${n.kind} · ${nsLabel(ns)}`), n.name);
  }

  function showNamespace(id) {
    const name = id.replace(/^ns:/, '');
    const info = ctx.namespaces().find((x) => x.name === name);
    const nodes = ctx.nodes().filter((n) => (name === CLUSTER_NS ? n.namespace === null : n.namespace === name));
    const ids = new Set(nodes.map((n) => n.id).concat(id));
    const out = ctx.edges().filter((e) => ids.has(e.source) && !ids.has(e.target));
    const inc = ctx.edges().filter((e) => ids.has(e.target) && !ids.has(e.source));
    const kinds = {};
    for (const n of nodes) if (n.status === 'defined') kinds[n.kind] = (kinds[n.kind] || 0) + 1;
    const title = name === CLUSTER_NS ? 'Cluster-scoped resources' : name === EXTERNAL_NS ? 'Outside the cluster' : name;
    show([
      h('div', { class: 'd-kind' }, h('span', { class: 'badge', style: { background: cssVar('--c-platform') } }, 'NS'), h('span', null, name === CLUSTER_NS || name === EXTERNAL_NS ? 'Group' : 'Namespace')),
      h('div', { class: 'd-name' }, title),
      info ? h('div', { class: 'tags' },
        info.defined ? h('span', { class: 'tag' }, 'created by this chart') : h('span', { class: 'tag ext' }, 'not created by this chart'),
        info.release ? h('span', { class: 'tag' }, 'release namespace') : null) : null,
      Object.keys(kinds).length ? h('div', { class: 'd-section' }, h('h3', null, 'Resources', h('span', null, String(nodes.filter((n) => n.status === 'defined').length))),
        h('div', { class: 'kv' }, Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, c]) => h('span', null, `${k} ${c}`)))) : null,
      relSection('Links out of this namespace', out, 'out'),
      relSection('Links into this namespace', inc, 'in'),
      !out.length && !inc.length ? h('p', { class: 'hint' }, 'Nothing here links to another namespace.') : null,
      Object.keys(info?.labels || {}).length ? h('div', { class: 'd-section' }, h('h3', null, 'Labels'), h('div', { class: 'kv' }, Object.entries(info.labels).map(([k, v]) => h('span', null, `${k}=${v}`)))) : null,
      info?.obj ? manifest(info.obj) : null,
    ]);
  }

  function showSubchart(id) {
    const rest = id.slice(3);
    const i = rest.indexOf(':');
    const nsKey = rest.slice(0, i);
    const chart = rest.slice(i + 1);
    const nodes = ctx.nodes().filter((n) => n.chart === chart && n.status === 'defined' && (nsKey === CLUSTER_NS ? n.namespace === null : n.namespace === nsKey));
    const ids = new Set(nodes.map((n) => n.id));
    const out = ctx.edges().filter((e) => ids.has(e.source) && !ids.has(e.target));
    const inc = ctx.edges().filter((e) => ids.has(e.target) && !ids.has(e.source));
    const kinds = {};
    for (const n of nodes) kinds[n.kind] = (kinds[n.kind] || 0) + 1;
    show([
      h('div', { class: 'd-kind' }, h('span', { class: 'badge', style: { background: cssVar('--c-platform') } }, 'CHART'), h('span', null, 'Subchart')),
      h('div', { class: 'd-name' }, chart),
      h('div', { class: 'tags' }, h('span', { class: 'tag' }, nsKey === CLUSTER_NS ? 'cluster-scoped part' : `ns: ${nsKey}`)),
      h('div', { class: 'd-section' }, h('h3', null, 'Resources', h('span', null, String(nodes.length))),
        h('div', { class: 'kv' }, Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, c]) => h('span', null, `${k} ${c}`)))),
      relSection('Links out of this subchart', out, 'out'),
      relSection('Links into this subchart', inc, 'in'),
    ]);
  }

  function showNamespacePair(edgeIds) {
    const edges = edgeIds.map((id) => ctx.edge(id)).filter(Boolean);
    if (!edges.length) return;
    const a = nsLabel(edges[0].sourceNs);
    const b = nsLabel(edges[0].targetNs);
    show([
      h('div', { class: 'd-kind' }, h('span', null, 'Namespace to namespace')),
      h('div', { class: 'd-name' }, `${a} → ${b}`),
      h('p', { class: 'hint' }, `${edges.length} link${edges.length === 1 ? '' : 's'}. Pick one to see it in the graph.`),
      h('ul', { class: 'rel-list' }, edges.map((e) => h('li', { class: 'rel', onclick: () => ctx.selectEdge(e.id) },
        h('div', { class: 'rel-head' }, resEl(ctx.node(e.source))),
        h('div', { class: 'rel-head' }, h('span', { class: 'rel-type' }, `${e.label} →`), ctx.node(e.target) ? resEl(ctx.node(e.target)) : h('span', { class: 'res' }, `namespace ${e.target.slice(3)}`)),
        e.details[0] ? h('div', { class: 'rel-ev' }, e.details[0].path) : null))),
    ]);
  }

  function showText(title, text) {
    show([h('div', { class: 'd-kind' }, h('span', null, 'Chart defaults')), h('div', { class: 'd-name' }, title), h('pre', { class: 'yaml', style: { maxHeight: 'none' } }, text)]);
  }

  return { showNode, showEdge, showNamespace, showSubchart, showNamespacePair, showText, hide, resText };
}
