// Small DOM helpers. Everything from a chart is inserted as text, never as HTML.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el) { el.replaceChildren(); return el; }

/** Replace an element's children, skipping null/false entries. */
export function fill(el, ...children) { el.replaceChildren(); append(el, children); return el; }

let toastTimer;
export function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

export function download(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const CAT_LABEL = {
  workload: 'Workloads', network: 'Traffic', config: 'Config & secrets', identity: 'Identity & RBAC',
  policy: 'Policy', pki: 'Certificates', storage: 'Storage', platform: 'Platform', external: 'External',
};

export const SCOPE_LABEL = {
  same: 'Same namespace', cross: 'Cross-namespace', cluster: 'Cluster-scoped', external: 'Outside the cluster',
};

export const STATUS_LABEL = {
  defined: 'Defined in chart', generated: 'Created at runtime', external: 'Not in this chart', pseudo: 'Selector / peer',
};

export function nsLabel(ns) {
  if (ns === null || ns === undefined) return 'cluster';
  if (ns === '__external') return 'external';
  return ns;
}

/** "Kind ns/name" pieces for display */
export function resParts(n) {
  if (!n) return { kind: '?', ns: '', name: '?' };
  if (n.isNamespace) return { kind: 'Namespace', ns: '', name: n.name };
  const ns = n.namespace && n.namespace !== '__external' ? `${n.namespace}/` : '';
  return { kind: n.kind, ns, name: n.name };
}

export function resEl(n, tag = 'span') {
  const p = resParts(n);
  return h(tag, { class: 'res' }, h('span', { class: 'k' }, `${p.kind} `), p.ns ? h('span', { class: 'ns' }, p.ns) : null, p.name);
}

export function resText(n) {
  const p = resParts(n);
  return `${p.kind} ${p.ns}${p.name}`;
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
