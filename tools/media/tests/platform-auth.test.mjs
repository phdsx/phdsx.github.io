import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatformAuth } from '../service/platform-auth.mjs';

function fixture(options = {}) {
  let clock = 1000000; const contexts = [];
  const launch = async () => ({
    version() { return '156.0.0.0'; },
    async newContext() {
      const context = { jar: [], closed: false, authenticated: false, verification: false, async cookies() { return this.jar; }, async close() { this.closed = true; }, on() {}, async newPage() { return page; } };
      const locator = selector => ({ first() { return this; }, filter() { return this; }, async isVisible() { return selector.includes('captcha') ? context.verification : selector.includes('/user/profile/') ? context.authenticated : true; }, async waitFor() {}, async screenshot() { return Buffer.from('synthetic-test-qr'); }, async click() {} });
      const page = { setDefaultTimeout() {}, async goto() {}, async reload() {}, locator, getByText: locator, async evaluate() { return context.authenticated; } };
      contexts.push(context); return context;
    }, async close() {}
  });
  const auth = createPlatformAuth({ launch, now: () => clock, ...options });
  const confirm = (index, platform, value) => { const c = contexts[index]; c.authenticated = true; c.jar = platform === 'douyin' ? [{ name: 'sessionid', value, domain: '.douyin.com', expires: -1 }, { name: 'LOGIN_STATUS', value: '1', domain: 'www.douyin.com', expires: -1 }] : [{ name: 'web_session', value, domain: '.xiaohongshu.com', expires: -1 }]; };
  return { auth, contexts, confirm, advance(ms) { clock += ms; } };
}

test('Official QR login keeps owners and platforms isolated; only matching server-side cookies are available', async t => {
  const f = fixture(); t.after(() => f.auth.close());
  const dy = await f.auth.action('ownerA', 'douyin', 'qrcode');
  const xhs = await f.auth.action('ownerA', 'xiaohongshu', 'qrcode');
  assert.match(dy.image, /^data:image\/png;base64,/); assert.equal(xhs.platform, 'xiaohongshu');
  f.confirm(0, 'douyin', 'dy-secret'); f.confirm(1, 'xiaohongshu', 'xhs-secret');
  const logged = await f.auth.action('ownerA', 'douyin', 'poll');
  await f.auth.action('ownerA', 'xiaohongshu', 'poll');
  assert.equal(logged.loggedIn, true); assert.ok(!JSON.stringify(logged).includes('dy-secret'));
  f.contexts[0].jar.push({ name: 'foreign', value: 'never-forward', domain: '.xiaohongshu.com', expires: -1 });
  assert.match(await f.auth.cookieFor('ownerA', 'douyin'), /dy-secret/);
  assert.ok(!(await f.auth.cookieFor('ownerA', 'douyin')).includes('never-forward'));
  assert.equal(await f.auth.cookieFor('ownerB', 'douyin'), '');
  assert.equal((await f.auth.action('ownerB', 'douyin', 'status')).loggedIn, false);
  await f.auth.action('ownerA', 'douyin', 'logout');
  assert.equal(await f.auth.cookieFor('ownerA', 'douyin'), '');
  assert.match(await f.auth.cookieFor('ownerA', 'xiaohongshu'), /xhs-secret/);
  assert.equal(f.contexts[0].closed, true); assert.equal(f.contexts[1].closed, false);
});

test('Anonymous cookies never count as login, CAPTCHA is reported, QR expiry and cancel release contexts', async t => {
  const f = fixture(); t.after(() => f.auth.close());
  await f.auth.action('A', 'xiaohongshu', 'qrcode');
  f.contexts[0].jar = [{ name: 'web_session', value: 'anonymous', domain: '.xiaohongshu.com', expires: -1 }];
  assert.equal((await f.auth.action('A', 'xiaohongshu', 'poll')).loggedIn, false);
  assert.equal(await f.auth.cookieFor('A', 'xiaohongshu'), '');
  f.contexts[0].verification = true;
  assert.equal((await f.auth.action('A', 'xiaohongshu', 'poll')).state, 'verification_required');
  f.advance(180001); assert.equal((await f.auth.action('A', 'xiaohongshu', 'poll')).state, 'expired');
  assert.equal(f.contexts[0].closed, true);
  await f.auth.action('A', 'douyin', 'qrcode'); await f.auth.action('A', 'douyin', 'cancel');
  assert.equal(f.contexts[1].closed, true);
  await assert.rejects(f.auth.action('A', 'youtube', 'qrcode'), /不支持/);
});

test('Verified rolling sessions retain until expiry; upstream sign-out stops renewal', async t => {
  const f = fixture(); t.after(() => f.auth.close());
  await f.auth.action('A', 'douyin', 'qrcode'); f.confirm(0, 'douyin', 'session');
  await f.auth.action('A', 'douyin', 'poll'); f.advance(7 * 3600000);
  assert.equal((await f.auth.action('A', 'douyin', 'renew')).loggedIn, true);
  f.advance(2 * 3600000); assert.match(await f.auth.cookieFor('A', 'douyin'), /session/);
  f.contexts[0].authenticated = false; f.contexts[0].jar = [];
  assert.equal((await f.auth.action('A', 'douyin', 'renew')).loggedIn, false);
  assert.equal(f.contexts[0].closed, true);
  await f.auth.action('A', 'douyin', 'qrcode'); f.confirm(1, 'douyin', 'second-session');
  await f.auth.action('A', 'douyin', 'poll'); f.advance(8 * 3600000 + 1);
  assert.equal(await f.auth.cookieFor('A', 'douyin'), ''); assert.equal(f.contexts[1].closed, true);
});

test('Global limit reserves before launch and failed launches are recoverable', async t => {
  const f = fixture({ maxContexts: 1 }); t.after(() => f.auth.close());
  await f.auth.action('A', 'douyin', 'qrcode');
  await assert.rejects(f.auth.action('B', 'xiaohongshu', 'qrcode'), e => e.status === 429);
  await f.auth.action('A', 'douyin', 'cancel');
  await f.auth.action('B', 'xiaohongshu', 'qrcode');
  const broken = createPlatformAuth({ launch: async () => { throw Object.assign(new Error('missing dependency'), { status: 503 }); } });
  await assert.rejects(broken.action('A', 'douyin', 'qrcode'), /dependency/);
  await assert.rejects(broken.action('A', 'douyin', 'qrcode'), /dependency/);
});
