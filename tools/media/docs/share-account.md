# 分享链接账号识别

入口：`/tools/media/share-account.html`，工具箱「媒体工具」和站内搜索均可访问。支持抖音分享文案、HTTPS 短链接、作品和用户主页链接。

## 从链接解析账号

1. 保留短链接各级 HTTP Location，避免最终视频页丢弃第一次跳转中的分享参数。
2. 解析 `activity_info` JSON 中的 `social_share_user_id`，得到分享人 UID。支持 URL 单次、双重编码；ID 使用字符串，拒绝已经丢失精度的 JSON 数字。`social_author_id` 单独列为作者，不能用作者代替分享人。
3. 若未开启「仅本地分析」，通过字节跳动官方匿名会话注册接口和抖音公开用户接口，将该 UID 匹配到昵称、抖音号及 `sec_uid` 主页。要求接口返回的 UID 与查询值一致。公开主页请求失败时仍保留已解析的 UID。
4. 多个活动字段或补充链接出现不同分享人 UID 时，显示冲突，不自动选择账号。手动补充地址始终注明其与原链接的关联未验证。

`share_uid` 等明确命名的其他字段只列为启发式候选。`sec_uid`、`uid` 等通用字段不推断角色；用户主页路径只表示被分享主页的账号。

如果没有 `activity_info`，只有 `u_code`、签名、设备标识等，本工具不会声称已经找到账号。`did`、`iid` 即使外观类似 sec_uid，也不生成用户主页。链接可被修改或再次转发；识别链接中的分享账号不证明当前发送人的身份。

## 来源与实现

主要原理参考 [tu95/FindYou](https://github.com/tu95/FindYou) 的[抖音解析说明](https://github.com/tu95/FindYou/blob/53997dcee78ff4e11a0f3930684465840e3f76e1/README.md)及其 `lib/platforms/douyin/` 中说明的字段、官方接口流程。该项目也支持其他平台；本工具本次只接入抖音。这里独立实现 JSON 解析及官方接口调用，不复制上游源码，也不引入上游依赖。参考版本：`53997dcee78ff4e11a0f3930684465840e3f76e1`，查阅日期：2026-10-26。

## 运行与构建

```powershell
node tools/media/scripts/build-share-account.mjs
node scripts/build-worker.mjs
node scripts/serve-site.mjs 8194
```

打开 `http://127.0.0.1:8194/tools/media/share-account.html`。已有构建产物时可直接执行最后一条命令。前端构建生成 `scripts/share-account-browser.js`；修改前端或 core 源码后需重新构建，浏览器脚本和 Worker 产物随仓库提供。

直接打开 HTML 文件也能本地分析长链接中的 UID，此模式默认锁定「仅本地分析」，并显示服务启动说明。纯 GitHub Pages 无解析后端，仍可分析长链接与手动补充地址；短链展开和公开主页查询会说明服务未连接，不会改用第三方代理。

Cloudflare 使用 `worker/site.ts` 与构建后的 `.worker/site.mjs`，`wrangler.jsonc` 已配置接口优先路由。本次没有线上发布。

## 接口与数据处理

`POST /tools/media/share-account/api/resolve`：

- `{ "input": "分享文案或链接" }`：返回各级 `{url,status}`、`complete` 和说明。只请求精确白名单的 HTTPS 抖音域名，最多 6 次请求，共用 15 秒截止信号。
- `{ "operation": "profile", "uid": "分享人 UID" }`：返回匹配的 `profile`（UID、secUid、昵称、抖音号、主页）。仅使用固定官方注册与用户查询接口，回调限定到 `https://www.douyin.com/ttwid/union/register/callback/`，不跟随接口重定向。所有请求共用 12 秒截止信号，JSON 响应上限 256 KiB。匿名 `ttwid` 仅在本次请求内存中使用，不返回客户端、不写磁盘、不复用用户 Cookie。

请求体最多 32 KiB，输入最多 8,192 字符；拒绝其他来源的跨站调用。页面不保存输入、不加载分析脚本，接口响应 `Cache-Control: no-store`。服务不记录链接或匿名会话值，部署平台自身的访问日志政策仍适用。工具只展示公开账号资料，不读取用户登录、手机号、实名或非公开资料。

## 实际样本（2026-10-26）

原样本 `https://v.douyin.com/DdRthmM0Fi8/`：桌面与手机 UA 的第一跳均没有 `activity_info`，只有 `u_code` 等线索；此样本仍无法通过参考项目的方法得到分享人。

新样本 `https://v.douyin.com/Sgk5akeXR2I/`：第一跳包含 `activity_info`，分享人 UID 与作者 UID 不同；新解析流程能提取分享人，并在官方公开主页接口得到相同 UID 对应的昵称、抖音号和主页。测试和预览截图使用合成账号，不持久化该样本的设备标识或用户资料。

## 验证

```powershell
node --test tools/media/tests/share-account.test.mjs scripts/serve-site.test.mjs
node scripts/check-navigation.mjs
node scripts/check-site-links.mjs
```

20 项解析 / 接口测试覆盖活动 JSON、双重编码、UID 精度、作者隔离、冲突、缺失字段、短链跳转、白名单、匿名 Cookie 隔离、回调地址约束、公开接口 UID 不匹配、网络失败与响应大小限制。另有 2 项站点预览路由测试。实时平台响应可能变化，自动测试不依赖真实分享链接长期有效。

页面实测：新短链接完整显示昵称、抖音号和公开主页，报告复制包含相同账号资料；390×844 手机视口无横向溢出。示例截图位于 `docs/audit/share-account/desktop.jpg` 和 `mobile.jpg`，使用合成 UID，不保存真实样本的账号信息。HTTP 页面已通过浏览器验证；浏览器自动化策略不允许直接导航 file://，因此文件模式只完成了经典脚本打包与代码检查。
