"""OSM WGS84 -> local tangent-plane metres. No GCJ02/BD09 overlays or scale fitting."""
import xml.etree.ElementTree as E, math, json
from pathlib import Path
from PIL import Image
B=Path(__file__).resolve().parents[1]
r=E.parse(B/'research/osm.xml').getroot()
LAT=39.99; LON=116.273; R=6378137
def tags(e): return {t.get('k'):t.get('v') for t in e.findall('tag')}
def xy(lon,lat): return [round(R*math.radians(lon-LON)*math.cos(math.radians(LAT)),3),round(-R*math.radians(lat-LAT),3)]
nodes={n.get('id'):xy(float(n.get('lon')),float(n.get('lat'))) for n in r.findall('node')}
ways={w.get('id'):w for w in r.findall('way')}
def pts(w): return [nodes[n.get('ref')] for n in w.findall('nd') if n.get('ref') in nodes]
def inside(p,poly):
 x,z=p; c=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]: c=not c
 return c
def centre(p): return [sum(v[i] for v in p)/len(p) for i in [0,1]]
boundary=pts(ways['29228773'])
def inpark(p): return inside(p,boundary)
def ringjoin(ids):
 chains=[[n.get('ref') for n in ways[i].findall('nd')] for i in ids if i in ways]; out=[]
 while chains:
  a=chains.pop(0)
  while a[-1]!=a[0]:
   found=False
   for k,b in enumerate(chains):
    if a[-1]==b[0]: a+=b[1:]; found=True
    elif a[-1]==b[-1]: a+=b[-2::-1]; found=True
    elif a[0]==b[-1]: a=b[:-1]+a; found=True
    elif a[0]==b[0]: a=b[:0:-1]+a; found=True
    if found: chains.pop(k); break
   if not found: break
  out.append([nodes[i] for i in a if i in nodes])
 return out
data={'boundary':boundary,'water':[],'buildings':[],'paths':[],'walls':[],'gardens':[],'pois':[]}
usedwater=set(); buildingholes={}
for rel in r.findall('relation'):
 t=tags(rel); members=rel.findall('member'); outer=[m.get('ref') for m in members if m.get('type')=='way' and m.get('role')=='outer']; inn=[m.get('ref') for m in members if m.get('type')=='way' and m.get('role')=='inner']
 if 'building' in t and len(outer)==1 and outer[0] in ways:
  buildingholes[outer[0]]=ringjoin(inn)
  for k,v in t.items():
   if k not in tags(ways[outer[0]]): E.SubElement(ways[outer[0]],'tag',{'k':k,'v':v})
 if t.get('natural')=='water':
  rings=ringjoin(outer); holes=ringjoin(inn)
  for p in rings:
   if len(p)>3 and any(inpark(v) for v in p): data['water'].append({'id':rel.get('id'),'name':t.get('name',''),'points':p,'holes':[h for h in holes if inside(h[0],p)],'source':'relation'})
  usedwater.update(outer+inn)
for wid,w in ways.items():
 t=tags(w); p=pts(w)
 if len(p)<2: continue
 c=centre(p); name=t.get('name:zh',t.get('name','')); item={'id':wid,'name':name,'points':p}
 if not inpark(c) and not any(inpark(v) for v in p): continue
 if t.get('natural')=='water' and wid not in usedwater and len(p)>3: data['water'].append({**item,'holes':[],'source':'way'})
 if 'building' in t and t.get('location')!='underground' and t.get('building')!='train_station':
  # Map footprints may include platforms. Longest edge determines local building axes.
  a,b=max(zip(p,p[1:]),key=lambda ab:math.dist(*ab)); theta=math.atan2(b[1]-a[1],b[0]-a[0]); co=math.cos(theta); si=math.sin(theta)
  us=[v[0]*co+v[1]*si for v in p]; vs=[-v[0]*si+v[1]*co for v in p]; u=(max(us)+min(us))/2; v=(max(vs)+min(vs))/2
  x=u*co-v*si; z=u*si+v*co
  data['buildings'].append({**item,'x':round(x,3),'z':round(z,3),'w':round(max(us)-min(us),3),'d':round(max(vs)-min(vs),3),'yaw':round(-theta,6),'holes':buildingholes.get(wid,[]),'tags':t,'confidence':'OSM footprint; height and facade estimated'})
 if t.get('highway') in ['footway','pedestrian','path','steps','service'] and t.get('tunnel')!='yes': data['paths'].append({**item,'steps':t.get('highway')=='steps','bridge':t.get('bridge')=='yes','covered':t.get('covered')=='yes','width':float(t.get('width','4')) if t.get('width','4').replace('.','',1).isdigit() else 4})
 if t.get('barrier') in ['wall','city_wall','fence']: data['walls'].append(item)
 if t.get('leisure')=='garden': data['gardens'].append(item)
