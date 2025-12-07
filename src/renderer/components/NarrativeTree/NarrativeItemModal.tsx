import React from 'react';
import { Modal, Input } from 'antd';

export interface NarrativeModalState {
  open: boolean;
  type: 'create' | 'rename' | 'delete';
  node: any;
  name: string;
}

interface NarrativeItemModalProps {
  modalState: NarrativeModalState;
  onOk: () => void;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onPressEnter: () => void;
}

const NarrativeItemModal: React.FC<NarrativeItemModalProps> = ({
  modalState,
  onOk,
  onCancel,
  onNameChange,
  onPressEnter,
}) => {
  const { type, open, name } = modalState;

  return (
    <Modal
      title={
        {
          create: 'Создать элемент',
          rename: 'Переименовать элемент',
          delete: 'Удалить элемент',
        }[type]
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
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
          Вы уверены, что хотите удалить &quot;{name}&quot;? Это действие
          нельзя будет отменить.
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
