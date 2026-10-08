import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const managerDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(managerDir, '..', '..');
const editorFile = path.join(managerDir, 'editor.html');
const editorCssFile = path.join(managerDir, 'editor.css');
const editorJsFile = path.join(managerDir, 'editor.js');
const databaseFile = path.join(root, 'brand-blacklist', 'database', 'blacklist.json');
const assertDir = path.join(root, 'brand-blacklist', 'assert');
const host = '127.0.0.1';
const requestedPort = Number.parseInt(process.argv[2] || '', 10);
const port = Number.isInteger(requestedPort) && requestedPort > 1024 && requestedPort < 65536 ? requestedPort : 8770;
const maxBodyBytes = 20 * 1024 * 1024;
const maxImageBytes = 12 * 1024 * 1024;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const assetNamePattern = /^[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|gif|webp)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${host}:${port}`);

    if (request.method === 'GET' && url.pathname === '/') {
      return send(response, 200, await readFile(editorFile), 'text/html; charset=utf-8');
    }
    if (request.method === 'GET' && url.pathname === '/editor.css') {
      return send(response, 200, await readFile(editorCssFile), 'text/css; charset=utf-8', 'no-cache');
    }
    if (request.method === 'GET' && url.pathname === '/editor.js') {
      return send(response, 200, await readFile(editorJsFile), 'text/javascript; charset=utf-8', 'no-cache');
    }
    if (request.method === 'GET' && url.pathname === '/api/database') {
      const database = await readDatabase();
      const assets = await listAssets(database.records);
      return json(response, 200, { database, assets });
    }
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json(response, 200, {
        ok: true,
        service: 'phdsx-brand-blacklist-manager',
        version: 2,
        pid: process.pid,
        managerUrl: `http://${host}:${port}/`,
        siteUrl: `http://${host}:${port}/brand-blacklist/`
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/shutdown') {
      assertLocalMutation(request);
      json(response, 200, { ok: true });
      setTimeout(() => server.close(() => process.exit(0)), 100);
      return;
    }
    if (request.method === 'PUT' && url.pathname === '/api/database') {
      assertLocalMutation(request);
      const database = JSON.parse(await readBody(request));
      const saved = await saveDatabase(database);
      return json(response, 200, { database: saved, assets: await listAssets(saved.records) });
    }
    if (request.method === 'POST' && url.pathname === '/api/assets/upload') {
      assertLocalMutation(request);
      const payload = JSON.parse(await readBody(request));
      const buffer = decodeBase64(payload.data);
      const saved = await saveAsset(buffer, payload.prefix);
      return json(response, 201, saved);
    }
    if (request.method === 'POST' && url.pathname === '/api/assets/fetch') {
      assertLocalMutation(request);
      const payload = JSON.parse(await readBody(request));
      const buffer = await downloadRemoteImage(payload.url);
      const saved = await saveAsset(buffer, payload.prefix);
      return json(response, 201, saved);
    }
    if (request.method === 'DELETE' && url.pathname === '/api/assets') {
      assertLocalMutation(request);
      const name = normalizeAssetName(url.searchParams.get('name'));
      const database = await readDatabase();
      const src = `assert/${name}`;
      const usedBy = database.records.filter((record) => (record.images || []).some((image) => image.src === src));
      if (usedBy.length) throw new Error(`图片仍被 ${usedBy.map((record) => record.name).join('、')} 使用，请先从记录中移除`);
      await rm(path.join(assertDir, name), { force: true });
      return json(response, 200, { ok: true });
    }
    if (request.method === 'GET' && url.pathname.startsWith('/files/')) {
      const name = normalizeAssetName(decodeURIComponent(url.pathname.slice('/files/'.length)));
      const kind = imageKind(await readFile(path.join(assertDir, name)));
      return send(response, 200, await readFile(path.join(assertDir, name)), kind.mime, 'public, max-age=3600');
    }
    if (url.pathname === '/favicon.ico') return send(response, 204, '');
    if (request.method === 'GET' && await serveSiteFile(url.pathname, response)) return;
    return json(response, 404, { error: '接口不存在' });
  } catch (error) {
    const status = error.statusCode || 400;
    return json(response, status, { error: error.message || String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`品牌黑名单本地管理已启动：http://${host}:${port}/`);
  console.log('数据直接写入 brand-blacklist/database，图片写入 brand-blacklist/assert。');
  console.log('关闭此窗口即可停止本地服务。');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${port} 已被占用；如果管理服务已启动，请直接访问 http://${host}:${port}/`);
    process.exit(2);
  }
  throw error;
});

