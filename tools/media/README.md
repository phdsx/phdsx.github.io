# 视频在线解析 · 多平台下载

入口：`tools/media/bilibili-downloader.html`，分类为在线工具 → 媒体工具，同时收录于站内搜索。

现已接入 B站、抖音、小红书和 YouTube。本文主要记录 B站实现；新增三平台使用独立 yt-dlp / FFmpeg 服务，安装、部署、平台访问限制及实际验证情况见 [多平台服务说明](service/README.md)。入口路径保持兼容，自动按链接选择接口。

支持普通 B 站投稿的完整链接、分享文字、BV / AV 号、b23.tv 短链接与分 P。清晰度和编码来自当前请求实际返回的视频流，优先选择 H.264；不把接口仅声明支持但未返回的视频档位当作可下载项。页面会说明游客 / 登录状态，以及未返回的档位。番剧、直播、付费、充电专属、试看和旧式多段 FLV 暂不支持。

## 运行与部署

站点已有 Cloudflare Worker，本工具复用其部署。前端直接请求同源 `/tools/media/bilibili/api/*`；Worker 访问 B 站 API、处理 WBI 签名并流式转发媒体。浏览器无法直接跨域读取 B 站 API 或设置其防盗链 Referer，因此 **仅发布到 GitHub Pages 不会提供解析、下载能力**，页面会在请求时明确提示服务未连接。

本地预览（Node 22 或更新版本，需要网络能够访问 B 站）：

```powershell
node scripts/serve-site.mjs 8194
```

打开 `http://127.0.0.1:8194/tools/media/bilibili-downloader.html`。

不要双击 HTML 或通过 `file://` 打开：浏览器会限制本地模块与接口请求，而且本地文件没有解析后端。文件模式下页面会禁用解析，并显示启动命令和 HTTP 入口。出现“无法连接解析服务”时，请检查本地 Node 服务是否仍在运行；仅启动静态文件服务器也无法提供视频 API。

Worker 源码入口为 `worker/site.ts`，解析实现为 `worker/bilibili.mjs`，扫码登录实现为 `worker/bilibili-auth.mjs`。仓库包含可部署的 `.worker/site.mjs`。修改 Worker 源码后重建：

```powershell
npm --prefix tools/lifestyle/pokemon-map/deployment ci
node scripts/build-worker.mjs
```

构建复用已有工具的 esbuild；也可以使用该工具原有的 `npm run build`，两者都会从 `worker/site.ts` 重建共享 Worker。`wrangler.jsonc` 的 `run_worker_first` 同时包含地图 API 与视频 API 路由。部署使用仓库原有 Cloudflare Wrangler 流程，服务必须支持流式响应和 Range 请求；本次代码变更不会自动发布站点。

## 扫码登录

点击「B站扫码登录」，使用 B 站 App 扫码并在手机确认。页面每 3 秒检查一次状态，支持待扫码、已扫码待确认、过期、刷新与取消；隐藏页面时暂停轮询。成功后显示账号昵称及会员状态，清空手动凭据，并自动重新解析当前视频。已登录时提供「退出登录」，退出后重新以游客身份解析；退出仅清除本站会话，不注销用户在 B 站 App 的登录。

二维码由现有本地 `tools/utility/vendor/qrcode.min.js` 绘制，不向第三方二维码服务发送登录 URL。兼容 B 站当前 `account.bilibili.com/h5/account-h5/auth/scan-web` 和旧版 `passport.bilibili.com/h5-app/passport/login/scan` 地址。二维码密钥放在加密 HttpOnly 挑战 Cookie 中，有效期 3 分钟；轮询接口不接受客户端提交的任意二维码密钥。确认成功后，仅抽取 SESSDATA，调用 B 站 `nav` 确认登录，再写入 AES-GCM 加密的 HttpOnly / SameSite=Strict 会话 Cookie；HTTPS 下附加 Secure，Cookie 路径限定到视频 API。原始凭据与刷新令牌不返回页面，也不写入 localStorage。每个会话令牌仍有 8 小时上限；页面打开期间每 15 分钟调用同源 POST `auth/renew`，重新验证上游账号成功后才重新签发。恢复页面可见时也会验证，临时网络失败保留本地状态并在一分钟后重试，离开页面停止续期。服务重启、上游失效或长时间无法联网导致令牌过期时仍需重新登录；不保存新的磁盘密钥。

四个平台通过「登录 / Session 所属平台」分别管理：B站支持扫码与手动 SESSDATA，其他平台仅显示本平台 Cookie，明确提示尚未接入扫码。手动凭据仅保存在当前页面内存，切换平台会保存并恢复各自的内容，不会跨平台发送；解析失败或视频元数据缓存过期也不清空凭据。刷新后手动凭据重新开始为空，或可单独清除某个平台，其他平台不受影响。历史返回缓存保留同一页面的内存状态。视频下载链接 / 服务端元数据仍按自身时效更新，下载时若发现过期，会用已保留的本平台会话重新解析。

本地服务自动生成仅保存在进程内的随机会话密钥，服务重启后需重新扫码。线上 Worker **必须**配置固定的 `BILIBILI_SESSION_SECRET`（至少 32 字符的高强度随机值），以便不同实例解密同一浏览器会话。使用已有 Wrangler 环境配置：

