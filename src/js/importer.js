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
    var skipped = 0, missing = 0;
    function conv(topic) {
      if (!topic) return null;
      var title = String(topic.title || '').trim();
      if (!title && !(topic.children && (topic.children.attached || topic.children.detached))) { skipped++; return null; }
      var note = '';
      if (topic.notes) {
        if (topic.notes.plain && topic.notes.plain.content) note = topic.notes.plain.content;
        else if (topic.notes.realHTML && topic.notes.realHTML.content) note = String(topic.notes.realHTML.content).replace(/<[^>]+>/g, ' ').trim();
      }
      if (!note) missing++;
      var node = { title: title || '', note: note, children: [] };
      var kids = (topic.children && (topic.children.attached || [])) || [];
      kids.forEach(function (k) {
        var c = conv(k);
        if (c) node.children.push(c);
      });
      return node;
    }
    var trees = [];
    sheets.forEach(function (sheet) {
      var rootTopic = sheet.rootTopic || (sheet.topic && sheet.topic.rootTopic);
      if (!rootTopic) return;
      var n = conv(rootTopic);
      if (n) { n.title = n.title || sheet.title || ''; trees.push(n); }
    });
    if (!trees.length) return null;
    return { tree: trees.length === 1 ? trees[0] : { title: '', children: trees, note: '' }, skipped: skipped, missing: missing };
  }

  function parseXmindXml(text) {
    var doc = new DOMParser().parseFromString(text, 'text/xml');
    var rootTopic = doc.querySelector('sheet > topic') || doc.querySelector('topic');
    if (!rootTopic) return null;
    var skipped = 0, missing = 0;
    function conv(el) {
      var titleEl = el.querySelector(':scope > title');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var noteEl = el.querySelector(':scope > notes > plain');
      var note = noteEl ? noteEl.textContent.trim() : '';
      if (!title && !el.querySelector(':scope > children')) { skipped++; return null; }
      if (!note) missing++;
      var node = { title: title, note: note, children: [] };
      el.querySelectorAll(':scope > children > topics > topic').forEach(function (k) {
        var c = conv(k);
        if (c) node.children.push(c);
      });
      return node;
    }
    var tree = conv(rootTopic);
    if (!tree) return null;
    return { tree: tree, skipped: skipped, missing: missing };
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
    var created = 0, skipped = 0;
    var map = null;
    var positions = {};

    S.commit('import', t('import.title') + ' · ' + fileName, function () {
      if (opts.mode !== 'corpus') {
        map = S.newMap(opts.mapName || fileName, { silent: true });
      }
      var idOf = new Map();
      var depth = new Map();
      flat.forEach(function (item, idx) {
        var title = item.node.title || t('common.untitled');
        if (!item.node.title) skipped++;
        var c = S.newCard({
          title: title,
          body: item.node.body || '',
          note: item.node.note || '',
          sources: [{ kind: 'import', ref: fileName, at: Date.now() }]
        }, true);
        idOf.set(item.node, c.id);
        depth.set(item.node, item.parent ? (depth.get(item.parent) || 0) + 1 : 0);
        created++;
        if (map) {
          var d = depth.get(item.node);
          var sibIndex = item.parent ? item.parent.children.indexOf(item.node) : 0;
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
      if (map) {
        map.updatedAt = Date.now();
        S.settings().lastMapId = map.id;
      }
    }, { snapshot: true });

    return {
      created: created,
      skipped: skipped,
      missing: opts.missing || 0,
      mapId: map ? map.id : null,
      nodes: flat.length
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
      var parsed = null;
      if (r.kind === 'xmind') parsed = r.json ? parseXmindJson(r.json) : (r.xml ? parseXmindXml(r.xml) : null);
      else if (r.kind === 'opml') parsed = parseOPML(r.text);
      else parsed = parseMarkdown(r.text);

      if (!parsed) { U.toast(t('import.error', { msg: 'parse' }), 'bad'); return; }
      pending = { tree: parsed.tree, skipped: parsed.skipped, missing: parsed.missing || 0, name: r.name || 'import' };
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
  function handleBackupText(text, ext) {
    var trimmed = text ? String(text).trim() : '';
    if (trimmed.charAt(0) !== '{') return false;
    var payload = null;
    try { payload = JSON.parse(trimmed); } catch (e) { return false; }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    var data = payload.data || payload;
    var looksBackup = payload.format === 'corpus-canvas' ||
      (Array.isArray(data.cards) && (ext === 'wef' || Array.isArray(data.maps)));
    if (!looksBackup) return false;
    if (window.CC && CC.settings && CC.settings.importBackupData) CC.settings.importBackupData(payload);
    else U.toast(t('import.error', { msg: 'backup' }), 'bad');
    return true;
  }

  function finish(parsed, name) {
    var res = importTree(parsed.tree, { mode: 'map', name: name, mapName: name, missing: parsed.missing });
    U.toast(t('import.done') + ' · ' + t('import.ok') + ' ' + res.created, 'ok');
    CC.app.nav('map');
  }

  CC.importer = { open: open, importFileObject: importFileObject, importTree: importTree, parseMarkdown: parseMarkdown };
})();
