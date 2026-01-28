/* eslint-disable no-console */
import path from 'path';
import {
  CustomField,
  ItemDetails,
  WorldObject,
  WorldObjectType,
} from '../../common/types';
import { TemplateDao } from '../data/daos/TemplateDao';
import { WorldObjectDao } from '../data/daos/WorldObjectDao';
import eventBus from '../eventBus';
import fileSystemService from './FileSystemService';

/**
 * Сервис для управления бизнес-логикой, связанной с объектами мира.
 */
export class WorldObjectService {
  private worldObjectDao: WorldObjectDao;

  private templateDao: TemplateDao;

  private getProjectRoot: () => string | null;

  constructor(
    worldObjectDao: WorldObjectDao,
    templateDao: TemplateDao,
    getProjectRoot: () => string | null,
  ) {
    this.worldObjectDao = worldObjectDao;
    this.templateDao = templateDao;
    this.getProjectRoot = getProjectRoot;
  }

  /**
   * Получает все типы объектов мира.
   * @returns {WorldObjectType[]} Массив типов объектов мира.
   */
  public getWorldObjectTypes(): WorldObjectType[] {
    return this.templateDao.getAllTemplates(false, 'world');
  }

  /**
   * Получает все объекты мира для заданного типа.
   * @param {number} typeId ID типа объекта.
   * @returns {WorldObject[]} Массив объектов мира.
   */
  public getWorldObjectsByTypeId(typeId: number): WorldObject[] {
    return this.worldObjectDao.getWorldObjectsByTypeId(typeId);
  }

  public async getDetails(id: number): Promise<ItemDetails | null> {
    const object = this.worldObjectDao.getWorldObjectById(id);
    if (!object) {
      return null;
    }

    const template = this.templateDao.getTemplate(object.template_id);
    if (!template) {
      return null;
    }

    // 1. Собираем кастомные поля
    const customFields: CustomField[] = [];
    if (template.fields_schema && object.properties) {
      try {
        const schema = JSON.parse(template.fields_schema);
        const properties = JSON.parse(object.properties);

        if (Array.isArray(schema)) {
          schema.forEach(
            (field: { name: string; label: string; comment?: string }) => {
              customFields.push({
                key: field.name,
                label: field.label,
                value: properties[field.name] || '',
                comment: field.comment,
              });
            },
          );
        }
      } catch (e) {
        console.error('Error parsing custom fields JSON', e);
      }
    }

    // 2. Собираем путь к файлу и его содержимое
    const projectRoot = this.getProjectRoot();
    let content: string | undefined;
    let absolutePath: string | undefined;
    let fileExists = false;
    let mtime: number | null = null;

    if (projectRoot) {
      // Путь по соглашению: <root>/world/<template_id>/<object_id>/content.md
      absolutePath = path.join(
        projectRoot,
        'world',
        template.id.toString(),
        object.id.toString(),
        'content.md',
      );
      const stats = await fileSystemService.getStats(absolutePath);

      if (stats) {
        try {
          content = await fileSystemService.readFile(absolutePath);
          mtime = stats.mtimeMs;
          fileExists = true;
        } catch (e) {
          console.error(`Error reading existing file ${absolutePath}`, e);
          content = `# Ошибка чтения файла\nНе удалось прочитать файл, хотя он существует.`;
          fileExists = false; // Считаем, что его нет, раз не смогли прочитать
        }
      } else {
        content = `# Файл не найден\nНажмите кнопку ниже, чтобы создать его.`;
        fileExists = false;
      }
    }

    return {
      id: object.id,
      name: object.name,
      path: absolutePath ?? null,
      content: content || object.description || '',
      customFields,
      fileExists,
      mtime,
    };
  }

  public createObject({
    name,
    typeId,
    properties,
  }: {
    name: string;
    typeId: number;
    properties?: string;
  }): number {
    const newId = this.worldObjectDao.createWorldObject(
      name,
      typeId,
      properties || '{}',
    );

    // Сразу создаем файловую структуру
    const projectRoot = this.getProjectRoot();
    const template = this.templateDao.getTemplate(typeId);
    if (projectRoot && template) {
      const filePath = path.join(
        projectRoot,
        'world',
        template.id.toString(),
        newId.toString(),
        'content.md',
      );
      // Не ждем завершения, чтобы не блокировать UI
      fileSystemService.createFileWithDirs(filePath, '').catch(console.error);
    }

    process.nextTick(() => {
      eventBus.emit('world-objects-changed', { typeId });
    });
    return newId;
  }

  public renameObject({ id, newName }: { id: number; newName: string }): void {
    const object = this.worldObjectDao.getWorldObjectById(id);
    if (object) {
      this.worldObjectDao.updateWorldObject(
        id,
        newName,
        object.properties || '{}',
      );
      process.nextTick(() => {
        eventBus.emit('world-objects-changed', {
          typeId: object.template_id,
        });
      });
    }
  }

  public deleteObject(id: number): { success: boolean; typeId?: number } {
    const object = this.worldObjectDao.getWorldObjectById(id);
    if (!object) {
      return { success: false };
    }

    const projectRoot = this.getProjectRoot();
    const template = this.templateDao.getTemplate(object.template_id);
    if (projectRoot && template) {
      const dirPath = path.join(
        projectRoot,
        'world',
        template.id.toString(),
        object.id.toString(),
      );
      fileSystemService.deleteDirectory(dirPath).catch(console.error);
    }

    const ok = this.worldObjectDao.deleteWorldObject(id);
    if (ok) {
      process.nextTick(() => {
        eventBus.emit('world-objects-changed', {
          typeId: object.template_id,
        });
      });
    }
    return { success: ok, typeId: object.template_id };
  }

  public updateObjectDetails({
    id,
    name,
    properties,
  }: {
    id: number;
    name: string;
    properties: string;
  }): void {
    const object = this.worldObjectDao.getWorldObjectById(id);
    if (object) {
      this.worldObjectDao.updateWorldObject(id, name, properties);
      process.nextTick(() => {
        eventBus.emit('world-objects-changed', {
          typeId: object.template_id,
        });
      });
    }
  }

  public getTemplateDetails(templateId: number) {
    return this.templateDao.getTemplate(templateId);
  }
}

export default WorldObjectService;
