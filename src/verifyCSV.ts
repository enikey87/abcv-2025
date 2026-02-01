import * as fs from 'fs';
import * as path from 'path';

interface ExpectedData {
  file: string;
  rows: number;
  v: number;
  e: number;
  n: number;
}

const expectedData: ExpectedData[] = [
  { file: 'ОПН.csv', rows: 117, v: 82, e: 29, n: 6 },
  { file: 'гастро.csv', rows: 120, v: 75, e: 43, n: 2 },
  { file: 'нерол.csv', rows: 143, v: 111, e: 31, n: 1 },
  { file: 'нефро.csv', rows: 92, v: 66, e: 25, n: 1 },
  { file: 'педиатрия.csv', rows: 236, v: 167, e: 62, n: 7 },
  { file: 'приемное.csv', rows: 86, v: 62, e: 21, n: 3 },
  { file: 'реанимация.csv', rows: 282, v: 218, e: 58, n: 6 },
  { file: 'эндо.csv', rows: 161, v: 105, e: 48, n: 8 },
];

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

function verifyCSV(assetsDir: string, expected: ExpectedData): { passed: boolean; details: string } {
  const filePath = path.join(assetsDir, expected.file);

  if (!fs.existsSync(filePath)) {
    return { passed: false, details: 'File not found' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  let rowCount = 0;
  let vCount = 0;
  let eCount = 0;
  let nCount = 0;

  // Skip header lines (1-4), data starts at line 5 (index 4)
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',,Всего:') || line.toLowerCase().includes('всего')) {
      continue;
    }

    const parsed = parseCSVLine(line);
    if (parsed.length < 6) {
      continue;
    }

    const code = parseInt(parsed[0], 10);
    const ven = parsed[5].trim().toUpperCase();

    if (isNaN(code) || !['V', 'E', 'N'].includes(ven)) {
      continue;
    }

    rowCount++;
    if (ven === 'V') vCount++;
    else if (ven === 'E') eCount++;
    else if (ven === 'N') nCount++;
  }

  const rowsMatch = rowCount === expected.rows;
  const vMatch = vCount === expected.v;
  const eMatch = eCount === expected.e;
  const nMatch = nCount === expected.n;
  const passed = rowsMatch && vMatch && eMatch && nMatch;

  const details = [
    `Rows: ${rowCount}/${expected.rows} ${rowsMatch ? '✓' : '✗'}`,
    `V: ${vCount}/${expected.v} ${vMatch ? '✓' : '✗'}`,
    `E: ${eCount}/${expected.e} ${eMatch ? '✓' : '✗'}`,
    `N: ${nCount}/${expected.n} ${nMatch ? '✓' : '✗'}`,
  ].join(' | ');

  return { passed, details };
}

// Main
const assetsDir = path.join(__dirname, '..', 'assets');

console.log('CSV Verification Report');
console.log('=======================\n');

let allPassed = true;

for (const expected of expectedData) {
  const result = verifyCSV(assetsDir, expected);
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${expected.file.padEnd(20)} ${status}`);
  console.log(`  ${result.details}`);
  console.log();

  if (!result.passed) allPassed = false;
}

console.log('=======================');
console.log(allPassed ? 'All files verified successfully!' : 'Some files failed verification!');
process.exit(allPassed ? 0 : 1);
