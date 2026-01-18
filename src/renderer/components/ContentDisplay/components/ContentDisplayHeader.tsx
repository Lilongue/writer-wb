import React from 'react';
import { Input } from 'antd';

interface ContentDisplayHeaderProps {
  name: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedType?: 'narrative' | 'world' | null;
}

const ContentDisplayHeader: React.FC<ContentDisplayHeaderProps> = ({
  name,
  onNameChange,
  selectedType,
}) => {
  const labelPrefix =
    selectedType === 'narrative' ? 'Название:' : 'Имя объекта:';

  return (
    <div className="content-display-title-wrapper">
      <div className="content-display-name-input-group">
        {labelPrefix && (
          <label
            htmlFor={`content-display-name-input-${selectedType}`}
            className="content-display-name-label"
          >
            {labelPrefix}
          </label>
        )}
        <Input
          id={`content-display-name-input-${selectedType}`}
          value={name}
          onChange={onNameChange}
          disabled={false}
          className="content-display-name-input"
        />
      </div>
    </div>
  );
};

export default ContentDisplayHeader;
