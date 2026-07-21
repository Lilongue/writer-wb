/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
import path from 'path';
import fs from 'fs/promises';
import Database from 'better-sqlite3';
import { app } from 'electron';
import semver from 'semver';
import FileSystemService from './FileSystemService';
import { NarrativeService } from './NarrativeService';
import eventBus from '../eventBus';
import { TemplateService } from './TemplateService';
import { sanitizeFilename } from '../../common/utils/stringUtils';
import ProjectSettingsService from './ProjectSettingsService';
import { EntityType } from '../../common/types';
import MainNotificationService from './NotificationService';

// TODO: Вынести путь к схеме в конфигурацию или константы
const SCHEMA_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets', 'database', 'schema.sql')
  : path.join(app.getAppPath(), 'assets', 'database', 'schema.sql');

class ProjectService {
  private db: Database.Database | null = null;

  private projectRoot: string | null = null;

  // --- Public API ---

  public async createProject(
    projectData: {
      location: string;
      projectName: string;
      narrativeStructure: string[];
      createSubfolder: boolean;
    },
    templateService: TemplateService,
    projectSettingsService: ProjectSettingsService,
    narrativeService: NarrativeService,
  ): Promise<boolean> {
    const { location, projectName, narrativeStructure, createSubfolder } =
      projectData;
    let projectPath = location;

    if (createSubfolder) {
      const sanitizedProjectName = sanitizeFilename(projectName);
      projectPath = path.join(projectPath, sanitizedProjectName);
    }

    // Check if the location is already a project
    const isProject = await this._validateProjectStructure(projectPath);
    if (isProject) {
      MainNotificationService.error(
        'Ошибка создания проекта',
        'Выбранная папка уже является проектом. Пожалуйста, выберите другую папку.',
      );
      return false;
    }

    if (this.db) {
      this.close();
    }

    await FileSystemService.createDirectories(projectPath, [
      EntityType.Narrative,
      EntityType.WorldObject,
    ]);

    // Create the .wwb project marker file
    await fs.writeFile(path.join(projectPath, `${projectName}.wwb`), '');

    this.projectRoot = projectPath;

    const dbPath = path.join(projectPath, 'project.sqlite');
    this.db = this._initDatabase(dbPath);
    this.db.pragma('journal_mode = WAL');

    await this._applySchema(this.db);

    // 1. Получаем все предопределенные шаблоны повествования
    const allNarrativeTemplates =
      await TemplateService.getPredefinedNarrativeTemplates();

    // 2. Фильтруем их, оставляя только те, что выбрал пользователь
    const selectedTemplatesData = allNarrativeTemplates.filter((t) =>
      narrativeStructure.includes(t.name),
    );

    // 3. Импортируем выбранные шаблоны в БД и сохраняем результат
    const importedTemplates = await Promise.all(
      selectedTemplatesData.map((template) =>
        templateService.importTemplate(template),
      ),
    );

    // 4. Находим шаблон с самым большим весом (самый верхний уровень)
    if (importedTemplates.length > 0) {
      const topLevelTemplate = importedTemplates.reduce((prev, current) =>
        prev.weight > current.weight ? prev : current,
      );

      // 5. Создаем корневой элемент повествования
      await narrativeService.createNarrativeItem(
        null, // Нет родителя
        topLevelTemplate.id,
        'Произведение',
        undefined,
      );
    }

    // 6. Сохраняем настройки проекта
    await projectSettingsService.updateSettings([
      { key: 'project.name', value: projectName },
      { key: 'project.location', value: projectPath },
      { key: 'project.version', value: app.getVersion() },
      { key: 'narrative.structure', value: JSON.stringify(narrativeStructure) },
    ]);

    this.projectRoot = projectPath;
    eventBus.emit('project-opened');
    return true;
  }

