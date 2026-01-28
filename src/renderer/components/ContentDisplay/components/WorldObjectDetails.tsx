import React from 'react';
import { CustomField } from '../../../../common/types';
import ObjectProperties from '../../common/ObjectProperties';

interface WorldObjectDetailsProps {
  customFields: CustomField[];
  onFieldChange: (index: number, value: string) => void;
}

const WorldObjectDetails: React.FC<WorldObjectDetailsProps> = ({
  customFields,
  onFieldChange,
}) => {
  return (
    <ObjectProperties
      fields={customFields}
      onFieldChange={onFieldChange}
      mode="view"
    />
  );
};

export default WorldObjectDetails;
