/* Minimal Markdown -> safe HTML for card body preview.
   Always escape first, then apply whitelist inline/line transforms. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util;

  function inline(s) {
    s = U.esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\[\[([^\]]+)\]\]/g, '<a class="wiki-link" data-wiki="$1">$1</a>');
    return s;
  }

  function render(src) {
    var lines = String(src == null ? '' : src).split(/\r?\n/);
    var out = [], i = 0;
    while (i < lines.length) {
      var line = lines[i];
      /* fenced code block */
      if (/^\s*```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        out.push('<pre><code>' + U.esc(code.join('\n')) + '</code></pre>');
        continue;
      }
      /* headings */
      var h = /^(#{1,3})\s+(.*)$/.exec(line);
      if (h) { out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue; }
      /* unordered list */
      if (/^\s*[-*]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push('<li>' + inline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>');
          i++;
        }
        out.push('<ul>' + items.join('') + '</ul>');
        continue;
      }
      /* blank line */
      if (!line.trim()) { i++; continue; }
      /* paragraph: join consecutive plain lines */
      var para = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|\s*[-*]\s)/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
    return out.join('\n');
  }

  CC.md = { render: render };
})();
