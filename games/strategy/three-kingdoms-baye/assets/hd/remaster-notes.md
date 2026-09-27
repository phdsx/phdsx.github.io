# 地图重制素材

采用用户批准的合成稿：`exec-dd055c1d-3137-4a0f-a6e9-08bfe219df74.png`（2026-09-26）。素材使用内置 image_gen 制作；生成结果保留原文件，项目使用本目录副本。

- `world-terrain.png`：1448 × 1086，完整 12 × 9 瓦片地图的黑白地形插画。参考原版 192 × 144 地形，保留主要山脉及河道布局；线条与海岸细节属于美术重绘，并非原点阵的逐像素放大。无烘焙城池或道路。精确提示词见 `world-terrain-prompt.txt`。
- `city-gatehouse.png`：1254 × 1254，独立黑白城楼；有效源矩形 `(119,190,1014,885)`。所有城市共用建筑造型，所有权由实时旗帜表示。
- `rulers-1.png`、`rulers-2.png`：各 1086 × 1448，3 列 × 4 行；`rulers-3.png`：1254 × 1254，3 列 × 3 行。按原始位图逐一对应四个剧本的 33 位初始君主。
- `generals-1.png`：1086 × 1448，3 列 × 4 行，2026-09-27 补充韩遂、马超、庞德、侯选、程银、李堪、张横、梁兴、成宜、马玩、杨秋、马岱。内置 image_gen 按提取的原头像参考逐格重绘，来源 `exec-e01fe6a6-6a8f-490d-a054-9d786d7ab4ee.png`，完整提示词见 `generals-1-prompt.txt`。运行时按 `general-portraits.json` 的身份及原位图匹配到各剧本，同时覆盖人物信息和事件弹窗。

- `generals-2.png` 至 `generals-17.png`：各 1254 × 1254，4 列 × 4 行，新增其余 253 种原始头像资源（最后一张使用 13 格）。内置 image_gen 按原头像逐格重绘。各格的姓名、剧本、原索引见 `general-portraits.json`；完整提示词见 `portrait-batch-prompts.json`；原生成路径见 `portrait-batch-results.json`。保留原版彩蛋虫、鬼及无名占位图，没有将它们换成人脸。

当前四个剧本的 800 个头像条目全部映射完成，共 298 种不同原始图像，20 张图集。该数量包括同一武将跨剧本的不同造型、彩蛋与占位图，并非 298 位独立武将。素材正常加载时不再因缺少人物映射而退回点阵；加载失败仍保留原图以保障游戏可用。

坐标、38 座城市名称、道路连接、四个剧本的人名和位图指纹来自原资源；构建器 `tools/build-map-art.cjs` 可重复提取。地图上的本方/敌方/无主旗帜、君主旗号和选中城市信息由只读引擎观察生成，不使用效果图里的演示归属。同姓君主显示全名，复姓保持完整。图片均以黑白绘制，再使用原词典绿色 `#b8c58d` 统一着色。

## 城楼生成提示

One isolated miniature Chinese walled gatehouse in the approved three-quarter architectural style. Squat square crenellated stone enclosure, one dark arched gate, a small double-eaved tiled-roof tower. Strong black ink contours and sparse woodcut hatching for a 40–100 pixel map icon. Plain opaque white square background. No flags, poles, ownership symbols, circles, writing, terrain or cast shadows. Preserve the architecture while making the entire background opaque white.

## 头像生成提示

### 图集 1

Redraw this exact atlas of 12 original 三国霸业 ruler portraits into high resolution BLACK INK line art on solid WHITE. EXACT 3 columns x 4 rows, 1536x2048 target, each equal square cell 512x512, NO gutters, borders, names, text, or numbers. Each portrait must stay within its own cell with 5% white margin. Keep ALL 12 identities and original ordering, each original distinctive headdress, face direction, beard, eyebrows, hair silhouette and expression. Do not reuse faces or invent generic portraits. Top-left Ma Teng: clear bold clean contours matching original face, not jagged pixels. All portraits same clear high resolution pen drawing style, large black shapes plus clean readable fine features, no crosshatching or gray wash. Straight faithful remaster of each original 24x24 sprite, smoothing into newly drawn curved linework, not pixel upscale. First row Ma Teng/Gongsun Zan/Gongsun Du; second Zhang Yang/Liu Bei/Yuan Shao; third Kong Rong/Wang Kuang/Dong Zhuo; fourth Han Fu/Cao Cao/Tao Qian. White square background in all cells, no decorative elements, no colored ink. EXACT 12 independent heads in their original 3x4 positions. This is a sprite atlas used at runtime by original character identity.

### 图集 2

Remaster the FIRST attached exact 12-portrait source sprite atlas into clear high resolution BLACK INK line portraits on solid WHITE. The SECOND image is STYLE REFERENCE ONLY showing previously remastered portraits; do not copy its character identities. Output exact 3 columns x4 rows equal square cells, target1536x2048, no gutters/no borders/no labels/no text. Preserve first image's exact ordering, face angle, headdress and hair, facial hair, expression and different identities. No giant pixels: new crisp bold curved pen contours with simple fine features, no hatching/shading. Each face inside its square cell with5%white margin, no elements bleeding across cells. Row1 Zhang Lu, Liu Dai, Yuan Shu. Row2 Liu Yan, Liu Biao, Sun Jian. Row3 Li Jue, Lu Bu, Liu Zhang. Row4 Zhang Xiu, Sun Ce, Han Xuan. Keep each face faithful to first image especially facial hair vs clean shaven, headgear and direction. This is 12 ORIGINAL identities, not interchangeable generic Chinese men. Exact12 heads,3x4, white background.

### 图集 3

Redraw FIRST attached exact nine portrait sprite atlas into high-resolution black-ink Chinese ruler faces on solid WHITE, faithful to each source character. SECOND image is ONLY linework style reference (previous finished sheet), not identity source. Exact 3 columns x3 rows, equal square cells, target1536x1536, eachportrait5%whitepadding. No borders,gutters,text,names,numbers. Preserve ALL9 different face identities, originalordering, headgear,hair,faceangles,beards,expressions. Crisp bold fluid black contours plus simple readable features, no pixelblocks, no graywash/hatching. Row1 Zhang Miao,Gongsun Kang,Sun Quan; row2 Jin Xuan,Liu Du,Zhao Fan; row3 Cao Pi,Liu Shan,Meng Huo. Keep Sun Quan's distinctive rear headgear and face angle; Meng Huo's distinct warrior headgear and smile. All9heads must be present, none substituted/copied/merged. Keep clean-shaven heads clean-shaven; beards where sourcehasbeards. High readability as small gameplay portraits, not photorealism. All backgrounds white.
