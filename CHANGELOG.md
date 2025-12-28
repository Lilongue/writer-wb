# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
