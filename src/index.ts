import * as path from 'path';
import { parseCSV } from './parser';
import {
  analyzeABC,
  getABCSummary,
  getVENSummary,
  getVENDistributionByABC,
} from './analyzer';
import {
  generateCSVReport,
  generateTextReport,
  generateConsoleSummary,
  formatAmount,
} from './reporter';

function printUsage(): void {
  console.log('Использование: npx tsx src/index.ts <путь_к_csv_файлу>');
  console.log('');
  console.log('Пример:');
  console.log('  npx tsx src/index.ts assets/ОПН.csv');
  console.log('  npm run analyze -- assets/другой_файл.csv');
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Ошибка: не указан входной файл\n');
    printUsage();
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const inputFileName = path.basename(inputPath, path.extname(inputPath));
  const outputDir = path.resolve(__dirname, '../output');
  const csvOutputPath = path.join(outputDir, `${inputFileName}_abc_ven.csv`);
  const textOutputPath = path.join(outputDir, `${inputFileName}_report.txt`);

  console.log(`Входной файл: ${inputPath}`);
  console.log('Загрузка данных...');

  const items = parseCSV(inputPath);

  if (items.length === 0) {
    console.error('Ошибка: не удалось загрузить данные из файла');
    process.exit(1);
  }

  console.log(`Загружено позиций: ${items.length}`);

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  console.log(`Общая сумма: ${formatAmount(totalAmount)} руб.`);

  console.log('\nВыполнение ABC-анализа...');
  const analyzedItems = analyzeABC(items);

  const summary = getABCSummary(analyzedItems);
  const venSummary = getVENSummary(analyzedItems);
  const venDistribution = getVENDistributionByABC(analyzedItems);

  // Generate reports
  generateCSVReport(analyzedItems, csvOutputPath);
  console.log(`\nCSV-отчёт сохранён: ${csvOutputPath}`);

  generateTextReport(
    analyzedItems,
    summary,
    venSummary,
    venDistribution,
    textOutputPath
  );
  console.log(`Текстовый отчёт сохранён: ${textOutputPath}`);

  // Console output
  console.log('\n');
  console.log(
    generateConsoleSummary(
      summary,
      venSummary,
      venDistribution,
      totalAmount,
      items.length
    )
  );

  // Summary verification
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                      ПРОВЕРКА');
  console.log('═══════════════════════════════════════════════════════════════');

  const groupA = summary.find((s) => s.category === 'A');
  const groupB = summary.find((s) => s.category === 'B');
  const groupC = summary.find((s) => s.category === 'C');

  console.log(`Группа A: ${groupA?.count} поз. (${groupA?.percentAmount.toFixed(2)}% суммы)`);
  console.log(`Группа B: ${groupB?.count} поз. (${groupB?.percentAmount.toFixed(2)}% суммы)`);
  console.log(`Группа C: ${groupC?.count} поз. (${groupC?.percentAmount.toFixed(2)}% суммы)`);

  const topItem = analyzedItems[0];
  if (topItem) {
    console.log(`\nСамая дорогая позиция: ${topItem.name}`);
    console.log(`  Сумма: ${formatAmount(topItem.amount)} руб. (${topItem.percentOfTotal.toFixed(2)}%)`);
    console.log(`  Категория: ${topItem.abc}/${topItem.ven}`);
  }

  console.log('═══════════════════════════════════════════════════════════════');
}

main();