  public async open(projectPath: string): Promise<boolean> {
    if (this.db) {
      this.close();
    }

    const structureIsValid = await this._validateProjectStructure(projectPath);
    if (!structureIsValid) {
      MainNotificationService.error(
        'Ошибка открытия проекта',
        'Неверная структура проекта или поврежденные файлы.',
      );
      return false;
    }

    const dbPath = path.join(projectPath, 'project.sqlite');
    this.db = this._connectToDatabase(dbPath);
    this.db.pragma('journal_mode = WAL');

    const projectVersion = this._getProjectVersion();
    const appVersion = app.getVersion();
    const isOutdated = semver.lt(projectVersion, appVersion);

    this.projectRoot = projectPath;
    if (isOutdated) {
      MainNotificationService.warning(
        'Проект открыт с устаревшей структурой',
        `Проект требует обновления. Текущая версия: ${projectVersion}, требуется: ${appVersion}. Используйте меню "Файл" -> "Обновить структуру проекта..." для миграции.`,
      );
    } else {
      MainNotificationService.info(
        'Проект открыт',
        `Проект успешно открыт по пути: ${projectPath}`,
      );
    }
    eventBus.emit('project-opened', { isOutdated });
    return true;
  }

  public close(): void {
    if (this.db) {
      this.flushDatabase(); // Ensure all data is written to disk
      this.db.close();
      this.db = null;
      this.projectRoot = null;
      MainNotificationService.info(
        'Проект закрыт',
        'Текущий проект успешно закрыт.',
      );
      eventBus.emit('project-closed');
    }
  }

  public flushDatabase(): void {
    if (this.db) {
      try {
        this.db.pragma('wal_checkpoint(RESTART)');
      } catch {
        // Optionally, notify the user that a data flush failed.
        MainNotificationService.error(
          'Ошибка синхронизации данных',
          'Не удалось принудительно сохранить изменения в файл проекта. Возможно, некоторые данные не сохранятся.',
        );
      }
    }
  }

  public getDb(): Database.Database {
    if (!this.db) {
      throw new Error('No project is currently open.');
    }
    return this.db;
  }

  public getProjectRoot(): string | null {
    return this.projectRoot;
  }

  public getProjectVersion(): string {
    return this._getProjectVersion();
  }

  public getProjectPathDetails(): {
    projectRoot: string;
    dbPath: string;
  } | null {
    if (!this.projectRoot) {
      return null;
    }
    const dbPath = path.join(this.projectRoot, 'project.sqlite');
    return { projectRoot: this.projectRoot, dbPath };
  }

  // --- Private Helpers ---

  private _initDatabase(dbPath: string): Database.Database {
    // TODO: Добавить обработку ошибок, если файл не может быть создан
    return new Database(dbPath);
  }

  private _connectToDatabase(dbPath: string): Database.Database {
    // TODO: Добавить обработку ошибок, если файл БД поврежден или не является БД
    return new Database(dbPath, { fileMustExist: true });
  }

  private async _applySchema(database: Database.Database): Promise<void> {
    // TODO: Добавить обработку ошибок, если файл схемы не найден или содержит ошибки
    const schemaSql = await fs.readFile(SCHEMA_PATH, 'utf-8');
    database.exec(schemaSql);
  }

  private async _validateProjectStructure(
    projectPath: string,
  ): Promise<boolean> {
    const dbExists = await FileSystemService.pathExists(
      path.join(projectPath, 'project.sqlite'),
    );
    const dirsExist = await FileSystemService.checkDirectoriesExist(
      projectPath,
      [EntityType.Narrative, EntityType.WorldObject],
    );
    return dbExists && dirsExist;
  }

  private _getProjectVersion(): string {
    if (!this.db) {
      // Это теоретически не должно произойти, если вызов идет из open()
      throw new Error('Database not connected.');
    }
    try {
      const stmt = this.db.prepare(
        "SELECT value FROM project_settings WHERE key = 'project.version'",
      );
      const result = stmt.get() as { value: string } | undefined;
      // Если версия не найдена, возвращаем '0.0.0' для запуска всех миграций
      return result?.value ?? '0.0.0';
    } catch (error) {
      // Если таблицы еще нет (очень старый проект), также возвращаем '0.0.0'
      MainNotificationService.warning(
        `Could not retrieve project version, assuming 0.0.0. Error:${error instanceof Error ? error.message : String(error)}`,
      );
      return '0.0.0';
    }
  }
}

const projectService = new ProjectService();

export default projectService;
