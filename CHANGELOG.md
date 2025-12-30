# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
