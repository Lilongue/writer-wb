import {
  PredefinedWorldTemplate,
  ExportedWorldObject,
  ExportFile,
  EntityType,
  ExportedConnection,
} from '../../common/types';
import { TemplateDao } from '../data/daos/TemplateDao';
import { WorldObjectDao } from '../data/daos/WorldObjectDao';
import { ConnectionDao } from '../data/daos/ConnectionDao'; // <-- Добавлено
import MainNotificationService from './NotificationService';
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
  public async exportWorldObjects(): Promise<string> {
    const settings = await this.projectSettingsService.getAllSettings();
    const projectNameSetting = settings.find((s) => s.key === 'project.name');
    const projectName =
      (projectNameSetting?.value as string) || 'Unknown Project';

    const templatesToExport = new Map<number, PredefinedWorldTemplate>();
    const exportedWorldObjects: ExportedWorldObject[] = [];
    const allEntityIdToLocalIdMap = new Map<number, number>();
    let localIdCounter = 1;

    const allObjects = this.worldObjectDao.getAllWorldObjects();

    allObjects.forEach((object) => {
      const template = this.templateDao.getTemplate(object.template_id);
      if (!template) {
        MainNotificationService.warning(
          `Шаблон для объекта "${object.name}" не найден и объект будет пропущен.`,
        );
        return;
      }

      const allEntityId = this.connectionDao.findEntityId(
        EntityType.WorldObject,
        object.id,
      );
      if (!allEntityId) {
        MainNotificationService.warning(
          `Сущность для объекта "${object.name}" не найдена и объект будет пропущен.`,
        );
        return;
      }

      const namespacedTemplateName = `[${projectName}] ${template.name}`;

      if (!templatesToExport.has(template.id)) {
        try {
          const fields = JSON.parse(template.fields_schema);
          templatesToExport.set(template.id, {
            name: namespacedTemplateName,
            category: EntityType.WorldObject,
            fields,
          });
        } catch {
          MainNotificationService.error(
            `Ошибка парсинга схемы для шаблона "${template.name}". Шаблон не будет экспортирован.`,
          );
          return;
        }
      }

      allEntityIdToLocalIdMap.set(allEntityId, localIdCounter);
      exportedWorldObjects.push({
        localId: localIdCounter,
        templateName: namespacedTemplateName,
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
      version: '1.0', // Версия не меняется по запросу пользователя
      type: 'WriterWorldBuilder-Export',
      sourceProjectName: projectName,
      templates: {
        world_templates: Array.from(templatesToExport.values()),
      },
      worldObjects: exportedWorldObjects,
      connections: exportedConnections, // <-- Добавлено
    };

    return JSON.stringify(exportFile, null, 2);
  }
}

export default ImportExportService;
