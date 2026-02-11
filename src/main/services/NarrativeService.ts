import path from 'path';
import { ItemDetails, NarrativeItem } from '../../common/types';
import { NarrativeDao } from '../data/daos/NarrativeDao';
import fileSystemService from './FileSystemService';
import MainNotificationService from './NotificationService';

import { slugify } from '../util';

/**
 * Сервис для управления бизнес-логикой, связанной с элементами повествования.
 */
export class NarrativeService {
  private narrativeDao: NarrativeDao;

  private getProjectRoot: () => string | null;

  constructor(narrativeDao: NarrativeDao, getProjectRoot: () => string | null) {
    this.narrativeDao = narrativeDao;
    this.getProjectRoot = getProjectRoot;
  }

  /**
   * Получает все элементы повествования.
   * В будущем здесь может быть логика кэширования или дополнительной обработки.
   * @returns {NarrativeItem[]} Массив объектов повествования.
   */
  public getNarrativeItems(): NarrativeItem[] {
    // На данный момент просто проксирует вызов к DAO.
    return this.narrativeDao.getNarrativeItems();
  }

  public async getDetails(id: number): Promise<ItemDetails | null> {
    const item = this.narrativeDao.getNarrativeItemById(id);
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

      if (stats) {
        fileExists = true;
        try {
          content = await fileSystemService.readFile(absolutePath);
          mtime = stats.mtimeMs;
        } catch (e) {
          MainNotificationService.error(
            `Ошибка чтения существующего файла ${absolutePath}`,
            String(e),
          );
          content = `# Ошибка чтения файла\nНе удалось прочитать файл, хотя он существует.`;
          fileExists = false; // It exists but is unreadable
        }
      }
    } else {
      fileExists = false;
      content = '# Файл не найден\\nНажмите кнопку ниже, чтобы создать его.';
    }

    return {
      id: item.id,
      name: item.name,
      title: item.title,
      path: absolutePath ?? null,
      content: content || '', // Content now strictly comes from the file or error message
      description: item.description, // Pass description separately
      plan: item.plan, // Pass plan separately
      fileExists,
      mtime,
    };
  }

  public async createNarrativeItem(
    parentId: number | null,
    templateId: number,
    name: string,
    title: string | undefined,
  ): Promise<number> {
    const projectRoot = this.getProjectRoot();
    if (!projectRoot) {
      throw new Error('Проект не открыт');
    }

    // const template = this.narrativeDao.findTemplateByName(itemType, 'narrative');
    // if (!template) {
    //   throw new Error(`Не найден шаблон для типа '${itemType}'`);
    // }

    let parentPath = 'narrative';
    if (parentId) {
      const parent = this.narrativeDao.getNarrativeItemById(parentId);
      if (parent && parent.file_path) {
        parentPath = path.dirname(parent.file_path);
      }
    }

    const newFileName = `${slugify(name)}.md`;
    const relativeFilePath = path.join(parentPath, newFileName);

    const sortOrder = this.narrativeDao.getMaxSortOrder(parentId) + 1;

    const newItemId = this.narrativeDao.createNarrativeItem(
      name,
      title,
      parentId,
      templateId,
      relativeFilePath,
      sortOrder,
    );

    const absoluteFilePath = path.join(projectRoot, relativeFilePath);
    const fileContent = title ? `# ${title}\n` : '';
    await fileSystemService.createFileWithDirs(absoluteFilePath, fileContent);

    return newItemId;
  }

  public async renameNarrativeItem(
    itemId: number,
    newName: string,
  ): Promise<void> {
    // Пока что просто меняем имя в БД, без переименования файла
    this.narrativeDao.renameNarrativeItem(itemId, newName);
  }

  /**
   * Обновляет детали элемента повествования (имя, описание, план).
   * @param {number} itemId ID элемента повествования.
   * @param {string} name Новое имя элемента.
   * @param {string | undefined} title Новый заголовок.
   * @param {string | undefined} description Новое описание (основная мысль).
   * @param {string | undefined} plan Новый план (чек-лист).
   */
  public async updateNarrativeItemDetails(
    itemId: number,
    name: string,
    title: string | undefined,
    description: string | undefined,
    plan: string | undefined,
  ): Promise<void> {
    this.narrativeDao.updateNarrativeItemDetails(
      itemId,
      name,
      title,
      description,
      plan,
    );
  }

  public async deleteNarrativeItem(itemId: number): Promise<void> {
    const childrenCount =
      this.narrativeDao.countChildrenOfNarrativeItem(itemId);
    if (childrenCount > 0) {
      throw new Error(
        'Нельзя удалить элемент, у которого есть дочерние элементы.',
      );
    }

    const projectRoot = this.getProjectRoot();
    const item = this.narrativeDao.getNarrativeItemById(itemId);

    // Сначала удаляем из БД
    this.narrativeDao.deleteNarrativeItem(itemId);

    // Затем удаляем файл, если он есть
    if (item && item.file_path && projectRoot) {
      const absoluteFilePath = path.join(projectRoot, item.file_path);
      await fileSystemService.deleteFile(absoluteFilePath);
    }
  }
}

export default NarrativeService;
