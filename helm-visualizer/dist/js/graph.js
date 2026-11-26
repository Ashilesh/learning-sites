// Cytoscape rendering: resource graph (namespaces as boxes) and the namespace overview.
import cytoscape from 'cytoscape';
import { cssVar } from './dom.js';
import { tidyLayout } from './tidy-layout.js';

let fcoseRegistered = false;
function ensureFcose() {
  if (fcoseRegistered) return;
  if (window.cytoscapeFcose) cytoscape.use(window.cytoscapeFcose);
  fcoseRegistered = true;
}

const SHAPES = {
  workload: 'round-rectangle', network: 'ellipse', config: 'cut-rectangle', identity: 'round-hexagon',
  policy: 'round-octagon', pki: 'round-tag', storage: 'barrel', platform: 'round-rectangle', external: 'ellipse',
};

export const CLUSTER_NS = '__cluster';
export const DENSE_NODES = 120;
const MAX_FIT_ZOOM = 1.4;
export const EXTERNAL_NS = '__external';

function palette() {
  const cats = ['workload', 'network', 'config', 'identity', 'policy', 'pki', 'storage', 'platform', 'external'];
  return {
    cat: Object.fromEntries(cats.map((c) => [c, cssVar(`--c-${c}`)])),
    scope: { same: cssVar('--scope-same'), cross: cssVar('--scope-cross'), cluster: cssVar('--scope-cluster'), external: cssVar('--scope-external') },
    text: cssVar('--text'), text2: cssVar('--text-2'), text3: cssVar('--text-3'), surface: cssVar('--surface'), surface2: cssVar('--surface-2'),
    nsFill: cssVar('--ns-fill'), nsBorder: cssVar('--ns-border'), nsLabel: cssVar('--ns-label'), accent: cssVar('--accent'), err: cssVar('--err'),
    font: cssVar('--font') || 'sans-serif', bg: cssVar('--bg'),
  };
}

const iconCache = new Map();
function icon(abbrev, color, ghost) {
  const key = `${abbrev}|${color}|${ghost}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const len = abbrev.length;
  const fs = len <= 2 ? 15 : len === 3 ? 13 : len === 4 ? 11 : 9.5;
  const fill = ghost ? color : '#ffffff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><text x="20" y="20" dy="0.36em" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="${fs}" font-weight="700" fill="${fill}">${abbrev.replace(/[<&>"]/g, '')}</text></svg>`;
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  iconCache.set(key, uri);
  return uri;
}

/** Drop the "<release>-" (and, inside a subchart box, "<subchart>-") prefix that Helm names usually carry. */
function shortName(n, release, inSubchart) {
  let s = n.name;
  if (n.status === 'pseudo') return s;
  if (release && s.startsWith(`${release}-`) && s.length > release.length + 2) s = s.slice(release.length + 1);
  if (inSubchart && n.chart && s.startsWith(`${n.chart}-`) && s.length > n.chart.length + 2) s = s.slice(n.chart.length + 1);
  return s;
}

function nsKeyOf(n) {
  if (n.namespace === null || n.namespace === undefined) return CLUSTER_NS;
  return n.namespace;
}

