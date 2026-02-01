import {
  DrugItem,
  AnalyzedItem,
  ABCCategory,
  ABCSummary,
  ABCVENMatrix,
  VENCategory,
  VENSummary,
} from './types';

export function analyzeABC(items: DrugItem[]): AnalyzedItem[] {
  // Sort by amount descending
  const sorted = [...items].sort((a, b) => b.amount - a.amount);

  // Calculate total amount
  const totalAmount = sorted.reduce((sum, item) => sum + item.amount, 0);

  // Calculate percentages and assign ABC categories
  // Category is assigned based on cumulative percent BEFORE adding current item
  // This ensures the first items go into group A until we cross 80%
  let cumulativePercent = 0;

  return sorted.map((item) => {
    const percentOfTotal = (item.amount / totalAmount) * 100;

    // Assign category based on cumulative percent BEFORE this item
    let abc: ABCCategory;
    if (cumulativePercent < 80) {
      abc = 'A';
    } else if (cumulativePercent < 95) {
      abc = 'B';
    } else {
      abc = 'C';
    }

    cumulativePercent += percentOfTotal;

    return {
      ...item,
      percentOfTotal,
      cumulativePercent,
      abc,
    };
  });
}

export function getABCSummary(analyzedItems: AnalyzedItem[]): ABCSummary[] {
  const totalAmount = analyzedItems.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = analyzedItems.length;

  const groups: Record<ABCCategory, { count: number; amount: number }> = {
    A: { count: 0, amount: 0 },
    B: { count: 0, amount: 0 },
    C: { count: 0, amount: 0 },
  };

  for (const item of analyzedItems) {
    groups[item.abc].count++;
    groups[item.abc].amount += item.amount;
  }

  return (['A', 'B', 'C'] as ABCCategory[]).map((category) => ({
    category,
    count: groups[category].count,
    amount: groups[category].amount,
    percentCount: (groups[category].count / totalCount) * 100,
    percentAmount: (groups[category].amount / totalAmount) * 100,
  }));
}

export function getVENSummary(analyzedItems: AnalyzedItem[]): VENSummary[] {
  const totalAmount = analyzedItems.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = analyzedItems.length;

  const groups: Record<VENCategory, { count: number; amount: number }> = {
    V: { count: 0, amount: 0 },
    E: { count: 0, amount: 0 },
    N: { count: 0, amount: 0 },
  };

  for (const item of analyzedItems) {
    groups[item.ven].count++;
    groups[item.ven].amount += item.amount;
  }

  return (['V', 'E', 'N'] as VENCategory[]).map((category) => ({
    category,
    count: groups[category].count,
    amount: groups[category].amount,
    percentCount: (groups[category].count / totalCount) * 100,
    percentAmount: (groups[category].amount / totalAmount) * 100,
  }));
}

export function getABCVENMatrix(analyzedItems: AnalyzedItem[]): ABCVENMatrix {
  const totalCount = analyzedItems.length;
  const totalAmount = analyzedItems.reduce((sum, item) => sum + item.amount, 0);

  const matrix: ABCVENMatrix = {};

  for (const abc of ['A', 'B', 'C'] as ABCCategory[]) {
    matrix[abc] = {};
    for (const ven of ['V', 'E', 'N'] as VENCategory[]) {
      matrix[abc][ven] = {
        count: 0,
        amount: 0,
        percentCount: 0,
        percentAmount: 0,
      };
    }
  }

  for (const item of analyzedItems) {
    matrix[item.abc][item.ven].count++;
    matrix[item.abc][item.ven].amount += item.amount;
  }

  // Calculate percentages
  for (const abc of ['A', 'B', 'C'] as ABCCategory[]) {
    for (const ven of ['V', 'E', 'N'] as VENCategory[]) {
      matrix[abc][ven].percentCount =
        (matrix[abc][ven].count / totalCount) * 100;
      matrix[abc][ven].percentAmount =
        (matrix[abc][ven].amount / totalAmount) * 100;
    }
  }

  return matrix;
}

export function getVENDistributionByABC(
  analyzedItems: AnalyzedItem[]
): Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> {
  const result: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>> = {
    A: { V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 }, E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 }, N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 } },
    B: { V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 }, E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 }, N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 } },
    C: { V: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 }, E: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 }, N: { count: 0, amount: 0, percentCount: 0, percentAmount: 0 } },
  };

  // Group by ABC
  const abcGroups: Record<ABCCategory, AnalyzedItem[]> = { A: [], B: [], C: [] };
  for (const item of analyzedItems) {
    abcGroups[item.abc].push(item);
  }

  for (const abc of ['A', 'B', 'C'] as ABCCategory[]) {
    const groupItems = abcGroups[abc];
    const groupCount = groupItems.length;
    const groupAmount = groupItems.reduce((sum, item) => sum + item.amount, 0);

    for (const item of groupItems) {
      result[abc][item.ven].count++;
      result[abc][item.ven].amount += item.amount;
    }

    for (const ven of ['V', 'E', 'N'] as VENCategory[]) {
      result[abc][ven].percentCount = groupCount > 0 ? (result[abc][ven].count / groupCount) * 100 : 0;
      result[abc][ven].percentAmount = groupAmount > 0 ? (result[abc][ven].amount / groupAmount) * 100 : 0;
    }
  }

  return result;
}
