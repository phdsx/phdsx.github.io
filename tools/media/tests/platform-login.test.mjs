import test from 'node:test';
import assert from 'node:assert/strict';
import { initPlatformLogin } from '../scripts/platform-login.mjs';

test('Two QR controllers retain separate login states; renewal, cancel, and logout address only their own platform', async t => {
  const original = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  t.after(() => Object.assign(globalThis, original));
  const nodes = new Map(), timers = new Map(), calls = [], states = new Map(), events = new Map(); let serial = 0;
  const $ = id => { if (!nodes.has(id)) nodes.set(id, { hidden: false, dataset: {}, events: {}, addEventListener(name, callback) { this.events[name] = callback; }, removeAttribute(name) { delete this[name]; } }); return nodes.get(id); };
  globalThis.document = { hidden: false, getElementById: $, addEventListener() {} };
  globalThis.window = { addEventListener(name, callback) { if (!events.has(name)) events.set(name, []); events.get(name).push(callback); } };
  globalThis.setTimeout = (callback, delay) => { const id = ++serial; timers.set(id, { callback, delay }); return id; }; globalThis.clearTimeout = id => timers.delete(id);
  globalThis.fetch = async url => {
    const [platform, action] = new URL(url).pathname.split('/').slice(-2); calls.push({ platform, action });
    if (action === 'qrcode') return Response.json({ platform, image: 'data:image/png;base64,dGVzdA==', expiresAt: Date.now() + 180000 });
    if (action === 'poll' || action === 'renew') return Response.json({ platform, loggedIn: true, state: 'logged_in', user: { name: platform + ' account' } });
    return Response.json({ platform, loggedIn: false });
  };
  for (const platform of ['douyin', 'xiaohongshu']) initPlatformLogin({ api: 'https://tool.example/tools/media/video/api/', platform, t: zh => zh, onStateChange(data) { states.set(platform, data.loggedIn); } });
  const fire = async delay => { const entry = [...timers].find(([, timer]) => timer.delay === delay); assert.ok(entry); timers.delete(entry[0]); await entry[1].callback(); };
  await $('douyin-login-button').events.click(); assert.match($('douyin-qr-image').src, /base64/);
  await fire(3000); assert.equal(states.get('douyin'), true); assert.equal(states.has('xiaohongshu'), false);
  await $('xiaohongshu-login-button').events.click(); await fire(3000); assert.equal(states.get('xiaohongshu'), true);
  assert.equal($('douyin-logout-button').hidden, false); assert.equal($('xiaohongshu-logout-button').hidden, false);
  await fire(15 * 60000); assert.equal(calls.at(-1).action, 'renew');
  await $('douyin-logout-button').events.click(); assert.deepEqual(calls.at(-1), { platform: 'douyin', action: 'logout' });
  assert.equal(states.get('douyin'), false); assert.equal(states.get('xiaohongshu'), true);
  await $('douyin-login-button').events.click(); await $('douyin-cancel-button').events.click(); assert.equal($('douyin-qr-panel').hidden, true); assert.equal(states.get('xiaohongshu'), true);
  for (const callback of events.get('pagehide')) callback(); assert.equal(timers.size, 0);
});
