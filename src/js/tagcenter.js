/* Tag management center: rename / merge / colour tags across the whole corpus. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };
  var PALETTE = ['#8a9a5b', '#c08552', '#7d8fa9', '#a9738f', '#6f9c8f', '#b08a5a', '#8b84b8', '#a67c6b'];

  function allTags() {
    var counts = {};
    S.cards().forEach(function (c) {
      (c.tags || []).forEach(function (tag) { counts[tag] = (counts[tag] || 0) + 1; });
    });
    return Object.keys(counts).sort().map(function (tag) { return { name: tag, count: counts[tag] }; });
  }

  function renameTag(oldName, newName) {
    newName = String(newName || '').trim();
    if (!newName || newName === oldName) return;
    S.commit('batch', t('tagcenter.rename'), function () {
      S.state().cards.forEach(function (c) {
        if (!(c.tags || []).length) return;
        var idx = c.tags.indexOf(oldName);
        if (idx < 0) return;
        c.tags[idx] = newName;
        c.tags = c.tags.filter(function (x, i) { return c.tags.indexOf(x) === i; });
        c.updatedAt = Date.now();
      });
      var colors = S.state().tagColors;
      if (colors[oldName]) { colors[newName] = colors[oldName]; delete colors[oldName]; }
    }, { snapshot: true });
  }

  function mergeTag(fromName, toName) {
    if (fromName === toName) return;
    S.commit('batch', t('tagcenter.merge'), function () {
      S.state().cards.forEach(function (c) {
        if ((c.tags || []).indexOf(fromName) < 0) return;
        c.tags = c.tags.map(function (x) { return x === fromName ? toName : x; })
          .filter(function (x, i, a) { return a.indexOf(x) === i; });
        c.updatedAt = Date.now();
      });
      var colors = S.state().tagColors;
      if (colors[fromName] && !colors[toName]) colors[toName] = colors[fromName];
      delete colors[fromName];
    }, { snapshot: true });
  }

  function render(host) {
    var tags = allTags();
    var colors = S.state().tagColors || {};
    if (!tags.length) { host.innerHTML = '<div class="mini-empty">' + U.esc(t('tagcenter.empty')) + '</div>'; return; }
    host.innerHTML = tags.map(function (it) {
      var color = colors[it.name] || '';
      return '<div class="tc-row">' +
        '<span class="tc-dot" data-color="' + U.esc(it.name) + '" style="background:' + U.esc(color || 'transparent') + '" title="' + U.esc(t('tagcenter.color')) + '"></span>' +
        '<span class="tc-name">' + U.esc(it.name) + '</span>' +
        '<span class="tc-count">' + it.count + '</span>' +
        '<button class="mini-btn" data-rename="' + U.esc(it.name) + '">' + U.esc(t('tagcenter.rename')) + '</button>' +
        '<button class="mini-btn" data-merge="' + U.esc(it.name) + '">' + U.esc(t('tagcenter.merge')) + '</button>' +
        '</div>';
    }).join('');

    host.querySelectorAll('[data-rename]').forEach(function (b) {
      b.onclick = function () {
        var oldName = b.getAttribute('data-rename');
        U.prompt(t('tagcenter.rename'), oldName).then(function (v) { if (v) renameTag(oldName, v); render(host); });
      };
    });
    host.querySelectorAll('[data-merge]').forEach(function (b) {
      b.onclick = function () {
        var from = b.getAttribute('data-merge');
        var choices = allTags().filter(function (x) { return x.name !== from; }).map(function (x) {
          return { label: x.name + ' (' + x.count + ')', onClick: function () { mergeTag(from, x.name); render(host); } };
        });
        if (!choices.length) { U.toast(t('tagcenter.empty'), 'bad'); return; }
        var r = b.getBoundingClientRect();
        U.showMenu(r.left, r.bottom + 4, choices);
      };
    });
    host.querySelectorAll('[data-color]').forEach(function (b) {
      b.onclick = function () {
        var name = b.getAttribute('data-color');
        var cur = S.state().tagColors;
        var idx = (PALETTE.indexOf(cur[name]) + 1) % PALETTE.length;
        cur[name] = PALETTE[idx];
        S.saveSoon(); S.emit();
        render(host);
      };
    });
  }

  CC.tagcenter = { render: render };
})();
