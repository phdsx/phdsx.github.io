const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');

function boot() {
  const nodes = new Map();
  const events = {};
  let nextFrame;
  let saved;
  let rotation = 0;
  const rotationStack = [];
  const pAngles = [];
  const element = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent:'',innerHTML:'',hidden:false,addEventListener(type,cb){this[type]=cb;},setAttribute(){}});
    return nodes.get(id);
  };
  const context2d = new Proxy({save(){rotationStack.push(rotation);},restore(){rotation=rotationStack.pop();},rotate(angle){rotation+=angle;},fillText(text){if(text==='P')pAngles.push(rotation);}}, {get(target,key){return target[key] ?? (()=>{});},set(target,key,value){target[key]=value;return true;}});
  element('arena').getContext = () => context2d;
  const document = {getElementById:element,querySelectorAll:()=>[],addEventListener(type,cb){events[type]=cb;}};
  const window = {addEventListener(){}};
  const localStorage = {getItem:()=>saved,setItem:(_key,value)=>{saved=value;}};
  const sandbox = {document,window,localStorage,requestAnimationFrame:cb=>{nextFrame=cb;},setTimeout:()=>{},Math,console};
  const instrumented = source.replace('  configure(0);requestAnimationFrame(frame);', '  globalThis.__parkingDebug={levels,configure,blocked,inSpot,get car(){return car;},get spaces(){return spaces;},get obstacles(){return obstacles;}};configure(0);requestAnimationFrame(frame);');
  vm.runInNewContext(instrumented,sandbox);
  let clock = 0;
  return {nodes,events,pAngles,debug:sandbox.__parkingDebug,step(seconds){for(let i=0;i<seconds*60;i++){clock+=1000/60;nextFrame(clock);}},click(id){element(id).click?.();},key(code,type='keydown'){events[type]?.({code,preventDefault(){}});},get saved(){return saved;}};
}

assert.equal(boot().nodes.get('level-label').textContent, '01 / 15');
const layoutGame = boot();
const layouts = layoutGame.debug;
for (let i=0;i<layouts.levels.length;i++) {
  layouts.configure(i);
  assert.equal(layouts.blocked(),false,`level ${i+1} starts clear of obstacles`);
  const spot=layouts.levels[i].spot;
  const bay=layouts.spaces.find(space=>space.x===spot.x&&space.y===spot.y);
  assert.ok(bay,`level ${i+1} target aligns with a painted parking bay`);
  assert.ok((spot.a===0?spot.w:spot.h)<=bay.w && (spot.a===0?spot.h:spot.w)<=bay.h,`level ${i+1} target fits within its painted bay`);
  assert.equal(layoutGame.pAngles.at(-1),0,`level ${i+1} parking mark stays upright`);
  for (const parked of layouts.obstacles.filter(item=>item.type==='car'&&item.y===spot.y)) {
    assert.ok(layouts.spaces.some(space=>space.x===parked.x&&space.y===parked.y),`level ${i+1} parked car aligns with a painted bay`);
  }
  Object.assign(layouts.car,layouts.levels[i].spot);
  assert.equal(layouts.blocked(),false,`level ${i+1} target is clear of obstacles`);
  assert.equal(layouts.inSpot(),true,`level ${i+1} target accepts a parked car`);
}
let won = false;
for (let drive=1.3;drive<=2.1;drive+=.02) {
  const game = boot();
  game.click('overlay-action');
  game.key('ArrowDown');
  game.step(drive);
  game.key('ArrowDown','keyup');
  game.step(2);
  if (game.nodes.get('overlay-title').textContent.includes('停车成功')) {
    assert.equal(game.nodes.get('collisions').textContent, 0);
    assert.ok(JSON.parse(game.saved)['0'].stars >= 1);
    game.click('overlay-action');
    assert.equal(game.nodes.get('level-label').textContent, '02 / 15');
    won = true;
    break;
  }
}
assert.ok(won, 'first level can be finished by reversing into the bay');

const paused = boot();
paused.click('overlay-action');
paused.click('pause');
assert.equal(paused.nodes.get('overlay-title').textContent, '已暂停');
paused.click('overlay-action');
assert.equal(paused.nodes.get('overlay').hidden, true);
paused.click('restart');
assert.equal(paused.nodes.get('time').textContent, '0.0s');
const crash = boot();
crash.click('overlay-action');
crash.key('ArrowUp');
crash.step(3);
assert.ok(crash.nodes.get('collisions').textContent > 0, 'hitting the boundary records a collision');
const steering = boot();
steering.click('overlay-action');
steering.key('ArrowDown');
steering.key('ArrowLeft');
steering.step(.5);
assert.notEqual(steering.debug.car.a, steering.debug.levels[0].start.a, 'steering changes heading while reversing');
console.log('Parking challenge checks passed: 15 clear layouts, driving, collision, first win, progress, pause, restart.');
