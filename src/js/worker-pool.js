/* A tiny Worker pool with a guaranteed fallback.
   Tries a real file Worker, then a blob Worker (file:// safe), then runs the
   same pure function synchronously. Callers never need to care which one. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};

  function coarseFromSamples(samples, cell) {
    var map = new Map();
    for (var i = 0; i < samples.length; i++) {
      var s = samples[i];
      var x1 = s[0], y1 = s[1], x2 = s[2], y2 = s[3];
      var key = Math.floor((x1 + x2) / 2 / cell) + ',' + Math.floor((y1 + y2) / 2 / cell);
      var c = map.get(key);
      if (!c) map.set(key, { key: key, x1: x1, y1: y1, x2: x2, y2: y2, count: 1 });
      else {
        if (x1 < c.x1) c.x1 = x1;
        if (y1 < c.y1) c.y1 = y1;
        if (x2 > c.x2) c.x2 = x2;
        if (y2 > c.y2) c.y2 = y2;
        c.count++;
      }
    }
    var out = [];
    map.forEach(function (c) { out.push(c); });
    return out;
  }

  var WORKER_SRC =
    'var coarseFromSamples = ' + coarseFromSamples.toString() + ';\n' +
    'self.onmessage = function (e) { var d = e.data || {}; var out = null;' +
    ' if (d.task === "coarse") out = { cells: coarseFromSamples(d.payload.samples, d.payload.cell) };' +
    ' self.postMessage({ id: d.id, result: out }); };';

  var worker = null;
  var mode = 'sync';
  var tried = false;
  var seq = 0;
  var pending = {};

  function settle(id, result) {
    var fn = pending[id];
    if (!fn) return;
    delete pending[id];
    fn(result);
  }

  function attach(w) {
    worker = w;
    mode = 'worker';
    w.onmessage = function (e) { settle(e.data && e.data.id, e.data && e.data.result); };
    w.onerror = function () {
      try { w.terminate(); } catch (err) { /* ignore */ }
      worker = null;
      mode = 'sync';
      Object.keys(pending).forEach(function (k) { settle(k, null); });
    };
  }

  function init() {
    if (tried) return;
    tried = true;
    if (typeof window.Worker !== 'function') return;
    try {
      attach(new window.Worker('js/layout-worker.js'));
      return;
    } catch (e) { /* file:// origins often reject this */ }
    try {
      if (!window.Blob || !window.URL || !window.URL.createObjectURL) return;
      var blob = new window.Blob([WORKER_SRC], { type: 'application/javascript' });
      var url = window.URL.createObjectURL(blob);
      var w = new window.Worker(url);
      try { window.URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
      attach(w);
    } catch (e) {
      worker = null;
      mode = 'sync';
    }
  }

  function run(task, payload) {
    init();
    if (mode !== 'worker' || !worker) {
      return Promise.resolve(task === 'coarse' ? { cells: coarseFromSamples(payload.samples, payload.cell) } : null);
    }
    return new Promise(function (resolve) {
      var id = ++seq;
      pending[id] = resolve;
      try {
        worker.postMessage({ id: id, task: task, payload: payload });
      } catch (e) {
        delete pending[id];
        resolve(task === 'coarse' ? { cells: coarseFromSamples(payload.samples, payload.cell) } : null);
      }
    });
  }

  CC.workers = {
    run: run,
    mode: function () { init(); return mode; },
    coarseSync: coarseFromSamples
  };
})();
