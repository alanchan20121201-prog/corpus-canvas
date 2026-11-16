'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, net, globalShortcut } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const zlib = require('node:zlib');
const aiClient = require('./ai-client');
const corpusStore = require('./corpus-store');
const { writeZip } = require('./zip-writer');

const SMOKE = process.argv.includes('--smoke');
const dbgFile = path.join(require('node:os').tmpdir(), 'corpus-canvas-debug.log');
function dbg(msg) {
  if (!process.env.CC_DEBUG) return;
  try { require('node:fs').appendFileSync(dbgFile, new Date().toISOString() + ' ' + msg + '\n'); } catch (e) { /* ignore */ }
}
dbg('main start ' + process.argv.join(' '));
const isDev = !app.isPackaged;

let win = null;
const userDir = app.getPath('userData');
const securePath = path.join(userDir, 'secure.json');          /* device-wide */
const aiLedgerPath = path.join(userDir, 'ai-ledger.json');    /* device-wide */
const librariesPath = path.join(userDir, 'libraries.json');   /* device-wide manifest */
const FORMAT_VERSION = 2;

/* Each library owns its own corpus, shards, backups, attachments and layout
   cache. The 'default' library maps to the ORIGINAL root-level files, so
   upgrading never moves, renames or rewrites existing data. */
function pathsFor(id) {
  const root = (!id || id === 'default')
    ? userDir
    : path.join(userDir, 'libraries', String(id).replace(/[^a-zA-Z0-9_-]/g, ''));
  return {
    id: id || 'default',
    root: root,
    corpusPath: path.join(root, 'corpus.json'),
    backupDir: path.join(root, 'backups'),
    layoutDir: path.join(root, 'layout-cache'),
    attachDir: path.join(root, 'attachments')
  };
}

function readLibraries() {
  let m = null;
  try { m = JSON.parse(fs.readFileSync(librariesPath, 'utf8')); } catch (e) { /* fresh install */ }
  if (!m || !Array.isArray(m.libraries) || !m.libraries.length) {
    try { if (fs.existsSync(librariesPath)) fs.copyFileSync(librariesPath, librariesPath + '.bak'); } catch (e) { /* ignore */ }
    const found = [];
    try {
      for (const d of fs.readdirSync(path.join(userDir, 'libraries'), { withFileTypes: true })) {
        if (d.isDirectory() && /^lib-/.test(d.name)) found.push({ id: d.name, name: d.name, createdAt: Date.now() });
      }
    } catch (e) { /* ignore */ }
    m = { version: 1, activeId: 'default', libraries: [{ id: 'default', name: 'Default', createdAt: Date.now() }].concat(found) };
    try {
      fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(librariesPath, JSON.stringify(m, null, 2), 'utf8');
    } catch (e) { /* ignore */ }
  }
  if (!m.libraries.some((l) => l.id === m.activeId)) m.activeId = 'default';
  return m;
}

let libManifest = readLibraries();
let active = pathsFor(libManifest.activeId);

function activeName() {
  const hit = libManifest.libraries.find((l) => l.id === libManifest.activeId);
  return hit ? hit.name : 'Default';
}

function saveLibraries() { return writeJsonAtomic(librariesPath, libManifest); }

function layoutFile(id) {
  const safe = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return safe ? path.join(active.layoutDir, safe + '.json') : null;
}

async function autoBackup() {
  try {
    const data = await corpusStore.assembled(userDir, active.corpusPath);
    if (!data || !Array.isArray(data.cards) || !data.cards.length) return;
    await fsp.mkdir(active.backupDir, { recursive: true });
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = 'corpus-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '-' + pad(d.getMilliseconds()) + '.json';
    await fsp.writeFile(path.join(active.backupDir, name), JSON.stringify(data), 'utf8');
    const files = (await fsp.readdir(active.backupDir)).filter((f) => /^corpus-\d{8}-\d{6}\.json$/.test(f)).sort();
    while (files.length > 10) await fsp.rm(path.join(active.backupDir, files.shift()), { force: true });
  } catch (e) { /* ignore */ }
}
const statePath = path.join(userDir, 'window.json');
let quickWin = null;

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

