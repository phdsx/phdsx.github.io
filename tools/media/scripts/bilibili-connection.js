(function () {
  const isFile = location.protocol === 'file:';
  const text = (zh, en) => window.PHDSXI18n?.getLanguage() === 'en' ? en : zh;
  const fileMessage = () => text('当前通过本地文件打开，无法连接视频解析服务。请先启动本地服务，再点击下方「打开本地工具」。', 'This page was opened as a local file and cannot reach the video API. Start the local server, then select Open local tool below.');
  window.PHDSXVideoConnection = {
    isFile,
    errorMessage(error) {
      if (isFile) return fileMessage();
      if (error?.name === 'TypeError' || /failed to fetch|fetch failed|networkerror|load failed/i.test(error?.message || '')) {
        return text('无法连接解析服务，请确认本地服务仍在运行并刷新页面。线上站点需同时部署视频解析 Worker；仅上传静态页面无法解析视频。', 'Cannot connect to the video API. Check that the local server is running and refresh. Hosted sites must deploy the video API Worker alongside the static pages.');
      }
      return error?.message || text('解析失败，请稍后重试。', 'Parsing failed. Please retry later.');
    }
  };
  if (!isFile) return;
  // Classic scripts also run for file:// pages, where browsers block ESM loading.
  document.getElementById('file-mode-help').hidden = false;
  const status = document.getElementById('parse-status');
  status.textContent = fileMessage();
  status.dataset.error = 'true';
  for (const id of ['parse-button', 'paste-button', 'video-url', 'sessdata', 'clear-login', 'qr-login-button', 'platform-cookie']) document.getElementById(id).disabled = true;
  document.getElementById('parse-form').addEventListener('submit', event => event.preventDefault());
}());
