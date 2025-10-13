# План реализации Шага 2: Левая панель — Дерево проекта

Основная задача — отобразить иерархию из таблицы `narrative_items` в виде кликабельного дерева в интерфейсе React. Это требует взаимодействия между `main` процессом (где есть доступ к БД) и `renderer` процессом (где работает React).

---

## Часть 1: Backend (Main-процесс Electron)

1. **Создать метод для получения данных.**
    * **Где:** В `src/main/services/ProjectService.ts` (или в новом `NarrativeService.ts`).
    * **Что делать:** Добавить асинхронный метод `getNarrativeItems()`.
    * **Логика:** Выполнить SQL-запрос `SELECT id, name, parent_id, sort_order FROM narrative_items ORDER BY sort_order ASC` и вернуть "плоский" массив элементов.

2. **Организовать IPC-канал для связи.**
    * **Где:** В `src/main/main.ts`, в секции `IPC MAIN`.
    * **Что делать:** Создать обработчик `ipcMain.handle()` для канала `'get-narrative-items'`.
    * **Логика:** Обработчик вызывает `ProjectService.getNarrativeItems()` и возвращает результат в `renderer` процесс.

## Часть 2: Frontend (Renderer-процесс, React)

3. **Создать компонент дерева.**
    * **Где:** Создать новый файл `src/renderer/components/NarrativeTree.tsx`.
    * **Рекомендация:** Использовать готовую библиотеку `rc-tree` для отрисовки.
    * **Установка:** `npm install rc-tree`

4. **Запросить, обработать и отобразить данные.**
    * **Где:** Внутри компонента `NarrativeTree.tsx`.
    * **Логика:**
        * В `useEffect` вызвать `window.electron.ipcRenderer.invoke('get-narrative-items')`.
        * Написать утилитарную функцию для преобразования "плоского" массива в иерархическую структуру (дерево).
        * Передать полученное дерево в компонент `rc-tree` для отрисовки.

5. **Управление состоянием (выбранный элемент).**
    * **Где:** В главном компоненте `src/renderer/App.tsx`.
    * **Логика:**
        * Завести состояние: `const [selectedItemId, setSelectedItemId] = useState(null);`.
        * Передать `setSelectedItemId` в `NarrativeTree.tsx` как prop `onSelect`.
        * Использовать `onSelect` из `rc-tree` для обновления состояния.
        * `selectedItemId` будет использоваться в Шаге 3 для центральной панели.

---

## Итог (артефакты)

* **Модифицирован:** `ProjectService.ts`
* **Модифицирован:** `main.ts`
* **Модифицирован:** `App.tsx`
* **Создан:** `src/renderer/components/NarrativeTree.tsx`
* **Установлена:** зависимость `rc-tree`.
