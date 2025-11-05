-- Таблица шаблонов для типов сущностей
CREATE TABLE entity_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- 'narrative' или 'world'
    fields_schema TEXT, -- JSON-схема полей (только для 'world')
    is_visible BOOLEAN NOT NULL DEFAULT 1
);

-- Таблица для элементов повествования (жесткая структура)
CREATE TABLE narrative_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    parent_id INTEGER,   -- Ссылается на narrative_items.id
    name TEXT NOT NULL,
    description TEXT,
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

-- Начальные данные: предустановленные шаблоны
INSERT INTO entity_templates (name, category, fields_schema) VALUES ('part', 'narrative', '[]');
INSERT INTO entity_templates (name, category, fields_schema) VALUES ('chapter', 'narrative', '[]');
INSERT INTO entity_templates (name, category, fields_schema) VALUES ('scene', 'narrative', '[]');

INSERT INTO entity_templates (name, category, fields_schema) VALUES ('character', 'world', '[{"name": "race", "label": "Раса"}, {"name": "age", "label": "Возраст"}]');
INSERT INTO entity_templates (name, category, fields_schema) VALUES ('location', 'world', '[{"name": "population", "label": "Население"}]');
INSERT INTO entity_templates (name, category, fields_schema) VALUES ('item', 'world', '[]');
INSERT INTO entity_templates (name, category, fields_schema) VALUES ('concept', 'world', '[]');

-- Начальные данные: корневой элемент для всего повествования.
-- 1. Создаем сам элемент повествования
INSERT INTO narrative_items (template_id, parent_id, name, sort_order) VALUES ((SELECT id FROM entity_templates WHERE name = 'part'), NULL, 'Произведение', 0);
-- 2. Создаем для него запись в прокси-таблице
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());