import { Modal, Input, Form } from 'antd';

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

  // Calculate if the name is empty or just whitespace
  const isNameEmpty = !name || name.trim() === '';

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
      closable={false}
      destroyOnHidden // Important to reset state if the form is not managed by antd's Form instance
      okText={
        {
          create: 'Создать',
          rename: 'Переименовать',
          delete: 'Удалить',
        }[type]
      }
      cancelText="Отменить"
      width={600}
      // Disable the OK button for 'create' type if the name is empty
      okButtonProps={{ disabled: type === 'create' && isNameEmpty }}
    >
      {type !== 'delete' ? (
        <Form.Item
          label="Имя объекта"
          htmlFor="world-object-modal-name"
          className="form-field-container"
        >
          <Input
            id="world-object-modal-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Введите имя объекта"
          />
        </Form.Item>
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
            </label>
            <Input
              id={`field-${field.name}`}
              value={fieldValues[field.name] || ''}
              onChange={(e) => onFieldValueChange(field.name, e.target.value)}
              placeholder={
                field.comment || `Введите ${field.label.toLowerCase()}`
              }
            />
          </div>
        ))}
    </Modal>
  );
};

export default WorldObjectModal;
