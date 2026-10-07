"""Reproducible, offline preparation of downloaded OSM/SRTM/EOX sources."""
from pathlib import Path
import xml.etree.ElementTree as E, json, math, gzip, hashlib, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from geo import local, geographic, ORIGIN, OE, ON
B=Path(__file__).resolve().parents[1]; OUT=B/'public/data'; OUT.mkdir(exist_ok=True)
nodes={}; ways={}; rels={}
tags=lambda e:{t.get('k'):t.get('v') for t in e.findall('tag')}
for f in sorted((B/'research').glob('*.osm')):
 r=E.parse(f).getroot()
 for n in r.findall('node'):nodes[n.get('id')]=n
 for w in r.findall('way'):ways[w.get('id')]=w
 for v in r.findall('relation'):rels[v.get('id')]=v
xy={i:[round(float(v),3) for v in local(float(n.get('lon')),float(n.get('lat')))] for i,n in nodes.items()}
def refs(w):return [n.get('ref') for n in w.findall('nd')]
def pts(w):return [xy[i] for i in refs(w) if i in xy]
def join(chains):
 chains=[c[:] for c in chains if len(c)>1]; closed=[]; opened=[]
 while chains:
  a=chains.pop()
  while a[-1]!=a[0]:
   ok=False
   for i,b in enumerate(chains):
    if a[-1]==b[0]: a+=b[1:]
    elif a[-1]==b[-1]: a+=b[-2::-1]
    elif a[0]==b[-1]: a=b[:-1]+a
    elif a[0]==b[0]: a=b[:0:-1]+a
    else:continue
    chains.pop(i); ok=True; break
   if not ok:break
  (closed if a[0]==a[-1] else opened).append(a)
 return closed,opened
def inside(p,ring):
 x,z=p; c=False
 for a,b in zip(ring,ring[1:]):
  if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:c=not c
 return c
def area(p):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:]))/2)
def centre(p):return [sum(v[i] for v in p)/len(p) for i in [0,1]]
closed,opened=join([refs(w) for w in ways.values() if tags(w).get('natural')=='coastline'])
rings=[[xy[i] for i in ids] for ids in closed if all(i in xy for i in ids)]
main=next((p for p in rings if inside([0,0],p)),None)
if main is None:raise RuntimeError('Main island coastline is not closed. Fetch missing ways; never invent a closing coastline.')
x0,z0=-14500,-24500; width,depth=29500,45000
def inbounds(p):return x0<=p[0]<=x0+width and z0<=p[1]<=z0+depth
coasts=[p for p in rings if area(p)>1000 and all(inbounds(v) for v in p)]
if main not in coasts:coasts.append(main)
coasts.sort(key=area,reverse=True)
data={'coastlines':coasts,'mainIsland':coasts.index(main),'roads':[],'buildings':[],'areas':[],'places':[],'turbines':[]}
used=set()
for rel in rels.values():
 t=tags(rel)
 if t.get('type')!='multipolygon' or not (t.get('natural') in ['water','beach','wood','scrub'] or 'landuse' in t):continue
 ids=[m.get('ref') for m in rel.findall('member') if m.get('type')=='way' and m.get('role')=='outer']
 inn=[m.get('ref') for m in rel.findall('member') if m.get('type')=='way' and m.get('role')=='inner']
 rs,_=join([refs(ways[i]) for i in ids if i in ways]); hs,_=join([refs(ways[i]) for i in inn if i in ways])
 for rr in rs:
  if not all(i in xy for i in rr):continue
  p=[xy[i] for i in rr]
  # Intertidal beach polygons can have their centroid seaward of natural=coastline.
  # Retain the source polygon rather than wrongly discarding the whole beach.
  if not inside(centre(p),main) and t.get('natural')!='beach':continue
  data['areas'].append({'id':'r'+rel.get('id'),'points':p,'holes':[[xy[i] for i in h] for h in hs if all(i in xy for i in h) and inside(xy[h[0]],p)],'kind':t.get('natural',t.get('landuse')),'tags':t})
  used.update(ids+inn)
