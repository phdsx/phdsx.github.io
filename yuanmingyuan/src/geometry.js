import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export class Builder{
 constructor(materials){this.materials=materials;this.pieces=new Map()}
 add(key,g,x=0,y=0,z=0,rx=0,ry=0,rz=0){g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);if(g.index)g=g.toNonIndexed();if(!g.attributes.uv){g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2))}if(!this.pieces.has(key))this.pieces.set(key,[]);this.pieces.get(key).push(g);return g}
 box(key,w,h,d,x,y,z,ry=0){return this.add(key,new T.BoxGeometry(w,h,d),x,y,z,0,ry)}
 cylinder(key,r1,r2,h,x,y,z){return this.add(key,new T.CylinderGeometry(r1,r2,h,16),x,y,z)}
 sphere(key,r,x,y,z,sx=1,sy=1,sz=1){let g=new T.SphereGeometry(r,12,8);g.scale(sx,sy,sz);return this.add(key,g,x,y,z)}
 lathe(key,pts,x,y,z){return this.add(key,new T.LatheGeometry(pts.map(p=>new T.Vector2(...p)),24),x,y,z)}
 curve(key,pts,r=.08){let c=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));return this.add(key,new T.TubeGeometry(c,Math.max(12,pts.length*4),r,6,false))}
 finish(){let root=new T.Group(),far=new T.Group();for(const [key,gs]of this.pieces){const clean=gs.map(g=>g.index?g.toNonIndexed():g);let merged=mergeGeometries(clean,false);let mesh=new T.Mesh(merged,this.materials[key]);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);const coarse=clean.filter(g=>{g.computeBoundingBox();return g.boundingBox.getSize(new T.Vector3()).length()>3});if(coarse.length){const mg=mergeGeometries(coarse,false),mm=new T.Mesh(mg,this.materials[key]);mm.receiveShadow=true;far.add(mm)}for(const g of new Set([...clean,...gs]))if(g!==merged)g.dispose()}root.userData.far=far;return root}
}
export function roofGeo(w,d,h){const verts=[],uv=[],idx=[];const rings=12,segments=20;for(let j=0;j<=rings;j++){let u=j/rings,ww=w*(1-.34*u),dd=d*(1-u);for(let i=0;i<=segments*4;i++){let s=i/(segments),edge=Math.floor(s)%4,v=s%1;let x,z;if(edge===0){x=-ww/2+ww*v;z=dd/2}else if(edge===1){x=ww/2;z=dd/2-dd*v}else if(edge===2){x=ww/2-ww*v;z=-dd/2}else{x=-ww/2;z=-dd/2+dd*v}const corner=Math.pow(Math.abs(v-.5)*2,8);let yy=h*(.18*u+.82*u*u)+.85*corner*(1-u)**3;verts.push(x,yy,z);uv.push(x/.8,z/.8);if(j<rings&&i<segments*4){let a=j*(segments*4+1)+i,b=a+segments*4+1;idx.push(a,b,a+1,a+1,b,b+1)}}}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}
export function chineseHall(b,x,z,w,d,{height=4.7,double=false,y=0,roof='roof',open=false}={}){
 b.box('stone',w+3,.55,d+3,x,y+.275,z);for(let i=0;i<4;i++)b.box('stone',w*.3,.17,(4-i)*.48,x,y+.08+i*.14,z+d/2+1.5+i*.03);
 if(!open)b.box('wall',w-.8,height-.4,d-.8,x,y+height/2+.7,z);
 const bays=Math.max(3,Math.round(w/4.2)),bw=w/bays;
 for(let i=0;i<=bays;i++)for(const side of [-1,1]){const xx=x-w/2+bw*i,zz=z+side*d/2;b.cylinder('wood',.21,.27,height,xx,y+height/2+.55,zz);b.box('beam',.6,.45,.85,xx,y+height+.4,zz);b.box('beam',1.25,.19,.9,xx,y+height+.7,zz)}
 for(const side of [-1,1]){b.box('beam',w+1.2,.32,.36,x,y+height+.5,z+side*d/2);b.box('wood',w+1.4,.22,.36,x,y+1.3,z+side*(d/2+.08));if(!open)for(let i=0;i<bays;i++){const xx=x-w/2+bw*(i+.5),zz=z+side*(d/2-.28);b.box('window',bw-.45,2.8,.09,xx,y+2.35,zz);for(let k=0;k<=4;k++)b.box('wood',.055,2.8,.14,xx-bw*.42+k*bw*.21,y+2.35,zz+side*.05);for(let k=0;k<8;k++)b.box('wood',bw-.4,.04,.14,xx,y+1.05+k*.38,zz+side*.05)}}
 b.add(roof,roofGeo(w+4.2,d+4.5,3.5),x,y+height+1,z);b.curve('brick',[[x-w*.35,y+height+4.45,z],[x,y+height+4.52,z],[x+w*.35,y+height+4.45,z]],.19);
 for(const a of [-1,1])for(const c of [-1,1]){b.curve('roof',[[x+a*w*.33,y+height+4.4,z],[x+a*w*.5,y+height+2.5,z+c*d*.35],[x+a*(w/2+2),y+height+1.85,z+c*(d/2+2)]],.11);b.sphere('gold',.2,x+a*(w/2+2),y+height+2.1,z+c*(d/2+2),.6,1.8,.6)}
 if(double){b.box('wood',w*.7,2.8,d*.65,x,y+height+3.9,z);b.add(roof,roofGeo(w*.78,d*.78,3),x,y+height+5.3,z);b.curve('brick',[[x-w*.28,y+height+8.25,z],[x+w*.28,y+height+8.25,z]],.2)}
}
export function balustrade(b,points,y=1){for(let j=1;j<points.length;j++){let a=points[j-1],c=points[j],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);for(let i=0;i<=Math.ceil(len/1.6);i++){let t=i/Math.ceil(len/1.6),x=a[0]+dx*t,z=a[1]+dz*t;b.box('stone',.2,1,.2,x,y+.5,z);b.sphere('stone',.15,x,y+1.02,z)}b.box('stone',.14,.12,len,(a[0]+c[0])/2,y+.9,(a[1]+c[1])/2,yaw);b.box('stone',.12,.12,len,(a[0]+c[0])/2,y+.32,(a[1]+c[1])/2,yaw)}}
export function column(b,x,z,h,y=0,r=.32){b.box('stone',r*3,.35,r*3,x,y+.18,z);b.lathe('limestone',[[r*1.2,0],[r*1.2,.17],[r,.28],[r*.84,.42],[r*.76,h-.7],[r*1.4,h-.6],[r*1.45,h-.4],[r*1.15,h-.15]],x,y+.35,z);b.box('limestone',r*3.4,.22,r*3.4,x,y+h+.15,z);for(let i=0;i<12;i++){let t=i*Math.PI/6;b.cylinder('stone',.018,.018,h-.9,x+Math.cos(t)*r*.82,y+h/2,z+Math.sin(t)*r*.82)}for(let side of [-1,1])b.curve('limestone',[[x+side*r*1.3,y+h-.2,z+r*.9],[x+side*r*1.6,y+h-.42,z+r*.9],[x+side*r*1.1,y+h-.56,z+r*.9],[x+side*r*.85,y+h-.3,z+r*.9]],.075)}
export function windowArch(b,x,y,z,w,h){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.lineTo(-w/2,0);b.add('window',new T.ShapeGeometry(s,16),x,y,z);const pts=[[-w/2,0],[-w/2,h-w/2]];for(let i=0;i<=20;i++){const t=Math.PI-i*Math.PI/20;pts.push([Math.cos(t)*w/2,h-w/2+Math.sin(t)*w/2])}pts.push([w/2,0]);b.curve('limestone',pts.map(p=>[p[0]+x,p[1]+y,z+.06]),.09);b.box('limestone',w+.3,.18,.35,x,y-.1,z);for(let i=1;i<4;i++)b.box('wood',.035,h-w/2,.04,x-w/2+w*i/4,y+(h-w/2)/2,z+.02);for(let i=0;i<5;i++)b.box('wood',w,.035,.04,x,y+.4+i*.5,z+.03)}
export function westernHall(b,x,z,w,d,{levels=2,centralRoof=true,y=0}={}){
 const floor=4.1,total=levels*floor;
 b.box('stone',w+2,1.2,d+2,x,y+.6,z);b.box('wall',w,total,d,x,y+1.2+total/2,z);
 for(let l=0;l<=levels;l++)b.box('limestone',w+1,.25,d+1,x,y+1.3+l*floor,z);
 for(let l=0;l<levels;l++)for(let i=0;i<Math.round(w/4.3);i++){let xx=x-w/2+2.15+i*(w-4.3)/Math.max(1,Math.round(w/4.3)-1);windowArch(b,xx,y+1.9+l*floor,z+d/2+.02,2,2.9);column(b,xx+2.05,z+d/2+.22,3.8,y+1.2+l*floor,.2)}
 for(const side of [-1,1])for(let i=0;i<3;i++){let frontZ=z-d/2+(i+.5)*d/3;let block=new Builder(b.materials);windowArch(block,0,y+2,0,2,2.9);for(const [key,gs] of block.pieces)for(let g of gs)b.add(key,g,x+side*(w/2+.03),0,frontZ,0,side*Math.PI/2)}
 for(let i=0;i<=Math.floor(w/1.4);i++){let xx=x-w/2+i*w/Math.floor(w/1.4);b.box('limestone',.14,.95,.2,xx,y+total+1.8,z+d/2+.2)}b.box('limestone',w+1,.22,.5,x,y+total+2.3,z+d/2+.2);
 if(centralRoof){const rw=w*.56,rd=d*.92;b.box('wall',rw,2.9,rd,x,y+total+2.4,z);for(let i=-1;i<=1;i++)windowArch(b,x+i*rw/3,y+total+1.8,z+rd/2+.02,1.6,2.3);b.add('yellowRoof',roofGeo(rw+2,rd+2,2.8),x,y+total+3.8,z);b.curve('gold',[[x-rw*.33,y+total+6.5,z],[x+rw*.33,y+total+6.5,z]],.15)}
 for(let i=0;i<8;i++)b.box('stone',w*.38,.16,(8-i)*.55,x,y+.08+i*.145,z+d/2+1+(i*.02));
}
