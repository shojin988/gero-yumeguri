import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { toDateKey } from '../js/hours.js';

export const HOLIDAY_CSV_URL = 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv';

const OUTPUT_URL = new URL('../data/holidays.json', import.meta.url);

export function parseHolidayCsv(text, years) {
  const entries = text
    .split(/\r?\n/)
    .map((line) => line.split(','))
    .map(([date = '', name = '']) => ({ match: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(date.trim()), name: name.trim() }))
    .filter(({ match, name }) => match && name && years.includes(Number(match[1])))
    .map(({ match, name }) => [`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`, name]);
  return Object.fromEntries(entries);
}

async function main(args) {
  const years = args.map(Number);
  if (years.length === 0 || years.some((year) => !Number.isInteger(year))) {
    throw new Error('使い方: node tools/update-holidays.js 2026 2027');
  }
  const response = await fetch(HOLIDAY_CSV_URL);
  if (!response.ok) {
    throw new Error(`祝日CSVの取得に失敗しました: HTTP ${response.status}`);
  }
  const text = new TextDecoder('shift_jis').decode(await response.arrayBuffer());
  const dates = parseHolidayCsv(text, years);
  const missing = years.filter((year) => !Object.keys(dates).some((key) => key.startsWith(`${year}-`)));
  if (missing.length > 0) {
    throw new Error(`CSVに次の年の祝日がありません: ${missing.join(', ')}`);
  }
  const data = { source: HOLIDAY_CSV_URL, checkedOn: toDateKey(new Date()), years, dates };
  await writeFile(OUTPUT_URL, `${JSON.stringify(data, null, 2)}\n`);
  process.stdout.write(`data/holidays.json を更新しました（${Object.keys(dates).length}日）\n`);
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
