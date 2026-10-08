"""Reproject genuine Copernicus DSM and OSM. No invented geographic features."""
import sys,pathlib,json,math,shutil,heapq
W=pathlib.Path(__file__).resolve().parent;sys.path.insert(0,str(W/'pylibs'))
import numpy as np
import rasterio
from rasterio.warp import reproject,Resampling
from rasterio.transform import from_origin
from pyproj import Transformer,Geod
from shapely.geometry import Polygon,Point,LineString
from shapely.ops import linemerge
S=W/'sources'; O=W.parent; A=O/'assets'
for d in ['geo','vendor','references','licenses']: (A/d).mkdir(parents=True,exist_ok=True)
tr=Transformer.from_crs('EPSG:4326','EPSG:32650',always_xy=True)
ori=tr.transform(116.1815,39.989)
def xy(lon,lat):
 e,n=tr.transform(lon,lat);return [round(e-ori[0],3),round(ori[1]-n,3)]
def pts(g):return [xy(p['lon'],p['lat']) for p in g]
osm=json.loads((S/'osm.json').read_text(encoding='utf8'));el=osm['elements'];ids={e['id']:e for e in el}
boundary=ids[8758884]
lines=[LineString(pts(m['geometry'])) for m in boundary['members'] if m['role']=='outer']
ring=linemerge(lines)
assert ring.geom_type=='LineString' and ring.is_ring,'Incomplete OSM boundary'
park=Polygon(ring); parkpts=list(ring.coords)
# 20 m sample spacing is a rendering resample of ~1 arcsecond native DSM, not better measurement.
step=20;xmin=-5000;zmin=-4000;nx=501;nz=451
target=from_origin(ori[0]+xmin-step/2,ori[1]-zmin+step/2,step,step)
height=np.full((nz,nx),np.nan,dtype=np.float32)
native=[]
for file in ['copernicus.tif','copernicus-n40.tif']:
 with rasterio.open(S/file) as ds:
  tmp=np.full((nz,nx),np.nan,dtype=np.float32)
  reproject(rasterio.band(ds,1),tmp,src_transform=ds.transform,src_crs=ds.crs,dst_transform=target,dst_crs='EPSG:32650',dst_nodata=np.nan,resampling=Resampling.bilinear)
  height[np.isfinite(tmp)]=tmp[np.isfinite(tmp)]
  native.append({'file':file,'crs':str(ds.crs),'transform':list(ds.transform),'width':ds.width,'height':ds.height,'bounds':list(ds.bounds)})
assert np.isfinite(height).all(),'DSM coverage gap'
height.astype('<f4').tofile(A/'geo'/'height.f32')
def elev(x,z):
 u=np.clip((x-xmin)/step,0,nx-1.000001);v=np.clip((z-zmin)/step,0,nz-1.000001);i=int(u);j=int(v);a=u-i;b=v-j
 return float((height[j,i]*(1-a)+height[j,i+1]*a)*(1-b)+(height[j+1,i]*(1-a)+height[j+1,i+1]*a)*b)
roads=[];buildings=[];waters=[];walls=[]
crop=park.buffer(80)
for e in el:
 if e['type']!='way' or not e.get('geometry'):continue
 t=e.get('tags',{});p=pts(e['geometry']);geom=LineString(p)
 if not crop.intersects(geom):continue
 obj={'id':e['id'],'tags':t,'points':p}
 if t.get('highway') in ['footway','path','steps','pedestrian','service','track','unclassified']:
  if t.get('area')=='yes':continue
  width=float(t['width']) if t.get('width','').replace('.','',1).isdigit() else {'service':4,'track':3,'pedestrian':4,'steps':2.2,'footway':2.5,'path':1.8,'unclassified':4}.get(t['highway'],2.5)
  roads.append({**obj,'width':width,'widthEvidence':'osm' if 'width' in t else 'assumed','nodes':e['nodes']})
 if t.get('building'):buildings.append(obj)
 if t.get('natural')=='water':waters.append(obj)
 if t.get('barrier')=='wall':walls.append(obj)
