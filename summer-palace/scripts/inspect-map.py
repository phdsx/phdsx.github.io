import xml.etree.ElementTree as E, math
from collections import Counter
r=E.parse('research/osm.xml').getroot()
def tags(e): return {t.get('k'):t.get('v') for t in e.findall('tag')}
for typ in ['way','relation','node']:
 print('\n'+typ)
 for e in r.findall(typ):
  t=tags(e); name=t.get('name:zh',t.get('name',''))
  if name and ('building' in t or t.get('natural')=='water' or t.get('tourism') or t.get('leisure') or typ=='relation' or any(s in name for s in ['桥','廊','殿','阁','堂','岛','湖','堤','园','街','门'])):
   print(e.get('id'), t)
print('tiles',[(z,int((116.27+180)/360*2**z),int((1-math.asinh(math.tan(math.radians(39.99)))/math.pi)/2*2**z)) for z in [12,13,14]])
