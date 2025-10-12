import fs from 'fs/promises';
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
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Creates multiple directories inside a base path.
   * @param basePath - The base path.
   * @param dirs - An array of directory names to create.
   */
  public async createDirectories(basePath: string, dirs: string[]): Promise<void> {
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
  public async checkDirectoriesExist(basePath: string, dirs: string[]): Promise<boolean> {
    const promises = dirs.map((dir) => {
      const fullPath = path.join(basePath, dir);
      return this.pathExists(fullPath);
    });

    const results = await Promise.all(promises);
    return results.every((exists) => exists);
  }
}

export default new FileSystemService();
