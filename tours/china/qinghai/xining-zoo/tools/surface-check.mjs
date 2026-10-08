import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as THREE from '../dist/assets/vendor/three.module.js';
import {heightAt} from '../dist/js/spatial.js';
import {drapeTriangles,drapeLinePositions,contourPositions} from '../dist/js/surfaces.js';

// An independent Three.js raycast is the oracle, not a second call to our sampler.
function groundMesh(data,stride){
 const [x0,z0,x1,z1]=data.extent;
 const geometry=new THREE.PlaneGeometry(x1-x0,z1-z0,(data.nx-1)/stride,(data.nz-1)/stride);
 geometry.rotateX(-Math.PI/2);geometry.translate((x0+x1)/2,0,(z0+z1)/2);
 const p=geometry.attributes.position;
 for(let j=0;j<=(data.nz-1)/stride;j++)for(let i=0;i<=(data.nx-1)/stride;i++){
  p.setY(j*((data.nx-1)/stride+1)+i,data.heights[j*stride*data.nx+i*stride]-data.datum);
 }
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());mesh.updateMatrixWorld();return mesh;
}
function rayY(mesh,x,z){return new THREE.Raycaster(new THREE.Vector3(x,10000,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0]?.point.y;}
function close(a,b,eps=1e-4){assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<eps,`${a} != ${b}`);}
const saddle={nx:5,nz:5,step:1,extent:[0,0,4,4],datum:100,heights:Array.from({length:25},(_,i)=>100+(i%5)*Math.floor(i/5)*3)};
// In the first cell the rendered diagonal is at 0; bilinear interpolation would give .75.
close(heightAt(saddle,.5,.5),0);
close(heightAt(saddle,4,4),48);
const real=JSON.parse(readFileSync(new URL('../dist/assets/data/terrain.json',import.meta.url)));
const report={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date()),tests:[],raySamples:0,maxSamplerRayErrorM:0,maxDrapeRayErrorM:0};
for(const data of [saddle,real])for(const stride of [1,2]){
 const mesh=groundMesh(data,stride),[x0,z0,x1,z1]=data.extent;
 for(let i=0;i<80;i++){
  const x=x0+(x1-x0)*((i*.61803398875+.13)%1),z=z0+(z1-z0)*((i*.41421356237+.27)%1);
  const error=Math.abs(heightAt(data,x,z,stride)-rayY(mesh,x,z));
  close(error,0);report.raySamples++;report.maxSamplerRayErrorM=Math.max(report.maxSamplerRayErrorM,error);
 }
 for(const [x,z] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1]])close(heightAt(data,x,z,stride),rayY(mesh,x,z));
 // A single large source triangle spans many terrain faces. UV=x,z is affine.
 const side=data===saddle?3.6:150,ax=data===saddle?.2:-75,az=data===saddle?.2:-80,offset=.16;
 const positions=[ax,0,az,ax,0,az+side,ax+side,0,az],uv=[ax,az,ax,az+side,ax+side,az];
 const draped=drapeTriangles(positions,[0,1,2],uv,data,{stride,offset});let area=0;
 for(let i=0;i<draped.positions.length;i+=9){
  const p=draped.positions.slice(i,i+9),cross=(p[3]-p[0])*(p[8]-p[2])-(p[5]-p[2])*(p[6]-p[0]);
  assert(cross<0,'winding must remain upward');area-=cross/2;
  for(const weights of [[1/3,1/3,1/3],[.1,.7,.2]]){
   const x=weights.reduce((s,w,k)=>s+w*p[k*3],0),y=weights.reduce((s,w,k)=>s+w*p[k*3+1],0),z=weights.reduce((s,w,k)=>s+w*p[k*3+2],0);
   const error=Math.abs(y-rayY(mesh,x,z)-offset);close(error,0);report.maxDrapeRayErrorM=Math.max(report.maxDrapeRayErrorM,error);
  }
 }
 close(area,side*side/2,.01);
 for(let i=0;i<draped.uvs.length;i+=2){close(draped.uvs[i],draped.positions[i/2*3]);close(draped.uvs[i+1],draped.positions[i/2*3+2]);}
 for(const segments of [false,true]){
  const lines=drapeLinePositions(positions,data,{stride,offset:.3,segments});
  for(let i=0;i<lines.length;i+=6)for(const t of [.25,.5,.75]){
   const x=lines[i]*(1-t)+lines[i+3]*t,y=lines[i+1]*(1-t)+lines[i+4]*t,z=lines[i+2]*(1-t)+lines[i+5]*t;
   close(y,rayY(mesh,x,z)+.3);
  }
 }
 const contours=contourPositions(data,stride,10);
 for(let i=0;i<contours.length;i+=Math.max(6,Math.floor(contours.length/600/6)*6)){
  const x=(contours[i]+contours[i+3])/2,y=(contours[i+1]+contours[i+4])/2,z=(contours[i+2]+contours[i+5])/2;
  close(y,rayY(mesh,x,z)+.04);
 }
 mesh.geometry.dispose();mesh.material.dispose();
 report.tests.push(`${data===saddle?'非共面合成地形':'实际 DEM'} / stride ${stride}：射线、边界、覆盖面积、朝向、UV、面内高度、线与等高线通过`);
}
writeFileSync(new URL('../docs/surface-test-results.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
