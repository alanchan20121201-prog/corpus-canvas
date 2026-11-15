/* Main views: home, outline, corpus cards, checkup, history, trash */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store, L = CC.layout;
  var t = function () { return window.t.apply(null, arguments); };

  var cardSel = {};
  var cardFilter = 'all';
  var cardQuery = '';
  var cardSort = 'updated';
  var cardLimit = 400;
  var healthAll = {};

  /* ------------------------------------------------------------------ */
  /* shared bits                                                        */
  /* ------------------------------------------------------------------ */

  function head(title, sub, actions, iconName) {
    return '<div class="page-head">' +
      '<div class="ph-left">' +
        '<h1 class="page-title">' + (iconName ? '<span class="pt-ico">' + U.icon(iconName, 20) + '</span>' : '') + U.esc(title) + '</h1>' +
        (sub ? '<p class="page-sub">' + U.esc(sub) + '</p>' : '') +
      '</div>' +
      '<div class="page-actions">' + (actions || '') + '</div>' +
    '</div>';
  }

  function tagChips(tags, cls) {
    if (!tags || !tags.length) return '';
    return tags.slice(0, 4).map(function (tg) {
      return '<span class="mini-chip ' + (cls || '') + '">' + U.esc(tg) + '</span>';
    }).join('') + (tags.length > 4 ? '<span class="mini-chip more">+' + (tags.length - 4) + '</span>' : '');
  }

  function emptyState(title, sub, actionHtml, art) {
    return '<div class="empty-state">' +
      '<div class="empty-art">' + (art || defaultArt()) + '</div>' +
      '<h3>' + U.esc(title) + '</h3>' +
      (sub ? '<p>' + U.esc(sub) + '</p>' : '') +
      (actionHtml || '') +
    '</div>';
  }

  function defaultArt() {
    return '<svg viewBox="0 0 120 90" width="140" height="105" fill="none">' +
      '<rect x="40" y="34" width="40" height="24" rx="8" stroke="currentColor" stroke-width="1.3" opacity=".5"/>' +
      '<rect x="6" y="10" width="28" height="17" rx="6" stroke="currentColor" stroke-width="1.1" opacity=".3"/>' +
      '<rect x="86" y="14" width="28" height="17" rx="6" stroke="currentColor" stroke-width="1.1" opacity=".3"/>' +
      '<rect x="12" y="62" width="28" height="17" rx="6" stroke="currentColor" stroke-width="1.1" opacity=".3"/>' +
      '<rect x="80" y="60" width="28" height="17" rx="6" stroke="currentColor" stroke-width="1.1" opacity=".3"/>' +
      '<path d="M34 19c10 4 12 8 8 15M86 23c-10 4-12 8-8 12M40 70c10-2 12-6 8-10M80 68c-9-2-11-6-9-9" stroke="currentColor" stroke-width="1.1" opacity=".35"/>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* home                                                               */
  /* ------------------------------------------------------------------ */

  function home(root) {
    var live = S.cards();
    var maps = S.maps();
    var pending = S.pendingCount();
    var inMap = {};
    maps.forEach(function (m) { S.mapCards(m).forEach(function (c) { inMap[c.id] = 1; }); });
    var unmapped = live.filter(function (c) { return !inMap[c.id]; }).length;
    var week = live.filter(function (c) { return c.createdAt > Date.now() - 7 * 86400000; }).length;
    var offline = !aiReady();

    var recent = maps.slice(0, 6);

    root.innerHTML =
      '<div class="home">' +
        '<section class="hero">' +
          '<div class="hero-copy">' +
            '<p class="eyebrow"><span class="dot-accent"></span>Corpus Canvas</p>' +
            '<h1 class="hero-title">' + U.esc(t('home.title')) + '</h1>' +
            '<p class="hero-sub">' + U.esc(t('home.sub')) + '</p>' +
            '<div class="hero-actions">' +
              '<button class="btn primary lg" data-act="new-map">' + U.icon('plus', 16) + '<span>' + U.esc(t('home.quickNewMap')) + '</span></button>' +
              '<button class="btn ghost lg" data-act="import">' + U.icon('upload', 16) + '<span>' + U.esc(t('home.quickImport')) + '</span></button>' +
            '</div>' +
            (offline ? '<p class="hero-note">' + U.icon('info', 13) + '<span>' + U.esc(t('home.offline')) + '</span></p>' : '') +
          '</div>' +
          '<div class="hero-art">' + heroArt() + '</div>' +
        '</section>' +

        '<section class="glance">' +
          statCard('cards', live.length, t('home.statCards'), 'cards', 'cards') +
          statCard('maps', maps.length, t('home.statMaps'), 'map', 'map') +
          statCard('pending', pending, t('home.statPending'), 'sparkles', 'search') +
          statCard('unmapped', unmapped, t('home.statUnmapped'), 'alert', 'health') +
          statCard('week', week, t('home.statWeek'), 'history', 'history') +
        '</section>' +

        '<div class="home-grid">' +
          '<section class="panel recent-panel">' +
            '<div class="panel-head"><h2>' + U.esc(t('home.recent')) + '</h2>' +
              '<button class="mini-btn" data-act="all-maps">' + U.esc(t('nav.map')) + U.icon('arrow', 13) + '</button></div>' +
            (recent.length ? '<div class="map-grid">' + recent.map(function (m) {
              return '<button class="map-tile" data-map="' + m.id + '">' +
                '<div class="tile-art">' + miniMap(m) + '</div>' +
                '<div class="tile-meta"><span class="tile-name">' + U.esc(m.name) + '</span>' +
                '<span class="tile-sub">' + S.mapCards(m).length + ' · ' + U.esc(U.relTime(m.updatedAt)) + '</span></div>' +
              '</button>';
            }).join('') + '</div>' :
              emptyState(t('home.recentEmpty'), '', '<div class="hero-actions">' +
                '<button class="btn primary" data-act="new-map">' + t('map.new') + '</button>' +
                (live.length ? '' : '<button class="btn ghost" data-act="demo">' + t('demo.load') + '</button>') +
                '</div>', defaultArt())) +
            (maps.length > 6 ? '<button class="link-more" data-act="all-maps">' + U.esc(t('common.more')) + ' →</button>' : '') +
          '</section>' +

          '<section class="panel cost-panel">' +
            '<div class="panel-head"><h2>' + U.esc(t('home.costTitle')) + '</h2></div>' +
            '<p class="panel-text">' + U.esc(t('home.costBody')) + '</p>' +
            '<div class="info-row">' + U.icon('shield', 16) + '<div><strong>' + U.esc(t('home.privacyTitle')) + '</strong><p>' + U.esc(t('home.privacyBody')) + '</p></div></div>' +
            '<div class="info-row">' + U.icon('cloud', 16) + '<div><strong>' + U.esc(t('home.networkTitle')) + '</strong><p>' + U.esc(t('home.networkBody')) + '</p></div></div>' +
            '<button class="btn ghost sm" data-act="settings">' + U.icon('settings', 14) + '<span>' + U.esc(t('nav.settings')) + '</span></button>' +
          '</section>' +
        '</div>' +

        '<p class="home-foot">' + U.icon('info', 13) + '<span>' + U.esc(t('home.resumeHint')) + '</span></p>' +
      '</div>';

    root.querySelectorAll('[data-act="new-map"]').forEach(function (b) { b.onclick = function () { CC.app.newMapFlow(); }; });
    root.querySelectorAll('[data-act="import"]').forEach(function (b) { b.onclick = function () { CC.importer.open(); }; });
    root.querySelectorAll('[data-act="settings"]').forEach(function (b) { b.onclick = function () { CC.app.nav('settings'); }; });
    root.querySelectorAll('[data-act="all-maps"]').forEach(function (b) { b.onclick = function () { CC.app.nav('map'); }; });
    root.querySelectorAll('[data-act="demo"]').forEach(function (b) { b.onclick = function () { CC.demo.load(); }; });
    root.querySelectorAll('[data-map]').forEach(function (b) {
      b.onclick = function () { CC.app.goMap(b.getAttribute('data-map')); };
    });
    root.querySelectorAll('[data-stat]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-stat');
        if (k === 'cards' || k === 'week') { cardFilter = 'all'; CC.app.nav('cards'); }
        else if (k === 'maps') CC.app.nav('map');
        else if (k === 'pending') CC.app.openReviewPanel();
        else if (k === 'unmapped') { cardFilter = 'unmapped'; CC.app.nav('cards'); }
      };
    });
  }

  function aiReady() {
    var ai = S.settings().ai || {};
    return !!(ai.baseUrl && ai.model && (ai.hasKey || ai.local));
  }

  function statCard(key, value, label, iconName, nav) {
    return '<button class="stat" data-stat="' + key + '">' +
      '<span class="stat-ico">' + U.icon(iconName, 16) + '</span>' +
      '<span class="stat-value">' + value + '</span>' +
      '<span class="stat-label">' + U.esc(label) + '</span>' +
    '</button>';
  }

  function heroArt() {
    return '<svg viewBox="0 0 420 300" class="hero-svg" fill="none">' +
      '<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="var(--accent)" stop-opacity=".18"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' +
      '<circle cx="210" cy="150" r="120" fill="url(#hg)"/>' +
      '<path d="M210 150C150 120 120 90 78 78M210 150c60-18 92-40 128-52M210 150c-52 30-84 54-108 88M210 150c56 26 86 44 112 74" stroke="var(--accent)" stroke-width="1.2" opacity=".35"/>' +
      '<rect x="168" y="126" width="84" height="44" rx="14" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.4"/>' +
      '<rect x="180" y="140" width="42" height="5" rx="2.5" fill="var(--accent)" opacity=".55"/>' +
      '<rect x="180" y="151" width="58" height="5" rx="2.5" fill="var(--text)" opacity=".18"/>' +
      '<rect x="44" y="58" width="66" height="30" rx="11" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="1.1"/>' +
      '<rect x="56" y="70" width="38" height="5" rx="2.5" fill="var(--text)" opacity=".22"/>' +
      '<rect x="312" y="46" width="70" height="30" rx="11" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="1.1"/>' +
      '<rect x="324" y="58" width="42" height="5" rx="2.5" fill="var(--text)" opacity=".22"/>' +
      '<rect x="74" y="212" width="76" height="30" rx="11" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="1.1"/>' +
      '<rect x="86" y="224" width="46" height="5" rx="2.5" fill="var(--text)" opacity=".22"/>' +
      '<rect x="296" y="206" width="70" height="30" rx="11" fill="var(--surface)" stroke="var(--border-strong)" stroke-width="1.1"/>' +
      '<rect x="308" y="218" width="38" height="5" rx="2.5" fill="var(--text)" opacity=".22"/>' +
      '<circle cx="210" cy="150" r="16" fill="var(--accent)" opacity=".08"/>' +
      '</svg>';
  }

  function miniMap(m) {
    if (S.mapCards(m).length > 600) return '<div class="tile-empty big"></div>';
    var model = L.compute(m, {});
    var ids = Object.keys(model.nodes);
    if (!ids.length) return '<div class="tile-empty"></div>';
    var b = model.bounds;
    var pad = 10;
    var vb = (b.minX - pad) + ' ' + (b.minY - pad) + ' ' + Math.max(b.w + pad * 2, 40) + ' ' + Math.max(b.h + pad * 2, 30);
    var html = '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet">';
    model.edges.slice(0, 40).forEach(function (e) {
      var a = model.nodes[e.from], c = model.nodes[e.to];
      if (!a || !c) return;
      html += '<path d="M' + a.x + ',' + a.y + ' L' + c.x + ',' + c.y + '" stroke="var(--border-strong)" stroke-width="2" opacity=".55"/>';
    });
    ids.slice(0, 16).forEach(function (id, i) {
      var n = model.nodes[id];
      html += '<rect x="' + (n.x - n.w / 2) + '" y="' + (n.y - n.h / 2) + '" width="' + n.w + '" height="' + n.h + '" rx="8" ' +
        'fill="' + (i === 0 ? 'var(--accent-soft)' : 'var(--surface)') + '" stroke="' + (i === 0 ? 'var(--accent)' : 'var(--border-strong)') + '" stroke-width="1.5"/>';
    });
    html += '</svg>';
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* outline                                                            */
  /* ------------------------------------------------------------------ */

  function outline(root) {
    var m = S.currentMap();
    if (!m) {
      root.innerHTML = head(t('outline.title'), '', '<button class="btn primary" data-act="new-map">' + U.icon('plus', 15) + t('map.new') + '</button>', 'outline') +
        '<div class="panel">' + emptyState(t('outline.empty'), t('outline.emptyHint'), '<button class="btn" data-act="new-map">' + t('map.new') + '</button>') + '</div>';
      root.querySelectorAll('[data-act="new-map"]').forEach(function (b) { b.onclick = function () { CC.app.newMapFlow(); }; });
      return;
    }
    var cards = S.mapCards(m);
    var children = {};
    var hasParent = {};
    cards.forEach(function (c) { children[c.id] = []; });
    m.edges.forEach(function (e) {
      if (e.type !== 'hierarchy') return;
      if (!children[e.from] || !children[e.to]) return;
      children[e.from].push(e.to);
      hasParent[e.to] = true;
    });
    var roots = cards.filter(function (c) { return !hasParent[c.id]; }).map(function (c) { return c.id; });
    var collapsed = {};
    m.collapsed.forEach(function (id) { collapsed[id] = 1; });

    var rows = '';
    var rowCount = 0;
    function walk(id, depth) {
      if (rowCount > 1500) return;
      rowCount++;
      var c = S.card(id);
      if (!c) return;
      var kids = children[id] || [];
      rows += '<div class="ol-row" data-id="' + id + '" style="--depth:' + depth + '">' +
        '<div class="ol-gutter">' +
          (kids.length ? '<button class="ol-toggle' + (collapsed[id] ? ' closed' : '') + '" data-toggle="' + id + '">' + U.icon('chevron', 13) + '</button>' : '<span class="ol-leaf"></span>') +
        '</div>' +
        '<span class="ol-bullet" style="--c:' + (depth === 0 ? 'var(--accent)' : 'var(--border-strong)') + '"></span>' +
        '<input class="ol-title" value="' + U.esc(c.title) + '" placeholder="' + U.esc(t('common.untitled')) + '" data-card="' + id + '">' +
        '<span class="ol-marks">' +
          (c.note ? '<span class="ol-mark" title="' + U.esc(t('outline.noteOn')) + '">' + U.icon('note', 12) + '</span>' : '') +
          ((c.tags || []).length ? '<span class="ol-mark tag">' + U.esc(c.tags[0]) + ((c.tags.length > 1) ? '+' + (c.tags.length - 1) : '') + '</span>' : '') +
        '</span>' +
        '<span class="ol-actions">' +
          '<button class="icon-btn xs" data-child="' + id + '" title="' + U.esc(t('outline.addChild')) + '">' + U.icon('plus', 13) + '</button>' +
          '<button class="icon-btn xs" data-open="' + id + '" title="' + U.esc(t('common.edit')) + '">' + U.icon('edit', 13) + '</button>' +
        '</span>' +
      '</div>';
      if (!collapsed[id]) kids.forEach(function (k) { walk(k, depth + 1); });
    }
    roots.forEach(function (r) { walk(r, 0); });

    root.innerHTML = head(t('outline.title'), t('outline.hint'),
      '<span class="map-pill">' + U.icon('map', 14) + U.esc(m.name) + '</span>' +
      '<button class="btn sm" data-act="expand">' + U.esc(t('outline.expandAll')) + '</button>' +
      '<button class="btn sm" data-act="collapse">' + U.esc(t('outline.collapseAll')) + '</button>' +
      '<button class="btn primary sm" data-act="add-root">' + U.icon('plus', 14) + U.esc(t('map.addNode')) + '</button>', 'outline') +
      '<div class="outline-shell panel">' +
        '<div class="ol-head">' +
          '<span class="sync-badge">' + U.icon('restore', 13) + U.esc(t('outline.sync')) + '</span>' +
          '<span class="ol-tip">' + U.esc(t('outline.tabHint')) + '</span>' +
        '</div>' +
        '<div class="ol-body">' + (rows || '<div class="mini-empty pad">' + U.esc(t('outline.empty')) + '</div>') + '</div>' +
      '</div>';

    root.querySelector('[data-act="add-root"]').onclick = function () {
      var c = null;
      S.commit('create', t('map.addNode'), function () {
        c = S.newCard({ title: '' }, true);
        var card = S.card(c.id);
        m.positions[c.id] = { x: 0, y: 0 };
        if (cards.length) {
          m.edges.push({ id: U.uid('e'), from: cards[0].id, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: false });
        }
      });
      CC.inspector.open(c.id, { focusTitle: true });
    };
    root.querySelector('[data-act="expand"]').onclick = function () {
      S.commit('structure', t('outline.expandAll'), function () { m.collapsed = []; });
    };
    root.querySelector('[data-act="collapse"]').onclick = function () {
      S.commit('structure', t('outline.collapseAll'), function () {
        m.collapsed = cards.filter(function (c) { return (children[c.id] || []).length; }).map(function (c) { return c.id; });
      });
    };

    root.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var id = b.getAttribute('data-toggle');
        var i = m.collapsed.indexOf(id);
        if (i >= 0) m.collapsed.splice(i, 1); else m.collapsed.push(id);
        S.touch();
      };
    });
    root.querySelectorAll('[data-child]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        CC.app.outlineAddChild(m, b.getAttribute('data-child'));
      };
    });
    root.querySelectorAll('[data-open]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        CC.inspector.open(b.getAttribute('data-open'));
      };
    });

    root.querySelectorAll('.ol-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('input,button')) return;
        CC.inspector.open(row.getAttribute('data-id'));
      });
    });

    root.querySelectorAll('.ol-title').forEach(function (input) {
      var before = null;
      input.addEventListener('focus', function () { before = S.snapshotState(); });
      input.addEventListener('input', function () {
        var c = S.card(input.getAttribute('data-card'));
        if (!c) return;
        if (!before) before = S.snapshotState();
        S.quiet(function () { S.updateCard(c.id, { title: input.value }); S.saveSoon(); });
      });
      input.addEventListener('keydown', function (e) {
        var id = input.getAttribute('data-card');
        if (e.key === 'Enter') { e.preventDefault(); CC.app.outlineAddSibling(m, id); }
        else if (e.key === 'Tab') { e.preventDefault(); e.shiftKey ? outlineOutdent(m, id) : outlineIndent(m, id); }
        else if (e.key === 'Escape') input.blur();
      });
      input.addEventListener('blur', function () {
        if (before) { S.emit(); S.markEdit('edit', t('history.kind.edit'), before); before = null; }
      });
    });
  }

  function outlineSiblings(m, id) {
    var pid = S.parentOf(m, id);
    if (!pid) return { pid: null, list: [] };
    var list = m.edges.filter(function (e) { return e.type === 'hierarchy' && e.from === pid; }).map(function (e) { return e.to; });
    return { pid: pid, list: list };
  }

  function outlineIndent(m, id) {
    var s = outlineSiblings(m, id);
    if (!s.pid) return;
    var idx = s.list.indexOf(id);
    if (idx <= 0) return;
    var prev = s.list[idx - 1];
    S.commit('structure', t('outline.indent'), function () {
      m.edges = m.edges.filter(function (e) { return !(e.type === 'hierarchy' && e.from === s.pid && e.to === id); });
      m.edges.push({ id: U.uid('e'), from: prev, to: id, type: 'hierarchy', color: '', label: '', uncertain: false });
      m.offsets = {};
    });
  }

  function outlineOutdent(m, id) {
    var pid = S.parentOf(m, id);
    if (!pid) return;
    var gpid = S.parentOf(m, pid);
    if (!gpid) return;
    S.commit('structure', t('outline.outdent'), function () {
      m.edges = m.edges.filter(function (e) { return !(e.type === 'hierarchy' && e.from === pid && e.to === id); });
      m.edges.push({ id: U.uid('e'), from: gpid, to: id, type: 'hierarchy', color: '', label: '', uncertain: false });
      m.offsets = {};
    });
  }

  /* ------------------------------------------------------------------ */
  /* cards                                                              */
  /* ------------------------------------------------------------------ */

  function cards(root) {
    var maps = S.maps();
    var inMap = {};
    maps.forEach(function (m) { S.mapCards(m).forEach(function (c) { inMap[c.id] = (inMap[c.id] || 0) + 1; }); });
    var list = S.cards().filter(function (c) {
      if (cardFilter === 'unmapped' && inMap[c.id]) return false;
      if (cardFilter === 'mapped' && !inMap[c.id]) return false;
      if (!cardQuery) return true;
      var q = cardQuery.toLowerCase();
      return (c.title + ' ' + c.body + ' ' + c.note + ' ' + (c.tags || []).join(' ')).toLowerCase().indexOf(q) >= 0;
    });
    if (cardSort === 'title') list.sort(function (a, b) { return String(a.title).localeCompare(String(b.title), 'zh'); });
    else if (cardSort === 'created') list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    else list.sort(function (a, b) { return b.updatedAt - a.updatedAt; });

    Object.keys(cardSel).forEach(function (id) { if (!S.card(id)) delete cardSel[id]; });
    var selCount = Object.keys(cardSel).length;

    root.innerHTML = head(t('cards.title'), t('cards.hint'),
      '<button class="btn sm" data-act="batch">' + U.icon('check', 14) + U.esc(t('common.selectAll')) + '</button>', 'cards') +
      '<div class="cards-toolbar panel">' +
        '<div class="segmented">' +
          ['all', 'unmapped', 'mapped'].map(function (k) {
            return '<button class="seg' + (cardFilter === k ? ' active' : '') + '" data-filter="' + k + '">' +
              U.esc(t('cards.' + (k === 'mapped' ? 'inMaps' : k))) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="filter-input">' + U.icon('search', 15) +
          '<input id="card-q" placeholder="' + U.esc(t('cards.filterPlaceholder')) + '" value="' + U.esc(cardQuery) + '">' +
        '</div>' +
        '<div class="sort-box">' + U.icon('sort', 14) +
          '<select id="card-sort">' +
            '<option value="updated"' + (cardSort === 'updated' ? ' selected' : '') + '>' + U.esc(t('cards.sortUpdated')) + '</option>' +
            '<option value="created"' + (cardSort === 'created' ? ' selected' : '') + '>' + U.esc(t('cards.sortCreated')) + '</option>' +
            '<option value="title"' + (cardSort === 'title' ? ' selected' : '') + '>' + U.esc(t('cards.sortTitle')) + '</option>' +
          '</select></div>' +
      '</div>' +
      '<div class="table panel">' +
        '<div class="tr th">' +
          '<span class="td check"><input type="checkbox" id="sel-all"></span>' +
          '<span class="td main-col">' + U.esc(t('cards.colTitle')) + '</span>' +
          '<span class="td tags-col">' + U.esc(t('cards.colTags')) + '</span>' +
          '<span class="td maps-col">' + U.esc(t('cards.colMaps')) + '</span>' +
          '<span class="td time-col">' + U.esc(t('cards.colUpdated')) + '</span>' +
        '</div>' +
        (list.length ? list.slice(0, cardLimit).map(function (c) {
          return '<div class="tr' + (cardSel[c.id] ? ' selected' : '') + '" data-row="' + c.id + '">' +
            '<span class="td check"><input type="checkbox" data-check="' + c.id + '"' + (cardSel[c.id] ? ' checked' : '') + '></span>' +
            '<span class="td main-col"><span class="row-title">' + U.esc(c.title || t('common.untitled')) + '</span>' +
              (c.note ? '<span class="row-note">' + U.esc(c.note.slice(0, 60)) + '</span>' : '') + '</span>' +
            '<span class="td tags-col">' + (tagChips(c.tags) || '<span class="muted">—</span>') + '</span>' +
            '<span class="td maps-col">' + (inMap[c.id] ? '<span class="count-badge">' + inMap[c.id] + '</span>' : '<span class="muted">—</span>') + '</span>' +
            '<span class="td time-col">' + U.esc(U.relTime(c.updatedAt)) + '</span>' +
          '</div>';
        }).join('') :
          '<div class="table-empty">' + U.esc(t('common.noResults')) + '</div>') +
        (list.length > cardLimit ? '<div class="list-cap"><button class="mini-btn" data-act="more">' +
          U.esc(t('common.loadMore', { n: list.length - cardLimit })) + '</button></div>' : '') +
      '</div>' +
      (selCount ? '<div class="batch-bar">' +
        '<span class="bb-count">' + U.esc(t('common.selected', { n: selCount })) + '</span>' +
        '<button class="bb-btn" data-bact="tags">' + U.icon('tag', 14) + U.esc(t('cards.batchTags')) + '</button>' +
        '<button class="bb-btn" data-bact="category">' + U.icon('folder', 14) + U.esc(t('cards.batchCategory')) + '</button>' +
        '<button class="bb-btn danger" data-bact="delete">' + U.icon('trash', 14) + U.esc(t('cards.batchDelete')) + '</button>' +
        '<button class="bb-close" data-bact="clear">' + U.icon('close', 14) + '</button>' +
      '</div>' : '') +
      (list.length ? '' : '<div class="panel" style="margin-top:16px">' + emptyState(t('cards.empty'), t('cards.emptyHint')) + '</div>');

    root.querySelectorAll('[data-act="batch"]').forEach(function (b) {
      b.onclick = function () {
        list.forEach(function (c) { cardSel[c.id] = 1; });
        cards(root);
      };
    });
    root.querySelectorAll('[data-filter]').forEach(function (b) {
      b.onclick = function () { cardFilter = b.getAttribute('data-filter'); cardLimit = 400; cards(root); };
    });
    var more = root.querySelector('[data-act="more"]');
    if (more) more.onclick = function () { cardLimit += 400; cards(root); };
    var q = root.querySelector('#card-q');
    if (q) {
      var runFilter = U.debounce(function (value) {
        cardQuery = value;
        cards(root);
        var nq = root.querySelector('#card-q');
        if (nq && value) { nq.focus(); nq.setSelectionRange(value.length, value.length); }
      }, 220);
      q.addEventListener('input', function () { runFilter(q.value); });
    }
    var sortSel = root.querySelector('#card-sort');
    if (sortSel) sortSel.onchange = function () { cardSort = sortSel.value; cards(root); };

    var selAll = root.querySelector('#sel-all');
    if (selAll) {
      selAll.checked = list.length > 0 && list.every(function (c) { return cardSel[c.id]; });
      selAll.onchange = function () {
        if (selAll.checked) list.forEach(function (c) { cardSel[c.id] = 1; });
        else cardSel = {};
        cards(root);
      };
    }
    root.querySelectorAll('[data-check]').forEach(function (cb) {
      cb.onchange = function () {
        var id = cb.getAttribute('data-check');
        if (cb.checked) cardSel[id] = 1; else delete cardSel[id];
        cards(root);
      };
    });
    root.querySelectorAll('[data-row]').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('input')) return;
        CC.app.openCard(row.getAttribute('data-row'));
      });
    });
    root.querySelectorAll('[data-bact]').forEach(function (b) {
      b.onclick = function () {
        var act = b.getAttribute('data-bact');
        var ids = Object.keys(cardSel);
        if (act === 'clear') { cardSel = {}; cards(root); return; }
        if (!ids.length) return;
        if (act === 'delete') {
          U.confirm(t('cards.batchDelete'), t('cards.batchHint', { n: ids.length }) + ' ' + t('common.cannotUndo'), { danger: true })
            .then(function (ok) {
              if (!ok) return;
              S.commit('batch', t('cards.batchDelete'), function () { ids.forEach(function (id) { S.trashCard(id); }); }, { snapshot: true });
              cardSel = {};
            });
          return;
        }
        var label = act === 'tags' ? t('cards.batchTags') : t('cards.batchCategory');
        U.prompt(label, '', { placeholder: act === 'tags' ? t('cards.tagsPlaceholder') : t('cards.categoryPlaceholder') })
          .then(function (v) {
            if (!v) return;
            S.commit('batch', label, function () {
              ids.forEach(function (id) {
                var c = S.card(id);
                if (!c) return;
                if (act === 'category') c.category = v;
                else {
                  var arr = c[act] || [];
                  if (!arr.some(function (x) { return String(x).toLowerCase() === v.toLowerCase(); })) arr.push(v);
                  c[act] = arr;
                }
                c.updatedAt = Date.now();
              });
            }, { snapshot: true });
            cardSel = {};
            cards(root);
          });
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* health                                                             */
  /* ------------------------------------------------------------------ */

  function health(root) {
    var h = S.health();
    var total = h.unmapped.length + h.isolated.length + h.dubious.length + h.duplicates.length + h.broken.length;
    var sections = [
      { key: 'unmapped', title: t('health.unmapped'), hint: t('health.unmappedHint'), items: h.unmapped, render: function (c) { return cardLine(c, function () { CC.app.openCard(c.id); }); } },
      { key: 'isolated', title: t('health.isolated'), hint: t('health.isolatedHint'), items: h.isolated, render: function (it) { return nodeLine(it); } },
      { key: 'dubious', title: t('health.dubious'), hint: t('health.dubiousHint'), items: h.dubious, render: function (it) { return edgeLine(it); } },
      { key: 'duplicates', title: t('health.duplicates'), hint: t('health.duplicatesHint'), items: h.duplicates, render: function (it) { return dupLine(it); } },
      { key: 'broken', title: t('health.broken'), hint: t('health.brokenHint'), items: h.broken, render: function (it) { return brokenLine(it); } }
    ];

    root.innerHTML = head(t('health.title'), t('health.hint'),
      '<button class="btn sm" data-act="map-unmapped"' + (h.unmapped.length ? '' : ' disabled') + '>' + U.icon('map', 14) + U.esc(t('health.createMap')) + '</button>', 'health') +
      (total ? '<div class="health-summary">' +
        '<span class="hs-big">' + total + '</span><span class="hs-label">' + U.esc(t('health.count', { n: '' }).replace('{n}', '').trim()) + '</span>' +
      '</div>' : '') +
      (total ? '<div class="health-grid">' + sections.filter(function (s) { return s.items.length; }).map(function (s) {
        return '<section class="panel health-card">' +
          '<div class="hc-head"><h3>' + U.esc(s.title) + '</h3><span class="hc-count">' + s.items.length + '</span></div>' +
          '<p class="hc-hint">' + U.esc(s.hint) + '</p>' +
          '<div class="hc-list">' + (healthAll[s.key] ? s.items : s.items.slice(0, 6)).map(s.render).join('') + '</div>' +
          (s.items.length > 6 ? '<button class="hc-more" data-expand="' + s.key + '">' +
            (healthAll[s.key] ? t('common.collapse') : '+' + (s.items.length - 6)) + '</button>' : '') +
        '</section>';
      }).join('') + '</div>' :
        '<div class="panel">' + emptyState(t('health.allGood'), t('health.allGoodHint'), '', allGoodArt()) + '</div>');

    root.querySelectorAll('[data-card]').forEach(function (b) {
      b.onclick = function () { CC.app.openCard(b.getAttribute('data-card')); };
    });
    root.querySelectorAll('[data-map]').forEach(function (b) {
      b.onclick = function () { CC.app.goMap(b.getAttribute('data-map'), b.getAttribute('data-card')); };
    });
    root.querySelectorAll('[data-merge]').forEach(function (b) {
      b.onclick = function () { CC.app.mergeFlow(b.getAttribute('data-a'), b.getAttribute('data-b')); };
    });
    root.querySelectorAll('[data-expand]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-expand');
        healthAll[k] = !healthAll[k];
        health(root);
      };
    });
    var mu = root.querySelector('[data-act="map-unmapped"]');
    if (mu) mu.onclick = function () {
      if (!h.unmapped.length) return;
      CC.app.createMapFromCards(h.unmapped.map(function (c) { return c.id; }), t('health.unmapped'));
    };
  }

  function cardLine(c, fn) {
    return '<button class="hc-item" data-card="' + c.id + '"><span class="hci-title">' + U.esc(c.title || t('common.untitled')) + '</span>' +
      '<span class="hci-sub">' + U.esc(U.relTime(c.updatedAt)) + '</span></button>';
  }

  function nodeLine(it) {
    return '<button class="hc-item" data-map="' + it.map.id + '" data-card="' + it.card.id + '">' +
      '<span class="hci-title">' + U.esc(it.card.title || t('common.untitled')) + '</span>' +
      '<span class="hci-sub">' + U.esc(it.map.name) + '</span></button>';
  }

  function edgeLine(it) {
    var a = S.card(it.edge.from), b = S.card(it.edge.to);
    return '<button class="hc-item" data-map="' + it.map.id + '" data-card="' + it.edge.from + '">' +
      '<span class="hci-title">' + U.esc((a ? a.title : '?') + ' → ' + (b ? b.title : '?')) + '</span>' +
      '<span class="hci-sub">' + U.esc(t('edge.' + it.edge.type)) + ' · ' + U.esc(it.map.name) + '</span></button>';
  }

  function dupLine(it) {
    return '<div class="hc-item static"><span class="hci-title">' + U.esc(it.a.title || t('common.untitled')) + ' ≈ ' + U.esc(it.b.title || t('common.untitled')) + '</span>' +
      '<span class="hci-sub"><button class="mini-btn accent" data-merge="' + it.a.id + '" data-b="' + it.b.id + '">' + U.esc(t('common.merge')) + '</button></span></div>';
  }

  function brokenLine(it) {
    return '<button class="hc-item" data-map="' + it.map.id + '"><span class="hci-title">' + U.esc(t('health.broken')) + '</span>' +
      '<span class="hci-sub">' + U.esc(it.map.name) + '</span></button>';
  }

  function allGoodArt() {
    return '<svg width="140" height="100" viewBox="0 0 140 100" fill="none">' +
      '<circle cx="70" cy="50" r="30" stroke="currentColor" stroke-width="1.4" opacity=".45"/>' +
      '<path d="m56 50 10 10 20-21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M22 30c8-6 14-6 20 0M98 74c8-6 14-6 20 0" stroke="currentColor" stroke-width="1.2" opacity=".3"/>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* history                                                            */
  /* ------------------------------------------------------------------ */

  function history(root) {
    var hist = S.state().history;
    var snaps = S.state().snapshots;
    root.innerHTML = head(t('history.title'), t('history.hint'),
      '<button class="btn sm" data-act="snap">' + U.icon('star', 14) + U.esc(t('history.snapshotCreate')) + '</button>', 'history') +
      '<div class="history-grid">' +
        '<section class="panel">' +
          '<div class="panel-head"><h2>' + U.esc(t('history.title')) + '</h2>' +
            '<div class="hist-tools"><button class="mini-btn" data-act="undo"' + (S.canUndo() ? '' : ' disabled') + '>' + U.icon('undo', 13) + U.esc(t('history.undo')) + '</button>' +
            '<button class="mini-btn" data-act="redo"' + (S.canRedo() ? '' : ' disabled') + '>' + U.icon('redo', 13) + U.esc(t('history.redo')) + '</button></div>' +
          '</div>' +
          (hist.length ? '<div class="timeline">' + hist.map(function (h) {
            return '<div class="tl-row">' +
              '<span class="tl-dot" data-kind="' + U.esc(h.kind) + '"></span>' +
              '<div class="tl-main"><div class="tl-title">' + U.esc(h.summary || t('history.kind.' + h.kind)) + '</div>' +
              '<div class="tl-sub"><span class="kind-tag">' + U.esc(t('history.kind.' + h.kind)) + '</span>' + U.esc(U.fmtDate(h.at, true)) + '</div></div>' +
              '<button class="mini-btn" data-rollback="' + h.id + '">' + U.esc(t('history.rollback')) + '</button>' +
            '</div>';
          }).join('') + '</div>' : '<div class="mini-empty pad">' + U.esc(t('history.empty')) + '</div>') +
        '</section>' +
        '<section class="panel">' +
          '<div class="panel-head"><h2>' + U.esc(t('history.snapshots')) + '</h2></div>' +
          (snaps.length ? '<div class="snap-list">' + snaps.map(function (s) {
            return '<div class="snap-row"><span class="snap-badge ' + (s.auto ? 'auto' : '') + '">' + U.esc(s.auto ? t('history.auto') : t('history.manual')) + '</span>' +
              '<div class="snap-main"><div class="snap-name">' + U.esc(s.name) + '</div><div class="snap-sub">' + U.esc(U.fmtDate(s.at, true)) + '</div></div>' +
              '<button class="mini-btn" data-restore="' + s.id + '">' + U.esc(t('history.snapshotRestore')) + '</button>' +
              '<button class="icon-btn xs" data-delsnap="' + s.id + '">' + U.icon('trash', 13) + '</button></div>';
          }).join('') + '</div>' : '<div class="mini-empty pad">' + U.esc(t('history.noSnapshots')) + '</div>') +
        '</section>' +
      '</div>';

    root.querySelectorAll('[data-rollback]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-rollback');
        var entry = S.state().history.find(function (h) { return h.id === id; });
        U.confirm(t('history.rollback'), t('history.rollbackConfirm', { name: entry ? entry.summary : '' }), { danger: true })
          .then(function (ok) { if (ok) { S.rollbackTo(id); U.toast(t('history.rollbackDone'), 'ok'); } });
      };
    });
    root.querySelectorAll('[data-restore]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-restore');
        var snap = S.state().snapshots.find(function (s) { return s.id === id; });
        U.confirm(t('history.snapshotRestore'), t('history.snapshotRestoreConfirm', { name: snap ? snap.name : '' }))
          .then(function (ok) { if (ok) { S.restoreSnapshot(id); U.toast(t('history.snapshotRestore'), 'ok'); } });
      };
    });
    root.querySelectorAll('[data-delsnap]').forEach(function (b) {
      b.onclick = function () { S.deleteSnapshot(b.getAttribute('data-delsnap')); };
    });
    var sn = root.querySelector('[data-act="snap"]');
    if (sn) sn.onclick = function () {
      U.prompt(t('history.snapshotCreate'), U.fmtDate(Date.now(), true), { placeholder: t('history.snapshotPrompt') }).then(function (v) {
        if (!v) return;
        S.createSnapshot(v, false, false);
        U.toast(t('common.saved'), 'ok');
      });
    };
    var un = root.querySelector('[data-act="undo"]');
    if (un) un.onclick = function () { if (S.undo()) U.toast(t('history.undo'), 'ok'); };
    var re = root.querySelector('[data-act="redo"]');
    if (re) re.onclick = function () { if (S.redo()) U.toast(t('history.redo'), 'ok'); };
  }

  /* ------------------------------------------------------------------ */
  /* trash                                                              */
  /* ------------------------------------------------------------------ */

  function trash(root) {
    var list = S.state().cards.filter(function (c) { return c.deletedAt; })
      .sort(function (a, b) { return b.deletedAt - a.deletedAt; });

    root.innerHTML = head(t('trash.title'), t('trash.hint'),
      (list.length ? '<button class="btn sm" data-act="restore-all">' + U.icon('restore', 14) + U.esc(t('trash.restoreAll')) + '</button>' +
        '<button class="btn sm danger" data-act="purge-all">' + U.icon('trash', 14) + U.esc(t('trash.purgeAll')) + '</button>' : ''), 'trash') +
      (list.length ? '<div class="trash-list panel">' + list.map(function (c) {
        var maps = S.mapsOfCard(c.id).length;
        return '<div class="trash-row">' +
          '<div class="trash-main"><div class="trash-title">' + U.esc(c.title || t('common.untitled')) + '</div>' +
          '<div class="trash-sub">' + U.esc(t('trash.deletedAt')) + ' ' + U.esc(U.fmtDate(c.deletedAt, true)) +
          (maps ? ' · ' + U.esc(t('trash.wasInMaps', { n: maps })) : '') + '</div></div>' +
          '<button class="mini-btn" data-restore="' + c.id + '">' + U.esc(t('trash.restore')) + '</button>' +
          '<button class="mini-btn danger" data-purge="' + c.id + '">' + U.esc(t('trash.purge')) + '</button>' +
        '</div>';
      }).join('') + '</div>' :
        '<div class="panel">' + emptyState(t('trash.empty'), '', '', defaultArt()) + '</div>');

    root.querySelectorAll('[data-restore]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-restore');
        S.commit('trash', t('trash.restore'), function () { S.restoreCard(id); });
      };
    });
    root.querySelectorAll('[data-purge]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-purge');
        var c = S.card(id);
        U.confirm(t('trash.purge'), t('trash.purgeConfirm', { name: S.cardTitle(c) }), { danger: true }).then(function (ok) {
          if (!ok) return;
          S.commit('trash', t('trash.purge'), function () { S.purgeCard(id); });
        });
      };
    });
    var ra = root.querySelector('[data-act="restore-all"]');
    if (ra) ra.onclick = function () {
      S.commit('trash', t('trash.restoreAll'), function () {
        list.forEach(function (c) { S.restoreCard(c.id); });
      });
    };
    var pa = root.querySelector('[data-act="purge-all"]');
    if (pa) pa.onclick = function () {
      U.confirm(t('trash.purgeAll'), t('trash.purgeAllConfirm', { n: list.length }), { danger: true }).then(function (ok) {
        if (!ok) return;
        S.commit('trash', t('trash.purgeAll'), function () { list.forEach(function (c) { S.purgeCard(c.id); }); });
      });
    };
  }

  CC.views = {
    home: home, outline: outline, cards: cards, health: health, history: history, trash: trash,
    setCardFilter: function (f) { cardFilter = f; },
    clearCardSel: function () { cardSel = {}; }
  };
})();
