# Gemini Code Assistant Context

## Project Overview

This project, named "WriterWorldBuilder," is a desktop application designed to help writers build consistent and logically structured worlds for their stories. It allows for the creation and management of relationships between various elements like objects, scenes, and characters.

The application is built using the following technologies:

* **Electron:** For creating a cross-platform desktop application with web technologies.
* **React:** For building the user interface.
* **TypeScript:** For adding static typing to the JavaScript codebase.
* **Webpack:** For bundling the application's assets.

The application's architecture is divided into two main processes:

* **Main Process:** (src/main/main.ts) Handles the application's lifecycle, window management, and communication with the operating system. It also provides services for accessing the file system and managing project data.
* **Renderer Process:** (src/renderer/App.tsx) Renders the user interface using React. It communicates with the main process through IPC to access data and application services.

## Building and Running

The following scripts are available in `package.json` to build and run the application:

* **`npm start`**: Starts the application in development mode with hot reloading.
* **`npm run build`**: Builds the application for production.
* **`npm run package`**: Packages the application for distribution.
* **`npm test`**: Runs the tests using Jest.
* **`npm run lint`**: Lints the codebase using ESLint.

## Development Conventions

* **Code Style:** The project uses ESLint with the "airbnb-base" and "erb" configurations to enforce a consistent code style. Prettier is used for code formatting.
* **Testing:** The project uses Jest for unit and integration testing. Test files are located in the `src/__tests__` directory.
* **Documentation:** The `docs` directory contains documentation related to the project's architecture, development process, and design decisions.
