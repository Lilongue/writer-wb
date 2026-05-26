import path from 'path';
import { app, dialog } from 'electron';
import projectService from './services/ProjectService';
import MainNotificationService from './services/NotificationService';
import { createWindow, getAssetPath, getMainWindow } from './windowManager';
import registerIpcHandlers from './ipcHandlers';
import triggerSaveInRenderer from './ipcUtils';
import notificationService from '../renderer/services/notificationService';

const initializeApp = () => {
  let filePathToOpenOnReady: string | null = null; // For macOS open-file event when app is not ready

  process.on('uncaughtException', (error) => {
    MainNotificationService.error(
      'Критическая ошибка',
      `Произошла непредвиденная ошибка. Рекомендуется перезапустить приложение. Error: ${String(
        error,
      )}`,
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
        const mainWindow = getMainWindow();
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
      const mainWindow = getMainWindow();
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
    import('source-map-support')
      .then((sourceMapSupport) => {
        sourceMapSupport.install();
        return undefined;
      })
      .catch((err) => {
        notificationService.showError(
          'Failed to load source-map-support',
          String(err),
        );
      });
  }

  app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', async () => {
    await triggerSaveInRenderer();
    projectService.close();
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
      registerIpcHandlers(); // Register IPC handlers

      // On macOS, handle files opened before the app was ready
      if (filePathToOpenOnReady) {
        handleProjectFileOpen(filePathToOpenOnReady);
        filePathToOpenOnReady = null; // Clear the stored path
      }

      // For Windows/Linux, check process.argv for file path on initial launch
      if (process.platform !== 'darwin' && process.argv.length >= 2) {
        const filePathArg = process.argv.find((arg) => arg.endsWith('.wwb'));
        if (filePathArg) {
          handleProjectFileOpen(filePathArg);
        }
      }

      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        const mainWindow = getMainWindow();
        if (mainWindow === null) createWindow();
      });
      return undefined;
    })
    .catch((error) =>
      MainNotificationService.info('Ошибка запуска приложения', String(error)),
    );
};

export default initializeApp;
