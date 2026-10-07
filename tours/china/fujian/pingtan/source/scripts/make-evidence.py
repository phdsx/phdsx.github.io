from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
B=Path(__file__).resolve().parents[1]; d=json.loads((B/'public/data/geography.json').read_text(encoding='utf8')); bb=d['metadata']['mainBBox'];bounds=d['metadata']['bounds'];image=Image.open(B/'public/data/satellite-2016.webp').convert('RGB')
px=lambda x:(x-bounds['x0'])/bounds['width']*image.width
pz=lambda z:(z-bounds['z0'])/bounds['depth']*image.height
rect=(round(px(bb[0])),round(pz(bb[1])),round(px(bb[2])),round(pz(bb[3])))
ref=image.crop(rect);scene=Image.open(B/'evidence/scene-map.png').convert('RGB');W=700;H=round(W*(bb[3]-bb[1])/(bb[2]-bb[0]));ref=ref.resize((W,H));scene=scene.resize((W,H))
fontPath='C:/Windows/Fonts/msyh.ttc';font=ImageFont.truetype(fontPath,20);small=ImageFont.truetype(fontPath,14);tiny=ImageFont.truetype(fontPath,12)
canvas=Image.new('RGB',(W*2+70,H+180),'#e8ece0');canvas.paste(ref,(20,100));canvas.paste(scene,(W+50,100));draw=ImageDraw.Draw(canvas)
draw.text((20,18),'平潭 · 米制地理对齐核验',font=font,fill='#29433c');draw.text((20,58),'参考：2016 Sentinel-2 历史合成影像',font=small,fill='#43574a');draw.text((W+50,58),'实际场景：同范围正射俯视（非宣传渲染）',font=small,fill='#43574a')
draw.text((20,H+118),'红线：2026-10-07 下载的 OSM 主岛岸线。旧影像与新岸线的填海差异原样保留。',font=small,fill='#495a4a');draw.text((20,H+144),'EOxCloudless by EOX / modified Copernicus Sentinel data 2016 / CC BY 4.0；© OpenStreetMap contributors / ODbL',font=tiny,fill='#65745c');draw.text((20,H+164),'＊镜沙洞口、仙人井中心仅为区域约位；图上对齐不代表地貌测量精度。',font=tiny,fill='#65745c')
def point(x,z):return ((x-bb[0])/(bb[2]-bb[0])*W,(z-bb[1])/(bb[3]-bb[1])*H)
landmarks=json.loads((B/'public/data/landmarks.json').read_text(encoding='utf8'))['places']
markers=[('北港',4324,-6328),('长江澳',-820,-11705),('龙王头',2600,2100),('君山',3220,-7860)]+[(p['name']+('＊' if p['positionClass']=='approximate' else ''),p['x'],p['z']) for p in landmarks if p['id'] in ['jingsha','xianren','shipaiyang','xiangbi','houyan']]
for offset in [20,W+50]:
 line=[(offset+point(x,z)[0],100+point(x,z)[1]) for x,z in d['coastlines'][d['mainIsland']]];draw.line(line,fill='#cb6045',width=1)
 for name,x,z in markers:
  u,v=point(x,z);draw.ellipse((offset+u-4,100+v-4,offset+u+4,100+v+4),fill='#f5e8b7',outline='#273c2d');textX=u+7 if u<W-100 else u-70;draw.text((offset+textX,100+v-10),name,font=tiny,fill='#f4eed2',stroke_width=2,stroke_fill='#32443c')
canvas.save(B/'evidence/map-alignment.png')
# Copyrighted photo kept in local research comparison only; ignored by Git and excluded from runtime/package.
photo=Image.open(B/'research/beigang-2.jpg').convert('RGB');shot=Image.open(B/'evidence/stone-close.png').convert('RGB');compare=Image.new('RGB',(1400,650),'#e9ece2');cd=ImageDraw.Draw(compare);cd.text((20,16),'北港官方村落照片 ↔ 类型化石厝样板',font=font,fill='#29443c');cd.text((20,52),'核对青灰石墙、低坡瓦顶、压瓦石；并非对应民宿立面复刻。',font=small,fill='#485747')
photo.thumbnail((660,440));shot.thumbnail((660,440));compare.paste(photo,(20,100));compare.paste(shot,(710,100));cd.text((20,555),'左：福建省文旅厅/住建厅 2019 北港资料。仅本地研究，不进入公开静态资源。',font=small,fill='#4e5f4d');cd.text((20,586),'右：实际浏览器截图。高度、窗门、屋顶及院落为近似；大多数村屋仍缺三维资料。',font=small,fill='#4e5f4d');compare.save(B/'evidence/photo-comparison-local.png')
print('Geographic alignment and local-only photo comparison prepared')
