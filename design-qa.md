# Ubuntu 主题设计验收

日期：2026-09-22。范围：按用户选中的 Ubuntu 桌面设计改造首页、公共导航及页面主题，并保持既有工具和游戏的独立工作区域。

final result: passed

## 对照依据

- 用户选中的原图：`audit-evidence/ubuntu-20260922/reference.png`（原始文件为 `C:/Users/YUE/.codex/generated_images/01a0c3fd-3aca-7331-adfd-a61cb74874ca/exec-cf2c2efc-3e89-4803-9793-372090f272fe.png`）。
- 最终实现：`audit-evidence/ubuntu-20260922/desktop.png`。
- 完整并排对照：`audit-evidence/ubuntu-20260922/comparison.png`。
- 工具图标、说明及阅读/游戏区域的局部对照：`audit-evidence/ubuntu-20260922/comparison-detail.png`，上方原图，下方实现。
- 桌面 CSS 视口与两张最终原始截图均为 1487 × 1058，devicePixelRatio 为 1；最终对照无需缩放。初次截图受滚动条影响为 1472 × 1047，仅用于记录初次发现，未用于最终通过判断。
- 状态：首页、中文、默认窗口、侧栏展开、搜索为空。系统栏显示当前日期和时间，不复制设计稿中的固定时间。
- 手机证据：`audit-evidence/ubuntu-20260922/mobile-viewport.png`。CSS 视口 390 × 844；滚动条占 15px，可布局宽度 375px；实测窗口范围 x=10…365，无横向溢出。原稿没有手机设计，手机布局按相同风格适配。验证后恢复默认视口。

## 发现与修复记录

1. [P2，已修复] 初版桌面工具图标及说明偏小，正文比例弱于参考图。将宽屏图标改为 72px，工具说明改为 14px，并调整主标题、侧栏字号与 hero 留白。初版证据：`desktop-before.png`、`comparison-before.png`；复查见最终完整与局部对照。
2. [P2，已修复] 旧页脚的收缩宽度与 40px 顶部外边距使页脚居中聚集，并把窗口推到视口之外。页脚改为全宽且取消旧外边距；最终窗口约 x=100、y=82、宽=1283、底部=1006，接近原图 x=100、y=82、底部=1000。
3. [P2，已修复] 手机工具说明偏小、英文热门链接位于壁纸深色区。说明调整为 12px，热门入口增加浅色底以维持对比；复查中英文均无横向溢出。
4. [P2，已修复] 桌面导航按钮原先仅切换手机菜单状态。现在桌面可折叠/恢复侧栏，手机可打开/关闭侧栏，断点变化同步 aria-expanded。
5. [P2，已修复] 手机独立工具/游戏窗口的语言按钮换行。增加最小宽度和禁止换行。

最终完整对照及局部对照未发现待处理的 P0/P1/P2 问题。

## 五项视觉检查

- 字体：本地 Ubuntu Regular/Bold，中文使用系统中文无衬线字体；主标题、侧栏、六个工具标题与两张推广卡的层级接近参考图。保留真实工具说明，较长文字自然换行。
- 间距和布局：紫橙壁纸、左侧 Dock、深色窗口栏、200px 侧栏、浅色主内容；搜索、六列工具、双推广卡顺序与参考一致。手机使用三列工具和单列推广卡。
- 色彩：橙色主操作与激活态、深紫桌面和暖灰侧栏一致；保留游戏自身的棋盘和状态语义色。
- 图像：四张按参考图方向生成的独立图片已放入对应区域并压缩为 WebP；无缺失图片。Dock 使用官方 Yaru 图标，界面符号采用 Bootstrap Icons。未用界面截图代替可操作网页。
- 文案：保留 PHDSX 身份、真实工具名称、阅读与游戏入口；中文与英文可切换，日期为实时时间。实际站点没有“关于我”页面，侧栏的次级区域承接现有软件、黄页与品牌黑名单入口。

## 交互及回归

通过浏览器实际验证：

- 站内搜索“二维码”，方向键选择、Enter 打开二维码工具。
- 输入“Ubuntu PHDSX”生成二维码；预览显示 V2、12 B 内容。
- 最大化/恢复窗口，最小化与重新打开，侧栏折叠/展开，外观设置弹窗打开与完成关闭。
- 中英文切换，英文首页桌面及手机文字无横向溢出。
- 手机导航打开工具目录；图片分类显示 4 项；无结果显示 0 项；重置恢复 17 项。
- 游戏目录进入五子棋；H8 落子后轮到白方，悔棋恢复黑方。
- 最终首页控制台无捕获到的 error/warn；页面图片均成功加载。
- `node --check` 检查共享导航、工具目录、翻译脚本通过。
- `scripts/check-site-links.mjs` 通过；`git diff --check` 无空白错误。

