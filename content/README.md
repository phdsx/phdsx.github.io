# 内容目录

`content/` 保存需要持续维护的文章源文件；根目录的 HTML 是稳定的公开入口，`assets/` 是浏览器直接加载的资源。

目录按“内容类型 → 主题/集合 → 具体条目”分级：

```text
content/
└─ blog/                       博客源稿
   ├─ python/                  Python 主题
   └─ site/                    站点主题
```

小说章节正文和阅读器逻辑位于 `novels/reader.js`，目录页和阅读页也位于同一文件夹。

品牌黑名单的结构化数据已迁移到 `brand-blacklist/database/blacklist.json`，关联图片位于 `brand-blacklist/assert/`。站点级公开入口保留在根目录；独立工具位于 `tools/<类别>/`，游戏位于 `games/<类型>/`。
