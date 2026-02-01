import * as fs from 'fs';
import * as path from 'path';
import {
  AnalyzedItem,
  ABCSummary,
  VENSummary,
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

export function generateTable1(summary: ABCSummary[], totalCount: number, totalAmount: number): string {
  const lines: string[] = [];

  lines.push('Таблица 1. ABC-анализ');
  lines.push('┌────────┬───────────┬────────┬─────────────────┬──────────┐');
  lines.push('│ Группа │ Число МНН │ % МНН  │ Затраты, руб.   │ % затрат │');
  lines.push('├────────┼───────────┼────────┼─────────────────┼──────────┤');

  for (const group of summary) {
    const countStr = group.count.toString().padStart(9);
    const percentCountStr = formatPercent(group.percentCount).padStart(6);
    const amountStr = formatAmount(group.amount).padStart(15);
    const percentAmountStr = formatPercent(group.percentAmount).padStart(8);
    lines.push(`│ ${group.category}      │ ${countStr} │ ${percentCountStr} │ ${amountStr} │ ${percentAmountStr} │`);
  }

  lines.push('├────────┼───────────┼────────┼─────────────────┼──────────┤');
  const totalCountStr = totalCount.toString().padStart(9);
  const totalAmountStr = formatAmount(totalAmount).padStart(15);
  lines.push(`│ Итого  │ ${totalCountStr} │ 100.00% │ ${totalAmountStr} │  100.00% │`);
  lines.push('└────────┴───────────┴────────┴─────────────────┴──────────┘');

  return lines.join('\n');
}

export function generateTable2(venSummary: VENSummary[], totalCount: number, totalAmount: number): string {
  const lines: string[] = [];

  lines.push('Таблица 2. VEN-анализ');
  lines.push('┌───────────┬───────────┬────────┬─────────────────┬──────────┐');
  lines.push('│ Категория │ Число МНН │ % МНН  │ Затраты, руб.   │ % затрат │');
  lines.push('├───────────┼───────────┼────────┼─────────────────┼──────────┤');

  for (const group of venSummary) {
    const countStr = group.count.toString().padStart(9);
    const percentCountStr = formatPercent(group.percentCount).padStart(6);
    const amountStr = formatAmount(group.amount).padStart(15);
    const percentAmountStr = formatPercent(group.percentAmount).padStart(8);
    lines.push(`│ ${group.category}         │ ${countStr} │ ${percentCountStr} │ ${amountStr} │ ${percentAmountStr} │`);
  }

  lines.push('├───────────┼───────────┼────────┼─────────────────┼──────────┤');
  const totalCountStr = totalCount.toString().padStart(9);
  const totalAmountStr = formatAmount(totalAmount).padStart(15);
  lines.push(`│ Итого     │ ${totalCountStr} │ 100.00% │ ${totalAmountStr} │  100.00% │`);
  lines.push('└───────────┴───────────┴────────┴─────────────────┴──────────┘');

  return lines.join('\n');
}

export function generateTable3(
  venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>>
): string {
  const lines: string[] = [];

  lines.push('Таблица 3. Матрица ABC/VEN (% затрат внутри группы)');
  lines.push('┌────────┬────────┬────────┬────────┐');
  lines.push('│ Группа │ V, %   │ E, %   │ N, %   │');
  lines.push('├────────┼────────┼────────┼────────┤');

  for (const abc of ['A', 'B', 'C'] as ABCCategory[]) {
    const vPercent = venDistribution[abc].V.percentAmount.toFixed(2).padStart(6);
    const ePercent = venDistribution[abc].E.percentAmount.toFixed(2).padStart(6);
    const nPercent = venDistribution[abc].N.percentAmount.toFixed(2).padStart(6);
    lines.push(`│ ${abc}      │ ${vPercent} │ ${ePercent} │ ${nPercent} │`);
  }

  lines.push('└────────┴────────┴────────┴────────┘');

  return lines.join('\n');
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
  venSummary: VENSummary[],
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

  // Table 1: ABC Analysis
  lines.push(generateTable1(summary, totalCount, totalAmount));
  lines.push('');

  // Table 2: VEN Analysis
  lines.push(generateTable2(venSummary, totalCount, totalAmount));
  lines.push('');

  // Table 3: ABC/VEN Matrix (% within ABC groups)
  lines.push(generateTable3(venDistribution));
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function generateTextReport(
  items: AnalyzedItem[],
  summary: ABCSummary[],
  venSummary: VENSummary[],
  venDistribution: Record<ABCCategory, Record<VENCategory, { count: number; amount: number; percentCount: number; percentAmount: number }>>,
  outputPath: string
): void {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = items.length;

  const content = generateConsoleSummary(
    summary,
    venSummary,
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