for wid,w in ways.items():
 t=tags(w); p=pts(w)
 if len(p)<2:continue
 c=centre(p)
 if not all(inbounds(v) for v in p):continue
 item={'id':'w'+wid,'points':p,'tags':t}
 if 'highway' in t and t.get('area')!='yes' and t.get('tunnel')!='yes' and (inside(c,main) or t.get('bridge')=='yes'):
  data['roads'].append(item)
 if 'building' in t and len(p)>3 and p[0]==p[-1] and inside(c,main):
  a,b=max(zip(p,p[1:]),key=lambda ab:math.dist(*ab)); theta=math.atan2(b[1]-a[1],b[0]-a[0]); co,si=math.cos(theta),math.sin(theta)
  us=[v[0]*co+v[1]*si for v in p]; vs=[-v[0]*si+v[1]*co for v in p]; u=(max(us)+min(us))/2; v=(max(vs)+min(vs))/2
  data['buildings'].append({**item,'x':round(u*co-v*si,3),'z':round(u*si+v*co,3),'w':round(max(us)-min(us),3),'d':round(max(vs)-min(vs),3),'yaw':-theta,'height':t.get('height'),'levels':t.get('building:levels'),'accuracy':'OSM footprint; untagged height/roof/facade estimated'})
 if wid not in used and len(p)>3 and p[0]==p[-1] and t.get('natural',t.get('landuse')) in ['water','beach','wood','scrub','bare_rock','wetland','forest','farmland','residential','industrial','grass','meadow','orchard','quarry'] and (inside(c,main) or t.get('natural') in ['beach','bare_rock']):
  data['areas'].append({**item,'holes':[],'kind':t.get('natural',t.get('landuse'))})
for nid,n in nodes.items():
 t=tags(n); p=xy[nid]
 if not inbounds(p):continue
 if t.get('place') and inside(p,main):data['places'].append({'id':'n'+nid,'x':p[0],'z':p[1],'tags':t})
 if t.get('generator:source')=='wind':data['turbines'].append({'id':'n'+nid,'x':p[0],'z':p[1],'tags':t,'onLand':any(inside(p,c) for c in coasts)})
