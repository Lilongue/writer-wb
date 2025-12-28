import Database from 'better-sqlite3';

export abstract class BaseDao {
  protected getDb: () => Database.Database;

  constructor(getDb: () => Database.Database) {
    this.getDb = getDb;
  }
}

export default BaseDao;
