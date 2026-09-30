import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const layout=read('public/data/layout.json'),config=read('public/data/landmarks.json'),sources=read('public/data/sources.json');
const specs=[
 ['jingren','景仁宫','236509',5,'gablehip','diamond','两进院；正殿五间歇山顶、双交四椀菱花门窗。'],
 ['chengqian','承乾宫','236438',5,'gablehip','diamond','两进院；正殿五间歇山顶、五个走兽。'],
 ['yonghe','永和宫','236518',5,'gablehip','rect','正殿五间歇山顶，前接三间抱厦。抱厦保留地图轮廓，屋面尚未单独细化。'],
 ['zhongcui','钟粹宫','236484',5,'gablehip','rect','五间歇山顶、前出廊；冰裂纹及步步锦窗。本模型窗格仅简化步步锦，未雕刻冰裂纹。'],
 ['jingyang','景阳宫','236511',3,'hip','rect','正殿三间庑殿顶，区别于东六宫其余五宫。'],
 ['yongshou','永寿宫','236450',5,'gablehip','diamond','正殿五间歇山顶；双交四椀菱花门窗简化为菱形格网。'],
 ['yikun','翊坤宫','236517',5,'gablehip','rect','正殿五间歇山顶、前后出廊；现存格局经体和殿与储秀宫相连。'],
 ['chuxiu','储秀宫','236486',5,'gablehip','rect','正殿五间歇山顶、前出廊；采用晚清连通翊坤宫后的现存格局。'],
 ['taiji','太极殿','236475',5,'gablehip','rect','正殿五间歇山顶、前后出廊；不增补已拆的长春宫宫门。'],
 ['changchun','长春宫','236436',5,'gablehip','rect','正殿五间歇山顶、前出廊；与体元殿及太极殿连通。'],
 ['xianfu','咸福宫','236507',3,'hip','rect','正殿三间庑殿顶，与东六宫景阳宫相对；后殿同道堂仍属轮廓示意。']
];
for(const [id,name,sourceId,bays,roof,lattice,description] of specs){
 const aliases=name==='承乾宫'?['承干宫']:[],foot=layout.buildings.find(b=>b.name===name||aliases.includes(b.name));
 if(!foot)throw new Error('Missing footprint '+name);
 const item={id,name,aliases,sourceId,roof,double:false,bays,lattice,w:+(foot.w-3).toFixed(2),d:+(foot.d-3).toFixed(2),h:roof==='hip'?10.5:9.5,base:.8,platformMargin:2,
 description:description+'位置取原地图轮廓中心；宽深按屋檐包围框各扣3米估算，台高0.8米、通体高度9.5/10.5米为保守体量估算。彩画、斗栱及逐扇门窗尚未精确复原。',status:'屋顶/开间核对；尺寸估算',dimensionEvidence:{method:'OSM屋檐包围框宽深各减3m；高/台基按照片体量估算',confidence:'低',footprintId:foot.id}};
 const index=config.items.findIndex(x=>x.id===id);if(index<0)config.items.push(item);else config.items[index]=item;
 if(!sources.sources.some(s=>s.title===name))sources.sources.push({title:name,url:`https://www.dpm.org.cn/explore/building/${sourceId}.html`,support:description,reliability:'机构形制与开间高；平面尺寸及构件估算低',license:'事实转述；图片仅研究，不作为纹理'});
}
const yangxin=config.items.find(x=>x.id==='yangxin');Object.assign(yangxin,{sourceId:'236442',sourceURL:'https://www.dpm.org.cn/explore/building/236442.html',w:36,d:12,bays:3,frontPosts:9,baysDepth:3,platformMargin:2,lattice:'diamond',description:'官方前殿通面阔36米、通进深12米，三间；前檐每间增加两方柱，外观看似九间。尺寸配置采用官方值；高度、柱距与出檐估算。明间与西次间卷棚抱厦尚未精确还原，后殿保留地图示意，室内关闭。',status:'前殿宽深/开间核对；抱厦未精细还原'});
for(const [id,depth] of [['taihe',5],['taihemen',4],['baohe',5],['zhonghe',3],['qianqing',5],['qianqingmen',3],['jiaotai',3],['kunning',3],['qinan',3]])config.items.find(x=>x.id===id).baysDepth=depth;
const ys=sources.sources.find(s=>s.title==='养心殿');ys.url=yangxin.sourceURL;ys.support='前殿36×12米，三间面阔；前檐每间加两方柱，外观看似九间；明间与西次间卷棚抱厦';
sources.checked='2026-09-30';
for(const conflict of ['OSM承干宫/承干门为异写，建筑配置以官方承乾宫命名并保留承干宫别名；未修改原始轮廓。','养心殿前殿公开36×12米，地图屋檐包围框36.08×15.97米，二者口径不同；模型主体用官方柱网总尺寸并另加出檐，未知抱厦不冒充精细还原。'])if(!sources.conflicts.includes(conflict))sources.conflicts.push(conflict);
fs.writeFileSync('public/data/landmarks.json',JSON.stringify(config,null,2)+'\n');fs.writeFileSync('public/data/sources.json',JSON.stringify(sources,null,2)+'\n');
console.log('Updated 11 side palaces and Yangxin dimensions.');
