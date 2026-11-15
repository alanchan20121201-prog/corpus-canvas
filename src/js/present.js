/* Presentation mode: walk the map one node at a time, full screen.
   The order follows the map structure (roots first, depth first), so the
   talk reads like the outline. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util;
  var t = function () { return window.t.apply(null, arguments); };

  var root = null;
  var items = [];
  var index = 0;

  function isOpen() { return !!root; }

  function build() {
    items = CC.graph.presentItems ? CC.graph.presentItems() : [];
    if (!items.length) {
      U.toast(t('present.empty'));
      return false;
    }
    index = 0;
    root = document.createElement('div');
    root.className = 'present-view';
    document.body.appendChild(root);
    document.body.classList.add('presenting');
    render();
    bindKeys();
    return true;
  }

  function render() {
    var it = items[index];
    if (!it) return;
    var tags = (it.tags || []).map(function (tg) {
      return '<span class="present-tag">' + U.esc(tg) + '</span>';
    }).join('');
    root.innerHTML =
      '<div class="present-top">' +
        '<span class="present-label">' + U.esc(t('present.hint')) + '</span>' +
        '<span class="present-count">' + U.esc(t('present.progress', { n: index + 1, total: items.length })) + '</span>' +
        '<button class="present-close" data-act="present-exit" title="' + U.esc(t('present.exit')) + '">' + U.icon('close', 16) + '</button>' +
      '</div>' +
      '<div class="present-body">' +
        '<h1 class="present-title">' + U.esc(it.title || t('common.untitled')) + '</h1>' +
        (it.summary ? '<p class="present-summary">' + U.esc(it.summary) + '</p>' : '') +
        (it.body ? '<div class="present-text">' + U.esc(it.body) + '</div>' : '') +
        (it.note ? '<div class="present-note">' + U.esc(it.note) + '</div>' : '') +
        (tags ? '<div class="present-tags">' + tags + '</div>' : '') +
      '</div>' +
      '<div class="present-foot">' +
        '<button class="present-nav" data-act="present-prev"' + (index === 0 ? ' disabled' : '') + '>' + U.icon('chevron', 14) + '<span>' + U.esc(t('present.prev')) + '</span></button>' +
        '<span class="present-hint-text">' + U.esc(t('present.exitHint')) + '</span>' +
        '<button class="present-nav" data-act="present-next"' + (index === items.length - 1 ? ' disabled' : '') + '><span>' + U.esc(t('present.next')) + '</span>' + U.icon('chevron', 14) + '</button>' +
      '</div>';

    root.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-act');
        if (a === 'present-exit') exit();
        else if (a === 'present-prev') go(-1);
        else if (a === 'present-next') go(1);
      };
    });
  }

  function go(step) {
    var next = index + step;
    if (next < 0 || next >= items.length) return;
    index = next;
    render();
  }

  function exit() {
    if (!root) return;
    root.remove();
    root = null;
    document.body.classList.remove('presenting');
    document.removeEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') { e.preventDefault(); exit(); return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(1); return; }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); return; }
    if (e.key === 'Home') { e.preventDefault(); index = 0; render(); return; }
    if (e.key === 'End') { e.preventDefault(); index = items.length - 1; render(); }
  }

  function bindKeys() {
    document.removeEventListener('keydown', onKey, true);
    document.addEventListener('keydown', onKey, true);
  }

  function start() {
    if (root) { exit(); return false; }
    return build();
  }

  CC.present = {
    start: start, exit: exit, isOpen: isOpen,
    items: function () { return items; },
    index: function () { return index; },
    go: go
  };
})();
