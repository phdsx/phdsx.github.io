(() => {
  'use strict';
  const $=id=>document.getElementById(id),frame=$('game-frame');
  if(location.protocol==='file:'){$('loading-title').textContent='请使用本地网站服务';$('loading-text').textContent='请在项目根目录运行 node scripts/serve-site.mjs，然后从游戏厅打开。';$('status').textContent='需要 HTTP 服务';frame.removeAttribute('src');return;}
  let ready=false,paused=false,sound=false;const sources=new Map(),taps=new Map();
  const runtime=()=>{try{return frame.contentWindow.TU95Runtime;}catch{return null;}};
  function release(){sources.clear();for(const timer of taps.values())clearTimeout(timer);taps.clear();runtime()?.clear();document.querySelectorAll('[data-hold]').forEach(b=>b.classList.remove('held'));}
  function pause(value=!paused){
    if(!ready)return;release();paused=value;if(paused)runtime()?.pause();else runtime()?.resume();
    $('pause-cover').hidden=!paused;$('pause').textContent=paused?'▶ 继续':'Ⅱ 暂停';$('status').textContent=paused?'已暂停':'原版中文 · 无广告';if(paused)$('resume').focus({preventScroll:true});
  }
  function hold(name,source,down){
    if(!ready || paused)return;const was=[...sources.values()].includes(name);if(down)sources.set(source,name);else sources.delete(source);const now=[...sources.values()].includes(name);
    if(was!==now)runtime()?.key(name,now);document.querySelectorAll(`[data-hold="${name}"]`).forEach(b=>b.classList.toggle('held',now));
  }
  function tap(name){if(!ready || paused)return;if(taps.has(name)){clearTimeout(taps.get(name));runtime()?.key(name,false);}runtime()?.key(name,true);taps.set(name,setTimeout(()=>{runtime()?.key(name,false);taps.delete(name);},100));}
  window.addEventListener('message',event=>{
    if(event.source!==frame.contentWindow || event.origin!==location.origin || event.data?.source!=='tu95-runtime')return;const data=event.data;
    if(data.type==='ready'){ready=true;paused=false;$('loading').hidden=true;$('pause-cover').hidden=true;$('restart').disabled=$('pause').disabled=false;$('status').textContent='原版中文 · 无广告';runtime()?.mute(!sound);}
    else if(data.type==='loading'){ready=false;paused=false;release();$('loading').hidden=false;$('pause-cover').hidden=true;$('restart').disabled=$('pause').disabled=true;$('status').textContent='正在加载原版游戏…';$('loading-title').textContent='正在准备起飞';$('loading-text').textContent='首次加载原版素材，请稍候…';$('reload').hidden=true;}
    else if(data.type==='error'){ready=false;$('loading').hidden=false;$('loading-title').textContent='暂时无法起飞';$('loading-text').textContent=data.message;$('reload').hidden=false;$('status').textContent='加载失败';}
    else if(data.type==='toggle-pause')pause();
  });
  $('pause').addEventListener('click',()=>pause());$('resume').addEventListener('click',()=>pause(false));$('restart').addEventListener('click',()=>{release();runtime()?.reload();});$('reload').addEventListener('click',()=>{release();frame.contentWindow.location.reload();});
  $('sound').addEventListener('click',()=>{sound=!sound;runtime()?.mute(!sound);$('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));if(!paused)runtime()?.focus();});
  if(!document.fullscreenEnabled)$('fullscreen').hidden=true;
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game-shell').requestFullscreen();}catch{$('status').textContent='浏览器暂不支持全屏';}});document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';});
  document.querySelectorAll('[data-hold]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);hold(button.dataset.hold,'pointer'+event.pointerId,true);});const up=event=>hold(button.dataset.hold,'pointer'+event.pointerId,false);
    button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);button.addEventListener('contextmenu',event=>event.preventDefault());
  });
  document.querySelectorAll('[data-tap]').forEach(button=>{button.addEventListener('pointerdown',e=>e.preventDefault());button.addEventListener('click',()=>tap(button.dataset.tap));});
  const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',Space:'space'};
  document.addEventListener('keydown',event=>{if(event.target.closest('details') || event.code==='Space' && event.target.tagName==='BUTTON')return;if(keys[event.code]){event.preventDefault();hold(keys[event.code],event.code,true);}else if(!event.repeat && event.code==='KeyG')tap('gear');else if(!event.repeat && event.code==='KeyF')tap('flaps');else if(!event.repeat && event.code==='KeyH')tap('bail');else if(!event.repeat && (event.code==='KeyP'||event.code==='Escape'))pause();});
  document.addEventListener('keyup',event=>{if(keys[event.code])hold(keys[event.code],event.code,false);});document.addEventListener('visibilitychange',()=>{if(document.hidden && ready)pause(true);});window.addEventListener('blur',()=>{setTimeout(()=>{if(!document.hasFocus() && ready)pause(true);},0);});
  window.TU95Host={get ready(){return ready;},get paused(){return paused;},get held(){return [...sources.values()];}};
})();
