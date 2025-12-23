CREATE TABLE entity_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- 'narrative' или 'world'
    fields_schema TEXT, -- JSON-схема полей (только для 'world')
    is_visible BOOLEAN NOT NULL DEFAULT 1,
    weight INTEGER NOT NULL DEFAULT 0
);

-- Таблица для элементов повествования (жесткая структура)
CREATE TABLE narrative_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    parent_id INTEGER,   -- Ссылается на narrative_items.id
    name TEXT NOT NULL,
    description TEXT,
    plan TEXT,
    file_path TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (template_id) REFERENCES entity_templates(id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_id) REFERENCES narrative_items(id) ON DELETE CASCADE
);

-- Таблица для объектов мира (гибкая структура)
CREATE TABLE world_objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    properties TEXT,     -- JSON-объект со значениями полей из шаблона
    FOREIGN KEY (template_id) REFERENCES entity_templates(id) ON DELETE RESTRICT
);

-- Прокси-таблица ("супертип") для обеспечения глобальных связей
CREATE TABLE all_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    narrative_id INTEGER UNIQUE,
    world_object_id INTEGER UNIQUE,
    FOREIGN KEY (narrative_id) REFERENCES narrative_items(id) ON DELETE CASCADE,
    FOREIGN KEY (world_object_id) REFERENCES world_objects(id) ON DELETE CASCADE,
    CHECK (narrative_id IS NOT NULL AND world_object_id IS NULL OR narrative_id IS NULL AND world_object_id IS NOT NULL)
);

-- Таблица связей
CREATE TABLE connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    description TEXT,
    FOREIGN KEY (source_id) REFERENCES all_entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES all_entities(id) ON DELETE CASCADE
);

-- Индексы для ускорения выборок
CREATE INDEX idx_narrative_template_id ON narrative_items(template_id);
CREATE INDEX idx_narrative_parent_id ON narrative_items(parent_id);
CREATE INDEX idx_world_template_id ON world_objects(template_id);
CREATE INDEX idx_connections_source_id ON connections(source_id);
CREATE INDEX idx_connections_target_id ON connections(target_id);


CREATE TABLE IF NOT EXISTS project_settings (
    key         TEXT PRIMARY KEY, -- Уникальный ключ настройки (например, 'ui.window.width')
    value       TEXT,             -- Значение настройки
    name        TEXT NOT NULL,    -- Человекочитаемое имя (например, 'Ширина окна')
    description TEXT,             -- Описание, поясняющее назначение настройки
    category    TEXT NOT NULL,    -- Категория для группировки в UI (например, 'Интерфейс')
    type        TEXT NOT NULL DEFAULT 'text' -- Тип для рендеринга в UI ('text', 'boolean', 'number')
);

-- Начальные данные для настроек проекта
INSERT INTO project_settings (key, value, name, description, category, type) VALUES
('project.author', 'Автор', 'Автор проекта', 'Имя автора, которое может использоваться при экспорте.', 'Общие', 'text'),
('project.name', 'Мой проект', 'Название проекта', 'Общее название проекта или произведения.', 'Общие', 'text'),
('project.location', '', 'Место расположения проекта', 'Путь к корневой папке проекта. Только для чтения.', 'Общие', 'text'),
('ui.theme', 'light', 'Тема интерфейса', 'На данный момент не используется, задел на будущее.', 'Интерфейс', 'text'),
('editor.mdPath', '', 'Редактор Markdown', 'Путь к внешнему редактору для файлов Markdown.', 'Редакторы', 'text'),
('app.version', '1.0.0', 'Версия ПО', 'Текущая версия приложения.', 'Приложение', 'text'),
('export.format', 'markdown', 'Формат экспорта', 'Формат файла при экспорте контента.', 'Экспорт', 'text');
