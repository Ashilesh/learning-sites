// Parse `helm template` output (or any multi-document Kubernetes YAML) into resources.
import { load } from 'js-yaml';

/**
 * @returns {{ resources: Array, errors: Array<{index:number, source:string|null, message:string}> }}
 */
export function parseManifests(text) {
  const resources = [];
  const errors = [];
  if (typeof text !== 'string' || !text.trim()) return { resources, errors };

  const docs = splitDocuments(text);
  docs.forEach((doc, index) => {
    const source = (/^#\s*Source:\s*(.+)$/m.exec(doc) || [])[1]?.trim() || null;
    if (!doc.replace(/^\s*#.*$/gm, '').trim()) return;
    let obj;
    try {
      obj = load(doc, { json: true });
    } catch (e) {
      errors.push({ index, source, message: e.reason ? `${e.reason} (line ${e.mark?.line + 1})` : String(e.message || e) });
      return;
    }
    collect(obj, source, resources, errors, index);
  });
  return { resources, errors };
}

function collect(obj, source, resources, errors, index) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  // kind: List (kubectl output) or *List kinds
  if (Array.isArray(obj.items) && typeof obj.kind === 'string' && obj.kind.endsWith('List')) {
    for (const item of obj.items) collect(item, source, resources, errors, index);
    return;
  }
  if (typeof obj.kind !== 'string' || !obj.metadata || typeof obj.metadata !== 'object') {
    errors.push({ index, source, message: 'Document is not a Kubernetes object (missing kind or metadata)' });
    return;
  }
  const name = obj.metadata.name || obj.metadata.generateName;
  if (!name) {
    errors.push({ index, source, message: `${obj.kind} has no metadata.name` });
    return;
  }
  resources.push({ obj, source });
}

export function splitDocuments(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const docs = [];
  let cur = [];
  for (const line of lines) {
    if (/^---(\s|$)/.test(line)) {
      docs.push(cur.join('\n'));
      // keep a trailing comment such as "--- # Source: x"
      const rest = line.slice(3).trim();
      cur = rest.startsWith('#') ? [rest] : [];
      continue;
    }
    if (/^\.\.\.\s*$/.test(line)) { docs.push(cur.join('\n')); cur = []; continue; }
    cur.push(line);
  }
  docs.push(cur.join('\n'));
  return docs;
}

/** "netcrypto/charts/edge-gateway/templates/x.yaml" → "edge-gateway" (deepest subchart), else top chart */
export function chartFromSource(source) {
  if (!source) return null;
  const parts = source.split('/');
  let chart = parts[0] || null;
  for (let i = 0; i < parts.length - 1; i++) if (parts[i] === 'charts' && parts[i + 1]) chart = parts[i + 1];
  return chart;
}
