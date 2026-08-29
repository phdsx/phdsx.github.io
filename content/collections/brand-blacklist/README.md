# 品牌黑名单数据维护

数据按三级组织：专题集合 → 一级/二级分类 → 单条品牌记录。页面读取的是生成后的 `assets/brand-blacklist-data.js`，请不要直接修改该文件。

## 新增记录

1. 运行 `node scripts/new-brand-blacklist-record.mjs <id>` 自动从模板创建记录，例如 `node scripts/new-brand-blacklist-record.mjs example-brand`。
2. 填写生成的 `records/<id>.json`；`id` 使用小写英文、数字和连字符，且须与文件名一致。
3. 如需新分类，先在 `categories.json` 中添加一级分类及其二级分类。
4. 在仓库根目录运行：

   ```powershell
   node scripts/generate-brand-blacklist.mjs
   ```

5. 提交记录 JSON 和生成后的 JS 文件。

生成器会检查重复 ID、日期格式、分类层级、来源 URL 和必填字段。来源链接可在后续核实后补充，建议每条正式记录尽量附上可核验来源。
