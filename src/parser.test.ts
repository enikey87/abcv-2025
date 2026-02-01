import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCSV } from './parser';

describe('parseCSV', () => {
  const testDir = path.join(__dirname, '../test-data');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  const createCSVFile = (filename: string, content: string): string => {
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  };

  const createStandardCSV = (rows: string[]): string => {
    const header = [
      'ОПН 2025 г.,,,,,',
      'По всем товарам.,,,,,',
      'Товар - название,,Ед.,Операции расхода,,',
      ',,,Кол-во,Сумма,',
    ];
    return [...header, ...rows].join('\n');
  };

  describe('basic parsing', () => {
    it('should parse valid CSV with standard format', () => {
      const content = createStandardCSV([
        '1,"Адреналин амп. 0,1% 1мл №5",уп.,5,384.4,V',
        '2,Азитромицин пор.,уп.,2,290,E',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(2);
      expect(result[0].code).toBe(1);
      expect(result[0].name).toBe('Адреналин амп. 0,1% 1мл №5');
      expect(result[0].unit).toBe('уп.');
      expect(result[0].quantity).toBe(5);
      expect(result[0].amount).toBe(384.4);
      expect(result[0].ven).toBe('V');
    });

    it('should skip first 4 header lines', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Препарат А');
    });

    it('should skip "Всего:" summary rows', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        ',,Всего:,10,1000,',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(1);
    });

    it('should skip empty lines', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        '',
        '2,Препарат Б,уп.,5,500,E',
        '',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(2);
    });
  });

  describe('VEN categories', () => {
    it('should parse V category', () => {
      const content = createStandardCSV(['1,Препарат,уп.,10,1000,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].ven).toBe('V');
    });

    it('should parse E category', () => {
      const content = createStandardCSV(['1,Препарат,уп.,10,1000,E']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].ven).toBe('E');
    });

    it('should parse N category', () => {
      const content = createStandardCSV(['1,Препарат,уп.,10,1000,N']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].ven).toBe('N');
    });

    it('should handle lowercase VEN categories', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,v',
        '2,Препарат Б,уп.,10,1000,e',
        '3,Препарат В,уп.,10,1000,n',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].ven).toBe('V');
      expect(result[1].ven).toBe('E');
      expect(result[2].ven).toBe('N');
    });

    it('should skip rows with invalid VEN category', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        '2,Препарат Б,уп.,10,1000,X',
        '3,Препарат В,уп.,10,1000,E',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(2);
      expect(result[0].code).toBe(1);
      expect(result[1].code).toBe(3);
    });
  });

  describe('numeric parsing', () => {
    it('should parse integer quantities', () => {
      const content = createStandardCSV(['1,Препарат,уп.,100,1000,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].quantity).toBe(100);
    });

    it('should parse decimal amounts with dot', () => {
      const content = createStandardCSV(['1,Препарат,уп.,10,1234.56,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].amount).toBe(1234.56);
    });

    it('should parse decimal amounts with comma (convert to dot)', () => {
      const content = createStandardCSV(['1,Препарат,уп.,10,"1234,56",V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].amount).toBe(1234.56);
    });

    it('should handle zero quantities', () => {
      const content = createStandardCSV(['1,Препарат,уп.,0,0,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].quantity).toBe(0);
      expect(result[0].amount).toBe(0);
    });

    it('should skip rows with non-numeric code', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        'abc,Препарат Б,уп.,10,1000,E',
        '3,Препарат В,уп.,10,1000,N',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(2);
    });

    it('should handle very large amounts', () => {
      const content = createStandardCSV(['1,Синагис,уп.,927,28230955,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].amount).toBe(28230955);
    });
  });

  describe('CSV escaping and special characters', () => {
    it('should parse names with commas (quoted)', () => {
      const content = createStandardCSV(['1,"Препарат, с запятой",уп.,10,1000,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].name).toBe('Препарат, с запятой');
    });

    it('should parse names with double quotes (escaped)', () => {
      const content = createStandardCSV(['1,"Препарат ""в кавычках""",уп.,10,1000,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].name).toBe('Препарат "в кавычках"');
    });

    it('should parse names with percentages', () => {
      const content = createStandardCSV(['1,"Раствор 0,1% 1мл",уп.,10,1000,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].name).toBe('Раствор 0,1% 1мл');
    });

    it('should parse names with Cyrillic characters', () => {
      const content = createStandardCSV(['1,Адреналин амп.,уп.,10,1000,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].name).toBe('Адреналин амп.');
    });

    it('should parse names with special symbols', () => {
      const content = createStandardCSV(['1,"Препарат №5 (10мл)",уп.,10,1000,V']);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].name).toBe('Препарат №5 (10мл)');
    });
  });

  describe('edge cases', () => {
    it('should return empty array for file with only headers', () => {
      const content = createStandardCSV([]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(0);
    });

    it('should skip rows with insufficient columns', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        '2,Препарат Б,уп.,10',  // Missing VEN
        '3,Препарат В,уп.,10,1000,E',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(2);
    });

    it('should skip rows with empty name', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        '2,,уп.,10,1000,E',
        '3,Препарат В,уп.,10,1000,N',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(2);
    });

    it('should handle Windows line endings (CRLF)', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        '2,Препарат Б,уп.,5,500,E',
      ]).replace(/\n/g, '\r\n');
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(2);
    });

    it('should handle Unix line endings (LF)', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        '2,Препарат Б,уп.,5,500,E',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(2);
    });

    it('should handle different unit types', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000,V',
        '2,Препарат Б,фл.,5,500,E',
        '3,Препарат В,шт,2,200,N',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].unit).toBe('уп.');
      expect(result[1].unit).toBe('фл.');
      expect(result[2].unit).toBe('шт');
    });

    it('should handle whitespace in VEN column', () => {
      const content = createStandardCSV([
        '1,Препарат А,уп.,10,1000, V ',
        '2,Препарат Б,уп.,5,500, E',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].ven).toBe('V');
      expect(result[1].ven).toBe('E');
    });

    it('should use absolute path resolution', () => {
      const content = createStandardCSV(['1,Препарат,уп.,10,1000,V']);
      const filePath = createCSVFile('test.csv', content);
      const relativePath = path.relative(process.cwd(), filePath);

      const result = parseCSV(relativePath);

      expect(result.length).toBe(1);
    });
  });

  describe('real-world data patterns', () => {
    it('should parse row matching ОПН format', () => {
      const content = createStandardCSV([
        '408,"Синагис 100мг/мл 0,5мл №1",уп.,927,28230955,V',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result[0].code).toBe(408);
      expect(result[0].name).toBe('Синагис 100мг/мл 0,5мл №1');
      expect(result[0].quantity).toBe(927);
      expect(result[0].amount).toBe(28230955);
      expect(result[0].ven).toBe('V');
    });

    it('should parse multiple rows from real data', () => {
      const content = createStandardCSV([
        '4,"Адреналин амп. 0,1% 1мл №5",уп.,5,384.4,V',
        '7,Азитромицин  пор. д/сусп. 100мг/5мл фл.,уп.,2,290,V',
        '31,Аммиака раствор 10% фл. 40мл,уп.,2,30,E',
        '122,Гепариновая мазь 25г,уп.,6,494.04,N',
      ]);
      const filePath = createCSVFile('test.csv', content);

      const result = parseCSV(filePath);

      expect(result.length).toBe(4);
      expect(result[0].ven).toBe('V');
      expect(result[2].ven).toBe('E');
      expect(result[3].ven).toBe('N');
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent file', () => {
      expect(() => parseCSV('/non/existent/file.csv')).toThrow();
    });
  });
});
