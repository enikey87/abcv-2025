import { describe, it, expect } from 'vitest';
import {
  analyzeABC,
  getABCSummary,
  getVENSummary,
  getABCVENMatrix,
  getVENDistributionByABC,
} from './analyzer';
import { DrugItem, AnalyzedItem } from './types';

describe('analyzeABC', () => {
  const createItem = (code: number, amount: number, ven: 'V' | 'E' | 'N' = 'V'): DrugItem => ({
    code,
    name: `Препарат ${code}`,
    unit: 'уп.',
    quantity: 10,
    amount,
    ven,
  });

  describe('sorting', () => {
    it('should sort items by amount in descending order', () => {
      const items: DrugItem[] = [
        createItem(1, 100),
        createItem(2, 300),
        createItem(3, 200),
      ];

      const result = analyzeABC(items);

      expect(result[0].code).toBe(2);
      expect(result[1].code).toBe(3);
      expect(result[2].code).toBe(1);
    });

    it('should not modify original array', () => {
      const items: DrugItem[] = [
        createItem(1, 100),
        createItem(2, 300),
      ];

      analyzeABC(items);

      expect(items[0].code).toBe(1);
      expect(items[1].code).toBe(2);
    });
  });

  describe('percentage calculations', () => {
    it('should calculate percent of total correctly', () => {
      const items: DrugItem[] = [
        createItem(1, 80),
        createItem(2, 20),
      ];

      const result = analyzeABC(items);

      expect(result[0].percentOfTotal).toBe(80);
      expect(result[1].percentOfTotal).toBe(20);
    });

    it('should calculate cumulative percent correctly', () => {
      const items: DrugItem[] = [
        createItem(1, 50),
        createItem(2, 30),
        createItem(3, 20),
      ];

      const result = analyzeABC(items);

      expect(result[0].cumulativePercent).toBe(50);
      expect(result[1].cumulativePercent).toBe(80);
      expect(result[2].cumulativePercent).toBe(100);
    });

    it('should handle floating point amounts', () => {
      const items: DrugItem[] = [
        createItem(1, 33.33),
        createItem(2, 33.33),
        createItem(3, 33.34),
      ];

      const result = analyzeABC(items);
      const totalPercent = result.reduce((sum, item) => sum + item.percentOfTotal, 0);

      expect(totalPercent).toBeCloseTo(100, 5);
    });
  });

  describe('ABC categorization', () => {
    it('should assign A to items until cumulative reaches 80%', () => {
      const items: DrugItem[] = [
        createItem(1, 70), // 70% cumulative -> A
        createItem(2, 15), // 85% cumulative -> B (was at 70% before)
        createItem(3, 10), // 95% cumulative -> B (was at 85% before)
        createItem(4, 5),  // 100% cumulative -> C (was at 95% before)
      ];

      const result = analyzeABC(items);

      expect(result[0].abc).toBe('A'); // 0% before -> A
      expect(result[1].abc).toBe('A'); // 70% before -> A (still < 80)
      expect(result[2].abc).toBe('B'); // 85% before -> B
      expect(result[3].abc).toBe('C'); // 95% before -> C
    });

    it('should assign A to first item when it exceeds 80%', () => {
      const items: DrugItem[] = [
        createItem(1, 90),
        createItem(2, 10),
      ];

      const result = analyzeABC(items);

      expect(result[0].abc).toBe('A');
      expect(result[1].abc).toBe('B');
    });

    it('should assign B to items between 80% and 95% cumulative', () => {
      // Create items where cumulative reaches exactly at boundaries
      const items: DrugItem[] = [
        createItem(1, 80), // A (0% before)
        createItem(2, 10), // B (80% before)
        createItem(3, 5),  // B (90% before)
        createItem(4, 5),  // C (95% before)
      ];

      const result = analyzeABC(items);

      expect(result[0].abc).toBe('A');
      expect(result[1].abc).toBe('B');
      expect(result[2].abc).toBe('B');
      expect(result[3].abc).toBe('C');
    });

    it('should assign C to items after 95% cumulative', () => {
      const items: DrugItem[] = [
        createItem(1, 96),
        createItem(2, 2),
        createItem(3, 1),
        createItem(4, 1),
      ];

      const result = analyzeABC(items);

      expect(result[0].abc).toBe('A');
      expect(result[1].abc).toBe('C');
      expect(result[2].abc).toBe('C');
      expect(result[3].abc).toBe('C');
    });
  });

  describe('edge cases', () => {
    it('should handle single item', () => {
      const items: DrugItem[] = [createItem(1, 100)];

      const result = analyzeABC(items);

      expect(result.length).toBe(1);
      expect(result[0].abc).toBe('A');
      expect(result[0].percentOfTotal).toBe(100);
      expect(result[0].cumulativePercent).toBe(100);
    });

    it('should handle empty array', () => {
      const result = analyzeABC([]);

      expect(result.length).toBe(0);
    });

    it('should handle items with zero amounts', () => {
      const items: DrugItem[] = [
        createItem(1, 100),
        createItem(2, 0),
        createItem(3, 0),
      ];

      const result = analyzeABC(items);

      expect(result[0].percentOfTotal).toBe(100);
      expect(result[1].percentOfTotal).toBe(0);
      expect(result[2].percentOfTotal).toBe(0);
    });

    it('should handle all items with same amount', () => {
      const items: DrugItem[] = [
        createItem(1, 100),
        createItem(2, 100),
        createItem(3, 100),
      ];

      const result = analyzeABC(items);

      expect(result[0].percentOfTotal).toBeCloseTo(33.33, 1);
      expect(result[1].percentOfTotal).toBeCloseTo(33.33, 1);
      expect(result[2].percentOfTotal).toBeCloseTo(33.33, 1);
    });

    it('should handle very small amounts', () => {
      const items: DrugItem[] = [
        createItem(1, 0.001),
        createItem(2, 0.002),
      ];

      const result = analyzeABC(items);

      expect(result[0].amount).toBe(0.002);
      expect(result[1].amount).toBe(0.001);
    });

    it('should handle very large amounts', () => {
      const items: DrugItem[] = [
        createItem(1, 28230955),
        createItem(2, 540223.57),
      ];

      const result = analyzeABC(items);

      expect(result[0].abc).toBe('A');
      expect(result[0].percentOfTotal).toBeGreaterThan(98);
    });

    it('should preserve VEN categories from input', () => {
      const items: DrugItem[] = [
        createItem(1, 100, 'V'),
        createItem(2, 50, 'E'),
        createItem(3, 25, 'N'),
      ];

      const result = analyzeABC(items);

      expect(result[0].ven).toBe('V');
      expect(result[1].ven).toBe('E');
      expect(result[2].ven).toBe('N');
    });

    it('should handle exact 80% boundary', () => {
      const items: DrugItem[] = [
        createItem(1, 80),
        createItem(2, 20),
      ];

      const result = analyzeABC(items);

      expect(result[0].abc).toBe('A'); // 0% before -> A
      expect(result[1].abc).toBe('B'); // 80% before -> B (not A because >= 80)
    });

    it('should handle exact 95% boundary', () => {
      const items: DrugItem[] = [
        createItem(1, 80),
        createItem(2, 15),
        createItem(3, 5),
      ];

      const result = analyzeABC(items);

      expect(result[0].abc).toBe('A'); // 0% before
      expect(result[1].abc).toBe('B'); // 80% before
      expect(result[2].abc).toBe('C'); // 95% before
    });
  });
});

