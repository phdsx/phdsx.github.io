from pathlib import Path
from PIL import Image
import math,json
p=Path(__file__).resolve().parents[1]
imgs={(x,1550):Image.open(p/f'research/context-{x}-1550.png').convert('RGB') for x in [3370,3371]}
R=6378137;lat0=39.99;lon0=116.273
d=json.loads((p/'public/data/dem.json').read_text())
nx=161;nz=111;step=80;x0=-6500;z0=-4800;hs=[]
for j in range(nz):
 for i in range(nx):
  lon=lon0+math.degrees((x0+i*step)/(R*math.cos(math.radians(lat0))))
  lat=lat0-math.degrees((z0+j*step)/R)
  x=(lon+180)/360*4096;y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*4096
  im=imgs.get((int(x),int(y)))
  if im:
   r,g,b=im.getpixel((int(x%1*256),int(y%1*256)))
   hs.append(round(r*256+g+b/256-32768-d['lakeRawElevation'],1))
  else:hs.append(0)
(p/'public/data/context-dem.json').write_text(json.dumps({'nx':nx,'nz':nz,'step':step,'x0':x0,'z0':z0,'heights':hs,'source':'Mapzen Terrarium z12; geographic context only. Unavailable cells flattened. Not park geometry.'},separators=(',',':')))
