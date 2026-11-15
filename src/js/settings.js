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
          '<label class="field"><span>' + U.esc(t('settings.preset')) + '</span>' +
            '<select class="input" id="ai-preset">' +
              '<option value="">' + U.esc(t('settings.presetCustom')) + '</option>' +
              '<option value="openai">OpenAI</option>' +
              '<option value="deepseek">DeepSeek</option>' +
              '<option value="moonshot">Moonshot / Kimi</option>' +
              '<option value="zhipu">智谱 / Zhipu</option>' +
              '<option value="bailian">阿里百炼 / Bailian</option>' +
              '<option value="openrouter">OpenRouter</option>' +
              '<option value="ollama">Ollama (local)</option>' +
              '<option value="lmstudio">LM Studio (local)</option>' +
            '</select>' +
            '<em>' + U.esc(t('settings.presetHint')) + '</em></label>' +
          '<div class="form-grid">' +
            '<label class="field"><span>' + U.esc(t('settings.baseUrl')) + '</span>' +
              '<input class="input" id="ai-base" value="' + U.esc(ai.baseUrl) + '" placeholder="https://api.openai.com/v1">' +
              '<em>' + U.esc(t('settings.baseUrlHint')) + '</em></label>' +
            '<label class="field"><span>' + U.esc(t('settings.model')) + '</span>' +
              '<div class="key-row"><input class="input" id="ai-model" value="' + U.esc(ai.model) + '" placeholder="gpt-4o-mini">' +
              '<button class="mini-btn" id="ai-models">' + U.esc(t('settings.fetchModels')) + '</button></div></label>' +
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
          '<p class="set-hint small">' + U.esc(t('settings.privacyFixed')) + '</p>' +
          '<div class="net-list" role="note">' +
            '<div class="net-row on" aria-disabled="true" title="' + U.esc(t('settings.privacyFixed')) + '">' + U.icon('sparkles', 15) + '<div><strong>' + U.esc(t('settings.network')) + '</strong><p>' + U.esc(t('settings.networkAi')) + '</p></div><span class="net-tag">' + U.esc(t('common.on')) + '</span></div>' +
            '<div class="net-row" aria-disabled="true" title="' + U.esc(t('settings.privacyFixed')) + '">' + U.icon('folder', 15) + '<div><strong>' + U.esc(t('settings.data')) + '</strong><p>' + U.esc(t('settings.networkOff')) + '</p></div><span class="net-tag off">' + U.esc(t('common.off')) + '</span></div>' +
            '<div class="net-row" aria-disabled="true" title="' + U.esc(t('settings.privacyFixed')) + '">' + U.icon('key', 15) + '<div><strong>' + U.esc(t('settings.apiKey')) + '</strong><p>' + U.esc(t('settings.networkKey')) + '</p></div><span class="net-tag off">' + U.esc(t('common.off')) + '</span></div>' +
          '</div>') +

        section('set-data', 'folder', t('settings.data'),
          '<div class="kv-row"><span class="kv-key">' + U.esc(t('settings.dataPath')) + '</span>' +
            '<code class="kv-val">' + U.esc(info.corpusPath || '') + '</code>' +
            '<button class="mini-btn" id="reveal">' + U.icon('external', 12) + U.esc(t('settings.dataReveal')) + '</button></div>' +
          '<div class="kv-row"><span class="kv-key">' + U.esc(t('settings.storage')) + '</span>' +
            '<span class="kv-val" id="storage-mode">' + U.esc(t('common.loading')) + '</span></div>' +
          '<div class="kv-row"><span class="kv-key">' + U.esc(t('settings.format')) + '</span>' +
            '<span class="kv-val">' + U.esc(t('settings.formatBody', { version: S.FORMAT_VERSION })) + '</span></div>' +
          '<div class="backup-row">' +
            '<button class="btn" id="backup-export">' + U.icon('download', 15) + '<span>' + U.esc(t('settings.backupExport')) + '</span></button>' +
            '<button class="btn" id="backup-import">' + U.icon('upload', 15) + '<span>' + U.esc(t('settings.backupImport')) + '</span></button>' +
            '<button class="btn ghost" id="import-file">' + U.icon('upload', 15) + '<span>' + U.esc(t('import.title')) + '</span></button>' +
          '</div>' +
          '<div class="auto-backup">' +
            '<div class="ab-head"><strong>' + U.esc(t('settings.autoBackup')) + '</strong>' +
              '<button class="mini-btn" id="ab-refresh">' + U.esc(t('common.refresh')) + '</button></div>' +
            '<p class="set-hint small">' + U.esc(t('settings.autoBackupHint')) + '</p>' +
            '<div class="ab-list" id="ab-list"></div>' +
          '</div>' +
          '<div class="danger-zone"><div><strong>' + U.esc(t('settings.danger')) + '</strong><p>' + U.esc(t('settings.clearAllConfirm')) + '</p></div>' +
            '<button class="btn danger sm" id="clear-all">' + U.esc(t('settings.clearAll')) + '</button></div>') +

        section('set-keys', 'keyboard', t('settings.shortcuts'),
          '<div class="shortcut-grid">' +
            ['search', 'save', 'undo', 'delete', 'escape', 'focus', 'fit', 'edit', 'nav'].map(function (k) {
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

    var PRESETS = {
      openai: { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', local: false },
      deepseek: { base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', local: false },
      moonshot: { base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', local: false },
      zhipu: { base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', local: false },
      bailian: { base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', local: false },
      openrouter: { base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', local: false },
      ollama: { base: 'http://127.0.0.1:11434/v1', model: 'qwen2.5', local: true },
      lmstudio: { base: 'http://127.0.0.1:1234/v1', model: '', local: true }
    };
    var preset = root.querySelector('#ai-preset');
    if (preset) preset.onchange = function () {
      var p = PRESETS[preset.value];
      if (!p) return;
      var a = S.settings().ai;
      a.baseUrl = p.base; a.model = p.model; a.local = p.local;
      S.saveSoon(); S.emit();
      mount(root);
    };
    var modelsBtn = root.querySelector('#ai-models');
    if (modelsBtn) modelsBtn.onclick = function () {
      var a = S.settings().ai;
      modelsBtn.disabled = true;
      window.api.listModels({ baseUrl: a.baseUrl, apiKey: CC.app.getKey() }).then(function (r) {
        modelsBtn.disabled = false;
        if (!r || !r.ok || !r.models || !r.models.length) { U.toast(t('settings.modelsFail'), 'bad'); return; }
        var rect = modelsBtn.getBoundingClientRect();
        U.showMenu(rect.left, rect.bottom + 4, r.models.slice(0, 80).map(function (id) {
          return { label: id, onClick: function () { S.settings().ai.model = id; S.saveSoon(); S.emit(); mount(root); } };
        }));
      });
    };

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

    var sm = root.querySelector('#storage-mode');
    if (sm && window.api.corpusStats) {
      window.api.corpusStats().then(function (r) {
        if (!r || !r.ok) { sm.textContent = t('settings.storageSingle'); return; }
        var mode = r.sharded ? t('settings.storageSharded', { n: r.shards }) : t('settings.storageSingle');
        sm.textContent = mode + ' · ' + t('settings.storageCards', { n: r.cards });
      }).catch(function () { sm.textContent = t('settings.storageSingle'); });
    }

    var be = root.querySelector('#backup-export');
    if (be) be.onclick = function () { exportBackup(); };
    var bi = root.querySelector('#backup-import');
    if (bi) bi.onclick = function () { importBackup(); };
    var ifile = root.querySelector('#import-file');
    if (ifile) ifile.onclick = function () { CC.importer.open(); };

    function renderBackups() {
      var host = root.querySelector('#ab-list');
      if (!host || !window.api || !window.api.listBackups) return;
      window.api.listBackups().then(function (r) {
        if (!r || !r.ok || !r.items || !r.items.length) {
          host.innerHTML = '<div class="mini-empty">' + U.esc(t('settings.noBackups')) + '</div>';
          return;
        }
        host.innerHTML = r.items.map(function (b) {
          return '<div class="ab-row">' +
            '<span class="ab-time">' + U.esc(U.fmtDate(b.at, true)) + '</span>' +
            '<span class="ab-size">' + Math.max(1, Math.round(b.size / 1024)) + ' KB</span>' +
            '<button class="mini-btn" data-restore="' + U.esc(b.name) + '">' + U.esc(t('settings.restore')) + '</button>' +
            '</div>';
        }).join('');
        host.querySelectorAll('[data-restore]').forEach(function (btn) {
          btn.onclick = function () {
            var name = btn.getAttribute('data-restore');
            U.confirm(t('settings.restore'), t('settings.restoreConfirm', { name: name })).then(function (ok) {
              if (!ok) return;
              window.api.restoreBackup(name).then(function (res) {
                if (res && res.ok) {
                  U.toast(t('settings.restored'), 'ok');
                  setTimeout(function () { location.reload(); }, 600);
                } else {
                  U.toast(t('settings.backupInvalid'), 'bad');
                }
              });
            });
          };
        });
      });
    }
    renderBackups();
    var abRefresh = root.querySelector('#ab-refresh');
    if (abRefresh) abRefresh.onclick = renderBackups;

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

  function stableKey(x) {
    if (x && x.id != null) return 'id:' + x.id;
    try { return 'json:' + JSON.stringify(x); } catch (e) { return 'json:' + String(x); }
  }

  function mergeUnique(base, extra) {
    var out = (base || []).slice();
    var seen = {};
    out.forEach(function (x) { seen[stableKey(x)] = 1; });
    (extra || []).forEach(function (x) {
      var k = stableKey(x);
      if (!seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  }

  function importBackup() {
    window.api.importBackup().then(function (r) {
      if (!r || !r.ok) {
        if (r && r.error) U.toast(t('settings.backupFail', { msg: r.error }), 'bad');
        return;
      }
      importBackupData(r.data);
    });
  }

  /* Also used when a .wef backup is dropped onto the window. */
  function importBackupData(payload) {
    if (payload && payload.formatVersion && Number(payload.formatVersion) > S.FORMAT_VERSION) {
      U.toast(t('settings.backupFail', { msg: 'version' }), 'bad');
      return;
    }
    var data = payload && payload.data ? payload.data : payload;
    if (!data || !Array.isArray(data.cards)) { U.toast(t('settings.backupFail', { msg: 'format' }), 'bad'); return; }
    applyImportedData(data);
  }

  function applyImportedData(data) {
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
          db.reviews = mergeUnique(db.reviews, data.reviews);
          db.savedQueries = mergeUnique(db.savedQueries, data.savedQueries);
          db.aiActions = mergeUnique(db.aiActions, data.aiActions);
          db.templates = mergeUnique(db.templates, data.templates);
        }
        db.settings.lastMapId = db.maps[0] ? db.maps[0].id : null;
      });
      U.toast(t('settings.importDone', { added: added, updated: updated }), 'ok');
      CC.app.nav(CC.app.view());
    });
  }

  CC.settings = { mount: mount, exportBackup: exportBackup, importBackupData: importBackupData };
})();
