import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'content', 'collections', 'brand-blacklist');
const recordsDir = path.join(dataDir, 'records');
const outputFile = path.join(root, 'assets', 'brand-blacklist-data.js');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const parseJson = async (file) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(root, file)}: JSON 无法解析（${error.message}）`);
  }
};

const categories = await parseJson(path.join(dataDir, 'categories.json'));
const files = (await readdir(recordsDir)).filter((file) => file.endsWith('.json')).sort();
const records = await Promise.all(files.map(async (file) => {
  const record = await parseJson(path.join(recordsDir, file));
  validateRecord(record, file, categories);
  return record;
}));

const duplicateIds = records.map((record) => record.id).filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`存在重复 id：${[...new Set(duplicateIds)].join(', ')}`);

records.sort((a, b) => b.listedAt.localeCompare(a.listedAt) || a.name.localeCompare(b.name, 'zh-CN'));
const banner = '// 此文件由 scripts/generate-brand-blacklist.mjs 自动生成，请修改 content/collections/brand-blacklist/ 下的源数据。\n';
const output = `${banner}window.PHDSX_BRAND_BLACKLIST_CATEGORIES = ${JSON.stringify(categories, null, 2)};\n\nwindow.PHDSX_BRAND_BLACKLIST = ${JSON.stringify(records, null, 2)};\n`;
await writeFile(outputFile, output, 'utf8');
console.log(`已生成 ${path.relative(root, outputFile)}，共 ${records.length} 条记录。`);

function validateRecord(record, file, categoryConfig) {
  const location = `content/collections/brand-blacklist/records/${file}`;
  const requiredText = ['id', 'name', 'listedAt', 'country', 'eventTitle', 'eventDate', 'summary', 'resolution'];
  requiredText.forEach((key) => {
    if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error(`${location}: ${key} 为必填文本`);
  });
  if (!idPattern.test(record.id)) throw new Error(`${location}: id 只能包含小写英文、数字和连字符`);
  if (`${record.id}.json` !== file) throw new Error(`${location}: 文件名必须与 id 一致`);
  ['listedAt', 'eventDate'].forEach((key) => validateDate(record[key], `${location}: ${key}`));
  validateCategory(record.category, categoryConfig.brandCategories, `${location}: category`);
  validateCategory(record.reason, categoryConfig.reasonCategories, `${location}: reason`);
  if (!Array.isArray(record.details) || record.details.length === 0) throw new Error(`${location}: details 至少需要一段`);
  if (!Array.isArray(record.timeline)) throw new Error(`${location}: timeline 必须是数组`);
  record.timeline.forEach((item, index) => {
    validateDate(item.date, `${location}: timeline[${index}].date`);
    if (!item.title || !item.description) throw new Error(`${location}: timeline[${index}] 缺少 title 或 description`);
  });
  if (!Array.isArray(record.sources)) throw new Error(`${location}: sources 必须是数组`);
  record.sources.forEach((source, index) => {
    if (!source.label || !/^https?:\/\//i.test(source.url || '')) throw new Error(`${location}: sources[${index}] 需要 label 和 http(s) URL`);
  });
}

function validateCategory(value, configured, label) {
  if (!value || !value.primary || !value.secondary) throw new Error(`${label} 需要 primary 和 secondary`);
  const primary = configured.find((item) => item.name === value.primary);
  if (!primary) throw new Error(`${label}.primary “${value.primary}” 未在 categories.json 中登记`);
  if (!primary.children.includes(value.secondary)) throw new Error(`${label}.secondary “${value.secondary}” 不属于 “${value.primary}”`);
}

function validateDate(value, label) {
  if (!datePattern.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new Error(`${label} 必须是有效的 YYYY-MM-DD 日期`);
}
