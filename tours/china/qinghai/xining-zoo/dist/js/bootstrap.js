const tasks=[['./assets/vendor/three.core.js','Three.js 核心'],['./assets/vendor/three.module.js','Three.js 渲染器'],['./assets/vendor/OrbitControls.js','鸟瞰控制'],['./assets/data/layout.json','园区地图'],['./assets/data/terrain.json','地形高程'],['./assets/vendor/BufferGeometryUtils.js','几何合批模块'],['./js/main.js','场景模块'],['./js/spatial.js','导航模块'],['./js/surfaces.js','地形贴合模块']];
const state=tasks.map(()=>({loaded:0,total:0,done:false}));
const $=id=>document.getElementById(id);
function update(){const done=state.filter(t=>t.done).length;const allKnown=state.every(t=>t.total>0);$('load-progress').value=allKnown?state.reduce((s,t)=>s+t.loaded,0)/state.reduce((s,t)=>s+t.total,0)*90:done/tasks.length*90;$('load-counter').textContent=`${done} / ${tasks.length} 项核心资源 · ${(state.reduce((s,t)=>s+t.loaded,0)/1024/1024).toFixed(2)} MB`}
try{
 const responses=await Promise.all(tasks.map(async([url,name],i)=>{
  const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),20000);
  try{const response=await fetch(url,{signal:abort.signal});if(!response.ok)throw Error(`${name}：HTTP ${response.status}`);state[i].total=Number(response.headers.get('content-length'))||0;const chunks=[];const reader=response.body.getReader();while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);state[i].loaded+=value.length;$('load-status').textContent=`载入${name}`;update()}state[i].done=true;update();return new TextDecoder().decode(await new Blob(chunks).arrayBuffer());}finally{clearTimeout(timeout)}
 }));
 $('load-status').textContent='构建米制地形与地图图层';
 const {start}=await import('./main.js');await start(JSON.parse(responses[3]),JSON.parse(responses[4]));
 $('load-progress').value=100;$('loading').classList.add('hidden');
}catch(error){console.error(error);$('load-status').textContent='园区未完成载入';$('load-error').classList.remove('hidden');document.querySelector('#load-error p').textContent=`${error.message}。请检查文件是否完整，并通过本地 HTTP 服务运行项目。`;window.__loadError=error.message;}
