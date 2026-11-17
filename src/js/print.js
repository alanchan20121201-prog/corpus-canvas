/* A4 print: lay the map out on paper-sized pages.
   The map is tiled into A4 landscape pages (297mm x 210mm), each page
   rendered as its own SVG, then handed to the browser's print dialog. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util;
  var t = function () { return window.t.apply(null, arguments); };

  var PAGE_W_MM = 297;      /* A4 landscape */
  var PAGE_H_MM = 210;
  var MARGIN_MM = 10;
  var MAX_PAGES = 24;      /* a hard stop so a huge map cannot hang the printer */

  var host = null;
  var lastSceneName = '';

  /* 1mm expressed in the SVG user unit we print with */
  var UNIT = 4;            /* 4 user units per mm -> 1188 units wide */

  function pageW() { return (PAGE_W_MM - MARGIN_MM * 2) * UNIT; }
  function pageH() { return (PAGE_H_MM - MARGIN_MM * 2) * UNIT; }

  function close() {
    if (host) { host.remove(); host = null; }
    document.body.classList.remove('printing');
  }

  function build() {
    var scene = CC.graph.sceneForPrint ? CC.graph.sceneForPrint() : null;
    if (!scene || !scene.nodes || !scene.nodes.length) {
      U.toast(t('print.noMap'));
      return false;
    }

    lastSceneName = scene.mapName || '';
    var nodes = scene.nodes;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(function (n) {
      minX = Math.min(minX, n.x - n.w / 2);
      maxX = Math.max(maxX, n.x + n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2);
      maxY = Math.max(maxY, n.y + n.h / 2);
    });
    if (!isFinite(minX)) { U.toast(t('print.noMap')); return false; }

    /* scale so the whole map fits the printed area of one page, unless the
       map is bigger than one page, in which case we tile it */
    var contentW = maxX - minX;
    var contentH = maxY - minY;
    var cols = Math.max(1, Math.ceil(contentW / pageW()));
    var rows = Math.max(1, Math.ceil(contentH / pageH()));
    var total = cols * rows;
    if (total > MAX_PAGES) {
      cols = Math.max(1, Math.ceil(Math.sqrt(MAX_PAGES * contentW / Math.max(1, contentH))));
      rows = Math.max(1, Math.ceil(MAX_PAGES / cols));
      total = cols * rows;
    }

    var scale = Math.min(pageW() / Math.max(1, contentW / cols), pageH() / Math.max(1, contentH / rows));

    host = document.createElement('div');
    host.className = 'print-root';
    host.innerHTML = pagesMarkup(scene, minX, minY, cols, rows, scale);
    document.body.appendChild(host);
    document.body.classList.add('printing');
    return true;
  }

  function pagesMarkup(scene, minX, minY, cols, rows, scale) {
    var out = [];
    var pw = pageW(), ph = pageH();
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var ox = minX + c * (pw / scale);
        var oy = minY + r * (ph / scale);
        out.push('<section class="print-page" style="width:' + PAGE_W_MM + 'mm;height:' + PAGE_H_MM + 'mm">');
        out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + pw + '" height="' + ph + '" viewBox="0 0 ' + pw + ' ' + ph + '">');
        out.push('<g transform="scale(' + scale + ') translate(' + (-ox) + ',' + (-oy) + ')">');
        out.push(sceneMarkup(scene, ox, oy, pw / scale, ph / scale));
        out.push('</g></svg>');
        out.push('<div class="print-footer">' + U.esc(scene.mapName || '') + ' · ' + (r * cols + c + 1) + ' / ' + (rows * cols) + '</div>');
        out.push('</section>');
      }
    }
    return out.join('');
  }

  function sceneMarkup(scene, ox, oy, w, h) {
    var out = [];
    var visible = function (n) {
      return !(n.x + n.w / 2 < ox || n.x - n.w / 2 > ox + w || n.y + n.h / 2 < oy || n.y - n.h / 2 > oy + h);
    };
    (scene.edges || []).forEach(function (e) {
      if (!e.d) return;
      var style = e.style || {};
      var dash = style.dash === 'dashed' ? ' stroke-dasharray="6 4"' : style.dash === 'dotted' ? ' stroke-dasharray="1.5 4"' : '';
      out.push('<path d="' + e.d + '" fill="none" stroke="' + (e.color || '#8a8a80') + '" stroke-width="' + (style.width === 'thick' ? 2.6 : style.width === 'thin' ? 1 : 1.6) + '"' + dash + '/>');
      if (e.arrow && style.arrow !== 'none') {
        out.push('<path d="' + e.arrow + '" fill="none" stroke="' + (e.color || '#8a8a80') + '" stroke-width="1.6"/>');
      }
    });
    scene.nodes.forEach(function (n) {
      if (!visible(n)) return;
      var rx = n.shape === 'rect' ? 4 : n.shape === 'pill' ? n.h / 2 : 13;
      var x = n.x - n.w / 2, y = n.y - n.h / 2;
      out.push('<g transform="translate(' + x + ',' + y + ')">');
      out.push('<rect width="' + n.w + '" height="' + n.h + '" rx="' + rx + '" fill="' + (n.fill || '#ffffff') + '" stroke="#d8d4c8" stroke-width="1"/>');
      var ty = n.titleY || 10 + Math.round(n.fs * 1.2);
      (n.lines || []).forEach(function (line) {
        out.push('<text x="15" y="' + ty + '" style="font-size:' + n.fs + 'px;font-weight:600;fill:#23201b">' + U.esc(line) + '</text>');
        ty += n.lineH;
      });
      if (n.summary) {
        out.push('<text x="15" y="' + (ty + 12) + '" style="font-size:10.5px;fill:#6b655c">' + U.esc(String(n.summary).slice(0, 60)) + '</text>');
      }
      if (n.picSrc && n.picH) {
        var pw = n.w - 28, phh = Math.min(n.picH, n.h - 12);
        var py = Math.min(n.picY || (n.h - phh - 8), n.h - phh - 8);
        out.push('<image x="14" y="' + py + '" width="' + pw + '" height="' + phh +
          '" preserveAspectRatio="xMidYMid slice" xlink:href="' + U.esc(n.picSrc) + '" href="' + U.esc(n.picSrc) + '"/>');
      }
      out.push('</g>');
    });
    return out.join('');
  }

  function print() {
    if (!build()) return;
    var done = function () { close(); };
    window.addEventListener('afterprint', done, { once: true });
    setTimeout(function () {
      window.print();
      /* some environments never fire afterprint, so clean up anyway */
      setTimeout(done, 1500);
    }, 60);
  }

  function exportPdf() {
    if (!build()) { U.toast(t('print.noMap'), 'bad'); return; }
    var css = '@page{size:A4 landscape;margin:0}' +
      'html,body{margin:0;padding:0;background:#fff}' +
      '.print-page{page-break-after:always;break-after:page;position:relative;overflow:hidden;box-sizing:border-box;padding:0}' +
      '.print-page:last-child{page-break-after:auto;break-after:auto}' +
      '.print-page svg{display:block}' +
      '.print-footer{position:absolute;bottom:4mm;right:8mm;font:9px sans-serif;color:#888}';
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' +
      host.innerHTML + '</body></html>';
    var baseName = (lastSceneName || 'map').replace(/[\\/:*?"<>|]/g, '_');
    var suggested = baseName + '.pdf';
    if (window.api && window.api.exportPdf) {
      window.api.exportPdf({ html: html, suggested: suggested }).then(function (r) {
        if (r && r.ok) U.toast(t('map.exportDone', { path: r.path }), 'ok');
        else if (r && r.error) U.toast(t('map.exportFail', { msg: r.error }), 'bad');
      });
    }
    close();
  }

  CC.print = { print: print, close: close, exportPdf: exportPdf, isOpen: function () { return !!host; } };
})();
