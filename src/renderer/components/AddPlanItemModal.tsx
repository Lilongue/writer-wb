import React, { useState } from 'react';
import { Modal, Input } from 'antd';

interface AddPlanItemModalProps {
  visible: boolean;
  onOk: (value: string) => void;
  onCancel: () => void;
}

const AddPlanItemModal: React.FC<AddPlanItemModalProps> = ({
  visible,
  onOk,
  onCancel,
}) => {
  const [value, setValue] = useState('');

  const handleOk = () => {
    onOk(value);
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
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Введите текст пункта плана"
        onPressEnter={handleOk}
      />
    </Modal>
  );
};

export default AddPlanItemModal;
