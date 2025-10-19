import { WorldObject, WorldObjectType } from '../../common/types';
import { GenericDao } from '../data/GenericDao';

/**
 * Сервис для управления бизнес-логикой, связанной с объектами мира.
 */
export class WorldObjectService {
  private dao: GenericDao;

  constructor(dao: GenericDao) {
    this.dao = dao;
  }

  /**
   * Получает все типы объектов мира.
   * @returns {WorldObjectType[]} Массив типов объектов мира.
   */
  public getWorldObjectTypes(): WorldObjectType[] {
    return this.dao.getWorldObjectTypes();
  }

  /**
   * Получает все объекты мира для заданного типа.
   * @param {number} typeId ID типа объекта.
   * @returns {WorldObject[]} Массив объектов мира.
   */
  public getWorldObjectsByTypeId(typeId: number): WorldObject[] {
    return this.dao.getWorldObjectsByTypeId(typeId);
  }
}
