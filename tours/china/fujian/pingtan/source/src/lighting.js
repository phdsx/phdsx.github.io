import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
const RAD=Math.PI/180;
// Approximate solar position for 2026-10-07, China Standard Time, at the local origin.
export function solar(hour){
 const lat=25.53*RAD,day=280,gamma=2*Math.PI/365*(day-1+(hour-12)/24);
 const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const eq=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma)),ha=((hour*60+eq+4*119.78-480)/4-180)*RAD;
 const east=-Math.cos(decl)*Math.sin(ha),north=Math.cos(lat)*Math.sin(decl)-Math.sin(lat)*Math.cos(decl)*Math.cos(ha),up=Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha);
 const conv=Math.atan(Math.tan((119.78-117)*RAD)*Math.sin(lat));
 return {vector:new THREE.Vector3(east*Math.cos(conv)-north*Math.sin(conv),up,-(north*Math.cos(conv)+east*Math.sin(conv))),elevation:Math.asin(up)/RAD};
}
export function createLighting(scene,renderer){
 const sky=new Sky();sky.scale.setScalar(64000);scene.add(sky);sky.material.uniforms.turbidity.value=3.2;sky.material.uniforms.rayleigh.value=1.7;sky.material.uniforms.mieCoefficient.value=.003;sky.material.uniforms.mieDirectionalG.value=.82;
 const sun=new THREE.DirectionalLight(0xfff3d8,2.7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.near=100;sun.shadow.camera.far=6500;sun.shadow.bias=-.00012;sun.shadow.normalBias=.12;scene.add(sun,sun.target);
 const hemi=new THREE.HemisphereLight(0xaacbdc,0x6a7661,.8);scene.add(hemi);scene.fog=new THREE.FogExp2(0xb3c7cb,.000007);
 const pmrem=new THREE.PMREMGenerator(renderer),envScene=new THREE.Scene(),envSky=new Sky();envSky.material=sky.material;envScene.add(envSky);let env;
 function time(hour){const s=solar(hour);sky.material.uniforms.sunPosition.value.copy(s.vector);sun.color.set(s.elevation<12?0xffccb0:0xfff4df);sun.intensity=Math.max(.04,Math.min(2.7,s.vector.y*3.4));hemi.intensity=Math.max(.10,.65*Math.max(.15,s.vector.y));renderer.toneMappingExposure=s.elevation<0?.37:.76;scene.fog.color.set(s.elevation<6?0x8d999f:0xaebfc0);if(env)env.dispose();env=pmrem.fromScene(envScene,.03,.1,10);scene.environment=env.texture;return s;}
 let solarState=time(14);
 return {sky,sun,hemi,setTime(hour){solarState=time(hour);return solarState;},update(camera,target,quality){sky.position.copy(camera.position);const near=camera.position.y<1600&&quality!=='low';sun.castShadow=near;renderer.shadowMap.enabled=near;
  const radius=near?450:1600;sun.shadow.camera.left=sun.shadow.camera.bottom=-radius;sun.shadow.camera.right=sun.shadow.camera.top=radius;sun.shadow.camera.updateProjectionMatrix();sun.target.position.copy(target);sun.position.copy(target).addScaledVector(solarState.vector,3000);sun.target.updateMatrixWorld();
 }};
}
