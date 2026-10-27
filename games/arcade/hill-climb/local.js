/* Native engine adapter. Game simulation, art, audio and GUI run in Defold. */
(() => {
  const $ = id => document.getElementById(id);
  const error = () => { $('loading').hidden = true; $('load-error').hidden = false; };
  // Native imports retain their original ABI; no third-party SDK is fetched.
  window.PokiSDK = Object.freeze({ init: () => Promise.resolve(), gameplayStart() {}, gameplayStop() {},
    gameLoadingFinished() {}, gameLoadingStart() {}, gameLoadingProgress() {}, setDebug() {},
    captureError() {}, measure() {}, getURLParam: key => key === 'iso_lang' ? 'zh' : '',
    commercialBreak: () => Promise.resolve(),
    rewardedBreak: options => { options?.onStart?.(); return Promise.resolve(true); },
    shareableURL: () => Promise.resolve(location.href) });
  CUSTOM_PARAMETERS.archive_location_filter = path => 'runtime/archive' + path;
  CUSTOM_PARAMETERS.resize_window_callback = () => {
    const box = $('canvas-container').getBoundingClientRect(), dpi = Math.min(devicePixelRatio || 1, 2);
    $('canvas').width = Math.floor(box.width * dpi); $('canvas').height = Math.floor(box.height * dpi);
  };
  CUSTOM_PARAMETERS.update_progress = value => { $('loading-progress').value = value; $('loading-text').textContent = `正在加载 ${Math.floor(value)}%`; };
  CUSTOM_PARAMETERS.unsupported_webgl_callback = () => { $('loading').hidden = true; $('webgl-not-supported').hidden = false; };
  CUSTOM_PARAMETERS.start_success = () => { $('loading').hidden = true; window.HCR_LOCAL_READY = true; };
  CUSTOM_PARAMETERS.start_error = error;
  CUSTOM_PARAMETERS.can_not_download_file_callback = error;
  CUSTOM_PARAMETERS.retry_count = 2;
  Module.print = (...values) => { if (new URLSearchParams(location.search).has('debug')) console.log(...values); };
  Module.printErr = (...values) => console.error(...values);
  const observer = new ResizeObserver(() => CUSTOM_PARAMETERS.resize_window_callback()); observer.observe($('canvas-container'));
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.body.requestFullscreen(); }
    catch { $('fullscreen').title = '当前浏览器不支持全屏，横屏体验更好'; }
  });
  $('retry').addEventListener('click', () => location.reload());
  for (const event of ['blur', 'pagehide']) window.addEventListener(event, () => {
    for (const [key, keyCode] of [['ArrowLeft',37], ['ArrowRight',39], ['KeyA',65], ['KeyD',68]]) window.dispatchEvent(new KeyboardEvent('keyup', { code: key, key: key.startsWith('Key') ? key.slice(3).toLowerCase() : key, keyCode, which:keyCode, bubbles:true }));
    if (window.HCR_LOCAL_PHASE === 'driving') window.HCR_LOCAL_COMMAND = 'pause';
    if (typeof Module.persistentSync === 'function') Module.persistentSync();
  });
  EngineLoader.load('canvas', 'runtime/HCRLite');
})();
