import * as THREE from 'three';
import {Batch,instances,railing} from './geometry.js';
export function makeDetails(model,mats){const b={...model,x:0,z:0};const group=new THREE.Group(),batch=new Batch(mats);group.position.set(model.x,0,model.z);group.rotation.y=model.yaw||0;const base=b.base||0,h=b.h||15,body=h*(b.double?.39:.55),bays=b.bays||5,w=b.w,d=b.d;
 const columns=[],panels=[],lattice=[],brackets=[],bracketSmall=[];
 for(const side of [-1,1])for(let i=0;i<=bays;i++){
 const x=b.x-w*.48+i*w*.96/bays,z=b.z+side*d*.48;
 columns.push({x,y:base+body/2,z,sx:.25,sy:body,sz:.25});
 for(let tier=0;tier<4;tier++){brackets.push({x,y:base+body-.8+tier*.2,z:z+side*tier*.17,sx:1.4+tier*.26,sy:.13,sz:.32});bracketSmall.push({x,y:base+body-.9+tier*.2,z:z+side*tier*.18,sx:.27,sy:.13,sz:1+tier*.16});}
 if(i===bays)continue;
 const width=w/bays*.8;const xx=x+w/bays/2;
 if(!b.gate||Math.abs(xx-b.x)>w*.2){panels.push({x:xx,y:base+body*.43,z:b.z+side*d*.438,sx:width,sy:body*.7,sz:.15});
 if(b.lattice==='diamond'){
 const bottom=base+body*.34,height=body*.43,leaf=width/4;
 for(let k=0;k<4;k++)for(const sign of [-1,1])for(let offset=-leaf;offset<height;offset+=.32){const lo=Math.max(0,-offset),hi=Math.min(leaf,height-offset);if(hi<=lo)continue;const xa=sign>0?lo:leaf-lo,xb=sign>0?hi:leaf-hi;lattice.push({x:xx-width/2+k*leaf+(xa+xb)/2,y:bottom+offset+(lo+hi)/2,z:side*d*.444,sx:Math.SQRT2*(hi-lo),sy:.032,sz:.06,rz:sign*Math.PI/4});}
 }else{for(let j=0;j<5;j++)lattice.push({x:xx-width*.4+j*width*.2,y:base+body*.55,z:b.z+side*d*.442,sx:.045,sy:body*.43,sz:.07});for(let j=0;j<7;j++)lattice.push({x:xx,y:base+body*.34+j*body*.062,z:b.z+side*d*.444,sx:width,sy:.045,sz:.07});}
 for(let j=0;j<=4;j++)lattice.push({x:xx-width/2+j*width/4,y:base+body*.43,z:side*d*.446,sx:.07,sy:body*.7,sz:.09});
 batch.box(width,body*.2,.12,xx,base+body*.19,side*d*.446,'red');}
 }
 // Published depth bay counts guide exterior side posts; spacing remains estimated.
 if(b.baysDepth)for(const side of [-1,1])for(let j=1;j<b.baysDepth;j++)columns.push({x:side*w*.48,y:base+body/2,z:-d*.48+j*d*.96/b.baysDepth,sx:.25,sy:body,sz:.25});
 if(b.frontPosts){const square=[];for(let i=0;i<bays;i++)for(let j=1;j<=2;j++)square.push({x:-w/2+(i+j/3)*w/bays,y:base+body/2,z:d*.48,sx:.45,sy:body,sz:.45});group.add(instances(new THREE.BoxGeometry(1,1,1),mats.red,square));}
 const plinths=columns.map(p=>({...p,y:base+.12,sx:.38,sy:.24,sz:.38}));group.add(instances(new THREE.CylinderGeometry(1,1,1,12),mats.stone,plinths));
 group.add(instances(new THREE.CylinderGeometry(1,1,1,10),mats.red,columns));group.add(instances(new THREE.BoxGeometry(1,1,1),mats.window,panels));group.add(instances(new THREE.BoxGeometry(1,1,1),mats.wood,lattice));group.add(instances(new THREE.BoxGeometry(1,1,1),mats.blue,brackets));group.add(instances(new THREE.BoxGeometry(1,1,1),mats.gold,bracketSmall));
 if(b.double){const upperColumns=[],upperScreens=[];for(const side of [-1,1])for(let i=0;i<=bays;i++){const x=b.x-w*.41+i*w*.82/bays,z=b.z+side*d*.327;upperColumns.push({x,y:base+h*.525,z,sx:.17,sy:h*.24,sz:.17});if(i<bays)upperScreens.push({x:x+w*.41/bays,y:base+h*.615,z:z+side*.07,sx:w*.8/bays,sy:h*.075,sz:.12});}group.add(instances(new THREE.CylinderGeometry(1,1,1,8),mats.red,upperColumns));group.add(instances(new THREE.BoxGeometry(1,1,1),mats.blue,upperScreens));}
 for(const side of [-1,1])batch.box(w*.97,.25,.15,b.x,base+body-.75,b.z+side*d*.49,'gold');
 // Curved tile ribs match the base roof's central sweep. Hip corners use texture.
 if(['hip','gable','gablehip'].includes(b.roof)){
 let rw=b.double?w*.9+2:w+3,rd=b.double?d*.88+2:d+3,yy=base+(b.double?h*.66:body),rise=base+h-(b.crestHeight||0)-yy;
 if(b.roof==='gablehip'){rw*=.8;rd*=.5;yy+=rise*.4;rise*=.6;}
 const extent=b.roof==='hip'?Math.max(.5,(rw-rd*.75)/2):rw/2;
 for(const side of [-1,1]){const pts=Array.from({length:25},(_,i)=>{const t=i/24;return new THREE.Vector3(0,Math.min(base+h-.045,yy+rise*(1-t)**1.65+.14),side*rd/2*t);});const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.038,5,false),ribs=[];for(let x=-extent+.12;x<extent;x+=.24)ribs.push({x,y:0,z:0});const tiles=instances(geo,mats.tileRib,ribs);tiles.castShadow=false;tiles.userData.lodRadius=75;tiles.userData.skipAO=true;group.add(tiles);}
 }
 // Vats and sculpted beasts await independently verified shapes and positions.
 if(base>0&&base<8&&b.platformMargin!==2)group.add(railing(batch,b.x,b.z,w+8,d+8,base,5));
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#233f48';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#bca05e';ctx.lineWidth=10;ctx.strokeRect(9,9,494,110);ctx.fillStyle='#cfb77a';ctx.font='52px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.name,256,68);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const plaque=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5,w*.2),1.25),new THREE.MeshStandardMaterial({map:tex,roughness:.9}));plaque.userData.ownsMaterial=true;plaque.position.set(b.x,base+body*.8,b.z+d*.5+.2);group.add(plaque);group.add(batch.finish());return group;
}
