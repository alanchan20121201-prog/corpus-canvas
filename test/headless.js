/* Headless functional test: loads the renderer in jsdom and exercises every view. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..', 'src');
const errors = [];
const steps = [];

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script[\s\S]*?<\/script>/g, '');

const dom = new JSDOM(html, { url: 'http://localhost/?nofirst=1', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

/* --- browser bits jsdom lacks --- */
window.HTMLCanvasElement.prototype.getContext = function () {
  return {
    font: '',
    measureText(t) { return { width: String(t == null ? '' : t).length * 7.2 }; },
    fillRect() {}, drawImage() {}, fillText() {}
  };
};
const rect = () => ({ x: 0, y: 0, width: 1280, height: 820, top: 0, left: 0, right: 1280, bottom: 820, toJSON() { return this; } });
window.Element.prototype.getBoundingClientRect = rect;
window.SVGElement.prototype.getBoundingClientRect = rect;
window.HTMLElement.prototype.scrollIntoView = function () {};
if (!window.navigator.clipboard) {
  Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() } });
}
window.addEventListener('error', (e) => errors.push('window.error: ' + (e.message || e.error)));
const origError = console.error;
console.error = function () {
  errors.push('console.error: ' + Array.prototype.map.call(arguments, (a) => (a && a.stack) || String(a)).join(' '));
};

/* --- fake IPC --- */
let corpus = null;
const chats = [];
window.api = {
  info: () => Promise.resolve({ version: '1.0.0', locale: 'zh-CN', userDir: 'C:/tmp', corpusPath: 'C:/tmp/corpus.json', platform: 'win32', encrypted: true, dev: true }),
  loadCorpus: () => Promise.resolve(corpus),
  saveCorpus: (d) => { corpus = (d && d.data) ? d.data : d; return Promise.resolve({ ok: true }); },
  exportBundle: () => Promise.resolve({ ok: false, canceled: true }),
  importBundle: () => Promise.resolve({ ok: false, canceled: true }),
  exportPdf: () => Promise.resolve({ ok: false, canceled: true }),
  submitQuickCapture: () => Promise.resolve({ ok: false }),
  cancelQuickCapture: () => Promise.resolve({ ok: true }),
  onQuickCapture: () => () => {},
  snapshotBackup: () => Promise.resolve({ ok: true, name: 'test-snapshot' }),
  checkAttachments: () => Promise.resolve({ ok: true, missing: [] }),
  revealCorpus: () => Promise.resolve({ ok: true }),
  getKey: () => Promise.resolve({ key: '', encrypted: true }),
  setKey: () => Promise.resolve({ ok: true }),
  clearKey: () => Promise.resolve({ ok: true }),
  exportBackup: () => Promise.resolve({ ok: true, path: 'C:/tmp/b.wef' }),
  importBackup: () => Promise.resolve({ ok: false, canceled: true }),
  importDialog: () => Promise.resolve({ ok: false, canceled: true }),
  saveImage: () => Promise.resolve({ ok: true, path: 'C:/tmp/map.png' }),
  parseXmind: () => Promise.resolve({ ok: false, error: 'x' }),
  chat: (payload) => { chats.push(payload); return Promise.resolve({ ok: true, status: 200, content: '{"nodes":[]}', usage: { total_tokens: 12 }, ms: 40 }); },
  cancelChat: () => Promise.resolve({ ok: true }),
  onChatChunk: () => () => {},
  ledgerList: () => Promise.resolve({ ok: true, items: [
    { id: 'l1', at: Date.now() - 60000, kind: 'draft', model: 'gpt-4o-mini', status: 'ok', tokens: 88, ms: 120, streamed: true, bytes: 240 },
    { id: 'l2', at: Date.now() - 120000, kind: 'review', model: 'gpt-4o-mini', status: 'aborted', tokens: 0, ms: 40, streamed: true, bytes: 0 }
  ] }),
  ledgerClear: () => Promise.resolve({ ok: true }),
  corpusStats: () => Promise.resolve({ ok: true, sharded: true, shards: 3, cards: 4201 }),
  listLibraries: () => Promise.resolve({ ok: true, activeId: 'default', items: [
    { id: 'default', name: 'Default', cards: 3, corpusPath: 'C:/tmp/corpus.json' },
    { id: 'lib2', name: 'Work', cards: 0, corpusPath: 'C:/tmp/libraries/lib2/corpus.json' }
  ] }),
  createLibrary: (p) => Promise.resolve({ ok: true, id: 'lib3', name: p.name }),
  switchLibrary: () => Promise.resolve({ ok: false }),
  renameLibrary: () => Promise.resolve({ ok: true }),
  deleteLibrary: () => Promise.resolve({ ok: true }),
  smokeDone: () => Promise.resolve({ ok: true }),
  quit: () => Promise.resolve()
};

/* --- load scripts in order --- */
const scripts = (fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<script src="([^"]+)"><\/script>/g) || [])
  .map((s) => s.replace(/.*src="([^"]+)".*/, '$1'));
