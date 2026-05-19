import { app } from 'electron';
import {
  PredefinedWorldTemplate,
  ExportedWorldObject,
  ExportFile,
  EntityType,
  ExportedConnection,
  ImportResult,
} from '../../common/types';
import { TemplateDao } from '../data/daos/TemplateDao';
import { WorldObjectDao } from '../data/daos/WorldObjectDao';
import { ConnectionDao } from '../data/daos/ConnectionDao'; // <-- Добавлено
import ProjectSettingsService from './ProjectSettingsService';

class ImportExportService {
  private projectSettingsService: ProjectSettingsService;

  private templateDao: TemplateDao;

  private worldObjectDao: WorldObjectDao;

  private connectionDao: ConnectionDao; // <-- Добавлено

  constructor(
    projectSettingsService: ProjectSettingsService,
    templateDao: TemplateDao,
    worldObjectDao: WorldObjectDao,
    connectionDao: ConnectionDao, // <-- Добавлено
  ) {
    this.projectSettingsService = projectSettingsService;
    this.templateDao = templateDao;
    this.worldObjectDao = worldObjectDao;
    this.connectionDao = connectionDao; // <-- Добавлено
  }

  /**
   * Экспортирует все объекты мира в виде JSON-строки.
   */
  public async exportWorldObjects(): Promise<{
    jsonContent: string;
    warnings: string[];
  }> {
    const settings = await this.projectSettingsService.getAllSettings();
    const projectNameSetting = settings.find((s) => s.key === 'project.name');
    const projectName =
      (projectNameSetting?.value as string) || 'Unknown Project';

    const warnings: string[] = [];
    const templatesToExport = new Map<number, PredefinedWorldTemplate>();
    const exportedWorldObjects: ExportedWorldObject[] = [];
    const allEntityIdToLocalIdMap = new Map<number, number>();
    let localIdCounter = 1;

    const allObjects = this.worldObjectDao.getAllWorldObjects();

    allObjects.forEach((object) => {
      const template = this.templateDao.getTemplate(object.template_id);
      if (!template) {
        warnings.push(
          `Шаблон для объекта "${object.name}" не найден и объект будет пропущен.`,
        );
        return;
      }

      const allEntityId = this.connectionDao.findEntityId(
        EntityType.WorldObject,
        object.id,
      );
      if (!allEntityId) {
        warnings.push(
          `Сущность для объекта "${object.name}" не найдена и объект будет пропущена.`,
        );
        return;
      }

      if (!templatesToExport.has(template.id)) {
        try {
          const fields = JSON.parse(template.fields_schema);
          templatesToExport.set(template.id, {
            name: template.name,
            category: EntityType.WorldObject,
            fields,
          });
        } catch {
          warnings.push(
            `Ошибка парсинга схемы для шаблона "${template.name}". Шаблон не будет экспортирован.`,
          );
          return;
        }
      }

      allEntityIdToLocalIdMap.set(allEntityId, localIdCounter);
      exportedWorldObjects.push({
        localId: localIdCounter,
        templateName: template.name,
        objectData: {
          name: object.name,
          description: object.description,
          properties: object.properties,
        },
      });
      localIdCounter += 1;
    });

    const allConnections = this.connectionDao.getAllConnections();
    const worldObjectAllEntityIds =
      this.connectionDao.getAllWorldObjectEntityIds();
    const worldObjectAllEntityIdSet = new Set(worldObjectAllEntityIds);

    const exportedConnections: ExportedConnection[] = allConnections
      .filter(
        (connection) =>
          worldObjectAllEntityIdSet.has(connection.source_id) &&
          worldObjectAllEntityIdSet.has(connection.target_id) &&
          allEntityIdToLocalIdMap.has(connection.source_id) &&
          allEntityIdToLocalIdMap.has(connection.target_id),
      )
      .map((connection) => ({
        sourceLocalId: allEntityIdToLocalIdMap.get(connection.source_id)!,
        targetLocalId: allEntityIdToLocalIdMap.get(connection.target_id)!,
        description: connection.description,
      }));

    const exportFile: ExportFile = {
      version: app.getVersion(),
      type: 'WriterWorldBuilder-Export',
      sourceProjectName: projectName,
      templates: {
        world_templates: Array.from(templatesToExport.values()),
      },
      worldObjects: exportedWorldObjects,
      connections: exportedConnections, // <-- Добавлено
    };

    return { jsonContent: JSON.stringify(exportFile, null, 2), warnings };
  }

  public async checkExistingTemplateNames(
    templateNames: string[],
  ): Promise<string[]> {
    const existingNames: string[] = [];
    templateNames.forEach((name) => {
      const existing = this.templateDao.findTemplateByName(
        name,
        EntityType.WorldObject,
      );
      if (existing) {
        existingNames.push(name);
      }
    });
    return existingNames;
  }

