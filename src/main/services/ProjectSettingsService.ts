import { GenericDao } from '../data/GenericDao';
import { ProjectSetting } from '../../common/types';

class ProjectSettingsService {
  private genericDao: GenericDao;

  constructor(genericDao: GenericDao) {
    this.genericDao = genericDao;
  }

  /**
   * Получает все настройки проекта из базы данных.
   * @returns {Promise<ProjectSetting[]>} Массив объектов ProjectSetting.
   */
  public async getAllSettings(): Promise<ProjectSetting[]> {
    const settings = this.genericDao.getAllProjectSettings();
    return settings.map((setting) => {
      // Конвертация строкового значения из БД в соответствующий тип
      let parsedValue: any;
      switch (setting.type) {
        case 'boolean':
          parsedValue = setting.value === 'true';
          break;
        case 'number':
          parsedValue = Number(setting.value);
          break;
        default:
          parsedValue = setting.value;
      }
      return { ...setting, value: parsedValue };
    });
  }

  /**
   * Обновляет значения нескольких настроек проекта.
   * @param {Array<{ key: string; value: any }>} settings Массив объектов с ключом и новым значением.
   * @returns {Promise<void>}
   */
  public async updateSettings(
    settings: { key: string; value: any }[],
  ): Promise<void> {
    const settingsToUpdate = settings.map((s) => ({
      key: s.key,
      value: String(s.value), // Всегда сохраняем как строку в БД
    }));
    this.genericDao.updateProjectSettings(settingsToUpdate);
  }
}

export default ProjectSettingsService;
