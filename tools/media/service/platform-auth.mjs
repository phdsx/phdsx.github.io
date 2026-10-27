import { PLATFORM_NAMES } from '../scripts/video-platforms.mjs';

const providers = {
  douyin: { url: 'https://www.douyin.com/', domain: 'douyin.com', qr: '#animate_qrcode_container img, #login-panel-new [class*="qrcode"] img', login: '登录' },
  xiaohongshu: { url: 'https://www.xiaohongshu.com/explore', domain: 'xiaohongshu.com', qr: 'img.qrcode-img', login: '登录' }
};
const QR_TTL = 180000, SESSION_TTL = 8 * 3600000;
const failure = (message, status = 502) => Object.assign(new Error(message), { status });
const belongs = (domain, root) => domain.replace(/^\./, '') === root || domain.endsWith('.' + root);

async function launchBrowser() {
  try {
    const { chromium } = await import('playwright');
    return await chromium.launch({ headless: true, channel: 'chromium', chromiumSandbox: true, ...(process.env.VIDEO_LOGIN_BROWSER ? { executablePath: process.env.VIDEO_LOGIN_BROWSER } : {}) });
  } catch {
    throw failure('扫码浏览器未安装或无法启动。请运行 npm --prefix tools/media/service ci 和 tools/media/service/node_modules/.bin/playwright install chromium。', 503);
  }
}

