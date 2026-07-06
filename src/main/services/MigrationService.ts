import { app, dialog } from 'electron';
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import semver from 'semver';
import migrations from '../migrations';
import MainNotificationService from './NotificationService';

class MigrationService {
  private db: BetterSqlite3.Database;

  private projectPath: string;

  private projectVersion: string;

  constructor(
    db: BetterSqlite3.Database,
    projectPath: string,
    projectVersion: string,
  ) {
    this.db = db;
    this.projectPath = projectPath;
    this.projectVersion = projectVersion;
  }

  public async migrate(): Promise<boolean> {
    const appVersion = app.getVersion();
    MainNotificationService.info(
      'Проверка миграций',
      `Версия проекта: ${this.projectVersion}, Версия приложения: ${appVersion}`,
    );

    if (semver.gte(this.projectVersion, appVersion)) {
      MainNotificationService.info(
        'Миграция не требуется',
        'Версия проекта актуальна.',
      );
      return true;
    }

    const migrationsToApply = migrations
      .filter(
        (m) =>
          semver.gt(m.version, this.projectVersion) &&
          semver.lte(m.version, appVersion),
      )
      .sort((a, b) => semver.compare(a.version, b.version));

    if (migrationsToApply.length === 0) {
      MainNotificationService.info(
        'Миграция не требуется',
        'Не найдено подходящих скриптов для обновления.',
      );
      this.updateProjectVersion(appVersion);
      return true;
    }

    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'Обновление проекта',
      message: `Структура вашего проекта устарела (версия ${this.projectVersion}) и требует обновления до версии ${appVersion}.`,
      detail:
        'Перед началом процесса настоятельно рекомендуется сделать резервную копию проекта. Продолжить?',
      buttons: ['Продолжить', 'Отмена'],
      cancelId: 1,
    });

    if (response === 1) {
      return false;
    }

    try {
      this.backupDatabase();
    } catch (error) {
      MainNotificationService.error(
        'Ошибка резервного копирования',
        `Не удалось создать резервную копию базы данных. Миграция отменена. ${String(error)}`,
      );
      return false;
    }

    const allApplied = migrationsToApply.every((migration) => {
      try {
        // Disable FK constraints BEFORE the transaction starts.
        this.db.exec('PRAGMA foreign_keys = OFF;');

        const transaction = this.db.transaction(() => {
          migration.up(this.db);
          this.updateProjectVersion(migration.version);
        });
        transaction();

        return true;
      } catch (error) {
        MainNotificationService.error(
          'Ошибка миграции',
          `Ошибка при применении миграции до версии ${migration.version}: ${String(
            error,
          )}`,
        );
        return false;
      } finally {
        // Always re-enable foreign keys, even if the migration failed.
        this.db.exec('PRAGMA foreign_keys = ON;');
      }
    });

    if (!allApplied) {
      // TODO: Here we should ideally restore from backup. For now, we've just shown an error.
      return false;
    }

    // Run a final integrity check after all migrations are applied
    const integrityCheck = this.db.prepare('PRAGMA foreign_key_check;').all();
    if (integrityCheck.length > 0) {
      MainNotificationService.error(
        'Ошибка целостности данных',
        `После миграции нарушена целостность внешних ключей: ${JSON.stringify(
          integrityCheck,
        )}`,
      );
      // TODO: Restore from backup here as well.
      return false;
    }

    this.updateProjectVersion(appVersion);

    return true;
  }

  private updateProjectVersion(version: string) {
    const stmt = this.db.prepare(
      'UPDATE project_settings SET value = ? WHERE key = ?',
    );
    stmt.run(version, 'project.version');
  }

  private backupDatabase() {
    const backupDir = path.join(this.projectPath, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const fromVersion = this.projectVersion.replace(/\./g, '-');
    const toVersion = app.getVersion().replace(/\./g, '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const backupFileName = `migration-${fromVersion}-to-${toVersion}-${timestamp}.db.backup`;
    const backupPath = path.join(backupDir, backupFileName);

    this.db.backup(backupPath);
  }
}

export default MigrationService;
