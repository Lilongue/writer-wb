import path from 'path';
import { NarrativeService } from '../../../main/services/NarrativeService';
import { NarrativeDao } from '../../../main/data/daos/NarrativeDao';
import { TemplateDao } from '../../../main/data/daos/TemplateDao';
import fileSystemService from '../../../main/services/FileSystemService';
import MainNotificationService from '../../../main/services/NotificationService';
import * as narrativeReorderer from '../../../main/services/utils/narrativeReorderer';
import { NarrativeItem, EntityTemplate } from '../../../common/types';

// Mocks
jest.mock('../../../main/data/daos/NarrativeDao');
jest.mock('../../../main/data/daos/TemplateDao');
jest.mock('../../../main/services/FileSystemService');
jest.mock('../../../main/services/NotificationService');
jest.mock('../../../main/services/utils/narrativeReorderer', () => ({
  findNewParentAndSortOrder: jest.fn(),
  calculateNarrativeOrderUpdates: jest.fn(),
}));

describe('NarrativeService', () => {
  let narrativeService: NarrativeService;
  let narrativeDao: jest.Mocked<NarrativeDao>;
  let templateDao: jest.Mocked<TemplateDao>;
  let getProjectRoot: jest.Mock<string | null>;

  const MOCK_PROJECT_ROOT = '/mock/project';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    narrativeDao = jest.mocked(new NarrativeDao(jest.fn() as any));
    templateDao = jest.mocked(new TemplateDao(jest.fn() as any));
    getProjectRoot = jest.fn(() => MOCK_PROJECT_ROOT);

    narrativeService = new NarrativeService(
      narrativeDao,
      templateDao,
      getProjectRoot,
    );

    // Mock file system service
    (fileSystemService.getStats as jest.Mock).mockResolvedValue({
      mtimeMs: 123456789,
    });
    (fileSystemService.readFile as jest.Mock).mockResolvedValue(
      '# Mock Content',
    );
    (fileSystemService.createFileWithDirs as jest.Mock).mockResolvedValue(
      undefined,
    );
    (fileSystemService.deleteFile as jest.Mock).mockResolvedValue(undefined);

    // Mock notification service
    (MainNotificationService.error as jest.Mock).mockClear();
    (MainNotificationService.warning as jest.Mock).mockClear();
  });

  // Test suite for getNarrativeItems
  describe('getNarrativeItems', () => {
    // Test case: Verifies that the method correctly retrieves and returns all narrative items from the NarrativeDao.
    it('should return narrative items from the DAO', () => {
      const mockItems: NarrativeItem[] = [
        {
          id: 1,
          name: 'Item 1',
          parent_id: null,
          sort_order: 0,
        } as NarrativeItem,
      ];
      narrativeDao.getNarrativeItems.mockReturnValue(mockItems);

      const result = narrativeService.getNarrativeItems();

      expect(result).toEqual(mockItems);
      expect(narrativeDao.getNarrativeItems).toHaveBeenCalledTimes(1);
    });
  });

  // Test suite for getDetails
  describe('getDetails', () => {
    // Test case: Verifies that the method returns null if the narrative item is not found by its ID.
    it('should return null if item not found', async () => {
      (narrativeDao.getNarrativeItemById as any).mockReturnValueOnce(null);
      const result = await narrativeService.getDetails(1);
      expect(result).toBeNull();
      expect(narrativeDao.getNarrativeItemById).toHaveBeenCalledWith(1);
    });

    // Test case: Verifies that item details are returned correctly when the associated file exists and can be read.
    it('should return details with file content if file exists', async () => {
      const mockItem = {
        id: 1,
        name: 'Test',
        file_path: 'narrative/1.md',
      } as NarrativeItem;
      narrativeDao.getNarrativeItemById.mockReturnValue(mockItem);
      (fileSystemService.getStats as jest.Mock).mockResolvedValue({
        mtimeMs: 123,
      });

      const result = await narrativeService.getDetails(1);

      expect(result).not.toBeNull();
      expect(result?.content).toBe('# Mock Content');
      expect(result?.fileExists).toBe(true);
      expect(result?.mtime).toBe(123);
    });

    // Test case: Verifies that a "file not found" message is returned when the item exists but its associated file does not.
    it('should return details with "file not found" message if file does not exist', async () => {
      const mockItem = {
        id: 1,
        name: 'Test',
        file_path: 'narrative/1.md',
      } as NarrativeItem;
      narrativeDao.getNarrativeItemById.mockReturnValue(mockItem);
      (fileSystemService.getStats as jest.Mock).mockResolvedValue(null);

      const result = await narrativeService.getDetails(1);

      expect(result?.content).toContain('Файл не найден');
      expect(result?.fileExists).toBe(false);
    });

    // Test case: Verifies graceful handling and notification on file read errors, returning an error message.
    it('should handle file read error gracefully', async () => {
      const mockItem = {
        id: 1,
        name: 'Test',
        file_path: 'narrative/1.md',
      } as NarrativeItem;
      narrativeDao.getNarrativeItemById.mockReturnValue(mockItem);
      (fileSystemService.getStats as jest.Mock).mockResolvedValue({
        mtimeMs: 123,
      });
      (fileSystemService.readFile as jest.Mock).mockRejectedValue(
        new Error('Read error'),
      );

      const result = await narrativeService.getDetails(1);

      expect(result?.content).toContain('Ошибка чтения файла');
      expect(result?.fileExists).toBe(false); // unreadable = effectively not usable
      expect(MainNotificationService.error).toHaveBeenCalled();
    });
  });

  // Test suite for createNarrativeItem
  describe('createNarrativeItem', () => {
    // Test case: Ensures that an error is thrown if a new narrative item is attempted to be created without an open project.
    it('should throw an error if project root is not set', async () => {
      getProjectRoot.mockReturnValue(null);
      await expect(
        narrativeService.createNarrativeItem(null, 1, 'New', 'New Title'),
      ).rejects.toThrow('Проект не открыт');
    });

    // Test case: Verifies successful creation of a narrative item and its corresponding file when no parent is specified.
    it('should create an item and its file correctly', async () => {
      narrativeDao.getMaxSortOrder.mockReturnValue(0);
      narrativeDao.createNarrativeItem.mockImplementation(
        (name, title, parentId, templateId, getFilePath) => {
          const newId = 10;
          getFilePath(newId); // Call the function to get the path
          // This mock doesn't need to update the DB, just simulate the ID generation
          return newId;
        },
      );

      const newItemId = await narrativeService.createNarrativeItem(
        null,
        1,
        'New Item',
        'New Title',
      );

      expect(newItemId).toBe(10);
      expect(narrativeDao.createNarrativeItem).toHaveBeenCalled();
      expect(fileSystemService.createFileWithDirs).toHaveBeenCalledWith(
        path.join(MOCK_PROJECT_ROOT, 'narrative', '10.md'),
        '# New Title\n',
      );
    });

    // Test case: Verifies successful creation of a narrative item and its file when a parent is specified and has a file path.
    it('should create an item with parentId and its file correctly', async () => {
      const mockParentItem = {
        id: 5,
        file_path: 'narrative/parent/5.md',
      } as NarrativeItem;
      narrativeDao.getNarrativeItemById.mockReturnValue(mockParentItem);
      narrativeDao.getMaxSortOrder.mockReturnValue(0);
      narrativeDao.createNarrativeItem.mockImplementation(() => {
        const newId = 11;
        return newId;
      });

      const newItemId = await narrativeService.createNarrativeItem(
        5,
        1,
        'Child Item',
        'Child Title',
      );

      expect(newItemId).toBe(11);
      expect(narrativeDao.getNarrativeItemById).toHaveBeenCalledWith(5);
      expect(narrativeDao.createNarrativeItem).toHaveBeenCalled();
      expect(fileSystemService.createFileWithDirs).toHaveBeenCalledWith(
        path.join(MOCK_PROJECT_ROOT, 'narrative/parent', '11.md'),
        '# Child Title\n',
      );
    });

    // Test case: Verifies that if a parent is specified but has no file_path, the new item's path defaults to the base 'narrative' directory.
    it('should create an item with parentId but null file_path and default to "narrative" path', async () => {
      const mockParentItem = {
        id: 6,
        file_path: '',
        name: 'Mock Parent',
        template_id: 1,
        parent_id: null,
        sort_order: 0,
        title: '',
        description: '',
        plan: undefined,
      } as NarrativeItem;
      narrativeDao.getNarrativeItemById.mockReturnValue(mockParentItem);
      narrativeDao.getMaxSortOrder.mockReturnValue(0);
      narrativeDao.createNarrativeItem.mockImplementation(() => {
        const newId = 12;
        return newId;
      });

      const newItemId = await narrativeService.createNarrativeItem(
        6,
        1,
        'Child Item 2',
        'Child Title 2',
      );

      expect(newItemId).toBe(12);
      expect(narrativeDao.getNarrativeItemById).toHaveBeenCalledWith(6);
      expect(narrativeDao.createNarrativeItem).toHaveBeenCalled();
      expect(fileSystemService.createFileWithDirs).toHaveBeenCalledWith(
        path.join(MOCK_PROJECT_ROOT, 'narrative', '12.md'), // Should default to 'narrative' path
        '# Child Title 2\n',
      );
    });
  });

  // Test suite for renameNarrativeItem
  describe('renameNarrativeItem', () => {
    // Test case: Verifies that the NarrativeDao is called to rename a narrative item.
    it('should call dao to rename the item', async () => {
      await narrativeService.renameNarrativeItem(1, 'New Name');
      expect(narrativeDao.renameNarrativeItem).toHaveBeenCalledWith(
        1,
        'New Name',
      );
    });
  });

  // Test suite for updateNarrativeItemDetails
  describe('updateNarrativeItemDetails', () => {
    // Test case: Verifies that the NarrativeDao is called to update the details of a narrative item.
    it('should call dao to update item details', async () => {
      const details = { name: 'N', title: 'T', description: 'D', plan: 'P' };
      await narrativeService.updateNarrativeItemDetails(
        1,
        details.name,
        details.title,
        details.description,
        details.plan,
      );
      expect(narrativeDao.updateNarrativeItemDetails).toHaveBeenCalledWith(
        1,
        details.name,
        details.title,
        details.description,
        details.plan,
      );
    });
  });

  // Test suite for deleteNarrativeItem
  describe('deleteNarrativeItem', () => {
    // Test case: Verifies that an item, its descendants, and their associated files are all correctly deleted.
    it('should delete an item and its descendants and their files', async () => {
      const itemToDelete = {
        id: 1,
        file_path: 'narrative/1.md',
      } as NarrativeItem;
      const childItem = { id: 2, file_path: 'narrative/2.md' } as NarrativeItem;
      narrativeDao.findAllDescendantIds.mockReturnValue([2]);
      narrativeDao.findAllByIds.mockReturnValue([itemToDelete, childItem]);

      await narrativeService.deleteNarrativeItem(1);

      expect(narrativeDao.deleteByIds).toHaveBeenCalledWith([1, 2]);
      expect(fileSystemService.deleteFile).toHaveBeenCalledTimes(2);
      expect(fileSystemService.deleteFile).toHaveBeenCalledWith(
        path.join(MOCK_PROJECT_ROOT, 'narrative', '1.md'),
      );
      expect(fileSystemService.deleteFile).toHaveBeenCalledWith(
        path.join(MOCK_PROJECT_ROOT, 'narrative', '2.md'),
      );
    });

    // Test case: Verifies that file deletion is skipped if the project root is not set, but the DAO deletion still occurs.
    it('should not try to delete files if project root is not set', async () => {
      getProjectRoot.mockReturnValue(null);
      narrativeDao.findAllDescendantIds.mockReturnValue([]);
      narrativeDao.findAllByIds.mockReturnValue([{ id: 1 } as NarrativeItem]);

      await narrativeService.deleteNarrativeItem(1);

      expect(MainNotificationService.warning).toHaveBeenCalledWith(
        'Корень проекта не установлен',
        'Не удалось удалить связанные файлы, так как не задан корень проекта.',
      );
      expect(fileSystemService.deleteFile).not.toHaveBeenCalled();
    });
  });

  // Test suite for updateNarrativeOrder
  describe('updateNarrativeOrder', () => {
    let mockItems: NarrativeItem[];
    let mockTemplates: EntityTemplate[];

    beforeEach(() => {
      mockItems = [
        { id: 1, parent_id: null, sort_order: 0 },
        { id: 2, parent_id: null, sort_order: 1 },
        { id: 3, parent_id: 1, sort_order: 0 },
      ] as NarrativeItem[];
      mockTemplates = [{ id: 10, name: 'Scene Template' }] as EntityTemplate[];

      narrativeDao.getNarrativeItems.mockReturnValue(mockItems);
      templateDao.getAllTemplates.mockReturnValue(mockTemplates);
      (
        narrativeReorderer.findNewParentAndSortOrder as jest.Mock
      ).mockReturnValue({ newParentId: null, newSortOrder: 0.5 });
      (
        narrativeReorderer.calculateNarrativeOrderUpdates as jest.Mock
      ).mockReturnValue([{ id: 1, parent_id: null, sort_order: 0.5 }]);
    });

    // Test case: Ensures an error is thrown if either the dragged or dropped item is not found in the narrative.
    it('should throw an error if drag or drop item is not found', async () => {
      narrativeDao.getNarrativeItems.mockReturnValue([]);
      await expect(
        narrativeService.updateNarrativeOrder(1, 2, 'after'),
      ).rejects.toThrow('Перемещаемый или целевой элемент не найден.');
    });

    // Test case: Verifies that no action is taken if the dragged item and the dropped item are the same.
    it('should do nothing if dragId is the same as dropId', async () => {
      await narrativeService.updateNarrativeOrder(1, 1, 'after');
      expect(narrativeDao.updateOrder).not.toHaveBeenCalled();
    });

    // Test case: Verifies that the DAO's updateOrder method is called for a valid reordering operation.
    it('should call dao to update order for a valid move', async () => {
      await narrativeService.updateNarrativeOrder(1, 2, 'before');
      expect(narrativeReorderer.findNewParentAndSortOrder).toHaveBeenCalled();
      expect(
        narrativeReorderer.calculateNarrativeOrderUpdates,
      ).toHaveBeenCalled();
      expect(narrativeDao.updateOrder).toHaveBeenCalledWith([
        { id: 1, parent_id: null, sort_order: 0.5 },
      ]);
    });

    // Test case: Ensures that no DAO update occurs if the reordering calculation results in an empty array of updates.
    it('should do nothing if calculateNarrativeOrderUpdates returns an empty array', async () => {
      (
        narrativeReorderer.calculateNarrativeOrderUpdates as jest.Mock
      ).mockReturnValue([]);
      await narrativeService.updateNarrativeOrder(1, 2, 'before');
      expect(narrativeReorderer.findNewParentAndSortOrder).toHaveBeenCalled();
      expect(
        narrativeReorderer.calculateNarrativeOrderUpdates,
      ).toHaveBeenCalled();
      expect(narrativeDao.updateOrder).not.toHaveBeenCalled();
    });

    // Test case: Verifies that no reordering action is taken if an attempt is made to drag a parent item into one of its direct children.
    it('should do nothing if dragging a parent into its own child', async () => {
      // Mock items: 1 is parent of 3
      narrativeDao.getNarrativeItems.mockReturnValue([
        { id: 1, parent_id: null, sort_order: 0 } as NarrativeItem,
        { id: 2, parent_id: null, sort_order: 1 } as NarrativeItem,
        { id: 3, parent_id: 1, sort_order: 0 } as NarrativeItem,
      ]);

      await narrativeService.updateNarrativeOrder(1, 3, 'inside'); // Drag item 1 (parent) into item 3 (child)

      expect(
        narrativeReorderer.findNewParentAndSortOrder,
      ).not.toHaveBeenCalled();
      expect(
        narrativeReorderer.calculateNarrativeOrderUpdates,
      ).not.toHaveBeenCalled();
      expect(narrativeDao.updateOrder).not.toHaveBeenCalled();
    });

    // Test case: Verifies that the ancestry check correctly traverses multiple levels to prevent dragging a grandparent into a deep descendant.
    it('should iterate through multiple levels of ancestry when dragging a parent into a deep child', async () => {
      // Mock items: Grandparent (1) -> Parent (2) -> Child (3)
      narrativeDao.getNarrativeItems.mockReturnValue([
        { id: 1, parent_id: null, sort_order: 0 } as NarrativeItem, // Grandparent
        { id: 2, parent_id: 1, sort_order: 0 } as NarrativeItem, // Parent
        { id: 3, parent_id: 2, sort_order: 0 } as NarrativeItem, // Child
      ]);

      await narrativeService.updateNarrativeOrder(1, 3, 'inside'); // Drag item 1 (grandparent) into item 3 (child)

      // The assertion is that no update happens, but the internal loop should be traversed
      expect(
        narrativeReorderer.findNewParentAndSortOrder,
      ).not.toHaveBeenCalled();
      expect(
        narrativeReorderer.calculateNarrativeOrderUpdates,
      ).not.toHaveBeenCalled();
      expect(narrativeDao.updateOrder).not.toHaveBeenCalled();
    });
  });
});
