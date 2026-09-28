/* Local regression harness, never loaded by the public game entry. */
(() => {
  const iframe=document.querySelector('iframe'),results=document.getElementById('results');
  let passed=0,failed=0;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const check=(condition,text)=>{if(!condition)throw Error(text);};
  async function test(name,fn){const li=document.createElement('li');results.append(li);try{await fn();li.textContent='PASS '+name;li.className='pass';passed++;}catch(error){li.textContent='FAIL '+name+': '+error.message;li.className='fail';failed++;}}
  iframe.addEventListener('load',async()=>{
    const w=iframe.contentWindow,d=w.document,$=id=>d.getElementById(id),snap=()=>w.TankApp.snapshot();
    const errors=[];w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
    const key=(code,down)=>w.dispatchEvent(new w.KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));
    let live;const original=w.TankEngine.Game.prototype.step;
    w.TankEngine.Game.prototype.step=function(...args){live=this;return original.apply(this,args);};
    const restart=async()=>{$('restart').click();await wait(850);};
    await test('原页面资源完整、开始界面及按钮可启动',async()=>{
      check(snap().state==='title','title state');check(!$('overlay').hidden,'menu missing');
      $('action').click();await wait(850);check(snap().state==='playing','start failed');check($('overlay').hidden,'overlay remains');
      const loaded=w.performance.getEntriesByType('resource').filter(r=>/maps.js|engine.js|render.js|game.js|tank.css/.test(r.name));check(loaded.length===5,'resource missing');
    });
    await test('真实 RAF 中按住 W 前进，同时 J 连射，松开停止且转向正常',async()=>{
      live.spawnTimer=999;live.spawnLeft=99;const before=snap();key('KeyW',true);key('KeyJ',true);await wait(550);
      const after=snap();check(after.player.y<before.player.y-35,'held movement failed');check(after.bullets>0,'held fire failed');
      key('KeyW',false);key('KeyJ',false);const stopped=snap();await wait(100);check(snap().player.y===stopped.player.y,'stuck key');
      key('KeyD',true);await wait(70);key('KeyD',false);check(snap().player.dir===1,'turn failed');
    });
    await test('方向优先级阻止斜向移动，箭头和空格阻止滚动',async()=>{
      await restart();live.spawnTimer=999;live.spawnLeft=99;key('KeyW',true);key('KeyA',true);const before=snap();await wait(200);const after=snap();
      key('KeyW',false);key('KeyA',false);check(Math.abs(after.player.y-before.player.y)<.01,'diagonal movement');
      const e=new w.KeyboardEvent('keydown',{code:'Space',cancelable:true});w.dispatchEvent(e);check(e.defaultPrevented,'space default');key('Space',false);
      const a=new w.KeyboardEvent('keydown',{code:'ArrowUp',cancelable:true});w.dispatchEvent(a);check(a.defaultPrevented,'arrow default');key('ArrowUp',false);
    });
    await test('暂停冻结、继续无时间跳跃，失焦会清除按键',async()=>{
      $('pause').click();const before=snap();await wait(250);check(snap().time===before.time,'paused clock advanced');$('action').click();await wait(100);check(snap().time-before.time<.16,'resume jumped');
      key('KeyW',true);w.dispatchEvent(new w.Event('blur'));check(snap().state==='paused','blur did not pause');$('action').click();const p=snap().player;await wait(100);check(snap().player.y===p.y,'blur left held key');
    });
    await test('双指触控：方向和开火独立保持，取消后停止',async()=>{
      await restart();live.spawnTimer=999;live.spawnLeft=99;
      const up=d.querySelector('[data-control="up"]'),fire=d.querySelector('[data-control="fire"]');
      // Capture requires an actual active pointer; stub only capture in this event fixture.
      up.setPointerCapture=fire.setPointerCapture=()=>{};
      const pointer=(target,type,id)=>target.dispatchEvent(new w.PointerEvent(type,{pointerId:id,bubbles:true,cancelable:true}));
      const before=snap();pointer(up,'pointerdown',1);pointer(fire,'pointerdown',2);await wait(300);check(snap().player.y<before.player.y-20,'touch movement');check(snap().bullets>0,'touch fire');pointer(up,'pointercancel',1);pointer(fire,'pointerup',2);
      const stopped=snap();await wait(100);check(snap().player.y===stopped.player.y,'touch stuck');
    });
    await test('真实画面中敌军分批出生、移动与射击',async()=>{
      await restart();await wait(3900);const before=snap();check(before.enemies.length>=2,'spawning failed');await wait(600);const after=snap();
      check(after.enemies.some(t=>{const previous=before.enemies.find(p=>p.id===t.id);return previous&&Math.abs(t.x-previous.x)+Math.abs(t.y-previous.y)>10;}),'AI did not advance along its route');
      check(after.bullets>0,'AI no fire');
    });
    await test('状态夹具：死亡复活、生命耗尽和基地失守显示失败界面',async()=>{
      await restart();live.spawnLeft=99;live.spawnTimer=999;live.kill(live.player);await wait(1450);check(snap().lives===2&&snap().player,'respawn failed');
      live.kill(live.player);await wait(1450);live.kill(live.player);await wait(40);check(snap().state==='lost'&&$('title').textContent==='任务失败','life ending missing');
      await restart();live.base.alive=false;live.finish('lost','基地被摧毁');await wait(40);check($('message').textContent.includes('基地被摧毁'),'base ending missing');
    });
    await test('状态夹具：三关切换、最终胜利以及完整重开',async()=>{
      await restart();for(let i=0;i<3;i++){
        live.spawnLeft=0;live.enemies=[];live.bullets=[];await wait(40);check(snap().state===(i===2?'won':'clear'),'stage settlement');
        if(i<2){$('action').click();await wait(40);check(snap().level===i+1,'next stage');}
      }
      check($('title').textContent==='全关胜利！','final ending missing');$('action').click();await wait(40);check(snap().level===0&&snap().lives===3&&snap().score===0&&snap().enemies.length===0&&snap().bullets===0,'restart residue');
    });
    await test('多次重开 / pagehide-pageshow 生命周期后，仅一个循环，无重复事件',async()=>{
      for(let i=0;i<4;i++)$('restart').click();await wait(100);check(snap().time<.16,'duplicate frame loop');
      w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:true}));const frozen=snap().time;await wait(100);check(snap().time===frozen,'destroy left frame running');
      w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));check(snap().state==='title','restore failed');
      $('action').click();await wait(850);live.spawnTimer=999;live.spawnLeft=99;const before=snap().time;await wait(250);check(snap().time-before<.32,'restored clock doubled');
      key('KeyP',true);key('KeyP',false);check(snap().state==='paused','duplicate key listener toggled twice');
    });
    await test('无浏览器异常，画布保持正方形、像素采样关闭',async()=>{
      check(errors.length===0,errors.join('; '));const r=$('stage').getBoundingClientRect();check(Math.abs(r.width-r.height)<1,'stretched canvas');check($('stage').getContext('2d').imageSmoothingEnabled===false,'blurred pixels');
    });
    document.getElementById('result').textContent=`完成：${passed} 组通过，${failed} 组失败。`;
  },{once:true});
})();
