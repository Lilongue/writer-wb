import { BrowserWindow } from 'electron';
import MainNotificationService from '../../../main/services/NotificationService';
import { NotificationType } from '../../../common/types';

// Mock the BrowserWindow
const mockSend = jest.fn();
const mockWebContents = {
  send: mockSend,
};

const mockBrowserWindow = {
  webContents: mockWebContents,
} as unknown as BrowserWindow;

describe('MainNotificationService', () => {
  beforeEach(() => {
    // Reset mocks and the service's state before each test
    jest.clearAllMocks();
    // We need to reset the internal state of the singleton
    MainNotificationService.initialize(null as any);
  });

  // Test case: Verifies that no notification is sent if the main Electron window
  // has not been initialized in the NotificationService.
  it('should not send notification if main window is not initialized', () => {
    MainNotificationService.error('Test Error', 'Something went wrong');
    expect(mockSend).not.toHaveBeenCalled();
  });

  // Test case: Verifies that an error type notification is correctly sent
  // to the main window's webContents with the provided title and content.
  it('should send an error notification', () => {
    MainNotificationService.initialize(mockBrowserWindow);
    const title = 'Error Title';
    const content = 'Error content';
    MainNotificationService.error(title, content);

    expect(mockSend).toHaveBeenCalledWith('show-notification', {
      type: NotificationType.Error,
      title,
      content,
    });
  });

  // Test case: Verifies that a warning type notification is correctly sent
  // to the main window's webContents with the provided title and content.
  it('should send a warning notification', () => {
    MainNotificationService.initialize(mockBrowserWindow);
    const title = 'Warning Title';
    const content = 'Warning content';
    MainNotificationService.warning(title, content);

    expect(mockSend).toHaveBeenCalledWith('show-notification', {
      type: NotificationType.Warning,
      title,
      content,
    });
  });

  // Test case: Verifies that an info type notification is correctly sent
  // to the main window's webContents with the provided title and content.
  it('should send an info notification', () => {
    MainNotificationService.initialize(mockBrowserWindow);
    const title = 'Info Title';
    const content = 'Info content';
    MainNotificationService.info(title, content);

    expect(mockSend).toHaveBeenCalledWith('show-notification', {
      type: NotificationType.Info,
      title,
      content,
    });
  });

  // Test case: Verifies that a success type notification is correctly sent
  // to the main window's webContents with the provided title and content.
  it('should send a success notification', () => {
    MainNotificationService.initialize(mockBrowserWindow);
    const title = 'Success Title';
    const content = 'Success content';
    MainNotificationService.success(title, content);

    expect(mockSend).toHaveBeenCalledWith('show-notification', {
      type: NotificationType.Success,
      title,
      content,
    });
  });

  // Test case: Verifies that the notification service correctly handles notifications
  // where the content is not provided, ensuring that `content` is `undefined` in the sent data.
  it('should handle notifications without content', () => {
    MainNotificationService.initialize(mockBrowserWindow);
    const title = 'Success Title';
    MainNotificationService.success(title);

    expect(mockSend).toHaveBeenCalledWith('show-notification', {
      type: NotificationType.Success,
      title,
      content: undefined,
    });
  });
});
