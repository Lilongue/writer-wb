/* eslint-disable class-methods-use-this */
import path from 'path';
import archiver from 'archiver';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import FileSystemService from './FileSystemService';
import ProjectService from './ProjectService';
import { EntityType } from '../../common/types';

class ArchiveService {
  public async createProjectArchive(targetZipPath: string): Promise<string[]> {
    const projectDetails = ProjectService.getProjectPathDetails();

    if (!projectDetails) {
      throw new Error('No project is currently open.');
    }

    const { projectRoot, dbPath } = projectDetails;
    const warnings: string[] = [];

    // Ensure the target directory for the zip file exists
    await fs.mkdir(path.dirname(targetZipPath), { recursive: true });

    const output = createWriteStream(targetZipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    return new Promise<string[]>((resolve, reject) => {
      output.on('close', () => {
        resolve(warnings);
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          warnings.push(err.message);
        } else {
          reject(err);
        }
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      const addOperations: Promise<void>[] = [];

      // 1. Add the database file
      archive.file(dbPath, { name: path.basename(dbPath) });

      // 2. Add the .wwb project marker file
      addOperations.push(
        FileSystemService.getDirectoryFiles(projectRoot).then((files) => {
          const wwbFile = files.find((file) => file.endsWith('.wwb'));
          if (wwbFile) {
            archive.file(path.join(projectRoot, wwbFile), { name: wwbFile });
          } else {
            warnings.push('No .wwb file found in project root.');
          }
          return undefined;
        }),
      );

      // 3. Add the narrative directory
      const narrativePath = path.join(projectRoot, EntityType.Narrative);
      addOperations.push(
        FileSystemService.pathExists(narrativePath).then((exists) => {
          if (exists) {
            archive.directory(narrativePath, EntityType.Narrative);
          } else {
            warnings.push(`Narrative directory not found: ${narrativePath}`);
          }
          return undefined;
        }),
      );

      // 4. Add the world directory
      const worldPath = path.join(projectRoot, EntityType.WorldObject);
      addOperations.push(
        FileSystemService.pathExists(worldPath).then((exists) => {
          if (exists) {
            archive.directory(worldPath, EntityType.WorldObject);
          } else {
            warnings.push(`World directory not found: ${worldPath}`);
          }
          return undefined;
        }),
      );

      // Wait for all async add operations to complete before finalizing
      Promise.all(addOperations)
        .then(() => {
          archive.finalize();
          return undefined;
        })
        .catch((e) => {
          reject(e);
        });
    });
  }
}

export default new ArchiveService();
