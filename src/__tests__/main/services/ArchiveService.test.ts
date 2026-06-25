/* eslint-disable @typescript-eslint/no-explicit-any */
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import archiver from 'archiver';
import path from 'path';
import { PassThrough } from 'stream';
import ArchiveService from '../../../main/services/ArchiveService';
import ProjectService from '../../../main/services/ProjectService';
import FileSystemService from '../../../main/services/FileSystemService';
import { EntityType } from '../../../common/types';

// Mock dependencies
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: jest.fn(() => '/mock/app/path'),
    getPath: jest.fn((name) => `/mock/path/${name}`),
  },
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: jest.fn(),
}));
jest.mock('fs/promises');
jest.mock('archiver');
jest.mock('../../../main/services/ProjectService');
jest.mock('../../../main/services/FileSystemService');

const mockedArchiver = archiver as jest.MockedFunction<typeof archiver>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedCreateWriteStream = createWriteStream as jest.Mock;
const mockedProjectService = ProjectService as jest.Mocked<
  typeof ProjectService
>;
const mockedFileSystemService = FileSystemService as jest.Mocked<
  typeof FileSystemService
>;

describe('ArchiveService', () => {
  let outputStream: PassThrough;
  let archiveInstance: any;
  const projectRoot = '/fake/project';

  beforeEach(() => {
    jest.resetAllMocks();

    outputStream = new PassThrough();
    archiveInstance = {
      pipe: jest.fn(),
      file: jest.fn(),
      directory: jest.fn(),
      finalize: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'error' || event === 'warning') {
          // Store handlers to be called manually
          archiveInstance.eventHandlers = archiveInstance.eventHandlers || {};
          archiveInstance.eventHandlers[event] = handler;
        }
        return archiveInstance;
      }),
      emit: jest.fn((event, ...args) => {
        if (
          archiveInstance.eventHandlers &&
          archiveInstance.eventHandlers[event]
        ) {
          archiveInstance.eventHandlers[event](...args);
        }
        return true;
      }),
    };

    // Mock archiver() to return our mock instance
    mockedArchiver.mockReturnValue(archiveInstance);

    // Mock createWriteStream to return our mock stream
    mockedCreateWriteStream.mockReturnValue(outputStream);

    // Default mocks for services
    mockedProjectService.getProjectPathDetails.mockReturnValue({
      projectRoot,
      dbPath: path.join(projectRoot, 'database.db'),
    });
    mockedFileSystemService.getDirectoryFiles.mockResolvedValue([
      'project.wwb',
    ]);
    mockedFileSystemService.pathExists.mockResolvedValue(true);
  });

  describe('createProjectArchive', () => {
    // Test case: No project is currently open. Expect an error to be thrown.
    it('should throw an error if no project is open', async () => {
      mockedProjectService.getProjectPathDetails.mockReturnValue(null);
      await expect(
        ArchiveService.createProjectArchive('/fake/archive.zip'),
      ).rejects.toThrow('No project is currently open.');
    });

    // Test case: Successfully create an archive with all expected files and directories.
    it('should create a project archive with all expected files', async () => {
      const archivePromise =
        ArchiveService.createProjectArchive('/fake/archive.zip');

      // Allow microtasks to run
      await Promise.resolve();

      // Simulate successful close
      outputStream.emit('close');

      const warnings = await archivePromise;

      expect(warnings).toEqual([]);
      expect(mockedProjectService.flushDatabase).toHaveBeenCalledTimes(1);
      expect(mockedFs.mkdir).toHaveBeenCalledWith('/fake', { recursive: true });
      expect(archiveInstance.file).toHaveBeenCalledWith(
        path.join(projectRoot, 'database.db'),
        { name: 'database.db' },
      );
      expect(archiveInstance.file).toHaveBeenCalledWith(
        path.join(projectRoot, 'project.wwb'),
        { name: 'project.wwb' },
      );
      expect(archiveInstance.directory).toHaveBeenCalledWith(
        path.join(projectRoot, EntityType.Narrative),
        EntityType.Narrative,
      );
      expect(archiveInstance.directory).toHaveBeenCalledWith(
        path.join(projectRoot, EntityType.WorldObject),
        EntityType.WorldObject,
      );
      expect(archiveInstance.finalize).toHaveBeenCalledTimes(1);
    });

    // Test case: The .wwb marker file is not found in the project root. Expect a warning.
    it('should resolve with a warning if .wwb file is not found', async () => {
      mockedFileSystemService.getDirectoryFiles.mockResolvedValue([
        'another-file.txt',
      ]);
      const archivePromise =
        ArchiveService.createProjectArchive('/fake/archive.zip');
      await Promise.resolve();
      outputStream.emit('close');

      const warnings = await archivePromise;
      expect(warnings).toContain('No .wwb file found in project root.');
    });

    // Test case: Narrative and/or WorldObject directories are not found. Expect corresponding warnings.
    it('should resolve with warnings if narrative or world directories are not found', async () => {
      mockedFileSystemService.pathExists.mockImplementation(async (p) => {
        const narrativePath = path.join(projectRoot, EntityType.Narrative);
        const worldObjectPath = path.join(projectRoot, EntityType.WorldObject);

        if (p === narrativePath) return false;
        if (p === worldObjectPath) return false;
        return true;
      });

      const archivePromise =
        ArchiveService.createProjectArchive('/fake/archive.zip');
      await Promise.resolve();
      outputStream.emit('close');

      const warnings = await archivePromise;
      expect(warnings).toContain(
        `Narrative directory not found: ${path.join(projectRoot, EntityType.Narrative)}`,
      );
      expect(warnings).toContain(
        `World directory not found: ${path.join(projectRoot, EntityType.WorldObject)}`,
      );
    });

    // Test case: The archiver emits a warning (e.g., file not found). Expect the warning to be captured.
    it('should handle warnings from the archiver', async () => {
      const warningError = { code: 'ENOENT', message: 'File not found' };
      const archivePromise =
        ArchiveService.createProjectArchive('/fake/archive.zip');

      await Promise.resolve();
      // Manually trigger the 'warning' event with our stored handler
      archiveInstance.emit('warning', warningError);

      await Promise.resolve();
      outputStream.emit('close');

      const warnings = await archivePromise;
      expect(warnings).toContain('File not found');
    });

    // Test case: The archiver encounters an error during the archiving process. Expect the promise to reject.
    it('should reject on archiver error', async () => {
      const error = new Error('Test archiver error');
      const archivePromise =
        ArchiveService.createProjectArchive('/fake/archive.zip');

      await Promise.resolve();
      // Manually trigger the 'error' event
      archiveInstance.emit('error', error);

      await expect(archivePromise).rejects.toThrow('Test archiver error');
    });
  });
});
