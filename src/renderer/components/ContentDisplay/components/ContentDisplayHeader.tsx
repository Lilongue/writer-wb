import React from 'react';
import { Button, Tooltip, Space } from 'antd';
import { FolderOpenOutlined, EditOutlined } from '@ant-design/icons';
import { EntityType } from '../../../../common/types';

interface ContentDisplayHeaderProps {
  selectedType?: EntityType | null;
  onOpenFolderClick: () => void;
  onOpenFileClick: () => void;
  isFileOpenable: boolean;
}

const ContentDisplayHeader: React.FC<ContentDisplayHeaderProps> = ({
  selectedType,
  onOpenFolderClick,
  onOpenFileClick,
  isFileOpenable,
}) => {
  return (
    <div className="content-display-header-actions">
      <Space>
        {selectedType === EntityType.WorldObject && (
          <Tooltip title="Открыть папку объекта">
            <Button icon={<FolderOpenOutlined />} onClick={onOpenFolderClick} />
          </Tooltip>
        )}
        <Tooltip title="Открыть во внешнем редакторе">
          <Button
            icon={<EditOutlined />}
            onClick={onOpenFileClick}
            disabled={!isFileOpenable}
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default ContentDisplayHeader;
