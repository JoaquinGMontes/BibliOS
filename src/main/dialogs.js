const { ipcMain, dialog, BrowserWindow } = require('electron');

/**
 * Función para reparar el foco después de cualquier diálogo nativo
 * @param {BrowserWindow} win - Ventana de Electron
 */
function focusRepair(win) {
  if (!win) return;
  win.show();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.focus();
  setTimeout(() => win.setAlwaysOnTop(false), 120);
}

/**
 * Registra todos los handlers IPC para diálogos nativos con reparación de foco
 */
function registerDialogsIPC() {
  // Diálogo de confirmación (estilo sistema: type, title, message, detail, buttons, defaultId, cancelId, okIndex)
  ipcMain.handle('dialog:confirm', async (event, opts = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Cancelar', 'Aceptar'],
      cancelId: 0,
      defaultId: 1,
      noLink: true,
      message: '¿Confirmar?',
      ...opts
    });
    focusRepair(win);
    // true si el usuario pulsó el botón "confirmar" (índice okIndex)
    const okIndex = opts.okIndex !== undefined ? opts.okIndex : 1;
    return res.response === okIndex;
  });

  // Diálogo de mensaje/información
  ipcMain.handle('dialog:message', async (event, opts) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await dialog.showMessageBox(win, { 
      type: 'info', 
      noLink: true, 
      buttons: ['Aceptar'],
      ...opts 
    });
    focusRepair(win);
    return true;
  });

  // Diálogo de error
  ipcMain.handle('dialog:error', async (event, opts) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await dialog.showMessageBox(win, { 
      type: 'error', 
      noLink: true, 
      buttons: ['Aceptar'],
      ...opts 
    });
    focusRepair(win);
    return true;
  });

  // Diálogo de advertencia
  ipcMain.handle('dialog:warning', async (event, opts) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await dialog.showMessageBox(win, { 
      type: 'warning', 
      noLink: true, 
      buttons: ['Aceptar'],
      ...opts 
    });
    focusRepair(win);
    return true;
  });

  // Diálogo de apertura de archivo
  ipcMain.handle('dialog:open', async (event, opts) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, { 
      properties: ['openFile'], 
      ...opts 
    });
    focusRepair(win);
    return res;
  });

  // Diálogo de apertura de múltiples archivos
  ipcMain.handle('dialog:openMultiple', async (event, opts) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, { 
      properties: ['openFile', 'multiSelections'], 
      ...opts 
    });
    focusRepair(win);
    return res;
  });

  // Diálogo de apertura de directorio
  ipcMain.handle('dialog:openDirectory', async (event, opts) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, { 
      properties: ['openDirectory'], 
      ...opts 
    });
    focusRepair(win);
    return res;
  });

  // Diálogo de guardado de archivo
  ipcMain.handle('dialog:save', async (event, opts) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showSaveDialog(win, { ...opts });
    focusRepair(win);
    return res;
  });

  // Handler para asegurar foco en la ventana principal
  ipcMain.handle('ensure-focused', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    focusRepair(win);
    return true;
  });

  console.log('Handlers de diálogos registrados con reparación de foco');
}

module.exports = { registerDialogsIPC, focusRepair };
