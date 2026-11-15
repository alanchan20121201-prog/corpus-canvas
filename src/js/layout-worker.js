/* Web Worker: heavy, pure layout/index math off the main thread.
   Loaded via new Worker('js/layout-worker.js'); worker-pool.js falls back to
   an inline blob worker and then to a synchronous implementation when Workers
   are unavailable (e.g. jsdom tests or file:// origin restrictions). */
'use strict';

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

if (typeof self !== 'undefined' && self.postMessage) {
  self.onmessage = function (e) {
    var d = e.data || {};
    var result = null;
    if (d.task === 'coarse') {
      result = { cells: coarseFromSamples(d.payload.samples, d.payload.cell) };
    }
    self.postMessage({ id: d.id, result: result });
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { coarseFromSamples: coarseFromSamples };
