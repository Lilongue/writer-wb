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
        ni.title,
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
    const sql =
      'SELECT id, name, title, parent_id, sort_order, file_path, description, plan, template_id FROM narrative_items WHERE id = ?';
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
   * @param {function(id: number): string} getFilePath Функция, возвращающая путь к файлу на основе ID элемента.
   * @param {number} sortOrder Порядок сортировки элемента повествования.
   * @returns {number} ID созданного элемента повествования.
   */
  public createNarrativeItem(
    name: string,
    title: string | undefined,
    parentId: number | null,
    templateId: number,
    getFilePath: (id: number) => string,
    sortOrder: number,
  ): number {
    const db = this.getDb();
    const createTransaction = db.transaction(() => {
      // 1. Вставляем запись с пустым file_path, чтобы получить ID
      const insertSql = `
        INSERT INTO narrative_items (name, title, parent_id, template_id, file_path, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const insertInfo = db
        .prepare(insertSql)
        .run(name, title, parentId, templateId, '', sortOrder); // Временно пустой путь
      const newNarrativeId = insertInfo.lastInsertRowid as number;

      // 2. Определяем финальный file_path с использованием полученного ID
      const finalFilePath = getFilePath(newNarrativeId);

      // 3. Обновляем запись, устанавливая корректный file_path
      const updateSql = `UPDATE narrative_items SET file_path = ? WHERE id = ?`;
      db.prepare(updateSql).run(finalFilePath, newNarrativeId);

      // 4. Вставляем запись в all_entities
      const entitySql = 'INSERT INTO all_entities (narrative_id) VALUES (?)';
      db.prepare(entitySql).run(newNarrativeId);

      return newNarrativeId;
    });

    return createTransaction();
  }

  /**
   * Атомарно обновляет порядок и вложенность для нескольких элементов повествования.
   * @param updates Массив объектов для обновления.
   */
  public updateOrder(
    updates: { id: number; parent_id: number | null; sort_order: number }[],
  ): void {
    const db = this.getDb();
    const updateStmt = db.prepare(
      'UPDATE narrative_items SET parent_id = ?, sort_order = ? WHERE id = ?',
    );

    const updateTransaction = db.transaction((items) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const item of items) {
        updateStmt.run(item.parent_id, item.sort_order, item.id);
      }
    });

    updateTransaction(updates);
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
   * @param {string | undefined} title Новый заголовок.
   * @param {string | undefined} description Новое описание (основная мысль).
   * @param {string | undefined} plan Новый план (чек-лист).
   */
  public updateNarrativeItemDetails(
    itemId: number,
    name: string,
    title: string | undefined,
    description: string | undefined,
    plan: string | undefined,
  ): void {
    const db = this.getDb();
    const sql =
      'UPDATE narrative_items SET name = ?, title = ?, description = ?, plan = ? WHERE id = ?';
    db.prepare(sql).run(name, title, description, plan, itemId);
  }

  /**
   * Удаляет элемент повествования.
   * @param {number} itemId ID элемента повествования.
   */
  public deleteNarrativeItem(itemId: number): void {
    this.deleteByIds([itemId]);
  }

  /**
   * Находит все ID дочерних элементов для данного родителя рекурсивно.
   * @param parentId ID родительского элемента.
   * @returns Массив ID всех дочерних элементов.
   */
  public findAllDescendantIds(parentId: number): number[] {
    const db = this.getDb();
    const sql = `
       WITH RECURSIVE descendants(id) AS (
         SELECT id FROM narrative_items WHERE parent_id = ?
         UNION ALL
         SELECT ni.id FROM narrative_items ni
         INNER JOIN descendants d ON ni.parent_id = d.id
       )
       SELECT id FROM descendants;
     `;
    const stmt = db.prepare(sql);
    const result = stmt.all(parentId) as { id: number }[];
    return result.map((row) => row.id);
  }

  /**
   * Получает все данные для элементов повествования по списку их ID.
   * @param ids Массив ID элементов.
   * @returns Массив объектов NarrativeItem.
   */
  public findAllByIds(ids: number[]): NarrativeItem[] {
    if (ids.length === 0) {
      return [];
    }
    const db = this.getDb();
    const placeholders = ids.map(() => '?').join(',');
    const sql = `
       SELECT id, name, title, parent_id, sort_order, file_path, description, plan, template_id
       FROM narrative_items
       WHERE id IN (${placeholders})
     `;
    const stmt = db.prepare(sql);
    return stmt.all(ids) as NarrativeItem[];
  }

  /**
   * Удаляет элементы повествования по списку их ID.
   * @param ids Массив ID для удаления.
   */
  public deleteByIds(ids: number[]): void {
    if (ids.length === 0) {
      return;
    }
    const db = this.getDb();
    const placeholders = ids.map(() => '?').join(',');
    // Записи в all_entities удалятся каскадно
    const sql = `DELETE FROM narrative_items WHERE id IN (${placeholders})`;
    db.prepare(sql).run(...ids);
  }

  /**
   * Получает информацию о narratrive_items по списку ID.
   * @param {number[]} ids Список ID narratrive_items.
   * @returns Список объектов с ID и именем.
   */
  public getNarrativeItemsInfo(
    ids: number[],
  ): { id: number; name: string; title?: string }[] {
    if (ids.length === 0) {
      return [];
    }
    const db = this.getDb();
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT id, name, title FROM narrative_items WHERE id IN (${placeholders})`;
    return db.prepare(sql).all(ids) as {
      id: number;
      name: string;
      title?: string;
    }[];
  }
}

export default NarrativeDao;
