import fs from 'node:fs';
import path from 'node:path';
const target=path.resolve('../tours/china/beijing/yuanmingyuan');
if(!fs.existsSync('dist/index.html'))throw new Error('先执行 npm run build');
fs.mkdirSync(target,{recursive:true});for(const entry of ['assets','textures','data'])fs.cpSync(`dist/${entry}`,`${target}/${entry}`,{recursive:true});fs.copyFileSync('dist/index.html',`${target}/scene.html`);
console.log('静态产物已复制至 '+target+'。发布仓库由用户现有部署流程完成。');
