// Local host lifecycle bridge; gameplay remains in the shipped Construct runtime.
runOnStartup(async runtime=>{
 globalThis.PenaltyOriginalRuntime=runtime;
 runtime.addEventListener('afterprojectstart',()=>{globalThis.PenaltyGameReady=true;document.getElementById('loading-status')?.remove();parent.postMessage({type:'phdsx-penalty-ready'},location.origin);});
});
addEventListener('error',e=>{parent.postMessage({type:'phdsx-penalty-error',message:String(e.message||'载入失败')},location.origin);});
