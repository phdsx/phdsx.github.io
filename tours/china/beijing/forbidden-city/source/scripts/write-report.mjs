import fs from 'node:fs';
const report=JSON.parse(fs.readFileSync('evidence/test-results.json')),nav=JSON.parse(fs.readFileSync('evidence/navigation-tests.json')),data=JSON.parse(fs.readFileSync('public/data/layout.json'));
const rows=report.performance.map(p=>`|${p.quality}|${p.buffer.join('×')}|${p.pixelRatio}|${p.fps.toFixed(1)}|${p.meanFrameMs.toFixed(2)}|${p.p95FrameMs.toFixed(2)}|${p.calls}|${p.triangles.toLocaleString('en-US')}|`).join('\n');
const text=`# 浏览器测试与参考对照

## 测试环境

- 日期：${report.timestamp}（UTC；本地 Asia/Shanghai +8）
- 系统：Windows 10/11，Node.js 24.20.0，npm 11.19.0。
- 浏览器：${report.environment.userAgent}。
- 图形：${report.environment.renderer}。
- WebGL：${report.environment.webgl}。
- CSS视口：${report.environment.viewport.join('×')}，设备像素比${report.environment.dpr}。
- 测试方法：启动真实本地Vite服务，Playwright独立Chromium执行DOM按钮、真实鼠标拖动/滚轮与键盘移动，同时通过应用诊断接口检查碰撞结果。

## 功能结果

${report.checks.map(c=>`- ${c.pass?'通过':'未通过'}：${c.name}`).join('\n')}

补充几何与错误路径核查：

${nav.checks.map(c=>`- ${c.pass?'通过':'未通过'}：${c.name}`).join('\n')}

资源503和WebGL禁用为有意故障注入，独立于正常运行页面；正常页面控制台错误${report.errors.length}条，资源加载失败${report.failed.length}条。加载进度随数据读取与几何分批生成更新。鼠标锁定可能受浏览器权限限制，拖动观察作为通用入口；自动化验证了拖动观察，未将权限依赖的锁定状态列为已验证。

## 性能实测

各画质回到同一全域视角，等待切换稳定后，取约1.6秒连续requestAnimationFrame间隔。帧率是这些间隔的倒数，不是GPU渲染时间。短测试可能受到60Hz显示/调度上限影响。

|画质|绘图缓冲|实际DPR|平均fps|平均帧间隔ms|P95ms|渲染计数draws|三角形|
|---|---|---:|---:|---:|---:|---:|---:|
${rows}

实际DPR为1，低/中/高分辨率相同；高DPI屏幕才会触发1/1.5/2的上限差别。画质仍改变阴影启用、阴影分辨率和近景细部距离。主场景渲染计数不能单独证明CPU或GPU瓶颈；未做GPU timer query、CPU profile或持续内存压测，不宣称某个部件耗时多少。最大的几何量是全域程序屋面及复杂轮廓分解，近景构件通过InstancedMesh合并。固定地图数据一次加载；细部代码/几何按距离延迟建立和裁切，两级LOD缓存最多18组。

## 关键观察点与参考对照

相机视点采用项目格网米制坐标；截图视点与参考照片的拍摄点不相同，所以这里只做轮廓与空间关系对照，未进行相机标定、逐像素配准或量化图像误差。

|截图|视点/目标|参考|对照结论与剩余差别|
|---|---|---|---|
|[01全域](../evidence/01-full-site.png)|相机(690,920,1070)，目标原点|[官方导览图](https://www.dpm.org.cn/Visit.html)、OSM边界|四门、四角、三区域轴线及东西宫院均存在；没有只制作中轴。岸线规则化、部分未知建筑外观示意，临时开放边界不模拟|
|[02太和殿](../evidence/02-taihe.png)|相机约(73.31,95,209.62)，目标太和殿|[官方太和殿照片](https://www.dpm.org.cn/explore/building/236465.html)，本地taihe-1/2/3|重檐庑殿、三层台基、中和/保和前后关系保留；上层梁枋、脊吻、斗栱与石雕是近似，不等同现状精细立面|
|[03午门](../evidence/03-wumen.png)|东南斜向朝午门；目标约(0.59,18,480.5)|[官方午门照片](https://www.dpm.org.cn/explore/building/236454.html)，本地wumen-1/2/3|凹形城台、中央楼与翼楼/四亭可辨；城台分段长度及翼楼屋脊为估算，侧门交通未全部细化|
|[04乾清宫](../evidence/04-qianqing.png)|东南斜向，目标(-3.01,8,-226.76)|[官方乾清宫照片](https://www.dpm.org.cn/explore/building/236472.html)，本地qianqing-1/2/3|重檐庑殿及后三宫前后关系保留；月台器物与廊庑仍简化，门窗并非逐扇复制|
|[05御花园](../evidence/05-garden.png)|目标钦安殿(-2.38,7.5,-402.66)|[钦安殿](https://www.dpm.org.cn/explore/building/236494.html)、[万春/千秋亭](https://www.dpm.org.cn/explore/building/236521.html)|钦安殿盝顶及两侧亭的位置关系保留，圆攒尖亭替换错误的多小屋顶；花园铺地、树冠、假山与盆景细节不足|
|[06外东路](../evidence/06-east.png)|目标皇极殿(291.45,8,-194.72)|[皇极殿](https://www.dpm.org.cn/explore/building/236476.html)、官方导览图|皇极殿—宁寿宫—后部宫院顺序保留，与中轴空间区别明确；其余单体屋顶和园林多示意，九龙壁未雕刻|
|[07外西路](../evidence/07-west.png)|目标武英殿(-221.21,7.5,272.97)|[武英殿](https://www.dpm.org.cn/explore/building/236500.html)、官方导览图|前后殿和穿廊、相邻配殿、内河位置保留；屋顶及柱网尺寸仍地图估算，浴德堂形制未单独精细核对|
|[08步行](../evidence/08-walking.png)|太和殿台面附近，视高1.68m|太和殿官方檐下/正面照片|可见柱列、格扇和层檐，墙体不能穿入；构件近似，匾额暂仅汉字而非精确满汉文字与书法|
|[09灰盒](../evidence/09-graybox.png)|全域相机，统一灰色材质|官方导览图与OSM原始轮廓|用于边界、体量与轴线检查；不是只完成灰盒的交付|
|[10东北角楼](../evidence/10-northeast-corner.png)|相机(442,95,-351)，目标(367,16,-471)|[角楼官方照片](https://www.dpm.org.cn/explore/building/236522.html)，本地corner-1/2/3|中央方亭和四面抱厦有实际尺寸约束；三层组合轮廓为近似，屋脊细分和石栏未精确复原|

原始截图尺寸1440×1000，没有以照片替换实时场景。参考原图26张，仍有部分是构件或室内图，未用于编造未知外立面。完整清单见research/reference-images.json。

## 构建与未验证项

\`npm run check\` 与 \`npm run build\` 成功。Vite提示Three.js分块大于500kB，是体积警告，不是构建失败。项目固定版本，不依赖运行时CDN；未发布。

未验证：用户前台浏览器权限弹窗、手机触屏步行、长时间遍历所有宫院、所有门口通道、每座示意建筑的真实外观、真实现场测绘偏差。基础测试通过不代表这些未完成内容已经通过验收。资料范围和已完成/估算/未完成清单见[AUTHENTICITY.md](AUTHENTICITY.md)。
`;
fs.writeFileSync('docs/TESTING.md',text.replaceAll('\\`','`'));
