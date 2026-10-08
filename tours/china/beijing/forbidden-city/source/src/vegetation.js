import * as THREE from 'three';
import {instances} from './geometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Mapped positions are retained; branch forms are estimated, not botanical scans.
export function vegetation(scene,locations,mats){
 const trunks=[],branches=[],crowns=[];let seed=936;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const segment=(a,b,r,out)=>{const direction=new THREE.Vector3().subVectors(b,a),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());out.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2,sx:r,sy:direction.length(),sz:r,q:q.toArray()});};
 for(const [index,[x,z]] of locations.entries()){
  const height=8.5+(index%5)*.65,spread=index%3===0?4:3.1,lean=(random()-.5)*.7;
  const root=new THREE.Vector3(x,0,z),joint=new THREE.Vector3(x+lean,4,z-.2),top=new THREE.Vector3(x+lean*.8,height-.5,z+.25);
  segment(root,joint,.36,trunks);segment(joint,top,.24,trunks);
  for(let j=0;j<18;j++){
   const angle=j*2.399+random()*.6,level=3.6+j/18*(height-4.2),radius=spread*(.45+.55*Math.sin((level-2)/height*Math.PI)),start=new THREE.Vector3(x+lean*.5,level,z);
   const tip=new THREE.Vector3(x+Math.cos(angle)*radius,level+.4+random(),z+Math.sin(angle)*radius);
   segment(start,tip,.06+random()*.07,branches);
   for(let k=0;k<7;k++){
    const t=.38+k*.1,center=start.clone().lerp(tip,t),width=.46+random()*.46;
    crowns.push({x:center.x+(random()-.5)*.65,y:center.y+(random()-.4)*.8,z:center.z+(random()-.5)*.65,sx:width*(.9+random()*.45),sy:width*(.6+random()*.55),sz:width*(.9+random()*.45),ry:random()*Math.PI,rz:(random()-.5)*.35});
   }
  }
  for(let j=0;j<16;j++)crowns.push({x:x+lean+(random()-.5)*1.8,y:height-.3+random()*.8,z:z+(random()-.5)*1.8,sx:.6,sy:.65,sz:.6,ry:random()*Math.PI});
 }
 // Crossed alpha-tested branch sprays provide small-scale, irregular foliage.
 // These are original procedural cypress-like sprays, not a photographed tree.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
 function twig(x,y,angle,length,depth){
  const ex=x+Math.cos(angle)*length,ey=y+Math.sin(angle)*length;c.strokeStyle=depth>1?'#66704b':'#576c45';c.lineWidth=depth>1?3:1.6;c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.stroke();
  if(depth>0){for(let i=2;i<8;i++){const t=i/8;for(const sign of [-1,1])twig(x+(ex-x)*t,y+(ey-y)*t,angle+sign*(.5+random()*.3),length*(.24+random()*.17),depth-1);}}
  else for(let i=0;i<12;i++){const t=i/12,px=x+(ex-x)*t,py=y+(ey-y)*t;c.fillStyle=['#647947','#52663b','#768154','#445c37'][Math.floor(random()*4)];c.beginPath();c.ellipse(px,py,2+random()*2,5+random()*3,angle+(random()-.5),0,Math.PI*2);c.fill();}
 }
 twig(256,475,-Math.PI/2,380,3);twig(250,402,-2.02,260,2);twig(260,406,-1.06,260,2);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 const bark=new THREE.CylinderGeometry(.65,1,1,8),branch=new THREE.CylinderGeometry(.32,1,1,6),cards=[];
 for(let i=0;i<4;i++){const card=new THREE.PlaneGeometry(2,2);card.rotateY(i*Math.PI/4);if(i===3)card.rotateX(Math.PI/3);cards.push(card);}
 const foliage=mergeGeometries(cards);cards.forEach(g=>g.dispose());
 const leaf=new THREE.MeshStandardMaterial({map,color:'#e0e7cc',roughness:.94,side:THREE.DoubleSide,alphaTest:.4,alphaToCoverage:false,emissive:'#0b1607',emissiveIntensity:.16});
 leaf.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\ndiffuseColor.a = 1.0;');};
 const group=new THREE.Group();group.add(instances(bark,mats.trunk,trunks),instances(branch,mats.trunk,branches),instances(foliage,leaf,crowns));scene.add(group);return group;
}
