import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_BLUEPRINTS, createLevel, verifySolution } from './sand-sort-levels.mjs';
import { isSolved } from './sand-sort-rules.mjs';

test('catalog contains 30 progressively sized levels', () => {
  assert.equal(LEVEL_BLUEPRINTS.length, 30);
  assert.equal(LEVEL_BLUEPRINTS[0].colors, 2);
  assert.ok(LEVEL_BLUEPRINTS.at(-1).colors >= 8);
});

test('same level and variation always produce the same tubes', () => {
  assert.deepEqual(createLevel(12, 0), createLevel(12, 0));
  assert.notDeepEqual(createLevel(12, 0).tubes, createLevel(12, 1).tubes);
});

test('every level preserves four layers of each color and has a valid inverse solution', () => {
  for (let index = 0; index < LEVEL_BLUEPRINTS.length; index += 1) {
    const level = createLevel(index, 0);
    const counts = new Map();
    for (const color of level.tubes.flat()) counts.set(color, (counts.get(color) || 0) + 1);
    assert.ok([...counts.values()].every((count) => count === 4), `level ${index + 1} color count`);
    assert.equal(isSolved(level.tubes), false, `level ${index + 1} begins unsolved`);
    assert.equal(verifySolution(level), true, `level ${index + 1} solution`);
  }
});
