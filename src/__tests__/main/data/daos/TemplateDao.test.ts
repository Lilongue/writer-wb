import { TemplateDao } from '../../../../main/data/daos/TemplateDao';
import { EntityTemplate, EntityType } from '../../../../common/types';

const mockStatement = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

const mockDb = {
  prepare: jest.fn().mockReturnValue(mockStatement),
};

jest.mock('better-sqlite3', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockDb),
  };
});

describe('TemplateDao', () => {
  let templateDao: TemplateDao;

  beforeEach(() => {
    jest.clearAllMocks();
    const getDbMock = () => mockDb as any;
    templateDao = new TemplateDao(getDbMock);
  });

  describe('getTemplateById', () => {
    // Test case: Retrieve a template by its unique identifier.
    it('should return a template by its ID', () => {
      const mockTemplate = { id: 1, name: 'Test Template' };
      mockStatement.get.mockReturnValue(mockTemplate);

      const result = templateDao.getTemplateById(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM entity_templates WHERE id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('findTemplateByName', () => {
    // Test case: Find a template using its name and category.
    it('should find and return a template by name and category', () => {
      const mockTemplateId = { id: 1 };
      mockStatement.get.mockReturnValue(mockTemplateId);

      const result = templateDao.findTemplateByName('Test', 'world');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT id FROM entity_templates WHERE name = ? AND category = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith('Test', 'world');
      expect(result).toEqual(mockTemplateId);
    });
  });

  describe('createTemplate', () => {
    // Test case: Create a new template with all provided parameters.
    it('should create a new template and return its ID', () => {
      const newId = 5;
      mockStatement.run.mockReturnValue({ lastInsertRowid: newId });

      const result = templateDao.createTemplate(
        'New Template',
        'exportName',
        'narrative',
        '{}',
        10,
      );

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'INSERT INTO entity_templates (name, export_name, category, fields_schema, weight) VALUES (?, ?, ?, ?, ?)',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'New Template',
        'exportName',
        'narrative',
        '{}',
        10,
      );
      expect(result).toBe(newId);
    });

    // Test case: Create a new template and verify that a default weight of 0 is used if none is specified.
    it('should create a new template with default weight if not provided', () => {
      const newId = 6;
      mockStatement.run.mockReturnValue({ lastInsertRowid: newId });

      const result = templateDao.createTemplate(
        'No Weight Template',
        'exportNameNoWeight',
        'world',
        '{}',
      );

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'INSERT INTO entity_templates (name, export_name, category, fields_schema, weight) VALUES (?, ?, ?, ?, ?)',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(
        'No Weight Template',
        'exportNameNoWeight',
        'world',
        '{}',
        0,
      );
      expect(result).toBe(newId);
    });
  });

  describe('getTemplate', () => {
    // Test case: Retrieve a template by its unique identifier.
    it('should return a template by its ID', () => {
      const mockTemplate: EntityTemplate = {
        id: 1,
        name: 'Test Template',
        export_name: 'exportName',
        category: EntityType.WorldObject,
        fields_schema: '{}',
        is_visible: true,
        weight: 0,
      };
      mockStatement.get.mockReturnValue(mockTemplate);

      const result = templateDao.getTemplate(1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM entity_templates WHERE id = ?',
      );
      expect(mockStatement.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('getAllTemplates', () => {
    const mockTemplates: EntityTemplate[] = [
      {
        id: 1,
        name: 'T1',
        category: EntityType.WorldObject,
        is_visible: true,
        export_name: 'e1',
        fields_schema: '{}',
        weight: 0,
      },
      {
        id: 2,
        name: 'T2',
        category: EntityType.Narrative,
        is_visible: true,
        export_name: 'e2',
        fields_schema: '{}',
        weight: 0,
      },
    ];

    // Test case: Retrieve all visible templates when no parameters are provided, ensuring archived templates are excluded.
    it('should return all visible templates by default', () => {
      mockStatement.all.mockReturnValue(mockTemplates);
      const result = templateDao.getAllTemplates();
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM entity_templates WHERE is_visible = TRUE',
      );
      expect(mockStatement.all).toHaveBeenCalledWith();
      expect(result).toEqual(mockTemplates);
    });

    // Test case: Retrieve all templates, including archived ones, when specifically requested.
    it('should include archived templates if requested', () => {
      mockStatement.all.mockReturnValue(mockTemplates);
      const result = templateDao.getAllTemplates(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM entity_templates',
      );
      expect(mockStatement.all).toHaveBeenCalledWith();
      expect(result).toEqual(mockTemplates);
    });

    // Test case: Filter templates by category while still excluding archived templates by default.
    it('should filter by category if provided', () => {
      mockStatement.all.mockReturnValue([mockTemplates[0]]);
      const result = templateDao.getAllTemplates(false, 'world');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM entity_templates WHERE is_visible = TRUE AND category = ?',
      );
      expect(mockStatement.all).toHaveBeenCalledWith('world');
      expect(result).toEqual([mockTemplates[0]]);
    });

    // Test case: Filter templates by category and include archived templates.
    it('should include archived and filter by category', () => {
      mockStatement.all.mockReturnValue([mockTemplates[0]]);
      const result = templateDao.getAllTemplates(true, 'world');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM entity_templates WHERE category = ?',
      );
      expect(mockStatement.all).toHaveBeenCalledWith('world');
      expect(result).toEqual([mockTemplates[0]]);
    });
  });

  describe('toggleTemplateVisibility', () => {
    // Test case: Toggle the visibility status of an existing template and confirm the update.
    it('should toggle the visibility of a template and return true on success', () => {
      mockStatement.run.mockReturnValue({ changes: 1 });
      const result = templateDao.toggleTemplateVisibility(1);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE entity_templates SET is_visible = NOT is_visible WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    // Test case: Attempt to toggle visibility for a non-existent template. Expect no changes and a false return.
    it('should return false if no rows were updated', () => {
      mockStatement.run.mockReturnValue({ changes: 0 });
      const result = templateDao.toggleTemplateVisibility(99);
      expect(result).toBe(false);
    });
  });

  describe('renameTemplate', () => {
    // Test case: Update the name of an existing template.
    it('should update the name of a template', () => {
      templateDao.renameTemplate(1, 'New Name');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE entity_templates SET name = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith('New Name', 1);
    });
  });

  describe('updateTemplateSchema', () => {
    // Test case: Update the JSON schema defining the custom fields of a template.
    it('should update the schema of a template', () => {
      const newSchema = '{"field":"new"}';
      templateDao.updateTemplateSchema(1, newSchema);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE entity_templates SET fields_schema = ? WHERE id = ?',
      );
      expect(mockStatement.run).toHaveBeenCalledWith(newSchema, 1);
    });
  });
});
