import { createRenderer, hitTestBottle } from './sand-sort-renderer.mjs';
import {
  addExtraTube,
  commitPendingMove,
  createSession,
  getHint,
  restart,
  reshuffle,
  selectTube,
  undo,
} from './sand-sort-session.mjs';

const STORAGE_KEY = 'phdsx-sand-sort-v1';
const DEFAULT_PROGRESS = Object.freeze({
  currentLevel: 0,
  unlockedLevel: 0,
  coins: 200,
  muted: false,
});

function normalizeLevelIndex(value) {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(29, value));
}

export function normalizeProgress(value) {
  const saved = value && typeof value === 'object' ? value : {};
  const currentLevel = normalizeLevelIndex(saved.currentLevel);
  const unlockedLevel = Math.max(currentLevel, normalizeLevelIndex(saved.unlockedLevel));
  return {
    currentLevel,
    unlockedLevel,
    coins: Number.isSafeInteger(saved.coins) && saved.coins >= 0
      ? saved.coins
      : DEFAULT_PROGRESS.coins,
    muted: saved.muted === true,
  };
}

export function navigateKeyboardIndex(current, key, count, columns) {
  if (count <= 0) return 0;
  const safeCurrent = Math.max(0, Math.min(count - 1, current));
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowLeft') return Math.max(0, safeCurrent - 1);
  if (key === 'ArrowRight') return Math.min(count - 1, safeCurrent + 1);
  if (key === 'ArrowUp') return Math.max(0, safeCurrent - columns);
  if (key === 'ArrowDown') {
    const next = safeCurrent + columns;
    return next < count ? next : safeCurrent;
  }
  return safeCurrent;
}

export function isGameInputBlocked({ locked, tutorialOpen, winOpen }) {
  return locked === true || tutorialOpen === true || winOpen === true;
}

