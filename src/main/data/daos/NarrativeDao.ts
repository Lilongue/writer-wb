import { NarrativeItem } from '../../../common/types';
import { BaseDao } from './BaseDao';

export class NarrativeDao extends BaseDao {
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
        ni.template_id
      FROM narrative_items ni
      ORDER BY ni.sort_order ASC
    `;
    const stmt = db.prepare(sql);
    const items = stmt.all() as NarrativeItem[];
    return items;
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
}
