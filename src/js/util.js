/* Shared helpers + lightweight UI primitives (toast, dialogs, menus) */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var t = function () { return window.t.apply(null, arguments); };

  /* ---------------- helpers ---------------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function fmtDate(ts, withTime) {
    if (!ts) return '';
    var d = new Date(ts);
    var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    var s = y + '-' + m + '-' + day;
    if (withTime) s += ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return s;
  }

  function relTime(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    if (diff < 60000) return t('common.justNow');
    if (diff < 3600000) return t('common.minutesAgo', { n: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('common.hoursAgo', { n: Math.floor(diff / 3600000) });
    if (diff < 86400000 * 7) return t('common.daysAgo', { n: Math.floor(diff / 86400000) });
    return fmtDate(ts);
  }

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[\s\u3000]+/g, ' ')
      .replace(/[，。！？、；：“”‘’《》（）【】·,\.!\?;:"'\(\)\[\]<>~`@#$%^&*+=|\\\/_-]+/g, ' ')
      .trim();
  }

  function bigrams(s) {
    var str = norm(s).replace(/\s+/g, '');
    var out = [];
    for (var i = 0; i < str.length - 1; i++) out.push(str.slice(i, i + 2));
    if (!out.length && str) out.push(str);
    return out;
  }

  function similarity(a, b) {
    var A = bigrams(a), B = bigrams(b);
    if (!A.length || !B.length) return 0;
    var map = {}, hits = 0;
    B.forEach(function (g) { map[g] = (map[g] || 0) + 1; });
    A.forEach(function (g) {
      if (map[g]) { hits++; map[g]--; }
    });
    return (2 * hits) / (A.length + B.length);
  }

  /* ---------------- toast ---------------- */

  function toast(message, kind) {
    var host = document.getElementById('toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 220);
    }, 2600);
  }

  /* ---------------- modal ---------------- */

  var modalStack = [];

  function closeTopModal() {
    var top = modalStack[modalStack.length - 1];
    if (top) top.close(null);
    return !!top;
  }

  function openModal(opts) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'overlay';

      var card = document.createElement('div');
      card.className = 'modal' + (opts.wide ? ' wide' : '') + (opts.medium ? ' medium' : '');

      var head = document.createElement('div');
      head.className = 'modal-head';
      head.innerHTML = '<h3>' + esc(opts.title || '') + '</h3>';

      var body = document.createElement('div');
      body.className = 'modal-body';
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else if (opts.body) body.appendChild(opts.body);

      var foot = document.createElement('div');
      foot.className = 'modal-foot';

      card.appendChild(head);
      card.appendChild(body);
      card.appendChild(foot);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      var finished = false;
      function close(result) {
        if (finished) return;
        finished = true;
        overlay.classList.remove('in');
        setTimeout(function () { overlay.remove(); }, 160);
        var idx = modalStack.indexOf(inst);
        if (idx >= 0) modalStack.splice(idx, 1);
        window.removeEventListener('keydown', onKey, true);
        resolve(result);
      }

      var inst = { close: close, el: overlay };

      (opts.actions || [{ id: 'ok', label: t('common.ok'), primary: true }]).forEach(function (a) {
        var b = document.createElement('button');
        b.className = 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '') + (a.ghost ? ' ghost' : '');
        b.textContent = a.label;
        b.onclick = function () {
          if (a.onClick) {
            var r = a.onClick(body, close);
            if (r === false) return;
            if (r !== undefined) return close(r);
          }
          close(a.value !== undefined ? a.value : (a.id === 'cancel' ? null : a.id));
        };
        foot.appendChild(b);
      });

      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(null); }
        if (e.key === 'Enter' && opts.enterOk !== false && e.target.tagName !== 'TEXTAREA' &&
            !(e.target.closest && e.target.closest('.modal-foot'))) {
          /* danger confirms have no .primary, only a .danger OK button */
          var primary = foot.querySelector('.btn.primary') || foot.querySelector('.btn.danger');
          if (primary) { e.preventDefault(); primary.click(); }
        }
      }
      window.addEventListener('keydown', onKey, true);

      overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay && opts.dismissable !== false) close(null);
      });

      requestAnimationFrame(function () { overlay.classList.add('in'); });
      modalStack.push(inst);

      var focusEl = body.querySelector('[autofocus]') || card.querySelector('input, textarea, .btn.primary');
      if (focusEl) setTimeout(function () { focusEl.focus(); if (focusEl.select) focusEl.select(); }, 40);
    });
  }

  function confirmDialog(title, message, opts) {
    opts = opts || {};
    return openModal({
      title: title,
      body: '<p class="dialog-text">' + esc(message) + '</p>',
      actions: [
        { id: 'cancel', label: t('common.cancel'), ghost: true },
        { id: 'ok', label: opts.okLabel || t('common.confirm'), primary: !opts.danger, danger: opts.danger, value: true }
      ]
    }).then(function (r) { return r === true; });
  }

  function promptDialog(title, value, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.innerHTML = '<input class="input" id="prompt-input" autofocus value="' + esc(value || '') + '" placeholder="' + esc(opts.placeholder || '') + '">';
    return openModal({
      title: title,
      body: wrap,
      actions: [
        { id: 'cancel', label: t('common.cancel'), ghost: true },
        {
          id: 'ok', label: opts.okLabel || t('common.ok'), primary: true,
          onClick: function (body) {
            var v = body.querySelector('#prompt-input').value.trim();
            if (!v) return false;
            return v;
          }
        }
      ]
    }).then(function (v) { return typeof v === 'string' ? v : null; });
  }

  function alertDialog(title, message) {
    return openModal({
      title: title,
      body: '<p class="dialog-text">' + message + '</p>',
      actions: [{ id: 'ok', label: t('common.ok'), primary: true }]
    });
  }

  /* ---------------- context menu ---------------- */

  function closeMenus() {
    document.querySelectorAll('.ctx-menu').forEach(function (m) { m.remove(); });
  }

  function showMenu(x, y, items) {
    closeMenus();
    var menu = document.createElement('div');
    menu.className = 'ctx-menu';
    items.forEach(function (item) {
      if (item.sep) {
        var sep = document.createElement('div');
        sep.className = 'ctx-sep';
        menu.appendChild(sep);
        return;
      }
      var b = document.createElement('button');
      b.className = 'ctx-item' + (item.danger ? ' danger' : '') + (item.disabled ? ' disabled' : '');
      b.innerHTML = (item.icon ? '<span class="ctx-icon">' + item.icon + '</span>' : '') +
        '<span class="ctx-label">' + esc(item.label) + '</span>' +
        (item.hint ? '<span class="ctx-hint">' + esc(item.hint) + '</span>' : '');
      if (!item.disabled) {
        b.onclick = function () { closeMenus(); item.onClick && item.onClick(b); };
      }
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    var rect = menu.getBoundingClientRect();
    var left = Math.min(x, window.innerWidth - rect.width - 12);
    var top = Math.min(y, window.innerHeight - rect.height - 12);
    menu.style.left = Math.max(8, left) + 'px';
    menu.style.top = Math.max(8, top) + 'px';
    requestAnimationFrame(function () { menu.classList.add('in'); });
  }

  document.addEventListener('mousedown', function (e) {
    if (!e.target.closest('.ctx-menu')) closeMenus();
  });
  window.addEventListener('blur', closeMenus);

  /* ---------------- misc ---------------- */

  function icon(name, size) {
    return '<svg class="ico" width="' + (size || 18) + '" height="' + (size || 18) + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  CC.util = {
    esc: esc, uid: uid, debounce: debounce, clone: clone,
    fmtDate: fmtDate, relTime: relTime, norm: norm, similarity: similarity, bigrams: bigrams,
    toast: toast, openModal: openModal, confirm: confirmDialog, prompt: promptDialog, alert: alertDialog,
    showMenu: showMenu, closeMenus: closeMenus, closeTopModal: closeTopModal, icon: icon, download: download
  };
})();
