import Database from 'better-sqlite3';
import { NarrativeItem } from '../../common/types';

/**
 * Data Access Object (DAO) для инкапсуляции всех SQL-запросов к базе данных.
 * Принимает в конструкторе активное подключение к БД.
 */
export class GenericDao {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Получает все элементы повествования из базы данных.
   * @returns {NarrativeItem[]} Массив объектов повествования.
   */
  public getNarrativeItems(): NarrativeItem[] {
    const sql =
      'SELECT id, name, parent_id, sort_order FROM narrative_items ORDER BY sort_order ASC';
    const stmt = this.db.prepare(sql);
    const items = stmt.all() as NarrativeItem[];
    return items;
  }

  // В будущем здесь будут другие методы для работы с БД:
  // - getWorlObjects()
  // - createNarrativeItem(...)
  // - updateNarrativeItem(...)
  // - и т.д.
}

export default GenericDao;
