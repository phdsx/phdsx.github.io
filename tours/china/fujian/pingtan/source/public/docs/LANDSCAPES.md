# 全岛景观清单与还原边界

本轮先按平潭官方景点总览、六条精品海岸线及官方地貌报道建立清单，再统一扩展场景。清单不宣称穷尽所有自然岩石或村落。可定位浏览15处；另列尚缺精模的景观与主岛范围外景点。

1单位=1米；真实OSM岸线、道路、沙滩与岛岸轮廓不改造。地貌表面变化只用于标明的局部近似模型，绝不作测绘数据输出。

| 景观 | 区域 | 当前覆盖 | 尚缺或近似 |
|---|---|---|---|
|镜沙|北岸|近似建模|真实岸线 · 洞口位置/外观近似|
|仙人井|东岸|近似建模|真实景区定位 · 井体与中心位置近似|
|石牌洋|西岸|近似建模|真实区域 · 地貌外观近似|
|猴研岛|南岸|近似建模|真实岛岸轮廓 · 岩体近似 / 设施暂缺|
|象鼻湾|西岸|地理基础 / 精模或动态暂缺|真实沙滩与沙堤轮廓 · 潮汐暂缺|
|将军山|南岸|地理基础 / 精模或动态暂缺|真实峰位与DEM · 纪念设施暂缺|
|南寨山|内陆|近似建模|区域定位 / 岩群近似 · 单体石景暂缺|
|澳前渔港|东岸|地理基础 / 精模或动态暂缺|真实区域与映射地物 · 船舶/港区精模暂缺|
|北港村|东岸|近似石厝样板 + 真实聚落轮廓|完整建筑覆盖及逐栋立面|
|长江澳|北岸|真实沙滩/风机点位|潮位、水深及风机机型|
|龙王头|东岸|真实沙滩 + 观光车近似|实测观光车轨迹|
|坛南湾|南岸|真实沙滩轮廓|栈道、设施及木麻黄逐株资料|
|北部生态廊道|北岸|真实北部岬角地形/道路 + 岩岸近似|玻璃栈道与观景台实测模型|
|君山|内陆|真实DEM峰位|高分辨率裸地高程与植被调查|
|大福湾|南岸|暂缺精细资料|桥梁和海湾准确设施坐标；不能将住宿POI当桥位置|
|沙地底|北岸|暂缺精细资料|沙丘范围、层理及最新地形；目前保留影像/DEM|
|海坛古城|内陆|暂缺精细资料|建筑轮廓、立面与设施；目前保留影像/映射地物|
|海坛天神（塘屿岛）|离岛|主岛范围外|不可挪到海坛岛；本项目未加载塘屿岛完整数据|
|通天门（大练岛）|离岛|主岛范围外|不冒充主岛景点；缺完整离岛模型|

## 新增模型的依据

### 镜沙

深灰黑色裂隙礁岸、黄色沙地与海蚀洞。洞口、洞深和单块岩体按照片近似；岸线沿用真实 OSM，洞口尚无测绘坐标。

