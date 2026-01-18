import React, { useState } from 'react';
import { Input, Collapse, Button, Space, Tooltip } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import ChecklistEditor from '../../ChecklistEditor';
import AddPlanItemModal from '../../AddPlanItemModal'; // Import the new modal

interface NarrativeDetailsProps {
  description: string | undefined;
  plan: string | undefined;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onPlanChange: (value: string) => void;
  planCollapseKey: string | string[] | undefined;
  onPlanCollapseChange: (key: string | string[]) => void;
}

const NarrativeDetails: React.FC<NarrativeDetailsProps> = ({
  description,
  plan,
  onDescriptionChange,
  onPlanChange,
  planCollapseKey,
  onPlanCollapseChange,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const planItemsCount = plan ? plan.split('\n').filter(Boolean).length : 0;
  const panelHeader = `Пунктов в плане: ${planItemsCount}`;

  const handleAddPlanItem = (newItem: string) => {
    if (newItem.trim() !== '') {
      const newPlan = `${plan || ''}\n- [ ] ${newItem.trim()}`;
      onPlanChange(newPlan.trim());
    }
    setIsModalVisible(false);
  };

  return (
    <>
      <h3>Основная мысль (синопсис)</h3>
      <Input.TextArea
        value={description}
        onChange={onDescriptionChange}
        autoSize={{ minRows: 1, maxRows: 5 }}
        style={{ marginBottom: 16 }}
        placeholder="Напишите здесь максимально кратко - в одном предложении - ради чего существует эта часть"
      />
      <div>
        <Space>
          <h3>План</h3>
          <Tooltip title="Добавить новый пункт плана">
            <Button
              type="text"
              shape="circle"
              icon={<PlusCircleOutlined />}
              onClick={() => setIsModalVisible(true)}
            />
          </Tooltip>
        </Space>
      </div>
      {planItemsCount > 0 && (
        <Collapse
          activeKey={planCollapseKey}
          onChange={onPlanCollapseChange}
          ghost
        >
          <Collapse.Panel header={panelHeader} key="1">
            <ChecklistEditor value={plan || ''} onChange={onPlanChange} />
          </Collapse.Panel>
        </Collapse>
      )}
      <AddPlanItemModal
        visible={isModalVisible}
        onOk={handleAddPlanItem}
        onCancel={() => setIsModalVisible(false)}
      />
    </>
  );
};

export default NarrativeDetails;
