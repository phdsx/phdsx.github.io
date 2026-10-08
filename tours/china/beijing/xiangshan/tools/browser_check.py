import sys,pathlib,json,time
W=pathlib.Path(__file__).resolve().parent;sys.path.insert(0,str(W/'pylibs'))
from playwright.sync_api import sync_playwright
O=W.parent;V=O/'validation';V.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True,args=['--enable-webgl','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.on('response',lambda r:requests.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 page.goto('http://127.0.0.1:8000/',wait_until='networkidle',timeout=60000)
 try:page.wait_for_function('window.sceneReady === true',timeout=90000)
 except Exception as e:
  print('Not ready',str(e));page.screenshot(path=str(V/'load-error.png'));print(errors);print(page.locator('#load-error').inner_text());b.close();raise
 page.wait_for_timeout(5000);page.screenshot(path=str(V/'01-overview.png'))
 result={'browser':b.version,'overview':page.evaluate('window.xiangshan.getState()'),'consoleErrors':errors,'httpErrors':requests}
 print(json.dumps(result,ensure_ascii=False),flush=True)
 page.get_by_role('button',name='02 勤政殿',exact=True).click();page.wait_for_function('!window.xiangshan.getState().flying',timeout=45000);page.wait_for_timeout(1500);page.screenshot(path=str(V/'02-qinzheng.png'));result['hall']=page.evaluate('window.xiangshan.getState()')
 page.get_by_role('button',name='03 静翠湖',exact=True).click();page.wait_for_function('!window.xiangshan.getState().flying',timeout=45000);page.wait_for_timeout(1500);page.screenshot(path=str(V/'03-jingcui.png'))
 page.get_by_role('button',name='01 东门',exact=True).click();page.wait_for_function('!window.xiangshan.getState().flying',timeout=45000);page.wait_for_timeout(700);page.locator('#walk').click();page.wait_for_timeout(700);before=page.evaluate('window.xiangshan.getState()');page.keyboard.down('KeyW');page.wait_for_timeout(2200);page.keyboard.up('KeyW');after=page.evaluate('window.xiangshan.getState()');result['walk']={'before':before,'after':after};page.screenshot(path=str(V/'04-walking.png'))
 page.locator('#orbit').click();page.locator('#home').click();page.wait_for_function('!window.xiangshan.getState().flying',timeout=45000);page.wait_for_timeout(700);page.locator('#route').click();page.locator('#quality').click();page.wait_for_timeout(2000);result['lowQuality']=page.evaluate('window.xiangshan.getState()')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(1000);page.screenshot(path=str(V/'05-mobile.png'));result['mobile']=page.evaluate('window.xiangshan.getState()');page.locator('[data-poi="peak"]').click();page.wait_for_function('!window.xiangshan.getState().flying',timeout=45000);page.wait_for_timeout(700);result['mobileJump']=page.evaluate('window.xiangshan.getState()');page.locator('#info').click();result['dialogVisible']=page.locator('#data-dialog').is_visible();page.locator('#close-info').click()
 gpu=page.evaluate('''()=>{const gl=document.getElementById('scene').getContext('webgl2');const e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:e?gl.getParameter(e.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)}}''');result['gpu']=gpu;result['consoleErrors']=errors;result['httpErrors']=requests
 (V/'browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False),flush=True);b.close()
