# 黑洞吞噬城市交接

- 目标：按用户要求，以 REA 对照 Poki Hole.io，保留原版玩法与美术，中文化并移除广告和付费入口。
- 当前状态：正式入口已改为本地 Unity WebGL 2.20.4；13 个目录中已识别的本地资源包完整，未发布、未提交 Git。原版用户昵称和对手昵称保留。
- 实现：原版模型、场景、音效及玩法；简体中文语言表、字幕和两份扩充中文字体图集；隐藏 10 个付费/广告促销对象；26 个视频图标改为原游戏星形图标；广告回调直接完成；键盘模拟原版拖动摇杆。
- 所有者：本目录的 `index.html`、`local-runtime.js`、`runtime/`、`scripts/` 和浏览器检查；游戏目录卡片与文案在 `games.html`、`assets/i18n.js`；第三方归属在 `THIRD_PARTY_NOTICES.md`。
- 原型文件 `game.mjs`、`game.css`、`core.mjs`、`core.test.mjs` 未被正式入口引用，仅留存供对照；不要将其规则测试误报为原版 Unity 的测试。
- 验证：原版首局真实计时到结束，中途没有广告；星形按钮点击后直接增加时间；桌面键鼠与 390×844 手机触控模拟可移动；无浏览器 JS 异常、HTTP 资源缺失或外部网络请求；13 个目录资源、Unity WebData 边界与 WebAssembly 校验通过；全站链接及导航检查通过。
- 证据：`docs/audit/evidence/hole-city/replica/` 截图与 `results.json`；REA 证据 ID、观察/未观察边界见 `docs/audit/evidence/hole-city/reference/observations.md`。
- 当前风险：对局进入时 Unity 控制台记录一条 `NullReferenceException`，未观察到阻塞，根因与对照限制见 `DEBUG_HANDOFF.md`。实体手机性能、全部关卡与后期动态界面尚未完整验证。
- 下一步：完成原站与本地日志对照，定位空引用；在实体手机检查性能与多个后期关卡，再按本站流程部署。

## 2026-10-28 加载优化（维护）

- 本次目标：缩短网站首屏等待和本游戏启动文件的串行等待；已完成本地验证，按用户要求随本次优化提交并推送，线上发布结果以 GitHub Pages 工作流为准。
- `local-runtime.js` 同时下载并解压 `game.data.gz` 与 `game.wasm.gz`，两项完成后才启动 Unity；成功和部分下载失败都会释放临时 blob URL。入口为适配脚本添加版本参数。
- 同次站点修改：根目录 `index.html`、`games.html` 移除脚本下载期间隐藏内容的逻辑，依赖脚本在头部 defer；六张目录缩略图另存为 `assets/games/thumbnails/*.webp`，合计 1,302,436 → 72,198 字节；目录除第一张封面外使用懒加载。
- 本地证据：`.local-tools/site-loading-qa/results.json`、同目录桌面/手机/游戏截图及 `.local-tools/site-loading-qa.cjs`（均为忽略的本地 QA 文件）。19 项浏览器检查通过，包括延迟翻译脚本时内容可见、搜索/筛选/语言切换、30 个游戏入口、390×844 布局、Unity 启动、启动请求时间重叠、HTTP 503 失败提示与 blob 释放。
- 固定 1440×1000 视口的初次图片请求体积（含壁纸和图标）从 1,530,622 → 300,384 字节，约减少 80%；这是本机静态服务对照，不能直接作为线上耗时或实体手机性能数据。
- `node --check games/arcade/hole-city/local-runtime.js`、`node games/arcade/hole-city/verify-resources.mjs`、`node scripts/check-navigation.mjs`、`node scripts/check-site-links.mjs` 均通过。DEBUG_HANDOFF.md 未改：既有 Unity 空引用根因调查不在本次加载优化范围内。
- 下一步：按现有 GitHub Pages 流程发布后复测线上慢网体验；实体设备及既有空引用调查仍待完成。
