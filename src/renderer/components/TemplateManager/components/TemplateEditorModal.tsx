import { FC, useEffect, useState } from 'react';
import { Modal, Button, Input, Form, message, Tooltip } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { EntityTemplate } from '../../../../common/types';
import '../../../App.css';

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
    } catch (errorInfo: any) {
      const errorMessages = errorInfo.errorFields
        .map((field: any) => field.errors.join(', '))
        .join('; ');
      message.error(`Проверка не пройдена: ${errorMessages}`);
    }
  };

  const handleValuesChange = (_: any, allValues: { name: string }) => {
    setIsOkDisabled(!allValues.name?.trim());
  };

  return (
    <Modal
      title={(() => {
        if (mode === 'create') return 'Создать шаблон';
        if (mode === 'copy') return 'Копировать шаблон';
        if (mode === 'edit')
          return `Редактировать шаблон: ${template?.name || ''}`;
        return 'Шаблон';
      })()}
      open={open}
      onCancel={onClose}
      closable={false}
      footer={[
        <Button key="back" onClick={onClose}>
          Отменить
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleOk}
          disabled={isOkDisabled}
        >
          Сохранить
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="form_in_modal"
        onValuesChange={handleValuesChange}
      >
        <Form.Item name="name" label="Название шаблона">
          <Input placeholder="Введите название шаблона" />
        </Form.Item>
        <Form.List name="fields">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} className="template-field-row">
                  <Form.Item
                    {...restField} // eslint-disable-line react/jsx-props-no-spreading
                    name={[name, 'label']}
                    rules={[
                      { required: true, message: 'Укажите название поля' },
                    ]}
                    className="template-field-item"
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Название поля" />
                  </Form.Item>
                  <Form.Item
                    {...restField} // eslint-disable-line react/jsx-props-no-spreading
                    name={[name, 'comment']}
                    className="template-field-item"
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Комментарий / подсказка" />
                  </Form.Item>
                  <Tooltip title="Удалить поле">
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Tooltip>
                </div>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add({ label: '', comment: '' })}
                  block
                  icon={<PlusOutlined />}
                >
                  Добавить поле
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
