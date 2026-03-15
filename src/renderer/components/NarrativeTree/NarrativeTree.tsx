import { Tree } from 'antd';
import { HolderOutlined } from '@ant-design/icons';
import NarrativeContextMenu from './NarrativeContextMenu';
import NarrativeItemModal from './NarrativeItemModal';
import useNarrativeTreeData from './useNarrativeTreeData';
import { EntityType } from '../../../common/types';

interface NarrativeTreeProps {
  onSelect: (id: number | null) => void;
  selectedId: number | null;
  selectedType: EntityType | null;
}

function NarrativeTree({
  onSelect,
  selectedId,
  selectedType,
}: NarrativeTreeProps) {
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
    handleModalTitleChange,
    handleModalPressEnter,
    expandedKeys, // New: Import expandedKeys
    setExpandedKeys, // New: Import setExpandedKeys
    selectedKeys, // New: Import selectedKeys
    handleDrop,
  } = useNarrativeTreeData(onSelect, selectedId, selectedType);

  const draggableConfig = {
    icon: <HolderOutlined />,
    nodeDraggable: () => true,
  };

  return (
    <div className="sidebar-section" onContextMenu={(e) => e.preventDefault()}>
      <h2>Повествование</h2>
      <NarrativeContextMenu
        contextMenu={contextMenu}
        onContextMenuClose={onContextMenuClose}
        onMenuClick={handleMenuClick}
      >
        <Tree
          draggable={draggableConfig}
          onSelect={handleSelect}
          onRightClick={onRightClick}
          onDrop={handleDrop}
          treeData={treeData}
          expandedKeys={expandedKeys} // New: Pass expandedKeys
          onExpand={setExpandedKeys} // New: Pass onExpand
          selectedKeys={selectedKeys}
        />
      </NarrativeContextMenu>
      <NarrativeItemModal
        modalState={modalState}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        onNameChange={handleModalNameChange}
        onTitleChange={handleModalTitleChange}
        onPressEnter={handleModalPressEnter}
      />
    </div>
  );
}

export default NarrativeTree;
