import { parseManifests } from './engine/parse.js';
import { analyze } from './engine/analyze.js';
import { createGraph, createNamespaceGraph, CLUSTER_NS, EXTERNAL_NS, DENSE_NODES } from './graph.js';
import { createDetails } from './details.js';
import { createConnectionsView, createFindingsView } from './views.js';
import { createHelmEngine } from './helm-engine.js';
import { $, $$, h, clear, fill, toast, download, debounce, CAT_LABEL, SCOPE_LABEL, cssVar, resParts } from './dom.js';

const SKIP_DIRS = new Set(['.git', 'node_modules', '__MACOSX', '.idea', '.vscode']);
const MAX_FILE = 20 * 1024 * 1024;
const MAX_TOTAL = 100 * 1024 * 1024;
const EDGE_CATS = ['network', 'config', 'identity', 'policy', 'pki', 'storage', 'platform'];

const state = {
  helmError: null,
  mode: null,
  session: null,
  chartRoot: null,
  form: null,
  analysis: { clusterDomain: 'cluster.local', certManagerNamespace: 'cert-manager', trustNamespace: 'cert-manager', inferDns: true },
  pasteNamespace: 'default',
  manifest: '',
  parseErrors: [],
  lastRender: null,
  result: null,
  nodeMap: new Map(),
  edgeMap: new Map(),
  filters: null,
  vis: null,
  view: 'graph',
  layoutMode: 'tidy',
  shortNames: true,
  nsDirty: true,
};

let graph, nsGraph, details, connView, findingsView;
const mb = (n) => (n / 1048576).toFixed(1);
let progressText = '';
const helm = createHelmEngine({
  onProgress: ({ loaded, total, done }) => {
    progressText = done ? 'Starting Helm…' : `Loading Helm engine… ${mb(loaded)}${total ? ` of ${mb(total)}` : ''} MB`;
    if (!state.helmReady) $('#helmStatus').textContent = progressText;
    if ($('#dropzone').classList.contains('busy') && !state.helmReady) $('.dz-title').textContent = progressText;
  },
});

// ============================================================ boot
init();

async function init() {
  wireLanding();
  wireWorkspace();
  fetchJson('examples/index.json').then((examples) => {
    if (!examples?.length) return;
    $('#examples').hidden = false;
    $('#exampleList').replaceChildren(...examples.map((ex) => h('button', { class: 'example', onclick: () => loadExample(ex) }, h('b', null, ex.name), h('span', null, ex.description))));
  }).catch(() => {});
  // Start fetching Helm right away; it is cached by the browser after the first visit.
  const st = $('#helmStatus');
  try {
    const v = await helm.load();
    state.helmReady = true;
    st.textContent = `Helm ${v.version} runs in your browser (WebAssembly, default Kubernetes ${v.kubeVersion}). Your chart is never uploaded anywhere.`;
  } catch (e) {
    state.helmError = e.message;
    st.textContent = `${e.message} You can still paste rendered manifests.`;
    st.classList.add('bad');
  }
}

// ============================================================ landing
function wireLanding() {
  $$('.source-tabs button').forEach((b) => b.addEventListener('click', () => {
    $$('.source-tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $('#sourceUpload').hidden = b.dataset.source !== 'upload';
    $('#sourcePaste').hidden = b.dataset.source !== 'paste';
  }));
  const dz = $('#dropzone');
  $('#pickFolder').addEventListener('click', () => $('#folderInput').click());
  $('#pickArchive').addEventListener('click', () => $('#archiveInput').click());
  $('#folderInput').addEventListener('change', (e) => {
    const files = [...e.target.files].map((f) => ({ file: f, path: f.webkitRelativePath || f.name }));
    e.target.value = '';
    uploadFolder(files);
  });
  $('#archiveInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) uploadArchive(f);
  });
  for (const t of ['dragenter', 'dragover']) dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('over'); });
  for (const t of ['dragleave', 'dragend']) dz.addEventListener(t, (e) => { if (e.target === dz) dz.classList.remove('over'); });
  dz.addEventListener('drop', async (e) => {
    e.preventDefault();
    dz.classList.remove('over');
    // entries must be read synchronously, before the first await
    const entries = [...e.dataTransfer.items].filter((i) => i.kind === 'file').map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
    const plain = [...e.dataTransfer.files];
    if (entries.length === 1 && entries[0].isFile) return handleSingleFile(plain[0]);
    if (!entries.length && plain.length === 1) return handleSingleFile(plain[0]);
    try {
      setDropBusy(true, 'Reading folder…');
      const files = entries.length ? await readEntries(entries) : plain.map((f) => ({ file: f, path: f.name }));
      uploadFolder(files);
    } catch (err) {
      setDropBusy(false);
      showLandingError(`Could not read the dropped files: ${err.message}`);
    }
  });
  $('#analyzePaste').addEventListener('click', () => {
    const text = $('#pasteInput').value;
    if (!text.trim()) { showLandingError('Paste some YAML first.'); return; }
    state.pasteNamespace = $('#pasteNamespace').value.trim() || 'default';
    startPaste(text);
  });
}

function handleSingleFile(file) {
  if (!file) return;
  if (/\.(tgz|tar\.gz|tar|zip)$/i.test(file.name)) return uploadArchive(file);
  if (/\.ya?ml$/i.test(file.name) && file.name !== 'Chart.yaml') {
    file.text().then((text) => startPaste(text));
    return;
  }
  showLandingError('Drop the chart folder (the one containing Chart.yaml), a .tgz/.zip archive, or a rendered .yaml file.');
}

