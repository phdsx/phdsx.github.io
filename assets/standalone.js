(function () {
  if (document.querySelector('.phdsx-dock')) return;

  const script = document.currentScript;
  const home = script && script.dataset.home ? script.dataset.home : 'index.html';
  const returnUrl = script && script.dataset.return ? script.dataset.return : home;
  const returnLabel = script && script.dataset.returnLabel ? script.dataset.returnLabel : '返回';
  const title = document.title.replace(/\s*-\s*PHDSX\s*$/i, '') || '功能页面';
  const dock = document.createElement('nav');
  dock.className = 'phdsx-dock';
  dock.setAttribute('aria-label', 'PHDSX 快速导航');
  dock.innerHTML = '<a href="' + home + '">PHDSX</a>' +
    '<a class="phdsx-dock__label" href="' + home + '">' + escapeHtml(title) + '</a>' +
    '<a href="' + returnUrl + '">' + escapeHtml(returnLabel) + '</a>';
  document.body.appendChild(dock);

  function escapeHtml(value) {
    const span = document.createElement('span');
    span.textContent = value;
    return span.innerHTML;
  }
}());
