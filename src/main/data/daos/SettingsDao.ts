import { ProjectSetting } from '../../../common/types';
import { BaseDao } from './BaseDao';

export class SettingsDao extends BaseDao {
  // ----------------- Project Settings -----------------

  /**
   * Получает все настройки проекта из базы данных.
   * @returns {ProjectSetting[]} Массив объектов ProjectSetting.
   */
  public getAllProjectSettings(): ProjectSetting[] {
    const db = this.getDb();
    const sql =
      'SELECT key, value, name, description, category, type FROM project_settings';
    return db.prepare(sql).all() as ProjectSetting[];
  }

  /**
   * Обновляет значения нескольких настроек проекта.
   * @param {Array<{ key: string; value: string }>} settings Массив объектов с ключом и новым значением.
   */
  public updateProjectSettings(
    settings: { key: string; value: string }[],
  ): void {
    const db = this.getDb();
    const updateStmt = db.prepare(
      'UPDATE project_settings SET value = ? WHERE key = ?',
    );
    const transaction = db.transaction(() => {
      settings.forEach((setting) => {
        updateStmt.run(setting.value, setting.key);
      });
    });
    transaction();
  }
}
