import { useState, useEffect, useCallback, FC } from 'react';
import { Tag, Input, Button, Space } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
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
      style={{
        cursor: readOnly ? 'default' : 'pointer',
        minWidth: '70px',
        textAlign: 'center',
        fontSize: '12px',
      }}
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
  const [newItemText, setNewItemText] = useState<string>('');

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

  const handleAddItem = useCallback(() => {
    if (readOnly || !newItemText.trim()) return;
    const newItems = [
      ...items,
      { text: newItemText.trim(), status: CHECKLIST_STATUS.PLAN },
    ];
    setItems(newItems);
    setNewItemText('');
    triggerChange(newItems);
  }, [items, newItemText, readOnly, triggerChange]);

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
        <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="center">
          <StatusTag
            status={item.status}
            onClick={() => handleStatusChange(index)}
            readOnly={readOnly}
          />
          <Input
            value={item.text}
            onChange={(e) => handleTextChange(index, e.target.value)}
            disabled={readOnly}
            style={{ flexGrow: 1 }}
          />
          {!readOnly && (
            <Button
              type="text"
              danger
              icon={<MinusOutlined />}
              onClick={() => handleRemoveItem(index)}
            />
          )}
        </Space>
      ))}
      {!readOnly && (
        <Space style={{ display: 'flex', marginTop: 8 }}>
          <Input
            placeholder="Добавить новый пункт"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onPressEnter={handleAddItem}
            style={{ flexGrow: 1 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
          >
            Добавить
          </Button>
        </Space>
      )}
    </div>
  );
};

export default ChecklistEditor;
