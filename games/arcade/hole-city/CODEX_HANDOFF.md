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
