/**
 * csvParser.ts
 * CSV parsing and serialization utilities.
 */

export interface CsvParseOptions {
  delimiter?: string;       // Default: ','
  hasHeader?: boolean;      // Default: true
  trimValues?: boolean;     // Default: true
  skipEmptyLines?: boolean; // Default: true
}

export interface CsvStringifyOptions {
  delimiter?: string;   // Default: ','
  includeHeader?: boolean; // Default: true
}

export class CsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvError';
  }
}

/**
 * Parses a CSV string into an array of objects.
 * The first row is treated as the header row (column names) by default.
 */
export function parseCsv(
  input: string,
  options: CsvParseOptions = {}
): Record<string, string>[] {
  const {
    delimiter = ',',
    hasHeader = true,
    trimValues = true,
    skipEmptyLines = true,
  } = options;

  if (!input || typeof input !== 'string') return [];
  if (!delimiter || delimiter.length !== 1) throw new CsvError('Delimiter must be a single character');

  const lines = input.split(/\r?\n/);
  const filteredLines = skipEmptyLines ? lines.filter((l) => l.trim().length > 0) : lines;

  if (filteredLines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i] as string;
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        values.push(trimValues ? current.trim() : current);
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(trimValues ? current.trim() : current);
    return values;
  };

  if (!hasHeader) {
    return filteredLines.map((line) => {
      const values = parseLine(line);
      return values.reduce<Record<string, string>>((acc, val, i) => {
        acc[`col${i}`] = val;
        return acc;
      }, {});
    });
  }

  const headers = parseLine(filteredLines[0] as string);
  if (headers.length === 0) throw new CsvError('CSV has no header columns');

  return filteredLines.slice(1).map((line, rowIndex) => {
    const values = parseLine(line);
    if (values.length !== headers.length) {
      throw new CsvError(
        `Row ${rowIndex + 2} has ${values.length} columns but header has ${headers.length}`
      );
    }
    return headers.reduce<Record<string, string>>((acc, header, i) => {
      acc[header] = values[i] ?? '';
      return acc;
    }, {});
  });
}

/**
 * Converts an array of objects to a CSV string.
 */
export function stringifyCsv(
  data: Record<string, unknown>[],
  options: CsvStringifyOptions = {}
): string {
  const { delimiter = ',', includeHeader = true } = options;
  if (!delimiter || delimiter.length !== 1) throw new CsvError('Delimiter must be a single character');
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]!);

  const escapeValue = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((row) => headers.map((h) => escapeValue(row[h])).join(delimiter));
  if (includeHeader) return [headers.join(delimiter), ...rows].join('\n');
  return rows.join('\n');
}
