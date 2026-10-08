# 紫禁城 · Three.js 空间探索

2026-09-30：已更新屋檐层次、立面、石栏、材质、植被与光照，新增“保存视角”。[本轮写实修改与近景对照](docs/REALISM-REVISION.md)。

本地可运行的室外故宫三维研究模型。**1 世界单位 = 1 米**。基准为当代既存建筑室外格局，官方照片主要来自 2020 年前后，地图快照抓取于 2026-09-28；不模拟当前施工、游客开放时间或展陈。

全域采用 OpenStreetMap 轮廓，经官方城池 753 × 961 米归一化；中轴线和关键地标使用分别配置的参数化几何。**全域布局已覆盖，外观仍分为参考、估算和示意，不能称为逐栋完整复原或测绘级模型。** 所有室内关闭，延禧宫灵沼轩主体保留为未还原区域。

## 启动

Node.js 20.19+ 或 22.12+（实际构建环境 Node 24.20.0）。首次需要网络安装依赖，安装后场景运行不请求外部图片或 CDN。

```powershell
cd D:\code\html\phdsx.github.io\forbidden-city
npm ci --no-audit --no-fund
npm run dev -- --port 5178
```

打开 <http://127.0.0.1:5178/>。HTML 需要 HTTP 服务，不能直接双击 `index.html`。如端口被占用，改为其他端口。

```powershell
npm run build
npm run preview -- --port 4173
npm run check
```

Three.js **0.180.0**、Vite **7.1.7**、Playwright **1.55.1**，均锁定版本并附 `package-lock.json`。Vite 使用本地静态资源，未部署或发布。

## 操作

2026-09-30 补充：东西六宫11座正殿加入独立屋顶/开间配置，养心殿前殿采用官方36×12米尺寸。新增5张视角截图、近景瓦垄与外侧柱列，并修复近景缓存回收。配殿、抱厦和具体雕刻仍按真实性清单列为示意或未完成。

- 鸟瞰：左键旋转，滚轮缩放，右键平移。
- 步行：WASD 或 ↑↓ 移动；←→ 转向。按住左键观察，双击锁定鼠标，Esc 释放。普通速度 1.5 m/s，Shift 3.8 m/s，眼高 1.68 m。
- 左侧地标按钮快速定位，点击主要建筑显示简介、模型尺寸和机构资料链接。
- 标签、全域初始视角、低中高画质、灰盒核对可切换。
- 小地图鸟瞰显示焦点及观察方向；步行显示相机位置及观察方向。北箭头为场地格网北，与真北约差 2.04°。
- 碰撞涵盖建筑关闭区、院墙、城墙、水系、场地边界；台基由连续踏步高度代理处理，不允许直接跃上高台。

## 项目结构

```text
index.html                  HTML 入口
src/main.js                 资源载入、场景生命周期与渲染
src/geometry.js             曲面屋顶、批量几何、实例化
src/buildings.js            全域建筑分类、中轴线与关键地标
src/terrain.js              城墙、院墙、水系、桥、道路、台阶
src/materials.js            本地程序材质和微表面纹理
src/lighting.js             方位一致的太阳与阴影
src/controls.js             鸟瞰、步行、碰撞空间索引
src/ui.js                   标签、信息卡、定位和小地图
src/details.js              按需加载的柱网、斗栱、窗格与栏杆
src/performance.js          两级细部LOD、距离裁切与缓存回收
public/data/layout.json     全域位置/轮廓/院墙/水道/道路/树木
public/data/landmarks.json  地标尺寸/屋顶/台基/开间/资料状态
public/data/sources.json    来源、许可、冲突和访问限制
scripts/extract-layout.py  从原始OSM XML重建布局的标定脚本
scripts/check-layout.mjs   布局、轴线顺序、尺寸约束核对
scripts/browser-test.mjs   独立Chromium交互和性能测试
docs/                      研究、真实性、阶段记录、验收报告
research/                  官方参考图链接及本地核对缓存
evidence/                  关键视角截图及测试JSON
osm-map.xml                OSM官方API原始快照（ODbL）
```

## 测试和参考

参见 [验收报告](docs/TESTING.md)、[真实性与尺寸表](docs/AUTHENTICITY.md)、[阶段记录](docs/STAGES.md) 和 [资料许可](docs/LICENSES.md)。图形测试记录在 `evidence/test-results.json`，实际设备、浏览器、分辨率、帧率、三角形与 draw call 均写入记录；不把短测试结果视为任意设备帧率保证。

需要复测时：

```powershell
npx playwright install chromium
npm run test:browser
```

可设置 `PALACE_CHROME` 指定 Chromium/Chrome 可执行文件，`PALACE_URL` 指定服务地址。测试脚本默认尝试本次设备的浏览器路径，路径不存在时使用 Playwright 默认浏览器。安装浏览器不是运行三维项目的必要条件。

## 限制

程序生成材质取色和形制来自官方影像参考，但无精确色彩标定。屋面曲线、脊饰、门窗、斗栱为参数化近似；不具备文物修缮、结构分析或导览许可用途所需精度。城门洞、桥高、内河宽、台阶跑长、植被位置亦有估算。地图还包含未知建筑和复合轮廓分类误差，详情见真实性清单。使用程序几何而非 GLB，因此不含压缩 glTF 资产；按材质/空间分区合批和重复构件实例化用于控制开销。
