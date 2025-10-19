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
    const sql =
      'SELECT id, name, parent_id, sort_order FROM narrative_items ORDER BY sort_order ASC';
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

  // В будущем здесь будут другие методы для работы с БД:
  // - createNarrativeItem(...)
  // - updateNarrativeItem(...)
  // - и т.д.
}

export default GenericDao;
