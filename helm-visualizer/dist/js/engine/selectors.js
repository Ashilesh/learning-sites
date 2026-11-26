// Label selector evaluation: Kubernetes LabelSelector, plain maps and Calico selector expressions.

export function isEmptySelector(sel) {
  if (!sel || typeof sel !== 'object') return true;
  const ml = sel.matchLabels && Object.keys(sel.matchLabels).length;
  const me = Array.isArray(sel.matchExpressions) && sel.matchExpressions.length;
  return !ml && !me;
}

/** Plain map selector (Service.spec.selector, Istio selector.labels). Empty map never matches here. */
export function matchMap(map, labels) {
  if (!map || typeof map !== 'object') return false;
  const entries = Object.entries(map);
  if (!entries.length) return false;
  labels = labels || {};
  return entries.every(([k, v]) => String(labels[k]) === String(v) && k in labels);
}

/** Kubernetes metav1.LabelSelector. An empty selector matches everything. */
export function matchLabelSelector(sel, labels, keyMap = (k) => k) {
  labels = labels || {};
  if (!sel || typeof sel !== 'object') return true;
  for (const [rawK, v] of Object.entries(sel.matchLabels || {})) {
    const k = keyMap(rawK);
    if (k === null) continue;
    if (!(k in labels) || String(labels[k]) !== String(v)) return false;
  }
  for (const expr of sel.matchExpressions || []) {
    if (!expr || !expr.key) continue;
    const k = keyMap(expr.key);
    if (k === null) continue;
    const has = k in labels;
    const vals = (expr.values || []).map(String);
    switch (expr.operator) {
      case 'In': if (!has || !vals.includes(String(labels[k]))) return false; break;
      case 'NotIn': if (has && vals.includes(String(labels[k]))) return false; break;
      case 'Exists': if (!has) return false; break;
      case 'DoesNotExist': if (has) return false; break;
      default: return false;
    }
  }
  return true;
}

export function selectorToString(sel) {
  if (!sel || typeof sel !== 'object') return '';
  if (typeof sel === 'string') return sel;
  const parts = [];
  const ml = sel.matchLabels || (sel.matchExpressions ? {} : sel);
  for (const [k, v] of Object.entries(ml || {})) {
    if (typeof v === 'object') continue;
    parts.push(`${k}=${v}`);
  }
  for (const e of sel.matchExpressions || []) {
    if (!e) continue;
    if (e.operator === 'Exists') parts.push(e.key);
    else if (e.operator === 'DoesNotExist') parts.push(`!${e.key}`);
    else parts.push(`${e.key} ${e.operator === 'NotIn' ? 'notin' : 'in'} (${(e.values || []).join(',')})`);
  }
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Calico selector expressions, e.g.  app == 'web' && has(tier) && env in {'a','b'}
// Returns a predicate (labels) => boolean, or null if the expression cannot be parsed.

export function compileCalicoSelector(expr) {
  if (expr === undefined || expr === null) return null;
  const src = String(expr).trim();
  if (src === '') return () => true;
  let toks;
  try { toks = tokenize(src); } catch { return null; }
  let i = 0;
  const peek = () => toks[i];
  const next = () => toks[i++];
  const expect = (t) => { const n = next(); if (!n || n.v !== t) throw new Error(`expected ${t}`); return n; };

  function parseOr() {
    let left = parseAnd();
    while (peek() && peek().v === '||') { next(); const r = parseAnd(); const l = left; left = (x) => l(x) || r(x); }
    return left;
  }
  function parseAnd() {
    let left = parseNot();
    while (peek() && peek().v === '&&') { next(); const r = parseNot(); const l = left; left = (x) => l(x) && r(x); }
    return left;
  }
  function parseNot() {
    if (peek() && peek().v === '!') { next(); const inner = parseNot(); return (x) => !inner(x); }
    return parseAtom();
  }
  function parseValues() {
    expect('{');
    const vals = [];
    while (peek() && peek().v !== '}') {
      const t = next();
      if (t.t === 'str') vals.push(t.v);
      else if (t.v !== ',') throw new Error('bad set');
    }
    expect('}');
    return vals;
  }
  function parseAtom() {
    const t = next();
    if (!t) throw new Error('unexpected end');
    if (t.v === '(') { const e = parseOr(); expect(')'); return e; }
    if (t.t === 'id' && (t.v === 'all' || t.v === 'global') && peek() && peek().v === '(') {
      next(); expect(')'); return () => true;
    }
    if (t.t === 'id' && t.v === 'has' && peek() && peek().v === '(') {
      next(); const k = next(); expect(')'); return (x) => k.v in x;
    }
    if (t.t !== 'id') throw new Error('expected label');
    const key = t.v;
    const op = next();
    if (!op) throw new Error('expected operator');
    if (op.v === '==' || op.v === '!=') {
      const val = next();
      if (!val || val.t !== 'str') throw new Error('expected string');
      return op.v === '==' ? (x) => x[key] === val.v : (x) => x[key] !== val.v;
    }
    if (op.v === 'in') { const vals = parseValues(); return (x) => key in x && vals.includes(x[key]); }
    if (op.v === 'not' && peek() && peek().v === 'in') { next(); const vals = parseValues(); return (x) => !(key in x) || !vals.includes(x[key]); }
    if (op.v === 'contains' || op.v === 'starts' || op.v === 'ends') {
      if (op.v !== 'contains') expect('with');
      const val = next();
      if (!val || val.t !== 'str') throw new Error('expected string');
      if (op.v === 'contains') return (x) => typeof x[key] === 'string' && x[key].includes(val.v);
      if (op.v === 'starts') return (x) => typeof x[key] === 'string' && x[key].startsWith(val.v);
      return (x) => typeof x[key] === 'string' && x[key].endsWith(val.v);
    }
    throw new Error(`unknown operator ${op.v}`);
  }

  try {
    const fn = parseOr();
    if (i !== toks.length) return null;
    return (labels) => { try { return !!fn(labels || {}); } catch { return false; } };
  } catch {
    return null;
  }
}

function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      const j = s.indexOf(c, i + 1);
      if (j === -1) throw new Error('unterminated string');
      out.push({ t: 'str', v: s.slice(i + 1, j) });
      i = j + 1; continue;
    }
    const two = s.slice(i, i + 2);
    if (['==', '!=', '&&', '||'].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if ('(){},!'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    const m = /^[A-Za-z0-9_./-]+/.exec(s.slice(i));
    if (m) { out.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
    throw new Error(`bad char ${c}`);
  }
  return out;
}
