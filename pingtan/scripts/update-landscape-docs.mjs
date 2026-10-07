import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('public/data/landmarks.json','utf8'));
let html=fs.readFileSync('index.html','utf8');
if(!html.includes('id="landscape-inventory"'))html=html.replace('<p id="data-stats"></p>','<h3>全岛景观覆盖清单</h3><p>按官方景点与海岸清单核对，定位点、近似地貌和资料缺口分别记录。镜沙洞口和仙人井中心尚无实测坐标；小数位数不代表定位精度。仙人井局部约100米范围以近似井体替换粗DEM，原始高程文件保持原样。</p><ul id="landscape-inventory"></ul><div class="dialog-links"><a href="./docs/LANDSCAPES.md" target="_blank">逐景点依据与缺失 ↗</a></div><p id="data-stats"></p>');
fs.writeFileSync('index.html',html);
const css=`
#place-search{display:block;margin:12px;width:calc(100% - 24px);padding:8px 10px;border:1px solid var(--border);border-radius:4px;background:#16363c;color:#e3e9da;font-size:11px}
.region-heading{padding:9px 15px 5px;font-size:9px;letter-spacing:3px;color:#a7bfad}
.place-foot button{font-size:10px;padding:0;text-decoration:underline;text-underline-offset:3px}
#landmark-reference{pointer-events:auto;display:block;margin-top:13px;font-size:10px;text-decoration:underline;text-underline-offset:3px;width:max-content}
#landscape-inventory{padding-left:18px;margin:20px 0}#landscape-inventory li{font-size:11px;line-height:1.7;margin-bottom:13px}#landscape-inventory li b,#landscape-inventory li span{display:block}#landscape-inventory li span{color:#687567;font-size:10px}
@media(max-width:600px){.places-panel{max-height:40vh}.places-body{max-height:calc(40vh - 42px);overflow-y:auto}.location-card p{max-width:220px}.location-card #accuracy-chip{display:inline-block;max-width:230px;line-height:1.6}.region-heading{padding:7px 10px 4px}}
`;
if(!fs.readFileSync('src/style.css','utf8').includes('#place-search'))fs.appendFileSync('src/style.css',css);
let doc=`# 全岛景观清单与还原边界\n\n本轮先按平潭官方景点总览、六条精品海岸线及官方地貌报道建立清单，再统一扩展场景。清单不宣称穷尽所有自然岩石或村落。可定位浏览15处；另列尚缺精模的景观与主岛范围外景点。\n\n1单位=1米；真实OSM岸线、道路、沙滩与岛岸轮廓不改造。地貌表面变化只用于标明的局部近似模型，绝不作测绘数据输出。\n\n| 景观 | 区域 | 当前覆盖 | 尚缺或近似 |\n|---|---|---|---|\n`;
for(const p of data.inventory)doc+=`|${p.name}|${p.region}|${p.status}|${p.missing}|\n`;
doc+='\n## 新增模型的依据\n\n';
for(const p of data.places){doc+=`### ${p.name}\n\n${p.description}\n\n- 空间依据：${p.source}。\n- 分类：${p.accuracy}。${p.positionClass==='approximate'?'镜头与模型使用区域约位，不能作为实测洞口/中心/石景坐标。':'源数据未声明测绘精度。'}\n`;if(p.modelDimensions)doc+=`- 米制尺寸：${JSON.stringify(p.modelDimensions)}。\n`;doc+=p.references.map(u=>`- [参考资料](${u})`).join('\n')+'\n\n';}
doc+=`## 已对齐与未对齐\n\n镜沙区域与OSM沙滩w1285652150、w1285652151、真实东端岩岸及2016影像一致；海蚀洞自身的位置和形状为区域约位。洞腔约8×14米范围替换粗DEM表面，照片估计的宽/高/深约8/7/14米不具有测量精度。仙人井区域使用东海仙境OSM景区及仙人洞观景点作为约位依据，井口中心、崖壁局部高程和步道并未达到测绘对齐。约50米口径/43米井深采纳2025年官方报道，不能把原始DEM的粗糙地表称作实际井深。周边约100米范围内的近似井体覆盖视觉地表；原始高程文件保持原样。\n\n石牌洋位于源数据真实独立小礁盘，双柱分别约33米、17米；实际碑形曲面、宽厚和柱距仅参考照片。猴研岛使用w1180027916真实闭合岛岸；象鼻湾使用w511682172真实狭长沙滩，与历史影像核对西向沙堤，当前潮位未知。所有场景的水色依岸距模拟，并无实测近岸水深。\n\n洞壁没有完整相机碰撞；井底涌潮目前仅小幅水面动画，没有流体仿真。精细建模仍需近期无人机正射/倾斜影像、1–5米DEM和地貌测量；大福湾桥梁不能用住宿POI替代定位。海坛天神在塘屿岛、通天门在大练岛，未挪到主岛冒充完成。\n\n## 来源与权利\n\nOSM轮廓为ODbL 1.0；2016 EOX影像为CC BY 4.0；自编几何代码依项目AGPL-3.0。官方报道提供景观事实和近似尺寸，版权照片只作本地比对，未复制到运行资源或交付压缩包。镜沙洞腔参考Trip.com实拍游记，仙人井参考携程景区照片，石牌洋参考平潭旅游宣传照片；各项链接列于上方。高德页面只用于少量地点的区域核对，未使用其地图瓦片、未把其内容标作开放ODbL数据。\n\n`;
for(const u of data.references)doc+=`- [官方景点/地貌资料](${u})\n`;
fs.writeFileSync('docs/LANDSCAPES.md',doc);fs.writeFileSync('public/docs/LANDSCAPES.md',doc);
for(const name of ['SOURCES','ACCURACY']){
 let s=fs.readFileSync('docs/'+name+'.md','utf8');if(!s.includes('LANDSCAPES.md'))s+='\n\n## 景观统一扩展\n\n15处浏览定位与19项景观清单详见 [逐景点依据及缺失](LANDSCAPES.md)。镜沙洞口、仙人井中心与井壁、石牌洋双柱、猴研岛岩体和南寨山岩群均有近似处理；原始DEM、主岛岸线和地理比例保持源数据。仙人井周边约100米内的视觉井体替换为照片/报道近似地貌，并使用对应视觉碰撞高度。\n';fs.writeFileSync('docs/'+name+'.md',s);fs.writeFileSync('public/docs/'+name+'.md',s);
}
if(!fs.readFileSync('.gitignore','utf8').includes('research/*-reference.*'))fs.appendFileSync('.gitignore','\nresearch/*-reference.*\n');
console.log('Landscape inventory, reference links and explicit geometry limits recorded.');
