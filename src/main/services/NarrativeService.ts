/* eslint-disable no-console */
import path from 'path';
import { ItemDetails, NarrativeItem } from '../../common/types';
import { GenericDao } from '../data/GenericDao';
import fileSystemService from './FileSystemService';

import { slugify } from '../util';

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

      if (stats) {
        fileExists = true;
        try {
          content = await fileSystemService.readFile(absolutePath);
          mtime = stats.mtimeMs;
        } catch (e) {
          console.error(`Error reading existing file ${absolutePath}`, e);
          content = `# Ошибка чтения файла\nНе удалось прочитать файл, хотя он существует.`;
          fileExists = false; // It exists but is unreadable
        }
      } else {
        fileExists = false;
        content = `# Файл не найден\nНажмите кнопку ниже, чтобы создать его.`;
      }
    }

    return {
      id: item.id,
      name: item.name,
      path: absolutePath ?? null,
      content: content || item.description || '',
      fileExists,
      mtime,
    };
  }

  public async createNarrativeItem(
    parentId: number | null,
    itemType: string,
    name: string,
  ): Promise<number> {
    const projectRoot = this.getProjectRoot();
    if (!projectRoot) {
      throw new Error('Проект не открыт');
    }

    const template = this.dao.findTemplateByName(itemType, 'narrative');
    if (!template) {
      throw new Error(`Не найден шаблон для типа '${itemType}'`);
    }

    let parentPath = 'narrative';
    if (parentId) {
      const parent = this.dao.getNarrativeItemById(parentId);
      if (parent && parent.file_path) {
        parentPath = path.dirname(parent.file_path);
      }
    }

    const newFileName = `${slugify(name)}.md`;
    const relativeFilePath = path.join(parentPath, newFileName);

    const sortOrder = this.dao.getMaxSortOrder(parentId) + 1;

    const newItemId = this.dao.createNarrativeItem(
      name,
      parentId,
      template.id,
      relativeFilePath,
      sortOrder,
    );

    const absoluteFilePath = path.join(projectRoot, relativeFilePath);
    await fileSystemService.createFileWithDirs(absoluteFilePath, `# ${name}\n`);

    return newItemId;
  }

  public async renameNarrativeItem(
    itemId: number,
    newName: string,
  ): Promise<void> {
    // Пока что просто меняем имя в БД, без переименования файла
    this.dao.renameNarrativeItem(itemId, newName);
  }

  public async deleteNarrativeItem(itemId: number): Promise<void> {
    const childrenCount = this.dao.countChildrenOfNarrativeItem(itemId);
    if (childrenCount > 0) {
      throw new Error(
        'Нельзя удалить элемент, у которого есть дочерние элементы.',
      );
    }

    const projectRoot = this.getProjectRoot();
    const item = this.dao.getNarrativeItemById(itemId);

    // Сначала удаляем из БД
    this.dao.deleteNarrativeItem(itemId);

    // Затем удаляем файл, если он есть
    if (item && item.file_path && projectRoot) {
      const absoluteFilePath = path.join(projectRoot, item.file_path);
      await fileSystemService.deleteFile(absoluteFilePath);
    }
  }
}

export default NarrativeService;
