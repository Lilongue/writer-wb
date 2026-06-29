import path from 'path';
import fs from 'fs/promises';
import Database from 'better-sqlite3';
import { app } from 'electron';
import semver from 'semver';
import ProjectService from '../../../main/services/ProjectService';
import FileSystemService from '../../../main/services/FileSystemService';
import { NarrativeService } from '../../../main/services/NarrativeService';
import { TemplateService } from '../../../main/services/TemplateService';
import ProjectSettingsService from '../../../main/services/ProjectSettingsService';
import MainNotificationService from '../../../main/services/NotificationService';
import eventBus from '../../../main/eventBus';
import { EntityType } from '../../../common/types';

// Mock all external dependencies
jest.mock('fs/promises');
jest.mock('better-sqlite3');
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: jest.fn(() => '/mock/app/path'),
    getVersion: jest.fn(() => '1.0.0'),
  },
}));
jest.mock('../../../main/services/FileSystemService');
jest.mock('../../../main/services/NarrativeService');
jest.mock('../../../main/services/TemplateService');
jest.mock('../../../main/services/ProjectSettingsService');
jest.mock('../../../main/services/NotificationService');
jest.mock('../../../main/eventBus');
jest.mock('../../../main/util', () => ({
  sanitizeFilename: jest.fn((name: string) => name),
}));
jest.mock('semver', () => ({
  lt: jest.fn(),
}));

const mockStatement = {
  get: jest.fn(),
  run: jest.fn(),
  all: jest.fn(),
};

const mockDatabaseInstance = {
  pragma: jest.fn(),
  exec: jest.fn(),
  prepare: jest.fn(() => mockStatement),
  close: jest.fn(),
} as unknown as Database.Database;

