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
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  OpenDialogOptions,
} from 'electron';
import fs from 'fs';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import fileSystemService from './services/FileSystemService';
import eventBus from './eventBus';
import projectService from './services/ProjectService';
import { NarrativeService } from './services/NarrativeService';
import { WorldObjectService } from './services/WorldObjectService';
import { TemplateService } from './services/TemplateService';
import ConnectionService from './services/ConnectionService';
import { ManuscriptService } from './services/ManuscriptService';
import ProjectSettingsService from './services/ProjectSettingsService';
import { NarrativeDao } from './data/daos/NarrativeDao';
import { WorldObjectDao } from './data/daos/WorldObjectDao';
import { TemplateDao } from './data/daos/TemplateDao';
import { ConnectionDao } from './data/daos/ConnectionDao';
import { SettingsDao } from './data/daos/SettingsDao';

const getDb = () => projectService.getDb();

const narrativeDao = new NarrativeDao(getDb);
const worldObjectDao = new WorldObjectDao(getDb);
const templateDao = new TemplateDao(getDb);
const connectionDao = new ConnectionDao(getDb);
const settingsDao = new SettingsDao(getDb);

const narrativeService = new NarrativeService(narrativeDao, () =>
  projectService.getProjectRoot(),
);
const manuscriptService = new ManuscriptService(narrativeDao, () =>
  projectService.getProjectRoot(),
);
const worldObjectService = new WorldObjectService(
  worldObjectDao,
  templateDao,
  () => projectService.getProjectRoot(),
);
const templateService = new TemplateService(templateDao, worldObjectDao);
const connectionService = new ConnectionService(
  connectionDao,
  narrativeDao,
  worldObjectDao,
);
const projectSettingsService = new ProjectSettingsService(settingsDao);

let mainWindow: BrowserWindow | null = null;
let filePathToOpenOnReady: string | null = null; // For macOS open-file event when app is not ready

const notifyUserError = (title: string, content: string) => {
  if (mainWindow) {
    mainWindow.webContents.send('show-error-notification', { title, content });
  }
};

process.on('uncaughtException', (error) => {
  console.error('--- Uncaught Main Exception ---');
  console.error(error);
  console.error('--------------------------------');
  notifyUserError(
    'Критическая ошибка',
    'Произошла непредвиденная ошибка. Рекомендуется перезапустить приложение.',
  );
});

// Helper function to handle opening a .wwb file
const handleProjectFileOpen = async (filePath: string) => {
  if (path.extname(filePath) === '.wwb') {
    const projectRoot = path.dirname(filePath);
    try {
      if (projectService.getProjectRoot() !== projectRoot) {
        await projectService.open(projectRoot);
      }
    } catch (error) {
      console.error('Failed to open project via file association:', error);
      if (mainWindow) {
        dialog.showErrorBox(
          'Ошибка открытия проекта',
          'Не удалось открыть проект из файла. Проверьте целостность файла и папки проекта.',
        );
      }
    }
  }
};

