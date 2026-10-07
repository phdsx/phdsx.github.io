import * as THREE from 'three';
export class Assets {
  constructor(progress,warn){this.progress=progress;this.warn=warn;this.done=0;this.total=8;this.textures=new Map();}
  async fetch(path,type='json'){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try {const r=await fetch(path,{signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r[type]();}
    catch(e){throw Error(`${path}：${e.name==='AbortError'?'请求超时':e.message}`);}finally{clearTimeout(timer);}
  }
  tick(message){this.progress(Math.min(.9,++this.done/this.total*.85),message);}
  async texture(url,color=true,repeat=false,required=false){
    if(this.textures.has(url))return this.textures.get(url);
    const p=new Promise((resolve,reject)=>{
      new THREE.TextureLoader().load(url,t=>{t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=repeat?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;t.anisotropy=4;resolve(t);},undefined,()=>{const e=Error(`纹理加载失败：${url}`);if(required)reject(e);else{this.warn(e.message);resolve(null);}});
    });this.textures.set(url,p);return p;
  }
  async base(low){
    const geo=await this.fetch('./data/geography.json');this.tick('已读取真实海岸线、道路与地物');
    const meta=await this.fetch('./data/terrain.json');this.tick('已读取高程规格');
    const surface=new Float32Array(await this.fetch('./data/'+meta.surfaceUrl,'arrayBuffer'));this.tick('已加载全岛真实高程');
    const land=new Uint8Array(await this.fetch('./data/'+meta.landUrl,'arrayBuffer'));this.tick('正在匹配海陆边界');
    if(surface.length!==meta.nx*meta.nz||land.length!==meta.nx*meta.nz)throw Error('高程数据长度不匹配；请重新运行数据预处理。');
    const field=await this.texture('./data/coastal-field.png',false,false,true);field.generateMipmaps=false;field.minFilter=THREE.LinearFilter;field.needsUpdate=true;this.tick('已加载真实岸线距离场');
    const waterField=await this.texture('./data/water-field.png',false,false,true);waterField.generateMipmaps=false;waterField.minFilter=THREE.LinearFilter;waterField.needsUpdate=true;
    let satellite=await this.texture('./data/'+(low?'satellite-low.webp':'satellite-2016.webp'));this.tick('正在对齐卫星影像');
    const sources=await this.fetch('./data/sources.json');this.tick('已读取资料来源与还原边界');
    const landmarks=await this.fetch('./data/landmarks.json');this.tick('已核对全岛景观清单与近似范围');
    return {geo,meta,surface,land,field,waterField,satellite,sources,landmarks};
  }
}
