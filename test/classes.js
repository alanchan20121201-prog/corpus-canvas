const fs = require('fs');
const path = require('path');
const css = fs.readFileSync('src/css/app.css', 'utf8');
const cssClasses = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map(m => m[1]));
const used = new Set();
const files = fs.readdirSync('src/js').map(f => 'src/js/' + f).concat(['src/index.html']);
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/class="([^"$]+)"/g)) {
    m[1].split(/\s+/).forEach(c => { if (/^[a-zA-Z][\w-]*$/.test(c)) used.add(c); });
  }
  for (const m of s.matchAll(/class='([^'$]+)'/g)) {
    m[1].split(/\s+/).forEach(c => { if (/^[a-zA-Z][\w-]*$/.test(c)) used.add(c); });
  }
}
const missing = [...used].filter(c => !cssClasses.has(c)).sort();
console.log('classes used:', used.size);
console.log('without css rule:', missing.join(', ') || '(none)');
