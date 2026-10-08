import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const result = spawnSync(process.execPath, [path.join(root, 'scripts/build-tours.mjs'), '--only', 'beijing-zoo'], {cwd:root, stdio:'inherit'});
if (result.error) throw result.error;
process.exit(result.status || 0);
