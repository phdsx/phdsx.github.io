import pathlib,gzip,shutil,json,re,sys,struct,urllib.parse
workspace=pathlib.Path('.local-tools/hole-original');sys.path.insert(0,str(workspace/'python-deps'))
import UnityPy
root=pathlib.Path('games/arcade/hole-city/runtime');src=workspace/'captured'
root.mkdir(parents=True,exist_ok=True)
for name,out in [('WebGL Build.data.br','game.data.gz'),('WebGL Build.wasm.br','game.wasm.gz')]:
 data=(src/'Build'/name).read_bytes();(root/out).write_bytes(gzip.compress(data,compresslevel=9,mtime=0));print(out,len(data),(root/out).stat().st_size)
shutil.copyfile(src/'Build/WebGL Build.loader.js',root/'unity.loader.js')
framework=(src/'Build/WebGL Build.framework.js.br').read_text(encoding='utf-8')
framework,changes=re.subn(r'function _JS_PokiSDK_preInit\(\)\{.*?\}function _JS_PokiSDK_redirect', 'function _JS_PokiSDK_preInit(){}function _JS_PokiSDK_redirect',framework,count=1)
assert changes==1,'Unexpected Unity framework version'
(root/'unity.framework.js').write_text(framework,encoding='utf-8')
shutil.copytree(src/'StreamingAssets',root/'StreamingAssets',dirs_exist_ok=True)
manifest=json.loads((src/'manifest.json').read_text(encoding='utf-8'))
for item in manifest.get('records',[]):
 if 'url' in item:
  parsed=urllib.parse.urlsplit(item['url']);item['url']=urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path,'',''))
(root/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
data=(src/'Build/WebGL Build.data.br').read_bytes();assert data.startswith(b'UnityWebData1.0\0')
header=struct.unpack_from('<I',data,16)[0];pos=20;entries=[];dest=(workspace/'unpacked-data').resolve()
while pos<header:
 offset,size,length=struct.unpack_from('<III',data,pos);pos+=12;name=data[pos:pos+length].decode('utf-8');pos+=length
 file=(dest/name).resolve();file.relative_to(dest);file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(data[offset:offset+size]);entries.append({'name':name,'offset':offset,'size':size})
(workspace/'data-entries.json').write_text(json.dumps(entries,indent=2),encoding='utf-8')
bundles=src/'StreamingAssets/aa/WebGL';scripts=UnityPy.load(str(next(bundles.glob('*monoscripts*'))));classes={o.path_id:o.read().m_ClassName for o in scripts.objects if o.type.name=='MonoScript'}
(workspace/'script-classes.json').write_text(json.dumps(classes),encoding='utf-8')
for prefix in ['preload_scenes','game_scenes']:
 path=next(bundles.glob(prefix+'*'));env=UnityPy.load(str(path));found=[]
 for o in env.objects:
  if o.type.name!='MonoBehaviour':continue
  try:t=o.read_typetree();cls=classes.get(t.get('m_Script',{}).get('m_PathID'),'')
  except Exception:continue
  if cls=='LeanLocalization':found.append({'id':o.path_id,'class':cls,'data':t})
 (workspace/(path.stem+'-localization.json')).write_text(json.dumps(found,ensure_ascii=False,indent=2),encoding='utf-8')
