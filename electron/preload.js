'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  info: () => ipcRenderer.invoke('app:info'),
  loadCorpus: () => ipcRenderer.invoke('corpus:load'),
  readLayoutCache: (id) => ipcRenderer.invoke('layout:read', id),
  writeLayoutCache: (id, data) => ipcRenderer.invoke('layout:write', id, data),
  clearLayoutCache: (id) => ipcRenderer.invoke('layout:clear', id),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  restoreBackup: (name) => ipcRenderer.invoke('backup:restore', name),
  saveCorpus: (data) => ipcRenderer.invoke('corpus:save', data),
  revealCorpus: () => ipcRenderer.invoke('corpus:reveal'),
  getKey: () => ipcRenderer.invoke('key:get'),
  setKey: (key) => ipcRenderer.invoke('key:set', key),
  clearKey: () => ipcRenderer.invoke('key:clear'),
  exportBackup: (payload) => ipcRenderer.invoke('backup:export', payload),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  importDialog: () => ipcRenderer.invoke('file:import-dialog'),
  saveImage: (payload) => ipcRenderer.invoke('image:save', payload),
  parseXmind: (buffer) => ipcRenderer.invoke('file:parse-xmind', buffer),
  saveText: (payload) => ipcRenderer.invoke('file:save-text', payload),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  pickAttachments: (kind) => ipcRenderer.invoke('file:pick-attachments', kind),
  readAttachment: (id) => ipcRenderer.invoke('file:read-attachment', id),
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
  listModels: (payload) => ipcRenderer.invoke('ai:models', payload),
  quit: () => ipcRenderer.invoke('app:quit'),
  toggleFullScreen: () => ipcRenderer.invoke('win:toggle-full'),
  smokeDone: (payload) => ipcRenderer.invoke('smoke:done', payload)
});
