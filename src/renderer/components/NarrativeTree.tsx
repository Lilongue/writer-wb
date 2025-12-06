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
    type: 'create' | 'rename' | 'delete';
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
    if (node.parent_id === null) {
      items.push({ key: 'create-part', label: 'Создать часть' });
    } else if (node.type === 'part') {
      items.push({ key: 'create-chapter', label: 'Создать главу' });
    } else if (node.type === 'chapter') {
      items.push({ key: 'create-scene', label: 'Создать сцену' });
    }
    items.push({ key: 'rename', label: 'Переименовать' });
    items.push({ key: 'delete', label: 'Удалить', danger: true });
    items.push({ key: 'export-narrative', label: 'Экспортировать рукопись' });
    return items;
  };

  const handleExport = async (node: any) => {
    try {
      const result = await window.electron.exportNarrative(
        node.key as number,
        false,
      ); // rootItemId and includeHeaders set to false
      if (result.success) {
        Modal.success({
          title: 'Рукопись успешно экспортирована',
          content: `Файл сохранен по пути: ${result.filePath}`,
        });
      } else if (result.canceled) {
        // User canceled the save dialog, do nothing
      } else {
        Modal.error({
          title: 'Ошибка экспорта',
          content: result.error || 'Произошла неизвестная ошибка.',
        });
      }
    } catch (e: any) {
      Modal.error({
        title: 'Ошибка экспорта',
        content: e.message,
      });
    }
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
      setModalState({ open: true, type: 'delete', node, name: node.title });
    } else if (key === 'export-narrative') {
      handleExport(node);
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
      } else if (type === 'delete') {
        await window.electron.ipcRenderer.invoke('narrative:delete', node.key);
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
        onOpenChange={(open) => setContextMenu((prev) => ({ ...prev, open }))}
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
          {
            create: 'Создать элемент',
            rename: 'Переименовать элемент',
            delete: 'Удалить элемент',
          }[modalState.type]
        }
        open={modalState.open}
        onOk={handleModalOk}
        onCancel={() => setModalState({ ...modalState, open: false })}
        okText={
          {
            create: 'Создать',
            rename: 'Переименовать',
            delete: 'Удалить',
          }[modalState.type]
        }
        cancelText="Отмена"
        okButtonProps={{ danger: modalState.type === 'delete' }}
      >
        {modalState.type === 'delete' ? (
          <p>
            Вы уверены, что хотите удалить &quot;{modalState.name}&quot;? Это
            действие нельзя будет отменить.
          </p>
        ) : (
          <Input
            value={modalState.name}
            onChange={(e) =>
              setModalState({ ...modalState, name: e.target.value })
            }
            onPressEnter={handleModalOk}
          />
        )}
      </Modal>
    </div>
  );
}

export default NarrativeTree;
