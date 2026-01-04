// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  OpenDialogOptions,
} from 'electron';
import {
  EntityTemplate,
  PredefinedTemplate,
  PredefinedWorldTemplate,
  PredefinedNarrativeTemplate,
} from '../common/types';

export type Channels =
  | 'project-opened'
  | 'project-closed'
  | 'open-in-external-editor'
  | 'narrative-changed'
  | 'export-full-manuscript'
  | 'world-objects-changed'
  | 'open-template-manager'
  | 'open-project-settings'
  | 'show-error-notification'
  | 'open-project-wizard';

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
  template: {
    getPredefinedNarrativeTemplates: () => Promise<
      PredefinedNarrativeTemplate[]
    >;
    getPredefinedTemplates: () => Promise<PredefinedWorldTemplate[]>;
    importTemplate: (
      templateData: PredefinedTemplate,
    ) => Promise<EntityTemplate>;
  };
  dialog: {
    showOpenDialog: (
      options?: OpenDialogOptions,
    ) => Promise<{ canceled: boolean; filePaths: string[] }>;
  };
  project: {
    create: (projectData: {
      location: string;
      projectName: string;
      narrativeStructure: string[];
    }) => Promise<void>;
  };
};

contextBridge.exposeInMainWorld('electron', {
  ...electronHandler,
  exportNarrative: (rootItemId: number | null, includeHeaders: boolean) =>
    ipcRenderer.invoke('export-narrative', { rootItemId, includeHeaders }),
  template: {
    getPredefinedNarrativeTemplates: () =>
      ipcRenderer.invoke('templates:get-predefined-narrative'),
    getPredefinedTemplates: () =>
      ipcRenderer.invoke('templates:get-predefined'),
    importTemplate: (templateData: PredefinedTemplate) =>
      ipcRenderer.invoke('templates:import', templateData),
  },
  dialog: {
    showOpenDialog: (options?: OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:show-open-dialog', options),
  },
  project: {
    create: (projectData: {
      location: string;
      projectName: string;
      narrativeStructure: string[];
    }) => ipcRenderer.invoke('project:create', projectData),
  },
});

export type ElectronHandler = ElectronAPI;
