import path from 'path';
import { WorldObjectService } from '../../../main/services/WorldObjectService';
import { WorldObjectDao } from '../../../main/data/daos/WorldObjectDao';
import { TemplateDao } from '../../../main/data/daos/TemplateDao';
import eventBus from '../../../main/eventBus';
import fileSystemService from '../../../main/services/FileSystemService';
import MainNotificationService from '../../../main/services/NotificationService';
import { EntityType, WorldObject, EntityTemplate } from '../../../common/types';

jest.mock('../../../main/data/daos/WorldObjectDao');
jest.mock('../../../main/data/daos/TemplateDao');
jest.mock('../../../main/eventBus');
jest.mock('../../../main/services/FileSystemService');
jest.mock('../../../main/services/NotificationService');

describe('WorldObjectService', () => {
  let worldObjectDao: jest.Mocked<WorldObjectDao>;
  let templateDao: jest.Mocked<TemplateDao>;
  let getProjectRoot: jest.Mock<string | null, []>;
  let service: WorldObjectService;

  const mockProjectRoot = '/path/to/project';

  beforeEach(() => {
    jest.clearAllMocks();
    worldObjectDao =
      new (WorldObjectDao as any)() as jest.Mocked<WorldObjectDao>;
    templateDao = new (TemplateDao as any)() as jest.Mocked<TemplateDao>;
    getProjectRoot = jest.fn(() => mockProjectRoot);
    service = new WorldObjectService(
      worldObjectDao,
      templateDao,
      getProjectRoot,
    );
  });

  // Test case: Verifies that the WorldObjectService instance is created successfully.
  it('should be created', () => {
    expect(service).toBeInstanceOf(WorldObjectService);
  });

  describe('getWorldObjectTypes', () => {
    // Test case: Ensures that the service correctly retrieves and returns all world object types by delegating to the TemplateDao.
    it('should return world object types from template DAO', () => {
      const mockTypes: EntityTemplate[] = [
        {
          id: 1,
          name: 'Character',
          export_name: 'Character',
          category: EntityType.WorldObject,
          fields_schema: '[]',
          is_visible: true,
          weight: 0,
        },
      ];
      templateDao.getAllTemplates.mockReturnValue(mockTypes);

      const result = service.getWorldObjectTypes();

      expect(result).toEqual(mockTypes);
      expect(templateDao.getAllTemplates).toHaveBeenCalledWith(
        false,
        EntityType.WorldObject,
      );
    });
  });

  describe('getWorldObjectsByTypeId', () => {
    // Test case: Confirms that the service fetches world objects by their type ID from the WorldObjectDao.
    it('should return world objects from world object DAO', () => {
      const mockObjects: WorldObject[] = [
        {
          id: 1,
          name: 'Object 1',
          template_id: 1,
          properties: '{}',
          description: '',
        },
      ];
      worldObjectDao.getWorldObjectsByTypeId.mockReturnValue(mockObjects);

      const result = service.getWorldObjectsByTypeId(1);

      expect(result).toEqual(mockObjects);
      expect(worldObjectDao.getWorldObjectsByTypeId).toHaveBeenCalledWith(1);
    });
  });

  describe('getDetails', () => {
    const mockObject = {
      id: 1,
      name: 'Test Object',
      template_id: 2,
      properties: '{"key":"value"}',
    };
    const mockTemplate = {
      id: 2,
      name: 'Test Template',
      entity_type: EntityType.WorldObject,
      fields_schema: '[{"name":"key","label":"Label"}]',
    };
    const expectedPath = path.join(
      mockProjectRoot,
      'world',
      '2',
      '1',
      'content.md',
    );

    // Test case: Verifies that null is returned when the requested world object does not exist.
    it('should return null if object not found', async () => {
      (
        worldObjectDao.getWorldObjectById as jest.Mock<WorldObject | null>
      ).mockReturnValue(null);
      await expect(service.getDetails(1)).resolves.toBeNull();
    });

    // Test case: Checks that null is returned if the template associated with the world object is not found.
    it('should return null if template not found', async () => {
      worldObjectDao.getWorldObjectById.mockReturnValue(mockObject as any);
      templateDao.getTemplate.mockReturnValue(undefined);
      await expect(service.getDetails(1)).resolves.toBeNull();
    });

    // Test case: Ensures that complete details are returned, including content read from an existing file on the file system.
    it('should return details with file content if file exists', async () => {
      worldObjectDao.getWorldObjectById.mockReturnValue(mockObject as any);
      templateDao.getTemplate.mockReturnValue(mockTemplate as any);
      (fileSystemService.getStats as jest.Mock).mockResolvedValue({
        mtimeMs: 12345,
      } as any);
      (fileSystemService.readFile as jest.Mock).mockResolvedValue(
        'File content',
      );

      const details = await service.getDetails(1);

      expect(details).toEqual({
        id: 1,
        name: 'Test Object',
        path: expectedPath,
        content: 'File content',
        customFields: [
          { key: 'key', label: 'Label', value: 'value', comment: undefined },
        ],
        fileExists: true,
        mtime: 12345,
      });
    });

    // Test case: Confirms that details indicate "file not found" and provide a corresponding message when the content file does not exist.
    it('should return details with "not found" message if file does not exist', async () => {
      worldObjectDao.getWorldObjectById.mockReturnValue(mockObject as any);
      templateDao.getTemplate.mockReturnValue(mockTemplate as any);
      (fileSystemService.getStats as jest.Mock).mockResolvedValue(null);

      const details = await service.getDetails(1);

      expect(details?.content).toContain('Файл не найден');
      expect(details?.fileExists).toBe(false);
    });

    // Test case: Verifies that JSON parsing errors for custom fields are handled gracefully, logging an error and returning empty custom fields.
    it('should handle JSON parsing errors gracefully', async () => {
      const invalidJsonMock = { ...mockObject, properties: '{invalid' };
      worldObjectDao.getWorldObjectById.mockReturnValue(invalidJsonMock as any);
      templateDao.getTemplate.mockReturnValue(mockTemplate as any);
      (fileSystemService.getStats as jest.Mock).mockResolvedValue(null);

      const details = await service.getDetails(1);
      expect(MainNotificationService.error).toHaveBeenCalledWith(
        'Ошибка парсинга JSON пользовательских полей',
        expect.any(String),
      );
      expect(details?.customFields).toEqual([]);
    });

    // Test case: Checks that file system operations are skipped and default content is used when the project root is not set.
    it('should handle getProjectRoot returning null gracefully', async () => {
      const mockObjectWithDescription = {
        ...mockObject,
        description: 'Object Description',
      };
      worldObjectDao.getWorldObjectById.mockReturnValue(
        mockObjectWithDescription as any,
      );
      templateDao.getTemplate.mockReturnValue(mockTemplate as any);
      getProjectRoot.mockReturnValue(null); // Mock getProjectRoot to return null

      const details = await service.getDetails(1);

      expect(details).toEqual({
        id: 1,
        name: 'Test Object',
        path: null,
        content: 'Object Description',
        customFields: [
          { key: 'key', label: 'Label', value: 'value', comment: undefined },
        ],
        fileExists: false,
        mtime: null,
      });
      expect(fileSystemService.getStats).not.toHaveBeenCalled();
      expect(fileSystemService.readFile).not.toHaveBeenCalled();
    });
  });

  describe('createObject', () => {
    // Test case: Ensures that a new world object is created, its corresponding directory structure is initiated, and a change event is emitted.
    it('should create an object, create its directory, and emit an event', async () => {
      const newId = 123;
      const typeId = 2;
      const template = { id: typeId, name: 'Template' };
      worldObjectDao.createWorldObject.mockReturnValue(newId);
      templateDao.getTemplate.mockReturnValue(template as any);
      (fileSystemService.createFileWithDirs as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = service.createObject({
        name: 'New Object',
        typeId,
        properties: '{}',
      });

      expect(result).toBe(newId);
      expect(worldObjectDao.createWorldObject).toHaveBeenCalledWith(
        'New Object',
        typeId,
        '{}',
      );

      const expectedPath = path.join(
        mockProjectRoot,
        'world',
        String(typeId),
        String(newId),
        'content.md',
      );
      expect(fileSystemService.createFileWithDirs).toHaveBeenCalledWith(
        expectedPath,
        '',
      );

      // Check for event emission
      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId,
      });
    });

    // Test case: Verifies that file system errors during directory creation are handled silently without disrupting object creation or event emission.
    it('should handle file system error during creation gracefully', async () => {
      const newId = 123;
      const typeId = 2;
      const template = { id: typeId, name: 'Template' };
      worldObjectDao.createWorldObject.mockReturnValue(newId);
      templateDao.getTemplate.mockReturnValue(template as any);
      (fileSystemService.createFileWithDirs as jest.Mock).mockRejectedValue(
        new Error('FS Write Error'),
      );

      service.createObject({ name: 'New Object', typeId, properties: '{}' });

      await new Promise(process.nextTick);
      expect(MainNotificationService.error).not.toHaveBeenCalled(); // The catch block is silent
      expect(worldObjectDao.createWorldObject).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId,
      });
    });

    // Test case: Confirms that an object is created and an event emitted, but no file structure is attempted if `getProjectRoot` returns null.
    it('should create object and emit event but not create file structure if projectRoot is null', async () => {
      const newId = 123;
      const typeId = 2;
      worldObjectDao.createWorldObject.mockReturnValue(newId);
      templateDao.getTemplate.mockReturnValue({
        id: typeId,
        name: 'Template',
      } as any);
      getProjectRoot.mockReturnValue(null); // projectRoot is null

      service.createObject({ name: 'New Object', typeId, properties: '{}' });

      expect(worldObjectDao.createWorldObject).toHaveBeenCalledWith(
        'New Object',
        typeId,
        '{}',
      );
      expect(fileSystemService.createFileWithDirs).not.toHaveBeenCalled(); // Should not create file
      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId,
      });
    });

    // Test case: Asserts that an object is created and an event emitted, but no file structure is attempted if the template is not found.
    it('should create object and emit event but not create file structure if template not found', async () => {
      const newId = 123;
      const typeId = 2;
      worldObjectDao.createWorldObject.mockReturnValue(newId);
      templateDao.getTemplate.mockReturnValue(undefined); // template is null
      getProjectRoot.mockReturnValue(mockProjectRoot);

      service.createObject({ name: 'New Object', typeId, properties: '{}' });

      expect(worldObjectDao.createWorldObject).toHaveBeenCalledWith(
        'New Object',
        typeId,
        '{}',
      );
      expect(fileSystemService.createFileWithDirs).not.toHaveBeenCalled(); // Should not create file
      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId,
      });
    });

    // Test case: Ensures that the object is created with default empty properties if the `properties` argument is undefined.
    it('should create object with default properties when properties is undefined', async () => {
      const newId = 124; // A new ID
      const typeId = 3; // A new typeId
      const template = { id: typeId, name: 'Another Template' };
      worldObjectDao.createWorldObject.mockReturnValue(newId);
      templateDao.getTemplate.mockReturnValue(template as any);
      (fileSystemService.createFileWithDirs as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = service.createObject({
        name: 'Object with undefined properties',
        typeId,
      }); // No properties field

      expect(result).toBe(newId);
      expect(worldObjectDao.createWorldObject).toHaveBeenCalledWith(
        'Object with undefined properties',
        typeId,
        '{}',
      ); // Check default properties
      const expectedPath = path.join(
        mockProjectRoot,
        'world',
        String(typeId),
        String(newId),
        'content.md',
      );
      expect(fileSystemService.createFileWithDirs).toHaveBeenCalledWith(
        expectedPath,
        '',
      );
      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId,
      });
    });
  });

  describe('renameObject', () => {
    // Test case: Verifies that an existing object's name is updated and a change event is emitted.
    it('should update object name and emit an event', async () => {
      const object = {
        id: 1,
        name: 'Old Name',
        template_id: 2,
        properties: '{}',
      };
      worldObjectDao.getWorldObjectById.mockReturnValue(object as any);

      service.renameObject({ id: 1, newName: 'New Name' });

      expect(worldObjectDao.updateWorldObject).toHaveBeenCalledWith(
        1,
        'New Name',
        '{}',
      );

      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId: 2,
      });
    });

    // Test case: Checks that no action is taken if an attempt is made to rename a non-existent object.
    it('should do nothing if object does not exist', async () => {
      (
        worldObjectDao.getWorldObjectById as jest.Mock<WorldObject | null>
      ).mockReturnValue(null);
      service.renameObject({ id: 1, newName: 'New Name' });
      expect(worldObjectDao.updateWorldObject).not.toHaveBeenCalled();
      await new Promise(process.nextTick);
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('deleteObject', () => {
    const object = { id: 1, name: 'ToDelete', template_id: 2 };
    const template = { id: 2, name: 'Template' };

    // Test case: Ensures that a world object and its associated directory are deleted, and a change event is emitted.
    it('should delete object, its directory, and emit an event', async () => {
      worldObjectDao.getWorldObjectById.mockReturnValue(object as any);
      worldObjectDao.deleteWorldObject.mockReturnValue(true);
      templateDao.getTemplate.mockReturnValue(template as any);

      const result = await service.deleteObject(1);

      expect(result).toEqual({ success: true, typeId: 2 });
      expect(worldObjectDao.deleteWorldObject).toHaveBeenCalledWith(1);

      const expectedDir = path.join(mockProjectRoot, 'world', '2', '1');
      expect(fileSystemService.deleteDirectory).toHaveBeenCalledWith(
        expectedDir,
      );

      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId: 2,
      });
    });

    // Test case: Confirms that deletion fails if the target object is not found.
    it('should return success false if object not found', async () => {
      (
        worldObjectDao.getWorldObjectById as jest.Mock<WorldObject | null>
      ).mockReturnValue(null);
      const result = await service.deleteObject(1);
      expect(result).toEqual({ success: false });
    });

    // Test case: Verifies that deletion fails at the database level, and subsequent file system deletion is not attempted.
    it('should return success false if DB deletion fails', async () => {
      worldObjectDao.getWorldObjectById.mockReturnValue(object as any);
      worldObjectDao.deleteWorldObject.mockReturnValue(false);
      const result = await service.deleteObject(1);
      expect(result).toEqual({ success: false, typeId: 2 });
      expect(fileSystemService.deleteDirectory).not.toHaveBeenCalled();
    });

    // Test case: Checks that an error is logged if directory deletion fails, but the overall operation still reports success if the database deletion was successful.
    it('should log an error if directory deletion fails but still return success', async () => {
      worldObjectDao.getWorldObjectById.mockReturnValue(object as any);
      worldObjectDao.deleteWorldObject.mockReturnValue(true);
      templateDao.getTemplate.mockReturnValue(template as any);
      (fileSystemService.deleteDirectory as jest.Mock).mockRejectedValue(
        new Error('Delete error'),
      );

      const result = await service.deleteObject(1);

      expect(result.success).toBe(true);
      expect(MainNotificationService.error).toHaveBeenCalled();
    });

    // Test case: Asserts that object is deleted and event emitted, but file system deletion is skipped if `getProjectRoot` returns null.
    it('should delete object and emit event but not delete directory if projectRoot is null', async () => {
      const worldObject = { id: 1, name: 'ToDelete', template_id: 2 };
      const templateExample = { id: 2, name: 'Template' };
      worldObjectDao.getWorldObjectById.mockReturnValue(worldObject as any);
      worldObjectDao.deleteWorldObject.mockReturnValue(true);
      templateDao.getTemplate.mockReturnValue(templateExample as any);
      getProjectRoot.mockReturnValue(null); // projectRoot is null

      const result = await service.deleteObject(1);

      expect(result).toEqual({ success: true, typeId: 2 });
      expect(worldObjectDao.deleteWorldObject).toHaveBeenCalledWith(1);
      expect(fileSystemService.deleteDirectory).not.toHaveBeenCalled(); // Should not delete directory
      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId: 2,
      });
    });

    // Test case: Confirms that object is deleted and event emitted, but file system deletion is skipped if the template is not found.
    it('should delete object and emit event but not delete directory if template not found', async () => {
      const worldObject = { id: 1, name: 'ToDelete', template_id: 2 };
      worldObjectDao.getWorldObjectById.mockReturnValue(worldObject as any);
      worldObjectDao.deleteWorldObject.mockReturnValue(true);
      templateDao.getTemplate.mockReturnValue(undefined); // template is null
      getProjectRoot.mockReturnValue(mockProjectRoot);

      const result = await service.deleteObject(1);

      expect(result).toEqual({ success: true, typeId: 2 });
      expect(worldObjectDao.deleteWorldObject).toHaveBeenCalledWith(1);
      expect(fileSystemService.deleteDirectory).not.toHaveBeenCalled(); // Should not delete directory
      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId: 2,
      });
    });
  });

  describe('updateObjectDetails', () => {
    // Test case: Ensures that an existing object's details (name and properties) are updated and a change event is emitted.
    it('should update object details and emit an event', async () => {
      const object = { id: 1, template_id: 2 };
      worldObjectDao.getWorldObjectById.mockReturnValue(object as any);

      service.updateObjectDetails({
        id: 1,
        name: 'Updated',
        properties: '{"a":1}',
      });

      expect(worldObjectDao.updateWorldObject).toHaveBeenCalledWith(
        1,
        'Updated',
        '{"a":1}',
      );

      await new Promise(process.nextTick);
      expect(eventBus.emit).toHaveBeenCalledWith('world-objects-changed', {
        typeId: 2,
      });
    });
  });

  describe('getTemplateDetails', () => {
    // Test case: Verifies that template details are correctly retrieved from the TemplateDao.
    it('should return template details from template DAO', () => {
      const mockTemplate = { id: 1, name: 'Template' };
      templateDao.getTemplate.mockReturnValue(mockTemplate as any);

      const result = service.getTemplateDetails(1);

      expect(result).toEqual(mockTemplate);
      expect(templateDao.getTemplate).toHaveBeenCalledWith(1);
    });
  });
});
