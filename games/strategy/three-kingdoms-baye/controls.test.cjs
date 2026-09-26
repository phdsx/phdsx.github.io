const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {keyAction}=require('./game.js');

test('WASD, uppercase and arrow keys send the same original movement commands',()=>{
  for(const [letter,arrow,direction] of [['w','ArrowUp','VK_UP'],['a','ArrowLeft','VK_LEFT'],['s','ArrowDown','VK_DOWN'],['d','ArrowRight','VK_RIGHT']]){
    for(const key of [letter,letter.toUpperCase(),arrow])assert.deepEqual(keyAction({key}),{key:direction,direction:true});
    assert.equal(keyAction({code:'Key'+letter.toUpperCase(),key:'中'}).key,direction);
  }
  assert.equal(keyAction({key:'f'}).key,'VK_SEARCH');
  assert.equal(keyAction({key:'F'}).key,'VK_SEARCH');
  assert.equal(keyAction({key:'s'}).key,'VK_DOWN');
});
test('browser shortcuts and IME composition are never captured as movement',()=>{
  for(const flag of ['ctrlKey','metaKey','altKey','isComposing'])assert.equal(keyAction({key:'s',[flag]:true}),null);
  assert.equal(keyAction({key:'Tab'}),null);
});
function harness(){
  const events={},windowEvents={},sent=[],buttons=[];
  function element(id){return {id,dataset:{},handlers:{},classes:new Set(),addEventListener(k,fn){this.handlers[k]=fn;},focus(){this.focused=true;}};}
  const ids={};for(const id of ['lcd','game-machine','runtime-status','loading-panel','focus-game','reload-game','fullscreen-game'])ids[id]=element(id);
  const names=['VK_UP','VK_DOWN','VK_LEFT','VK_RIGHT','VK_ENTER','VK_EXIT','VK_HELP','VK_SEARCH'];
  for(const name of names){const b=element(name);b.dataset.bayeKey=name;b.classList={add(c){b.classes.add(c);},remove(c){b.classes.delete(c);}};buttons.push(b);}
  ids['game-machine'].contains=b=>buttons.includes(b);
  const window={addEventListener(k,fn){windowEvents[k]=fn;},setTimeout(){},location:{reload(){}}};
  names.forEach((name,i)=>window[name]=i+10);
  const document={body:{dataset:{}},getElementById(id){return ids[id];},addEventListener(k,fn){events[k]=fn;},querySelectorAll(){return buttons;},querySelector(selector){return buttons.find(b=>selector.includes(b.dataset.bayeKey));}};
  vm.runInNewContext(fs.readFileSync(require.resolve('./game.js'),'utf8'),{window,document,localStorage:{setItem(){}},Module:{},sendKey:k=>sent.push(k),console});
  function event(key,target='canvas',extra={}){return {key,code:key.length===1?'Key'+key.toUpperCase():key,target:{closest(selector){if(target==='select')return selector.includes('select')?{}:null;if(target==='button')return selector.includes('button')?buttons[0]:null;return null;}},preventDefault(){this.prevented=true;},...extra};}
  return {events,windowEvents,window,ids,sent,buttons,event};
}
test('movement continues while a game button has focus; form controls retain their own keys',()=>{
  const h=harness(),s=h.event('s','button');h.events.keydown(s);
  assert.equal(s.prevented,true);assert.deepEqual(h.sent,[h.window.VK_DOWN]);
  assert.ok(h.buttons[1].classes.has('is-pressed'));
  h.events.keyup(s);assert.ok(!h.buttons[1].classes.has('is-pressed'));
  h.events.keydown(h.event('ArrowDown','select'));
  h.events.keydown(h.event('Enter','button'));
  assert.equal(h.sent.length,1);
  h.events.keydown(h.event('ArrowDown','canvas',{repeat:true}));
  assert.equal(h.sent.length,2);
  h.windowEvents.blur();assert.ok(h.buttons.every(b=>!b.classes.has('is-pressed')));
});
test('virtual direction buttons send one command and restore keyboard focus',()=>{
  const h=harness(),b=h.buttons[2];
  b.handlers.pointerdown({preventDefault(){}});
  b.handlers.click({preventDefault(){},detail:1});
  assert.deepEqual(h.sent,[h.window.VK_LEFT]);assert.equal(h.ids.lcd.focused,true);
  b.handlers.pointerup();assert.ok(!b.classes.has('is-pressed'));
});
