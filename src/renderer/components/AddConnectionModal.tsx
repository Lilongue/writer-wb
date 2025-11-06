/* eslint-disable no-console */
import React from 'react';
import { Modal, Form, Input, Select } from 'antd';

interface AddConnectionModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
  onSearch: (query: string) => void;
  options: any[];
}

function AddConnectionModal({
  visible,
  onCancel,
  onOk,
  onSearch,
  options,
}: AddConnectionModalProps) {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Добавить новую связь"
      visible={visible}
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            form.resetFields();
            onOk(values);
            return null;
          })
          .catch((info) => {
            console.log('Validate Failed:', info);
          });
      }}
    >
      <Form form={form} layout="vertical" name="add_connection_form">
        <Form.Item name="description" label="Описание связи">
          <Input />
        </Form.Item>
        <Form.Item
          name="target"
          label="Связать с"
          rules={[
            {
              required: true,
              message: 'Пожалуйста, выберите объект для связи!',
            },
          ]}
        >
          <Select
            showSearch
            placeholder="Начните вводить имя для поиска..."
            onSearch={onSearch}
            filterOption={false}
            defaultActiveFirstOption={false}
          >
            {options.map((item) => (
              <Select.Option key={item.value} value={item.value}>
                {item.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default AddConnectionModal;
