/* Quick capture window: a tiny frameless note taker invoked by a global hotkey. */
(function () {
  'use strict';
  var t = function () { return window.t.apply(null, arguments); };
  var CC = window.CC = window.CC || {};

  try {
    var lang = CC.i18n.resolveSystem((navigator && navigator.language) || 'en');
    CC.i18n.setLang(lang);
  } catch (e) { /* keep default zh-CN */ }

  var textEl = document.getElementById('q-text');
  var tagsEl = document.getElementById('q-tags');
  var saveBtn = document.getElementById('q-save');
  var cancelBtn = document.getElementById('q-cancel');
  var hintEl = document.querySelector('.q-hint');

  saveBtn.textContent = t('quick.save');
  cancelBtn.textContent = t('common.cancel');
  tagsEl.placeholder = t('quick.tagsPlaceholder');
  hintEl.textContent = t('quick.hint');

  function submit() {
    var text = String(textEl.value || '').trim();
    if (!text) return;
    var tags = String(tagsEl.value || '').split(/[,，\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (window.api && window.api.submitQuickCapture) {
      window.api.submitQuickCapture({ text: text, tags: tags });
    }
    textEl.value = '';
    tagsEl.value = '';
  }

  function cancel() {
    if (window.api && window.api.cancelQuickCapture) window.api.cancelQuickCapture();
    textEl.value = '';
    tagsEl.value = '';
  }

  saveBtn.onclick = submit;
  cancelBtn.onclick = cancel;
  textEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  tagsEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  setTimeout(function () { textEl.focus(); }, 30);
})();
