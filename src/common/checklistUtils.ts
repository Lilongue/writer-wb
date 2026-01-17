import { ChecklistItem, CHECKLIST_STATUS, ChecklistStatus } from './types';

// Regex to parse a markdown checklist item: '- [ ] Task text', '- [x] Task text', or '- [/] Task text'
const CHECKLIST_ITEM_REGEX = /^- \[( |x|\/)\] (.*)$/;

const getStatusFromChar = (char: string): ChecklistStatus => {
  switch (char) {
    case 'x':
      return CHECKLIST_STATUS.DONE;
    case '/':
      return CHECKLIST_STATUS.IN_PROGRESS;
    case ' ':
    default:
      return CHECKLIST_STATUS.PLAN;
  }
};

const getCharFromStatus = (status: ChecklistStatus): string => {
  switch (status) {
    case CHECKLIST_STATUS.DONE:
      return 'x';
    case CHECKLIST_STATUS.IN_PROGRESS:
      return '/';
    case CHECKLIST_STATUS.PLAN:
    default:
      return ' ';
  }
};

export const parseMarkdown = (markdown: string): ChecklistItem[] => {
  if (!markdown) return [];
  return markdown.split('\n').map((line) => {
    const match = line.match(CHECKLIST_ITEM_REGEX);
    if (match) {
      return {
        text: match[2],
        status: getStatusFromChar(match[1]),
      };
    }
    // Treat as plain text if not a checklist item, defaulting to 'plan' status
    // This allows users to mix checklist items and plain text lines.
    return { text: line, status: CHECKLIST_STATUS.PLAN };
  });
};

export const serializeToMarkdown = (items: ChecklistItem[]): string => {
  if (!items) return '';
  return items
    .map((item) => {
      // When serializing, we format every item according to its status.
      // We assume that item.text does not contain markdown formatting itself.
      const char = getCharFromStatus(item.status);
      return `- [${char}] ${item.text}`;
    })
    .join('\n');
};
