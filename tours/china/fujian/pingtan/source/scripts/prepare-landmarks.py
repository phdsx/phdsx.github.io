"""Offline landscape inventory. Source geometry stays separate from approximate detail.
No copyrighted reference photographs or commercial map tiles are copied to runtime.
"""
from pathlib import Path
import xml.etree.ElementTree as E,json,math
from geo import local,geographic
B=Path(__file__).resolve().parents[1]
g=json.loads((B/'public/data/geography.json').read_text(encoding='utf8'))
nodes={};ways={}
for f in ['north.osm','south.osm','northwest.osm']:
 r=E.parse(B/'research'/f).getroot()
 nodes.update({n.get('id'):n for n in r.findall('node')});ways.update({w.get('id'):w for w in r.findall('way')})
def point(n):return [round(float(v),3) for v in local(float(n.get('lon')),float(n.get('lat')))]
def ring(id):return [point(nodes[n.get('ref')]) for n in ways[id].findall('nd')]
def center(p):return [round(sum(v[i] for v in p)/len(p),3) for i in [0,1]]
coast=g['coastlines'][g['mainIsland']]
def near(x,z):return min(coast,key=lambda p:math.hypot(p[0]-x,p[1]-z))
news='https://www.ptnet.cn/'
geo_news=news+'a/2022-09/02/content_2028266.html'
mirror_news=news+'ly/2022-12/18/content_2038133.html'
six_coasts=news+'wap/content/2022-03/27/content_2014431.html'
places=[]
def add(id,name,p,region,kind,offset,close,description,source,reference,accuracy='真实区域 · 地貌外观近似',**kw):
 places.append(dict(id=id,name=name,x=p[0],z=p[1],region=region,kind=kind,offset=offset,closeOffset=close,description=description,accuracy=accuracy,source=source,references=reference,positionClass=kw.pop('positionClass','source'),**kw))
