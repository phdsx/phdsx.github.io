from pathlib import Path
import json,re
from unpack_hcr import wire, ROOT, OUT

def defold_hash(data):
    # engine/dlib/src/dlib/hash.cpp dmHashBufferNoReverse64, endian neutral Murmur2A.
    m=0xc6a4a7935bd1e995; mask=0xffffffffffffffff; h=0; p=0
    def mmix(h,k):
        k=(k*m)&mask; k^=k>>47; k=(k*m)&mask
        return ((h*m)&mask)^k
    while len(data)-p>=8:
        h=mmix(h,int.from_bytes(data[p:p+8],'little'));p+=8
    h=mmix(h,int.from_bytes(data[p:],'little'));h=mmix(h,len(data))
    h^=h>>47;h=(h*m)&mask;h^=h>>47
    return h

v=json.loads((ROOT/'inventory.json').read_text())
manifest={r['3']:r['hash']for r in v['manifest']if '3'in r}
named=ROOT/'investigation'/'source';named.mkdir(parents=True,exist_ok=True)
paths=set(); sources=[]
pattern=rb'/[a-zA-Z0-9_./\-]+\.(?:scriptc|luac|guic|gui_scriptc|fontc|atlas|texturesetc|texturec|collectionc|goc|materialc|renderc|spritec|soundc|oggc|json|tsv|input_bindingc|fontmapc|glyph_bankc|render_scriptc)'
for e in v['entries']:
    b=(OUT/e['hash']).read_bytes()
    paths.update(x.decode('ascii')for x in re.findall(pattern,b))
    try:
        top=wire(b)
        nested=wire(next(val for f,k,val in top if f==1 and k==2))
        source=next(val for f,k,val in nested if f==1 and k==2)
        filename=next(val for f,k,val in nested if f==2 and k==2).decode('utf-8')
        if b'function'not in source and b'local'not in source: continue
        filename=filename.lstrip('@/')
        if '..' in Path(filename).parts:raise ValueError('invalid path')
        p=named/filename;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(source)
        sources.append({'hash':e['hash'],'source_path':filename,'source_bytes':len(source),'fields':[(f,k,len(val)if isinstance(val,bytes)else val)for f,k,val in nested]})
        compiled='/'+filename[:-4]+('.gui_scriptc'if filename.endswith('.gui_script')else'.luac') if filename.endswith('.lua')else'/'+filename+'c'
        paths.add(compiled)
    except (ValueError,StopIteration,UnicodeDecodeError): pass
mapping=[]
for path in sorted(paths):
    h=defold_hash(path.encode());digest=manifest.get(h)
    if digest:
        mapping.append({'path':path,'url_hash':h,'hash':digest,'in_archive':(OUT/digest).exists()})
        if (OUT/digest).exists():
            target=ROOT/'investigation'/'resources'/path.lstrip('/');target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((OUT/digest).read_bytes())
(ROOT/'investigation'/'source-index.json').write_text(json.dumps(sources,indent=2))
(ROOT/'investigation'/'resource-map.json').write_text(json.dumps(mapping,indent=2))
(ROOT/'investigation'/'resource-paths.txt').write_text('\n'.join(sorted(paths)))
print(json.dumps({'lua_sources':len(sources),'named_resources':len(mapping),'paths':len(paths),'sources_head':sources[:4]},indent=2))
