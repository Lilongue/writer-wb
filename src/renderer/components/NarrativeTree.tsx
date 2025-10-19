import React, { useEffect, useState } from 'react';
import Tree from 'rc-tree';
import { NarrativeItem } from '../../common/types';

// Утилитарная функция для преобразования плоского списка в дерево
const buildTree = (items: NarrativeItem[]) => {
  type TreeNode = NarrativeItem & { children: TreeNode[] };

  const itemMap = new Map<number, TreeNode>(
    items.map((item) => [item.id, { ...item, children: [] }]),
  );
  const tree: TreeNode[] = [];

  items.forEach((item) => {
    const mapItem = itemMap.get(item.id)!;
    if (item.parent_id) {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        parent.children.push(mapItem);
      } else {
        // Если родитель не найден, добавляем в корень
        tree.push(mapItem);
      }
    } else {
      tree.push(mapItem);
    }
  });

  // rc-tree ожидает поля key и title
  const convertToRcTreeFormat = (nodes: TreeNode[]): any[] => {
    return nodes.map((node) => ({
      ...node,
      key: node.id,
      title: node.name,
      children: node.children ? convertToRcTreeFormat(node.children) : [],
    }));
  };

  return convertToRcTreeFormat(tree);
};

interface NarrativeTreeProps {
  onSelect: (id: string | null) => void;
}

function NarrativeTree({ onSelect }: NarrativeTreeProps) {
  const [treeData, setTreeData] = useState<any[]>([]);

  useEffect(() => {
    const fetchNarrativeItems = async () => {
      try {
        const items: NarrativeItem[] = await window.electron.ipcRenderer.invoke(
          'get-narrative-items',
        );
        const hierarchy = buildTree(items);
        setTreeData(hierarchy);
      } catch (error) {
        console.error('Failed to fetch narrative items:', error);
      }
    };

    fetchNarrativeItems();
  }, []);

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      onSelect(selectedKeys[0] as string);
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="sidebar">
      <h2>Narrative Tree</h2>
      <Tree treeData={treeData} onSelect={handleSelect} />
    </div>
  );
}

export default NarrativeTree;
