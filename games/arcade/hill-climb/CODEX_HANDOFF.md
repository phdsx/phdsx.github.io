# 登山赛车 Lite 交接

- 日期：2026-10-27（Asia/Shanghai）。
- 目标：按用户要求用 REA 研究原版，保留玩法、画风和美术，增加中文，移除广告及真实货币购买。
- 状态：原版 1.3.0 WebAssembly 与资源在本站本地运行；完成简体中文、无网络广告平台桥接、免费奖励、旧版金币一次性迁移。未发布远程站点。
- 主要文件：`index.html`、`local.css`、`local.js`、`runtime/`、`localization/zh-CN.json`、`patches/`、`tools/`、`README.md`、`REA_FINDINGS.md`；游戏大厅与搜索、导航、翻译和第三方声明已更新。
- 保存：原版进度在 IndexedDB；旧 Canvas 游戏的 `phdsx-hill-climb-v1` 保留。首次创建新存档时导入旧金币并保存原快照，不自动换算不同游戏机制的车型/升级。
- 验证：17 项 Chromium 浏览器检查通过，覆盖挑战页、免费抽选、免费及金币升级、旧金币迁移与刷新、驾驶/暂停、桌面和手机竖横屏、真实触摸事件、仅本地请求及运行时错误。`node scripts/check-navigation.mjs`、`node scripts/check-site-links.mjs` 通过。截图与机器可读结果在 `docs/audit/evidence/hill-climb-native/`。
- 边界：未在实体手机或 Safari 上验证；仅抽查部分车型、关卡与结算分支，不能据此宣称全内容逐项完成兼容性测试。原版游戏资源权利归 Fingersoft 等原权利人，未发现独立再分发许可。
- `DEBUG_HANDOFF.md`：未创建，本次没有需要交接的重复未解缺陷。
- 下一步：真实手机与 Safari 测试；需要公开发布时先核实原作资源的再分发授权。