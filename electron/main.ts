import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * IPC channel names shared between main and renderer (via preload).
 * Keep these in sync with `electron/preload.ts`.
 */
const IPC = {
  READ_JSON: 'file:read-json',
  OPEN_DIALOG: 'dialog:open-json',
} as const;

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    title: 'Docker Project Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = process.env['ELECTRON_IS_DEV'] === '1' || !app.isPackaged;

  if (isDev) {
    // Angular dev server with live reload.
    void window.loadURL('http://localhost:4200');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production build served from disk.
    void window.loadFile(
      path.join(__dirname, '..', 'dist', 'docker-project-manager', 'browser', 'index.html'),
    );
  }

  return window;
}

function registerFileIpc(): void {
  ipcMain.handle(IPC.OPEN_DIALOG, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select a JSON file',
      properties: ['openFile'],
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle(IPC.READ_JSON, async (_event, filePath: string) => {
    if (!filePath) {
      throw new Error('A file path must be provided.');
    }

    const raw = await fs.readFile(filePath, 'utf-8');
    // Validate JSON before returning so the renderer can rely on the shape.
    JSON.parse(raw);
    return { filePath, content: raw };
  });
}

function buildMenu(): void {
  const isDev = process.env['ELECTRON_IS_DEV'] === '1' || !app.isPackaged;

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open JSON…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-json'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  if (!isDev) {
    // Hide dev tools menu in production builds.
    template[2].submenu = [{ role: 'reload' }, { role: 'togglefullscreen' }];
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function bootstrap(): void {
  app.whenReady().then(() => {
    registerFileIpc();
    buildMenu();
    mainWindow = createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

bootstrap();
