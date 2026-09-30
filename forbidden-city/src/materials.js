import * as THREE from 'three';

// All maps are local procedural surfaces, calibrated in metres by geometry UVs.
// Their weathering is a visual estimate, not a scan of a particular wall or tile.
function surface(kind,size=512){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const bump=document.createElement('canvas');bump.width=bump.height=size;
 const rough=document.createElement('canvas');rough.width=rough.height=size;
 const c=canvas.getContext('2d'),b=bump.getContext('2d'),r=rough.getContext('2d');
 const palette={plaster:[137,46,36],wood:[113,35,27],stone:[199,197,186],pave:[126,125,117],brick:[99,100,96],tile:[176,119,35],darkTile:[58,66,58]};
 const rgb=palette[kind],image=c.createImageData(size,size),height=b.createImageData(size,size),roughness=r.createImageData(size,size);let seed=63;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,grain=(random()-.5)*13;
  const cloud=2*Math.sin(x/size*Math.PI*6)*Math.cos(y/size*Math.PI*4)+Math.sin((x+y)/size*Math.PI*14);
  const value=grain+cloud;
  for(let k=0;k<3;k++){image.data[i+k]=Math.max(0,Math.min(255,rgb[k]+value));height.data[i+k]=128+grain*.9+cloud*.2;roughness.data[i+k]=(kind==='tile'?142:kind==='wood'?190:230)+grain;}
  image.data[i+3]=height.data[i+3]=roughness.data[i+3]=255;
 }
 c.putImageData(image,0,0);b.putImageData(height,0,0);r.putImageData(roughness,0,0);
 if(['stone','pave','brick'].includes(kind)){
  const cols=kind==='pave'?4:kind==='brick'?4:3,rows=kind==='pave'?4:kind==='brick'?4:4,cw=size/cols,ch=size/rows;
  for(let row=-1;row<=rows;row++)for(let col=-1;col<=cols;col++){
   const x=col*cw+(row%2&&kind!=='pave'?cw/2:0),y=row*ch,v=Math.floor((random()-.5)*22);
   c.fillStyle=`rgba(${v>0?240:45},${v>0?236:44},${v>0?227:41},${Math.abs(v)/240})`;c.fillRect(x+2,y+2,cw-4,ch-4);
   c.strokeStyle=kind==='stone'?'rgba(86,84,77,.25)':'rgba(45,46,42,.55)';c.lineWidth=kind==='stone'?1.3:2.5;c.strokeRect(x+1,y+1,cw-2,ch-2);
   b.strokeStyle='#545454';b.lineWidth=3;b.strokeRect(x+1,y+1,cw-2,ch-2);
   // Irregular pits and mineral flecks remain sub-centimetre detail.
   for(let j=0;j<18;j++){const px=x+random()*cw,py=y+random()*ch;c.fillStyle='rgba(50,48,43,.08)';c.fillRect(px,py,1+random()*3,1);}
  }
 }
 if(kind==='tile'||kind==='darkTile'){
  const step=size/8;
  for(let x=0;x<size;x+=step){const shade=(random()-.5)*15,g=c.createLinearGradient(x,0,x+step,0);
   const base=kind==='tile'?[174+shade,119+shade,36+shade]:[60+shade,69+shade,60+shade];
   g.addColorStop(0,`rgb(${base.map(v=>Math.max(0,v-28)).join(',')})`);g.addColorStop(.44,`rgb(${base.map(v=>v+23).join(',')})`);g.addColorStop(1,`rgb(${base.map(v=>Math.max(0,v-19)).join(',')})`);c.fillStyle=g;c.fillRect(x,0,step,size);
   const bg=b.createLinearGradient(x,0,x+step,0);bg.addColorStop(0,'#626262');bg.addColorStop(.5,'#c9c9c9');bg.addColorStop(1,'#6b6b6b');b.fillStyle=bg;b.fillRect(x,0,step,size);
   for(let y=0;y<size;y+=size/5){c.strokeStyle='rgba(71,48,20,.3)';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+step/2,y+4,x+step,y);c.stroke();b.strokeStyle='#747474';b.lineWidth=2;b.beginPath();b.moveTo(x,y);b.lineTo(x+step,y);b.stroke();}
  }
 }
 if(kind==='wood')for(let i=0;i<120;i++){c.strokeStyle='rgba(51,17,14,.07)';c.lineWidth=.5+random();const x=random()*size;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+3,size*.3,x-2,size*.7,x+1,size);c.stroke();}
 const map=new THREE.CanvasTexture(canvas),bumpMap=new THREE.CanvasTexture(bump),roughnessMap=new THREE.CanvasTexture(rough);
 for(const t of [map,bumpMap,roughnessMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}
 map.colorSpace=THREE.SRGBColorSpace;return{map,bumpMap,roughnessMap};
}
export function materials(){
 const tex=Object.fromEntries(['plaster','wood','stone','pave','brick','tile','darkTile'].map(k=>[k,surface(k,k==='pave'?1024:512)]));
 const standard=(color,roughness=.85,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 const glazed=(maps)=>new THREE.MeshPhysicalMaterial({color:'#fff7e5',roughness:.52,metalness:0,clearcoat:.28,clearcoatRoughness:.35,...maps,bumpScale:.019,side:THREE.DoubleSide});
 // Restrained, original geometric approximation of painted beams seen in the
 // reference photographs; not a copy or identification of a specific motif.
 const beam=document.createElement('canvas');beam.width=1024;beam.height=256;const bc=beam.getContext('2d');bc.fillStyle='#284a48';bc.fillRect(0,0,1024,256);
 for(const y of [14,34,222,242]){bc.strokeStyle=y===14||y===242?'#73805b':'#9b8861';bc.lineWidth=5;bc.beginPath();bc.moveTo(0,y);bc.lineTo(1024,y);bc.stroke();}
 bc.strokeStyle='#8a805a';bc.lineWidth=4;
 for(let x=0;x<1024;x+=256){bc.beginPath();bc.moveTo(x+12,128);bc.quadraticCurveTo(x+48,51,x+128,60);bc.quadraticCurveTo(x+208,51,x+244,128);bc.quadraticCurveTo(x+208,205,x+128,196);bc.quadraticCurveTo(x+48,205,x+12,128);bc.stroke();bc.beginPath();bc.ellipse(x+128,128,32,41,0,0,Math.PI*2);bc.stroke();bc.fillStyle='#365f63';bc.fillRect(x+112,111,32,34);}
 const beamMap=new THREE.CanvasTexture(beam);beamMap.colorSpace=THREE.SRGBColorSpace;beamMap.wrapS=beamMap.wrapT=THREE.RepeatWrapping;beamMap.anisotropy=8;
 return{
  red:standard('#ffffff',.8,{...tex.wood,bumpScale:.004}),wall:standard('#ffffff',.96,{...tex.plaster,bumpScale:.008}),
  tile:glazed(tex.tile),tileRib:new THREE.MeshPhysicalMaterial({color:'#b58940',roughness:.6,clearcoat:.18,clearcoatRoughness:.45}),darkTile:glazed(tex.darkTile),ridge:standard('#ad7a34',.6),
  gold:standard('#a28a55',.57,{metalness:.65}),stone:standard('#ffffff',.92,{...tex.stone,bumpScale:.018}),
  brick:standard('#ffffff',.95,{...tex.brick,bumpScale:.018}),pave:standard('#ffffff',.96,{...tex.pave,bumpScale:.013}),
  earth:standard('#828571'),water:standard('#4d6961',.39,{metalness:0,transparent:true,opacity:.94}),
  wood:standard('#493529',.78),soffit:standard('#4b3427',.92,{side:THREE.BackSide}),window:standard('#211f1b',.92),blue:standard('#ffffff',.88,{map:beamMap}),paint:standard('#706347',.82),gable:standard('#534a39',.9),
  leaf:standard('#354a2d',.96),leafLight:standard('#4c5b35',.96),trunk:standard('#635545',.98),rock:standard('#87857a',.98),gray:standard('#b6b9ae')
 };
}
