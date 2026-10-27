# 黑洞吞噬城市

本站中文本地版基于 Voodoo 的 [Hole.io](https://poki.com/zh/g/hole-io) WebGL 2.20.4 构建。保留原游戏的场景、人物、黑洞、动画、音效、关卡和游戏规则，并针对本地游玩调整界面与服务接口。原版权归原权利人；资源来源与响应 SHA-256 见 `runtime/source-manifest.json` 和仓库根目录 `THIRD_PARTY_NOTICES.md`。

通过网站「游戏」目录启动，或者运行本站本地服务器后访问 `games/arcade/hole-city/index.html`。游戏使用 WebGL 2、WebAssembly 和浏览器 gzip 解压，建议使用较新的 Chrome、Edge 或 Safari。首次载入约 77 MB 的引擎及素材；实际请求量按进入的地图变化。

- 鼠标按住拖动，或触屏按住并拖动，控制原版摇杆；桌面也可使用方向键或 WASD。
- 开始后的原版初始关卡为 4 分钟，在城市中吞噬物件并达成 500 分目标。地图和之后的关卡沿用原版。
- 界面文本、目标与等级提示已补充中文；原版用户名和对手昵称保留。后期关卡及所有动态活动文字尚未逐一验证。
- 广告接口使用本地完成回调，原视频奖励可直接领取；视频广告图标换成原版星形奖励图标。已隐藏原版购买与去广告促销入口，未接入外部支付服务。
- 运行期间对外部 fetch、XHR 和信标请求使用本地处理，资源从本项目加载。一次完整初始关卡与奖励操作的检查中没有外部请求。
- 当前桌面浏览器测试在进入对局时记录到一条 Unity `NullReferenceException`；首局仍可移动、计时、吞噬并在结束后继续。原始构建的对应操作日志尚未成功对照，原因与后续影响未确认。

## 文件和来源

`index.html` 是正式入口；`local-runtime.js` 负责 Unity 加载、中文本地桥接及键盘操作；`runtime/` 包含压缩引擎、全部 13 个已识别的 Addressables 资源包及来源记录。原版内置中文字体不包含本地新增的全部文字，补字图集使用 Noto Sans SC；SIL OFL 1.1 许可见 `runtime/NotoSansSC-OFL.txt`。

前一版独立原型的 `game.mjs`、`game.css`、`core.mjs` 和 `core.test.mjs` 暂时保留供对照，不被正式入口加载，其测试不能作为 Unity 版本的验证。

`scripts/localize.py` 和 `scripts/stage-runtime.py` 记录本次资源适配方法。重新生成需要在 `.local-tools/hole-original/` 准备正常原页捕获的 `captured/`、NotoSansSC.ttf，以及 UnityPy 1.25.4、Pillow、NumPy、SciPy；先执行 `stage-runtime.py`，再执行 `localize.py`。生成脚本针对本次捕获的版本和资源标识，不能直接用于其他更新版本。

## 验证

```powershell
node games/arcade/hole-city/verify-resources.mjs
node scripts/check-navigation.mjs
node scripts/check-site-links.mjs
```

浏览器测试依赖 Playwright 和 Chromium，可通过环境变量 `PLAYWRIGHT_MODULE`、`PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定现有安装：

```powershell
node games/arcade/hole-city/browser-smoke.mjs
node games/arcade/hole-city/browser-smoke.mjs --full
node games/arcade/hole-city/mobile-smoke.mjs
```

`--full` 等待完整初始关卡并点击结束后的免费奖励；测试结果和截图存于 `docs/audit/evidence/hole-city/replica/`。已验证桌面、390×844 触控模拟、4 分钟对局、结束奖励及本地资源加载。实体手机性能、所有地图和后期进度尚未完整测试。REA 观察及其边界见 `docs/audit/evidence/hole-city/reference/observations.md`。
