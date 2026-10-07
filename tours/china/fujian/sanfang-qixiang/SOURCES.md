# 数据与素材来源

资料核实、获取日期：2026-10-07（Asia/Shanghai）。照片拍摄期与地图更新时间并不相同，不能据此声称还原了 2023 年或 2026 年某一天的完整实景。

## 地图与建筑资料

| 来源 | 日期 / 覆盖范围 | 许可及使用 |
| --- | --- | --- |
| [OpenStreetMap API 原始地图](https://api.openstreetmap.org/api/0.6/map?bbox=119.286,26.081,119.2955,26.089) | 2026-10-07 获取；WGS84 bbox 西 119.286、南 26.081、东 119.2955、北 26.089；各对象编辑时间见原始 XML | © OpenStreetMap contributors，[ODbL 1.0](https://www.openstreetmap.org/copyright)。`data/osm-map.osm` 原始、`data/site.json` 衍生；保留 ID、version、timestamp、经纬度。地图可能漏绘或有定位偏差。 |
| [Overpass 查询服务](https://overpass.kumi.systems/api/interpreter) | 2026-10-07；较早较宽范围查询 | OSM / ODbL；`data/osm-raw.json` 仅存档，正式场景以 API XML 为唯一几何来源。 |
| [中央纪委国家监委：一片三坊七巷 半部中国近现代史](https://www.ccdi.gov.cn/yaowen/201709/t20170918_149579.html) | 2017-09-19；坊巷名称、院落和传统建筑特征 | 未找到开放图像许可；仅用于事实核查和链接，没有复制或分发图片。 |
| [ICOMOS CIAV Newsletter 48](https://ciav.icomos.org/wp-content/uploads/2021/07/newsletter-2021-y12-n48.pdf) | 2021-06；三坊七巷传统街区研究与鱼骨状街网描述 | 文档注明版权保留；仅引用事实，原 PDF 和图片没有打包。 |
| [福州市政府 2023 年文件](https://www.fuzhou.gov.cn/zgfzzt/gytdsyqcr/sjfg/202308/P020230804360672286884.pdf) | 2023-08；地价表所列南后街起终点：杨桥东路至吉庇巷口 | 未找到图像开放许可；仅核实道路边界名称。表中的“标准深度 30 米”是地价标准深度，**不是道路宽度**，没有用于建模。 |

OSM 中部分北侧分离车行道无 name 标签，依据街区北界资料以“杨桥东路（原杨桥巷）”编辑标注；`nameEvidence` 为 `editorial-from-boundary`，不是伪造 OSM 原始标签。主要巷道的南北顺序由地图交点校验，未采用一些文字介绍中相互矛盾的顺序。

## 合法再分发的实景照片

各照片均为 Wikimedia Commons 上作者自摄；完整机器可读原页、原始图 URL、拍摄时间、相机 GPS、许可链接在 `data/sources.json`。仓库中的照片是 Wikimedia 提供的 1280 px 缩略图；除这一缩放外没有修改。没有下载未许可的街景或航拍服务切片。

| 本地文件 / 原始标题 | 作者 · 拍摄日期 | 覆盖 / 用途 · 许可 |
| --- | --- | --- |
| `references/north-gate-2023.jpg` · [North Gate of Nanhou Jie, Sanfang Qixiang 20230825](https://commons.wikimedia.org/wiki/File:North_Gate_of_Nanhou_Jie,_Sanfang_Qixiang_20230825.jpg) | JULIANISME · 2023-08-25 14:34:19 | 北口四柱石牌坊与街口；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。牌坊形态与四盏灯具近似参考；雕饰 / 立柱文字裁切另见下方。 |
| `references/nanhou-north-2023.jpg` · [20231020 Nanhou Jie](https://commons.wikimedia.org/wiki/File:20231020_Nanhou_Jie.jpg) | Yumeto · 2023-10-20 12:03:05 | 北口机位和背景；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。辅助机位比较，不能证明后方所有立面尺寸。 |
| `references/ye-residence-2023.jpg` · [20231020 Fujian Sheng Feiwuzhi Wenhua Yichan Bolanyuan](https://commons.wikimedia.org/wiki/File:20231020_Fujian_Sheng_Feiwuzhi_Wenhua_Yichan_Bolanyuan.jpg) | Yumeto · 2023-10-20 12:56:28 | 叶氏民居博览苑沿街灰砖、五个彩色拱窗和阳台；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。仅正面形式近似，建筑身份到 OSM 轮廓的映射未确认。 |
| `references/heart-tree-2023.jpg` · [Tree of Heart, Sanfang Qixiang 20230825](https://commons.wikimedia.org/wiki/File:Tree_of_Heart,_Sanfang_Qixiang_20230825.jpg) | JULIANISME · 2023-08-25 15:24:28 | 爱心树附近木构上层窗、白墙马鞍墙、街景构成；[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。仅类型、形态参考，不确认每个房屋的逐栋对应。 |
| `references/aerial-2017.jpg` · [Fuzhou sanfangqixiang Aerial 2017](https://commons.wikimedia.org/wiki/File:Fuzhou_sanfangqixiang_Aerial_2017.jpg) | 之乎（Search255）· 2017-01-30 | 部分南后街、衣锦坊、文儒坊和东侧巷道的历史屋顶格局；[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。只作为历史形态辅助，**没有作为 2023 年底图或街景纹理**。 |

`textures/gate-relief.jpg`、`gate-inscription-left.jpg`、`gate-inscription-right.jpg` 是从 JULIANISME 的 `north-gate-2023.jpg` 裁切、缩放的衍生细节，仍按 CC BY-SA 4.0 提供。裁切范围和变化保存在 `scripts/prepare_textures.py`。含原照片光照和透视，不能当成校准反射率或真实浮雕几何。照片参考的建模图形与比较成图在需要构成照片改编的范围内保留 CC BY-SA 4.0 条件；代码仍使用仓库许可。

## 材质与代码

| 素材 | 日期 / 来源 | 许可 / 变化 |
| --- | --- | --- |
| 白墙表面 [ambientCG Plaster004](https://ambientcg.com/view?id=Plaster004) | 2020-07-05 发布，2026-10-07 获取 | [CC0 1.0](https://docs.ambientcg.com/license/)。1K 原图缩至 768 WebP；周期 1 m 为估算；非现场灰泥扫描。 |
| 木材 [ambientCG Wood066](https://ambientcg.com/view?id=Wood066) | 2021-07-11 发布，2026-10-07 获取 | CC0 1.0；标称约 40 × 40 cm，缩至 768 WebP；颜色降饱和、降亮度。非真实商铺木材种类鉴定。 |
| 树皮 [ambientCG Bark007](https://ambientcg.com/view?id=Bark007) | 2019-05-29 发布；2026-10-07 核实、复用本仓库已署名贴图 | CC0 1.0；768 WebP 不再修改；周期 1.4 m 为估算；非该榕树现场树皮扫描。 |
| 灰瓦、花岗岩、石板、灰砖与叶片微表面 | 本项目 `materials.js`、`scene.js` 生成 | 原创程序材质和实例几何，用于近似，不是扫描数据。石板接缝约 1 × 0.5 m，缺实测依据。 |
| [Three.js r180](https://github.com/mrdoob/three.js/tree/r180) | 本地固定版本 0.180.0 | MIT；`vendor/THREE-LICENSE.txt` 保留完整授权。使用 three.module / three.core、OrbitControls、BufferGeometryUtils，未修改第三方文件。 |

没有使用其他建筑模型、HDRI 里的背景街景、AI 生成建筑照片或未核实许可的旅游宣传图。材质全在本地，线上访问原来源失败不影响已交付场景运行。