检查为受主题影响的代表性流程回归，未穷举每个工具和每款游戏的全部业务功能。

## 可接受差异与后续细节

- [P3] 生成的猫科壁纸、书本和手柄素材在细节构图上与原图不同，主体、配色及摆放区域一致。
- [P3] 标准图标库的线条、Dock 应用图标与图稿中的绘制图标略有差异；未使用浏览器等商标图标来冒充站点功能。
- [P3] 真实工具说明比原图较长，部分内容占两行；保持可读性优先。
- 搜索、导航与内容是实际 DOM；背景为装饰图。主题已修改本地项目，未发布远端。

## Dock 入口修正（2026-09-22）

- AI 雷达改用绿色雷达图标，Dock 中只有外观设置使用齿轮。
- 文件夹仍导航到工具目录；左下角九宫格改为打开原生“全部应用”对话框，列出首页、工具、游戏、博客、小说、AI 雷达、软件、黄页和品牌黑名单。
- 浏览器验证：Dock 中齿轮图标数量为 1；九宫格打开 9 个入口；Escape 关闭后焦点返回九宫格；面板中的博客入口进入 blog.html；文件夹进入 tools.html；控制台未捕获到 error。
- 1280 × 900 桌面截图：`audit-evidence/ubuntu-20260922/all-apps.png`。检查后恢复默认视口。
- 共享脚本语法与站内引用检查通过。

## Full-site Ubuntu theme and hierarchy — 2026-09-23

final result: passed

Scope: the 37 public destination pages plus the legacy game redirect. Ordinary tools now share the desktop window; games and the floating presentation timer retain compact Ubuntu chrome to preserve their canvas/fixed-control geometry.

Resolved findings:
- P1: Tool details lost their section/category context. Added root-relative breadcrumbs, explicit parent links, and indented sidebar categories. QR tools map to text; entertainment calculators map to lifestyle, independent of physical folders.
- P1: Category selections vanished on navigation or reload. Tools and games now use validated category URLs; tool search is retained in `q`; browser back/forward restores selection.
- P1: Legacy fixed headers appeared above the Ubuntu window. Moved headings and footers into the content window while preserving DOM nodes and listeners; fixed non-deferred standalone scripts that ran before body existed.
- P2: Nested tools and older unwrapped tools did not join the theme. Adapted all ordinary tools, including the watermark editor and both countdown pages. Preview sizing now uses displayed CSS pixels for its canvas buffer.
- P2: Secondary navigation had no current-location highlight. All sections now highlight consistently; article/archive titles update after asynchronous loading; novel paths include the book and chapter.
- P2: Mixed blue controls, oversized rounded cards and dark generated directory icons. Unified warm neutral surfaces, orange primary actions, compact radii and library icon tiles.

Visual evidence: `audit-evidence/site-hierarchy-20260922/reference-comparison.jpg` compares the selected reference and current homepage at the same 1487 × 1058 viewport. `contact-sheet.jpg` shows tools, a tool detail, the editor, games, reader, software, blog, radar and directory. `mobile-tools.png` records 390 × 844 layout. The reference's wallpaper, Dock, titlebar, sidebar, hero and six-launcher structure remain intact; content pages reuse that vocabulary with a dedicated location bar.

Verification:
- Browser layout/navigation inspection of all 37 destination pages at desktop and 390 px phone widths: no horizontal document overflow; correct shell and breadcrumbs. Legacy game redirect resolves to its canonical game.
- Tool category → detail → parent; refresh and history back restore the text category (5 tools) and image category (4 tools).
- Game puzzle category → Sand Sort → parent retains 2 games. Novel next chapter and parent target the book in the chapter directory.
- Text deduplication produces two unique lines from three input lines. Custom countdown starts from 30 seconds.
- Mobile category menu navigation; Activities opens all applications; Escape closes the dialog. Dynamic archive and blog titles render in breadcrumbs.
- Browser console inspection found no error entries during this pass.
- `node scripts/check-navigation.mjs`, JavaScript syntax checks and `node scripts/check-site-links.mjs` pass.

Limits: this pass covers presentation, navigation and representative existing interactions. It does not revalidate every game's rules or external video/AI services. No deployment performed.
