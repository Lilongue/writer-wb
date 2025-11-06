// Этот файл содержит общие типы данных, используемые в приложении.

/**
 * Представление элемента повествования (часть, глава, сцена) в коде.
 */
export interface NarrativeItem {
  id: number;
  name: string;
  type: string; // part, chapter, scene, etc.
  parent_id: number | null;
  sort_order: number;
  file_path?: string;
  description?: string;
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
}

export interface CustomField {
  key: string;
  label: string;
  value: string;
}

export interface ItemDetails {
  id: number;
  name: string;
  path: string | null;
  content: string | null;
  fileExists: boolean;
  customFields?: CustomField[];
  mtime: number | null;
  connections?: any[];
}

// export interface Connection { ... }
