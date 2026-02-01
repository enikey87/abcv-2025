export type VENCategory = 'V' | 'E' | 'N';
export type ABCCategory = 'A' | 'B' | 'C';

export interface DrugItem {
  code: number;
  name: string;
  unit: string;
  quantity: number;
  amount: number;
  ven: VENCategory;
}

export interface AnalyzedItem extends DrugItem {
  percentOfTotal: number;
  cumulativePercent: number;
  abc: ABCCategory;
}

export interface CategoryStats {
  count: number;
  amount: number;
  percentCount: number;
  percentAmount: number;
}

export interface ABCVENMatrix {
  [abc: string]: {
    [ven: string]: CategoryStats;
  };
}

export interface ABCSummary {
  category: ABCCategory;
  count: number;
  amount: number;
  percentCount: number;
  percentAmount: number;
}

export interface VENSummary {
  category: VENCategory;
  count: number;
  amount: number;
  percentCount: number;
  percentAmount: number;
}
