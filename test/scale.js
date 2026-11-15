/* Scale test: layout + viewport query on a large map (no UI) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..', 'src');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({ font: '', measureText: (t) => ({ width: String(t || '').length * 7.2 }) });
window.api = { loadCorpus: () => Promise.resolve(null), saveCorpus: () => Promise.resolve({ ok: true }) };

['s2t', 'i18n', 'util', 'store', 'layout'].forEach((f) => {
  window.eval(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'));
});

const CC = window.CC;
const S = CC.store, L = CC.layout;
S.init(null, {});

const N = Number(process.argv[2] || 30000);
const t0 = Date.now();
const m = S.newMap('scale', { silent: true });
const rootCard = S.newCard({ title: 'root', tags: ['r'] }, true);
m.positions[rootCard.id] = { x: 0, y: 0 };
const tags = ['a', 'b', 'c', 'd'];

for (let i = 0; i < N; i++) {
  const c = S.newCard({ title: 'node ' + i, tags: [tags[i % 4]] }, true);
  m.edges.push({ id: 'e' + i, from: rootCard.id, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: i % 97 === 0 });
  if (i % 50 === 0) m.edges.push({ id: 'r' + i, from: c.id, to: rootCard.id === c.id ? c.id : rootCard.id, type: 'reference', color: '', label: '', uncertain: false });
}
m.rev = 1;
const tBuild0 = Date.now();
const model = L.get(m);
const tBuild = Date.now() - tBuild0;

const total = L.totalNodes(model);
const rect = { x1: -200, y1: -200, x2: 400, y2: 300 };
const tq0 = Date.now();
const q = L.query(model, rect, 200);
const tq = Date.now() - tq0;
const pan0 = process.hrtime.bigint();
for (let i = 0; i < 50; i++) {
  L.query(model, { x1: rect.x1 + i * 40, y1: rect.y1 + i * 20, x2: rect.x2 + i * 40, y2: rect.y2 + i * 20 }, 200);
}
const tPan = Number(process.hrtime.bigint() - pan0) / 1e6 / 50;
const wide0 = process.hrtime.bigint();
const wide = L.query(model, { x1: rect.x1 - 2000, y1: rect.y1 - 2000, x2: rect.x2 + 2000, y2: rect.y2 + 2000 }, 400, 1800);
const tWide = Number(process.hrtime.bigint() - wide0) / 1e6;
const vis = {};
q.ids.forEach((id) => { vis[id] = 1; });
const edges = L.queryEdges(model, rect, vis, 200);
const clusters = L.clusters(model, { x1: -1e6, y1: -1e6, x2: 1e6, y2: 1e6 });
const tCache0 = Date.now();
L.get(m);
const tCache = Date.now() - tCache0;

let orgOk = true;
let org = null;
if (N <= 200000) {
  m.structure = 'org';
  m.rev++;
  L.invalidate(m.id);
  org = L.get(m);
  const child = Object.keys(org.nodes).filter((id) => id !== org.roots[0]).slice(0, 40).map((id) => org.nodes[id]);
  orgOk = child.every((n) => n.y > org.nodes[org.roots[0]].y);
}

const out = {
  nodes: N,
  buildMs: tBuild,
  queryMs: tq,
  visible: q.ids.length,
  truncated: q.truncated,
  edgesVisible: edges.length,
  clusters: clusters.length,
  cacheMs: tCache,
  panAvgMs: Number(tPan.toFixed(3)),
  wideQueryMs: Number(tWide.toFixed(3)),
  wideVisible: wide.ids.length,
  heapMB: Math.round(process.memoryUsage().heapUsed / 1048576),
  rssMB: Math.round(process.memoryUsage().rss / 1048576),
  bounds: model.bounds,
  orgOk: orgOk,
  orgLevels: org ? org.roots.length : 0,
  totalMs: Date.now() - t0
};
console.log(JSON.stringify(out, null, 2));

const ok = out.nodes === N && out.visible > 0 && out.visible < 400 && out.clusters > 0 &&
  out.cacheMs < 50 && out.orgOk && out.bounds.w > 0 && out.panAvgMs < 16 && out.wideQueryMs < 120;
process.exit(ok ? 0 : 1);
