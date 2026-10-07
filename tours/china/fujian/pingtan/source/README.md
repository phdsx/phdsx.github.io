# 平潭 · 海坛岛三维地理漫游

可运行的 Three.js 项目，真实海岸线、公开高程、历史卫星影像与局部石厝外观样板。**这是米制地理场景，不是整岛摄影测量模型。** 当前不足见 [精度清单](docs/ACCURACY.md)，不可将未测量的建筑、植被或海水细节当作实测结果。

## 启动

需要 Node.js 20.19+ 或 22.12+，支持 WebGL 2 的浏览器。锁定 Three.js 0.180.0、Vite 7.3.6，Playwright 1.55.1 仅用于测试。

```powershell
cd D:\code\html\phdsx.github.io\pingtan
npm ci
npm run dev
```

打开 `http://127.0.0.1:5186/`。开发入口 `index.html` 使用 Vite 解析模块；请通过 HTTP 服务运行。

```powershell
npm run build
node scripts/static-server.mjs dist 5187
```

打开 `http://127.0.0.1:5187/`。`dist/index.html` 是可部署的静态入口，连同 assets/data/textures/docs 目录复制即可。构建后无 CDN、账号、地图密钥或外网运行依赖。仓库另提供静态副本 `tours/china/fujian/pingtan/index.html`；未推送或发布网站。

也可解压本目录的 `pingtan-static.zip`，在解压目录运行 `node serve.mjs . 5187`。静态包无需 npm 安装，包含完整运行数据、验收截图及 `source/` 对应源代码。重新打包可在构建后运行 `python scripts/package-static.py`；研究参考照片自动排除。

## 文件

```text
pingtan/
├── index.html                    开发入口
├── package.json / package-lock.json
├── src/
│   ├── main.js                   启动、画质、渲染循环、失败提示
│   ├── geo.js                    WGS84 → UTM 50N → 局部米制
│   ├── load.js                   有超时和错误信息的本地数据接口
│   ├── terrain.js                1600m 地形块，40/80/160m LOD
│   ├── ocean.js                  岸距渐变、波纹法线、反射、泡沫
│   ├── features.js               真实道路与建筑轮廓的空间合批
│   ├── details.js                北港样板、林地实例、真实点位风机
│   ├── coasts.js                 真实沙滩多边形、干湿沙、北部/北港岩岸
│   ├── train.js                  照片参考双层观光车、明确标记的示意轨迹
│   ├── landmarks.js              镜沙洞腔、仙人井、双石帆、真实岛岸上的近似岩体
│   ├── materials.js              PBR 与自制材质
│   ├── lighting.js               天空、太阳、环境光、局部阴影
│   ├── navigation.js             鸟瞰、飞行、定位、离地保护
│   ├── ui.js / style.css
├── public/
│   ├── data/                     geography.json、terrain.json、f32、影像、来源清单
│   ├── textures/                 本地 CC0 材质与许可清单
│   └── docs/                     随运行项目交付的资料说明
├── scripts/                      下载、UTM 数据预处理、检查、浏览器测试、静态服务
├── research/                     原始 OSM、影像许可元数据、校验和、处理记录
├── docs/                         来源、精度、扩展数据接口、验收
├── evidence/                     实际截图、对照、测试原始结果
└── dist/                         npm run build 生成的静态入口
```

统一景观覆盖见 [LANDSCAPES.md](docs/LANDSCAPES.md)：15处可定位浏览，按北/东/南/西岸及内陆分组，19项景观状态记录。包括镜沙、仙人井、石牌洋、猴研岛、象鼻湾、君山、将军山、南寨山、澳前及原有海岸区域。大福湾桥梁、沙地底精细沙丘与古城建筑仍缺资料；离岛景点不挪到主岛。位置有准确数据与区域约位之分，洞穴、竖井、岩体为近似，不是测绘/摄影测量复刻。

## 操作

左键/单指旋转；滚轮/双指缩放；右键/双指平移。景点按钮与方位图可平滑定位；“景点近景”进一步靠近。北港有“观察石厝样板”按钮。

飞行模式：拖动视线，WASD 移动，Q/E 降低/升高，Shift 加速；触屏有方向按钮。H 回全岛，F 切换飞行。离地至少 2.5m，可在地形范围与周边 20km 示意海域飞行；建筑内部碰撞未实现。鸟瞰相机可退到海上以容纳整岛，空间尺度不缩放。

日光使用 2026-10-07 中国标准时间的近似太阳方向。地名、画质、说明与 PNG 截图可交互。手机默认轻量：DPR 上限 1、160m 远地形、关闭阴影、收起景点面板。标准/精细按需细化附近地形，增加植被范围和局部阴影。细化是网格 LOD，不能提高原始 DEM 精度。

## 数据与真实性

真实主岛 OSM 闭合岸线 3779 个节点，约 21.24×30.03 km 的 UTM 包络；本次轮廓计算面积约 289.2 km²，不是官方面积。原点 `119.78°E,25.53°N`，EPSG:32650，X 网格东、Y 上、Z 网格南，**1 单位＝1 米**，高程无夸大。

道路按地图中心线，建筑仅在已映射轮廓上生成。植被限定在映射林地，不撒满整岛；单株位置、石块、道路宽度、未标注高度是近似。北港仅两处映射建筑做精化，未补造其余 239 座房屋。风机依地图点位，未标注机型和尺寸为类型化估计。

DEM 源格网为 1 角秒，约 28×31m，显示采样 40m；岸边约 85m 平滑接海。`elevation-raw.f32` 保留原值，`surface.f32` 保留修改值。2016 Sentinel-2 合成影像分布真实但非现状，原始可见波段约 10m，运行贴图约 14m。浅海颜色按岸距模拟，不是水深。

镜沙洞腔约8×14m、仙人井周边约100m采用明确标记的参考几何替换粗DEM显示，并提供对应的视觉地面高度；未改写原始高程，也不声明局部模型是测量结果。洞壁和建筑内部尚无完整碰撞。

完整出处和许可在 [SOURCES.md](docs/SOURCES.md) 与 `public/data/sources.json`。自编代码沿用仓库 AGPL-3.0 许可，地理数据、CC0 材质及 Three.js 有各自许可，不受仓库代码许可证替代。

## 验证与补充资料

```powershell
npm run check
npm run test:browser
```

浏览器测试默认读取本机 Playwright Chromium 路径，可设置 `CHROMIUM_PATH`；设置 `TEST_URL` 可测试静态产物。也可先 `npx playwright install chromium`，再将所安装路径写入环境变量。实测配置、截图和限制见 [验收记录](docs/ACCEPTANCE.md)；未测试真实手机。

更新数据：`powershell -File scripts/fetch-data.ps1`，然后依次运行 `python scripts/prepare-data.py`、`python scripts/prepare-landmarks.py` 和 `node scripts/update-landscape-docs.mjs`（Python 3、numpy、Pillow 和 Node.js）。运行时已附预处理资料，正常浏览无需 Python 或重下载。详见 [高精度数据接入](docs/EXTENDING.md)。

新增沿海内容：长江澳真实跨潮间带沙滩、81个真实海上风机与独立定位、龙王头双层观光小火车（轨迹示意）、坛南湾和北部岩岸。海水浪花按独立可视岸线场计算；原始地理岸线不变。小火车观察按钮位于龙王头景点。
