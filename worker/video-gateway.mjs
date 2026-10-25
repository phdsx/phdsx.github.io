export const MEDIA_API_PREFIX='/tools/media/video/api/';
export async function mediaGateway(request,env={}){
  const origin=new URL(request.url).origin;
  if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==origin))return Response.json({message:'请从本站视频工具页面发起请求。'},{status:403});
  if(!env.VIDEO_SERVICE_URL||!env.VIDEO_SERVICE_KEY)return Response.json({message:'抖音、小红书和 YouTube 下载服务未连接。请部署配套 yt-dlp 服务；本地运行 node scripts/serve-site.mjs 即可连接。'},{status:503,headers:{'Cache-Control':'no-store'}});
  try{
    const base=new URL(env.VIDEO_SERVICE_URL);if(base.protocol!=='https:')throw new Error('Invalid service');
    const incoming=new URL(request.url);const target=new URL(incoming.pathname+incoming.search,base.origin);
    const headers=new Headers({'x-video-service-key':env.VIDEO_SERVICE_KEY,'x-video-site-proto':'https'});
    for(const name of ['content-type','range'])if(request.headers.has(name))headers.set(name,request.headers.get(name));
    const client=(request.headers.get('cookie')||'').match(/(?:^|;\s*)phdsx_video_client=[a-f0-9]{64}(?:;|$)/)?.[0];if(client)headers.set('cookie',client.replace(/^;\s*/,'').replace(/;$/,''));
    const response=await fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'error',signal:request.signal});
    const output=new Headers({'Cache-Control':'no-store'});for(const name of ['content-type','content-length','content-range','accept-ranges','content-disposition'])if(response.headers.has(name))output.set(name,response.headers.get(name));
    for(const cookie of response.headers.getSetCookie())if(cookie.startsWith('phdsx_video_client='))output.append('Set-Cookie',cookie);
    return new Response(response.body,{status:response.status,headers:output});
  }catch{return Response.json({message:'视频下载服务暂不可用，请稍后重试。'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
