/* eslint-disable no-console */
import { FC, useEffect } from 'react';
import { Modal, Button, Input, Form, Space, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { EntityTemplate } from '../../../../common/types';

export interface TemplateEditModalState {
  open: boolean;
  mode: 'create' | 'rename' | 'copy' | 'edit-fields';
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

  useEffect(() => {
    if (open) {
      form.resetFields(); // Reset form on every modal open

      if (mode === 'rename' && template) {
        form.setFieldsValue({ name: template.name });
      } else if (mode === 'copy' && template) {
        const schema = JSON.parse(template.fields_schema || '[]');
        form.setFieldsValue({
          name: `${template.name} (копия)`,
          fields: schema,
        });
      } else if (mode === 'edit-fields' && template) {
        const schema = JSON.parse(template.fields_schema || '[]');
        form.setFieldsValue({ fields: schema });
      } else {
        // 'create' mode
        form.setFieldsValue({ name: '', fields: [] });
      }
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

  const renderContent = () => {
    if (mode === 'rename') {
      return (
        <Form form={form} layout="vertical" name="form_in_modal">
          <Form.Item
            name="name"
            label="New Name"
            rules={[
              {
                required: true,
                message: 'Please input the new name of the template!',
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      );
    }

    // Unified UI for create, copy, and edit-fields
    return (
      <Form form={form} layout="vertical" name="form_in_modal">
        {mode !== 'edit-fields' && (
          <Form.Item
            name="name"
            label="Template Name"
            rules={[
              {
                required: true,
                message: 'Please input the name of the template!',
              },
            ]}
          >
            <Input />
          </Form.Item>
        )}
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
                  >
                    <Input placeholder="Field Label" />
                  </Form.Item>
                  <Form.Item
                    {...restField} // eslint-disable-line react/jsx-props-no-spreading
                    name={[name, 'comment']}
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
    );
  };

  return (
    <Modal
      title={(() => {
        if (mode === 'create') {
          return 'Create Template';
        }
        if (mode === 'copy') {
          return 'Copy Template';
        }
        if (mode === 'edit-fields') {
          return `Edit Fields for ${template?.name}`;
        }
        return 'Rename Template';
      })()}
      visible={open}
      onCancel={onClose}
      onOk={handleOk}
    >
      {renderContent()}
    </Modal>
  );
};

export default TemplateEditorModal;
