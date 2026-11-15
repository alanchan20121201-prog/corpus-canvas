/* Map canvas: virtualised SVG rendering (viewport culling + level of detail) */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store, L = CC.layout;
  var picTried = {};      /* attachment ids already requested; do not retry a failed read on every paint */
  var attachBound = false;
  var t = function () { return window.t.apply(null, arguments); };

  var st = {
    sel: [], edgeSel: null, mode: 'select', connectFrom: null, focus: null,
    drag: null, pan: null, mounted: false, lod: 'full', visible: 0, total: 0,
    truncated: false, focusCache: null, lastPaint: 0,
    inline: null, marquee: null, marqueeMode: false, mm: null, mmSig: ''
  };

  var MM_W = 190, MM_H = 128, MM_PAD = 10, MM_CELLS = 700;

  var host = null, svg = null, vp = null, gEdges = null, gNodes = null, gBounds = null, stage = null;
  var view = { x: 0, y: 0, k: 1 };
  var model = null;
  var paintTimer = null;

  function activeMap() { return S.currentMap(); }

  /* the palette a map borrows; falls back to the default library entry */
  function mapTheme() {
    var m = activeMap();
    var id = m && m.style && m.style.theme ? m.style.theme : 'default';
    return CC.themes ? CC.themes.get(id) : null;
  }

  function applyTheme() {
    if (!stage) return;
    var m = activeMap();
    var id = m && m.style && m.style.theme ? m.style.theme : 'default';
    if (!CC.themes) return;
    if (id === 'default') CC.themes.clear(stage);
    else CC.themes.apply(stage, id);
  }

  function themeMenu(btn) {
    var r = btn.getBoundingClientRect();
    var m = activeMap();
    var cur = (m && m.style && m.style.theme) || 'default';
    var items = CC.themes.list().map(function (th) {
      return {
        label: t(th.nameKey), hint: th.id === cur ? '•' : '',
        onClick: function () {
          S.commit('map', t('theme.apply'), function () {
            m.style = m.style || {};
            m.style.theme = th.id === 'default' ? '' : th.id;
          });
          refresh();
        }
      };
    });
    U.showMenu(r.left - 170, r.bottom + 6, items);
  }

  var TAGS = ['#8a9a5b', '#c08552', '#7d8fa9', '#a9738f', '#6f9c8f', '#b08a5a', '#8b84b8', '#a67c6b'];
  function tagColor(tag) {
    var h = 0, s = String(tag || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    var palette = TAGS;
    var th = CC.themes && CC.themes.get((activeMap() && activeMap().style && activeMap().style.theme) || 'default');
    if (th && th.tags && th.tags.length) palette = th.tags;
    return palette[h % palette.length];
  }

  function textOn(fill) {
    if (!fill || String(fill).indexOf('var(') === 0) return 'var(--text)';
    var hex = String(fill).replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    if (hex.length < 6) return 'var(--text)';
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 155 ? '#221f1b' : '#fdfcf7';
  }

  /* ------------------------------------------------------------------ */
  /* mount                                                              */
  /* ------------------------------------------------------------------ */

  function mount(root) {
    host = root;
    root.innerHTML =
      '<div class="map-view">' +
        '<div class="map-bar">' +
          '<div class="map-bar-group">' +
            '<button class="tool-btn" data-act="add">' + U.icon('plus', 15) + '<span>' + U.esc(t('map.addNode')) + '</span></button>' +
            '<button class="tool-btn" data-act="link">' + U.icon('link', 15) + '<span>' + U.esc(t('map.connect')) + '</span></button>' +
            '<button class="tool-btn" data-act="arrange">' + U.icon('layout', 15) + '<span>' + U.esc(t('map.autoLayout')) + '</span></button>' +
          '</div>' +
          '<div class="map-bar-group right">' +
            '<button class="tool-btn ghost" data-act="focus">' + U.icon('focus', 15) + '</button>' +
            '<button class="tool-btn ghost" data-act="structure"></button>' +
            '<button class="tool-btn ghost" data-act="marquee" title="' + U.esc(t('map.marqueeTitle')) + '">' + U.icon('marquee', 15) + '</button>' +
            '<button class="tool-btn ghost" data-act="minimap" title="' + U.esc(t('map.minimapTitle')) + '">' + U.icon('minimap', 15) + '</button>' +
            '<button class="tool-btn ghost" data-act="present" title="' + U.esc(t('present.hint')) + '">' + U.icon('play', 15) + '</button>' +
            '<button class="tool-btn ghost" data-act="print" title="' + U.esc(t('print.title')) + '">' + U.icon('print', 15) + '</button>' +
            '<button class="tool-btn ghost" data-act="ai">' + U.icon('sparkles', 15) + '</button>' +
            '<button class="tool-btn ghost" data-act="more">' + U.icon('more', 16) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="map-stage" id="map-stage">' +
          '<svg class="map-svg" id="map-svg" xmlns="http://www.w3.org/2000/svg">' +
            '<defs>' +
              '<filter id="node-shadow" x="-30%" y="-30%" width="160%" height="180%">' +
                '<feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.13"/>' +
              '</filter>' +
            '</defs>' +
            '<g id="vp"><g id="g-bounds"></g><g id="g-edges"></g><g id="g-nodes"></g></g>' +
          '</svg>' +
          '<div class="map-empty" id="map-empty" hidden></div>' +
          '<div class="map-hint" id="map-hint"></div>' +
          '<div class="map-status" id="map-status"></div>' +
          '<div class="minimap" id="minimap" hidden>' +
            '<svg class="minimap-svg" id="minimap-svg" viewBox="0 0 ' + MM_W + ' ' + MM_H + '" xmlns="http://www.w3.org/2000/svg"></svg>' +
          '</div>' +
          '<div class="zoom-hud">' +
            '<button class="icon-btn sm" data-act="fit" title="' + U.esc(t('map.fit')) + '">' + U.icon('fit', 14) + '</button>' +
            '<span class="zh-sep"></span>' +
            '<button class="icon-btn sm" data-act="zoom-out" title="' + U.esc(t('map.zoomOut')) + '">' + U.icon('minus', 14) + '</button>' +
            '<span class="zoom-val" id="zoom-val">100%</span>' +
            '<button class="icon-btn sm" data-act="zoom-in" title="' + U.esc(t('map.zoomIn')) + '">' + U.icon('plus', 14) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    svg = root.querySelector('#map-svg');
    vp = root.querySelector('#vp');
    gEdges = root.querySelector('#g-edges');
    gNodes = root.querySelector('#g-nodes');
    gBounds = root.querySelector('#g-bounds');
    stage = root.querySelector('#map-stage');

    /* a fresh DOM means a fresh minimap layer */
    st.mmSig = '';
    bindToolbar(root);
    bindStage();
    var mmBox = root.querySelector('#minimap');
    if (mmBox) bindMinimap(mmBox);
    if (!attachBound && CC.attach && CC.attach.onChange) {
      CC.attach.onChange(function () { picTried = {}; if (st.mounted) paintSoon(); });
      attachBound = true;
    }
    st.mounted = true;
    refresh();
  }

  /* ------------------------------------------------------------------ */
  /* paint                                                              */
  /* ------------------------------------------------------------------ */

  function refresh() {
    if (!st.mounted) return;
    var m = activeMap();
    var empty = host.querySelector('#map-empty');
    var hint = host.querySelector('#map-hint');
    var status = host.querySelector('#map-status');
    var structBtn = host.querySelector('[data-act="structure"]');

    if (!m) {
      gNodes.innerHTML = '';
      gEdges.innerHTML = '';
      gBounds.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML =
        '<div class="empty-illustration">' + emptyArt() + '</div>' +
        '<h3>' + U.esc(t('home.recentEmpty')) + '</h3>' +
        '<button class="btn primary" data-act="newmap">' + U.icon('plus', 15) + t('map.new') + '</button>';
      empty.querySelector('[data-act="newmap"]').onclick = function () { CC.app.newMapFlow(); };
      status.textContent = '';
      hint.textContent = '';
      return;
    }
    empty.hidden = true;

    if (m.view && !st._viewApplied) {
      view = { x: m.view.x, y: m.view.y, k: m.view.k };
      st._viewApplied = true;
    }
    if (st.focus && !S.card(st.focus)) st.focus = null;

    applyTheme();
    model = L.get(m);
    applyView();
    paint();
    scheduleWarm();

    host.querySelector('#zoom-val').textContent = Math.round(view.k * 100) + '%';
    structBtn.innerHTML = m.structure === 'org'
      ? U.icon('tree', 15) + '<span>' + U.esc(t('map.org')) + '</span>'
      : m.structure === 'free'
        ? U.icon('free', 15) + '<span>' + U.esc(t('map.free')) + '</span>'
        : U.icon('tree', 15) + '<span>' + U.esc(t('map.tree')) + '</span>';
    structBtn.title = t('map.structure');

    var mqBtn = host.querySelector('[data-act="marquee"]');
    if (mqBtn) mqBtn.classList.toggle('active', !!st.marqueeMode);
    var lkBtn = host.querySelector('[data-act="link"]');
    if (lkBtn) lkBtn.classList.toggle('active', st.mode === 'link');
    var mmBtn = host.querySelector('[data-act="minimap"]');
    if (mmBtn) mmBtn.classList.toggle('active', !!(m && m.style && m.style.minimap !== false));

    hint.textContent = st.mode === 'link'
      ? (st.connectFrom ? t('map.connectingFrom', { name: S.cardTitle(S.card(st.connectFrom)) }) : t('map.connectHint'))
      : t('map.hint');
    hint.classList.toggle('active', st.mode === 'link');

    if (!m.view && !st._fittedOnce) {
      st._fittedOnce = true;
      requestAnimationFrame(function () { setTimeout(zoomFit, 0); });
    }
    markSelection();
  }

  /* Progressive pre-warm: the coarse overview is computed off the main
     thread after the visible frame has been painted. */
  var warmTimer = null;
  function scheduleWarm() {
    if (!model || !L.warm) return;
    clearTimeout(warmTimer);
    var snapshot = model;
    warmTimer = setTimeout(function () { L.warm(snapshot); }, 160);
  }

  function worldRect() {
    var r = svg.getBoundingClientRect();
    var k = view.k || 1;
    return {
      x1: -view.x / k, y1: -view.y / k,
      x2: (-view.x + r.width) / k, y2: (-view.y + r.height) / k
    };
  }

  function paint() {
    if (!st.mounted || !model) return;
    st.lastPaint = Date.now();
    var k = view.k || 1;
    var total = L.totalNodes(model);
    st.total = total;
    var rect = worldRect();
    var margin = Math.min(1600, 360 / Math.max(k, 0.05));

    var lod;
    if (k < 0.12 && total > 600) lod = 'cluster';
    else if (k < 0.3) lod = 'low';
    else if (k < 0.55) lod = 'mid';
    else lod = 'full';

    var allowed = null;
    if (st.focus) {
      if (!st.focusCache || st.focusCache.id !== st.focus || st.focusCache.rev !== (model.map.rev || 0)) {
        allowed = {};
        allowed[st.focus] = 1;
        model.edges.forEach(function (e) {
          if (e.from === st.focus) allowed[e.to] = 1;
          if (e.to === st.focus) allowed[e.from] = 1;
        });
        st.focusCache = { id: st.focus, rev: model.map.rev || 0, set: allowed };
      } else {
        allowed = st.focusCache.set;
      }
    }

    var q = { ids: [], truncated: false };
    if (lod !== 'cluster') {
      q = L.query(model, rect, margin, 1800);
      if (allowed) q.ids = q.ids.filter(function (id) { return allowed[id]; });
      if (q.truncated) lod = 'low';
    }
    st.lod = lod;
    st.visible = q.ids.length;
    st.truncated = q.truncated;

    if (lod === 'cluster') {
      var cl = L.clusters(model, rect);
      st.visible = cl.reduce(function (a, c) { return a + c.count; }, 0);
      gBounds.innerHTML = '';
      gEdges.innerHTML = '';
      gNodes.innerHTML = cl.map(function (c) {
        var w = Math.max(24, c.x2 - c.x1), h = Math.max(16, c.y2 - c.y1);
        return '<g class="cluster">' +
          '<rect class="cluster-rect" x="' + c.x1 + '" y="' + c.y1 + '" width="' + w + '" height="' + h + '" rx="16"/>' +
          '<text class="cluster-count" x="' + (c.x1 + w / 2) + '" y="' + (c.y1 + h / 2 + 4) + '" text-anchor="middle">' + (k > 0.06 ? c.count : '') + '</text>' +
          '</g>';
      }).join('');
      updateStatus(0);
      paintMinimap();
      return;
    }

    var vis = {};
    q.ids.forEach(function (id) { vis[id] = 1; });

    gBounds.innerHTML = renderBoundaries(vis);

    var edges = L.queryEdges(model, rect, vis, margin);
    /* In focus mode a hierarchy edge with only one visible endpoint would
       otherwise draw a line to nowhere. */
    if (st.focus) edges = edges.filter(function (e) { return vis[e.from] && vis[e.to]; });
    var showLabels = !model.map.style || model.map.style.showLabels !== false;
    gEdges.innerHTML = edges.map(function (e) { return edgeHTML(e, lod, showLabels); }).join('');
    q.ids.forEach(function (id) {
      var n = ensureMeasured(model.nodes[id]);
      if (n && lod === 'full' && n.pic && CC.attach && CC.attach.load &&
          !CC.attach.dataUrl(n.pic.id) && !picTried[n.pic.id]) {
        picTried[n.pic.id] = 1;
        CC.attach.load(n.card.id);
      }
    });
    gNodes.innerHTML = q.ids.map(function (id) { return nodeHTML(model.nodes[id], lod); }).join('');
    st.nodeEls = {};
    gNodes.querySelectorAll('.node').forEach(function (el) { st.nodeEls[el.getAttribute('data-id')] = el; });
    st.edgeList = edges;

    updateStatus(edges.length);
    markSelection();
    scheduleLayoutCache();
    paintMinimap();
  }

  function updateStatus(edgeCount) {
    var status = host && host.querySelector('#map-status');
    if (!status) return;
    status.innerHTML =
      '<span>' + U.esc(t('map.visibleCount', { v: st.visible, n: st.total })) + '</span>' +
      '<i></i><span>' + U.esc(t('map.edgeCount', { n: edgeCount })) + '</span>' +
      (st.focus ? '<i></i><span class="focus-chip">' + U.esc(t('map.focusHint', { name: S.cardTitle(S.card(st.focus)) })) + '</span>' : '');
  }

  var cacheTimer = null;
  function scheduleLayoutCache() {
    if (!window.api || !window.api.writeLayoutCache || !model || model.fromCache) return;
    var m = activeMap();
    if (!m) return;
    var total = L.totalNodes(model);
    if (total < 2000 || total > 1600000) return;
    if (model._cacheQueued) return;
    model._cacheQueued = true;
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(function () {
      try { window.api.writeLayoutCache(m.id, L.serialize(model)); } catch (e) { /* ignore */ }
    }, 8000);
  }

  function paintSoon() {
    if (paintTimer) return;
    var wait = Math.max(0, 45 - (Date.now() - st.lastPaint));
    paintTimer = setTimeout(function () {
      paintTimer = null;
      paint();
    }, wait);
  }

  /* ------------------------------------------------------------------ */
  /* markup                                                             */
  /* ------------------------------------------------------------------ */

  /* Copy every measured field onto a node. The layout cache (hydrate) and
     on-the-fly title edits can leave a node with lines === null or a stale
     measurement; the map, SVG/PNG export and A4 print all need the full set. */
  function applyMeasure(n, ms) {
    n.lines = ms.lines; n.fs = ms.fs; n.fw = ms.fw; n.lineH = ms.lineH; n.iconW = ms.iconW; n.untitled = ms.untitled;
    n.w = ms.w; n.h = ms.h;
    n.summaryLines = ms.summaryLines || []; n.summaryFs = ms.summaryFs || 0; n.summaryLH = ms.summaryLH || 0;
    n.summaryKind = ms.summaryKind || ''; n.pic = ms.pic || null; n.picH = ms.picH || 0;
    n.titleY = ms.titleY; n.sumTop = ms.sumTop; n.sumBase = ms.sumBase;
    n.metaY = ms.metaY; n.picY = ms.picY; n.sumMaxW = ms.sumMaxW;
    n._mKey = ms.key;
    return n;
  }

  function ensureMeasured(n) {
    if (!n) return n;
    var ms = L.measure(n.card);
    if (!n.lines || n._mKey !== ms.key) applyMeasure(n, ms);
    return n;
  }

  function nodeHTML(n, lod) {
    if (!n) return '';
    ensureMeasured(n);
    var c = n.card, s = c.style || {};
    var x = n.x - n.w / 2, y = n.y - n.h / 2;
    var shape = s.shape || 'rounded';
    var rx = shape === 'rect' ? 4 : shape === 'pill' ? n.h / 2 : 13;
    var fill = s.fill || '';
    var cls = 'node';
    if (st.sel.indexOf(n.id) >= 0) cls += ' selected';
    if (n.orphan) cls += ' orphan';
    if (n.untitled) cls += ' untitled';
    var html = '<g class="' + cls + '" data-id="' + n.id + '" transform="translate(' + x + ',' + y + ')">';
    html += '<rect class="node-rect" x="0" y="0" width="' + n.w + '" height="' + n.h + '" rx="' + rx + '"' +
      (fill ? ' fill="' + U.esc(fill) + '"' : '') + '/>';

    if (lod === 'low') {
      html += '<rect class="node-accent" x="0" y="10" width="3" height="' + Math.max(8, n.h - 20) + '" rx="1.5" style="fill:' + (s.accent || c.color || tagColor(c.tags[0] || '')) + '"/>';
      html += '</g>';
      return html;
    }

    html += '<rect class="node-accent" x="0" y="12" width="3" height="' + Math.max(8, n.h - 24) + '" rx="1.5" style="fill:' + (s.accent || c.color || tagColor(c.tags[0] || '')) + '"/>';

    var iconW = 0;
    if (s.icon) {
      html += '<text class="node-icon" x="14" y="' + (n.titleY + 1) + '">' + U.esc(s.icon) + '</text>';
      iconW = n.fs + 8;
    }
    var tx = 15 + iconW;
    var ty = n.titleY;
    var lines = lod === 'mid' ? [n.lines[0]] : n.lines;
    lines.forEach(function (line) {
      html += '<text class="node-title" x="' + tx + '" y="' + ty + '" style="font-size:' + n.fs + 'px;font-weight:' + n.fw + (fill ? ';fill:' + textOn(fill) : '') + '">' + U.esc(line) + '</text>';
      ty += n.lineH;
    });

    /* an optional one-line summary, in one of three readings */
    if (lod === 'full' && n.summaryLines && n.summaryLines.length) {
      var sumKind = n.summaryKind || 'plain';
      var sumTop = n.sumTop;
      var sumFs = Number(n.summaryFs) > 0 ? Number(n.summaryFs) : 12;
      var sumLH = Number(n.summaryLH) > 0 ? Number(n.summaryLH) : Math.round(sumFs * 1.38);
      var sumH = n.summaryLines.length * sumLH + 2;
      var badgeW = Math.min(n.w - 28, (Number(n.sumMaxW) || 0) + 14);
      if (sumKind === 'callout') {
        html += '<rect class="node-summary-callout" x="14" y="' + sumTop + '" width="3" height="' + sumH + '" rx="1.5"/>';
      } else if (sumKind === 'badge') {
        html += '<rect class="node-summary-badge" x="14" y="' + (sumTop - 1) + '" width="' + badgeW + '" height="' + (sumH - 2) + '" rx="7"/>';
      }
      var sy = n.sumBase;
      n.summaryLines.forEach(function (line) {
        html += '<text class="node-summary' + (sumKind === 'badge' ? ' badge' : '') + '" x="' + (sumKind === 'callout' ? 23 : 19) + '" y="' + sy + '" style="font-size:' + sumFs + 'px">' + U.esc(line) + '</text>';
        sy += sumLH;
      });
      ty = sy;
    }

    if (lod === 'full') {
      var metaY = n.metaY;
      var mx = 15;
      (c.tags || []).slice(0, 2).forEach(function (tg) {
        var w = String(tg).length * 7.4 + 12;
        html += '<rect class="node-pill" x="' + mx + '" y="' + (metaY - 10) + '" width="' + w + '" height="15" rx="7.5" style="fill:' + tagColor(tg) + '22;stroke:' + tagColor(tg) + '55"/>';
        html += '<text class="node-pill-text" x="' + (mx + w / 2) + '" y="' + (metaY + 1) + '" text-anchor="middle" style="fill:' + tagColor(tg) + '">' + U.esc(String(tg).slice(0, 8)) + '</text>';
        mx += w + 6;
      });
      if ((c.tags || []).length > 2) {
        html += '<text class="node-more" x="' + mx + '" y="' + (metaY + 2) + '">+' + (c.tags.length - 2) + '</text>';
      }
      if (c.note) html += '<circle class="note-dot" cx="' + (n.w - 14) + '" cy="' + (metaY - 2) + '" r="3.4"/>';
    }

    /* the first picture of the card, drawn as a thumbnail at the bottom */
    if (lod === 'full' && n.pic && n.picH) {
      var picSrc = CC.attach ? CC.attach.dataUrl(n.pic.id) : '';
      if (picSrc) {
        var pw = n.w - 28, ph = n.picH;
        var py = Math.min(n.picY, n.h - ph - 8);
        html += '<image class="node-pic" x="14" y="' + py + '" width="' + pw + '" height="' + ph +
          '" preserveAspectRatio="xMidYMid slice" href="' + U.esc(picSrc) + '"/>';
        html += '<rect class="node-pic-frame" x="14" y="' + py + '" width="' + pw + '" height="' + ph + '" rx="6"/>';
      }
    }

    if (n.hiddenCount) {
      var pw = 22 + String(n.hiddenCount).length * 6;
      html += '<g class="collapse-pill" data-collapse="' + n.id + '">' +
        '<rect x="' + (n.w + 6) + '" y="' + (n.h / 2 - 10) + '" width="' + pw + '" height="20" rx="10"/>' +
        '<text x="' + (n.w + 6 + pw / 2) + '" y="' + (n.h / 2 + 4) + '" text-anchor="middle">+' + n.hiddenCount + '</text></g>';
    }
    html += '</g>';
    return html;
  }

  function edgeHTML(e, lod, showLabels) {
    var a = model.nodes[e.from], b = model.nodes[e.to];
    if (!a || !b) return '';
    var hier = e.type === 'hierarchy';
    var geo = edgeGeometry(a, b, hier, e);
    var cls = 'edge' + (hier ? ' hierarchy' : ' relation') + (e.uncertain ? ' uncertain' : '') + (st.edgeSel === e.id ? ' selected' : '');
    var ls = e.style || {};
    var dash = ls.dash || 'solid';
    var width = ls.width || 'medium';
    var arrow = ls.arrow || 'solid';
    var cls2 = ' edge-dash-' + dash + ' edge-w-' + width + ' edge-a-' + arrow;
    var html = '<g class="' + cls + cls2 + '" data-edge="' + e.id + '">';
    html += '<path class="edge-hit" d="' + geo.d + '"/>';
    html += '<path class="edge-line" d="' + geo.d + '"' + (e.color ? ' style="stroke:' + U.esc(e.color) + '"' : '') + '/>';
    if (!hier && arrow !== 'none') {
      if (arrow === 'open') {
        html += '<path class="edge-arrow edge-arrow-open" d="' + geo.arrow + '"' + (e.color ? ' style="stroke:' + U.esc(e.color) + '"' : '') + '/>';
      } else {
        html += '<path class="edge-arrow" d="' + geo.arrow + '"' + (e.color ? ' style="fill:' + U.esc(e.color) + '"' : '') + '/>';
      }
    }
    if (lod === 'full' && showLabels && e.label) {
      var lw = Math.min(200, String(e.label).length * 7 + 16);
      html += '<g class="edge-label">' +
        '<rect x="' + (geo.mx - lw / 2) + '" y="' + (geo.my - 10) + '" width="' + lw + '" height="18" rx="9"/>' +
        '<text x="' + geo.mx + '" y="' + (geo.my + 3.5) + '" text-anchor="middle">' + U.esc(String(e.label).slice(0, 26)) + '</text></g>';
    }
    if (e.uncertain && lod !== 'low') {
      html += '<g class="doubt-mark"><circle cx="' + geo.mx + '" cy="' + (geo.my - 16) + '" r="7"/>' +
        '<text x="' + geo.mx + '" y="' + (geo.my - 12.5) + '" text-anchor="middle">?</text></g>';
    }
    html += '</g>';
    return html;
  }

  function edgeGeometry(a, b, hier, e) {
    var vertical = model && model.vertical;
    var x1, y1, x2, y2;
    if (hier) {
      if (vertical) {
        x1 = a.x; y1 = a.y + a.h / 2;
        x2 = b.x; y2 = b.y - b.h / 2;
        var midY = (y1 + y2) / 2;
        return {
          d: 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + midY + ' ' + x2 + ',' + midY + ' ' + x2 + ',' + y2,
          mx: (x1 + x2) / 2, my: (y1 + y2) / 2, arrow: ''
        };
      }
      var forward = b.x >= a.x;
      x1 = a.x + (forward ? a.w / 2 : -a.w / 2);
      x2 = b.x + (forward ? -b.w / 2 : b.w / 2);
      y1 = a.y; y2 = b.y;
      var midX = (x1 + x2) / 2;
      return {
        d: 'M' + x1 + ',' + y1 + ' C' + midX + ',' + y1 + ' ' + midX + ',' + y2 + ' ' + x2 + ',' + y2,
        mx: midX, my: (y1 + y2) / 2, arrow: ''
      };
    }

    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    var ah = Math.abs(uy) > 0.0001 ? (b.h / 2) / Math.abs(uy) : Infinity;
    var aw = Math.abs(ux) > 0.0001 ? (b.w / 2) / Math.abs(ux) : Infinity;
    var bh = Math.abs(uy) > 0.0001 ? (a.h / 2) / Math.abs(uy) : Infinity;
    var bw = Math.abs(ux) > 0.0001 ? (a.w / 2) / Math.abs(ux) : Infinity;
    var back = Math.min(ah, aw) + 2, fore = Math.min(bh, bw) + 2;
    x1 = a.x + ux * fore; y1 = a.y + uy * fore;
    x2 = b.x - ux * back; y2 = b.y - uy * back;

    var bend = e && e.curved ? 24 : 10;
    var cx1 = x1 + (x2 - x1) * 0.35 - uy * bend;
    var cy1 = y1 + (y2 - y1) * 0.35 + ux * bend;
    var cx2 = x1 + (x2 - x1) * 0.7 - uy * bend;
    var cy2 = y1 + (y2 - y1) * 0.7 + ux * bend;
    var ang = Math.atan2(y2 - cy2, x2 - cx2);
    var s = 7;
    var p1 = (x2 - Math.cos(ang - 0.45) * s).toFixed(2) + ',' + (y2 - Math.sin(ang - 0.45) * s).toFixed(2);
    var p2 = (x2 - Math.cos(ang + 0.45) * s).toFixed(2) + ',' + (y2 - Math.sin(ang + 0.45) * s).toFixed(2);
    return {
      d: 'M' + x1 + ',' + y1 + ' C' + cx1 + ',' + cy1 + ' ' + cx2 + ',' + cy2 + ' ' + x2 + ',' + y2,
      mx: (x1 + 2 * cx1 + 2 * cx2 + x2) / 6,
      my: (y1 + 2 * cy1 + 2 * cy2 + y2) / 6,
      arrow: 'M' + x2 + ',' + y2 + ' L' + p1 + ' L' + p2 + ' Z'
    };
  }

  function renderBoundaries(vis) {
    var list = (model.map.boundaries || []);
    if (!list.length) return '';
    var html = '';
    list.forEach(function (b) {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, any = false;
      (b.cards || []).forEach(function (id) {
        var n = model.nodes[id];
        if (!n || !vis[id]) return;
        any = true;
        minX = Math.min(minX, n.x - n.w / 2); maxX = Math.max(maxX, n.x + n.w / 2);
        minY = Math.min(minY, n.y - n.h / 2); maxY = Math.max(maxY, n.y + n.h / 2);
      });
      if (!any) return;
      var pad = 18;
      var color = b.color || 'var(--accent)';
      html += '<g class="boundary" data-bid="' + b.id + '">' +
        '<rect class="boundary-rect" x="' + (minX - pad) + '" y="' + (minY - pad - 6) + '" width="' + (maxX - minX + pad * 2) + '" height="' + (maxY - minY + pad * 2 + 6) + '" rx="20" style="stroke:' + color + ';fill:' + color + '"/>' +
        '<text class="boundary-label" x="' + (minX - pad + 12) + '" y="' + (minY - pad - 12) + '" style="fill:' + color + '">' + U.esc(b.label || '') + '</text>' +
        '</g>';
    });
    return html;
  }

  function applyView() {
    if (vp) vp.setAttribute('transform', 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
    if (st.inline) positionInline();
  }

  function markSelection() {
    if (!gNodes) return;
    gNodes.querySelectorAll('.node').forEach(function (g) {
      g.classList.toggle('selected', st.sel.indexOf(g.getAttribute('data-id')) >= 0);
    });
    gEdges.querySelectorAll('.edge').forEach(function (g) {
      g.classList.toggle('selected', g.getAttribute('data-edge') === st.edgeSel);
    });
  }

  /* ------------------------------------------------------------------ */
  /* interactions                                                       */
  /* ------------------------------------------------------------------ */

  function toWorld(clientX, clientY) {
    var r = svg.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.k, y: (clientY - r.top - view.y) / view.k };
  }

  function bindStage() {
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = svg.getBoundingClientRect();
      var cx = e.clientX - r.left, cy = e.clientY - r.top;
      var world = { x: (cx - view.x) / view.k, y: (cy - view.y) / view.k };
      var factor = Math.exp(-e.deltaY * 0.0016);
      var k = Math.min(2.6, Math.max(0.04, view.k * factor));
      view.k = k;
      view.x = cx - world.x * k;
      view.y = cy - world.y * k;
      applyView();
      host.querySelector('#zoom-val').textContent = Math.round(k * 100) + '%';
      persistView();
      paintSoon();
    }, { passive: false });

    svg.addEventListener('pointerdown', function (e) {
      var nodeEl = e.target.closest('.node');
      var edgeEl = e.target.closest('.edge');

      if (edgeEl) {
        st.edgeSel = edgeEl.getAttribute('data-edge');
        st.sel = [];
        markSelection();
        return;
      }

      if (nodeEl) {
        var id = nodeEl.getAttribute('data-id');
        if (e.target.closest('[data-collapse]')) { toggleCollapse(id); return; }
        if (st.mode === 'link') { handleLinkClick(id); return; }
        if (e.shiftKey) {
          var i = st.sel.indexOf(id);
          if (i >= 0) st.sel.splice(i, 1); else st.sel.push(id);
        } else if (st.sel.indexOf(id) < 0) {
          st.sel = [id];
        }
        st.edgeSel = null;
        markSelection();
        startDrag(e, nodeEl);
        if (CC.app) CC.app.onSelectionChange(st.sel);
        return;
      }

      if (st.marqueeMode || e.shiftKey) { startMarquee(e); return; }

      st.sel = [];
      st.edgeSel = null;
      st.focus = null;
      markSelection();
      st.pan = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
      if (svg.setPointerCapture) { try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      svg.classList.add('panning');
      if (CC.app) CC.app.onSelectionChange([]);
    });

    svg.addEventListener('pointermove', function (e) {
      if (st.marquee) { updateMarquee(e); return; }
      if (st.pan) {
        view.x = st.pan.ox + (e.clientX - st.pan.sx);
        view.y = st.pan.oy + (e.clientY - st.pan.sy);
        applyView();
        paintSoon();
        return;
      }
      if (st.drag) {
        var w = toWorld(e.clientX, e.clientY);
        var dx = w.x - st.drag.start.x;
        var dy = w.y - st.drag.start.y;
        st.drag.moved = Math.abs(dx) + Math.abs(dy) > 2;
        st.drag.dx = dx; st.drag.dy = dy;
        if (st.drag.moved) applyDrag(dx, dy);
      }
    });

    svg.addEventListener('pointerup', function (e) {
      if (st.marquee) { endMarquee(e); return; }
      if (st.pan) {
        st.pan = null;
        svg.classList.remove('panning');
        persistView();
        return;
      }
      if (st.drag) {
        var d = st.drag;
        st.drag = null;
        svg.classList.remove('dragging');
        try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (!d.moved) return;
        var m = activeMap();
        if (!m) return;
        d.items.forEach(function (it) {
          var node = model.nodes[it.root];
          if (!node) return;
          if (m.structure === 'free') m.positions[it.root] = { x: node.x, y: node.y };
          else m.offsets[it.root] = { x: node.x, y: node.y };
        });
        model.indexDirty = true;
        model.bounds = L.recomputeBounds(model);
        m.updatedAt = Date.now();
        if (window.api && window.api.clearLayoutCache) window.api.clearLayoutCache(m.id);
        model._cacheQueued = false;
        S.saveSoon();
        paint();
      }
    });

    svg.addEventListener('dblclick', function (e) {
      if (e.target.closest('.node')) {
        var id = e.target.closest('.node').getAttribute('data-id');
        beginInlineEdit(id);
        return;
      }
      if (e.target.closest('.edge')) { editEdge(e.target.closest('.edge').getAttribute('data-edge')); return; }
      var p = toWorld(e.clientX, e.clientY);
      addNodeAt(p.x, p.y, e.shiftKey);
    });

    svg.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var nodeEl = e.target.closest('.node');
      if (nodeEl) {
        var id = nodeEl.getAttribute('data-id');
        if (st.sel.indexOf(id) < 0) { st.sel = [id]; markSelection(); }
        nodeMenu(e.clientX, e.clientY, id);
        return;
      }
      var edgeEl = e.target.closest('.edge');
      if (edgeEl) { edgeMenu(e.clientX, e.clientY, edgeEl.getAttribute('data-edge')); return; }
      canvasMenu(e.clientX, e.clientY);
    });
  }

  function collectSubtree(id, out) {
    out.push(id);
    var n = model.nodes[id];
    (n && n.kids || []).forEach(function (k) { collectSubtree(k, out); });
  }

  function startDrag(e, nodeEl) {
    if (!model) return;
    var roots = st.sel.length ? st.sel.slice() : (nodeEl ? [nodeEl.getAttribute('data-id')] : []);
    var rootSet = {};
    roots.forEach(function (r) { rootSet[r] = 1; });

    /* drop roots that are inside another selected branch */
    var parentMap = {};
    model.edges.forEach(function (e2) {
      if (e2.type === 'hierarchy' && model.nodes[e2.from] && model.nodes[e2.to]) parentMap[e2.to] = e2.from;
    });
    roots = roots.filter(function (r) {
      var p = parentMap[r];
      while (p) {
        if (rootSet[p]) return false;
        p = parentMap[p];
      }
      return true;
    });

    var items = [];
    roots.forEach(function (r) {
      if (!model.nodes[r]) return;
      var ids = [];
      collectSubtree(r, ids);
      var orig = {};
      ids.forEach(function (id) {
        var n = model.nodes[id];
        if (n) orig[id] = { x: n.x, y: n.y };
      });
      items.push({ root: r, ids: ids, orig: orig });
    });
    if (!items.length) return;

    st.drag = { start: toWorld(e.clientX, e.clientY), items: items, moved: false, dx: 0, dy: 0, frame: 0 };
    if (svg.setPointerCapture) { try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    svg.classList.add('dragging');
  }

  function applyDrag(dx, dy) {
    if (!st.drag) return;
    st.drag.items.forEach(function (it) {
      it.ids.forEach(function (id) {
        var n = model.nodes[id], o = it.orig[id];
        if (!n || !o) return;
        n.x = o.x + dx;
        n.y = o.y + dy;
        var el = st.nodeEls && st.nodeEls[id];
        if (el) el.setAttribute('transform', 'translate(' + (n.x - n.w / 2) + ',' + (n.y - n.h / 2) + ')');
      });
    });
    if (st.drag.frame) return;
    st.drag.frame = requestAnimationFrame(function () {
      if (!st.drag) return;
      st.drag.frame = 0;
      rebuildEdges();
    });
  }

  function rebuildEdges() {
    if (!gEdges || !st.edgeList) return;
    var showLabels = !model.map.style || model.map.style.showLabels !== false;
    gEdges.innerHTML = st.edgeList.map(function (e2) { return edgeHTML(e2, st.lod, showLabels); }).join('');
  }

  function persistView() {
    var m = activeMap();
    if (!m) return;
    m.view = { x: view.x, y: view.y, k: view.k };
    S.saveSoon();
  }

  function handleLinkClick(id) {
    if (!st.connectFrom) { st.connectFrom = id; refresh(); return; }
    if (st.connectFrom === id) { st.connectFrom = null; refresh(); return; }
    var from = st.connectFrom;
    st.connectFrom = null;
    st.mode = 'select';
    openEdgeDialog(null, { from: from, to: id });
    refresh();
  }

  function toggleCollapse(id) {
    var m = activeMap();
    if (!m) return;
    var i = m.collapsed.indexOf(id);
    if (i >= 0) m.collapsed.splice(i, 1); else m.collapsed.push(id);
    L.invalidate(m.id);
    S.touch();
  }

  /* ------------------------------------------------------------------ */
  /* menus                                                              */
  /* ------------------------------------------------------------------ */

  function nodeMenu(x, y, id) {
    var c = S.card(id);
    if (!c) return;
    var items = [
      { label: t('map.addChild'), icon: '＋', onClick: function () { addChild(id); } },
      { label: t('map.addSibling'), icon: '≡', onClick: function () { addSibling(id); } },
      { label: t('map.duplicateNode'), icon: '⧉', onClick: function () { duplicateNode(id); } },
      { sep: true },
      { label: t('map.connect'), icon: '↗', onClick: function () { st.mode = 'link'; st.connectFrom = id; refresh(); } },
      { label: t('map.focus'), icon: '◎', onClick: function () { st.focus = id; st.focusCache = null; refresh(); } },
      { label: t('map.collapseNode'), icon: '⊟', onClick: function () { if (activeMap().collapsed.indexOf(id) < 0) toggleCollapse(id); } },
      { sep: true },
      { label: t('map.inlineEdit'), icon: '✎', onClick: function () { beginInlineEdit(id); } },
      { label: t('common.edit'), icon: '▤', onClick: function () { CC.app.openCard(id, { focusTitle: true }); } },
      { label: t('cards.delete'), icon: '🗑', danger: true, onClick: function () { CC.app.deleteCardFlow(id); } }
    ];
    if (st.sel.length > 1) {
      items.splice(3, 0, { label: t('map.alignLeft'), onClick: function () { align('left'); } });
      items.splice(4, 0, { label: t('map.alignTop'), onClick: function () { align('top'); } });
    }
    U.showMenu(x, y, items);
  }

  function edgeMenu(x, y, eid) {
    U.showMenu(x, y, [
      { label: t('map.edgeEdit'), icon: '✎', onClick: function () { editEdge(eid); } },
      { label: t('map.edgeUncertain'), icon: '?', onClick: function () { toggleUncertain(eid); } },
      { sep: true },
      { label: t('map.edgeDelete'), icon: '🗑', danger: true, onClick: function () { deleteEdge(eid); } }
    ]);
  }

  function canvasMenu(x, y) {
    U.showMenu(x, y, [
      { label: t('map.addNode'), onClick: function () { addNodeAtCenter(); } },
      { label: t('map.autoLayout'), onClick: function () { autoArrange(); } },
      { label: t('map.fit'), onClick: zoomFit },
      { sep: true },
      { label: t('map.showLabels'), onClick: function () { toggleLabels(); } },
      { label: t('map.marquee'), onClick: function () { toggleMarquee(); } },
      { label: t('map.exportImage'), onClick: exportPNG },
      { label: t('map.exportSvg'), onClick: exportSVG },
      { label: t('map.exportMd'), onClick: exportMarkdown }
    ]);
  }

  /* ------------------------------------------------------------------ */
  /* inline editing (edit the title straight on the canvas)             */
  /* ------------------------------------------------------------------ */

  function beginInlineEdit(id) {
    if (!model) return;
    var n = model.nodes[id];
    var card = n && n.card;
    if (!card) return;
    cancelInlineEdit();

    var box = document.createElement('div');
    box.className = 'inline-edit';
    var ta = document.createElement('textarea');
    ta.className = 'inline-edit-input';
    ta.rows = 1;
    ta.value = card.title || '';
    ta.placeholder = t('common.untitled');
    box.appendChild(ta);
    stage.appendChild(box);

    st.inline = { id: id, box: box, ta: ta, card: card };
    positionInline();

    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        commitInlineEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelInlineEdit();
      }
    });
    ta.addEventListener('blur', function () { if (st.mounted && st.inline) commitInlineEdit(); });
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });

    setTimeout(function () {
      ta.focus(); ta.select();
      ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
    }, 0);
    if (CC.app) CC.app.onSelectionChange(st.sel.indexOf(id) >= 0 ? st.sel : [id]);
  }

  function positionInline() {
    var s = st.inline;
    if (!s || !model) return;
    var n = model.nodes[s.id];
    if (!n) return;
    var sr = svg.getBoundingClientRect();
    var cr = stage.getBoundingClientRect();
    var k = view.k || 1;
    s.box.style.left = (sr.left - cr.left + view.x + (n.x - n.w / 2) * k) + 'px';
    s.box.style.top = (sr.top - cr.top + view.y + (n.y - n.h / 2) * k) + 'px';
    s.box.style.width = Math.max(90, n.w * k) + 'px';
    s.box.style.minHeight = Math.max(30, n.h * k) + 'px';
    s.box.style.fontSize = Math.max(11, n.fs * k) + 'px';
  }

  function commitInlineEdit() {
    var s = st.inline;
    if (!s) return;
    st.inline = null;
    if (s.box.parentNode) s.box.parentNode.removeChild(s.box);
    var val = s.ta.value;
    if (String(s.card.title || '') === val) { refresh(); return; }
    S.commit('edit', t('map.inlineEdit'), function () {
      s.card.title = val;
      s.card.updatedAt = Date.now();
    });
    L.invalidate(activeMap().id);
    refresh();
    if (CC.inspector && CC.inspector.isOpen()) CC.inspector.refresh();
  }

  function cancelInlineEdit() {
    var s = st.inline;
    if (!s) return;
    st.inline = null;
    if (s.box.parentNode) s.box.parentNode.removeChild(s.box);
  }

  /* ------------------------------------------------------------------ */
  /* marquee selection                                                  */
  /* ------------------------------------------------------------------ */

  function startMarquee(e) {
    var box = document.createElement('div');
    box.className = 'marquee-box';
    stage.appendChild(box);
    st.marquee = {
      x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY,
      add: !!e.shiftKey, base: e.shiftKey ? st.sel.slice() : [], el: box, moved: false
    };
    if (svg.setPointerCapture) { try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    svg.classList.add('marqueeing');
    updateMarquee(e);
  }

  function updateMarquee(e) {
    var q = st.marquee;
    if (!q) return;
    q.x1 = e.clientX;
    q.y1 = e.clientY;
    if (Math.abs(q.x1 - q.x0) + Math.abs(q.y1 - q.y0) > 4) q.moved = true;
    var cr = stage.getBoundingClientRect();
    var x = Math.min(q.x0, q.x1) - cr.left;
    var y = Math.min(q.y0, q.y1) - cr.top;
    q.el.style.left = x + 'px';
    q.el.style.top = y + 'px';
    q.el.style.width = Math.abs(q.x1 - q.x0) + 'px';
    q.el.style.height = Math.abs(q.y1 - q.y0) + 'px';
    st.sel = marqueeSelection(q);
    markSelection();
  }

  function marqueeSelection(q) {
    if (!model) return q.base.slice();
    var a = toWorld(q.x0, q.y0), b = toWorld(q.x1, q.y1);
    var rect = {
      x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y),
      x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y)
    };
    var ids = L.query(model, rect, 0, 4000).ids.filter(function (id) {
      var n = model.nodes[id];
      if (!n) return false;
      return !(n.x + n.w / 2 < rect.x1 || n.x - n.w / 2 > rect.x2 ||
               n.y + n.h / 2 < rect.y1 || n.y - n.h / 2 > rect.y2);
    });
    if (!q.add) return ids;
    var set = {};
    ids.concat(q.base).forEach(function (id) { set[id] = 1; });
    return Object.keys(set);
  }

  function endMarquee(e) {
    var q = st.marquee;
    if (!q) return;
    st.marquee = null;
    if (q.el.parentNode) q.el.parentNode.removeChild(q.el);
    svg.classList.remove('marqueeing');
    if (!q.moved && !q.add) { st.sel = []; markSelection(); }
    try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (CC.app) CC.app.onSelectionChange(st.sel);
  }

  function toggleMarquee() {
    st.marqueeMode = !st.marqueeMode;
    refresh();
  }

  /* ------------------------------------------------------------------ */
  /* minimap                                                             */
  /* ------------------------------------------------------------------ */

  function minimapEl() { return host && host.querySelector('#minimap'); }

  function toggleMinimap() {
    var m = activeMap();
    if (!m) return;
    m.style = m.style || {};
    /* undefined means "shown"; only an explicit false hides it */
    m.style.minimap = (m.style.minimap === false);
    S.saveSoon();
    refresh();
  }

  function paintMinimap() {
    var box = minimapEl();
    if (!box) return;
    var m = activeMap();
    if (!m || !model) { box.hidden = true; return; }
    var show = !(m.style && m.style.minimap === false);
    box.hidden = !show;
    if (!show) { st.mm = null; return; }

    var b = model.bounds;
    var w = Math.max(1, b.w), h = Math.max(1, b.h);
    var sc = Math.min((MM_W - MM_PAD * 2) / w, (MM_H - MM_PAD * 2) / h);
    var ox = MM_PAD + (MM_W - MM_PAD * 2 - w * sc) / 2 - b.minX * sc;
    var oy = MM_PAD + (MM_H - MM_PAD * 2 - h * sc) / 2 - b.minY * sc;
    st.mm = { sc: sc, ox: ox, oy: oy };

    var svgEl = box.querySelector('#minimap-svg');
    if (!svgEl) return;

    /* the cell layer only changes when the map itself changes */
    var sig = [Math.round(b.minX), Math.round(b.minY), Math.round(b.w), Math.round(b.h),
      st.total, (m.rev || 0)].join('|');
    if (st.mmSig !== sig) {
      st.mmSig = sig;
      var cells = [];
      try { cells = L.coarseSample(model, MM_CELLS); } catch (err) { cells = []; }
      var parts = ['<rect class="mm-bounds" x="' + (b.minX * sc + ox) + '" y="' + (b.minY * sc + oy) +
        '" width="' + (w * sc) + '" height="' + (h * sc) + '"/>'];
      cells.forEach(function (c) {
        var cw = Math.max(1, (c.x2 - c.x1) * sc), ch = Math.max(1, (c.y2 - c.y1) * sc);
        parts.push('<rect class="mm-cell" x="' + (c.x1 * sc + ox) + '" y="' + (c.y1 * sc + oy) +
          '" width="' + cw + '" height="' + ch + '" style="fill-opacity:' +
          Math.min(0.85, 0.25 + Math.log(c.count + 1) / 6).toFixed(2) + '"/>');
      });
      svgEl.innerHTML = parts.join('') + '<rect class="mm-view" x="0" y="0" width="0" height="0"/>';
    }

    var r = worldRect();
    var vr = svgEl.querySelector('.mm-view');
    if (vr) {
      vr.setAttribute('x', (r.x1 * sc + ox));
      vr.setAttribute('y', (r.y1 * sc + oy));
      vr.setAttribute('width', Math.max(2, (r.x2 - r.x1) * sc));
      vr.setAttribute('height', Math.max(2, (r.y2 - r.y1) * sc));
    }
  }

  function minimapWorldAt(lx, ly) {
    var mm = st.mm;
    if (!mm || !mm.sc) return null;
    return { x: (lx - mm.ox) / mm.sc, y: (ly - mm.oy) / mm.sc };
  }

  function bindMinimap(box) {
    var dragging = false;
    function jump(e) {
      var r = box.getBoundingClientRect();
      var w = minimapWorldAt(e.clientX - r.left, e.clientY - r.top);
      if (!w) return;
      var sr = svg.getBoundingClientRect();
      view.x = sr.width / 2 - w.x * view.k;
      view.y = sr.height / 2 - w.y * view.k;
      applyView();
      persistView();
      paintSoon();
    }
    box.addEventListener('pointerdown', function (e) {
      dragging = true;
      if (box.setPointerCapture) { try { box.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      e.preventDefault();
      e.stopPropagation();
      jump(e);
    });
    box.addEventListener('pointermove', function (e) { if (dragging) jump(e); });
    box.addEventListener('pointerup', function () { dragging = false; });
    box.addEventListener('pointercancel', function () { dragging = false; });
  }

  /* ------------------------------------------------------------------ */
  /* mutations                                                          */
  /* ------------------------------------------------------------------ */

  /* Create a node at a world point. By default it is linked to the selected
     node (or the nearest one) so a line appears immediately. Shift = floating. */
  function addNodeAt(wx, wy, noLink) {
    var m = activeMap();
    if (!m) { CC.app.newMapFlow().then(function () { addNodeAt(wx, wy, noLink); }); return; }
    var target = null;
    var LINK_DIST = 340;
    if (!noLink && model) {
      if (st.sel.length === 1 && model.nodes[st.sel[0]]) {
        var sn = model.nodes[st.sel[0]];
        if (Math.sqrt((sn.x - wx) * (sn.x - wx) + (sn.y - wy) * (sn.y - wy)) <= LINK_DIST) target = st.sel[0];
      }
      if (!target) {
        var near = L.query(model, { x1: wx - LINK_DIST, y1: wy - LINK_DIST, x2: wx + LINK_DIST, y2: wy + LINK_DIST }, 0, 40).ids;
        var best = 1e9;
        near.forEach(function (id) {
          var n = model.nodes[id];
          if (!n) return;
          var d = (n.x - wx) * (n.x - wx) + (n.y - wy) * (n.y - wy);
          if (d < best) { best = d; target = id; }
        });
        if (best > LINK_DIST * LINK_DIST) target = null;
      }
    }
    var c = null;
    S.commit('create', target ? t('map.autoChild') : t('map.addNode'), function () {
      c = S.newCard({ title: '' }, true);
      m.offsets = m.offsets || {};
      m.positions = m.positions || {};
      if (m.structure === 'free') m.positions[c.id] = { x: wx, y: wy };
      else if (!target) m.offsets[c.id] = { x: wx, y: wy };
      if (target) {
        m.edges.push({ id: U.uid('e'), from: target, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: false });
      }
      m.updatedAt = Date.now();
    });
    st.sel = [c.id];
    refresh();
    CC.app.openCard(c.id, { focusTitle: true });
  }

  function addNodeAtCenter() {
    var r = svg.getBoundingClientRect();
    var p = toWorld(r.left + r.width / 2, r.top + r.height / 2);
    addNodeAt(p.x, p.y);
  }

  function addChild(id) {
    var m = activeMap();
    if (!m) return;
    var parent = model && model.nodes[id];
    var c = null;
    S.commit('create', t('map.addChild'), function () {
      c = S.newCard({ title: '' }, true);
      m.positions[c.id] = { x: parent ? parent.x + parent.w + 80 : 0, y: parent ? parent.y + 40 : 0 };
      m.edges.push({ id: U.uid('e'), from: id, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: false });
      if (m.collapsed.indexOf(id) >= 0) m.collapsed = m.collapsed.filter(function (x) { return x !== id; });
      m.updatedAt = Date.now();
    });
    st.sel = [c.id];
    refresh();
    CC.app.openCard(c.id, { focusTitle: true });
  }

  function addSibling(id) {
    var m = activeMap();
    var pid = S.parentOf(m, id);
    if (!pid) return addChild(id);
    var parent = model && model.nodes[pid];
    var c = null;
    S.commit('create', t('map.addSibling'), function () {
      c = S.newCard({ title: '' }, true);
      m.positions[c.id] = { x: parent ? parent.x + parent.w + 80 : 0, y: parent ? parent.y + 70 : 0 };
      m.edges.push({ id: U.uid('e'), from: pid, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: false });
      m.updatedAt = Date.now();
    });
    st.sel = [c.id];
    refresh();
    CC.app.openCard(c.id, { focusTitle: true });
  }

  function duplicateNode(id) {
    var m = activeMap();
    var src = S.card(id);
    if (!m || !src) return;
    var pid = S.parentOf(m, id);
    var base = model && model.nodes[id];
    var c = null;
    S.commit('create', t('map.duplicateNode'), function () {
      c = S.newCard({
        title: src.title + ' ' + t('map.copySuffix'),
        body: src.body, note: src.note,
        tags: (src.tags || []).slice(), langs: (src.langs || []).slice(),
        category: src.category, style: JSON.parse(JSON.stringify(src.style || {}))
      }, true);
      m.positions[c.id] = { x: (base ? base.x : 0) + 40, y: (base ? base.y : 0) + 40 };
      if (pid) m.edges.push({ id: U.uid('e'), from: pid, to: c.id, type: 'hierarchy', color: '', label: '', uncertain: false });
    });
    st.sel = [c.id];
    refresh();
  }

  function align(mode) {
    var m = activeMap();
    if (!m || st.sel.length < 2) return;
    var nodes = st.sel.map(function (id) { return model.nodes[id]; }).filter(Boolean);
    if (nodes.length < 2) return;
    var target = mode === 'left'
      ? Math.min.apply(null, nodes.map(function (n) { return n.x - n.w / 2; }))
      : Math.min.apply(null, nodes.map(function (n) { return n.y - n.h / 2; }));
    S.commit('structure', t('map.align'), function () {
      nodes.forEach(function (n) {
        var dx = mode === 'left' ? target + n.w / 2 - n.x : 0;
        var dy = mode === 'top' ? target + n.h / 2 - n.y : 0;
        if (m.structure === 'free') m.positions[n.id] = { x: n.x + dx, y: n.y + dy };
        else m.offsets[n.id] = { x: n.x + dx, y: n.y + dy };
      });
    });
    L.invalidate(m.id);
  }

  function deleteEdge(eid) {
    var m = activeMap();
    if (!m) return;
    U.confirm(t('map.edgeDelete'), t('map.deleteEdgeConfirm'), { danger: true }).then(function (ok) {
      if (!ok) return;
      S.commit('edit', t('map.edgeDelete'), function () {
        m.edges = m.edges.filter(function (e) { return e.id !== eid; });
      });
      L.invalidate(m.id);
    });
  }

  function toggleUncertain(eid) {
    var m = activeMap();
    var e = m && m.edges.find(function (x) { return x.id === eid; });
    if (!e) return;
    S.commit('edit', t('map.edgeUncertain'), function () { e.uncertain = !e.uncertain; });
  }

  function toggleLabels() {
    var m = activeMap();
    if (!m) return;
    m.style = m.style || {};
    m.style.showLabels = m.style.showLabels === false;
    S.saveSoon();
    refresh();
  }

  function autoArrange() {
    var m = activeMap();
    if (!m) return;
    S.commit('map', t('map.autoLayout'), function () {
      m.offsets = {};
      if (m.structure === 'free') {
        var cards = S.mapCards(m);
        cards.forEach(function (c, i) {
          m.positions[c.id] = { x: (i % 4) * 260, y: Math.floor(i / 4) * 150 };
        });
      }
    });
    L.invalidate(m.id);
    setTimeout(zoomFit, 30);
  }

  var fitTries = 0;

  function zoomFit() {
    if (!st.mounted || !host || !svg) return;
    /* auto-arrange / structure switch call zoomFit before the debounced
       refresh runs, so rebuild the model here instead of fitting old bounds */
    var fm = activeMap();
    if (fm) model = L.get(fm);
    if (!model || !Object.keys(model.nodes).length) return;
    var r = svg.getBoundingClientRect();
    /* the stage may not have been laid out yet on the first frame */
    if (r.width < 120 || r.height < 120) {
      if (fitTries++ < 10) setTimeout(zoomFit, 60);
      return;
    }
    fitTries = 0;
    var b = model.bounds;
    var pad = 70;
    var k = Math.min((r.width - pad * 2) / Math.max(1, b.w), (r.height - pad * 2) / Math.max(1, b.h), 1.25);
    k = Math.max(0.04, k);
    view.k = k;
    view.x = r.width / 2 - ((b.minX + b.maxX) / 2) * k;
    view.y = r.height / 2 - ((b.minY + b.maxY) / 2) * k;
    applyView();
    host.querySelector('#zoom-val').textContent = Math.round(k * 100) + '%';
    persistView();
    paint();
  }

  function zoomBy(f) {
    if (!st.mounted || !host || !svg) return;
    var r = svg.getBoundingClientRect();
    var cx = r.width / 2, cy = r.height / 2;
    var world = { x: (cx - view.x) / view.k, y: (cy - view.y) / view.k };
    var k = Math.min(2.6, Math.max(0.04, view.k * f));
    view.k = k;
    view.x = cx - world.x * k;
    view.y = cy - world.y * k;
    applyView();
    host.querySelector('#zoom-val').textContent = Math.round(k * 100) + '%';
    persistView();
    paint();
  }

  /* ------------------------------------------------------------------ */
  /* edge dialog                                                        */
  /* ------------------------------------------------------------------ */

  function edgeTypeOptions(selected) {
    return ['hierarchy', 'synonym', 'antonym', 'cause', 'example', 'contrast', 'reference', 'custom']
      .map(function (k) {
        return '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + U.esc(t('edge.' + k)) + '</option>';
      }).join('');
  }

  function openEdgeDialog(eid, pair) {
    var m = activeMap();
    if (!m) return;
    var edge = eid ? m.edges.find(function (e) { return e.id === eid; }) : null;
    var ls = (edge && edge.style) || {};
    var from = edge ? edge.from : pair.from;
    var to = edge ? edge.to : pair.to;
    var wrap = document.createElement('div');
    wrap.className = 'form';
    wrap.innerHTML =
      '<div class="edge-dialog-head">' +
        '<span class="chip">' + U.esc(S.cardTitle(S.card(from))) + '</span>' +
        '<span class="arrow">→</span>' +
        '<span class="chip">' + U.esc(S.cardTitle(S.card(to))) + '</span>' +
      '</div>' +
      '<label class="field"><span>' + U.esc(t('map.edgeType')) + '</span>' +
        '<select class="input" id="edge-type">' + edgeTypeOptions(edge ? edge.type : 'hierarchy') + '</select></label>' +
      '<label class="field"><span>' + U.esc(t('map.edgeLabel')) + '</span>' +
        '<input class="input" id="edge-label" value="' + U.esc(edge ? edge.label || '' : '') + '" placeholder="' + U.esc(t('common.optional')) + '"></label>' +
      '<div class="field"><span>' + U.esc(t('common.color')) + '</span>' +
        '<div class="swatches" id="edge-colors">' +
          ['', 'var(--accent)', 'var(--warn)', 'var(--info)', 'var(--muted)'].map(function (c) {
            return '<button type="button" class="swatch' + ((edge && edge.color === c) || (!edge && c === '') ? ' active' : '') + '" data-color="' + U.esc(c) + '" style="background:' + (c || 'transparent') + '"></button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><span>' + U.esc(t('map.edgeLineStyle')) + '</span>' +
        '<div class="segmented tiny" id="edge-dash">' +
          ['solid', 'dashed', 'dotted'].map(function (k) {
            return '<button type="button" class="seg' + ((ls.dash || 'solid') === k ? ' active' : '') + '" data-dash="' + k + '">' + U.esc(t('map.edge' + k.charAt(0).toUpperCase() + k.slice(1))) + '</button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><span>' + U.esc(t('map.edgeArrowStyle')) + '</span>' +
        '<div class="segmented tiny" id="edge-arrow">' +
          ['solid', 'open', 'none'].map(function (k) {
            return '<button type="button" class="seg' + ((ls.arrow || 'solid') === k ? ' active' : '') + '" data-arrow="' + k + '">' + U.esc(t('map.edgeArrow' + k.charAt(0).toUpperCase() + k.slice(1))) + '</button>';
          }).join('') +
        '</div></div>' +
      '<div class="field"><span>' + U.esc(t('map.edgeWidth')) + '</span>' +
        '<div class="segmented tiny" id="edge-width">' +
          ['thin', 'medium', 'thick'].map(function (k) {
            return '<button type="button" class="seg' + ((ls.width || 'medium') === k ? ' active' : '') + '" data-width="' + k + '">' + U.esc(t('map.edge' + k.charAt(0).toUpperCase() + k.slice(1))) + '</button>';
          }).join('') +
        '</div></div>' +
      '<label class="check"><input type="checkbox" id="edge-uncertain"' + (edge && edge.uncertain ? ' checked' : '') + '><span>' + U.esc(t('map.edgeUncertain')) + '</span></label>';

    var color = edge ? edge.color || '' : '';
    var style = {
      dash: (edge && edge.style && edge.style.dash) || 'solid',
      arrow: (edge && edge.style && edge.style.arrow) || 'solid',
      width: (edge && edge.style && edge.style.width) || 'medium'
    };
    setTimeout(function () {
      wrap.querySelectorAll('.swatch').forEach(function (b) {
        b.onclick = function () {
          wrap.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          color = b.getAttribute('data-color');
        };
      });
      bindSeg(wrap, '#edge-dash', 'dash', style);
      bindSeg(wrap, '#edge-arrow', 'arrow', style);
      bindSeg(wrap, '#edge-width', 'width', style);
    }, 0);

    U.openModal({
      title: eid ? t('map.edgeEdit') : t('map.connect'),
      body: wrap,
      actions: [
        eid ? { id: 'del', label: t('map.edgeDelete'), danger: true, onClick: function () { deleteEdge(eid); } } : null,
        { id: 'cancel', label: t('common.cancel'), ghost: true },
        {
          id: 'ok', label: t('common.ok'), primary: true,
          onClick: function () {
            var type = wrap.querySelector('#edge-type').value;
            var label = wrap.querySelector('#edge-label').value.trim();
            var unc = wrap.querySelector('#edge-uncertain').checked;
            if (edge) {
              S.commit('edit', t('map.edgeEdit'), function () {
                edge.type = type; edge.label = label; edge.color = color; edge.uncertain = unc;
                edge.style = { dash: style.dash, arrow: style.arrow, width: style.width };
              });
            } else {
              S.commit('edit', t('map.connect'), function () {
                m.edges.push({
                  id: U.uid('e'), from: from, to: to, type: type, color: color, label: label, uncertain: unc,
                  style: { dash: style.dash, arrow: style.arrow, width: style.width }
                });
                m.updatedAt = Date.now();
              });
            }
            L.invalidate(m.id);
            refresh();
            return true;
          }
        }
      ].filter(Boolean)
    });
  }

  function bindSeg(wrap, sel, key, target) {
    var group = wrap.querySelector(sel);
    if (!group) return;
    group.querySelectorAll('.seg').forEach(function (b) {
      b.onclick = function () {
        group.querySelectorAll('.seg').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        target[key] = b.getAttribute('data-' + key);
      };
    });
  }

  function editEdge(eid) { openEdgeDialog(eid); }

  function setStructure(kind) {
    var m = activeMap();
    if (!m || m.structure === kind) return;
    if (kind === 'free') {
      var pos = {};
      Object.keys(model.nodes).forEach(function (id) { pos[id] = { x: model.nodes[id].x, y: model.nodes[id].y }; });
      S.commit('structure', t('map.structure'), function () {
        m.structure = 'free';
        m.positions = Object.assign({}, m.positions, pos);
        m.offsets = {};
      });
    } else {
      S.commit('structure', t('map.structure'), function () {
        m.structure = kind;
        m.offsets = {};
      });
    }
    L.invalidate(m.id);
    setTimeout(zoomFit, 30);
  }

  /* ------------------------------------------------------------------ */
  /* export                                                             */
  /* ------------------------------------------------------------------ */

  function exportData() {
    var cs = getComputedStyle(document.documentElement);
    var bg = cs.getPropertyValue('--surface').trim() || '#fff';
    var text = cs.getPropertyValue('--text').trim() || '#222';
    var muted = cs.getPropertyValue('--muted').trim() || '#777';
    var border = cs.getPropertyValue('--border').trim() || '#ddd';
    var hier = cs.getPropertyValue('--edge-hierarchy').trim() || '#bbb';
    var free = cs.getPropertyValue('--edge-free').trim() || '#999';
    var total = L.totalNodes(model);
    var all = total <= 2600;
    var nodes = {};
    if (all) {
      nodes = model.nodes;
    } else {
      var vis = {};
      L.query(model, worldRect(), 300, 2000).ids.forEach(function (id) { vis[id] = 1; });
      Object.keys(model.nodes).forEach(function (id) { if (vis[id]) nodes[id] = model.nodes[id]; });
    }
    var ids = Object.keys(nodes);
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach(function (id) {
      var n = nodes[id];
      minX = Math.min(minX, n.x - n.w / 2); maxX = Math.max(maxX, n.x + n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2); maxY = Math.max(maxY, n.y + n.h / 2);
    });
    if (!ids.length) { minX = 0; minY = 0; maxX = 200; maxY = 120; }
    var w = Math.max(320, maxX - minX + 120);
    var h = Math.max(200, maxY - minY + 120);
    var pad = 60;

    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="' + (minX - pad) + ' ' + (minY - pad) + ' ' + w + ' ' + h + '">');
    parts.push('<style>' +
      'text{font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}' +
      '.node-rect{fill:#fff;stroke:' + border + ';stroke-width:1}' +
      '.node-title{font-size:13.5px;font-weight:600;fill:' + text + '}' +
      '.node-pill-text{font-size:9.5px;font-weight:600}' +
      '.node-more{fill:' + muted + ';font-size:10px}' +
      '.note-dot{fill:' + muted + '}' +
      '.collapse-pill rect{fill:#eef2ee;stroke:' + border + '}.collapse-pill text{fill:' + muted + ';font-size:10px}' +
      '.edge-line{fill:none;stroke-width:1.6}.edge.hierarchy .edge-line{stroke:' + hier + '}' +
      '.edge.relation .edge-line{stroke:' + free + '}.edge-arrow{fill:' + free + '}' +
      '.edge-label rect{fill:#fff;stroke:' + border + '}.edge-label text{fill:' + muted + ';font-size:10.5px}' +
      '.doubt-mark circle{fill:#c98a2e}.doubt-mark text{fill:#fff;font-size:10px;font-weight:700}' +
      '</style>');
    parts.push('<rect x="' + (minX - pad) + '" y="' + (minY - pad) + '" width="' + w + '" height="' + h + '" fill="' + bg + '"/>');

    var vis2 = {};
    ids.forEach(function (id) { vis2[id] = 1; });
    model.edges.forEach(function (e) {
      if (!vis2[e.from] || !vis2[e.to]) return;
      var a = nodes[e.from], b = nodes[e.to];
      var hier2 = e.type === 'hierarchy';
      var g = edgeGeometry(a, b, hier2, e);
      parts.push('<g class="edge ' + (hier2 ? 'hierarchy' : 'relation') + '"><path class="edge-line" d="' + g.d + '"' + (e.color ? ' style="stroke:' + e.color + '"' : '') + '/>' +
        (hier2 ? '' : '<path class="edge-arrow" d="' + g.arrow + '"/>') +
        (e.label ? '<g class="edge-label"><rect x="' + (g.mx - 40) + '" y="' + (g.my - 10) + '" width="80" height="18" rx="9"/><text x="' + g.mx + '" y="' + (g.my + 3.5) + '" text-anchor="middle">' + U.esc(e.label) + '</text></g>' : '') +
        '</g>');
    });

    ids.forEach(function (id) {
      ensureMeasured(nodes[id]);
      var n = nodes[id], c = n.card, s = c.style || {};
      var shape = s.shape || 'rounded';
      var rx = shape === 'rect' ? 4 : shape === 'pill' ? n.h / 2 : 13;
      parts.push('<g transform="translate(' + (n.x - n.w / 2) + ',' + (n.y - n.h / 2) + ')">');
      parts.push('<rect class="node-rect" width="' + n.w + '" height="' + n.h + '" rx="' + rx + '"' + (s.fill ? ' fill="' + U.esc(s.fill) + '"' : '') + '/>');
      var ty = n.titleY;
      (n.lines || []).forEach(function (line) {
        parts.push('<text class="node-title" x="15" y="' + ty + '" style="font-size:' + n.fs + 'px">' + U.esc(line) + '</text>');
        ty += n.lineH;
      });
      parts.push('</g>');
    });
    parts.push('</svg>');
    return { xml: parts.join(''), w: w, h: h, bg: bg };
  }

  function exportPNG() {
    if (!model) return;
    var d = exportData();
    var img = new Image();
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(d.xml);
    img.onload = function () {
      var scale = 2;
      var canvas = document.createElement('canvas');
      canvas.width = d.w * scale; canvas.height = d.h * scale;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = d.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      var dataUrl = canvas.toDataURL('image/png');
      var name = (activeMap() ? activeMap().name : 'map').replace(/[\\\/:*?"<>|]/g, '_');
      window.api.saveImage({ dataUrl: dataUrl, suggested: name + '.png' }).then(function (r) {
        if (r && r.ok) U.toast(t('map.exportDone', { path: r.path }), 'ok');
        else if (r && !r.canceled) U.toast(t('map.exportFail', { msg: r.error || '' }), 'bad');
      });
    };
    img.onerror = function () { U.toast(t('map.exportFail', { msg: 'svg' }), 'bad'); };
    img.src = url;
  }

  function exportSVG() {
    if (!model) return;
    var d = exportData();
    var name = (activeMap() ? activeMap().name : 'map').replace(/[\\\/:*?"<>|]/g, '_');
    window.api.saveText({ text: d.xml, suggested: name + '.svg', ext: 'svg' }).then(function (r) {
      if (r && r.ok) U.toast(t('map.exportDone', { path: r.path }), 'ok');
    });
  }

  function exportMarkdown() {
    var m = activeMap();
    if (!m || !model) return;
    var children = {};
    model.edges.forEach(function (e) {
      if (e.type === 'hierarchy') (children[e.from] = children[e.from] || []).push(e.to);
    });
    var visited = {};
    var lines = ['# ' + m.name, ''];
    function walk(id, depth) {
      if (visited[id]) return;
      visited[id] = 1;
      var n = model.nodes[id];
      if (!n) return;
      var c = n.card;
      lines.push(new Array(depth + 1).join('  ') + '- ' + (c.title || t('common.untitled')));
      if (c.note) lines.push(new Array(depth + 2).join('  ') + '> ' + c.note.replace(/\n/g, ' '));
      (children[id] || []).forEach(function (k) { walk(k, depth + 1); });
    }
    model.roots.forEach(function (r) { walk(r, 0); });
    Object.keys(model.nodes).forEach(function (id) { if (!visited[id]) walk(id, 0); });
    var name = m.name.replace(/[\\\/:*?"<>|]/g, '_');
    window.api.saveText({ text: lines.join('\n'), suggested: name + '.md', ext: 'md' }).then(function (r) {
      if (r && r.ok) U.toast(t('map.exportDone', { path: r.path }), 'ok');
    });
  }

  /* ------------------------------------------------------------------ */
  /* toolbar                                                            */
  /* ------------------------------------------------------------------ */

  function bindToolbar(root) {
    root.querySelectorAll('[data-act]').forEach(function (btn) {
      var act = btn.getAttribute('data-act');
      btn.addEventListener('click', function () {
        var m = activeMap();
        if (act === 'fit') return zoomFit();
        if (act === 'zoom-in') return zoomBy(1.2);
        if (act === 'zoom-out') return zoomBy(1 / 1.2);
        if (act === 'add') return m ? addNodeAtCenter() : CC.app.newMapFlow();
        if (act === 'link') {
          if (!m) return;
          st.mode = st.mode === 'link' ? 'select' : 'link';
          st.connectFrom = null;
          btn.classList.toggle('active', st.mode === 'link');
          refresh();
          return;
        }
        if (act === 'arrange') return autoArrange();
        if (act === 'marquee') return toggleMarquee();
        if (act === 'minimap') return toggleMinimap();
        if (act === 'present') return CC.present.start();
        if (act === 'print') return CC.print.print();
        if (act === 'focus') return toggleFocus();
        if (act === 'structure') return structureMenu(btn);
        if (act === 'ai') return CC.app.openAI('draft');
        if (act === 'more') return moreMenu(btn);
      });
    });
  }

  function structureMenu(btn) {
    var r = btn.getBoundingClientRect();
    U.showMenu(r.right - 160, r.bottom + 6, [
      { label: t('map.tree'), hint: '←→', onClick: function () { setStructure('tree'); } },
      { label: t('map.org'), hint: '↑↓', onClick: function () { setStructure('org'); } },
      { label: t('map.free'), onClick: function () { setStructure('free'); } }
    ]);
  }

  function toggleFocus() {
    if (!st.mounted) return;
    if (st.focus) st.focus = null;
    else {
      if (!st.sel.length) { U.toast(t('map.noSelection')); return; }
      st.focus = st.sel[0];
    }
    st.focusCache = null;
    refresh();
  }

  function moreMenu(btn) {
    var r = btn.getBoundingClientRect();
    var m = activeMap();
    if (!m) return;
    var items = [
      { label: t('map.rename'), icon: '✎', onClick: function () { CC.app.renameMapFlow(m); } },
      { label: t('map.duplicate'), icon: '⧉', onClick: function () { CC.app.duplicateMap(m); } },
      { label: t('map.template'), icon: '▤', onClick: function () { CC.app.saveTemplate(m); } },
      { sep: true },
      { label: t('theme.title') + ' · ' + t(mapTheme().nameKey), onClick: function (btn) { themeMenu(btn); } },
      { label: t('map.addBoundary'), onClick: function () { addBoundary(); } },
      { label: (m.style && m.style.showLabels === false) ? t('map.showLabels') : t('map.hideLabels'), onClick: toggleLabels },
      { label: (m.style && m.style.minimap === false) ? t('map.showMinimap') : t('map.hideMinimap'), onClick: toggleMinimap },
      { label: t('map.resetPositions'), onClick: function () {
          S.commit('map', t('map.resetPositions'), function () { m.offsets = {}; m.positions = {}; });
          L.invalidate(m.id);
        } },
      { label: t('map.exportImage'), icon: '⇩', onClick: exportPNG },
      { label: t('map.exportSvg'), onClick: exportSVG },
      { label: t('map.exportMd'), onClick: exportMarkdown },
      { sep: true },
      { label: t('present.start'), icon: '▶', onClick: function () { CC.present.start(); } },
      { label: t('print.title') + ' · ' + t('print.a4'), icon: '⎙', onClick: function () { CC.print.print(); } },
      { sep: true },
      { label: t('map.delete'), icon: '🗑', danger: true, onClick: function () { CC.app.deleteMapFlow(m); } }
    ];
    U.showMenu(r.left - 190, r.bottom + 6, items);
  }

  function addBoundary() {
    var m = activeMap();
    if (!m) return;
    if (!st.sel.length) { U.toast(t('map.boundaryHint')); return; }
    U.prompt(t('map.addBoundary'), t('map.boundaryDefault'), {}).then(function (label) {
      if (!label) return;
      S.commit('map', t('map.addBoundary'), function () {
        m.boundaries = m.boundaries || [];
        m.boundaries.push({ id: U.uid('b'), label: label, color: 'var(--accent)', cards: st.sel.slice() });
      });
      L.invalidate(m.id);
    });
  }

  /* ------------------------------------------------------------------ */
  /* public                                                             */
  /* ------------------------------------------------------------------ */

  function emptyArt() {
    return '<svg width="120" height="86" viewBox="0 0 120 86" fill="none">' +
      '<rect x="42" y="32" width="36" height="22" rx="7" stroke="currentColor" stroke-width="1.4" opacity=".55"/>' +
      '<rect x="4" y="8" width="30" height="18" rx="6" stroke="currentColor" stroke-width="1.2" opacity=".35"/>' +
      '<rect x="86" y="12" width="30" height="18" rx="6" stroke="currentColor" stroke-width="1.2" opacity=".35"/>' +
      '<rect x="10" y="60" width="30" height="18" rx="6" stroke="currentColor" stroke-width="1.2" opacity=".35"/>' +
      '<rect x="82" y="58" width="30" height="18" rx="6" stroke="currentColor" stroke-width="1.2" opacity=".35"/>' +
      '<path d="M34 20c8 4 10 8 8 12M86 24c-9 4-11 8-9 10M40 66c8-3 10-6 8-10M82 64c-9-3-11-6-9-9" stroke="currentColor" stroke-width="1.2" opacity=".4"/>' +
      '</svg>';
  }

  /* The presentation order follows the map structure: roots first, depth
     first, then any card that never made it into the tree. */
  function presentItems() {
    if (!model) return [];
    var out = [];
    var seen = {};
    var walk = function (id, depth) {
      if (seen[id]) return;
      seen[id] = 1;
      var n = model.nodes[id];
      if (!n) return;
      var c = n.card || {};
      out.push({
        id: id,
        title: c.title || '',
        body: c.body || '',
        note: c.note || '',
        summary: c.summary || '',
        tags: c.tags || [],
        kind: (c.style && c.style.summaryKind) || ''
      });
      (n.kids || []).forEach(function (k) { walk(k, depth + 1); });
    };
    (model.roots || []).forEach(function (r) { walk(r, 0); });
    Object.keys(model.nodes).forEach(function (id) { if (!seen[id]) walk(id, 0); });
    return out;
  }

  /* A plain description of the drawn scene, used by the A4 printer. */
  function sceneForPrint() {
    if (!model) return null;
    var ids = Object.keys(model.nodes);
    var nodes = [];
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach(function (id) {
      var n = ensureMeasured(model.nodes[id]);
      var c = n.card || {};
      var s = c.style || {};
      nodes.push({
        id: id, x: n.x, y: n.y, w: n.w, h: n.h,
        title: c.title || '', lines: n.lines || [], fs: n.fs, lineH: n.lineH, titleY: n.titleY,
        fill: s.fill || '#ffffff', shape: s.shape || 'rounded',
        summary: c.summary || ''
      });
      minX = Math.min(minX, n.x - n.w / 2); maxX = Math.max(maxX, n.x + n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2); maxY = Math.max(maxY, n.y + n.h / 2);
    });
    if (!ids.length) { minX = 0; minY = 0; maxX = 200; maxY = 120; }
    var vis = {};
    ids.forEach(function (id) { vis[id] = 1; });
    var edges = [];
    model.edges.forEach(function (e) {
      if (!vis[e.from] || !vis[e.to]) return;
      var a = model.nodes[e.from], b = model.nodes[e.to];
      var g = edgeGeometry(a, b, e.type === 'hierarchy', e);
      edges.push({
        id: e.id, type: e.type, label: e.label || '', color: e.color || '',
        uncertain: !!e.uncertain, style: e.style || {},
        d: g.d, arrow: e.type === 'hierarchy' ? '' : g.arrow, mx: g.mx, my: g.my
      });
    });
    return {
      mapName: model.map ? model.map.name : '',
      bounds: { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY },
      nodes: nodes, edges: edges
    };
  }

  function selectCard(id) {
    st.sel = id ? [id] : [];
    if (st.mounted) { markSelection(); if (CC.app) CC.app.onSelectionChange(st.sel); }
  }

  function focusCard(id) { st.focus = id; st.focusCache = null; if (st.mounted) refresh(); }
  function clearFocus() { st.focus = null; st.focusCache = null; if (st.mounted) refresh(); }

  function resetState() {
    cancelInlineEdit();
    st.sel = []; st.edgeSel = null; st.mode = 'select'; st.connectFrom = null;
    st.focus = null; st.drag = null; st.pan = null; st.inline = null; st.marquee = null;
    st._viewApplied = false;
    st._fittedOnce = false; st.focusCache = null; model = null;
  }

  function unmount() {
    st.mounted = false;
    cancelInlineEdit();
    host = null;
  }

  function beginLink(id) {
    if (!st.mounted) return;
    st.mode = 'link';
    st.connectFrom = id || null;
    refresh();
  }

  function centerOn(id) {
    if (!st.mounted || !model || !model.nodes[id]) return;
    var n = model.nodes[id];
    var r = svg.getBoundingClientRect();
    view.x = r.width / 2 - n.x * view.k;
    view.y = r.height / 2 - n.y * view.k;
    applyView();
    persistView();
    paint();
  }

  CC.graph = {
    mount: mount, refresh: refresh, unmount: unmount, resetState: resetState,
    selectCard: selectCard, focusCard: focusCard, clearFocus: clearFocus,
    zoomFit: zoomFit, addChild: addChild, addSibling: addSibling,
    toggleFocus: toggleFocus, beginLink: beginLink, centerOn: centerOn,
    addNodeAt: addNodeAt, editEdge: editEdge, exportPNG: exportPNG,
    exportSVG: exportSVG, exportMarkdown: exportMarkdown,
    duplicateNode: duplicateNode, setStructure: setStructure,
    selection: function () { return st.sel.slice(); },
    beginInlineEdit: beginInlineEdit,
    endInlineEdit: function () { commitInlineEdit(); },
    minimapWorldAt: minimapWorldAt,
    presentItems: presentItems, sceneForPrint: sceneForPrint,
    currentMapId: function () { var m = activeMap(); return m ? m.id : null; },
    mapTheme: mapTheme,
    viewInfo: function () { return { x: view.x, y: view.y, k: view.k }; },
    nodeScreenPos: function (id) {
      var n = model && model.nodes[id];
      if (!n) return null;
      var r = svg.getBoundingClientRect();
      return { x: r.left + view.x + n.x * view.k, y: r.top + view.y + n.y * view.k };
    },
    focus: function () { return st.focus; },
    setMode: function (m) { st.mode = m; },
    stats: function () { return { visible: st.visible, total: st.total, lod: st.lod }; }
  };
})();
