import test from 'node:test';
import assert from 'node:assert/strict';
import {extractShareUrl, analyzeShareUrls, validateDouyinUrl} from '../scripts/share-account-core.mjs';
import {resolveShareChain, shareAccountResponse} from '../../../worker/share-account.mjs';
import {resolvePublicShareProfile} from '../../../worker/douyin-share-profile.mjs';

const short = 'https://v.douyin.com/TestCode/';
const video = 'https://www.douyin.com/video/7000000000000000000';
const sec = 'MS4wLjABAAAA_fake_test_account';
const middle = `https://www.iesdouyin.com/share/video/7000000000000000000/?u_code=example&did=${sec}&iid=install&share_sign=signature&mid=7000000000000000001`;
const api = 'https://example.test/tools/media/share-account/api/resolve';
const post = (input, options = {}) => new Request(api, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({input}), ...options});

test('extracts complete Chinese share text and preserves raw account / tracking query', () => {
  assert.equal(extractShareUrl(`1.28 测试文案 #主题 ${short} 复制此链接，打开抖音！`), short);
  assert.equal(extractShareUrl(`看这里（${middle}）。`), middle);
  assert.throws(() => extractShareUrl('没有链接'));
  assert.throws(() => extractShareUrl(`${short} ${video}`), /多条/);
  assert.throws(() => extractShareUrl('x'.repeat(8193)));
});

test('rejects unsupported schemes, forged hosts, credentials, custom ports and URL encodings', () => {
  for (const value of ['http://v.douyin.com/test', 'https://v.douyin.com.evil.test/test', 'https://v.douyin.com@evil.test/', 'https://evil.test/?url=https://v.douyin.com/test', 'https://v.douyin.com:8443/test', 'https://name:pass@v.douyin.com/test', 'file:///etc/passwd', 'https://127.0.0.1/', 'https://v%2edouyin.com.evil.test/']) assert.throws(() => validateDouyinUrl(value), value);
});

test('device identifiers and u_code are never promoted to account or profile', () => {
  const result = analyzeShareUrls([short, middle, video]);
  assert.equal(result.state, 'clues'); assert.equal(result.confirmed, false);
  assert.equal(result.candidates.length, 0);
  assert.deepEqual(result.videos, ['7000000000000000000']);
  assert.equal(result.fields.find(f => f.key === 'did').kind, 'device');
  assert.equal(result.fields.find(f => f.key === 'did').profile, null);
  assert.equal(result.fields.find(f => f.key === 'u_code').source, 2);
  assert.equal(result.fields.find(f => f.key === 'mid').kind, 'other');
});

test('profiles, generic user fields and author fields never prove the sharer', () => {
  const result = analyzeShareUrls([`https://www.douyin.com/user/${sec}?sec_uid=${sec}&author_id=1234567890&uid=1234567890`]);
  assert.equal(result.state, 'unavailable'); assert.equal(result.candidates.length, 0);
  assert.equal(result.fields.find(f => f.key === 'profile').kind, 'profile');
  assert.equal(result.fields.find(f => f.key === 'author_id').kind, 'author');
  assert.equal(result.fields.find(f => f.key === 'uid').kind, 'account');
});

test('explicit share fields remain unverified candidates, preserve duplicates and leading zeroes', () => {
  const result = analyzeShareUrls([`${video}?share_uid=0012345678&share_uid=9988776655&share_sec_uid=${sec}&share_user_id=%3Cscript%3E`]);
  assert.equal(result.state, 'candidate'); assert.equal(result.confirmed, false);
  assert.equal(result.candidates.length, 3); assert.equal(result.candidates[0].value, '0012345678');
  assert.equal(result.candidates[0].profile, null);
  assert.equal(result.candidates[2].profile, `https://www.douyin.com/user/${sec}`);
  assert.equal(result.fields.at(-1).value, '<script>');
});

test('short / video-only states and malformed profile escaping are handled', () => {
  assert.equal(analyzeShareUrls([short]).state, 'short');
  assert.equal(analyzeShareUrls([video]).state, 'unavailable');
  assert.doesNotThrow(() => analyzeShareUrls(['https://www.douyin.com/user/%E0%A4%A']));
});

test('resolver retains intermediate Location parameters and omits credentials', async () => {
  const visited = [];
  const result = await resolveShareChain(short, async (url, options) => {
    visited.push(url); assert.equal(options.redirect, 'manual'); assert.equal(options.credentials, 'omit');
    assert.equal(Object.keys(options.headers).some(k => /cookie|authorization/i.test(k)), false);
    if (url === short) return new Response(null, {status: 302, headers: {location: middle}});
    if (url === middle) return new Response(null, {status: 302, headers: {location: video}});
    return new Response('not parsed', {status: 200});
  });
  assert.equal(result.complete, true); assert.deepEqual(visited, [short, middle, video]);
  assert.equal(analyzeShareUrls(result.chain.map(h => h.url)).state, 'clues');
});

