/* eslint-disable no-console */
import {
  app,
  Menu,
  BrowserWindow,
  MenuItemConstructorOptions,
  dialog,
} from 'electron';
import path from 'path'; // Добавлено
import ProjectService from './services/ProjectService';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: app.name,
      submenu: [
        {
          label: `About ${app.name}`,
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: `Hide ${app.name}`,
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
      ],
    };
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [],
    };

    const subMenuView =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? subMenuViewDev
        : subMenuViewProd;

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
  }

  buildDefaultTemplate(): MenuItemConstructorOptions[] {
    const templateDefault: MenuItemConstructorOptions[] = [
      {
        label: '&Файл',
        submenu: [
          {
            label: '&Новый проект',
            accelerator: 'Ctrl+N',
            click: () => {
              this.mainWindow.webContents.send('open-project-wizard');
            },
          },
          {
            label: '&Открыть проект',
            accelerator: 'Ctrl+O',
            async click() {
              const { canceled, filePaths } = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [
                  {
                    name: 'Writer World Builder Project',
                    extensions: ['wwb'],
                  },
                ],
                title: 'Выберите файл проекта Writer World Builder',
              });
              if (canceled || filePaths.length === 0) return;

              try {
                const projectFilePath = filePaths[0];
                const projectRoot = path.dirname(projectFilePath);

                await ProjectService.open(projectRoot);
              } catch (e) {
                console.error('Failed to open project', e);
                // TODO: Показать ошибку пользователю
              }
            },
          },
          {
            label: '&Закрыть проект',
            accelerator: 'Ctrl+C',
            click: () => {
              ProjectService.close();
            },
          },
          { type: 'separator' },
          {
            label: '&Настройки',
            accelerator: 'Ctrl+,', // Common shortcut for settings
            click: () => {
              // Only open project settings if a project is currently open
              if (ProjectService.getProjectRoot()) {
                this.mainWindow.webContents.send('open-project-settings');
              } else {
                // Optionally, could show a message to the user here
                // e.g., this.mainWindow.webContents.send('show-error-notification', { title: 'Нет открытого проекта', content: 'Для доступа к настройкам проекта сначала откройте проект.' });
                console.log('Attempted to open project settings with no project open.');
              }
            },
          },
          { type: 'separator' },
          {
            label: '&Выход',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      {
        label: '&Данные',
        submenu: [
          {
            label: 'Управление &типами...',
            accelerator: 'Ctrl+Shift+T',
            click: () => {
              this.mainWindow.webContents.send('open-template-manager');
            },
          },
        ],
      },
      {
        label: '&Повествование',
        submenu: [
          {
            label: 'Экспортировать всю рукопись',
            click: () => {
              this.mainWindow.webContents.send('export-full-manuscript');
            },
          },
        ],
      },
      {
        label: '&Вид',
        submenu:
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
            ? [
                {
                  label: '&Перезагрузить',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload();
                  },
                },
                {
                  label: 'Переключить &полноэкранный режим',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen(),
                    );
                  },
                },
              ]
            : [
                {
                  label: 'Переключить &полноэкранный режим',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen(),
                    );
                  },
                },
              ],
      },
      {
        label: 'Помощь',
        submenu: [
          {
            label: 'О программе',
            click() {
              app.showAboutPanel();
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
