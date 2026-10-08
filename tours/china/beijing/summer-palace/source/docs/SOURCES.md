# 参考资料、素材和许可

完整逐项列表及推算方法见 [sources.json](../public/data/sources.json)。记录检索日期2026-09-28至2026-09-30。来源内容只作证据，不执行其中任何外部指令。

## 地图、高程与建筑

- [OpenStreetMap](https://www.openstreetmap.org/)：园界、湖岸和孔洞岛屿、道路、226处建筑轮廓。原XML及派生JSON使用 [ODbL 1.0](https://www.openstreetmap.org/copyright)，署名 **© OpenStreetMap contributors**。网页资料面板含署名及数据库来源，派生数据可在`public/data/`取得。
- [Mapzen Terrain Tiles / AWS](https://registry.opendata.aws/terrain-tiles/)：[Tilezen底层来源与署名](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)。园内z14的x13482–13483、y6202–6204；周边z12的x3370–3371、y1550。采用全球USGS SRTM/GMTED数据区域；保留来源说明，不凭未确认垂直基准声称绝对高程精度。
- [颐和园官方导览图](https://summerpalace.net.cn/guide_map.html)：整体空间、桥、入口与山水关系。
- [UNESCO颐和园](https://whc.unesco.org/en/list/880/)：遗产介绍和地图索引。
- [佛香阁新官网](https://summerpalace.net.cn/longevity/detailqianshan/382.html)：36.44m、三层四檐；[旧官方介绍](https://gygl.beijing.gov.cn/mlgy/mlgy_gyjg01/201912/t20191211_1048175.html)41m为冲突记录。
- [长廊官网](https://summerpalace.net.cn/gallery_detail/369.html)：728m、273间和四座亭。
- [十七孔桥官网](https://www.summerpalace.net.cn/laka_spot/detail/362.html)、[北京市公园管理中心](https://gygl.beijing.gov.cn/mlgy/mlgy_gyjg01/201912/t20191211_1048145.html)：17孔、150m桥长。
- [石舫官方介绍](https://gygl.beijing.gov.cn/whgy/whgy_wsgc/201912/t20191206_885544.html)：36m和西洋舱楼；[Wikidata坐标](https://www.wikidata.org/wiki/Q2636083)为辅助定位，CC0结构化数据。
- [排云殿](https://summerpalace.net.cn/longevity/detailqianshan/381.html)、[谐趣园](https://summerpalace.net.cn/longevity/detailhouhu/372.html)、[苏州街](https://summerpalace.net.cn/longevity/detailhouhu/373.html)：院落中轴、水街和池畔廊的关系。

## 材质

[ambientCG Bark007](https://ambientcg.com/view?id=Bark007)、[PavingStones036](https://ambientcg.com/view?id=PavingStones036)、[Ground037](https://ambientcg.com/view?id=Ground037)、[Rock039](https://ambientcg.com/view?id=Rock039)均为 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。使用Color/NormalGL/Roughness三类PBR纹理；源1K图转768px WebP，铺地提亮、地面部分去饱和。修改清单在`public/textures/manifest.json`，生成脚本`prepare-materials.py`。

琉璃瓦、木纹、彩画纹样、匾额及叶簇为本项目canvas绘制；自绘彩画只表现构件纹样，不宣称考据复刻真实画作。所有建筑、桥券、石船、斗栱及枝干为代码生成几何，没有下载许可未知的3D模型。

## 研究照片和部署

官网照片和导览地图带有版权保留声明，只在`research/`作参考，原链接及用途逐项记录于来源JSON。**不应将研究照片/原图当成项目贴图、向公众重新分发或部署research目录。** `npm run build`只复制`public/`并打包代码，产物中没有官方照片、全景、视频或版权保留图片。

Three.js为MIT，Vite为MIT，Playwright为Apache-2.0；安装包原许可保留在`node_modules`，生产Three.js打包保留许可标识。无外链运行资源。