test('resolver refuses unsupported redirects before fetching them', async () => {
  for (const location of ['https://127.0.0.1/private', 'https://evil.test/', 'http://v.douyin.com/test', 'https://a:b@www.douyin.com/']) {
    let count = 0;
    const result = await resolveShareChain(short, async () => { count++; return new Response(null, {status: 302, headers: {location}}); });
    assert.equal(count, 1); assert.equal(result.complete, false); assert.equal(result.chain.length, 1);
  }
});

test('resolver handles relative redirects, loops, missing Location, platform errors and timeouts', async () => {
  const relative = await resolveShareChain(short, async url => new Response(null, url === short ? {status: 302, headers: {location: '/second/'}} : {status: 200}));
  assert.equal(relative.chain[1].url, 'https://v.douyin.com/second/');
  const loop = await resolveShareChain(short, async () => new Response(null, {status: 302, headers: {location: short}}));
  assert.equal(loop.complete, false); assert.match(loop.message, /循环/);
  assert.equal((await resolveShareChain(short, async () => new Response(null, {status: 302}))).complete, false);
  assert.equal((await resolveShareChain(short, async () => new Response(null, {status: 403}))).complete, false);
  const timeout = await resolveShareChain(short, async () => {throw new Error('timeout');});
  assert.equal(timeout.complete, false); assert.equal(timeout.chain[0].url, short);
});

test('resolver caps outbound requests but preserves the last Location', async () => {
  let count = 0;
  const result = await resolveShareChain(short, async () => new Response(null, {status: 302, headers: {location: `https://v.douyin.com/hop${++count}/`}}));
  assert.equal(count, 6); assert.equal(result.chain.length, 7); assert.equal(result.chain.at(-1).url, 'https://v.douyin.com/hop6/');
  assert.doesNotThrow(() => analyzeShareUrls([...result.chain.map(h => h.url), video]));
});

test('API validates method, origin, JSON, stream size and input before making requests', async () => {
  let requests = 0; const fetcher = async () => { requests++; return new Response(null); };
  assert.equal((await shareAccountResponse(new Request(api), fetcher)).status, 405);
  assert.equal((await shareAccountResponse(post(short, {headers: {'Content-Type': 'application/json', Origin: 'https://evil.test'}}), fetcher)).status, 403);
  assert.equal((await shareAccountResponse(post(short, {headers: {'Content-Type': 'text/plain'}}), fetcher)).status, 415);
  assert.equal((await shareAccountResponse(post(short, {body: '{bad'}), fetcher)).status, 400);
  assert.equal((await shareAccountResponse(post('https://evil.test/'), fetcher)).status, 400);
  assert.equal((await shareAccountResponse(post('x'.repeat(33000)), fetcher)).status, 413);
  assert.equal((await shareAccountResponse(post(short, {body: 'null'}), fetcher)).status, 400);
  assert.equal(requests, 0);
  const response = await shareAccountResponse(post(short), fetcher);
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).chain.length, 1); assert.equal(requests, 1);
});

const sharerUid = '962000000000001';
const authorUid = '58200000001';
function withActivity(activity, doubleEncoded = false) {
  const url = new URL(video);
  const raw = JSON.stringify(activity);
  url.searchParams.append('activity_info', doubleEncoded ? encodeURIComponent(raw) : raw);
  return url.href;
}

test('activity_info identifies the sharer UID separately from the author, even after a final clean redirect', () => {
  const result = analyzeShareUrls([short, withActivity({social_share_user_id: sharerUid, social_author_id: authorUid, social_share_time: '1792944000'}), video]);
  assert.equal(result.state, 'identified'); assert.deepEqual(result.sharers, [sharerUid]);
  assert.equal(result.fields.find(f => f.kind === 'sharer').source, 2);
  assert.equal(result.fields.find(f => f.kind === 'author').value, authorUid);
  assert.equal(result.confirmed, false);
});

test('activity_info supports double encoding and raw JSON URL input', () => {
  assert.deepEqual(analyzeShareUrls([withActivity({social_share_user_id: sharerUid}, true)]).sharers, [sharerUid]);
  const raw = `${video}?activity_info={"social_share_user_id":"${sharerUid}"}`;
  assert.deepEqual(analyzeShareUrls([extractShareUrl(raw)]).sharers, [sharerUid]);
});

test('malformed, author-only or unsafe numeric activity does not invent a sharer', () => {
  for (const activity of [null, [], 'string', {social_author_id: authorUid}, {social_share_user_id: '<script>'}, {social_share_user_id: -123456}, {social_share_user_id: 9007199254740992}, {social_share_user_id: {uid: sharerUid}}]) {
    assert.deepEqual(analyzeShareUrls([withActivity(activity)]).sharers, []);
  }
  assert.deepEqual(analyzeShareUrls([video + '?activity_info=%zzbroken']).sharers, []);
});

