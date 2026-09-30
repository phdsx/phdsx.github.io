import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync('yuanmingyuan/research/osm.json'));
let list=d.elements.filter(e=>e.tags?.name&&!e.tags.highway&&!e.tags.shop).map(e=>({id:e.id,type:e.type,name:e.tags.name,lat:e.lat,lon:e.lon,center:e.geometry?e.geometry.reduce((a,p)=>[a[0]+p.lon/e.geometry.length,a[1]+p.lat/e.geometry.length],[0,0]):null,tags:e.tags}));
console.log(list.filter(e=>/水法|远瀛|海晏|谐奇|黄花|九[洲州]|蓬岛|福海|方壶|安[佑祐]|正大|含经|万方|正觉|海岳|茹古|天然|上下|绮春|长春|圆明|碧桐|文源|武陵/.test(e.name)));
fs.writeFileSync('yuanmingyuan/research/names.json',JSON.stringify(list,null,2));
