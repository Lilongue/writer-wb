import { shell, ipcMain, dialog, OpenDialogOptions } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import fileSystemService from './services/FileSystemService';
import eventBus from './eventBus';
import projectService from './services/ProjectService';
import {
  connectionDao,
  connectionService,
  importExportService,
  manuscriptService,
  narrativeService,
  projectSettingsService,
  templateService,
  worldObjectService,
} from './services';
import { TemplateService } from './services/TemplateService';
import MainNotificationService from './services/NotificationService';
import ArchiveService from './services/ArchiveService';
import { EntityType } from '../common/types';
import MigrationService from './services/MigrationService';
import { getMainWindow } from './windowManager';
import triggerSaveInRenderer from './ipcUtils';

// I will move triggerSaveInRenderer to a separate file to avoid circular dependency.
// For now I will comment this out and fix it later.

const registerIpcHandlers = () => {
  // IPC MAIN
  ipcMain.handle(
    'dialog:show-open-dialog',
    async (_event, options: OpenDialogOptions) => {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return { canceled: true, filePaths: [] };
      }

      // Set default options if none are provided
      const dialogOptions = options || {
        properties: ['openFile'],
        filters: [
          { name: 'Writer World Builder Project', extensions: ['wwb'] },
        ],
      };

      const { canceled, filePaths } = await dialog.showOpenDialog(
        mainWindow,
        dialogOptions,
      );

      // If opening a directory, return the path directly
      if (
        !canceled &&
        filePaths.length > 0 &&
        dialogOptions.properties?.includes('openDirectory')
      ) {
        return { canceled, filePaths };
      }

      // If opening a .wwb file, return its parent directory
      if (!canceled && filePaths.length > 0) {
        const projectFilePath = filePaths[0];
        const projectRoot = path.dirname(projectFilePath);
        return { canceled, filePaths: [projectRoot] };
      }

      return { canceled, filePaths: [] };
    },
  );

  ipcMain.handle(
    'dialog:openFile',
    async (_event, options: OpenDialogOptions) => {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return { canceled: true, filePaths: [] };
      }

      const { canceled, filePaths } = await dialog.showOpenDialog(
        mainWindow,
        options,
      );

      return { canceled, filePaths };
    },
  );

  ipcMain.handle('get-narrative-items', () => {
    return narrativeService.getNarrativeItems();
  });

  ipcMain.handle('get-narrative-templates', () => {
    return templateService.getNarrativeTemplates();
  });

  ipcMain.handle('get-world-object-types', () => {
    return worldObjectService.getWorldObjectTypes();
  });

  ipcMain.handle('get-world-objects-by-type', (_event, typeId) => {
    return worldObjectService.getWorldObjectsByTypeId(typeId);
  });

  ipcMain.handle(
    'get-item-details',
    async (_event, { id, type }: { id: number; type: EntityType }) => {
      let details;
      if (type === 'narrative') {
        details = await narrativeService.getDetails(id);
      } else if (type === 'world') {
        details = await worldObjectService.getDetails(id);
      } else {
        return null;
      }

      if (details) {
        details.all_entities_id = connectionDao.findEntityId(type, id); // Добавляем all_entities_id
        details.connections = connectionService.getConnections(type, id);
      }

      return details;
    },
  );

  ipcMain.handle(
    'open-in-external-editor',
    async (_event, filePath: string) => {
      try {
        const allSettings = await projectSettingsService.getAllSettings();
        const editorPathSetting = allSettings.find(
          (setting) => setting.key === 'editor.mdPath',
        );
        const editorPath = editorPathSetting?.value;

        if (editorPath && typeof editorPath === 'string' && editorPath.trim()) {
          const editorProcess = spawn(editorPath, [filePath], {
            detached: true,
            stdio: 'ignore',
          });

          editorProcess.on('error', (err) => {
            MainNotificationService.error(
              'Ошибка запуска редактора',
              `Не удалось запустить внешний редактор: ${String(err)}`,
            );
          });

          editorProcess.unref();
        } else {
          shell
            .openPath(filePath)
            .catch((error) =>
              MainNotificationService.error(
                'Ошибка открытия файла',
                `Не удалось открыть файл приложением по умолчанию: ${String(
                  error,
                )}`,
              ),
            );
        }
        return { success: true };
      } catch (error) {
        MainNotificationService.error(
          'Ошибка открытия во внешнем редакторе',
          `Не удалось открыть во внешнем редакторе: ${String(error)}`,
        );
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle('create-file', async (_event, filePath: string) => {
    try {
      await fileSystemService.createFileWithDirs(filePath, '');
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('fs-stat', async (_event, filePath: string) => {
    return fileSystemService.getStats(filePath);
  });

  ipcMain.handle('fs:open-folder', (_event, folderPath: string) => {
    return fileSystemService.openFolder(folderPath);
  });

  ipcMain.handle('fs:get-directory-files', (_event, folderPath: string) => {
    return fileSystemService.getDirectoryFiles(folderPath);
  });

  ipcMain.handle('fs-readdir', async (_event, folderPath: string) => {
    try {
      const files = await fileSystemService.getDirectoryFiles(folderPath);
      return { success: true, files };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // --- Narrative CRUD ---
  ipcMain.handle(
    'narrative:create',
    async (_event, { parentId, templateId, name, title }) => {
      const newItemId = await narrativeService.createNarrativeItem(
        parentId,
        templateId,
        name,
        title,
      );
      eventBus.emit('narrative-changed');
      return newItemId;
    },
  );

  ipcMain.handle('narrative:rename', async (_event, { itemId, newName }) => {
    await narrativeService.renameNarrativeItem(itemId, newName);
    eventBus.emit('narrative-changed');
  });

  ipcMain.handle('narrative:delete', async (_event, itemId) => {
    await narrativeService.deleteNarrativeItem(itemId);
    _event.sender.send('item-deleted', {
      id: itemId,
      type: EntityType.Narrative,
    });
    eventBus.emit('narrative-changed');
  });

  ipcMain.handle(
    'narrative:update-details',
    async (_event, { id, name, title, description, plan }) => {
      await narrativeService.updateNarrativeItemDetails(
        id,
        name,
        title,
        description,
        plan,
      );
      eventBus.emit('narrative-changed');
    },
  );

  ipcMain.handle(
    'narrative:update-order',
    async (_event, { dragId, dropId, dropType }) => {
      await narrativeService.updateNarrativeOrder(dragId, dropId, dropType);
      eventBus.emit('narrative-changed');
    },
  );

  // --- World Object CRUD ---
  ipcMain.handle(
    'world-object:create',
    (_event, { name, typeId, properties }) => {
      return worldObjectService.createObject({ name, typeId, properties });
    },
  );

  ipcMain.handle('world-object:rename', (_event, { id, newName }) => {
    worldObjectService.renameObject({ id, newName });
  });

  ipcMain.handle('world-object:delete', async (_event, id) => {
    const result = await worldObjectService.deleteObject(id);
    if (result.success) {
      _event.sender.send('item-deleted', {
        id,
        type: EntityType.WorldObject,
      });
    }
  });

  ipcMain.on('world-objects-changed', () => {
    eventBus.emit('world-objects-changed');
  });

  ipcMain.handle('get-template-details', (_event, templateId) => {
    return worldObjectService.getTemplateDetails(templateId);
  });

  ipcMain.handle(
    'world-object:update-details',
    (_event, { id, name, properties }) => {
      worldObjectService.updateObjectDetails({ id, name, properties });
    },
  );

  // --- Template CRUD ---
  ipcMain.handle('templates:get-predefined-narrative', () => {
    return TemplateService.getPredefinedNarrativeTemplates();
  });

  ipcMain.handle('templates:get-predefined', () => {
    return TemplateService.getPredefinedTemplates();
  });

  ipcMain.handle('templates:import', (_event, templateData) => {
    return templateService.importTemplate(templateData);
  });

  ipcMain.handle('templates:create', (_event, { name, category, fields }) => {
    return templateService.createTemplate(name, category, fields);
  });

  ipcMain.handle('templates:get', (_event, id) => {
    return templateService.getTemplate(id);
  });

  ipcMain.handle('templates:getAll', (_event, includeArchived, category) => {
    return templateService.getAllTemplates(includeArchived, category);
  });

  ipcMain.handle('templates:toggleVisibility', (_event, id) => {
    try {
      const result = templateService.toggleTemplateVisibility(id);
      return { success: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('templates:rename', (_event, { id, newName }) => {
    templateService.renameTemplate(id, newName);
  });

  ipcMain.handle('templates:updateSchema', (_event, { id, schema }) => {
    return templateService.updateTemplateSchema(id, schema);
  });

  // Project State
  ipcMain.handle('project:create', async (_event, projectData) => {
    try {
      return await projectService.createProject(
        projectData,
        templateService,
        projectSettingsService,
        narrativeService,
      );
    } catch (error) {
      MainNotificationService.error(
        'Ошибка создания проекта',
        `Произошла непредвиденная ошибка: ${String(error)}`,
      );
      return false;
    }
  });

  ipcMain.handle('project:isProjectOpen', () => {
    return projectService.getProjectRoot() !== null;
  });

  // --- Connections CRUD ---
  ipcMain.handle('entities:search', (_event, { query, currentEntity }) => {
    return connectionService.searchEntities(query, currentEntity);
  });

  ipcMain.handle(
    'connections:create',
    (_event, { sourceType, sourceId, targetType, targetId, description }) => {
      return connectionService.createConnection(
        sourceType,
        sourceId,
        targetType,
        targetId,
        description,
      );
    },
  );

  ipcMain.handle('connections:delete', (_event, connectionId) => {
    return connectionService.deleteConnection(connectionId);
  });

  // --- Project Archive ---
  // This IPC handler will be invoked by the renderer to perform the archiving
  ipcMain.handle('project:perform-archive', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      MainNotificationService.error(
        'Ошибка архивации',
        'Основное окно не определено.',
      );
      return { success: false, error: 'Main window not defined.' };
    }

    try {
      await triggerSaveInRenderer();

      const projectRoot = projectService.getProjectRoot();
      if (!projectRoot) {
        MainNotificationService.error('Ошибка архивации', 'Проект не открыт.');
        return { success: false, error: 'Project not open.' };
      }

      // This part remains in the main process as it's a native dialog
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Сохранить архив проекта',
        defaultPath: path.join(projectRoot, 'project-archive.zip'),
        filters: [{ name: 'Zip Archives', extensions: ['zip'] }],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const warnings = await ArchiveService.createProjectArchive(filePath);
      if (warnings.length > 0) {
        MainNotificationService.warning(
          'Архив создан с предупреждениями',
          `Проект успешно заархивирован в ${filePath}. Предупреждения: ${warnings.join(
            '; ',
          )}`,
        );
      } else {
        MainNotificationService.success(
          'Архив создан',
          `Проект успешно заархивирован в ${filePath}`,
        );
      }
      return { success: true, filePath };
    } catch (error: any) {
      MainNotificationService.error(
        'Ошибка архивации проекта',
        `Не удалось создать архив: ${String(error)}`,
      );
      return { success: false, error: error.message };
    }
  });

  // --- Export Narrative ---
  ipcMain.handle(
    'export-narrative',
    async (_event, { rootItemId, includeHeaders }) => {
      try {
        const mainWindow = getMainWindow();
        const assembledContent = await manuscriptService.assembleNarrative(
          rootItemId,
          includeHeaders,
        );

        const { canceled, filePath } = await dialog.showSaveDialog(
          mainWindow!,
          {
            title: 'Сохранить рукопись как Markdown',
            defaultPath: `manuscript.md`,
            filters: [{ name: 'Markdown Files', extensions: ['md'] }],
          },
        );

        if (!canceled && filePath) {
          fs.writeFileSync(filePath, assembledContent);
          return { success: true, filePath };
        }
        return { success: false, canceled: true };
      } catch (error: any) {
        MainNotificationService.error(
          'Ошибка экспорта рукописи',
          String(error),
        );
        return { success: false, error: error.message };
      }
    },
  );

  // --- Import/Export ---
  ipcMain.handle('export:world-objects', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      MainNotificationService.error(
        'Ошибка экспорта',
        'Основное окно не определено.',
      );
      return { success: false, error: 'Main window not defined.' };
    }

    try {
      const { jsonContent, warnings } =
        await importExportService.exportWorldObjects();
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Экспорт объектов мира',
        defaultPath: `world-objects-export.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (!canceled && filePath) {
        await fs.promises.writeFile(filePath, jsonContent, 'utf-8');
        if (warnings.length > 0) {
          MainNotificationService.warning(
            'Экспорт завершен с предупреждениями',
            `Объекты успешно экспортированы в ${filePath}. Предупреждения: ${warnings.join(
              '; ',
            )}`,
          );
        } else {
          MainNotificationService.success(
            'Экспорт завершен',
            `Объекты успешно экспортированы в ${filePath}`,
          );
        }
        return { success: true, filePath };
      }
      return { success: false, canceled: true };
    } catch (error: any) {
      MainNotificationService.error(
        'Ошибка экспорта',
        `Не удалось экспортировать объекты: ${String(error)}`,
      );
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    'import:check-template-names',
    async (_event, templateNames: string[]) => {
      try {
        return await importExportService.checkExistingTemplateNames(
          templateNames,
        );
      } catch (error: any) {
        MainNotificationService.error(
          'Ошибка проверки шаблонов',
          `Не удалось проверить существующие шаблоны: ${String(error)}`,
        );
        return []; // Return empty array on error
      }
    },
  );

  ipcMain.handle(
    'import:from-file',
    async (
      _event,
      {
        selectedTemplates,
        shouldImportWorldObjects,
        shouldImportConnections,
        worldObjectsToImport,
        connectionsToImport,
      },
    ) => {
      try {
        const importResult = await importExportService.importFromFile(
          selectedTemplates,
          shouldImportWorldObjects,
          shouldImportConnections,
          worldObjectsToImport,
          connectionsToImport,
        );
        eventBus.emit('world-objects-changed');
        eventBus.emit('templates-changed');

        const notificationTitle = 'Импорт завершен';
        let notificationContent = 'Данные успешно импортированы.';
        let notificationType = 'success';
        const messages: string[] = [];

        if (importResult.templates.imported > 0) {
          messages.push(
            `Шаблонов импортировано: ${importResult.templates.imported}`,
          );
        }
        if (importResult.templates.skipped > 0) {
          messages.push(
            `Шаблонов пропущено: ${importResult.templates.skipped}`,
          );
          notificationType = 'warning';
        }
        if (importResult.templates.errors > 0) {
          messages.push(
            `Ошибок импорта шаблонов: ${importResult.templates.errors}`,
          );
          notificationType = 'error';
        }

        if (shouldImportWorldObjects) {
          if (importResult.worldObjects.imported > 0) {
            messages.push(
              `Объектов мира импортировано: ${importResult.worldObjects.imported}`,
            );
          }
          if (importResult.worldObjects.skipped > 0) {
            messages.push(
              `Объектов мира пропущено: ${importResult.worldObjects.skipped}`,
            );
            notificationType = 'warning';
          }
          if (importResult.worldObjects.errors > 0) {
            messages.push(
              `Ошибок импорта объектов мира: ${importResult.worldObjects.errors}`,
            );
            notificationType = 'error';
          }
        }

        if (shouldImportWorldObjects && shouldImportConnections) {
          if (importResult.connections.imported > 0) {
            messages.push(
              `Связей импортировано: ${importResult.connections.imported}`,
            );
          }
          if (importResult.connections.skipped > 0) {
            messages.push(
              `Связей пропущено: ${importResult.connections.skipped}`,
            );
            notificationType = 'warning';
          }
          if (importResult.connections.errors > 0) {
            messages.push(
              `Ошибок импорта связей: ${importResult.connections.errors}`,
            );
            notificationType = 'error';
          }
        }

        if (importResult.messages.length > 0) {
          messages.push('Подробности:');
          messages.push(...importResult.messages);
          if (notificationType === 'success') {
            // If there were only non-critical messages, elevate to warning
            notificationType = 'warning';
          }
        }

        notificationContent = messages.join('');

        switch (notificationType) {
          case 'success':
            MainNotificationService.success(
              notificationTitle,
              notificationContent,
            );
            break;
          case 'warning':
            MainNotificationService.warning(
              notificationTitle,
              notificationContent,
            );
            break;
          case 'error':
            MainNotificationService.error(
              notificationTitle,
              notificationContent,
            );
            break;
          default:
            MainNotificationService.info(
              notificationTitle,
              notificationContent,
            );
            break;
        }
        return { success: true };
      } catch (error: any) {
        MainNotificationService.error(
          'Ошибка импорта',
          `Не удалось импортировать данные из файла: ${String(error)}`,
        );
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle('trigger-import-world-objects', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      MainNotificationService.error(
        'Ошибка импорта',
        'Основное окно не определено.',
      );
      return { success: false, error: 'Main window not defined.' };
    }

    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Импорт объектов мира',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = filePaths[0];
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');

      // Send the file content to the renderer to open the import modal
      mainWindow.webContents.send('open-import-from-file-modal', fileContent);

      return { success: true };
    } catch (error: any) {
      MainNotificationService.error(
        'Ошибка импорта',
        `Не удалось импортировать объекты: ${String(error)}`,
      );
      return { success: false, error: error.message };
    }
  });

  // --- Project Settings ---
  ipcMain.handle('project-settings:get-all', () => {
    return projectSettingsService.getAllSettings();
  });

  ipcMain.handle('project-settings:update', (_event, settings) => {
    return projectSettingsService.updateSettings(settings);
  });

  ipcMain.on('request-manual-migration', async () => {
    const projectRoot = projectService.getProjectRoot();
    if (!projectRoot) {
      MainNotificationService.warning(
        'Миграция невозможна',
        'Сначала откройте проект, который необходимо обновить.',
      );
      return;
    }

    const db = projectService.getDb();
    const projectVersion = projectService.getProjectVersion();

    const migrationService = new MigrationService(
      db,
      projectRoot,
      projectVersion,
    );
    const success = await migrationService.migrate();

    if (success) {
      const mainWindow = getMainWindow();
      if (mainWindow) {
        dialog
          .showMessageBox(mainWindow, {
            type: 'info',
            title: 'Обновление завершено',
            message: 'Проект успешно обновлен. Сейчас он будет перезагружен.',
          })
          .then(async () => {
            // Reload the project
            await projectService.close();
            await projectService.open(projectRoot);
            return undefined;
          })
          .catch((err) =>
            MainNotificationService.error(
              'Error showing dialog or reloading project:',
              err,
            ),
          );
      }
    }
    // If not successful, MigrationService already showed an error.
  });
};

export default registerIpcHandlers;
