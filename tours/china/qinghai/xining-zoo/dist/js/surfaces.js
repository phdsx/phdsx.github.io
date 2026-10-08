import {heightAt} from './spatial.js';

const EPS=1e-8;

function clipPolygon(points,distance){
 const output=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  const da=distance(a),db=distance(b),inA=da>=-EPS,inB=db>=-EPS;
  if(inA)output.push(a);
  if(inA!==inB){const t=da/(da-db);output.push(a.map((v,k)=>v+(b[k]-v)*t));}
 }
 return output;
}

// Clip every map triangle against terrain cells and their diagonals. Every resulting
// triangle lies within one terrain face: no long road or lake triangle cuts through a hill.
export function drapeTriangles(positions,indices,uvs,terrain,{stride=1,offset=.16}={}){
 const step=terrain.step*stride,[ox,oz]=terrain.extent;
 const cellsX=(terrain.nx-1)/stride,cellsZ=(terrain.nz-1)/stride;
 const out=[],outUV=[],count=indices?indices.length:positions.length/3;
 const vertex=i=>[positions[i*3],positions[i*3+2],uvs?.[i*2]??0,uvs?.[i*2+1]??0];
 for(let n=0;n<count;n+=3){
  const triangle=[0,1,2].map(k=>vertex(indices?indices[n+k]:n+k));
  const minX=Math.max(0,Math.floor((Math.min(...triangle.map(p=>p[0]))-ox)/step));
  const maxX=Math.min(cellsX-1,Math.floor((Math.max(...triangle.map(p=>p[0]))-ox)/step));
  const minZ=Math.max(0,Math.floor((Math.min(...triangle.map(p=>p[1]))-oz)/step));
  const maxZ=Math.min(cellsZ-1,Math.floor((Math.max(...triangle.map(p=>p[1]))-oz)/step));
  for(let j=minZ;j<=maxZ;j++)for(let i=minX;i<=maxX;i++){
   const x=ox+i*step,z=oz+j*step;
   let square=triangle;
   for(const plane of [p=>p[0]-x,p=>x+step-p[0],p=>p[1]-z,p=>z+step-p[1]]){
    square=clipPolygon(square,plane);if(square.length<3)break;
   }
   if(square.length<3)continue;
   for(const side of [1,-1]){
    const polygon=clipPolygon(square,p=>side*(x+z+step-p[0]-p[1]));
    for(let k=1;k<polygon.length-1;k++){
     const a=polygon[0],b=polygon[k],c=polygon[k+1];
     const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
     if(Math.abs(area)<EPS)continue;
     for(const p of [a,b,c]){out.push(p[0],heightAt(terrain,p[0],p[1],stride)+offset,p[1]);outUV.push(p[2],p[3]);}
    }
   }
  }
 }
 return {positions:new Float32Array(out),uvs:new Float32Array(outUV)};
}

// Split lines at the same vertical, horizontal and diagonal edges used by the terrain.
export function drapeLinePositions(positions,terrain,{stride=1,offset=.3,segments=false}={}){
 const step=terrain.step*stride,[ox,oz]=terrain.extent,out=[];
 const p=i=>[positions[i*3],positions[i*3+2]];
 for(let i=0;i<positions.length/3-1;i+=segments?2:1){
  const a=p(i),b=p(i+1),cuts=[0,1];
  for(const [from,to,origin] of [[a[0],b[0],ox],[a[1],b[1],oz],[a[0]+a[1],b[0]+b[1],ox+oz]]){
   if(Math.abs(to-from)<EPS)continue;
   for(let k=Math.floor((Math.min(from,to)-origin)/step)+1;k<=(Math.max(from,to)-origin)/step;k++){
    const t=(origin+k*step-from)/(to-from);if(t>EPS&&t<1-EPS)cuts.push(t);
   }
  }
  cuts.sort((a,b)=>a-b);
  for(let k=1;k<cuts.length;k++){
   if(cuts[k]-cuts[k-1]<EPS)continue;
   for(const t of [cuts[k-1],cuts[k]]){const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;out.push(x,heightAt(terrain,x,z,stride)+offset,z);}
  }
 }
 return new Float32Array(out);
}

export function contourPositions(terrain,stride=1,interval=10){
 const result=[],step=terrain.step*stride,[ox,oz]=terrain.extent;
 for(let j=0;j<terrain.nz-1;j+=stride)for(let i=0;i<terrain.nx-1;i+=stride){
  const at=(di,dj)=>[ox+i*terrain.step+di*step,terrain.heights[(j+dj*stride)*terrain.nx+i+di*stride],oz+j*terrain.step+dj*step];
  const a=at(0,0),b=at(0,1),c=at(1,1),d=at(1,0);
  for(const face of [[a,b,d],[b,c,d]]){
   const low=Math.min(...face.map(p=>p[1])),high=Math.max(...face.map(p=>p[1]));
   for(let level=Math.ceil(low/interval)*interval;level<high;level+=interval){
    const hits=[];
    for(let k=0;k<3;k++){
     const p=face[k],q=face[(k+1)%3];
     if((p[1]<=level&&q[1]>level)||(p[1]>level&&q[1]<=level)){
      const t=(level-p[1])/(q[1]-p[1]);hits.push([p[0]+(q[0]-p[0])*t,level-terrain.datum+.04,p[2]+(q[2]-p[2])*t]);
     }
    }
    if(hits.length===2)result.push(...hits[0],...hits[1]);
   }
  }
 }
 return new Float32Array(result);
}
