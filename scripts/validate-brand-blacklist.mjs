import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseFile = path.join(root, 'brand-blacklist', 'database', 'blacklist.json');
const assertDir = path.join(root, 'brand-blacklist', 'assert');
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const imagePattern = /^assert\/[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|gif|webp)$/;

const database = JSON.parse(await readFile(databaseFile, 'utf8'));
const errors = [];
const ids = new Set();

if (!database?.categories || !Array.isArray(database?.records)) fail('数据库必须包含 categories 和 records');
for (const key of ['brandCategories', 'reasonCategories']) validateCategoryGroups(database.categories?.[key], key);

for (const [index, record] of (database.records || []).entries()) {
  const label = record?.name || `records[${index}]`;
  for (const key of ['id', 'name', 'listedAt', 'country', 'eventTitle', 'eventDate', 'summary', 'resolution']) {
    if (typeof record?.[key] !== 'string' || !record[key].trim()) fail(`${label}: ${key} 为必填文本`);
  }
  if (!idPattern.test(record?.id || '')) fail(`${label}: id 格式不正确`);
  if (ids.has(record?.id)) fail(`${label}: id 重复`);
  ids.add(record?.id);
  validateDate(record?.listedAt, `${label}: listedAt`);
  validateDate(record?.eventDate, `${label}: eventDate`);
  validateCategory(record?.category, database.categories?.brandCategories, `${label}: category`);
  validateCategory(record?.reason, database.categories?.reasonCategories, `${label}: reason`);
  if (!Array.isArray(record?.details) || !record.details.length) fail(`${label}: details 至少需要一段`);
  if (!Array.isArray(record?.timeline)) fail(`${label}: timeline 必须是数组`);
  for (const [timelineIndex, item] of (record?.timeline || []).entries()) {
    validateDate(item?.date, `${label}: timeline[${timelineIndex}].date`);
    if (!item?.title || !item?.description) fail(`${label}: timeline[${timelineIndex}] 不完整`);
  }
  if (!Array.isArray(record?.sources)) fail(`${label}: sources 必须是数组`);
  for (const [sourceIndex, source] of (record?.sources || []).entries()) {
    if (!source?.label || !isHttpUrl(source?.url)) fail(`${label}: sources[${sourceIndex}] 格式不正确`);
  }
  if (!Array.isArray(record?.images)) fail(`${label}: images 必须是数组`);
  for (const [imageIndex, image] of (record?.images || []).entries()) {
    if (!imagePattern.test(image?.src || '')) {
      fail(`${label}: images[${imageIndex}].src 必须指向 assert 文件夹`);
      continue;
    }
    if (!image?.alt?.trim()) fail(`${label}: images[${imageIndex}].alt 不能为空`);
    try { await access(path.join(assertDir, image.src.slice('assert/'.length))); }
    catch { fail(`${label}: 图片不存在：${image.src}`); }
  }
}

if (errors.length) {
  console.error(`品牌黑名单校验失败（${errors.length} 项）：`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`品牌黑名单校验通过：${database.records.length} 条记录，${database.categories.brandCategories.length} 个品牌一级分类，${database.categories.reasonCategories.length} 个原因一级分类。`);

function validateCategoryGroups(groups, key) {
  if (!Array.isArray(groups) || !groups.length) return fail(`${key} 至少需要一个分类`);
  const names = new Set();
  groups.forEach((group, index) => {
    if (!group?.name?.trim()) fail(`${key}[${index}].name 不能为空`);
    if (names.has(group?.name)) fail(`${key} 一级分类重复：${group.name}`);
    names.add(group?.name);
    if (!Array.isArray(group?.children) || !group.children.length) fail(`${key} / ${group?.name} 至少需要一个二级分类`);
    if (new Set(group?.children || []).size !== (group?.children || []).length) fail(`${key} / ${group?.name} 存在重复二级分类`);
  });
}

function validateCategory(value, groups, label) {
  const group = (groups || []).find((item) => item.name === value?.primary);
  if (!group) return fail(`${label}.primary 不存在：${value?.primary || '空'}`);
  if (!group.children.includes(value?.secondary)) fail(`${label}.secondary 不属于 ${group.name}：${value?.secondary || '空'}`);
}

function validateDate(value, label) {
  if (!datePattern.test(value || '') || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) fail(`${label} 必须是有效的 YYYY-MM-DD 日期`);
}

function isHttpUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function fail(message) { errors.push(message); }
