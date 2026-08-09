import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from './sand-sort-game.mjs';

test('progress normalization accepts only finite integer level indexes and clamps their range', () => {
  const cases = [
    [{ currentLevel: 12, unlockedLevel: 18 }, { currentLevel: 12, unlockedLevel: 18 }],
    [{ currentLevel: -4, unlockedLevel: 99 }, { currentLevel: 0, unlockedLevel: 29 }],
    [{ currentLevel: 3.5, unlockedLevel: Infinity }, { currentLevel: 0, unlockedLevel: 0 }],
    [{ currentLevel: '7', unlockedLevel: '8' }, { currentLevel: 0, unlockedLevel: 0 }],
  ];

  for (const [saved, expected] of cases) {
    const actual = game.normalizeProgress(saved);
    assert.equal(actual.currentLevel, expected.currentLevel);
    assert.equal(actual.unlockedLevel, expected.unlockedLevel);
  }
});

test('progress normalization reconciles an unlocked index behind the current level', () => {
  const actual = game.normalizeProgress({ currentLevel: 12, unlockedLevel: 3 });
  assert.equal(actual.currentLevel, 12);
  assert.equal(actual.unlockedLevel, 12);
});

test('progress normalization preserves zero coins and rejects unsafe coin values', () => {
  assert.equal(game.normalizeProgress({ coins: 0 }).coins, 0);
  for (const coins of [-1, 2.5, Infinity, Number.MAX_SAFE_INTEGER + 1, '300']) {
    assert.equal(game.normalizeProgress({ coins }).coins, 200);
  }
  assert.equal(game.normalizeProgress({ coins: 450 }).coins, 450);
});

test('progress normalization treats muted as a strict boolean setting', () => {
  assert.equal(game.normalizeProgress({ muted: true }).muted, true);
  assert.equal(game.normalizeProgress({ muted: false }).muted, false);
  assert.equal(game.normalizeProgress({ muted: 'false' }).muted, false);
  assert.equal(game.normalizeProgress({ muted: 1 }).muted, false);
});

test('keyboard navigation stays on existing bottles in a partial final row', () => {
  assert.equal(game.navigateKeyboardIndex(0, 'ArrowRight', 8, 5), 1);
  assert.equal(game.navigateKeyboardIndex(0, 'ArrowLeft', 8, 5), 0);
  assert.equal(game.navigateKeyboardIndex(1, 'ArrowDown', 8, 5), 6);
  assert.equal(game.navigateKeyboardIndex(4, 'ArrowDown', 8, 5), 4);
  assert.equal(game.navigateKeyboardIndex(6, 'ArrowUp', 8, 5), 1);
  assert.equal(game.navigateKeyboardIndex(2, 'Home', 8, 5), 0);
  assert.equal(game.navigateKeyboardIndex(2, 'End', 8, 5), 7);
  assert.equal(game.navigateKeyboardIndex(2, 'ArrowRight', 0, 5), 0);
});

test('input gating blocks animation and either open overlay', () => {
  const isBlocked = game.isGameInputBlocked;
  assert.equal(isBlocked?.({ locked: true, tutorialOpen: false, winOpen: false }), true);
  assert.equal(isBlocked?.({ locked: false, tutorialOpen: true, winOpen: false }), true);
  assert.equal(isBlocked?.({ locked: false, tutorialOpen: false, winOpen: true }), true);
  assert.equal(isBlocked?.({ locked: false, tutorialOpen: false, winOpen: false }), false);
});
