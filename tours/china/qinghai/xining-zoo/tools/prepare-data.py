import json, math, xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'dist/assets/data'
ORIGIN=[101.7305,36.626]
R=6378137
def local(lon,lat):
    return [round(math.radians(lon-ORIGIN[0])*R*math.cos(math.radians(ORIGIN[1])),3),round(-math.radians(lat-ORIGIN[1])*R,3)]
def geo(x,z):
    return [ORIGIN[0]+math.degrees(x/(R*math.cos(math.radians(ORIGIN[1])))),ORIGIN[1]-math.degrees(z/R)]
root=ET.parse(ROOT/'source-data/zoo.osm').getroot()
nodes={n.get('id'):n for n in root.findall('node')}
def tags(e):return {t.get('k'):t.get('v') for t in e.findall('tag')}
def point(n):return local(float(n.get('lon')),float(n.get('lat')))
def points(w):return [point(nodes[n.get('ref')]) for n in w.findall('nd')]
ways={w.get('id'):w for w in root.findall('way')}
boundary=points(ways['1000455160'])
def inside(p,poly=boundary):
    x,z=p;c=False
    for a,b in zip(poly,poly[1:]+poly[:1]):
        if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:c=not c
    return c
def centroid(pts):return [sum(p[i] for p in pts)/len(pts) for i in [0,1]]
roads=[];buildings=[];areas=[]
for ident,w in ways.items():
    t=tags(w);pts=points(w)
    if not any(inside(p) for p in pts):continue
    base={'id':ident,'name':t.get('name','未命名'),'points':pts,'timestamp':w.get('timestamp'),'source':'OSM','status':'community-unverified'}
    if t.get('highway') in ['service','footway','path']:
        if max(abs(p[0]) for p in pts)>1100 or max(abs(p[1]) for p in pts)>950:continue
        private=t.get('access') in ['private','no','permit'] or any(k in t.get('name','') for k in ['员工','内部','墓园','西小门','东小门'])
        # Exclude bridges from walking until deck elevations are surveyed.
        roads.append({**base,'kind':t['highway'],'width':2.5 if t['highway'] in ['path','footway'] else 6,'widthBasis':'可视化/导航参数；无实测依据，不代表现场宽度','walkable':not private and t.get('bridge')!='yes','accessVerified':False,'bridge':t.get('bridge')=='yes','refs':[n.get('ref') for n in w.findall('nd')]})
    if 'building' in t and pts[0]==pts[-1]:
        name=t.get('name','未命名建筑').split(' (')[0].split('(')[0]
        buildings.append({**base,'name':name,'height':None,'heightBasis':'无高度资料；只绘制贴地轮廓，不拉伸为建筑','center':centroid(pts[:-1])})
    if t.get('natural')=='water' or t.get('zoo')=='aviary' or t.get('tourism')=='zoo' and ident!='1000455160':
        areas.append({**base,'kind':'water' if t.get('natural')=='water' else 'mapped-area','center':centroid(pts[:-1]),'elevationVerified':False})

tiles={}
for f in (ROOT/'source-data/dem').glob('*.png'):
    zoom,x,y=map(int,f.stem.split('-'));tiles[x,y]=Image.open(f).convert('RGB')
