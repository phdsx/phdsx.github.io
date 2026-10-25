import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, rm, stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseVideoInput, PLATFORM_NAMES } from '../scripts/video-platforms.mjs';

export const MEDIA_API_PREFIX='/tools/media/video/api/';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const baseDirectory=path.join(root,'.local-tools','video-cache');
const bridge=fileURLToPath(new URL('./ytdlp_bridge.py',import.meta.url));
const localPython=path.join(root,'.local-tools','video-downloader',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const extractors={youtube:'Youtube',douyin:'Douyin',xiaohongshu:'XiaoHongShu'};
const domains={youtube:['googlevideo.com','youtube.com'],douyin:['douyinvod.com','douyincdn.com','bytecdn.cn','ibytedtos.com','amemv.com','snssdk.com','toutiaovod.com','byteoversea.com'],xiaohongshu:['xhscdn.com','xiaohongshu.com']};
const messages={FRESH_COOKIES:'抖音当前请求需要新的浏览器 Cookie，未登录的访问 Cookie 也可能适用。请在「平台登录 Cookie」中填写你自己的抖音 Cookie 后重新解析；B站登录不能用于抖音。',LOGIN_REQUIRED:'平台要求登录或访问验证。请提供你自己的有效 Cookie 后重新解析；B站扫码登录仅适用于 B站。',UNAVAILABLE:'视频不可用、已删除、非视频笔记或当前账号没有访问权限。',NETWORK:'平台连接失败或访问频率受限，请检查服务端网络、代理或稍后重试。',EXTRACT_FAILED:'平台解析失败，请检查链接是否完整（小红书请保留分享 token），或更新 yt-dlp 后重试。',MISSING_DEPENDENCY:'视频解析依赖未安装，请运行 tools/media/service/README.md 中的安装命令。'};
const json=(data,status=200,cookie)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
function error(message,status=422){return Object.assign(new Error(message),{status});}
const suffix=(host,domain)=>host===domain||host.endsWith('.'+domain);
function safeMedia(value,platform){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&!u.port&&domains[platform].some(d=>suffix(u.hostname,d));}catch{return false;}}
export function cookiesToNetscape(value,platform){
  if(!value)return '';
  if(typeof value!=='string'||value.length>16384||/[\r\n\x00]/.test(value))throw error('Cookie 格式不正确，请粘贴单行 Cookie 请求头的值。',400);
  const domain={youtube:'.youtube.com',douyin:'.douyin.com',xiaohongshu:'.xiaohongshu.com'}[platform];
  const pairs=value.split(';').filter(p=>p.trim()).map(p=>{const i=p.indexOf('=');const name=p.slice(0,i).trim(),v=p.slice(i+1).trim();if(i<1||!/^[-\w]+$/.test(name)||/[\t]/.test(v))throw error('Cookie 格式不正确。',400);return `${domain}\tTRUE\t/\tTRUE\t0\t${name}\t${v}`;});
  return '# Netscape HTTP Cookie File\n'+pairs.join('\n')+'\n';
}
export function normalizeVideo(info,platform){
  if(!info||info._type==='playlist'||info.entries||info.is_live||info.has_drm)throw error('暂只支持非 DRM 的单条点播视频，不支持直播、合集和图文笔记。');
  const raw=(info.formats||[]).filter(f=>!f.has_drm&&/^[\w.-]{1,150}$/.test(String(f.format_id))&&safeMedia(f.url,platform));
  const audio=raw.filter(f=>f.vcodec==='none'&&f.acodec&&f.acodec!=='none').sort((a,b)=>(b.acodec.startsWith('mp4a')?1:0)-(a.acodec.startsWith('mp4a')?1:0)||(b.abr||0)-(a.abr||0))[0];
  const allFormats=raw.filter(f=>f.vcodec!=='none'&&(f.height>0||f.ext==='mp4'||f.ext==='webm')).map(f=>{
    const separate=f.acodec==='none';
    if(separate&&!audio)return null;
    const height=f.height||info.height||0;
    return {id:String(f.format_id),quality:height,label:height?`${height}P${f.fps?' '+Math.round(f.fps)+'帧':''}`:'原始画质',width:f.width||info.width,height,frameRate:f.fps||'',codec:f.vcodec||'MP4',type:'prepared',hasAudio:!separate||Boolean(audio),bandwidth:(f.tbr||0)*1000,size:f.filesize||f.filesize_approx||0,selector:f.format_id+(separate?'+'+audio.format_id:''),sourceRank:!f.protocol||f.protocol==='https'||f.protocol==='http'?2:1};
  }).filter(Boolean).sort((a,b)=>b.height-a.height||(a.codec.startsWith('avc')?0:1)-(b.codec.startsWith('avc')?0:1));
  const unique=new Map();
  const family=codec=>/^(vp9|vp09)/.test(codec)?'vp9':/^(avc|h264)/.test(codec)?'h264':/^(hev|hvc)/.test(codec)?'h265':codec.split('.')[0];
  for(const format of allFormats){const key=`${format.width||0}:${format.height}:${Math.round(format.frameRate||0)}:${family(format.codec)}`;const old=unique.get(key);if(!old||format.sourceRank>old.sourceRank||(format.sourceRank===old.sourceRank&&format.bandwidth>old.bandwidth))unique.set(key,format);}
  const formats=[...unique.values()].map(({sourceRank,...format})=>format);
  if(!formats.length)throw error('没有可下载的视频清晰度。该链接可能是图文、受限内容，或平台需要有效 Cookie。');
  const safeFormats=new Set(formats.flatMap(f=>f.selector.split('+')));
  const sanitized={...info,formats:raw.filter(f=>safeFormats.has(String(f.format_id)))};
  delete sanitized.requested_downloads;delete sanitized.requested_formats;
  return {info:sanitized,formats,title:String(info.title||info.id||'视频').slice(0,300),id:String(info.id||''),owner:String(info.uploader||info.creator||''),duration:Number(info.duration)||0,cover:/^https:\/\//.test(info.thumbnail||'')?info.thumbnail:''};
}
const removals=new Map();
async function removeDirectory(directory){const target=path.resolve(directory);if(!target.startsWith(path.resolve(baseDirectory)+path.sep)||target===path.resolve(baseDirectory))throw new Error('Invalid cache directory');if(removals.has(target))return removals.get(target);const task=rm(target,{recursive:true,force:true,maxRetries:5,retryDelay:60});removals.set(target,task);try{await task;}finally{removals.delete(target);}}
export function runBridge(config,onEvent=()=>{}){
  const python=process.env.VIDEO_PYTHON||(existsSync(localPython)?localPython:process.platform==='win32'?'python':'python3');
  const child=spawn(python,[bridge],{stdio:['pipe','pipe','pipe'],windowsHide:true,detached:process.platform!=='win32',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  let line='',bytes=0,lastError=null;
  const done=new Promise((resolve,reject)=>{
    child.stdout.on('data',chunk=>{
      bytes+=chunk.length;if(bytes>12*1024*1024){child.kill();lastError=error('解析结果过大，请选择单个视频。');return;}
      line+=chunk.toString('utf8');let at;while((at=line.indexOf('\n'))>=0){const value=line.slice(0,at);line=line.slice(at+1);try{const event=JSON.parse(value);if(event.event==='error')lastError=error(messages[event.code]||messages.EXTRACT_FAILED);else onEvent(event);}catch{/* Ignore non-protocol output. */}}
    });
    // Extractor errors can contain URLs or cookies; never expose or log stderr.
    child.stderr.resume();child.stdin.on('error',()=>{});
    child.on('error',()=>{lastError=error(messages.MISSING_DEPENDENCY,503);});
    child.on('close',code=>code===0&&!lastError?resolve():reject(lastError||error(messages.EXTRACT_FAILED)));
  });
  child.stdin.end(JSON.stringify({...config,node:process.execPath,ffmpeg:process.env.VIDEO_FFMPEG||undefined}));
  return {done,cancel(){if(!child.pid)return;if(process.platform==='win32')spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else{try{process.kill(-child.pid,'SIGTERM');}catch{}}}};
}
async function readBody(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw error('请求格式应为 JSON。',415);
  const reader=request.body?.getReader();const parts=[];let length=0;
  if(reader)for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>24576){await reader.cancel();throw error('请求内容过长。',413);}parts.push(value);}
  const data=new Uint8Array(length);let at=0;for(const p of parts){data.set(p,at);at+=p.length;}
  try{const parsed=JSON.parse(new TextDecoder().decode(data));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();return parsed;}catch{throw error('请求内容无效。',400);}
}
export function createVideoService({runner=runBridge,fetcher=fetch,now=Date.now}={}){
  const sessions=new Map(),jobs=new Map();let extracting=0;
  async function cleanup(){for(const [id,session]of sessions)if(session.expiresAt<now()){sessions.delete(id);session.cookieText='';}for(const [id,job]of jobs)if(job.expiresAt<now()){const done=job.process?.done;job.state='canceled';job.process?.cancel();jobs.delete(id);if(done)done.catch(()=>{}).finally(()=>removeDirectory(job.directory)).catch(()=>{});else await removeDirectory(job.directory);}}
  const sweeper=setInterval(()=>cleanup().catch(()=>{}),60000);sweeper.unref?.();
  async function expand(input){let parsed=parseVideoInput(input);for(let i=0;parsed.short&&i<5;i++){
    const r=await fetcher(parsed.url,{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(15000)});await r.body?.cancel();
    if(![301,302,303,307,308].includes(r.status)||!r.headers.get('location'))throw error('短链接未能跳转，请使用完整视频地址。');
    const next=parseVideoInput(new URL(r.headers.get('location'),parsed.url).href);if(next.platform!==parsed.platform)throw error('短链接跳转到了其他平台。');parsed=next;
  }if(parsed.short)throw error('短链接跳转次数过多。');return parsed;}
  return async function handle(request){
    let cookieHeader;
    try{
      const u=new URL(request.url);const key=process.env.VIDEO_SERVICE_KEY;
      if(key){const supplied=request.headers.get('x-video-service-key')||'';const a=Buffer.from(key),b=Buffer.from(supplied);if(a.length!==b.length||!timingSafeEqual(a,b))return json({message:'视频服务认证失败。'},403);}
      else if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==u.origin))return json({message:'请从本站工具页面发起请求。'},403);
      if(!u.pathname.startsWith(MEDIA_API_PREFIX))return json({message:'接口不存在。'},404);
      await cleanup();const action=u.pathname.slice(MEDIA_API_PREFIX.length);
      if(action==='health'&&request.method==='GET')return json({service:'multi-video',platforms:Object.keys(extractors),engine:'yt-dlp'});
      let owner=(request.headers.get('cookie')||'').match(/(?:^|;\s*)phdsx_video_client=([a-f0-9]{64})(?:;|$)/)?.[1];
      if(!owner){owner=randomBytes(32).toString('hex');cookieHeader=`phdsx_video_client=${owner}; Path=${MEDIA_API_PREFIX}; HttpOnly; SameSite=Strict${u.protocol==='https:'||request.headers.get('x-video-site-proto')==='https'?'; Secure':''}`;}
      if(action==='resolve'&&request.method==='POST'){
        if(extracting>=2||sessions.size>=32)throw error('当前解析任务较多，请稍后重试。',429);
        const body=await readBody(request);const parsed=await expand(body.url);if(!extractors[parsed.platform])throw error('B站视频请使用 B站解析接口。',400);
        const cookieText=cookiesToNetscape(body.cookie||'',parsed.platform);const id=randomBytes(24).toString('hex'),directory=path.join(baseDirectory,id);await mkdir(directory,{recursive:true});extracting++;
        let task,info;const timeout=setTimeout(()=>task?.cancel(),90000);
        try{task=runner({mode:'inspect',url:parsed.url,extractor:extractors[parsed.platform],directory,cookieText},event=>{if(event.event==='info')info=event.info;});await task.done;if(!info)throw error(messages.EXTRACT_FAILED);}
        finally{clearTimeout(timeout);extracting--;await removeDirectory(directory);}
        const normalized=normalizeVideo(info,parsed.platform);const session={...normalized,owner,cookieText,platform:parsed.platform,url:parsed.url,expiresAt:now()+30*60000};sessions.set(id,session);
        return json({engine:'yt-dlp',platform:parsed.platform,platformName:PLATFORM_NAMES[parsed.platform],sessionId:id,id:normalized.id,title:normalized.title,owner:normalized.owner,duration:normalized.duration,cover:normalized.cover,url:parsed.url,formats:normalized.formats.map(({selector,...f})=>f),pages:[],page:1,loggedIn:Boolean(cookieText),unavailable:[],expiresAt:session.expiresAt},200,cookieHeader);
      }
      if(action==='jobs'&&request.method==='POST'){
        if([...jobs.values()].filter(j=>['downloading','merging'].includes(j.state)).length>=2||jobs.size>=12)throw error('当前下载任务较多，请稍后重试。',429);
        const body=await readBody(request);const session=sessions.get(body.sessionId);if(!session||session.owner!==owner)throw error('解析结果已过期，请重新解析。',404);
        const format=session.formats.find(f=>f.id===body.formatId);if(!format)throw error('清晰度不存在，请重新解析。',400);
        const id=randomBytes(24).toString('hex'),directory=path.join(baseDirectory,id);await mkdir(directory,{recursive:true});
        const job={id,owner,directory,state:'downloading',progress:0,title:session.title,format:format.label,expiresAt:now()+60*60000};jobs.set(id,job);
        job.process=runner({mode:'download',info:session.info,extractor:extractors[session.platform],directory,cookieText:session.cookieText,format:format.selector},event=>{
          if(job.state==='canceled')return;
          if(event.event==='progress'&&event.total)job.progress=Math.max(job.progress,Math.min(90,Math.round(event.downloaded/event.total*90)));
          if(event.event==='merging'){job.state='merging';job.progress=95;}
          if(event.event==='ready'&&event.file==='video.mp4')job.output=true;
        });
        const timeout=setTimeout(()=>job.process?.cancel(),45*60000);timeout.unref?.();
        job.process.done.then(async()=>{if(job.state==='canceled')return;const file=path.join(directory,'video.mp4');const s=await stat(file);if(!job.output||!s.size)throw error('没有生成完整 MP4 文件。');job.state='ready';job.progress=100;job.size=s.size;}).catch(async e=>{if(job.state!=='canceled'){job.state='error';job.message=e.message;}await removeDirectory(directory);}).finally(()=>{clearTimeout(timeout);job.process=null;});
        return json({id,state:job.state},200,cookieHeader);
      }
      const match=action.match(/^jobs\/([a-f0-9]{48})(?:\/(file|cancel|release))?$/);if(!match)return json({message:'接口不存在或请求方法不支持。'},404);
      const job=jobs.get(match[1]);if(!job||job.owner!==owner)return json({message:'下载任务不存在或已过期。'},404);
      if(!match[2]&&request.method==='GET')return json({id:job.id,state:job.state,progress:job.progress,size:job.size,message:job.message});
      if(['cancel','release'].includes(match[2])&&request.method==='POST'){
        const done=job.process?.done;job.state='canceled';job.process?.cancel();jobs.delete(job.id);
        if(done)done.catch(()=>{}).finally(()=>removeDirectory(job.directory)).catch(()=>{});else await removeDirectory(job.directory);
        return json({state:'canceled'});
      }
      if(match[2]==='file'&&['GET','HEAD'].includes(request.method)){
        if(job.state!=='ready')throw error('视频尚未准备完成。',409);
        const file=path.join(job.directory,'video.mp4');let start=0,end=job.size-1;const range=request.headers.get('range');
        if(range){const m=range.match(/^bytes=(\d+)-(\d*)$/);if(!m||Number(m[1])>=job.size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${job.size}`}});start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;if(end<start)return new Response(null,{status:416});}
        const filename=`${job.title} - ${job.format}.mp4`.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,180);
        const headers={'Content-Type':'video/mp4','Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'no-store','Content-Disposition':`attachment; filename="video.mp4"; filename*=UTF-8''${encodeURIComponent(filename)}`,...(range?{'Content-Range':`bytes ${start}-${end}/${job.size}`}:{})};
        return new Response(request.method==='HEAD'?null:Readable.toWeb(createReadStream(file,{start,end})),{status:range?206:200,headers});
      }
      return json({message:'请求方法不支持。'},405);
    }catch(e){return json({message:e.message||'视频服务暂不可用。'},e.status||502,cookieHeader);}
  };
}
export const videoServiceResponse=createVideoService();
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const host=process.env.VIDEO_HOST||'127.0.0.1',port=Number(process.env.PORT||8795);
  if(host!=='127.0.0.1'&&host!=='localhost'&&!process.env.VIDEO_SERVICE_KEY)throw new Error('Public service requires VIDEO_SERVICE_KEY');
  createServer(async(incoming,outgoing)=>{try{const req=new Request(`http://${incoming.headers.host}${incoming.url}`,{method:incoming.method,headers:incoming.headers,...(!['GET','HEAD'].includes(incoming.method)?{body:Readable.toWeb(incoming),duplex:'half'}:{})});const r=await videoServiceResponse(req);const headers=Object.fromEntries(r.headers);if(r.headers.getSetCookie().length)headers['set-cookie']=r.headers.getSetCookie();outgoing.writeHead(r.status,headers);if(r.body)Readable.fromWeb(r.body).pipe(outgoing);else outgoing.end();}catch{outgoing.writeHead(502);outgoing.end();}}).listen(port,host,()=>console.log(`Video service: http://${host}:${port}`));
}
