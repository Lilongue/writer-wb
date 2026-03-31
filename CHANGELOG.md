# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] -

### Added at [0.2.2]

### Changed at [0.2.2]

### Fixed at [0.2.2]

- **Connection Creation:** Fixed some bugs in connection creation flow, including preventing recursive connections and refactoring for better type safety.

## [0.2.1] - 2026-03-15

### Added at [0.2.1]

- **Drag-and-Drop Reordering:** Implemented drag-and-drop reordering for narrative items with intelligent "Contextual Dive" correction for invalid moves.
- **Recursive Deletion:** Implemented recursive deletion for narrative items.
- **File Attachment:** Added the ability to attach auxiliary files to a world object and access them from the UI.
- **Auto-save:** Added auto-save functionality when switching between items.
- **Narrative Plan:** Implemented mass addition of narrative plan items from pasted text.

### Changed at [0.2.1]

### Fixed at [0.2.1]

- **File Deletion:** Fixed an issue where deleting a world object would leave its directory and files on disk.
- Fixed some UI bugs.

## [0.2.0] - 2026-02-15

### Added at [0.2.0]

- **Project Creation:** Added an option in the project wizard to create a subfolder for the project.
- **External Editor Path:** Added functionality to configure an external Markdown editor path within project settings.
- **Project Settings:** Enhanced project settings to provide a more flexible and user-friendly settings interface.
- **Narrative Objects:** Added title field to narrative objects, providing a separate, optional export title.

### Changed at [0.2.0]

- Refactored notification system to use a unified IPC channel and enum for type safety.

- **UI/UX Redesign:** Performed a major redesign of the application's user interface for a more modern and intuitive experience.
- **Breaking Change - World Object Storage:** The file structure for world objects now uses static template IDs instead of template names in file paths. This change is not backward compatible with previous internal versions.

### Fixed at [0.2.0]

- Fixed several UI bugs.

## [0.1.3] - 2026-01-15

### Added at [0.1.3]

- **Error Notifications:** Implemented a global system to display user-friendly notifications for application errors.
- **Manuscript Export UX:** Added a "Export Entire Manuscript" option to the main menu for easier access.

### Changed at [0.1.3]

- **Object Renaming:** The ability to rename items has been removed from the context menus of the navigation trees. Renaming is now centralized in the main content view to ensure data consistency.

### Fixed at [0.1.3]

- **Nested Projects:** Prevented the creation of a new project inside an existing project directory.
- **Project Wizard:** Refactored the project creation modal, ensuring its state is properly reset.
- **Object Tree:** Fixed a bug where the tree would not display a newly created object if its parent category was collapsed.
- **UI Sync on Rename:** An item's name in the navigation tree now correctly updates when it is renamed in the main content view.
- **UI Sync on Archive:** The world object tree now correctly hides objects belonging to an archived template.

## [0.1.2] - 2025-12-30

### Fixed at [0.1.2]

- **Build:** Fixed a critical error in new project creating

## [0.1.1] - 2025-12-29

### Fixed at [0.1.1]

- **Build:** Fixed a critical error in project build dependencies

## [0.1.0] - 2025-12-28

### Added at [0.1.0]

- **Project Creation Wizard:** Implemented a step-by-step "wizard" for creating new projects, allowing users to choose a flexible narrative structure.
- **File Association:** Projects now use the `.wwb` extension and can be opened by double-clicking on Windows, macOS, and Linux.
- **Template Library:** Added a library of ready-made templates for different genres (fantasy, science fiction, etc.), which can be imported into a project.
- **Project Settings:** Implemented a settings screen for the project where metadata (e.g., author's name) can be specified.
- **"About" Window:** Added a standard "About" window, accessible from the menu.

### Changed at [0.1.0]

- **Narrative Structure:** The narrative hierarchy is now flexible and defined by project settings, rather than being hardcoded ("Part-Chapter-Scene").
- **Documentation:** Documentation has been restructured, with separate guides created for the user (`USER_GUIDE.md`) and developer (`DEVELOPER_GUIDE.md`).

### Fixed at [0.1.0]

- **Project Versioning:** Fixed a bug where new projects retained a hardcoded version. The application now saves its actual version.

## [0.0.1] - 2025-12-20 (WIN)

### Added

#### Core Application

- Integration with an external editor (via "Open File" button).
- Background monitoring of changes in `.md` files.
- Basic 3-pane interface (project tree, content, metadata).

#### Project Management

- Creation of new projects.
- Opening existing projects.

#### Narrative

- Create, rename, and delete narrative elements (e.g., Part, Chapter).
- Support for nested structures (e.g., a Chapter containing Scenes).
- Metadata for narrative elements ("Plan" as a checklist and "Main Idea").

#### World Building

- Create, rename, and delete world objects.
- Pre-defined object types ("Character", "Location").
- Pre-defined templates for world objects.
- "Name" field and a link to the `.md` file for each object.
- Use of IDs in file paths for world objects to prevent data loss on rename.
- User-defined templates/types for objects (e.g., "Spell", "Race").
- Comments for custom fields to add descriptions.
- Template Editor: Add new fields to existing templates.
- World object tree state is preserved on updates.

#### Connections

- Create and delete simple connections between two objects.
- Add a text description to a connection (e.g., "ally," "owns").
- View connections as a list on the object's detail page.

#### Import/Export

- Compile the manuscript into a single `.md` file.

#### Documentation

- Basic user documentation (`USER_GUIDE.md`) in the repository.
