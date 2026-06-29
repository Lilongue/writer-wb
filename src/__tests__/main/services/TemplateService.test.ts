import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { TemplateService } from '../../../main/services/TemplateService';
import { TemplateDao } from '../../../main/data/daos/TemplateDao';
import { WorldObjectDao } from '../../../main/data/daos/WorldObjectDao';
import MainNotificationService from '../../../main/services/NotificationService';
import {
  EntityType,
  PredefinedTemplate,
  PredefinedTemplatesFile,
} from '../../../common/types';
import { generateExportName } from '../../../common/utils';

// Mock Electron's app module
jest.mock('electron', () => ({
  app: {
    isPackaged: false, // Default to development mode
    getAppPath: jest.fn(() => '/mock/app/path'),
  },
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')), // Simple join for testing
}));

// Mock DAOs
jest.mock('../../../main/data/daos/TemplateDao');
jest.mock('../../../main/data/daos/WorldObjectDao');

// Mock NotificationService
jest.mock('../../../main/services/NotificationService', () => ({
  error: jest.fn(),
}));

// Mock common/utils
jest.mock('../../../common/utils', () => ({
  generateExportName: jest.fn(() => 'mock_export_name'),
}));

describe('TemplateService', () => {
  let templateDao: jest.Mocked<TemplateDao>;
  let worldObjectDao: jest.Mocked<WorldObjectDao>;
  let notificationService: jest.Mocked<typeof MainNotificationService>;
  let service: TemplateService;

  beforeAll(() => {
    // Ensure that path.join always returns a consistent mocked path
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });

  beforeEach(() => {
    templateDao =
      new (TemplateDao as jest.Mock<TemplateDao>)() as jest.Mocked<TemplateDao>;
    worldObjectDao =
      new (WorldObjectDao as jest.Mock<WorldObjectDao>)() as jest.Mocked<WorldObjectDao>;
    notificationService = MainNotificationService as jest.Mocked<
      typeof MainNotificationService
    >;
    service = new TemplateService(templateDao, worldObjectDao);

    // Reset mocks before each test
    jest.clearAllMocks();
    (app.getAppPath as jest.Mock).mockReturnValue('/mock/app/path');
    (app.isPackaged as any) = false; // Reset to dev mode
    (fs.readFile as jest.Mock).mockClear();
    (notificationService.error as jest.Mock).mockClear();
    (generateExportName as jest.Mock).mockClear();
  });

  describe('Static Methods', () => {
    describe('getAssetPath', () => {
      // Test case: Verifies that `getAssetPath` constructs the correct asset path when the application is running in development mode.
      it('should return the correct path in development mode', () => {
        (app.isPackaged as any) = false;
        const assetPath = (TemplateService as any).getAssetPath('test.json');
        expect(app.getAppPath).toHaveBeenCalledTimes(1);
        expect(path.join).toHaveBeenCalledWith(
          '/mock/app/path',
          'assets',
          'test.json',
        );
        expect(assetPath).toBe('/mock/app/path/assets/test.json');
      });

      // Test case: Verifies that `getAssetPath` constructs the correct asset path when the application is running in production (packaged) mode.
      it('should return the correct path in production mode', () => {
        (app.isPackaged as any) = true;
        (process as any).resourcesPath = '/mock/resources/path';
        const assetPath = (TemplateService as any).getAssetPath('test.json');
        expect(path.join).toHaveBeenCalledWith(
          '/mock/resources/path',
          'assets',
          'test.json',
        );
        expect(assetPath).toBe('/mock/resources/path/assets/test.json');
      });
    });

    describe('generateFieldName', () => {
      // Test case: Checks that `generateFieldName` produces unique field names that match the expected format (e.g., `field_X_UUID`).
      it('should generate a unique field name with expected format', () => {
        const fieldName1 = (TemplateService as any).generateFieldName();
        const fieldName2 = (TemplateService as any).generateFieldName();

        expect(fieldName1).toMatch(/^field_\d+_[a-z0-9]{9}$/);
        expect(fieldName2).toMatch(/^field_\d+_[a-z0-9]{9}$/);
        expect(fieldName1).not.toBe(fieldName2);
      });
    });

    describe('getPredefinedNarrativeTemplates', () => {
      const mockPredefinedTemplatesFile: PredefinedTemplatesFile = {
        world_templates: [],
        narrative_templates: [
          {
            name: 'Chapter',
            label: 'Глава',
            category: EntityType.Narrative,
            fields: [],
            weight: 10,
          },
          {
            name: 'Book',
            label: 'Книга',
            category: EntityType.Narrative,
            fields: [],
            weight: 20,
          },
        ],
      };

      // Test case: Ensures that predefined narrative templates are read from the asset file and returned sorted by their 'weight' in descending order.
      it('should read and return predefined narrative templates sorted by weight', async () => {
        (fs.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(mockPredefinedTemplatesFile),
        );

        const templates =
          await TemplateService.getPredefinedNarrativeTemplates();

        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(templates).toHaveLength(2);
        expect(templates[0].name).toBe('Book'); // Sorted by weight descending
        expect(templates[1].name).toBe('Chapter');
      });

      // Test case: Confirms that an empty array is returned and an error is logged via `notificationService` if reading the predefined templates file fails.
      it('should return an empty array and log error if file reading fails', async () => {
        (fs.readFile as jest.Mock).mockRejectedValueOnce(
          new Error('File not found'),
        );

        const templates =
          await TemplateService.getPredefinedNarrativeTemplates();

        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(templates).toHaveLength(0);
        expect(notificationService.error).toHaveBeenCalledTimes(1);
        expect(notificationService.error).toHaveBeenCalledWith(
          'Ошибка чтения файла предустановленных шаблонов нарратива:',
          'Error: File not found',
        );
      });

      // Test case: Verifies that an empty array is returned if the 'narrative_templates' property is undefined in the predefined templates file, without logging an error.
      it('should return an empty array if narrative_templates is undefined in the file', async () => {
        const mockPredefinedTemplatesFileWithoutNarrative: PredefinedTemplatesFile =
          {
            world_templates: [],
            narrative_templates: undefined, // Explicitly undefined
          };
        (fs.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(mockPredefinedTemplatesFileWithoutNarrative),
        );

        const templates =
          await TemplateService.getPredefinedNarrativeTemplates();

        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(templates).toHaveLength(0);
        expect(notificationService.error).not.toHaveBeenCalled();
      });
    });

    describe('getPredefinedTemplates', () => {
      const mockPredefinedTemplatesFile: PredefinedTemplatesFile = {
        world_templates: [
          {
            name: 'Location',
            category: EntityType.WorldObject,
            fields: [],
          },
          {
            name: 'Character',
            category: EntityType.WorldObject,
            fields: [],
          },
        ],
        narrative_templates: [],
      };

      // Test case: Ensures that predefined world templates are read from the asset file and returned correctly.
      it('should read and return predefined world templates', async () => {
        (fs.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(mockPredefinedTemplatesFile),
        );

        const templates = await TemplateService.getPredefinedTemplates();

        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(templates).toHaveLength(2);
        expect(templates[0].name).toBe('Location');
        expect(templates[1].name).toBe('Character');
      });

      // Test case: Confirms that an empty array is returned and an error is logged via `notificationService` if reading the predefined templates file fails for world templates.
      it('should return an empty array and log error if file reading fails', async () => {
        (fs.readFile as jest.Mock).mockRejectedValueOnce(
          new Error('File not found'),
        );

        const templates = await TemplateService.getPredefinedTemplates();

        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(templates).toHaveLength(0);
        expect(notificationService.error).toHaveBeenCalledTimes(1);
        expect(notificationService.error).toHaveBeenCalledWith(
          'Ошибка чтения файла предустановленных шаблонов:',
          'Error: File not found',
        );
      });

      // Test case: Verifies that an empty array is returned if the 'world_templates' property is undefined in the predefined templates file, without logging an error.
      it('should return an empty array if world_templates is undefined in the file', async () => {
        const mockPredefinedTemplatesFileWithoutWorld: PredefinedTemplatesFile =
          {
            world_templates: undefined, // Explicitly undefined
            narrative_templates: [],
          };
        (fs.readFile as jest.Mock).mockResolvedValueOnce(
          JSON.stringify(mockPredefinedTemplatesFileWithoutWorld),
        );

        const templates = await TemplateService.getPredefinedTemplates();

        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(templates).toHaveLength(0);
        expect(notificationService.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('Instance Methods', () => {
    describe('importTemplate', () => {
      // Test case: Verifies that `importTemplate` successfully imports a world object template and returns the corresponding newly created entity.
      it('should import a template and return the created entity', async () => {
        const mockTemplateData: PredefinedTemplate = {
          name: 'New Location',
          category: EntityType.WorldObject,
          fields: [
            { name: 'desc_field', label: 'Description', comment: 'Details' },
          ],
        };
        const mockCreatedTemplate = {
          id: 1,
          name: 'New Location',
          export_name: 'new_location',
          category: EntityType.WorldObject,
          fields_schema: JSON.stringify([
            { name: 'desc_field', label: 'Description', comment: 'Details' },
          ]),
          is_visible: true,
          weight: 0,
        };

        templateDao.createTemplate.mockReturnValue(1);
        templateDao.getTemplate.mockReturnValue(mockCreatedTemplate);

        const result = await service.importTemplate(mockTemplateData);

        expect(templateDao.createTemplate).toHaveBeenCalledTimes(1);
        expect(templateDao.createTemplate).toHaveBeenCalledWith(
          'New Location',
          'New Location', // exportName for predefined templates
          EntityType.WorldObject,
          JSON.stringify([
            { name: 'desc_field', label: 'Description', comment: 'Details' },
          ]),
          0,
        );
        expect(templateDao.getTemplate).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockCreatedTemplate);
      });

      // Test case: Confirms that `importTemplate` correctly handles narrative templates, using the 'label' as `nameToStore` and preserving the 'weight'.
      it('should handle narrative templates correctly with label as nameToStore and weight', async () => {
        const mockTemplateData: PredefinedTemplate = {
          name: 'Chapter',
          label: 'Глава',
          category: EntityType.Narrative,
          fields: [],
          weight: 10,
        };
        const mockCreatedTemplate = {
          id: 2,
          name: 'Глава',
          export_name: 'Chapter',
          category: EntityType.Narrative,
          fields_schema: '[]',
          is_visible: true,
          weight: 10,
        };

        templateDao.createTemplate.mockReturnValue(2);
        templateDao.getTemplate.mockReturnValue(mockCreatedTemplate);

        const result = await service.importTemplate(mockTemplateData);

        expect(templateDao.createTemplate).toHaveBeenCalledWith(
          'Глава', // label for narrative
          'Chapter', // exportName
          EntityType.Narrative,
          '[]',
          10,
        );
        expect(result).toEqual(mockCreatedTemplate);
      });
    });

    describe('createTemplate', () => {
      // Test case: Checks that `createTemplate` generates unique field names and an export name, then successfully creates and returns a new template.
      it('should create a new template with generated field names and export name', () => {
        // Mock generateFieldName to produce predictable names for testing
        const generateFieldNameSpy = jest
          .spyOn(TemplateService as any, 'generateFieldName')
          .mockReturnValueOnce('field_1')
          .mockReturnValueOnce('field_2');
        (generateExportName as jest.Mock).mockReturnValue(
          'generated_export_name',
        );

        const mockFields = [
          { label: 'Field One', comment: 'Comment One' },
          { label: 'Field Two' },
        ];
        const mockCreatedTemplate = {
          id: 3,
          name: 'Custom Template',
          export_name: 'generated_export_name',
          category: EntityType.WorldObject,
          fields_schema: JSON.stringify([
            { name: 'field_1', label: 'Field One', comment: 'Comment One' },
            { name: 'field_2', label: 'Field Two', comment: undefined },
          ]),
          is_visible: true, // Corrected from is_archived
          weight: 0,
        };

        templateDao.createTemplate.mockReturnValue(3);
        templateDao.getTemplate.mockReturnValue(mockCreatedTemplate);

        const result = service.createTemplate(
          'Custom Template',
          EntityType.WorldObject,
          mockFields,
        );

        expect(generateFieldNameSpy).toHaveBeenCalledTimes(2);
        expect(generateExportName).toHaveBeenCalledTimes(1);
        expect(templateDao.createTemplate).toHaveBeenCalledWith(
          'Custom Template',
          'generated_export_name',
          EntityType.WorldObject,
          JSON.stringify([
            { name: 'field_1', label: 'Field One', comment: 'Comment One' },
            { name: 'field_2', label: 'Field Two', comment: undefined },
          ]),
          0,
        );
        expect(templateDao.getTemplate).toHaveBeenCalledWith(3);
        expect(result).toEqual(mockCreatedTemplate);
      });
    });

    describe('getTemplate', () => {
      // Test case: Ensures that `getTemplate` retrieves and returns a template by its unique ID.
      it('should return a template by id', () => {
        const mockTemplate = {
          id: 1,
          name: 'Test Template',
          export_name: 'test_template',
          category: EntityType.WorldObject,
          fields_schema: '[]',
          is_visible: true,
          weight: 0,
        };
        templateDao.getTemplate.mockReturnValue(mockTemplate);

        const result = service.getTemplate(1);

        expect(templateDao.getTemplate).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockTemplate);
      });

      // Test case: Confirms that `getTemplate` returns `undefined` if no template is found for the given ID.
      it('should return undefined if template not found', () => {
        templateDao.getTemplate.mockReturnValue(undefined);

        const result = service.getTemplate(99);

        expect(templateDao.getTemplate).toHaveBeenCalledWith(99);
        expect(result).toBeUndefined();
      });
    });

    describe('getNarrativeTemplates', () => {
      // Test case: Verifies that `getNarrativeTemplates` retrieves all narrative templates and returns them sorted by weight in descending order.
      it('should return narrative templates sorted by weight descending', () => {
        const mockTemplates = [
          {
            id: 1,
            name: 'Chapter',
            export_name: 'chapter',
            category: EntityType.Narrative,
            fields_schema: '[]',
            is_visible: true,
            weight: 10,
          },
          {
            id: 2,
            name: 'Book',
            export_name: 'book',
            category: EntityType.Narrative,
            fields_schema: '[]',
            is_visible: true,
            weight: 20,
          },
          {
            id: 3,
            name: 'Scene',
            export_name: 'scene',
            category: EntityType.Narrative,
            fields_schema: '[]',
            is_visible: true,
            weight: 5,
          },
          {
            id: 4,
            name: 'Location',
            export_name: 'location',
            category: EntityType.WorldObject,
            fields_schema: '[]',
            is_visible: true,
            weight: 0,
          }, // Should be filtered out
        ];
        templateDao.getAllTemplates.mockImplementation(
          (includeArchived, category) => {
            return mockTemplates.filter(
              (t) => category === undefined || t.category === category,
            ) as any;
          },
        );

        const result = service.getNarrativeTemplates();

        expect(templateDao.getAllTemplates).toHaveBeenCalledWith(
          false,
          EntityType.Narrative,
        );
        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('Book');
        expect(result[1].name).toBe('Chapter');
        expect(result[2].name).toBe('Scene');
      });
    });

    describe('getAllTemplates', () => {
      // Test case: Ensures that `getAllTemplates` correctly calls the DAO method with the specified `includeArchived` and `category` arguments.
      it('should call templateDao.getAllTemplates with correct arguments', () => {
        const mockTemplates = [
          {
            id: 1,
            name: 'Test',
            export_name: 'test',
            category: EntityType.WorldObject,
            fields_schema: '[]',
            is_visible: true,
            weight: 0,
          },
        ];
        templateDao.getAllTemplates.mockReturnValue(mockTemplates as any);

        const result = service.getAllTemplates(true, EntityType.WorldObject);

        expect(templateDao.getAllTemplates).toHaveBeenCalledWith(
          true,
          EntityType.WorldObject,
        );
        expect(result).toEqual(mockTemplates);
      });

      // Test case: Confirms that `getAllTemplates` uses default values (`includeArchived=false`, `category=undefined`) when no arguments are provided.
      it('should default to includeArchived=false and category=undefined', () => {
        const mockTemplates = [
          {
            id: 1,
            name: 'Test',
            export_name: 'test',
            category: EntityType.WorldObject,
            fields_schema: '[]',
            is_visible: true,
            weight: 0,
          },
        ];
        templateDao.getAllTemplates.mockReturnValue(mockTemplates as any);

        const result = service.getAllTemplates();

        expect(templateDao.getAllTemplates).toHaveBeenCalledWith(
          false,
          undefined,
        );
        expect(result).toEqual(mockTemplates);
      });
    });

    describe('toggleTemplateVisibility', () => {
      // Test case: Verifies that `toggleTemplateVisibility` returns `false` and logs an error if the template is in use by world objects.
      it('should return false and show error if template is in use', () => {
        worldObjectDao.countWorldObjectsByTemplateId.mockReturnValue(5);

        const result = service.toggleTemplateVisibility(1);

        expect(
          worldObjectDao.countWorldObjectsByTemplateId,
        ).toHaveBeenCalledWith(1);
        expect(notificationService.error).toHaveBeenCalledTimes(1);
        expect(notificationService.error).toHaveBeenCalledWith(
          'Этот шаблон используется 5 объектом(ами) и не может быть заархивирован.',
        );
        expect(templateDao.toggleTemplateVisibility).not.toHaveBeenCalled();
        expect(result).toBe(false);
      });

      // Test case: Confirms that `toggleTemplateVisibility` successfully toggles the template's visibility if it is not in use by any world objects.
      it('should toggle visibility if template is not in use', () => {
        worldObjectDao.countWorldObjectsByTemplateId.mockReturnValue(0);
        templateDao.toggleTemplateVisibility.mockReturnValue(true);

        const result = service.toggleTemplateVisibility(1);

        expect(
          worldObjectDao.countWorldObjectsByTemplateId,
        ).toHaveBeenCalledWith(1);
        expect(notificationService.error).not.toHaveBeenCalled();
        expect(templateDao.toggleTemplateVisibility).toHaveBeenCalledWith(1);
        expect(result).toBe(true);
      });
    });

    describe('renameTemplate', () => {
      // Test case: Ensures that `renameTemplate` correctly calls the DAO method to rename a template with the provided ID and new name.
      it('should call templateDao.renameTemplate with correct arguments', () => {
        service.renameTemplate(1, 'New Name');
        expect(templateDao.renameTemplate).toHaveBeenCalledWith(1, 'New Name');
      });
    });

    describe('updateTemplateSchema', () => {
      // Test case: Verifies that `updateTemplateSchema` correctly updates an existing template's schema, generating names for new fields and preserving existing ones.
      it('should update template schema with new and generated field names', () => {
        const generateFieldNameSpy = jest
          .spyOn(TemplateService as any, 'generateFieldName')
          .mockReturnValueOnce('generated_field_3');

        const mockUpdatedTemplate = {
          id: 1,
          name: 'Test Template',
          export_name: 'test_template',
          category: EntityType.WorldObject,
          fields_schema: JSON.stringify([
            { name: 'field_1', label: 'Old Field' },
            { name: 'generated_field_3', label: 'New Field' },
          ]),
          is_visible: true,
          weight: 0,
        };

        templateDao.getTemplate.mockReturnValue(mockUpdatedTemplate);

        const newFields = [
          { name: 'field_1', label: 'Old Field' }, // Existing field
          { label: 'New Field', comment: 'New Comment' }, // New field, needs name generation
        ];

        const result = service.updateTemplateSchema(1, newFields);

        expect(generateFieldNameSpy).toHaveBeenCalledTimes(1);
        expect(templateDao.updateTemplateSchema).toHaveBeenCalledTimes(1);
        expect(templateDao.updateTemplateSchema).toHaveBeenCalledWith(
          1,
          JSON.stringify([
            { name: 'field_1', label: 'Old Field', comment: undefined }, // comment will be undefined if not provided
            {
              name: 'generated_field_3',
              label: 'New Field',
              comment: 'New Comment',
            },
          ]),
        );
        expect(templateDao.getTemplate).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockUpdatedTemplate);
        generateFieldNameSpy.mockRestore();
      });
    });
  });
});
