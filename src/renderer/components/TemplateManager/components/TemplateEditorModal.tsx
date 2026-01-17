/* eslint-disable no-console */
import { FC, useEffect, useState } from 'react';
import { Modal, Button, Input, Form, Space, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { EntityTemplate } from '../../../../common/types';

export interface TemplateEditModalState {
  open: boolean;
  mode: 'create' | 'copy' | 'edit';
  template: Partial<EntityTemplate> | null;
}

interface TemplateEditorModalProps {
  editModalState: TemplateEditModalState;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
}

const TemplateEditorModal: FC<TemplateEditorModalProps> = ({
  editModalState,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm();
  const { open, mode, template } = editModalState;
  const [isOkDisabled, setIsOkDisabled] = useState(true);

  useEffect(() => {
    if (open) {
      form.resetFields();
      let initialName = '';

      if (mode === 'copy' && template) {
        const schema = JSON.parse(template.fields_schema || '[]');
        initialName = `${template.name} (копия)`;
        form.setFieldsValue({
          name: initialName,
          fields: schema,
        });
      } else if (mode === 'edit' && template) {
        const schema = JSON.parse(template.fields_schema || '[]');
        initialName = template.name || '';
        form.setFieldsValue({ name: initialName, fields: schema });
      } else {
        form.setFieldsValue({ name: '', fields: [] });
      }

      setIsOkDisabled(!initialName);
    }
  }, [editModalState, form, open, mode, template]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
      onClose();
    } catch (errorInfo) {
      console.log('Failed:', errorInfo);
      message.error('Validation failed');
    }
  };

  const handleValuesChange = (_: any, allValues: { name: string }) => {
    setIsOkDisabled(!allValues.name?.trim());
  };

  return (
    <Modal
      title={(() => {
        if (mode === 'create') return 'Create Template';
        if (mode === 'copy') return 'Copy Template';
        if (mode === 'edit') return `Edit Template: ${template?.name || ''}`;
        return 'Template';
      })()}
      open={open}
      onCancel={onClose}
      closable={false}
      footer={[
        <Button key="back" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleOk}
          disabled={isOkDisabled}
        >
          OK
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="form_in_modal"
        onValuesChange={handleValuesChange}
      >
        <Form.Item name="name" label="Template Name">
          <Input placeholder="Enter Template Name" />
        </Form.Item>
        <Form.List name="fields">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 8 }}
                  align="baseline"
                >
                  <Form.Item
                    {...restField} // eslint-disable-line react/jsx-props-no-spreading
                    name={[name, 'label']}
                    rules={[{ required: true, message: 'Missing field label' }]}
                    style={{ flexGrow: 1 }}
                  >
                    <Input placeholder="Field Label" />
                  </Form.Item>
                  <Form.Item
                    {...restField} // eslint-disable-line react/jsx-props-no-spreading
                    name={[name, 'comment']}
                    style={{ flexGrow: 1 }}
                  >
                    <Input placeholder="Comment / Hint" />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add({ label: '', comment: '' })}
                  block
                  icon={<PlusOutlined />}
                >
                  Add field
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default TemplateEditorModal;