function graphStyle(p, colorMode, dense) {
  return [
    { selector: 'node', style: { 'font-family': p.font, color: p.text2, 'min-zoomed-font-size': 7, 'overlay-opacity': 0 } },
    {
      selector: 'node.res',
      style: {
        width: 28, height: 28, shape: 'round-rectangle', 'background-color': 'data(color)', 'background-image': 'data(icon)',
        'background-fit': 'contain', 'background-clip': 'none', 'border-width': 0, label: 'data(label)', 'text-valign': 'bottom',
        'text-halign': 'center', 'text-margin-y': 4, 'text-wrap': 'wrap', 'text-overflow-wrap': 'anywhere', 'text-max-width': 120, 'font-size': 9.5,
      },
    },
    ...Object.entries(SHAPES).map(([cat, shape]) => ({ selector: `node.cat-${cat}`, style: { shape } })),
    { selector: 'node.cat-workload', style: { width: 36, height: 36, 'font-size': 10.5, 'font-weight': 600, color: p.text } },
    { selector: 'node.cat-network', style: { width: 31, height: 31 } },
    { selector: 'node.st-external', style: { 'background-color': p.surface, 'background-image': 'data(iconGhost)', 'border-width': 1.5, 'border-style': 'dashed', 'border-color': 'data(color)', color: p.text3 } },
    { selector: 'node.st-generated', style: { 'background-opacity': 0.5, 'border-width': 1.5, 'border-style': 'dotted', 'border-color': 'data(color)' } },
    { selector: 'node.st-pseudo', style: { width: 24, height: 24, shape: 'ellipse', 'background-color': p.surface2, 'background-image': 'data(iconGhost)', 'border-width': 1, 'border-style': 'dashed', 'border-color': p.text3, 'font-style': 'italic', color: p.text3 } },
    {
      selector: 'node.ns',
      style: {
        shape: 'round-rectangle', 'background-color': p.nsFill, 'background-opacity': 1, 'border-width': 1, 'border-color': p.nsBorder,
        label: 'data(label)', 'text-valign': 'top', 'text-halign': 'center', 'font-size': 12.5, 'font-weight': 700, color: p.nsLabel,
        'text-margin-y': -5, padding: 18, 'min-zoomed-font-size': 5, 'corner-radius': 10,
      },
    },
    {
      selector: 'node.sub',
      style: {
        shape: 'round-rectangle', 'background-color': p.surface2, 'background-opacity': 0.55, 'border-width': 1, 'border-style': 'dashed',
        'border-color': p.nsBorder, label: 'data(label)', 'text-valign': 'top', 'text-halign': 'center', 'font-size': 10, 'font-weight': 600,
        color: p.text3, 'text-margin-y': -3, padding: 10, 'min-zoomed-font-size': 6, 'corner-radius': 8,
      },
    },
    { selector: 'node.sub.dim', style: { opacity: 0.45 } },
    { selector: 'node.ns.ns-release', style: { 'border-color': p.accent, 'border-width': 1.5 } },
    { selector: 'node.ns.ns-undefined', style: { 'border-style': 'dashed' } },
    { selector: 'node.ns.ns-cluster', style: { 'border-style': 'dashed', 'border-color': p.scope.cluster, color: p.scope.cluster } },
    { selector: 'node.ns.ns-external', style: { 'border-style': 'dashed', 'border-color': p.text3, color: p.text3 } },
    {
      selector: 'edge',
      style: {
        width: 1.3, 'curve-style': 'bezier', 'line-color': 'data(color)', 'target-arrow-color': 'data(color)', 'target-arrow-shape': 'triangle',
        'arrow-scale': 0.75, opacity: 0.75, 'font-family': p.font, 'font-size': 9, color: p.text2, 'text-rotation': 'autorotate',
        'text-background-color': p.surface, 'text-background-opacity': 0.92, 'text-background-padding': 2, 'text-background-shape': 'roundrectangle',
        'min-zoomed-font-size': 7, 'overlay-opacity': 0,
      },
    },
    ...(dense ? [{ selector: 'edge', style: { opacity: 0.32, width: 1 } }] : []),
    { selector: 'edge.scope-cross', style: { width: colorMode === 'scope' ? 2.6 : 2.2, opacity: 0.95, 'z-index': 10 } },
    { selector: 'edge.scope-cluster', style: { width: 1.5 } },
    { selector: 'edge.inferred', style: { 'line-style': 'dashed', 'line-dash-pattern': [5, 3] } },
    { selector: 'edge.denied', style: { 'line-color': p.err, 'target-arrow-color': p.err, 'target-arrow-shape': 'tee', 'line-style': 'dashed', 'line-dash-pattern': [2, 3], width: 2.4 } },
    { selector: 'edge.show-label', style: { label: 'data(label)', opacity: 1, 'z-index': 30 } },
    { selector: 'edge:selected', style: { label: 'data(label)', width: 3.4, opacity: 1, 'z-index': 40 } },
    { selector: 'node.res:selected', style: { 'border-width': 3, 'border-color': p.accent, 'border-style': 'solid', 'border-opacity': 1 } },
    { selector: 'node.ns:selected', style: { 'border-width': 2.5, 'border-color': p.accent } },
    { selector: 'node.match', style: { 'underlay-color': p.accent, 'underlay-opacity': 0.28, 'underlay-padding': 7, 'underlay-shape': 'ellipse' } },
    { selector: '.dim', style: { opacity: 0.12 } },
    { selector: 'node.ns.dim', style: { opacity: 0.45 } },
    { selector: 'edge.dim', style: { opacity: 0.05 } },
  ];
}

