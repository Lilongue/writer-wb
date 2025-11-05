/* eslint-disable no-console */
import React, { useEffect, useState, useCallback } from 'react';
import { Tree, Dropdown, Modal, Input } from 'antd';
import type { TreeProps } from 'antd/es/tree';
import { WorldObject, WorldObjectType } from '../../common/types';

// Узел дерева может быть либо типом, либо объектом
// Добавляем `children` в тип для возможности динамической подгрузки
type TreeNode = (WorldObjectType & { children?: any[] }) | WorldObject;

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
  selectedId: number | null;
  selectedType: 'world' | null;
}

function WorldObjectTree({
  onSelect,
  selectedId,
  selectedType,
}: WorldObjectTreeProps) {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
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
    schema: any[] | null;
    fieldValues: Record<string, string>;
  }>({
    open: false,
    type: 'create',
    node: null,
    name: '',
    schema: null,
    fieldValues: {},
  });

  const selectedKeys =
    selectedType === 'world' && selectedId ? [`obj-${selectedId}`] : [];

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
    const cleanup = window.electron.ipcRenderer.on(
      'world-objects-changed',
      async (payload: unknown) => {
        if (payload === undefined) {
          // This is a signal that the types themselves have changed (e.g., a new type was created).
          // We need to re-fetch the entire tree.
          fetchWorldObjectTypes()
            .then(setTreeData)
            .catch((err) =>
              console.error('[WorldObjectTree] Refetch failed:', err),
            );
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
      },
    );

    return () => {
      cleanup();
    };
  }, [expandedKeys, fetchWorldObjectTypes]);

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

      // Обновляем дерево иммутабельным способом
      setTreeData((origin) =>
        origin.map((node) => {
          if (node.key === key) {
            // Возвращаем новый объект узла с добавленными дочерними элементами
            return {
              ...node,
              children: formattedObjects,
            };
          }
          // Возвращаем исходный узел для всех остальных
          return node;
        }),
      );
    } catch (error) {
      console.error('Failed to fetch world objects by type:', error);
    }
  };

  const handleSelect: TreeProps['onSelect'] = (keys) => {
    if (keys.length > 0) {
      const key = keys[0] as string;
      if (key.startsWith('obj-')) {
        const id = key.split('-')[1];
        onSelect(id);
        return;
      }
    }
    onSelect(null);
  };

  const onRightClick: TreeProps['onRightClick'] = ({ event, node }) => {
    setContextMenu({ open: true, x: event.clientX, y: event.clientY, node });
  };

  const getMenuItems = (node: any) => {
    if (!node) {
      return [];
    }
    const items = [];
    if (node.isLeaf) {
      // Это объект мира
      items.push({ key: 'rename', label: 'Переименовать' });
      items.push({ key: 'delete', label: 'Удалить', danger: true });
    } else {
      // Это категория
      items.push({ key: 'create', label: 'Создать объект' });
    }
    return items;
  };

  const handleMenuClick = async ({ key }: { key: string }) => {
    const { node } = contextMenu;
    setContextMenu({ ...contextMenu, open: false });

    if (key === 'create') {
      const typeId = Number(node.key.split('-')[1]);
      const template = await window.electron.ipcRenderer.invoke(
        'get-template-details',
        typeId,
      );
      const schema = JSON.parse(template.fields_schema || '[]');
      setModalState({
        open: true,
        type: 'create',
        node,
        name: '',
        schema,
        fieldValues: {},
      });
    } else if (key === 'rename') {
      setModalState({
        open: true,
        type: 'rename',
        node,
        name: node.title,
        schema: null,
        fieldValues: {},
      });
    } else if (key === 'delete') {
      Modal.confirm({
        title: `Удалить "${node.title}"?`,
        content: 'Это действие нельзя будет отменить.',
        okText: 'Удалить',
        okType: 'danger',
        cancelText: 'Отмена',
        onOk: async () => {
          try {
            const id = Number(node.key.split('-')[1]);
            await window.electron.ipcRenderer.invoke('world-object:delete', id);
          } catch (e: any) {
            Modal.error({ title: 'Ошибка удаления', content: e.message });
          }
        },
      });
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
          {
            name,
            typeId,
            properties,
          },
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
      }
    } catch (e: any) {
      Modal.error({ title: 'Ошибка', content: e.message });
    } finally {
      setModalState({
        open: false,
        type: 'create',
        node: null,
        name: '',
        schema: null,
        fieldValues: {},
      });
    }
  };

  const handleFieldValueChange = (fieldName: string, value: string) => {
    setModalState((prev) => ({
      ...prev,
      fieldValues: {
        ...prev.fieldValues,
        [fieldName]: value,
      },
    }));
  };

  return (
    <div className="sidebar-section" onContextMenu={(e) => e.preventDefault()}>
      <h2>Объекты мира</h2>
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
          loadData={onLoadData}
          treeData={treeData}
          onSelect={handleSelect}
          onRightClick={onRightClick}
          blockNode
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          selectedKeys={selectedKeys}
        />
      </Dropdown>
      <Modal
        title={
          modalState.type === 'create'
            ? 'Создать объект'
            : 'Переименовать объект'
        }
        open={modalState.open}
        onOk={handleModalOk}
        onCancel={() => setModalState({ ...modalState, open: false })}
        okText={modalState.type === 'create' ? 'Создать' : 'Переименовать'}
        cancelText="Отмена"
        width={600}
      >
        <Input
          value={modalState.name}
          onChange={(e) =>
            setModalState({ ...modalState, name: e.target.value })
          }
          placeholder="Имя объекта"
          style={{ marginBottom: '1rem' }}
        />
        {modalState.type === 'create' &&
          modalState.schema?.map((field) => (
            <div key={field.name} className="form-field-container">
              <label
                htmlFor={`field-${field.name}`}
                className="form-field-label"
              >
                {field.label}
              </label>
              <Input
                id={`field-${field.name}`}
                value={modalState.fieldValues[field.name] || ''}
                onChange={(e) =>
                  handleFieldValueChange(field.name, e.target.value)
                }
                placeholder={`Введите ${field.label.toLowerCase()}`}
              />
            </div>
          ))}
      </Modal>
    </div>
  );
}

export default WorldObjectTree;
