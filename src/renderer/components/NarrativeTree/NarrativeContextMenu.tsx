import React from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useProject } from '../../contexts/ProjectContext';
import { EntityTemplate } from '../../../common/types';

interface NarrativeContextMenuProps {
  children: React.ReactNode;
  contextMenu: {
    open: boolean;
    node: any;
  };
  onContextMenuClose: () => void;
  onMenuClick: MenuProps['onClick'];
}

const getMenuItems = (
  node: any,
  narrativeTemplates: EntityTemplate[],
): MenuProps['items'] => {
  if (!node || narrativeTemplates.length === 0) {
    return [];
  }

  const items: MenuProps['items'] = [];

  // Find the template for the current node.
  const currentTemplateIndex = narrativeTemplates.findIndex(
    (t) => t.id === node.template_id,
  );

  if (node.parent_id === null) {
    // This is the root node of the entire tree ("Произведение")
    const topLevelTemplate = narrativeTemplates[0]; // The one with the highest weight
    if (topLevelTemplate) {
      items.push({
        key: `create-${topLevelTemplate.id}`,
        label: `Создать ${topLevelTemplate.name}`,
      });
    }
  } else if (currentTemplateIndex !== -1) {
    // This is a regular node. Find the next level down.
    const nextTemplate = narrativeTemplates[currentTemplateIndex + 1];
    if (nextTemplate) {
      items.push({
        key: `create-${nextTemplate.id}`,
        label: `Создать ${nextTemplate.name}`,
      });
    }
  }

  // Add common menu items
  if (items.length > 0) {
    items.push({ type: 'divider' });
  }
  items.push({ key: 'rename', label: 'Переименовать' });
  items.push({ key: 'delete', label: 'Удалить', danger: true });
  items.push({ type: 'divider' });
  items.push({ key: 'export-narrative', label: 'Экспортировать рукопись' });

  return items;
};

const NarrativeContextMenu: React.FC<NarrativeContextMenuProps> = ({
  children,
  contextMenu,
  onContextMenuClose,
  onMenuClick,
}) => {
  const { narrativeTemplates } = useProject();

  return (
    <Dropdown
      menu={{
        items: getMenuItems(contextMenu.node, narrativeTemplates),
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
