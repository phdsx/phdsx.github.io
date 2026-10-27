# 点球大战 2 · 中文本地版

根据 [Penalty Shooters 2](https://poki.com/zh/g/penalty-shooters-2) 发布的浏览器版本建立的本地适配。保留原游戏的 Construct 运行时、比赛事件、球员和门将动画、球场、音效、联赛与球队数据；中文采用同位置的动态字体渲染，不修改内部英文标识和比赛判定。

- 12 个联赛入口、11 组虚构俱乐部和 48 队全球杯；原版小组赛、淘汰赛和点球规则由原游戏事件控制。
- 使用鼠标或触屏：射门时按住并松开，守门时按住移动并松开扑救。比赛中的操作提示采用中文。
- 游戏画面及数据均由本地文件提供，不加载广告 SDK。原来需要观看视频的重试、抽签等操作通过本地回调直接完成；有关广告的按钮图案和提示改为普通操作。
- 本地不连接原平台的账号、分享、实时国家排行榜和在线成绩服务；全球杯本身仍可进行。声音等原游戏存档使用浏览器本地存储，旧版原创原型存档不会被清除，也不会被本版读取。
- 中国字体由系统提供，数字等不需翻译的文字仍使用原版位图字体。原版游戏标志与比赛画面中的品牌文字作为原作美术保留。

## 运行

在仓库根目录运行 `node scripts/serve-site.mjs 8194`，访问 `http://127.0.0.1:8194/games/sports/penalty-cup/index.html`，或在游戏页面选择“点球大战 2”。需要通过 HTTP 服务加载；直接双击 HTML 不支持浏览器模块和本地资源安全规则。

## 原版与本地修改

`play/` 中大部分文件来自上游发布版本 `47a81ce0-7223-495d-be4a-41778fafb74f`。原文件清单与 SHA-256 见 `source-manifest.json`；本地适配修改了下列文件：

- `play/data.json`：让原广告视频图标复用原游戏的普通蓝色按钮图案，不改游戏事件和比赛数据。
- `play/scripts/main.js`：用无联网、无广告、本地完成的回调替换平台 DOM 适配器；奖励操作即时可用，外部账号和在线提交不可用。
- `play/scripts/c3main.js`、`play/local-bridge.js`、`play/penalty-zh.js`、`play/club-names.js`：加入就绪通知与中文显示层，保留原有对象、碰撞、积分、逻辑比较和动画。
- `play/scripts/project/javaScriptInEvents.js`：不再屏蔽浏览器控制台，便于排错。
- `play/select.css`：删除原文件中指向未提供背景图的注释引用，实际样式未改变。
- `play/index.html` 和外层页面：本地启动、加载失败提示与全屏控制。

游戏原作者为 10x10games。原程序、图像及音频的权利不因本仓库自身许可证而改变；详见仓库的 `THIRD_PARTY_NOTICES.md`。来源检查未发现原游戏独立的再分发许可证。

## 验证

```powershell
node scripts/check-navigation.mjs
# 设置 NODE_PATH 指向包含 Playwright 的 node_modules，必要时设置 CHROMIUM_PATH。
node games/sports/penalty-cup/browser-test.cjs
node games/sports/penalty-cup/retry-test.cjs
```

浏览器验证检查原版资源摘要、中文联赛和队名、选队、小组赛、真实射门、声音设置及重新加载、全球杯、手机触控和请求情况。证据保存于 `docs/audit/evidence/penalty-cup/rea/`。额外进行了完整一场小组赛的鼠标实测，比赛正常回到积分榜；实测重踢按钮可直接重新罚同一球，未发出外部请求。

已使用 Chromium 模拟手机视口及触摸，尚未使用实体手机、Safari、完整夺冠赛程或所有联赛逐一验证。游戏本身没有服务端，未发布上线。
