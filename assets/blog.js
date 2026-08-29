function escapeHtml(value) {
  return value.replace(/[&<>"]/g, function(ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
  });
}
function inlineMarkdown(value) {
  const tick = String.fromCharCode(96);
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(new RegExp(tick + '([^' + tick + ']+)' + tick, 'g'), '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      return '<a href="' + safeMarkdownHref(href) + '">' + label + '</a>';
    });
}
function safeMarkdownHref(value) {
  const href = value.trim();
  const protocol = href.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!protocol || /^(https?|mailto|tel)$/i.test(protocol[1])) return href;
  return '#';
}
function renderMarkdown(md) {
  const fence = String.fromCharCode(96, 96, 96);
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let listOpen = false;
  let codeOpen = false;
  let code = [];
  const closeList = function() { if (listOpen) { html.push('</ul>'); listOpen = false; } };
  lines.forEach(function(line) {
    if (line.trim().startsWith(fence)) {
      if (codeOpen) { html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>'); code = []; codeOpen = false; }
      else { closeList(); codeOpen = true; }
      return;
    }
    if (codeOpen) { code.push(line); return; }
    const trimmed = line.trim();
    if (!trimmed) { closeList(); return; }
    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { closeList(); const level = heading[1].length + 1; html.push('<h' + level + '>' + inlineMarkdown(heading[2]) + '</h' + level + '>'); return; }
    const item = trimmed.match(/^[-*]\s+(.+)$/);
    if (item) { if (!listOpen) { html.push('<ul>'); listOpen = true; } html.push('<li>' + inlineMarkdown(item[1]) + '</li>'); return; }
    closeList();
    html.push('<p>' + inlineMarkdown(trimmed) + '</p>');
  });
  closeList();
  if (codeOpen) html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
  return html.join('\n');
}
(async function initPost() {
  const posts = {
    'Python/Python_output.md': { title: 'Python 输出笔记', topic: 'Python', date: '2020-05-22' },
    'Python/Python_tutorail.md': { title: 'Python 教程笔记', topic: 'Python', date: '2020-05-22' },
    'index.md': { title: '站点更新记录', topic: '站点', date: '2020-05-22' }
  };
  const params = new URLSearchParams(location.search);
  const src = params.get('src');
  const body = document.querySelector('[data-post-body]');
  const post = src && posts[src];
  if (!post) {
    document.querySelector('[data-post-title]').textContent = '文章未找到';
    document.title = '文章未找到 - PHDSX';
    document.querySelector('[data-post-topic]').textContent = 'Blog';
    document.querySelector('[data-post-date]').textContent = '';
    body.textContent = '这个文章地址无效，请从博客目录重新选择。';
    return;
  }
  document.querySelector('[data-post-title]').textContent = post.title;
  document.title = post.title + ' - PHDSX';
  document.querySelector('[data-post-topic]').textContent = post.topic;
  document.querySelector('[data-post-date]').textContent = post.date;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const md = await response.text();
    if (!md.trim()) { body.innerHTML = '<p>这篇文章暂时还没有内容。</p>'; return; }
    body.innerHTML = renderMarkdown(md);
  } catch (error) {
    body.textContent = '文章暂时无法加载，请确认文件存在：' + src;
  }
})();
