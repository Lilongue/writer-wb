-- ================= TEST DATA SEED =================
-- Этот скрипт можно выполнить на уже существующей базе данных проекта,
-- чтобы наполнить ее тестовыми данными для проверки.

-- Примечание: Скрипт предполагает, что он выполняется на свежей базе,
-- где в таблице narrative_items есть только одна запись ('Произведение') с id=1.

-- ID родительских элементов теперь ссылаются напрямую на narrative_items.id
-- 1: 'Произведение' (корневой элемент, narrative_items.id = 1)

-- Часть 1 (получит narrative_items.id = 2)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order, file_path) VALUES ((SELECT id FROM entity_templates WHERE name = 'part'), 1, 'Часть 1: Начало', 0, 'narrative/Часть 1_ Начало.md');
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Глава 1 (получит narrative_items.id = 3, родитель = 2)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order, file_path) VALUES ((SELECT id FROM entity_templates WHERE name = 'chapter'), 2, 'Глава 1: Утро', 0, 'narrative/Часть 1_ Начало/Глава 1_ Утро.md');
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Глава 2 (получит narrative_items.id = 4, родитель = 2)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order, file_path) VALUES ((SELECT id FROM entity_templates WHERE name = 'chapter'), 2, 'Глава 2: Полдень', 1, 'narrative/Часть 1_ Начало/Глава 2_ Полдень.md');
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Сцена 1 внутри Главы 2 (получит narrative_items.id = 5, родитель = 4)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order, file_path) VALUES ((SELECT id FROM entity_templates WHERE name = 'scene'), 4, 'Сцена 1: Разговор', 0, 'narrative/Часть 1_ Начало/Глава 2_ Полдень/Сцена 1_ Разговор.md');
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Часть 2 (получит narrative_items.id = 6, родитель = 1)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order, file_path) VALUES ((SELECT id FROM entity_templates WHERE name = 'part'), 1, 'Часть 2: Развитие', 1, 'narrative/Часть 2_ Развитие.md');
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- Глава 3 внутри Части 2 (получит narrative_items.id = 7, родитель = 6)
INSERT INTO narrative_items (template_id, parent_id, name, sort_order, file_path) VALUES ((SELECT id FROM entity_templates WHERE name = 'chapter'), 6, 'Глава 3: Вечер', 0, 'narrative/Часть 2_ Развитие/Глава 3_ Вечер.md');
INSERT INTO all_entities (narrative_id) VALUES (last_insert_rowid());

-- =================== WORLD OBJECTS ===================

-- Персонажи
INSERT INTO world_objects (template_id, name, description, properties) VALUES ((SELECT id FROM entity_templates WHERE name = 'character'), 'Арагорн', 'Наследник Исилдура', '{"race": "Дунэдайн", "age": "87"}');
INSERT INTO world_objects (template_id, name, description, properties) VALUES ((SELECT id FROM entity_templates WHERE name = 'character'), 'Гэндальф', 'Истари, мудрец и волшебник', '{"race": "Майар", "age": "Неизвестен"}');
INSERT INTO world_objects (template_id, name, description, properties) VALUES ((SELECT id FROM entity_templates WHERE name = 'character'), 'Фродо Бэггинс', 'Хранитель Кольца', '{"race": "Хоббит", "age": "50"}');

-- Локации
INSERT INTO world_objects (template_id, name, description, properties) VALUES ((SELECT id FROM entity_templates WHERE name = 'location'), 'Шир', 'Родина хоббитов', '{"population": "~30000"}');
INSERT INTO world_objects (template_id, name, description, properties) VALUES ((SELECT id FROM entity_templates WHERE name = 'location'), 'Ривенделл', 'Скрытая долина эльфов', '{"population": "Неизвестно"}');

-- Предметы
INSERT INTO world_objects (template_id, name, description) VALUES ((SELECT id FROM entity_templates WHERE name = 'item'), 'Кольцо Всевластия', 'Главный артефакт');
