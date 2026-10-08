# 颐和园实时三维游览

Vite 7.3.6 + JavaScript + Three.js 0.180.0。覆盖昆明湖、西堤、南湖岛、万寿山前后山、长廊、中轴宫苑、苏州街与谐趣园。地理位置取自公开地图，连续地形取自公开 DEM；主要景点使用定制曲面、桥券、瓦垄、梁架、柱列、窗棂、石船舱楼等几何。226处地图建筑轮廓按分层细节呈现，另有一处近似新建宫门区模型。所有运行资源在项目内。

此项目是**真实米制布局下的可游览近似复原**。建筑立面、局部高程、植被和彩绘仍有显著简化，不能称为测绘级或照片级“1∶1还原”。已核实尺寸、估计方法和误差逐项记录在 [精度说明](docs/ACCURACY.md)。

## 启动与构建

需要 Node.js 20.19+ 或 22.12+（实际开发使用 Node.js 24）。在本目录执行：

```powershell
npm ci
npm run dev -- --port 5183
```

打开终端显示的本地网址。不能直接双击 HTML 使用 `file://`，因为模块和 JSON 需 HTTP 服务。

```powershell
npm run build
npm run preview -- --port 5184
```

将整个 `dist/` 上传到静态服务器。Vite 使用 `base: './'`，支持部署至 GitHub Pages 子目录，例如 `/summer-palace/`；保留 `data/`、`textures/` 和 `assets/` 目录。启动时无需访问外部模型或 CDN，资料链接仅在用户主动查阅时打开。

`delivery/summer-palace-source.zip`为源码、数据、说明与实际截图；`delivery/summer-palace-static.zip`为可直接上传的静态构建产物。归档不包含版权保留的官方研究照片、node_modules或开发缓存。

## 操作

- 鸟瞰：左键旋转、滚轮缩放、右键平移；移动端双指缩放和平移。
- 步行：WASD，按住左键观察，双击锁定鼠标，Esc释放。视高1.7m、步速1.5m/s、Shift3m/s。
- 景点跳转、小地图点击跳转、地图与景点列表折叠、全园重置、长廊自动游览、低/中/高画质。
- 水面禁止步行；桥面和台阶提供独立地面检测；建筑内部和园墙有基础碰撞。移动端提供触控鸟瞰与跳转，不提供虚拟步行摇杆。

## 文件

- `src/`：场景、地形、核心建筑、实例化枝叶、PBR材料、导航和UI。
- `public/data/`：局部米制布局、园区DEM、周边DEM、来源清单。
- `public/textures/`：本地CC0 PBR贴图、修改记录。
- `research/`：OSM原始数据、DEM原瓦片、仅研究使用的官方照片/示意地图。**部署只使用dist，不发布研究照片。**
- `scripts/`：数据提取、材质预处理、数据检查及浏览器测试。
- `evidence/`：实际Chromium运行截图和JSON测试记录。
- [来源与素材许可](docs/SOURCES.md)、[精度与未解决误差](docs/ACCURACY.md)、[验证记录](docs/TESTING.md)。

## 复验

```powershell
npm run check
npm run build
$env:CHROMIUM_PATH = '本机Chrome或Chromium可执行文件绝对路径'
$env:TEST_URL = 'http://127.0.0.1:5183/'
npm run test:browser
```

浏览器脚本使用Playwright驱动本机Chromium，运行三档画质采样并保存截图及报告；不需要服务器账户。默认浏览器路径仅适用于此次开发设备，其他设备需设置 `CHROMIUM_PATH`。地图提取和材质预处理脚本另需Python+Pillow，运行页面不需要Python。
