import React from 'react';
import { Input, Collapse } from 'antd';
import ChecklistEditor from '../../ChecklistEditor';

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
      <h3>План</h3>
      <Collapse
        activeKey={planCollapseKey}
        onChange={onPlanCollapseChange}
        ghost
      >
        <Collapse.Panel header="" key="1">
          <ChecklistEditor value={plan || ''} onChange={onPlanChange} />
        </Collapse.Panel>
      </Collapse>
    </>
  );
};

export default NarrativeDetails;
