# 本站接入

公开入口为上级目录的 `index.html`，地图工作区为 `scene.html`。原始 React 页面、业务逻辑、公开数据和来源说明保留在上级目录；原包的 Sites / Vinext 配置仅作为源码保存，本站构建不使用它们。

```powershell
npm ci
npm run build
npm test
npm run typecheck
npm run check:workflow
npm start
```

构建生成静态客户端与仓库根目录 `.worker/site.mjs`。根目录 `wrangler.jsonc` 使用此 Worker，只有 `/tools/lifestyle/pokemon-map/api/*` 请求进入数据接口，其他请求交给 `ASSETS`。

`npm start` 启动仓库级预览服务，默认地址为 `http://127.0.0.1:8194/tools/lifestyle/pokemon-map/index.html`；也可在仓库根目录运行 `node scripts/serve-site.mjs 8194`。该服务同时提供静态文件和数据接口。Windows 使用随源码保留的标准 PowerShell 匿名 HTTP 传输读取 PogoMap 目录。

地图 worker、宝可梦配图、API 和快照地址使用页面相对路径。本地预览服务或 Cloudflare Worker 提供实时接口；GitHub Pages 使用下面的定时静态快照。浏览器不直接请求缺少 CORS 的上游。授权、限流和访问失败保留来源状态，PogoMap 的固定参考目录继续标明采集日期。

仅从上游新建匿名会话，不读取或转发访客 Cookie 和授权头。道馆目录按打开时读取且共享一分钟请求缓存，宝可梦与动态设施保持原五分钟刷新规则。

## GitHub Pages

GitHub Pages 不运行根目录的 Cloudflare Worker，因此旧版 `/api/snapshot` 会返回 404。仓库工作流 [Deploy GitHub Pages](../../../../.github/workflows/pages.yml) 构建地图、采集实际公开数据，并把五个接口的响应保存为同目录 `data/*.json` 和 `data/*.json.gz`，随整个站点一起发布。数据只存在于部署产物，不持续提交进 Git 历史；部署结束删除上传产物，避免五分钟更新积累大量存储。

首次启用：

1. 将修改推送至默认分支 `master`。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Actions → Deploy GitHub Pages → Run workflow** 运行一次，等发布成功。

之后在默认分支推送时发布，并每五分钟安排一次采集。GitHub 调度、上游请求和部署可能延迟；公共仓库长期无活动时，GitHub 可能停用定时工作流。页面显示实际采集时间，旧快照明确提示，到期宝可梦及活动自动移除。页面每五分钟和点击“读取最新快照”只读取最新已发布文件，不能要求 GitHub Pages 现场请求上游。道馆/静态 Stop 仍只在页面打开时读取最新已发布版本。

上游授权或限流如实保留；锁定坐标不会导出。全部宝可梦来源读取失败时，采集步骤失败，停止新部署，线上继续提供上次发布版本，页面按原采集时间显示过期状态。部分来源失败时保留其失败状态，当前页面的可用旧缓存按原逻辑处理。

本地验证静态数据（生成的文件已被 Git 忽略）：

```powershell
npm run export:data
```

通过任意静态服务器打开地图时，同站 API 返回 404/HTML 会自动改读 `data/`。带真实 API 的本地服务与 Cloudflare 继续使用 API；真实 API 的 502 等服务错误不会被静态快照掩盖。

官方说明：[Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[定时工作流限制](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。

## 实时坐标搜索

新增 `GET /tools/lifestyle/pokemon-map/api/radar-search?lat=40.758&lon=-73.9855&radius_km=2&layers=spawns,raids,quests`。接口先校验坐标、1–15 km 半径和类别，再转发至公开 iFlowGo nearby；仅接受固定上游，忽略访客 Cookie 与授权头。同参数共享五分钟缓存与在途请求，手动刷新遵守两秒最小间隔，最多保留 64 组缓存。页面在用户点击搜索后启动五分钟定时器；其他来源保持原有缓存策略。

本地 `npm start` 和 Cloudflare Worker 同时提供这个实时接口，无需额外配置。GitHub Pages 本身没有计算后端，且 iFlowGo 未提供跨域响应头，不能用静态文件实现任意坐标搜索。要在 GitHub Pages 使用它，先将本仓库 Worker 部署到可访问的服务域名，再在仓库 **Settings → Secrets and variables → Actions → Variables** 设置 `POKEMON_RADAR_API_ORIGIN` 为该域名（例如 `https://your-worker.workers.dev`）。Pages 工作流构建时自动写入页面 meta 配置；公开搜索接口提供 CORS。此配置不包含凭证。

手动构建可使用：

```powershell
$env:POKEMON_RADAR_API_ORIGIN = 'https://your-worker.workers.dev'
npm run build
```

未配置服务的纯静态版本会明确提示“当前站点未连接坐标搜索服务”；不会把纽约固定试点或其他发布快照当作用户新地点的实时结果。区域来源仍可使用上节的静态快照。没有执行自动部署。
