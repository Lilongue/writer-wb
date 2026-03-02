// jest.config.node.js
// This config is for tests that run in a Node.js environment.
// It inherits from the base Jest config in package.json but overrides the environment.

const packageJson = require('./package.json');

// Create a new config object that doesn't share references
const jestConfig = JSON.parse(JSON.stringify(packageJson.jest));

// Override the environment to 'node' for pure JS/TS unit tests
jestConfig.testEnvironment = 'node';

// Remove the setup file that causes the TextEncoder error
delete jestConfig.setupFiles;

// The globals override for ts-jest is no longer needed
delete jestConfig.globals;

module.exports = jestConfig;