describe('getABCSummary', () => {
  const createAnalyzedItem = (
    code: number,
    amount: number,
    abc: 'A' | 'B' | 'C',
    percentOfTotal: number,
    cumulativePercent: number
  ): AnalyzedItem => ({
    code,
    name: `Препарат ${code}`,
    unit: 'уп.',
    quantity: 10,
    amount,
    ven: 'V',
    abc,
    percentOfTotal,
    cumulativePercent,
  });

  it('should count items in each category', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 80000, 'A', 80, 80),
      createAnalyzedItem(2, 15000, 'B', 15, 95),
      createAnalyzedItem(3, 5000, 'C', 5, 100),
    ];

    const result = getABCSummary(items);

    expect(result.find(s => s.category === 'A')?.count).toBe(1);
    expect(result.find(s => s.category === 'B')?.count).toBe(1);
    expect(result.find(s => s.category === 'C')?.count).toBe(1);
  });

  it('should sum amounts for each category', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'A', 50, 50),
      createAnalyzedItem(2, 30000, 'A', 30, 80),
      createAnalyzedItem(3, 15000, 'B', 15, 95),
      createAnalyzedItem(4, 5000, 'C', 5, 100),
    ];

    const result = getABCSummary(items);

    expect(result.find(s => s.category === 'A')?.amount).toBe(80000);
    expect(result.find(s => s.category === 'B')?.amount).toBe(15000);
    expect(result.find(s => s.category === 'C')?.amount).toBe(5000);
  });

  it('should calculate percentage of count', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 80000, 'A', 80, 80),
      createAnalyzedItem(2, 10000, 'B', 10, 90),
      createAnalyzedItem(3, 5000, 'B', 5, 95),
      createAnalyzedItem(4, 5000, 'C', 5, 100),
    ];

    const result = getABCSummary(items);

    expect(result.find(s => s.category === 'A')?.percentCount).toBe(25); // 1/4
    expect(result.find(s => s.category === 'B')?.percentCount).toBe(50); // 2/4
    expect(result.find(s => s.category === 'C')?.percentCount).toBe(25); // 1/4
  });

  it('should calculate percentage of amount', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 80000, 'A', 80, 80),
      createAnalyzedItem(2, 15000, 'B', 15, 95),
      createAnalyzedItem(3, 5000, 'C', 5, 100),
    ];

    const result = getABCSummary(items);

    expect(result.find(s => s.category === 'A')?.percentAmount).toBe(80);
    expect(result.find(s => s.category === 'B')?.percentAmount).toBe(15);
    expect(result.find(s => s.category === 'C')?.percentAmount).toBe(5);
  });

  it('should return categories in A, B, C order', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 80000, 'A', 80, 80),
      createAnalyzedItem(2, 15000, 'B', 15, 95),
      createAnalyzedItem(3, 5000, 'C', 5, 100),
    ];

    const result = getABCSummary(items);

    expect(result[0].category).toBe('A');
    expect(result[1].category).toBe('B');
    expect(result[2].category).toBe('C');
  });

  it('should handle empty category', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 98000, 'A', 98, 98),
      createAnalyzedItem(2, 2000, 'C', 2, 100),
    ];

    const result = getABCSummary(items);

    expect(result.find(s => s.category === 'B')?.count).toBe(0);
    expect(result.find(s => s.category === 'B')?.amount).toBe(0);
    expect(result.find(s => s.category === 'B')?.percentCount).toBe(0);
    expect(result.find(s => s.category === 'B')?.percentAmount).toBe(0);
  });

  it('should handle all items in one category', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'A', 50, 50),
      createAnalyzedItem(2, 50000, 'A', 50, 100),
    ];

    const result = getABCSummary(items);

    expect(result.find(s => s.category === 'A')?.count).toBe(2);
    expect(result.find(s => s.category === 'A')?.percentCount).toBe(100);
    expect(result.find(s => s.category === 'A')?.percentAmount).toBe(100);
  });
});

