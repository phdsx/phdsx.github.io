# 登山赛车 Lite：中文本地版

基于 Fingersoft 的 [Hill Climb Racing Lite](https://poki.com/zh/g/hill-climb-racing-lite) 1.3.0 浏览器构建，保留原版 Defold/WebAssembly 引擎、物理模拟、车辆、关卡、美术和音频；在本地增加中文，移除网络广告服务，并将原有广告奖励改为直接免费领取。游戏内金币仍用于原版车辆和升级；没有接入真实货币购买。

原程序、美术、音频与商标归 Fingersoft 等原权利人所有；未找到独立的再分发许可。中文补字来自 Noto Sans SC，SIL OFL 1.1 许可见 `runtime/NotoSansSC-OFL.txt`。游戏作品与第三方组件不因本站源码采用 AGPL 而改变原有权利归属。细节见 `REA_FINDINGS.md` 和仓库 `THIRD_PARTY_NOTICES.md`。

## 游玩

在仓库根目录运行 `node scripts/serve-site.mjs 8206`，访问 `http://127.0.0.1:8206/games/arcade/hill-climb/index.html` 或从游戏大厅进入。游戏数据和字体图集均随项目提供，运行时不需要广告、支付、统计服务或外部字体。

- `→` / `D`：油门；`←` / `A`：刹车；空中使用踏板调整姿态。
- 手机可按住两侧的原版踏板驾驶。原版右上角按钮打开暂停菜单。
- 重新抽选、免费升级等原广告奖励现在直接免费领取。正常金币升级和解锁沿用原版价格及进度。
- 原版存档由引擎保存在浏览器的 IndexedDB 中；新旧版本存档不跨设备同步。
- 首次启动时会把之前“山野爬坡”的金币转入新存档，同时保留原存档快照。之前的车型和升级采用另一套规则，不能自动换算；原始数据保留在 `localStorage` 的 `phdsx-hill-climb-v1` 中。

## 构建与验证

`runtime/` 为本地运行包，包含原引擎、资源和重新打包的本地化修改。`localization/zh-CN.json` 包含原版翻译表及界面补充文案；`patches/` 包含平台、字体文本和存档适配；`tools/` 中的工具用于解包和重新打包已取得的原版文件。

重新生成需要已取得的原始 1.3.0 分片、Python Pillow 和 Noto Sans SC 可变字体。默认原始文件位于 `.local-tools/hill-climb-original/`，字体位于 `.local-tools/hole-original/NotoSansSC.ttf`；可分别通过 `HCR_SOURCE` 和 `HCR_FONT_PATH` 指定其他路径。已附带的运行包不需要这些构建依赖。

```powershell
python games/arcade/hill-climb/tools/unpack_hcr.py
python games/arcade/hill-climb/tools/extract_source.py
python games/arcade/hill-climb/tools/build-local.py
node scripts/check-navigation.mjs
node scripts/check-site-links.mjs
node scripts/test-hill-climb-native.mjs
```

浏览器回归脚本默认复用本仓库天坛项目的 Playwright；如有不同安装位置，可设置 `PLAYWRIGHT_MODULE` 和 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`。截图与结果位于 `docs/audit/evidence/hill-climb-native/`。