async function readDatabase() {
  const database = JSON.parse(await readFile(databaseFile, 'utf8'));
  validateDatabase(database);
  return database;
}

async function saveDatabase(input) {
  const database = structuredClone(input);
  database.version = 1;
  database.updatedAt = new Date().toISOString();
  database.records.sort((a, b) => b.listedAt.localeCompare(a.listedAt) || a.name.localeCompare(b.name, 'zh-CN'));
  validateDatabase(database);
  await ensureAssetReferences(database.records);
  await writeJsonAtomic(databaseFile, database);
  return database;
}

function validateDatabase(database) {
  if (!database || typeof database !== 'object') throw new Error('数据库格式不正确');
  validateCategories(database.categories);
  if (!Array.isArray(database.records)) throw new Error('records 必须是数组');

  const seen = new Set();
  database.records.forEach((record, index) => {
    validateRecord(record, database.categories, `records[${index}]`);
    if (seen.has(record.id)) throw new Error(`存在重复记录 ID：${record.id}`);
    seen.add(record.id);
  });
}

function validateCategories(categories) {
  if (!categories || typeof categories !== 'object') throw new Error('缺少分类配置');
  for (const key of ['brandCategories', 'reasonCategories']) {
    const groups = categories[key];
    if (!Array.isArray(groups) || !groups.length) throw new Error(`${key} 至少需要一个一级分类`);
    const primaryNames = new Set();
    groups.forEach((group, index) => {
      if (!group || typeof group.name !== 'string' || !group.name.trim()) throw new Error(`${key}[${index}].name 不能为空`);
      if (primaryNames.has(group.name)) throw new Error(`${key} 存在重复一级分类：${group.name}`);
      primaryNames.add(group.name);
      if (!Array.isArray(group.children) || !group.children.length) throw new Error(`分类“${group.name}”至少需要一个二级分类`);
      const children = new Set();
      group.children.forEach((child) => {
        if (typeof child !== 'string' || !child.trim()) throw new Error(`分类“${group.name}”包含空的二级分类`);
        if (children.has(child)) throw new Error(`分类“${group.name}”包含重复二级分类：${child}`);
        children.add(child);
      });
    });
  }
}

