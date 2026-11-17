'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  info: () => ipcRenderer.invoke('app:info'),
  loadCorpus: () => ipcRenderer.invoke('corpus:load'),
  readLayoutCache: (id) => ipcRenderer.invoke('layout:read', id),
  writeLayoutCache: (id, data) => ipcRenderer.invoke('layout:write', id, data),
  clearLayoutCache: (id) => ipcRenderer.invoke('layout:clear', id),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  snapshotBackup: () => ipcRenderer.invoke('backup:snapshot'),
  restoreBackup: (name) => ipcRenderer.invoke('backup:restore', name),
  saveCorpus: (data) => ipcRenderer.invoke('corpus:save', data),
  revealCorpus: () => ipcRenderer.invoke('corpus:reveal'),
  dataPaths: () => ipcRenderer.invoke('app:data-paths'),
  openDir: (key) => ipcRenderer.invoke('app:open-dir', key),
  listTrashLibraries: () => ipcRenderer.invoke('library:list-trash'),
  restoreTrashLibrary: (name) => ipcRenderer.invoke('library:restore-trash', name),
  getKey: () => ipcRenderer.invoke('key:get'),
  setKey: (key) => ipcRenderer.invoke('key:set', key),
  clearKey: () => ipcRenderer.invoke('key:clear'),
  exportBackup: (payload) => ipcRenderer.invoke('backup:export', payload),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  exportBundle: (payload) => ipcRenderer.invoke('backup:export-bundle', payload),
  importBundle: () => ipcRenderer.invoke('backup:import-bundle'),
  importDialog: () => ipcRenderer.invoke('file:import-dialog'),
  extractXmindAttachments: (paths) => ipcRenderer.invoke('file:extract-xmind-attachments', paths),
  saveImage: (payload) => ipcRenderer.invoke('image:save', payload),
  parseXmind: (buffer) => ipcRenderer.invoke('file:parse-xmind', buffer),
  saveText: (payload) => ipcRenderer.invoke('file:save-text', payload),
  exportPdf: (payload) => ipcRenderer.invoke('export:pdf', payload),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  pickAttachments: (kind) => ipcRenderer.invoke('file:pick-attachments', kind),
  readAttachment: (id) => ipcRenderer.invoke('file:read-attachment', id),
  checkAttachments: (ids) => ipcRenderer.invoke('file:check-attachments', ids),
  openAttachment: (id) => ipcRenderer.invoke('file:open-attachment', id),
  revealAttachment: (id) => ipcRenderer.invoke('file:reveal-attachment', id),
  deleteAttachment: (id) => ipcRenderer.invoke('file:delete-attachment', id),
  chat: (payload) => ipcRenderer.invoke('ai:chat', payload),
  cancelChat: (id) => ipcRenderer.invoke('ai:cancel', id),
  onChatChunk: (fn) => {
    const h = (_e, data) => { try { fn(data); } catch (err) { console.error(err); } };
    ipcRenderer.on('ai:chunk', h);
    return () => ipcRenderer.removeListener('ai:chunk', h);
  },
  ledgerList: () => ipcRenderer.invoke('ai:ledger-list'),
  ledgerClear: () => ipcRenderer.invoke('ai:ledger-clear'),
  corpusStats: () => ipcRenderer.invoke('corpus:stats'),
  listLibraries: () => ipcRenderer.invoke('library:list'),
  createLibrary: (payload) => ipcRenderer.invoke('library:create', payload),
  switchLibrary: (payload) => ipcRenderer.invoke('library:switch', payload),
  renameLibrary: (payload) => ipcRenderer.invoke('library:rename', payload),
  deleteLibrary: (payload) => ipcRenderer.invoke('library:delete', payload),
  listModels: (payload) => ipcRenderer.invoke('ai:models', payload),
  quit: () => ipcRenderer.invoke('app:quit'),
  toggleFullScreen: () => ipcRenderer.invoke('win:toggle-full'),
  smokeDone: (payload) => ipcRenderer.invoke('smoke:done', payload),
  submitQuickCapture: (payload) => ipcRenderer.invoke('quick:submit', payload),
  cancelQuickCapture: () => ipcRenderer.invoke('quick:cancel'),
  onQuickCapture: (fn) => {
    const h = (_e, data) => { try { fn(data); } catch (err) { console.error(err); } };
    ipcRenderer.on('quick-capture:save', h);
    return () => ipcRenderer.removeListener('quick-capture:save', h);
  }
});