async function readEntries(entries) {
  const out = [];
  async function walk(entry, prefix) {
    if (entry.isFile) {
      const f = await new Promise((res, rej) => entry.file(res, rej));
      out.push({ file: f, path: prefix + entry.name });
    } else if (entry.isDirectory) {
      if (SKIP_DIRS.has(entry.name)) return;
      const reader = entry.createReader();
      for (;;) {
        const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      }
    }
  }
  for (const e of entries) await walk(e, '');
  return out;
}

function setDropBusy(busy, text) {
  const dz = $('#dropzone');
  dz.classList.toggle('busy', busy);
  $('.dz-title', dz).textContent = busy ? text : 'Drop a chart folder, .tgz or .zip here';
  if (!busy) $('.dz-title', dz).replaceChildren('Drop a chart folder, ', h('code', null, '.tgz'), ' or ', h('code', null, '.zip'), ' here');
}

function showLandingError(msg, details) {
  const el = $('#landingError');
  el.replaceChildren(msg, details ? h('pre', null, details) : '');
  el.hidden = false;
}

async function uploadFolder(files) {
  $('#landingError').hidden = true;
  const keep = files.filter((x) => !x.path.split('/').some((seg) => SKIP_DIRS.has(seg)) && x.file.size <= MAX_FILE && !x.path.endsWith('.DS_Store'));
  if (!keep.length) { setDropBusy(false); showLandingError('That folder looks empty.'); return; }
  if (!keep.some((x) => x.path.endsWith('Chart.yaml'))) { setDropBusy(false); showLandingError('No Chart.yaml in that folder. Pick the chart directory itself.'); return; }
  const total = keep.reduce((a, x) => a + x.file.size, 0);
  if (total > MAX_TOTAL) { setDropBusy(false); showLandingError(`That folder is ${mb(total)} MB; the limit is ${mb(MAX_TOTAL)} MB. Pick just the chart directory.`); return; }
  setDropBusy(true, `Reading ${keep.length} file${keep.length === 1 ? '' : 's'}…`);
  try {
    const data = await Promise.all(keep.map(async (x) => ({ path: x.path, data: new Uint8Array(await x.file.arrayBuffer()) })));
    await openChart(data);
  } catch (e) {
    setDropBusy(false);
    showLandingError(`Could not read the files: ${e.message}`);
  }
}

async function uploadArchive(file) {
  $('#landingError').hidden = true;
  if (file.size > MAX_TOTAL) { showLandingError(`That archive is ${mb(file.size)} MB; the limit is ${mb(MAX_TOTAL)} MB.`); return; }
  setDropBusy(true, `Reading ${file.name}…`);
  await openChart([{ path: file.name, data: new Uint8Array(await file.arrayBuffer()) }]);
}

async function loadExample(ex) {
  $('#landingError').hidden = true;
  setDropBusy(true, `Loading ${ex.name}…`);
  try {
    const res = await fetch(`examples/${encodeURIComponent(ex.file)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await openChart([{ path: ex.file, data: new Uint8Array(await res.arrayBuffer()) }], ex.suggested);
  } catch (e) {
    setDropBusy(false);
    showLandingError(`Could not load the example: ${e.message}`);
  }
}

/** Inspect the chart files with Helm in the browser, then render them. */
async function openChart(files, suggested) {
  try {
    if (!state.helmReady) setDropBusy(true, progressText || 'Loading Helm engine…');
    const s = await helm.inspect(files);
    if (s.error) throw Object.assign(new Error(s.error), { details: s.details });
    setDropBusy(false);
    state.mode = 'chart';
    state.session = { ...s, files };
    const chart = s.charts[0];
    state.chartRoot = chart.root;
    state.form = defaultForm(chart, suggested);
    state.filters = null;
    state.result = null;
    showWorkspace();
    buildRenderPanel();
    if (chart.missing?.length) showMissingDeps(chart);
    else await doRender();
  } catch (e) {
    setDropBusy(false);
    showLandingError(e.message, e.details);
  }
}

function showMissingDeps(chart) {
  setRenderStatus(h('div', { class: 'alert error' },
    h('b', null, 'Dependencies are missing'),
    h('p', { style: { margin: '6px 0' } }, `Chart.yaml lists ${chart.missing.join(', ')}, but ${chart.missing.length === 1 ? 'it is' : 'they are'} not in the chart's charts/ folder. This page renders charts in your browser and cannot download dependencies.`),
    h('p', { style: { margin: '6px 0 0' } }, 'Run this next to Chart.yaml, then upload the chart again:'),
    h('pre', null, 'helm dependency build')));
  $('#graphEmpty').hidden = false;
  $('#graphEmpty').textContent = 'Add the missing dependencies to charts/, then upload the chart again.';
}

function defaultForm(chart, suggested = {}) {
  const rel = (suggested.releaseName || chart.name || 'release').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 53) || 'release';
  return {
    releaseName: rel, namespace: suggested.namespace || 'default', valuesFiles: [], values: '', set: '',
    kubeVersion: '', apiVersions: '', includeCrds: false, skipTests: false,
  };
}

function startPaste(text) {
  state.mode = 'paste';
  state.session = null;
  state.manifest = text;
  state.filters = null;
  state.lastRender = null;
  showWorkspace();
  buildRenderPanel();
  runAnalysis();
}

