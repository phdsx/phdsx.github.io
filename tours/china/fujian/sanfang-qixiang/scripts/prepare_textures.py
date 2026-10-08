"""Small relief details cropped from the licensed 2023 north-gate photo.
These are perspective/lighting-affected image details, not measured PBR scans.
Derivative crops retain JULIANISME's CC BY-SA 4.0 licence.
"""
from pathlib import Path
from PIL import Image, ImageEnhance
import zipfile, io, json, hashlib
root=Path(__file__).resolve().parents[1]
(root/'textures').mkdir(exist_ok=True)
photo=Image.open(root/'references/north-gate-2023.jpg')
# The 1280-pixel Wikimedia thumbnail has been inspected in the project.
photo.crop((420,370,809,409)).resize((1024,128)).save(root/'textures/gate-relief.jpg',quality=91)
photo.crop((366,319,400,648)).resize((64,512)).save(root/'textures/gate-inscription-left.jpg',quality=91)
photo.crop((820,303,852,655)).resize((64,512)).save(root/'textures/gate-inscription-right.jpg',quality=91)
print('3 CC BY-SA 4.0 photo-detail crops created')
manifest=[]
for alias,asset in [('wood','Wood066'),('plaster','Plaster004')]:
    archive=root/'textures'/f'{alias}-source.zip'
    with zipfile.ZipFile(archive) as package:
        for kind,suffix in [('color','Color'),('normalgl','NormalGL'),('roughness','Roughness')]:
            name=next(n for n in package.namelist() if n.endswith('_'+suffix+'.jpg'))
            image=Image.open(io.BytesIO(package.read(name))).convert('RGB').resize((768,768),Image.Resampling.LANCZOS)
            if kind=='color' and alias=='wood':
                image=ImageEnhance.Color(image).enhance(.7)
                image=ImageEnhance.Brightness(image).enhance(.8)
            image.save(root/'textures'/f'{alias}-{kind}.webp',quality=92,method=6)
    manifest.append({'id':asset,'source':f'https://ambientcg.com/view?id={asset}',
                     'license':'CC0 1.0','licenseUrl':'https://docs.ambientcg.com/license/',
                     'download':f'https://ambientcg.com/get?file={asset}_1K-JPG.zip',
                     'retrieved':'2026-10-07','sourceArchiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
                     'resolution':[768,768],'periodMetres':.4 if alias=='wood' else 1,
                     'periodEvidence':'published nominal 40 cm' if alias=='wood' else 'estimated',
                     'changes':'resized to 768 WebP; wood colour saturation 0.7 and brightness 0.8',
                     'coverage':'generic material, NOT a site scan'})
manifest.append({'id':'Bark007','source':'https://ambientcg.com/view?id=Bark007','license':'CC0 1.0',
                 'licenseUrl':'https://docs.ambientcg.com/license/','retrieved':'2026-10-07',
                 'changes':'reuse of locally attributed 768 WebP maps in tours/china/beijing/beijing-zoo/source/public/textures; unmodified',
                 'resolution':[768,768],'periodMetres':1.4,'periodEvidence':'estimate','coverage':'generic bark, NOT a site scan'})
(root/'textures/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('6 CC0 PBR maps prepared; source archive hashes recorded')
