import React, { useEffect, useState } from 'react';
import { Tree } from 'antd';
import type { TreeProps } from 'antd/es/tree';
import { WorldObject, WorldObjectType } from '../../common/types';

// Узел дерева может быть либо типом, либо объектом
type TreeNode = (WorldObjectType & { children?: TreeNode[] }) | WorldObject;

// Конвертируем данные в формат, понятный Ant Design Tree
const convertToAntdTreeFormat = (nodes: TreeNode[], isLeaf: boolean) => {
  return nodes.map((node) => ({
    ...node,
    key: `${isLeaf ? 'obj' : 'type'}-${node.id}`,
    title: node.name,
    isLeaf,
  }));
};

interface WorldObjectTreeProps {
  onSelect: (id: string | null) => void;
}

function WorldObjectTree({ onSelect }: WorldObjectTreeProps) {
  const [treeData, setTreeData] = useState<any[]>([]);

  // 1. При монтировании компонента загружаем типы объектов (верхний уровень)
  useEffect(() => {
    const fetchWorldObjectTypes = async () => {
      try {
        const types: WorldObjectType[] =
          await window.electron.ipcRenderer.invoke('get-world-object-types');
        const formattedTypes = convertToAntdTreeFormat(types, false);
        setTreeData(formattedTypes);
      } catch (error) {
        console.error('Failed to fetch world object types:', error);
      }
    };

    fetchWorldObjectTypes();
  }, []);

  // 2. Функция для динамической подгрузки данных
  const onLoadData: TreeProps['loadData'] = async ({ key, children }) => {
    if (children) {
      return;
    }

    const typeId = Number((key as string).split('-')[1]);

    try {
      const objects: WorldObject[] = await window.electron.ipcRenderer.invoke(
        'get-world-objects-by-type',
        typeId,
      );
      const formattedObjects = convertToAntdTreeFormat(objects, true);

      // Обновляем дерево, добавляя дочерние элементы к нужному узлу
      setTreeData((origin) => {
        const newTree = [...origin];
        const targetNode = newTree.find((node) => node.key === key);
        if (targetNode) {
          targetNode.children = formattedObjects;
        }
        return newTree;
      });
    } catch (error) {
      console.error('Failed to fetch world objects by type:', error);
    }
  };

  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      onSelect(selectedKeys[0] as string);
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="sidebar-section">
      <h2>Объекты мира</h2>
      <Tree loadData={onLoadData} treeData={treeData} onSelect={handleSelect} />
    </div>
  );
}

export default WorldObjectTree;
