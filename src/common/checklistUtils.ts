import { ChecklistItem } from './types';

// Regex to parse a markdown checklist item: '- [ ] Task text' or '- [x] Task text'
const CHECKLIST_ITEM_REGEX = /^- \[( |x)\] (.*)$/;

export const parseMarkdown = (markdown: string): ChecklistItem[] => {
  if (!markdown) return [];
  return markdown.split('\n').map((line) => {
    const match = line.match(CHECKLIST_ITEM_REGEX);
    if (match) {
      return {
        text: match[2],
        checked: match[1] === 'x',
      };
    }
    return { text: line, checked: false }; // Treat as plain text if not a checklist item
  });
};

export const serializeToMarkdown = (items: ChecklistItem[]): string => {
  return items
    .map((item) => {
      if (item.text.match(CHECKLIST_ITEM_REGEX)) {
        // If the text itself contains a checklist regex, just return it as is to avoid double parsing issues.
        // This is a simplification; a more robust solution might escape the text.
        return item.text;
      }
      const checkbox = item.checked ? '[x]' : '[ ]';
      return `- ${checkbox} ${item.text}`;
    })
    .join('\n');
};
