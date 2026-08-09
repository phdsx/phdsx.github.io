import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, hitTestBottle } from './sand-sort-renderer.mjs';

test('mobile layout fits ten bottles in two rows inside the scene', () => {
  const layout = computeLayout(390, 844, 10);
  assert.equal(layout.bottles.length, 10);
  assert.equal(layout.columns, 5);
  assert.ok(layout.bottles.every((box) => box.x >= 0 && box.x + box.width <= 390));
  assert.ok(layout.bottles.every((box) => box.width >= 44 && box.height >= 120));
});

test('desktop layout keeps the portrait board centered', () => {
  const layout = computeLayout(1440, 900, 8);
  assert.ok(layout.scene.width <= 560);
  assert.equal(Math.round(layout.scene.x * 2 + layout.scene.width), 1440);
});

test('hitTestBottle returns the visible bottle index only', () => {
  const layout = computeLayout(390, 844, 6);
  const first = layout.bottles[0];
  assert.equal(hitTestBottle(layout, first.x + first.width / 2, first.y + first.height / 2), 0);
  assert.equal(hitTestBottle(layout, -10, -10), null);
});
