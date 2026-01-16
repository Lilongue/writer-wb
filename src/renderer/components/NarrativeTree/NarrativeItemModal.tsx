import { FC } from 'react';
import { Modal, Input } from 'antd';

export interface NarrativeModalState {
  open: boolean;
  type: 'create' | 'rename' | 'delete';
  node: any;
  name: string;
  templateId?: number;
  templateName?: string;
}

interface NarrativeItemModalProps {
  modalState: NarrativeModalState;
  onOk: () => void;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onPressEnter: () => void;
}

const NarrativeItemModal: FC<NarrativeItemModalProps> = ({
  modalState,
  onOk,
  onCancel,
  onNameChange,
  onPressEnter,
}) => {
  const { type, open, name, templateName } = modalState;

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
      cancelText="Отмена"
      okButtonProps={{ danger: type === 'delete' }}
    >
      {type === 'delete' ? (
        <p>
          Вы уверены, что хотите удалить &quot;{name}&quot;? Это действие нельзя
          будет отменить.
        </p>
      ) : (
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onPressEnter={onPressEnter}
        />
      )}
    </Modal>
  );
};

export default NarrativeItemModal;
