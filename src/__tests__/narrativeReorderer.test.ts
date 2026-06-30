import {
  calculateNarrativeOrderUpdates,
  findNewParentAndSortOrder,
} from '../main/services/utils/narrativeReorderer';
import { NarrativeItem, EntityTemplate, EntityType } from '../common/types';

describe('narrativeReorderer', () => {
  /*
   * MOCK DATA VISUAL STRUCTURE
   *
   * Project (id:1)
   * |
   * L-- Chapter 1 (id:2)
   * |   |
   * |   L-- Scene 1.1 (id:3)
   * |   L-- Scene 1.2 (id:4)
   * |
   * L-- Chapter 2 (id:5)
   *     |
   *     L-- Scene 2.1 (id:6)
   *         |
   *         L-- Sub-Scene 2.1.1 (id:7)
   */

  // Mock data setup
  const mockTemplates: EntityTemplate[] = [
    {
      id: 1,
      name: 'Project',
      export_name: '1',
      weight: 1000,
      category: EntityType.Narrative,
      fields_schema: '[]',
      is_visible: true,
    },
    {
      id: 2,
      name: 'Chapter',
      export_name: '2',
      weight: 100,
      category: EntityType.Narrative,
      fields_schema: '[]',
      is_visible: true,
    },
    {
      id: 3,
      name: 'Scene',
      export_name: '3',
      weight: 10,
      category: EntityType.Narrative,
      fields_schema: '[]',
      is_visible: true,
    },
    {
      id: 4,
      name: 'Sub-Scene',
      export_name: '4',
      weight: 1,
      category: EntityType.Narrative,
      fields_schema: '[]',
      is_visible: true,
    },
  ];

  const mockItems: NarrativeItem[] = [
    { id: 1, name: 'Project', template_id: 1, parent_id: null, sort_order: 0 }, // Project
    { id: 2, name: 'Chapter 1', template_id: 2, parent_id: 1, sort_order: 0 }, // Chapter 1
    { id: 3, name: 'Scene 1.1', template_id: 3, parent_id: 2, sort_order: 0 }, // Scene 1.1
    { id: 4, name: 'Scene 1.2', template_id: 3, parent_id: 2, sort_order: 1 }, // Scene 1.2
    { id: 5, name: 'Chapter 2', template_id: 2, parent_id: 1, sort_order: 1 }, // Chapter 2
    { id: 6, name: 'Scene 2.1', template_id: 3, parent_id: 5, sort_order: 0 }, // Scene 2.1
    {
      id: 7,
      name: 'Sub-Scene 2.1.1',
      template_id: 4,
      parent_id: 6,
      sort_order: 0,
    }, // Sub-Scene 2.1.1
  ];

  const getTemplate = (id: number) => mockTemplates.find((t) => t.id === id)!;
  const getItem = (id: number) => mockItems.find((i) => i.id === id)!;

  describe('calculateNarrativeOrderUpdates', () => {
    it('should correctly calculate updates for a valid "before" drop', () => {
      // USER ACTION: Drag "Scene 1.2" to appear just before "Scene 1.1".
      const dragItem = getItem(4);
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem,
        dropItem: getItem(3),
        dropType: 'before',
        items: mockItems,
        getTemplate,
      });

      const updates = calculateNarrativeOrderUpdates({
        dragItem,
        items: mockItems,
        newParentId,
        newSortOrder,
      });

      expect(updates).toContainEqual({ id: 4, parent_id: 2, sort_order: 0 });
      expect(updates).toContainEqual({ id: 3, parent_id: 2, sort_order: 1 });
    });

    it('should correctly calculate updates for a valid "after" drop', () => {
      // USER ACTION: Drag "Scene 1.1" to appear just after "Scene 1.2".
      const dragItem = getItem(3);
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem,
        dropItem: getItem(4),
        dropType: 'after',
        items: mockItems,
        getTemplate,
      });
      const updates = calculateNarrativeOrderUpdates({
        dragItem,
        items: mockItems,
        newParentId,
        newSortOrder,
      });

      expect(updates).toContainEqual({ id: 3, parent_id: 2, sort_order: 1 });
    });

    it('should correctly calculate updates for a valid "inside" drop', () => {
      // USER ACTION: Drag "Scene 1.1" to be a child of "Chapter 2".
      // With the new logic, this should place it at the beginning of Chapter 2's children.
      const dragItem = getItem(3);
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem,
        dropItem: getItem(5), // Drop onto Chapter 2
        dropType: 'inside',
        items: mockItems,
        getTemplate,
      });

      const updates = calculateNarrativeOrderUpdates({
        dragItem,
        items: mockItems,
        newParentId,
        newSortOrder,
      });

      // Becomes the FIRST child
      expect(updates).toContainEqual({ id: 3, parent_id: 5, sort_order: 0 });
      // The original child (Scene 2.1, id: 6) gets pushed to the next position
      expect(updates).toContainEqual({ id: 6, parent_id: 5, sort_order: 1 });
    });

    it('should return empty array if no move is necessary', () => {
      // USER ACTION: Drag "Scene 1.1" to be just before "Scene 1.2" (its current position).
      const dragItem = getItem(3);
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem,
        dropItem: getItem(4),
        dropType: 'before',
        items: mockItems,
        getTemplate,
      });
      const updates = calculateNarrativeOrderUpdates({
        dragItem,
        items: mockItems,
        newParentId,
        newSortOrder,
      });

      expect(updates).toEqual([]);
    });
  });

  describe('findNewParentAndSortOrder (Contextual Dive Correction)', () => {
    it('Correction Case 1: should reset to deepest valid position within drop context', () => {
      // USER ACTION: Drag "Scene 2.1" (weight 10) to be a child of "Sub-Scene 2.1.1" (weight 1). INVALID.
      // EXPECTED: Move is cancelled, position remains the same.
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: getItem(6), // Scene 2.1
        dropItem: getItem(7), // Sub-Scene 2.1.1
        dropType: 'inside',
        items: mockItems,
        getTemplate,
      });

      expect(newParentId).toBe(5); // Correct parent is Chapter 2
      expect(newSortOrder).toBe(0); // Its original position
    });

    it('UI Quirk Correction: Scene into Chapter', () => {
      // USER ACTION: Drag "Scene 1.1" (10) "after" "Chapter 2" (100).
      // EXPECTED: Logic detects this isn't a sibling move. It checks if Chapter 2 can be a parent. It can.
      // The search for a home starts with Chapter 2. It has no valid children for a Scene, so Scene 1.1 is placed as the first child of Chapter 2.
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: getItem(3), // Scene 1.1
        dropItem: getItem(5), // Chapter 2
        dropType: 'after',
        items: mockItems,
        getTemplate,
      });
      expect(newParentId).toBe(5); // Parent is Chapter 2
      expect(newSortOrder).toBe(0); // Becomes the first child
    });

    it('Correction Case 2: Deeper Dive for Invalid Sibling', () => {
      // USER ACTION: Drag "Sub-Scene 2.1.1" (1) "after" "Chapter 1" (100).
      // EXPECTED: Logic detects non-sibling move. Checks if Chapter 1 can be a parent. Yes.
      // Search starts at Chapter 1. Dives to Scene 1.1 (valid parent). Scene 1.1 has no children.
      // Item is placed as the first child of Scene 1.1.
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: getItem(7), // Sub-Scene 2.1.1
        dropItem: getItem(2), // Chapter 1
        dropType: 'after',
        items: mockItems,
        getTemplate,
      });

      expect(newParentId).toBe(3); // Should be placed in Scene 1.1
      expect(newSortOrder).toBe(0); // As the first child
    });

    it('Correction Case 3: should reset a high-level item into the project root context', () => {
      // USER ACTION: Drag "Chapter 1" (100) inside "Sub-Scene 2.1.1" (1). INVALID.
      // EXPECTED: Move is cancelled.
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: getItem(2),
        dropItem: getItem(7),
        dropType: 'inside',
        items: mockItems,
        getTemplate,
      });
      expect(newParentId).toBe(1); // The Project
      expect(newSortOrder).toBe(0); // Its original position
    });

    it('should place item as the first child when dropping "inside" an empty valid parent', () => {
      // USER ACTION: Drag "Scene 1.1" into a newly created, empty "Empty Chapter".
      const emptyChapter: NarrativeItem = {
        id: 8,
        name: 'Empty Chapter',
        template_id: 2,
        parent_id: 1,
        sort_order: 2,
      };
      const localItems = [...mockItems, emptyChapter];
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: getItem(3),
        dropItem: emptyChapter,
        dropType: 'inside',
        items: localItems,
        getTemplate,
      });
      expect(newParentId).toBe(8);
      expect(newSortOrder).toBe(0); // First child
    });

    it('REGRESSION: should find a deeper home when dropping a low-level item into a high-level one', () => {
      // USER ACTION: Drag "Scene 1.2" (weight 10) inside "Project" (weight 1000).
      // EXPECTED: Logic should not allow a direct child relationship.
      // It should dive into the project and find the first suitable parent, which is "Chapter 1".
      // Then it should place the scene as the first child of "Chapter 1".
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: getItem(4), // Scene 1.2
        dropItem: getItem(1), // Project
        dropType: 'inside',
        items: mockItems,
        getTemplate,
      });

      expect(newParentId).toBe(2); // Should be placed in Chapter 1
      expect(newSortOrder).toBe(0); // As the first child, pushing others down
    });

    it('should return if no valid container found up the tree (drag high-level item onto low-level)', () => {
      // USER ACTION: Drag "Project" (highest level) after "Sub-Scene" (lowest level).
      // EXPECTED: The logic should ascend the tree from Sub-Scene's parent, fail to find a valid parent for Project,
      // and thus return the original parent and sort order for Project.
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: getItem(1), // Project
        dropItem: getItem(7), // Sub-Scene 2.1.1
        dropType: 'after',
        items: mockItems,
        getTemplate,
      });
      expect(newParentId).toBe(null); // Original parent of Project is null
      expect(newSortOrder).toBe(0); // Original sort order of Project
    });
  });

  describe('Root Level Reordering', () => {
    const rootItem2: NarrativeItem = {
      id: 8,
      name: 'Project 2',
      template_id: 1,
      parent_id: null,
      sort_order: 1,
    };
    const itemsWithTwoRoots = [...mockItems, rootItem2];
    const getRootItem2 = () => rootItem2;

    it('should handle invalid drop on a root item', () => {
      // USER ACTION: Drag Chapter (weight 100) after Project 2 (weight 1000). Invalid sibling, parent is Project.
      // EXPECTED: Logic detects non-sibling move. `canBeChild` is true. `handleInvalidMove` will dive.
      // The `else` branch for `searchRoot` determination (line 72) should be hit here.
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: {
          ...getItem(1),
          name: 'Project To Drag',
          id: 9,
          parent_id: null,
        }, // A different project
        dropItem: getRootItem2(), // Drop after Project 2
        dropType: 'after',
        items: itemsWithTwoRoots,
        getTemplate,
      });
      // This move is complex, but the main goal is to cover the branch.
      // The logic should find a valid home. Let's trace it.
      // `searchRoot` becomes `items.find(i => i.parent_id === null)`, which is Project 1.
      // `validContainer` is Project 1, but `canBeChild` is false. Loop continues up to null. `return`.
      // So the original position is kept.
      expect(newParentId).toBe(null);
      expect(newSortOrder).toBe(0);
    });

    it('should handle sibling move at the root level', () => {
      // USER ACTION: Drag Project 2 before Project 1
      const { newParentId, newSortOrder } = findNewParentAndSortOrder({
        dragItem: getRootItem2(),
        dropItem: getItem(1),
        dropType: 'before',
        items: itemsWithTwoRoots,
        getTemplate,
      });

      // `newParentId` should be null for root level
      expect(newParentId).toBe(null);
      expect(newSortOrder).toBe(0);

      const updates = calculateNarrativeOrderUpdates({
        dragItem: getRootItem2(),
        items: itemsWithTwoRoots,
        newParentId,
        newSortOrder,
      });

      expect(updates).toContainEqual({ id: 8, parent_id: null, sort_order: 0 });
      expect(updates).toContainEqual({ id: 1, parent_id: null, sort_order: 1 });
    });
  });
});
