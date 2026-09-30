import fs from 'node:fs/promises';
const p='src/main.js';let s=await fs.readFile(p,'utf8');
if(!s.includes('${esc(data.meta.areaConflict)}'))s=s.replace('没有将GCJ-02、BD-09坐标直接混入WGS84。</p>', '没有将GCJ-02、BD-09坐标直接混入WGS84。</p><p>${esc(data.meta.areaConflict)}</p>');
if(!s.includes('分布表 CSV'))s=s.replace('<a href="./data/sources.json" target="_blank">来源表 JSON</a>', '<a href="./data/sources.json" target="_blank">来源表 JSON</a><a href="./data/species-distribution.csv">分布表 CSV</a><a href="./data/missing-models.json" target="_blank">缺失模型</a><a href="./models/ASSET-LICENSES.md" target="_blank">素材许可</a>');
await fs.writeFile(p,s);
const sources=JSON.parse(await fs.readFile('public/data/sources.json','utf8'));
sources.find(s=>s.id==='materials').published=null;
await fs.writeFile('public/data/sources.json',JSON.stringify(sources,null,2));
await fs.mkdir('docs',{recursive:true});
await fs.writeFile('docs/SOURCES.md',`# 资料来源、坐标与采用依据

访问日期：2026-10-01。官方网页和照片仅参考阅读，不随构建产物再分发。独立来源表位于 \`public/data/sources.json\`，每条物种记录含来源 ID、资料日期、核实状态与备注。

| ID | 资料与链接 | 发布 / 数据日期 | 对应区域与用途 |
| --- | --- | --- | --- |
${sources.map(s=>`| ${s.id} | [${s.title}](${s.url}) | ${s.published||'未标注（访问日期不当作发布日期）'} | ${s.usage} |`).join('\n')}

## 地理基准与范围

Three.js 一单位为一米。WGS84 EPSG:4326 原点 (116.332°E,39.938°N)，局部 X 向东、-Z 向北、Y 向上；用地球半径 6378137 米及原点纬度的余弦将经纬差转换为局部米制坐标。约 1.26 公里范围内的切平面近似足以进行公开地图尺度核对，不代表厘米级精度。只有相对地面高程 Y=0，无国家高程基准。OSM 与手册示意图只核对关系，不将 GCJ-02 或 BD-09 经纬度直接混入。不采用照片内像素距离作为实测尺寸。

OSM way 29222967，版本 18，更新时间 2025-12-02；全量公开地理 API bbox 116.315,39.935,116.35,39.958。原节点/对象 ID、更新时间和坐标保留在 \`osm-derived-geography.json\`，可追溯复算。建筑、道路和物种标记各有自己的更新时间，园界较新不表示所有对象同样新。

外包范围约 1256.39 × 862.08 米，多边形面积 735280.72 平方米（73.53 公顷）。2019 公园管理中心简介为约 90 公顷，统计口径、管理范围和图形缺漏未厘清。本工程保持原地理坐标，不缩放凑面积，不把 OSM 园界当作官方权属或公众开放界。海洋馆作为独立设施标注，只建外观；没有将邻近城市道路和设施加入园区内容。

## 核实方法与冲突

官方手册物理第 8 页同时有导览图和正门照片：核对东、西、北区相对关系及南门三拱形态，不量取示意图尺度。政府、旅游网馆舍介绍补充动物与对应馆舍。公开官网照片重点参考正门、狮子/长颈鹿形态和 2026 熊猫馆报道；多角度建筑照片不足，所以立面、隔离类型和高度明确标为估算，未声称已逐馆照片复原。

2026 官方新馆报道明确原雉鸡苑变为熊猫活动区域，采用新功能信息；OSM 旧熊猫馆仍只有 2023 基础轮廓，不能拼成不存在的新馆布局。移除原雉鸡苑作为当前鸟类展区的标记，四个新增主题区精确轮廓未擅自生成。

物种表区分近期官方报道、较早馆舍介绍、明确历史展出和 2020 OSM 标注。猩猩馆“大猩猩”条目明确“曾”，不当作现在；象和鸟类资料未到种，保留未知分类。科学名没有完成独立核对，全部留空。未取得访问日可靠在展表，所有 \`currentConfirmed=false\`。同种多馆/同馆多种用位置数组表示；演示个体位置与来源场馆位置分离。1 只狮子数量和动作仅为模拟。

## 数据更新

普通构建直接使用已生成的本地数据，不要求重新联网。若需要重新采集，OSM API 请求须署名 User-Agent；原始地图与受版权保护的研究图存于被忽略的 \`research/\`。确认原始数据后运行 \`scripts/inspect-research.mjs\`、\`scripts/prepare-data.mjs\` 并重新检查跨表关系。不要以 API 成功作为当前动物在展证明。坐标/场馆变化后需重新验证所有安全落点与围场碰撞。
`);
