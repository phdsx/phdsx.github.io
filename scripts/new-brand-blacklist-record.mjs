import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
  console.error('用法：node scripts/new-brand-blacklist-record.mjs <brand-slug>');
  console.error('brand-slug 只能包含小写英文、数字和连字符。');
  process.exit(1);
}

const templateFile = path.join(root, 'content', 'collections', 'brand-blacklist', 'templates', 'record.template.json');
const outputFile = path.join(root, 'content', 'collections', 'brand-blacklist', 'records', `${id}.json`);
const today = new Date().toISOString().slice(0, 10);

try {
  await copyFile(templateFile, outputFile, 1);
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error(`记录已存在：${path.relative(root, outputFile)}`);
    process.exit(1);
  }
  throw error;
}

const template = JSON.parse(await readFile(outputFile, 'utf8'));
template.id = id;
template.listedAt = today;
template.eventDate = today;
template.timeline[0].date = today;
await writeFile(outputFile, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
console.log(`已创建 ${path.relative(root, outputFile)}`);
