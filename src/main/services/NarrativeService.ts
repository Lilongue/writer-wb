import path from 'path';
import {
  ItemDetails,
  NarrativeItem,
  EntityTemplate,
  EntityType,
} from '../../common/types';
import { NarrativeDao } from '../data/daos/NarrativeDao';
import fileSystemService from './FileSystemService';
import MainNotificationService from './NotificationService';
import { TemplateDao } from '../data/daos/TemplateDao';
import {
  calculateNarrativeOrderUpdates,
  findNewParentAndSortOrder,
} from './utils/narrativeReorderer';

/**
 * Сервис для управления бизнес-логикой, связанной с элементами повествования.
 */
export class NarrativeService {
  private narrativeDao: NarrativeDao;

  private templateDao: TemplateDao;

  private getProjectRoot: () => string | null;

  constructor(
    narrativeDao: NarrativeDao,
    templateDao: TemplateDao,
    getProjectRoot: () => string | null,
  ) {
    this.narrativeDao = narrativeDao;
    this.templateDao = templateDao;
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
      } else {
        fileExists = false;
        content = '# Файл не найден\\nНажмите кнопку ниже, чтобы создать его.';
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

    let parentPath = 'narrative';
    if (parentId) {
      const parent = this.narrativeDao.getNarrativeItemById(parentId);
      if (parent && parent.file_path) {
        parentPath = path.dirname(parent.file_path);
      }
    }

    const sortOrder = this.narrativeDao.getMaxSortOrder(parentId) + 1;

    // Определяем функцию, которая будет возвращать путь к файлу на основе ID
    const getFilePath = (id: number): string => {
      const newFileName = `${id}.md`;
      return path.join(parentPath, newFileName);
    };

    const newItemId = this.narrativeDao.createNarrativeItem(
      name,
      title,
      parentId,
      templateId,
      getFilePath, // Передаем функцию
      sortOrder,
    );

    // После создания элемента в БД, получаем окончательный путь к файлу
    const relativeFilePath = getFilePath(newItemId);
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
    const projectRoot = this.getProjectRoot();
    if (!projectRoot) {
      MainNotificationService.warning(
        'Корень проекта не установлен',
        'Не удалось удалить связанные файлы, так как не задан корень проекта.',
      );
    }

    const descendantIds = this.narrativeDao.findAllDescendantIds(itemId);
    const idsToDelete = [itemId, ...descendantIds];
    const itemsToDelete = this.narrativeDao.findAllByIds(idsToDelete);
    this.narrativeDao.deleteByIds(idsToDelete);

    if (projectRoot) {
      const deletePromises = itemsToDelete.map(async (item) => {
        if (item.file_path) {
          const absoluteFilePath = path.join(projectRoot, item.file_path);
          try {
            await fileSystemService.deleteFile(absoluteFilePath);
          } catch (error) {
            MainNotificationService.error(
              `Ошибка удаления файла ${absoluteFilePath}`,
              String(error),
            );
          }
        }
      });
      await Promise.all(deletePromises);
    }
  }

  public async updateNarrativeOrder(
    dragId: number,
    dropId: number,
    dropType: 'before' | 'after' | 'inside',
  ): Promise<void> {
    const items = this.narrativeDao.getNarrativeItems();
    const templates = this.templateDao.getAllTemplates(
      false,
      EntityType.Narrative,
    );
    const getTemplate = (id: number) => templates.find((t) => t.id === id);

    const dragItem = items.find((i) => i.id === dragId);
    const dropItem = items.find((i) => i.id === dropId);

    if (!dragItem || !dropItem) {
      throw new Error('Перемещаемый или целевой элемент не найден.');
    }
    if (dragId === dropId) return;

    // Prevent dragging a parent into its own child
    const itemsMap = new Map(items.map((i) => [i.id, i]));
    let current = dropItem;
    while (current && current.parent_id) {
      if (current.parent_id === dragId) {
        return; // Invalid move
      }
      current = itemsMap.get(current.parent_id)!;
    }

    const { newParentId, newSortOrder } = findNewParentAndSortOrder({
      dragItem,
      dropItem,
      dropType,
      items,
      getTemplate: getTemplate as (id: number) => EntityTemplate,
    });

    const updates = calculateNarrativeOrderUpdates({
      dragItem,
      items,
      newParentId,
      newSortOrder,
    });

    if (updates.length > 0) {
      this.narrativeDao.updateOrder(updates);
    }
  }
}

export default NarrativeService;
