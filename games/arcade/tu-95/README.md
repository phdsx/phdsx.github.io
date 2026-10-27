# TU-95 中文版

本目录的入口使用原版 TU-95 Flash 游戏，借助本地 Ruffle 运行；原版画面、音效、操控和六项任务保留。菜单、教学、任务文字与仪表标签已汉化，赞助商画面、跳转及联网统计已移除；游戏入口不包含广告或内购。

通过网站游戏目录进入，或在仓库根目录运行 `node scripts/serve-site.mjs 8194`，访问 `http://localhost:8194/games/arcade/tu-95/index.html`。浏览器需支持 WebAssembly；直接以 file:// 打开时页面会提示改用 HTTP 服务。

- ↑ / ↓：加速 / 减速；← / →：调整机头。
- G：起落架；F：襟翼；空格：任务操作；H：跳伞。
- P / Esc：暂停；页面上方也有暂停、重开、静音和全屏按钮。触屏设备可同时按住多个方向。
- 六项任务：基础飞行、空中加油、风暴迫降、导弹规避、空降训练和轰炸演练；具体操作以游戏内说明为准。

`prototype.html` 保留此前独立制作的简化版本，不是当前游戏入口。

## 实现与验证

原始来源与逆向证据、修改范围及校验值见 `INVESTIGATION.md`。汉化映射和补丁工具分别在 `localization/` 和 `tools/`；原版版权归原权利人，Ruffle 和字体许可见 `engine/` 中的声明。

`original.browser-test.cjs` 使用 Playwright 和 Chromium 验证中文菜单、真实键盘与双指触控、暂停、声音、重开、不同宽度布局及无第三方请求；结果和截图在 `docs/audit/evidence/tu-95-original/`。原始和修改后的 SWF 结构对比由 `tools/verify_preservation.py` 执行。六关说明页均可访问，尚未逐关完整通关；实体手机和 Safari 未实机验证。
