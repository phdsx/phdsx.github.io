# 我的文字修仙全靠刷：PHDSX 网页版

原作：[谦君（Jun Qian）的 vue-xiuxiangame](https://github.com/setube/vue-xiuxiangame)，版本 `39eecbf6e94f081893ba9c487d05edb8b131b4f7`。

本站于 2026-09-27 将原项目适配为可在 `games/strategy/xiuxian/` 子目录直接访问的静态网页。改动包括：移除原页面的第三方统计脚本、PWA 服务工作线程和构建混淆，增加返回游戏厅链接与原作署名，修正一处 CSS 选择器错误和手机端横向溢出。随后移除游戏设置中的官方群聊入口及相关提示，并加入本地存档编辑器。游戏逻辑与本地存档保留。

存档编辑器在游戏设置中打开，也可通过 `index.html#/save-editor` 进入。它能读取游戏导出的加密 JSON 或当前浏览器存档，编辑 `player`、`boss` 后重新加密下载。下载的新文件可用游戏设置中的“导入存档”使用；编辑器不会自动覆盖现有存档。建议保留未修改的原文件备份。

源码在 `src/`，页面模板在 `source.html`。运行 `npm install --legacy-peer-deps` 后执行 `npm run build`，会将静态文件生成至本目录的 `index.html`、`assets/` 等路径。网站部署时无需 Node.js。

本游戏源码、素材及本站改编部分遵循 [CC BY-NC 4.0](LICENSE)，仅供非商业使用。
