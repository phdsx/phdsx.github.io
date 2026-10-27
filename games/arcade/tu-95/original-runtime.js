(() => {
  'use strict';
  window.RufflePlayer={config:{autoplay:'on',unmuteOverlay:'hidden',splashScreen:false,contextMenu:'off',allowNetworking:'none',openUrlMode:'deny',allowScriptAccess:false,scale:'showAll',forceScale:true,wmode:'window',logLevel:'error',letterbox:'on',backgroundColor:'#000000'}};
  let player,ready=false,muted=true;const pressed=new Set();
  const keys={up:['ArrowUp','ArrowUp',38],down:['ArrowDown','ArrowDown',40],left:['ArrowLeft','ArrowLeft',37],right:['ArrowRight','ArrowRight',39],gear:['g','KeyG',71],flaps:['f','KeyF',70],space:[' ','Space',32],bail:['h','KeyH',72]};
  const tell=(type,detail={})=>parent.postMessage({source:'tu95-runtime',type,...detail},location.origin);
  function surface(){return player?.shadowRoot?.querySelector('canvas') || player;}
  function focus(){const target=surface();if(target){target.tabIndex=0;target.focus({preventScroll:true});}}
  function key(name,down){
    if(!ready || !keys[name])return;
    const [key,code,keyCode]=keys[name];if(down){focus();pressed.add(name);}else pressed.delete(name);
    surface()?.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key,code,keyCode,which:keyCode,bubbles:true,cancelable:true,composed:true}));
  }
  function clear(){for(const name of Object.keys(keys))key(name,false);pressed.clear();}
  async function load(){
    ready=false;tell('loading');
    try{
      if(location.protocol==='file:')throw Error('请通过网站或本地 HTTP 服务打开游戏。');
      player=window.RufflePlayer.newest().createPlayer();document.getElementById('player').replaceChildren(player);player.volume=muted?0:.75;
      await player.load({url:'engine/TU-95.zh-CN.swf',allowScriptAccess:false});
      const deadline=performance.now()+60000;
      while(!player.metadata){if(performance.now()>deadline)throw Error('游戏加载超时，请刷新重试。');await new Promise(resolve=>setTimeout(resolve,60));}
      ready=true;player.volume=muted?0:.75;tell('ready',{metadata:{...player.metadata}});
    }catch(error){tell('error',{message:error.message || '游戏加载失败，请重试。'});}
  }
  window.TU95Runtime={get ready(){return ready;},get metadata(){return player?.metadata || null;},get pressed(){return [...pressed];},get isPlaying(){return !!player?.isPlaying;},key,clear,focus,pause(){clear();player?.ruffle().suspend();},resume(){player?.ruffle().resume();focus();},mute(value){muted=!!value;if(player)player.volume=muted?0:.75;},reload:load};
  document.addEventListener('keydown',event=>{if(!event.repeat&&(event.code==='KeyP'||event.code==='Escape')){event.preventDefault();tell('toggle-pause');}});
  document.addEventListener('DOMContentLoaded',load,{once:true});
})();
