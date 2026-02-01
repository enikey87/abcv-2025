import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface ConversionConfig {
  inputFile: string;
  outputFile: string;
  skipRows: number;  // rows to skip at the beginning
  hasUnitColumn: boolean;
  extraColumn?: number;  // column index to remove (0-based)
}

const configs: ConversionConfig[] = [
  // гастро.xlsx: 5 columns (no Unit), add Unit = "уп."
  { inputFile: 'гастро.xlsx', outputFile: 'гастро.csv', skipRows: 4, hasUnitColumn: false },
  // нерол.xlsx: standard
  { inputFile: 'нерол.xlsx', outputFile: 'нерол.csv', skipRows: 4, hasUnitColumn: true },
  // нефро.xlsx: standard
  { inputFile: 'нефро.xlsx', outputFile: 'нефро.csv', skipRows: 4, hasUnitColumn: true },
  // педиатрия.xlsx: standard
  { inputFile: 'педиатрия.xlsx', outputFile: 'педиатрия.csv', skipRows: 4, hasUnitColumn: true },
  // приемное.xlsx: 7 columns (extra empty column 3)
  { inputFile: 'приемное.xlsx', outputFile: 'приемное.csv', skipRows: 4, hasUnitColumn: true, extraColumn: 2 },
  // реанимация.xlsx: standard
  { inputFile: 'реанимация.xlsx', outputFile: 'реанимация.csv', skipRows: 4, hasUnitColumn: true },
  // эндо.xlsx: 3 header rows (data starts at row 4)
  { inputFile: 'эндо.xlsx', outputFile: 'эндо.csv', skipRows: 3, hasUnitColumn: true },
];

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertExcel(config: ConversionConfig, assetsDir: string): void {
  const inputPath = path.join(assetsDir, config.inputFile);
  const outputPath = path.join(assetsDir, config.outputFile);

  console.log(`\nConverting ${config.inputFile}...`);

  const workbook = XLSX.readFile(inputPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get all data as array of arrays
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Prepare header lines (same as ОПН.csv format)
  const headerLines = [
    `${path.basename(config.inputFile, '.xlsx')} 2025 г.,,,,,`,
    'По всем товарам. По всем отделам. По всем изготовителям. По всем ОКП. Фильтр по фармгруппам. По всем ставкам НДС. По всем видам договоров.,,,,,',
    'Товар - название,,Ед.,Операции расхода,,',
    ',,,Кол-во,Сумма,',
  ];

  const csvLines: string[] = [...headerLines];
  let dataRowCount = 0;

  // Process data rows
  for (let i = config.skipRows; i < data.length; i++) {
    let row = data[i];

    // Skip empty rows or total rows
    if (!row || row.length === 0) continue;
    const firstCell = String(row[0] || '').trim();
    if (!firstCell || firstCell.toLowerCase().includes('всего') || firstCell.toLowerCase().includes('итого')) {
      continue;
    }

    // Remove extra column if specified
    if (config.extraColumn !== undefined) {
      row = [...row.slice(0, config.extraColumn), ...row.slice(config.extraColumn + 1)];
    }

    let csvRow: string[];

    if (!config.hasUnitColumn) {
      // Insert "уп." as Unit column (position 2)
      // Expected input: Код, Товар, Кол-во, Сумма, VEN
      // Expected output: Код, Товар, Ед., Кол-во, Сумма, VEN
      const code = row[0];
      const name = row[1];
      const qty = row[2];
      const amount = row[3];
      const ven = row[4];
      csvRow = [
        escapeCSV(code),
        escapeCSV(name),
        'уп.',
        escapeCSV(qty),
        escapeCSV(amount),
        escapeCSV(ven),
      ];
    } else {
      // Standard format: Код, Товар, Ед., Кол-во, Сумма, VEN
      csvRow = row.slice(0, 6).map((cell: any) => escapeCSV(cell));
    }

    // Validate that this looks like a data row (code should be a number, VEN should be V/E/N)
    const code = parseInt(String(csvRow[0]), 10);
    const ven = String(csvRow[5] || '').trim().toUpperCase();

    if (isNaN(code) || !['V', 'E', 'N'].includes(ven)) {
      continue;
    }

    // Ensure VEN is uppercase
    csvRow[5] = ven;

    csvLines.push(csvRow.join(','));
    dataRowCount++;
  }

  // Add totals row (placeholder)
  csvLines.push(',,Всего:,,,');

  // Write output
  fs.writeFileSync(outputPath, csvLines.join('\r\n'), 'utf-8');

  console.log(`  Created ${config.outputFile} with ${dataRowCount} data rows`);
}

// Main
const assetsDir = path.join(__dirname, '..', 'assets');

console.log('Excel to CSV Converter');
console.log('======================');
console.log(`Assets directory: ${assetsDir}`);

for (const config of configs) {
  try {
    convertExcel(config, assetsDir);
  } catch (error) {
    console.error(`  Error converting ${config.inputFile}:`, error);
  }
}

console.log('\nConversion complete!');
