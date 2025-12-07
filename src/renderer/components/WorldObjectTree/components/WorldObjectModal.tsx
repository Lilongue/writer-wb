import React from 'react';
import { Modal, Input, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

// A copy of the state slice from the original component
export interface ModalState {
  open: boolean;
  type: 'create' | 'rename' | 'delete';
  node: any;
  name: string;
  schema: any[] | null;
  fieldValues: Record<string, string>;
}

interface WorldObjectModalProps {
  modalState: ModalState;
  onOk: () => void;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onFieldValueChange: (fieldName: string, value: string) => void;
}

const WorldObjectModal = ({
  modalState,
  onOk,
  onCancel,
  onNameChange,
  onFieldValueChange,
}: WorldObjectModalProps) => {
  const { type, open, name, schema, fieldValues, node } = modalState;

  return (
    <Modal
      title={
        {
          create: 'Создать объект',
          rename: 'Переименовать объект',
          delete: 'Удалить объект',
        }[type]
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      destroyOnClose // Important to reset state if the form is not managed by antd's Form instance
      okText={
        {
          create: 'Создать',
          rename: 'Переименовать',
          delete: 'Удалить',
        }[type]
      }
      cancelText="Отмена"
      width={600}
    >
      {type !== 'delete' ? (
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Имя объекта"
          className="modal-input-margin-bottom"
        />
      ) : (
        <div className="modal-input-margin-bottom">
          Вы уверены, что хотите удалить &quot;{node?.title}&quot;? Это действие
          нельзя будет отменить.
        </div>
      )}
      {type === 'create' &&
        schema?.map((field) => (
          <div key={field.name} className="form-field-container">
            <label htmlFor={`field-${field.name}`} className="form-field-label">
              {field.label}
              {field.comment && (
                <Tooltip title={field.comment}>
                  <InfoCircleOutlined
                    style={{ marginLeft: 4, color: '#888' }}
                  />
                </Tooltip>
              )}
            </label>
            <Input
              id={`field-${field.name}`}
              value={fieldValues[field.name] || ''}
              onChange={(e) => onFieldValueChange(field.name, e.target.value)}
              placeholder={`Введите ${field.label.toLowerCase()}`}
            />
          </div>
        ))}
    </Modal>
  );
};

export default WorldObjectModal;
