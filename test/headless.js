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
  saveCorpus: (d) => { corpus = d; return Promise.resolve({ ok: true }); },
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
