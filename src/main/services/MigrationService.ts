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

    if (semver.gte(this.projectVersion, appVersion)) {
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
        const transaction = this.db.transaction(() => {
          migration.up(this.db);
          this.updateProjectVersion(migration.version);
        });
        transaction();
        return true;
      } catch (error) {
        MainNotificationService.error(
          'Ошибка миграции',
          `Ошибка при применении миграции до версии ${migration.version}: ${String(error)}`,
        );
        return false;
      }
    });

    if (!allApplied) {
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
    const dbPath = this.db.name;
    const backupPath = path.join(backupDir, backupFileName);

    fs.copyFileSync(dbPath, backupPath);
  }
}

export default MigrationService;
