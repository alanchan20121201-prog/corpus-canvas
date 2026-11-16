/* Right-hand card inspector: the corpus record, editing in place */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  var host = null;
  var currentId = null;
  var noteOpen = false;
  var bodyPreview = false;

  /* Collect edges pointing TO a card from every map (who references me). */
  function backlinksOf(cardId) {
    var out = [], seen = {}, k;
    S.maps().forEach(function (m) {
      (m.edges || []).forEach(function (e) {
        if (e.to !== cardId || e.from === e.to) return;
        var src = S.card(e.from);
        if (!src) return;
        k = m.id + '|' + e.from + '|' + (e.type || '');
        if (seen[k]) return;
        seen[k] = 1;
        out.push({ from: src, type: e.type || 'custom', map: m.name, uncertain: !!e.uncertain });
      });
    });
    return out;
  }

  /* Title -> card ids index for [[wiki links]]; duplicates get a menu. */
  function titleIndex() {
    var idx = {};
    S.cards().forEach(function (c) {
      var key = (c.title || t('common.untitled')).trim();
      (idx[key] = idx[key] || []).push(c.id);
    });
    return idx;
  }

  function gotoWiki(title) {
    var ids = titleIndex()[String(title).trim()] || [];
    if (!ids.length) { U.toast(t('cards.wikiMissing'), 'bad'); return; }
    if (ids.length === 1) { open(ids[0]); return; }
    U.showMenu(document.body.clientWidth / 2 - 120, 140, ids.map(function (id) {
      var c = S.card(id);
      return { label: (c && c.title) || t('common.untitled'), onClick: function () { open(id); } };
    }));
  }

  function sourceLabel(s) {
    if (!s) return '';
    if (s.kind === 'card') {
      var target = S.card(s.ref);
      return (target && target.title) || s.title || s.ref || '';
    }
    return String(s.ref || '');
  }

  function followSource(s) {
    if (!s) return;
    if (s.kind === 'card' && S.card(s.ref)) { open(s.ref); return; }
    var ref = String(s.ref || '');
    if (/^https?:\/\//i.test(ref)) {
      if (window.api && window.api.openExternal) window.api.openExternal(ref);
      return;
    }
    /* plain text: try to match a card title exactly, then loosely, else search */
    var cards = S.cards();
    var hit = cards.filter(function (c) { return (c.title || '').trim() === ref.trim(); })[0];
    if (!hit) {
      var q = U.norm ? U.norm(ref) : ref.toLowerCase();
      hit = cards.filter(function (c) { return U.norm(c.title || c.body || '').indexOf(q) >= 0; })[0];
    }
    if (hit) { open(hit.id); return; }
    if (CC.search && CC.search.setQuery) { CC.search.setQuery(ref); CC.app.nav('search'); }
  }

  function fillBodyPreview(c) {
    var el = host.querySelector('#insp-body-preview');
    if (!el) return;
    el.innerHTML = CC.md ? CC.md.render(c.body || '') : U.esc(c.body || '');
    el.querySelectorAll('[data-wiki]').forEach(function (a) {
      a.onclick = function () { gotoWiki(a.getAttribute('data-wiki')); };
    });
  }

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
    var backs = backlinksOf(c.id);
    var typeName = function (k) { return t('edge.' + (k || 'custom')); };

    /* host.innerHTML below destroys the focused field; capture it first so
       a background refresh while typing does not lose the caret/scroll. */
    var focusState = null;
    if (opts && opts.keepFocus) {
      var ae = document.activeElement;
      if (ae && ae.id && host.contains(ae)) {
        var bodyEl = host.querySelector('.insp-body');
        focusState = { id: ae.id, start: ae.selectionStart, end: ae.selectionEnd,
          scroll: bodyEl ? bodyEl.scrollTop : 0 };
      }
    }

    host.innerHTML =
      '<div class="insp-head">' +
        '<div class="insp-head-left">' +
          '<span class="insp-eyebrow">' + U.icon('cards', 14) + '<span>' + U.esc(t('cards.props')) + '</span></span>' +
        '</div>' +
        '<div class="insp-head-actions">' +
          '<button class="icon-btn sm" data-act="save-card-tpl" title="' + U.esc(t('template.cardSave')) + '">' + U.icon('plus', 16) + '</button>' +
          '<button class="icon-btn sm" data-act="apply-card-tpl" title="' + U.esc(t('template.cardApply')) + '">' + U.icon('layout', 16) + '</button>' +
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
          '<div class="insp-label">' + U.esc(t('cards.body')) +
            '<button class="mini-btn insp-md-toggle" data-act="body-preview">' + U.esc(bodyPreview ? t('cards.mdEdit') : t('cards.mdPreview')) + '</button></div>' +
          '<textarea class="insp-textarea" id="insp-body" rows="4"' + (bodyPreview ? ' hidden' : '') + ' placeholder="' + U.esc(t('cards.bodyPlaceholder')) + '">' + U.esc(c.body) + '</textarea>' +
          '<div class="insp-md-preview" id="insp-body-preview"' + (bodyPreview ? '' : ' hidden') + '></div>' +
        '</div>' +

        summaryBlock(c) +

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
            '<button class="mini-btn" data-act="cite-card">' + U.esc(t('cards.citeCard')) + '</button>' +
            '<button class="mini-btn" data-act="add-source">' + U.icon('plus', 13) + U.esc(t('cards.addSource')) + '</button></div>' +
          '<div class="source-list">' +
            (c.sources.length ? c.sources.map(function (s, i) {
              var kind = String(s.kind || 'manual');
              var label = t('cards.source' + (kind === 'ai' ? 'AI' : cap(kind)));
              return '<button class="source-row source-link" data-source="' + i + '" title="' + U.esc(t('cards.followSource')) + '">' +
                '<span class="src-kind">' + U.esc(label) + '</span>' +
                '<span class="src-ref">' + U.esc(sourceLabel(s)) + '</span>' +
                '<span class="src-time">' + U.esc(U.fmtDate(s.at)) + '</span></button>';
            }).join('') :
              '<div class="mini-empty">' + U.esc(t('common.empty')) + '</div>') +
          '</div>' +
        '</div>' +

        (CC.attach ? CC.attach.block(c) : '') +

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
          '<div class="insp-block-head"><span>' + U.esc(t('cards.backlinks')) + '</span></div>' +
          (backs.length ? '<div class="link-list">' + backs.map(function (b) {
            return '<button class="link-row" data-backlink="' + U.esc(b.from.id) + '">' +
              '<span class="lk-type" data-type="' + U.esc(b.type) + '">' + U.esc(typeName(b.type)) + '</span>' +
              '<span class="lk-dir">←</span>' +
              '<span class="lk-name">' + U.esc(b.from.title || t('common.untitled')) + '</span>' +
              (b.uncertain ? '<span class="lk-doubt">?</span>' : '') +
              '</button>';
          }).join('') + '</div>' : '<div class="mini-empty">' + U.esc(t('cards.backlinkNone')) + '</div>') +
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
          (dups.total > dups.length ? '<p class="trunc-note">' + U.esc(t('common.moreHidden', { n: dups.total - dups.length })) + '</p>' : '') +
        '</div>' : '') +

        '<div class="insp-foot">' +
          '<span class="foot-note">' + U.esc(t('cards.saveHint')) + '</span>' +
        '</div>' +
      '</div>';

    bind(c, opts);
    if (bodyPreview) fillBodyPreview(c);
    autogrow(host.querySelector('#insp-body'));
    autogrow(host.querySelector('#insp-note'));
    autogrow(host.querySelector('#insp-summary'));
    if (focusState) {
      var el2 = host.querySelector('#' + focusState.id);
      if (el2) {
        el2.focus();
        if (focusState.start != null && el2.setSelectionRange) {
          try { el2.setSelectionRange(focusState.start, focusState.end); } catch (e) { /* ignore */ }
        }
      }
      var body2 = host.querySelector('.insp-body');
      if (body2) body2.scrollTop = focusState.scroll;
    }
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

  function summaryBlock(c) {
    var st = c.style || {};
    var kind = st.summaryKind || 'plain';
    return '<div class="insp-section summary-section">' +
      '<div class="insp-label">' + U.esc(t('cards.summary')) + '</div>' +
      '<textarea class="insp-textarea summary-area" id="insp-summary" rows="2" placeholder="' + U.esc(t('cards.summaryPlaceholder')) + '">' + U.esc(c.summary || '') + '</textarea>' +
      '<div class="style-line summary-line">' +
        '<span class="style-sub">' + U.esc(t('map.summaryStyle')) + '</span>' +
        '<div class="segmented tiny">' +
          ['plain', 'callout', 'badge'].map(function (k) {
            return '<button class="seg' + (kind === k ? ' active' : '') + '" data-sumkind="' + k + '">' + U.esc(t('map.summary' + k.charAt(0).toUpperCase() + k.slice(1))) + '</button>';
          }).join('') +
        '</div>' +
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

  function findAttachment(cardId, attId) {
    var c = S.card(cardId);
    if (!c || !c.attachments) return null;
    return c.attachments.filter(function (a) { return a.id === attId; })[0] || null;
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

    var saveTpl = host.querySelector('[data-act="save-card-tpl"]');
    if (saveTpl) saveTpl.onclick = function () {
      var card = S.card(id);
      if (!card) return;
      U.prompt(t('template.cardSave'), card.title || '').then(function (name) {
        if (!name) return;
        S.commit('template', t('template.cardSave'), function () {
          S.state().cardTemplates.push({
            id: U.uid('ct'), name: String(name).trim(), at: Date.now(),
            payload: {
              title: card.title, body: card.body, note: card.note,
              tags: (card.tags || []).slice(), category: card.category || '',
              color: card.color || '', style: Object.assign({}, card.style || {})
            }
          });
        });
        U.toast(t('template.cardSaved'), 'ok');
      });
    };

    var applyTpl = host.querySelector('[data-act="apply-card-tpl"]');
    if (applyTpl) applyTpl.onclick = function () {
      var list = S.state().cardTemplates || [];
      if (!list.length) { U.toast(t('template.cardEmpty'), 'bad'); return; }
      var r = applyTpl.getBoundingClientRect();
      U.showMenu(r.left - 160, r.bottom + 6, list.map(function (tpl) {
        return {
          label: tpl.name,
          onClick: function () {
            var p = Object.assign({}, tpl.payload);
            p.title = p.title ? p.title + ' · ' + t('common.untitled') : t('common.untitled');
            var nc = S.newCard(p, true);
            open(nc.id);
            U.toast(t('template.cardApplied'), 'ok');
          }
        };
      }));
    };
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
    bindText('#insp-summary', 'summary', t('history.kind.edit'));
    bindText('#insp-category', 'category', t('history.kind.edit'));

    host.querySelectorAll('[data-source]').forEach(function (b) {
      b.onclick = function () {
        var idx = Number(b.getAttribute('data-source'));
        var card = S.card(id);
        if (card && card.sources[idx]) followSource(card.sources[idx]);
      };
    });

    var citeCard = host.querySelector('[data-act="cite-card"]');
    if (citeCard) citeCard.onclick = function () {
      U.prompt(t('cards.citeCard'), '', { placeholder: t('cards.citeCardPlaceholder') }).then(function (v) {
        if (!v) return;
        var title = String(v).trim();
        var target = S.cards().filter(function (c) { return (c.title || '').trim() === title; })[0];
        if (!target) { U.toast(t('cards.citeNotFound'), 'bad'); return; }
        S.commit('edit', t('cards.citeCard'), function () {
          c.sources.push({ kind: 'card', ref: target.id, title: target.title, at: Date.now() });
        });
        refresh();
      });
    };

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
    host.querySelectorAll('[data-sumkind]').forEach(function (b) {
      b.onclick = function () { patchStyle('summaryKind', b.getAttribute('data-sumkind')); };
    });

    if (CC.attach) {
      host.querySelectorAll('[data-act="attach-image"]').forEach(function (b) {
        b.onclick = function () { CC.attach.pick(id, true); };
      });
      host.querySelectorAll('[data-act="attach-file"]').forEach(function (b) {
        b.onclick = function () { CC.attach.pick(id, false); };
      });
      host.querySelectorAll('[data-act="attach-open"]').forEach(function (b) {
        b.onclick = function () { CC.attach.open(findAttachment(id, b.getAttribute('data-id'))); };
      });
      host.querySelectorAll('[data-act="attach-reveal"]').forEach(function (b) {
        b.onclick = function () { CC.attach.reveal(findAttachment(id, b.getAttribute('data-id'))); };
      });
      host.querySelectorAll('[data-act="attach-del"]').forEach(function (b) {
        b.onclick = function () { CC.attach.remove(id, b.getAttribute('data-id')); };
      });
      CC.attach.load(id);
    }

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
    host.querySelectorAll('[data-backlink]').forEach(function (b) {
      b.onclick = function () { open(b.getAttribute('data-backlink')); };
    });
    var mdToggle = host.querySelector('[data-act="body-preview"]');
    if (mdToggle) mdToggle.onclick = function () {
      bodyPreview = !bodyPreview;
      var ta = host.querySelector('#insp-body');
      var pv = host.querySelector('#insp-body-preview');
      var card = S.card(id);
      mdToggle.textContent = t(bodyPreview ? 'cards.mdEdit' : 'cards.mdPreview');
      if (ta) ta.hidden = bodyPreview;
      if (pv) { pv.hidden = !bodyPreview; if (bodyPreview && card) fillBodyPreview(card); }
    };
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

  /* Attachment bytes arrive asynchronously and deletions happen in the
     attachment module; re-render the panel whenever either occurs. */
  if (CC.attach && CC.attach.onChange) {
    CC.attach.onChange(function () { if (isOpen() && host) refresh(); });
  }

  CC.inspector = {
    open: open, close: close, refresh: refresh, isOpen: isOpen,
    currentCardId: currentCardId
  };
})();
