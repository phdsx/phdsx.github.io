# 内容目录

`content/` 保存需要持续维护的内容源文件；根目录的 HTML 是稳定的公开入口，`assets/` 是浏览器直接加载的资源。

目录按“内容类型 → 主题/集合 → 具体条目”分级：

```text
content/
├─ blog/                       博客源稿
│  ├─ python/                  Python 主题
│  └─ site/                    站点主题
└─ collections/               结构化专题数据
   └─ brand-blacklist/         品牌黑名单
      ├─ categories.json       一级、二级分类字典
      ├─ records/              每个品牌一份 JSON
      └─ templates/            新记录模板
```

小说章节正文和阅读器逻辑位于 `novels/reader.js`，目录页和阅读页也位于同一文件夹。

站点级公开入口保留在根目录；独立工具位于 `tools/<类别>/`，游戏位于 `games/<类型>/`。新增源稿或集合数据应放入上述分类目录，不再堆放到仓库根目录。
