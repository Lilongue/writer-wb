# WriterWorldBuilder

A desktop application for writers to build and manage fictional worlds.

WriterWorldBuilder helps writers create consistent and logically structured worlds for their stories. It allows for the creation and management of relationships between various elements like objects, scenes, and characters. A key feature is its integration with external markdown editors, allowing you to use your favorite tools to write detailed descriptions, which are then seamlessly reflected within the application.

## Core Features (MVP)

* **Project Management:** Create and open projects.
* **Narrative Structure:** Create, rename, delete, and reorder narrative elements (Parts, Chapters, Scenes) with drag-and-drop.
* **World Building:**
  * Create, rename, and delete world objects.
  * Use predefined object types like "Character" and "Location".
  * Link objects to markdown files for detailed descriptions.
* **Relationship Management:**
  * Create and delete simple relationships between any two objects.
  * Add textual descriptions to relationships (e.g., "ally," "owns").
  * View relationships as a list on an object's page.
* **External Editor Integration:** Open and edit object description files in your favorite markdown editor, with changes reflected in the application.

## Future Features

* Full-text search
* Customizable UI
* Light/Dark themes
* Multi-language support
* Custom world object templates
* Tagging system
* Visual relationship graph (mind map)
* Timelines

## Tech Stack

* [Electron](https://www.electronjs.org/)
* [React](https://reactjs.org/)
* [TypeScript](https://www.typescriptlang.org/)
* [Webpack](https://webpack.js.org/)

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (>=14.x)
* [npm](https://www.npmjs.com/) (>=7.x)

### Installation

```bash
npm install
```

### Development

To run the application in development mode with hot reloading:

```bash
npm start
```

### Build

To build the application for production:

```bash
npm run build
```

### Package

To package the application for distribution:

```bash
npm run package
```

### Tests

To run the test suite:

```bash
npm test
```

### Lint

To lint the codebase:

```bash
npm run lint
```

## Project Structure

The project is divided into two main processes:

* `src/main`: The main Electron process. It handles the application's lifecycle, window management, and communication with the operating system. It also provides services for accessing the file system and managing project data.
* `src/renderer`: The renderer process. It renders the user interface using React and communicates with the main process to access data and application services.

## Contributing

Contributions are welcome! Please adhere to the project's coding standards by using ESLint and Prettier.

## License

This project is licensed under the MIT License.