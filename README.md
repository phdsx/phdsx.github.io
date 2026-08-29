<div align="center">

# PHDSX

### 一个持续生长的个人网页实验室

把学习记录、实用工具、小游戏和偶然冒出的想法，做成真正可以打开使用的网页。

[在线访问](https://phdsx.github.io/) · [工具箱](https://phdsx.github.io/tools.html) · [游戏厅](https://phdsx.github.io/games.html) · [AI 雷达](https://phdsx.github.io/ai-radar.html)


## 这里有什么？

这不是一个单一用途的应用，而是一座由小作品组成的个人站点。所有内容都可以直接在浏览器中运行，不需要注册账号，也没有复杂的安装过程。

| 分区 | 内容 |
| --- | --- |
| [在线工具](https://phdsx.github.io/tools.html) | 文本处理、图片处理、二维码、倒计时、拼音辅助和生活小工具 |
| [网页游戏](https://phdsx.github.io/games.html) | 中国象棋、俄罗斯方块、潜艇大战、Parking Pulse、沙子分类等 |
| [博客](https://phdsx.github.io/blog.html) | Python、HTML、JavaScript 与 Markdown 学习记录 |
| [小说](https://phdsx.github.io/novels/) | 支持章节导航、阅读进度和显示设置的在线阅读页 |
| [软件作品](https://phdsx.github.io/software.html) | 自制软件与 Web 作品的版本发布入口 |
| [AI 雷达](https://phdsx.github.io/ai-radar.html) | 模型能力评分与 Codex 重置预测聚合 |
| [品牌黑名单](https://phdsx.github.io/brand-blacklist/) | 支持搜索、分类、国家筛选和事件详情的专题记录页 |

## 精选作品

### EQ 单字拼音域代码生成器

为 Word 文档逐字生成拼音 EQ 域代码，支持声调符号、声调数字、逐字校验、复制和 TXT 导出。

[立即使用](https://phdsx.github.io/tools/document/eq-pinyin-code.html)

### AI 雷达

在一个页面中查看模型综合智能、软件工程能力、视觉推理能力，以及多个站点提供的 Codex 重置预测。页面打开时自动更新，也可以手动刷新单个来源。

[打开 AI 雷达](https://phdsx.github.io/ai-radar.html)

### 网页小游戏

从经典俄罗斯方块到原创停车解谜，所有游戏均可直接在浏览器中游玩，并适配桌面端和移动端。

[进入游戏厅](https://phdsx.github.io/games.html)

## 项目特点

- 纯静态页面，没有构建步骤和运行时依赖
- 使用原生 HTML、CSS、JavaScript 编写
- 响应式布局，兼顾桌面端和移动端
- 统一导航、分类入口和站内搜索
- 工具优先在浏览器本地处理内容
- 可直接部署到 GitHub Pages

## 文件结构

仓库按“公开入口、可维护内容、静态资源、维护脚本”分层：

```text
├─ *.html       稳定的公开页面入口
├─ novels/      小说目录与阅读器
├─ brand-blacklist/ 黑名单列表与详情页
├─ content/     按内容类型和主题分级保存的源内容与集合数据
├─ assets/      页面直接加载的样式、脚本、图片和生成数据
├─ scripts/     新建记录、内容校验与生成脚本
├─ games/
│  ├─ board/    棋盘游戏
│  ├─ arcade/   街机游戏
│  ├─ puzzle/   益智游戏
│  └─ legacy/   旧游戏入口
└─ tools/
   ├─ document/ 文档与演示工具
   ├─ utility/  通用工具
   ├─ time/     时间工具
   ├─ image/    图片工具
   ├─ text/     文本工具
   ├─ lifestyle/ 生活工具
   ├─ fun/      趣味工具
   └─ media/    媒体工具
```

详细的内容分类规则见 [`content/README.md`](content/README.md)。品牌黑名单的新增方法和模板见 [`content/collections/brand-blacklist/README.md`](content/collections/brand-blacklist/README.md)。


## AI 雷达数据说明

AI 雷达展示来自 [CodexRadar](https://codexradar.com/)、[Codex Reset](https://codex-reset.com/zh/) 和 [Will Codex Reset](https://willcodexreset.com/) 的公开数据。

所有评分与预测仅供信息参考，数据版权和解释权归原始来源所有，也不代表 OpenAI 官方结论。来源暂时不可用时，页面会明确显示读取失败，不会使用虚构数据替代。

## 反馈与交流

如果你发现页面问题，或对新工具、新游戏有想法，欢迎通过 [Issues](https://github.com/phdsx/phdsx.github.io/issues) 留言。

## 许可说明

除另有注明的第三方内容外，本项目由 PHDSX 以 [GNU Affero General Public License v3.0 或更高版本](LICENSE) 发布（SPDX：`AGPL-3.0-or-later`）。你可以依照许可证使用、研究、修改和再分发本项目；如果你修改本项目并通过网络向用户提供服务，还必须向这些用户提供对应版本的完整源代码。

项目包含的第三方代码、素材及其许可证不因本项目采用 AGPL 而改变，详情见 [第三方声明](THIRD_PARTY_NOTICES.md)。其中 `games/arcade/fruit-ninja` 目录继续适用其目录内的 Apache-2.0 许可证及源文件中保留的 MIT 声明。

Copyright © 2020–2026 PHDSX

---

<div align="center">

Made with curiosity by **PHDSX**

</div>
