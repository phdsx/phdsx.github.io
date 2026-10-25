import { initBilibiliLogin } from './bilibili-login.mjs';
import { parseVideoInput, PLATFORM_NAMES } from './video-platforms.mjs';
import { createPlatformSessions, PLATFORM_AUTH } from './platform-sessions.mjs';

const $ = id => document.getElementById(id);
const API = new URL('./bilibili/api/',location.href);
const MEDIA_API = new URL('./video/api/',location.href);
let result = null, controller = null, objectUrl = null, resolveController = null;
let login;
let activePlatform='bilibili';
const sessions=createPlatformSessions();
const hasAudio=format=>Boolean(format.hasAudio||format.audio||format.type==='mp4');
const t = (zh,en) => window.PHDSXI18n?.getLanguage() === 'en' ? en : zh;
function status(message,error = false) { $('parse-status').textContent = message; $('parse-status').dataset.error = String(error); }
function release() { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null; $('save-result').hidden = true; }
function lock(downloading) { $('parse-button').disabled = downloading; $('paste-button').disabled = downloading; $('video-url').disabled = downloading; $('page-select').disabled = downloading; $('quality-select').disabled = downloading; $('download-button').disabled = downloading; $('cancel-button').hidden = !downloading;for(const id of ['auth-platform','sessdata','platform-cookie','clear-login','clear-platform-session'])$(id).disabled=downloading;login?.setBusy(downloading); }
function codecName(codec) { return /^(avc|h264)/.test(codec) ? 'H.264' : /^(hev|hvc|h265)/.test(codec) ? 'H.265' : /^av01/.test(codec) ? 'AV1' : /^(vp09|vp9)/.test(codec)?'VP9':codec||'MP4'; }
function formatInfo() {
  const format = result?.formats.find(f => f.id === $('quality-select').value);
  if (!format) return;
  const mb = format.size ? format.size / 1048576 : (format.bandwidth + (format.audio?.bandwidth || 0)) * result.duration / 8 / 1048576;
  const details = [format.width ? `${format.width} × ${format.height}` : '', format.frameRate ? `${format.frameRate} fps` : '', mb > 0 ? t(`预计约 ${mb.toFixed(1)} MB`,`Approx. ${mb.toFixed(1)} MB`) : '', t(hasAudio(format) ? '含声音 · 原画质封装' : '源视频没有声音轨道',hasAudio(format) ? 'With audio · original quality' : 'Source has no audio track')];
  $('format-info').textContent = details.filter(Boolean).join(' · ');
  $('download-button').textContent = t(hasAudio(format) ? '下载 MP4（含声音）' : '下载 MP4（无声音）', 'Download MP4');
  release();
}
function render(data) {
  result = data;
  $('video-title').textContent = data.title;
  $('result-platform').textContent=PLATFORM_NAMES[data.platform]||'B站';
  $('video-bvid').textContent = data.bvid||data.id;
  $('video-meta').textContent = `${data.owner} · ${Math.floor(data.duration / 60)}:${String(Math.floor(data.duration % 60)).padStart(2,'0')}${data.platform==='bilibili'?' · P'+data.page:''}`;
  $('video-cover').hidden = !data.cover;
  if (data.cover) $('video-cover').src = data.cover;
  $('original-link').href = data.url;
  $('original-link').textContent=t('在原平台打开 ↗','Open original ↗');
  $('page-field').hidden=data.platform!=='bilibili';
  $('page-select').replaceChildren(...data.pages.map(p => new Option(`P${p.page} · ${p.part || data.title}`,p.page)));
  $('page-select').value = String(data.page);
  $('quality-select').replaceChildren(...data.formats.map(f => new Option(`${f.label} · ${codecName(f.codec)}`,f.id)));
  $('quality-notice').textContent = data.platform!=='bilibili'?t('仅列出当前可下载的画质。平台如要求登录，可使用下方备用 Cookie；B站扫码会话不用于其他平台。','Only available qualities are listed. Use this platform’s optional Cookie if login is required; Bilibili QR login applies only to Bilibili.'):(data.loggedIn ? t('当前已使用登录凭据。','Using your login session.') : t('当前为游客模式；登录后可能获得更多清晰度。','Guest mode; signing in may unlock more qualities.')) + (data.unavailable.length ? t(` 未返回的视频档位：${data.unavailable.join('、')}。以视频源及账号权限为准。`,` Unavailable: ${data.unavailable.join(', ')}. Availability depends on source and account access.`) : '');
  $('video-result').hidden = false;
  $('download-progress').hidden = true;
  formatInfo();
  $('video-title').focus({preventScroll:true});
}
async function resolve(input) {
  if (controller) return;
  resolveController?.abort();
  resolveController = new AbortController();
  const active = resolveController;
  try {
    if (location.protocol === 'file:') throw new Error('请通过本地 HTTP 服务打开视频工具。');
    const parsed=parseVideoInput(input);updatePlatform(parsed.platform);
    release(); result = null; $('video-result').hidden = true;
    $('parse-button').disabled = true; $('page-select').disabled = true;
    status(t('正在读取视频信息与可用清晰度…','Reading video and available qualities…'));
    const timeout = setTimeout(() => active.abort(new Error(t('解析超时，请稍后重试。','Request timed out. Please retry.'))),parsed.platform==='bilibili'?65000:100000);
    let response;
    const credential=sessions.get(parsed.platform).credential.trim();
    try { response = await fetch(new URL('resolve',parsed.platform==='bilibili'?API:MEDIA_API),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.platform==='bilibili'?{url:parsed.url,sessdata:credential}:{url:parsed.url,cookie:credential}),signal:active.signal}); }
    finally { clearTimeout(timeout); }
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(t('解析服务未连接，请确认本站配套解析服务已启动。纯静态页面无法解析视频。','The video API is unavailable. Check that the companion service is running; static pages alone cannot parse videos.'));
    const data = await response.json();
    if (!response.ok || !data.formats) throw new Error(data.message || t('解析服务未连接，请部署配套 Worker。','Video API unavailable. Deploy the companion Worker.'));
    if (active !== resolveController) return;
    sessions.markUsed(parsed.platform);renderSessionStatus();data.platform=parsed.platform;render(data);
    status(t(`解析完成 · 找到 ${new Set(data.formats.map(f => f.quality)).size} 种清晰度。`,`Ready · ${new Set(data.formats.map(f => f.quality)).size} qualities available.`));
  } catch (error) {
    if (active !== resolveController) return;
    result = null; $('video-result').hidden = true;
    status(active.signal.aborted ? active.signal.reason?.message || t('解析已取消。','Canceled.') : window.PHDSXVideoConnection?.errorMessage(error) || error.message,true);
  } finally {
    if (active === resolveController) { $('parse-button').disabled = false; $('page-select').disabled = false; resolveController = null; }
  }
}
$('parse-form').addEventListener('submit',event => {event.preventDefault();resolve($('video-url').value);});
$('paste-button').addEventListener('click',async () => {
  try { $('video-url').value = await navigator.clipboard.readText();try{updatePlatform(parseVideoInput($('video-url').value).platform);}catch{} status(t('链接已粘贴，点击解析视频继续。','Pasted. Select Resolve to continue.')); }
  catch { status(t('浏览器未允许读取剪贴板，请在输入框中按 Ctrl+V 或长按粘贴。','Clipboard unavailable. Paste into the input with Ctrl+V or a long press.'),true); }
  $('video-url').focus();
});
$('clear-login').addEventListener('click',() => {$('sessdata').value = '';sessions.clearCredential('bilibili');renderSessionStatus();status(t('B站手动凭据已清除。','Bilibili manual credential cleared.'));});
$('page-select').addEventListener('change',() => { if (result) {const url = new URL(result.url);url.searchParams.set('p',$('page-select').value);$('video-url').value = url.href;resolve(url.href);} });
$('quality-select').addEventListener('change',formatInfo);
function saveActiveCredential(){sessions.setCredential(activePlatform,$(PLATFORM_AUTH[activePlatform].field).value);}
function renderSessionStatus(){
  const name=PLATFORM_NAMES[activePlatform],state=sessions.get(activePlatform);
  $('auth-platform').value=activePlatform;
  $('platform-cookie-label').textContent=t(`${name} Cookie`,`${name} Cookie`);
  $('platform-cookie-summary').textContent=t(`${name} 会话 Cookie（可选）`,`${name} session Cookie (optional)`);
  $('platform-qr-support').textContent=t(`${name}暂未接入扫码登录，请使用本平台 Cookie。`,`${name} QR login is not integrated. Use this platform’s Cookie.`);
  $('session-platform-status').textContent=state.credential?t(`${name} · ${activePlatform==='bilibili'?'手动 Session':'Cookie'}已保留${state.used?'，已用于解析':''}；刷新或手动清除前保留。`,`${name} · Credential retained${state.used?', used for parsing':''}; kept until refresh or manual clearing.`):state.qrUser?t(`${name} · 已扫码登录：${state.qrUser.name}`,`${name} · QR signed in: ${state.qrUser.name}`):t(`${name} · 尚未设置会话`,`${name} · No session configured`);
}
function updatePlatform(platform,{fromVideo=true}={}){
  saveActiveCredential();activePlatform=platform;
  $(PLATFORM_AUTH[platform].field).value=sessions.get(platform).credential;
  $('bilibili-login-controls').hidden=platform!=='bilibili';$('platform-cookie-settings').hidden=platform==='bilibili';
  if(fromVideo)$('detected-platform').textContent=PLATFORM_NAMES[platform];
  renderSessionStatus();
}
$('auth-platform').addEventListener('change',()=>updatePlatform($('auth-platform').value,{fromVideo:false}));
for(const id of ['sessdata','platform-cookie'])$(id).addEventListener('input',()=>{saveActiveCredential();renderSessionStatus();});
$('clear-platform-session').addEventListener('click',()=>{sessions.clearCredential(activePlatform);$('platform-cookie').value='';renderSessionStatus();status(t(`${PLATFORM_NAMES[activePlatform]} 会话已清除。`,`${PLATFORM_NAMES[activePlatform]} session cleared.`));});
$('video-url').addEventListener('input',() => {resolveController?.abort();release();result = null;$('video-result').hidden = true;try{updatePlatform(parseVideoInput($('video-url').value).platform);}catch{}status(t('地址已修改，请重新解析。','URL changed. Resolve again.'));});
$('cancel-button').addEventListener('click',() => controller?.abort());
$('download-button').addEventListener('click',async () => {
  if (!result || controller || resolveController) return;
  if (Date.now() > result.expiresAt) {
    const previous=result.formats.find(f=>f.id===$('quality-select').value),url=result.url;
    status(t('正在使用已保留的本平台会话更新下载链接…','Refreshing download links with the retained platform session…'));
    await resolve(url);if(!result)return;
    const replacement=result.formats.find(f=>f.id===previous?.id)||result.formats.find(f=>f.height===previous?.height&&codecName(f.codec)===codecName(previous?.codec||''));
    if(replacement){$('quality-select').value=replacement.id;formatInfo();}
  }
  const format = result.formats.find(f => f.id === $('quality-select').value);
  const name = `${result.title}${result.platform==='bilibili'?' - P'+result.page:''} - ${format.label} - ${codecName(format.codec)}.mp4`.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,180).replace(/\.mp4$/,'') + '.mp4';
  const estimatedBytes = format.size || (format.bandwidth + (format.audio?.bandwidth || 0)) * result.duration / 8;
  controller = new AbortController(); lock(true); release();
  const signal = controller.signal;
  let writable;
  try {
    // Invoke the picker directly inside the user gesture, before importing the muxer.
    if (window.showSaveFilePicker && estimatedBytes > 200*1024*1024) {
      const handle = await window.showSaveFilePicker({suggestedName:name,types:[{description:'MP4 video',accept:{'video/mp4':['.mp4']}}]});
      signal.throwIfAborted(); writable = await handle.createWritable();
    } else if (estimatedBytes > 400*1024*1024) throw new Error(t('该视频较大，请使用桌面版 Chrome / Edge 直接写入文件，或选择更低清晰度。','This video is large. Use desktop Chrome / Edge to save directly to disk, or select a lower quality.'));
    $('download-progress').hidden = false; $('progress-bar').value = 0;
    $('download-status').textContent = t('正在下载并合成 MP4…','Downloading and muxing MP4…');
    signal.throwIfAborted();
    let blob;
    if(result.engine==='yt-dlp'){
      const {downloadPlatformVideo}=await import('./platform-download.mjs');
      blob=await downloadPlatformVideo({api:MEDIA_API,sessionId:result.sessionId,formatId:format.id,signal,writable,onProgress:({stage,percent})=>{$('progress-bar').value=percent;$('download-status').textContent=t(stage==='saving'?`正在保存 MP4 · ${percent}%`:stage==='merging'?'正在合并声音与画面…':`服务器正在下载视频 · ${percent}%`,`${stage} · ${percent}%`);}});
    }else{
    const {muxMp4} = await import('./bilibili-mux.mjs');
    const proxy = url => {const target = new URL('stream',API);target.searchParams.set('url',url);return target.href;};
    const urls = stream => [stream.url,...(stream.backups || [])].map(proxy);
    blob = await muxMp4({videoUrl:urls(format),audioUrl:format.audio ? urls(format.audio) : null,writable,signal,duration:result.duration,onProgress:fraction => {$('progress-bar').value = Math.round(fraction*100);$('download-status').textContent = t(`正在下载并合成 MP4 · ${Math.round(fraction*100)}%`,`Downloading and muxing · ${Math.round(fraction*100)}%`);}});
    }
    if (writable) { await writable.close(); writable = null; }
    if (blob) {objectUrl = URL.createObjectURL(blob);$('save-result').href = objectUrl;$('save-result').download = name;$('save-result').hidden = false;$('save-result').click();}
    $('download-status').textContent = t(blob ? '合成完成。若未开始保存，可点击下方链接。' : '下载完成，MP4 已保存到所选文件。',blob ? 'MP4 ready. Use the link below if saving did not start.' : 'Download complete. MP4 saved to your selected file.');
  } catch (error) {
    if (writable) {try {await writable.abort();} catch { /* Already closed by output cancellation. */ }}
    $('download-progress').hidden = false;
    $('download-status').textContent = signal.aborted || error.name === 'AbortError' ? t('下载已取消，可以重新开始。','Download canceled. You can start again.') : t(`下载失败：${error.message}。可重新解析后重试。`,`Download failed: ${error.message}. Resolve again and retry.`);
  } finally {controller = null;lock(false);}
});
window.addEventListener('pagehide',event => {controller?.abort();resolveController?.abort();if(!event.persisted){sessions.clearAll();$('sessdata').value = '';$('platform-cookie').value='';}release();});
renderSessionStatus();
if (location.protocol !== 'file:') login=initBilibiliLogin({api:API,t,onStateChange(data){sessions.setQrUser('bilibili',data.loggedIn?data.user:null);renderSessionStatus();},onSessionChange(loggedIn){
  sessions.clearCredential('bilibili');if(activePlatform==='bilibili')$('sessdata').value='';renderSessionStatus();
  let parsed;try{parsed=parseVideoInput($('video-url').value);}catch{}
  if(parsed&&parsed.platform!=='bilibili')return;
  status(loggedIn ? t('扫码登录成功，可以解析账号有权访问的清晰度。','Signed in. You can now resolve qualities available to your account.') : t('已退出本站登录，已恢复游客模式。','Signed out of this tool. Guest mode restored.'));
  if(controller)return;
  release();result=null;$('video-result').hidden=true;
  if(!parsed)return;
  resolve($('video-url').value);
}});
