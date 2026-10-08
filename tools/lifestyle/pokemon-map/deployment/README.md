# 本站接入

公开入口为上级目录的 `index.html`，地图工作区为 `scene.html`。原始 React 页面、业务逻辑、公开数据和来源说明保留在上级目录；原包的 Sites / Vinext 配置仅作为源码保存，本站构建不使用它们。

```powershell
npm ci
npm run build
npm test
npm start
```

构建生成静态客户端与仓库根目录 `.worker/site.mjs`。根目录 `wrangler.jsonc` 使用此 Worker，只有 `/tools/lifestyle/pokemon-map/api/*` 请求进入数据接口，其他请求交给 `ASSETS`。

`npm start` 启动仓库级预览服务，默认地址为 `http://127.0.0.1:8194/tools/lifestyle/pokemon-map/index.html`；也可在仓库根目录运行 `node scripts/serve-site.mjs 8194`。该服务同时提供静态文件和数据接口。Windows 使用随源码保留的标准 PowerShell 匿名 HTTP 传输读取 PogoMap 目录。

地图 worker、宝可梦配图和 API 地址使用页面相对路径。实时数据必须通过本地预览服务或 Cloudflare Worker 读取；纯静态服务器和 GitHub Pages 不提供接口，页面会提示数据服务未连接，不再使用无法可靠读取来源的浏览器直连。授权、限流和访问失败保留来源状态，PogoMap 的固定参考目录继续标明采集日期。

仅从上游新建匿名会话，不读取或转发访客 Cookie 和授权头。道馆目录按打开时读取且共享一分钟请求缓存，宝可梦与动态设施保持原五分钟刷新规则。
