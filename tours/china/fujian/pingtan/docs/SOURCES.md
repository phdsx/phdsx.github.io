# 来源与许可

研究/下载日期：2026-10-07（Asia/Shanghai）。机器可读来源、下载 URL、处理方法、缺失项在 `public/data/sources.json`。原始文件 SHA-256 记录在 `research/checksums.json`。所有运行资源本地化；运行时无地图服务请求。

| 来源 | 许可与署名 | 使用与精度 |
|---|---|---|
| [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)，运行界面持续署名；派生数据库 geography.json 仍遵循 ODbL | 真实闭合岸线、道路、已映射建筑轮廓、土地利用、地名和风机点位。社区编辑数据，无本项目测绘精度保证。 |
| [Mapzen Terrain Tiles / Skadi](https://registry.opendata.aws/terrain-tiles/) | USGS SRTM/GMTED 全球高程资料；[Tilezen 官方署名](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) | N25E119.hgt.gz，3601×3601，1 角秒，当地约 28×31m。40m UTM 采样。格网间距不代表水平/垂直精度；未核实每格底层来源及国家垂直基准。 |
| [EOxCloudless by EOX IT Services GmbH](https://cloudless.eox.at) | modified Copernicus Sentinel data **2016**，**CC BY 4.0**。[官方 WMTS 许可元数据](https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml)，副本 research/eox-capabilities.xml | 仅使用 `s2cloudless` 原始 2016 图层，未使用 2018+ 的其他许可年度图层。WMS 输出约 13×14m，UTM 重投影后约 14m。不是近期正射或无人机照片。 |
| [福建省文旅厅/住建厅：北港村](https://wlt.fujian.gov.cn/zwgk/ztzl/fjsjplyc/ptzhsyqbgc/201908/t20190805_5294531.htm) | 官方照片仅作本地研究参考，不进入 public/dist/静态网站 | 核实东北部、君山东麓、花岗岩青灰石墙、低坡瓦顶、压瓦石。样板类型化外观，不是两处民宿立面实测。 |
| [福建省住建厅：岚岛焕新越山海](https://zjt.fujian.gov.cn/xxgk/gzdt/bmdt/202512/t20251216_7046834.htm) | 仅事实与链接，无图片再分发 | 长江澳风机与沙岸、龙王头滨海环境、沿海防护林背景核对。 |
| [ambientCG](https://ambientcg.com) | [CC0 1.0](https://docs.ambientcg.com/license/) | Rock039、Ground037、Bark007、PavingStones036，本仓库已有资源，768px PBR 材质；非平潭实地照片。wall-color 从原始 PavingStones036 去色，不沿用园林版本的增亮。详情 public/textures/manifest.json。 |
| [Three.js r180](https://github.com/mrdoob/three.js/tree/r180) | MIT，完整声明随项目附带 | WebGLRenderer、OrbitControls、Sky、PMREM、实例化与几何合批。 |

OSM 三份原始 XML 在 `research/north.osm`、`south.osm`、`northwest.osm`。按原始 node ID 拼接；包含原点的主岛环闭合成功。未闭合的一段背景岸线被省略，没有补造线段。其他闭合背景岛屿保留在数据范围内。

影像保留历史云影、已烘焙的光照和年代差异。主岛西南填海部分当前 OSM 与 2016 图像不符，渲染岸线以 OSM 为准，未伪造最新影像。DEM 对海岸的视觉修改见 ACCURACY.md，原始高程未覆盖。

本项目代码沿用仓库 AGPL-3.0。ODbL 数据、CC BY 4.0 影像、CC0 材质、MIT 库仍分别保留权利与署名；不可用代码许可重标这些资源。

新增参考：[平潭网/闽南网小火车报道](https://www.mnw.cn/news/pingtan/2953036.html)，2024-09-12，核实红色、电动、约800米、3站及照片中的双层敞开式车身。[文化和旅游部线路资料](https://zhuanti.mct.gov.cn/rxhmxjgn2022/beijing/detail_g7yU_504/3375.html) 核对坛南湾砂质海湾；[平潭网海岸资料](https://www.ptnet.cn/ly/2022-04/22/content_2016676.html) 核对北部岩岸/岬角类别。照片仅研究参考，不分发。


## 景观统一扩展

15处浏览定位与19项景观清单详见 [逐景点依据及缺失](LANDSCAPES.md)。镜沙洞口、仙人井中心与井壁、石牌洋双柱、猴研岛岩体和南寨山岩群均有近似处理；原始DEM、主岛岸线和地理比例保持源数据。仙人井周边约100米内的视觉井体替换为照片/报道近似地貌，并使用对应视觉碰撞高度。
