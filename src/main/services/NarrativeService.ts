import { NarrativeItem } from '../../common/types';
import { GenericDao } from '../data/GenericDao';

/**
 * Сервис для управления бизнес-логикой, связанной с элементами повествования.
 */
export class NarrativeService {
  private dao: GenericDao;

  constructor(dao: GenericDao) {
    this.dao = dao;
  }

  /**
   * Получает все элементы повествования.
   * В будущем здесь может быть логика кэширования или дополнительной обработки.
   * @returns {NarrativeItem[]} Массив объектов повествования.
   */
  public getNarrativeItems(): NarrativeItem[] {
    // На данный момент просто проксирует вызов к DAO.
    return this.dao.getNarrativeItems();
  }

  // В будущем здесь появятся другие методы бизнес-логики:
  // - createNewChapter(parentId, name)
  // - moveItem(itemId, newParentId, newSortOrder)
  // - и т.д.
}

export default NarrativeService;
