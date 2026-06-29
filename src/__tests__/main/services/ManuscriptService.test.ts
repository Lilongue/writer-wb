import path from 'path';
import { ManuscriptService } from '../../../main/services/ManuscriptService';
import { NarrativeDao } from '../../../main/data/daos/NarrativeDao';
import fileSystemService from '../../../main/services/FileSystemService';
import MainNotificationService from '../../../main/services/NotificationService';
import { NarrativeItem } from '../../../common/types';

// Mocks
jest.mock('../../../main/data/daos/NarrativeDao');
jest.mock('../../../main/services/FileSystemService');
jest.mock('../../../main/services/NotificationService');

const MockNarrativeDao = NarrativeDao as jest.MockedClass<typeof NarrativeDao>;
const mockFileSystemService = fileSystemService as jest.Mocked<
  typeof fileSystemService
>;
const mockNotificationService = MainNotificationService as jest.Mocked<
  typeof MainNotificationService
>;

const PROJECT_ROOT = '/fake/project';

// Sample data
const mockNarrativeItems: NarrativeItem[] = [
  {
    id: 1,
    title: 'Chapter 1',
    name: 'Test Name 1',
    template_id: 1,
    parent_id: null,
    sort_order: 1,
    file_path: 'chapter1.md',
    description: 'Desc 1',
  },
  {
    id: 2,
    title: 'Section 1.1',
    name: 'Test Name 2',
    template_id: 1,
    parent_id: 1,
    sort_order: 1,
    file_path: 'section1-1.md',
    description: 'Desc 2',
  },
  {
    id: 3,
    title: 'Chapter 2',
    name: 'Test Name 3',
    template_id: 1,
    parent_id: null,
    sort_order: 2,
    file_path: '',
    description: 'Chapter 2 description.',
  },
  {
    id: 4,
    title: 'Standalone',
    name: 'Test Name 4',
    template_id: 1,
    parent_id: null,
    sort_order: 3,
    file_path: 'standalone.md',
    description: 'Desc 4',
  },
  // Adding deep nested items for coverage
  {
    id: 5,
    title: 'Section 1.1.1',
    name: 'Test Name 5',
    template_id: 1,
    parent_id: 2,
    sort_order: 1,
    file_path: 'section1-1-1.md',
    description: 'Desc 5',
  },
  {
    id: 6,
    title: 'Section 1.1.1.1',
    name: 'Test Name 6',
    template_id: 1,
    parent_id: 5,
    sort_order: 1,
    file_path: 'section1-1-1-1.md',
    description: 'Desc 6',
  },
  {
    id: 7,
    title: 'Section 1.1.1.1.1',
    name: 'Test Name 7',
    template_id: 1,
    parent_id: 6,
    sort_order: 1,
    file_path: 'section1-1-1-1-1.md',
    description: 'Desc 7',
  },
  {
    id: 8,
    title: 'Section 1.1.1.1.1.1',
    name: 'Test Name 8',
    template_id: 1,
    parent_id: 7,
    sort_order: 1,
    file_path: 'section1-1-1-1-1-1.md',
    description: 'Desc 8',
  },
  {
    id: 9,
    title: 'Section 1.1.1.1.1.1.1',
    name: 'Test Name 9',
    template_id: 1,
    parent_id: 8,
    sort_order: 1,
    file_path: 'section1-1-1-1-1-1-1.md',
    description: 'Desc 9',
  },
];

