# WriterWorldBuilder

[Back to Main Project Page](../README.md)

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

The `npm run package` command packages the application for your current operating system. For more specific control, you can add platform-specific scripts to your `package.json` and run them directly.

**Example scripts for `package.json`:**

```json
"scripts": {
  ...
  "package:win": "npm run build && electron-builder --win",
  "package:mac": "npm run build && electron-builder --mac",
  "package:linux": "npm run build && electron-builder --linux"
}
```

**To build for a specific platform, run one of the following:**

```bash
# Build for Windows
npm run package:win

# Build for macOS
npm run package:mac

# Build for Linux
npm run package:linux
```

See the notes below for platform-specific requirements before building.

### Platform-Specific Build Notes

#### macOS

To package the application for macOS, you must be on a macOS machine and have the following installed:

* **Xcode Command Line Tools:** Essential for code signing and building the installer. Install them by running this command in your terminal:

    ```bash
    xcode-select --install
    ```

* **Apple Developer ID (for distribution):** To distribute the app, it must be code-signed with an "Apple Developer ID Application" certificate. This requires enrollment in the Apple Developer Program. For local test builds, you can skip signing, but users will see a security warning upon opening the app.

#### Windows & Linux

No special tools are required beyond the standard Node.js/npm setup to build for these platforms, as long as you are building on the respective operating system. Building on a Linux machine is recommended for creating Linux packages.

### Tests

To run the test suite:

```bash
npm test
```

### Versioning

To manage the application's version number, a helper script is provided. This script automatically increments the version in both the root `package.json` and the `release/app/package.json` file, ensuring they stay in sync.

To use it, run one of the following commands:

```bash
# Bump the PATCH version (e.g., 0.1.1 -> 0.1.2)
npm run bump

# Bump the MINOR version (e.g., 0.1.2 -> 0.2.0)
npm run bump minor

# Bump the MAJOR version (e.g., 0.2.0 -> 1.0.0)
npm run bump major
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

---

## Technical Debt

For a list of known technical debt and tasks aimed at improving code quality, please see the [Technical Debt and Code Quality Improvement Tasks](./planing/tech_issues.md) document.

---

## Project Features and Roadmap

For a detailed breakdown of current, planned, and future features, please see the [Feature Decomposition and MVP Definition](./planing/features.md) document.
