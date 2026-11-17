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
    var profiles = st.aiProfiles || [];
    var activeId = st.aiActiveId || (profiles[0] && profiles[0].id) || '';
    var themes = [
      { id: 'light', label: t('theme.light') },
      { id: 'dark', label: t('theme.dark') },
      { id: 'paper', label: t('theme.paper') },
      { id: 'ink', label: t('theme.ink') }
    ];

    root.innerHTML =
      '<div class="page-head"><div class="ph-left">' +
        '<h1 class="page-title"><span class="pt-ico">' + U.icon('settings', 20) + '</span>' + U.esc(t('settings.title')) + '</h1>' +
        '<p class="page-sub">' + U.esc(t('settings.subtitle')) + '</p>' +
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
            }).join('') + '</div>') +

        section('set-theme', 'palette', t('settings.theme'),
          '<p class="set-hint">' + U.esc(t('settings.themeHint')) + '</p>' +
          '<div class="theme-grid">' + themes.map(function (th) {
            return '<button class="theme-tile t-' + th.id + (st.theme === th.id ? ' active' : '') + '" data-theme="' + th.id + '">' +
              '<span class="tt-preview"><i class="tt-side"></i><i class="tt-line"></i><i class="tt-line short"></i><i class="tt-block"></i></span>' +
              '<span class="tt-label">' + U.esc(th.label) + '</span>' +
            '</button>';
          }).join('') + '</div>') +

        section('set-ai', 'sparkles', t('settings.ai'),
          '<label class="field"><span>' + U.esc(t('settings.aiProfiles')) + '</span>' +
            '<div class="key-row">' +
              '<select class="input" id="ai-profile">' + profiles.map(function (p) {
                return '<option value="' + U.esc(p.id) + '"' + (p.id === activeId ? ' selected' : '') + '>' + U.esc(p.name) + '</option>';
              }).join('') + '</select>' +
              '<button class="mini-btn" id="ai-profile-new">' + U.esc(t('settings.aiProfileNew')) + '</button>' +
              '<button class="mini-btn" id="ai-profile-rename">' + U.esc(t('settings.aiProfileRename')) + '</button>' +
              '<button class="mini-btn" id="ai-profile-delete">' + U.esc(t('settings.aiProfileDelete')) + '</button>' +
            '</div><em>' + U.esc(t('settings.aiProfileSharedKey')) + '</em></label>' +
          '<div class="ai-status-bar">' +
            '<span class="ai-dot' + (ai.baseUrl && ai.model && (ai.hasKey || ai.local) ? ' on' : '') + '"></span>' +
            '<span>' + U.esc(ai.local ? t('settings.localModel') : t('settings.aiTitle')) + '</span>' +
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
          '<div class="privacy-note">' + U.icon('shield', 15) +
            '<div>' + U.esc(t('settings.networkAi')) + ' ' + U.esc(t('settings.networkOff')) + ' ' + U.esc(t('settings.networkKey')) + '</div></div>') +

        section('set-library', 'cards', t('settings.library'),
          '<p class="set-hint">' + U.esc(t('settings.libraryHint')) + '</p>' +
          '<div class="lib-list" id="lib-list">' + U.esc(t('common.loading')) + '</div>' +
          '<div class="backup-row"><button class="btn" id="lib-new"><span>' + U.esc(t('settings.libraryNew')) + '</span></button></div>' +
          '<div class="lib-trash"><div class="ab-head"><strong>' + U.esc(t('settings.libTrash')) + '</strong>' +
            '<button class="mini-btn" id="lib-trash-refresh">' + U.esc(t('common.refresh')) + '</button></div>' +
            '<p class="set-hint small">' + U.esc(t('settings.libTrashHint')) + '</p>' +
            '<div class="lib-trash-list" id="lib-trash-list"></div></div>') +

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
            '<button class="btn" id="bundle-export">' + U.icon('download', 15) + '<span>' + U.esc(t('settings.bundleExport')) + '</span></button>' +
            '<button class="btn" id="bundle-import">' + U.icon('upload', 15) + '<span>' + U.esc(t('settings.bundleImport')) + '</span></button>' +
            '<button class="btn ghost" id="import-file">' + U.icon('upload', 15) + '<span>' + U.esc(t('import.title')) + '</span></button>' +
          '</div>' +
          '<p class="set-hint small">' + U.esc(t('settings.bundleHint')) + '</p>' +
          '<div class="export-corpus-row">' +
            '<select class="input" id="export-corpus-format">' +
              ['md', 'json', 'csv', 'opml'].map(function (f) {
                var label = f === 'md' ? 'Markdown' : f.toUpperCase();
                return '<option value="' + f + '">' + label + '</option>';
              }).join('') +
            '</select>' +
            '<button class="btn ghost" id="export-corpus">' + U.icon('download', 15) + '<span>' + U.esc(t('settings.exportCorpus')) + '</span></button>' +
          '</div>' +
          '<p class="set-hint small">' + U.esc(t('settings.exportCorpusHint')) + '</p>' +
          '<div class="auto-backup">' +
            '<div class="ab-head"><strong>' + U.esc(t('settings.autoBackup')) + '</strong>' +
              '<button class="mini-btn" id="ab-refresh">' + U.esc(t('common.refresh')) + '</button></div>' +
            '<p class="set-hint small">' + U.esc(t('settings.autoBackupHint')) + '</p>' +
            '<div class="ab-list" id="ab-list"></div>' +
          '</div>' +
          '<div class="data-paths"><div class="ab-head"><strong>' + U.esc(t('settings.dataWhere')) + '</strong></div>' +
            '<p class="set-hint small">' + U.esc(t('settings.dataWhereHint')) + '</p>' +
            '<div class="path-list" id="path-list">' + U.esc(t('common.loading')) + '</div></div>' +
          '<div class="danger-zone"><div><strong>' + U.esc(t('settings.danger')) + '</strong><p>' + U.esc(t('settings.clearAllConfirm')) + '</p></div>' +
            '<button class="btn danger sm" id="clear-all">' + U.esc(t('settings.clearAll')) + '</button></div>') +

        section('set-tags', 'tag', t('tagcenter.title'),
          '<p class="set-hint">' + U.esc(t('tagcenter.hint')) + '</p>' +
          '<div class="tc-list" id="tc-list">' + U.esc(t('common.loading')) + '</div>') +

        section('set-keys', 'keyboard', t('settings.shortcuts'),
          '<p class="set-hint">' + U.esc(t('shortcut.customTitle')) + '</p>' +
          '<div class="shortcut-grid sc-edit-grid">' +
            ['search', 'save', 'undo', 'redo', 'fullscreen', 'delete', 'escape', 'focus', 'fit', 'edit'].map(function (k) {
              return '<div class="sc-row"><span>' + U.esc(t('shortcut.act.' + k)) + '</span>' +
                '<button class="mini-btn sc-key" data-sc="' + k + '">' + U.esc(CC.app.getShortcuts()[k] || '') + '</button></div>';
            }).join('') +
            '<div class="sc-row"><span>' + U.esc(t('shortcut.act.nav')) + '</span><kbd>' + U.esc(t('shortcut.fixed')) + '</kbd></div>' +
          '</div>' +
          '<button class="btn ghost sm" id="sc-reset">' + U.esc(t('shortcut.resetAll')) + '</button>') +

        section('set-about', 'info', t('settings.about'),
          '<p class="set-hint">' + U.esc(t('settings.aboutBody')) + '</p>' +
          '<div class="about-row"><span class="about-mark">◈</span><div><strong>' + U.esc(t('app.name')) + '</strong>' +
          '<p>' + U.esc(t('app.tagline')) + ' · ' + (info.version ? U.esc(t('settings.version', { v: info.version })) : U.esc(t('settings.previewBuild'))) + '</p></div></div>') +
      '</div>';

    bind(root);
  }

  function bind(root) {
    function activeProfile() {
      var s = S.settings();
      var list = s.aiProfiles || [];
      return list.find(function (p) { return p.id === s.aiActiveId; }) || list[0] || null;
    }
    function syncAI(patch) {
      var a = S.settings().ai;
      Object.assign(a, patch);
      var p = activeProfile();
      if (p) Object.assign(p, patch);
      S.saveSoon(); S.emit();
    }
    function newProfile(name) {
      var s = S.settings();
      if (!Array.isArray(s.aiProfiles)) s.aiProfiles = [];
      var p = { id: U.uid('ai'), name: name, baseUrl: s.ai.baseUrl, model: s.ai.model, local: s.ai.local, preset: '' };
      s.aiProfiles.push(p);
      s.aiActiveId = p.id;
      S.saveSoon();
      return p;
    }
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
      zhipu: { base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.6v-flash', local: false },
      bailian: { base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', local: false },
      openrouter: { base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', local: false },
      ollama: { base: 'http://127.0.0.1:11434/v1', model: 'qwen2.5', local: true },
      lmstudio: { base: 'http://127.0.0.1:1234/v1', model: '', local: true }
    };
    var preset = root.querySelector('#ai-preset');
    if (preset) {
      var curProfile = activeProfile();
      if (curProfile && curProfile.preset) preset.value = curProfile.preset;
    }
    if (preset) preset.onchange = function () {
      var p = PRESETS[preset.value];
      if (!p) return;
      syncAI({ baseUrl: p.base, model: p.model, local: p.local });
      var ap = activeProfile();
      if (ap) { ap.preset = preset.value; S.saveSoon(); }
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
          return { label: id, onClick: function () { syncAI({ model: id }); mount(root); } };
        }));
      });
    };

    var base = root.querySelector('#ai-base');
    var model = root.querySelector('#ai-model');
    var local = root.querySelector('#ai-local');
    if (base) base.onchange = function () { syncAI({ baseUrl: base.value.trim() }); };
    if (model) model.onchange = function () { syncAI({ model: model.value.trim() }); };
    if (local) local.onchange = function () { syncAI({ local: local.checked }); };

    var keyInput = root.querySelector('#ai-key');
    if (keyInput) {
      var saveKey = U.debounce(function (value) {
        window.api.setKey(value).then(function (r) {
          S.settings().ai.hasKey = !!value;
          if (CC.app.setKey) CC.app.setKey(value);
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
        if (CC.app.setKey) CC.app.setKey('');
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

    /* ---- AI profiles ---- */
    var profSel = root.querySelector('#ai-profile');
    if (profSel) profSel.onchange = function () {
      var s = S.settings();
      s.aiActiveId = profSel.value;
      var p = activeProfile();
      if (p) Object.assign(s.ai, { baseUrl: p.baseUrl, model: p.model, local: p.local });
      S.saveSoon(); S.emit();
      mount(root);
    };
    var pn = root.querySelector('#ai-profile-new');
    if (pn) pn.onclick = function () {
      U.prompt(t('settings.aiProfileNew'), '', { placeholder: t('common.name') }).then(function (name) {
        if (!name) return;
        newProfile(String(name).trim());
        mount(root);
      });
    };
    var pr = root.querySelector('#ai-profile-rename');
    if (pr) pr.onclick = function () {
      var p = activeProfile();
      if (!p) return;
      U.prompt(t('settings.aiProfileRename'), p.name, { placeholder: t('common.name') }).then(function (name) {
        if (!name) return;
        p.name = String(name).trim();
        S.saveSoon();
        mount(root);
      });
    };
    var pd = root.querySelector('#ai-profile-delete');
    if (pd) pd.onclick = function () {
      var s = S.settings();
      if ((s.aiProfiles || []).length < 2) { U.toast(t('settings.aiProfileDeleteConfirm'), 'bad'); return; }
      U.confirm(t('settings.aiProfileDelete'), t('settings.aiProfileDeleteConfirm'), { danger: true }).then(function (ok) {
        if (!ok) return;
        var list = s.aiProfiles;
        var idx = list.findIndex(function (p) { return p.id === s.aiActiveId; });
        if (idx < 0) return;
        list.splice(idx, 1);
        s.aiActiveId = list[0].id;
        Object.assign(s.ai, { baseUrl: list[0].baseUrl, model: list[0].model, local: list[0].local });
        S.saveSoon(); S.emit();
        mount(root);
      });
    };

    /* ---- libraries ---- */
    function renderLibraries() {
      var host = root.querySelector('#lib-list');
      if (!host || !window.api || !window.api.listLibraries) return;
      window.api.listLibraries().then(function (r) {
        if (!r || !r.ok) { host.innerHTML = ''; return; }
        host.innerHTML = r.items.map(function (l) {
          var on = l.id === r.activeId;
          return '<div class="lib-row' + (on ? ' active' : '') + '">' +
            '<div class="lib-main"><strong>' + U.esc(l.name) + '</strong>' +
              (on ? ' <span class="lib-badge">' + U.esc(t('settings.libraryActive')) + '</span>' : '') +
              '<span class="lib-count">' + U.esc(t('settings.libraryCards', { n: l.cards || 0 })) + '</span></div>' +
            '<div class="lib-acts">' +
              (on ? '' : '<button class="mini-btn" data-lib-switch="' + U.esc(l.id) + '">' + U.esc(t('settings.librarySwitch')) + '</button>') +
              '<button class="mini-btn" data-lib-rename="' + U.esc(l.id) + '">' + U.esc(t('settings.libraryRename')) + '</button>' +
              (l.id === 'default' ? '' : '<button class="mini-btn danger" data-lib-delete="' + U.esc(l.id) + '">' + U.esc(t('settings.libraryDelete')) + '</button>') +
            '</div></div>';
        }).join('');
        host.querySelectorAll('[data-lib-switch]').forEach(function (b) {
          b.onclick = function () { CC.app.switchLibrary(b.getAttribute('data-lib-switch')); };
        });
        host.querySelectorAll('[data-lib-rename]').forEach(function (b) {
          b.onclick = function () {
            var id = b.getAttribute('data-lib-rename');
            var item = (r.items || []).find(function (x) { return x.id === id; });
            U.prompt(t('settings.libraryRename'), item ? item.name : '', { placeholder: t('common.name') }).then(function (name) {
              if (!name || !window.api.renameLibrary) return;
              window.api.renameLibrary({ id: id, name: String(name).trim() }).then(renderLibraries);
            });
          };
        });
        host.querySelectorAll('[data-lib-delete]').forEach(function (b) {
          b.onclick = function () {
            var id = b.getAttribute('data-lib-delete');
            U.confirm(t('settings.libraryDelete'), t('settings.libraryDeleteConfirm'), { danger: true }).then(function (ok) {
              if (!ok || !window.api.deleteLibrary) return;
              window.api.deleteLibrary({ id: id }).then(function (res) {
                if (res && res.switched) { if (CC.app.suppressFlush) CC.app.suppressFlush(); location.reload(); return; }
                renderLibraries();
              });
            });
          };
        });
      });
    }
    renderLibraries();
    var ln = root.querySelector('#lib-new');
    if (ln) ln.onclick = function () {
      U.prompt(t('settings.libraryNew'), '', { placeholder: t('common.name') }).then(function (name) {
        if (!name || !window.api.createLibrary) return;
        window.api.createLibrary({ name: String(name).trim() }).then(function (res) {
          if (res && res.ok) renderLibraries();
        });
      });
    };

    /* ---- shortcut capture ---- */
    function recordShortcut(action, btn) {
      var old = btn.textContent;
      btn.textContent = t('shortcut.recording');
      btn.classList.add('recording');
      function handler(ev) {
        ev.preventDefault(); ev.stopPropagation();
        window.removeEventListener('keydown', handler, true);
        btn.classList.remove('recording');
        if (ev.key === 'Escape') { btn.textContent = old; return; }
        var token = CC.app.keyToken ? CC.app.keyToken(ev) : '';
        if (!token) { btn.textContent = old; return; }
        var conflict = null, sc = CC.app.getShortcuts();
        Object.keys(sc).forEach(function (a) { if (a !== action && sc[a] === token) conflict = a; });
        if (/^[1-9]$/.test(token)) conflict = conflict || 'nav';
        if (conflict) { U.toast(t('shortcut.conflict'), 'bad'); btn.textContent = old; return; }
        CC.app.setShortcut(action, token);
        btn.textContent = token;
      }
      window.addEventListener('keydown', handler, true);
    }
    root.querySelectorAll('[data-sc]').forEach(function (b) {
      b.onclick = function () { recordShortcut(b.getAttribute('data-sc'), b); };
    });
    var sr = root.querySelector('#sc-reset');
    if (sr) sr.onclick = function () { CC.app.resetShortcuts(); mount(root); };

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
    var bxe = root.querySelector('#bundle-export');
    if (bxe) bxe.onclick = function () { exportBundle(); };
    var bxi = root.querySelector('#bundle-import');
    if (bxi) bxi.onclick = function () { importBundle(); };
    var ifile = root.querySelector('#import-file');
    if (ifile) ifile.onclick = function () { CC.importer.open(); };
    var ec = root.querySelector('#export-corpus');
    if (ec) ec.onclick = function () {
      var sel = root.querySelector('#export-corpus-format');
      exportCorpus(sel ? sel.value : 'md');
    };

    function renderTagCenter() {
      var host = root.querySelector('#tc-list');
      if (host && CC.tagcenter) CC.tagcenter.render(host);
    }
    renderTagCenter();

    function renderDataPaths() {
      var host = root.querySelector('#path-list');
      if (!host || !window.api || !window.api.dataPaths) return;
      window.api.dataPaths().then(function (r) {
        if (!r || r.ok === false) {
          host.innerHTML = '<div class="mini-empty">' + U.esc(t('settings.dataPathsFail')) + '</div>';
          return;
        }
        var list = r.paths || [];
        if (!list.length) { host.innerHTML = '<div class="mini-empty">' + U.esc(t('common.empty')) + '</div>'; return; }
        host.innerHTML = list.map(function (p) {
          return '<div class="path-row"><span class="path-label">' + U.esc(t('settings.path.' + p.key) || p.label) + '</span>' +
            '<code class="path-val">' + U.esc(p.path || '') + '</code>' +
            '<button class="mini-btn" data-open-dir="' + U.esc(p.key) + '">' + U.icon('external', 12) + U.esc(t('settings.openFolder')) + '</button></div>';
        }).join('');
        host.querySelectorAll('[data-open-dir]').forEach(function (b) {
          b.onclick = function () {
            var key = b.getAttribute('data-open-dir');
            window.api.openDir(key).then(function (res) {
              if (res && res.ok === false) U.toast(t('settings.openFail'), 'bad');
            });
          };
        });
      }).catch(function () {
        host.innerHTML = '<div class="mini-empty">' + U.esc(t('settings.dataPathsFail')) + '</div>';
      });
    }
    renderDataPaths();

    function renderLibTrash() {
      var host = root.querySelector('#lib-trash-list');
      if (!host || !window.api || !window.api.listTrashLibraries) return;
      window.api.listTrashLibraries().then(function (r) {
        var items = (r && r.items) || [];
        if (!items.length) { host.innerHTML = '<div class="mini-empty">' + U.esc(t('settings.libTrashEmpty')) + '</div>'; return; }
        host.innerHTML = items.map(function (it) {
          return '<div class="lib-row"><div class="lib-main"><strong>' + U.esc(it.id) + '</strong>' +
            '<span class="lib-count">' + U.esc(U.fmtDate(it.at, true)) + '</span></div>' +
            '<button class="mini-btn" data-trash-restore="' + U.esc(it.trashName) + '">' + U.esc(t('settings.libRestore')) + '</button></div>';
        }).join('');
        host.querySelectorAll('[data-trash-restore]').forEach(function (b) {
          b.onclick = function () {
            var name = b.getAttribute('data-trash-restore');
            window.api.restoreTrashLibrary(name).then(function (res) {
              if (res && res.ok) { U.toast(t('settings.libRestored'), 'ok'); renderLibTrash(); renderLibraries(); }
              else if (res && res.error === 'exists') U.toast(t('settings.libExists'), 'bad');
              else U.toast(t('settings.libRestoreFail'), 'bad');
            });
          };
        });
      });
    }
    renderLibTrash();
    var ltr = root.querySelector('#lib-trash-refresh');
    if (ltr) ltr.onclick = renderLibTrash;

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
            '<span class="ab-cards">' + U.esc(t('settings.backupCards', { n: b.cards || 0 })) + '</span>' +
            '<button class="mini-btn" data-restore="' + U.esc(b.name) + '">' + U.esc(t('settings.restore')) + '</button>' +
            '</div>';
        }).join('');
        host.querySelectorAll('[data-restore]').forEach(function (btn) {
          btn.onclick = function () {
            var name = btn.getAttribute('data-restore');
            U.confirm(t('settings.restore'), t('settings.restoreConfirm', { name: name })).then(function (ok) {
              if (!ok) return;
              /* always leave a way back before an overwrite */
              var proceed = function () {
                window.api.restoreBackup(name).then(function (res) {
                  if (res && res.ok) {
                    U.toast(t('settings.restored'), 'ok');
                    if (CC.app.suppressFlush) CC.app.suppressFlush();
                    setTimeout(function () { location.reload(); }, 600);
                  } else {
                    U.toast(t('settings.backupInvalid'), 'bad');
                  }
                });
              };
              if (window.api.snapshotBackup) {
                window.api.snapshotBackup().then(function () { proceed(); });
              } else { proceed(); }
            });
          };
        });
      });
    }
    renderBackups();
    var abRefresh = root.querySelector('#ab-refresh');
    if (abRefresh) abRefresh.onclick = renderBackups;
    S.onChange(function () { if (document.body.contains(root)) renderTagCenter(); });

    var ca = root.querySelector('#clear-all');
    if (ca) ca.onclick = function () {
      U.confirm(t('settings.clearAll'), t('settings.clearAllConfirm'), { danger: true }).then(function (ok) {
        if (!ok) return;
        var clear = function () {
          S.resetAll();
          U.toast(t('settings.clearAllDone'), 'ok');
          CC.app.nav('home');
        };
        if (window.api.snapshotBackup) {
          window.api.snapshotBackup().then(function (r) {
            if (r && r.ok) U.toast(t('settings.safetySnapshot'), 'ok');
            clear();
          });
        } else { clear(); }
      });
    };
  }

  /* Export the whole corpus as one readable file. Four formats share the
     same grouping: every map in order, then cards not on any map. No settings
     and no API key is ever written. */
  function exportCorpus(fmt) {
    fmt = fmt || 'md';
    var db = S.state();
    var used = {}, groups = [];
    (db.maps || []).forEach(function (m) {
      var cs = S.mapCards(m);
      if (!cs.length) return;
      cs.forEach(function (c) { used[c.id] = 1; });
      groups.push({ name: m.name, cards: cs });
    });
    var rest = S.cards().filter(function (c) { return !used[c.id]; });
    if (rest.length) groups.push({ name: t('settings.exportCorpusOrphans'), cards: rest });

    var text = '', suggested = 'corpus-all.' + fmt;
    if (fmt === 'md') {
      var lines = ['# ' + t('app.name') + ' · ' + t('settings.exportCorpus'), '',
        '> ' + t('settings.exportCorpusHint'), ''];
      groups.forEach(function (g) {
        lines.push('## ' + g.name, '');
        g.cards.forEach(function (c) { pushCorpusCard(lines, c); });
        lines.push('');
      });
      text = lines.join('\n');
    } else if (fmt === 'json') {
      text = JSON.stringify({
        app: 'Corpus Canvas',
        exportedAt: new Date().toISOString(),
        groups: groups.map(function (g) {
          return {
            name: g.name,
            cards: g.cards.map(function (c) {
              return {
                id: c.id, title: c.title, body: c.body, summary: c.summary,
                note: c.note, category: c.category, tags: c.tags || []
              };
            })
          };
        })
      }, null, 2);
    } else if (fmt === 'csv') {
      function q(v) {
        return '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
      }
      var rows = [['group', 'title', 'body', 'summary', 'note', 'category', 'tags'].map(q).join(',')];
      groups.forEach(function (g) {
        g.cards.forEach(function (c) {
          rows.push([g.name, c.title, c.body, c.summary, c.note, c.category, (c.tags || []).join(' ')].map(q).join(','));
        });
      });
      text = '\ufeff' + rows.join('\r\n');   /* BOM: Excel reads Chinese correctly */
    } else if (fmt === 'opml') {
      function ex(s) {
        return String(s == null ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
      var ol = ['<?xml version="1.0" encoding="UTF-8"?>',
        '<opml version="2.0"><head><title>' + ex(t('app.name')) + '</title></head><body>'];
      groups.forEach(function (g) {
        ol.push('  <outline text="' + ex(g.name) + '">');
        g.cards.forEach(function (c) {
          var attrs = ' text="' + ex(c.title || t('common.untitled')) + '"';
          if (c.note) attrs += ' _note="' + ex(String(c.note).replace(/\r?\n/g, ' ')) + '"';
          ol.push('    <outline' + attrs + '/>');
        });
        ol.push('  </outline>');
      });
      ol.push('</body></opml>');
      text = ol.join('\n');
    }
    if (!text || !window.api || !window.api.saveText) return;
    window.api.saveText({ text: text, suggested: suggested, ext: fmt }).then(function (r) {
      if (r && r.ok) U.toast(t('map.exportDone', { path: r.path }), 'ok');
      else if (r && !r.canceled && r.error) U.toast(t('map.exportFail', { msg: r.error }), 'bad');
    });
  }

  function pushCorpusCard(lines, c) {
    lines.push('- **' + (c.title || t('common.untitled')) + '**');
    if (c.body) String(c.body).split(/\r?\n/).forEach(function (l) { lines.push('    ' + l); });
    if (c.summary) lines.push('    > ' + c.summary);
    if (c.note) lines.push('    > ' + String(c.note).replace(/\r?\n/g, ' '));
    if (c.category) lines.push('    · ' + c.category);
    if ((c.tags || []).length) lines.push('    ' + c.tags.map(function (x) { return '#' + x; }).join(' '));
  }

  function buildBackupPayload() {
    var st = S.state();
    return {
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
          ai: { baseUrl: st.settings.ai.baseUrl, model: st.settings.ai.model, hasKey: false, local: st.settings.ai.local },
          shortcuts: st.settings.shortcuts || {},
          aiProfiles: st.settings.aiProfiles || [],
          aiActiveId: st.settings.aiActiveId || ''
        }
      }
    };
  }

  function exportBackup() {
    window.api.exportBackup(buildBackupPayload()).then(function (r) {
      if (r && r.ok) U.toast(t('settings.backupDone', { path: r.path }), 'ok');
      else if (r && r.error) U.toast(t('settings.backupFail', { msg: r.error }), 'bad');
    });
  }

  /* Self-contained bundle: corpus + attachment bytes in one .wefz file. */
  function exportBundle() {
    if (!window.api || !window.api.exportBundle) return;
    window.api.exportBundle(buildBackupPayload()).then(function (r) {
      if (r && r.ok) U.toast(t('settings.bundleDone', { path: r.path, n: r.attachments || 0 }), 'ok');
      else if (r && r.error) U.toast(t('settings.backupFail', { msg: r.error }), 'bad');
    });
  }

  function importBundle() {
    if (!window.api || !window.api.importBundle) return;
    window.api.importBundle().then(function (r) {
      if (!r || !r.ok) {
        if (r && r.error) U.toast(t('settings.backupFail', { msg: r.error }), 'bad');
        return;
      }
      importBackupData(r.data);
      /* refresh attachment thumbnail cache after bytes were restored */
      if (CC.attach && CC.attach.clear) CC.attach.clear();
      if (r.attachments) U.toast(t('settings.bundleRestored', { n: r.attachments }), 'ok');
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
        /* backups carry language/theme/AI preferences (never the key).
           Only a full replace applies them, so a merge cannot silently
           override the current library's shortcuts and AI profiles. */
        if (data.settings && mode === 'replace') {
          var set = S.settings();
          if (data.settings.lang) set.lang = data.settings.lang;
          if (data.settings.theme) set.theme = data.settings.theme;
          var ai = data.settings.ai;
          if (ai) {
            if (ai.baseUrl) set.ai.baseUrl = ai.baseUrl;
            if (ai.model) set.ai.model = ai.model;
            if (typeof ai.local === 'boolean') set.ai.local = ai.local;
          }
          if (data.settings.shortcuts && typeof data.settings.shortcuts === 'object') {
            set.shortcuts = Object.assign({}, data.settings.shortcuts);
          }
          if (Array.isArray(data.settings.aiProfiles) && data.settings.aiProfiles.length) {
            set.aiProfiles = data.settings.aiProfiles.map(function (p) { return Object.assign({}, p); });
            set.aiActiveId = data.settings.aiActiveId || set.aiProfiles[0].id;
            var ap = set.aiProfiles.find(function (p) { return p.id === set.aiActiveId; });
            if (ap) { set.ai.baseUrl = ap.baseUrl; set.ai.model = ap.model; set.ai.local = ap.local; }
          }
        }
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
            if (ex) {
              /* keep the newer side: only overwrite when the imported card
                 is newer, so an older backup cannot clobber local edits */
              var localAt = Number(ex.updatedAt || ex.createdAt || 0);
              var incomingAt = Number(c.updatedAt || c.createdAt || 0);
              if (incomingAt >= localAt) { Object.assign(ex, c); updated++; }
            }
            else { db.cards.push(c); added++; }
          });
          (data.maps || []).forEach(function (m) {
            var ex = db.maps.find(function (x) { return x.id === m.id; });
            if (ex) {
              var lm = Number(ex.updatedAt || 0), im = Number(m.updatedAt || 0);
              if (im >= lm) Object.assign(ex, m);
            }
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
      /* A plain .wef carries attachment metadata but not the bytes; tell the
         user honestly how many files are missing on this machine. */
      if (window.api.checkAttachments) {
        var ids = [];
        S.cards().forEach(function (c) {
          (c.attachments || []).forEach(function (a) { if (a && a.id) ids.push(a.id); });
        });
        if (ids.length) {
          window.api.checkAttachments(ids).then(function (r) {
            if (r && r.ok && r.missing && r.missing.length) {
              U.toast(t('settings.attachMissing', { n: r.missing.length }), 'bad');
            }
          });
        }
      }
      if (data.settings && mode === 'replace') {
        if (data.settings.lang) { CC.i18n.setLang(data.settings.lang); CC.i18n.apply(document); }
        if (data.settings.theme && CC.app.setTheme) CC.app.setTheme(data.settings.theme);
      }
      /* Keys are device-level and never travel with a backup. Tell the user
         clearly instead of letting the AI button silently go grey. */
      var hasKey = CC.app.getKey && CC.app.getKey();
      if (!hasKey && !S.settings().ai.local && window.api.getKey) {
        window.api.getKey().then(function (k) {
          if (!k || !k.key) U.toast(t('settings.keyNotMigrated'), 'bad');
        });
      }
      CC.app.nav(CC.app.view());
    });
  }

  CC.settings = { mount: mount, exportBackup: exportBackup, importBackupData: importBackupData };
})();
