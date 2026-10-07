"""Create labelled, non-calibrated visual comparison plates and a static report."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json
root=Path(__file__).resolve().parents[1]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',23)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
pairs=[('north-gate','南后街北口 · 结构与机位近似','north-gate-2023.jpg','JULIANISME · 2023-08-25 · CC BY-SA 4.0',
        '四柱、三跨和题字有照片支持；尺寸、雕饰厚度、周边立面未测绘。'),
       ('ye-residence','叶氏民居立面 · 候选轮廓映射','ye-residence-2023.jpg','Yumeto · 2023-10-20 · CC BY-SA 4.0',
        '五拱窗、灰砖、阳台可比较；门牌与 OSM 轮廓对应未核准，不证明准确位置。'),
       ('heart-tree','爱心树附近 · 形态与街景类型近似','heart-tree-2023.jpg','JULIANISME · 2023-08-25 · CC BY-SA 4.0',
        '保留照片拍摄点；树位、尺度、视线朝向及两侧逐栋立面仍为估算。')]
for key,title,photo,credit,notes in pairs:
    sheet=Image.new('RGB',(1640,790),'#f5f5ed');d=ImageDraw.Draw(sheet)
    d.text((30,21),title,fill='#344b35',font=font)
    d.text((30,62),'参考照片',fill='#687b61',font=small)
    d.text((850,62),'Three.js 实际运行 · 眼高 1.65 m',fill='#687b61',font=small)
    for path,x in [(root/'references'/photo,30),(root/'evidence'/f'{key}-scene.png',850)]:
        im=ImageOps.contain(Image.open(path).convert('RGB'),(760,570),Image.Resampling.LANCZOS)
        sheet.paste(im,(x,100+(570-im.height)//2))
    d.text((30,691),credit,fill='#687b61',font=small)
    d.text((30,724),notes,fill='#56694e',font=small)
    d.text((30,754),'仅视觉比较：照片未标定，机位与透视不严格一致；不能据此认定 1:1 复原。',fill='#8a826d',font=small)
    sheet.save(root/'evidence'/f'comparison-{key}.jpg',quality=93)

report=json.loads((root/'evidence/test-results.json').read_text(encoding='utf-8'))
rows='\n'.join(f"| {p['label']} | {p['observedRafFps']} | {p['p95FrameMs']} ms | {p['drawCalls']} | {p['triangles']:,} |" for p in report['performance'])
validation=f"""# 实际运行与性能检查

本次采样：{report['dateLocal']}；UTC 记录 `{report['timestampUTC']}`。结果原件：[test-results.json](../evidence/test-results.json)。

## 环境

- {report['device']['os']}，{report['device']['cpu']}，内存 {report['device']['ramGB']} GB。
- GPU：{report['scene']['gpu']}。
- Headless Chromium {report['browser']}；桌面 viewport 1440 × 960，DPR=1。
- 本地 HTTP 服务；首次 ready 观测 {report['readyMs']} ms，受缓存、系统状态影响，非冷启动保证。
- 数据 / 单位 / 主巷连通 / 坐标回算 / 许可检查：`npm run check` 9 组通过。
- 浏览器检查：{len(report['checks'])} 项；失败 {len(report['failures'])}，正常运行脚本 / 控制台错误 {len(report['errors'])}，资源失败 {len(report['failedRequests'])}。

## 帧间隔观测

每项采样约 3 秒，统计 requestAnimationFrame 间隔。未测 GPU timer、热稳定长时帧率或极限容量。观测约 60 FPS 受到 60 Hz 刷新 / RAF 节流，不表示设备最大帧率。

| 模式 | 观测 RAF FPS | p95 帧间隔 | draw calls | 三角形 |
| --- | ---: | ---: | ---: | ---: |
{rows}

三个画质档在此次 DPR=1 的同一桌面采样中主要体现阴影分辨率与瓦片距离差异，不能推断真实手机性能。

## 功能与错误回退

桌面实际加载本地模块、地图、参考资产；鸟瞰 / 步行、1.65 m 眼高、W 键移动、真实墙体连续碰撞、地名开关、精度图层、画质、小地图定位、资料面板、PNG 导出已验证。

手机仅做 390 × 844 触屏模拟：默认节能、触摸前进、控件可见和横向溢出检查通过。没有使用真实手机，也没有保证所有移动 GPU 都支持当前容量。

主动阻断 `data/site.json` 后，页面显示具体资源名和恢复入口；主动阻断白墙 PBR 颜色图后，场景继续运行且提示材质回退。这些人为故障页面与正常运行的错误统计分开。

## 地理和视觉验收边界

