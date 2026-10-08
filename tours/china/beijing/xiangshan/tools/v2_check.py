import sys,pathlib,json,math
W=pathlib.Path(__file__).resolve().parent;sys.path.insert(0,str(W/'pylibs'))
from playwright.sync_api import sync_playwright
O=W.parent;V=O/'validation'
result={'version':'2','date':'2026-10-04','checks':{}}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True,args=['--enable-webgl','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto('http://127.0.0.1:8000/');page.wait_for_function('window.sceneReady===true',timeout=90000);page.locator('#loading').wait_for(state='hidden',timeout=10000)
 page.evaluate("window.xiangshan.flyTo('hall',0)");page.wait_for_timeout(1500)
 page.screenshot(path=str(V/'02-qinzheng.png'))
 print('Hall loaded',flush=True)
 result['checks']['masonrySurface']=page.evaluate('''async()=>{
  const THREE=await import('/assets/vendor/three.module.js');const v=window.xiangshan,g=v.geo,c=g.courtyard;
  const hall=v.scene.children.find(o=>o.name.startsWith('Qinzheng Hall'));
  const ray=new THREE.Raycaster(),errors=[],samples=[];
  const test=(u,z,type)=>{const [x,y]=g.hallWorld(u,z),expected=g.walkY(x,y);ray.set(new THREE.Vector3(x,400,y),new THREE.Vector3(0,-1,0));const hits=ray.intersectObject(hall,true);const actual=hits[0]?.point.y??null;const difference=actual===null?999:Math.abs(actual-expected);samples.push({type,u,v:z,expected,actual,difference});if(difference>.006)errors.push(samples.at(-1));};
  for(let i=0;i<=24;i++)test(0,c.bridgeStart+(c.bridgeEnd-c.bridgeStart)*i/24,'bridge');
  for(const u of [-8,8])for(const z of [17,19,31])test(u,z,'paving');
  for(let i=0;i<10;i++)test(7,14-i*.35,'step');
  const waterPoint=g.hallWorld(6,(c.bridgeStart+c.bridgeEnd)/2);
  return {sampleCount:samples.length,maxDifference:Math.max(...samples.map(s=>s.difference)),errors,waterOutsideBridgeBlocked:!g.canWalk(...waterPoint),bridgeAccessible:g.canWalk(...g.hallWorld(0,(c.bridgeStart+c.bridgeEnd)/2)),profile:c};
 }''')
 assert not result['checks']['masonrySurface']['errors'],result['checks']['masonrySurface']
 assert result['checks']['masonrySurface']['waterOutsideBridgeBlocked']
 assert result['checks']['masonrySurface']['bridgeAccessible']
 # Stable camera must stop expensive reflection renders, but moving it must refresh.
 page.wait_for_timeout(1500);s0=page.evaluate('window.xiangshan.water.getState()');page.wait_for_timeout(1000);s1=page.evaluate('window.xiangshan.water.getState()')
 assert s1['reflectionActive']==625875864 and s1['reflectionUpdates']==s0['reflectionUpdates']
 page.evaluate('window.xiangshan.camera.position.x+=.3');page.wait_for_timeout(700);s2=page.evaluate('window.xiangshan.water.getState()');assert s2['reflectionUpdates']>s1['reflectionUpdates']
 page.locator('#quality').click();page.wait_for_timeout(300);low=page.evaluate('window.xiangshan.water.getState()');assert low['reflectionActive'] is None
 page.locator('#quality').click();page.evaluate("window.xiangshan.flyTo('lake',0)");page.wait_for_timeout(1500)
 lake=page.evaluate('window.xiangshan.water.getState()');assert lake['reflectionActive']==605775489
 page.screenshot(path=str(V/'03-jingcui.png'))
 result['checks']['reflections']={'hall':s0,'stationary':s1,'moved':s2,'low':low,'lake':lake}
 # Dedicated close view of the photo-guided bridge, independent of default preset.
 page.evaluate('''()=>{const v=window.xiangshan,g=v.geo;v.flyTo('hall',0);const a=g.hallWorld(-8,37),b=g.hallWorld(0,19);v.camera.position.set(a[0],g.courtyard.deckY+4.5,a[1]);v.controls.target.set(b[0],g.hallBase+1.3,b[1]);v.controls.update();}''')
 page.wait_for_timeout(700);page.screenshot(path=str(V/'07-bridge-detail.png'))
 # Walk physically across the bridge using real keyboard / mouse events.
 page.locator('#walk').click()
 data=page.evaluate('''()=>{const v=window.xiangshan,g=v.geo,c=g.courtyard,a=g.hallWorld(0,c.bridgeStart-.4);v.camera.position.set(a[0],g.walkY(...a)+1.68,a[1]);return {currentYaw:-v.camera.rotation.y,targetYaw:Math.PI-g.hallAngle,startV:c.bridgeStart,endV:c.bridgeEnd};}''')
 delta=(data['targetYaw']-data['currentYaw']+math.pi)%(math.pi*2)-math.pi
 page.mouse.move(700,350);page.mouse.down();page.mouse.move(700+delta/.003,350,steps=4);page.mouse.up()
 page.keyboard.down('KeyW');page.keyboard.down('ShiftLeft');page.wait_for_timeout(3600);page.keyboard.up('KeyW');page.keyboard.up('ShiftLeft');page.wait_for_timeout(300)
 walk=page.evaluate('''()=>{const v=window.xiangshan,p=v.camera.position,g=v.geo;return {local:g.hallLocal(p.x,p.z),eye:p.y-g.walkY(p.x,p.z),position:p.toArray()};}''')
 assert abs(walk['local'][0])<.1 and walk['local'][1]>data['endV'],walk
 result['checks']['bridgeKeyboardWalk']=walk
 result['consoleErrors']=errors;assert not errors,errors
 b.close()
(V/'v2-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False),flush=True)
