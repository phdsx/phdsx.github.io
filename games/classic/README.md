# 七款经典小游戏的 Three.js 场景

`classic.js` 处理玩法、输入和 Canvas 回退画面。`classic-3d.mjs` 用本站已有的 Three.js r160 模块在相同的 960 × 640 坐标系中绘制立体场景。七个页面加载生成的 `classic-3d.bundle.js`，因此通过静态托管或直接打开 HTML 文件都不需要外部网络资源。

修改 Three.js 场景后，在仓库根目录运行：

```sh
node scripts/build-classic-3d.mjs
node games/classic/classic-3d.test.cjs
node games/classic/classic.test.cjs
```

WebGL 初始化或渲染失败时，页面会继续显示原有 Canvas 画面。
