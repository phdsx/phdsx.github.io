# 第三方资源与许可

## Three.js

- 版本：0.180.0 / r180。
- 来源：<https://github.com/mrdoob/three.js/tree/r180>，下载自 jsDelivr 的固定版本 npm 文件。
- 许可：MIT，全文随附于 `dist/assets/vendor/LICENSE.three`。
- 当前使用 three.core.js、three.module.js、OrbitControls.js 和 BufferGeometryUtils.js。
- GLTFLoader.js 随附供后续有依据的模型接入，尚未加载场景资产。GLTFLoader 的相对 import 路径调整为本地同目录。

## OpenStreetMap

- © OpenStreetMap contributors。
- 许可：[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/)。署名说明：<https://www.openstreetmap.org/copyright>。
- `source-data/zoo.osm` 为原始查询结果；`dist/assets/data/layout.json` 中由 OSM 衍生的边界、道路、建筑与区域数据依 ODbL 提供。
- 页面常显 OSM 署名。再分发衍生数据库时保留署名、来源及 ODbL 义务。

## 高程

- 来源：[AWS Open Data Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)、Mapzen / Tilezen。
- 原始瓦片保留于 `source-data/dem/`，经过 Terrarium 解码及双线性重采样生成 `terrain.json`；这些变换未经数据提供方审核。
- 全球 GMTED2010 与 SRTM 地形数据由 U.S. Geological Survey 提供；全球 ETOPO1 由 U.S. National Oceanic and Atmospheric Administration 提供。
- 正式 ETOPO1 署名：DOC/NOAA/NESDIS/NCEI > National Centers for Environmental Information, NESDIS, NOAA, U.S. Department of Commerce。
- 数据仅用于空间资料研究，不作现场工程测量或导航依据。
- Tilezen 官方完整来源署名和各数据集说明附于 [TERRAIN-ATTRIBUTION.md](TERRAIN-ATTRIBUTION.md)，原文来源：<https://github.com/tilezen/joerd/blob/master/docs/attribution.md>。

## 现场照片和报道

公开可见不等于获得再分发授权。没有把新闻照片、旅游平台照片或生成的仿真照片放进运行网站。交付的 PNG 仅为本项目自主渲染的浏览器截图。原照片来源和未明授权状态详列于 `REFERENCE-RESEARCH.md`。

## 项目自行编写内容

HTML / CSS / 项目 JS、Python 数据转换及说明文档为本次交付新编写内容。第三方库和数据的许可分别适用，不能用项目源码的使用方式替代其来源署名要求。
