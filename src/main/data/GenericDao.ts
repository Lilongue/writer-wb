import Database from 'better-sqlite3';
import {
  NarrativeItem,
  WorldObject,
  WorldObjectType,
} from '../../common/types';

/**
 * Data Access Object (DAO) для инкапсуляции всех SQL-запросов к базе данных.
 * Принимает в конструкторе функцию, которая поставляет активное подключение к БД.
 */
export class GenericDao {
  private getDb: () => Database.Database;

  constructor(getDb: () => Database.Database) {
    this.getDb = getDb;
  }

  /**
   * Получает все элементы повествования из базы данных.
   * @returns {NarrativeItem[]} Массив объектов повествования.
   */
  public getNarrativeItems(): NarrativeItem[] {
    const db = this.getDb();
    const sql = `
      SELECT
        ni.id,
        ni.name,
        ni.parent_id,
        ni.sort_order,
        et.name as type
      FROM narrative_items ni
      JOIN entity_templates et ON ni.template_id = et.id
      ORDER BY ni.sort_order ASC
    `;
    const stmt = db.prepare(sql);
    const items = stmt.all() as NarrativeItem[];
    return items;
  }

  /**
   * Получает все типы объектов мира (например, "Персонаж", "Локация").
   * @returns {WorldObjectType[]} Массив типов объектов мира.
   */
  public getWorldObjectTypes(): WorldObjectType[] {
    const db = this.getDb();
    const sql = `
        SELECT id, name
        FROM entity_templates
        WHERE category = 'world'
        ORDER BY name ASC;
    `;
    const stmt = db.prepare(sql);
    return stmt.all() as WorldObjectType[];
  }

  /**
   * Получает все объекты мира для заданного типа.
   * @param {number} typeId ID типа объекта (из entity_templates).
   * @returns {WorldObject[]} Массив объектов мира.
   */
  public getWorldObjectsByTypeId(typeId: number): WorldObject[] {
    const db = this.getDb();
    const sql = `
        SELECT id, name, template_id
        FROM world_objects
        WHERE template_id = ?
        ORDER BY name ASC;
    `;
    const stmt = db.prepare(sql);
    return stmt.all(typeId) as WorldObject[];
  }

  public getNarrativeItemById(id: number): NarrativeItem {
    const db = this.getDb();
    const sql = 'SELECT * FROM narrative_items WHERE id = ?';
    const stmt = db.prepare(sql);
    return stmt.get(id) as NarrativeItem;
  }

  public getWorldObjectById(id: number): WorldObject {
    const db = this.getDb();
    const sql = 'SELECT * FROM world_objects WHERE id = ?';
    const stmt = db.prepare(sql);
    return stmt.get(id) as WorldObject;
  }

  public getTemplateById(id: number): any {
    const db = this.getDb();
    const sql = 'SELECT * FROM entity_templates WHERE id = ?';
    const stmt = db.prepare(sql);
    return stmt.get(id);
  }

  public findTemplateByName(
    name: string,
    category: 'narrative' | 'world'
  ): { id: number } | undefined {
    const db = this.getDb();
    const sql = 'SELECT id FROM entity_templates WHERE name = ? AND category = ?';
    const stmt = db.prepare(sql);
    return stmt.get(name, category) as { id: number } | undefined;
  }

  public getMaxSortOrder(parentId: number | null): number {
    const db = this.getDb();
    const sql =
      'SELECT MAX(sort_order) as max_sort FROM narrative_items WHERE parent_id = ?';
    const result = db.prepare(sql).get(parentId);
    return result && typeof result.max_sort === 'number' ? result.max_sort : -1;
  }

  public countChildrenOfNarrativeItem(itemId: number): number {
    const db = this.getDb();
    const countSql =
      'SELECT COUNT(*) as count FROM narrative_items WHERE parent_id = ?';
    const result = db.prepare(countSql).get(itemId);
    return result.count;
  }

  public createNarrativeItem(
    name: string,
    parentId: number | null,
    templateId: number,
    filePath: string,
    sortOrder: number
  ): number {
    const db = this.getDb();
    const createTransaction = db.transaction(() => {
      const narrativeSql = `
        INSERT INTO narrative_items (name, parent_id, template_id, file_path, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `;
      const info = db
        .prepare(narrativeSql)
        .run(name, parentId, templateId, filePath, sortOrder);
      const newNarrativeId = info.lastInsertRowid as number;

      const entitySql = 'INSERT INTO all_entities (narrative_id) VALUES (?)';
      db.prepare(entitySql).run(newNarrativeId);

      return newNarrativeId;
    });

    return createTransaction();
  }

  public renameNarrativeItem(itemId: number, newName: string): void {
    const db = this.getDb();
    const sql = 'UPDATE narrative_items SET name = ? WHERE id = ?';
    db.prepare(sql).run(newName, itemId);
  }

  public deleteNarrativeItem(itemId: number): void {
    const db = this.getDb();
    // Запись в all_entities удалится каскадно благодаря FOREIGN KEY в all_entities
    const sql = 'DELETE FROM narrative_items WHERE id = ?';
    db.prepare(sql).run(itemId);
  }
}

export default GenericDao;
