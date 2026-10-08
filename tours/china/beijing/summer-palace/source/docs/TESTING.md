# 实际验证记录

最后交互检查时间：2026-09-30T21:06:24.561Z（UTC，完整原始记录保留时间戳）。使用本地构建产物，URL为`http://127.0.0.1:5184/palace/`，将产物挂载在子目录而非Vite根目录，用于验证相对路径静态部署。

## 设备与方法

- Windows，Node.js v24.20.0，Three.js 0.180.0，Vite7.3.6。
- Chromium 151.0.7922.34，Playwright驱动真正WebGL页面，1440×960，设备像素比1。
- WebGL报告GPU：ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)。
- 另用Edge真实浏览器窗口检查过加载与景点交互。最终截图和自动化数字来自上述Chromium。
- 移动端为390×844、DPR2、hasTouch/isMobile模拟，实际发送双指触控和点击事件；未在实体手机测量性能。

## 检查结果

PASS：错误0条，失败资源0条，断言失败0条。完整数据见 [browser-results.json](../evidence/browser-results.json)。

- Load, reset overview
- Reference and help dialogs
- Collapsible minimap
- Mouse orbit and zoom
- 16 landmark jumps and introductions
- Minimap landmark click
- Batched 3D building picking
- Water and wall collision; bridge deck separate from lake bed; sampled continuous routes at 0.1m
- WASD, held mouse look, 1.7m ground-following camera
- Corridor guided walk starts and stops
- 390×844 responsive layout and collapsed controls
- Touch device emulation: pinch zoom and landmark tap

实测W键移动距离约1.83m，输入保持1.2秒；眼高相对地面1.70m。16处跳转的落点均通过水体、建筑和园墙检查。长廊728m、十七孔桥150m、佛香阁两侧阶梯、石舫登舫桥按0.1m间隔连续取样，无阻断点。水面不可站立，仁寿殿实体内部不可穿行，桥面与湖床独立。

## 实测渲染

佛香阁近景每档采样3.5秒，额外场景每档采样5秒，均逐项运行。记录的是requestAnimationFrame间隔，不是GPU耗时；60fps受显示/浏览器刷新限制，不能代表设备极限。后台系统负载没有完全控制。高画质在DPR1屏幕的实际像素比仍为1，DPR上限分别为低0.8、中1.25、高1.75。

|视角|画质|观察到RAF fps|P95帧间隔ms|主渲染绘制次数|
|---|---|---:|---:|---:|
|佛香阁近景|low|60|16.9|175|
|佛香阁近景|medium|60|16.9|259|
|佛香阁近景|high|60|16.8|301|
|default|low|60|16.8|517|
|default|medium|60|16.8|543|
|default|high|60|17|543|
|overview|medium|60|16.9|636|
|walking-corridor|medium|60|16.8|214|

场景采样原始记录：[scenario-performance.json](../evidence/scenario-performance.json)。水体中档384px反射每12帧更新，高档每8帧，低档关闭。远景建筑按材质BatchedMesh批处理；近景构件合并、柱列/枝叶实例化、建筑LOD和25秒细节缓存清理、植被150m分区显示、局部阴影预算。大型全园视角仍有较多面数，低性能设备请使用低画质；没有测试所有设备或长时间GPU稳定性。

## 图像核对与截图

人工核对官方导览图和OSM拓扑：湖岸/西堤/南湖岛、东侧桥、北部万寿山、前山沿湖长廊、后湖水街及东北谐趣园的位置关系一致。没有测绘控制点，未计算位置RMSE。官网远景、佛香阁仰视、桥券/栏杆照片、石舫侧面照片用于形态和典型视线比对；近景照片不能证明整个园区达到实景同等细节。已知差异见 [ACCURACY.md](ACCURACY.md)。

- [默认湖山视角](../evidence/final-lake.png) / [全园俯视](../evidence/final-overview.png)
- [佛香阁](../evidence/final-foxiang.png) / [十七孔桥](../evidence/final-bridge.png)
- [长廊步行](../evidence/final-walk-corridor.png) / [石舫](../evidence/final-boat.png)
- [谐趣园](../evidence/final-xiequ.png) / [苏州街](../evidence/final-suzhou.png)
- [仁寿殿](../evidence/final-renshou.png) / [西堤玉带桥](../evidence/final-west-dyke.png)
- [移动布局](../evidence/final-mobile.png) / [触控设备模拟](../evidence/final-touch-mobile.png)

## 构建与范围

`npm run check`通过；`npm run build`成功。运行资源全部来自本地，资源清单加载成功。依赖安装时发现旧Vite7.1.7有已知公告，已升级到兼容7.3.6，随后npm audit报告0项已知漏洞，记录在 [dependency-audit.json](../evidence/dependency-audit.json)，这不等于全面安全审计。

自动化覆盖主要示范路线和交互，没有逐米走遍248条全部支路，没有验证建筑室内、实体手机和所有浏览器，也没有外网发布。远景和缺少资料的区域按精度分层合理近似。
