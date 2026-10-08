import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../../..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.glb':'model/gltf-binary','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8'};
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  let p=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!p.startsWith(root+path.sep)&&p!==root)throw Error('Forbidden');
  if((await fs.stat(p)).isDirectory())p=path.join(p,'index.html');
  const b=await fs.readFile(p);res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(b);
}catch{res.writeHead(404);res.end('Not found');}}).listen(Number(process.env.PORT||5193),'127.0.0.1',()=>console.log('Site: http://127.0.0.1:'+ (process.env.PORT||5193)+'/tours/china/beijing/beijing-zoo/'));
