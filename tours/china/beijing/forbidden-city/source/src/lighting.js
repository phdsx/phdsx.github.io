import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';

export function lighting(scene,renderer){
 const phi=39.917*Math.PI/180,H=-22.5*Math.PI/180;
 const east=-Math.sin(H),north=-Math.sin(phi)*Math.cos(H),up=Math.cos(phi)*Math.cos(H),offset=-2.04*Math.PI/180;
 const direction=new THREE.Vector3(east*Math.cos(offset)-north*Math.sin(offset),up,-(east*Math.sin(offset)+north*Math.cos(offset))).normalize();
 const sky=new Sky();sky.scale.setScalar(8000);const u=sky.material.uniforms;
 u.turbidity.value=1.7;u.rayleigh.value=3;u.mieCoefficient.value=.0012;u.mieDirectionalG.value=.82;u.sunPosition.value.copy(direction);
 // Clear-day display calibration against the reference photographs; atmosphere
 // colour is illustrative, not a measured Beijing weather record.
 sky.material.fragmentShader=sky.material.fragmentShader.replace('vec4( retColor, 1.0 )','vec4( retColor * vec3( 0.168, 0.2184, 0.28 ), 1.0 )');
 scene.add(sky);
 // A procedural daylight environment supplies ceramic glaze and metal reflections.
 const environmentScene=new THREE.Scene();environmentScene.add(sky.clone());
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(environmentScene,.04,.1,10000);
 scene.environment=environment.texture;scene.environmentIntensity=.23;pmrem.dispose();
 scene.add(new THREE.HemisphereLight('#d9e5f4','#6f6553',.38));
 const sun=new THREE.DirectionalLight('#fff8ed',2.7);sun.position.copy(direction).multiplyScalar(850);sun.castShadow=true;
 sun.shadow.bias=-.00006;sun.shadow.normalBias=.12;sun.shadow.radius=2;scene.add(sun,sun.target);
 let mapSize=0;
 function update(camera,quality,walk,target){
  // Shadows focus on the viewed courtyard rather than wasting the map on the
  // entire kilometre-long site. Positions and solar orientation stay fixed.
  const focus=walk?camera.position:(target||new THREE.Vector3());
  const distance=camera.position.distanceTo(focus),size=walk?65:Math.min(660,Math.max(95,distance*.55));
  sun.target.position.set(focus.x,0,focus.z);sun.position.copy(sun.target.position).addScaledVector(direction,850);
  Object.assign(sun.shadow.camera,{left:-size,right:size,top:size,bottom:-size,near:1,far:1800});sun.shadow.camera.updateProjectionMatrix();
  const n=quality==='high'?4096:2048;if(mapSize!==n){mapSize=n;sun.shadow.mapSize.set(n,n);sun.shadow.map?.dispose();sun.shadow.map=null;}
  sun.castShadow=quality!=='low';
 }
 return{sun,sky,environment,update,direction};
}
