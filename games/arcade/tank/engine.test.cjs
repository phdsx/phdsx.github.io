const assert=require('node:assert/strict');
const {Game,STEP,TYPES}=require('./engine.js');
const maps=require('./maps.js');
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS',name);}
function fresh(){const g=new Game(()=>.25);g.start();g.map=g.map.map(row=>row.map(()=>'.'));g.spawnLeft=0;g.spawnTimer=999;g.player.birth=0;g.player.inv=0;return g;}
function advance(g,seconds,input={}){for(let i=0;i<Math.round(seconds/STEP);i++)g.step(STEP,input);}
function shell(x,y,dir=2,team='enemy',power=1,speed=350){return {x,y,dx:[0,1,0,-1][dir],dy:[-1,0,1,0][dir],speed,team,owner:999,power,dead:false};}
function enemy(g,x,y,type='normal'){const t=g.makeTank(x,y,type,'enemy');t.birth=t.inv=0;t.cool=999;g.enemies.push(t);return t;}
test('three valid distinct maps, spawn/respawn space and routes to the base',()=>{
  assert.equal(maps.levels.length,3);assert.equal(new Set(maps.levels.map(l=>l.rows.join(''))).size,3);
  for(let i=0;i<3;i++){
    const g=new Game(()=>.25);g.level=i;g.load();
    assert.ok(g.player);assert.equal(g.map.length,26);assert.ok(g.map.every(r=>r.length===26));
    for(const x of [16,208,400]){const t=g.makeTank(x,16,'normal','enemy');assert.ok(g.route(t,{x:208,y:336}),'enemy spawn must have a route');}
  }
});
test('four directions, wall/boundary/tank blocking and assisted corridor turns',()=>{
  const g=fresh(),p=g.player;p.x=80;p.y=80;
  assert.ok(g.move(p,1,5));assert.equal(p.y,80);assert.equal(p.x,85);
  g.map[5][6]='B';p.x=81;p.y=80;assert.ok(g.move(p,2,1,true));assert.equal(p.x,80);assert.equal(p.y,80);
  p.x=82;p.y=80;assert.equal(g.move(p,1,1),false);
  p.x=14;p.y=80;assert.equal(g.move(p,3,1),false);
  p.x=144;p.y=208;enemy(g,176,208);assert.equal(g.move(p,1,5),false);
  g.map[5][6]='W';p.x=82;p.y=80;assert.equal(g.move(p,1,1),false);
  g.map[5][6]='G';assert.equal(g.move(p,1,1),true);
});
test('moving fire, cooldown, one shell / upgraded two shells, steel-breaking level 3',()=>{
  const g=fresh(),p=g.player;assert.ok(g.shoot(p));assert.equal(g.shoot(p),false);p.cool=0;assert.equal(g.shoot(p),false);
  g.collect({type:'star'});assert.equal(p.upgrade,2);assert.ok(g.shoot(p));p.cool=0;assert.equal(g.shoot(p),false);
  g.collect({type:'star'});assert.equal(p.upgrade,3);g.collect({type:'star'});assert.equal(p.upgrade,3);
  p.cool=0;g.bullets=[];g.spawnLeft=99;g.spawnTimer=999;const y=p.y;advance(g,.1,{dir:0,fire:true});assert.ok(p.y<y);assert.ok(g.bullets.length);
});
test('fast shells chip brick in two depths and do not tunnel through walls',()=>{
  const g=fresh();for(const r of [8,9])for(const c of [8,9])g.map[r][c]='B';
  g.bullets=[shell(144,50)];g.bulletsStep(.5);assert.equal(g.bullets.length,0);
  assert.deepEqual(g.map[8].slice(8,10),['.','.']);assert.deepEqual(g.map[9].slice(8,10),['B','B']);
  g.bullets=[shell(144,50)];g.bulletsStep(.5);assert.deepEqual(g.map[9].slice(8,10),['.','.']);
});
test('steel survives ordinary fire, upgraded shell removes it; water/grass pass shells',()=>{
  const g=fresh();g.map[8][8]='S';g.bullets=[shell(136,110)];g.bulletsStep(.1);assert.equal(g.map[8][8],'S');
  g.bullets=[shell(136,110,2,'player',3)];g.bulletsStep(.1);assert.equal(g.map[8][8],'.');
  g.map[8][8]='W';g.map[9][8]='G';g.bullets=[shell(136,110)];g.bulletsStep(.2);assert.equal(g.bullets.length,1);assert.ok(g.bullets[0].y>160);
});
test('opposing shells collide even at high relative speed',()=>{
  const g=fresh();g.bullets=[shell(100,100,1,'player'),shell(160,100,3,'enemy')];g.bulletsStep(.3);assert.equal(g.bullets.length,0);
});
test('armor health, type speeds and score differ; each bullet deals one hit',()=>{
  const g=fresh(),t=enemy(g,80,100,'armor');assert.ok(TYPES.fast.speed>TYPES.normal.speed);assert.ok(TYPES.armor.points>TYPES.normal.points);
  for(let i=0;i<3;i++){g.bullets=[shell(80,50,2,'player')];g.bulletsStep(.15);assert.equal(t.hp,2-i);}
  assert.ok(t.dead);assert.equal(g.score,400);
});
test('shield consumes enemy shots without damage and lasts simulated time',()=>{
  const g=fresh();g.collect({type:'shield'});g.spawnLeft=1;g.spawnTimer=999;
  g.bullets=[shell(g.player.x,350)];g.bulletsStep(.2);assert.equal(g.lives,3);assert.equal(g.bullets.length,0);
  advance(g,1);assert.ok(Math.abs(g.player.inv-9)<.01);
});
test('bomb kills only current wave, scores kills, and leaves pending enemies',()=>{
  const g=fresh();g.spawnLeft=8;enemy(g,80,80);enemy(g,144,80,'fast');g.collect({type:'bomb'});
  assert.ok(g.enemies.every(t=>t.dead));assert.equal(g.remaining,8);assert.equal(g.score,350);
});
test('occupied spawn points wait, alternate spawn and enforce on-screen cap',()=>{
  const g=fresh();g.spawnLeft=5;for(const x of [16,208,400])enemy(g,x,16);assert.equal(g.spawnEnemy(),false);assert.equal(g.spawnLeft,5);
  g.enemies.pop();assert.equal(g.spawnEnemy(),true);assert.equal(g.enemies.at(-1).x,400);
  enemy(g,80,80);g.spawnTimer=0;g.enemies.forEach(t=>t.birth=100);advance(g,.1);assert.equal(g.enemies.length,4);
});
test('death / safe respawn / protection / life exhaustion',()=>{
  const g=fresh();g.spawnLeft=1;g.spawnTimer=999;g.player.upgrade=3;g.kill(g.player);assert.equal(g.lives,2);assert.equal(g.player,null);
  advance(g,1.5);assert.ok(g.player);assert.equal(g.player.upgrade,1);assert.ok(g.player.inv>2);
  g.kill(g.player);advance(g,1.5);g.kill(g.player);assert.equal(g.lives,0);assert.equal(g.state,'lost');assert.equal(g.reason,'生命耗尽');
});
test('base hit (including own shell) ends immediately',()=>{
  for(const team of ['enemy','player']){const g=fresh();g.bullets=[shell(208,370,2,team)];g.bulletsStep(.1);assert.equal(g.state,'lost');assert.equal(g.base.alive,false);}
});
test('all waves cleared -> next distinct stage -> final victory; restart cleans everything',()=>{
  const g=fresh();for(let i=0;i<3;i++){
    g.spawnLeft=0;g.enemies=[];g.bullets=[];g.step();assert.equal(g.state,i===2?'won':'clear');
    if(i<2){g.next();assert.equal(g.level,i+1);assert.ok(g.player);}
  }
  g.score=123;g.pickups.push({});g.start();assert.equal(g.score,0);assert.equal(g.level,0);assert.equal(g.lives,3);
  assert.equal(g.enemies.length,0);assert.equal(g.bullets.length,0);assert.equal(g.time,0);assert.equal(g.pickups.length,1);
});
test('pause freezes all simulation and resume preserves elapsed time',()=>{
  const g=fresh();g.spawnLeft=1;g.spawnTimer=999;advance(g,.1);const time=g.time,x=g.player.x;g.pause();advance(g,3,{dir:1,fire:true});assert.equal(g.time,time);assert.equal(g.player.x,x);g.pause();advance(g,.1);assert.ok(g.time>time);
});
test('AI makes progress through all three layouts without terrain/tank overlap',()=>{
  for(let level=0;level<3;level++){
    const g=new Game(()=>.25);g.level=level;g.load();g.spawnLeft=3;g.spawnTimer=0;g.player.inv=999;
    let deepest=0,shots=0,bricks=g.map.flat().filter(c=>c==='B').length;
    for(let i=0;i<120*25;i++){
      if(g.state!=='playing'){g.state='playing';g.base.alive=true;}
      g.step();for(const t of g.enemies){deepest=Math.max(deepest,t.y);assert.ok(!g.tiles(t.x,t.y,14).some(c=>'BSW'.includes(c.type)),'tank crossed terrain');}
      const all=[g.player,...g.enemies].filter(Boolean);for(let a=0;a<all.length;a++)for(let b=a+1;b<all.length;b++)assert.ok(Math.abs(all[a].x-all[b].x)>=28-.01||Math.abs(all[a].y-all[b].y)>=28-.01,'tanks overlap');
      shots+=g.events.filter(e=>e.type==='shoot').length;g.events=[];
    }
    assert.ok(deepest>280,`level ${level+1} deepest=${deepest}`);assert.ok(shots>10);assert.ok(g.map.flat().filter(c=>c==='B').length<bricks);
  }
});
console.log(`${checks} rule groups passed.`);