landmarks=[]
for key,id,name in [('east',905117414,'东门'),('hall',533115769,'勤政殿'),('lake',605775489,'静翠湖'),('villa',5738067731,'双清别墅入口'),('peak',3317985384,'香炉峰')]:
 e=ids[id]
 if e['type']=='node':lon=e['lon'];lat=e['lat'];x,z=xy(lon,lat)
 else:
  gg=Polygon([(p['lon'],p['lat']) for p in e['geometry']]);lon=gg.centroid.x;lat=gg.centroid.y;x,z=xy(lon,lat)
 lm={'key':key,'id':id,'type':e['type'],'name':name,'lon':lon,'lat':lat,'x':x,'z':z,'dsm':round(elev(x,z),3),'tags':e.get('tags',{})}
 if e['type']=='way':
  g=Polygon(pts(e['geometry']));r=list(g.minimum_rotated_rectangle.exterior.coords);edges=[]
  for a,b in zip(r,r[1:]):edges.append({'length':math.dist(a,b),'angle':math.atan2(b[1]-a[1],b[0]-a[0])})
  lm['footprintBox']={'corners':r,'edges':edges,'area':g.area}
 landmarks.append(lm)
# Build graph exclusively from shared OSM node IDs; derive a navigable route to summit.
graph={};nodes={}
for r in roads:
 for id,p in zip(r['nodes'],r['points']):nodes[id]=p;graph.setdefault(id,[])
 for a,b in zip(r['nodes'],r['nodes'][1:]):
  w=math.dist(nodes[a],nodes[b]);graph[a].append((b,w));graph[b].append((a,w))
def closest(lm):return min(nodes,key=lambda k:math.dist(nodes[k],[lm['x'],lm['z']]))
start=closest(landmarks[0]);end=closest(landmarks[-1]);dist={start:0};prev={};q=[(0,start)]
while q:
 dd,u=heapq.heappop(q)
 if u==end:break
 if dd!=dist.get(u):continue
 for v,w in graph[u]:
  if dd+w<dist.get(v,1e99):dist[v]=dd+w;prev[v]=u;heapq.heappush(q,(dd+w,v))
route=[]
if end in dist:
 u=end
 while u!=start:route.append(nodes[u]);u=prev[u]
 route.append(nodes[start]);route.reverse()
meta={'title':'北京香山公园 · 有来源的地形游览原型','crs':'EPSG:32650','sourceCrs':'EPSG:4326','origin':{'lon':116.1815,'lat':39.989,'easting':ori[0],'northing':ori[1],'altitudeOffset':0},'axes':'x=easting-E0, y=EGM2008 orthometric DSM height, z=N0-northing','units':'metres','verticalExaggeration':1,'grid':{'nx':nx,'nz':nz,'step':step,'xmin':xmin,'zmin':zmin,'nativeArcSeconds':1,'nativeMetresApprox':[23.7,30.8],'resampling':'bilinear'},'park':{'osmRelation':8758884,'points':parkpts,'areaM2':park.area,'note':'OSM community boundary; not an official surveyed/legal boundary'},'landmarks':landmarks,'route':{'points':route,'horizontalLengthM':dist.get(end),'source':'shortest connected OSM walking graph East Gate to Xianglu Peak'},'dataDate':'2026-10-02','demVersion':'Copernicus GLO-30 Public AWS 2021 release','nativeTiles':native,'roads':roads,'buildings':buildings,'waters':waters,'walls':walls}
(A/'geo'/'scene.json').write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':')),encoding='utf8')
# Distribute only the selected OSM data snapshot, not the broad surrounding query.
selected=[e for e in el if e['id'] in set([8758884]+[o['id'] for o in roads+buildings+waters+walls]+[l['id'] for l in landmarks])]
(A/'geo'/'osm-source.json').write_text(json.dumps({'version':osm['version'],'generator':osm['generator'],'osm3s':osm['osm3s'],'elements':selected},ensure_ascii=False),encoding='utf8')
# Vendored Three.js files are already included in the project.


report={'parkAreaHa':round(park.area/10000,2),'roads':len(roads),'buildings':len(buildings),'waters':len(waters),'routeNodes':len(route),'routeHorizontalMetres':dist.get(end),'landmarks':landmarks,'eastPeakGeodesicMetres':Geod(ellps='WGS84').inv(landmarks[0]['lon'],landmarks[0]['lat'],landmarks[-1]['lon'],landmarks[-1]['lat'])[2],'eastPeakProjectedMetres':math.dist([landmarks[0]['x'],landmarks[0]['z']],[landmarks[-1]['x'],landmarks[-1]['z']]),'dsmMin':float(height.min()),'dsmMax':float(height.max())}
(O/'geographic-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False,indent=1))
