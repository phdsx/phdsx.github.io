(() => {
  const country = document.querySelector('#tour-country');
  const region = document.querySelector('#tour-region');
  const search = document.querySelector('#tour-search');
  const groups = [...document.querySelectorAll('.tour-country-group')];
  const cards = [...document.querySelectorAll('[data-tour]')];
  const status = document.querySelector('#tour-status');
  const empty = document.querySelector('#tour-empty');
  const form = document.querySelector('.tours-filters');
  const i18n = window.PHDSXI18n;
  const readLocation = () => {
    const route = window.PHDSXNavigation.resolve('tours.html', location.search);
    country.value = route.country || '';
    region.value = route.region || '';
    search.value = new URLSearchParams(location.search).get('q') || '';
    region.disabled = !country.value;
  };
  const filter = () => {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    cards.forEach(card => {
      const parent = card.closest('.tour-country-group');
      const area = card.closest('.tour-region-group');
      const visible = (!country.value || parent.dataset.country === country.value)
        && (!region.value || area.dataset.region === region.value)
        && (!query || card.dataset.keywords.toLowerCase().includes(query));
      card.hidden = !visible;
      if (visible) count++;
    });
    groups.forEach(group => {
      group.querySelectorAll('.tour-region-group').forEach(area => { area.hidden = !area.querySelector('[data-tour]:not([hidden])'); });
      group.hidden = !group.querySelector('[data-tour]:not([hidden])');
    });
    status.textContent = i18n.t('tours.count', '', {count});
    empty.hidden = count !== 0;
  };
  const saveLocation = (push) => {
    const next = new URL(location.href);
    for (const [key,value] of [['country',country.value],['region',region.value],['q',search.value.trim()]]) {
      if (value) next.searchParams.set(key,value); else next.searchParams.delete(key);
    }
    if (next.href !== location.href) history[push ? 'pushState' : 'replaceState'](null,'',next);
    window.dispatchEvent(new Event('phdsx:location'));
    filter();
  };
  country.addEventListener('change', () => { region.value = ''; region.disabled = !country.value; saveLocation(true); });
  region.addEventListener('change', () => saveLocation(true));
  search.addEventListener('input', () => saveLocation(false));
  form.addEventListener('submit', event => { event.preventDefault(); saveLocation(false); });
  document.querySelector('#tour-reset').addEventListener('click', () => {
    country.value = region.value = search.value = ''; region.disabled = true; saveLocation(true); search.focus();
  });
  window.addEventListener('popstate', () => { readLocation(); filter(); });
  i18n.onChange(filter);
  readLocation(); filter(); form.hidden = false;
})();
