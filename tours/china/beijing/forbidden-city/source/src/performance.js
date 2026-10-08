import {Group} from 'three';
export const QUALITY={low:{dpr:1,details:80,shadows:false},medium:{dpr:1.5,details:210,shadows:true},high:{dpr:2,details:300,shadows:true}};
export class DetailManager {
 constructor(scene,models,materials){this.scene=scene;this.models=models.filter(b=>b.w&&b.d&&(!b.special||b.detailParts));this.materials=materials;this.cache=new Map();this.module=null;this.pending=false;}
 async update(camera,quality,gray){const range=QUALITY[quality].details;let candidate,candidateDistance=Infinity;for(const b of this.models){const d=Math.hypot(camera.position.x-b.x,camera.position.z-b.z,camera.position.y-(b.base||0));const existing=this.cache.get(b.id);if(existing){existing.visible=d<range&&!gray;existing.traverse(o=>{if(o.userData.lodRadius)o.visible=d<o.userData.lodRadius;});existing.userData.lastUsed=existing.visible?performance.now():existing.userData.lastUsed;}else if(d<range&&!gray&&d<candidateDistance){candidate=b;candidateDistance=d;}}
 if(candidate&&!this.pending){this.pending=true;try{this.module??=await import('./details.js');const group=new Group();for(const part of candidate.detailParts||[candidate])group.add(this.module.makeDetails(part,this.materials));group.traverse(o=>{if(o.userData.lodRadius)o.visible=candidateDistance<o.userData.lodRadius;});group.userData.lastUsed=performance.now();this.scene.add(group);this.cache.set(candidate.id,group);}finally{this.pending=false;}}
 if(this.cache.size>18){const old=[...this.cache].filter(([,g])=>!g.visible).sort((a,b)=>a[1].userData.lastUsed-b[1].userData.lastUsed)[0];if(old){old[1].traverse(o=>{o.geometry?.dispose();if(o.userData.ownsMaterial){o.material.map?.dispose();o.material.dispose();}});this.scene.remove(old[1]);this.cache.delete(old[0]);}}
 }
}
