import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';

export class Navigation {
 constructor(camera,canvas,collision){
  this.camera=camera;this.canvas=canvas;this.collision=collision;this.mode='aerial';this.yaw=0;this.pitch=0;this.keys=new Set();this.transition=null;this.moved=false;
  this.orbit=new OrbitControls(camera,canvas);this.orbit.target.set(-45,0,50);this.orbit.enableDamping=true;this.orbit.dampingFactor=.08;this.orbit.minDistance=12;this.orbit.maxDistance=1450;this.orbit.maxPolarAngle=Math.PI/2-.025;this.orbit.update();
  this.orbit.addEventListener('change',()=>this.moved=true);
  const ignored=()=>/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement?.tagName||'')||!document.querySelector('#info').hidden;
  window.addEventListener('keydown',e=>{if(ignored())return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.keys.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.keys.clear();});
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&this.mode==='walk'&&!this.transition)this.look(e.movementX,e.movementY);});
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{if(this.mode!=='walk'||this.transition||document.pointerLockElement===canvas)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus();});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||this.mode!=='walk')return;this.look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;});
  const end=e=>{if(drag?.id===e.pointerId)drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  for(const button of document.querySelectorAll('[data-move]')){
   const key={forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD'}[button.dataset.move];
   button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.keys.add(key);});
   for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>this.keys.delete(key));
  }
 }
 get transitioning(){return !!this.transition;}
 look(dx,dy){this.yaw-=dx*.0024;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.0022,-1.1,1.1);this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch,this.yaw,0,'YXZ'));this.moved=true;}
 setAngles(target){const dx=target[0]-this.camera.position.x,dz=target[1]-this.camera.position.z;this.yaw=Math.atan2(-dx,-dz);this.pitch=0;return new THREE.Quaternion().setFromEuler(new THREE.Euler(0,this.yaw,0,'YXZ'));}
 async lock(){if(this.mode==='walk'&&!this.transition){try{await this.canvas.requestPointerLock();}catch{document.querySelector('#hint').textContent='鼠标锁定不可用；按住画面拖动观察，WASD 移动。';}}}
 fly(position,target,mode='aerial',duration=1900){
  this.keys.clear();if(document.pointerLockElement)document.exitPointerLock();this.mode=mode;this.orbit.enabled=false;
  const end=new THREE.Vector3(...position),target3=new THREE.Vector3(target[0],mode==='walk'?(target[2]??1.65):0,target[1]);
  const temp=new THREE.PerspectiveCamera();temp.position.copy(end);temp.lookAt(target3);
  this.transition={start:performance.now(),duration,from:this.camera.position.clone(),to:end,qa:this.camera.quaternion.clone(),qb:temp.quaternion.clone(),target:target3,safeRoute:mode==='walk'||this.camera.position.y<15,cruise:Math.max(45,this.camera.position.y,end.y)};
  document.body.classList.toggle('walking',mode==='walk');document.querySelector('#aerial').setAttribute('aria-pressed',String(mode==='aerial'));document.querySelector('#walk').setAttribute('aria-pressed',String(mode==='walk'));
  document.querySelector('#hint').textContent=mode==='aerial'?'拖动旋转 · 滚轮缩放 · 右键平移':'WASD / 方向键移动 · 拖动观察 · Esc 释放鼠标';
  document.querySelector('#look').hidden=mode!=='walk'||matchMedia('(pointer:coarse)').matches;document.querySelector('#touch-controls').hidden=mode!=='walk'||!matchMedia('(pointer:coarse)').matches;
  this.camera.fov=mode==='walk'?54:42;this.camera.updateProjectionMatrix();this.moved=true;
 }
 walkTo(point,target){const p=this.collision.safe(point);this.fly([p[0],1.65,p[1]],target,'walk');}
 aerial(point=[-45,50]){this.fly([point[0]+385,650,point[1]+850],point,'aerial');}
 update(dt,now){
  if(this.transition){const tr=this.transition,t=THREE.MathUtils.clamp((now-tr.start)/tr.duration,0,1),smooth=v=>v*v*(3-2*v),e=smooth(t);if(tr.safeRoute){if(t<.22){this.camera.position.copy(tr.from);this.camera.position.y=THREE.MathUtils.lerp(tr.from.y,tr.cruise,smooth(t/.22));}else if(t<.72){this.camera.position.lerpVectors(tr.from,tr.to,smooth((t-.22)/.5));this.camera.position.y=tr.cruise;}else{this.camera.position.copy(tr.to);this.camera.position.y=THREE.MathUtils.lerp(tr.cruise,tr.to.y,smooth((t-.72)/.28));}}else this.camera.position.lerpVectors(tr.from,tr.to,e);this.camera.quaternion.slerpQuaternions(tr.qa,tr.qb,e);this.moved=true;
   if(t>=1){this.transition=null;if(this.mode==='aerial'){this.orbit.target.copy(tr.target);this.orbit.enabled=true;this.orbit.update();}else{const euler=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');this.yaw=euler.y;this.pitch=euler.x;this.camera.position.y=1.65;}}
   return;
  }
  if(this.mode==='aerial'){this.orbit.update();if(this.camera.position.y<10.5){this.camera.position.y=10.5;this.camera.lookAt(this.orbit.target);}return;}
  let forward=+(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-+(this.keys.has('KeyS')||this.keys.has('ArrowDown')),right=+(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-+(this.keys.has('KeyA')||this.keys.has('ArrowLeft'));
  const length=Math.hypot(forward,right);if(!length)return;forward/=length;right/=length;
  const distance=1.45*Math.min(dt,.04),dx=(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*right)*distance,dz=(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*right)*distance;
  // Small bounded steps with independent axes permit sliding along walls.
  const steps=Math.max(1,Math.ceil(distance/.1));for(let i=0;i<steps;i++){let x=this.camera.position.x+dx/steps,z=this.camera.position.z+dz/steps;if(!this.collision.blocked(x,this.camera.position.z))this.camera.position.x=x;if(!this.collision.blocked(this.camera.position.x,z))this.camera.position.z=z;}
  this.camera.position.y=1.65;this.moved=true;
 }
}
