/* eslint-disable @typescript-eslint/no-explicit-any */
import ConnectionService from '../../../main/services/ConnectionService';
import { ConnectionDao } from '../../../main/data/daos/ConnectionDao';
import { NarrativeDao } from '../../../main/data/daos/NarrativeDao';
import { WorldObjectDao } from '../../../main/data/daos/WorldObjectDao';
import { EntityType } from '../../../common/types';

// Mock the DAOs
jest.mock('../../../main/data/daos/ConnectionDao');
jest.mock('../../../main/data/daos/NarrativeDao');
jest.mock('../../../main/data/daos/WorldObjectDao');

describe('ConnectionService', () => {
  let connectionService: ConnectionService;
  let mockConnectionDao: jest.Mocked<ConnectionDao>;
  let mockNarrativeDao: jest.Mocked<NarrativeDao>;
  let mockWorldObjectDao: jest.Mocked<WorldObjectDao>;

  beforeEach(() => {
    // Create new mock instances for each test
    mockConnectionDao = new (ConnectionDao as any)();
    mockNarrativeDao = new (NarrativeDao as any)();
    mockWorldObjectDao = new (WorldObjectDao as any)();

    // Default mock return values for DAO methods
    mockNarrativeDao.getNarrativeItemsInfo.mockReturnValue([]);
    mockWorldObjectDao.getWorldObjectsInfo.mockReturnValue([]);

    connectionService = new ConnectionService(
      mockConnectionDao,
      mockNarrativeDao,
      mockWorldObjectDao,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnections', () => {
    // Test case: Entity ID is not found. Expect an empty array of connections.
    it('should return an empty array if the entity is not found', () => {
      mockConnectionDao.findEntityId.mockReturnValue(null);
      const result = connectionService.getConnections(EntityType.Narrative, 1);
      expect(result).toEqual([]);
      expect(mockConnectionDao.findEntityId).toHaveBeenCalledWith(
        EntityType.Narrative,
        1,
      );
    });

    // Test case: No raw connections are found for the given entity. Expect an empty array.
    it('should return an empty array if no connections are found', () => {
      mockConnectionDao.findEntityId.mockReturnValue(101);
      mockConnectionDao.getConnections.mockReturnValue([]);
      const result = connectionService.getConnections(EntityType.Narrative, 1);
      expect(result).toEqual([]);
      expect(mockConnectionDao.getConnections).toHaveBeenCalledWith(101);
    });

    // Test case: Successfully retrieve and detail connections for an entity, including mixed types (WorldObject and Narrative).
    it('should return detailed connections for a given entity with mixed types', () => {
      const allEntityId = 101;
      const otherAllEntityIdWorld = 202;
      const otherAllEntityIdNarrative = 203;
      const narrativeId = 2;
      const worldObjectId = 3;

      mockConnectionDao.findEntityId.mockReturnValue(allEntityId);
      mockConnectionDao.getConnections.mockReturnValue([
        {
          id: 1,
          source_id: allEntityId,
          target_id: otherAllEntityIdWorld,
          description: 'world desc',
        },
        {
          id: 2,
          source_id: otherAllEntityIdNarrative,
          target_id: allEntityId,
          description: 'narrative desc',
        }, // Note: source and target are swapped to test target connection type
      ]);
      mockConnectionDao.resolveAllEntityIds.mockReturnValue([
        {
          allEntityId: otherAllEntityIdWorld,
          id: worldObjectId,
          type: EntityType.WorldObject,
        },
        {
          allEntityId: otherAllEntityIdNarrative,
          id: narrativeId,
          type: EntityType.Narrative,
        },
      ]);
      mockNarrativeDao.getNarrativeItemsInfo.mockReturnValue([
        { id: narrativeId, name: 'Other Narrative' },
      ]);
      mockWorldObjectDao.getWorldObjectsInfo.mockReturnValue([
        {
          id: worldObjectId,
          name: 'Other Object',
          template_id: 4,
          template_name: 'Character',
        },
      ]);

      const result = connectionService.getConnections(EntityType.Narrative, 1);

      expect(result).toHaveLength(2);

      // Check WorldObject connection
      expect(result[0]).toEqual({
        id: 1,
        description: 'world desc',
        connectionType: 'source',
        connectedEntity: {
          id: worldObjectId,
          name: 'Other Object',
          type: EntityType.WorldObject,
          template: {
            id: 4,
            name: 'Character',
          },
        },
      });

      // Check Narrative connection
      expect(result[1]).toEqual({
        id: 2,
        description: 'narrative desc',
        connectionType: 'target',
        connectedEntity: {
          id: narrativeId,
          name: 'Other Narrative',
          type: EntityType.Narrative,
        },
      });
    });

    // Test case: Connections exist, but the other entity cannot be resolved by resolveAllEntityIds. Expect connections to be filtered out.
    it('should filter out connections where the other entity cannot be resolved', () => {
      mockConnectionDao.findEntityId.mockReturnValue(101);
      mockConnectionDao.getConnections.mockReturnValue([
        { id: 1, source_id: 101, target_id: 202, description: 'test' },
      ]);
      mockConnectionDao.resolveAllEntityIds.mockReturnValue([]); // Return no resolved entities

      const result = connectionService.getConnections(EntityType.Narrative, 1);
      expect(result).toHaveLength(0);
    });

    // Test case: Connections and resolved entities exist, but information for the connected entity (narrative/world object details) is not found. Expect connections to be filtered out.
    it('should filter out connections where info for the other entity is not found', () => {
      const allEntityId = 101;
      const otherAllEntityId = 202;
      const worldObjectId = 3; // This object will not have info

      mockConnectionDao.findEntityId.mockReturnValue(allEntityId);
      mockConnectionDao.getConnections.mockReturnValue([
        {
          id: 1,
          source_id: allEntityId,
          target_id: otherAllEntityId,
          description: 'test',
        },
      ]);
      mockConnectionDao.resolveAllEntityIds.mockReturnValue([
        {
          allEntityId: otherAllEntityId,
          id: worldObjectId,
          type: EntityType.WorldObject,
        },
      ]);
      // Explicitly return empty arrays for info, so infoMap.get will return undefined for worldObjectId
      mockNarrativeDao.getNarrativeItemsInfo.mockReturnValue([]);
      mockWorldObjectDao.getWorldObjectsInfo.mockReturnValue([]);

      const result = connectionService.getConnections(EntityType.Narrative, 1);
      expect(result).toHaveLength(0);
    });

    // Test case: Verify that the connection type is correctly identified as 'target' when the entity is the target of a connection.
    it('should correctly identify target connection type', () => {
      const allEntityId = 101;
      const otherAllEntityId = 202;
      const worldObjectId = 3;

      mockConnectionDao.findEntityId.mockReturnValue(allEntityId);
      mockConnectionDao.getConnections.mockReturnValue([
        {
          id: 1,
          source_id: otherAllEntityId,
          target_id: allEntityId,
          description: 'test desc',
        },
      ]);
      mockConnectionDao.resolveAllEntityIds.mockReturnValue([
        {
          allEntityId: otherAllEntityId,
          id: worldObjectId,
          type: EntityType.WorldObject,
        },
      ]);
      mockNarrativeDao.getNarrativeItemsInfo.mockReturnValue([]);
      mockWorldObjectDao.getWorldObjectsInfo.mockReturnValue([
        {
          id: worldObjectId,
          name: 'Other Object',
          template_id: 4,
          template_name: 'Character',
        },
      ]);

      const result = connectionService.getConnections(EntityType.Narrative, 1);
      expect(result[0].connectionType).toBe('target');
    });
  });

  describe('createConnection', () => {
    // Test case: Attempt to create a connection where the source entity's master ID cannot be found. Expect an error.
    it('should throw an error if source entity is not found', () => {
      mockConnectionDao.findEntityId.mockReturnValueOnce(null);
      mockConnectionDao.findEntityId.mockReturnValueOnce(102);
      expect(() =>
        connectionService.createConnection(
          EntityType.Narrative,
          1,
          EntityType.WorldObject,
          2,
          'desc',
        ),
      ).toThrow('Could not find one or both entities for connection');
    });

    // Test case: Successfully create a connection between two existing entities. Expect the new connection's ID to be returned.
    it('should create a connection successfully', () => {
      mockConnectionDao.findEntityId.mockReturnValueOnce(101);
      mockConnectionDao.findEntityId.mockReturnValueOnce(102);
      mockConnectionDao.createConnection.mockReturnValue(5);

      const result = connectionService.createConnection(
        EntityType.Narrative,
        1,
        EntityType.WorldObject,
        2,
        'desc',
      );
      expect(mockConnectionDao.createConnection).toHaveBeenCalledWith(
        101,
        102,
        'desc',
      );
      expect(result).toEqual(5);
    });
  });

  describe('deleteConnection', () => {
    // Test case: Successfully delete an existing connection by its ID. Expect no return value (undefined).
    it('should call the dao to delete the connection', () => {
      const result = connectionService.deleteConnection(1);
      expect(mockConnectionDao.deleteConnection).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });
  });

  describe('searchEntities', () => {
    // Test case: Current entity's master ID cannot be found. Expect an empty array of search results.
    it('should return an empty array if the current entity is not found', () => {
      mockConnectionDao.findEntityId.mockReturnValue(null);
      const result = connectionService.searchEntities('query', {
        id: 1,
        type: EntityType.Narrative,
      });
      expect(result).toEqual([]);
    });

    // Test case: Successfully search for entities using a query and a valid current entity ID. Expect a list of matching entities.
    it('should call the dao to search for entities', () => {
      const searchResult = [
        { id: 1, name: 'Found', type: EntityType.WorldObject },
      ];
      mockConnectionDao.findEntityId.mockReturnValue(101);
      mockConnectionDao.searchEntities.mockReturnValue(searchResult);

      const result = connectionService.searchEntities('query', {
        id: 1,
        type: EntityType.Narrative,
      });
      expect(mockConnectionDao.searchEntities).toHaveBeenCalledWith(
        'query',
        101,
      );
      expect(result).toEqual(searchResult);
    });
  });
});
