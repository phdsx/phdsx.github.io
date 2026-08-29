import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = [root];
const files = [];

for (const sourceRoot of roots) await collect(sourceRoot);

const missing = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const references = file.endsWith('.html')
    ? [...text.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1])
    : [...text.matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map((match) => match[1]);
  for (const reference of references) {
    if (reference.includes('${')) continue;
    if (/^(?:[a-z]+:|\/\/|#|data:)/i.test(reference)) continue;
    const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
    if (!clean) continue;
    const target = clean.startsWith('/')
      ? path.join(root, clean.replace(/^\/+/, ''))
      : path.resolve(path.dirname(file), clean);
    try {
      await access(target);
    } catch {
      missing.push(`${path.relative(root, file)} -> ${reference}`);
    }
  }
}

if (missing.length) {
  console.error(`发现 ${missing.length} 个无效本地引用：`);
  missing.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`本地引用检查通过，共扫描 ${files.length} 个 HTML/CSS 文件。`);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'docs' || entry.name === 'content' || entry.name === 'scripts') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (directory === root && !['tools', 'games', 'novels', 'brand-blacklist'].includes(entry.name)) continue;
      await collect(fullPath);
    } else if (/\.(?:html|css)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
}
