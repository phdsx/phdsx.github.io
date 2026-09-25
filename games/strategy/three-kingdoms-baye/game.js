(() => {
  'use strict';

  const body = document.body;
  const canvas = document.getElementById('lcd');
  const machine = document.getElementById('game-machine');
  const status = document.getElementById('runtime-status');
  const loadingPanel = document.getElementById('loading-panel');
  const gameKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape', 'h', 'H', 's', 'S', 'f', 'F']);

  function setState(state, message) {
    body.dataset.bayeState = state;
    status.textContent = message;
    if (state === 'error') {
      loadingPanel.querySelector('strong').textContent = '游戏载入失败';
      loadingPanel.querySelector('small').textContent = message;
    } else if (state === 'loading') {
      loadingPanel.querySelector('strong').textContent = message;
    }
  }

  window.bayeLoadFailed = message => setState('error', message);
  window.bayeLoadStep = message => setState('loading', message);
  window.bayeFrameRendered = () => {
    if (body.dataset.bayeState !== 'ready') setState('ready', '引擎已就绪 · 自动存档开启');
  };

  try {
    localStorage.setItem('baye/libname', '三国霸业-词典原版');
    localStorage.setItem('baye/libpath', 'assets/dictionary-original.lib');
    localStorage.setItem('baye/resolution', '0');
  } catch (error) {
    setState('error', '浏览器禁止本地存储');
  }

  const originalStart = window.bayeStart;
  window.bayeStart = function () {
    if (typeof originalStart === 'function') originalStart();
    setState('ready', '引擎已就绪 · 自动存档开启');
    window.setTimeout(() => canvas.focus({ preventScroll: true }), 80);
  };

  window.bayeExit = function () {
    window.location.href = '../../../games.html';
  };

  window.onerror = function (message) {
    setState('error', String(message || '未知错误'));
    return false;
  };

  Module.noInitialRun = true;
  Module.postRun = function () {
    try {
      setState('loading', '正在读取词典原版…');
      lcdInit();
      setState('loading', '显示已初始化，正在载入词典…');
      bayeMain();
    } catch (error) {
      console.error(error);
      setState('error', error.message || '初始化失败');
    }
  };

  function shouldHandleKeyboard(event) {
    if (!gameKeys.has(event.key)) return false;
    return !event.target.closest('a, button, input, textarea, select, summary');
  }

  document.addEventListener('keydown', event => {
    if (!shouldHandleKeyboard(event)) return;
    event.preventDefault();
    onKeyDown(event);
  });

  document.querySelectorAll('[data-baye-key]').forEach(button => {
    const sendButtonKey = () => {
      const keyCode = window[button.dataset.bayeKey];
      if (typeof keyCode === 'number') sendKey(keyCode);
    };
    const release = () => button.classList.remove('is-pressed');
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.classList.add('is-pressed');
      sendButtonKey();
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('click', event => {
      event.preventDefault();
      if (event.detail === 0) sendButtonKey();
    });
  });

  document.getElementById('focus-game').addEventListener('click', () => canvas.focus({ preventScroll: true }));
  document.getElementById('reload-game').addEventListener('click', () => window.location.reload());
  document.getElementById('fullscreen-game').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await machine.requestFullscreen();
      canvas.focus({ preventScroll: true });
    } catch (error) {
      status.textContent = '当前浏览器不允许全屏';
    }
  });

  document.addEventListener('fullscreenchange', () => {
    document.getElementById('fullscreen-game').textContent = document.fullscreenElement ? '退出全屏' : '全屏游玩';
  });
})();
