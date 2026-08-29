(function loadCanonicalCatalog() {
  if (Array.isArray(window.PHDSX_SEARCH_INDEX)) return;
  const current = document.currentScript;
  const script = document.createElement('script');
  script.src = new URL('catalog.js', current && current.src ? current.src : location.href).href;
  document.head.appendChild(script);
}());
