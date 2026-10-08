import {chromium} from 'playwright';
import fs from 'node:fs';
const executable=process.env.PALACE_CHROME||'C:/Users/YUE/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const browser=await chromium.launch({headless:true,...(fs.existsSync(executable)?{executablePath:executable}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.PALACE_URL||'http://127.0.0.1:5178/');await page.waitForFunction(()=>window.__palace?.ready);
 const facts=await page.evaluate(()=>{const p=window.__palace,ids=['jingren','chengqian','yonghe','zhongcui','jingyang','yongshou','yikun','chuxiu','taiji','changchun','xianfu'];return{side:ids.map(id=>{const b=p.building.models.find(b=>b.id===id);return b&&{id:b.id,name:b.name,x:b.x,z:b.z,roof:b.roof,bays:b.bays};}),yangxin:(()=>{const b=p.building.models.find(b=>b.id==='yangxin');return{w:b.w,d:b.d,bays:b.bays,frontPosts:b.frontPosts};})()};});
 checks.push({name:'东西六宫11座正殿独立配置与地图别名',pass:facts.side.every(Boolean)&&facts.side.find(b=>b.id==='chengqian')?.name==='承乾宫',details:facts});
 checks.push({name:'景阳/咸福三间庑殿顶；其余九座五间歇山顶',pass:facts.side.every(b=>['jingyang','xianfu'].includes(b.id)?b.roof==='hip'&&b.bays===3:b.roof==='gablehip'&&b.bays===5)});
 checks.push({name:'养心殿前殿36×12米、三间及加柱配置',pass:facts.yangxin.w===36&&facts.yangxin.d===12&&facts.yangxin.bays===3&&facts.yangxin.frontPosts===9,reference:'https://www.dpm.org.cn/explore/building/236442.html',deviation:[facts.yangxin.w-36,facts.yangxin.d-12]});
 for(const [id,file] of [['yangxin','11-yangxin'],['jingren','12-jingren'],['jingyang','13-jingyang'],['chuxiu','14-chuxiu'],['xianfu','15-xianfu']]){
  await page.locator(`[data-landmark="${id}"]`).click();await page.locator('#info .close').click();
  await page.waitForFunction(id=>window.__palace.details.cache.has(id),id);await page.waitForTimeout(250);
  await page.screenshot({path:`evidence/${file}.png`});
 }
 // Force a distance traversal to exercise actual near-detail cache eviction.
 const cache=await page.evaluate(async()=>{
  const p=window.__palace,manager=p.details,shared=new Set();let disposedShared=0;
  p.scene.traverse(o=>{if(o.isMesh&&!o.userData.ownsMaterial){for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)shared.add(m);}});
  for(const m of shared){m.addEventListener('dispose',()=>disposedShared++);m.map?.addEventListener('dispose',()=>disposedShared++);}
  const point=p.camera.clone();for(const b of manager.models){point.position.set(b.x,(b.base||0)+2,b.z);for(let n=0;n<manager.models.length;n++)await manager.update(point,'low',false);}
  return{cacheSize:manager.cache.size,disposedShared,generatedTargets:manager.models.length};
 });
 checks.push({name:'近景遍历与缓存回收不释放共享材质/纹理',pass:cache.cacheSize<=18&&cache.disposedShared===0,details:cache});
 checks.push({name:'新增模型与细部无页面异常',pass:errors.length===0,details:errors});
 const report={timestamp:new Date().toISOString(),checks,passed:checks.every(x=>x.pass)};fs.writeFileSync('evidence/refinement-tests.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
