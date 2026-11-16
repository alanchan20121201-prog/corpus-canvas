/* Global relationship graph: force-directed network of all cards and typed
   relation edges. Standalone module (CC.forceGraph), reuses CC.layout for text
   geometry and copies graph.js's pan/zoom pattern. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  var root = null, svg = null, vp = null, st = null;
  var nodes = [], edges = [], byId = {};
  var viewKey = '';
  var raf = 0, settle = 0, alpha = 0;

  /* collect all unique edges across maps, filtering deleted endpoints */
  function collect() {
    var out = [], seen = {};
    S.maps().forEach(function (m) {
      (m.edges || []).forEach(function (e) {
        if (!e.from || !e.to || e.from === e.to) return;
        if (!S.card(e.from) || !S.card(e.to)) return;
        var key = (e.from < e.to ? e.from + '|' + e.to : e.to + '|' + e.from) + '|' + (e.type || 'custom');
        if (seen[key]) { seen[key].maps.push(m.id); return; }
        seen[key] = { maps: [m.id] };
        out.push({ from: e.from, to: e.to, type: e.type || 'custom', color: e.color || '', uncertain: !!e.uncertain, maps: [m.id] });
      });
    });
    return out;
  }

  function currentKey() {
    var m = S.maps().map(function (x) { return x.rev || 0; }).join(',');
    return S.cardsRev() + '|' + m;
  }

  function savedPos() {
    var meta = S.state().meta || {};
    return meta.forceGraph && meta.forceGraph.positions ? meta.forceGraph.positions : {};
  }

  function persist() {
    var meta = S.state().meta;
    if (!meta.forceGraph) meta.forceGraph = {};
    var pos = {};
    nodes.forEach(function (n) { pos[n.id] = { x: Math.round(n.x), y: Math.round(n.y) }; });
    meta.forceGraph.positions = pos;
    meta.forceGraph.view = { x: view.x, y: view.y, k: view.k };
    S.saveSoon();
  }

  var view = { x: 0, y: 0, k: 1 };

  function build() {
    var cards = S.cards();
    edges = collect();
    byId = {};
    var saved = savedPos();
    nodes = cards.map(function (c, i) {
      var p = saved[c.id];
      var a = i * 2.39996, r = 26 * Math.sqrt(i + 1);
      var n = {
        id: c.id, card: c,
        x: p ? p.x : Math.cos(a) * r,
        y: p ? p.y : Math.sin(a) * r,
        px: p ? p.x : Math.cos(a) * r,
        py: p ? p.y : Math.sin(a) * r,
        pinned: false
      };
      byId[c.id] = n;
      return n;
    });
    /* adjacency for spring forces */
    nodes.forEach(function (n) { n.links = []; });
    edges.forEach(function (e) {
      var a = byId[e.from], b = byId[e.to];
      if (a && b) { a.links.push(b); b.links.push(a); }
    });
    var sv = saved.view;
    if (sv) { view.x = sv.x || 0; view.y = sv.y || 0; view.k = sv.k || 1; }
    viewKey = currentKey();
  }

  /* one Verlet-ish relaxation step */
  function stepPhysics() {
    var n = nodes.length, REP = 6000, SPRING = 0.02, REST = 170, GRAV = 0.0025, DAMP = 0.86;
    var i, j, a, b, dx, dy, d2, d, f;
    if (n > 400) REP = 2200;   /* keep large graphs affordable */
    for (i = 0; i < n; i++) {
      a = nodes[i];
      if (a.pinned) continue;
      for (j = i + 1; j < n; j++) {
        b = nodes[j];
        dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy + 1;
        if (d2 > 900000) continue;
        f = REP / d2;
        d = Math.sqrt(d2);
        a.x += (dx / d) * f; a.y += (dy / d) * f;
        b.x -= (dx / d) * f; b.y -= (dy / d) * f;
      }
    }
    edges.forEach(function (e) {
      a = byId[e.from]; b = byId[e.to];
      if (!a || !b) return;
      dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy) + 1;
      f = (d - REST) * SPRING;
      var ux = (dx / d) * f, uy = (dy / d) * f;
      if (!a.pinned) { a.x += ux; a.y += uy; }
      if (!b.pinned) { b.x -= ux; b.y -= uy; }
    });
    nodes.forEach(function (n) {
      if (n.pinned) return;
      n.x -= n.x * GRAV; n.y -= n.y * GRAV;
      var vx = (n.x - n.px) * DAMP, vy = (n.y - n.py) * DAMP;
      n.px = n.x; n.py = n.y;
      n.x += vx; n.y += vy;
    });
  }

  function tick() {
    raf = 0;
    if (!st || !st.mounted) return;
    if (alpha > 0) {
      stepPhysics();
      alpha *= 0.985;
      if (alpha < 0.02) { alpha = 0; settle++; if (settle === 1) persist(); }
    }
    paint();
    if (alpha > 0) raf = requestAnimationFrame(tick);
  }

  function kick() { alpha = Math.max(alpha, 0.9); settle = 0; if (!raf) raf = requestAnimationFrame(tick); }

  function applyView() { if (vp) vp.setAttribute('transform', 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')'); }
  function toWorld(e) { return { x: (e.clientX - rectLeft()) / view.k - view.x / view.k, y: (e.clientY - rectTop()) / view.k - view.y / view.k }; }
  function rectLeft() { return svg ? svg.getBoundingClientRect().left : 0; }
  function rectTop() { return svg ? svg.getBoundingClientRect().top : 0; }

  function nodeSVG(n) {
    var c = n.card, label = String(c.title || t('common.untitled')).slice(0, 18);
    var w = Math.max(70, label.length * 12 + 20), h = 34;
    var fill = (c.style && c.style.fill) || c.color || '#8a6f4e';
    return '<g class="fg-node" data-node="' + U.esc(n.id) + '" transform="translate(' + (n.x - w / 2) + ',' + (n.y - h / 2) + ')">' +
      '<rect width="' + w + '" height="' + h + '" rx="10" fill="' + U.esc(fill) + '" opacity="0.92"/>' +
      '<text x="' + (w / 2) + '" y="22" text-anchor="middle" fill="#fff" font-size="12" font-weight="600">' + U.esc(label) + '</text></g>';
  }

  function edgeSVG(e) {
    var a = byId[e.from], b = byId[e.to];
    if (!a || !b) return '';
    var color = e.color || 'var(--muted, #8a8377)';
    return '<line class="fg-edge" data-type="' + U.esc(e.type) + '" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y +
      '" stroke="' + U.esc(color) + '" stroke-width="1.6" opacity="0.55"/>';
  }

  function paint() {
    if (!svg || !vp) return;
    var eHTML = edges.map(edgeSVG).join('');
    var nHTML = nodes.map(nodeSVG).join('');
    vp.innerHTML = eHTML + nHTML;
    applyView();
  }

  function bind() {
    svg.onwheel = function (e) {
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.1 : 0.9;
      var nk = Math.max(0.1, Math.min(4, view.k * factor));
      var mx = e.clientX - rectLeft(), my = e.clientY - rectTop();
      view.x = mx - (mx - view.x) * (nk / view.k);
      view.y = my - (my - view.y) * (nk / view.k);
      view.k = nk;
      applyView();
    };
    var pan = null;
    svg.onmousedown = function (e) {
      if (e.target.closest && e.target.closest('[data-node]')) return;
      pan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    };
    window.addEventListener('mousemove', function (e) {
      if (!pan || !st || !st.mounted) return;
      view.x = pan.vx + (e.clientX - pan.x);
      view.y = pan.vy + (e.clientY - pan.y);
      applyView();
    });
    window.addEventListener('mouseup', function () {
      if (pan) { pan = null; persist(); }
    });
    svg.onclick = function (e) {
      var g = e.target.closest && e.target.closest('[data-node]');
      if (g) {
        var n = byId[g.getAttribute('data-node')];
        n.pinned = !n.pinned;
        g.classList.toggle('pinned', n.pinned);
      }
    };
    var relayout = root.querySelector('[data-fg="relayout"]');
    if (relayout) relayout.onclick = function () {
      nodes.forEach(function (n) { n.pinned = false; });
      kick();
    };
    var fit = root.querySelector('[data-fg="fit"]');
    if (fit) fit.onclick = function () { view = { x: 0, y: 0, k: 1 }; applyView(); persist(); };
  }

  function mount(host) {
    root = host;
    st = { mounted: true };
    build();
    root.innerHTML =
      '<div class="map-bar fg-bar">' +
        '<span class="fg-title">' + U.esc(t('graph.title')) + '</span>' +
        '<span class="fg-hint">' + U.esc(t('graph.hint')) + '</span>' +
        '<button class="tool-btn" data-fg="relayout">' + U.esc(t('graph.relayout')) + '</button>' +
        '<button class="tool-btn" data-fg="fit">' + U.esc(t('graph.fit')) + '</button>' +
        '<span class="fg-legend">' + ['hierarchy', 'reference', 'cause', 'custom'].map(function (k) {
          return '<span class="fg-lg" data-type="' + k + '">' + U.esc(t('edge.' + k)) + '</span>';
        }).join('') + '</span>' +
      '</div>' +
      '<div class="map-stage"><svg class="map-svg" id="fg-svg"><g id="fg-vp"></g></svg></div>';
    svg = root.querySelector('#fg-svg');
    vp = root.querySelector('#fg-vp');
    bind();
    paint();
    kick();
  }

  function refresh() {
    if (!st || !st.mounted) return;
    if (currentKey() !== viewKey) { build(); kick(); }
    else paint();
  }

  function unmount() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; alpha = 0;
    if (nodes.length) persist();
    st = null; svg = null; vp = null; root = null;
  }

  CC.forceGraph = { mount: mount, unmount: unmount, refresh: refresh };
})();
