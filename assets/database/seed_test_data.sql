-- ================= TEST DATA SEED =================
-- Этот скрипт можно выполнить на уже существующей базе данных проекта,
-- чтобы наполнить ее тестовыми данными для проверки.

-- Примечание: Скрипт предполагает, что он выполняется на свежей базе,
-- где в таблице all_entities есть только одна запись (корневой элемент 'Произведение') с id=1.

-- ID родительских элементов (в таблице all_entities):
-- 1: 'Произведение' (корневой элемент)

-- Часть 1 (станет all_entities.id = 2)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order) VALUES ((SELECT id FROM entity_templates WHERE name = 'part'), 1, 'Часть 1: Начало', 0);
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Глава 1 (станет all_entities.id = 3)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order) VALUES ((SELECT id FROM entity_templates WHERE name = 'chapter'), 2, 'Глава 1: Утро', 0);
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Глава 2 (станет all_entities.id = 4)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order) VALUES ((SELECT id FROM entity_templates WHERE name = 'chapter'), 2, 'Глава 2: Полдень', 1);
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Сцена 1 внутри Главы 2 (станет all_entities.id = 5)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order) VALUES ((SELECT id FROM entity_templates WHERE name = 'scene'), 4, 'Сцена 1: Разговор', 0);
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Часть 2 (станет all_entities.id = 6)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order) VALUES ((SELECT id FROM entity_templates WHERE name = 'part'), 1, 'Часть 2: Развитие', 1);
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Глава 3 внутри Части 2 (станет all_entities.id = 7)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order) VALUES ((SELECT id FROM entity_templates WHERE name = 'chapter'), 6, 'Глава 3: Вечер', 0);
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- =================== WORLD OBJECTS ===================

-- Персонажи
INSERT INTO world_objects (template_id, name, description) VALUES ((SELECT id FROM entity_templates WHERE name = 'character'), 'Арагорн', 'Наследник Исилдура');
INSERT INTO world_objects (template_id, name, description) VALUES ((SELECT id FROM entity_templates WHERE name = 'character'), 'Гэндальф', 'Истари, мудрец и волшебник');
INSERT INTO world_objects (template_id, name, description) VALUES ((SELECT id FROM entity_templates WHERE name = 'character'), 'Фродо Бэггинс', 'Хранитель Кольца');

-- Локации
INSERT INTO world_objects (template_id, name, description) VALUES ((SELECT id FROM entity_templates WHERE name = 'location'), 'Шир', 'Родина хоббитов');
INSERT INTO world_objects (template_id, name, description) VALUES ((SELECT id FROM entity_templates WHERE name = 'location'), 'Ривенделл', 'Скрытая долина эльфов');

-- Предметы
INSERT INTO world_objects (template_id, name, description) VALUES ((SELECT id FROM entity_templates WHERE name = 'item'), 'Кольцо Всевластия', 'Главный артефакт');
