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
      weight: 1000,
      category: EntityType.Narrative,
      fields_schema: '[]',
      is_visible: true,
    },
    {
      id: 2,
      name: 'Chapter',
      weight: 100,
      category: EntityType.Narrative,
      fields_schema: '[]',
      is_visible: true,
    },
    {
      id: 3,
      name: 'Scene',
      weight: 10,
      category: EntityType.Narrative,
      fields_schema: '[]',
      is_visible: true,
    },
    {
      id: 4,
      name: 'Sub-Scene',
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
  });
});
