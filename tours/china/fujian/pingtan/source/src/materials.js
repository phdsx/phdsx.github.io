import * as THREE from 'three';
// Seeded variations are for material grains only, never for geography.
export function random(seed=7){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};}
function stoneTexture(){
 const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d'),rng=random(2026);
 ctx.fillStyle='#8b8b7c';ctx.fillRect(0,0,1024,1024);
 for(let row=0;row<8;row++){let x=row%2?-95:0;while(x<1024){const w=132+rng()*115,y=row*128,h=125;const lum=122+rng()*38;ctx.fillStyle=`rgb(${lum+7},${lum+5},${lum-3})`;ctx.beginPath();ctx.moveTo(x+4,y+5);ctx.lineTo(x+w-8,y+3+rng()*6);ctx.lineTo(x+w-4,y+h-3);ctx.lineTo(x+4,y+h-4-rng()*6);ctx.closePath();ctx.fill();ctx.strokeStyle='#6d7264';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#c3c3aa55';ctx.lineWidth=1.5;ctx.stroke();x+=w;}}
 const img=ctx.getImageData(0,0,1024,1024);for(let i=0;i<img.data.length;i+=4){const n=(rng()-.5)*26;img.data[i]+=n;img.data[i+1]+=n;img.data[i+2]+=n;}ctx.putImageData(img,0,0);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
export async function createMaterials(assets){
 const [rock,rockN,rockR,forest,bark,paving,pavingN,pavingR]=await Promise.all([
  assets.texture('./textures/rock-color.webp',true,true),assets.texture('./textures/rock-normalgl.webp',false,true),assets.texture('./textures/rock-roughness.webp',false,true),assets.texture('./textures/forest-color.webp',true,true),assets.texture('./textures/bark-color.webp',true,true),assets.texture('./textures/paving-color.webp',true,true),assets.texture('./textures/paving-normalgl.webp',false,true),assets.texture('./textures/paving-roughness.webp',false,true)
 ]);
 const stone=stoneTexture(),wall=await assets.texture('./textures/wall-color.webp',true,true);
 const foliageCanvas=document.createElement('canvas');foliageCanvas.width=foliageCanvas.height=256;const fc=foliageCanvas.getContext('2d'),fr=random(312);
 for(let i=0;i<310;i++){fc.save();fc.translate(fr()*256,fr()*256);fc.rotate(fr()*Math.PI);fc.fillStyle=`hsl(${78+fr()*25} ${16+fr()*20}% ${24+fr()*15}%)`;fc.beginPath();fc.ellipse(0,0,3+fr()*3,7+fr()*5,0,0,Math.PI*2);fc.fill();fc.strokeStyle='#c0c3a838';fc.lineWidth=.7;fc.beginPath();fc.moveTo(0,-7);fc.lineTo(0,7);fc.stroke();fc.restore();}
 const leafTexture=new THREE.CanvasTexture(foliageCanvas);leafTexture.colorSpace=THREE.SRGBColorSpace;leafTexture.anisotropy=4;
 const leafCanvas=document.createElement('canvas');leafCanvas.width=64;leafCanvas.height=128;const lc=leafCanvas.getContext('2d');lc.fillStyle='#637946';lc.beginPath();lc.moveTo(32,3);lc.bezierCurveTo(63,42,54,82,32,125);lc.bezierCurveTo(9,82,1,42,32,3);lc.fill();lc.strokeStyle='#a9ae7c';lc.lineWidth=1.5;lc.beginPath();lc.moveTo(32,7);lc.lineTo(32,121);lc.stroke();for(let i=25;i<115;i+=13){lc.strokeStyle='#82955f';lc.beginPath();lc.moveTo(32,i);lc.lineTo(15,i-12);lc.moveTo(32,i);lc.lineTo(48,i-12);lc.stroke();}const singleLeaf=new THREE.CanvasTexture(leafCanvas);singleLeaf.colorSpace=THREE.SRGBColorSpace;
 return {
  stone:new THREE.MeshStandardMaterial({map:wall||stone,normalMap:pavingN,roughnessMap:pavingR,normalScale:new THREE.Vector2(1.4,1.4),color:0xb3b0a0,roughness:.96,envMapIntensity:.12}),
  rock:new THREE.MeshStandardMaterial({map:rock,normalMap:rockN,roughnessMap:rockR,color:0xbbbbaa,roughness:.93,normalScale:new THREE.Vector2(.75,.75)}),
  roof:new THREE.MeshStandardMaterial({map:rock,normalMap:rockN,roughnessMap:rockR,color:0x939286,roughness:.97,envMapIntensity:.1}),
  timber:new THREE.MeshStandardMaterial({map:bark,color:0x777568,roughness:.9}),
  glass:new THREE.MeshStandardMaterial({color:0x142a2c,roughness:.47,metalness:0,envMapIntensity:.2}),
  frame:new THREE.MeshStandardMaterial({color:0x74796e,roughness:.85}),
  foliage:new THREE.MeshStandardMaterial({color:0x677553,roughness:.98,envMapIntensity:.2}),
  leaves:new THREE.MeshStandardMaterial({map:singleLeaf,alphaTest:.4,color:0xbfc2a3,roughness:.97,side:THREE.DoubleSide,envMapIntensity:.15}),
  forest:new THREE.MeshStandardMaterial({map:forest,color:0xa5ac88,roughness:1}),
  concrete:new THREE.MeshStandardMaterial({map:paving,normalMap:pavingN,roughnessMap:pavingR,color:0x808477,roughness:.98,envMapIntensity:.12}),
  wind:new THREE.MeshStandardMaterial({color:0xd4d8d1,roughness:.48,metalness:.12}),
 };
}