function validateRecord(record, categories, label) {
  if (!record || typeof record !== 'object') throw new Error(`${label} 格式不正确`);
  const requiredText = ['id', 'name', 'listedAt', 'country', 'eventTitle', 'eventDate', 'summary', 'resolution'];
  requiredText.forEach((key) => {
    if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error(`${record.name || label}：${key} 为必填文本`);
  });
  if (!idPattern.test(record.id)) throw new Error(`${record.name}：ID 只能包含小写英文、数字和连字符`);
  validateDate(record.listedAt, `${record.name}：入黑日期`);
  validateDate(record.eventDate, `${record.name}：事件日期`);
  validateCategory(record.category, categories.brandCategories, `${record.name}：品牌分类`);
  validateCategory(record.reason, categories.reasonCategories, `${record.name}：原因分类`);
  if (!Array.isArray(record.aliases) || record.aliases.some((value) => typeof value !== 'string')) throw new Error(`${record.name}：aliases 必须是文本数组`);
  if (!Array.isArray(record.details) || !record.details.length || record.details.some((value) => typeof value !== 'string' || !value.trim())) throw new Error(`${record.name}：详细经过至少需要一段`);
  if (!Array.isArray(record.timeline)) throw new Error(`${record.name}：timeline 必须是数组`);
  record.timeline.forEach((item, index) => {
    validateDate(item?.date, `${record.name}：时间线第 ${index + 1} 行日期`);
    if (!item?.title || !item?.description) throw new Error(`${record.name}：时间线第 ${index + 1} 行不完整`);
  });
  if (!Array.isArray(record.sources)) throw new Error(`${record.name}：sources 必须是数组`);
  record.sources.forEach((source, index) => {
    if (!source?.label || !isHttpUrl(source.url)) throw new Error(`${record.name}：来源第 ${index + 1} 行需要名称和 HTTP(S) 地址`);
  });
  if (!Array.isArray(record.images)) throw new Error(`${record.name}：images 必须是数组`);
  record.images.forEach((image, index) => {
    if (!image || typeof image.src !== 'string' || !/^assert\/[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|gif|webp)$/.test(image.src)) {
      throw new Error(`${record.name}：图片第 ${index + 1} 项必须指向 assert 文件夹`);
    }
    if (typeof image.alt !== 'string' || !image.alt.trim()) throw new Error(`${record.name}：图片第 ${index + 1} 项缺少替代文字`);
    if (image.caption !== undefined && typeof image.caption !== 'string') throw new Error(`${record.name}：图片第 ${index + 1} 项说明格式不正确`);
  });
}

function validateCategory(value, configured, label) {
  if (!value?.primary || !value?.secondary) throw new Error(`${label}不完整`);
  const group = configured.find((item) => item.name === value.primary);
  if (!group) throw new Error(`${label}一级分类“${value.primary}”不存在`);
  if (!group.children.includes(value.secondary)) throw new Error(`${label}二级分类“${value.secondary}”不属于“${value.primary}”`);
}

function validateDate(value, label) {
  if (!datePattern.test(value || '') || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new Error(`${label}必须是有效的 YYYY-MM-DD 日期`);
}

async function ensureAssetReferences(records) {
  const names = new Set(records.flatMap((record) => record.images || []).map((image) => image.src.slice('assert/'.length)));
  for (const name of names) {
    try {
      await stat(path.join(assertDir, normalizeAssetName(name)));
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`引用的图片不存在：assert/${name}`);
      throw error;
    }
  }
}

async function listAssets(records) {
  const usage = new Map();
  records.forEach((record) => (record.images || []).forEach((image) => {
    const names = usage.get(image.src) || [];
    names.push({ id: record.id, name: record.name });
    usage.set(image.src, names);
  }));
  const names = (await readdir(assertDir)).filter((name) => assetNamePattern.test(name)).sort();
  return Promise.all(names.map(async (name) => {
    const info = await stat(path.join(assertDir, name));
    const src = `assert/${name}`;
    return { name, src, size: info.size, updatedAt: info.mtime.toISOString(), usedBy: usage.get(src) || [] };
  }));
}

function decodeBase64(value) {
  if (typeof value !== 'string' || !value.length) throw new Error('缺少图片数据');
  const buffer = Buffer.from(value, 'base64');
  if (!buffer.length || buffer.length > maxImageBytes) throw new Error('图片必须小于 12 MB');
  return buffer;
}

async function saveAsset(buffer, prefix) {
  if (buffer.length > maxImageBytes) throw new Error('图片必须小于 12 MB');
  const kind = imageKind(buffer);
  const safePrefix = String(prefix || 'evidence').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'evidence';
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const name = `${safePrefix}-${stamp}-${randomBytes(3).toString('hex')}.${kind.extension}`;
  await writeFile(path.join(assertDir, name), buffer, { flag: 'wx' });
  return { name, src: `assert/${name}`, size: buffer.length, url: `/files/${encodeURIComponent(name)}` };
}

function imageKind(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: 'png', mime: 'image/png' };
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return { extension: 'jpg', mime: 'image/jpeg' };
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return { extension: 'gif', mime: 'image/gif' };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { extension: 'webp', mime: 'image/webp' };
  throw new Error('仅支持 PNG、JPEG、GIF 或 WebP 图片');
}

