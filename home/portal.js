(() => {
  const cards = [...document.querySelectorAll('[data-home-section]')];
  const input = document.querySelector('#section-search');
  if (!cards.length || !input) return;
  const filters = [...document.querySelectorAll('[data-home-filter]')];
  const resetButtons = [...document.querySelectorAll('[data-home-reset]')];
  const results = document.querySelector('[data-home-results]');
  const empty = document.querySelector('[data-home-empty]');
  const normalize = (value) => value.normalize('NFKC').trim().toLocaleLowerCase();
  const entries = cards.map((card) => ({ card, category: card.dataset.homeSection, text: normalize(`${card.textContent} ${card.dataset.keywords || ''}`) }));
  let activeCategory = 'all';

  function render() {
    const terms = normalize(input.value).split(/\s+/).filter(Boolean);
    const matching = entries.filter((entry) => terms.every((term) => entry.text.includes(term)));
    const matchingSet = new Set(matching);
    let shown = 0;
    for (const entry of entries) {
      const visible = matchingSet.has(entry) && (activeCategory === 'all' || activeCategory === entry.category);
      entry.card.hidden = !visible;
      if (visible) shown++;
    }
    for (const button of filters) {
      const category = button.dataset.homeFilter;
      button.setAttribute('aria-pressed', String(activeCategory === category));
      button.querySelector('[data-home-count]').textContent = String(matching.filter((entry) => category === 'all' || entry.category === category).length);
    }
    results.textContent = terms.length || activeCategory !== 'all' ? `找到 ${shown} 个栏目，共 ${cards.length} 个` : `全部 ${cards.length} 个栏目`;
    empty.hidden = shown > 0;
    resetButtons[0].hidden = !terms.length && activeCategory === 'all';
  }

  filters.forEach((button) => button.addEventListener('click', () => {
    activeCategory = button.dataset.homeFilter;
    render();
  }));
  input.addEventListener('input', render);
  resetButtons.forEach((button) => button.addEventListener('click', () => {
    input.value = '';
    activeCategory = 'all';
    render();
    input.focus({ preventScroll: true });
  }));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      input.value = '';
      render();
    }
  });
  input.closest('form').addEventListener('submit', (event) => {
    event.preventDefault();
    cards.find((card) => !card.hidden)?.focus();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
  document.querySelectorAll('[data-home-controls]').forEach((element) => { element.hidden = false; });
  render();
})();
