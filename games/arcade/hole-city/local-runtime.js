(() => {
  'use strict';
  const canvas=document.getElementById('unity-canvas'),status=document.getElementById('status'),progress=document.getElementById('progress');
  let bridgeName, game, bridgeReady=false;
  const send=(method,value)=>{if(game&&bridgeName)game.SendMessage(bridgeName,method,value);};
  const ready=()=>{if(game&&bridgeName&&!bridgeReady){bridgeReady=true;send('ready');}};
  window.PokiSDK={init:()=>Promise.resolve(),gameLoadingStart(){},gameLoadingFinished(){},gameplayStart(){},gameplayStop(){},customEvent(){},measure(){},logError(){},movePill(){},displayAd(){},destroyAd(){},openExternalLink(){},getLanguage:()=> 'zh-CN',isAdBlocked:()=>false,getURLParam:()=>'',getUser:()=>Promise.resolve({}),getToken:()=>Promise.resolve(''),commercialBreak:()=>Promise.resolve(),rewardedBreak:()=>Promise.resolve(true)};
  window.initPokiBridge=name=>{bridgeName=name;ready();};
  window.commercialBreak=()=>queueMicrotask(()=>send('commercialBreakCompleted'));
  window.rewardedBreak=()=>queueMicrotask(()=>send('rewardedBreakCompleted','true'));
  window.getUser=()=>queueMicrotask(()=>send('getUserResolved','{}'));
  window.getToken=()=>queueMicrotask(()=>send('getTokenResolved',''));
  window.login=()=>queueMicrotask(()=>send('loginRejected'));
  window.shareableURL=()=>queueMicrotask(()=>send('shareableURLRejected'));
  // The shipped game uses its drag joystick. Feed the same joystick with WASD
  // and arrow keys so desktop players can use either input method.
  const directions=new Set();let keyboardDrag=false,physicalPointer=false;
  const directionKeys=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright']);
  function mouse(type,x,y,buttons){canvas.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons}));}
  function updateKeyboard(){
    if(!game||physicalPointer)return;
    const x=Number(directions.has('d')||directions.has('arrowright'))-Number(directions.has('a')||directions.has('arrowleft'));
    const y=Number(directions.has('s')||directions.has('arrowdown'))-Number(directions.has('w')||directions.has('arrowup'));
    const r=canvas.getBoundingClientRect(),cx=r.left+r.width*.5,cy=r.top+r.height*.72;
    if(x||y){if(!keyboardDrag){keyboardDrag=true;mouse('mousedown',cx,cy,1);}const len=Math.hypot(x,y);mouse('mousemove',cx+x/len*100,cy+y/len*100,1);}
    else if(keyboardDrag){mouse('mouseup',cx,cy,0);keyboardDrag=false;}
  }
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(game&&directionKeys.has(k)){e.preventDefault();directions.add(k);updateKeyboard();}});
  window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(directionKeys.has(k)){directions.delete(k);updateKeyboard();}});
  canvas.addEventListener('pointerdown',e=>{if(e.isTrusted){physicalPointer=true;if(keyboardDrag){directions.clear();physicalPointer=false;updateKeyboard();physicalPointer=true;}}});
  for(const name of ['pointerup','pointercancel'])window.addEventListener(name,e=>{if(e.isTrusted){physicalPointer=false;updateKeyboard();}});
  window.addEventListener('blur',()=>{directions.clear();physicalPointer=false;updateKeyboard();});
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
    if(!['blob:','data:'].includes(url.protocol)&&url.origin!==location.origin){console.info('[本地版] 已停用联网服务',url.hostname);return Promise.resolve(new Response('{}',{status:200,headers:{'Content-Type':'application/json'}}));}
    return nativeFetch(input,init);
  };
  const openXHR=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method,address,...rest){
    const url=new URL(address,location.href);
    if(!['blob:','data:'].includes(url.protocol)&&url.origin!==location.origin)
      return openXHR.call(this,'GET',new URL('runtime/offline.json',location.href).href,...rest);
    return openXHR.call(this,method,address,...rest);
  };
  if(navigator.sendBeacon){const sendBeacon=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=(address,data)=>new URL(address,location.href).origin===location.origin?sendBeacon(address,data):true;}
  const startupUrls=[];
  async function inflate(path){
    const response=await nativeFetch(path);if(!response.ok)throw Error(`${path}: ${response.status}`);
    if(!window.DecompressionStream)throw Error('请使用新版 Chrome、Edge 或 Safari 浏览器');
    const raw=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const url=URL.createObjectURL(new Blob([raw],{type:path.includes('wasm')?'application/wasm':'application/octet-stream'}));
    startupUrls.push(url);progress.value+=.1;
    return url;
  }
  (async()=>{
    status.textContent='正在加载游戏数据与引擎…';
    // Start both downloads together; settle both before releasing any blob URLs.
    const resources=await Promise.allSettled([inflate('runtime/game.data.gz'),inflate('runtime/game.wasm.gz')]);
    const failed=resources.find(result=>result.status==='rejected');if(failed)throw failed.reason;
    const [dataUrl,codeUrl]=resources.map(result=>result.value);
    status.textContent='正在加载城市和原版美术…';
    game=await createUnityInstance(canvas,{dataUrl,codeUrl,frameworkUrl:'runtime/unity.framework.js',streamingAssetsUrl:new URL('runtime/StreamingAssets',location.href).href,companyName:'Voodoo',productName:'Hole.io',productVersion:'2.20.4',showBanner:(message,type)=>{if(type==='error'){status.textContent=message;console.error(message);}}},value=>{progress.value=.2+value*.8;});
    window.unityGame=window.unityGameInstance=window.gameInstance=game;ready();document.getElementById('loading').hidden=true;document.getElementById('loading').style.display='none';canvas.focus();
  })().catch(error=>{console.error(error);status.textContent=`加载失败：${error.message}`;})
    .finally(()=>startupUrls.forEach(url=>URL.revokeObjectURL(url)));
})();