async function downloadRemoteImage(value) {
  let current = parseRemoteUrl(value);
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    await assertPublicAddress(current);
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'PHDSX-Brand-Blacklist-Manager/1.0', Accept: 'image/png,image/jpeg,image/gif,image/webp' }
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('图片地址重定向缺少目标');
      current = parseRemoteUrl(new URL(location, current).href);
      continue;
    }
    if (!response.ok) throw new Error(`图片下载失败：HTTP ${response.status}`);
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > maxImageBytes) throw new Error('远程图片超过 12 MB');
    const buffer = await readLimitedResponse(response);
    imageKind(buffer);
    return buffer;
  }
  throw new Error('图片地址重定向次数过多');
}

async function readLimitedResponse(response) {
  if (!response.body) throw new Error('远程图片没有内容');
  const chunks = [];
  let size = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxImageBytes) {
      await reader.cancel();
      throw new Error('远程图片超过 12 MB');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function parseRemoteUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('图片地址格式不正确'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('仅支持无账号信息的 HTTP(S) 图片地址');
  return url;
}

async function assertPublicAddress(url) {
  const hostName = url.hostname.replace(/^\[|\]$/g, '');
  if (hostName.toLowerCase() === 'localhost') throw new Error('不允许拉取本机或内网地址');
  const addresses = isIP(hostName) ? [{ address: hostName }] : await lookup(hostName, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('不允许拉取本机或内网地址');
}

function isPrivateAddress(address) {
  const normalized = address.toLowerCase();
  if (normalized.includes(':')) {
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('::ffff:');
  }
  const octets = normalized.split('.').map(Number);
  return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || octets[0] >= 224 ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 198 && [18, 19].includes(octets[1]));
}

async function writeJsonAtomic(file, value) {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const backup = `${file}.bak`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rm(backup, { force: true });
  await rename(file, backup);
  try {
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    await rename(backup, file);
    throw error;
  }
  await rm(backup, { force: true });
}

function normalizeAssetName(value) {
  const name = String(value || '');
  if (!assetNamePattern.test(name) || path.basename(name) !== name) throw new Error('图片文件名不正确');
  return name;
}

async function serveSiteFile(urlPath, response) {
  let pathname;
  try { pathname = decodeURIComponent(urlPath); }
  catch { return false; }
  if (pathname === '/brand-blacklist') pathname = '/brand-blacklist/';
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (!isPublicSitePath(pathname)) return false;

  const file = path.resolve(root, `.${pathname}`);
  const rootPrefix = `${root}${path.sep}`.toLowerCase();
  if (!file.toLowerCase().startsWith(rootPrefix)) return false;
  try {
    const body = await readFile(file);
    send(response, 200, body, staticContentType(path.extname(file)), 'no-cache');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return false;
    throw error;
  }
}

function isPublicSitePath(pathname) {
  if (/(?:^|\/)\./.test(pathname)) return false;
  if (/^\/(?:assets|brand-blacklist|games|novels|tools)\//.test(pathname)) return true;
  return /^\/[a-z0-9-]+\.html$/i.test(pathname);
}

function staticContentType(extension) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  })[extension.toLowerCase()] || 'application/octet-stream';
}

function assertLocalMutation(request) {
  const origin = request.headers.origin;
  if (origin && ![`http://${host}:${port}`, `http://localhost:${port}`].includes(origin)) {
    const error = new Error('拒绝来自其他页面的本地写入请求');
    error.statusCode = 403;
    throw error;
  }
}

function isHttpUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(new Error('请求内容超过 20 MB 限制'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function json(response, status, value) {
  send(response, status, `${JSON.stringify(value)}\n`, 'application/json; charset=utf-8');
}

function send(response, status, body, contentType = 'text/plain; charset=utf-8', cacheControl = 'no-store') {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  });
  response.end(body);
}
