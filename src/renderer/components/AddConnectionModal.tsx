import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import notificationService from '../services/notificationService';

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
  const [isOkDisabled, setIsOkDisabled] = useState(true);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setIsOkDisabled(true);
    }
  }, [visible, form]);

  const handleValuesChange = (
    changedValues: any,
    allValues: { target: any },
  ) => {
    setIsOkDisabled(!allValues.target);
  };

  return (
    <Modal
      title="Добавить новую связь"
      open={visible}
      onCancel={onCancel}
      closable={false}
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            form.resetFields();
            onOk(values);
            return null;
          })
          .catch((info) => {
            const errorMessages = info.errorFields
              .map((field: any) => field.errors.join(', '))
              .join('; ');
            notificationService.showError(
              'Проверка не пройдена',
              errorMessages,
            );
          });
      }}
      okButtonProps={{ disabled: isOkDisabled }}
    >
      <Form
        form={form}
        layout="vertical"
        name="add_connection_form"
        onValuesChange={handleValuesChange}
      >
        <Form.Item name="description" label="Описание связи">
          <Input placeholder="Введите описание связи" />
        </Form.Item>
        <Form.Item name="target" label="Связать с">
          <Select
            showSearch
            placeholder="Начните вводить имя для поиска..."
            onSearch={onSearch}
            filterOption={false}
            defaultActiveFirstOption={false}
            suffixIcon={null}
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