# Mirror: region corroborated by Amap POI B0JRBL0WVQ, not a surveyed cave mouth.
# The modelling anchor is a SOURCE coastline node at the east end of two OSM
# beaches. It is deliberately described as an approximate regional anchor.
mirror=near(2707,-9924)
add('jingsha','镜沙',mirror,'北岸','cave',[75,40,-85],[14,3,-22],'深灰黑色裂隙礁岸、黄色沙地与海蚀洞。洞口、洞深和单块岩体按照片近似；岸线沿用真实 OSM，洞口尚无测绘坐标。','OSM coast node at east end of beaches w1285652150/w1285652151; regional interpretation, not surveyed cave mouth',[mirror_news,'https://www.amap.com/place/B0JRBL0WVQ','https://hk.trip.com/moments/detail/pingtan-county-2652-129545900/'],positionClass='approximate',accuracy='真实岸线 · 洞口位置/外观近似',heading=-.12,closeCamera=[0,3.5,10],closeLook=[0,1,-18],modelDimensions={'caveWidth':8,'caveHeight':7,'caveDepth':14,'basis':'visual estimate, not measured'})
# OSM viewpoint is named 仙人洞. It identifies the landscape, not the well centre.
# Anchor a photo-based well near the adjacent source shore; retain that distinction.
vp=point(nodes['5931451116']);shore=near(*vp);well=[round(shore[0]-43,3),round(shore[1]+18,3)]
add('xianren','仙人井',well,'东岸','well',[80,210,90],[20,95,26],'东海仙境的海蚀竖井、陡壁与井底涌潮。口径约50米、深约43米依据官方报道；井壁、三处通海洞和步道为照片近似。','OSM viewpoint n5931451116 and adjacent source coastline; approximate well centre',[news+'ly/2025-02/15/content_2096309.html',geo_news,'https://you.ctrip.com/sight/pingtancounty2652/1480091.html'],positionClass='approximate',accuracy='真实景区定位 · 井体与中心位置近似',aimY=19,modelDimensions={'diameter':50,'depth':43,'seaPassages':3,'basis':'Pingtan official approximate published dimensions; no 3D survey'})
sp=local(119.68,25.5833333333)
sp_ring=min(g['coastlines'],key=lambda p:math.hypot(*[center(p)[i]-sp[i] for i in [0,1]]))
add('shipaiyang','石牌洋',center(sp_ring),'西岸','pillars',[90,55,105],[45,28,60],'海中真实礁盘上的一高一低双石帆。约33米与17米高度依据平潭时报；柱体曲面、宽厚与位置关系参考官方影像近似。','OSM closed reef ring near the reported coarse location 25°35.0′N 119°40.8′E; no independently surveyed precision',[news+'a/2017-09/22/content_1194949.html','https://www.prnewswire.com/news-releases/all-the-way-to-the-blue-midsummer-of-pingtan-rv-self-driving-campaign-held-in-pingtan-pingtan-international-tourism-island-has-become-a-self-driving-resort-301112484.html'],footprint=sp_ring,aimY=17,modelDimensions={'eastHeight':33,'westHeight':17,'basis':'official rounded heights; other dimensions approximate'})
monkey=ring('1180027916')
add('houyan','猴研岛',center(monkey),'南岸','granite-islet',[230,95,255],[65,32,95],'68海里景区的花岗岩岩岛与狭窄水道。岛岸轮廓采用真实 OSM；球状风化岩为类型化近似，碑刻、游步道与旅游设施尚缺测绘。','OSM coast way w1180027916, unchanged footprint',[geo_news,'https://mapcarta.com/W1180027916'],footprint=monkey,accuracy='真实岛岸轮廓 · 岩体近似 / 设施暂缺')
xb=next(a for a in g['areas'] if a['id']=='w511682172')
add('xiangbi','象鼻湾',center(xb['points']),'西岸','sand-spit',[-1800,750,1150],[-280,90,240],'建民沙坝的西向狭长沙堤与两侧海域。采用 OSM 沙滩 w511682172，并与2016影像核对；当前是固定时刻的轮廓，尚未模拟潮汐引起的沙坝变形。','OSM beach w511682172, region corroborated by official tourism map and EOX 2016 imagery',[six_coasts],accuracy='真实沙滩与沙堤轮廓 · 潮汐暂缺')
add('jiangjun','将军山',point(nodes['9153646223']),'南岸','peak',[430,240,550],[100,70,130],'南端山体、海湾和岩岸的空间关系采用 OSM 与原始高程。保留山体尺度；纪念设施、海蚀裂隙和单体石景暂缺精细资料。','OSM peak n9153646223; Skadi DEM',[news+'gtx/2015-05/28/content_1312805.html'],accuracy='真实峰位与DEM · 纪念设施暂缺')
# Keep lesser documented sites visible in the inventory instead of quietly pretending
# they have a precise mesh. An approximate area locator remains useful and explicit.
add('nanzhai','南寨山',list(local(119.7372,25.4655)),'内陆','weathered-rocks',[420,190,400],[90,48,90],'内陆低丘上的球状风化花岗岩群。官方资料核实景观类型；区域定位与单体岩石为近似，内部路径和命名象形石暂缺。','Approximate regional interpretation corroborated by official tourist inventory and Amap B024F057H0; not surveyed rock positions',[news+'gtx/2015-05/28/content_1312805.html','https://ditu.amap.com/place/B024F057H0'],positionClass='approximate',accuracy='区域定位 / 岩群近似 · 单体石景暂缺')
add('aoqian','澳前渔港',point(nodes['10581560550']),'东岸','harbour',[700,250,600],[160,80,160],'澳前岸线与映射道路组成的渔港区域，与自然岩岸、沙滩区别呈现。当前保留地理基础；逐艘渔船、码头设施与最新港区模型暂缺。','OSM bus stop n10581560550 serves as harbour area locator, not quay survey',[six_coasts],accuracy='真实区域与映射地物 · 船舶/港区精模暂缺')
# Full landscape checklist, including gaps and off-island scope. No invented models.
inventory=[{'name':p['name'],'id':p['id'],'status':'近似建模' if p['kind'] not in ['peak','harbour','sand-spit'] else '地理基础 / 精模或动态暂缺','region':p['region'],'missing':p['accuracy']} for p in places]
inventory += [
 {'name':'北港村','id':'beigang','status':'近似石厝样板 + 真实聚落轮廓','region':'东岸','missing':'完整建筑覆盖及逐栋立面'},
 {'name':'长江澳','id':'changjiang','status':'真实沙滩/风机点位','region':'北岸','missing':'潮位、水深及风机机型'},
 {'name':'龙王头','id':'longwang','status':'真实沙滩 + 观光车近似','region':'东岸','missing':'实测观光车轨迹'},
 {'name':'坛南湾','id':'tannan','status':'真实沙滩轮廓','region':'南岸','missing':'栈道、设施及木麻黄逐株资料'},
 {'name':'北部生态廊道','id':'north-rock','status':'真实北部岬角地形/道路 + 岩岸近似','region':'北岸','missing':'玻璃栈道与观景台实测模型'},
 {'name':'君山','id':'junshan','status':'真实DEM峰位','region':'内陆','missing':'高分辨率裸地高程与植被调查'},
 {'name':'大福湾','status':'暂缺精细资料','region':'南岸','missing':'桥梁和海湾准确设施坐标；不能将住宿POI当桥位置'},
 {'name':'沙地底','status':'暂缺精细资料','region':'北岸','missing':'沙丘范围、层理及最新地形；目前保留影像/DEM'},
 {'name':'海坛古城','status':'暂缺精细资料','region':'内陆','missing':'建筑轮廓、立面与设施；目前保留影像/映射地物'},
 {'name':'海坛天神（塘屿岛）','status':'主岛范围外','region':'离岛','missing':'不可挪到海坛岛；本项目未加载塘屿岛完整数据'},
 {'name':'通天门（大练岛）','status':'主岛范围外','region':'离岛','missing':'不冒充主岛景点；缺完整离岛模型'},
]
for p in places:p['lonLat']=[round(float(q),7) for q in geographic(p['x'],p['z'])]
out={'version':1,'unit':'metre','projection':'EPSG:32650','policy':'Source coastline/footprints unchanged; named landforms have explicitly approximate centres and mesh shapes; no precision claim from decimal coordinates. Amap pages used only to corroborate regions, no proprietary map tiles copied.','places':places,'inventory':inventory,'references':[six_coasts,geo_news,mirror_news,news+'gtx/2015-05/28/content_1312805.html','https://fdi.swt.fujian.gov.cn/uploadfiles/file/20211224/1640334628880911.pdf']}
(B/'public/data/landmarks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
sources=json.loads((B/'public/data/sources.json').read_text(encoding='utf8'))
sources['sceneStatus']='Real geographic terrain, 15 viewing destinations and explicitly approximate landmark meshes; not a complete photogrammetric reconstruction.'
sources['coordinateSystem']['scale']='UTM grid metres, no DEM elevation exaggeration; classified well/cave detail replaces the coarse local surface, not a measured elevation correction.'
sources['coordinateSystem']['vertical']='Visual sea Y=0; original Skadi composite retained. Coast taper and local reference-model well/cave floors are visual approximations; source vertical datum not independently certified.'
sources['sources']=[s for s in sources['sources'] if s['id']!='landscapes']
sources['sources'].append({'id':'landscapes','title':'Pingtan official landscape inventory and photographic reference facts','license':'Reference facts only; copyrighted photographs not redistributed; procedural code AGPL-3.0; OSM outlines ODbL 1.0','url':six_coasts,'additionalUrls':out['references'],'classification':'参考照片近似建模 / 暂缺地貌测绘','precision':'No survey accuracy for model centres or mesh surfaces. Official rounded dimensions: well ~50m diameter/~43m depth, pillars ~33m/~17m.','use':'OSM source reef/islet/beach footprints; photo-based cave/well/pillar/rock appearance. Cave-mouth and well-centre anchors are approximate regional locators; no commercial map tiles or reference photographs redistributed.'})
(B/'public/data/sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'additionalDestinations':len(places),'inventoryEntries':len(inventory),'sourceReefVertices':len(sp_ring),'houyanVertices':len(monkey)},indent=2))
