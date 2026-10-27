# 超级玛丽 · PHDSX 网页适配

入口：`games/arcade/super-mario/index.html`，已接入游戏厅的“动作街机”、站内搜索及中英文目录。纯静态 HTML / CSS / JavaScript，运行时不需要 npm、CDN、后端或外部游戏站点。

包含上游的地上 1-1 关卡和地下金币房：移动、可变高度跳跃、加速、金币砖、蘑菇、火焰花、火球、无敌星、蘑菇怪、乌龟、水管与终点旗杆。抵达城堡后显示通关，可以重新挑战。本版本并非完整八世界原作。

## 操作与会话

- 方向键或 A / D 移动；空格 / X / W / ↑ 跳跃，按住跳得更高。
- Z / Shift 按住加速；火焰形态下每次按下发射火球。
- ↓ / S 下蹲，在可进入的水管顶部按下可进入地下房。
- P / Esc 暂停或继续，R 重新开始。失去焦点、切后台时自动暂停。
- 手机可同时按方向、加速、跳跃，触点取消或失去焦点时清理按键。
- 三次生命，死亡后在当前场景重生并保留本局金币；用完生命结束挑战。重新开始恢复三次生命、清空金币和待执行动作。
- 最佳金币保存在 `localStorage['phdsx.mario.best']`；禁止存储时仍可游玩。未实现中途存档。

## 来源与版权

上游：[reruns/mario](https://github.com/reruns/mario)，作者 Garrett Johnson，源码 MIT，完整许可证见 [upstream/LICENSE](upstream/LICENSE)，原始说明见 [upstream/README.md](upstream/README.md)。本次下载日期：2026-10-26。

- 分支：`gh-pages`。
- 来源包：`https://codeload.github.com/reruns/mario/zip/refs/heads/gh-pages`。
- 下载包 SHA-256：`4f10dda494c693fbf035346083dd6cb4a844339ba40833739edb819755b2080a`。
- 本地包含 `js/`、`sprites/`、`sounds/`、原始 README 和 LICENSE；不依赖上游在线服务。
- `cover.png` 为本地实际关卡画面配合文字生成的目录缩略图，可由浏览器检查脚本重新生成。

**源码 MIT 许可不代表任天堂素材获得 MIT 授权。** 上游明确说明：原版图像、声音与游戏设计归 Nintendo 所有。本页保留这一边界，为非官方网页演示，与 Nintendo 无隶属或认可关系。它们也不因本站采用 AGPL 而改用 AGPL；再分发或商业使用前需自行确认这些素材的使用权。

## 本地修改

- `host.js`、`index.html`、`game.css`：中文页面、开始 / 暂停 / 重开 / 通关 / 结束界面，三次生命、最佳金币、触屏多指、音量开关与可用时的全屏。
- `upstream/js/game.js`：768 × 720 正确比例画布，关闭插值，以固定 60Hz 步进保留上游按帧运动参数；停止后台累积，接入本地页面、音频与会话。
- `upstream/js/input.js`：重写为键盘与多个触点独立的输入来源集合，保留 `isDown` / `reset` 接口。
- `upstream/js/resources.js`：修正本地素材路径，处理图片载入失败与已载入的回调。
- `upstream/js/player.js`：修正火焰变身时 `powerSizes` 缺少赋值、受伤无敌计数越过零、死亡会话重生；将通关后每帧创建延时重开改为单次通关回调。
- `upstream/js/flag.js`：通关音乐延迟由模拟时间调度，暂停与重开可停止或清空。
- 其余地图、精灵、音频与玩法类保留上游实现。没有声称逐帧复现 NES 的原始物理或全部漏洞。

## 验证

安装了 Playwright 的开发环境中运行：

```powershell
node games/arcade/super-mario/browser-test.cjs
node scripts/check-navigation.mjs
```

也可通过 `NODE_PATH` 指向已有 Playwright，通过 `PLAYWRIGHT_BROWSERS_PATH` 指向已有浏览器。检查脚本启动临时本地 HTTP 服务并在退出时关闭，覆盖真实键盘、原生 CDP 三指触屏、暂停/失焦、物品与怪物碰撞、地下水管往返、生命耗尽、通关、重开、存储禁用、60/144Hz 一致性和目录入口。复杂关卡场景通过布置玩家位置后执行真实引擎步进验证，并非全关卡人工无辅助通关。

截图与机器结果：`docs/audit/evidence/super-mario/`。测试分辨率：1366×1050、390×844、320×740、720×1280、1080×2400。桌面 Chromium 自动化与手机触控模拟已验证；未实测实体手机、Safari、屏幕缺口安全区域及其他浏览器。游戏仅中文，游戏厅卡片支持中英文。
