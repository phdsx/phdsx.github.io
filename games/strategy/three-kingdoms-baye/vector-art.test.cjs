const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {reconstruct, scanline, curveScanline, inkAt} = require('./vector-art.js');
const {identify} = require('./menu-art.js');
const library = fs.readFileSync(require.resolve('./assets/dictionary-original.lib'));

function resource(id, frame = 0, paddedWidth) {
  const p = library.readUInt32LE((id-1)*4)+14;
  const w = library.readUInt16LE(p), h = library.readUInt16LE(p+2), count = library.readUInt16LE(p+4);
  const width = paddedWidth || w, stride = Math.ceil(w/8), size = stride*h;
  const rgba = new Uint8ClampedArray(width*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)rgba[(y*width+x)*4+3] = library[p+7+frame*size+y*stride+(x>>3)]&(128>>(x&7)) ? 255 : 0;
  return {rgba, width, height:h, count};
}
function verifyCoverage({rgba,width,height}) {
  const before=rgba.slice(), art=reconstruct(rgba,width,height), actual=new Uint8Array(width*height);
  for(const layer of art.layers){
    const mask = new Uint8Array(width*height);
    for(let ringIndex=0;ringIndex<layer.paths.length;ringIndex++)for(let y=0;y<height;y++){
      const row=layer.curves[ringIndex]?curveScanline(layer.curves[ringIndex],y+.5):scanline(layer.paths[ringIndex],y+.5);
      if(!row)continue;
      const spans=row.split(',').map(Number);
      for(let n=0;n<spans.length;n+=2)for(let x=spans[n];x<spans[n+1];x++)mask[y*width+x]^=1;
    }
    for(let p=0;p<mask.length;p++)if(mask[p]){assert.equal(actual[p],0,'shade layers must not overlap');actual[p]=layer.shade;}
  }
  for(let p=0;p<actual.length;p++)assert.equal(actual[p],inkAt(rgba,p*4),`source coordinate ${p%width},${Math.floor(p/width)}`);
  assert.deepEqual(rgba,before,'artwork reconstruction never writes the source frame');
  return art;
}
test('menu backgrounds and both world maps preserve every source coordinate when vectorized',()=>{
  for(const id of [44,45,47,75]) {
    const art=verifyCoverage(resource(id));
    assert.ok(art.refined>0,`resource ${id} must actually contain redrawn diagonal contours`);
    assert.ok(art.vectorPoints<art.sourcePoints);
    assert.ok(art.curved>0,'high-resolution curves must replace staircase corners');
  }
});
test('all original map tiles, city symbols and unique portraits preserve source coverage',()=>{
  const seen=new Set();let verified=0;
  for(const id of [54,55,69,48,49,50,51]) {
    const first=resource(id);
    for(let frame=0;frame<first.count;frame++) {
      const original=resource(id,frame), key=Buffer.from(original.rgba).toString('base64');
      if(seen.has(key))continue;
      seen.add(key);verifyCoverage(original);verified++;
    }
  }
  assert.ok(verified>300);
});
test('holes, diagonal contacts, one-pixel rivers and original gray layers survive tracing',()=>{
  const width=12,height=12,rgba=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const border=x===1||x===10||y===1||y===10;
    rgba[(y*width+x)*4+3]=border?128:(x===y||x===11-y?255:0);
  }
  verifyCoverage({rgba,width,height});
});
test('picture text overlays require exact original menu signatures and reject changed scenes',()=>{
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('./assets/menu-fingerprints.js'),'utf8'),context);
  for(const [id,name] of [[44,'main'],[45,'period']]){
    const r=resource(id,0,160);
    assert.equal(identify(r.rgba,r.width,r.height,context.window.BayeMenuFingerprints).name,name);
    r.rgba[3]=255-r.rgba[3];
    assert.equal(identify(r.rgba,r.width,r.height,context.window.BayeMenuFingerprints),null);
  }
  const r=resource(75);
  assert.equal(identify(r.rgba,r.width,r.height,context.window.BayeMenuFingerprints),null);
});
