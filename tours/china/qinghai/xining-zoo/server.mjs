import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.PORT||process.argv[2]||4173);
const mime={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.ktx2':'image/ktx2'};
const server=http.createServer(async(req,res)=>{
 try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/')name='/index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return}const info=await stat(file);if(!info.isFile())throw Error('not a file');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':name.startsWith('/assets/vendor/')?'public, max-age=86400':'no-cache','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('资源不存在。请检查交付文件是否完整。')}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。运行 node server.mjs 4174 更换端口。`:error.message);process.exitCode=1});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}\n西宁野生动物园 · 资料核对版`));