function loadProgress() {
  try {
    return normalizeProgress(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Persistence is optional; gameplay continues when storage is unavailable.
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function createTransparentFallback(width, height) {
  const fallback = document.createElement('canvas');
  fallback.width = width;
  fallback.height = height;
  return fallback;
}

async function loadImageSafely(src, fallbackWidth, fallbackHeight) {
  try {
    return { image: await loadImage(src), degraded: false };
  } catch {
    return {
      image: createTransparentFallback(fallbackWidth, fallbackHeight),
      degraded: true,
    };
  }
}

function setBusy(shell, canvas, busy) {
  shell.setAttribute('aria-busy', String(busy));
  canvas.toggleAttribute('data-input-locked', busy);
}

async function initializeGame() {
  const canvas = document.querySelector('#game-canvas');
  const status = document.querySelector('#game-status');
  const shell = document.querySelector('.game-shell');
  const levelNumber = document.querySelector('#level-number');
  const coinCount = document.querySelector('#coin-count');
  const soundButton = document.querySelector('#sound-button');
  const statusBar = document.querySelector('.status-bar');
  const tutorial = document.querySelector('#tutorial');
  const startButton = document.querySelector('[data-action="start"]');
  const winDialog = document.querySelector('#win-dialog');
  const nextButton = document.querySelector('[data-action="next"]');
  const toolDock = document.querySelector('.tool-dock');
  const backgroundRegions = [statusBar, canvas, status, toolDock];

  const progress = loadProgress();
  let session = createSession(progress.currentLevel, 0);
  let keyboardIndex = 0;
  let locked = false;
  let audioContext;
  let resizeFrame = 0;

  function updateSoundButton() {
    soundButton.setAttribute('aria-pressed', String(progress.muted));
    soundButton.setAttribute('aria-label', progress.muted ? '开启游戏声音' : '关闭游戏声音');
    soundButton.textContent = progress.muted ? '静音' : '声音';
  }

  updateSoundButton();

  function overlayIsOpen() {
    return !tutorial.hidden || !winDialog.hidden;
  }

  function inputIsBlocked() {
    return isGameInputBlocked({
      locked,
      tutorialOpen: !tutorial.hidden,
      winOpen: !winDialog.hidden,
    });
  }

  function updateOverlayGate() {
    const blockedByOverlay = overlayIsOpen();
    for (const region of backgroundRegions) {
      region.inert = blockedByOverlay;
      region.toggleAttribute('aria-hidden', blockedByOverlay);
    }
  }

  const [backgroundResult, bottleResult] = await Promise.all([
    loadImageSafely('./sand-sort-assets/background.png', 8, 8),
    loadImageSafely('./sand-sort-assets/bottle-glass.png', 8, 20),
  ]);
  const degradedAssets = backgroundResult.degraded || bottleResult.degraded;
  const renderer = createRenderer(canvas, {
    background: backgroundResult.image,
    bottle: bottleResult.image,
  });

  function playTone(frequency, duration) {
    if (progress.muted) return;
    try {
      const AudioConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioConstructor) return;
      audioContext ||= new AudioConstructor();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      // Sound is decorative and must never block input.
    }
  }

  function canvasLabel() {
    const selected = session.selected === null ? '尚未选择瓶子' : `已选择第 ${session.selected + 1} 个瓶子`;
    return `沙子分类游戏区域，共 ${session.tubes.length} 个瓶子，${selected}`;
  }

  function render() {
    renderer.resize(session.tubes.length);
    renderer.draw(session);
    status.textContent = degradedAssets ? `${session.message}。已启用简化素材` : session.message;
    levelNumber.textContent = String(session.levelIndex + 1);
    coinCount.textContent = String(progress.coins);
    canvas.setAttribute('aria-label', canvasLabel());
    shell.dataset.gameState = session.solved ? 'solved' : 'playing';
  }

  function announceKeyboardPosition() {
    const message = `键盘位置：第 ${keyboardIndex + 1} 个瓶子。按回车或空格选择`;
    status.textContent = message;
    canvas.setAttribute('aria-label', `${canvasLabel()}。${message}`);
  }

  async function completeLevel() {
    locked = true;
    setBusy(shell, canvas, true);
    playTone(660, 0.18);
    try {
      await renderer.celebrate(session);
    } catch {
      // The completion dialog is still shown if decorative animation fails.
    } finally {
      winDialog.hidden = false;
      locked = false;
      setBusy(shell, canvas, false);
      updateOverlayGate();
      nextButton.focus();
    }
  }

  async function chooseBottle(index) {
    if (inputIsBlocked() || index < 0 || index >= session.tubes.length) return;
    keyboardIndex = index;
    const previousSelected = session.selected;
    session = selectTube(session, index);
    render();

    if (!session.pendingMove) {
      if (previousSelected !== null && previousSelected !== index) {
        locked = true;
        setBusy(shell, canvas, true);
        try {
          await renderer.shake(session, index);
          playTone(150, 0.09);
        } catch {
          // Invalid-move feedback is optional; restore input immediately.
        } finally {
          locked = false;
          setBusy(shell, canvas, false);
          render();
        }
      }
      return;
    }

    locked = true;
    setBusy(shell, canvas, true);
    try {
      await renderer.animatePour(session, session.pendingMove);
    } catch {
      // Commit the legal move even when its animation cannot be drawn.
    } finally {
      session = commitPendingMove(session);
      playTone(430, 0.07);
      locked = false;
      setBusy(shell, canvas, false);
      render();
    }
    if (session.solved) await completeLevel();
  }

  canvas.addEventListener('pointerup', async (event) => {
    if (inputIsBlocked()) return;
    canvas.focus({ preventScroll: true });
    const rect = canvas.getBoundingClientRect();
    const index = hitTestBottle(
      renderer.getLayout(),
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
    if (index !== null) await chooseBottle(index);
  });

  canvas.addEventListener('keydown', async (event) => {
    if (inputIsBlocked()) return;
    const digitIndex = event.key === '0' ? 9 : Number.parseInt(event.key, 10) - 1;
    if (Number.isInteger(digitIndex) && digitIndex >= 0 && digitIndex < session.tubes.length) {
      event.preventDefault();
      await chooseBottle(digitIndex);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      await chooseBottle(keyboardIndex);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    keyboardIndex = navigateKeyboardIndex(
      keyboardIndex,
      event.key,
      session.tubes.length,
      renderer.getLayout().columns,
    );
    announceKeyboardPosition();
  });

  toolDock.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-tool]');
    if (!button || inputIsBlocked()) return;
    const tool = button.dataset.tool;
    locked = true;
    setBusy(shell, canvas, true);
    try {
      if (tool === 'undo') session = undo(session);
      if (tool === 'shuffle') session = reshuffle(session);
      if (tool === 'extra') session = addExtraTube(session);
      if (tool === 'restart') session = restart(session);
      if (tool === 'hint') {
        const hint = getHint(session);
        if (hint) {
          try {
            await renderer.flashHint(session, hint.from, hint.to);
          } catch {
            session = { ...session, message: '提示动画不可用，请继续尝试' };
          }
        } else {
          session = { ...session, message: '可以重排或增加空瓶' };
        }
      }
      if (tool === 'shuffle' || tool === 'restart') keyboardIndex = 0;
    } finally {
      locked = false;
      setBusy(shell, canvas, false);
      render();
      canvas.focus({ preventScroll: true });
    }
  });

  startButton.addEventListener('click', () => {
    tutorial.hidden = true;
    updateOverlayGate();
    canvas.focus({ preventScroll: true });
    announceKeyboardPosition();
  });

  nextButton.addEventListener('click', () => {
    const nextIndex = (session.levelIndex + 1) % 30;
    progress.currentLevel = nextIndex;
    progress.unlockedLevel = Math.max(progress.unlockedLevel, nextIndex);
    progress.coins += 50;
    saveProgress(progress);
    session = createSession(nextIndex, 0);
    keyboardIndex = 0;
    winDialog.hidden = true;
    updateOverlayGate();
    render();
    canvas.focus({ preventScroll: true });
  });

  soundButton.addEventListener('click', () => {
    progress.muted = !progress.muted;
    updateSoundButton();
    saveProgress(progress);
    if (!progress.muted) playTone(520, 0.06);
  });

  function scheduleResize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      renderer.resize(session.tubes.length);
      renderer.draw(session);
    });
  }

  window.addEventListener('resize', scheduleResize, { passive: true });
  render();
  startButton.disabled = false;
  updateOverlayGate();
  startButton.focus();
}

function showInitializationError() {
  const shell = document.querySelector('.game-shell');
  const status = document.querySelector('#game-status');
  if (shell) shell.dataset.gameState = 'error';
  if (status) status.textContent = '游戏暂时无法启动，请刷新页面重试';
}

if (typeof document !== 'undefined') {
  initializeGame().catch(showInitializationError);
}
