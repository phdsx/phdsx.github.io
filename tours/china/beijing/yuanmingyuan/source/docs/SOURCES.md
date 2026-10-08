# 参考资料与许可

检索日期：2026-10-01，北京时间。逐项来源及用途、时间、可信程度在`public/data/sources.json`，页面“资料与依据”也能直接查看。外部资料作为证据读取，不作为运行资源。

## 主要史料

- [故宫所藏1786《圆明园长春园图》](https://www.dpm.org.cn/ancient/yuanmingqing/160017.html)：选定截面，西洋楼各景同期图版。研究下载的大水法正面图已实际观察，核对石龛的完整卷曲轮廓、叠盘与塔式水法；图幅不是正射测绘，几何尺寸只能推算。
- [故宫《御制圆明园四十景诗》](https://www.dpm.org.cn/ancient/hall/158709.html)：1745刊本的景名和形制；不当作1786逐栋建筑状态证明。
- [国图样式雷](https://www.nlc.cn/nmcb/gcjpdz/ysl/wc/)：圆明园地盘全图缩略图，原图未明确年份；缩略图分辨率不足以量取开间，仅参考关系。
- [故宫三园地盘河道图研究](https://www.dpm.org.cn/explode/others/203786.html)：PDF真实下载并渲染。原图年代未确认，文内出现道光与同治分期，故不照搬成1786建筑。曾先误取另一册刊物92页（谐奇趣图版），发现后更正为1574目录下91–96页，误取资料只用于西洋楼图像研究，不当作河道图。
- [清史研究所舆图研究](https://iqh.ruc.edu.cn/old/qdhjylyjzx/xszl/ylfj/7c89633b1d0247b7bd91da2ff25c61f8.htm)：明确提醒舆图存在年代混合、拟建而未建等问题，约束本项目的复原宣称。
- [圆明园研究40期](https://www.yuanmingyuanpark.cn/ymyyj/yj040/201612/t20161230_1330939.html)：西洋楼关系、海晏堂面西、1783远瀛观和1770五竹亭迁移。只采用经过交叉资料支持的空间描述。
- [海岳开襟分期研究](https://www.yuanmingyuanpark.cn/xs/ktsb/202406/t20240627_4658366.html)：参考1782修缮记录的乾隆形制，区分后期去亭、去廊状态；不引入咸丰改建体量。
- [万方安和空间研究](https://www.dpm.org.cn/journal/246859.html)：卍字平面、33间、卷棚顶。工程仅表现平面与大体屋面，不伪称精确33间分室。
- [绮春园沿革](https://www.yuanmingyuanpark.cn/ymyyj/yj032/201504/t20150420_693218.html)：1769定名、1773正觉寺；未取得完整1786分期图，不补齐嘉庆扩建。
- [正觉寺保护研究](https://wwj.beijing.gov.cn/bjww/resource/cms/article/bjww_362762/436174432/2023080311135385699.pdf)、[黄花阵修复记录](https://www.yuanmingyuanpark.cn/cgll/zyjd/ccy/201101/t20110105_231510.html)、[西洋楼分期讲座](https://www.dpm.org.cn/learing_detail/379500.html)：分辨现存石构、基址、修复圆亭和消失的布景；现代状态仅作为信息。

## 地理与照片

[2023官方导览图](https://www.yuanmingyuanpark.cn/pw/kdt/202312/t20231230_4634877.html)区分现代规划范围和现状边界。已下载并实际观察全图；不冒充1786园界。[官网西洋楼旧照](https://www.yuanmingyuanpark.cn/ymwy/201806/t20180605_1513850.html)及官网研究页的多角度照片用于材质、细部参考，照片年代与1786有区别，破损状态不在历史场景中使用。没有复刻现代重建桥亭、摊点或遗址残柱。

[OpenStreetMap](https://www.openstreetmap.org/#map=16/40.006/116.298)：经公开Overpass接口取得WGS84数据。来源XML接口曾返回429，另一Overpass接口取得JSON；扩大范围补充请求失败，没有编造为已补齐。大水法等点位直接定位，海晏堂、黄花阵及正觉寺为地图关系估计。水面多边形与孔洞保留原坐标，不为构图缩放。原始OSM与派生数据采用[ODbL 1.0](https://www.openstreetmap.org/copyright)，页面明确署名 **© OpenStreetMap contributors**，派生数据库随静态产物提供。此地图是现代地理代理，**不是1786复原测绘数据**。

检索了[公开Terrain Tiles入口](https://registry.opendata.aws/terrain-tiles/)，没有取得1786高程资料，也没有导入DEM。因此所有地形起伏明确为推测，未声称用过测绘高程。

## 素材

[Bark007](https://ambientcg.com/view?id=Bark007)、[PavingStones036](https://ambientcg.com/view?id=PavingStones036)、[Rock039](https://ambientcg.com/view?id=Rock039)、[Ground037](https://ambientcg.com/view?id=Ground037)复用已有颐和园工程的768px WebP；均为[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。源贴图已有去饱和、提亮与缩放，本项目运行时进一步提亮石材色图。记录见textures/manifest.json。

屋顶瓦纹、叶簇、近似彩画和所有几何由本项目代码生成，非考古扫描或原始装饰复刻。无未知许可GLB，无付费资产购买。Three.js/MIT、Vite/MIT、Playwright/Apache-2.0，生产包保留Three.js许可标识。

官方图片、网页和PDF版权保留，仅在本地研究目录，不作为网页贴图，不在发布和交付ZIP中复制。运行截图为本项目实际渲染，不含外部照片背景。