// ============================================================ workspace
function wireWorkspace() {
  $$('#tabs button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#newBtn').addEventListener('click', resetToLanding);
  $('#closeDetails').addEventListener('click', () => { details.hide(); graph?.clearHighlight(); });
  $('#collapseRender').addEventListener('click', () => {
    const p = $('#renderPanel');
    p.classList.toggle('collapsed');
    $('#collapseRender').textContent = p.classList.contains('collapsed') ? '+' : '–';
  });
  $('#resetFilters').addEventListener('click', () => { state.filters = defaultFilters(state.result); buildFilterPanel(); refreshVisibility(true); });
  $('#noticeShow').addEventListener('click', () => { state.filters.offScopes.delete('cluster'); buildFilterPanel(); refreshVisibility(); });
  $('#noticeClose').addEventListener('click', () => { state.noticeDismissed = true; $('#notice').hidden = true; });
  $('#fit').addEventListener('click', () => graph.fit());
  $('#relayout').addEventListener('click', () => relayout(true));
  $$('#groupSeg button').forEach((b) => b.addEventListener('click', () => {
    state.groupBySubchart = b.dataset.group === 'subchart';
    $$('#groupSeg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    details.hide();
    graph.setData(state.result, graphOptions());
    refreshVisibility(true);
  }));
  $$('#layoutSeg button').forEach((b) => b.addEventListener('click', () => {
    state.layoutMode = b.dataset.layout;
    $$('#layoutSeg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    relayout(true);
  }));
  $$('.seg button[data-color]').forEach((b) => b.addEventListener('click', () => {
    $$('.seg button[data-color]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    graph.setColorMode(b.dataset.color);
    buildLegend();
  }));
  const search = $('#search');
  search.addEventListener('input', debounce(() => {
    const hits = graph.search(search.value);
    search.title = search.value ? `${hits.length} match${hits.length === 1 ? '' : 'es'}` : '';
  }, 120));
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const hits = graph.search(search.value);
      if (hits.length === 1) selectNode(hits[0].id());
      else if (hits.length) graph.showSet(hits.map((x) => x.id()));
      else toast('No visible resource matches.');
    } else if (e.key === 'Escape') { search.value = ''; graph.search(''); }
  });
  const btn = $('#exportBtn');
  const menu = $('#exportMenu');
  btn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
  document.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); });
  $$('#exportMenu button').forEach((b) => b.addEventListener('click', () => doExport(b.dataset.export)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#workspace').hidden && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      details?.hide();
      graph?.clearHighlight();
    }
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { graph?.restyle(); nsGraph?.restyle(); buildLegend(); });
}

function showWorkspace() {
  $('#landing').hidden = true;
  $('#workspace').hidden = false;
  $('#tabs').hidden = false;
  $('#topActions').hidden = false;
  if (!graph) {
    const ctx = {
      node: (id) => state.nodeMap.get(id), edge: (id) => state.edgeMap.get(id),
      nodes: () => state.result?.nodes || [], edges: () => state.result?.edges || [], namespaces: () => state.result?.namespaces || [],
      selectNode, selectEdge, selectNamespace, onResize: () => requestAnimationFrame(() => { graph.resize(); nsGraph.resize(); }),
      visibleEdges: () => state.vis?.edges || [], findings: () => state.result?.findings || [], showInGraph,
    };
    graph = createGraph($('#cy'), {
      onSelect: (sel) => {
        if (sel.type === 'node') details.showNode(state.nodeMap.get(sel.id));
        else if (sel.type === 'edge') details.showEdge(state.edgeMap.get(sel.id));
        else if (sel.type === 'subchart') details.showSubchart(sel.id);
        else details.showNamespace(sel.id);
      },
      onClear: () => details.hide(),
    });
    nsGraph = createNamespaceGraph($('#cyNs'), {
      onSelect: (sel) => (sel.type === 'namespace' ? details.showNamespace(sel.id) : details.showNamespacePair(sel.edges)),
      onClear: () => details.hide(),
    });
    details = createDetails($('#details'), $('#detailsBody'), ctx);
    connView = createConnectionsView($('#viewConnections'), ctx);
    findingsView = createFindingsView($('#viewFindings'), ctx);
    new ResizeObserver(debounce(() => { graph.resize(); nsGraph.resize(); }, 60)).observe($('#main'));
  }
  setView('graph');
}

async function resetToLanding() {
  Object.assign(state, { mode: null, session: null, result: null, manifest: '', filters: null, vis: null, lastRender: null, groupBySubchart: undefined });
  details?.hide();
  $('#workspace').hidden = true;
  $('#tabs').hidden = true;
  $('#topActions').hidden = true;
  $('#chartPill').hidden = true;
  $('#landing').hidden = false;
}

