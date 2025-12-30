/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

/**
 * Parses the current version string and returns the next version based on the specified part to bump.
 * @param currentVersion - The version string (e.g., "1.2.3").
 * @param partToBump - The part of the version to increment ('major', 'minor', or 'patch').
 * @returns The next version string.
 */
const getNextVersion = (currentVersion: string, partToBump: 'major' | 'minor' | 'patch'): string => {
  const parts = currentVersion.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: "${currentVersion}". Expected "major.minor.patch".`);
  }
  let [major, minor, patch] = parts;

  switch (partToBump) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }
  return `${major}.${minor}.${patch}`;
};

/**
 * Main script function.
 */
const run = () => {
  try {
    // 1. Determine which part of the version to bump from command line arguments.
    const args = process.argv.slice(2);
    let partToBump: 'major' | 'minor' | 'patch' = 'patch';
    if (args.includes('major')) {
      partToBump = 'major';
    } else if (args.includes('minor')) {
      partToBump = 'minor';
    }

    // 2. Define paths to the package.json files.
    const rootPath = path.join(__dirname, '..', '..');
    const rootPackageJsonPath = path.join(rootPath, 'package.json');
    const releasePackageJsonPath = path.join(rootPath, 'release', 'app', 'package.json');
    const filesToUpdate = [rootPackageJsonPath, releasePackageJsonPath];

    // 3. Read current version from the single source of truth (root package.json).
    const currentVersion = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8')).version;
    if (!currentVersion) {
      throw new Error('Could not find "version" in the root package.json');
    }

    // 4. Calculate the next version.
    const nextVersion = getNextVersion(currentVersion, partToBump);
    console.log(`Bumping "${partToBump}" version from ${currentVersion} to ${nextVersion}`);

    // 5. Update both package.json files.
    filesToUpdate.forEach(filePath => {
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: File not found, skipping: ${filePath}`);
        return;
      }
      const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      packageJson.version = nextVersion;
      // Write back with pretty-printing and a trailing newline
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`- Updated ${path.relative(rootPath, filePath)} to ${nextVersion}`);
    });

    console.log('✅ Version bump complete.');

  } catch (error) {
    console.error('❌ Error bumping version:', error);
    process.exit(1);
  }
};

run();
