# 项目目录约定

页面按站点导航中的栏目、分类和景点保存。已有公开页面地址保持稳定，移动维护文件时同步更新引用及构建命令。

| 内容 | 存放位置 |
| --- | --- |
| 首页、各栏目入口 | 根目录 `*.html` |
| 工具 | `tools/<分类>/`；专用源码、测试、文档和脚本保存在对应目录 |
| 游戏 | `games/<分类>/<游戏>/`；专用脚本放在游戏的 `scripts/` |
| 3D 景点 | `tours/<国家>/<地区>/<景点>/` |
| 独立 Vite 景点源码 | 对应景点的 `source/`；保留 `src/`、`public/`、`scripts/`、文档、研究数据和锁文件 |
| 博客文章源文件 | `content/blog/<主题>/` |
| 小说 | `novels/` |
| 品牌黑名单页面、数据库、编辑器 | `brand-blacklist/`、`database/`、`manager/`、`scripts/` |
| 全站导航、翻译、主题和共享依赖 | `assets/` |
| 栏目专用资源 | `assets/blog/`、`assets/ai-radar/`、`assets/games/`、`assets/tours/` |
| 图片 EXIF 处理、二维码依赖 | `tools/image/image-exif.js`、`tools/utility/vendor/qrcode.min.js` |
| 全站预览和校验 | 根目录 `scripts/` |
| 历史设计报告和截图 | `docs/audit/`、`docs/audit/evidence/` |

`source/` 是唯一可维护的景点源码。发布时只把其 `dist/` 产物复制到景点目录，不再复制一份源码。Cloudflare 资源上传和 Jekyll 构建排除景点 `source/`。部分直接使用原生 JavaScript 的景点保留现有运行目录，无需额外源码副本。

## 常用命令

以下命令均从仓库根目录运行。

```powershell
node scripts/check-navigation.mjs
node scripts/check-site-links.mjs
node --test scripts/serve-site.test.mjs
node scripts/serve-site.mjs 8194
node scripts/build-tours.mjs
node scripts/build-tours.mjs --only beijing-zoo
node tools/text/scripts/test-text-diff.mjs
node --test tools/image/image-exif.test.cjs
node brand-blacklist/scripts/validate-brand-blacklist.mjs
node games/classic/scripts/build-classic-3d.mjs
node games/sports/free-kick/scripts/build-free-kick.mjs
node games/puzzle/sand-sort/scripts/build-sand-sort.mjs
```

圆明园在 `tours/china/beijing/yuanmingyuan/source/` 运行 `npm run build`、`npm run deploy:local`；平潭在 `tours/china/fujian/pingtan/source/` 运行 `npm run build`、`python scripts/package-static.py`。这两个命令只更新本地公开目录，不推送或部署网站。

## 2026-10-08 清理记录

- 将天坛、故宫、颐和园、北京动物园、圆明园和平潭的源码从根目录移入各景点的 `source/`。
- 合并平潭原有源码副本：87 个文件与原工程相同，2 个文件只有打包脚本或文档差异；副本独有的 `LICENSE` 已保留。原工程中的源码、研究数据、验收记录和本地依赖保留。
- 删除 13 个经全仓库引用检查确认未使用的文件，共 5,458,484 字节：3 个日志、1 个 Python 缓存、1 个空占位文件、2 张已有 WebP 运行版本的 PNG、6 个过期 JS/CSS 构建文件。
- 保留仍被页面加载的 Porcelain 样式、WebP 和图标，以及第三方许可、素材出处、原始数据和测试记录。
- 将页面专用资源、构建与测试脚本移入对应栏目；根目录设计验收报告及截图归入 `docs/audit/`。
- Git 忽略日志与 Python 缓存；景点发布脚本按新构建清单移除过期 JS/CSS，避免旧哈希文件累积。

验证通过：全站导航、125 个 HTML/CSS 文件的本地引用、6 个景点的 Vite 构建、4 个景点的数据与布局检查，以及 85 项工具、游戏和站点预览测试。15 个代表页面通过浏览器检查，移动后的本地资源无缺失；外网请求在该检查中被拦截。动物园批量发布脚本与平潭静态打包脚本也已在本地实际运行。
