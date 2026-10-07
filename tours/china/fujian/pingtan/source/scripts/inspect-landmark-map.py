from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
B=Path(__file__).resolve().parents[1]
d=json.loads((B/'public/data/geography.json').read_text(encoding='utf8'));b=d['metadata']['bounds']
im=Image.open(B/'public/data/satellite-2016.webp').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',14)
for name,box,points in [('north',(1700,-10600,3700,-9100),[(2688,-9924,'镜沙岸线'),(2490,-9950,'沙滩')]),('well',(8500,-3300,9800,-1800),[(9270,-2617,'OSM仙人洞'),(8950,-2224,'仙人谷'),(8563,-2605,'游客中心')]),('southwest',(-10000,8500,-3000,14500),[])]:
 def px(x):return (x-b['x0'])/b['width']*im.width
 def pz(z):return (z-b['z0'])/b['depth']*im.height
 crop=im.crop((round(px(box[0])),round(pz(box[1])),round(px(box[2])),round(pz(box[3])))).resize((1000,750))
 draw=ImageDraw.Draw(crop)
 def uv(x,z):return ((x-box[0])/(box[2]-box[0])*1000,(z-box[1])/(box[3]-box[1])*750)
 for ring in d['coastlines']:
  draw.line([uv(*p) for p in ring],fill='red',width=1)
 for x,z,label in points:
  u,v=uv(x,z);draw.ellipse((u-4,v-4,u+4,v+4),fill='yellow');draw.text((u+7,v),label,font=font,fill='yellow',stroke_width=1,stroke_fill='black')
 for x in range(int(box[0]),int(box[2]),500):draw.text(uv(x,box[1]+30),str(x),font=font,fill='white')
 for z in range(int(box[1]),int(box[3]),500):draw.text(uv(box[0]+30,z),str(z),font=font,fill='white')
 crop.save(B/'research'/f'{name}-map-inspection.png')
