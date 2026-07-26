function normalizeText(value) {
  return (value || '').toString().trim().toLowerCase();
}
function initSiteNavigation() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav .nav-link').forEach((link) => {
    const target = new URL(link.href, location.href).pathname.split('/').pop() || 'index.html';
    const active = target === current || (current === 'blog-post.html' && target === 'blog.html');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
function initCardSearch(inputSelector, cardSelector) {
  const input = document.querySelector(inputSelector);
  if (!input) return;
  const cards = [...document.querySelectorAll(cardSelector)];
  const apply = () => {
    const query = normalizeText(input.value);
    cards.forEach((card) => {
      const keywords = normalizeText(card.dataset.keywords || card.textContent);
      card.hidden = Boolean(query && !keywords.includes(query));
    });
  };
  input.addEventListener('input', apply);
  apply();
}
function initBlogFilters() {
  const list = document.querySelector('[data-blog-list]');
  if (!list) return;
  const search = document.querySelector('[data-blog-search]');
  const sort = document.querySelector('[data-blog-sort]');
  const chips = [...document.querySelectorAll('[data-blog-topic]')];
  let topic = '全部';
  const apply = () => {
    const query = normalizeText(search && search.value);
    const cards = [...list.querySelectorAll('[data-blog-card]')];
    cards.forEach((card) => {
      const matchTopic = topic === '全部' || card.dataset.topic === topic;
      const matchQuery = !query || normalizeText(card.dataset.keywords).includes(query);
      card.hidden = !(matchTopic && matchQuery);
    });
    const sorted = cards.sort((a, b) => {
      const mode = sort ? sort.value : 'date-desc';
      if (mode === 'date-asc') return a.dataset.date.localeCompare(b.dataset.date);
      if (mode === 'title-asc') return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent, 'zh-CN');
      return b.dataset.date.localeCompare(a.dataset.date);
    });
    sorted.forEach((card) => list.appendChild(card));
  };
  chips.forEach((chip) => chip.addEventListener('click', () => {
    topic = chip.dataset.blogTopic;
    chips.forEach((item) => item.classList.toggle('active', item === chip));
    apply();
  }));
  if (search) search.addEventListener('input', apply);
  if (sort) sort.addEventListener('change', apply);
  apply();
}
initSiteNavigation();
initCardSearch('[data-tool-search]', '[data-keywords]');
initBlogFilters();
