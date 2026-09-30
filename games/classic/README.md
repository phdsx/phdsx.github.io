# 六款经典小游戏的 Three.js 场景

`classic.js` 处理玩法、输入和 Canvas 回退画面。`classic-3d.mjs` 用本站已有的 Three.js r160 模块在相同的 960 × 640 坐标系中绘制立体场景。六个页面加载生成的 `classic-3d.bundle.js`，因此通过静态托管或直接打开 HTML 文件都不需要外部网络资源。

修改 Three.js 场景后，在仓库根目录运行：

```sh
node scripts/build-classic-3d.mjs
node games/classic/classic-3d.test.cjs
node games/classic/classic.test.cjs
node scripts/test-difference-browser.mjs
```

WebGL 初始化或渲染失败时，页面会继续显示原有 Canvas 画面。

找茬的两种画面均包含太阳、屋顶、树冠、长凳和门五处差异。Canvas 使用绘图轮廓判定，Three.js 使用射线检测可见物体；点击任意一侧的完整差异都有效，重复点击已找到的物体不扣机会。浏览器回归脚本覆盖两种渲染、左右两侧和手机尺寸，需要已安装 Chromium 的 Playwright（可用 `PLAYWRIGHT_MODULE` 指定包路径）。

消消乐的宝石使用 `match-gems-atlas.png` 中的六种透明珠宝渲染素材，以保留已批准设计图的切面、高光和轮廓。Three.js 用纹理平面执行选中、交换、消除和下落动画；Canvas 回退画面也使用同一图集。

坦克大战已独立重做为原生 Canvas 像素游戏，不再使用此共享玩法或 Three.js 渲染。入口仍为 `../arcade/tank/index.html`；规则、关卡及验证说明见该目录 README。
