import React, { useState } from 'react';
import { Input, Collapse, Button, Space, Tooltip, Descriptions } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import ChecklistEditor from '../../ChecklistEditor';
import AddPlanItemModal from '../../AddPlanItemModal';

interface NarrativeDetailsProps {
  name: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  title: string | undefined;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nameLabel: string;
  description: string | undefined;
  plan: string | undefined;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onPlanChange: (value: string) => void;
  planCollapseKey: string | string[] | undefined;
  onPlanCollapseChange: (key: string | string[]) => void;
}

const NarrativeDetails: React.FC<NarrativeDetailsProps> = ({
  name,
  onNameChange,
  title,
  onTitleChange,
  nameLabel,
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
      <div className="object-details-properties">
        <Descriptions
          bordered
          size="small"
          column={1}
          labelStyle={{ width: '30%' }}
        >
          <Descriptions.Item key="narrative-name" label={nameLabel}>
            <Input value={name} onChange={onNameChange} />
          </Descriptions.Item>
          <Descriptions.Item
            key="narrative-title"
            label="Заголовок (для экспорта)"
          >
            <Input value={title} onChange={onTitleChange} />
          </Descriptions.Item>
          <Descriptions.Item
            key="narrative-description"
            label="Основная мысль (синопсис)"
          >
            <Input.TextArea
              value={description}
              onChange={onDescriptionChange}
              autoSize={{ minRows: 1, maxRows: 5 }}
              placeholder="Напишите здесь максимально кратко - в одном предложении - ради чего существует эта часть"
            />
          </Descriptions.Item>
        </Descriptions>
      </div>
      <br />

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
