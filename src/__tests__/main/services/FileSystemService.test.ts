import { shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import FileSystemService from '../../../main/services/FileSystemService';

jest.mock('fs/promises');
jest.mock('electron', () => ({
  shell: {
    openPath: jest.fn(),
  },
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedShell = shell as jest.Mocked<typeof shell>;

describe('FileSystemService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pathExists', () => {
    // Test case: Verify that the function returns true when the specified path exists.
    it('should return true if path exists', async () => {
      mockedFs.stat.mockResolvedValue({} as any);
      const result = await FileSystemService.pathExists('/fake/path');
      expect(result).toBe(true);
      expect(mockedFs.stat).toHaveBeenCalledWith('/fake/path');
    });

    // Test case: Ensure the function returns false when the specified path does not exist (ENOENT error).
    it('should return false if path does not exist', async () => {
      mockedFs.stat.mockRejectedValue({ code: 'ENOENT' });
      const result = await FileSystemService.pathExists('/fake/path');
      expect(result).toBe(false);
      expect(mockedFs.stat).toHaveBeenCalledWith('/fake/path');
    });

    // Test case: Confirm that the function re-throws errors other than ENOENT.
    it('should throw an error for other errors', async () => {
      const error = new Error('Some other error');
      mockedFs.stat.mockRejectedValue(error);
      await expect(FileSystemService.pathExists('/fake/path')).rejects.toThrow(
        'Some other error',
      );
    });
  });

  describe('openFolder', () => {
    // Test case: Verify that the shell's openPath method is called with the correct folder path.
    it('should open a folder', async () => {
      mockedShell.openPath.mockResolvedValue('');
      await FileSystemService.openFolder('/fake/folder');
      expect(mockedShell.openPath).toHaveBeenCalledWith('/fake/folder');
    });

    // Test case: Ensure that an error is thrown if the shell's openPath method indicates a failure.
    it('should throw an error if opening fails', async () => {
      const errorMessage = 'Failed to open path';
      mockedShell.openPath.mockResolvedValue(errorMessage);
      await expect(
        FileSystemService.openFolder('/fake/folder'),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('getDirectoryFiles', () => {
    // Test case: Check if the function correctly reads directory contents, filtering out ignored and non-alphanumeric files.
    it('should return a list of files, filtering ignored and non-alphanumeric files', async () => {
      const files = [
        'file1.txt',
        'content.md',
        '.DS_Store',
        'русский-файл.txt',
        '2file.log',
      ];
      mockedFs.readdir.mockResolvedValue(files as any);
      const result = await FileSystemService.getDirectoryFiles('/fake/folder');
      expect(result).toEqual(['file1.txt', 'русский-файл.txt', '2file.log']);
      expect(mockedFs.readdir).toHaveBeenCalledWith('/fake/folder');
    });

    // Test case: Verify that an empty array is returned when the specified directory does not exist.
    it('should return an empty array if directory does not exist', async () => {
      mockedFs.readdir.mockRejectedValue({ code: 'ENOENT' });
      const result = await FileSystemService.getDirectoryFiles('/fake/folder');
      expect(result).toEqual([]);
    });

    // Test case: Confirm that the function re-throws errors other than ENOENT when reading a directory.
    it('should throw an error for other errors', async () => {
      const error = new Error('Some other error');
      mockedFs.readdir.mockRejectedValue(error);
      await expect(
        FileSystemService.getDirectoryFiles('/fake/folder'),
      ).rejects.toThrow('Some other error');
    });
  });

  describe('createDirectories', () => {
    // Test case: Ensure that multiple directories are created recursively given a base path and a list of directory names.
    it('should create multiple directories', async () => {
      const dirs = ['dir1', 'dir2'];
      await FileSystemService.createDirectories('/base', dirs);
      expect(mockedFs.mkdir).toHaveBeenCalledWith(path.join('/base', 'dir1'), {
        recursive: true,
      });
      expect(mockedFs.mkdir).toHaveBeenCalledWith(path.join('/base', 'dir2'), {
        recursive: true,
      });
    });
  });

  describe('checkDirectoriesExist', () => {
    // Test case: Verify that the function returns true if all specified directories exist.
    it('should return true if all directories exist', async () => {
      mockedFs.stat.mockResolvedValue({} as any);
      const result = await FileSystemService.checkDirectoriesExist('/base', [
        'dir1',
        'dir2',
      ]);
      expect(result).toBe(true);
      expect(mockedFs.stat).toHaveBeenCalledTimes(2);
    });

    // Test case: Ensure the function returns false if at least one of the specified directories does not exist.
    it('should return false if any directory does not exist', async () => {
      mockedFs.stat
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce({ code: 'ENOENT' });
      const result = await FileSystemService.checkDirectoriesExist('/base', [
        'dir1',
        'dir2',
      ]);
      expect(result).toBe(false);
    });
  });

  describe('readFile', () => {
    // Test case: Confirm that the function reads and returns the correct content of a specified file.
    it('should read and return file content', async () => {
      mockedFs.readFile.mockResolvedValue('file content');
      const content = await FileSystemService.readFile('/fake/file.txt');
      expect(content).toBe('file content');
      expect(mockedFs.readFile).toHaveBeenCalledWith('/fake/file.txt', 'utf-8');
    });
  });

  describe('createFileWithDirs', () => {
    // Test case: Verify that the function creates necessary parent directories and then writes the content to the specified file.
    it('should create directories and write to a file', async () => {
      const filePath = '/base/dir/file.txt';
      const content = 'hello world';
      await FileSystemService.createFileWithDirs(filePath, content);
      expect(mockedFs.mkdir).toHaveBeenCalledWith(path.dirname(filePath), {
        recursive: true,
      });
      expect(mockedFs.writeFile).toHaveBeenCalledWith(filePath, content);
    });
  });

  describe('getStats', () => {
    // Test case: Check if the function successfully retrieves and returns file statistics for a given path.
    it('should return file stats', async () => {
      const stats = { mtime: new Date() } as any;
      mockedFs.stat.mockResolvedValue(stats);
      const result = await FileSystemService.getStats('/fake/file.txt');
      expect(result).toEqual(stats);
    });

    // Test case: Ensure the function returns null if the specified file does not exist (ENOENT error).
    it('should return null if file does not exist', async () => {
      mockedFs.stat.mockRejectedValue({ code: 'ENOENT' });
      const result = await FileSystemService.getStats('/fake/file.txt');
      expect(result).toBeNull();
    });

    // Test case: Confirm that the function re-throws errors other than ENOENT when getting file stats.
    it('should throw an error for other errors', async () => {
      const error = new Error('Some other error');
      mockedFs.stat.mockRejectedValue(error);
      await expect(
        FileSystemService.getStats('/fake/file.txt'),
      ).rejects.toThrow('Some other error');
    });
  });

  describe('deleteFile', () => {
    // Test case: Verify that the function correctly calls unlink to delete a specified file.
    it('should delete a file', async () => {
      await FileSystemService.deleteFile('/fake/file.txt');
      expect(mockedFs.unlink).toHaveBeenCalledWith('/fake/file.txt');
    });

    // Test case: Ensure the function does not throw an error if the file to be deleted does not exist (ENOENT error).
    it('should not throw an error if file does not exist', async () => {
      mockedFs.unlink.mockRejectedValue({ code: 'ENOENT' });
      await expect(
        FileSystemService.deleteFile('/fake/file.txt'),
      ).resolves.not.toThrow();
    });

    // Test case: Confirm that the function re-throws errors other than ENOENT when deleting a file.
    it('should throw an error for other errors', async () => {
      const error = new Error('Some other error');
      mockedFs.unlink.mockRejectedValue(error);
      await expect(
        FileSystemService.deleteFile('/fake/file.txt'),
      ).rejects.toThrow('Some other error');
    });
  });

  describe('deleteDirectory', () => {
    // Test case: Check if the function deletes a directory recursively and forcefully.
    it('should delete a directory recursively', async () => {
      await FileSystemService.deleteDirectory('/fake/dir');
      expect(mockedFs.rm).toHaveBeenCalledWith('/fake/dir', {
        recursive: true,
        force: true,
      });
    });
  });
});
