const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('./work-countdown.html'), 'utf8');
const source = html.slice(html.indexOf('function updateCountdown() {'), html.indexOf('// 显示庆祝弹窗'));

function makeElement() {
  const classList = { add() {}, remove() {}, contains() { return true; } };
  return { textContent: '', style: {}, classList, parentElement: { classList }, setAttribute() {} };
}

function createClock(time) {
  let current = new Date(time).getTime();
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [current])); }
  }
  const context = {
    Date: FixedDate,
    currentStartTime: '22:00', currentEndTime: '06:00',
    activeWorkStart: null, hasShownCelebration: false, CIRCUMFERENCE: 2 * Math.PI * 45,
    hoursEl: makeElement(), minutesEl: makeElement(), secondsEl: makeElement(),
    currentTimeEl: makeElement(), currentDateEl: makeElement(),
    progressBar: makeElement(), progressText: makeElement(), progressRing: makeElement(),
    celebrationModal: makeElement(),
    formatTime: date => date.toTimeString().slice(0, 8), formatDate: date => date.toDateString(),
    celebrations: 0
  };
  context.showCelebration = () => { context.celebrations++; };
  vm.runInNewContext(source, context);
  return {
    tick(value) { current = new Date(value).getTime(); context.updateCountdown(); },
    setShift(start, end) { context.currentStartTime = start; context.currentEndTime = end; context.activeWorkStart = null; },
    get remaining() { return `${context.hoursEl.textContent}:${context.minutesEl.textContent}`; },
    get progress() { return context.progressText.textContent; },
    get celebrations() { return context.celebrations; }
  };
}

test('overnight shift counts down to this morning and tracks elapsed progress', () => {
  const clock = createClock('2026-09-25T02:00:00+08:00');
  clock.tick('2026-09-25T02:00:00+08:00');
  assert.equal(clock.remaining, '04:00');
  assert.equal(clock.progress, '50%');
});

test('day shift still counts toward this evening', () => {
  const clock = createClock('2026-09-25T10:00:00+08:00');
  clock.setShift('09:00', '18:30');
  clock.tick('2026-09-25T10:00:00+08:00');
  assert.equal(clock.remaining, '08:30');
  assert.equal(clock.progress, '11%');
});

test('overnight shift celebrates once after ending and resets at the next start', () => {
  const clock = createClock('2026-09-25T05:59:59+08:00');
  clock.tick('2026-09-25T05:59:59+08:00');
  clock.tick('2026-09-25T06:00:01+08:00');
  assert.equal(clock.progress, '100%');
  assert.equal(clock.celebrations, 1);
  clock.tick('2026-09-25T06:00:02+08:00');
  assert.equal(clock.celebrations, 1);
  clock.tick('2026-09-25T22:00:00+08:00');
  assert.equal(clock.progress, '0%');
  assert.equal(clock.remaining, '08:00');
});
