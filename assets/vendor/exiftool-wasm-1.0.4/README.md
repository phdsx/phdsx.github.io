# ExifTool WebAssembly 1.0.4

相机快门次数工具使用的固定版本浏览器解析器。运行文件未经修改，无外部 CDN 依赖。

- 封装：[@colorhythm/exiftool-wasm 1.0.4](https://github.com/colorhythm/exiftool-wasm)，Apache-2.0，见 `LICENSE`。
- 包来源：<https://registry.npmjs.org/@colorhythm/exiftool-wasm/-/exiftool-wasm-1.0.4.tgz>
- 包 integrity：`sha512-1sRiPURiKxz3gdvYnw346IXiPLjFedMWzbvjNq84RqCgfUEQUWLlfBuTE14WT3bNT+bFwXlr6rO4gHIgM+O8Ag==`。
- 内嵌 ExifTool 13.59：Copyright 2003–2026 Phil Harvey。按 Perl 原许可（Perl Artistic 或 GPL）分发。原版声明见 `README.ExifTool`，上游许可证见 `LICENSE.ExifTool`，Perl 许可证见 `LICENSE.Perl-Artistic` 和 `LICENSE.Perl-GPL`。源代码：<https://github.com/exiftool/exiftool/tree/13.59>。
- zeroperl：Copyright (c) 2025 United States Writing Corportation，MIT，见 `LICENSE.zeroperl`。构建源代码：<https://github.com/colorhythm/zeroperl>。内嵌 Perl 的源代码和许可：<https://www.perl.org/get.html>。
- 封装的上游实现：<https://github.com/6over3/exiftool>。

SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `index.js` | `e68abf36206541c21152f5418953e9ea773d98459778de560918a94296a1c337` |
| `zeroperl-mqcadjqm.wasm` | `c951a91fd1d5f79693aa725b4f3b7c067ce4e569a5c50f1175b5cbc90ffa559e` |

WASM 为 26,120,413 字节（约 24.91 MiB），首次选片时按需加载。解析在可终止的 Worker 中执行。本站只读照片，不提供写入元数据操作。传入解析器的 `fetch` 仅请求同源 WASM 文件。
