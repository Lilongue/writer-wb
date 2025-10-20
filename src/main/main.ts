/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import fileSystemService from './services/FileSystemService';

import eventBus from './eventBus';

/**
 * Add event listeners...
 */

import projectService, {
  narrativeService,
  worldObjectService,
} from './services/ProjectService';

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  // Прослушивание событий и пересылка их в рендерер
  eventBus.on('project-opened', () => {
    mainWindow?.webContents.send('project-opened');
  });

  eventBus.on('project-closed', () => {
    mainWindow?.webContents.send('project-closed');
  });

  eventBus.on('narrative-changed', () => {
    mainWindow?.webContents.send('narrative-changed');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  projectService.close();
});

// IPC MAIN
ipcMain.handle('get-narrative-items', () => {
  return narrativeService.getNarrativeItems();
});

ipcMain.handle('get-world-object-types', () => {
  return worldObjectService.getWorldObjectTypes();
});

ipcMain.handle('get-world-objects-by-type', (_event, typeId) => {
  return worldObjectService.getWorldObjectsByTypeId(typeId);
});

ipcMain.handle(
  'get-item-details',
  async (_event, { id, type }: { id: number; type: 'narrative' | 'world' }) => {
    if (type === 'narrative') {
      return narrativeService.getDetails(id);
    }
    if (type === 'world') {
      return worldObjectService.getDetails(id);
    }
    return null;
  },
);

ipcMain.on('open-in-external-editor', (_event, filePath: string) => {
  shell.openPath(filePath).catch(console.error);
});

ipcMain.handle('create-file', async (_event, filePath: string) => {
  try {
    await fileSystemService.createFileWithDirs(filePath, '\n'); // Создаем с пустой строкой
    return { success: true };
  } catch (e) {
    console.error('Failed to create file:', e);
    return { success: false };
  }
});

ipcMain.handle('fs-stat', async (_event, filePath: string) => {
  return fileSystemService.getStats(filePath);
});

// --- Narrative CRUD ---
ipcMain.handle(
  'narrative:create',
  async (_event, { parentId, itemType, name }) => {
    const newItemId = await narrativeService.createNarrativeItem(
      parentId,
      itemType,
      name,
    );
    eventBus.emit('narrative-changed');
    return newItemId;
  },
);

ipcMain.handle('narrative:rename', async (_event, { itemId, newName }) => {
  await narrativeService.renameNarrativeItem(itemId, newName);
  eventBus.emit('narrative-changed');
});

ipcMain.handle('narrative:delete', async (_event, { itemId }) => {
  await narrativeService.deleteNarrativeItem(itemId);
  eventBus.emit('narrative-changed');
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
