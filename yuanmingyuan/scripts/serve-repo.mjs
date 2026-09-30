import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('..'),port=Number(process.env.PORT||5188);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost'),rel=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,rel.endsWith('/')?rel+'index.html':rel||'index.html');if(!file.startsWith(root+path.sep)||rel.split('/').some(x=>x.startsWith('.'))){res.writeHead(403);res.end();return}if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)}catch{res.writeHead(400);res.end()}}).listen(port,'127.0.0.1',()=>console.log(`Local static: http://127.0.0.1:${port}/tours/china/beijing/yuanmingyuan/`));
