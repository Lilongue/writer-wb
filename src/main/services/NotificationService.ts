import { BrowserWindow } from 'electron';
import { NotificationType } from '../../common/types';

class MainNotificationService {
  private mainWindow: BrowserWindow | null = null;

  initialize(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  private send(type: NotificationType, title: string, content?: string) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('show-notification', {
        type,
        title,
        content,
      });
    }
  }

  error(title: string, content?: string) {
    this.send(NotificationType.Error, title, content);
  }

  warning(title: string, content?: string) {
    this.send(NotificationType.Warning, title, content);
  }

  info(title: string, content?: string) {
    this.send(NotificationType.Info, title, content);
  }

  success(title: string, content?: string) {
    this.send(NotificationType.Success, title, content);
  }
}

export default new MainNotificationService();
