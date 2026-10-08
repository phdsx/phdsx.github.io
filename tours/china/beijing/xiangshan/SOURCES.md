# 数据、素材来源与许可

主要资料访问日期：2026-10-02；v2 打包与最终验收日期：2026-10-04。运行时全部从本地 assets 加载，没有隐含的在线地图、瓦片服务、API Key 或 CDN 依赖。

## 地形

- 数据集：[Copernicus DEM / AWS Open Data](https://registry.opendata.aws/copernicus-dem/)。[AWS 技术说明](https://copernicus-dem-30m.s3.amazonaws.com/readme.html)。该镜像说明为 **2021 release**，不是 2026 年新测量。
- 原始 [N39E116 GeoTIFF](https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N39_00_E116_00_DEM/Copernicus_DSM_COG_10_N39_00_E116_00_DEM.tif) 和 [N40E116 GeoTIFF](https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N40_00_E116_00_DEM/Copernicus_DSM_COG_10_N40_00_E116_00_DEM.tif) 均已成功下载读取。交付中只保留研究区域的重投影裁切数据，避免附带约 100 MB 的完整一度瓦片。
- GLO-30 Public：1 角秒 DSM；水平 WGS84，高程采用 EGM2008。DSM 包括植被、建筑、基础设施表面，不可等同裸地地形。
- 处理：GDAL / rasterio 双线性重投影至 UTM 50N，20 m 格网 Float32，x 向东 / z 向南；未加入噪声高程，未夸大高度。远景 40 m 网格是显示简化；核心 20 m、重点区 2 m 的可视网格均不增加原始测量精度。
- [Copernicus 官方数据集及许可入口](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)。免费开放不等于公有领域，请保留相应声明。

**Copernicus Digital Elevation Model (DEM) was accessed on 2026-10-02 from https://registry.opendata.aws/copernicus-dem.**

**© DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.** 本项目所附格网为源数据的重投影、裁切及重采样派生；可视水岸与建筑基座的调整另列为推测，没有改写该原始裁切格网。

## 地图、边界、路线

数据：[OpenStreetMap](https://www.openstreetmap.org/copyright)，© OpenStreetMap contributors，按 [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) 提供。通过 [Overpass API](https://overpass-api.de/) 查询。未使用商业底图截图、未混入 GCJ-02 坐标。

- [公园边界 relation 8758884](https://www.openstreetmap.org/relation/8758884)
- [东门入口 node 905117414](https://www.openstreetmap.org/node/905117414)
- [勤政殿 way 533115769](https://www.openstreetmap.org/way/533115769)
- [静翠湖 way 605775489](https://www.openstreetmap.org/way/605775489)
- [双清别墅入口 node 5738067731](https://www.openstreetmap.org/node/5738067731)
- [香炉峰 node 3317985384](https://www.openstreetmap.org/node/3317985384)

所有显示道路的原始 way id、节点、标签和无来源宽度的标记，均在 `assets/geo/scene.json`。原始采用记录保存在 `assets/geo/osm-source.json`，附 OSM 数据时间戳，便于审计和履行 ODbL 源数据可用要求。OSM 派生数据库按 ODbL 提供，应用程序代码另行按 MIT 提供。

这是众包地图。公园边界、道路和建筑轮廓不是政府测绘成果，也未得到公园管理方校核。

## 建筑照片

| 包内文件 | 已获取的来源页 | 作者 | 许可 |
|---|---|---|---|
| `assets/references/hall-autumn.jpg` | [File:Qinzhengdian2 2.jpeg](https://commons.wikimedia.org/wiki/File:Qinzhengdian2_2.jpeg) | 果布 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `assets/references/hall-bridge.jpg` | [File:香山公园 东门 - panoramio.jpg](https://commons.wikimedia.org/wiki/File:%E9%A6%99%E5%B1%B1%E5%85%AC%E5%9B%AD_%E4%B8%9C%E9%97%A8_-_panoramio.jpg) | Chen Zhi | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| `assets/references/hall-wide.jpg` | [File:香山勤政殿.jpg](https://commons.wikimedia.org/wiki/File:%E9%A6%99%E5%B1%B1%E5%8B%A4%E6%94%BF%E6%AE%BF.jpg) | Charlie fong  冯成 | Public domain（授权见来源页） |

照片通过 Wikimedia 公开缩略图取得，保持原图内容，未用 AI 修改；页面预览会裁切到框内，原始随包缩略图未裁切。每张照片的许可独立保留，**CC BY-SA 照片不因项目代码采用 MIT 而改为 MIT**。没有把照片烘焙到三维模型上；照片作为建筑形式参考，模型尺寸与细节另见精度说明。

标题带“东门”的照片，其实际画面为殿前池桥和勤政殿立面，本项目按画面使用，未将其作为东门门楼形制证据。另一个查到的 2025 年勤政殿照片是室内陈设，不用于外部尺寸推断。公有领域的宽幅照片可观察完整灰瓦屋顶与殿前水池轴线。

参考照片是这些作者各自拍摄的历史时刻，并不能证明当前现场构件或植被状态完全相同。

## PBR 材质

来自 [Poly Haven](https://polyhaven.com/) 的扫描材质，按 [CC0](https://polyhaven.com/license) 提供；原始纹理下载地址、通道和 MD5 由 API 返回，保存在 `assets/texture-manifest.json`。未使用占位资源地址。

| 资源 | 作者 | 许可 | 包含通道 |
|---|---|---|---|
| [brown_mud_leaves_01](https://polyhaven.com/a/brown_mud_leaves_01) | Rob Tuytel | CC0 | 1K 色彩 / OpenGL 法线 / 粗糙度 |
| [bark_brown_02](https://polyhaven.com/a/bark_brown_02) | Rob Tuytel | CC0 | 1K 色彩 / OpenGL 法线 / 粗糙度 |
| [grey_roof_tiles](https://polyhaven.com/a/grey_roof_tiles) | Rob Tuytel | CC0 | 1K 色彩 / OpenGL 法线 / 粗糙度 |
| [cobblestone_floor_08](https://polyhaven.com/a/cobblestone_floor_08) | Rob Tuytel | CC0 | 1K 色彩 / OpenGL 法线 / 粗糙度 |
| [rock_boulder_dry](https://polyhaven.com/a/rock_boulder_dry) | Dimitrios Savva, Rico Cilliers | CC0 | 1K 色彩 / OpenGL 法线 / 粗糙度 |

这些是通用叶土、石材、树皮与屋瓦，不是香山原地扫描。屋瓦材质用于近似表面纹理，不能替代历史瓦作工艺或尺寸资料。彩色纹理按 sRGB 读取，法线与粗糙度按线性读取。

树木叶簇、枝干、屋面几何和彩绘梁枋的简化图案由本项目代码生成，未声称为扫描素材。未找到并采用可验证授权的香山建筑 GLB / glTF 或实景单木模型，因此本版本没有以来源不明的模型凑齐建筑。

## 程序依赖

DEM 派生数据的完整法定声明：**produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.**

**The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30.** 本项目不代表这些机构或公园管理方的认可。后续再分发者应保留声明并遵守同一数据许可。官方许可已获取并随包保存为 `assets/licenses/COP-DEM-LICENSE.pdf`，完整声明见 `COP-DEM-NOTICE.txt`。

- [Three.js 0.170.0](https://github.com/mrdoob/three.js/tree/r170)，MIT。
- 核心文件、OrbitControls 与 Water 均来自固定版本 `three@0.170.0` 的同一发布包，保存于本地，不运行时请求 CDN。MIT 许可见 `assets/licenses/THREE-MIT.txt`。
- v2 新增 [Water.js r170](https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/objects/Water.js)，MIT，与核心同版本。原文件保存在 `assets/vendor/Water.js`；本项目在实例化的 shader 上减弱反射与高光，并控制更新频率。解析波纹法线由代码生成，不冒充现场材质扫描。
- 数据处理脚本使用 rasterio / GDAL、pyproj / PROJ、NumPy、Shapely；浏览器端无需安装这些库。

## 获取失败和资料缺口

公园官网在本次环境中 TLS 连接失败，未把其未读取内容当作证据。部分 Wikimedia 原图受限，改用可成功获取且有完整许可元数据的缩略图。没有获取到官方竣工尺寸、激光地形、可靠单木定位或已授权香山实景建筑扫描。详情见 `ACCURACY.md`。
