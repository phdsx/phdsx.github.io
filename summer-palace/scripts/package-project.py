from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json
root=Path(__file__).resolve().parents[1]
result=json.loads((root/'evidence/browser-results.json').read_text(encoding='utf8'))
assert not result['failures'] and not result['errors'],'Do not package a failing build.'
out=root/'delivery';out.mkdir(exist_ok=True)
files=[]
for folder in ['src','public','docs','scripts','evidence']:
 files.extend(f for f in (root/folder).rglob('*') if f.is_file() and '__pycache__' not in f.parts)
for name in ['index.html','package.json','package-lock.json','vite.config.js','README.md','.gitignore']:
 files.append(root/name)
files.extend(f for f in (root/'research').iterdir() if f.is_file() and f.suffix in ['.xml','.png','.txt','.json'])
with ZipFile(out/'summer-palace-source.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(set(files)):z.write(f,'summer-palace/'+f.relative_to(root).as_posix())
with ZipFile(out/'summer-palace-static.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted((root/'dist').rglob('*')):
  if f.is_file():z.write(f,f.relative_to(root/'dist').as_posix())
 z.writestr('DEPLOY.txt','Serve this directory with HTTP/HTTPS. Upload all assets/, data/, textures/, index.html and favicon.svg to a static host. Relative base supports a subdirectory. Do not open via file://. Source, references and accuracy notes are in the source project README.\n')
print([(f.name,f.stat().st_size) for f in out.glob('*.zip')])
