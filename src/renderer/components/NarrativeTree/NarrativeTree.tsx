import { Tree } from 'antd';
import NarrativeContextMenu from './NarrativeContextMenu';
import NarrativeItemModal from './NarrativeItemModal';
import useNarrativeTreeData from './useNarrativeTreeData';

interface NarrativeTreeProps {
  onSelect: (id: number | null) => void;
}

function NarrativeTree({ onSelect }: NarrativeTreeProps) {
  const {
    treeData,
    contextMenu,
    onContextMenuClose,
    handleMenuClick,
    onRightClick,
    handleSelect,
    modalState,
    handleModalOk,
    handleModalCancel,
    handleModalNameChange,
    handleModalPressEnter,
    expandedKeys, // New: Import expandedKeys
    setExpandedKeys, // New: Import setExpandedKeys
  } = useNarrativeTreeData(onSelect);

  return (
    <div className="sidebar-section" onContextMenu={(e) => e.preventDefault()}>
      <h2>Повествование</h2>
      <NarrativeContextMenu
        contextMenu={contextMenu}
        onContextMenuClose={onContextMenuClose}
        onMenuClick={handleMenuClick}
      >
        <Tree
          blockNode
          onSelect={handleSelect}
          onRightClick={onRightClick}
          treeData={treeData}
          expandedKeys={expandedKeys} // New: Pass expandedKeys
          onExpand={setExpandedKeys} // New: Pass onExpand
        />
      </NarrativeContextMenu>
      <NarrativeItemModal
        modalState={modalState}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        onNameChange={handleModalNameChange}
        onPressEnter={handleModalPressEnter}
      />
    </div>
  );
}

export default NarrativeTree;
