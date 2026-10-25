export function parseBilibiliInput(input) {
  const value = String(input ?? '').trim();
  if (!value || value.length > 4096) throw new Error('请粘贴 B 站视频链接、BV 号或 AV 号。');
  if (/^(BV[0-9a-z]{10}|av[1-9]\d*)$/i.test(value)) {
    return { id: /^bv/i.test(value) ? 'BV' + value.slice(2) : value.toLowerCase(), page: 1 };
  }
  // Accept the complete share text, but never extract a BV ID from an unrelated URL.
  const match = value.match(/https?:\/\/[^\s<>"“”]+/i) || value.match(/(?:www\.|m\.)?bilibili\.com\/[^\s<>"“”]+|b23\.tv\/[^\s<>"“”]+/i);
  if (!match) throw new Error('暂只支持 bilibili.com 视频链接、b23.tv 短链接及 BV / AV 号。');
  let url;
  try { url = new URL((/^https?:/i.test(match[0]) ? '' : 'https://') + match[0].replace(/[。，！!）)]+$/, '')); }
  catch { throw new Error('视频地址格式不正确。'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('视频地址格式不正确。');
  if (['b23.tv', 'www.b23.tv'].includes(url.hostname) && /^\/[\w-]+\/?$/.test(url.pathname)) return { shortUrl: 'https://b23.tv' + url.pathname };
  if (!['bilibili.com', 'www.bilibili.com', 'm.bilibili.com'].includes(url.hostname)) throw new Error('暂只支持 B 站视频链接。');
  const id = url.pathname.match(/^\/video\/(BV[0-9a-z]{10}|av[1-9]\d*)\/?$/i)?.[1];
  if (!id) throw new Error('请使用 B 站普通投稿视频的 /video/BV… 地址，暂不支持番剧、直播或收藏夹。');
  const page = Number(url.searchParams.get('p') ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error('分 P 序号不正确。');
  return { id: /^bv/i.test(id) ? 'BV' + id.slice(2) : id.toLowerCase(), page };
}

export function validateMediaUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('视频流地址无效。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:bilivideo\.com|bilivideo\.cn)$/.test(url.hostname) ||
      !/^\/upgcxcode\/[\w/.-]+\.(?:m4s|mp4|flv)$/.test(url.pathname) || url.href.length > 8192) {
    throw new Error('只允许 B 站官方 CDN 的视频流地址。');
  }
  return url.href;
}
