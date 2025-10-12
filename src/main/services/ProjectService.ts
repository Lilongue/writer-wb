import path from 'path';
import fs from 'fs/promises';
import Database from 'better-sqlite3';

class ProjectService {
  private db: Database.Database | null = null;
  private projectRoot: string | null = null;

  public async create(projectPath: string): Promise<void> {
    // TODO: Implement project creation logic
    console.log(`Creating project at: ${projectPath}`);
  }

  public async open(projectPath: string): Promise<boolean> {
    // TODO: Implement project opening logic
    console.log(`Opening project at: ${projectPath}`);
    return Promise.resolve(false);
  }

  public close(): void {
    // TODO: Implement project closing logic
    console.log('Closing project.');
  }

  public getDb(): Database.Database {
    if (!this.db) {
      throw new Error('No project is currently open.');
    }
    return this.db;
  }

  public getProjectRoot(): string | null {
    return this.projectRoot;
  }
}

export default new ProjectService();
