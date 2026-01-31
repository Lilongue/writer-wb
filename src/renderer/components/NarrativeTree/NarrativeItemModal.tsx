import { FC } from 'react';
import { Modal, Input, Form } from 'antd';

export interface NarrativeModalState {
  open: boolean;
  type: 'create' | 'rename' | 'delete';
  node: any;
  name: string;
  title?: string;
  templateId?: number;
  templateName?: string;
}

interface NarrativeItemModalProps {
  modalState: NarrativeModalState;
  onOk: () => void;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onTitleChange: (title: string) => void;
  onPressEnter: () => void;
}

const NarrativeItemModal: FC<NarrativeItemModalProps> = ({
  modalState,
  onOk,
  onCancel,
  onNameChange,
  onTitleChange,
  onPressEnter,
}) => {
  const { type, open, name, title, templateName } = modalState;

  const getTitle = () => {
    if (type === 'create') {
      return `Создать: ${templateName || 'элемент'}`;
    }
    if (type === 'rename') {
      return 'Переименовать элемент';
    }
    return 'Удалить элемент';
  };

  return (
    <Modal
      title={getTitle()}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      closable={false}
      okText={
        {
          create: 'Создать',
          rename: 'Переименовать',
          delete: 'Удалить',
        }[type]
      }
      cancelText="Отменить"
      okButtonProps={{ danger: type === 'delete' }}
    >
      {type === 'delete' && (
        <p>
          Вы уверены, что хотите удалить &quot;{name}&quot;? Это действие нельзя
          будет отменить.
        </p>
      )}
      {type === 'rename' && (
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onPressEnter={onPressEnter}
          placeholder="Введите имя элемента"
        />
      )}
      {type === 'create' && (
        <Form layout="vertical">
          <Form.Item label="Название (для дерева)">
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onPressEnter={onPressEnter}
              placeholder="Введите имя для идентификации в дереве"
            />
          </Form.Item>
          <Form.Item label="Заголовок (для экспорта)">
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onPressEnter={onPressEnter}
              placeholder="Опциональный заголовок для рукописи"
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default NarrativeItemModal;