function setView(v) {
  state.view = v;
  $$('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  $('#viewGraph').hidden = v !== 'graph';
  $('#viewNamespaces').hidden = v !== 'namespaces';
  $('#viewConnections').hidden = v !== 'connections';
  $('#viewFindings').hidden = v !== 'findings';
  if (!state.result) return;
  if (v === 'graph') requestAnimationFrame(() => graph.resize());
  if (v === 'namespaces') requestAnimationFrame(() => { nsGraph.resize(); if (state.nsDirty) rebuildNsGraph(); });
  if (v === 'connections') connView.render();
  if (v === 'findings') findingsView.render();
}

// ============================================================ render panel
function buildRenderPanel() {
  const body = clear($('#renderBody'));
  if (state.mode === 'paste') {
    const ta = h('textarea', { spellcheck: 'false', style: { minHeight: '160px' }, value: state.manifest });
    const ns = h('input', { value: state.pasteNamespace, spellcheck: 'false' });
    fill(body,
      h('div', { class: 'chart-meta' }, h('b', null, 'Pasted manifests'), h('div', { class: 'desc' }, 'Analysed in your browser.')),
      h('label', { class: 'field' }, h('span', null, 'Manifests'), ta),
      h('label', { class: 'field' }, h('span', null, 'Namespace for objects without one'), ns),
      h('button', { class: 'btn btn-primary btn-block', onclick: () => { state.manifest = ta.value; state.pasteNamespace = ns.value.trim() || 'default'; runAnalysis(); } }, 'Analyze'),
      h('div', { id: 'renderStatus' }),
      analysisSettings(),
    );
    return;
  }
  const s = state.session;
  const chart = s.charts.find((c) => c.root === state.chartRoot) || s.charts[0];
  const f = state.form;
  const bind = (key, el, prop = 'value') => { el.addEventListener('input', () => { f[key] = el[prop]; }); el.addEventListener('change', () => { f[key] = el[prop]; }); return el; };
  const submitOnMeta = (el) => { el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doRender(); }); return el; };

  const valuesList = h('div', { class: 'values-list' });
  const drawValues = () => {
    clear(valuesList).append(...(chart.valuesFiles.length ? chart.valuesFiles.map((vf) => {
      const idx = f.valuesFiles.indexOf(vf);
      return h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: idx >= 0, onchange: (e) => { if (e.target.checked) f.valuesFiles.push(vf); else f.valuesFiles.splice(f.valuesFiles.indexOf(vf), 1); drawValues(); } }),
        h('span', null, vf), idx >= 0 ? h('span', { class: 'order', style: { marginLeft: 'auto' }, title: 'Applied in this order' }, String(idx + 1)) : null);
    }) : [h('span', { class: 'hint' }, 'No other values files in this chart.')]));
  };
  drawValues();

  const fileIn = h('input', { type: 'file', accept: '.yaml,.yml,.json', hidden: true });
  const valuesTa = submitOnMeta(bind('values', h('textarea', { spellcheck: 'false', placeholder: 'replicaCount: 3\ningress:\n  enabled: true', value: f.values })));
  fileIn.addEventListener('change', async () => {
    const file = fileIn.files[0];
    if (!file) return;
    valuesTa.value = await file.text();
    f.values = valuesTa.value;
    fileIn.value = '';
    toast(`Loaded ${file.name}`);
  });
  const deps = chart.dependencies || [];
  const vendored = deps.filter((d) => d.vendored).length;

  fill(body,
    h('div', { class: 'chart-meta' },
      h('b', null, chart.name), ' ', chart.version ? `v${chart.version}` : '', chart.appVersion ? ` · app ${chart.appVersion}` : '',
      chart.description ? h('div', { class: 'desc', title: chart.description }, chart.description) : null,
      deps.length ? h('div', { class: 'deps' }, `${deps.length} dependenc${deps.length === 1 ? 'y' : 'ies'}${vendored ? `, ${vendored} in charts/` : ''}`) : null,
      chart.missing?.length ? h('div', { class: 'deps', style: { color: 'var(--err)' } }, `Missing from charts/: ${chart.missing.join(', ')}`) : null,
      chart.error ? h('div', { class: 'alert error' }, chart.error) : null),
    s.charts.length > 1 ? h('label', { class: 'field' }, h('span', null, 'Chart'),
      h('select', { onchange: (e) => { state.chartRoot = e.target.value; state.form = defaultForm(s.charts.find((c) => c.root === e.target.value)); buildRenderPanel(); doRender(); } },
        s.charts.map((c) => h('option', { value: c.root, selected: c.root === state.chartRoot }, `${c.name} (${c.root})`)))) : null,
    h('div', { class: 'row2' },
      h('label', { class: 'field' }, h('span', null, 'Release name'), bind('releaseName', h('input', { value: f.releaseName, spellcheck: 'false' }))),
      h('label', { class: 'field' }, h('span', null, 'Namespace'), bind('namespace', h('input', { value: f.namespace, spellcheck: 'false' })))),
    h('div', { class: 'group-title' }, h('span', null, 'Values files'), chart.defaultValues ? h('button', { class: 'link-btn', onclick: () => details.showText('values.yaml', chart.defaultValues) }, 'view values.yaml') : null),
    valuesList,
    h('p', { class: 'hint' }, 'values.yaml is always applied first.'),
    h('details', { class: 'sub', open: !!f.values || undefined }, h('summary', null, 'Custom values'),
      valuesTa, h('button', { class: 'link-btn', onclick: () => fileIn.click() }, 'Load from file…'), fileIn),
    h('details', { class: 'sub', open: !!f.set || undefined }, h('summary', null, '--set overrides'),
      submitOnMeta(bind('set', h('textarea', { spellcheck: 'false', placeholder: 'image.tag=1.2.3\ningress.enabled=true', value: f.set, style: { minHeight: '56px' } }))),
      h('p', { class: 'hint' }, 'One per line.')),
    h('details', { class: 'sub' }, h('summary', null, 'Advanced'),
      h('div', { class: 'row2' },
        h('label', { class: 'field' }, h('span', null, 'Kubernetes version'), bind('kubeVersion', h('input', { value: f.kubeVersion, placeholder: 'e.g. 1.33', spellcheck: 'false' }))),
        h('div')),
      h('label', { class: 'field' }, h('span', null, 'API versions (for .Capabilities)'), bind('apiVersions', h('textarea', { value: f.apiVersions, spellcheck: 'false', placeholder: 'monitoring.coreos.com/v1\ncert-manager.io/v1', style: { minHeight: '50px' } }))),
      h('label', { class: 'check' }, bind('includeCrds', h('input', { type: 'checkbox', checked: f.includeCrds }), 'checked'), 'Include CRDs'),
      h('label', { class: 'check' }, bind('skipTests', h('input', { type: 'checkbox', checked: f.skipTests }), 'checked'), 'Skip test hooks')),
    h('button', { class: 'btn btn-primary btn-block', id: 'renderBtn', onclick: doRender, title: '⌘/Ctrl + Enter' }, 'Render'),
    h('div', { id: 'renderStatus' }),
    analysisSettings(),
  );
}

