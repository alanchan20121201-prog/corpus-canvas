'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const zlib = require('node:zlib');
const aiClient = require('./ai-client');

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
const corpusPath = path.join(userDir, 'corpus.json');
const securePath = path.join(userDir, 'secure.json');
const backupDir = path.join(userDir, 'backups');
const layoutDir = path.join(userDir, 'layout-cache');

function layoutFile(id) {
  const safe = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return safe ? path.join(layoutDir, safe + '.json') : null;
}
const FORMAT_VERSION = 2;

async function autoBackup() {
  try {
    const st = await fsp.stat(corpusPath).catch(() => null);
    if (!st || !st.size) return;
    await fsp.mkdir(backupDir, { recursive: true });
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = 'corpus-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.json';
    await fsp.copyFile(corpusPath, path.join(backupDir, name));
    const files = (await fsp.readdir(backupDir)).filter((f) => /^corpus-\d{8}-\d{6}\.json$/.test(f)).sort();
    while (files.length > 10) await fsp.rm(path.join(backupDir, files.shift()), { force: true });
  } catch (e) { /* ignore */ }
}
const statePath = path.join(userDir, 'window.json');

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
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    const lnameLen = buf.readUInt16LE(localOff + 26);
    const lextraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lnameLen + lextraLen;
    out[name] = { method, data: buf.subarray(dataStart, dataStart + compSize) };
    off += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function zipRead(entry) {
  if (!entry) return null;
  return entry.method === 0 ? entry.data : zlib.inflateRawSync(entry.data);
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
  win.on('closed', () => { win = null; });

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

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(async () => { await autoBackup(); createWindow(); });
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

/* ------------------------------------------------------------------ */
/* ipc                                                                 */
/* ------------------------------------------------------------------ */

ipcMain.handle('app:info', async () => ({
  version: app.getVersion(),
  userDir,
  corpusPath,
  platform: process.platform,
  encrypted: canEncrypt(),
  dev: isDev,
  locale: app.getLocale(),
  systemLanguages: (() => { try { return app.getPreferredSystemLanguages(); } catch (e) { return []; } })()
}));

ipcMain.handle('corpus:load', async () => readJson(corpusPath));

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
    await fsp.mkdir(layoutDir, { recursive: true });
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
    const files = (await fsp.readdir(backupDir)).filter((f) => /^corpus-\d{8}-\d{6}\.json$/.test(f)).sort().reverse();
    const out = [];
    for (const f of files.slice(0, 10)) {
      const st = await fsp.stat(path.join(backupDir, f));
      out.push({ name: f, at: st.mtimeMs, size: st.size });
    }
    return { ok: true, items: out };
  } catch (e) { return { ok: true, items: [] }; }
});

ipcMain.handle('backup:restore', async (_e, name) => {
  if (!/^corpus-\d{8}-\d{6}\.json$/.test(String(name || ''))) return { ok: false, error: 'bad name' };
  const file = path.join(backupDir, name);
  let data;
  try { data = JSON.parse(await fsp.readFile(file, 'utf8')); }
  catch (e) { return { ok: false, error: 'invalid' }; }
  if (!data || !Array.isArray(data.cards) || !Array.isArray(data.maps)) return { ok: false, error: 'invalid' };
  if (data.formatVersion != null && Number(data.formatVersion) > FORMAT_VERSION) return { ok: false, error: 'version' };
  try {
    await writeJsonAtomic(corpusPath, data);
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

ipcMain.handle('corpus:save', async (_e, data) => {
  await writeJsonAtomic(corpusPath, data);
  return { ok: true };
});

ipcMain.handle('corpus:reveal', async () => {
  shell.showItemInFolder(corpusPath);
  return { ok: true };
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

ipcMain.handle('ai:chat', async (_e, payload) => {
  return aiClient.chat(Object.assign({}, payload, {
    fetchFn: (url, init) => net.fetch(url, init)
  }));
});

ipcMain.handle('win:toggle-full', async () => {
  if (!win) return { ok: false };
  win.setFullScreen(!win.isFullScreen());
  return { ok: true, fullscreen: win.isFullScreen() };
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
