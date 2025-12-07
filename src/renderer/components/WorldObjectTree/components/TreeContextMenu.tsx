import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';

const getMenuItems = (node: any): MenuProps['items'] => {
  if (!node) {
    return [];
  }
  const items = [];
  if (node.isLeaf) {
    items.push({ key: 'rename', label: 'Переименовать' });
    items.push({ key: 'delete', label: 'Удалить', danger: true });
  } else {
    items.push({ key: 'create', label: 'Создать объект' });
  }
  return items;
};

interface TreeContextMenuProps {
  children: React.ReactNode;
  contextMenu: {
    open: boolean;
    node: any;
  };
  onContextMenuClose: () => void;
  onMenuClick: MenuProps['onClick'];
}

const TreeContextMenu = ({
  children,
  contextMenu,
  onContextMenuClose,
  onMenuClick,
}: TreeContextMenuProps) => {
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

export default TreeContextMenu;
