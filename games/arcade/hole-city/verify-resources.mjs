import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const root=new URL('./runtime/',import.meta.url);
const catalog=await readFile(new URL('StreamingAssets/aa/catalog.bin',root));
const pattern=/(?:(?:city|jurassic|mars|pirates|winter|preload|game)_scenes_all|(?:main_assets(?:_assets)?|shared_assets|fonts_assets)_all|cfa[a-z0-9]+_(?:monoscripts|unitybuiltinassets))_[0-9a-f]{32}\.bundle/g;
const bundles=[...new Set(catalog.toString('latin1').match(pattern)||[])];
assert.equal(bundles.length,13,'The game catalog must list all 13 known scene and shared bundles');
for(const bundle of bundles)await access(new URL('StreamingAssets/aa/WebGL/'+bundle,root));
const data=gunzipSync(await readFile(new URL('game.data.gz',root))),wasm=gunzipSync(await readFile(new URL('game.wasm.gz',root)));
assert.equal(data.subarray(0,16).toString('ascii'),'UnityWebData1.0\0');
const headerSize=data.readUInt32LE(16);let pos=20;const entries=[];
while(pos<headerSize){const offset=data.readUInt32LE(pos),size=data.readUInt32LE(pos+4),nameLength=data.readUInt32LE(pos+8);pos+=12;const name=data.subarray(pos,pos+nameLength).toString('utf8');pos+=nameLength;assert.ok(offset>=headerSize&&offset+size<=data.length,`Invalid Unity data entry ${name}`);entries.push(name);}
assert.ok(entries.includes('Il2CppData/Metadata/global-metadata.dat'));assert.ok(entries.includes('data.unity3d'));
assert.equal(wasm.subarray(0,4).toString('hex'),'0061736d');assert.ok(WebAssembly.validate(wasm),'WebAssembly binary should validate');
console.log(`Unity resource checks passed: ${bundles.length} catalog bundles, ${entries.length} data entries, valid WebAssembly.`);
