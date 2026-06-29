import ProjectSettingsService from '../../../main/services/ProjectSettingsService';
import { SettingsDao } from '../../../main/data/daos/SettingsDao';

// Mock the SettingsDao
jest.mock('../../../main/data/daos/SettingsDao');

describe('ProjectSettingsService', () => {
  let settingsDao: jest.Mocked<SettingsDao>;
  let projectSettingsService: ProjectSettingsService;

  beforeEach(() => {
    // Create a new mock instance for each test
    settingsDao =
      new (SettingsDao as jest.Mock<SettingsDao>)() as jest.Mocked<SettingsDao>;
    projectSettingsService = new ProjectSettingsService(settingsDao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSettings', () => {
    // Test case: Fetches all project settings from the DAO and verifies that their values are correctly parsed according to their defined types (number, string, boolean).
    it('should fetch all settings and parse their values correctly', async () => {
      // Arrange
      const mockRawSettings = [
        {
          key: 'editor.fontSize',
          value: '14',
          type: 'number',
          label: 'Font Size',
          description: 'The font size for the editor.',
        },
        {
          key: 'ui.theme',
          value: 'dark',
          type: 'string',
          label: 'UI Theme',
          description: 'The theme for the user interface.',
        },
        {
          key: 'autosave.enabled',
          value: 'true',
          type: 'boolean',
          label: 'Enable Autosave',
          description: 'Automatically save changes.',
        },
      ];
      settingsDao.getAllProjectSettings.mockReturnValue(mockRawSettings as any);

      // Act
      const settings = await projectSettingsService.getAllSettings();

      // Assert
      expect(settingsDao.getAllProjectSettings).toHaveBeenCalledTimes(1);
      expect(settings).toHaveLength(3);

      const fontSizeSetting = settings.find((s) => s.key === 'editor.fontSize');
      expect(fontSizeSetting?.value).toBe(14);
      expect(typeof fontSizeSetting?.value).toBe('number');

      const themeSetting = settings.find((s) => s.key === 'ui.theme');
      expect(themeSetting?.value).toBe('dark');
      expect(typeof themeSetting?.value).toBe('string');

      const autosaveSetting = settings.find(
        (s) => s.key === 'autosave.enabled',
      );
      expect(autosaveSetting?.value).toBe(true);
      expect(typeof autosaveSetting?.value).toBe('boolean');
    });
  });

  describe('updateSettings', () => {
    // Test case: Updates multiple project settings, ensuring that all setting values are converted to their string representations before being passed to the DAO for storage.
    it('should convert all setting values to strings before updating', async () => {
      // Arrange
      const settingsToUpdate = [
        { key: 'editor.fontSize', value: 16 },
        { key: 'ui.theme', value: 'light' },
        { key: 'autosave.enabled', value: false },
      ];

      // Act
      await projectSettingsService.updateSettings(settingsToUpdate);

      // Assert
      expect(settingsDao.updateProjectSettings).toHaveBeenCalledTimes(1);

      const expectedPayload = [
        { key: 'editor.fontSize', value: '16' },
        { key: 'ui.theme', value: 'light' },
        { key: 'autosave.enabled', value: 'false' },
      ];
      expect(settingsDao.updateProjectSettings).toHaveBeenCalledWith(
        expectedPayload,
      );
    });
  });
});
