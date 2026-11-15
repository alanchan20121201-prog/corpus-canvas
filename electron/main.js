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
  app.whenReady().then(createWindow);
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