describe('ProjectService', () => {
  let narrativeService: NarrativeService;
  let templateService: TemplateService;
  let projectSettingsService: ProjectSettingsService;

  // Mock DAOs
  const mockNarrativeDao = {
    getNarrativeItems: jest.fn(),
    getNarrativeItemById: jest.fn(),
    getMaxSortOrder: jest.fn(),
    createNarrativeItem: jest.fn(),
    renameNarrativeItem: jest.fn(),
    updateNarrativeItemDetails: jest.fn(),
    findAllDescendantIds: jest.fn(),
    findAllByIds: jest.fn(),
    deleteByIds: jest.fn(),
    updateOrder: jest.fn(),
  };

  const mockTemplateDao = {
    getAllTemplates: jest.fn(),
    createTemplate: jest.fn(),
    getTemplate: jest.fn(),
    toggleTemplateVisibility: jest.fn(),
    renameTemplate: jest.fn(),
    updateTemplateSchema: jest.fn(),
  };

  const mockWorldObjectDao = {
    countWorldObjectsByTemplateId: jest.fn(),
  };

  const mockSettingsDao = {
    getAllProjectSettings: jest.fn(),
    updateProjectSettings: jest.fn(),
  };

  // Mock getProjectRoot function
  const mockGetProjectRoot = jest.fn(() => '/mock/project/root');

  beforeAll(() => {
    // Mock the Database constructor to return our mock instance
    (Database as unknown as jest.Mock).mockImplementation(
      () => mockDatabaseInstance,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance of ProjectService
    // This is a bit tricky as ProjectService is a default export of an instance.
    // We'll re-import it or find a way to reset its internal state if necessary.
    // For now, assume the mock of Database.Database takes care of it for new connections.

    // Initialize mock services
    narrativeService = new NarrativeService(
      mockNarrativeDao as any,
      mockTemplateDao as any,
      mockGetProjectRoot,
    );
    templateService = new TemplateService(
      mockTemplateDao as any,
      mockWorldObjectDao as any,
    );
    projectSettingsService = new ProjectSettingsService(mockSettingsDao as any);

    // Mock FileSystemService methods
    (FileSystemService.createDirectories as jest.Mock).mockResolvedValue(
      undefined,
    );
    (FileSystemService.pathExists as jest.Mock).mockResolvedValue(false); // Default to path not existing
    (FileSystemService.checkDirectoriesExist as jest.Mock).mockResolvedValue(
      true,
    );

    // Mock fs/promises methods
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('CREATE TABLE test;'); // Mock schema content

    // Mock NotificationService methods
    (MainNotificationService.error as jest.Mock).mockImplementation(jest.fn());
    (MainNotificationService.warning as jest.Mock).mockImplementation(
      jest.fn(),
    );
    (MainNotificationService.info as jest.Mock).mockImplementation(jest.fn());

    // Mock TemplateService methods
    (
      TemplateService.getPredefinedNarrativeTemplates as jest.Mock
    ).mockResolvedValue([
      { name: 'Template1', id: 1, weight: 10 },
      { name: 'Template2', id: 2, weight: 20 },
    ]);
    (templateService.importTemplate as jest.Mock).mockImplementation(
      (template) =>
        Promise.resolve({
          id: template.id,
          weight: template.weight,
        }),
    );

    // Mock NarrativeService methods
    (narrativeService.createNarrativeItem as jest.Mock).mockResolvedValue(
      undefined,
    );

    // Mock ProjectSettingsService methods
    (projectSettingsService.updateSettings as jest.Mock).mockResolvedValue(
      undefined,
    );

    // Mock eventBus methods
    (eventBus.emit as jest.Mock).mockImplementation(jest.fn());

    // Mock semver
    (semver.lt as jest.Mock).mockReturnValue(false); // Default to not outdated

    // Mock database instance methods
    (mockDatabaseInstance.pragma as jest.Mock).mockReturnThis();
    (mockDatabaseInstance.exec as jest.Mock).mockReturnThis();
    (mockDatabaseInstance.prepare as jest.Mock).mockClear();
    (mockDatabaseInstance.close as jest.Mock).mockReturnThis();
    mockStatement.get.mockClear();
    mockStatement.run.mockClear();
    mockStatement.all.mockClear();
    mockStatement.get.mockReturnValue(undefined); // Default no project version
  });

  afterEach(() => {
    // Ensure the database is closed after each test if it was opened
    ProjectService.close();
  });

  describe('ProjectService Instance', () => {
    it('should be defined', () => {
      expect(ProjectService).toBeDefined();
    });
  });

  // Test createProject method
  describe('createProject', () => {
    const projectData = {
      location: '/mock/project/location',
      projectName: 'TestProject',
      narrativeStructure: ['Template1', 'Template2'],
      createSubfolder: true,
    };

    // Test case: Verify that a new project is successfully created when a subfolder is requested.
    // This includes checking directory creation, project file writing, database initialization,
    // predefined template import, initial narrative item creation, project settings update,
    // and the emission of a 'project-opened' event.
    it('should create a project successfully with a subfolder', async () => {
      (FileSystemService.pathExists as jest.Mock).mockResolvedValueOnce(false); // Project does not exist
      (Database as unknown as jest.Mock).mockImplementationOnce(
        () => mockDatabaseInstance,
      );

      const result = await ProjectService.createProject(
        projectData,
        templateService,
        projectSettingsService,
        narrativeService,
      );

      expect(result).toBe(true);
      expect(FileSystemService.createDirectories).toHaveBeenCalledWith(
        path.join(projectData.location, projectData.projectName),
        [EntityType.Narrative, EntityType.WorldObject],
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(
          projectData.location,
          projectData.projectName,
          `${projectData.projectName}.wwb`,
        ),
        '',
      );
      expect(Database).toHaveBeenCalledWith(
        path.join(
          projectData.location,
          projectData.projectName,
          'project.sqlite',
        ),
      );
      expect(mockDatabaseInstance.pragma).toHaveBeenCalledWith(
        'journal_mode = WAL',
      );
      expect(fs.readFile).toHaveBeenCalled(); // For schema
      expect(mockDatabaseInstance.exec).toHaveBeenCalledWith(
        'CREATE TABLE test;',
      ); // Schema applied
      expect(
        TemplateService.getPredefinedNarrativeTemplates,
      ).toHaveBeenCalled();
      expect(templateService.importTemplate).toHaveBeenCalledTimes(
        projectData.narrativeStructure.length,
      );
      expect(narrativeService.createNarrativeItem).toHaveBeenCalledWith(
        null,
        2, // ID of Template2, which has the higher weight
        'Произведение',
        undefined,
      );
      expect(projectSettingsService.updateSettings).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('project-opened');
      expect(ProjectService.getProjectRoot()).toBe(
        path.join(projectData.location, projectData.projectName),
      );
    });

    // Test case: Verify that a project is not created if the target location already exists as a project,
    // and an appropriate error notification is displayed to the user.
    it('should not create a project if the location is already a project', async () => {
      (FileSystemService.pathExists as jest.Mock).mockResolvedValueOnce(true); // Project already exists

      const result = await ProjectService.createProject(
        projectData,
        templateService,
        projectSettingsService,
        narrativeService,
      );

      expect(result).toBe(false);
      expect(MainNotificationService.error).toHaveBeenCalledWith(
        'Ошибка создания проекта',
        'Выбранная папка уже является проектом. Пожалуйста, выберите другую папку.',
      );
      expect(FileSystemService.createDirectories).not.toHaveBeenCalled();
    });

    // Test case: Verify that if a project is already open, it is properly closed before
    // attempting to create a new project.
    it('should close an existing project before creating a new one', async () => {
      // Simulate an already open project
      (ProjectService as any).db = mockDatabaseInstance;
      (ProjectService as any).projectRoot = '/mock/old/project';

      (FileSystemService.pathExists as jest.Mock).mockResolvedValueOnce(false);
      (Database as unknown as jest.Mock).mockImplementationOnce(
        () => mockDatabaseInstance,
      );

      await ProjectService.createProject(
        projectData,
        templateService,
        projectSettingsService,
        narrativeService,
      );

      // close() is called twice: once for the old project, once for the new one in afterEach
      expect(mockDatabaseInstance.close).toHaveBeenCalledTimes(1);
    });

    // Test case: Verify that a new project is successfully created without a subfolder
    // when `createSubfolder` is set to false, ensuring correct directory and file path handling.
    it('should create a project successfully without a subfolder', async () => {
      const projectDataNoSubfolder = { ...projectData, createSubfolder: false };
      (FileSystemService.pathExists as jest.Mock).mockResolvedValueOnce(false); // Project does not exist
      (Database as unknown as jest.Mock).mockImplementationOnce(
        () => mockDatabaseInstance,
      );

      const result = await ProjectService.createProject(
        projectDataNoSubfolder,
        templateService,
        projectSettingsService,
        narrativeService,
      );

      expect(result).toBe(true);
      expect(FileSystemService.createDirectories).toHaveBeenCalledWith(
        projectDataNoSubfolder.location,
        [EntityType.Narrative, EntityType.WorldObject],
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(
          projectDataNoSubfolder.location,
          `${projectDataNoSubfolder.projectName}.wwb`,
        ),
        '',
      );
      expect(Database).toHaveBeenCalledWith(
        path.join(projectDataNoSubfolder.location, 'project.sqlite'),
      );
    });
  });

  // Test open method
  describe('open', () => {
    const projectPath = '/mock/existing/project';

    // Test case: Verify that an existing project is successfully opened.
    // This includes checking the directory structure, connecting to the project database,
    // verifying that the project version matches the application version,
    // and emitting a 'project-opened' event with the correct outdated status.
    it('should open an existing project successfully', async () => {
      (
        FileSystemService.checkDirectoriesExist as jest.Mock
      ).mockResolvedValueOnce(true);
      (FileSystemService.pathExists as jest.Mock).mockResolvedValueOnce(true); // project.sqlite exists
      (Database as unknown as jest.Mock).mockImplementationOnce(
        () => mockDatabaseInstance,
      );
      (mockStatement.get as jest.Mock).mockReturnValueOnce({
        value: '1.0.0',
      }); // Project version matches app version
      (app.getVersion as jest.Mock).mockReturnValue('1.0.0');

      const result = await ProjectService.open(projectPath);

      expect(result).toBe(true);
      expect(FileSystemService.checkDirectoriesExist).toHaveBeenCalledWith(
        projectPath,
        [EntityType.Narrative, EntityType.WorldObject],
      );
      expect(Database).toHaveBeenCalledWith(
        path.join(projectPath, 'project.sqlite'),
        { fileMustExist: true },
      );
      expect(mockDatabaseInstance.pragma).toHaveBeenCalledWith(
        'journal_mode = WAL',
      );
      expect(MainNotificationService.info).toHaveBeenCalledWith(
        'Проект открыт',
        `Проект успешно открыт по пути: ${projectPath}`,
      );
      expect(eventBus.emit).toHaveBeenCalledWith('project-opened', {
        isOutdated: false,
      });
      expect(ProjectService.getProjectRoot()).toBe(projectPath);
    });

    // Test case: Verify that an attempt to open a project with an invalid directory structure fails,
    // and an appropriate error notification is displayed to the user.
    it('should not open a project with invalid structure', async () => {
      (
        FileSystemService.checkDirectoriesExist as jest.Mock
      ).mockResolvedValueOnce(false); // Invalid structure

      const result = await ProjectService.open(projectPath);

      expect(result).toBe(false);
      expect(MainNotificationService.error).toHaveBeenCalledWith(
        'Ошибка открытия проекта',
        'Неверная структура проекта или поврежденные файлы.',
      );
      expect(Database).not.toHaveBeenCalled();
    });

    // Test case: Verify that an outdated project (where project version < app version) can still be opened,
    // but a warning notification is displayed to inform the user about the outdated structure,
    // and the 'project-opened' event correctly indicates that the project is outdated.
    it('should open an outdated project and show warning', async () => {
      (
        FileSystemService.checkDirectoriesExist as jest.Mock
      ).mockResolvedValueOnce(true);
      (FileSystemService.pathExists as jest.Mock).mockResolvedValueOnce(true); // project.sqlite exists
      (Database as unknown as jest.Mock).mockImplementationOnce(
        () => mockDatabaseInstance,
      );
      (mockStatement.get as jest.Mock).mockReturnValueOnce({
        value: '0.9.0',
      }); // Project version is outdated
      (app.getVersion as jest.Mock).mockReturnValue('1.0.0');
      (semver.lt as jest.Mock).mockReturnValueOnce(true);

      const result = await ProjectService.open(projectPath);

      expect(result).toBe(true);
      expect(MainNotificationService.warning).toHaveBeenCalledWith(
        'Проект открыт с устаревшей структурой',
        `Проект требует обновления. Текущая версия: 0.9.0, требуется: 1.0.0. Используйте меню "Файл" -> "Обновить структуру проекта..." для миграции.`,
      );
      expect(eventBus.emit).toHaveBeenCalledWith('project-opened', {
        isOutdated: true,
      });
    });

    // Test case: Verify that if a database connection is already open from a previous project,
    // it is properly closed before opening the database for the new project.
    it('should close existing database before opening new project', async () => {
      // Simulate an already open project
      (ProjectService as any).db = mockDatabaseInstance;
      (ProjectService as any).projectRoot = '/mock/old/project';

      (
        FileSystemService.checkDirectoriesExist as jest.Mock
      ).mockResolvedValueOnce(true);
      (FileSystemService.pathExists as jest.Mock).mockResolvedValueOnce(true);
      (Database as unknown as jest.Mock).mockImplementationOnce(
        () => mockDatabaseInstance,
      );
      (mockStatement.get as jest.Mock).mockReturnValueOnce({
        value: '1.0.0',
      });
      (app.getVersion as jest.Mock).mockReturnValue('1.0.0');

      await ProjectService.open(projectPath);

      expect(mockDatabaseInstance.close).toHaveBeenCalledTimes(1);
    });
  });

  // Test close method
  describe('close', () => {
    // Test case: Verify that the database connection is properly closed when a project is open.
    // This includes checking for WAL checkpoint pragma, database close call,
    // a project closed notification, emission of a 'project-closed' event,
    // and resetting the internal database and project root states.
    it('should close the database if it is open', () => {
      (ProjectService as any).db = mockDatabaseInstance; // Simulate open database
      (ProjectService as any).projectRoot = '/mock/project/path';

      ProjectService.close();

      expect(mockDatabaseInstance.pragma).toHaveBeenCalledWith(
        'wal_checkpoint(RESTART)',
      );
      expect(mockDatabaseInstance.close).toHaveBeenCalled();
      expect(MainNotificationService.info).toHaveBeenCalledWith(
        'Проект закрыт',
        'Текущий проект успешно закрыт.',
      );
      expect(eventBus.emit).toHaveBeenCalledWith('project-closed');
      expect(() => ProjectService.getDb()).toThrow(
        'No project is currently open.',
      );
      expect(ProjectService.getProjectRoot()).toBeNull();
    });

    // Test case: Verify that calling `close()` when no database is currently open
    // results in no action, meaning no database close calls, no notifications,
    // and no events are emitted.
    it('should do nothing if no database is open', () => {
      (ProjectService as any).db = null; // Simulate no open database

      ProjectService.close();

      expect(mockDatabaseInstance.close).not.toHaveBeenCalled();
      expect(MainNotificationService.info).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  // Test flushDatabase method
  describe('flushDatabase', () => {
    // Test case: Verify that the database is successfully flushed (checkpointed) when a project is open,
    // ensuring that pending changes are written to disk without error notifications.
    it('should flush the database if it is open', () => {
      (ProjectService as any).db = mockDatabaseInstance;

      ProjectService.flushDatabase();

      expect(mockDatabaseInstance.pragma).toHaveBeenCalledWith(
        'wal_checkpoint(RESTART)',
      );
      expect(MainNotificationService.error).not.toHaveBeenCalled(); // No error expected
    });

    // Test case: Verify that errors encountered during the database flush operation
    // are caught and result in an appropriate error notification being displayed to the user.
    it('should handle errors during flush', () => {
      (ProjectService as any).db = mockDatabaseInstance;
      (mockDatabaseInstance.pragma as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Flush error');
      });

      ProjectService.flushDatabase();

      expect(mockDatabaseInstance.pragma).toHaveBeenCalledWith(
        'wal_checkpoint(RESTART)',
      );
      expect(MainNotificationService.error).toHaveBeenCalledWith(
        'Ошибка синхронизации данных',
        'Не удалось принудительно сохранить изменения в файл проекта. Возможно, некоторые данные не сохранятся.',
      );
    });

    it('should do nothing if no database is open', () => {
      (ProjectService as any).db = null;

      ProjectService.flushDatabase();

      expect(mockDatabaseInstance.pragma).not.toHaveBeenCalled();
      expect(MainNotificationService.error).not.toHaveBeenCalled();
    });
  });

  // Test getDb method
  describe('getDb', () => {
    // Test case: Verify that `getDb()` returns the active database instance when a project is open.
    it('should return the database instance if open', () => {
      (ProjectService as any).db = mockDatabaseInstance;
      expect(ProjectService.getDb()).toBe(mockDatabaseInstance);
    });

    // Test case: Verify that `getDb()` throws an error when no project is open,
    // as there is no active database connection.
    it('should throw an error if no project is open', () => {
      (ProjectService as any).db = null;
      expect(() => ProjectService.getDb()).toThrow(
        'No project is currently open.',
      );
    });
  });

  // Test getProjectRoot method
  describe('getProjectRoot', () => {
    // Test case: Verify that `getProjectRoot()` returns the correct project root path
    // when a project is currently open and its root path is set.
    it('should return the project root if set', () => {
      (ProjectService as any).projectRoot = '/mock/project/path';
      expect(ProjectService.getProjectRoot()).toBe('/mock/project/path');
    });

    // Test case: Verify that `getProjectRoot()` returns null when no project is open,
    // indicating that no project root path has been set.
    it('should return null if no project root is set', () => {
      (ProjectService as any).projectRoot = null;
      expect(ProjectService.getProjectRoot()).toBeNull();
    });
  });

  // Test getProjectVersion method
  describe('getProjectVersion', () => {
    // Test case: Verify that `getProjectVersion()` successfully retrieves and returns
    // the project version string stored in the database when a project is open.
    it('should return project version from database', () => {
      (ProjectService as any).db = mockDatabaseInstance;
      (mockStatement.get as jest.Mock).mockReturnValueOnce({
        value: '1.2.3',
      });
      expect(ProjectService.getProjectVersion()).toBe('1.2.3');
      expect(mockDatabaseInstance.prepare).toHaveBeenCalledWith(
        "SELECT value FROM project_settings WHERE key = 'project.version'",
      );
      expect(mockStatement.get).toHaveBeenCalled();
    });

    // Test case: Verify that `getProjectVersion()` returns a default version '0.0.0'
    // if no project version is found in the database settings.
    it('should return 0.0.0 if project version not found', () => {
      (ProjectService as any).db = mockDatabaseInstance;
      (mockStatement.get as jest.Mock).mockReturnValueOnce(undefined);
      expect(ProjectService.getProjectVersion()).toBe('0.0.0');
    });

    // Test case: Verify that `getProjectVersion()` returns '0.0.0' and logs a warning
    // if there is a database query failure when attempting to retrieve the project version.
    it('should return 0.0.0 and log warning if database query fails', () => {
      (ProjectService as any).db = mockDatabaseInstance;
      (mockDatabaseInstance.prepare as jest.Mock).mockImplementationOnce(() => {
        throw new Error('DB error');
      });
      expect(ProjectService.getProjectVersion()).toBe('0.0.0');
      expect(MainNotificationService.warning).toHaveBeenCalledWith(
        'Could not retrieve project version, assuming 0.0.0. Error:DB error',
      );
    });

    // Test case: Verify that `getProjectVersion()` throws an error if the database
    // is not connected, as it cannot retrieve the project version.
    it('should throw error if database not connected', () => {
      (ProjectService as any).db = null;
      expect(() => ProjectService.getProjectVersion()).toThrow(
        'Database not connected.',
      );
    });
  });

  // Test getProjectPathDetails method
  describe('getProjectPathDetails', () => {
    // Test case: Verify that `getProjectPathDetails()` returns an object containing
    // the project root path and the database path when a project is open.
    it('should return project path details if project is open', () => {
      (ProjectService as any).projectRoot = '/mock/project/path';
      const details = ProjectService.getProjectPathDetails();
      expect(details).toEqual({
        projectRoot: '/mock/project/path',
        dbPath: path.join('/mock/project/path', 'project.sqlite'),
      });
    });

    // Test case: Verify that `getProjectPathDetails()` returns null when no project is open,
    // as there are no project path details to retrieve.
    it('should return null if no project is open', () => {
      (ProjectService as any).projectRoot = null;
      expect(ProjectService.getProjectPathDetails()).toBeNull();
    });
  });
});
