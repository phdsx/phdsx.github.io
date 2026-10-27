/* PHDSX adapter for Garrett Johnson's Mario.js (MIT, see upstream/LICENSE). */
(() => {
  const $ = id => document.getElementById(id);
  let ready = false, status = 'loading', lives = 3, best = 0, soundEnabled = true;
  let scheduled = [];
  const audio = [];
  try { best = Math.max(0, Math.min(9999, Number(localStorage.getItem('phdsx.mario.best')) || 0)); } catch {}
  $('best').textContent = String(best).padStart(2, '0');

  function remember() {
    if (player.coins <= best) return;
    best = player.coins;
    $('best').textContent = String(best).padStart(2, '0');
    try { localStorage.setItem('phdsx.mario.best', String(best)); } catch {}
  }
  function silence() { audio.forEach(track => track.pause()); }
  function theme() {
    if (!ready || status !== 'playing' || player.dying || player.flagging || player.exiting) return;
    (level.scrolling ? music.overworld : music.underground).play();
  }
  function show(title, message, action, kicker = 'WORLD 1 — 1') {
    $('overlay-title').textContent = title;
    $('overlay-message').textContent = message;
    $('overlay-kicker').textContent = kicker;
    $('start').textContent = action;
    $('overlay').hidden = false;
    $('start').focus({ preventScroll: true });
  }
  function controls() {
    $('pause').textContent = status === 'paused' ? '▶ 继续' : 'Ⅱ 暂停';
    $('pause').disabled = !['playing', 'paused'].includes(status);
    $('state').textContent = ({ loading: '正在载入', ready: '准备开始', playing: '冒险中', paused: '已暂停', won: '已通关', over: '挑战结束', error: '载入失败' })[status];
  }
  function start() {
    if (!ready) return;
    if (['over', 'won'].includes(status)) return restart();
    input.reset();
    status = 'playing';
    resetFrameClock();
    $('overlay').hidden = true;
    controls();
    theme();
    canvas.focus({ preventScroll: true });
  }
  function pause() {
    if (status === 'paused') return start();
    if (status !== 'playing') return;
    status = 'paused';
    input.reset();
    silence();
    controls();
    show('休息一下，再出发。', '进度停在这里，准备好后继续冒险。', '继续游戏', 'PAUSED');
  }
  function restart() {
    if (!ready) return;
    remember();
    input.reset();
    silence();
    audio.forEach(track => { track.currentTime = 0; });
    scheduled = [];
    lives = 3;
    fireballs = [];
    updateables = [];
    gameTime = 0;
    player = new Mario.Player([56, 192]);
    status = 'playing';
    Mario.oneone();
    resetFrameClock();
    render();
    $('overlay').hidden = true;
    controls();
    window.MarioHost.frame();
    canvas.focus({ preventScroll: true });
  }
  $('start').addEventListener('click', start);
  $('pause').addEventListener('click', pause);
  $('restart').addEventListener('click', restart);
  $('sound').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    audio.forEach(track => { track.muted = !soundEnabled; });
    $('sound').textContent = soundEnabled ? '♪ 声音开' : '♪ 声音关';
    $('sound').setAttribute('aria-pressed', String(soundEnabled));
    $('sound').setAttribute('aria-label', soundEnabled ? '关闭声音' : '开启声音');
    if (soundEnabled) theme();
    if (status === 'playing') canvas.focus({ preventScroll: true });
  });
  if (!document.fullscreenEnabled) $('fullscreen').hidden = true;
  $('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector('.game').requestFullscreen();
      if (status === 'playing') canvas.focus({ preventScroll: true });
    } catch { $('fullscreen').textContent = '全屏不可用'; }
  });
  document.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.code === 'KeyP' || event.code === 'Escape') { event.preventDefault(); pause(); }
    if (event.code === 'KeyR') { event.preventDefault(); restart(); }
  });
  window.addEventListener('blur', () => { if (status === 'playing') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && status === 'playing') pause(); });

  for (const button of document.querySelectorAll('[data-control]')) {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (status !== 'playing') return;
      button.setPointerCapture(event.pointerId);
      input.set(button.dataset.control, true, `pointer:${event.pointerId}`);
      button.classList.add('pressed');
    });
    const release = event => {
      input.set(button.dataset.control, false, `pointer:${event.pointerId}`);
      button.classList.remove('pressed');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', event => event.preventDefault());
  }

  window.MarioHost = {
    get playing() { return status === 'playing'; },
    get status() { return status; },
    audio(url) {
      const track = new Audio('upstream/' + url);
      track.preload = 'none';
      track.volume = .35;
      const play = track.play.bind(track);
      track.play = () => {
        if (status !== 'playing' || !soundEnabled) return Promise.resolve();
        return play().catch(() => {});
      };
      audio.push(track);
      return track;
    },
    ready() {
      ready = true;
      status = 'ready';
      music.overworld.loop = music.underground.loop = true;
      $('start').disabled = $('restart').disabled = false;
      $('start').textContent = '开始冒险 →';
      controls();
    },
    error() {
      if (status === 'error') return;
      status = 'error';
      silence();
      controls();
      show('素材未能载入', '请刷新页面重试，或检查网络连接。', '请刷新页面', 'LOADING ERROR');
      $('start').disabled = true;
    },
    after(seconds, callback) { scheduled.push({ at: gameTime + seconds, callback }); },
    frame() {
      if (!ready) return;
      $('coins').textContent = String(player.coins).padStart(2, '0');
      $('lives').textContent = String(lives);
      $('world').textContent = level.scrolling ? '1 — 1' : '地下';
      remember();
      const due = scheduled.filter(task => task.at <= gameTime);
      scheduled = scheduled.filter(task => task.at > gameTime);
      due.forEach(task => task.callback());
    },
    respawn() {
      remember();
      lives -= 1;
      scheduled = [];
      silence();
      $('lives').textContent = String(lives);
      if (lives === 0) {
        status = 'over';
        input.reset();
        controls();
        show('再来一次？', `这次收集了 ${player.coins} 枚金币。留意怪物，起跳时机很重要。`, '重新挑战 →', 'GAME OVER');
        return;
      }
      const coins = player.coins, loader = level.loader;
      player = new Mario.Player([0, 0]);
      player.coins = coins;
      fireballs = [];
      updateables = [];
      input.reset();
      loader();
    },
    win() {
      if (status !== 'playing') return;
      remember();
      status = 'won';
      input.reset();
      silence();
      scheduled = [];
      controls();
      show('城堡到了，通关！', `收集 ${player.coins} 枚金币，剩余 ${lives} 次机会。再跑一次，寻找藏起来的金币。`, '再玩一次 →', 'COURSE CLEAR');
    }
  };
})();
