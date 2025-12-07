/* eslint-disable no-console */
import { useState, useCallback, useEffect } from 'react';
import type { TreeProps } from 'antd/es/tree';
import { Modal } from 'antd';
import type { MenuProps } from 'antd';
import { NarrativeItem } from '../../../common/types';
import { NarrativeModalState } from './NarrativeItemModal';
import { buildTree } from './narrativeTreeUtils';

const useNarrativeTreeData = (onSelect: (id: number | null) => void) => {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    node: any;
  }>({ open: false, node: null });

  const initialModalState: NarrativeModalState = {
    open: false,
    type: 'create',
    node: null,
    name: '',
  };
  const [modalState, setModalState] =
    useState<NarrativeModalState>(initialModalState);

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

    return cleanup;
  }, [fetchNarrativeItems]);

  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      onSelect(selectedKeys[0] as number);
    } else {
      onSelect(null);
    }
  };

  const handleExport = useCallback(
    async (node: any) => {
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
    },
    [],
  );

  const handleMenuClick: MenuProps['onClick'] = ({ key, domEvent }) => {
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
      setModalState(initialModalState);
    }
  };

  const onRightClick: TreeProps['onRightClick'] = ({ event, node }) => {
    event.preventDefault();
    setContextMenu({ open: true, node });
  };

  return {
    treeData,
    contextMenu,
    onContextMenuClose: () =>
      setContextMenu((prev) => ({ ...prev, open: false })),
    handleMenuClick,
    onRightClick,
    handleSelect,
    modalState,
    handleModalOk,
    handleModalCancel: () => setModalState(initialModalState),
    handleModalNameChange: (name: string) => {
      setModalState((prev) => ({ ...prev, name }));
    },
    handleModalPressEnter: handleModalOk,
  };
};

export default useNarrativeTreeData;
