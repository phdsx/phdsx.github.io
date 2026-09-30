const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { join } = require('node:path');

const source = readFileSync(join(__dirname, 'classic.js'), 'utf8');
const games = ['snake', 'plane', 'birds', 'match', 'stars', 'difference'];

for (const game of games) {
  const events = new Map();
  const frameQueue = [];
  let currentModel;
  let atlasDraws=0;
  function element(name) {
    return { name, hidden: false, textContent: '', innerHTML: '', dataset: {},
      addEventListener(type, callback) { events.set(`${name}:${type}`, callback); },
      setPointerCapture() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 640 }; } };
  }
  const nodes = new Map(['#classic-game', '#stage', '#stat-one', '#stat-two', '#overlay', '#overlay-title', '#overlay-subtitle', '#pause', '#pad', '#restart'].map(id => [id, element(id)]));
  const canvasContext = new Proxy({ createLinearGradient() { return { addColorStop() {} }; },drawImage(){atlasDraws++;} }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  nodes.get('#stage').getContext = () => canvasContext;
  const buttons = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'Space'].map(key => ({ ...element(`button-${key}`), dataset: { key } }));
  nodes.get('#pad').querySelectorAll = () => buttons;
  nodes.get('#pad').querySelector = selector => buttons.find(button => selector.includes(button.dataset.key));
  const window = { addEventListener(type, callback) { events.set(`window:${type}`, callback); },
    PHDSXClassic3D: game === 'match' ? { draw(_slug, model) { currentModel=model; } } : null };
  runInNewContext(source, {
    document: { body: { dataset: { game } }, querySelector: selector => nodes.get(selector) },
    window, requestAnimationFrame: callback => frameQueue.push(callback),
    Image:class {constructor(){this.complete=true;this.naturalWidth=1536;}set src(value){assert.equal(value,'../../classic/match-gems-atlas.png');}},
  }, { filename: 'classic.js' });
  assert.match(nodes.get('#classic-game').innerHTML, /classic-canvas-wrap/);
  assert.notEqual(nodes.get('#stat-one').textContent, '');
  events.get('window:keydown')({ key: 'ArrowLeft', preventDefault() {}, repeat: false });
  events.get('window:keyup')({ key: 'ArrowLeft' });
  for (let i = 0; i < 5; i++) frameQueue.shift()(16 * (i + 1));
  const pointerEvent = (x, y) => ({ clientX: x, clientY: y, pointerId: 1 });
  events.get('#stage:pointerdown')(pointerEvent(180, 490));
  events.get('#stage:pointermove')(pointerEvent(120, 530));
  events.get('#stage:pointerup')(pointerEvent(120, 530));
  if (game === 'match') {
    let now=80;
    const advance=()=>frameQueue.shift()(now+=16);
    const tap=(x,y)=>{const event=pointerEvent(212+(x+.5)*67,54+(y+.5)*67);events.get('#stage:pointerdown')(event);events.get('#stage:pointerup')(event)};
    const board=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x+y*2)%6));
    board[0][0]=1;board[0][1]=1;board[0][2]=2;board[1][2]=1;
    currentModel.board=board.map(row=>row.slice());
    tap(2,0);
    assert.equal(currentModel.selected.x,2,'first tap selects a gem');
    tap(2,1);
    assert.equal(currentModel.animation.type,'swap','valid move begins with a swap animation');
    assert.equal(currentModel.moves,19);
    tap(5,5);
    assert.equal(currentModel.selected,null,'input is locked during animation');
    for(let i=0;i<1000&&currentModel.animation;i++)advance();
    assert.equal(currentModel.animation,null,'cascade animation finishes');
    assert.ok(currentModel.score>=30,'matched gems award points');
    assert.ok(currentModel.board.every(row=>row.every(color=>color>=0)),'fall refills the board');

    currentModel.board=board.map(row=>row.slice());
    currentModel.score=0;currentModel.moves=20;
    tap(7,7);tap(6,7);
    assert.equal(currentModel.animation.type,'swap','invalid move also animates');
    for(let i=0;i<100&&currentModel.animation;i++)advance();
    assert.equal(currentModel.animation,null);
    assert.equal(currentModel.moves,20,'invalid move costs no turn');
    assert.equal(currentModel.score,0);
    assert.equal(JSON.stringify(currentModel.board),JSON.stringify(board),'invalid move returns to original board');
    window.PHDSXClassic3D=null;
    advance();
    assert.equal(atlasDraws,64,'Canvas fallback should draw the same 64 gemstone images');
  }
  if (game === 'difference') {
    let now=80;
    const advance=()=>frameQueue.shift()(now+=16);
    // Use visible edges well outside the former small circular hit targets.
    const targets=[[61,111],[390,350],[36,399],[402,490],[298,493]];
    for(const scale of [1,.35]){
      const stage=nodes.get('#stage');
      stage.clientLeft=stage.clientTop=1;
      stage.getBoundingClientRect=()=>({left:20,top:30,width:960*scale+2,height:640*scale+2});
      const tap=(x,y)=>{const event=pointerEvent(21+x*scale,31+y*scale);events.get('#stage:pointerdown')(event);events.get('#stage:pointerup')(event);advance()};
      for(const [x,y] of targets)for(const shift of [0,480]){
        events.get('#restart:click')();
        tap(x+shift,y);
        assert.equal(nodes.get('#stat-one').textContent,'找到 1 / 5','any visible part of a difference should count');
        assert.equal(nodes.get('#stat-two').textContent,'错点 0 / 8');
        tap(x+(480-shift),y);
        assert.equal(nodes.get('#stat-one').textContent,'找到 1 / 5','the matching object on the other side is the same difference');
        assert.equal(nodes.get('#stat-two').textContent,'错点 0 / 8','repeated correct taps do not cost attempts');
      }
      events.get('#restart:click')();
      targets.forEach(([x,y],i)=>tap(x+(i%2)*480,y));
      assert.equal(nodes.get('#overlay-title').textContent,'全部找到了！');
      assert.equal(nodes.get('#stat-two').textContent,'错点 0 / 8');
      events.get('#restart:click')();
      tap(224,396);
      assert.equal(nodes.get('#stat-two').textContent,'错点 1 / 8','the identical windows are not an extra difference');
      for(let i=0;i<7;i++)tap(450,100);
      assert.equal(nodes.get('#overlay-title').textContent,'机会用完了');
    }
    events.get('#restart:click')();
  }
  events.get('#pause:click')();
  assert.equal(nodes.get('#overlay').hidden, false);
  events.get('#pause:click')();
  assert.equal(nodes.get('#overlay').hidden, true);
  events.get('#restart:click')();
  assert.equal(nodes.get('#overlay').hidden, true);
  console.log(`${game}: mounted, drew, accepted input, paused and restarted`);
}