describe('ManuscriptService', () => {
  let manuscriptService: ManuscriptService;
  let mockGetProjectRoot: jest.Mock<string | null>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock NarrativeDao implementation
    MockNarrativeDao.prototype.getNarrativeItems.mockReturnValue(
      JSON.parse(JSON.stringify(mockNarrativeItems)), // Deep copy
    );

    // Mock FileSystemService implementation
    mockFileSystemService.readFile.mockImplementation(async (filePath) => {
      const fileName = path.basename(filePath);
      if (fileName === 'chapter1.md') {
        return 'Content of Chapter 1.';
      }
      if (fileName === 'section1-1.md') {
        return 'Content of Section 1.1.';
      }
      if (fileName === 'standalone.md') {
        return 'Content of Standalone.';
      }
      if (fileName === 'section1-1-1.md') {
        return 'Content of Section 1.1.1.';
      }
      if (fileName === 'section1-1-1-1.md') {
        return 'Content of Section 1.1.1.1.';
      }
      if (fileName === 'section1-1-1-1-1.md') {
        return 'Content of Section 1.1.1.1.1.';
      }
      if (fileName === 'section1-1-1-1-1-1.md') {
        return 'Content of Section 1.1.1.1.1.1.';
      }
      if (fileName === 'section1-1-1-1-1-1-1.md') {
        return 'Content of Section 1.1.1.1.1.1.1.';
      }
      throw new Error(`File not found: ${filePath}`);
    });

    // Mock getProjectRoot
    mockGetProjectRoot = jest.fn().mockReturnValue(PROJECT_ROOT);

    // Create a new service instance for each test
    manuscriptService = new ManuscriptService(
      new MockNarrativeDao({} as any),
      mockGetProjectRoot,
    );
  });

  describe('assembleNarrative', () => {
    it('should throw an error if project root is not set', async () => {
      mockGetProjectRoot.mockReturnValue(null);
      await expect(
        manuscriptService.assembleNarrative(null, true),
      ).rejects.toThrow('Проект не открыт. Невозможно собрать рукопись.');
    });

    it('should return an empty string if there are no narrative items', async () => {
      MockNarrativeDao.prototype.getNarrativeItems.mockReturnValue([]);
      const result = await manuscriptService.assembleNarrative(null, true);
      expect(result).toBe('');
    });

    it('should throw an error if the root item is not found', async () => {
      await expect(
        manuscriptService.assembleNarrative(999, true),
      ).rejects.toThrow('Элемент повествования с ID 999 не найден.');
    });

    it('should assemble the entire narrative with headers', async () => {
      const result = await manuscriptService.assembleNarrative(null, true);

      expect(result).toContain('# Chapter 1');
      expect(result).toContain('Content of Chapter 1.');
      expect(result).toContain('## Section 1.1');
      expect(result).toContain('Content of Section 1.1.');
      expect(result).toContain('# Chapter 2');
      expect(result).toContain('Chapter 2 description.');
      expect(result).toContain('# Standalone');
      expect(result).toContain('Content of Standalone.');
    });

    it('should assemble the entire narrative without headers', async () => {
      const result = await manuscriptService.assembleNarrative(null, false);

      expect(result).not.toContain('# Chapter 1');
      expect(result).toContain('Content of Chapter 1.');
      expect(result).not.toContain('## Section 1.1');
      expect(result).toContain('Content of Section 1.1.');
      expect(result).not.toContain('# Chapter 2');
      expect(result).toContain('Chapter 2 description.');
    });

    it('should assemble a subtree starting from a specific rootItemId with headers', async () => {
      const result = await manuscriptService.assembleNarrative(1, true);

      expect(result).toContain('# Chapter 1');
      expect(result).toContain('Content of Chapter 1.');
      expect(result).toContain('## Section 1.1');
      expect(result).toContain('Content of Section 1.1.');

      expect(result).not.toContain('# Chapter 2');
      expect(result).not.toContain('Chapter 2 description.');
      expect(result).not.toContain('# Standalone');
    });

    it('should assemble a subtree starting from a nested rootItemId', async () => {
      const result = await manuscriptService.assembleNarrative(2, true);

      expect(result).toContain('# Section 1.1');
      expect(result).toContain('Content of Section 1.1.');

      expect(result).not.toContain('# Chapter 1');
      expect(result).not.toContain('# Chapter 2');
    });

    it('should handle file read errors gracefully', async () => {
      const error = new Error('Read error!');
      mockFileSystemService.readFile.mockRejectedValue(error);

      const result = await manuscriptService.assembleNarrative(null, true);

      expect(mockNotificationService.error).toHaveBeenCalledTimes(8);
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        `Ошибка чтения файла элемента повествования ${path.join(PROJECT_ROOT, 'chapter1.md')}`,
        'Error: Read error!',
      );
      expect(result).toContain(
        '**[Ошибка: Не удалось прочитать файл "chapter1.md"]**',
      );
    });

    it('should use description as fallback when file_path is null', async () => {
      const result = await manuscriptService.assembleNarrative(3, true);
      expect(result).toContain('# Chapter 2');
      expect(result).toContain('Chapter 2 description.');
    });

    it('should maintain correct order of items', async () => {
      const unsortedItems: NarrativeItem[] = [
        {
          id: 2,
          name: 'Test Name 2',
          template_id: 1,
          title: 'Chapter 2',
          parent_id: null,
          sort_order: 2,
          file_path: 'c2.md',
        },
        {
          id: 1,
          name: 'Test Name 1',
          template_id: 1,
          title: 'Chapter 1',
          parent_id: null,
          sort_order: 1,
          file_path: 'c1.md',
        },
      ];
      MockNarrativeDao.prototype.getNarrativeItems.mockReturnValue(
        unsortedItems,
      );
      mockFileSystemService.readFile.mockImplementation(async (p) =>
        path.basename(p),
      );

      const result = await manuscriptService.assembleNarrative(null, true);
      const chapter1Pos = result.indexOf('# Chapter 1');
      const chapter2Pos = result.indexOf('# Chapter 2');

      expect(chapter1Pos).toBeGreaterThan(-1);
      expect(chapter2Pos).toBeGreaterThan(-1);
      expect(chapter1Pos).toBeLessThan(chapter2Pos);
    });

    it('should cap header depth at H6 for deeply nested items', async () => {
      const result = await manuscriptService.assembleNarrative(null, true);
      expect(result).toContain('###### Section 1.1.1.1.1.1.1'); // Depth 7, should be H6
    });
  });
});
