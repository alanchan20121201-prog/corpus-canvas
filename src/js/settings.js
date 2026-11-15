/* Settings: language, theme, AI key, privacy/network, data, shortcuts */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  function section(id, iconName, title, body, extraClass) {
    return '<section class="set-card ' + (extraClass || '') + '" id="' + id + '">' +
      '<div class="set-card-head">' + U.icon(iconName, 18) + '<h2>' + U.esc(title) + '</h2></div>' +
      '<div class="set-card-body">' + body + '</div>' +
    '</section>';
  }

  function mount(root) {
    var st = S.settings();
    var info = CC.app.info() || {};
    var ai = st.ai;
    var themes = [
      { id: 'light', label: t('theme.light') },
      { id: 'dark', label: t('theme.dark') },
      { id: 'paper', label: t('theme.paper') },
      { id: 'ink', label: t('theme.ink') }
    ];

    root.innerHTML =
      '<div class="page-head"><div class="ph-left">' +
        '<h1 class="page-title"><span class="pt-ico">' + U.icon('settings', 20) + '</span>' + U.esc(t('settings.title')) + '</h1>' +
        '<p class="page-sub">' + U.esc(t('settings.aiHint')) + '</p>' +
      '</div><div class="page-actions"><span class="quiet-badge">' + U.esc(t('settings.noTelemetry')) + '</span></div></div>' +

      '<div class="settings-shell">' +

        section('set-lang', 'globe', t('settings.language'),
          '<p class="set-hint">' + U.esc(t('settings.languageHint')) + '</p>' +
          '<div class="lang-grid scroll">' +
            '<button class="lang-tile' + (st.langAuto ? ' active' : '') + '" data-auto="1">' +
              '<span class="lt-name">' + U.esc(t('lang.auto')) + '</span>' +
              (st.langAuto ? '<span class="lt-check">' + U.icon('check', 13) + '</span>' : '') +
            '</button>' +
            CC.i18n.langs.map(function (l) {
              return '<button class="lang-tile' + (!st.langAuto && st.lang === l.code ? ' active' : '') + '" data-lang="' + l.code + '">' +
                '<span class="lt-name">' + U.esc(l.label) + '</span>' +
                (!st.langAuto && st.lang === l.code ? '<span class="lt-check">' + U.icon('check', 13) + '</span>' : '') +
              '</button>';
            }).join('') + '</div>' +
          '<p class="set-hint small">' + U.esc(t('settings.languageHint')) + '</p>') +

        section('set-theme', 'palette', t('settings.theme'),
          '<p class="set-hint">' + U.esc(t('settings.themeHint')) + '</p>' +
          '<div class="theme-grid">' + themes.map(function (th) {
            return '<button class="theme-tile t-' + th.id + (st.theme === th.id ? ' active' : '') + '" data-theme="' + th.id + '">' +
              '<span class="tt-preview"><i class="tt-side"></i><i class="tt-line"></i><i class="tt-line short"></i><i class="tt-block"></i></span>' +
              '<span class="tt-label">' + U.esc(th.label) + '</span>' +
            '</button>';
          }).join('') + '</div>') +

        section('set-ai', 'sparkles', t('settings.ai'),
          '<div class="ai-status-bar">' +
            '<span class="ai-dot' + (ai.baseUrl && ai.model && (ai.hasKey || ai.local) ? ' on' : '') + '"></span>' +
            '<span>' + U.esc((ai.hasKey || ai.local) ? (ai.local ? t('settings.localModel') : t('settings.apiKeySaved')) : t('settings.aiOff')) + '</span>' +
          '</div>' +
          '<p class="set-hint">' + U.esc(t('settings.aiHint')) + '</p>' +
          '<div class="form-grid">' +
            '<label class="field"><span>' + U.esc(t('settings.baseUrl')) + '</span>' +
              '<input class="input" id="ai-base" value="' + U.esc(ai.baseUrl) + '" placeholder="https://api.openai.com/v1">' +
              '<em>' + U.esc(t('settings.baseUrlHint')) + '</em></label>' +
            '<label class="field"><span>' + U.esc(t('settings.model')) + '</span>' +
              '<input class="input" id="ai-model" value="' + U.esc(ai.model) + '" placeholder="gpt-4o-mini"></label>' +
          '</div>' +
          '<label class="field"><span>' + U.esc(t('settings.apiKey')) + '</span>' +
            '<div class="key-row">' +
              '<input class="input" id="ai-key" type="password" placeholder="' + U.esc(t('settings.apiKeyPlaceholder')) + '" autocomplete="off">' +
              '<button class="icon-btn" id="key-eye" title="show">' + U.icon('key', 16) + '</button>' +
              '<button class="btn sm" id="key-clear">' + U.esc(t('settings.apiKeyClear')) + '</button>' +
            '</div>' +
            '<span class="key-state" id="ai-key-status">' + U.esc(ai.hasKey ? t('settings.apiKeySaved') : t('settings.aiOff')) + '</span>' +
            '<em>' + U.esc(t('settings.keysLocal')) + '</em></label>' +
          '<label class="check"><input type="checkbox" id="ai-local"' + (ai.local ? ' checked' : '') + '><span>' + U.esc(t('settings.localModel')) + '</span></label>' +
          '<p class="set-hint small">' + U.esc(t('settings.localModelHint')) + '</p>' +
          '<div class="ai-test-row">' +
            '<button class="btn sm" id="ai-test">' + U.icon('cloud', 14) + '<span>' + U.esc(t('settings.testConn')) + '</span></button>' +
            '<span class="test-status" id="test-status"></span>' +
          '</div>' +
          '<div class="cost-note">' + U.icon('info', 14) + '<div><strong>' + U.esc(t('settings.cost')) + '</strong><p>' + U.esc(t('settings.costBody')) + '</p></div></div>') +

        section('set-privacy', 'shield', t('settings.privacy'),
          '<p class="set-hint">' + U.esc(t('settings.privacyBody')) + '</p>' +
          '<div class="net-list">' +
            '<div class="net-row on">' + U.icon('sparkles', 15) + '<div><strong>' + U.esc(t('settings.network')) + '</strong><p>' + U.esc(t('settings.networkAi')) + '</p></div><span class="net-tag">' + U.esc(t('common.on')) + '</span></div>' +
            '<div class="net-row">' + U.icon('folder', 15) + '<div><strong>' + U.esc(t('settings.data')) + '</strong><p>' + U.esc(t('settings.networkOff')) + '</p></div><span class="net-tag off">' + U.esc(t('common.off')) + '</span></div>' +
            '<div class="net-row">' + U.icon('key', 15) + '<div><strong>' + U.esc(t('settings.apiKey')) + '</strong><p>' + U.esc(t('settings.networkKey')) + '</p></div><span class="net-tag off">' + U.esc(t('common.off')) + '</span></div>' +
          '</div>') +

        section('set-data', 'folder', t('settings.data'),
          '<div class="kv-row"><span class="kv-key">' + U.esc(t('settings.dataPath')) + '</span>' +
            '<code class="kv-val">' + U.esc(info.corpusPath || '') + '</code>' +
            '<button class="mini-btn" id="reveal">' + U.icon('external', 12) + U.esc(t('settings.dataReveal')) + '</button></div>' +
          '<div class="kv-row"><span class="kv-key">' + U.esc(t('settings.format')) + '</span>' +
            '<span class="kv-val">' + U.esc(t('settings.formatBody', { version: S.FORMAT_VERSION })) + '</span></div>' +
          '<div class="backup-row">' +
            '<button class="btn" id="backup-export">' + U.icon('download', 15) + '<span>' + U.esc(t('settings.backupExport')) + '</span></button>' +
            '<button class="btn" id="backup-import">' + U.icon('upload', 15) + '<span>' + U.esc(t('settings.backupImport')) + '</span></button>' +
            '<button class="btn ghost" id="import-file">' + U.icon('upload', 15) + '<span>' + U.esc(t('import.title')) + '</span></button>' +
          '</div>' +
          '<div class="danger-zone"><div><strong>' + U.esc(t('settings.danger')) + '</strong><p>' + U.esc(t('settings.clearAllConfirm')) + '</p></div>' +
            '<button class="btn danger sm" id="clear-all">' + U.esc(t('settings.clearAll')) + '</button></div>') +

        section('set-keys', 'keyboard', t('settings.shortcuts'),
          '<div class="shortcut-grid">' +
            ['newCard', 'search', 'save', 'undo', 'delete', 'escape', 'focus', 'fit', 'edit', 'nav', 'quickAdd'].map(function (k) {
              return '<div class="sc-row"><kbd>' + U.esc(t('shortcut.' + k).split(' ')[0]) + '</kbd><span>' + U.esc(t('shortcut.' + k).split(' ').slice(1).join(' ')) + '</span></div>';
            }).join('') +
          '</div>') +

        section('set-about', 'info', t('settings.about'),
          '<p class="set-hint">' + U.esc(t('settings.aboutBody')) + '</p>' +
          '<div class="about-row"><span class="about-mark">◈</span><div><strong>' + U.esc(t('app.name')) + '</strong>' +
          '<p>' + U.esc(t('app.tagline')) + ' · ' + U.esc(t('settings.version', { v: info.version || '' })) + '</p></div></div>') +
      '</div>';

    bind(root);
  }

  function bind(root) {
    root.querySelectorAll('[data-lang]').forEach(function (b) {
      b.onclick = function () { CC.app.setLang(b.getAttribute('data-lang')); };
    });
    var autoLang = root.querySelector('[data-auto]');
    if (autoLang) autoLang.onclick = function () { CC.app.setLang('auto'); };
    root.querySelectorAll('[data-theme]').forEach(function (b) {
      b.onclick = function () { CC.app.setTheme(b.getAttribute('data-theme')); };
    });

    var base = root.querySelector('#ai-base');
    var model = root.querySelector('#ai-model');
    var local = root.querySelector('#ai-local');
    if (base) base.onchange = function () {
      S.settings().ai.baseUrl = base.value.trim();
      S.saveSoon(); S.emit();
    };
    if (model) model.onchange = function () {
      S.settings().ai.model = model.value.trim();
      S.saveSoon(); S.emit();
    };
    if (local) local.onchange = function () {
      S.settings().ai.local = local.checked;
      S.saveSoon(); S.emit();
    };

    var keyInput = root.querySelector('#ai-key');
    if (keyInput) {
      var saveKey = U.debounce(function (value) {
        window.api.setKey(value).then(function (r) {
          S.settings().ai.hasKey = !!value;
          S.saveSoon();
          CC.app.syncChrome();
          var st = document.getElementById('ai-key-status');
          if (st) st.textContent = value ? t('settings.apiKeySaved') : t('settings.aiOff');
        });
      }, 600);
      keyInput.oninput = function () { saveKey(keyInput.value.trim()); };
    }
    var eye = root.querySelector('#key-eye');
    if (eye) eye.onclick = function () {
      keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    };
    var kc = root.querySelector('#key-clear');
    if (kc) kc.onclick = function () {
      window.api.clearKey().then(function () {
        S.settings().ai.hasKey = false;
        S.saveSoon();
        if (keyInput) keyInput.value = '';
        CC.app.syncChrome();
        U.toast(t('settings.apiKeyCleared'), 'ok');
        mount(root);
      });
    };
    var test = root.querySelector('#ai-test');
    if (test) test.onclick = function () {
      var status = root.querySelector('#test-status');
      var ai = S.settings().ai;
      status.innerHTML = '<span class="spinner"></span>' + U.esc(t('common.testing'));
      window.api.chat({
        baseUrl: ai.baseUrl, apiKey: CC.app.getKey(), model: ai.model,
        messages: [{ role: 'user', content: 'ping' }], maxTokens: 8, timeoutMs: 30000
      }).then(function (r) {
        if (r.ok) status.innerHTML = '<span class="ok-dot"></span>' + U.esc(t('settings.testOk', { ms: r.ms }));
        else status.innerHTML = '<span class="bad-dot"></span>' + U.esc(t('settings.testFail', { msg: r.error }));
      });
    };

    var reveal = root.querySelector('#reveal');
    if (reveal) reveal.onclick = function () { window.api.revealCorpus(); };

    var be = root.querySelector('#backup-export');
    if (be) be.onclick = function () { exportBackup(); };
    var bi = root.querySelector('#backup-import');
    if (bi) bi.onclick = function () { importBackup(root); };
    var ifile = root.querySelector('#import-file');
    if (ifile) ifile.onclick = function () { CC.importer.open(); };

    var ca = root.querySelector('#clear-all');
    if (ca) ca.onclick = function () {
      U.confirm(t('settings.clearAll'), t('settings.clearAllConfirm'), { danger: true }).then(function (ok) {
        if (!ok) return;
        S.resetAll();
        U.toast(t('settings.clearAllDone'), 'ok');
        CC.app.nav('home');
      });
    };
  }

  function exportBackup() {
    var st = S.state();
    var payload = {
      format: 'corpus-canvas',
      formatVersion: S.FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      readable: true,
      data: {
        cards: st.cards,
        maps: st.maps,
        reviews: st.reviews,
        savedQueries: st.savedQueries,
        aiActions: st.aiActions,
        templates: st.templates,
        settings: {
          lang: st.settings.lang,
          theme: st.settings.theme,
          ai: { baseUrl: st.settings.ai.baseUrl, model: st.settings.ai.model, hasKey: false, local: st.settings.ai.local }
        }
      }
    };
    window.api.exportBackup(payload).then(function (r) {
      if (r && r.ok) U.toast(t('settings.backupDone', { path: r.path }), 'ok');
      else if (r && r.error) U.toast(t('settings.backupFail', { msg: r.error }), 'bad');
    });
  }

  function importBackup(root) {
    window.api.importBackup().then(function (r) {
      if (!r || !r.ok) {
        if (r && r.error) U.toast(t('settings.backupFail', { msg: r.error }), 'bad');
        return;
      }
      var data = r.data && r.data.data ? r.data.data : r.data;
      if (!data || !Array.isArray(data.cards)) { U.toast(t('settings.backupFail', { msg: 'format' }), 'bad'); return; }
      var cards = data.cards.length, maps = (data.maps || []).length;
      U.openModal({
        title: t('settings.backupImport'),
        body: '<p class="dialog-text">' + U.esc(t('settings.importAsk', { cards: cards, maps: maps })) + '</p>',
        actions: [
          { id: 'cancel', label: t('common.cancel'), ghost: true },
          { id: 'merge', label: t('settings.importMerge'), value: 'merge' },
          { id: 'replace', label: t('settings.importReplace'), primary: true, value: 'replace' }
        ]
      }).then(function (mode) {
        if (!mode) return;
        S.createSnapshot(t('history.kind.restore') + ' · ' + U.fmtDate(Date.now(), true), true, true);
        var added = 0, updated = 0;
        S.commit('restore', t('settings.backupImport'), function () {
          var db = S.state();
          if (mode === 'replace') {
            db.cards = data.cards.map(function (c) { return Object.assign({ tags: [], langs: [], sources: [] }, c); });
            db.maps = data.maps || [];
            db.reviews = data.reviews || [];
            db.savedQueries = data.savedQueries || [];
            db.aiActions = data.aiActions || [];
            db.templates = data.templates || [];
            added = db.cards.length;
          } else {
            (data.cards || []).forEach(function (c) {
              var ex = db.cards.find(function (x) { return x.id === c.id; });
              if (ex) { Object.assign(ex, c); updated++; }
              else { db.cards.push(c); added++; }
            });
            (data.maps || []).forEach(function (m) {
              var ex = db.maps.find(function (x) { return x.id === m.id; });
              if (ex) Object.assign(ex, m);
              else db.maps.push(m);
            });
            db.reviews = db.reviews.concat(data.reviews || []);
          }
          db.settings.lastMapId = db.maps[0] ? db.maps[0].id : null;
        });
        U.toast(t('settings.importDone', { added: added, updated: updated }), 'ok');
        CC.app.nav(CC.app.view());
      });
    });
  }

  CC.settings = { mount: mount, exportBackup: exportBackup };
})();
