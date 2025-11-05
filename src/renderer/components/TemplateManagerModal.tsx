/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  List,
  Checkbox,
  Input,
  Form,
  message,
  Space,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { EntityTemplate } from '../../common/types';

function TemplateManagerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<EntityTemplate[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editModalState, setEditModalState] = useState<{
    open: boolean;
    mode: 'create' | 'rename' | 'copy';
    template: Partial<EntityTemplate> | null;
  }>({ open: false, mode: 'create', template: null });

  const [form] = Form.useForm();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electron.ipcRenderer.invoke(
        'templates:getAll',
        includeArchived,
        'world',
      );
      setTemplates(result);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      message.error('Failed to load templates');
    }
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => {
    if (visible) {
      fetchTemplates();
    }
  }, [visible, includeArchived, fetchTemplates]);

  useEffect(() => {
    if (editModalState.open) {
      if (editModalState.mode === 'rename' && editModalState.template) {
        form.setFieldsValue({ name: editModalState.template.name });
      } else if (editModalState.mode === 'copy' && editModalState.template) {
        const fields = JSON.parse(
          editModalState.template.fields_schema || '[]',
        ).map((f: any) => f.label);
        form.setFieldsValue({
          name: `${editModalState.template.name} (копия)`,
          fields,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ name: '' });
      }
    }
  }, [editModalState, form]);

  const handleArchive = async (id: number) => {
    const result = await window.electron.ipcRenderer.invoke(
      'templates:archive',
      id,
    );
    if (result.success) {
      message.success('Template archived');
      fetchTemplates();
    } else {
      message.error(result.error);
    }
  };

  const handleEditModalOk = async () => {
    try {
      const values = await form.validateFields();
      const { mode, template } = editModalState;

      if (mode === 'create' || mode === 'copy') {
        await window.electron.ipcRenderer.invoke('templates:create', {
          name: values.name,
          category: 'world',
          fieldLabels: values.fields || [],
        });
        message.success(`Template ${values.name} created`);
      } else if (mode === 'rename' && template) {
        await window.electron.ipcRenderer.invoke('templates:rename', {
          id: template.id,
          newName: values.name,
        });
        message.success(`Template renamed to ${values.name}`);
      }

      setEditModalState({ open: false, mode: 'create', template: null });
      fetchTemplates();
      window.electron.ipcRenderer.sendMessage('world-objects-changed');
    } catch (errorInfo) {
      console.log('Failed:', errorInfo);
    }
  };

  const renderEditModalContent = () => {
    const { mode } = editModalState;
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

    return (
      <Form form={form} layout="vertical" name="form_in_modal">
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
        <Form.List name="fields">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name }) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 8 }}
                  align="baseline"
                >
                  <Form.Item
                    name={name}
                    rules={[{ required: true, message: 'Missing field label' }]}
                  >
                    <Input placeholder="Field Label" />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
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
      title="Template Manager"
      visible={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={800}
    >
      <Checkbox
        checked={includeArchived}
        onChange={(e) => setIncludeArchived(e.target.checked)}
      >
        Show Archived
      </Checkbox>
      <Button
        onClick={() =>
          setEditModalState({
            open: true,
            mode: 'create',
            template: { category: 'world' },
          })
        }
        style={{ marginLeft: 16 }}
      >
        Create New
      </Button>
      <List
        loading={loading}
        dataSource={templates}
        renderItem={(template) => (
          <List.Item
            actions={[
              <Button
                key="copy"
                onClick={() =>
                  setEditModalState({ open: true, mode: 'copy', template })
                }
              >
                Copy
              </Button>,
              <Button
                key="rename"
                onClick={() =>
                  setEditModalState({ open: true, mode: 'rename', template })
                }
              >
                Rename
              </Button>,
              !template.is_visible ? null : (
                <Button
                  key="archive"
                  danger
                  onClick={() => handleArchive(template.id)}
                >
                  Archive
                </Button>
              ),
            ]}
          >
            <List.Item.Meta
              title={`${template.name}${template.is_visible ? '' : ' (Archived)'}`}
              description={`Fields: ${
                JSON.parse(template.fields_schema || '[]')
                  .map((f: any) => f.label)
                  .join(', ') || 'None'
              }`}
            />
          </List.Item>
        )}
      />
      {/* Edit/Create Modal */}
      <Modal
        title={(() => {
          if (editModalState.mode === 'create') {
            return 'Create Template';
          }
          if (editModalState.mode === 'copy') {
            return 'Copy Template';
          }
          return 'Rename Template';
        })()}
        visible={editModalState.open}
        onCancel={() =>
          setEditModalState({ open: false, mode: 'create', template: null })
        }
        onOk={handleEditModalOk}
      >
        {renderEditModalContent()}
      </Modal>
    </Modal>
  );
}

export default TemplateManagerModal;
