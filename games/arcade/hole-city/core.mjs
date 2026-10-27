// Gameplay uses world X/Z coordinates. All scores and timers live here.
export const WORLD = 216;
export const ROUND_SECONDS = 120;
export const LEVELS = [0,20,65,140,270,460,720,1050,1500];
export const TITLES = ['街角新手','公园食客','马路清道夫','汽车收割机','街区大胃王','楼房粉碎者','城市吞噬者','超级黑洞','万物终结者'];
export const KINDS = {
  person:{r:.48,points:2}, cone:{r:.48,points:1}, bin:{r:.65,points:3},
  tree:{r:1.35,points:7}, lamp:{r:.65,points:3}, bench:{r:1.5,points:6},
  car:{r:2.25,points:16}, house:{r:4.0,points:55}, building:{r:6.1,points:115}, tower:{r:8.2,points:190}
};
export function seededRandom(seed=1){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const radiusForScore = score => Math.min(20,Math.sqrt(6.25+Math.max(0,score)*.12));
export const levelForScore = score => LEVELS.reduce((level,threshold,i)=>score>=threshold?i:level,0);
export function canSwallow(hole,object){return hole.alive && !object.eaten && hole.radius >= object.r*1.18 && Math.hypot(hole.x-object.x,hole.z-object.z)<hole.radius-object.r*.28;}
export function createCity(seed=1){
  const random=seededRandom(seed), objects=[];
  const add=(kind,x,z,variant=random())=>objects.push({id:objects.length,kind,x,z,variant,...KINDS[kind],eaten:false});
  // Six by six walkable blocks; roads remain open as landmarks after swallowing.
  for(let ix=0;ix<6;ix++)for(let iz=0;iz<6;iz++){
    const x=-90+ix*36,z=-90+iz*36, park=(ix+iz)%4===0;
    if(park){for(let a=0;a<3;a++)for(let b=0;b<3;b++)add('tree',x-8+a*8+(random()-.5)*2,z-8+b*8+(random()-.5)*2);add('bench',x+6,z+12);}
    else{
      const kind=(ix+iz)%5===0?'tower':(ix+iz)%3===0?'building':'house';
      if(kind==='house'){for(const dx of [-6,6])for(const dz of [-6,6])add('house',x+dx,z+dz);}
      else add(kind,x,z);
      for(const dx of [-12,12]){add('tree',x+dx,z-10);add('bin',x+dx,z+8);}
    }
    for(let k=0;k<4;k++){
      add('person',x-13+random()*26,z-14);
      add('person',x+14,z-12+random()*24);
    }
    add('lamp',x-14,z-14);add('lamp',x+14,z+14);
    add('car',x-10+random()*20,z+17,random());add('car',x+17,z-10+random()*20,random());
    add('cone',x-12,z+14);add('bin',x+12,z-14);
  }
  // A generous starter trail, clear of buildings and within the first viewport.
  for(let i=0;i<22;i++)add(i%3===0?'tree':i%2===0?'bin':'cone',-15+(i%11)*3,-20-Math.floor(i/11)*5);
  return objects;
}
export class CityGame{
  constructor({seed=Date.now(),mode='race'}={}){
    this.random=seededRandom(seed);this.mode=mode;this.objects=createCity(seed);this.time=ROUND_SECONDS;this.elapsed=0;this.status='ready';this.events=[];
    this.holes=[this.makeHole(0,'你','#bdf479',0,-19)];
    if(mode==='race'){
      const names=['橘子汽水','莓莓黑洞','蓝色闪电','葡萄星球','奶油饼干'], colors=['#ffad60','#ef7c9f','#70cbf5','#b79afa','#f2d174'];
      [[-70,-70],[70,70],[-70,70],[70,-70],[0,70]].forEach(([x,z],i)=>this.holes.push(this.makeHole(i+1,names[i],colors[i],x,z)));
    }
  }
  makeHole(id,name,color,x,z){return{id,name,color,x,z,score:0,count:0,radius:2.5,alive:true,respawn:0,shield:3,vx:0,vz:0,target:null,think:0};}
  get player(){return this.holes[0];}
  get remaining(){return this.objects.reduce((n,o)=>n+!o.eaten,0);}
  rankings(){return [...this.holes].sort((a,b)=>b.score-a.score||a.id-b.id);}
  start(){this.status='playing';}
  pause(){if(this.status==='playing')this.status='paused';}
  resume(){if(this.status==='paused')this.status='playing';}
  drainEvents(){return this.events.splice(0);}
  feed(hole,points){const before=levelForScore(hole.score);hole.score+=points;hole.radius=radiusForScore(hole.score);if(levelForScore(hole.score)>before)this.events.push({type:'level',hole:hole.id,level:levelForScore(hole.score)});}
  update(dt,input={x:0,z:0}){
    if(this.status!=='playing')return;
    dt=Math.min(Math.max(dt,0),.05);this.elapsed+=dt;
    if(this.mode==='race'){this.time=Math.max(0,this.time-dt);if(this.time<=0){this.status='finished';this.events.push({type:'finish'});return;}}
    for(const h of this.holes){
      h.shield=Math.max(0,h.shield-dt);
      if(!h.alive){h.respawn-=dt;if(h.respawn<=0){h.alive=true;h.x=(this.random()-.5)*165;h.z=(this.random()-.5)*165;h.shield=4;h.target=null;this.events.push({type:'respawn',hole:h.id});}continue;}
      let move=input;
      if(h.id!==0){
        h.think-=dt;
        const threat=this.holes.find(b=>b!==h&&b.alive&&b.radius>h.radius*1.25&&Math.hypot(b.x-h.x,b.z-h.z)<b.radius+13);
        if(threat)move={x:h.x-threat.x,z:h.z-threat.z};
        else{
          if(h.think<=0||!h.target||h.target.eaten){
            let best=Infinity;h.target=null;
            for(const o of this.objects){if(o.eaten||o.r*1.18>h.radius)continue;const d=Math.hypot(o.x-h.x,o.z-h.z);const cost=d/Math.pow(o.points,.28);if(cost<best){best=cost;h.target=o;}}
            h.think=.4+this.random()*.4;
          }
          move=h.target?{x:h.target.x-h.x,z:h.target.z-h.z}:{x:0,z:0};
        }
      }
      const length=Math.hypot(move.x,move.z),speed=(12.6+Math.min(5,h.radius*.35))*(h.id? .87:1),power=Math.min(1,length);
      const easing=1-Math.exp(-dt*15);
      h.vx+=((length?move.x/length*speed*power:0)-h.vx)*easing;h.vz+=((length?move.z/length*speed*power:0)-h.vz)*easing;
      // Allow the rim to overhang the seawall, keeping corner items reachable at every size.
      const edge=WORLD/2-h.radius*.3;
      h.x=Math.max(-edge,Math.min(edge,h.x+h.vx*dt));h.z=Math.max(-edge,Math.min(edge,h.z+h.vz*dt));
      for(const o of this.objects)if(canSwallow(h,o)){o.eaten=true;h.count++;this.feed(h,o.points);this.events.push({type:'eat',hole:h.id,object:o.id,points:o.points});}
    }
    for(const big of this.holes)for(const small of this.holes){
      if(big===small||!big.alive||!small.alive||big.shield>0||small.shield>0||big.radius<small.radius*1.3)continue;
      if(Math.hypot(big.x-small.x,big.z-small.z)<big.radius-small.radius*.35){
        small.alive=false;small.respawn=3;small.vx=small.vz=0;
        const bonus=Math.max(25,Math.round(small.score*.28));this.feed(big,bonus);
        small.score=Math.floor(small.score*.8);small.radius=radiusForScore(small.score);small.target=null;
        this.events.push({type:'capture',hole:big.id,victim:small.id,points:bonus});
      }
    }
    if(this.remaining===0){this.status='finished';this.events.push({type:'finish'});}
  }
}