data['metadata']={'projection':'EPSG:32650 / WGS84 UTM zone 50N','originWGS84':ORIGIN,'originUTM':[float(OE),float(ON)],'unit':'1 unit = 1 metre','axes':'X grid east, Y up, Z grid south','mainAreaM2':area(main),'mainBBox':[min(v[0] for v in main),min(v[1] for v in main),max(v[0] for v in main),max(v[1] for v in main)],'coastlinePolicy':'only exact node-ID-joined closed OSM rings; unclosed coastline omitted; no synthetic closure','omittedOpenCoasts':len(opened),'date':'2026-10-07 Asia/Shanghai','bounds':{'x0':x0,'z0':z0,'width':width,'depth':depth}}
(OUT/'geography.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
# Rasterise real coastlines and landcover, signed distance is a visual approximation.
TW,TH=2048,3072; pix=lambda p:((p[0]-x0)/width*(TW-1),(p[1]-z0)/depth*(TH-1))
mask=Image.new('L',(TW,TH)); md=ImageDraw.Draw(mask)
for p in coasts:md.polygon([pix(v) for v in p],fill=255)
land=np.asarray(mask)>127
maskfile=B/'research/coast-mask.u8';distancefile=B/'research/coast-distance.f32'
np.asarray(mask).tofile(maskfile)
subprocess.run(['node',str(B/'scripts/coast-distance.mjs'),str(maskfile),str(distancefile),str(TW),str(TH),str(width/(TW-1)),str(depth/(TH-1))],check=True)
dist=np.fromfile(distancefile,dtype='<f4').reshape(TH,TW)
cover=Image.new('L',(TW,TH),0); cd=ImageDraw.Draw(cover)
codes={'beach':32,'bare_rock':64,'forest':96,'wood':96,'scrub':128,'grass':128,'meadow':128,'farmland':160,'orchard':160,'residential':192,'industrial':192,'water':224,'wetland':224,'quarry':64}
for a in sorted(data['areas'],key=lambda a:area(a['points']),reverse=True):
 cd.polygon([pix(v) for v in a['points']],fill=codes.get(a['kind'],0))
 for h in a['holes']:cd.polygon([pix(v) for v in h],fill=0)
channels=np.dstack([np.asarray(mask),np.clip(128+dist/4,0,255).astype('uint8'),np.asarray(cover)]).astype('uint8')
Image.fromarray(channels).save(OUT/'coastal-field.png')
# Separate VISUAL water-edge field: expose the unchanged mapped intertidal beaches.
# Original OSM coastline, DEM land mask and raw elevations remain independent.
watermask=mask.copy(); wd=ImageDraw.Draw(watermask)
for a in data['areas']:
 if a['kind']=='beach':wd.polygon([pix(v) for v in a['points']],fill=255)
np.asarray(watermask).tofile(B/'research/water-mask.u8')
subprocess.run(['node',str(B/'scripts/coast-distance.mjs'),str(B/'research/water-mask.u8'),str(B/'research/water-distance.f32'),str(TW),str(TH),str(width/(TW-1)),str(depth/(TH-1))],check=True)
waterdist=np.fromfile(B/'research/water-distance.f32',dtype='<f4').reshape(TH,TW)
Image.fromarray(np.dstack([np.asarray(watermask),np.clip(128+waterdist/4,0,255).astype('uint8'),np.asarray(cover)]).astype('uint8')).save(OUT/'water-field.png')
# Real imagery: inverse UTM for every output pixel, georeferenced WMS EPSG:4326.
xx=x0+np.linspace(0,width,TW); zz=z0+np.linspace(0,depth,TH); gx,gz=np.meshgrid(xx,zz); lon,lat=geographic(gx,gz)
im=np.asarray(Image.open(B/'research/satellite-2016.jpg').convert('RGB')); sy=np.clip((25.75-lat)/.4*(im.shape[0]-1),0,im.shape[0]-1).astype(int); sx=np.clip((lon-119.65)/.26*(im.shape[1]-1),0,im.shape[1]-1).astype(int)
out=im[sy,sx]; Image.fromarray(out).save(OUT/'satellite-2016.webp',quality=91)
Image.fromarray(out).resize((1024,1536),Image.Resampling.LANCZOS).save(OUT/'satellite-low.webp',quality=86)
# Bilinear real 1-arcsecond Skadi elevations; store raw and coastal-adjusted surface separately.
raw=np.frombuffer(gzip.open(B/'research/N25E119.hgt.gz','rb').read(),dtype='>i2').reshape(3601,3601).astype('float32')
step=40; nx=math.ceil(width/step)+1; nz=math.ceil(depth/step)+1; gx,gz=np.meshgrid(x0+np.arange(nx)*step,z0+np.arange(nz)*step); lon,lat=geographic(gx,gz)
u=np.clip((lon-119)*3600,0,3599.999); v=np.clip((26-lat)*3600,0,3599.999); i,j=u.astype(int),v.astype(int); a,b=u-i,v-j
hh=raw[j,i]*(1-a)*(1-b)+raw[j,i+1]*a*(1-b)+raw[j+1,i]*(1-a)*b+raw[j+1,i+1]*a*b
if np.any(hh<-1000):raise RuntimeError('DEM has void values; fill from another real data source, do not silently replace.')
hh.astype('<f4').tofile(OUT/'elevation-raw.f32')
ix=np.clip(((gx-x0)/width*(TW-1)).astype(int),0,TW-1); iz=np.clip(((gz-z0)/depth*(TH-1)).astype(int),0,TH-1); sd=dist[iz,ix]; lm=land[iz,ix]
surface=np.where(lm,np.maximum(.08,hh)*np.clip(np.maximum(sd,0)/85,0,1),-3)
surface.astype('<f4').tofile(OUT/'surface.f32'); lm.astype('uint8').tofile(OUT/'land.u8')
meta={'nx':nx,'nz':nz,'step':step,'x0':x0,'z0':z0,'width':(nx-1)*step,'depth':(nz-1)*step,'dataType':'little-endian float32, row-major north to south','surfaceUrl':'surface.f32','rawUrl':'elevation-raw.f32','landUrl':'land.u8','originalResolution':'1 arcsecond, about 28 m E-W / 31 m N-S here; 40 m output sampling','heightDatum':'Skadi composite elevations; presumed SRTM EGM96 where SRTM is used; local datum not independently verified; visual sea plane Y=0','rawRange':[float(hh.min()),float(hh.max())],'mainMaxRaw':float(np.max(np.where(lm,hh,0))),'modifications':'Only visual surface: positive DEM clamped and tapered within ~85m of OSM coastline to Y=0; ocean set -3m; NOT a bathymetry dataset. Raw heights retained. Coastal distance is Euclidean raster distance ~14m, encoded at 4m quantization, clamped to 508m.'}
(OUT/'terrain.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
stats={k:len(data[k]) for k in ['coastlines','roads','buildings','areas','places','turbines']}; stats.update({'mainAreaKm2':area(main)/1e6,'mainBBox':data['metadata']['mainBBox'],'coastVertices':len(main),'openCoasts':len(opened),'dem':meta})
village=next(a for a in data['areas'] if '北港' in a['tags'].get('name',''))
stats['beigang']={'polygonId':village['id'],'centre':centre(village['points']),'bbox':[min(v[i] for v in village['points']) for i in [0,1]]+[max(v[i] for v in village['points']) for i in [0,1]],'buildings':sum(inside([b['x'],b['z']],village['points']) for b in data['buildings'])}
(B/'research/processing-results.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf8')
checks=[]
for f in sorted((B/'research').glob('*')):
 if f.is_file() and f.suffix in ['.osm','.gz','.jpg','.xml','.html']:checks.append({'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(B/'research/checksums.json').write_text(json.dumps(checks,indent=2),encoding='utf8')
print(json.dumps(stats,ensure_ascii=True,indent=2))
