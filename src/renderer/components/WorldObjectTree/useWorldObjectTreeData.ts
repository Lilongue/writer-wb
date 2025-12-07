/* eslint-disable no-console */
import React, { useState, useCallback, useEffect } from 'react';
import type { TreeProps } from 'antd/es/tree';
import { Modal } from 'antd';
import type { MenuProps } from 'antd';
import {
  EntityTemplate,
  WorldObject,
  WorldObjectType,
} from '../../../common/types';
import { ModalState } from './components/WorldObjectModal';

type TreeNode = (WorldObjectType & { children?: any[] }) | WorldObject;
const convertToAntdTreeFormat = (nodes: TreeNode[], isLeaf: boolean) => {
  return nodes.map((node) => ({
    ...node,
    key: `${isLeaf ? 'obj' : 'type'}-${node.id}`,
    title: node.name,
    isLeaf,
  }));
};

const useWorldObjectTreeData = (onSelect: (id: string | null) => void) => {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [contextMenu, setContextMenu] = useState<{ open: boolean; node: any }>({
    open: false,
    node: null,
  });

  const initialModalState: ModalState = {
    open: false,
    type: 'create',
    node: null,
    name: '',
    schema: null,
    fieldValues: {},
  };

  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const fetchWorldObjectTypes = useCallback(async () => {
    try {
      const types: WorldObjectType[] = await window.electron.ipcRenderer.invoke(
        'get-world-object-types',
      );
      return convertToAntdTreeFormat(types, false);
    } catch (error) {
      console.error('Failed to fetch world object types:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchWorldObjectTypes()
      .then(setTreeData)
      .catch((err) =>
        console.error('[WorldObjectTree] Initial fetch failed:', err),
      );
  }, [fetchWorldObjectTypes]);

  useEffect(() => {
    const handleWorldObjectsChanged = async (payload: unknown) => {
      if (payload === undefined) {
        try {
          const newTreeData = await fetchWorldObjectTypes();
          setTreeData((oldTreeData) => {
            const oldDataMap = new Map(
              oldTreeData.map((node) => [node.key, node]),
            );
            return newTreeData.map((newNode) => {
              const oldNode = oldDataMap.get(newNode.key);
              if (oldNode && oldNode.children) {
                return { ...newNode, children: oldNode.children };
              }
              return newNode;
            });
          });
        } catch (err) {
          console.error('[WorldObjectTree] Refetch failed:', err);
        }
        return;
      }

      if (
        typeof payload === 'object' &&
        payload !== null &&
        'typeId' in payload &&
        typeof (payload as { typeId: unknown }).typeId === 'number'
      ) {
        const { typeId } = payload as { typeId: number };
        const keyToUpdate = `type-${typeId}`;

        if (expandedKeys.includes(keyToUpdate)) {
          try {
            const objects: WorldObject[] =
              await window.electron.ipcRenderer.invoke(
                'get-world-objects-by-type',
                typeId,
              );
            const formattedObjects = convertToAntdTreeFormat(objects, true);
            setTreeData((origin) =>
              origin.map((node) => {
                if (node.key === keyToUpdate) {
                  return { ...node, children: formattedObjects };
                }
                return node;
              }),
            );
          } catch (error) {
            console.error('Failed to refresh world objects:', error);
          }
        } else {
          setTreeData((origin) =>
            origin.map((node) => {
              if (node.key === keyToUpdate) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { children, ...rest } = node;
                return rest;
              }
              return node;
            }),
          );
        }
      }
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
      setTreeData((origin) =>
        origin.map((node) => {
          if (node.key === key) {
            return { ...node, children: formattedObjects };
          }
          return node;
        }),
      );
    } catch (error) {
      console.error('Failed to fetch world objects by type:', error);
    }
  };

  const handleModalOk = async () => {
    const { type, node, name, fieldValues } = modalState;
    try {
      if (type === 'create') {
        const typeId = Number(node.key.split('-')[1]);
        const properties = JSON.stringify(fieldValues);
        const newId = await window.electron.ipcRenderer.invoke(
          'world-object:create',
          { name, typeId, properties },
        );
        if (newId) {
          onSelect(newId.toString());
        }
      } else if (type === 'rename') {
        const id = Number(node.key.split('-')[1]);
        await window.electron.ipcRenderer.invoke('world-object:rename', {
          id,
          newName: name,
        });
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
          return;
        }
        setTreeData((origin) =>
          origin.map((typeNode) => {
            if (
              Array.isArray(typeNode.children) &&
              typeNode.children.length > 0
            ) {
              const filteredChildren = typeNode.children.filter(
                (child: any) => child.key !== `obj-${id}`,
              );
              if (filteredChildren.length !== typeNode.children.length) {
                return { ...typeNode, children: filteredChildren };
              }
            }
            return typeNode;
          }),
        );
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
      const typeId = Number(node.key.split('-')[1]);
      const template = (await window.electron.ipcRenderer.invoke(
        'get-template-details',
        typeId,
      )) as EntityTemplate;
      const schema = JSON.parse(template.fields_schema || '[]');
      setModalState({
        open: true,
        type: 'create',
        node,
        name: '',
        schema,
        fieldValues: {},
      });
    } else if (info.key === 'rename') {
      setModalState({
        open: true,
        type: 'rename',
        node,
        name: node.title,
        schema: null,
        fieldValues: {},
      });
    } else if (info.key === 'delete') {
      setModalState({
        open: true,
        type: 'delete',
        node,
        name: '',
        schema: null,
        fieldValues: {},
      });
    }
  };

  const onRightClick: TreeProps['onRightClick'] = ({ event, node }) => {
    event.preventDefault();
    setContextMenu({ open: true, node });
  };

  return {
    treeData,
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
    handleModalFieldValueChange: (fieldName: string, value: string) => {
      setModalState((prev) => ({
        ...prev,
        fieldValues: {
          ...prev.fieldValues,
          [fieldName]: value,
        },
      }));
    },
  };
};

export default useWorldObjectTreeData;
