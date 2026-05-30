const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    dbOperation: (payload) => ipcRenderer.invoke('db-operation', payload)
});
