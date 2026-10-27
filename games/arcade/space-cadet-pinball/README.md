# 三维弹球 · 太空军校生

本站的中文浏览器适配，使用 SpaceCadetPinball 的真实球台和引擎，保留碰撞、发射力度、缓冲器、坡道、任务、军衔、计分、三球规则、晃台与 TILT，以及原版音效。

## 来源与许可

- 原始反编译引擎：[k4zmu2a/SpaceCadetPinball](https://github.com/k4zmu2a/SpaceCadetPinball)。Copyright (c) 2020–2021 Andrey Muzychenko，MIT。
- 浏览器移植：[alula/SpaceCadetPinball](https://github.com/alula/SpaceCadetPinball)。[上游演示](https://alula.github.io/SpaceCadetPinball/)。本站于 2026-10-26 下载其公开演示中的 JS、WASM 和配套资源包，三个文件均未修改。
- 完整引擎许可保留在 [engine/LICENSE](engine/LICENSE)，固定文件、大小和 SHA-256 见 [engine/manifest.json](engine/manifest.json)。
- `SpaceCadetPinball.data` 中的原版图像、球台、字体、音乐、音效及游戏名称属于 Cinematronics、Maxis、Microsoft 等原权利人。引擎的 MIT 许可证和本站的 AGPL 许可证均不授予这些游戏素材的权利。上游公开提供资源不等于将资源以 MIT 开源；再分发及使用需单独考虑原资源的权利。
- `cover.webp` 来自本地运行球台的截图，适用同一素材权利边界。本站未使用 lrusso 等无单独许可证的下游封装代码，未加入外部广告、分析脚本或第三方 iframe。

## 本站适配

`index.html`、`pinball.css`、`pinball.js` 是中文外壳；`runtime.html`、`runtime.js` 在同源 iframe 中承载 SDL/Emscripten 引擎，隔离键盘捕获和画布尺寸。加载资源约 7 MB，全部使用站内相对地址，兼容子路径托管；无需后端或外部 CDN。

提供显式开始、加载进度、失败重试、新游戏、暂停、音效开关、全屏和多点触控按钮。切换标签页自动暂停，取消触控或失焦释放输入。原版英语球台提示和内置菜单保留。游戏分数保留至当前页面关闭；不承诺跨刷新保存。

在引擎启动前提供本机 INI 配置，使更新率和绘制率均为 60 Hz，匹配上游浏览器循环，避免默认更新/绘制比例使浏览器只能约 30 FPS 绘制。引擎二进制未修改；背景 MIDI 默认关闭，保留原版游戏音效。

| 操作 | 键盘 |
| --- | --- |
| 左 / 右挡板 | Z、A、← / /、D、→ |
| 蓄力发球 | 按住空格或 ↓，松开发射；充分蓄力约 2–3 秒 |
| 晃台 | X、.、↑；过度晃动会 TILT |
| 新游戏 / 暂停 | F2 / P、F3 |
| 声音 | F5 |

## 本地验证

从仓库根目录通过 HTTP 静态服务器打开 `games/arcade/space-cadet-pinball/index.html`。`file://` 不支持此 WebAssembly 资源加载流程。本站预览服务器：`node scripts/serve-site.mjs 8194`。

无需依赖的资源完整性和栏目接入检查：

```sh
node --test games/arcade/space-cadet-pinball/tests/integration.test.mjs
node scripts/check-navigation.mjs
```

浏览器回归需要 Playwright 与 Chromium，支持 `PHDSX_PLAYWRIGHT_MODULE` 指定模块绝对路径、`PHDSX_CHROMIUM` 指定浏览器路径，输出目录可用 `PHDSX_PINBALL_EVIDENCE` 指定（默认 `.local-tools/pinball-qa`）：

```sh
node games/arcade/space-cadet-pinball/tests/browser.mjs
```

覆盖实际 WASM 加载、挡板像素变化、蓄力和发球、暂停恢复、新游戏、声音、触控取消与双挡板、窄屏布局、全屏、错误重试、栏目筛选，以及实际引擎帧率与输入至渲染变化的测量。实机 iOS/Safari、长期任务通关和原版内置菜单里的自定义键位未包含在自动测试中。
