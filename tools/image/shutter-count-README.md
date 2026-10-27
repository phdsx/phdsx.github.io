# 相机快门次数

入口：`tools/image/shutter-count.html`，分类：图片处理。目录、首页工具数据、站内搜索及面包屑均已接入。

参考 [ExifTool](https://github.com/exiftool/exiftool/tree/13.59) 和 [colorhythm/exiftool-wasm](https://github.com/colorhythm/exiftool-wasm)，采用固定版本 1.0.4（ExifTool 13.59），静态托管即可使用，无后端接口。通过 HTTP(S) 打开，不支持直接双击 HTML。

照片仅交给浏览器 Worker，既不上传，也不存储在 localStorage / IndexedDB。解析器按需同源加载，约 24.91 MiB。取消、替换照片、清除和离开页面会终止 Worker。每次只读一张，限制 200 MiB 和 3 分钟。忽略 ExifTool 可忽略的轻微错误，解析失败时显示解析器的提示。

只接受厂商备注中的 `MechanicalShutterCount`、`ShutterCount`、`ShutterCount2/3`、`ImageCount`。优先显示机械计数，并完整列出其他可用计数和原始字段名。不使用 `ImageNumber`、文件名编号、标准 IFD 或 XMP 中的同名字段猜测次数。零值合法；缺失、负值、非整数和不安全整数不会作为计数显示。不同机型计数含义不同，无法据此预测快门寿命；拍摄后的新增次数也无法由旧照片获知。

## 验证

```powershell
node --test tools/image/tests/shutter-count.test.mjs
node scripts/check-navigation.mjs
node scripts/check-site-links.mjs
```

自动测试包含自行构造的 Nikon type-3 MakerNote TIFF：通过实际 WASM 引擎读取 526，并验证内嵌大小端字节序、空值、零值、错误来源及文件边界。

另用 ExifTool 13.59 上游 `t/images/` 样本进行了实际解析（仅存于忽略的 `.local-tools/shutter-vendor/`，未随站点分发）：Nikon D70 JPEG = 526；Nikon D2Hs JPEG = 2；Nikon D70 NEF = 3619；Pentax K10D JPEG = 1648。Sony DSC-F828、Fujifilm S5Pro RAF、Canon M50 CR3 样本可识别型号，但没有可用计数，显示“未找到计数”。这些结果不代表同品牌所有机型都支持。

浏览器已验证 Nikon D70 JPEG 的真实 Worker 读取及结果展示。第三方许可与运行文件校验值见 `assets/vendor/exiftool-wasm-1.0.4/README.md`。
