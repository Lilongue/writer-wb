/* eslint-disable no-console */
import path from 'path';
import {
  CustomField,
  ItemDetails,
  WorldObject,
  WorldObjectType,
} from '../../common/types';
import { GenericDao } from '../data/GenericDao';
import fileSystemService from './FileSystemService';

/**
 * Сервис для управления бизнес-логикой, связанной с объектами мира.
 */
export class WorldObjectService {
  private dao: GenericDao;

  private getProjectRoot: () => string | null;

  constructor(dao: GenericDao, getProjectRoot: () => string | null) {
    this.dao = dao;
    this.getProjectRoot = getProjectRoot;
  }

  /**
   * Получает все типы объектов мира.
   * @returns {WorldObjectType[]} Массив типов объектов мира.
   */
  public getWorldObjectTypes(): WorldObjectType[] {
    return this.dao.getWorldObjectTypes();
  }

  /**
   * Получает все объекты мира для заданного типа.
   * @param {number} typeId ID типа объекта.
   * @returns {WorldObject[]} Массив объектов мира.
   */
  public getWorldObjectsByTypeId(typeId: number): WorldObject[] {
    return this.dao.getWorldObjectsByTypeId(typeId);
  }

  public async getDetails(id: number): Promise<ItemDetails | null> {
    const object = this.dao.getWorldObjectById(id);
    if (!object) {
      return null;
    }

    const template = this.dao.getTemplateById(object.template_id);
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
          schema.forEach((field: { name: string; label: string }) => {
            if (properties[field.name]) {
              customFields.push({
                label: field.label,
                value: properties[field.name],
              });
            }
          });
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

    if (projectRoot) {
      // Путь по соглашению: <root>/world/<template_name>/<object_name>/description.md
      absolutePath = path.join(
        projectRoot,
        'world',
        template.name,
        object.name,
        'description.md',
      );
      fileExists = await fileSystemService.pathExists(absolutePath);

      if (fileExists) {
        try {
          content = await fileSystemService.readFile(absolutePath);
        } catch (e) {
          console.error(`Error reading existing file ${absolutePath}`, e);
          content = `# Ошибка чтения файла\nНе удалось прочитать файл, хотя он существует.`;
          fileExists = false; // Считаем, что его нет, раз не смогли прочитать
        }
      } else {
        content = `# Файл не найден\nНажмите кнопку ниже, чтобы создать его.`;
      }
    }

    return {
      id: object.id,
      name: object.name,
      path: absolutePath,
      content: content || object.description || '',
      customFields,
      fileExists,
    };
  }
}

export default WorldObjectService;
