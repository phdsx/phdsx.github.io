/* Rules only: no DOM, timers, audio or rendering. Simulation uses 1/120s steps. */
(function(root){
  'use strict';
  const Maps=typeof module!=='undefined'&&module.exports?require('./maps.js'):root.TankMaps;
  const SIZE=416,TILE=16,HALF=14,STEP=1/120;
  const DIRS=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
  const TYPES={normal:{speed:43,hp:1,points:100,color:'#e5dfc5'},fast:{speed:68,hp:1,points:200,color:'#ed7568'},armor:{speed:34,hp:3,points:400,color:'#7dd899'}};
  const overlap=(x,y,r,t,half=HALF)=>Math.abs(x-t.x)<r+half&&Math.abs(y-t.y)<r+half;
  class Game {
    constructor(random=Math.random){this.random=random;this.reset();}
    reset(){this.score=0;this.lives=3;this.level=0;this.kills=0;this.time=0;this.id=0;this.events=[];this.load();this.state='title';}
    load(){
      this.map=Maps.create(this.level);this.config=Maps.levels[this.level];this.enemies=[];this.bullets=[];this.effects=[];
      this.pickups=[{x:144,y:304,type:'star',ttl:30}];this.spawnLeft=this.config.total;this.spawnTimer=1.6;
      this.player=null;this.respawn=0;this.base={x:208,y:400,alive:true};this.notice='';this.noticeTime=0;
      this.state='playing';this.spawnPlayer();
    }
    start(){this.reset();this.state='playing';}
    next(){if(this.state==='clear'&&this.level<Maps.levels.length-1){this.level++;this.load();}}
    pause(){if(this.state==='playing')this.state='paused';else if(this.state==='paused')this.state='playing';}
    get remaining(){return this.spawnLeft+this.enemies.filter(t=>!t.dead).length;}
    event(type,x,y){this.events.push({type,x,y});}
    effect(x,y,kind='blast'){this.effects.push({x,y,kind,ttl:kind==='spawn'?.7:.35,max:kind==='spawn'?.7:.35});this.event(kind,x,y);}
    tiles(x,y,r){
      const out=[];
      for(let row=Math.max(0,Math.floor((y-r)/TILE));row<=Math.min(25,Math.floor((y+r-.001)/TILE));row++)
        for(let col=Math.max(0,Math.floor((x-r)/TILE));col<=Math.min(25,Math.floor((x+r-.001)/TILE));col++)
          out.push({row,col,type:this.map[row][col]});
      return out;
    }
    canOccupy(x,y,t=null,terrain=true){
      if(x<HALF||y<HALF||x>SIZE-HALF||y>SIZE-HALF||overlap(x,y,HALF,this.base,16))return false;
      if(terrain&&this.tiles(x,y,HALF).some(c=>'BSW'.includes(c.type)))return false;
      return ![this.player,...this.enemies].some(o=>o&&o!==t&&!o.dead&&overlap(x,y,HALF,o));
    }
    makeTank(x,y,type,team){return {id:++this.id,x,y,type,team,dir:team==='player'?0:2,hp:team==='player'?1:TYPES[type].hp,
      speed:team==='player'?90:TYPES[type].speed+(this.level*3),cool:0,inv:team==='player'?3:1,birth:.7,upgrade:1,
      goal:null,blocked:0,dead:false};}
    spawnPlayer(){
      for(const x of [144,272,112,304,80,336])if(this.canOccupy(x,400)){
        this.player=this.makeTank(x,400,'player','player');this.effect(x,400,'spawn');return true;
      }
      return false;
    }
    spawnEnemy(){
      const start=Math.floor(this.random()*3),xs=[16,208,400];
      for(let i=0;i<3;i++){
        const x=xs[(start+i)%3];
        if(!this.canOccupy(x,16)||this.bullets.some(b=>overlap(b.x,b.y,20,{x,y:16})))continue;
        const count=this.config.total-this.spawnLeft;
        const type=count%5===4?'armor':count%3===1?'fast':'normal';
        const t=this.makeTank(x,16,type,'enemy');t.cool=.9+this.random();this.enemies.push(t);
        this.spawnLeft--;this.effect(x,16,'spawn');return true;
      }
      return false;
    }
    move(t,dir,distance,assist=false){
      const d=DIRS[dir];t.dir=dir;
      // Slide toward a nearby 16px lane before moving, one axis at a time.
      // This corrects imperfect turns without teleporting through a corner.
      if(assist){
        const axis=d.x?'y':'x',target=Math.round((t[axis]-16)/32)*32+16,delta=target-t[axis];
        if(Math.abs(delta)>.01&&Math.abs(delta)<=16){
          const value=t[axis]+Math.sign(delta)*Math.min(distance,Math.abs(delta));
          const nx=axis==='x'?value:t.x,ny=axis==='y'?value:t.y;
          if(this.canOccupy(nx,ny,t)){t[axis]=value;return true;}
        }
      }
      const x=t.x+d.x*distance,y=t.y+d.y*distance;
      if(this.canOccupy(x,y,t)){t.x=x;t.y=y;return true;}return false;
    }
    shoot(t){
      if(t.dead||t.birth>0||t.cool>0)return false;
      const cap=t.team==='player'&&t.upgrade>=2?2:1;
      if(this.bullets.filter(b=>!b.dead&&b.owner===t.id).length>=cap)return false;
      const d=DIRS[t.dir],speed=t.team==='player'?(t.upgrade>=2?350:270):190+this.level*12;
      this.bullets.push({x:t.x+d.x*17,y:t.y+d.y*17,dx:d.x,dy:d.y,speed,owner:t.id,team:t.team,power:t.upgrade,dead:false});
      t.cool=t.team==='player'?.22:1.2+this.random()*.8;this.event('shoot',t.x,t.y);return true;
    }
    // Dijkstra across 32px lanes. Brick has a finite cost: AI shoots a route open.
    // Steel/water are impassable, and other tanks cause route replanning.
    route(t,target,avoidTanks=true){
      const sx=Math.max(0,Math.min(12,Math.round((t.x-16)/32))),sy=Math.max(0,Math.min(12,Math.round((t.y-16)/32)));
      const tx=Math.max(0,Math.min(12,Math.round((target.x-16)/32))),ty=Math.max(0,Math.min(12,Math.round((target.y-16)/32)));
      const start=sy*13+sx,end=ty*13+tx,dist=Array(169).fill(Infinity),prev=Array(169).fill(-1),closed=new Set();dist[start]=0;
      for(let iter=0;iter<169;iter++){
        let k=-1,best=Infinity;for(let j=0;j<169;j++)if(!closed.has(j)&&dist[j]<best){best=dist[j];k=j;}
        if(k<0)break;if(k===end)break;closed.add(k);
        const x=k%13,y=Math.floor(k/13);
        for(const d of DIRS){
          const nx=x+d.x,ny=y+d.y;if(nx<0||ny<0||nx>12||ny>12)continue;
          const px=nx*32+16,py=ny*32+16,cells=this.tiles(px,py,HALF);
          if(cells.some(c=>c.type==='S'||c.type==='W')||overlap(px,py,HALF,this.base,16))continue;
          if(avoidTanks&&[this.player,...this.enemies].some(o=>o&&o!==t&&!o.dead&&overlap(px,py,HALF,o))&&ny*13+nx!==end)continue;
          const n=ny*13+nx,cost=1+(cells.some(c=>c.type==='B')?4:0);
          if(dist[k]+cost<dist[n]){dist[n]=dist[k]+cost;prev[n]=k;}
        }
      }
      if(start===end)return null;if(prev[end]<0)return null;
      let n=end;while(prev[n]!==start&&prev[n]>=0)n=prev[n];
      return {x:(n%13)*32+16,y:Math.floor(n/13)*32+16};
    }
    enemyAI(t,dt){
      if(!t.goal){
        const cx=Math.round((t.x-16)/32)*32+16,cy=Math.round((t.y-16)/32)*32+16;
        const target=this.player&&t.id%3===0?this.player:{x:208,y:336};
        t.goal=Math.abs(t.x-cx)>.05||Math.abs(t.y-cy)>.05?{x:cx,y:cy}:
          this.route(t,target)||this.route(t,{x:208,y:336},false);
      }
      // Aim down the base lane, or directly at a player in the same lane.
      let aim=null;
      if(Math.abs(t.x-this.base.x)<8&&t.y<384)aim=2;
      if(this.player){const p=this.player;
        if(Math.abs(t.x-p.x)<10)aim=p.y>t.y?2:0;
        else if(Math.abs(t.y-p.y)<10)aim=p.x>t.x?1:3;
      }
      if(aim!==null){t.dir=aim;this.shoot(t);}
      const goal=t.goal;
      if(goal){
        const dx=goal.x-t.x,dy=goal.y-t.y;
        if(Math.abs(dx)<.05&&Math.abs(dy)<.05){t.goal=null;}
        else{
          const dir=Math.abs(dx)>.05?(dx>0?1:3):(dy>0?2:0);
          const moved=this.move(t,dir,Math.min(t.speed*dt,Math.abs(dir%2?dx:dy)));
          if(moved)t.blocked=0;else{t.blocked+=dt;this.shoot(t);}
          if(t.blocked>.65){t.goal=null;t.blocked=0;}
        }
      }else if(aim===null){t.dir=2;this.shoot(t);}
      // While advancing, opportunistic fire opens brick corridors.
      this.shoot(t);
    }
    kill(t,credited=true){
      if(t.dead)return;t.dead=true;this.effect(t.x,t.y);
      if(t.team==='player'){
        this.lives--;this.player=null;this.respawn=1.3;
        if(this.lives<=0)this.finish('lost','生命耗尽');
      }else{
        if(credited)this.score+=TYPES[t.type].points;
        this.kills++;
        if(this.kills%4===0){
          const type=['star','shield','bomb'][(this.kills/4-1)%3];
          this.pickups.push({x:t.x,y:t.y,type,ttl:22});this.say({star:'★ 火力升级出现',shield:'◇ 护盾出现',bomb:'✹ 爆破道具出现'}[type]);
        }
      }
    }
    hitTank(t,b){
      b.dead=true;
      if(t.inv>0||t.birth>0){this.effect(b.x,b.y,'spark');return;}
      t.hp--;this.effect(b.x,b.y,'spark');if(t.hp<=0)this.kill(t);else this.event('armor',t.x,t.y);
    }
    wallHit(b,cell){
      b.dead=true;this.effect(b.x,b.y,'spark');
      if(cell.type==='S'&&b.power<3)return;
      // A shell chips a 32px-wide, 16px-deep strip; a second shot clears the block.
      const row=cell.row,col=cell.col;
      const cells=b.dx?[{row:Math.floor(row/2)*2,col},{row:Math.floor(row/2)*2+1,col}]:
        [{row,col:Math.floor(col/2)*2},{row,col:Math.floor(col/2)*2+1}];
      for(const c of cells)if(this.map[c.row][c.col]===cell.type)this.map[c.row][c.col]='.';
    }
    bulletsStep(dt){
      const steps=Math.max(1,Math.ceil(Math.max(0,...this.bullets.map(b=>b.speed))*dt/2));
      for(let s=0;s<steps&&this.state==='playing';s++){
        for(const b of this.bullets){if(b.dead)continue;b.x+=b.dx*b.speed*dt/steps;b.y+=b.dy*b.speed*dt/steps;}
        for(let i=0;i<this.bullets.length;i++){
          const b=this.bullets[i];if(b.dead)continue;
          if(b.x<0||b.y<0||b.x>SIZE||b.y>SIZE){b.dead=true;continue;}
          for(let j=i+1;j<this.bullets.length;j++){
            const other=this.bullets[j];if(!other.dead&&b.team!==other.team&&Math.abs(b.x-other.x)<6&&Math.abs(b.y-other.y)<6){b.dead=other.dead=true;this.effect(b.x,b.y,'spark');break;}
          }
          if(b.dead)continue;
          const wall=this.tiles(b.x,b.y,3).find(c=>c.type==='B'||c.type==='S');
          if(wall){this.wallHit(b,wall);continue;}
          if(this.base.alive&&overlap(b.x,b.y,3,this.base,14)){
            b.dead=true;this.base.alive=false;this.effect(this.base.x,this.base.y);this.finish('lost','基地被摧毁');break;
          }
          const targets=b.team==='player'?this.enemies:[this.player];
          for(const t of targets)if(t&&!t.dead&&overlap(b.x,b.y,3,t)){this.hitTank(t,b);break;}
          if(this.state!=='playing')break;
        }
      }
      this.bullets=this.bullets.filter(b=>!b.dead);
    }
    say(text){this.notice=text;this.noticeTime=3;}
    collect(item){
      if(!this.player)return;item.ttl=0;this.score+=50;this.event('pickup',item.x,item.y);
      if(item.type==='star'){this.player.upgrade=Math.min(3,this.player.upgrade+1);this.say(this.player.upgrade===3?'★ 火力 3：可破钢墙':'★ 火力 2：双弹 / 高速炮弹');}
      if(item.type==='shield'){this.player.inv=Math.max(this.player.inv,10);this.say('◇ 护盾生效 · 10 秒');}
      if(item.type==='bomb'){for(const e of [...this.enemies])this.kill(e);this.say('✹ 当前敌军已清除');}
    }
    finish(state,reason){this.state=state;this.reason=reason;this.event(state,208,208);}
    step(dt=STEP,input={}){
      if(this.state!=='playing')return;
      this.time+=dt;this.noticeTime=Math.max(0,this.noticeTime-dt);
      for(const e of this.effects)e.ttl-=dt;this.effects=this.effects.filter(e=>e.ttl>0);
      for(const t of [this.player,...this.enemies])if(t){t.cool=Math.max(0,t.cool-dt);t.inv=Math.max(0,t.inv-dt);t.birth=Math.max(0,t.birth-dt);}
      if(!this.player){this.respawn-=dt;if(this.respawn<=0)this.spawnPlayer();}
      if(this.player&&this.player.birth<=0){
        if(Number.isInteger(input.dir))this.move(this.player,input.dir,this.player.speed*dt,true);
        if(input.fire)this.shoot(this.player);
      }
      this.spawnTimer-=dt;
      if(this.spawnLeft>0&&this.enemies.length<this.config.cap&&this.spawnTimer<=0){
        this.spawnTimer=this.spawnEnemy()?this.config.interval:.25;
      }
      for(const t of this.enemies)if(!t.dead&&t.birth<=0)this.enemyAI(t,dt);
      this.bulletsStep(dt);if(this.state!=='playing')return;
      this.enemies=this.enemies.filter(t=>!t.dead);
      for(const item of [...this.pickups]){
        item.ttl-=dt;if(item.ttl>0&&this.player&&overlap(item.x,item.y,10,this.player))this.collect(item);
      }
      this.pickups=this.pickups.filter(p=>p.ttl>0);
      this.enemies=this.enemies.filter(t=>!t.dead);
      if(this.remaining===0)this.finish(this.level===Maps.levels.length-1?'won':'clear','防线已守住');
    }
  }
  const api={Game,STEP,SIZE,TILE,DIRS,TYPES};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TankEngine=api;
})(typeof window!=='undefined'?window:globalThis);
