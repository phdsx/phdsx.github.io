# 飞行素材

来源：本次使用内置 image_gen 生成，art_source: host_image。独立插画，无第三方游戏素材。

## 飞机
Use case: stylized-concept. Asset type: single 2D aircraft game sprite for a side-view flight simulator. Create one entire large silver four-engine turboprop airplane inspired by the real TU-95 aircraft, strict orthographic side profile, nose facing RIGHT, level horizontal fuselage. Cool silver aluminum panels, long narrow nose, dark cockpit windows, swept wing, dark propellers visible edge-on, navy tail with small orange accent. Landing gear RETRACTED. Clean polished hand-painted aviation game illustration, readable silhouette at 230px wide. Transparent background, no ground, no shadow, no letters, no logos, no flags, no insignia, no border. Whole plane fits inside wide canvas with clear margin on every side. Aspect 3:1.

## 远景
Use case: stylized-concept. Asset type: distant scenery background plate, wide side-scrolling aviation game. Wide 3:1 panoramic illustration of distant layered blue and teal mountain ranges, an alpine valley with evergreen forests, soft pale cyan morning sky with a few thin clouds. Horizon around lower third, large empty sky above for flying. Quiet sophisticated hand-painted travel-poster aesthetic with subtle texture, muted cool palette, gentle sun haze on right. NO aircraft, no runway, no buildings, no foreground objects, no lettering, no logos, no watermark. This is noninteractive distant scenery; playable airport geometry is rendered separately.

## 运行时约定
- 原图均为 2172 × 724。飞机为原生透明 PNG，水平朝右，原图几何中心作为旋转点，按宽 218 世界画素显示。
- 远景仅作无碰撞的装饰背景；跑道、地面、目标区与飞机碰撞分别由 physics.js 的米制世界坐标控制。
- 出发跑道为 -200～1450 米；目标跑道见 LEVELS 配置。原点在海平面，y 朝上。
- 绘制顺序：天空/山景、云雾、地面、跑道、航迹引导、影子、起落架、飞机、警报。旋转不改变碰撞规则。
- aircraft.webp 为透明原图等比缩小后的运行时素材，valley.webp 为远景压缩素材，cover.webp 为游戏目录预览。
