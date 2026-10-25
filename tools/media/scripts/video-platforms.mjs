import { parseBilibiliInput } from './bilibili-url.mjs';
export const PLATFORM_NAMES={bilibili:'B站',douyin:'抖音',xiaohongshu:'小红书',youtube:'YouTube'};
export function parseVideoInput(input) {
  const text=String(input??'').trim();
  if(!text||text.length>8192)throw new Error('请粘贴 B站、抖音、小红书或 YouTube 的单个视频链接。');
  if(/^(BV[0-9a-z]{10}|av[1-9]\d*)$/i.test(text)){parseBilibiliInput(text);return {platform:'bilibili',url:text};}
  const match=text.match(/https?:\/\/[^\s<>"“”]+/i)||text.match(/(?:www\.|m\.|v\.)?(?:bilibili\.com|b23\.tv|douyin\.com|xiaohongshu\.com|xhslink\.com|youtube\.com|youtu\.be)\/[^\s<>"“”]+/i);
  if(!match)throw new Error('未找到支持的视频链接。支持 B站、抖音、小红书和 YouTube。');
  let url;try{url=new URL((/^https?:/i.test(match[0])?'':'https://')+match[0].replace(/[。，！!）)]+$/,''));}catch{throw new Error('视频地址格式不正确。');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port)throw new Error('视频地址格式不正确。');
  const host=url.hostname;
  if(['bilibili.com','www.bilibili.com','m.bilibili.com','b23.tv','www.b23.tv'].includes(host)){parseBilibiliInput(url.href);return {platform:'bilibili',url:url.href};}
  url.protocol='https:';url.hash='';
  if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'].includes(host)){
    const id=host.endsWith('youtu.be')?url.pathname.slice(1):url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)\/?$/)?.[1];
    if(!/^[\w-]{11}$/.test(id||''))throw new Error('请使用 YouTube 单个视频或 Shorts 链接，暂不支持频道和播放列表。');
    return {platform:'youtube',url:'https://www.youtube.com/watch?v='+id};
  }
  if(['douyin.com','www.douyin.com','v.douyin.com','www.iesdouyin.com','iesdouyin.com'].includes(host)){
    if(host==='v.douyin.com'&&/^\/[\w-]+\/?$/.test(url.pathname))return {platform:'douyin',url:url.href,short:true};
    const id=url.pathname.match(/^\/(?:video|share\/video)\/(\d+)\/?$/)?.[1]||url.searchParams.get('modal_id');
    if(!/^\d{10,25}$/.test(id||''))throw new Error('请使用抖音单个视频或分享短链接，暂不支持直播、图集和用户主页。');
    return {platform:'douyin',url:'https://www.douyin.com/video/'+id};
  }
  if(['xiaohongshu.com','www.xiaohongshu.com','xhslink.com','www.xhslink.com'].includes(host)){
    if(host.endsWith('xhslink.com')&&/^\/(?:a\/)?[\w-]+\/?$/.test(url.pathname))return {platform:'xiaohongshu',url:url.href,short:true};
    const id=url.pathname.match(/^\/(?:explore|discovery\/item)\/([a-f0-9]{24})\/?$/i)?.[1];
    if(!id)throw new Error('请使用小红书单条视频笔记或分享短链接，暂不支持用户主页和图文笔记。');
    url.hostname='www.xiaohongshu.com';url.pathname='/explore/'+id;
    // Keep xsec_token: it is required for many shared Xiaohongshu notes.
    for(const key of [...url.searchParams.keys()])if(!['xsec_token','xsec_source'].includes(key))url.searchParams.delete(key);
    return {platform:'xiaohongshu',url:url.href};
  }
  throw new Error('暂只支持 B站、抖音、小红书和 YouTube 的视频链接。');
}