function analysisSettings() {
  const a = state.analysis;
  const rerun = debounce(() => runAnalysis(), 400);
  const inp = (key, label) => h('label', { class: 'field' }, h('span', null, label), h('input', { value: a[key], spellcheck: 'false', oninput: (e) => { a[key] = e.target.value.trim(); rerun(); } }));
  return h('details', { class: 'sub' }, h('summary', null, 'Analysis settings'),
    inp('clusterDomain', 'Cluster domain'),
    h('div', { class: 'row2' }, inp('certManagerNamespace', 'cert-manager namespace'), inp('trustNamespace', 'trust-manager namespace')),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: a.inferDns, onchange: (e) => { a.inferDns = e.target.checked; runAnalysis(); } }), 'Infer links from service host names'),
    h('p', { class: 'hint' }, 'ClusterIssuer secrets are looked up in the cert-manager namespace; trust-manager Bundle sources in the trust namespace.'));
}

function setRenderStatus(...nodes) {
  const el = $('#renderStatus');
  if (el) el.replaceChildren(...nodes.filter(Boolean));
}

async function doRender() {
  if (state.mode !== 'chart') return;
  const f = state.form;
  const btn = $('#renderBtn');
  if (btn) { btn.disabled = true; btn.replaceChildren(h('span', { class: 'spinner' }), ' Rendering…'); }
  setRenderStatus();
  const slow = setTimeout(() => setRenderStatus(h('p', { class: 'hint' },
    'Still rendering. Templates that generate keys or certificates (genPrivateKey, genCA, htpasswd) are slower in the browser; once generated they are reused when you render again.')), 1500);
  try {
    const res = await helm.render(state.session.files, {
      chart: state.chartRoot, releaseName: f.releaseName.trim(), namespace: f.namespace.trim(), valuesFiles: f.valuesFiles,
      values: f.values, set: f.set.split('\n').map((x) => x.trim()).filter(Boolean), kubeVersion: f.kubeVersion.trim(),
      apiVersions: f.apiVersions.split(/[\s,]+/).filter(Boolean), includeCrds: f.includeCrds, skipTests: f.skipTests,
    });
    clearTimeout(slow);
    if (res.error) throw Object.assign(new Error(res.error), { details: res.details });
    state.manifest = res.manifest;
    state.lastRender = res;
    runAnalysis();
  } catch (e) {
    clearTimeout(slow);
    setRenderStatus(h('div', { class: 'alert error' }, e.message, e.details ? h('pre', null, e.details) : null));
    if (!state.result) { setView('graph'); $('#graphEmpty').hidden = false; $('#graphEmpty').textContent = 'Fix the render error on the left, then render again.'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Render'; }
  }
}

// ============================================================ analysis
function runAnalysis() {
  const { resources, errors } = parseManifests(state.manifest);
  state.parseErrors = errors;
  const ns = state.mode === 'chart' ? state.form.namespace.trim() || 'default' : state.pasteNamespace;
  const result = analyze(resources, { ...state.analysis, defaultNamespace: ns });
  const status = [];
  if (state.lastRender) {
    status.push(h('div', { class: 'cmd', title: 'Equivalent command' }, state.lastRender.command));
    for (const w of state.lastRender.warnings || []) status.push(h('div', { class: 'alert warn' }, w));
  }
  if (errors.length) {
    status.push(h('div', { class: 'alert warn' }, `${errors.length} document${errors.length === 1 ? ' was' : 's were'} skipped.`,
      h('pre', null, errors.slice(0, 8).map((e) => `${e.source || `document ${e.index + 1}`}: ${e.message}`).join('\n'))));
  }
  if (!resources.length) status.push(h('div', { class: 'alert warn' }, 'No Kubernetes objects found in the output.'));
  setRenderStatus(...status);
  setResult(result);
}

function setResult(r) {
  state.result = r;
  state.nodeMap = new Map(r.nodes.map((n) => [n.id, n]));
  state.edgeMap = new Map(r.edges.map((e) => [e.id, e]));
  if (!state.filters) state.filters = defaultFilters(r);
  const pill = $('#chartPill');
  pill.hidden = false;
  if (state.mode === 'chart') {
    const c = state.session.charts.find((x) => x.root === state.chartRoot);
    pill.replaceChildren(h('b', null, c?.name || 'chart'), ` release ${state.form.releaseName} · ns ${state.form.namespace}`);
  } else pill.replaceChildren(h('b', null, 'Pasted manifests'), ` · default ns ${state.pasteNamespace}`);
  $('#countConnections').textContent = String(r.edges.length);
  const errs = r.findings.filter((x) => x.severity === 'error').length;
  const warns = r.findings.filter((x) => x.severity === 'warn').length;
  const fc = $('#countFindings');
  fc.textContent = String(r.findings.length);
  fc.className = `count${errs ? ' err' : warns ? ' warn' : ''}`;
  details.hide();
  const charts = new Set(r.nodes.filter((n) => n.status === 'defined' && n.chart).map((n) => n.chart));
  state.hasSubcharts = charts.size > 1;
  if (state.groupBySubchart === undefined || !state.hasSubcharts) state.groupBySubchart = state.hasSubcharts;
  $('#groupSeg').hidden = !state.hasSubcharts;
  $$('#groupSeg button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.group === 'subchart') === state.groupBySubchart)));
  graph.setData(r, graphOptions());
  buildFilterPanel();
  buildLegend();
  refreshVisibility(true);
  if (state.view === 'connections') connView.render();
  if (state.view === 'findings') findingsView.render();
}

function graphOptions() {
  return { groupBySubchart: state.groupBySubchart, release: state.shortNames && state.mode === 'chart' ? state.form.releaseName.trim() : null };
}

// ============================================================ filters
function nsKeyOf(n) { return n.namespace === null || n.namespace === undefined ? CLUSTER_NS : n.namespace; }

function defaultFilters(r) {
  // Large charts start without cluster-scoped links (ClusterIssuer, PriorityClass…): they fan in from everywhere.
  const big = r && r.nodes.length > DENSE_NODES && r.edges.some((e) => e.scope === 'cluster');
  return {
    offScopes: new Set(big ? ['cluster'] : []), offCats: new Set(), offNs: new Set(), hiddenKinds: new Set(),
    showInferred: true, showPlaceholders: true, hideHooks: false, hideIsolated: false,
  };
}

function computeVisibility() {
  const f = state.filters;
  const r = state.result;
  const nodes = new Set();
  for (const n of r.nodes) {
    if (f.offNs.has(nsKeyOf(n)) || f.hiddenKinds.has(n.kind)) continue;
    if (!f.showPlaceholders && n.status !== 'defined') continue;
    if (f.hideHooks && n.hook) continue;
    nodes.add(n.id);
  }
  const ok = (id) => (id.startsWith('ns:') ? !f.offNs.has(id.slice(3)) : nodes.has(id));
  const edges = [];
  const deg = new Map();
  for (const e of r.edges) {
    if (f.offScopes.has(e.scope) || f.offCats.has(e.category) || (!f.showInferred && e.inferred)) continue;
    if (!ok(e.source) || !ok(e.target)) continue;
    edges.push(e);
    deg.set(e.source, (deg.get(e.source) || 0) + 1);
    deg.set(e.target, (deg.get(e.target) || 0) + 1);
  }
  if (f.hideIsolated) for (const id of [...nodes]) if (!deg.get(id)) nodes.delete(id);
  const nsVis = new Set();
  for (const n of r.nodes) if (nodes.has(n.id)) nsVis.add(`ns:${nsKeyOf(n)}`);
  for (const e of edges) for (const id of [e.source, e.target]) if (id.startsWith('ns:')) nsVis.add(id);
  return { nodes, edges, edgeIds: new Set(edges.map((e) => e.id)), nsVis };
}

const relayoutSoon = debounce(() => relayout(false), 200);

function refreshVisibility(forceLayout = false) {
  if (!state.result) return;
  state.vis = computeVisibility();
  const { changedNodes } = graph.applyVisibility(state.vis);
  $('#graphEmpty').hidden = state.vis.nodes.size > 0;
  $('#graphEmpty').textContent = 'Nothing matches the current filters.';
  if (forceLayout) relayout(true);
  else if (changedNodes) relayoutSoon();
  updateStats();
  const hiddenCluster = state.filters.offScopes.has('cluster') ? state.result.edges.filter((e) => e.scope === 'cluster').length : 0;
  $('#notice').hidden = !hiddenCluster || state.noticeDismissed;
  $('#noticeText').textContent = `${hiddenCluster} links to cluster-scoped resources are hidden to keep this large chart readable.`;
  state.nsDirty = true;
  if (state.view === 'namespaces') rebuildNsGraph();
  if (state.view === 'connections') connView.render();
}

async function relayout(fit) {
  const busy = $('#graphBusy');
  busy.hidden = false;
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  try { await graph.layout({ mode: state.layoutMode }); } finally { busy.hidden = true; }
  if (fit) graph.fit();
}

function rebuildNsGraph() {
  const visibleNs = new Set([...state.vis.nsVis].map((id) => id.slice(3)));
  nsGraph.setData(state.result, state.vis.edges, visibleNs);
  state.nsDirty = false;
}

function updateStats() {
  const el = $('#statRow');
  if (!el) return;
  const v = state.vis;
  const defined = [...v.nodes].filter((id) => state.nodeMap.get(id)?.status === 'defined').length;
  el.replaceChildren(
    h('div', { class: 'stat' }, h('b', null, String(defined)), h('span', null, 'resources')),
    h('div', { class: 'stat' }, h('b', null, String(v.edges.length)), h('span', null, 'links')),
    h('div', { class: 'stat cross' }, h('b', null, String(v.edges.filter((e) => e.scope === 'cross').length)), h('span', null, 'cross-namespace')));
}

function buildFilterPanel() {
  const r = state.result;
  const f = state.filters;
  const body = clear($('#filterBody'));
  const changed = () => { buildFilterPanel(); refreshVisibility(); };
  const toggle = (set, key) => { if (set.has(key)) set.delete(key); else set.add(key); changed(); };

  const scopeCounts = { same: 0, cross: 0, cluster: 0, external: 0 };
  const catCounts = {};
  for (const e of r.edges) { scopeCounts[e.scope]++; catCounts[e.category] = (catCounts[e.category] || 0) + 1; }
  const scopeColor = { same: '--scope-same', cross: '--scope-cross', cluster: '--scope-cluster', external: '--scope-external' };
  const scopeChips = ['cross', 'same', 'cluster', 'external'].filter((s) => scopeCounts[s]).map((s) => h('button', { class: 'chip', 'aria-pressed': String(!f.offScopes.has(s)), onclick: () => toggle(f.offScopes, s), title: `Show links: ${SCOPE_LABEL[s]}` },
    h('span', { class: 'swatch-line', style: { borderColor: cssVar(scopeColor[s]), borderTopWidth: s === 'cross' ? '3px' : '2px' } }), SCOPE_LABEL[s], h('span', { class: 'n' }, String(scopeCounts[s]))));
  const catChips = EDGE_CATS.filter((c) => catCounts[c]).map((c) => h('button', { class: 'chip', 'aria-pressed': String(!f.offCats.has(c)), onclick: () => toggle(f.offCats, c) },
    h('span', { class: 'dot', style: { background: cssVar(`--c-${c}`) } }), CAT_LABEL[c], h('span', { class: 'n' }, String(catCounts[c]))));

  const inferred = r.edges.filter((e) => e.inferred).length;
  const placeholders = r.nodes.filter((n) => n.status !== 'defined').length;
  const hooks = r.nodes.filter((n) => n.hook).length;
  const check = (label, value, onChange, count) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: value, onchange: (e) => { onChange(e.target.checked); changed(); } }), label, count !== undefined ? h('span', { class: 'n' }, String(count)) : null);

  const nsCounts = new Map();
  for (const n of r.nodes) nsCounts.set(nsKeyOf(n), (nsCounts.get(nsKeyOf(n)) || 0) + (n.status === 'defined' ? 1 : 0));
  for (const e of r.edges) for (const id of [e.source, e.target]) if (id.startsWith('ns:') && !nsCounts.has(id.slice(3))) nsCounts.set(id.slice(3), 0);
  for (const n of r.nodes) if (!nsCounts.has(nsKeyOf(n))) nsCounts.set(nsKeyOf(n), 0);
  const nsInfo = new Map(r.namespaces.map((n) => [n.name, n]));
  const nsKeys = [...nsCounts.keys()].sort((a, b) => {
    const rank = (k) => (k === CLUSTER_NS ? 2 : k === EXTERNAL_NS ? 3 : nsInfo.get(k)?.release ? 0 : 1);
    return rank(a) - rank(b) || (nsCounts.get(b) - nsCounts.get(a)) || a.localeCompare(b);
  });
  const nsLabelOf = (k) => (k === CLUSTER_NS ? 'Cluster-scoped' : k === EXTERNAL_NS ? 'Outside the cluster' : k);
  const nsRows = nsKeys.map((k) => h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked: !f.offNs.has(k), onchange: () => toggle(f.offNs, k) }),
    h('span', { class: k.startsWith('__') ? '' : 'mono', style: { fontSize: '12.5px' } }, nsLabelOf(k)),
    nsInfo.get(k)?.release ? h('span', { class: 'tag', style: { fontSize: '10px', padding: '0 5px' } }, 'release') : null,
    h('button', { class: 'link-btn', style: { marginLeft: 'auto', fontSize: '11px' }, title: 'Show only this namespace', onclick: (e) => { e.preventDefault(); f.offNs = new Set(nsKeys.filter((x) => x !== k)); changed(); } }, 'only'),
    h('span', { class: 'n', style: { marginLeft: '6px' } }, String(nsCounts.get(k)))));

  const kindCounts = {};
  for (const n of r.nodes) if (n.status === 'defined') kindCounts[n.kind] = (kindCounts[n.kind] || 0) + 1;
  const kindChips = Object.entries(kindCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, c]) => h('button', { class: 'chip', 'aria-pressed': String(!f.hiddenKinds.has(k)), onclick: () => toggle(f.hiddenKinds, k) }, k, h('span', { class: 'n' }, String(c))));

  fill(body,
    h('div', { class: 'stat-row', id: 'statRow' }),
    h('div', { class: 'group-title' }, 'Links'),
    h('div', { class: 'chips' }, scopeChips),
    h('div', { class: 'group-title' }, 'Relationship'),
    h('div', { class: 'chips' }, catChips),
    h('div', { class: 'group-title' }, 'Show'),
    inferred ? check('Links inferred from host names', f.showInferred, (v) => { f.showInferred = v; }, inferred) : null,
    placeholders ? check('Things not defined in the chart', f.showPlaceholders, (v) => { f.showPlaceholders = v; }, placeholders) : null,
    hooks ? check('Helm hooks and tests', !f.hideHooks, (v) => { f.hideHooks = !v; }, hooks) : null,
    check('Hide resources with no links', f.hideIsolated, (v) => { f.hideIsolated = v; }),
    state.mode === 'chart' && r.nodes.some((n) => n.name.startsWith(`${state.form.releaseName.trim()}-`))
      ? h('label', { class: 'check', title: 'Full names are always shown in the details panel' }, h('input', {
        type: 'checkbox', checked: state.shortNames,
        onchange: (e) => { state.shortNames = e.target.checked; graph.setData(state.result, graphOptions()); refreshVisibility(true); },
      }), `Drop “${state.form.releaseName.trim()}-” from labels`) : null,
    h('div', { class: 'group-title' }, h('span', null, 'Namespaces'),
      h('span', null, h('button', { class: 'link-btn', onclick: () => { f.offNs = new Set(); changed(); } }, 'all'))),
    nsRows,
    h('details', { class: 'sub', style: { marginTop: '10px' } }, h('summary', null, `Kinds (${Object.keys(kindCounts).length})`),
      h('div', { class: 'chips' }, kindChips),
      h('div', { style: { marginTop: '6px' } }, h('button', { class: 'link-btn', onclick: () => { f.hiddenKinds = new Set(); changed(); } }, 'show all'), ' · ',
        h('button', { class: 'link-btn', onclick: () => { f.hiddenKinds = new Set(['ConfigMap', 'Secret']); changed(); } }, 'hide ConfigMaps & Secrets'))),
  );
  if (f.hiddenKinds.size) $('details.sub', body).open = true;
  if (state.vis) updateStats();
}

