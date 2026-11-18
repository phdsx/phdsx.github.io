# 工具箱首页

`index.html` 为简洁的工具站首页，使用 `assets/toolbox.css` 共享布局与 `home/minimal.css` 页面样式。参考刘明野工具箱的浅灰背景、白色面板和蓝色控件，主导航只包含首页、AI 雷达和 GitHub，个人 ID 仅在页脚保留署名。

首页只展示 AI 雷达一个真实工具入口，不恢复旧站其他栏目，不添加占位工具、搜索、分类或个人介绍。后续新增栏目以用户明确要求为准。

AI 雷达位于 `ai-radar.html`，同样加载 `assets/toolbox.css`，页面细节位于 `assets/ai-radar/radar-page.css`。当前四题评分、历史 IQ、两个预测来源、模型搜索、详情折叠、单组刷新与全部刷新保持原有数据脚本。

首页不加载雷达数据或交互脚本，保留 Cloudflare 访问统计。检查使用 `node --test scripts/test-ai-radar.mjs`、`node scripts/check-navigation.mjs` 和 `node scripts/check-site-links.mjs`，并在浏览器验证电脑、手机布局及雷达刷新、搜索和详情展开。
