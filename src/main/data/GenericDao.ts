import Database from 'better-sqlite3';
import {
  NarrativeItem,
  RawConnection,
  ResolvedEntity,
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
    category: 'narrative' | 'world',
  ): { id: number } | undefined {
    const db = this.getDb();
    const sql =
      'SELECT id FROM entity_templates WHERE name = ? AND category = ?';
    const stmt = db.prepare(sql);
    return stmt.get(name, category) as { id: number } | undefined;
  }

  public getMaxSortOrder(parentId: number | null): number {
    const db = this.getDb();
    const sql =
      'SELECT MAX(sort_order) as max_sort FROM narrative_items WHERE parent_id = ?';
    const result = db.prepare(sql).get(parentId) as {
      max_sort: number | null;
    };
    return result && typeof result.max_sort === 'number' ? result.max_sort : -1;
  }

  public countChildrenOfNarrativeItem(itemId: number): number {
    const db = this.getDb();
    const countSql =
      'SELECT COUNT(*) as count FROM narrative_items WHERE parent_id = ?';
    const result = db.prepare(countSql).get(itemId) as { count: number };
    return result.count;
  }

  public createNarrativeItem(
    name: string,
    parentId: number | null,
    templateId: number,
    filePath: string,
    sortOrder: number,
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

  public createWorldObject(
    name: string,
    templateId: number,
    properties: string,
  ): number {
    const db = this.getDb();
    const createTransaction = db.transaction(() => {
      const worldObjectSql = `
        INSERT INTO world_objects (name, template_id, properties)
        VALUES (?, ?, ?)
      `;
      const info = db.prepare(worldObjectSql).run(name, templateId, properties);
      const newWorldObjectId = info.lastInsertRowid as number;

      const entitySql = 'INSERT INTO all_entities (world_object_id) VALUES (?)';
      db.prepare(entitySql).run(newWorldObjectId);

      return newWorldObjectId;
    });

    return createTransaction();
  }

  public updateWorldObject(id: number, name: string, properties: string): void {
    const db = this.getDb();
    const sql =
      'UPDATE world_objects SET name = ?, properties = ? WHERE id = ?';
    db.prepare(sql).run(name, properties, id);
  }

  public deleteWorldObject(id: number): void {
    const db = this.getDb();
    // Запись в all_entities удалится каскадно
    const sql = 'DELETE FROM world_objects WHERE id = ?';
    db.prepare(sql).run(id);
  }

  public searchEntities(query: string, currentEntityId: number) {
    const db = this.getDb();
    const searchQuery = `%${query}%`;

    const narrativeItems = db
      .prepare(
        `SELECT
          'narrative' as type,
          ni.id,
          ni.name,
          ae.id as entityId
        FROM narrative_items ni
        JOIN all_entities ae ON ni.id = ae.narrative_id
        WHERE ni.name LIKE ? AND ae.id != ?`,
      )
      .all(searchQuery, currentEntityId);

    const worldObjects = db
      .prepare(
        `SELECT
          'world' as type,
          wo.id,
          wo.name,
          ae.id as entityId
        FROM world_objects wo
        JOIN all_entities ae ON wo.id = ae.world_object_id
        WHERE wo.name LIKE ? AND ae.id != ?`,
      )
      .all(searchQuery, currentEntityId);

    return [...narrativeItems, ...worldObjects];
  }

  public findEntityId(type: 'narrative' | 'world', id: number): number | null {
    const db = this.getDb();
    const column = type === 'narrative' ? 'narrative_id' : 'world_object_id';
    const sql = `SELECT id FROM all_entities WHERE ${column} = ?`;
    const result = db.prepare(sql).get(id) as { id: number } | undefined;
    return result?.id ?? null;
  }

  public getConnections(allEntityId: number): RawConnection[] {
    const db = this.getDb();
    const sql = `
      SELECT id, description, source_id, target_id
      FROM connections
      WHERE source_id = ? OR target_id = ?
    `;
    return db.prepare(sql).all(allEntityId, allEntityId) as RawConnection[];
  }

  public resolveAllEntityIds(allEntityIds: number[]): ResolvedEntity[] {
    if (allEntityIds.length === 0) {
      return [];
    }
    const db = this.getDb();
    const placeholders = allEntityIds.map(() => '?').join(',');
    const sql = `
        SELECT
          id as allEntityId,
          COALESCE(world_object_id, narrative_id) as id,
          CASE
            WHEN world_object_id IS NOT NULL THEN 'world'
            ELSE 'narrative'
          END as type
        FROM all_entities
        WHERE id IN (${placeholders})
      `;
    return db.prepare(sql).all(allEntityIds) as ResolvedEntity[];
  }

  public getNarrativeItemsInfo(ids: number[]): { id: number; name: string }[] {
    if (ids.length === 0) {
      return [];
    }
    const db = this.getDb();
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT id, name FROM narrative_items WHERE id IN (${placeholders})`;
    return db.prepare(sql).all(ids) as { id: number; name: string }[];
  }

  public getWorldObjectsInfo(ids: number[]): { id: number; name: string }[] {
    if (ids.length === 0) {
      return [];
    }
    const db = this.getDb();
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT id, name FROM world_objects WHERE id IN (${placeholders})`;
    return db.prepare(sql).all(ids) as { id: number; name: string }[];
  }

  public createConnection(
    sourceAllId: number,
    targetAllId: number,
    description: string,
  ): number {
    const db = this.getDb();
    const sql =
      'INSERT INTO connections (source_id, target_id, description) VALUES (?, ?, ?)';
    const result = db.prepare(sql).run(sourceAllId, targetAllId, description);
    return result.lastInsertRowid as number;
  }

  public deleteConnection(connectionId: number): void {
    const db = this.getDb();
    const sql = 'DELETE FROM connections WHERE id = ?';
    db.prepare(sql).run(connectionId);
  }
}

export default GenericDao;