function buildLegend() {
  const el = $('#legend');
  if (!state.result) return;
  const mode = graph.colorMode();
  const items = [];
  const line = (color, label, opts = {}) => h('div', { class: 'lg' }, h('span', { class: `swatch-line${opts.dashed ? ' dashed' : ''}`, style: { borderColor: color, borderTopWidth: opts.w || '2px' } }), label);
  items.push(h('h4', null, 'Links'));
  if (mode === 'scope') {
    items.push(line(cssVar('--scope-cross'), 'Cross-namespace', { w: '3px' }), line(cssVar('--scope-same'), 'Same namespace'), line(cssVar('--scope-cluster'), 'Cluster-scoped'));
  } else {
    const present = new Set(state.result.edges.map((e) => e.category));
    for (const c of EDGE_CATS) if (present.has(c)) items.push(line(cssVar(`--c-${c}`), CAT_LABEL[c]));
  }
  items.push(line(cssVar('--text-3'), 'Inferred from host name', { dashed: true }));
  if (state.result.edges.some((e) => e.allowed === false)) items.push(line(cssVar('--err'), 'Not allowed', { dashed: true }));
  items.push(h('h4', null, 'Resources'));
  const cats = new Set(state.result.nodes.filter((n) => n.status === 'defined').map((n) => n.category));
  for (const c of ['workload', 'network', 'config', 'identity', 'policy', 'pki', 'storage', 'platform']) {
    if (cats.has(c)) items.push(h('div', { class: 'lg' }, h('span', { class: 'node-sw', style: { background: cssVar(`--c-${c}`) } }), CAT_LABEL[c]));
  }
  if (state.result.nodes.some((n) => n.status === 'external')) items.push(h('div', { class: 'lg' }, h('span', { class: 'node-sw ghost' }), 'Not in this chart'));
  if (state.result.nodes.some((n) => n.status === 'generated')) items.push(h('div', { class: 'lg' }, h('span', { class: 'node-sw gen', style: { background: cssVar('--c-config') } }), 'Created at runtime'));
  fill(el, h('button', { class: 'legend-toggle', onclick: () => el.classList.toggle('collapsed'), title: 'Show or hide the legend' }, 'Legend'), h('div', { class: 'legend-body' }, items));
}

