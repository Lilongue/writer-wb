import path from 'path';
import { app, BrowserWindow, Menu, shell } from 'electron';

import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './utils/projectUtils';
import eventBus from './eventBus';
import MainNotificationService from './services/NotificationService';
import notificationService from '../renderer/services/notificationService';

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  import('electron-debug')
    .then((debugModule) => {
      return debugModule.default();
    })
    .catch((err) => {
      notificationService.showError(
        'Не удалось загрузить electron-debug:',
        err,
      );
    });
}

const installExtensions = async () => {
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;

  return installExtension(REACT_DEVELOPER_TOOLS, { forceDownload }).catch(
    (error: unknown) =>
      MainNotificationService.info(
        'Установка расширений',
        `Не удалось установить расширения: ${String(error)}`,
      ),
  );
};

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

export const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

let mainWindow: BrowserWindow | null = null;

export const getMainWindow = () => mainWindow;

export const createWindow = async () => {
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
