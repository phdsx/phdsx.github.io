# 超级玛丽交接

- 目标 / 阶段：在现有静态游戏厅加入可玩的超级玛丽；网页适配与浏览器验证阶段。
- 方案：接入 MIT 的 reruns/mario 地上 1-1 和地下房；精灵、音频原有权利归 Nintendo，完整来源见 README。
- 本次文件：本目录全部内容；`index.html`（共享脚本缓存版本）、`games.html`、`assets/catalog.js`、`assets/navigation.js`、`assets/i18n.js`、`scripts/check-navigation.mjs`、`THIRD_PARTY_NOTICES.md` 中对应入口、翻译、测试与声明。
- 验证：`node scripts/check-navigation.mjs`；Playwright 执行 `node games/arcade/super-mario/browser-test.cjs`。14 项浏览器场景检查通过，运行时异常与游戏资源失败均为 0。详细结果与截图位于 `docs/audit/evidence/super-mario/`。
- 已覆盖：键盘、多指触屏和取消；金币、两次变身、火球、踩怪、无敌结束；水管双向穿越；三次死亡、重开和通关；暂停、失焦、音效切换后的键盘焦点、重开取消延时；存储禁用；60/144Hz 一致性；目录分类、多个分辨率布局。
- UI 检查：未发现阻断操作或横向溢出；320px 下操作按钮至少 44px 且完整可见，主操作与游戏画面明确，说明位于画面下方。实体设备、缺口安全区域、Safari 与读屏游戏体验未验证。
- UI 估计评分（桌面截图与 Chromium 手机模拟）：Readable 7/10、UX 8/10、Accessibility 6/10、Commercial 5/10（非商业演示、素材权利边界）、Retention 7/10、Google Play Risk 不适用（未提交移动商店）。页面辅助说明字号偏小，为 P2；无 P0 / P1。非实测留存或商店评分预测。
- DEBUG_HANDOFF.md 未创建：未发生同一假设连续两次修复失败，无持续未解的玩法故障。
- 限制：只有首关及地下房，无完整世界、联机或中途存档；来源素材版权未因 MIT 改变；自动化高级场景有定位辅助，未人工无辅助走完整关。
- 工作区：存在其他任务的未提交修改，包括三维弹球入口；保留它们，不要将全工作区改动视为本任务产物。游戏数量按实际卡片统计维护。
- 下一步：实体 Android/iOS 触摸与声音验证；需要更多关卡时先确认素材权利和关卡范围。
