import * as fs from 'fs';
import * as path from 'path';
import { DrugItem, VENCategory } from './types';

export function parseCSV(filePath: string): DrugItem[] {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n');

  const items: DrugItem[] = [];

  // Skip header lines (1-4), data starts at line 5 (index 4)
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',,Всего:')) {
      continue;
    }

    const parsed = parseCSVLine(line);
    if (parsed.length < 6) {
      continue;
    }

    const code = parseInt(parsed[0], 10);
    const name = parsed[1];
    const unit = parsed[2];
    const quantity = parseFloat(parsed[3].replace(',', '.')) || 0;
    const amount = parseFloat(parsed[4].replace(',', '.')) || 0;
    const ven = parsed[5].trim().toUpperCase() as VENCategory;

    if (isNaN(code) || !name || !['V', 'E', 'N'].includes(ven)) {
      continue;
    }

    items.push({
      code,
      name,
      unit,
      quantity,
      amount,
      ven,
    });
  }

  return items;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
