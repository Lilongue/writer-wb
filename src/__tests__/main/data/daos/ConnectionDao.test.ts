import { ConnectionDao } from '../../../../main/data/daos/ConnectionDao';
import {
  EntityType,
  RawConnection,
  ResolvedEntity,
} from '../../../../common/types';

// Mock the better-sqlite3 module
const mockStatement = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

const mockDb = {
  prepare: jest.fn().mockReturnValue(mockStatement),
  exec: jest.fn(),
  close: jest.fn(),
  get: jest.fn(), // Add get to the mockDb object
};

jest.mock('better-sqlite3', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockDb),
  };
});

describe('ConnectionDao', () => {
  let connectionDao: ConnectionDao;

  beforeEach(() => {
    jest.clearAllMocks();

    const getDbMock = () => mockDb as any;
    connectionDao = new ConnectionDao(getDbMock);
  });

  describe('searchEntities', () => {
    // Test case: Search for entities. Checks if the function correctly queries both narrative items and world objects and combines the results.
    it('should find and return entities matching the search query', () => {
      const mockNarrativeItems = [
        {
          type: EntityType.Narrative,
          id: 1,
          name: 'First Chapter',
          entityId: 1,
        },
      ];
      const mockWorldObjects = [
        { type: EntityType.WorldObject, id: 1, name: 'Main Hero', entityId: 3 },
      ];
      mockStatement.all
        .mockReturnValueOnce(mockNarrativeItems)
        .mockReturnValueOnce(mockWorldObjects);

      const results = connectionDao.searchEntities('search', 0);

      expect(mockDb.prepare).toHaveBeenCalledTimes(2);
      expect(mockStatement.all).toHaveBeenCalledWith('%search%', 0);
      expect(results).toEqual([...mockNarrativeItems, ...mockWorldObjects]);
    });

    // Test case: Search for entities while excluding the current entity. This prevents an entity from being connected to itself.
    it('should exclude the entity with the currentEntityId from the results', () => {
      mockStatement.all.mockReturnValue([]);

      connectionDao.searchEntities('Chapter', 1);

      expect(mockStatement.all).toHaveBeenCalledWith('%Chapter%', 1);
    });

    // Test case: Search with a term that matches no entities. Expect an empty array.
    it('should return an empty array if no entities match the query', () => {
      mockStatement.all.mockReturnValue([]);

      const results = connectionDao.searchEntities('NonExistent', 0);

      expect(results).toEqual([]);
    });
  });

  describe('findEntityId', () => {
    // Test case: Find the master entity ID for a narrative item given its specific ID.
    it('should return the all_entities ID for a narrative entity', () => {
      const narrativeId = 5;
      const expectedAllEntityId = 10;
      mockStatement.get.mockReturnValue({ id: expectedAllEntityId });

      const result = connectionDao.findEntityId(
        EntityType.Narrative,
        narrativeId,
      );

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT id FROM all_entities WHERE narrative_id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith(narrativeId);
      expect(result).toBe(expectedAllEntityId);
    });

    // Test case: Find the master entity ID for a world object given its specific ID.
    it('should return the all_entities ID for a world object entity', () => {
      const worldObjectId = 7;
      const expectedAllEntityId = 12;
      mockStatement.get.mockReturnValue({ id: expectedAllEntityId });

      const result = connectionDao.findEntityId(
        EntityType.WorldObject,
        worldObjectId,
      );

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT id FROM all_entities WHERE world_object_id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith(worldObjectId);
      expect(result).toBe(expectedAllEntityId);
    });

    // Test case: Attempt to find the master entity ID for a non-existent entity. Expect null.
    it('should return null if the entity is not found', () => {
      const narrativeId = 99;
      mockStatement.get.mockReturnValue(undefined);

      const result = connectionDao.findEntityId(
        EntityType.Narrative,
        narrativeId,
      );

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT id FROM all_entities WHERE narrative_id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith(narrativeId);
      expect(result).toBeNull();
    });
  });

  describe('findIdByAllEntityId', () => {
    // Test case: Find the specific ID (narrative or world object) from a master entity ID.
    it('should return the real entity ID for a given allEntityId', () => {
      const allEntityId = 15;
      const expectedRealId = 20;
      mockStatement.get.mockReturnValue({ id: expectedRealId });

      const result = connectionDao.findIdByAllEntityId(allEntityId);

      expect(mockDb.prepare).toHaveBeenCalledWith(`
      SELECT COALESCE(world_object_id, narrative_id) as id
      FROM all_entities
      WHERE id = ?
    `);
      expect(mockStatement.get).toHaveBeenCalledWith(allEntityId);
      expect(result).toBe(expectedRealId);
    });

    // Test case: Attempt to find a specific ID from a non-existent master entity ID. Expect null.
    it('should return null if allEntityId is not found', () => {
      const allEntityId = 999;
      mockStatement.get.mockReturnValue(undefined);

      const result = connectionDao.findIdByAllEntityId(allEntityId);

      expect(mockDb.prepare).toHaveBeenCalledWith(`
      SELECT COALESCE(world_object_id, narrative_id) as id
      FROM all_entities
      WHERE id = ?
    `);
      expect(mockStatement.get).toHaveBeenCalledWith(allEntityId);
      expect(result).toBeNull();
    });
  });

  describe('getConnections', () => {
    // Test case: Retrieve all connections for a given entity, regardless of whether it's the source or target.
    it('should return all connections where the entity is source or target', () => {
      const allEntityId = 100;
      const mockConnections: RawConnection[] = [
        { id: 1, description: 'conn1', source_id: 100, target_id: 101 },
        { id: 2, description: 'conn2', source_id: 102, target_id: 100 },
      ];
      mockStatement.all.mockReturnValue(mockConnections);

      const result = connectionDao.getConnections(allEntityId);

      expect(mockDb.prepare).toHaveBeenCalledWith(`
      SELECT id, description, source_id, target_id
      FROM connections
      WHERE source_id = ? OR target_id = ?
    `);
      expect(mockStatement.all).toHaveBeenCalledWith(allEntityId, allEntityId);
      expect(result).toEqual(mockConnections);
    });

    // Test case: Retrieve connections for an entity that has none. Expect an empty array.
    it('should return an empty array if no connections are found', () => {
      const allEntityId = 200;
      mockStatement.all.mockReturnValue([]);

      const result = connectionDao.getConnections(allEntityId);

      expect(mockDb.prepare).toHaveBeenCalledWith(`
      SELECT id, description, source_id, target_id
      FROM connections
      WHERE source_id = ? OR target_id = ?
    `);
      expect(mockStatement.all).toHaveBeenCalledWith(allEntityId, allEntityId);
      expect(result).toEqual([]);
    });
  });

  describe('resolveAllEntityIds', () => {
    // Test case: Resolve a list of master entity IDs into their specific types and IDs.
    it('should return resolved entities for given allEntityIds', () => {
      const allEntityIds = [1, 2, 3];
      const mockResolvedEntities: ResolvedEntity[] = [
        { allEntityId: 1, id: 10, type: EntityType.Narrative },
        { allEntityId: 2, id: 20, type: EntityType.WorldObject },
        { allEntityId: 3, id: 30, type: EntityType.Narrative },
      ];
      mockStatement.all.mockReturnValue(mockResolvedEntities);

      const result = connectionDao.resolveAllEntityIds(allEntityIds);

      expect(mockDb.prepare).toHaveBeenCalledWith(`
        SELECT
          id as allEntityId,
          COALESCE(world_object_id, narrative_id) as id,
          CASE
            WHEN world_object_id IS NOT NULL THEN '${EntityType.WorldObject}'
            ELSE '${EntityType.Narrative}'
          END as type
        FROM all_entities
        WHERE id IN (?,?,?)
      `);
      expect(mockStatement.all).toHaveBeenCalledWith(allEntityIds);
      expect(result).toEqual(mockResolvedEntities);
    });

    // Test case: Attempt to resolve an empty list of IDs. Expect an empty array and no database calls.
    it('should return an empty array if input is empty', () => {
      const result = connectionDao.resolveAllEntityIds([]);

      expect(mockDb.prepare).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    // Test case: Resolve a list of IDs containing some that do not exist in the database. Expect only existing entities to be returned.
    it('should handle non-existent IDs in the input array', () => {
      const allEntityIds = [1, 999]; // 999 is non-existent
      const mockResolvedEntities: ResolvedEntity[] = [
        { allEntityId: 1, id: 10, type: EntityType.Narrative },
      ];
      mockStatement.all.mockReturnValue(mockResolvedEntities);

      const result = connectionDao.resolveAllEntityIds(allEntityIds);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id IN (?,?)'),
      );
      expect(mockStatement.all).toHaveBeenCalledWith(allEntityIds);
      expect(result).toEqual(mockResolvedEntities);
    });
  });

  describe('createConnection', () => {
    // Test case: Create a new connection between two entities and verify that the new connection's ID is returned.
    it('should create a new connection and return its ID', () => {
      const sourceId = 1;
      const targetId = 2;
      const description = 'test connection';
      const expectedNewId = 123;
      mockStatement.run.mockReturnValue({ lastInsertRowid: expectedNewId });

      const result = connectionDao.createConnection(
        sourceId,
        targetId,
        description,
      );

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'INSERT INTO connections (source_id, target_id, description) VALUES (?, ?, ?)',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        sourceId,
        targetId,
        description,
      );
      expect(result).toBe(expectedNewId);
    });
  });

  describe('deleteConnection', () => {
    // Test case: Delete a specific connection by its ID.
    it('should delete a connection by its ID', () => {
      const connectionId = 456;

      connectionDao.deleteConnection(connectionId);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM connections WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(connectionId);
    });
  });

  describe('getAllWorldObjectEntityIds', () => {
    // Test case: Retrieve all master entity IDs that correspond to world objects.
    it('should return all entity IDs for world objects', () => {
      const mockIds = [{ id: 1 }, { id: 2 }];
      mockStatement.all.mockReturnValue(mockIds);

      const result = connectionDao.getAllWorldObjectEntityIds();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT id FROM all_entities WHERE world_object_id IS NOT NULL',
      );
      expect(mockStatement.all).toHaveBeenCalled();
      expect(result).toEqual([1, 2]);
    });

    // Test case: Retrieve world object entity IDs when there are no world objects. Expect an empty array.
    it('should return an empty array if no world objects exist', () => {
      mockStatement.all.mockReturnValue([]);

      const result = connectionDao.getAllWorldObjectEntityIds();

      expect(result).toEqual([]);
    });
  });

  describe('getAllConnections', () => {
    // Test case: Retrieve every single connection from the database.
    it('should return all connections from the database', () => {
      const mockConnections: RawConnection[] = [
        { id: 1, description: 'conn1', source_id: 100, target_id: 101 },
        { id: 2, description: 'conn2', source_id: 102, target_id: 103 },
      ];
      mockStatement.all.mockReturnValue(mockConnections);

      const result = connectionDao.getAllConnections();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT id, description, source_id, target_id FROM connections',
      );
      expect(mockStatement.all).toHaveBeenCalled();
      expect(result).toEqual(mockConnections);
    });

    // Test case: Retrieve all connections when none exist. Expect an empty array.
    it('should return an empty array if no connections exist', () => {
      mockStatement.all.mockReturnValue([]);

      const result = connectionDao.getAllConnections();

      expect(result).toEqual([]);
    });
  });
});
