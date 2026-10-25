export async function downloadPlatformVideo({api,sessionId,formatId,signal,writable,onProgress=()=>{}}){
  let job;
  const call=async(path,body,abort=signal)=>{
    const r=await fetch(new URL(path,api),{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:abort});
    const data=await r.json();if(!r.ok)throw new Error(data.message||'下载服务不可用。');return data;
  };
  const pause=()=>new Promise((resolve,reject)=>{signal.throwIfAborted();const abort=()=>{clearTimeout(timer);reject(signal.reason);};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},1000);signal.addEventListener('abort',abort,{once:true});});
  try{
    // Let creation return its ID even if the user cancels while it is in flight,
    // so the newly started server task can always be canceled in finally.
    job=await call('jobs',{sessionId,formatId},AbortSignal.timeout(20000));signal.throwIfAborted();
    for(;;){const data=await call('jobs/'+job.id);onProgress({stage:data.state,percent:data.progress||0});if(data.state==='ready')break;if(data.state==='error'||data.state==='canceled')throw new Error(data.message||'下载已取消。');await pause();}
    const response=await fetch(new URL('jobs/'+job.id+'/file',api),{credentials:'same-origin',signal});
    if(!response.ok)throw new Error('无法读取已下载视频，请重新下载。');
    const total=Number(response.headers.get('content-length'))||0,reader=response.body.getReader(),chunks=[];let received=0;
    for(;;){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;received+=value.byteLength;if(writable)await writable.write(value);else{if(received>400*1024*1024){await reader.cancel();throw new Error('视频超过浏览器内存下载限制，请使用桌面 Chrome / Edge 或较低清晰度。');}chunks.push(value);}onProgress({stage:'saving',percent:total?Math.round(received/total*100):0});}
    return writable?null:new Blob(chunks,{type:'video/mp4'});
  }finally{if(job)try{await call('jobs/'+job.id+(signal.aborted?'/cancel':'/release'),{},AbortSignal.timeout(10000));}catch{/* Server also expires abandoned jobs. */}}
}
