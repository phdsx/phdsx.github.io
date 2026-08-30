# 品牌黑名单维护

品牌黑名单公开页面直接读取 `database/blacklist.json`，不再生成或维护额外的 JavaScript 数据副本。

## 目录

```text
brand-blacklist/
├─ database/
│  └─ blacklist.json   分类、记录和数据库更新时间
├─ assert/             上传或从网络拉取后本地化的事件图片
├─ index.html          公开列表页
└─ detail.html         公开详情页
```

`assert` 是本项目约定的目录名。记录中的 `images[].src` 只能保存为 `assert/<文件名>`，不能直接保存 data URL 或外部图片地址。

## 本地管理

在 Windows 中双击仓库根目录的 `启动品牌黑名单编辑器.cmd`。启动器会在后台独立运行服务、等待健康检查通过后再打开管理台；重复双击会复用现有服务。工具仅监听 `127.0.0.1:8770`，管理台右上角可直接打开公开页面预览。工具可以完成：

- 新增、编辑、删除黑名单记录；
- 新增、改名、删除品牌分类和原因分类；
- 分类改名时同步更新关联记录，删除使用中的分类时阻止误删；
- 上传 PNG、JPEG、GIF、WebP 图片，重命名后存入 `assert`；
- 拉取 HTTP(S) 图片，校验格式、大小和地址后存入 `assert`；
- 查看本地图片的引用情况，删除未被记录使用的图片。

本地工具需要 Node.js 18 或更高版本，不依赖第三方 npm 包。需要停止时，双击仓库根目录的 `停止品牌黑名单编辑器.cmd`。

## 校验

在仓库根目录运行：

```powershell
node scripts/validate-brand-blacklist.mjs
```

校验器会检查 JSON 格式、重复 ID、日期、分类引用、来源 URL，以及数据库中引用的本地图片是否存在。
