import React, { useState } from 'react';
import { Modal, Input } from 'antd';

interface AddPlanItemModalProps {
  visible: boolean;
  onOk: (values: string[]) => void;
  onCancel: () => void;
}

const AddPlanItemModal: React.FC<AddPlanItemModalProps> = ({
  visible,
  onOk,
  onCancel,
}) => {
  const [value, setValue] = useState('');

  const handleOk = () => {
    const lines = value.split('\n').filter((line) => line.trim() !== '');
    if (lines.length > 0) {
      onOk(lines);
    }
    setValue(''); // Reset after submit
  };

  return (
    <Modal
      title="Добавить новый пункт плана"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Добавить"
      cancelText="Отмена"
    >
      <Input.TextArea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Введите текст пункта плана. Каждый новый абзац будет создан как отдельный элемент."
        onPressEnter={(e) => {
          if (e.ctrlKey || e.metaKey) {
            handleOk();
          }
        }}
      />
    </Modal>
  );
};

export default AddPlanItemModal;
