// Rebuild the shared Worker without rebuilding unrelated tools.
import { build } from '../tools/lifestyle/pokemon-map/deployment/node_modules/esbuild/lib/main.js';
import { fileURLToPath } from 'node:url';
await build({entryPoints:['worker/site.ts'],outfile:'.worker/site.mjs',bundle:true,minify:true,legalComments:'eof',target:'es2022',format:'esm',platform:'browser',nodePaths:[fileURLToPath(new URL('../tools/lifestyle/pokemon-map/deployment/node_modules',import.meta.url))]});
console.log('Built shared site API Worker.');
