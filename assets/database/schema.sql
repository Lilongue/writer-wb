-- Схема для элементов повествования (части, главы, сцены)
CREATE TABLE narrative_elements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('part', 'chapter', 'scene')),
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    file_path TEXT, -- Может быть NULL для частей/глав, если они только контейнеры
    FOREIGN KEY (parent_id) REFERENCES narrative_elements(id) ON DELETE CASCADE
);

-- Схема для объектов мира (персонажи, локации, предметы)
CREATE TABLE world_objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('character', 'location', 'item', 'concept')),
    name TEXT NOT NULL,
    description TEXT
);

-- Схема для связей между элементами повествования и объектами мира
CREATE TABLE connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    narrative_element_id INTEGER NOT NULL,
    world_object_id INTEGER NOT NULL,
    FOREIGN KEY (narrative_element_id) REFERENCES narrative_elements(id) ON DELETE CASCADE,
    FOREIGN KEY (world_object_id) REFERENCES world_objects(id) ON DELETE CASCADE
);

-- Индексы для ускорения выборок
CREATE INDEX idx_narrative_parent ON narrative_elements(parent_id);
CREATE INDEX idx_connections_narrative ON connections(narrative_element_id);
CREATE INDEX idx_connections_world ON connections(world_object_id);

-- Начальные данные: корневой элемент для всего повествования
INSERT INTO narrative_elements (id, parent_id, type, title, sort_order) VALUES (1, NULL, 'part', 'Произведение', 0);