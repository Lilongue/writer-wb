# План рефакторинга: GenericDao

## Цель

Разбить монолитный `GenericDao` на более мелкие, доменно-ориентированные DAO для улучшения модульности, поддерживаемости и соблюдения принципа единственной ответственности (Single Responsibility Principle).

---

## План действий

1. **Создать новую директорию `src/main/data/daos`:**
    * Эта директория будет содержать все новые, разделенные DAO-файлы.

2. **Создать доменно-специфичные DAO-файлы:**
    * `src/main/data/daos/NarrativeDao.ts`: Будет содержать все методы, связанные с `narrative_items` (например, `getNarrativeItems`, `createNarrativeItem`, `updateNarrativeItemDetails`).
    * `src/main/data/daos/WorldObjectDao.ts`: Будет содержать методы, связанные с `world_objects` (например, `getWorldObjectsByTypeId`, `createWorldObject`, `updateWorldObject`).
    * `src/main/data/daos/TemplateDao.ts`: Будет содержать методы для `entity_templates` (например, `getAllTemplates`, `createTemplate`, `archiveTemplate`).
    * `src/main/data/daos/ConnectionDao.ts`: Будет содержать методы для `connections` и прокси-таблицы `all_entities` (например, `getConnections`, `createConnection`, `findEntityId`, `resolveAllEntityIds`).
    * `src/main/data/daos/SettingsDao.ts`: Будет содержать методы для `project_settings` (например, `getAllProjectSettings`, `updateProjectSettings`).

3. **Определить базовый класс `BaseDao` (Рекомендуется):**
    * Создать `src/main/data/daos/BaseDao.ts`, который будет содержать общее свойство `getDb` и конструктор.
    * Каждый доменный DAO будет наследовать (`extend`) этот `BaseDao`, чтобы избежать дублирования кода.

4. **Рефакторинг слоя сервисов:**
    * Изменить конструкторы сервисных классов (`NarrativeService`, `WorldObjectService`, `TemplateService` и т.д.) так, чтобы они получали в качестве зависимости свой соответствующий новый DAO вместо монолитного `GenericDao`.

5. **Обновить `main.ts`:**
    * Изменить логику инстанцирования в `src/main/main.ts`. Вместо одного `GenericDao` будут создаваться экземпляры каждого нового DAO.
    * Эти новые экземпляры DAO будут переданы в конструкторы соответствующих сервисов.

6. **Удалить старый `GenericDao.ts`:**
    * После того, как все его методы будут перенесены, а сервисы обновлены, оригинальный файл `GenericDao.ts` можно будет безопасно удалить.

---

## Обоснование

Текущий класс `GenericDao` нарушает Принцип единственной ответственности, управляя доступом к данным для всех сущностей (повествование, объекты мира, шаблоны, настройки и т.д.). По мере роста проекта этот класс становится все труднее поддерживать и понимать.

Разделение на небольшие, сфокусированные DAO сделает код более чистым, модульным и легким для тестирования и дальнейшего развития.
