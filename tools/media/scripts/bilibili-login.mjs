export function initBilibiliLogin({api,t,onSessionChange,onStateChange}) {
  const $ = id => document.getElementById(id);
  let timer=null,requestController=null,generation=0,expiresAt=0,busy=false,loggedIn=false,checking=false,polling=false,renewTimer=null,renewRequest=null;
  const panel = $('qr-login-panel');
  const message = (value,state) => { $('qr-login-status').textContent=value; if (state) panel.dataset.state=state; };
  function stop() {generation++;clearTimeout(timer);timer=null;requestController?.abort();requestController=null;expiresAt=0;polling=false;}
  function controls() {$('qr-login-button').disabled=busy||checking;$('qr-refresh-button').disabled=busy||checking;$('logout-button').disabled=busy||checking;}
  function showUser(data) {
    loggedIn=Boolean(data.loggedIn);
    $('qr-login-button').hidden=loggedIn;
    $('logout-button').hidden=!loggedIn;
    $('login-status').textContent=loggedIn ? t(`B站 · 已扫码登录：${data.user.name}${data.user.vip?' · 大会员':''}`,`Bilibili · QR signed in: ${data.user.name}${data.user.vip?' · Premium':''}`) : t('B站扫码状态：未登录','Bilibili QR status: signed out');
    onStateChange?.({platform:'bilibili',...data});
    scheduleRenewal();
  }
  async function call(action,signal) {
    const response=await fetch(new URL('auth/'+action,api),{method:action==='status'?'GET':'POST',credentials:'same-origin',cache:'no-store',...(action==='status'?{}:{headers:{'Content-Type':'application/json'},body:'{}'}),signal:signal || AbortSignal.timeout(18000)});
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(t('扫码登录服务未连接，请确认本站数据服务已启动。','QR login API unavailable. Check that the site data service is running.'));
    const data=await response.json();
    if (!response.ok) throw new Error(data.message||t('扫码登录失败，请稍后重试。','QR login failed. Please retry.'));
    return data;
  }
  const failure = error => window.PHDSXVideoConnection?.errorMessage(error)||error.message;
  async function refreshStatus() {
    const ticket=generation;
    try {const data=await call('status');if(ticket===generation)showUser(data);}
    catch(error) {if(ticket===generation)$('login-status').textContent=failure(error);}
  }
  function scheduleRenewal(delay=15*60000){clearTimeout(renewTimer);renewTimer=null;if(loggedIn)renewTimer=setTimeout(keepAlive,delay);}
  function keepAlive(){
    if(!loggedIn||checking||renewRequest)return;
    clearTimeout(renewTimer);renewTimer=null;
    const ticket=generation;
    renewRequest=(async()=>{
      try{const data=await call('renew');if(ticket===generation)showUser(data);}
      catch{if(ticket===generation&&loggedIn){$('login-status').textContent=t('B站会话已保留，暂时无法验证，稍后自动重试。','Bilibili session retained. Verification is temporarily unavailable; retrying shortly.');scheduleRenewal(60000);}}
    })().finally(()=>{renewRequest=null;});
    return renewRequest;
  }
  async function poll(ticket) {
    if(ticket!==generation||panel.hidden||document.hidden||polling)return;
    if(Date.now()>=expiresAt){message(t('二维码已过期，请刷新后重新扫码。','QR code expired. Refresh to scan again.'),'expired');return;}
    polling=true;requestController=new AbortController();
    try {
      const data=await call('poll',AbortSignal.any([requestController.signal,AbortSignal.timeout(18000)]));
      if(ticket!==generation)return;
      if(data.state==='logged_in') {
        stop();panel.hidden=true;$('qr-code').replaceChildren();showUser(data);
        $('sessdata').value='';
        onSessionChange(true);return;
      }
      if(data.state==='expired'){message(t('二维码已过期，请刷新后重新扫码。','QR code expired. Refresh to scan again.'),'expired');return;}
      message(data.state==='scanned' ? t('扫码成功，请在手机上确认登录。','Scanned. Confirm sign-in on your phone.') : t('请使用 B站 App 扫描二维码。','Scan this QR code with the Bilibili app.'),data.state);
      timer=setTimeout(()=>poll(ticket),3000);
    } catch(error) {if(ticket===generation)message(failure(error),'error');}
    finally {if(ticket===generation)polling=false;}
  }
  async function generate() {
    if(busy||checking)return;
    stop();const ticket=generation;checking=true;controls();
    panel.hidden=false;panel.dataset.state='loading';$('qr-code').replaceChildren();
    message(t('正在生成二维码…','Generating QR code…'),'loading');
    requestController=new AbortController();
    try {
      if(typeof window.QRCode!=='function')throw new Error(t('二维码组件加载失败，请刷新页面。','QR renderer unavailable. Refresh the page.'));
      const data=await call('qrcode',AbortSignal.any([requestController.signal,AbortSignal.timeout(18000)]));
      if(ticket!==generation)return;
      expiresAt=data.expiresAt;
      new window.QRCode($('qr-code'),{text:data.url,width:192,height:192,correctLevel:window.QRCode.CorrectLevel.M});
      // The renderer puts the QR URL in title by default; keep it out of tooltips.
      $('qr-code').removeAttribute('title');
      message(t('请使用 B站 App 扫描二维码。','Scan this QR code with the Bilibili app.'),'waiting');
      timer=setTimeout(()=>poll(ticket),3000);
    } catch(error) {if(ticket===generation)message(failure(error),'error');}
    finally {if(ticket===generation){checking=false;controls();}}
  }
  async function cancel() {
    stop();checking=false;controls();panel.hidden=true;$('qr-code').replaceChildren();
    try {await call('cancel');} catch { /* No further polling; the remote challenge expires shortly. */ }
  }
  $('qr-login-button').addEventListener('click',generate);
  $('qr-refresh-button').addEventListener('click',generate);
  $('qr-cancel-button').addEventListener('click',cancel);
  $('logout-button').addEventListener('click',async()=>{
    if(busy||checking)return;
    stop();checking=true;controls();
    try {clearTimeout(renewTimer);await renewRequest;await call('logout');showUser({loggedIn:false});panel.hidden=true;$('sessdata').value='';onSessionChange(false);}
    catch(error){$('login-status').textContent=failure(error);}
    finally{checking=false;controls();}
  });
  document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden){if(!panel.hidden&&expiresAt&&!checking)poll(generation);if(loggedIn)keepAlive();}});
  window.addEventListener('pagehide',()=>{stop();clearTimeout(renewTimer);renewTimer=null;});
  window.addEventListener('pageshow',event=>{if(event.persisted){panel.hidden=true;checking=false;controls();refreshStatus();}});
  refreshStatus();
  return {setBusy(value){busy=value;controls();},refreshStatus};
}