// --- Handle multiple instances and file association launches ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // A second instance is trying to run. We should handle the file path argument if present.
  const filePathArg = process.argv.find((arg) => arg.endsWith('.wwb'));
  if (filePathArg) {
    app.quit();
    process.exit(0); // Exit this secondary instance
  }
  // If no .wwb file argument, just quit the second instance.
  app.quit();
  process.exit(0); // Exit this secondary instance
} else {
  // This is the primary instance.
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const filePathArg = commandLine.find((arg) => arg.endsWith('.wwb'));
      if (filePathArg) {
        handleProjectFileOpen(filePathArg);
      }
    }
  });

  // Handle file open events from OS (e.g., double-clicking a .wwb file)
  // For macOS
  app.on('open-file', (event, filePath) => {
    event.preventDefault(); // Prevent default behavior (opening new window)
    if (app.isReady()) {
      handleProjectFileOpen(filePath);
    } else {
      // If app is not ready, store the path to be opened once ready
      filePathToOpenOnReady = filePath;
    }
  });
}
// --- End of multiple instance handling ---

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

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    minWidth: 800,
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

  eventBus.on('world-objects-changed', (payload) => {
    mainWindow?.webContents.send('world-objects-changed', payload);
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
ipcMain.handle(
  'dialog:show-open-dialog',
  async (_event, options: OpenDialogOptions) => {
    if (!mainWindow) {
      return { canceled: true, filePaths: [] };
    }

    // Set default options if none are provided
    const dialogOptions = options || {
      properties: ['openFile'],
      filters: [{ name: 'Writer World Builder Project', extensions: ['wwb'] }],
    };

    const { canceled, filePaths } = await dialog.showOpenDialog(
      mainWindow,
      dialogOptions,
    );

    // If opening a directory, return the path directly
    if (
      !canceled &&
      filePaths.length > 0 &&
      dialogOptions.properties?.includes('openDirectory')
    ) {
      return { canceled, filePaths };
    }

    // If opening a .wwb file, return its parent directory
    if (!canceled && filePaths.length > 0) {
      const projectFilePath = filePaths[0];
      const projectRoot = path.dirname(projectFilePath);
      return { canceled, filePaths: [projectRoot] };
    }

    return { canceled, filePaths: [] };
  },
);

ipcMain.handle('get-narrative-items', () => {
  return narrativeService.getNarrativeItems();
});

ipcMain.handle('get-narrative-templates', () => {
  return templateService.getNarrativeTemplates();
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
    let details;
    if (type === 'narrative') {
      details = await narrativeService.getDetails(id);
    } else if (type === 'world') {
      details = await worldObjectService.getDetails(id);
    } else {
      return null;
    }

    if (details) {
      details.connections = connectionService.getConnections(type, id);
    }

    return details;
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
  async (_event, { parentId, templateId, name }) => {
    const newItemId = await narrativeService.createNarrativeItem(
      parentId,
      templateId,
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

ipcMain.handle('narrative:delete', async (_event, itemId) => {
  await narrativeService.deleteNarrativeItem(itemId);
  eventBus.emit('narrative-changed');
});

ipcMain.handle(
  'narrative:update-details',
  async (_event, { id, name, description, plan }) => {
    await narrativeService.updateNarrativeItemDetails(
      id,
      name,
      description,
      plan,
    );
    eventBus.emit('narrative-changed');
  },
);

// --- World Object CRUD ---
ipcMain.handle(
  'world-object:create',
  (_event, { name, typeId, properties }) => {
    return worldObjectService.createObject({ name, typeId, properties });
  },
);

ipcMain.handle('world-object:rename', (_event, { id, newName }) => {
  worldObjectService.renameObject({ id, newName });
});

ipcMain.handle('world-object:delete', (_event, id) => {
  return worldObjectService.deleteObject(id);
});

ipcMain.on('world-objects-changed', () => {
  eventBus.emit('world-objects-changed');
});

ipcMain.handle('get-template-details', (_event, templateId) => {
  return worldObjectService.getTemplateDetails(templateId);
});

ipcMain.handle(
  'world-object:update-details',
  (_event, { id, name, properties }) => {
    worldObjectService.updateObjectDetails({ id, name, properties });
  },
);

// --- Template CRUD ---
ipcMain.handle('templates:get-predefined-narrative', () => {
  return TemplateService.getPredefinedNarrativeTemplates();
});

ipcMain.handle('templates:get-predefined', () => {
  return TemplateService.getPredefinedTemplates();
});

ipcMain.handle('templates:import', (_event, templateData) => {
  return templateService.importTemplate(templateData);
});

ipcMain.handle('templates:create', (_event, { name, category, fields }) => {
  return templateService.createTemplate(name, category, fields);
});

ipcMain.handle('templates:get', (_event, id) => {
  return templateService.getTemplate(id);
});

ipcMain.handle('templates:getAll', (_event, includeArchived, category) => {
  return templateService.getAllTemplates(includeArchived, category);
});

ipcMain.handle('templates:archive', (_event, id) => {
  try {
    const ok = templateService.archiveTemplate(id);
    return { success: ok };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('templates:rename', (_event, { id, newName }) => {
  templateService.renameTemplate(id, newName);
});

ipcMain.handle('templates:updateSchema', (_event, { id, schema }) => {
  return templateService.updateTemplateSchema(id, schema);
});

// Project State
ipcMain.handle('project:create', async (_event, projectData) => {
  try {
    await projectService.createProject(
      projectData,
      templateService,
      projectSettingsService,
      narrativeService,
    );
  } catch (error) {
    console.error(`Error occurred in handler for 'project:create':`, error);
    projectService.close(); // Make sure to clean up
    throw error; // Re-throw the error to the renderer process
  }
});

ipcMain.handle('project:isProjectOpen', () => {
  return projectService.getProjectRoot() !== null;
});

// --- Connections CRUD ---
ipcMain.handle('entities:search', (_event, { query, currentEntityId }) => {
  return connectionService.searchEntities(query, currentEntityId);
});

ipcMain.handle(
  'connections:create',
  (_event, { sourceType, sourceId, targetType, targetId, description }) => {
    return connectionService.createConnection(
      sourceType,
      sourceId,
      targetType,
      targetId,
      description,
    );
  },
);

ipcMain.handle('connections:delete', (_event, connectionId) => {
  return connectionService.deleteConnection(connectionId);
});

// --- Export Narrative ---
ipcMain.handle(
  'export-narrative',
  async (_event, { rootItemId, includeHeaders }) => {
    try {
      const assembledContent = await manuscriptService.assembleNarrative(
        rootItemId,
        includeHeaders,
      );

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
        title: 'Сохранить рукопись как Markdown',
        defaultPath: `manuscript.md`,
        filters: [{ name: 'Markdown Files', extensions: ['md'] }],
      });

      if (!canceled && filePath) {
        fs.writeFileSync(filePath, assembledContent);
        return { success: true, filePath };
      }
      return { success: false, canceled: true };
    } catch (error: any) {
      console.error('Error exporting narrative:', error);
      return { success: false, error: error.message };
    }
  },
);

// --- Project Settings ---
ipcMain.handle('project-settings:get-all', () => {
  return projectSettingsService.getAllSettings();
});

ipcMain.handle('project-settings:update', (_event, settings) => {
  return projectSettingsService.updateSettings(settings);
});

app
  .whenReady()
  .then(() => {
    app.setAboutPanelOptions({
      applicationName: 'Writer World Builder',
      applicationVersion: `Version ${app.getVersion()}`,
      authors: ['Lilongue'],
      website: 'https://github.com/Lilongue/writer-wb',
      copyright: 'Copyright © 2023 Lilongue',
      iconPath: getAssetPath('icon.png'),
    });

    createWindow();

    // On macOS, handle files opened before the app was ready
    if (filePathToOpenOnReady) {
      handleProjectFileOpen(filePathToOpenOnReady);
      filePathToOpenOnReady = null; // Clear the stored path
    }

    // For Windows/Linux, check process.argv for file path on initial launch
    // (This path is taken if app.requestSingleInstanceLock() returns true and no second-instance event fired yet)
    if (process.platform !== 'darwin' && process.argv.length >= 2) {
      const filePathArg = process.argv.find((arg) => arg.endsWith('.wwb'));
      if (filePathArg) {
        handleProjectFileOpen(filePathArg);
      }
    }

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
