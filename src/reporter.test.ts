import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  formatAmount,
  formatPercent,
  generateTable1,
  generateTable2,
  generateTable3,
  generateCSVReport,
  generateConsoleSummary,
  generateTextReport,
} from './reporter';
import { AnalyzedItem, ABCSummary, VENSummary, ABCCategory, VENCategory } from './types';

describe('formatAmount', () => {
  // Helper to normalize spaces (locale may use non-breaking space \u00A0 or \u202F)
  const normalizeSpaces = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ');

  it('should format zero', () => {
    expect(formatAmount(0)).toBe('0,00');
  });

  it('should format integer amounts', () => {
    expect(normalizeSpaces(formatAmount(1000))).toBe('1 000,00');
  });

  it('should format decimal amounts', () => {
    expect(normalizeSpaces(formatAmount(1234.56))).toBe('1 234,56');
  });

  it('should format large amounts with thousand separators', () => {
    expect(normalizeSpaces(formatAmount(1234567.89))).toBe('1 234 567,89');
  });

  it('should format very large amounts', () => {
    expect(normalizeSpaces(formatAmount(28230955))).toBe('28 230 955,00');
  });

  it('should round to 2 decimal places', () => {
    expect(formatAmount(123.456)).toBe('123,46');
    expect(formatAmount(123.454)).toBe('123,45');
  });

  it('should handle small decimal amounts', () => {
    expect(formatAmount(0.01)).toBe('0,01');
    expect(formatAmount(0.1)).toBe('0,10');
  });

  it('should handle negative amounts', () => {
    const result = normalizeSpaces(formatAmount(-1234.56));
    expect(result).toContain('1 234,56');
    expect(result).toContain('-');
  });
});

