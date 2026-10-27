# 第三方软件与素材声明

本项目整体采用 `AGPL-3.0-or-later` 许可证，但仓库中包含的第三方软件、字体、图片、音频及其他素材仍分别适用其原始许可证和版权声明。使用或再分发这些内容时，请同时遵守对应条款。

## 已识别的独立许可内容

`games/arcade/tu-95/` 包含 [TU-95 原游戏](https://www.silvergames.com/zh/tu-95)的汉化和去推广版本；原程序、美术、音乐归其原权利人，未发现独立再分发许可证，不因本站许可改变。使用本地 Ruffle 运行时（MIT 或 Apache-2.0，详细第三方声明见 `engine/LICENSE-Ruffle-Web.md`）；中文字形来自 Noto Sans CJK SC（SIL OFL 1.1，`engine/OFL-NotoSansCJK.txt`）。来源、校验和及改动范围见游戏目录 README。旧独立原型与其 AI 素材仍保存在同目录，供回退。

| 路径或组件 | 许可证 | 说明 |
| --- | --- | --- |
| `games/arcade/hill-climb/runtime/` 与 `cover.png` | 原游戏程序与素材归 Fingersoft 等原权利人；未发现独立再分发许可证 | 基于 [Hill Climb Racing Lite](https://poki.com/zh/g/hill-climb-racing-lite) 1.3.0 的 Defold/WebAssembly 构建；本地修改为中文、免广告奖励和离线平台适配。原版程序、图像、音频及商标不因本站 AGPL 改变权利归属；来源、校验和修改边界见该游戏的 `REA_FINDINGS.md`。新增中文字形来自 Noto Sans SC，采用 SIL OFL 1.1，许可证见 `runtime/NotoSansSC-OFL.txt`。 |
| `games/arcade/hole-city/runtime/` 与 `cover.jpg` | 原游戏程序与素材归 Voodoo 等原权利人；未发现独立再分发许可证 | 基于 [Hole.io](https://poki.com/zh/g/hole-io) 的 WebGL 2.20.4 构建；本地补充简体中文、去广告桥接及中文字体图集。原游戏程序、图像、模型和音频不因本站 AGPL 而改变权利归属；来源与响应 SHA-256 见该目录 `runtime/source-manifest.json`。中文补字来自 Google Noto Sans SC，采用 SIL OFL 1.1，许可证随附于 `runtime/NotoSansSC-OFL.txt`。 |
| `games/sports/penalty-cup/play/` 与 `cover.png` | 原游戏素材及程序归原权利人；未发现独立再分发许可证 | 基于 [Penalty Shooters 2](https://poki.com/zh/g/penalty-shooters-2)，原作者 10x10games。保留原版 Construct 运行时、球队数据、人物、场景和音频；本地修改为中文显示、广告接口离线替代和适配入口。文件来源、SHA-256 和分析边界见游戏目录 `source-manifest.json` 与 `README.md`。原游戏资源不因本站源码许可改变权利归属。 |
| `games/arcade/super-mario/upstream/` 与该游戏封面 | 源代码 MIT；原版图像、声音及游戏设计归 Nintendo 所有 | 基于 [reruns/mario](https://github.com/reruns/mario)，Copyright (c) 2017 Garrett Johnson。完整保留 MIT 许可及上游 README；本地修改、来源压缩包 SHA-256 见游戏目录 `README.md`。精灵、音频与其截图封面不因源码采用 MIT 或本站 AGPL 而改变原有权利。 |
| `games/arcade/space-cadet-pinball/engine/` | 引擎 MIT；原版游戏数据权利归原权利人 | [alula/SpaceCadetPinball](https://github.com/alula/SpaceCadetPinball) 的 WebAssembly 浏览器移植，基于 Andrey Muzychenko 的反编译引擎；保留完整 MIT 许可、下载来源和 SHA-256。球台、字体、图像与音频不适用 MIT 或本站 AGPL 许可。本站适配及原版资源边界见该目录 `README.md`。 |
| `assets/vendor/exiftool-wasm-1.0.4/` | Apache-2.0 / MIT / Perl 原许可 | colorhythm 的 ExifTool WebAssembly 封装及 zeroperl、Perl、ExifTool 13.59；用于本地读取相机快门次数。保留原版文件、许可证、来源和 SHA-256，详见该目录 README。 |
| `tools/media/service/package.json` 中的 Playwright | Apache-2.0 | [Playwright](https://github.com/microsoft/playwright)，用于隔离的抖音、小红书官方扫码浏览器；依赖固定在 lockfile，安装包保留 LICENSE / NOTICE。Chromium 单独下载并适用自身第三方许可，不随源码提交。未复制 MediaCrawler 源码。 |
| `tours/china/fujian/pingtan/` 与 `assets/tours/pingtan.webp` | MIT / ODbL 1.0 / CC BY 4.0 / CC0 1.0 / 公共高程提供者条款 | Three.js、OSM 地理数据、2016 EOxCloudless / Copernicus Sentinel 影像、Skadi 高程及 ambientCG 材质；预览图为本地场景截图。来源、精度与还原边界见该目录 `docs/SOURCES.md`、`docs/ACCURACY.md` 和 `data/sources.json`。版权参考照片未随项目分发。 |
| `tours/china/beijing/xiangshan/` | MIT / ODbL 1.0 / CC0 / CC BY / CC BY-SA / Copernicus DEM 条款 | 保留 Three.js、OSM、高程、Poly Haven 材质与参考照片的来源及许可；详见该目录 `SOURCES.md`、`assets/licenses/` 和照片署名。 |
| `tours/china/beijing/north-garden/` 与 `tours/china/qinghai/xining-zoo/` | MIT / ODbL 1.0 / 公共高程提供者条款 | Three.js、OSM 衍生数据、Mapzen 高程；各目录保留来源、地形署名与还原边界说明。 |
| `tools/lifestyle/pokemon-map/` | 组件按原许可；宝可梦形象归其原权利人 | 保留 MapLibre 许可和 `DATA_SOURCES.md`。宝可梦配图来源为 PokéAPI sprites，不因本站许可改变；数据来源、覆盖与访问限制见项目说明。React、Lucide、Turf 和 polygon-clipping 的许可随构建依赖保留，打包资源保留许可注释。 |
| `tours/china/fujian/mawei-shipyard/` | MIT / ODbL 1.0 / CC0 1.0 / 公共高程提供者条款 | 同版 Three.js 离线模块、OSM轮廓与衍生数据、Mapzen高程（USGS / NOAA）及ambientCG通用PBR。现场摄影和图纸仅链接考证，未随项目再分发。逐项许可见该目录 `THIRD_PARTY_NOTICES.md`、`data/sources.json` 和 `textures/manifest.json`。 |
| `tours/china/fujian/sanfang-qixiang/` 中的第三方软件、地图、照片及材质 | MIT / ODbL 1.0 / CC BY 4.0 / CC BY-SA 4.0 / CC0 1.0 | Three.js 本地依赖、OSM 原始快照与衍生数据、Wikimedia 参考照片和裁切细节、ambientCG 通用 PBR 材质。逐项来源、作者、日期、覆盖范围及变更见该目录 `SOURCES.md`、`data/sources.json` 和 `textures/manifest.json`。 |
| `tours/china/beijing/*/assets/` 中的 Three.js 0.180.0 | MIT License | 3D云游场景使用本地打包的 Three.js；各景点目录附 `THREE-LICENSE.txt`。 |
| `tours/china/beijing/*/data/` 中的 OpenStreetMap 衍生地图数据 | ODbL 1.0 | 原始贡献者署名和资料说明保留在场景界面及各景点的 `SOURCES.md` 中。 |
| `tours/china/beijing/summer-palace/textures/` | CC0 1.0 | ambientCG 材质经缩放和调色，素材来源见该场景的 `SOURCES.md` 和 `textures/manifest.json`。 |
| `tours/china/beijing/beijing-zoo/source/public/textures/` 与对应公开目录 | CC0 1.0 | 复用 ambientCG 的四组 PBR 纹理，见 `tours/china/beijing/beijing-zoo/source/docs/ASSETS.md` 和材质清单。 |
| `tours/china/beijing/beijing-zoo/source/public/models/lion.glb` 与对应公开目录 | CC BY-NC 4.0 / 内嵌 CC BY-NC-SA 4.0 | kenchoo 的 Lion。保留署名、非商业及相同方式共享条件；文件未修改。许可版本差异、原作者页面及下载镜像见 `tours/china/beijing/beijing-zoo/source/docs/ASSETS.md`。此动物资产不适用本站代码的 AGPL 许可。 |
| `assets/vendor/jsdiff-8.0.3/` | BSD-3-Clause | [jsdiff 8.0.3](https://github.com/kpdecker/jsdiff/tree/v8.0.3)，仅复用 Myers 差异算法的 `base.js` 和 `array.js`；文件未修改，版本和校验值见该目录 README，完整许可证见 [`LICENSE`](assets/vendor/jsdiff-8.0.3/LICENSE)。 |
| `assets/vendor/mediabunny-1.62.1/` | MPL-2.0 | [Mediabunny](https://github.com/Vanilagy/mediabunny) 原版浏览器模块，用于 B 站视频音轨封装；完整许可、固定版本来源及校验值随目录保留。 |
| `assets/vendor/js-md5-0.8.3/` | MIT License | [js-md5](https://github.com/emn178/js-md5)，用于 B 站 WBI 签名；增加 ESM 包装并选择便携实现，完整许可和上游版权声明保留。 |
| `tools/utility/vendor/qrcode.min.js` | MIT License | [QRCode.js](https://github.com/davidshimjs/qrcodejs)，站内二维码生成器与 B 站扫码登录共用本地模块；完整许可见 `LICENSE.qrcodejs`。 |
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