// ============================================================ selection
function selectNode(id) {
  const n = state.nodeMap.get(id);
  if (!n) return;
  if (state.view !== 'graph') setView('graph');
  if (!graph.select(id)) toast('That resource is hidden by the current filters.');
  details.showNode(n);
}

function selectEdge(id) {
  const e = state.edgeMap.get(id);
  if (!e) return;
  if (state.view !== 'graph') setView('graph');
  requestAnimationFrame(() => { if (!graph.select(id)) toast('That link is hidden by the current filters.'); });
  details.showEdge(e);
}

function selectNamespace(id) {
  if (state.view !== 'graph') setView('graph');
  graph.select(id);
  details.showNamespace(id);
}

function showInGraph(finding) {
  setView('graph');
  requestAnimationFrame(() => {
    const n = graph.showSet([...(finding.nodes || []), ...(finding.edges || [])]);
    if (!n) toast('Those resources are hidden by the current filters.');
    const first = state.nodeMap.get(finding.nodes?.[0]);
    if (first) details.showNode(first);
  });
}

// ============================================================ export
async function doExport(kind) {
  if (!state.result) return;
  const base = (state.mode === 'chart' ? `${state.form.releaseName}` : 'manifests').replace(/[^a-z0-9-]/gi, '-');
  if (kind === 'png') {
    if (state.view !== 'graph') { setView('graph'); await new Promise((r) => setTimeout(r, 50)); }
    download(`${base}-topology.png`, graph.png());
  } else if (kind === 'csv') {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const row = (id) => {
      const n = state.nodeMap.get(id);
      if (!n) return ['Namespace', '', id.replace(/^ns:/, '')];
      const p = resParts(n);
      return [p.kind, n.namespace ?? '', p.name];
    };
    const lines = [['from_kind', 'from_namespace', 'from_name', 'relationship', 'to_kind', 'to_namespace', 'to_name', 'scope', 'category', 'inferred', 'evidence'].join(',')];
    for (const e of state.vis.edges) lines.push([...row(e.source), e.label, ...row(e.target), e.scope, e.category, e.inferred, e.details.map((d) => d.path + (d.text ? ` (${d.text})` : '')).join('; ')].map(q).join(','));
    download(`${base}-connections.csv`, lines.join('\n'), 'text/csv');
  } else if (kind === 'json') {
    const r = state.result;
    const out = {
      generatedAt: new Date().toISOString(), source: state.lastRender?.command || 'pasted manifests', options: r.options, stats: r.stats,
      namespaces: r.namespaces.map(({ obj, ...x }) => x), nodes: r.nodes.map(({ obj, annotations, ...x }) => x), edges: r.edges, findings: r.findings,
    };
    download(`${base}-topology.json`, JSON.stringify(out, null, 2), 'application/json');
  } else if (kind === 'yaml') {
    download(`${base}-rendered.yaml`, state.manifest, 'text/yaml');
  }
}

// ============================================================ fetch
async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  if (!res.ok) {
    const err = new Error(body?.error || `Request failed (${res.status})`);
    err.details = body?.details;
    err.status = res.status;
    throw err;
  }
  return body;
}
