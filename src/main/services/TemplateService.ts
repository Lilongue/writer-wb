/* eslint-disable no-console */
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
// eslint-disable-next-line import/no-named-as-default
import GenericDao from '../data/GenericDao';
import {
  EntityTemplate,
  PredefinedTemplate,
  PredefinedTemplatesFile,
} from '../../common/types';

/**
 * Сервис для управления шаблонами (типами) объектов.
 */
export class TemplateService {
  private dao: GenericDao;

  constructor(dao: GenericDao) {
    this.dao = dao;
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

  static async getPredefinedTemplates(): Promise<PredefinedTemplate[]> {
    const filePath = TemplateService.getAssetPath('predefined-templates.json');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as PredefinedTemplatesFile;
      return data.world_templates || [];
    } catch (error) {
      console.error('Failed to read predefined templates file:', error);
      return [];
    }
  }

  async importTemplate(
    templateData: PredefinedTemplate,
  ): Promise<EntityTemplate> {
    const { name, category, fields } = templateData;

    // Просто преобразуем массив полей в JSON-строку как есть,
    // так как структура полностью соответствует `fields_schema`.
    const fieldsSchema = JSON.stringify(fields);

    // HACK: PredefinedTemplate isn't typed with weight, but we know it's there for narrative templates
    const weight = (templateData as any).weight || 0;

    const newId = this.dao.createTemplate(name, category, fieldsSchema, weight);
    return this.dao.getTemplate(newId);
  }

  createTemplate(
    name: string,
    category: 'narrative' | 'world',
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

    const newId = this.dao.createTemplate(name, category, fieldsSchema, weight);
    return this.dao.getTemplate(newId);
  }

  getTemplate(id: number): EntityTemplate {
    return this.dao.getTemplate(id);
  }

  /**
   * Получает все шаблоны повествования, отсортированные по весу.
   * @returns {EntityTemplate[]} Отсортированный список шаблонов повествования.
   */
  getNarrativeTemplates(): EntityTemplate[] {
    const templates = this.dao.getAllTemplates(false, 'narrative');
    // Сортировка по убыванию: чем больше вес, тем "выше" уровень (например, Книга > Часть)
    return templates.sort((a, b) => b.weight - a.weight);
  }

  getAllTemplates(
    includeArchived: boolean = false,
    category: 'narrative' | 'world' | undefined = undefined,
  ): EntityTemplate[] {
    return this.dao.getAllTemplates(includeArchived, category);
  }

  archiveTemplate(id: number): boolean {
    const count = this.dao.countWorldObjectsByTemplateId(id);
    if (count > 0) {
      throw new Error(
        `Нельзя архивировать шаблон, так как он используется ${count} объектом(ами).`,
      );
    }
    const success = this.dao.archiveTemplate(id);
    if (!success) {
      throw new Error('Шаблон не найден или уже архивирован');
    }
    return success;
  }

  renameTemplate(id: number, newName: string): void {
    this.dao.renameTemplate(id, newName);
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

    this.dao.updateTemplateSchema(id, JSON.stringify(finalSchema));

    return this.getTemplate(id);
  }
}

export default TemplateService;
