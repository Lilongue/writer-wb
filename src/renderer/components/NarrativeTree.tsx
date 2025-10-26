/* eslint-disable no-console */
import { useState, useCallback, useEffect } from 'react';
import { Tree, Dropdown, Modal, Input } from 'antd';
import type { TreeProps } from 'antd/es/tree';
import { NarrativeItem } from '../../common/types';

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
      type: node.type, // Пробрасываем тип
      children: node.children ? convertToAntdTreeFormat(node.children) : [],
    }));
  };

  return convertToAntdTreeFormat(tree);
};

interface NarrativeTreeProps {
  onSelect: (id: number | null) => void;
}

function NarrativeTree({ onSelect }: NarrativeTreeProps) {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    node: any;
  }>({ open: false, x: 0, y: 0, node: null });
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: 'create' | 'rename';
    node: any;
    name: string;
  }>({ open: false, type: 'create', node: null, name: '' });

  const fetchNarrativeItems = useCallback(async () => {
    try {
      const items: NarrativeItem[] = await window.electron.ipcRenderer.invoke(
        'get-narrative-items',
      );
      const hierarchy = buildTree(items);
      setTreeData(hierarchy);
    } catch (error) {
      console.error('Failed to fetch narrative items:', error);
    }
  }, []);

  useEffect(() => {
    fetchNarrativeItems();

    const cleanup = window.electron.ipcRenderer.on('narrative-changed', () => {
      fetchNarrativeItems();
    });

    return () => {
      cleanup();
    };
  }, [fetchNarrativeItems]);

  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      onSelect(selectedKeys[0] as number);
    } else {
      onSelect(null);
    }
  };

  const onRightClick: TreeProps['onRightClick'] = ({ event, node }) => {
    setContextMenu({ open: true, x: event.clientX, y: event.clientY, node });
  };

  const getMenuItems = (node: any) => {
    if (!node) {
      return [];
    }
    const items = [];
    if (node.type === 'part') {
      items.push({ key: 'create-chapter', label: 'Создать главу' });
    }
    if (node.type === 'chapter') {
      items.push({ key: 'create-scene', label: 'Создать сцену' });
    }
    items.push({ key: 'rename', label: 'Переименовать' });
    items.push({ key: 'delete', label: 'Удалить', danger: true });
    return items;
  };

  const handleMenuClick = ({
    key,
    domEvent,
  }: {
    key: string;
    domEvent: any;
  }) => {
    domEvent.stopPropagation();
    const { node } = contextMenu;
    setContextMenu({ ...contextMenu, open: false });

    if (key.startsWith('create-')) {
      const itemType = key.split('-')[1];
      setModalState({
        open: true,
        type: 'create',
        node: { ...node, itemType },
        name: '',
      });
    } else if (key === 'rename') {
      setModalState({ open: true, type: 'rename', node, name: node.title });
    } else if (key === 'delete') {
      Modal.confirm({
        title: `Удалить "${node.title}"?`,
        content: 'Это действие нельзя будет отменить.',
        okText: 'Удалить',
        okType: 'danger',
        cancelText: 'Отмена',
        onOk: async () => {
          try {
            await window.electron.ipcRenderer.invoke('narrative:delete', {
              itemId: node.key,
            });
          } catch (e: any) {
            Modal.error({ title: 'Ошибка удаления', content: e.message });
          }
        },
      });
    }
  };

  const handleModalOk = async () => {
    const { type, node, name } = modalState;
    try {
      if (type === 'create') {
        await window.electron.ipcRenderer.invoke('narrative:create', {
          parentId: node.key,
          itemType: node.itemType,
          name,
        });
      } else if (type === 'rename') {
        await window.electron.ipcRenderer.invoke('narrative:rename', {
          itemId: node.key,
          newName: name,
        });
      }
    } catch (e: any) {
      Modal.error({ title: 'Ошибка', content: e.message });
    } finally {
      setModalState({ open: false, type: 'create', node: null, name: '' });
    }
  };

  return (
    <div className="sidebar-section" onContextMenu={(e) => e.preventDefault()}>
      <h2>Повествование</h2>
      <Dropdown
        menu={{
          items: getMenuItems(contextMenu.node),
          onClick: handleMenuClick,
        }}
        trigger={['contextMenu']}
        open={contextMenu.open}
        onOpenChange={(open) => setContextMenu({ ...contextMenu, open })}
        placement="bottomLeft"
      >
        <Tree
          blockNode
          onSelect={handleSelect}
          onRightClick={onRightClick}
          treeData={treeData}
        />
      </Dropdown>
      <Modal
        title={
          modalState.type === 'create'
            ? 'Создать элемент'
            : 'Переименовать элемент'
        }
        open={modalState.open}
        onOk={handleModalOk}
        onCancel={() => setModalState({ ...modalState, open: false })}
        okText={modalState.type === 'create' ? 'Создать' : 'Переименовать'}
        cancelText="Отмена"
      >
        <Input
          value={modalState.name}
          onChange={(e) =>
            setModalState({ ...modalState, name: e.target.value })
          }
          onPressEnter={handleModalOk}
        />
      </Modal>
    </div>
  );
}

export default NarrativeTree;
