"""Reproducible OSM footprint extraction. OSM is a cartographic estimate, not a survey."""
import xml.etree.ElementTree as ET
import json, math
from pathlib import Path
base = Path(__file__).resolve().parents[1]
root = ET.parse(base/'osm-map.xml').getroot()
nodes = {n.attrib['id']:(float(n.attrib['lon']),float(n.attrib['lat'])) for n in root.findall('node')}
# Wall junctions from OSM relation 9511883, excluding southward projecting Wumen wings.
sw=(116.3866043,39.9122127); se=(116.3953903,39.912531); nw=(116.386202,39.920878)
ex,ey=se[0]-sw[0],se[1]-sw[1]; nx,ny=nw[0]-sw[0],nw[1]-sw[1]
det=ex*ny-ey*nx
def convert(p):
    dx,dy=p[0]-sw[0],p[1]-sw[1]
    u=(dx*ny-dy*nx)/det; v=(ex*dy-ey*dx)/det
    return [round(u*753-376.5,2),round(480.5-v*961,2)]
def tags(el): return {t.attrib['k']:t.attrib['v'] for t in el.findall('tag')}
ways={w.attrib['id']:w for w in root.findall('way')}
# Recover relation-owned building outlines; retain inner rings for courtyard walls.
inner_rings={}
for rel in root.findall('relation'):
    rt=tags(rel)
    if 'building' not in rt: continue
    outer=[m.attrib['ref'] for m in rel.findall('member') if m.attrib['type']=='way' and m.attrib.get('role')=='outer']
    inner=[m.attrib['ref'] for m in rel.findall('member') if m.attrib['type']=='way' and m.attrib.get('role')=='inner']
    if len(outer)==1 and outer[0] in ways:
        w=ways[outer[0]]
        for k,v in rt.items():
            if k not in tags(w): ET.SubElement(w,'tag',{'k':k,'v':v})
        inner_rings[outer[0]]=inner
def pts(w): return [convert(nodes[n.attrib['ref']]) for n in w.findall('nd') if n.attrib['ref'] in nodes]
features={'buildings':[],'walls':[],'water':[],'paths':[],'trees':[]}
for wid,w in ways.items():
    t=tags(w); p=pts(w)
    if len(p)<2: continue
    xs=[a[0] for a in p]; zs=[a[1] for a in p]
    x=(min(xs)+max(xs))/2; z=(min(zs)+max(zs))/2
    inside=abs(x)<371 and abs(z)<476
    common={'id':'osm-'+wid,'osmId':wid,'name':t.get('name:zh',t.get('name','')),'points':p}
    if 'building' in t and (inside or common['name'] in ['午门','神武门','东华门','西华门']):
        features['buildings'].append({**common,'holes':[pts(ways[i]) for i in inner_rings.get(wid,[]) if i in ways],'x':round(x,2),'z':round(z,2),'w':round(max(xs)-min(xs),2),'d':round(max(zs)-min(zs),2),'tags':t,'confidence':'cartographic-estimate','source':'https://www.openstreetmap.org/way/'+wid})
    if t.get('barrier') in ['wall','city_wall'] and inside:
        features['walls'].append({**common,'outer':t.get('barrier')=='city_wall'})
    if (t.get('natural')=='water' or t.get('waterway') in ['drain','canal','river']) and abs(x)<460 and abs(z)<570 and t.get('tunnel') not in ['yes','culvert']:
        features['water'].append({**common,'polygon':t.get('natural')=='water','width':float(t.get('width','6').replace(' m','')) if t.get('width','6').replace(' m','').replace('.','',1).isdigit() else 6})
    if t.get('highway') in ['footway','pedestrian','path','steps','service'] and inside:
        features['paths'].append({**common,'bridge':t.get('bridge')=='yes','steps':t.get('highway')=='steps','width':4})
for n in root.findall('node'):
    if tags(n).get('natural')=='tree':
        p=convert(nodes[n.attrib['id']])
        if abs(p[0])<365 and abs(p[1])<470: features['trees'].append(p)
# Some OSM names are nodes/relations instead of tags on the footprint.
for n in root.findall('node'):
    t=tags(n); name=t.get('name:zh',t.get('name',''))
    if name not in ['中和殿','东北角楼','西北角楼','东南角楼','西南角楼']: continue
    x,z=convert(nodes[n.attrib['id']])
    near=min(features['buildings'],key=lambda b:(b['x']-x)**2+(b['z']-z)**2)
    if math.hypot(near['x']-x,near['z']-z)<20: near['name']=name
features['metadata']={'date':'2026-09-28','datum':'OSM WGS84; locally affine normalized to official wall dimensions','worldUnit':'metre','width':753,'length':961,'origin':'centre of idealized wall rectangle','x':'east along southern wall','z':'south along western wall','northGridOffsetDegrees':-2.04,'anchors':{'SW':sw,'SE':se,'NW':nw},'warning':'Map footprints include eaves/platforms inconsistently. No survey precision claimed. Names and tags require institutional cross-check. OSM height=4 on city wall rejected in favor of DPM height=10.'}
(base/'public/data').mkdir(parents=True,exist_ok=True)
(base/'public/data/layout.json').write_text(json.dumps(features,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print({k:len(v) for k,v in features.items() if isinstance(v,list)})
print([(b['name'],b['x'],b['z'],b['w'],b['d']) for b in features['buildings'] if b['name'] in ['午门','太和门','太和殿','中和殿','保和殿','乾清门','乾清宫','交泰殿','坤宁宫','钦安殿','神武门','角楼','文华殿','武英殿','养心殿','慈宁宫','皇极殿']])