export function createGraph(container, { onSelect, onClear }) {
  ensureFcose();
  let p = palette();
  let colorMode = 'scope';
  let dense = false;
  let result = null;
  let visibleNodeKey = '';
  const cy = cytoscape({
    container, minZoom: 0.05, maxZoom: 4, boxSelectionEnabled: false,
    style: graphStyle(p, colorMode, dense), textureOnViewport: false, hideEdgesOnViewport: false, pixelRatio: 'auto',
  });

  cy.on('tap', 'node, edge', (evt) => {
    const t = evt.target;
    highlight(t);
    onSelect?.(t.isNode() ? { type: t.hasClass('ns') ? 'namespace' : t.hasClass('sub') ? 'subchart' : 'node', id: t.id() } : { type: 'edge', id: t.id() });
  });
  cy.on('tap', (evt) => { if (evt.target === cy) { clearHighlight(); onClear?.(); } });
  cy.on('mouseover', 'edge', (e) => e.target.addClass('show-label'));
  cy.on('mouseout', 'edge', (e) => { if (!e.target.data('keepLabel')) e.target.removeClass('show-label'); });
  cy.on('mouseover', 'node.res', () => { container.style.cursor = 'pointer'; });
  cy.on('mouseout', 'node.res', () => { container.style.cursor = ''; });

  function edgeColor(d) {
    if (d.denied) return p.err;
    return colorMode === 'scope' ? p.scope[d.scope] : p.cat[d.cat] || p.text3;
  }

  function setData(r, { groupBySubchart = false, release = null } = {}) {
    result = r;
    const wasDense = dense;
    dense = r.nodes.length > DENSE_NODES;
    if (dense !== wasDense) cy.style(graphStyle(p, colorMode, dense));
    const elements = [];
    // umbrella charts: a box per subchart inside each namespace (only where a namespace mixes charts)
    const subOf = new Map();
    if (groupBySubchart) {
      const chartsPerNs = new Map();
      for (const n of r.nodes) {
        if (n.status !== 'defined' || !n.chart) continue;
        const k = nsKeyOf(n);
        if (!chartsPerNs.has(k)) chartsPerNs.set(k, new Set());
        chartsPerNs.get(k).add(n.chart);
      }
      for (const [k, charts] of chartsPerNs) {
        if (charts.size < 2) continue;
        for (const c of charts) elements.push({ data: { id: `sc:${k}:${c}`, label: c, parent: `ns:${k}`, nsKey: k, chart: c }, classes: 'sub' });
      }
      for (const n of r.nodes) {
        const k = nsKeyOf(n);
        if (n.status === 'defined' && n.chart && (chartsPerNs.get(k)?.size || 0) > 1) subOf.set(n.id, `sc:${k}:${n.chart}`);
      }
    }
    const used = new Set();
    for (const n of r.nodes) used.add(nsKeyOf(n));
    for (const e of r.edges) for (const id of [e.source, e.target]) if (id.startsWith('ns:')) used.add(id.slice(3));
    const nsByName = new Map(r.namespaces.map((ns) => [ns.name, ns]));
    for (const key of used) {
      if (key === CLUSTER_NS) { elements.push({ data: { id: `ns:${CLUSTER_NS}`, label: 'Cluster-scoped', nsKey: key }, classes: 'ns ns-cluster' }); continue; }
      if (key === EXTERNAL_NS) { elements.push({ data: { id: `ns:${EXTERNAL_NS}`, label: 'Outside the cluster / any namespace', nsKey: key }, classes: 'ns ns-external' }); continue; }
      const ns = nsByName.get(key) || { name: key };
      const cls = ['ns', ns.release ? 'ns-release' : '', ns.defined ? '' : 'ns-undefined'].join(' ');
      elements.push({ data: { id: `ns:${key}`, label: ns.release ? `${key}  ·  release namespace` : key, nsKey: key }, classes: cls });
    }
    for (const n of r.nodes) {
      const color = p.cat[n.category] || p.cat.platform;
      elements.push({
        data: {
          id: n.id, label: shortName(n, release, subOf.has(n.id)), kind: n.kind, parent: subOf.get(n.id) || `ns:${nsKeyOf(n)}`, nsKey: nsKeyOf(n), cat: n.category, status: n.status,
          hook: n.hook, color, icon: icon(n.abbrev, '#fff', false), iconGhost: icon(n.abbrev, n.status === 'pseudo' ? p.text3 : color, true),
          search: `${n.kind} ${n.namespace || ''} ${n.name}`.toLowerCase(),
        },
        classes: `res cat-${n.category} st-${n.status}`,
      });
    }
    for (const e of r.edges) {
      const d = { id: e.id, source: e.source, target: e.target, label: e.label, cat: e.category, scope: e.scope, inferred: e.inferred, denied: e.allowed === false };
      d.color = edgeColor(d);
      elements.push({ data: d, classes: `scope-${e.scope} ecat-${e.category}${e.inferred ? ' inferred' : ''}${d.denied ? ' denied' : ''}` });
    }
    cy.elements().remove();
    // parents must exist before their children
    cy.add(elements.filter((e) => e.classes?.startsWith('ns')));
    cy.add(elements.filter((e) => !e.classes?.startsWith('ns')));
    visibleNodeKey = '';
  }

  /** Show exactly the given resource ids, namespace box ids and edge ids. */
  function applyVisibility(vis) {
    let changed = false;
    cy.batch(() => {
      cy.nodes('.res').forEach((n) => n.style('display', vis.nodes.has(n.id()) ? 'element' : 'none'));
      cy.nodes('.ns').forEach((n) => n.style('display', vis.nsVis.has(n.id()) ? 'element' : 'none'));
      cy.edges().forEach((e) => e.style('display', vis.edgeIds.has(e.id()) ? 'element' : 'none'));
      cy.nodes('.sub').forEach((sc) => sc.style('display', sc.children().some((c) => vis.nodes.has(c.id())) ? 'element' : 'none'));
    });
    const key = [...vis.nodes].sort().join('\n');
    changed = key !== visibleNodeKey;
    visibleNodeKey = key;
    return { changedNodes: changed };
  }

  function layout(opts = {}) {
    const eles = cy.elements().filter((e) => e.style('display') !== 'none');
    const count = eles.nodes().length;
    if (!count) return Promise.resolve();
    if ((opts.mode || 'tidy') === 'tidy') {
      tidyLayout(cy, { forceLayoutName: window.cytoscapeFcose ? 'fcose' : 'cose' });
      fitCapped(eles);
      return Promise.resolve();
    }
    const big = count > 260;
    const l = eles.layout({
      name: window.cytoscapeFcose ? 'fcose' : 'cose',
      quality: big ? 'default' : 'proof', randomize: opts.randomize ?? true, animate: opts.animate ?? false, animationDuration: 400,
      fit: true, padding: 40, nodeDimensionsIncludeLabels: true, uniformNodeDimensions: false, packComponents: true,
      nodeRepulsion: () => 7000, idealEdgeLength: (e) => (e.data('scope') === 'cross' ? 160 : 70), edgeElasticity: () => 0.4,
      nestingFactor: 0.12, gravity: 0.3, gravityRangeCompound: 1.6, gravityCompound: 1.2, gravityRange: 3.6,
      numIter: big ? 1500 : 2500, tile: true, tilingPaddingVertical: 14, tilingPaddingHorizontal: 14,
      initialEnergyOnIncremental: 0.4,
    });
    return new Promise((resolve) => { l.one('layoutstop', () => { fitCapped(eles); resolve(); }); l.run(); });
  }

  /** Fit, but never blow a three-node graph up to 400%. */
  function fitCapped(eles) {
    cy.fit(eles, 40);
    if (cy.zoom() > MAX_FIT_ZOOM) { cy.zoom(MAX_FIT_ZOOM); cy.center(eles); }
  }

  function highlight(t) {
    clearHighlight();
    let keep;
    if (t.isEdge()) keep = t.union(t.connectedNodes());
    else if (t.hasClass('ns') || t.hasClass('sub')) {
      const kids = t.descendants();
      keep = t.union(kids).union(kids.connectedEdges()).union(t.connectedEdges());
      keep = keep.union(keep.connectedNodes());
    } else {
      keep = t.closedNeighborhood();
      // a pseudo selector node also lights up the workloads it stands for
      const node = result?.nodes.find((n) => n.id === t.id());
      if (node?.matches) keep = keep.union(cy.collection(node.matches.map((id) => cy.getElementById(id)).filter((x) => x.length)));
    }
    keep = keep.union(keep.nodes().ancestors());
    cy.batch(() => {
      cy.elements().not(keep).addClass('dim');
      keep.edges().addClass('show-label').data('keepLabel', true);
    });
    cy.elements().unselect();
    t.select();
  }

  function clearHighlight() {
    cy.batch(() => {
      cy.elements().removeClass('dim');
      cy.edges('.show-label').removeClass('show-label').data('keepLabel', false);
      cy.nodes('.match').removeClass('match');
    });
  }

  function select(id, { center = true } = {}) {
    const el = cy.getElementById(id);
    if (!el.length) return false;
    if (el.style('display') === 'none') return false;
    highlight(el);
    if (center) cy.animate({ center: { eles: el }, zoom: Math.max(cy.zoom(), el.isNode() && !el.isParent() ? 1.1 : cy.zoom()) }, { duration: 300 });
    return true;
  }

  function showSet(ids) {
    clearHighlight();
    const col = cy.collection(ids.map((id) => cy.getElementById(id)).filter((x) => x.length && x.visible()));
    if (!col.length) return 0;
    let keep = col.union(col.edgesWith(col)).union(col.ancestors());
    cy.batch(() => {
      cy.elements().not(keep).addClass('dim');
      col.nodes().addClass('match');
      col.edgesWith(col).addClass('show-label').data('keepLabel', true);
    });
    cy.animate({ fit: { eles: col, padding: 80 } }, { duration: 350 });
    return col.length;
  }

  function search(term) {
    cy.nodes('.match').removeClass('match');
    const q = term.trim().toLowerCase();
    if (!q) return [];
    const hits = cy.nodes('.res').filter((n) => n.visible() && n.data('search').includes(q));
    hits.addClass('match');
    return hits;
  }

  function setColorMode(mode) {
    colorMode = mode;
    restyle();
  }

  function restyle() {
    p = palette();
    iconCache.clear();
    cy.batch(() => {
      cy.edges().forEach((e) => e.data('color', edgeColor(e.data())));
      cy.nodes('.res').forEach((n) => {
        const r = result?.nodes.find((x) => x.id === n.id());
        if (!r) return;
        const color = p.cat[r.category] || p.cat.platform;
        n.data({ color, icon: icon(r.abbrev, '#fff', false), iconGhost: icon(r.abbrev, r.status === 'pseudo' ? p.text3 : color, true) });
      });
    });
    cy.style(graphStyle(p, colorMode, dense));
  }

  return {
    cy, setData, applyVisibility, layout, select, showSet, search, setColorMode, restyle, clearHighlight,
    fit: () => fitCapped(cy.elements(':visible')),
    resize: () => cy.resize(),
    png: () => cy.png({ full: true, scale: 2, bg: cssVar('--bg'), output: 'blob' }),
    colorMode: () => colorMode,
  };
}

