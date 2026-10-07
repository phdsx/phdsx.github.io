import xml.etree.ElementTree as E, collections, re
from pathlib import Path
B=Path(__file__).resolve().parents[1]
nodes={}; ways={}; rels={}
for f in (B/'research').glob('*.osm'):
 r=E.parse(f).getroot()
 for n in r.findall('node'):nodes[n.get('id')]=n
 for w in r.findall('way'):ways[w.get('id')]=w
 for v in r.findall('relation'):rels[v.get('id')]=v
print('TOTAL',len(nodes),len(ways),len(rels))
tags=lambda e:{t.get('k'):t.get('v') for t in e.findall('tag')}
print('NATURAL',collections.Counter(tags(w).get('natural') for w in ways.values()))
print('BUILDINGS',sum('building' in tags(w) for w in ways.values()))
for n in list(nodes.values())+list(ways.values()):
 t=tags(n)
 if any(a in t.get('name','') for a in ['北港','长江澳','龙王头','龙凤头','君山','三十六脚']):
  print(n.tag,n.get('id'),n.get('lon'),n.get('lat'),t)
 if t.get('generator:source')=='wind':print('WIND',n.get('id'),n.get('lon'),n.get('lat'))
s=(B/'research/beigang-official.html').read_text(encoding='utf8')
print('PHOTOS',re.findall(r'<img[^>]+src=["\x27]([^"\x27]+)',s)[-12:])
