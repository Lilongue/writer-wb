/* eslint-disable no-console */
import path from 'path';
import { NarrativeItem } from '../../common/types';
import { NarrativeDao } from '../data/daos/NarrativeDao';
import fileSystemService from './FileSystemService';

/**
 * Вспомогательный интерфейс для узла дерева повествования.
 */
interface NarrativeTreeNode extends NarrativeItem {
  children: NarrativeTreeNode[];
}

/**
 * Сервис для сборки и экспорта рукописи.
 */
export class ManuscriptService {
  private narrativeDao: NarrativeDao;

  private getProjectRoot: () => string | null;

  constructor(narrativeDao: NarrativeDao, getProjectRoot: () => string | null) {
    this.narrativeDao = narrativeDao;
    this.getProjectRoot = getProjectRoot;
  }

  /**
   * Собирает рукопись из элементов повествования в единый Markdown-файл.
   * @param {number | null} rootItemId ID корневого элемента, с которого начинается сборка. Если null, собирается все повествование.
   * @param {boolean} includeHeaders Включать ли заголовки Markdown на основе имени и глубины элемента.
   * @returns {Promise<string>} Строка с собранной рукописью в формате Markdown.
   */
  public async assembleNarrative(
    rootItemId: number | null,
    includeHeaders: boolean,
  ): Promise<string> {
    const projectRoot = this.getProjectRoot();
    if (!projectRoot) {
      throw new Error('Проект не открыт. Невозможно собрать рукопись.');
    }

    const allItems = this.narrativeDao.getNarrativeItems();
    if (allItems.length === 0) {
      return '';
    }

    const tree = ManuscriptService.buildTree(allItems);

    let rootNodes: NarrativeTreeNode[];
    if (rootItemId === null) {
      rootNodes = tree; // Export all top-level items
    } else {
      const foundNode = ManuscriptService.findNodeInTree(tree, rootItemId);
      if (!foundNode) {
        throw new Error(`Элемент повествования с ID ${rootItemId} не найден.`);
      }
      rootNodes = [foundNode];
    }

    const rootContentPromises = rootNodes.map((node) =>
      ManuscriptService.traverseAndAssemble(
        node,
        1, // Start depth for root nodes in export
        includeHeaders,
        projectRoot,
      ),
    );
    const rootContents = await Promise.all(rootContentPromises);
    const assembledContent = rootContents.join('');

    return assembledContent;
  }

  /**
   * Строит дерево из плоского списка элементов повествования.
   * @param {NarrativeItem[]} items Плоский список элементов повествования.
   * @returns {NarrativeTreeNode[]} Массив корневых узлов дерева.
   */
  private static buildTree(items: NarrativeItem[]): NarrativeTreeNode[] {
    const itemMap = new Map<number, NarrativeTreeNode>();
    items.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    const tree: NarrativeTreeNode[] = [];
    itemMap.forEach((node) => {
      if (node.parent_id === null) {
        tree.push(node);
      } else {
        const parent = itemMap.get(node.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    // Sort children by sort_order
    itemMap.forEach((node) => {
      node.children.sort((a, b) => a.sort_order - b.sort_order);
    });

    // Sort top-level nodes by sort_order
    tree.sort((a, b) => a.sort_order - b.sort_order);

    return tree;
  }

  /**
   * Рекурсивно находит узел в дереве по ID.
   * @param {NarrativeTreeNode[]} tree Поддерево для поиска.
   * @param {number} id ID искомого узла.
   * @returns {NarrativeTreeNode | undefined} Найденный узел или undefined.
   */
  private static findNodeInTree(
    tree: NarrativeTreeNode[],
    id: number,
  ): NarrativeTreeNode | undefined {
    for (let i = 0; i < tree.length; i += 1) {
      const node = tree[i];
      if (node.id === id) {
        return node;
      }
      const foundInChildren = ManuscriptService.findNodeInTree(
        node.children,
        id,
      );
      if (foundInChildren) {
        return foundInChildren;
      }
    }
    return undefined;
  }

  /**
   * Рекурсивно обходит дерево и собирает Markdown-контент.
   * @param {NarrativeTreeNode} node Текущий узел.
   * @param {number} depth Текущая глубина в дереве (для заголовков Markdown).
   * @param {boolean} includeHeaders Включать ли заголовки.
   * @param {string} projectRoot Корневой путь проекта.
   * @returns {Promise<string>} Собранный Markdown-контент для текущего узла и его потомков.
   */
  private static async traverseAndAssemble(
    node: NarrativeTreeNode,
    depth: number,
    includeHeaders: boolean,
    projectRoot: string,
  ): Promise<string> {
    let content = '';
    let fileContent = '';

    // Read file content
    if (node.file_path) {
      const absolutePath = path.join(projectRoot, node.file_path);
      try {
        fileContent = await fileSystemService.readFile(absolutePath);
      } catch (e) {
        console.error(`Error reading narrative item file ${absolutePath}`, e);
        fileContent = `\n**[Ошибка: Не удалось прочитать файл "${node.file_path}"]**\n\n`;
      }
    } else if (node.description) {
      // Fallback to description if no file_path
      fileContent = `${node.description}\n\n`;
    }

    // Add header if required, but only if content doesn't already have one
    if (includeHeaders && node.title && !fileContent.trim().startsWith('#')) {
      const headerPrefix = '#'.repeat(depth > 6 ? 6 : depth); // Max H6
      content += `\n${headerPrefix} ${node.title}\n\n`;
    }

    content += `${fileContent}\n\n`; // Add content and some spacing

    // Recursively assemble children in parallel
    if (node.children.length > 0) {
      const childrenContentPromises = node.children.map((child) =>
        ManuscriptService.traverseAndAssemble(
          child,
          depth + 1,
          includeHeaders,
          projectRoot,
        ),
      );
      const childrenContents = await Promise.all(childrenContentPromises);
      content += childrenContents.join('');
    }

    return content;
  }
}

export default ManuscriptService;