  public async importFromFile(
    selectedTemplates: PredefinedWorldTemplate[],
    shouldImportWorldObjects: boolean,
    shouldImportConnections: boolean,
    worldObjectsToImport: ExportedWorldObject[],
    connectionsToImport: ExportedConnection[],
  ): Promise<ImportResult> {
    const templateNameIdMap = new Map<string, number>(); // Maps template name to its actual DB ID

    const results: ImportResult = {
      templates: { imported: 0, skipped: 0, errors: 0 },
      worldObjects: { imported: 0, skipped: 0, errors: 0 },
      connections: { imported: 0, skipped: 0, errors: 0 },
      messages: [],
    };

    // 1. Import Templates
    await selectedTemplates.reduce(async (previousPromise, templateData) => {
      await previousPromise; // Wait for the previous item to complete

      const existingTemplate = this.templateDao.findTemplateByName(
        templateData.name,
        templateData.category,
      );
      if (existingTemplate) {
        templateNameIdMap.set(templateData.name, existingTemplate.id);
        results.templates.skipped += 1;
        results.messages.push(
          `Шаблон "${templateData.name}" уже существует и будет использоваться.`,
        );
      } else {
        try {
          const newTemplateId = this.templateDao.createTemplate(
            templateData.name,
            templateData.category,
            JSON.stringify(templateData.fields),
          );
          templateNameIdMap.set(templateData.name, newTemplateId);
          results.templates.imported += 1;
        } catch (error) {
          results.templates.errors += 1;
          results.messages.push(
            `Не удалось импортировать шаблон "${
              templateData.name
            }": ${String(error)}`,
          );
        }
      }
      return Promise.resolve();
    }, Promise.resolve());

    // 2. Import World Objects
    const localIdToNewAllEntityIdMap = new Map<number, number>();
    if (shouldImportWorldObjects) {
      await worldObjectsToImport.reduce(
        async (previousPromise, exportedObject) => {
          await previousPromise; // Wait for the previous item to complete

          const templateId = templateNameIdMap.get(exportedObject.templateName);
          if (!templateId) {
            results.worldObjects.skipped += 1;
            results.messages.push(
              `Шаблон "${exportedObject.templateName}" для объекта "${exportedObject.objectData.name}" не найден. Объект будет пропущен.`,
            );
            return Promise.resolve(); // Continue with the next item
          }

          try {
            const newObjectId = this.worldObjectDao.createWorldObject(
              exportedObject.objectData.name,
              templateId,
              exportedObject.objectData.properties || '',
            );

            const newAllEntityId = this.connectionDao.findEntityId(
              EntityType.WorldObject,
              newObjectId,
            );
            if (newAllEntityId) {
              localIdToNewAllEntityIdMap.set(
                exportedObject.localId,
                newAllEntityId,
              );
              results.worldObjects.imported += 1;
            } else {
              results.worldObjects.errors += 1;
              results.messages.push(
                `Не удалось найти allEntityId для объекта "${exportedObject.objectData.name}". Связи для него могут быть некорректны.`,
              );
            }
          } catch (error) {
            results.worldObjects.errors += 1;
            results.messages.push(
              `Не удалось импортировать объект "${
                exportedObject.objectData.name
              }": ${String(error)}`,
            );
          }
          return Promise.resolve();
        },
        Promise.resolve(),
      );
    }

    // 3. Import Connections
    if (shouldImportWorldObjects && shouldImportConnections) {
      await connectionsToImport.reduce(
        async (previousPromise, exportedConnection) => {
          await previousPromise; // Wait for the previous item to complete

          const sourceAllEntityId = localIdToNewAllEntityIdMap.get(
            exportedConnection.sourceLocalId,
          );
          const targetAllEntityId = localIdToNewAllEntityIdMap.get(
            exportedConnection.targetLocalId,
          );

          if (sourceAllEntityId && targetAllEntityId) {
            try {
              this.connectionDao.createConnection(
                sourceAllEntityId,
                targetAllEntityId,
                exportedConnection.description,
              );
              results.connections.imported += 1;
            } catch (error) {
              results.connections.errors += 1;
              results.messages.push(
                `Не удалось импортировать связь: ${String(error)}`,
              );
            }
          } else {
            results.connections.skipped += 1;
            results.messages.push(
              `Пропущена связь из-за отсутствия импортированных исходных или целевых объектов.`,
            );
          }
          return Promise.resolve();
        },
        Promise.resolve(),
      );
    }

    return results;
  }
}

export default ImportExportService;
