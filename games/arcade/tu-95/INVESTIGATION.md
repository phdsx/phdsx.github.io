# TU-95 原版调查与修改记录

## 观察到的证据

- 参考页面：<https://www.silvergames.com/zh/tu-95>。REA 证据 `ev_44ff9d37ff6050f5342e9d5bd7f18de2f7f0c86557ff1f30764ae45af4085ae5` 显示页面嵌入游戏框架；`ev_211414056bd72276c53ad07d97dbe587605f00c3c56f54028c29d12f2ae54e75` 显示框架加载原版 SWF、Ruffle 和统计请求；`ev_fa512d95edb3cfee48aa7ee138ce0d00f55abea7a7f34f82472badce89e1ab04` 是原版加载画面。
- 原始 SWF 为 AVM1、670 × 450、24 fps、根时间线 31 帧，SHA-256 `be62063e0766abdb3ad719f05bdc6508e303bb89b52fec2d685d8151d31d0906`。静态调查发现 126 个文字标签和六项任务。六个任务说明页已通过原有跳关路径访问，不等于六关全部通关。
- 最终 `engine/TU-95.zh-CN.swf` SHA-256：`497fc8bb57c8f9fbb9b8d3b3e620c351e8473fe888fb15e1b8ef3c7bd4377f61`。运行时 Ruffle JS SHA-256：`00261ce1c38dedc2b23301bcfffc777cf40281e076d91ef5d2eed226b8155e1f`；核心 JS：`9317d5821b055770ef36b97244cf71f735587735da9f308c4bc52524b531f8a0`；WASM：`0744280de3332dc41d875a7867c5855f8acfdfdb0549861fade0f7d9174d767e`。

## 修改与推断边界

`localization/zh-CN.json` 对应原始静态文字；工具将中文字形加入嵌入字体并替换显示文字。仪表位图保持原样，使用嵌入静态字形及背景覆盖英文和俄文标签。只替换原始加载帧脚本、移除赞助商相关定义及实例；不重编译原游戏逻辑。最终文件不含明文 HTTP URL 或统计地址，宿主页额外限制外部连接。浏览器测试未观察到第三方请求；静态调查没有发现内购入口，但不能据此证明未触发的所有路径均不存在隐藏内容。

`tools/verify_preservation.py` 递归对比 SWF 标签，排除本次翻译、字体、加载流程及推广项后，19,977 个原始标签实例一致，未发现其他增删。它证明检查范围内的数据一致，不替代逐关实玩。详细临时调查输出在工作区忽略的 `.local-tools/tu95-original/`，补丁实现保存在本目录的 `tools/` 与 `localization/`。

Ruffle 和 Noto 字体的许可声明保存在 `engine/`。原游戏及美术归其权利人所有；参考页面可访问不代表获得再分发授权。
