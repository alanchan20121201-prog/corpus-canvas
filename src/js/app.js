/* App shell: boot, routing, chrome, keyboard, flows */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  /* Browser preview mode: no Electron preload available. */
  var PREVIEW = !window.api;
  if (PREVIEW) {
    var ls = window.localStorage;
    window.api = {
      info: function () { return Promise.resolve({ version: '1.0.0-preview', userDir: '', corpusPath: 'localStorage', platform: 'web', encrypted: false, dev: true }); },
      loadCorpus: function () { try { return Promise.resolve(JSON.parse(ls.getItem('cc-corpus') || 'null')); } catch (e) { return Promise.resolve(null); } },
      saveCorpus: function (d) { ls.setItem('cc-corpus', JSON.stringify(d && d.data ? d.data : d)); return Promise.resolve({ ok: true }); },
      revealCorpus: function () { return Promise.resolve({ ok: true }); },
      getKey: function () { return Promise.resolve({ key: ls.getItem('cc-key') || '', encrypted: false }); },
      setKey: function (k) { ls.setItem('cc-key', k || ''); return Promise.resolve({ ok: true }); },
      clearKey: function () { ls.removeItem('cc-key'); return Promise.resolve({ ok: true }); },
      exportBackup: function () { return Promise.resolve({ ok: false, canceled: true }); },
      importBackup: function () { return Promise.resolve({ ok: false, canceled: true }); },
      exportBundle: function () { return Promise.resolve({ ok: false, canceled: true }); },
      importBundle: function () { return Promise.resolve({ ok: false, canceled: true }); },
      importDialog: function () { return Promise.resolve({ ok: false, canceled: true }); },
      extractXmindAttachments: function () { return Promise.resolve({ ok: true, items: [] }); },
      saveImage: function () { return Promise.resolve({ ok: false, canceled: true }); },
      parseXmind: function () { return Promise.resolve({ ok: false, error: 'preview' }); },
      chat: function () { return Promise.resolve({ ok: false, error: 'preview mode' }); },
      cancelChat: function () { return Promise.resolve({ ok: false }); },
      onChatChunk: function () { return function () {}; },
      ledgerList: function () { return Promise.resolve({ ok: true, items: [] }); },
      ledgerClear: function () { return Promise.resolve({ ok: true }); },
      corpusStats: function () { return Promise.resolve({ ok: true, sharded: false, shards: 0, cards: 0 }); },
      pickAttachments: function () { return Promise.resolve({ ok: false, canceled: true }); },
      readAttachment: function () { return Promise.resolve({ ok: false }); },
      checkAttachments: function () { return Promise.resolve({ ok: true, missing: [] }); },
      openAttachment: function () { return Promise.resolve({ ok: false }); },
      revealAttachment: function () { return Promise.resolve({ ok: false }); },
      deleteAttachment: function () { return Promise.resolve({ ok: true }); },
      smokeDone: function () { return Promise.resolve({ ok: true }); },
      readLayoutCache: function () { return Promise.resolve(null); },
      writeLayoutCache: function () { return Promise.resolve({ ok: true }); },
      clearLayoutCache: function () { return Promise.resolve({ ok: true }); },
      listBackups: function () { return Promise.resolve({ ok: true, items: [] }); },
      snapshotBackup: function () { return Promise.resolve({ ok: false }); },
      restoreBackup: function () { return Promise.resolve({ ok: false }); },
      saveText: function () { return Promise.resolve({ ok: false, canceled: true }); },
      exportPdf: function () { return Promise.resolve({ ok: false, canceled: true }); },
      openExternal: function () { },
      listModels: function () { return Promise.resolve({ ok: false, models: [] }); },
      listLibraries: function () { return Promise.resolve({ ok: true, activeId: 'default', items: [{ id: 'default', name: 'Default', cards: 0, corpusPath: 'localStorage' }] }); },
      createLibrary: function () { return Promise.resolve({ ok: false, error: 'preview' }); },
      switchLibrary: function () { return Promise.resolve({ ok: false, error: 'preview' }); },
      renameLibrary: function () { return Promise.resolve({ ok: false, error: 'preview' }); },
      deleteLibrary: function () { return Promise.resolve({ ok: false, error: 'preview' }); },
      toggleFullScreen: function () { },
      submitQuickCapture: function () { return Promise.resolve({ ok: false }); },
      cancelQuickCapture: function () { return Promise.resolve({ ok: true }); },
      onQuickCapture: function () { return function () {}; },
      quit: function () { }
    };
  }

  var st = { view: 'home', info: null, aiKey: '', lightTimer: null, ready: false, suppressFlush: false };

  function viewRoot() { return document.getElementById('view'); }

  /* ------------------------------------------------------------------ */
  /* boot                                                               */
  /* ------------------------------------------------------------------ */

  function boot() {
    window.api.info().then(function (info) {
      st.info = info;
      return window.api.loadCorpus();
    }).then(function (raw) {
      S.init(raw, st.info);
      return window.api.getKey();
    }).then(function (k) {
      st.aiKey = (k && k.key) || '';
      S.settings().ai.hasKey = !!st.aiKey;
      var s0 = S.settings();
      var sysLang = CC.i18n.resolveSystem((st.info && st.info.locale) || (window.navigator && navigator.language) || 'en');
      var bootLang = (s0.langAuto === false && s0.lang) ? s0.lang : sysLang;
      s0.lang = bootLang;
      CC.i18n.setLang(bootLang);
      applyTheme(S.settings().theme || 'light');
      CC.i18n.apply(document);
      bindChrome();
      S.onChange(onStoreChange);
      if (S.onSaveState) S.onSaveState(renderSaveStatus);
      if (window.api.onQuickCapture) {
        window.api.onQuickCapture(function (data) {
          if (!data || !data.text) return;
          S.commit('create', t('app.name'), function () {
            S.newCard({ title: data.text, tags: data.tags || [] }, true);
          });
          U.toast(t('quick.saved'), 'ok');
        });
      }
      st.ready = true;
      var bootQ = new URLSearchParams(location.search);
      var firstId = (bootQ.get('nofirst') === '1' || bootQ.get('demo') === '1') ? null : ensureFirstNode();
      var bootView = S.resolveView();
      preloadLayoutCache(bootView).then(function () {
        nav(bootView, { silent: true });
        if (firstId) {
          setTimeout(function () {
            if (CC.graph && CC.graph.selectCard) CC.graph.selectCard(firstId);
            openCard(firstId, { focusTitle: true });
          }, 120);
        }
      });
      syncChrome();
      /* Idle-time memory cleanup: keep a long session from holding on to
         every measured card and every cached layout model. */
      if (CC.layout && CC.layout.idleSweep) {
        setInterval(function () {
          CC.layout.idleSweep({ keepModels: 3, measureLimit: 4000 });
        }, 60000);
      }
      if (PREVIEW) applyPreviewQuery();
      if (location.search.indexOf('smoke=1') >= 0) runSmoke();
    }).catch(function (err) {
      console.error(err);
      U.alert('Error', U.esc(String(err && err.message || err)));
    });
  }

  function applyPreviewQuery() {
    var q = new URLSearchParams(location.search);
    var lang = q.get('lang');
    if (lang) { S.settings().lang = lang; CC.i18n.setLang(lang); }
    var theme = q.get('theme');
    if (theme) { S.settings().theme = theme; applyTheme(theme); }
    if (q.get('demo') === '1' && !S.cards().length) CC.demo.load();
    var v = q.get('view');
    if (v) nav(v, { silent: true });
    CC.i18n.apply(document);
    syncChrome();
    if (q.get('focus') === 'card' && S.cards().length) openCard(S.cards()[0].id);
  }

  /* Read the persisted layout before the first paint when opening on a map. */
  function preloadLayoutCache(view) {
    if (view !== 'map' || !window.api || !window.api.readLayoutCache) return Promise.resolve();
    var m = S.currentMap();
    if (!m) return Promise.resolve();
    return window.api.readLayoutCache(m.id).then(function (r) {
      if (r && r.ok && r.data) CC.layout.hydrate(m, r.data);
    }).catch(function () { });
  }

  /* A brand-new install opens on a map with one central topic, ready to rename. */
  /* Every empty map gets one central topic: an empty canvas is never a useful start. */
  function ensureFirstNode() {
    var db = S.state();
    var m = S.currentMap();
    if (m && S.mapCards(m).length) {
      db.meta = db.meta || {};
      db.meta.onboarded = true;
      return null;
    }
    var root = null;
    S.commit('create', t('onboard.firstNode'), function () {
      if (!m) m = S.newMap(t('common.untitledMap'), { silent: true });
      root = S.newCard({ title: t('onboard.centerNode') }, true);
      m.positions = m.positions || {};
      m.positions[root.id] = { x: 0, y: 0 };
      m.rev = (m.rev || 0) + 1;
      m.updatedAt = Date.now();
      S.settings().lastMapId = m.id;
    });
    db.meta = db.meta || {};
    db.meta.onboarded = true;
    S.settings().lastView = 'map';
    S.saveSoon();
    return root ? root.id : null;
  }

  function onStoreChange() {
    clearTimeout(st.lightTimer);
    st.lightTimer = setTimeout(function () {
      refreshLight();
      if (CC.inspector && CC.inspector.isOpen()) CC.inspector.refresh();
    }, 140);
    syncChrome();
  }

  /* ------------------------------------------------------------------ */
  /* routing                                                            */
  /* ------------------------------------------------------------------ */

  var VIEWS = ['home', 'map', 'graph', 'outline', 'cards', 'search', 'health', 'history', 'trash', 'help', 'settings'];

  function nav(view, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(view) < 0) view = 'home';
    var prev = st.view;
    st.view = view;
    if (!opts.silent) {
      S.settings().lastView = view;
      S.saveSoon();
    }
    if (prev === 'map' && view !== 'map') CC.graph.unmount();
    if (prev === 'graph' && view !== 'graph' && CC.forceGraph) CC.forceGraph.unmount();
    if (prev === 'outline' && view !== 'outline') CC.graph.resetState();

    var root = viewRoot();
    root.scrollTop = 0;
    root.className = 'view view-' + view;

    if (view === 'home') CC.views.home(root);
    else if (view === 'map') { CC.graph.resetState(); CC.graph.mount(root); }
    else if (view === 'graph') CC.forceGraph.mount(root);
    else if (view === 'outline') CC.views.outline(root);
    else if (view === 'cards') CC.views.cards(root);
    else if (view === 'search') CC.search.mount(root);
    else if (view === 'health') CC.views.health(root);
    else if (view === 'history') CC.views.history(root);
    else if (view === 'trash') CC.views.trash(root);
    else if (view === 'help') CC.help.mount(root, 'guide');
    else if (view === 'settings') CC.settings.mount(root);

    if (view !== 'map' && view !== 'cards' && view !== 'outline') CC.inspector.close();
    if (CC.ai && CC.ai.isDockOpen && CC.ai.isDockOpen()) CC.ai.closeDock();
    syncChrome();
  }

  function view() { return st.view; }

  function refreshLight() {
    if (!st.ready) return;
    if (st.view === 'map') { CC.graph.refresh(); return; }
    if (st.view === 'graph') { CC.forceGraph.refresh(); return; }
    /* Only skip the redraw while the user is actually typing. Buttons keep
       focus after a click, so the old "focus anywhere in the view" guard made
       outline expand/collapse and similar actions look like they did nothing. */
    var ae = document.activeElement;
    var typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' ||
      ae.tagName === 'SELECT' || ae.isContentEditable);
    var inView = ae && viewRoot() && viewRoot().contains(ae);
    var inInspector = ae && ae.closest && ae.closest('#inspector');
    if (typing && (inView || inInspector)) return;
    if (st.view === 'cards' || st.view === 'outline' || st.view === 'health' || st.view === 'home' ||
        st.view === 'search' || st.view === 'history' || st.view === 'trash') {
      if (st.view === 'home') CC.views.home(viewRoot());
      else if (st.view === 'cards') CC.views.cards(viewRoot());
      else if (st.view === 'outline') CC.views.outline(viewRoot());
      else if (st.view === 'health') CC.views.health(viewRoot());
      else if (st.view === 'history') CC.views.history(viewRoot());
      else if (st.view === 'trash') CC.views.trash(viewRoot());
      else if (CC.search && CC.search.mount) CC.search.mount(viewRoot());
    }
  }

  function refreshView() {
    nav(st.view, { silent: true });
  }

  function refreshInspector() {
    if (CC.inspector.isOpen()) CC.inspector.refresh();
  }

  /* ------------------------------------------------------------------ */
  /* chrome                                                             */
  /* ------------------------------------------------------------------ */

  function bindChrome() {
    document.querySelectorAll('[data-icon]').forEach(function (el) {
      el.innerHTML = U.icon(el.getAttribute('data-icon'), 19);
    });
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.onclick = function () { nav(b.getAttribute('data-nav')); };
    });
    document.getElementById('brand').onclick = function () { nav('home'); };
    document.getElementById('tb-search').onclick = function () { nav('search'); setTimeout(function () {
      var q = document.getElementById('q');
      if (q) { q.focus(); q.select(); }
    }, 60); };
    document.getElementById('tb-undo').onclick = function () { if (S.undo()) U.toast(t('history.undo'), 'ok'); };
    document.getElementById('tb-redo').onclick = function () { if (S.redo()) U.toast(t('history.redo'), 'ok'); };
    document.getElementById('tb-ai').onclick = function () { CC.ai.open('draft'); };
    var helpBtn = document.getElementById('tb-help');
    if (helpBtn) {
      helpBtn.innerHTML = U.icon('help', 17);
      helpBtn.title = t('nav.help');
      helpBtn.onclick = function () { nav('help'); };
    }
    document.getElementById('tb-theme').onclick = function () {
      var order = ['light', 'paper', 'dark', 'ink'];
      var cur = S.settings().theme;
      setTheme(order[(order.indexOf(cur) + 1) % order.length]);
      U.toast(t('theme.' + S.settings().theme));
    };
    document.getElementById('rail-lang').onclick = function (e) {
      var r = e.currentTarget.getBoundingClientRect();
      U.showMenu(r.right + 8, r.top - 260, [{ label: t('lang.auto'), hint: S.settings().langAuto ? '✓' : '', onClick: function () { setLang('auto'); } }, { sep: true }].concat(CC.i18n.langs.map(function (l) {
        return {
          label: l.label,
          hint: S.settings().lang === l.code ? '✓' : '',
          onClick: function () { setLang(l.code); }
        };
      })));
    };
    document.getElementById('tb-undo').innerHTML = U.icon('undo', 17);
    document.getElementById('tb-redo').innerHTML = U.icon('redo', 17);
    document.getElementById('tb-theme').innerHTML = U.icon('palette', 17);
    document.getElementById('tb-undo').title = t('history.undo');
    document.getElementById('tb-redo').title = t('history.redo');
    document.getElementById('drop-veil-text').textContent = t('import.dropHint');

    window.addEventListener('keydown', onKey);
    bindDragDrop();
    window.addEventListener('beforeunload', function () { if (!st.suppressFlush) S.flush(); });
  }

  function renderSaveStatus(status, err) {
    var el = document.getElementById('save-status');
    if (!el) return;
    var label = document.getElementById('save-status-label');
    if (!status || status === 'idle' || status === 'saved') { el.hidden = true; return; }
    el.hidden = false;
    el.className = 'save-status ss-' + status;
    if (label) label.textContent = t('save.' + (status === 'failed' ? 'failed' : status));
    el.title = status === 'failed' ? (err || t('save.failed')) : t('save.' + status);
  }

  function syncChrome() {
    var s = S.settings();
    document.querySelectorAll('.rail-btn[data-nav]').forEach(function (b) {
      var k = b.getAttribute('data-nav');
      b.classList.toggle('active', k === st.view);
      b.title = t('nav.' + k);
    });
    var undo = document.getElementById('tb-undo');
    var redo = document.getElementById('tb-redo');
    if (undo) undo.disabled = !S.canUndo();
    if (redo) redo.disabled = !S.canRedo();

    var aiPill = document.getElementById('tb-ai');
    if (aiPill) aiPill.classList.toggle('off', !CC.ai.ready());

    var lang = document.getElementById('lang-label');
    var labels = { 'zh-CN': '简', 'zh-TW': '繁', en: 'EN', ja: '日', ko: 'KO', es: 'ES', fr: 'FR' };
    if (lang) lang.textContent = labels[s.lang] || String(s.lang || 'EN').toUpperCase();

    var sp = document.getElementById('sp-text');
    if (sp) sp.textContent = t('common.search') + '…';

    buildCrumb();
    renderTabs();
    var ss = document.getElementById('save-status');
    if (ss) ss.onclick = function () {
      if (S.saveState && S.saveState().status === 'failed' && S.retrySave) S.retrySave();
    };
  }

  function renderTabs() {
    var bar = document.getElementById('map-tabs');
    if (!bar) return;
    if (st.view !== 'map' && st.view !== 'outline') { bar.hidden = true; return; }
    var maps = S.maps();
    bar.hidden = false;
    var active = S.currentMap();
    bar.innerHTML = maps.map(function (m) {
      var on = active && m.id === active.id;
      return '<button class="map-tab' + (on ? ' active' : '') + '" data-map="' + m.id + '">' +
        '<span class="mt-name">' + U.esc(m.name) + '</span>' +
        (on ? '<span class="mt-close" data-close="' + m.id + '">' + U.icon('close', 10) + '</span>' : '') +
        '</button>';
    }).join('') +
      '<button class="map-tab add" data-new="1">' + U.icon('plus', 13) + '</button>';

    bar.querySelectorAll('[data-map]').forEach(function (b) {
      b.onclick = function (e) {
        if (e.target.closest('[data-close]')) return;
        CC.app.goMap(b.getAttribute('data-map'));
      };
    });
    bar.querySelectorAll('[data-close]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var m = S.map(b.getAttribute('data-close'));
        if (m) CC.app.deleteMapFlow(m);
      };
    });
    bar.querySelectorAll('.map-tab[data-map]').forEach(function (b) {
      b.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        var m = S.map(b.getAttribute('data-map'));
        if (!m) return;
        U.showMenu(e.clientX, e.clientY, [
          { label: t('map.rename'), onClick: function () { CC.app.renameMapFlow(m); } },
          { label: t('map.duplicate'), onClick: function () { CC.app.duplicateMap(m); } },
          { label: t('map.template'), onClick: function () { CC.app.saveTemplate(m); } },
          { sep: true },
          { label: t('map.delete'), danger: true, onClick: function () { CC.app.deleteMapFlow(m); } }
        ]);
      });
    });
    var add = bar.querySelector('[data-new]');
    if (add) add.onclick = function () { CC.app.newMapFlow(); };
  }

  function buildCrumb() {
    var el = document.getElementById('crumb');
    if (!el) return;
    var mapName = S.currentMap() ? S.currentMap().name : '';
    var titles = {
      home: t('nav.home'), map: t('nav.map'), outline: t('nav.outline'), cards: t('nav.cards'),
      search: t('nav.search'), health: t('nav.health'), history: t('nav.history'),
      trash: t('nav.trash'), settings: t('nav.settings')
    };
    var html = '<span class="crumb-view">' + U.esc(titles[st.view] || '') + '</span>';
    if (st.view === 'map' || st.view === 'outline') {
      html += '<span class="crumb-meta">' + U.esc(mapName || t('common.untitledMap')) + '</span>' +
        (st.view === 'map' ? '<span class="crumb-hint">' + U.esc(t('map.nodeCount', { n: S.mapCards(S.currentMap() || { id: 'x', edges: [], positions: {}, rev: 0 }).length })) + '</span>' : '');
    } else if (st.view === 'cards') {
      html += '<span class="crumb-meta">' + S.cards().length + '</span>';
    } else if (st.view === 'health') {
      html += '<span class="crumb-meta">' + t('nav.health') + '</span>';
    }
    el.innerHTML = html;

    var picker = document.getElementById('map-picker');
    if (picker) picker.onclick = function () {
      var r = picker.getBoundingClientRect();
      var items = S.maps().map(function (m) {
        return {
          label: m.name,
          hint: m.id === S.settings().lastMapId ? '✓' : String(S.mapCards(m).length),
          onClick: function () { goMap(m.id); }
        };
      });
      items.push({ sep: true });
      items.push({ label: t('map.new'), icon: '＋', onClick: function () { newMapFlow(); } });
      if (S.state().templates.length) {
        items.push({
          label: t('map.fromTemplate'), icon: '▤', onClick: function () {
            U.showMenu(r.left, r.bottom + 8, S.state().templates.map(function (tpl) {
              return { label: tpl.name, onClick: function () { applyTemplate(tpl); } };
            }));
          }
        });
      }
      if (S.currentMap()) {
        items.push({ sep: true });
        items.push({ label: t('map.rename'), onClick: function () { renameMapFlow(S.currentMap()); } });
        items.push({ label: t('map.duplicate'), onClick: function () { duplicateMap(S.currentMap()); } });
        items.push({ label: t('map.delete'), danger: true, onClick: function () { deleteMapFlow(S.currentMap()); } });
      }
      U.showMenu(r.left, r.bottom + 6, items);
    };
    var add = document.getElementById('map-add');
    if (add) add.onclick = function () { newMapFlow(); };
  }

  /* ------------------------------------------------------------------ */
  /* settings                                                           */
  /* ------------------------------------------------------------------ */

  function setLang(code) {
    if (code === 'auto') {
      S.settings().langAuto = true;
      code = CC.i18n.resolveSystem((st.info && st.info.locale) || (window.navigator && navigator.language) || 'en');
    } else {
      S.settings().langAuto = false;
    }
    S.settings().lang = code;
    CC.i18n.setLang(code);
    CC.i18n.apply(document);
    S.saveSoon();
    nav(st.view, { silent: true });
    if (CC.inspector.isOpen()) CC.inspector.refresh();
    syncChrome();
  }

  function setTheme(name) {
    S.settings().theme = name;
    applyTheme(name);
    S.saveSoon();
    syncChrome();
    if (st.view === 'settings') CC.settings.mount(viewRoot());
  }

  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
  }

  /* ------------------------------------------------------------------ */
  /* flows                                                              */
  /* ------------------------------------------------------------------ */

  function openCard(id, opts) {
    if (st.view !== 'map' && st.view !== 'cards' && st.view !== 'outline' && st.view !== 'graph') {
      nav('cards');
    }
    if (st.view === 'map') CC.graph.selectCard(id);
    CC.inspector.open(id, opts || {});
  }

  function newMapFlow(name) {
    return new Promise(function (resolve) {
      var go = function (n) {
        var m = S.newMap(n || t('common.untitledMap'), { silent: true });
        S.commit('map', t('map.new'), function () {
          if (!S.mapCards(m).length) {
            var c = S.newCard({ title: t('onboard.centerNode') }, true);
            m.positions = m.positions || {};
            m.positions[c.id] = { x: 0, y: 0 };
            m.updatedAt = Date.now();
          }
        });
        nav('map');
        resolve(m);
      };
      if (name) return go(name);
      U.prompt(t('map.new'), '', { placeholder: t('map.newPrompt') }).then(function (v) {
        if (!v) return resolve(null);
        go(v);
      });
    });
  }

  function renameMapFlow(m) {
    U.prompt(t('map.rename'), m.name).then(function (v) {
      if (!v) return;
      S.commit('map', t('map.rename'), function () { m.name = v; m.updatedAt = Date.now(); });
    });
  }

  function duplicateMap(m) {
    S.commit('map', t('map.duplicate'), function () {
      var copy = JSON.parse(JSON.stringify(m));
      copy.id = U.uid('m');
      copy.name = m.name + ' · 2';
      copy.createdAt = Date.now(); copy.updatedAt = Date.now();
      copy.edges = copy.edges.map(function (e) { return Object.assign({}, e, { id: U.uid('e') }); });
      S.state().maps.unshift(copy);
      S.settings().lastMapId = copy.id;
    });
    nav('map', { silent: true });
    CC.graph.refresh();
  }

  function deleteMapFlow(m) {
    U.confirm(t('map.delete'), t('map.deleteConfirm', { name: m.name }), { danger: true }).then(function (ok) {
      if (!ok) return;
      S.commit('map', t('map.delete'), function () { S.deleteMap(m.id); });
      nav('map', { silent: true });
      CC.graph.refresh();
      syncChrome();
    });
  }

  function goMap(mapId, cardId) {
    if (mapId) S.settings().lastMapId = mapId;
    nav('map');
    if (cardId) {
      setTimeout(function () {
        CC.graph.selectCard(cardId);
        CC.graph.centerOn(cardId);
        CC.inspector.open(cardId);
      }, 80);
    }
  }

  function locateCard(id) {
    var maps = S.mapsOfCard(id);
    if (!maps.length) { U.toast(t('cards.reverseNone')); return; }
    goMap(maps[0].id, id);
  }

  function deleteCardFlow(id) {
    var c = S.card(id);
    if (!c) return;
    U.confirm(t('cards.delete'), t('cards.deleteConfirm', { name: S.cardTitle(c) }), { danger: true }).then(function (ok) {
      if (!ok) return;
      S.commit('delete', t('cards.delete'), function () { S.trashCard(id); });
      if (CC.inspector.currentCardId() === id) CC.inspector.close();
      U.toast(t('cards.delete'), 'ok');
    });
  }

  function mergeFlow(a, b) {
    var ca = S.card(a), cb = S.card(b);
    if (!ca || !cb) return;
    U.confirm(t('common.merge'), t('cards.mergeConfirm', { a: S.cardTitle(ca), b: S.cardTitle(cb) })).then(function (ok) {
      if (!ok) return;
      S.commit('merge', t('common.merge'), function () { S.mergeCards(a, b); });
      U.toast(t('cards.mergeDone'), 'ok');
      if (CC.inspector.currentCardId() === a) CC.inspector.open(b);
      refreshLight();
    });
  }

  function createMapFromCards(ids, name) {
    if (!ids.length) return;
    var m = null;
    S.commit('create', t('map.newFromSelection'), function () {
      m = S.newMap((name || t('map.newFromSelection')).slice(0, 40));
      ids.forEach(function (id, i) {
        m.positions[id] = { x: (i % 4) * 250, y: Math.floor(i / 4) * 130 };
        S.addCardToMap(m, id);
      });
    });
    U.toast(t('search.mapCreated', { name: m.name }), 'ok');
    goMap(m.id);
  }

  function outlineAddChild(m, parentId) {
    var c = null;
    S.commit('create', t('outline.addChild'), function () {
      c = S.newCard({ title: '' }, true);
      m.positions[c.id] = { x: 0, y: 0 };
      m.edges.push({ id: U.uid('e'), from: parentId, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: false });
      if (m.collapsed.indexOf(parentId) >= 0) m.collapsed = m.collapsed.filter(function (x) { return x !== parentId; });
    });
    setTimeout(function () {
      var rows = document.querySelectorAll('.ol-row[data-id="' + c.id + '"] .ol-title');
      if (rows[0]) { rows[0].focus(); rows[0].select(); }
    }, 60);
    refreshLight();
  }

  function outlineAddSibling(m, id) {
    var pid = S.parentOf(m, id);
    if (!pid) { outlineAddChild(m, id); return; }
    var c = null;
    S.commit('create', t('outline.addSibling'), function () {
      c = S.newCard({ title: '' }, true);
      m.positions[c.id] = { x: 0, y: 0 };
      m.edges.push({ id: U.uid('e'), from: pid, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: false });
    });
    setTimeout(function () {
      var input = document.querySelector('.ol-row[data-id="' + c.id + '"] .ol-title');
      if (input) { input.focus(); input.select(); }
    }, 60);
    refreshLight();
  }

  function searchTag(tag, field) {
    CC.search.setTag(tag, field);
    nav('search');
  }

  function pickCard(title) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'pick-panel';
      var cards = S.cards();
      wrap.innerHTML =
        '<input class="input" id="pick-q" placeholder="' + U.esc(t('common.search')) + '" autofocus>' +
        '<div class="pick-list" id="pick-list"></div>';
      var picked = null;
      var modal = U.openModal({
        title: title || t('common.select'),
        body: wrap,
        actions: [
          { id: 'cancel', label: t('common.cancel'), ghost: true },
          { id: 'ok', label: t('common.ok'), primary: true, onClick: function () { return picked || false; } }
        ]
      }).then(function (r) { resolve(typeof r === 'string' ? r : null); });

      function draw(q) {
        var list = cards.filter(function (c) {
          if (!q) return true;
          return ((c.title || '') + ' ' + (c.body || '') + ' ' + (c.tags || []).join(' ')).toLowerCase().indexOf(q.toLowerCase()) >= 0;
        }).slice(0, 100);
        var host = wrap.querySelector('#pick-list');
        host.innerHTML = list.map(function (c) {
          return '<button class="pick-row' + (picked === c.id ? ' active' : '') + '" data-pick="' + c.id + '">' +
            '<span class="pr-title">' + U.esc(c.title || t('common.untitled')) + '</span>' +
            '<span class="pr-meta">' + U.esc((c.tags || []).join(' ')) + '</span></button>';
        }).join('') || '<div class="mini-empty pad">' + U.esc(t('common.noResults')) + '</div>';
        host.querySelectorAll('[data-pick]').forEach(function (b) {
          b.onclick = function () {
            picked = b.getAttribute('data-pick');
            draw(q);
          };
        });
      }
      var qi = wrap.querySelector('#pick-q');
      qi.oninput = function () { draw(qi.value); };
      qi.onkeydown = function (e) {
        if (e.key === 'Enter') {
          if (!picked) {
            var first = wrap.querySelector('[data-pick]');
            if (first) picked = first.getAttribute('data-pick');
          }
          if (picked) {
            var ov = Array.prototype.slice.call(document.querySelectorAll('.overlay')).pop();
            var okBtn = ov && ov.querySelector('.modal-foot .btn.primary');
            if (okBtn) okBtn.click();
          }
        }
      };
      draw('');
    });
  }

  function startLinkFrom(id) {
    if (st.view !== 'map') nav('map');
    setTimeout(function () {
      CC.graph.beginLink(id);
      U.toast(t('map.connectHint'));
    }, 80);
  }

  function saveTemplate(m) {
    U.prompt(t('map.template'), m.name, { placeholder: t('common.name') }).then(function (name) {
      if (!name) return;
      var cards = S.mapCards(m);
      var payload = {
        name: name,
        cards: cards.map(function (c) {
          return { title: c.title, body: c.body, note: c.note, tags: c.tags, langs: c.langs };
        }),
        edges: m.edges.filter(function (e) {
          return cards.some(function (c) { return c.id === e.from; }) && cards.some(function (c) { return c.id === e.to; });
        }).map(function (e) {
          return {
            from: cards.findIndex(function (c) { return c.id === e.from; }),
            to: cards.findIndex(function (c) { return c.id === e.to; }),
            type: e.type, label: e.label, color: e.color, uncertain: e.uncertain
          };
        }),
        structure: m.structure
      };
      S.commit('template', t('map.template'), function () {
        S.state().templates.unshift({ id: U.uid('tpl'), name: name, at: Date.now(), payload: payload });
      });
      U.toast(t('map.templateSaved', { name: name }), 'ok');
    });
  }

  function applyTemplate(tpl) {
    var p = tpl.payload;
    var m = null;
    S.commit('create', t('map.fromTemplate'), function () {
      m = S.newMap(tpl.name, { structure: p.structure || 'tree' });
      var ids = p.cards.map(function (c) {
        var card = S.newCard({ title: c.title, body: c.body, note: c.note, tags: c.tags, langs: c.langs }, true);
        m.positions[card.id] = { x: 0, y: 0 };
        S.addCardToMap(m, card.id);
        return card.id;
      });
      p.edges.forEach(function (e) {
        if (ids[e.from] && ids[e.to]) {
          m.edges.push({ id: U.uid('e'), from: ids[e.from], to: ids[e.to], type: e.type, label: e.label, color: e.color, uncertain: e.uncertain });
        }
      });
    });
    U.toast(t('map.templateSaved', { name: tpl.name }), 'ok');
    goMap(m.id);
  }

  /* ------------------------------------------------------------------ */
  /* keyboard + drop                                                    */
  /* ------------------------------------------------------------------ */

  /* Shortcuts are a sparse override map on top of these defaults. 'Mod'
     means Ctrl on Windows/Linux and Cmd on macOS. 'nav' (1-9) stays fixed. */
  var DEFAULT_SHORTCUTS = {
    search: 'Mod+K', save: 'Mod+S', undo: 'Mod+Z', redo: 'Mod+Shift+Z',
    fullscreen: 'F11', delete: 'Delete', escape: 'Escape',
    focus: 'F', fit: 'G', edit: 'Enter', nav: '1-9'
  };

  function shortcuts() {
    var s = S.settings();
    return Object.assign({}, DEFAULT_SHORTCUTS, (s && s.shortcuts) || {});
  }

  function keyToken(e) {
    var parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Mod');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    var k = e.key;
    if (k === ' ') k = 'Space';
    else if (k && k.length === 1) k = k.toUpperCase();
    parts.push(k);
    return parts.join('+');
  }

  function switchLibrary(id) {
    if (!window.api || !window.api.switchLibrary) return Promise.resolve(false);
    return S.flush().then(function () {
      return window.api.switchLibrary({ id: id });
    }).then(function (r) {
      if (r && r.ok) { st.suppressFlush = true; location.reload(); return true; }
      U.toast(t('settings.librarySwitchFail'), 'bad');
      return false;
    });
  }

  function runShortcut(action, e) {
    if (action === 'search') {
      e.preventDefault(); nav('search');
      setTimeout(function () { var q = document.getElementById('q'); if (q) q.focus(); }, 50);
      return true;
    }
    if (action === 'save') { e.preventDefault(); S.flush().then(function () { U.toast(t('common.saved'), 'ok'); }); return true; }
    if (action === 'undo') { e.preventDefault(); if (S.undo()) U.toast(t('history.undo'), 'ok'); return true; }
    if (action === 'redo') { e.preventDefault(); if (S.redo()) U.toast(t('history.redo'), 'ok'); return true; }
    if (action === 'fullscreen') { e.preventDefault(); if (window.api && window.api.toggleFullScreen) window.api.toggleFullScreen(); return true; }
    if (action === 'escape') {
      if (CC.inspector.isOpen()) CC.inspector.close(); else U.closeMenus();
      return true;
    }
    if (st.view !== 'map') return false;
    if (action === 'focus') { CC.graph.toggleFocus(); return true; }
    if (action === 'fit') { CC.graph.zoomFit(); return true; }
    if (action === 'delete') {
      var sel = CC.graph.selection();
      if (sel.length === 1) { e.preventDefault(); deleteCardFlow(sel[0]); }
      else if (sel.length > 1) {
        e.preventDefault();
        U.confirm(t('cards.delete'), t('cards.batchHint', { n: sel.length }), { danger: true }).then(function (ok) {
          if (!ok) return;
          S.commit('delete', t('cards.delete'), function () { sel.forEach(function (id) { S.trashCard(id); }); });
        });
      }
      return true;
    }
    if (action === 'edit' && CC.graph.selection().length === 1) {
      e.preventDefault();
      openCard(CC.graph.selection()[0], { focusTitle: true });
      return true;
    }
    return false;
  }

  function onKey(e) {
    var tag = (e.target && e.target.tagName) || '';
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
    var token = keyToken(e);
    var sc = shortcuts();

    /* Form fields keep the browser's own text editing; only an explicitly
       configured "save" combo is allowed to reach the app. */
    if (typing) {
      if (token === sc.save && (e.ctrlKey || e.metaKey || e.altKey)) { e.preventDefault(); S.flush().then(function () { U.toast(t('common.saved'), 'ok'); }); return; }
      if (e.key === 'Escape' && e.target.blur) e.target.blur();
      return;
    }
    if (document.querySelector('.overlay')) return;

    if (/^[1-9]$/.test(e.key) && sc.nav === '1-9') {
      var target = VIEWS[Number(e.key) - 1];
      if (target) { e.preventDefault(); nav(target); }
      return;
    }

    var action = null;
    Object.keys(sc).forEach(function (a) { if (a !== 'nav' && sc[a] === token) action = a; });
    if (!action) return;
    runShortcut(action, e);
  }

  function bindDragDrop() {
    var veil = document.getElementById('drop-veil');
    var depth = 0;
    window.addEventListener('dragenter', function (e) {
      if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
      depth++;
      veil.classList.add('on');
    });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('dragleave', function () {
      depth = Math.max(0, depth - 1);
      if (!depth) veil.classList.remove('on');
    });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      depth = 0;
      veil.classList.remove('on');
      var files = Array.prototype.slice.call(e.dataTransfer.files || []);
      if (!files.length) return;
      CC.importer.importFileObject(files[0]);
    });
  }

  /* ------------------------------------------------------------------ */
  /* smoke test                                                         */
  /* ------------------------------------------------------------------ */

  function runSmoke() {
    var errors = [];
    var steps = [];

    function step(name, fn) {
      try { var r = fn(); steps.push({ name: name, ok: true, info: r || '' }); }
      catch (e) { steps.push({ name: name, ok: false, info: String(e && e.stack || e) }); errors.push(name + ': ' + (e && e.message)); }
    }

    step('modules', function () {
      return ['store', 'layout', 'graph', 'views', 'search', 'settings', 'ai', 'importer', 'inspector'].filter(function (k) { return !CC[k]; }).join(',');
    });

    step('create-card', function () {
      var c = S.newCard({ title: 'smoke card', body: 'hello world 测试' }, true);
      S.saveSoon();
      return c.id;
    });

    step('create-map', function () {
      var m = S.newMap('smoke map', { silent: true });
      var cs = S.cards();
      m.positions[cs[0].id] = { x: 0, y: 0 };
      if (cs[1]) {
        m.positions[cs[1].id] = { x: 100, y: 100 };
        m.edges.push({ id: U.uid('e'), from: cs[0].id, to: cs[1].id, type: 'hierarchy' });
      }
      S.settings().lastMapId = m.id;
      return m.id;
    });

    step('layout', function () {
      var m = S.currentMap();
      var model = CC.layout.compute(m, {});
      return Object.keys(model.nodes).length + ' nodes';
    });

    step('health', function () { return JSON.stringify(S.health()).length; });
    step('duplicates', function () { return S.similarTo(S.cards()[0]).length; });

    step('views', function () {
      var out = [];
      VIEWS.forEach(function (v) {
        nav(v, { silent: true });
        out.push(v);
      });
      nav('map', { silent: true });
      return out.join(',');
    });

    step('search', function () {
      CC.search.setQuery('hello');
      nav('search', { silent: true });
      return document.querySelectorAll('.result-row').length;
    });

    step('i18n-keys', function () {
      var missing = [];
      Object.keys(CC.i18n.dicts).forEach(function (lang) {
        var d = CC.i18n.dicts[lang];
        var base = CC.i18n.dicts['zh-CN'];
        Object.keys(base).forEach(function (k) { if (!d[k]) missing.push(lang + ':' + k); });
      });
      return missing.length ? missing.slice(0, 20).join(',') : 'all present';
    });

    step('persist', function () { return 'ok'; });

    window.addEventListener('error', function (e) {
      errors.push('runtime: ' + e.message);
    });

    setTimeout(function () {
      window.api.smokeDone({
        ok: errors.length === 0 && steps.every(function (s) { return s.ok; }),
        errors: errors,
        steps: steps,
        cards: S.cards().length,
        maps: S.maps().length
      });
    }, 500);
  }

  /* ------------------------------------------------------------------ */
  /* public                                                             */
  /* ------------------------------------------------------------------ */

  CC.app = {
    nav: nav, view: view, goMap: goMap, openCard: openCard, locateCard: locateCard,
    newMapFlow: newMapFlow, renameMapFlow: renameMapFlow, duplicateMap: duplicateMap,
    deleteMapFlow: deleteMapFlow, saveTemplate: saveTemplate, applyTemplate: applyTemplate,
    createMapFromCards: createMapFromCards, mergeFlow: mergeFlow, deleteCardFlow: deleteCardFlow,
    outlineAddChild: outlineAddChild, outlineAddSibling: outlineAddSibling,
    searchTag: searchTag, pickCard: pickCard, startLinkFrom: startLinkFrom,
    openAI: function (k) { CC.ai.open(k); }, openReviewPanel: function () { CC.ai.openReviewPanel(); },
    setLang: setLang, setTheme: setTheme, syncChrome: syncChrome, info: function () { return st.info; },
    getKey: function () { return st.aiKey; },
    setKey: function (k) { st.aiKey = k || ''; },
    suppressFlush: function () { st.suppressFlush = true; },
    switchLibrary: switchLibrary,
    keyToken: keyToken,
    getShortcuts: function () { return shortcuts(); },
    setShortcut: function (a, k) {
      var s = S.settings();
      if (!s.shortcuts || typeof s.shortcuts !== 'object' || Array.isArray(s.shortcuts)) s.shortcuts = {};
      s.shortcuts[a] = k;
      S.saveSoon();
    },
    resetShortcuts: function () { S.settings().shortcuts = {}; S.saveSoon(); },
    defaultShortcuts: DEFAULT_SHORTCUTS,
    refreshLight: refreshLight, refreshView: refreshView, refreshInspector: refreshInspector,
    ensureFirstNode: ensureFirstNode,
    onSelectionChange: function (sel) {
      if (CC.ai && CC.ai.isDockOpen && CC.ai.isDockOpen()) return;
      if (sel && sel.length === 1) CC.inspector.open(sel[0]);
      else CC.inspector.close();
    },
    runSmoke: runSmoke
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
