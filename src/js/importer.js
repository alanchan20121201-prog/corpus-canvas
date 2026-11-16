/* Import: XMind / OPML / Markdown outlines -> one corpus */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  /* ---------------- parsers ---------------- */

  function parseMarkdown(text) {
    var lines = String(text || '').split(/\r?\n/);
    var root = { title: '', children: [], note: '' };
    var stack = [{ level: -1, node: root }];
    var skipped = 0, missing = 0;
    var headingCount = 0;

    function push(level, node) {
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      var parent = stack.length ? stack[stack.length - 1].node : root;
      parent.children.push(node);
      stack.push({ level: level, node: node });
    }

    lines.forEach(function (raw) {
      var line = raw.replace(/\t/g, '    ');
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        headingCount++;
        var title = h[2].replace(/\*\*/g, '').trim();
        if (!title) { skipped++; return; }
        push(h[1].length - 1, { title: title, children: [], note: '' });
        return;
      }
      var li = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
      if (li) {
        var indent = Math.floor(li[1].length / 2);
        var tt = li[2].replace(/\*\*/g, '').trim();
        if (!tt) { skipped++; return; }
        if (!tt) missing++;
        push(100 + indent, { title: tt, children: [], note: '' });
        return;
      }
      var plain = line.trim();
      if (plain && stack.length > 1) {
        var cur = stack[stack.length - 1].node;
        cur.note = cur.note ? cur.note + '\n' + plain : plain;
      }
    });

    var kids = root.children;
    if (!headingCount && kids.length === 1 && kids[0].children.length > 2) {
      /* a single bullet at top: promote its children */
      return { tree: kids[0], skipped: skipped, missing: missing };
    }
    if (kids.length === 1) return { tree: kids[0], skipped: skipped, missing: missing };
    return { tree: { title: '', children: kids, note: '' }, skipped: skipped, missing: missing };
  }

  function parseOPML(text) {
    var doc = new DOMParser().parseFromString(text, 'text/xml');
    var skipped = 0, missing = 0;
    var bodyEl = doc.querySelector('body');
    if (!bodyEl) return null;
    function conv(el) {
      var title = el.getAttribute('text') || el.getAttribute('title') || '';
      var note = el.getAttribute('_note') || '';
      if (!title.trim()) { skipped++; return null; }
      if (!note) missing++;
      var node = { title: title.trim(), note: note, children: [] };
      Array.prototype.forEach.call(el.children, function (ch) {
        if (ch.tagName.toLowerCase() !== 'outline') return;
        var c = conv(ch);
        if (c) node.children.push(c);
      });
      return node;
    }
    var roots = [];
    Array.prototype.forEach.call(bodyEl.children, function (el) {
      if (el.tagName.toLowerCase() !== 'outline') return;
      var n = conv(el);
      if (n) roots.push(n);
    });
    if (!roots.length) return null;
    var tree = roots.length === 1 ? roots[0] : { title: '', children: roots, note: '' };
    return { tree: tree, skipped: skipped, missing: missing };
  }

  function parseXmindJson(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return null; }
    var sheets = Array.isArray(data) ? data : [data];
    var skipped = 0, missing = 0, relations = [], attachments = [];
    function styleOf(topic) {
      var out = {};
      var props = (topic.style && topic.style.properties) || {};
      if (props['svg:fill'] && !/^none$/i.test(props['svg:fill'])) out.fill = props['svg:fill'];
      if (props['fo:color']) out.color = props['fo:color'];
      if (props['shape-class']) {
        var sc = String(props['shape-class']);
        if (/rounded/i.test(sc)) out.shape = 'rounded';
        else if (/rect/i.test(sc)) out.shape = 'rect';
        else if (/pill|ellipse|circle/i.test(sc)) out.shape = 'pill';
      }
      return out;
    }
    function attachOf(topic) {
      var out = [];
      (topic.attachments || []).forEach(function (a) {
        if (a && a.path) out.push({ path: String(a.path), name: String(a.name || a.path.split('/').pop()) });
      });
      if (typeof topic.href === 'string' && /^file:/i.test(topic.href)) {
        out.push({ path: decodeURIComponent(String(topic.href).replace(/^file:\/*/, '')), name: '' });
      }
      return out;
    }
    function conv(topic, isSummary) {
      if (!topic) return null;
      var title = String(topic.title || '').trim();
      if (!title && !(topic.children && (topic.children.attached || topic.children.detached || topic.children.summary))) { skipped++; return null; }
      var note = '';
      if (topic.notes) {
        if (topic.notes.plain && topic.notes.plain.content) note = topic.notes.plain.content;
        else if (topic.notes.realHTML && topic.notes.realHTML.content) note = String(topic.notes.realHTML.content).replace(/<[^>]+>/g, ' ').trim();
      }
      if (!note) missing++;
      var node = {
        title: title || '', note: note, children: [],
        labels: (topic.labels || []).map(function (l) { return String(l); }),
        markers: (topic.markers || []).map(function (m) { return String(m.markerId || m.id || m); })
      };
      var st = styleOf(topic);
      if (st.fill) node.fill = st.fill;
      if (st.color) node.color = st.color;
      if (st.shape) node.shape = st.shape;
      if (typeof topic.href === 'string' && !/^file:/i.test(topic.href)) node.link = topic.href;
      var at = attachOf(topic);
      if (at.length) { node.attachments = at; attachments = attachments.concat(at.map(function (a) { return a.path; })); }
      if (isSummary) node.summaryOf = true;
      var kids = (topic.children && topic.children.attached) || [];
      kids.forEach(function (k) {
        var c = conv(k, false);
        if (c) node.children.push(c);
      });
      /* detached topics still become cards, attached at root level */
      var detached = (topic.children && topic.children.detached) || [];
      detached.forEach(function (k) {
        var c = conv(k, false);
        if (c) { c.detached = true; node.children.push(c); }
      });
      /* summary topics carry the summaryOf flag */
      var summaries = (topic.children && topic.children.summary) || [];
      summaries.forEach(function (k) {
        var c = conv(k, true);
        if (c) node.children.push(c);
      });
      return node;
    }
    var trees = [];
    sheets.forEach(function (sheet) {
      var rootTopic = sheet.rootTopic || (sheet.topic && sheet.topic.rootTopic);
      if (!rootTopic) return;
      /* relationships live at sheet level, keyed by topic id */
      var idMap = {};
      (function indexIds(t, map) {
        if (!t || !t.id) return;
        map[t.id] = t.title || '';
        var ch = (t.children && (t.children.attached || t.children.detached || t.children.summary)) || [];
        ch.forEach(function (c) { indexIds(c, map); });
      })(rootTopic, idMap);
      (sheet.relationships || []).forEach(function (rel) {
        var s = idMap[rel.sourceId] || rel.sourceTitle;
        var e = idMap[rel.targetId] || rel.targetTitle;
        if (s && e) relations.push({ fromTitle: s, toTitle: e, label: String(rel.title || '') });
      });
      var n = conv(rootTopic, false);
      if (n) { n.title = n.title || sheet.title || ''; trees.push(n); }
    });
    var root = trees.length === 1 ? trees[0] : { title: '', children: trees, note: '' };
    root.relations = relations;
    root.xmindAttachments = attachments;
    return { tree: root, skipped: skipped, missing: missing, relations: relations, attachments: attachments };
  }

  function parseXmindXml(text) {
    var doc = new DOMParser().parseFromString(text, 'text/xml');
    if (doc.querySelector('parsererror')) return null;
    var rootTopic = doc.querySelector('sheet > topic') || doc.querySelector('topic');
    if (!rootTopic) return null;
    var skipped = 0, missing = 0, relations = [], attachments = [];
    function fillOf(el) {
      var props = el.querySelector(':scope > style > properties');
      if (!props) return {};
      var out = {};
      var fill = props.getAttribute('svg:fill');
      var color = props.getAttribute('fo:color');
      var shape = props.getAttribute('shape-class');
      if (fill && !/^none$/i.test(fill)) out.fill = fill;
      if (color) out.color = color;
      if (shape) {
        if (/rounded/i.test(shape)) out.shape = 'rounded';
        else if (/rect/i.test(shape)) out.shape = 'rect';
        else if (/pill|ellipse|circle/i.test(shape)) out.shape = 'pill';
      }
      return out;
    }
    function conv(el, isSummary) {
      var titleEl = el.querySelector(':scope > title');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var noteEl = el.querySelector(':scope > notes > plain');
      var note = noteEl ? noteEl.textContent.trim() : '';
      if (!title && !el.querySelector(':scope > children')) { skipped++; return null; }
      if (!note) missing++;
      var node = { title: title, note: note, children: [], labels: [], markers: [] };
      el.querySelectorAll(':scope > label').forEach(function (x) { node.labels.push(x.textContent.trim()); });
      el.querySelectorAll(':scope > marker').forEach(function (x) {
        var m = x.getAttribute('markerId') || x.textContent.trim();
        if (m) node.markers.push(m);
      });
      var st = fillOf(el);
      if (st.fill) node.fill = st.fill;
      if (st.color) node.color = st.color;
      if (st.shape) node.shape = st.shape;
      var href = el.getAttribute('href') || el.getAttribute('xlink:href');
      if (href && !/^file:/i.test(href)) node.link = href;
      var attEl = el.querySelector(':scope > attachment');
      if (attEl) {
        var p = attEl.getAttribute('path') || attEl.textContent.trim();
        if (p) { node.attachments = [{ path: p, name: p.split('/').pop() }]; attachments.push(p); }
      }
      if (isSummary) node.summaryOf = true;
      el.querySelectorAll(':scope > children > topics > topic').forEach(function (k) {
        var c = conv(k, false);
        if (c) node.children.push(c);
      });
      return node;
    }
    var tree = conv(rootTopic, false);
    if (!tree) return null;
    doc.querySelectorAll('sheet > relationships > relationship').forEach(function (r) {
      var s = r.getAttribute('source-id') || r.getAttribute('sourceTitle');
      var e = r.getAttribute('target-id') || r.getAttribute('targetTitle');
      if (s && e) relations.push({ fromTitle: s, toTitle: e, label: (r.querySelector(':scope > title') || {}).textContent || '' });
    });
    tree.relations = relations;
    tree.xmindAttachments = attachments;
    return { tree: tree, skipped: skipped, missing: missing, relations: relations, attachments: attachments };
  }

  /* ---------------- conversion ---------------- */

  function countNodes(tree) {
    if (!tree) return 0;
    var n = 1;
    (tree.children || []).forEach(function (c) { n += countNodes(c); });
    return n;
  }

  function flatten(tree) {
    var out = [];
    (function walk(node, parent) {
      if (!node) return;
      if (!node.title && !(node.children || []).length) return;
      out.push({ node: node, parent: parent });
      (node.children || []).forEach(function (c) { walk(c, node); });
    })(tree, null);
    return out;
  }

  function importTree(tree, opts) {
    var fileName = opts.name || 'import';
    if (tree && !tree.title) {
      if ((tree.children || []).length === 1) tree = tree.children[0];
      else if ((tree.children || []).length > 1) tree = { title: (opts.mapName || fileName), children: tree.children, note: tree.note || '' };
    }
    var flat = flatten(tree);
    var created = 0, skipped = 0, linked = 0, attached = 0;
    var map = null;
    var positions = {};

    S.commit('import', t('import.title') + ' · ' + fileName, function () {
      if (opts.mode !== 'corpus') {
        map = S.newMap(opts.mapName || fileName, { silent: true });
      }
      var idOf = new Map();
      var titleOf = {};
      var depth = new Map();
      flat.forEach(function (item, idx) {
        var node = item.node;
        var title = node.title || t('common.untitled');
        if (!node.title) skipped++;
        var tags = (node.labels || []).slice();
        (node.markers || []).forEach(function (m) { tags.push('marker:' + m); });
        var style = {};
        if (node.fill) style.fill = node.fill;
        if (node.shape) style.shape = node.shape;
        var c = S.newCard({
          title: title,
          body: node.body || '',
          note: node.note || '',
          tags: tags,
          color: node.color || '',
          style: style,
          link: node.link || '',
          summary: node.summaryOf ? (node.note || '') : (node.summary || ''),
          sources: [{ kind: 'import', ref: fileName, at: Date.now() }]
        }, true);
        /* attachments: bytes are written by the main-process IPC; keep metadata */
        (node.attachments || []).forEach(function (a) {
          c.attachments.push({ id: a.aid || a.path, name: a.name || a.path, ext: a.ext || '', mime: a.mime || '', size: a.size || 0 });
          attached++;
        });
        idOf.set(node, c.id);
        titleOf[title] = c.id;
        depth.set(node, item.parent ? (depth.get(item.parent) || 0) + 1 : 0);
        created++;
        if (map) {
          var d = depth.get(node);
          var sibIndex = item.parent ? item.parent.children.indexOf(node) : 0;
          var parentPos = item.parent ? positions[idOf.get(item.parent)] : null;
          positions[c.id] = { x: d * 260, y: (parentPos ? parentPos.y : 0) + sibIndex * 90 };
          map.positions[c.id] = positions[c.id];
        }
      });
      flat.forEach(function (item) {
        if (!item.parent || !map) return;
        var from = idOf.get(item.parent), to = idOf.get(item.node);
        if (!from || !to) return;
        map.edges.push({ id: U.uid('e'), from: from, to: to, type: 'hierarchy', color: '', label: '', uncertain: false });
      });
      /* XMind relationships -> relation edges */
      if (map) {
        (tree.relations || []).forEach(function (rel) {
          var from = titleOf[rel.fromTitle], to = titleOf[rel.toTitle];
          if (!from || !to || from === to) return;
          map.edges.push({ id: U.uid('e'), from: from, to: to, type: 'custom', color: '', label: rel.label || '', uncertain: false });
          linked++;
        });
        map.updatedAt = Date.now();
        S.settings().lastMapId = map.id;
      }
    }, { snapshot: true });

    return {
      created: created,
      skipped: skipped,
      missing: opts.missing || 0,
      mapId: map ? map.id : null,
      nodes: flat.length,
      linked: linked,
      attached: attached
    };
  }

  /* ---------------- UI ---------------- */

  function open(preFile) {
    var pending = null;
    var mode = 'map';
    var missing = 0;

    var wrap = document.createElement('div');
    wrap.className = 'import-panel';
    wrap.innerHTML =
      '<p class="set-hint">' + U.esc(t('import.hint')) + '</p>' +
      '<button class="dropzone" id="dz">' +
        '<span class="dz-ico">' + U.icon('upload', 26) + '</span>' +
        '<span class="dz-title">' + U.esc(t('import.pick')) + '</span>' +
        '<span class="dz-sub">XMind · OPML · Markdown · TXT</span>' +
        '<span class="dz-hint">' + U.esc(t('import.dropHint')) + '</span>' +
      '</button>' +
      '<div class="mode-row"><span class="mr-label">' + U.esc(t('import.mode')) + '</span>' +
        '<label class="radio"><input type="radio" name="imode" value="map" checked><span>' + U.esc(t('import.modeMap')) + '</span></label>' +
        '<label class="radio"><input type="radio" name="imode" value="corpus"><span>' + U.esc(t('import.modeCorpus')) + '</span></label>' +
      '</div>' +
      '<div class="import-preview" id="prev"></div>';

    var modal = U.openModal({
      title: t('import.title'),
      medium: true,
      body: wrap,
      actions: [
        { id: 'cancel', label: t('common.cancel'), ghost: true },
        {
          id: 'import', label: t('common.import'), primary: true,
          onClick: function () {
            if (!pending) { U.toast(t('import.noFile')); return false; }
            var res = importTree(pending.tree, {
              mode: mode,
              name: pending.name,
              mapName: pending.name,
              missing: pending.missing
            });
            setTimeout(function () { showReport(res, pending); }, 120);
            pending = null;
            return true;
          }
        }
      ]
    });

    wrap.querySelector('#dz').onclick = function () { pickFile(); };
    wrap.querySelectorAll('input[name="imode"]').forEach(function (r) {
      r.onchange = function () { mode = r.value; };
    });

    function pickFile() {
      window.api.importDialog().then(function (r) {
        if (!r || !r.ok) {
          if (r && r.error) U.toast(t('import.error', { msg: r.error }), 'bad');
          return;
        }
        handleResult(r);
      });
    }

    function handleResult(r) {
      /* A .wef / corpus JSON chosen in the file dialog must go to the backup
         importer, not the outline parser (the drop path already does this). */
      var payload = r.text ? detectBackup(r.text) : null;
      if (payload) {
        U.closeTopModal();
        if (window.CC && CC.settings && CC.settings.importBackupData) CC.settings.importBackupData(payload);
        else U.toast(t('import.error', { msg: 'backup' }), 'bad');
        return;
      }
      var parsed = null;
      if (r.kind === 'xmind') parsed = r.json ? parseXmindJson(r.json) : (r.xml ? parseXmindXml(r.xml) : null);
      else if (r.kind === 'opml') parsed = parseOPML(r.text);
      else parsed = parseMarkdown(r.text);

      if (!parsed) { U.toast(t('import.error', { msg: 'parse' }), 'bad'); return; }
      pending = {
        tree: parsed.tree, skipped: parsed.skipped, missing: parsed.missing || 0,
        name: r.name || 'import', relations: parsed.relations || [], attachments: parsed.attachments || []
      };
      if (window.api && window.api.extractXmindAttachments && (parsed.attachments || []).length) {
        window.api.extractXmindAttachments(parsed.attachments).then(function (res) {
          if (!res || !res.ok || !res.items) return;
          (function walk(n) {
            if (!n) return;
            (n.attachments || []).forEach(function (a) {
              var hit = res.items.find(function (x) { return x.path === a.path; });
              if (hit) { a.aid = hit.id; a.ext = hit.ext; a.mime = hit.mime; a.size = hit.size; }
            });
            (n.children || []).forEach(walk);
          })(parsed.tree);
        });
      }
      var n = countNodes(parsed.tree);
      var prev = wrap.querySelector('#prev');
      prev.innerHTML =
        '<div class="pv-head"><span class="pv-file">' + U.icon('file' , 14) + U.esc(pending.name) + '</span>' +
        '<span class="pv-count">' + U.esc(t('import.nodes', { n: n })) + '</span></div>' +
        '<div class="pv-tree">' + previewTree(parsed.tree, 0).join('') + '</div>' +
        '<p class="pv-note">' + U.esc(t('import.already')) + '</p>';
    }

    function previewTree(node, depth) {
      if (!node || depth > 3) return [];
      var rows = ['<div class="pv-row" style="--d:' + depth + '"><span class="pv-dot"></span>' + U.esc(node.title || t('common.untitled')) + '</div>'];
      (node.children || []).slice(0, depth === 0 ? 10 : 4).forEach(function (c) {
        rows = rows.concat(previewTree(c, depth + 1));
      });
      return rows;
    }

    function showReport(res, info) {
      var body = document.createElement('div');
      body.className = 'report';
      body.innerHTML =
        '<div class="report-grid two">' +
          '<div class="rep-cell ok"><span class="rep-num">' + res.created + '</span><span class="rep-label">' + U.esc(t('import.ok')) + '</span></div>' +
          '<div class="rep-cell skip"><span class="rep-num">' + (res.skipped + (info.skipped || 0)) + '</span><span class="rep-label">' + U.esc(t('import.skipped')) + '</span></div>' +
        '</div>' +
        '<p class="set-hint">' + U.esc(t('import.already')) + '</p>' +
        '<p class="set-hint small">' + U.esc(t('cards.sources')) + ' · ' + U.esc(info.name || '') + '</p>';

      U.openModal({
        title: t('import.report'),
        body: body,
        actions: [
          { id: 'close', label: t('common.close'), ghost: true },
          res.mapId ? { id: 'open', label: t('map.selectMap'), primary: true } : null
        ].filter(Boolean)
      }).then(function (r) {
        if (r === 'open' && res.mapId) CC.app.goMap(res.mapId);
        else CC.app.nav(res.mapId ? 'map' : 'cards');
      });
    }
  }

  /* file object (drag & drop) */
  function importFileObject(file) {
    var name = file.name.replace(/\.[^.]+$/, '');
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'xmind') {
      file.arrayBuffer().then(function (buf) {
        window.api.parseXmind(new Uint8Array(buf)).then(function (r) {
          if (!r.ok) { U.toast(t('import.error', { msg: r.error }), 'bad'); return; }
          var parsed = r.json ? parseXmindJson(r.json) : (r.xml ? parseXmindXml(r.xml) : null);
          if (!parsed) { U.toast(t('import.error', { msg: 'parse' }), 'bad'); return; }
          finish(parsed, name);
        });
      });
      return;
    }
    file.text().then(function (text) {
      if (handleBackupText(text, ext)) return;
      var parsed = ext === 'opml' ? parseOPML(text) : parseMarkdown(text);
      if (!parsed) { U.toast(t('import.error', { msg: 'parse' }), 'bad'); return; }
      finish(parsed, name);
    });
  }

  /* A .wef backup (or any corpus-canvas JSON) must never be read as an
     outline: that would silently pollute the corpus with raw JSON text. */
  function detectBackup(text, ext) {
    var trimmed = text ? String(text).trim() : '';
    if (trimmed.charAt(0) !== '{') return null;
    var payload = null;
    try { payload = JSON.parse(trimmed); } catch (e) { return null; }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    var data = payload.data || payload;
    var looksBackup = payload.format === 'corpus-canvas' ||
      (Array.isArray(data.cards) && (ext === 'wef' || Array.isArray(data.maps)));
    return looksBackup ? payload : null;
  }

  function handleBackupText(text, ext) {
    var payload = detectBackup(text, ext);
    if (!payload) return false;
    if (window.CC && CC.settings && CC.settings.importBackupData) CC.settings.importBackupData(payload);
    else U.toast(t('import.error', { msg: 'backup' }), 'bad');
    return true;
  }

  function finish(parsed, name) {
    var report = function (res) {
      var extra = (res.linked || res.attached) ?
        ' · ' + t('import.xmindExtras', { l: (res.created ? '' : '0'), r: res.linked || 0, a: res.attached || 0 }) : '';
      U.toast(t('import.done') + ' · ' + t('import.ok') + ' ' + res.created + extra, 'ok');
      CC.app.nav('map');
    };
    var doImport = function () {
      return importTree(parsed.tree, { mode: 'map', name: name, mapName: name, missing: parsed.missing });
    };
    if ((parsed.attachments || []).length && window.api && window.api.extractXmindAttachments) {
      window.api.extractXmindAttachments(parsed.attachments).then(function (r) {
        if (r && r.ok && r.items) {
          (function walk(n) {
            if (!n) return;
            (n.attachments || []).forEach(function (a) {
              var hit = r.items.find(function (x) { return x.path === a.path; });
              if (hit) { a.aid = hit.id; a.ext = hit.ext; a.mime = hit.mime; a.size = hit.size; }
            });
            (n.children || []).forEach(walk);
          })(parsed.tree);
        }
        report(doImport());
      });
      return;
    }
    report(doImport());
  }

  CC.importer = { open: open, importFileObject: importFileObject, importTree: importTree, parseMarkdown: parseMarkdown };
})();
