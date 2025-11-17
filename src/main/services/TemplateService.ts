import GenericDao from '../data/GenericDao';
import { EntityTemplate } from '../../common/types';

/**
 * Сервис для управления шаблонами (типами) объектов.
 */
export class TemplateService {
  private dao: GenericDao;

  constructor(dao: GenericDao) {
    this.dao = dao;
  }

  /**
   * Генерирует уникальное системное имя для поля.
   * @returns {string} Уникальное имя (например, "field_1678886400000_a1b2c3d4e")
   */
  private static generateFieldName(): string {
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `field_${Date.now()}_${randomPart}`;
  }

  createTemplate(
    name: string,
    category: 'narrative' | 'world',
    fieldLabels: string[],
  ): EntityTemplate {
    const fieldsSchema = JSON.stringify(
      fieldLabels.map((label) => ({
        name: TemplateService.generateFieldName(),
        label,
      })),
    );

    const newId = this.dao.createTemplate(name, category, fieldsSchema);
    return this.dao.getTemplate(newId);
  }

  getTemplate(id: number): EntityTemplate {
    return this.dao.getTemplate(id);
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
}

export default TemplateService;
