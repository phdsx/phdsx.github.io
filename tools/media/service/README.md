# 抖音 / 小红书 / YouTube 下载服务

与 B站原有接口并存，前端保持 `tools/media/bilibili-downloader.html` 入口。自动识别链接后，B站仍使用原来的解析、扫码登录和浏览器合成；其他三个平台使用本服务的 yt-dlp + FFmpeg。支持单条点播视频和 Shorts，不支持播放列表、直播、图文笔记及 DRM 视频。

## 本地安装与运行

需要 Node 22+、Python 3.10+ 和 FFmpeg。YouTube 使用 Node JavaScript runtime 及官方 `yt-dlp-ejs`；requirements 已包含默认依赖。

Windows，在仓库根目录运行：

```powershell
python -m venv .local-tools/video-downloader
.local-tools/video-downloader/Scripts/python.exe -m pip install -r tools/media/service/requirements.txt
node scripts/serve-site.mjs 8194
```

Linux / macOS 对应的 Python 路径为 `.local-tools/video-downloader/bin/python`。FFmpeg 需在 PATH 中；也可通过 `VIDEO_FFMPEG` 指定其目录。打开 `http://127.0.0.1:8194/tools/media/bilibili-downloader.html`。本地站点服务自动提供 `/tools/media/video/api/*`，无需另开服务。

可通过 `VIDEO_PYTHON` 指定另一个已安装依赖的 Python。仓库的 `.local-tools/` 已忽略，不提交虚拟环境、Cookie 和下载文件。

## 线上部署

Cloudflare Worker 无法运行 Python / FFmpeg，因此需要将本服务部署到支持 Node、Python 和本地临时磁盘的主机。提供 Dockerfile：

```text
docker build -f tools/media/service/Dockerfile -t phdsx-video .
docker run --rm -p 8795:8795 -e VIDEO_SERVICE_KEY=<自行生成的高强度随机密钥> phdsx-video
```

在反向代理上为服务启用 HTTPS。外部服务请求必须带 `x-video-service-key`，密钥错误时不运行解析；未配置密钥时独立服务仅允许绑定回环地址。反向代理应限制请求速率、并发及可用磁盘空间，并允许解析请求耗时约 90 秒。

在站点 Worker 中配置：

- `VIDEO_SERVICE_URL`：服务的 HTTPS origin，例如 `https://video.example.com`。
- `VIDEO_SERVICE_KEY`：与服务端一致的随机密钥，使用 Wrangler secret 配置，不写入前端。
- 原有 `BILIBILI_SESSION_SECRET` 继续单独用于 B站扫码会话。

运行 `node scripts/build-worker.mjs` 更新 `.worker/site.mjs`，按仓库原有流程发布。`wrangler.jsonc` 已配置 `/tools/media/video/api/*` 优先进入 Worker。转发只包含多平台下载会话 Cookie，不转发 B站登录 Cookie；前端始终请求本站同源接口。纯 GitHub Pages 无法运行此功能。没有配置外部服务时，线上会显示明确的服务未连接提示。

## 平台限制与 Cookie

YouTube 根据来源提供实际清晰度和编码；高分辨率通常需要下载画面、声音两个流，再由 FFmpeg 原画质合并为 MP4。MP4 中的 AV1 / VP9 等编码能否播放取决于设备。没有捏造或放大视频分辨率。

抖音可能要求新的访问 Cookie，小红书的很多笔记需要完整分享链接中的 `xsec_token`，还可能受登录、删除、地区或验证限制。页面按平台分别保留手动 Cookie，不自动读取浏览器账号；切换、解析失败均不清除，刷新本页或主动清除才重置对应输入。用户手动提供的 Cookie 转为仅限所选域名的临时 Netscape 文件，通过 stdin 配置传给 Python，不写进子进程命令行；临时文件以 0600 创建并在子进程结束时删除。服务端视频元数据缓存最多保留 30 分钟，已启动下载所用的临时凭据在任务结束时删除（下载最长 45 分钟），这些缓存时限不等同于前端手动会话过期；下载前发现缓存过期会使用页面仍保留的正确平台 Cookie 自动重新解析。刷新清空页面手动凭据，不等同于立即删除服务端尚有效的元数据缓存。B站扫码仅适用于 B站。进程异常退出时可能留下私有临时目录，应由部署方的磁盘清理策略处理。

## 下载和资源生命周期

解析返回随机会话 ID 和实际格式 ID；视频 CDN URL 不交给客户端。服务器将任务绑定到本站 HttpOnly / SameSite=Strict 随机浏览器 Cookie，其他浏览器不能读取或取消任务。Cookie 在 HTTPS 下添加 Secure。下载路径仅由服务端随机 ID 构成，文件名固定为 `video.mp4`；不接受客户端提供输出路径、下载命令或任意媒体 URL。

同时最多 2 个解析 / 2 个下载，最多 32 个解析会话、12 个下载任务。解析上限 90 秒，下载上限 45 分钟；单轨最大 2 GiB。下载完成前保存在 `.local-tools/video-cache/<随机ID>/`。页面每秒读取下载状态；完成后读取 MP4 文件，支持 Range，写入浏览器文件或 Blob。取消时终止对应子进程树并删除其目录；客户端保存完成后释放任务，运行中的服务也每分钟清理过期任务。任务最长一小时过期；服务重启前遗留的目录需要部署方清理。

URL 输入只允许四个平台的已知视频路径，每一跳短链跳转重新校验平台；拒绝本地地址、用户名密码、特殊端口和伪造域名。仅从受支持的平台提取器运行 yt-dlp，校验媒体来源域名，禁止通用 URL 下载。始终保留 TLS 校验，不自动使用用户浏览器凭据。平台错误不会回显 Cookie、签名链接和原始 stderr。

## 验证记录（2026-10-25）

- YouTube `jNQXAC9IVRw`：真实解析、服务器下载、H.264 + AAC 分流合并、MP4 保存通过；ffprobe 检出 320×240、约 19.06 秒、画面与声音两条轨道。
- YouTube `YE7VzlLtp-4`：真实返回 144P 至 1080P 多清晰度；未下载整部视频。
- 抖音上游测试样例 `6961737553342991651`：当前无 Cookie 请求被平台要求提供新的访问 Cookie，正确返回登录 / 验证提示；未验证带个人 Cookie 的实际下载。
- 用户提供的抖音视频 `7699779226500753338`：链接识别通过，无 Cookie 解析同样返回 `Fresh cookies (not necessarily logged in) are needed`。官方移动分享页没有返回该视频的媒体数据，因此未取得可用清晰度、也未下载文件。接口已提供新的访问 Cookie 专用提示，不等同于必须登录账号。
- 小红书上游旧测试笔记：当前未返回可下载视频，正确报错；未验证带用户有效分享 token / Cookie 的实际下载。
- 模拟测试覆盖三平台格式整理、声音配对、来源校验、会话隔离、文件及 Range、取消 / 清理与过期。外部平台可用性由实际内容权限和平台状态决定。
- 新旧平台共 42 项测试、TypeScript、导航和本地链接检查通过。浏览器端 YouTube 自动识别、清晰度切换及服务器任务下载均纳入联调。

上游：[yt-dlp](https://github.com/yt-dlp/yt-dlp)、[YouTube EJS 配置](https://github.com/yt-dlp/yt-dlp/wiki/EJS)、[小红书提取器](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/xiaohongshu.py)、[抖音提取器](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/tiktok.py)。没有复制上游提取器代码。运行依赖继续适用各自许可证。
