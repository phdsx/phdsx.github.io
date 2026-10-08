# 圆明园 · 1786 历史园林游览

Vite 7.3.6 + JavaScript + Three.js 0.180.0，可自由改变视角、米制步行的实时三维项目。运行资源全部在本地，没有用全景、照片或视频替代园区模型。

**这是有证据标注的历史近似研究版，尚不是完整、准确的1786园林复原。** 按用户开头的历史目标，选乾隆五十一年（1786），不制作混入完整历史建筑的现代遗址模式。西洋楼以同期铜版图为外观约束；多数中式建筑、岸线、色彩与植被为推测。47个景点、26组水系、17处岛屿孔洞覆盖圆明园、长春园与绮春园辅助范围；绮春园仅制作有建成年代依据的正觉寺，不能算完整复原绮春园。

## 启动

需要 Node.js 20.19+ 或22.12+。此次运行环境为 Node.js 24。

```powershell
cd D:\code\html\phdsx.github.io\yuanmingyuan
npm ci
npm run dev -- --port 5186
```

打开命令输出网址。此次开发预览为 http://127.0.0.1:5186/ 。模块、JSON与纹理需要HTTP服务，不能双击HTML通过file://运行。

```powershell
npm run check
npm run build
npm run preview -- --port 5187
```

`dist/index.html`是独立静态入口；`base:'./'`支持子目录部署。整个dist必须一同部署，保留assets、data、textures。

## 已接入当前站点

```powershell
npm run build
npm run deploy:local
node scripts/serve-repo.mjs
```

构建复制到仓库现有路径 `tours/china/beijing/yuanmingyuan/`，`scene.html`是场景入口，`index.html`为与其他景点一致的导航外壳。站点`tours.html`有新卡片。复制产物只准备本地文件，没有执行git push、发布或修改远端设置。

静态路径验证地址： http://127.0.0.1:5188/tours/china/beijing/yuanmingyuan/ 。

## 使用

- 鸟瞰：鼠标拖动旋转，滚轮缩放，右键平移；移动端单指旋转、双指缩放平移。
- 步行：WASD/方向键，拖动观察，双击锁定鼠标，Esc释放；1.7米视高、1.6米/秒，Shift3.2米/秒。
- 搜索、园区筛选、可折叠小地图、建筑点击、景点鸟瞰/安全步行定位、重置、石材近景、标签、低中高画质。
- 触屏提供鸟瞰与查询定位，不提供触控步行。
- 路线、灰绿展示桥及景点周边可通行区是虚拟导航辅助设施，**不是1786道路桥梁测绘复原**。水面无桥处、封闭建筑内部、辅助园界之外不能步行。

## 工程与证据

- `src/`：米制地景、定制屋顶及立面几何、LOD、实例化植被、水法、导航、界面。
- `public/data/layout.json`：地理原点、点位、水系与孔洞、导航线、四类证据；OSM派生数据库，ODbL 1.0。
- `public/data/sources.json`：来源、资料时间、用法、可信程度与许可。
- `public/textures/`：已有工程的CC0 PBR纹理和manifest；非圆明园文物扫描纹理。
- `research/`：本次下载的官方网页、图版、照片、历史PDF和OSM原始数据。版权保留图像仅研究，**不部署、不打包传播**。
- `evidence/`：真实Chromium运行截图、浏览器测试JSON；截图没有经过AI生成。
- [来源与许可](docs/SOURCES.md)、[精度和缺失](docs/ACCURACY.md)、[测试及边界](docs/TESTING.md)。

## 复验

```powershell
$env:CHROMIUM_PATH='本机Chromium或Chrome可执行文件的绝对路径'
$env:TEST_URL='http://127.0.0.1:5186/'
npm run test:browser
```

测试覆盖加载、搜索、信息、地图、鸟瞰、步行、全部安全落脚点、碰撞抽样、手机模拟、三档性能与缺失材质重试。手机模拟不等于真机性能验证；未经逐栋测绘/分期核对的历史形制不能声称通过历史真实性验收。
