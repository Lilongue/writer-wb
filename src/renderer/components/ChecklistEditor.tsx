import { useState, useEffect, useCallback, FC } from 'react';
import { Tag, Input, Button, Tooltip } from 'antd';
import { MinusCircleOutlined } from '@ant-design/icons';
import {
  parseMarkdown,
  serializeToMarkdown,
} from '../../common/checklistUtils';
import {
  ChecklistItem,
  ChecklistStatus,
  CHECKLIST_STATUS,
} from '../../common/types';

interface ChecklistEditorProps {
  value: string; // The markdown string
  onChange: (newValue: string) => void;
  readOnly?: boolean;
}

const statusConfig: Record<
  ChecklistStatus,
  { color: string; text: string; next: ChecklistStatus }
> = {
  [CHECKLIST_STATUS.PLAN]: {
    color: 'default',
    text: 'План',
    next: CHECKLIST_STATUS.IN_PROGRESS,
  },
  [CHECKLIST_STATUS.IN_PROGRESS]: {
    color: 'blue',
    text: 'В работе',
    next: CHECKLIST_STATUS.DONE,
  },
  [CHECKLIST_STATUS.DONE]: {
    color: 'green',
    text: 'Сделано',
    next: CHECKLIST_STATUS.PLAN,
  },
};

const StatusTag: FC<{
  status: ChecklistStatus;
  onClick: () => void;
  readOnly?: boolean;
}> = ({ status, onClick, readOnly }) => {
  const { color, text } = statusConfig[status];
  return (
    <Tag
      color={color}
      onClick={!readOnly ? onClick : undefined}
      className={`checklist-status-tag ${readOnly ? 'checklist-status-tag-readonly' : 'checklist-status-tag-interactive'}`}
    >
      {text}
    </Tag>
  );
};

const ChecklistEditor: FC<ChecklistEditorProps> = ({
  value,
  onChange,
  readOnly = false,
}) => {
  const [items, setItems] = useState<ChecklistItem[]>(() =>
    parseMarkdown(value),
  );

  useEffect(() => {
    // Update internal state if the external value prop changes
    setItems(parseMarkdown(value));
  }, [value]);

  const triggerChange = useCallback(
    (newItems: ChecklistItem[]) => {
      onChange(serializeToMarkdown(newItems));
    },
    [onChange],
  );

  const handleStatusChange = useCallback(
    (index: number) => {
      if (readOnly) return;
      const newItems = [...items];
      const currentStatus = newItems[index].status;
      newItems[index].status = statusConfig[currentStatus].next;
      setItems(newItems);
      triggerChange(newItems);
    },
    [items, readOnly, triggerChange],
  );

  const handleTextChange = useCallback(
    (index: number, text: string) => {
      if (readOnly) return;
      const newItems = [...items];
      newItems[index].text = text;
      setItems(newItems);
      triggerChange(newItems);
    },
    [items, readOnly, triggerChange],
  );

  const handleRemoveItem = useCallback(
    (index: number) => {
      if (readOnly) return;
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      triggerChange(newItems);
    },
    [items, readOnly, triggerChange],
  );

  return (
    <div>
      {items.map((item, index) => (
        <div key={index} className="checklist-item-row">
          <StatusTag
            status={item.status}
            onClick={() => handleStatusChange(index)}
            readOnly={readOnly}
          />
          <Input
            value={item.text}
            onChange={(e) => handleTextChange(index, e.target.value)}
            disabled={readOnly}
            className="checklist-item-input"
          />
          {!readOnly && (
            <Tooltip title="Удалить">
              <Button
                type="text"
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => handleRemoveItem(index)}
              />
            </Tooltip>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChecklistEditor;
