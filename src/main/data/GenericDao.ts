import Database from 'better-sqlite3';
import {
  EntityTemplate,
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
        ni.file_path,
        ni.description,
        ni.plan,
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
        WHERE category = 'world' AND is_visible = 1
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

  /**
   * Получает элемент повествования по его ID.
   * @param {number} id ID элемента повествования.
   * @returns {NarrativeItem} Объект элемента повествования.
   */
  public getNarrativeItemById(id: number): NarrativeItem {
    const db = this.getDb();
    const sql = 'SELECT * FROM narrative_items WHERE id = ?';
    const stmt = db.prepare(sql);
    return stmt.get(id) as NarrativeItem;
  }

  /**
   * Получает объект мира по его ID.
   * @param {number} id ID объекта мира.
   * @returns {WorldObject} Объект мира.
   */
  public getWorldObjectById(id: number): WorldObject {
    const db = this.getDb();
    const sql = 'SELECT * FROM world_objects WHERE id = ?';
    const stmt = db.prepare(sql);
    return stmt.get(id) as WorldObject;
  }

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
   * Получает максимальный порядок сортировки для дочерних элементов.
   * @param {number | null} parentId ID родительского элемента повествования.
   * @returns {number} Максимальный порядок сортировки.
   */
  public getMaxSortOrder(parentId: number | null): number {
    const db = this.getDb();
    const sql =
      'SELECT MAX(sort_order) as max_sort FROM narrative_items WHERE parent_id = ?';
    const result = db.prepare(sql).get(parentId) as {
      max_sort: number | null;
    };
    return result && typeof result.max_sort === 'number' ? result.max_sort : -1;
  }

  /**
   * Подсчитывает количество дочерних элементов для заданного элемента повествования.
   * @param {number} itemId ID элемента повествования.
   * @returns {number} Количество дочерних элементов.
   */
  public countChildrenOfNarrativeItem(itemId: number): number {
    const db = this.getDb();
    const countSql =
      'SELECT COUNT(*) as count FROM narrative_items WHERE parent_id = ?';
    const result = db.prepare(countSql).get(itemId) as { count: number };
    return result.count;
  }

  /**
   * Создает новый элемент повествования.
   * @param {string} name Имя элемента повествования.
   * @param {number | null} parentId ID родительского элемента повествования.
   * @param {number} templateId ID шаблона элемента повествования.
   * @param {string} filePath Путь к файлу элемента повествования.
   * @param {number} sortOrder Порядок сортировки элемента повествования.
   * @returns {number} ID созданного элемента повествования.
   */
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

  /**
   * Переименовывает элемент повествования.
   * @param {number} itemId ID элемента повествования.
   * @param {string} newName Новое имя элемента повествования.
   */
  public renameNarrativeItem(itemId: number, newName: string): void {
    const db = this.getDb();
    const sql = 'UPDATE narrative_items SET name = ? WHERE id = ?';
    db.prepare(sql).run(newName, itemId);
  }

  /**
   * Обновляет детали элемента повествования (имя, описание, план).
   * @param {number} itemId ID элемента повествования.
   * @param {string} name Новое имя элемента.
   * @param {string | undefined} description Новое описание (основная мысль).
   * @param {string | undefined} plan Новый план (чек-лист).
   */
  public updateNarrativeItemDetails(
    itemId: number,
    name: string,
    description: string | undefined,
    plan: string | undefined,
  ): void {
    const db = this.getDb();
    const sql =
      'UPDATE narrative_items SET name = ?, description = ?, plan = ? WHERE id = ?';
    db.prepare(sql).run(name, description, plan, itemId);
  }

  /**
   * Удаляет элемент повествования.
   * @param {number} itemId ID элемента повествования.
   */
  public deleteNarrativeItem(itemId: number): void {
    const db = this.getDb();
    // Запись в all_entities удалится каскадно благодаря FOREIGN KEY в all_entities
    const sql = 'DELETE FROM narrative_items WHERE id = ?';
    db.prepare(sql).run(itemId);
  }

  /**
   * Создает новый объект мира.
   * @param {string} name Имя объекта мира.
   * @param {number} templateId ID шаблона объекта мира.
   * @param {string} properties Свойства объекта мира в формате JSON.
   * @returns {number} ID созданного объекта мира.
   */
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

  /**
   * Обновляет объект мира.
   * @param {number} id ID объекта мира.
   * @param {string} name Новое имя объекта мира.
   * @param {string} properties Новые свойства объекта мира в формате JSON.
   */
  public updateWorldObject(id: number, name: string, properties: string): void {
    const db = this.getDb();
    const sql =
      'UPDATE world_objects SET name = ?, properties = ? WHERE id = ?';
    db.prepare(sql).run(name, properties, id);
  }

  /**
   * Удаляет объект мира.
   * @param {number} id ID объекта мира.
   */
  public deleteWorldObject(id: number): boolean {
    const db = this.getDb();
    const sql = 'DELETE FROM world_objects WHERE id = ?';
    const info = db.prepare(sql).run(id);
    return info.changes > 0;
  }

  /**
   * Ищет сущности по имени.
   * @param {string} query Запрос для поиска.
   * @param {number} currentEntityId ID текущей сущности, исключаемой из результатов.
   * @returns {ResolvedEntity[]} Список найденных сущностей.
   */
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

  /**
   * Находит ID сущности из таблицы all_entities по типу и ID.
   * @param {string} type Тип сущности ('narrative' или 'world').
   * @param {number} id ID сущности.
   * @returns {number | null} ID сущности в таблице all_entities или null, если сущность не найдена.
   */
  public findEntityId(type: 'narrative' | 'world', id: number): number | null {
    const db = this.getDb();
    const column = type === 'narrative' ? 'narrative_id' : 'world_object_id';
    const sql = `SELECT id FROM all_entities WHERE ${column} = ?`;
    const result = db.prepare(sql).get(id) as { id: number } | undefined;
    return result?.id ?? null;
  }

  /**
   * Находит все связи, связанные с указанной сущностью.
   * @param {number} allEntityId ID сущности в таблице all_entities.
   * @returns {RawConnection[]} Список всех связей.
   */
  public getConnections(allEntityId: number): RawConnection[] {
    const db = this.getDb();
    const sql = `
      SELECT id, description, source_id, target_id
      FROM connections
      WHERE source_id = ? OR target_id = ?
    `;
    return db.prepare(sql).all(allEntityId, allEntityId) as RawConnection[];
  }

  /**
   * Получает реальные ID сущностей и их типы по списку ID из таблице all_entities.
   * @param {number[]} allEntityIds Список ID сущностей в таблице all_entities.
   * @returns {ResolvedEntity[]} Список разрешенных сущностей.
   */
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

  /**
   * Получает информацию о narratrive_items по списку ID.
   * @param {number[]} ids Список ID narratrive_items.
   * @returns Список объектов с ID и именем.
   */
  public getNarrativeItemsInfo(ids: number[]): { id: number; name: string }[] {
    if (ids.length === 0) {
      return [];
    }
    const db = this.getDb();
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT id, name FROM narrative_items WHERE id IN (${placeholders})`;
    return db.prepare(sql).all(ids) as { id: number; name: string }[];
  }

  /**
   * Получает информацию о world_objects по списку ID.
   * @param {number[]} ids Список ID world_objects.
   * @returns Список объектов с ID и именем.
   */
  public getWorldObjectsInfo(ids: number[]): { id: number; name: string }[] {
    if (ids.length === 0) {
      return [];
    }
    const db = this.getDb();
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT id, name FROM world_objects WHERE id IN (${placeholders})`;
    return db.prepare(sql).all(ids) as { id: number; name: string }[];
  }

  /**
   * Создает новую связь между двумя сущностями.
   * @param {number} sourceAllId ID исходной сущности в таблице all_entities.
   * @param {number} targetAllId ID целевой сущности в таблице all_entities.
   * @param {string} description Описание связи.
   * @returns {number} ID созданной связи.
   */
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

  /**
   * Удаляет связь по ID.
   * @param {number} connectionId ID связи.
   */
  public deleteConnection(connectionId: number): void {
    const db = this.getDb();
    const sql = 'DELETE FROM connections WHERE id = ?';
    db.prepare(sql).run(connectionId);
  }

  /**
   * Создает новый шаблон сущности.
   * @param {string} name Название шаблона.
   * @param {'narrative' | 'world'} category Категория шаблона ('narrative' или 'world').
   * @param {string} fieldsSchema JSON-схема полей шаблона.
   * @returns {number} ID созданного шаблона.
   */
  public createTemplate(
    name: string,
    category: 'narrative' | 'world',
    fieldsSchema: string,
  ): number {
    const db = this.getDb();
    const stmt = db.prepare(
      'INSERT INTO entity_templates (name, category, fields_schema) VALUES (?, ?, ?)',
    );
    const info = stmt.run(name, category, fieldsSchema);
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
   * Подсчитывает количество world_objects, связанных с заданным шаблоном.
   * @param {number} templateId ID шаблона.
   * @returns {number} Количество world_objects, связанных с шаблоном.
   */
  public countWorldObjectsByTemplateId(templateId: number): number {
    const db = this.getDb();
    const checkStmt = db.prepare(
      'SELECT COUNT(*) as count FROM world_objects WHERE template_id = ?',
    );
    const result = checkStmt.get(templateId) as { count: number };
    return result.count;
  }

  /**
   * Архивирует шаблон сущности по ID.
   * @param {number} id ID шаблона.
   */
  public archiveTemplate(id: number): boolean {
    const db = this.getDb();
    const stmt = db.prepare(
      'UPDATE entity_templates SET is_visible = 0 WHERE id = ?',
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
}

export default GenericDao;
