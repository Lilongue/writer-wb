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
  | 'templates-changed'
  | 'open-template-manager'
  | 'open-project-settings'
  | 'show-notification'
  | 'open-project-wizard'
  | 'open-import-from-file-modal'
  | 'item-deleted'
  | 'project-archive'
  | 'project:archive-request'
  | 'trigger-export-world-objects'
  | 'trigger-import-world-objects'
  | 'main:request-save'
  | 'renderer:save-complete';

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
    checkTemplateNames: (names: string[]) => Promise<string[]>;
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
      createSubfolder: boolean;
    }) => Promise<boolean>;
    performArchive: () => Promise<{
      success: boolean;
      filePath?: string;
      error?: string;
      canceled?: boolean;
    }>;
  };
  worldObjects: {
    export: () => Promise<{
      success: boolean;
      filePath?: string;
      error?: string;
      canceled?: boolean;
    }>;
    import: () => Promise<{
      success: boolean;
      filePath?: string;
      error?: string;
      canceled?: boolean;
    }>;
  };
  fs: {
    openFolder: (folderPath: string) => Promise<void>;
    getDirectoryFiles: (folderPath: string) => Promise<string[]>;
    readdir: (
      folderPath: string,
    ) => Promise<{ success: boolean; files: string[]; error?: string }>;
  };
  editor: {
    savePendingChanges: () => Promise<void>;
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
    checkTemplateNames: (names: string[]) =>
      ipcRenderer.invoke('import:check-template-names', names),
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
      createSubfolder: boolean;
    }) => ipcRenderer.invoke('project:create', projectData),
    performArchive: () => ipcRenderer.invoke('project:perform-archive'),
  },
  worldObjects: {
    export: () => ipcRenderer.invoke('export:world-objects'),
    import: () => ipcRenderer.invoke('trigger-import-world-objects'),
  },
  fs: {
    openFolder: (folderPath: string) =>
      ipcRenderer.invoke('fs:open-folder', folderPath),
    getDirectoryFiles: (folderPath: string) =>
      ipcRenderer.invoke('fs:get-directory-files', folderPath),
    readdir: (folderPath: string) =>
      ipcRenderer.invoke('fs-readdir', folderPath),
  },
  editor: {
    savePendingChanges: () =>
      ipcRenderer.invoke('editor:save-pending-changes'),
  },
});

export type ElectronHandler = ElectronAPI;
