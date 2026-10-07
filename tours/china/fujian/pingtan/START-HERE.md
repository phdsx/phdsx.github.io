# 平潭三维地理场景

在本目录运行 `node serve.mjs . 5187`，打开 http://127.0.0.1:5187/ 。只需 Node.js，无需 npm 安装或外网。也可用任何静态 HTTP 服务；不支持直接双击 file:// 入口。

`index.html`、assets/data/textures 为完整运行资源。对应源代码、锁定依赖与原始许可数据在 source/：在 source/ 运行 `npm ci`、`npm run dev` 或 `npm run build`。

验收与截图见 docs/ACCEPTANCE.md 和 evidence/；来源见 docs/SOURCES.md，精度与缺失见 docs/ACCURACY.md。统一景观覆盖、15处定位和19项状态见 docs/LANDSCAPES.md。版权参考照片未分发。

采用真实 OSM 岸线、公开高程和 2016 卫星影像，1 单位=1 米；北港只有两处映射轮廓上的近似石厝，镜沙、仙人井等地貌为来源明确的参考近似，部分景观资料缺失。不是完整摄影测量实景模型。
