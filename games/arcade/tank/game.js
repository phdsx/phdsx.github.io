/* Owns the page lifecycle, input, fixed-step clock, HUD and synthesized audio. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const text=(id,value)=>{const node=$(id),s=String(value);if(node.textContent!==s)node.textContent=s;};
  const keyMap={ArrowUp:'up',ArrowRight:'right',ArrowDown:'down',ArrowLeft:'left',KeyW:'up',KeyD:'right',KeyS:'down',KeyA:'left',Space:'fire',KeyJ:'fire'};
  let app;
  function mount(){
    const g=new TankEngine.Game(),renderer=new TankRenderer($('stage')),controller=new AbortController();
    const keys=new Map(),pointers=new Map();let order=0,raf=0,last=null,acc=0,audio=null,muted=true,disposed=false;
    const on=(node,event,fn,options={})=>node.addEventListener(event,fn,{...options,signal:controller.signal});
    const clear=()=>{keys.clear();pointers.clear();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));last=null;acc=0;};
    const audioStart=()=>{
      if(muted)return;
      try{if(!audio){const Context=window.AudioContext||window.webkitAudioContext;if(Context)audio=new Context();}if(audio?.state==='suspended')audio.resume().catch(()=>{});}catch{audio=null;}
    };
    const sound=type=>{
      if(muted||!audio||audio.state!=='running')return;
      const sounds={shoot:[170,.045],spark:[80,.06],blast:[52,.18],spawn:[440,.14],pickup:[660,.18],armor:[100,.1],clear:[880,.3],won:[1100,.4],lost:[65,.4]};
      const spec=sounds[type];if(!spec)return;
      const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
      osc.type='square';osc.frequency.setValueAtTime(spec[0],now);osc.frequency.exponentialRampToValueAtTime(Math.max(25,spec[0]*.5),now+spec[1]);
      gain.gain.setValueAtTime(.025,now);gain.gain.exponentialRampToValueAtTime(.001,now+spec[1]);osc.connect(gain);gain.connect(audio.destination);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+spec[1]);
    };
    function input(){
      const held=[...keys.values(),...pointers.values()],directions=held.filter(k=>k.control!=='fire').sort((a,b)=>b.order-a.order);
      return {dir:directions.length?['up','right','down','left'].indexOf(directions[0].control):null,fire:held.some(k=>k.control==='fire')};
    }
    function sync(){
      text('score',String(g.score).padStart(6,'0'));text('lives',g.lives);text('level',`${g.level+1} / 3`);text('remaining',g.remaining);
      const p=g.player;text('effect',g.noticeTime>0?g.notice:`火力 ${p?.upgrade||1}${p?.inv>0?` · 护盾 ${Math.ceil(p.inv)}s`:''} · ${g.base.alive?'基地完好':'基地失守'}${!p&&g.state==='playing'?' · 等待复活':''}`);
      $('pause').disabled=!['playing','paused'].includes(g.state);text('pause',g.state==='paused'?'继续':'暂停');
      const messages={title:['坦克大战','保护鹰徽基地，击退全部敌军。\n方向键 / WASD 移动，空格 / J 射击。','开始游戏'],
        paused:['已暂停','防线等待你的归来。','继续游戏'],clear:['防线守住！',`得分 ${g.score} · 下一关：${TankMaps.levels[g.level+1]?.name||''}`,'下一关'],
        lost:['任务失败',`${g.reason} · 得分 ${g.score}\n重新部署，守住基地。`,'再战一次'],won:['全关胜利！',`三道防线全部守住 · 得分 ${g.score}`,'再战一次']};
      const message=messages[g.state];$('overlay').hidden=!message;
      if(message){text('title',message[0]);text('message',message[1]);text('action',message[2]);}
    }
    function toggle(){clear();g.pause();if(g.state==='playing')audioStart();else audio?.suspend().catch(()=>{});sync();}
    const focus=()=>$('stage').focus({preventScroll:true});
    on($('action'),'click',()=>{audioStart();clear();if(g.state==='paused')g.pause();else if(g.state==='clear')g.next();else g.start();focus();sync();});
    on($('restart'),'click',()=>{audioStart();clear();g.start();focus();sync();});
    on($('pause'),'click',()=>{toggle();focus();});
    on($('mute'),'click',()=>{muted=!muted;$('mute').textContent=`声音：${muted?'关':'开'}`;$('mute').setAttribute('aria-pressed',String(muted));if(muted)audio?.suspend().catch(()=>{});else audioStart();});
    on(window,'keydown',e=>{
      if(keyMap[e.code]){
        // Keep Enter/Space usable on menu buttons while the game is stopped.
        if(g.state!=='playing'){if(e.target?.tagName!=='BUTTON')e.preventDefault();return;}
        e.preventDefault();audioStart();
        if(!keys.has(e.code)){
          keys.set(e.code,{control:keyMap[e.code],order:++order});
          if(g.player&&g.player.birth<=0){
            if(keyMap[e.code]==='fire')g.shoot(g.player);
            else g.player.dir=['up','right','down','left'].indexOf(keyMap[e.code]);
          }
        }
      }else if(['KeyP','Escape'].includes(e.code)&&!e.repeat){e.preventDefault();toggle();}
    });
    on(window,'keyup',e=>{if(keyMap[e.code]&&g.state==='playing')e.preventDefault();keys.delete(e.code);});
    on(window,'blur',()=>{clear();if(g.state==='playing')g.pause();audio?.suspend().catch(()=>{});sync();});
    on(document,'visibilitychange',()=>{if(document.hidden){clear();if(g.state==='playing')g.pause();audio?.suspend().catch(()=>{});sync();}});
    for(const b of document.querySelectorAll('[data-control]')){
      on(b,'pointerdown',e=>{e.preventDefault();if(g.state!=='playing')return;audioStart();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{control:b.dataset.control,order:++order});b.classList.add('pressed');},{passive:false});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])on(b,event,e=>{pointers.delete(e.pointerId);if(![...pointers.values()].some(p=>p.control===b.dataset.control))b.classList.remove('pressed');});
    }
    function frame(now){
      if(disposed)return;
      if(last===null)last=now;acc+=Math.min(.1,(now-last)/1000);last=now;
      if(g.state==='playing')while(acc>=TankEngine.STEP){g.step(TankEngine.STEP,input());acc-=TankEngine.STEP;if(g.state!=='playing'){clear();break;}}
      else acc=0;
      for(const event of g.events.splice(0))sound(event.type);
      renderer.draw(g);sync();raf=requestAnimationFrame(frame);
    }
    function destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clear();controller.abort();audio?.close().catch(()=>{});audio=null;}
    on(window,'pagehide',destroy);
    app={destroy,snapshot:()=>({state:g.state,score:g.score,lives:g.lives,level:g.level,remaining:g.remaining,
      player:g.player?{x:g.player.x,y:g.player.y,dir:g.player.dir,upgrade:g.player.upgrade}:null,
      enemies:g.enemies.map(t=>({id:t.id,x:t.x,y:t.y,type:t.type})),bullets:g.bullets.length,time:g.time})};
    window.TankApp=app;sync();renderer.draw(g);raf=requestAnimationFrame(frame);
  }
  // BFCache restores a fresh, single instance after pagehide cleaned the old one.
  window.addEventListener('pageshow',e=>{if(e.persisted){app?.destroy();mount();}});
  mount();
})();
