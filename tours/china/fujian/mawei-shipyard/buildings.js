import * as T from 'three';
import {box,beam,prism,hippedRoof,archPath,batch} from './geometry.js';
import {metricUV} from './materials.js';
import {buildLandmark} from './landmarks.js';
const shapeGeo=(shape,depth=.1)=>metricUV(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:10}));
function wall(parent,mat,w,h,pos,rotation,openings=[]){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.closePath();for(const o of openings)s.holes.push(archPath(o.x,o.y,o.w,o.h,o.arch??.22));const mesh=new T.Mesh(shapeGeo(s,.38),mat);mesh.position.set(...pos);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function glazing(parent,m,o,depth=.1,frame=m.frame){const glass=new T.Mesh(new T.ShapeGeometry(archPath(o.x,o.y+.035,o.w-.08,o.h-.07,o.arch??.22)),m.glass);glass.position.z=depth;parent.add(glass);
const left=o.x-o.w/2,right=o.x+o.w/2,top=o.y+o.h;for(const x of [left+.055,right-.055])box(parent,frame,.1,o.h-.18,.13,x,o.y+(o.h-.18)/2,depth-.025);
box(parent,frame,o.w,.12,.18,o.x,o.y+.06,depth-.03);
const ring=archPath(o.x,o.y,o.w,o.h,o.arch??.22);ring.holes.push(archPath(o.x,o.y+.11,o.w-.2,o.h-.22,o.arch??.22));const mesh=new T.Mesh(shapeGeo(ring,.12),frame);mesh.position.z=depth-.08;parent.add(mesh);
const columns=o.w>2.3?4:3,rows=o.h>3?7:5;for(let k=1;k<columns;k++)box(parent,frame,.055,o.h-.2,.08,left+o.w*k/columns,o.y+o.h/2,depth-.05);for(let k=1;k<rows;k++)box(parent,frame,o.w-.12,.055,.08,o.x,o.y+o.h*k/rows,depth-.05);
box(parent,m.mortar,o.w+.16,.13,.55,o.x,o.y-.03,-.08);
// Brick arch voussoirs are geometry, not perspective-bearing façade imagery.
const n=11;for(let i=0;i<n;i++){const t=i/(n-1),x=left+t*o.w,y=top-(o.arch??.22)*(2*t-1)**2;const v=box(parent,m.brick,.18,.22,.15,x,y+.14,-.055);v.rotation.z=(.5-t)*.24;}
}
function roof(parent,m,w,d,height,rise,hip){const g=new T.Group();parent.add(g);if(d>w){g.rotation.y=Math.PI/2;hippedRoof(g,m,d+.45,w+.45,height,rise,hip);}else hippedRoof(g,m,w+.45,d+.45,height,rise,hip);return g;}
export function buildingFrame(b,data){const {a,b:bb,scale,anchor}=data.planRegistration,px=b.frame.x-anchor[0],py=b.frame.y-anchor[1];return {x:a*px+bb*py,z:-bb*px+a*py,w:b.frame.width,d:b.frame.depth,angle:b.frame.angle};}
export function buildBuilding(b,data,m){if(b.kind)return buildLandmark(b,data,m);const f=buildingFrame(b,data),g=new T.Group();g.position.set(f.x,0,f.z);g.rotation.y=f.angle;g.userData={id:b.id,evidence:b.evidence};const w=f.w,d=f.d,h=b.height,detail=new T.Group();g.add(detail);
if(b.id==='huyuan'||b.id==='engine'){
 const huyuan=b.id==='huyuan',front=[];if(huyuan){for(let i=0;i<7;i++){const x=(i-3)*w/7;front.push({x,y:.1,w:i===3?3.2:2.85,h:4.45,arch:.35});front.push({x,y:6.05,w:1.95,h:3.45,arch:.17});}}else for(let i=0;i<9;i++)front.push({x:(i-4)*d/9,y:.12,w:2.85,h:3.95,arch:.22});
 const frontGroup=new T.Group();detail.add(frontGroup);
 if(huyuan){wall(g,m.brick,w,h,[0,0,-d/2],0,front);frontGroup.position.z=-d/2;wall(g,m.brick,w,h,[0,0,d/2],Math.PI,front);const back=new T.Group();back.position.z=d/2;back.rotation.y=Math.PI;detail.add(back);front.forEach(o=>glazing(back,m,o));
  const side=[];for(let i=0;i<4;i++)for(let j=0;j<2;j++)side.push({x:(i-1.5)*d/4,y:j?6.05:.4,w:1.75,h:j?3.45:3.8});for(const sideSign of [-1,1]){wall(g,m.brick,d,h,[sideSign*w/2,0,0],sideSign<0?Math.PI/2:-Math.PI/2,side);const face=new T.Group();face.position.x=sideSign*w/2;face.rotation.y=sideSign<0?Math.PI/2:-Math.PI/2;detail.add(face);side.forEach(o=>glazing(face,m,o));}
  for(const z of [-d/2-.08,d/2+.08]){for(const y of [5.05,5.22,9.97,10.12])box(detail,m.mortar,w+.35,y>9?.18:.12,.38,0,y,z);for(let i=0;i<=7;i++){const x=(i-3.5)*w/7;box(detail,m.brick,.39,9.8,.15,x,4.95,z);box(detail,m.mortar,.49,.16,.24,x,5.58,z-.03);box(detail,m.mortar,.52,.17,.25,x,9.78,z-.03);box(detail,m.mortar,.45,.58,.38,x,10.45,z);}}
  for(const x of [-w/2-.1,w/2+.1])for(const y of [5.1,10.1])box(detail,m.mortar,.38,.18,d+.45,x,y,0);
  // Five brick courses of parapet, discrete raised caps, hipped tile roof.
  for(const z of [-d/2,d/2])box(detail,m.mortar,w+.5,.24,.36,0,10.24,z);
  // Central historic entrance is closed; an interior is not claimed by this exterior model.
  box(frontGroup,m.frame,3.02,2.75,.09,0,1.55,.13);for(let i=0;i<8;i++)box(frontGroup,m.wood,.025,2.6,.03,-1.3+i*.37,1.6,.03);
 }else{wall(g,m.brick,d,h,[w/2,0,0],-Math.PI/2,front);frontGroup.position.x=w/2;frontGroup.rotation.y=-Math.PI/2;wall(g,m.brick,d,h,[-w/2,0,0],Math.PI/2,front);const back=new T.Group();back.position.x=-w/2;back.rotation.y=Math.PI/2;detail.add(back);front.forEach(o=>glazing(back,m,o));for(const z of [-d/2,d/2])wall(g,m.brick,w,h,[0,0,z],z<0?0:Math.PI,[]);for(const x of [-w/2,w/2])box(detail,m.mortar,.48,.18,d+.5,x,h-.08,0);}
 front.forEach(o=>glazing(frontGroup,m,o));roof(g,m.roof,w,d,h,b.roofRise,huyuan);box(g,m.dark,w-.75,.15,d-.75,0,h-.35,0);box(g,m.dark,w-.65,.12,d-.65,0,.08,0);
}else if(b.id==='iron'){
 // The current protected shell has two ridges and graded ceramic/clear glazing.
 box(g,m.dark,w-.6,.18,d-.6,0,.09,0);for(const sx of [-1,1]){const roofG=new T.Group();roofG.position.x=sx*w/4;g.add(roofG);roof(roofG,m.ironGlass,w/2,d,h,b.roofRise,false);}
 for(const x of [-w/2,w/2]){box(g,m.ironGlass,.13,h,d,x,h/2,0);box(detail,m.rust,.28,.32,d,x,h-.1,0);for(let j=0;j<=14;j++)box(detail,m.rust,.18,h,.18,x,h/2,-d/2+j*d/14);
  for(let row=0;row<24;row++)for(let col=0;col<60;col++){const amount=col/59,pattern=(col*13+row*7)%31/31;if(pattern<amount*.96){const bw=(col%3===0?1.035:.48),bh=.24;box(detail,m.rust,.15,bh,bw,x+(x>0?.05:-.05),.28+row*.24,-d/2+(col+.5)*d/60);}}
 }
 for(const z of [-d/2,d/2]){box(g,m.ironGlass,w,h,.13,0,h/2,z);for(let j=0;j<12;j++)box(detail,m.rust,.13,h,.15,-w/2+j*w/11,h/2,z);}
 // Documented 3 rows x 15 columns of historic steel members; dimensions estimated.
 for(let j=0;j<15;j++){const z=-d/2+.8+j*(d-1.6)/14;for(const x of [-w/2+.8,0,w/2-.8]){box(detail,m.rust,.19,h-.25,.28,x,h/2,z);box(detail,m.stone,.52,.65,.52,x,.325,z);}
  for(const sx of [-1,1]){beam(detail,m.rust,[sx*w/2-.4*sx,h-.3,z],[sx*w/4,h+2,z],.06);beam(detail,m.rust,[0,h-.3,z],[sx*w/4,h+2,z],.06);beam(detail,m.rust,[0,h-.35,z],[sx*w/2-.4*sx,h-.35,z],.05);}}
}else if(b.id==='museum'){
 // Four-storey converted warehouse. Rust-colour aluminium and pale stone-effect panels.
 for(const z of [-d/2,d/2])box(g,m.plaster,w,h,.38,0,h/2,z);box(g,m.plaster,.38,h,d,w/2,h/2,0);box(g,m.rust,.4,6.1,d+.2,w/2,h-3.05,0);box(g,m.dark,w-.4,.18,d-.4,0,.1,0);roof(g,m.metal,w-.3,d-.3,h-.15,.5,false);
 const facade=new T.Group();facade.position.x=-w/2-.11;facade.rotation.y=Math.PI/2;g.add(facade);box(facade,m.plaster,d,6.2,.35,0,7.1,.12);box(facade,m.rust,d,4.1,.35,0,h-2.05,.05);box(facade,m.rust,d,.5,.4,0,10.45,-.04);box(facade,m.glass,d-3,3.8,.18,0,2.05,-.08);box(facade,m.glass,d-4,5.4,.2,0,13.1,-.08);box(facade,m.mortar,d-3,.22,.6,0,10.65,-.22);
 for(let j=0;j<26;j++){const x=-d/2+2+j*(d-4)/25;box(facade,m.metal,.08,5.4,.26,x,13.1,-.05);box(facade,m.metal,.08,3.7,.22,x,2.1,-.05);}
 for(let j=0;j<25;j++){const x=-d/2+2.5+j*(d-5)/25;box(detail,m.mortar,.035,6,.025,-w/2-.35,7.1,x);}
 box(facade,m.rust,5.8,7,.7,-d*.08,3.5,-.42);box(facade,m.glass,3.1,3.9,.06,-d*.08,1.97,-.82);
 for(let i=0;i<4;i++)box(detail,m.stone,w+.6,.14,d+.6,0,i*.15+.07,0);
}else if(b.id==='pipe15'){
 box(g,m.brick,w,h,d);roof(g,m.metal,w,d,h,b.roofRise,false);for(const x of [-w/2,w/2]){const face=new T.Group();face.position.x=x;face.rotation.y=x<0?Math.PI/2:-Math.PI/2;detail.add(face);for(let i=0;i<6;i++){const u=(i-2.5)*d/6;for(const y of [2.0,6.3]){box(face,m.glass,3.0,2.65,.14,u,y,-.045);for(const xx of [u-1.55,u,u+1.55])box(face,m.metal,.1,2.65,.2,xx,y,-.13);for(const yy of [y-1.36,y,y+1.36])box(face,m.metal,3.2,.1,.2,u,yy,-.13);}}
for(let i=0;i<7;i++)box(face,m.mortar,.27,h,.2,(i-3)*d/6,h/2,-.08);box(face,m.mortar,d+.2,.25,.3,0,4.03,-.1);box(face,m.mortar,d+.3,.22,.5,0,h-.13,-.1);}
}else if(b.id==='library'){
 box(g,m.grayBrick,w,h,d);roof(g,m.metal,w,d,h,b.roofRise,false);const face=new T.Group();face.position.x=w/2+.02;face.rotation.y=-Math.PI/2;g.add(face);for(let j=0;j<12;j++){const x=(j-5.5)*d/12;for(const [y,hh] of [[1.9,2.5],[5.5,1.45]]){box(face,m.glass,3.1,hh,.1,x,y,-.07);for(const xx of [x-1.6,x,x+1.6])box(face,m.blueFrame,.08,hh,.14,xx,y,-.12);box(face,m.blueFrame,3.2,.09,.15,x,y-hh/2,-.11);}}
 box(face,m.dark,8.6,1.55,.24,0,4.2,-.2);box(face,m.glass,4.5,2.9,.19,0,1.6,-.3);for(const sx of [-1,1]){box(face,m.blueFrame,1.4,2.9,.15,sx*3,1.6,-.48);beam(face,m.blueFrame,[sx*2.4,.2,-.57],[sx*3.6,2.9,-.57],.07);}labelSign(face,'船政书局',8,1.2,[0,4.2,-.33],0,m);
}else{
 // Exact OSM polygons retained for secondary building masses. No invented ornament.
 const p=b.footprint.map(v=>{const dx=v[0]-f.x,dz=v[1]-f.z,c=Math.cos(f.angle),s=Math.sin(f.angle);return [c*dx-s*dz,s*dx+c*dz];});prism(g,b.id==='theatre'?m.brick:m.plaster,p,h);roof(g,b.id==='theatre'?m.roof:m.metal,w,d,h,b.roofRise,false);
 if(b.id==='theatre'){for(const x of [-w/2,w/2]){const face=new T.Group();face.position.x=x+(x<0?-.03:.03);face.rotation.y=x<0?Math.PI/2:-Math.PI/2;detail.add(face);for(let i=0;i<10;i++){const q=(i-4.5)*d/10;box(face,m.glass,3.3,3.1,.14,q,4.9,-.1);box(face,m.mortar,3.6,.17,.28,q,3.28,-.05);}}
 }
}
g.remove(detail);batch(g);batch(detail);g.add(detail);
g.userData.frame=f;g.userData.detail=detail;return g;}
export function labelSign(parent,text,w,h,position,angle=0,m){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#353631';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#ddd0b4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='66px serif';ctx.fillText(text,512,66);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const mat=new T.MeshStandardMaterial({map:tex,roughness:.95}),mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);mesh.position.set(...position);mesh.rotation.y=angle;parent.add(mesh);return mesh;}
