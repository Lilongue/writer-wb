import { Tree } from 'antd';
import type { TreeProps } from 'antd/es/tree';

import useWorldObjectTreeData from './useWorldObjectTreeData';
import TreeContextMenu from './components/TreeContextMenu';
import WorldObjectModal from './components/WorldObjectModal';

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
  const {
    treeData,
    treeKey,
    expandedKeys,
    setExpandedKeys,
    onLoadData,
    contextMenu,
    onContextMenuClose,
    handleMenuClick,
    onRightClick,
    modalState,
    handleModalOk,
    handleModalCancel,
    handleModalNameChange,
    handleModalFieldValueChange,
  } = useWorldObjectTreeData(onSelect);

  const handleSelect: TreeProps['onSelect'] = (keys, info) => {
    // Original selection logic
    if (keys.length > 0) {
      const key = keys[0] as string;
      if (key.startsWith('obj-')) {
        const id = key.split('-')[1];
        onSelect(id);
      } else { // This is a type node
        onSelect(null);
      }
    } else {
      onSelect(null);
    }

    // New expansion logic: Always expand, never collapse on click
    if (info.node && !info.node.isLeaf) {
      const clickedKey = info.node.key;
      setExpandedKeys((prevExpandedKeys) => {
        if (!prevExpandedKeys.includes(clickedKey)) {
          // If the node is being expanded and it doesn't have children yet,
          // manually trigger onLoadData to fetch them.
          if (!info.node.children && onLoadData) {
            onLoadData(info.node);
          }
          return [...prevExpandedKeys, clickedKey];
        }
        return prevExpandedKeys; // Already expanded, do nothing
      });
    }
  };

  const selectedKeys =
    selectedType === 'world' && selectedId ? [`obj-${selectedId}`] : [];

  return (
    <div className="sidebar-section" onContextMenu={(e) => e.preventDefault()}>
      <h2>Объекты мира</h2>
      <TreeContextMenu
        contextMenu={contextMenu}
        onContextMenuClose={onContextMenuClose}
        onMenuClick={handleMenuClick}
      >
        <Tree
          key={treeKey}
          loadData={onLoadData}
          treeData={treeData}
          onSelect={handleSelect}
          onRightClick={onRightClick}
          blockNode
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          selectedKeys={selectedKeys}
        />
      </TreeContextMenu>
      <WorldObjectModal
        modalState={modalState}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        onNameChange={handleModalNameChange}
        onFieldValueChange={handleModalFieldValueChange}
      />
    </div>
  );
}

export default WorldObjectTree;
