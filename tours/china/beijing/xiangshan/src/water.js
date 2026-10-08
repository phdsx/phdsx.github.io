import * as THREE from 'three';
import {Water} from 'three/addons/Water.js';

// A small analytic normal field. This is a wave material, not geographic data.
function rippleNormals() {
  const n=128,data=new Uint8Array(n*n*4);
  const waves=[[3,7,.015],[11,-5,.009],[17,13,.004],[-7,19,.004]];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    let dx=0,dy=0;
    for(const [kx,ky,a] of waves){const phase=(kx*x+ky*y)/n*Math.PI*2;dx+=a*Math.cos(phase)*kx*.1;dy+=a*Math.cos(phase)*ky*.1;}
    const len=Math.hypot(dx,dy,1),i=(y*n+x)*4;
    data[i]=Math.round((dx/len*.5+.5)*255);data[i+1]=Math.round((dy/len*.5+.5)*255);
    data[i+2]=Math.round((1/len*.5+.5)*255);data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,n,n,THREE.RGBAFormat);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}

export class WaterSystem {
  constructor(geo,scene) {
    this.items=[];this.reflections=0;this.reflecting=false;this.pending=false;this.active=null;this.now=0;
    const normals=rippleNormals();
    for(const source of geo.waters) {
      const shape=new THREE.Shape(source.points.map(p=>new THREE.Vector2(p[0],-p[1])));
      const geometry=new THREE.ShapeGeometry(shape);
      const fallback=new THREE.MeshStandardMaterial({color:0x425b47,roughness:.32,metalness:0,normalMap:normals,normalScale:new THREE.Vector2(.1,.1),envMapIntensity:.7,side:THREE.DoubleSide});
      const reflectable=[605775489,625875864].includes(source.id);
      const mesh=reflectable?new Water(geometry,{
        textureWidth:512,textureHeight:512,waterNormals:normals,
        sunDirection:new THREE.Vector3(-590,640,590).normalize(),sunColor:0xffe5be,
        waterColor:0x354e37,distortionScale:.24,fog:true,clipBias:.002
      }):new THREE.Mesh(geometry,fallback);
      mesh.rotation.x=-Math.PI/2;mesh.position.y=source.level;mesh.receiveShadow=true;
      mesh.name='Water '+source.id+' — mapped shoreline, inferred level';
      const center=new THREE.Vector3(
        source.points.reduce((a,p)=>a+p[0],0)/source.points.length,source.level,
        source.points.reduce((a,p)=>a+p[1],0)/source.points.length
      );
      const item={id:source.id,mesh,center,fallback,reflection:reflectable?mesh.material:null,lastUpdate:-1e6,lastPosition:new THREE.Vector3(1e9,0,0),lastQuaternion:new THREE.Quaternion()};
      if(reflectable) {
        item.reflection.uniforms.size.value=18;
        item.reflection.fragmentShader=item.reflection.fragmentShader.replace('float rf0 = 0.3;','float rf0 = 0.035;').replace('100.0, 2.0, 0.5','120.0, 0.65, 0.5');
        const reflect=mesh.onBeforeRender;
        mesh.onBeforeRender=(renderer,renderScene,camera)=>{
          if(this.reflecting||this.active!==item||!this.pending||mesh.material!==item.reflection)return;
          this.reflecting=true;
          try {
            reflect.call(mesh,renderer,renderScene,camera);
            this.reflections++;item.lastUpdate=this.now;
            item.lastPosition.copy(camera.position);item.lastQuaternion.copy(camera.quaternion);
            this.pending=false;
          } finally {this.reflecting=false;}
        };
      }
      scene.add(mesh);this.items.push(item);
    }
  }

  update(camera,time,quality) {
    this.now=time;
    let nearest=null,distance=180;
    if(quality==='high')for(const item of this.items) {
      if(!item.reflection)continue;
      const d=camera.position.distanceTo(item.center);
      if(d<distance&&camera.position.y>item.center.y+.1){nearest=item;distance=d;}
    }
    const changed=this.active!==nearest;this.active=nearest;
    for(const item of this.items) {
      item.mesh.material=item===nearest?item.reflection:item.fallback;
      if(item.reflection){item.reflection.uniforms.time.value=time*.28;item.reflection.uniforms.eye.value.copy(camera.position);}
    }
    if(nearest) {
      const moved=nearest.lastPosition.distanceToSquared(camera.position)>.004||nearest.lastQuaternion.angleTo(camera.quaternion)>.001;
      this.pending=changed||nearest.lastUpdate<0||(moved&&time-nearest.lastUpdate>.12);
    } else this.pending=false;
  }

  getState(){return {reflectionActive:this.active?.id??null,reflectionUpdates:this.reflections,resolution:512,mode:this.active?'cached planar reflection':'environment only'};}
}
