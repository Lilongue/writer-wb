import { GenericDao } from '../data/GenericDao';

class ConnectionService {
  private genericDao: GenericDao;

  constructor(genericDao: GenericDao) {
    this.genericDao = genericDao;
  }

  getConnections(type: 'narrative' | 'world', id: number) {
    const allEntityId = this.genericDao.findEntityId(type, id);
    if (!allEntityId) return [];

    const rawConnections = this.genericDao.getConnections(allEntityId);
    if (rawConnections.length === 0) return [];

    const otherEntityIds = rawConnections.map((c) =>
      c.source_id === allEntityId ? c.target_id : c.source_id,
    );

    const resolvedEntities = this.genericDao.resolveAllEntityIds(otherEntityIds);

    const narrativeIds = resolvedEntities
      .filter((r) => r.type === 'narrative')
      .map((r) => r.id);
    const worldIds = resolvedEntities
      .filter((r) => r.type === 'world')
      .map((r) => r.id);

    const narrativeInfo = this.genericDao.getNarrativeItemsInfo(narrativeIds);
    const worldInfo = this.genericDao.getWorldObjectsInfo(worldIds);

    const infoMap = new Map<string, { id: number; name: string }>();
    [...narrativeInfo, ...worldInfo].forEach((info) =>
      infoMap.set(`${resolvedEntities.find((r) => r.id === info.id)?.type}-${info.id}`, info),
    );

    return rawConnections.map((raw) => {
      const otherAllEntityId = raw.source_id === allEntityId ? raw.target_id : raw.source_id;
      const resolved = resolvedEntities.find((r) => r.allEntityId === otherAllEntityId);
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
    }).filter(Boolean);
  }

  createConnection(
    sourceType: 'narrative' | 'world',
    sourceId: number,
    targetType: 'narrative' | 'world',
    targetId: number,
    description: string,
  ) {
    const sourceAllId = this.genericDao.findEntityId(sourceType, sourceId);
    const targetAllId = this.genericDao.findEntityId(targetType, targetId);

    if (!sourceAllId || !targetAllId) {
      throw new Error('Could not find one or both entities for connection');
    }

    return this.genericDao.createConnection(sourceAllId, targetAllId, description);
  }

  deleteConnection(connectionId: number) {
    return this.genericDao.deleteConnection(connectionId);
  }
  searchEntities(query: string, currentEntityId: number) {
    return this.genericDao.searchEntities(query, currentEntityId);
  }
}

export default ConnectionService;
