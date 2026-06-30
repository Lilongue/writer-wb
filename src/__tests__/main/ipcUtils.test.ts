/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron';
import triggerSaveInRenderer from '../../main/ipcUtils';
import { getMainWindow } from '../../main/windowManager';

// Mock electron's ipcMain
jest.mock('electron', () => ({
  ipcMain: {
    once: jest.fn(),
  },
}));

// Mock windowManager's getMainWindow
jest.mock('../../main/windowManager', () => ({
  getMainWindow: jest.fn(),
}));

describe('triggerSaveInRenderer', () => {
  let mockMainWindow: any;
  let webContentsSendMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    webContentsSendMock = jest.fn();
    mockMainWindow = {
      isDestroyed: jest.fn(() => false),
      webContents: {
        send: webContentsSendMock,
      },
    };
    (getMainWindow as jest.Mock).mockReturnValue(mockMainWindow);
  });

  it('should send a save request and wait for completion if window exists and is not destroyed', async () => {
    // SYSTEM ACTION: The application is about to quit and needs to ensure any unsaved changes in the renderer are saved.
    const saveCompleteListener = jest.fn();
    (ipcMain.once as jest.Mock).mockImplementationOnce((channel, listener) => {
      if (channel === 'renderer:save-complete') {
        saveCompleteListener.mockImplementation(listener);
      }
    });

    const savePromise = triggerSaveInRenderer();

    expect(webContentsSendMock).toHaveBeenCalledWith('main:request-save');
    expect(ipcMain.once).toHaveBeenCalledWith(
      'renderer:save-complete',
      expect.any(Function),
    );

    // Simulate the renderer process acknowledging that saving is complete.
    saveCompleteListener();
    await savePromise; // Wait for the promise to resolve

    // The test passes if the promise resolves, confirming the two-way communication.
    expect(true).toBe(true);
  });

  it('should resolve immediately if no main window exists', async () => {
    // SCENARIO: The save trigger is called, but the main window has already been closed.
    (getMainWindow as jest.Mock).mockReturnValue(null);

    await triggerSaveInRenderer();

    // EXPECTED: The function should not attempt to send an IPC message and should resolve immediately.
    expect(webContentsSendMock).not.toHaveBeenCalled();
    expect(ipcMain.once).not.toHaveBeenCalled();
  });

  it('should resolve immediately if the main window is destroyed', async () => {
    // SCENARIO: The save trigger is called, but the main window is already in a destroyed state.
    mockMainWindow.isDestroyed.mockReturnValue(true);

    await triggerSaveInRenderer();

    // EXPECTED: The function should not attempt to send an IPC message and should resolve immediately.
    expect(webContentsSendMock).not.toHaveBeenCalled();
    expect(ipcMain.once).not.toHaveBeenCalled();
  });
});
