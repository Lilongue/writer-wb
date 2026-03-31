import { EntityType } from '../../common/types';
import { ConnectionDao } from '../data/daos/ConnectionDao';
import { NarrativeDao } from '../data/daos/NarrativeDao';
import { WorldObjectDao } from '../data/daos/WorldObjectDao';

class ConnectionService {
  private connectionDao: ConnectionDao;

  private narrativeDao: NarrativeDao;

  private worldObjectDao: WorldObjectDao;

  constructor(
    connectionDao: ConnectionDao,
    narrativeDao: NarrativeDao,
    worldObjectDao: WorldObjectDao,
  ) {
    this.connectionDao = connectionDao;
    this.narrativeDao = narrativeDao;
    this.worldObjectDao = worldObjectDao;
  }

  getConnections(type: EntityType, id: number) {
    const allEntityId = this.connectionDao.findEntityId(type, id);
    if (!allEntityId) return [];

    const rawConnections = this.connectionDao.getConnections(allEntityId);
    if (rawConnections.length === 0) return [];

    const otherEntityIds = rawConnections.map((c) =>
      c.source_id === allEntityId ? c.target_id : c.source_id,
    );

    const resolvedEntities =
      this.connectionDao.resolveAllEntityIds(otherEntityIds);

    const narrativeIds = resolvedEntities
      .filter((r) => r.type === EntityType.Narrative)
      .map((r) => r.id);
    const worldIds = resolvedEntities
      .filter((r) => r.type === EntityType.WorldObject)
      .map((r) => r.id);

    const narrativeInfo = this.narrativeDao.getNarrativeItemsInfo(narrativeIds);
    const worldInfo = this.worldObjectDao.getWorldObjectsInfo(worldIds);

    const infoMap = new Map<string, { id: number; name: string }>();
    [...narrativeInfo, ...worldInfo].forEach((info) =>
      infoMap.set(
        `${resolvedEntities.find((r) => r.id === info.id)?.type}-${info.id}`,
        info,
      ),
    );

    return rawConnections
      .map((raw) => {
        const otherAllEntityId =
          raw.source_id === allEntityId ? raw.target_id : raw.source_id;
        const resolved = resolvedEntities.find(
          (r) => r.allEntityId === otherAllEntityId,
        );
        if (!resolved) return null;

        const info = infoMap.get(`${resolved.type}-${resolved.id}`);
        if (!info) return null;

        return {
          id: raw.id,
          description: raw.description,
          other_entity: {
            id: info.id,
            name: info.name,
            type: resolved.type,
            entityId: otherAllEntityId,
          },
        };
      })
      .filter(Boolean);
  }

  createConnection(
    sourceType: EntityType,
    sourceId: number,
    targetType: EntityType,
    targetId: number,
    description: string,
  ) {
    const sourceAllId = this.connectionDao.findEntityId(sourceType, sourceId);
    const targetAllId = this.connectionDao.findEntityId(targetType, targetId);

    if (!sourceAllId || !targetAllId) {
      throw new Error('Could not find one or both entities for connection');
    }

    return this.connectionDao.createConnection(
      sourceAllId,
      targetAllId,
      description,
    );
  }

  deleteConnection(connectionId: number) {
    return this.connectionDao.deleteConnection(connectionId);
  }

  searchEntities(query: string, currentEntity: { id: number, type: EntityType }) {
    const allEntityId = this.connectionDao.findEntityId(currentEntity.type, currentEntity.id);
    if (allEntityId === null) {
      return []; // Should not happen if currentEntity is valid, but good for safety
    }
    return this.connectionDao.searchEntities(query, allEntityId);
  }
}

export default ConnectionService;
