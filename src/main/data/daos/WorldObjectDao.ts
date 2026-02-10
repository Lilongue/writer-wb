import { WorldObject, WorldObjectType } from '../../../common/types';
import { BaseDao } from './BaseDao';

export class WorldObjectDao extends BaseDao {
  /**
   * Получает все типы объектов мира (например, "Персонаж", "Локация").
   * @returns {WorldObjectType[]} Массив типов объектов мира.
   */
  public getWorldObjectTypes(): WorldObjectType[] {
    const db = this.getDb();
    const sql = `
        SELECT id, name
        FROM entity_templates
        WHERE category = 'world' AND is_visible = TRUE
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
}

export default WorldObjectDao;
