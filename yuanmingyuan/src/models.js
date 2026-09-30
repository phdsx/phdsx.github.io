import * as T from 'three';
import {Builder,chineseHall,westernHall,column,windowArch,balustrade} from './geometry.js';
function shellShape(){let s=new T.Shape();s.moveTo(-13,0);s.lineTo(13,0);s.lineTo(13,2.3);s.bezierCurveTo(9,2.7,9,5.5,7,5.4);s.lineTo(5.3,5.1);s.lineTo(5.3,7.8);s.lineTo(3.4,7.8);s.bezierCurveTo(3.5,9.3,2.3,9.6,1.6,10.3);s.bezierCurveTo(1.8,11.1,.4,11.8,0,11.7);s.bezierCurveTo(-.4,11.8,-1.8,11.1,-1.6,10.3);s.bezierCurveTo(-2.3,9.6,-3.5,9.3,-3.4,7.8);s.lineTo(-5.3,7.8);s.lineTo(-5.3,5.1);s.lineTo(-7,5.4);s.bezierCurveTo(-9,5.5,-9,2.7,-13,2.3);s.closePath();return s}
export function fountainBasin(b,w,d,x=0,z=0){const pts=[];const shape=new T.Shape();for(let i=0;i<=64;i++){let t=i*Math.PI*2/64,r=1+.07*Math.cos(4*t),xx=Math.cos(t)*w/2*r,zz=Math.sin(t)*d/2*r;pts.push([x+xx,.26,z+zz]);if(i===0)shape.moveTo(xx,-zz);else shape.lineTo(xx,-zz)}b.curve('stone',pts,.25);b.curve('limestone',pts.map(p=>[p[0],p[1]+.32,p[2]]),.14);b.add('pond',new T.ShapeGeometry(shape,32),x,.3,z,-Math.PI/2);}
function cascade(b,x,z,tiers,height){for(let i=0;i<tiers;i++){let y=.55+i*height/tiers,r=1.45*(1-i/(tiers+2));b.lathe('limestone',[[0,0],[r*.65,.02],[r,.1],[r,.22],[r*.8,.25],[r*.4,.06]],x,y,z);b.cylinder('limestone',.13,.16,height/tiers,x,y+height/tiers/2,z)}b.sphere('gold',.18,x,height+.9,z,1,1.7,1)}
function scroll(b,x,y,z,sign=1,scale=1){let pts=[];for(let i=0;i<=60;i++){let t=i/60*Math.PI*3.7,r=scale*(1-i/65);pts.push([x+sign*Math.cos(t)*r,y+Math.sin(t)*r,z])}b.curve('limestone',pts,.065*scale)}
function dashuifa(b,jets){const body=shellShape();b.add('limestone',new T.ExtrudeGeometry(body,{depth:1.25,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:2,curveSegments:24}),0,.6,-.8);
 const outline=body.getPoints(180).map(p=>[p.x,p.y+.75,.63]);b.curve('stone',outline,.14);
 for(const s of [-1,1]){column(b,s*3.9,.7,7.3,.6,.34);column(b,s*7.1,.7,4.3,.6,.3);for(let y=1.5;y<4;y+=.65){scroll(b,s*9.3,y,.71,s,.38);scroll(b,s*6,y+.2,.72,-s,.33)}scroll(b,s*1.65,9.4,.7,s,.7);b.box('limestone',2.2,.25,1.5,s*4.1,8.35,-.1);b.sphere('limestone',.4,s*4.1,8.95,-.1,.65,1.6,.65)}
 windowArch(b,0,2,.65,3.6,5.3);b.box('stone',3.65,5.3,.07,0,4.65,.63);
 for(let i=0;i<10;i++)scroll(b,(i%2?1:-1)*(.7+Math.floor(i/2)*.4),1.35,.74,i%2?1:-1,.3);
 cascade(b,0,2.2,7,6.8);fountainBasin(b,33,24,0,14);for(const s of [-1,1]){fountainBasin(b,11,10,s*22,22);b.box('stone',3,.55,3,s*22,.8,22);cascade(b,s*22,22,13,9.1);for(let i=0;i<18;i++){let t=i/18*Math.PI*2;jets.push({a:[s*22+Math.cos(t)*1.4,.8,22+Math.sin(t)*1.4],b:[s*22+Math.cos(t)*4,.2,22+Math.sin(t)*4],h:6.5})}}
 for(let i=0;i<7;i++){let angle=i/7*Math.PI*2;jets.push({a:[Math.cos(angle)*.7,7.8,2.2+Math.sin(angle)*.7],b:[Math.cos(angle)*4,.3,6+Math.sin(angle)*3],h:1.5})}
 // Animal sculptures are deliberately omitted, leaving the sculptural evidence gap explicit.
 for(const side of [-1,1])for(let i=0;i<5;i++){let x=side*(7+i*1.2),z=7+i*2.9;b.box('bronze',.7,.2,.7,x,.4,z);jets.push({a:[x,.8,z],b:[0,1.2,15],h:4.5})}
 b.cylinder('stone',1.1,1.3,.7,0,.4,15);balustrade(b,[[-35,34],[-35,-4]],.2);balustrade(b,[[35,-4],[35,34]],.2);
}
function maze(b){b.box('pave',57,.15,57,0,.12,0);for(let r=6;r<=24;r+=6){for(const side of [-1,1]){for(const off of [-1,1]){b.box('wall',r-3,1.5,.45,off*(r/2+1.5),.95,side*r);b.box('wall',.45,1.5,r-3,side*r,.95,off*(r/2+1.5))}b.box('brick',r-3,.13,.7,-(r/2+1.5),1.75,side*r);b.box('brick',.7,.13,r-3,side*r,1.75,-(r/2+1.5))}}chineseHall(b,0,0,7,7,{height:2.8,open:true,roof:'yellowRoof'});}
function guanshuifa(b){let pts=[];for(let i=0;i<=20;i++){let t=(i/20-.5)*Math.PI*.9;pts.push([Math.sin(t)*10,Math.cos(t)*3-3])}for(let i=1;i<pts.length;i++){let p=pts[i-1],q=pts[i],len=Math.hypot(q[0]-p[0],q[1]-p[1]);b.box('limestone',len+.05,3,.45,(p[0]+q[0])/2,1.6,(p[1]+q[1])/2,Math.atan2(-(q[1]-p[1]),q[0]-p[0]))}b.box('stone',7,.5,5,0,.25,5);for(let side of [-1,1]){column(b,side*12,0,4.5,0,.24);cascade(b,side*12,0,4,3.5)}b.box('bronze',1.5,.3,1.1,0,.9,4.5);b.box('bronze',1.5,1.2,.15,0,1.5,4);}
function chineseSite(b,s){const [w,d]=s.size,name=s.name;const large=['九洲清晏','方壶胜境','含经堂','正大光明','正觉寺','勤政亲贤'].includes(name);
 if(name==='海岳开襟'){b.cylinder('stone',18,18,1.4,0,.7,0);chineseHall(b,0,0,w,d,{height:6,double:true,y:1.4,roof:'yellowRoof'});balustrade(b,[[-18,14],[18,14],[18,-14],[-18,-14],[-18,14]],1.4);return}
 if(name==='万方安和'){const spans=[[0,0],[0,-17],[0,17],[-13,0],[13,0],[-13,-17],[13,17]];for(const [x,z]of spans)chineseHall(b,x,z,8,17,{height:3.5,open:true});return}
 chineseHall(b,0,0,w,d,{double:name==='蓬岛瑶台'||name==='上下天光'||name==='方壶胜境',roof:['方壶胜境','正觉寺'].includes(name)?'yellowRoof':'roof'});
 if(large){let courtyard=30;chineseHall(b,0,courtyard,Math.max(12,w*.58),Math.max(8,d*.65),{height:3.8});chineseHall(b,0,-courtyard,Math.max(14,w*.74),Math.max(9,d*.8),{height:4.5});for(let side of [-1,1]){chineseHall(b,side*(w/2+14),0,8,36,{height:3.6,open:false});for(let i=0;i<8;i++)b.box('pave',2,.08,2,side*(w/2+10),.07,-12+i*4)}b.box('pave',w+32,.1,66,0,.06,0);}
 else if(['天然图画','蓬岛瑶台','武陵春色','玉玲珑馆','曲院风荷'].includes(name)){chineseHall(b,w*.85,14,9,9,{open:true,height:3});chineseHall(b,-w*.8,-18,14,8,{height:3.3})}
}
export function buildSite(s,m){const b=new Builder(m),jets=[];let width=s.size[0],depth=s.size[1],extra=[];
 if(s.kind==='maze'){maze(b);width=57;depth=57}
 else if(s.name==='大水法'){dashuifa(b,jets);width=78;depth=48;extra.push({x:0,z:15,w:35,d:25},{x:-22,z:22,w:12,d:12},{x:22,z:22,w:12,d:12})}
 else if(s.name==='观水法'){guanshuifa(b);width=32;depth=12}
 else if(s.name==='线法山'){b.cylinder('earth',22,27,5,0,2.5,0);chineseHall(b,0,0,9,9,{height:3,y:5,roof:'roof'});width=56;depth=56}
 else if(s.kind==='western'){
  if(s.name==='海晏堂'){const west=new Builder(m);westernHall(west,0,0,40,18,{centralRoof:true});const g=west.finish();g.rotation.y=-Math.PI/2;const root=new T.Group();root.add(g);const details=new Builder(m);fountainBasin(details,19,14,-32,0);for(let side of [-1,1])for(let i=0;i<6;i++){let z=side*(2.4+i*1.15);details.box('stone',.7,.45,.7,-24,.8,z);jets.push({a:[-24,1.3,z],b:[-33,.1,0],h:4})}westernHall(details,24,0,20,27,{centralRoof:false});root.add(details.finish());extra.push({x:24,z:0,w:20,d:27},{x:-32,z:0,w:21,d:16});return {group:root,jets,obstacles:[{x:0,z:0,w:18,d:40},...extra],extent:70}}
  westernHall(b,0,0,width,depth,{levels:s.name==='养雀笼'?1:2,centralRoof:s.name!=='线法画'});
  if(s.name==='谐奇趣'){for(const side of [-1,1]){westernHall(b,side*24,9,13,10,{levels:1,centralRoof:true});balustrade(b,[[side*17,12],[side*24,12]],1.3)}fountainBasin(b,16,14,0,30);cascade(b,0,30,3,3.5);jets.push({a:[0,4.2,30],b:[5,.2,32],h:1});extra.push({x:0,z:30,w:18,d:16});width=70;depth=50}
 }else chineseSite(b,s);
 if(s.kind==='chinese'&&['九洲清晏','方壶胜境','含经堂','正大光明','正觉寺','勤政亲贤'].includes(s.name)){extra.push({x:0,z:30,w:Math.max(12,width*.58)+3,d:Math.max(8,depth*.65)+3},{x:0,z:-30,w:Math.max(14,width*.74)+3,d:Math.max(9,depth*.8)+3});for(const side of [-1,1])extra.push({x:side*(width/2+14),z:0,w:11,d:39})}
 const group=b.finish();return {group,jets,obstacles:[{x:0,z:0,w:s.kind==='chinese'?s.size[0]+3:width,d:s.kind==='chinese'?s.size[1]+3:depth},...extra],extent:Math.max(width,depth)+35};
}
