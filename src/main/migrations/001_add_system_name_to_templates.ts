import BetterSqlite3 from 'better-sqlite3';
import { Migration } from '../../common/types';

// eslint-disable-next-line camelcase
const migration_0_2_4: Migration = {
  version: '0.2.4',
  up: (db: BetterSqlite3.Database) => {
    // Создаем временную таблицу с новой структурой
    db.exec(`
      CREATE TABLE entity_templates_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          export_name TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL,
          fields_schema TEXT,
          is_visible BOOLEAN NOT NULL DEFAULT TRUE,
          weight INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Копируем данные, генерируя export_name
    db.exec(`
      INSERT INTO entity_templates_new (id, name, export_name, category, fields_schema, is_visible, weight)
      SELECT id, name, 'template_' || id, category, fields_schema, is_visible, weight FROM entity_templates;
    `);

    // Удаляем старую таблицу
    db.exec('DROP TABLE entity_templates;');

    // Переименовываем новую в основную
    db.exec('ALTER TABLE entity_templates_new RENAME TO entity_templates;');
  },
};

// eslint-disable-next-line camelcase
export default migration_0_2_4;
