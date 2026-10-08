# 第三方软件与素材声明

本项目整体采用 `AGPL-3.0-or-later` 许可证，但仓库中包含的第三方软件、字体、图片、音频及其他素材仍分别适用其原始许可证和版权声明。使用或再分发这些内容时，请同时遵守对应条款。

## 已识别的独立许可内容

| 路径或组件 | 许可证 | 说明 |
| --- | --- | --- |
| `tours/china/fujian/pingtan/` 与 `assets/tours/pingtan.webp` | MIT / ODbL 1.0 / CC BY 4.0 / CC0 1.0 / 公共高程提供者条款 | Three.js、OSM 地理数据、2016 EOxCloudless / Copernicus Sentinel 影像、Skadi 高程及 ambientCG 材质；预览图为本地场景截图。来源、精度与还原边界见该目录 `docs/SOURCES.md`、`docs/ACCURACY.md` 和 `data/sources.json`。版权参考照片未随项目分发。 |
| `tours/china/beijing/xiangshan/` | MIT / ODbL 1.0 / CC0 / CC BY / CC BY-SA / Copernicus DEM 条款 | 保留 Three.js、OSM、高程、Poly Haven 材质与参考照片的来源及许可；详见该目录 `SOURCES.md`、`assets/licenses/` 和照片署名。 |
| `tours/china/beijing/north-garden/` 与 `tours/china/qinghai/xining-zoo/` | MIT / ODbL 1.0 / 公共高程提供者条款 | Three.js、OSM 衍生数据、Mapzen 高程；各目录保留来源、地形署名与还原边界说明。 |
| `tools/lifestyle/pokemon-map/` | 组件按原许可；宝可梦形象归其原权利人 | 保留 MapLibre 许可和 `DATA_SOURCES.md`。宝可梦配图来源为 PokéAPI sprites，不因本站许可改变；数据来源、覆盖与访问限制见项目说明。React、Lucide、Turf 和 polygon-clipping 的许可随构建依赖保留，打包资源保留许可注释。 |
| `tours/china/fujian/mawei-shipyard/` | MIT / ODbL 1.0 / CC0 1.0 / 公共高程提供者条款 | 同版 Three.js 离线模块、OSM轮廓与衍生数据、Mapzen高程（USGS / NOAA）及ambientCG通用PBR。现场摄影和图纸仅链接考证，未随项目再分发。逐项许可见该目录 `THIRD_PARTY_NOTICES.md`、`data/sources.json` 和 `textures/manifest.json`。 |
| `tours/china/fujian/sanfang-qixiang/` 中的第三方软件、地图、照片及材质 | MIT / ODbL 1.0 / CC BY 4.0 / CC BY-SA 4.0 / CC0 1.0 | Three.js 本地依赖、OSM 原始快照与衍生数据、Wikimedia 参考照片和裁切细节、ambientCG 通用 PBR 材质。逐项来源、作者、日期、覆盖范围及变更见该目录 `SOURCES.md`、`data/sources.json` 和 `textures/manifest.json`。 |
| `tours/china/beijing/*/assets/` 中的 Three.js 0.180.0 | MIT License | 3D云游场景使用本地打包的 Three.js；各景点目录附 `THREE-LICENSE.txt`。 |
| `tours/china/beijing/*/data/` 中的 OpenStreetMap 衍生地图数据 | ODbL 1.0 | 原始贡献者署名和资料说明保留在场景界面及各景点的 `SOURCES.md` 中。 |
| `tours/china/beijing/summer-palace/textures/` | CC0 1.0 | ambientCG 材质经缩放和调色，素材来源见该场景的 `SOURCES.md` 和 `textures/manifest.json`。 |
| `beijing-zoo/public/textures/` 与对应公开目录 | CC0 1.0 | 复用 ambientCG 的四组 PBR 纹理，见 `beijing-zoo/docs/ASSETS.md` 和材质清单。 |
| `beijing-zoo/public/models/lion.glb` 与对应公开目录 | CC BY-NC 4.0 / 内嵌 CC BY-NC-SA 4.0 | kenchoo 的 Lion。保留署名、非商业及相同方式共享条件；文件未修改。许可版本差异、原作者页面及下载镜像见 `beijing-zoo/docs/ASSETS.md`。此动物资产不适用本站代码的 AGPL 许可。 |
| `assets/vendor/jsdiff-8.0.3/` | BSD-3-Clause | [jsdiff 8.0.3](https://github.com/kpdecker/jsdiff/tree/v8.0.3)，仅复用 Myers 差异算法的 `base.js` 和 `array.js`；文件未修改，版本和校验值见该目录 README，完整许可证见 [`LICENSE`](assets/vendor/jsdiff-8.0.3/LICENSE)。 |
| `games/strategy/xiuxian/` | CC BY-NC 4.0 | 原作谦君（Jun Qian），[源项目](https://github.com/setube/vue-xiuxiangame)。2026-09-27 适配本站子目录静态托管，移除上游统计脚本、PWA 和构建混淆。游戏代码与素材仍按 CC BY-NC 4.0 授权，仅供非商业使用；完整许可见 [`LICENSE`](games/strategy/xiuxian/LICENSE)。 |
| `games/arcade/fruit-ninja/` | Apache License 2.0 | 完整许可证见 [`games/arcade/fruit-ninja/LICENSE`](games/arcade/fruit-ninja/LICENSE)。 |
| `games/arcade/fruit-ninja/scripts/all.js` 中保留许可头的组件 | MIT License | 许可和版权声明已保留在源文件中。 |
| `games/strategy/three-kingdoms-baye/engine/` | MIT License | iBaye C/WebAssembly 移植引擎，Copyright (c) 2015 loongw；许可证见 [`LICENSE.iBaye.txt`](games/strategy/three-kingdoms-baye/LICENSE.iBaye.txt)。游戏数据与原作相关权利仍归其原权利人所有。 |
| `games/strategy/storm-siege/index.html` 中内嵌的 Three.js r160 | MIT License | 保留了原文件内的 Three.js 许可声明；使用或再分发时请遵守上游 MIT 许可证。 |
| `assets/vendor/three.module.r160.js`、`games/sports/free-kick/game.bundle.js` | MIT License | 从本仓库风暴攻城页面内嵌的 Three.js r160 模块提取并打包到任意球游戏中，保留原始许可声明。 |
| `games/classic/classic-3d.bundle.js` | MIT License | 基于本仓库 Three.js r160 模块生成的七款小游戏立体场景脚本，保留 Three.js 原始许可声明。 |
| `assets/ubuntu/icons/*.png` | CC BY-SA 4.0 | Ubuntu [Yaru 图标](https://github.com/ubuntu/yaru)，版权归 Yaru / Suru 贡献者；从官方仓库复制，未修改。见 `assets/ubuntu/YARU-ICONS-LICENSE`、`YARU-LICENSE-CCBYSA` 和 `YARU-AUTHORS`。 |
| `assets/ubuntu/icons/*.svg`、`assets/porcelain/icons/*.svg` | MIT License | [Bootstrap Icons](https://github.com/twbs/icons)，版权归 The Bootstrap Authors；原始图标，未修改，许可证见 `assets/porcelain/icons/LICENSE`。 |
| `assets/ubuntu/Ubuntu-*.ttf` | Ubuntu Font Licence 1.0 | [Ubuntu 字体](https://github.com/google/fonts/tree/main/ufl/ubuntu)，版权归 Canonical Ltd.，许可证见 `assets/ubuntu/UFL.txt`。 |

Ubuntu 主题的壁纸、首页背景、阅读和游戏配图（`assets/ubuntu/*.webp`）为本次主题制作的 AI 生成素材。Ubuntu 名称及相关标志归其权利人所有，PHDSX 为独立个人网站。

此清单用于帮助识别第三方许可，不取代各文件、目录或上游项目中的原始声明。如果本清单与原始声明不一致，以原始声明为准。

若发现遗漏，请通过项目的 [Issues](https://github.com/phdsx/phdsx.github.io/issues) 提交说明。
