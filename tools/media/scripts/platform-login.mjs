import { PLATFORM_NAMES } from './video-platforms.mjs';

export function initPlatformLogin({ api, platform, t, ready = Promise.resolve(), onStateChange, onSessionChange }) {
  const $ = suffix => document.getElementById(platform + '-' + suffix), name = PLATFORM_NAMES[platform];
  let generation = 0, timer, renewal, request, renewing, expiresAt = 0, loggedIn = false, busy = false, checking = false, polling = false;
  const panel = $('qr-panel');
  const text = (value, state) => { $('qr-status').textContent = value; panel.dataset.state = state; };
  function controls() { for (const id of ['login-button', 'refresh-button', 'logout-button']) $(id).disabled = busy || checking; }
  function stop() { generation++; clearTimeout(timer); timer = null; request?.abort(); request = null; expiresAt = 0; polling = false; }
  function scheduleRenewal(delay = 15 * 60000) { clearTimeout(renewal); if (loggedIn) renewal = setTimeout(keepAlive, delay); }
  function show(data) {
    if (data.unavailable) { $('login-status').textContent = data.message || t(`${name}会话暂时无法验证，请稍后重试。`, `${name} session verification is temporarily unavailable.`); if (loggedIn) scheduleRenewal(60000); return; }
    loggedIn = Boolean(data.loggedIn);
    $('login-button').hidden = loggedIn; $('logout-button').hidden = !loggedIn;
    $('login-status').textContent = loggedIn ? t(`${name} · 已扫码登录`, `${name} · QR signed in`) : t(`${name}扫码状态：未登录`, `${name} QR status: signed out`);
    onStateChange?.({ platform, ...data }); scheduleRenewal();
  }
  async function call(action, signal) {
    await ready;
    const response = await fetch(new URL(`auth/${platform}/${action}`, api), { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: signal || AbortSignal.timeout(65000) });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(t('扫码服务未连接，请启动本站下载服务。', 'QR service unavailable. Start the companion download service.'));
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || t('扫码请求失败，请重试。', 'QR request failed. Please retry.'));
    if (data.platform !== platform) throw new Error(t('登录平台不匹配，请重新扫码。', 'Login platform mismatch. Please retry.'));
    return data;
  }
  function keepAlive() {
    if (!loggedIn || checking || renewing) return;
    const ticket = generation;
    renewing = call('renew').then(data => { if (ticket === generation) show(data); }).catch(() => {
      if (ticket === generation && loggedIn) { $('login-status').textContent = t(`${name}会话已保留，暂时无法验证，稍后自动重试。`, `${name} session retained. Verification will retry shortly.`); scheduleRenewal(60000); }
    }).finally(() => { renewing = null; });
    return renewing;
  }
  async function poll(ticket) {
    if (ticket !== generation || document.hidden || panel.hidden || polling) return;
    if (Date.now() >= expiresAt) { text(t('二维码已过期，请刷新二维码。', 'QR code expired. Refresh to retry.'), 'expired'); return; }
    polling = true; request = new AbortController();
    try {
      const data = await call('poll', AbortSignal.any([request.signal, AbortSignal.timeout(18000)]));
      if (ticket !== generation) return;
      if (data.loggedIn) {
        stop(); panel.hidden = true; $('qr-image').removeAttribute('src'); show(data); onSessionChange?.(true); return;
      }
      if (data.state === 'expired' || data.state === 'verification_required') { text(data.message || t('二维码已过期，请重新扫码。', 'QR code expired. Please retry.'), data.state); return; }
      text(t(`请用${name} App 扫码，并在手机上确认登录。`, `Scan with the ${name} app and confirm on your phone.`), data.state);
      timer = setTimeout(() => poll(ticket), 3000);
    } catch (error) { if (ticket === generation) { text(error.message, 'error'); timer = setTimeout(() => poll(ticket), 5000); } }
    finally { if (ticket === generation) polling = false; }
  }
  async function generate() {
    if (busy || checking) return;
    stop(); const ticket = generation; checking = true; controls(); panel.hidden = false;
    $('qr-image').removeAttribute('src'); text(t('正在加载官方登录二维码…', 'Loading official login QR code…'), 'loading');
    request = new AbortController();
    try {
      const data = await call('qrcode', AbortSignal.any([request.signal, AbortSignal.timeout(65000)]));
      if (ticket !== generation) return;
      if (data.loggedIn) { panel.hidden = true; show(data); return; }
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.image || '') || !Number.isFinite(data.expiresAt)) throw new Error(t('二维码数据无效，请重试。', 'Invalid QR image. Please retry.'));
      $('qr-image').src = data.image; expiresAt = data.expiresAt;
      text(t(`请用${name} App 扫码，并在手机上确认登录。`, `Scan with the ${name} app and confirm on your phone.`), 'waiting');
      timer = setTimeout(() => poll(ticket), 3000);
    } catch (error) { if (ticket === generation) text(error.message, 'error'); }
    finally { if (ticket === generation) { checking = false; controls(); } }
  }
  $('login-button').addEventListener('click', generate); $('refresh-button').addEventListener('click', generate);
  $('cancel-button').addEventListener('click', async () => { stop(); checking = false; controls(); panel.hidden = true; $('qr-image').removeAttribute('src'); try { await call('cancel'); } catch {} });
  $('logout-button').addEventListener('click', async () => {
    if (busy || checking) return;
    stop(); checking = true; clearTimeout(renewal); controls();
    try { await renewing; await call('logout'); show({ loggedIn: false }); panel.hidden = true; $('qr-image').removeAttribute('src'); onSessionChange?.(false); }
    catch (error) { $('login-status').textContent = error.message; scheduleRenewal(60000); }
    finally { checking = false; controls(); }
  });
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); if (!document.hidden) { if (!panel.hidden && expiresAt && !checking) poll(generation); if (loggedIn) keepAlive(); } });
  window.addEventListener('pagehide', () => { stop(); clearTimeout(renewal); });
  window.addEventListener('pageshow', e => { if (e.persisted && loggedIn) keepAlive(); });
  return { show, setBusy(value) { busy = value; controls(); } };
}
