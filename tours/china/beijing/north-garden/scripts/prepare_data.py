"""Rebuild the scene from downloaded source files. Requires Python, Pillow, numpy, shapely.
No GCJ/BD coordinates are accepted. Original OSM geometry is retained in source.geojson.
Run from the project directory with --source ../../work/research (or another archive).
"""
import argparse, json, math, shutil, random, hashlib
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
from shapely.geometry import Polygon, LineString, Point, mapping, box
from shapely.ops import polygonize, unary_union, transform
from shapely.prepared import prep

ap=argparse.ArgumentParser();ap.add_argument('--source',required=True);args=ap.parse_args()
src=Path(args.source);root=Path(__file__).resolve().parents[1];out=root/'data';out.mkdir(exist_ok=True)
ORIGIN=[116.2025,40.001];A=6378137.;E2=6.6943799901413165e-3
def ecef(lon,lat):
    l,p=map(math.radians,[lon,lat]);n=A/math.sqrt(1-E2*math.sin(p)**2)
    return n*math.cos(p)*math.cos(l),n*math.cos(p)*math.sin(l),n*(1-E2)*math.sin(p)
o=ecef(*ORIGIN);l,p=map(math.radians,ORIGIN)
def local(lon,lat,z=None):
    a,b,c=ecef(lon,lat);a-=o[0];b-=o[1];c-=o[2]
    return -math.sin(l)*a+math.cos(l)*b, math.sin(p)*math.cos(l)*a+math.sin(p)*math.sin(l)*b-math.cos(p)*c
def inverse(x,z):
    lon=ORIGIN[0]+x/(111320*math.cos(p));lat=ORIGIN[1]-z/111050
    for _ in range(4):
        xx,zz=local(lon,lat);lon+=(x-xx)/(111320*math.cos(p));lat-=(z-zz)/111050
    return lon,lat
tiles={}
for f in src.glob('dem_*.png'):
    _,x,y=f.stem.split('_');tiles[int(x),int(y)]=Image.open(f).convert('RGB')
