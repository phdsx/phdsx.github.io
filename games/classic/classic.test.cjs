const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { join } = require('node:path');

const source = readFileSync(join(__dirname, 'classic.js'), 'utf8');
const games = ['snake', 'plane', 'tank', 'birds', 'match', 'stars', 'difference'];

for (const game of games) {
  const events = new Map();
  const frameQueue = [];
  function element(name) {
    return { name, hidden: false, textContent: '', innerHTML: '', dataset: {},
      addEventListener(type, callback) { events.set(`${name}:${type}`, callback); },
      setPointerCapture() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 640 }; } };
  }
  const nodes = new Map(['#classic-game', '#stage', '#stat-one', '#stat-two', '#overlay', '#overlay-title', '#overlay-subtitle', '#pause', '#pad', '#restart'].map(id => [id, element(id)]));
  const canvasContext = new Proxy({ createLinearGradient() { return { addColorStop() {} }; } }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  nodes.get('#stage').getContext = () => canvasContext;
  const buttons = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'Space'].map(key => ({ ...element(`button-${key}`), dataset: { key } }));
  nodes.get('#pad').querySelectorAll = () => buttons;
  nodes.get('#pad').querySelector = selector => buttons.find(button => selector.includes(button.dataset.key));
  const window = { addEventListener(type, callback) { events.set(`window:${type}`, callback); } };
  runInNewContext(source, {
    document: { body: { dataset: { game } }, querySelector: selector => nodes.get(selector) },
    window, requestAnimationFrame: callback => frameQueue.push(callback),
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
  events.get('#pause:click')();
  assert.equal(nodes.get('#overlay').hidden, false);
  events.get('#pause:click')();
  assert.equal(nodes.get('#overlay').hidden, true);
  events.get('#restart:click')();
  assert.equal(nodes.get('#overlay').hidden, true);
  console.log(`${game}: mounted, drew, accepted input, paused and restarted`);
}