describe('getVENSummary', () => {
  const createAnalyzedItem = (
    code: number,
    amount: number,
    ven: 'V' | 'E' | 'N'
  ): AnalyzedItem => ({
    code,
    name: `Препарат ${code}`,
    unit: 'уп.',
    quantity: 10,
    amount,
    ven,
    abc: 'A',
    percentOfTotal: 0,
    cumulativePercent: 0,
  });

  it('should count items in each VEN category', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'V'),
      createAnalyzedItem(2, 30000, 'V'),
      createAnalyzedItem(3, 15000, 'E'),
      createAnalyzedItem(4, 5000, 'N'),
    ];

    const result = getVENSummary(items);

    expect(result.find(s => s.category === 'V')?.count).toBe(2);
    expect(result.find(s => s.category === 'E')?.count).toBe(1);
    expect(result.find(s => s.category === 'N')?.count).toBe(1);
  });

  it('should sum amounts for each VEN category', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'V'),
      createAnalyzedItem(2, 30000, 'V'),
      createAnalyzedItem(3, 15000, 'E'),
      createAnalyzedItem(4, 5000, 'N'),
    ];

    const result = getVENSummary(items);

    expect(result.find(s => s.category === 'V')?.amount).toBe(80000);
    expect(result.find(s => s.category === 'E')?.amount).toBe(15000);
    expect(result.find(s => s.category === 'N')?.amount).toBe(5000);
  });

  it('should return categories in V, E, N order', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'N'),
      createAnalyzedItem(2, 30000, 'E'),
      createAnalyzedItem(3, 20000, 'V'),
    ];

    const result = getVENSummary(items);

    expect(result[0].category).toBe('V');
    expect(result[1].category).toBe('E');
    expect(result[2].category).toBe('N');
  });

  it('should handle empty VEN category', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 80000, 'V'),
      createAnalyzedItem(2, 20000, 'E'),
    ];

    const result = getVENSummary(items);

    expect(result.find(s => s.category === 'N')?.count).toBe(0);
    expect(result.find(s => s.category === 'N')?.amount).toBe(0);
  });

  it('should calculate percentages correctly', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 60000, 'V'),
      createAnalyzedItem(2, 30000, 'E'),
      createAnalyzedItem(3, 10000, 'N'),
    ];

    const result = getVENSummary(items);

    expect(result.find(s => s.category === 'V')?.percentAmount).toBe(60);
    expect(result.find(s => s.category === 'E')?.percentAmount).toBe(30);
    expect(result.find(s => s.category === 'N')?.percentAmount).toBe(10);
  });
});

