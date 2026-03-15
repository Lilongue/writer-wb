import { NarrativeItem, EntityTemplate } from '../../../common/types';

export interface ReorderUpdate {
  id: number;
  parent_id: number | null;
  sort_order: number;
}

interface FindParentPayload {
  dragItem: NarrativeItem;
  dropItem: NarrativeItem;
  dropType: 'before' | 'after' | 'inside';
  items: NarrativeItem[];
  getTemplate: (id: number) => EntityTemplate | undefined;
}

interface CalculateUpdatesPayload {
  dragItem: NarrativeItem;
  items: NarrativeItem[];
  newParentId: number | null;
  newSortOrder: number;
}

// This function contains the "intelligent correction" logic.
export const findNewParentAndSortOrder = ({
  dragItem,
  dropItem,
  dropType,
  items,
  getTemplate,
}: FindParentPayload): { newParentId: number | null; newSortOrder: number } => {
  const getTemplateForItem = (item: NarrativeItem) => {
    const template = getTemplate(item.template_id);
    if (!template) throw new Error(`Template for item ${item.id} not found`);
    return template;
  };

  const canBeChild = (child: NarrativeItem, parent: NarrativeItem) => {
    const childTemplate = getTemplateForItem(child);
    const parentTemplate = getTemplateForItem(parent);
    return parentTemplate.weight > childTemplate.weight;
  };

  const itemsById = new Map(items.map((i) => [i.id, i]));
  const childrenByParentId = items.reduce((acc, item) => {
    if (item.parent_id) {
      if (!acc.has(item.parent_id)) {
        acc.set(item.parent_id, []);
      }
      acc.get(item.parent_id)!.push(item);
    }
    return acc;
  }, new Map<number, NarrativeItem[]>());

  // Helper to sort children
  childrenByParentId.forEach((children) =>
    children.sort((a, b) => a.sort_order - b.sort_order),
  );

  let newParentId: number | null = dragItem.parent_id;
  let newSortOrder: number = dragItem.sort_order;

  // --- Start Correction Logic ---
  const handleInvalidMove = () => {
    // 1. Determine searchRoot
    let searchRoot: NarrativeItem | undefined;
    if (dropType === 'inside' || canBeChild(dragItem, dropItem)) {
      searchRoot = dropItem;
    } else {
      searchRoot = dropItem.parent_id
        ? itemsById.get(dropItem.parent_id)
        : items.find((i) => i.parent_id === null);
    }

    if (!searchRoot) {
      return; // Cannot determine context, cancel move
    }

    // 2. Ascend to find validContainer
    let validContainer: NarrativeItem | undefined = searchRoot;
    while (validContainer && !canBeChild(dragItem, validContainer)) {
      validContainer = validContainer.parent_id
        ? itemsById.get(validContainer.parent_id)
        : undefined;
    }

    if (!validContainer) {
      return; // No valid container found up the tree, cancel move
    }

    // 3. Descend to find the deepest valid parent
    let deepestValidParent = validContainer;
    for (;;) {
      const children = childrenByParentId.get(deepestValidParent.id) || [];
      const nextChild = children[0]; // First-born child

      if (
        !nextChild ||
        !canBeChild(dragItem, nextChild) ||
        nextChild.id === dragItem.id // Stop if we find the item we're dragging
      ) {
        // We've reached the end, the next level is invalid, or we hit the drag item.
        // The deepestValidParent is our target.
        newParentId = deepestValidParent.id;
        // Place it before the first child, or at the start if no children
        newSortOrder = nextChild ? nextChild.sort_order : 0;
        break;
      }
      deepestValidParent = nextChild;
    }
  };
  // --- End Correction Logic ---

  const dragTemplate = getTemplateForItem(dragItem);
  const dropTemplate = getTemplateForItem(dropItem);
  const isSiblingMove = dragTemplate.weight === dropTemplate.weight;

  if (dropType === 'inside') {
    handleInvalidMove();
  } else if (isSiblingMove) {
    newParentId = dropItem.parent_id;
    const siblings = (childrenByParentId.get(newParentId!) || []).filter(
      (i) => i.id !== dragItem.id,
    );
    const dropIndex = siblings.findIndex((i) => i.id === dropItem.id);
    newSortOrder = dropType === 'before' ? dropIndex : dropIndex + 1;
  } else {
    handleInvalidMove();
  }

  // Final sanity check for sort order bounds
  const finalSiblings = (childrenByParentId.get(newParentId!) || []).filter(
    (i) =>
      i.id !== dragItem.id || // Sibling from another parent
      (i.id === dragItem.id && newParentId !== dragItem.parent_id), // The dragItem itself if moved
  );

  const finalSiblingsCount =
    newParentId === dragItem.parent_id
      ? finalSiblings.length + 1
      : finalSiblings.length;

  if (newSortOrder < 0) {
    newSortOrder = 0;
  } else if (newSortOrder > finalSiblingsCount) {
    newSortOrder = finalSiblingsCount;
  }

  return { newParentId, newSortOrder };
};

export const calculateNarrativeOrderUpdates = ({
  dragItem,
  items,
  newParentId,
  newSortOrder,
}: CalculateUpdatesPayload): ReorderUpdate[] => {
  const updates: ReorderUpdate[] = [];
  const originalParentId = dragItem.parent_id;
  const originalSortOrder = dragItem.sort_order;

  // No actual change occurred
  if (originalParentId === newParentId && originalSortOrder === newSortOrder) {
    return [];
  }

  // Case 1: Moving within the same parent
  if (originalParentId === newParentId) {
    const siblings = items
      .filter((i) => i.parent_id === originalParentId)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Remove the item from its original position
    const [movedItem] = siblings.splice(originalSortOrder, 1);

    // Insert it into the new position
    siblings.splice(newSortOrder, 0, movedItem);

    // Generate updates for all items that have a new index
    siblings.forEach((item, index) => {
      if (item.sort_order !== index) {
        updates.push({
          id: item.id,
          parent_id: newParentId,
          sort_order: index,
        });
      }
    });
  } else {
    // Case 2: Moving to a different parent

    // A. Update siblings in the old parent
    const oldSiblings = items
      .filter((i) => i.parent_id === originalParentId && i.id !== dragItem.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    oldSiblings.forEach((item, index) => {
      if (item.sort_order !== index) {
        updates.push({
          id: item.id,
          parent_id: originalParentId,
          sort_order: index,
        });
      }
    });

    // B. Update the dragged item and siblings in the new parent
    const newSiblings = items
      .filter((i) => i.parent_id === newParentId)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Add the dragged item to its new position
    newSiblings.splice(newSortOrder, 0, {
      ...dragItem,
      parent_id: newParentId,
    });

    // Generate updates for all items in the new list (including the moved one)
    newSiblings.forEach((item, index) => {
      const originalItem = items.find((i) => i.id === item.id)!;
      // Update if sort order changed, or if it's the moved item and its parent changed
      if (originalItem.sort_order !== index || item.id === dragItem.id) {
        updates.push({
          id: item.id,
          parent_id: newParentId,
          sort_order: index,
        });
      }
    });
  }
  // Final check to ensure we don't send updates for items that didn't actually change
  // This can happen in complex multi-parent moves.
  const finalUpdates = updates.filter((update) => {
    const originalItem = items.find((i) => i.id === update.id)!;
    return (
      originalItem.sort_order !== update.sort_order ||
      originalItem.parent_id !== update.parent_id
    );
  });

  return finalUpdates;
};
