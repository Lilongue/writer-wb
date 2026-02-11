import { useState, useCallback, useEffect, Key, useReducer } from 'react';
import type { TreeProps } from 'antd/es/tree';
import { Modal } from 'antd';
import type { MenuProps } from 'antd';
import notificationService from '../../services/notificationService';
import { WorldObject, WorldObjectType } from '../../../common/types';
import { ModalState } from './components/WorldObjectModal';

type TreeNode = (WorldObjectType & { children?: any[] }) | WorldObject;

interface ReducerState {
  treeData: any[];
}

type ReducerAction =
  | { type: 'SET_DATA'; payload: any[] }
  | { type: 'ADD_CHILDREN'; key: Key; payload: any[] }
  | { type: 'DELETE_OBJECT'; objectId: number };

const treeDataReducer = (
  state: ReducerState,
  action: ReducerAction,
): ReducerState => {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, treeData: action.payload };
    case 'ADD_CHILDREN':
      return {
        ...state,
        treeData: state.treeData.map((node) => {
          if (node.key === action.key) {
            return { ...node, children: action.payload };
          }
          return node;
        }),
      };
    case 'DELETE_OBJECT':
      return {
        ...state,
        treeData: state.treeData.map((typeNode) => {
          if (
            Array.isArray(typeNode.children) &&
            typeNode.children.length > 0
          ) {
            const filteredChildren = typeNode.children.filter(
              (child: any) => child.key !== `obj-${action.objectId}`,
            );
            if (filteredChildren.length !== typeNode.children.length) {
              return { ...typeNode, children: filteredChildren };
            }
          }
          return typeNode;
        }),
      };
    default:
      return state;
  }
};

const convertToAntdTreeFormat = (nodes: TreeNode[], isLeaf: boolean) => {
  return nodes.map((node) => ({
    ...node,
    key: `${isLeaf ? 'obj' : 'type'}-${node.id}`,
    title: node.name,
    isLeaf,
  }));
};

