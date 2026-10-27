// PHDSX replacement input adapter. Multiple keyboard and pointer sources can coexist.
(() => {
  const held = new Map();
  const mapping = {
    ArrowLeft: 'LEFT', KeyA: 'LEFT', ArrowRight: 'RIGHT', KeyD: 'RIGHT',
    ArrowDown: 'DOWN', KeyS: 'DOWN', ArrowUp: 'JUMP', KeyW: 'JUMP', Space: 'JUMP',
    KeyX: 'JUMP', KeyZ: 'RUN', ShiftLeft: 'RUN', ShiftRight: 'RUN'
  };
  window.input = {
    set(action, down, source) {
      if (!held.has(action)) held.set(action, new Set());
      if (down) held.get(action).add(source);
      else held.get(action).delete(source);
    },
    isDown(action) { return Boolean(held.get(action.toUpperCase())?.size); },
    reset() {
      held.clear();
      document.querySelectorAll('[data-control]').forEach(button => button.classList.remove('pressed'));
    }
  };
  for (const type of ['keydown', 'keyup']) document.addEventListener(type, event => {
    const action = mapping[event.code];
    if (!action) return;
    if (type === 'keyup') { input.set(action, false, event.code); return; }
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!window.MarioHost?.playing) return;
    event.preventDefault();
    input.set(action, true, event.code);
  });
  window.addEventListener('blur', () => input.reset());
})();
