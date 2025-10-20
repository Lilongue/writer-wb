/* eslint-disable no-console */
import path from 'path';
import { ItemDetails, NarrativeItem } from '../../common/types';
import { GenericDao } from '../data/GenericDao';
import fileSystemService from './FileSystemService';

/**
 * Сервис для управления бизнес-логикой, связанной с элементами повествования.
 */
export class NarrativeService {
  private dao: GenericDao;

  private getProjectRoot: () => string | null;

  constructor(dao: GenericDao, getProjectRoot: () => string | null) {
    this.dao = dao;
    this.getProjectRoot = getProjectRoot;
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

  public async getDetails(id: number): Promise<ItemDetails | null> {
    const item = this.dao.getNarrativeItemById(id);
    if (!item) {
      return null;
    }

    const projectRoot = this.getProjectRoot();
    let content: string | undefined;
    let absolutePath: string | undefined;
    let fileExists = false;
    let mtime: number | null = null;

    if (item.file_path && projectRoot) {
      absolutePath = path.join(projectRoot, item.file_path);
      const stats = await fileSystemService.getStats(absolutePath);
      fileExists = stats !== null;

      if (fileExists) {
        try {
          content = await fileSystemService.readFile(absolutePath);
          mtime = stats.mtimeMs;
        } catch (e) {
          console.error(`Error reading existing file ${absolutePath}`, e);
          content = `# Ошибка чтения файла\nНе удалось прочитать файл, хотя он существует.`;
          fileExists = false; // Считаем, что его нет, раз не смогли прочитать
        }
      } else {
        content = `# Файл не найден\nНажмите кнопку ниже, чтобы создать его.`;
      }
    }

    return {
      id: item.id,
      name: item.name,
      path: absolutePath,
      content: content || item.description || '',
      fileExists,
      mtime,
    };
  }

  // В будущем здесь появятся другие методы бизнес-логики:
  // - createNewChapter(parentId, name)
  // - moveItem(itemId, newParentId, newSortOrder)
  // - и т.д.
}

export default NarrativeService;
