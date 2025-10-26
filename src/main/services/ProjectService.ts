/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
import path from 'path';
import fs from 'fs/promises';
import Database from 'better-sqlite3';
import { app } from 'electron';
import FileSystemService from './FileSystemService';
import { GenericDao } from '../data/GenericDao';
import { NarrativeService } from './NarrativeService';
import { WorldObjectService } from './WorldObjectService';
import eventBus from '../eventBus';

// TODO: Вынести путь к схеме в конфигурацию или константы
const SCHEMA_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets', 'database', 'schema.sql')
  : path.join(app.getAppPath(), 'assets', 'database', 'schema.sql');

class ProjectService {
  private db: Database.Database | null = null;

  private projectRoot: string | null = null;

  // --- Public API ---

  public async create(projectPath: string): Promise<void> {
    // TODO: Добавить проверку, не создается ли проект внутри другого проекта
    if (this.db) {
      this.close();
    }

    await FileSystemService.createDirectories(projectPath, [
      'narrative',
      'world',
    ]);

    const dbPath = path.join(projectPath, 'project.sqlite');
    this.db = this._initDatabase(dbPath);
    this.db.pragma('journal_mode = WAL');

    await this._applySchema(this.db);

    this.projectRoot = projectPath;
    console.log(`Project created at: ${projectPath}`);
    eventBus.emit('project-opened');
  }

  public async open(projectPath: string): Promise<boolean> {
    if (this.db) {
      this.close();
    }

    const structureIsValid = await this._validateProjectStructure(projectPath);
    if (!structureIsValid) {
      // TODO: Показать пользователю осмысленную ошибку
      console.error('Invalid project structure.');
      return false;
    }

    const dbPath = path.join(projectPath, 'project.sqlite');
    this.db = this._connectToDatabase(dbPath);
    this.db.pragma('journal_mode = WAL');

    this.projectRoot = projectPath;
    console.log(`Project opened at: ${projectPath}`);
    eventBus.emit('project-opened');
    return true;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.projectRoot = null;
      console.log('Project closed.');
      eventBus.emit('project-closed');
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
      ['narrative', 'world'],
    );
    return dbExists && dirsExist;
  }
}

const projectService = new ProjectService();

// Создаем DAO, передавая ему функцию для получения активной БД
export const genericDao = new GenericDao(() => projectService.getDb());

// Создаем сервисы
export const narrativeService = new NarrativeService(genericDao, () =>
  projectService.getProjectRoot(),
);
export const worldObjectService = new WorldObjectService(genericDao, () =>
  projectService.getProjectRoot(),
);

export default projectService;