def elevation(lon,lat):
    px=(lon+180)/360*(2**14)*256
    py=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*(2**14)*256
    ix,iy=math.floor(px),math.floor(py);fx,fy=px-ix,py-iy
    def sample(x,y):
        rr,gg,bb=tiles[x//256,y//256].getpixel((x%256,y%256));return rr*256+gg+bb/256-32768
    return (1-fx)*(1-fy)*sample(ix,iy)+fx*(1-fy)*sample(ix+1,iy)+(1-fx)*fy*sample(ix,iy+1)+fx*fy*sample(ix+1,iy+1)
extent=[-820,-720,820,720];nx=165;nz=145
heights=[round(elevation(*geo(extent[0]+i*10,extent[1]+j*10)),2) for j in range(nz) for i in range(nx)]
terrain={'extent':extent,'nx':nx,'nz':nz,'step':10,'heights':heights,'datum':2300,'min':min(heights),'max':max(heights),'provider':'Mapzen / AWS Terrain Tiles · Terrarium','nativeResolution':'10m 为采样网格间距，并非原始数据精度；底层 DEM 来源与现场误差未逐点核验','imageryDate':None,'retrieved':'2026-10-02','tileURLs':[f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/{x}/{y}.png' for x,y in tiles]}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'terrain.json').write_text(json.dumps(terrain,separators=(',',':'),ensure_ascii=False),'utf8')
places=[
 {'id':'north','name':'北侧入口道路','subtitle':'入口位置待交叉核对','point':local(101.7298609,36.6298364),'sourceURL':'https://www.openstreetmap.org/way/193218931','detail':'这是地图中园区北侧道路的端点，附近有正门停车点标注。2021 年官方报道确认新大门启用，但当前资料不足以确认此点就是现行检票入口，因此不放置虚构门楼。'},
 {'id':'lake','name':'水禽湖','subtitle':'水面边界 · 社区地图','point':next(a['center'] for a in areas if a['kind']=='water'),'sourceURL':'https://www.openstreetmap.org/way/237978036','detail':'水面范围来自 OSM way 237978036。2021 年青海省政府转载报道提到观光车起点迁至水禽湖。岸线现状、水位、栏杆及水禽分布尚未核实。'},
 {'id':'visitor','name':'游客服务中心','subtitle':'建筑轮廓 · 高度未知','point':next(b['center'] for b in buildings if b['id']=='1532194242'),'sourceURL':'https://www.openstreetmap.org/way/1532194242','detail':'仅录入社区地图中的建筑占地轮廓。建筑高度、檐口、门窗、标识和外墙材料没有可测量的现场参考，暂不建立三维立面。'},
 {'id':'snow','name':'雪豹馆','subtitle':'馆舍位置 · 待现场核对','point':next(b['center'] for b in buildings if b['id']=='1532035166'),'sourceURL':'https://www.openstreetmap.org/way/1532035166','detail':'地图有雪豹馆建筑轮廓与同名地点。此版本只提供位置及轮廓核对；围栏、活动场边界和动物个体位置缺少依据，不生成推测模型。'},
 {'id':'panda','name':'西宁熊猫馆','subtitle':'区域边界 · 社区地图','point':local(101.727106,36.627570),'sourceURL':'https://www.openstreetmap.org/way/1532035181','detail':'区域范围来自社区地图的 tourism=zoo 要素，并非建筑轮廓。没有把整个区域拉伸为建筑；馆舍外观、入口和动物活动区仍需照片或图纸。'},
 {'id':'aquarium','name':'海洋馆','subtitle':'建筑轮廓 · 高度未知','point':next(b['center'] for b in buildings if b['id']=='1532035182'),'sourceURL':'https://www.openstreetmap.org/way/1532035182','detail':'OSM 标注为青藏高原野生动物园海洋馆。当前只显示建筑占地轮廓，不能据此判断层数、屋顶或立面材质。'}]
checkpoints=[
 {'id':'P1','name':'水禽湖','cameraXZ':[112,-225],'eyeOffset':1.65,'targetXZ':[105,-293],'targetOffset':1.2,'fov':50,'referenceURL':'https://news.qq.com/rain/a/20210427A02L2000','published':'2021-04-27','photoDate':'报道为2021-04-26改造投入使用；具体照片拍摄时间未标注','basis':'照片远处有城市高楼，暂从湖南侧朝北观察；坐标、相机高度和视野均未标定。','status':'unregistered-candidate'},
 {'id':'P2','name':'猴山','cameraXZ':local(101.72962,36.62846),'eyeOffset':12,'targetXZ':local(101.7294261,36.6282329),'targetOffset':0,'fov':50,'referenceURL':'https://news.qq.com/rain/a/20210427A02L2000','published':'2021-04-27','photoDate':None,'basis':'照片为俯视围合场地。以OSM猴山地点为目标设置俯视检查位置；相机坐标、12米高度和50度视野是检查参数，不是现场测量。','status':'unregistered-candidate'},
 {'id':'P3','name':'百鸟苑','cameraXZ':[-104,-26],'eyeOffset':1.65,'targetXZ':[-87,-60],'targetOffset':3,'fov':50,'referenceURL':'https://news.qq.com/rain/a/20210427A01V1Y00','published':'2021-04-27','photoDate':None,'basis':'照片仅为展区内部局部岩壁；无法确定拍摄方位。该视角只是OSM展区范围内的检查位置，不能用于像素级配准。','status':'unregistered-candidate'}]
layout={'meta':{'title':'西宁野生动物园','origin':ORIGIN,'worldUnit':'metre','axis':'x=east, y=up, z=south','retrieved':'2026-10-02','boundaryID':'1000455160','precision':'经纬度按局部等距投影转换为米；坐标小数位不等于测量精度','source':'© OpenStreetMap contributors · ODbL 1.0','sourceURL':'https://www.openstreetmap.org/copyright','scope':'资料核对版：地形、道路线位、建筑平面；不是写实成品'},'boundary':boundary,'roads':roads,'buildings':buildings,'areas':areas,'places':places,'checkpoints':checkpoints,'assets':[],'unresolved':['现行主入口与2021年旧入口对应关系','建筑高度、立面和门窗','园内围栏与展区准确边界','道路宽度、路缘、台阶和挡土墙','植被种类、位置和密度','动物模型与准确活动范围','至少三个可标定的参考照片机位','季节、天气、太阳方位和现场材质']}
(OUT/'layout.json').write_text(json.dumps(layout,ensure_ascii=False,separators=(',',':')),'utf8')
print(json.dumps({'roads':len(roads),'buildings':len(buildings),'areas':len(areas),'terrainRange':[min(heights),max(heights)],'boundaryArea':abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(boundary,boundary[1:])))/2},ensure_ascii=False))
