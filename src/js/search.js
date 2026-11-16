/* Search: full text with fuzzy + script tolerance, relation and structure search */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  var st = {
    tab: 'text',
    q: '',
    tags: [],
    langs: [],
    from: '',
    to: '',
    presence: 'any',
    pendingOnly: false,
    relationType: '',
    sel: {},
    openFilters: false
  };

  function normTW(s) { return U.norm(CC.toTW(String(s || ''))); }
  function normCN(s) {
    var f = CC.toCN || function (x) { return x; };
    return U.norm(f(String(s || '')));
  }

  function variants(s) {
    var base = U.norm(s);
    var out = [base];
    var tw = normTW(s);
    var cn = normCN(s);
    if (tw && out.indexOf(tw) < 0) out.push(tw);
    if (cn && out.indexOf(cn) < 0) out.push(cn);
    return out;
  }

  function scoreField(text, qvars) {
    if (!qvars.length) return 0;
    var hays = variants(text);
    var best = 0;
    qvars.forEach(function (q) {
      if (!q) return;
      hays.forEach(function (hay) {
        if (!hay) return;
        if (hay.indexOf(q) >= 0) { best = Math.max(best, 1); return; }
        var tokens = q.split(' ').filter(Boolean);
        if (tokens.length > 1 && tokens.every(function (x) { return hay.indexOf(x) >= 0; })) { best = Math.max(best, 0.82); return; }
        if (q.length >= 2) {
          var L = q.length, step = Math.max(1, Math.floor(L / 2));
          for (var i = 0; i <= Math.max(0, hay.length - L); i += step) {
            var s = U.similarity(q, hay.substr(i, L + 2));
            if (s > best) best = s;
          }
          if (best >= 0.62) best = best * 0.85;
        }
      });
    });
    return best;
  }

  function inMapIndex() {
    var idx = {};
    S.maps().forEach(function (m) {
      S.mapCards(m).forEach(function (c) { (idx[c.id] = idx[c.id] || []).push(m); });
    });
    return idx;
  }

  function pendingIndex() {
    var idx = {};
    S.state().reviews.forEach(function (r) {
      r.items.forEach(function (it) {
        if (it.status === 'pending' && it.cardId) idx[it.cardId] = (idx[it.cardId] || 0) + 1;
      });
    });
    return idx;
  }

  function baseFilter(c, idx, pend) {
    if (st.tags.length && !st.tags.every(function (tg) { return (c.tags || []).indexOf(tg) >= 0; })) return false;
    if (st.langs.length && !st.langs.every(function (lg) { return (c.langs || []).indexOf(lg) >= 0; })) return false;
    if (st.presence === 'in' && !idx[c.id]) return false;
    if (st.presence === 'out' && idx[c.id]) return false;
    if (st.pendingOnly && !pend[c.id]) return false;
    if (st.from && c.updatedAt < new Date(st.from).getTime()) return false;
    if (st.to && c.updatedAt > new Date(st.to).getTime() + 86400000) return false;
    return true;
  }

  function runText() {
    var qvars = st.q.trim() ? variants(st.q.trim()) : [];
    var idx = inMapIndex(), pend = pendingIndex();
    var out = [];
    S.cards().forEach(function (c) {
      if (!baseFilter(c, idx, pend)) return;
      if (!qvars.length) { out.push({ card: c, score: 0.5, hit: '' }); return; }
      var tScore = scoreField(c.title, qvars) * 1.0;
      var bScore = scoreField(c.body, qvars) * 0.9;
      var nScore = scoreField(c.note, qvars) * 0.88;
      var gScore = scoreField((c.tags || []).join(' '), qvars) * 0.8;
      var score = Math.max(tScore, bScore, nScore, gScore);
      if (score < 0.45) return;
      var hit = tScore >= 0.45 ? 'title' : bScore >= 0.45 ? 'body' : nScore >= 0.45 ? 'note' : 'tags';
      out.push({ card: c, score: score, hit: hit });
    });
    out.sort(function (a, b) { return b.score - a.score || b.card.updatedAt - a.card.updatedAt; });
    return out;
  }

  function hl(text, q) {
    var s = U.esc(text || '');
    if (!q) return s;
    var raw = String(text || '');
    var qq = q.trim();
    if (!qq) return s;
    var i = raw.toLowerCase().indexOf(qq.toLowerCase());
    if (i < 0) return s;
    return U.esc(raw.slice(0, i)) + '<mark>' + U.esc(raw.slice(i, i + qq.length)) + '</mark>' + U.esc(raw.slice(i + qq.length));
  }

  function mount(root) {
    var idx = inMapIndex();
    var pend = pendingIndex();
    var allTags = {}, allLangs = {};
    S.cards().forEach(function (c) {
      (c.tags || []).forEach(function (x) { allTags[x] = (allTags[x] || 0) + 1; });
      (c.langs || []).forEach(function (x) { allLangs[x] = (allLangs[x] || 0) + 1; });
    });

    var results = st.tab === 'text' ? runText() : [];
    var selCount = Object.keys(st.sel).length;

    root.innerHTML =
      '<div class="page-head"><div class="ph-left">' +
        '<h1 class="page-title"><span class="pt-ico">' + U.icon('search', 20) + '</span>' + U.esc(t('search.title')) + '</h1>' +
        '<p class="page-sub">' + U.esc(t('search.subtitle')) + '</p>' +
      '</div><div class="page-actions">' +
        (st.tab === 'text' && st.q.trim() ? '<button class="btn sm" data-act="save-query">' + U.icon('star', 14) + U.esc(t('search.saveQuery')) + '</button>' : '') +
      '</div></div>' +

      '<div class="search-shell">' +
        '<div class="search-main">' +
          '<div class="search-box panel">' +
            '<div class="search-input-row">' + U.icon('search', 17) +
              '<input id="q" placeholder="' + U.esc(t('search.placeholder')) + '" value="' + U.esc(st.q) + '">' +
              (st.q ? '<button class="icon-btn xs" id="q-clear">' + U.icon('close', 13) + '</button>' : '') +
            '</div>' +
            '<div class="search-tabs">' +
              ['text', 'relation', 'structure'].map(function (k) {
                return '<button class="search-tab' + (st.tab === k ? ' active' : '') + '" data-tab="' + k + '">' + U.esc(t('search.tab' + (k === 'text' ? 'Text' : k === 'relation' ? 'Relation' : 'Structure'))) + '</button>';
              }).join('') +
              '<button class="filter-toggle' + (st.openFilters ? ' active' : '') + '" id="filter-toggle">' + U.icon('filter', 14) + U.esc(t('common.filter')) + '</button>' +
            '</div>' +
            '<div class="filters' + (st.openFilters ? ' open' : '') + '" id="filters">' +
              '<div class="filter-grid">' +
                '<label class="f-field"><span>' + U.esc(t('search.tagFilter')) + '</span>' +
                  '<input class="input sm" id="f-tags" placeholder="tag, tag" value="' + U.esc(st.tags.join(', ')) + '">' +
                  '<div class="f-hints">' + Object.keys(allTags).slice(0, 8).map(function (x) {
                    return '<button class="mini-chip click" data-tag="' + U.esc(x) + '">' + U.esc(x) + '</button>';
                  }).join('') + '</div>' +
                '</label>' +
                '<label class="f-field"><span>' + U.esc(t('search.presence')) + '</span>' +
                  '<select class="input sm" id="f-presence">' +
                    '<option value="any"' + (st.presence === 'any' ? ' selected' : '') + '>' + U.esc(t('search.presenceAny')) + '</option>' +
                    '<option value="in"' + (st.presence === 'in' ? ' selected' : '') + '>' + U.esc(t('search.presenceIn')) + '</option>' +
                    '<option value="out"' + (st.presence === 'out' ? ' selected' : '') + '>' + U.esc(t('search.presenceOut')) + '</option>' +
                  '</select></label>' +
                '<label class="f-field"><span>' + U.esc(t('search.dateFrom')) + ' / ' + U.esc(t('search.dateTo')) + '</span>' +
                  '<div class="date-pair"><input class="input sm" type="date" id="f-from" value="' + U.esc(st.from) + '">' +
                  '<input class="input sm" type="date" id="f-to" value="' + U.esc(st.to) + '"></div></label>' +
              '</div>' +
              '<div class="f-bottom">' +
                '<label class="check"><input type="checkbox" id="f-pending"' + (st.pendingOnly ? ' checked' : '') + '><span>' + U.esc(t('search.pendingOnly')) + '</span></label>' +
                '<span class="f-meta">' + (st.q ? '<span class="on-badge">' + U.esc(t('search.fuzzyOn')) + '</span><span class="on-badge">' + U.esc(t('search.s2tOn')) + '</span>' : '') + '</span>' +
                '<button class="mini-btn" id="f-reset">' + U.esc(t('common.reset')) + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="results-head">' +
            '<span class="rh-title">' +
              (st.tab === 'text' ? U.esc(t('search.resultCount', { n: results.length })) :
                st.tab === 'relation' ? U.esc(t('search.relations')) : U.esc(t('search.structure'))) +
            '</span>' +
            (st.tab === 'text' ? '<span class="rh-actions">' +
              '<button class="mini-btn" data-act="sel-all">' + U.esc(t('common.selectAll')) + '</button>' +
              (selCount ? '<span class="rh-sel">' + U.esc(t('search.selectedCount', { n: selCount })) + '</span>' +
                '<button class="mini-btn accent" data-act="to-map">' + U.icon('map', 13) + U.esc(t('search.toMap')) + '</button>' +
                '<button class="mini-btn accent" data-act="add-tags">' + U.icon('tag', 13) + U.esc(t('search.addTags')) + '</button>' +
                '<button class="mini-btn accent" data-act="link-to">' + U.icon('link', 13) + U.esc(t('search.linkTo')) + '</button>' : '') +
            '</span>' : '') +
          '</div>' +

          '<div id="results">' + renderResults(results, idx, pend) + '</div>' +
        '</div>' +

        '<aside class="search-side">' +
          '<div class="panel saved-panel">' +
            '<div class="panel-head"><h2>' + U.esc(t('search.savedQueries')) + '</h2></div>' +
            (S.state().savedQueries.length ? '<div class="saved-list">' + S.state().savedQueries.map(function (v) {
              return '<div class="saved-row' + (v.q === st.q && v.tags.join() === st.tags.join() ? ' active' : '') + '">' +
                '<button class="saved-name" data-saved="' + v.id + '">' + U.icon('search', 13) + '<span>' + U.esc(v.name) + '</span></button>' +
                '<button class="icon-btn xs" data-delsaved="' + v.id + '">' + U.icon('close', 12) + '</button></div>';
            }).join('') + '</div>' : '<div class="mini-empty pad">' + U.esc(t('common.empty')) + '</div>') +
          '</div>' +
          '<div class="panel tips-panel">' +
            '<h3>' + U.esc(t('search.combine')) + '</h3>' +
            '<p>' + U.esc(t('search.structureHint')) + '</p>' +
            '<p class="tip-line">' + U.icon('info', 13) + '<span>' + U.esc(t('search.fuzzyOn')) + ' · ' + U.esc(t('search.s2tOn')) + '</span></p>' +
          '</div>' +
        '</aside>' +
      '</div>';

    bind(root, results, idx, pend);
  }

  function bind(root, results, idx, pend) {
    var q = root.querySelector('#q');
    q.addEventListener('input', U.debounce(function () { st.q = q.value; rerender(root); }, 220));
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { st.q = q.value; rerender(root); } });
    var qc = root.querySelector('#q-clear');
    if (qc) qc.onclick = function () { st.q = ''; rerender(root); };

    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { st.tab = b.getAttribute('data-tab'); rerender(root); };
    });
    var ft = root.querySelector('#filter-toggle');
    if (ft) ft.onclick = function () { st.openFilters = !st.openFilters; rerender(root); };

    var fTags = root.querySelector('#f-tags');
    if (fTags) fTags.onchange = function () { st.tags = fTags.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); rerender(root); };
    var fPres = root.querySelector('#f-presence');
    if (fPres) fPres.onchange = function () { st.presence = fPres.value; rerender(root); };
    var fFrom = root.querySelector('#f-from');
    if (fFrom) fFrom.onchange = function () { st.from = fFrom.value; rerender(root); };
    var fTo = root.querySelector('#f-to');
    if (fTo) fTo.onchange = function () { st.to = fTo.value; rerender(root); };
    var fPend = root.querySelector('#f-pending');
    if (fPend) fPend.onchange = function () { st.pendingOnly = fPend.checked; rerender(root); };
    var fReset = root.querySelector('#f-reset');
    if (fReset) fReset.onclick = function () {
      st.tags = []; st.langs = []; st.from = ''; st.to = ''; st.presence = 'any'; st.pendingOnly = false;
      rerender(root);
    };
    root.querySelectorAll('[data-tag]').forEach(function (b) {
      b.onclick = function () { st.tags = [b.getAttribute('data-tag')]; rerender(root); };
    });

    root.querySelectorAll('[data-result]').forEach(function (row) {
      row.onclick = function (e) {
        if (e.target.closest('input')) return;
        CC.app.openCard(row.getAttribute('data-result'));
      };
    });
    root.querySelectorAll('[data-check]').forEach(function (cb) {
      cb.onchange = function () {
        var id = cb.getAttribute('data-check');
        if (cb.checked) st.sel[id] = 1; else delete st.sel[id];
        rerender(root);
      };
    });
    root.querySelectorAll('[data-jump]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        CC.app.goMap(b.getAttribute('data-map'), b.getAttribute('data-jump'));
      };
    });
    root.querySelectorAll('[data-merge]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        CC.app.mergeFlow(b.getAttribute('data-merge'), b.getAttribute('data-b'));
      };
    });

    var selAll = root.querySelector('[data-act="sel-all"]');
    if (selAll) selAll.onclick = function () {
      var shown = results.slice(0, 200);
      var all = shown.length > 0 && shown.every(function (r) { return st.sel[r.card.id]; });
      st.sel = {};
      if (!all) shown.forEach(function (r) { st.sel[r.card.id] = 1; });
      rerender(root);
    };
    var saveQ = root.querySelector('[data-act="save-query"]');
    if (saveQ) saveQ.onclick = function () {
      U.prompt(t('search.saveQuery'), st.q, { placeholder: t('search.saveQueryPrompt') }).then(function (name) {
        if (!name) return;
        S.commit('edit', t('search.saveQuery'), function () {
          S.state().savedQueries.push({ id: U.uid('q'), name: name, q: st.q, tags: st.tags.slice(), langs: st.langs.slice(), presence: st.presence, at: Date.now() });
        });
        U.toast(t('common.saved'), 'ok');
      });
    };
    root.querySelectorAll('[data-saved]').forEach(function (b) {
      b.onclick = function () {
        var v = S.state().savedQueries.find(function (x) { return x.id === b.getAttribute('data-saved'); });
        if (!v) return;
        st.q = v.q || ''; st.tags = (v.tags || []).slice(); st.langs = (v.langs || []).slice(); st.presence = v.presence || 'any';
        st.tab = 'text';
        rerender(root);
      };
    });
    root.querySelectorAll('[data-delsaved]').forEach(function (b) {
      b.onclick = function () {
        S.commit('edit', t('search.deleteQuery'), function () {
          S.state().savedQueries = S.state().savedQueries.filter(function (x) { return x.id !== b.getAttribute('data-delsaved'); });
        });
      };
    });

    var toMap = root.querySelector('[data-act="to-map"]');
    if (toMap) toMap.onclick = function () {
      CC.app.createMapFromCards(Object.keys(st.sel), st.q || t('search.title'));
      st.sel = {};
    };
    var addTags = root.querySelector('[data-act="add-tags"]');
    if (addTags) addTags.onclick = function () {
      U.prompt(t('search.addTags'), '', { placeholder: t('cards.tagsPlaceholder') }).then(function (v) {
        if (!v) return;
        var ids = Object.keys(st.sel);
        S.commit('batch', t('search.addTags'), function () {
          ids.forEach(function (id) {
            var c = S.card(id);
            if (!c) return;
            c.tags = c.tags || [];
            if (c.tags.indexOf(v) < 0) c.tags.push(v);
            c.updatedAt = Date.now();
          });
        });
        st.sel = {};
        U.toast(t('search.batchDone', { n: ids.length }), 'ok');
      });
    };
    var linkTo = root.querySelector('[data-act="link-to"]');
    if (linkTo) linkTo.onclick = function () {
      CC.app.pickCard(t('search.pickTarget')).then(function (targetId) {
        if (!targetId) return;
        var m = S.currentMap();
        if (!m) { U.toast(t('map.new')); return; }
        var ids = Object.keys(st.sel);
        S.commit('batch', t('search.linkTo'), function () {
          ids.forEach(function (id) {
            if (id === targetId) return;
            if (!m.edges.some(function (e) { return e.from === targetId && e.to === id; })) {
              m.edges.push({ id: U.uid('e'), from: targetId, to: id, type: 'reference', color: '', label: '', uncertain: false });
            }
            S.addCardToMap(m, id);
          });
        });
        st.sel = {};
        U.toast(t('search.batchDone', { n: ids.length }), 'ok');
      });
    };
  }

  function renderResults(results, idx, pend) {
    if (st.tab === 'relation') return renderRelations();
    if (st.tab === 'structure') return renderStructure();

    if (!st.q.trim() && !st.tags.length && !st.langs.length && !st.pendingOnly && st.presence === 'any') {
      return '<div class="panel">' + '<div class="mini-empty pad big">' + U.esc(t('search.emptyQuery')) + '</div>' + '</div>';
    }
    if (!results.length) return '<div class="panel"><div class="mini-empty pad big">' + U.esc(t('common.noResults')) + '</div></div>';

    var shown = results.slice(0, 200);
    return '<div class="result-list">' + shown.map(function (r) {
      var c = r.card;
      var snippet = r.hit === 'body' ? c.body : r.hit === 'note' ? c.note : r.hit === 'tags' ? (c.tags || []).join(' · ') : c.body || c.note || '';
      return '<div class="result-row' + (st.sel[c.id] ? ' selected' : '') + '" data-result="' + c.id + '">' +
        '<input type="checkbox" data-check="' + c.id + '"' + (st.sel[c.id] ? ' checked' : '') + '>' +
        '<div class="rr-body">' +
          '<div class="rr-head"><span class="rr-title">' + hl(c.title || t('common.untitled'), st.q) + '</span>' +
            (r.hit ? '<span class="hit-badge">' + U.esc(t('search.in' + cap(r.hit))) + '</span>' : '') +
            (pend[c.id] ? '<span class="pend-badge">' + pend[c.id] + '</span>' : '') +
          '</div>' +
          (snippet ? '<div class="rr-snippet">' + hl(String(snippet).slice(0, 160), st.q) + '</div>' : '') +
          '<div class="rr-meta">' + (c.tags || []).slice(0, 3).map(function (tg) {
            return '<span class="mini-chip">' + U.esc(tg) + '</span>';
          }).join('') +
            (idx[c.id] ? '<span class="rr-inmap">' + U.icon('map', 12) + idx[c.id].map(function (m) { return U.esc(m.name); }).join(', ') + '</span>' : '<span class="rr-inmap out">' + U.esc(t('cards.unmapped')) + '</span>') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
      (results.length > shown.length ? '<div class="trunc-note">' + U.esc(t('common.moreHidden', { n: results.length - shown.length })) + '</div>' : '') +
      '</div>';
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function renderRelations() {
    var types = {};
    S.maps().forEach(function (m) {
      m.edges.forEach(function (e) {
        var a = S.card(e.from), b = S.card(e.to);
        if (!a || !b || a.deletedAt || b.deletedAt) return;
        (types[e.type] = types[e.type] || []).push({ m: m, e: e, a: a, b: b });
      });
    });
    var keys = Object.keys(types);
    if (!keys.length) return '<div class="panel"><div class="mini-empty pad big">' + U.esc(t('common.empty')) + '</div></div>';
    return '<div class="relation-groups">' + keys.sort(function (x, y) { return types[y].length - types[x].length; }).map(function (k) {
      if (st.relationType && st.relationType !== k) return '';
      return '<section class="panel rel-card">' +
        '<div class="hc-head"><h3>' + U.esc(t('edge.' + k)) + '</h3><span class="hc-count">' + types[k].length + '</span></div>' +
        '<div class="hc-list">' + types[k].slice(0, 8).map(function (r) {
          return '<div class="hc-item static">' +
            '<span class="hci-title">' + U.esc(r.a.title || '?') + ' <em>→</em> ' + U.esc(r.b.title || '?') + '</span>' +
            '<span class="hci-sub">' + U.esc(r.m.name) + (r.e.uncertain ? ' · ' + U.esc(t('map.dubious')) : '') + '</span>' +
            '<button class="icon-btn xs" data-map="' + r.m.id + '" data-jump="' + r.a.id + '">' + U.icon('focus', 12) + '</button>' +
          '</div>';
        }).join('') + '</div>' +
        (types[k].length > 8 ? '<div class="trunc-note">' + U.esc(t('common.moreHidden', { n: types[k].length - 8 })) + '</div>' : '') +
      '</section>';
    }).join('') + '</div>';
  }

  function renderStructure() {
    var h = S.health();
    var groups = [
      { key: 'isolated', items: h.isolated, label: t('search.isolated'), render: function (it) {
        return '<div class="hc-item static"><span class="hci-title">' + U.esc(it.card.title || '?') + '</span><span class="hci-sub">' + U.esc(it.map.name) + '</span>' +
          '<button class="icon-btn xs" data-map="' + it.map.id + '" data-jump="' + it.card.id + '">' + U.icon('focus', 12) + '</button></div>';
      } },
      { key: 'deepest', items: h.deepest ? [h.deepest] : [], label: t('search.deepest'), render: function (it) {
        return '<div class="hc-item static"><span class="hci-title">' + U.esc(S.cardTitle(it.card)) + '</span><span class="hci-sub">' + U.esc(it.map.name) + ' · depth ' + it.depth + '</span>' +
          '<button class="icon-btn xs" data-map="' + it.map.id + '" data-jump="' + it.card.id + '">' + U.icon('focus', 12) + '</button></div>';
      } },
      { key: 'duplicates', items: h.duplicates, more: Math.max(0, (h.duplicateTotal || 0) - h.duplicates.length), label: t('search.duplicates'), render: function (it) {
        return '<div class="hc-item static"><span class="hci-title">' + U.esc(it.a.title || '?') + ' ≈ ' + U.esc(it.b.title || '?') + '</span>' +
          '<button class="mini-btn accent" data-merge="' + it.a.id + '" data-b="' + it.b.id + '">' + U.esc(t('common.merge')) + '</button></div>';
      } },
      { key: 'broken', items: h.broken, label: t('search.broken'), render: function (it) {
        return '<div class="hc-item static"><span class="hci-title">' + U.esc(t('search.brokenHint')) + '</span><span class="hci-sub">' + U.esc(it.map.name) + '</span></div>';
      } }
    ].filter(function (g) { return g.items.length; });

    if (!groups.length) return '<div class="panel"><div class="mini-empty pad big">' + U.esc(t('search.noStructure')) + '</div></div>';
    return '<div class="relation-groups">' + groups.map(function (g) {
      var total = g.items.length + (g.more || 0);
      return '<section class="panel rel-card"><div class="hc-head"><h3>' + U.esc(g.label) + '</h3><span class="hc-count">' + g.items.length + '</span></div>' +
        '<div class="hc-list">' + g.items.slice(0, 8).map(g.render).join('') + '</div>' +
        (total > 8 ? '<div class="trunc-note">' + U.esc(t('common.moreHidden', { n: total - 8 })) + '</div>' : '') + '</section>';
    }).join('') + '</div>';
  }

  function rerender(root) {
    var ae = document.activeElement;
    var wasQ = !!(ae && ae.id === 'q');
    var pos = wasQ ? ae.selectionStart : null;
    mount(root);
    if (wasQ) {
      var q = root.querySelector('#q');
      if (q) { q.focus(); if (pos != null) q.setSelectionRange(pos, pos); }
    }
  }

  /* public */
  function setQuery(q) {
    st.q = q || '';
    st.tab = 'text';
    st.sel = {};
  }

  function setTag(tag, field) {
    if (field === 'langs') { st.langs = [tag]; st.tags = []; }
    else { st.tags = [tag]; st.langs = []; }
    st.q = '';
    st.tab = 'text';
  }

  CC.search = {
    mount: mount, setQuery: setQuery, setTag: setTag
  };
})();
