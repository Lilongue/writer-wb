import { Descriptions, Form, Input, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { CustomField } from '../../../common/types';

interface ObjectPropertiesProps {
  fields: CustomField[];
  onFieldChange: (index: number, value: string) => void;
  mode?: 'view' | 'edit';
}

const ObjectProperties = ({
  fields,
  onFieldChange,
  mode = 'view',
}: ObjectPropertiesProps) => {
  if (!fields || fields.length === 0) {
    return null;
  }

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

  const renderedFields = fields.map(renderField);

  if (mode === 'edit') {
    return { renderedFields };
  }

  return (
    <>
      <h3>Дополнительные поля</h3>
      <div className="object-details-properties">
        <Descriptions bordered size="small" column={1} labelStyle={{ width: '30%' }}>
          {renderedFields}
        </Descriptions>
      </div>
      <br />
    </>
  );
};

export default ObjectProperties;
