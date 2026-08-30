import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const serverFile = path.join(scriptDir, 'brand-blacklist-manager', 'server.mjs');
const healthUrl = 'http://127.0.0.1:8770/api/health';
const managerUrl = 'http://127.0.0.1:8770/';
const noBrowser = process.argv.includes('--no-browser');

if (!await serviceIsReady()) {
  const service = spawn(process.execPath, [serverFile], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  service.unref();

  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (await serviceIsReady()) {
      ready = true;
      break;
    }
  }
  if (!ready) {
    console.error('Local service failed to start. Make sure port 8770 is available.');
    process.exit(1);
  }
}

if (!noBrowser) {
  const browser = spawn('cmd.exe', ['/d', '/s', '/c', 'start', '', managerUrl], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  browser.unref();
}

console.log(`Brand blacklist service is ready: ${managerUrl}`);

async function serviceIsReady() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1000), cache: 'no-store' });
    if (!response.ok) return false;
    const health = await response.json();
    return health.ok === true && health.service === 'phdsx-brand-blacklist-manager' && health.version >= 2;
  } catch {
    return false;
  }
}
