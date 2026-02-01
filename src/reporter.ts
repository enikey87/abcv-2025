import * as fs from 'fs';
import * as path from 'path';
import {
  AnalyzedItem,
  ABCSummary,
  ABCVENMatrix,
  ABCCategory,
  VENCategory,
} from './types';

export function formatAmount(amount: number): string {
  return amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(percent: number): string {
  return percent.toFixed(2) + '%';
}

export function generateCSVReport(
  items: AnalyzedItem[],
  outputPath: string
): void {
  const header = 'Код;Товар;Сумма;% от общей;Накопл. %;ABC;VEN';
  const lines = items.map(
    (item) =>
      `${item.code};"${item.name}";${item.amount.toFixed(2)};${item.percentOfTotal.toFixed(2)};${item.cumulativePercent.toFixed(2)};${item.abc};${item.ven}`
  );

  const content = [header, ...lines].join('\n');

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content, 'utf-8');
}

export function generateConsoleSummary(
  summary: ABCSummary[],
  matrix: ABCVENMatrix,
  venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>>,
  totalAmount: number,
  totalCount: number
): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    ABC/VEN АНАЛИЗ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Всего позиций: ${totalCount}`);
  lines.push(`Общая сумма: ${formatAmount(totalAmount)} руб.`);
  lines.push('');

  // ABC Summary
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                  СВОДКА ПО ABC-ГРУППАМ');
  lines.push('───────────────────────────────────────────────────────────────');
  for (const group of summary) {
    lines.push(
      `Группа ${group.category}: ${group.count} позиций, ${formatAmount(group.amount)} руб. (${formatPercent(group.percentAmount)})`
    );
  }
  lines.push('');

  // ABC/VEN Matrix
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                  МАТРИЦА ABC/VEN');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('        │     V      │     E      │     N      │   Итого');
  lines.push('────────┼────────────┼────────────┼────────────┼──────────');

  for (const abc of ['A', 'B', 'C'] as ABCCategory[]) {
    const row: string[] = [`   ${abc}    │`];
    let rowTotal = 0;

    for (const ven of ['V', 'E', 'N'] as VENCategory[]) {
      const cell = matrix[abc][ven];
      rowTotal += cell.count;
      row.push(` ${cell.count.toString().padStart(2)} (${formatPercent(cell.percentAmount).padStart(6)}) │`);
    }

    row.push(` ${rowTotal.toString().padStart(3)}`);
    lines.push(row.join(''));
  }
  lines.push('');

  // VEN Distribution within each ABC group
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('          РАСПРЕДЕЛЕНИЕ VEN ВНУТРИ ABC-ГРУПП');
  lines.push('───────────────────────────────────────────────────────────────');

  for (const abc of ['A', 'B', 'C'] as ABCCategory[]) {
    lines.push(`\nГруппа ${abc}:`);
    for (const ven of ['V', 'E', 'N'] as VENCategory[]) {
      const data = venDistribution[abc][ven];
      lines.push(
        `  ${ven}: ${data.count} позиций (${formatPercent(data.percentCount)}), ${formatAmount(data.amount)} руб. (${formatPercent(data.percentAmount)})`
      );
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function generateTextReport(
  items: AnalyzedItem[],
  summary: ABCSummary[],
  matrix: ABCVENMatrix,
  venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>>,
  outputPath: string
): void {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = items.length;

  const content = generateConsoleSummary(
    summary,
    matrix,
    venDistribution,
    totalAmount,
    totalCount
  );

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content, 'utf-8');
}