describe('formatPercent', () => {
  it('should format zero percent', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('should format 100 percent', () => {
    expect(formatPercent(100)).toBe('100.00%');
  });

  it('should format decimal percentages', () => {
    expect(formatPercent(12.345)).toBe('12.35%');
    expect(formatPercent(0.01)).toBe('0.01%');
  });

  it('should format percentages greater than 100', () => {
    expect(formatPercent(150.5)).toBe('150.50%');
  });

  it('should round to 2 decimal places', () => {
    expect(formatPercent(33.333)).toBe('33.33%');
    expect(formatPercent(66.666)).toBe('66.67%');
  });
});

describe('generateTable1 (ABC Analysis)', () => {
  const createSummary = (
    aCount: number, aAmount: number,
    bCount: number, bAmount: number,
    cCount: number, cAmount: number
  ): ABCSummary[] => {
    const total = aAmount + bAmount + cAmount;
    const totalCount = aCount + bCount + cCount;
    return [
      { category: 'A', count: aCount, amount: aAmount, percentCount: (aCount / totalCount) * 100, percentAmount: (aAmount / total) * 100 },
      { category: 'B', count: bCount, amount: bAmount, percentCount: (bCount / totalCount) * 100, percentAmount: (bAmount / total) * 100 },
      { category: 'C', count: cCount, amount: cAmount, percentCount: (cCount / totalCount) * 100, percentAmount: (cAmount / total) * 100 },
    ];
  };

  it('should generate table header', () => {
    const summary = createSummary(10, 80000, 20, 15000, 70, 5000);
    const result = generateTable1(summary, 100, 100000);

    expect(result).toContain('Таблица 1. ABC-анализ');
    expect(result).toContain('Группа');
    expect(result).toContain('Число МНН');
    expect(result).toContain('% МНН');
    expect(result).toContain('Затраты, руб.');
    expect(result).toContain('% затрат');
  });

  it('should include all ABC categories', () => {
    const summary = createSummary(10, 80000, 20, 15000, 70, 5000);
    const result = generateTable1(summary, 100, 100000);

    expect(result).toContain('│ A');
    expect(result).toContain('│ B');
    expect(result).toContain('│ C');
  });

  it('should include totals row', () => {
    const summary = createSummary(10, 80000, 20, 15000, 70, 5000);
    const result = generateTable1(summary, 100, 100000);

    expect(result).toContain('Итого');
    expect(result).toContain('100.00%');
  });

  it('should format amounts correctly', () => {
    const summary = createSummary(1, 28230955, 0, 0, 116, 540223.57);
    const result = generateTable1(summary, 117, 28771178.57);

    // Normalize non-breaking spaces for comparison
    const normalized = result.replace(/[\u00A0\u202F]/g, ' ');
    expect(normalized).toContain('28 230 955,00');
  });

  it('should handle zero counts in a category', () => {
    const summary: ABCSummary[] = [
      { category: 'A', count: 10, amount: 80000, percentCount: 10, percentAmount: 80 },
      { category: 'B', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'C', count: 90, amount: 20000, percentCount: 90, percentAmount: 20 },
    ];
    const result = generateTable1(summary, 100, 100000);

    expect(result).toContain('│ B');
    expect(result).toContain('0.00%');
  });

  it('should have proper table borders', () => {
    const summary = createSummary(10, 80000, 20, 15000, 70, 5000);
    const result = generateTable1(summary, 100, 100000);

    expect(result).toContain('┌');
    expect(result).toContain('┐');
    expect(result).toContain('└');
    expect(result).toContain('┘');
    expect(result).toContain('├');
    expect(result).toContain('┤');
  });
});

describe('generateTable2 (VEN Analysis)', () => {
  const createVENSummary = (
    vCount: number, vAmount: number,
    eCount: number, eAmount: number,
    nCount: number, nAmount: number
  ): VENSummary[] => {
    const total = vAmount + eAmount + nAmount;
    const totalCount = vCount + eCount + nCount;
    return [
      { category: 'V', count: vCount, amount: vAmount, percentCount: (vCount / totalCount) * 100, percentAmount: (vAmount / total) * 100 },
      { category: 'E', count: eCount, amount: eAmount, percentCount: (eCount / totalCount) * 100, percentAmount: (eAmount / total) * 100 },
      { category: 'N', count: nCount, amount: nAmount, percentCount: (nCount / totalCount) * 100, percentAmount: (nAmount / total) * 100 },
    ];
  };

  it('should generate table header', () => {
    const summary = createVENSummary(50, 60000, 30, 30000, 20, 10000);
    const result = generateTable2(summary, 100, 100000);

    expect(result).toContain('Таблица 2. VEN-анализ');
    expect(result).toContain('Категория');
  });

  it('should include all VEN categories', () => {
    const summary = createVENSummary(50, 60000, 30, 30000, 20, 10000);
    const result = generateTable2(summary, 100, 100000);

    expect(result).toContain('│ V');
    expect(result).toContain('│ E');
    expect(result).toContain('│ N');
  });

  it('should include totals row', () => {
    const summary = createVENSummary(50, 60000, 30, 30000, 20, 10000);
    const result = generateTable2(summary, 100, 100000);

    expect(result).toContain('Итого');
  });

  it('should handle zero counts in a category', () => {
    const summary: VENSummary[] = [
      { category: 'V', count: 100, amount: 99000, percentCount: 100, percentAmount: 99 },
      { category: 'E', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'N', count: 0, amount: 1000, percentCount: 0, percentAmount: 1 },
    ];
    const result = generateTable2(summary, 100, 100000);

    expect(result).toContain('│ E');
  });
});

describe('generateTable3 (ABC/VEN Matrix)', () => {
  const createDistribution = (): Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> => ({
    A: {
      V: { count: 5, amount: 60000, percentCount: 50, percentAmount: 75 },
      E: { count: 3, amount: 15000, percentCount: 30, percentAmount: 18.75 },
      N: { count: 2, amount: 5000, percentCount: 20, percentAmount: 6.25 },
    },
    B: {
      V: { count: 10, amount: 10000, percentCount: 50, percentAmount: 66.67 },
      E: { count: 8, amount: 4000, percentCount: 40, percentAmount: 26.67 },
      N: { count: 2, amount: 1000, percentCount: 10, percentAmount: 6.67 },
    },
    C: {
      V: { count: 30, amount: 3000, percentCount: 42.86, percentAmount: 60 },
      E: { count: 25, amount: 1500, percentCount: 35.71, percentAmount: 30 },
      N: { count: 15, amount: 500, percentCount: 21.43, percentAmount: 10 },
    },
  });

  it('should generate matrix header', () => {
    const dist = createDistribution();
    const result = generateTable3(dist);

    expect(result).toContain('Таблица 3. Матрица ABC/VEN');
    expect(result).toContain('V, %');
    expect(result).toContain('E, %');
    expect(result).toContain('N, %');
  });

  it('should include all ABC groups', () => {
    const dist = createDistribution();
    const result = generateTable3(dist);

    expect(result).toContain('│ A');
    expect(result).toContain('│ B');
    expect(result).toContain('│ C');
  });

  it('should format percentages with 2 decimal places', () => {
    const dist = createDistribution();
    const result = generateTable3(dist);

    expect(result).toMatch(/\d+\.\d{2}/);
  });

  it('should handle 100% in one VEN category', () => {
    const dist: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> = {
      A: {
        V: { count: 10, amount: 100000, percentCount: 100, percentAmount: 100 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      B: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      C: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
    };
    const result = generateTable3(dist);

    expect(result).toContain('100.00');
    expect(result).toContain('0.00');
  });

  it('should handle all zeros in a group', () => {
    const dist: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> = {
      A: {
        V: { count: 10, amount: 80000, percentCount: 100, percentAmount: 100 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      B: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      C: {
        V: { count: 50, amount: 5000, percentCount: 50, percentAmount: 50 },
        E: { count: 50, amount: 5000, percentCount: 50, percentAmount: 50 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
    };
    const result = generateTable3(dist);

    // Group B should show all zeros
    const lines = result.split('\n');
    const bLine = lines.find(l => l.includes('│ B'));
    expect(bLine).toContain('0.00');
  });
});

describe('generateCSVReport', () => {
  const testDir = path.join(__dirname, '../test-output');
  const testFile = path.join(testDir, 'test_report.csv');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  const createAnalyzedItems = (): AnalyzedItem[] => [
    { code: 1, name: 'Препарат A', unit: 'уп.', quantity: 10, amount: 80000, ven: 'V', percentOfTotal: 80, cumulativePercent: 80, abc: 'A' },
    { code: 2, name: 'Препарат B', unit: 'уп.', quantity: 5, amount: 15000, ven: 'E', percentOfTotal: 15, cumulativePercent: 95, abc: 'B' },
    { code: 3, name: 'Препарат C', unit: 'уп.', quantity: 100, amount: 5000, ven: 'N', percentOfTotal: 5, cumulativePercent: 100, abc: 'C' },
  ];

  it('should create CSV file', () => {
    const items = createAnalyzedItems();
    generateCSVReport(items, testFile);

    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should include header row', () => {
    const items = createAnalyzedItems();
    generateCSVReport(items, testFile);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('Код;Товар;Сумма;% от общей;Накопл. %;ABC;VEN');
  });

  it('should include all items', () => {
    const items = createAnalyzedItems();
    generateCSVReport(items, testFile);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('Препарат A');
    expect(content).toContain('Препарат B');
    expect(content).toContain('Препарат C');
  });

  it('should escape names with special characters', () => {
    const items: AnalyzedItem[] = [
      { code: 1, name: 'Препарат с, запятой', unit: 'уп.', quantity: 10, amount: 1000, ven: 'V', percentOfTotal: 100, cumulativePercent: 100, abc: 'A' },
    ];
    generateCSVReport(items, testFile);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('"Препарат с, запятой"');
  });

  it('should create directory if not exists', () => {
    const nestedDir = path.join(testDir, 'nested', 'deep');
    const nestedFile = path.join(nestedDir, 'report.csv');

    const items = createAnalyzedItems();
    generateCSVReport(items, nestedFile);

    expect(fs.existsSync(nestedFile)).toBe(true);

    // Cleanup
    fs.rmSync(path.join(testDir, 'nested'), { recursive: true });
  });

  it('should handle empty items array', () => {
    generateCSVReport([], testFile);

    const content = fs.readFileSync(testFile, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    expect(lines.length).toBe(1); // Only header
  });

  it('should format numeric values correctly', () => {
    const items: AnalyzedItem[] = [
      { code: 1, name: 'Препарат', unit: 'уп.', quantity: 10, amount: 1234.567, ven: 'V', percentOfTotal: 50.123, cumulativePercent: 50.123, abc: 'A' },
    ];
    generateCSVReport(items, testFile);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('1234.57'); // Amount rounded to 2 decimals
    expect(content).toContain('50.12'); // Percent rounded to 2 decimals
  });
});

describe('generateConsoleSummary', () => {
  const createTestData = () => {
    const summary: ABCSummary[] = [
      { category: 'A', count: 10, amount: 80000, percentCount: 10, percentAmount: 80 },
      { category: 'B', count: 20, amount: 15000, percentCount: 20, percentAmount: 15 },
      { category: 'C', count: 70, amount: 5000, percentCount: 70, percentAmount: 5 },
    ];

    const venSummary: VENSummary[] = [
      { category: 'V', count: 50, amount: 60000, percentCount: 50, percentAmount: 60 },
      { category: 'E', count: 30, amount: 30000, percentCount: 30, percentAmount: 30 },
      { category: 'N', count: 20, amount: 10000, percentCount: 20, percentAmount: 10 },
    ];

    const venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> = {
      A: {
        V: { count: 5, amount: 60000, percentCount: 50, percentAmount: 75 },
        E: { count: 3, amount: 15000, percentCount: 30, percentAmount: 18.75 },
        N: { count: 2, amount: 5000, percentCount: 20, percentAmount: 6.25 },
      },
      B: {
        V: { count: 10, amount: 10000, percentCount: 50, percentAmount: 66.67 },
        E: { count: 8, amount: 4000, percentCount: 40, percentAmount: 26.67 },
        N: { count: 2, amount: 1000, percentCount: 10, percentAmount: 6.67 },
      },
      C: {
        V: { count: 35, amount: 3000, percentCount: 50, percentAmount: 60 },
        E: { count: 19, amount: 1500, percentCount: 27.14, percentAmount: 30 },
        N: { count: 16, amount: 500, percentCount: 22.86, percentAmount: 10 },
      },
    };

    return { summary, venSummary, venDistribution };
  };

  it('should include header', () => {
    const { summary, venSummary, venDistribution } = createTestData();
    const result = generateConsoleSummary(summary, venSummary, venDistribution, 100000, 100);

    expect(result).toContain('ABC/VEN АНАЛИЗ');
  });

  it('should include total count and amount', () => {
    const { summary, venSummary, venDistribution } = createTestData();
    const result = generateConsoleSummary(summary, venSummary, venDistribution, 100000, 100);

    expect(result).toContain('Всего позиций: 100');
    // Normalize non-breaking spaces for comparison
    const normalized = result.replace(/[\u00A0\u202F]/g, ' ');
    expect(normalized).toContain('100 000,00 руб.');
  });

  it('should include all three tables', () => {
    const { summary, venSummary, venDistribution } = createTestData();
    const result = generateConsoleSummary(summary, venSummary, venDistribution, 100000, 100);

    expect(result).toContain('Таблица 1. ABC-анализ');
    expect(result).toContain('Таблица 2. VEN-анализ');
    expect(result).toContain('Таблица 3. Матрица ABC/VEN');
  });

  it('should include decorative borders', () => {
    const { summary, venSummary, venDistribution } = createTestData();
    const result = generateConsoleSummary(summary, venSummary, venDistribution, 100000, 100);

    expect(result).toContain('═══════════════════════════════════════════════════════════════');
  });

  it('should handle very large amounts', () => {
    const { summary, venSummary, venDistribution } = createTestData();
    const result = generateConsoleSummary(summary, venSummary, venDistribution, 28771178.57, 117);

    // Normalize non-breaking spaces for comparison
    const normalized = result.replace(/[\u00A0\u202F]/g, ' ');
    expect(normalized).toContain('28 771 178,57 руб.');
  });

  it('should handle single item', () => {
    const summary: ABCSummary[] = [
      { category: 'A', count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
      { category: 'B', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'C', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
    ];
    const venSummary: VENSummary[] = [
      { category: 'V', count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
      { category: 'E', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'N', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
    ];
    const venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> = {
      A: {
        V: { count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      B: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      C: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
    };

    const result = generateConsoleSummary(summary, venSummary, venDistribution, 100000, 1);

    expect(result).toContain('Всего позиций: 1');
  });
});

describe('generateTextReport', () => {
  const testDir = path.join(__dirname, '../test-output');
  const testFile = path.join(testDir, 'test_report.txt');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should create text file', () => {
    const items: AnalyzedItem[] = [
      { code: 1, name: 'Препарат', unit: 'уп.', quantity: 10, amount: 100000, ven: 'V', percentOfTotal: 100, cumulativePercent: 100, abc: 'A' },
    ];
    const summary: ABCSummary[] = [
      { category: 'A', count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
      { category: 'B', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'C', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
    ];
    const venSummary: VENSummary[] = [
      { category: 'V', count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
      { category: 'E', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'N', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
    ];
    const venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> = {
      A: {
        V: { count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      B: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      C: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
    };

    generateTextReport(items, summary, venSummary, venDistribution, testFile);

    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should contain all tables', () => {
    const items: AnalyzedItem[] = [
      { code: 1, name: 'Препарат', unit: 'уп.', quantity: 10, amount: 100000, ven: 'V', percentOfTotal: 100, cumulativePercent: 100, abc: 'A' },
    ];
    const summary: ABCSummary[] = [
      { category: 'A', count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
      { category: 'B', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'C', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
    ];
    const venSummary: VENSummary[] = [
      { category: 'V', count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
      { category: 'E', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'N', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
    ];
    const venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> = {
      A: {
        V: { count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      B: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      C: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
    };

    generateTextReport(items, summary, venSummary, venDistribution, testFile);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('ABC/VEN АНАЛИЗ');
    expect(content).toContain('Таблица 1');
    expect(content).toContain('Таблица 2');
    expect(content).toContain('Таблица 3');
  });

  it('should create directory if not exists', () => {
    const nestedDir = path.join(testDir, 'nested', 'deep');
    const nestedFile = path.join(nestedDir, 'report.txt');

    const items: AnalyzedItem[] = [
      { code: 1, name: 'Препарат', unit: 'уп.', quantity: 10, amount: 100000, ven: 'V', percentOfTotal: 100, cumulativePercent: 100, abc: 'A' },
    ];
    const summary: ABCSummary[] = [
      { category: 'A', count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
      { category: 'B', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'C', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
    ];
    const venSummary: VENSummary[] = [
      { category: 'V', count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
      { category: 'E', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      { category: 'N', count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
    ];
    const venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> = {
      A: {
        V: { count: 1, amount: 100000, percentCount: 100, percentAmount: 100 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      B: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
      C: {
        V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
        N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 },
      },
    };

    generateTextReport(items, summary, venSummary, venDistribution, nestedFile);

    expect(fs.existsSync(nestedFile)).toBe(true);

    // Cleanup
    fs.rmSync(path.join(testDir, 'nested'), { recursive: true });
  });
});