// ----------------------------------------------------------------------------
// Namespace overview: one node per namespace, one edge per namespace pair.

export function createNamespaceGraph(container, { onSelect, onClear }) {
  ensureFcose();
  let p = palette();
  const cy = cytoscape({ container, minZoom: 0.2, maxZoom: 3, boxSelectionEnabled: false, style: nsStyle(p) });
  let pairs = new Map();

  cy.on('tap', 'node', (e) => { focus(e.target); onSelect?.({ type: 'namespace', id: e.target.id() }); });
  cy.on('tap', 'edge', (e) => { focus(e.target); onSelect?.({ type: 'ns-edge', id: e.target.id(), edges: e.target.data('edgeIds') }); });
  cy.on('tap', (e) => { if (e.target === cy) { cy.elements().removeClass('dim'); onClear?.(); } });

  function focus(t) {
    cy.elements().removeClass('dim');
    const keep = t.isNode() ? t.closedNeighborhood() : t.union(t.connectedNodes());
    cy.elements().not(keep).addClass('dim');
  }

  function setData(result, visibleEdges, visibleNamespaces) {
    const nodeNs = new Map(result.nodes.map((n) => [n.id, nsKeyOf(n)]));
    const nsOf = (id) => (id.startsWith('ns:') ? id.slice(3) : nodeNs.get(id));
    const counts = new Map();
    for (const n of result.nodes) if (n.status === 'defined') counts.set(nsKeyOf(n), (counts.get(nsKeyOf(n)) || 0) + 1);
    const internal = new Map();
    pairs = new Map();
    for (const e of visibleEdges) {
      const a = nsOf(e.source);
      const b = nsOf(e.target);
      if (a === b) { internal.set(a, (internal.get(a) || 0) + 1); continue; }
      const key = `${a}→${b}`;
      if (!pairs.has(key)) pairs.set(key, { a, b, ids: [], scope: e.scope, cats: new Map() });
      const pr = pairs.get(key);
      pr.ids.push(e.id);
      pr.cats.set(e.category, (pr.cats.get(e.category) || 0) + 1);
      if (e.scope === 'cross') pr.scope = 'cross';
    }
    const nsInfo = new Map(result.namespaces.map((n) => [n.name, n]));
    const used = new Set([...counts.keys(), ...[...pairs.values()].flatMap((x) => [x.a, x.b])].filter((x) => visibleNamespaces.has(x)));
    const elements = [];
    const max = Math.max(1, ...[...used].map((k) => counts.get(k) || 0));
    for (const k of used) {
      const c = counts.get(k) || 0;
      const info = nsInfo.get(k);
      const label = k === CLUSTER_NS ? 'Cluster-scoped' : k === EXTERNAL_NS ? 'Outside the cluster' : k;
      const sub = [`${c} resource${c === 1 ? '' : 's'}`, internal.get(k) ? `${internal.get(k)} internal link${internal.get(k) === 1 ? '' : 's'}` : null].filter(Boolean).join('\n');
      const size = 118 + Math.sqrt(c / max) * 54;
      elements.push({
        data: { id: `ns:${k}`, label: `${label}\n${sub}`, size },
        classes: [k === CLUSTER_NS ? 'k-cluster' : k === EXTERNAL_NS ? 'k-external' : 'k-ns', info?.release ? 'release' : '', info && !info.defined && k !== CLUSTER_NS && k !== EXTERNAL_NS ? 'undef' : ''].join(' '),
      });
    }
    for (const [key, pr] of pairs) {
      if (!used.has(pr.a) || !used.has(pr.b)) continue;
      const top = [...pr.cats.entries()].sort((x, y) => y[1] - x[1]).map(([c, n]) => `${n} ${c}`).slice(0, 3).join(', ');
      elements.push({
        data: { id: `nse:${key}`, source: `ns:${pr.a}`, target: `ns:${pr.b}`, label: String(pr.ids.length), title: top, edgeIds: pr.ids, w: 1.5 + Math.log2(pr.ids.length + 1) * 1.6, color: p.scope[pr.scope] || p.text3 },
        classes: `scope-${pr.scope}`,
      });
    }
    cy.elements().remove();
    cy.add(elements);
    const l = cy.layout({
      name: window.cytoscapeFcose ? 'fcose' : 'cose', quality: 'proof', randomize: true, animate: false, fit: true, padding: 60,
      nodeRepulsion: () => 60000, idealEdgeLength: () => 220, nodeDimensionsIncludeLabels: true, numIter: 3000,
    });
    l.run();
  }

  function restyle() { p = palette(); cy.style(nsStyle(p)); cy.edges().forEach((e) => e.data('color', p.scope[e.classes().find((c) => c.startsWith('scope-'))?.slice(6)] || p.text3)); }

  return { cy, setData, restyle, resize: () => cy.resize(), fit: () => cy.fit(undefined, 60), pairs: () => pairs };
}