- 空间依据：OSM coast node at east end of beaches w1285652150/w1285652151; regional interpretation, not surveyed cave mouth。
- 分类：真实岸线 · 洞口位置/外观近似。镜头与模型使用区域约位，不能作为实测洞口/中心/石景坐标。
- 米制尺寸：{"caveWidth":8,"caveHeight":7,"caveDepth":14,"basis":"visual estimate, not measured"}。
- [参考资料](https://www.ptnet.cn/ly/2022-12/18/content_2038133.html)
- [参考资料](https://www.amap.com/place/B0JRBL0WVQ)
- [参考资料](https://hk.trip.com/moments/detail/pingtan-county-2652-129545900/)

### 仙人井

东海仙境的海蚀竖井、陡壁与井底涌潮。口径约50米、深约43米依据官方报道；井壁、三处通海洞和步道为照片近似。

- 空间依据：OSM viewpoint n5931451116 and adjacent source coastline; approximate well centre。
- 分类：真实景区定位 · 井体与中心位置近似。镜头与模型使用区域约位，不能作为实测洞口/中心/石景坐标。
- 米制尺寸：{"diameter":50,"depth":43,"seaPassages":3,"basis":"Pingtan official approximate published dimensions; no 3D survey"}。
- [参考资料](https://www.ptnet.cn/ly/2025-02/15/content_2096309.html)
- [参考资料](https://www.ptnet.cn/a/2022-09/02/content_2028266.html)
- [参考资料](https://you.ctrip.com/sight/pingtancounty2652/1480091.html)

### 石牌洋

海中真实礁盘上的一高一低双石帆。约33米与17米高度依据平潭时报；柱体曲面、宽厚与位置关系参考官方影像近似。

- 空间依据：OSM closed reef ring near the reported coarse location 25°35.0′N 119°40.8′E; no independently surveyed precision。
- 分类：真实区域 · 地貌外观近似。源数据未声明测绘精度。
- 米制尺寸：{"eastHeight":33,"westHeight":17,"basis":"official rounded heights; other dimensions approximate"}。
- [参考资料](https://www.ptnet.cn/a/2017-09/22/content_1194949.html)
- [参考资料](https://www.prnewswire.com/news-releases/all-the-way-to-the-blue-midsummer-of-pingtan-rv-self-driving-campaign-held-in-pingtan-pingtan-international-tourism-island-has-become-a-self-driving-resort-301112484.html)

### 猴研岛

68海里景区的花岗岩岩岛与狭窄水道。岛岸轮廓采用真实 OSM；球状风化岩为类型化近似，碑刻、游步道与旅游设施尚缺测绘。

- 空间依据：OSM coast way w1180027916, unchanged footprint。
- 分类：真实岛岸轮廓 · 岩体近似 / 设施暂缺。源数据未声明测绘精度。
- [参考资料](https://www.ptnet.cn/a/2022-09/02/content_2028266.html)
- [参考资料](https://mapcarta.com/W1180027916)

### 象鼻湾

建民沙坝的西向狭长沙堤与两侧海域。采用 OSM 沙滩 w511682172，并与2016影像核对；当前是固定时刻的轮廓，尚未模拟潮汐引起的沙坝变形。

- 空间依据：OSM beach w511682172, region corroborated by official tourism map and EOX 2016 imagery。
- 分类：真实沙滩与沙堤轮廓 · 潮汐暂缺。源数据未声明测绘精度。
- [参考资料](https://www.ptnet.cn/wap/content/2022-03/27/content_2014431.html)

### 将军山

南端山体、海湾和岩岸的空间关系采用 OSM 与原始高程。保留山体尺度；纪念设施、海蚀裂隙和单体石景暂缺精细资料。

- 空间依据：OSM peak n9153646223; Skadi DEM。
- 分类：真实峰位与DEM · 纪念设施暂缺。源数据未声明测绘精度。
- [参考资料](https://www.ptnet.cn/gtx/2015-05/28/content_1312805.html)

### 南寨山

内陆低丘上的球状风化花岗岩群。官方资料核实景观类型；区域定位与单体岩石为近似，内部路径和命名象形石暂缺。

- 空间依据：Approximate regional interpretation corroborated by official tourist inventory and Amap B024F057H0; not surveyed rock positions。
- 分类：区域定位 / 岩群近似 · 单体石景暂缺。镜头与模型使用区域约位，不能作为实测洞口/中心/石景坐标。
- [参考资料](https://www.ptnet.cn/gtx/2015-05/28/content_1312805.html)
- [参考资料](https://ditu.amap.com/place/B024F057H0)

### 澳前渔港

澳前岸线与映射道路组成的渔港区域，与自然岩岸、沙滩区别呈现。当前保留地理基础；逐艘渔船、码头设施与最新港区模型暂缺。

- 空间依据：OSM bus stop n10581560550 serves as harbour area locator, not quay survey。
- 分类：真实区域与映射地物 · 船舶/港区精模暂缺。源数据未声明测绘精度。
- [参考资料](https://www.ptnet.cn/wap/content/2022-03/27/content_2014431.html)

## 已对齐与未对齐

镜沙区域与OSM沙滩w1285652150、w1285652151、真实东端岩岸及2016影像一致；海蚀洞自身的位置和形状为区域约位。洞腔约8×14米范围替换粗DEM表面，照片估计的宽/高/深约8/7/14米不具有测量精度。仙人井区域使用东海仙境OSM景区及仙人洞观景点作为约位依据，井口中心、崖壁局部高程和步道并未达到测绘对齐。约50米口径/43米井深采纳2025年官方报道，不能把原始DEM的粗糙地表称作实际井深。周边约100米范围内的近似井体覆盖视觉地表；原始高程文件保持原样。

石牌洋位于源数据真实独立小礁盘，双柱分别约33米、17米；实际碑形曲面、宽厚和柱距仅参考照片。猴研岛使用w1180027916真实闭合岛岸；象鼻湾使用w511682172真实狭长沙滩，与历史影像核对西向沙堤，当前潮位未知。所有场景的水色依岸距模拟，并无实测近岸水深。

洞壁没有完整相机碰撞；井底涌潮目前仅小幅水面动画，没有流体仿真。精细建模仍需近期无人机正射/倾斜影像、1–5米DEM和地貌测量；大福湾桥梁不能用住宿POI替代定位。海坛天神在塘屿岛、通天门在大练岛，未挪到主岛冒充完成。

## 来源与权利

OSM轮廓为ODbL 1.0；2016 EOX影像为CC BY 4.0；自编几何代码依项目AGPL-3.0。官方报道提供景观事实和近似尺寸，版权照片只作本地比对，未复制到运行资源或交付压缩包。镜沙洞腔参考Trip.com实拍游记，仙人井参考携程景区照片，石牌洋参考平潭旅游宣传照片；各项链接列于上方。高德页面只用于少量地点的区域核对，未使用其地图瓦片、未把其内容标作开放ODbL数据。

- [官方景点/地貌资料](https://www.ptnet.cn/wap/content/2022-03/27/content_2014431.html)
- [官方景点/地貌资料](https://www.ptnet.cn/a/2022-09/02/content_2028266.html)
- [官方景点/地貌资料](https://www.ptnet.cn/ly/2022-12/18/content_2038133.html)
- [官方景点/地貌资料](https://www.ptnet.cn/gtx/2015-05/28/content_1312805.html)
- [官方景点/地貌资料](https://fdi.swt.fujian.gov.cn/uploadfiles/file/20211224/1640334628880911.pdf)
