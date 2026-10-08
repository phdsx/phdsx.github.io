# 素材来源与独立许可

访问日期统一为 2026-10-01。代码遵循仓库 AGPL-3.0-or-later；以下资产各自使用原许可，不能由代码许可重新授权。

| 资源 | 作者 / 来源 | 许可及处理 |
| --- | --- | --- |
| `models/lion.glb` | [kenchoo 的 Lion](https://sketchfab.com/3d-models/lion-61d687ca92dc4cafbd5e74e3be40d49d)，[作者](https://sketchfab.com/kenchoo)，[vr-cats 镜像](https://github.com/code4fukui/vr-cats) | 原 GLB 元数据和镜像署名为 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)，访问时原页面为 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)。保留署名、NC 和 SA 条件，不自行消除历史许可要求；商业使用须取得作者授权。原 GLB 未修改，运行时缩放、粗糙度调整、骨骼待机；不播放接地尚未验证的源行走。大小和 SHA256 见 `models/manifest.json`。 |
| 树皮 | [ambientCG Bark007](https://ambientcg.com/view?id=Bark007) | CC0 1.0 |
| 路面 | [ambientCG PavingStones036](https://ambientcg.com/view?id=PavingStones036) | CC0 1.0 |
| 地表 | [ambientCG Ground037](https://ambientcg.com/view?id=Ground037) | CC0 1.0 |
| 岩石 | [ambientCG Rock039](https://ambientcg.com/view?id=Rock039) | CC0 1.0 |
| 地理数据 | [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright) | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)，原始来源 ID、地理坐标和署名保留。衍生地图数据库按 ODbL 提供。 |
| Three.js 0.180.0 | [Three.js](https://github.com/mrdoob/three.js/tree/r180) | MIT；完整许可 `THREE-LICENSE.txt` |

四组材质复用本仓库颐和园场景的已署名资源：768×768 WebP、color/normalGL/roughness，经过缩放与部分调色，估算真实纹理周期。精确链接和变化见 `textures/manifest.json`。不是北京动物园现场拍摄的专属材质。

叶片贴图、天空、水纹、建筑体积、围栏、门窗和设施由项目代码生成，无第三方照片背景。叶片贴图用于实际三维树冠卡片。官方导览 PDF 和官网照片仅作为研究参考，未经重新授权的原照片不随公开产物分发、不用作背景或全景。`research/` 被 git 忽略。

排除的候选资源：WildLives 镜像署名与原作者页面许可不一致的狮子、未能明确单项资产来源许可的 giraffe/LFS 占位文件及不符合解剖品质要求的动物资源。没有购买付费资产，没有把同一模型重新标签为其他物种。

目前仅非洲狮展示模型，数量 1 为演示数，非实际存栏数；其他 40 条记录见 `data/missing-models.json`。其中象、部分鸟类等只是未明确分类的资料条目，须先核实实际物种，再选择对应模型。
