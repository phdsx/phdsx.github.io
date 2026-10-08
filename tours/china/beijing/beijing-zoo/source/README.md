# 北京动物园 · Three.js 资料参考游览

已接入本站 `tours.html`，公开部署路径为 `tours/china/beijing/beijing-zoo/index.html`，内部场景入口是 `scene.html`。源码沿用现有景点的独立 Vite 工程方式，Three.js 0.180.0、Vite 7.3.6、JavaScript、HTML/CSS，所有运行资源本地打包。

**本版本是可自由观察和在已知游客道路上行走的米制三维参考场景，尚未完成实景级或测绘级 1∶1 复原。** 69 个地图建筑轮廓、115 段道路、7 片水面、8 个有轮廓的围场、54 个场馆/资料点位、41 条物种及类群记录；只有 1 只带纹理的非洲狮 GLB。没有使用几何体动物填充其余展区。历史记录和未知类群均明确标注，全部记录的 `currentConfirmed` 为 false。

## 本地运行

Node.js 20.19+ 或 22.12+（实际验证 Node 24.20.0），在仓库根目录执行：

```powershell
cd beijing-zoo
npm ci
npm run dev
```

在浏览器打开 Vite 打印的地址，默认 `http://127.0.0.1:5184/`；端口占用时自动顺延。本次实际开发地址为 `http://127.0.0.1:5185/`。需要支持 WebGL 的浏览器；不通过 `file://` 直接打开。

```powershell
npm run build
npm run preview
npm run check
$env:TEST_URL = 'http://127.0.0.1:5185/'
$env:CHROMIUM_PATH = 'C:/path/to/chrome.exe'
npm run test:browser
```

浏览器测试使用 Playwright，可指定现有 Chromium；没有浏览器时 `npx playwright install chromium`。测试脚本默认值是本次 Windows 主机上的 Chromium 路径，应在其他机器设置 `CHROMIUM_PATH`。数据检查不需要联网或浏览器。

## 构建与静态接入

```powershell
# 在 tours/china/beijing/beijing-zoo/source/ 内：构建并更新本站公开目录
npm run publish:local
# 或在仓库根目录只构建本景点
node scripts/build-tours.mjs --only beijing-zoo
node scripts/check-navigation.mjs
node scripts/check-site-links.mjs
```

Vite `base: './'`，保持资源相对路径。GitHub Pages 沿用仓库现有方式：提交公开目录、卡片图和相关入口文件即可，浏览器不执行构建。单独托管 `dist/` 时直接使用其 `index.html`；嵌入本站使用公开包装入口和 `scene.html`。不复制 `node_modules/`、`research/` 或开发源码作为运行资源。本次只生成本地公开产物，未推送或发布到远程。

可从仓库根目录运行 `node tours/china/beijing/beijing-zoo/source/scripts/serve-site.mjs` 进行公开目录预览，默认端口 5193，然后打开 `/tours/china/beijing/beijing-zoo/`。先确认输出端口，勿停止其他服务。

## 功能与数据

鸟瞰支持鼠标/触控旋转、平移和缩放；桌面步行 WASD、鼠标观察、约 1.7 米视高和 1.4 米/秒移动，Esc 释放鼠标。场馆跳转使用安全游客道路落点。建筑、围场和水体采用保守碰撞；地图信息不足的道路可能阻挡通行，不保证全园路线连通。小地图、动物/场馆查询、兽类/鸟类/爬行类筛选、来源弹窗、低中高画质、加载与资源失败提示均已实现。

`public/data/map.json` 是米制布局；`venues.json` 是场馆表；`species.json` 和 `species-distribution.csv` 是多对多分布表；`sources.json` 是来源表；`osm-derived-geography.json` 是可复算的 ODbL 地理子集。`missing-models.json` 列出 40 条缺模型记录。数据不会随时间自动刷新。

`src/geo.js` 负责地理转换；`navigation.js` 负责道路及碰撞；`scene.js` 负责实物三维、实例化植被、LOD、动物和资源释放；`main.js` 负责游览、查询及小地图。修改空间资料后先更新数据，再运行数据和浏览器验证。`prepare-data.mjs` 使用被忽略的研究原始文件，只供重新采集后复算，普通构建不依赖它；`package-assets.mjs` 可重复生成许可/缺模型清单。

详见 [来源与坐标](docs/SOURCES.md)、[覆盖与缺失](docs/COVERAGE.md)、[素材及许可](docs/ASSETS.md)、[实际测试](docs/TESTING.md)。真实运行截图和机器可读报告保存在 `evidence/`。
