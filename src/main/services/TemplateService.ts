import Database from 'better-sqlite3';
import { EntityTemplate } from '../../common/types';

/**
 * Сервис для управления шаблонами (типами) объектов.
 */
export class TemplateService {
  private getDb: () => Database.Database;

  constructor(getDb: () => Database.Database) {
    this.getDb = getDb;
  }

  /**
   * Генерирует уникальное системное имя для поля.
   * @returns уникальное имя (например, "field_1678886400000_a1b2c3d4e")
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

    const db = this.getDb();
    const stmt = db.prepare(
      'INSERT INTO entity_templates (name, category, fields_schema) VALUES (?, ?, ?)',
    );
    const info = stmt.run(name, category, fieldsSchema);
    const newId = info.lastInsertRowid as number;

    return this.getTemplate(newId);
  }

  getTemplate(id: number): EntityTemplate {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM entity_templates WHERE id = ?');
    return stmt.get(id) as EntityTemplate;
  }

  getAllTemplates(
    includeArchived: boolean = false,
    category: 'narrative' | 'world' | undefined = undefined,
  ): EntityTemplate[] {
    const db = this.getDb();
    let query = 'SELECT * FROM entity_templates';
    const conditions = [];
    const params: (string | number)[] = [];

    if (!includeArchived) {
      conditions.push('is_visible = 1');
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = db.prepare(query);
    return stmt.all(...params) as EntityTemplate[];
  }

  archiveTemplate(id: number): void {
    const db = this.getDb();
    // Перед архивацией проверяем, используется ли шаблон
    const checkStmt = db.prepare(
      'SELECT COUNT(*) as count FROM world_objects WHERE template_id = ?',
    );
    const result = checkStmt.get(id) as { count: number };

    if (result.count > 0) {
      throw new Error(
        `Нельзя архивировать шаблон, так как он используется ${result.count} объектом(ами).`,
      );
    }

    const stmt = db.prepare(
      'UPDATE entity_templates SET is_visible = 0 WHERE id = ?',
    );
    stmt.run(id);
  }

  renameTemplate(id: number, newName: string): void {
    const db = this.getDb();
    const stmt = db.prepare(
      'UPDATE entity_templates SET name = ? WHERE id = ?',
    );
    stmt.run(newName, id);
  }
}

export default TemplateService;