describe('getABCVENMatrix', () => {
  const createAnalyzedItem = (
    code: number,
    amount: number,
    abc: 'A' | 'B' | 'C',
    ven: 'V' | 'E' | 'N'
  ): AnalyzedItem => ({
    code,
    name: `Препарат ${code}`,
    unit: 'уп.',
    quantity: 10,
    amount,
    ven,
    abc,
    percentOfTotal: 0,
    cumulativePercent: 0,
  });

  it('should count items in each ABC/VEN combination', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'A', 'V'),
      createAnalyzedItem(2, 30000, 'A', 'V'),
      createAnalyzedItem(3, 10000, 'B', 'E'),
      createAnalyzedItem(4, 5000, 'C', 'N'),
    ];

    const result = getABCVENMatrix(items);

    expect(result.A.V.count).toBe(2);
    expect(result.B.E.count).toBe(1);
    expect(result.C.N.count).toBe(1);
  });

  it('should sum amounts in each ABC/VEN combination', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'A', 'V'),
      createAnalyzedItem(2, 30000, 'A', 'V'),
      createAnalyzedItem(3, 10000, 'B', 'E'),
      createAnalyzedItem(4, 5000, 'C', 'N'),
    ];

    const result = getABCVENMatrix(items);

    expect(result.A.V.amount).toBe(80000);
    expect(result.B.E.amount).toBe(10000);
    expect(result.C.N.amount).toBe(5000);
  });

  it('should initialize all combinations with zeros', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 100000, 'A', 'V'),
    ];

    const result = getABCVENMatrix(items);

    expect(result.A.E.count).toBe(0);
    expect(result.A.E.amount).toBe(0);
    expect(result.B.V.count).toBe(0);
    expect(result.C.N.count).toBe(0);
  });

  it('should calculate percentages relative to total', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'A', 'V'),
      createAnalyzedItem(2, 30000, 'B', 'E'),
      createAnalyzedItem(3, 20000, 'C', 'N'),
    ];

    const result = getABCVENMatrix(items);

    expect(result.A.V.percentAmount).toBe(50);
    expect(result.B.E.percentAmount).toBe(30);
    expect(result.C.N.percentAmount).toBe(20);
  });

  it('should have all ABC categories as keys', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 100000, 'A', 'V'),
    ];

    const result = getABCVENMatrix(items);

    expect(result).toHaveProperty('A');
    expect(result).toHaveProperty('B');
    expect(result).toHaveProperty('C');
  });

  it('should have all VEN categories as nested keys', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 100000, 'A', 'V'),
    ];

    const result = getABCVENMatrix(items);

    expect(result.A).toHaveProperty('V');
    expect(result.A).toHaveProperty('E');
    expect(result.A).toHaveProperty('N');
    expect(result.B).toHaveProperty('V');
    expect(result.B).toHaveProperty('E');
    expect(result.B).toHaveProperty('N');
  });
});

