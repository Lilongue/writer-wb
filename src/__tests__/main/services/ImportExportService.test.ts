import ImportExportService from '../../../main/services/ImportExportService';
import ProjectSettingsService from '../../../main/services/ProjectSettingsService';
import { TemplateDao } from '../../../main/data/daos/TemplateDao';
import { WorldObjectDao } from '../../../main/data/daos/WorldObjectDao';
import { ConnectionDao } from '../../../main/data/daos/ConnectionDao';
import {
  EntityType,
  ExportedConnection,
  ExportedWorldObject,
  PredefinedWorldTemplate,
} from '../../../common/types';

jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '1.0.0'),
  },
}));

jest.mock('../../../main/services/ProjectSettingsService');
jest.mock('../../../main/data/daos/TemplateDao');
jest.mock('../../../main/data/daos/WorldObjectDao');
jest.mock('../../../main/data/daos/ConnectionDao');

describe('ImportExportService', () => {
  let projectSettingsService: jest.Mocked<ProjectSettingsService>;
  let templateDao: jest.Mocked<TemplateDao>;
  let worldObjectDao: jest.Mocked<WorldObjectDao>;
  let connectionDao: jest.Mocked<ConnectionDao>;
  let service: ImportExportService;

  beforeEach(() => {
    projectSettingsService = new ProjectSettingsService(
      null as any,
    ) as jest.Mocked<ProjectSettingsService>;
    templateDao = new TemplateDao(null as any) as jest.Mocked<TemplateDao>;
    worldObjectDao = new WorldObjectDao(
      null as any,
    ) as jest.Mocked<WorldObjectDao>;
    connectionDao = new ConnectionDao(
      null as any,
    ) as jest.Mocked<ConnectionDao>;

    service = new ImportExportService(
      projectSettingsService,
      templateDao,
      worldObjectDao,
      connectionDao,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportWorldObjects', () => {
    // Test case: Verify that world objects and their associated connections are correctly exported into a JSON string.
    it('should export world objects and connections correctly', async () => {
      projectSettingsService.getAllSettings.mockResolvedValue([
        {
          key: 'project.name',
          value: 'My Test Project',
          name: 'Project Name',
          category: 'General',
          type: 'string',
        },
      ]);
      worldObjectDao.getAllWorldObjects.mockReturnValue([
        {
          id: 1,
          name: 'Object 1',
          template_id: 101,
          description: '',
          properties: '{}',
        },
        {
          id: 2,
          name: 'Object 2',
          template_id: 101,
          description: '',
          properties: '{}',
        },
      ]);
      templateDao.getTemplate.mockReturnValue({
        id: 101,
        name: 'Test Template',
        export_name: 'test_template',
        category: EntityType.WorldObject,
        fields_schema: '[]',
        is_visible: true,
        weight: 0,
      });
      connectionDao.findEntityId.mockImplementation((type, objectId) => {
        if (type === EntityType.WorldObject && objectId === 1) return 201;
        if (type === EntityType.WorldObject && objectId === 2) return 202;
        return null;
      });
      connectionDao.getAllConnections.mockReturnValue([
        { id: 301, source_id: 201, target_id: 202, description: 'connects' },
      ]);
      connectionDao.getAllWorldObjectEntityIds.mockReturnValue([201, 202]);

      const { jsonContent, warnings } = await service.exportWorldObjects();

      expect(warnings).toHaveLength(0);
      const parsedContent = JSON.parse(jsonContent);

      expect(parsedContent.sourceProjectName).toBe('My Test Project');
      expect(parsedContent.templates.world_templates[0].name).toBe(
        'Test Template',
      );
      expect(parsedContent.worldObjects).toHaveLength(2);
      expect(parsedContent.worldObjects[0].objectData.name).toBe('Object 1');
      expect(parsedContent.connections).toHaveLength(1);
      expect(parsedContent.connections[0].description).toBe('connects');
    });

    // Test case: Ensure the service generates a warning and skips world objects when their associated template is missing during export.
    it('should handle missing templates with a warning', async () => {
      projectSettingsService.getAllSettings.mockResolvedValue([]);
      worldObjectDao.getAllWorldObjects.mockReturnValue([
        {
          id: 1,
          name: 'Object 1',
          template_id: 999,
          description: '',
          properties: '{}',
        },
      ]);
      templateDao.getTemplate.mockReturnValue(undefined); // No template found
      connectionDao.getAllConnections.mockReturnValue([]);

      const { jsonContent, warnings } = await service.exportWorldObjects();
      const parsedContent = JSON.parse(jsonContent);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('не найден');
      expect(parsedContent.worldObjects).toHaveLength(0);
    });

    // Test case: Verify that world objects are skipped and a warning is issued if their corresponding allEntityId cannot be found during export.
    it('should handle missing entity IDs with a warning', async () => {
      projectSettingsService.getAllSettings.mockResolvedValue([]);
      worldObjectDao.getAllWorldObjects.mockReturnValue([
        {
          id: 1,
          name: 'Object 1',
          template_id: 101,
          description: '',
          properties: '{}',
        },
      ]);
      templateDao.getTemplate.mockReturnValue({
        id: 101,
        name: 'Test Template',
        export_name: 'test_template',
        category: EntityType.WorldObject,
        fields_schema: '[]',
        is_visible: true,
        weight: 0,
      });
      connectionDao.findEntityId.mockReturnValue(null); // No entity ID found
      connectionDao.getAllConnections.mockReturnValue([]);

      const { jsonContent, warnings } = await service.exportWorldObjects();
      const parsedContent = JSON.parse(jsonContent);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Сущность для объекта');
      expect(parsedContent.worldObjects).toHaveLength(0);
    });

    // Test case: Check if the service correctly identifies and warns about invalid JSON schema in templates during export.
    it('should handle template schema parsing errors with a warning', async () => {
      projectSettingsService.getAllSettings.mockResolvedValue([]);
      worldObjectDao.getAllWorldObjects.mockReturnValue([
        {
          id: 1,
          name: 'Object 1',
          template_id: 101,
          description: '',
          properties: '{}',
        },
      ]);
      templateDao.getTemplate.mockReturnValue({
        id: 101,
        name: 'Test Template',
        export_name: 'test_template',
        category: EntityType.WorldObject,
        fields_schema: 'invalid-json',
        is_visible: true,
        weight: 0,
      });
      connectionDao.findEntityId.mockReturnValue(201);
      connectionDao.getAllConnections.mockReturnValue([]);

      const { jsonContent, warnings } = await service.exportWorldObjects();
      const parsedContent = JSON.parse(jsonContent);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Ошибка парсинга схемы');
      expect(parsedContent.templates.world_templates).toHaveLength(0);
    });
  });

  describe('checkExistingTemplateNames', () => {
    // Test case: Verify that the service accurately identifies and returns names of templates that already exist in the database.
    it('should return names of existing templates', async () => {
      templateDao.findTemplateByName.mockImplementation((name) => {
        if (name === 'Existing') {
          return {
            id: 1,
          };
        }
        return undefined;
      });

      const existing = await service.checkExistingTemplateNames([
        'Existing',
        'New',
      ]);
      expect(existing).toEqual(['Existing']);
    });
  });

  describe('importFromFile', () => {
    const templatesToImport: PredefinedWorldTemplate[] = [
      { name: 'New Template', category: EntityType.WorldObject, fields: [] },
      {
        name: 'Existing Template',
        category: EntityType.WorldObject,
        fields: [],
      },
    ];
    const worldObjectsToImport: ExportedWorldObject[] = [
      {
        localId: 1,
        templateName: 'New Template',
        objectData: { name: 'Obj 1', description: '', properties: '' },
      },
    ];
    const connectionsToImport: ExportedConnection[] = [
      { sourceLocalId: 1, targetLocalId: 2, description: 'link' },
    ];

    // Test case: Confirm that the service can successfully import new templates, world objects, and their connections.
    it('should import templates, objects, and connections', async () => {
      templateDao.findTemplateByName.mockReturnValueOnce(undefined); // New Template
      templateDao.createTemplate.mockReturnValueOnce(501);
      templateDao.findTemplateByName.mockReturnValueOnce({
        id: 502,
      });

      worldObjectDao.createWorldObject.mockReturnValue(601);
      connectionDao.findEntityId.mockReturnValue(701);

      const result = await service.importFromFile(
        templatesToImport,
        true,
        true,
        worldObjectsToImport,
        connectionsToImport,
      );

      expect(result.templates.imported).toBe(1);
      expect(result.templates.skipped).toBe(1);
      expect(result.worldObjects.imported).toBe(1);
      expect(connectionDao.createConnection).toHaveBeenCalledTimes(0); // Because target is missing
    });

    // Test case: Ensure that world objects are skipped during import if their associated template is not found or imported.
    it('should skip world object if template is missing', async () => {
      const result = await service.importFromFile(
        [], // No templates
        true,
        true,
        worldObjectsToImport,
        connectionsToImport,
      );

      expect(result.worldObjects.skipped).toBe(1);
      expect(result.messages).toContainEqual(
        expect.stringContaining('не найден'),
      );
    });

    // Test case: Verify that the service gracefully handles and reports errors encountered during the import of templates.
    it('should handle errors during template import', async () => {
      templateDao.findTemplateByName.mockReturnValue(undefined);
      templateDao.createTemplate.mockImplementation(() => {
        throw new Error('DB error');
      });

      const result = await service.importFromFile(
        templatesToImport,
        true,
        true,
        [],
        [],
      );

      expect(result.templates.errors).toBe(2);
      expect(result.messages).toContainEqual(
        expect.stringContaining('Не удалось импортировать шаблон'),
      );
    });

    // Test case: Check that the service reports errors if world objects fail to import, preventing data inconsistencies.
    it('should handle errors during world object import', async () => {
      templateDao.findTemplateByName.mockReturnValue({
        id: 501,
      });
      worldObjectDao.createWorldObject.mockImplementation(() => {
        throw new Error('DB error');
      });

      const result = await service.importFromFile(
        [templatesToImport[0]],
        true,
        true,
        worldObjectsToImport,
        [],
      );

      expect(result.worldObjects.errors).toBe(1);
      expect(result.messages).toContainEqual(
        expect.stringContaining('Не удалось импортировать объект'),
      );
    });

    // Test case: Confirm that errors during connection import are caught and reported, maintaining data integrity.
    it('should handle errors during connection import', async () => {
      templateDao.findTemplateByName.mockReturnValue({
        id: 501,
      });
      worldObjectDao.createWorldObject
        .mockReturnValueOnce(601)
        .mockReturnValueOnce(602);
      connectionDao.findEntityId
        .mockReturnValueOnce(701)
        .mockReturnValueOnce(702);
      connectionDao.createConnection.mockImplementation(() => {
        throw new Error('DB error');
      });

      const twoObjects = [
        {
          localId: 1,
          templateName: 'New Template',
          objectData: { name: 'Obj 1', description: '', properties: '' },
        },
        {
          localId: 2,
          templateName: 'New Template',
          objectData: { name: 'Obj 2', description: '', properties: '' },
        },
      ];

      const result = await service.importFromFile(
        [templatesToImport[0]],
        true,
        true,
        twoObjects,
        connectionsToImport,
      );

      expect(result.connections.errors).toBe(1);
      expect(result.messages).toContainEqual(
        expect.stringContaining('Не удалось импортировать связь'),
      );
    });

    // Test case: Verify that the service correctly reports an error when an allEntityId cannot be found after a world object has been created during import.
    it('should handle missing allEntityId after world object creation', async () => {
      templateDao.findTemplateByName.mockReturnValue({
        id: 501,
      });
      worldObjectDao.createWorldObject.mockReturnValue(601);
      connectionDao.findEntityId.mockReturnValue(null); // Simulate missing allEntityId

      const result = await service.importFromFile(
        [templatesToImport[0]],
        true,
        true,
        worldObjectsToImport, // Contains one object with localId 1
        connectionsToImport,
      );

      expect(result.worldObjects.errors).toBe(1);
      expect(result.messages).toContainEqual(
        expect.stringContaining('Не удалось найти allEntityId'),
      );
      expect(connectionDao.createConnection).not.toHaveBeenCalled();
    });

    // Test case: Ensure connections are skipped and appropriate messages are generated if either the source or target allEntityId is missing during import.
    it('should skip connection if source or target allEntityId is missing', async () => {
      templateDao.findTemplateByName.mockReturnValue({
        id: 501,
      });
      worldObjectDao.createWorldObject
        .mockReturnValueOnce(601)
        .mockReturnValueOnce(602);
      connectionDao.findEntityId.mockImplementation((type, objectId) => {
        if (objectId === 601) return 701;
        return null;
      });

      const twoObjects = [
        {
          localId: 1,
          templateName: 'New Template',
          objectData: { name: 'Obj 1', description: '', properties: '' },
        },
        {
          localId: 2,
          templateName: 'New Template',
          objectData: { name: 'Obj 2', description: '', properties: '' },
        },
      ];

      const result = await service.importFromFile(
        [templatesToImport[0]],
        true,
        true,
        twoObjects,
        connectionsToImport, // Source localId 1, Target localId 2
      );

      expect(result.connections.skipped).toBe(1);
      expect(result.messages).toContainEqual(
        expect.stringContaining('Пропущена связь'),
      );
      expect(connectionDao.createConnection).not.toHaveBeenCalled();
    });
  });
});
