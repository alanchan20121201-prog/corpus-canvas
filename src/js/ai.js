/* AI assist: draft / organize / summarize / review, always draft-first */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  var EDGE_TYPES = ['hierarchy', 'synonym', 'antonym', 'cause', 'example', 'contrast', 'reference', 'custom'];

  function ai() { return S.settings().ai || {}; }
  function ready() { var a = ai(); return !!(a.baseUrl && a.model && (a.hasKey || a.local)); }
  function key() { return (CC.app && CC.app.getKey()) || ''; }

  function chat(messages, opts) {
    opts = opts || {};
    var a = ai();
    var reqId = U.uid('req');
    if (state) {
      state.requestId = reqId;
      state.stream = '';
      state.streamOn = !!window.api.onChatChunk;
      state.cancelled = false;
    }
    var unbind = null;
    if (state && state.streamOn) {
      unbind = window.api.onChatChunk(function (d) {
        if (!state || !d || d.id !== reqId) return;
        state.stream += d.delta;
        if (state.renderStream) state.renderStream();
      });
    }
    var done = function (r) { if (unbind) unbind(); return r; };
    var fail = function (e) { if (unbind) unbind(); throw e; };
    return window.api.chat({
      baseUrl: a.baseUrl,
      apiKey: key(),
      model: a.model,
      messages: messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      stream: !!(state && state.streamOn),
      requestId: reqId,
      kind: state ? state.kind : '',
      scope: state ? state.scope : ''
    }).then(done, fail);
  }

  /* ------------------------------------------------------------------ */
  /* prompt helpers                                                     */
  /* ------------------------------------------------------------------ */

  function ctxCards(scope) {
    var ids = [];
    if (scope === 'selection') ids = CC.graph.selection();
    else if (scope === 'map') {
      var m = S.currentMap();
      ids = m ? S.mapCards(m).map(function (c) { return c.id; }) : [];
    } else {
      ids = S.cards().map(function (c) { return c.id; });
    }
    return ids.map(S.card).filter(Boolean).slice(0, 120);
  }

  function cardContext(list) {
    var m = S.currentMap();
    return list.map(function (c) {
      return {
        id: c.id,
        title: c.title,
        body: (c.body || '').slice(0, 600),
        note: (c.note || '').slice(0, 300),
        tags: c.tags,
        langs: c.langs,
        parent: m ? (S.parentOf(m, c.id) || '') : ''
      };
    });
  }

  function extractJson(text) {
    var s = String(text || '').trim();
    s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    var start = s.indexOf('{');
    var end = s.lastIndexOf('}');
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    try { return JSON.parse(s); } catch (e) { /* fall through */ }
    return null;
  }

  function parseLooseDraft(text) {
    var lines = String(text || '').split(/\r?\n/);
    var nodes = [];
    var stack = [];
    lines.forEach(function (line) {
      var m = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/.exec(line);
      if (!m) return;
      var indent = m[1].replace(/\t/g, '    ').length;
      var title = m[3].replace(/\*\*/g, '').trim();
      if (!title) return;
      var depth = Math.floor(indent / 2);
      while (stack.length > depth) stack.pop();
      var parent = stack.length ? stack[stack.length - 1].tempId : null;
      var node = { tempId: 'n' + nodes.length, title: title.slice(0, 40), body: '', parent: parent };
      nodes.push(node);
      stack.push(node);
    });
    return nodes.length ? { nodes: nodes, edges: [] } : null;
  }

  /* ------------------------------------------------------------------ */
  /* modal shell                                                        */
  /* ------------------------------------------------------------------ */

  var state = null;
  var dock = null;   /* { host, resolve, returnFocus } */

  function isDockOpen() { return !!dock; }

  function closeDock(result) {
    if (!dock) return false;
    var d = dock;
    dock = null;                                  /* clear first to avoid re-entry */
    if (state && state.busy && state.requestId && window.api.cancelChat) {
      window.api.cancelChat(state.requestId);
    }
    state = null;
    window.removeEventListener('keydown', onDockKey);
    var host = d.host;
    host.classList.remove('open');
    document.body.classList.remove('with-ai-dock');
    setTimeout(function () { if (!dock) host.hidden = true; }, 200);
    if (d.resolve) d.resolve(result === undefined ? null : result);
    if (d.returnFocus && document.contains(d.returnFocus)) d.returnFocus.focus();
    return true;
  }

  function onDockKey(e) {
    if (e.key !== 'Escape' || !dock) return;
    if (document.querySelector('.overlay')) return;   /* child dialog wins */
    if (CC.present && CC.present.isOpen()) return;
    if (CC.inspector && CC.inspector.isOpen()) return;
    e.stopPropagation();
    closeDock();
  }

  function open(kind) {
    if (!ready()) {
      U.openModal({
        title: t('ai.keyMissing'),
        body: '<p class="dialog-text">' + U.esc(t('ai.keyMissingHint')) + '</p>',
        actions: [
          { id: 'close', label: t('common.cancel'), ghost: true },
          { id: 'set', label: t('ai.openSettings'), primary: true, value: 'settings' }
        ]
      }).then(function (r) { if (r === 'settings') CC.app.nav('settings'); });
      return;
    }
    if (isDockOpen()) closeDock();
    state = {
      kind: kind || 'draft',
      scope: kind === 'draft' ? 'text' : (CC.graph.selection().length ? 'selection' : 'map'),
      selected: {},
      busy: false,
      result: null,
      raw: '',
      usage: null,
      elapsed: 0,
      error: '',
      target: 'current'
    };

    var body = document.createElement('div');
    body.className = 'ai-panel';
    body.innerHTML =
      '<div class="ai-tabs" id="ai-tabs">' +
        ['draft', 'organize', 'summarize', 'review'].map(function (k) {
          return '<button class="ai-tab' + (k === state.kind ? ' active' : '') + '" data-kind="' + k + '">' +
            U.icon(k === 'draft' ? 'sparkles' : k === 'organize' ? 'layout' : k === 'summarize' ? 'note' : 'check', 14) +
            '<span>' + U.esc(t('ai.' + k)) + '</span></button>';
        }).join('') +
      '</div>' +
      '<div class="ai-body" id="ai-body"></div>';

    var host = document.getElementById('ai-dock');
    if (host) {
      dock = { host: host, resolve: null, returnFocus: document.activeElement };
      var shell = document.createElement('div');
      shell.innerHTML =
        '<div class="ai-dock-head">' +
          '<span class="dock-eyebrow">' + U.icon('sparkles', 14) + '<span>' + U.esc(t('ai.title')) + '</span></span>' +
          '<button class="icon-btn sm" data-dock="close" title="' + U.esc(t('common.close')) + '">' + U.icon('close', 16) + '</button>' +
        '</div><div class="ai-dock-body"></div>';
      shell.querySelector('.ai-dock-body').appendChild(body);
      host.innerHTML = '';
      host.appendChild(shell);
      shell.querySelector('[data-dock="close"]').onclick = function () { closeDock(); };
      host.hidden = false;
      host.classList.add('open');
      document.body.classList.add('with-ai-dock');
      if (CC.inspector) CC.inspector.close();   /* mutual exclusion: one side panel */
      window.addEventListener('keydown', onDockKey);
      setTimeout(function () {
        var f = body.querySelector('[autofocus]') || body.querySelector('.ai-tab.active') || body.querySelector('#ai-text');
        if (f) f.focus();
      }, 40);
      /* fall through: tabs and renderBody() below fill the panel */
    } else {
      /* fallback when the dock container is missing (e.g. stale preview build) */
      U.openModal({
        title: t('ai.title'),
        wide: true,
        body: body,
        dismissable: true,
        actions: [{ id: 'close', label: t('common.close'), ghost: true }]
      }).then(function () { state = null; });
    }

    body.querySelectorAll('.ai-tab').forEach(function (b) {
      b.onclick = function () {
        if (state.busy) return;
        state.kind = b.getAttribute('data-kind');
        state.result = null; state.raw = ''; state.error = ''; state.errorCode = '';
        state.scope = state.kind === 'draft' ? 'text' : (CC.graph.selection().length ? 'selection' : 'map');
        body.querySelectorAll('.ai-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
        renderBody();
      };
    });

    function renderBody() {
      var el = body.querySelector('#ai-body');
      var k = state.kind;
      var selN = CC.graph.selection().length;
      var hints = { draft: t('ai.draftHint'), organize: t('ai.organizeHint'), summarize: t('ai.summarizeHint'), review: t('ai.reviewHint') };
      var scopes = k === 'draft' && state.scope === 'text' ? '' :
        '<div class="ai-scopes">' +
          '<button class="scope-chip' + (state.scope === 'selection' ? ' active' : '') + '" data-scope="selection">' + U.esc(t('ai.useSelection', { n: selN })) + '</button>' +
          '<button class="scope-chip' + (state.scope === 'map' ? ' active' : '') + '" data-scope="map">' + U.esc(t('ai.useMap')) + '</button>' +
          '<button class="scope-chip' + (state.scope === 'corpus' ? ' active' : '') + '" data-scope="corpus">' + U.esc(t('ai.useCorpus')) + '</button>' +
        '</div>';

      el.innerHTML =
        '<p class="ai-hint">' + U.esc(hints[k]) + '</p>' +
        (k === 'draft' ?
          '<div class="ai-field"><label>' + U.esc(t('ai.input')) + '</label>' +
          '<textarea class="input ai-input" id="ai-text" placeholder="' + U.esc(t('ai.inputPlaceholder')) + '"></textarea></div>' +
          '<div class="ai-row">' +
            '<span class="ai-scope-label">' + U.esc(t('ai.scope')) + '</span>' +
            '<button class="scope-chip' + (state.scope === 'text' ? ' active' : '') + '" data-scope="text">' + U.esc(t('ai.input')) + '</button>' +
            '<button class="scope-chip' + (state.scope === 'selection' ? ' active' : '') + '" data-scope="selection">' + U.esc(t('ai.useSelection', { n: selN })) + '</button>' +
            '<button class="scope-chip' + (state.scope === 'map' ? ' active' : '') + '" data-scope="map">' + U.esc(t('ai.useMap')) + '</button>' +
            '<span class="ai-target-label">' + U.esc(t('common.add')) + '</span>' +
            '<select class="input slim" id="ai-target">' +
              '<option value="current"' + (state.target === 'current' ? ' selected' : '') + '>' + U.esc(t('ai.onlyThisMap')) + '</option>' +
              '<option value="new"' + (state.target === 'new' ? ' selected' : '') + '>' + U.esc(t('map.new')) + '</option>' +
            '</select>' +
          '</div>' :
          '<div class="ai-row">' + scopes +
            (k === 'review' ? '<span class="ai-target-label">' + U.esc(t('ai.reviewScope')) + '</span>' : '') +
          '</div>') +
        (k === 'review' ? '<p class="ai-note">' + U.esc(t('ai.scopeHint')) + '</p>' : '') +
        '<div class="ai-actions">' +
          '<select class="input slim" id="ai-action-pick">' +
            '<option value="">' + U.esc(t('ai.actions')) + '</option>' +
            S.state().aiActions.map(function (a) { return '<option value="' + a.id + '">' + U.esc(a.name) + '</option>'; }).join('') +
          '</select>' +
          '<input class="input" id="ai-extra" placeholder="' + U.esc(t('ai.actionPrompt')) + '">' +
          '<button class="mini-btn" id="ai-save-action">' + U.icon('star', 12) + U.esc(t('ai.newAction')) + '</button>' +
        '</div>' +
        '<div class="ai-run-row">' +
          '<button class="btn primary" id="ai-run">' + U.icon('sparkles', 15) + '<span>' + U.esc(t('ai.run')) + '</span></button>' +
          '<button class="btn ghost sm" id="ai-cancel" hidden>' + U.icon('close', 13) + '<span>' + U.esc(t('ai.cancel')) + '</span></button>' +
          '<span class="ai-run-status" id="ai-status"></span>' +
          '<button class="mini-btn ai-ledger-btn" id="ai-ledger">' + U.icon('history', 12) + U.esc(t('ai.ledger')) + '</button>' +
        '</div>' +
        '<div class="ai-stream" id="ai-stream" hidden></div>' +
        '<p class="ai-stream-hint" id="ai-stream-hint" hidden>' + U.esc(t('ai.streamHint')) + '</p>' +
        '<div class="ai-result" id="ai-result"></div>';

      el.querySelectorAll('[data-scope]').forEach(function (b) {
        b.onclick = function () {
          state.scope = b.getAttribute('data-scope');
          renderBody();
          var ta = el.querySelector('#ai-text');
          if (ta && state.draftText) ta.value = state.draftText;
        };
      });
      var ta = el.querySelector('#ai-text');
      if (ta) {
        if (state.draftText) ta.value = state.draftText;
        ta.oninput = function () { state.draftText = ta.value; };
      }
      var tg = el.querySelector('#ai-target');
      if (tg) tg.onchange = function () { state.target = tg.value; };
      var pick = el.querySelector('#ai-action-pick');
      if (pick) pick.onchange = function () {
        var a = S.state().aiActions.find(function (x) { return x.id === pick.value; });
        var extra = el.querySelector('#ai-extra');
        if (a && extra) extra.value = a.prompt;
      };
      el.querySelector('#ai-save-action').onclick = function () {
        var extra = el.querySelector('#ai-extra');
        if (!extra.value.trim()) { U.toast(t('ai.actionPrompt')); return; }
        U.prompt(t('ai.newAction'), '', { placeholder: t('ai.actionName') }).then(function (name) {
          if (!name) return;
          S.commit('edit', t('ai.newAction'), function () {
            S.state().aiActions.push({ id: U.uid('a'), name: name, prompt: extra.value.trim(), at: Date.now() });
          });
          U.toast(t('common.saved'), 'ok');
          renderBody();
        });
      };
      el.querySelector('#ai-run').onclick = run;
      var cancelBtn = el.querySelector('#ai-cancel');
      if (cancelBtn) cancelBtn.onclick = cancelRun;
      var ledgerBtn = el.querySelector('#ai-ledger');
      if (ledgerBtn) ledgerBtn.onclick = openLedger;
      if (state.result) renderResult();
      else if (state.error) renderError();
    }

    function setBusy(b) {
      state.busy = b;
      var st = body.querySelector('#ai-status');
      var btn = body.querySelector('#ai-run');
      var cancelBtn = body.querySelector('#ai-cancel');
      var streamEl = body.querySelector('#ai-stream');
      var hintEl = body.querySelector('#ai-stream-hint');
      if (st) st.innerHTML = b ? '<span class="spinner"></span>' + U.esc(t('ai.running')) : (state.elapsed ? U.esc(t('ai.usage', { tokens: state.usage ? (state.usage.total_tokens || 0) : '?', ms: state.elapsed })) : '');
      if (btn) btn.disabled = b;
      if (cancelBtn) cancelBtn.hidden = !b;
      if (b) {
        if (streamEl) { streamEl.hidden = false; streamEl.innerHTML = '<div class="ai-stream-head"><span class="spinner"></span>' + U.esc(t('ai.streaming')) + '</div><pre class="ai-stream-text"></pre>'; }
        if (hintEl) hintEl.hidden = false;
      } else {
        if (streamEl) streamEl.hidden = true;
        if (hintEl) hintEl.hidden = true;
      }
    }

    /* Live preview fed by the main-process SSE chunks. */
    function renderStream() {
      var el = body.querySelector('#ai-stream');
      if (!el || !state) return;
      var pre = el.querySelector('.ai-stream-text');
      if (pre) {
        pre.textContent = state.stream.slice(-1600);
        el.scrollTop = el.scrollHeight;
      }
    }
    state.renderStream = renderStream;

    /* A real cancel: the main process aborts the in-flight HTTP request. */
    function cancelRun() {
      if (!state || !state.busy || !state.requestId) return;
      state.cancelled = true;
      if (window.api.cancelChat) window.api.cancelChat(state.requestId);
      var st = body.querySelector('#ai-status');
      if (st) st.textContent = t('ai.cancelled');
    }

    function openLedger() {
      var box = document.createElement('div');
      box.className = 'ledger-panel';
      box.innerHTML = '<p class="dialog-text">' + U.esc(t('common.loading')) + '</p>';
      U.openModal({
        title: t('ai.ledger'),
        wide: true,
        body: box,
        actions: [
          { id: 'clear', label: t('ai.ledgerClear'), ghost: true, value: 'clear' },
          { id: 'close', label: t('common.close'), primary: true }
        ]
      }).then(function (r) {
        if (r === 'clear' && window.api.ledgerClear) window.api.ledgerClear();
      });
      var draw = function (items) {
        if (!items.length) {
          box.innerHTML = '<p class="dialog-text">' + U.esc(t('ai.ledgerEmpty')) + '</p>';
          return;
        }
        var statusKey = { ok: 'ai.ledgerOk', error: 'ai.ledgerError', aborted: 'ai.ledgerAborted' };
        var rows = items.map(function (e) {
          var label = statusKey[e.status] || 'ai.ledgerError';
          return '<tr class="ledger-row ledger-' + U.esc(e.status || '') + '">' +
            '<td>' + U.esc(U.fmtDate(e.at, true)) + '</td>' +
            '<td>' + U.esc(t('ai.' + (e.kind || 'draft'))) + '</td>' +
            '<td>' + U.esc(e.model || '—') + '</td>' +
            '<td><span class="ledger-status">' + U.esc(t(label)) + '</span></td>' +
            '<td>' + (e.tokens || 0) + '</td>' +
            '<td>' + (e.ms || 0) + ' ms</td>' +
            (e.error ? '<td class="ledger-err">' + U.esc(String(e.error).slice(0, 90)) + '</td>' : '<td>—</td>') +
            '</tr>';
        }).join('');
        box.innerHTML = '<div class="ledger-count">' + U.esc(t('ai.ledgerRows', { n: items.length })) + '</div>' +
          '<div class="ledger-wrap"><table class="ledger-table"><thead><tr>' +
          ['ai.ledgerTime', 'ai.ledgerAction', 'ai.ledgerModel', 'ai.ledgerStatus', 'ai.ledgerTokens', 'ai.ledgerMs']
            .map(function (k) { return '<th>' + U.esc(t(k)) + '</th>'; }).join('') +
          '<th>' + U.esc(t('ai.failed')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      };
      if (!window.api.ledgerList) { draw([]); return; }
      window.api.ledgerList().then(function (res) {
        draw((res && res.items) || []);
      }).catch(function () { draw([]); });
    }

    function run() {
      var el = body.querySelector('#ai-body');
      var extra = (el.querySelector('#ai-extra') || {}).value || '';
      var list = ctxCards(state.scope === 'text' ? 'map' : state.scope);
      if (state.scope === 'selection' && !list.length) { U.toast(t('ai.nothingSelected')); return; }

      var messages;
      if (state.kind === 'draft') {
        var text = (state.draftText || '').trim();
        if (!text && state.scope === 'text') { U.toast(t('ai.inputPlaceholder')); return; }
        messages = buildDraftMessages(text, list, extra);
      } else if (state.kind === 'organize') {
        messages = buildOrganizeMessages(list, extra);
      } else if (state.kind === 'summarize') {
        messages = buildSummarizeMessages(list, extra);
      } else {
        messages = buildReviewMessages(list, extra, state.scope === 'corpus');
      }

      setBusy(true);
      state.error = '';
      state.result = null;
      chat(messages, { temperature: 0.2, maxTokens: 3000 }).then(function (r) {
        if (!state) return;   /* dock closed while the request was in flight */
        setBusy(false);
        state.elapsed = r.ms || 0;
        if (!r.ok) {
          if (r.code === 'aborted' || state.cancelled) {
            state.error = t('ai.cancelled');
            state.errorCode = 'aborted';
            state.usage = null;
            renderError();
            return;
          }
          state.error = r.error || '';
          state.errorCode = r.code || '';
          state.usage = null;
          renderError();
          return;
        }
        state.usage = r.usage;
        state.raw = r.content || '';
        var parsed = extractJson(r.content);
        if (state.kind === 'draft' && !parsed) parsed = parseLooseDraft(r.content);
        if (!parsed && state.kind !== 'summarize') {
          state.error = t('ai.parseError');
          renderError();
          return;
        }
        state.result = parsed || { summary: String(r.content || '') };
        if (state.kind === 'draft') {
          (state.result.nodes || []).forEach(function (n, i) { state.selected[i] = true; });
        }
        if (state.kind === 'review') {
          (state.result.items || []).forEach(function (it, i) { state.selected[i] = true; });
        }
        if (state.kind === 'organize') {
          (state.result.renames || []).forEach(function (n, i) { state.selected['r' + i] = true; });
          (state.result.merges || []).forEach(function (n, i) { state.selected['m' + i] = false; });
        }
        if (state.kind === 'summarize') state.selected.summary = true;
        renderResult();
      }).catch(function (err) {
        if (!state) return;
        setBusy(false);
        state.error = String((err && err.message) || err);
        state.errorCode = 'network';
        renderError();
      });
    }

    function renderError() {
      var el = body.querySelector('#ai-result');
      if (!el) return;
      var codeKey = { auth: 'errAuth', rate: 'errRate', endpoint: 'errEndpoint', timeout: 'errTimeout', network: 'errNetwork', request: 'errRequest', server: 'errServer', empty: 'errEmpty', config: 'errConfig' }[state.errorCode || ''];
      el.innerHTML = '<div class="ai-error">' +
        '<div class="aie-head">' + U.icon('alert', 15) + '<strong>' + U.esc(t('ai.failed')) + '</strong></div>' +
        (codeKey ? '<p class="aie-code">' + U.esc(t('ai.' + codeKey)) + '</p>' : '') +
        '<p>' + U.esc(state.error) + '</p>' +
        '<p class="aie-hint">' + U.esc(t('ai.failedHint')) + '</p>' +
        '<div class="aie-actions"><button class="btn sm" id="ai-retry">' + U.esc(t('common.retry')) + '</button></div>' +
        (state.raw ? '<details class="ai-raw"><summary>' + U.esc(t('ai.rawOutput')) + '</summary><pre>' + U.esc(state.raw.slice(0, 4000)) + '</pre></details>' : '') +
        '</div>';
      var st = body.querySelector('#ai-status');
      if (st) st.textContent = '';
      var retry = el.querySelector('#ai-retry');
      if (retry) retry.onclick = function () { run(); };
    }

    function renderResult() {
      var el = body.querySelector('#ai-result');
      if (!el || !state.result) return;
      var k = state.kind;
      var r = state.result;
      var html = '';

      if (k === 'draft') {
        var nodes = r.nodes || [];
        var edges = (r.edges || []).filter(function (e) { return e && e.from != null && e.to != null; });
        html += '<div class="ai-result-head"><span class="ai-badge">' + U.esc(t('ai.diff')) + '</span>' +
          '<span class="ai-count">' + U.esc(t('ai.newNodes')) + ' ' + nodes.length + ' · ' + U.esc(t('ai.newEdges')) + ' ' + edges.length + '</span>' +
          (state.usage ? '<span class="ai-usage">' + U.esc(t('ai.usage', { tokens: state.usage.total_tokens || '?', ms: state.elapsed })) + '</span>' : '') + '</div>';
        html += '<div class="ai-list">';
        nodes.forEach(function (n, i) {
          var parent = nodes.find(function (x) { return String(x.tempId) === String(n.parent); });
          html += '<label class="ai-item">' +
            '<input type="checkbox" data-pick="' + i + '"' + (state.selected[i] ? ' checked' : '') + '>' +
            '<span class="ai-item-body">' +
              '<input class="ai-item-title" data-title="' + i + '" value="' + U.esc(n.title || '') + '">' +
              (parent ? '<span class="ai-item-sub">' + U.esc(t('edge.hierarchy')) + ' · ' + U.esc(parent.title || '') + '</span>' : '<span class="ai-item-sub">' + U.esc(t('map.addNode')) + '</span>') +
            '</span></label>';
        });
        html += '</div>';
        html += '<div class="ai-foot"><button class="btn primary sm" id="ai-accept">' + U.icon('check', 14) + U.esc(t('ai.accept')) + '</button>' +
          '<button class="btn sm" id="ai-accept-all">' + U.esc(t('ai.acceptAll')) + '</button>' +
          '<span class="ai-foot-hint">' + U.esc(t('ai.acceptConfirm')) + '</span></div>';
      }

      if (k === 'organize') {
        var renames = r.renames || [], merges = r.merges || [], moves = r.moves || [];
        html += '<div class="ai-result-head"><span class="ai-badge">' + U.esc(t('ai.diff')) + '</span>' +
          '<span class="ai-count">' + renames.length + ' / ' + merges.length + ' / ' + moves.length + '</span></div>';
        html += '<div class="ai-list">';
        renames.forEach(function (x, i) {
          var c = S.card(x.id);
          html += '<label class="ai-item">' +
            '<input type="checkbox" data-pick="r' + i + '"' + (state.selected['r' + i] ? ' checked' : '') + '>' +
            '<span class="ai-item-body"><span class="ai-diff-row"><span class="before">' + U.esc(c ? c.title : '?') + '</span>' +
            '<span class="arrow">→</span><span class="after">' + U.esc(x.title) + '</span></span>' +
            '<span class="ai-item-sub">' + U.esc(t('ai.renames')) + '</span></span></label>';
        });
        merges.forEach(function (x, i) {
          var a = S.card(x.from), b = S.card(x.to);
          html += '<label class="ai-item">' +
            '<input type="checkbox" data-pick="m' + i + '"' + (state.selected['m' + i] ? ' checked' : '') + '>' +
            '<span class="ai-item-body"><span class="ai-diff-row"><span class="before">' + U.esc(a ? a.title : '?') + '</span>' +
            '<span class="arrow">⇒</span><span class="after">' + U.esc(b ? b.title : '?') + '</span></span>' +
            '<span class="ai-item-sub">' + U.esc(x.reason || t('ai.merges')) + '</span></span></label>';
        });
        moves.forEach(function (x, i) {
          var a = S.card(x.id), p = S.card(x.parent);
          html += '<label class="ai-item">' +
            '<input type="checkbox" data-pick="v' + i + '"' + (state.selected['v' + i] ? ' checked' : '') + '>' +
            '<span class="ai-item-body"><span class="ai-diff-row"><span class="before">' + U.esc(a ? a.title : '?') + '</span>' +
            '<span class="arrow">↳</span><span class="after">' + U.esc(p ? p.title : '—') + '</span></span>' +
            '<span class="ai-item-sub">' + U.esc(t('history.kind.structure')) + '</span></span></label>';
        });
        html += '</div>';
        if (r.summary) html += '<p class="ai-summary-text">' + U.esc(r.summary) + '</p>';
        html += '<div class="ai-foot"><button class="btn primary sm" id="ai-accept">' + U.icon('check', 14) + U.esc(t('ai.accept')) + '</button>' +
          '<span class="ai-foot-hint">' + U.esc(t('ai.acceptConfirm')) + '</span></div>';
      }

      if (k === 'summarize') {
        html += '<div class="ai-result-head"><span class="ai-badge">' + U.esc(t('ai.summaryResult')) + '</span>' +
          (state.usage ? '<span class="ai-usage">' + U.esc(t('ai.usage', { tokens: state.usage.total_tokens || '?', ms: state.elapsed })) + '</span>' : '') + '</div>';
        html += '<div class="ai-summary-text">' + U.esc(r.summary || state.raw) + '</div>';
        if (r.keyPoints && r.keyPoints.length) {
          html += '<ul class="ai-points">' + r.keyPoints.map(function (p) { return '<li>' + U.esc(p) + '</li>'; }).join('') + '</ul>';
        }
        html += '<div class="ai-foot"><button class="btn sm" id="ai-copy">' + U.icon('copy', 14) + U.esc(t('common.copy')) + '</button>' +
          '<button class="btn sm" id="ai-note">' + U.icon('note', 14) + U.esc(t('ai.addNote')) + '</button></div>';
      }

      if (k === 'review') {
        var items = r.items || [];
        html += '<div class="ai-result-head"><span class="ai-badge">' + U.esc(t('ai.reviewItems')) + '</span>' +
          '<span class="ai-count">' + items.length + '</span></div>';
        html += '<div class="ai-list">';
        items.forEach(function (it, i) {
          var c = S.card(it.cardId);
          html += '<div class="ai-item review-item">' +
            '<input type="checkbox" data-pick="' + i + '"' + (state.selected[i] ? ' checked' : '') + '>' +
            '<div class="ai-item-body">' +
              '<div class="ai-review-head"><span class="conf ' + U.esc(it.confidence || 'medium') + '">' + U.esc(t('ai.confidence')) + ' ' + U.esc(t('ai.' + (it.confidence || 'medium'))) + '</span>' +
              '<span class="ai-review-loc">' + U.esc(c ? c.title : (it.location || '')) + '</span></div>' +
              '<div class="ai-review-problem">' + U.esc(it.problem || '') + '</div>' +
              (it.suggestion ? '<div class="ai-review-suggest">' + U.esc(it.suggestion) + '</div>' : '') +
            '</div>' +
            (c ? '<button class="icon-btn xs" data-jump="' + c.id + '">' + U.icon('focus', 13) + '</button>' : '') +
          '</div>';
        });
        html += '</div>';
        html += '<div class="ai-foot">' +
          '<button class="btn primary sm" id="ai-accept">' + U.icon('check', 14) + U.esc(t('ai.acceptAll')) + '</button>' +
          '<button class="btn sm" id="ai-accept-high">' + U.esc(t('ai.acceptHigh')) + '</button>' +
          '<span class="ai-foot-hint">' + U.esc(t('ai.reviewHint')) + '</span></div>';
      }

      el.innerHTML = html;

      el.querySelectorAll('[data-pick]').forEach(function (cb) {
        cb.onchange = function () { state.selected[cb.getAttribute('data-pick')] = cb.checked; };
      });
      el.querySelectorAll('[data-title]').forEach(function (inp) {
        inp.oninput = function () {
          var i = Number(inp.getAttribute('data-title'));
          if (state.result.nodes[i]) state.result.nodes[i].title = inp.value;
        };
      });
      el.querySelectorAll('[data-jump]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-jump');
          closeDock();
          CC.app.openCard(id);
        };
      });

      var copyBtn = el.querySelector('#ai-copy');
      if (copyBtn) copyBtn.onclick = function () {
        navigator.clipboard.writeText(r.summary || state.raw).then(function () { U.toast(t('common.copied'), 'ok'); });
      };
      var noteBtn = el.querySelector('#ai-note');
      if (noteBtn) noteBtn.onclick = function () {
        var ids = CC.graph.selection();
        var target = ids.length ? S.card(ids[0]) : null;
        if (!target) { U.toast(t('map.noSelection')); return; }
        S.commit('ai', t('ai.addedNote'), function () {
          target.note = (target.note ? target.note + '\n' : '') + (r.summary || state.raw);
          target.updatedAt = Date.now();
        }, { snapshot: true });
        U.toast(t('ai.addedNote'), 'ok');
        CC.app.refreshInspector();
      };

      var allBtn = el.querySelector('#ai-accept-all');
      if (allBtn) allBtn.onclick = function () {
        Object.keys(state.selected).forEach(function (k2) { state.selected[k2] = true; });
        el.querySelectorAll('[data-pick]').forEach(function (cb) { if (k === 'organize' && cb.getAttribute('data-pick')[0] === 'm') return; cb.checked = true; state.selected[cb.getAttribute('data-pick')] = true; });
      };
      var acceptBtn = el.querySelector('#ai-accept');
      if (acceptBtn) acceptBtn.onclick = function () { accept(false); };
      var highBtn = el.querySelector('#ai-accept-high');
      if (highBtn) highBtn.onclick = function () { accept(true); };

      var st = body.querySelector('#ai-status');
      if (st && state.usage) st.textContent = t('ai.usage', { tokens: state.usage.total_tokens || '?', ms: state.elapsed });
    }

    function accept(highOnly) {
      var k = state.kind;
      var r = state.result;
      var m = S.currentMap();
      var written = 0;

      if (k === 'draft') {
        var nodes = r.nodes || [];
        var chosen = nodes.filter(function (n, i) { return state.selected[i]; });
        if (!chosen.length) { U.toast(t('ai.noChanges')); return; }
        var map = state.target === 'new' || !m ? null : m;
        S.commit('ai', t('ai.draft'), function () {
          if (!map) {
            map = S.newMap((nodes[0] && nodes[0].title) || t('ai.draft'), { silent: true });
          }
          var idMap = {};
          chosen.forEach(function (n, i) {
            var c = S.newCard({
              title: n.title || t('common.untitled'),
              body: n.body || '',
              note: n.note || '',
              tags: n.tags || [],
              langs: n.langs || [],
              sources: [{ kind: 'ai', ref: t('ai.draftSource'), at: Date.now() }]
            }, true);
            idMap[n.tempId] = c.id;
            if (!map.positions[c.id]) map.positions[c.id] = { x: 0, y: 0 };
            S.addCardToMap(map, c.id);
            written++;
          });
          chosen.forEach(function (n) {
            if (n.parent && idMap[n.parent] && idMap[n.tempId]) {
              map.edges.push({ id: U.uid('e'), from: idMap[n.parent], to: idMap[n.tempId], type: 'hierarchy', color: '', label: '', uncertain: false });
            }
          });
          (r.edges || []).forEach(function (e) {
            var from = idMap[e.from], to = idMap[e.to];
            if (!from || !to || from === to) return;
            var type = EDGE_TYPES.indexOf(e.type) >= 0 ? e.type : 'custom';
            map.edges.push({ id: U.uid('e'), from: from, to: to, type: type, color: '', label: e.label || '', uncertain: !!e.uncertain });
          });
          map.updatedAt = Date.now();
          S.settings().lastMapId = map.id;
        }, { snapshot: true });
        U.toast(t('ai.applied', { n: written }), 'ok');
        closeDock();
        CC.app.goMap(map.id);
        return;
      }

      if (k === 'organize') {
        S.commit('ai', t('ai.organize'), function () {
          (r.renames || []).forEach(function (x, i) {
            if (!state.selected['r' + i]) return;
            var c = S.card(x.id);
            if (c && x.title) { c.title = x.title; c.updatedAt = Date.now(); written++; }
          });
          (r.merges || []).forEach(function (x, i) {
            if (!state.selected['m' + i]) return;
            if (S.mergeCards(x.from, x.to)) written++;
          });
          (r.moves || []).forEach(function (x, i) {
            if (!state.selected['v' + i] || !m) return;
            var id = x.id, pid = x.parent;
            if (!S.card(id) || !S.card(pid) || id === pid) return;
            m.edges = m.edges.filter(function (e) { return !(e.type === 'hierarchy' && e.to === id); });
            m.edges.push({ id: U.uid('e'), from: pid, to: id, type: 'hierarchy', color: '', label: '', uncertain: false });
            written++;
          });
        }, { snapshot: true });
        U.toast(t('ai.applied', { n: written }), 'ok');
        closeDock();
        return;
      }

      if (k === 'review') {
        var items = (r.items || []).filter(function (it, i) {
          if (!state.selected[i]) return false;
          if (highOnly && it.confidence !== 'high') return false;
          return true;
        });
        if (!items.length) { U.toast(t('ai.noChanges')); return; }
        S.commit('ai', t('ai.review'), function () {
          var review = { id: U.uid('r'), at: Date.now(), mapId: m ? m.id : null, scope: state.scope, items: [] };
          items.forEach(function (it) {
            review.items.push({
              id: U.uid('i'), cardId: it.cardId || null, edgeId: it.edgeId || null,
              location: it.location || '', problem: it.problem || '', suggestion: it.suggestion || '',
              confidence: it.confidence || 'medium', status: 'pending'
            });
            written++;
          });
          S.state().reviews.unshift(review);
        }, { snapshot: true });
        U.toast(t('ai.applied', { n: written }), 'ok');
        closeDock();
        return;
      }

      if (k === 'summarize') {
        closeDock();
      }
    }

    renderBody();
  }

  /* ------------------------------------------------------------------ */
  /* prompts                                                            */
  /* ------------------------------------------------------------------ */

  function sysPrompt(extra) {
    return 'You are the assistant of a local mind-mapping tool. The user corpus is the source of truth; ' +
      'your output is always a draft that the user confirms item by item. Answer in the same language as the input. ' +
      (extra || '');
  }

  function buildDraftMessages(text, list, extra) {
    var material = text;
    if (!material && list.length) {
      material = cardContext(list).map(function (c) { return '- ' + c.title + (c.body ? ': ' + c.body : ''); }).join('\n');
    }
    var instruction =
      'Turn the material into a mind-map draft. Return ONLY JSON with this shape: ' +
      '{"nodes":[{"tempId":"n1","title":"short title","body":"optional detail","note":"","tags":[],"parent":"n0 or empty"}],' +
      '"edges":[{"from":"n1","to":"n2","type":"hierarchy|synonym|antonym|cause|example|contrast|reference|custom","label":"","uncertain":false}]}. ' +
      'Rules: at most 3 levels and 24 nodes; titles under 18 characters; every node except roots has a parent; ' +
      'do not invent facts that are not in the material; mark doubtful relations with uncertain=true; no prose outside JSON.';
    return [
      { role: 'system', content: sysPrompt(instruction) },
      { role: 'user', content: (extra ? 'Extra instruction: ' + extra + '\n\n' : '') + 'Material:\n' + material.slice(0, 12000) }
    ];
  }

  function buildOrganizeMessages(list, extra) {
    var ctx = cardContext(list);
    var instruction =
      'Group, rename and restructure these mind-map nodes. Return ONLY JSON: ' +
      '{"renames":[{"id":"card id","title":"new title"}],"merges":[{"from":"card id","to":"card id","reason":"why"}],' +
      '"moves":[{"id":"card id","parent":"card id"}],"summary":"one short sentence"}. ' +
      'Only suggest changes that clearly help. Never invent nodes. Keep titles short. If nothing should change return empty arrays. No prose outside JSON.';
    return [
      { role: 'system', content: sysPrompt(instruction) },
      { role: 'user', content: (extra ? 'Extra instruction: ' + extra + '\n\n' : '') + 'Nodes JSON:\n' + JSON.stringify(ctx) }
    ];
  }

  function buildSummarizeMessages(list, extra) {
    var ctx = cardContext(list);
    var instruction =
      'Summarize the material. Return ONLY JSON: {"summary":"3-6 sentences","keyPoints":["..."]}. ' +
      'Stay faithful to the source; do not add facts. No prose outside JSON.';
    return [
      { role: 'system', content: sysPrompt(instruction) },
      { role: 'user', content: (extra ? 'Extra instruction: ' + extra + '\n\n' : '') + 'Nodes JSON:\n' + JSON.stringify(ctx) }
    ];
  }

  function buildReviewMessages(list, extra, withCorpus) {
    var ctx = cardContext(list);
    var instruction =
      'Review the corpus and annotate only; never rewrite it. Return ONLY JSON: ' +
      '{"items":[{"cardId":"id","edgeId":"","location":"where","problem":"what is wrong",' +
      '"suggestion":"how to fix","confidence":"high|medium|low"}]}. ' +
      'Check: factual errors, misused relations, duplicates and contradictions, missing structure, inconsistent naming, and possible omissions (as gentle hints). ' +
      'Each item must point at a real cardId from the input. Be concise. No prose outside JSON.';
    return [
      { role: 'system', content: sysPrompt(instruction) },
      { role: 'user', content: (extra ? 'Extra instruction: ' + extra + '\n\n' : '') + (withCorpus ? 'Scope: the whole corpus.\n' : 'Scope: this map only.\n') + 'Nodes JSON:\n' + JSON.stringify(ctx) }
    ];
  }

  /* ------------------------------------------------------------------ */
  /* pending annotations panel                                          */
  /* ------------------------------------------------------------------ */

  function openReviewPanel() {
    var reviews = S.state().reviews.filter(function (r) {
      return r.items.some(function (i) { return i.status === 'pending'; });
    });
    var body = document.createElement('div');
    body.className = 'review-panel';
    if (!reviews.length) {
      body.innerHTML = '<p class="dialog-text">' + U.esc(t('ai.noPending')) + '</p>';
    } else {
      body.innerHTML = reviews.map(function (r) {
        return '<div class="review-group"><div class="rg-head">' + U.esc(U.fmtDate(r.at, true)) + ' · ' + r.items.filter(function (i) { return i.status === 'pending'; }).length + '</div>' +
          r.items.filter(function (i) { return i.status === 'pending'; }).map(function (it) {
            var c = S.card(it.cardId);
            return '<div class="review-row">' +
              '<div class="rr-main"><div class="rr-loc">' + U.esc(c ? c.title : it.location) + ' <span class="conf ' + U.esc(it.confidence) + '">' + U.esc(t('ai.' + it.confidence)) + '</span></div>' +
              '<div class="rr-text">' + U.esc(it.problem) + '</div>' +
              (it.suggestion ? '<div class="rr-sug">' + U.esc(it.suggestion) + '</div>' : '') + '</div>' +
              '<button class="mini-btn" data-jump="' + (c ? c.id : '') + '">' + U.esc(t('common.jump')) + '</button>' +
              '<button class="mini-btn" data-resolve="' + it.id + '">' + U.esc(t('ai.markResolved')) + '</button>' +
            '</div>';
          }).join('') + '</div>';
      }).join('');
    }
    U.openModal({
      title: t('ai.reviewPending'),
      medium: true,
      body: body,
      actions: [{ id: 'close', label: t('common.close'), ghost: true }]
    });
    body.querySelectorAll('[data-jump]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-jump');
        if (!id) return;
        U.closeTopModal();
        CC.app.openCard(id);
      };
    });
    body.querySelectorAll('[data-resolve]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-resolve');
        S.quiet(function () {
          S.state().reviews.forEach(function (r) {
            r.items.forEach(function (it) { if (it.id === id) it.status = 'resolved'; });
          });
          S.saveSoon();
        });
        S.emit();
        b.closest('.review-row').classList.add('done');
        b.textContent = t('ai.resolved');
      };
    });
  }

  CC.ai = {
    open: open, ready: ready, chat: chat, openReviewPanel: openReviewPanel,
    closeDock: closeDock, isDockOpen: isDockOpen
  };
})();
