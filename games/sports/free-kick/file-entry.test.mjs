import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('local HTML loads a classic self-contained game script', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const bundle = await readFile(new URL('./game.bundle.js', import.meta.url), 'utf8');
  assert.match(html, /<script defer src="game\.bundle\.js"><\/script>/);
  assert.doesNotMatch(html, /<script[^>]+type="module"/);
  assert.match(bundle, /const THREE = \{/);
  assert.match(bundle, /function makeShot\(/);
  assert.match(bundle, /function buildWorld\(/);
  assert.doesNotMatch(bundle, /^\s*(?:import|export)\s/m);
});
