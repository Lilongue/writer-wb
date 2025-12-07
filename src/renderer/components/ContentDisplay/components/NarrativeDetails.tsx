import React from 'react';
import { Input } from 'antd';
import ChecklistEditor from '../../ChecklistEditor';

interface NarrativeDetailsProps {
  description: string | undefined;
  plan: string | undefined;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onPlanChange: (value: string) => void;
}

const NarrativeDetails: React.FC<NarrativeDetailsProps> = ({
  description,
  plan,
  onDescriptionChange,
  onPlanChange,
}) => {
  return (
    <>
      <h3>Основная мысль</h3>
      <Input.TextArea
        value={description}
        onChange={onDescriptionChange}
        autoSize={{ minRows: 3, maxRows: 10 }}
        style={{ marginBottom: 16 }}
      />
      <h3>План</h3>
      <ChecklistEditor value={plan || ''} onChange={onPlanChange} />
      <br />
    </>
  );
};

export default NarrativeDetails;
