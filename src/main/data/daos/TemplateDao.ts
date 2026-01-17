import { EntityTemplate } from '../../../common/types';
import { BaseDao } from './BaseDao';

export class TemplateDao extends BaseDao {
  /**
   * Получает шаблон объекта по его ID.
   * @param {number} id ID шаблона.
   * @returns {EntityTemplate} Объект шаблона.
   */
  public getTemplateById(id: number): any {
    const db = this.getDb();
    const sql = 'SELECT * FROM entity_templates WHERE id = ?';
    const stmt = db.prepare(sql);
    return stmt.get(id);
  }

  /**
   * Находит шаблон по его имени и категории.
   * @param {string} name Имя шаблона.
   * @param {'narrative' | 'world'} category Категория шаблона.
   * @returns {EntityTemplate | undefined} Объект шаблона или undefined, если не найдено.
   */
  public findTemplateByName(
    name: string,
    category: 'narrative' | 'world',
  ): { id: number } | undefined {
    const db = this.getDb();
    const sql =
      'SELECT id FROM entity_templates WHERE name = ? AND category = ?';
    const stmt = db.prepare(sql);
    return stmt.get(name, category) as { id: number } | undefined;
  }

  /**
   * Создает новый шаблон сущности.
   * @param {string} name Название шаблона.
   * @param {'narrative' | 'world'} category Категория шаблона ('narrative' или 'world').
   * @param {string} fieldsSchema JSON-схема полей шаблона.
   * @param {number} weight Вес для сортировки.
   * @returns {number} ID созданного шаблона.
   */
  public createTemplate(
    name: string,
    category: 'narrative' | 'world',
    fieldsSchema: string,
    weight: number = 0,
  ): number {
    const db = this.getDb();
    const stmt = db.prepare(
      'INSERT INTO entity_templates (name, category, fields_schema, weight) VALUES (?, ?, ?, ?)',
    );
    const info = stmt.run(name, category, fieldsSchema, weight);
    return info.lastInsertRowid as number;
  }

  /**
   * Получает шаблон сущности по ID.
   * @param {number} id ID шаблона.
   * @returns {EntityTemplate} Объект шаблона сущности.
   */
  public getTemplate(id: number): EntityTemplate {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM entity_templates WHERE id = ?');
    return stmt.get(id) as EntityTemplate;
  }

  /**
   * Получает все шаблоны сущностей.
   * @param {boolean} includeArchived Включать ли архивированные шаблоны.
   * @param {'narrative' | 'world' | undefined} category Фильтр по категории.
   * @returns {EntityTemplate[]} Список шаблонов сущностей.
   */
  public getAllTemplates(
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
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const stmt = db.prepare(query);
    return stmt.all(...params) as EntityTemplate[];
  }

  /**
   * Переключает видимость шаблона сущности по ID (архивация/восстановление).
   * @param {number} id ID шаблона.
   */
  public toggleTemplateVisibility(id: number): boolean {
    const db = this.getDb();
    const stmt = db.prepare(
      'UPDATE entity_templates SET is_visible = 1 - is_visible WHERE id = ?',
    );
    const info = stmt.run(id);
    return info.changes > 0;
  }

  /**
   * Переименовывает шаблон сущности по ID.
   * @param {number} id ID шаблона.
   * @param {string} newName Новое название шаблона.
   */
  public renameTemplate(id: number, newName: string): void {
    const db = this.getDb();
    const stmt = db.prepare(
      'UPDATE entity_templates SET name = ? WHERE id = ?',
    );
    stmt.run(newName, id);
  }

  /**
   * Обновляет схему полей для шаблона.
   * @param {number} id ID шаблона.
   * @param {string} schemaJson Новая схема в формате JSON.
   */
  public updateTemplateSchema(id: number, schemaJson: string): void {
    const db = this.getDb();
    const stmt = db.prepare(
      'UPDATE entity_templates SET fields_schema = ? WHERE id = ?',
    );
    stmt.run(schemaJson, id);
  }
}

export default TemplateDao;
