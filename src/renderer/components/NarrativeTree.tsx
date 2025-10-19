/* eslint-disable no-console */
import React, { useEffect, useState } from 'react';
import { Tree } from 'antd';
import type { TreeProps } from 'antd';
import { NarrativeItem } from '../../common/types';

// Утилитарная функция для преобразования плоского списка в дерево
// Она отлично подходит и для Ant Design Tree, так что оставляем ее без изменений
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
        tree.push(mapItem);
      }
    } else {
      tree.push(mapItem);
    }
  });

  // Antd tree ожидает поля key и title
  const convertToAntdTreeFormat = (nodes: TreeNode[]): any[] => {
    return nodes.map((node) => ({
      ...node,
      key: node.id,
      title: node.name,
      children: node.children ? convertToAntdTreeFormat(node.children) : [],
    }));
  };

  return convertToAntdTreeFormat(tree);
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

  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      onSelect(selectedKeys[0] as string);
    } else {
      onSelect(null);
    }
  };

  const onDrop: TreeProps['onDrop'] = (info) => {
    // info.dragNode - узел, который перетаскивают
    // info.node - узел, на который бросают
    // info.dropPosition - позиция относительно узла (0 - внутрь, 1 - после, -1 - до)
    console.log('Dropped', info);
    // TODO: Реализовать вызов ipcRenderer для сохранения нового порядка в базе данных.
    // Пока просто обновляем состояние дерева на фронтенде для визуального отклика.

    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition =
      info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (
      data: typeof treeData,
      key: React.Key,
      callback: (node: any, i: number, data: any[]) => void,
    ): boolean => {
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].key === key) {
          callback(data[i], i, data);
          return true;
        }
        if (data[i].children) {
          if (loop(data[i].children!, key, callback)) {
            return true;
          }
        }
      }
      return false;
    };
    const data = [...treeData];

    // Находим перетаскиваемый узел
    let dragObj: any;
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      // Бросаем внутрь другого узла
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else if (
      ((info.node as any).props.children || []).length > 0 &&
      (info.node as any).props.expanded &&
      dropPosition === 1
    ) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else {
      let ar: any[] = [];
      let i: number = 0;
      loop(data, dropKey, (_item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj);
      } else {
        ar.splice(i + 1, 0, dragObj);
      }
    }
    setTreeData(data);
  };

  return (
    <div className="sidebar-section">
      <h2>Повествование</h2>
      <Tree
        className="draggable-tree"
        draggable
        blockNode
        onSelect={handleSelect}
        onDrop={onDrop}
        treeData={treeData}
      />
    </div>
  );
}

export default NarrativeTree;
