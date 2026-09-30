const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./details-C-88klnk.js","./three-DIZ_T8tx.js"])))=>i.map(i=>d[i]);
import{C as ue,S as De,R as ke,M as lt,a as gt,D as vt,B as wt,L as xt,V as A,b as ze,P as ot,E as Ae,c as tt,d as z,Q as Mt,e as Ne,G as Le,m as bt,f as te,I as Lt,O as It,g as Ie,F as se,h as Ee,i as yt,j as Ft,k as jt,l as Ut,n as st,o as Y,U as J,p as St,q as Ot,H as $t,r as Bt,s as Gt,W as it,t as at,N as Q,u as Vt,v as Pt,w as Wt,x as qt,y as Zt,z as ct,A as Xt,J as ht,Z as ft,K as Kt,T as Ht,X as Qt,Y as Yt,_ as Jt,$ as es,a0 as Tt,a1 as ts,a2 as ss,a3 as is,a4 as as,a5 as os,a6 as ns,a7 as Ct,a8 as rs,a9 as ls,aa as cs,ab as hs,ac as fs,ad as ds,ae as us,af as ps}from"./three-DIZ_T8tx.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))i(o);new MutationObserver(o=>{for(const s of o)if(s.type==="childList")for(const n of s.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&i(n)}).observe(document,{childList:!0,subtree:!0});function t(o){const s={};return o.integrity&&(s.integrity=o.integrity),o.referrerPolicy&&(s.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?s.credentials="include":o.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(o){if(o.ep)return;o.ep=!0;const s=t(o);fetch(o.href,s)}})();function ms(l,e=512){const t=document.createElement("canvas");t.width=t.height=e;const i=document.createElement("canvas");i.width=i.height=e;const o=document.createElement("canvas");o.width=o.height=e;const s=t.getContext("2d"),n=i.getContext("2d"),a=o.getContext("2d"),p={plaster:[137,46,36],wood:[113,35,27],stone:[199,197,186],pave:[126,125,117],brick:[99,100,96],tile:[176,119,35],darkTile:[58,66,58]}[l],u=s.createImageData(e,e),x=n.createImageData(e,e),y=a.createImageData(e,e);let m=63;const w=()=>(m=Math.imul(m,1664525)+1013904223>>>0,m/4294967296);for(let M=0;M<e;M++)for(let r=0;r<e;r++){const f=(M*e+r)*4,v=(w()-.5)*13,T=2*Math.sin(r/e*Math.PI*6)*Math.cos(M/e*Math.PI*4)+Math.sin((r+M)/e*Math.PI*14),h=v+T;for(let g=0;g<3;g++)u.data[f+g]=Math.max(0,Math.min(255,p[g]+h)),x.data[f+g]=128+v*.9+T*.2,y.data[f+g]=(l==="tile"?142:l==="wood"?190:230)+v;u.data[f+3]=x.data[f+3]=y.data[f+3]=255}if(s.putImageData(u,0,0),n.putImageData(x,0,0),a.putImageData(y,0,0),["stone","pave","brick"].includes(l)){const M=l==="pave"||l==="brick"?4:3,r=4,f=e/M,v=e/r;for(let T=-1;T<=r;T++)for(let h=-1;h<=M;h++){const g=h*f+(T%2&&l!=="pave"?f/2:0),C=T*v,P=Math.floor((w()-.5)*22);s.fillStyle=`rgba(${P>0?240:45},${P>0?236:44},${P>0?227:41},${Math.abs(P)/240})`,s.fillRect(g+2,C+2,f-4,v-4),s.strokeStyle=l==="stone"?"rgba(86,84,77,.25)":"rgba(45,46,42,.55)",s.lineWidth=l==="stone"?1.3:2.5,s.strokeRect(g+1,C+1,f-2,v-2),n.strokeStyle="#545454",n.lineWidth=3,n.strokeRect(g+1,C+1,f-2,v-2);for(let _=0;_<18;_++){const E=g+w()*f,R=C+w()*v;s.fillStyle="rgba(50,48,43,.08)",s.fillRect(E,R,1+w()*3,1)}}}if(l==="tile"||l==="darkTile"){const M=e/8;for(let r=0;r<e;r+=M){const f=(w()-.5)*15,v=s.createLinearGradient(r,0,r+M,0),T=l==="tile"?[174+f,119+f,36+f]:[60+f,69+f,60+f];v.addColorStop(0,`rgb(${T.map(g=>Math.max(0,g-28)).join(",")})`),v.addColorStop(.44,`rgb(${T.map(g=>g+23).join(",")})`),v.addColorStop(1,`rgb(${T.map(g=>Math.max(0,g-19)).join(",")})`),s.fillStyle=v,s.fillRect(r,0,M,e);const h=n.createLinearGradient(r,0,r+M,0);h.addColorStop(0,"#626262"),h.addColorStop(.5,"#c9c9c9"),h.addColorStop(1,"#6b6b6b"),n.fillStyle=h,n.fillRect(r,0,M,e);for(let g=0;g<e;g+=e/5)s.strokeStyle="rgba(71,48,20,.3)",s.lineWidth=1,s.beginPath(),s.moveTo(r,g),s.quadraticCurveTo(r+M/2,g+4,r+M,g),s.stroke(),n.strokeStyle="#747474",n.lineWidth=2,n.beginPath(),n.moveTo(r,g),n.lineTo(r+M,g),n.stroke()}}if(l==="wood")for(let M=0;M<120;M++){s.strokeStyle="rgba(51,17,14,.07)",s.lineWidth=.5+w();const r=w()*e;s.beginPath(),s.moveTo(r,0),s.bezierCurveTo(r+3,e*.3,r-2,e*.7,r+1,e),s.stroke()}const b=new ue(t),S=new ue(i),c=new ue(o);for(const M of[b,S,c])M.wrapS=M.wrapT=ke,M.anisotropy=8;return b.colorSpace=De,{map:b,bumpMap:S,roughnessMap:c}}function gs(){const l=Object.fromEntries(["plaster","wood","stone","pave","brick","tile","darkTile"].map(n=>[n,ms(n,n==="pave"?1024:512)])),e=(n,a=.85,d={})=>new gt({color:n,roughness:a,...d}),t=n=>new lt({color:"#fff7e5",roughness:.52,metalness:0,clearcoat:.28,clearcoatRoughness:.35,...n,bumpScale:.019,side:vt}),i=document.createElement("canvas");i.width=1024,i.height=256;const o=i.getContext("2d");o.fillStyle="#284a48",o.fillRect(0,0,1024,256);for(const n of[14,34,222,242])o.strokeStyle=n===14||n===242?"#73805b":"#9b8861",o.lineWidth=5,o.beginPath(),o.moveTo(0,n),o.lineTo(1024,n),o.stroke();o.strokeStyle="#8a805a",o.lineWidth=4;for(let n=0;n<1024;n+=256)o.beginPath(),o.moveTo(n+12,128),o.quadraticCurveTo(n+48,51,n+128,60),o.quadraticCurveTo(n+208,51,n+244,128),o.quadraticCurveTo(n+208,205,n+128,196),o.quadraticCurveTo(n+48,205,n+12,128),o.stroke(),o.beginPath(),o.ellipse(n+128,128,32,41,0,0,Math.PI*2),o.stroke(),o.fillStyle="#365f63",o.fillRect(n+112,111,32,34);const s=new ue(i);return s.colorSpace=De,s.wrapS=s.wrapT=ke,s.anisotropy=8,{red:e("#ffffff",.8,{...l.wood,bumpScale:.004}),wall:e("#ffffff",.96,{...l.plaster,bumpScale:.008}),tile:t(l.tile),tileRib:new lt({color:"#b58940",roughness:.6,clearcoat:.18,clearcoatRoughness:.45}),darkTile:t(l.darkTile),ridge:e("#ad7a34",.6),gold:e("#a28a55",.57,{metalness:.65}),stone:e("#ffffff",.92,{...l.stone,bumpScale:.018}),brick:e("#ffffff",.95,{...l.brick,bumpScale:.018}),pave:e("#ffffff",.96,{...l.pave,bumpScale:.013}),earth:e("#828571"),water:e("#4d6961",.39,{metalness:0,transparent:!0,opacity:.94}),wood:e("#493529",.78),soffit:e("#4b3427",.92,{side:wt}),window:e("#211f1b",.92),blue:e("#ffffff",.88,{map:s}),paint:e("#706347",.82),gable:e("#534a39",.9),leaf:e("#354a2d",.96),leafLight:e("#4c5b35",.96),trunk:e("#635545",.98),rock:e("#87857a",.98),gray:e("#b6b9ae")}}function _t(){const l=[[.14,0],[.15,.12],[.115,.16],[.1,.94],[.13,.97],[.13,1.02],[.08,1.06],[.135,1.12],[.14,1.17],[.1,1.24],[.055,1.3],[0,1.33]],e=new xt(l.map(([t,i])=>new A(t,i)),12);return e.translate(0,-.65,0),e}function kt(){const l=new ze;l.moveTo(-.5,-.5),l.lineTo(.5,-.5),l.lineTo(.5,.5),l.lineTo(-.5,.5),l.closePath();const e=new ot;e.moveTo(-.31,-.13),e.lineTo(-.34,-.01),e.quadraticCurveTo(-.27,.05,-.22,.11),e.lineTo(-.12,.11),e.quadraticCurveTo(0,.29,.12,.11),e.lineTo(.22,.11),e.quadraticCurveTo(.27,.05,.34,-.01),e.lineTo(.31,-.13),e.lineTo(.17,-.13),e.lineTo(.11,-.22),e.lineTo(-.11,-.22),e.lineTo(-.17,-.13),e.closePath(),l.holes.push(e);const t=new Ae(l,{depth:1,bevelEnabled:!1,curveSegments:5});return t.translate(0,0,-.5),t}function vs(l){const e=new ze;e.moveTo(-.42,0),e.lineTo(.52,0),e.quadraticCurveTo(.88,.14,.64,.4),e.quadraticCurveTo(.28,.48,.28,.94),e.quadraticCurveTo(.28,1.5,-.4,1.78),e.quadraticCurveTo(-.69,1.87,-.63,1.64),e.quadraticCurveTo(-.5,1.35,-.1,1.17),e.lineTo(-.24,.95),e.quadraticCurveTo(-.5,.76,-.8,.9),e.lineTo(-.95,.71),e.lineTo(-.85,.51),e.lineTo(-.63,.52),e.quadraticCurveTo(-.42,.28,-.42,0);const t=new Ae(e,{depth:.52,bevelEnabled:!0,bevelThickness:.04,bevelSize:.04,bevelSegments:2,curveSegments:10});t.translate(0,0,-.26),t.computeBoundingBox();const i=t.boundingBox;return t.translate(0,-i.min.y,0),t.scale(l/(i.max.y-i.min.y),l/(i.max.y-i.min.y),1),t}const ws=new tt,xs=new Mt,Ms=new z;class pe{constructor(e){this.materials=e,this.parts=new Map}add(e,t,i=0,o=0,s=0,n=0){e.applyMatrix4(ws.compose(Ms.set(i,o,s),xs.setFromAxisAngle(new z(0,1,0),n),new z(1,1,1)));const a=this.parts.get(t)||[];a.push(e.toNonIndexed&&e.index?e.toNonIndexed():e),e.index&&e.dispose(),this.parts.set(t,a)}box(e,t,i,o,s,n,a,d=0){if(e<=0||t<=0||i<=0)return;const p=new Ne(e,t,i),u={wall:[4,4],red:[3,3],brick:[1.2,.48],stone:[2.4,1.6],pave:[2.4,2.4],blue:[12.8,t]};if(u[a]){const x=p.attributes.uv,y=[[i,t],[i,t],[e,i],[e,i],[e,t],[e,t]],[m,w]=u[a];for(let b=0;b<x.count;b++){const S=y[Math.floor(b/4)];x.setXY(b,x.getX(b)*S[0]/m,x.getY(b)*S[1]/w)}}this.add(p,a,o,s,n,d)}finish(){const e=new Le;for(const[t,i]of this.parts){const o=bt(i,!1),s=new te(o,this.materials[t]);s.castShadow=t!=="water",s.receiveShadow=!0,e.add(s);for(const n of i)n.dispose()}return this.parts.clear(),e}}function Re(l,e=[],t=1){const i=new ze(l.map(s=>new A(s[0],-s[1])));for(const s of e)i.holes.push(new ot(s.map(n=>new A(n[0],-n[1]))));const o=new Ae(i,{depth:t,bevelEnabled:!1,steps:1});return o.rotateX(-Math.PI/2),o}function ee(l,e,t){let i=!1;for(let o=0,s=t.length-1;o<t.length;s=o++){const[n,a]=t[o],[d,p]=t[s];a>e!=p>e&&l<(d-n)*(e-a)/(p-a)+n&&(i=!i)}return i}function et(l,e,t,i){const o=i[0]-t[0],s=i[1]-t[1],n=Math.max(0,Math.min(1,((l-t[0])*o+(e-t[1])*s)/(o*o+s*s||1)));return Math.hypot(l-t[0]-n*o,e-t[1]-n*s)}function bs(l,e,t,i="hip",o=12){const s=[],n=[],a=i==="pyramid"?0:i==="gable"?l/2:i==="gable-skirt"?l*.4:i==="eave-skirt"?(l-3)*.41:i==="truncated"?l*.28:Math.max(0,l/2-e*.36),d=i==="truncated"?e*.23:i==="gable-skirt"?e*.25:i==="eave-skirt"?(e-3)*.325:0;function p(m,w,b){let S,c;if(m<2){const f=a+(l/2-a)*b;S=w*f,c=(d+(e/2-d)*b)*(m===0?1:-1)}else S=(a+(l/2-a)*b)*(m===2?1:-1),c=w*(d+(e/2-d)*b);const M=Math.abs(w)**8*b**6,r=t*(1-b)**1.65+Math.min(.65,t*.12)*M;return[S,r,c]}const u=i==="gable"?2:4;for(let m=0;m<u;m++)for(let w=0;w<o;w++)for(let b=0;b<o;b++){const S=b/o*2-1,c=(b+1)/o*2-1,M=w/o,r=(w+1)/o,f=[p(m,S,M),p(m,c,M),p(m,c,r),p(m,S,r)];for(const v of m===0||m===3?[0,2,1,0,3,2]:[0,1,2,0,2,3])s.push(...f[v]),n.push(m<2?(f[v][0]+l/2)/1.6:(f[v][2]+e/2)/1.6,m<2?(f[v][2]+e/2)/1.6:(f[v][0]+l/2)/1.6)}if(i==="truncated"||i==="gable-skirt"){const m=[[-a,t,-d],[a,t,-d],[a,t,d],[-a,t,d]];for(const w of[0,2,1,0,3,2])s.push(...m[w]),n.push(m[w][0],m[w][2])}const x=new Ie;x.setAttribute("position",new se(s,3)),x.setAttribute("uv",new se(n,2));const y=Ft(x,1e-5);return y.computeVertexNormals(),x.dispose(),y}function Te(l,e,t="hip",i=!1){const{x:o,z:s,w:n,d:a,h:d,base:p=0}=e,u=d*(i?.39:.55),x=p+(i?d*.66:u),y=e.crestHeight||0,m=p+d-y,w=m-x,b=e.yaw||0,S=(r,f,v,T,h,g=e.id?16:8)=>{const C=bs(r,f,v,T,g);(e.id||i)&&l.add(C.clone(),"soffit",o,h-.075,s,b),l.add(C,"tile",o,h,s,b)};if(i){S(n+3,a+3,d*.16,"eave-skirt",p+u),l.box(n*.82,d*.24,a*.65,o,p+u+d*.12,s,"window",b);for(const r of[-1,1]){const f=x-d*.065,v=r*a*.327,T=Math.cos(b),h=Math.sin(b);l.box(n*.82,d*.085,.14,o+v*h,f,s+v*T,"blue",b),l.box(n*.84,.25,.26,o+v*h,x-.15,s+v*T,"paint",b)}}const c=i?n*.9+2:n+3,M=i?a*.88+2:a+3;if(t==="gablehip"){S(c,M,w*.4,"gable-skirt",x),S(c*.8,M*.5,w*.6,"gable",x+w*.4);const r=[],f=[];for(const T of[-1,1]){const h=[];for(let g=0;g<=24;g++){const C=(g/24*2-1)*M*.25,P=Math.abs(g/24*2-1),_=w*.6*(1-P)**1.65;h.push([T*c*.4,_,C])}for(let g=1;g<h.length;g++){const C=[[T*c*.4,0,0],h[g-1],h[g]];for(const P of T>0?C:C.toReversed())r.push(...P),f.push(P[2],P[1])}}const v=new Ie;v.setAttribute("position",new se(r,3)),v.setAttribute("uv",new se(f,2)),v.computeVertexNormals(),l.add(v,"gable",o,x+w*.4,s,b)}else S(c,M,w,t,x);if(t!=="pyramid"&&t!=="truncated"){const r=t==="gable"||t==="gablehip"?c*(t==="gablehip"?.8:1):Math.max(1,c-M*.72),f=new Ee(.23,.23,r,10);if(f.rotateZ(Math.PI/2),l.add(f,"ridge",o,m-.23,s,b),y)for(const v of[-1,1]){const T=vs(y);if(v<0){T.scale(-1,1,1);const h=T.index;if(h)for(let g=0;g<h.count;g+=3){const C=h.getX(g);h.setX(g,h.getX(g+2)),h.setX(g+2,C)}else for(const g of Object.values(T.attributes))for(let C=0;C<g.count;C+=3)for(let P=0;P<g.itemSize;P++){const _=g.array[C*g.itemSize+P];g.array[C*g.itemSize+P]=g.array[(C+2)*g.itemSize+P],g.array[(C+2)*g.itemSize+P]=_}T.computeVertexNormals()}l.add(T,"ridge",o+Math.cos(b)*v*r/2,m,s-Math.sin(b)*v*r/2,b)}}if(t==="pyramid"){const r=new yt(.65,10,8);r.scale(1,1.4,1),l.add(r,"gold",o,p+d+.4,s)}}function K(l,e,t){const i=new Lt(l,e,t.length),o=new It;return t.forEach((s,n)=>{o.position.set(s.x,s.y,s.z),o.rotation.set(0,s.ry||0,s.rz||0),s.q&&o.quaternion.fromArray(s.q),o.scale.set(s.sx||1,s.sy||1,s.sz||1),o.updateMatrix(),i.setMatrixAt(n,o.matrix)}),i.castShadow=!0,i.receiveShadow=!0,i.computeBoundingSphere(),i}function Xs(l,e,t,i,o,s,n=8){const a=[],d=[];for(let u=0;u<4;u++){const x=u<2,y=x?i:o,m=Math.max(2,Math.floor(y/2.7));for(let w=0;w<=m;w++){const b=-y/2+y*w/m;x&&Math.abs(b)<n||(a.push({x:e+(x?b:u===2?-i/2:i/2),y:s+.65,z:t+(x?u===0?-o/2:o/2:b)}),w<m&&(!x||Math.abs(b+y/m/2)>n)&&d.push({x:e+(x?b+y/m/2:u===2?-i/2:i/2),y:s+.5,z:t+(x?u===0?-o/2:o/2:b+y/m/2),sx:y/m,sy:.6,sz:.17,ry:x?0:Math.PI/2}))}}const p=new Le;return p.add(K(_t(),l.materials.stone,a)),p.add(K(kt(),l.materials.stone,d)),p}function Et(l){let e=0;for(let t=1;t<l.length;t++)e+=l[t-1][0]*l[t][1]-l[t][0]*l[t-1][1];return Math.abs(e)/2}const dt={"osm-638449433":8.13,"osm-638460849":8.13,"osm-638467894":8.13,"osm-638981252":2,"osm-638981261":2};function ut(l,e,t,i,o=0){const s=Re(e,t,i);for(const n of s.groups){const a=new Ie;for(const[d,p]of Object.entries(s.attributes))a.setAttribute(d,new Ut(p.array.slice(n.start*p.itemSize,(n.start+n.count)*p.itemSize),p.itemSize));if(n.materialIndex===0){const d=a.attributes.uv;for(let p=0;p<d.count;p++)d.setXY(p,d.getX(p)/2.4,d.getY(p)/2.4)}l.add(a,n.materialIndex===0?"pave":"stone",0,o,0)}s.dispose()}function ys(l){if(Et(l.points)/(l.w*l.d)>.78&&l.holes.length===0)return[{x:l.x,z:l.z,w:l.w,d:l.d}];const t=2.5,i=Math.max(1,Math.ceil(l.w/t)),o=Math.max(1,Math.ceil(l.d/t)),s=l.w/i,n=l.d/o,a=l.x-l.w/2,d=l.z-l.d/2,p=Array.from({length:o},(x,y)=>Array.from({length:i},(m,w)=>{const b=a+(w+.5)*s,S=d+(y+.5)*n;return ee(b,S,l.points)&&!l.holes.some(c=>ee(b,S,c))})),u=[];for(let x=0;x<o;x++)for(let y=0;y<i;y++)if(p[x][y]){let m=1;for(;y+m<i&&p[x][y+m];)m++;let w=1;e:for(;x+w<o;){for(let b=0;b<m;b++)if(!p[x+w][y+b])break e;w++}for(let b=x;b<x+w;b++)for(let S=y;S<y+m;S++)p[b][S]=!1;u.push({x:a+(y+m/2)*s,z:d+(x+w/2)*n,w:m*s,d:w*n})}return u}async function Ss(l,e,t,i,o){const s=new Map(t.items.flatMap(S=>[S.name,...S.aliases||[]].map(c=>[c,S]))),n=new Map,a=[],d=[],p=[],u=[],x=(S,c)=>{const M=`${Math.floor(S/150)},${Math.floor(c/150)}`;return n.has(M)||n.set(M,new pe(i)),n.get(M)},y=(S,c)=>{const M=x(S.x,S.z);if(c>5)for(let r=0;r<3;r++){const f=1-r*.018,v=S.points.map(([T,h])=>[S.x+(T-S.x)*f,S.z+(h-S.z)*f]);ut(M,v,S.holes,c/3,r*c/3)}else ut(M,S.points,S.holes,c);d.push({id:S.id,points:S.points,holes:S.holes,height:c})};for(let S=0;S<e.buildings.length;S++){const c=e.buildings[S];S%45===0&&(o(S/e.buildings.length),await new Promise(h=>requestAnimationFrame(h)));const M=s.get(c.name),r=x(c.x,c.z),f=Et(c.points)/(c.w*c.d||1),v=c.tags.building==="wall"||c.name.includes("墙");if(v&&c.name.endsWith("门")){const h=Math.max(c.w,c.d),g=Math.min(c.w,c.d),C=c.d>c.w;xe(r,C?c.z:c.x,C?c.x:c.z,h,g,4,a,C);continue}if(v){r.add(Re(c.points,c.holes,3.5),"wall"),a.push({points:c.points,holes:c.holes,height:3.5,kind:"wall"});continue}if(dt[c.id]){y(c,dt[c.id]);continue}if(c.name==="延禧宫"){r.add(Re(c.points,c.holes,1),"stone"),a.push({points:c.points,holes:c.holes,height:6,kind:"closed"});continue}if(["万春亭","千秋亭"].includes(c.name)){const h={x:c.x,z:c.z,w:10.5,d:10.5,h:11,base:.6};r.box(9,5.6,9,c.x,3.4,c.z,"darkTile"),Te(r,{...h,h:7},"hip",!1);const g=[new A(5.7,0),new A(5,.15),new A(4,.55),new A(3,1.25),new A(2,2.3),new A(1,3.7),new A(.25,4.8),new A(0,4.95)];r.add(new xt(g,48),"tile",c.x,6.5,c.z),r.add(new yt(.55,12,8),"gold",c.x,11.65,c.z);for(const C of[0,1])for(const P of[-1,1])j(r,{x:c.x+(C===0?P*6:0),z:c.z+(C===1?P*6:0),w:C===0?3:5,d:C===0?5:3,h:5.8,base:.6},"gable",!1);a.push({points:c.points,holes:c.holes,height:12,kind:"closed"});continue}if(!M&&f>.78&&c.w*c.d>2800){y(c,1);continue}if(M?.special==="wumen"){const h=c.x,g=480.5;xe(r,h,g,190,28,12,a);for(const P of[-1,1]){r.box(23,12,80,h+P*82,6,g+47,"wall"),a.push(B(h+P*82,g+47,23,80)),Te(r,{x:h+P*82,z:g+42,w:19,d:72,h:8,base:12,yaw:Math.PI/2},"gable",!1);for(const _ of[g+3,g+85])j(r,{x:h+P*82,z:_,w:17,d:17,h:15,base:12},"pyramid",!0)}j(r,{x:h,z:g,w:60,d:25,h:25,base:12},"hip",!0);const C={...c,...M,x:h,z:g,w:60,d:25};C.detailParts=[{...C,special:void 0}],p.push(C),u.push(Me(C));continue}if(["神武门","东华门","西华门"].includes(c.name)){const h=c.name!=="神武门",g=h?48:115,C=h?24:26,P=10;h?(xe(r,c.z,c.x,115,24,P,a,!0),j(r,{x:c.x,z:c.z,w:45,d:17,h:19,base:10,yaw:Math.PI/2},"hip",!0)):(xe(r,c.x,-480.5,g,C,P,a),j(r,{x:c.x,z:-480.5,w:48,d:18,h:21,base:10},"hip",!0));const _={...c,...M||{id:c.name,name:c.name,sourceId:"236502",status:"外观示意；尺寸估算",description:"东西城门的城台、门洞与城楼分开建立。"},z:h?c.z:-480.5};p.push(_),u.push(Me(_));continue}if(M){const h={...c,...M,w:M.w||c.w-3,d:M.d||c.d-3,footprintSource:c.source,source:M.sourceURL||`https://www.dpm.org.cn/explore/building/${M.sourceId}.html`};if(M.special==="linked-halls"){const g=(c.d-12)/2;h.detailParts=[];for(const C of[-1,1]){const P={...h,d:g,z:c.z+C*(c.d-g)/2,special:void 0,detailParts:void 0};j(r,P,M.roof,!1),h.detailParts.push(P)}j(r,{...h,w:8,d:14,h:6},"gable",!1),a.push({points:c.points,holes:c.holes,height:10,kind:"closed"})}else{if(j(r,h,M.roof,M.double,M.gate),M.base&&M.base<8){const g=M.platformMargin??8;r.box(h.w+g,M.base,h.d+g,h.x,M.base/2,h.z,"stone",h.yaw||0);const C=!!h.yaw;d.push(Ps(h.x,h.z,(C?h.d:h.w)+g,(C?h.w:h.d)+g,M.base))}M.gate?(a.push(B(h.x-h.w*.32,h.z,h.w*.36,h.d)),a.push(B(h.x+h.w*.32,h.z,h.w*.36,h.d))):a.push(B(h.x,h.z,h.yaw?h.d*.86:h.w*.88,h.yaw?h.w*.88:h.d*.86))}p.push(h),u.push(Me(h));continue}const T=ys(c);for(const h of T){if(h.w<.4||h.d<.4)continue;if(Math.min(h.w,h.d)<2.3){r.box(h.w,3.2,h.d,h.x,1.6,h.z,"wall");continue}const C=h.d>h.w*1.3,P=C?h.d:h.w,_=C?h.w:h.d,E=Math.min(10,Math.max(4.5,_*.55)),R=c.name==="文渊阁"||c.name.includes("雨花")||c.tags["roof:colour"]==="green",N={x:h.x,z:h.z,w:Math.max(1,P-2),d:Math.max(1,_-2),h:E,base:.5,yaw:C?Math.PI/2:0};if(R){const L=new pe({...i,tile:i.darkTile});j(L,N,"gable",c.name==="文渊阁");const I=L.finish();l.add(I)}else j(r,N,c.tags["roof:shape"]==="hipped"?"hip":c.name.endsWith("亭")?"pyramid":"gable",!1)}a.push({points:c.points,holes:c.holes,height:8,kind:"closed"})}const m=[];for(const S of n.values()){const c=S.finish();l.add(c),m.push(c)}const w=new pe(i);for(const S of[-1,1])for(const c of[-1,1]){const M=S*367,r=c*471,f={x:M,z:r,w:8.73,d:8.73,h:17,base:10};j(w,f,"gablehip",!0),Te(w,{...f,w:12.5,d:12.5,h:9,base:10},"hip",!1);for(const T of[0,1])for(const h of[-1,1]){const g=T===0?h===-S:h===-c,C=g?3.98:1.6;j(w,{x:M+(T===0?h*(4.365+C/2):0),z:r+(T===1?h*(4.365+C/2):0),w:T===0?C:4.5,d:T===0?4.5:C,h:9,base:10},"gablehip",!1)}const v={...f,id:`corner-${S}-${c}`,name:`${c<0?"北":"南"}${S<0?"西":"东"}角楼`,sourceId:"236522",status:"中央8.73米核对；复合屋顶轮廓估算",description:"十字形平面、三重檐复合屋顶。中央方亭8.73米与内外抱厦深度采用官方值，构件和七十二脊未逐条复原。"};p.push(v),u.push(Me(v))}const b=w.finish();return l.add(b),m.push(b),{groups:m,colliders:a,platforms:d,models:p,picks:u}}function j(l,e,t,i,o=!1){const s=e.h*(i?.39:.55),n=e.yaw||0,a=Math.cos(n),d=Math.sin(n),p=e.base||0,u=(x,y,m,w,b,S,c)=>l.box(x,y,m,e.x+w*a+S*d,b,e.z-w*d+S*a,c,n);if(o)u(e.w*.28,s,e.d,-e.w*.36,p+s/2,0,"red"),u(e.w*.28,s,e.d,e.w*.36,p+s/2,0,"red"),u(e.w*.44,s*.22,e.d,0,p+s*.89,0,"red");else{const x=e.bays||Math.max(3,Math.min(15,Math.round(e.w/4))),y=e.w*.88/x;u(e.w*.88,s,e.d*.86,0,p+s/2,0,e.id?"window":"wall");for(const m of[-1,1]){u(e.w*.89,s*.17,.19,0,p+s*.085,m*e.d*.434,"brick");for(let w=0;w<x;w++){const b=-e.w*.44+(w+.5)*y,S=w===Math.floor(x/2),c=m*e.d*.439;u(y*.84,s*.59,.1,b,p+s*.5,c,"window"),u(y*.84,s*.21,.11,b,p+s*.22,c+m*.03,"red");for(let M=0;M<=4;M++)u(.075,s*.76,.13,b-y*.42+M*y*.21,p+s*.46,c+m*.065,"red");for(const M of[.14,.32,.8])u(y*.88,.11,.15,b,p+s*M,c+m*.065,"paint");S&&u(y*.85,.12,.45,b,p+.07,c,"stone")}if(u(e.w*.92,.45,.32,0,p+s-.5,m*e.d*.45,"blue"),e.id)for(let w=0;w<=x;w++){const b=-e.w*.48+w*e.w*.96/x,S=m*e.d*.48;l.add(new Ee(.23,.26,s,10),"red",e.x+b*a+S*d,p+s/2,e.z-b*d+S*a)}}for(const m of[-1,1])u(.15,s*.16,e.d*.87,m*e.w*.443,p+s*.08,0,"brick")}Te(l,e,t,i),u(e.w,.48,e.d,0,p+s-.24,0,"blue")}function xe(l,e,t,i,o,s,n,a=!1){const d=Math.min(22,i*.4),p=(i-d)/2,u=new ze;u.moveTo(-i/2,0),u.lineTo(i/2,0),u.lineTo(i/2,s),u.lineTo(-i/2,s),u.closePath();const x=i>60?3:1,y=x===3?5.5:d*.75;for(let w=0;w<x;w++){const b=(w-(x-1)/2)*7.1,S=y/2,c=new ot;c.moveTo(b-S,0),c.lineTo(b-S,s*.5),c.absarc(b,s*.5,S,Math.PI,0,!0),c.lineTo(b+S,0),c.closePath(),u.holes.push(c)}const m=new Ae(u,{depth:o,bevelEnabled:!1,steps:1});m.translate(0,0,-o/2),l.add(m,"wall",a?t:e,0,a?e:t,a?Math.PI/2:0);for(const w of[-1,1]){const b=e+w*(p/2+d/2);n.push(a?B(t,b,o,p):B(b,t,p,o))}if(x===3)for(const w of[-1,1])n.push(a?B(t,e+w*3.55,o,1.6):B(e+w*3.55,t,1.6,o))}function B(l,e,t,i){return{points:[[l-t/2,e-i/2],[l+t/2,e-i/2],[l+t/2,e+i/2],[l-t/2,e+i/2]],holes:[],height:20,kind:"closed"}}function Ps(l,e,t,i,o){return{...B(l,e,t,i),height:o}}function Me(l){const e=new te(new Ne(l.w||20,(l.h||20)+(l.base||0),l.d||20),new jt({visible:!1}));return e.position.set(l.x,((l.h||20)+(l.base||0))/2,l.z),e.rotation.y=l.yaw||0,e.userData.model=l,e}function Ts(l,e,t){const i=[],o=[],s=[];let n=936;const a=()=>(n=Math.imul(n,1664525)+1013904223>>>0,n/4294967296),d=(r,f,v,T)=>{const h=new z().subVectors(f,r),g=new Mt().setFromUnitVectors(new z(0,1,0),h.clone().normalize());T.push({x:(r.x+f.x)/2,y:(r.y+f.y)/2,z:(r.z+f.z)/2,sx:v,sy:h.length(),sz:v,q:g.toArray()})};for(const[r,[f,v]]of e.entries()){const T=8.5+r%5*.65,h=r%3===0?4:3.1,g=(a()-.5)*.7,C=new z(f,0,v),P=new z(f+g,4,v-.2),_=new z(f+g*.8,T-.5,v+.25);d(C,P,.36,i),d(P,_,.24,i);for(let E=0;E<18;E++){const R=E*2.399+a()*.6,N=3.6+E/18*(T-4.2),L=h*(.45+.55*Math.sin((N-2)/T*Math.PI)),I=new z(f+g*.5,N,v),$=new z(f+Math.cos(R)*L,N+.4+a(),v+Math.sin(R)*L);d(I,$,.06+a()*.07,o);for(let F=0;F<7;F++){const D=.38+F*.1,U=I.clone().lerp($,D),O=.46+a()*.46;s.push({x:U.x+(a()-.5)*.65,y:U.y+(a()-.4)*.8,z:U.z+(a()-.5)*.65,sx:O*(.9+a()*.45),sy:O*(.6+a()*.55),sz:O*(.9+a()*.45),ry:a()*Math.PI,rz:(a()-.5)*.35})}}for(let E=0;E<16;E++)s.push({x:f+g+(a()-.5)*1.8,y:T-.3+a()*.8,z:v+(a()-.5)*1.8,sx:.6,sy:.65,sz:.6,ry:a()*Math.PI})}const p=document.createElement("canvas");p.width=p.height=512;const u=p.getContext("2d");function x(r,f,v,T,h){const g=r+Math.cos(v)*T,C=f+Math.sin(v)*T;if(u.strokeStyle=h>1?"#66704b":"#576c45",u.lineWidth=h>1?3:1.6,u.beginPath(),u.moveTo(r,f),u.lineTo(g,C),u.stroke(),h>0)for(let P=2;P<8;P++){const _=P/8;for(const E of[-1,1])x(r+(g-r)*_,f+(C-f)*_,v+E*(.5+a()*.3),T*(.24+a()*.17),h-1)}else for(let P=0;P<12;P++){const _=P/12,E=r+(g-r)*_,R=f+(C-f)*_;u.fillStyle=["#647947","#52663b","#768154","#445c37"][Math.floor(a()*4)],u.beginPath(),u.ellipse(E,R,2+a()*2,5+a()*3,v+(a()-.5),0,Math.PI*2),u.fill()}}x(256,475,-Math.PI/2,380,3),x(250,402,-2.02,260,2),x(260,406,-1.06,260,2);const y=new ue(p);y.colorSpace=De,y.anisotropy=4;const m=new Ee(.65,1,1,8),w=new Ee(.32,1,1,6),b=[];for(let r=0;r<4;r++){const f=new st(2,2);f.rotateY(r*Math.PI/4),r===3&&f.rotateX(Math.PI/3),b.push(f)}const S=bt(b);b.forEach(r=>r.dispose());const c=new gt({map:y,color:"#e0e7cc",roughness:.94,side:vt,alphaTest:.4,alphaToCoverage:!1,emissive:"#0b1607",emissiveIntensity:.16});c.onBeforeCompile=r=>{r.fragmentShader=r.fragmentShader.replace("#include <alphatest_fragment>",`#include <alphatest_fragment>
diffuseColor.a = 1.0;`)};const M=new Le;return M.add(K(m,t.trunk,i),K(w,t.trunk,o),K(S,c,s)),l.add(M),M}function Cs(l,e,t){const i=new pe(t),o=[],s=[],n=[],a=[],d=new te(new st(1800,2e3),t.earth);d.rotation.x=-Math.PI/2,d.position.y=-.6,d.receiveShadow=!0,l.add(d);const p=new st(753,961),u=p.attributes.uv;for(let r=0;r<u.count;r++)u.setXY(r,u.getX(r)*753/3,u.getY(r)*961/3);const x=new te(p,t.pave);x.rotation.x=-Math.PI/2,x.receiveShadow=!0,x.position.y=.01,l.add(x);const y=753/2,m=961/2;for(const r of[-1,1])i.box(52,.1,1081,r*(y+8+26),-.22,0,"water");i.box(769,.1,52,0,-.22,-514.5,"water");for(const r of[-1,1])i.box(y+8-96,.1,52,r*(96+(y+8-96)/2),-.22,m+8+26,"water");n.push({rect:[y+8,y+60,-m-60,m+60]},{rect:[-y-60,-y-8,-m-60,m+60]},{rect:[96,y+8,m+8,m+60]},{rect:[-y-8,-96,m+8,m+60]},{rect:[-y-8,y+8,-m-60,-m-8]});for(const r of[-m,m])for(const f of[-1,1]){const v=r>0?95:57,T=y-v;i.box(T,10,8,f*(v+T/2),5,r,"wall"),o.push({a:[f*v,r],b:[f*y,r],radius:4,height:10,kind:"wall"})}const w=e.buildings.filter(r=>["东华门","西华门"].includes(r.name));for(const r of[-y,y]){const f=w.find(v=>Math.sign(v.x)===Math.sign(r))?.z||340;for(const[v,T]of[[-m,f-57],[f+57,m]])i.box(8,10,T-v,r,5,(v+T)/2,"wall"),o.push({a:[r,v],b:[r,T],radius:4,height:10,kind:"wall"})}const b=[];for(const r of[-m,m])for(let f=-y;f<y;f+=3)Math.abs(f)<(r>0?96:58)||b.push({x:f,y:10.55,z:r,sx:1.4,sy:1.1,sz:1});for(const r of[-y,y])for(let f=-m;f<m;f+=3)w.some(v=>Math.sign(v.x)===Math.sign(r)&&Math.abs(v.z-f)<57)||b.push({x:r,y:10.55,z:f,sx:1,sy:1.1,sz:1.4});l.add(K(new Ne(1,1,1),t.wall,b));for(const r of e.walls)if(!r.outer)for(let f=1;f<r.points.length;f++){const v=r.points[f-1],T=r.points[f],h=T[0]-v[0],g=T[1]-v[1],C=Math.hypot(h,g);C<.1||(i.box(C,3.5,.65,(v[0]+T[0])/2,1.75,(v[1]+T[1])/2,"wall",-Math.atan2(g,h)),o.push({a:v,b:T,radius:.4,height:3.5,kind:"wall"}))}for(const r of e.water)if(r.name!=="筒子河")if(r.polygon)i.add(Re(r.points,[],.05),"water",0,.025,0),n.push({points:r.points});else for(let f=1;f<r.points.length;f++){const v=r.points[f-1],T=r.points[f],h=T[0]-v[0],g=T[1]-v[1],C=Math.hypot(h,g);i.box(C,.08,r.width,(v[0]+T[0])/2,.03,(v[1]+T[1])/2,"water",-Math.atan2(g,h)),n.push({a:v,b:T,radius:r.width/2})}let c=e.paths.filter(r=>r.bridge&&Math.abs(r.points[0]?.[0]||0)<60&&r.points.some(f=>f[1]>360&&f[1]<440)).map(r=>{const f=r.points[0],v=r.points.at(-1);return{x:(f[0]+v[0])/2,z:(f[1]+v[1])/2,w:Math.abs(f[0])<5?7:5,d:Math.hypot(v[0]-f[0],v[1]-f[1])}});if(c.length!==5){const r=e.water.find(f=>f.name==="内金水河"&&!f.polygon);c=[-38,-19,0,19,38].map(f=>{let v=405,T=1/0;for(const h of r?.points||[])h[1]<330||h[1]>460||Math.abs(h[0]-f)<T&&(T=Math.abs(h[0]-f),v=h[1]);return{x:f,z:v,w:f===0?7:5,d:17}})}for(const r of c){r.d=Math.max(12,Math.min(25,r.d)),a.push(r);for(let f=0;f<20;f++){const v=r.z-r.d/2+(f+.5)*r.d/20,T=(f+.5)/20,h=.8*Math.sin(Math.PI*T);i.box(r.w,.3,r.d/20,r.x,h-.15,v,"stone");for(const g of[-1,1])i.box(.18,.8,r.d/20,r.x+g*(r.w/2-.1),h+.6,v,"stone"),f%3===0&&i.box(.3,1.25,.3,r.x+g*(r.w/2-.1),h+.7,v,"stone")}}i.box(140,.035,80,-2,.018,-389,"earth");for(const r of e.paths)if(!(r.bridge||r.steps))for(let f=1;f<r.points.length;f++){const v=r.points[f-1],T=r.points[f],h=T[0]-v[0],g=T[1]-v[1],C=Math.hypot(h,g);C>.5&&i.box(C,.035,Math.abs((v[0]+T[0])/2)<5?4:1.5,(v[0]+T[0])/2,.05,(v[1]+T[1])/2,"stone",-Math.atan2(g,h))}Ts(l,e.trees,t);const M=i.finish();return M.traverse(r=>{r.isMesh&&(r.material===t.stone||r.material===t.water||r.material===t.earth)&&(r.castShadow=!1)}),l.add(M),{groups:[M],colliders:o,ramps:s,waterAreas:n,bridges:a,positions:c}}function _s(l,e,t){const i=new pe(t),o=[],s=[],n=[];for(const d of e){const p=d.points.map(S=>S[0]),u=d.points.map(S=>S[1]),x=(Math.max(...p)+Math.min(...p))/2,y=Math.max(...p)-Math.min(...p),m=Math.max(...u)-Math.min(...u),w=(Math.max(...u)+Math.min(...u))/2;if(y<10||d.height<1)continue;const b=d.id==="osm-638449433"?[1]:d.id==="osm-638467894"?[-1]:d.id==="osm-638460849"?[]:[-1,1];for(const S of b){const c=w+S*m/2,M=d.height*2.8,r=Math.ceil(d.height/.18),f=d.height>5?18:8,v={x,z:c+S*M/2,w:f,d:M,height:d.height,edge:c,side:S};o.push(v);for(let T=0;T<r;T++){const h=d.height*(T+1)/r,g=c+S*(M-(T+.5)*M/r);i.box(f,h,M/r,x,h/2,g,"stone")}}if(d.height>5)for(let S=0;S<3;S++){const c=1-S*.018,M=d.height*(S+1)/3,r=d.points.map(f=>[x+(f[0]-x)*c,w+(f[1]-w)*c]);for(let f=1;f<r.length;f++){const v=r[f-1],T=r[f],h=T[0]-v[0],g=T[1]-v[1],C=Math.hypot(h,g);if(C<.7)continue;const P=Math.max(1,Math.round(C/2.7)),_=C/P,E=-Math.atan2(g,h);for(let R=0;R<P;R++){const N=R/P,L=(R+.5)/P,I=v[0]+h*N,$=v[1]+g*N,F=v[0]+h*L,D=v[1]+g*L;Math.abs(F-x)<10&&Math.abs(g)<Math.abs(h)*.2&&Math.abs(D-w)>m*.43||(s.push({x:I,y:M+.65,z:$}),n.push({x:F,y:M+.6,z:D,sx:Math.max(.2,_-.23),sy:.7,sz:.18,ry:E}))}}}}const a=i.finish();return a.add(K(_t(),t.stone,s)),a.add(K(kt(),t.stone,n)),l.add(a),{group:a,ramps:o}}function ks(l,e,t,i,o){let s=0;for(const n of t)ee(l,e,n.points)&&!n.holes.some(a=>ee(l,e,a))&&(s=Math.max(s,n.height));for(const n of i)if(Math.abs(l-n.x)<n.w/2&&Math.abs(e-n.z)<n.d/2){const a=1-Math.abs(e-n.edge)/n.d;s=Math.max(s,n.height*Math.max(0,a))}for(const n of o)Math.abs(l-n.x)<n.w/2&&Math.abs(e-n.z)<n.d/2&&(s=Math.max(s,.8*Math.cos((e-n.z)/n.d*Math.PI)));return s}class Fe extends te{constructor(){const e=Fe.SkyShader,t=new Y({name:e.name,uniforms:J.clone(e.uniforms),vertexShader:e.vertexShader,fragmentShader:e.fragmentShader,side:wt,depthWrite:!1});super(new Ne(1,1,1),t),this.isSky=!0}}Fe.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new z},up:{value:new z(0,1,0)}},vertexShader:`
		uniform vec3 sunPosition;
		uniform float rayleigh;
		uniform float turbidity;
		uniform float mieCoefficient;
		uniform vec3 up;

		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		// constants for atmospheric scattering
		const float e = 2.71828182845904523536028747135266249775724709369995957;
		const float pi = 3.141592653589793238462643383279502884197169;

		// wavelength of used primaries, according to preetham
		const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
		// this pre-calculation replaces older TotalRayleigh(vec3 lambda) function:
		// (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
		const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

		// mie stuff
		// K coefficient for the primaries
		const float v = 4.0;
		const vec3 K = vec3( 0.686, 0.678, 0.666 );
		// MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
		const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

		// earth shadow hack
		// cutoffAngle = pi / 1.95;
		const float cutoffAngle = 1.6110731556870734;
		const float steepness = 1.5;
		const float EE = 1000.0;

		float sunIntensity( float zenithAngleCos ) {
			zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
			return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
		}

		vec3 totalMie( float T ) {
			float c = ( 0.2 * T ) * 10E-18;
			return 0.434 * c * MieConst;
		}

		void main() {

			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vWorldPosition = worldPosition.xyz;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			gl_Position.z = gl_Position.w; // set z to camera.far

			vSunDirection = normalize( sunPosition );

			vSunE = sunIntensity( dot( vSunDirection, up ) );

			vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

			float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

			// extinction (absorption + out scattering)
			// rayleigh coefficients
			vBetaR = totalRayleigh * rayleighCoefficient;

			// mie coefficients
			vBetaM = totalMie( turbidity ) * mieCoefficient;

		}`,fragmentShader:`
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		uniform float mieDirectionalG;
		uniform vec3 up;

		// constants for atmospheric scattering
		const float pi = 3.141592653589793238462643383279502884197169;

		const float n = 1.0003; // refractive index of air
		const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

		// optical length at zenith for molecules
		const float rayleighZenithLength = 8.4E3;
		const float mieZenithLength = 1.25E3;
		// 66 arc seconds -> degrees, and the cosine of that
		const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

		// 3.0 / ( 16.0 * pi )
		const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
		// 1.0 / ( 4.0 * pi )
		const float ONE_OVER_FOURPI = 0.07957747154594767;

		float rayleighPhase( float cosTheta ) {
			return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
		}

		float hgPhase( float cosTheta, float g ) {
			float g2 = pow( g, 2.0 );
			float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
			return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
		}

		void main() {

			vec3 direction = normalize( vWorldPosition - cameraPosition );

			// optical length
			// cutoff angle at 90 to avoid singularity in next formula.
			float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
			float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
			float sR = rayleighZenithLength * inverse;
			float sM = mieZenithLength * inverse;

			// combined extinction factor
			vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

			// in scattering
			float cosTheta = dot( direction, vSunDirection );

			float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
			vec3 betaRTheta = vBetaR * rPhase;

			float mPhase = hgPhase( cosTheta, mieDirectionalG );
			vec3 betaMTheta = vBetaM * mPhase;

			vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
			Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

			// nightsky
			float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
			float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
			vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
			vec3 L0 = vec3( 0.1 ) * Fex;

			// composition + solar disc
			float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
			L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

			vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

			vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );

			gl_FragColor = vec4( retColor, 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};function Es(l,e){const t=39.917*Math.PI/180,i=-22.5*Math.PI/180,o=-Math.sin(i),s=-Math.sin(t)*Math.cos(i),n=Math.cos(t)*Math.cos(i),a=-2.04*Math.PI/180,d=new z(o*Math.cos(a)-s*Math.sin(a),n,-(o*Math.sin(a)+s*Math.cos(a))).normalize(),p=new Fe;p.scale.setScalar(8e3);const u=p.material.uniforms;u.turbidity.value=1.7,u.rayleigh.value=3,u.mieCoefficient.value=.0012,u.mieDirectionalG.value=.82,u.sunPosition.value.copy(d),p.material.fragmentShader=p.material.fragmentShader.replace("vec4( retColor, 1.0 )","vec4( retColor * vec3( 0.168, 0.2184, 0.28 ), 1.0 )"),l.add(p);const x=new St;x.add(p.clone());const y=new Ot(e),m=y.fromScene(x,.04,.1,1e4);l.environment=m.texture,l.environmentIntensity=.23,y.dispose(),l.add(new $t("#d9e5f4","#6f6553",.38));const w=new Bt("#fff8ed",2.7);w.position.copy(d).multiplyScalar(850),w.castShadow=!0,w.shadow.bias=-6e-5,w.shadow.normalBias=.12,w.shadow.radius=2,l.add(w,w.target);let b=0;function S(c,M,r,f){const v=r?c.position:f||new z,T=c.position.distanceTo(v),h=r?65:Math.min(660,Math.max(95,T*.55));w.target.position.set(v.x,0,v.z),w.position.copy(w.target.position).addScaledVector(d,850),Object.assign(w.shadow.camera,{left:-h,right:h,top:h,bottom:-h,near:1,far:1800}),w.shadow.camera.updateProjectionMatrix();const g=M==="high"?4096:2048;b!==g&&(b=g,w.shadow.mapSize.set(g,g),w.shadow.map?.dispose(),w.shadow.map=null),w.castShadow=M!=="low"}return{sun:w,sky:p,environment:m,update:S,direction:d}}const Ce={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class ie{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Rs=new Gt(-1,1,1,-1,0,1);class Ds extends Ie{constructor(){super(),this.setAttribute("position",new se([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new se([0,2,0,0,2,0],2))}}const zs=new Ds;class nt{constructor(e){this._mesh=new te(zs,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Rs)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class As extends ie{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Y?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=J.clone(e.uniforms),this.material=new Y({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new nt(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class pt extends ie{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const o=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let n,a;this.inverse?(n=0,a=1):(n=1,a=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(o.REPLACE,o.REPLACE,o.REPLACE),s.buffers.stencil.setFunc(o.ALWAYS,n,4294967295),s.buffers.stencil.setClear(a),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(o.EQUAL,1,4294967295),s.buffers.stencil.setOp(o.KEEP,o.KEEP,o.KEEP),s.buffers.stencil.setLocked(!0)}}class Ns extends ie{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class Ls{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new A);this._width=i.width,this._height=i.height,t=new it(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:at}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new As(Ce),this.copyPass.material.blending=Q,this.clock=new Vt}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let o=0,s=this.passes.length;o<s;o++){const n=this.passes[o];if(n.enabled!==!1){if(n.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(o),n.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),n.needsSwap){if(i){const a=this.renderer.getContext(),d=this.renderer.state.buffers.stencil;d.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),d.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}pt!==void 0&&(n instanceof pt?i=!0:n instanceof Ns&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new A);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,o=this._height*this._pixelRatio;this.renderTarget1.setSize(i,o),this.renderTarget2.setSize(i,o);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,o)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Is extends ie{constructor(e,t,i=null,o=null,s=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=o,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Pt}render(e,t,i){const o=e.autoClear;e.autoClear=!1;let s,n;this.overrideMaterial!==null&&(n=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=n),e.autoClear=o}}class Fs{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let i,o,s;const n=.5*(Math.sqrt(3)-1),a=(e+t)*n,d=Math.floor(e+a),p=Math.floor(t+a),u=(3-Math.sqrt(3))/6,x=(d+p)*u,y=d-x,m=p-x,w=e-y,b=t-m;let S,c;w>b?(S=1,c=0):(S=0,c=1);const M=w-S+u,r=b-c+u,f=w-1+2*u,v=b-1+2*u,T=d&255,h=p&255,g=this.perm[T+this.perm[h]]%12,C=this.perm[T+S+this.perm[h+c]]%12,P=this.perm[T+1+this.perm[h+1]]%12;let _=.5-w*w-b*b;_<0?i=0:(_*=_,i=_*_*this._dot(this.grad3[g],w,b));let E=.5-M*M-r*r;E<0?o=0:(E*=E,o=E*E*this._dot(this.grad3[C],M,r));let R=.5-f*f-v*v;return R<0?s=0:(R*=R,s=R*R*this._dot(this.grad3[P],f,v)),70*(i+o+s)}noise3d(e,t,i){let o,s,n,a;const p=(e+t+i)*.3333333333333333,u=Math.floor(e+p),x=Math.floor(t+p),y=Math.floor(i+p),m=1/6,w=(u+x+y)*m,b=u-w,S=x-w,c=y-w,M=e-b,r=t-S,f=i-c;let v,T,h,g,C,P;M>=r?r>=f?(v=1,T=0,h=0,g=1,C=1,P=0):M>=f?(v=1,T=0,h=0,g=1,C=0,P=1):(v=0,T=0,h=1,g=1,C=0,P=1):r<f?(v=0,T=0,h=1,g=0,C=1,P=1):M<f?(v=0,T=1,h=0,g=0,C=1,P=1):(v=0,T=1,h=0,g=1,C=1,P=0);const _=M-v+m,E=r-T+m,R=f-h+m,N=M-g+2*m,L=r-C+2*m,I=f-P+2*m,$=M-1+3*m,F=r-1+3*m,D=f-1+3*m,U=u&255,O=x&255,H=y&255,me=this.perm[U+this.perm[O+this.perm[H]]]%12,ge=this.perm[U+v+this.perm[O+T+this.perm[H+h]]]%12,ve=this.perm[U+g+this.perm[O+C+this.perm[H+P]]]%12,we=this.perm[U+1+this.perm[O+1+this.perm[H+1]]]%12;let G=.6-M*M-r*r-f*f;G<0?o=0:(G*=G,o=G*G*this._dot3(this.grad3[me],M,r,f));let V=.6-_*_-E*E-R*R;V<0?s=0:(V*=V,s=V*V*this._dot3(this.grad3[ge],_,E,R));let W=.6-N*N-L*L-I*I;W<0?n=0:(W*=W,n=W*W*this._dot3(this.grad3[ve],N,L,I));let q=.6-$*$-F*F-D*D;return q<0?a=0:(q*=q,a=q*q*this._dot3(this.grad3[we],$,F,D)),32*(o+s+n+a)}noise4d(e,t,i,o){const s=this.grad4,n=this.simplex,a=this.perm,d=(Math.sqrt(5)-1)/4,p=(5-Math.sqrt(5))/20;let u,x,y,m,w;const b=(e+t+i+o)*d,S=Math.floor(e+b),c=Math.floor(t+b),M=Math.floor(i+b),r=Math.floor(o+b),f=(S+c+M+r)*p,v=S-f,T=c-f,h=M-f,g=r-f,C=e-v,P=t-T,_=i-h,E=o-g,R=C>P?32:0,N=C>_?16:0,L=P>_?8:0,I=C>E?4:0,$=P>E?2:0,F=_>E?1:0,D=R+N+L+I+$+F,U=n[D][0]>=3?1:0,O=n[D][1]>=3?1:0,H=n[D][2]>=3?1:0,me=n[D][3]>=3?1:0,ge=n[D][0]>=2?1:0,ve=n[D][1]>=2?1:0,we=n[D][2]>=2?1:0,G=n[D][3]>=2?1:0,V=n[D][0]>=1?1:0,W=n[D][1]>=1?1:0,q=n[D][2]>=1?1:0,rt=n[D][3]>=1?1:0,je=C-U+p,Ue=P-O+p,Oe=_-H+p,$e=E-me+p,Be=C-ge+2*p,Ge=P-ve+2*p,Ve=_-we+2*p,We=E-G+2*p,qe=C-V+3*p,Ze=P-W+3*p,Xe=_-q+3*p,Ke=E-rt+3*p,He=C-1+4*p,Qe=P-1+4*p,Ye=_-1+4*p,Je=E-1+4*p,ae=S&255,oe=c&255,ne=M&255,re=r&255,Rt=a[ae+a[oe+a[ne+a[re]]]]%32,Dt=a[ae+U+a[oe+O+a[ne+H+a[re+me]]]]%32,zt=a[ae+ge+a[oe+ve+a[ne+we+a[re+G]]]]%32,At=a[ae+V+a[oe+W+a[ne+q+a[re+rt]]]]%32,Nt=a[ae+1+a[oe+1+a[ne+1+a[re+1]]]]%32;let le=.6-C*C-P*P-_*_-E*E;le<0?u=0:(le*=le,u=le*le*this._dot4(s[Rt],C,P,_,E));let ce=.6-je*je-Ue*Ue-Oe*Oe-$e*$e;ce<0?x=0:(ce*=ce,x=ce*ce*this._dot4(s[Dt],je,Ue,Oe,$e));let he=.6-Be*Be-Ge*Ge-Ve*Ve-We*We;he<0?y=0:(he*=he,y=he*he*this._dot4(s[zt],Be,Ge,Ve,We));let fe=.6-qe*qe-Ze*Ze-Xe*Xe-Ke*Ke;fe<0?m=0:(fe*=fe,m=fe*fe*this._dot4(s[At],qe,Ze,Xe,Ke));let de=.6-He*He-Qe*Qe-Ye*Ye-Je*Je;return de<0?w=0:(de*=de,w=de*de*this._dot4(s[Nt],He,Qe,Ye,Je)),27*(u+x+y+m+w)}_dot(e,t,i){return e[0]*t+e[1]*i}_dot3(e,t,i,o){return e[0]*t+e[1]*i+e[2]*o}_dot4(e,t,i,o,s){return e[0]*t+e[1]*i+e[2]*o+e[3]*s}}const be={defines:{PERSPECTIVE_CAMERA:1,KERNEL_SIZE:32},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},kernel:{value:null},cameraNear:{value:null},cameraFar:{value:null},resolution:{value:new A},cameraProjectionMatrix:{value:new tt},cameraInverseProjectionMatrix:{value:new tt},kernelRadius:{value:8},minDistance:{value:.005},maxDistance:{value:.05}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;

		uniform vec3 kernel[ KERNEL_SIZE ];

		uniform vec2 resolution;

		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraInverseProjectionMatrix;

		uniform float kernelRadius;
		uniform float minDistance; // avoid artifacts caused by neighbour fragments with minimal depth difference
		uniform float maxDistance; // avoid the influence of fragments which are too far away

		varying vec2 vUv;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {

			return texture2D( tDepth, screenPosition ).x;

		}

		float getLinearDepth( const in vec2 screenPosition ) {

			#if PERSPECTIVE_CAMERA == 1

				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

			#else

				return texture2D( tDepth, screenPosition ).x;

			#endif

		}

		float getViewZ( const in float depth ) {

			#if PERSPECTIVE_CAMERA == 1

				return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );

			#else

				return orthographicDepthToViewZ( depth, cameraNear, cameraFar );

			#endif

		}

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {

			float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];

			vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );

			clipPosition *= clipW; // unprojection.

			return ( cameraInverseProjectionMatrix * clipPosition ).xyz;

		}

		vec3 getViewNormal( const in vec2 screenPosition ) {

			return unpackRGBToNormal( texture2D( tNormal, screenPosition ).xyz );

		}

		void main() {

			float depth = getDepth( vUv );

			if ( depth == 1.0 ) {

				gl_FragColor = vec4( 1.0 ); // don't influence background

			} else {

				float viewZ = getViewZ( depth );

				vec3 viewPosition = getViewPosition( vUv, depth, viewZ );
				vec3 viewNormal = getViewNormal( vUv );

				vec2 noiseScale = vec2( resolution.x / 4.0, resolution.y / 4.0 );
				vec3 random = vec3( texture2D( tNoise, vUv * noiseScale ).r );

				// compute matrix used to reorient a kernel vector

				vec3 tangent = normalize( random - viewNormal * dot( random, viewNormal ) );
				vec3 bitangent = cross( viewNormal, tangent );
				mat3 kernelMatrix = mat3( tangent, bitangent, viewNormal );

				float occlusion = 0.0;

				for ( int i = 0; i < KERNEL_SIZE; i ++ ) {

					vec3 sampleVector = kernelMatrix * kernel[ i ]; // reorient sample vector in view space
					vec3 samplePoint = viewPosition + ( sampleVector * kernelRadius ); // calculate sample point

					vec4 samplePointNDC = cameraProjectionMatrix * vec4( samplePoint, 1.0 ); // project point and calculate NDC
					samplePointNDC /= samplePointNDC.w;

					vec2 samplePointUv = samplePointNDC.xy * 0.5 + 0.5; // compute uv coordinates

					float realDepth = getLinearDepth( samplePointUv ); // get linear depth from depth texture
					float sampleDepth = viewZToOrthographicDepth( samplePoint.z, cameraNear, cameraFar ); // compute linear depth of the sample view Z value
					float delta = sampleDepth - realDepth;

					if ( delta > minDistance && delta < maxDistance ) { // if fragment is before sample point, increase occlusion

						occlusion += 1.0;

					}

				}

				occlusion = clamp( occlusion / float( KERNEL_SIZE ), 0.0, 1.0 );

				gl_FragColor = vec4( vec3( 1.0 - occlusion ), 1.0 );

			}

		}`},ye={defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`uniform sampler2D tDepth;

		uniform float cameraNear;
		uniform float cameraFar;

		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {

			#if PERSPECTIVE_CAMERA == 1

				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

			#else

				return texture2D( tDepth, screenPosition ).x;

			#endif

		}

		void main() {

			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},Se={uniforms:{tDiffuse:{value:null},resolution:{value:new A}},vertexShader:`varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`uniform sampler2D tDiffuse;

		uniform vec2 resolution;

		varying vec2 vUv;

		void main() {

			vec2 texelSize = ( 1.0 / resolution );
			float result = 0.0;

			for ( int i = - 2; i <= 2; i ++ ) {

				for ( int j = - 2; j <= 2; j ++ ) {

					vec2 offset = ( vec2( float( i ), float( j ) ) ) * texelSize;
					result += texture2D( tDiffuse, vUv + offset ).r;

				}

			}

			gl_FragColor = vec4( vec3( result / ( 5.0 * 5.0 ) ), 1.0 );

		}`};class X extends ie{constructor(e,t,i=512,o=512,s=32){super(),this.width=i,this.height=o,this.clear=!0,this.needsSwap=!1,this.camera=t,this.scene=e,this.kernelRadius=8,this.kernel=[],this.noiseTexture=null,this.output=0,this.minDistance=.005,this.maxDistance=.1,this._visibilityCache=[],this._generateSampleKernel(s),this._generateRandomKernelRotations();const n=new Wt;n.format=qt,n.type=Zt,this.normalRenderTarget=new it(this.width,this.height,{minFilter:ct,magFilter:ct,type:at,depthTexture:n}),this.ssaoRenderTarget=new it(this.width,this.height,{type:at}),this.blurRenderTarget=this.ssaoRenderTarget.clone(),this.ssaoMaterial=new Y({defines:Object.assign({},be.defines),uniforms:J.clone(be.uniforms),vertexShader:be.vertexShader,fragmentShader:be.fragmentShader,blending:Q}),this.ssaoMaterial.defines.KERNEL_SIZE=s,this.ssaoMaterial.uniforms.tNormal.value=this.normalRenderTarget.texture,this.ssaoMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture,this.ssaoMaterial.uniforms.tNoise.value=this.noiseTexture,this.ssaoMaterial.uniforms.kernel.value=this.kernel,this.ssaoMaterial.uniforms.cameraNear.value=this.camera.near,this.ssaoMaterial.uniforms.cameraFar.value=this.camera.far,this.ssaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse),this.normalMaterial=new Xt,this.normalMaterial.blending=Q,this.blurMaterial=new Y({defines:Object.assign({},Se.defines),uniforms:J.clone(Se.uniforms),vertexShader:Se.vertexShader,fragmentShader:Se.fragmentShader}),this.blurMaterial.uniforms.tDiffuse.value=this.ssaoRenderTarget.texture,this.blurMaterial.uniforms.resolution.value.set(this.width,this.height),this.depthRenderMaterial=new Y({defines:Object.assign({},ye.defines),uniforms:J.clone(ye.uniforms),vertexShader:ye.vertexShader,fragmentShader:ye.fragmentShader,blending:Q}),this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture,this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new Y({uniforms:J.clone(Ce.uniforms),vertexShader:Ce.vertexShader,fragmentShader:Ce.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:Ht,blendDst:ft,blendEquation:ht,blendSrcAlpha:Kt,blendDstAlpha:ft,blendEquationAlpha:ht}),this._fsQuad=new nt(null),this._originalClearColor=new Pt}dispose(){this.normalRenderTarget.dispose(),this.ssaoRenderTarget.dispose(),this.blurRenderTarget.dispose(),this.normalMaterial.dispose(),this.blurMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}render(e,t,i){switch(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility(),this.ssaoMaterial.uniforms.kernelRadius.value=this.kernelRadius,this.ssaoMaterial.uniforms.minDistance.value=this.minDistance,this.ssaoMaterial.uniforms.maxDistance.value=this.maxDistance,this._renderPass(e,this.ssaoMaterial,this.ssaoRenderTarget),this._renderPass(e,this.blurMaterial,this.blurRenderTarget),this.output){case X.OUTPUT.SSAO:this.copyMaterial.uniforms.tDiffuse.value=this.ssaoRenderTarget.texture,this.copyMaterial.blending=Q,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:i);break;case X.OUTPUT.Blur:this.copyMaterial.uniforms.tDiffuse.value=this.blurRenderTarget.texture,this.copyMaterial.blending=Q,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:i);break;case X.OUTPUT.Depth:this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:i);break;case X.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=Q,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:i);break;case X.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=this.blurRenderTarget.texture,this.copyMaterial.blending=Qt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:i);break;default:console.warn("THREE.SSAOPass: Unknown output type.")}}setSize(e,t){this.width=e,this.height=t,this.ssaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.blurRenderTarget.setSize(e,t),this.ssaoMaterial.uniforms.resolution.value.set(e,t),this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse),this.blurMaterial.uniforms.resolution.value.set(e,t)}_renderPass(e,t,i,o,s){e.getClearColor(this._originalClearColor);const n=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(i),e.autoClear=!1,o!=null&&(e.setClearColor(o),e.setClearAlpha(s||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(n)}_renderOverride(e,t,i,o,s){e.getClearColor(this._originalClearColor);const n=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(i),e.autoClear=!1,o=t.clearColor||o,s=t.clearAlpha||s,o!=null&&(e.setClearColor(o),e.setClearAlpha(s||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(n)}_generateSampleKernel(e){const t=this.kernel;for(let i=0;i<e;i++){const o=new z;o.x=Math.random()*2-1,o.y=Math.random()*2-1,o.z=Math.random(),o.normalize();let s=i/e;s=Tt.lerp(.1,1,s*s),o.multiplyScalar(s),t.push(o)}}_generateRandomKernelRotations(){const i=new Fs,o=16,s=new Float32Array(o);for(let n=0;n<o;n++){const a=Math.random()*2-1,d=Math.random()*2-1,p=0;s[n]=i.noise3d(a,d,p)}this.noiseTexture=new Yt(s,4,4,Jt,es),this.noiseTexture.wrapS=ke,this.noiseTexture.wrapT=ke,this.noiseTexture.needsUpdate=!0}_overrideVisibility(){const e=this.scene,t=this._visibilityCache;e.traverse(function(i){(i.isPoints||i.isLine||i.isLine2)&&i.visible&&(i.visible=!1,t.push(i))})}_restoreVisibility(){const e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}}X.OUTPUT={Default:0,SSAO:1,Blur:2,Depth:3,Normal:4};const Pe={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class js extends ie{constructor(){super(),this.uniforms=J.clone(Pe.uniforms),this.material=new ts({name:Pe.name,uniforms:this.uniforms,vertexShader:Pe.vertexShader,fragmentShader:Pe.fragmentShader}),this._fsQuad=new nt(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},ss.getTransfer(this._outputColorSpace)===is&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===as?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===os?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===ns?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Ct?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===rs?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===ls?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===cs&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}function Us(l,e,t,i){const o=new Ls(l),s=new Is(e,t),n=new X(e,t,innerWidth,innerHeight,16);n.kernelRadius=2.8,n.minDistance=12e-6,n.maxDistance=6e-4,n.ssaoMaterial.fragmentShader=n.ssaoMaterial.fragmentShader.replace("1.0 - occlusion","1.0 - occlusion * 0.65");const a=n.render.bind(n);n.render=(...u)=>{const x=[...i];e.traverse(m=>{m.userData.skipAO&&x.push(m)});const y=x.map(m=>m.visible);x.forEach(m=>m.visible=!1);try{a(...u)}finally{x.forEach((m,w)=>m.visible=y[w])}},o.addPass(s),o.addPass(n),o.addPass(new js),l.info.autoReset=!1;function d(){o.setPixelRatio(l.getPixelRatio()),o.setSize(innerWidth,innerHeight)}function p(u){n.enabled=u==="high",l.info.reset(),o.render()}return d(),{render:p,resize:d,composer:o,ao:n}}class Os{constructor(e,t,i,o,s){this.camera=e,this.canvas=t,this.buildings=i,this.landscape=o,this.onMessage=s,this.mode="orbit",this.yaw=0,this.pitch=0,this.keys=new Set,this.drag=!1,this.height=1.68,this.orbit=new hs(e,t),this.orbit.enableDamping=!0,this.orbit.dampingFactor=.07,this.orbit.maxPolarAngle=Math.PI/2-.015,this.orbit.minDistance=10,this.orbit.maxDistance=2100,this.orbit.target.set(0,0,0),this.grid=new Map;const n=[...i.colliders,...o.colliders];for(const a of n){const d=a.points||[a.a,a.b],p=(a.radius||0)+1,u=d.map(y=>y[0]),x=d.map(y=>y[1]);for(let y=Math.floor((Math.min(...u)-p)/30);y<=Math.floor((Math.max(...u)+p)/30);y++)for(let m=Math.floor((Math.min(...x)-p)/30);m<=Math.floor((Math.max(...x)+p)/30);m++){const w=`${y},${m}`;this.grid.has(w)||this.grid.set(w,[]),this.grid.get(w).push(a)}}window.addEventListener("keydown",a=>{/INPUT|SELECT|TEXTAREA/.test(a.target.tagName)||document.querySelector("dialog[open]")||(this.keys.add(a.code),this.mode==="walk"&&["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(a.code)&&a.preventDefault())}),window.addEventListener("keyup",a=>this.keys.delete(a.code)),window.addEventListener("blur",()=>{this.keys.clear(),this.drag=!1}),t.addEventListener("pointerdown",a=>{this.mode==="walk"&&a.button===0&&(this.drag=!0)}),window.addEventListener("pointerup",()=>this.drag=!1),document.addEventListener("mousemove",a=>{this.mode==="walk"&&(this.drag||document.pointerLockElement===t)&&(this.yaw-=a.movementX*.0025,this.pitch=Tt.clamp(this.pitch-a.movementY*.0025,-1.25,1.25),this.look())}),t.addEventListener("dblclick",()=>{this.mode==="walk"&&t.requestPointerLock?.()}),document.addEventListener("pointerlockerror",()=>s("鼠标锁定不可用，可按住左键观察。"))}ground(e,t){return ks(e,t,this.buildings.platforms,this.landscape.ramps,this.landscape.bridges)}canStand(e,t,i=this.ground(e,t),o=!0){if(Math.abs(e)>370||t<-477||t>556||t>480&&Math.abs(e)>92)return!1;const s=this.ground(e,t);if(o&&Math.abs(s-i)>.36)return!1;for(const a of this.grid.get(`${Math.floor(e/30)},${Math.floor(t/30)}`)||[])if(!(a.height<=s+.1))if(a.a){if(et(e,t,a.a,a.b)<(a.radius||0)+.36)return!1}else{if(ee(e,t,a.points)&&!a.holes.some(d=>ee(e,t,d)))return!1;for(let d=1;d<a.points.length;d++)if(et(e,t,a.points[d-1],a.points[d])<.36)return!1}if(!this.landscape.bridges.some(a=>Math.abs(e-a.x)<a.w/2-.3&&Math.abs(t-a.z)<a.d/2+.2)){for(const a of this.landscape.waterAreas)if(a.rect){const[d,p,u,x]=a.rect;if(e>d&&e<p&&t>u&&t<x)return!1}else if(a.points?ee(e,t,a.points):et(e,t,a.a,a.b)<a.radius+.35)return!1}return!0}safePoint(e,t){for(let i=0;i<100;i+=2)for(let o=0;o<Math.PI*2;o+=Math.PI/8){const s=e+Math.sin(o)*i,n=t+Math.cos(o)*i;if(this.canStand(s,n,0,!1))return[s,n]}return[-3,180]}setMode(e){if(this.mode!==e)if(document.exitPointerLock?.(),this.mode=e,this.orbit.enabled=e==="orbit",this.keys.clear(),e==="walk"){const t=this.safePoint(this.orbit.target.x,this.orbit.target.z+70);this.camera.position.set(t[0],this.ground(...t)+this.height,t[1]),this.yaw=0,this.pitch=0,this.look(),this.onMessage("WASD 移动 · 按住左键观察 · 双击锁定鼠标 · Esc 释放")}else{const t=this.camera.position.clone();this.orbit.target.set(t.x,0,t.z-40),this.camera.position.set(t.x+85,110,t.z+120),this.orbit.update()}}look(){this.camera.rotation.order="YXZ",this.camera.rotation.set(this.pitch,this.yaw,0)}locate(e){if(this.mode==="walk"){const t=this.safePoint(e.x,e.z+(e.d||25)/2+22);this.camera.position.set(t[0],this.ground(...t)+this.height,t[1]),this.yaw=0,this.pitch=.08,this.look()}else this.orbit.target.set(e.x,e.base+6,e.z),this.camera.position.set(e.x+75,95,e.z+120),this.orbit.update()}home(){this.mode==="walk"&&this.setMode("orbit"),this.orbit.target.set(0,0,0),this.camera.position.set(690,920,1070),this.orbit.update()}update(e){if(this.mode==="orbit"){this.orbit.update();return}const t=(this.keys.has("KeyW")||this.keys.has("ArrowUp")?1:0)-(this.keys.has("KeyS")||this.keys.has("ArrowDown")?1:0),i=(this.keys.has("KeyD")?1:0)-(this.keys.has("KeyA")?1:0);this.keys.has("ArrowLeft")&&(this.yaw+=e),this.keys.has("ArrowRight")&&(this.yaw-=e);const o=Math.hypot(t,i)||1,s=(this.keys.has("ShiftLeft")?3.8:1.5)*e,n=(-Math.sin(this.yaw)*t+Math.cos(this.yaw)*i)/o*s,a=(-Math.cos(this.yaw)*t-Math.sin(this.yaw)*i)/o*s,d=this.camera.position;this.ground(d.x,d.z);const p=Math.max(1,Math.ceil(Math.hypot(n,a)/.12));for(let u=0;u<p;u++)this.canStand(d.x+n/p,d.z,this.ground(d.x,d.z))&&(d.x+=n/p),this.canStand(d.x,d.z+a/p,this.ground(d.x,d.z))&&(d.z+=a/p);d.y=this.ground(d.x,d.z)+this.height,this.look()}}const $s="modulepreload",Bs=function(l,e){return new URL(l,e).href},mt={},Gs=function(e,t,i){let o=Promise.resolve();if(t&&t.length>0){let p=function(u){return Promise.all(u.map(x=>Promise.resolve(x).then(y=>({status:"fulfilled",value:y}),y=>({status:"rejected",reason:y}))))};const n=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),d=a?.nonce||a?.getAttribute("nonce");o=p(t.map(u=>{if(u=Bs(u,i),u in mt)return;mt[u]=!0;const x=u.endsWith(".css"),y=x?'[rel="stylesheet"]':"";if(i)for(let w=n.length-1;w>=0;w--){const b=n[w];if(b.href===u&&(!x||b.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${y}`))return;const m=document.createElement("link");if(m.rel=x?"stylesheet":$s,x||(m.as="script"),m.crossOrigin="",m.href=u,d&&m.setAttribute("nonce",d),document.head.appendChild(m),x)return new Promise((w,b)=>{m.addEventListener("load",w),m.addEventListener("error",()=>b(new Error(`Unable to preload CSS for ${u}`)))})}))}function s(n){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=n,window.dispatchEvent(a),!a.defaultPrevented)throw n}return o.then(n=>{for(const a of n||[])a.status==="rejected"&&s(a.reason);return e().catch(s)})},_e={low:{dpr:1,details:80,shadows:!1},medium:{dpr:1.5,details:210,shadows:!0},high:{dpr:2,details:300,shadows:!0}};class Vs{constructor(e,t,i){this.scene=e,this.models=t.filter(o=>o.w&&o.d&&(!o.special||o.detailParts)),this.materials=i,this.cache=new Map,this.module=null,this.pending=!1}async update(e,t,i){const o=_e[t].details;let s,n=1/0;for(const a of this.models){const d=Math.hypot(e.position.x-a.x,e.position.z-a.z,e.position.y-(a.base||0)),p=this.cache.get(a.id);p?(p.visible=d<o&&!i,p.traverse(u=>{u.userData.lodRadius&&(u.visible=d<u.userData.lodRadius)}),p.userData.lastUsed=p.visible?performance.now():p.userData.lastUsed):d<o&&!i&&d<n&&(s=a,n=d)}if(s&&!this.pending){this.pending=!0;try{this.module??=await Gs(()=>import("./details-C-88klnk.js"),__vite__mapDeps([0,1]),import.meta.url);const a=new Le;for(const d of s.detailParts||[s])a.add(this.module.makeDetails(d,this.materials));a.traverse(d=>{d.userData.lodRadius&&(d.visible=n<d.userData.lodRadius)}),a.userData.lastUsed=performance.now(),this.scene.add(a),this.cache.set(s.id,a)}finally{this.pending=!1}}if(this.cache.size>18){const a=[...this.cache].filter(([,d])=>!d.visible).sort((d,p)=>d[1].userData.lastUsed-p[1].userData.lastUsed)[0];a&&(a[1].traverse(d=>{d.geometry?.dispose(),d.userData.ownsMaterial&&(d.material.map?.dispose(),d.material.dispose())}),this.scene.remove(a[1]),this.cache.delete(a[0]))}}}const k=l=>document.getElementById(l);function Z(l){k("toast").textContent=l,k("toast").classList.add("show"),clearTimeout(Z.timer),Z.timer=setTimeout(()=>k("toast").classList.remove("show"),3500)}class Ws{constructor(e,t,i,o,s){this.data=e,this.building=t,this.nav=i,this.camera=o,this.renderer=s,this.labels=!0,this.labelNodes=[],this.selected=null;const n=["wumen","taihemen","taihe","zhonghe","baohe","qianqing","kunning","qinan","shenwu","wenhua","wuying","huangji","yangxin","jingren","jingyang","chuxiu","xianfu"];for(const u of n){const x=t.models.find(m=>m.id===u);if(!x)continue;const y=document.createElement("button");y.dataset.landmark=u,y.innerHTML=`${x.name}<small>↗</small>`,y.addEventListener("click",()=>{i.locate(x),this.showInfo(x)}),k("landmarks").append(y)}for(const u of t.models){const x=document.createElement("button");x.className="label",x.textContent=u.name,x.addEventListener("click",()=>this.showInfo(u)),k("viewport").append(x),this.labelNodes.push({b:u,el:x})}const a=new fs,d=new A;let p;s.domElement.addEventListener("pointerdown",u=>p=[u.clientX,u.clientY]),s.domElement.addEventListener("pointerup",u=>{if(!p||Math.hypot(u.clientX-p[0],u.clientY-p[1])>5)return;const x=s.domElement.getBoundingClientRect();d.set((u.clientX-x.left)/x.width*2-1,-(u.clientY-x.top)/x.height*2+1),a.setFromCamera(d,o);for(const m of t.picks)m.updateMatrixWorld();const y=a.intersectObjects(t.picks)[0];y&&this.showInfo(y.object.userData.model)}),k("labels").onclick=()=>{this.labels=!this.labels,k("labels").setAttribute("aria-pressed",this.labels)},k("orbit").onclick=()=>this.mode("orbit"),k("walk").onclick=()=>this.mode("walk"),k("home").onclick=()=>{i.home(),this.mode("orbit")},k("about").onclick=()=>k("sources").showModal(),k("close-sources").onclick=()=>k("sources").close(),k("sources").addEventListener("click",u=>{u.target===k("sources")&&k("sources").close()})}mode(e){this.nav.setMode(e),k("orbit").classList.toggle("active",e==="orbit"),k("walk").classList.toggle("active",e==="walk"),k("crosshair").classList.toggle("hidden",e!=="walk"),k("hint").textContent=e==="walk"?"WASD / ↑↓ 移动 · 拖动观察 · 双击锁定 · Shift 快走 · Esc 释放":"拖动旋转 · 滚轮缩放 · 右键平移"}showInfo(e){this.selected=e,k("info").classList.remove("hidden"),k("info").innerHTML=`<button class="close" aria-label="关闭">×</button><p class="eyebrow">建筑资料 / ${e.id}</p><h2>${e.name}</h2><span class="badge">${e.status||"地图估算"}</span><p>${e.description||"尚未完成形制核对。"}</p><p class="fine">模型主体：${(e.w||0).toFixed(2)} × ${(e.d||0).toFixed(2)} 米<br>主体高度 ${(e.h||0).toFixed(2)} 米 · 台基 ${(e.base||0).toFixed(2)} 米<br>位置：x ${e.x.toFixed(2)} / z ${e.z.toFixed(2)}（地图估算）<br>室内未开放</p><a href="${e.sourceURL||`https://www.dpm.org.cn/explore/building/${e.sourceId}.html`}" target="_blank" rel="noopener">故宫博物院建筑资料 ↗</a><p class="fine"><a href="${e.footprintSource||e.source||"https://www.dpm.org.cn/Explore.html"}" target="_blank" rel="noopener">位置轮廓资料 ↗</a></p>`,k("info").querySelector("button").onclick=()=>k("info").classList.add("hidden")}update(){const e=innerWidth,t=innerHeight;for(const{b:i,el:o}of this.labelNodes){const s=new z(i.x,(i.base||0)+(i.h||20)+4,i.z).project(this.camera),n=this.camera.position.distanceTo(new z(i.x,0,i.z)),a=this.labels&&s.z<1&&s.z>-1&&Math.abs(s.x)<.94&&Math.abs(s.y)<.94&&(this.nav.mode==="orbit"||n<170);o.style.display=a?"block":"none",a&&(o.style.left=`${(s.x*.5+.5)*e}px`,o.style.top=`${(-s.y*.5+.5)*t}px`)}this.map()}map(){const e=k("map"),t=e.getContext("2d"),i=.255,o=120,s=150,n=([b,S])=>[o+b*i,s+S*i];t.clearRect(0,0,240,300),t.fillStyle="#e9ebdf",t.fillRect(0,0,240,300),t.strokeStyle="#bcc6b5",t.lineWidth=1,t.strokeRect(o-376.5*i,s-480.5*i,753*i,961*i),t.fillStyle="#b4b39d";for(const b of this.data.buildings)t.beginPath(),b.points.forEach((S,c)=>{const[M,r]=n(S);c?t.lineTo(M,r):t.moveTo(M,r)}),t.fill("evenodd");t.strokeStyle="#7a9d99",t.lineWidth=1.5;for(const b of this.data.water)b.name!=="筒子河"&&(t.beginPath(),b.points.forEach((S,c)=>{const[M,r]=n(S);c?t.lineTo(M,r):t.moveTo(M,r)}),t.stroke());t.setLineDash([3,3]),t.strokeStyle="#8f8574";const[a,d]=n([130,-233]);t.strokeRect(a-6,d-8,12,16),t.setLineDash([]);const p=this.camera.position,u=this.nav.mode==="walk"?[p.x,p.z]:[this.nav.orbit.target.x,this.nav.orbit.target.z],x=this.camera.getWorldDirection(new z),y=Math.atan2(x.x,-x.z),[m,w]=n(u);t.save(),t.translate(m,w),t.rotate(y),t.fillStyle="#a4563a",t.beginPath(),t.moveTo(0,-9),t.lineTo(-5,5),t.lineTo(0,2),t.lineTo(5,5),t.closePath(),t.fill(),t.restore(),t.fillStyle="#a4563a",t.beginPath(),t.arc(m,w,2,0,Math.PI*2),t.fill(),k("coords").textContent=`${this.nav.mode==="walk"?"步行位置":"鸟瞰焦点"} x ${u[0].toFixed(1)} / z ${u[1].toFixed(1)} m`}}async function qs(){let l;try{l=new ds({antialias:!0,powerPreference:"high-performance"})}catch{throw new Error("WebGL 2 不可用。请启用硬件加速或使用支持 WebGL 2 的浏览器。")}l.domElement.className="scene",k("viewport").prepend(l.domElement),l.setSize(innerWidth,innerHeight),l.setPixelRatio(Math.min(devicePixelRatio,1.5)),l.outputColorSpace=De,l.toneMapping=Ct,l.toneMappingExposure=.86,l.shadowMap.enabled=!0,l.shadowMap.type=us,l.domElement.addEventListener("webglcontextlost",P=>{P.preventDefault(),Z("图形上下文丢失。请降低画质后刷新。"),k("boot-error").textContent="图形上下文丢失，请刷新页面重建场景。",k("boot-error").classList.remove("hidden")});const e=async P=>{const _=await fetch(P);if(!_.ok)throw new Error(`资源加载失败 ${P} (${_.status})`);return _.json()},[t,i,o]=await Promise.all(["data/layout.json","data/landmarks.json","data/sources.json"].map(e));k("progress").value=12;const s=new St,n=new ps(48,innerWidth/innerHeight,.15,14e3),a=gs(),d=Es(s,l);k("loading-title").textContent="建立城墙、水系与院落";const p=Cs(s,t,a);k("progress").value=25,k("loading-title").textContent="生成全域建筑与地标";const u=await Ss(s,t,i,a,P=>k("progress").value=25+P*65),x=_s(s,u.platforms,a);p.ramps.push(...x.ramps),u.groups.push(x.group);for(const P of u.picks)s.add(P);const y=Us(l,s,n,[d.sky,...u.picks]),m=new Os(n,l.domElement,u,p,Z);m.home();const w=new Ws(t,u,m,n,l),b=new Vs(s,u.models,a);let S="medium",c=!1;const M=new Map;s.traverse(P=>{P.isMesh&&P!==d.sky&&!u.picks.includes(P)&&M.set(P,P.material)}),k("gray").onclick=()=>{c=!c,k("gray").setAttribute("aria-pressed",c);for(const[P,_]of M)P.material=c?a.gray:_;if(c)for(const P of b.cache.values())P.visible=!1},k("quality").onchange=()=>{S=k("quality").value,l.setPixelRatio(Math.min(devicePixelRatio,_e[S].dpr)),l.shadowMap.enabled=_e[S].shadows,y.resize(),Z(`${{low:"低",medium:"中",high:"高"}[S]}画质：细部距离 ${_e[S].details} 米`)},k("source-content").innerHTML=`<p>${i.baseline}</p><p><strong>单位：1 世界单位 = 1 米。</strong>原点为城墙矩形中心，x 沿南墙向东，z 沿西墙向南。格网北与真北约差 2.04°。地图轮廓按官方 753 × 961 米仿射标定；这不构成测绘精度证明。</p><h3>本次还原程度</h3><ul><li>尺寸核对：城池边界、城墙高度、护城河宽度、太和殿主体与台基高度；角楼中央方亭尺寸。</li><li>形制参考：中轴线殿宇、午门、三座其他城门、角楼、文华殿与武英殿。檐曲线、斗栱、格扇、脊饰为参数化近似。</li><li>示意：其余地图建筑轮廓、院墙、道路、树木。未知屋顶使用明确标注的简化模型，没有逐栋核对。</li><li>未还原：所有室内、延禧宫灵沼轩主体、复杂假山、精确彩画/兽饰、部分复合屋顶、临时施工与当日开放区域。</li></ul><p>共 ${t.buildings.length} 条地图建筑/城台/院墙轮廓，不能解读为 ${t.buildings.length} 座已准确复原的建筑。步行范围为研究模型的室外空间，不等同现实参观许可。</p><h3>资料表</h3><table><thead><tr><th>来源</th><th>支持内容 / 可靠度</th></tr></thead><tbody>${o.sources.map(P=>`<tr><td><a target="_blank" rel="noopener" href="${P.url}">${P.title}</a></td><td>${P.support}<br><small>${P.reliability} · ${P.license}</small></td></tr>`).join("")}</tbody></table><h3>冲突和限制</h3><ul>${o.conflicts.map(P=>`<li>${P}</li>`).join("")}</ul><p>完整资料、尺寸偏差、参考照片链接和测试报告位于项目 docs/ 与 evidence/。未经许可的官方照片只用于参考核对，运行场景不加载第三方影像。</p>`,k("capture").onclick=()=>{y.render(S),l.domElement.toBlob(P=>{if(!P){Z("视角保存失败，请刷新重试。");return}const _=URL.createObjectURL(P),E=document.createElement("a");E.href=_,E.download=`forbidden-city-${w.selected?.id||"view"}.png`,E.click(),setTimeout(()=>URL.revokeObjectURL(_),1e4),Z("已保存当前三维视角。")},"image/png")};let r=performance.now(),f=0,v=0,T=0,h=0;const g={frames:0,samples:[],calls:0,triangles:0};function C(P){requestAnimationFrame(C);const _=Math.max(0,(P-r)/1e3),E=Math.min(.05,_);if(r=P,m.update(E),d.update(n,S,m.mode==="walk",m.orbit.target),P-h>180&&(b.update(n,S,c).catch(R=>Z(`细部加载失败：${R.message}`)),h=P),y.render(S),f++,v+=_,g.frames++,g.calls=l.info.render.calls,g.triangles=l.info.render.triangles,P-T>120&&(w.update(),T=P),v>1){const R=f/v;g.samples.push({time:P,fps:R,calls:g.calls,triangles:g.triangles}),g.samples.length>180&&g.samples.shift(),k("stats").textContent=`${R.toFixed(0)} fps · ${g.calls} draws · ${(g.triangles/1e3).toFixed(0)}k 三角形`,f=v=0}}window.addEventListener("resize",()=>{n.aspect=innerWidth/innerHeight,n.updateProjectionMatrix(),l.setSize(innerWidth,innerHeight),y.resize(),w.update()}),window.__palace={scene:s,camera:n,renderer:l,nav:m,ui:w,data:t,building:u,landscape:p,metrics:g,details:b,quality:()=>S,ready:!0},window.__ready=!0,k("progress").value=100,k("loading").classList.add("hidden"),new URLSearchParams(location.search).get("stage")==="2"&&k("gray").click(),C(performance.now())}qs().catch(l=>{k("loading-title").textContent="场景加载失败",k("loading-note").textContent=l.message,k("boot-error").classList.remove("hidden"),k("boot-error").textContent=l.message,console.error(l)});export{pe as B,K as i,Xs as r};
