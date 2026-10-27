# 点球大战 2 交接

- 目标：根据用户明确要求，借助 REA 保留原作玩法、画风、美术，汉化并去除广告与内购；新版本替换上一版几何人物原创原型。原型备份在忽略目录 `.local-tools/penalty-rea/prototype-backup/`。
- 状态：原版发布资源已在 `play/` 本地运行，截图与原版结构一致；11 组虚构俱乐部（352 队和别名）、全球杯球队、联赛、教程、比分与结果使用中文显示。游戏主逻辑、动画及音效来自原作，原始 ASCII 字符串仍用于内部条件判断。
- 资源：`source-manifest.json` 记录原版公开版本 `47a81ce0-7223-495d-be4a-41778fafb74f` 的路径和 SHA-256。相对于来源，修改的文件为 `play/data.json`、`scripts/main.js`、`scripts/c3main.js`、`scripts/project/javaScriptInEvents.js`、`select.css`（仅注释），新增 `index.html`、`local-bridge.js`、`penalty-zh.js`、`club-names.js`。原美术和音频未重绘；广告按钮借用原有无图标帧。
- 去广告：替换原 SDK DOM 插件，广告/账户标记为 false，插屏立即返回，奖励回调返回 true，使原有重踢、重赛和抽签逻辑可直接执行；屏蔽遥测、外链、在线成绩和平台账户。原包插件清单未发现独立内购插件，未发现适用于本地游戏的付费入口。
- 断网边界：线上账号、分享和全球实时排行榜不支持。世界杯本地比赛保留；原平台线上排名不能在离线模式复刻。原声音等存档由 Construct 本地存储管理，与旧原型的 `phdsx-penalty-v1` 相互独立。
- REA 证据：正常入口运行观测 `ev_cb884a1518db0dd46ab64405606abb6008b1c5028966074b027b437f7649e551`；原 JS 静态分析 `ev_c2cf4da3c459a98a6c61a9925e2394f240514b8a34e7142c8cc7411f8d9dcf62`；本地站点启动观测 `ev_880ff7a8399b5f4daaf39448cee4230618c4f7b598e3ce37a4081cb4041d9a56` 未观察到异常、失败响应或外部请求。静态分析只选择四个脚本，未选文件及动态关系为未知；CDN 直接入口曾返回 403，正常网页入口可加载。日志和完整证据位于忽略目录 `.local-tools/penalty-rea/`，不将页面遥测写入产品目录。
- 验证：`node scripts/check-navigation.mjs`、`node scripts/check-site-links.mjs` 通过；`browser-test.cjs` 九项通过，检查源文件哈希、中文 UI、射门、音效保存、48 队、移动适配、真实触摸和外部请求；额外实测一整场小组赛从选队到回到积分榜。`retry-test.cjs` 实际触发并直接重踢当前球，奖励标志从 false 变 true，外部请求为零。截图/结果在 `docs/audit/evidence/penalty-cup/rea/`。
- 风险：尚未逐一验证全部联赛、完整夺冠、实体手机和 Safari；原游戏及素材归 10x10games/原权利人，未发现独立再分发许可证，保留来源和权利说明，发布前应处理相应授权。游戏尚未发布。
- DEBUG_HANDOFF.md：无持续两次失败的相同游戏缺陷，未建立。手机自动化此前在切换动画尚未结束时点击，按实际选队状态等待后再测。
- 下一步：用户需要上线时确认原游戏授权，并执行实体手机、Safari 和完整夺冠赛程验证；保持用户当前工作区的其他游戏改动。
- 本地预览：`http://127.0.0.1:8194/games/sports/penalty-cup/index.html` 已启动；用户当前页面刷新后载入新版。