// One fresh incognito context per browser owner AND platform. Never read a user
// browser profile or write storageState / login cookies to disk.
export function createPlatformAuth({ launch = launchBrowser, now = Date.now, maxContexts = 8 } = {}) {
  const records = new Map(), locks = new Set();
  let browserPromise;
  const keyFor = (owner, platform) => owner + ':' + platform;
  async function discard(key) {
    const record = records.get(key); records.delete(key);
    if (record) await record.context?.close().catch(() => {});
  }
  async function cleanup() {
    for (const [key, r] of records) if (r.expiresAt <= now() && !locks.has(key)) await discard(key);
  }
  async function cookies(record, platform) {
    const root = providers[platform].domain;
    return (await record.context.cookies()).filter(c => belongs(c.domain, root) && (c.expires <= 0 || c.expires * 1000 > now()));
  }
  async function signedIn(record, platform) {
    const jar = await cookies(record, platform);
    if (platform === 'douyin') {
      // Anonymous visits also have cookies; require the site's explicit login
      // marker together with an actual account session.
      const session = jar.some(c => ['sessionid', 'sessionid_ss'].includes(c.name) && c.value);
      const marker = jar.some(c => c.name === 'LOGIN_STATUS' && c.value === '1') || await record.page.evaluate(() => localStorage.getItem('HasUserLogin') === '1');
      return Boolean(session && marker);
    }
    return jar.some(c => c.name === 'web_session' && c.value) && await record.page.locator('#global a[href*="/user/profile/"]').filter({ hasText: /^我$/ }).isVisible();
  }
  async function inspect(record, platform) {
    if (await signedIn(record, platform)) {
      record.loggedIn = true; record.expiresAt = now() + SESSION_TTL;
      return { loggedIn: true, state: 'logged_in', user: { name: PLATFORM_NAMES[platform] + '账号' }, expiresAt: record.expiresAt };
    }
    record.loggedIn = false;
    const verify = await record.page.locator('#captcha-verify-image, #captcha_container, .verify-slider, .captcha-container').first().isVisible().catch(() => false);
    if (verify) return { loggedIn: false, state: 'verification_required', message: '平台要求额外安全验证，当前二维码不能完成登录。请使用自己的平台 Cookie，或稍后重新扫码。' };
    if (record.expiresAt <= now()) return { loggedIn: false, state: 'expired' };
    return { loggedIn: false, state: 'waiting', expiresAt: record.expiresAt };
  }
  async function action(owner, platform, operation) {
    if (!Object.hasOwn(providers, platform)) throw failure('该平台暂不支持扫码登录。', 400);
    const key = keyFor(owner, platform);
    if (locks.has(key)) throw failure('该平台登录请求正在处理，请稍后重试。', 409);
    locks.add(key);
    try {
      if (['logout', 'cancel'].includes(operation)) {
        if (operation === 'logout' || !records.get(key)?.loggedIn) await discard(key);
        return { platform, loggedIn: Boolean(records.get(key)?.loggedIn), state: operation === 'logout' ? 'signed_out' : 'canceled' };
      }
      await cleanup();
      let record = records.get(key);
      if (record && record.expiresAt <= now()) { await discard(key); record = null; }
      if (operation === 'qrcode') {
        if (record?.loggedIn) return { platform, ...await inspect(record, platform) };
        await discard(key);
        if (records.size >= maxContexts) throw failure('扫码登录任务较多，请稍后再试。', 429);
        // Reserve before awaiting launch, so simultaneous owners cannot exceed
        // the global context limit.
        record = { context: null, page: null, loggedIn: false, expiresAt: now() + QR_TTL };
        records.set(key, record);
        let phase = '启动浏览器';
        try {
          browserPromise ??= launch().then(browser => {
            browser.on?.('disconnected', () => { browserPromise = null; for (const value of records.values()) value.expiresAt = now(); });
            return browser;
          }).catch(e => { browserPromise = null; throw e; });
          const browser = await browserPromise;
          record.context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN', userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`, acceptDownloads: false, serviceWorkers: 'block' });
          record.page = await record.context.newPage();
          record.context.on('page', page => { if (page !== record.page) page.close().catch(() => {}); });
          record.page.setDefaultTimeout(12000);
          phase = '连接官方页面';
          await record.page.goto(providers[platform].url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          phase = '加载扫码面板';
          const qr = record.page.locator(providers[platform].qr).first();
          try { await qr.waitFor({ state: 'visible', timeout: 5000 }); } catch {
            phase = '显示登录窗口';
            const button = platform === 'xiaohongshu' ? record.page.locator('#login-btn') : record.page.getByText(providers[platform].login, { exact: true }).first();
            await button.click({ timeout: 8000 });
          }
          phase = '等待官方二维码';
          await qr.waitFor({ state: 'visible', timeout: 12000 });
          phase = '读取二维码';
          // Capture only the official QR element; do not fetch a client-supplied URL.
          const image = (await qr.screenshot({ type: 'png', timeout: 5000 })).toString('base64');
          record.expiresAt = now() + QR_TTL;
          return { platform, state: 'waiting', loggedIn: false, image: 'data:image/png;base64,' + image, expiresAt: record.expiresAt };
        } catch (e) {
          await discard(key);
          if (e.status) throw e;
          const reason = /ERR_CERT/.test(e.message) ? 'HTTPS 证书验证失败' : /ERR_(?:PROXY|TUNNEL)/.test(e.message) ? '代理连接失败' : /ERR_(?:NAME|CONNECTION|TIMED_OUT|NETWORK)/.test(e.message) ? '网络连接失败' : phase + (e.name === 'TimeoutError' ? '超时' : '失败');
          throw failure(PLATFORM_NAMES[platform] + '官方二维码暂不可用（' + reason + '）。可稍后重试或使用本平台 Cookie；平台访问验证仍然适用。');
        }
      }
      if (!record) return { platform, loggedIn: false, state: operation === 'poll' ? 'expired' : 'signed_out' };
      if (operation === 'renew') {
        await record.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        if (platform === 'xiaohongshu') {
          try { await record.page.locator('#global a[href*="/user/profile/"]').filter({ hasText: /^我$/ }).waitFor({ state: 'visible', timeout: 12000 }); }
          catch { if (!await record.page.locator('#login-btn').isVisible()) throw failure('小红书登录页暂未就绪，会话仍保留，请稍后重试。'); }
        }
      }
      const state = await inspect(record, platform);
      if (state.state === 'expired' || (!state.loggedIn && operation === 'renew')) await discard(key);
      return { platform, ...state };
    } catch (e) {
      if (e.status) throw e;
      throw failure(PLATFORM_NAMES[platform] + '登录状态暂时无法验证，会话仍保留，请稍后重试。');
    } finally { locks.delete(key); }
  }
  return {
    action, cleanup,
    async cookieFor(owner, platform) {
      const key = keyFor(owner, platform), record = records.get(key);
      if (!record?.loggedIn || !Object.hasOwn(providers, platform)) return '';
      if (record.expiresAt <= now()) { await discard(key); return ''; }
      return (await cookies(record, platform)).filter(c => /^[-\w]+$/.test(c.name) && !/[;\r\n\t\x00]/.test(c.value)).map(c => `${c.name}=${c.value}`).join('; ');
    },
    async close() { for (const key of [...records.keys()]) await discard(key); if (browserPromise) await (await browserPromise).close(); browserPromise = null; }
  };
}
