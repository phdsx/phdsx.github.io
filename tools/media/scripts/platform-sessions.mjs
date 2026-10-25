import { PLATFORM_NAMES } from './video-platforms.mjs';

export const PLATFORM_AUTH = Object.freeze({
  bilibili: Object.freeze({ qr: true, field: 'sessdata' }),
  douyin: Object.freeze({ qr: false, field: 'platform-cookie' }),
  xiaohongshu: Object.freeze({ qr: false, field: 'platform-cookie' }),
  youtube: Object.freeze({ qr: false, field: 'platform-cookie' })
});

// Page memory only. Each platform owns its own manual credential and QR state.
// There is deliberately no timer or browser-storage persistence here.
export function createPlatformSessions() {
  const records = new Map(Object.keys(PLATFORM_AUTH).map(platform => [platform, { credential: '', used: false, qrUser: null }]));
  const record = platform => {
    if (!Object.hasOwn(PLATFORM_AUTH, platform)) throw new Error('Unsupported login platform');
    return records.get(platform);
  };
  return {
    get(platform) { const value = record(platform); return { ...value, qrUser: value.qrUser ? { ...value.qrUser } : null }; },
    setCredential(platform, value) { const state = record(platform); const next = String(value ?? ''); if (state.credential !== next) state.used = false; state.credential = next; },
    markUsed(platform) { const state = record(platform); state.used = Boolean(state.credential); },
    setQrUser(platform, user) { if (!PLATFORM_AUTH[platform]?.qr) throw new Error(`${PLATFORM_NAMES[platform] || platform} QR login is not supported`); record(platform).qrUser = user ? { name: String(user.name), vip: Boolean(user.vip) } : null; },
    clearCredential(platform) { const state = record(platform); state.credential = ''; state.used = false; },
    clearAll() { for (const state of records.values()) { state.credential = ''; state.used = false; state.qrUser = null; } }
  };
}