def elevation(lon,lat):
    gx=(lon+180)/360*4096*256-.5;gy=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*4096*256-.5
    ix,iy=math.floor(gx),math.floor(gy);tx,ty=gx-ix,gy-iy
    def px(x,y):
        tile=tiles.get((x//256,y//256))
        if tile is None:raise ValueError(f'Missing DEM tile: {x//256},{y//256}')
        r,g,b=tile.getpixel((x%256,y%256));return r*256+g+b/256-32768
    return (px(ix,iy)*(1-tx)+px(ix+1,iy)*tx)*(1-ty)+(px(ix,iy+1)*(1-tx)+px(ix+1,iy+1)*tx)*ty
originH=elevation(*ORIGIN)
nodes={};ways={};rels={}
for fname in ['osm_map.osm','west.osm','boundary.osm']:
    for e in ET.parse(src/fname).getroot():
        if e.tag=='node':nodes[e.get('id')]=e
        elif e.tag=='way':ways[e.get('id')]=e
        elif e.tag=='relation':rels[e.get('id')]=e
def tags(e):return {t.get('k'):t.get('v') for t in e.findall('tag')}
def coords(w):return [(float(nodes[n.get('ref')].get('lon')),float(nodes[n.get('ref')].get('lat'))) for n in w.findall('nd')]
outer=[LineString(coords(ways[m.get('ref')])) for m in rels['8758747'].findall('member') if m.get('role')=='outer']
boundary=unary_union(list(polygonize(outer)));assert boundary.geom_type=='Polygon'
park=transform(local,boundary);parkPrep=prep(park)
south=Polygon(coords(ways['661458570']));assert boundary.intersection(south).area==0
features=[];original=[];buildings=[];waters=[];roads=[]
def roundcoords(c):
    if isinstance(c[0],(int,float)):return [round(v,3) for v in c]
    return [roundcoords(a) for a in c]
def feat(kind,e,g,**extra):
    geo=mapping(g);geo['coordinates']=roundcoords(geo['coordinates']);t=tags(e)
    f={'id':e.get('id'),'kind':kind,'name':t.get('name',''),'tags':t,'geometry':geo,'status':'source-derived',**extra};features.append(f)
    return f
for id,e in ways.items():
    t=tags(e);c=coords(e)
    if len(c)<2:continue
    closed=c[0]==c[-1] and len(c)>3
    kind='building' if 'building' in t else 'water' if t.get('natural')=='water' else 'road' if t.get('highway') in ['footway','path','pedestrian','service','residential','steps','track','cycleway'] else 'zone' if id in ['225747903','225760217'] else None
    if not kind:continue
    g=Polygon(c).buffer(0) if closed and (kind!='road' or t.get('area')=='yes') else LineString(c)
    g=g.intersection(boundary)
    if g.geom_type=='GeometryCollection':
        expected=['LineString','MultiLineString'] if kind=='road' else ['Polygon','MultiPolygon']
        g=unary_union([a for a in g.geoms if a.geom_type in expected])
    if g.is_empty:continue
    if kind=='road' and g.geom_type not in ['LineString','MultiLineString','Polygon','MultiPolygon']:continue
    original.append({'type':'Feature','id':'way/'+id,'properties':{**t,'osm_id':id,'timestamp':e.get('timestamp'),'version':e.get('version')},'geometry':mapping(g)})
    g=transform(local,g)
    if kind=='building':
        h=float(t.get('height',6));cx,cz=g.centroid.coords[0];base=max(elevation(*inverse(x,z))-originH for x,z in list(g.exterior.coords)) if g.geom_type=='Polygon' else elevation(*inverse(cx,cz))-originH
        f=feat(kind,e,g,height=h,heightStatus='estimate' if 'height' not in t else 'source-derived',base=round(base,3));buildings.append((g,f))
    elif kind=='water':
        cx,cz=g.centroid.coords[0];h=elevation(*inverse(cx,cz))-originH
        f=feat(kind,e,g,level=round(h,3),levelStatus='DEM-estimate');waters.append((g,f))
    elif kind=='road':
        width=float(t.get('width', {'pedestrian':5.5,'service':4.2,'residential':5,'footway':2.2,'path':1.8,'steps':2,'track':3,'cycleway':2.5}[t['highway']]))
        f=feat(kind,e,g,width=width,widthStatus='source-derived' if 'width' in t else 'estimate');roads.append((g,f))
    else:feat(kind,e,g)
minx,minz,maxx,maxz=park.bounds;step=12
x0=math.floor(minx/step)*step;z0=math.floor(minz/step)*step
nx=math.ceil((maxx-x0)/step)+1;nz=math.ceil((maxz-z0)/step)+1
grid=[round(elevation(*inverse(x0+i*step,z0+j*step))-originH,3) for j in range(nz) for i in range(nx)]
# Reproducible approximate planting: heterogeneous zones, canopy clearance from mapped features.
obstacles=unary_union([g.buffer(3) for g,f in buildings]+[g.buffer(3) for g,f in waters]+[g.buffer(f['width']/2+2) for g,f in roads]+[transform(local,Polygon(coords(ways[i]))).buffer(2) for i in ['225747903','225760217']])
blocked=prep(obstacles);rng=random.Random(91742);trees=[];accepted={}
for z in range(math.ceil(minz),math.floor(maxz),6):
    for x in range(math.ceil(minx),math.floor(maxx),6):
        xx=x+rng.uniform(-2.5,2.5);zz=z+rng.uniform(-2.5,2.5);pt=Point(xx,zz)
        if not parkPrep.contains(pt) or blocked.contains(pt):continue
        lon,lat=inverse(xx,zz)
        north=lat>40.0048;east=lon>116.2061
        # Zone identity is an explicit assumption, not individual botanical survey data.
        density=(.96 if north else .72 if east else .56)
        density*=.52+.48*(math.sin(xx*.017)*math.cos(zz*.021)*.5+.5)
        if rng.random()>density:continue
        typ=2 if north and lon<116.1992 and rng.random()<.7 else 1 if north and rng.random()<.4 else 0
        h=rng.uniform(13,21) if typ==2 else rng.uniform(8,14) if typ==1 else rng.uniform(6,13)
        radius=h*(.17 if typ else .26)
        if obstacles.distance(pt)<radius:continue
        cell=(int(xx//10),int(zz//10));near=[a for dx in [-1,0,1] for dz in [-1,0,1] for a in accepted.get((cell[0]+dx,cell[1]+dz),[])]
        if any(math.hypot(xx-a[0],zz-a[1])<radius*.8+a[2]*.8 for a in near):continue
        accepted.setdefault(cell,[]).append((xx,zz,radius));trees.append([round(xx,2),round(zz,2),typ,round(h,2),round(rng.random(),3)])
def nodepoint(id):return local(float(nodes[id].get('lon')),float(nodes[id].get('lat')))
gh=next(f for g,f in buildings if f['id']=='225648931');ghpoly=next(g for g,f in buildings if f['id']=='225648931')
temple=transform(local,Polygon(coords(ways['225747903'])))
poi=[
 {'id':'greenhouse','name':'展览温室','subtitle':'中轴路西侧 · 材质样板','position':list(ghpoly.centroid.coords[0]),'osm':'way/225648931','status':'轮廓有据 · 高度与屋顶估算','description':'官方介绍：热带展览温室位于中轴路西侧，总建筑面积 17,000 平方米；设计采用“根茎”交织的倾斜玻璃顶棚。总建筑面积并非建筑占地面积。当前保留 OSM 占地轮廓，屋顶曲面和构件尺寸尚待图纸校准。','url':'https://www.chnbg.cn/gardens_detail/469.html'},
 {'id':'wofo','name':'卧佛寺','subtitle':'北部历史建筑群','position':list(temple.centroid.coords[0]),'osm':'way/225747903','status':'院落与已绘建筑有据 · 高度估算','description':'官方介绍：寺庙在清乾隆四十八年（1783）大修后形成如今格局，以古柏夹道、娑罗树和元代铜铸卧佛闻名。当前仅展示开放地图已有建筑轮廓，没有补造缺失殿宇与文物。','url':'https://www.chnbg.cn/history_culture.html#1'},
 {'id':'cherry','name':'樱桃沟','subtitle':'溪谷区域 · 水源头定位','position':list(nodepoint('402451101')),'osm':'node/402451101','status':'水源头坐标有据 · 景区边界未核实','description':'官方介绍：樱桃沟因自然生长的毛樱桃得名，保育水杉林。标记使用 OSM“水源头”点作为溪谷浏览锚点，不代表景区精确中心；林木个体及栈道细节尚缺测量。','url':'https://www.chnbg.cn/history_culture.html#2'},
 {'id':'cao','name':'曹雪芹纪念馆','subtitle':'黄叶村 · 历史文化','position':list(nodepoint('2274622928')),'osm':'node/2274622928','status':'定位有据 · 建筑细节待补','description':'官方介绍：纪念馆创建于 1984 年，以发现“题壁诗”的正白旗 39 号院为基础，展示曹雪芹与《红楼梦》相关历史文化。当前按地图定位与已有轮廓展示，未还原展陈和院落细部。','url':'https://www.chnbg.cn/history_culture.html#3'}]
for f in poi:f['position']=[round(v,3) for v in f['position']]
controlPoints=[]
for id in ['286251933','286251830','2274622928','402451101']:
    n=nodes[id];lon=float(n.get('lon'));lat=float(n.get('lat'));controlPoints.append({'id':id,'name':tags(n)['name'],'lon':lon,'lat':lat,'local':[round(v,3) for v in local(lon,lat)],'timestamp':n.get('timestamp'),'version':n.get('version')})
data={'meta':{'title':'国家植物园北园','retrieved':'2026-10-02','crs':'WGS84 / ECEF local East–South','origin':ORIGIN,'originElevation':round(originH,3),'vertical':'Tilezen Terrarium DEM; orthometric approximation, source mixture not per-pixel verified','units':'metres','boundary':'OSM relation/8758747','southExcluded':'OSM way/661458570','areaM2':round(park.area),'status':'source-derived horizontal geometry; estimated heights, widths and planting'},'controlPoints':controlPoints,'boundary':roundcoords(mapping(park)['coordinates']),'features':features,'pois':poi,'trees':trees,'terrain':{'x0':x0,'z0':z0,'step':step,'nx':nx,'nz':nz,'heights':grid},'counts':{'buildings':len(buildings),'water':len(waters),'roads':len(roads),'trees':len(trees)}}
(out/'scene.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
original.insert(0,{'type':'Feature','id':'relation/8758747','properties':{'name':'国家植物园（北园）','source':'OpenStreetMap','license':'ODbL-1.0','role':'boundary'},'geometry':mapping(boundary)})
(out/'source.geojson').write_text(json.dumps({'type':'FeatureCollection','features':original},ensure_ascii=False,separators=(',',':')),encoding='utf8')
(out/'terrain-source').mkdir(exist_ok=True)
for f in src.glob('dem_*.png'):shutil.copy2(f,out/'terrain-source'/f.name)
shutil.copy2(src/'elevation-license.txt',out/'terrain-source/ATTRIBUTION.md')
print(json.dumps({'counts':data['counts'],'areaM2':data['meta']['areaM2'],'bounds':park.bounds,'elevationRange':[min(grid)+originH,max(grid)+originH],'greenhouseArea':ghpoly.area},indent=2))

