import React from 'react';
import { Dropdown, Modal } from 'antd'; // Modal is not used but was in the original snippet, removing it for cleaner code
import type { MenuProps } from 'antd';

interface NarrativeContextMenuProps {
  children: React.ReactNode;
  contextMenu: {
    open: boolean;
    node: any;
  };
  onContextMenuClose: () => void;
  onMenuClick: MenuProps['onClick'];
}

const getMenuItems = (node: any): MenuProps['items'] => {
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

const NarrativeContextMenu: React.FC<NarrativeContextMenuProps> = ({
  children,
  contextMenu,
  onContextMenuClose,
  onMenuClick,
}) => {
  return (
    <Dropdown
      menu={{
        items: getMenuItems(contextMenu.node),
        onClick: onMenuClick,
      }}
      trigger={['contextMenu']}
      open={contextMenu.open}
      onOpenChange={(open) => !open && onContextMenuClose()}
      placement="bottomLeft"
    >
      {children}
    </Dropdown>
  );
};

export default NarrativeContextMenu;
