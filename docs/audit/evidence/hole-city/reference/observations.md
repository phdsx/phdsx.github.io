# Hole.io 原版对照观察

- 参考地址：[Poki Hole.io](https://poki.com/zh/g/hole-io)，开发者 Voodoo。
- REA 场景证据 `ev_5741cbbc2e2b058945b7527819dc953f58a4c3055a7ba6f86099881d2ae71b5a`：正常游戏页面加载 Unity WebGL，游戏 iframe 请求 Unity 构建及其他资源。初始快照未等待引擎启动完成。
- REA 场景证据 `ev_18673b1947ca0cccf9b745b4e5401309afc51b7fcebc848b712d6951f27a7c2c`：等待原页加载后观察到紫色主菜单、城市立体模型、开始按钮及原版关卡入口。Unity 控制台表明载入了字体与共享资源。
- REA 场景证据 `ev_ce583ff4ff09889434466998f50acd76e27476fbdb316852edfb448ef75db893`：原页构建配置表明游戏版本为 2.20.4，Unity 版本为 6000.2.10f1。REA 响应内容单条预算为 64 KiB，较大的构建响应未保留；通过正常页面浏览器会话单独留存完整响应并在本地计算 SHA-256，见 `games/arcade/hole-city/runtime/source-manifest.json`。
- 原页随后进入对局的浏览器观察：初始关卡以 4 分钟倒计时和 500 分目标开始，使用拖动摇杆移动。后续关卡规则和完整购买流程没有穷尽观察，不能仅凭初始关卡断言全部关卡一致。
- REA 捕获仅代表当时可访问的 Poki 网页构建及可见场景；直接打开 CDN 页面得到 403，没有绕过该限制。资源均来自正常原游戏页面内的响应和同源目录请求。
