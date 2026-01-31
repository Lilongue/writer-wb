// Этот файл содержит общие типы данных, используемые в приложении.

/**
 * Представление элемента повествования (часть, глава, сцена) в коде.
 */
export interface NarrativeItem {
  id: number;
  name: string;
  title?: string;
  template_id: number;
  parent_id: number | null;
  sort_order: number;
  file_path?: string;
  description?: string;
  plan?: string;
}

export interface RawConnection {
  id: number;
  description: string;
  source_id: number;
  target_id: number;
}

export interface ResolvedEntity {
  allEntityId: number;
  id: number;
  type: 'narrative' | 'world';
}

// В будущем здесь появятся другие доменные типы:
export interface WorldObjectType {
  id: number;
  name: string;
}

export interface WorldObject {
  id: number;
  name: string;
  template_id: number;
  properties?: string;
  description?: string;
}

export interface EntityTemplate {
  id: number;
  name: string;
  category: 'narrative' | 'world';
  fields_schema: string; // JSON-схема полей
  is_visible: 0 | 1;
  weight: number;
}

export interface CustomField {
  key: string;
  label: string;
  value: string;
  comment?: string;
}

export interface ItemDetails {
  id: number;
  name: string;
  title?: string;
  path: string | null;
  content: string | null;
  description?: string;
  fileExists: boolean;
  customFields?: CustomField[];
  mtime: number | null;
  connections?: any[];
  plan?: string;
}

export const CHECKLIST_STATUS = {
  PLAN: 'plan',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
} as const;

export type ChecklistStatus =
  (typeof CHECKLIST_STATUS)[keyof typeof CHECKLIST_STATUS];

export interface ChecklistItem {
  text: string;
  status: ChecklistStatus;
}

export interface ProjectSetting {
  key: string;
  value: any; // The actual value can be string, number, boolean, etc.
  name: string;
  description?: string;
  category: string;
  type: 'text' | 'boolean' | 'number';
}

// export interface Connection { ... }

/**
 * Тип для предустановленных шаблонов мира из JSON.
 * Не является сущностью БД.
 */
export type PredefinedWorldTemplate = {
  name: string;
  category: 'world';
  fields: {
    name: string; // системное имя
    label: string; // имя для юзера
    comment?: string;
  }[];
};

/**
 * Тип для предустановленных шаблонов повествования из JSON, включая вес.
 * Не является сущностью БД.
 */
export type PredefinedNarrativeTemplate = {
  name: string;
  label: string;
  category: 'narrative';
  weight: number;
  fields: {
    name: string;
    label: string;
    comment?: string;
  }[];
};

/**
 * Объединенный тип для всех предустановленных шаблонов.
 */
export type PredefinedTemplate =
  | PredefinedWorldTemplate
  | PredefinedNarrativeTemplate;

/**
 * Описывает структуру файла `predefined-templates.json`.
 */
export type PredefinedTemplatesFile = {
  world_templates: PredefinedWorldTemplate[];
  narrative_templates: PredefinedNarrativeTemplate[];
};
