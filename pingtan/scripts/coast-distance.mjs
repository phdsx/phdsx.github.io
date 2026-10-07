// Exact squared Euclidean distance transform (Felzenszwalb-Huttenlocher 1D envelope).
// Used only for visual coast distance, not inferred bathymetry.
import fs from 'node:fs';
const [input,output,wArg,hArg,dxArg,dzArg]=process.argv.slice(2),w=+wArg,h=+hArg,dx=+dxArg,dz=+dzArg;
const mask=fs.readFileSync(input),field=new Float32Array(w*h);field.fill(1e12);
for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x,l=mask[k]>127;if((mask[k-1]>127)!==l||(mask[k+1]>127)!==l||(mask[k-w]>127)!==l||(mask[k+w]>127)!==l)field[k]=0;}
const n=Math.max(w,h),v=new Int32Array(n),z=new Float64Array(n+1),f=new Float64Array(n),d=new Float64Array(n);
function transform(length,step){let k=0;v[0]=0;z[0]=-Infinity;z[1]=Infinity;const a=step*step;
 for(let q=1;q<length;q++){let s;do{s=(f[q]+a*q*q-f[v[k]]-a*v[k]*v[k])/(2*a*(q-v[k]));if(s<=z[k])k--;else break;}while(k>=0);k++;v[k]=q;z[k]=s;z[k+1]=Infinity;}
 k=0;for(let q=0;q<length;q++){while(z[k+1]<q)k++;d[q]=a*(q-v[k])**2+f[v[k]];}
}
for(let y=0;y<h;y++){for(let x=0;x<w;x++)f[x]=field[y*w+x];transform(w,dx);for(let x=0;x<w;x++)field[y*w+x]=d[x];}
for(let x=0;x<w;x++){for(let y=0;y<h;y++)f[y]=field[y*w+x];transform(h,dz);for(let y=0;y<h;y++)field[y*w+x]=d[y];}
for(let i=0;i<field.length;i++)field[i]=Math.min(508,Math.sqrt(field[i]))*(mask[i]>127?1:-1);
fs.writeFileSync(output,Buffer.from(field.buffer));console.log('Euclidean coastal distance field written');
