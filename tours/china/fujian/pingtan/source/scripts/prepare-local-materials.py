from pathlib import Path
from PIL import Image,ImageEnhance
import json
B=Path(__file__).resolve().parents[1]; p=B.parent/'summer-palace/research/materials/PavingStones036/PavingStones036_1K-JPG_Color.jpg'
im=Image.open(p).convert('RGB').resize((768,768),Image.Resampling.LANCZOS)
im=ImageEnhance.Color(im).enhance(.22)
im.save(B/'public/textures/wall-color.webp',quality=92)
m=json.loads((B/'public/textures/manifest.json').read_text());m.append({'id':'PavingStones036','alias':'wall','source':'https://ambientcg.com/view?id=PavingStones036','license':'CC0 1.0','periodMetres':4,'changes':'original unbrightened color, desaturated to 22%, 768px. Granite block texture used for typological wall sample, not a Pingtan facade photograph.'})
(B/'public/textures/manifest.json').write_text(json.dumps(m,indent=2),encoding='utf8')
