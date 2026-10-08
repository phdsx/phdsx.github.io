# 文本差异比对

入口：`tools.html` →「文本与编码」→「文本差异比对」。首页站内搜索支持「文本差异」「diff」「文本比较」；独立页面是 `tools/text/text-diff.html`。

页面说明：对比两段文字的新增、删除和修改，支持忽略空格与空白字符。

## 使用

1. 在「原始文本」「对比文本」粘贴或编辑文字，选择空白处理规则，点击「开始比对」。
2. 查看左右行号、新增/删除/修改标记及字符高亮。「上一处」「下一处」在差异块间循环，自动切到对应结果页；手机端按对应行上下展示。
3. 可以分别复制原文、清空任一侧、交换、一键清空、载入示例，或下载包含全部结果和规则的 UTF-8 TXT 报告。

修改输入、交换或切换比较规则会立即取消进行中的任务、删除旧结果、禁用报告下载并提示重新比对。「显示空白符」只改变显示，不改变比较规则。没有实时比对，也没有输入持久化。

## 规则与统计

比较前仅统一 CRLF → LF，不改写大小写、标点、Unicode 规范化形式或独立 CR。输入框原文不变。

| 空白规则 | 行为 |
| --- | --- |
| 不处理（默认） | 保留并比较全部空白 |
| 去除普通空格 | 仅移除半角 U+0020，保留换行、Tab、全角空格等 |
| 去除每行首尾空白 | 按 LF 分行，去除每行两端 Unicode White_Space 与 BOM，保留行内空白及 LF |
| 去除全部空白 | 移除 Unicode White_Space 与 BOM，包括 U+0085、NBSP、换行、Tab、全角空格 |

ZWJ 与 U+200B 不属于上述空白，不会被移除。开启预处理后展示「处理后的比对结果」，其行号和字素位置对应处理后的比较副本；不将其索引套用到原文。两侧仅因 CRLF/LF 不同也显示「文本一致」，其他处理后相等显示「按当前空白处理规则，两段文本一致」。

连续变化组成一个差异块；相同行会分隔差异块。同一块内删除与新增行按顺序配对成「修改」，剩余行记作「新增」或「删除」。行统计不代表改变的字符数量。空输入没有行；末尾 LF 会产生显式末尾空行。重复或移动内容按序列 diff 表示，没有独立「移动」类别。

默认用 `·`、`⇥`、`□`、`⍽` 分别显示普通空格、Tab、全角空格和其他 Unicode 空白，用 `␍` 表示独立 CR。这些符号仅用于查看，报告保存实际比较文本。字符删除另有删除线，新增另有下划线；不只靠颜色表达变化。

## 算法、隐私和资源限制

- 算法：固定 [jsdiff 8.0.3](https://github.com/kpdecker/jsdiff/tree/v8.0.3) 的 Myers `diffArrays` 核心，BSD-3-Clause。先比较完整行，再用 `Intl.Segmenter` 的 `grapheme` 分割比较修改行，不依赖英文分词，Emoji ZWJ、肤色、旗帜和组合音符保持完整。
- 依赖：仅两个未修改的 ESM 核心模块，共约 12 KiB；本地静态加载，无 CDN、编辑器或 UI 框架。固定版本、来源和 SHA-256 在 `assets/vendor/jsdiff-8.0.3/README.md`，许可证已保留并登记第三方声明。
- 计算：每次任务使用模块 Web Worker；变更或取消时终止。算法预算 6 秒，页面兜底 12 秒。超时显示失败，不能下载部分结果。
- 输入：每侧最多 200,000 个 UTF-16 字符单位、5,000 行；处理前后单行最多 20,000 单位。超限直接拒绝，不截断。去除全部空白可能合并成长行，也适用单行限制。
- 展示：每页最多 100 个对齐行、约 40,000 个文本单位，至少保留一整行；全部行可分页访问。导航自动跨页，报告不受分页影响。两侧使用同一纵向滚动区域，长行自动换行。
- 数据：输入仅存在当前页面及本地 Worker 内存，不上传、不写入日志/分析、不写入 localStorage/sessionStorage/IndexedDB。共享语言模块只保存界面语言。页面不加载统计脚本，CSP `connect-src 'none'` 阻止联网 API；结果全部通过 `textContent` 插入，HTML/script 作为普通文本。
- 兼容：需要通过 HTTP/HTTPS 使用支持模块 Worker 与 `Intl.Segmenter` 的现代浏览器；不支持的浏览器给出明确提示。本站现有 Ubuntu 公共主题为固定浅色窗口，沿用现有 CSS、字体、配色及导航；没有新增全站主题设置。

## 文件

- `tools/text/text-diff.html`、`.css`、`.mjs`：界面及交互。
- `tools/text/text-diff-core.mjs`、`text-diff-worker.mjs`：预处理、行与字素 diff、分页、报告、本地计算。
- `assets/workspace-data.js`、`catalog.js`、`navigation.js`、`i18n.js`，`tools.html` 和 `index.html`：工具卡片、搜索、导航、名称翻译、静态入口及缓存版本。
- `assets/vendor/jsdiff-8.0.3/`、`THIRD_PARTY_NOTICES.md`：固定算法与许可。
- `tools/text/scripts/test-text-diff.mjs`、`test-text-diff-browser.mjs`、`check-navigation.mjs`：验证。

## 验证命令

本站根级为静态页面，没有 npm 构建命令。

```powershell
node --test tools/text/scripts/test-text-diff.mjs
node scripts/check-navigation.mjs
node scripts/check-site-links.mjs
# 此既有静态服务器可服务整个仓库：
node games/puzzle/sand-sort/scripts/serve-sand-sort.mjs
# 另一个终端，Playwright 可通过 PLAYWRIGHT_MODULE 指定已有模块路径：
node tools/text/scripts/test-text-diff-browser.mjs
```

浏览器测试默认访问 `http://127.0.0.1:8177`，可用 `TEXT_DIFF_URL` 指定其他本地服务器。截图保存到被 Git 忽略的 `.local-tools/text-diff-qa/`。测试采用合成文本，不读取用户输入。

2026-10-01 实际验证：核心自动化 27 项通过；涵盖所有空白模式、重复行/段落、中文/Emoji、末尾空行、CRLF、超限、超时、缺少字素支持、随机编辑双向重建、完整报告、导航接入、静态资源与依赖 SHA-256。Chromium 浏览器自动化 92 项检查通过，验证工具搜索入口、复制成功/失败反馈、下载实际文件、跨页导航、原文保留、输入/规则/交换失效状态、取消 Worker、HTML 安全、手机布局及长行、空输入/空白、大文本、键盘与标签；工具没有控制台错误或对外请求。93,389 个字符单位、4,500 行、3 个差异块的计算及首屏展示实测约 88 ms（含启动 Worker；仅代表本机测试，不含自动化填入文本时间）。

全站导航检查首次通过；随后共享工作区并行加入 3D 云游导航，复查时其 `tours.html` 尚未创建，导致全站导航检查暂时失败。本次保留并行修改，文本差异工具自身的导航接入测试通过。

全站链接检查仍存在一项**本次修改前已有**的问题：`games/arcade/bombman/index.html` 引用 `/src/main.ts`，根目录没有该文件；已通过 Git HEAD 核实，未改动该游戏。新增工具的资源和模块引用全部通过检查。
