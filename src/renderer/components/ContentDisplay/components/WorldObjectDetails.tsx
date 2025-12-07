import React from 'react';
import { Descriptions, Input, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { CustomField } from '../../../../common/types';

interface WorldObjectDetailsProps {
  customFields: CustomField[];
  onFieldChange: (index: number, value: string) => void;
}

const WorldObjectDetails: React.FC<WorldObjectDetailsProps> = ({
  customFields,
  onFieldChange,
}) => {
  if (!customFields || customFields.length === 0) {
    return null;
  }

  return (
    <>
      <h3>Дополнительные поля</h3>
      <Descriptions bordered size="small" column={1}>
        {customFields.map((field, index) => (
          <Descriptions.Item
            key={field.key}
            label={
              <span>
                {field.label}
                {field.comment && (
                  <Tooltip title={field.comment}>
                    <InfoCircleOutlined
                      style={{ marginLeft: 4, color: '#888' }}
                    />
                  </Tooltip>
                )}
              </span>
            }
          >
            <Input
              value={field.value}
              onChange={(e) => onFieldChange(index, e.target.value)}
              disabled={false}
            />
          </Descriptions.Item>
        ))}
      </Descriptions>
      <br />
    </>
  );
};

export default WorldObjectDetails;
