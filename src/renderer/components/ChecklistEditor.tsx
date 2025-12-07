import React, { useState, useEffect, useCallback } from 'react';
import { Checkbox, Input, Button, Space } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import {
  parseMarkdown,
  serializeToMarkdown,
} from '../../common/checklistUtils';
import { ChecklistItem } from '../../common/types';

interface ChecklistEditorProps {
  value: string; // The markdown string
  onChange: (newValue: string) => void;
  readOnly?: boolean;
}

const ChecklistEditor: React.FC<ChecklistEditorProps> = ({
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

  const handleCheckChange = useCallback(
    (index: number, checked: boolean) => {
      if (readOnly) return;
      const newItems = [...items];
      newItems[index].checked = checked;
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
    const newItems = [...items, { text: newItemText.trim(), checked: false }];
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
        <Space key={index} style={{ display: 'flex', marginBottom: 8 }}>
          <Checkbox
            checked={item.checked}
            onChange={(e) => handleCheckChange(index, e.target.checked)}
            disabled={readOnly}
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
