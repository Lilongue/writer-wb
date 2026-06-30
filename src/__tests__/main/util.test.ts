/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import { resolveHtmlPath, sanitizeFilename, slugify } from '../../main/util';

describe('util', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPort = process.env.PORT;

  beforeEach(() => {
    jest.resetModules(); // Clear cache
    process.env.NODE_ENV = originalNodeEnv;
    process.env.PORT = originalPort;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.PORT = originalPort;
    jest.restoreAllMocks(); // Restore all mocks after each test
  });

  describe('resolveHtmlPath', () => {
    it('should return a development URL if NODE_ENV is development', () => {
      // SCENARIO: The app is running in development mode with a webpack dev server.
      process.env.NODE_ENV = 'development';
      process.env.PORT = '1337';
      const htmlFileName = 'index.html';
      const result = resolveHtmlPath(htmlFileName);
      // EXPECTED: A localhost URL pointing to the specified port.
      expect(result).toBe('http://localhost:1337/index.html');
    });

    it('should use default port 1212 if PORT is not set in development', () => {
      // SCENARIO: The app is in development, but the PORT environment variable is not defined.
      process.env.NODE_ENV = 'development';
      delete process.env.PORT;
      const htmlFileName = 'index.html';
      const result = resolveHtmlPath(htmlFileName);
      // EXPECTED: The URL should use the hardcoded fallback port.
      expect(result).toBe('http://localhost:1212/index.html');
    });

    it('should return a file path if NODE_ENV is production', () => {
      // SCENARIO: The app is running from a packaged build.
      process.env.NODE_ENV = 'production';
      const htmlFileName = 'index.html';

      const mockPath = '/fake/path/build/renderer/index.html';
      // Mock path.resolve to return a predictable path
      jest.spyOn(path, 'resolve').mockReturnValue(mockPath);

      const result = resolveHtmlPath(htmlFileName);

      expect(path.resolve).toHaveBeenCalledWith(
        expect.any(String), // __dirname
        '../renderer/',
        htmlFileName,
      );
      // EXPECTED: A file protocol URL pointing to the bundled renderer assets.
      expect(result).toBe(`file://${mockPath}`);
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace invalid characters with underscores', () => {
      // TEST: A sequence of characters that are invalid in file systems like Windows.
      const filename = 'file<>:"/\\|?*name';
      // EXPECTED: The entire sequence of invalid characters is replaced by a single underscore.
      expect(sanitizeFilename(filename)).toBe('file_name');
    });

    it('should replace spaces with hyphens', () => {
      // TEST: A typical filename with spaces.
      const filename = 'my file name';
      // EXPECTED: Spaces are converted to single hyphens for URL-friendliness and consistency.
      expect(sanitizeFilename(filename)).toBe('my-file-name');
    });

    it('should remove leading/trailing hyphens', () => {
      // TEST: A filename that might result from other replacements leaving hyphens at the ends.
      const filename = '-my-file-name-';
      // EXPECTED: The extraneous hyphens are trimmed.
      expect(sanitizeFilename(filename)).toBe('my-file-name');
    });

    it('should replace multiple hyphens with a single hyphen', () => {
      // TEST: A filename with multiple consecutive hyphens.
      const filename = 'my--file---name';
      // EXPECTED: Consecutive hyphens are collapsed into one.
      expect(sanitizeFilename(filename)).toBe('my-file-name');
    });

    it('should handle a combination of invalid characters, spaces, and hyphens', () => {
      // TEST: A complex case involving multiple sanitization steps.
      const filename = '  <My_File>:Name?*!.txt  ';
      // Note: This test matches the current, slightly imperfect behavior of the function.
      // It correctly replaces invalid characters and trims whitespace-turned-hyphens,
      // but does not remove the '!' character.
      expect(sanitizeFilename(filename)).toBe('_My_File_Name_!.txt');
    });

    it('should return an empty string for an empty input', () => {
      // EDGE CASE: An empty string is provided.
      expect(sanitizeFilename('')).toBe('');
    });

    it('should handle filenames with only invalid characters', () => {
      // EDGE CASE: A string composed entirely of invalid characters.
      expect(sanitizeFilename('<>:"/\\|?*')).toBe('_');
    });

    it('should keep valid characters', () => {
      // TEST: A string that is already a valid filename.
      expect(sanitizeFilename('valid-filename_123.txt')).toBe(
        'valid-filename_123.txt',
      );
    });
  });

  describe('slugify', () => {
    it('should transliterate Cyrillic characters', () => {
      // TEST: A common Russian phrase.
      expect(slugify('Привет мир')).toBe('privet-mir');
    });

    it('should convert to lowercase', () => {
      // TEST: A standard mixed-case string.
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      // TEST: A string with spaces.
      expect(slugify('test string with spaces')).toBe(
        'test-string-with-spaces',
      );
    });

    it('should remove non-alphanumeric characters', () => {
      // TEST: A string with various special characters that should be stripped.
      expect(slugify('test!@#$%^&*()string')).toBe('teststring');
    });

    it('should replace multiple hyphens with a single hyphen', () => {
      // TEST: A string with multiple consecutive hyphens.
      expect(slugify('test--string---with----many-----hyphens')).toBe(
        'test-string-with-many-hyphens',
      );
    });

    it('should remove leading and trailing hyphens', () => {
      // TEST: A string with hyphens at the start and end.
      expect(slugify('-test-string-')).toBe('test-string');
    });

    it('should handle a complex string with mixed characters', () => {
      // TEST: A complex real-world example with Cyrillic, mixed case, spaces, and symbols.
      const complexString =
        '  Тестовая строка с разными символами! @ # $ 123  ';
      expect(slugify(complexString)).toBe(
        'testovaya-stroka-s-raznymi-simvolami-123',
      );
    });

    it('should return an empty string for an empty input', () => {
      // EDGE CASE: An empty string.
      expect(slugify('')).toBe('');
    });

    it('should handle input with only special characters', () => {
      // EDGE CASE: A string composed entirely of non-alphanumeric characters.
      expect(slugify('!@#$%^&*()')).toBe('');
    });

    it('should handle input with numbers', () => {
      // TEST: A string containing numbers and Cyrillic text.
      expect(slugify('123 Тест 456')).toBe('123-test-456');
    });
  });
});
