(() => {
  'use strict';
  const frame = document.getElementById('game-frame');
  const page = document.getElementById('game-page');
  const overlay = document.getElementById('load-overlay');
  const title = document.getElementById('load-title');
  const detail = document.getElementById('load-detail');
  const spinner = document.getElementById('loading-spinner');
  const retry = document.getElementById('retry');
  const fullscreen = document.getElementById('fullscreen');
  const status = document.getElementById('host-status');
  let generation = 0, timeout = 0, ready = false;

  function clearTimers() { clearTimeout(timeout); timeout = 0; }
  function fail(message) {
    clearTimers();
    ready = false;
    overlay.hidden = false;
    spinner.hidden = true;
    title.textContent = '游戏暂时没有载入';
    detail.textContent = message || '请重新加载游戏后再试。';
    retry.hidden = false;
  }
  function markReady() {
    if (ready) return;
    ready = true;
    clearTimers();
    overlay.hidden = true;
    frame.focus({ preventScroll: true });
  }
  async function load() {
    const attempt = ++generation;
    clearTimers();
    ready = false;
    overlay.hidden = false;
    spinner.hidden = false;
    retry.hidden = true;
    title.textContent = '正在准备球场…';
    detail.textContent = '正在载入游戏，请稍候。';
    status.textContent = '';
    const url = new URL(frame.dataset.src, location.href);
    if (attempt > 1) url.searchParams.set('retry', String(attempt));
    timeout = window.setTimeout(() => fail('载入时间较长，请检查连接后重新加载。'), 60000);
    try {
      if (location.protocol !== 'file:') {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (attempt !== generation) return;
        if (!response.ok) throw new Error('missing-game');
      }
      if (attempt === generation) frame.src = url.href;
    } catch {
      if (attempt === generation) fail('无法读取游戏文件，请重新加载后再试。');
    }
  }

  frame.addEventListener('load', () => {
    if (!frame.src || ready) return;
    detail.textContent = '正在准备比赛画面，请稍候。';
  });
  frame.addEventListener('error', () => fail());
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow) return;
    if (event.origin !== location.origin) return;
    const type = typeof event.data === 'string' ? event.data : event.data?.type;
    if (type === 'phdsx-penalty-ready') markReady();
    else if (type === 'phdsx-penalty-error') fail('游戏启动失败，请重新加载后再试。');
  });
  retry.addEventListener('click', load);
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (page.requestFullscreen) await page.requestFullscreen();
      else { status.textContent = '当前浏览器不支持全屏，可横屏进行游戏。'; return; }
      status.textContent = '';
      frame.focus({ preventScroll: true });
    } catch { status.textContent = '未能进入全屏，请再次点击重试。'; }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = document.fullscreenElement === page;
    fullscreen.firstChild.textContent = active ? '退出全屏 ' : '全屏游戏 ';
    fullscreen.setAttribute('aria-label', active ? '退出全屏' : '全屏游戏');
  });
  load();
})();
