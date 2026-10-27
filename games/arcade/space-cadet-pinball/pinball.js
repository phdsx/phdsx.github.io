'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const frame = $('game-frame'), overlay = $('overlay'), start = $('start');
  let ready = false, started = false, paused = false, sound = true, appliedSound = true;
  const bridge = () => frame.contentWindow?.Pinball;
  const holds = new Map();
  const controls = [...document.querySelectorAll('[data-hold]')];
  function applySound() {
    if (ready && !bridge().paused && appliedSound !== sound) {
      bridge().tap('sound'); appliedSound = sound;
    }
  }
  function release() {
    bridge()?.release(); holds.clear();
    controls.forEach(button => button.classList.remove('is-held'));
  }
  function showOverlay(title, text, label) {
    $('overlay-title').textContent = title; $('load-status').textContent = text;
    start.textContent = label; start.hidden = false; overlay.hidden = false;
  }
  function setPaused(value) {
    if (!ready || !started) return;
    release(); paused = value; bridge().pause(value);
    $('pause').setAttribute('aria-pressed', String(paused));
    $('pause').innerHTML = paused ? '继续 <kbd>P</kbd>' : '暂停 <kbd>P</kbd>';
    $('game-status').textContent = paused ? '已暂停' : '游戏中 · 按住空格，松开发球';
    if (paused) showOverlay('休息一下', '球台已暂停，准备好后继续。', '继续游戏 →');
    else { overlay.hidden = true; applySound(); }
  }
  function newGame() {
    if (!ready) return;
    started = true; paused = false; release(); bridge().pause(false); bridge().focus(); bridge().tap('newGame');
    applySound();
    overlay.hidden = true; $('pause').innerHTML = '暂停 <kbd>P</kbd>';
    $('pause').setAttribute('aria-pressed', 'false');
    $('game-status').textContent = '游戏中 · 按住空格，松开发球';
  }
  function toggleSound() {
    if (!ready) return;
    sound = !sound;
    $('sound').textContent = sound ? '声音：开' : '声音：关';
    $('sound').setAttribute('aria-pressed', String(sound));
    applySound();
    if (started && !paused) bridge().focus();
  }
  const commands = { newGame, pause: () => setPaused(!paused), sound: toggleSound };
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.source !== 'phdsx-pinball') return;
    if (event.data.type === 'progress') $('load-progress').value = event.data.value;
    if (event.data.type === 'ready') {
      ready = true; $('load-progress').hidden = true;
      for (const button of [$('new-game'), $('pause'), $('sound'), ...controls]) button.disabled = false;
      showOverlay('太空军校生，报到！', '按住空格蓄力，松开发球。Z 和 / 控制左右挡板。', '开始游戏 →');
      $('game-status').textContent = '球台就绪 · 每局 3 颗球';
    }
    if (event.data.type === 'command') commands[event.data.action]?.();
    if (event.data.type === 'error') {
      ready = false; release(); $('load-progress').hidden = true; start.hidden = true;
      $('overlay-title').textContent = '球台加载失败';
      $('load-status').textContent = '请检查网络后重试，并使用支持 WebAssembly 的现代浏览器。';
      $('retry').hidden = false; overlay.hidden = false; $('game-status').textContent = '加载失败';
      for (const button of [$('new-game'), $('pause'), $('sound'), ...controls]) button.disabled = true;
    }
  });
  start.addEventListener('click', () => started ? setPaused(false) : newGame());
  $('new-game').addEventListener('click', newGame);
  $('pause').addEventListener('click', () => setPaused(!paused));
  $('sound').addEventListener('click', toggleSound);
  $('retry').addEventListener('click', () => location.reload());
  $('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await $('machine').requestFullscreen();
    } catch { $('game-status').textContent = '当前浏览器不支持全屏，可旋转设备横屏游玩'; }
  });
  document.addEventListener('fullscreenchange', () => {
    $('fullscreen').textContent = document.fullscreenElement ? '退出全屏 ⛶' : '全屏 ⛶';
    if (ready && started && !paused) bridge().focus();
  });
  for (const button of controls) {
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('pointerdown', event => {
      if (!ready || !started || paused) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      bridge().focus();
      holds.set(event.pointerId, button); button.classList.add('is-held');
      bridge().key(button.dataset.hold, true);
    });
    const up = event => {
      if (!holds.has(event.pointerId)) return;
      const target = holds.get(event.pointerId); holds.delete(event.pointerId);
      if (![...holds.values()].includes(target)) { target.classList.remove('is-held'); bridge()?.key(target.dataset.hold, false); }
    };
    button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('lostpointercapture', up);
    // Keyboard activation of the visible controls is also supported.
    button.addEventListener('keydown', event => { if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); if (ready && started && !paused) { button.classList.add('is-held'); bridge().key(button.dataset.hold, true); } } });
    button.addEventListener('keyup', event => { if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); button.classList.remove('is-held'); bridge()?.key(button.dataset.hold, false); } });
    button.addEventListener('blur', () => { button.classList.remove('is-held'); bridge()?.key(button.dataset.hold, false); });
  }
  const keys = { KeyZ: 'left', KeyA: 'left', ArrowLeft: 'left', Slash: 'right', KeyD: 'right', ArrowRight: 'right', Space: 'launch', ArrowDown: 'launch', KeyX: 'nudgeLeft', Period: 'nudgeRight', ArrowUp: 'nudgeUp' };
  for (const type of ['keydown', 'keyup']) window.addEventListener(type, event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input,textarea,select')) return;
    const command = { F2: 'newGame', F3: 'pause', KeyP: 'pause', F5: 'sound' }[event.code];
    if (command) { event.preventDefault(); if (type === 'keydown' && !event.repeat) commands[command](); return; }
    if (event.target.closest('button,a,summary')) return;
    if (!keys[event.code] || !ready || !started || paused) return;
    event.preventDefault(); bridge().key(keys[event.code], type === 'keydown');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  window.addEventListener('blur', () => { if (document.activeElement !== frame) release(); });
  frame.addEventListener('load', () => {
    // Keep loading errors actionable instead of leaving an endless spinner.
    setTimeout(() => { if (!ready) { $('load-status').textContent = '加载时间较长，请检查网络，或重新加载。'; $('retry').hidden = false; } }, 30000);
  });
})();
