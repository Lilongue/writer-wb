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
}

// export interface Connection { ... }
