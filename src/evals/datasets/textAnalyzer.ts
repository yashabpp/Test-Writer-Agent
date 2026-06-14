/**
 * textAnalyzer.ts
 * Text analysis utilities: word/sentence counting, reading time, top words.
 */

export class TextAnalyzerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextAnalyzerError';
  }
}

/**
 * Counts the number of words in a string.
 * Words are separated by whitespace.
 */
export function wordCount(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Counts the number of sentences.
 * Sentences are terminated by ., !, or ?
 */
export function sentenceCount(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const matches = text.match(/[^.!?]*[.!?]/g);
  return matches ? matches.length : 0;
}

/**
 * Estimates reading time in minutes.
 * Assumes an average reading speed of 200 words per minute.
 * @param wordsPerMinute Defaults to 200.
 * @returns Reading time in minutes (rounded up to nearest 0.5).
 */
export function readingTime(text: string, wordsPerMinute = 200): number {
  if (wordsPerMinute <= 0) throw new TextAnalyzerError('wordsPerMinute must be positive');
  const words = wordCount(text);
  const minutes = words / wordsPerMinute;
  return Math.ceil(minutes * 2) / 2; // round to nearest 0.5
}

/**
 * Returns the top N most frequent words in the text.
 * Ignores case and punctuation.
 * @param n Defaults to 10.
 */
export function topWords(text: string, n = 10): Array<{ word: string; count: number }> {
  if (n <= 0) throw new TextAnalyzerError('n must be positive');
  if (!text || typeof text !== 'string') return [];

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, n);
}

/**
 * Returns the character count (with and without spaces).
 */
export function charCount(text: string): { withSpaces: number; withoutSpaces: number } {
  if (!text || typeof text !== 'string') return { withSpaces: 0, withoutSpaces: 0 };
  return {
    withSpaces: text.length,
    withoutSpaces: text.replace(/\s/g, '').length,
  };
}

/**
 * Computes the Flesch Reading Ease score.
 * Higher scores indicate easier readability.
 */
export function fleschScore(text: string): number {
  const words = wordCount(text);
  const sentences = sentenceCount(text);
  if (words === 0 || sentences === 0) return 0;

  // Count syllables (simplified: count vowel groups)
  const syllables = text
    .toLowerCase()
    .replace(/[^a-z]/g, ' ')
    .split(/\s+/)
    .reduce((acc, word) => {
      const s = word.match(/[aeiouy]+/gi);
      return acc + (s ? s.length : 1);
    }, 0);

  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}
