// Этот файл содержит общие типы данных, используемые в приложении.

/**
 * Представление элемента повествования (часть, глава, сцена) в коде.
 */
export interface NarrativeItem {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  // file_path будет добавлен позже, когда мы будем работать с файлами
}

// В будущем здесь появятся другие доменные типы:
// export interface WorldObject { ... }
// export interface Connection { ... }
