import sys,pathlib,json,hashlib,math,struct
W=pathlib.Path(__file__).resolve().parent;sys.path.insert(0,str(W/'pylibs'))
from playwright.sync_api import sync_playwright
O=W.parent;V=O/'validation'
result={}
meta=json.loads((O/'assets'/'geo'/'scene.json').read_text(encoding='utf8'))
raw=(O/'assets'/'geo'/'height.f32').read_bytes();vals=struct.unpack('<'+'f'*(len(raw)//4),raw)
assert len(vals)==meta['grid']['nx']*meta['grid']['nz'] and all(math.isfinite(v) for v in vals)
checks=[]
for t in json.loads((O/'assets'/'texture-manifest.json').read_text()):
 f=O/'assets'/'textures'/f"{t['asset']}_{t['channel']}.jpg"
 assert f.is_file();actual=hashlib.md5(f.read_bytes()).hexdigest();assert actual==t['md5'];checks.append(f.name)
result['data']={'finiteHeights':len(vals),'textureMd5Matches':len(checks),'boundaryClosed':meta['park']['points'][0]==meta['park']['points'][-1],'roads':len(meta['roads']),'roadsWithMeasuredWidthTags':sum(r['widthEvidence']=='osm' for r in meta['roads']),'scale':meta['verticalExaggeration']}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True,args=['--enable-webgl','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1100,'height':760});remote=[]
 def routing(route):
  if not route.request.url.startswith('http://127.0.0.1:8000'):
   remote.append(route.request.url);route.abort()
  else:route.continue_()
 page.route('**/*',routing);page.goto('http://127.0.0.1:8000/');page.wait_for_function('window.sceneReady===true',timeout=60000);page.locator('#loading').wait_for(state='hidden',timeout=10000)
 a=page.evaluate('window.xiangshan.getState().camera');page.mouse.move(550,330);page.mouse.down();page.mouse.move(660,340,steps=8);page.mouse.up();page.wait_for_timeout(700);bpos=page.evaluate('window.xiangshan.getState().camera');assert math.dist(a,bpos)>1
 page.mouse.wheel(0,-180);page.wait_for_timeout(700);c=page.evaluate('window.xiangshan.getState().camera');assert math.dist(c,bpos)>1
 result['orbitDragAndZoom']=True
 # Smooth transition was exercised in the main browser run; check every preset's final surface clearance.
 result['landmarkPresets']=[]
 for key in ['east','hall','lake','villa','peak']:
  q=page.evaluate('''key=>{const v=window.xiangshan;v.flyTo(key,0);const p=v.camera.position;return {key,position:p.toArray(),clearance:p.y-v.geo.height(p.x,p.z)}}''',key)
  print('Preset',q,flush=True);assert q['clearance']>=1.6;result['landmarkPresets'].append(q)
 page.evaluate("window.xiangshan.flyTo('east',0)");page.locator('#walk').click();before=page.evaluate('window.xiangshan.getState().camera');east=next(q for q in meta['landmarks'] if q['key']=='east');assert math.hypot(before[0]-east['x'],before[2]-east['z'])<15
 page.keyboard.down('KeyW');page.wait_for_timeout(1700);page.keyboard.up('KeyW');after=page.evaluate('window.xiangshan.getState().camera');result['walkingFromEast']={'startDistanceToEastM':math.hypot(before[0]-east['x'],before[2]-east['z']),'travelledM':math.dist(before,after)};assert result['walkingFromEast']['travelledM']>.2
 ground=page.evaluate('''()=>{let v=window.xiangshan,p=v.camera.position;return {eyeHeight:p.y-v.geo.walkY(p.x,p.z),distanceToRoad:v.geo.nearestRoad(p.x,p.z).d}}''');result['walkSurface']=ground
 # Current-frame rate sampling avoids averaging previous viewpoints into a new quality tier.
 page.locator('#home').click();page.wait_for_function('!window.xiangshan.getState().flying',timeout=45000);page.wait_for_timeout(700);page.locator('#quality').click();page.wait_for_timeout(1200)
 result['lowQualityDedicatedSample']=page.evaluate('''()=>new Promise(resolve=>{let times=[],start=performance.now(),last=start;function tick(t){times.push(t-last);last=t;if(t-start<4500)requestAnimationFrame(tick);else {times=times.slice(1);resolve({fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),samples:times.length,state:window.xiangshan.getState()});}}requestAnimationFrame(tick);})''')
 result['blockedRemoteRequests']=remote;assert not remote;page.close()
 # Real touch input in a Chromium mobile viewport.
 ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);mobile=ctx.new_page();mobile.goto('http://127.0.0.1:8000/');mobile.wait_for_function('window.sceneReady===true',timeout=60000);mobile.locator('[data-poi="hall"]').tap();mobile.wait_for_function('!window.xiangshan.getState().flying',timeout=45000);mobile.wait_for_timeout(700);assert mobile.locator('#location-name').inner_text()=='勤政殿';mobile.locator('#info').tap();assert mobile.locator('#data-dialog').is_visible();mobile.locator('#close-info').tap();assert not mobile.locator('#data-dialog').is_visible();result['touchPoiAndDialog']=True;ctx.close()
 fail=b.new_page();fail.route('**/height.f32',lambda r:r.fulfill(status=404,body='Intentional QA missing-file test'));fail.goto('http://127.0.0.1:8000/');fail.wait_for_function("!document.getElementById('load-error').hidden",timeout=20000);result['missingCoreAssetMessage']=fail.locator('#load-error').inner_text();assert 'height.f32' in result['missingCoreAssetMessage'];fail.screenshot(path=str(V/'06-error-state.png'));fail.close();b.close()
(V/'acceptance-extra.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False),flush=True)
