(() => {
  'use strict';
  const {LEVELS,clamp,createFlight,step,toggleGear,cycleFlaps,stage,guidance,readSave}=TU95;
  const $=id=>document.getElementById(id);
  const canvas=$('sky'), ctx=canvas.getContext('2d');
  const input={}, held=new Map();
  const SAVE_KEY='phdsx-tu95-v1';
  let save;
  try { save=readSave(localStorage.getItem(SAVE_KEY)); } catch { save=readSave(null); }
  let selected=0, flight=createFlight(0), lastTime=0, accumulator=0, camY=0, uiTime=0;
  let sound=false, audio=null, oscillator=null, gain=null, finishHandled=false;
  let W=1200,H=580;
  const aircraft=new Image(), scenery=new Image();
  aircraft.src='assets/aircraft.webp'; scenery.src='assets/valley.webp';
  const assets={aircraft:false,scenery:false};
  aircraft.onload=()=>{assets.aircraft=true;}; scenery.onload=()=>{assets.scenery=true;};
  aircraft.onerror=scenery.onerror=()=>{$('modal-foot').textContent='部分画面素材未能加载，请刷新页面重试。';};
  function unlockCount() {
    let n=1;
    while(n<LEVELS.length && save.records[LEVELS[n-1].id]) n++;
    return n;
  }
  function options() {
    const unlocked=unlockCount();
    $('mission').replaceChildren(...LEVELS.map((level,i)=>{
      const option=document.createElement('option');
      const row=save.records[level.id];
      option.value=i;option.textContent=`0${i+1} · ${level.name}${row?' '+ '★'.repeat(row.stars):i>=unlocked?' · 待解锁':''}`;
      option.disabled=i>=unlocked;return option;
    }));
    $('mission').value=String(selected);
    $('record').textContent=`训练记录 ${Object.keys(save.records).length} / 3`;
  }
  function resetInput() {
    for(const key of Object.keys(input)) delete input[key];
    held.clear();
    document.querySelectorAll('[data-hold]').forEach(button=>button.classList.remove('is-held'));
  }
  function setHeld(action,source,down) {
    if(down) held.set(source,action); else held.delete(source);
    input[action]=[...held.values()].includes(action);
    document.querySelectorAll(`[data-hold="${action}"]`).forEach(button=>button.classList.toggle('is-held',input[action]));
  }
  function focusGame() { canvas.focus({preventScroll:true}); }
  function showOverlay(kind) {
    resetInput();
    const level=flight.level;
    $('overlay').hidden=false;
    $('result').hidden=true;$('retry').hidden=true;
    $('first-tips').hidden=kind!=='ready';
    $('overlay-kicker').textContent=`飞行任务 / 0${selected+1} · ${level.name}`;
    $('modal-foot').textContent='中文界面 · 无广告 · 进度保存在此浏览器';
    if(kind==='ready') {
      $('overlay-title').textContent=selected===0?'从这里，飞向下一条跑道。':level.name;
      $('overlay-text').textContent=level.brief;
      $('start').innerHTML='开始飞行 <span>→</span>';
    } else if(kind==='paused') {
      $('overlay-title').textContent='航程暂停';
      $('overlay-text').textContent='飞行仪表与飞机都已暂停。准备好后，继续这段航程。';
      $('start').innerHTML='继续飞行 <span>→</span>';
    } else if(kind==='crashed') {
      $('overlay-title').textContent='这次，再调整一点。';
      $('overlay-text').textContent=flight.reason;
      $('start').innerHTML='重新飞行 <span>↻</span>';
      $('modal-foot').textContent='每次重飞都会补满燃油，并回到出发跑道';
    } else {
      $('overlay-title').textContent=selected===LEVELS.length-1?'三条航线，圆满完成。':'平安抵达，飞行员。';
      $('overlay-text').textContent=`已在${level.to}安全停稳。${flight.stars===3?'漂亮的进近，值得一枚满星勋章。':'你已经完成这条航线，可以继续挑战或重飞提高成绩。'}`;
      $('result').hidden=false;
      $('result').textContent=`${'★'.repeat(flight.stars)}${'☆'.repeat(3-flight.stars)}  ${flight.score} 分 · 下降率 ${flight.touchdown.sink.toFixed(1)} m/s`;
      $('retry').hidden=selected===LEVELS.length-1;
      $('start').innerHTML=selected<LEVELS.length-1?'下一条航线 <span>→</span>':'再次飞行 <span>↻</span>';
    }
    $('start').focus({preventScroll:true});
  }
  function configure(index,play=false) {
    selected=clamp(index,0,LEVELS.length-1);flight=createFlight(selected);camY=0;finishHandled=false;accumulator=0;resetInput();
    const level=flight.level;
    $('from').textContent=level.from;$('to').textContent=level.to;
    $('route-label').textContent=`${level.from} → ${level.to}`;
    $('route-length').textContent=`${(level.destination/1000).toFixed(1)} km`;
    $('brief').textContent=level.brief;$('weather').textContent=level.weather;
    options();
    if(play) {flight.status='flying';$('overlay').hidden=true;focusGame();}
    else showOverlay('ready');
    updateUI();
  }
  function start() {
    if(flight.status==='paused') {flight.status='flying';resetInput();}
    else if(flight.status==='won') {configure(selected<LEVELS.length-1?selected+1:selected,true);}
    else if(flight.status==='crashed') configure(selected,true);
    else flight.status='flying';
    $('overlay').hidden=true;accumulator=0;focusGame();
    if(sound) enableAudio();
    updateUI();
  }
  function pause() {
    if(flight.status==='flying') {flight.status='paused';showOverlay('paused');}
    else if(flight.status==='paused') start();
    updateUI();updateAudio();
  }
  function recordFinish() {
    if(finishHandled) return;
    finishHandled=true;
    if(flight.status==='won') {
      const prior=save.records[flight.level.id];
      if(!prior || prior.score<flight.score) save.records[flight.level.id]={score:flight.score,stars:flight.stars};
      try {localStorage.setItem(SAVE_KEY,JSON.stringify(save));} catch {}
      options();tone(660,.22);
    } else tone(110,.45);
    showOverlay(flight.status);updateUI();
  }
  function updateUI() {
    const s=flight,st=stage(s);
    $('speed').textContent=String(Math.round(s.vx*3.6)).padStart(3,'0');
    $('altitude').textContent=String(Math.round(s.y)).padStart(3,'0');
    $('throttle').textContent=Math.round(s.throttle*100);
    $('pitch').textContent=(s.pitch>0?'+':'')+Math.round(s.pitch);
    $('vertical').textContent=`垂直速度 ${s.vy>=0?'+':''}${s.vy.toFixed(1)} m/s`;
    $('fuel').textContent=`燃油 ${Math.ceil(s.fuel)}%`;
    $('throttle-bar').style.width=s.throttle*100+'%';
    $('speed-bar').style.width=clamp(s.vx/140*100,0,100)+'%';
    $('gear-label').textContent=s.gear?'已放下':'已收起';
    $('gear').setAttribute('aria-pressed',String(s.gear));
    $('gear').setAttribute('aria-label',`起落架${s.gear?'已放下':'已收起'}，点击切换`);
    $('flap-label').textContent=['收起','起飞','着陆'][s.flaps];
    $('flaps').setAttribute('aria-label',`襟翼${['收起','起飞','着陆'][s.flaps]}，点击切换`);
    $('distance').textContent=s.touched?'目标跑道 · 滑行减速':s.x>=s.level.destination?'目标跑道正下方':`距目标 ${Math.max(0,(s.level.destination-s.x)/1000).toFixed(1)} km`;
    $('guidance').textContent=guidance(s);
    $('phase').textContent=({ready:'等待起飞',paused:'已暂停',won:'任务完成',crashed:'飞行结束'})[s.status] || ['滑跑加速','爬升离地','沿线巡航','进近着陆','着陆滑行'][st];
    $('pause').textContent=s.status==='paused'?'▶ 继续':'Ⅱ 暂停';
    $('pause').disabled=!['flying','paused'].includes(s.status);
    document.querySelectorAll('[data-stage]').forEach(el=>{const n=Number(el.dataset.stage);el.classList.toggle('active',n===Math.min(3,st));el.classList.toggle('done',n<st);});
    const warning=s.stall?'失速警报 · 压低机头，加大油门':s.fuel<15?'燃油不足 · 尽快进近':s.airborne && s.y<35 && !s.gear?'接近地面 · 放下起落架':s.y>s.level.ceiling*.8?'高度过高 · 降低机头':'';
    $('alert').hidden=!warning || s.status!=='flying';$('alert').textContent=warning;
  }
  function enableAudio() {
    try {
      if(!audio) {
        audio=new (window.AudioContext||window.webkitAudioContext)();
        oscillator=audio.createOscillator();gain=audio.createGain();
        oscillator.type='sawtooth';oscillator.frequency.value=45;gain.gain.value=0;
        const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;
        oscillator.connect(filter);filter.connect(gain);gain.connect(audio.destination);oscillator.start();
      }
      audio.resume().catch(()=>{});
    } catch {sound=false;$('sound').textContent='声音不可用';}
  }
  function updateAudio() {
    if(!audio) return;
    gain.gain.setTargetAtTime(sound && flight.status==='flying'?.012+flight.throttle*.028:0,audio.currentTime,.12);
    oscillator.frequency.setTargetAtTime(28+flight.throttle*48,audio.currentTime,.12);
  }
  function tone(hz,length=.08) {
    if(!sound || !audio) return;
    const osc=audio.createOscillator(),vol=audio.createGain();
    osc.frequency.value=hz;vol.gain.setValueAtTime(.035,audio.currentTime);vol.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);
    osc.connect(vol);vol.connect(audio.destination);osc.start();osc.stop(audio.currentTime+length);
    osc.onended=()=>{osc.disconnect();vol.disconnect();};
  }
  function gear() {
    if(!toggleGear(flight)) {if(flight.status==='flying'){$('guidance').textContent='起落架保护 · 离地 12 米以上才可以收起。';tone(180);}}
    else {tone(420);updateUI();}
    focusGame();
  }
  function flaps() {cycleFlaps(flight);tone(340);updateUI();focusGame();}
  $('start').addEventListener('click',start);
  $('retry').addEventListener('click',()=>configure(selected,true));
  $('restart').addEventListener('click',()=>configure(selected,true));
  $('pause').addEventListener('click',pause);
  $('gear').addEventListener('click',gear);$('flaps').addEventListener('click',flaps);
  $('mission').addEventListener('change',()=>configure(Number($('mission').value)));
  $('sound').addEventListener('click',()=>{sound=!sound;if(sound)enableAudio();$('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));updateAudio();focusGame();});
  if(!document.fullscreenEnabled) $('fullscreen').hidden=true;
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.shell').requestFullscreen();}catch{$('guidance').textContent='浏览器暂不支持全屏，可使用浏览器菜单放大页面。';}});
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';focusGame();});
  const keyMap={ArrowUp:'more',KeyW:'more',ArrowDown:'less',KeyS:'less',ArrowLeft:'up',KeyA:'up',ArrowRight:'down',KeyD:'down',Space:'brake'};
  document.addEventListener('keydown',event=>{
    if(event.target.closest?.('select,summary,details') || (event.code==='Space' && event.target.tagName==='BUTTON')) return;
    if(keyMap[event.code]) {
      if(flight.status==='flying') {event.preventDefault();setHeld(keyMap[event.code],event.code,true);}
    } else if(!event.repeat) {
      if(event.code==='KeyP' || event.code==='Escape') {event.preventDefault();pause();}
      else if(event.code==='KeyR') configure(selected,true);
      else if(event.code==='KeyG') gear();
      else if(event.code==='KeyF') flaps();
    }
  });
  document.addEventListener('keyup',event=>{if(keyMap[event.code])setHeld(keyMap[event.code],event.code,false);});
  document.querySelectorAll('[data-hold]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();if(flight.status!=='flying')return;
      button.setPointerCapture(event.pointerId);setHeld(button.dataset.hold,'pointer'+event.pointerId,true);
    });
    const release=event=>setHeld(button.dataset.hold,'pointer'+event.pointerId,false);
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    button.addEventListener('contextmenu',event=>event.preventDefault());
  });
  window.addEventListener('blur',()=>{resetInput();if(flight.status==='flying')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(flight.status==='flying')pause();}});
  function resize() {
    const mobile=window.matchMedia('(max-width:520px)').matches;
    W=mobile?800:1200;H=mobile?600:580;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize',resize);resize();
  function text(value,x,y,color='#e7f1f0',size=13,align='left') {
    ctx.fillStyle=color;ctx.font=`${size}px "Segoe UI","Microsoft YaHei",sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);
  }
  function drawRunway(start,length,label,groundY,sx) {
    const left=sx(start),right=sx(start+length);
    if(right < -300 || left>W+300) return;
    ctx.fillStyle='#4e6266';ctx.fillRect(left,groundY,length,30);
    ctx.fillStyle='#718180';ctx.fillRect(left,groundY,length,3);
    ctx.fillStyle='#e3e2c5';
    for(let x=Math.max(start,Math.floor((flight.x-W)/100)*100);x<Math.min(start+length,flight.x+W*2);x+=100)ctx.fillRect(sx(x),groundY+13,40,2);
    ctx.fillStyle='#a3cbb0';ctx.fillRect(left,groundY+30,length,5);
    for(let x=Math.max(start,Math.floor((flight.x-W)/90)*90);x<Math.min(start+length,flight.x+W*2);x+=90){ctx.fillStyle='#e9d5a0';ctx.fillRect(sx(x),groundY-4,4,4);}
    ctx.fillStyle='#e1ddbd';ctx.fillRect(left+22,groundY+4,5,22);ctx.fillRect(left+34,groundY+4,5,22);
    ctx.fillRect(right-22,groundY+4,5,22);ctx.fillRect(right-34,groundY+4,5,22);
    if(left> -300 && left < W+100) {
      ctx.fillStyle='#263f45';ctx.fillRect(left+25,groundY-85,5,85);
      ctx.fillStyle='#203b43';ctx.fillRect(left+10,groundY-80,130,31);
      text(label,left+75,groundY-60,'#e7e5cf',13,'center');
      ctx.fillStyle='#d8b177';ctx.fillRect(left+80,groundY-46,33,5);
    }
    if(right>-100 && right<W+100) {ctx.fillStyle='#617a78';ctx.fillRect(right+50,groundY-72,26,72);ctx.fillStyle='#d5e4d9';ctx.fillRect(right+43,groundY-86,40,18);ctx.fillStyle='#274952';ctx.fillRect(right+47,groundY-82,32,10);}
  }
  function draw() {
    const s=flight;
    const planeX=W*.28,camX=s.x-planeX;
    const sx=x=>x-camX;
    const groundY=H-106+camY,planeY=groundY-s.y-15;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=s.level.color;ctx.fillRect(0,0,W,H);
    if(assets.scenery) {
      const bw=W*2.25,bh=bw/3;
      ctx.drawImage(scenery,-(s.x*.05)%(W*.75),H-bh+camY*.11,bw,bh);
      ctx.fillStyle=s.level.id==='dusk'?'#ae6d4b24':'#cae3e914';ctx.fillRect(0,0,W,H);
    }
    const haze=ctx.createLinearGradient(0,H*.6,0,H);
    haze.addColorStop(0,'#d3e4dc00');haze.addColorStop(1,'#c2d9ce77');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
    ctx.fillStyle=s.level.id==='dusk'?'#617b6d':'#6c8c78';ctx.fillRect(0,groundY,W,H-groundY);
    ctx.fillStyle='#aec1a0';ctx.fillRect(0,groundY, W,3);
    // World geometry follows the same runway coordinates used by the flight model.
    drawRunway(-200,1650,s.level.from,groundY,sx);
    drawRunway(s.level.destination,s.level.runway,s.level.to,groundY,sx);
    if(s.x>s.level.destination-1800 && !s.touched) {
      const aim=s.level.destination+230;
      ctx.save();ctx.setLineDash([7,12]);ctx.lineWidth=2;ctx.strokeStyle='#f4e7b4bb';ctx.beginPath();
      ctx.moveTo(sx(aim-1600),groundY-190);ctx.lineTo(sx(aim),groundY-15);ctx.stroke();ctx.restore();
      const targetX=sx(aim);
      if(targetX<W-20 && targetX>0) {text('接地区',targetX,groundY+58,'#e2e9d3',13,'center');ctx.fillStyle='#e4c58466';ctx.fillRect(targetX-60,groundY+5,120,20);}
    }
    // Ground reference marker at each 500 m helps speed read naturally.
    for(let x=Math.floor(camX/500)*500;x<camX+W;x+=500) {
      if(x<0)continue;
      ctx.fillStyle='#b3c8a4';ctx.fillRect(sx(x),groundY+46,2,13);
      text(`${(x/1000).toFixed(1)} km`,sx(x)+9,groundY+58,'#c8d8bc',10);
    }
    if(groundY<H+60) {
      ctx.save();ctx.globalAlpha=Math.max(.03,.2-s.y/2000);ctx.fillStyle='#152f32';ctx.beginPath();ctx.ellipse(planeX+10,groundY+10,clamp(90-s.y*.09,35,90),4,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    ctx.save();ctx.translate(planeX,planeY);ctx.rotate(-s.pitch*Math.PI/180);
    if(s.gear) {
      ctx.strokeStyle='#475c62';ctx.lineWidth=3;
      for(const x of [-30,65]) {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+2,12);ctx.stroke();ctx.fillStyle='#182d38';ctx.beginPath();ctx.arc(x+2,12,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8c9d9d';ctx.beginPath();ctx.arc(x+2,12,1.5,0,Math.PI*2);ctx.fill();}
    }
    if(assets.aircraft) ctx.drawImage(aircraft,-110,-38,220,220/3);
    // Propeller blur and flap signal are animated independently of the sprite.
    if(s.status==='flying' && s.throttle>.06) {
      ctx.strokeStyle=`rgba(207,230,233,${.2+s.throttle*.25})`;ctx.lineWidth=3;
      for(const x of [22,45,64]) {ctx.beginPath();ctx.ellipse(x,1,2,11+Math.sin(s.time*85)*3,0,0,Math.PI*2);ctx.stroke();}
    }
    if(s.flaps) {ctx.strokeStyle='#e4ba78';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-37,6);ctx.lineTo(-47,6+s.flaps*3);ctx.stroke();}
    ctx.restore();
    // Compact route display stays in-world; detailed instruments remain HTML.
    const mapW=W<900?300:390,mapX=W-mapW-25,mapY=H-33;
    ctx.fillStyle='#172f3be0';ctx.fillRect(mapX-10,mapY-15,mapW+20,33);
    ctx.strokeStyle='#738f98';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mapX,mapY);ctx.lineTo(mapX+mapW,mapY);ctx.stroke();
    const progress=clamp(s.x/(s.level.destination+s.level.runway),0,1);
    ctx.strokeStyle='#dfb878';ctx.beginPath();ctx.moveTo(mapX,mapY);ctx.lineTo(mapX+mapW*progress,mapY);ctx.stroke();
    const dest=mapX+mapW*s.level.destination/(s.level.destination+s.level.runway);
    ctx.fillStyle='#a3c5af';ctx.fillRect(dest,mapY-3,mapX+mapW-dest,6);
    ctx.fillStyle='#f4cb8d';ctx.beginPath();ctx.moveTo(mapX+mapW*progress,mapY-8);ctx.lineTo(mapX+mapW*progress-5,mapY+5);ctx.lineTo(mapX+mapW*progress+5,mapY+5);ctx.closePath();ctx.fill();
    if(s.brake) text('刹车',planeX,planeY+40,'#f9e3b3',13,'center');
  }
  function frame(now) {
    const delta=lastTime?Math.min(.1,(now-lastTime)/1000):0;lastTime=now;
    if(flight.status==='flying') {
      accumulator+=delta;
      while(accumulator>=1/120) {step(flight,input,1/120);accumulator-=1/120;}
      camY+=(Math.max(0,flight.y-170)-camY)*Math.min(1,delta*3);
      if(flight.status==='won' || flight.status==='crashed')recordFinish();
    } else accumulator=0;
    uiTime+=delta;if(uiTime>.07){updateUI();updateAudio();uiTime=0;}
    draw();requestAnimationFrame(frame);
  }
  // Read-only runtime observations used by browser QA; no game mutation API.
  window.TU95Game={get state(){return {...flight,level:{...flight.level}};},get assets(){return {...assets};},get input(){return {...input};}};
  configure(0);requestAnimationFrame(frame);
})();
