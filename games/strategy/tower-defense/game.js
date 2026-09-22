const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const ui = {
  credits: document.querySelector('#credits'), lives: document.querySelector('#lives'), wave: document.querySelector('#wave'), status: document.querySelector('#statusLine'),
  toast: document.querySelector('#toast'), intro: document.querySelector('#introOverlay'), end: document.querySelector('#endOverlay'), endTitle: document.querySelector('#endTitle'),
  endText: document.querySelector('#endText'), endEyebrow: document.querySelector('#endEyebrow'), pause: document.querySelector('#pauseButton'), waveButton: document.querySelector('#waveButton'),
  speed: document.querySelector('#speedButton'), towerInfo: document.querySelector('#towerInfo'), upgrade: document.querySelector('#upgradeButton'), sell: document.querySelector('#sellButton')
};

const WORLD = { width: 960, height: 600 };
const PATH = [
  {x:-30,y:118},{x:145,y:118},{x:145,y:265},{x:350,y:265},{x:350,y:92},{x:565,y:92},{x:565,y:365},{x:760,y:365},{x:760,y:190},{x:990,y:190}
];
const PADS = [
  {x:78,y:224},{x:235,y:165},{x:251,y:356},{x:430,y:193},{x:464,y:450},{x:650,y:198},{x:665,y:468},{x:845,y:305},{x:858,y:95},{x:102,y:423},{x:330,y:500},{x:605,y:525}
];
const TOWER_TYPES = {
  pulse: { label:'脉冲塔', cost:90, range:125, damage:13, reload:.36, color:'#70a7ff', projectile:'#d6e6ff' },
  prism: { label:'棱镜塔', cost:150, range:190, damage:38, reload:1.25, color:'#b58cff', projectile:'#f0dcff' },
  frost: { label:'霜冻塔', cost:130, range:135, damage:8, reload:.85, color:'#63e6e2', projectile:'#bfffff', slow:.55 }
};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

class TowerDefenseGame {
  constructor(){
    this.started=false; this.paused=false; this.ended=false; this.speed=1; this.lastTime=0; this.toastTimer=0; this.buildType='pulse';
    this.bindEvents(); this.reset(); this.draw(); this.syncBuildButtons();
  }

  reset(){
    this.credits=420; this.lives=20; this.wave=0; this.score=0; this.towers=[]; this.enemies=[]; this.effects=[]; this.spawnQueue=[]; this.spawnTimer=0; this.waveActive=false; this.selectedTower=null; this.elapsed=0; this.buildType='pulse'; this.speed=1;
    ui.speed.textContent='速度 ×1'; this.syncBuildButtons();
    this.updateUi(); this.updateTowerPanel(); ui.status.textContent='选择炮塔，点击基座建造。';
  }

  bindEvents(){
    document.querySelector('#startButton').addEventListener('click',()=>this.start());
    document.querySelector('#restartButton').addEventListener('click',()=>this.start());
    ui.pause.addEventListener('click',()=>this.togglePause());
    ui.waveButton.addEventListener('click',()=>this.startWave());
    ui.speed.addEventListener('click',()=>{ this.speed=this.speed===1?2:1; ui.speed.textContent=`速度 ×${this.speed}`; });
    ui.upgrade.addEventListener('click',()=>this.upgradeTower());
    ui.sell.addEventListener('click',()=>this.sellTower());
    document.querySelectorAll('[data-build]').forEach(button=>button.addEventListener('click',()=>{this.buildType=button.dataset.build;this.selectedTower=null;this.syncBuildButtons();this.updateTowerPanel();ui.status.textContent=`已选择${TOWER_TYPES[this.buildType].label}，点击空基座建造。`;}));
    canvas.addEventListener('pointerup',event=>this.handlePointer(event));
    window.addEventListener('keydown',event=>{ if(event.code==='Space'){event.preventDefault();this.togglePause();} if(event.key==='1')this.selectBuild('pulse');if(event.key==='2')this.selectBuild('prism');if(event.key==='3')this.selectBuild('frost'); });
  }

