import {build} from "esbuild";
import {mkdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
await mkdir(".sites-runtime/tests",{recursive:true});
await build({entryPoints:["tests/pokemon.test.ts"],bundle:true,platform:"node",format:"esm",outfile:".sites-runtime/tests/pokemon.test.mjs"});
const result=spawnSync(process.execPath,["--test",".sites-runtime/tests/pokemon.test.mjs"],{stdio:"inherit"});
process.exit(result.status??1);
