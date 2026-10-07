import * as THREE from 'three';
// Deterministic procedural microtextures are original material approximations,
// not scans of the site. All UVs represent metres; no random building generator.
function hash(x,y){let n=Math.imul(x+9317,374761393)^Math.imul(y+814,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function texture(kind){const size=512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const grain=hash(x,y),coarse=hash(x>>4,y>>4),i=(y*size+x)*4;let rgb;
 if(kind==='wall'){const n=(grain-.5)*12+(coarse-.5)*4;rgb=[226+n,225+n,219+n];}
 if(kind==='granite'){const n=(grain-.5)*24+(coarse-.5)*5;rgb=[173+n,173+n,164+n];}
 if(kind==='stone'){const row=Math.floor(y/128),joint=y%128<2||((x+((row%2)*128))%256<2),n=(grain-.5)*24+(coarse-.5)*4;rgb=joint?[98,101,94]:[155+n,157+n,146+n];}
 if(kind==='wood'){const wave=Math.sin(x*.23+Math.sin(y*.016)*2)+Math.sin(x*.61+Math.sin(y*.009)*3),n=wave*5+(grain-.5)*12;rgb=[108+n,81+n*.8,53+n*.6];}
 if(kind==='tile'){const row=Math.floor(y/96),seam=y%96<6||x%48<3,n=Math.sin(x*Math.PI/24)*7+(grain-.5)*16+row;rgb=seam?[43,49,47]:[77+n,84+n,80+n];}
 if(kind==='brick'){const row=Math.floor(y/32),seam=y%32<2||(x+(row%2)*64)%128<2,n=(grain-.5)*18+(hash(x>>7,row)-.5)*16;rgb=seam?[170,173,161]:[101+n,107+n,103+n];}
 for(let j=0;j<3;j++)pixels.data[i+j]=rgb[j];pixels.data[i+3]=255;
 }ctx.putImageData(pixels,0,0);const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;return {map,bump};}
export function createMaterials(){const mats={};const configs={wall:[0xffffff,.91,.025],stone:[0xf5f5f2,.94,.018],wood:[0xfff3df,.84,.012],tile:[0xd9dedc,.98,.018],brick:[0xf4f4f0,.92,.018],granite:[0xffffff,.93,.02]};for(const [kind,[color,roughness,bumpScale]] of Object.entries(configs)){const t=texture(kind);mats[kind]=new THREE.MeshStandardMaterial({color,roughness,map:t.map,bumpMap:t.bump,bumpScale,side:['wall','tile','brick'].includes(kind)?THREE.DoubleSide:THREE.FrontSide});}
 const plain=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
 mats.base=plain(0xd9d8d0);mats.sill=plain(0x898d87);mats.ridge=plain(0x737b75);mats.dark=plain(0x44433e);mats.iron=plain(0x444944,.8);mats.glass=plain(0x779893,.45);mats.aqua=plain(0x549797,.43);mats.rose=plain(0xa57f83,.48);mats.amber=plain(0xc2ac72,.45);mats.moss=plain(0x949a84);mats.bark=plain(0x726a57);mats.leaf=plain(0x566f45,.95);mats.leafLight=plain(0x718b54,.98);mats.lantern=plain(0xa74735,.85);mats.gold=plain(0xb6a36b,.7);mats.data=plain(0x789da0);mats.approx=plain(0xb49372);mats.missing=plain(0xb5b7ad);mats.roadData=plain(0xb7d2cb);
 return mats;}
export function metreUV(geometry,scale=1){if(!geometry.attributes.normal)geometry.computeVertexNormals();const pos=geometry.attributes.position,n=geometry.attributes.normal,uv=[];for(let i=0;i<pos.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));if(ny>nx&&ny>nz)uv.push(pos.getX(i)/scale,pos.getZ(i)/scale);else if(nx>nz)uv.push(pos.getZ(i)/scale,pos.getY(i)/scale);else uv.push(pos.getX(i)/scale,pos.getY(i)/scale);}geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geometry;}
export async function loadPbrMaterials(materials,warn){
 const loader=new THREE.TextureLoader();
 await Promise.all([['wall','plaster',.35],['wood','wood',.35],['bark','bark',.65]].map(async([key,alias,strength])=>{
  try{const [color,normal,roughness]=await Promise.all(['color','normalgl','roughness'].map(kind=>loader.loadAsync('./textures/'+alias+'-'+kind+'.webp')));for(const map of [color,normal,roughness]){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;}color.colorSpace=THREE.SRGBColorSpace;normal.colorSpace=roughness.colorSpace=THREE.NoColorSpace;const material=materials[key];material.map?.dispose();material.bumpMap?.dispose();material.map=color;material.bumpMap=null;material.normalMap=normal;material.normalScale.set(strength,strength);material.roughnessMap=roughness;material.color.set(key==='wood'?0xb6a58c:0xf9f8ef);material.roughness=key==='wood'?.92:1;material.needsUpdate=true;}
  catch(error){warn('PBR 材质 '+alias+' 加载失败；使用明确为估算的程序表面。');}
 }));
}
