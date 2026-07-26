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
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
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
  const params = new URLSearchParams(location.search);
  const src = params.get('src');
  const title = params.get('title') || '博客文章';
  const topic = params.get('topic') || 'Blog';
  const date = params.get('date') || '';
  document.querySelector('[data-post-title]').textContent = title;
  document.title = title + ' - PHDSX';
  document.querySelector('[data-post-topic]').textContent = topic;
  document.querySelector('[data-post-date]').textContent = date;
  const body = document.querySelector('[data-post-body]');
  if (!src) { body.textContent = '没有找到文章路径。'; return; }
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