test('different sharer IDs across repeated activity fields or supplemented links remain a conflict', () => {
  const first = withActivity({social_share_user_id: sharerUid});
  const other = withActivity({social_share_user_id: '962000000000002'});
  assert.equal(analyzeShareUrls([first, other]).state, 'conflict');
  assert.equal(analyzeShareUrls([first, first]).state, 'identified');
  const duplicate = first + '&activity_info=' + encodeURIComponent(JSON.stringify({social_share_user_id: authorUid}));
  assert.equal(analyzeShareUrls([duplicate]).state, 'conflict');
});

function publicProfileFetcher(overrides = {}) {
  const calls = [];
  const fetcher = async (address, options) => {
    const url = new URL(address); calls.push({url, options});
    assert.equal(options.redirect, 'manual'); assert.equal(options.credentials, 'omit');
    if (url.hostname === 'ttwid.bytedance.com') {
      assert.equal(options.method, 'POST'); assert.equal(options.headers.Cookie, undefined);
      return Response.json({redirect_url: overrides.callback || 'https://www.douyin.com/ttwid/union/register/callback/?ticket=synthetic'});
    }
    if (url.pathname === '/ttwid/union/register/callback/') {
      assert.equal(options.headers.Cookie, undefined);
      return new Response(null, {headers: overrides.noCookie ? {} : {'Set-Cookie': 'ttwid=temporary_test_value; Path=/; HttpOnly'}});
    }
    assert.equal(url.origin, 'https://www.douyin.com');
    assert.equal(url.pathname, '/aweme/v1/web/user/profile/other/');
    assert.equal(url.searchParams.get('user_id'), sharerUid);
    assert.equal(options.headers.Cookie, 'ttwid=temporary_test_value');
    return overrides.response || Response.json({status_code: 0, user: {uid: overrides.uid || sharerUid, sec_uid: overrides.secUid || sec, nickname: '测试昵称', unique_id: 'test_handle'}});
  };
  return {fetcher, calls};
}

test('public profile uses one ephemeral anonymous cookie and returns only matching public identity', async () => {
  const {fetcher, calls} = publicProfileFetcher();
  const profile = await resolvePublicShareProfile(sharerUid, fetcher);
  assert.equal(calls.length, 3); assert.equal(profile.uid, sharerUid);
  assert.equal(profile.nickname, '测试昵称'); assert.equal(profile.handle, 'test_handle');
  assert.equal(profile.url, 'https://www.douyin.com/user/' + sec);
  assert.equal(JSON.stringify(profile).includes('temporary_test_value'), false);
});

test('public profile rejects untrusted callback destinations before any callback request', async () => {
  for (const callback of ['https://evil.test/ttwid/union/register/callback/', 'https://www.douyin.com.evil.test/', 'http://www.douyin.com/ttwid/union/register/callback/', 'https://a:b@www.douyin.com/ttwid/union/register/callback/', 'https://www.douyin.com:8443/ttwid/union/register/callback/', 'https://www.douyin.com/other/']) {
    const {fetcher, calls} = publicProfileFetcher({callback});
    await assert.rejects(() => resolvePublicShareProfile(sharerUid, fetcher));
    assert.equal(calls.length, 1);
  }
});

test('a profile for another UID, missing cookie, malformed JSON, or a platform block cannot replace the sharer', async () => {
  for (const override of [{uid: authorUid}, {noCookie: true}, {secUid: 'javascript:bad'}, {response: new Response('<html>challenge</html>')}, {response: new Response(null, {status: 403})}, {response: Response.json({status_code: 2})}]) {
    const {fetcher} = publicProfileFetcher(override);
    await assert.rejects(() => resolvePublicShareProfile(sharerUid, fetcher));
  }
  await assert.rejects(() => resolvePublicShareProfile(sharerUid, async () => {throw new Error('timeout');}));
});

test('API profile failure preserves a useful UID-only fallback without exposing temporary cookies', async () => {
  const {fetcher} = publicProfileFetcher();
  const request = () => post('', {body: JSON.stringify({operation: 'profile', uid: sharerUid})});
  const success = await shareAccountResponse(request(), fetcher);
  assert.equal(success.status, 200); assert.equal((await success.json()).profile.uid, sharerUid);
  const failure = await shareAccountResponse(request(), async () => {throw new Error('secret_session_token');});
  assert.equal(failure.status, 502);
  assert.equal((await failure.text()).includes('secret_session_token'), false);
  let count = 0;
  const invalid = await shareAccountResponse(post('', {body: JSON.stringify({operation: 'profile', uid: 'http://evil.test/'})}), async () => {count++;});
  assert.equal(invalid.status, 400); assert.equal(count, 0);
});

test('public profile bounds JSON data instead of buffering unlimited responses', async () => {
  let count = 0;
  await assert.rejects(() => resolvePublicShareProfile(sharerUid, async () => {count++; return new Response('x'.repeat(262145));}), /过大/);
  assert.equal(count, 1);
});