```powershell
npx wrangler secret put BILIBILI_SESSION_SECRET
```

按提示粘贴自行生成的随机密钥，不要将其写入源码或提交 Git。未配置密钥时游客解析仍然可用，扫码登录返回明确的服务未配置提示。密钥轮换会使旧登录和二维码失效。服务只向 B 站官方登录域和 API 域发请求，不跟随回调登录 URL，不存储长期刷新令牌。

## 音视频下载

`scripts/bilibili-mux.mjs` 使用本地固定版本的 Mediabunny 将独立 DASH 视频与 AAC 音轨封装为单个 MP4，不解码、不转码。支持 H.264 / H.265 / AV1；播放器是否能播放后两种编码取决于设备，优先推荐 H.264。单文件 MP4 也会重新封装为 MP4。

小视频使用内存缓冲和 Blob 直接下载。预计大于 200 MiB 时，桌面 Chrome / Edge 使用文件选择器和位置写入逐步保存，成功后提交文件，取消或失败时中止文件。不支持文件写入的浏览器使用 Blob 下载；预计大于 400 MiB 时提示选择较低画质或使用桌面浏览器，实际内存上限依设备而定。链接过期需重新解析。CDN 首选标准 HTTPS，跳过 `:8082` P2P 地址并保留、依次尝试官方 CDN 备用地址。

手动填写 SESSDATA 仍作为备用入口，优先于扫码会话。手动凭据仅通过 POST JSON 发送到同源服务，再以 Cookie 转发至 `api.bilibili.com`；不会返回到 API 结果、放入 URL、写入 localStorage 或转发给媒体 CDN，页面刷新、离开时清除。扫码会话的存储和期限见上节。服务不记录请求体或 Cookie，所有 API 响应 `Cache-Control: no-store`。仅在信任部署服务时登录或填写 SESSDATA；账号权限和平台访问验证仍然适用，游客通常只能获得部分清晰度，不绕过权限。

接口不开放通用跨域代理：解析 URL 和短链的每一跳都校验平台，媒体地址限制为 B 站 `bilivideo.com / bilivideo.cn` 的 HTTPS 标准端口与 `/upgcxcode/` 媒体路径，禁止跳转，支持单段 Range。跨站请求及超长请求体会被拒绝。公开部署可在 Cloudflare 配置站点流量限额，按自己的带宽预算运行。

## 验证

```powershell
node --test tools/media/tests/*.test.mjs scripts/serve-site.test.mjs
node scripts/check-navigation.mjs
node scripts/check-site-links.mjs
```

接口测试覆盖 URL / 短链校验、WBI 签名、分 P、实际清晰度、登录态失效、试看与付费拒绝、请求体上限、源校验和 Range 转发。媒体测试使用本地生成的 1 秒 H.264 + AAC 样本，验证内存和文件写入两种模式均保留 12 个视频包、完整声音轨道和时长，并验证取消行为。

扫码测试覆盖当前 / 旧版二维码、等待 / 确认 / 过期状态、凭据提取与账号二次校验、加密 Cookie、跨源及篡改拒绝、过期会话、退出、取消、自动使用扫码会话解析，以及前端轮询、刷新、网络失败和下载期间禁用登录操作。新增后共 30 项测试通过，TypeScript 检查通过。真实 B 站二维码生成及待扫码轮询、浏览器本地二维码显示已验证；完整账号确认及登录后高清以模拟接口覆盖，未代用户完成个人账号登录。

2026-10-25 实际联调：以 `BV1bK411W797?p=2` 测试解析 → 同源代理 → 下载 → 合成流程，生成约 6.93 MB 的 640×360 MP4；ffprobe 确认 H.264 视频和 AAC 音频两条轨道、约 97.94 秒时长，ffmpeg 完整解码无错误。随后在真实浏览器中完成同一视频的解析、清晰度选择、MP4 合成和保存，保存文件也通过 ffprobe 检查。手机宽度下无横向溢出。未使用账号凭据，登录高清行为由接口模拟测试覆盖，未对真实登录态验证。

## 参考与许可

- [yt-dlp 的 Bilibili extractor](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/bilibili.py)：参考 WBI / DASH 流程，本工具未复制其 Python 代码。
- [Mediabunny 1.62.1](https://github.com/Vanilagy/mediabunny)：MPL-2.0，本地文件和许可证位于 `assets/vendor/mediabunny-1.62.1/`；未修改库。
- [js-md5 0.8.3](https://github.com/emn178/js-md5)：MIT，位于 `assets/vendor/js-md5-0.8.3/`，增加 ESM 包装，使用便携 JavaScript 实现。
- [QRCode.js](https://github.com/davidshimjs/qrcodejs)：复用站内二维码工具的本地模块，MIT，许可证保留在 `tools/utility/vendor/LICENSE.qrcodejs`。
- 测试媒体由 FFmpeg 的 `testsrc` / `sine` 程序生成，不含外部音视频素材。真实视频测试产物仅放在忽略的 `.local-tools/`，不随站点分发。
