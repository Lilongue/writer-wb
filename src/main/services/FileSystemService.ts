/* eslint-disable class-methods-use-this */
import { shell } from 'electron';
import fs from 'fs/promises';
import { Stats } from 'fs';
import path from 'path';

class FileSystemService {
  /**
   * Checks if a path exists.
   * @param entityPath - The path to check.
   * @returns True if the path exists, false otherwise.
   */
  public async pathExists(entityPath: string): Promise<boolean> {
    try {
      await fs.stat(entityPath);
      return true;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Opens a folder in the native file explorer.
   * @param folderPath - The absolute path to the folder.
   */
  public async openFolder(folderPath: string): Promise<void> {
    const err = await shell.openPath(folderPath);
    if (err) {
      throw new Error(err);
    }
  }

  /**
   * Gets a list of files in a directory, excluding certain files.
   * @param folderPath - The absolute path to the folder.
   * @returns A list of file names.
   */
  public async getDirectoryFiles(folderPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(folderPath);
      const ignoredFiles = ['content.md'];
      const alphanumericRegex = /^[a-zA-Z0-9а-яА-ЯёЁ]/;
      return files.filter(
        (file) => !ignoredFiles.includes(file) && alphanumericRegex.test(file),
      );
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        // Directory doesn't exist, return empty array.
        return [];
      }
      throw error;
    }
  }

  /**
   * Creates multiple directories inside a base path.
   * @param basePath - The base path.
   * @param dirs - An array of directory names to create.
   */
  public async createDirectories(
    basePath: string,
    dirs: string[],
  ): Promise<void> {
    const promises = dirs.map((dir) => {
      const fullPath = path.join(basePath, dir);
      return fs.mkdir(fullPath, { recursive: true });
    });
    await Promise.all(promises);
  }

  /**
   * Checks if multiple directories exist within a base path.
   * @param basePath - The base path.
   * @param dirs - An array of directory names to check.
   * @returns True if all directories exist, false otherwise.
   */
  public async checkDirectoriesExist(
    basePath: string,
    dirs: string[],
  ): Promise<boolean> {
    const promises = dirs.map((dir) => {
      const fullPath = path.join(basePath, dir);
      return this.pathExists(fullPath);
    });

    const results = await Promise.all(promises);
    return results.every((exists) => exists);
  }

  /**
   * Reads the content of a file.
   * @param filePath - The absolute path to the file.
   * @returns The content of the file as a string.
   */
  public async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Creates a file, including all necessary parent directories.
   * @param filePath - The absolute path to the file.
   * @param content - The content to write to the file.
   */
  public async createFileWithDirs(
    filePath: string,
    content: string,
  ): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content);
  }

  /**
   * Gets the stats of a file.
   * @param filePath - The absolute path to the file.
   * @returns The stats of the file, or null if it doesn't exist.
   */
  public async getStats(filePath: string): Promise<Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        return null;
      }
      throw error;
    }
  }

  public async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        // Файл не существует, это нормально, ничего не делаем
        return;
      }
      // Другая ошибка, пробрасываем ее
      throw error;
    }
  }

  public async deleteDirectory(dirPath: string): Promise<void> {
    await fs.rm(dirPath, { recursive: true, force: true });
  }
}

export default new FileSystemService();