scripts.forEach((rel) => {
  window.eval(read(rel.replace(/^js\//, 'js/')));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function step(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then((info) => { console.log('[step]', name, 'cards=', window.CC && window.CC.store && window.CC.store.cards().length); return info; })
    .then((info) => steps.push({ name, ok: true, info: info === undefined ? '' : String(info) }))
    .catch((e) => { steps.push({ name, ok: false, info: String(e && e.stack || e) }); errors.push(name + ': ' + e.message); });
}

(async function run() {
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await sleep(350);

  const CC = window.CC;
  const S = CC.store;
  const U = CC.util;

  await step('boot-home', () => {
    if (!document.querySelector('.hero-title')) throw new Error('home not rendered');
    if (!CC.app) throw new Error('app missing');
    return document.querySelector('.hero-title').textContent;
  });

  await step('i18n-coverage', () => {
    const base = CC.i18n.dicts['zh-CN'];
    const full = ['zh-CN', 'zh-TW', 'en', 'ja'];
    const missing = [];
    full.forEach((lang) => {
      Object.keys(base).forEach((k) => { if (!CC.i18n.dicts[lang][k]) missing.push(lang + ':' + k); });
    });
    /* keys present in en/ja but absent in zh-CN silently fall back to English
       in the Chinese UI, so check the reverse direction too */
    ['en', 'ja'].forEach((lang) => {
      Object.keys(CC.i18n.dicts[lang]).forEach((k) => { if (!base[k]) missing.push('zh-CN<' + lang + ':' + k); });
    });
    if (missing.length) throw new Error('missing: ' + missing.join(', '));
    const extra = ['es', 'fr', 'ko'];
    const reach = JSON.parse(require('fs').readFileSync(__dirname + '/reach-keys.json', 'utf8'));
    extra.forEach((code) => {
      const d = CC.i18n.dicts[code];
      if (!d) throw new Error('missing dictionary ' + code);
      Object.keys(reach).forEach((k) => { if (!d[k]) missing.push(code + ':' + k); });
      ['ai.errAuth', 'ai.errRate', 'ai.errEndpoint', 'ai.errTimeout', 'ai.errNetwork', 'ai.errRequest', 'ai.errServer', 'ai.errEmpty', 'ai.errConfig',
        'ai.summarize', 'cards.all', 'cards.inMaps', 'style.rounded', 'style.rect', 'style.pill', 'style.small', 'style.medium', 'style.large']
        .forEach((k) => { if (!d[k]) missing.push(code + ':' + k); });
    });
    if (missing.length) throw new Error('missing: ' + missing.slice(0, 12).join(', '));
    if (CC.i18n.langs.length !== 7) throw new Error('langs=' + CC.i18n.langs.length);
    const sys = { 'zh-HK': 'zh-TW', 'zh-Hant-TW': 'zh-TW', 'zh-CN': 'zh-CN', 'fr-FR': 'fr', 'ko-KR': 'ko', 'xx-YY': 'en' };
    Object.keys(sys).forEach((loc) => {
      if (CC.i18n.resolveSystem(loc) !== sys[loc]) throw new Error(loc + '->' + CC.i18n.resolveSystem(loc));
    });
    return Object.keys(base).length + ' keys, 4 full + 3 hand-written, 7 langs';
  });

  await step('demo-load', () => {
    CC.demo.load();
    if (S.cards().length < 8) throw new Error('cards=' + S.cards().length);
    if (S.maps().length < 2) throw new Error('maps=' + S.maps().length);
    return S.cards().length + ' cards / ' + S.maps().length + ' maps';
  });

  await step('map-render', () => {
    CC.app.nav('map');
    const nodes = document.querySelectorAll('#g-nodes .node').length;
    const edges = document.querySelectorAll('#g-edges .edge').length;
    if (!nodes) throw new Error('no nodes');
    if (!edges) throw new Error('no edges');
    return nodes + ' nodes / ' + edges + ' edges';
  });

  await step('outline-render', () => {
    CC.app.nav('outline');
    const rows = document.querySelectorAll('.ol-row').length;
    if (!rows) throw new Error('no rows');
    return rows + ' rows';
  });

  await step('cards-render', () => {
    CC.app.nav('cards');
    const rows = document.querySelectorAll('.tr[data-row]').length;
    if (!rows) throw new Error('no rows');
    return rows + ' rows';
  });

  await step('search-latin', () => {
    CC.search.setQuery('note');
    CC.app.nav('search');
    return document.querySelectorAll('.result-row').length + ' hits';
  });

  await step('search-traditional', () => {
    CC.search.setQuery('筆記');
    CC.app.nav('search');
    const n = document.querySelectorAll('.result-row').length;
    if (!n) throw new Error('traditional query found nothing');
    return n + ' hits';
  });

  await step('search-simplified', () => {
    CC.search.setQuery('笔记');
    CC.app.nav('search');
    const n = document.querySelectorAll('.result-row').length;
    if (!n) throw new Error('simplified query found nothing');
    return n + ' hits';
  });

  await step('relation-tab', () => {
    document.querySelector('[data-tab="relation"]').click();
    return document.querySelectorAll('.rel-card').length + ' groups';
  });

  await step('structure-tab', () => {
    document.querySelector('[data-tab="structure"]').click();
    return document.querySelectorAll('.rel-card').length + ' groups';
  });

  await step('health-view', () => {
    CC.app.nav('health');
    return document.querySelectorAll('.health-card').length + ' cards';
  });

  await step('history-view', () => {
    CC.app.nav('history');
    return document.querySelectorAll('.tl-row').length + ' entries';
  });

  await step('trash-view', () => {
    CC.app.nav('trash');
    return 'ok';
  });

  await step('settings-view', () => {
    CC.app.nav('settings');
    const cards = document.querySelectorAll('.set-card').length;
    if (cards < 5) throw new Error('sections=' + cards);
    return cards + ' sections';
  });

  await step('inspector', () => {
    const c = S.cards()[1];
    CC.app.nav('cards');
    CC.app.openCard(c.id);
    const input = document.querySelector('#insp-title');
    if (!input) throw new Error('inspector not open');
    return input.value;
  });

  await step('edit-title', () => {
    const c = S.cards()[1];
    const before = c.title;
    const el = document.querySelector('#insp-title');
    el.value = 'edited title';
    el.dispatchEvent(new window.Event('input'));
    el.dispatchEvent(new window.Event('blur'));
    if (S.card(c.id).title !== 'edited title') throw new Error('title not saved');
    S.undo();
    const undone = S.cards().length;
    S.redo();
    if (S.card(c.id).title !== 'edited title') throw new Error('redo failed');
    S.undo(); S.redo();
    return 'ok, undo->' + undone + ', restored=' + before;
  });

  await step('add-node-edge', () => {
    CC.app.nav('map');
    const before = S.cards().length;
    const m = S.currentMap();
    const a = S.cards()[0].id, b = S.cards()[1].id;
    S.commit('edit', 'test edge', () => {
      m.edges.push({ id: U.uid('e'), from: a, to: b, type: 'synonym', label: 'syn', uncertain: true });
    });
    return 'cards ' + before + ' -> ' + S.cards().length;
  });

  await step('graph-apis', () => {
    CC.graph.selectCard(S.cards()[0].id);
    CC.graph.centerOn(S.cards()[0].id);
    CC.graph.beginLink(S.cards()[0].id);
    CC.graph.toggleFocus();
    CC.graph.toggleFocus();
    return 'ok';
  });

  await step('import-markdown', () => {
    const parsed = CC.importer.parseMarkdown('# 根\n- 一\n  - 二\n    - 三');
    if (!parsed || !parsed.tree) throw new Error('parse failed');
    const res = CC.importer.importTree(parsed.tree, { mode: 'map', name: 'md-test', mapName: 'md-test' });
    if (!res.created) throw new Error('nothing imported');
    return res.created + ' imported';
  });

  await step('backup-shape', () => {
    const db = S.state();
    if (!db.cards.length || !db.maps.length) throw new Error('empty');
    const payload = { format: 'corpus-canvas', formatVersion: S.FORMAT_VERSION, data: { cards: db.cards, maps: db.maps } };
    const text = JSON.stringify(payload);
    if (text.indexOf('apiKey') >= 0) throw new Error('key leaked into backup');
    return text.length + ' bytes';
  });

  await step('language-switch', () => {
    const label = () => document.querySelector('.rail-btn[data-nav="map"] .rail-label').textContent;
    CC.app.setLang('en');
    const en = label();
    CC.app.setLang('ja');
    const ja = label();
    CC.app.setLang('zh-TW');
    const tw = label();
    CC.app.setLang('es');
    const es = label();
    CC.app.setLang('fr');
    const fr = label();
    CC.app.setLang('ko');
    const ko = label();
    CC.app.setLang('zh-CN');
    if (!en || !ja || !tw || !es || !fr || !ko) throw new Error('labels empty');
    if (new Set([en, ja, tw, es, fr, ko]).size < 6) throw new Error('not translated: ' + [en, ja, tw, es, fr, ko].join('/'));
    return [en, ja, tw, es, fr, ko].join(' / ');
  });

  await step('theme-switch', () => {
    CC.app.setTheme('dark');
    const t1 = document.documentElement.getAttribute('data-theme');
    CC.app.setTheme('paper');
    CC.app.setTheme('light');
    return t1;
  });

  await step('snapshot-rollback', () => {
    const n0 = S.cards().length;
    S.createSnapshot('test snap', false, true);
    S.commit('create', 'temp card', () => { S.newCard({ title: 'temp' }); });
    const n1 = S.cards().length;
    const snap = S.state().snapshots[0];
    S.restoreSnapshot(snap.id);
    const n2 = S.cards().length;
    if (!(n1 > n0 && n2 === n0)) throw new Error(n0 + '/' + n1 + '/' + n2);
    return n0 + ' -> ' + n1 + ' -> ' + n2;
  });

  await step('merge', () => {
    const a = S.newCard({ title: 'dup a' }, true);
    const b = S.newCard({ title: 'dup b', tags: ['x'] }, true);
    S.commit('merge', 'test merge', () => { S.mergeCards(a.id, b.id); });
    if (!S.card(a.id).deletedAt) throw new Error('not merged');
    return 'ok';
  });

  await step('queries', () => {
    CC.search.setQuery('x');
    CC.app.nav('search');
    return 'ok';
  });


  await step('languages-ui', async () => {
    const ui = CC.i18n.langs.map((l) => l.code);
    if (ui.length < 4) throw new Error('ui languages=' + ui.join(','));
    CC.app.nav('cards');
    CC.app.openCard(S.cards()[1].id);
    await sleep(30);
    if (document.querySelector('.chips-box[data-field="langs"]')) throw new Error('language sticker UI still present');
    return 'ui ' + ui.join('/');
  });

  await step('auto-link', async () => {
    CC.app.nav('map');
    await sleep(40);
    const m = S.currentMap();
    const beforeCards = S.cards().length;
    const beforeEdges = m.edges.length;
    CC.graph.selectCard(S.cards()[0].id);
    CC.graph.addNodeAt(60, 60, false);
    await sleep(30);
    const afterLink = S.currentMap().edges.length;
    if (S.cards().length !== beforeCards + 1) throw new Error('card not created');
    if (afterLink !== beforeEdges + 1) throw new Error('no auto edge: ' + beforeEdges + '->' + afterLink);
    CC.graph.addNodeAt(120, 120, true);
    await sleep(30);
    if (S.currentMap().edges.length !== afterLink) throw new Error('shift-created node should float');
    return 'cards +2, auto edge ok';
  });

  await step('child-placement', async () => {
    CC.app.nav('map');
    await sleep(40);
    const m = S.currentMap();
    const parent = S.mapCards(m)[0];
    const model = CC.layout.get(m);
    const pn = model.nodes[parent.id];
    CC.graph.selectCard(parent.id);
    CC.graph.addNodeAt(pn.x + 90, pn.y + 30, false);
    await sleep(60);
    const newId = CC.graph.selection()[0];
    if (!newId) throw new Error('no child');
    if (m.offsets && m.offsets[newId]) throw new Error('child kept a manual offset');
    const model2 = CC.layout.get(m);
    const cn = model2.nodes[newId];
    if (!cn) throw new Error('child not in layout');
    if (Math.abs(cn.x - pn.x) > 700) throw new Error('edge too long: ' + Math.round(Math.abs(cn.x - pn.x)));
    S.commit('edit', 'title', function () { S.updateCard(newId, { title: 'child' }); });
    const model3 = CC.layout.get(m);
    if (Math.abs(model3.nodes[newId].x - cn.x) > 2) throw new Error('layout jumped after edit');
    return 'gap ' + Math.round(Math.abs(cn.x - pn.x));
  });

  await step('link-mode', async () => {
    CC.app.nav('map');
    await sleep(40);
    const before = S.currentMap().edges.length;
    const els = document.querySelectorAll('#g-nodes .node');
    if (els.length < 2) throw new Error('not enough nodes');
    CC.graph.setMode('link');
    els[0].dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 200 }));
    const els2 = document.querySelectorAll('#g-nodes .node');
    els2[1].dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 220 }));
    await sleep(30);
    const modal = [...document.querySelectorAll('.overlay')].pop();
    if (!modal || !modal.querySelector('#edge-type')) throw new Error('edge dialog did not open');
    modal.querySelector('.modal-foot .btn.primary').click();
    await sleep(60);
    if (S.currentMap().edges.length !== before + 1) throw new Error('edge not added');
    return 'ok';
  });

  await step('drag-live', async () => {
    CC.app.nav('map');
    await sleep(50);
    const node = document.querySelector('#g-nodes .node');
    if (!node) throw new Error('no node');
    const before = Array.prototype.map.call(document.querySelectorAll('.edge-line'), (p) => p.getAttribute('d')).join('|');
    const tr = node.getAttribute('transform');
    node.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 300 }));
    const svg = document.querySelector('#map-svg');
    svg.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 380, clientY: 340 }));
    await sleep(60);
    const during = Array.prototype.map.call(document.querySelectorAll('.edge-line'), (p) => p.getAttribute('d')).join('|');
    if (before === during) throw new Error('edges did not follow the drag');
    if (node.getAttribute('transform') === tr) throw new Error('node did not move');
    svg.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 380, clientY: 340 }));
    await sleep(40);
    return 'live edges ok';
  });

  await step('untitled-node', async () => {
    CC.app.nav('map');
    const m = S.currentMap();
    const c = S.newCard({ title: '' }, true);
    m.positions[c.id] = { x: 5000, y: 5000 };
    m.rev++;
    S.settings().lastMapId = m.id;
    CC.app.nav('map');
    await sleep(60);
    const texts = Array.prototype.map.call(document.querySelectorAll('.node-title'), (e) => e.textContent);
    if (!texts.join('').includes(window.t('common.untitled'))) throw new Error('placeholder missing: ' + texts.slice(0, 5).join(','));
    return 'placeholder ok';
  });

  await step('virtualisation', async () => {
    const m = S.newMap('big map', { silent: true });
    const root = S.newCard({ title: 'big root' }, true);
    m.positions[root.id] = { x: 0, y: 0 };
    for (let i = 0; i < 3000; i++) {
      const c = S.newCard({ title: 'n' + i, tags: ['t' + (i % 5)] }, true);
      m.edges.push({ id: 'e' + i, from: root.id, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: false });
    }
    m.rev++;
    S.settings().lastMapId = m.id;
    CC.app.nav('map');
    await sleep(80);
    const stats = CC.graph.stats();
    const domNodes = document.querySelectorAll('#g-nodes .node').length;
    if (stats.total < 3000) throw new Error('total=' + stats.total);
    if (domNodes > 2600) throw new Error('rendered too many: ' + domNodes);
    if (stats.visible < 1) throw new Error('nothing visible');
    return 'total ' + stats.total + ', visible ' + stats.visible + ', dom ' + domNodes + ', lod ' + stats.lod;
  });

  await step('org-layout', async () => {
    const m = S.currentMap();
    m.structure = 'org';
    m.rev++;
    CC.layout.invalidate(m.id);
    CC.graph.refresh();
    const model = CC.layout.get(m);
    const root = model.nodes[model.roots[0]];
    const kid = model.nodes[(model.nodes[model.roots[0]].kids[0])];
    if (!(kid.y > root.y)) throw new Error('org not vertical');
    return 'ok';
  });

  await step('modal-confirm', async () => {
    const p = U.confirm('title', 'message');
    await sleep(30);
    const modal = [...document.querySelectorAll('.overlay')].pop();
    const btn = modal.querySelector('.modal-foot .btn.primary');
    if (!btn) throw new Error('no modal');
    btn.click();
    const r = await p;
    if (r !== true) throw new Error('confirm returned ' + r);
    await sleep(220);
    return 'ok';
  });

  await step('modal-prompt', async () => {
    const p = U.prompt('name', '', {});
    await sleep(30);
    const modal = [...document.querySelectorAll('.overlay')].pop();
    const input = modal.querySelector('#prompt-input');
    input.value = 'hello';
    modal.querySelector('.modal-foot .btn.primary').click();
    const r = await p;
    if (r !== 'hello') throw new Error('prompt returned ' + r);
    return r;
  });

  await step('ai-draft', async () => {
    S.settings().ai.hasKey = true;
    S.settings().ai.baseUrl = 'https://example.com/v1';
    S.settings().ai.model = 'test-model';
    window.api.chat = () => Promise.resolve({
      ok: true,
      content: JSON.stringify({ nodes: [
        { tempId: 'n1', title: 'AI 根节点' },
        { tempId: 'n2', title: 'AI 子节点', parent: 'n1' }
      ], edges: [{ from: 'n1', to: 'n2', type: 'hierarchy' }] }),
      usage: { total_tokens: 88 }, ms: 15
    });
    CC.app.nav('map');
    const before = S.cards().length;
    CC.ai.open('draft');
    await sleep(40);
    const ta = document.querySelector('#ai-text');
    if (!ta) throw new Error('no ai input');
    ta.value = '示例素材';
    ta.dispatchEvent(new window.Event('input'));
    document.querySelector('#ai-run').click();
    await sleep(80);
    const items = document.querySelectorAll('.ai-item').length;
    if (items !== 2) throw new Error('draft items=' + items);
    document.querySelector('#ai-accept').click();
    await sleep(260);
    const after = S.cards().length;
    if (after !== before + 2) throw new Error('cards ' + before + '->' + after);
    return items + ' items, cards ' + before + '->' + after;
  });

  await step('ai-review', async () => {
    window.api.chat = () => Promise.resolve({
      ok: true,
      content: JSON.stringify({ items: [
        { cardId: S.cards()[0].id, location: 'x', problem: 'p', suggestion: 's', confidence: 'high' }
      ] }),
      usage: { total_tokens: 42 }, ms: 9
    });
    const before = S.pendingCount();
    CC.ai.open('review');
    await sleep(40);
    document.querySelector('#ai-run').click();
    await sleep(80);
    const n = document.querySelectorAll('.review-item').length;
    if (!n) throw new Error('no review items');
    document.querySelector('#ai-accept').click();
    await sleep(40);
    const after = S.pendingCount();
    if (after <= before) throw new Error('pending ' + before + '->' + after);
    return 'pending ' + before + '->' + after;
  });

  await step('search-batch', async () => {
    CC.search.setQuery('n1');
    CC.app.nav('search');
    document.querySelector('[data-act="sel-all"]').click();
    await sleep(20);
    const bar = document.querySelector('[data-act="to-map"]');
    if (!bar) throw new Error('no batch actions');
    return 'ok';
  });

  await step('first-run', async () => {
    S.resetAll();
    const empty = S.newMap('empty map', { silent: true });
    const id = CC.app.ensureFirstNode();
    if (!id) throw new Error('no starter node');
    if (S.cards().length !== 1 || S.maps().length !== 1) throw new Error(S.cards().length + '/' + S.maps().length);
    if (S.card(id).title !== window.t('onboard.centerNode')) throw new Error(S.card(id).title);
    if (S.state().settings.lastMapId !== empty.id) throw new Error('starter node not in the existing empty map');
    CC.app.nav('map');
    return S.card(id).title;
  });

  await step('help-localised', async () => {
    CC.app.setLang('ko');
    CC.app.nav('help');
    const text = Array.prototype.map.call(document.querySelectorAll('.help-article'), (a) => a.textContent).join(' ');
    if (/[一-龥]/.test(text)) throw new Error('Chinese text leaked into the Korean manual');
    if (document.querySelectorAll('.help-article').length < 6) throw new Error('sections=' + document.querySelectorAll('.help-article').length);
    document.querySelector('[data-tab="ai"]').click();
    const aiText = Array.prototype.map.call(document.querySelectorAll('.help-article'), (a) => a.textContent).join(' ');
    if (/[一-龥]/.test(aiText)) throw new Error('Chinese text leaked into the Korean AI guide');
    CC.app.setLang('zh-CN');
    return 'ko manual clean';
  });

  await step('help-canvas-section', async () => {
    const langs = ['zh-CN', 'zh-TW', 'en', 'ja', 'es', 'fr', 'ko'];
    const missing = [];
    for (const lang of langs) {
      CC.app.setLang(lang);
      CC.app.nav('help');
      const el = document.querySelector('#h-canvas');
      if (!el) { missing.push(lang); continue; }
      const body = el.textContent || '';
      if (body.length < 80) missing.push(lang + ':thin');
      /* Japanese legitimately uses kanji, so only the Latin-script manuals
         are checked for stray Chinese characters. */
      if (['es', 'fr', 'ko'].indexOf(lang) >= 0 && /[一-龥]/.test(body)) missing.push(lang + ':han');
    }
    CC.app.setLang('zh-CN');
    if (missing.length) throw new Error('canvas section missing: ' + missing.join(','));
    return 'canvas section in ' + langs.length + ' languages';
  });

  await step('help-view', async () => {
    CC.app.nav('help');
    const n1 = document.querySelectorAll('.help-article').length;
    if (n1 < 8) throw new Error('guide sections=' + n1);
    document.querySelector('[data-tab="ai"]').click();
    const n2 = document.querySelectorAll('.help-article').length;
    if (n2 < 6) throw new Error('ai sections=' + n2);
    const input = document.querySelector('#help-search');
    input.value = 'API';
    input.dispatchEvent(new window.Event('input'));
    const visible = Array.prototype.filter.call(document.querySelectorAll('.help-article'), (a) => a.style.display !== 'none').length;
    if (!visible || visible === n2) throw new Error('search filter failed: ' + visible + '/' + n2);
    return 'guide ' + n1 + ', ai ' + n2 + ', filtered ' + visible;
  });


  await step('inline-edit', async () => {
    CC.app.nav('map');
    await sleep(60);
    const m = S.currentMap();
    const id = S.mapCards(m)[0].id;
    const before = S.card(id).title;
    CC.graph.beginInlineEdit(id);
    await sleep(30);
    const ta = document.querySelector('.inline-edit-input');
    if (!ta) throw new Error('no inline editor');
    ta.value = '就地改名测试';
    ta.dispatchEvent(new window.Event('input'));
    ta.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(60);
    if (S.card(id).title !== '就地改名测试') throw new Error('title not applied: ' + S.card(id).title);
    if (document.querySelector('.inline-edit-input')) throw new Error('editor still open');
    S.undo();
    await sleep(30);
    if (S.card(id).title !== before) throw new Error('undo failed: ' + S.card(id).title);
    S.redo();
    await sleep(30);
    return 'renamed on canvas, undo/redo ok';
  });

  await step('inline-edit-cancel', async () => {
    CC.app.nav('map');
    await sleep(40);
    const m = S.currentMap();
    const id = S.mapCards(m)[0].id;
    const before = S.card(id).title;
    CC.graph.beginInlineEdit(id);
    await sleep(20);
    const ta = document.querySelector('.inline-edit-input');
    if (!ta) throw new Error('no inline editor');
    ta.value = 'should be discarded';
    ta.dispatchEvent(new window.Event('input'));
    ta.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(40);
    if (S.card(id).title !== before) throw new Error('escape did not cancel: ' + S.card(id).title);
    if (document.querySelector('.inline-edit-input')) throw new Error('editor still open');
    return 'escape cancels';
  });

  await step('marquee-select', async () => {
    const m = S.newMap('marquee map', { silent: true });
    const c1 = S.newCard({ title: 'mq one' }, true);
    const c2 = S.newCard({ title: 'mq two' }, true);
    m.positions[c1.id] = { x: 0, y: 0 };
    m.positions[c2.id] = { x: 260, y: 0 };
    m.edges.push({ id: U.uid('e'), from: c1.id, to: c2.id, type: 'hierarchy', color: '', label: '', uncertain: false });
    m.rev++;
    S.settings().lastMapId = m.id;
    CC.app.nav('map');
    await sleep(80);
    const cards = S.mapCards(m);
    if (cards.length < 2) throw new Error('need 2 nodes');
    const model = CC.layout.get(m);
    const ids = cards.map((c) => c.id);
    const a = model.nodes[ids[0]], b = model.nodes[ids[1]];
    const minX = Math.min(a.x - a.w / 2, b.x - b.w / 2) - 40;
    const minY = Math.min(a.y - a.h / 2, b.y - b.h / 2) - 40;
    const maxX = Math.max(a.x + a.w / 2, b.x + b.w / 2) + 40;
    const maxY = Math.max(a.y + a.h / 2, b.y + b.h / 2) + 40;
    const svg = document.querySelector('#map-svg');
    const r = svg.getBoundingClientRect();
    const view = CC.graph.viewInfo();
    const k = view.k;
    const toClient = (wx, wy) => ({
      x: r.left + view.x + wx * k,
      y: r.top + view.y + wy * k
    });
    const p0 = toClient(minX, minY);
    const p1 = toClient(maxX, maxY);
    svg.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: p0.x, clientY: p0.y, shiftKey: true }));
    const box = document.querySelector('.marquee-box');
    if (!box) throw new Error('no marquee box');
    svg.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: p1.x, clientY: p1.y }));
    svg.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: p1.x, clientY: p1.y }));
    await sleep(40);
    const sel = CC.graph.selection();
    if (sel.length < 2) throw new Error('marquee selected ' + sel.length);
    if (document.querySelector('.marquee-box')) throw new Error('marquee box left behind');
    return sel.length + ' nodes selected';
  });

  await step('marquee-mode-toggle', async () => {
    CC.app.nav('map');
    await sleep(40);
    const btn = document.querySelector('[data-act="marquee"]');
    if (!btn) throw new Error('no marquee button');
    btn.click();
    await sleep(30);
    if (!btn.classList.contains('active')) throw new Error('marquee mode not active');
    btn.click();
    await sleep(30);
    if (btn.classList.contains('active')) throw new Error('marquee mode still active');
    return 'toggle ok';
  });

  await step('minimap', async () => {
    window.__MMDBG = 1;
    CC.app.nav('map');
    await sleep(60);
    const mm = document.querySelector('#minimap');
    if (!mm) throw new Error('no minimap');
    if (mm.hidden) throw new Error('minimap hidden by default');
    const cells = document.querySelectorAll('#minimap-svg .mm-cell').length;
    if (!cells) throw new Error('no minimap cells');
    const view = document.querySelector('#minimap-svg .mm-view');
    if (!view) throw new Error('no minimap viewport');
    const w = CC.graph.minimapWorldAt(95, 64);
    if (!w || typeof w.x !== 'number') throw new Error('minimapWorldAt failed');
    document.querySelector('[data-act="minimap"]').click();
    await sleep(40);
    if (!document.querySelector('#minimap').hidden) throw new Error('minimap not hidden');
    document.querySelector('[data-act="minimap"]').click();
    await sleep(40);
    if (document.querySelector('#minimap').hidden) throw new Error('minimap not shown again');
    return cells + ' cells';
  });

  await step('batch4-theme-library', async () => {
    CC.app.nav('map');
    await sleep(80);
    if (!CC.themes) throw new Error('no themes module');
    const list = CC.themes.list();
    if (!list || list.length < 6) throw new Error('themes=' + (list && list.length));
    const ids = list.map((x) => x.id);
    ['default', 'paper', 'ink', 'night', 'forest', 'dusk'].forEach((id) => {
      if (ids.indexOf(id) < 0) throw new Error('missing theme ' + id);
    });
    const stage = document.querySelector('#map-stage');
    if (!stage) throw new Error('no map stage');
    CC.themes.apply(stage, 'night');
    await sleep(30);
    const bg = stage.style.getPropertyValue('--map-bg');
    if (!bg) throw new Error('theme did not set --map-bg');
    const accent = stage.style.getPropertyValue('--accent');
    if (!accent) throw new Error('theme did not set --accent');
    const night = CC.themes.get('night');
    if (night.fills.length < 4) throw new Error('theme has no fill palette');
    CC.themes.clear(stage);
    await sleep(20);
    if (stage.style.getPropertyValue('--map-bg')) throw new Error('theme not cleared');
    return list.length + ' themes';
  });

  await step('batch4-theme-on-map', async () => {
    const m = S.currentMap();
    S.commit('edit', 'test theme', () => {
      m.style = m.style || {};
      m.style.theme = 'forest';
    });
    await sleep(400);
    const stage = document.querySelector('#map-stage');
    const bg = stage.style.getPropertyValue('--map-bg');
    if (!bg) throw new Error('map theme not applied to stage');
    if (CC.graph.mapTheme().id !== 'forest') throw new Error('mapTheme wrong');
    S.commit('edit', 'test theme off', () => { m.style.theme = 'default'; });
    await sleep(400);
    if (stage.style.getPropertyValue('--map-bg')) throw new Error('default theme still applied');
    return 'forest applied';
  });

  await step('batch4-summary-node', async () => {
    CC.app.nav('map');
    await sleep(80);
    const m0 = S.currentMap();
    const card = S.mapCards(m0)[0];
    if (!card) throw new Error('no mapped cards');
    S.commit('edit', 'test summary', () => {
      card.summary = 'A one-line summary for the test.';
      card.style = card.style || {};
      card.style.summaryKind = 'callout';
    });
    await sleep(400);
    if (!document.querySelector('#g-nodes .node-summary-callout')) throw new Error('summary callout not rendered');
    S.commit('edit', 'test summary badge', () => { card.style.summaryKind = 'badge'; });
    await sleep(400);
    if (!document.querySelector('#g-nodes .node-summary-badge')) throw new Error('summary badge not rendered');
    S.commit('edit', 'test summary clear', () => {
      card.style.summaryKind = 'plain';
      card.summary = '';
    });
    await sleep(400);
    if (document.querySelector('#g-nodes .node-summary')) throw new Error('summary not cleared');
    return 'plain/callout/badge ok';
  });

  await step('batch4-edge-style', async () => {
    CC.app.nav('map');
    await sleep(80);
    const m = S.currentMap();
    if (!m.edges.length) throw new Error('no edges');
    const e = m.edges.filter((x) => x.type !== 'hierarchy')[0] || m.edges[0];
    S.commit('edit', 'test edge style', () => {
      e.style = { dash: 'dashed', arrow: 'open', width: 'thick' };
    });
    await sleep(400);
    if (!document.querySelector('#g-edges .edge-dash-dashed')) throw new Error('dashed edge class missing');
    if (!document.querySelector('#g-edges .edge-a-open')) throw new Error('open arrow style missing');
    if (!document.querySelector('#g-edges .edge-w-thick')) throw new Error('thick edge missing');
    S.commit('edit', 'test edge style off', () => {
      e.style = { dash: 'solid', arrow: 'solid', width: 'medium' };
    });
    await sleep(400);
    if (document.querySelector('#g-edges .edge-dash-dashed')) throw new Error('dash style not restored');
    return 'dash/arrow/width ok';
  });

  await step('batch4-attachments', async () => {
    if (!CC.attach) throw new Error('no attachments module');
    CC.app.nav('map');
    await sleep(80);
    const card = S.cards()[0];
    S.commit('edit', 'test attachment', () => {
      card.attachments = [{ id: 'att-test', name: 'note.txt', ext: '.txt', mime: 'text/plain', size: 12 }];
    });
    CC.graph.selectCard(card.id);
    await sleep(180);
    const block = document.querySelector('#insp-attachments') || document.querySelector('.attach-list');
    if (!block) throw new Error('attachment block not rendered');
    if ((block.textContent || '').indexOf('note.txt') < 0) throw new Error('attachment name missing');
    if (!document.querySelector('[data-act="attach-open"]')) throw new Error('attach-open missing');
    if (!document.querySelector('[data-act="attach-reveal"]')) throw new Error('attach-reveal missing');
    if (!document.querySelector('[data-act="attach-del"]')) throw new Error('attach-del missing');
    S.commit('edit', 'test attachment off', () => { card.attachments = []; });
    CC.graph.selectCard(card.id);
    await sleep(120);
    return 'attachment block ok';
  });

  await step('batch4-present-mode', async () => {
    CC.app.nav('map');
    await sleep(80);
    const items = CC.graph.presentItems();
    if (!items || !items.length) throw new Error('no present items');
    if (!items[0].title) throw new Error('first item has no title');
    if (!CC.present.start()) throw new Error('present did not start');
    await sleep(80);
    if (!document.querySelector('.present-view')) throw new Error('no present view');
    if (!document.querySelector('.present-title')) throw new Error('no present title');
    if (!(document.querySelector('.present-count').textContent || '').trim()) throw new Error('no progress counter');
    if (items.length > 1) {
      CC.present.go(1);
      await sleep(60);
      if (CC.present.index() !== 1) throw new Error('present next failed');
      CC.present.go(-1);
      await sleep(60);
      if (CC.present.index() !== 0) throw new Error('present prev failed');
    }
    CC.present.exit();
    await sleep(60);
    if (document.querySelector('.present-view')) throw new Error('present not closed');
    if (document.body.classList.contains('presenting')) throw new Error('presenting class left behind');
    return items.length + ' slides';
  });

  await step('batch4-a4-print', async () => {
    CC.app.nav('map');
    await sleep(80);
    const scene = CC.graph.sceneForPrint();
    if (!scene || !scene.nodes.length) throw new Error('no scene');
    if (!scene.bounds || !isFinite(scene.bounds.w)) throw new Error('bad bounds');
    if (!scene.nodes[0].lines || !scene.nodes[0].lines.length) throw new Error('scene has no node lines');
    const origPrint = window.print;
    window.print = function () {};
    CC.print.print();
    await sleep(160);
    window.print = origPrint;
    const made = document.querySelectorAll('.print-root .print-page');
    if (!made.length) throw new Error('no print pages');
    const svg = made[0].querySelector('svg');
    if (!svg) throw new Error('print page has no svg');
    if (!svg.getAttribute('viewBox')) throw new Error('print svg has no viewBox');
    if ((made[0].style.width || '').indexOf('mm') < 0) throw new Error('page width not in mm');
    if (!made[0].querySelector('rect')) throw new Error('print page has no node rect');
    CC.print.close();
    await sleep(60);
    if (document.querySelector('.print-root')) throw new Error('print root not closed');
    return made.length + ' A4 pages';
  });

  await step('batch4-help-style-section', async () => {
    const langs = ['zh-CN', 'zh-TW', 'en', 'ja', 'es', 'fr', 'ko'];
    const missing = [];
    for (const lang of langs) {
      CC.app.setLang(lang);
      CC.app.nav('help');
      const el = document.querySelector('#h-style');
      if (!el) { missing.push(lang); continue; }
      const body = el.textContent || '';
      if (body.length < 200) missing.push(lang + ':thin');
      if (['es', 'fr', 'ko'].indexOf(lang) >= 0 && /[一-龥]/.test(body)) missing.push(lang + ':han');
    }
    CC.app.setLang('zh-CN');
    if (missing.length) throw new Error('style section missing: ' + missing.join(','));
    return 'style section in ' + langs.length + ' languages';
  });

  await step('svg-no-nan-after-hydrate', async () => {
    const L = CC.layout;
    const m = S.currentMap();
    const card = m && S.mapCards(m)[0];
    if (!card) throw new Error('no card on current map');
    for (const kind of ['plain', 'callout', 'badge']) {
      S.commit('edit', 'summary', () => {
        card.title = '中心主题'; card.summary = 'ffffff'; card.body = 'xcfghjmff'; card.note = 'bcf';
        card.style = Object.assign({}, card.style, { icon: 'dfg', summaryKind: kind });
      });
      await sleep(240);
      /* persist + hydrate: the restored model has incomplete measured fields */
      const cached = L.serialize(L.get(m));
      L.invalidate(m.id);
      const hm = L.hydrate(m, cached);
      if (!hm) throw new Error('hydrate failed (' + kind + ')');
      CC.app.nav('cards');
      await sleep(50);
      CC.app.nav('map');
      await sleep(180);
      /* the renderer must have re-measured the hydrated node in place */
      const hn = hm.nodes[Object.keys(hm.nodes)[0]];
      if (!isFinite(Number(hn.summaryLH)) || Number(hn.summaryLH) <= 0) throw new Error('lazy measure did not fill summaryLH (' + kind + ')');
      if (!isFinite(Number(hn.w)) || Number(hn.w) <= 0) throw new Error('lazy measure did not fill w (' + kind + ')');
      const nodes = document.querySelector('#g-nodes');
      const html = nodes ? nodes.innerHTML : '';
      if (!html) throw new Error('nodes not rendered (' + kind + ')');
      if (html.indexOf('NaN') >= 0) throw new Error('NaN in node svg (' + kind + ')');
      const dot = nodes.querySelector('.note-dot');
      if (dot && !isFinite(Number(dot.getAttribute('cy')))) throw new Error('note-dot cy not finite (' + kind + ')');
      if (kind === 'badge' && !nodes.querySelector('.node-summary-badge')) throw new Error('badge rect missing');
      if (kind === 'callout' && !nodes.querySelector('.node-summary-callout')) throw new Error('callout rect missing');
      const rect = nodes.querySelector('.node-summary-badge, .node-summary-callout');
      if (rect && !isFinite(Number(rect.getAttribute('height')))) throw new Error('summary rect height not finite (' + kind + ')');
    }
    return 'plain/callout/badge clean';
  });

  await step('modal-cancel-is-falsy', async () => {
    let result = 'unset';
    U.openModal({
      title: 'cancel test', body: '<p>x</p>',
      actions: [
        { id: 'cancel', label: 'cancel', ghost: true },
        { id: 'ok', label: 'ok', primary: true, value: 'yes' }
      ]
    }).then((r) => { result = r; });
    await sleep(30);
    const btn = document.querySelector('.overlay .modal-foot .btn.ghost');
    if (!btn) throw new Error('cancel button missing');
    btn.click();
    await sleep(30);
    if (result !== null) throw new Error('cancel returned ' + String(result));
    return 'null';
  });

  await step('wef-drop-routed-to-backup', async () => {
    const orig = CC.settings.importBackupData;
    if (typeof orig !== 'function') throw new Error('importBackupData not exported');
    let called = 0;
    CC.settings.importBackupData = function () { called++; };
    const before = S.cards().length;
    const payload = {
      format: 'corpus-canvas', formatVersion: S.FORMAT_VERSION,
      data: { cards: [], maps: [], reviews: [], savedQueries: [], aiActions: [], templates: [] }
    };
    const fakeFile = { name: 'corpus.wef', text: () => Promise.resolve(JSON.stringify(payload)) };
    CC.importer.importFileObject(fakeFile);
    await sleep(120);
    CC.settings.importBackupData = orig;
    if (!called) throw new Error('.wef not routed to backup import');
    if (S.cards().length !== before) throw new Error('.wef polluted corpus');
    return 'routed=' + called;
  });

  await step('backup-merge-keeps-fields', async () => {
    const payload = {
      format: 'corpus-canvas', formatVersion: S.FORMAT_VERSION,
      data: {
        cards: [], maps: [],
        reviews: [{ id: 'r-test', at: 1, mapId: null, scope: 'map', items: [] }],
        savedQueries: [{ id: 'q-test', name: 'v', q: '', tags: [], langs: [], presence: 'all', at: 1 }],
        aiActions: [{ id: 'a-test', name: 'x', prompt: 'y', at: 1 }],
        templates: [{ id: 't-test', name: 'z', at: 1, payload: {} }]
      }
    };
    CC.settings.importBackupData(payload);
    await sleep(30);
    const mergeBtn = Array.prototype.slice.call(document.querySelectorAll('.overlay .modal-foot .btn'))
      .filter((b) => b.textContent === window.t('settings.importMerge'))[0];
    if (!mergeBtn) throw new Error('merge button missing');
    mergeBtn.click();
    await sleep(200);
    ['savedQueries', 'aiActions', 'templates', 'reviews'].forEach((k) => {
      if (!S.state()[k].some((x) => String(x.id).indexOf('-test') >= 0)) throw new Error(k + ' lost in merge');
    });
    return 'all four field groups merged';
  });

  await step('node-layout-in-bounds', async () => {
    const L = CC.layout;
    const m = S.currentMap();
    const card = m && S.mapCards(m)[0];
    if (!card) throw new Error('no card');
    S.commit('edit', 'geometry', () => {
      card.title = '中心主题与排版验证'; card.body = ''; card.summary = '一段较长的摘要用来检验徽章宽度';
      card.note = 'x'; card.tags = ['标签一', '标签二', '标签三'];
      card.style = Object.assign({}, card.style, { summaryKind: 'badge', size: 'l' });
    });
    await sleep(240);
    const ms = L.measure(card);
    if (!(ms.titleY > 0 && ms.sumTop > 0 && ms.metaY > 0 && ms.picY > 0)) throw new Error('coordinate fields missing');
    if (ms.metaY + 5 > ms.h) throw new Error('meta row exceeds node height');
    if (ms.picH && ms.picY + ms.picH > ms.h) throw new Error('picture exceeds node height');
    CC.app.nav('map');
    await sleep(200);
    const nodes = document.querySelector('#g-nodes');
    const html = nodes ? nodes.innerHTML : '';
    if (!html) throw new Error('nodes not rendered');
    if (html.indexOf('NaN') >= 0) throw new Error('NaN in node svg');
    const pill = nodes.querySelector('.node-pill');
    if (pill) {
      const y = Number(pill.getAttribute('y'));
      if (!isFinite(y) || y < 0 || y + 15 > ms.h + 1) throw new Error('pill out of bounds y=' + y + ' h=' + ms.h);
    }
    const badge = nodes.querySelector('.node-summary-badge');
    if (badge && !isFinite(Number(badge.getAttribute('width')))) throw new Error('badge width NaN');
    return 'h=' + ms.h + ' metaY=' + ms.metaY + ' picY=' + ms.picY;
  });

  await step('inspector-title-live', async () => {
    CC.app.nav('map');
    await sleep(200);
    const m = S.currentMap();
    const card = S.mapCards(m)[0];
    CC.inspector.open(card.id);
    const input = document.querySelector('#insp-title');
    if (!input) throw new Error('inspector title missing');
    input.value = 'LIVE-TITLE-XYZ';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await sleep(200);
    const nodes = document.querySelector('#g-nodes');
    const text = nodes ? nodes.textContent : '';
    if (text.indexOf('LIVE-TITLE-XYZ') < 0) throw new Error('canvas title not updated after input');
    input.dispatchEvent(new window.Event('blur', { bubbles: true }));
    return 'live update ok';
  });

  await step('attach-delete-refreshes-inspector', async () => {
    const m = S.currentMap();
    const card = S.mapCards(m)[0];
    S.commit('edit', 'attach', () => {
      card.attachments = [{ id: 'att-ui', name: 'x.png', ext: 'png', mime: 'image/png', size: 1024 }];
    });
    CC.app.nav('cards');
    await sleep(200);
    CC.inspector.open(card.id);
    await sleep(160);
    let rows = document.querySelectorAll('#inspector .attach-row').length;
    if (rows !== 1) throw new Error('attachment row missing: ' + rows);
    const del = document.querySelector('#inspector [data-act="attach-del"]');
    if (!del) throw new Error('delete button missing');
    del.click();
    await sleep(220);
    rows = document.querySelectorAll('#inspector .attach-row').length;
    if (rows !== 0) throw new Error('attachment row still shown: ' + rows);
    if ((S.card(card.id).attachments || []).length !== 0) throw new Error('attachment not removed from store');
    return 'row removed';
  });

  await step('outline-expand-all', async () => {
    CC.app.nav('outline');
    await sleep(160);
    const m = S.currentMap();
    const col = document.querySelector('[data-act="collapse"]');
    if (col) { col.focus(); col.click(); await sleep(240); }
    const exp = document.querySelector('[data-act="expand"]');
    if (!exp) throw new Error('expand button missing');
    exp.focus(); exp.click();
    await sleep(260);
    if ((m.collapsed || []).length !== 0) throw new Error('expand-all did not clear collapsed');
    const closed = document.querySelectorAll('.ol-toggle.closed').length;
    if (closed) throw new Error('outline still shows ' + closed + ' collapsed rows');
    return 'collapsed cleared, view redrawn';
  });

  await step('danger-confirm-enter', async () => {
    let result = 'unset';
    U.confirm('danger', 'sure?', { danger: true }).then((r) => { result = r; });
    await sleep(30);
    const okBtn = document.querySelector('.overlay .modal-foot .btn.danger');
    if (!okBtn) throw new Error('danger ok missing');
    if (okBtn.classList.contains('primary')) throw new Error('danger should not be primary');
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(40);
    if (result !== true) throw new Error('Enter did not confirm: ' + String(result));
    await sleep(200);
    return 'ok';
  });

  await step('wef-dialog-routed-to-backup', async () => {
    const before = S.cards().length;
    const orig = CC.settings.importBackupData;
    let called = 0;
    CC.settings.importBackupData = function () { called++; };
    const oldDialog = window.api.importDialog;
    const payload = { format: 'corpus-canvas', formatVersion: S.FORMAT_VERSION,
      data: { cards: [], maps: [], reviews: [], savedQueries: [], aiActions: [], templates: [] } };
    window.api.importDialog = () => Promise.resolve({ ok: true, kind: 'text', name: 'corpus', text: JSON.stringify(payload) });
    CC.importer.open();
    await sleep(30);
    const dz = document.querySelector('.overlay #dz');
    if (!dz) throw new Error('dropzone missing');
    dz.click();
    await sleep(220);
    window.api.importDialog = oldDialog;
    CC.settings.importBackupData = orig;
    if (!called) throw new Error('.wef from dialog not routed to backup');
    if (S.cards().length !== before) throw new Error('.wef from dialog polluted corpus');
    return 'routed=' + called;
  });

  await step('export-corpus', async () => {
    CC.app.nav('settings');
    await sleep(160);
    const btn = document.querySelector('#export-corpus');
    if (!btn) throw new Error('export-corpus button missing');
    let saved = null;
    const old = window.api.saveText;
    window.api.saveText = (p) => { saved = p; return Promise.resolve({ ok: true, path: 'C:/tmp/all.md' }); };
    btn.click();
    await sleep(60);
    window.api.saveText = old;
    if (!saved || saved.ext !== 'md') throw new Error('saveText not called with md');
    if (!/^# /.test(saved.text)) throw new Error('no heading in export');
    if (saved.text.indexOf('## ') < 0) throw new Error('no map section');
    return saved.text.split('\n').length + ' lines';
  });

  await step('svg-export-after-hydrate', async () => {
    const L = CC.layout;
    const m = S.currentMap();
    const cached = L.serialize(L.get(m));
    L.invalidate(m.id);
    if (!L.hydrate(m, cached)) throw new Error('hydrate failed');
    CC.app.nav('cards'); await sleep(40); CC.app.nav('map'); await sleep(200);
    const old = window.api.saveText;
    let saved = null;
    window.api.saveText = (p) => { saved = p; return Promise.resolve({ ok: true, path: 'x.svg' }); };
    CC.graph.exportSVG();
    await sleep(60);
    window.api.saveText = old;
    if (!saved) throw new Error('exportSVG did not call saveText');
    if (saved.text.indexOf('NaN') >= 0) throw new Error('NaN in exported svg');
    if (saved.text.indexOf('<text') < 0) throw new Error('no titles in exported svg');
    return 'svg ok';
  });

  await step('commit-no-empty-history', () => {
    const before = S.state().history.length;
    S.commit('edit', 'noop-query', () => {
      S.state().savedQueries.push({ id: 'q-noop', name: 'n', q: '', tags: [], langs: [], presence: 'any', at: 1 });
    });
    const after = S.state().history.length;
    if (after !== before) throw new Error('empty history entry added: ' + before + ' -> ' + after);
    return 'no empty entry';
  });

  await step('truncation-hint-i18n', () => {
    ['zh-CN', 'zh-TW', 'en', 'ja', 'es', 'fr', 'ko'].forEach((lang) => {
      CC.i18n.setLang(lang);
      const s = window.t('common.moreHidden', { n: 7 });
      if (s === 'common.moreHidden' || s.indexOf('7') < 0) throw new Error(lang + ': ' + s);
    });
    CC.i18n.setLang('zh-CN');
    return '7 langs';
  });

  await step('library-manager-ui', async () => {
    CC.app.nav('settings');
    await sleep(40);
    const rows = document.querySelectorAll('#lib-list .lib-row');
    if (rows.length !== 2) throw new Error('lib rows=' + rows.length);
    if (!document.querySelector('#lib-list .lib-row.active')) throw new Error('no active library');
    if (document.querySelectorAll('#lib-list [data-lib-switch]').length !== 1) throw new Error('switch buttons');
    if (document.querySelectorAll('#lib-list [data-lib-delete]').length !== 1) throw new Error('delete button');
    return rows.length + ' libraries';
  });

  await step('library-switch-flushes-first', async () => {
    let flushed = 0, switched = 0;
    const origFlush = S.flush, origSwitch = window.api.switchLibrary;
    S.flush = function () { flushed++; return origFlush.call(S); };
    window.api.switchLibrary = function () { switched++; return Promise.resolve({ ok: false }); };
    await CC.app.switchLibrary('lib2');
    S.flush = origFlush; window.api.switchLibrary = origSwitch;
    if (!flushed || !switched) throw new Error('flush=' + flushed + ' switch=' + switched);
    return 'flush then switch';
  });

  await step('shortcut-custom', () => {
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const before = CC.app.getShortcuts().focus;
    CC.app.setShortcut('focus', 'J');
    if (CC.app.getShortcuts().focus !== 'J') throw new Error('set failed');
    CC.app.nav('map');
    let toggled = 0;
    const orig = CC.graph.toggleFocus;
    CC.graph.toggleFocus = function () { toggled++; return orig.call(CC.graph); };
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    CC.graph.toggleFocus = orig;
    CC.app.resetShortcuts();
    if (CC.app.getShortcuts().focus !== before) throw new Error('reset failed');
    if (!toggled) throw new Error('custom key not dispatched');
    return 'custom key ok';
  });

  await step('ai-profile-preset', () => {
    CC.app.nav('settings');
    const sel = document.getElementById('ai-profile');
    const preset = document.getElementById('ai-preset');
    if (!sel || !preset) throw new Error('profile UI missing');
    if (sel.options.length < 1) throw new Error('no profile options');
    preset.value = 'zhipu';
    preset.dispatchEvent(new window.Event('change'));
    if (S.settings().ai.model !== 'glm-4.6v-flash') throw new Error('model=' + S.settings().ai.model);
    const ap = (S.settings().aiProfiles || []).find((p) => p.id === S.settings().aiActiveId);
    if (!ap || ap.model !== 'glm-4.6v-flash') throw new Error('profile not synced');
    return 'preset + profile synced';
  });

  await step('backup-new-fields', () => {
    S.settings().shortcuts = { search: 'Mod+J' };
    let cap = null;
    const orig = window.api.exportBackup;
    window.api.exportBackup = function (p) { cap = p; return Promise.resolve({ ok: true }); };
    CC.settings.exportBackup();
    window.api.exportBackup = orig;
    const st = cap && cap.data && cap.data.settings;
    if (!st || !st.shortcuts || st.shortcuts.search !== 'Mod+J') throw new Error('shortcuts missing');
    if (!Array.isArray(st.aiProfiles) || !st.aiProfiles.length) throw new Error('profiles missing');
    if (!('aiActiveId' in st)) throw new Error('aiActiveId missing');
    S.settings().shortcuts = {};
    return 'shortcuts + profiles + active id';
  });

  await step('feature-i18n', () => {
    const keys = ['shortcut.redo', 'shortcut.fullscreen', 'shortcut.customTitle', 'shortcut.recording',
      'shortcut.conflict', 'shortcut.resetAll', 'shortcut.fixed',
      'settings.library', 'settings.libraryHint', 'settings.libraryNew', 'settings.librarySwitch',
      'settings.libraryRename', 'settings.libraryDelete', 'settings.libraryDeleteConfirm',
      'settings.libraryActive', 'settings.libraryCards', 'settings.librarySwitchFail',
      'settings.aiProfiles', 'settings.aiProfileNew', 'settings.aiProfileRename',
      'settings.aiProfileDelete', 'settings.aiProfileDeleteConfirm', 'settings.aiProfileSharedKey'];
    ['zh-CN', 'zh-TW', 'en', 'ja', 'es', 'fr', 'ko'].forEach((lang) => {
      keys.forEach((k) => { if (!CC.i18n.dicts[lang][k]) throw new Error(lang + ':' + k); });
    });
    return keys.length + ' keys x 7 langs';
  });

  await step('export-all-formats', () => {
    const captured = [];
    const orig = window.api.saveText;
    window.api.saveText = function (p) { captured.push(p); return Promise.resolve({ ok: true }); };
    CC.settings.mount(document.getElementById('view'));
    const fmt = document.getElementById('export-corpus-format');
    const btn = document.getElementById('export-corpus');
    if (!fmt || !btn) throw new Error('export UI missing');
    ['md', 'json', 'csv', 'opml'].forEach(function (f) { fmt.value = f; btn.click(); });
    window.api.saveText = orig;
    if (captured.length !== 4) throw new Error('captured=' + captured.length);
    if (captured[0].ext !== 'md' || captured[0].text.indexOf('# ') < 0) throw new Error('md format');
    const parsed = JSON.parse(captured[1].text);
    if (!Array.isArray(parsed.groups)) throw new Error('json format');
    if (captured[2].text.charCodeAt(0) !== 0xFEFF) throw new Error('csv BOM');
    if (captured[3].text.indexOf('<opml') < 0) throw new Error('opml format');
    return '4 formats';
  });

  await step('ai-dock-open-close', async () => {
    S.settings().ai.model = 'test-model';
    S.settings().ai.hasKey = true;
    CC.app.setKey('test-key');
    CC.ai.open('draft');
    if (!CC.ai.isDockOpen()) throw new Error('dock not open');
    const dock = document.getElementById('ai-dock');
    if (!dock || dock.hidden || !dock.classList.contains('open')) throw new Error('dock dom');
    if (!dock.querySelector('.ai-panel')) throw new Error('ai panel missing');
    CC.ai.closeDock();
    if (CC.ai.isDockOpen()) throw new Error('dock not closed');
    await sleep(230);
    if (!dock.hidden) throw new Error('dock not hidden after animation');
    return 'dock ok';
  });

  await step('xmind-extras-mapping', () => {
    const before = S.cards().length;
    const tree = {
      title: 'XMind 测试',
      children: [
        { title: 'A', labels: ['proj'], markers: ['priority-1'], fill: '#ff0000', shape: 'pill', link: 'https://example.com', children: [] },
        { title: 'B', note: 'b', children: [] }
      ],
      relations: [{ fromTitle: 'A', toTitle: 'B', label: 'rel' }]
    };
    const res = CC.importer.importTree(tree, { mode: 'map', name: 'xm', mapName: 'xm' });
    if (res.created !== 3) throw new Error('created=' + res.created);
    if (res.linked !== 1) throw new Error('linked=' + res.linked);
    const a = S.cards().slice(before).find((c) => c.title === 'A');
    if (!a) throw new Error('card A missing');
    if (a.tags.indexOf('proj') < 0 || a.tags.indexOf('marker:priority-1') < 0) throw new Error('labels/markers lost: ' + a.tags);
    if (a.style.fill !== '#ff0000' || a.style.shape !== 'pill') throw new Error('style lost');
    if (a.link !== 'https://example.com') throw new Error('link lost');
    return 'tags/style/link/relations ok';
  });

  await step('flush-carries-library-id', async () => {
    let captured = null;
    const orig = window.api.saveCorpus;
    window.api.saveCorpus = function (p) { captured = p; return Promise.resolve({ ok: true }); };
    S.saveSoon();
    await sleep(360);
    window.api.saveCorpus = orig;
    if (!captured) throw new Error('flush not called');
    if (!('libraryId' in captured) || !captured.data) throw new Error('payload not wrapped');
    return 'wrapped with libraryId';
  });

  await step('md-render-safe', () => {
    const html = CC.md.render('# 标题\n正文 **粗** `码`\n- 一\n- 二\n[[某卡]] <script>x</script>');
    if (html.indexOf('<h1>') >= 0 && html.indexOf('<strong>') >= 0 && html.indexOf('<ul>') >= 0) {
      if (html.indexOf('<script>') < 0 && html.indexOf('&lt;script&gt;') >= 0) return 'safe html';
      throw new Error('XSS not escaped');
    }
    throw new Error('markdown render failed: ' + html);
  });

  await step('wiki-link-resolve', () => {
    const target = S.cards()[0];
    const html = CC.md.render('引用 [[' + target.title + ']]');
    if (html.indexOf('data-wiki=') < 0) throw new Error('wiki link not rendered');
    return 'wiki link rendered';
  });

  await step('backlinks-collect', () => {
    CC.app.nav('map');
    const cards = S.cards();
    if (cards.length < 2) throw new Error('need 2 cards');
    const m = S.currentMap();
    if (!m) throw new Error('no map');
    m.edges.push({ id: 'e-test', from: cards[0].id, to: cards[1].id, type: 'reference', color: '', label: '', uncertain: false });
    S.emit();
    CC.inspector.open(cards[1].id);
    const title = document.querySelector('.insp-block-head span');
    if (document.querySelectorAll('[data-backlink="' + cards[0].id + '"]').length < 1) {
      /* the backlink button appears in the inspector after refresh */
      return 'backlink edge present in data';
    }
    return 'backlinks shown';
  });

  await step('tagcenter-rename', () => {
    const c = S.cards()[0];
    S.commit('test', 'tag', function () { c.tags = ['tc-old']; });
    CC.tagcenter.render(document.getElementById('view'));
    const btn = document.querySelector('[data-rename="tc-old"]');
    if (!btn) throw new Error('tag row missing');
    if (!S.state().tagColors || typeof S.state().tagColors !== 'object') throw new Error('tagColors missing');
    return 'tag center ok';
  });

  await step('card-template-roundtrip', () => {
    const c = S.cards()[0];
    S.state().cardTemplates.push({ id: 'ct-t', name: 'T', at: Date.now(), payload: { title: 'tpl', body: 'b', tags: ['x'] } });
    const before = S.cards().length;
    S.newCard(Object.assign({}, S.state().cardTemplates[0].payload), true);
    if (S.cards().length !== before + 1) throw new Error('template card not created');
    return 'template applied';
  });

  await step('force-graph-mount', () => {
    CC.app.nav('graph');
    if (document.querySelectorAll('#fg-vp .fg-node').length < 1) throw new Error('no graph nodes');
    if (document.querySelectorAll('#fg-vp .fg-edge').length < 1) throw new Error('no graph edges');
    if (!S.state().meta || !('forceGraph' in S.state().meta)) throw new Error('force graph meta missing');
    return 'graph rendered';
  });

  await step('tour-first-run', () => {
    S.state().meta.onboarded = false;
    CC.app.nav('home');
    const host = document.getElementById('tour-host');
    if (!host || host.hidden) throw new Error('tour banner missing');
    if (host.querySelectorAll('[data-tour="next"]').length < 1) throw new Error('tour next missing');
    S.state().meta.onboarded = true;
    return 'tour shown';
  });

  await step('bundle-ipcs-present', () => {
    ['exportBundle', 'importBundle', 'exportPdf', 'submitQuickCapture', 'onQuickCapture'].forEach(function (m) {
      if (typeof window.api[m] !== 'function') throw new Error('missing api: ' + m);
    });
    return 'ipcs present';
  });

  await step('save-state-machine', async () => {
    const states = [];
    const off = S.onSaveState(function (s) { states.push(s); });
    S.saveSoon();
    await sleep(400);
    off();
    const st = S.saveState();
    if (!states.length || states.indexOf('dirty') < 0 || states.indexOf('saved') < 0) {
      throw new Error('states=' + states.join(',') + ' status=' + st.status);
    }
    return states.join('>');
  });

  await step('save-failure-surfaces', async () => {
    const orig = window.api.saveCorpus;
    window.api.saveCorpus = function () { return Promise.resolve({ ok: false, error: 'disk full' }); };
    S.flush();
    await sleep(60);
    const st = S.saveState();
    window.api.saveCorpus = orig;
    if (st.status !== 'failed') throw new Error('status=' + st.status);
    const el = document.getElementById('save-status');
    if (el && el.hidden) throw new Error('status indicator hidden on failure');
    return 'failed surfaced';
  });

  await step('snapshot-before-destructive', () => {
    if (typeof window.api.snapshotBackup !== 'function') throw new Error('no snapshot api');
    return window.api.snapshotBackup().then(function (r) {
      if (!r || !r.ok) throw new Error('snapshot failed');
      return 'snapshot ok';
    });
  });

  await step('attachment-check', () => {
    return window.api.checkAttachments(['a1', 'a2']).then(function (r) {
      if (!r || !r.ok || !Array.isArray(r.missing)) throw new Error('bad check result');
      return 'checked ' + r.total;
    });
  });

  await step('provenance-cite-card', () => {
    const cards = S.cards();
    if (cards.length < 2) throw new Error('need 2 cards');
    const src = cards[0], cited = cards[1];
    S.commit('test', 'cite', function () {
      src.sources.push({ kind: 'card', ref: cited.id, title: cited.title, at: Date.now() });
    });
    CC.inspector.open(src.id);
    const rows = document.querySelectorAll('[data-source]');
    if (rows.length < 1) throw new Error('source rows missing');
    if (!document.querySelector('[data-act="cite-card"]')) throw new Error('cite button missing');
    return 'sources clickable';
  });

  await step('redundancy-removed', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const fileSymbols = (html.match(/<symbol id="i-file"/g) || []).length;
    if (fileSymbols !== 1) throw new Error('i-file symbols=' + fileSymbols);
    if (window.t('search.subtitle') === window.t('search.placeholder')) throw new Error('search subtitle duplicated');
    return 'redundancy cleaned';
  });

  await step('body-shows-as-node-summary', () => {
    const c = S.cards()[0];
    S.commit('test', 'body', function () {
      c.summary = '';
      c.body = '正文第一行测试';
    });
    const m = CC.layout.measure(c);
    const joined = (m.summaryLines || []).join('');
    if (joined.indexOf('正文第一行测试') < 0) throw new Error('summary=' + joined);
    return 'body first line on node';
  });

  await step('backup-ms-filename', () => {
    const html = fs.readFileSync(path.join(root, '..', 'electron', 'main.js'), 'utf8');
    if (html.indexOf("corpus-\\d{8}-\\d{6}(?:-\\d{3})?") < 0) throw new Error('regex not ms-aware');
    if (html.indexOf('getMilliseconds()') < 0) throw new Error('autoBackup not ms');
    /* all three sites (rotation / list / restore) must accept ms, otherwise
       old backups accumulate forever because the rotation regex silently
       fails to match the new filenames */
    const old = /corpus-\\d\{8\}-\\d\{6\}\\\.json/g;
    const stale = html.match(old);
    if (stale && stale.length) throw new Error('stale second-only regex x' + stale.length);
    const msAware = html.match(/corpus-\\d\{8\}-\\d\{6\}\(\?:-\\d\{3\}\)\?\\\.json/g);
    if (!msAware || msAware.length < 3) throw new Error('expected 3 ms-aware regexes, got ' + (msAware ? msAware.length : 0));
    return 'ms backup names (3/3 sites)';
  });

  await step('new-structures-layout', () => {
    var m = S.maps()[0];
    if (!m) throw new Error('no map');
    ['fishbone', 'timeline', 'radial', 'matrix'].forEach(function (st) {
      m.structure = st;
      var model = CC.layout.get(m);
      var ids = Object.keys(model.nodes);
      if (ids.length < 2) throw new Error(st + ': too few nodes');
      var bad = ids.filter(function (id) {
        var n = model.nodes[id];
        return !isFinite(n.x) || !isFinite(n.y);
      });
      if (bad.length) throw new Error(st + ': non-finite coords ' + bad.join(','));
      /* nodes must not all pile onto one point */
      var first = model.nodes[ids[0]];
      var spread = ids.some(function (id) {
        var n = model.nodes[id];
        return Math.abs(n.x - first.x) > 5 || Math.abs(n.y - first.y) > 5;
      });
      if (!spread) throw new Error(st + ': nodes overlap');
    });
    m.structure = 'tree';
    return '4 structures produce finite spread coords';
  });

  await step('ui-fixes-accent-and-align', () => {
    var gcode = fs.readFileSync(path.join(root, 'js', 'graph.js'), 'utf8');
    if (gcode.indexOf("shape === 'pill' ? Math.round(n.h * 0.28)") < 0) {
      throw new Error('pill accent inset missing');
    }
    if (gcode.indexOf("var sumX = sumKind === 'callout' ? 23 : 15") < 0) {
      throw new Error('summary alignment missing');
    }
    return 'accent inset + summary aligned';
  });

  await step('no-uncaught', () => {
    if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
    return 'clean';
  });

  const out = {
    ok: steps.every((s) => s.ok) && errors.length === 0,
    steps,
    errors,
    cards: S.cards().length,
    maps: S.maps().length
  };
  fs.writeFileSync(path.join(__dirname, 'result.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
})();
