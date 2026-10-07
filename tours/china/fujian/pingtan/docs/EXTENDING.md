# 高精度资料接入

运行时 `src/load.js` 加载本地文件，不依赖特定地图 SDK 或密钥。新增资料应明确许可、观测日期、分辨率、投影及垂直基准，更新 sources.json 与本目录精度清单。不要直接叠加 GCJ-02/BD-09 坐标。

## 地形

`terrain.json` 给出 nx/nz、step、x0/z0、width/depth，数组按北向南逐行、每行西向东排列。高程文件是 little-endian float32，长度严格为 `nx*nz*4`，Y 为米。`land.u8` 同格网，0 海域、1 陆域。保留一份原始高程与一份视觉表面。

当前预处理在 `scripts/geo.py` 实现 EPSG:32650 正反算，`prepare-data.py` 将 1° N25E119 Skadi 文件重采样到 40m。接入 GeoTIFF / 点云时，先以可靠地理工具重投影到同一 UTM 网格，并明确高程基准变换。没有基准时记录不确定性。替换采样间距后同步 terrain.js 的 tile grid 与 collisionHeight 档位，当前实现的 40/80/160m 档位仅服务当前数据。

大面积 1m 高程不要直接放进单个 Float32Array：切成 1600m 米制瓦片，为每级 LOD 分开数据与纹理，按相机距离/视锥请求；保留共享边界格网避免裂缝。目前按需生成细网格，不宣称已有高精度瓦片服务。

## 矢量与模型

`geography.json` 的 coastlines 是闭合 `[x,z]` 环；roads/buildings/areas 的 points、holes 都是局部米制坐标，tags 保留原图属性。新增 OSM XML 可用 prepare-data.py 按 node/way/relation ID 合并。主岛闭合必须验证，不允许补一条无出处岸线完成闭合。

已知高度应存入 building.height（米）并写入来源；立面/屋顶有精确资料再替换 details.js 的类型化生成器。导入 glTF 时用其真实基准点设置局部位置，核实模型单位为米，记录朝向与基准高程。不得把整个 glTF 拉伸到地图边界以“拟合”。

## 影像、土地覆盖与海水

地形 map UV 对应 geo.metadata.bounds：u=(x-x0)/width，v=1-(z-z0)/depth。新的影像需正射与 UTM 重投影，避免凭目测拉伸。现有 2016 纹理已经重投影，可只替换相同 footprint 的纹理与来源清单。

coastal-field.png：R 海陆掩膜 0/255，G=128+岸内正/岸外负距离(m)/4，B=地类代码（32 沙滩、64 岩地、96 林地、128 灌丛/草地、160 农地、192 聚落、224 内陆水域）。该 G 是岸距，不能当作深度。真正水深应增加独立 depth texture，声明潮位/基准，再用深度改写 ocean.js 的吸收与浅水渐变。

## 可复现流程

```powershell
powershell -File scripts/fetch-data.ps1
python scripts/prepare-data.py
python scripts/prepare-landmarks.py
node scripts/update-landscape-docs.mjs
npm run check
npm run build
```

下载脚本仅访问清单中的公开来源。Python 需要 numpy、Pillow，距离变换用 Node，无 scipy。原始 TIFF/HGT 等大型原件可以保持研究副本；发布时只放许可允许的加工资源与完整署名。

## 地貌清单与局部替换

`landmarks.json` 由 `prepare-landmarks.py` 离线生成，含定位依据、区域、模型分类、实景链接、近似尺寸和资料缺口。`positionClass=approximate` 不得转成测绘精度声明。洞口或井口有实测坐标后才能替换约位；新景点必须先补来源与状态，再接入模型。

`landmarks.js` 的竖井、洞穴、双柱和岩岛使用米制尺寸。仙人井周边约100米内的DEM显示由独立井体/崖壁替代；镜沙洞腔约8×14米内的粗地面由洞底替代，作为参考近似。原始高程文件与海岸线不变；`sourceHeight()` 读取源表面，`height()` / `collisionHeight()` 对局部模型提供视觉地面。取得真实点云后，应移除近似替换并接入实际表面，避免叠加两个地面。
