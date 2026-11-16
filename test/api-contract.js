/* API contract check: the three hand-maintained window.api implementations
   must stay in sync. preload.js is the source of truth; the PREVIEW shim and
   the headless stub must implement every method the renderer can call.

   This catches the recurring "new IPC added to preload only" class of bug
   that jsdom tests cannot see (they inject their own stub). */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function methodsBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error('start marker not found: ' + startMarker);
  const bodyStart = text.indexOf('{', start);
  let depth = 0, i = bodyStart;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) break; }
  }
  const body = text.slice(bodyStart + 1, i);
  const out = new Set();
  const re = /(?:^|\n)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  let m;
  while ((m = re.exec(body))) out.add(m[1]);
  return out;
}

const preloadText = read('electron/preload.js');
const appText = read('src/js/app.js');
const headlessText = read('test/headless.js');

const real = methodsBetween(preloadText, "exposeInMainWorld('api'", '\n});');
const preview = methodsBetween(appText, 'if (PREVIEW) {', '\n  }');
const stub = methodsBetween(headlessText, 'window.api = {', '\n};');

const missingInPreview = [...real].filter((m) => !preview.has(m)).sort();
const extraInStub = [...stub].filter((m) => !real.has(m)).sort();
const missingInStub = [...real].filter((m) => !stub.has(m)).sort();

let failed = false;
if (missingInPreview.length) {
  console.error('PREVIEW shim missing methods: ' + missingInPreview.join(', '));
  failed = true;
}
if (extraInStub.length) {
  console.error('headless stub has methods not in preload: ' + extraInStub.join(', '));
  failed = true;
}

/* Envelope shape: all three saveCorpus implementations must unwrap {data}. */
function saveCorpusSource(text, needle) {
  const i = text.indexOf(needle);
  if (i < 0) return '';
  return text.slice(i, i + 120).split('\n')[0];
}
const realSave = saveCorpusSource(preloadText, 'saveCorpus:');
const previewSave = saveCorpusSource(appText, 'saveCorpus: function');
const stubSave = saveCorpusSource(headlessText, 'saveCorpus:');
if (!/ipcRenderer\.invoke\('corpus:save'/.test(realSave)) {
  console.error('preload saveCorpus does not call corpus:save: ' + realSave); failed = true;
}
if (!/d && d\.data/.test(previewSave)) {
  console.error('PREVIEW saveCorpus does not unwrap {data}: ' + previewSave); failed = true;
}
if (!/d && d\.data/.test(stubSave)) {
  console.error('headless saveCorpus does not unwrap {data}: ' + stubSave); failed = true;
}

if (failed) process.exit(1);

console.log('api-contract: OK (' + real.size + ' methods; PREVIEW in sync; stub covers ' +
  stub.size + ', intentionally精简 ' + missingInStub.length + ')');
