import {
  EntityType,
  RawConnection,
  ResolvedEntity,
} from '../../../common/types';
import { BaseDao } from './BaseDao';

export class ConnectionDao extends BaseDao {
  /**
   * Ищет сущности по имени.
   * @param {string} query Запрос для поиска.
   * @param {number} currentEntityId ID текущей сущности, исключаемой из результатов.
   * @returns {ResolvedEntity[]} Список найденных сущностей.
   */
  public searchEntities(query: string, currentEntityId: number) {
    const db = this.getDb();
    const searchQuery = `%${query}%`;

    const narrativeItems = db
      .prepare(
        `SELECT
          '${EntityType.Narrative}' as type,
          ni.id,
          ni.name,
          ae.id as entityId
        FROM narrative_items ni
        JOIN all_entities ae ON ni.id = ae.narrative_id
        WHERE ni.name LIKE ? AND ae.id != ?`,
      )
      .all(searchQuery, currentEntityId);

    const worldObjects = db
      .prepare(
        `SELECT
          '${EntityType.WorldObject}' as type,
          wo.id,
          wo.name,
          ae.id as entityId
        FROM world_objects wo
        JOIN all_entities ae ON wo.id = ae.world_object_id
        WHERE wo.name LIKE ? AND ae.id != ?`,
      )
      .all(searchQuery, currentEntityId);

    return [...narrativeItems, ...worldObjects];
  }

  /**
   * Находит ID сущности из таблицы all_entities по типу и ID.
   * @param {string} type Тип сущности ('narrative' или 'world').
   * @param {number} id ID сущности.
   * @returns {number | null} ID сущности в таблице all_entities или null, если сущность не найдена.
   */
  public findEntityId(type: EntityType, id: number): number | null {
    const db = this.getDb();
    const column =
      type === EntityType.Narrative ? 'narrative_id' : 'world_object_id';
    const sql = `SELECT id FROM all_entities WHERE ${column} = ?`;
    const result = db.prepare(sql).get(id) as { id: number } | undefined;
    return result?.id ?? null;
  }

  /**
   * Находит все связи, связанные с указанной сущностью.
   * @param {number} allEntityId ID сущности в таблице all_entities.
   * @returns {RawConnection[]} Список всех связей.
   */
  public getConnections(allEntityId: number): RawConnection[] {
    const db = this.getDb();
    const sql = `
      SELECT id, description, source_id, target_id
      FROM connections
      WHERE source_id = ? OR target_id = ?
    `;
    return db.prepare(sql).all(allEntityId, allEntityId) as RawConnection[];
  }

  /**
   * Получает реальные ID сущностей и их типы по списку ID из таблице all_entities.
   * @param {number[]} allEntityIds Список ID сущностей в таблице all_entities.
   * @returns {ResolvedEntity[]} Список разрешенных сущностей.
   */
  public resolveAllEntityIds(allEntityIds: number[]): ResolvedEntity[] {
    if (allEntityIds.length === 0) {
      return [];
    }
    const db = this.getDb();
    const placeholders = allEntityIds.map(() => '?').join(',');
    const sql = `
        SELECT
          id as allEntityId,
          COALESCE(world_object_id, narrative_id) as id,
          CASE
            WHEN world_object_id IS NOT NULL THEN '${EntityType.WorldObject}'
            ELSE '${EntityType.Narrative}'
          END as type
        FROM all_entities
        WHERE id IN (${placeholders})
      `;
    return db.prepare(sql).all(allEntityIds) as ResolvedEntity[];
  }

  /**
   * Создает новую связь между двумя сущностями.
   * @param {number} sourceAllId ID исходной сущности в таблице all_entities.
   * @param {number} targetAllId ID целевой сущности в таблице all_entities.
   * @param {string} description Описание связи.
   * @returns {number} ID созданной связи.
   */
  public createConnection(
    sourceAllId: number,
    targetAllId: number,
    description: string,
  ): number {
    const db = this.getDb();
    const sql =
      'INSERT INTO connections (source_id, target_id, description) VALUES (?, ?, ?)';
    const result = db.prepare(sql).run(sourceAllId, targetAllId, description);
    return result.lastInsertRowid as number;
  }

  /**
   * Удаляет связь по ID.
   * @param {number} connectionId ID связи.
   */
  public deleteConnection(connectionId: number): void {
    const db = this.getDb();
    const sql = 'DELETE FROM connections WHERE id = ?';
    db.prepare(sql).run(connectionId);
  }

  /**
   * Получает все ID сущностей из таблицы all_entities, которые относятся к world_objects.
   * @returns {number[]} Массив all_entity_id для world_objects.
   */
  public getAllWorldObjectEntityIds(): number[] {
    const db = this.getDb();
    const sql = 'SELECT id FROM all_entities WHERE world_object_id IS NOT NULL';
    return (db.prepare(sql).all() as Array<{ id: number }>).map(
      (row) => row.id,
    );
  }

  /**
   * Получает все связи из базы данных.
   * @returns {RawConnection[]} Список всех RawConnection.
   */
  public getAllConnections(): RawConnection[] {
    const db = this.getDb();
    const sql = 'SELECT id, description, source_id, target_id FROM connections';
    return db.prepare(sql).all() as RawConnection[];
  }
}

export default ConnectionDao;
