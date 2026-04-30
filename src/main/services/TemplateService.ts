import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { TemplateDao } from '../data/daos/TemplateDao';
import { WorldObjectDao } from '../data/daos/WorldObjectDao';
import {
  EntityTemplate,
  PredefinedTemplate,
  PredefinedWorldTemplate,
  PredefinedNarrativeTemplate,
  PredefinedTemplatesFile,
  EntityType,
} from '../../common/types';
import MainNotificationService from './NotificationService';

/**
 * Сервис для управления шаблонами (типами) объектов.
 */
export class TemplateService {
  private templateDao: TemplateDao;

  private worldObjectDao: WorldObjectDao;

  constructor(templateDao: TemplateDao, worldObjectDao: WorldObjectDao) {
    this.templateDao = templateDao;
    this.worldObjectDao = worldObjectDao;
  }

  /**
   * Возвращает корректный путь к файлу с ресурсами (assets).
   * В режиме разработки и в собранном приложении пути различаются.
   * @param filename - имя файла внутри директории assets
   */
  private static getAssetPath(filename: string): string {
    if (app.isPackaged) {
      // Путь в собранном приложении (production)
      // process.resourcesPath указывает на директорию resources
      return path.join(process.resourcesPath, 'assets', filename);
    }
    // Путь в режиме разработки (development)
    return path.join(app.getAppPath(), 'assets', filename);
  }

  /**
   * Генерирует уникальное системное имя для поля.
   * @returns {string} Уникальное имя (например, "field_1678886400000_a1b2c3d4e")
   */
  private static generateFieldName(): string {
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `field_${Date.now()}_${randomPart}`;
  }

  static async getPredefinedNarrativeTemplates(): Promise<
    PredefinedNarrativeTemplate[]
  > {
    const filePath = TemplateService.getAssetPath('predefined-templates.json');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as PredefinedTemplatesFile;
      // Сортируем по убыванию веса, чтобы более крупные сущности были вверху
      return (data.narrative_templates || []).sort(
        (a, b) => b.weight - a.weight,
      );
    } catch (error) {
      MainNotificationService.error(
        `Ошибка чтения файла предустановленных шаблонов нарратива:`,
        String(error),
      );
      return [];
    }
  }

  static async getPredefinedTemplates(): Promise<PredefinedWorldTemplate[]> {
    const filePath = TemplateService.getAssetPath('predefined-templates.json');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as PredefinedTemplatesFile;
      return data.world_templates || [];
    } catch (error) {
      MainNotificationService.error(
        'Ошибка чтения файла предустановленных шаблонов:',
        String(error),
      );
      return [];
    }
  }

  async importTemplate(
    templateData: PredefinedTemplate,
  ): Promise<EntityTemplate> {
    const { name, category, fields } = templateData;
    const nameToStore =
      templateData.category === EntityType.Narrative
        ? templateData.label
        : name;

    const fieldsSchema = JSON.stringify(fields);

    // Вес есть только у шаблонов повествования
    const weight =
      templateData.category === EntityType.Narrative ? templateData.weight : 0;

    const newId = this.templateDao.createTemplate(
      nameToStore,
      category,
      fieldsSchema,
      weight,
    );
    return this.templateDao.getTemplate(newId);
  }

  createTemplate(
    name: string,
    category: EntityType,
    fields: { label: string; comment?: string }[],
    weight: number = 0,
  ): EntityTemplate {
    const fieldsSchema = JSON.stringify(
      fields.map((field) => ({
        name: TemplateService.generateFieldName(),
        label: field.label,
        comment: field.comment,
      })),
    );

    const newId = this.templateDao.createTemplate(
      name,
      category,
      fieldsSchema,
      weight,
    );
    return this.templateDao.getTemplate(newId);
  }

  getTemplate(id: number): EntityTemplate {
    return this.templateDao.getTemplate(id);
  }

  /**
   * Получает все шаблоны повествования, отсортированные по весу.
   * @returns {EntityTemplate[]} Отсортированный список шаблонов повествования.
   */
  getNarrativeTemplates(): EntityTemplate[] {
    const templates = this.templateDao.getAllTemplates(
      false,
      EntityType.Narrative,
    );
    // Сортировка по убыванию: чем больше вес, тем "выше" уровень (например, Книга > Часть)
    return templates.sort((a, b) => b.weight - a.weight);
  }

  getAllTemplates(
    includeArchived: boolean = false,
    category: EntityType | undefined = undefined,
  ): EntityTemplate[] {
    return this.templateDao.getAllTemplates(includeArchived, category);
  }

  toggleTemplateVisibility(id: number): boolean {
    const count = this.worldObjectDao.countWorldObjectsByTemplateId(id);
    if (count > 0) {
      MainNotificationService.error(
        `Этот шаблон используется ${count} объектом(ами) и не может быть заархивирован.`,
      );
      return false;
    }
    return this.templateDao.toggleTemplateVisibility(id);
  }

  renameTemplate(id: number, newName: string): void {
    this.templateDao.renameTemplate(id, newName);
  }

  updateTemplateSchema(
    id: number,
    fields: { name?: string; label: string; comment?: string }[],
  ): EntityTemplate {
    const finalSchema = fields.map((field) => {
      return {
        name: field.name || TemplateService.generateFieldName(),
        label: field.label,
        comment: field.comment,
      };
    });

    this.templateDao.updateTemplateSchema(id, JSON.stringify(finalSchema));

    return this.getTemplate(id);
  }
}

export default TemplateService;
