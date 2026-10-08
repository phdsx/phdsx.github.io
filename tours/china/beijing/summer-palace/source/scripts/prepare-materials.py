from PIL import Image, ImageEnhance
from pathlib import Path
import json
B=Path(__file__).resolve().parents[1]; out=B/'public/textures'; out.mkdir(exist_ok=True)
manifest=[]
for asset,alias,period in [('Bark007','bark',1.4),('PavingStones036','paving',2.0),('Ground037','forest',2.1),('Rock039','rock',2.0)]:
 for kind in ['Color','NormalGL','Roughness']:
  p=B/'research/materials'/asset/f'{asset}_1K-JPG_{kind}.jpg'
  if not p.exists(): continue
  im=Image.open(p).convert('RGB').resize((768,768),Image.Resampling.LANCZOS)
  if kind=='Color' and alias=='paving': im=ImageEnhance.Color(im).enhance(.2); im=ImageEnhance.Brightness(im).enhance(1.65)
  if kind=='Color' and alias=='rock': im=ImageEnhance.Color(im).enhance(.2)
  if kind=='Color' and alias=='forest': im=ImageEnhance.Color(im).enhance(.7)
  im.save(out/f'{alias}-{kind.lower()}.webp','WEBP',quality=86 if kind=='Color' else 93)
 manifest.append({'id':asset,'alias':alias,'source':f'https://ambientcg.com/view?id={asset}','license':'CC0 1.0','download':f'https://ambientcg.com/get?file={asset}_1K-JPG.zip','textureSize':[768,768],'periodMetres':period,'changes':'resampled; paving desaturated/brightened; rock desaturated; forest saturation reduced; nominal scale estimated'})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print([(p.name,p.stat().st_size) for p in out.glob('*.webp')])