  start(){
    this.reset(); this.started=true; this.paused=false; this.ended=false; ui.intro.hidden=true; ui.end.hidden=true; ui.pause.textContent='暂停'; this.lastTime=performance.now(); requestAnimationFrame(t=>this.loop(t));
  }

  selectBuild(type){ this.buildType=type; this.selectedTower=null; this.syncBuildButtons(); this.updateTowerPanel(); }

  togglePause(){
    if(!this.started||this.ended)return; this.paused=!this.paused; ui.pause.textContent=this.paused?'继续':'暂停'; ui.status.textContent=this.paused?'防线已暂停。':'防线运行中。';
    if(!this.paused){this.lastTime=performance.now();requestAnimationFrame(t=>this.loop(t));}
  }

  pointFromEvent(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*WORLD.width/rect.width,y:(event.clientY-rect.top)*WORLD.height/rect.height};}

  handlePointer(event){
    if(!this.started||this.paused||this.ended)return; const point=this.pointFromEvent(event);
    const tower=this.towers.find(item=>distance(item,point)<25);
    if(tower){this.selectedTower=tower;this.buildType=null;this.syncBuildButtons();this.updateTowerPanel();ui.status.textContent=`已选择 ${TOWER_TYPES[tower.type].label} Lv.${tower.level}。`;return;}
    const pad=PADS.find(item=>distance(item,point)<30);
    if(!pad){this.selectedTower=null;this.updateTowerPanel();return;}
    if(this.towers.some(item=>item.pad===pad)){this.showToast('这个基座已经有炮塔');return;}
    if(!this.buildType){this.showToast('请先选择炮塔类型');return;}
    const stats=TOWER_TYPES[this.buildType];
    if(this.credits<stats.cost){this.showToast('能量不足');return;}
    this.credits-=stats.cost;
    const built={id:String(Math.random()),type:this.buildType,pad,x:pad.x,y:pad.y,level:1,cooldown:0,angle:-Math.PI/2,totalSpent:stats.cost,kills:0};
    this.towers.push(built);this.selectedTower=built;this.buildType=null;this.syncBuildButtons();this.updateTowerPanel();this.updateUi();this.showToast(`${stats.label}建造完成`);
  }

  startWave(){
    if(!this.started||this.paused||this.ended)return;
    if(this.waveActive){this.showToast('本波敌人仍在进攻');return;}
    if(this.wave>=8)return;
    this.wave++;
    const count=7+this.wave*3;
    this.spawnQueue=Array.from({length:count},(_,index)=>({
      hp:(50+this.wave*18)*(index===count-1&&this.wave%4===0?4:1),
      speed:36+this.wave*2+(index%5===0?14:0),
      reward:12+this.wave*3,
      radius:index===count-1&&this.wave%4===0?18:11,
      boss:index===count-1&&this.wave%4===0
    }));
    this.spawnTimer=0;this.waveActive=true;ui.status.textContent=`第 ${this.wave} 波来袭：${count} 个目标。`;this.updateUi();
  }

  loop(time){
    if(!this.started||this.paused||this.ended)return; const raw=Math.min((time-this.lastTime)/1000,.04);this.lastTime=time;const dt=raw*this.speed;this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t));
  }

  update(dt){
    this.elapsed+=dt;
    if(this.spawnQueue.length){this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnEnemy(this.spawnQueue.shift());this.spawnTimer=Math.max(.3,.86-this.wave*.035);}}
    this.enemies.forEach(enemy=>this.updateEnemy(enemy,dt));
    this.towers.forEach(tower=>this.updateTower(tower,dt));
    this.effects.forEach(effect=>effect.life-=dt);this.effects=this.effects.filter(effect=>effect.life>0);
    const escaped=this.enemies.filter(enemy=>enemy.escaped); escaped.forEach(enemy=>{this.lives-=enemy.boss?3:1;});
    this.enemies=this.enemies.filter(enemy=>enemy.hp>0&&!enemy.escaped);
    if(this.waveActive&&!this.spawnQueue.length&&!this.enemies.length){
      this.waveActive=false; const bonus=35+this.wave*10;this.credits+=bonus;
      if(this.wave>=8){this.finish(true);return;} ui.status.textContent=`第 ${this.wave} 波已清除，整备奖励 +${bonus}。`;this.showToast('波次清除');
    }
    if(this.lives<=0){this.finish(false);return;}
    this.updateUi();
  }

  spawnEnemy(config){
    this.enemies.push({...config,maxHp:config.hp,x:PATH[0].x,y:PATH[0].y,pathIndex:0,slowTimer:0,escaped:false,flash:0});
  }

  updateEnemy(enemy,dt){
    enemy.flash=Math.max(0,enemy.flash-dt);enemy.slowTimer=Math.max(0,enemy.slowTimer-dt);
    const next=PATH[enemy.pathIndex+1];if(!next){enemy.escaped=true;return;}
    const gap=distance(enemy,next),speed=enemy.speed*(enemy.slowTimer>0?.55:1);
    if(gap<=speed*dt+1){enemy.x=next.x;enemy.y=next.y;enemy.pathIndex++;if(enemy.pathIndex>=PATH.length-1)enemy.escaped=true;return;}
    const angle=Math.atan2(next.y-enemy.y,next.x-enemy.x);enemy.x+=Math.cos(angle)*speed*dt;enemy.y+=Math.sin(angle)*speed*dt;
  }

  updateTower(tower,dt){
    tower.cooldown-=dt; const stats=TOWER_TYPES[tower.type]; const range=stats.range*(1+.12*(tower.level-1));
    const targets=this.enemies.filter(enemy=>distance(tower,enemy)<=range).sort((a,b)=>b.pathIndex-a.pathIndex||distance(a,PATH[a.pathIndex+1]||a)-distance(b,PATH[b.pathIndex+1]||b));
    const target=targets[0]; if(!target)return; tower.angle=Math.atan2(target.y-tower.y,target.x-tower.x);
    if(tower.cooldown<=0){
      tower.cooldown=stats.reload*(1-.08*(tower.level-1)); const damage=stats.damage*(1+.5*(tower.level-1));target.hp-=damage;target.flash=.1;if(stats.slow)target.slowTimer=1.5;
      this.effects.push({x1:tower.x,y1:tower.y-7,x2:target.x,y2:target.y,color:stats.projectile,life:.13,type:tower.type});
      if(target.hp<=0){this.credits+=target.reward;tower.kills++;this.score+=target.reward;this.effects.push({x:target.x,y:target.y,color:stats.color,life:.35,type:'burst'});}
    }
  }

  upgradeTower(){
    const tower=this.selectedTower;if(!tower||!this.towers.includes(tower))return;if(tower.level>=3){this.showToast('炮塔已满级');return;}
    const cost=Math.round(TOWER_TYPES[tower.type].cost*(.72+.28*tower.level));if(this.credits<cost){this.showToast('能量不足');return;}
    this.credits-=cost;tower.totalSpent+=cost;tower.level++;this.showToast(`升级至 Lv.${tower.level}`);this.updateTowerPanel();this.updateUi();
  }

  sellTower(){
    const tower=this.selectedTower;if(!tower)return;const refund=Math.round(tower.totalSpent*.65);this.credits+=refund;this.towers=this.towers.filter(item=>item!==tower);this.selectedTower=null;this.showToast(`回收能量 +${refund}`);this.updateTowerPanel();this.updateUi();
  }

  updateTowerPanel(){
    const tower=this.selectedTower;
    if(!tower){ui.towerInfo.textContent='点击已建造的炮塔查看属性。';ui.upgrade.disabled=true;ui.sell.disabled=true;ui.upgrade.textContent='升级';return;}
    const stats=TOWER_TYPES[tower.type],cost=tower.level<3?Math.round(stats.cost*(.72+.28*tower.level)):0;
    ui.towerInfo.textContent=`${stats.label} · Lv.${tower.level} · 击破 ${tower.kills} · 伤害 ${Math.round(stats.damage*(1+.5*(tower.level-1)))}`;
    ui.upgrade.disabled=tower.level>=3||this.credits<cost;ui.upgrade.textContent=tower.level>=3?'已满级':`升级 $${cost}`;ui.sell.disabled=false;ui.sell.textContent=`回收 $${Math.round(tower.totalSpent*.65)}`;
  }

  updateUi(){
    ui.credits.textContent=Math.floor(this.credits);ui.lives.textContent=Math.max(0,this.lives);ui.wave.textContent=`${this.wave} / 8`;ui.waveButton.disabled=!this.started||this.waveActive||this.wave>=8||this.paused;ui.waveButton.textContent=this.wave>=8?'最终波次':this.waveActive?'战斗中…':'开始下一波';
    document.querySelectorAll('[data-build]').forEach(button=>{button.disabled=!this.started||this.paused||this.credits<TOWER_TYPES[button.dataset.build].cost;});this.updateTowerPanel();
  }

  syncBuildButtons(){document.querySelectorAll('[data-build]').forEach(button=>button.classList.toggle('is-active',button.dataset.build===this.buildType));}

  finish(won){
    this.ended=true;this.started=false;ui.end.hidden=false;ui.endEyebrow.textContent=won?'防线稳固':'核心失守';ui.endTitle.textContent=won?'守卫成功':'防御失败';
    ui.endText.textContent=won?`八波机械虫群已全部清除。剩余核心 ${this.lives}，累计回收能量 ${this.score}。`:'敌人突破了星环核心。尝试在转弯处布置霜冻塔，并让棱镜塔覆盖更长的路径。';
  }

  showToast(message){ui.toast.textContent=message;ui.toast.classList.add('is-visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>ui.toast.classList.remove('is-visible'),1500);}

  draw(){
    ctx.clearRect(0,0,WORLD.width,WORLD.height);this.drawField();this.drawPath();PADS.forEach(pad=>this.drawPad(pad));this.towers.forEach(tower=>this.drawTower(tower));this.enemies.forEach(enemy=>this.drawEnemy(enemy));this.effects.forEach(effect=>this.drawEffect(effect));this.drawCore();
  }

  drawField(){
    const gradient=ctx.createRadialGradient(500,270,20,500,270,700);gradient.addColorStop(0,'#16294b');gradient.addColorStop(.55,'#0e192d');gradient.addColorStop(1,'#070c16');ctx.fillStyle=gradient;ctx.fillRect(0,0,960,600);
    ctx.strokeStyle='rgba(114,167,255,.07)';ctx.lineWidth=1;for(let x=-300;x<1100;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+300,600);ctx.stroke();}for(let y=20;y<600;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();}
    [[215,65,2],[720,80,3],[496,300,2],[892,474,2],[64,528,3]].forEach(([x,y,r])=>{ctx.fillStyle='#b8d2ff';ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;});
  }

  drawPath(){
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(38,65,103,.95)';ctx.lineWidth=64;ctx.beginPath();PATH.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    ctx.strokeStyle='rgba(122,169,239,.25)';ctx.lineWidth=4;ctx.setLineDash([10,15]);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle='rgba(141,187,255,.14)';ctx.lineWidth=50;ctx.stroke();
  }

  drawPad(pad){
    const occupied=this.towers.some(tower=>tower.pad===pad);ctx.save();ctx.translate(pad.x,pad.y);ctx.shadowColor='#72a7ff';ctx.shadowBlur=occupied?4:12;ctx.fillStyle=occupied?'#172237':'#203b65';ctx.strokeStyle=occupied?'#40577c':'#72a7ff';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6,x=Math.cos(a)*26,y=Math.sin(a)*26;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();if(!occupied){ctx.fillStyle='rgba(148,190,255,.3)';ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();}ctx.restore();
  }

  drawTower(tower){
    const stats=TOWER_TYPES[tower.type],selected=tower===this.selectedTower;
    if(selected){const range=stats.range*(1+.12*(tower.level-1));ctx.fillStyle='rgba(114,167,255,.06)';ctx.strokeStyle='rgba(114,167,255,.32)';ctx.beginPath();ctx.arc(tower.x,tower.y,range,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.save();ctx.translate(tower.x,tower.y);ctx.shadowColor=stats.color;ctx.shadowBlur=selected?20:9;ctx.fillStyle='#17243b';ctx.strokeStyle=stats.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18,11);ctx.lineTo(-12,-13);ctx.lineTo(12,-13);ctx.lineTo(18,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.rotate(tower.angle);ctx.fillStyle=stats.color;
    if(tower.type==='pulse'){ctx.fillRect(-5,-7,27,14);ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();}
    else if(tower.type==='prism'){ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(5,-13);ctx.lineTo(14,0);ctx.lineTo(5,13);ctx.closePath();ctx.fill();ctx.fillRect(7,-3,25,6);}
    else{ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?7:14,x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.fillRect(5,-3,22,6);}
    ctx.restore();ctx.fillStyle='#fff';ctx.font='900 9px system-ui';ctx.textAlign='center';ctx.fillText(`L${tower.level}`,tower.x,tower.y+31);
  }

  drawEnemy(enemy){
    ctx.save();ctx.translate(enemy.x,enemy.y);ctx.shadowColor=enemy.slowTimer>0?'#63e6e2':'#ff6d91';ctx.shadowBlur=enemy.boss?18:8;ctx.fillStyle=enemy.flash?'#fff':enemy.boss?'#ff477e':'#d94c70';ctx.strokeStyle='#ffb0c5';ctx.lineWidth=2;ctx.beginPath();const sides=enemy.boss?8:6;for(let i=0;i<sides;i++){const a=i*Math.PI*2/sides,r=enemy.radius*(i%2?.78:1),x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();if(enemy.slowTimer>0){ctx.strokeStyle='#9fffff';ctx.beginPath();ctx.arc(0,0,enemy.radius+5,0,Math.PI*2);ctx.stroke();}ctx.restore();
    const width=enemy.boss?42:27,ratio=clamp(enemy.hp/enemy.maxHp,0,1);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(enemy.x-width/2,enemy.y-enemy.radius-10,width,4);ctx.fillStyle=ratio>.4?'#ff789a':'#ffcc66';ctx.fillRect(enemy.x-width/2,enemy.y-enemy.radius-10,width*ratio,4);
  }

  drawEffect(effect){
    if(effect.type==='burst'){ctx.strokeStyle=effect.color;ctx.globalAlpha=effect.life/.35;ctx.lineWidth=3;ctx.beginPath();ctx.arc(effect.x,effect.y,(1-effect.life/.35)*26,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;return;}
    ctx.strokeStyle=effect.color;ctx.globalAlpha=clamp(effect.life/.13,0,1);ctx.lineWidth=effect.type==='prism'?5:2;ctx.shadowColor=effect.color;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(effect.x1,effect.y1);ctx.lineTo(effect.x2,effect.y2);ctx.stroke();ctx.globalAlpha=1;ctx.shadowBlur=0;
  }

  drawCore(){
    ctx.save();ctx.translate(925,190);ctx.shadowColor='#72a7ff';ctx.shadowBlur=25;ctx.strokeStyle='#98beff';ctx.lineWidth=5;ctx.fillStyle='#18305b';ctx.beginPath();ctx.arc(0,0,39,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#d9e7ff';ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle='#dbe8ff';ctx.textAlign='center';ctx.font='800 10px system-ui';ctx.fillText('星环核心',925,245);
  }
}

const game=new TowerDefenseGame();
window.addEventListener('resize',()=>game.draw());
