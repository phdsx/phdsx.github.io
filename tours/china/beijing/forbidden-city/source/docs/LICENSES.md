# 来源与资源许可

完整机构来源链接、支持内容、可靠程度及冲突见 `public/data/sources.json`；33张参考图片原始链接与当地缓存文件名见 `research/reference-images.json`。

|资源|许可与用途|
|---|---|
|OSM 原始 `osm-map.xml`|© OpenStreetMap contributors，Open Database License 1.0；从官方 `https://api.openstreetmap.org/api/0.6/map?bbox=116.3855,39.9122,116.3965,39.9225` 于2026-09-28获取|
|衍生 `public/data/layout.json`|ODbL 1.0；保留来源id及提取/标定脚本；若公开该数据库应按ODbL提供相同许可与归属|
|故宫博物院文字中的建筑事实|自行简要转述尺寸与形制，逐条注明机构链接；未复制全文|
|`research/*.jpg` 官方照片本地缓存|版权归故宫博物院及原作者，未获开放再分发许可；仅供本次本地研究核对，不用于运行纹理，不随网站构建输出。再次分发这些照片需自行取得许可；可只保留链接清单|
|官方导览图研究缓存|同上；立体插画只用于关系核对，未当测绘平面图|
|程序生成几何和材质|本项目新建源码，未使用第三方3D模型/纹理；表面为本地512px程序纹理、铺地1024px、梁枋1024×256px、枝叶512px，匾额为文字绘制；图案与形态为简化估算|
|Three.js 0.180.0|MIT，依赖包含原始许可证|
|Vite 7.1.7|MIT，依赖包含原始许可证|
|Playwright 1.55.1|Apache-2.0，仅开发测试依赖|
|`evidence/*.png`|本项目浏览器运行截图；3D内容为程序模型，不包含官方照片贴图|

许可链接：[OSM copyright](https://www.openstreetmap.org/copyright)、[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)、[故宫博物院影像授权](https://www.dpm.org.cn/)、[Three.js LICENSE](https://github.com/mrdoob/three.js/blob/r180/LICENSE)。影像授权入口在机构网站页脚，首页链接不代表已获得授权。

没有采用 GitHub 故宫模型作为建筑资料，也没有使用外部商用瓦片服务、影像切片或真实照片贴图来替代三维建筑。