const useWorldObjectTreeData = (onSelect: (id: string | null) => void) => {
  const [{ treeData }, dispatch] = useReducer(treeDataReducer, {
    treeData: [],
  });
  const [treeKey, setTreeKey] = useState(0);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [contextMenu, setContextMenu] = useState<{ open: boolean; node: any }>({
    open: false,
    node: null,
  });

  const initialModalState: ModalState = {
    open: false,
    type: 'create',
    node: null,
    name: '',
  };

  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const fetchWorldObjectTypes = useCallback(async () => {
    try {
      const types: WorldObjectType[] = await window.electron.ipcRenderer.invoke(
        'get-world-object-types',
      );
      return convertToAntdTreeFormat(types, false);
    } catch (error) {
      notificationService.showError(
        'Ошибка загрузки типов объектов мира',
        String(error),
      );
      return [];
    }
  }, []);

  // Initial fetch, runs only once on mount
  useEffect(() => {
    fetchWorldObjectTypes()
      .then((data) => dispatch({ type: 'SET_DATA', payload: data }))
      .catch((err) =>
        notificationService.showError(
          'Ошибка при первоначальной загрузке дерева объектов мира',
          err,
        ),
      );
  }, [fetchWorldObjectTypes]);

  // Handles all subsequent updates by forcing a full refresh
  useEffect(() => {
    const handleWorldObjectsChanged = (payload: unknown) => {
      // If a specific type changed (create/delete), ensure it's expanded for good UX
      let keysToKeepExpanded = expandedKeys;
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'typeId' in payload &&
        typeof (payload as { typeId: unknown }).typeId === 'number'
      ) {
        const { typeId } = payload as { typeId: number };
        const keyToUpdate = `type-${typeId}`;
        if (!keysToKeepExpanded.includes(keyToUpdate)) {
          keysToKeepExpanded = [...keysToKeepExpanded, keyToUpdate];
          setExpandedKeys(keysToKeepExpanded);
        }
      }

      // Smart Refresh: Rebuild the tree state completely before re-rendering.
      const smartRefresh = async () => {
        try {
          // 1. Fetch categories and children for all expanded nodes in parallel.
          const categoriesPromise = fetchWorldObjectTypes();
          const childrenPromises = keysToKeepExpanded.map((key) => {
            const typeId = Number((key as string).split('-')[1]);
            return window.electron.ipcRenderer.invoke(
              'get-world-objects-by-type',
              typeId,
            );
          });

          const [categories, ...childrenData] = await Promise.all([
            categoriesPromise,
            ...childrenPromises,
          ]);

          // 2. Map children to their parent keys.
          const childrenMap = new Map<Key, any[]>();
          keysToKeepExpanded.forEach((key, index) => {
            const formattedChildren = convertToAntdTreeFormat(
              childrenData[index] as WorldObject[],
              true,
            );
            childrenMap.set(key, formattedChildren);
          });

          // 3. Assemble the new tree data, injecting children where needed.
          const newTreeData = categories.map((category) => {
            if (childrenMap.has(category.key)) {
              return { ...category, children: childrenMap.get(category.key) };
            }
            return category;
          });

          // 4. Update the state with the fully formed tree.
          dispatch({ type: 'SET_DATA', payload: newTreeData });

          // 5. Force the Tree component to re-mount to render the new state cleanly.
          setTreeKey((k) => k + 1);
        } catch (err) {
          notificationService.showError(
            'Ошибка при умном обновлении дерева объектов мира',
            String(err),
          );
        }
      };

      smartRefresh();
    };

    const cleanup = window.electron.ipcRenderer.on(
      'world-objects-changed',
      handleWorldObjectsChanged,
    );

    return cleanup;
  }, [expandedKeys, fetchWorldObjectTypes]);

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
      // Dispatching an action ensures state updates are queued and don't race.
      dispatch({ type: 'ADD_CHILDREN', key, payload: formattedObjects });
    } catch (error) {
      notificationService.showError(
        'Ошибка загрузки объектов мира по типу',
        String(error),
      );
    }
  };

  const handleModalOk = async () => {
    const { type, node, name } = modalState;
    try {
      if (type === 'create') {
        const typeId = Number(node.key.split('-')[1]);
        const properties = JSON.stringify({}); // Create with empty properties
        const newId = await window.electron.ipcRenderer.invoke(
          'world-object:create',
          { name, typeId, properties },
        );
        if (newId) {
          onSelect(newId.toString());
        }
      } else if (type === 'delete') {
        const id = Number(node.key.split('-')[1]);
        const result = (await window.electron.ipcRenderer.invoke(
          'world-object:delete',
          id,
        )) as { success: boolean; error?: string };
        if (!result || !result.success) {
          Modal.error({
            title: 'Ошибка удаления',
            content: 'Не удалось удалить объект',
          });
        }
        // The 'world-objects-changed' event will handle the refresh
      }
    } catch (e: any) {
      Modal.error({ title: 'Ошибка', content: e.message });
    } finally {
      setModalState(initialModalState);
    }
  };

  const handleMenuClick: MenuProps['onClick'] = async (info) => {
    info.domEvent.stopPropagation();
    const { node } = contextMenu;
    setContextMenu({ ...contextMenu, open: false });

    if (info.key === 'create') {
      setModalState({
        open: true,
        type: 'create',
        node,
        name: '',
      });
    } else if (info.key === 'delete') {
      setModalState({
        open: true,
        type: 'delete',
        node,
        name: '', // name is not used for delete but clearing it is good practice
      });
    }
  };

  const onRightClick: TreeProps['onRightClick'] = ({ event, node }) => {
    event.preventDefault();
    setContextMenu({ open: true, node });
  };

  return {
    treeData,
    treeKey, // Export the key
    expandedKeys,
    setExpandedKeys,
    onLoadData,
    contextMenu,
    onContextMenuClose: () =>
      setContextMenu((prev) => ({ ...prev, open: false })),
    handleMenuClick,
    onRightClick,
    modalState,
    handleModalOk,
    handleModalCancel: () => setModalState(initialModalState),
    handleModalNameChange: (name: string) => {
      setModalState((prev) => ({ ...prev, name }));
    },
  };
};

export default useWorldObjectTreeData;
