# 个人主页

`index.html` 是简洁的个人主页，样式位于 `home/minimal.css`。浅色背景与衬线姓名构成主体，下方仅提供一个 AI 雷达入口。

首页只展示个人介绍、GitHub 链接和 AI 雷达入口，不自动恢复旧站栏目，不提供栏目目录、搜索、分类、评分或预测。后续新增栏目以用户明确要求为准。

AI 雷达继续位于 `ai-radar.html`，使用其独立脚本与现有样式。首页不加载雷达数据，也不加载交互脚本；保留 Cloudflare 访问统计。

检查首页与独立雷达的链接使用 `node --test scripts/test-ai-radar.mjs`、`node scripts/check-navigation.mjs` 和 `node scripts/check-site-links.mjs`，并在浏览器验证手机和电脑布局。
