# 参考资料、用途与许可

| 来源 | 具体用途 | 精度/权利说明 |
|---|---|---|
| [天坛公园官方导览全图](https://www.tiantanpark.cn/navigation_map.html) | 园区空间组织、南北轴线、出入口、祈谷坛/圜丘坛/斋宫/神乐署相对方位、道路层级 | 比对布局，不复制图片到部署资源。研究用参考截图未随构建发布。 |
| [天坛公园：祈年殿](https://www.tiantanpark.cn/scenic_spot_list_g7yU_96/detail/1169.html) | 高约 38 米、外檐柱间径约 24 米、蓝色三重檐、用途 | 官方文字事实；场景外形按照片推算，非测绘。 |
| [北京市政府：祈年殿](https://japanese.beijing.gov.cn/specials/parktours/guidevisitors/templeofheaven/mustsee/202301/t20230113_2899002.html) | 38.2 米 / 24.2 米，作为精细尺度基准 | 政府公开资料；仅引用事实。 |
| [天坛公园：皇穹宇](https://tiantanpark.cn/scenic_spot_list_g7yU_96/detail/1178.html) | 殿台通高 19.5 米、直径 15.6 米、单檐形制与用途 | 官方资料。 |
| [天坛公园：丹陛桥](https://www.tiantanpark.cn/scenic_spot_list/detail_g7yU_99/1447.html) | 长 360 米、宽 30 米、向北渐高 4 米 | 官方资料，桥的平面形状以 OSM 轮廓校准。 |
| [北京市文物局：北京天坛圜丘坛建筑尺度研究](https://wwj.beijing.gov.cn/bjww/362760/362770/436348561/) | 三级圆坛面直径、层高、壝墙参考 | 文物局公开研究，采用其中现代米制数据。 |
| [天坛公园：回音壁](https://www.tiantanpark.cn/scenic_spot_list_g7yU_96/detail/1177.html) | 皇穹宇圆形院墙、历史与名称 | 官方事实；墙的曲率和缺口以 OSM 轮廓近似。 |
| [北京市公园管理中心：斋宫](https://gygl.beijing.gov.cn/mlgy/mlgy_lsmy/202508/t20250806_4167533.html) | 斋宫约 4 万平方米、历史与主要建筑 | 官方事实，现状细部为近似。 |
| [天坛公园：神乐署介绍](https://www.tiantanpark.cn/index.html) | 神乐署位置和用途 | 官方文字；建筑轮廓取 OSM。 |
| [北京市政府：天坛公园](https://www.beijing.gov.cn/renwen/rwzyd/lyjq/5A/ttgy/202210/t20221018_2838152.html) | 全园轴线、建筑群关系和大面积古柏林 | 政府公开文字；面积口径与 OSM 当前边界存在差异。 |
| [UNESCO 世界遗产地图](https://whc.unesco.org/en/list/881/maps/) | 遗产区整体方位与范围交叉核查 | UNESCO 地图中登记遗产区 215 公顷；不能直接当现状公园边界。 |
| [OpenStreetMap 原始地图 API](https://www.openstreetmap.org/api/0.6/map?bbox=116.397,39.871,116.422,39.892) | 本地园区边界、道路、主要建筑、围墙与门的经纬度轮廓 | © OpenStreetMap contributors，[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)。原始 XML 存于 `research/osm-map.xml`，生成后的米制坐标 `public/data/layout.json` 保留署名和许可。 |
| [UNESCO 天坛照片集](https://whc.unesco.org/en/list/881/gallery/) | 祈年殿、圜丘多个视角轮廓核验 | 摄影作品版权归页面所列作者；仅作研究视觉参考，不下载为应用贴图。 |
| [Wikimedia Commons：祈年殿正面照片](https://commons.wikimedia.org/wiki/File:%E5%A4%A9%E5%9D%9B_%E7%A5%88%E5%B9%B4%E6%AE%BF_-_panoramio.jpg) | 正面三檐、宝顶、檐间蓝色装饰带、台阶与栏板层次比对 | 按来源页面标识的摄影许可，仅用于本地核验；图片未作为应用纹理发布。 |
| [北京市政府外文网站：祈年殿斜视照片](https://russian.beijing.gov.cn/travellinginbeijing/mustvisitsites/202306/t20230608_3126546.html) | 侧前方檐口比例、三层台基、入口与附属构件比对 | 政府网站图片仅作研究参考，不复制进应用。 |
| [新浪图片：祈年殿鸟瞰照片](https://k.sinaimg.cn/n/sinakd20200802ac/252/w640h412/20200802/8906-ixeeirz3756769.jpg/w700d1q75cms.jpg?by=cms_fixed_width) | 三层台基、檐层比例、栏板和附属建筑鸟瞰比对 | 仅作本地核验；不纳入打包资源、不授予本项目使用许可。 |

**网站素材：**运行时的建筑、树木、道路、围墙、程序纹理由项目代码生成；无外部照片、图像纹理或第三方建筑模型。Three.js、Vite 与 Playwright 的许可证随各 npm 包分发；生产环境仅打包 Three.js。界面地图仅由项目内 OSM 衍生坐标绘制，并显示 OSM 署名。
