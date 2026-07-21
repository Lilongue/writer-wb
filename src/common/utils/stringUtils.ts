export function cleanNameInput(name: string): string {
  // First, trim leading/trailing whitespace
  const trimmed = name.trim();
  // Then, remove any characters that are not:
  // - Latin letters (a-zA-Z)
  // - Cyrillic letters (а-яА-ЯёЁ)
  // - Digits (0-9)
  // - Common punctuation marks (.,!?'"-_)
  // - Spaces (\s)
  // The hyphen '-' is included as a valid character within the set.
  // The 'g' flag ensures all occurrences are replaced.
  return trimmed.replace(/[^a-zA-Zа-яА-ЯёЁ0-9.,!?'"-_\s]/g, '');
}

export function generateExportName(): string {
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `template_${Date.now()}_${randomPart}`;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\|?*]+/g, '_') // Замена недопустимых символов на '_'
    .replace(/\s/g, '-') // Замена пробелов на '-'
    .replace(/^-+|-+$/g, '') // Удаление начальных/конечных дефисов
    .replace(/--+/g, '-'); // Замена нескольких дефисов на один
}

export function slugify(text: string): string {
  const translit: { [key: string]: string } = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'shch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    А: 'A',
    Б: 'B',
    В: 'V',
    Г: 'G',
    Д: 'D',
    Е: 'E',
    Ё: 'Yo',
    Ж: 'Zh',
    З: 'Z',
    И: 'I',
    Й: 'Y',
    К: 'K',
    Л: 'L',
    М: 'M',
    Н: 'N',
    О: 'O',
    П: 'P',
    Р: 'R',
    С: 'S',
    Т: 'T',
    У: 'U',
    Ф: 'F',
    Х: 'H',
    Ц: 'C',
    Ч: 'Ch',
    Ш: 'Sh',
    Щ: 'Shch',
    Ъ: '',
    Ы: 'Y',
    Ь: '',
    Э: 'E',
    Ю: 'Yu',
    Я: 'Ya',
  };

  let result = '';
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    result += translit[char] || char;
  }

  return result
    .toLowerCase()
    .replace(/\s+/g, '-') // Замена пробелов на -
    .replace(/[^\w-]+/g, '') // Удаление всех не-буквенно-цифровых символов
    .replace(/--+/g, '-') // Замена нескольких - на один
    .replace(/^-+/, '') // Удаление - в начале
    .replace(/-+$/, ''); // Удаление - в конце
}
