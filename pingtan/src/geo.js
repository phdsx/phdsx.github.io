// EPSG:32650, WGS84 ellipsoid, UTM 50N; X east, Z south. 1 unit = 1 metre.
const A=6378137, E2=0.0066943799901413165, EP=E2/(1-E2), K=.9996, RAD=Math.PI/180;
export const origin=[119.78,25.53];
export function utm(lon,lat){
  const p=lat*RAD,t=Math.tan(p)**2,c=EP*Math.cos(p)**2,a=Math.cos(p)*(lon-117)*RAD,n=A/Math.sqrt(1-E2*Math.sin(p)**2);
  const m=A*((1-E2/4-3*E2**2/64-5*E2**3/256)*p-(3*E2/8+3*E2**2/32+45*E2**3/1024)*Math.sin(2*p)+(15*E2**2/256+45*E2**3/1024)*Math.sin(4*p)-35*E2**3/3072*Math.sin(6*p));
  return [500000+K*n*(a+(1-t+c)*a**3/6+(5-18*t+t*t+72*c-58*EP)*a**5/120),K*(m+n*Math.tan(p)*(a*a/2+(5-t+9*c+4*c*c)*a**4/24+(61-58*t+t*t+600*c-330*EP)*a**6/720))];
}
const O=utm(...origin);
export function project(lon,lat){const p=utm(lon,lat);return [p[0]-O[0],O[1]-p[1]];}
export function unproject(x,z){
  const m=(O[1]-z)/K,mu=m/(A*(1-E2/4-3*E2**2/64-5*E2**3/256)),e1=(1-Math.sqrt(1-E2))/(1+Math.sqrt(1-E2));
  const p=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+151*e1**3/96*Math.sin(6*mu)+1097*e1**4/512*Math.sin(8*mu);
  const c=EP*Math.cos(p)**2,t=Math.tan(p)**2,n=A/Math.sqrt(1-E2*Math.sin(p)**2),r=A*(1-E2)/(1-E2*Math.sin(p)**2)**1.5,d=(x+O[0]-500000)/(n*K);
  return [(117*RAD+(d-(1+2*t+c)*d**3/6+(5-2*c+28*t-3*c*c+8*EP+24*t*t)*d**5/120)/Math.cos(p))/RAD,(p-n*Math.tan(p)/r*(d*d/2-(5+3*t+10*c-4*c*c-9*EP)*d**4/24+(61+90*t+298*c+45*t*t-252*EP-3*c*c)*d**6/720))/RAD];
}
export function inside(x,z,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
export function sample(meta,values,x,z){
  const u=Math.max(0,Math.min(meta.nx-1.00001,(x-meta.x0)/meta.step)),v=Math.max(0,Math.min(meta.nz-1.00001,(z-meta.z0)/meta.step)),i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,k=j*meta.nx+i;
  return values[k]*(1-a)*(1-b)+values[k+1]*a*(1-b)+values[k+meta.nx]*(1-a)*b+values[k+meta.nx+1]*a*b;
}
export function centre(p){return p.reduce((s,v)=>[s[0]+v[0]/p.length,s[1]+v[1]/p.length],[0,0]);}
