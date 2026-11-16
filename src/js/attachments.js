/* Attachments: images and files that live next to the corpus, not inside it.
   The corpus keeps only the metadata; the bytes stay in a local folder so a
   big picture never bloats the .wef backup. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  var cache = {};      /* id -> data URL for pictures */
  var listeners = [];

  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } }); }

  function dataUrl(id) { return cache[id] || ''; }

  function isImage(a) { return a && a.mime && String(a.mime).indexOf('image/') === 0; }

  function firstPicture(card) {
    if (!card || !card.attachments) return null;
    for (var i = 0; i < card.attachments.length; i++) {
      if (isImage(card.attachments[i])) return card.attachments[i];
    }
    return null;
  }

  /* Load the preview bytes for every picture of a card. */
  function load(cardId) {
    var c = S.card(cardId);
    if (!c || !c.attachments) return Promise.resolve();
    /* undefined = not tried yet; '' marks a failed read so a broken file does
       not re-emit (and re-render every subscriber) on each paint. */
    var jobs = c.attachments.filter(function (a) { return isImage(a) && cache[a.id] === undefined; });
    if (!jobs.length) return Promise.resolve();
    return Promise.all(jobs.map(function (a) {
      if (!window.api || !window.api.readAttachment) { cache[a.id] = ''; return null; }
      return window.api.readAttachment(a.id).then(function (r) {
        cache[a.id] = (r && r.ok && r.dataUrl) ? r.dataUrl : '';
      }).catch(function () { cache[a.id] = ''; });
    })).then(function () { emit(); });
  }

  function pick(cardId, imagesOnly) {
    var c = S.card(cardId);
    if (!c) return Promise.resolve(null);
    if (!window.api || !window.api.pickAttachments) return Promise.resolve(null);
    return window.api.pickAttachments(imagesOnly ? 'image' : 'any').then(function (r) {
      if (!r || !r.ok || !r.files || !r.files.length) return null;
      var added = r.files;
      S.commit('edit', t('cards.addAttachment'), function () {
        c.attachments = c.attachments || [];
        added.forEach(function (f) { c.attachments.push(f); });
        c.updatedAt = Date.now();
      });
      load(cardId);
      return added;
    }).catch(function () { return null; });
  }

  function remove(cardId, attId) {
    var c = S.card(cardId);
    if (!c) return;
    S.commit('edit', t('cards.removeAttachment'), function () {
      c.attachments = (c.attachments || []).filter(function (a) { return a.id !== attId; });
      c.updatedAt = Date.now();
    });
    delete cache[attId];
    if (window.api && window.api.deleteAttachment) window.api.deleteAttachment(attId);
    emit();
  }

  function open(att) {
    if (!att) return;
    if (window.api && window.api.openAttachment) window.api.openAttachment(att.id);
  }

  function reveal(att) {
    if (!att) return;
    if (window.api && window.api.revealAttachment) window.api.revealAttachment(att.id);
  }

  /* ---- inspector markup ---- */

  function block(card) {
    var list = card.attachments || [];
    return '<div class="insp-block attach-block">' +
      '<div class="insp-block-head"><span>' + U.esc(t('cards.attachments')) + '</span>' +
        '<span class="attach-count">' + U.esc(t('attach.count', { n: list.length })) + '</span></div>' +
      '<div class="attach-actions">' +
        '<button class="mini-btn" data-act="attach-image">' + U.icon('image', 13) + U.esc(t('attach.addImage')) + '</button>' +
        '<button class="mini-btn" data-act="attach-file">' + U.icon('file', 13) + U.esc(t('attach.addFile')) + '</button>' +
      '</div>' +
      (list.length ? '<div class="attach-list">' + list.map(function (a) {
        return '<div class="attach-row">' +
          (isImage(a) && dataUrl(a.id)
            ? '<img class="attach-thumb" src="' + U.esc(dataUrl(a.id)) + '" alt="">'
            : '<span class="attach-icon">' + U.icon(isImage(a) ? 'image' : 'file', 14) + '</span>') +
          '<span class="attach-name">' + U.esc(a.name) + '</span>' +
          '<span class="attach-size">' + U.esc(fmtSize(a.size)) + '</span>' +
          '<button class="icon-btn xs" data-act="attach-open" data-id="' + U.esc(a.id) + '" title="' + U.esc(t('attach.open')) + '">' + U.icon('external', 12) + '</button>' +
          '<button class="icon-btn xs" data-act="attach-reveal" data-id="' + U.esc(a.id) + '" title="' + U.esc(t('attach.reveal')) + '">' + U.icon('folder', 12) + '</button>' +
          '<button class="icon-btn xs" data-act="attach-del" data-id="' + U.esc(a.id) + '" title="' + U.esc(t('cards.removeAttachment')) + '">' + U.icon('close', 12) + '</button>' +
          '</div>';
      }).join('') + '</div>' : '<div class="mini-empty">' + U.esc(t('common.empty')) + '</div>') +
      '</div>';
  }

  function fmtSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function clear() { cache = {}; emit(); }

  CC.attach = {
    dataUrl: dataUrl, firstPicture: firstPicture, isImage: isImage,
    load: load, pick: pick, remove: remove, open: open, reveal: reveal,
    block: block, onChange: onChange, fmtSize: fmtSize, clear: clear
  };
})();
