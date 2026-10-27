const assert=require('node:assert/strict');
const {LEVELS,createFlight,step,toggleGear,cycleFlaps,readSave,clamp}=require('./physics.js');

// This pilot only uses the same held controls and configuration actions as a player.
function pilot(s) {
  const approach=s.x>s.level.destination-3000;
  const altitude=approach?clamp((s.level.destination+400-s.x)*180/3400,-30,180):180;
  const targetV=s.touched?0:!s.airborne?80:approach?74:102;
  const targetVy=clamp((altitude-s.y)*.22-(approach?180/3400*(s.vx+s.level.wind):0),s.y<12?-2.8:-4.8,10);
  const pitch=s.touched?0:!s.airborne?(s.vx>62?8:0):Math.asin(clamp((targetVy-(s.vx-85)*.075-s.flaps*.5)/Math.max(10,s.vx*.74),-.4,.4))*180/Math.PI;
  const throttle=s.touched?0:clamp((.00054*s.vx*s.vx+(s.gear?1.1:0)+s.flaps*.7+pitch*.045+(targetV-s.vx)*.6)/12.6,0,1);
  if(s.airborne && s.y>20 && !approach && s.gear)toggleGear(s);
  if(approach && !s.gear)toggleGear(s);
  const flaps=approach?2:s.airborne?0:1;
  if(s.flaps!==flaps)cycleFlaps(s);
  return {more:s.throttle<throttle-.005,less:s.throttle>throttle+.005,up:s.pitch<pitch-.15,down:s.pitch>pitch+.15,brake:s.touched};
}
function fly(index,hz=120) {
  const s=createFlight(index);s.status='flying';
  for(let i=0;i<hz*200 && s.status==='flying';i++)step(s,pilot(s),1/hz);
  return s;
}
if(require.main===module) {
  for(let i=0;i<LEVELS.length;i++) {
    const s=fly(i);
    console.log(LEVELS[i].id,s.status,Math.round(s.x),s.y.toFixed(1),s.vx.toFixed(1),s.reason);
    assert.equal(s.status,'won',`route ${i+1} is reachable using player controls`);
    assert.ok(s.touchdown.sink<=5.5 && s.touchdown.speed<=92);
    assert.ok(s.score>0 && s.fuel>0);
  }
  const base=fly(0),repeat=fly(0),low=fly(0,60);
  assert.equal(base.x,repeat.x,'same controls produce identical results');
  assert.ok(Math.abs(base.x-low.x)<30,'60/120 Hz control convergence');
  const idle=createFlight();step(idle,{more:true},1/120);assert.equal(idle.time,0);
  idle.status='flying';step(idle,{more:true},1/120);assert.ok(idle.throttle>0);
  idle.status='paused';const frozen=idle.x;step(idle,{more:true},1/120);assert.equal(idle.x,frozen);
  idle.status='flying';assert.equal(toggleGear(idle),false,'ground gear lock');
  Object.assign(idle,{ground:false,y:2,gear:false});
  assert.equal(toggleGear(idle),true,'emergency gear deployment is allowed near the ground');
  assert.equal(toggleGear(idle),false,'low altitude retraction remains protected');
  const states=[{gear:false,x:3800,reason:'机腹触地'},{vy:-10,x:3800,reason:'下降过快'},{vx:110,x:3800,reason:'接地速度过快'},{x:2500,reason:'跑道外'},{x:3800,pitch:-15,reason:'接地姿态'}];
  for(const test of states) {
    const s=createFlight();Object.assign(s,{status:'flying',ground:false,airborne:true,y:.001,vx:75,vy:-2,pitch:2},test);
    step(s,{},1/120);assert.equal(s.status,'crashed');assert.ok(s.reason.includes(test.reason),s.reason);
  }
  const stall=createFlight();Object.assign(stall,{status:'flying',ground:false,y:100,vx:35});step(stall,{},1/120);assert.equal(stall.stall,true);assert.ok(stall.vy<0);
  assert.deepEqual(readSave('{broken'),{version:1,records:{}});
  assert.deepEqual(readSave('{"version":1,"records":{"training":{"score":999999,"stars":3},"dusk":{"score":99,"stars":8}}}'),{version:1,records:{training:{score:1200,stars:3}}});
  console.log('PASS: all 3 complete flights, deterministic controls, pause, gear safety, 5 failure cases, stall and save validation.');
}
module.exports={pilot};
