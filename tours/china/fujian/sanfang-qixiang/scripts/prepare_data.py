"""Build reproducible local metre data from the unmodified OSM API snapshot.
No GCJ-02/BD-09 coordinates or invented footprints are used.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import json, math, re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = [119.292, 26.086]
R = 6378137.0
E2 = 6.6943799901413165e-3
lon0,lat0=map(math.radians,ORIGIN)
def ecef(lon,lat):
    lon,lat=math.radians(lon),math.radians(lat)
    n=R/math.sqrt(1-E2*math.sin(lat)**2)
    return [n*math.cos(lat)*math.cos(lon),n*math.cos(lat)*math.sin(lon),n*(1-E2)*math.sin(lat)]
ecef0=ecef(*ORIGIN)
east=[-math.sin(lon0),math.cos(lon0),0]
north=[-math.sin(lat0)*math.cos(lon0),-math.sin(lat0)*math.sin(lon0),math.cos(lat0)]
def local(lon, lat):
    delta=[a-b for a,b in zip(ecef(lon,lat),ecef0)]
    return [round(sum(a*b for a,b in zip(delta,east)),3),round(-sum(a*b for a,b in zip(delta,north)),3)]
def tags(element):
    return {t.attrib['k']: t.attrib['v'] for t in element.findall('tag')}
def area(p):
    return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:]+p[:1]))/2)
def dist(p,a,b):
    dx,dz=b[0]-a[0],b[1]-a[1]
    t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz or 1)))
    return math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t)
def simplify(p):
    out=[]
    for i,b in enumerate(p):
        if dist(b,p[i-1],p[(i+1)%len(p)]) > .025: out.append(b)
    return out if len(out)>2 else p

tree=ET.parse(ROOT/'data/osm-map.osm').getroot()
nodes={n.attrib['id']:n for n in tree.findall('node')}
widths={'南后街':12,'衣锦坊':5,'文儒坊':4.6,'郎官巷':4.2,'塔巷':4,
        '黄巷':4.8,'安民巷':4.5,'宫巷':5,'吉庇巷':10,'光禄坊':10,
        '通湖路':14,'八一七北路':18,'闽山巷':3,'洗银营巷':3,'大光里':2.8}
roads=[]; buildings=[]
for w in tree.findall('way'):
    t=tags(w); pts=[]; ll=[]
    for nd in w.findall('nd'):
        n=nodes.get(nd.attrib['ref'])
        if n is not None:
            lon,lat=float(n.attrib['lon']),float(n.attrib['lat'])
            pts.append(local(lon,lat));ll.append([lon,lat])
    if len(pts)<2: continue
    name=t.get('name','')
    if 'highway' in t:
        # Some north boundary carriageways lack a name in OSM. Explicitly label
        # the editorial assignment rather than silently altering OSM tags.
        assigned = not name and t['highway']=='primary' and min(p[1] for p in pts)<-290
        if assigned: name='杨桥东路（原杨桥巷）'
        if not name and t['highway'] not in ('pedestrian','footway','service'): continue
        if not any(-455<p[0]<355 and -330<p[1]<475 for p in pts): continue
        width=float(str(t.get('width',widths.get(name,18 if assigned else 3.2))).split(' ')[0])
        if assigned: width=9 # each mapped carriageway, not the entire road
        roads.append({'id':w.attrib['id'],'name':name or '未命名支路','type':t['highway'],
                      'points':pts,'coordinates':ll,'nodeIds':[nd.attrib['ref'] for nd in w.findall('nd')],
                      'width':width,'widthEvidence':'osm-tag' if t.get('width') else 'estimate',
                      'nameEvidence':'editorial-from-boundary' if assigned else 'osm-tag',
                      'updated':w.attrib.get('timestamp'),'version':w.attrib.get('version')})
    if t.get('building') and pts[0]==pts[-1]:
        p=simplify(pts[:-1]); a=area(p)
        c=[sum(x[0] for x in p)/len(p),sum(x[1] for x in p)/len(p)]
        if not (-460<c[0]<340 and -325<c[1]<460) or a<5: continue
        # No dimensions are varied randomly. Unmeasured buildings have an
        # explicitly uniform typological estimate and their actual polygons.
        h=float(t.get('height',0) or 0)
        levels=float(t.get('building:levels',0) or 0)
        evidence='osm-height' if h else 'osm-levels-derived' if levels else 'estimate'
        if not h: h=levels*3.2 if levels else 5.4
        buildings.append({'id':w.attrib['id'],'name':name,'footprint':p,'coordinates':ll,
                          'height':h,'heightEvidence':evidence,'roofEvidence':'estimate',
                          'area':round(a,2),'center':[round(v,3) for v in c],
                          'updated':w.attrib.get('timestamp'),'version':w.attrib.get('version'),
                          'tags':t})

nanhou=next(r for r in roads if r['name']=='南后街')
def closest_main(p):
    return min(dist(p,a,b) for a,b in zip(nanhou['points'],nanhou['points'][1:]))
for b in buildings:
    b['sample']= -24 < b['center'][1] < 126 and min(closest_main(p) for p in b['footprint'])<24 and b['area']<1400
    b['detailEvidence']='photo-typology-approximation' if b['sample'] else 'missing-facade'

sources=[]
filemap={'File:North Gate of Nanhou Jie, Sanfang Qixiang 20230825.jpg':'north-gate-2023.jpg',
         'File:Tree of Heart, Sanfang Qixiang 20230825.jpg':'heart-tree-2023.jpg',
         'File:20231020 Nanhou Jie.jpg':'nanhou-north-2023.jpg',
         'File:20231020 Fujian Sheng Feiwuzhi Wenhua Yichan Bolanyuan.jpg':'ye-residence-2023.jpg',
         'File:Fuzhou sanfangqixiang Aerial 2017.jpg':'aerial-2017.jpg'}
for filename in ('commons-metadata.json','nanhou-metadata.json'):
    meta=json.loads((ROOT/'references'/filename).read_text(encoding='utf-8-sig'))
    for p in meta['query']['pages'].values():
        if p['title'] not in filemap: continue
        info=p['imageinfo'][0]; m=info['extmetadata']
        def val(k): return re.sub('<[^>]+>','',str(m.get(k,{}).get('value','')))
        sources.append({'title':p['title'],'page':info['descriptionurl'],
                        'file':'references/'+filemap[p['title']],'author':val('Artist'),
                        'date':val('DateTimeOriginal'),'license':val('LicenseShortName'),
                        'licenseUrl':val('LicenseUrl'),'originalUrl':info['url'],
                        'latitude':val('GPSLatitude'),'longitude':val('GPSLongitude'),
                        'use':'historical-layout-only' if '2017' in p['title'] else '2023-photo-reference',
                        'changes':'1280 px thumbnail supplied by Wikimedia; no other edits'})
data={'schemaVersion':1,'snapshotRetrieved':'2026-10-07','source':'https://api.openstreetmap.org/api/0.6/map?bbox=119.286,26.081,119.2955,26.089',
      'license':'ODbL 1.0','crs':'WGS84 / EPSG:4326','origin':ORIGIN,
      'projection':'WGS84 ellipsoidal ECEF to local ENU; X east, Y up, Z south; horizontal coordinates at ellipsoid h=0; displayed ground is flat',
      'units':'metres','bounds':[-460,-330,350,465],'sampleBounds':[-24,126],
      'roads':roads,'buildings':buildings,
      'summary':{'roads':len(roads),'buildings':len(buildings),'sampleBuildings':sum(b['sample'] for b in buildings),
                 'osmHeights':sum(b['heightEvidence']=='osm-height' for b in buildings),
                 'osmLevels':sum(b['heightEvidence']=='osm-levels-derived' for b in buildings),
                 'nanhouLength':round(sum(math.dist(a,b) for a,b in zip(nanhou['points'],nanhou['points'][1:])),2)}}
(ROOT/'data/site.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(ROOT/'data/sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(data['summary'],ensure_ascii=False))

# Auditable map without any aerial raster: actual selected OSM polygons.
from PIL import Image,ImageDraw,ImageFont
im=Image.new('RGB',(1100,1100),'#eeeae1'); draw=ImageDraw.Draw(im)
scale=1.22
def screen(p): return ((p[0]+460)*scale+45,(p[1]+330)*scale+45)
for b in buildings:
    draw.polygon([screen(p) for p in b['footprint']],fill='#8e9587' if b['sample'] else '#c7c7bb',outline='#acafa3')
for r in roads:
    draw.line([screen(p) for p in r['points']],fill='#fdfbf5',width=max(2,round(r['width']*scale)))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
for r in roads:
    if r['name'] in widths and r['name'] not in ('通湖路','八一七北路'):
        p=r['points'][len(r['points'])//2];draw.text(screen(p),r['name'],fill='#394638',font=font)
draw.text((30,12),'OSM 独立轮廓 · 北朝上 · 绿色为约 150 m 样板范围',fill='#394638',font=font)
im.save(ROOT/'docs/layout-map.png')
