# 工具箱首页

首页、AI 雷达和 EQ 拼音工具共用 `assets/toolbox.css`，提供固定左侧目录、顶部栏、浅灰背景和白色内容面板。

## 搜索

首页顶部有网页搜索与站内工具两种模式。网页搜索支持 Bing、百度、Google，选择引擎后通过原生 GET 表单提交，在新标签页打开结果。关键词使用浏览器表单编码，不拼接未经编码的 URL。未启用 JavaScript 时仍可使用默认 Bing 搜索。

站内模式筛选首页列出的工具，支持全角英文、大小写和空格分词。没有结果时可清空搜索。`Ctrl K` / `⌘ K` 聚焦搜索，`Escape` 清空关键词。首页搜索逻辑位于 `home/search.js`。

## 目录与内容

电脑端左侧目录固定显示首页、AI 雷达和 EQ 拼音。雷达页另有当前评分、IQ 归档和重置预测的页内链接。手机端目录转为横向导航，可左右滚动。

EQ 单字拼音域代码生成器可从首页工具直达打开，网址为 `tools/document/eq-pinyin-code.html`。拼音生成和 TXT 导出在浏览器中处理。

## 验证

运行 `node --test scripts/test-home-search.mjs scripts/test-ai-radar.mjs`、`node scripts/check-navigation.mjs`、`node scripts/check-site-links.mjs`。浏览器检查搜索模式切换、搜索引擎路由、目录跳转、窄屏布局及评分预测刷新。
