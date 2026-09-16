'use strict';

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('lotmDesktop', {
  packaged: true,
});
