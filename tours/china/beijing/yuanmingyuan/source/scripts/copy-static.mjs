import fs from 'node:fs';
import path from 'node:path';
const target=path.resolve('..');
if(!fs.existsSync('dist/index.html'))throw new Error('先执行 npm run build');
fs.mkdirSync(target,{recursive:true});for(const entry of ['assets','textures','data'])fs.cpSync(`dist/${entry}`,`${target}/${entry}`,{recursive:true});fs.copyFileSync('dist/index.html',`${target}/scene.html`);
const currentAssets=new Set(fs.readdirSync('dist/assets'));for(const asset of fs.readdirSync(`${target}/assets`)){if(/\.(?:js|css)$/.test(asset)&&!currentAssets.has(asset))fs.unlinkSync(`${target}/assets/${asset}`);}
console.log('静态产物已复制至 '+target+'。发布仓库由用户现有部署流程完成。');
