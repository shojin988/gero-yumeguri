import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const SIZES = [192, 512];
const svg = await readFile(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
try {
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
    await page.screenshot({ path: fileURLToPath(new URL(`../icons/icon-${size}.png`, import.meta.url)) });
    await page.close();
  }
  process.stdout.write('icons/icon-192.png と icons/icon-512.png を作りました\n');
} finally {
  await browser.close();
}
