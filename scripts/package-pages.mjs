import { execFileSync } from 'node:child_process';
import { copyFile, lstat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, process.argv[2] ?? '.pages-build');
if (output === root || !output.startsWith(root + path.sep)) throw new Error('Pages output must be inside its own workspace subdirectory');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).split('\0').filter(Boolean);
let count = 0;
for (const file of new Set(files)) {
  if (file.split('/').some(part => part.startsWith('.') || ['node_modules', 'source', '__pycache__'].includes(part)) || /\.(log|pyc|pyd)$/.test(file)) continue;
  const source = path.resolve(root, file);
  if (source.startsWith(output + path.sep)) continue;
  let info;
  try { info = await lstat(source); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (!info.isFile()) continue;
  const target = path.join(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  count++;
}
console.log(`Packaged ${count} static site files into ${output}`);
