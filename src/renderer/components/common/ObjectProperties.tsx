import { Descriptions, Form, Input, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import React from 'react';
import { CustomField } from '../../../common/types';

interface ObjectPropertiesProps {
  fields: CustomField[];
  onFieldChange: (index: number, value: string) => void;
  mode?: 'view' | 'edit';
  name: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nameLabel: string;
}

const ObjectProperties = ({
  fields,
  onFieldChange,
  mode = 'view',
  name,
  onNameChange,
  nameLabel,
}: ObjectPropertiesProps) => {
  const renderField = (field: CustomField, index: number) => {
    const labelContent = (
      <span>
        {field.label}
        {field.comment && (
          <Tooltip title={field.comment}>
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#888' }} />
          </Tooltip>
        )}
      </span>
    );

    const inputElement = (
      <Input
        value={field.value}
        onChange={(e) => onFieldChange(index, e.target.value)}
        placeholder={field.label}
      />
    );

    if (mode === 'edit') {
      return (
        <Form.Item key={field.key} label={labelContent}>
          {inputElement}
        </Form.Item>
      );
    }

    return (
      <Descriptions.Item key={field.key} label={labelContent}>
        {inputElement}
      </Descriptions.Item>
    );
  };

  const renderedFields = fields ? fields.map(renderField) : null;

  if (mode === 'edit') {
    return (
      <Form layout="vertical">
        <Form.Item label={nameLabel}>
          <Input value={name} onChange={onNameChange} />
        </Form.Item>
        {renderedFields}
      </Form>
    );
  }

  return (
    <>
      <h3>Характеристики</h3>
      <div className="object-details-properties">
        <Descriptions
          bordered
          size="small"
          column={1}
          labelStyle={{ width: '30%' }}
        >
          <Descriptions.Item key="object-name" label={nameLabel}>
            <Input value={name} onChange={onNameChange} />
          </Descriptions.Item>
          {renderedFields}
        </Descriptions>
      </div>
      <br />
    </>
  );
};

export default ObjectProperties;
