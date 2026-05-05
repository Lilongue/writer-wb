/* eslint global-require: off, promise/always-return: off */

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
  Menu, // Added Menu
  OpenDialogOptions,
} from 'electron';
import fs from 'fs';
import { spawn } from 'child_process';
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
import MainNotificationService from './services/NotificationService';
import ArchiveService from './services/ArchiveService';
import ImportExportService from './services/ImportExportService';
import { EntityType } from '../common/types';

const getDb = () => projectService.getDb();

const narrativeDao = new NarrativeDao(getDb);
const worldObjectDao = new WorldObjectDao(getDb);
const templateDao = new TemplateDao(getDb);
const connectionDao = new ConnectionDao(getDb);
const settingsDao = new SettingsDao(getDb);

const narrativeService = new NarrativeService(narrativeDao, templateDao, () =>
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
const importExportService = new ImportExportService(
  projectSettingsService,
  templateDao,
  worldObjectDao,
  connectionDao,
);

let mainWindow: BrowserWindow | null = null;
let filePathToOpenOnReady: string | null = null; // For macOS open-file event when app is not ready

process.on('uncaughtException', (error) => {
  MainNotificationService.error(
    'Критическая ошибка',
    `Произошла непредвиденная ошибка. Рекомендуется перезапустить приложение. Error: ${String(error)}`,
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
      MainNotificationService.error('Ошибка открытия проекта', String(error));
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
    .catch((error: unknown) =>
      MainNotificationService.info(
        'Установка расширений',
        `Не удалось установить расширения: ${String(error)}`,
      ),
    );
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
    title: 'Конструктор Миров Писателя',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  MainNotificationService.initialize(mainWindow);

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
    const menu = Menu.getApplicationMenu();
    if (!menu) return;

    const archiveMenuItem = menu.getMenuItemById('archive-project-menu-item');
    if (archiveMenuItem) archiveMenuItem.enabled = true;

    const exportMenuItem = menu.getMenuItemById(
      'export-world-objects-menu-item',
    );
    if (exportMenuItem) exportMenuItem.enabled = true;

    const importMenuItem = menu.getMenuItemById(
      'import-world-objects-menu-item',
    );
    if (importMenuItem) importMenuItem.enabled = true;
  });

  eventBus.on('project-closed', () => {
    mainWindow?.webContents.send('project-closed');
    const menu = Menu.getApplicationMenu();
    if (!menu) return;

    const archiveMenuItem = menu.getMenuItemById('archive-project-menu-item');
    if (archiveMenuItem) archiveMenuItem.enabled = false;

    const exportMenuItem = menu.getMenuItemById(
      'export-world-objects-menu-item',
    );
    if (exportMenuItem) exportMenuItem.enabled = false;

    const importMenuItem = menu.getMenuItemById(
      'import-world-objects-menu-item',
    );
    if (importMenuItem) importMenuItem.enabled = false;
  });

  eventBus.on('narrative-changed', () => {
    mainWindow?.webContents.send('narrative-changed');
  });

  eventBus.on('world-objects-changed', (payload) => {
    mainWindow?.webContents.send('world-objects-changed', payload);
  });

  eventBus.on('templates-changed', () => {
    mainWindow?.webContents.send('templates-changed');
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

ipcMain.handle(
  'dialog:openFile',
  async (_event, options: OpenDialogOptions) => {
    if (!mainWindow) {
      return { canceled: true, filePaths: [] };
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(
      mainWindow,
      options,
    );

    return { canceled, filePaths };
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
  async (_event, { id, type }: { id: number; type: EntityType }) => {
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

ipcMain.handle('open-in-external-editor', async (_event, filePath: string) => {
  try {
    const allSettings = await projectSettingsService.getAllSettings();
    const editorPathSetting = allSettings.find(
      (setting) => setting.key === 'editor.mdPath',
    );
    const editorPath = editorPathSetting?.value;

    if (editorPath && typeof editorPath === 'string' && editorPath.trim()) {
      const editorProcess = spawn(editorPath, [filePath], {
        detached: true,
        stdio: 'ignore',
      });

      editorProcess.on('error', (err) => {
        MainNotificationService.error(
          'Ошибка запуска редактора',
          `Не удалось запустить внешний редактор: ${String(err)}`,
        );
      });

      editorProcess.unref();
    } else {
      shell
        .openPath(filePath)
        .catch((error) =>
          MainNotificationService.error(
            'Ошибка открытия файла',
            `Не удалось открыть файл приложением по умолчанию: ${String(error)}`,
          ),
        );
    }
    return { success: true };
  } catch (error) {
    MainNotificationService.error(
      'Ошибка открытия во внешнем редакторе',
      `Не удалось открыть во внешнем редакторе: ${String(error)}`,
    );
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('create-file', async (_event, filePath: string) => {
  try {
    await fileSystemService.createFileWithDirs(filePath, '\n');
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('fs-stat', async (_event, filePath: string) => {
  return fileSystemService.getStats(filePath);
});

ipcMain.handle('fs:open-folder', (_event, folderPath: string) => {
  return fileSystemService.openFolder(folderPath);
});

ipcMain.handle('fs:get-directory-files', (_event, folderPath: string) => {
  return fileSystemService.getDirectoryFiles(folderPath);
});

// --- Narrative CRUD ---
ipcMain.handle(
  'narrative:create',
  async (_event, { parentId, templateId, name, title }) => {
    const newItemId = await narrativeService.createNarrativeItem(
      parentId,
      templateId,
      name,
      title,
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
  _event.sender.send('item-deleted', {
    id: itemId,
    type: EntityType.Narrative,
  });
  eventBus.emit('narrative-changed');
});

ipcMain.handle(
  'narrative:update-details',
  async (_event, { id, name, title, description, plan }) => {
    await narrativeService.updateNarrativeItemDetails(
      id,
      name,
      title,
      description,
      plan,
    );
    eventBus.emit('narrative-changed');
  },
);

ipcMain.handle(
  'narrative:update-order',
  async (_event, { dragId, dropId, dropType }) => {
    await narrativeService.updateNarrativeOrder(dragId, dropId, dropType);
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

ipcMain.handle('world-object:delete', async (_event, id) => {
  const result = await worldObjectService.deleteObject(id);
  if (result.success) {
    _event.sender.send('item-deleted', {
      id,
      type: EntityType.WorldObject,
    });
  }
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

ipcMain.handle('templates:toggleVisibility', (_event, id) => {
  try {
    const result = templateService.toggleTemplateVisibility(id);
    return { success: result };
  } catch (e: any) {
    return { success: false, error: e.message };
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
    return await projectService.createProject(
      projectData,
      templateService,
      projectSettingsService,
      narrativeService,
    );
  } catch (error) {
    console.error('Unexpected error during project creation:', error);
    MainNotificationService.error(
      'Ошибка создания проекта',
      `Произошла непредвиденная ошибка: ${String(error)}`,
    );
    return false;
  }
});

ipcMain.handle('project:isProjectOpen', () => {
  return projectService.getProjectRoot() !== null;
});

// --- Connections CRUD ---
ipcMain.handle('entities:search', (_event, { query, currentEntity }) => {
  return connectionService.searchEntities(query, currentEntity);
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

// --- Project Archive ---
// This IPC handler will be invoked by the renderer to perform the archiving
ipcMain.handle('project:perform-archive', async () => {
  if (!mainWindow) {
    MainNotificationService.error(
      'Ошибка архивации',
      'Основное окно не определено.',
    );
    return { success: false, error: 'Main window not defined.' };
  }

  try {
    const projectRoot = projectService.getProjectRoot();
    if (!projectRoot) {
      MainNotificationService.error('Ошибка архивации', 'Проект не открыт.');
      return { success: false, error: 'Project not open.' };
    }

    // This part remains in the main process as it's a native dialog
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Сохранить архив проекта',
      defaultPath: path.join(projectRoot, 'project-archive.zip'),
      filters: [{ name: 'Zip Archives', extensions: ['zip'] }],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    await ArchiveService.createProjectArchive(filePath);
    MainNotificationService.success(
      'Архив создан',
      `Проект успешно заархивирован в ${filePath}`,
    );
    return { success: true, filePath };
  } catch (error: any) {
    MainNotificationService.error(
      'Ошибка архивации проекта',
      `Не удалось создать архив: ${String(error)}`,
    );
    return { success: false, error: error.message };
  }
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
      MainNotificationService.error('Ошибка экспорта рукописи', String(error));
      return { success: false, error: error.message };
    }
  },
);

// --- Import/Export ---
ipcMain.handle('export:world-objects', async () => {
  if (!mainWindow) {
    MainNotificationService.error(
      'Ошибка экспорта',
      'Основное окно не определено.',
    );
    return { success: false, error: 'Main window not defined.' };
  }

  try {
    const jsonContent = await importExportService.exportWorldObjects();
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Экспорт объектов мира',
      defaultPath: `world-objects-export.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (!canceled && filePath) {
      await fs.promises.writeFile(filePath, jsonContent, 'utf-8');
      MainNotificationService.success(
        'Экспорт завершен',
        `Объекты успешно экспортированы в ${filePath}`,
      );
      return { success: true, filePath };
    }
    return { success: false, canceled: true };
  } catch (error: any) {
    MainNotificationService.error(
      'Ошибка экспорта',
      `Не удалось экспортировать объекты: ${String(error)}`,
    );
    return { success: false, error: error.message };
  }
});

ipcMain.handle(
  'import:from-file',
  async (
    _event,
    {
      selectedTemplates,
      shouldImportWorldObjects,
      shouldImportConnections,
      worldObjectsToImport,
      connectionsToImport,
    },
  ) => {
    try {
      await importExportService.importFromFile(
        selectedTemplates,
        shouldImportWorldObjects,
        shouldImportConnections,
        worldObjectsToImport,
        connectionsToImport,
      );
      eventBus.emit('world-objects-changed');
      eventBus.emit('templates-changed');
      return { success: true };
    } catch (error: any) {
      MainNotificationService.error(
        'Ошибка импорта',
        `Не удалось импортировать данные из файла: ${String(error)}`,
      );
      return { success: false, error: error.message };
    }
  },
);

ipcMain.handle('trigger-import-world-objects', async () => {
  if (!mainWindow) {
    MainNotificationService.error(
      'Ошибка импорта',
      'Основное окно не определено.',
    );
    return { success: false, error: 'Main window not defined.' };
  }

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Импорт объектов мира',
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const filePath = filePaths[0];
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');

    // Send the file content to the renderer to open the import modal
    mainWindow.webContents.send('open-import-from-file-modal', fileContent);

    return { success: true };
  } catch (error: any) {
    MainNotificationService.error(
      'Ошибка импорта',
      `Не удалось импортировать объекты: ${String(error)}`,
    );
    return { success: false, error: error.message };
  }
});

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
  .catch((error) =>
    MainNotificationService.info('Ошибка запуска приложения', String(error)),
  );
