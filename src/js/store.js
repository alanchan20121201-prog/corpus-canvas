/* Corpus store: single source of truth, history, snapshots, trash, checks */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util;
  var FORMAT_VERSION = 2;

  var db = null;
  var listeners = [];
  var undoStack = [];
  var redoStack = [];
  var saveTimer = null;
  var info = {};

  function now() { return Date.now(); }

  function blank() {
    return {
      formatVersion: FORMAT_VERSION,
      createdAt: now(),
      updatedAt: now(),
      settings: {
        lang: '',
        langAuto: true,
        theme: 'light',
        lastView: 'home',
        lastMapId: null,
        onboarded: false,
        ai: {
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          hasKey: false,
          local: false
        },
        shortcuts: {},
        aiProfiles: [{ id: 'default', name: 'Default', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', local: false, preset: '' }],
        aiActiveId: 'default'
      },
      cards: [],
      maps: [],
      history: [],
      snapshots: [],
      reviews: [],
      savedQueries: [],
      aiActions: [],
      templates: [],
      dismissed: [],
      meta: { sample: false }
    };
  }

  function migrate(raw) {
    var base = blank();
    if (!raw || typeof raw !== 'object') return base;
    var out = Object.assign(base, raw);
    out.settings = Object.assign(base.settings, raw.settings || {});
    out.settings.ai = Object.assign(base.settings.ai, (raw.settings && raw.settings.ai) || {});
    if (out.settings.langAuto == null) out.settings.langAuto = true;
    if (!out.settings.shortcuts || typeof out.settings.shortcuts !== 'object' || Array.isArray(out.settings.shortcuts)) out.settings.shortcuts = {};
    if (!Array.isArray(out.settings.aiProfiles) || !out.settings.aiProfiles.length) {
      out.settings.aiProfiles = [{
        id: 'default', name: 'Default',
        baseUrl: out.settings.ai.baseUrl, model: out.settings.ai.model,
        local: out.settings.ai.local, preset: ''
      }];
    }
    out.settings.aiProfiles.forEach(function (p) {
      if (!p || typeof p !== 'object') return;
      p.id = p.id || 'default';
      p.name = p.name || 'Default';
      p.baseUrl = typeof p.baseUrl === 'string' ? p.baseUrl : out.settings.ai.baseUrl;
      p.model = typeof p.model === 'string' ? p.model : out.settings.ai.model;
      p.local = !!p.local;
      p.preset = typeof p.preset === 'string' ? p.preset : '';
    });
    if (!out.settings.aiActiveId || !out.settings.aiProfiles.some(function (p) { return p.id === out.settings.aiActiveId; })) {
      out.settings.aiActiveId = out.settings.aiProfiles[0].id;
    }
    out.formatVersion = FORMAT_VERSION;
    ['cards', 'maps', 'history', 'snapshots', 'reviews', 'savedQueries', 'aiActions', 'templates', 'dismissed'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    out.cards.forEach(function (c) {
      if (!Array.isArray(c.tags)) c.tags = [];
      if (!Array.isArray(c.langs)) c.langs = [];
      if (!Array.isArray(c.sources)) c.sources = [];
      if (!c.style || typeof c.style !== 'object') c.style = {};
      if (typeof c.link !== 'string') c.link = '';
      if (typeof c.title !== 'string') c.title = '';
      if (typeof c.body !== 'string') c.body = '';
      if (typeof c.note !== 'string') c.note = '';
      if (typeof c.summary !== 'string') c.summary = '';
      if (!Array.isArray(c.attachments)) c.attachments = [];
      c.deletedAt = c.deletedAt || null;
    });
    out.maps.forEach(function (m) {
      if (!m.structure) m.structure = 'tree';
      if (!m.positions) m.positions = {};
      if (!m.offsets) m.offsets = {};
      if (!Array.isArray(m.collapsed)) m.collapsed = [];
      if (!Array.isArray(m.edges)) m.edges = [];
      if (!m.style) m.style = { showLabels: true };
      if (!Array.isArray(m.boundaries)) m.boundaries = [];
      if (m.rev == null) m.rev = 0;
      if (m.view == null) m.view = null;
    });
    return out;
  }

  /* ------------- basics ------------- */

  var byId = new Map();
  var cardsRev = 1;
  var mcCache = {};

  function rebuildIndex() {
    byId = new Map();
    db.cards.forEach(function (c) { byId.set(c.id, c); });
    cardsRev++;
  }
  function bumpCards() { cardsRev++; }
  function cardsRevNo() { return cardsRev; }

  function state() { return db; }
  function settings() { return db.settings; }
  var liveCache = { rev: -1, list: [] };
  function cards(includeDeleted) {
    if (includeDeleted) return db.cards;
    if (liveCache.rev !== cardsRev) {
      liveCache = { rev: cardsRev, list: db.cards.filter(function (c) { return !c.deletedAt; }) };
    }
    return liveCache.list;
  }
  function card(id) { return (id && byId.get(id)) || null; }
  function maps() { return db.maps; }
  function map(id) { return db.maps.find(function (m) { return m.id === id; }) || null; }
  function currentMap() {
    var id = db.settings.lastMapId;
    var m = id ? map(id) : null;
    if (!m && db.maps.length) m = db.maps[0];
    return m;
  }
  function cardTitle(c) { return c && c.title ? c.title : window.t('common.untitled'); }

  var silent = 0;
  function quiet(fn) { silent++; try { fn(); } finally { silent--; } }

  function emit() {
    if (silent) return;
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); }
  function onChange(fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }

  /* ------------- persistence ------------- */

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 300);
  }

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!db) return Promise.resolve();
    db.updatedAt = now();
    var payload;
    try { payload = JSON.parse(JSON.stringify(db)); } catch (e) { return Promise.resolve(); }
    var view = (info && info.libraryId) || '';
    return window.api.saveCorpus({ libraryId: view, data: payload }).catch(function (err) { console.error('save failed', err); });
  }

  /* ------------- history / undo ------------- */

  function snapshotState() {
    return JSON.stringify({ cards: db.cards, maps: db.maps, reviews: db.reviews });
  }

  function restoreState(str) {
    var s = JSON.parse(str);
    db.cards = s.cards;
    db.maps = s.maps;
    db.reviews = s.reviews || [];
    rebuildIndex();
    db.maps.forEach(function (m) { m.rev = (m.rev || 0) + 1; });
    if (!map(db.settings.lastMapId)) {
      db.settings.lastMapId = db.maps[0] ? db.maps[0].id : null;
    }
  }

  function trimHistory() {
    while (db.history.length > 40) db.history.pop();
  }

  /* record a text edit that was applied live (no fn replay needed) */
  function markEdit(kind, summary, before) {
    if (!before) return;
    var after = snapshotState();
    if (before === after) return;
    db.history.unshift({ id: U.uid('h'), at: now(), kind: kind, summary: summary, before: before });
    trimHistory();
    undoStack.push({ kind: kind, summary: summary, before: before, after: after });
    if (undoStack.length > 40) undoStack.shift();
    redoStack.length = 0;
    bumpCards();
    db.maps.forEach(function (m) { m.rev = (m.rev || 0) + 1; });
    saveSoon();
    emit();
  }

  function commit(kind, summary, fn, opts) {
    opts = opts || {};
    var before = snapshotState();
    if (opts.snapshot) createSnapshot(typeof opts.snapshot === 'string' ? opts.snapshot : summary, true, true);
    fn(db);
    /* Compare before bumping map revs. Commits that only touch fields outside
       the snapshot (saved queries, dismissed pairs, templates) would leave a
       history entry whose undo appears to do nothing. */
    var after = snapshotState();
    var changed = before !== after;
    var entry = changed ? { id: U.uid('h'), at: now(), kind: kind, summary: summary, before: before } : null;
    db.updatedAt = now();
    db.maps.forEach(function (m) { m.rev = (m.rev || 0) + 1; });
    if (changed) {
      db.history.unshift(entry);
      trimHistory();
      undoStack.push({ kind: kind, summary: summary, before: before, after: after });
      if (undoStack.length > 40) undoStack.shift();
      redoStack.length = 0;
    }
    saveSoon();
    emit();
    return entry;
  }

  /* a change that should not clutter the change log (presentation only) */
  function touch() {
    db.updatedAt = now();
    db.maps.forEach(function (m) { m.rev = (m.rev || 0) + 1; });
    saveSoon();
    emit();
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }

  function undo() {
    var item = undoStack.pop();
    if (!item) return false;
    redoStack.push(item);
    restoreState(item.before);
    saveSoon();
    emit();
    return true;
  }

  function redo() {
    var item = redoStack.pop();
    if (!item) return false;
    undoStack.push(item);
    restoreState(item.after);
    saveSoon();
    emit();
    return true;
  }

  function rollbackTo(historyId) {
    var idx = db.history.findIndex(function (h) { return h.id === historyId; });
    if (idx < 0) return false;
    var entry = db.history[idx];
    createSnapshot(window.t('history.auto') + ' · ' + U.fmtDate(now(), true), true, true);
    var before = entry.before;
    restoreState(before);
    db.history.splice(0, idx + 1);
    db.history.unshift({
      id: U.uid('h'), at: now(), kind: 'rollback',
      summary: entry.summary, before: before
    });
    trimHistory();
    undoStack.length = 0;
    redoStack.length = 0;
    saveSoon();
    emit();
    return true;
  }

  function createSnapshot(name, auto, silent) {
    var snap = {
      id: U.uid('s'), at: now(), name: name || U.fmtDate(now(), true),
      auto: !!auto, data: snapshotState()
    };
    db.snapshots.unshift(snap);
    /* automatic snapshots rotate; manual ones are kept (up to 30) */
    var autos = db.snapshots.filter(function (x) { return x.auto; });
    while (autos.length > 12) {
      var last = autos.pop();
      db.snapshots = db.snapshots.filter(function (x) { return x !== last; });
    }
    var manual = db.snapshots.filter(function (x) { return !x.auto; });
    while (manual.length > 30) {
      var m0 = manual.pop();
      db.snapshots = db.snapshots.filter(function (x) { return x !== m0; });
    }
    while (db.snapshots.length > 42) db.snapshots.pop();
    if (!silent) { saveSoon(); emit(); }
    return snap;
  }

  function restoreSnapshot(id) {
    var snap = db.snapshots.find(function (s) { return s.id === id; });
    if (!snap) return false;
    createSnapshot(window.t('history.auto') + ' · ' + U.fmtDate(now(), true), true, true);
    restoreState(snap.data);
    db.history.unshift({ id: U.uid('h'), at: now(), kind: 'restore', summary: snap.name, before: snap.data });
    trimHistory();
    saveSoon();
    emit();
    return true;
  }

  function deleteSnapshot(id) {
    db.snapshots = db.snapshots.filter(function (s) { return s.id !== id; });
    saveSoon(); emit();
  }

  /* ------------- cards ------------- */

  function newCard(fields, silent) {
    var c = {
      id: U.uid('c'),
      title: '',
      body: '',
      note: '',
      tags: [],
      langs: [],
      category: '',
      color: '',
      style: {},
      link: '',
      summary: '',
      attachments: [],
      sources: [],
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null
    };
    Object.assign(c, fields || {});
    db.cards.push(c);
    byId.set(c.id, c);
    cardsRev++;
    if (!silent) { saveSoon(); emit(); }
    return c;
  }

  function updateCard(id, patch) {
    var c = card(id);
    if (!c) return null;
    Object.assign(c, patch, { updatedAt: now() });
    return c;
  }

  function touchCard(id) {
    var c = card(id);
    if (c) { c.updatedAt = now(); cardsRev++; }
  }

  function trashCard(id) {
    var c = card(id);
    if (!c) return;
    c.deletedAt = now();
    cardsRev++;
    /* edges are kept so a restore is lossless; the checkup reports them as broken links */
  }

  function restoreCard(id) {
    var c = card(id);
    if (!c) return;
    c.deletedAt = null;
    c.updatedAt = now();
    cardsRev++;
  }

  function purgeCard(id) {
    db.cards = db.cards.filter(function (c) { return c.id !== id; });
    byId.delete(id);
    cardsRev++;
    db.maps.forEach(function (m) {
      m.edges = m.edges.filter(function (e) { return e.from !== id && e.to !== id; });
      delete m.positions[id];
      delete m.offsets[id];
      m.collapsed = m.collapsed.filter(function (x) { return x !== id; });
    });
    db.reviews.forEach(function (r) { r.items = r.items.filter(function (it) { return it.cardId !== id; }); });
  }

  function mergeCards(srcId, dstId) {
    var src = card(srcId), dst = card(dstId);
    if (!src || !dst) return false;
    dst.tags = uniq(dst.tags.concat(src.tags || []));
    dst.langs = uniq(dst.langs.concat(src.langs || []));
    if (!dst.category && src.category) dst.category = src.category;
    if (src.note) dst.note = dst.note ? dst.note + '\n' + src.note : src.note;
    if (src.body && !dst.body) dst.body = src.body;
    (src.sources || []).forEach(function (s) { dst.sources.push(s); });
    dst.updatedAt = now();
    db.maps.forEach(function (m) {
      m.edges.forEach(function (e) {
        if (e.from === srcId) e.from = dstId;
        if (e.to === srcId) e.to = dstId;
      });
      m.edges = m.edges.filter(function (e) { return !(e.from === e.to && e.from === dstId); });
      m.collapsed = m.collapsed.filter(function (x) { return x !== srcId; });
      delete m.positions[srcId];
      delete m.offsets[srcId];
    });
    src.deletedAt = now();
    src.mergedInto = dstId;
    cardsRev++;
    return true;
  }

  function uniq(arr) {
    var seen = {};
    return arr.filter(function (x) {
      var k = String(x).toLowerCase();
      if (seen[k]) return false;
      seen[k] = 1; return true;
    });
  }

  /* ------------- maps ------------- */

  function newMap(name, opts) {
    opts = opts || {};
    var m = {
      id: U.uid('m'),
      name: name || window.t('common.untitledMap'),
      structure: opts.structure || 'tree',
      positions: {},
      offsets: {},
      collapsed: [],
      edges: [],
      style: { showLabels: true, accent: opts.accent || '' },
      template: opts.template || null,
      createdAt: now(),
      updatedAt: now(),
      view: null
    };
    db.maps.unshift(m);
    db.settings.lastMapId = m.id;
    if (!opts.silent) { saveSoon(); emit(); }
    return m;
  }

  function deleteMap(id) {
    db.maps = db.maps.filter(function (m) { return m.id !== id; });
    if (db.settings.lastMapId === id) db.settings.lastMapId = db.maps[0] ? db.maps[0].id : null;
  }

  function mapCards(m) {
    if (!m) return [];
    var key = m.id + '|' + (m.rev || 0) + '|' + cardsRev + '|' + db.cards.length;
    var hit = mcCache[m.id];
    if (hit && hit.key === key) return hit.list;
    var set = {};
    Object.keys(m.positions || {}).forEach(function (id) { set[id] = true; });
    Object.keys(m.offsets || {}).forEach(function (id) { set[id] = true; });
    m.edges.forEach(function (e) { set[e.from] = true; set[e.to] = true; });
    var list = Object.keys(set).map(card).filter(function (c) { return c && !c.deletedAt; });
    mcCache[m.id] = { key: key, list: list };
    return list;
  }

  function addCardToMap(m, cardId, pos) {
    if (!m || !cardId) return;
    if (!m.positions[cardId] && !m.offsets[cardId] && !m.edges.some(function (e) { return e.from === cardId || e.to === cardId; })) {
      m.positions[cardId] = pos || { x: 0, y: 0 };
    }
    m.updatedAt = now();
  }

  function edgesFor(m, cardId) {
    return m.edges.filter(function (e) { return e.from === cardId || e.to === cardId; });
  }

  function mapsOfCard(cardId) {
    return db.maps.filter(function (m) {
      return m.edges.some(function (e) { return e.from === cardId || e.to === cardId; }) ||
        !!m.positions[cardId] || !!m.offsets[cardId];
    });
  }

  function childrenOf(m, cardId) {
    return m.edges.filter(function (e) {
      return e.type === 'hierarchy' && e.from === cardId;
    }).map(function (e) { return e.to; });
  }

  function parentOf(m, cardId) {
    var e = m.edges.find(function (x) { return x.type === 'hierarchy' && x.to === cardId; });
    return e ? e.from : null;
  }

  /* ------------- duplicate / health ------------- */

  function pairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

  function similarTo(target, threshold) {
    threshold = threshold || 0.72;
    var out = [];
    cards().forEach(function (c) {
      if (c.id === target.id) return;
      if (db.dismissed.indexOf(pairKey(c.id, target.id)) >= 0) return;
      var s = Math.max(
        U.similarity(target.title, c.title),
        U.similarity((target.title || '') + ' ' + (target.body || ''), (c.title || '') + ' ' + (c.body || '')) * 0.95
      );
      if (s >= threshold) out.push({ card: c, score: s });
    });
    var sorted = out.sort(function (a, b) { return b.score - a.score; });
    var list = sorted.slice(0, 5);
    list.total = sorted.length;
    return list;
  }

  function duplicatePairs() {
    var list = cards();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var a = list[i], b = list[j];
        if (db.dismissed.indexOf(pairKey(a.id, b.id)) >= 0) continue;
        var s = U.similarity(a.title, b.title);
        if (s >= 0.8 || U.similarity(a.title + ' ' + a.body, b.title + ' ' + b.body) >= 0.86) {
          out.push({ a: a, b: b, score: s });
        }
      }
    }
    var sorted = out.sort(function (x, y) { return y.score - x.score; });
    var list = sorted.slice(0, 20);
    list.total = sorted.length;
    return list;
  }

  function health() {
    var live = cards();
    var inMap = {};
    db.maps.forEach(function (m) {
      mapCards(m).forEach(function (c) { inMap[c.id] = (inMap[c.id] || 0) + 1; });
    });
    var unmapped = live.filter(function (c) { return !inMap[c.id]; });
    var empties = live.filter(function (c) { return !String(c.title || '').trim(); });

    var isolated = [];
    var dubious = [];
    var broken = [];
    db.maps.forEach(function (m) {
      var seen = {};
      m.edges.forEach(function (e) {
        var a = card(e.from), b = card(e.to);
        if (!a || !b || a.deletedAt || b.deletedAt) {
          broken.push({ map: m, edge: e });
          return;
        }
        seen[e.from] = 1; seen[e.to] = 1;
        if (e.uncertain) dubious.push({ map: m, edge: e });
      });
      mapCards(m).forEach(function (c) {
        if (!seen[c.id]) isolated.push({ map: m, card: c });
      });
    });

    var deepest = null;
    db.maps.forEach(function (m) {
      var depth = {}, queue = [];
      var nodes = mapCards(m).map(function (c) { return c.id; });
      var hasParent = {};
      m.edges.forEach(function (e) {
        if (e.type === 'hierarchy' && nodes.indexOf(e.from) >= 0 && nodes.indexOf(e.to) >= 0) hasParent[e.to] = true;
      });
      nodes.forEach(function (id) { if (!hasParent[id]) { depth[id] = 0; queue.push(id); } });
      if (!nodes.length) return;
      if (!queue.length) { depth[nodes[0]] = 0; queue.push(nodes[0]); }
      for (var qi = 0; qi < queue.length; qi++) {
        var cur = queue[qi];
        m.edges.forEach(function (e) {
          if (e.type === 'hierarchy' && e.from === cur && depth[e.to] == null) {
            depth[e.to] = depth[cur] + 1;
            queue.push(e.to);
          }
        });
      }
      nodes.forEach(function (id) {
        if (depth[id] == null) depth[id] = 0;
        if (!deepest || depth[id] > deepest.depth) deepest = { map: m, card: card(id), depth: depth[id] };
      });
    });

    var dups = duplicatePairs();
    return {
      unmapped: unmapped,
      empties: empties,
      isolated: isolated,
      dubious: dubious,
      broken: broken,
      duplicates: dups,
      duplicateTotal: dups.total || dups.length,
      deepest: deepest
    };
  }

  /* ------------- reviews (AI annotations) ------------- */

  function pendingCount() {
    var n = 0;
    db.reviews.forEach(function (r) {
      r.items.forEach(function (it) { if (it.status === 'pending') n++; });
    });
    return n;
  }

  /* ------------- boot ------------- */

  function init(raw, extra) {
    info = extra || {};
    db = migrate(raw);
    rebuildIndex();
    var s = db.settings;
    if (s.theme !== 'dark' && s.theme !== 'paper' && s.theme !== 'ink') s.theme = 'light';
    return db;
  }

  function resetAll() {
    db = blank();
    rebuildIndex();
    saveSoon(); emit();
  }

  function resolveView() {
    var v = db.settings.lastView || 'home';
    return v;
  }

  CC.store = {
    FORMAT_VERSION: FORMAT_VERSION,
    init: init, state: state, settings: settings, info: function () { return info; },
    cards: cards, card: card, maps: maps, map: map, currentMap: currentMap,
    cardsRev: cardsRevNo, bumpCardsRev: bumpCards,
    cardTitle: cardTitle, onChange: onChange, emit: emit,
    saveSoon: saveSoon, flush: flush,
    commit: commit, touch: touch, quiet: quiet, markEdit: markEdit, snapshotState: snapshotState,
    undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo,
    rollbackTo: rollbackTo, createSnapshot: createSnapshot, restoreSnapshot: restoreSnapshot,
    deleteSnapshot: deleteSnapshot,
    newCard: newCard, updateCard: updateCard, touchCard: touchCard,
    trashCard: trashCard, restoreCard: restoreCard, purgeCard: purgeCard, mergeCards: mergeCards,
    newMap: newMap, deleteMap: deleteMap, mapCards: mapCards, addCardToMap: addCardToMap,
    edgesFor: edgesFor, mapsOfCard: mapsOfCard, childrenOf: childrenOf, parentOf: parentOf,
    similarTo: similarTo, health: health, uniq: uniq, pairKey: pairKey,
    pendingCount: pendingCount, resetAll: resetAll, resolveView: resolveView
  };
})();