function nsStyle(p) {
  return [
    {
      selector: 'node',
      style: {
        shape: 'round-rectangle', width: 'data(size)', height: 'data(size)', 'background-color': p.nsFill, 'border-width': 1.5,
        'border-color': p.nsBorder, label: 'data(label)', 'text-wrap': 'wrap', 'text-valign': 'center', 'text-halign': 'center',
        'font-family': p.font, 'font-size': 11.5, 'font-weight': 600, color: p.text, 'text-max-width': (n) => n.data('size') - 14, 'line-height': 1.35, 'corner-radius': 12, 'overlay-opacity': 0,
      },
    },
    { selector: 'node.release', style: { 'border-color': p.accent, 'border-width': 2.5 } },
    { selector: 'node.undef', style: { 'border-style': 'dashed' } },
    { selector: 'node.k-cluster', style: { 'border-style': 'dashed', 'border-color': p.scope.cluster, color: p.scope.cluster } },
    { selector: 'node.k-external', style: { 'border-style': 'dashed', 'border-color': p.text3, color: p.text3 } },
    {
      selector: 'edge',
      style: {
        width: 'data(w)', 'line-color': 'data(color)', 'target-arrow-color': 'data(color)', 'target-arrow-shape': 'triangle', 'arrow-scale': 1,
        'curve-style': 'bezier', 'control-point-step-size': 50, label: 'data(label)', 'font-family': p.font, 'font-size': 12, 'font-weight': 700,
        color: p.text, 'text-background-color': p.surface, 'text-background-opacity': 1, 'text-background-padding': 3,
        'text-background-shape': 'roundrectangle', 'text-border-width': 1, 'text-border-color': 'data(color)', 'text-border-opacity': 1, opacity: 0.9, 'overlay-opacity': 0,
      },
    },
    { selector: 'node:selected', style: { 'border-color': p.accent, 'border-width': 3 } },
    { selector: 'edge:selected', style: { opacity: 1, 'z-index': 20 } },
    { selector: '.dim', style: { opacity: 0.15 } },
  ];
}