describe('getVENDistributionByABC', () => {
  const createAnalyzedItem = (
    code: number,
    amount: number,
    abc: 'A' | 'B' | 'C',
    ven: 'V' | 'E' | 'N'
  ): AnalyzedItem => ({
    code,
    name: `Препарат ${code}`,
    unit: 'уп.',
    quantity: 10,
    amount,
    ven,
    abc,
    percentOfTotal: 0,
    cumulativePercent: 0,
  });

  it('should calculate percentages within each ABC group', () => {
    const items: AnalyzedItem[] = [
      // Group A: 100000 total
      createAnalyzedItem(1, 60000, 'A', 'V'),
      createAnalyzedItem(2, 30000, 'A', 'E'),
      createAnalyzedItem(3, 10000, 'A', 'N'),
      // Group B: 15000 total
      createAnalyzedItem(4, 10000, 'B', 'V'),
      createAnalyzedItem(5, 5000, 'B', 'E'),
    ];

    const result = getVENDistributionByABC(items);

    // In group A
    expect(result.A.V.percentAmount).toBe(60);
    expect(result.A.E.percentAmount).toBe(30);
    expect(result.A.N.percentAmount).toBe(10);

    // In group B
    expect(result.B.V.percentAmount).toBeCloseTo(66.67, 1);
    expect(result.B.E.percentAmount).toBeCloseTo(33.33, 1);
  });

  it('should handle empty ABC group', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 80000, 'A', 'V'),
      createAnalyzedItem(2, 20000, 'C', 'E'),
    ];

    const result = getVENDistributionByABC(items);

    expect(result.B.V.percentAmount).toBe(0);
    expect(result.B.E.percentAmount).toBe(0);
    expect(result.B.N.percentAmount).toBe(0);
    expect(result.B.V.count).toBe(0);
  });

  it('should calculate count percentages within each ABC group', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 40000, 'A', 'V'),
      createAnalyzedItem(2, 30000, 'A', 'V'),
      createAnalyzedItem(3, 20000, 'A', 'E'),
      createAnalyzedItem(4, 10000, 'A', 'N'),
    ];

    const result = getVENDistributionByABC(items);

    expect(result.A.V.percentCount).toBe(50); // 2/4
    expect(result.A.E.percentCount).toBe(25); // 1/4
    expect(result.A.N.percentCount).toBe(25); // 1/4
  });

  it('should handle all items in one VEN category within ABC group', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 50000, 'A', 'V'),
      createAnalyzedItem(2, 50000, 'A', 'V'),
    ];

    const result = getVENDistributionByABC(items);

    expect(result.A.V.percentAmount).toBe(100);
    expect(result.A.E.percentAmount).toBe(0);
    expect(result.A.N.percentAmount).toBe(0);
  });

  it('should have correct structure for all ABC/VEN combinations', () => {
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 100000, 'A', 'V'),
    ];

    const result = getVENDistributionByABC(items);

    for (const abc of ['A', 'B', 'C'] as const) {
      for (const ven of ['V', 'E', 'N'] as const) {
        expect(result[abc][ven]).toHaveProperty('count');
        expect(result[abc][ven]).toHaveProperty('amount');
        expect(result[abc][ven]).toHaveProperty('percentCount');
        expect(result[abc][ven]).toHaveProperty('percentAmount');
      }
    }
  });

  it('should handle real-world scenario with dominant item', () => {
    // Simulates ОПН department where Синагис dominates
    const items: AnalyzedItem[] = [
      createAnalyzedItem(1, 28230955, 'A', 'V'), // Синагис
      createAnalyzedItem(2, 100000, 'C', 'V'),
      createAnalyzedItem(3, 50000, 'C', 'E'),
      createAnalyzedItem(4, 20000, 'C', 'N'),
    ];

    const result = getVENDistributionByABC(items);

    expect(result.A.V.percentAmount).toBe(100);
    expect(result.A.V.count).toBe(1);
    expect(result.C.V.count).toBe(1);
    expect(result.C.E.count).toBe(1);
    expect(result.C.N.count).toBe(1);
  });
});
