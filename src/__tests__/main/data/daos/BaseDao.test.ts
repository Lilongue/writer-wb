import Database from 'better-sqlite3';
import { BaseDao } from '../../../../main/data/daos/BaseDao';

// A concrete implementation of BaseDao for testing purposes
class ConcreteDao extends BaseDao {
  // A dummy method to make it a concrete class
  public getDbInstance() {
    return this.getDb();
  }
}

describe('BaseDao', () => {
  it('should store and provide access to the database connection', () => {
    const mockDb = {} as Database.Database;
    const getDbMock = jest.fn(() => mockDb);

    const dao = new ConcreteDao(getDbMock);
    const dbInstance = dao.getDbInstance();

    expect(getDbMock).toHaveBeenCalledTimes(1);
    expect(dbInstance).toBe(mockDb);
  });
});
