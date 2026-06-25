import { WorldObjectDao } from '../../../../main/data/daos/WorldObjectDao';
import { WorldObject, WorldObjectType } from '../../../../common/types';

const mockStatement = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

const mockDb = {
  prepare: jest.fn().mockReturnValue(mockStatement),
  transaction: jest.fn((fn) => fn), // Mock transaction to just execute the function
};

jest.mock('better-sqlite3', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockDb),
  };
});

describe('WorldObjectDao', () => {
  let worldObjectDao: WorldObjectDao;

  beforeEach(() => {
    jest.clearAllMocks();
    const getDbMock = () => mockDb as any;
    worldObjectDao = new WorldObjectDao(getDbMock);
  });

  describe('getWorldObjectTypes', () => {
    // Test case: Retrieve all visible world object types (templates) ordered by name.
    it('should return all visible world object types', () => {
      const mockTypes: WorldObjectType[] = [
        { id: 1, name: 'Character' },
        { id: 2, name: 'Location' },
      ];
      mockStatement.all.mockReturnValue(mockTypes);

      const result = worldObjectDao.getWorldObjectTypes();

      expect(mockDb.prepare).toHaveBeenCalledWith(`
        SELECT id, name
        FROM entity_templates
        WHERE category = 'world' AND is_visible = TRUE
        ORDER BY name ASC;
    `);
      expect(mockStatement.all).toHaveBeenCalledWith();
      expect(result).toEqual(mockTypes);
    });
  });

  describe('getWorldObjectsByTypeId', () => {
    // Test case: Retrieve world objects associated with a specific template ID, ordered by name.
    it('should return world objects filtered by type ID', () => {
      const mockWorldObjects: WorldObject[] = [
        { id: 101, name: 'Hero', template_id: 1, properties: '{}' },
        { id: 102, name: 'Villain', template_id: 1, properties: '{}' },
      ];
      mockStatement.all.mockReturnValue(mockWorldObjects);

      const result = worldObjectDao.getWorldObjectsByTypeId(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(`
        SELECT id, name, template_id
        FROM world_objects
        WHERE template_id = ?
        ORDER BY name ASC;
    `);
      expect(mockStatement.all).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockWorldObjects);
    });
  });

  describe('getWorldObjectById', () => {
    // Test case: Retrieve a single world object by its unique identifier.
    it('should return a world object by its ID', () => {
      const mockWorldObject: WorldObject = {
        id: 201,
        name: 'Castle',
        template_id: 2,
        properties: '{}',
      };
      mockStatement.get.mockReturnValue(mockWorldObject);

      const result = worldObjectDao.getWorldObjectById(201);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM world_objects WHERE id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith(201);
      expect(result).toEqual(mockWorldObject);
    });
  });

  describe('getAllWorldObjects', () => {
    // Test case: Retrieve all world objects from the database.
    it('should return all world objects', () => {
      const mockWorldObjects: WorldObject[] = [
        { id: 1, name: 'Obj1', template_id: 1, properties: '{}' },
        { id: 2, name: 'Obj2', template_id: 2, properties: '{}' },
      ];
      mockStatement.all.mockReturnValue(mockWorldObjects);

      const result = worldObjectDao.getAllWorldObjects();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM world_objects',
      );
      expect(mockStatement.all).toHaveBeenCalledWith();
      expect(result).toEqual(mockWorldObjects);
    });
  });

  describe('createWorldObject', () => {
    // Test case: Create a new world object along with its corresponding all_entity entry within a database transaction.
    it('should create a new world object and an all_entity entry in a transaction', () => {
      const newWorldObjectId = 301;
      // Mock for the first run call (world_objects insert)
      mockStatement.run.mockReturnValueOnce({
        lastInsertRowid: newWorldObjectId,
      });
      // Mock for the second run call (all_entities insert)
      mockStatement.run.mockReturnValueOnce({});

      const result = worldObjectDao.createWorldObject(
        'New Obj',
        3,
        '{"hp":100}',
      );

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO world_objects'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'New Obj',
        3,
        '{"hp":100}',
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO all_entities'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(newWorldObjectId);
      expect(result).toBe(newWorldObjectId);
    });
  });

  describe('updateWorldObject', () => {
    // Test case: Update the name and properties of an existing world object.
    it('should update an existing world object', () => {
      worldObjectDao.updateWorldObject(401, 'Updated Name', '{"mana":50}');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE world_objects SET name = ?, properties = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'Updated Name',
        '{"mana":50}',
        401,
      );
    });
  });

  describe('deleteWorldObject', () => {
    // Test case: Delete a world object by its ID and confirm successful deletion.
    it('should delete a world object and return true on success', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });

      const result = worldObjectDao.deleteWorldObject(501);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM world_objects WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(501);
      expect(result).toBe(true);
    });

    // Test case: Attempt to delete a non-existent world object. Expect no changes and a false return.
    it('should return false if no rows were deleted', () => {
      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = worldObjectDao.deleteWorldObject(999);

      expect(result).toBe(false);
    });
  });

  describe('getWorldObjectsInfo', () => {
    // Test case: Retrieve detailed information for a list of given world object IDs, including their associated template details.
    it('should return info for given world object IDs', () => {
      const mockInfos = [
        { id: 1, name: 'Char1', template_id: 10, template_name: 'Temp1' },
      ];
      mockStatement.all.mockReturnValue(mockInfos);

      const result = worldObjectDao.getWorldObjectsInfo([1]);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining(`
      SELECT
        wo.id,
        wo.name,
        et.id as template_id,
        et.name as template_name
      FROM world_objects wo
      JOIN entity_templates et ON wo.template_id = et.id
      WHERE wo.id IN (?)
    `),
      );
      expect(mockStatement.all).toHaveBeenCalledWith([1]);
      expect(result).toEqual(mockInfos);
    });

    // Test case: Handle an empty array of IDs for retrieving world object information. Expect an empty result without database interaction.
    it('should return an empty array if no IDs are provided', () => {
      const result = worldObjectDao.getWorldObjectsInfo([]);
      expect(mockDb.prepare).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    // Test case: Retrieve detailed information for multiple world object IDs.
    it('should handle multiple IDs', () => {
      const mockInfos = [
        { id: 1, name: 'Char1', template_id: 10, template_name: 'Temp1' },
        { id: 2, name: 'Char2', template_id: 11, template_name: 'Temp2' },
      ];
      mockStatement.all.mockReturnValue(mockInfos);
      const result = worldObjectDao.getWorldObjectsInfo([1, 2]);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE wo.id IN (?,?)'),
      );
      expect(mockStatement.all).toHaveBeenCalledWith([1, 2]);
      expect(result).toEqual(mockInfos);
    });
  });

  describe('countWorldObjectsByTemplateId', () => {
    // Test case: Count the number of world objects associated with a specific template ID.
    it('should return the count of world objects for a given template ID', () => {
      mockStatement.get.mockReturnValue({ count: 5 });

      const result = worldObjectDao.countWorldObjectsByTemplateId(10);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM world_objects WHERE template_id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith(10);
      expect(result).toBe(5);
    });

    // Test case: Count world objects for a template ID that has no associated objects. Expect a count of 0.
    it('should return 0 if no world objects are found for the template ID', () => {
      mockStatement.get.mockReturnValue({ count: 0 });

      const result = worldObjectDao.countWorldObjectsByTemplateId(99);

      expect(result).toBe(0);
    });
  });
});
