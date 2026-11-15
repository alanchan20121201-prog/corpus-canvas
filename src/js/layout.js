/* Node measurement + cached layout + spatial index (viewport friendly) */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var S = CC.store;

  var ctx = null;
  function mctx() {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    return ctx;
  }

  var FONT = '"Segoe UI", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';
  var PAD_X = 16, PAD_TOP = 11, PAD_BOTTOM = 11, MIN_W = 136, MAX_W = 280;
  var H_GAP = 62, V_GAP = 16, ROOT_GAP = 52;
  var CELL = 800, COARSE = 2400;

  var mcache = {};
  var mcount = 0;
  var cache = {};

  function styleOf(card) { return card.style || {}; }

  function wrap(text, maxWidth, maxLines, fs) {
    var c = mctx();
    c.font = '600 ' + fs + 'px ' + FONT;
    var str = String(text || '').replace(/\s+/g, ' ').trim();
    if (!str) return [''];
    var lines = [], current = '', i = 0;
    while (i < str.length) {
      var ch = str[i];
      var next = current + ch;
      if (c.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = ch === ' ' ? '' : ch;
        if (lines.length >= maxLines) break;
      } else {
        current = next;
      }
      i++;
    }
    if (lines.length < maxLines && current) lines.push(current.trim());
    if (i < str.length && lines.length) {
      var last = lines[lines.length - 1];
      while (last.length > 1 && c.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      lines[lines.length - 1] = last + '…';
    }
    return lines.length ? lines : [''];
  }

  function measure(card) {
    var st = styleOf(card);
    var fs = st.size === 's' ? 12 : st.size === 'l' ? 15.5 : 13.5;
    var fw = st.bold === false ? 500 : 600;
    var iconW = st.icon ? fs + 8 : 0;

    var display = String(card.title || '').trim();
    var untitled = false;
    if (!display) {
      display = String(card.body || '').split(/\r?\n/)[0].trim().slice(0, 42);
    }
    if (!display) {
      display = window.t('common.untitled');
      untitled = true;
    }

    var key = [card.id, display, untitled ? 1 : 0, fs, fw, iconW, card.note ? 1 : 0,
      (card.tags || []).join(','), (card.langs || []).join(',')].join('|');
    if (mcache[key]) return mcache[key];

    var c = mctx();
    c.font = fw + ' ' + fs + 'px ' + FONT;
    var textW = Math.ceil(c.measureText(display).width);
    var width = Math.max(MIN_W, Math.min(MAX_W, textW + PAD_X * 2 + 8 + iconW));
    var lines = wrap(display, width - PAD_X * 2 - 4 - iconW, 3, fs);
    var meta = (card.tags && card.tags.length) || (card.langs && card.langs.length) || card.note;
    var lineH = Math.round(fs * 1.42);
    var h = PAD_TOP + lines.length * lineH + (meta ? 22 : 4) + PAD_BOTTOM;
    var res = {
      w: Math.round(width), h: Math.round(h), lines: lines, fs: fs, fw: fw,
      lineH: lineH, iconW: iconW, untitled: untitled
    };
    mcache[key] = res;
    mcount++;
    if (mcount > 4000) { mcache = {}; mcount = 0; }
    return res;
  }

  /* ---------------- build ---------------- */

  function keyOf(map) {
    return [map.id, map.rev || 0, S.cardsRev(), S.state().cards.length].join('|');
  }

  /* persistent cache signature: survives restarts, unlike cardsRev */
  function sigOf(map) {
    return [map.id, map.rev || 0, S.state().cards.length, map.structure || 'tree',
      (map.collapsed || []).length].join('|');
  }

  function serialize(model) {
    var nodes = [];
    Object.keys(model.nodes).forEach(function (id) {
      var n = model.nodes[id];
      nodes.push([id, Math.round(n.x), Math.round(n.y), n.w, n.h, n.depth, n.orphan ? 1 : 0]);
    });
    return {
      sig: sigOf(model.map),
      bounds: model.bounds,
      vertical: model.vertical,
      total: nodes.length,
      nodes: nodes
    };
  }

  function hydrate(map, data) {
    if (!data || data.sig !== sigOf(map) || !Array.isArray(data.nodes) || !data.nodes.length) return null;
    var cards = S.mapCards(map);
    if (!cards.length) return null;
    var byId = {};
    cards.forEach(function (c) { byId[c.id] = c; });

    var nodes = {};
    data.nodes.forEach(function (row) {
      var c = byId[row[0]];
      if (!c) return;
      nodes[row[0]] = {
        id: row[0], card: c, x: row[1], y: row[2], w: row[3], h: row[4],
        lines: null, fs: 13.5, fw: 600, lineH: 19, iconW: 0,
        depth: row[5] || 0, kids: [], hiddenCount: 0, orphan: !!row[6]
      };
    });
    if (!Object.keys(nodes).length) return null;

    var edges = [];
    var childMap = {};
    var hasParent = {};
    var hierCount = {};
    map.edges.forEach(function (e) {
      if (e.type !== 'hierarchy') {
        if (nodes[e.from] && nodes[e.to] && e.from !== e.to) edges.push(e);
        return;
      }
      hierCount[e.from] = (hierCount[e.from] || 0) + 1;
      if (!nodes[e.from] || !nodes[e.to] || e.from === e.to) return;
      edges.push(e);
      if (!hasParent[e.to]) {
        hasParent[e.to] = true;
        (childMap[e.from] = childMap[e.from] || []).push(e.to);
      }
    });
    Object.keys(childMap).forEach(function (id) {
      childMap[id] = childMap[id].filter(function (k) { return nodes[k]; });
    });
    Object.keys(nodes).forEach(function (id) {
      nodes[id].kids = (childMap[id] || []).slice();
      nodes[id].hiddenCount = Math.max(0, (hierCount[id] || 0) - nodes[id].kids.length);
    });

    var roots = Object.keys(nodes).filter(function (id) { return !hasParent[id]; });
    var model = {
      mapId: map.id, map: map, nodes: nodes, edges: edges, roots: roots,
      vertical: !!data.vertical, bounds: data.bounds,
      index: null, indexDirty: true, coarse: null,
      fromCache: true, timings: { cached: true, total: 0 }
    };
    cache[map.id] = { key: keyOf(map), model: model };
    return model;
  }

  function get(map) {
    if (!map) return null;
    var key = keyOf(map);
    var hit = cache[map.id];
    if (hit && hit.key === key) return hit.model;
    var model = build(map);
    cache[map.id] = { key: key, model: model };
    return model;
  }

  function invalidate(mapId) {
    if (mapId) delete cache[mapId]; else cache = {};
  }

  function build(map) {
    var t0 = Date.now();
    var cards = S.mapCards(map);
    var nodes = {};
    cards.forEach(function (c) {
      var ms = measure(c);
      nodes[c.id] = {
        id: c.id, card: c, x: 0, y: 0, w: ms.w, h: ms.h,
        lines: ms.lines, fs: ms.fs, fw: ms.fw, lineH: ms.lineH, iconW: ms.iconW, untitled: ms.untitled,
        depth: 0, kids: [], hiddenCount: 0, orphan: false
      };
    });

    var tMeasure = Date.now() - t0;
    var edges = [];
    var childMap = {};
    var hasParent = {};
    map.edges.forEach(function (e) {
      if (!nodes[e.from] || !nodes[e.to] || e.from === e.to) return;
      edges.push(e);
      if (e.type === 'hierarchy' && !hasParent[e.to]) {
        hasParent[e.to] = true;
        (childMap[e.from] = childMap[e.from] || []).push(e.to);
      }
    });

    /* collapsed branches hide their descendants */
    var hidden = {};
    Object.keys(childMap).forEach(function (id) {
      if (map.collapsed.indexOf(id) < 0) return;
      (function mark(pid) {
        (childMap[pid] || []).forEach(function (k) {
          if (hidden[k]) return;
          hidden[k] = 1;
          mark(k);
        });
      })(id);
    });
    Object.keys(hidden).forEach(function (id) { delete nodes[id]; });
    edges = edges.filter(function (e) { return nodes[e.from] && nodes[e.to]; });
    Object.keys(childMap).forEach(function (id) {
      childMap[id] = childMap[id].filter(function (k) { return nodes[k]; });
    });
    Object.keys(nodes).forEach(function (id) {
      var all = (childMap[id] || []).length;
      nodes[id].kids = (childMap[id] || []).slice();
      nodes[id].hiddenCount = all - nodes[id].kids.length;
    });

    var roots = Object.keys(nodes).filter(function (id) { return !hasParent[id]; });
    var vertical = map.structure === 'org';

    if (map.structure === 'tree' || map.structure === 'org') {
      layoutTree(nodes, childMap, roots, vertical);
      applyOffsets(nodes, childMap, roots, map.offsets || {});
    } else {
      layoutFree(map, nodes);
    }

    var linked = {};
    edges.forEach(function (e) { linked[e.from] = 1; linked[e.to] = 1; });
    var orphans = Object.keys(nodes).filter(function (id) { return !linked[id]; });
    var autoPlace = [];
    var loneRoot = Object.keys(nodes).length === 1;
    orphans.forEach(function (id) {
      if (loneRoot) return;
      var off = (map.offsets || {})[id];
      if (off && (map.structure === 'tree' || map.structure === 'org')) {
        nodes[id].x = off.x;
        nodes[id].y = off.y;
        nodes[id].orphan = true;
      } else if (map.structure === 'free' && (map.positions || {})[id]) {
        nodes[id].orphan = true;
      } else {
        autoPlace.push(id);
      }
    });
    if (autoPlace.length && !loneRoot) placeOrphans(nodes, autoPlace);

    var tEnd = Date.now();
    return {
      timings: { measure: tMeasure, layout: tEnd - t0 - tMeasure, total: tEnd - t0 },
      mapId: map.id, map: map, nodes: nodes, edges: edges,
      roots: roots, vertical: vertical, bounds: computeBounds(nodes),
      index: null, indexDirty: true, coarse: null
    };
  }

  function layoutTree(nodes, childMap, roots, vertical) {
    var order = [], seen = {};
    var stack = roots.map(function (r) { return { id: r, d: 0 }; });
    while (stack.length) {
      var it = stack.pop();
      if (seen[it.id]) continue;
      seen[it.id] = 1;
      nodes[it.id].depth = it.d;
      order.push(it.id);
      var ks = childMap[it.id] || [];
      for (var i = ks.length - 1; i >= 0; i--) stack.push({ id: ks[i], d: it.d + 1 });
    }
    Object.keys(nodes).forEach(function (id) {
      if (seen[id]) return;
      seen[id] = 1;
      nodes[id].depth = 0;
      roots.push(id);
      var st = [{ id: id, d: 0 }];
      while (st.length) {
        var cur = st.pop();
        order.push(cur.id);
        (childMap[cur.id] || []).forEach(function (k) {
          if (!seen[k]) { seen[k] = 1; nodes[k].depth = cur.d + 1; st.push({ id: k, d: cur.d + 1 }); }
        });
      }
    });

    var span = {};
    for (var i = order.length - 1; i >= 0; i--) {
      var id = order[i], n = nodes[id], ks = childMap[id] || [];
      var own = vertical ? n.w : n.h;
      if (!ks.length) { span[id] = own; continue; }
      var sum = 0;
      ks.forEach(function (k, j) { sum += span[k] + (j ? (vertical ? H_GAP : V_GAP) : 0); });
      span[id] = Math.max(own, sum);
    }

    var placed = {};

    if (vertical) {
      var lv = {};
      order.forEach(function (id) {
        var d = nodes[id].depth;
        lv[d] = Math.max(lv[d] || 0, nodes[id].h);
      });
      var levelY = {}, y = 0;
      Object.keys(lv).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) {
        levelY[d] = y + lv[d] / 2;
        y += lv[d] + V_GAP + 14;
      });
      roots.forEach(function (r, idx) {
        var left0 = idx * (span[r] + 90);
        var st = [{ id: r, left: left0, d: 0 }];
        while (st.length) {
          var cur = st.pop();
          if (placed[cur.id]) continue;
          placed[cur.id] = 1;
          var n = nodes[cur.id], ks = childMap[cur.id] || [];
          n.x = cur.left + span[cur.id] / 2;
          n.y = levelY[cur.d] || 0;
          n.depth = cur.d;
          if (!ks.length) continue;
          var childW = 0;
          ks.forEach(function (k, j) { childW += span[k] + (j ? H_GAP : 0); });
          var cx = cur.left + (span[cur.id] - childW) / 2;
          ks.forEach(function (k) {
            st.push({ id: k, left: cx, d: cur.d + 1 });
            cx += span[k] + H_GAP;
          });
        }
      });
      return;
    }

    var cursor = 0;
    roots.forEach(function (r) {
      var top0 = cursor;
      var st = [{ id: r, left: 0, top: top0 }];
      while (st.length) {
        var cur = st.pop();
        if (placed[cur.id]) continue;
        placed[cur.id] = 1;
        var n = nodes[cur.id], ks = childMap[cur.id] || [];
        n.x = cur.left + n.w / 2;
        n.y = cur.top + span[cur.id] / 2;
        if (!ks.length) continue;
        var childH = 0;
        ks.forEach(function (k, j) { childH += span[k] + (j ? V_GAP : 0); });
        var cy = cur.top + (span[cur.id] - childH) / 2;
        var cLeft = cur.left + n.w + H_GAP;
        ks.forEach(function (k) {
          st.push({ id: k, left: cLeft, top: cy });
          cy += span[k] + V_GAP;
        });
      }
      cursor = top0 + span[r] + ROOT_GAP;
    });
  }

  function layoutFree(map, nodes) {
    var unplaced = [];
    Object.keys(nodes).forEach(function (id) {
      var p = (map.positions || {})[id];
      if (p) { nodes[id].x = p.x; nodes[id].y = p.y; }
      else unplaced.push(id);
    });
    var cols = 4, i = 0;
    unplaced.forEach(function (id) {
      var n = nodes[id];
      n.x = (i % cols) * 240;
      n.y = Math.floor(i / cols) * 140;
      map.positions[id] = { x: n.x, y: n.y };
      i++;
    });
  }

  function applyOffsets(nodes, childMap, roots, offsets) {
    var baseX = {}, baseY = {};
    Object.keys(nodes).forEach(function (id) { baseX[id] = nodes[id].x; baseY[id] = nodes[id].y; });
    var placed = {};
    roots.forEach(function (r) {
      var st = [{ id: r, dx: 0, dy: 0 }];
      while (st.length) {
        var cur = st.pop();
        if (placed[cur.id]) continue;
        placed[cur.id] = 1;
        var off = offsets[cur.id];
        var dx = cur.dx + (off ? off.x - baseX[cur.id] : 0);
        var dy = cur.dy + (off ? off.y - baseY[cur.id] : 0);
        var n = nodes[cur.id];
        if (n) { n.x += dx; n.y += dy; }
        (childMap[cur.id] || []).forEach(function (k) { st.push({ id: k, dx: dx, dy: dy }); });
      }
    });
  }

  function placeOrphans(nodes, ids) {
    var oset = {};
    ids.forEach(function (id) { oset[id] = 1; });
    var maxBottom = 0;
    Object.keys(nodes).forEach(function (id) {
      if (oset[id]) return;
      var n = nodes[id];
      maxBottom = Math.max(maxBottom, n.y + n.h / 2);
    });
    var x = 0, y = maxBottom + 96, rowH = 0;
    ids.forEach(function (id) {
      var n = nodes[id];
      if (x + n.w > 820) { x = 0; y += rowH + 18; rowH = 0; }
      n.x = x + n.w / 2;
      n.y = y + n.h / 2;
      n.orphan = true;
      x += n.w + 26;
      rowH = Math.max(rowH, n.h);
    });
  }

  function computeBounds(nodes) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      minX = Math.min(minX, n.x - n.w / 2);
      maxX = Math.max(maxX, n.x + n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2);
      maxY = Math.max(maxY, n.y + n.h / 2);
    });
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY };
  }

  /* ---------------- spatial index ---------------- */

  function push(map, key, val) {
    var arr = map.get(key);
    if (arr) arr.push(val); else map.set(key, [val]);
  }

  function buildIndex(model) {
    var nodes = model.nodes, cell = CELL;
    var nb = new Map(), eb = new Map(), coarse = new Map();
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      var x1 = n.x - n.w / 2, x2 = n.x + n.w / 2, y1 = n.y - n.h / 2, y2 = n.y + n.h / 2;
      var cx1 = Math.floor(x1 / cell), cx2 = Math.floor(x2 / cell);
      var cy1 = Math.floor(y1 / cell), cy2 = Math.floor(y2 / cell);
      for (var cx = cx1; cx <= cx2; cx++) {
        for (var cy = cy1; cy <= cy2; cy++) push(nb, cx + ',' + cy, id);
      }
      var k = Math.floor(n.x / COARSE) + ',' + Math.floor(n.y / COARSE);
      var c = coarse.get(k);
      if (!c) coarse.set(k, { x1: x1, y1: y1, x2: x2, y2: y2, count: 1 });
      else {
        c.x1 = Math.min(c.x1, x1); c.y1 = Math.min(c.y1, y1);
        c.x2 = Math.max(c.x2, x2); c.y2 = Math.max(c.y2, y2); c.count++;
      }
    });

    model.edges.forEach(function (e) {
      var a = nodes[e.from], b = nodes[e.to];
      if (!a || !b) return;
      var x1 = Math.min(a.x, b.x) - 60, x2 = Math.max(a.x, b.x) + 60;
      var y1 = Math.min(a.y, b.y) - 60, y2 = Math.max(a.y, b.y) + 60;
      var cx1 = Math.floor(x1 / cell), cx2 = Math.floor(x2 / cell);
      var cy1 = Math.floor(y1 / cell), cy2 = Math.floor(y2 / cell);
      /* very long edges are indexed by their midpoint to keep the index small */
      if ((cx2 - cx1 + 1) * (cy2 - cy1 + 1) > 24) {
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        push(eb, Math.floor(mx / cell) + ',' + Math.floor(my / cell), e);
        return;
      }
      for (var cx = cx1; cx <= cx2; cx++) {
        for (var cy = cy1; cy <= cy2; cy++) push(eb, cx + ',' + cy, e);
      }
    });

    model.index = { nodes: nb, edges: eb };
    model.coarse = coarse;
    model.indexDirty = false;
  }

  function ensureIndex(model) {
    if (!model) return;
    if (model.indexDirty || !model.index) buildIndex(model);
  }

  function overlap(n, r) {
    return !(n.x + n.w / 2 < r.x1 || n.x - n.w / 2 > r.x2 || n.y + n.h / 2 < r.y1 || n.y - n.h / 2 > r.y2);
  }

  function query(model, rect, margin, cap) {
    ensureIndex(model);
    margin = margin == null ? 260 : margin;
    cap = cap || 1400;
    var r = { x1: rect.x1 - margin, y1: rect.y1 - margin, x2: rect.x2 + margin, y2: rect.y2 + margin };
    var cell = CELL;
    var cx1 = Math.floor(r.x1 / cell), cx2 = Math.floor(r.x2 / cell);
    var cy1 = Math.floor(r.y1 / cell), cy2 = Math.floor(r.y2 / cell);
    var ids = [], seen = {};
    for (var cx = cx1; cx <= cx2; cx++) {
      for (var cy = cy1; cy <= cy2; cy++) {
        var arr = model.index.nodes.get(cx + ',' + cy);
        if (!arr) continue;
        for (var i = 0; i < arr.length; i++) {
          var id = arr[i];
          if (seen[id]) continue;
          var n = model.nodes[id];
          if (!n || !overlap(n, r)) continue;
          seen[id] = 1;
          ids.push(id);
          if (ids.length >= cap) return { ids: ids, truncated: true };
        }
      }
    }
    return { ids: ids, truncated: false };
  }

  function queryEdges(model, rect, visible, margin) {
    ensureIndex(model);
    margin = margin == null ? 260 : margin;
    var r = { x1: rect.x1 - margin, y1: rect.y1 - margin, x2: rect.x2 + margin, y2: rect.y2 + margin };
    var cell = CELL;
    var cx1 = Math.floor(r.x1 / cell), cx2 = Math.floor(r.x2 / cell);
    var cy1 = Math.floor(r.y1 / cell), cy2 = Math.floor(r.y2 / cell);
    var out = [], seen = {};
    for (var cx = cx1; cx <= cx2; cx++) {
      for (var cy = cy1; cy <= cy2; cy++) {
        var arr = model.index.edges.get(cx + ',' + cy);
        if (!arr) continue;
        for (var i = 0; i < arr.length; i++) {
          var e = arr[i];
          if (seen[e.id]) continue;
          var inA = !!visible[e.from], inB = !!visible[e.to];
          var ok = e.type === 'hierarchy' ? (inA || inB) : (inA && inB);
          if (!ok) continue;
          seen[e.id] = 1;
          out.push(e);
        }
      }
    }
    return out;
  }

  function clusters(model, rect) {
    ensureIndex(model);
    var out = [];
    model.coarse.forEach(function (c) {
      if (c.x2 < rect.x1 || c.x1 > rect.x2 || c.y2 < rect.y1 || c.y1 > rect.y2) return;
      out.push({ x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, count: c.count });
    });
    return out;
  }

  function totalNodes(model) { return model ? Object.keys(model.nodes).length : 0; }

  /* Coarse cells sampled down to a maximum, so a million-node map still
     yields a cheap overview (the minimap) without building a huge array. */
  function coarseSample(model, limit) {
    ensureIndex(model);
    var out = [];
    var size = model.coarse.size;
    var stride = Math.max(1, Math.ceil(size / Math.max(1, limit || 700)));
    var i = 0;
    model.coarse.forEach(function (c) {
      if (i % stride === 0) out.push(c);
      i++;
    });
    return out;
  }

  function shiftSubtree(model, id, dx, dy) {
    var n = model.nodes[id];
    if (!n) return;
    var ids = [id], st = [id];
    while (st.length) {
      var cur = st.pop();
      ((model.nodes[cur] && model.nodes[cur].kids) || []).forEach(function (k) {
        ids.push(k); st.push(k);
      });
    }
    ids.forEach(function (k) {
      var node = model.nodes[k];
      if (!node) return;
      node.x += dx; node.y += dy;
    });
    model.indexDirty = true;
    model.bounds = computeBounds(model.nodes);
  }

  CC.layout = {
    get: get, compute: get, invalidate: invalidate,
    query: query, queryEdges: queryEdges, clusters: clusters, coarseSample: coarseSample,
    totalNodes: totalNodes, shiftSubtree: shiftSubtree,
    serialize: serialize, hydrate: hydrate, sigOf: sigOf,
    recomputeBounds: function (model) { return computeBounds(model.nodes); },
    measure: measure, wrap: wrap, CELL: CELL
  };
})();
