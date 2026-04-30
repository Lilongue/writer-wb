import { useState, useCallback, useEffect, Key } from 'react';
import type { TreeProps } from 'antd/es/tree';
import { Modal } from 'antd';
import type { MenuProps } from 'antd';
import { useProject } from '../../contexts/ProjectContext';
import { NarrativeItem, EntityType } from '../../../common/types';
import { NarrativeModalState } from './NarrativeItemModal';
import { buildTree } from './narrativeTreeUtils';
import notificationService from '../../services/notificationService';
import { cleanNameInput } from '../../../common/utils';

const useNarrativeTreeData = (
  onSelect: (id: number | null) => void,
  selectedId: number | null,
  selectedType: EntityType | null,
) => {
  const { narrativeTemplates } = useProject();
  const [treeData, setTreeData] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]); // New: State for expanded keys
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]); // State for selected keys

  useEffect(() => {
    if (selectedType === EntityType.Narrative && selectedId !== null) {
      setSelectedKeys([selectedId]);
    } else {
      setSelectedKeys([]);
    }
  }, [selectedId, selectedType]);

  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    node: any;
  }>({ open: false, node: null });

  const initialModalState: NarrativeModalState = {
    open: false,
    type: 'create',
    node: null,
    name: '',
    title: '',
  };
  const [modalState, setModalState] =
    useState<NarrativeModalState>(initialModalState);

  const fetchNarrativeItems = useCallback(async () => {
    try {
      const items: NarrativeItem[] = await window.electron.ipcRenderer.invoke(
        'get-narrative-items',
      );
      const hierarchy = buildTree(items, narrativeTemplates);
      setTreeData(hierarchy);
    } catch (error) {
      notificationService.showError(
        'Ошибка загрузки элементов повествования',
        String(error),
      );
    }
  }, [narrativeTemplates]);

  const handleExport = useCallback(async (node: any) => {
    try {
      const nodeId = node ? (node.key as number) : null;
      const result = await window.electron.exportNarrative(nodeId, false);
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
  }, []);

  const handleDrop: TreeProps['onDrop'] = async (info) => {
    const { dragNode, node: dropNode, dropPosition } = info;
    const dragId = dragNode.key as number;

    let dropId: number;
    let dropType: 'before' | 'after' | 'inside';

    if (dropNode) {
      dropId = dropNode.key as number;
      if (dropPosition === 0) {
        dropType = 'inside';
      } else if (dropPosition === -1) {
        dropType = 'before';
      } else {
        dropType = 'after';
      }
    } else {
      // This case might not be reachable if 'node' is always provided,
      // but it's good practice to keep it as a fallback for root drops.
      const rootNode = treeData.find((node) => node.parent_id === null);
      if (rootNode) {
        dropId = rootNode.key as number;
        dropType = 'inside';
      } else {
        notificationService.showError(
          'Ошибка перемещения',
          'Не удалось найти корневой элемент проекта.',
        );
        return;
      }
    }

    try {
      await window.electron.ipcRenderer.invoke('narrative:update-order', {
        dragId,
        dropId,
        dropType,
      });
      // The 'narrative-changed' event will trigger a refetch
    } catch (error: any) {
      notificationService.showError('Ошибка перемещения', error.message);
    }
  };

  useEffect(() => {
    fetchNarrativeItems();

    const cleanupNarrativeChanged = window.electron.ipcRenderer.on(
      'narrative-changed',
      () => {
        fetchNarrativeItems();
      },
    );

    const cleanupExportFull = window.electron.ipcRenderer.on(
      'export-full-manuscript',
      () => handleExport(null),
    );

    return () => {
      cleanupNarrativeChanged();
      cleanupExportFull();
    };
  }, [fetchNarrativeItems, handleExport]);

  const handleSelect: TreeProps['onSelect'] = (newSelectedKeys, info) => {
    if (newSelectedKeys.length > 0) {
      onSelect(newSelectedKeys[0] as number);
    } else {
      onSelect(null);
    }

    // New expansion logic: Always expand, never collapse on click
    if (info.node && !info.node.isLeaf) {
      const clickedKey = info.node.key;
      setExpandedKeys((prevExpandedKeys) => {
        if (!prevExpandedKeys.includes(clickedKey)) {
          return [...prevExpandedKeys, clickedKey];
        }
        return prevExpandedKeys; // Already expanded, do nothing
      });
    }
  };

  const handleMenuClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    domEvent.stopPropagation();
    const { node } = contextMenu;
    setContextMenu({ ...contextMenu, open: false });

    if (key.startsWith('create-')) {
      const templateId = parseInt(key.split('-')[1], 10);
      const template = narrativeTemplates.find((t) => t.id === templateId);
      setModalState({
        open: true,
        type: 'create',
        node,
        name: '',
        title: '',
        templateId,
        templateName: template?.name,
      });
    } else if (key === 'delete') {
      setModalState({ open: true, type: 'delete', node, name: node.title });
    } else if (key === 'export-narrative') {
      handleExport(node);
    }
  };

  const handleModalOk = async () => {
    const { type, node, name, title, templateId } = modalState;
    try {
      if (type === 'create') {
        const trimmedName = cleanNameInput(name);
        const trimmedTitle = cleanNameInput(title || '');

        if (!trimmedName) {
          notificationService.showError(
            'Ошибка создания',
            'Имя элемента повествования не может быть пустым.',
          );
          return;
        }
        await window.electron.ipcRenderer.invoke('narrative:create', {
          parentId: node.key,
          templateId,
          name: trimmedName,
          title: trimmedTitle,
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
    handleModalTitleChange: (title: string) => {
      setModalState((prev) => ({ ...prev, title }));
    },
    handleModalPressEnter: handleModalOk,
    expandedKeys, // Export expandedKeys
    setExpandedKeys, // Export setExpandedKeys
    selectedKeys, // Export selectedKeys
    handleDrop,
  };
};

export default useNarrativeTreeData;
