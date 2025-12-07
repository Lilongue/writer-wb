import React from 'react';
import { Button, Input } from 'antd';

interface ContentDisplayHeaderProps {
  name: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  isSaveDisabled: boolean;
  onOpenFile: () => void;
  isOpenFileDisabled: boolean;
}

const ContentDisplayHeader: React.FC<ContentDisplayHeaderProps> = ({
  name,
  onNameChange,
  onSave,
  isSaveDisabled,
  onOpenFile,
  isOpenFileDisabled,
}) => {
  return (
    <div className="content-display-title-wrapper">
      <Input
        value={name}
        onChange={onNameChange}
        disabled={false}
        className="content-display-name-input"
      />
      <div className="card-extra-actions">
        <Button type="primary" onClick={onSave} disabled={isSaveDisabled}>
          Сохранить
        </Button>
        <Button onClick={onOpenFile} disabled={isOpenFileDisabled}>
          Открыть во внешнем редакторе
        </Button>
      </div>
    </div>
  );
};

export default ContentDisplayHeader;
