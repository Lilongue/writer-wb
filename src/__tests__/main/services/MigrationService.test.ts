import { app, dialog } from 'electron';
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import MigrationService from '../../../main/services/MigrationService';
import MainNotificationService from '../../../main/services/NotificationService';
import migrations from '../../../main/migrations';

jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(),
  },
  dialog: {
    showMessageBox: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
}));

jest.mock('../../../main/services/NotificationService', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../main/migrations', () => []);

const mockApp = app as jest.Mocked<typeof app>;
const mockDialog = dialog as jest.Mocked<typeof dialog>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockNotifications = MainNotificationService as jest.Mocked<
  typeof MainNotificationService
>;
const mockMigrations = migrations as { version: string; up: jest.Mock }[];

describe('MigrationService', () => {
  let db: BetterSqlite3.Database;
  let mockExec: jest.Mock;
  let mockTransaction: jest.Mock;
  let mockPrepare: jest.Mock;
  let mockBackup: jest.Mock;
  let mockRun: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMigrations.length = 0; // Reset migrations array before each test

    mockRun = jest.fn();
    mockExec = jest.fn();
    mockBackup = jest.fn();
    // Mock transaction to return a function that, when called, executes the callback
    mockTransaction = jest.fn((cb) => () => cb());
    mockPrepare = jest.fn((sql: string) => {
      if (sql.includes('PRAGMA foreign_key_check')) {
        return {
          all: jest.fn().mockReturnValue([]),
        };
      }
      return {
        run: mockRun,
        all: jest.fn(),
        get: jest.fn(),
      };
    });

    db = {
      exec: mockExec,
      transaction: mockTransaction,
      prepare: mockPrepare,
      backup: mockBackup,
    } as unknown as BetterSqlite3.Database;
  });

  it('should do nothing if project version is greater or equal to app version', async () => {
    mockApp.getVersion.mockReturnValue('1.0.0');
    const service = new MigrationService(db, '/fake/path', '1.0.0');

    const result = await service.migrate();

    expect(result).toBe(true);
    expect(mockNotifications.info).toHaveBeenCalledWith(
      'Миграция не требуется',
      'Версия проекта актуальна.',
    );
    expect(mockDialog.showMessageBox).not.toHaveBeenCalled();
    expect(mockBackup).not.toHaveBeenCalled();
  });

  it('should update version and return if no migrations are found', async () => {
    mockApp.getVersion.mockReturnValue('1.1.0');
    const service = new MigrationService(db, '/fake/path', '1.0.0');

    const result = await service.migrate();

    expect(result).toBe(true);
    expect(mockNotifications.info).toHaveBeenCalledWith(
      'Миграция не требуется',
      'Не найдено подходящих скриптов для обновления.',
    );
    expect(mockDialog.showMessageBox).not.toHaveBeenCalled();
    expect(mockBackup).not.toHaveBeenCalled();
    expect(mockPrepare).toHaveBeenCalledWith(
      'UPDATE project_settings SET value = ? WHERE key = ?',
    );
    expect(mockRun).toHaveBeenCalledWith('1.1.0', 'project.version');
  });

  it('should return false if user cancels the migration dialog', async () => {
    mockApp.getVersion.mockReturnValue('1.1.0');
    mockMigrations.push({ version: '1.1.0', up: jest.fn() });
    mockDialog.showMessageBox.mockResolvedValue({
      response: 1,
      checkboxChecked: false,
    });
    const service = new MigrationService(db, '/fake/path', '1.0.0');

    const result = await service.migrate();

    expect(result).toBe(false);
    expect(mockDialog.showMessageBox).toHaveBeenCalled();
    expect(mockBackup).not.toHaveBeenCalled();
  });

  it('should return false and notify on backup failure', async () => {
    mockApp.getVersion.mockReturnValue('1.1.0');
    mockMigrations.push({ version: '1.1.0', up: jest.fn() });
    mockDialog.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false,
    });
    mockBackup.mockImplementation(() => {
      throw new Error('Backup failed');
    });
    const service = new MigrationService(db, '/fake/path', '1.0.0');

    const result = await service.migrate();

    expect(result).toBe(false);
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(
      path.join('/fake/path', 'backups'),
      {
        recursive: true,
      },
    );
    expect(mockNotifications.error).toHaveBeenCalledWith(
      'Ошибка резервного копирования',
      expect.stringContaining(
        'Не удалось создать резервную копию базы данных. Миграция отменена.',
      ),
    );
  });

  it('should apply a single migration successfully', async () => {
    mockApp.getVersion.mockReturnValue('1.1.0');
    const migration110 = { version: '1.1.0', up: jest.fn() };
    mockMigrations.push(migration110);
    mockDialog.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false,
    });

    const service = new MigrationService(db, '/fake/path', '1.0.0');
    const result = await service.migrate();

    expect(result).toBe(true);
    expect(mockBackup).toHaveBeenCalled();
    expect(mockExec).toHaveBeenCalledWith('PRAGMA foreign_keys = OFF;');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(migration110.up).toHaveBeenCalledWith(db);
    // Version updated inside transaction, then at the end
    expect(mockRun).toHaveBeenCalledWith('1.1.0', 'project.version');
    expect(mockPrepare).toHaveBeenCalledWith('PRAGMA foreign_key_check;');
    expect(mockExec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
    expect(mockRun).toHaveBeenCalledTimes(2); // once in transaction, once at the end
  });

  it('should return false on migration script failure', async () => {
    mockApp.getVersion.mockReturnValue('1.1.0');
    const migrationError = new Error('Migration script failed');
    const migration110 = {
      version: '1.1.0',
      up: jest.fn(() => {
        throw migrationError;
      }),
    };
    mockMigrations.push(migration110);
    mockDialog.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false,
    });

    const service = new MigrationService(db, '/fake/path', '1.0.0');
    const result = await service.migrate();

    expect(result).toBe(false);
    expect(migration110.up).toHaveBeenCalled();
    expect(mockNotifications.error).toHaveBeenCalledWith(
      'Ошибка миграции',
      `Ошибка при применении миграции до версии 1.1.0: ${String(
        migrationError,
      )}`,
    );
    // Ensure foreign keys are re-enabled even on failure
    expect(mockExec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
  });

  it('should return false if foreign key check fails after migration', async () => {
    mockApp.getVersion.mockReturnValue('1.1.0');
    mockMigrations.push({ version: '1.1.0', up: jest.fn() });
    mockDialog.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false,
    });

    // Mock foreign_key_check to return an error
    const fkError = [{ table: 'child', rowid: 1, parent: 'parent', fkid: 1 }];
    mockPrepare.mockImplementation((sql: string) => {
      if (sql.includes('PRAGMA foreign_key_check')) {
        return {
          all: jest.fn().mockReturnValue(fkError),
        };
      }
      return { run: mockRun };
    });

    const service = new MigrationService(db, '/fake/path', '1.0.0');
    const result = await service.migrate();

    expect(result).toBe(false);
    expect(mockNotifications.error).toHaveBeenCalledWith(
      'Ошибка целостности данных',
      `После миграции нарушена целостность внешних ключей: ${JSON.stringify(fkError)}`,
    );
  });

  it('should apply multiple migrations in correct order', async () => {
    mockApp.getVersion.mockReturnValue('1.3.0');
    const migration110 = { version: '1.1.0', up: jest.fn() };
    const migration120 = { version: '1.2.0', up: jest.fn() };
    const migration130 = { version: '1.3.0', up: jest.fn() };

    // Push migrations out of order to ensure sorting works
    mockMigrations.push(migration120, migration130, migration110);
    mockDialog.showMessageBox.mockResolvedValue({
      response: 0,
      checkboxChecked: false,
    });

    const service = new MigrationService(db, '/fake/path', '1.0.0');
    const result = await service.migrate();

    expect(result).toBe(true);
    expect(mockBackup).toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalledTimes(3); // One for each migration

    // Ensure migrations are applied in correct semantic version order
    expect(migration110.up).toHaveBeenCalledWith(db);
    expect(migration120.up).toHaveBeenCalledWith(db);
    expect(migration130.up).toHaveBeenCalledWith(db);

    // Verify the order of calls. This is a bit tricky with transaction mock
    // as it calls cb immediately. We can check the `mockRun` calls for version updates.
    expect(mockRun).toHaveBeenNthCalledWith(1, '1.1.0', 'project.version');
    expect(mockRun).toHaveBeenNthCalledWith(2, '1.2.0', 'project.version');
    expect(mockRun).toHaveBeenNthCalledWith(3, '1.3.0', 'project.version');
    expect(mockRun).toHaveBeenNthCalledWith(4, '1.3.0', 'project.version'); // Final update
  });
});
