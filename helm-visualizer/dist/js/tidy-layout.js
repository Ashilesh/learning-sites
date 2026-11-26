// "Tidy" layout for nested groups (namespace → subchart → resources).
//
// Force-directed layouts let sibling boxes overlap when many links cross them. This one never does:
//   1. inside every box, each connected cluster of resources gets its own force layout,
//      and unconnected resources go into a grid;
//   2. those pieces, and any child boxes, are packed into rows;
//   3. top-level boxes are ordered so that namespaces with many links sit next to each other.

const GAP = 36;
const CELL_W = 128;
const CELL_H = 64;

export function tidyLayout(cy, { forceLayoutName = 'fcose' } = {}) {
  const shown = (n) => n.style('display') !== 'none';
  const visibleEdges = cy.edges().filter((e) => shown(e) && shown(e.source()) && shown(e.target()));

  const roots = cy.nodes().filter((n) => shown(n) && n.parent().length === 0);
  for (const r of roots) if (r.isParent()) arrangeCompound(r);

  // order top-level boxes by how strongly they are linked to the boxes already placed
  const rootOf = new Map();
  for (const r of roots) {
    rootOf.set(r.id(), r.id());
    if (r.isParent()) r.descendants().forEach((d) => rootOf.set(d.id(), r.id()));
  }
  const weight = new Map();
  visibleEdges.forEach((e) => {
    const a = rootOf.get(e.source().id());
    const b = rootOf.get(e.target().id());
    if (!a || !b || a === b) return;
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    weight.set(k, (weight.get(k) || 0) + 1);
  });
  const w = (a, b) => weight.get(a < b ? `${a}|${b}` : `${b}|${a}`) || 0;
  const remaining = roots.toArray();
  const size = (n) => (n.isParent() ? n.descendants().length : 1);
  remaining.sort((a, b) => (b.hasClass('ns-release') - a.hasClass('ns-release')) || size(b) - size(a));
  const order = [];
  while (remaining.length) {
    let best = 0;
    let bestScore = -1;
    remaining.forEach((n, i) => {
      const score = order.reduce((s, o) => s + w(n.id(), o.id()), 0) * 1000 + size(n);
      if (score > bestScore) { bestScore = score; best = i; }
    });
    order.push(remaining.splice(best, 1)[0]);
  }
  pack(order.map((n) => blockFor(n)), 1.7);

  function blockFor(n) {
    const leaves = n.isParent() ? n.descendants().filter((d) => !d.isParent() && shown(d)) : n;
    return { bb: n.boundingBox({ includeLabels: true, includeOverlays: false }), leaves };
  }

  function arrangeCompound(c) {
    const kids = c.children().filter(shown);
    const leaves = kids.filter((k) => !k.isParent());
    const subs = kids.filter((k) => k.isParent());
    subs.forEach(arrangeCompound);

    const blocks = [];
    if (leaves.length) {
      const internal = leaves.edgesWith(leaves).filter(shown);
      const linked = leaves.filter((n) => n.edgesWith(leaves).filter(shown).length > 0);
      const lonely = leaves.not(linked);
      for (const comp of linked.union(internal).components()) {
        const nodes = comp.nodes();
        if (nodes.length > 1) {
          comp.layout({
            name: forceLayoutName, quality: 'proof', randomize: true, animate: false, fit: false, packComponents: false,
            nodeDimensionsIncludeLabels: true, nodeRepulsion: () => 6500, idealEdgeLength: () => 75, edgeElasticity: () => 0.45,
            gravity: 0.6, numIter: 2500, tile: false,
          }).run();
        }
        blocks.push({ bb: nodes.boundingBox({ includeLabels: true }), leaves: nodes });
      }
      if (lonely.length) blocks.push(gridBlock(lonely));
    }
    for (const s of subs) blocks.push(blockFor(s));
    blocks.sort((a, b) => b.bb.h * b.bb.w - a.bb.h * a.bb.w);
    pack(blocks, 1.35);
  }

  function gridBlock(nodes) {
    const sorted = nodes.sort((a, b) => (a.data('kind') || '').localeCompare(b.data('kind') || '') || (a.data('label') || '').localeCompare(b.data('label') || ''));
    const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length * 1.4)));
    sorted.forEach((n, i) => n.position({ x: (i % cols) * CELL_W, y: Math.floor(i / cols) * CELL_H }));
    return { bb: sorted.boundingBox({ includeLabels: true }), leaves: sorted };
  }

  /** Shelf-pack blocks into rows about `aspect` times wider than tall. */
  function pack(blocks, aspect) {
    if (!blocks.length) return;
    const area = blocks.reduce((s, b) => s + (b.bb.w + GAP) * (b.bb.h + GAP), 0);
    const maxW = Math.max(...blocks.map((b) => b.bb.w));
    const target = Math.max(maxW, Math.sqrt(area * aspect));
    let x = 0;
    let y = 0;
    let rowH = 0;
    for (const b of blocks) {
      if (x > 0 && x + b.bb.w > target) { x = 0; y += rowH + GAP; rowH = 0; }
      b.leaves.shift({ x: x - b.bb.x1, y: y - b.bb.y1 });
      x += b.bb.w + GAP;
      rowH = Math.max(rowH, b.bb.h);
    }
  }
}
