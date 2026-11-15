'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  info: () => ipcRenderer.invoke('app:info'),
  loadCorpus: () => ipcRenderer.invoke('corpus:load'),
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
  chat: (payload) => ipcRenderer.invoke('ai:chat', payload),
  listModels: (payload) => ipcRenderer.invoke('ai:models', payload),
  quit: () => ipcRenderer.invoke('app:quit'),
  toggleFullScreen: () => ipcRenderer.invoke('win:toggle-full'),
  smokeDone: (payload) => ipcRenderer.invoke('smoke:done', payload)
});