async function readJson(file) {
  try {
    const raw = await fsp.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function writeJsonAtomic(file, obj) {
  const tmp = file + '.tmp';
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(tmp, JSON.stringify(obj), 'utf8');
  await fsp.rename(tmp, file);
}

function readWindowState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { width: 1360, height: 880 };
  }
}

function saveWindowState() {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds();
  try {
    fs.writeFileSync(statePath, JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* minimal zip reader (for .xmind)                                     */
/* ------------------------------------------------------------------ */

const MAX_UNCOMPRESSED = 64 * 1024 * 1024;   /* 64 MB: zip-bomb guard */

function zipEntries(buf) {
  let eocd = -1;
  const stop = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= stop; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip archive');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    if (off + 46 + nameLen > buf.length) break;
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    if (compSize > MAX_UNCOMPRESSED || localOff + 30 > buf.length) continue;
    const lnameLen = buf.readUInt16LE(localOff + 26);
    const lextraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lnameLen + lextraLen;
    if (dataStart + compSize > buf.length) continue;
    out[name] = { method, data: buf.subarray(dataStart, dataStart + compSize) };
    off += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function zipRead(entry) {
  if (!entry) return null;
  if (entry.method === 0) return entry.data.length <= MAX_UNCOMPRESSED ? entry.data : null;
  const out = zlib.inflateRawSync(entry.data, { maxOutputLength: MAX_UNCOMPRESSED });
  return out.length <= MAX_UNCOMPRESSED ? out : null;
}

/* ------------------------------------------------------------------ */
/* secure key storage                                                  */
/* ------------------------------------------------------------------ */

function canEncrypt() {
  try { return safeStorage.isEncryptionAvailable(); } catch { return false; }
}

async function saveKey(apiKey) {
  if (!apiKey) {
    await fsp.rm(securePath, { force: true });
    return { ok: true, cleared: true };
  }
  const payload = canEncrypt()
    ? { enc: true, value: safeStorage.encryptString(apiKey).toString('base64') }
    : { enc: false, value: Buffer.from(apiKey, 'utf8').toString('base64') };
  await writeJsonAtomic(securePath, payload);
  return { ok: true, encrypted: payload.enc };
}

async function loadKey() {
  const raw = await readJson(securePath);
  if (!raw || !raw.value) return '';
  try {
    if (raw.enc) return safeStorage.decryptString(Buffer.from(raw.value, 'base64'));
    return Buffer.from(raw.value, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/* window                                                              */
/* ------------------------------------------------------------------ */

function createWindow() {
  const st = readWindowState();
  win = new BrowserWindow({
    width: st.width || 1360,
    height: st.height || 880,
    x: st.x,
    y: st.y,
    minWidth: 1024,
    minHeight: 660,
    show: false,
    backgroundColor: '#f6f4ef',
    autoHideMenuBar: true,
    title: 'Corpus Canvas',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      sandbox: false
    }
  });
  win.setMenu(null);
  if (st.maximized) win.maximize();
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'), { query: SMOKE ? { smoke: '1' } : {} });

  win.once('ready-to-show', () => { dbg('ready-to-show'); if (!SMOKE) win.show(); });
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    dbg('console[' + level + '] ' + message + ' @' + sourceId + ':' + line);
  });
  win.webContents.on('render-process-gone', (_e, details) => dbg('render gone ' + JSON.stringify(details)));
  win.webContents.on('did-fail-load', (_e, code, desc, url) => dbg('fail load ' + code + ' ' + desc + ' ' + url));
  win.webContents.on('did-finish-load', () => dbg('did-finish-load'));
  dbg('window created');
  win.on('close', saveWindowState);
  win.on('closed', () => {
    win = null;
    if (quickWin) { try { quickWin.destroy(); } catch (e) { /* ignore */ } quickWin = null; }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && !SMOKE) {
    win.webContents.on('before-input-event', (ev, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') win.webContents.toggleDevTools();
    });
  }
}

function createQuickWindow() {
  if (quickWin && !quickWin.isDestroyed()) { quickWin.show(); quickWin.focus(); return; }
  quickWin = new BrowserWindow({
    width: 420, height: 210,
    frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: true,
    show: false, backgroundColor: '#f6f4ef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  });
  quickWin.setMenu(null);
  quickWin.loadFile(path.join(__dirname, '..', 'src', 'quick.html'));
  quickWin.once('ready-to-show', function () { if (quickWin) { quickWin.show(); quickWin.focus(); } });
  quickWin.on('blur', function () { if (quickWin && !quickWin.isDestroyed()) quickWin.hide(); });
}

function showQuickCapture() {
  if (!win || win.isDestroyed()) return;
  createQuickWindow();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(async () => {
    await autoBackup();
    createWindow();
    const ok = globalShortcut.register('Ctrl+Shift+Space', showQuickCapture);
    if (!ok) dbg('global shortcut Ctrl+Shift+Space unavailable');
  });
}

app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

/* ------------------------------------------------------------------ */
/* ipc                                                                 */
/* ------------------------------------------------------------------ */

ipcMain.handle('app:info', async () => ({
  version: app.getVersion(),
  userDir,
  corpusPath: active.corpusPath,
  libraryId: active.id,
  libraryName: activeName(),
  libraries: libManifest.libraries.map((l) => ({ id: l.id, name: l.name, createdAt: l.createdAt || 0 })),
  platform: process.platform,
  encrypted: canEncrypt(),
  dev: isDev,
  locale: app.getLocale(),
  systemLanguages: (() => { try { return app.getPreferredSystemLanguages(); } catch (e) { return []; } })()
}));

ipcMain.handle('corpus:load', async () => corpusStore.load(userDir, active.corpusPath));

ipcMain.handle('layout:read', async (_e, id) => {
  const file = layoutFile(id);
  if (!file) return { ok: false };
  try {
    const text = await fsp.readFile(file, 'utf8');
    return { ok: true, data: JSON.parse(text) };
  } catch (e) { return { ok: false }; }
});

ipcMain.handle('layout:write', async (_e, id, data) => {
  const file = layoutFile(id);
  if (!file) return { ok: false };
  try {
    await fsp.mkdir(active.layoutDir, { recursive: true });
    await writeJsonAtomic(file, data);
    return { ok: true };
  } catch (e) { return { ok: false }; }
});

ipcMain.handle('layout:clear', async (_e, id) => {
  const file = layoutFile(id);
  if (!file) return { ok: false };
  try { await fsp.rm(file, { force: true }); return { ok: true }; } catch (e) { return { ok: false }; }
});

ipcMain.handle('backup:list', async () => {
  try {
    const files = (await fsp.readdir(active.backupDir)).filter((f) => /^corpus-\d{8}-\d{6}(?:-\d{3})?\.json$/.test(f)).sort().reverse();
    const out = [];
    for (const f of files.slice(0, 10)) {
      const st = await fsp.stat(path.join(active.backupDir, f));
      out.push({ name: f, at: st.mtimeMs, size: st.size });
    }
    return { ok: true, items: out };
  } catch (e) { return { ok: true, items: [] }; }
});

ipcMain.handle('backup:snapshot', async () => {
  /* write a timestamped backup of the current corpus, used as a safety net
     before destructive actions (clear-all, restore) */
  try {
    const data = await corpusStore.assembled(userDir, active.corpusPath);
    if (!data || !Array.isArray(data.cards)) return { ok: false, error: 'empty' };
    await fsp.mkdir(active.backupDir, { recursive: true });
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = 'corpus-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '-' + pad(d.getMilliseconds()) + '.json';
    await fsp.writeFile(path.join(active.backupDir, name), JSON.stringify(data), 'utf8');
    return { ok: true, name: name };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

ipcMain.handle('backup:restore', async (_e, name) => {
  if (!/^corpus-\d{8}-\d{6}(?:-\d{3})?\.json$/.test(String(name || ''))) return { ok: false, error: 'bad name' };
  const file = path.join(active.backupDir, name);
  let data;
  try { data = JSON.parse(await fsp.readFile(file, 'utf8')); }
  catch (e) { return { ok: false, error: 'invalid' }; }
  if (!data || !Array.isArray(data.cards) || !Array.isArray(data.maps)) return { ok: false, error: 'invalid' };
  if (data.formatVersion != null && Number(data.formatVersion) > FORMAT_VERSION) return { ok: false, error: 'version' };
  try {
    /* go through the store so a large restore is re-sharded into THIS
       library's shard dir instead of leaving orphan shards behind */
    await corpusStore.save(userDir, active.corpusPath, data);
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

ipcMain.handle('corpus:save', async (_e, payload) => {
  /* renderer may be mid-reload with a stale in-memory db; never let it write
     one library's data into another library's path */
  if (payload && payload.libraryId && String(payload.libraryId) !== String(active.id)) {
    return { ok: false, error: 'library-changed' };
  }
  const data = payload && payload.data ? payload.data : payload;
  return corpusStore.save(userDir, active.corpusPath, data);
});

ipcMain.handle('corpus:stats', async () => {
  const sharded = await corpusStore.isSharded(active.corpusPath);
  const raw = await readJson(active.corpusPath);
  return { ok: true, sharded: sharded, shards: sharded && raw && raw.__shards ? raw.__shards.length : 0, cards: raw && raw.__shards ? raw.__shards.reduce((a, x) => a + x.count, 0) : (raw && raw.cards ? raw.cards.length : 0) };
});

ipcMain.handle('corpus:reveal', async () => {
  shell.showItemInFolder(active.corpusPath);
  return { ok: true };
});

/* ------------------------------------------------------------------ */
/* libraries                                                          */
/* ------------------------------------------------------------------ */

ipcMain.handle('library:list', async () => {
  const items = [];
  for (const l of libManifest.libraries) {
    const p = pathsFor(l.id);
    let cards = 0;
    try {
      const raw = await readJson(p.corpusPath);
      cards = raw && raw.__shards ? raw.__shards.reduce((a, x) => a + x.count, 0)
        : (raw && raw.cards ? raw.cards.length : 0);
    } catch (e) { /* ignore */ }
    items.push({ id: l.id, name: l.name, createdAt: l.createdAt || 0, cards: cards, corpusPath: p.corpusPath });
  }
  return { ok: true, activeId: libManifest.activeId, items: items };
});

ipcMain.handle('library:create', async (_e, payload) => {
  const name = String((payload && payload.name) || '').trim().slice(0, 60) || 'New library';
  const id = 'lib-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const p = pathsFor(id);
  try {
    await fsp.mkdir(p.root, { recursive: true });
    libManifest.libraries.push({ id: id, name: name, createdAt: Date.now() });
    await saveLibraries();
    return { ok: true, id: id, name: name };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

ipcMain.handle('library:switch', async (_e, payload) => {
  const id = String((payload && payload.id) || '');
  if (!libManifest.libraries.some((l) => l.id === id)) return { ok: false, error: 'not found' };
  /* snapshot the library we are leaving while its paths are still active */
  await autoBackup();
  const oldPath = active.corpusPath;
  libManifest.activeId = id;
  await saveLibraries();
  active = pathsFor(id);
  corpusStore.forget(oldPath);
  for (const hit of activeChats.values()) { try { hit.ctrl.abort(); } catch (e) { /* ignore */ } }
  return { ok: true, activeId: id };
});

ipcMain.handle('library:rename', async (_e, payload) => {
  const id = String((payload && payload.id) || '');
  const name = String((payload && payload.name) || '').trim().slice(0, 60);
  const hit = libManifest.libraries.find((l) => l.id === id);
  if (!hit || !name) return { ok: false, error: 'invalid' };
  hit.name = name;   /* only the label changes; the directory stays put */
  await saveLibraries();
  return { ok: true };
});

ipcMain.handle('library:delete', async (_e, payload) => {
  const id = String((payload && payload.id) || '');
  if (id === 'default') return { ok: false, error: 'default' };
  const idx = libManifest.libraries.findIndex((l) => l.id === id);
  if (idx < 0) return { ok: false, error: 'not found' };
  const p = pathsFor(id);
  try {
    /* keep a recoverable copy instead of a hard delete */
    const trash = path.join(userDir, '.trash', id + '-' + Date.now());
    await fsp.mkdir(path.dirname(trash), { recursive: true });
    try { await fsp.rename(p.root, trash); }
    catch (e) { return { ok: false, error: 'busy' }; }
    corpusStore.forget(p.corpusPath);
    libManifest.libraries.splice(idx, 1);
    if (libManifest.activeId === id) {
      libManifest.activeId = 'default';
      active = pathsFor('default');
      await saveLibraries();
      return { ok: true, switched: true };
    }
    await saveLibraries();
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

ipcMain.handle('key:get', async () => ({ key: await loadKey(), encrypted: canEncrypt() }));
ipcMain.handle('key:set', async (_e, key) => saveKey(key));
ipcMain.handle('key:clear', async () => { await fsp.rm(securePath, { force: true }); return { ok: true }; });

ipcMain.handle('backup:export', async (_e, payload) => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const res = await dialog.showSaveDialog(win, {
    title: 'Export backup',
    defaultPath: path.join(app.getPath('documents'), `corpus-canvas-${stamp}.wef`),
    filters: [{ name: 'Corpus Canvas backup', extensions: ['wef', 'json'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  await fsp.writeFile(res.filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { ok: true, path: res.filePath };
});

ipcMain.handle('backup:export-bundle', async (_e, payload) => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const res = await dialog.showSaveDialog(win, {
    title: 'Export bundle',
    defaultPath: path.join(app.getPath('documents'), `corpus-canvas-${stamp}.wefz`),
    filters: [{ name: 'Corpus Canvas bundle', extensions: ['wefz'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  try {
    const entries = [{ name: 'corpus.json', data: Buffer.from(JSON.stringify(payload, null, 2), 'utf8') }];
    const cards = (payload && payload.data && payload.data.cards) || [];
    const seen = {};
    for (const c of cards) {
      for (const a of (c.attachments || [])) {
        if (!a || !a.id || seen[a.id]) continue;
        seen[a.id] = 1;
        const file = await attachFile(a.id);
        if (file) entries.push({ name: 'attachments/' + path.basename(file), data: await fsp.readFile(file) });
      }
    }
    await fsp.writeFile(res.filePath, writeZip(entries));
    return { ok: true, path: res.filePath, attachments: Object.keys(seen).length };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

ipcMain.handle('backup:import-bundle', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Import bundle',
    properties: ['openFile'],
    filters: [{ name: 'Corpus Canvas bundle', extensions: ['wefz'] }]
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  try {
    const buf = await fsp.readFile(res.filePaths[0]);
    const z = zipEntries(buf);
    const corpusEntry = zipRead(z['corpus.json']);
    if (!corpusEntry) return { ok: false, error: 'invalid bundle' };
    const payload = JSON.parse(corpusEntry.toString('utf8'));
    const names = Object.keys(z).filter((k) => k.indexOf('attachments/') === 0 && /\.[a-zA-Z0-9]+$/.test(k));
    await fsp.mkdir(active.attachDir, { recursive: true });
    let restored = 0;
    for (const name of names) {
      const base = path.basename(name);
      if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(base)) continue;   /* path traversal guard */
      const data = zipRead(z[name]);
      if (!data || data.length > ATTACH_MAX) continue;
      await fsp.writeFile(path.join(active.attachDir, base), data);
      restored++;
    }
    return { ok: true, data: payload, attachments: restored, name: path.basename(res.filePaths[0]) };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

ipcMain.handle('backup:import', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Import backup',
    properties: ['openFile'],
    filters: [{ name: 'Corpus Canvas backup', extensions: ['wef', 'json'] }]
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  try {
    const raw = await fsp.readFile(res.filePaths[0], 'utf8');
    return { ok: true, data: JSON.parse(raw), name: path.basename(res.filePaths[0]) };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

const xmindBuffers = new Map();   /* temp buffer store for attachment extraction */

ipcMain.handle('file:extract-xmind-attachments', async (_e, paths) => {
  const list = Array.isArray(paths) ? paths : [];
  if (!list.length) return { ok: true, items: [] };
  const buf = xmindBuffers.get('last');
  if (!buf) return { ok: false, error: 'no xmind buffer' };
  const z = zipEntries(buf);
  await fsp.mkdir(active.attachDir, { recursive: true });
  const items = [];
  for (const p of list) {
    const key = Object.keys(z).find((k) => k === p || k.endsWith('/' + p) || p.endsWith(k));
    const entry = key ? z[key] : null;
    if (!entry) continue;
    const data = zipRead(entry);
    if (!data || data.length > ATTACH_MAX) continue;
    const ext = path.extname(p).toLowerCase();
    const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await fsp.writeFile(path.join(active.attachDir, id + ext), data);
    items.push({ path: p, id, ext, mime: MIME_BY_EXT[ext] || 'application/octet-stream', size: data.length });
  }
  xmindBuffers.delete('last');
  return { ok: true, items: items };
});

ipcMain.handle('file:import-dialog', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Import',
    properties: ['openFile'],
    filters: [
      { name: 'Mind map / outline', extensions: ['xmind', 'opml', 'md', 'markdown', 'txt'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  const file = res.filePaths[0];
  const ext = path.extname(file).toLowerCase();
  try {
    if (ext === '.xmind') {
      const buf = await fsp.readFile(file);
      xmindBuffers.set('last', buf);
      const z = zipEntries(buf);
      const jsonEntry = zipRead(z['content.json']);
      const xmlEntry = zipRead(z['content.xml']);
      return {
        ok: true,
        kind: 'xmind',
        name: path.basename(file, ext),
        json: jsonEntry ? jsonEntry.toString('utf8') : null,
        xml: !jsonEntry && xmlEntry ? xmlEntry.toString('utf8') : null
      };
    }
    if (['.opml', '.md', '.markdown', '.txt'].indexOf(ext) < 0) {
      return { ok: false, error: 'unsupported file type' };
    }
    const text = await fsp.readFile(file, 'utf8');
    return {
      ok: true,
      kind: ext === '.opml' ? 'opml' : 'text',
      name: path.basename(file, ext),
      text
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

/* ------------------------------------------------------------------ */
/* attachments: bytes live beside the corpus, metadata lives inside it */
/* ------------------------------------------------------------------ */

const MIME_BY_EXT = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.bmp': 'image/bmp', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/markdown',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip', '.json': 'application/json', '.csv': 'text/csv'
};

const ATTACH_MAX = 20 * 1024 * 1024;

function safeAttachName(id) {
  const safe = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return safe || null;
}

async function attachFile(id) {
  const safe = safeAttachName(id);
  if (!safe) return null;
  const files = await fsp.readdir(active.attachDir).catch(() => []);
  const hit = files.find((f) => f.startsWith(safe + '.'));
  return hit ? path.join(active.attachDir, hit) : null;
}

ipcMain.handle('file:pick-attachments', async (_e, kind) => {
  const images = kind === 'image';
  const res = await dialog.showOpenDialog(win, {
    title: images ? 'Choose image' : 'Choose file',
    properties: ['openFile', 'multiSelections'],
    filters: images
      ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'] }]
      : [{ name: 'All files', extensions: ['*'] }]
  });
  if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
  await fsp.mkdir(active.attachDir, { recursive: true });
  const out = [];
  for (const src of res.filePaths) {
    const st = await fsp.stat(src).catch(() => null);
    if (!st) continue;
    if (st.size > ATTACH_MAX) {
      out.push({ ok: false, error: 'tooLarge', name: path.basename(src), max: ATTACH_MAX });
      continue;
    }
    const ext = path.extname(src).toLowerCase();
    const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const dest = path.join(active.attachDir, id + ext);
    try {
      await fsp.copyFile(src, dest);
    } catch (e) {
      out.push({ ok: false, error: 'copy', name: path.basename(src) });
      continue;
    }
    out.push({
      ok: true, id, name: path.basename(src), ext,
      mime: MIME_BY_EXT[ext] || 'application/octet-stream',
      size: st.size
    });
  }
  const files = out.filter((f) => f.ok);
  if (!files.length) return { ok: false, files: out, error: out[0] && out[0].error };
  return { ok: true, files, skipped: out.filter((f) => !f.ok) };
});

ipcMain.handle('file:check-attachments', async (_e, ids) => {
  const list = Array.isArray(ids) ? ids : [];
  const missing = [];
  for (const id of list) {
    const file = await attachFile(id);
    if (!file) missing.push(id);
  }
  return { ok: true, total: list.length, missing: missing };
});

ipcMain.handle('file:read-attachment', async (_e, id) => {
  const file = await attachFile(id);
  if (!file) return { ok: false };
  try {
    const buf = await fsp.readFile(file);
    const ext = path.extname(file).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
    return { ok: true, dataUrl: `data:${mime};base64,${buf.toString('base64')}` };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle('file:open-attachment', async (_e, id) => {
  const file = await attachFile(id);
  if (!file) return { ok: false };
  const err = await shell.openPath(file);
  return { ok: !err, error: err || '' };
});

ipcMain.handle('file:reveal-attachment', async (_e, id) => {
  const file = await attachFile(id);
  if (!file) return { ok: false };
  shell.showItemInFolder(file);
  return { ok: true };
});

ipcMain.handle('file:delete-attachment', async (_e, id) => {
  const file = await attachFile(id);
  if (!file) return { ok: true };
  await fsp.rm(file, { force: true });
  return { ok: true };
});

ipcMain.handle('shell:open', async (_e, url) => {
  if (/^https?:\/\//i.test(String(url))) { await shell.openExternal(String(url)); return { ok: true }; }
  return { ok: false };
});

ipcMain.handle('file:save-text', async (_e, { text, suggested, ext }) => {
  const res = await dialog.showSaveDialog(win, {
    title: 'Export',
    defaultPath: path.join(app.getPath('documents'), suggested || 'export.txt'),
    filters: [{ name: ext === 'md' ? 'Markdown' : 'SVG image', extensions: [ext || 'txt'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  await fsp.writeFile(res.filePath, String(text), 'utf8');
  return { ok: true, path: res.filePath };
});

ipcMain.handle('file:parse-xmind', async (_e, buffer) => {
  try {
    const buf = Buffer.from(buffer);
    xmindBuffers.set('last', buf);
    const z = zipEntries(buf);
    const jsonEntry = zipRead(z['content.json']);
    const xmlEntry = zipRead(z['content.xml']);
    return {
      ok: true,
      json: jsonEntry ? jsonEntry.toString('utf8') : null,
      xml: !jsonEntry && xmlEntry ? xmlEntry.toString('utf8') : null
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle('image:save', async (_e, { dataUrl, suggested }) => {
  const res = await dialog.showSaveDialog(win, {
    title: 'Export image',
    defaultPath: path.join(app.getPath('pictures'), suggested || 'map.png'),
    filters: [{ name: 'PNG image', extensions: ['png'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  const b64 = String(dataUrl).replace(/^data:image\/png;base64,/, '');
  await fsp.writeFile(res.filePath, Buffer.from(b64, 'base64'));
  return { ok: true, path: res.filePath };
});

/* AI proxy: keeps the renderer free of CORS problems and network details. */
ipcMain.handle('ai:models', async (_e, payload) => {
  try {
    const base = String((payload && payload.baseUrl) || '').replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
    if (!base) return { ok: false, error: 'missing endpoint' };
    const headers = {};
    if (payload && payload.apiKey) headers.Authorization = 'Bearer ' + payload.apiKey;
    const resp = await net.fetch(base + '/models', { headers });
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* ignore */ }
    if (!resp.ok) return { ok: false, status: resp.status, error: (json && json.error && json.error.message) || text.slice(0, 200) };
    const list = (json && (json.data || json.models)) || [];
    const ids = list.map((m) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
    return { ok: true, models: ids };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

/* Active requests, keyed by the renderer-supplied id, so the UI can
   really cancel a request instead of just ignoring the result. */
var activeChats = new Map();
const LEDGER_MAX = 300;
let ledgerQueue = Promise.resolve();

async function appendLedger(entry) {
  ledgerQueue = ledgerQueue.then(async () => {
    try {
      const list = await readJson(aiLedgerPath);
      const items = Array.isArray(list) ? list : [];
      items.unshift(entry);
      while (items.length > LEDGER_MAX) items.pop();
      await writeJsonAtomic(aiLedgerPath, items);
    } catch (e) { /* the ledger must never break a call */ }
  }).catch(() => {});
  return ledgerQueue;
}

ipcMain.handle('ai:chat', async (e, payload) => {
  const p = payload || {};
  const id = String(p.requestId || ('req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)));
  const ctrl = new AbortController();
  const started = Date.now();
  activeChats.set(id, { ctrl: ctrl, started: started, kind: p.kind || '' });
  const sender = e.sender;
  let result;
  try {
    result = await aiClient.chat(Object.assign({}, p, {
      fetchFn: (url, init) => net.fetch(url, init),
      signal: ctrl.signal,
      stream: !!p.stream,
      onDelta: (delta) => {
        if (!sender.isDestroyed()) sender.send('ai:chunk', { id: id, delta: delta });
      }
    }));
  } finally {
    activeChats.delete(id);
  }
  await appendLedger({
    id: id, at: started, kind: p.kind || '', model: p.model || '',
    scope: p.scope || '', status: result.ok ? (result.code === 'aborted' ? 'aborted' : 'ok') : (result.code === 'aborted' ? 'aborted' : 'error'),
    code: result.code || '', error: result.ok ? '' : String(result.error || '').slice(0, 200),
    tokens: result.usage ? (result.usage.total_tokens || 0) : 0,
    ms: result.ms || (Date.now() - started), streamed: !!result.streamed,
    bytes: result.ok ? String(result.content || '').length : 0
  });
  return result;
});

ipcMain.handle('ai:cancel', async (_e, id) => {
  const hit = activeChats.get(String(id || ''));
  if (!hit) return { ok: false, error: 'not running' };
  hit.ctrl.abort();
  return { ok: true };
});

ipcMain.handle('ai:ledger-list', async () => {
  const list = await readJson(aiLedgerPath);
  return { ok: true, items: Array.isArray(list) ? list : [] };
});

ipcMain.handle('ai:ledger-clear', async () => {
  await writeJsonAtomic(aiLedgerPath, []);
  return { ok: true };
});

ipcMain.handle('win:toggle-full', async () => {
  if (!win) return { ok: false };
  win.setFullScreen(!win.isFullScreen());
  return { ok: true, fullscreen: win.isFullScreen() };
});

ipcMain.handle('quick:submit', async (_e, payload) => {
  const text = String((payload && payload.text) || '').trim();
  if (text && win && !win.isDestroyed()) {
    win.webContents.send('quick-capture:save', { text: text, tags: (payload && payload.tags) || [] });
  }
  if (quickWin && !quickWin.isDestroyed()) quickWin.hide();
  return { ok: !!text };
});

ipcMain.handle('quick:cancel', async () => {
  if (quickWin && !quickWin.isDestroyed()) quickWin.hide();
  return { ok: true };
});

ipcMain.handle('export:pdf', async (_e, { html, suggested }) => {
  let pdfWin = null;
  try {
    pdfWin = new BrowserWindow({
      show: false, offscreen: true, width: 1260, height: 890,
      webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false }
    });
    await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(String(html || '')));
    const pdf = await pdfWin.webContents.printToPDF({
      landscape: true, printBackground: true, marginsType: 1, pageSize: 'A4'
    });
    const res = await dialog.showSaveDialog(win, {
      title: 'Export PDF',
      defaultPath: path.join(app.getPath('documents'), suggested || 'map.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    await fsp.writeFile(res.filePath, pdf);
    return { ok: true, path: res.filePath };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  } finally {
    if (pdfWin && !pdfWin.isDestroyed()) pdfWin.destroy();
  }
});

ipcMain.handle('app:quit', async () => { app.quit(); });

/* smoke test support */
ipcMain.handle('smoke:done', async (_e, payload) => {
  try {
    await fsp.writeFile(path.join(app.getPath('temp'), 'corpus-canvas-smoke.json'), JSON.stringify(payload, null, 2));
  } catch { /* ignore */ }
  if (SMOKE) setTimeout(() => app.quit(), 200);
  return { ok: true };
});