for n in r.findall('node'):
 t=tags(n); name=t.get('name:zh',t.get('name','')); p=nodes[n.get('id')]
 if (name and inpark(p) and t.get('tourism')) or (name in ['石舫','清晏舫','北如意门','南如意门','新建宫门','东宫门'] and t.get('amenity')!='toilets' and 'public_transport' not in t):
  data['pois'].append({'id':n.get('id'),'name':name,'x':p[0],'z':p[1],'tags':t})
# API bbox includes waterways extending far outside the palace. Keep water whose
# mapped centroid lies inside the park and whose geometry fits the local scene.
data['water']=[w for w in data['water'] if inpark(centre(w['points'])) and all(-1910<v[0]<750 and -1310<v[1]<1250 for v in w['points'])]
data['metadata']={'originWGS84':[LON,LAT],'unit':'m','x':'east','y':'up; Kunming Lake surface = 0 (relative, not surveyed national datum)','z':'south','projection':'local equirectangular tangent plane R=6378137; <0.1% distance distortion over site','date':'2026-09-28','license':'OpenStreetMap contributors / ODbL 1.0','warning':'OSM features have no certified positional accuracy; no arbitrary scale compression; not GCJ02 or BD09'}
(B/'public/data/layout.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
# DEM: Mapzen Terrarium RGB decoding; samples relative to median lake elevation.
images={}
for f in (B/'research').glob('dem-*.png'):
 _,x,y=f.stem.split('-'); images[int(x),int(y)]=Image.open(f).convert('RGB')
def elev(lon,lat):
 gx=(lon+180)/360*16384; gy=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*16384
 im=images.get((int(gx),int(gy)))
 if im is None: return None
 rgb=im.getpixel((min(255,int(gx%1*256)),min(255,int(gy%1*256))))
 return rgb[0]*256+rgb[1]+rgb[2]/256-32768
if images:
 lake=elev(116.269,39.99); heights=[]; nx=221; nz=211; x0=-1900; z0=-1300; step=12
 for j in range(nz):
  for i in range(nx):
   x=x0+i*step; z=z0+j*step; lon=LON+math.degrees(x/(R*math.cos(math.radians(LAT)))); lat=LAT-math.degrees(z/R)
   h=elev(lon,lat); heights.append(round(h-lake,2) if h is not None else 0)
 dem={'nx':nx,'nz':nz,'x0':x0,'z0':z0,'step':step,'lakeRawElevation':lake,'heights':heights,'source':'Mapzen Terrain Tiles Terrarium z14; underlying SRTM/GMTED USGS; vertical datum not certified here; canopy/platform artefacts possible','license':'USGS terrain data; Mapzen tile attribution in docs/SOURCES.md'}
 (B/'public/data/dem.json').write_text(json.dumps(dem,separators=(',',':')),encoding='utf8')
 print('DEM',lake,min(heights),max(heights))
print({k:len(v) for k,v in data.items() if isinstance(v,list)})
for b in data['buildings']:
 if b['name']: print(b['name'],b['id'],b['x'],b['z'],b['w'],b['d'])
for p in data['paths']:
 if p['name']: print('path',p['name'],p['id'],round(sum(math.dist(a,b) for a,b in zip(p['points'],p['points'][1:]))),p['points'][0],p['points'][-1])
print('POIs',[(p['name'],p['x'],p['z']) for p in data['pois']])
