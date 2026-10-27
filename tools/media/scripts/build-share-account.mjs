import {build} from '../../lifestyle/pokemon-map/deployment/node_modules/esbuild/lib/main.js';
import {fileURLToPath} from 'node:url';

await build({
  entryPoints: [fileURLToPath(new URL('./share-account.mjs', import.meta.url))],
  outfile: fileURLToPath(new URL('./share-account-browser.js', import.meta.url)),
  bundle: true, format: 'iife', target: 'es2022', legalComments: 'eof'
});
console.log('Built share account browser script (works with file:// and HTTP).');
