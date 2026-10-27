import test from 'node:test';
import assert from 'node:assert/strict';
import {CityGame,createCity,canSwallow,radiusForScore,WORLD,KINDS} from './core.mjs';

test('same seed creates the same city; every item has a unique ID and valid size',()=>{
  const city=createCity(42);assert.deepEqual(city,createCity(42));assert.ok(city.length>600);
  assert.equal(new Set(city.map(o=>o.id)).size,city.length);
  assert.ok(city.every(o=>o.points>0&&o.r>0&&Math.abs(o.x)<WORLD/2&&Math.abs(o.z)<WORLD/2));
});
test('swallowing respects size, distance, and one-time scoring',()=>{
  const h={x:0,z:0,radius:2.5,alive:true};
  assert.equal(canSwallow(h,{x:0,z:0,...KINDS.tower}),false);
  assert.equal(canSwallow(h,{x:20,z:0,...KINDS.person}),false);
  assert.equal(canSwallow(h,{x:0,z:0,...KINDS.tree}),true);
  const g=new CityGame({mode:'free',seed:1});g.objects=[{id:0,x:0,z:-19,...KINDS.tree,eaten:false}];g.start();g.update(.02);const score=g.player.score;
  assert.equal(score,7);g.update(.02);assert.equal(g.player.score,score);assert.equal(g.player.count,1);
});
test('paused and ready games do not move or consume time; timer finishes at zero',()=>{
  const g=new CityGame({seed:42});const x=g.player.x;g.update(.05,{x:1,z:0});assert.equal(g.player.x,x);
  g.start();g.pause();const time=g.time;g.update(.05,{x:1,z:0});assert.equal(g.time,time);assert.equal(g.player.x,x);
  g.resume();g.time=.02;g.update(.05);assert.equal(g.status,'finished');assert.equal(g.time,0);
});
test('movement is frame-time bounded and cannot leave the island',()=>{
  const g=new CityGame({mode:'free',seed:1});g.start();const x=g.player.x;g.update(100,{x:1,z:0});assert.ok(g.player.x-x<1);
  for(let i=0;i<700;i++)g.update(.05,{x:1,z:1});assert.ok(g.player.x<=WORLD/2-g.player.radius*.3);assert.ok(g.player.z<=WORLD/2-g.player.radius*.3);
});
test('larger holes capture rivals, then rivals respawn with temporary protection',()=>{
  const g=new CityGame({seed:42});g.start();g.objects=[]; // Keep a distant item to prevent early completion.
  g.objects.push({id:0,x:100,z:100,...KINDS.tower,eaten:false});
  const big=g.player,small=g.holes[1];big.score=500;big.radius=radiusForScore(500);small.x=big.x;small.z=big.z;small.score=100;small.radius=radiusForScore(100);big.shield=small.shield=0;
  g.update(.01);assert.equal(small.alive,false);assert.equal(small.score,80);assert.ok(big.score>=528);
  for(let i=0;i<61;i++)g.update(.05);assert.equal(small.alive,true);assert.ok(small.shield>0);assert.ok(Number.isFinite(small.x));
});
test('free mode has no countdown and a complete city is reachable from initial size',()=>{
  const g=new CityGame({mode:'free',seed:7});g.start();g.update(.05);assert.equal(g.time,120);assert.equal(g.holes.length,1);
  // Simulate a player targeting the nearest edible item, using the real movement loop.
  for(let tick=0;tick<24000&&g.status==='playing';tick++){
    const p=g.player;let best=null,distance=Infinity;
    for(const o of g.objects){if(o.eaten||o.r*1.18>p.radius)continue;const d=Math.hypot(o.x-p.x,o.z-p.z);if(d<distance){distance=d;best=o;}}
    assert.ok(best,'there is always food small enough to continue growing');
    const dx=best.x-p.x,dz=best.z-p.z,len=Math.hypot(dx,dz)||1;g.update(.05,{x:dx/len,z:dz/len});g.drainEvents();
  }
  assert.equal(g.status,'finished');assert.equal(g.remaining,0);assert.ok(g.player.radius>10);
});
