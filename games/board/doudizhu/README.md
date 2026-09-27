# 斗地主（纯前端单机版）

直接部署本目录及其文件到静态网站，即可通过 `index.html` 游玩。本站入口位于 `games.html`。不需要 Node.js 服务端、MySQL、账户或网络接口；牌局和两名电脑玩家都在浏览器中运行，战绩存放在本机 `localStorage`。

本版本根据 [tinyshu/ddz_game](https://github.com/tinyshu/ddz_game) 的斗地主玩法需求重新实现，没有复制该项目的 Cocos Creator 客户端、服务端代码或素材。它提供单机人机对战，不包含原项目的在线房间、用户系统和联网对战。

在仓库根目录启动任意静态文件服务器后，打开 `/games/board/doudizhu/index.html` 即可本地预览。规则测试：

```sh
node --test games/board/doudizhu/rules.test.mjs
```
