import React from 'react';
import { CustomField } from '../../../../common/types';
import ObjectProperties from '../../common/ObjectProperties';

interface WorldObjectDetailsProps {
  customFields: CustomField[];
  onFieldChange: (index: number, value: string) => void;
  name: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nameLabel: string;
}

const WorldObjectDetails: React.FC<WorldObjectDetailsProps> = ({
  customFields,
  onFieldChange,
  name,
  onNameChange,
  nameLabel,
}) => {
  return (
    <ObjectProperties
      fields={customFields}
      onFieldChange={onFieldChange}
      mode="view"
      name={name}
      onNameChange={onNameChange}
      nameLabel={nameLabel}
    />
  );
};

export default WorldObjectDetails;
