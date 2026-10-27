/* PHDSX browser shell. The unmodified upstream engine lives in engine/. */
'use strict';
(() => {
  const canvas = document.getElementById('canvas');
  const keys = {
    left: ['z', 'KeyZ', 90], right: ['/', 'Slash', 191], launch: [' ', 'Space', 32],
    nudgeLeft: ['x', 'KeyX', 88], nudgeRight: ['.', 'Period', 190], nudgeUp: ['ArrowUp', 'ArrowUp', 38],
    newGame: ['F2', 'F2', 113], sound: ['F5', 'F5', 116], music: ['F6', 'F6', 117]
  };
  let ready = false, paused = false, failed = false;
  const held = new Set();
  const tell = (type, detail = {}) => parent.postMessage({ source: 'phdsx-pinball', type, ...detail }, location.origin);
  function key(action, down) {
    if (!ready || !keys[action] || (paused && down)) return;
    if (down === held.has(action)) return;
    if (down) held.add(action); else held.delete(action);
    const [value, code, keyCode] = keys[action];
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key: value, code, keyCode, which: keyCode, bubbles: true, cancelable: true
    }));
  }
  function release() { for (const action of [...held]) key(action, false); }
  function tap(action) { key(action, true); key(action, false); }
  function audio() { window.Module?.SDL2?.audioContext?.resume().catch(() => {}); }
  function focus() { window.focus(); canvas.focus({ preventScroll: true }); audio(); }
  function pause(value) {
    if (!ready || paused === value) return;
    release(); paused = value;
    if (paused) { Module.pauseMainLoop(); Module.SDL2?.audioContext?.suspend().catch(() => {}); }
    else { Module.resumeMainLoop(); focus(); }
  }
  function fail() { if (!failed) { failed = true; tell('error'); } }
  window.Pinball = { key, release, tap, focus, pause, fail, get ready() { return ready; }, get paused() { return paused; } };
  window.Module = {
    canvas, locateFile: file => 'engine/' + file,
    preRun: [() => {
      // The upstream browser loop runs at 60 Hz. Match its native update/render
      // rates so it draws every callback instead of every second callback.
      FS.mkdirTree('/libsdl/SpaceCadetPinball');
      FS.writeFile('/libsdl/SpaceCadetPinball/imgui_pb.ini', '[Pinball][Settings]\nFrames Per Second=60\nUpdates Per Second=60\nMusic=0\n');
    }],
    print: text => console.info('[Pinball]', text), printErr: text => console.warn('[Pinball]', text),
    setStatus(text) {
      const match = text.match(/\((\d+)\/(\d+)\)/);
      if (match) tell('progress', { value: Math.round(Number(match[1]) / Number(match[2]) * 100) });
    },
    onAbort: fail,
    postRun: [() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        ready = true;
        // Start silently behind the explicit user gesture that unlocks browser audio.
        Module.SDL2?.audioContext?.suspend().catch(() => {});
        pause(true); tell('ready');
      }));
    }]
  };
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); });
  const aliases = { ArrowLeft: 'left', KeyA: 'left', KeyZ: 'left', ArrowRight: 'right', KeyD: 'right', Slash: 'right', Space: 'launch', ArrowDown: 'launch', KeyX: 'nudgeLeft', Period: 'nudgeRight', ArrowUp: 'nudgeUp' };
  // Intercept native keys before SDL so the shell owns pause/new-game state.
  for (const type of ['keydown', 'keyup']) window.addEventListener(type, event => {
    if (!event.isTrusted || event.ctrlKey || event.altKey || event.metaKey) return;
    const action = aliases[event.code];
    const command = { F2: 'newGame', F3: 'pause', KeyP: 'pause', F5: 'sound' }[event.code];
    if (!action && !command) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (command) { if (type === 'keydown' && !event.repeat) tell('command', { action: command }); }
    else key(action, type === 'keydown');
  }, true);
  window.addEventListener('blur', release);
  window.addEventListener('error', fail);
  window.addEventListener('unhandledrejection', fail);
})();
