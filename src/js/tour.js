/* First-run 3-step tour: teaches "corpus is the source, map is just a view".
   Inline banner on the home page; never blocks editing. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };
  var step = 0;
  var STEPS = ['tour.s1', 'tour.s2', 'tour.s3'];

  function done() {
    var meta = S.state().meta;
    meta.onboarded = true;
    S.saveSoon();
  }

  function mount(host) {
    if (!host) return;
    var meta = S.state().meta || {};
    if (meta.onboarded) { host.hidden = true; return; }
    host.hidden = false;
    step = 0;
    paint(host);
  }

  function paint(host) {
    host.innerHTML =
      '<div class="tour-step"><span class="tour-n">' + (step + 1) + ' / 3</span>' +
        '<p>' + U.esc(t(STEPS[step])) + '</p>' +
        '<div class="tour-actions">' +
          '<button class="mini-btn" data-tour="skip">' + U.esc(t('tour.skip')) + '</button>' +
          (step > 0 ? '<button class="mini-btn" data-tour="prev">' + U.esc(t('tour.prev')) + '</button>' : '') +
          '<button class="btn sm" data-tour="next">' + U.esc(step === 2 ? t('tour.finish') : t('tour.next')) + '</button>' +
          (step === 2 ? '<button class="btn ghost sm" data-tour="demo">' + U.esc(t('demo.load')) + '</button>' : '') +
        '</div></div>';
    host.querySelector('[data-tour="skip"]').onclick = function () { done(); host.hidden = true; };
    var prev = host.querySelector('[data-tour="prev"]');
    if (prev) prev.onclick = function () { step--; paint(host); };
    host.querySelector('[data-tour="next"]').onclick = function () {
      if (step === 2) { done(); host.hidden = true; }
      else { step++; paint(host); }
    };
    var demo = host.querySelector('[data-tour="demo"]');
    if (demo) demo.onclick = function () { if (CC.demo) CC.demo.load(); };
  }

  CC.tour = { mount: mount };
})();
