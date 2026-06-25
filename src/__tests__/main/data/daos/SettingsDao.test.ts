import { ProjectSetting } from '../../../../common/types';
import { SettingsDao } from '../../../../main/data/daos/SettingsDao';

// Mock the better-sqlite3 module.
// This is not strictly necessary for the tests to pass since we are injecting the DB mock,
// but it's good practice to have it to prevent any real DB instantiation.
jest.mock('better-sqlite3');

const mockStatement = {
  run: jest.fn(),
  all: jest.fn(),
};

const mockDb = {
  prepare: jest.fn(),
  transaction: jest.fn(),
};

describe('SettingsDao', () => {
  let settingsDao: SettingsDao;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Configure mock implementations
    (mockDb.prepare as jest.Mock).mockReturnValue(mockStatement);
    (mockDb.transaction as jest.Mock).mockImplementation(
      (fn) =>
        (...args: any[]) =>
          fn(...args),
    );

    // Create a mock function that returns our single database mock object
    const getDbMock = () => mockDb as any;

    // Instantiate the DAO with the mock function
    settingsDao = new SettingsDao(getDbMock);
  });

  describe('getAllProjectSettings', () => {
    // Test case: Retrieve all project settings from the database. Verifies that the correct SQL query is used and all settings are returned.
    it('should return all project settings', () => {
      const mockSettings: ProjectSetting[] = [
        {
          key: 'setting1',
          value: 'value1',
          name: 'Setting One',
          description: 'Description 1',
          category: 'General',
          type: 'string',
          uiHint: 'text',
        },
        {
          key: 'setting2',
          value: 'value2',
          name: 'Setting Two',
          description: 'Description 2',
          category: 'General',
          type: 'number',
          uiHint: 'text',
        },
      ];
      mockStatement.all.mockReturnValue(mockSettings);

      const result = settingsDao.getAllProjectSettings();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT key, value, name, description, category, type, uiHint FROM project_settings',
      );
      expect(mockStatement.all).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateProjectSettings', () => {
    // Test case: Update multiple project settings in a single transaction. Ensures that the update statement is prepared correctly and executed for each setting within a transaction.
    it('should update multiple project settings within a transaction', () => {
      const settingsToUpdate = [
        { key: 'setting1', value: 'newValue1' },
        { key: 'setting2', value: 'newValue2' },
      ];

      settingsDao.updateProjectSettings(settingsToUpdate);

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE project_settings SET value = ? WHERE key = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledTimes(settingsToUpdate.length);
      expect(mockStatement.run).toHaveBeenCalledWith('newValue1', 'setting1');
      expect(mockStatement.run).toHaveBeenCalledWith('newValue2', 'setting2');
    });
  });
});
