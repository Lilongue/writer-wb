import { ipcMain } from 'electron';
import { getMainWindow } from './windowManager';

const triggerSaveInRenderer = (): Promise<void> => {
  const mainWindow = getMainWindow();
  return new Promise((resolve) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Listen for the response from the renderer
      ipcMain.once('renderer:save-complete', () => {
        resolve();
      });
      // Send the request to the renderer
      mainWindow.webContents.send('main:request-save');
    } else {
      // If there's no window, there's nothing to save.
      resolve();
    }
  });
};

export default triggerSaveInRenderer;
