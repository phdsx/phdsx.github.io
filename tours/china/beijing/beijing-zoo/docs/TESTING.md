# 实际运行验证

日期 2026-10-01，Windows 主机，Node 24.20.0、Vite 7.3.6、Three.js 0.180.0。实际启动开发服务 `127.0.0.1:5185` 及公开目录静态服务 `127.0.0.1:5193`。最终完整浏览器回归针对构建后的 `tours/china/beijing/beijing-zoo/scene.html`；另从 `tours.html` 点击卡片验证包装入口、iframe 与资源路径。未推送远程，线上部署尚未验证。

## 通过的检查

| 检查 | 实际结果 / 证据 |
| --- | --- |
| `npm run build`、`npm run publish:local` | Vite 构建成功，13 个模块；JS 692975 字节，离线 gzip 184808 字节。静态路径采用相对资源。 |
| `npm run check` | 坐标往返、ID/来源外键、41 条分布记录、54 个安全落点；336 个建筑/围场/门柱内部或边界目标被阻挡；90 次大步长移动保持可达地面。报告 `evidence/data-check.json`。 |
| 完整浏览器回归 | 加载、鸟瞰旋转/平移/缩放/重置、动物和场馆搜索、分类筛选、空查询、小地图与三维点位对应、54 个安全跳转、近观和点击动物、详情/资料/帮助弹窗、WASD/视高/碰撞、鼠标锁定及 Esc、画质三级、390×844 布局全部通过。报告 `evidence/browser-results.json` 无普通页面请求失败或 console/page error。 |
| 模型边界和脚部 | 狮子包围盒约 2.65×1.21×0.62 米，最低点约 Y=.05015 米、围场地面 Y=.05 米；根位置位于对应围场内。1.5 秒观察中根位置固定、头骨骼旋转变化。没有以静态根位置测试宣称完整行走动画正确。 |
| 降级 | 阻断 `lion.glb` 请求：场景仍可用、加载屏消失、资源失败提示可见。该故意失败页面与正常错误统计分开。 |
| 公开入口整合 | 目录筛选“动物园”、截图缩略图、卡片链接、嵌套入口、iframe 内步行与 pointer lock、实际点击小地图场馆均通过。报告 `evidence/integration-results.json` 无错误或缺资源。 |
| 移动触控模拟 | Chromium 的 390×844、hasTouch/isMobile：单指旋转使相机移动约 16.68 米，双指缩放观察距离从 51.22 米变为 27.58 米；动物查询和跳转通过。仅模拟，未用真实手机。 |
| 网站导航 | `node scripts/check-navigation.mjs` 通过。 |

`node scripts/check-site-links.mjs` 全站检查发现 1 个既有无效引用：`games/arcade/bombman/index.html → /src/main.ts`。该页面与本次工作无关，未修改。动物园本次新增入口和普通请求没有缺失资源。不能宣称全站链接检查全部通过。

## 实测性能与资源

Headless Chromium 151.0.7922.34；WebGL 报告 `ANGLE (NVIDIA GeForce RTX 4070, Direct3D11)`。1440×960、设备 DPR=1、全园鸟瞰、加载/画质预热后每档采样约 2.2 秒、132 帧。以下是 requestAnimationFrame 的帧间隔，受约 60Hz 刷新节奏限制，不是独立 GPU 渲染耗时。

| 画质 | 平均帧间隔 | p95 | 平均 FPS | draw calls | 三角形 |
| --- | --- | --- | --- | --- | --- |
| 低 | 16.6674 ms | 16.7 ms | 59.997 | 267 | 358445 |
| 中 | 16.6682 ms | 16.8 ms | 59.995 | 268 | 540965 |
| 高 | 16.6667 ms | 16.7 ms | 60.000 | 268 | 540965 |

这些结果不能推断低配机器或手机帧率。DPR=1 时三级都只取像素比1；低档关闭阴影并降低树木 LOD，中高档差异主要在较近距离 LOD、阴影范围/质量和高 DPR 上限。植物 3040 棵采用空间块 InstancedMesh 与 LOD；重复栏杆和道路合并。动物只有一个近区资产，不能宣称已验证全园大量动物按区流式加载。

独立场景启动所需本地文件约 9.48 MB（9475762 字节，不是网络传输字节），其中 GLB 5417528 字节；12 张 768×768 WebP PBR 图已本地化。含可下载地理子集、来源表、CSV和文档的整个公开目录约 10.1 MB。精确逐文件字节与离线 gzip 估算见 `evidence/resources.json`，可运行 `node scripts/report-resources.mjs` 更新。未使用 KTX2、Draco 或动态反射；浏览器缓存及服务器压缩会改变传输量。

## 实际截图与视觉核对

`evidence/final-site-entry.png` 是包装入口实际运行画面；`final-gate.png`、`final-overview.png`、`final-lion.png`、`final-walk.png`、`final-mobile.png`、`final-mobile-detail.png`、`final-touch-mobile.png`、`final-resource-failure.png` 是 Chromium 截图。卡片缩略图来自同一 Three.js 场景，临时隐藏 HTML 控件后截取，不是照片/视频或生成图。

已人工查看上述主要截图：界面可读，无主要信息重叠；对照官方手册导览图检查馆舍大空间关系，正门参考三拱轮廓，动物参考狮子形态。建筑立面与植被依然可见模型简化和材质重复，未通过“接近实景”的完整视觉验收。

未执行：真实 Android/iOS、Safari/Firefox、多设备 GPU、完整全园连续步行路线、最新园方在展表、绝对高程或测绘控制点、逐馆多角度照片匹配、2026 熊猫新馆完整轮廓核对、行走动物的脚底接触与鸟/水生行为、远程线上部署。8 个保守阻挡路段见覆盖说明。以上限制不能用功能回归通过替代。

## 复验

在仓库根目录启动 `node beijing-zoo/scripts/serve-site.mjs`。另一终端进入 `beijing-zoo`：

```powershell
$env:TEST_URL = 'http://127.0.0.1:5193/tours/china/beijing/beijing-zoo/scene.html'
$env:SITE_URL = 'http://127.0.0.1:5193/'
$env:CHROMIUM_PATH = 'C:/path/to/chrome.exe'
npm run check
npm run test:browser
node scripts/integration-test.mjs
```

截图、报告会被新实测覆盖；新机器需读实际 GPU/条件再解释 FPS。
