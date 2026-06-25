import { NarrativeDao } from '../../../../main/data/daos/NarrativeDao';
import { NarrativeItem } from '../../../../common/types';

// Mock the better-sqlite3 module
const mockStatement = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

const mockTransaction = jest.fn((fn) => fn);

const mockDb = {
  prepare: jest.fn().mockReturnValue(mockStatement),
  transaction: mockTransaction,
};

jest.mock('better-sqlite3', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockDb),
  };
});

describe('NarrativeDao', () => {
  let narrativeDao: NarrativeDao;

  beforeEach(() => {
    jest.clearAllMocks();

    const getDbMock = () => mockDb as any;
    narrativeDao = new NarrativeDao(getDbMock);
  });

  describe('getNarrativeItems', () => {
    // Test case: Retrieve all narrative items. Verifies that items are fetched with the correct sorting order.
    it('should return all narrative items sorted by sort_order', () => {
      const mockItems: NarrativeItem[] = [
        {
          id: 1,
          name: 'Chapter 1',
          sort_order: 0,
          parent_id: null,
          title: 't1',
          template_id: 1,
        },
        {
          id: 2,
          name: 'Chapter 2',
          sort_order: 1,
          parent_id: null,
          title: 't2',
          template_id: 1,
        },
      ];
      mockStatement.all.mockReturnValue(mockItems);

      const result = narrativeDao.getNarrativeItems();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ni.sort_order ASC'),
      );
      expect(mockStatement.all).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
    });
  });

  describe('getNarrativeItemById', () => {
    // Test case: Retrieve a single narrative item by its ID. Checks if the correct SQL query is used to find the item.
    it('should return a narrative item by its ID', () => {
      const mockItem: NarrativeItem = {
        id: 1,
        name: 'Chapter 1',
        sort_order: 0,
        parent_id: null,
        title: 't1',
        template_id: 1,
      };
      mockStatement.get.mockReturnValue(mockItem);

      const result = narrativeDao.getNarrativeItemById(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
      );
      expect(mockStatement.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockItem);
    });
  });

  describe('getMaxSortOrder', () => {
    // Test case: Get the maximum sort order for a narrative item's children. Ensures the correct aggregation query is used.
    it('should return the max sort order for a given parentId', () => {
      mockStatement.get.mockReturnValue({ max_sort: 5 });

      const result = narrativeDao.getMaxSortOrder(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('MAX(sort_order)'),
      );
      expect(mockStatement.get).toHaveBeenCalledWith(1);
      expect(result).toBe(5);
    });

    // Test case: Handle the scenario where no child items exist for a given parent ID. Expects -1 as the max sort order.
    it('should return -1 if no items exist for the parentId', () => {
      mockStatement.get.mockReturnValue({ max_sort: null });

      const result = narrativeDao.getMaxSortOrder(1);

      expect(result).toBe(-1);
    });
  });

  describe('countChildrenOfNarrativeItem', () => {
    // Test case: Count the number of child items for a given narrative item. Verifies the count query.
    it('should return the count of child items', () => {
      mockStatement.get.mockReturnValue({ count: 3 });

      const result = narrativeDao.countChildrenOfNarrativeItem(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
      );
      expect(mockStatement.get).toHaveBeenCalledWith(1);
      expect(result).toBe(3);
    });
  });

  describe('createNarrativeItem', () => {
    // Test case: Create a new narrative item, including file path generation and entity registration, within a database transaction. Verifies all necessary insertions and updates.
    it('should create a narrative item within a transaction and return its new ID', () => {
      const newId = 123;
      mockStatement.run.mockReturnValueOnce({ lastInsertRowid: newId }); // for insert
      const getFilePath = (id: number) => `path/to/${id}.txt`;
      const finalFilePath = getFilePath(newId);

      const result = narrativeDao.createNarrativeItem(
        'New Item',
        'New Title',
        null,
        1,
        getFilePath,
        0,
      );

      expect(mockDb.transaction).toHaveBeenCalled();

      // Check insert
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO narrative_items'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'New Item',
        'New Title',
        null,
        1,
        '',
        0,
      );

      // Check update
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE narrative_items SET file_path = ?'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(finalFilePath, newId);

      // Check entity insert
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO all_entities'),
      );
      expect(mockStatement.run).toHaveBeenCalledWith(newId);

      expect(result).toBe(newId);
    });
  });

  describe('updateOrder', () => {
    // Test case: Update the sort order and parentage of multiple narrative items in a single transaction. Ensures the batch update mechanism works correctly.
    it('should update order and parentage for multiple items in a transaction', () => {
      const updates = [
        { id: 1, parent_id: null, sort_order: 1 },
        { id: 2, parent_id: 1, sort_order: 0 },
      ];

      narrativeDao.updateOrder(updates);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE narrative_items SET parent_id = ?, sort_order = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledTimes(2);
      expect(mockStatement.run).toHaveBeenCalledWith(null, 1, 1);
      expect(mockStatement.run).toHaveBeenCalledWith(1, 0, 2);
    });
  });

  describe('renameNarrativeItem', () => {
    // Test case: Rename an existing narrative item. Checks if the item's name is updated correctly in the database.
    it('should rename a narrative item', () => {
      narrativeDao.renameNarrativeItem(1, 'New Name');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE narrative_items SET name = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('New Name', 1);
    });
  });

  describe('updateNarrativeItemDetails', () => {
    // Test case: Update multiple details (name, title, description, plan) of a narrative item. Verifies the comprehensive update query.
    it('should update details of a narrative item', () => {
      narrativeDao.updateNarrativeItemDetails(
        1,
        'New Name',
        'New Title',
        'New Desc',
        'New Plan',
      );

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE narrative_items SET name = ?, title = ?, description = ?, plan = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'New Name',
        'New Title',
        'New Desc',
        'New Plan',
        1,
      );
    });
  });

  describe('deleteNarrativeItem', () => {
    // Test case: Delete a single narrative item by its ID. Confirms that the internal `deleteByIds` method is called with the correct argument.
    it('should call deleteByIds with the correct id', () => {
      // Spy on the deleteByIds method to ensure it's called correctly
      const deleteByIdsSpy = jest.spyOn(narrativeDao, 'deleteByIds');

      narrativeDao.deleteNarrativeItem(1);

      expect(deleteByIdsSpy).toHaveBeenCalledWith([1]);
    });
  });

  describe('findAllDescendantIds', () => {
    // Test case: Find all descendant IDs for a given narrative item using a recursive query. Verifies the recursive logic and returned IDs.
    it('should return an array of descendant IDs', () => {
      const mockIds = [{ id: 2 }, { id: 3 }];
      mockStatement.all.mockReturnValue(mockIds);

      const result = narrativeDao.findAllDescendantIds(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE descendants'),
      );
      expect(mockStatement.all).toHaveBeenCalledWith(1);
      expect(result).toEqual([2, 3]);
    });
  });

  describe('findAllByIds', () => {
    // Test case: Handle an empty array of IDs for fetching narrative items. Expects an empty result without database interaction.
    it('should return an empty array if no IDs are provided', () => {
      const result = narrativeDao.findAllByIds([]);
      expect(result).toEqual([]);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    // Test case: Retrieve multiple narrative items by a list of their IDs. Checks the correct use of an IN clause in the query.
    it('should return narrative items for the given IDs', () => {
      const mockItems: NarrativeItem[] = [
        {
          id: 1,
          name: 'Item 1',
          sort_order: 0,
          parent_id: null,
          title: 't1',
          template_id: 1,
        },
        {
          id: 2,
          name: 'Item 2',
          sort_order: 1,
          parent_id: null,
          title: 't2',
          template_id: 1,
        },
      ];
      mockStatement.all.mockReturnValue(mockItems);

      const result = narrativeDao.findAllByIds([1, 2]);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id IN (?,?)'),
      );
      expect(mockStatement.all).toHaveBeenCalledWith([1, 2]);
      expect(result).toEqual(mockItems);
    });
  });

  describe('deleteByIds', () => {
    // Test case: Ensure no database operation occurs when `deleteByIds` is called with an empty array. Avoids unnecessary queries.
    it('should not do anything if no IDs are provided', () => {
      narrativeDao.deleteByIds([]);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    // Test case: Delete multiple narrative items by a list of their IDs. Verifies the correct use of an IN clause for batch deletion.
    it('should delete narrative items for the given IDs', () => {
      narrativeDao.deleteByIds([1, 2]);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM narrative_items WHERE id IN (?,?)',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('getNarrativeItemsInfo', () => {
    // Test case: Handle an empty array of IDs for fetching narrative item info. Expects an empty result without database interaction.
    it('should return an empty array if no IDs are provided', () => {
      const result = narrativeDao.getNarrativeItemsInfo([]);
      expect(result).toEqual([]);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    // Test case: Retrieve basic information (id, name, title) for multiple narrative items by their IDs. Checks the correct selection and filtering.
    it('should return narrative item info for the given IDs', () => {
      const mockInfo = [
        { id: 1, name: 'Item 1', title: 'T1' },
        { id: 2, name: 'Item 2', title: 'T2' },
      ];
      mockStatement.all.mockReturnValue(mockInfo);

      const result = narrativeDao.getNarrativeItemsInfo([1, 2]);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT id, name, title FROM narrative_items WHERE id IN (?,?)',
      );
      expect(mockStatement.all).toHaveBeenCalledWith([1, 2]);
      expect(result).toEqual(mockInfo);
    });
  });
});