软件检查不证明实地精度。OSM 折线和原始轮廓有数据支持；所有街宽、绝大多数高度、屋顶结构、门窗和树冠尺寸都没有测量确认。样板中的建筑身份对应也有待核准。官方保护区完整边界和完整建筑序列未取得。

截图显示实际模型的视觉局限：立面结构、材质、自然老化与人流细节仍明显少于实景，缺资料区域是简单体块。没有达到全区 1:1 或实景建筑摄影级验收。
"""
(root/'docs/VALIDATION.md').write_text(validation,encoding='utf-8')
performanceRows=''.join(f"<tr><td>{p['label']}</td><td>{p['observedRafFps']}</td><td>{p['p95FrameMs']} ms</td><td>{p['drawCalls']}</td></tr>" for p in report['performance'])
html='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>三坊七巷 · 交付证据</title><style>body{margin:0;background:#f1f2e9;color:#3d503a;font:14px/1.9 "Microsoft YaHei",sans-serif}main{max-width:1150px;margin:50px auto;padding:0 25px}h1,h2{font-family:SimSun,serif;font-weight:500}h1{font-size:32px}h2{margin-top:46px;font-size:25px}p{max-width:850px;color:#738169}a{color:#516f4b}img{width:100%;display:block;border-radius:8px}figure{margin:22px 0}figcaption{font-size:12px;color:#7b866f;margin-top:8px}.warning{background:#e5eadc;padding:18px 22px;border-radius:8px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:12px;border-bottom:1px solid #d6dccb}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.grid img{height:auto}@media(max-width:650px){main{margin:25px auto}.grid{grid-template-columns:1fr}h1{font-size:27px}}</style></head><body><main><a href="../index.html">← 打开三维场景</a><h1>三坊七巷 · 看得见的依据</h1><p class="warning">交付范围：680 个 OSM 轮廓、79 条道路折线、约 150 米 / 19 个轮廓的照片类型近似样板。当前未达到全区 1:1 或摄影级复原；地图高度、道路宽度、建筑立面对应和细节仍有明确估算。</p><h2>全区鸟瞰</h2><figure><img src="../evidence/01-overview.png" alt="实际运行的全区鸟瞰"><figcaption>实际网页截图；可见地图漏绘空白。轮廓来自地图，屋顶与高度主要估算。</figcaption></figure><h2>三处人眼视角与照片对照</h2><p>以下模型图来自 WebGL 画面导出，眼高均为 1.65 米。没有使用生成式图像美化模型。照片未做相机标定，不能作为测量证明。</p>'''
for key,title,photo,credit,notes in pairs:
    html+=f'<figure><img src="../evidence/comparison-{key}.jpg" alt="{title}参考与模型并列"><figcaption>{title}。{notes} 参考照片：{credit}，<a href="https://creativecommons.org/licenses/by-sa/4.0/">许可</a>；原页和变更见 <a href="../SOURCES.md">来源清单</a>。</figcaption></figure>'
html+=f'''<h2>布局与交互检查</h2><div class="grid"><figure><img src="layout-map.png" alt="OSM 建筑轮廓米制布局检查图"><figcaption>数据预处理生成的布局图；绿色为样板，北朝上。</figcaption></figure><figure><img src="../evidence/06-mobile.png" alt="390×844 触屏模拟截图"><figcaption>触屏模拟，非真实手机性能测试。</figcaption></figure></div><h2>实际运行结果</h2><p>Chromium {report['browser']}；GPU {report['scene']['gpu']}。1440×960 / DPR 1，每项约 3 秒 RAF 帧间隔采样。约 60 FPS 受刷新节流影响，不代表极限性能。</p><table><tr><th>场景</th><th>RAF FPS</th><th>p95</th><th>draw calls</th></tr>{performanceRows}</table><p>{len(report['checks'])} 项浏览器检查，{len(report['failures'])} 失败；正常运行无脚本错误。<a href="../evidence/test-results.json">原始结果 JSON</a> · <a href="VALIDATION.md">检查范围与限制</a></p><h2>范围与缺失</h2><p>主要街巷位置和共享交点来自 WGS84 OSM。高度、宽窄变化、屋顶结构、门窗及院落缺少测绘资料；叶氏民居立面到具体轮廓的对应未确认。全区已建立体块覆盖，但仅样板含近似细节；未将空白补成假建筑。</p><p><a href="../README.md">完整工程说明</a> · <a href="../SOURCES.md">数据与素材许可</a> · <a href="../data/sources.json">照片原页与日期</a> · <a href="../textures/manifest.json">PBR 材质清单</a></p></main></body></html>'''
(root/'docs/evidence.html').write_text(html,encoding='utf-8')
print('3 comparison plates, evidence.html and VALIDATION.md created')
