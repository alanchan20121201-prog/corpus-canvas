/* Right-hand card inspector: the corpus record, editing in place */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  var host = null;
  var currentId = null;
  var noteOpen = false;

  function root() { return document.getElementById('inspector'); }

  function open(cardId, opts) {
    opts = opts || {};
    host = root();
    if (!host) return;
    var c = S.card(cardId);
    if (!c) return close();
    currentId = cardId;
    noteOpen = !!c.note;
    host.hidden = false;
    host.classList.add('open');
    document.body.classList.add('with-inspector');
    render(c, opts);
    if (opts.focusTitle) {
      setTimeout(function () {
        var el = host.querySelector('#insp-title');
        if (el) { el.focus(); el.select(); }
      }, 60);
    }
  }

  function close() {
    currentId = null;
    if (!host) host = root();
    if (!host) return;
    host.classList.remove('open');
    document.body.classList.remove('with-inspector');
    setTimeout(function () { if (!currentId) host.hidden = true; }, 200);
  }

  function isOpen() { return !!currentId; }
  function currentCardId() { return currentId; }

  function refresh() {
    if (!currentId) return;
    var c = S.card(currentId);
    if (!c) return close();
    render(c, { keepFocus: true });
  }

  function render(c, opts) {
    var maps = S.mapsOfCard(c.id);
    var cur = S.currentMap();
    var edges = cur ? S.edgesFor(cur, c.id) : [];
    var dups = S.similarTo(c);
    var typeName = function (k) { return t('edge.' + (k || 'custom')); };

    host.innerHTML =
      '<div class="insp-head">' +
        '<div class="insp-head-left">' +
          '<span class="insp-eyebrow">' + U.icon('cards', 14) + '<span>' + U.esc(t('cards.props')) + '</span></span>' +
        '</div>' +
        '<div class="insp-head-actions">' +
          '<button class="icon-btn sm" data-act="delete" title="' + U.esc(t('cards.delete')) + '">' + U.icon('trash', 16) + '</button>' +
          '<button class="icon-btn sm" data-act="close" title="' + U.esc(t('common.close')) + '">' + U.icon('close', 16) + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="insp-body">' +
        '<input class="insp-title" id="insp-title" value="' + U.esc(c.title) + '" placeholder="' + U.esc(t('common.untitled')) + '">' +
        '<div class="insp-submeta">' +
          '<span>' + U.esc(t('cards.createdAt')) + ' ' + U.esc(U.fmtDate(c.createdAt)) + '</span>' +
          '<span class="dot"></span>' +
          '<span>' + U.esc(t('cards.updatedAt')) + ' ' + U.esc(U.relTime(c.updatedAt)) + '</span>' +
        '</div>' +

        (cur && (cur.positions[c.id] || cur.offsets[c.id] || edges.length) ?
          '<button class="locate-btn" data-act="locate">' + U.icon('focus', 14) + '<span>' + U.esc(t('common.jump')) + ' · ' + U.esc(cur.name) + '</span></button>' : '') +

        styleBlock(c) +

        '<div class="insp-section">' +
          '<div class="insp-label">' + U.esc(t('cards.body')) + '</div>' +
          '<textarea class="insp-textarea" id="insp-body" rows="4" placeholder="' + U.esc(t('cards.bodyPlaceholder')) + '">' + U.esc(c.body) + '</textarea>' +
        '</div>' +

        '<div class="insp-section note-section' + (noteOpen ? ' open' : '') + '">' +
          '<button class="note-toggle" data-act="note-toggle">' +
            '<span class="nt-left">' + U.icon('note', 14) + U.esc(t('common.note')) + '<em>' + U.esc(t('common.optional')) + '</em></span>' +
            '<span class="nt-chev">' + U.icon('chevron', 14) + '</span>' +
          '</button>' +
          '<textarea class="insp-textarea note-area" id="insp-note" rows="3" placeholder="' + U.esc(t('cards.notePlaceholder')) + '">' + U.esc(c.note) + '</textarea>' +
        '</div>' +

        chipSection('tags', t('common.tags'), c.tags, t('cards.tagsPlaceholder'), 'tag') +

        '<div class="insp-section">' +
          '<div class="insp-label">' + U.esc(t('common.category')) + '</div>' +
          '<input class="insp-input" id="insp-category" value="' + U.esc(c.category) + '" placeholder="' + U.esc(t('cards.categoryPlaceholder')) + '">' +
        '</div>' +

        '<div class="insp-block">' +
          '<div class="insp-block-head"><span>' + U.esc(t('cards.sources')) + '</span>' +
            '<button class="mini-btn" data-act="add-source">' + U.icon('plus', 13) + U.esc(t('cards.addSource')) + '</button></div>' +
          '<div class="source-list">' +
            (c.sources.length ? c.sources.map(function (s) {
              return '<div class="source-row"><span class="src-kind">' + U.esc(t('cards.source' + cap(s.kind || 'manual'))) + '</span>' +
                '<span class="src-ref">' + U.esc(s.ref || '') + '</span>' +
                '<span class="src-time">' + U.esc(U.fmtDate(s.at)) + '</span></div>';
            }).join('') :
              '<div class="mini-empty">' + U.esc(t('common.empty')) + '</div>') +
          '</div>' +
        '</div>' +

        '<div class="insp-block">' +
          '<div class="insp-block-head"><span>' + U.esc(t('cards.links')) + '</span>' +
            (cur ? '<button class="mini-btn" data-act="link">' + U.icon('link', 13) + U.esc(t('map.connect')) + '</button>' : '') + '</div>' +
          '<div class="link-list">' +
            (edges.length ? edges.map(function (e) {
              var otherId = e.from === c.id ? e.to : e.from;
              var oc = S.card(otherId);
              if (!oc) return '';
              return '<button class="link-row" data-edge="' + e.id + '">' +
                '<span class="lk-type" data-type="' + U.esc(e.type) + '">' + U.esc(typeName(e.type)) + '</span>' +
                '<span class="lk-dir">' + (e.from === c.id ? '→' : '←') + '</span>' +
                '<span class="lk-name">' + U.esc(oc.title || t('common.untitled')) + '</span>' +
                (e.uncertain ? '<span class="lk-doubt">?</span>' : '') +
                '</button>';
            }).join('') : '<div class="mini-empty">' + U.esc(t('cards.noLinks')) + '</div>') +
          '</div>' +
        '</div>' +

        '<div class="insp-block">' +
          '<div class="insp-block-head"><span>' + U.esc(t('cards.reverse')) + '</span></div>' +
          (maps.length ? '<div class="map-ref-list">' + maps.map(function (m) {
            return '<button class="map-ref" data-map="' + m.id + '">' + U.icon('map', 14) + '<span>' + U.esc(m.name) + '</span>' +
              '<span class="map-ref-count">' + S.mapCards(m).length + '</span></button>';
          }).join('') + '</div>' : '<div class="mini-empty">' + U.esc(t('cards.reverseNone')) + '</div>') +
        '</div>' +

        (dups.length ? '<div class="insp-block dup-block">' +
          '<div class="insp-block-head"><span>' + U.esc(t('cards.duplicates')) + '</span></div>' +
          '<p class="dup-hint">' + U.esc(t('cards.duplicateHint')) + '</p>' +
          dups.map(function (d) {
            return '<div class="dup-row"><button class="dup-name" data-card="' + d.card.id + '">' + U.esc(d.card.title || t('common.untitled')) + '</button>' +
              '<span class="dup-score">' + Math.round(d.score * 100) + '%</span>' +
              '<button class="mini-btn accent" data-act="merge" data-target="' + d.card.id + '">' + U.esc(t('common.merge')) + '</button>' +
              '<button class="icon-btn xs" data-act="dismiss" data-target="' + d.card.id + '" title="' + U.esc(t('common.ignore')) + '">' + U.icon('close', 12) + '</button></div>';
          }).join('') +
        '</div>' : '') +

        '<div class="insp-foot">' +
          '<span class="foot-note">' + U.esc(t('cards.saveHint')) + '</span>' +
        '</div>' +
      '</div>';

    bind(c, opts);
    autogrow(host.querySelector('#insp-body'));
    autogrow(host.querySelector('#insp-note'));
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Manual'; }

  var FILLS = ['', '#f7f4ec', '#e9f1ea', '#e6eef7', '#f9eee3', '#f5e9ef', '#efeaf7', '#2f3b39'];

  function styleBlock(c) {
    var st = c.style || {};
    var shape = st.shape || 'rounded';
    var size = st.size || 'm';
    var bold = st.bold !== false;
    return '<div class="insp-section style-section">' +
      '<div class="insp-label">' + U.esc(t('style.title')) + '</div>' +
      '<div class="style-line">' +
        '<div class="segmented tiny">' +
          ['rounded', 'rect', 'pill'].map(function (k) {
            return '<button class="seg' + (shape === k ? ' active' : '') + '" data-shape="' + k + '">' + U.esc(t('style.' + k)) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="segmented tiny">' +
          ['s', 'm', 'l'].map(function (k) {
            return '<button class="seg' + (size === k ? ' active' : '') + '" data-fsize="' + k + '">' + U.esc(t('style.' + (k === 's' ? 'small' : k === 'l' ? 'large' : 'medium'))) + '</button>';
          }).join('') +
        '</div>' +
        '<button class="mini-btn' + (bold ? ' accent' : '') + '" id="insp-bold">B</button>' +
      '</div>' +
      '<div class="style-line">' +
        '<span class="style-sub">' + U.esc(t('style.fill')) + '</span>' +
        '<div class="swatches small">' +
          FILLS.map(function (f) {
            return '<button class="swatch sm' + ((st.fill || '') === f ? ' active' : '') + '" data-fill="' + U.esc(f) + '" style="background:' + (f || 'transparent') + '"></button>';
          }).join('') +
        '</div>' +
        '<input class="input tiny" id="insp-icon" value="' + U.esc(st.icon || '') + '" placeholder="' + U.esc(t('style.icon')) + '">' +
      '</div>' +
      '<div class="style-line">' +
        '<span class="style-sub">' + U.esc(t('style.link')) + '</span>' +
        '<input class="input" id="insp-link" value="' + U.esc(c.link || '') + '" placeholder="https://">' +
        '<button class="mini-btn" data-act="open-link">' + U.icon('external', 12) + '</button>' +
      '</div>' +
    '</div>';
  }

  function patchStyle(key, value) {
    var c = S.card(currentId);
    if (!c) return;
    S.commit('edit', t('style.title'), function () {
      c.style = c.style || {};
      if (key === 'bold') {
        if (value === '') delete c.style.bold; else c.style.bold = !!value;
      } else if (value === '' || value == null || value === false) {
        delete c.style[key];
      } else {
        c.style[key] = value;
      }
      c.updatedAt = Date.now();
    });
    refresh();
  }

  function chipSection(field, label, values, placeholder, kind) {
    return '<div class="insp-section">' +
      '<div class="insp-label">' + U.esc(label) + '</div>' +
      '<div class="chips-box" data-field="' + field + '">' +
        values.map(function (v) {
          return '<span class="chip ' + kind + '">' + U.esc(v) +
            '<button class="chip-x" data-remove="' + U.esc(v) + '">' + U.icon('close', 10) + '</button></span>';
        }).join('') +
        '<input class="chip-input" data-add="' + field + '"' + (kind === 'lang' ? ' list="lang-list"' : '') + ' placeholder="' + U.esc(placeholder) + '">' +
      '</div>' +
    '</div>';
  }

  function bind(c, opts) {
    var id = c.id;

    host.querySelector('[data-act="close"]').onclick = close;
    host.querySelector('[data-act="delete"]').onclick = function () { CC.app.deleteCardFlow(id); };

    var locate = host.querySelector('[data-act="locate"]');
    if (locate) locate.onclick = function () { CC.app.locateCard(id); };

    host.querySelector('[data-act="note-toggle"]').onclick = function () {
      noteOpen = !noteOpen;
      host.querySelector('.note-section').classList.toggle('open', noteOpen);
      if (noteOpen) setTimeout(function () { host.querySelector('#insp-note').focus(); }, 120);
    };

    bindText('#insp-title', 'title', t('history.kind.edit'));
    bindText('#insp-body', 'body', t('history.kind.edit'));
    bindText('#insp-note', 'note', t('history.kind.edit'));
    bindText('#insp-category', 'category', t('history.kind.edit'));

    var addSource = host.querySelector('[data-act="add-source"]');
    if (addSource) addSource.onclick = function () {
      U.prompt(t('cards.addSource'), '', { placeholder: t('cards.sourceNote') + ' / URL' }).then(function (v) {
        if (!v) return;
        S.commit('edit', t('cards.addSource'), function () {
          c.sources.push({ kind: 'manual', ref: v, at: Date.now() });
        });
        refresh();
      });
    };

    var linkBtn = host.querySelector('[data-act="link"]');
    if (linkBtn) linkBtn.onclick = function () { CC.app.startLinkFrom(id); };

    host.querySelectorAll('[data-shape]').forEach(function (b) {
      b.onclick = function () { patchStyle('shape', b.getAttribute('data-shape')); };
    });
    host.querySelectorAll('[data-fsize]').forEach(function (b) {
      b.onclick = function () { patchStyle('size', b.getAttribute('data-fsize')); };
    });
    var boldBtn = host.querySelector('#insp-bold');
    if (boldBtn) boldBtn.onclick = function () {
      patchStyle('bold', (c.style && c.style.bold === false) ? '' : false);
    };
    host.querySelectorAll('[data-fill]').forEach(function (b) {
      b.onclick = function () { patchStyle('fill', b.getAttribute('data-fill')); };
    });
    var iconInput = host.querySelector('#insp-icon');
    if (iconInput) iconInput.onchange = function () { patchStyle('icon', iconInput.value.trim()); };
    var linkInput = host.querySelector('#insp-link');
    if (linkInput) linkInput.onchange = function () {
      S.commit('edit', t('style.link'), function () { c.link = linkInput.value.trim(); });
      refresh();
    };
    var openLink = host.querySelector('[data-act="open-link"]');
    if (openLink) openLink.onclick = function () {
      var url = host.querySelector('#insp-link').value.trim();
      if (!url) return;
      if (window.api.openExternal) window.api.openExternal(url);
    };

    host.querySelectorAll('[data-edge]').forEach(function (b) {
      b.onclick = function () { CC.graph.editEdge(b.getAttribute('data-edge')); };
    });
    host.querySelectorAll('.map-ref').forEach(function (b) {
      b.onclick = function () { CC.app.goMap(b.getAttribute('data-map'), id); };
    });
    host.querySelectorAll('[data-card]').forEach(function (b) {
      if (b.classList.contains('dup-name')) b.onclick = function () { open(b.getAttribute('data-card')); };
    });
    host.querySelectorAll('[data-act="merge"]').forEach(function (b) {
      b.onclick = function () { CC.app.mergeFlow(id, b.getAttribute('data-target')); };
    });
    host.querySelectorAll('[data-act="dismiss"]').forEach(function (b) {
      b.onclick = function () {
        var other = b.getAttribute('data-target');
        S.commit('edit', t('common.ignore'), function () {
          S.state().dismissed.push(S.pairKey(id, other));
        });
        refresh();
      };
    });

    host.querySelectorAll('[data-add]').forEach(function (input) {
      var field = input.getAttribute('data-add');
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          addChip(field, input.value.trim());
          input.value = '';
        } else if (e.key === 'Backspace' && !input.value) {
          var arr = c[field] || [];
          if (arr.length) { removeChip(field, arr[arr.length - 1]); }
        }
      });
      input.addEventListener('blur', function () {
        if (input.value.trim()) { addChip(field, input.value.trim()); input.value = ''; }
      });
    });
    host.querySelectorAll('.chip-x').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var field = b.closest('.chips-box').getAttribute('data-field');
        removeChip(field, b.getAttribute('data-remove'));
      };
    });
    host.querySelectorAll('.chip.tag, .chip.lang').forEach(function (chipEl) {
      chipEl.addEventListener('click', function (e) {
        if (e.target.closest('.chip-x')) return;
        var field = chipEl.closest('.chips-box').getAttribute('data-field');
        var val = chipEl.textContent.trim();
        CC.app.searchTag(val, field);
      });
    });

    if (opts && opts.keepFocus) {
      var keep = document.activeElement;
      if (keep && keep.id && host.querySelector('#' + keep.id)) {
        var el = host.querySelector('#' + keep.id);
        el.focus();
        el.setSelectionRange(keep.selectionStart, keep.selectionEnd);
      }
    }
  }

  function addChip(field, value) {
    var c = S.card(currentId);
    if (!c) return;
    var list = c[field] || [];
    if (list.some(function (x) { return String(x).toLowerCase() === value.toLowerCase(); })) return;
    list.push(value);
    S.commit('edit', t('common.' + field), function () { c[field] = list; c.updatedAt = Date.now(); });
    refresh();
  }

  function removeChip(field, value) {
    var c = S.card(currentId);
    if (!c) return;
    S.commit('edit', t('common.' + field), function () {
      c[field] = (c[field] || []).filter(function (x) { return x !== value; });
      c.updatedAt = Date.now();
    });
    refresh();
  }

  function bindText(sel, field, label) {
    var el = host.querySelector(sel);
    if (!el) return;
    var before = null;
    el.addEventListener('focus', function () { before = S.snapshotState(); });
    el.addEventListener('input', function () {
      var c = S.card(currentId);
      if (!c) return;
      if (!before) before = S.snapshotState();
      var patch = {};
      patch[field] = el.value;
      S.quiet(function () {
        S.updateCard(c.id, patch);
        S.saveSoon();
      });
      if (el.tagName === 'TEXTAREA') autogrow(el);
      if (CC.app) CC.app.refreshLight();
    });
    el.addEventListener('blur', function () {
      if (before) {
        var c = S.card(currentId);
        if (c) S.touchCard(c.id);
        S.emit();
        S.markEdit('edit', label + (c ? ' · ' + (c.title || t('common.untitled')) : ''), before);
        before = null;
      }
    });
  }

  function autogrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(400, el.scrollHeight + 2) + 'px';
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen() && !document.querySelector('.overlay')) {
      close();
    }
  });

  CC.inspector = {
    open: open, close: close, refresh: refresh, isOpen: isOpen,
    currentCardId: currentCardId
  };
})();
