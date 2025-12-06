// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
  | 'project-opened'
  | 'project-closed'
  | 'open-in-external-editor'
  | 'narrative-changed'
  | 'world-objects-changed'
  | 'open-template-manager';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
};

export type ElectronAPI = typeof electronHandler & {
  exportNarrative: (
    rootItemId: number | null,
    includeHeaders: boolean,
  ) => Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
    canceled?: boolean;
  }>;
};

contextBridge.exposeInMainWorld('electron', {
  ...electronHandler,
  exportNarrative: (rootItemId: number | null, includeHeaders: boolean) =>
    ipcRenderer.invoke('export-narrative', { rootItemId, includeHeaders }),
});

export type ElectronHandler = ElectronAPI;
