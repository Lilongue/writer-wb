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

export default cleanNameInput;
